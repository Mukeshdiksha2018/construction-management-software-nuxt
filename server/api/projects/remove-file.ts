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
    const { documentUuid } = body;

    if (!documentUuid) {
      return { error: "Document UUID is required" };
    }

    // Get the document record to find the file path
    const { data: document, error: documentError } = await supabaseAdmin
      .from("project_documents")
      .select("file_path, document_name")
      .eq("uuid", documentUuid)
      .single();

    if (documentError || !document) {
      console.error("Error finding document:", documentError);
      return { error: "Document not found" };
    }

    // Delete the file from Supabase Storage
    if (document.file_path) {
      try {
        const { error: storageError } = await supabaseAdmin.storage
          .from("project_documents")
          .remove([document.file_path]);

        if (storageError) {
          console.error("Error deleting file from storage:", storageError);
          // Continue with database deletion even if storage deletion fails
        } else {
          console.log(`Successfully deleted file from storage: ${document.file_path}`);
        }
      } catch (storageError) {
        console.error("Error during storage deletion:", storageError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete the document record from database
    const { data: deletedDocument, error: deleteError } = await supabaseAdmin
      .from("project_documents")
      .delete()
      .eq("uuid", documentUuid)
      .select()
      .single();

    if (deleteError) {
      console.error("Error deleting document record:", deleteError);
      return { error: deleteError.message };
    }

    return {
      success: true,
      message: "File deleted successfully",
      data: {
        deletedDocument,
        fileName: document.document_name
      }
    };

  } catch (error) {
    console.error("Remove file error:", error);
    return {
      error: error instanceof Error ? error.message : "An error occurred while removing the file"
    };
  }
});
