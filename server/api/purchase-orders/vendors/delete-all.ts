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

    // Get count of vendors to be deleted
    const { count, error: countError } = await supabase
      .from("vendors")
      .select("*", { count: 'exact', head: true })
      .eq("corporation_uuid", corporationUuid)

    if (countError) {
      console.error("Error counting vendors:", countError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to count vendors",
      });
    }

    // Delete all vendors for the corporation
    const { error } = await supabase
      .from("vendors")
      .delete()
      .eq("corporation_uuid", corporationUuid)

    if (error) {
      console.error("Error deleting all vendors:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to delete all vendors",
      });
    }

    return {
      success: true,
      message: `Successfully deleted ${count || 0} vendors`,
      data: {
        deleted_count: count || 0
      }
    }
  } catch (error: any) {
    console.error('Delete all vendors error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
