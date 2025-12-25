-- Migration 091: Add item_uuid column to cost_code_preferred_items table
-- Description: Add item_uuid field to link preferred items to actual items for reliable UUID-based matching

-- Add item_uuid column (nullable to support existing data)
ALTER TABLE public.cost_code_preferred_items
ADD COLUMN IF NOT EXISTS item_uuid UUID;

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_cost_code_preferred_items_item_uuid 
ON public.cost_code_preferred_items(item_uuid);

-- Add comment for documentation
COMMENT ON COLUMN public.cost_code_preferred_items.item_uuid IS 'UUID of the item from items table or unique identifier for the item. Used for reliable UUID-based matching across the system.';

