-- Create project_types table
CREATE TABLE IF NOT EXISTS public.project_types (
  id BIGSERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  corporation_uuid UUID NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (corporation_uuid, name)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_project_types_corporation_uuid ON public.project_types(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_project_types_uuid ON public.project_types(uuid);
CREATE INDEX IF NOT EXISTS idx_project_types_is_active ON public.project_types(is_active);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.project_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (simple approach - authenticated users can do all operations)
CREATE POLICY "Allow authenticated users to read project types"
  ON public.project_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert project types"
  ON public.project_types
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update project types"
  ON public.project_types
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete project types"
  ON public.project_types
  FOR DELETE
  TO authenticated
  USING (true);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS project_types_updated_at ON public.project_types;
CREATE TRIGGER project_types_updated_at
  BEFORE UPDATE ON public.project_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

