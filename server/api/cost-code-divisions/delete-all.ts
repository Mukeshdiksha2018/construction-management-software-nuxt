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

    // Get count of divisions to be deleted
    const { count, error: countError } = await supabase
      .from("cost_code_divisions")
      .select("*", { count: 'exact', head: true })
      .eq("corporation_uuid", corporationUuid)

    if (countError) {
      console.error("Error counting cost code divisions:", countError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to count cost code divisions",
      });
    }

    // Delete all divisions for the corporation
    const { error } = await supabase
      .from("cost_code_divisions")
      .delete()
      .eq("corporation_uuid", corporationUuid)

    if (error) {
      console.error("Error deleting all cost code divisions:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to delete all cost code divisions",
      });
    }

    return {
      success: true,
      message: `Successfully deleted ${count || 0} cost code divisions`,
      data: {
        deleted_count: count || 0
      }
    }
  } catch (error: any) {
    console.error('Delete all cost code divisions error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
