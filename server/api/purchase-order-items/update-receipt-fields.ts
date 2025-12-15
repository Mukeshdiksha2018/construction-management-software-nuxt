import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    
    if (!body) {
      throw createError({
        statusCode: 400,
        statusMessage: "Request body is required",
      });
    }

    const { receipt_note_uuid, items, corporation_uuid, project_uuid, purchase_order_uuid } = body;

    if (!receipt_note_uuid || typeof receipt_note_uuid !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "receipt_note_uuid is required",
      });
    }

    if (!corporation_uuid || typeof corporation_uuid !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "corporation_uuid is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return { success: true, updated: 0, receipt_note_items_created: 0 };
    }

    // Get receipt note details to ensure it exists
    const { data: receiptNote, error: receiptNoteError } = await supabaseServer
      .from("stock_receipt_notes")
      .select("uuid, corporation_uuid, project_uuid, purchase_order_uuid, change_order_uuid")
      .eq("uuid", receipt_note_uuid)
      .single();

    if (receiptNoteError || !receiptNote) {
      throw createError({
        statusCode: 404,
        statusMessage: `Receipt note ${receipt_note_uuid} not found`,
      });
    }

    // Use receipt note's corporation and project if not provided
    const corpUuid = corporation_uuid || receiptNote.corporation_uuid;
    const projUuid = project_uuid || receiptNote.project_uuid;
    // Use purchase_order_uuid from receipt note (support legacy data)
    const poUuid = purchase_order_uuid || receiptNote.purchase_order_uuid;

    // Process items: create/update receipt_note_items and update receipt_note_uuids array
    // OPTIMIZATION: Batch process items instead of sequential loops
    
    // First, prepare all item data in parallel
    const itemUuidsToUpdate: string[] = [];
    const receiptNoteItemsData: any[] = [];
    const itemDataMap = new Map<string, any>();

    for (const item of items) {
      const itemUuid = item.uuid || item.id;
      if (!itemUuid) continue;

      // Prepare receipt note item data
      const receivedQty = item.received_quantity !== undefined && item.received_quantity !== null
        ? parseFloat(String(item.received_quantity))
        : null;
      const receivedQtyValue = Number.isFinite(receivedQty) ? receivedQty : null;

      let receivedTotal = null;
      if (receivedQtyValue !== null && item.unit_price !== undefined) {
        const unitPrice = parseFloat(String(item.unit_price));
        if (Number.isFinite(unitPrice)) {
          receivedTotal = Math.round((unitPrice * receivedQtyValue + Number.EPSILON) * 100) / 100;
        }
      }

      const grnTotal = item.grn_total !== undefined && item.grn_total !== null
        ? (Number.isFinite(parseFloat(String(item.grn_total))) ? parseFloat(String(item.grn_total)) : null)
        : null;

      const grnTotalWithCharges = item.grn_total_with_charges_taxes !== undefined && item.grn_total_with_charges_taxes !== null
        ? (Number.isFinite(parseFloat(String(item.grn_total_with_charges_taxes))) ? parseFloat(String(item.grn_total_with_charges_taxes)) : null)
        : null;

      itemUuidsToUpdate.push(itemUuid);
      itemDataMap.set(itemUuid, {
        itemUuid,
        cost_code_uuid: item.cost_code_uuid || null,
        received_quantity: receivedQtyValue,
        received_total: receivedTotal,
        grn_total: grnTotal,
        grn_total_with_charges_taxes: grnTotalWithCharges,
      });

      receiptNoteItemsData.push({
        receipt_note_uuid: receipt_note_uuid,
        corporation_uuid: corpUuid,
        project_uuid: projUuid,
        purchase_order_uuid: poUuid,
        change_order_uuid: null,
        item_type: "purchase_order",
        item_uuid: itemUuid,
        cost_code_uuid: item.cost_code_uuid || null,
        received_quantity: receivedQtyValue,
        received_total: receivedTotal,
        grn_total: grnTotal,
        grn_total_with_charges_taxes: grnTotalWithCharges,
      });
    }

    if (itemUuidsToUpdate.length === 0) {
      return { success: true, updated: 0, receipt_note_items_created: 0 };
    }

    // OPTIMIZATION: Batch fetch all existing receipt_note_items in one query
    const { data: existingRnis, error: fetchExistingError } = await supabaseServer
      .from("receipt_note_items")
      .select("uuid, item_uuid")
      .eq("receipt_note_uuid", receipt_note_uuid)
      .eq("item_type", "purchase_order")
      .in("item_uuid", itemUuidsToUpdate);

    if (fetchExistingError) {
      console.error(`[UpdateReceiptFields] Failed to fetch existing receipt_note_items:`, fetchExistingError);
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to fetch existing receipt note items: ${fetchExistingError.message}`,
      });
    }

    const existingRniMap = new Map<string, string>();
    (existingRnis || []).forEach((rni: any) => {
      if (rni.item_uuid) {
        existingRniMap.set(rni.item_uuid, rni.uuid);
      }
    });

    // Separate items into updates and inserts
    const itemsToUpdate: any[] = [];
    const itemsToInsert: any[] = [];

    receiptNoteItemsData.forEach((itemData) => {
      const existingUuid = existingRniMap.get(itemData.item_uuid);
      const itemDataFromMap = itemDataMap.get(itemData.item_uuid);
      
      if (existingUuid) {
        itemsToUpdate.push({
          uuid: existingUuid,
          ...itemDataFromMap,
          updated_at: new Date().toISOString(),
        });
      } else {
        itemsToInsert.push(itemData);
      }
    });

    // OPTIMIZATION: Batch update existing items using upsert or individual updates
    // Note: Supabase doesn't support batch updates directly, so we'll use Promise.all for parallel updates
    if (itemsToUpdate.length > 0) {
      const updatePromises = itemsToUpdate.map((item) => {
        const { uuid, ...updateData } = item;
        return supabaseServer
          .from("receipt_note_items")
          .update(updateData)
          .eq("uuid", uuid);
      });

      const updateResults = await Promise.all(updatePromises);
      const updateErrors = updateResults.filter((result) => result.error);
      if (updateErrors.length > 0) {
        console.error(`[UpdateReceiptFields] Failed to update ${updateErrors.length} receipt_note_items:`, updateErrors);
        const firstError = updateErrors[0];
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to update receipt note items: ${firstError.error?.message || 'Unknown error'}`,
        });
      }
    }

    // OPTIMIZATION: Batch insert new items in one query
    let receiptNoteItemsCreated = 0;
    if (itemsToInsert.length > 0) {
      const { error: insertError } = await supabaseServer
        .from("receipt_note_items")
        .insert(itemsToInsert);

      if (insertError) {
        console.error(`[UpdateReceiptFields] Failed to batch insert receipt_note_items:`, insertError);
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to create receipt note items: ${insertError.message}`,
        });
      }
      receiptNoteItemsCreated = itemsToInsert.length;
    }

    // OPTIMIZATION: Batch fetch all current items in one query
    const { data: currentItems, error: fetchItemsError } = await supabaseServer
      .from("purchase_order_items_list")
      .select("uuid, receipt_note_uuids")
      .in("uuid", itemUuidsToUpdate);

    if (fetchItemsError) {
      console.error(`[UpdateReceiptFields] Failed to fetch items for receipt_note_uuids update:`, fetchItemsError);
      // Don't throw - this is not critical
    } else {
      // OPTIMIZATION: Batch update receipt_note_uuids arrays using Promise.all
      const receiptNoteUuidStr = receipt_note_uuid.toString();
      const updatePromises: Promise<any>[] = [];

      (currentItems || []).forEach((currentItem: any) => {
        if (!currentItem?.uuid) return;
        
        const currentArray = Array.isArray(currentItem.receipt_note_uuids) 
          ? currentItem.receipt_note_uuids 
          : (typeof currentItem.receipt_note_uuids === 'string' ? JSON.parse(currentItem.receipt_note_uuids) : []);
        
        if (!currentArray.includes(receiptNoteUuidStr)) {
          const updatedArray = [...currentArray, receiptNoteUuidStr];
          // Create a promise that executes the query
          updatePromises.push(
            Promise.resolve(
              supabaseServer
                .from("purchase_order_items_list")
                .update({ receipt_note_uuids: updatedArray })
                .eq("uuid", currentItem.uuid)
            )
          );
        }
      });

      if (updatePromises.length > 0) {
        const updateResults = await Promise.all(updatePromises);
        const updateErrors = updateResults.filter((result) => result.error);
        if (updateErrors.length > 0) {
          console.error(`[UpdateReceiptFields] Failed to update receipt_note_uuids for ${updateErrors.length} items:`, updateErrors);
          // Don't throw - this is not critical
        }
      }
    }

    return {
      success: true,
      updated: itemUuidsToUpdate.length,
      receipt_note_items_created: receiptNoteItemsCreated,
    };
  } catch (error: any) {
    console.error("[purchase-order-items/update-receipt-fields] API error:", error);
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error: " + error.message,
    });
  }
});
