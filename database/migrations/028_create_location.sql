-- Create Location table (global, not corporation-specific)
BEGIN;

CREATE TABLE IF NOT EXISTS public.location (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    location_code VARCHAR(64),
    description TEXT,
    -- Address fields, modeled similar to vendor form address structure
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city VARCHAR(128) NOT NULL,
    state VARCHAR(128) NOT NULL,
    zip VARCHAR(32) NOT NULL,
    country VARCHAR(128) NOT NULL,
    phone VARCHAR(64),
    email VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_location_uuid ON public.location(uuid);
CREATE INDEX IF NOT EXISTS idx_location_active ON public.location(active);
CREATE INDEX IF NOT EXISTS idx_location_created_at ON public.location(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_location_name_unique ON public.location(LOWER(location_name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_location_code_unique ON public.location(LOWER(location_code)) WHERE location_code IS NOT NULL;

-- Trigger to update updated_at on change
DROP TRIGGER IF EXISTS location_updated_at ON public.location;
CREATE TRIGGER location_updated_at
  BEFORE UPDATE ON public.location
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS and add simple policies for authenticated users
ALTER TABLE public.location ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated users to read location" ON public.location;
  DROP POLICY IF EXISTS "Allow authenticated users to insert location" ON public.location;
  DROP POLICY IF EXISTS "Allow authenticated users to update location" ON public.location;
  DROP POLICY IF EXISTS "Allow authenticated users to delete location" ON public.location;
EXCEPTION WHEN undefined_object THEN
  -- ignore
END $$;

CREATE POLICY "Allow authenticated users to read location"
  ON public.location FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert location"
  ON public.location FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update location"
  ON public.location FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete location"
  ON public.location FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE public.location IS 'Stores locations with detailed address (global)';
COMMENT ON COLUMN public.location.location_name IS 'Location name';
COMMENT ON COLUMN public.location.location_code IS 'Optional short code for the location';
COMMENT ON COLUMN public.location.address_line1 IS 'Street address line 1';
COMMENT ON COLUMN public.location.address_line2 IS 'Street address line 2';
COMMENT ON COLUMN public.location.city IS 'City';
COMMENT ON COLUMN public.location.state IS 'State/Province';
COMMENT ON COLUMN public.location.zip IS 'ZIP/Postal code';
COMMENT ON COLUMN public.location.country IS 'Country';
COMMENT ON COLUMN public.location.phone IS 'Contact phone';
COMMENT ON COLUMN public.location.email IS 'Contact email';

COMMIT;


