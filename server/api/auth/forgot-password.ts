import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "POST") {
    return { error: "Method not allowed" };
  }

  try {
    const body = await readBody(event);
    const { email } = body;

    if (!email) {
      return { error: "Email is required" };
    }

    // Get runtime config for base URL
    const config = useRuntimeConfig();
    const baseUrl = config.public.BASE_URL;
    // Ensure no double slashes by removing trailing slash from baseUrl
    const cleanBaseUrl = baseUrl.replace(/\/$/, "");

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${cleanBaseUrl}/api/auth/callback?next=/reset-password`,
    });

    if (error) {
      return { error: error.message };
    }

    return {
      success: true,
      message: "Password reset link has been sent to your email",
    };
  } catch (error) {
    console.error("Forgot password error:", error);
    return { error: "An error occurred while processing your request" };
  }
});
