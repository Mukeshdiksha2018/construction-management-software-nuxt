-- Migration 007: Create vendors table
-- This table depends on properties table

CREATE TABLE IF NOT EXISTS public.vendors (
  id BIGSERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  corporation_uuid UUID NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
  vendor_name VARCHAR(255) NOT NULL,
  vendor_type VARCHAR(100) DEFAULT '',
  vendor_address TEXT DEFAULT '',
  vendor_city VARCHAR(100) DEFAULT '',
  vendor_state VARCHAR(50) DEFAULT '',
  vendor_country VARCHAR(100) DEFAULT '',
  vendor_zip VARCHAR(20) DEFAULT '',
  vendor_phone VARCHAR(50) DEFAULT '',
  vendor_email VARCHAR(255) DEFAULT '',
  is_1099 BOOLEAN DEFAULT false,
  vendor_federal_id VARCHAR(50) DEFAULT '',
  vendor_ssn VARCHAR(20) DEFAULT '',
  company_name VARCHAR(255) DEFAULT '',
  check_printed_as VARCHAR(255) DEFAULT '',
  doing_business_as VARCHAR(255) DEFAULT '',
  salutation VARCHAR(20) DEFAULT 'Mr.',
  first_name VARCHAR(100) DEFAULT '',
  middle_name VARCHAR(100) DEFAULT '',
  last_name VARCHAR(100) DEFAULT '',
  opening_balance DECIMAL(15,2) DEFAULT 0.00,
  opening_balance_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vendors_corporation_uuid ON public.vendors(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_vendors_uuid ON public.vendors(uuid);
CREATE INDEX IF NOT EXISTS idx_vendors_vendor_name ON public.vendors(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON public.vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_is_1099 ON public.vendors(is_1099);
CREATE INDEX IF NOT EXISTS idx_vendors_created_at ON public.vendors(created_at);

-- Create unique constraint for corporation_uuid + vendor_name combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_corporation_name_unique ON public.vendors(corporation_uuid, vendor_name) WHERE is_active = true;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vendors_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_vendors_updated_at
    BEFORE UPDATE ON public.vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_vendors_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Users can view vendors for their corporations" ON public.vendors
    FOR SELECT
    TO authenticated
    USING (
        corporation_uuid IN (
            SELECT unnest(corporation_access) 
            FROM public.user_profiles 
            WHERE id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can insert vendors for their corporations" ON public.vendors
    FOR INSERT
    TO authenticated
    WITH CHECK (
        corporation_uuid IN (
            SELECT unnest(corporation_access) 
            FROM public.user_profiles 
            WHERE id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can update vendors for their corporations" ON public.vendors
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

CREATE POLICY "Users can delete vendors for their corporations" ON public.vendors
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
COMMENT ON TABLE public.vendors IS 'Vendor master data for corporations';
COMMENT ON COLUMN public.vendors.id IS 'Primary key';
COMMENT ON COLUMN public.vendors.uuid IS 'Unique identifier for external references';
COMMENT ON COLUMN public.vendors.corporation_uuid IS 'Reference to the corporation this vendor belongs to';
COMMENT ON COLUMN public.vendors.vendor_name IS 'Name of the vendor (required)';
COMMENT ON COLUMN public.vendors.vendor_type IS 'Type of vendor (e.g., Supplier, Contractor, etc.)';
COMMENT ON COLUMN public.vendors.vendor_address IS 'Street address of the vendor';
COMMENT ON COLUMN public.vendors.vendor_city IS 'City of the vendor';
COMMENT ON COLUMN public.vendors.vendor_state IS 'State/Province of the vendor';
COMMENT ON COLUMN public.vendors.vendor_country IS 'Country of the vendor';
COMMENT ON COLUMN public.vendors.vendor_zip IS 'ZIP/Postal code of the vendor';
COMMENT ON COLUMN public.vendors.vendor_phone IS 'Phone number of the vendor';
COMMENT ON COLUMN public.vendors.vendor_email IS 'Email address of the vendor';
COMMENT ON COLUMN public.vendors.is_1099 IS 'Whether vendor is subject to 1099 reporting';
COMMENT ON COLUMN public.vendors.vendor_federal_id IS 'Federal tax ID of the vendor';
COMMENT ON COLUMN public.vendors.vendor_ssn IS 'Social Security Number of the vendor';
COMMENT ON COLUMN public.vendors.company_name IS 'Company name if different from vendor name';
COMMENT ON COLUMN public.vendors.check_printed_as IS 'Name to print on checks';
COMMENT ON COLUMN public.vendors.doing_business_as IS 'DBA name if applicable';
COMMENT ON COLUMN public.vendors.salutation IS 'Salutation (Mr., Mrs., etc.)';
COMMENT ON COLUMN public.vendors.first_name IS 'First name of contact person';
COMMENT ON COLUMN public.vendors.middle_name IS 'Middle name of contact person';
COMMENT ON COLUMN public.vendors.last_name IS 'Last name of contact person';
COMMENT ON COLUMN public.vendors.opening_balance IS 'Opening balance for the vendor';
COMMENT ON COLUMN public.vendors.opening_balance_date IS 'Date of the opening balance';
COMMENT ON COLUMN public.vendors.is_active IS 'Whether the vendor is active';
COMMENT ON COLUMN public.vendors.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN public.vendors.updated_at IS 'Timestamp when the record was last updated';
COMMENT ON COLUMN public.vendors.created_by IS 'User who created this record';
COMMENT ON COLUMN public.vendors.updated_by IS 'User who last updated this record';
