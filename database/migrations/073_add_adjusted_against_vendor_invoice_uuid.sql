-- Add adjusted_against_vendor_invoice_uuid column to vendor_invoices table
-- This column tracks which vendor invoice an advance payment invoice was adjusted against
-- When an advance payment is adjusted against an invoice, it should not be shown as available for adjustment in other invoices

-- Add column with foreign key constraint
ALTER TABLE public.vendor_invoices
  ADD COLUMN IF NOT EXISTS adjusted_against_vendor_invoice_uuid UUID;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_vi_adjusted_against_vendor_invoice_uuid 
  ON public.vendor_invoices(adjusted_against_vendor_invoice_uuid);

-- Add foreign key constraint (self-referencing)
ALTER TABLE public.vendor_invoices
  ADD CONSTRAINT fk_vi_adjusted_against_vendor_invoice_uuid
  FOREIGN KEY (adjusted_against_vendor_invoice_uuid)
  REFERENCES public.vendor_invoices(uuid)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Add comment
COMMENT ON COLUMN public.vendor_invoices.adjusted_against_vendor_invoice_uuid IS 
  'UUID of the vendor invoice (AGAINST_PO or AGAINST_CO type) that this advance payment invoice was adjusted against. NULL means not yet adjusted.';

