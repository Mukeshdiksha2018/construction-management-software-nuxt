-- Create Sales Tax table (Global - no corporation reference)
CREATE TABLE IF NOT EXISTS public.sales_tax (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    corporation_uuid UUID,
    tax_name VARCHAR(255) NOT NULL,
    tax_percentage DECIMAL(10, 4) NOT NULL DEFAULT 0 CHECK (tax_percentage >= 0 AND tax_percentage <= 100),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_tax_corporation_uuid ON public.sales_tax(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_sales_tax_uuid ON public.sales_tax(uuid);
CREATE INDEX IF NOT EXISTS idx_sales_tax_status ON public.sales_tax(status);
CREATE INDEX IF NOT EXISTS idx_sales_tax_created_at ON public.sales_tax(created_at);

-- Create partial unique indexes for global sales tax (corporation_uuid IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_tax_global_unique_name
  ON public.sales_tax ((lower(tax_name)))
  WHERE corporation_uuid IS NULL;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sales_tax_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_sales_tax_updated_at
    BEFORE UPDATE ON public.sales_tax
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_tax_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.sales_tax ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users (global access)
CREATE POLICY "Allow authenticated users to read sales_tax (global)"
    ON public.sales_tax FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert sales_tax (global)"
    ON public.sales_tax FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update sales_tax (global)"
    ON public.sales_tax FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete sales_tax (global)"
    ON public.sales_tax FOR DELETE TO authenticated USING (true);

-- Add comments for documentation
COMMENT ON TABLE public.sales_tax IS 'Sales Tax master data (global)';
COMMENT ON COLUMN public.sales_tax.id IS 'Primary key';
COMMENT ON COLUMN public.sales_tax.uuid IS 'Unique identifier for external references';
COMMENT ON COLUMN public.sales_tax.corporation_uuid IS 'Reference to the corporation (NULL for global taxes)';
COMMENT ON COLUMN public.sales_tax.tax_name IS 'Name of the sales tax (e.g., "State Tax", "Federal Tax")';
COMMENT ON COLUMN public.sales_tax.tax_percentage IS 'Tax percentage (0-100)';
COMMENT ON COLUMN public.sales_tax.status IS 'Status of the sales tax (ACTIVE or INACTIVE)';
COMMENT ON COLUMN public.sales_tax.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN public.sales_tax.updated_at IS 'Timestamp when the record was last updated';
COMMENT ON COLUMN public.sales_tax.created_by IS 'User who created this record';
COMMENT ON COLUMN public.sales_tax.updated_by IS 'User who last updated this record';

