-- Migration 044: Create receipt_note_items table
-- This table stores receipt note item details separately from purchase/change order items
-- This allows multiple receipt notes per item and better data normalization

CREATE TABLE IF NOT EXISTS public.receipt_note_items (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Receipt note reference
    receipt_note_uuid UUID NOT NULL REFERENCES public.stock_receipt_notes(uuid) ON DELETE CASCADE,

    -- Corporation and project context
    corporation_uuid UUID NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    project_uuid UUID REFERENCES public.projects(uuid) ON DELETE SET NULL,

    -- Source order references (one will be set based on item_type)
    purchase_order_uuid UUID,
    change_order_uuid UUID,

    -- Item type to distinguish between purchase order and change order items
    item_type TEXT NOT NULL CHECK (item_type IN ('purchase_order', 'change_order')),

    -- Reference to the original item
    -- For purchase_order items: references purchase_order_items_list.uuid
    -- For change_order items: references change_order_items_list.uuid
    item_uuid UUID NOT NULL,

    -- Cost code reference
    cost_code_uuid UUID REFERENCES public.cost_code_configurations(uuid) ON DELETE SET NULL,

    -- Receipt quantities and totals
    received_quantity NUMERIC,
    received_total NUMERIC,
    grn_total NUMERIC,
    grn_total_with_charges_taxes NUMERIC,

    -- Status flag
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rni_receipt_note_uuid ON public.receipt_note_items(receipt_note_uuid);
CREATE INDEX IF NOT EXISTS idx_rni_corporation_uuid ON public.receipt_note_items(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_rni_project_uuid ON public.receipt_note_items(project_uuid);
CREATE INDEX IF NOT EXISTS idx_rni_purchase_order_uuid ON public.receipt_note_items(purchase_order_uuid);
CREATE INDEX IF NOT EXISTS idx_rni_change_order_uuid ON public.receipt_note_items(change_order_uuid);
CREATE INDEX IF NOT EXISTS idx_rni_item_uuid ON public.receipt_note_items(item_uuid);
CREATE INDEX IF NOT EXISTS idx_rni_item_type ON public.receipt_note_items(item_type);
CREATE INDEX IF NOT EXISTS idx_rni_cost_code_uuid ON public.receipt_note_items(cost_code_uuid);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_rni_receipt_item_type ON public.receipt_note_items(receipt_note_uuid, item_type);
CREATE INDEX IF NOT EXISTS idx_rni_po_item ON public.receipt_note_items(purchase_order_uuid, item_uuid) WHERE purchase_order_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rni_co_item ON public.receipt_note_items(change_order_uuid, item_uuid) WHERE change_order_uuid IS NOT NULL;

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_rni_updated_at ON public.receipt_note_items;
CREATE TRIGGER trg_rni_updated_at
  BEFORE UPDATE ON public.receipt_note_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE public.receipt_note_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view receipt_note_items for their corporations" ON public.receipt_note_items;
  DROP POLICY IF EXISTS "Users can insert receipt_note_items for their corporations" ON public.receipt_note_items;
  DROP POLICY IF EXISTS "Users can update receipt_note_items for their corporations" ON public.receipt_note_items;
  DROP POLICY IF EXISTS "Users can delete receipt_note_items for their corporations" ON public.receipt_note_items;
END $$;

CREATE POLICY "Users can view receipt_note_items for their corporations"
  ON public.receipt_note_items
  FOR SELECT USING (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can insert receipt_note_items for their corporations"
  ON public.receipt_note_items
  FOR INSERT WITH CHECK (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can update receipt_note_items for their corporations"
  ON public.receipt_note_items
  FOR UPDATE USING (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can delete receipt_note_items for their corporations"
  ON public.receipt_note_items
  FOR DELETE USING (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

-- Comments
COMMENT ON TABLE public.receipt_note_items IS 'Receipt note item details - stores received quantities and totals separately from purchase/change order items';
COMMENT ON COLUMN public.receipt_note_items.uuid IS 'Unique identifier for the receipt note item';
COMMENT ON COLUMN public.receipt_note_items.receipt_note_uuid IS 'Reference to the stock receipt note';
COMMENT ON COLUMN public.receipt_note_items.corporation_uuid IS 'Owning corporation';
COMMENT ON COLUMN public.receipt_note_items.project_uuid IS 'Associated project';
COMMENT ON COLUMN public.receipt_note_items.purchase_order_uuid IS 'Linked purchase order (if item_type is purchase_order)';
COMMENT ON COLUMN public.receipt_note_items.change_order_uuid IS 'Linked change order (if item_type is change_order)';
COMMENT ON COLUMN public.receipt_note_items.item_type IS 'Type of item: purchase_order or change_order';
COMMENT ON COLUMN public.receipt_note_items.item_uuid IS 'Reference to the item in purchase_order_items_list or change_order_items_list';
COMMENT ON COLUMN public.receipt_note_items.received_quantity IS 'Quantity received for this receipt note';
COMMENT ON COLUMN public.receipt_note_items.received_total IS 'Total cost for received quantity (unit price x received qty)';
COMMENT ON COLUMN public.receipt_note_items.grn_total IS 'GRN total amount for the item';
COMMENT ON COLUMN public.receipt_note_items.grn_total_with_charges_taxes IS 'GRN final total including taxes and charges';

