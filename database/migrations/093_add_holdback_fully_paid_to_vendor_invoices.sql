-- Migration 093: Add holdback_fully_paid column to vendor_invoices table
-- Description: This column tracks whether the holdback amount for a PO/CO invoice (AGAINST_PO or AGAINST_CO) is fully paid.
-- When a holdback invoice (AGAINST_HOLDBACK_AMOUNT) is created/updated/deleted, this column is updated accordingly.

-- Add column with default value false
ALTER TABLE public.vendor_invoices
  ADD COLUMN IF NOT EXISTS holdback_fully_paid boolean DEFAULT false NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_vi_holdback_fully_paid 
  ON public.vendor_invoices(holdback_fully_paid);

-- Add comment
COMMENT ON COLUMN public.vendor_invoices.holdback_fully_paid IS 
  'Indicates whether the holdback amount for this invoice (AGAINST_PO or AGAINST_CO) is fully paid. Updated when holdback invoices (AGAINST_HOLDBACK_AMOUNT) are created, updated, or deleted.';

