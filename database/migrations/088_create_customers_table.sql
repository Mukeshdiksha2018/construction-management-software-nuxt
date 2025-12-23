-- Migration 088: Create customers table
-- This table depends on properties and projects tables

CREATE TABLE IF NOT EXISTS public.customers (
  id BIGSERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  corporation_uuid UUID NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
  project_uuid UUID REFERENCES public.projects(uuid) ON DELETE SET NULL,
  customer_address TEXT DEFAULT '',
  customer_city VARCHAR(100) DEFAULT '',
  customer_state VARCHAR(50) DEFAULT '',
  customer_country VARCHAR(100) DEFAULT '',
  customer_zip VARCHAR(20) DEFAULT '',
  customer_phone VARCHAR(50) DEFAULT '',
  customer_email VARCHAR(255) DEFAULT '',
  company_name VARCHAR(255) DEFAULT '',
  salutation VARCHAR(20) DEFAULT 'Mr.',
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) DEFAULT '',
  last_name VARCHAR(100) NOT NULL,
  profile_image_url TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_corporation_uuid ON public.customers(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_customers_project_uuid ON public.customers(project_uuid);
CREATE INDEX IF NOT EXISTS idx_customers_uuid ON public.customers(uuid);
-- Index removed: customer_name field removed, using first_name and last_name instead
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON public.customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at);

-- Note: No unique constraint on customer name since we use first_name and last_name instead

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customers_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Users can view customers for their corporations" ON public.customers
    FOR SELECT
    TO authenticated
    USING (
        corporation_uuid IN (
            SELECT unnest(corporation_access) 
            FROM public.user_profiles 
            WHERE id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can insert customers for their corporations" ON public.customers
    FOR INSERT
    TO authenticated
    WITH CHECK (
        corporation_uuid IN (
            SELECT unnest(corporation_access) 
            FROM public.user_profiles 
            WHERE id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can update customers for their corporations" ON public.customers
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

CREATE POLICY "Users can delete customers for their corporations" ON public.customers
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
COMMENT ON TABLE public.customers IS 'Customer master data for corporations and projects';
COMMENT ON COLUMN public.customers.id IS 'Primary key';
COMMENT ON COLUMN public.customers.uuid IS 'Unique identifier for external references';
COMMENT ON COLUMN public.customers.corporation_uuid IS 'Reference to the corporation this customer belongs to';
COMMENT ON COLUMN public.customers.project_uuid IS 'Reference to the project this customer is associated with';
COMMENT ON COLUMN public.customers.customer_address IS 'Street address of the customer';
COMMENT ON COLUMN public.customers.customer_city IS 'City of the customer';
COMMENT ON COLUMN public.customers.customer_state IS 'State/Province of the customer';
COMMENT ON COLUMN public.customers.customer_country IS 'Country of the customer';
COMMENT ON COLUMN public.customers.customer_zip IS 'ZIP/Postal code of the customer';
COMMENT ON COLUMN public.customers.customer_phone IS 'Phone number of the customer';
COMMENT ON COLUMN public.customers.customer_email IS 'Email address of the customer';
COMMENT ON COLUMN public.customers.company_name IS 'Company name if different from customer name';
COMMENT ON COLUMN public.customers.salutation IS 'Salutation (Mr., Mrs., etc.)';
COMMENT ON COLUMN public.customers.first_name IS 'First name of contact person';
COMMENT ON COLUMN public.customers.middle_name IS 'Middle name of contact person';
COMMENT ON COLUMN public.customers.last_name IS 'Last name of contact person';
COMMENT ON COLUMN public.customers.profile_image_url IS 'URL to the customer profile image';
COMMENT ON COLUMN public.customers.is_active IS 'Whether the customer is active';
COMMENT ON COLUMN public.customers.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN public.customers.updated_at IS 'Timestamp when the record was last updated';
COMMENT ON COLUMN public.customers.created_by IS 'User who created this record';
COMMENT ON COLUMN public.customers.updated_by IS 'User who last updated this record';

-- ========================================
-- SUPABASE STORAGE SETUP FOR CUSTOMER PROFILE IMAGES
-- ========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer_images',
  'customer_images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for customer profile images
-- Since the bucket is public, we allow viewing for all authenticated users
-- Upload/update/delete is restricted to authenticated users with corporation access
DROP POLICY IF EXISTS "Users can view customer profile images" ON storage.objects;
CREATE POLICY "Users can view customer profile images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'customer_images'
  );

DROP POLICY IF EXISTS "Users can upload customer profile images" ON storage.objects;
CREATE POLICY "Users can upload customer profile images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'customer_images' AND
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
        AND up.corporation_access IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can update customer profile images" ON storage.objects;
CREATE POLICY "Users can update customer profile images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'customer_images' AND
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
        AND up.corporation_access IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can delete customer profile images" ON storage.objects;
CREATE POLICY "Users can delete customer profile images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'customer_images' AND
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
        AND up.corporation_access IS NOT NULL
    )
  );

