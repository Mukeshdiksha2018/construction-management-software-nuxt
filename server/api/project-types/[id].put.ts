import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");
    const body = await readBody(event);
    const { name, description, color, isActive } = body;

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: "Project type ID is required",
      });
    }

    const supabase = supabaseServer;

    // Check if project type exists - try both uuid and id fields
    let existing = null;
    let fetchError = null;

    // First try to find by ID (numeric)
    if (!isNaN(Number(id))) {
      const { data, error } = await supabase
        .from("project_types")
        .select("*")
        .eq("id", Number(id))
        .single();

      if (!error && data) {
        existing = data;
      } else {
        fetchError = error;
      }
    }

    // If not found by ID, try by UUID
    if (!existing) {
      const { data, error } = await supabase
        .from("project_types")
        .select("*")
        .eq("uuid", id)
        .single();

      existing = data;
      fetchError = error;
    }

    if (fetchError || !existing) {
      console.error("Project type not found:", fetchError);
      console.error("Searched for ID:", id);
      throw createError({
        statusCode: 404,
        statusMessage: "Project type not found",
      });
    }

    // If name is being updated, check for duplicates (global check)
    if (name && name !== existing.name) {
      const { data: duplicate } = await supabase
        .from("project_types")
        .select("id")
        .eq("name", name)
        .neq("id", existing.id)
        .single();

      if (duplicate) {
        throw createError({
          statusCode: 409,
          statusMessage: "Project type with this name already exists",
        });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data, error } = await supabase
      .from("project_types")
      .update(updateData)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating project type:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to update project type",
      });
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
    console.error('Project type update error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
