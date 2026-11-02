-- Reject incompatible history before any schema change. Closed historical grades remain valid.
CREATE PROCEDURE `edumoz_grade_preflight`()
BEGIN
  IF EXISTS (SELECT 1 FROM `Grade` g JOIN `Assessment` a ON a.id = g.assessmentId WHERE g.score < 0 OR g.score > a.maxScore) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'GRADE_INTEGRITY history outside assessment maximum';
  END IF;
  IF EXISTS (SELECT 1 FROM `Assessment` WHERE maxScore <= 0) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'GRADE_INTEGRITY history invalid assessment maximum';
  END IF;
END;
CALL `edumoz_grade_preflight`();
DROP PROCEDURE `edumoz_grade_preflight`;
ALTER TABLE `Term` ADD COLUMN `revision` INTEGER NOT NULL DEFAULT 0;

CREATE TRIGGER `grade_limit_insert` BEFORE INSERT ON `Grade` FOR EACH ROW
BEGIN
  DECLARE periodId VARCHAR(191);
  DECLARE periodStatus VARCHAR(10);
  DECLARE maximum DECIMAL(5,2);
  SELECT termId INTO periodId FROM `Assessment` WHERE id = NEW.assessmentId;
  SELECT status INTO periodStatus FROM `Term` WHERE id = periodId FOR UPDATE;
  IF periodStatus <> 'OPEN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'GRADE_INTEGRITY closed term';
  END IF;
  SELECT maxScore INTO maximum FROM `Assessment` WHERE id = NEW.assessmentId FOR UPDATE;
  IF NEW.score < 0 OR NEW.score > maximum THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'GRADE_INTEGRITY score outside maximum';
  END IF;
END;
CREATE TRIGGER `grade_limit_update` BEFORE UPDATE ON `Grade` FOR EACH ROW
BEGIN
  DECLARE periodId VARCHAR(191);
  DECLARE periodStatus VARCHAR(10);
  DECLARE maximum DECIMAL(5,2);
  SELECT termId INTO periodId FROM `Assessment` WHERE id = NEW.assessmentId;
  SELECT status INTO periodStatus FROM `Term` WHERE id = periodId FOR UPDATE;
  IF periodStatus <> 'OPEN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'GRADE_INTEGRITY closed term';
  END IF;
  SELECT maxScore INTO maximum FROM `Assessment` WHERE id = NEW.assessmentId FOR UPDATE;
  IF NEW.score < 0 OR NEW.score > maximum THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'GRADE_INTEGRITY score outside maximum';
  END IF;
END;
CREATE TRIGGER `grade_limit_delete` BEFORE DELETE ON `Grade` FOR EACH ROW
BEGIN
  DECLARE periodId VARCHAR(191);
  DECLARE periodStatus VARCHAR(10);
  SELECT termId INTO periodId FROM `Assessment` WHERE id = OLD.assessmentId;
  SELECT status INTO periodStatus FROM `Term` WHERE id = periodId FOR UPDATE;
  IF periodStatus <> 'OPEN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'GRADE_INTEGRITY closed term';
  END IF;
END;
CREATE TRIGGER `assessment_open_insert` BEFORE INSERT ON `Assessment` FOR EACH ROW
BEGIN
  DECLARE periodStatus VARCHAR(10);
  SELECT status INTO periodStatus FROM `Term` WHERE id = NEW.termId FOR UPDATE;
  IF periodStatus <> 'OPEN' OR NEW.maxScore <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'GRADE_INTEGRITY assessment requires open term and positive maximum';
  END IF;
END;
CREATE TRIGGER `assessment_open_update` BEFORE UPDATE ON `Assessment` FOR EACH ROW
BEGIN
  DECLARE periodStatus VARCHAR(10);
  SELECT status INTO periodStatus FROM `Term` WHERE id = OLD.termId FOR UPDATE;
  IF periodStatus <> 'OPEN' OR NOT (NEW.termId <=> OLD.termId) OR NEW.maxScore <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'GRADE_INTEGRITY assessment term is closed or immutable';
  END IF;
  IF EXISTS (SELECT 1 FROM `Grade` WHERE assessmentId = OLD.id AND score > NEW.maxScore) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'GRADE_INTEGRITY maximum below recorded score';
  END IF;
END;
CREATE TRIGGER `assessment_open_delete` BEFORE DELETE ON `Assessment` FOR EACH ROW
BEGIN
  DECLARE periodStatus VARCHAR(10);
  SELECT status INTO periodStatus FROM `Term` WHERE id = OLD.termId FOR UPDATE;
  IF periodStatus <> 'OPEN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'GRADE_INTEGRITY closed term';
  END IF;
END;
