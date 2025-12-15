-- Migration 017: Create storage_locations table
-- This table stores storage location information for each corporation

CREATE TABLE IF NOT EXISTS public.storage_locations (
  id BIGSERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  corporation_uuid UUID NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
  location_name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_storage_locations_corporation_uuid ON public.storage_locations(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_storage_locations_uuid ON public.storage_locations(uuid);
CREATE INDEX IF NOT EXISTS idx_storage_locations_is_default ON public.storage_locations(is_default);
CREATE INDEX IF NOT EXISTS idx_storage_locations_status ON public.storage_locations(status);

-- Enable RLS
ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read storage locations"
  ON public.storage_locations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert storage locations"
  ON public.storage_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update storage locations"
  ON public.storage_locations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete storage locations"
  ON public.storage_locations
  FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS storage_locations_updated_at ON public.storage_locations;
CREATE TRIGGER storage_locations_updated_at
  BEFORE UPDATE ON public.storage_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments to the table
COMMENT ON TABLE public.storage_locations IS 'Stores storage location information for each corporation';
COMMENT ON COLUMN public.storage_locations.uuid IS 'Unique identifier for the storage location';
COMMENT ON COLUMN public.storage_locations.corporation_uuid IS 'Reference to the corporation (property) this location belongs to';
COMMENT ON COLUMN public.storage_locations.location_name IS 'Name of the storage location';
COMMENT ON COLUMN public.storage_locations.address IS 'Full address of the storage location';
COMMENT ON COLUMN public.storage_locations.is_default IS 'Indicates if this is the default storage location for the corporation';
COMMENT ON COLUMN public.storage_locations.status IS 'Current status of the storage location (active/inactive)';

