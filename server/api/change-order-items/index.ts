import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  try {
    if (method === "GET") {
      const query = getQuery(event);
      const { change_order_uuid } = query;
      if (!change_order_uuid || typeof change_order_uuid !== "string") {
        throw createError({
          statusCode: 400,
          statusMessage: "change_order_uuid is required",
        });
      }
      const { data, error } = await supabaseServer
        .from("change_order_items_list")
        .select("*")
        .eq("change_order_uuid", change_order_uuid);
      if (error)
        throw createError({ statusCode: 500, statusMessage: error.message });
      return { data: Array.isArray(data) ? data : [] };
    }
    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  } catch (error: any) {
    console.error("change-order-items API error:", error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});


