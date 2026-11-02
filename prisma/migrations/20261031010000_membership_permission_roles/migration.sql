-- Reject inconsistent legacy history before changing the schema.
CREATE PROCEDURE `edumoz_role_assignment_preflight`()
BEGIN
  IF EXISTS (SELECT 1 FROM `Membership` m JOIN `PermissionRole` r ON r.id=m.permissionRoleId WHERE m.role='SCHOOL_MANAGER' AND r.schoolId<>m.schoolId) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROLE_ASSIGNMENT inconsistent legacy scope';
  END IF;
END;
CALL `edumoz_role_assignment_preflight`();
DROP PROCEDURE `edumoz_role_assignment_preflight`;

ALTER TABLE `Membership` ADD COLUMN `permissionsConfigured` BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE `MembershipPermissionRole` (
  `membershipId` VARCHAR(191) NOT NULL,
  `permissionRoleId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`membershipId`, `permissionRoleId`),
  INDEX `MembershipPermissionRole_permissionRoleId_idx` (`permissionRoleId`),
  CONSTRAINT `MembershipPermissionRole_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `Membership` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `MembershipPermissionRole_permissionRoleId_fkey` FOREIGN KEY (`permissionRoleId`) REFERENCES `PermissionRole` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Preserve every consumed legacy restriction, including retired associations.
-- Other base roles previously ignored the legacy bridge and must not gain access.
UPDATE `Membership` SET `permissionsConfigured`=true, `updatedAt`=`updatedAt`
 WHERE `role`='SCHOOL_MANAGER' AND `permissionRoleId` IS NOT NULL;
INSERT IGNORE INTO `MembershipPermissionRole` (`membershipId`,`permissionRoleId`,`createdAt`)
 SELECT `id`,`permissionRoleId`,`createdAt` FROM `Membership`
 WHERE `role`='SCHOOL_MANAGER' AND `permissionRoleId` IS NOT NULL;

CREATE TRIGGER `membership_permission_configuration_update` BEFORE UPDATE ON `Membership` FOR EACH ROW
BEGIN
  IF NEW.`permissionsConfigured`=false AND EXISTS (SELECT 1 FROM `MembershipPermissionRole` a WHERE a.membershipId=OLD.id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROLE_ASSIGNMENT configuration still has profiles';
  END IF;
END;
CREATE TRIGGER `membership_permission_configuration_insert` BEFORE INSERT ON `MembershipPermissionRole` FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM `Membership` m WHERE m.id=NEW.membershipId AND m.permissionsConfigured=true) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROLE_ASSIGNMENT explicit configuration required';
  END IF;
END;
CREATE TRIGGER `membership_permission_configuration_link_update` BEFORE UPDATE ON `MembershipPermissionRole` FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM `Membership` m WHERE m.id=NEW.membershipId AND m.permissionsConfigured=true) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROLE_ASSIGNMENT explicit configuration required';
  END IF;
END;

CREATE TRIGGER `tenant_MembershipPermissionRole_insert` BEFORE INSERT ON `MembershipPermissionRole` FOR EACH ROW
BEGIN
  IF NEW.`membershipId` IS NOT NULL AND NOT ((SELECT p2.`schoolId` FROM `Membership` p2 WHERE p2.`id` = NEW.`membershipId`) <=> (SELECT p2.`schoolId` FROM `Membership` p2 WHERE p2.`id` = NEW.`membershipId`)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TENANT_INTEGRITY MembershipPermissionRole.membership.school';
  END IF;
  IF NEW.`permissionRoleId` IS NOT NULL AND NOT ((SELECT p2.`schoolId` FROM `PermissionRole` p2 WHERE p2.`id` = NEW.`permissionRoleId`) <=> (SELECT p2.`schoolId` FROM `Membership` p2 WHERE p2.`id` = NEW.`membershipId`)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TENANT_INTEGRITY MembershipPermissionRole.permissionRole.school';
  END IF;
END;

CREATE TRIGGER `tenant_MembershipPermissionRole_update` BEFORE UPDATE ON `MembershipPermissionRole` FOR EACH ROW
BEGIN
  IF NOT (NEW.`membershipId` <=> OLD.`membershipId`) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TENANT_INTEGRITY immutable MembershipPermissionRole.membershipId';
  END IF;
  IF NEW.`membershipId` IS NOT NULL AND NOT ((SELECT p2.`schoolId` FROM `Membership` p2 WHERE p2.`id` = NEW.`membershipId`) <=> (SELECT p2.`schoolId` FROM `Membership` p2 WHERE p2.`id` = NEW.`membershipId`)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TENANT_INTEGRITY MembershipPermissionRole.membership.school';
  END IF;
  IF NEW.`permissionRoleId` IS NOT NULL AND NOT ((SELECT p2.`schoolId` FROM `PermissionRole` p2 WHERE p2.`id` = NEW.`permissionRoleId`) <=> (SELECT p2.`schoolId` FROM `Membership` p2 WHERE p2.`id` = NEW.`membershipId`)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TENANT_INTEGRITY MembershipPermissionRole.permissionRole.school';
  END IF;
END;
