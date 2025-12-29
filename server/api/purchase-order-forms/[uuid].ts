import { supabaseServer } from "@/utils/supabaseServer";
import { decoratePurchaseOrderRecord } from "./utils";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const uuid = getRouterParam(event, "uuid");

  if (!uuid) {
    throw createError({
      statusCode: 400,
      statusMessage: "Form UUID is required",
    });
  }

  try {
    if (method === "GET") {
      const { data, error } = await supabaseServer
        .from("purchase_order_forms")
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
          )
        `)
        .eq("uuid", uuid)
        .maybeSingle();

      if (error)
        throw createError({ statusCode: 500, statusMessage: error.message });
      if (!data)
        throw createError({ statusCode: 404, statusMessage: "Form not found" });
      
      const decoratedData = decoratePurchaseOrderRecord({ ...data });
      
      // Add metadata fields for easy access in the list view
      // Always set these fields, even if null, for consistency
      if ((data as any).project) {
        (decoratedData as any).project_name = (data as any).project.project_name || null;
        (decoratedData as any).project_id = (data as any).project.project_id || null;
      } else {
        (decoratedData as any).project_name = null;
        (decoratedData as any).project_id = null;
      }
      if ((data as any).vendor) {
        (decoratedData as any).vendor_name = (data as any).vendor.vendor_name || null;
      } else {
        (decoratedData as any).vendor_name = null;
      }
      
      // If this is a LABOR PO, fetch labor items
      const normalizedPoType = (decoratedData.po_type || "").toUpperCase();
      if (normalizedPoType === "LABOR") {
        try {
          const { data: laborItems, error: laborError } = await supabaseServer
            .from("labor_purchase_order_items_list")
            .select("*")
            .eq("purchase_order_uuid", uuid)
            .eq("is_active", true)
            .order("order_index", { ascending: true });

          if (laborError) {
            console.error("Error fetching labor items:", laborError);
          } else {
            // Map labor items to the format expected by the frontend
            (decoratedData as any).labor_po_items = Array.isArray(laborItems)
              ? laborItems.map((item: any) => ({
                  id: item.id || item.uuid,
                  cost_code_uuid: item.cost_code_uuid,
                  cost_code_number: item.cost_code_number,
                  cost_code_name: item.cost_code_name,
                  cost_code_label: item.cost_code_label || 
                    (item.cost_code_number && item.cost_code_name
                      ? `${item.cost_code_number} ${item.cost_code_name}`.trim()
                      : item.cost_code_number || item.cost_code_name || null),
                  division_name: item.division_name,
                  labor_budgeted_amount: item.labor_budgeted_amount,
                  po_amount: item.po_amount,
                  order_index: item.order_index,
                  metadata: item.metadata || {},
                }))
              : [];
          }
        } catch (laborFetchError: any) {
          console.error("Error fetching labor purchase order items:", laborFetchError);
          (decoratedData as any).labor_po_items = [];
        }
      }
      
      return { data: decoratedData };
    }

    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  } catch (error: any) {
    console.error("purchase-order-forms/[uuid] error:", error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});


