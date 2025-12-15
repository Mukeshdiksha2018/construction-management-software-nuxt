import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const uuid = getRouterParam(event, 'uuid')
    
    if (!uuid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Division UUID is required'
      })
    }

    const supabase = supabaseServer

    const { data, error } = await supabase
      .from("cost_code_divisions")
      .delete()
      .eq("uuid", uuid)
      .select()
      .single()

    if (error) {
      console.error("Error deleting cost code division:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to delete cost code division",
      });
    }

    if (!data) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Cost code division not found'
      })
    }

    return {
      success: true,
      message: 'Cost code division deleted successfully',
      data: {
        id: data.id,
        uuid: data.uuid,
        division_number: data.division_number,
        division_name: data.division_name
      }
    }
  } catch (error: any) {
    console.error('Cost code division deletion error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
