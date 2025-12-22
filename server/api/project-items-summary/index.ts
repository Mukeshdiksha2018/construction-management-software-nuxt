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
  const corporationUuid = String(query.corporation_uuid || "").trim();
  const vendorUuid = String(query.vendor_uuid || "").trim();
  const location = String(query.location || "").trim();

  if (!projectUuid || !corporationUuid) {
    throw createError({
      statusCode: 400,
      statusMessage: "project_uuid and corporation_uuid are required",
    });
  }

  try {
    // Get project info
    const { data: projectData, error: projectError } = await supabaseServer
      .from("projects")
      .select("uuid, project_name, project_id, corporation_uuid")
      .eq("uuid", projectUuid)
      .eq("corporation_uuid", corporationUuid)
      .maybeSingle();

    if (projectError) {
      throw createError({
        statusCode: 500,
        statusMessage: projectError.message || "Failed to fetch project",
      });
    }

    if (!projectData) {
      return { data: [] };
    }

    // Get corporation info
    const { data: corporationData, error: corpError } = await supabaseServer
      .from("properties")
      .select("uuid, corporation_name")
      .eq("uuid", corporationUuid)
      .maybeSingle();

    if (corpError) {
      console.error("Error fetching corporation:", corpError);
    }

    // Get all estimates for the project - only approved and active estimates (like useBudgetReport)
    const { data: estimatesData, error: estimatesError } = await supabaseServer
      .from("estimates")
      .select("uuid, status, is_active")
      .eq("project_uuid", projectUuid)
      .eq("corporation_uuid", corporationUuid);

    if (estimatesError) {
      throw createError({
        statusCode: 500,
        statusMessage: estimatesError.message || "Failed to fetch estimates",
      });
    }

    // Filter to only approved and active estimates (like useBudgetReport)
    const approvedEstimates = (estimatesData || []).filter((estimate: any) => {
      const isApproved = estimate.status === "Approved";
      const isActive =
        estimate.is_active === true ||
        String(estimate.is_active).toUpperCase() === "TRUE";
      return isApproved && isActive;
    });

    const estimateUuids = approvedEstimates.map((e: any) => e.uuid);

    if (estimateUuids.length === 0) {
      return { data: [] };
    }

    // Fetch item types for the project to map item_type_uuid to item_type_label
    const { data: itemTypesData, error: itemTypesError } = await supabaseServer
      .from("item_types")
      .select("uuid, item_type")
      .eq("project_uuid", projectUuid)
      .eq("corporation_uuid", corporationUuid)
      .eq("is_active", true);

    if (itemTypesError) {
      console.error("Error fetching item types:", itemTypesError);
    }

    const itemTypeMap = new Map<string, string>();
    (itemTypesData || []).forEach((it: any) => {
      if (it.uuid && it.item_type) {
        itemTypeMap.set(it.uuid, it.item_type);
      }
    });

    // Fetch locations to map location_uuid to location_name
    const { data: locationsData, error: locationsError } = await supabaseServer
      .from("location")
      .select("uuid, location_name")
      .eq("active", true);

    if (locationsError) {
      console.error("Error fetching locations:", locationsError);
    }

    const locationMap = new Map<string, string>();
    (locationsData || []).forEach((loc: any) => {
      if (loc.uuid && loc.location_name) {
        locationMap.set(loc.uuid, loc.location_name);
      }
    });

    // Get all estimate line items for these estimates
    const { data: lineItemsData, error: lineItemsError } = await supabaseServer
      .from("estimate_line_items")
      .select(
        "id, cost_code_uuid, cost_code_number, cost_code_name, division_name, material_items"
      )
      .eq("project_uuid", projectUuid)
      .eq("corporation_uuid", corporationUuid)
      .in("estimate_uuid", estimateUuids)
      .order("id", { ascending: true });

    if (lineItemsError) {
      throw createError({
        statusCode: 500,
        statusMessage: lineItemsError.message || "Failed to fetch estimate line items",
      });
    }

    // Flatten material items from estimate line items (similar to purchaseOrderResources.ts)
    const allEstimateItems: any[] = [];
    (lineItemsData || []).forEach((row: any) => {
      const materialItems = Array.isArray(row.material_items) ? row.material_items : [];
      materialItems.forEach((item: any) => {
        // Normalize quantity (handle various field names like quantity, qty, quantity_value)
        const quantity = parseFloat(
          item.quantity || item.qty || item.quantity_value || 0
        ) || 0;
        
        // Normalize unit price
        const unitPrice = parseFloat(
          item.unit_price || item.unitPrice || item.price || 0
        ) || 0;
        
        // Get sequence (handle various field names)
        const sequence = item.sequence || item.item_sequence || item.sequence_uuid || "";
        
        // Get location (handle various field names)
        const location = item.location || item.location_uuid || "";
        const locationUuid = typeof location === "string" && location.length === 36 ? location : null;
        
        // Get item UUID
        const itemUuid = item.item_uuid || item.uuid || null;
        
        // Get item type
        const itemTypeUuid = item.item_type_uuid || item.item_type || null;
        // Look up item type label from the map
        const itemTypeLabel = itemTypeUuid && itemTypeMap.has(itemTypeUuid)
          ? itemTypeMap.get(itemTypeUuid) || ""
          : (item.item_type_label || item.item_type_name || "");
        
        // Get item name
        const itemName = item.name || item.item_name || item.title || "";
        
        // Get description
        const description = item.description || "";
        
        // Get location name from map if location_uuid exists
        let locationName = location;
        if (locationUuid && locationMap.has(locationUuid)) {
          locationName = locationMap.get(locationUuid) || location;
        } else if (typeof location === "string" && location.length === 36 && locationMap.has(location)) {
          locationName = locationMap.get(location) || location;
        }
        
        allEstimateItems.push({
          cost_code_uuid: row.cost_code_uuid,
          cost_code_number: row.cost_code_number,
          cost_code_name: row.cost_code_name,
          cost_code_label: [row.cost_code_number, row.cost_code_name]
            .filter(Boolean)
            .join(" ")
            .trim(),
          division_name: row.division_name,
          item_uuid: itemUuid,
          item_type_uuid: itemTypeUuid,
          item_type_label: itemTypeLabel,
          item_name: itemName,
          description: description,
          sequence: sequence,
          sequence_uuid: typeof sequence === "string" && sequence.length === 36 ? sequence : null,
          location: locationName,
          location_uuid: locationUuid,
          quantity: quantity,
          unit_price: unitPrice,
          // Preserve original item for reference
          _original: item,
        });
      });
    });

    // Get purchase orders for the project with approved/partially received/completed status
    let poQuery = supabaseServer
      .from("purchase_order_forms")
      .select("uuid, vendor_uuid, status")
      .eq("project_uuid", projectUuid)
      .eq("corporation_uuid", corporationUuid)
      .in("status", ["Approved", "Partially_Received", "Completed"]);

    // Filter by vendor if provided
    if (vendorUuid) {
      poQuery = poQuery.eq("vendor_uuid", vendorUuid);
    }

    const { data: poData, error: poError } = await poQuery;

    if (poError) {
      throw createError({
        statusCode: 500,
        statusMessage: poError.message || "Failed to fetch purchase orders",
      });
    }

    const poUuids = (poData || []).map((po) => po.uuid);

    // Group estimate items by unique key to aggregate quantities from multiple estimates
    const estimateItemsMap = new Map<string, any>();
    
    allEstimateItems.forEach((item: any) => {
      // Build key exactly like PO items (cost_code + item_uuid + sequence + location)
      // Use location UUID for matching if available, otherwise use location name
      const locationUuid = item.location_uuid || null;
      const locationDisplay = item.location || "";
      const locationKey = locationUuid || locationDisplay || "";
      
      // Use empty string for null/undefined values to ensure consistent matching
      const costCodeKey = item.cost_code_uuid || "";
      const itemUuidKey = item.item_uuid || "";
      const sequenceKey = item.sequence || "";
      const locationKeyStr = locationKey || "";
      const key = `${costCodeKey}_${itemUuidKey}_${sequenceKey}_${locationKeyStr}`;
      
      const existing = estimateItemsMap.get(key);
      if (existing) {
        // Aggregate quantities if same item appears in multiple estimates
        existing.quantity += item.quantity || 0;
      } else {
        estimateItemsMap.set(key, {
          ...item,
          location_display: locationDisplay,
        });
      }
    });

    if (poUuids.length === 0) {
      // Return estimate items with zero PO quantities
      const result: any[] = [];
      estimateItemsMap.forEach((item: any) => {
        const budgetQty = parseFloat(item.quantity || 0) || 0;
        const itemLocation = item.location_display || item.location || item.location_uuid || "";
        
        // Filter by location if provided
        if (location && String(itemLocation).toLowerCase() !== location.toLowerCase()) {
          return;
        }
        
        // Get location display name
        const locationDisplayName = item.location_uuid && locationMap.has(item.location_uuid)
          ? locationMap.get(item.location_uuid) || itemLocation
          : itemLocation;

        result.push({
          corporation_name: corporationData?.corporation_name || "N/A",
          project_name: projectData.project_name
            ? `${projectData.project_name} ${projectData.project_id ? `#${projectData.project_id}` : ""}`
            : "N/A",
          cost_code_label: item.cost_code_label || "N/A",
          vendor_name: "N/A",
          sequence: item.sequence || "",
          item_type_label: item.item_type_label || "",
          item_name: item.item_name || "",
          description: item.description || "",
          location: locationDisplayName || "",
          budget_qty: budgetQty,
          po_qty: 0,
          pending_qty: budgetQty,
          status: "Pending",
        });
      });

      return { data: result };
    }

    // Get all PO items for these purchase orders
    const { data: poItemsData, error: poItemsError } = await supabaseServer
      .from("purchase_order_items_list")
      .select(
        "uuid, purchase_order_uuid, cost_code_uuid, item_uuid, location_uuid, quantity, po_quantity, metadata"
      )
      .in("purchase_order_uuid", poUuids)
      .eq("is_active", true);

    if (poItemsError) {
      throw createError({
        statusCode: 500,
        statusMessage: poItemsError.message || "Failed to fetch purchase order items",
      });
    }

    // Get vendor names
    const vendorUuids = new Set((poData || []).map((po) => po.vendor_uuid).filter(Boolean));
    let vendorMap = new Map<string, string>();

    if (vendorUuids.size > 0) {
      const { data: vendorsData, error: vendorsError } = await supabaseServer
        .from("vendors")
        .select("uuid, vendor_name")
        .in("uuid", Array.from(vendorUuids));

      if (!vendorsError && vendorsData) {
        vendorsData.forEach((v: any) => {
          if (v.uuid) vendorMap.set(v.uuid, v.vendor_name || "N/A");
        });
      }
    }

    // Create a map of PO UUID to vendor UUID
    const poVendorMap = new Map<string, string>();
    (poData || []).forEach((po: any) => {
      if (po.uuid && po.vendor_uuid) {
        poVendorMap.set(po.uuid, po.vendor_uuid);
      }
    });

    // Aggregate PO quantities by item key (cost_code + item_uuid + sequence + location)
    // Use the same matching logic as estimate items
    const poQuantitiesMap = new Map<string, { qty: number; vendorUuid: string | null }>();
    (poItemsData || []).forEach((item: any) => {
      // Extract sequence from metadata JSONB field (same as estimate items)
      const metadata = item.metadata || {};
      const sequence = metadata.sequence || item.sequence || item.item_sequence || item.sequence_uuid || "";
      
      // Normalize location (handle both UUID and label)
      const locationUuid = item.location_uuid || null;
      // Use location UUID for matching if available, otherwise use location label
      const locationKey = locationUuid || (item.location_label || item.location || "");
      
      // Build key exactly like estimate items - use empty string for null/undefined values
      const costCodeKey = item.cost_code_uuid || "";
      const itemUuidKey = item.item_uuid || "";
      const sequenceKey = sequence || "";
      const locationKeyStr = locationKey || "";
      const key = `${costCodeKey}_${itemUuidKey}_${sequenceKey}_${locationKeyStr}`;
      
      const current = poQuantitiesMap.get(key) || { qty: 0, vendorUuid: null };
      // Use po_quantity if available, otherwise quantity
      const itemQty = parseFloat(item.po_quantity || item.quantity || 0) || 0;
      const vendorUuid = poVendorMap.get(item.purchase_order_uuid) || null;
      
      poQuantitiesMap.set(key, {
        qty: current.qty + itemQty,
        vendorUuid: vendorUuid || current.vendorUuid,
      });
    });

    // Build result from aggregated estimate items
    const result: any[] = [];
    estimateItemsMap.forEach((item: any) => {
      // Build key for matching with PO items (must match exactly how we built it above)
      const locationUuid = item.location_uuid || null;
      const locationDisplay = item.location || "";
      const locationKey = locationUuid || locationDisplay || "";
      
      const costCodeKey = item.cost_code_uuid || "";
      const itemUuidKey = item.item_uuid || "";
      const sequenceKey = item.sequence || "";
      const locationKeyStr = locationKey || "";
      const key = `${costCodeKey}_${itemUuidKey}_${sequenceKey}_${locationKeyStr}`;
      
      const budgetQty = parseFloat(item.quantity || 0) || 0;
      const poData = poQuantitiesMap.get(key) || { qty: 0, vendorUuid: null };
      const poQty = poData.qty;
      const pendingQty = Math.max(0, budgetQty - poQty);

      // Determine status
      let status = "Pending";
      if (poQty > 0 && poQty < budgetQty) {
        status = "Partial";
      } else if (poQty >= budgetQty && budgetQty > 0) {
        status = "Complete";
      }

      // Get vendor name
      let vendorName = "N/A";
      if (vendorUuid && vendorMap.has(vendorUuid)) {
        vendorName = vendorMap.get(vendorUuid) || "N/A";
      } else if (poData.vendorUuid && vendorMap.has(poData.vendorUuid)) {
        vendorName = vendorMap.get(poData.vendorUuid) || "N/A";
      }

      // Get location display name
      const itemLocation = item.location_display || item.location || "";
      const locationDisplayName = locationUuid && locationMap.has(locationUuid)
        ? locationMap.get(locationUuid) || itemLocation
        : itemLocation;

      // Filter by location if provided
      if (location && String(locationDisplayName).toLowerCase() !== location.toLowerCase()) {
        return;
      }

      result.push({
        corporation_name: corporationData?.corporation_name || "N/A",
        project_name: projectData.project_name
          ? `${projectData.project_name} ${projectData.project_id ? `#${projectData.project_id}` : ""}`
          : "N/A",
        cost_code_label: item.cost_code_label || "N/A",
        vendor_name: vendorName,
        sequence: item.sequence || "",
        item_type_label: item.item_type_label || "",
        item_name: item.item_name || "",
        description: item.description || "",
        location: locationDisplayName || "",
        budget_qty: budgetQty,
        po_qty: poQty,
        pending_qty: pendingQty,
        status: status,
      });
    });

    return { data: result };
  } catch (error: any) {
    console.error("project-items-summary API failure", error);
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Unexpected error",
    });
  }
});

