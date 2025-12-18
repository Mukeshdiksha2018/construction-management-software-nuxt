import { supabaseServer } from "@/utils/supabaseServer";
import { decorateVendorInvoiceRecord } from "./utils";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const uuid = getRouterParam(event, "uuid");

  if (!uuid) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invoice UUID is required",
    });
  }

  try {
    if (method === "GET") {
      const { data, error } = await supabaseServer
        .from("vendor_invoices")
        .select("*")
        .eq("uuid", uuid)
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

      // Fetch advance payment cost codes if this is an advance payment invoice
      let advancePaymentCostCodes: any[] = [];
      if (data.invoice_type === "AGAINST_ADVANCE_PAYMENT") {
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
      if (data.invoice_type === "AGAINST_PO") {
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
      if (data.invoice_type === "AGAINST_CO") {
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

      // Fetch adjusted advance payment cost codes if this is an AGAINST_PO or AGAINST_CO invoice
      let adjustedAdvancePaymentAmounts: Record<string, Record<string, number>> = {};
      if ((data.invoice_type === "AGAINST_PO" || data.invoice_type === "AGAINST_CO") && data.adjusted_advance_payment_uuid) {
        const { data: adjustedData, error: adjustedError } = await supabaseServer
          .from("adjusted_advance_payment_cost_codes")
          .select("*")
          .eq("vendor_invoice_uuid", data.uuid)
          .eq("is_active", true);

        if (adjustedError) {
          console.error("Error fetching adjusted advance payment cost codes:", adjustedError);
        } else if (adjustedData && adjustedData.length > 0) {
          // Group by advance_payment_uuid -> cost_code_uuid -> adjusted_amount
          adjustedData.forEach((item: any) => {
            const advancePaymentUuid = item.advance_payment_uuid;
            const costCodeUuid = item.cost_code_uuid;
            const adjustedAmount = parseFloat(item.adjusted_amount || "0") || 0;
            
            if (!adjustedAdvancePaymentAmounts[advancePaymentUuid]) {
              adjustedAdvancePaymentAmounts[advancePaymentUuid] = {};
            }
            
            if (costCodeUuid && adjustedAmount > 0) {
              adjustedAdvancePaymentAmounts[advancePaymentUuid][costCodeUuid] = adjustedAmount;
            }
          });
        }
      }

      const decorated = decorateVendorInvoiceRecord({ ...data });
      (decorated as any).line_items = lineItems;
      (decorated as any).advance_payment_cost_codes = advancePaymentCostCodes;
      (decorated as any).po_invoice_items = poInvoiceItems;
      (decorated as any).co_invoice_items = coInvoiceItems;
      (decorated as any).adjusted_advance_payment_amounts = adjustedAdvancePaymentAmounts;
      // Include removed_advance_payment_cost_codes if it exists
      if ((data as any).removed_advance_payment_cost_codes !== undefined) {
        (decorated as any).removed_advance_payment_cost_codes = (data as any).removed_advance_payment_cost_codes;
      }
      return { data: decorated };
    }

    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  } catch (error: any) {
    console.error("vendor-invoices/[uuid] error:", error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});

