import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { withMigrationRehearsal, rehearsalFailed } from "./migration-rehearsal";
import { financialKey, invoiceGenerationKey } from "../src/features/finance/data/financial-keys";
withMigrationRehearsal("financial", async ({ sql, apply, before }) => {
  const migration = "20261028020000_financial_intents";
  before(migration);
  sql(`INSERT INTO School (id,code,name,province,district,updatedAt) VALUES ('school','HISTORY','Synthetic history','Maputo','KaMpfumu',NOW());
INSERT INTO AcademicYear (id,schoolId,year,label,startDate,endDate,updatedAt) VALUES ('year','school',2026,'2026','2026-01-01','2026-12-31',NOW());
INSERT INTO GradeLevel (id,schoolId,code,name,\`order\`,cycle,updatedAt) VALUES ('level','school','10','10',10,'SECONDARY_FIRST_CYCLE',NOW());
INSERT INTO StudyPath (id,schoolId,academicYearId,gradeLevelId,code,name,updatedAt) VALUES ('path','school','year','level','10','10',NOW());
INSERT INTO ClassGroup (id,schoolId,academicYearId,name,shift,updatedAt) VALUES ('class','school','year','10A','MORNING',NOW());
INSERT INTO Student (id,schoolId,code,firstName,lastName,birthDate,gender,updatedAt) VALUES ('student','school','A','Synthetic','A','2010-01-01','FEMALE',NOW());
INSERT INTO Enrollment (id,schoolId,academicYearId,studentId,studyPathId,classGroupId,number,updatedAt) VALUES ('enrollment','school','year','student','path','class','1',NOW());
INSERT INTO FeeSchedule (id,schoolId,academicYearId,name,updatedAt) VALUES ('schedule','school','year','Synthetic schedule',NOW());
INSERT INTO FeeItem (id,schoolId,feeScheduleId,code,name,amount,recurrence,updatedAt) VALUES ('item','school','schedule','FEE','Fee',100,'MONTHLY',NOW());
INSERT INTO Invoice (id,schoolId,enrollmentId,reference,periodYear,periodMonth,dueDate,subtotal,total,updatedAt) VALUES ('original','school','enrollment','202609-0042',2026,9,'2026-09-10',100,100,NOW()),('duplicate','school','enrollment','202609-0043',2026,9,'2026-09-10',100,100,NOW());
INSERT INTO InvoiceLine (id,invoiceId,feeItemId,description,unitAmount,amount) VALUES ('line','original','item','Fee',100,100),('duplicate-line','duplicate','item','Fee',100,100);`);
  function expectPreflight(reason: string): void {
    let rejected = false;
    try { apply(migration); } catch (error) { rejected = String((error as { stderr?: unknown }).stderr ?? "").includes(`FINANCIAL_INTEGRITY ${reason}`); }
    assert(rejected, `Preflight must reject ${reason}`);
    assert.equal(Number(sql("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Invoice' AND COLUMN_NAME = 'generationKey';").trim()), 0);
    sql("DROP PROCEDURE edumoz_financial_preflight;");
  }
  expectPreflight("duplicate historical generation");
  assert.equal(sql("SELECT SUM(total) FROM Invoice;").trim(), "200.00");
  sql("DELETE FROM Invoice WHERE id = 'duplicate'; UPDATE InvoiceLine SET feeItemId = NULL WHERE id = 'line';");
  expectPreflight("ambiguous historical generation");
  sql("UPDATE InvoiceLine SET feeItemId = 'item' WHERE id = 'line'; INSERT INTO Payment (id,schoolId,invoiceId,amount,method,idempotencyKey,updatedAt) VALUES ('zero','school','original',0,'CASH','zero',NOW());");
  expectPreflight("invalid historical payment amount");
  sql("DELETE FROM Payment WHERE id = 'zero';");
  apply(migration);
  assert.equal(sql("SELECT SHA2(CONCAT(LENGTH('escolá'), ':', 'escolá', LENGTH('x'), ':', 'x'), 256);").trim(), financialKey(["escolá", "x"]));
  assert.equal(sql("SELECT reference FROM Invoice WHERE id = 'original';").trim(), "202609-0042");
  assert.equal(sql("SELECT total FROM Invoice WHERE id = 'original';").trim(), "100.00");
  assert.equal(sql("SELECT invoiceSequence FROM School WHERE id = 'school';").trim(), "42");
  assert.equal(sql("SELECT generationKey FROM Invoice WHERE id = 'original';").trim(), invoiceGenerationKey("school", "schedule", "enrollment", 2026, 9));
  let immutable = false;
  try { sql("UPDATE Invoice SET generationKey = NULL WHERE id = 'original';"); } catch (error) { immutable = /immutable generation key/.test(String((error as { stderr?: unknown }).stderr ?? "")); }
  assert(immutable);
  return { duplicateHistoryRefused: true, ambiguousHistoryRefused: true, invalidPaymentRefused: true, referenceAndValuesPreserved: true, counterInitialized: 42, sqlKeyMatchesApplication: true, immutableGenerationKey: true, disposableDatabaseRemovedOnExit: true };
}).then(report => {
  mkdirSync(".local/evidence", { recursive: true });
  writeFileSync(".local/evidence/financial-migration-report.json", JSON.stringify(report, null, 2));
  console.log('Financial migration rehearsal passed: invalid history refused; values/references preserved; counter and backfill verified.');
}).catch(error => rehearsalFailed("Financial migration rehearsal failed. No development records were modified.", error));
