import { supabaseServer } from "~/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "POST") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  try {
    const body = await readBody(event);
    const { userId, firstName, lastName, password } = body;

    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: "User ID is required",
      });
    }

    if (!firstName || !lastName) {
      throw createError({
        statusCode: 400,
        statusMessage: "First name and last name are required",
      });
    }

    if (!password || password.length < 8) {
      throw createError({
        statusCode: 400,
        statusMessage: "Password is required and must be at least 8 characters long",
      });
    }

    // Update user password using admin client
    const { error: passwordError } = await supabaseServer.auth.admin.updateUserById(
      userId,
      { password }
    );

    if (passwordError) {
      console.error("Error updating password:", passwordError);
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to update password: ${passwordError.message}`,
      });
    }

    // Update user metadata with first and last name
    const { error: metadataError } = await supabaseServer.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      }
    );

    if (metadataError) {
      console.warn("Failed to update user metadata:", metadataError);
      // Continue anyway as the main signup was successful
    }

    // Update or create user profile
    const profileData = {
      user_id: userId,
      status: 'active',
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      updated_at: new Date().toISOString(),
    };

    // Try to update existing profile first
    const { data: updateData, error: updateError } = await supabaseServer
      .from('user_profiles')
      .update(profileData)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      // If profile doesn't exist, create it
      if (updateError.code === 'PGRST116' || updateError.message.includes('No rows found')) {
        const { data: insertData, error: insertError } = await supabaseServer
          .from('user_profiles')
          .insert({
            ...profileData,
            invited_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating user profile:", insertError);
          throw createError({
            statusCode: 500,
            statusMessage: `Failed to create user profile: ${insertError.message}`,
          });
        }

        return {
          success: true,
          data: insertData,
          message: "Signup completed successfully",
        };
      } else {
        console.error("Error updating user profile:", updateError);
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to update user profile: ${updateError.message}`,
        });
      }
    }

    // Verify the profile was saved correctly
    const { data: verifyProfile, error: verifyError } = await supabaseServer
      .from('user_profiles')
      .select('first_name, last_name, status')
      .eq('user_id', userId)
      .single();

    if (verifyError) {
      console.error("Error verifying profile save:", verifyError);
      throw createError({
        statusCode: 500,
        statusMessage: "Profile verification failed",
      });
    }

    if (!verifyProfile.first_name || !verifyProfile.last_name) {
      console.error("Profile data not saved correctly:", verifyProfile);
      throw createError({
        statusCode: 500,
        statusMessage: "Profile data not saved correctly",
      });
    }

    return {
      success: true,
      data: updateData,
      message: "Signup completed successfully",
    };
  } catch (error: any) {
    console.error("Complete signup error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || "Internal server error",
    });
  }
});

