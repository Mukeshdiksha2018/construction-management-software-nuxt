-- Migration 042: Add raise_against field to purchase_order_forms table
-- Description: Add raise_against field for Labor POs to specify how labor items should be loaded (CUSTOM, AGAINST_ESTIMATE)

ALTER TABLE public.purchase_order_forms
  ADD COLUMN IF NOT EXISTS raise_against text;

COMMENT ON COLUMN public.purchase_order_forms.raise_against IS 'For Labor POs: CUSTOM or AGAINST_ESTIMATE - determines how labor items are loaded';

