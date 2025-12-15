import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);
  const body = method === "POST" || method === "PUT" ? await readBody(event) : null;

  try {
    if (method === "GET") {
      // Fetch all documents for a specific project
      const { project_uuid } = query;

      if (!project_uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "project_uuid is required",
        });
      }

      const { data, error } = await supabaseServer
        .from("project_documents")
        .select("*")
        .eq("project_uuid", project_uuid)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Database error: " + error.message,
        });
      }

      return { data: data || [] };
    }

    if (method === "POST") {
      // Create a new project document
      if (!body) {
        throw createError({
          statusCode: 400,
          statusMessage: "Request body is required",
        });
      }

      // Validate required fields
      const requiredFields = [
        "project_uuid",
        "document_name",
        "document_type",
        "file_size",
        "mime_type",
        "file_url",
        "file_path",
      ];
      
      for (const field of requiredFields) {
        if (!body[field]) {
          throw createError({
            statusCode: 400,
            statusMessage: `${field} is required`,
          });
        }
      }

      // Validate document type
      const validDocumentTypes = ['pdf', 'image', 'other'];
      if (!validDocumentTypes.includes(body.document_type)) {
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid document type. Must be one of: pdf, image, other",
        });
      }

      // Validate file size (max 10MB)
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      if (body.file_size > maxFileSize) {
        throw createError({
          statusCode: 400,
          statusMessage: "File size too large. Maximum size is 10MB",
        });
      }

      // Check if project exists
      const { data: projectExists } = await supabaseServer
        .from("projects")
        .select("uuid")
        .eq("uuid", body.project_uuid)
        .single();

      if (!projectExists) {
        throw createError({
          statusCode: 404,
          statusMessage: "Project not found",
        });
      }

      // Prepare document data
      const documentData = {
        project_uuid: body.project_uuid,
        document_name: body.document_name,
        document_type: body.document_type,
        file_size: parseInt(body.file_size),
        mime_type: body.mime_type,
        file_url: body.file_url,
        file_path: body.file_path,
        description: body.description || null,
        tags: body.tags || [],
        is_primary: body.is_primary || false,
        uploaded_by: body.uploaded_by || null,
      };

      const { data, error } = await supabaseServer
        .from("project_documents")
        .insert([documentData])
        .select()
        .single();

      if (error) {
        console.error("Error creating project document:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error creating project document: " + error.message,
        });
      }

      return { data };
    }

    if (method === "PUT") {
      // Update project document
      if (!body) {
        throw createError({
          statusCode: 400,
          statusMessage: "Request body is required",
        });
      }

      const { uuid, ...updatedFields } = body;

      if (!uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "Document UUID is required for update",
        });
      }

      // Check if document exists
      const { data: existingDocument } = await supabaseServer
        .from("project_documents")
        .select("id, project_uuid")
        .eq("uuid", uuid)
        .single();

      if (!existingDocument) {
        throw createError({
          statusCode: 404,
          statusMessage: "Document not found",
        });
      }

      // Prepare updated data
      const updateData: any = {};
      
      // Only include fields that are provided
      const allowedFields = [
        "document_name",
        "document_type",
        "description",
        "tags",
        "is_primary",
      ];

      for (const field of allowedFields) {
        if (updatedFields[field] !== undefined) {
          updateData[field] = updatedFields[field];
        }
      }

      // Validate document type if being updated
      if (updateData.document_type && !['pdf', 'image', 'other'].includes(updateData.document_type)) {
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid document type. Must be one of: pdf, image, other",
        });
      }

      const { data, error } = await supabaseServer
        .from("project_documents")
        .update(updateData)
        .eq("uuid", uuid)
        .select()
        .single();

      if (error) {
        console.error("Error updating project document:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error updating project document: " + error.message,
        });
      }

      return { data };
    }

    if (method === "DELETE") {
      // Soft delete project document (set is_active to false)
      const { uuid } = query;

      if (!uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "Document UUID is required for deletion",
        });
      }

      const { data, error } = await supabaseServer
        .from("project_documents")
        .update({ is_active: false })
        .eq("uuid", uuid)
        .select()
        .single();

      if (error) {
        console.error("Error deleting project document:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error deleting project document: " + error.message,
        });
      }

      return { data };
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });

  } catch (error: any) {
    console.error("API Error:", error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});
