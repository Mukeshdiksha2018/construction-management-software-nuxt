import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  if (method === "GET") {
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
    
    try {
      // Get cookies for session
      const accessToken = getCookie(event, "sb-access-token");
      const refreshToken = getCookie(event, "sb-refresh-token");

      if (accessToken && refreshToken) {
        // Set the session from cookies
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error && data.session) {
          return { user: data.session.user };
        }
      }

      // Try to get session from Authorization header
      const authHeader = getHeader(event, "authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const { data, error } = await supabase.auth.getUser(token);

        if (!error && data.user) {
          return { user: data.user };
        }
      }

      // Fetch user session as fallback
      const { data } = await supabase.auth.getSession();
      return { user: data?.session?.user || null };
    } catch (error) {
      console.error("Auth API error:", error);
      return { user: null };
    }
  }

  if (method === "POST") {
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
    
    try {
      // Logout
      await supabase.auth.signOut();

      // Clear cookies
      deleteCookie(event, "sb-access-token");
      deleteCookie(event, "sb-refresh-token");

      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return { success: false, error: "Logout failed" };
    }
  }

  return { error: "Method not allowed" };
});
