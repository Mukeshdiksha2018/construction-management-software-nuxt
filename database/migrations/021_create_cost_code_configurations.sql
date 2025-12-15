-- Migration 021: Create cost_code_configurations table
-- Description: Table to store cost code configurations for each corporation

CREATE TABLE IF NOT EXISTS public.cost_code_configurations (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    corporation_uuid UUID NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    division_uuid UUID REFERENCES public.cost_code_divisions(uuid) ON DELETE SET NULL,
    cost_code_number VARCHAR(50) NOT NULL,
    cost_code_name VARCHAR(255) NOT NULL,
    parent_cost_code_uuid UUID REFERENCES public.cost_code_configurations(uuid) ON DELETE SET NULL,
    order_number INTEGER CHECK (order_number >= 1 AND order_number <= 200),
    gl_account_uuid UUID REFERENCES public.chart_of_accounts(uuid) ON DELETE SET NULL,
    preferred_vendor_uuid UUID REFERENCES public.vendors(uuid) ON DELETE SET NULL,
    effective_from DATE,
    description TEXT,
    update_previous_transactions BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique cost code number per corporation
    UNIQUE(corporation_uuid, cost_code_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cost_code_configurations_corporation_uuid ON public.cost_code_configurations(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_cost_code_configurations_division_uuid ON public.cost_code_configurations(division_uuid);
CREATE INDEX IF NOT EXISTS idx_cost_code_configurations_cost_code_number ON public.cost_code_configurations(cost_code_number);
CREATE INDEX IF NOT EXISTS idx_cost_code_configurations_parent_uuid ON public.cost_code_configurations(parent_cost_code_uuid);
CREATE INDEX IF NOT EXISTS idx_cost_code_configurations_gl_account_uuid ON public.cost_code_configurations(gl_account_uuid);
CREATE INDEX IF NOT EXISTS idx_cost_code_configurations_preferred_vendor_uuid ON public.cost_code_configurations(preferred_vendor_uuid);
CREATE INDEX IF NOT EXISTS idx_cost_code_configurations_is_active ON public.cost_code_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_cost_code_configurations_order_number ON public.cost_code_configurations(order_number);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_cost_code_configurations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_cost_code_configurations_updated_at
    BEFORE UPDATE ON public.cost_code_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_cost_code_configurations_updated_at();

-- Enable RLS
ALTER TABLE public.cost_code_configurations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view cost code configurations for their corporations" ON public.cost_code_configurations
  FOR SELECT USING (
    (SELECT corporation_access 
     FROM user_profiles 
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can insert cost code configurations for their corporations" ON public.cost_code_configurations
  FOR INSERT WITH CHECK (
    (SELECT corporation_access 
     FROM user_profiles 
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can update cost code configurations for their corporations" ON public.cost_code_configurations
  FOR UPDATE USING (
    (SELECT corporation_access 
     FROM user_profiles 
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can delete cost code configurations for their corporations" ON public.cost_code_configurations
  FOR DELETE USING (
    (SELECT corporation_access 
     FROM user_profiles 
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

-- Add comments for documentation
COMMENT ON TABLE public.cost_code_configurations IS 'Cost code configurations for each corporation';
COMMENT ON COLUMN public.cost_code_configurations.uuid IS 'Unique identifier for the cost code configuration';
COMMENT ON COLUMN public.cost_code_configurations.corporation_uuid IS 'Reference to the corporation this cost code belongs to';
COMMENT ON COLUMN public.cost_code_configurations.division_uuid IS 'Reference to the division this cost code belongs to';
COMMENT ON COLUMN public.cost_code_configurations.cost_code_number IS 'Unique cost code number within the corporation';
COMMENT ON COLUMN public.cost_code_configurations.cost_code_name IS 'Name of the cost code';
COMMENT ON COLUMN public.cost_code_configurations.parent_cost_code_uuid IS 'Reference to parent cost code for sub-categories';
COMMENT ON COLUMN public.cost_code_configurations.order_number IS 'Display order (1-200)';
COMMENT ON COLUMN public.cost_code_configurations.gl_account_uuid IS 'Reference to the GL account';
COMMENT ON COLUMN public.cost_code_configurations.preferred_vendor_uuid IS 'Reference to the preferred vendor';
COMMENT ON COLUMN public.cost_code_configurations.effective_from IS 'Date when this configuration becomes effective';
COMMENT ON COLUMN public.cost_code_configurations.description IS 'Optional description of the cost code';
COMMENT ON COLUMN public.cost_code_configurations.update_previous_transactions IS 'Whether to update previous transactions when changed';
COMMENT ON COLUMN public.cost_code_configurations.is_active IS 'Whether the cost code configuration is active or inactive';

