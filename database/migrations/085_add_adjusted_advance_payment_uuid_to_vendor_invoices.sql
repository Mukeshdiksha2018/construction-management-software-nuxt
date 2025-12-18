-- Migration 085: Add adjusted_advance_payment_uuid column to vendor_invoices table
-- Description: This column stores the UUID of the advance payment invoice that is being adjusted against this invoice
-- Used when an invoice (AGAINST_PO or AGAINST_CO) is adjusted with an advance payment

BEGIN;

-- Add adjusted_advance_payment_uuid column
ALTER TABLE public.vendor_invoices
  ADD COLUMN IF NOT EXISTS adjusted_advance_payment_uuid UUID REFERENCES public.vendor_invoices(uuid) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_vi_adjusted_advance_payment_uuid 
  ON public.vendor_invoices(adjusted_advance_payment_uuid);

-- Add comment
COMMENT ON COLUMN public.vendor_invoices.adjusted_advance_payment_uuid IS 
  'UUID of the advance payment invoice (AGAINST_ADVANCE_PAYMENT type) that is being adjusted against this invoice (AGAINST_PO or AGAINST_CO type). NULL means no advance payment is adjusted.';

COMMIT;

