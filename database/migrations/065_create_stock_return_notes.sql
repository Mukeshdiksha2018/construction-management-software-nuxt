-- Migration 065: Create stock_return_notes table
-- This table stores stock return notes for items returned from purchase orders or change orders

BEGIN;

CREATE TABLE IF NOT EXISTS public.stock_return_notes (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    corporation_uuid UUID NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    project_uuid UUID REFERENCES public.projects(uuid) ON DELETE SET NULL,
    purchase_order_uuid UUID,
    change_order_uuid UUID,
    location_uuid UUID REFERENCES public.location(uuid) ON DELETE SET NULL,

    entry_date TIMESTAMPTZ,
    return_number TEXT NOT NULL,
    reference_number TEXT,
    returned_by UUID REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    notes TEXT,
    status TEXT DEFAULT 'Waiting',
    total_return_amount NUMERIC,
    return_type TEXT NOT NULL DEFAULT 'purchase_order' CHECK (return_type IN ('purchase_order', 'change_order')),
    attachments JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_sretn_uuid ON public.stock_return_notes(uuid);
CREATE INDEX IF NOT EXISTS idx_sretn_corporation_uuid ON public.stock_return_notes(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_sretn_project_uuid ON public.stock_return_notes(project_uuid);
CREATE INDEX IF NOT EXISTS idx_sretn_purchase_order_uuid ON public.stock_return_notes(purchase_order_uuid);
CREATE INDEX IF NOT EXISTS idx_sretn_change_order_uuid ON public.stock_return_notes(change_order_uuid);
CREATE INDEX IF NOT EXISTS idx_sretn_status ON public.stock_return_notes(status);
CREATE INDEX IF NOT EXISTS idx_sretn_return_type ON public.stock_return_notes(return_type);
CREATE INDEX IF NOT EXISTS idx_sretn_created_at ON public.stock_return_notes(created_at);

DROP TRIGGER IF EXISTS trg_sretn_updated_at ON public.stock_return_notes;
CREATE TRIGGER trg_sretn_updated_at
  BEFORE UPDATE ON public.stock_return_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.stock_return_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view stock_return_notes for their corporations" ON public.stock_return_notes;
  DROP POLICY IF EXISTS "Users can insert stock_return_notes for their corporations" ON public.stock_return_notes;
  DROP POLICY IF EXISTS "Users can update stock_return_notes for their corporations" ON public.stock_return_notes;
  DROP POLICY IF EXISTS "Users can delete stock_return_notes for their corporations" ON public.stock_return_notes;
END $$;

CREATE POLICY "Users can view stock_return_notes for their corporations"
  ON public.stock_return_notes
  FOR SELECT USING (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can insert stock_return_notes for their corporations"
  ON public.stock_return_notes
  FOR INSERT WITH CHECK (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can update stock_return_notes for their corporations"
  ON public.stock_return_notes
  FOR UPDATE USING (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can delete stock_return_notes for their corporations"
  ON public.stock_return_notes
  FOR DELETE USING (
    (SELECT corporation_access FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

-- Add foreign key constraints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'purchase_order_forms'
  ) THEN
    ALTER TABLE public.stock_return_notes
      ADD CONSTRAINT stock_return_notes_purchase_order_uuid_fkey
      FOREIGN KEY (purchase_order_uuid)
      REFERENCES public.purchase_order_forms(uuid)
      ON DELETE SET NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'change_orders'
  ) THEN
    ALTER TABLE public.stock_return_notes
      ADD CONSTRAINT stock_return_notes_change_order_uuid_fkey
      FOREIGN KEY (change_order_uuid)
      REFERENCES public.change_orders(uuid)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Add constraint to ensure data integrity
-- Only one of purchase_order_uuid or change_order_uuid should be set based on return_type
ALTER TABLE public.stock_return_notes
  ADD CONSTRAINT stock_return_notes_source_order_check
  CHECK (
    (return_type = 'purchase_order' AND purchase_order_uuid IS NOT NULL AND change_order_uuid IS NULL) OR
    (return_type = 'change_order' AND change_order_uuid IS NOT NULL AND purchase_order_uuid IS NULL) OR
    (purchase_order_uuid IS NULL AND change_order_uuid IS NULL)
  );

-- Storage bucket for return note attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stock-return-note-documents',
  'stock-return-note-documents',
  true,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view stock return note documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload stock return note documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update stock return note documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete stock return note documents" ON storage.objects;
END $$;

CREATE POLICY "Users can view stock return note documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'stock-return-note-documents' AND
    EXISTS (
      SELECT 1
      FROM public.stock_return_notes sretn
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE sretn.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[sretn.corporation_uuid]
    )
  );

CREATE POLICY "Users can upload stock return note documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'stock-return-note-documents' AND
    EXISTS (
      SELECT 1
      FROM public.stock_return_notes sretn
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE sretn.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[sretn.corporation_uuid]
    )
  );

CREATE POLICY "Users can update stock return note documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'stock-return-note-documents' AND
    EXISTS (
      SELECT 1
      FROM public.stock_return_notes sretn
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE sretn.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[sretn.corporation_uuid]
    )
  );

CREATE POLICY "Users can delete stock return note documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'stock-return-note-documents' AND
    EXISTS (
      SELECT 1
      FROM public.stock_return_notes sretn
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE sretn.uuid::text = (storage.foldername(name))[2]
        AND up.corporation_access @> ARRAY[sretn.corporation_uuid]
    )
  );

COMMENT ON TABLE public.stock_return_notes IS 'Stock return records linked to purchase orders or change orders';
COMMENT ON COLUMN public.stock_return_notes.uuid IS 'Unique identifier for the return note';
COMMENT ON COLUMN public.stock_return_notes.corporation_uuid IS 'Owning corporation (properties.uuid)';
COMMENT ON COLUMN public.stock_return_notes.project_uuid IS 'Associated project (projects.uuid)';
COMMENT ON COLUMN public.stock_return_notes.purchase_order_uuid IS 'Linked purchase order (purchase_order_forms.uuid) - used when return_type is purchase_order';
COMMENT ON COLUMN public.stock_return_notes.change_order_uuid IS 'Linked change order (change_orders.uuid) - used when return_type is change_order';
COMMENT ON COLUMN public.stock_return_notes.location_uuid IS 'Return location (location.uuid)';
COMMENT ON COLUMN public.stock_return_notes.entry_date IS 'Entry date (UTC)';
COMMENT ON COLUMN public.stock_return_notes.return_number IS 'Generated return number (e.g., RTN-1, RTN-2)';
COMMENT ON COLUMN public.stock_return_notes.reference_number IS 'Optional reference/invoice number';
COMMENT ON COLUMN public.stock_return_notes.returned_by IS 'User ID from user_profiles who returned the goods';
COMMENT ON COLUMN public.stock_return_notes.status IS 'Waiting | Returned';
COMMENT ON COLUMN public.stock_return_notes.return_type IS 'purchase_order | change_order';
COMMENT ON COLUMN public.stock_return_notes.attachments IS 'JSON array of attachment metadata stored in stock-return-note-documents bucket';
COMMENT ON COLUMN public.stock_return_notes.metadata IS 'Additional metadata for integrations or audit context';

COMMIT;

