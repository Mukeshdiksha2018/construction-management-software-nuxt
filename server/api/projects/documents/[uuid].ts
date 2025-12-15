import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const uuid = getRouterParam(event, 'uuid');

  if (!uuid) {
    throw createError({
      statusCode: 400,
      statusMessage: "Document UUID is required",
    });
  }

  try {
    if (method === "GET") {
      // Fetch a specific project document by UUID
      const { data, error } = await supabaseServer
        .from("project_documents")
        .select("*")
        .eq("uuid", uuid)
        .eq("is_active", true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw createError({
            statusCode: 404,
            statusMessage: "Document not found",
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
      // Hard delete project document (permanent deletion)
      const { data, error } = await supabaseServer
        .from("project_documents")
        .delete()
        .eq("uuid", uuid)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw createError({
            statusCode: 404,
            statusMessage: "Document not found",
          });
        }
        
        console.error("Error deleting project document:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error deleting project document: " + error.message,
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
