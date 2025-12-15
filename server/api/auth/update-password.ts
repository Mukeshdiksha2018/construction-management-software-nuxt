import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "POST") {
    return { error: "Method not allowed" };
  }

  try {
    const body = await readBody(event);
    const { password } = body;

    if (!password || password.length < 8) {
      return { error: "Password must be at least 8 characters long" };
    }

    // Get the current user session
    const authHeader = getHeader(event, 'authorization');
    if (!authHeader) {
      return { error: "No authorization header" };
    }

    // Extract the token from the Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Set the auth context for this request
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return { error: "Invalid or expired session" };
    }

    // Update the user's password
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      return { error: error.message };
    }

    return { 
      success: true, 
      message: "Password has been successfully updated" 
    };
  } catch (error) {
    console.error("Update password error:", error);
    return { error: "An error occurred while updating your password" };
  }
});
