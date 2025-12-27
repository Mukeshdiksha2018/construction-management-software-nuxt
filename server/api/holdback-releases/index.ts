import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);
  const {
    vendor_invoice_uuid,
    purchase_order_uuid,
    change_order_uuid,
    exclude_current_invoice,
  } = query;

  if (method !== "GET") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  try {
    console.log('[API holdback-releases] Request received with query params:', {
      vendor_invoice_uuid,
      purchase_order_uuid,
      change_order_uuid,
      exclude_current_invoice,
    });

    // Build query to fetch holdback_cost_codes with release_amount > 0
    let queryBuilder = supabaseServer
      .from("holdback_cost_codes")
      .select("*")
      .eq("is_active", true)
      .gt("release_amount", 0); // Only get rows with release amounts

    // If vendor_invoice_uuid is provided and we're not excluding it, filter by it (for existing invoices)
    if (vendor_invoice_uuid && exclude_current_invoice !== "true") {
      console.log('[API holdback-releases] Filtering by vendor_invoice_uuid:', vendor_invoice_uuid);
      queryBuilder = queryBuilder.eq("vendor_invoice_uuid", vendor_invoice_uuid);
    } else {
      // For new invoices or when excluding current invoice, fetch all releases for the PO/CO
      if (purchase_order_uuid) {
        console.log('[API holdback-releases] Filtering by purchase_order_uuid:', purchase_order_uuid);
        queryBuilder = queryBuilder.eq("purchase_order_uuid", purchase_order_uuid);
      }
      if (change_order_uuid) {
        console.log('[API holdback-releases] Filtering by change_order_uuid:', change_order_uuid);
        queryBuilder = queryBuilder.eq("change_order_uuid", change_order_uuid);
      }

      // Exclude current invoice if specified (when editing and we want all other invoices' releases)
      if (exclude_current_invoice === "true" && vendor_invoice_uuid) {
        console.log('[API holdback-releases] Excluding vendor_invoice_uuid:', vendor_invoice_uuid);
        queryBuilder = queryBuilder.neq("vendor_invoice_uuid", vendor_invoice_uuid);
      }
    }

    const { data: holdbackData, error } = await queryBuilder.order("created_at", { ascending: true });
    
    console.log('[API holdback-releases] Query result:', {
      dataCount: holdbackData?.length || 0,
      error: error?.message,
      sampleData: holdbackData?.slice(0, 2), // Log first 2 records as sample
    });

    if (error) {
      console.error("[API holdback-releases] Error fetching holdback releases:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Database error: " + error.message,
      });
    }

    // Filter to only include holdback releases from active vendor invoices
    // Get unique vendor invoice UUIDs from the holdback data
    const vendorInvoiceUuids = [...new Set(
      (holdbackData || [])
        .map((item: any) => item.vendor_invoice_uuid)
        .filter((uuid: any) => uuid)
    )];

    // Fetch active vendor invoices
    let activeInvoiceUuids: string[] = [];
    if (vendorInvoiceUuids.length > 0) {
      const { data: vendorInvoices, error: vendorInvoicesError } = await supabaseServer
        .from("vendor_invoices")
        .select("uuid")
        .in("uuid", vendorInvoiceUuids)
        .eq("is_active", true);

      if (vendorInvoicesError) {
        console.error("[API holdback-releases] Error fetching vendor invoices:", vendorInvoicesError);
        // Continue with empty array - will filter out all items
      } else {
        activeInvoiceUuids = (vendorInvoices || []).map((vi: any) => vi.uuid);
      }
    }

    // Filter holdback data to only include releases from active vendor invoices
    const filteredData = (holdbackData || []).filter((item: any) => {
      return activeInvoiceUuids.includes(item.vendor_invoice_uuid);
    });

    const result = {
      data: filteredData || [],
    };
    
    console.log('[API holdback-releases] Returning data:', {
      totalRecords: result.data.length,
      costCodesByUuid: result.data.reduce((acc: Record<string, number>, item: any) => {
        const uuid = item.cost_code_uuid;
        if (uuid) {
          acc[uuid] = (acc[uuid] || 0) + parseFloat(String(item.release_amount || 0));
        }
        return acc;
      }, {}),
    });

    return result;
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

