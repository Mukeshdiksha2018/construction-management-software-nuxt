import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const corporationUuid = query.corporation_uuid as string;

    if (!corporationUuid) {
      throw createError({
        statusCode: 400,
        statusMessage: "Corporation UUID is required",
      });
    }

    const supabase = supabaseServer;

    // First, fetch active cost code configurations only
    const { data: configData, error: configError } = await supabase
      .from("cost_code_configurations")
      .select("*")
      .eq("corporation_uuid", corporationUuid)
      .neq("is_active", false)  // Filter out inactive configurations
      .order("order_number", { ascending: true });

    if (configError) {
      console.error("Error fetching cost code configurations:", configError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch cost code configurations",
      });
    }

    // Then, fetch all preferred items for these configurations
    const configUuids = (configData || []).map((c) => c.uuid);
    let preferredItemsData: any[] = [];

    if (configUuids.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from("cost_code_preferred_items")
        .select("*")
        .in("cost_code_configuration_uuid", configUuids);

      if (itemsError) {
        console.error("Error fetching preferred items:", itemsError);
      }

      if (!itemsError) {
        preferredItemsData = itemsData || [];
      }
    }

    // Group preferred items by configuration UUID
    const itemsByConfig = preferredItemsData.reduce((acc: any, item: any) => {
      if (!acc[item.cost_code_configuration_uuid]) {
        acc[item.cost_code_configuration_uuid] = [];
      }
      acc[item.cost_code_configuration_uuid].push(item);
      return acc;
    }, {});

    const data = (configData || []).map((config: any) => ({
      ...config,
      cost_code_preferred_items: itemsByConfig[config.uuid] || [],
    }));

    // Map database column names to frontend expected names
    const mappedData = (data || []).map((item) => {
      const preferredItems = (item.cost_code_preferred_items || []).map(
        (prefItem: any) => ({
          id: prefItem.id,
          uuid: prefItem.uuid,
          corporation_uuid: prefItem.corporation_uuid,
          item_type_uuid: prefItem.item_type_uuid,
          project_uuid: prefItem.project_uuid,
          item_name: prefItem.item_name,
          item_sequence: prefItem.item_sequence,
          item_uuid: prefItem.item_uuid || null, // Add item_uuid for UUID-based matching
          model_number: prefItem.model_number,
          unit_price: prefItem.unit_price,
          unit: prefItem.unit,
          description: prefItem.description,
          status: prefItem.status,
          initial_quantity: prefItem.initial_quantity,
          as_of_date: prefItem.as_of_date,
          reorder_point: prefItem.reorder_point,
          maximum_limit: prefItem.maximum_limit,
        })
      );

      return {
        id: item.id,
        uuid: item.uuid,
        corporation_uuid: item.corporation_uuid,
        division_uuid: item.division_uuid,
        cost_code_number: item.cost_code_number,
        cost_code_name: item.cost_code_name,
        parent_cost_code_uuid: item.parent_cost_code_uuid,
        order: item.order_number,
        gl_account_uuid: item.gl_account_uuid,
        preferred_vendor_uuid: item.preferred_vendor_uuid,
        effective_from: item.effective_from,
        description: item.description,
        update_previous_transactions: item.update_previous_transactions,
        is_active: item.is_active,
        created_at: item.created_at,
        updated_at: item.updated_at,
        preferred_items: preferredItems,
      };
    });

    return {
      success: true,
      data: mappedData,
    };
  } catch (error: any) {
    console.error('Cost code configurations fetch error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

