ALTER TABLE public.vendor_invoices
  ADD COLUMN IF NOT EXISTS removed_advance_payment_cost_codes jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.vendor_invoices.removed_advance_payment_cost_codes IS 'JSON array of removed advance payment cost codes that can be restored later';

