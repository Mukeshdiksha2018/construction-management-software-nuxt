import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  if (method !== "GET") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  const query = getQuery(event);
  const vendorInvoiceUuid = query.vendor_invoice_uuid as string | undefined;
  const purchaseOrderUuid = query.purchase_order_uuid as string | undefined;
  const changeOrderUuid = query.change_order_uuid as string | undefined;

  if (!vendorInvoiceUuid) {
    throw createError({
      statusCode: 400,
      statusMessage: "vendor_invoice_uuid is required",
    });
  }

  try {
    // Build query to fetch adjusted_advance_payment_cost_codes
    let queryBuilder = supabaseServer
      .from("adjusted_advance_payment_cost_codes")
      .select("*")
      .eq("vendor_invoice_uuid", vendorInvoiceUuid)
      .eq("is_active", true);

    // Optionally filter by PO or CO
    if (purchaseOrderUuid) {
      queryBuilder = queryBuilder.eq("purchase_order_uuid", purchaseOrderUuid);
    }
    if (changeOrderUuid) {
      queryBuilder = queryBuilder.eq("change_order_uuid", changeOrderUuid);
    }

    const { data, error } = await queryBuilder.order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching adjusted_advance_payment_cost_codes:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Database error: " + error.message,
      });
    }

    return {
      data: data || [],
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

