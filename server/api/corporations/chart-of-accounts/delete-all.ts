import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  if (method !== "DELETE") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  try {
    const query = getQuery(event);
    const { corporation_uuid } = query;

    if (!corporation_uuid) {
      throw createError({
        statusCode: 400,
        statusMessage: "Corporation UUID is required",
      });
    }

    // Delete all accounts for this corporation
    const { data, error } = await supabaseServer
      .from("chart_of_accounts")
      .delete()
      .eq("corporation_uuid", corporation_uuid);

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: "Error deleting all chart of accounts: " + error.message,
      });
    }

    return { success: true, message: "All accounts deleted successfully" };
  } catch (error: any) {
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
