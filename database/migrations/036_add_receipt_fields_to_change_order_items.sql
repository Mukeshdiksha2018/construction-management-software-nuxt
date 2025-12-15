-- Migration 036: Add receipt tracking fields to change order items

ALTER TABLE public.change_order_items_list
  ADD COLUMN IF NOT EXISTS receipt_note_uuid uuid REFERENCES public.stock_receipt_notes(uuid) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS received_quantity numeric,
  ADD COLUMN IF NOT EXISTS received_total numeric;

CREATE INDEX IF NOT EXISTS idx_co_items_receipt_note_uuid
  ON public.change_order_items_list(receipt_note_uuid);

COMMENT ON COLUMN public.change_order_items_list.receipt_note_uuid IS 'Associated stock receipt note uuid (for CO)';
COMMENT ON COLUMN public.change_order_items_list.received_quantity IS 'Quantity received as part of the stock receipt note (CO)';
COMMENT ON COLUMN public.change_order_items_list.received_total IS 'Total cost for the received quantity (unit price x received qty) (CO)';


