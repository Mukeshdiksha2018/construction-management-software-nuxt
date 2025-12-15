import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: "Service type ID is required",
      });
    }

    console.log("Delete API called with ID:", id);
    console.log("ID type:", typeof id);
    console.log("ID as number:", Number(id));

    const supabase = supabaseServer;

    // Debug: Let's see what service types exist
    const { data: allServiceTypes, error: debugError } = await supabase
      .from("service_types")
      .select("id, uuid, name")
      .limit(10);

    console.log("All service types in database:", allServiceTypes);
    if (debugError) {
      console.error("Error fetching all service types:", debugError);
    }

    // Check if service type exists - try both uuid and id fields
    let existing = null;
    let fetchError = null;

    // First try to find by ID (numeric)
    if (!isNaN(Number(id))) {
      const { data, error } = await supabase
        .from("service_types")
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
        .from("service_types")
        .select("id, uuid")
        .eq("uuid", id)
        .single();

      existing = data;
      fetchError = error;
    }

    if (fetchError || !existing) {
      console.error("Service type not found:", fetchError);
      console.error("Searched for ID:", id);
      throw createError({
        statusCode: 404,
        statusMessage: "Service type not found",
      });
    }

    console.log("Found service type:", existing);

    // Delete using the primary key (id) for better performance
    const { error } = await supabase
      .from("service_types")
      .delete()
      .eq("id", existing.id);

    if (error) {
      console.error("Error deleting service type:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to delete service type",
      });
    }

    console.log("Service type deleted successfully");

    return {
      success: true,
      message: "Service type deleted successfully",
    };
  } catch (error: any) {
    console.error('Service type deletion error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
