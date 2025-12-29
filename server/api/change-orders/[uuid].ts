import { supabaseServer } from "@/utils/supabaseServer";
import { decorateChangeOrderRecord } from "./utils";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const uuid = getRouterParam(event, "uuid");

  if (!uuid) {
    throw createError({
      statusCode: 400,
      statusMessage: "Change order UUID is required",
    });
  }

  try {
    if (method === "GET") {
      const { data, error } = await supabaseServer
        .from("change_orders")
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
          ),
          purchase_order:purchase_order_forms!original_purchase_order_uuid (
            uuid,
            po_number
          )
        `)
        .eq("uuid", uuid)
        .maybeSingle();

      if (error)
        throw createError({ statusCode: 500, statusMessage: error.message });
      if (!data)
        throw createError({ statusCode: 404, statusMessage: "Change order not found" });
      
      const decorated = decorateChangeOrderRecord(data as any);
      
      // Add metadata fields for easy access in the list view
      if ((data as any).project) {
        (decorated as any).project_name = (data as any).project.project_name || null;
        (decorated as any).project_id = (data as any).project.project_id || null;
      }
      if ((data as any).vendor) {
        (decorated as any).vendor_name = (data as any).vendor.vendor_name || null;
      }
      if ((data as any).purchase_order) {
        (decorated as any).po_number = (data as any).purchase_order.po_number || null;
      }
      
      return { data: decorated };
    }

    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  } catch (error: any) {
    console.error("change-orders/[uuid] error:", error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});


