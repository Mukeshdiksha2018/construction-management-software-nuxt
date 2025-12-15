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

    const { purchase_order_uuid, attachment_uuid } = body;

    if (!purchase_order_uuid || typeof purchase_order_uuid !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "purchase_order_uuid is required",
      });
    }

    if (!attachment_uuid || typeof attachment_uuid !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "attachment_uuid is required",
      });
    }

    const { data: po, error: poError } = await supabaseServer
      .from("purchase_order_forms")
      .select("uuid, attachments")
      .eq("uuid", purchase_order_uuid)
      .maybeSingle();

    if (poError) {
      throw createError({
        statusCode: 500,
        statusMessage: poError.message,
      });
    }

    if (!po) {
      throw createError({
        statusCode: 404,
        statusMessage: "Purchase order not found",
      });
    }

    const existingAttachments: any[] = Array.isArray(po.attachments)
      ? [...po.attachments]
      : [];

    const targetIndex = existingAttachments.findIndex(
      (attachment) => attachment?.uuid === attachment_uuid
    );

    if (targetIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "Attachment not found",
      });
    }

    const [targetAttachment] = existingAttachments.splice(targetIndex, 1);

    if (targetAttachment?.file_path) {
      const { error: removeError } = await supabaseServer.storage
        .from("purchase-order-documents")
        .remove([targetAttachment.file_path]);

      if (removeError) {
        console.error(
          "[PO Attachments] failed to remove file from storage:",
          removeError
        );
      }
    }

    const { data: updatedRow, error: updateError } = await supabaseServer
      .from("purchase_order_forms")
      .update({ attachments: existingAttachments })
      .eq("uuid", purchase_order_uuid)
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
    console.error("[PO Attachments] remove API error:", error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});

