import { supabaseServer } from "~/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = getMethod(event);
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Role ID is required",
    });
  }

  try {
    switch (method) {
      case "GET":
        // Get single role by ID
        const { data: role, error: fetchError } = await supabaseServer
          .from("roles")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError) {
          if (fetchError.code === "PGRST116") {
            throw createError({
              statusCode: 404,
              statusMessage: "Role not found",
            });
          }
          throw fetchError;
        }

        return {
          success: true,
          data: role,
        };

      case "PUT":
        // Update role
        const body = await readBody(event);

        // Validate required fields
        if (!body.role_name) {
          throw createError({
            statusCode: 400,
            statusMessage: "Role name is required",
          });
        }

        // Check if role exists
        const { data: existingRole } = await supabaseServer
          .from("roles")
          .select("id")
          .eq("id", id)
          .single();

        if (!existingRole) {
          throw createError({
            statusCode: 404,
            statusMessage: "Role not found",
          });
        }

        // Check if new role name conflicts with existing roles (excluding current role)
        const { data: nameConflict } = await supabaseServer
          .from("roles")
          .select("id")
          .eq("role_name", body.role_name)
          .neq("id", id)
          .single();

        if (nameConflict) {
          throw createError({
            statusCode: 409,
            statusMessage: "Role with this name already exists",
          });
        }

        // Update role
        const { data: updatedRole, error: updateError } = await supabaseServer
          .from("roles")
          .update({
            role_name: body.role_name,
            description: body.description || "",
            status: body.status || "active",
            permissions: body.permissions || [],
          })
          .eq("id", id)
          .select()
          .single();

        if (updateError) throw updateError;

        return {
          success: true,
          data: updatedRole,
        };

      case "DELETE":
        // Delete role
        const { data: roleToDelete } = await supabaseServer
          .from("roles")
          .select("id")
          .eq("id", id)
          .single();

        if (!roleToDelete) {
          throw createError({
            statusCode: 404,
            statusMessage: "Role not found",
          });
        }

        // Check if role has users assigned by querying the user_profiles table
        const { data: usersWithRole, error: userCheckError } =
          await supabaseServer
            .from("user_profiles")
            .select("user_id")
            .eq("role_id", id)
            .limit(1);

        if (userCheckError) {
          console.error("Error checking users for role:", userCheckError);
          throw createError({
            statusCode: 500,
            statusMessage: "Error checking role usage",
          });
        }

        if (usersWithRole && usersWithRole.length > 0) {
          throw createError({
            statusCode: 400,
            statusMessage: "Cannot delete role with assigned users",
          });
        }

        // Delete role
        const { error: deleteError } = await supabaseServer
          .from("roles")
          .delete()
          .eq("id", id);

        if (deleteError) throw deleteError;

        return {
          success: true,
          message: "Role deleted successfully",
        };

      default:
        throw createError({
          statusCode: 405,
          statusMessage: "Method not allowed",
        });
    }
  } catch (error: any) {
    console.error("Role API error:", error);

    return {
      success: false,
      error: error.message || "Internal server error",
    };
  }
});
