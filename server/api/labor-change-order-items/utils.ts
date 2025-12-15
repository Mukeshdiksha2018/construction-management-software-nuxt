const toNumberOrNull = (value: any): number | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const sanitizeLaborChangeOrderItem = (item: any = {}, index: number) => {
  const metadata = item?.metadata || {};

  return {
    order_index: Number(item?.order_index ?? index),
    cost_code_uuid: item?.cost_code_uuid ?? null,
    cost_code_number: item?.cost_code_number ?? null,
    cost_code_name: item?.cost_code_name ?? null,
    cost_code_label:
      item?.cost_code_label ??
      (item?.cost_code_number && item?.cost_code_name
        ? `${item.cost_code_number} ${item.cost_code_name}`.trim()
        : item?.cost_code_number || item?.cost_code_name || null),
    division_name: item?.division_name ?? null,
    po_amount: toNumberOrNull(item?.po_amount) ?? 0,
    co_amount: toNumberOrNull(item?.co_amount) ?? null,
    metadata: typeof metadata === "object" && metadata !== null ? metadata : {},
    is_active: true,
  };
};

