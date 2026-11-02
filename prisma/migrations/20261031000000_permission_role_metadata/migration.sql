ALTER TABLE `PermissionRole`
  ADD COLUMN `key` VARCHAR(100) NULL,
  ADD COLUMN `isSystem` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 1000;
CREATE UNIQUE INDEX `PermissionRole_schoolId_key_key` ON `PermissionRole` (`schoolId`, `key`);
CREATE INDEX `PermissionRole_schoolId_sortOrder_name_id_idx` ON `PermissionRole` (`schoolId`, `sortOrder`, `name`, `id`);
-- A referenced role must never disappear and turn a restricted membership into unrestricted access.
ALTER TABLE `Membership` DROP FOREIGN KEY `Membership_permissionRoleId_fkey`;
ALTER TABLE `Membership` ADD CONSTRAINT `Membership_permissionRoleId_fkey`
 FOREIGN KEY (`permissionRoleId`) REFERENCES `PermissionRole` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER `permission_role_metadata_update` BEFORE UPDATE ON `PermissionRole` FOR EACH ROW
BEGIN
  IF OLD.`key` IS NOT NULL AND NOT (NEW.`key` <=> OLD.`key`) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROLE_METADATA_IMMUTABLE_KEY';
  END IF;
  IF NOT (NEW.`isSystem` <=> OLD.`isSystem`) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROLE_METADATA_IMMUTABLE_SYSTEM_FLAG';
  END IF;
END;
