import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const uuid = getRouterParam(event, 'uuid');

  if (!uuid) {
    throw createError({
      statusCode: 400,
      statusMessage: "Project UUID is required",
    });
  }

  try {
    if (method === "GET") {
      // Fetch a specific project by UUID
      const { data, error } = await supabaseServer
        .from("projects")
        .select("*")
        .eq("uuid", uuid)
        .eq("is_active", true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw createError({
            statusCode: 404,
            statusMessage: "Project not found",
          });
        }
        
        console.error("Supabase error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Database error: " + error.message,
        });
      }

      return { data };
    }

    if (method === "DELETE") {
      // Hard delete project (permanent deletion)
      const { data, error } = await supabaseServer
        .from("projects")
        .delete()
        .eq("uuid", uuid)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw createError({
            statusCode: 404,
            statusMessage: "Project not found",
          });
        }
        
        console.error("Error deleting project:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error deleting project: " + error.message,
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
