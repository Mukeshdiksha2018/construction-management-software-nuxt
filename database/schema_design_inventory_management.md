# Inventory Management & Purchase Order Schema Design

## Current State Analysis

### ✅ What You Have:
- `purchase_order_forms` - PO header table
- `po_items` - PO line items (exists in code but no migration found)
- `estimate_line_items` - Estimate items with `material_items` (jsonb)
- `item_types` - Item master data
- `cost_code_preferred_items` - Preferred items per cost code
- `storage_locations` - Storage locations
- `vendors` - Vendor master

### ❌ What's Missing:
1. **Inventory/Stock Table** - Track quantities on hand
2. **Stock Receipts** - Track when items are received
3. **Stock Receipt Items** - Line items for receipts
4. **Change Orders** - Modify existing POs
5. **Stock Returns** - Return items to vendors
6. **Inventory Movements/Transactions** - Audit trail of all stock changes
7. **Link between Estimates and POs** - Track which estimate items became PO items

---

## Recommended Schema Design

### 1. Purchase Order Items Table (Migration Needed)

```sql
CREATE TABLE IF NOT EXISTS public.po_items (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Foreign keys
    purchase_order_uuid uuid NOT NULL REFERENCES public.purchase_order_forms(uuid) ON DELETE CASCADE,
    cost_code_uuid uuid REFERENCES public.cost_code_configurations(uuid) ON DELETE SET NULL,
    item_type_uuid uuid REFERENCES public.item_types(uuid) ON DELETE SET NULL,
    location_uuid uuid REFERENCES public.storage_locations(uuid) ON DELETE SET NULL,
    
    -- Optional: Link to estimate if PO was created from estimate
    estimate_line_item_uuid uuid REFERENCES public.estimate_line_items(uuid) ON DELETE SET NULL,
    
    -- Item details
    description text NOT NULL,
    model_number text,
    unit_price numeric(15, 2) DEFAULT 0.00 CHECK (unit_price >= 0),
    uom uuid REFERENCES public.uom(uuid) ON DELETE SET NULL,
    quantity numeric(15, 4) DEFAULT 0.00 CHECK (quantity >= 0),
    total numeric(15, 2) DEFAULT 0.00 CHECK (total >= 0),
    
    -- Status tracking
    quantity_ordered numeric(15, 4) DEFAULT 0.00, -- Original ordered quantity
    quantity_received numeric(15, 4) DEFAULT 0.00, -- Total received so far
    quantity_returned numeric(15, 4) DEFAULT 0.00, -- Total returned so far
    quantity_pending numeric(15, 4) GENERATED ALWAYS AS (quantity_ordered - quantity_received + quantity_returned) STORED,
    
    -- Additional fields
    approval_checks text,
    sequence_number integer, -- For ordering items in PO
    notes text,
    
    is_active boolean DEFAULT true
);

CREATE INDEX idx_po_items_po_uuid ON public.po_items(purchase_order_uuid);
CREATE INDEX idx_po_items_cost_code ON public.po_items(cost_code_uuid);
CREATE INDEX idx_po_items_item_type ON public.po_items(item_type_uuid);
CREATE INDEX idx_po_items_estimate_line ON public.po_items(estimate_line_item_uuid);
```

### 2. Inventory/Stock Table

```sql
CREATE TABLE IF NOT EXISTS public.inventory (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Foreign keys
    corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    item_type_uuid uuid NOT NULL REFERENCES public.item_types(uuid) ON DELETE CASCADE,
    location_uuid uuid NOT NULL REFERENCES public.storage_locations(uuid) ON DELETE CASCADE,
    project_uuid uuid REFERENCES public.projects(uuid) ON DELETE SET NULL, -- Optional: project-specific inventory
    
    -- Stock quantities
    quantity_on_hand numeric(15, 4) DEFAULT 0.00 CHECK (quantity_on_hand >= 0),
    quantity_reserved numeric(15, 4) DEFAULT 0.00 CHECK (quantity_reserved >= 0), -- Reserved for POs/projects
    quantity_available numeric(15, 4) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    
    -- Pricing (average cost or last cost)
    average_cost numeric(15, 2) DEFAULT 0.00,
    last_cost numeric(15, 2) DEFAULT 0.00,
    
    -- Reorder management
    reorder_point numeric(15, 4) DEFAULT 0.00,
    reorder_quantity numeric(15, 4) DEFAULT 0.00,
    max_quantity numeric(15, 4),
    
    -- Status
    is_active boolean DEFAULT true,
    
    -- Unique constraint: one inventory record per item+location+project combination
    UNIQUE(item_type_uuid, location_uuid, project_uuid)
);

CREATE INDEX idx_inventory_corporation ON public.inventory(corporation_uuid);
CREATE INDEX idx_inventory_item_type ON public.inventory(item_type_uuid);
CREATE INDEX idx_inventory_location ON public.inventory(location_uuid);
CREATE INDEX idx_inventory_project ON public.inventory(project_uuid);
```

