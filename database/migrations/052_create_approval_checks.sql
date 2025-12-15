-- Create Approval Checks table (NOT corporation-specific)
CREATE TABLE IF NOT EXISTS public.approval_checks (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    approval_check VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_approval_checks_uuid ON public.approval_checks(uuid);
CREATE INDEX IF NOT EXISTS idx_approval_checks_active ON public.approval_checks(active);
CREATE INDEX IF NOT EXISTS idx_approval_checks_created_at ON public.approval_checks(created_at);
CREATE INDEX IF NOT EXISTS idx_approval_checks_approval_check ON public.approval_checks(approval_check);

-- Create unique constraint for approval_check to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_checks_approval_check_unique ON public.approval_checks(approval_check);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS approval_checks_updated_at ON public.approval_checks;
CREATE TRIGGER approval_checks_updated_at
  BEFORE UPDATE ON public.approval_checks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.approval_checks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (accessible to all authenticated users since it's not corporation-specific)
CREATE POLICY "Allow authenticated users to read approval_checks"
  ON public.approval_checks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert approval_checks"
  ON public.approval_checks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update approval_checks"
  ON public.approval_checks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete approval_checks"
  ON public.approval_checks
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comments to the table
COMMENT ON TABLE public.approval_checks IS 'Stores approval check names (NOT corporation-specific)';
COMMENT ON COLUMN public.approval_checks.uuid IS 'Unique identifier for the approval check record';
COMMENT ON COLUMN public.approval_checks.approval_check IS 'Approval check name';
COMMENT ON COLUMN public.approval_checks.description IS 'Description of the approval check';
COMMENT ON COLUMN public.approval_checks.active IS 'Whether this approval check is active';
COMMENT ON COLUMN public.approval_checks.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN public.approval_checks.updated_at IS 'Timestamp when the record was last updated';
COMMENT ON COLUMN public.approval_checks.created_by IS 'User who created this record';
COMMENT ON COLUMN public.approval_checks.updated_by IS 'User who last updated this record';

