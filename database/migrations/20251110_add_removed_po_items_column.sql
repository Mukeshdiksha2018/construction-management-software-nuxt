ALTER TABLE public.purchase_order_forms
  ADD COLUMN IF NOT EXISTS removed_po_items jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.purchase_order_forms.removed_po_items IS 'JSON array of removed PO items that can be restored later';