### 3. Stock Receipts Table

```sql
CREATE TABLE IF NOT EXISTS public.stock_receipts (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Foreign keys
    corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    purchase_order_uuid uuid REFERENCES public.purchase_order_forms(uuid) ON DELETE SET NULL, -- Optional: receipt from PO
    project_uuid uuid REFERENCES public.projects(uuid) ON DELETE SET NULL,
    vendor_uuid uuid REFERENCES public.vendors(uuid) ON DELETE SET NULL,
    location_uuid uuid NOT NULL REFERENCES public.storage_locations(uuid) ON DELETE RESTRICT,
    received_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    
    -- Receipt details
    receipt_number text UNIQUE NOT NULL,
    receipt_date timestamptz NOT NULL DEFAULT now(),
    delivery_date timestamptz,
    invoice_number text,
    invoice_date timestamptz,
    
    -- Status
    status text DEFAULT 'Draft' CHECK (status IN ('Draft', 'Partial', 'Complete', 'Cancelled')),
    is_active boolean DEFAULT true,
    
    -- Totals
    total_quantity numeric(15, 4) DEFAULT 0.00,
    total_amount numeric(15, 2) DEFAULT 0.00,
    
    -- Notes
    notes text,
    attachments jsonb DEFAULT '[]'::jsonb
);

CREATE INDEX idx_stock_receipts_po ON public.stock_receipts(purchase_order_uuid);
CREATE INDEX idx_stock_receipts_corporation ON public.stock_receipts(corporation_uuid);
CREATE INDEX idx_stock_receipts_receipt_number ON public.stock_receipts(receipt_number);
```

### 4. Stock Receipt Items Table

```sql
CREATE TABLE IF NOT EXISTS public.stock_receipt_items (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Foreign keys
    stock_receipt_uuid uuid NOT NULL REFERENCES public.stock_receipts(uuid) ON DELETE CASCADE,
    po_item_uuid uuid REFERENCES public.po_items(uuid) ON DELETE SET NULL, -- Link to PO item if received from PO
    item_type_uuid uuid NOT NULL REFERENCES public.item_types(uuid) ON DELETE RESTRICT,
    cost_code_uuid uuid REFERENCES public.cost_code_configurations(uuid) ON DELETE SET NULL,
    
    -- Item details
    description text NOT NULL,
    model_number text,
    unit_price numeric(15, 2) DEFAULT 0.00 CHECK (unit_price >= 0),
    uom uuid REFERENCES public.uom(uuid) ON DELETE SET NULL,
    quantity_received numeric(15, 4) NOT NULL CHECK (quantity_received > 0),
    quantity_accepted numeric(15, 4) DEFAULT 0.00 CHECK (quantity_accepted >= 0), -- May differ if some items rejected
    quantity_rejected numeric(15, 4) DEFAULT 0.00 CHECK (quantity_rejected >= 0),
    total numeric(15, 2) DEFAULT 0.00 CHECK (total >= 0),
    
    -- Quality control
    condition_status text DEFAULT 'Good' CHECK (condition_status IN ('Good', 'Damaged', 'Defective', 'Wrong Item')),
    rejection_reason text,
    
    -- Inventory update flag
    inventory_updated boolean DEFAULT false, -- Track if inventory was updated from this receipt
    
    sequence_number integer,
    notes text
);

CREATE INDEX idx_receipt_items_receipt ON public.stock_receipt_items(stock_receipt_uuid);
CREATE INDEX idx_receipt_items_po_item ON public.stock_receipt_items(po_item_uuid);
CREATE INDEX idx_receipt_items_item_type ON public.stock_receipt_items(item_type_uuid);
```

