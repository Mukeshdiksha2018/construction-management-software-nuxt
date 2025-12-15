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

    const { change_order_uuid, attachment_uuid } = body;
    if (!change_order_uuid || typeof change_order_uuid !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "change_order_uuid is required",
      });
    }
    if (!attachment_uuid || typeof attachment_uuid !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "attachment_uuid is required",
      });
    }

    const { data: changeOrder, error: coError } = await supabaseServer
      .from("change_orders")
      .select("uuid, attachments")
      .eq("uuid", change_order_uuid)
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

    const existing: any[] = Array.isArray(changeOrder.attachments)
      ? [...changeOrder.attachments]
      : [];
    const target = existing.find((a) => a?.uuid === attachment_uuid);
    const updatedAttachments = existing.filter((a) => a?.uuid !== attachment_uuid);

    if (target?.file_path) {
      await supabaseServer.storage.from("change_order_storage").remove([target.file_path]);
    }

    const { data: updatedRow, error: updateError } = await supabaseServer
      .from("change_orders")
      .update({ attachments: updatedAttachments })
      .eq("uuid", change_order_uuid)
      .select("attachments")
      .single();

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: updateError.message,
      });
    }

    return {
      success: true,
      attachments: updatedRow.attachments || [],
    };
  } catch (error: any) {
    console.error("[CO Attachments] remove API error:", error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});


