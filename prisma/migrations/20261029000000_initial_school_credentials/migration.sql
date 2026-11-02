ALTER TABLE `User`
 ADD COLUMN `loginCode` VARCHAR(64) NULL,
 ADD COLUMN `passwordChangeRequired` BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN `passwordExpiresAt` DATETIME(3) NULL,
 ADD COLUMN `creationKey` CHAR(64) NULL;
CREATE UNIQUE INDEX `User_loginCode_key` ON `User`(`loginCode`);
CREATE UNIQUE INDEX `User_creationKey_key` ON `User`(`creationKey`);
INSERT INTO `Permission` (`id`, `resource`, `action`) VALUES ('permission_users_create', 'users', 'create')
 ON DUPLICATE KEY UPDATE `id` = `id`;
