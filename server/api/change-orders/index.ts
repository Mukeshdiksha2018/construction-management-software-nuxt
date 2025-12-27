import { supabaseServer } from "@/utils/supabaseServer";
import { decorateChangeOrderRecord, buildLaborCOFinancialBreakdown } from "./utils";
import { buildFinancialBreakdown, sanitizeAttachments, sanitizeChangeOrderItem } from "./utils";
import { sanitizeLaborChangeOrderItem } from "../labor-change-order-items/utils";

const persistChangeOrderItems = async (options: {
  changeOrderUuid: string;
  corporationUuid: string | null;
  projectUuid: string | null;
  items: any[];
}) => {
  const { changeOrderUuid, corporationUuid, projectUuid, items = [] } = options;
  if (!changeOrderUuid) return;

  const { error: deleteError } = await supabaseServer
    .from("change_order_items_list")
    .delete()
    .eq("change_order_uuid", changeOrderUuid);

  if (deleteError) {
    throw createError({ statusCode: 500, statusMessage: deleteError.message });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return;
  }

  const prepared = items.map((item, index) => ({
    ...sanitizeChangeOrderItem(item, index),
    corporation_uuid: corporationUuid,
    project_uuid: projectUuid,
    change_order_uuid: changeOrderUuid,
  }));

  const { error: insertError } = await supabaseServer
    .from("change_order_items_list")
    .insert(prepared);

  if (insertError) {
    throw createError({ statusCode: 500, statusMessage: insertError.message });
  }
};

