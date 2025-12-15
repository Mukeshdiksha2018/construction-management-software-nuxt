import { supabaseServer } from "@/utils/supabaseServer";
import { H3Event } from "h3";
import { randomUUID } from "node:crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

type AttachmentInput = Record<string, any>;

type AttachmentRecord = {
  uuid: string;
  document_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  file_url: string | null;
  file_path: string;
  uploaded_at: string;
};

const decodeBase64File = (data: string | undefined | null): Buffer => {
  if (!data) {
    return Buffer.from([]);
  }

  const matches = data.match(/^data:(.*?);base64,(.*)$/);
  const base64String = matches ? matches[2] : data;
  return Buffer.from(base64String, "base64");
};

const normalizeTimestamp = (value: any): string | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const str = String(value).trim();
  if (!str) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return `${str}T00:00:00.000Z`;
  }

  const millisMatch = str.match(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/
  );
  if (millisMatch) {
    return str.length === 20 ? `${str.slice(0, 19)}.000Z` : str;
  }

  return str;
};

const normalizeStatus = (status?: string | null): "Shipment" | "Received" => {
  const normalized = String(status || "").trim().toLowerCase();
  switch (normalized) {
    case "received":
      return "Received";
    case "shipment":
      return "Shipment";
    default:
      return "Shipment";
  }
};

const sanitizeExistingAttachment = (
  attachment: AttachmentInput | null | undefined
): AttachmentRecord | null => {
  if (!attachment) return null;

  const filePath =
    typeof attachment.file_path === "string"
      ? attachment.file_path
      : typeof attachment.path === "string"
      ? attachment.path
      : null;

  const fileUrl =
    typeof attachment.file_url === "string"
      ? attachment.file_url
      : typeof attachment.url === "string"
      ? attachment.url
      : null;

  if (!filePath || !fileUrl) {
    return null;
  }

  const id =
    typeof attachment.uuid === "string"
      ? attachment.uuid
      : typeof attachment.id === "string"
      ? attachment.id
      : randomUUID();

  const name =
    typeof attachment.document_name === "string"
      ? attachment.document_name
      : typeof attachment.name === "string"
      ? attachment.name
      : null;

  const mime =
    typeof attachment.mime_type === "string"
      ? attachment.mime_type
      : typeof attachment.type === "string"
      ? attachment.type
      : null;

  const sizeRaw =
    typeof attachment.file_size === "number"
      ? attachment.file_size
      : typeof attachment.size === "number"
      ? attachment.size
      : null;

  const uploadedAt =
    typeof attachment.uploaded_at === "string"
      ? attachment.uploaded_at
      : new Date().toISOString();

  return {
    uuid: id,
    document_name: name,
    mime_type: mime,
    file_size: sizeRaw,
    file_url: fileUrl,
    file_path: filePath,
    uploaded_at: uploadedAt,
  };
};

const uploadAttachment = async (
  noteUuid: string,
  attachment: AttachmentInput
): Promise<AttachmentRecord> => {
  const name = typeof attachment.name === "string" ? attachment.name : null;
  const type = typeof attachment.type === "string" ? attachment.type : null;
  const size =
    typeof attachment.size === "number"
      ? attachment.size
      : typeof attachment.file_size === "number"
      ? attachment.file_size
      : null;
  const fileData =
    typeof attachment.fileData === "string"
      ? attachment.fileData
      : typeof attachment.file_data === "string"
      ? attachment.file_data
      : typeof attachment.url === "string"
      ? attachment.url
      : null;

  if (!name || !type || size === null || size === undefined || !fileData) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Attachment is missing required properties (name, type, size, data)",
    });
  }

  if (!ALLOWED_TYPES.includes(type)) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Invalid file type. Allowed types: PDF, JPEG, JPG, PNG for attachments.",
    });
  }

  if (size > MAX_FILE_SIZE) {
    throw createError({
      statusCode: 400,
      statusMessage: "File size too large. Maximum size is 10MB.",
    });
  }

  const buffer = decodeBase64File(fileData);
  if (!buffer.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "Unable to decode attachment contents.",
    });
  }

  const extension = name.includes(".") ? `.${name.split(".").pop()}` : "";
  const sanitizedExtension = extension || ".bin";
  const randomName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}${sanitizedExtension}`;
  const filePath = `stock-receipt-notes/${noteUuid}/${randomName}`;

  const { error: uploadError } = await supabaseServer.storage
    .from("stock-receipt-note-documents")
    .upload(filePath, buffer, {
      contentType: type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[StockReceiptNotes] Attachment upload error:", uploadError);
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to upload attachment: ${uploadError.message}`,
    });
  }

  const { data: publicUrlData } = supabaseServer.storage
    .from("stock-receipt-note-documents")
    .getPublicUrl(filePath);

  return {
    uuid: randomUUID(),
    document_name: name,
    mime_type: type,
    file_size: size,
    file_url: publicUrlData?.publicUrl ?? null,
    file_path: filePath,
    uploaded_at: new Date().toISOString(),
  };
};

