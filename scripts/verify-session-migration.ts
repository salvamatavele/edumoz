import assert from "node:assert/strict";
import { withMigrationRehearsal, rehearsalFailed } from "./migration-rehearsal";
withMigrationRehearsal("session", async ({ sql, before, apply }) => {
  const migration = "20261030010000_auth_session_registry";
  before(migration);
  sql("INSERT INTO User(id,name,updatedAt) VALUES('session-user','Synthetic session owner',NOW());");
  apply(migration);
  assert.equal(sql("SELECT name FROM User WHERE id='session-user';").trim(), "Synthetic session owner");
  sql("INSERT INTO AuthSession(id,userId,authVersion,expiresAt) VALUES(REPEAT('a',64),'session-user',0,DATE_ADD(NOW(), INTERVAL 8 HOUR));");
  assert.equal(sql("SELECT COUNT(*) FROM AuthSession;").trim(), "1");
  let refused = false;
  try { sql("INSERT INTO AuthSession(id,userId,authVersion,expiresAt) VALUES(REPEAT('b',64),'missing',0,NOW());"); } catch { refused = true; }
  assert(refused);
  sql("DELETE FROM User WHERE id='session-user';");
  assert.equal(sql("SELECT COUNT(*) FROM AuthSession;").trim(), "0");
}).then(() => console.log("Session migration rehearsal passed.")).catch(error => rehearsalFailed("Session rehearsal failed.", error));
