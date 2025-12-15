-- Migration 063: Create advance_payment_cost_codes table
-- Description: Table to store advance payment distribution by cost code for vendor invoices with invoice_type = 'AGAINST_ADVANCE_PAYMENT'
-- This table stores the cost code-wise distribution of advance payments

CREATE TABLE IF NOT EXISTS public.advance_payment_cost_codes (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Foreign keys
    vendor_invoice_uuid uuid NOT NULL REFERENCES public.vendor_invoices(uuid) ON DELETE CASCADE,
    corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    project_uuid uuid REFERENCES public.projects(uuid) ON DELETE SET NULL,
    vendor_uuid uuid REFERENCES public.vendors(uuid) ON DELETE SET NULL,
    purchase_order_uuid uuid REFERENCES public.purchase_order_forms(uuid) ON DELETE SET NULL,
    change_order_uuid uuid REFERENCES public.change_orders(uuid) ON DELETE SET NULL,
    cost_code_uuid uuid REFERENCES public.cost_code_configurations(uuid) ON DELETE SET NULL,
    gl_account_uuid uuid REFERENCES public.chart_of_accounts(uuid) ON DELETE SET NULL,

    -- Cost code information (denormalized for display)
    cost_code_label text,
    cost_code_number text,
    cost_code_name text,

    -- Financial information
    total_amount numeric(15,2) DEFAULT 0.00, -- Total amount from PO/CO for this cost code
    advance_amount numeric(15,2) NOT NULL DEFAULT 0.00, -- Advance amount allocated to this cost code

    -- Additional metadata
    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_apcc_vendor_invoice_uuid
  ON public.advance_payment_cost_codes(vendor_invoice_uuid);

CREATE INDEX IF NOT EXISTS idx_apcc_corporation_uuid
  ON public.advance_payment_cost_codes(corporation_uuid);

CREATE INDEX IF NOT EXISTS idx_apcc_project_uuid
  ON public.advance_payment_cost_codes(project_uuid);

CREATE INDEX IF NOT EXISTS idx_apcc_vendor_uuid
  ON public.advance_payment_cost_codes(vendor_uuid);

CREATE INDEX IF NOT EXISTS idx_apcc_purchase_order_uuid
  ON public.advance_payment_cost_codes(purchase_order_uuid);

CREATE INDEX IF NOT EXISTS idx_apcc_change_order_uuid
  ON public.advance_payment_cost_codes(change_order_uuid);

CREATE INDEX IF NOT EXISTS idx_apcc_cost_code_uuid
  ON public.advance_payment_cost_codes(cost_code_uuid);

CREATE INDEX IF NOT EXISTS idx_apcc_gl_account_uuid
  ON public.advance_payment_cost_codes(gl_account_uuid);

-- Trigger to maintain updated_at
DROP TRIGGER IF EXISTS trg_apcc_updated_at
  ON public.advance_payment_cost_codes;

CREATE TRIGGER trg_apcc_updated_at
  BEFORE UPDATE ON public.advance_payment_cost_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.advance_payment_cost_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view advance payment cost codes for their corporations"
  ON public.advance_payment_cost_codes;

CREATE POLICY "Users can view advance payment cost codes for their corporations"
  ON public.advance_payment_cost_codes
  FOR SELECT USING (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert advance payment cost codes for their corporations"
  ON public.advance_payment_cost_codes;

CREATE POLICY "Users can insert advance payment cost codes for their corporations"
  ON public.advance_payment_cost_codes
  FOR INSERT WITH CHECK (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update advance payment cost codes for their corporations"
  ON public.advance_payment_cost_codes;

CREATE POLICY "Users can update advance payment cost codes for their corporations"
  ON public.advance_payment_cost_codes
  FOR UPDATE USING (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete advance payment cost codes for their corporations"
  ON public.advance_payment_cost_codes;

CREATE POLICY "Users can delete advance payment cost codes for their corporations"
  ON public.advance_payment_cost_codes
  FOR DELETE USING (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Comments
COMMENT ON TABLE public.advance_payment_cost_codes IS 'Advance payment distribution by cost code for vendor invoices with invoice_type = AGAINST_ADVANCE_PAYMENT';
COMMENT ON COLUMN public.advance_payment_cost_codes.uuid IS 'Unique identifier';
COMMENT ON COLUMN public.advance_payment_cost_codes.vendor_invoice_uuid IS 'Reference to the parent vendor invoice';
COMMENT ON COLUMN public.advance_payment_cost_codes.corporation_uuid IS 'Owning corporation';
COMMENT ON COLUMN public.advance_payment_cost_codes.project_uuid IS 'Project associated with the advance payment';
COMMENT ON COLUMN public.advance_payment_cost_codes.vendor_uuid IS 'Vendor associated with the advance payment';
COMMENT ON COLUMN public.advance_payment_cost_codes.purchase_order_uuid IS 'Purchase order reference (nullable, for PO-based advance payments)';
COMMENT ON COLUMN public.advance_payment_cost_codes.change_order_uuid IS 'Change order reference (nullable, for CO-based advance payments)';
COMMENT ON COLUMN public.advance_payment_cost_codes.cost_code_uuid IS 'Cost code for this advance payment distribution';
COMMENT ON COLUMN public.advance_payment_cost_codes.gl_account_uuid IS 'GL account (chart of accounts) for this advance payment distribution';
COMMENT ON COLUMN public.advance_payment_cost_codes.total_amount IS 'Total amount from PO/CO for this cost code';
COMMENT ON COLUMN public.advance_payment_cost_codes.advance_amount IS 'Advance amount allocated to this cost code';

