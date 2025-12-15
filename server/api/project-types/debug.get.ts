import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const supabase = supabaseServer;
    
    // Get all project types to debug
    const { data, error } = await supabase
      .from("project_types")
      .select("*")
      .limit(20);
    
    if (error) {
      console.error("Error fetching project types:", error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }

    return {
      success: true,
      data: data,
      count: data?.length || 0
    };
  } catch (error: any) {
    console.error('Debug API error:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
});
