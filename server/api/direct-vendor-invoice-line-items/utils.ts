const toNumberOrNull = (value: any): number | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const sanitizeDirectVendorInvoiceLineItem = (item: any = {}, index: number) => {
  const metadata = item?.metadata || {};

  return {
    order_index: Number(item?.order_index ?? index),
    
    cost_code_uuid: item?.cost_code_uuid && item.cost_code_uuid !== "" ? item.cost_code_uuid : null,
    cost_code_label: item?.cost_code_label ?? metadata?.cost_code_label ?? null,
    cost_code_number: item?.cost_code_number ?? metadata?.cost_code_number ?? null,
    cost_code_name: item?.cost_code_name ?? metadata?.cost_code_name ?? null,
    division_name: item?.division_name ?? metadata?.division_name ?? null,

    sequence_uuid: item?.sequence_uuid ?? null,
    item_uuid: item?.item_uuid ?? null,
    item_name: item?.item_name ?? metadata?.item_name ?? item?.description ?? "",
    description: item?.description ?? "",

    unit_price: toNumberOrNull(item?.unit_price),
    quantity: toNumberOrNull(item?.quantity),
    total: toNumberOrNull(item?.total),
    
    unit_uuid: item?.unit_uuid ?? item?.uom_uuid ?? metadata?.unit_uuid ?? null,
    unit_label: item?.unit_label ?? item?.uom ?? item?.uom_label ?? metadata?.unit_label ?? metadata?.unit ?? null,
    uom: item?.uom ?? item?.unit_label ?? metadata?.uom ?? null,

    metadata: typeof metadata === "object" && metadata !== null ? metadata : {},
    is_active: true,
  };
};

