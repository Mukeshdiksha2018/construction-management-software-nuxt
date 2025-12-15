-- Migration 032: Add receipt tracking fields to purchase order items

ALTER TABLE public.purchase_order_items_list
  ADD COLUMN IF NOT EXISTS receipt_note_uuid uuid REFERENCES public.stock_receipt_notes(uuid) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS received_quantity numeric,
  ADD COLUMN IF NOT EXISTS received_total numeric;

CREATE INDEX IF NOT EXISTS idx_po_items_receipt_note_uuid
  ON public.purchase_order_items_list(receipt_note_uuid);

COMMENT ON COLUMN public.purchase_order_items_list.receipt_note_uuid IS 'Associated stock receipt note uuid';
COMMENT ON COLUMN public.purchase_order_items_list.received_quantity IS 'Quantity received as part of the stock receipt note';
COMMENT ON COLUMN public.purchase_order_items_list.received_total IS 'Total cost for the received quantity (unit price x received qty)';

