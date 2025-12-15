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
    const { projectUuid, files } = body;

    if (!projectUuid || !files || !Array.isArray(files) || files.length === 0) {
      return { error: "Project UUID and files array are required" };
    }

    // Check if project exists
    const { data: projectExists, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("uuid, corporation_uuid")
      .eq("uuid", projectUuid)
      .single();

    if (projectError || !projectExists) {
      console.error("Error checking project:", projectError);
      return { error: "Project not found" };
    }

    const uploadedFiles = [];
    const errors = [];

    // Process each file
    for (const file of files) {
      try {
        // Validate file data
        if (!file.name || !file.type || !file.fileData || !file.size) {
          errors.push({
            fileName: file.name || 'Unknown',
            error: 'Missing required file properties (name, type, fileData, size)'
          });
          continue;
        }

        // Validate file type - only allow PDF, DOC, DOCX
        const allowedTypes = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];

        if (!allowedTypes.includes(file.type)) {
          errors.push({
            fileName: file.name,
            error: 'Invalid file type. Only PDF, DOC, and DOCX files are allowed'
          });
          continue;
        }

        // Validate file size (max 10MB)
        const maxFileSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxFileSize) {
          errors.push({
            fileName: file.name,
            error: 'File size too large. Maximum size is 10MB'
          });
          continue;
        }

        // Convert base64 to buffer
        const base64Data = file.fileData.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");

        // Generate unique filename with timestamp and random string
        const fileExtension = file.name.split(".").pop();
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileName = `${timestamp}-${randomString}.${fileExtension}`;
        const filePath = `projects/${projectUuid}/documents/${fileName}`;

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from("project_documents")
          .upload(filePath, buffer, {
            contentType: file.type,
            cacheControl: "3600",
          });

        if (uploadError) {
          console.error("Error uploading file:", uploadError);
          errors.push({
            fileName: file.name,
            error: 'Failed to upload file to storage: ' + uploadError.message
          });
          continue;
        }

        // Get public URL for the uploaded file
        const { data: urlData } = supabaseAdmin.storage
          .from("project_documents")
          .getPublicUrl(filePath);

        // Add cache-busting parameter to prevent browser caching issues
        const timestamp2 = Date.now();
        const fileUrl = `${urlData.publicUrl}?t=${timestamp2}`;

        // Determine document type
        let documentType = 'other';
        if (file.type === 'application/pdf') {
          documentType = 'pdf';
        } else if (file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          documentType = 'document';
        }

        // Create document record in database
        const documentData = {
          project_uuid: projectUuid,
          document_name: file.name,
          document_type: documentType,
          file_size: parseInt(file.size),
          mime_type: file.type,
          file_url: fileUrl,
          file_path: filePath,
          description: file.description || null,
          tags: file.tags || [],
          is_primary: file.is_primary || false,
          uploaded_by: file.uploaded_by || null,
        };

        const { data: documentRecord, error: documentError } = await supabaseAdmin
          .from("project_documents")
          .insert([documentData])
          .select()
          .single();

        if (documentError) {
          console.error("Error creating document record:", documentError);
          // Try to clean up uploaded file
          await supabaseAdmin.storage
            .from("project_documents")
            .remove([filePath]);
          
          errors.push({
            fileName: file.name,
            error: 'Failed to create document record: ' + documentError.message
          });
          continue;
        }

        uploadedFiles.push(documentRecord);

      } catch (fileError) {
        console.error("Error processing file:", fileError);
        errors.push({
          fileName: file.name || 'Unknown',
          error: 'Unexpected error processing file: ' + (fileError as Error).message
        });
      }
    }

    // Return results
    return {
      success: uploadedFiles.length > 0,
      uploadedFiles,
      errors,
      summary: {
        total: files.length,
        successful: uploadedFiles.length,
        failed: errors.length
      }
    };

  } catch (error) {
    console.error("Upload files error:", error);
    return {
      error: error instanceof Error ? error.message : "An error occurred while uploading files"
    };
  }
});
