-- Migration 037: Add GRN total fields to change order items

ALTER TABLE public.change_order_items_list
  ADD COLUMN IF NOT EXISTS grn_total numeric,
  ADD COLUMN IF NOT EXISTS grn_total_with_charges_taxes numeric;

COMMENT ON COLUMN public.change_order_items_list.grn_total IS 'GRN total amount for the item (received quantity x unit price) (CO)';
COMMENT ON COLUMN public.change_order_items_list.grn_total_with_charges_taxes IS 'GRN final total including taxes and charges for the item (CO)';


