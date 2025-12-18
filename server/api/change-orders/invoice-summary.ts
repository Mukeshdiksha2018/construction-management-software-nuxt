import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);

  if (method !== "GET") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  const { change_order_uuid, currentInvoiceUuid } = query;

  if (!change_order_uuid) {
    throw createError({
      statusCode: 400,
      statusMessage: "change_order_uuid is required",
    });
  }

  try {
    // Fetch the change order to get total amount
    // Total is stored in financial_breakdown JSON column
    const { data: coData, error: coError } = await supabaseServer
      .from("change_orders")
      .select("uuid, financial_breakdown")
      .eq("uuid", change_order_uuid as string)
      .maybeSingle();

    if (coError) {
      console.error("Error fetching CO:", coError);
      throw createError({
        statusCode: 500,
        statusMessage: "Database error: " + coError.message,
      });
    }

    if (!coData) {
      throw createError({
        statusCode: 404,
        statusMessage: "Change order not found",
      });
    }

    // Extract total_co_amount from financial_breakdown JSON
    let totalCOValue = 0;
    if (coData.financial_breakdown) {
      try {
        const breakdown = typeof coData.financial_breakdown === 'string' 
          ? JSON.parse(coData.financial_breakdown) 
          : coData.financial_breakdown;
        const totals = breakdown?.totals || {};
        totalCOValue = parseFloat(totals.total_co_amount || totals.totalAmount || totals.total || "0") || 0;
      } catch (parseError) {
        console.error("Error parsing financial_breakdown:", parseError);
        totalCOValue = 0;
      }
    }

    // Calculate advance payment made (sum of invoice amounts where invoice_type is AGAINST_ADVANCE_PAYMENT and status is Paid)
    // Only count advance payments that are in "Paid" status
    const { data: advanceInvoices, error: advanceInvoicesError } = await supabaseServer
      .from("vendor_invoices")
      .select("amount")
      .eq("change_order_uuid", change_order_uuid as string)
      .eq("invoice_type", "AGAINST_ADVANCE_PAYMENT")
      .eq("status", "Paid")
      .eq("is_active", true);

    if (advanceInvoicesError) {
      console.error("Error fetching advance payment invoices:", advanceInvoicesError);
    }

    const advancePaid =
      advanceInvoices?.reduce(
        (sum, invoice) => sum + (parseFloat(invoice.amount || "0") || 0),
        0
      ) || 0;

    // Calculate invoiced value (sum of vendor_invoices where change_order_uuid matches, invoice_type is AGAINST_CO, and status is Paid)
    const { data: invoices, error: invoicesError } = await supabaseServer
      .from("vendor_invoices")
      .select("amount")
      .eq("change_order_uuid", change_order_uuid as string)
      .eq("invoice_type", "AGAINST_CO")
      .eq("status", "Paid")
      .eq("is_active", true);

    if (invoicesError) {
      console.error("Error fetching invoices:", invoicesError);
    }

    const invoicedValue =
      invoices?.reduce(
        (sum, invoice) => sum + (parseFloat(invoice.amount || "0") || 0),
        0
      ) || 0;

    // Calculate total adjusted advance payments from adjusted_advance_payment_cost_codes
    const { data: adjustedCostCodes, error: adjustedError } = await supabaseServer
      .from("adjusted_advance_payment_cost_codes")
      .select("adjusted_amount")
      .eq("change_order_uuid", change_order_uuid as string)
      .eq("is_active", true);

    if (adjustedError) {
      console.error("Error fetching adjusted advance payment cost codes:", adjustedError);
    }

    const totalAdjusted =
      adjustedCostCodes?.reduce(
        (sum, item) => sum + (parseFloat(item.adjusted_amount || "0") || 0),
        0
      ) || 0;

    // Calculate balance to be invoiced (advance paid minus total adjusted)
    // This shows how much of the advance payment is still available to be applied to future invoices
    const balanceToBeInvoiced = Math.max(0, advancePaid - totalAdjusted);

    return {
      data: {
        change_order_uuid: change_order_uuid as string,
        total_co_value: totalCOValue,
        advance_paid: advancePaid,
        invoiced_value: invoicedValue,
        total_adjusted: totalAdjusted,
        balance_to_be_invoiced: balanceToBeInvoiced,
      },
    };
  } catch (error: any) {
    console.error("API Error:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});

