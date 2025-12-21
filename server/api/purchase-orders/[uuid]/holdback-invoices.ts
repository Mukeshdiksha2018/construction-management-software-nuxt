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
      statusMessage: "Purchase order UUID is required",
    });
  }

  try {
    // Fetch all holdback invoices for this purchase order
    // Exclude the current invoice if provided (for editing existing invoices)
    let queryBuilder = supabaseServer
      .from("vendor_invoices")
      .select("uuid, number, bill_date, amount, is_active, holdback_invoice_uuid")
      .eq("purchase_order_uuid", uuid)
      .eq("invoice_type", "AGAINST_HOLDBACK_AMOUNT")
      .eq("is_active", true);

    // Exclude current invoice if provided
    if (currentInvoiceUuid) {
      queryBuilder = queryBuilder.neq("uuid", currentInvoiceUuid);
    }

    const { data: invoices, error: invoicesError } = await queryBuilder.order("bill_date", { ascending: false });

    if (invoicesError) {
      console.error("Error fetching holdback invoices:", invoicesError);
      throw createError({
        statusCode: 500,
        statusMessage: "Database error: " + invoicesError.message,
      });
    }

    // Fetch holdback cost codes for each invoice
    const invoicesWithCostCodes = await Promise.all(
      (invoices || []).map(async (invoice: any) => {
        const { data: costCodes, error: costCodesError } = await supabaseServer
          .from("holdback_cost_codes")
          .select("*")
          .eq("vendor_invoice_uuid", invoice.uuid)
          .eq("is_active", true);

        if (costCodesError) {
          console.error(`Error fetching cost codes for invoice ${invoice.uuid}:`, costCodesError);
          return {
            ...invoice,
            cost_codes: [],
          };
        }

        return {
          ...invoice,
          cost_codes: costCodes || [],
        };
      })
    );

    return {
      data: invoicesWithCostCodes,
    };
  } catch (error: any) {
    console.error("holdback-invoices error:", error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});

