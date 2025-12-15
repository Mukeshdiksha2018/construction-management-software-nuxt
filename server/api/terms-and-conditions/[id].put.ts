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

    const body = await readBody(event)
    const { name, content, isActive } = body

    // Validation
    if (name !== undefined && !name.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Name cannot be empty'
      })
    }

    const supabase = supabaseServer

    // Check if terms and condition exists
    const { data: existing, error: fetchError } = await supabase
      .from('terms_and_conditions')
      .select('id, name')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Terms and condition not found'
      })
    }

    // If name is being changed, check for duplicates
    if (name && name !== existing.name) {
      const { data: duplicate } = await supabase
        .from('terms_and_conditions')
        .select('id')
        .eq('name', name)
        .neq('id', id)
        .single()

      if (duplicate) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Terms and condition with this name already exists'
        })
      }
    }

    // Build update object
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (content !== undefined) updateData.content = content
    if (isActive !== undefined) updateData.is_active = isActive

    const { data, error } = await supabase
      .from("terms_and_conditions")
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating terms and condition:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update terms and condition'
      })
    }

    return {
      success: true,
      data: {
        id: data.id,
        uuid: data.uuid,
        name: data.name,
        content: data.content,
        isActive: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    };
  } catch (error: any) {
    console.error('Terms and condition update error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

