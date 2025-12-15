import { supabaseServer } from "@/utils/supabaseServer";
import { sanitizePurchaseOrderItem } from "./utils";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  try {
    if (method === "GET") {
      const query = getQuery(event);
      const purchaseOrderUuid = query.purchase_order_uuid as string | undefined;
      const includeInactive = query.include_inactive === "true";

      if (!purchaseOrderUuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "purchase_order_uuid is required",
        });
      }

      const { data, error } = await supabaseServer
        .from("purchase_order_items_list")
        .select("*")
        .eq("purchase_order_uuid", purchaseOrderUuid)
        .order("order_index", { ascending: true });

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

      const purchaseOrderUuid = body.purchase_order_uuid;
      if (!purchaseOrderUuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "purchase_order_uuid is required",
        });
      }

      let corporationUuid = body.corporation_uuid ?? null;
      let projectUuid = body.project_uuid ?? null;

      if (!corporationUuid || !projectUuid) {
        const { data: purchaseOrder, error: poError } = await supabaseServer
          .from("purchase_order_forms")
          .select("corporation_uuid, project_uuid")
          .eq("uuid", purchaseOrderUuid)
          .maybeSingle();

        if (poError) {
          throw createError({
            statusCode: 500,
            statusMessage: poError.message,
          });
        }

        if (!purchaseOrder) {
          throw createError({
            statusCode: 404,
            statusMessage: "Purchase order not found",
          });
        }

        corporationUuid = corporationUuid ?? purchaseOrder.corporation_uuid;
        projectUuid = projectUuid ?? purchaseOrder.project_uuid;
      }

      const items: any[] = Array.isArray(body.items) ? body.items : [];

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

      if (items.length) {
        const preparedItems = items.map((item, index) => ({
          ...sanitizePurchaseOrderItem(item, index),
          corporation_uuid: corporationUuid,
          project_uuid: projectUuid,
          purchase_order_uuid: purchaseOrderUuid,
        }));

        const { error: insertError } = await supabaseServer
          .from("purchase_order_items_list")
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
      const purchaseOrderUuid = query.purchase_order_uuid as string | undefined;
      const uuid = query.uuid as string | undefined;

      if (!purchaseOrderUuid && !uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "uuid or purchase_order_uuid is required",
        });
      }

      let builder = supabaseServer.from("purchase_order_items_list").delete();
      if (uuid) {
        builder = builder.eq("uuid", uuid);
      }
      if (purchaseOrderUuid) {
        builder = builder.eq("purchase_order_uuid", purchaseOrderUuid);
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
    console.error("[purchase-order-items] API error:", error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});


