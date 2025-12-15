import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "POST") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  try {
    const body = await readBody(event);
    const { action, bill_entry_ids, corporation_uuid } = body;

    if (!action || !bill_entry_ids || !Array.isArray(bill_entry_ids)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing required fields: action and bill_entry_ids array are required",
      });
    }

    if (action === "approve") {
      // Bulk approve bill entries
      const { data, error } = await supabaseServer
        .from("bill_entries")
        .update({
          approval_status: "Approved",
          updated_at: new Date().toISOString(),
        })
        .in("id", bill_entry_ids)
        .eq("corporation_uuid", corporation_uuid)
        .select();

      if (error) {
        console.error("Bulk approve error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Database error: " + error.message,
        });
      }

      return {
        success: true,
        data: data || [],
        message: `Successfully approved ${data?.length || 0} bill entries`,
      };
    }

    if (action === "reject") {
      // Bulk reject bill entries
      const { data, error } = await supabaseServer
        .from("bill_entries")
        .update({
          approval_status: "Rejected",
          updated_at: new Date().toISOString(),
        })
        .in("id", bill_entry_ids)
        .eq("corporation_uuid", corporation_uuid)
        .select();

      if (error) {
        console.error("Bulk reject error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Database error: " + error.message,
        });
      }

      return {
        success: true,
        data: data || [],
        message: `Successfully rejected ${data?.length || 0} bill entries`,
      };
    }

    if (action === "delete") {
      // Bulk delete bill entries
      const { data, error } = await supabaseServer
        .from("bill_entries")
        .delete()
        .in("id", bill_entry_ids)
        .eq("corporation_uuid", corporation_uuid)
        .select();

      if (error) {
        console.error("Bulk delete error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Database error: " + error.message,
        });
      }

      return {
        success: true,
        data: data || [],
        message: `Successfully deleted ${data?.length || 0} bill entries`,
      };
    }

    throw createError({
      statusCode: 400,
      statusMessage: "Invalid action. Supported actions: approve, reject, delete",
    });
  } catch (error: any) {
    console.error("Bulk bill entries API error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Internal server error",
    });
  }
});
