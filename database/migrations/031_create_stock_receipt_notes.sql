-- Create table and storage bucket for Stock Receipt Notes
BEGIN;

CREATE TABLE IF NOT EXISTS public.stock_receipt_notes (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    corporation_uuid UUID NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    project_uuid UUID REFERENCES public.projects(uuid) ON DELETE SET NULL,
    purchase_order_uuid UUID,
    location_uuid UUID REFERENCES public.location(uuid) ON DELETE SET NULL,

    entry_date TIMESTAMPTZ,
    grn_number TEXT NOT NULL,
    reference_number TEXT,
    received_by UUID REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    notes TEXT,
    status TEXT DEFAULT 'Shipment',
    total_received_amount NUMERIC,
    attachments JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_srn_uuid ON public.stock_receipt_notes(uuid);
CREATE INDEX IF NOT EXISTS idx_srn_corporation_uuid ON public.stock_receipt_notes(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_srn_project_uuid ON public.stock_receipt_notes(project_uuid);
CREATE INDEX IF NOT EXISTS idx_srn_purchase_order_uuid ON public.stock_receipt_notes(purchase_order_uuid);
CREATE INDEX IF NOT EXISTS idx_srn_status ON public.stock_receipt_notes(status);
CREATE INDEX IF NOT EXISTS idx_srn_created_at ON public.stock_receipt_notes(created_at);

DROP TRIGGER IF EXISTS trg_srn_updated_at ON public.stock_receipt_notes;
CREATE TRIGGER trg_srn_updated_at
  BEFORE UPDATE ON public.stock_receipt_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.stock_receipt_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view stock_receipt_notes for their corporations" ON public.stock_receipt_notes;
  DROP POLICY IF EXISTS "Users can insert stock_receipt_notes for their corporations" ON public.stock_receipt_notes;
  DROP POLICY IF EXISTS "Users can update stock_receipt_notes for their corporations" ON public.stock_receipt_notes;
  DROP POLICY IF EXISTS "Users can delete stock_receipt_notes for their corporations" ON public.stock_receipt_notes;
END $$;

CREATE POLICY "Users can view stock_receipt_notes for their corporations"
  ON public.stock_receipt_notes
  FOR SELECT USING (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can insert stock_receipt_notes for their corporations"
  ON public.stock_receipt_notes
  FOR INSERT WITH CHECK (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can update stock_receipt_notes for their corporations"
  ON public.stock_receipt_notes
  FOR UPDATE USING (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can delete stock_receipt_notes for their corporations"
  ON public.stock_receipt_notes
  FOR DELETE USING (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

COMMENT ON TABLE public.stock_receipt_notes IS 'Goods receipt records linked to purchase orders';
COMMENT ON COLUMN public.stock_receipt_notes.uuid IS 'Unique identifier for the receipt note';
COMMENT ON COLUMN public.stock_receipt_notes.corporation_uuid IS 'Owning corporation (properties.uuid)';
COMMENT ON COLUMN public.stock_receipt_notes.project_uuid IS 'Associated project (projects.uuid)';
COMMENT ON COLUMN public.stock_receipt_notes.purchase_order_uuid IS 'Linked purchase order (purchase_orders.uuid)';
COMMENT ON COLUMN public.stock_receipt_notes.location_uuid IS 'Receiving location (location.uuid)';
COMMENT ON COLUMN public.stock_receipt_notes.entry_date IS 'Entry date (UTC)';
COMMENT ON COLUMN public.stock_receipt_notes.grn_number IS 'Generated goods receipt number';
COMMENT ON COLUMN public.stock_receipt_notes.reference_number IS 'Optional reference/invoice number';
COMMENT ON COLUMN public.stock_receipt_notes.received_by IS 'User ID from user_profiles who received the goods';
COMMENT ON COLUMN public.stock_receipt_notes.status IS 'Shipment | Received';
COMMENT ON COLUMN public.stock_receipt_notes.attachments IS 'JSON array of attachment metadata stored in stock-receipt-note-documents bucket';
COMMENT ON COLUMN public.stock_receipt_notes.metadata IS 'Additional metadata for integrations or audit context';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'purchase_orders'
  ) THEN
    ALTER TABLE public.stock_receipt_notes
      ADD CONSTRAINT stock_receipt_notes_purchase_order_uuid_fkey
      FOREIGN KEY (purchase_order_uuid)
      REFERENCES public.purchase_orders(uuid)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Storage bucket for receipt note attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stock-receipt-note-documents',
  'stock-receipt-note-documents',
  true,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view stock receipt note documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload stock receipt note documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update stock receipt note documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete stock receipt note documents" ON storage.objects;
END $$;

CREATE POLICY "Users can view stock receipt note documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'stock-receipt-note-documents' AND
    EXISTS (
      SELECT 1
      FROM public.stock_receipt_notes srn
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE srn.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[srn.corporation_uuid]
    )
  );

CREATE POLICY "Users can upload stock receipt note documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'stock-receipt-note-documents' AND
    EXISTS (
      SELECT 1
      FROM public.stock_receipt_notes srn
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE srn.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[srn.corporation_uuid]
    )
  );

CREATE POLICY "Users can update stock receipt note documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'stock-receipt-note-documents' AND
    EXISTS (
      SELECT 1
      FROM public.stock_receipt_notes srn
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE srn.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[srn.corporation_uuid]
    )
  );

CREATE POLICY "Users can delete stock receipt note documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'stock-receipt-note-documents' AND
    EXISTS (
      SELECT 1
      FROM public.stock_receipt_notes srn
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE srn.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[srn.corporation_uuid]
    )
  );

COMMIT;


