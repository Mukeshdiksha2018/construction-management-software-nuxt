import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { name, content, isActive } = body

    // Validation
    if (!name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Name is required'
      })
    }

    if (!content) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Content is required'
      })
    }

    const supabase = supabaseServer
    
    // Check if terms and condition with same name already exists
    const { data: existing } = await supabase
      .from('terms_and_conditions')
      .select('id')
      .eq('name', name)
      .single()

    if (existing) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Terms and condition with this name already exists'
      })
    }

    const { data, error } = await supabase
      .from("terms_and_conditions")
      .insert({
        name,
        content: content || '',
        is_active: isActive !== undefined ? isActive : true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating terms and condition:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create terms and condition'
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
    console.error('Terms and condition creation error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

