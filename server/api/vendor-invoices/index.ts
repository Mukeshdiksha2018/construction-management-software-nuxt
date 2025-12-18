import { supabaseServer } from "@/utils/supabaseServer";
import { sanitizeAttachments, buildFinancialBreakdown, decorateVendorInvoiceRecord, sanitizeAdvancePaymentCostCode } from "./utils";
import { sanitizeDirectVendorInvoiceLineItem } from "../direct-vendor-invoice-line-items/utils";
import { sanitizePurchaseOrderInvoiceItem } from "../purchase-order-invoice-items/utils";
import { sanitizeChangeOrderInvoiceItem } from "../change-order-invoice-items/utils";

const normalizeUTC = (val: any, endOfDay = false) => {
  if (!val && val !== 0) return null;
  const s = String(val);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return endOfDay ? `${s}T23:59:59.000Z` : `${s}T00:00:00.000Z`;
  }
  return s;
};

const normalizeInvoiceType = (val: any) => {
  if (val === undefined || val === null) return null;
  const str = String(val).trim().toUpperCase();
  const validTypes = [
    "ENTER_DIRECT_INVOICE",
    "AGAINST_PO",
    "AGAINST_CO",
    "AGAINST_ADVANCE_PAYMENT",
    "AGAINST_HOLDBACK_AMOUNT",
  ];
  if (validTypes.includes(str)) return str;
  return null;
};

const normalizeCreditDays = (val: any) => {
  if (val === undefined || val === null) return null;
  const str = String(val).trim().toUpperCase();
  const validDays = ["NET_15", "NET_25", "NET_30", "NET_45", "NET_60"];
  if (validDays.includes(str)) return str;
  return null;
};

