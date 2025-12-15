import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const billEntryId = getRouterParam(event, 'id');
  const query = getQuery(event);

  if (!billEntryId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bill entry ID is required",
    });
  }

  // Corporation UUID is required for security
  const { corporation_uuid } = query;
  if (!corporation_uuid) {
    throw createError({
      statusCode: 400,
      statusMessage: "corporation_uuid is required",
    });
  }

  try {
    if (method === "GET") {
      // Get audit logs for a specific bill entry within the corporation
      const { data, error } = await supabaseServer
        .from("audit_logs")
        .select("*")
        .eq("entity_type", "bill_entry")
        .eq("entity_id", billEntryId)
        .eq("corporation_uuid", corporation_uuid)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Database error: " + error.message,
        });
      }

      return { 
        success: true,
        data: data || []
      };
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  } catch (error: any) {
    console.error("Bill entry audit logs API error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Internal server error",
    });
  }
});
