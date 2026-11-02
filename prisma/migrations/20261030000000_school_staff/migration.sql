-- CreateTable
CREATE TABLE `Staff` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `jobTitle` VARCHAR(191) NOT NULL,
    `title` VARCHAR(64) NULL,
    `email` VARCHAR(254) NULL,
    `phone` VARCHAR(40) NULL,
    `birthDate` DATE NULL,
    `gender` ENUM('MALE', 'FEMALE') NULL,
    `documentNumber` VARCHAR(64) NULL,
    `nuit` VARCHAR(32) NULL,
    `address` TEXT NULL,
    `qualification` VARCHAR(191) NULL,
    `contractType` VARCHAR(100) NULL,
    `hireDate` DATE NULL,
    `notes` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Staff_schoolId_isActive_name_idx`(`schoolId`, `isActive`, `name`),
    UNIQUE INDEX `Staff_schoolId_code_key`(`schoolId`, `code`),
    UNIQUE INDEX `Staff_schoolId_userId_key`(`schoolId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;



CREATE TRIGGER `tenant_Staff_insert` BEFORE INSERT ON `Staff` FOR EACH ROW
BEGIN
  IF NEW.`userId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Membership` m WHERE m.`userId` = NEW.`userId` AND m.`schoolId` = NEW.`schoolId`) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TENANT_INTEGRITY Staff.user.school';
  END IF;
END;

CREATE TRIGGER `tenant_Staff_update` BEFORE UPDATE ON `Staff` FOR EACH ROW
BEGIN
  IF NOT (NEW.`id` <=> OLD.`id`) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TENANT_INTEGRITY immutable Staff.id';
  END IF;
  IF NOT (NEW.`schoolId` <=> OLD.`schoolId`) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TENANT_INTEGRITY immutable Staff.schoolId';
  END IF;
  IF NEW.`userId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Membership` m WHERE m.`userId` = NEW.`userId` AND m.`schoolId` = NEW.`schoolId`) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TENANT_INTEGRITY Staff.user.school';
  END IF;
END;

INSERT INTO `Permission` (`id`,`resource`,`action`)
VALUES ('school-staff-view','school-staff','view'),('school-staff-create','school-staff','create'),('school-staff-edit','school-staff','edit')
ON DUPLICATE KEY UPDATE `id`=`id`;