const persistDirectVendorInvoiceLineItems = async (options: {
  vendorInvoiceUuid: string;
  corporationUuid: string | null;
  projectUuid: string | null;
  items: any[];
}) => {
  const {
    vendorInvoiceUuid,
    corporationUuid,
    projectUuid,
    items = [],
  } = options;

  if (!vendorInvoiceUuid) return;

  const { error: deleteError } = await supabaseServer
    .from("direct_vendor_invoice_line_items")
    .delete()
    .eq("vendor_invoice_uuid", vendorInvoiceUuid);

  if (deleteError) {
    throw createError({
      statusCode: 500,
      statusMessage: deleteError.message,
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return;
  }

  const prepared = items.map((item, index) => ({
    ...sanitizeDirectVendorInvoiceLineItem(item, index),
    corporation_uuid: corporationUuid,
    project_uuid: projectUuid,
    vendor_invoice_uuid: vendorInvoiceUuid,
  }));

  const { error: insertError } = await supabaseServer
    .from("direct_vendor_invoice_line_items")
    .insert(prepared);

  if (insertError) {
    throw createError({
      statusCode: 500,
      statusMessage: insertError.message,
    });
  }
};

// Helper function to mark advance payment invoices as adjusted against an invoice
// Supports both purchase orders and change orders
const markAdvancePaymentsAsAdjusted = async (options: {
  invoiceUuid: string;
  purchaseOrderUuid?: string;
  changeOrderUuid?: string;
  deductionAmount: number;
}) => {
  const { invoiceUuid, purchaseOrderUuid, changeOrderUuid, deductionAmount } = options;

  if (!invoiceUuid || (!purchaseOrderUuid && !changeOrderUuid) || deductionAmount <= 0) {
    return;
  }

  try {
    // Build query based on whether it's a PO or CO
    let queryBuilder = supabaseServer
      .from("vendor_invoices")
      .select("uuid, amount")
      .eq("invoice_type", "AGAINST_ADVANCE_PAYMENT")
      .is("adjusted_against_vendor_invoice_uuid", null) // Only unadjusted ones
      .order("bill_date", { ascending: true }); // Oldest first

    if (purchaseOrderUuid) {
      queryBuilder = queryBuilder.eq("purchase_order_uuid", purchaseOrderUuid);
    } else if (changeOrderUuid) {
      queryBuilder = queryBuilder.eq("change_order_uuid", changeOrderUuid);
    }

    // Fetch all unadjusted advance payment invoices, ordered by bill_date (oldest first)
    const { data: advanceInvoices, error: fetchError } = await queryBuilder;

    if (fetchError) {
      console.error("Error fetching advance payment invoices for adjustment:", fetchError);
      return;
    }

    if (!advanceInvoices || advanceInvoices.length === 0) {
      return;
    }

    // Mark advance payment invoices as adjusted until deduction amount is covered
    let remainingDeduction = deductionAmount;
    const invoicesToMark: string[] = [];

    for (const invoice of advanceInvoices) {
      if (remainingDeduction <= 0) break;

      const invoiceAmount = parseFloat(invoice.amount || "0") || 0;
      invoicesToMark.push(invoice.uuid);
      remainingDeduction -= invoiceAmount;
    }

    // Update all selected invoices in a single batch
    if (invoicesToMark.length > 0) {
      const { error: updateError } = await supabaseServer
        .from("vendor_invoices")
        .update({ adjusted_against_vendor_invoice_uuid: invoiceUuid })
        .in("uuid", invoicesToMark);

      if (updateError) {
        console.error("Error marking advance payment invoices as adjusted:", updateError);
      }
    }
  } catch (error) {
    console.error("Error in markAdvancePaymentsAsAdjusted:", error);
  }
};

const persistAdvancePaymentCostCodes = async (options: {
  vendorInvoiceUuid: string;
  corporationUuid: string | null;
  projectUuid: string | null;
  vendorUuid: string | null;
  purchaseOrderUuid: string | null;
  changeOrderUuid: string | null;
  items: any[];
}) => {
  const {
    vendorInvoiceUuid,
    corporationUuid,
    projectUuid,
    vendorUuid,
    purchaseOrderUuid,
    changeOrderUuid,
    items = [],
  } = options;

  if (!vendorInvoiceUuid) return;

  const { error: deleteError } = await supabaseServer
    .from("advance_payment_cost_codes")
    .delete()
    .eq("vendor_invoice_uuid", vendorInvoiceUuid);

  if (deleteError) {
    throw createError({
      statusCode: 500,
      statusMessage: deleteError.message,
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return;
  }

  const prepared = items
    .filter((item) => item.cost_code_uuid) // Only include items with cost code
    .map((item) => ({
      ...sanitizeAdvancePaymentCostCode(item),
      corporation_uuid: corporationUuid,
      project_uuid: projectUuid,
      vendor_uuid: vendorUuid,
      purchase_order_uuid: purchaseOrderUuid,
      change_order_uuid: changeOrderUuid,
      vendor_invoice_uuid: vendorInvoiceUuid,
    }));

  if (prepared.length === 0) {
    return;
  }

  const { error: insertError } = await supabaseServer
    .from("advance_payment_cost_codes")
    .insert(prepared);

  if (insertError) {
    throw createError({
      statusCode: 500,
      statusMessage: insertError.message,
    });
  }
};

const persistPurchaseOrderInvoiceItems = async (options: {
  vendorInvoiceUuid: string;
  corporationUuid: string | null;
  projectUuid: string | null;
  purchaseOrderUuid: string | null;
  items: any[];
}) => {
  const {
    vendorInvoiceUuid,
    corporationUuid,
    projectUuid,
    purchaseOrderUuid,
    items = [],
  } = options;

  if (!vendorInvoiceUuid) return;

  // Delete existing PO invoice items for this invoice
  const { error: deleteError } = await supabaseServer
    .from("purchase_order_invoice_items_list")
    .delete()
    .eq("vendor_invoice_uuid", vendorInvoiceUuid);

  if (deleteError) {
    throw createError({
      statusCode: 500,
      statusMessage: deleteError.message,
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return;
  }

  // Prepare items for insertion
  const prepared = items.map((item, index) => ({
    ...sanitizePurchaseOrderInvoiceItem(item, index),
    corporation_uuid: corporationUuid,
    project_uuid: projectUuid,
    purchase_order_uuid: purchaseOrderUuid,
    vendor_invoice_uuid: vendorInvoiceUuid,
  }));

  const { error: insertError } = await supabaseServer
    .from("purchase_order_invoice_items_list")
    .insert(prepared);

  if (insertError) {
    throw createError({
      statusCode: 500,
      statusMessage: insertError.message,
    });
  }
};

const persistChangeOrderInvoiceItems = async (options: {
  vendorInvoiceUuid: string;
  corporationUuid: string | null;
  projectUuid: string | null;
  changeOrderUuid: string | null;
  items: any[];
}) => {
  const {
    vendorInvoiceUuid,
    corporationUuid,
    projectUuid,
    changeOrderUuid,
    items = [],
  } = options;

  if (!vendorInvoiceUuid) return;

  // Delete existing CO invoice items for this invoice
  const { error: deleteError } = await supabaseServer
    .from("change_order_invoice_items_list")
    .delete()
    .eq("vendor_invoice_uuid", vendorInvoiceUuid);

  if (deleteError) {
    throw createError({
      statusCode: 500,
      statusMessage: deleteError.message,
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return;
  }

  // Prepare items for insertion
  const prepared = items.map((item, index) => ({
    ...sanitizeChangeOrderInvoiceItem(item, index),
    corporation_uuid: corporationUuid,
    project_uuid: projectUuid,
    change_order_uuid: changeOrderUuid,
    vendor_invoice_uuid: vendorInvoiceUuid,
  }));

  const { error: insertError } = await supabaseServer
    .from("change_order_invoice_items_list")
    .insert(prepared);

  if (insertError) {
    throw createError({
      statusCode: 500,
      statusMessage: insertError.message,
    });
  }
};

const persistAdjustedAdvancePaymentCostCodes = async (options: {
  vendorInvoiceUuid: string;
  advancePaymentUuid: string;
  corporationUuid: string | null;
  projectUuid: string | null;
  purchaseOrderUuid: string | null;
  changeOrderUuid: string | null;
  adjustedAmounts: Record<string, number>; // Map of costCodeUuid -> adjustedAmount
  advancePaymentCostCodes: any[]; // Original advance payment cost codes for reference
}) => {
  const {
    vendorInvoiceUuid,
    advancePaymentUuid,
    corporationUuid,
    projectUuid,
    purchaseOrderUuid,
    changeOrderUuid,
    adjustedAmounts = {},
    advancePaymentCostCodes = [],
  } = options;

  if (!vendorInvoiceUuid || !advancePaymentUuid) {
    return;
  }

  // Delete existing adjusted advance payment cost codes for this invoice
  const { error: deleteError } = await supabaseServer
    .from("adjusted_advance_payment_cost_codes")
    .delete()
    .eq("vendor_invoice_uuid", vendorInvoiceUuid);

  if (deleteError) {
    console.error('[API persistAdjustedAdvancePaymentCostCodes] Delete error:', deleteError);
    throw createError({
      statusCode: 500,
      statusMessage: deleteError.message,
    });
  }

  // Prepare items for insertion
  const prepared: any[] = [];
  
  Object.entries(adjustedAmounts).forEach(([costCodeUuid, adjustedAmount]) => {
    if (!costCodeUuid || adjustedAmount <= 0) {
      return;
    }
    
    // Find the original cost code to get metadata
    // Try matching by uuid first (the record's own uuid), then by cost_code_uuid (FK to cost_code_configurations)
    const originalCostCode = advancePaymentCostCodes.find(
      (cc) => cc.uuid === costCodeUuid || cc.cost_code_uuid === costCodeUuid
    );
    
    if (!originalCostCode) {
      // Still insert but without the cost code metadata
      prepared.push({
        vendor_invoice_uuid: vendorInvoiceUuid,
        advance_payment_uuid: advancePaymentUuid,
        corporation_uuid: corporationUuid,
        project_uuid: projectUuid,
        purchase_order_uuid: purchaseOrderUuid,
        change_order_uuid: changeOrderUuid,
        cost_code_uuid: costCodeUuid,
        cost_code_label: null,
        cost_code_number: null,
        cost_code_name: null,
        adjusted_amount: parseFloat(String(adjustedAmount)) || 0,
        is_active: true,
      });
      return;
    }
    
    prepared.push({
      vendor_invoice_uuid: vendorInvoiceUuid,
      advance_payment_uuid: advancePaymentUuid,
      corporation_uuid: corporationUuid,
      project_uuid: projectUuid,
      purchase_order_uuid: purchaseOrderUuid,
      change_order_uuid: changeOrderUuid,
      cost_code_uuid: originalCostCode.cost_code_uuid || costCodeUuid,
      cost_code_label: originalCostCode.cost_code_label || 
        (originalCostCode.cost_code_number && originalCostCode.cost_code_name
          ? `${originalCostCode.cost_code_number} ${originalCostCode.cost_code_name}`.trim()
          : null),
      cost_code_number: originalCostCode.cost_code_number || null,
      cost_code_name: originalCostCode.cost_code_name || null,
      adjusted_amount: parseFloat(String(adjustedAmount)) || 0,
      is_active: true,
    });
  });

  if (prepared.length === 0) {
    return;
  }

  const { error: insertError } = await supabaseServer
    .from("adjusted_advance_payment_cost_codes")
    .insert(prepared);

  if (insertError) {
    console.error('[API persistAdjustedAdvancePaymentCostCodes] Insert error:', insertError);
    throw createError({
      statusCode: 500,
      statusMessage: insertError.message,
    });
  }
};

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);
  const body =
    method === "POST" || method === "PUT" ? await readBody(event) : null;

  try {
    if (method === "GET") {
      const { corporation_uuid, uuid } = query;

      if (uuid) {
        const { data, error } = await supabaseServer
          .from("vendor_invoices")
          .select("*")
          .eq("uuid", uuid as string)
          .maybeSingle();

        if (error)
          throw createError({ statusCode: 500, statusMessage: error.message });
        if (!data)
          throw createError({
            statusCode: 404,
            statusMessage: "Vendor invoice not found",
          });

        // Fetch line items if this is a direct invoice
        let lineItems: any[] = [];
        if (data.invoice_type === "ENTER_DIRECT_INVOICE") {
          const { data: itemsData, error: itemsError } = await supabaseServer
            .from("direct_vendor_invoice_line_items")
            .select("*")
            .eq("vendor_invoice_uuid", data.uuid)
            .eq("is_active", true)
            .order("order_index", { ascending: true });

          if (itemsError) {
            console.error("Error fetching line items:", itemsError);
          } else {
            lineItems = itemsData || [];
          }
        }

        // Fetch PO invoice items if this is an AGAINST_PO invoice
        const decorated = decorateVendorInvoiceRecord({ ...data });
        (decorated as any).line_items = lineItems;
        
        if (data.invoice_type === "AGAINST_PO") {
          const { data: poItemsData, error: poItemsError } = await supabaseServer
            .from("purchase_order_invoice_items_list")
            .select("*")
            .eq("vendor_invoice_uuid", data.uuid)
            .eq("is_active", true)
            .order("order_index", { ascending: true });

          if (poItemsError) {
            console.error("Error fetching PO invoice items:", poItemsError);
            (decorated as any).po_invoice_items = [];
          } else {
            (decorated as any).po_invoice_items = poItemsData || [];
          }
        }
        // Don't set po_invoice_items for non-AGAINST_PO invoices
        
        // Fetch CO invoice items if this is an AGAINST_CO invoice
        if (data.invoice_type === "AGAINST_CO") {
          const { data: coItemsData, error: coItemsError } = await supabaseServer
            .from("change_order_invoice_items_list")
            .select("*")
            .eq("vendor_invoice_uuid", data.uuid)
            .eq("is_active", true)
            .order("order_index", { ascending: true });

          if (coItemsError) {
            console.error("Error fetching CO invoice items:", coItemsError);
            (decorated as any).co_invoice_items = [];
          } else {
            (decorated as any).co_invoice_items = coItemsData || [];
          }
        }
        // Don't set co_invoice_items for non-AGAINST_CO invoices
        
        return { data: decorated };
      }

      if (!corporation_uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "corporation_uuid is required",
        });
      }

      // Pagination parameters
      const page = parseInt(query.page as string) || 1;
      const pageSize = parseInt(query.page_size as string) || 100;
      const offset = (page - 1) * pageSize;

      // Get total count for pagination metadata
      const { count, error: countError } = await supabaseServer
        .from("vendor_invoices")
        .select("*", { count: "exact", head: true })
        .eq("corporation_uuid", corporation_uuid as string)
        .eq("is_active", true);

      if (countError)
        throw createError({ statusCode: 500, statusMessage: countError.message });

      const totalRecords = count || 0;
      const totalPages = Math.ceil(totalRecords / pageSize);

      // Fetch paginated data
      const { data, error } = await supabaseServer
        .from("vendor_invoices")
        .select(
          `
          *,
          project:projects!project_uuid (
            uuid,
            project_name,
            project_id
          ),
          vendor:vendors!vendor_uuid (
            uuid,
            vendor_name
          ),
          purchase_order:purchase_order_forms!purchase_order_uuid (
            uuid,
            po_number
          ),
          change_order:change_orders!change_order_uuid (
            uuid,
            co_number
          )
        `
        )
        .eq("corporation_uuid", corporation_uuid as string)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error)
        throw createError({ statusCode: 500, statusMessage: error.message });
      
      const hydrated =
        data?.map((record: any) => {
          const decorated = decorateVendorInvoiceRecord({ ...record });
          // Add metadata fields for easy access in the list view
          if (record.project) {
            (decorated as any).project_name = record.project.project_name || null;
            (decorated as any).project_id = record.project.project_id || null;
          }
          if (record.vendor) {
            (decorated as any).vendor_name = record.vendor.vendor_name || null;
          }
          if (record.purchase_order) {
            (decorated as any).po_number = record.purchase_order.po_number || null;
          }
          if (record.change_order) {
            (decorated as any).co_number = record.change_order.co_number || null;
          }
          return decorated;
        }) || [];
      
      return { 
        data: hydrated,
        pagination: {
          page,
          pageSize,
          totalRecords,
          totalPages,
          hasMore: page < totalPages
        }
      };
    }

    if (method === "POST") {
      if (!body)
        throw createError({
          statusCode: 400,
          statusMessage: "Request body is required",
        });
      if (!body.corporation_uuid)
        throw createError({
          statusCode: 400,
          statusMessage: "corporation_uuid is required",
        });
      if (!body.invoice_type)
        throw createError({
          statusCode: 400,
          statusMessage: "invoice_type is required",
        });
      if (!body.bill_date)
        throw createError({
          statusCode: 400,
          statusMessage: "bill_date is required",
        });
      if (!body.amount)
        throw createError({
          statusCode: 400,
          statusMessage: "amount is required",
        });

      const normalizedInvoiceType = normalizeInvoiceType(body.invoice_type);
      if (!normalizedInvoiceType) {
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid invoice_type",
        });
      }

      const insertData: any = {
        corporation_uuid: body.corporation_uuid,
        project_uuid: body.project_uuid || null,
        vendor_uuid: body.vendor_uuid || null,
        purchase_order_uuid: body.purchase_order_uuid || null,
        change_order_uuid: body.change_order_uuid || null,
        invoice_type: normalizedInvoiceType,
        number: body.number || null,
        bill_date: normalizeUTC(body.bill_date),
        due_date: normalizeUTC(body.due_date, true),
        credit_days: normalizeCreditDays(body.credit_days),
        amount: parseFloat(body.amount) || 0,
        holdback: body.holdback ? parseFloat(body.holdback) : null,
        status: body.status || 'Draft',
        is_active: true,
      };

      insertData.financial_breakdown = buildFinancialBreakdown(body);
      insertData.attachments = sanitizeAttachments(body.attachments);
      
      // Handle removed_advance_payment_cost_codes if provided
      if (body.removed_advance_payment_cost_codes !== undefined) {
        (insertData as any).removed_advance_payment_cost_codes = Array.isArray(body.removed_advance_payment_cost_codes)
          ? body.removed_advance_payment_cost_codes
          : [];
      }

      // Normalize empty strings to null
      for (const key of [
        "project_uuid",
        "vendor_uuid",
        "purchase_order_uuid",
        "change_order_uuid",
        "number",
      ] as const) {
        if (insertData[key] === "") insertData[key] = null;
      }

      const { data, error } = await supabaseServer
        .from("vendor_invoices")
        .insert([insertData])
        .select()
        .single();

      if (error)
        throw createError({ statusCode: 500, statusMessage: error.message });

      // Fetch the created record with JOINs to include metadata
      const { data: recordWithMetadata, error: fetchError } = await supabaseServer
        .from("vendor_invoices")
        .select(`
          *,
          project:projects!project_uuid (
            uuid,
            project_name,
            project_id
          ),
          vendor:vendors!vendor_uuid (
            uuid,
            vendor_name
          ),
          purchase_order:purchase_order_forms!purchase_order_uuid (
            uuid,
            po_number
          ),
          change_order:change_orders!change_order_uuid (
            uuid,
            co_number
          )
        `)
        .eq("uuid", data.uuid)
        .single();

      let responseData = data;

      if (!fetchError && recordWithMetadata) {
        responseData = { ...recordWithMetadata };
        // Add metadata fields for easy access in the list view
        if (recordWithMetadata.project) {
          (responseData as any).project_name = recordWithMetadata.project.project_name || null;
          (responseData as any).project_id = recordWithMetadata.project.project_id || null;
        }
        if (recordWithMetadata.vendor) {
          (responseData as any).vendor_name = recordWithMetadata.vendor.vendor_name || null;
        }
        if (recordWithMetadata.purchase_order) {
          (responseData as any).po_number = recordWithMetadata.purchase_order.po_number || null;
        }
        if (recordWithMetadata.change_order) {
          (responseData as any).co_number = recordWithMetadata.change_order.co_number || null;
        }
      } else if (fetchError) {
        console.error("Error fetching created vendor invoice with metadata:", fetchError);
        // Continue with data without metadata
      }

      // Save line items if this is a direct invoice
      if (normalizedInvoiceType === "ENTER_DIRECT_INVOICE" && Array.isArray(body.line_items)) {
        await persistDirectVendorInvoiceLineItems({
          vendorInvoiceUuid: data.uuid,
          corporationUuid: data.corporation_uuid ?? null,
          projectUuid: data.project_uuid ?? null,
          items: body.line_items,
        });
      }

      // Save advance payment cost codes if this is an advance payment invoice
      if (normalizedInvoiceType === "AGAINST_ADVANCE_PAYMENT" && Array.isArray(body.advance_payment_cost_codes)) {
        await persistAdvancePaymentCostCodes({
          vendorInvoiceUuid: data.uuid,
          corporationUuid: data.corporation_uuid ?? null,
          projectUuid: data.project_uuid ?? null,
          vendorUuid: data.vendor_uuid ?? null,
          purchaseOrderUuid: data.purchase_order_uuid ?? null,
          changeOrderUuid: data.change_order_uuid ?? null,
          items: body.advance_payment_cost_codes,
        });
      }

      // Save PO invoice items if this is an AGAINST_PO invoice
      if (normalizedInvoiceType === "AGAINST_PO") {
        if (Array.isArray(body.po_invoice_items)) {
          await persistPurchaseOrderInvoiceItems({
            vendorInvoiceUuid: data.uuid,
            corporationUuid: data.corporation_uuid ?? null,
            projectUuid: data.project_uuid ?? null,
            purchaseOrderUuid: data.purchase_order_uuid ?? null,
            items: body.po_invoice_items,
          });
        }

        // Handle adjusted advance payment cost codes for AGAINST_PO invoices (POST)
        if (body.adjusted_advance_payment_amounts !== undefined && body.adjusted_advance_payment_uuid) {
          const adjustedAmounts = body.adjusted_advance_payment_amounts;
          const advancePaymentUuid = body.adjusted_advance_payment_uuid;
          
          // Fetch the advance payment cost codes to get full details
          const { data: advancePaymentCostCodesData } = await supabaseServer
            .from("advance_payment_cost_codes")
            .select("*")
            .eq("vendor_invoice_uuid", advancePaymentUuid)
            .eq("is_active", true);
          
          // Extract adjusted amounts for this specific advance payment
          const adjustedAmountsForPayment = adjustedAmounts[advancePaymentUuid] || {};
          
          if (Object.keys(adjustedAmountsForPayment).length > 0) {
            await persistAdjustedAdvancePaymentCostCodes({
              vendorInvoiceUuid: data.uuid,
              advancePaymentUuid: advancePaymentUuid,
              corporationUuid: data.corporation_uuid ?? null,
              projectUuid: data.project_uuid ?? null,
              purchaseOrderUuid: data.purchase_order_uuid ?? null,
              changeOrderUuid: null,
              adjustedAmounts: adjustedAmountsForPayment,
              advancePaymentCostCodes: advancePaymentCostCodesData || [],
            });
          }
        }

        // Mark advance payment invoices as adjusted if there's a deduction
        if (data.purchase_order_uuid) {
          // Calculate deduction amount - prefer explicit value from frontend, otherwise calculate from financial breakdown
          let deductionAmount = 0;
          
          // First, check if advance_payment_deduction is explicitly passed (preferred method)
          if (body.advance_payment_deduction !== undefined && body.advance_payment_deduction !== null) {
            deductionAmount = parseFloat(body.advance_payment_deduction) || 0;
          } else if (insertData.financial_breakdown && typeof insertData.financial_breakdown === 'object') {
            // Fallback: calculate from financial breakdown
            const fb = insertData.financial_breakdown;
            // Calculate total before deduction from invoice's own totals
            const itemTotal = parseFloat(fb.totals?.item_total || "0") || 0;
            const chargesTotal = parseFloat(fb.totals?.charges_total || "0") || 0;
            const taxTotal = parseFloat(fb.totals?.tax_total || "0") || 0;
            const totalBeforeDeduction = itemTotal + chargesTotal + taxTotal;
            const finalTotal = parseFloat(data.amount || "0") || 0;
            deductionAmount = Math.max(0, totalBeforeDeduction - finalTotal);
          }

          if (deductionAmount > 0) {
            await markAdvancePaymentsAsAdjusted({
              invoiceUuid: data.uuid,
              purchaseOrderUuid: data.purchase_order_uuid,
              deductionAmount: deductionAmount,
            });
          }
        }
      }

      // Save CO invoice items if this is an AGAINST_CO invoice
      if (normalizedInvoiceType === "AGAINST_CO") {
        if (Array.isArray(body.co_invoice_items)) {
          await persistChangeOrderInvoiceItems({
            vendorInvoiceUuid: data.uuid,
            corporationUuid: data.corporation_uuid ?? null,
            projectUuid: data.project_uuid ?? null,
            changeOrderUuid: data.change_order_uuid ?? null,
            items: body.co_invoice_items,
          });
        }

        // Handle adjusted advance payment cost codes for AGAINST_CO invoices (POST)
        if (body.adjusted_advance_payment_amounts !== undefined && body.adjusted_advance_payment_uuid) {
          const adjustedAmounts = body.adjusted_advance_payment_amounts;
          const advancePaymentUuid = body.adjusted_advance_payment_uuid;
          
          // Fetch the advance payment cost codes to get full details
          const { data: advancePaymentCostCodesData } = await supabaseServer
            .from("advance_payment_cost_codes")
            .select("*")
            .eq("vendor_invoice_uuid", advancePaymentUuid)
            .eq("is_active", true);
          
          // Extract adjusted amounts for this specific advance payment
          const adjustedAmountsForPayment = adjustedAmounts[advancePaymentUuid] || {};
          
          if (Object.keys(adjustedAmountsForPayment).length > 0) {
            await persistAdjustedAdvancePaymentCostCodes({
              vendorInvoiceUuid: data.uuid,
              advancePaymentUuid: advancePaymentUuid,
              corporationUuid: data.corporation_uuid ?? null,
              projectUuid: data.project_uuid ?? null,
              purchaseOrderUuid: null,
              changeOrderUuid: data.change_order_uuid ?? null,
              adjustedAmounts: adjustedAmountsForPayment,
              advancePaymentCostCodes: advancePaymentCostCodesData || [],
            });
          }
        }

        // Mark advance payment invoices as adjusted if there's a deduction
        if (data.change_order_uuid) {
          // Calculate deduction amount - prefer explicit value from frontend, otherwise calculate from financial breakdown
          let deductionAmount = 0;
          
          // First, check if advance_payment_deduction is explicitly passed (preferred method)
          if (body.advance_payment_deduction !== undefined && body.advance_payment_deduction !== null) {
            deductionAmount = parseFloat(body.advance_payment_deduction) || 0;
          } else if (insertData.financial_breakdown && typeof insertData.financial_breakdown === 'object') {
            // Fallback: calculate from financial breakdown
            const fb = insertData.financial_breakdown;
            // Calculate total before deduction from invoice's own totals
            const itemTotal = parseFloat(fb.totals?.item_total || "0") || 0;
            const chargesTotal = parseFloat(fb.totals?.charges_total || "0") || 0;
            const taxTotal = parseFloat(fb.totals?.tax_total || "0") || 0;
            const totalBeforeDeduction = itemTotal + chargesTotal + taxTotal;
            const finalTotal = parseFloat(data.amount || "0") || 0;
            deductionAmount = Math.max(0, totalBeforeDeduction - finalTotal);
          }

          if (deductionAmount > 0) {
            await markAdvancePaymentsAsAdjusted({
              invoiceUuid: data.uuid,
              changeOrderUuid: data.change_order_uuid,
              deductionAmount: deductionAmount,
            });
          }
        }
      }

      // Fetch line items if this is a direct invoice
      let lineItems: any[] = [];
      if (normalizedInvoiceType === "ENTER_DIRECT_INVOICE") {
        const { data: itemsData, error: itemsError } = await supabaseServer
          .from("direct_vendor_invoice_line_items")
          .select("*")
          .eq("vendor_invoice_uuid", data.uuid)
          .eq("is_active", true)
          .order("order_index", { ascending: true });

        if (itemsError) {
          console.error("Error fetching line items:", itemsError);
        } else {
          lineItems = itemsData || [];
        }
      }

      // Fetch advance payment cost codes if this is an advance payment invoice
      let advancePaymentCostCodes: any[] = [];
      if (normalizedInvoiceType === "AGAINST_ADVANCE_PAYMENT") {
        const { data: apccData, error: apccError } = await supabaseServer
          .from("advance_payment_cost_codes")
          .select("*")
          .eq("vendor_invoice_uuid", data.uuid)
          .eq("is_active", true)
          .order("created_at", { ascending: true });

        if (apccError) {
          console.error("Error fetching advance payment cost codes:", apccError);
        } else {
          advancePaymentCostCodes = apccData || [];
        }
      }

      // Fetch PO invoice items if this is an AGAINST_PO invoice
      let poInvoiceItems: any[] = [];
      if (normalizedInvoiceType === "AGAINST_PO") {
        const { data: poItemsData, error: poItemsError } = await supabaseServer
          .from("purchase_order_invoice_items_list")
          .select("*")
          .eq("vendor_invoice_uuid", data.uuid)
          .eq("is_active", true)
          .order("order_index", { ascending: true });

        if (poItemsError) {
          console.error("Error fetching PO invoice items:", poItemsError);
        } else {
          poInvoiceItems = poItemsData || [];
        }
      }

      // Fetch CO invoice items if this is an AGAINST_CO invoice
      let coInvoiceItems: any[] = [];
      if (normalizedInvoiceType === "AGAINST_CO") {
        const { data: coItemsData, error: coItemsError } = await supabaseServer
          .from("change_order_invoice_items_list")
          .select("*")
          .eq("vendor_invoice_uuid", data.uuid)
          .eq("is_active", true)
          .order("order_index", { ascending: true });

        if (coItemsError) {
          console.error("Error fetching CO invoice items:", coItemsError);
        } else {
          coInvoiceItems = coItemsData || [];
        }
      }

      const decorated = decorateVendorInvoiceRecord({ ...responseData });
      (decorated as any).line_items = lineItems;
      (decorated as any).advance_payment_cost_codes = advancePaymentCostCodes;
      (decorated as any).po_invoice_items = poInvoiceItems;
      (decorated as any).co_invoice_items = coInvoiceItems;
      // Include removed_advance_payment_cost_codes if it exists
      if ((responseData as any).removed_advance_payment_cost_codes !== undefined) {
        (decorated as any).removed_advance_payment_cost_codes = (responseData as any).removed_advance_payment_cost_codes;
      }
      // Ensure metadata fields are preserved
      if ((responseData as any).project_name !== undefined) {
        (decorated as any).project_name = (responseData as any).project_name;
      }
      if ((responseData as any).project_id !== undefined) {
        (decorated as any).project_id = (responseData as any).project_id;
      }
      if ((responseData as any).vendor_name !== undefined) {
        (decorated as any).vendor_name = (responseData as any).vendor_name;
      }
      if ((responseData as any).po_number !== undefined) {
        (decorated as any).po_number = (responseData as any).po_number;
      }
      if ((responseData as any).co_number !== undefined) {
        (decorated as any).co_number = (responseData as any).co_number;
      }
      return { data: decorated };
    }

    if (method === "PUT") {
      if (!body)
        throw createError({
          statusCode: 400,
          statusMessage: "Request body is required",
        });
      const { uuid, ...updated } = body;
      
      if (!uuid)
        throw createError({
          statusCode: 400,
          statusMessage: "uuid is required",
        });

      const updateData: any = {};

      const fields = [
        "corporation_uuid",
        "project_uuid",
        "vendor_uuid",
        "purchase_order_uuid",
        "change_order_uuid",
        "invoice_type",
        "number",
        "bill_date",
        "due_date",
        "credit_days",
        "amount",
        "holdback",
        "status",
        "financial_breakdown",
        "is_active",
        "adjusted_advance_payment_uuid",
      ];

      for (const f of fields) {
        if (updated[f] !== undefined) {
          if (f === "bill_date") {
            updateData[f] = normalizeUTC(updated[f]);
          } else if (f === "due_date") {
            updateData[f] = normalizeUTC(updated[f], true);
          } else if (f === "invoice_type") {
            const normalized = normalizeInvoiceType(updated[f]);
            if (normalized) {
              updateData[f] = normalized;
            }
          } else if (f === "credit_days") {
            const normalized = normalizeCreditDays(updated[f]);
            updateData[f] = normalized;
          } else if (f === "amount") {
            updateData[f] = parseFloat(updated[f]) || 0;
          } else if (f === "holdback") {
            updateData[f] = updated[f] ? parseFloat(updated[f]) : null;
          } else if (f === "status") {
            // Validate status value
            const validStatuses = ['Draft', 'Pending', 'Approved', 'Paid'];
            if (updated[f] && validStatuses.includes(updated[f])) {
              updateData[f] = updated[f];
            }
          } else if (f === "financial_breakdown") {
            // Skip - handled separately below
            continue;
          } else {
            updateData[f] = updated[f];
          }
        }
      }

      // Handle financial_breakdown separately
      if (updated.financial_breakdown !== undefined || hasFinancialFields(updated)) {
        updateData.financial_breakdown = buildFinancialBreakdown(updated);
      }

      // Normalize empty strings to null
      for (const key of [
        "project_uuid",
        "vendor_uuid",
        "purchase_order_uuid",
        "change_order_uuid",
        "number",
      ] as const) {
        if (updateData[key] === "") updateData[key] = null;
      }

      if (updated.attachments !== undefined) {
        updateData.attachments = sanitizeAttachments(updated.attachments);
      }

      // Handle removed_advance_payment_cost_codes if provided (must be before database update)
      if (updated.removed_advance_payment_cost_codes !== undefined) {
        updateData.removed_advance_payment_cost_codes = Array.isArray(updated.removed_advance_payment_cost_codes)
          ? updated.removed_advance_payment_cost_codes
          : [];
      }

      // Get current invoice to check type and purchase_order_uuid
      const { data: currentInvoice } = await supabaseServer
        .from("vendor_invoices")
        .select("invoice_type, purchase_order_uuid")
        .eq("uuid", uuid)
        .maybeSingle();

      const currentInvoiceType = currentInvoice?.invoice_type;
      const currentPurchaseOrderUuid = currentInvoice?.purchase_order_uuid;
      const newPurchaseOrderUuid = updated.purchase_order_uuid
        ? (updated.purchase_order_uuid === "" ? null : updated.purchase_order_uuid)
        : currentPurchaseOrderUuid;
      const newInvoiceType = updated.invoice_type
        ? normalizeInvoiceType(updated.invoice_type)
        : currentInvoiceType;

      // If purchase_order_uuid changed and this was an AGAINST_PO invoice, unmark old advance payments
      if (currentInvoiceType === "AGAINST_PO" && 
          currentPurchaseOrderUuid && 
          newPurchaseOrderUuid !== currentPurchaseOrderUuid) {
        // Unmark advance payment invoices that were adjusted against this invoice for the old PO
        const { error: unmarkError } = await supabaseServer
          .from("vendor_invoices")
          .update({ adjusted_against_vendor_invoice_uuid: null })
          .eq("adjusted_against_vendor_invoice_uuid", uuid)
          .eq("purchase_order_uuid", currentPurchaseOrderUuid);

        if (unmarkError) {
          console.error("Error unmarking advance payment invoices for old PO:", unmarkError);
        }
      }

      const { data, error } = await supabaseServer
        .from("vendor_invoices")
        .update(updateData)
        .eq("uuid", uuid)
        .select()
        .single();

      if (error)
        throw createError({ statusCode: 500, statusMessage: error.message });

      // Fetch the updated record with JOINs to include metadata
      const { data: recordWithMetadata, error: fetchError } = await supabaseServer
        .from("vendor_invoices")
        .select(`
          *,
          project:projects!project_uuid (
            uuid,
            project_name,
            project_id
          ),
          vendor:vendors!vendor_uuid (
            uuid,
            vendor_name
          ),
          purchase_order:purchase_order_forms!purchase_order_uuid (
            uuid,
            po_number
          ),
          change_order:change_orders!change_order_uuid (
            uuid,
            co_number
          )
        `)
        .eq("uuid", uuid)
        .single();

      let responseData = data;

      if (!fetchError && recordWithMetadata) {
        responseData = { ...recordWithMetadata };
        // Add metadata fields for easy access in the list view
        if (recordWithMetadata.project) {
          (responseData as any).project_name = recordWithMetadata.project.project_name || null;
          (responseData as any).project_id = recordWithMetadata.project.project_id || null;
        }
        if (recordWithMetadata.vendor) {
          (responseData as any).vendor_name = recordWithMetadata.vendor.vendor_name || null;
        }
        if (recordWithMetadata.purchase_order) {
          (responseData as any).po_number = recordWithMetadata.purchase_order.po_number || null;
        }
        if (recordWithMetadata.change_order) {
          (responseData as any).co_number = recordWithMetadata.change_order.co_number || null;
        }
      } else if (fetchError) {
        console.error("Error fetching updated vendor invoice with metadata:", fetchError);
        // Continue with data without metadata
      }

      // Handle line items for direct invoices
      if (newInvoiceType === "ENTER_DIRECT_INVOICE") {
        if (updated.line_items !== undefined) {
          // Save line items if provided
          await persistDirectVendorInvoiceLineItems({
            vendorInvoiceUuid: data.uuid,
            corporationUuid: data.corporation_uuid ?? null,
            projectUuid: data.project_uuid ?? null,
            items: Array.isArray(updated.line_items) ? updated.line_items : [],
          });
        } else if (currentInvoiceType !== "ENTER_DIRECT_INVOICE") {
          // If switching from non-direct to direct, clear any existing line items
          await supabaseServer
            .from("direct_vendor_invoice_line_items")
            .delete()
            .eq("vendor_invoice_uuid", data.uuid);
        }
      } else if (currentInvoiceType === "ENTER_DIRECT_INVOICE" && newInvoiceType !== "ENTER_DIRECT_INVOICE") {
        // If switching from direct to non-direct, delete line items
        await supabaseServer
          .from("direct_vendor_invoice_line_items")
          .delete()
          .eq("vendor_invoice_uuid", data.uuid);
      }

      // Handle advance payment cost codes for advance payment invoices
      if (newInvoiceType === "AGAINST_ADVANCE_PAYMENT") {
        if (updated.advance_payment_cost_codes !== undefined) {
          // Save advance payment cost codes if provided
          await persistAdvancePaymentCostCodes({
            vendorInvoiceUuid: data.uuid,
            corporationUuid: data.corporation_uuid ?? null,
            projectUuid: data.project_uuid ?? null,
            vendorUuid: data.vendor_uuid ?? null,
            purchaseOrderUuid: data.purchase_order_uuid ?? null,
            changeOrderUuid: data.change_order_uuid ?? null,
            items: Array.isArray(updated.advance_payment_cost_codes) ? updated.advance_payment_cost_codes : [],
          });
        } else if (currentInvoiceType !== "AGAINST_ADVANCE_PAYMENT") {
          // If switching from non-advance to advance, clear any existing advance payment cost codes
          await supabaseServer
            .from("advance_payment_cost_codes")
            .delete()
            .eq("vendor_invoice_uuid", data.uuid);
        }
      } else if (currentInvoiceType === "AGAINST_ADVANCE_PAYMENT" && newInvoiceType !== "AGAINST_ADVANCE_PAYMENT") {
        // If switching from advance to non-advance, delete advance payment cost codes
        await supabaseServer
          .from("advance_payment_cost_codes")
          .delete()
          .eq("vendor_invoice_uuid", data.uuid);
      }

      // Handle PO invoice items for AGAINST_PO invoices
      if (newInvoiceType === "AGAINST_PO") {
        if (updated.po_invoice_items !== undefined) {
          // Save PO invoice items if provided
          const itemsToSave = Array.isArray(updated.po_invoice_items) ? updated.po_invoice_items : [];
          await persistPurchaseOrderInvoiceItems({
            vendorInvoiceUuid: data.uuid,
            corporationUuid: data.corporation_uuid ?? null,
            projectUuid: data.project_uuid ?? null,
            purchaseOrderUuid: data.purchase_order_uuid ?? null,
            items: itemsToSave,
          });
        } else if (currentInvoiceType !== "AGAINST_PO") {
          // If switching from non-PO to PO, clear any existing PO invoice items
          await supabaseServer
            .from("purchase_order_invoice_items_list")
            .delete()
            .eq("vendor_invoice_uuid", data.uuid);
        }

        // Handle adjusted advance payment cost codes for AGAINST_PO invoices
        if (updated.adjusted_advance_payment_amounts !== undefined && updated.adjusted_advance_payment_uuid) {
          const adjustedAmounts = updated.adjusted_advance_payment_amounts;
          const advancePaymentUuid = updated.adjusted_advance_payment_uuid;
          
          // Fetch the advance payment cost codes to get full details
          const { data: advancePaymentCostCodes } = await supabaseServer
            .from("advance_payment_cost_codes")
            .select("*")
            .eq("vendor_invoice_uuid", advancePaymentUuid)
            .eq("is_active", true);
          
          // Extract adjusted amounts for this specific advance payment
          const adjustedAmountsForPayment = adjustedAmounts[advancePaymentUuid] || {};
          
          if (Object.keys(adjustedAmountsForPayment).length > 0) {
            await persistAdjustedAdvancePaymentCostCodes({
              vendorInvoiceUuid: data.uuid,
              advancePaymentUuid: advancePaymentUuid,
              corporationUuid: data.corporation_uuid ?? null,
              projectUuid: data.project_uuid ?? null,
              purchaseOrderUuid: data.purchase_order_uuid ?? null,
              changeOrderUuid: null,
              adjustedAmounts: adjustedAmountsForPayment,
              advancePaymentCostCodes: advancePaymentCostCodes || [],
            });
          }
        } else if (updated.adjusted_advance_payment_uuid === null || updated.adjusted_advance_payment_uuid === undefined) {
          // Clear adjusted advance payment cost codes if no advance payment is being adjusted
          await supabaseServer
            .from("adjusted_advance_payment_cost_codes")
            .delete()
            .eq("vendor_invoice_uuid", data.uuid);
        }

        // Mark advance payment invoices as adjusted if there's a deduction
        if (data.purchase_order_uuid) {
          // Calculate deduction amount - prefer explicit value from frontend, otherwise calculate from financial breakdown
          let deductionAmount = 0;
          
          // First, check if advance_payment_deduction is explicitly passed (preferred method)
          if (updated.advance_payment_deduction !== undefined && updated.advance_payment_deduction !== null) {
            deductionAmount = parseFloat(updated.advance_payment_deduction) || 0;
          } else if (updateData.financial_breakdown && typeof updateData.financial_breakdown === 'object') {
            // Fallback: calculate from financial breakdown
            const fb = updateData.financial_breakdown;
            // Calculate total before deduction from invoice's own totals
            const itemTotal = parseFloat(fb.totals?.item_total || "0") || 0;
            const chargesTotal = parseFloat(fb.totals?.charges_total || "0") || 0;
            const taxTotal = parseFloat(fb.totals?.tax_total || "0") || 0;
            const totalBeforeDeduction = itemTotal + chargesTotal + taxTotal;
            const finalTotal = parseFloat(data.amount || "0") || 0;
            deductionAmount = Math.max(0, totalBeforeDeduction - finalTotal);
          }

          if (deductionAmount > 0) {
            await markAdvancePaymentsAsAdjusted({
              invoiceUuid: data.uuid,
              purchaseOrderUuid: data.purchase_order_uuid,
              deductionAmount: deductionAmount,
            });
          }
        }
      } else if (currentInvoiceType === "AGAINST_PO" && newInvoiceType !== "AGAINST_PO") {
        // If switching from PO to non-PO, delete PO invoice items
        await supabaseServer
          .from("purchase_order_invoice_items_list")
          .delete()
          .eq("vendor_invoice_uuid", data.uuid);
      }

      // Handle CO invoice items for AGAINST_CO invoices
      if (newInvoiceType === "AGAINST_CO") {
        if (updated.co_invoice_items !== undefined) {
          // Save CO invoice items if provided
          const itemsToSave = Array.isArray(updated.co_invoice_items) ? updated.co_invoice_items : [];
          await persistChangeOrderInvoiceItems({
            vendorInvoiceUuid: data.uuid,
            corporationUuid: data.corporation_uuid ?? null,
            projectUuid: data.project_uuid ?? null,
            changeOrderUuid: data.change_order_uuid ?? null,
            items: itemsToSave,
          });
        } else if (currentInvoiceType !== "AGAINST_CO") {
          // If switching from non-CO to CO, clear any existing CO invoice items
          await supabaseServer
            .from("change_order_invoice_items_list")
            .delete()
            .eq("vendor_invoice_uuid", data.uuid);
        }

        // Handle adjusted advance payment cost codes for AGAINST_CO invoices
        if (updated.adjusted_advance_payment_amounts !== undefined && updated.adjusted_advance_payment_uuid) {
          const adjustedAmounts = updated.adjusted_advance_payment_amounts;
          const advancePaymentUuid = updated.adjusted_advance_payment_uuid;
          
          // Fetch the advance payment cost codes to get full details
          const { data: advancePaymentCostCodes } = await supabaseServer
            .from("advance_payment_cost_codes")
            .select("*")
            .eq("vendor_invoice_uuid", advancePaymentUuid)
            .eq("is_active", true);
          
          // Extract adjusted amounts for this specific advance payment
          const adjustedAmountsForPayment = adjustedAmounts[advancePaymentUuid] || {};
          
          if (Object.keys(adjustedAmountsForPayment).length > 0) {
            await persistAdjustedAdvancePaymentCostCodes({
              vendorInvoiceUuid: data.uuid,
              advancePaymentUuid: advancePaymentUuid,
              corporationUuid: data.corporation_uuid ?? null,
              projectUuid: data.project_uuid ?? null,
              purchaseOrderUuid: null,
              changeOrderUuid: data.change_order_uuid ?? null,
              adjustedAmounts: adjustedAmountsForPayment,
              advancePaymentCostCodes: advancePaymentCostCodes || [],
            });
          }
        } else if (updated.adjusted_advance_payment_uuid === null || updated.adjusted_advance_payment_uuid === undefined) {
          // Clear adjusted advance payment cost codes if no advance payment is being adjusted
          await supabaseServer
            .from("adjusted_advance_payment_cost_codes")
            .delete()
            .eq("vendor_invoice_uuid", data.uuid);
        }

        // Mark advance payment invoices as adjusted if there's a deduction
        if (data.change_order_uuid) {
          // Calculate deduction amount - prefer explicit value from frontend, otherwise calculate from financial breakdown
          let deductionAmount = 0;
          
          // First, check if advance_payment_deduction is explicitly passed (preferred method)
          if (updated.advance_payment_deduction !== undefined && updated.advance_payment_deduction !== null) {
            deductionAmount = parseFloat(updated.advance_payment_deduction) || 0;
          } else if (updateData.financial_breakdown && typeof updateData.financial_breakdown === 'object') {
            // Fallback: calculate from financial breakdown
            const fb = updateData.financial_breakdown;
            // Calculate total before deduction from invoice's own totals
            const itemTotal = parseFloat(fb.totals?.item_total || "0") || 0;
            const chargesTotal = parseFloat(fb.totals?.charges_total || "0") || 0;
            const taxTotal = parseFloat(fb.totals?.tax_total || "0") || 0;
            const totalBeforeDeduction = itemTotal + chargesTotal + taxTotal;
            const finalTotal = parseFloat(data.amount || "0") || 0;
            deductionAmount = Math.max(0, totalBeforeDeduction - finalTotal);
          }

          if (deductionAmount > 0) {
            await markAdvancePaymentsAsAdjusted({
              invoiceUuid: data.uuid,
              changeOrderUuid: data.change_order_uuid,
              deductionAmount: deductionAmount,
            });
          }
        }
      } else if (currentInvoiceType === "AGAINST_CO" && newInvoiceType !== "AGAINST_CO") {
        // If switching from CO to non-CO, delete CO invoice items
        await supabaseServer
          .from("change_order_invoice_items_list")
          .delete()
          .eq("vendor_invoice_uuid", data.uuid);
      }

      // Fetch line items if this is a direct invoice
      let lineItems: any[] = [];
      if (newInvoiceType === "ENTER_DIRECT_INVOICE") {
        const { data: itemsData, error: itemsError } = await supabaseServer
          .from("direct_vendor_invoice_line_items")
          .select("*")
          .eq("vendor_invoice_uuid", data.uuid)
          .eq("is_active", true)
          .order("order_index", { ascending: true });

        if (itemsError) {
          console.error("Error fetching line items:", itemsError);
        } else {
          lineItems = itemsData || [];
        }
      }

      // Fetch advance payment cost codes if this is an advance payment invoice
      let advancePaymentCostCodes: any[] = [];
      if (newInvoiceType === "AGAINST_ADVANCE_PAYMENT") {
        const { data: apccData, error: apccError } = await supabaseServer
          .from("advance_payment_cost_codes")
          .select("*")
          .eq("vendor_invoice_uuid", data.uuid)
          .eq("is_active", true)
          .order("created_at", { ascending: true });

        if (apccError) {
          console.error("Error fetching advance payment cost codes:", apccError);
        } else {
          advancePaymentCostCodes = apccData || [];
        }
      }

      // Fetch PO invoice items if this is an AGAINST_PO invoice
      let poInvoiceItems: any[] = [];
      if (newInvoiceType === "AGAINST_PO") {
        const { data: poItemsData, error: poItemsError } = await supabaseServer
          .from("purchase_order_invoice_items_list")
          .select("*")
          .eq("vendor_invoice_uuid", data.uuid)
          .eq("is_active", true)
          .order("order_index", { ascending: true });

        if (poItemsError) {
          console.error("Error fetching PO invoice items:", poItemsError);
        } else {
          poInvoiceItems = poItemsData || [];
        }
      }

      // Fetch CO invoice items if this is an AGAINST_CO invoice
      let coInvoiceItems: any[] = [];
      if (newInvoiceType === "AGAINST_CO") {
        const { data: coItemsData, error: coItemsError } = await supabaseServer
          .from("change_order_invoice_items_list")
          .select("*")
          .eq("vendor_invoice_uuid", data.uuid)
          .eq("is_active", true)
          .order("order_index", { ascending: true });

        if (coItemsError) {
          console.error("Error fetching CO invoice items:", coItemsError);
        } else {
          coInvoiceItems = coItemsData || [];
        }
      }

      const decorated = decorateVendorInvoiceRecord({ ...responseData });
      (decorated as any).line_items = lineItems;
      (decorated as any).advance_payment_cost_codes = advancePaymentCostCodes;
      (decorated as any).po_invoice_items = poInvoiceItems;
      (decorated as any).co_invoice_items = coInvoiceItems;
      // Include removed_advance_payment_cost_codes if it exists
      if ((responseData as any).removed_advance_payment_cost_codes !== undefined) {
        (decorated as any).removed_advance_payment_cost_codes = (responseData as any).removed_advance_payment_cost_codes;
      }
      // Ensure metadata fields are preserved
      if ((responseData as any).project_name !== undefined) {
        (decorated as any).project_name = (responseData as any).project_name;
      }
      if ((responseData as any).project_id !== undefined) {
        (decorated as any).project_id = (responseData as any).project_id;
      }
      if ((responseData as any).vendor_name !== undefined) {
        (decorated as any).vendor_name = (responseData as any).vendor_name;
      }
      if ((responseData as any).po_number !== undefined) {
        (decorated as any).po_number = (responseData as any).po_number;
      }
      if ((responseData as any).co_number !== undefined) {
        (decorated as any).co_number = (responseData as any).co_number;
      }
      return { data: decorated };
    }

    if (method === "DELETE") {
      const { uuid } = query;
      if (!uuid)
        throw createError({
          statusCode: 400,
          statusMessage: "uuid is required",
        });

      // Before deleting, unmark any advance payment invoices that were adjusted against this invoice
      const { data: invoiceToDelete } = await supabaseServer
        .from("vendor_invoices")
        .select("uuid, invoice_type")
        .eq("uuid", uuid as string)
        .maybeSingle();

      if (invoiceToDelete && invoiceToDelete.invoice_type === "AGAINST_PO") {
        // Unmark advance payment invoices that were adjusted against this invoice
        const { error: unmarkError } = await supabaseServer
          .from("vendor_invoices")
          .update({ adjusted_against_vendor_invoice_uuid: null })
          .eq("adjusted_against_vendor_invoice_uuid", invoiceToDelete.uuid);

        if (unmarkError) {
          console.error("Error unmarking advance payment invoices:", unmarkError);
          // Continue with deletion even if unmarking fails
        }
      }

      const { data, error } = await supabaseServer
        .from("vendor_invoices")
        .update({ is_active: false })
        .eq("uuid", uuid as string)
        .select()
        .single();

      if (error)
        throw createError({ statusCode: 500, statusMessage: error.message });
      return { data: decorateVendorInvoiceRecord({ ...data }) };
    }

    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  } catch (error: any) {
    console.error("vendor-invoices API error:", error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});

// Helper function to check if payload has financial fields
const hasFinancialFields = (payload: Record<string, any>): boolean => {
  const financialKeys = [
    "item_total",
    "charges_total",
    "tax_total",
    "freight_charges_percentage",
    "freight_charges_amount",
    "freight_charges_taxable",
    "packing_charges_percentage",
    "packing_charges_amount",
    "packing_charges_taxable",
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
  ];
  return financialKeys.some((key) => Object.prototype.hasOwnProperty.call(payload ?? {}, key));
};
