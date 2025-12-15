-- Migration 079: Add terms_and_conditions_uuid to change_orders table
-- Description: Add foreign key reference to terms_and_conditions table for change orders

-- Add the new column
ALTER TABLE public.change_orders
ADD COLUMN IF NOT EXISTS terms_and_conditions_uuid uuid REFERENCES public.terms_and_conditions(uuid) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_co_terms_and_conditions_uuid ON public.change_orders(terms_and_conditions_uuid);

-- Add comment for documentation
COMMENT ON COLUMN public.change_orders.terms_and_conditions_uuid IS 'Reference to terms_and_conditions table (UUID)';
