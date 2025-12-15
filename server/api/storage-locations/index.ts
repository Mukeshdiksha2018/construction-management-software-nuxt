import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);

  if (method === "GET") {
    // Fetch all storage locations for a specific corporation
    const { corporation_uuid } = query;

    if (!corporation_uuid) {
      throw createError({
        statusCode: 400,
        statusMessage: "corporation_uuid is required",
      });
    }

    const { data, error } = await supabaseServer
      .from("storage_locations")
      .select("*")
      .eq("corporation_uuid", corporation_uuid)
      .order("created_at", { ascending: false });

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Error fetching storage locations: ${error.message}`,
      });
    }

    return { data };
  }

  if (method === "POST") {
    // Create a new storage location
    const body = await readBody(event);
    const {
      corporation_uuid,
      location_name,
      address,
      project_uuid,
      is_default = false,
      status = "active",
    } = body;

    // Validate required fields
    if (!corporation_uuid || !location_name || !address) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "corporation_uuid, location_name, and address are required",
      });
    }

    // If this location is being set as default, unset any existing default
    if (is_default) {
      await supabaseServer
        .from("storage_locations")
        .update({ is_default: false })
        .eq("corporation_uuid", corporation_uuid)
        .eq("is_default", true);
    }

    const { data, error } = await supabaseServer
      .from("storage_locations")
      .insert([
        {
          corporation_uuid,
          location_name,
          address,
          project_uuid: project_uuid || null,
          is_default,
          status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Error creating storage location: ${error.message}`,
      });
    }

    return { data };
  }

  if (method === "PUT") {
    // Update an existing storage location
    const body = await readBody(event);
    const {
      uuid,
      corporation_uuid,
      location_name,
      address,
      project_uuid,
      is_default,
      status,
    } = body;

    if (!uuid) {
      throw createError({
        statusCode: 400,
        statusMessage: "uuid is required",
      });
    }

    // If this location is being set as default, unset any existing default
    if (is_default === true && corporation_uuid) {
      await supabaseServer
        .from("storage_locations")
        .update({ is_default: false })
        .eq("corporation_uuid", corporation_uuid)
        .eq("is_default", true)
        .neq("uuid", uuid);
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (location_name !== undefined) updateData.location_name = location_name;
    if (address !== undefined) updateData.address = address;
    if (project_uuid !== undefined) updateData.project_uuid = project_uuid || null;
    if (is_default !== undefined) updateData.is_default = is_default;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabaseServer
      .from("storage_locations")
      .update(updateData)
      .eq("uuid", uuid)
      .select()
      .single();

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Error updating storage location: ${error.message}`,
      });
    }

    return { data };
  }

  if (method === "DELETE") {
    // Delete a storage location
    const { uuid } = query;

    if (!uuid) {
      throw createError({
        statusCode: 400,
        statusMessage: "uuid is required",
      });
    }

    const { error } = await supabaseServer
      .from("storage_locations")
      .delete()
      .eq("uuid", uuid);

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Error deleting storage location: ${error.message}`,
      });
    }

    return { success: true };
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});

