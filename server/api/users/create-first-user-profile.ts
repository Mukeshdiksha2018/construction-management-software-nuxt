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

    // Fetch all corporations to grant Super Admin access to all of them
    // Using service role key so this works even if user is not authenticated yet
    const { data: corporations, error: corporationsError } = await supabaseServer
      .from("properties")
      .select("uuid");

    if (corporationsError) {
      console.error("Error fetching corporations:", corporationsError);
      // Log the full error for debugging
      console.error("Corporations error details:", {
        message: corporationsError.message,
        code: corporationsError.code,
        details: corporationsError.details,
        hint: corporationsError.hint
      });
      // Don't fail if corporations don't exist yet - just use empty array
    }

    // Extract corporation UUIDs and ensure they're valid UUIDs
    const corporationUuids = corporations?.map(corp => corp.uuid).filter(Boolean) || [];
    
    console.log("=== Corporation Fetch Debug ===");
    console.log("Fetched corporations count:", corporations?.length || 0);
    console.log("Fetched corporations:", JSON.stringify(corporations, null, 2));
    console.log("Extracted corporation UUIDs:", JSON.stringify(corporationUuids, null, 2));
    console.log("Corporation UUIDs array length:", corporationUuids.length);

    // Create the user profile with Super Admin role and access to all corporations
    const profileData = {
      user_id: userId,
      first_name: username,
      role_id: superAdminRole.id,
      status: 'active',
      corporation_access: corporationUuids, // Always set the array, even if empty
    };

    console.log("=== Profile Data Before Insert ===");
    console.log("Creating user profile with data:", JSON.stringify(profileData, null, 2));
    console.log("corporation_access type:", typeof profileData.corporation_access);
    console.log("corporation_access is array:", Array.isArray(profileData.corporation_access));

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
      debug: {
        corporationsFetched: corporations?.length || 0,
        corporationUuids: corporationUuids,
        savedCorporationAccess: profile?.corporation_access,
      }
    };
  } catch (error: any) {
    console.error("Create first user profile error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || "Internal server error",
    });
  }
});
