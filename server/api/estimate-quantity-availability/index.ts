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
  const projectUuid = String(query.project_uuid || "").trim();
  const estimateUuid = String(query.estimate_uuid || "").trim();
  const corporationUuid = String(query.corporation_uuid || "").trim();
  const excludePoUuid = String(query.exclude_po_uuid || "").trim(); // For editing existing PO

  if (!projectUuid || !estimateUuid || !corporationUuid) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "project_uuid, estimate_uuid, and corporation_uuid are required",
    });
  }

  try {
    // Get all active purchase orders for this project that import from estimate
    // Only include purchase orders with approved/partially_received/completed statuses
    // Exclude the current PO if editing (exclude_po_uuid provided)
    let poQuery = supabaseServer
      .from("purchase_order_forms")
      .select("uuid")
      .eq("corporation_uuid", corporationUuid)
      .eq("project_uuid", projectUuid)
      .eq("include_items", "IMPORT_ITEMS_FROM_ESTIMATE")
      .eq("is_active", true)
      .in("status", ["Approved", "Partially_Received", "Completed"]);

    if (excludePoUuid) {
      poQuery = poQuery.neq("uuid", excludePoUuid);
    }

    const { data: purchaseOrders, error: poError } = await poQuery;

    if (poError) {
      console.error("Error fetching purchase orders:", poError);
      throw createError({
        statusCode: 500,
        statusMessage: poError.message || "Failed to fetch purchase orders",
      });
    }

    if (!purchaseOrders || purchaseOrders.length === 0) {
      // No existing POs, all quantities are available
      return { data: {} };
    }

    const poUuids = purchaseOrders.map((po: any) => po.uuid);

    // Get all PO items for these purchase orders
    const { data: poItems, error: itemsError } = await supabaseServer
      .from("purchase_order_items_list")
      .select("item_uuid, po_quantity")
      .in("purchase_order_uuid", poUuids)
      .eq("is_active", true);

    if (itemsError) {
      console.error("Error fetching purchase order items:", itemsError);
      throw createError({
        statusCode: 500,
        statusMessage: itemsError.message || "Failed to fetch purchase order items",
      });
    }

    // Aggregate quantities by item_uuid
    const usedQuantities: Record<string, number> = {};
    
    (poItems || []).forEach((item: any) => {
      if (!item.item_uuid) return;
      
      const itemUuid = String(item.item_uuid);
      const quantity = parseFloat(item.po_quantity || "0");
      
      if (!isNaN(quantity) && quantity > 0) {
        if (!usedQuantities[itemUuid]) {
          usedQuantities[itemUuid] = 0;
        }
        usedQuantities[itemUuid] += quantity;
      }
    });

    return { data: usedQuantities };
  } catch (error: any) {
    console.error("estimate-quantity-availability API failure", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Internal server error",
    });
  }
});

