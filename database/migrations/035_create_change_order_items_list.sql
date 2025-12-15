-- Migration 035: Change order items list

CREATE TABLE IF NOT EXISTS public.change_order_items_list (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    project_uuid uuid REFERENCES public.projects(uuid) ON DELETE SET NULL,
    change_order_uuid uuid REFERENCES public.change_orders(uuid) ON DELETE CASCADE,

    order_index integer DEFAULT 0,
    source text,

    cost_code_uuid uuid,
    cost_code_label text,
    cost_code_number text,
    cost_code_name text,
    division_name text,

    item_type_uuid uuid,
    item_type_label text,

    item_uuid uuid,
    item_name text,
    description text,
    model_number text,

    location_uuid uuid,
    location_label text,

    unit_uuid uuid,
    unit_label text,

    quantity numeric,
    unit_price numeric,
    co_quantity numeric,
    co_unit_price numeric,
    co_total numeric,
    total numeric,

    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_co_items_change_order_uuid
  ON public.change_order_items_list(change_order_uuid);

CREATE INDEX IF NOT EXISTS idx_co_items_corporation_uuid
  ON public.change_order_items_list(corporation_uuid);

CREATE INDEX IF NOT EXISTS idx_co_items_project_uuid
  ON public.change_order_items_list(project_uuid);

DROP TRIGGER IF EXISTS trg_co_items_updated_at
  ON public.change_order_items_list;

CREATE TRIGGER trg_co_items_updated_at
  BEFORE UPDATE ON public.change_order_items_list
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.change_order_items_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view change order items for their corporations"
  ON public.change_order_items_list;

CREATE POLICY "Users can view change order items for their corporations"
  ON public.change_order_items_list
  FOR SELECT USING (
    (SELECT corporation_access
     FROM public.user_profiles
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

DROP POLICY IF EXISTS "Users can insert change order items for their corporations"
  ON public.change_order_items_list;

CREATE POLICY "Users can insert change order items for their corporations"
  ON public.change_order_items_list
  FOR INSERT WITH CHECK (
    (SELECT corporation_access
     FROM public.user_profiles
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

DROP POLICY IF EXISTS "Users can update change order items for their corporations"
  ON public.change_order_items_list;

CREATE POLICY "Users can update change order items for their corporations"
  ON public.change_order_items_list
  FOR UPDATE USING (
    (SELECT corporation_access
     FROM public.user_profiles
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

DROP POLICY IF EXISTS "Users can delete change order items for their corporations"
  ON public.change_order_items_list;

CREATE POLICY "Users can delete change order items for their corporations"
  ON public.change_order_items_list
  FOR DELETE USING (
    (SELECT corporation_access
     FROM public.user_profiles
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

COMMENT ON TABLE public.change_order_items_list IS 'Line items associated with change orders';
COMMENT ON COLUMN public.change_order_items_list.uuid IS 'Unique identifier';
COMMENT ON COLUMN public.change_order_items_list.order_index IS 'Position of the item within a change order';
COMMENT ON COLUMN public.change_order_items_list.source IS 'Source of the item (e.g., ORIGINAL_PO)';
COMMENT ON COLUMN public.change_order_items_list.metadata IS 'Additional metadata captured from the UI';


