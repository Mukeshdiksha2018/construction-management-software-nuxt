import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const uuid = getRouterParam(event, 'uuid')

    if (!uuid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Item type UUID is required'
      })
    }

    const supabase = supabaseServer

    // Get the existing item type to check if it can be deleted
    const { data: existingItemType, error: fetchError } = await supabase
      .from('item_types')
      .select('uuid, item_type, short_name, corporation_uuid, project_uuid')
      .eq('uuid', uuid)
      .single()

    if (fetchError || !existingItemType) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Item type not found'
      })
    }

    // Check if the item type can be deleted (not in use by other projects)
    const { data: canDelete, error: checkError } = await supabase
      .rpc('can_delete_item_type', {
        item_type_uuid_param: uuid
      })

    if (checkError) {
      console.error('Error checking if item type can be deleted:', checkError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to check item type usage'
      })
    }

    if (!canDelete) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Cannot delete item type. It is currently being used by other projects.'
      })
    }

    // Delete the item type
    const { error: deleteError } = await supabase
      .from("item_types")
      .delete()
      .eq('uuid', uuid)

    if (deleteError) {
      console.error('Error deleting item type:', deleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete item type'
      })
    }

    return {
      success: true,
      message: `Item type "${existingItemType.item_type}" (${existingItemType.short_name}) has been deleted successfully`
    };
  } catch (error: any) {
    console.error('Item type deletion error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
