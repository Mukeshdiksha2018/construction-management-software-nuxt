-- Migration 086: Create adjusted_advance_payment_cost_codes table
-- Description: Table to store cost code-wise adjusted amounts when an advance payment is adjusted against an invoice (AGAINST_PO or AGAINST_CO)
-- This allows tracking how much of each advance payment cost code is being adjusted against the invoice

CREATE TABLE IF NOT EXISTS public.adjusted_advance_payment_cost_codes (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Foreign keys
    vendor_invoice_uuid uuid NOT NULL REFERENCES public.vendor_invoices(uuid) ON DELETE CASCADE,
    advance_payment_uuid uuid NOT NULL REFERENCES public.vendor_invoices(uuid) ON DELETE CASCADE,
    corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    project_uuid uuid REFERENCES public.projects(uuid) ON DELETE SET NULL,
    purchase_order_uuid uuid REFERENCES public.purchase_order_forms(uuid) ON DELETE SET NULL,
    change_order_uuid uuid REFERENCES public.change_orders(uuid) ON DELETE SET NULL,
    cost_code_uuid uuid REFERENCES public.cost_code_configurations(uuid) ON DELETE SET NULL,

    -- Cost code information (denormalized for display)
    cost_code_label text,
    cost_code_number text,
    cost_code_name text,

    -- Financial information
    adjusted_amount numeric(15,2) NOT NULL DEFAULT 0.00, -- Amount being adjusted from this cost code

    -- Additional metadata
    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_aapcc_vendor_invoice_uuid
  ON public.adjusted_advance_payment_cost_codes(vendor_invoice_uuid);

CREATE INDEX IF NOT EXISTS idx_aapcc_advance_payment_uuid
  ON public.adjusted_advance_payment_cost_codes(advance_payment_uuid);

CREATE INDEX IF NOT EXISTS idx_aapcc_corporation_uuid
  ON public.adjusted_advance_payment_cost_codes(corporation_uuid);

CREATE INDEX IF NOT EXISTS idx_aapcc_project_uuid
  ON public.adjusted_advance_payment_cost_codes(project_uuid);

CREATE INDEX IF NOT EXISTS idx_aapcc_purchase_order_uuid
  ON public.adjusted_advance_payment_cost_codes(purchase_order_uuid);

CREATE INDEX IF NOT EXISTS idx_aapcc_change_order_uuid
  ON public.adjusted_advance_payment_cost_codes(change_order_uuid);

CREATE INDEX IF NOT EXISTS idx_aapcc_cost_code_uuid
  ON public.adjusted_advance_payment_cost_codes(cost_code_uuid);

-- RLS Policies
ALTER TABLE public.adjusted_advance_payment_cost_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view adjusted_advance_payment_cost_codes for their corporations
DROP POLICY IF EXISTS "Users can view adjusted_advance_payment_cost_codes for their corporations" ON public.adjusted_advance_payment_cost_codes;
CREATE POLICY "Users can view adjusted_advance_payment_cost_codes for their corporations" ON public.adjusted_advance_payment_cost_codes
  FOR SELECT USING (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can insert adjusted_advance_payment_cost_codes for their corporations
DROP POLICY IF EXISTS "Users can insert adjusted_advance_payment_cost_codes for their corporations" ON public.adjusted_advance_payment_cost_codes;
CREATE POLICY "Users can insert adjusted_advance_payment_cost_codes for their corporations" ON public.adjusted_advance_payment_cost_codes
  FOR INSERT WITH CHECK (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can update adjusted_advance_payment_cost_codes for their corporations
DROP POLICY IF EXISTS "Users can update adjusted_advance_payment_cost_codes for their corporations" ON public.adjusted_advance_payment_cost_codes;
CREATE POLICY "Users can update adjusted_advance_payment_cost_codes for their corporations" ON public.adjusted_advance_payment_cost_codes
  FOR UPDATE USING (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can delete adjusted_advance_payment_cost_codes for their corporations
DROP POLICY IF EXISTS "Users can delete adjusted_advance_payment_cost_codes for their corporations" ON public.adjusted_advance_payment_cost_codes;
CREATE POLICY "Users can delete adjusted_advance_payment_cost_codes for their corporations" ON public.adjusted_advance_payment_cost_codes
  FOR DELETE USING (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Comments
COMMENT ON TABLE public.adjusted_advance_payment_cost_codes IS 'Cost code-wise adjusted amounts when an advance payment is adjusted against an invoice (AGAINST_PO or AGAINST_CO)';
COMMENT ON COLUMN public.adjusted_advance_payment_cost_codes.vendor_invoice_uuid IS 'The invoice (AGAINST_PO or AGAINST_CO) that is being adjusted';
COMMENT ON COLUMN public.adjusted_advance_payment_cost_codes.advance_payment_uuid IS 'The advance payment invoice (AGAINST_ADVANCE_PAYMENT) that is being adjusted';
COMMENT ON COLUMN public.adjusted_advance_payment_cost_codes.adjusted_amount IS 'Amount being adjusted from this cost code of the advance payment';

