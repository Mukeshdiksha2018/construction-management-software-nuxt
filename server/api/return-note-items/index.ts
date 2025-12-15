import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);

  try {
    if (method === "GET") {
      const { corporation_uuid, project_uuid, return_note_uuid, item_type } = query;

      console.log("[ReturnNoteItems API] GET request:", {
        corporation_uuid,
        project_uuid,
        return_note_uuid,
        item_type
      });

      let queryBuilder = supabaseServer
        .from("return_note_items")
        .select(`
          *,
          stock_return_notes!inner(
            uuid,
            status,
            entry_date,
            updated_at,
            return_type,
            is_active
          )
        `);

      // Filter by corporation if provided
      if (corporation_uuid) {
        queryBuilder = queryBuilder.eq("corporation_uuid", corporation_uuid as string);
      }

      // Filter by active items (default to true if not specified)
      queryBuilder = queryBuilder.eq("is_active", true);
      
      // Note: We filter stock_return_notes.is_active in the flattening step below
      // because Supabase PostgREST doesn't support filtering on joined tables directly

      // Filter by project if provided
      if (project_uuid) {
        queryBuilder = queryBuilder.eq("project_uuid", project_uuid as string);
      }

      // Filter by return note if provided
      if (return_note_uuid) {
        queryBuilder = queryBuilder.eq("return_note_uuid", return_note_uuid as string);
      }

      // Filter by item_type if provided (purchase_order or change_order)
      // This ensures we only get items matching the return type
      // Note: If item_type is not provided, we'll get all items (for backward compatibility)
      if (item_type && (item_type === 'purchase_order' || item_type === 'change_order')) {
        queryBuilder = queryBuilder.eq("item_type", item_type as string);
        console.log("[ReturnNoteItems API] Filtering by item_type:", item_type);
      } else {
        console.log("[ReturnNoteItems API] No item_type filter - will return all items for return note");
      }

      const { data, error } = await queryBuilder;
      
      console.log("[ReturnNoteItems API] Query result:", {
        dataCount: data?.length || 0,
        error: error?.message || null,
        items: data?.map((item: any) => ({
          uuid: item.uuid,
          item_uuid: item.item_uuid,
          item_type: item.item_type,
          return_type: item.stock_return_notes?.return_type,
          return_quantity: item.return_quantity,
          purchase_order_uuid: item.purchase_order_uuid,
          change_order_uuid: item.change_order_uuid,
          return_note_uuid: item.return_note_uuid
        })) || []
      });

      if (error) {
        console.error("[ReturnNoteItems] GET error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: `Database error: ${error.message}`,
        });
      }

      // Flatten the response to include return note status
      // Also filter out items from inactive return notes as a safety check
      const flattenedData = (data || []).map((item: any) => {
        const returnNote = item.stock_return_notes || {};
        return {
          ...item,
          return_note_status: returnNote.status,
          return_note_entry_date: returnNote.entry_date,
          return_note_updated_at: returnNote.updated_at,
          return_type: returnNote.return_type,
          return_note_is_active: returnNote.is_active, // Include is_active for filtering
          // Remove nested object
          stock_return_notes: undefined,
        };
      }).filter((item: any) => {
        // Filter out items from inactive return notes
        // This is a safety check in case the database filter didn't work
        return item.return_note_is_active !== false;
      });

      return { data: flattenedData };
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  } catch (error: any) {
    console.error("[ReturnNoteItems] API error:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Internal server error: ${error.message}`,
    });
  }
});

