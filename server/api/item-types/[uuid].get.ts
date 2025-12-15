import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const uuid = getRouterParam(event, 'uuid')

    if (!uuid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Item type UUID is required'
      })
    }

    const supabase = supabaseServer
    
    const { data, error } = await supabase
      .from("item_types")
      .select(`
        *,
        projects!inner(
          uuid,
          project_name,
          project_id,
          corporation_uuid
        )
      `)
      .eq("uuid", uuid)
      .single();

    if (error) {
      console.error("Error fetching item type:", error);
      throw createError({
        statusCode: 404,
        statusMessage: "Item type not found",
      });
    }

    // Map database column names to frontend expected names
    const mappedData = {
      id: data.id,
      uuid: data.uuid,
      corporation_uuid: data.corporation_uuid,
      project_uuid: data.project_uuid,
      item_type: data.item_type,
      short_name: data.short_name,
      is_active: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at,
      project: {
        uuid: data.projects.uuid,
        project_name: data.projects.project_name,
        project_id: data.projects.project_id,
        corporation_uuid: data.projects.corporation_uuid,
      }
    };

    return {
      success: true,
      data: mappedData
    }
  } catch (error: any) {
    console.error('Item type fetch error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
