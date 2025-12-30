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

const normalizeStatus = (status?: string | null): "Waiting" | "Returned" => {
  const normalized = String(status || "").trim().toLowerCase();
  switch (normalized) {
    case "returned":
      return "Returned";
    case "waiting":
      return "Waiting";
    default:
      return "Waiting";
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
  const filePath = `stock-return-notes/${noteUuid}/${randomName}`;

  const { error: uploadError } = await supabaseServer.storage
    .from("stock-return-note-documents")
    .upload(filePath, buffer, {
      contentType: type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[StockReturnNotes] Attachment upload error:", uploadError);
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to upload attachment: ${uploadError.message}`,
    });
  }

  const { data: publicUrlData } = supabaseServer.storage
    .from("stock-return-note-documents")
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

  const uploadPromises = pendingUploads.map((attachment) =>
    uploadAttachment(noteUuid, attachment).catch((error) => {
      console.error(`[StockReturnNotes] Failed to upload attachment:`, error);
      return null;
    })
  );

  const uploadResults = await Promise.all(uploadPromises);
  const uploads = uploadResults.filter((result): result is AttachmentRecord => result !== null);

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
    .from("stock-return-note-documents")
    .remove(paths);

  if (error) {
    console.error(
      "[StockReturnNotes] Failed to delete removed attachments:",
      error
    );
  }
};

const generateNextReturnNumber = async (
  corporationUuid: string
): Promise<string> => {
  const { data } = await supabaseServer
    .from("stock_return_notes")
    .select("return_number")
    .eq("corporation_uuid", corporationUuid)
    .order("created_at", { ascending: false })
    .limit(200);

  let maxSeq = 0;
  const regex = /^RTN-(\d{1,})$/i;
  (data || []).forEach((row: any) => {
    const value = String(row?.return_number || "");
    const match = value.match(regex);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (!Number.isNaN(seq)) {
        maxSeq = Math.max(maxSeq, seq);
      }
    }
  });

  const next = maxSeq + 1;
  return `RTN-${next}`;
};

const ensureUniqueReturnNumber = async (
  corporationUuid: string,
  requestedReturnNumber?: string | null,
  currentUuid?: string | null
): Promise<string> => {
  if (requestedReturnNumber) {
    const { data: conflict } = await supabaseServer
      .from("stock_return_notes")
      .select("uuid")
      .eq("corporation_uuid", corporationUuid)
      .eq("return_number", requestedReturnNumber)
      .neq("uuid", currentUuid ?? "00000000-0000-0000-0000-000000000000")
      .maybeSingle();

    if (!conflict) {
      return requestedReturnNumber;
    }
  }

  return generateNextReturnNumber(corporationUuid);
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
      statusMessage: `Stock return note ${uuid} not found`,
    });
  }
};

// Save return note items to return_note_items table
const saveReturnNoteItems = async (
  returnNoteUuid: string,
  corporationUuid: string,
  projectUuid: string | null,
  returnType: 'purchase_order' | 'change_order',
  purchaseOrderUuid: string | null,
  changeOrderUuid: string | null,
  returnItems: any[]
): Promise<void> => {
  if (!returnItems || !Array.isArray(returnItems) || returnItems.length === 0) {
    return;
  }

  // Get existing return note items for this return note
  const { data: existingItems } = await supabaseServer
    .from("return_note_items")
    .select("uuid, item_uuid")
    .eq("return_note_uuid", returnNoteUuid);

  const existingMap = new Map<string, string>();
  (existingItems || []).forEach((item: any) => {
    if (item.item_uuid) {
      // Key by item_uuid (normalized to lowercase for case-insensitive matching)
      const key = String(item.item_uuid).trim().toLowerCase();
      existingMap.set(key, item.uuid);
    }
  });

  const allItemsToUpsert: any[] = [];

  returnItems.forEach((item: any) => {
    // Use item.uuid or item.base_item_uuid to identify the item
    // This should match the item_uuid stored in return_note_items table
    const itemUuid = item.uuid || item.base_item_uuid;
    
    if (!itemUuid) {
      return;
    }

    // Look up existing item using normalized key (case-insensitive)
    const lookupKey = String(itemUuid).trim().toLowerCase();
    const existingUuid = existingMap.get(lookupKey);
    
    const itemData = {
      return_note_uuid: returnNoteUuid,
      corporation_uuid: corporationUuid,
      project_uuid: projectUuid,
      purchase_order_uuid: returnType === 'purchase_order' ? purchaseOrderUuid : null,
      change_order_uuid: returnType === 'change_order' ? changeOrderUuid : null,
      item_type: returnType,
      item_uuid: itemUuid,
      cost_code_uuid: item.cost_code_uuid || null,
      return_quantity: item.return_quantity !== null && item.return_quantity !== undefined
        ? parseFloat(String(item.return_quantity))
        : null,
      return_total: item.return_total !== null && item.return_total !== undefined
        ? parseFloat(String(item.return_total))
        : null,
    };

    // Add uuid for existing items so upsert can match them
    if (existingUuid) {
      allItemsToUpsert.push({
        uuid: existingUuid,
        ...itemData,
        updated_at: new Date().toISOString(),
      });
    } else {
      allItemsToUpsert.push(itemData);
    }
  });

  // Use bulk upsert for both inserts and updates - much faster than individual operations
  if (allItemsToUpsert.length > 0) {
    const { error: upsertError } = await supabaseServer
      .from("return_note_items")
      .upsert(allItemsToUpsert, {
        onConflict: 'uuid',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error("[StockReturnNotes] Failed to upsert return_note_items:", upsertError);
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to save return note items: ${upsertError.message}`,
      });
    }
  }
};

