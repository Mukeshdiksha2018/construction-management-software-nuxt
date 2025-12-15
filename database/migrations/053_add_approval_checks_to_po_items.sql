-- Migration 053: Add approval_checks_uuids JSONB column to purchase_order_items_list
-- Description: Store array of approval check UUIDs for each purchase order item

BEGIN;

-- Step 1: Add approval_checks_uuids JSONB column to purchase_order_items_list
ALTER TABLE public.purchase_order_items_list
  ADD COLUMN IF NOT EXISTS approval_checks_uuids JSONB DEFAULT '[]'::jsonb;

-- Step 2: Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_po_items_approval_checks_uuids 
  ON public.purchase_order_items_list USING GIN (approval_checks_uuids);

-- Step 3: Add comment
COMMENT ON COLUMN public.purchase_order_items_list.approval_checks_uuids IS 'Array of approval check UUIDs for this purchase order item (JSONB array of UUID strings)';

COMMIT;

