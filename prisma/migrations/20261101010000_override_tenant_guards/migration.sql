-- Align the additive exception guards with the generated tenant declaration.
-- Applied migration history is preserved; no application rows are modified.
DROP TRIGGER `tenant_MembershipPermissionOverride_update`;

CREATE TRIGGER `tenant_MembershipPermissionOverride_insert` BEFORE INSERT ON `MembershipPermissionOverride` FOR EACH ROW
BEGIN
  IF NEW.`membershipId` IS NOT NULL AND NOT ((SELECT p2.`schoolId` FROM `Membership` p2 WHERE p2.`id` = NEW.`membershipId`) <=> (SELECT p2.`schoolId` FROM `Membership` p2 WHERE p2.`id` = NEW.`membershipId`)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TENANT_INTEGRITY MembershipPermissionOverride.membership.school';
  END IF;
END;

CREATE TRIGGER `tenant_MembershipPermissionOverride_update` BEFORE UPDATE ON `MembershipPermissionOverride` FOR EACH ROW
BEGIN
  IF NOT (NEW.`id` <=> OLD.`id`) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TENANT_INTEGRITY immutable MembershipPermissionOverride.id';
  END IF;
  IF NOT (NEW.`membershipId` <=> OLD.`membershipId`) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TENANT_INTEGRITY immutable MembershipPermissionOverride.membershipId';
  END IF;
  IF NEW.`membershipId` IS NOT NULL AND NOT ((SELECT p2.`schoolId` FROM `Membership` p2 WHERE p2.`id` = NEW.`membershipId`) <=> (SELECT p2.`schoolId` FROM `Membership` p2 WHERE p2.`id` = NEW.`membershipId`)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TENANT_INTEGRITY MembershipPermissionOverride.membership.school';
  END IF;
END;
