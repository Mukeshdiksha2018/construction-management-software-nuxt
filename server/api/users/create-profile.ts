import { supabaseServer } from "~/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "POST") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  try {
    const body = await readBody(event);
    const { userId, username, roleName } = body;

    if (!userId || !username) {
      throw createError({
        statusCode: 400,
        statusMessage: "User ID and username are required",
      });
    }

    // Get the role ID (default to Super Admin if not specified)
    const roleToFind = roleName || "Super Admin";
    const { data: role, error: roleError } = await supabaseServer
      .from("roles")
      .select("id, role_name")
      .eq("role_name", roleToFind)
      .single();

    if (roleError || !role) {
      console.error("Error fetching role:", roleError);
      throw createError({
        statusCode: 500,
        statusMessage: `Role "${roleToFind}" not found. Error: ${roleError?.message || 'Unknown error'}`,
      });
    }

    // Create the user profile with the specified role
    const profileData = {
      user_id: userId,
      first_name: username,
      role_id: role.id,
      status: 'active',
      corporation_access: [], // Will be set by admin later
    };

    const { data: profile, error: profileError } = await supabaseServer
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single();

    if (profileError) {
      console.error("Error creating user profile:", profileError);
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to create user profile. Error: ${profileError.message}`,
      });
    }

    return {
      success: true,
      data: profile,
    };
  } catch (error: any) {
    console.error("Create user profile error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || "Internal server error",
    });
  }
});

