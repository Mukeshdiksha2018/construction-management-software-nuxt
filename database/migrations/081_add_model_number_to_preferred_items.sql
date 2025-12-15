-- Migration 081: Add model_number column to cost_code_preferred_items table
-- Description: Add model_number field to store model numbers for items

-- Add model_number column
ALTER TABLE public.cost_code_preferred_items
ADD COLUMN IF NOT EXISTS model_number VARCHAR(255);

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_cost_code_preferred_items_model_number 
ON public.cost_code_preferred_items(model_number);

-- Add comment for documentation
COMMENT ON COLUMN public.cost_code_preferred_items.model_number IS 'Model number of the item';

