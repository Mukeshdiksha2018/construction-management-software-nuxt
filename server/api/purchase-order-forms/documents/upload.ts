import { supabaseServer } from "@/utils/supabaseServer";
import { randomUUID } from "node:crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["application/pdf"];

const toError = (fileName: string, error: string) => ({
  fileName,
  error,
});

const decodeBase64File = (data: string): Buffer => {
  if (!data) {
    return Buffer.from([]);
  }

  const matches = data.match(/^data:(.*?);base64,(.*)$/);
  const base64String = matches ? matches[2] : data;
  return Buffer.from(base64String, "base64");
};

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

    const { purchase_order_uuid, files } = body;

    if (!purchase_order_uuid || typeof purchase_order_uuid !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "purchase_order_uuid is required",
      });
    }

    if (!Array.isArray(files) || files.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Files array is required and must not be empty",
      });
    }

    const { data: purchaseOrder, error: poError } = await supabaseServer
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

    if (!purchaseOrder) {
      throw createError({
        statusCode: 404,
        statusMessage: "Purchase order not found",
      });
    }

    const existingAttachments: any[] = Array.isArray(purchaseOrder.attachments)
      ? [...purchaseOrder.attachments]
      : [];

    const uploadedAttachments: any[] = [];
    const errors: Array<{ fileName: string; error: string }> = [];

    for (const file of files) {
      try {
        const name = file?.name;
        const type = file?.type;
        const size = Number(file?.size);
        const fileData: string | undefined = file?.fileData || file?.url || file?.file;

        if (!name || !type || Number.isNaN(size) || !fileData) {
          errors.push(
            toError(name || "Unknown", "Missing required file properties")
          );
          continue;
        }

        if (!ALLOWED_TYPES.includes(type)) {
          errors.push(
            toError(
              name,
              "Invalid file type. Only PDF files are allowed"
            )
          );
          continue;
        }

        if (size > MAX_FILE_SIZE) {
          errors.push(
            toError(name, "File size too large. Maximum size is 10MB")
          );
          continue;
        }

        const buffer = decodeBase64File(fileData);
        if (!buffer.length) {
          errors.push(
            toError(name, "Unable to decode file contents")
          );
          continue;
        }

        const extension = name.includes(".") ? name.split(".").pop() : "";
        const safeExtension = extension ? `.${extension}` : ".pdf";
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}${safeExtension}`;
        const filePath = `purchase-orders/${purchase_order_uuid}/${fileName}`;

        const { error: uploadError } = await supabaseServer.storage
          .from("purchase-order-documents")
          .upload(filePath, buffer, {
            contentType: type,
            upsert: false,
          });

        if (uploadError) {
          console.error("[PO Attachments] upload error:", uploadError);
          errors.push(
            toError(
              name,
              `Failed to upload file to storage: ${uploadError.message}`
            )
          );
          continue;
        }

        const { data: urlData } = supabaseServer.storage
          .from("purchase-order-documents")
          .getPublicUrl(filePath);

        const attachmentRecord = {
          uuid: randomUUID(),
          document_name: name,
          mime_type: type,
          file_size: size,
          file_url: urlData?.publicUrl ?? null,
          file_path: filePath,
          uploaded_at: new Date().toISOString(),
        };

        uploadedAttachments.push(attachmentRecord);
      } catch (err: any) {
        console.error("[PO Attachments] unexpected error:", err);
        errors.push(
          toError(
            file?.name || "Unknown",
            `Unexpected error processing file: ${err?.message || "Unknown error"}`
          )
        );
      }
    }

    if (uploadedAttachments.length > 0) {
      const updatedAttachments = [...existingAttachments, ...uploadedAttachments];

      const { data: updatedRow, error: updateError } = await supabaseServer
        .from("purchase_order_forms")
        .update({ attachments: updatedAttachments })
        .eq("uuid", purchase_order_uuid)
        .select("attachments")
        .single();

      if (updateError) {
        console.error("[PO Attachments] database update error:", updateError);
        throw createError({
          statusCode: 500,
          statusMessage: updateError.message,
        });
      }

      return {
        success: true,
        attachments: updatedRow.attachments || [],
        errors,
      };
    }

    return {
      success: false,
      attachments: existingAttachments,
      errors,
    };
  } catch (error: any) {
    console.error("[PO Attachments] upload API error:", error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});

