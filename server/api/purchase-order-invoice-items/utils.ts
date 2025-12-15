const toNumberOrNull = (value: any): number | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const sanitizePurchaseOrderInvoiceItem = (item: any = {}, index: number) => {
  const metadata = item?.metadata || {};

  return {
    order_index: Number(item?.order_index ?? index),
    
    // Reference to original PO item
    po_item_uuid: item?.po_item_uuid && item.po_item_uuid !== "" ? item.po_item_uuid : null,
    
    // Cost code information
    cost_code_uuid: item?.cost_code_uuid && item.cost_code_uuid !== "" ? item.cost_code_uuid : null,
    cost_code_label: item?.cost_code_label ?? metadata?.cost_code_label ?? null,
    cost_code_number: item?.cost_code_number ?? metadata?.cost_code_number ?? null,
    cost_code_name: item?.cost_code_name ?? metadata?.cost_code_name ?? null,
    division_name: item?.division_name ?? metadata?.division_name ?? null,

    // Item type information
    item_type_uuid: item?.item_type_uuid && item.item_type_uuid !== "" ? item.item_type_uuid : null,
    item_type_label: item?.item_type_label ?? metadata?.item_type_label ?? null,

    // Item information
    item_uuid: item?.item_uuid && item.item_uuid !== "" ? item.item_uuid : null,
    item_name: item?.item_name ?? metadata?.item_name ?? item?.description ?? "",
    description: item?.description ?? "",
    model_number: item?.model_number ?? metadata?.model_number ?? "",

    // Location information
    location_uuid: item?.location_uuid && item.location_uuid !== "" ? item.location_uuid : null,
    location_label: item?.location ?? item?.location_label ?? metadata?.location_label ?? null,

    // Unit of measure
    unit_uuid: item?.unit_uuid ?? item?.uom_uuid ?? metadata?.unit_uuid ?? null,
    unit_label: item?.unit_label ?? item?.uom_label ?? metadata?.unit_label ?? metadata?.unit ?? null,

    // Invoice-specific values (what the user entered for the invoice)
    invoice_quantity: toNumberOrNull(item?.invoice_quantity),
    invoice_unit_price: toNumberOrNull(item?.invoice_unit_price),
    invoice_total: toNumberOrNull(item?.invoice_total),

    metadata: typeof metadata === "object" && metadata !== null ? metadata : {},
    is_active: true,
  };
};

