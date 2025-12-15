-- Migration 041: Labor purchase order items list
-- Description: Table to store labor line items associated with purchase orders

CREATE TABLE IF NOT EXISTS public.labor_purchase_order_items_list (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    project_uuid uuid REFERENCES public.projects(uuid) ON DELETE SET NULL,
    purchase_order_uuid uuid NOT NULL REFERENCES public.purchase_order_forms(uuid) ON DELETE CASCADE,

    order_index integer DEFAULT 0,

    cost_code_uuid uuid,
    cost_code_number text,
    cost_code_name text,
    cost_code_label text,
    division_name text,

    labor_budgeted_amount numeric,
    po_amount numeric CHECK (po_amount IS NULL OR po_amount >= 0),

    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_labor_po_items_purchase_order_uuid
  ON public.labor_purchase_order_items_list(purchase_order_uuid);

CREATE INDEX IF NOT EXISTS idx_labor_po_items_corporation_uuid
  ON public.labor_purchase_order_items_list(corporation_uuid);

CREATE INDEX IF NOT EXISTS idx_labor_po_items_project_uuid
  ON public.labor_purchase_order_items_list(project_uuid);

CREATE INDEX IF NOT EXISTS idx_labor_po_items_cost_code_uuid
  ON public.labor_purchase_order_items_list(cost_code_uuid);

DROP TRIGGER IF EXISTS trg_labor_po_items_updated_at
  ON public.labor_purchase_order_items_list;

CREATE TRIGGER trg_labor_po_items_updated_at
  BEFORE UPDATE ON public.labor_purchase_order_items_list
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.labor_purchase_order_items_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view labor purchase order items for their corporations"
  ON public.labor_purchase_order_items_list;

CREATE POLICY "Users can view labor purchase order items for their corporations"
  ON public.labor_purchase_order_items_list
  FOR SELECT USING (
    (SELECT corporation_access
     FROM public.user_profiles
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

DROP POLICY IF EXISTS "Users can insert labor purchase order items for their corporations"
  ON public.labor_purchase_order_items_list;

CREATE POLICY "Users can insert labor purchase order items for their corporations"
  ON public.labor_purchase_order_items_list
  FOR INSERT WITH CHECK (
    (SELECT corporation_access
     FROM public.user_profiles
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

DROP POLICY IF EXISTS "Users can update labor purchase order items for their corporations"
  ON public.labor_purchase_order_items_list;

CREATE POLICY "Users can update labor purchase order items for their corporations"
  ON public.labor_purchase_order_items_list
  FOR UPDATE USING (
    (SELECT corporation_access
     FROM public.user_profiles
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

DROP POLICY IF EXISTS "Users can delete labor purchase order items for their corporations"
  ON public.labor_purchase_order_items_list;

CREATE POLICY "Users can delete labor purchase order items for their corporations"
  ON public.labor_purchase_order_items_list
  FOR DELETE USING (
    (SELECT corporation_access
     FROM public.user_profiles
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

COMMENT ON TABLE public.labor_purchase_order_items_list IS 'Labor line items associated with purchase orders';
COMMENT ON COLUMN public.labor_purchase_order_items_list.uuid IS 'Unique identifier';
COMMENT ON COLUMN public.labor_purchase_order_items_list.order_index IS 'Position of the item within a purchase order';
COMMENT ON COLUMN public.labor_purchase_order_items_list.cost_code_uuid IS 'Reference to the cost code';
COMMENT ON COLUMN public.labor_purchase_order_items_list.labor_budgeted_amount IS 'Labor amount from estimate (optional, for Against Estimate mode)';
COMMENT ON COLUMN public.labor_purchase_order_items_list.po_amount IS 'Purchase order amount for this labor cost code';
COMMENT ON COLUMN public.labor_purchase_order_items_list.metadata IS 'Additional metadata captured from the UI';

