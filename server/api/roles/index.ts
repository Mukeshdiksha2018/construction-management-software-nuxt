import { supabaseServer } from "~/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = getMethod(event);


  try {
    switch (method) {
      case "GET":
        try {
          // Get all roles
          const { data: roles, error: fetchError } = await supabaseServer
            .from("roles")
            .select("*")
            .order("created_at", { ascending: false });

          if (fetchError) {
            console.error("Supabase error:", fetchError);
            throw fetchError;
          }

          return {
            success: true,
            data: roles,
          };
        } catch (dbError) {
          console.error("Database error:", dbError);
          throw dbError;
        }

      case "POST":
        // Create new role
        const body = await readBody(event);

        // Validate required fields
        if (!body.role_name) {
          throw createError({
            statusCode: 400,
            statusMessage: "Role name is required",
          });
        }

        // Check if role already exists
        const { data: existingRole } = await supabaseServer
          .from("roles")
          .select("id")
          .eq("role_name", body.role_name)
          .single();

        if (existingRole) {
          throw createError({
            statusCode: 409,
            statusMessage: "Role with this name already exists",
          });
        }

        // Insert new role
        const { data: newRole, error: insertError } = await supabaseServer
          .from("roles")
          .insert({
            role_name: body.role_name,
            description: body.description || "",
            status: body.status || "active",
            permissions: body.permissions || [],
          })
          .select()
          .single();

        if (insertError) throw insertError;

        return {
          success: true,
          data: newRole,
        };

      default:
        throw createError({
          statusCode: 405,
          statusMessage: "Method not allowed",
        });
    }
  } catch (error: any) {
    console.error("Roles API error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });

    return {
      success: false,
      error: error.message || "Internal server error",
    };
  }
});