### 5. Change Orders Table

```sql
CREATE TABLE IF NOT EXISTS public.change_orders (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Foreign keys
    corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    purchase_order_uuid uuid NOT NULL REFERENCES public.purchase_order_forms(uuid) ON DELETE CASCADE,
    project_uuid uuid REFERENCES public.projects(uuid) ON DELETE SET NULL,
    created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    approved_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    
    -- Change order details
    change_order_number text UNIQUE NOT NULL,
    change_order_date timestamptz NOT NULL DEFAULT now(),
    change_type text NOT NULL CHECK (change_type IN ('Add Items', 'Modify Items', 'Remove Items', 'Price Change', 'Quantity Change', 'Other')),
    reason text NOT NULL,
    description text,
    
    -- Status
    status text DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending', 'Approved', 'Rejected', 'Applied')),
    approved_at timestamptz,
    
    -- Impact
    original_po_total numeric(15, 2) DEFAULT 0.00,
    change_amount numeric(15, 2) DEFAULT 0.00, -- Positive for increases, negative for decreases
    new_po_total numeric(15, 2) DEFAULT 0.00,
    
    -- Notes
    notes text,
    attachments jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true
);

CREATE INDEX idx_change_orders_po ON public.change_orders(purchase_order_uuid);
CREATE INDEX idx_change_orders_corporation ON public.change_orders(corporation_uuid);
CREATE INDEX idx_change_orders_status ON public.change_orders(status);
```

### 6. Change Order Items Table

```sql
CREATE TABLE IF NOT EXISTS public.change_order_items (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Foreign keys
    change_order_uuid uuid NOT NULL REFERENCES public.change_orders(uuid) ON DELETE CASCADE,
    po_item_uuid uuid REFERENCES public.po_items(uuid) ON DELETE SET NULL, -- NULL for new items
    item_type_uuid uuid REFERENCES public.item_types(uuid) ON DELETE SET NULL,
    cost_code_uuid uuid REFERENCES public.cost_code_configurations(uuid) ON DELETE SET NULL,
    
    -- Change details
    change_action text NOT NULL CHECK (change_action IN ('Add', 'Modify', 'Remove', 'Price Change', 'Quantity Change')),
    description text NOT NULL,
    model_number text,
    
    -- Original values (for modifications)
    original_quantity numeric(15, 4),
    original_unit_price numeric(15, 2),
    original_total numeric(15, 2),
    
    -- New values
    new_quantity numeric(15, 4),
    new_unit_price numeric(15, 2),
    new_total numeric(15, 2),
    
    -- Change impact
    quantity_change numeric(15, 4) GENERATED ALWAYS AS (COALESCE(new_quantity, 0) - COALESCE(original_quantity, 0)) STORED,
    price_change numeric(15, 2) GENERATED ALWAYS AS (COALESCE(new_unit_price, 0) - COALESCE(original_unit_price, 0)) STORED,
    total_change numeric(15, 2) GENERATED ALWAYS AS (COALESCE(new_total, 0) - COALESCE(original_total, 0)) STORED,
    
    uom uuid REFERENCES public.uom(uuid) ON DELETE SET NULL,
    sequence_number integer,
    notes text
);

CREATE INDEX idx_change_order_items_co ON public.change_order_items(change_order_uuid);
CREATE INDEX idx_change_order_items_po_item ON public.change_order_items(po_item_uuid);
```

### 7. Stock Returns Table

