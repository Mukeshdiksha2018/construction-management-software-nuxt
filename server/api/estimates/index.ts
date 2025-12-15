import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);
  const body =
    method === "POST" || method === "PUT" ? await readBody(event) : null;

  try {
    if (method === "GET") {
      // Fetch estimates for a specific corporation
      console.log(
        "Estimates GET request received for corporation:",
        query.corporation_uuid
      );

      const { corporation_uuid } = query;

      if (!corporation_uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "corporation_uuid is required",
        });
      }

      // Pagination parameters
      const page = parseInt(query.page as string) || 1;
      const pageSize = parseInt(query.page_size as string) || 100;
      const offset = (page - 1) * pageSize;

      // Get total count for pagination metadata
      const { count, error: countError } = await supabaseServer
        .from("estimates")
        .select("*", { count: "exact", head: true })
        .eq("corporation_uuid", corporation_uuid)
        .eq("is_active", true);

      if (countError) {
        console.error("Supabase count error:", countError);
        throw createError({
          statusCode: 500,
          statusMessage: "Database error: " + countError.message,
        });
      }

      const totalRecords = count || 0;
      const totalPages = Math.ceil(totalRecords / pageSize);

      console.log("Fetching estimates from database...");
      // Fetch paginated data
      const { data, error } = await supabaseServer
        .from("estimates")
        .select(
          `
          *,
          project:projects!project_uuid (
            uuid,
            project_name,
            project_id
          )
        `
        )
        .eq("corporation_uuid", corporation_uuid)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error("Supabase error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Database error: " + error.message,
        });
      }

      console.log("Successfully fetched estimates:", data?.length || 0);
      return { 
        data: data || [],
        pagination: {
          page,
          pageSize,
          totalRecords,
          totalPages,
          hasMore: page < totalPages
        }
      };
    }

    if (method === "POST") {
      // Create a new estimate
      if (!body) {
        throw createError({
          statusCode: 400,
          statusMessage: "Request body is required",
        });
      }

      // Validate required fields
      const requiredFields = [
        "corporation_uuid",
        "project_uuid",
        "estimate_number",
        "estimate_date",
        "total_amount",
        "final_amount",
      ];
      for (const field of requiredFields) {
        if (!body[field]) {
          throw createError({
            statusCode: 400,
            statusMessage: `${field} is required`,
          });
        }
      }

      // Auto-generate a unique estimate number per corporation if missing or conflicting
      let incomingNumber: string | undefined = body.estimate_number;
      async function generateNextEstimateNumber(corporationUuid: string) {
        // Fetch recent estimate numbers and compute next sequence (EST-0001 ...)
        const { data: nums } = await supabaseServer
          .from("estimates")
          .select("estimate_number")
          .eq("corporation_uuid", corporationUuid)
          .order("created_at", { ascending: false })
          .limit(200);
        let maxSeq = 0;
        const re = /^(.*?)(\d{1,})$/;
        (nums || []).forEach((r: any) => {
          const num = String(r.estimate_number || "");
          const m = num.match(/^(EST-)?(\d{1,})$/i) || num.match(re);
          if (m) {
            const seq = parseInt(m[2]);
            if (!Number.isNaN(seq)) maxSeq = Math.max(maxSeq, seq);
          }
        });
        const next = maxSeq + 1;
        const padded = String(next).padStart(4, "0");
        return `EST-${padded}`;
      }

      // If no estimate_number provided or it conflicts, generate a new one
      if (!incomingNumber) {
        incomingNumber = await generateNextEstimateNumber(
          body.corporation_uuid
        );
      } else {
        const { data: conflict } = await supabaseServer
          .from("estimates")
          .select("uuid")
          .eq("corporation_uuid", body.corporation_uuid)
          .eq("estimate_number", incomingNumber)
          .eq("is_active", true)
          .maybeSingle();
        if (conflict) {
          incomingNumber = await generateNextEstimateNumber(
            body.corporation_uuid
          );
        }
      }

      // Normalize date inputs to UTC ISO if provided as YYYY-MM-DD
      const normalizeUTC = (val: any) => {
        if (!val) return null;
        const s = String(val);
        return /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00.000Z` : s;
      };

      // Get user info for audit log
      const getUserInfo = () => {
        const { user_id, user_name, user_email, user_image_url } = body || {};

        if (!user_id) {
          console.warn("No user_id provided in request body");
          return null;
        }

        return {
          id: user_id,
          name: user_name || "Unknown User",
          email: user_email || "",
          image_url: user_image_url || null,
        };
      };

      const userInfo = getUserInfo();

      // Create audit log entry for creation
      const auditLogEntry = userInfo ? {
        timestamp: new Date().toISOString(),
        user_uuid: userInfo.id,
        user_name: userInfo.name,
        user_email: userInfo.email,
        user_image_url: userInfo.image_url,
        action: 'created',
        description: `Estimate ${incomingNumber} created`
      } : null;

      // Prepare estimate data
      const estimateData = {
        corporation_uuid: body.corporation_uuid,
        project_uuid: body.project_uuid,
        estimate_number: incomingNumber,
        estimate_date: normalizeUTC(body.estimate_date),
        valid_until: normalizeUTC(body.valid_until),
        status: body.status || "Draft",
        total_amount: body.total_amount ? parseFloat(body.total_amount) : 0.0,
        tax_amount: body.tax_amount ? parseFloat(body.tax_amount) : 0.0,
        discount_amount: body.discount_amount
          ? parseFloat(body.discount_amount)
          : 0.0,
        final_amount: body.final_amount ? parseFloat(body.final_amount) : 0.0,
        notes: body.notes || null,
        attachments: body.attachments || [],
        removed_cost_code_uuids: Array.isArray(body.removed_cost_code_uuids)
          ? body.removed_cost_code_uuids
          : [],
        audit_log: auditLogEntry ? [auditLogEntry] : [],
      };

      const { data, error } = await supabaseServer
        .from("estimates")
        .insert([estimateData])
        .select(
          `
          *,
          project:projects!project_uuid (
            uuid,
            project_name,
            project_id
          )
        `
        )
        .single();

      if (error) {
        console.error("Error creating estimate:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error creating estimate: " + error.message,
        });
      }

      // Insert line items in separate table if provided
      if (body.line_items && Array.isArray(body.line_items) && data?.uuid) {
        const validLaborTypes = new Set(["manual", "per-room", "per-sqft"]);
        const rows = body.line_items
          .filter((item: any) => !!item?.cost_code_uuid)
          .map((item: any) => ({
            corporation_uuid: body.corporation_uuid,
            project_uuid: body.project_uuid,
            estimate_uuid: data.uuid,
            cost_code_uuid: item.cost_code_uuid,
            cost_code_number: item.cost_code_number,
            cost_code_name: item.cost_code_name,
            division_name: item.division_name,
            description: item.description,
            is_sub_cost_code: !!item.is_sub_cost_code,
            labor_estimation_type: validLaborTypes.has(item.estimation_type)
              ? item.estimation_type
              : null,
            labor_amount:
              item.labor_amount != null ? parseFloat(item.labor_amount) : 0,
            labor_amount_per_room:
              item.labor_amount_per_room != null
                ? parseFloat(item.labor_amount_per_room)
                : 0,
            labor_rooms_count:
              item.labor_rooms_count != null
                ? parseInt(item.labor_rooms_count)
                : 0,
            labor_amount_per_sqft:
              item.labor_amount_per_sqft != null
                ? parseFloat(item.labor_amount_per_sqft)
                : 0,
            labor_sq_ft_count:
              item.labor_sq_ft_count != null
                ? parseInt(item.labor_sq_ft_count)
                : 0,
            material_items: item.material_items || [],
            material_amount:
              item.material_amount != null
                ? parseFloat(item.material_amount)
                : 0,
            contingency_amount:
              item.contingency_amount != null
                ? parseFloat(item.contingency_amount)
                : 0,
            total_amount:
              item.total_amount != null ? parseFloat(item.total_amount) : 0,
            metadata: {
              ...(item.metadata || {}),
              contingency_enabled:
                typeof item.contingency_enabled !== "undefined"
                  ? !!item.contingency_enabled
                  : undefined,
              contingency_percentage:
                typeof item.contingency_percentage !== "undefined"
                  ? parseFloat(item.contingency_percentage)
                  : undefined,
            },
            metadata: {
              ...(item.metadata || {}),
              contingency_enabled:
                typeof item.contingency_enabled !== "undefined"
                  ? !!item.contingency_enabled
                  : undefined,
              contingency_percentage:
                typeof item.contingency_percentage !== "undefined"
                  ? parseFloat(item.contingency_percentage)
                  : undefined,
            },
          }));

        const { error: liError } = await supabaseServer
          .from("estimate_line_items")
          .insert(rows);

        if (liError) {
          console.error("Error inserting estimate line items:", liError);
          console.error("Sample row:", rows[0]);
          throw createError({
            statusCode: 500,
            statusMessage:
              liError.message || "Failed to insert estimate line items",
          });
        }
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
