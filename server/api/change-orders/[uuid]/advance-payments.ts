import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const uuid = getRouterParam(event, "uuid");
  const query = getQuery(event);
  const currentInvoiceUuid = query.currentInvoiceUuid as string | undefined;

  if (method !== "GET") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  if (!uuid) {
    throw createError({
      statusCode: 400,
      statusMessage: "Change order UUID is required",
    });
  }

  try {
    // Fetch all advance payment invoices for this change order
    // If currentInvoiceUuid is provided, include advance payments adjusted against that invoice
    // Otherwise, only show unadjusted advance payments
    // Include financial_breakdown to get tax and charges information
    let queryBuilder = supabaseServer
      .from("vendor_invoices")
      .select("uuid, number, bill_date, amount, is_active, financial_breakdown, adjusted_against_vendor_invoice_uuid")
      .eq("change_order_uuid", uuid)
      .eq("invoice_type", "AGAINST_ADVANCE_PAYMENT");

    // If viewing an existing invoice, include advance payments adjusted against it
    // Otherwise, only show unadjusted advance payments
    if (currentInvoiceUuid) {
      queryBuilder = queryBuilder.or(`adjusted_against_vendor_invoice_uuid.is.null,adjusted_against_vendor_invoice_uuid.eq.${currentInvoiceUuid}`);
    } else {
      queryBuilder = queryBuilder.is("adjusted_against_vendor_invoice_uuid", null);
    }

    const { data: invoices, error: invoicesError } = await queryBuilder.order("bill_date", { ascending: false });

    if (invoicesError) {
      console.error("Error fetching advance payment invoices:", invoicesError);
      throw createError({
        statusCode: 500,
        statusMessage: "Database error: " + invoicesError.message,
      });
    }

    // Fetch cost codes for each invoice
    const invoicesWithCostCodes = await Promise.all(
      (invoices || []).map(async (invoice) => {
        const { data: costCodes, error: costCodesError } = await supabaseServer
          .from("advance_payment_cost_codes")
          .select("*")
          .eq("vendor_invoice_uuid", invoice.uuid)
          .eq("is_active", true)
          .order("created_at", { ascending: true });

        if (costCodesError) {
          console.error(`Error fetching cost codes for invoice ${invoice.uuid}:`, costCodesError);
        }

        return {
          ...invoice,
          costCodes: costCodes || [],
        };
      })
    );

    return {
      data: invoicesWithCostCodes,
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

