-- Migration 050: Create direct_vendor_invoice_line_items table
-- Description: Table to store line items for direct vendor invoices (similar to purchase_order_items_list)
-- This table stores individual line items separately from the main vendor_invoices table

CREATE TABLE IF NOT EXISTS public.direct_vendor_invoice_line_items (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Foreign keys
    corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    project_uuid uuid REFERENCES public.projects(uuid) ON DELETE SET NULL,
    vendor_invoice_uuid uuid NOT NULL REFERENCES public.vendor_invoices(uuid) ON DELETE CASCADE,

    -- Item ordering
    order_index integer DEFAULT 0,

    -- Cost code information
    cost_code_uuid uuid,
    cost_code_label text,
    cost_code_number text,
    cost_code_name text,
    division_name text,

    -- Sequence and item information
    sequence_uuid uuid,
    item_uuid uuid,
    item_name text,
    description text,

    -- Pricing and quantity
    unit_price numeric(15,2),
    quantity numeric(15,2),
    total numeric(15,2),
    uom text,
    unit_label text,
    unit_uuid uuid,

    -- Additional metadata
    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dvi_line_items_vendor_invoice_uuid
  ON public.direct_vendor_invoice_line_items(vendor_invoice_uuid);

CREATE INDEX IF NOT EXISTS idx_dvi_line_items_corporation_uuid
  ON public.direct_vendor_invoice_line_items(corporation_uuid);

CREATE INDEX IF NOT EXISTS idx_dvi_line_items_project_uuid
  ON public.direct_vendor_invoice_line_items(project_uuid);

CREATE INDEX IF NOT EXISTS idx_dvi_line_items_cost_code_uuid
  ON public.direct_vendor_invoice_line_items(cost_code_uuid);

CREATE INDEX IF NOT EXISTS idx_dvi_line_items_item_uuid
  ON public.direct_vendor_invoice_line_items(item_uuid);

CREATE INDEX IF NOT EXISTS idx_dvi_line_items_order_index
  ON public.direct_vendor_invoice_line_items(order_index);

-- Trigger to maintain updated_at
DROP TRIGGER IF EXISTS trg_dvi_line_items_updated_at
  ON public.direct_vendor_invoice_line_items;

CREATE TRIGGER trg_dvi_line_items_updated_at
  BEFORE UPDATE ON public.direct_vendor_invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.direct_vendor_invoice_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view direct vendor invoice line items for their corporations"
  ON public.direct_vendor_invoice_line_items;

CREATE POLICY "Users can view direct vendor invoice line items for their corporations"
  ON public.direct_vendor_invoice_line_items
  FOR SELECT USING (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert direct vendor invoice line items for their corporations"
  ON public.direct_vendor_invoice_line_items;

CREATE POLICY "Users can insert direct vendor invoice line items for their corporations"
  ON public.direct_vendor_invoice_line_items
  FOR INSERT WITH CHECK (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update direct vendor invoice line items for their corporations"
  ON public.direct_vendor_invoice_line_items;

CREATE POLICY "Users can update direct vendor invoice line items for their corporations"
  ON public.direct_vendor_invoice_line_items
  FOR UPDATE USING (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete direct vendor invoice line items for their corporations"
  ON public.direct_vendor_invoice_line_items;

CREATE POLICY "Users can delete direct vendor invoice line items for their corporations"
  ON public.direct_vendor_invoice_line_items
  FOR DELETE USING (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Comments
COMMENT ON TABLE public.direct_vendor_invoice_line_items IS 'Line items associated with direct vendor invoices';
COMMENT ON COLUMN public.direct_vendor_invoice_line_items.uuid IS 'Unique identifier';
COMMENT ON COLUMN public.direct_vendor_invoice_line_items.vendor_invoice_uuid IS 'Reference to the parent vendor invoice';
COMMENT ON COLUMN public.direct_vendor_invoice_line_items.order_index IS 'Position of the item within the invoice';
COMMENT ON COLUMN public.direct_vendor_invoice_line_items.cost_code_uuid IS 'Reference to the cost code';
COMMENT ON COLUMN public.direct_vendor_invoice_line_items.sequence_uuid IS 'Reference to the sequence/item sequence';
COMMENT ON COLUMN public.direct_vendor_invoice_line_items.item_uuid IS 'Reference to the item';
COMMENT ON COLUMN public.direct_vendor_invoice_line_items.metadata IS 'Additional metadata captured from the UI';

