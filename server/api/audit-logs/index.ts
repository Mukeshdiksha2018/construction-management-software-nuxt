import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);

  try {
    if (method === "GET") {
      const { entity_type, entity_id, corporation_uuid, action, limit = 50, offset = 0 } = query;

      // Corporation UUID is required for security
      if (!corporation_uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "corporation_uuid is required",
        });
      }

      let queryBuilder = supabaseServer
        .from("audit_logs")
        .select("*")
        .eq("corporation_uuid", corporation_uuid)
        .order("created_at", { ascending: false });

      // Filter by entity type and ID if provided
      if (entity_type) {
        queryBuilder = queryBuilder.eq("entity_type", entity_type);
      }
      
      if (entity_id) {
        queryBuilder = queryBuilder.eq("entity_id", entity_id);
      }
      
      if (action) {
        queryBuilder = queryBuilder.eq("action", action);
      }

      // Apply pagination
      queryBuilder = queryBuilder
        .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

      const { data, error } = await queryBuilder;

      if (error) {
        console.error("Supabase error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Database error: " + error.message,
        });
      }

      return { 
        success: true,
        data: data || [],
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: data?.length || 0
        }
      };
    }

    if (method === "POST") {
      const body = await readBody(event);

      // Validate required fields
      if (!body.entity_type || !body.entity_id || !body.action || !body.corporation_uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "entity_type, entity_id, action, and corporation_uuid are required",
        });
      }

      const { data, error } = await supabaseServer
        .from("audit_logs")
        .insert([
          {
            entity_type: body.entity_type,
            entity_id: body.entity_id,
            corporation_uuid: body.corporation_uuid,
            action: body.action,
            old_values: body.old_values || null,
            new_values: body.new_values || null,
            changed_fields: body.changed_fields || [],
            user_id: body.user_id || null,
            user_name: body.user_name || null,
            user_email: body.user_email || null,
            user_image_url: body.user_image_url || null,
            ip_address: body.ip_address || null,
            user_agent: body.user_agent || null,
            description: body.description || null,
            metadata: body.metadata || {},
          },
        ])
        .select();

      if (error) {
        console.error("Error creating audit log:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error creating audit log: " + error.message,
        });
      }

      return { 
        success: true,
        data: data?.[0] || null
      };
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  } catch (error: any) {
    console.error("Audit logs API error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Internal server error",
    });
  }
});
