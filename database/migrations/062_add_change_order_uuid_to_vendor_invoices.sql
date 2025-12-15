-- Migration 062: Add change_order_uuid column to vendor_invoices table
-- Description: Add a foreign key column to reference change orders when invoice_type is AGAINST_CO or AGAINST_ADVANCE_PAYMENT

-- Add the change_order_uuid column
ALTER TABLE public.vendor_invoices 
  ADD COLUMN IF NOT EXISTS change_order_uuid uuid REFERENCES public.change_orders(uuid) ON DELETE SET NULL;

-- Create an index on the new column
CREATE INDEX IF NOT EXISTS idx_vi_change_order_uuid ON public.vendor_invoices(change_order_uuid);

-- Update the comment on the column
COMMENT ON COLUMN public.vendor_invoices.change_order_uuid IS 'Reference to change order when invoice_type is AGAINST_CO or AGAINST_ADVANCE_PAYMENT';

