import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const supabase = supabaseServer
    
    // Fetch all terms and conditions
    const { data, error } = await supabase
      .from("terms_and_conditions")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching terms and conditions:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch terms and conditions",
      });
    }

    // Map database column names to frontend expected names
    const mappedData = (data || []).map((item) => ({
      id: item.id,
      uuid: item.uuid,
      name: item.name,
      content: item.content,
      isActive: item.is_active,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return {
      success: true,
      data: mappedData
    }
  } catch (error: any) {
    console.error('Terms and conditions fetch error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

