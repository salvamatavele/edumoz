import assert from "node:assert/strict";
import { withMigrationRehearsal, rehearsalFailed } from "./migration-rehearsal";
withMigrationRehearsal("roles", async ({ sql, before, apply }) => {
  const migration = "20261031000000_permission_role_metadata";
  before(migration);
  sql("INSERT INTO School(id,code,name,province,district,updatedAt) VALUES('a','ROLE-A','Synthetic A','Maputo','KaMpfumu',NOW()),('b','ROLE-B','Synthetic B','Maputo','KaMpfumu',NOW()); INSERT INTO User(id,name,updatedAt) VALUES('u','Synthetic holder',NOW()); INSERT INTO PermissionRole(id,schoolId,name,updatedAt) VALUES('r','a','Synthetic preexisting role',NOW()); INSERT INTO Membership(id,userId,schoolId,role,permissionRoleId,status,updatedAt) VALUES('m','u','a','SCHOOL_MANAGER','r','REMOVED',NOW()); INSERT INTO RolePermission(roleId,permissionId) SELECT 'r',id FROM Permission WHERE resource='users' AND action='view';");
  const grants = sql("SELECT COUNT(*) FROM RolePermission WHERE roleId='r';").trim();
  apply(migration);
  assert.equal(sql("SELECT CONCAT(isSystem,':',sortOrder,':',IFNULL(`key`,'NULL')) FROM PermissionRole WHERE id='r';").trim(), "0:1000:NULL");
  assert.equal(sql("SELECT COUNT(*) FROM RolePermission WHERE roleId='r';").trim(), grants);
  let blocked = false;
  try { sql("DELETE FROM PermissionRole WHERE id='r';"); } catch { blocked = true; }
  assert(blocked);
  assert.equal(sql("SELECT permissionRoleId FROM Membership WHERE id='m';").trim(), "r");
  sql("UPDATE PermissionRole SET `key`='stable-key' WHERE id='r'; INSERT INTO PermissionRole(id,schoolId,name,`key`,updatedAt) VALUES('b-role','b','Synthetic role','stable-key',NOW());");
  let duplicate = false;
  try { sql("INSERT INTO PermissionRole(id,schoolId,name,`key`,updatedAt) VALUES('bad','a','Different name','stable-key',NOW());"); } catch { duplicate = true; }
  assert(duplicate);
  for (const query of ["UPDATE PermissionRole SET `key`='changed' WHERE id='r';", "UPDATE PermissionRole SET isSystem=true WHERE id='r';"]) {
    let immutable = false; try { sql(query); } catch { immutable = true; } assert(immutable);
  }
  assert.equal(sql("SELECT status FROM Membership WHERE id='m';").trim(), "REMOVED");
}).then(() => console.log("Role metadata migration rehearsal passed; grants and restricted historical association preserved.")).catch(error => rehearsalFailed("Role metadata migration rehearsal failed.", error));
