-- Create Freight table (NOT corporation-specific)
CREATE TABLE IF NOT EXISTS public.freight (
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_freight_uuid ON public.freight(uuid);
CREATE INDEX IF NOT EXISTS idx_freight_active ON public.freight(active);
CREATE INDEX IF NOT EXISTS idx_freight_created_at ON public.freight(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_freight_ship_via_unique ON public.freight((lower(ship_via)));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS freight_updated_at ON public.freight;
CREATE TRIGGER freight_updated_at
  BEFORE UPDATE ON public.freight
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.freight ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to read freight (global)" ON public.freight;
DROP POLICY IF EXISTS "Allow authenticated users to insert freight (global)" ON public.freight;
DROP POLICY IF EXISTS "Allow authenticated users to update freight (global)" ON public.freight;
DROP POLICY IF EXISTS "Allow authenticated users to delete freight (global)" ON public.freight;

CREATE POLICY "Allow authenticated users to read freight (global)"
  ON public.freight FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert freight (global)"
  ON public.freight FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update freight (global)"
  ON public.freight FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete freight (global)"
  ON public.freight FOR DELETE TO authenticated USING (true);

-- Comments
COMMENT ON TABLE public.freight IS 'Stores freight methods (global)';

