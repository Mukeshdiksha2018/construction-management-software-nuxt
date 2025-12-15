import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);
  const body = method === "POST" || method === "PUT" ? await readBody(event) : null;

  try {
    if (method === "GET") {
      // Fetch addresses for a project
      const { project_uuid } = query;

      if (!project_uuid) {
        throw createError({ statusCode: 400, statusMessage: "project_uuid is required" });
      }

      const { data, error } = await supabaseServer
        .from("project_addresses")
        .select("*")
        .eq("project_uuid", project_uuid)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        throw createError({ statusCode: 500, statusMessage: "Database error: " + error.message });
      }

      return { data: data || [] };
    }

    if (method === "POST") {
      if (!body) {
        throw createError({ statusCode: 400, statusMessage: "Request body is required" });
      }

      const required = ["project_uuid", "address_line_1"];
      for (const f of required) {
        if (!body[f]) {
          throw createError({ statusCode: 400, statusMessage: `${f} is required` });
        }
      }

      const insertData = {
        project_uuid: body.project_uuid,
        address_type: body.address_type || null,
        contact_person: body.contact_person || null,
        email: body.email || null,
        phone: body.phone || null,
        address_line_1: body.address_line_1,
        address_line_2: body.address_line_2 || null,
        city: body.city || null,
        state: body.state || null,
        zip_code: body.zip_code || null,
        country: body.country || null,
        is_primary: !!body.is_primary,
        copied_from_billing_address_uuid:
          body.copied_from_billing_address_uuid || null,
      };

      // If setting as primary, unset other primaries for this project AND address type
      // This allows one primary per address type (shipment, bill, final-destination)
      if (insertData.is_primary && insertData.address_type) {
        await supabaseServer
          .from("project_addresses")
          .update({ is_primary: false })
          .eq("project_uuid", insertData.project_uuid)
          .eq("address_type", insertData.address_type)
          .eq("is_active", true);
      } else if (insertData.is_primary) {
        // If no address_type, unset all primaries (legacy behavior)
        await supabaseServer
          .from("project_addresses")
          .update({ is_primary: false })
          .eq("project_uuid", insertData.project_uuid)
          .eq("is_active", true);
      }

      const { data, error } = await supabaseServer
        .from("project_addresses")
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error("Error creating project address:", error);
        throw createError({ statusCode: 500, statusMessage: "Error creating project address: " + error.message });
      }

      return { data };
    }

    if (method === "PUT") {
      if (!body) {
        throw createError({ statusCode: 400, statusMessage: "Request body is required" });
      }

      const { uuid, ...updated } = body;
      if (!uuid) {
        throw createError({ statusCode: 400, statusMessage: "uuid is required" });
      }

      const updateData: any = {};
      const fields = [
        "address_type",
        "contact_person",
        "email",
        "phone",
        "address_line_1",
        "address_line_2",
        "city",
        "state",
        "zip_code",
        "country",
        "is_primary",
        "is_active",
        "copied_from_billing_address_uuid",
      ];
      for (const f of fields) {
        if (updated[f] !== undefined) updateData[f] = updated[f];
      }

      // If toggling primary to true, unset others for this project AND address type
      // This allows one primary per address type (shipment, bill, final-destination)
      if (updateData.is_primary === true) {
        // Need project_uuid and address_type to unset others of the same type
        const { data: existing, error: fetchErr } = await supabaseServer
          .from("project_addresses")
          .select("project_uuid, address_type")
          .eq("uuid", uuid)
          .single();
        if (fetchErr) {
          console.error("Fetch existing address error:", fetchErr);
          throw createError({ statusCode: 500, statusMessage: "Error updating address: " + fetchErr.message });
        }
        
        if (existing.address_type) {
          // Unset primaries for the same address type
          await supabaseServer
            .from("project_addresses")
            .update({ is_primary: false })
            .eq("project_uuid", existing.project_uuid)
            .eq("address_type", existing.address_type)
            .eq("is_active", true)
            .neq("uuid", uuid);
        } else {
          // If no address_type, unset all primaries (legacy behavior)
          await supabaseServer
            .from("project_addresses")
            .update({ is_primary: false })
            .eq("project_uuid", existing.project_uuid)
            .eq("is_active", true)
            .neq("uuid", uuid);
        }
      }

      const { data, error } = await supabaseServer
        .from("project_addresses")
        .update(updateData)
        .eq("uuid", uuid)
        .select()
        .single();

      if (error) {
        console.error("Error updating project address:", error);
        throw createError({ statusCode: 500, statusMessage: "Error updating project address: " + error.message });
      }

      return { data };
    }

    if (method === "DELETE") {
      const { uuid } = query;
      if (!uuid) {
        throw createError({ statusCode: 400, statusMessage: "uuid is required" });
      }

      const { data, error } = await supabaseServer
        .from("project_addresses")
        .delete()
        .eq("uuid", uuid)
        .select()
        .single();

      if (error) {
        console.error("Error deleting project address:", error);
        throw createError({ statusCode: 500, statusMessage: "Error deleting project address: " + error.message });
      }

      return { data };
    }

    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  } catch (error: any) {
    console.error("Project Addresses API error:", error);
    if (error.statusCode) throw error;
    throw createError({ statusCode: 500, statusMessage: "Internal server error: " + error.message });
  }
});
