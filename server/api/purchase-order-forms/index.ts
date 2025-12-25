import { supabaseServer } from "@/utils/supabaseServer";
import {
  buildFinancialBreakdown,
  decoratePurchaseOrderRecord,
  hasFinancialPayload,
  sanitizeAttachments,
} from "./utils";
import { sanitizePurchaseOrderItem } from "../purchase-order-items/utils";
import { sanitizeLaborPurchaseOrderItem } from "../labor-purchase-order-items/utils";

const persistPurchaseOrderItems = async (options: {
  purchaseOrderUuid: string;
  corporationUuid: string | null;
  projectUuid: string | null;
  items: any[];
}) => {
  const {
    purchaseOrderUuid,
    corporationUuid,
    projectUuid,
    items = [],
  } = options;

  if (!purchaseOrderUuid) return;

  const { error: deleteError } = await supabaseServer
    .from("purchase_order_items_list")
    .delete()
    .eq("purchase_order_uuid", purchaseOrderUuid);

  if (deleteError) {
    throw createError({
      statusCode: 500,
      statusMessage: deleteError.message,
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return;
  }

  const prepared = items.map((item, index) => ({
    ...sanitizePurchaseOrderItem(item, index),
    corporation_uuid: corporationUuid,
    project_uuid: projectUuid,
    purchase_order_uuid: purchaseOrderUuid,
  }));

  const { error: insertError } = await supabaseServer
    .from("purchase_order_items_list")
    .insert(prepared);

  if (insertError) {
    throw createError({
      statusCode: 500,
      statusMessage: insertError.message,
    });
  }
};

const persistLaborPurchaseOrderItems = async (options: {
  purchaseOrderUuid: string;
  corporationUuid: string | null;
  projectUuid: string | null;
  items: any[];
}) => {
  const {
    purchaseOrderUuid,
    corporationUuid,
    projectUuid,
    items = [],
  } = options;

  if (!purchaseOrderUuid) return;

  const { error: deleteError } = await supabaseServer
    .from("labor_purchase_order_items_list")
    .delete()
    .eq("purchase_order_uuid", purchaseOrderUuid);

  if (deleteError) {
    throw createError({
      statusCode: 500,
      statusMessage: deleteError.message,
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return;
  }

  const prepared = items.map((item, index) => ({
    ...sanitizeLaborPurchaseOrderItem(item, index),
    corporation_uuid: corporationUuid,
    project_uuid: projectUuid,
    purchase_order_uuid: purchaseOrderUuid,
  }));

  const { error: insertError } = await supabaseServer
    .from("labor_purchase_order_items_list")
    .insert(prepared);

  if (insertError) {
    throw createError({
      statusCode: 500,
      statusMessage: insertError.message,
    });
  }
};

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);
  const body =
    method === "POST" || method === "PUT" ? await readBody(event) : null;

  const normalizeUTC = (val: any, endOfDay = false) => {
    if (!val && val !== 0) return null;
    const s = String(val);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return endOfDay ? `${s}T23:59:59.000Z` : `${s}T00:00:00.000Z`;
    }
    return s;
  };

  const normalizePoType = (val: any) => {
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
          .from("purchase_order_forms")
          .select("*")
          .eq("uuid", uuid as string)
          .maybeSingle();

        if (error)
          throw createError({ statusCode: 500, statusMessage: error.message });
        if (!data)
          throw createError({
            statusCode: 404,
            statusMessage: "Form not found",
          });
        return { data: decoratePurchaseOrderRecord({ ...data }) };
      }

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
        .from("purchase_order_forms")
        .select("*", { count: "exact", head: true })
        .eq("corporation_uuid", corporation_uuid as string)
        .eq("is_active", true);

      if (countError)
        throw createError({ statusCode: 500, statusMessage: countError.message });

      const totalRecords = count || 0;
      const totalPages = Math.ceil(totalRecords / pageSize);

      // Fetch paginated data
      const { data, error } = await supabaseServer
        .from("purchase_order_forms")
        .select(
          `
          *,
          project:projects!project_uuid (
            uuid,
            project_name,
            project_id
          ),
          vendor:vendors!vendor_uuid (
            uuid,
            vendor_name
          )
        `
        )
        .eq("corporation_uuid", corporation_uuid as string)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error)
        throw createError({ statusCode: 500, statusMessage: error.message });
      const hydrated =
        data?.map((record: any) => {
          const decorated = decoratePurchaseOrderRecord({ ...record });
          // Add metadata fields for easy access in the list view
          if (record.project) {
            (decorated as any).project_name =
              record.project.project_name || null;
            (decorated as any).project_id = record.project.project_id || null;
          }
          if (record.vendor) {
            (decorated as any).vendor_name = record.vendor.vendor_name || null;
          }
          return decorated;
        }) || [];
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
      if (!body)
        throw createError({
          statusCode: 400,
          statusMessage: "Request body is required",
        });
      if (!body.corporation_uuid)
        throw createError({
          statusCode: 400,
          statusMessage: "corporation_uuid is required",
        });

      // Debug: log incoming critical fields
      console.log("[POF][POST] incoming", {
        po_type: body?.po_type,
        credit_days: body?.credit_days,
        include_items: body?.include_items,
        ship_via: body?.ship_via,
        ship_via_uuid: body?.ship_via_uuid,
        freight: body?.freight,
        freight_uuid: body?.freight_uuid,
      });

      // Resolve ship_via_uuid / freight_uuid from names when only text is provided
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

      const rawMode =
        typeof body.po_mode === "string"
          ? body.po_mode.toUpperCase()
          : "PROJECT";
      const poMode = rawMode === "CUSTOM" ? "CUSTOM" : "PROJECT";
      const normalizedPoType = normalizePoType(
        body.po_type_uuid ?? body.po_type
      );

      const insertData: any = {
        corporation_uuid: body.corporation_uuid,
        project_uuid: poMode === "PROJECT" ? body.project_uuid ?? null : null,
        vendor_uuid: body.vendor_uuid ?? null,
        po_mode: poMode,
        po_number: body.po_number ?? null,
        entry_date: normalizeUTC(body.entry_date),
        po_type: normalizedPoType,
        po_type_uuid: normalizedPoType,
        credit_days: body.credit_days ?? null,
        ship_via_uuid: shipViaUuid ?? null,
        freight_uuid: freightUuid ?? null,
        shipping_instructions: body.shipping_instructions ?? null,
        estimated_delivery_date: normalizeUTC(
          body.estimated_delivery_date,
          true
        ),
        include_items: body.include_items ?? null,
        raise_against: body.raise_against ?? null,
        shipping_address_uuid:
          poMode === "PROJECT" ? body.shipping_address_uuid ?? null : null,
        billing_address_uuid: body.billing_address_uuid ?? null,
        shipping_address_custom:
          poMode === "CUSTOM" ? body.shipping_address_custom ?? null : null,
        terms_and_conditions_uuid: body.terms_and_conditions_uuid ?? null,
        status: body.status ?? "Draft",
        is_active: true,
      };

      insertData.financial_breakdown = buildFinancialBreakdown(body);
      insertData.attachments = sanitizeAttachments(body.attachments);

      insertData.removed_po_items = Array.isArray(body.removed_po_items)
        ? body.removed_po_items
        : [];

      // Normalize empty strings to null
      for (const key of [
        "project_uuid",
        "vendor_uuid",
        "ship_via_uuid",
        "freight_uuid",
        "po_type_uuid",
        "shipping_address_uuid",
        "billing_address_uuid",
        "terms_and_conditions_uuid",
      ] as const) {
        if (insertData[key] === "") insertData[key] = null;
      }
      if (insertData.shipping_address_custom === "")
        insertData.shipping_address_custom = null;

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
        description: `Purchase order ${insertData.po_number || 'created'} created`
      } : null;

      insertData.audit_log = auditLogEntry ? [auditLogEntry] : [];

      console.log("[POF][POST] insertData", insertData);
      const { data, error } = await supabaseServer
        .from("purchase_order_forms")
        .insert([insertData])
        .select()
        .single();

      if (error)
        throw createError({ statusCode: 500, statusMessage: error.message });

      if (data?.uuid) {
        const isLaborPO = normalizedPoType === "LABOR";

        if (isLaborPO) {
          // Save labor items
          await persistLaborPurchaseOrderItems({
            purchaseOrderUuid: data.uuid,
            corporationUuid: data.corporation_uuid ?? null,
            projectUuid: data.project_uuid ?? null,
            items: Array.isArray(body.labor_po_items)
              ? body.labor_po_items
              : [],
          });
        } else {
          // Save material items
          await persistPurchaseOrderItems({
            purchaseOrderUuid: data.uuid,
            corporationUuid: data.corporation_uuid ?? null,
            projectUuid: data.project_uuid ?? null,
            items: Array.isArray(body.po_items) ? body.po_items : [],
          });
        }

        // Fetch the created record with JOINs to include metadata (project_name, project_id, vendor_name)
        const { data: recordWithMetadata, error: fetchError } =
          await supabaseServer
            .from("purchase_order_forms")
            .select(
              `
            *,
            project:projects!project_uuid (
              uuid,
              project_name,
              project_id
            ),
            vendor:vendors!vendor_uuid (
              uuid,
              vendor_name
            )
          `
            )
            .eq("uuid", data.uuid)
            .single();

        if (fetchError) {
          console.error("Error fetching created PO with metadata:", fetchError);
          // Fall back to returning data without metadata
          return { data: decoratePurchaseOrderRecord({ ...data }) };
        }

        if (recordWithMetadata) {
          const decorated = decoratePurchaseOrderRecord({
            ...recordWithMetadata,
          });
          // Add metadata fields for easy access in the list view
          if (recordWithMetadata.project) {
            (decorated as any).project_name =
              recordWithMetadata.project.project_name || null;
            (decorated as any).project_id =
              recordWithMetadata.project.project_id || null;
          }
          if (recordWithMetadata.vendor) {
            (decorated as any).vendor_name =
              recordWithMetadata.vendor.vendor_name || null;
          }
          return { data: decorated };
        }
      }

      return { data: decoratePurchaseOrderRecord({ ...data }) };
    }

    if (method === "PUT") {
      if (!body)
        throw createError({
          statusCode: 400,
          statusMessage: "Request body is required",
        });
      const { uuid, ...updated } = body;
      if (!uuid)
        throw createError({
          statusCode: 400,
          statusMessage: "uuid is required",
        });

      const updateData: any = {};
      const rawMode =
        typeof updated.po_mode === "string"
          ? updated.po_mode.toUpperCase()
          : undefined;
      const poMode =
        rawMode === "CUSTOM"
          ? "CUSTOM"
          : rawMode === "PROJECT"
          ? "PROJECT"
          : undefined;

      const fields = [
        "corporation_uuid",
        "project_uuid",
        "vendor_uuid",
        "po_number",
        "entry_date",
        "po_type",
        "po_type_uuid",
        "credit_days",
        "ship_via_uuid",
        "freight_uuid",
        "shipping_instructions",
        "estimated_delivery_date",
        "include_items",
        "raise_against",
        "po_mode",
        "shipping_address_uuid",
        "shipping_address_custom",
        "billing_address_uuid",
        "terms_and_conditions_uuid",
        "status",
        "is_active",
      ];

      for (const f of fields) {
        if (updated[f] !== undefined) {
          if (f === "entry_date") updateData[f] = normalizeUTC(updated[f]);
          else if (f === "estimated_delivery_date")
            updateData[f] = normalizeUTC(updated[f], true);
          else updateData[f] = updated[f];
        }
      }

      if (updated.removed_po_items !== undefined) {
        updateData.removed_po_items = Array.isArray(updated.removed_po_items)
          ? updated.removed_po_items
          : [];
      }

      for (const key of [
        "project_uuid",
        "vendor_uuid",
        "ship_via_uuid",
        "freight_uuid",
        "po_type_uuid",
        "shipping_address_uuid",
        "billing_address_uuid",
        "terms_and_conditions_uuid",
      ] as const) {
        if (updateData[key] === "") updateData[key] = null;
      }
      if (updateData.shipping_address_custom === "")
        updateData.shipping_address_custom = null;

      // Backfill UUIDs from provided text names if needed
      if (!updateData.ship_via_uuid && updated.ship_via) {
        const { data: sv } = await supabaseServer
          .from("ship_via")
          .select("uuid")
          .ilike("ship_via", String(updated.ship_via))
          .maybeSingle();
        if (sv?.uuid) updateData.ship_via_uuid = sv.uuid;
      }
      if (!updateData.freight_uuid && updated.freight) {
        const { data: fr } = await supabaseServer
          .from("freight")
          .select("uuid")
          .ilike("ship_via", String(updated.freight))
          .maybeSingle();
        if (fr?.uuid) updateData.freight_uuid = fr.uuid;
      }

      if (poMode) {
        updateData.po_mode = poMode;
        if (poMode === "CUSTOM") {
          updateData.project_uuid = null;
          updateData.shipping_address_uuid = null;
        } else if (poMode === "PROJECT") {
          updateData.shipping_address_custom = null;
        }
      }

      if (hasFinancialPayload(updated)) {
        updateData.financial_breakdown = buildFinancialBreakdown(updated);
      } else if (
        updated.financial_breakdown &&
        typeof updated.financial_breakdown === "object"
      ) {
        updateData.financial_breakdown = updated.financial_breakdown;
      }

      if (updated.attachments !== undefined) {
        updateData.attachments = sanitizeAttachments(updated.attachments);
      }

      if (updated.po_type !== undefined || updated.po_type_uuid !== undefined) {
        const normalizedPoType = normalizePoType(
          updated.po_type_uuid ?? updated.po_type
        );
        updateData.po_type = normalizedPoType;
        updateData.po_type_uuid = normalizedPoType;
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
      const { data: existingPOWithAudit } = await supabaseServer
        .from("purchase_order_forms")
        .select("audit_log, status, po_number")
        .eq("uuid", uuid)
        .single();

      const existingAuditLog = Array.isArray(existingPOWithAudit?.audit_log) 
        ? existingPOWithAudit.audit_log 
        : [];
      const oldStatus = existingPOWithAudit?.status || 'Draft';
      const newStatus = updateData.status || oldStatus;
      const poNumber = existingPOWithAudit?.po_number || '';

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
              description: 'Purchase order marked as ready for approval'
            };
          } else if (newStatus === 'Approved' && oldStatus !== 'Approved') {
            auditLogEntry = {
              timestamp: new Date().toISOString(),
              user_uuid: userInfo.id,
              user_name: userInfo.name,
              user_email: userInfo.email,
              user_image_url: userInfo.image_url,
              action: 'approved',
              description: 'Purchase order approved'
            };
          } else if (newStatus === 'Rejected' && oldStatus !== 'Rejected') {
            auditLogEntry = {
              timestamp: new Date().toISOString(),
              user_uuid: userInfo.id,
              user_name: userInfo.name,
              user_email: userInfo.email,
              user_image_url: userInfo.image_url,
              action: 'rejected',
              description: 'Purchase order rejected'
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
              description: 'Purchase order updated'
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

      // Debug: log incoming and final update payload
      console.log("[POF][PUT] incoming", {
        uuid,
        po_type: updated?.po_type,
        credit_days: updated?.credit_days,
        include_items: updated?.include_items,
        ship_via: updated?.ship_via,
        ship_via_uuid: updated?.ship_via_uuid,
        freight: updated?.freight,
        freight_uuid: updated?.freight_uuid,
      });
      console.log("[POF][PUT] updateData", updateData);
      const { data, error } = await supabaseServer
        .from("purchase_order_forms")
        .update(updateData)
        .eq("uuid", uuid)
        .select()
        .single();

      if (error)
        throw createError({ statusCode: 500, statusMessage: error.message });

      if (data?.uuid) {
        // Determine if this is a Labor PO by checking updateData or data
        const finalPoType = updateData.po_type ?? data.po_type;
        const isLaborPO = finalPoType === "LABOR";
        const wasLaborPO = data.po_type === "LABOR";

        if (isLaborPO) {
          // Save labor items
          await persistLaborPurchaseOrderItems({
            purchaseOrderUuid: data.uuid,
            corporationUuid: data.corporation_uuid ?? null,
            projectUuid: data.project_uuid ?? null,
            items: Array.isArray(updated.labor_po_items)
              ? updated.labor_po_items
              : [],
          });
          // Clear material items if switching from Material to Labor
          if (!wasLaborPO) {
            await supabaseServer
              .from("purchase_order_items_list")
              .delete()
              .eq("purchase_order_uuid", data.uuid);
          }
        } else {
          // Save material items
          await persistPurchaseOrderItems({
            purchaseOrderUuid: data.uuid,
            corporationUuid: data.corporation_uuid ?? null,
            projectUuid: data.project_uuid ?? null,
            items: Array.isArray(updated.po_items) ? updated.po_items : [],
          });
          // Clear labor items if switching from Labor to Material
          if (wasLaborPO) {
            await supabaseServer
              .from("labor_purchase_order_items_list")
              .delete()
              .eq("purchase_order_uuid", data.uuid);
          }
        }

        // Fetch the updated record with JOINs to include metadata (project_name, project_id, vendor_name)
        const { data: recordWithMetadata, error: fetchError } =
          await supabaseServer
            .from("purchase_order_forms")
            .select(
              `
            *,
            project:projects!project_uuid (
              uuid,
              project_name,
              project_id
            ),
            vendor:vendors!vendor_uuid (
              uuid,
              vendor_name
            )
          `
            )
            .eq("uuid", data.uuid)
            .single();

        if (fetchError) {
          console.error("Error fetching updated PO with metadata:", fetchError);
          // Fall back to returning data without metadata
          return { data: decoratePurchaseOrderRecord({ ...data }) };
        }

        if (recordWithMetadata) {
          const decorated = decoratePurchaseOrderRecord({
            ...recordWithMetadata,
          });
          // Add metadata fields for easy access in the list view
          if (recordWithMetadata.project) {
            (decorated as any).project_name =
              recordWithMetadata.project.project_name || null;
            (decorated as any).project_id =
              recordWithMetadata.project.project_id || null;
          }
          if (recordWithMetadata.vendor) {
            (decorated as any).vendor_name =
              recordWithMetadata.vendor.vendor_name || null;
          }
          return { data: decorated };
        }
      }

      return { data: decoratePurchaseOrderRecord({ ...data }) };
    }

    if (method === "DELETE") {
      const { uuid } = query;
      if (!uuid)
        throw createError({
          statusCode: 400,
          statusMessage: "uuid is required",
        });

      const { data, error } = await supabaseServer
        .from("purchase_order_forms")
        .update({ is_active: false })
        .eq("uuid", uuid as string)
        .select()
        .single();

      if (error)
        throw createError({ statusCode: 500, statusMessage: error.message });
      return { data: decoratePurchaseOrderRecord({ ...data }) };
    }

    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  } catch (error: any) {
    console.error("purchase-order-forms API error:", error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});


