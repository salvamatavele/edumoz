import assert from "node:assert/strict";
import { withMigrationRehearsal, rehearsalFailed } from "./migration-rehearsal";
withMigrationRehearsal("removal", async ({ sql, before, apply }) => {
  const migration = "20261030020000_retired_school_memberships";
  before(migration); console.log("Historical schema applied.");
  sql("INSERT INTO School(id,code,name,province,district,updatedAt) VALUES('a','RETIRE-A','Synthetic A','Maputo','KaMpfumu',NOW()); INSERT INTO User(id,name,updatedAt) VALUES('u','Synthetic holder',NOW()); INSERT INTO Membership(id,userId,schoolId,role,updatedAt) VALUES('m','u','a','TEACHER',NOW()); INSERT INTO Teacher(id,schoolId,userId,code,firstName,lastName,updatedAt) VALUES('t','a','u','T01','Synthetic','Teacher',NOW());");
  console.log("Synthetic history inserted.");
  apply(migration);
  console.log("Removal enum applied.");
  assert.equal(sql("SELECT status FROM Membership WHERE id='m';").trim(), "ACTIVE");
  sql("UPDATE Membership SET status='REMOVED' WHERE id='m';");
  assert.equal(sql("SELECT userId FROM Teacher WHERE id='t';").trim(), "u");
  assert.equal(sql("SELECT COUNT(*) FROM User WHERE id='u';").trim(), "1");
}).then(() => console.log("Removal migration rehearsal passed.")).catch(error => { const code = String(error?.stderr ?? "").match(/ERROR (\d+)/)?.[1]; if (code) console.error(`Rehearsal SQL error code: ${code}`); rehearsalFailed("Removal rehearsal failed.", error); });
