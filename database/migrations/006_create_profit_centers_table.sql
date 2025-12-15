-- Migration 006: Create profit_centers table
-- This table depends on properties table

CREATE TABLE IF NOT EXISTS public.profit_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
  name text NOT NULL,
  code text UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for profit_centers table
CREATE INDEX IF NOT EXISTS idx_profit_centers_corporation_uuid ON public.profit_centers(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_profit_centers_code ON public.profit_centers(code);
CREATE INDEX IF NOT EXISTS idx_profit_centers_is_active ON public.profit_centers(is_active);

-- Enable RLS
ALTER TABLE public.profit_centers ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view profit_centers for their corporations" ON public.profit_centers
    FOR SELECT USING (true);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_profit_centers_updated_at ON public.profit_centers;
CREATE TRIGGER update_profit_centers_updated_at 
    BEFORE UPDATE ON public.profit_centers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
