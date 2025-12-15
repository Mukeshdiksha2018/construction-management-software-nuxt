-- Migration 022: Create cost_code_preferred_items table
-- Description: Table to store preferred items for each cost code configuration

CREATE TABLE IF NOT EXISTS public.cost_code_preferred_items (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    cost_code_configuration_uuid UUID NOT NULL REFERENCES public.cost_code_configurations(uuid) ON DELETE CASCADE,
    corporation_uuid UUID NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    item_type_uuid UUID NOT NULL REFERENCES public.item_types(uuid) ON DELETE RESTRICT,
    project_uuid UUID REFERENCES public.projects(uuid) ON DELETE RESTRICT,
    item_name VARCHAR(255) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL CHECK (unit_price >= 0),
    unit VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cost_code_preferred_items_cost_code_uuid ON public.cost_code_preferred_items(cost_code_configuration_uuid);
CREATE INDEX IF NOT EXISTS idx_cost_code_preferred_items_corporation_uuid ON public.cost_code_preferred_items(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_cost_code_preferred_items_item_type_uuid ON public.cost_code_preferred_items(item_type_uuid);
CREATE INDEX IF NOT EXISTS idx_cost_code_preferred_items_project_uuid ON public.cost_code_preferred_items(project_uuid);
CREATE INDEX IF NOT EXISTS idx_cost_code_preferred_items_status ON public.cost_code_preferred_items(status);
CREATE INDEX IF NOT EXISTS idx_cost_code_preferred_items_item_name ON public.cost_code_preferred_items(item_name);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_cost_code_preferred_items_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_cost_code_preferred_items_updated_at
    BEFORE UPDATE ON public.cost_code_preferred_items
    FOR EACH ROW
    EXECUTE FUNCTION update_cost_code_preferred_items_updated_at();

-- Enable RLS
ALTER TABLE public.cost_code_preferred_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (based on the cost code configuration's corporation access)
CREATE POLICY "Users can view preferred items for their corporations" ON public.cost_code_preferred_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cost_code_configurations ccc
      WHERE ccc.uuid = cost_code_configuration_uuid
      AND (SELECT corporation_access 
           FROM user_profiles 
           WHERE user_id = (SELECT auth.uid())) @> ARRAY[ccc.corporation_uuid]
    )
  );

CREATE POLICY "Users can insert preferred items for their corporations" ON public.cost_code_preferred_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cost_code_configurations ccc
      WHERE ccc.uuid = cost_code_configuration_uuid
      AND (SELECT corporation_access 
           FROM user_profiles 
           WHERE user_id = (SELECT auth.uid())) @> ARRAY[ccc.corporation_uuid]
    )
  );

CREATE POLICY "Users can update preferred items for their corporations" ON public.cost_code_preferred_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.cost_code_configurations ccc
      WHERE ccc.uuid = cost_code_configuration_uuid
      AND (SELECT corporation_access 
           FROM user_profiles 
           WHERE user_id = (SELECT auth.uid())) @> ARRAY[ccc.corporation_uuid]
    )
  );

CREATE POLICY "Users can delete preferred items for their corporations" ON public.cost_code_preferred_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.cost_code_configurations ccc
      WHERE ccc.uuid = cost_code_configuration_uuid
      AND (SELECT corporation_access 
           FROM user_profiles 
           WHERE user_id = (SELECT auth.uid())) @> ARRAY[ccc.corporation_uuid]
    )
  );

-- Add comments for documentation
COMMENT ON TABLE public.cost_code_preferred_items IS 'Preferred items associated with cost code configurations';
COMMENT ON COLUMN public.cost_code_preferred_items.uuid IS 'Unique identifier for the preferred item';
COMMENT ON COLUMN public.cost_code_preferred_items.cost_code_configuration_uuid IS 'Reference to the cost code configuration this item belongs to';
COMMENT ON COLUMN public.cost_code_preferred_items.corporation_uuid IS 'Reference to the corporation this item belongs to';
COMMENT ON COLUMN public.cost_code_preferred_items.item_type_uuid IS 'Reference to the item type';
COMMENT ON COLUMN public.cost_code_preferred_items.project_uuid IS 'Reference to the project this item is associated with (optional)';
COMMENT ON COLUMN public.cost_code_preferred_items.item_name IS 'Name of the preferred item';
COMMENT ON COLUMN public.cost_code_preferred_items.unit_price IS 'Unit price of the item';
COMMENT ON COLUMN public.cost_code_preferred_items.unit IS 'Unit of measurement (UOM)';
COMMENT ON COLUMN public.cost_code_preferred_items.description IS 'Optional description of the item';
COMMENT ON COLUMN public.cost_code_preferred_items.status IS 'Status of the item (Active/Inactive)';

