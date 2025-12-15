import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { name, description, color, isActive } = body

    // Validation
    if (!name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Name is required'
      })
    }

    const supabase = supabaseServer
    
    // Check if project type with same name already exists (global check)
    const { data: existing } = await supabase
      .from('project_types')
      .select('id')
      .eq('name', name)
      .single()

    if (existing) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Project type with this name already exists'
      })
    }

    const { data, error } = await supabase
      .from("project_types")
      .insert({
        name,
        description: description || null,
        color: color || "#3B82F6",
        is_active: isActive !== undefined ? isActive : true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating project type:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create project type'
      })
    }

    return {
      success: true,
      data: {
        id: data.id,
        uuid: data.uuid,
        name: data.name,
        description: data.description,
        color: data.color,
        isActive: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    };
  } catch (error: any) {
    console.error('Project type creation error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
