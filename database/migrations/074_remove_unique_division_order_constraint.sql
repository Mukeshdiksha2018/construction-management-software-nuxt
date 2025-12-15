-- Migration: Remove unique constraint on division_order
-- Description: Allow multiple divisions to have the same order number within a corporation

-- Drop the unique constraint on (corporation_uuid, division_order)
ALTER TABLE public.cost_code_divisions 
DROP CONSTRAINT IF EXISTS cost_code_divisions_corporation_uuid_division_order_key;

-- Add comment to document the change
COMMENT ON COLUMN public.cost_code_divisions.division_order IS 'Display order (1-100) within the corporation. Multiple divisions can have the same order number.';

