CREATE TABLE `AuthSession` (
  `id` CHAR(64) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `authVersion` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt` DATETIME(3) NOT NULL,
  `revokedAt` DATETIME(3) NULL,
  INDEX `AuthSession_userId_createdAt_idx` (`userId`, `createdAt`),
  INDEX `AuthSession_expiresAt_idx` (`expiresAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `AuthSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
