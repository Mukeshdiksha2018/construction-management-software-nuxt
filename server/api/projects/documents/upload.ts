import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== "POST") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  try {
    const body = await readBody(event);
    
    if (!body) {
      throw createError({
        statusCode: 400,
        statusMessage: "Request body is required",
      });
    }

    const {
      project_uuid,
      files, // Array of file objects with base64 data
      uploaded_by
    } = body;

    if (!project_uuid) {
      throw createError({
        statusCode: 400,
        statusMessage: "project_uuid is required",
      });
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Files array is required and must not be empty",
      });
    }

    // Check if project exists
    const { data: projectExists } = await supabaseServer
      .from("projects")
      .select("uuid, corporation_uuid")
      .eq("uuid", project_uuid)
      .single();

    if (!projectExists) {
      throw createError({
        statusCode: 404,
        statusMessage: "Project not found",
      });
    }

    const uploadedDocuments = [];
    const errors = [];

    // Process each file
    for (const file of files) {
      try {
        // Validate file data
        if (!file.name || !file.type || !file.url || !file.size) {
          errors.push({
            fileName: file.name || 'Unknown',
            error: 'Missing required file properties (name, type, url, size)'
          });
          continue;
        }

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
          errors.push({
            fileName: file.name,
            error: 'Invalid file type. Only PDF, JPG, and PNG files are allowed'
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

        // Determine document type
        let documentType = 'other';
        if (file.type === 'application/pdf') {
          documentType = 'pdf';
        } else if (file.type.startsWith('image/')) {
          documentType = 'image';
        }

        // Generate file path for Supabase Storage
        const fileExtension = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
        const filePath = `projects/${project_uuid}/documents/${fileName}`;

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseServer.storage
          .from('project-documents')
          .upload(filePath, file.file, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          errors.push({
            fileName: file.name,
            error: 'Failed to upload file to storage: ' + uploadError.message
          });
          continue;
        }

        // Get public URL for the uploaded file
        const { data: urlData } = supabaseServer.storage
          .from('project-documents')
          .getPublicUrl(filePath);

        // Create document record in database
        const documentData = {
          project_uuid: project_uuid,
          document_name: file.name,
          document_type: documentType,
          file_size: parseInt(file.size),
          mime_type: file.type,
          file_url: urlData.publicUrl,
          file_path: filePath,
          description: file.description || null,
          tags: file.tags || [],
          is_primary: file.is_primary || false,
          uploaded_by: uploaded_by || null,
        };

        const { data: documentRecord, error: documentError } = await supabaseServer
          .from("project_documents")
          .insert([documentData])
          .select()
          .single();

        if (documentError) {
          console.error('Database insert error:', documentError);
          // Try to clean up uploaded file
          await supabaseServer.storage
            .from('project-documents')
            .remove([filePath]);
          
          errors.push({
            fileName: file.name,
            error: 'Failed to create document record: ' + documentError.message
          });
          continue;
        }

        uploadedDocuments.push(documentRecord);

      } catch (fileError) {
        console.error('Error processing file:', fileError);
        errors.push({
          fileName: file.name || 'Unknown',
          error: 'Unexpected error processing file: ' + (fileError as Error).message
        });
      }
    }

    // Return results
    return {
      success: uploadedDocuments.length > 0,
      uploadedDocuments,
      errors,
      summary: {
        total: files.length,
        successful: uploadedDocuments.length,
        failed: errors.length
      }
    };

  } catch (error: any) {
    console.error("Upload API Error:", error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});
