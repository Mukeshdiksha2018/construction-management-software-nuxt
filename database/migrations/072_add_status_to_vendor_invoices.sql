-- Add status column to vendor_invoices table
-- Status values: Draft, Pending, Approved, Paid

-- Add status column with default value 'Draft'
ALTER TABLE public.vendor_invoices 
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending', 'Approved', 'Paid'));

-- Create index for status column
CREATE INDEX IF NOT EXISTS idx_vi_status ON public.vendor_invoices(status);

-- Update comment
COMMENT ON COLUMN public.vendor_invoices.status IS 'Invoice status: Draft | Pending | Approved | Paid';

