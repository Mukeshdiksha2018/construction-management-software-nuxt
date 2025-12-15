import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  if (method !== "GET") {
    return { error: "Method not allowed" };
  }

  try {
    // Get runtime config for server-side
    const config = useRuntimeConfig();

    // Create Supabase client
    const supabase = createClient(
      config.public.SUPABASE_URL,
      config.public.SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
        },
      }
    );

    // Get the URL and search params
    const url = getRequestURL(event);
    const code = url.searchParams.get("code");
    const next = url.searchParams.get("next") || "/auth/signup";

    if (!code) {
      // If no code, redirect to the next page with error
      await sendRedirect(event, `${next}?error=Invalid invitation link`);
      return;
    }

    if (code) {
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Auth callback error:", error);
        // Redirect to signup page with error
        await sendRedirect(
          event,
          `/auth/signup?error=${encodeURIComponent(error.message)}`
        );
        return;
      }

      if (data.session) {
        // Set session cookies (for server-side access)
        setCookie(event, "sb-access-token", data.session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: data.session.expires_in,
        });

        setCookie(event, "sb-refresh-token", data.session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        // Redirect to the appropriate page based on the next parameter
        // Include tokens in the URL so the client-side can set the session
        // Use URL hash fragment to keep tokens more secure and accessible to client JS
        const redirectUrl = `${next}#access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}&type=invite&user_id=${data.session.user.id}`;
        await sendRedirect(event, redirectUrl);
        return;
      }
    }
  } catch (error) {
    console.error('Auth callback error:', error);
    // Fallback redirect URL in case we can't get it from the request
    const fallbackNext = "/auth/signup";
    await sendRedirect(
      event,
      `${fallbackNext}?error=${encodeURIComponent(
        "An error occurred processing your invitation"
      )}`
    );
  }
});
