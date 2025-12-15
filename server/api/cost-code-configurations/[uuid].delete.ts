import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const uuid = getRouterParam(event, 'uuid')

    if (!uuid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'UUID is required'
      })
    }

    const supabase = supabaseServer

    // Check if cost code exists
    const { data: existing } = await supabase
      .from("cost_code_configurations")
      .select("uuid")
      .eq("uuid", uuid)
      .single()

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Cost code configuration not found'
      })
    }

    // Delete the cost code configuration
    // Note: Preferred items will be automatically deleted due to ON DELETE CASCADE
    const { error } = await supabase
      .from("cost_code_configurations")
      .delete()
      .eq("uuid", uuid)

    if (error) {
      console.error("Error deleting cost code configuration:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to delete cost code configuration",
      });
    }

    return {
      success: true,
      message: 'Cost code configuration deleted successfully'
    }
  } catch (error: any) {
    console.error('Cost code configuration deletion error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

