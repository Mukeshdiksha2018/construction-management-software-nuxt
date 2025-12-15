import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);

  try {
    if (method === "GET") {
      const { corporation_uuid, project_uuid, receipt_note_uuid, item_type } = query;

      console.log("[ReceiptNoteItems API] GET request:", {
        corporation_uuid,
        project_uuid,
        receipt_note_uuid,
        item_type
      });

      let queryBuilder = supabaseServer
        .from("receipt_note_items")
        .select(`
          *,
          stock_receipt_notes!inner(
            uuid,
            status,
            entry_date,
            updated_at,
            receipt_type,
            is_active
          )
        `);

      // Filter by corporation if provided
      if (corporation_uuid) {
        queryBuilder = queryBuilder.eq("corporation_uuid", corporation_uuid as string);
      }

      // Filter by active items (default to true if not specified)
      queryBuilder = queryBuilder.eq("is_active", true);
      
      // Note: We filter stock_receipt_notes.is_active in the flattening step below
      // because Supabase PostgREST doesn't support filtering on joined tables directly

      // Filter by project if provided
      if (project_uuid) {
        queryBuilder = queryBuilder.eq("project_uuid", project_uuid as string);
      }

      // Filter by receipt note if provided
      if (receipt_note_uuid) {
        queryBuilder = queryBuilder.eq("receipt_note_uuid", receipt_note_uuid as string);
      }

      // Filter by item_type if provided (purchase_order or change_order)
      // This ensures we only get items matching the receipt type
      // Note: If item_type is not provided, we'll get all items (for backward compatibility)
      if (item_type && (item_type === 'purchase_order' || item_type === 'change_order')) {
        queryBuilder = queryBuilder.eq("item_type", item_type as string);
        console.log("[ReceiptNoteItems API] Filtering by item_type:", item_type);
      } else {
        console.log("[ReceiptNoteItems API] No item_type filter - will return all items for receipt note");
      }

      const { data, error } = await queryBuilder;
      
      console.log("[ReceiptNoteItems API] Query result:", {
        dataCount: data?.length || 0,
        error: error?.message || null,
        items: data?.map((item: any) => ({
          uuid: item.uuid,
          item_uuid: item.item_uuid,
          item_type: item.item_type,
          receipt_type: item.stock_receipt_notes?.receipt_type,
          received_quantity: item.received_quantity,
          purchase_order_uuid: item.purchase_order_uuid,
          change_order_uuid: item.change_order_uuid,
          receipt_note_uuid: item.receipt_note_uuid
        })) || []
      });

      if (error) {
        console.error("[ReceiptNoteItems] GET error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: `Database error: ${error.message}`,
        });
      }

      // Flatten the response to include receipt note status
      // Also filter out items from inactive receipt notes as a safety check
      const flattenedData = (data || []).map((item: any) => {
        const receiptNote = item.stock_receipt_notes || {};
        return {
          ...item,
          receipt_note_status: receiptNote.status,
          receipt_note_entry_date: receiptNote.entry_date,
          receipt_note_updated_at: receiptNote.updated_at,
          receipt_type: receiptNote.receipt_type,
          receipt_note_is_active: receiptNote.is_active, // Include is_active for filtering
          // Remove nested object
          stock_receipt_notes: undefined,
        };
      }).filter((item: any) => {
        // Filter out items from inactive receipt notes
        // This is a safety check in case the database filter didn't work
        return item.receipt_note_is_active !== false;
      });

      return { data: flattenedData };
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  } catch (error: any) {
    console.error("[ReceiptNoteItems] API error:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Internal server error: ${error.message}`,
    });
  }
});

