-- Seed default roles for the property management system
-- This ensures there are basic roles available for new installations

INSERT INTO public.roles (role_name, description, status, permissions, user_count) VALUES
(
  'Super Admin',
  'Full system access with all permissions',
  'active',
  '[
    "users_view", "users_add", "users_edit", "users_delete",
    "roles_view", "roles_create", "roles_edit", "roles_delete",
    "corporations_view", "corporations_create", "corporations_edit", "corporations_delete",
    "payables_view", "payables_add", "payables_edit", "payables_delete",
    "receivables_view", "receivables_add", "receivables_edit", "receivables_delete",
    "reports_view", "reports_export",
    "settings_view", "settings_edit"
  ]'::jsonb,
  0
)
ON CONFLICT (role_name) DO NOTHING;