```sql
CREATE TABLE IF NOT EXISTS public.stock_returns (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Foreign keys
    corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    purchase_order_uuid uuid REFERENCES public.purchase_order_forms(uuid) ON DELETE SET NULL,
    stock_receipt_uuid uuid REFERENCES public.stock_receipts(uuid) ON DELETE SET NULL,
    project_uuid uuid REFERENCES public.projects(uuid) ON DELETE SET NULL,
    vendor_uuid uuid NOT NULL REFERENCES public.vendors(uuid) ON DELETE RESTRICT,
    location_uuid uuid NOT NULL REFERENCES public.storage_locations(uuid) ON DELETE RESTRICT,
    returned_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    
    -- Return details
    return_number text UNIQUE NOT NULL,
    return_date timestamptz NOT NULL DEFAULT now(),
    return_reason text NOT NULL CHECK (return_reason IN ('Defective', 'Damaged', 'Wrong Item', 'Overstock', 'Quality Issue', 'Other')),
    return_type text NOT NULL CHECK (return_type IN ('Vendor Return', 'Internal Transfer', 'Disposal')),
    
    -- Status
    status text DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending', 'Approved', 'Processed', 'Cancelled')),
    approved_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    approved_at timestamptz,
    
    -- Totals
    total_quantity numeric(15, 4) DEFAULT 0.00,
    total_amount numeric(15, 2) DEFAULT 0.00,
    
    -- Credit/Refund tracking
    credit_memo_number text,
    credit_memo_date timestamptz,
    refund_amount numeric(15, 2) DEFAULT 0.00,
    
    -- Notes
    notes text,
    attachments jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true
);

CREATE INDEX idx_stock_returns_po ON public.stock_returns(purchase_order_uuid);
CREATE INDEX idx_stock_returns_receipt ON public.stock_returns(stock_receipt_uuid);
CREATE INDEX idx_stock_returns_corporation ON public.stock_returns(corporation_uuid);
CREATE INDEX idx_stock_returns_vendor ON public.stock_returns(vendor_uuid);
```

### 8. Stock Return Items Table

```sql
CREATE TABLE IF NOT EXISTS public.stock_return_items (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Foreign keys
    stock_return_uuid uuid NOT NULL REFERENCES public.stock_returns(uuid) ON DELETE CASCADE,
    stock_receipt_item_uuid uuid REFERENCES public.stock_receipt_items(uuid) ON DELETE SET NULL,
    po_item_uuid uuid REFERENCES public.po_items(uuid) ON DELETE SET NULL,
    item_type_uuid uuid NOT NULL REFERENCES public.item_types(uuid) ON DELETE RESTRICT,
    cost_code_uuid uuid REFERENCES public.cost_code_configurations(uuid) ON DELETE SET NULL,
    
    -- Item details
    description text NOT NULL,
    model_number text,
    unit_price numeric(15, 2) DEFAULT 0.00 CHECK (unit_price >= 0),
    uom uuid REFERENCES public.uom(uuid) ON DELETE SET NULL,
    quantity_returned numeric(15, 4) NOT NULL CHECK (quantity_returned > 0),
    total numeric(15, 2) DEFAULT 0.00 CHECK (total >= 0),
    
    -- Condition
    condition_status text DEFAULT 'Defective' CHECK (condition_status IN ('Defective', 'Damaged', 'Good', 'Used')),
    
    -- Inventory update flag
    inventory_updated boolean DEFAULT false,
    
    sequence_number integer,
    notes text
);

CREATE INDEX idx_return_items_return ON public.stock_return_items(stock_return_uuid);
CREATE INDEX idx_return_items_receipt_item ON public.stock_return_items(stock_receipt_item_uuid);
CREATE INDEX idx_return_items_po_item ON public.stock_return_items(po_item_uuid);
```

### 9. Inventory Movements/Transactions Table (Audit Trail)

