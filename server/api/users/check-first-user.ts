import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "GET") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  try {
    // Get runtime config for server-side only
    const config = useRuntimeConfig();

    // Validate config values
    if (!config.public.SUPABASE_URL) {
      throw createError({
        statusCode: 500,
        statusMessage: "SUPABASE_URL is not configured",
      });
    }

    if (!config.SUPABASE_SERVICE_ROLE_KEY) {
      throw createError({
        statusCode: 500,
        statusMessage: "SUPABASE_SERVICE_ROLE_KEY is not configured",
      });
    }

    // Create admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(
      config.public.SUPABASE_URL,
      config.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'apikey': config.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        },
      }
    );

    // Check if any user profiles exist
    // Use service role which should bypass RLS
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .limit(1);

    if (profilesError) {
      console.error("Error checking user profiles:", {
        message: profilesError.message,
        code: profilesError.code,
        details: profilesError.details,
        hint: profilesError.hint,
      });
      
      // If it's a permission error, provide more context
      if (profilesError.message.includes('permission denied')) {
        throw createError({
          statusCode: 500,
          statusMessage: `Permission denied. Please ensure the migration has been run and service role has proper permissions. Error: ${profilesError.message}`,
        });
      }
      
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to check user existence: ${profilesError.message}`,
      });
    }

    const isFirstUser = !profiles || profiles.length === 0;

    return {
      success: true,
      isFirstUser,
    };
  } catch (error: any) {
    console.error("Check first user error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || "Internal server error",
    });
  }
});
