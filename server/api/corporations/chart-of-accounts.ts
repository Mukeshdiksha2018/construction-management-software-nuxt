import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);
  const body =
    method === "POST" || method === "PUT" ? await readBody(event) : null;

  try {
    if (method === "GET") {
      // Fetch chart of accounts for a specific corporation
      const { corporation_uuid } = query;

      const { data, error } = await supabaseServer
        .from("chart_of_accounts")
        .select("*")
        .eq("corporation_uuid", corporation_uuid)
        .order("code", { ascending: true });

      if (error) {
        console.error("Supabase error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Database error: " + error.message,
        });
      }

      return { data: data || [] };
    }

    if (method === "POST") {
      // Add a new chart of account entry
      const { data, error } = await supabaseServer
        .from("chart_of_accounts")
        .insert([body])
        .select();

      if (error) {
        console.error("Error creating chart of account:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error creating chart of account: " + error.message,
        });
      }

      return { data: data || [] };
    }

    if (method === "PUT") {
      // Update chart of account
      const { id, ...updatedFields } = body;

      const { data, error } = await supabaseServer
        .from("chart_of_accounts")
        .update(updatedFields)
        .eq("id", id)
        .select();

      if (error) {
        console.error("Error updating chart of account:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error updating chart of account: " + error.message,
        });
      }

      return { data: data || [] };
    }

    if (method === "DELETE") {
      // Delete chart of account permanently
      const { id } = query;

      const { data, error } = await supabaseServer
        .from("chart_of_accounts")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting chart of account:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error deleting chart of account: " + error.message,
        });
      }

      return { success: true };
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  } catch (error: any) {
    console.error("Chart of Accounts API error:", error);

    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error;
    }

    // Otherwise, create a generic error
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
