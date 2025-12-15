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
    const { billEntryId } = body;

    if (!billEntryId) {
      return { error: "Bill Entry ID is required" };
    }

    // Check if bill entry has an attachment
    const { data: existingBill, error: billError } = await supabaseAdmin
      .from('bill_entries')
      .select('attachments')
      .eq('id', billEntryId)
      .single();

    if (billError) {
      console.error("Error checking existing bill entry:", billError);
      return { error: billError.message };
    }

    // If bill entry has an attachment, delete it from storage
    if (existingBill?.attachments && existingBill.attachments.length > 0) {
      try {
        const existingAttachment = existingBill.attachments[0];
        // Extract filename from the URL
        const urlParts = existingAttachment.file_url.split("/");
        const fileName = urlParts[urlParts.length - 1];

        // Delete the attachment from storage
        const { error: deleteError } = await supabaseAdmin.storage
          .from("bill_entries")
          .remove([fileName]);

        if (deleteError) {
          console.error("Error deleting attachment from storage:", deleteError);
          return { error: deleteError.message };
        } else {
        }
      } catch (error) {
        console.error("Error processing attachment removal:", error);
        return { error: "Failed to process attachment removal" };
      }
    }

    // Update bill entry to remove attachments
    const { error: updateError } = await supabaseAdmin
      .from("bill_entries")
      .update({
        attachments: [], // Remove all attachments
        updated_at: new Date().toISOString(),
      })
      .eq("id", billEntryId);

    if (updateError) {
      console.error(
        "Error updating bill entry to remove attachments:",
        updateError
      );
      return { error: updateError.message };
    }


    return {
      success: true,
      message: "Attachment removed successfully"
    };

  } catch (error) {
    console.error("Remove attachment error:", error);
    return {
      error: error instanceof Error ? error.message : "An error occurred while removing the attachment"
    };
  }
});
