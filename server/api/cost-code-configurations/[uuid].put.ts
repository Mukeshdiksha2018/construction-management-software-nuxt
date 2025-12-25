import { supabaseServer } from '@/utils/supabaseServer'

// Normalize date to UTC ISO format for TIMESTAMP WITH TIME ZONE
const normalizeUTC = (val: any): string | null => {
  if (!val && val !== 0) return null;
  const s = String(val).trim();
  if (!s) return null;
  
  // If it's already in ISO format with timezone, return as is
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(s)) {
    return s;
  }
  
  // If it's date-only format (YYYY-MM-DD), convert to ISO with timezone
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return `${s}T00:00:00.000Z`;
  }
  
  // If it's a Date object, convert to ISO string
  if (val instanceof Date) {
    return val.toISOString();
  }
  
  return s;
};

export default defineEventHandler(async (event) => {
  try {
    const uuid = getRouterParam(event, 'uuid')
    const body = await readBody(event)

    if (!uuid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'UUID is required'
      })
    }

    // Validate order_number range if provided
    if (body.order && (body.order < 1 || body.order > 200)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Order must be between 1 and 200'
      })
    }

    const supabase = supabaseServer

    // Check if cost code exists
    const { data: existing } = await supabase
      .from("cost_code_configurations")
      .select("uuid, corporation_uuid")
      .eq("uuid", uuid)
      .single()

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Cost code configuration not found'
      })
    }

    // If cost_code_number is being updated, check for uniqueness
    if (body.cost_code_number) {
      const { data: duplicateCheck } = await supabase
        .from("cost_code_configurations")
        .select("uuid")
        .eq("corporation_uuid", existing.corporation_uuid)
        .eq("cost_code_number", body.cost_code_number)
        .neq("uuid", uuid)
        .single()

      if (duplicateCheck) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Cost code number already exists for this corporation'
        })
      }
    }

    // Prepare update object
    const updateData: any = {}
    if (body.division_uuid !== undefined) updateData.division_uuid = body.division_uuid
    if (body.cost_code_number !== undefined) updateData.cost_code_number = body.cost_code_number
    if (body.cost_code_name !== undefined) updateData.cost_code_name = body.cost_code_name
    if (body.parent_cost_code_uuid !== undefined) updateData.parent_cost_code_uuid = body.parent_cost_code_uuid
    if (body.order !== undefined) updateData.order_number = body.order
    if (body.gl_account_uuid !== undefined) updateData.gl_account_uuid = body.gl_account_uuid
    if (body.preferred_vendor_uuid !== undefined) updateData.preferred_vendor_uuid = body.preferred_vendor_uuid
    if (body.effective_from !== undefined) updateData.effective_from = body.effective_from
    if (body.description !== undefined) updateData.description = body.description
    if (body.update_previous_transactions !== undefined) updateData.update_previous_transactions = body.update_previous_transactions
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    // Update cost code configuration
    const { data: configData, error: configError } = await supabase
      .from("cost_code_configurations")
      .update(updateData)
      .eq("uuid", uuid)
      .select()
      .single()

    if (configError) {
      console.error("Error updating cost code configuration:", configError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to update cost code configuration",
      });
    }

    // Handle preferred items update
    let preferredItemsData: any[] = []
    if (body.preferred_items && Array.isArray(body.preferred_items)) {
      // Delete all existing preferred items for this configuration
      await supabase
        .from("cost_code_preferred_items")
        .delete()
        .eq("cost_code_configuration_uuid", uuid);

      // Insert new preferred items
      if (body.preferred_items.length > 0) {
        const itemsToInsert = body.preferred_items.map((item: any) => ({
          cost_code_configuration_uuid: uuid,
          corporation_uuid: existing.corporation_uuid,
          item_type_uuid: item.item_type_uuid,
          project_uuid: item.project_uuid || null,
          item_name: item.item_name,
          item_sequence: item.item_sequence || null,
          item_uuid: item.item_uuid || null, // Add item_uuid for UUID-based matching
          model_number: item.model_number || null,
          unit_price: parseFloat(item.unit_price),
          unit: item.unit,
          description: item.description || null,
          status: item.status || "Active",
          initial_quantity: item.initial_quantity !== undefined && item.initial_quantity !== null && item.initial_quantity !== '' ? parseFloat(item.initial_quantity) : null,
          as_of_date: normalizeUTC(item.as_of_date),
          reorder_point: item.reorder_point !== undefined && item.reorder_point !== null && item.reorder_point !== '' ? parseFloat(item.reorder_point) : null,
          maximum_limit: item.maximum_limit !== undefined && item.maximum_limit !== null && item.maximum_limit !== '' ? parseFloat(item.maximum_limit) : null,
        }));

        const { data: itemsData, error: itemsError } = await supabase
          .from("cost_code_preferred_items")
          .insert(itemsToInsert)
          .select();

        if (itemsError) {
          console.error("Error updating preferred items:", itemsError);
        } else {
          preferredItemsData = itemsData || [];
        }
      }
    } else {
      // If no preferred_items in body, fetch existing ones
      const { data: existingItems } = await supabase
        .from("cost_code_preferred_items")
        .select("*")
        .eq("cost_code_configuration_uuid", uuid);

      preferredItemsData = existingItems || [];
    }

    // Map database column names to frontend expected names
    const mappedData = {
      id: configData.id,
      uuid: configData.uuid,
      corporation_uuid: configData.corporation_uuid,
      division_uuid: configData.division_uuid,
      cost_code_number: configData.cost_code_number,
      cost_code_name: configData.cost_code_name,
      parent_cost_code_uuid: configData.parent_cost_code_uuid,
      order: configData.order_number,
      gl_account_uuid: configData.gl_account_uuid,
      preferred_vendor_uuid: configData.preferred_vendor_uuid,
      effective_from: configData.effective_from,
      description: configData.description,
      update_previous_transactions: configData.update_previous_transactions,
      is_active: configData.is_active,
      created_at: configData.created_at,
      updated_at: configData.updated_at,
      preferred_items: preferredItemsData.map((item: any) => ({
        id: item.id,
        uuid: item.uuid,
        corporation_uuid: item.corporation_uuid,
        item_type_uuid: item.item_type_uuid,
        project_uuid: item.project_uuid,
        item_name: item.item_name,
        item_sequence: item.item_sequence,
        model_number: item.model_number,
        unit_price: item.unit_price,
        unit: item.unit,
        description: item.description,
        status: item.status,
        initial_quantity: item.initial_quantity,
        as_of_date: item.as_of_date,
        reorder_point: item.reorder_point,
        maximum_limit: item.maximum_limit,
      })),
    };

    return {
      success: true,
      data: mappedData
    }
  } catch (error: any) {
    console.error('Cost code configuration update error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

