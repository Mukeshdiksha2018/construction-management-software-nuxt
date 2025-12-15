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
    const { billEntryId, fileData, fileName, fileType, fileSize } = body;

    if (!billEntryId || !fileData || !fileName) {
      return { error: "Bill Entry ID, file data, and file name are required" };
    }

    // Validate file type - only allow PDF, DOC, DOCX
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (fileType && !allowedTypes.includes(fileType)) {
      return {
        error: "Only PDF, DOC, and DOCX files are allowed for bill entries",
      };
    }

    // Convert base64 to buffer
    const base64Data = fileData.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");

    // Generate consistent filename (billEntryId + extension for easy replacement)
    const fileExtension = fileName.split(".").pop();
    const consistentFileName = `${billEntryId}.${fileExtension}`;

    // Check if bill entry already has an attachment and get the old filename
    const { data: existingBill, error: billError } = await supabaseAdmin
      .from("bill_entries")
      .select("attachments")
      .eq("id", billEntryId)
      .single();

    if (billError) {
      console.error("Error checking existing bill entry:", billError);
      return { error: billError.message };
    }

    // Find and delete any existing files for this bill entry
    try {
      // List all files in the bill_entries bucket
      const { data: allFiles, error: listError } = await supabaseAdmin.storage
        .from("bill_entries")
        .list();

      if (listError) {
        console.error("Error listing files:", listError);
      } else if (allFiles) {
        // Find files that start with our bill entry ID (handle different extensions)
        const filesToDelete = allFiles
          .filter((file) => file.name.startsWith(`${billEntryId}.`))
          .map((file) => file.name);

        // Delete all existing files for this bill entry
        if (filesToDelete.length > 0) {
          const { error: deleteError } = await supabaseAdmin.storage
            .from("bill_entries")
            .remove(filesToDelete);

          if (deleteError) {
            console.error("Error deleting existing files:", deleteError);
          } else {
          }
        }
      }
    } catch (error) {
      console.error("Error during file cleanup:", error);
      // Continue with upload even if cleanup fails
    }

    // Upload new attachment (old files already deleted above)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("bill_entries")
      .upload(consistentFileName, buffer, {
        contentType: fileType || `application/octet-stream`,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Error uploading attachment:", uploadError);
      return { error: uploadError.message };
    }

    // Get public URL for the uploaded attachment
    const { data: urlData } = supabaseAdmin.storage
      .from("bill_entries")
      .getPublicUrl(consistentFileName);

    // Add cache-busting parameter to prevent browser caching issues
    const timestamp = Date.now();
    const fileUrl = `${urlData.publicUrl}?t=${timestamp}`;

    // Create attachment object
    const attachment = {
      file_name: fileName,
      file_type: fileType || "application/octet-stream",
      file_size: fileSize || buffer.length,
      file_url: fileUrl,
    };

    // Update bill entry with the new attachment (replace existing)
    const { error: updateError } = await supabaseAdmin
      .from("bill_entries")
      .update({
        attachments: [attachment], // Only one attachment allowed
        updated_at: new Date().toISOString(),
      })
      .eq("id", billEntryId);

    if (updateError) {
      console.error("Error updating bill entry with attachment:", updateError);
      return { error: updateError.message };
    }

    return {
      success: true,
      message: "Attachment uploaded successfully",
      data: {
        attachment: attachment,
        fileName: consistentFileName,
      },
    };
  } catch (error) {
    console.error("Upload attachment error:", error);
    return {
      error: error instanceof Error ? error.message : "An error occurred while uploading the attachment"
    };
  }
});
