import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const supabase = supabaseServer

    // Get count of corporations to be deleted
    const { count, error: countError } = await supabase
      .from("corporations")
      .select("*", { count: 'exact', head: true })

    if (countError) {
      console.error("Error counting corporations:", countError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to count corporations",
      });
    }

    // Delete all corporations
    const { error } = await supabase
      .from("corporations")
      .delete()
      .neq("id", 0) // Delete all records (this is a workaround for Supabase delete without where clause)

    if (error) {
      console.error("Error deleting all corporations:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to delete all corporations",
      });
    }

    return {
      success: true,
      message: `Successfully deleted ${count || 0} corporations`,
      data: {
        deleted_count: count || 0
      }
    }
  } catch (error: any) {
    console.error('Delete all corporations error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
