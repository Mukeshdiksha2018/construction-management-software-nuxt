-- Migration 064: Add separate change_order_uuid column to stock_receipt_notes table
-- This separates purchase_order_uuid and change_order_uuid into distinct columns
-- instead of storing both in purchase_order_uuid column

BEGIN;

-- Step 1: Add change_order_uuid column
ALTER TABLE public.stock_receipt_notes
  ADD COLUMN IF NOT EXISTS change_order_uuid UUID REFERENCES public.change_orders(uuid) ON DELETE SET NULL;

-- Step 2: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_srn_change_order_uuid 
  ON public.stock_receipt_notes(change_order_uuid);

-- Step 3: Migrate existing data
-- For records where receipt_type = 'change_order', move UUID from purchase_order_uuid to change_order_uuid
UPDATE public.stock_receipt_notes
SET change_order_uuid = purchase_order_uuid,
    purchase_order_uuid = NULL
WHERE receipt_type = 'change_order'
  AND purchase_order_uuid IS NOT NULL
  AND change_order_uuid IS NULL;

-- Step 4: Add comment
COMMENT ON COLUMN public.stock_receipt_notes.change_order_uuid IS 'Linked change order (change_orders.uuid) - used when receipt_type is change_order';
COMMENT ON COLUMN public.stock_receipt_notes.purchase_order_uuid IS 'Linked purchase order (purchase_order_forms.uuid) - used when receipt_type is purchase_order';

-- Step 5: Add constraint to ensure data integrity
-- Only one of purchase_order_uuid or change_order_uuid should be set based on receipt_type
-- This is enforced at application level, but we add a check constraint for safety
ALTER TABLE public.stock_receipt_notes
  ADD CONSTRAINT stock_receipt_notes_source_order_check
  CHECK (
    (receipt_type = 'purchase_order' AND purchase_order_uuid IS NOT NULL AND change_order_uuid IS NULL) OR
    (receipt_type = 'change_order' AND change_order_uuid IS NOT NULL AND purchase_order_uuid IS NULL) OR
    (purchase_order_uuid IS NULL AND change_order_uuid IS NULL)
  );

COMMIT;

