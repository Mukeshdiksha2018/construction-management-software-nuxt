-- Migration 046: Convert receipt_note_uuid to array in purchase_order_items_list and change_order_items_list
-- This allows items to reference multiple receipt notes

BEGIN;

-- Step 1: Add new array column for purchase_order_items_list
ALTER TABLE public.purchase_order_items_list
  ADD COLUMN IF NOT EXISTS receipt_note_uuids JSONB DEFAULT '[]'::jsonb;

-- Step 2: Migrate existing receipt_note_uuid values to array
UPDATE public.purchase_order_items_list
SET receipt_note_uuids = CASE
    WHEN receipt_note_uuid IS NOT NULL THEN jsonb_build_array(receipt_note_uuid::text)
    ELSE '[]'::jsonb
END
WHERE receipt_note_uuids = '[]'::jsonb OR receipt_note_uuids IS NULL;

-- Step 3: Add new array column for change_order_items_list
ALTER TABLE public.change_order_items_list
  ADD COLUMN IF NOT EXISTS receipt_note_uuids JSONB DEFAULT '[]'::jsonb;

-- Step 4: Migrate existing receipt_note_uuid values to array
UPDATE public.change_order_items_list
SET receipt_note_uuids = CASE
    WHEN receipt_note_uuid IS NOT NULL THEN jsonb_build_array(receipt_note_uuid::text)
    ELSE '[]'::jsonb
END
WHERE receipt_note_uuids = '[]'::jsonb OR receipt_note_uuids IS NULL;

-- Step 5: Create indexes for the new array columns
CREATE INDEX IF NOT EXISTS idx_po_items_receipt_note_uuids ON public.purchase_order_items_list USING GIN (receipt_note_uuids);
CREATE INDEX IF NOT EXISTS idx_co_items_receipt_note_uuids ON public.change_order_items_list USING GIN (receipt_note_uuids);

-- Step 6: Add comments
COMMENT ON COLUMN public.purchase_order_items_list.receipt_note_uuids IS 'Array of receipt note UUIDs that reference this item (JSONB array of UUID strings)';
COMMENT ON COLUMN public.change_order_items_list.receipt_note_uuids IS 'Array of receipt note UUIDs that reference this item (JSONB array of UUID strings)';

COMMIT;

