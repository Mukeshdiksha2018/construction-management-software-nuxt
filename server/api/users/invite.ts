import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "POST") {
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
    const { email } = body;

    if (!email) {
      return { error: "Email is required" };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { error: "Invalid email format" };
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser.users.some((user) => user.email === email);

    if (userExists) {
      return { error: "User with this email already exists" };
    }

    // Use the configured base URL for the redirect URL
    const baseUrl = config.public.BASE_URL;
    // Ensure no double slashes by removing trailing slash from baseUrl
    const cleanBaseUrl = baseUrl.replace(/\/$/, "");
    const redirectTo = `${cleanBaseUrl}/api/auth/callback?next=/auth/signup`;

    // Invite user using Supabase admin with redirect URL
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: redirectTo,
        data: {
          invited_at: new Date().toISOString(),
        },
      }
    );

    if (error) {
      console.error("Supabase invite error:", error);
      return { error: error.message };
    }

    // Create user profile entry
    if (data.user?.id) {
      const { error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .insert({
          user_id: data.user.id,
          status: "pending", // New invited users start as pending
          invited_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error("Error creating user profile:", profileError);
        // Don't fail the invite if profile creation fails
      }
    }

    return {
      success: true,
      message: "Invitation sent successfully",
      data: {
        email: data.user?.email,
        id: data.user?.id,
      },
    };
  } catch (error) {
    console.error("Invite user error:", error);
    return { 
      error: error instanceof Error ? error.message : "An error occurred while inviting the user" 
    };
  }
});
