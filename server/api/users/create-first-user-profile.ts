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
    const { userId, username } = body;

    if (!userId || !username) {
      throw createError({
        statusCode: 400,
        statusMessage: "User ID and username are required",
      });
    }

    // First, check if this is really the first user
    const { data: existingProfiles, error: checkError } = await supabaseServer
      .from('user_profiles')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error("Error checking existing profiles:", checkError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to check existing users",
      });
    }

    if (existingProfiles && existingProfiles.length > 0) {
      throw createError({
        statusCode: 403,
        statusMessage: "User profiles already exist. This endpoint is only for the first user.",
      });
    }

    // Get the Super Admin role ID
    const { data: superAdminRole, error: roleError } = await supabaseServer
      .from("roles")
      .select("id, role_name")
      .eq("role_name", "Super Admin")
      .single();

    // console.log("Super Admin role query result:", { superAdminRole, roleError });

    if (roleError || !superAdminRole) {
      console.error("Error fetching Super Admin role:", roleError);
      throw createError({
        statusCode: 500,
        statusMessage: `Super Admin role not found. Error: ${roleError?.message || 'Unknown error'}`,
      });
    }

    // Create the user profile with Super Admin role
    const profileData = {
      user_id: userId,
      first_name: username,
      role_id: superAdminRole.id,
      status: 'active',
      corporation_access: [], // Will be set by admin later
    };

    // console.log("Creating user profile with data:", profileData);

    const { data: profile, error: profileError } = await supabaseServer
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single();

    // console.log("Profile creation result:", { profile, profileError });

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
    console.error("Create first user profile error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || "Internal server error",
    });
  }
});
