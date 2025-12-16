import { supabaseServer } from "~/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "GET") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  try {
    const query = getQuery(event);
    const userId = query.userId as string;

    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: "User ID is required",
      });
    }

    // Get user profile using server-side client (bypasses RLS)
    const { data: profile, error: profileError } = await supabaseServer
      .from('user_profiles')
      .select('status, first_name, last_name, role_id, corporation_access')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      // If profile doesn't exist, return null instead of error
      if (profileError.code === 'PGRST116' || profileError.message.includes('No rows found')) {
        return {
          success: true,
          data: null,
        };
      }

      console.error("Error fetching user profile:", profileError);
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to fetch user profile: ${profileError.message}`,
      });
    }

    return {
      success: true,
      data: profile,
    };
  } catch (error: any) {
    console.error("Get profile error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || "Internal server error",
    });
  }
});

