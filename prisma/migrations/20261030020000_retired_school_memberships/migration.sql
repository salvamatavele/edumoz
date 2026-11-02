-- Append a historical state without deleting memberships or changing existing values.
ALTER TABLE `Membership` MODIFY `status` ENUM('ACTIVE', 'SUSPENDED', 'REMOVED') NOT NULL DEFAULT 'ACTIVE';
