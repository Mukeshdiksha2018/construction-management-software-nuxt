-- Create table to store header-only Purchase Order Form entries
-- References corporation (properties.uuid) and selected project (projects.uuid)

CREATE TABLE IF NOT EXISTS public.purchase_order_forms (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Foreign keys
    corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    project_uuid uuid REFERENCES public.projects(uuid) ON DELETE SET NULL,
    vendor_uuid uuid REFERENCES public.vendors(uuid) ON DELETE SET NULL,

    -- Scope / mode
    po_mode text DEFAULT 'PROJECT'::text CHECK (po_mode IN ('PROJECT', 'CUSTOM')),

    -- Form fields (header/first section only)
    po_number text,
    entry_date timestamptz,
    po_type text,
    po_type_uuid text,
    credit_days text,
    ship_via_uuid uuid REFERENCES public.ship_via(uuid) ON DELETE SET NULL,
    freight_uuid uuid REFERENCES public.freight(uuid) ON DELETE SET NULL,
    shipping_instructions text,
    estimated_delivery_date timestamptz,
    include_items text,
    shipping_address_custom text,

    -- Optional address references
    shipping_address_uuid uuid REFERENCES public.project_addresses(uuid) ON DELETE SET NULL,
    billing_address_uuid uuid REFERENCES public.project_addresses(uuid) ON DELETE SET NULL,

    -- Financial breakdown + attachments metadata
    financial_breakdown jsonb DEFAULT '{}'::jsonb,
    attachments jsonb DEFAULT '[]'::jsonb,

    -- Status/flags
    status text DEFAULT 'Draft',
    is_active boolean DEFAULT true
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'purchase_order_forms'
      AND column_name = 'po_type_uuid'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.purchase_order_forms
      ALTER COLUMN po_type_uuid TYPE text
      USING po_type_uuid::text;
  END IF;
END
$$;

ALTER TABLE public.purchase_order_forms
  ADD COLUMN IF NOT EXISTS financial_breakdown jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.purchase_order_forms
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'purchase_order_forms'
      AND constraint_name = 'po_type_uuid_allowed'
  ) THEN
    ALTER TABLE public.purchase_order_forms
      ADD CONSTRAINT po_type_uuid_allowed
      CHECK (po_type_uuid IS NULL OR po_type_uuid IN ('LABOR', 'MATERIAL'));
  END IF;
