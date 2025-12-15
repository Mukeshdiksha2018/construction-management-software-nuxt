import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID is required'
      })
    }

    const supabase = supabaseServer

    // Check if terms and condition exists
    const { data: existing, error: fetchError } = await supabase
      .from('terms_and_conditions')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Terms and condition not found'
      })
    }

    // Delete the terms and condition
    const { error } = await supabase
      .from("terms_and_conditions")
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting terms and condition:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete terms and condition'
      })
    }

    return {
      success: true,
      message: 'Terms and condition deleted successfully'
    };
  } catch (error: any) {
    console.error('Terms and condition deletion error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

