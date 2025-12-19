-- Migration 087: Create holdback_cost_codes table
-- Description: Table to store holdback breakdown by cost code for vendor invoices with invoice_type = 'AGAINST_HOLDBACK_AMOUNT'
-- This table stores the cost code-wise distribution of holdback amounts (retainage and release amounts)

CREATE TABLE IF NOT EXISTS public.holdback_cost_codes (
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
    holdback_invoice_uuid uuid REFERENCES public.vendor_invoices(uuid) ON DELETE SET NULL, -- Reference to the original holdback invoice

    -- Cost code information (denormalized for display)
    cost_code_label text,
    cost_code_number text,
    cost_code_name text,

    -- Financial information
    total_amount numeric(15,2) DEFAULT 0.00, -- Total amount from PO/CO for this cost code
    retainage_amount numeric(15,2) NOT NULL DEFAULT 0.00, -- Retainage amount for this cost code (from original holdback invoice)
    release_amount numeric(15,2) DEFAULT 0.00, -- Release amount for this cost code (editable by user)

    -- Additional metadata
    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hcc_vendor_invoice_uuid
  ON public.holdback_cost_codes(vendor_invoice_uuid);

CREATE INDEX IF NOT EXISTS idx_hcc_corporation_uuid
  ON public.holdback_cost_codes(corporation_uuid);

CREATE INDEX IF NOT EXISTS idx_hcc_project_uuid
  ON public.holdback_cost_codes(project_uuid);

CREATE INDEX IF NOT EXISTS idx_hcc_vendor_uuid
  ON public.holdback_cost_codes(vendor_uuid);

CREATE INDEX IF NOT EXISTS idx_hcc_purchase_order_uuid
  ON public.holdback_cost_codes(purchase_order_uuid);

CREATE INDEX IF NOT EXISTS idx_hcc_change_order_uuid
  ON public.holdback_cost_codes(change_order_uuid);

CREATE INDEX IF NOT EXISTS idx_hcc_cost_code_uuid
  ON public.holdback_cost_codes(cost_code_uuid);

CREATE INDEX IF NOT EXISTS idx_hcc_gl_account_uuid
  ON public.holdback_cost_codes(gl_account_uuid);

CREATE INDEX IF NOT EXISTS idx_hcc_holdback_invoice_uuid
  ON public.holdback_cost_codes(holdback_invoice_uuid);

-- Trigger to maintain updated_at
DROP TRIGGER IF EXISTS trg_hcc_updated_at
  ON public.holdback_cost_codes;

CREATE TRIGGER trg_hcc_updated_at
  BEFORE UPDATE ON public.holdback_cost_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.holdback_cost_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view holdback cost codes for their corporations"
  ON public.holdback_cost_codes;

CREATE POLICY "Users can view holdback cost codes for their corporations"
  ON public.holdback_cost_codes
  FOR SELECT USING (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert holdback cost codes for their corporations"
  ON public.holdback_cost_codes;

CREATE POLICY "Users can insert holdback cost codes for their corporations"
  ON public.holdback_cost_codes
  FOR INSERT WITH CHECK (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update holdback cost codes for their corporations"
  ON public.holdback_cost_codes;

CREATE POLICY "Users can update holdback cost codes for their corporations"
  ON public.holdback_cost_codes
  FOR UPDATE USING (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete holdback cost codes for their corporations"
  ON public.holdback_cost_codes;

CREATE POLICY "Users can delete holdback cost codes for their corporations"
  ON public.holdback_cost_codes
  FOR DELETE USING (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Comments
COMMENT ON TABLE public.holdback_cost_codes IS 'Holdback breakdown by cost code for vendor invoices with invoice_type = AGAINST_HOLDBACK_AMOUNT';
COMMENT ON COLUMN public.holdback_cost_codes.uuid IS 'Unique identifier';
COMMENT ON COLUMN public.holdback_cost_codes.vendor_invoice_uuid IS 'Reference to the parent vendor invoice (AGAINST_HOLDBACK_AMOUNT)';
COMMENT ON COLUMN public.holdback_cost_codes.corporation_uuid IS 'Owning corporation';
COMMENT ON COLUMN public.holdback_cost_codes.project_uuid IS 'Project associated with the holdback';
COMMENT ON COLUMN public.holdback_cost_codes.vendor_uuid IS 'Vendor associated with the holdback';
COMMENT ON COLUMN public.holdback_cost_codes.purchase_order_uuid IS 'Purchase order reference (nullable, for PO-based holdbacks)';
COMMENT ON COLUMN public.holdback_cost_codes.change_order_uuid IS 'Change order reference (nullable, for CO-based holdbacks)';
COMMENT ON COLUMN public.holdback_cost_codes.cost_code_uuid IS 'Cost code for this holdback distribution';
COMMENT ON COLUMN public.holdback_cost_codes.gl_account_uuid IS 'GL account (chart of accounts) for this holdback distribution';
COMMENT ON COLUMN public.holdback_cost_codes.holdback_invoice_uuid IS 'Reference to the original holdback invoice (AGAINST_PO or AGAINST_CO) from which retainage is calculated';
COMMENT ON COLUMN public.holdback_cost_codes.total_amount IS 'Total amount from PO/CO for this cost code';
COMMENT ON COLUMN public.holdback_cost_codes.retainage_amount IS 'Retainage amount for this cost code (calculated from original holdback invoice)';
COMMENT ON COLUMN public.holdback_cost_codes.release_amount IS 'Release amount for this cost code (editable by user)';

