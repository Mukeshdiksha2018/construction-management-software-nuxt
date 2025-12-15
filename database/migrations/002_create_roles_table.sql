-- Migration 002: Create roles table
-- This table has no dependencies

CREATE TABLE IF NOT EXISTS public.roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    permissions JSONB DEFAULT '[]',
    user_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for roles table
CREATE INDEX IF NOT EXISTS idx_roles_role_name ON public.roles(role_name);
CREATE INDEX IF NOT EXISTS idx_roles_status ON public.roles(status);
CREATE INDEX IF NOT EXISTS idx_roles_permissions ON public.roles USING GIN (permissions);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read roles" ON public.roles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert roles" ON public.roles
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update roles" ON public.roles
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete roles" ON public.roles
    FOR DELETE
    TO authenticated
    USING (true);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_roles_updated_at ON public.roles;
CREATE TRIGGER update_roles_updated_at 
    BEFORE UPDATE ON public.roles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Seed: default Super Admin role (idempotent)
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