END
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pof_uuid ON public.purchase_order_forms(uuid);
CREATE INDEX IF NOT EXISTS idx_pof_corporation_uuid ON public.purchase_order_forms(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_pof_project_uuid ON public.purchase_order_forms(project_uuid);
CREATE INDEX IF NOT EXISTS idx_pof_vendor_uuid ON public.purchase_order_forms(vendor_uuid);
CREATE INDEX IF NOT EXISTS idx_pof_ship_via_uuid ON public.purchase_order_forms(ship_via_uuid);
CREATE INDEX IF NOT EXISTS idx_pof_freight_uuid ON public.purchase_order_forms(freight_uuid);
CREATE INDEX IF NOT EXISTS idx_pof_created_at ON public.purchase_order_forms(created_at);

-- Trigger to maintain updated_at
DROP TRIGGER IF EXISTS trg_pof_updated_at ON public.purchase_order_forms;
CREATE TRIGGER trg_pof_updated_at
  BEFORE UPDATE ON public.purchase_order_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.purchase_order_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view purchase_order_forms for their corporations" ON public.purchase_order_forms;
CREATE POLICY "Users can view purchase_order_forms for their corporations" ON public.purchase_order_forms
  FOR SELECT USING (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

DROP POLICY IF EXISTS "Users can insert purchase_order_forms for their corporations" ON public.purchase_order_forms;
CREATE POLICY "Users can insert purchase_order_forms for their corporations" ON public.purchase_order_forms
  FOR INSERT WITH CHECK (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

DROP POLICY IF EXISTS "Users can update purchase_order_forms for their corporations" ON public.purchase_order_forms;
CREATE POLICY "Users can update purchase_order_forms for their corporations" ON public.purchase_order_forms
  FOR UPDATE USING (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

DROP POLICY IF EXISTS "Users can delete purchase_order_forms for their corporations" ON public.purchase_order_forms;
CREATE POLICY "Users can delete purchase_order_forms for their corporations" ON public.purchase_order_forms
  FOR DELETE USING (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

-- Comments
COMMENT ON TABLE public.purchase_order_forms IS 'Header-only PO form submissions linked to a corporation and optional project';
COMMENT ON COLUMN public.purchase_order_forms.uuid IS 'Unique identifier';
COMMENT ON COLUMN public.purchase_order_forms.corporation_uuid IS 'Owning corporation (properties.uuid)';
COMMENT ON COLUMN public.purchase_order_forms.project_uuid IS 'Selected project (projects.uuid)';
COMMENT ON COLUMN public.purchase_order_forms.vendor_uuid IS 'Selected vendor (vendors.uuid)';
COMMENT ON COLUMN public.purchase_order_forms.po_mode IS 'PROJECT or CUSTOM purchase order';
COMMENT ON COLUMN public.purchase_order_forms.po_number IS 'Displayed PO number (may be draft)';
COMMENT ON COLUMN public.purchase_order_forms.entry_date IS 'Entry date (UTC)';
COMMENT ON COLUMN public.purchase_order_forms.po_type_uuid IS 'Purchase order type identifier (LABOR|MATERIAL)';
COMMENT ON COLUMN public.purchase_order_forms.estimated_delivery_date IS 'Estimated delivery date (UTC)';
COMMENT ON COLUMN public.purchase_order_forms.include_items IS 'Custom | Import Items from Master | Import Items from Estimate';
COMMENT ON COLUMN public.purchase_order_forms.shipping_address_custom IS 'Custom ship-to address when po_mode = CUSTOM';
COMMENT ON COLUMN public.purchase_order_forms.status IS 'Draft|Ready|Approved|Rejected';
COMMENT ON COLUMN public.purchase_order_forms.ship_via_uuid IS 'Reference to ship_via table (UUID)';
COMMENT ON COLUMN public.purchase_order_forms.freight_uuid IS 'Reference to freight table (UUID)';
COMMENT ON COLUMN public.purchase_order_forms.financial_breakdown IS 'JSON payload containing charge, tax, and total breakdown data';
COMMENT ON COLUMN public.purchase_order_forms.attachments IS 'JSON array of attachment metadata (stored in purchase-order-documents bucket)';

-- ========================================
-- SUPABASE STORAGE SETUP FOR PO ATTACHMENTS
-- ========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'purchase-order-documents',
  'purchase-order-documents',
  true,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can view purchase order documents" ON storage.objects;
CREATE POLICY "Users can view purchase order documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'purchase-order-documents' AND
    EXISTS (
      SELECT 1
      FROM public.purchase_order_forms pof
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE pof.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[pof.corporation_uuid]
    )
  );

DROP POLICY IF EXISTS "Users can upload purchase order documents" ON storage.objects;
CREATE POLICY "Users can upload purchase order documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'purchase-order-documents' AND
    EXISTS (
      SELECT 1
      FROM public.purchase_order_forms pof
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE pof.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[pof.corporation_uuid]
    )
  );

DROP POLICY IF EXISTS "Users can update purchase order documents" ON storage.objects;
CREATE POLICY "Users can update purchase order documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'purchase-order-documents' AND
    EXISTS (
      SELECT 1
      FROM public.purchase_order_forms pof
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE pof.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[pof.corporation_uuid]
    )
  );

DROP POLICY IF EXISTS "Users can delete purchase order documents" ON storage.objects;
CREATE POLICY "Users can delete purchase order documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'purchase-order-documents' AND
    EXISTS (
      SELECT 1
      FROM public.purchase_order_forms pof
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE pof.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[pof.corporation_uuid]
    )
  );


