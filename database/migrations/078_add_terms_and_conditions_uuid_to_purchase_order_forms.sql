-- Migration 078: Add terms_and_conditions_uuid to purchase_order_forms table
-- Description: Add foreign key reference to terms_and_conditions table for purchase orders

-- Add the new column
ALTER TABLE public.purchase_order_forms
ADD COLUMN IF NOT EXISTS terms_and_conditions_uuid uuid REFERENCES public.terms_and_conditions(uuid) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_pof_terms_and_conditions_uuid ON public.purchase_order_forms(terms_and_conditions_uuid);

-- Add comment for documentation
COMMENT ON COLUMN public.purchase_order_forms.terms_and_conditions_uuid IS 'Reference to terms_and_conditions table (UUID)';
