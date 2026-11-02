-- Register capabilities without granting them to any existing restricted role.
-- Preserve existing permission IDs if these entries were already seeded.
INSERT INTO `Permission` (`id`, `resource`, `action`) VALUES
('permission_finance_view', 'finance', 'view'),
('permission_finance_create', 'finance', 'create'),
('permission_finance_edit', 'finance', 'edit'),
('permission_finance_delete', 'finance', 'delete'),
('permission_scheduling_view', 'scheduling', 'view'),
('permission_scheduling_create', 'scheduling', 'create'),
('permission_scheduling_edit', 'scheduling', 'edit'),
('permission_scheduling_delete', 'scheduling', 'delete')
ON DUPLICATE KEY UPDATE `id` = `id`;
