-- Create Ship Via table (NOT corporation-specific)
CREATE TABLE IF NOT EXISTS public.ship_via (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    ship_via VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ship_via_uuid ON public.ship_via(uuid);
CREATE INDEX IF NOT EXISTS idx_ship_via_active ON public.ship_via(active);
CREATE INDEX IF NOT EXISTS idx_ship_via_created_at ON public.ship_via(created_at);
CREATE INDEX IF NOT EXISTS idx_ship_via_ship_via ON public.ship_via(ship_via);

-- Create unique constraint for ship_via to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_ship_via_ship_via_unique ON public.ship_via(ship_via);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS ship_via_updated_at ON public.ship_via;
CREATE TRIGGER ship_via_updated_at
  BEFORE UPDATE ON public.ship_via
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.ship_via ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (accessible to all authenticated users since it's not corporation-specific)
CREATE POLICY "Allow authenticated users to read ship_via"
  ON public.ship_via
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert ship_via"
  ON public.ship_via
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update ship_via"
  ON public.ship_via
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete ship_via"
  ON public.ship_via
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comments to the table
COMMENT ON TABLE public.ship_via IS 'Stores ship via methods (NOT corporation-specific)';
COMMENT ON COLUMN public.ship_via.uuid IS 'Unique identifier for the ship via record';
COMMENT ON COLUMN public.ship_via.ship_via IS 'Shipping method name (e.g., FedEx, UPS, DHL)';
COMMENT ON COLUMN public.ship_via.description IS 'Description of the ship via service';
COMMENT ON COLUMN public.ship_via.active IS 'Whether this ship via service is active';
COMMENT ON COLUMN public.ship_via.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN public.ship_via.updated_at IS 'Timestamp when the record was last updated';
COMMENT ON COLUMN public.ship_via.created_by IS 'User who created this record';
COMMENT ON COLUMN public.ship_via.updated_by IS 'User who last updated this record';


