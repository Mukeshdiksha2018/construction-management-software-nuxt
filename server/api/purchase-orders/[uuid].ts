import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const uuid = getRouterParam(event, "uuid");

  if (!uuid) {
    throw createError({
      statusCode: 400,
      statusMessage: "Purchase order UUID is required",
    });
  }

  try {
    if (method === "GET") {
      const { data, error } = await supabaseServer
        .from("purchase_orders")
        .select(`
          *,
          po_items:po_items(*)
        `)
        .eq("uuid", uuid)
        .maybeSingle();

      if (error) {
        console.error("Supabase error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Database error: " + error.message,
        });
      }

      if (!data) {
        throw createError({
          statusCode: 404,
          statusMessage: "Purchase order not found",
        });
      }

      return { data };
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
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

