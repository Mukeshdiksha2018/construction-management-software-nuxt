-- Add AGAINST_CO invoice type and remove AGAINST_ESTIMATE from vendor_invoices table
-- Update the CHECK constraint on invoice_type column

-- Drop the existing CHECK constraint
ALTER TABLE public.vendor_invoices 
  DROP CONSTRAINT IF EXISTS vendor_invoices_invoice_type_check;

-- Add the new CHECK constraint with AGAINST_CO and without AGAINST_ESTIMATE
ALTER TABLE public.vendor_invoices 
  ADD CONSTRAINT vendor_invoices_invoice_type_check 
  CHECK (invoice_type IN ('ENTER_DIRECT_INVOICE', 'AGAINST_PO', 'AGAINST_CO', 'AGAINST_ADVANCE_PAYMENT', 'AGAINST_HOLDBACK_AMOUNT'));

-- Update the comment on invoice_type column
COMMENT ON COLUMN public.vendor_invoices.invoice_type IS 'Type of invoice: ENTER_DIRECT_INVOICE, AGAINST_PO, AGAINST_CO, AGAINST_ADVANCE_PAYMENT, AGAINST_HOLDBACK_AMOUNT';

