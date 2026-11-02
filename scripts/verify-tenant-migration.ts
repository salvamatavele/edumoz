import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { withMigrationRehearsal, rehearsalFailed } from "./migration-rehearsal";
withMigrationRehearsal("tenant", async ({ sql, apply, before }) => {
  const migration = "20261028000000_enforce_tenant_integrity";
  before(migration);
  // Explicit legacy columns keep the rehearsal independent of the newest ORM client.
  sql(`INSERT INTO School (id,code,name,province,district,updatedAt) VALUES ('a','A','Synthetic A','Maputo','KaMpfumu',NOW()),('b','B','Synthetic B','Maputo','KaMpfumu',NOW());
INSERT INTO AcademicYear (id,schoolId,year,label,startDate,endDate,updatedAt) VALUES ('year','a',2026,'2026','2026-01-01','2026-12-31',NOW());
INSERT INTO GradeLevel (id,schoolId,code,name,\`order\`,cycle,updatedAt) VALUES ('level','a','10','10',10,'SECONDARY_FIRST_CYCLE',NOW());
INSERT INTO StudyPath (id,schoolId,academicYearId,gradeLevelId,code,name,updatedAt) VALUES ('path','a','year','level','10','10',NOW());
INSERT INTO ClassGroup (id,schoolId,academicYearId,name,shift,updatedAt) VALUES ('class','a','year','10A','MORNING',NOW());
INSERT INTO Student (id,schoolId,code,firstName,lastName,birthDate,gender,updatedAt) VALUES ('student','b','B','Synthetic','B','2010-01-01','FEMALE',NOW());
INSERT INTO Enrollment (id,schoolId,academicYearId,studentId,studyPathId,classGroupId,number,updatedAt) VALUES ('bad','a','year','student','path','class','bad-history',NOW());`);
  let rejectedHistory = false;
  try { apply(migration); } catch (error) { rejectedHistory = /TENANT_INTEGRITY history Enrollment.student.school/.test(String((error as { stderr?: unknown }).stderr ?? "")); }
  assert(rejectedHistory, "Incompatible history must be rejected");
  assert.equal(Number(sql("SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE();").trim()), 0);
  assert.equal(Number(sql("SELECT COUNT(*) FROM Enrollment WHERE id = 'bad';").trim()), 1);
  sql("DELETE FROM Enrollment WHERE id = 'bad'; DROP PROCEDURE edumoz_integrity_preflight;");
  apply(migration);
  const guards = Number(sql("SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE();").trim());
  const expected = [...readFileSync(`prisma/migrations/${migration}/migration.sql`, "utf8").matchAll(/CREATE TRIGGER/g)].length;
  assert.equal(guards, expected);
  let blocked = false;
  try { sql("INSERT INTO Enrollment (id,schoolId,academicYearId,studentId,studyPathId,classGroupId,number,updatedAt) VALUES ('blocked','a','year','student','path','class','blocked',NOW());"); } catch (error) { blocked = /TENANT_INTEGRITY/.test(String((error as { stderr?: unknown }).stderr ?? "")); }
  assert(blocked);
  sql("INSERT INTO Student (id,schoolId,code,firstName,lastName,birthDate,gender,updatedAt) VALUES ('valid','a','A','Synthetic','A','2010-01-01','FEMALE',NOW()); INSERT INTO Enrollment (id,schoolId,academicYearId,studentId,studyPathId,classGroupId,number,updatedAt) VALUES ('valid','a','year','valid','path','class','valid',NOW());");
  return { rejectedHistory, historyUnchanged: true, validHistoryPreserved: true, guards, validInsert: true, foreignInsertRejected: blocked, disposableDatabaseRemovedOnExit: true };
}).then(report => {
  mkdirSync(".local/evidence", { recursive: true });
  writeFileSync(".local/evidence/tenant-migration-report.json", JSON.stringify(report, null, 2));
  console.log('Tenant migration rehearsal passed: invalid history refused; persistent guards and valid/foreign writes verified.');
}).catch(error => rehearsalFailed("Tenant migration rehearsal failed. No development records were modified.", error));
