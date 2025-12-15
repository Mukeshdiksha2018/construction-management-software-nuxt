-- Migration 066: Create return_note_items table
-- This table stores return note item details separately from purchase/change order items
-- This allows multiple return notes per item and better data normalization

BEGIN;

CREATE TABLE IF NOT EXISTS public.return_note_items (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Return note reference
    return_note_uuid UUID NOT NULL REFERENCES public.stock_return_notes(uuid) ON DELETE CASCADE,

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

    -- Return quantities and totals
    return_quantity NUMERIC,
    return_total NUMERIC,

    -- Status flag
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rni_return_note_uuid ON public.return_note_items(return_note_uuid);
CREATE INDEX IF NOT EXISTS idx_rni_corporation_uuid ON public.return_note_items(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_rni_project_uuid ON public.return_note_items(project_uuid);
CREATE INDEX IF NOT EXISTS idx_rni_purchase_order_uuid ON public.return_note_items(purchase_order_uuid);
CREATE INDEX IF NOT EXISTS idx_rni_change_order_uuid ON public.return_note_items(change_order_uuid);
CREATE INDEX IF NOT EXISTS idx_rni_item_uuid ON public.return_note_items(item_uuid);
CREATE INDEX IF NOT EXISTS idx_rni_item_type ON public.return_note_items(item_type);
CREATE INDEX IF NOT EXISTS idx_rni_cost_code_uuid ON public.return_note_items(cost_code_uuid);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_rni_return_item_type ON public.return_note_items(return_note_uuid, item_type);
CREATE INDEX IF NOT EXISTS idx_rni_po_item ON public.return_note_items(purchase_order_uuid, item_uuid) WHERE purchase_order_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rni_co_item ON public.return_note_items(change_order_uuid, item_uuid) WHERE change_order_uuid IS NOT NULL;

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_rni_updated_at ON public.return_note_items;
CREATE TRIGGER trg_rni_updated_at
  BEFORE UPDATE ON public.return_note_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE public.return_note_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view return_note_items for their corporations" ON public.return_note_items;
  DROP POLICY IF EXISTS "Users can insert return_note_items for their corporations" ON public.return_note_items;
  DROP POLICY IF EXISTS "Users can update return_note_items for their corporations" ON public.return_note_items;
  DROP POLICY IF EXISTS "Users can delete return_note_items for their corporations" ON public.return_note_items;
END $$;

CREATE POLICY "Users can view return_note_items for their corporations"
  ON public.return_note_items
  FOR SELECT USING (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can insert return_note_items for their corporations"
  ON public.return_note_items
  FOR INSERT WITH CHECK (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can update return_note_items for their corporations"
  ON public.return_note_items
  FOR UPDATE USING (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can delete return_note_items for their corporations"
  ON public.return_note_items
  FOR DELETE USING (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

-- Comments
COMMENT ON TABLE public.return_note_items IS 'Return note item details - stores return quantities and totals separately from purchase/change order items';
COMMENT ON COLUMN public.return_note_items.uuid IS 'Unique identifier for the return note item';
COMMENT ON COLUMN public.return_note_items.return_note_uuid IS 'Reference to the stock return note';
COMMENT ON COLUMN public.return_note_items.corporation_uuid IS 'Owning corporation';
COMMENT ON COLUMN public.return_note_items.project_uuid IS 'Associated project';
COMMENT ON COLUMN public.return_note_items.purchase_order_uuid IS 'Linked purchase order (if item_type is purchase_order)';
COMMENT ON COLUMN public.return_note_items.change_order_uuid IS 'Linked change order (if item_type is change_order)';
COMMENT ON COLUMN public.return_note_items.item_type IS 'Type of item: purchase_order or change_order';
COMMENT ON COLUMN public.return_note_items.item_uuid IS 'Reference to the item in purchase_order_items_list or change_order_items_list';
COMMENT ON COLUMN public.return_note_items.return_quantity IS 'Quantity returned for this return note';
COMMENT ON COLUMN public.return_note_items.return_total IS 'Total cost for returned quantity (unit price x return qty)';

COMMIT;

