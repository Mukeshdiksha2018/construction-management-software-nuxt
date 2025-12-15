-- Migration 067: Purchase order invoice items list
-- Description: Table to store invoice line items for purchase order-based vendor invoices
-- This table stores the invoice quantities, unit prices, and totals that differ from the original PO values
-- Each item links to a vendor invoice, purchase order, and the original PO item

CREATE TABLE IF NOT EXISTS public.purchase_order_invoice_items_list (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    -- Foreign keys
    corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    project_uuid uuid REFERENCES public.projects(uuid) ON DELETE SET NULL,
    purchase_order_uuid uuid NOT NULL REFERENCES public.purchase_order_forms(uuid) ON DELETE CASCADE,
    vendor_invoice_uuid uuid NOT NULL REFERENCES public.vendor_invoices(uuid) ON DELETE CASCADE,
    po_item_uuid uuid REFERENCES public.purchase_order_items_list(uuid) ON DELETE SET NULL,

    -- Item ordering
    order_index integer DEFAULT 0,

    -- Cost code reference
    cost_code_uuid uuid REFERENCES public.cost_code_configurations(uuid) ON DELETE SET NULL,
    cost_code_label text,
    cost_code_number text,
    cost_code_name text,
    division_name text,

    -- Item type reference
    item_type_uuid uuid REFERENCES public.item_types(uuid) ON DELETE SET NULL,
    item_type_label text,

    -- Item reference
    item_uuid uuid,
    item_name text,
    description text,
    model_number text,

    -- Location reference
    location_uuid uuid,
    location_label text,

    -- Unit of measure
    unit_uuid uuid,
    unit_label text,

    -- Invoice-specific values (what the user entered for the invoice)
    invoice_quantity numeric(15,4),
    invoice_unit_price numeric(15,2),
    invoice_total numeric(15,2),

    -- Additional metadata
    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true
);

-- Indexes for efficient querying
-- Index on vendor_invoice_uuid for fetching all items for an invoice
CREATE INDEX IF NOT EXISTS idx_po_invoice_items_vendor_invoice_uuid
  ON public.purchase_order_invoice_items_list(vendor_invoice_uuid);

-- Index on purchase_order_uuid for fetching all invoice items for a PO
CREATE INDEX IF NOT EXISTS idx_po_invoice_items_purchase_order_uuid
  ON public.purchase_order_invoice_items_list(purchase_order_uuid);

-- Index on corporation_uuid for corporation-based queries
CREATE INDEX IF NOT EXISTS idx_po_invoice_items_corporation_uuid
  ON public.purchase_order_invoice_items_list(corporation_uuid);

-- Index on project_uuid for project-based queries
CREATE INDEX IF NOT EXISTS idx_po_invoice_items_project_uuid
  ON public.purchase_order_invoice_items_list(project_uuid);

-- Index on po_item_uuid for linking back to original PO item
CREATE INDEX IF NOT EXISTS idx_po_invoice_items_po_item_uuid
  ON public.purchase_order_invoice_items_list(po_item_uuid);

-- Index on cost_code_uuid for cost code-based queries
CREATE INDEX IF NOT EXISTS idx_po_invoice_items_cost_code_uuid
  ON public.purchase_order_invoice_items_list(cost_code_uuid);

-- Index on item_type_uuid for item type-based queries
CREATE INDEX IF NOT EXISTS idx_po_invoice_items_item_type_uuid
  ON public.purchase_order_invoice_items_list(item_type_uuid);

-- Index on item_uuid for item-based queries
CREATE INDEX IF NOT EXISTS idx_po_invoice_items_item_uuid
  ON public.purchase_order_invoice_items_list(item_uuid);

-- Composite index for common query pattern: invoice + PO
CREATE INDEX IF NOT EXISTS idx_po_invoice_items_vendor_invoice_po_uuid
  ON public.purchase_order_invoice_items_list(vendor_invoice_uuid, purchase_order_uuid);

-- Composite index for common query pattern: corporation + project
CREATE INDEX IF NOT EXISTS idx_po_invoice_items_corp_project_uuid
  ON public.purchase_order_invoice_items_list(corporation_uuid, project_uuid);

-- Index on order_index for maintaining item order
CREATE INDEX IF NOT EXISTS idx_po_invoice_items_order_index
  ON public.purchase_order_invoice_items_list(order_index);

-- Trigger to maintain updated_at
DROP TRIGGER IF EXISTS trg_po_invoice_items_updated_at
  ON public.purchase_order_invoice_items_list;

CREATE TRIGGER trg_po_invoice_items_updated_at
  BEFORE UPDATE ON public.purchase_order_invoice_items_list
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.purchase_order_invoice_items_list ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view purchase order invoice items for their corporations"
  ON public.purchase_order_invoice_items_list;

CREATE POLICY "Users can view purchase order invoice items for their corporations"
  ON public.purchase_order_invoice_items_list
  FOR SELECT USING (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert purchase order invoice items for their corporations"
  ON public.purchase_order_invoice_items_list;

CREATE POLICY "Users can insert purchase order invoice items for their corporations"
  ON public.purchase_order_invoice_items_list
  FOR INSERT WITH CHECK (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update purchase order invoice items for their corporations"
  ON public.purchase_order_invoice_items_list;

CREATE POLICY "Users can update purchase order invoice items for their corporations"
  ON public.purchase_order_invoice_items_list
  FOR UPDATE USING (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete purchase order invoice items for their corporations"
  ON public.purchase_order_invoice_items_list;

CREATE POLICY "Users can delete purchase order invoice items for their corporations"
  ON public.purchase_order_invoice_items_list
  FOR DELETE USING (
    corporation_uuid IN (
      SELECT unnest(corporation_access) 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Comments
COMMENT ON TABLE public.purchase_order_invoice_items_list IS 'Invoice line items for purchase order-based vendor invoices. Stores invoice quantities, unit prices, and totals that may differ from the original PO values.';
COMMENT ON COLUMN public.purchase_order_invoice_items_list.uuid IS 'Unique identifier';
COMMENT ON COLUMN public.purchase_order_invoice_items_list.vendor_invoice_uuid IS 'Reference to the parent vendor invoice';
COMMENT ON COLUMN public.purchase_order_invoice_items_list.purchase_order_uuid IS 'Reference to the purchase order this invoice item is based on';
COMMENT ON COLUMN public.purchase_order_invoice_items_list.po_item_uuid IS 'Reference to the original purchase order item (purchase_order_items_list.uuid)';
COMMENT ON COLUMN public.purchase_order_invoice_items_list.order_index IS 'Position of the item within the invoice';
COMMENT ON COLUMN public.purchase_order_invoice_items_list.invoice_quantity IS 'Quantity entered for the invoice (may differ from PO quantity)';
COMMENT ON COLUMN public.purchase_order_invoice_items_list.invoice_unit_price IS 'Unit price entered for the invoice (may differ from PO unit price)';
COMMENT ON COLUMN public.purchase_order_invoice_items_list.invoice_total IS 'Total amount for this invoice item (invoice_quantity * invoice_unit_price)';
COMMENT ON COLUMN public.purchase_order_invoice_items_list.metadata IS 'Additional metadata captured from the UI';

