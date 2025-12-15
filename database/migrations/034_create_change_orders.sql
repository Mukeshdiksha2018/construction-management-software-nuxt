-- Create table to store Change Order form entries
-- References corporation (properties.uuid), project (projects.uuid), and optional vendor (vendors.uuid)
-- Also links to the original purchase order (purchase_order_forms.uuid) when applicable

CREATE TABLE IF NOT EXISTS public.change_orders (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,

    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Foreign keys
    corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    project_uuid uuid REFERENCES public.projects(uuid) ON DELETE SET NULL,
    vendor_uuid uuid REFERENCES public.vendors(uuid) ON DELETE SET NULL,
    original_purchase_order_uuid uuid REFERENCES public.purchase_order_forms(uuid) ON DELETE SET NULL,

    -- Change order header fields
    co_number text,
    created_date timestamptz,
    credit_days text,
    estimated_delivery_date timestamptz,
    requested_by uuid NULL,
    co_type text,

    -- Shipping / logistics
    ship_via_uuid uuid REFERENCES public.ship_via(uuid) ON DELETE SET NULL,
    freight_uuid uuid REFERENCES public.freight(uuid) ON DELETE SET NULL,
    shipping_instructions text,
    reason text,

    -- Address references
    shipping_address_uuid uuid REFERENCES public.project_addresses(uuid) ON DELETE SET NULL,

    -- Attachments and financials
    financial_breakdown jsonb DEFAULT '{}'::jsonb,
    attachments jsonb DEFAULT '[]'::jsonb,
    -- Removed items metadata for restore
    removed_co_items jsonb DEFAULT '[]'::jsonb,

    -- Status/flags
    status text DEFAULT 'Draft',
    is_active boolean DEFAULT true
);

-- Optional: constrain co_type to known values (aligning with UI options)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'change_orders'
      AND constraint_name = 'co_type_allowed'
  ) THEN
    ALTER TABLE public.change_orders
      ADD CONSTRAINT co_type_allowed
      CHECK (co_type IS NULL OR co_type IN ('LABOR', 'MATERIAL'));
  END IF;
END
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_co_uuid ON public.change_orders(uuid);
CREATE INDEX IF NOT EXISTS idx_co_corporation_uuid ON public.change_orders(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_co_project_uuid ON public.change_orders(project_uuid);
CREATE INDEX IF NOT EXISTS idx_co_vendor_uuid ON public.change_orders(vendor_uuid);
CREATE INDEX IF NOT EXISTS idx_co_created_at ON public.change_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_co_ship_via_uuid ON public.change_orders(ship_via_uuid);
CREATE INDEX IF NOT EXISTS idx_co_freight_uuid ON public.change_orders(freight_uuid);

-- Trigger to maintain updated_at
DROP TRIGGER IF EXISTS trg_co_updated_at ON public.change_orders;
CREATE TRIGGER trg_co_updated_at
  BEFORE UPDATE ON public.change_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies (mirror purchase_order_forms policies using corporation access)
DROP POLICY IF EXISTS "Users can view change_orders for their corporations" ON public.change_orders;
CREATE POLICY "Users can view change_orders for their corporations" ON public.change_orders
  FOR SELECT USING (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

DROP POLICY IF EXISTS "Users can insert change_orders for their corporations" ON public.change_orders;
CREATE POLICY "Users can insert change_orders for their corporations" ON public.change_orders
  FOR INSERT WITH CHECK (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

DROP POLICY IF EXISTS "Users can update change_orders for their corporations" ON public.change_orders;
CREATE POLICY "Users can update change_orders for their corporations" ON public.change_orders
  FOR UPDATE USING (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

DROP POLICY IF EXISTS "Users can delete change_orders for their corporations" ON public.change_orders;
CREATE POLICY "Users can delete change_orders for their corporations" ON public.change_orders
  FOR DELETE USING (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

-- ========================================
-- SUPABASE STORAGE SETUP FOR CHANGE ORDER ATTACHMENTS
-- ========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'change_order_storage',
  'change_order_storage',
  true,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for change order documents
DROP POLICY IF EXISTS "Users can view change order documents" ON storage.objects;
CREATE POLICY "Users can view change order documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'change_order_storage' AND
    EXISTS (
      SELECT 1
      FROM public.change_orders co
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE co.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[co.corporation_uuid]
    )
  );

DROP POLICY IF EXISTS "Users can upload change order documents" ON storage.objects;
CREATE POLICY "Users can upload change order documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'change_order_storage' AND
    EXISTS (
      SELECT 1
      FROM public.change_orders co
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE co.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[co.corporation_uuid]
    )
  );

DROP POLICY IF EXISTS "Users can update change order documents" ON storage.objects;
CREATE POLICY "Users can update change order documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'change_order_storage' AND
    EXISTS (
      SELECT 1
      FROM public.change_orders co
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE co.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[co.corporation_uuid]
    )
  );

DROP POLICY IF EXISTS "Users can delete change order documents" ON storage.objects;
CREATE POLICY "Users can delete change order documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'change_order_storage' AND
    EXISTS (
      SELECT 1
      FROM public.change_orders co
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE co.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[co.corporation_uuid]
    )
  );

-- Comments
COMMENT ON TABLE public.change_orders IS 'Change Orders linked to a corporation, project, vendor, and optional original purchase order';
COMMENT ON COLUMN public.change_orders.uuid IS 'Unique identifier';
COMMENT ON COLUMN public.change_orders.corporation_uuid IS 'Owning corporation (properties.uuid)';
COMMENT ON COLUMN public.change_orders.project_uuid IS 'Selected project (projects.uuid)';
COMMENT ON COLUMN public.change_orders.vendor_uuid IS 'Selected vendor (vendors.uuid)';
COMMENT ON COLUMN public.change_orders.original_purchase_order_uuid IS 'Original purchase order (purchase_order_forms.uuid)';
COMMENT ON COLUMN public.change_orders.co_number IS 'Change Order number';
COMMENT ON COLUMN public.change_orders.created_date IS 'Created date (UTC)';
COMMENT ON COLUMN public.change_orders.estimated_delivery_date IS 'Estimated delivery date (UTC)';
COMMENT ON COLUMN public.change_orders.ship_via_uuid IS 'Reference to ship_via table (UUID)';
COMMENT ON COLUMN public.change_orders.freight_uuid IS 'Reference to freight table (UUID)';
COMMENT ON COLUMN public.change_orders.shipping_instructions IS 'Shipping instructions';
COMMENT ON COLUMN public.change_orders.reason IS 'Reason for change order';
COMMENT ON COLUMN public.change_orders.shipping_address_uuid IS 'Project address UUID (ship-to)';
COMMENT ON COLUMN public.change_orders.financial_breakdown IS 'JSON payload containing any related totals/charges for the change order';
COMMENT ON COLUMN public.change_orders.attachments IS 'JSON array of attachment metadata stored in change_order_storage bucket';
COMMENT ON COLUMN public.change_orders.status IS 'Draft|Ready|Approved|Rejected';
COMMENT ON COLUMN public.change_orders.removed_co_items IS 'JSON array of removed CO items that can be restored later';

-- Backfill column when table already exists without removed_co_items
ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS removed_co_items jsonb DEFAULT '[]'::jsonb;


