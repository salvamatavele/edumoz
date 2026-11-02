import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {withMigrationRehearsal,rehearsalFailed} from './migration-rehearsal';
withMigrationRehearsal('staff',async({sql,apply,before})=>{
 const migration='20261030000000_school_staff';before(migration);
 sql("INSERT INTO School(id,code,name,province,district,updatedAt) VALUES('a','STAFF-A','Synthetic A','Maputo','KaMpfumu',NOW()),('b','STAFF-B','Synthetic B','Maputo','KaMpfumu',NOW()); INSERT INTO User(id,name,updatedAt) VALUES('ua','Synthetic A',NOW()),('ub','Synthetic B',NOW()); INSERT INTO Membership(id,userId,schoolId,role,updatedAt) VALUES('ma','ua','a','SCHOOL_MANAGER',NOW()),('mb','ub','b','TEACHER',NOW());");
 const grants=sql('SELECT COUNT(*) FROM RolePermission;');apply(migration);assert.equal(sql('SELECT COUNT(*) FROM RolePermission;'),grants);
 sql("INSERT INTO Staff(id,schoolId,userId,code,name,jobTitle,updatedAt) VALUES('sa','a','ua','P001','Synthetic A','Secretary',NOW()),('sb','b','ub','P001','Synthetic B','Secretary',NOW());");
 for(const query of ["UPDATE Staff SET schoolId='b' WHERE id='sa';","UPDATE Staff SET userId='ub' WHERE id='sa';","INSERT INTO Staff(id,schoolId,userId,code,name,jobTitle,updatedAt) VALUES('bad','a','ub','P002','Invalid','Invalid',NOW());"]){let blocked=false;try{sql(query);}catch{blocked=true;}assert(blocked);}
 assert.equal(sql("SELECT userId FROM Staff WHERE id='sa';").trim(),'ua');assert.equal(sql('SELECT COUNT(*) FROM Staff;').trim(),'2');
 const report={historyPreserved:true,newPermissionsNotGranted:true,duplicateCodesAcrossSchools:true,foreignMembershipRefused:true,scopeMutationRefused:true,staffRows:2};writeFileSync('.local/evidence/staff-migration.json',JSON.stringify(report,null,2));
}).then(()=>console.log('Staff migration rehearsal passed.')).catch(e=>rehearsalFailed('Staff migration rehearsal failed; no development records changed.',e));
