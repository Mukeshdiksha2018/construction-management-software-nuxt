-- Create PO Instructions table
CREATE TABLE IF NOT EXISTS public.po_instructions (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    corporation_uuid UUID NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    po_instruction_name VARCHAR(255) NOT NULL,
    instruction TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id),
    updated_by UUID REFERENCES public.user_profiles(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_po_instructions_corporation_uuid ON public.po_instructions(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_po_instructions_uuid ON public.po_instructions(uuid);
CREATE INDEX IF NOT EXISTS idx_po_instructions_status ON public.po_instructions(status);
CREATE INDEX IF NOT EXISTS idx_po_instructions_created_at ON public.po_instructions(created_at);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS po_instructions_updated_at ON public.po_instructions;
CREATE TRIGGER po_instructions_updated_at
  BEFORE UPDATE ON public.po_instructions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.po_instructions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read PO instructions"
  ON public.po_instructions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert PO instructions"
  ON public.po_instructions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update PO instructions"
  ON public.po_instructions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete PO instructions"
  ON public.po_instructions
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comments to the table
COMMENT ON TABLE public.po_instructions IS 'Stores purchase order instructions for each corporation';
COMMENT ON COLUMN public.po_instructions.uuid IS 'Unique identifier for the PO instruction';
COMMENT ON COLUMN public.po_instructions.corporation_uuid IS 'Reference to the corporation (property) this instruction belongs to';
COMMENT ON COLUMN public.po_instructions.po_instruction_name IS 'Name of the PO instruction';
COMMENT ON COLUMN public.po_instructions.instruction IS 'Detailed instruction text';
COMMENT ON COLUMN public.po_instructions.status IS 'Current status of the PO instruction (Active/Inactive)';
