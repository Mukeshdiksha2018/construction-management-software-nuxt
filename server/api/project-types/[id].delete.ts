import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: "Project type ID is required",
      });
    }

    console.log("Delete API called with ID:", id);
    console.log("ID type:", typeof id);
    console.log("ID as number:", Number(id));

    const supabase = supabaseServer;

    // Debug: Let's see what project types exist
    const { data: allProjectTypes, error: debugError } = await supabase
      .from("project_types")
      .select("id, uuid, name")
      .limit(10);

    console.log("All project types in database:", allProjectTypes);
    if (debugError) {
      console.error("Error fetching all project types:", debugError);
    }

    // Check if project type exists - try both uuid and id fields
    let existing = null;
    let fetchError = null;

    // First try to find by ID (numeric)
    if (!isNaN(Number(id))) {
      const { data, error } = await supabase
        .from("project_types")
        .select("id, uuid")
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
        .select("id, uuid")
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

    console.log("Found project type:", existing);

    // Check if any projects are using this project type
    const { data: projectsUsingType, error: checkError } = await supabase
      .from("projects")
      .select("uuid, project_name, project_id")
      .eq("project_type_uuid", existing.uuid)
      .eq("is_active", true)
      .limit(10);

    if (checkError) {
      console.error("Error checking project references:", checkError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to check project references",
      });
    }

    if (projectsUsingType && projectsUsingType.length > 0) {
      const count = projectsUsingType.length;
      const hasMore = count >= 10;
      
      // Format project list for better readability
      const projectList = projectsUsingType
        .map((p: any) => p.project_name || p.project_id)
        .slice(0, 10); // Only show first 10
      
      const errorMessage = `Cannot delete project type. It is currently being used by ${count} active project(s)${hasMore ? ' (showing first 10)' : ''}. Please update these projects to use a different project type before deleting.`;
      
      throw createError({
        statusCode: 400,
        statusMessage: errorMessage,
        data: {
          projects: projectsUsingType,
          projectList: projectList,
          count: count,
          hasMore: hasMore
        }
      });
    }

    // Delete using the primary key (id) for better performance
    const { error } = await supabase
      .from("project_types")
      .delete()
      .eq("id", existing.id);

    if (error) {
      console.error("Error deleting project type:", error);
      
      // Check if it's a foreign key constraint error
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        throw createError({
          statusCode: 400,
          statusMessage: "Cannot delete project type. It is currently being used by one or more projects. Please remove or change the project type from these projects before deleting.",
        });
      }
      
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to delete project type: ${error.message || 'Unknown error'}`,
      });
    }

    console.log("Project type deleted successfully");

    return {
      success: true,
      message: "Project type deleted successfully",
    };
  } catch (error: any) {
    console.error('Project type deletion error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
