const financialKeys = [
  "item_total",
  "charges_total",
  "tax_total",
  "total_po_amount",
  "freight_charges_percentage",
  "freight_charges_amount",
  "freight_charges_taxable",
  "packing_charges_percentage",
  "packing_charges_amount",
  "packing_charges_taxable",
  "custom_duties_percentage",
  "custom_duties_amount",
  "custom_duties_taxable",
  "custom_duties_charges_percentage",
  "custom_duties_charges_amount",
  "custom_duties_charges_taxable",
  "other_charges_percentage",
  "other_charges_amount",
  "other_charges_taxable",
  "sales_tax_1_percentage",
  "sales_tax_1_amount",
  "sales_tax_2_percentage",
  "sales_tax_2_amount",
  "sales_tax1_percentage",
  "sales_tax1_amount",
  "sales_tax2_percentage",
  "sales_tax2_amount",
  "financial_breakdown",
];

const toNumericOrNull = (value: any): number | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toBoolean = (value: any): boolean => {
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

const emptyCharges = () => ({
  freight: { percentage: null, amount: null, taxable: false },
  packing: { percentage: null, amount: null, taxable: false },
  custom_duties: { percentage: null, amount: null, taxable: false },
  other: { percentage: null, amount: null, taxable: false },
});

const emptySalesTaxes = () => ({
  sales_tax_1: { percentage: null, amount: null },
  sales_tax_2: { percentage: null, amount: null },
});

const emptyTotals = () => ({
  item_total: null,
  charges_total: null,
  tax_total: null,
  total_po_amount: null,
});

export const hasFinancialPayload = (payload: Record<string, any>): boolean =>
  financialKeys.some((key) => Object.prototype.hasOwnProperty.call(payload ?? {}, key));

export const buildFinancialBreakdown = (payload: any) => {
  if (payload && typeof payload.financial_breakdown === "object" && payload.financial_breakdown !== null) {
    return payload.financial_breakdown;
  }

  const charges = emptyCharges();
  charges.freight.percentage = toNumericOrNull(payload?.freight_charges_percentage);
  charges.freight.amount = toNumericOrNull(payload?.freight_charges_amount);
  charges.freight.taxable = toBoolean(payload?.freight_charges_taxable);

  charges.packing.percentage = toNumericOrNull(payload?.packing_charges_percentage);
  charges.packing.amount = toNumericOrNull(payload?.packing_charges_amount);
  charges.packing.taxable = toBoolean(payload?.packing_charges_taxable);

  const customPercentage =
    payload?.custom_duties_percentage ?? payload?.custom_duties_charges_percentage;
  const customAmount =
    payload?.custom_duties_amount ?? payload?.custom_duties_charges_amount;
  const customTaxable =
    payload?.custom_duties_taxable ?? payload?.custom_duties_charges_taxable;

  charges.custom_duties.percentage = toNumericOrNull(customPercentage);
  charges.custom_duties.amount = toNumericOrNull(customAmount);
  charges.custom_duties.taxable = toBoolean(customTaxable);

  charges.other.percentage = toNumericOrNull(payload?.other_charges_percentage);
  charges.other.amount = toNumericOrNull(payload?.other_charges_amount);
  charges.other.taxable = toBoolean(payload?.other_charges_taxable);

  const salesTaxes = emptySalesTaxes();
  const salesTax1Percentage =
    payload?.sales_tax_1_percentage ?? payload?.sales_tax1_percentage;
  const salesTax1Amount =
    payload?.sales_tax_1_amount ?? payload?.sales_tax1_amount;
  const salesTax2Percentage =
    payload?.sales_tax_2_percentage ?? payload?.sales_tax2_percentage;
  const salesTax2Amount =
    payload?.sales_tax_2_amount ?? payload?.sales_tax2_amount;

  salesTaxes.sales_tax_1.percentage = toNumericOrNull(salesTax1Percentage);
  salesTaxes.sales_tax_1.amount = toNumericOrNull(salesTax1Amount);
  salesTaxes.sales_tax_2.percentage = toNumericOrNull(salesTax2Percentage);
  salesTaxes.sales_tax_2.amount = toNumericOrNull(salesTax2Amount);

  const totals = emptyTotals();
  totals.item_total = toNumericOrNull(payload?.item_total);
  totals.charges_total = toNumericOrNull(payload?.charges_total);
  totals.tax_total = toNumericOrNull(payload?.tax_total);
  totals.total_po_amount = toNumericOrNull(payload?.total_po_amount);

  return {
    charges,
    sales_taxes: salesTaxes,
    totals,
  };
};

export const sanitizeAttachments = (attachments: any): any[] => {
  if (!Array.isArray(attachments)) {
    return [];
  }
  return attachments.map((attachment) => {
    if (attachment && typeof attachment === "object") {
      const { file, fileData, ...rest } = attachment as Record<string, any>;
      return rest;
    }
    return attachment;
  });
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

const safeBoolean = (value: any): boolean => toBoolean(value);

export const decoratePurchaseOrderRecord = <T extends Record<string, any>>(record: T): T => {
  if (!record) return record;

  const breakdown =
    (record.financial_breakdown ?? record.financialBreakdown) || {};
  const charges = breakdown.charges ?? breakdown.charges_breakdown ?? {};
  const salesTaxes =
    breakdown.sales_taxes ?? breakdown.salesTaxes ?? breakdown.taxes ?? {};
  const totals = breakdown.totals ?? breakdown.total_breakdown ?? {};

  const freight = charges.freight ?? {};
  const packing = charges.packing ?? {};
  const custom = charges.custom_duties ?? charges.custom ?? {};
  const other = charges.other ?? {};

  const salesTax1 = salesTaxes.sales_tax_1 ?? salesTaxes.salesTax1 ?? {};
  const salesTax2 = salesTaxes.sales_tax_2 ?? salesTaxes.salesTax2 ?? {};

  record.freight_charges_percentage = safeNumber(freight.percentage);
  record.freight_charges_amount = safeNumber(freight.amount);
  record.freight_charges_taxable = safeBoolean(freight.taxable);

  record.packing_charges_percentage = safeNumber(packing.percentage);
  record.packing_charges_amount = safeNumber(packing.amount);
  record.packing_charges_taxable = safeBoolean(packing.taxable);

  record.custom_duties_percentage = safeNumber(custom.percentage);
  record.custom_duties_amount = safeNumber(custom.amount);
  record.custom_duties_taxable = safeBoolean(custom.taxable);
  record.custom_duties_charges_percentage = record.custom_duties_percentage;
  record.custom_duties_charges_amount = record.custom_duties_amount;
  record.custom_duties_charges_taxable = record.custom_duties_taxable;

  record.other_charges_percentage = safeNumber(other.percentage);
  record.other_charges_amount = safeNumber(other.amount);
  record.other_charges_taxable = safeBoolean(other.taxable);

  record.sales_tax_1_percentage = safeNumber(salesTax1.percentage);
  record.sales_tax_1_amount = safeNumber(salesTax1.amount);
  record.sales_tax_2_percentage = safeNumber(salesTax2.percentage);
  record.sales_tax_2_amount = safeNumber(salesTax2.amount);

  // For computed totals, NEVER use stored values
  // These should ALWAYS be calculated on the frontend to ensure reactivity:
  // - item_total: calculated from sum of po_items
  // - charges_total: calculated from charge amounts
  // - tax_total: calculated from sales tax amounts
  // - total_po_amount: calculated from item_total + charges_total + tax_total
  record.item_total = null;
  record.charges_total = null;
  record.tax_total = null;
  record.total_po_amount = null;

  if (!Array.isArray(record.attachments)) {
    record.attachments = [];
  }

  if (!Array.isArray((record as any).removed_po_items)) {
    (record as any).removed_po_items = [];
  }

  return record;
};


