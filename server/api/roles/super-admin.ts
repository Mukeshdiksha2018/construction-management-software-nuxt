import { supabaseServer } from "~/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "GET") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  try {
    // Get the Super Admin role
    const { data: role, error } = await supabaseServer
      .from("roles")
      .select("id, role_name")
      .eq("role_name", "Super Admin")
      .single();

    if (error) {
      console.error("Error fetching Super Admin role:", error);
      throw createError({
        statusCode: 404,
        statusMessage: "Super Admin role not found",
      });
    }

    return {
      success: true,
      data: role,
    };
  } catch (error: any) {
    console.error("Get Super Admin role error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Internal server error",
    });
  }
});
