-- Migration 025: Create estimate_line_items table and drop JSONB line_items from estimates

-- Create table to store per-line items for estimates
CREATE TABLE IF NOT EXISTS public.estimate_line_items (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    corporation_uuid UUID NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    project_uuid UUID NOT NULL REFERENCES public.projects(uuid) ON DELETE RESTRICT,
    estimate_uuid UUID NOT NULL REFERENCES public.estimates(uuid) ON DELETE CASCADE,
    cost_code_uuid UUID NOT NULL REFERENCES public.cost_code_configurations(uuid) ON DELETE RESTRICT,

    cost_code_number TEXT,
    cost_code_name TEXT,
    division_name TEXT,
    description TEXT,
    is_sub_cost_code BOOLEAN DEFAULT FALSE,

    -- Labor estimation
    labor_estimation_type TEXT CHECK (labor_estimation_type IN ('manual','per-room','per-sqft')),
    labor_amount NUMERIC(15,2) DEFAULT 0.00,
    labor_amount_per_room NUMERIC(15,2) DEFAULT 0.00,
    labor_rooms_count INT DEFAULT 0,
    labor_amount_per_sqft NUMERIC(15,2) DEFAULT 0.00,
    labor_sq_ft_count INT DEFAULT 0,

    -- Material details kept as JSONB per line
    material_items JSONB DEFAULT '[]'::jsonb,
    material_amount NUMERIC(15,2) DEFAULT 0.00,

    contingency_amount NUMERIC(15,2) DEFAULT 0.00,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_estimate_line_items_corp ON public.estimate_line_items(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_estimate_line_items_project ON public.estimate_line_items(project_uuid);
CREATE INDEX IF NOT EXISTS idx_estimate_line_items_estimate ON public.estimate_line_items(estimate_uuid);
CREATE INDEX IF NOT EXISTS idx_estimate_line_items_cost_code ON public.estimate_line_items(cost_code_uuid);

-- updated_at trigger
DROP TRIGGER IF EXISTS update_estimate_line_items_updated_at ON public.estimate_line_items;
CREATE TRIGGER update_estimate_line_items_updated_at
    BEFORE UPDATE ON public.estimate_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- (line_items column no longer created in 024; nothing to drop here)

-- Enable RLS and add policies
ALTER TABLE public.estimate_line_items ENABLE ROW LEVEL SECURITY;

-- SELECT policy
DROP POLICY IF EXISTS "Users can view estimate line items for their corporations" ON public.estimate_line_items;
CREATE POLICY "Users can view estimate line items for their corporations" ON public.estimate_line_items
  FOR SELECT USING (
    (SELECT corporation_access FROM user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

-- INSERT policy
DROP POLICY IF EXISTS "Users can insert estimate line items for their corporations" ON public.estimate_line_items;
CREATE POLICY "Users can insert estimate line items for their corporations" ON public.estimate_line_items
  FOR INSERT WITH CHECK (
    (SELECT corporation_access FROM user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

-- UPDATE policy
DROP POLICY IF EXISTS "Users can update estimate line items for their corporations" ON public.estimate_line_items;
CREATE POLICY "Users can update estimate line items for their corporations" ON public.estimate_line_items
  FOR UPDATE USING (
    (SELECT corporation_access FROM user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

-- DELETE policy
DROP POLICY IF EXISTS "Users can delete estimate line items for their corporations" ON public.estimate_line_items;
CREATE POLICY "Users can delete estimate line items for their corporations" ON public.estimate_line_items
  FOR DELETE USING (
    (SELECT corporation_access FROM user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );


