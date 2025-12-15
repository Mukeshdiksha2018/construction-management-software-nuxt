import { createClient } from "@supabase/supabase-js";

export async function getAuthenticatedUser(event: any) {
  // Get runtime config for server-side
  const config = useRuntimeConfig();
  
  // Create Supabase client
  const supabase = createClient(
    config.public.SUPABASE_URL,
    config.public.SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    }
  );

  // Get user from session
  let user = null;
  
  // Try to get session from cookies first
  const accessToken = getCookie(event, "sb-access-token");
  const refreshToken = getCookie(event, "sb-refresh-token");

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (!error && data.session) {
      user = data.session.user;
    }
  }

  // Try Authorization header as fallback
  if (!user) {
    const authHeader = getHeader(event, "authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        user = data.user;
      }
    }
  }

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  return { user, supabase };
}
