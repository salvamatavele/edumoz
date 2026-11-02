-- Register only the implemented school user read and state-change capabilities.
-- Existing restricted roles receive no new grants. Preserve previously seeded IDs.
INSERT INTO `Permission` (`id`, `resource`, `action`) VALUES
('permission_users_view', 'users', 'view'),
('permission_users_edit', 'users', 'edit')
ON DUPLICATE KEY UPDATE `id` = `id`;
