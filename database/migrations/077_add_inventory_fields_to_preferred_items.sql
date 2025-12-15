-- Migration 077: Add inventory management fields to cost_code_preferred_items table
-- Description: Add initial_quantity, as_of_date, reorder_point, and maximum_limit columns for inventory tracking

-- Add new columns
ALTER TABLE public.cost_code_preferred_items
ADD COLUMN IF NOT EXISTS initial_quantity DECIMAL(15, 2) CHECK (initial_quantity >= 0),
ADD COLUMN IF NOT EXISTS as_of_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reorder_point DECIMAL(15, 2) CHECK (reorder_point >= 0),
ADD COLUMN IF NOT EXISTS maximum_limit DECIMAL(15, 2) CHECK (maximum_limit >= 0);

-- Add comments for documentation
COMMENT ON COLUMN public.cost_code_preferred_items.initial_quantity IS 'Initial quantity of the item in inventory';
COMMENT ON COLUMN public.cost_code_preferred_items.as_of_date IS 'Date as of which the initial quantity is recorded';
COMMENT ON COLUMN public.cost_code_preferred_items.reorder_point IS 'Minimum quantity threshold that triggers reordering';
COMMENT ON COLUMN public.cost_code_preferred_items.maximum_limit IS 'Maximum quantity limit for inventory storage';

