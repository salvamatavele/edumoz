import assert from "node:assert/strict";
import { withMigrationRehearsal, rehearsalFailed } from "./migration-rehearsal";

withMigrationRehearsal("assignments", async ({ sql, before, apply }) => {
  const migration = "20261031010000_membership_permission_roles";
  before(migration);
  sql("INSERT INTO School(id,code,name,province,district,updatedAt) VALUES('a','MULTI-A','Synthetic A','Maputo','KaMpfumu',NOW()),('b','MULTI-B','Synthetic B','Maputo','KaMpfumu',NOW()); INSERT INTO User(id,name,updatedAt) VALUES('root','Synthetic root',NOW()),('restricted','Synthetic restricted',NOW()),('retired','Synthetic retired',NOW()),('teacher','Synthetic teacher',NOW()),('family','Synthetic family',NOW()); INSERT INTO PermissionRole(id,schoolId,name,updatedAt) VALUES('r','a','Synthetic old restriction',NOW()),('foreign','b','Synthetic foreign role',NOW()); INSERT INTO Permission(id,resource,action) VALUES('synthetic-view','students','view') ON DUPLICATE KEY UPDATE resource=VALUES(resource); INSERT INTO RolePermission(roleId,permissionId) SELECT 'r',id FROM Permission WHERE resource='students' AND action='view'; INSERT INTO Membership(id,userId,schoolId,role,permissionRoleId,status,updatedAt) VALUES('m-root','root','a','SCHOOL_MANAGER',NULL,'ACTIVE',NOW()),('m-restricted','restricted','a','SCHOOL_MANAGER','r','ACTIVE',NOW()),('m-retired','retired','a','SCHOOL_MANAGER','r','REMOVED',NOW()),('m-teacher','teacher','a','TEACHER','r','ACTIVE',NOW()),('m-family','family','a','GUARDIAN',NULL,'ACTIVE',NOW());");
  const historyQuery = "SELECT id,userId,schoolId,role,IFNULL(permissionRoleId,'NULL'),status,createdAt,updatedAt FROM Membership ORDER BY id;";
  const history = sql(historyQuery);
  const previousGrants = sql("SELECT m.id,IF(m.role='SCHOOL_MANAGER',IF(m.permissionRoleId IS NULL,'LEGACY_FULL',COALESCE(GROUP_CONCAT(CONCAT(p.resource,'/',p.action) ORDER BY p.resource,p.action),'NONE')),'BASE_ONLY') FROM Membership m LEFT JOIN RolePermission rp ON rp.roleId=m.permissionRoleId LEFT JOIN Permission p ON p.id=rp.permissionId GROUP BY m.id ORDER BY m.id;");
  apply(migration);
  assert.equal(sql(historyQuery), history);
  assert.equal(sql("SELECT COUNT(*) FROM MembershipPermissionRole;").trim(), "2");
  assert.equal(sql("SELECT permissionsConfigured FROM Membership WHERE id='m-restricted';").trim(), "1");
  assert.equal(sql("SELECT permissionsConfigured FROM Membership WHERE id='m-teacher';").trim(), "0");
  const migratedGrants = sql("SELECT m.id,IF(m.role='SCHOOL_MANAGER',IF(m.permissionsConfigured=false AND m.permissionRoleId IS NULL,'LEGACY_FULL',COALESCE(GROUP_CONCAT(CONCAT(p.resource,'/',p.action) ORDER BY p.resource,p.action),'NONE')),'BASE_ONLY') FROM Membership m LEFT JOIN MembershipPermissionRole a ON a.membershipId=m.id LEFT JOIN RolePermission rp ON rp.roleId=a.permissionRoleId LEFT JOIN Permission p ON p.id=rp.permissionId GROUP BY m.id ORDER BY m.id;");
  assert.equal(migratedGrants, previousGrants);
  // Repeating the backfill cannot duplicate profiles or change membership history.
  sql("INSERT IGNORE INTO MembershipPermissionRole(membershipId,permissionRoleId,createdAt) SELECT id,permissionRoleId,createdAt FROM Membership WHERE role='SCHOOL_MANAGER' AND permissionRoleId IS NOT NULL;");
  assert.equal(sql("SELECT COUNT(*) FROM MembershipPermissionRole;").trim(), "2");
  assert.equal(sql(historyQuery), history);
  function blocked(statement: string) { let refused = false; try { sql(statement); } catch { refused = true; } assert(refused); }
  blocked("INSERT INTO MembershipPermissionRole(membershipId,permissionRoleId) VALUES('m-root','r');");
  blocked("INSERT INTO MembershipPermissionRole(membershipId,permissionRoleId) VALUES('m-restricted','foreign');");
  blocked("UPDATE MembershipPermissionRole SET permissionRoleId='foreign' WHERE membershipId='m-restricted';");
  blocked("UPDATE Membership SET permissionsConfigured=false WHERE id='m-restricted';");
  // The new FK protects a profile even after the legacy bridge is cleared.
  sql("UPDATE Membership SET permissionRoleId=NULL WHERE id='m-restricted'; UPDATE Membership SET permissionRoleId=NULL WHERE id='m-retired'; UPDATE Membership SET permissionRoleId=NULL WHERE id='m-teacher';");
  blocked("DELETE FROM PermissionRole WHERE id='r';");
  sql("DELETE FROM MembershipPermissionRole WHERE membershipId='m-restricted';");
  assert.equal(sql("SELECT CONCAT(permissionsConfigured,':',IFNULL(permissionRoleId,'NULL')) FROM Membership WHERE id='m-restricted';").trim(), "1:NULL");
  assert.equal(sql("SELECT status FROM Membership WHERE id='m-retired';").trim(), "REMOVED");
}).then(() => console.log("Role assignment migration rehearsal passed: legacy access unchanged, retired history retained, cross-school/configuration guards enforced.")).catch(error => rehearsalFailed("Role assignment migration rehearsal failed.", error));
