-- Create UOM (Unit of Measure) table
CREATE TABLE IF NOT EXISTS public.uom (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    corporation_uuid UUID NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    uom_name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_uom_corporation_uuid ON public.uom(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_uom_uuid ON public.uom(uuid);
CREATE INDEX IF NOT EXISTS idx_uom_status ON public.uom(status);
CREATE INDEX IF NOT EXISTS idx_uom_created_at ON public.uom(created_at);

-- Create unique constraint for corporation_uuid + uom_name combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_uom_corporation_name_unique ON public.uom(corporation_uuid, uom_name);

-- Create unique constraint for corporation_uuid + short_name combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_uom_corporation_short_name_unique ON public.uom(corporation_uuid, short_name);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_uom_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_uom_updated_at
    BEFORE UPDATE ON public.uom
    FOR EACH ROW
    EXECUTE FUNCTION update_uom_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.uom ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Users can view UOM for their corporations" ON public.uom
    FOR SELECT
    TO authenticated
    USING (
        corporation_uuid IN (
            SELECT unnest(corporation_access) 
            FROM public.user_profiles 
            WHERE id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can insert UOM for their corporations" ON public.uom
    FOR INSERT
    TO authenticated
    WITH CHECK (
        corporation_uuid IN (
            SELECT unnest(corporation_access) 
            FROM public.user_profiles 
            WHERE id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can update UOM for their corporations" ON public.uom
    FOR UPDATE
    TO authenticated
    USING (
        corporation_uuid IN (
            SELECT unnest(corporation_access) 
            FROM public.user_profiles 
            WHERE id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        corporation_uuid IN (
            SELECT unnest(corporation_access) 
            FROM public.user_profiles 
            WHERE id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can delete UOM for their corporations" ON public.uom
    FOR DELETE
    TO authenticated
    USING (
        corporation_uuid IN (
            SELECT unnest(corporation_access) 
            FROM public.user_profiles 
            WHERE id = (SELECT auth.uid())
        )
    );

-- Add comments for documentation
COMMENT ON TABLE public.uom IS 'Unit of Measure master data for corporations';
COMMENT ON COLUMN public.uom.id IS 'Primary key';
COMMENT ON COLUMN public.uom.uuid IS 'Unique identifier for external references';
COMMENT ON COLUMN public.uom.corporation_uuid IS 'Reference to the corporation this UOM belongs to';
COMMENT ON COLUMN public.uom.uom_name IS 'Full name of the unit of measure (e.g., "Kilogram", "Meter")';
COMMENT ON COLUMN public.uom.short_name IS 'Short abbreviation for the unit (e.g., "KG", "M")';
COMMENT ON COLUMN public.uom.status IS 'Status of the UOM (ACTIVE or INACTIVE)';
COMMENT ON COLUMN public.uom.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN public.uom.updated_at IS 'Timestamp when the record was last updated';
COMMENT ON COLUMN public.uom.created_by IS 'User who created this record';
COMMENT ON COLUMN public.uom.updated_by IS 'User who last updated this record';
