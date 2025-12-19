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
    // Always show ALL advance payments (even if partially adjusted) so users can adjust remaining amounts
    // The component will calculate remaining amounts based on previously adjusted cost codes
    // Include financial_breakdown to get tax and charges information
    let queryBuilder = supabaseServer
      .from("vendor_invoices")
      .select("uuid, number, bill_date, amount, is_active, financial_breakdown, adjusted_against_vendor_invoice_uuid")
      .eq("change_order_uuid", uuid)
      .eq("invoice_type", "AGAINST_ADVANCE_PAYMENT")
      // Only include active advance payment invoices
      .eq("is_active", true);

    // Always return all advance payments (regardless of adjustment status)
    // The component will handle showing remaining amounts based on previously adjusted cost codes
    // If viewing an existing invoice, we still show all payments so the user can see what was adjusted

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

