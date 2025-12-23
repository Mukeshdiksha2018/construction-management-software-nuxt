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
    const { imageData, fileName, customerUuid, oldImageUrl } = body;

    if (!imageData || !fileName) {
      return { error: "Image data and file name are required" };
    }

    // If updating and old image exists, delete it first
    if (oldImageUrl && customerUuid) {
      try {
        // Extract filename from the old URL
        const urlParts = oldImageUrl.split("/");
        const oldFileName = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params if any

        if (oldFileName) {
          // Delete the old image from storage
          const { error: deleteError } = await supabaseAdmin.storage
            .from("customer_images")
            .remove([oldFileName]);

          if (deleteError) {
            console.error("Error deleting old image:", deleteError);
            // Continue with upload even if delete fails
          }
        }
      } catch (error) {
        console.error("Error processing old image:", error);
        // Continue with upload even if old image processing fails
      }
    }

    // Convert base64 to buffer
    const base64Data = imageData.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename with timestamp
    const fileExtension = fileName.split(".").pop();
    const uniqueFileName = `customer_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExtension}`;

    // Upload new image
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("customer_images")
      .upload(uniqueFileName, buffer, {
        contentType: `image/${fileExtension}`,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return { error: uploadError.message };
    }

    // Get public URL for the uploaded image
    const { data: urlData } = supabaseAdmin.storage
      .from("customer_images")
      .getPublicUrl(uniqueFileName);

    const imageUrl = urlData.publicUrl;

    return {
      success: true,
      message: "Image uploaded successfully",
      data: {
        imageUrl: imageUrl,
        fileName: uniqueFileName
      }
    };

  } catch (error) {
    console.error("Upload image error:", error);
    return {
      error: error instanceof Error ? error.message : "An error occurred while uploading the image"
    };
  }
});

