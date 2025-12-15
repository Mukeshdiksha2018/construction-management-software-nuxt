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
        .select("*")
        .eq("uuid", uuid)
        .maybeSingle();

      if (error)
        throw createError({ statusCode: 500, statusMessage: error.message });
      if (!data)
        throw createError({ statusCode: 404, statusMessage: "Change order not found" });
      return { data: decorateChangeOrderRecord(data as any) };
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


