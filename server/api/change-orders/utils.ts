import {
  buildFinancialBreakdown,
  sanitizeAttachments,
} from "@/server/api/purchase-order-forms/utils";

const toNumberOrNull = (value: any): number | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const sanitizeChangeOrderItem = (item: any = {}, index: number) => {
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

    quantity: toNumberOrNull(item?.co_quantity),
    unit_price: toNumberOrNull(item?.co_unit_price),
    co_quantity: toNumberOrNull(item?.co_quantity),
    co_unit_price: toNumberOrNull(item?.co_unit_price),
    co_total: toNumberOrNull(item?.co_total),
    total: toNumberOrNull(item?.total),

    // Map approval_checks (from frontend) to approval_checks_uuids (for DB)
    approval_checks_uuids: Array.isArray(item?.approval_checks) && item.approval_checks.length > 0
      ? item.approval_checks
      : (Array.isArray(item?.approval_checks_uuids) && item.approval_checks_uuids.length > 0
        ? item.approval_checks_uuids
        : []),

    metadata: typeof metadata === "object" && metadata !== null ? metadata : {},
    is_active: true,
  };
};

const safeNumber = (value: any): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const safeBoolean = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }
  return Boolean(value);
};

// Decorate a change order record with financial fields extracted from financial_breakdown
export const decorateChangeOrderRecord = <T extends Record<string, any>>(
  record: T
): T => {
  if (!record) return record;

  const breakdown =
    (record as any).financial_breakdown ??
    (record as any).financialBreakdown ??
    {};

  const charges =
    (breakdown as any).charges ??
    (breakdown as any).charges_breakdown ??
    {};
  const salesTaxes =
    (breakdown as any).sales_taxes ??
    (breakdown as any).salesTaxes ??
    (breakdown as any).taxes ??
    {};
  const totals =
    (breakdown as any).totals ??
    (breakdown as any).total_breakdown ??
    {};

  const freight = (charges as any).freight ?? {};
  const packing = (charges as any).packing ?? {};
  const custom = (charges as any).custom_duties ?? (charges as any).custom ?? {};
  const other = (charges as any).other ?? {};

  const salesTax1 =
    (salesTaxes as any).sales_tax_1 ?? (salesTaxes as any).salesTax1 ?? {};
  const salesTax2 =
    (salesTaxes as any).sales_tax_2 ?? (salesTaxes as any).salesTax2 ?? {};

  // Charges
  (record as any).freight_charges_percentage = safeNumber(
    (freight as any).percentage
  );
  (record as any).freight_charges_amount = safeNumber(
    (freight as any).amount
  );
  (record as any).freight_charges_taxable = safeBoolean(
    (freight as any).taxable
  );

  (record as any).packing_charges_percentage = safeNumber(
    (packing as any).percentage
  );
  (record as any).packing_charges_amount = safeNumber(
    (packing as any).amount
  );
  (record as any).packing_charges_taxable = safeBoolean(
    (packing as any).taxable
  );

  (record as any).custom_duties_charges_percentage = safeNumber(
    (custom as any).percentage
  );
  (record as any).custom_duties_charges_amount = safeNumber(
    (custom as any).amount
  );
  (record as any).custom_duties_charges_taxable = safeBoolean(
    (custom as any).taxable
  );

  (record as any).other_charges_percentage = safeNumber(
    (other as any).percentage
  );
  (record as any).other_charges_amount = safeNumber(
    (other as any).amount
  );
  (record as any).other_charges_taxable = safeBoolean(
    (other as any).taxable
  );

  // Sales taxes
  (record as any).sales_tax_1_percentage = safeNumber(
    (salesTax1 as any).percentage
  );
  (record as any).sales_tax_1_amount = safeNumber(
    (salesTax1 as any).amount
  );
  (record as any).sales_tax_2_percentage = safeNumber(
    (salesTax2 as any).percentage
  );
  (record as any).sales_tax_2_amount = safeNumber(
    (salesTax2 as any).amount
  );

  // Extract totals from financial breakdown
  const totalsFromBreakdown = totals || {};
  (record as any).item_total = safeNumber(totalsFromBreakdown.item_total);
  (record as any).charges_total = safeNumber(totalsFromBreakdown.charges_total);
  (record as any).tax_total = safeNumber(totalsFromBreakdown.tax_total);
  // For total_co_amount, prefer total_co_amount from totals, fallback to total_po_amount
  (record as any).total_co_amount = safeNumber(
    totalsFromBreakdown.total_co_amount || totalsFromBreakdown.total_po_amount
  );

  if (!Array.isArray((record as any).attachments)) {
    (record as any).attachments = [];
  }

  if (!Array.isArray((record as any).removed_co_items)) {
    (record as any).removed_co_items = [];
  }

  (record as any).financial_breakdown = breakdown;

  return record;
};

// Build financial breakdown for labor change orders based on labor items total
export const buildLaborCOFinancialBreakdown = (laborItemsTotal: number) => {
  const emptyCharges = () => ({
    freight: { percentage: 0, amount: null, taxable: false },
    packing: { percentage: 0, amount: null, taxable: false },
    custom_duties: { percentage: 0, amount: null, taxable: false },
    other: { percentage: 0, amount: null, taxable: false },
  });

  const emptySalesTaxes = () => ({
    sales_tax_1: { percentage: 0, amount: null },
    sales_tax_2: { percentage: 0, amount: null },
  });

  return {
    charges: emptyCharges(),
    sales_taxes: emptySalesTaxes(),
    totals: {
      item_total: laborItemsTotal || 0,
      charges_total: null,
      tax_total: null,
      total_co_amount: laborItemsTotal || 0,
      total_po_amount: laborItemsTotal || 0, // Keep for compatibility
    },
  };
};

export { buildFinancialBreakdown, sanitizeAttachments };


