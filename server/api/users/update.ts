import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "PUT") {
    return { error: "Method not allowed" };
  }

  try {
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

    const body = await readBody(event);

    const {
      userId,
      email,
      firstName,
      lastName,
      phone,
      address,
      status,
      roleId,
      recentProperty,
      corporationAccess,
    } = body;

    if (!userId) {
      return { error: "User ID is required" };
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: "Invalid email format" };
    }

    // Update user email if provided
    if (email) {
      const { error: emailError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, { email });

      if (emailError) {
        console.error("Error updating email:", emailError);
        return { error: emailError.message };
      }
    }

    // Update user profile in a separate table
    const profileData = {
      user_id: userId,
      first_name: firstName || null,
      last_name: lastName || null,
      phone: phone || null,
      address: address || null,
      role_id: roleId || null,
      status: status || "active", // Store status in user_profiles table
      image_url: body.imageUrl || null, // Handle image URL if provided
      recent_property: recentProperty || null, // Handle recent property preference
      corporation_access: corporationAccess || [], // Handle corporation access array
      updated_at: new Date().toISOString(),
    };

    // Try to update existing profile, if it doesn't exist, create it
    const { data: profileUpdate, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .upsert(profileData, {
        onConflict: "user_id",
        ignoreDuplicates: false,
      });

    if (profileError) {
      console.error("Error updating profile:", profileError);
      return { error: profileError.message };
    }

    // Handle status updates (ban/unban) for auth.users table as backup
    if (status === "inactive") {
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          ban_duration: "87600h", // Ban for 10 years (effectively permanent)
        }
      );

      if (banError) {
        console.error("Error banning user:", banError);
      } else {
      }
    }

    if (status === "active") {
      const { error: unbanError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: "0", // Remove ban
        });

      if (unbanError) {
        console.error("Error unbanning user:", unbanError);
      } else {
      }
    }

    // Fetch the updated profile to return
    const { data: updatedProfile, error: fetchError } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      console.error("Error fetching updated profile:", fetchError);
    }

    return {
      success: true,
      message: "User updated successfully",
      data: {
        id: userId,
        email: email || body.email, // Use provided email or existing
        firstName: updatedProfile?.first_name || firstName || "",
        lastName: updatedProfile?.last_name || lastName || "",
        phone: updatedProfile?.phone || phone || "",
        address: updatedProfile?.address || address || "",
        roleId: updatedProfile?.role_id || roleId || undefined,
        imageUrl: updatedProfile?.image_url || body.imageUrl || undefined,
        status: status || "active",
        recentProperty:
          updatedProfile?.recent_property || recentProperty || null,
      },
    };
  } catch (error) {
    console.error("Update user error:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "An error occurred while updating the user",
    };
  }
});
