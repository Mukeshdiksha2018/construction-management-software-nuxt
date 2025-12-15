-- Migration 040: Add item_sequence column to cost_code_preferred_items
-- Description: Add item_sequence field to store alphanumeric sequence identifiers for items

-- Add item_sequence column
ALTER TABLE public.cost_code_preferred_items
ADD COLUMN IF NOT EXISTS item_sequence VARCHAR(100);

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_cost_code_preferred_items_item_sequence 
ON public.cost_code_preferred_items(item_sequence);

-- Add comment for documentation
COMMENT ON COLUMN public.cost_code_preferred_items.item_sequence IS 'Alphanumeric sequence identifier for the item (supports letters, numbers, and symbols like -)';


