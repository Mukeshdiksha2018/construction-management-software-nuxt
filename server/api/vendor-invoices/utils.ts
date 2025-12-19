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
  total_invoice_amount: null, // Renamed from amount to match the field name
});

export const buildFinancialBreakdown = (payload: any) => {
  // If financial_breakdown is already provided as an object, use it
  // Make sure it has the proper structure with totals
  if (payload && typeof payload.financial_breakdown === "object" && payload.financial_breakdown !== null) {
    const fb = JSON.parse(JSON.stringify(payload.financial_breakdown)); // Deep clone to avoid mutation
    // Ensure totals object exists
    if (!fb.totals || typeof fb.totals !== "object") {
      fb.totals = emptyTotals();
    }
    
    // For AGAINST_ADVANCE_PAYMENT invoices, ensure total_invoice_amount matches amount
    const invoiceType = payload.invoice_type || payload.invoiceType;
    const isAdvancePayment = invoiceType && String(invoiceType).toUpperCase() === 'AGAINST_ADVANCE_PAYMENT';
    
    if (isAdvancePayment && payload.amount !== null && payload.amount !== undefined) {
      // For advance payment invoices, total_invoice_amount should equal the amount
      const amountValue = toNumericOrNull(payload.amount);
      if (amountValue !== null && amountValue !== undefined) {
        fb.totals.total_invoice_amount = amountValue;
        fb.totals.item_total = amountValue; // For advance payment, item total equals the amount
        fb.totals.charges_total = 0;
        fb.totals.tax_total = 0;
      }
    } else if (fb.totals.total_invoice_amount === null || fb.totals.total_invoice_amount === undefined || fb.totals.total_invoice_amount === 0) {
      // If total_invoice_amount is not set or is 0, use amount from payload
      if (payload.amount !== null && payload.amount !== undefined) {
        fb.totals.total_invoice_amount = toNumericOrNull(payload.amount);
      }
    }
    
    return fb;
  }

  // Otherwise, build it from individual fields
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
  // Use total_invoice_amount if provided, otherwise fall back to amount
  totals.total_invoice_amount = toNumericOrNull(payload?.total_invoice_amount ?? payload?.amount);

  return {
    charges,
    sales_taxes: salesTaxes,
    totals,
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

const safeBoolean = (value: any): boolean => toBoolean(value);

export const decorateVendorInvoiceRecord = <T extends Record<string, any>>(record: T): T => {
  if (!record) return record;

  // Ensure financial_breakdown is an object
  if (!record.financial_breakdown || typeof record.financial_breakdown !== "object") {
    record.financial_breakdown = {};
  }

  // Flatten financial breakdown for easier access in frontend forms (same pattern as PurchaseOrderForm)
  const breakdown = record.financial_breakdown || {};
  const charges = breakdown.charges || {};
  const salesTaxes = breakdown.sales_taxes || {};
  const totals = breakdown.totals || {};

  const freight = charges.freight || {};
  const packing = charges.packing || {};
  const custom = charges.custom_duties || charges.custom || {};
  const other = charges.other || {};

  const salesTax1 = salesTaxes.sales_tax_1 || salesTaxes.salesTax1 || {};
  const salesTax2 = salesTaxes.sales_tax_2 || salesTaxes.salesTax2 || {};

  // Flatten charge fields
  record.freight_charges_percentage = safeNumber(freight.percentage);
  record.freight_charges_amount = safeNumber(freight.amount);
  record.freight_charges_taxable = safeBoolean(freight.taxable);

  record.packing_charges_percentage = safeNumber(packing.percentage);
  record.packing_charges_amount = safeNumber(packing.amount);
  record.packing_charges_taxable = safeBoolean(packing.taxable);

  record.custom_duties_charges_percentage = safeNumber(custom.percentage);
  record.custom_duties_charges_amount = safeNumber(custom.amount);
  record.custom_duties_charges_taxable = safeBoolean(custom.taxable);

  record.other_charges_percentage = safeNumber(other.percentage);
  record.other_charges_amount = safeNumber(other.amount);
  record.other_charges_taxable = safeBoolean(other.taxable);

  // Flatten sales tax fields
  record.sales_tax_1_percentage = safeNumber(salesTax1.percentage);
  record.sales_tax_1_amount = safeNumber(salesTax1.amount);
  record.sales_tax_2_percentage = safeNumber(salesTax2.percentage);
  record.sales_tax_2_amount = safeNumber(salesTax2.amount);

  // Flatten totals (but don't set computed values - they should be calculated on frontend)
  // Note: item_total, charges_total, tax_total should be calculated on frontend for reactivity
  record.item_total = safeNumber(totals.item_total);
  record.charges_total = safeNumber(totals.charges_total);
  record.tax_total = safeNumber(totals.tax_total);
  // Handle both total_invoice_amount and amount in totals (amount is used by FinancialBreakdown component)
  record.total_invoice_amount = safeNumber(totals.total_invoice_amount ?? totals.amount);

  // Ensure attachments is an array
  if (!Array.isArray(record.attachments)) {
    record.attachments = [];
  }

  // Ensure amount and holdback are numbers or null
  record.amount = toNumericOrNull(record.amount);
  record.holdback = toNumericOrNull(record.holdback);

  return record;
};

const toNumberOrNull = (value: any): number | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const sanitizeAdvancePaymentCostCode = (item: any = {}) => {
  return {
    cost_code_uuid: item.cost_code_uuid || null,
    cost_code_label: item.cost_code_label || null,
    cost_code_number: item.cost_code_number || null,
    cost_code_name: item.cost_code_name || null,
    gl_account_uuid: item.gl_account_uuid || null,
    total_amount: toNumberOrNull(item.totalAmount || item.total_amount) || 0,
    advance_amount: toNumberOrNull(item.advanceAmount || item.advance_amount) || 0,
    metadata: item.metadata || {},
  };
};

export const sanitizeHoldbackCostCode = (item: any = {}) => {
  return {
    cost_code_uuid: item.cost_code_uuid || null,
    cost_code_label: item.cost_code_label || null,
    cost_code_number: item.cost_code_number || null,
    cost_code_name: item.cost_code_name || null,
    gl_account_uuid: item.gl_account_uuid || null,
    total_amount: toNumberOrNull(item.totalAmount || item.total_amount) || 0,
    retainage_amount: toNumberOrNull(item.retainageAmount || item.retainage_amount) || 0,
    release_amount: toNumberOrNull(item.releaseAmount || item.release_amount) || 0,
    metadata: item.metadata || {},
  };
};

