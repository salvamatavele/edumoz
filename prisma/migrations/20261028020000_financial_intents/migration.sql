-- Read-only preflight: never merge or renumber historical financial records.
CREATE PROCEDURE `edumoz_financial_preflight`()
BEGIN
  IF EXISTS (
    SELECT i.id FROM `Invoice` i LEFT JOIN `InvoiceLine` l ON l.invoiceId = i.id LEFT JOIN `FeeItem` f ON f.id = l.feeItemId
    WHERE i.periodYear IS NOT NULL GROUP BY i.id
    HAVING COUNT(l.id) = 0 OR COUNT(DISTINCT f.feeScheduleId) <> 1 OR SUM(l.feeItemId IS NULL) > 0
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FINANCIAL_INTEGRITY ambiguous historical generation';
  END IF;
  IF EXISTS (
    SELECT i.schoolId, i.enrollmentId, i.periodYear, COALESCE(i.periodMonth, 0), f.feeScheduleId
    FROM `Invoice` i JOIN `InvoiceLine` l ON l.invoiceId = i.id JOIN `FeeItem` f ON f.id = l.feeItemId
    WHERE i.periodYear IS NOT NULL
    GROUP BY i.schoolId, i.enrollmentId, i.periodYear, COALESCE(i.periodMonth, 0), f.feeScheduleId HAVING COUNT(DISTINCT i.id) > 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FINANCIAL_INTEGRITY duplicate historical generation';
  END IF;
  IF EXISTS (SELECT 1 FROM `Invoice` WHERE reference REGEXP '^[0-9]{4}([0-9]{2})?-[0-9]+$' AND CAST(SUBSTRING_INDEX(reference, '-', -1) AS UNSIGNED) >= 2147483647) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FINANCIAL_INTEGRITY exhausted reference sequence';
  END IF;
  IF EXISTS (SELECT 1 FROM `Payment` WHERE amount <= 0) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FINANCIAL_INTEGRITY invalid historical payment amount';
  END IF;
END;
CALL `edumoz_financial_preflight`();
DROP PROCEDURE `edumoz_financial_preflight`;
ALTER TABLE `School` ADD COLUMN `invoiceSequence` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `Invoice` ADD COLUMN `generationKey` CHAR(64) NULL, ADD COLUMN `revision` INTEGER NOT NULL DEFAULT 0;
UPDATE `School` s SET invoiceSequence = COALESCE((SELECT MAX(CAST(SUBSTRING_INDEX(i.reference, '-', -1) AS UNSIGNED)) FROM `Invoice` i WHERE i.schoolId = s.id AND i.reference REGEXP '^[0-9]{4}([0-9]{2})?-[0-9]+$'), 0);
UPDATE `Invoice` i JOIN (SELECT l.invoiceId, MIN(f.feeScheduleId) AS scheduleId FROM `InvoiceLine` l JOIN `FeeItem` f ON f.id = l.feeItemId GROUP BY l.invoiceId) s ON s.invoiceId = i.id
SET i.generationKey = SHA2(CONCAT(LENGTH(i.schoolId), ':', i.schoolId, LENGTH(s.scheduleId), ':', s.scheduleId, LENGTH(i.enrollmentId), ':', i.enrollmentId, LENGTH(i.periodYear), ':', i.periodYear, LENGTH(COALESCE(i.periodMonth, 0)), ':', COALESCE(i.periodMonth, 0)), 256) WHERE i.periodYear IS NOT NULL;
CREATE UNIQUE INDEX `Invoice_generationKey_key` ON `Invoice`(`generationKey`);
CREATE TRIGGER `invoice_generation_immutable` BEFORE UPDATE ON `Invoice` FOR EACH ROW
BEGIN
  IF NOT (NEW.generationKey <=> OLD.generationKey) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FINANCIAL_INTEGRITY immutable generation key';
  END IF;
END;
CREATE TRIGGER `payment_intent_insert` BEFORE INSERT ON `Payment` FOR EACH ROW
BEGIN
  IF NEW.amount <= 0 OR NOT (NEW.currency <=> (SELECT currency FROM `Invoice` WHERE id = NEW.invoiceId)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FINANCIAL_INTEGRITY invalid amount or currency';
  END IF;
END;
CREATE TRIGGER `payment_intent_update` BEFORE UPDATE ON `Payment` FOR EACH ROW
BEGIN
  IF NOT (NEW.amount <=> OLD.amount) OR NOT (NEW.currency <=> OLD.currency) OR NOT (NEW.method <=> OLD.method)
    OR NOT (NEW.provider <=> OLD.provider) OR NOT (NEW.payerPhone <=> OLD.payerPhone) OR NOT (NEW.idempotencyKey <=> OLD.idempotencyKey) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FINANCIAL_INTEGRITY immutable payment intent';
  END IF;
  IF OLD.status <> NEW.status AND NOT (
    (OLD.status = 'INITIATED' AND NEW.status IN ('PENDING', 'CONFIRMED', 'FAILED')) OR
    (OLD.status = 'PENDING' AND NEW.status IN ('CONFIRMED', 'FAILED')) OR
    (OLD.status = 'CONFIRMED' AND NEW.status = 'REVERSED')
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FINANCIAL_INTEGRITY illegal payment transition';
  END IF;
END;
