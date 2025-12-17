-- Migration 084: Add vendor_uuid column to stock_receipt_notes table
-- This allows filtering purchase orders and change orders by vendor

BEGIN;

-- Add vendor_uuid column
ALTER TABLE public.stock_receipt_notes
  ADD COLUMN IF NOT EXISTS vendor_uuid UUID REFERENCES public.vendors(uuid) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.stock_receipt_notes.vendor_uuid IS 'Vendor UUID for filtering purchase orders and change orders (vendors.uuid)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_srn_vendor_uuid ON public.stock_receipt_notes(vendor_uuid);

COMMIT;

