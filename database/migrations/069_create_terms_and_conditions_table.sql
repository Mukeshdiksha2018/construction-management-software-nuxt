-- Create terms_and_conditions table
-- This table stores terms and conditions templates that can be used across the system
CREATE TABLE IF NOT EXISTS public.terms_and_conditions (
  id BIGSERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL, -- Rich text content (HTML/Markdown)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (name)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_terms_and_conditions_uuid ON public.terms_and_conditions(uuid);
CREATE INDEX IF NOT EXISTS idx_terms_and_conditions_is_active ON public.terms_and_conditions(is_active);
CREATE INDEX IF NOT EXISTS idx_terms_and_conditions_name ON public.terms_and_conditions(name);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.terms_and_conditions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (simple approach - authenticated users can do all operations)
CREATE POLICY "Allow authenticated users to read terms and conditions"
  ON public.terms_and_conditions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert terms and conditions"
  ON public.terms_and_conditions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update terms and conditions"
  ON public.terms_and_conditions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete terms and conditions"
  ON public.terms_and_conditions
  FOR DELETE
  TO authenticated
  USING (true);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS terms_and_conditions_updated_at ON public.terms_and_conditions;
CREATE TRIGGER terms_and_conditions_updated_at
  BEFORE UPDATE ON public.terms_and_conditions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to document the table
COMMENT ON TABLE public.terms_and_conditions IS 'Global terms and conditions table - shared across all corporations';