const processAttachments = async (
  noteUuid: string,
  attachments: any[] | undefined | null
): Promise<AttachmentRecord[]> => {
  if (!attachments || !Array.isArray(attachments)) {
    return [];
  }

  // OPTIMIZATION: Separate persisted and pending uploads upfront
  const persisted: AttachmentRecord[] = [];
  const pendingUploads: any[] = [];

  for (const attachment of attachments) {
    const isPendingUpload =
      attachment?.fileData ||
      attachment?.file_data ||
      attachment?.isUploaded === false ||
      (!attachment?.uuid && !attachment?.file_path);

    if (isPendingUpload) {
      pendingUploads.push(attachment);
    } else {
      const existing = sanitizeExistingAttachment(attachment);
      if (existing) {
        persisted.push(existing);
      }
    }
  }

  // OPTIMIZATION: Process all uploads in parallel using Promise.all
  const uploadPromises = pendingUploads.map((attachment) =>
    uploadAttachment(noteUuid, attachment).catch((error) => {
      console.error(`[StockReceiptNotes] Failed to upload attachment:`, error);
      // Return null for failed uploads so we can filter them out
      return null;
    })
  );

  const uploadResults = await Promise.all(uploadPromises);
  const uploads = uploadResults.filter((result): result is AttachmentRecord => result !== null);

  // Ensure unique attachments by uuid or file_path
  const uniqueMap = new Map<string, AttachmentRecord>();
  const addToMap = (attachment: AttachmentRecord) => {
    const key = attachment.uuid || attachment.file_path;
    uniqueMap.set(key, attachment);
  };

  [...persisted, ...uploads].forEach(addToMap);

  return Array.from(uniqueMap.values());
};

const deleteRemovedAttachments = async (
  existing: AttachmentInput[] | null | undefined,
  updated: AttachmentRecord[]
) => {
  if (!existing || existing.length === 0) return;

  const sanitizedExisting = existing
    .map((item) => sanitizeExistingAttachment(item))
    .filter((item): item is AttachmentRecord => Boolean(item));

  if (!sanitizedExisting.length) return;

  const updatedIds = new Set(updated.map((item) => item.uuid || item.file_path));
  const toDelete = sanitizedExisting.filter((item) => {
    const key = item.uuid || item.file_path;
    return key && !updatedIds.has(key);
  });

  if (!toDelete.length) return;

  const paths = toDelete
    .map((item) => item.file_path)
    .filter((path): path is string => Boolean(path));

  if (!paths.length) return;

  const { error } = await supabaseServer.storage
    .from("stock-receipt-note-documents")
    .remove(paths);

  if (error) {
    console.error(
      "[StockReceiptNotes] Failed to delete removed attachments:",
      error
    );
  }
};

const generateNextGrnNumber = async (
  corporationUuid: string
): Promise<string> => {
  const { data } = await supabaseServer
    .from("stock_receipt_notes")
    .select("grn_number")
    .eq("corporation_uuid", corporationUuid)
    .order("created_at", { ascending: false })
    .limit(200);

  let maxSeq = 0;
  const regex = /^GRN-(\d{1,})$/i;
  (data || []).forEach((row: any) => {
    const value = String(row?.grn_number || "");
    const match = value.match(regex);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (!Number.isNaN(seq)) {
        maxSeq = Math.max(maxSeq, seq);
      }
    }
  });

  const next = maxSeq + 1;
  return `GRN-${String(next).padStart(6, "0")}`;
};

