import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const supabase = supabaseServer
    
    // Fetch all project types (no longer filtered by corporation)
    const { data, error } = await supabase
      .from("project_types")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching project types:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch project types",
      });
    }

    // Map database column names to frontend expected names
    const mappedData = (data || []).map((item) => ({
      id: item.id,
      uuid: item.uuid,
      name: item.name,
      description: item.description,
      color: item.color,
      isActive: item.is_active,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return {
      success: true,
      data: mappedData
    }
  } catch (error: any) {
    console.error('Project types fetch error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
