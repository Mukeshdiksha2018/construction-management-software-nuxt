-- Migration 082: Add financial_breakdown column to stock_return_notes table
-- This column stores charge, tax, and total breakdown data similar to purchase_order_forms

BEGIN;

-- Add financial_breakdown column if it doesn't exist
ALTER TABLE public.stock_return_notes
  ADD COLUMN IF NOT EXISTS financial_breakdown jsonb DEFAULT '{}'::jsonb;

-- Add comment
COMMENT ON COLUMN public.stock_return_notes.financial_breakdown IS 'JSON payload containing charge, tax, and total breakdown data for return notes';

COMMIT;

