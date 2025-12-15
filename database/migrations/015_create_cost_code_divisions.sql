-- Migration: Create cost_code_divisions table
-- Description: Table to store cost code divisions for each corporation

CREATE TABLE IF NOT EXISTS public.cost_code_divisions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    corporation_uuid UUID NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    division_number VARCHAR(10) NOT NULL,
    division_name VARCHAR(255) NOT NULL,
    division_order INTEGER NOT NULL CHECK (division_order >= 1 AND division_order <= 100),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique division number per corporation
    UNIQUE(corporation_uuid, division_number),
    
    -- Ensure unique division order per corporation
    UNIQUE(corporation_uuid, division_order)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cost_code_divisions_corporation_uuid ON public.cost_code_divisions(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_cost_code_divisions_division_number ON public.cost_code_divisions(division_number);
CREATE INDEX IF NOT EXISTS idx_cost_code_divisions_division_order ON public.cost_code_divisions(division_order);
CREATE INDEX IF NOT EXISTS idx_cost_code_divisions_is_active ON public.cost_code_divisions(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_cost_code_divisions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_cost_code_divisions_updated_at
    BEFORE UPDATE ON public.cost_code_divisions
    FOR EACH ROW
    EXECUTE FUNCTION update_cost_code_divisions_updated_at();

-- Enable RLS
ALTER TABLE public.cost_code_divisions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view cost code divisions for their corporations" ON public.cost_code_divisions
  FOR SELECT USING (
    (SELECT corporation_access 
     FROM user_profiles 
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

-- Add comments for documentation
COMMENT ON TABLE public.cost_code_divisions IS 'Cost code divisions for each corporation';
COMMENT ON COLUMN public.cost_code_divisions.uuid IS 'Unique identifier for the division';
COMMENT ON COLUMN public.cost_code_divisions.corporation_uuid IS 'Reference to the corporation this division belongs to';
COMMENT ON COLUMN public.cost_code_divisions.division_number IS 'Unique division number within the corporation';
COMMENT ON COLUMN public.cost_code_divisions.division_name IS 'Name of the division';
COMMENT ON COLUMN public.cost_code_divisions.division_order IS 'Display order (1-100) within the corporation';
COMMENT ON COLUMN public.cost_code_divisions.description IS 'Optional description of the division';
COMMENT ON COLUMN public.cost_code_divisions.is_active IS 'Whether the division is active or inactive';
