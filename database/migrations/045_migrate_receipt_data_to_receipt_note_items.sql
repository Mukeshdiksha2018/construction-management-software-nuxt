-- Migration 045: Migrate existing receipt data to receipt_note_items table
-- This migration preserves existing receipt note data before schema changes

BEGIN;

-- Migrate purchase order items receipt data
INSERT INTO public.receipt_note_items (
    receipt_note_uuid,
    corporation_uuid,
    project_uuid,
    purchase_order_uuid,
    change_order_uuid,
    item_type,
    item_uuid,
    cost_code_uuid,
    received_quantity,
    received_total,
    grn_total,
    grn_total_with_charges_taxes,
    created_at,
    updated_at
)
SELECT DISTINCT
    poi.receipt_note_uuid,
    po.corporation_uuid,
    po.project_uuid,
    po.uuid AS purchase_order_uuid,
    NULL::uuid AS change_order_uuid,
    'purchase_order' AS item_type,
    poi.uuid AS item_uuid,
    poi.cost_code_uuid,
    poi.received_quantity,
    poi.received_total,
    poi.grn_total,
    poi.grn_total_with_charges_taxes,
    COALESCE(srn.created_at, now()) AS created_at,
    COALESCE(srn.updated_at, now()) AS updated_at
FROM public.purchase_order_items_list poi
JOIN public.purchase_order_forms po ON poi.purchase_order_uuid = po.uuid
LEFT JOIN public.stock_receipt_notes srn ON poi.receipt_note_uuid = srn.uuid
WHERE poi.receipt_note_uuid IS NOT NULL
  AND (poi.received_quantity IS NOT NULL OR poi.received_total IS NOT NULL OR poi.grn_total IS NOT NULL)
ON CONFLICT DO NOTHING;

-- Migrate change order items receipt data
INSERT INTO public.receipt_note_items (
    receipt_note_uuid,
    corporation_uuid,
    project_uuid,
    purchase_order_uuid,
    change_order_uuid,
    item_type,
    item_uuid,
    cost_code_uuid,
    received_quantity,
    received_total,
    grn_total,
    grn_total_with_charges_taxes,
    created_at,
    updated_at
)
SELECT DISTINCT
    coi.receipt_note_uuid,
    co.corporation_uuid,
    co.project_uuid,
    NULL::uuid AS purchase_order_uuid,
    co.uuid AS change_order_uuid,
    'change_order' AS item_type,
    coi.uuid AS item_uuid,
    coi.cost_code_uuid,
    coi.received_quantity,
    coi.received_total,
    coi.grn_total,
    coi.grn_total_with_charges_taxes,
    COALESCE(srn.created_at, now()) AS created_at,
    COALESCE(srn.updated_at, now()) AS updated_at
FROM public.change_order_items_list coi
JOIN public.change_orders co ON coi.change_order_uuid = co.uuid
LEFT JOIN public.stock_receipt_notes srn ON coi.receipt_note_uuid = srn.uuid
WHERE coi.receipt_note_uuid IS NOT NULL
  AND (coi.received_quantity IS NOT NULL OR coi.received_total IS NOT NULL OR coi.grn_total IS NOT NULL)
ON CONFLICT DO NOTHING;

COMMIT;

