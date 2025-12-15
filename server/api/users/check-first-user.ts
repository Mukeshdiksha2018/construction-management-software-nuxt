import { supabaseServer } from "~/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "GET") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  try {
    // Check if any user profiles exist
    const { data: profiles, error: profilesError } = await supabaseServer
      .from('user_profiles')
      .select('id')
      .limit(1);

    if (profilesError) {
      console.error("Error checking user profiles:", profilesError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to check user existence",
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
      statusCode: 500,
      statusMessage: error.message || "Internal server error",
    });
  }
});
