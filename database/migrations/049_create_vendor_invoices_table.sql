-- Create table to store Vendor Invoice entries
-- References corporation (properties.uuid), project (projects.uuid), vendor (vendors.uuid), and optional purchase order (purchase_order_forms.uuid)

CREATE TABLE IF NOT EXISTS public.vendor_invoices (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Foreign keys
    corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    project_uuid uuid REFERENCES public.projects(uuid) ON DELETE SET NULL,
    vendor_uuid uuid REFERENCES public.vendors(uuid) ON DELETE SET NULL,
    purchase_order_uuid uuid REFERENCES public.purchase_order_forms(uuid) ON DELETE SET NULL,

    -- Invoice type
    invoice_type text NOT NULL CHECK (invoice_type IN ('ENTER_DIRECT_INVOICE', 'AGAINST_PO', 'AGAINST_ESTIMATE', 'AGAINST_ADVANCE_PAYMENT', 'AGAINST_HOLDBACK_AMOUNT')),

    -- Invoice details
    number text,
    bill_date timestamptz NOT NULL,
    due_date timestamptz,
    credit_days text CHECK (credit_days IN ('NET_15', 'NET_25', 'NET_30', 'NET_45', 'NET_60')),
    
    -- Financial information
    amount decimal(15,2) NOT NULL DEFAULT 0.00,
    holdback decimal(5,2) DEFAULT NULL, -- Percentage
    financial_breakdown jsonb DEFAULT '{}'::jsonb, -- Financial breakdown (charges, taxes, totals)

    -- Attachments metadata
    attachments jsonb DEFAULT '[]'::jsonb,

    -- Status/flags
    is_active boolean DEFAULT true,
    
    -- Audit fields
    created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vi_uuid ON public.vendor_invoices(uuid);
CREATE INDEX IF NOT EXISTS idx_vi_corporation_uuid ON public.vendor_invoices(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_vi_project_uuid ON public.vendor_invoices(project_uuid);
CREATE INDEX IF NOT EXISTS idx_vi_vendor_uuid ON public.vendor_invoices(vendor_uuid);
CREATE INDEX IF NOT EXISTS idx_vi_purchase_order_uuid ON public.vendor_invoices(purchase_order_uuid);
CREATE INDEX IF NOT EXISTS idx_vi_invoice_type ON public.vendor_invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_vi_bill_date ON public.vendor_invoices(bill_date);
CREATE INDEX IF NOT EXISTS idx_vi_due_date ON public.vendor_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_vi_created_at ON public.vendor_invoices(created_at);

-- Trigger to maintain updated_at
DROP TRIGGER IF EXISTS trg_vi_updated_at ON public.vendor_invoices;
CREATE TRIGGER trg_vi_updated_at
  BEFORE UPDATE ON public.vendor_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.vendor_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view vendor_invoices for their corporations" ON public.vendor_invoices;
CREATE POLICY "Users can view vendor_invoices for their corporations" ON public.vendor_invoices
  FOR SELECT USING (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert vendor_invoices for their corporations" ON public.vendor_invoices;
CREATE POLICY "Users can insert vendor_invoices for their corporations" ON public.vendor_invoices
  FOR INSERT WITH CHECK (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update vendor_invoices for their corporations" ON public.vendor_invoices;
CREATE POLICY "Users can update vendor_invoices for their corporations" ON public.vendor_invoices
  FOR UPDATE USING (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete vendor_invoices for their corporations" ON public.vendor_invoices;
CREATE POLICY "Users can delete vendor_invoices for their corporations" ON public.vendor_invoices
  FOR DELETE USING (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Comments
COMMENT ON TABLE public.vendor_invoices IS 'Vendor invoice entries linked to corporation, project, vendor, and optional purchase order';
COMMENT ON COLUMN public.vendor_invoices.uuid IS 'Unique identifier';
COMMENT ON COLUMN public.vendor_invoices.corporation_uuid IS 'Owning corporation (properties.uuid)';
COMMENT ON COLUMN public.vendor_invoices.project_uuid IS 'Selected project (projects.uuid)';
COMMENT ON COLUMN public.vendor_invoices.vendor_uuid IS 'Selected vendor (vendors.uuid)';
COMMENT ON COLUMN public.vendor_invoices.purchase_order_uuid IS 'Reference to purchase order when invoice_type is AGAINST_PO';
COMMENT ON COLUMN public.vendor_invoices.invoice_type IS 'Type of invoice: ENTER_DIRECT_INVOICE, AGAINST_PO, AGAINST_ESTIMATE, AGAINST_ADVANCE_PAYMENT, AGAINST_HOLDBACK_AMOUNT';
COMMENT ON COLUMN public.vendor_invoices.number IS 'Invoice number';
COMMENT ON COLUMN public.vendor_invoices.bill_date IS 'Bill date (UTC)';
COMMENT ON COLUMN public.vendor_invoices.due_date IS 'Due date (UTC)';
COMMENT ON COLUMN public.vendor_invoices.credit_days IS 'Credit days: NET_15, NET_25, NET_30, NET_45, NET_60';
COMMENT ON COLUMN public.vendor_invoices.amount IS 'Invoice amount';
COMMENT ON COLUMN public.vendor_invoices.holdback IS 'Holdback percentage';
COMMENT ON COLUMN public.vendor_invoices.financial_breakdown IS 'Financial breakdown JSONB object (charges, taxes, totals)';
COMMENT ON COLUMN public.vendor_invoices.attachments IS 'JSON array of attachment metadata (stored in vendor-invoice-documents bucket)';

-- ========================================
-- SUPABASE STORAGE SETUP FOR VENDOR INVOICE ATTACHMENTS
-- ========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vendor-invoice-documents',
  'vendor-invoice-documents',
  true,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can view vendor invoice documents" ON storage.objects;
CREATE POLICY "Users can view vendor invoice documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'vendor-invoice-documents' AND
    EXISTS (
      SELECT 1
      FROM public.vendor_invoices vi
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE vi.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[vi.corporation_uuid]
    )
  );

DROP POLICY IF EXISTS "Users can upload vendor invoice documents" ON storage.objects;
CREATE POLICY "Users can upload vendor invoice documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'vendor-invoice-documents' AND
    EXISTS (
      SELECT 1
      FROM public.vendor_invoices vi
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE vi.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[vi.corporation_uuid]
    )
  );

DROP POLICY IF EXISTS "Users can update vendor invoice documents" ON storage.objects;
CREATE POLICY "Users can update vendor invoice documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'vendor-invoice-documents' AND
    EXISTS (
      SELECT 1
      FROM public.vendor_invoices vi
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE vi.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[vi.corporation_uuid]
    )
  );

DROP POLICY IF EXISTS "Users can delete vendor invoice documents" ON storage.objects;
CREATE POLICY "Users can delete vendor invoice documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'vendor-invoice-documents' AND
    EXISTS (
      SELECT 1
      FROM public.vendor_invoices vi
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE vi.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[vi.corporation_uuid]
    )
  );