const persistLaborChangeOrderItems = async (options: {
  changeOrderUuid: string;
  corporationUuid: string | null;
  projectUuid: string | null;
  purchaseOrderUuid: string | null;
  items: any[];
}) => {
  const { changeOrderUuid, corporationUuid, projectUuid, purchaseOrderUuid, items = [] } = options;
  
  if (!changeOrderUuid) {
    console.warn("[persistLaborChangeOrderItems] Skipping: changeOrderUuid is missing");
    return;
  }
  
  if (!purchaseOrderUuid) {
    console.warn("[persistLaborChangeOrderItems] Skipping: purchaseOrderUuid is missing");
    return;
  }

  console.log("[persistLaborChangeOrderItems] Saving labor CO items:", {
    changeOrderUuid,
    purchaseOrderUuid,
    itemsCount: items.length,
    items: items
  });

  const { error: deleteError } = await supabaseServer
    .from("labor_change_order_items_list")
    .delete()
    .eq("change_order_uuid", changeOrderUuid);

  if (deleteError) {
    console.error("[persistLaborChangeOrderItems] Delete error:", deleteError);
    throw createError({ statusCode: 500, statusMessage: deleteError.message });
  }

  if (!Array.isArray(items) || items.length === 0) {
    console.log("[persistLaborChangeOrderItems] No items to save");
    return;
  }

  const prepared = items.map((item, index) => ({
    ...sanitizeLaborChangeOrderItem(item, index),
    corporation_uuid: corporationUuid,
    project_uuid: projectUuid,
    purchase_order_uuid: purchaseOrderUuid,
    change_order_uuid: changeOrderUuid,
  }));

  console.log("[persistLaborChangeOrderItems] Prepared items:", prepared);

  const { data, error: insertError } = await supabaseServer
    .from("labor_change_order_items_list")
    .insert(prepared)
    .select();

  if (insertError) {
    console.error("[persistLaborChangeOrderItems] Insert error:", insertError);
    throw createError({ statusCode: 500, statusMessage: insertError.message });
  }

  console.log("[persistLaborChangeOrderItems] Successfully saved items:", data);
};

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);
  const body = method === "POST" || method === "PUT" ? await readBody(event) : null;

  const normalizeUTC = (val: any, endOfDay = false) => {
    if (!val && val !== 0) return null;
    const s = String(val);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return endOfDay ? `${s}T23:59:59.000Z` : `${s}T00:00:00.000Z`;
    }
    return s;
  };

  const normalizeCoType = (val: any) => {
    if (val === undefined || val === null) return null;
    const str = String(val).trim().toUpperCase();
    if (str === "LABOR" || str === "MATERIAL") return str;
    return null;
  };

  try {
    if (method === "GET") {
      const { corporation_uuid, uuid } = query;

      if (uuid) {
        const { data, error } = await supabaseServer
          .from("change_orders")
          .select("*")
          .eq("uuid", uuid as string)
          .maybeSingle();

        if (error) throw createError({ statusCode: 500, statusMessage: error.message });
        if (!data) throw createError({ statusCode: 404, statusMessage: "Change order not found" });
        return { data: decorateChangeOrderRecord(data as any) };
      }

      if (!corporation_uuid) {
        throw createError({ statusCode: 400, statusMessage: "corporation_uuid is required" });
      }

      // Pagination parameters
      const page = parseInt(query.page as string) || 1;
      const pageSize = parseInt(query.page_size as string) || 100;
      const offset = (page - 1) * pageSize;

      // Get total count for pagination metadata
      const { count, error: countError } = await supabaseServer
        .from("change_orders")
        .select("*", { count: "exact", head: true })
        .eq("corporation_uuid", corporation_uuid as string)
        .eq("is_active", true);

      if (countError) throw createError({ statusCode: 500, statusMessage: countError.message });

      const totalRecords = count || 0;
      const totalPages = Math.ceil(totalRecords / pageSize);

      // Fetch paginated data
      const { data, error } = await supabaseServer
        .from("change_orders")
        .select(`
          *,
          project:projects!project_uuid (
            uuid,
            project_name,
            project_id
          ),
          vendor:vendors!vendor_uuid (
            uuid,
            vendor_name
          ),
          purchase_order:purchase_order_forms!original_purchase_order_uuid (
            uuid,
            po_number
          )
        `)
        .eq("corporation_uuid", corporation_uuid as string)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw createError({ statusCode: 500, statusMessage: error.message });
      const list = Array.isArray(data) ? data : [];
      const hydrated = list.map((record: any) => {
        const decorated = decorateChangeOrderRecord(record);
        // Add metadata fields for easy access in the list view
        if (record.project) {
          (decorated as any).project_name = record.project.project_name || null;
          (decorated as any).project_id = record.project.project_id || null;
        }
        if (record.vendor) {
          (decorated as any).vendor_name = record.vendor.vendor_name || null;
        }
        if (record.purchase_order) {
          (decorated as any).po_number = record.purchase_order.po_number || null;
        }
        return decorated;
      });
      return { 
        data: hydrated,
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
      if (!body) throw createError({ statusCode: 400, statusMessage: "Request body is required" });
      if (!body.corporation_uuid)
        throw createError({ statusCode: 400, statusMessage: "corporation_uuid is required" });

      // Resolve ship via / freight by name when uuid not provided
      let shipViaUuid = body.ship_via_uuid || null;
      if (!shipViaUuid && body.ship_via) {
        const { data: sv } = await supabaseServer
          .from("ship_via")
          .select("uuid")
          .ilike("ship_via", String(body.ship_via))
          .maybeSingle();
        shipViaUuid = sv?.uuid || null;
      }
      let freightUuid = body.freight_uuid || null;
      if (!freightUuid && body.freight) {
        const { data: fr } = await supabaseServer
          .from("freight")
          .select("uuid")
          .ilike("ship_via", String(body.freight))
          .maybeSingle();
        freightUuid = fr?.uuid || null;
      }

      const normalizedCoType = normalizeCoType(body.co_type);

      const insertData: any = {
        corporation_uuid: body.corporation_uuid,
        project_uuid: body.project_uuid ?? null,
        vendor_uuid: body.vendor_uuid ?? null,
        original_purchase_order_uuid: body.original_purchase_order_uuid ?? null,
        co_number: body.co_number ?? null,
        created_date: normalizeUTC(body.created_date),
        credit_days: body.credit_days ?? null,
        estimated_delivery_date: normalizeUTC(
          body.estimated_delivery_date,
          true
        ),
        requested_by: body.requested_by ?? null,
        co_type: normalizedCoType,
        ship_via_uuid: shipViaUuid ?? null,
        freight_uuid: freightUuid ?? null,
        shipping_instructions: body.shipping_instructions ?? null,
        reason: body.reason ?? null,
        shipping_address_uuid: body.shipping_address_uuid ?? null,
        terms_and_conditions_uuid: body.terms_and_conditions_uuid ?? null,
        status: body.status ?? "Draft",
        is_active: true,
      };

      insertData.financial_breakdown = buildFinancialBreakdown(body);
      insertData.attachments = sanitizeAttachments(body.attachments);
      insertData.removed_co_items = Array.isArray(body.removed_co_items) ? body.removed_co_items : [];

      for (const key of [
        "project_uuid",
        "vendor_uuid",
        "ship_via_uuid",
        "freight_uuid",
        "shipping_address_uuid",
        "terms_and_conditions_uuid",
      ] as const) {
        if (insertData[key] === "") insertData[key] = null;
      }

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
        description: `Change order ${insertData.co_number || 'created'} created`
      } : null;

      insertData.audit_log = auditLogEntry ? [auditLogEntry] : [];

      const { data, error } = await supabaseServer
        .from("change_orders")
        .insert([insertData])
        .select()
        .single();

      if (error) throw createError({ statusCode: 500, statusMessage: error.message });

      if (data?.uuid) {
        await persistChangeOrderItems({
          changeOrderUuid: data.uuid,
          corporationUuid: data.corporation_uuid ?? null,
          projectUuid: data.project_uuid ?? null,
          items: Array.isArray(body.co_items) ? body.co_items : [],
        });
        
        // Save labor CO items if co_type is LABOR
        console.log("[change-orders POST] Checking labor CO items:", {
          normalizedCoType,
          purchaseOrderUuid: body.original_purchase_order_uuid,
          hasLaborCoItems: Array.isArray(body.labor_co_items) && body.labor_co_items.length > 0,
          laborCoItemsCount: Array.isArray(body.labor_co_items) ? body.labor_co_items.length : 0,
        });
        
        if (normalizedCoType === 'LABOR' && body.original_purchase_order_uuid) {
          const laborItems = Array.isArray(body.labor_co_items) ? body.labor_co_items : [];
          
          await persistLaborChangeOrderItems({
            changeOrderUuid: data.uuid,
            corporationUuid: data.corporation_uuid ?? null,
            projectUuid: data.project_uuid ?? null,
            purchaseOrderUuid: body.original_purchase_order_uuid ?? null,
            items: laborItems,
          });
          
          // Calculate total from labor CO items and update financial breakdown
          const laborItemsTotal = laborItems.reduce((sum: number, item: any) => {
            const amount = typeof item?.co_amount === 'number' && Number.isFinite(item.co_amount)
              ? item.co_amount
              : (typeof item?.co_amount === 'string' ? parseFloat(item.co_amount) || 0 : 0);
            return sum + amount;
          }, 0);
          
          const laborFinancialBreakdown = buildLaborCOFinancialBreakdown(laborItemsTotal);
          
          await supabaseServer
            .from("change_orders")
            .update({ financial_breakdown: laborFinancialBreakdown })
            .eq("uuid", data.uuid);
        }

        // Fetch the created record with JOINs to include metadata (project_name, project_id, vendor_name, po_number)
        const { data: recordWithMetadata, error: fetchError } = await supabaseServer
          .from("change_orders")
          .select(`
            *,
            project:projects!project_uuid (
              uuid,
              project_name,
              project_id
            ),
            vendor:vendors!vendor_uuid (
              uuid,
              vendor_name
            ),
            purchase_order:purchase_order_forms!original_purchase_order_uuid (
              uuid,
              po_number
            )
          `)
          .eq("uuid", data.uuid)
          .single();

        if (fetchError) {
          console.error("Error fetching created CO with metadata:", fetchError);
          // Fall back to returning data without metadata
          return { data: decorateChangeOrderRecord(data as any) };
        }

        if (recordWithMetadata) {
          const decorated = decorateChangeOrderRecord(recordWithMetadata);
          // Add metadata fields for easy access in the list view
          if (recordWithMetadata.project) {
            (decorated as any).project_name = recordWithMetadata.project.project_name || null;
            (decorated as any).project_id = recordWithMetadata.project.project_id || null;
          }
          if (recordWithMetadata.vendor) {
            (decorated as any).vendor_name = recordWithMetadata.vendor.vendor_name || null;
          }
          if (recordWithMetadata.purchase_order) {
            (decorated as any).po_number = recordWithMetadata.purchase_order.po_number || null;
          }
          return { data: decorated };
        }
      }

      return { data: decorateChangeOrderRecord(data as any) };
    }

    if (method === "PUT") {
      if (!body) throw createError({ statusCode: 400, statusMessage: "Request body is required" });
      const { uuid, ...updated } = body;
      if (!uuid) throw createError({ statusCode: 400, statusMessage: "uuid is required" });

      const updateData: any = {};
      const fields = [
        "corporation_uuid",
        "project_uuid",
        "vendor_uuid",
        "original_purchase_order_uuid",
        "co_number",
        "created_date",
        "credit_days",
        "estimated_delivery_date",
        "requested_by",
        "co_type",
        "ship_via_uuid",
        "freight_uuid",
        "shipping_instructions",
        "reason",
        "shipping_address_uuid",
        "terms_and_conditions_uuid",
        "status",
        "is_active",
      ];

      for (const f of fields) {
        if (updated[f] !== undefined) {
          if (f === "created_date") updateData[f] = normalizeUTC(updated[f]);
          else if (f === "estimated_delivery_date") updateData[f] = normalizeUTC(updated[f], true);
          else updateData[f] = updated[f];
        }
      }

      if (updated.removed_co_items !== undefined) {
        updateData.removed_co_items = Array.isArray(updated.removed_co_items)
          ? updated.removed_co_items
          : [];
      }

      for (const key of [
        "project_uuid",
        "vendor_uuid",
        "ship_via_uuid",
        "freight_uuid",
        "shipping_address_uuid",
        "terms_and_conditions_uuid",
      ] as const) {
        if (updateData[key] === "") updateData[key] = null;
      }

      if (updated.financial_breakdown && typeof updated.financial_breakdown === "object") {
        updateData.financial_breakdown = buildFinancialBreakdown(updated);
      }
      if (updated.attachments !== undefined) {
        updateData.attachments = sanitizeAttachments(updated.attachments);
      }

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

      // Get existing audit log and status
      const { data: existingCOWithAudit } = await supabaseServer
        .from("change_orders")
        .select("audit_log, status, co_number")
        .eq("uuid", uuid)
        .single();

      const existingAuditLog = Array.isArray(existingCOWithAudit?.audit_log) 
        ? existingCOWithAudit.audit_log 
        : [];
      const oldStatus = existingCOWithAudit?.status || 'Draft';
      const newStatus = updateData.status || oldStatus;
      const coNumber = existingCOWithAudit?.co_number || '';

      // Create audit log entry based on what changed
      let auditLogEntry = null;
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
              description: 'Change order marked as ready for approval'
            };
          } else if (newStatus === 'Approved' && oldStatus !== 'Approved') {
            auditLogEntry = {
              timestamp: new Date().toISOString(),
              user_uuid: userInfo.id,
              user_name: userInfo.name,
              user_email: userInfo.email,
              user_image_url: userInfo.image_url,
              action: 'approved',
              description: 'Change order approved'
            };
          } else if (newStatus === 'Rejected' && oldStatus !== 'Rejected') {
            auditLogEntry = {
              timestamp: new Date().toISOString(),
              user_uuid: userInfo.id,
              user_name: userInfo.name,
              user_email: userInfo.email,
              user_image_url: userInfo.image_url,
              action: 'rejected',
              description: 'Change order rejected'
            };
          }
        } else {
          // Status didn't change, but other fields did - track as update
          // Only track if there are actual field changes (not just status)
          const hasFieldChanges = Object.keys(updateData).some(
            key => key !== 'status' && key !== 'uuid' && key !== 'audit_log'
          );
          if (hasFieldChanges) {
            auditLogEntry = {
              timestamp: new Date().toISOString(),
              user_uuid: userInfo.id,
              user_name: userInfo.name,
              user_email: userInfo.email,
              user_image_url: userInfo.image_url,
              action: 'updated',
              description: 'Change order updated'
            };
          }
        }
      }

      // Merge audit log
      const mergedAuditLog = auditLogEntry 
        ? [...existingAuditLog, auditLogEntry]
        : existingAuditLog;

      // Always update audit_log if we created a new entry
      if (auditLogEntry) {
        updateData.audit_log = mergedAuditLog;
      }

      const { data, error } = await supabaseServer
        .from("change_orders")
        .update(updateData)
        .eq("uuid", uuid)
        .select()
        .single();

      if (error) throw createError({ statusCode: 500, statusMessage: error.message });

      if (data?.uuid) {
        await persistChangeOrderItems({
          changeOrderUuid: data.uuid,
          corporationUuid: data.corporation_uuid ?? null,
          projectUuid: data.project_uuid ?? null,
          items: Array.isArray(updated.co_items) ? updated.co_items : [],
        });
        
        // Save labor CO items if co_type is LABOR
        const currentCoType = normalizeCoType(updated.co_type ?? data.co_type);
        const purchaseOrderUuid = updated.original_purchase_order_uuid ?? data.original_purchase_order_uuid ?? null;
        
        console.log("[change-orders PUT] Checking labor CO items:", {
          currentCoType,
          purchaseOrderUuid,
          hasLaborCoItems: Array.isArray(updated.labor_co_items) && updated.labor_co_items.length > 0,
          laborCoItemsCount: Array.isArray(updated.labor_co_items) ? updated.labor_co_items.length : 0,
          laborCoItemsProvided: 'labor_co_items' in updated,
        });
        
        if (currentCoType === 'LABOR' && purchaseOrderUuid) {
          // Only update labor items if they are explicitly provided in the update
          // If not provided, preserve existing items (don't delete them)
          if ('labor_co_items' in updated) {
            const laborItems = Array.isArray(updated.labor_co_items) ? updated.labor_co_items : [];
            
            await persistLaborChangeOrderItems({
              changeOrderUuid: data.uuid,
              corporationUuid: data.corporation_uuid ?? null,
              projectUuid: data.project_uuid ?? null,
              purchaseOrderUuid: purchaseOrderUuid,
              items: laborItems,
            });
            
            // Calculate total from labor CO items and update financial breakdown
            const laborItemsTotal = laborItems.reduce((sum: number, item: any) => {
              const amount = typeof item?.co_amount === 'number' && Number.isFinite(item.co_amount)
                ? item.co_amount
                : (typeof item?.co_amount === 'string' ? parseFloat(item.co_amount) || 0 : 0);
              return sum + amount;
            }, 0);
            
            const laborFinancialBreakdown = buildLaborCOFinancialBreakdown(laborItemsTotal);
            
            await supabaseServer
              .from("change_orders")
              .update({ financial_breakdown: laborFinancialBreakdown })
              .eq("uuid", data.uuid);
          } else {
            // If labor_co_items not provided, recalculate financial breakdown from existing items
            // Fetch existing labor items to calculate total
            const { data: existingLaborItems } = await supabaseServer
              .from("labor_change_order_items_list")
              .select("co_amount")
              .eq("change_order_uuid", data.uuid)
              .eq("is_active", true);
            
            if (Array.isArray(existingLaborItems)) {
              const laborItemsTotal = existingLaborItems.reduce((sum: number, item: any) => {
                const amount = typeof item?.co_amount === 'number' && Number.isFinite(item.co_amount)
                  ? item.co_amount
                  : (typeof item?.co_amount === 'string' ? parseFloat(item.co_amount) || 0 : 0);
                return sum + amount;
              }, 0);
              
              const laborFinancialBreakdown = buildLaborCOFinancialBreakdown(laborItemsTotal);
              
              await supabaseServer
                .from("change_orders")
                .update({ financial_breakdown: laborFinancialBreakdown })
                .eq("uuid", data.uuid);
            }
          }
        }

        // Fetch the updated record with JOINs to include metadata (project_name, project_id, vendor_name, po_number)
        const { data: recordWithMetadata, error: fetchError } = await supabaseServer
          .from("change_orders")
          .select(`
            *,
            project:projects!project_uuid (
              uuid,
              project_name,
              project_id
            ),
            vendor:vendors!vendor_uuid (
              uuid,
              vendor_name
            ),
            purchase_order:purchase_order_forms!original_purchase_order_uuid (
              uuid,
              po_number
            )
          `)
          .eq("uuid", data.uuid)
          .single();

        if (fetchError) {
          console.error("Error fetching updated CO with metadata:", fetchError);
          // Fall back to returning data without metadata
          return { data: decorateChangeOrderRecord(data as any) };
        }

        if (recordWithMetadata) {
          const decorated = decorateChangeOrderRecord(recordWithMetadata);
          // Add metadata fields for easy access in the list view
          if (recordWithMetadata.project) {
            (decorated as any).project_name = recordWithMetadata.project.project_name || null;
            (decorated as any).project_id = recordWithMetadata.project.project_id || null;
          }
          if (recordWithMetadata.vendor) {
            (decorated as any).vendor_name = recordWithMetadata.vendor.vendor_name || null;
          }
          if (recordWithMetadata.purchase_order) {
            (decorated as any).po_number = recordWithMetadata.purchase_order.po_number || null;
          }
          return { data: decorated };
        }
      }

      return { data: decorateChangeOrderRecord(data as any) };
    }

    if (method === "DELETE") {
      const { uuid } = query;
      if (!uuid) throw createError({ statusCode: 400, statusMessage: "uuid is required" });

      const { data, error } = await supabaseServer
        .from("change_orders")
        .update({ is_active: false })
        .eq("uuid", uuid as string)
        .select()
        .single();

      if (error) throw createError({ statusCode: 500, statusMessage: error.message });
      return { data };
    }

    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  } catch (error: any) {
    console.error("change-orders API error:", error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});


