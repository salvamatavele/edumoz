-- Additive only: no permissions, assignments or account states are changed.
CREATE TABLE `MembershipPermissionOverride` (
  `id` VARCHAR(191) NOT NULL,
  `membershipId` VARCHAR(191) NOT NULL,
  `permissionId` VARCHAR(191) NOT NULL,
  `allowed` BOOLEAN NOT NULL,
  `reason` VARCHAR(300) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `MembershipPermissionOverride_membershipId_permissionId_key` (`membershipId`,`permissionId`),
  INDEX `MembershipPermissionOverride_permissionId_idx` (`permissionId`),
  CONSTRAINT `MembershipPermissionOverride_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `Membership` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `MembershipPermissionOverride_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TRIGGER `tenant_MembershipPermissionOverride_update` BEFORE UPDATE ON `MembershipPermissionOverride` FOR EACH ROW
BEGIN
  IF NOT (NEW.`id` <=> OLD.`id`) OR NOT (NEW.`membershipId` <=> OLD.`membershipId`) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TENANT_INTEGRITY immutable MembershipPermissionOverride association';
  END IF;
END;
