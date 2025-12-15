-- Migration 047: Remove receipt-related columns from purchase_order_items_list
-- These columns are now stored in receipt_note_items table

BEGIN;

-- Drop foreign key constraint first
ALTER TABLE public.purchase_order_items_list
  DROP CONSTRAINT IF EXISTS purchase_order_items_list_receipt_note_uuid_fkey;

-- Drop index
DROP INDEX IF EXISTS idx_po_items_receipt_note_uuid;

-- Remove columns (data has been migrated to receipt_note_items)
ALTER TABLE public.purchase_order_items_list
  DROP COLUMN IF EXISTS receipt_note_uuid,
  DROP COLUMN IF EXISTS received_quantity,
  DROP COLUMN IF EXISTS received_total,
  DROP COLUMN IF EXISTS grn_total,
  DROP COLUMN IF EXISTS grn_total_with_charges_taxes;

COMMIT;

