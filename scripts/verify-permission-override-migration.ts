import assert from "node:assert/strict";
import { withMigrationRehearsal, rehearsalFailed } from "./migration-rehearsal";
const migration = "20261101000000_membership_permission_overrides";
async function main() {
  await withMigrationRehearsal("overrides", async database => {
    database.before(migration);
    database.sql(`INSERT INTO School(id,code,name,province,district,updatedAt) VALUES ('a','OVERRIDE-A','Synthetic A','Maputo','KaMpfumu',NOW()),('b','OVERRIDE-B','Synthetic B','Maputo','KaMpfumu',NOW());
INSERT INTO User(id,name,updatedAt) VALUES ('u','Synthetic person',NOW());
INSERT INTO Membership(id,userId,schoolId,role,status,updatedAt) VALUES ('ma','u','a','SCHOOL_MANAGER','ACTIVE',NOW()),('mb','u','b','TEACHER','ACTIVE',NOW());
INSERT INTO Permission(id,resource,action) VALUES ('p','students','view');`);
    const snapshot = () => database.sql("SELECT id,userId,schoolId,role,status,permissionsConfigured,COALESCE(permissionRoleId,'NULL'),updatedAt FROM Membership ORDER BY id;");
    const before = snapshot();
    database.apply(migration);
    database.apply("20261101010000_override_tenant_guards");
    assert.equal(snapshot(), before);
    assert.equal(database.sql("SELECT COUNT(*) FROM MembershipPermissionOverride;").trim(), "0");
    database.sql("INSERT INTO MembershipPermissionOverride(id,membershipId,permissionId,allowed,updatedAt) VALUES ('oa','ma','p',false,NOW());");
    assert.throws(() => database.sql("INSERT INTO MembershipPermissionOverride(id,membershipId,permissionId,allowed,updatedAt) VALUES ('duplicate','ma','p',true,NOW());"));
    assert.throws(() => database.sql("INSERT INTO MembershipPermissionOverride(id,membershipId,permissionId,allowed,updatedAt) VALUES ('missing','missing','p',true,NOW());"));
    assert.throws(() => database.sql("UPDATE MembershipPermissionOverride SET membershipId='mb' WHERE id='oa';"));
    assert.throws(() => database.sql("UPDATE MembershipPermissionOverride SET id='moved' WHERE id='oa';"));
    assert.throws(() => database.sql("DELETE FROM Permission WHERE id='p';"));
    database.sql("UPDATE MembershipPermissionOverride SET allowed=true,reason='Synthetic correction' WHERE id='oa';");
    assert.equal(snapshot(), before);
    database.sql("DELETE FROM MembershipPermissionOverride WHERE id='oa';");
    assert.equal(snapshot(), before);
    database.sql("INSERT INTO MembershipPermissionOverride(id,membershipId,permissionId,allowed,updatedAt) VALUES ('ob','mb','p',false,NOW()); DELETE FROM Membership WHERE id='mb';");
    assert.equal(database.sql("SELECT COUNT(*) FROM MembershipPermissionOverride;").trim(), "0");
    console.log(JSON.stringify({ syntheticRecovery: database.restoreRoundTrip(), privateCopiesCreated: false }));
    console.log("Permission override migration passed: no backfill/access changes, uniqueness, immutable school association, foreign keys, explicit inheritance reset and cascade verified on disposable synthetic data.");
  });
}
main().catch(error => rehearsalFailed("Permission override migration rehearsal failed.", error));