export default defineEventHandler(async (event: H3Event) => {
  const method = event.node.req.method;
  const query = getQuery(event);
  const body =
    method === "POST" || method === "PUT" ? await readBody(event) : null;

  try {
    if (method === "GET") {
      const { corporation_uuid, uuid, project_uuid, vendor_uuid } = query;

      if (uuid) {
        const { data, error } = await supabaseServer
          .from("stock_return_notes")
          .select("*")
          .eq("uuid", uuid as string)
          .maybeSingle();

        if (error) {
          console.error("[StockReturnNotes] GET single error:", error);
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
      let countQuery = supabaseServer
        .from("stock_return_notes")
        .select("*", { count: "exact", head: true })
        .eq("corporation_uuid", corpUuid)
        .eq("is_active", true);

      // Apply optional filters
      if (project_uuid) {
        countQuery = countQuery.eq("project_uuid", project_uuid as string);
      }
      if (vendor_uuid) {
        // For return notes, vendor filtering is more complex since it depends on the return type
        // We'll need to join with purchase orders or change orders to filter by vendor
        // For now, let's implement a simpler approach - filter by vendor_uuid if it exists directly on return notes
        countQuery = countQuery.eq("returned_by", vendor_uuid as string); // Assuming vendor_uuid maps to returned_by
      }

      const { count, error: countError } = await countQuery;

      if (countError) {
        console.error("[StockReturnNotes] GET count error:", countError);
        throw createError({
          statusCode: 500,
          statusMessage: `Database error: ${countError.message}`,
        });
      }

      const totalRecords = count || 0;
      const totalPages = Math.ceil(totalRecords / pageSize);

      // Fetch paginated data
      let dataQuery = supabaseServer
        .from("stock_return_notes")
        .select("*")
        .eq("corporation_uuid", corpUuid)
        .eq("is_active", true);

      // Apply optional filters
      if (project_uuid) {
        dataQuery = dataQuery.eq("project_uuid", project_uuid as string);
      }
      if (vendor_uuid) {
        // For return notes, vendor filtering is more complex since it depends on the return type
        // We'll need to join with purchase orders or change orders to filter by vendor
        // For now, let's implement a simpler approach - filter by returned_by if it matches vendor_uuid
        dataQuery = dataQuery.eq("returned_by", vendor_uuid as string);
      }

      const { data, error } = await dataQuery
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error("[StockReturnNotes] GET list error:", error);
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
      const noteUuid = body.uuid && typeof body.uuid === "string"
        ? body.uuid
        : randomUUID();

      const returnNumber = await ensureUniqueReturnNumber(
        corporationUuid,
        body.return_number
      );

      const attachments = await processAttachments(
        noteUuid,
        body.attachments ?? []
      );

      // Normalize return_type
      const returnType = body.return_type === 'change_order' ? 'change_order' : 'purchase_order';
      
      // Get source UUID based on return type
      const purchaseOrderUuid = returnType === 'purchase_order' 
        ? (body.purchase_order_uuid || null)
        : null;
      const changeOrderUuid = returnType === 'change_order'
        ? (body.change_order_uuid || null)
        : null;
      const sourceUuid = purchaseOrderUuid || changeOrderUuid;

      const insertData: Record<string, any> = {
        uuid: noteUuid,
        corporation_uuid: corporationUuid,
        project_uuid: body.project_uuid || null,
        purchase_order_uuid: purchaseOrderUuid,
        change_order_uuid: changeOrderUuid,
        return_type: returnType,
        location_uuid: body.location_uuid || null,
        entry_date: normalizeTimestamp(body.entry_date),
        return_number: returnNumber,
        reference_number: body.reference_number || null,
        returned_by: body.returned_by || null,
        notes: body.notes || null,
        status: normalizeStatus(body.status),
        total_return_amount:
          body.total_return_amount === null ||
          body.total_return_amount === undefined ||
          body.total_return_amount === ""
            ? null
            : parseFloat(body.total_return_amount),
        financial_breakdown: body.financial_breakdown && typeof body.financial_breakdown === "object"
          ? body.financial_breakdown
          : {},
        attachments,
        metadata: body.metadata && typeof body.metadata === "object"
          ? body.metadata
          : {},
        is_active:
          typeof body.is_active === "boolean" ? body.is_active : true,
      };

      const { data, error } = await supabaseServer
        .from("stock_return_notes")
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error("[StockReturnNotes] POST error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to create stock return note: ${error.message}`,
        });
      }

      // Prepare items to save (do this before parallel operations)
      const itemsToSave = body.return_items && Array.isArray(body.return_items) && body.return_items.length > 0
        ? body.return_items.filter((item: any) => {
            const hasUuid = !!(item.uuid || item.base_item_uuid);
            const hasReturnQuantity = item.return_quantity !== null && item.return_quantity !== undefined && item.return_quantity !== '';
            return hasUuid && hasReturnQuantity;
          })
        : [];

      // Run independent operations in parallel for better performance
      const [recordWithMetadata] = await Promise.all([
        // Fetch the created record with JOINs to include metadata
        supabaseServer
          .from("stock_return_notes")
          .select(`
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
          `)
          .eq("uuid", data.uuid)
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.error("Error fetching created return note with metadata:", error);
              return null;
            }
            return data;
          }),
        
        // Save return note items in parallel
        itemsToSave.length > 0
          ? saveReturnNoteItems(
              noteUuid,
              corporationUuid,
              body.project_uuid || null,
              returnType,
              purchaseOrderUuid,
              changeOrderUuid,
              itemsToSave
            ).catch((saveItemsError: any) => {
              console.error("[StockReturnNotes] Failed to save return note items:", saveItemsError);
              // Don't fail the entire operation, just log the error
            })
          : Promise.resolve()
      ]);

      let responseData = data;

      if (recordWithMetadata) {
        responseData = { ...recordWithMetadata };
        // Add metadata fields for easy access in the list view
        if (recordWithMetadata.project) {
          (responseData as any).project_name = recordWithMetadata.project.project_name || null;
          (responseData as any).project_id = recordWithMetadata.project.project_id || null;
        }
        // Parallelize vendor queries if needed
        const vendorPromises: Promise<any>[] = [];
        if (returnType === 'purchase_order' && recordWithMetadata.purchase_order) {
          (responseData as any).po_number = recordWithMetadata.purchase_order.po_number || null;
          if (recordWithMetadata.purchase_order.vendor_uuid) {
            vendorPromises.push(
              supabaseServer
                .from("vendors")
                .select("vendor_name")
                .eq("uuid", recordWithMetadata.purchase_order.vendor_uuid)
                .maybeSingle()
                .then(({ data }) => data)
            );
          }
        } else if (returnType === 'change_order' && recordWithMetadata.change_order) {
          (responseData as any).co_number = recordWithMetadata.change_order.co_number || null;
          if (recordWithMetadata.change_order.vendor_uuid) {
            vendorPromises.push(
              supabaseServer
                .from("vendors")
                .select("vendor_name")
                .eq("uuid", recordWithMetadata.change_order.vendor_uuid)
                .maybeSingle()
                .then(({ data }) => data)
            );
          }
        }
        
        // Wait for vendor data if any promises were created
        if (vendorPromises.length > 0) {
          const vendorData = await Promise.all(vendorPromises);
          if (vendorData[0]) {
            (responseData as any).vendor_name = vendorData[0].vendor_name || null;
          }
        }
      }

      // Check if purchase order should be marked as Completed (zero shortfall remaining)
      if (returnType === 'purchase_order' && purchaseOrderUuid) {
        try {
          // Fetch all PO items for this purchase order
          const { data: poItems, error: poItemsError } = await supabaseServer
            .from("purchase_order_items_list")
            .select("uuid, po_quantity")
            .eq("purchase_order_uuid", purchaseOrderUuid)
            .eq("is_active", true);

          if (poItemsError) {
            console.error("[StockReturnNotes] Failed to fetch PO items for completion check:", poItemsError);
          } else if (poItems && poItems.length > 0) {
            // Fetch all receipt note items for this purchase order
            const { data: receiptNoteItems, error: receiptItemsError } = await supabaseServer
              .from("receipt_note_items")
              .select("item_uuid, received_quantity")
              .eq("purchase_order_uuid", purchaseOrderUuid)
              .eq("is_active", true);

            if (receiptItemsError) {
              console.error("[StockReturnNotes] Failed to fetch receipt note items for completion check:", receiptItemsError);
            } else {
              // Fetch all return note items for this purchase order
              const { data: returnNoteItems, error: returnItemsError } = await supabaseServer
                .from("return_note_items")
                .select("item_uuid, return_quantity")
                .eq("purchase_order_uuid", purchaseOrderUuid)
                .eq("is_active", true);

              if (returnItemsError) {
                console.error("[StockReturnNotes] Failed to fetch return note items for completion check:", returnItemsError);
              } else {
                // Calculate received and returned quantities by item
                const receivedMap = new Map<string, number>();
                const returnedMap = new Map<string, number>();

                (receiptNoteItems || []).forEach((item: any) => {
                  const itemUuid = item.item_uuid;
                  if (itemUuid) {
                    const key = String(itemUuid).trim().toLowerCase();
                    const receivedQty = parseFloat(String(item.received_quantity || 0)) || 0;
                    const existing = receivedMap.get(key) || 0;
                    receivedMap.set(key, existing + receivedQty);
                  }
                });

                (returnNoteItems || []).forEach((item: any) => {
                  const itemUuid = item.item_uuid;
                  if (itemUuid) {
                    const key = String(itemUuid).trim().toLowerCase();
                    const returnedQty = parseFloat(String(item.return_quantity || 0)) || 0;
                    const existing = returnedMap.get(key) || 0;
                    returnedMap.set(key, existing + returnedQty);
                  }
                });

                // Check if all items have zero shortfall
                let allItemsComplete = true;
                for (const poItem of poItems) {
                  const itemUuid = poItem.uuid;
                  if (!itemUuid) continue;

                  const key = String(itemUuid).trim().toLowerCase();
                  const orderedQty = parseFloat(String(poItem.po_quantity || 0)) || 0;
                  const receivedQty = receivedMap.get(key) || 0;
                  const returnedQty = returnedMap.get(key) || 0;

                  // Calculate remaining shortfall: ordered - received - returned
                  const remainingShortfall = orderedQty - receivedQty - returnedQty;

                  // If any item has remaining shortfall, PO is not complete
                  if (remainingShortfall > 0) {
                    allItemsComplete = false;
                    break;
                  }
                }

                // If all items are complete (zero shortfall), update PO status to Completed
                if (allItemsComplete) {
                  const { error: poUpdateError } = await supabaseServer
                    .from("purchase_order_forms")
                    .update({ status: "Completed" })
                    .eq("uuid", purchaseOrderUuid);

                  if (poUpdateError) {
                    console.error("[StockReturnNotes] Failed to update PO status to Completed:", poUpdateError);
                  }
                }
              }
            }
          }
        } catch (completionCheckError: any) {
          console.error("[StockReturnNotes] Error checking PO completion:", completionCheckError);
          // Don't fail the entire operation, just log the error
        }
      }

      // Check if change order should be marked as Completed (zero shortfall remaining)
      if (returnType === 'change_order' && changeOrderUuid) {
        try {
          // Fetch all CO items for this change order
          const { data: coItems, error: coItemsError } = await supabaseServer
            .from("change_order_items_list")
            .select("uuid, co_quantity")
            .eq("change_order_uuid", changeOrderUuid)
            .eq("is_active", true);

          if (coItemsError) {
            console.error("[StockReturnNotes] Failed to fetch CO items for completion check:", coItemsError);
          } else if (coItems && coItems.length > 0) {
            // Fetch all receipt note items for this change order
            const { data: receiptNoteItems, error: receiptItemsError } = await supabaseServer
              .from("receipt_note_items")
              .select("item_uuid, received_quantity")
              .eq("change_order_uuid", changeOrderUuid)
              .eq("is_active", true);

            if (receiptItemsError) {
              console.error("[StockReturnNotes] Failed to fetch receipt note items for completion check:", receiptItemsError);
            } else {
              // Fetch all return note items for this change order
              const { data: returnNoteItems, error: returnItemsError } = await supabaseServer
                .from("return_note_items")
                .select("item_uuid, return_quantity")
                .eq("change_order_uuid", changeOrderUuid)
                .eq("is_active", true);

              if (returnItemsError) {
                console.error("[StockReturnNotes] Failed to fetch return note items for completion check:", returnItemsError);
              } else {
                // Calculate received and returned quantities by item
                const receivedMap = new Map<string, number>();
                const returnedMap = new Map<string, number>();

                (receiptNoteItems || []).forEach((item: any) => {
                  const itemUuid = item.item_uuid;
                  if (itemUuid) {
                    const key = String(itemUuid).trim().toLowerCase();
                    const receivedQty = parseFloat(String(item.received_quantity || 0)) || 0;
                    const existing = receivedMap.get(key) || 0;
                    receivedMap.set(key, existing + receivedQty);
                  }
                });

                (returnNoteItems || []).forEach((item: any) => {
                  const itemUuid = item.item_uuid;
                  if (itemUuid) {
                    const key = String(itemUuid).trim().toLowerCase();
                    const returnedQty = parseFloat(String(item.return_quantity || 0)) || 0;
                    const existing = returnedMap.get(key) || 0;
                    returnedMap.set(key, existing + returnedQty);
                  }
                });

                // Check if all items have zero shortfall
                let allItemsComplete = true;
                for (const coItem of coItems) {
                  const itemUuid = coItem.uuid;
                  if (!itemUuid) continue;

                  const key = String(itemUuid).trim().toLowerCase();
                  const orderedQty = parseFloat(String(coItem.co_quantity || 0)) || 0;
                  const receivedQty = receivedMap.get(key) || 0;
                  const returnedQty = returnedMap.get(key) || 0;

                  // Calculate remaining shortfall: ordered - received - returned
                  const remainingShortfall = orderedQty - receivedQty - returnedQty;

                  // If any item has remaining shortfall, CO is not complete
                  if (remainingShortfall > 0) {
                    allItemsComplete = false;
                    break;
                  }
                }

                // If all items are complete (zero shortfall), update CO status to Completed
                if (allItemsComplete) {
                  const { error: coUpdateError } = await supabaseServer
                    .from("change_orders")
                    .update({ status: "Completed" })
                    .eq("uuid", changeOrderUuid);

                  if (coUpdateError) {
                    console.error("[StockReturnNotes] Failed to update CO status to Completed:", coUpdateError);
                  }
                }
              }
            }
          }
        } catch (completionCheckError: any) {
          console.error("[StockReturnNotes] Error checking CO completion:", completionCheckError);
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
        .from("stock_return_notes")
        .select("*")
        .eq("uuid", uuid)
        .maybeSingle();

      if (existingFetchError) {
        console.error("[StockReturnNotes] Fetch before update error:", existingFetchError);
        throw createError({
          statusCode: 500,
          statusMessage: `Database error: ${existingFetchError.message}`,
        });
      }

      ensureNoteExists(existing, uuid);
      const corporationUuid = existing!.corporation_uuid as string;

      const returnNumber = await ensureUniqueReturnNumber(
        corporationUuid,
        body.return_number,
        uuid
      );

      const updatedAttachments = await processAttachments(
        uuid,
        body.attachments ?? []
      );

      await deleteRemovedAttachments(existing?.attachments || [], updatedAttachments);

      const updatePayload: Record<string, any> = {};

      const maybeSet = (key: string, value: any) => {
        if (value !== undefined) {
          updatePayload[key] = value;
        }
      };

      // Normalize return_type
      const returnType = body.return_type === 'change_order' ? 'change_order' : 'purchase_order';
      maybeSet("return_type", returnType);

      // Set purchase_order_uuid and change_order_uuid based on return_type
      const purchaseOrderUuid = returnType === 'purchase_order'
        ? (body.purchase_order_uuid ?? existing?.purchase_order_uuid ?? null)
        : null;
      const changeOrderUuid = returnType === 'change_order'
        ? (body.change_order_uuid ?? existing?.change_order_uuid ?? null)
        : null;
      const sourceUuid = purchaseOrderUuid || changeOrderUuid;
      
      maybeSet("purchase_order_uuid", purchaseOrderUuid);
      maybeSet("change_order_uuid", changeOrderUuid);
      maybeSet("project_uuid", body.project_uuid ?? existing?.project_uuid ?? null);
      maybeSet("location_uuid", body.location_uuid ?? existing?.location_uuid ?? null);
      maybeSet("entry_date", normalizeTimestamp(body.entry_date ?? existing?.entry_date));
      maybeSet("return_number", returnNumber);
      maybeSet("reference_number", body.reference_number ?? null);
      maybeSet("returned_by", body.returned_by ?? null);
      maybeSet("notes", body.notes ?? null);
      maybeSet("status", normalizeStatus(body.status ?? existing?.status));

      if (body.total_return_amount !== undefined) {
        updatePayload.total_return_amount =
          body.total_return_amount === null ||
          body.total_return_amount === "" ||
          Number.isNaN(Number(body.total_return_amount))
            ? null
            : parseFloat(body.total_return_amount);
      }

      if (body.financial_breakdown !== undefined) {
        updatePayload.financial_breakdown =
          body.financial_breakdown && typeof body.financial_breakdown === "object"
            ? body.financial_breakdown
            : {};
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
        .from("stock_return_notes")
        .update(updatePayload)
        .eq("uuid", uuid)
        .select()
        .single();

      if (error) {
        console.error("[StockReturnNotes] PUT error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to update stock return note: ${error.message}`,
        });
      }

      // Prepare items to save/clear (do this before parallel operations)
      const itemsToSave = body.return_items && Array.isArray(body.return_items) && body.return_items.length > 0
        ? body.return_items.filter((item: any) => {
            const hasUuid = !!(item.uuid || item.base_item_uuid);
            const hasReturnQuantity = item.return_quantity !== null && item.return_quantity !== undefined && item.return_quantity !== '';
            return hasUuid && hasReturnQuantity;
          })
        : [];
      
      const shouldClearItems = body.return_items === null || (Array.isArray(body.return_items) && body.return_items.length === 0);

      // Run independent operations in parallel for better performance
      const [recordWithMetadata] = await Promise.all([
        // Fetch the updated record with JOINs to include metadata
        supabaseServer
          .from("stock_return_notes")
          .select(`
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
          `)
          .eq("uuid", uuid)
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.error("Error fetching updated return note with metadata:", error);
              return null;
            }
            return data;
          }),
        
        // Save or clear return note items in parallel
        itemsToSave.length > 0
          ? saveReturnNoteItems(
              uuid,
              corporationUuid,
              updatePayload.project_uuid || existing?.project_uuid || null,
              returnType,
              purchaseOrderUuid,
              changeOrderUuid,
              itemsToSave
            ).catch((saveItemsError: any) => {
              console.error("[StockReturnNotes] Failed to save return note items:", saveItemsError);
              // Don't fail the entire operation, just log the error
            })
          : shouldClearItems
            ? supabaseServer
                .from("return_note_items")
                .delete()
                .eq("return_note_uuid", uuid)
                .then(({ error }) => {
                  if (error) {
                    console.error(`[StockReturnNotes] Failed to delete return_note_items:`, error);
                  }
                })
                .catch((clearError: any) => {
                  console.error(`[StockReturnNotes] Failed to clear return_note_items:`, clearError);
                })
            : Promise.resolve()
      ]);

      let responseData = data;

      if (recordWithMetadata) {
        responseData = { ...recordWithMetadata };
        if (recordWithMetadata.project) {
          (responseData as any).project_name = recordWithMetadata.project.project_name || null;
          (responseData as any).project_id = recordWithMetadata.project.project_id || null;
        }
        const currentReturnType = returnType || existing?.return_type || 'purchase_order';
        if (currentReturnType === 'purchase_order' && recordWithMetadata.purchase_order) {
          (responseData as any).po_number = recordWithMetadata.purchase_order.po_number || null;
          if (recordWithMetadata.purchase_order.vendor_uuid) {
            const { data: vendorData } = await supabaseServer
              .from("vendors")
              .select("vendor_name")
              .eq("uuid", recordWithMetadata.purchase_order.vendor_uuid)
              .maybeSingle();
            if (vendorData) {
              (responseData as any).vendor_name = vendorData.vendor_name || null;
            }
          }
        } else if (currentReturnType === 'change_order' && recordWithMetadata.change_order) {
          (responseData as any).co_number = recordWithMetadata.change_order.co_number || null;
          if (recordWithMetadata.change_order.vendor_uuid) {
            const { data: vendorData } = await supabaseServer
              .from("vendors")
              .select("vendor_name")
              .eq("uuid", recordWithMetadata.change_order.vendor_uuid)
              .maybeSingle();
            if (vendorData) {
              (responseData as any).vendor_name = vendorData.vendor_name || null;
            }
          }
        }
      }

      // Note: Item save/clear has already been handled in parallel above

      // Check if purchase order should be marked as Completed (zero shortfall remaining)
      if (returnType === 'purchase_order' && purchaseOrderUuid) {
        try {
          // Fetch all PO items for this purchase order
          const { data: poItems, error: poItemsError } = await supabaseServer
            .from("purchase_order_items_list")
            .select("uuid, po_quantity")
            .eq("purchase_order_uuid", purchaseOrderUuid)
            .eq("is_active", true);

          if (poItemsError) {
            console.error("[StockReturnNotes] Failed to fetch PO items for completion check:", poItemsError);
          } else if (poItems && poItems.length > 0) {
            // Fetch all receipt note items for this purchase order
            const { data: receiptNoteItems, error: receiptItemsError } = await supabaseServer
              .from("receipt_note_items")
              .select("item_uuid, received_quantity")
              .eq("purchase_order_uuid", purchaseOrderUuid)
              .eq("is_active", true);

            if (receiptItemsError) {
              console.error("[StockReturnNotes] Failed to fetch receipt note items for completion check:", receiptItemsError);
            } else {
              // Fetch all return note items for this purchase order
              const { data: returnNoteItems, error: returnItemsError } = await supabaseServer
                .from("return_note_items")
                .select("item_uuid, return_quantity")
                .eq("purchase_order_uuid", purchaseOrderUuid)
                .eq("is_active", true);

              if (returnItemsError) {
                console.error("[StockReturnNotes] Failed to fetch return note items for completion check:", returnItemsError);
              } else {
                // Calculate received and returned quantities by item
                const receivedMap = new Map<string, number>();
                const returnedMap = new Map<string, number>();

                (receiptNoteItems || []).forEach((item: any) => {
                  const itemUuid = item.item_uuid;
                  if (itemUuid) {
                    const key = String(itemUuid).trim().toLowerCase();
                    const receivedQty = parseFloat(String(item.received_quantity || 0)) || 0;
                    const existing = receivedMap.get(key) || 0;
                    receivedMap.set(key, existing + receivedQty);
                  }
                });

                (returnNoteItems || []).forEach((item: any) => {
                  const itemUuid = item.item_uuid;
                  if (itemUuid) {
                    const key = String(itemUuid).trim().toLowerCase();
                    const returnedQty = parseFloat(String(item.return_quantity || 0)) || 0;
                    const existing = returnedMap.get(key) || 0;
                    returnedMap.set(key, existing + returnedQty);
                  }
                });

                // Check if all items have zero shortfall
                let allItemsComplete = true;
                for (const poItem of poItems) {
                  const itemUuid = poItem.uuid;
                  if (!itemUuid) continue;

                  const key = String(itemUuid).trim().toLowerCase();
                  const orderedQty = parseFloat(String(poItem.po_quantity || 0)) || 0;
                  const receivedQty = receivedMap.get(key) || 0;
                  const returnedQty = returnedMap.get(key) || 0;

                  // Calculate remaining shortfall: ordered - received - returned
                  const remainingShortfall = orderedQty - receivedQty - returnedQty;

                  // If any item has remaining shortfall, PO is not complete
                  if (remainingShortfall > 0) {
                    allItemsComplete = false;
                    break;
                  }
                }

                // If all items are complete (zero shortfall), update PO status to Completed
                if (allItemsComplete) {
                  const { error: poUpdateError } = await supabaseServer
                    .from("purchase_order_forms")
                    .update({ status: "Completed" })
                    .eq("uuid", purchaseOrderUuid);

                  if (poUpdateError) {
                    console.error("[StockReturnNotes] Failed to update PO status to Completed:", poUpdateError);
                  }
                }
              }
            }
          }
        } catch (completionCheckError: any) {
          console.error("[StockReturnNotes] Error checking PO completion:", completionCheckError);
          // Don't fail the entire operation, just log the error
        }
      }

      // Check if change order should be marked as Completed (zero shortfall remaining)
      if (returnType === 'change_order' && changeOrderUuid) {
        try {
          // Fetch all CO items for this change order
          const { data: coItems, error: coItemsError } = await supabaseServer
            .from("change_order_items_list")
            .select("uuid, co_quantity")
            .eq("change_order_uuid", changeOrderUuid)
            .eq("is_active", true);

          if (coItemsError) {
            console.error("[StockReturnNotes] Failed to fetch CO items for completion check:", coItemsError);
          } else if (coItems && coItems.length > 0) {
            // Fetch all receipt note items for this change order
            const { data: receiptNoteItems, error: receiptItemsError } = await supabaseServer
              .from("receipt_note_items")
              .select("item_uuid, received_quantity")
              .eq("change_order_uuid", changeOrderUuid)
              .eq("is_active", true);

            if (receiptItemsError) {
              console.error("[StockReturnNotes] Failed to fetch receipt note items for completion check:", receiptItemsError);
            } else {
              // Fetch all return note items for this change order
              const { data: returnNoteItems, error: returnItemsError } = await supabaseServer
                .from("return_note_items")
                .select("item_uuid, return_quantity")
                .eq("change_order_uuid", changeOrderUuid)
                .eq("is_active", true);

              if (returnItemsError) {
                console.error("[StockReturnNotes] Failed to fetch return note items for completion check:", returnItemsError);
              } else {
                // Calculate received and returned quantities by item
                const receivedMap = new Map<string, number>();
                const returnedMap = new Map<string, number>();

                (receiptNoteItems || []).forEach((item: any) => {
                  const itemUuid = item.item_uuid;
                  if (itemUuid) {
                    const key = String(itemUuid).trim().toLowerCase();
                    const receivedQty = parseFloat(String(item.received_quantity || 0)) || 0;
                    const existing = receivedMap.get(key) || 0;
                    receivedMap.set(key, existing + receivedQty);
                  }
                });

                (returnNoteItems || []).forEach((item: any) => {
                  const itemUuid = item.item_uuid;
                  if (itemUuid) {
                    const key = String(itemUuid).trim().toLowerCase();
                    const returnedQty = parseFloat(String(item.return_quantity || 0)) || 0;
                    const existing = returnedMap.get(key) || 0;
                    returnedMap.set(key, existing + returnedQty);
                  }
                });

                // Check if all items have zero shortfall
                let allItemsComplete = true;
                for (const coItem of coItems) {
                  const itemUuid = coItem.uuid;
                  if (!itemUuid) continue;

                  const key = String(itemUuid).trim().toLowerCase();
                  const orderedQty = parseFloat(String(coItem.co_quantity || 0)) || 0;
                  const receivedQty = receivedMap.get(key) || 0;
                  const returnedQty = returnedMap.get(key) || 0;

                  // Calculate remaining shortfall: ordered - received - returned
                  const remainingShortfall = orderedQty - receivedQty - returnedQty;

                  // If any item has remaining shortfall, CO is not complete
                  if (remainingShortfall > 0) {
                    allItemsComplete = false;
                    break;
                  }
                }

                // If all items are complete (zero shortfall), update CO status to Completed
                if (allItemsComplete) {
                  const { error: coUpdateError } = await supabaseServer
                    .from("change_orders")
                    .update({ status: "Completed" })
                    .eq("uuid", changeOrderUuid);

                  if (coUpdateError) {
                    console.error("[StockReturnNotes] Failed to update CO status to Completed:", coUpdateError);
                  }
                }
              }
            }
          }
        } catch (completionCheckError: any) {
          console.error("[StockReturnNotes] Error checking CO completion:", completionCheckError);
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

      // Soft-delete the return note
      const { data, error } = await supabaseServer
        .from("stock_return_notes")
        .update({ is_active: false })
        .eq("uuid", uuid)
        .select()
        .single();

      if (error) {
        console.error("[StockReturnNotes] DELETE error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to delete stock return note: ${error.message}`,
        });
      }

      // Soft-delete all related return note items
      const { error: itemsError } = await supabaseServer
        .from("return_note_items")
        .update({ is_active: false })
        .eq("return_note_uuid", uuid);

      if (itemsError) {
        console.error("[StockReturnNotes] Failed to soft-delete return_note_items:", itemsError);
        // Don't throw error here - the return note is already soft-deleted
        // Log the error but continue with the response
      }

      return { data };
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  } catch (error: any) {
    console.error("[StockReturnNotes] API error:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Internal server error: ${error.message}`,
    });
  }
});

