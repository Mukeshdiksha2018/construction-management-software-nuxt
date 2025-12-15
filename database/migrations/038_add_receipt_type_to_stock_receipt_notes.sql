-- Add receipt_type column to stock_receipt_notes table
BEGIN;

-- Add receipt_type column with default value for existing records
ALTER TABLE public.stock_receipt_notes
  ADD COLUMN IF NOT EXISTS receipt_type TEXT DEFAULT 'purchase_order';

-- Add CHECK constraint to ensure only valid receipt types
ALTER TABLE public.stock_receipt_notes
  ADD CONSTRAINT stock_receipt_notes_receipt_type_check
  CHECK (receipt_type IN ('purchase_order', 'change_order'));

-- Update existing records to have purchase_order as default (already set by DEFAULT)
-- This is just for clarity - the DEFAULT already handles this

-- Make the column NOT NULL after setting defaults
ALTER TABLE public.stock_receipt_notes
  ALTER COLUMN receipt_type SET NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_srn_receipt_type ON public.stock_receipt_notes(receipt_type);

-- Add comment
COMMENT ON COLUMN public.stock_receipt_notes.receipt_type IS 'Type of receipt: purchase_order or change_order. Determines which table to query for source data.';

COMMIT;

