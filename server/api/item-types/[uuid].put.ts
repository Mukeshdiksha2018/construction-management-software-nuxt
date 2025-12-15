import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const uuid = getRouterParam(event, 'uuid')
    const body = await readBody(event)
    const { item_type, short_name, is_active } = body

    if (!uuid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Item type UUID is required'
      })
    }

    // Validation
    if (!item_type || !short_name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Item Type and Short Name are required'
      })
    }

    const supabase = supabaseServer

    // Get the existing item type to check corporation and project
    const { data: existingItemType, error: fetchError } = await supabase
      .from('item_types')
      .select('corporation_uuid, project_uuid, item_type, short_name')
      .eq('uuid', uuid)
      .single()

    if (fetchError || !existingItemType) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Item type not found'
      })
    }

    // Check if item type with same name already exists for this corporation and project (excluding current record)
    if (item_type !== existingItemType.item_type) {
      const { data: existingItemTypeName } = await supabase
        .from('item_types')
        .select('id')
        .eq('item_type', item_type)
        .eq('corporation_uuid', existingItemType.corporation_uuid)
        .eq('project_uuid', existingItemType.project_uuid)
        .neq('uuid', uuid)
        .single()

      if (existingItemTypeName) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Item type with this name already exists for this project'
        })
      }
    }

    // Check if short name already exists for this corporation and project (excluding current record)
    if (short_name !== existingItemType.short_name) {
      const { data: existingShortName } = await supabase
        .from('item_types')
        .select('id')
        .eq('short_name', short_name)
        .eq('corporation_uuid', existingItemType.corporation_uuid)
        .eq('project_uuid', existingItemType.project_uuid)
        .neq('uuid', uuid)
        .single()

      if (existingShortName) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Short name already exists for this project'
        })
      }
    }

    const { data, error } = await supabase
      .from("item_types")
      .update({
        item_type,
        short_name,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      })
      .eq('uuid', uuid)
      .select()
      .single();

    if (error) {
      console.error('Error updating item type:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update item type'
      })
    }

    return {
      success: true,
      data: {
        id: data.id,
        uuid: data.uuid,
        corporation_uuid: data.corporation_uuid,
        project_uuid: data.project_uuid,
        item_type: data.item_type,
        short_name: data.short_name,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    };
  } catch (error: any) {
    console.error('Item type update error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
