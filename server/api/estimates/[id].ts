import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const estimateUuid = getRouterParam(event, "id");

  if (!estimateUuid) {
    throw createError({
      statusCode: 400,
      statusMessage: "Estimate UUID is required",
    });
  }

  try {
    if (method === "GET") {
      // Fetch a specific estimate by UUID
      const { data, error } = await supabaseServer
        .from("estimates")
        .select(
          `
          *,
          audit_log,
          project:projects!project_uuid (
            uuid,
            project_name,
            project_id
          )
        `
        )
        .eq("uuid", estimateUuid)
        .eq("is_active", true)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw createError({
            statusCode: 404,
            statusMessage: "Estimate not found",
          });
        }

        console.error("Supabase error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Database error: " + error.message,
        });
      }

      // Fetch line items from new table and attach to response
      const { data: items, error: liError } = await supabaseServer
        .from("estimate_line_items")
        .select("*")
        .eq("estimate_uuid", estimateUuid)
        .order("id", { ascending: true });

      if (!liError) {
        (data as any).line_items = (items || []).map((row: any) => ({
          cost_code_uuid: row.cost_code_uuid,
          cost_code_number: row.cost_code_number,
          cost_code_name: row.cost_code_name,
          division_name: row.division_name,
          description: row.description,
          is_sub_cost_code: row.is_sub_cost_code,
          estimation_type: row.labor_estimation_type,
          labor_amount: parseFloat(row.labor_amount) || 0,
          labor_amount_per_room: parseFloat(row.labor_amount_per_room) || 0,
          labor_rooms_count: row.labor_rooms_count || 0,
          labor_amount_per_sqft: parseFloat(row.labor_amount_per_sqft) || 0,
          labor_sq_ft_count: row.labor_sq_ft_count || 0,
          material_items: row.material_items || [],
          material_amount: parseFloat(row.material_amount) || 0,
          contingency_amount: parseFloat(row.contingency_amount) || 0,
          total_amount: parseFloat(row.total_amount) || 0,
          metadata: row.metadata || {},
          // Surface contingency flags stored in metadata to top-level for UI population
          contingency_enabled:
            row.metadata &&
            typeof row.metadata.contingency_enabled !== "undefined"
              ? !!row.metadata.contingency_enabled
              : undefined,
          contingency_percentage:
            row.metadata &&
            typeof row.metadata.contingency_percentage !== "undefined"
              ? parseFloat(row.metadata.contingency_percentage)
              : undefined,
        }));
      }

      return { data };
    }

    if (method === "PUT") {
      // Update estimate
      const body = await readBody(event);

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
          statusMessage: "Estimate UUID is required for update",
        });
      }

      // Check if estimate exists
      const { data: existingEstimate } = await supabaseServer
        .from("estimates")
        .select("uuid, corporation_uuid, estimate_number")
        .eq("uuid", uuid)
        .single();

      if (!existingEstimate) {
        throw createError({
          statusCode: 404,
          statusMessage: "Estimate not found",
        });
      }

      // If estimate_number is being updated, check for duplicates
      if (
        updatedFields.estimate_number &&
        updatedFields.estimate_number !== existingEstimate.estimate_number
      ) {
        const { data: duplicateEstimate } = await supabaseServer
          .from("estimates")
          .select("uuid")
          .eq("corporation_uuid", existingEstimate.corporation_uuid)
          .eq("estimate_number", updatedFields.estimate_number)
          .neq("uuid", uuid)
          .single();

        if (duplicateEstimate) {
          throw createError({
            statusCode: 409,
            statusMessage:
              "Estimate number already exists for this corporation",
          });
        }
      }

      // Get user info for audit log
      const getUserInfo = () => {
        // User info should be passed in the request body from the frontend
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

      // Get existing audit log
      const { data: existingEstimateWithAudit } = await supabaseServer
        .from("estimates")
        .select("audit_log, status")
        .eq("uuid", uuid)
        .single();

      const existingAuditLog = Array.isArray(existingEstimateWithAudit?.audit_log) 
        ? existingEstimateWithAudit.audit_log 
        : []
      const oldStatus = existingEstimateWithAudit?.status || 'Draft'
      const newStatus = updatedFields.status || oldStatus

      // Create audit log entry based on what changed
      let auditLogEntry = null
      if (userInfo) {
        // Check if status changed
        if (oldStatus !== newStatus) {
          if (newStatus === 'Ready' && oldStatus !== 'Ready') {
            auditLogEntry = {
              timestamp: new Date().toISOString(),
              user_uuid: userInfo.id,
              user_name: userInfo.name,
              user_email: userInfo.email,
              user_image_url: userInfo.image_url,
              action: 'marked_ready',
              description: 'Estimate marked as ready'
            }
          } else if (newStatus === 'Approved' && oldStatus !== 'Approved') {
            auditLogEntry = {
              timestamp: new Date().toISOString(),
              user_uuid: userInfo.id,
              user_name: userInfo.name,
              user_email: userInfo.email,
              user_image_url: userInfo.image_url,
              action: 'approved',
              description: 'Estimate approved'
            }
          } else if (oldStatus === 'Approved' && newStatus !== 'Approved') {
            auditLogEntry = {
              timestamp: new Date().toISOString(),
              user_uuid: userInfo.id,
              user_name: userInfo.name,
              user_email: userInfo.email,
              user_image_url: userInfo.image_url,
              action: 'unapproved',
              description: 'Estimate unapproved'
            }
          }
        } else {
          // Status didn't change, but other fields did - track as update
          // Only track if there are actual field changes (not just status)
          const hasFieldChanges = Object.keys(updatedFields).some(
            key => key !== 'status' && key !== 'uuid'
          )
          if (hasFieldChanges) {
            auditLogEntry = {
              timestamp: new Date().toISOString(),
              user_uuid: userInfo.id,
              user_name: userInfo.name,
              user_email: userInfo.email,
              user_image_url: userInfo.image_url,
              action: 'updated',
              description: 'Estimate updated'
            }
          }
        }
      }

      // Merge audit log
      const mergedAuditLog = auditLogEntry 
        ? [...existingAuditLog, auditLogEntry]
        : existingAuditLog

      // Prepare updated data
      const updateData: any = {};

      // Only include fields that are provided
      const allowedFields = [
        "estimate_number",
        "estimate_date",
        "valid_until",
        "status",
        "total_amount",
        "tax_amount",
        "discount_amount",
        "final_amount",
        "notes",
        // do not update line_items on estimates; handled in estimate_line_items table
        // "line_items",
        "removed_cost_code_uuids",
        "attachments",
        "audit_log",
      ];

      const normalizeUTC = (val: any) => {
        if (val === null || val === undefined || val === "") return null;
        const s = String(val);
        return /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00.000Z` : s;
      };

      for (const field of allowedFields) {
        if (updatedFields[field] !== undefined) {
          if (
            field === "total_amount" ||
            field === "tax_amount" ||
            field === "discount_amount" ||
            field === "final_amount"
          ) {
            updateData[field] = updatedFields[field]
              ? parseFloat(updatedFields[field])
              : 0.0;
          } else if (field === 'estimate_date' || field === 'valid_until') {
            updateData[field] = normalizeUTC(updatedFields[field])
          } else if (field === "removed_cost_code_uuids") {
            // ensure JSON array
            updateData[field] = Array.isArray(updatedFields[field])
              ? updatedFields[field]
              : [];
          } else if (field === "audit_log") {
            // Use the merged audit log we created above
            updateData[field] = mergedAuditLog
          } else {
            updateData[field] = updatedFields[field];
          }
        }
      }

      // Always update audit_log if we created a new entry
      if (auditLogEntry) {
        updateData.audit_log = mergedAuditLog
      }

      const { data, error } = await supabaseServer
        .from("estimates")
        .update(updateData)
        .eq("uuid", uuid)
        .select(
          `
          *,
          audit_log,
          project:projects!project_uuid (
            uuid,
            project_name,
            project_id
          )
        `
        )
        .single();

      if (error) {
        console.error("Error updating estimate:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error updating estimate: " + error.message,
        });
      }

      // Replace line items if provided
      if (updatedFields.line_items && Array.isArray(updatedFields.line_items)) {
        // Delete existing
        await supabaseServer
          .from("estimate_line_items")
          .delete()
          .eq("estimate_uuid", uuid);

        const validLaborTypes = new Set(["manual", "per-room", "per-sqft"]);
        const rows = updatedFields.line_items
          .filter((item: any) => !!item?.cost_code_uuid)
          .map((item: any) => ({
            corporation_uuid: data.corporation_uuid,
            project_uuid: data.project_uuid,
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
            metadata: item.metadata || {},
          }));

        if (rows.length > 0) {
          const { error: liError } = await supabaseServer
            .from("estimate_line_items")
            .insert(rows);
          if (liError) {
            console.error("Error replacing estimate line items:", liError);
            throw createError({
              statusCode: 500,
              statusMessage: "Failed to update estimate line items",
            });
          }
        }
      }

      return { data };
    }

    if (method === "DELETE") {
      // First, check if the estimate is being used by any purchase orders
      // Get the estimate to find its project_uuid
      const { data: estimateData, error: estimateError } = await supabaseServer
        .from("estimates")
        .select("uuid, project_uuid, estimate_number, estimate_date")
        .eq("uuid", estimateUuid)
        .eq("is_active", true)
        .single();

      if (estimateError) {
        if (estimateError.code === "PGRST116") {
          throw createError({
            statusCode: 404,
            statusMessage: "Estimate not found",
          });
        }
        throw createError({
          statusCode: 500,
          statusMessage: "Error fetching estimate: " + estimateError.message,
        });
      }

      if (!estimateData) {
        throw createError({
          statusCode: 404,
          statusMessage: "Estimate not found",
        });
      }

      // Check if there are any purchase orders for this project that import items from estimates
      if (estimateData.project_uuid) {
        const { data: purchaseOrders, error: poError } = await supabaseServer
          .from("purchase_order_forms")
          .select("uuid, po_number, project_uuid, include_items")
          .eq("project_uuid", estimateData.project_uuid)
          .eq("is_active", true)
          .eq("include_items", "IMPORT_ITEMS_FROM_ESTIMATE");

        if (poError) {
          console.error("Error checking purchase orders:", poError);
          // Don't block deletion if we can't check, but log the error
        } else if (purchaseOrders && purchaseOrders.length > 0) {
          // Check if this estimate is the latest estimate for the project
          // Get all active estimates for this project
          const { data: projectEstimates, error: estimatesError } = await supabaseServer
            .from("estimates")
            .select("uuid, estimate_date")
            .eq("project_uuid", estimateData.project_uuid)
            .eq("is_active", true)
            .order("estimate_date", { ascending: false });

          if (!estimatesError && projectEstimates && projectEstimates.length > 0) {
            // Check if the estimate being deleted is the latest one
            const latestEstimate = projectEstimates[0];
            if (latestEstimate.uuid === estimateUuid) {
              // This is the latest estimate and there are POs that import from estimates
              const count = purchaseOrders.length;
              const hasMore = count >= 10;
              
              // Format PO list for better readability
              const poList = purchaseOrders
                .map((po: any) => po.po_number || `PO from ${po.entry_date || 'N/A'}`)
                .slice(0, 10); // Only show first 10
              
              const errorMessage = `Cannot delete estimate. It is currently being used by ${count} active purchase order(s)${hasMore ? ' (showing first 10)' : ''}. Please delete these purchase orders before deleting the estimate.`;
              
              throw createError({
                statusCode: 400,
                statusMessage: errorMessage,
                data: {
                  purchaseOrders: purchaseOrders,
                  poList: poList,
                  count: count,
                  hasMore: hasMore
                }
              });
            }
          }
        }
      }

      // Soft delete estimate (set is_active to false)
      const { data, error } = await supabaseServer
        .from("estimates")
        .update({ is_active: false })
        .eq("uuid", estimateUuid)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw createError({
            statusCode: 404,
            statusMessage: "Estimate not found",
          });
        }

        console.error("Error deleting estimate:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error deleting estimate: " + error.message,
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
