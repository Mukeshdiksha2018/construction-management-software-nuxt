import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);
  const body = method === "POST" || method === "PUT" ? await readBody(event) : null;

  try {
    if (method === "GET") {
      // Fetch all projects for a specific corporation
      const { corporation_uuid } = query;

      if (!corporation_uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "corporation_uuid is required",
        });
      }

      const { data, error } = await supabaseServer
        .from("projects")
        .select("*")
        .eq("corporation_uuid", corporation_uuid)
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
      // Create a new project
      if (!body) {
        throw createError({
          statusCode: 400,
          statusMessage: "Request body is required",
        });
      }

      // Validate required fields
      const requiredFields = [
        "corporation_uuid",
        "project_name",
        "project_type_uuid",
        "service_type_uuid",
      ];
      for (const field of requiredFields) {
        if (!body[field]) {
          throw createError({
            statusCode: 400,
            statusMessage: `${field} is required`,
          });
        }
      }

      // Auto-generate a unique project ID per corporation if missing
      let incomingProjectId: string | undefined = body.project_id;
      async function generateNextProjectId(corporationUuid: string) {
        // Fetch recent project IDs and compute next sequence (PRO-100000 ...)
        const { data: ids } = await supabaseServer
          .from("projects")
          .select("project_id")
          .eq("corporation_uuid", corporationUuid)
          .order("created_at", { ascending: false })
          .limit(200);
        let maxSeq = 0;
        const re = /^PRO-(\d{1,})$/i;
        (ids || []).forEach((r: any) => {
          const id = String(r.project_id || "");
          const m = id.match(re);
          if (m) {
            const seq = parseInt(m[1]);
            if (!Number.isNaN(seq)) maxSeq = Math.max(maxSeq, seq);
          }
        });
        const next = maxSeq + 1;
        // Ensure minimum 6 digits
        const padded = String(next).padStart(6, "0");
        return `PRO-${padded}`;
      }

      // If no project_id provided or it conflicts, generate a new one
      if (!incomingProjectId) {
        incomingProjectId = await generateNextProjectId(body.corporation_uuid);
      } else {
        const { data: conflict } = await supabaseServer
          .from("projects")
          .select("id")
          .eq("corporation_uuid", body.corporation_uuid)
          .eq("project_id", incomingProjectId)
          .maybeSingle();

        if (conflict) {
          // If conflict, generate a new one
          incomingProjectId = await generateNextProjectId(
            body.corporation_uuid
          );
        }
      }

      const normalizeUTC = (val: any, endOfDay = false) => {
        if (!val && val !== 0) return null;
        const s = String(val);
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          return endOfDay ? `${s}T23:59:59.000Z` : `${s}T00:00:00.000Z`;
        }
        return s;
      };

      // Prepare project data
      const projectData = {
        corporation_uuid: body.corporation_uuid,
        project_name: body.project_name,
        project_id: incomingProjectId,
        project_type_uuid: body.project_type_uuid,
        service_type_uuid: body.service_type_uuid,
        project_description: body.project_description || null,
        estimated_amount: body.estimated_amount
          ? parseFloat(body.estimated_amount)
          : 0.0,
        area_sq_ft: body.area_sq_ft ? parseInt(body.area_sq_ft) : null,
        no_of_rooms: body.no_of_rooms ? parseInt(body.no_of_rooms) : null,
        contingency_percentage: body.contingency_percentage
          ? parseFloat(body.contingency_percentage)
          : 0.0,
        customer_name: body.customer_name || null,
        customer_uuid: body.customer_uuid || null,
        project_status: body.project_status || "Pending",
        project_start_date: normalizeUTC(body.project_start_date),
        project_estimated_completion_date: normalizeUTC(
          body.project_estimated_completion_date,
          true
        ),
        only_total: body.only_total || false,
        enable_labor: body.enable_labor || false,
        enable_material: body.enable_material || false,
        attachments: body.attachments || [],
      };

      const { data, error } = await supabaseServer
        .from("projects")
        .insert([projectData])
        .select()
        .single();

      if (error) {
        console.error("Error creating project:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error creating project: " + error.message,
        });
      }

      return { data };
    }

    if (method === "PUT") {
      // Update project
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
          statusMessage: "Project UUID is required for update",
        });
      }

      // Check if project exists
      const { data: existingProject } = await supabaseServer
        .from("projects")
        .select("id, corporation_uuid, project_id")
        .eq("uuid", uuid)
        .single();

      if (!existingProject) {
        throw createError({
          statusCode: 404,
          statusMessage: "Project not found",
        });
      }

      // If project_id is being updated, check for duplicates
      if (
        updatedFields.project_id &&
        updatedFields.project_id !== existingProject.project_id
      ) {
        const { data: duplicateProject } = await supabaseServer
          .from("projects")
          .select("id")
          .eq("corporation_uuid", existingProject.corporation_uuid)
          .eq("project_id", updatedFields.project_id)
          .neq("uuid", uuid)
          .single();

        if (duplicateProject) {
          throw createError({
            statusCode: 409,
            statusMessage: "Project ID already exists for this corporation",
          });
        }
      }

      // Prepare updated data
      const updateData: any = {};

      // Only include fields that are provided
      const allowedFields = [
        "project_name",
        "project_id",
        "project_type_uuid",
        "service_type_uuid",
        "project_address_uuid",
        "project_description",
        "estimated_amount",
        "area_sq_ft",
        "no_of_rooms",
        "contingency_percentage",
        "customer_name",
        "customer_uuid",
        "project_status",
        "project_start_date",
        "project_estimated_completion_date",
        "only_total",
        "enable_labor",
        "enable_material",
        "attachments",
      ];

      for (const field of allowedFields) {
        if (updatedFields[field] !== undefined) {
          if (
            field === "estimated_amount" ||
            field === "contingency_percentage"
          ) {
            updateData[field] = updatedFields[field]
              ? parseFloat(updatedFields[field])
              : 0.0;
          } else if (field === "area_sq_ft" || field === "no_of_rooms") {
            updateData[field] = updatedFields[field]
              ? parseInt(updatedFields[field])
              : null;
          } else if (field === 'project_start_date') {
            const s = updatedFields[field]
            updateData[field] = (s === null || s === '') ? null : (/^\d{4}-\d{2}-\d{2}$/.test(String(s)) ? `${s}T00:00:00.000Z` : s)
          } else if (field === 'project_estimated_completion_date') {
            const s = updatedFields[field]
            updateData[field] = (s === null || s === '') ? null : (/^\d{4}-\d{2}-\d{2}$/.test(String(s)) ? `${s}T23:59:59.000Z` : s)
          } else {
            updateData[field] = updatedFields[field];
          }
        }
      }

      const { data, error } = await supabaseServer
        .from("projects")
        .update(updateData)
        .eq("uuid", uuid)
        .select()
        .single();

      if (error) {
        console.error("Error updating project:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error updating project: " + error.message,
        });
      }

      return { data };
    }

    if (method === "DELETE") {
      // Soft delete project (set is_active to false)
      const { uuid } = query;

      if (!uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "Project UUID is required for deletion",
        });
      }

      // Check if project exists
      const { data: existingProject, error: fetchError } = await supabaseServer
        .from("projects")
        .select("uuid, project_name, project_id")
        .eq("uuid", uuid)
        .single();

      if (fetchError || !existingProject) {
        throw createError({
          statusCode: 404,
          statusMessage: "Project not found",
        });
      }

      // Check if any estimates are using this project
      const { data: estimatesUsingProject, error: checkError } = await supabaseServer
        .from("estimates")
        .select("uuid, estimate_number, estimate_date, status")
        .eq("project_uuid", uuid)
        .eq("is_active", true)
        .limit(10);

      if (checkError) {
        console.error("Error checking estimate references:", checkError);
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to check estimate references",
        });
      }

      if (estimatesUsingProject && estimatesUsingProject.length > 0) {
        const count = estimatesUsingProject.length;
        const hasMore = count >= 10;
        
        // Format estimate list for better readability
        const estimateList = estimatesUsingProject
          .map((e: any) => e.estimate_number || `Estimate from ${e.estimate_date || 'N/A'}`)
          .slice(0, 10); // Only show first 10
        
        const errorMessage = `Cannot delete project. It is currently being used by ${count} active estimate(s)${hasMore ? ' (showing first 10)' : ''}. Please delete these estimates before deleting the project.`;
        
        throw createError({
          statusCode: 400,
          statusMessage: errorMessage,
          data: {
            estimates: estimatesUsingProject,
            estimateList: estimateList,
            count: count,
            hasMore: hasMore
          }
        });
      }

      const { data, error } = await supabaseServer
        .from("projects")
        .update({ is_active: false })
        .eq("uuid", uuid)
        .select()
        .single();

      if (error) {
        console.error("Error deleting project:", error);
        
        // Check if it's a foreign key constraint error
        if (error.code === '23503' || error.message?.includes('foreign key')) {
          throw createError({
            statusCode: 400,
            statusMessage: "Cannot delete project. It is currently being used by one or more estimates. Please delete these estimates before deleting the project.",
          });
        }
        
        throw createError({
          statusCode: 500,
          statusMessage: `Error deleting project: ${error.message || 'Unknown error'}`,
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
