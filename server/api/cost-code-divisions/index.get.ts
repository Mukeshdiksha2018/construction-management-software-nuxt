import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const corporationUuid = query.corporation_uuid as string

    if (!corporationUuid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Corporation UUID is required'
      })
    }

    const supabase = supabaseServer
    
    const { data, error } = await supabase
      .from("cost_code_divisions")
      .select("*")
      .eq("corporation_uuid", corporationUuid)
      .order("division_order", { ascending: true });

    if (error) {
      console.error("Error fetching cost code divisions:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch cost code divisions",
      });
    }

    // Map database column names to frontend expected names
    const mappedData = (data || []).map((item) => ({
      id: item.id,
      uuid: item.uuid,
      division_number: item.division_number,
      division_name: item.division_name,
      division_order: item.division_order,
      description: item.description,
      is_active: item.is_active,
      exclude_in_estimates_and_reports: item.exclude_in_estimates_and_reports,
      corporation_uuid: item.corporation_uuid,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return {
      success: true,
      data: mappedData
    }
  } catch (error: any) {
    console.error('Cost code divisions fetch error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
