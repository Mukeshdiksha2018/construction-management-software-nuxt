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

    // If this is a Super Admin, grant access to all corporations
    let corporationUuids: string[] = [];
    if (role.role_name === "Super Admin") {
      const { data: corporations, error: corporationsError } = await supabaseServer
        .from("properties")
        .select("uuid");

      if (corporationsError) {
        console.warn("Error fetching corporations:", corporationsError);
        // Don't fail if corporations don't exist yet - just use empty array
      } else {
        corporationUuids = corporations?.map(corp => corp.uuid).filter(Boolean) || [];
        console.log("Fetched corporations for Super Admin:", corporations);
        console.log("Extracted corporation UUIDs:", corporationUuids);
      }
    }

    // Create the user profile with the specified role
    const profileData = {
      user_id: userId,
      first_name: username,
      role_id: role.id,
      status: 'active',
      corporation_access: corporationUuids.length > 0 ? corporationUuids : [], // Super Admin gets all corporations, others get empty array
    };

    console.log("Creating user profile with data:", JSON.stringify(profileData, null, 2));

    const { data: profile, error: profileError } = await supabaseServer
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single();

    console.log("Profile creation result:", { profile, profileError });
    console.log("Saved corporation_access:", profile?.corporation_access);

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

