const toNumberOrNull = (value: any): number | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const sanitizePurchaseOrderItem = (item: any = {}, index: number) => {
  const metadata =
    item?.metadata ||
    item?.display_metadata ||
    item?.displayMetadata ||
    {};

  return {
    order_index: Number(item?.order_index ?? index),
    source: item?.source ?? null,

    cost_code_uuid: item?.cost_code_uuid ?? metadata?.cost_code_uuid ?? null,
    cost_code_label:
      item?.cost_code_label ??
      metadata?.cost_code_label ??
      metadata?.cost_code ??
      null,
    cost_code_number:
      item?.cost_code_number ?? metadata?.cost_code_number ?? null,
    cost_code_name: item?.cost_code_name ?? metadata?.cost_code_name ?? null,
    division_name: item?.division_name ?? metadata?.division_name ?? null,

    item_type_uuid: item?.item_type_uuid ?? null,
    item_type_label: item?.item_type_label ?? metadata?.item_type_label ?? null,

    item_uuid: item?.item_uuid ?? null,
    item_name:
      item?.name ??
      item?.item_name ??
      metadata?.item_name ??
      item?.description ??
      "",
    description: item?.description ?? "",
    model_number: item?.model_number ?? metadata?.model_number ?? "",

    location_uuid: item?.location_uuid ?? null,
    location_label: item?.location ?? metadata?.location_display ?? null,

    unit_uuid: item?.unit_uuid ?? item?.uom_uuid ?? metadata?.unit_uuid ?? null,
    unit_label:
      item?.unit_label ??
      item?.uom_label ??
      metadata?.unit_label ??
      metadata?.unit ??
      null,

    quantity: toNumberOrNull(item?.po_quantity),
    unit_price: toNumberOrNull(item?.po_unit_price),
    po_quantity: toNumberOrNull(item?.po_quantity),
    po_unit_price: toNumberOrNull(item?.po_unit_price),
    po_total: toNumberOrNull(item?.po_total),
    total: toNumberOrNull(item?.total),

    approval_checks_uuids: Array.isArray(item?.approval_checks) && item.approval_checks.length > 0
      ? item.approval_checks
      : (item?.approval_checks_uuids && Array.isArray(item.approval_checks_uuids) && item.approval_checks_uuids.length > 0
        ? item.approval_checks_uuids
        : []),

    metadata: typeof metadata === "object" && metadata !== null ? metadata : {},
    is_active: true,
  };
};


