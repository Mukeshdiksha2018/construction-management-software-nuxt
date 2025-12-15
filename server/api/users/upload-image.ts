import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "POST") {
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
          persistSession: false,
        },
      }
    );

    const body = await readBody(event);
    const { userId, imageData, fileName } = body;

    if (!userId || !imageData || !fileName) {
      return { error: "User ID, image data, and file name are required" };
    }

    // Convert base64 to buffer
    const base64Data = imageData.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    // Check if user already has an image and get the old filename
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('image_url')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("Error checking existing profile:", profileError);
      return { error: profileError.message };
    }

    // If user has an existing image, extract filename and delete it
    let oldFileName = null;
    if (existingProfile?.image_url) {
      try {
        // Extract filename from the URL
        const urlParts = existingProfile.image_url.split("/");
        oldFileName = urlParts[urlParts.length - 1];

        // Delete the old image from storage
        const { error: deleteError } = await supabaseAdmin.storage
          .from("user_images")
          .remove([oldFileName]);

        if (deleteError) {
          console.error("Error deleting old image:", deleteError);
          // Continue with upload even if delete fails
        } else {
        }
      } catch (error) {
        console.error("Error processing old image:", error);
        // Continue with upload even if old image processing fails
      }
    }

    // Generate consistent filename (without timestamp to enable replacement)
    const fileExtension = fileName.split(".").pop();
    const consistentFileName = `${userId}.${fileExtension}`;

    // Upload new image with upsert: true to replace if exists
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("user_images")
      .upload(consistentFileName, buffer, {
        contentType: `image/${fileExtension}`,
        cacheControl: "3600",
        upsert: true, // This will replace existing file with same name
      });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return { error: uploadError.message };
    }

    // Get public URL for the uploaded image
    const { data: urlData } = supabaseAdmin.storage
      .from("user_images")
      .getPublicUrl(consistentFileName);

    const imageUrl = urlData.publicUrl;

    try {
      const { data: bucketContents, error: listError } =
        await supabaseAdmin.storage.from("user_images").list("", { limit: 10 });

      if (listError) {
        console.error("Error listing bucket contents:", listError);
      } else {
      }
    } catch (error) {
      console.error("Error checking bucket contents:", error);
    }

    // Update user profile with image URL
    const { error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .upsert(
        {
          user_id: userId,
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (updateError) {
      console.error("Error updating profile with image URL:", updateError);
      return { error: updateError.message };
    }

    // Verify the update by fetching the profile
    const { data: verifyProfile, error: verifyError } = await supabaseAdmin
      .from("user_profiles")
      .select("image_url")
      .eq("user_id", userId)
      .single();

    if (verifyError) {
      console.error("Error verifying profile update:", verifyError);
    } else {
    }

    return {
      success: true,
      message: "Image uploaded successfully",
      data: {
        imageUrl: imageUrl,
        fileName: consistentFileName
      }
    };

  } catch (error) {
    console.error("Upload image error:", error);
    return {
      error: error instanceof Error ? error.message : "An error occurred while uploading the image"
    };
  }
});
