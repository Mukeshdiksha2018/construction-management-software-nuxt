import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "GET") {
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
          persistSession: false
        }
      }
    );

    // Get all users using Supabase admin
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error("Supabase list users error:", error);
      return { error: error.message };
    }

    // Get all user profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('*');

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      // Continue with just user data if profiles fail
    }

    // Create a map of profiles by user_id for quick lookup
    const profilesMap = new Map();
    if (profiles) {
      profiles.forEach(profile => {
        profilesMap.set(profile.user_id, profile);
      });
    }

    // Transform the data to match our expected format
    const users = data.users.map(user => {
      const profile = profilesMap.get(user.id);

      // Determine final status based on profile and auth status
      let status = profile?.status || "pending";

      // If user is banned in auth, override with inactive
      if (
        user.app_metadata?.ban_duration &&
        user.app_metadata.ban_duration !== "0"
      ) {
        status = "inactive";
      }

              return {
                id: user.id,
                email: user.email,
                firstName: profile?.first_name || "",
                lastName: profile?.last_name || "",
                phone: profile?.phone || "",
                address: profile?.address || "",
                roleId: profile?.role_id || undefined,
                imageUrl: profile?.image_url || undefined,
                status: status,
                createdAt: user.created_at,
                lastSignIn: user.last_sign_in_at,
                invitedAt: profile?.invited_at || null,
                recentProperty: profile?.recent_property || null,
                corporationAccess: profile?.corporation_access || [],
              };
    });

    return {
      success: true,
      data: users
    };

  } catch (error) {
    console.error("List users error:", error);
    return { 
      error: error instanceof Error ? error.message : "An error occurred while fetching users" 
    };
  }
});
