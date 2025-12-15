import { supabaseServer } from "@/utils/supabaseServer";
import { sanitizeLaborChangeOrderItem } from "./utils";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  try {
    if (method === "GET") {
      const query = getQuery(event);
      const changeOrderUuid = query.change_order_uuid as string | undefined;
      const purchaseOrderUuid = query.purchase_order_uuid as string | undefined;
      const includeInactive = query.include_inactive === "true";

      if (!changeOrderUuid && !purchaseOrderUuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "change_order_uuid or purchase_order_uuid is required",
        });
      }

      let builder = supabaseServer
        .from("labor_change_order_items_list")
        .select("*")
        .order("order_index", { ascending: true });

      if (changeOrderUuid) {
        builder = builder.eq("change_order_uuid", changeOrderUuid);
      }

      if (purchaseOrderUuid) {
        builder = builder.eq("purchase_order_uuid", purchaseOrderUuid);
      }

      const { data, error } = await builder;

      if (error) {
        throw createError({
          statusCode: 500,
          statusMessage: error.message,
        });
      }

      const filtered = includeInactive
        ? data || []
        : (data || []).filter((item) => item.is_active !== false);

      return { data: filtered };
    }

    if (method === "POST" || method === "PUT") {
      const body = await readBody(event);
      if (!body) {
        throw createError({
          statusCode: 400,
          statusMessage: "Request body is required",
        });
      }

      const changeOrderUuid = body.change_order_uuid;
      const purchaseOrderUuid = body.purchase_order_uuid;

      if (!changeOrderUuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "change_order_uuid is required",
        });
      }

      if (!purchaseOrderUuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "purchase_order_uuid is required",
        });
      }

      // Get corporation_uuid and project_uuid from change order
      const { data: changeOrder, error: coError } = await supabaseServer
        .from("change_orders")
        .select("corporation_uuid, project_uuid")
        .eq("uuid", changeOrderUuid)
        .maybeSingle();

      if (coError) {
        throw createError({
          statusCode: 500,
          statusMessage: coError.message,
        });
      }

      if (!changeOrder) {
        throw createError({
          statusCode: 404,
          statusMessage: "Change order not found",
        });
      }

      const corporationUuid = changeOrder.corporation_uuid;
      const projectUuid = changeOrder.project_uuid;

      const items: any[] = Array.isArray(body.items) ? body.items : [];

      // Delete existing labor items for this change order
      const { error: deleteError } = await supabaseServer
        .from("labor_change_order_items_list")
        .delete()
        .eq("change_order_uuid", changeOrderUuid);

      if (deleteError) {
        throw createError({
          statusCode: 500,
          statusMessage: deleteError.message,
        });
      }

      if (items.length) {
        const preparedItems = items.map((item, index) => ({
          ...sanitizeLaborChangeOrderItem(item, index),
          corporation_uuid: corporationUuid,
          project_uuid: projectUuid,
          purchase_order_uuid: purchaseOrderUuid,
          change_order_uuid: changeOrderUuid,
        }));

        const { error: insertError } = await supabaseServer
          .from("labor_change_order_items_list")
          .insert(preparedItems);

        if (insertError) {
          throw createError({
            statusCode: 500,
            statusMessage: insertError.message,
          });
        }
      }

      return { success: true };
    }

    if (method === "DELETE") {
      const query = getQuery(event);
      const changeOrderUuid = query.change_order_uuid as string | undefined;
      const uuid = query.uuid as string | undefined;

      if (!changeOrderUuid && !uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "uuid or change_order_uuid is required",
        });
      }

      let builder = supabaseServer.from("labor_change_order_items_list").delete();
      if (uuid) {
        builder = builder.eq("uuid", uuid);
      }
      if (changeOrderUuid) {
        builder = builder.eq("change_order_uuid", changeOrderUuid);
      }

      const { error } = await builder;
      if (error) {
        throw createError({
          statusCode: 500,
          statusMessage: error.message,
        });
      }

      return { success: true };
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  } catch (error: any) {
    console.error("[labor-change-order-items] API error:", error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});

