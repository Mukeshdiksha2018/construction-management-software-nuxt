-- Create Charges table (Global - no corporation reference)
CREATE TABLE IF NOT EXISTS public.charges (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    corporation_uuid UUID,
    charge_name VARCHAR(255) NOT NULL,
    charge_type VARCHAR(50) NOT NULL CHECK (charge_type IN ('FREIGHT', 'PACKING', 'CUSTOM_DUTIES', 'OTHER')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_charges_corporation_uuid ON public.charges(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_charges_uuid ON public.charges(uuid);
CREATE INDEX IF NOT EXISTS idx_charges_status ON public.charges(status);
CREATE INDEX IF NOT EXISTS idx_charges_charge_type ON public.charges(charge_type);
CREATE INDEX IF NOT EXISTS idx_charges_created_at ON public.charges(created_at);

-- Create partial unique indexes for global charges (corporation_uuid IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_charges_global_unique_name_type
  ON public.charges ((lower(charge_name)), charge_type)
  WHERE corporation_uuid IS NULL;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_charges_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_charges_updated_at
    BEFORE UPDATE ON public.charges
    FOR EACH ROW
    EXECUTE FUNCTION update_charges_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users (global access)
CREATE POLICY "Allow authenticated users to read charges (global)"
    ON public.charges FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert charges (global)"
    ON public.charges FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update charges (global)"
    ON public.charges FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete charges (global)"
    ON public.charges FOR DELETE TO authenticated USING (true);

-- Add comments for documentation
COMMENT ON TABLE public.charges IS 'Charges master data (global)';
COMMENT ON COLUMN public.charges.id IS 'Primary key';
COMMENT ON COLUMN public.charges.uuid IS 'Unique identifier for external references';
COMMENT ON COLUMN public.charges.corporation_uuid IS 'Reference to the corporation (NULL for global charges)';
COMMENT ON COLUMN public.charges.charge_name IS 'Name of the charge (e.g., "Standard Freight", "Express Shipping")';
COMMENT ON COLUMN public.charges.charge_type IS 'Type of charge: FREIGHT, PACKING, CUSTOM_DUTIES, or OTHER';
COMMENT ON COLUMN public.charges.status IS 'Status of the charge (ACTIVE or INACTIVE)';
COMMENT ON COLUMN public.charges.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN public.charges.updated_at IS 'Timestamp when the record was last updated';
COMMENT ON COLUMN public.charges.created_by IS 'User who created this record';
COMMENT ON COLUMN public.charges.updated_by IS 'User who last updated this record';
