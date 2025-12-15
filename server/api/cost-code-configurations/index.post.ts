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
    const body = await readBody(event);

    // Validate required fields
    if (
      !body.corporation_uuid ||
      !body.cost_code_number ||
      !body.cost_code_name ||
      !body.gl_account_uuid
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Missing required fields: corporation_uuid, cost_code_number, cost_code_name, gl_account_uuid",
      });
    }

    // Validate order_number range if provided
    if (body.order && (body.order < 1 || body.order > 200)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Order must be between 1 and 200",
      });
    }

    const supabase = supabaseServer;

    // Check if cost_code_number already exists for this corporation
    const { data: existingCostCode } = await supabase
      .from("cost_code_configurations")
      .select("id")
      .eq("corporation_uuid", body.corporation_uuid)
      .eq("cost_code_number", body.cost_code_number)
      .single();

    if (existingCostCode) {
      throw createError({
        statusCode: 409,
        statusMessage: "Cost code number already exists for this corporation",
      });
    }

    // Insert cost code configuration
    const { data: configData, error: configError } = await supabase
      .from("cost_code_configurations")
      .insert({
        corporation_uuid: body.corporation_uuid,
        division_uuid: body.division_uuid || null,
        cost_code_number: body.cost_code_number,
        cost_code_name: body.cost_code_name,
        parent_cost_code_uuid: body.parent_cost_code_uuid || null,
        order_number: body.order || null,
        gl_account_uuid: body.gl_account_uuid,
        preferred_vendor_uuid: body.preferred_vendor_uuid || null,
        effective_from: body.effective_from || null,
        description: body.description || null,
        update_previous_transactions:
          body.update_previous_transactions || false,
        is_active: body.is_active !== undefined ? body.is_active : true,
      })
      .select()
      .single();

    if (configError) {
      console.error("Error creating cost code configuration:", configError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to create cost code configuration",
      });
    }

    // Insert preferred items if provided
    let preferredItemsData: any[] = [];
    if (
      body.preferred_items &&
      Array.isArray(body.preferred_items) &&
      body.preferred_items.length > 0
    ) {
      const itemsToInsert = body.preferred_items.map((item: any) => ({
        cost_code_configuration_uuid: configData.uuid,
        corporation_uuid: body.corporation_uuid,
        item_type_uuid: item.item_type_uuid,
        project_uuid: item.project_uuid || null,
        item_name: item.item_name,
        item_sequence: item.item_sequence || null,
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
        console.error("Error creating preferred items:", itemsError);
        // Note: The configuration was already created, but we'll continue
        // You might want to rollback the configuration here
      } else {
        preferredItemsData = itemsData || [];
      }
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
      data: mappedData,
    };
  } catch (error: any) {
    console.error('Cost code configuration creation error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

