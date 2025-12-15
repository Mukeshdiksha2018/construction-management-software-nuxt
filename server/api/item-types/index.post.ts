import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { corporation_uuid, project_uuid, item_type, short_name, is_active } = body

    // Validation
    if (!corporation_uuid || !project_uuid || !item_type || !short_name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Corporation UUID, Project UUID, Item Type, and Short Name are required'
      })
    }

    const supabase = supabaseServer
    
    // Check if item type with same name already exists for this corporation and project
    const { data: existingItemType } = await supabase
      .from('item_types')
      .select('id')
      .eq('item_type', item_type)
      .eq('corporation_uuid', corporation_uuid)
      .eq('project_uuid', project_uuid)
      .single()

    if (existingItemType) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Item type with this name already exists for this project'
      })
    }

    // Check if short name already exists for this corporation and project
    const { data: existingShortName } = await supabase
      .from('item_types')
      .select('id')
      .eq('short_name', short_name)
      .eq('corporation_uuid', corporation_uuid)
      .eq('project_uuid', project_uuid)
      .single()

    if (existingShortName) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Short name already exists for this project'
      })
    }

    // Verify that the project belongs to the corporation
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('uuid, corporation_uuid')
      .eq('uuid', project_uuid)
      .eq('corporation_uuid', corporation_uuid)
      .single()

    if (projectError || !project) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Project not found or does not belong to the specified corporation'
      })
    }

    const { data, error } = await supabase
      .from("item_types")
      .insert({
        corporation_uuid,
        project_uuid,
        item_type,
        short_name,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating item type:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create item type'
      })
    }

    // Track usage of this item type
    await supabase.rpc('track_item_type_usage', {
      item_type_uuid_param: data.uuid,
      project_uuid_param: project_uuid
    });

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
    console.error('Item type creation error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