```sql
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamptz DEFAULT now(),
    
    -- Foreign keys
    corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    inventory_uuid uuid NOT NULL REFERENCES public.inventory(uuid) ON DELETE CASCADE,
    item_type_uuid uuid NOT NULL REFERENCES public.item_types(uuid) ON DELETE RESTRICT,
    location_uuid uuid NOT NULL REFERENCES public.storage_locations(uuid) ON DELETE RESTRICT,
    
    -- Movement details
    movement_type text NOT NULL CHECK (movement_type IN (
        'Receipt',           -- Stock received
        'Return',            -- Stock returned to vendor
        'Adjustment',        -- Manual adjustment
        'Transfer',          -- Transfer between locations
        'Issue',             -- Issued to project
        'Consumption',       -- Used/consumed
        'Damage',            -- Damaged/lost
        'Sale',              -- Sold
        'Reservation',       -- Reserved for PO/project
        'Reservation Release' -- Reservation released
    )),
    movement_direction text NOT NULL CHECK (movement_direction IN ('In', 'Out')),
    quantity numeric(15, 4) NOT NULL,
    
    -- Reference documents
    reference_type text, -- 'PO', 'Receipt', 'Return', 'Change Order', 'Adjustment', etc.
    reference_uuid uuid, -- UUID of the related document
    reference_number text, -- Human-readable reference number
    
    -- Pricing
    unit_cost numeric(15, 2) DEFAULT 0.00,
    total_cost numeric(15, 2) DEFAULT 0.00,
    
    -- Before/After quantities
    quantity_before numeric(15, 4) NOT NULL,
    quantity_after numeric(15, 4) NOT NULL,
    
    -- User tracking
    created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    notes text
);

CREATE INDEX idx_inventory_movements_inventory ON public.inventory_movements(inventory_uuid);
CREATE INDEX idx_inventory_movements_item_type ON public.inventory_movements(item_type_uuid);
CREATE INDEX idx_inventory_movements_location ON public.inventory_movements(location_uuid);
CREATE INDEX idx_inventory_movements_reference ON public.inventory_movements(reference_type, reference_uuid);
CREATE INDEX idx_inventory_movements_created_at ON public.inventory_movements(created_at);
```

---

## Key Relationships & Workflows

### 1. **Estimate → Purchase Order**
- `po_items.estimate_line_item_uuid` links PO items to estimate items
- When creating PO from estimate, copy estimate items to PO items

### 2. **Purchase Order → Stock Receipt**
- `stock_receipts.purchase_order_uuid` links receipt to PO
- `stock_receipt_items.po_item_uuid` links receipt items to PO items
- Update `po_items.quantity_received` when items are received

### 3. **Stock Receipt → Inventory**
- When receipt is completed, create/update `inventory` records
- Create `inventory_movements` entry with type 'Receipt'
- Update `quantity_on_hand` in inventory

### 4. **Purchase Order → Change Order**
- `change_orders.purchase_order_uuid` links change order to PO
- `change_order_items.po_item_uuid` links to specific PO items being changed
- When change order is approved and applied, update PO items

### 5. **Stock Receipt → Stock Return**
- `stock_returns.stock_receipt_uuid` links return to original receipt
- `stock_return_items.stock_receipt_item_uuid` links return items to receipt items
- Update `po_items.quantity_returned` when items are returned
- Create inventory movement with type 'Return' (direction 'Out')

### 6. **Inventory Tracking**
- All inventory changes tracked in `inventory_movements`
- Provides complete audit trail
- Supports FIFO/LIFO costing methods
- Enables inventory valuation reports

---

## Benefits of This Design

1. **Flexible PO Creation**: 
   - From estimates (via `estimate_line_item_uuid`)
   - From inventory (check stock levels)
   - Custom (manual entry)

2. **Complete Traceability**:
   - Track items from estimate → PO → receipt → inventory → return
   - Full audit trail via `inventory_movements`

3. **Accurate Inventory**:
   - Real-time quantities with reserved quantities
   - Average cost tracking
   - Reorder point management

4. **Change Management**:
   - Change orders allow PO modifications
   - Track original vs. new values
   - Approval workflow

5. **Return Processing**:
   - Link returns to original receipts/POs
   - Track return reasons
   - Handle credit memos

6. **Multi-Location Support**:
   - Inventory per location
   - Transfers between locations
   - Location-specific stock levels

---

## Next Steps

1. Create migration files for all new tables
2. Add RLS policies for security
3. Create database triggers for:
   - Auto-updating `po_items.quantity_pending`
   - Auto-updating `inventory.quantity_available`
   - Auto-creating `inventory_movements` entries
4. Build API endpoints for each entity
5. Create UI components for:
   - Stock Receipts
   - Change Orders
   - Stock Returns
   - Inventory Management Dashboard

