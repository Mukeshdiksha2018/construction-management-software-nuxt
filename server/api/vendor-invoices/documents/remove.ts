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

    const { invoice_uuid, attachment_uuid } = body;

    if (!invoice_uuid || typeof invoice_uuid !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "invoice_uuid is required",
      });
    }

    if (!attachment_uuid || typeof attachment_uuid !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "attachment_uuid is required",
      });
    }

    const { data: invoice, error: invoiceError } = await supabaseServer
      .from("vendor_invoices")
      .select("uuid, attachments")
      .eq("uuid", invoice_uuid)
      .maybeSingle();

    if (invoiceError) {
      throw createError({
        statusCode: 500,
        statusMessage: invoiceError.message,
      });
    }

    if (!invoice) {
      throw createError({
        statusCode: 404,
        statusMessage: "Vendor invoice not found",
      });
    }

    const existingAttachments: any[] = Array.isArray(invoice.attachments)
      ? [...invoice.attachments]
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
        .from("vendor-invoice-documents")
        .remove([targetAttachment.file_path]);

      if (removeError) {
        console.error(
          "[Vendor Invoice Attachments] failed to remove file from storage:",
          removeError
        );
      }
    }

    const { data: updatedRow, error: updateError } = await supabaseServer
      .from("vendor_invoices")
      .update({ attachments: existingAttachments })
      .eq("uuid", invoice_uuid)
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
    console.error("[Vendor Invoice Attachments] remove API error:", error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});

