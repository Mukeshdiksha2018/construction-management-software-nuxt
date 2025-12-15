-- Migration 080: Add copied_from_billing_address_uuid to project_addresses table
-- This field tracks which billing address was used as the source when creating
-- a shipment or final-destination address using the "Same as billing address" feature

ALTER TABLE public.project_addresses
  ADD COLUMN IF NOT EXISTS copied_from_billing_address_uuid uuid NULL;

-- Add comment to explain the field
COMMENT ON COLUMN public.project_addresses.copied_from_billing_address_uuid IS 
  'UUID of the billing address that was copied when creating this address. Only set for shipment or final-destination addresses created using "Same as billing address" feature.';

-- Add foreign key constraint to ensure referential integrity
-- This ensures the referenced address exists and is a billing address
ALTER TABLE public.project_addresses
  ADD CONSTRAINT fk_copied_from_billing_address
  FOREIGN KEY (copied_from_billing_address_uuid)
  REFERENCES public.project_addresses(uuid)
  ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_project_addresses_copied_from_billing 
  ON public.project_addresses(copied_from_billing_address_uuid);
