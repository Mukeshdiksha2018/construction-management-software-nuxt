-- Migration 083: Add received_date and shipment_date columns to stock_receipt_notes table
-- These dates track when goods were shipped and when they were actually received

BEGIN;

-- Add received_date column (when goods were actually received)
ALTER TABLE public.stock_receipt_notes
  ADD COLUMN IF NOT EXISTS received_date TIMESTAMPTZ;

-- Add shipment_date column (when goods were shipped)
ALTER TABLE public.stock_receipt_notes
  ADD COLUMN IF NOT EXISTS shipment_date TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN public.stock_receipt_notes.received_date IS 'Date when goods were actually received (UTC)';
COMMENT ON COLUMN public.stock_receipt_notes.shipment_date IS 'Date when goods were shipped/dispatched (UTC)';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_srn_received_date ON public.stock_receipt_notes(received_date);
CREATE INDEX IF NOT EXISTS idx_srn_shipment_date ON public.stock_receipt_notes(shipment_date);

COMMIT;

