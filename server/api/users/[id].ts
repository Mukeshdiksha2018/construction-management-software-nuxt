import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  const method = getMethod(event);
  const id = getRouterParam(event, "id");

  if (method === "PUT") {
    try {
      const body = await readBody(event);

      // Mock user update - replace with actual database update
      const updatedUser = {
        id,
        ...body,
        roleName: "Unknown", // This should be fetched from roles table
        updatedAt: new Date().toISOString(),
      };

      return {
        success: true,
        data: updatedUser,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update user",
      };
    }
  }

  if (method === "DELETE") {
    try {
      if (!id) {
        return {
          success: false,
          error: "User ID is required",
        };
      }

      // Get runtime config for server-side only
      const config = useRuntimeConfig();

      // Create admin client only on server-side
      const supabaseAdmin = createClient(
        config.public.SUPABASE_URL,
        config.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      // First, check if user exists in auth.users
      const { data: userData, error: userCheckError } =
        await supabaseAdmin.auth.admin.getUserById(id);

      if (userCheckError || !userData.user) {
        console.error(`User ${id} not found in auth.users:`, userCheckError);
        return {
          success: false,
          error: "User not found in authentication system",
        };
      }

      // Additional safety check: prevent deletion of users with certain conditions
      if (
        userData.user.email === "admin@example.com" ||
        userData.user.email?.includes("admin")
      ) {
        console.warn(`Attempted to delete admin user: ${userData.user.email}`);
        return {
          success: false,
          error: "Cannot delete admin users",
        };
      }

      // Delete user image from storage if it exists
      try {
        // Get user profile to check for image
        const { data: userProfile, error: profileError } = await supabaseAdmin
          .from("user_profiles")
          .select("image_url")
          .eq("user_id", id)
          .single();

        if (!profileError && userProfile?.image_url) {
          // Extract filename from the URL, removing query parameters
          const urlParts = userProfile.image_url.split("/");
          const fileNameWithQuery = urlParts[urlParts.length - 1];
          const originalFileName = fileNameWithQuery.split("?")[0]; // Remove query parameters
          const fileExtension = originalFileName.split(".").pop();

          // Construct the actual stored filename (same format as upload)
          const storedFileName = `${id}.${fileExtension}`;

          // Delete the image from storage
          const { error: deleteImageError } = await supabaseAdmin.storage
            .from("user_images")
            .remove([storedFileName]);

          if (deleteImageError) {
            console.error(
              "Error deleting user image from storage:",
              deleteImageError
            );
            console.error("Failed to delete file:", storedFileName);
          } else {
          }
        } else {
        }
      } catch (imageError) {
        console.error("Error during user image cleanup:", imageError);
        // Continue with user deletion even if image cleanup fails
      }

      // Check if there are any other tables that might reference this user
      // This is a safety check for future tables that might be added
      const tablesToCheck = ["user_profiles", "user_images"];

      for (const tableName of tablesToCheck) {
        try {
          // Check if table exists and has any records for this user
          const { count, error: countError } = await supabaseAdmin
            .from(tableName)
            .select("*", { count: "exact", head: true })
            .eq("user_id", id);

          if (countError) {
            console.log(
              `Table ${tableName} doesn't exist or error checking:`,
              countError.message
            );
            continue;
          }

          if (count && count > 0) {
            const { error: deleteError } = await supabaseAdmin
              .from(tableName)
              .delete()
              .eq("user_id", id);

            if (deleteError) {
              console.error(`Error deleting from ${tableName}:`, deleteError);
              // Continue with other deletions even if this one fails
            } else {
            }
          } else {
          }
        } catch (tableError) {
          // Table might not exist, continue
        }
      }

      // Finally, delete the user from auth.users table
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
        id
      );

      if (authError) {
        console.error("Error deleting user from auth:", authError);
        return {
          success: false,
          error: `Failed to delete user from authentication: ${authError.message}`,
        };
      }

      return {
        success: true,
        message:
          "User deleted successfully from database and authentication system",
      };
    } catch (error) {
      console.error("Error in DELETE /api/users/[id]:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete user",
      };
    }
  }

  return createError({
    statusCode: 405,
    statusMessage: "Method Not Allowed",
  });
});
