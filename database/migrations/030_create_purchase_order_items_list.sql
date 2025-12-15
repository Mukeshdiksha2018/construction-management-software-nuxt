-- Migration 030: Purchase order items list

CREATE TABLE IF NOT EXISTS public.purchase_order_items_list (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    project_uuid uuid REFERENCES public.projects(uuid) ON DELETE SET NULL,
    purchase_order_uuid uuid REFERENCES public.purchase_order_forms(uuid) ON DELETE CASCADE,

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
    po_quantity numeric,
    po_unit_price numeric,
    po_total numeric,
    total numeric,

    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_po_items_purchase_order_uuid
  ON public.purchase_order_items_list(purchase_order_uuid);

CREATE INDEX IF NOT EXISTS idx_po_items_corporation_uuid
  ON public.purchase_order_items_list(corporation_uuid);

CREATE INDEX IF NOT EXISTS idx_po_items_project_uuid
  ON public.purchase_order_items_list(project_uuid);

DROP TRIGGER IF EXISTS trg_po_items_updated_at
  ON public.purchase_order_items_list;

CREATE TRIGGER trg_po_items_updated_at
  BEFORE UPDATE ON public.purchase_order_items_list
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.purchase_order_items_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view purchase order items for their corporations"
  ON public.purchase_order_items_list;

CREATE POLICY "Users can view purchase order items for their corporations"
  ON public.purchase_order_items_list
  FOR SELECT USING (
    (SELECT corporation_access
     FROM public.user_profiles
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

DROP POLICY IF EXISTS "Users can insert purchase order items for their corporations"
  ON public.purchase_order_items_list;

CREATE POLICY "Users can insert purchase order items for their corporations"
  ON public.purchase_order_items_list
  FOR INSERT WITH CHECK (
    (SELECT corporation_access
     FROM public.user_profiles
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

DROP POLICY IF EXISTS "Users can update purchase order items for their corporations"
  ON public.purchase_order_items_list;

CREATE POLICY "Users can update purchase order items for their corporations"
  ON public.purchase_order_items_list
  FOR UPDATE USING (
    (SELECT corporation_access
     FROM public.user_profiles
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

DROP POLICY IF EXISTS "Users can delete purchase order items for their corporations"
  ON public.purchase_order_items_list;

CREATE POLICY "Users can delete purchase order items for their corporations"
  ON public.purchase_order_items_list
  FOR DELETE USING (
    (SELECT corporation_access
     FROM public.user_profiles
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

COMMENT ON TABLE public.purchase_order_items_list IS 'Line items associated with purchase orders';
COMMENT ON COLUMN public.purchase_order_items_list.uuid IS 'Unique identifier';
COMMENT ON COLUMN public.purchase_order_items_list.order_index IS 'Position of the item within a purchase order';
COMMENT ON COLUMN public.purchase_order_items_list.source IS 'Source of the item (e.g., ITEM_MASTER, ESTIMATE)';
COMMENT ON COLUMN public.purchase_order_items_list.metadata IS 'Additional metadata captured from the UI';

