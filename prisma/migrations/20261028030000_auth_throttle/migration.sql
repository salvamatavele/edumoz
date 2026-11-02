-- Additive global authentication counters; no account or school data is changed.
CREATE TABLE `AuthThrottle` (
  `key` CHAR(64) NOT NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `expiresAt` DATETIME(3) NOT NULL,
  INDEX `AuthThrottle_expiresAt_idx` (`expiresAt`),
  PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