const ensureUniqueGrnNumber = async (
  corporationUuid: string,
  requestedGrn?: string | null,
  currentUuid?: string | null
): Promise<string> => {
  if (requestedGrn) {
    const { data: conflict } = await supabaseServer
      .from("stock_receipt_notes")
      .select("uuid")
      .eq("corporation_uuid", corporationUuid)
      .eq("grn_number", requestedGrn)
      .neq("uuid", currentUuid ?? "00000000-0000-0000-0000-000000000000")
      .maybeSingle();

    if (!conflict) {
      return requestedGrn;
    }
  }

  return generateNextGrnNumber(corporationUuid);
};

const ensureCorporationUuid = (value: any) => {
  if (!value || typeof value !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "corporation_uuid is required",
    });
  }
  return value;
};

const ensureNoteExists = (data: any, uuid: string) => {
  if (!data) {
    throw createError({
      statusCode: 404,
      statusMessage: `Stock receipt note ${uuid} not found`,
    });
  }
};

export default defineEventHandler(async (event: H3Event) => {
  const method = event.node.req.method;
  const query = getQuery(event);
  const body =
    method === "POST" || method === "PUT" ? await readBody(event) : null;

  try {
    if (method === "GET") {
      const { corporation_uuid, uuid } = query;

      if (uuid) {
        const { data, error } = await supabaseServer
          .from("stock_receipt_notes")
          .select("*")
          .eq("uuid", uuid as string)
          .maybeSingle();

        if (error) {
          console.error("[StockReceiptNotes] GET single error:", error);
          throw createError({
            statusCode: 500,
            statusMessage: `Database error: ${error.message}`,
          });
        }

        ensureNoteExists(data, uuid as string);
        return { data };
      }

      const corpUuid = ensureCorporationUuid(corporation_uuid);

      // Pagination parameters
      const page = parseInt(query.page as string) || 1;
      const pageSize = parseInt(query.page_size as string) || 100;
      const offset = (page - 1) * pageSize;

      // Get total count for pagination metadata
      const { count, error: countError } = await supabaseServer
        .from("stock_receipt_notes")
        .select("*", { count: "exact", head: true })
        .eq("corporation_uuid", corpUuid)
        .eq("is_active", true);

      if (countError) {
        console.error("[StockReceiptNotes] GET count error:", countError);
        throw createError({
          statusCode: 500,
          statusMessage: `Database error: ${countError.message}`,
        });
      }

      const totalRecords = count || 0;
      const totalPages = Math.ceil(totalRecords / pageSize);

      // Fetch paginated data
      const { data, error } = await supabaseServer
        .from("stock_receipt_notes")
        .select("*")
        .eq("corporation_uuid", corpUuid)
        .eq("is_active", true)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error("[StockReceiptNotes] GET list error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: `Database error: ${error.message}`,
        });
      }

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
      if (!body) {
        throw createError({
          statusCode: 400,
          statusMessage: "Request body is required",
        });
      }

      const corporationUuid = ensureCorporationUuid(body.corporation_uuid);
      const noteUuid =
        body.uuid && typeof body.uuid === "string" ? body.uuid : randomUUID();

      const grnNumber = await ensureUniqueGrnNumber(
        corporationUuid,
        body.grn_number
      );

      const attachments = await processAttachments(
        noteUuid,
        body.attachments ?? []
      );

      // Normalize receipt_type
      const receiptType =
        body.receipt_type === "change_order"
          ? "change_order"
          : "purchase_order";

      // Get source UUID based on receipt type
      const purchaseOrderUuid =
        receiptType === "purchase_order"
          ? body.purchase_order_uuid || null
          : null;
      const changeOrderUuid =
        receiptType === "change_order"
          ? body.change_order_uuid || body.purchase_order_uuid || null // Support legacy format
          : null;
      const sourceUuid = purchaseOrderUuid || changeOrderUuid;

      const insertData: Record<string, any> = {
        uuid: noteUuid,
        corporation_uuid: corporationUuid,
        project_uuid: body.project_uuid || null,
        purchase_order_uuid: purchaseOrderUuid,
        change_order_uuid: changeOrderUuid,
        receipt_type: receiptType,
        location_uuid: body.location_uuid || null,
        entry_date: normalizeTimestamp(body.entry_date),
        grn_number: grnNumber,
        reference_number: body.reference_number || null,
        received_by: body.received_by || null,
        notes: body.notes || null,
        status: normalizeStatus(body.status),
        total_received_amount:
          body.total_received_amount === null ||
          body.total_received_amount === undefined ||
          body.total_received_amount === ""
            ? null
            : parseFloat(body.total_received_amount),
        attachments,
        metadata:
          body.metadata && typeof body.metadata === "object"
            ? body.metadata
            : {},
        is_active: typeof body.is_active === "boolean" ? body.is_active : true,
      };

      const { data, error } = await supabaseServer
        .from("stock_receipt_notes")
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error("[StockReceiptNotes] POST error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to create stock receipt note: ${error.message}`,
        });
      }

      // Fetch the created record with JOINs to include metadata
      const { data: recordWithMetadata, error: fetchError } =
        await supabaseServer
          .from("stock_receipt_notes")
          .select(
            `
          *,
          project:projects!project_uuid (
            uuid,
            project_name,
            project_id
          ),
          purchase_order:purchase_order_forms!purchase_order_uuid (
            uuid,
            po_number,
            vendor_uuid
          ),
          change_order:change_orders!change_order_uuid (
            uuid,
            co_number,
            vendor_uuid
          )
        `
          )
          .eq("uuid", data.uuid)
          .single();

      let responseData = data;

      if (!fetchError && recordWithMetadata) {
        responseData = { ...recordWithMetadata };
        // Add metadata fields for easy access in the list view
        if (recordWithMetadata.project) {
          (responseData as any).project_name =
            recordWithMetadata.project.project_name || null;
          (responseData as any).project_id =
            recordWithMetadata.project.project_id || null;
        }
        if (
          receiptType === "purchase_order" &&
          recordWithMetadata.purchase_order
        ) {
          (responseData as any).po_number =
            recordWithMetadata.purchase_order.po_number || null;
          // Fetch vendor name if vendor_uuid is available
          if (recordWithMetadata.purchase_order.vendor_uuid) {
            const { data: vendorData } = await supabaseServer
              .from("vendors")
              .select("vendor_name")
              .eq("uuid", recordWithMetadata.purchase_order.vendor_uuid)
              .maybeSingle();
            if (vendorData) {
              (responseData as any).vendor_name =
                vendorData.vendor_name || null;
            }
          }
        } else if (
          receiptType === "change_order" &&
          recordWithMetadata.change_order
        ) {
          (responseData as any).co_number =
            recordWithMetadata.change_order.co_number || null;
          // Fetch vendor name if vendor_uuid is available
          if (recordWithMetadata.change_order.vendor_uuid) {
            const { data: vendorData } = await supabaseServer
              .from("vendors")
              .select("vendor_name")
              .eq("uuid", recordWithMetadata.change_order.vendor_uuid)
              .maybeSingle();
            if (vendorData) {
              (responseData as any).vendor_name =
                vendorData.vendor_name || null;
            }
          }
        }
      } else if (fetchError) {
        console.error(
          "Error fetching created receipt note with metadata:",
          fetchError
        );
        // Continue with data without metadata
      }

      // Update purchase order or change order items with receipt fields if receipt_items are provided
      if (
        body.receipt_items &&
        Array.isArray(body.receipt_items) &&
        body.receipt_items.length > 0
      ) {
        try {
          const endpoint =
            receiptType === "change_order"
              ? "/api/change-order-items/update-receipt-fields"
              : "/api/purchase-order-items/update-receipt-fields";

          await $fetch(endpoint, {
            method: "POST",
            body: {
              receipt_note_uuid: noteUuid,
              corporation_uuid: corporationUuid,
              project_uuid: body.project_uuid || null,
              purchase_order_uuid:
                receiptType === "purchase_order" ? sourceUuid : null,
              change_order_uuid:
                receiptType === "change_order" ? sourceUuid : null,
              items: body.receipt_items.map((item: any) => ({
                uuid: item.uuid || item.base_item_uuid,
                cost_code_uuid: item.cost_code_uuid,
                received_quantity: item.received_quantity,
                unit_price: item.unit_price,
                grn_total: item.grn_total,
                grn_total_with_charges_taxes: item.grn_total_with_charges_taxes,
              })),
            },
          });
        } catch (updateError: any) {
          console.error(
            `[StockReceiptNotes] Failed to update ${receiptType} items:`,
            updateError
          );
          // Don't fail the entire operation, just log the error
        }
      }

      // Update purchase order status to Partially_Received if saving as open PO
      if (
        body.save_as_open_po === true &&
        receiptType === "purchase_order" &&
        purchaseOrderUuid
      ) {
        try {
          const { error: poUpdateError } = await supabaseServer
            .from("purchase_order_forms")
            .update({ status: "Partially_Received" })
            .eq("uuid", purchaseOrderUuid);

          if (poUpdateError) {
            console.error(
              "[StockReceiptNotes] Failed to update PO status to Partially_Received:",
              poUpdateError
            );
            // Don't fail the entire operation, just log the error
          }
        } catch (poStatusError: any) {
          console.error(
            "[StockReceiptNotes] Error updating PO status:",
            poStatusError
          );
          // Don't fail the entire operation, just log the error
        }
      }

      // Update change order status to Partially_Received if saving as open CO
      if (
        body.save_as_open_po === true &&
        receiptType === "change_order" &&
        changeOrderUuid
      ) {
        try {
          const { error: coUpdateError } = await supabaseServer
            .from("change_orders")
            .update({ status: "Partially_Received" })
            .eq("uuid", changeOrderUuid);

          if (coUpdateError) {
            console.error(
              "[StockReceiptNotes] Failed to update CO status to Partially_Received:",
              coUpdateError
            );
            // Don't fail the entire operation, just log the error
          }
        } catch (coStatusError: any) {
          console.error(
            "[StockReceiptNotes] Error updating CO status:",
            coStatusError
          );
          // Don't fail the entire operation, just log the error
        }
      }

      return { data: responseData };
    }

    if (method === "PUT") {
      if (!body) {
        throw createError({
          statusCode: 400,
          statusMessage: "Request body is required",
        });
      }

      const uuid = body.uuid;
      if (!uuid || typeof uuid !== "string") {
        throw createError({
          statusCode: 400,
          statusMessage: "uuid is required for update",
        });
      }

      const { data: existing, error: existingFetchError } = await supabaseServer
        .from("stock_receipt_notes")
        .select("*")
        .eq("uuid", uuid)
        .maybeSingle();

      if (existingFetchError) {
        console.error(
          "[StockReceiptNotes] Fetch before update error:",
          existingFetchError
        );
        throw createError({
          statusCode: 500,
          statusMessage: `Database error: ${existingFetchError.message}`,
        });
      }

      ensureNoteExists(existing, uuid);
      const corporationUuid = existing!.corporation_uuid as string;

      const grnNumber = await ensureUniqueGrnNumber(
        corporationUuid,
        body.grn_number,
        uuid
      );

      const updatedAttachments = await processAttachments(
        uuid,
        body.attachments ?? []
      );

      await deleteRemovedAttachments(
        existing?.attachments || [],
        updatedAttachments
      );

      const updatePayload: Record<string, any> = {};

      const maybeSet = (key: string, value: any) => {
        if (value !== undefined) {
          updatePayload[key] = value;
        }
      };

      // Normalize receipt_type
      const receiptType =
        body.receipt_type === "change_order"
          ? "change_order"
          : "purchase_order";
      maybeSet("receipt_type", receiptType);

      // Set purchase_order_uuid and change_order_uuid based on receipt_type
      const purchaseOrderUuid =
        receiptType === "purchase_order"
          ? body.purchase_order_uuid ?? existing?.purchase_order_uuid ?? null
          : null;
      const changeOrderUuid =
        receiptType === "change_order"
          ? body.change_order_uuid ??
            body.purchase_order_uuid ??
            existing?.change_order_uuid ??
            existing?.purchase_order_uuid ??
            null // Support legacy format
          : null;
      const sourceUuid = purchaseOrderUuid || changeOrderUuid;

      maybeSet("purchase_order_uuid", purchaseOrderUuid);
      maybeSet("change_order_uuid", changeOrderUuid);
      maybeSet(
        "project_uuid",
        body.project_uuid ?? existing?.project_uuid ?? null
      );
      maybeSet(
        "location_uuid",
        body.location_uuid ?? existing?.location_uuid ?? null
      );
      maybeSet(
        "entry_date",
        normalizeTimestamp(body.entry_date ?? existing?.entry_date)
      );
      maybeSet("grn_number", grnNumber);
      maybeSet("reference_number", body.reference_number ?? null);
      maybeSet("received_by", body.received_by ?? null);
      maybeSet("notes", body.notes ?? null);
      maybeSet("status", normalizeStatus(body.status ?? existing?.status));

      if (body.total_received_amount !== undefined) {
        updatePayload.total_received_amount =
          body.total_received_amount === null ||
          body.total_received_amount === "" ||
          Number.isNaN(Number(body.total_received_amount))
            ? null
            : parseFloat(body.total_received_amount);
      }

      maybeSet("attachments", updatedAttachments);

      if (body.metadata !== undefined) {
        updatePayload.metadata =
          body.metadata && typeof body.metadata === "object"
            ? body.metadata
            : {};
      }

      if (body.is_active !== undefined) {
        updatePayload.is_active = Boolean(body.is_active);
      }

      const { data, error } = await supabaseServer
        .from("stock_receipt_notes")
        .update(updatePayload)
        .eq("uuid", uuid)
        .select()
        .single();

      if (error) {
        console.error("[StockReceiptNotes] PUT error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to update stock receipt note: ${error.message}`,
        });
      }

      // Fetch the updated record with JOINs to include metadata
      const { data: recordWithMetadata, error: fetchError } =
        await supabaseServer
          .from("stock_receipt_notes")
          .select(
            `
          *,
          project:projects!project_uuid (
            uuid,
            project_name,
            project_id
          ),
          purchase_order:purchase_order_forms!purchase_order_uuid (
            uuid,
            po_number,
            vendor_uuid
          ),
          change_order:change_orders!change_order_uuid (
            uuid,
            co_number,
            vendor_uuid
          )
        `
          )
          .eq("uuid", uuid)
          .single();

      let responseData = data;

      if (!fetchError && recordWithMetadata) {
        responseData = { ...recordWithMetadata };
        // Add metadata fields for easy access in the list view
        if (recordWithMetadata.project) {
          (responseData as any).project_name =
            recordWithMetadata.project.project_name || null;
          (responseData as any).project_id =
            recordWithMetadata.project.project_id || null;
        }
        const currentReceiptType =
          receiptType || existing?.receipt_type || "purchase_order";
        if (
          currentReceiptType === "purchase_order" &&
          recordWithMetadata.purchase_order
        ) {
          (responseData as any).po_number =
            recordWithMetadata.purchase_order.po_number || null;
          // Fetch vendor name if vendor_uuid is available
          if (recordWithMetadata.purchase_order.vendor_uuid) {
            const { data: vendorData } = await supabaseServer
              .from("vendors")
              .select("vendor_name")
              .eq("uuid", recordWithMetadata.purchase_order.vendor_uuid)
              .maybeSingle();
            if (vendorData) {
              (responseData as any).vendor_name =
                vendorData.vendor_name || null;
            }
          }
        } else if (
          currentReceiptType === "change_order" &&
          recordWithMetadata.change_order
        ) {
          (responseData as any).co_number =
            recordWithMetadata.change_order.co_number || null;
          // Fetch vendor name if vendor_uuid is available
          if (recordWithMetadata.change_order.vendor_uuid) {
            const { data: vendorData } = await supabaseServer
              .from("vendors")
              .select("vendor_name")
              .eq("uuid", recordWithMetadata.change_order.vendor_uuid)
              .maybeSingle();
            if (vendorData) {
              (responseData as any).vendor_name =
                vendorData.vendor_name || null;
            }
          }
        }
      } else if (fetchError) {
        console.error(
          "Error fetching updated receipt note with metadata:",
          fetchError
        );
        // Continue with data without metadata
      }

      // Update purchase order or change order items with receipt fields if receipt_items are provided
      if (
        body.receipt_items &&
        Array.isArray(body.receipt_items) &&
        body.receipt_items.length > 0
      ) {
        try {
          const endpoint =
            receiptType === "change_order"
              ? "/api/change-order-items/update-receipt-fields"
              : "/api/purchase-order-items/update-receipt-fields";

          await $fetch(endpoint, {
            method: "POST",
            body: {
              receipt_note_uuid: uuid,
              corporation_uuid: corporationUuid,
              project_uuid:
                updatePayload.project_uuid || existing?.project_uuid || null,
              purchase_order_uuid:
                receiptType === "purchase_order" ? sourceUuid : null,
              change_order_uuid:
                receiptType === "change_order" ? sourceUuid : null,
              items: body.receipt_items.map((item: any) => ({
                uuid: item.uuid || item.base_item_uuid,
                cost_code_uuid: item.cost_code_uuid,
                received_quantity: item.received_quantity,
                unit_price: item.unit_price,
                grn_total: item.grn_total,
                grn_total_with_charges_taxes: item.grn_total_with_charges_taxes,
              })),
            },
          });
        } catch (updateError: any) {
          console.error(
            `[StockReceiptNotes] Failed to update ${receiptType} items:`,
            updateError
          );
          // Don't fail the entire operation, just log the error
        }
      } else if (
        body.receipt_items === null ||
        (Array.isArray(body.receipt_items) && body.receipt_items.length === 0)
      ) {
        // Clear receipt note items if receipt_items is explicitly empty/null
        // Delete all receipt_note_items for this receipt note
        try {
          const { error: deleteError } = await supabaseServer
            .from("receipt_note_items")
            .delete()
            .eq("receipt_note_uuid", uuid);

          if (deleteError) {
            console.error(
              `[StockReceiptNotes] Failed to delete receipt_note_items:`,
              deleteError
            );
          } else {
            // Also remove this receipt_note_uuid from receipt_note_uuids arrays in items
            const existingReceiptType = existing?.receipt_type || receiptType;
            const tableName =
              existingReceiptType === "change_order"
                ? "change_order_items_list"
                : "purchase_order_items_list";

            // Get all items that have this receipt_note_uuid in their array
            const { data: itemsWithReceiptNote } = await supabaseServer
              .from(tableName)
              .select("uuid, receipt_note_uuids")
              .contains("receipt_note_uuids", [uuid]);

            if (itemsWithReceiptNote && itemsWithReceiptNote.length > 0) {
              for (const item of itemsWithReceiptNote) {
                const currentArray = Array.isArray(item.receipt_note_uuids)
                  ? item.receipt_note_uuids
                  : typeof item.receipt_note_uuids === "string"
                  ? JSON.parse(item.receipt_note_uuids)
                  : [];

                const updatedArray = currentArray.filter(
                  (u: string) => u !== uuid
                );

                await supabaseServer
                  .from(tableName)
                  .update({ receipt_note_uuids: updatedArray })
                  .eq("uuid", item.uuid);
              }
            }
          }
        } catch (clearError: any) {
          console.error(
            `[StockReceiptNotes] Failed to clear receipt_note_items:`,
            clearError
          );
        }
      }

      // Update purchase order status to Partially_Received if saving as open PO
      if (
        body.save_as_open_po === true &&
        receiptType === "purchase_order" &&
        purchaseOrderUuid
      ) {
        try {
          const { error: poUpdateError } = await supabaseServer
            .from("purchase_order_forms")
            .update({ status: "Partially_Received" })
            .eq("uuid", purchaseOrderUuid);

          if (poUpdateError) {
            console.error(
              "[StockReceiptNotes] Failed to update PO status to Partially_Received:",
              poUpdateError
            );
            // Don't fail the entire operation, just log the error
          }
        } catch (poStatusError: any) {
          console.error(
            "[StockReceiptNotes] Error updating PO status:",
            poStatusError
          );
          // Don't fail the entire operation, just log the error
        }
      }

      // Update change order status to Partially_Received if saving as open CO
      if (
        body.save_as_open_po === true &&
        receiptType === "change_order" &&
        changeOrderUuid
      ) {
        try {
          const { error: coUpdateError } = await supabaseServer
            .from("change_orders")
            .update({ status: "Partially_Received" })
            .eq("uuid", changeOrderUuid);

          if (coUpdateError) {
            console.error(
              "[StockReceiptNotes] Failed to update CO status to Partially_Received:",
              coUpdateError
            );
            // Don't fail the entire operation, just log the error
          }
        } catch (coStatusError: any) {
          console.error(
            "[StockReceiptNotes] Error updating CO status:",
            coStatusError
          );
          // Don't fail the entire operation, just log the error
        }
      }

      return { data: responseData };
    }

    if (method === "DELETE") {
      const { uuid } = query;
      if (!uuid || typeof uuid !== "string") {
        throw createError({
          statusCode: 400,
          statusMessage: "uuid query parameter is required",
        });
      }

      const { data, error } = await supabaseServer
        .from("stock_receipt_notes")
        .update({ is_active: false })
        .eq("uuid", uuid)
        .select()
        .single();

      if (error) {
        console.error("[StockReceiptNotes] DELETE error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to delete stock receipt note: ${error.message}`,
        });
      }

      return { data };
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  } catch (error: any) {
    console.error("[StockReceiptNotes] API error:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Internal server error: ${error.message}`,
    });
  }
});

