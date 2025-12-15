import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const corporationUuid = query.corporation_uuid as string
    const projectUuid = query.project_uuid as string

    if (!corporationUuid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Corporation UUID is required'
      })
    }

    const supabase = supabaseServer
    
    let queryBuilder = supabase
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
      .eq("corporation_uuid", corporationUuid)

    // If project_uuid is provided, filter by project
    if (projectUuid) {
      queryBuilder = queryBuilder.eq("project_uuid", projectUuid)
    }

    const { data, error } = await queryBuilder
      .order("item_type", { ascending: true });

    if (error) {
      console.error("Error fetching item types:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch item types",
      });
    }

    // Map database column names to frontend expected names
    const mappedData = (data || []).map((item) => ({
      id: item.id,
      uuid: item.uuid,
      corporation_uuid: item.corporation_uuid,
      project_uuid: item.project_uuid,
      item_type: item.item_type,
      short_name: item.short_name,
      is_active: item.is_active,
      created_at: item.created_at,
      updated_at: item.updated_at,
      project: {
        uuid: item.projects.uuid,
        project_name: item.projects.project_name,
        project_id: item.projects.project_id,
        corporation_uuid: item.projects.corporation_uuid,
      }
    }));

    return {
      success: true,
      data: mappedData
    }
  } catch (error: any) {
    console.error('Item types fetch error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
