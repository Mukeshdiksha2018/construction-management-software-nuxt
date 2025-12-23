import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);
  const body =
    method === "POST" || method === "PUT" ? await readBody(event) : null;

  try {
    if (method === "GET") {
      // Fetch customers for a specific corporation
      const { corporation_uuid, project_uuid } = query;

      let queryBuilder = supabaseServer
        .from("customers")
        .select("*")
        .eq("corporation_uuid", corporation_uuid)
        .eq("is_active", true);

      // Filter by project if provided
      if (project_uuid) {
        queryBuilder = queryBuilder.eq("project_uuid", project_uuid);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error("Supabase error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Database error: " + error.message,
        });
      }

      return { data: data || [] };
    }

    if (method === "POST") {
      // Add a new customer
      const {
        corporation_uuid,
        project_uuid,
        customer_address,
        customer_city,
        customer_state,
        customer_country,
        customer_zip,
        customer_phone,
        customer_email,
        company_name,
        salutation,
        first_name,
        middle_name,
        last_name,
        profile_image_url,
      } = body;

      // Validate required fields
      if (!corporation_uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "Missing required field: corporation_uuid is required",
        });
      }

      // Validate name fields
      if (!first_name || !last_name) {
        throw createError({
          statusCode: 400,
          statusMessage:
            "Missing required fields: first_name and last_name are required",
        });
      }

      // Validate email format if provided
      if (customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid email format",
        });
      }

      // Validate phone format if provided (basic validation)
      if (customer_phone && !/^[\d\s\-\+\(\)]+$/.test(customer_phone)) {
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid phone number format",
        });
      }

      // Validate salutation if provided
      const validSalutations = [
        "Mr.",
        "Mrs.",
        "Ms.",
        "Dr.",
        "Prof.",
        "Rev.",
        "Sir",
        "Madam",
      ];
      if (salutation && !validSalutations.includes(salutation)) {
        throw createError({
          statusCode: 400,
          statusMessage:
            "Invalid salutation. Must be one of: " +
            validSalutations.join(", "),
        });
      }

      // Validate project_uuid exists if provided
      if (project_uuid) {
        const { data: projectData, error: projectError } = await supabaseServer
          .from("projects")
          .select("uuid")
          .eq("uuid", project_uuid)
          .eq("corporation_uuid", corporation_uuid)
          .single();

        if (projectError || !projectData) {
          throw createError({
            statusCode: 400,
            statusMessage: "Invalid project_uuid or project does not belong to the corporation",
          });
        }
      }

      const customerData = {
        corporation_uuid,
        project_uuid: project_uuid || null,
        customer_address: customer_address?.trim() || "",
        customer_city: customer_city?.trim() || "",
        customer_state: customer_state?.trim() || "",
        customer_country: customer_country?.trim() || "",
        customer_zip: customer_zip?.trim() || "",
        customer_phone: customer_phone?.trim() || "",
        customer_email: customer_email?.trim() || "",
        company_name: company_name?.trim() || "",
        salutation: salutation || "Mr.",
        first_name: first_name?.trim() || "",
        middle_name: middle_name?.trim() || "",
        last_name: last_name?.trim() || "",
        profile_image_url: profile_image_url?.trim() || "",
        is_active: true,
      };

      const { data, error } = await supabaseServer
        .from("customers")
        .insert([customerData])
        .select();

      if (error) {
        console.error("Error creating customer:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error creating customer: " + error.message,
        });
      }

      if (!data || !data[0]) {
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to create customer - no data returned",
        });
      }

      return {
        success: true,
        data: data[0],
        message: "Customer created successfully",
      };
    }

    if (method === "PUT") {
      // Update customer
      const { uuid, ...updateData } = body;

      if (!uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "Customer UUID is required for update",
        });
      }

      // Validate email format if provided
      if (
        updateData.customer_email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.customer_email)
      ) {
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid email format",
        });
      }

      // Validate phone format if provided (basic validation)
      if (
        updateData.customer_phone &&
        !/^[\d\s\-\+\(\)]+$/.test(updateData.customer_phone)
      ) {
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid phone number format",
        });
      }

      // Validate salutation if provided
      const validSalutations = [
        "Mr.",
        "Mrs.",
        "Ms.",
        "Dr.",
        "Prof.",
        "Rev.",
        "Sir",
        "Madam",
      ];
      if (
        updateData.salutation &&
        !validSalutations.includes(updateData.salutation)
      ) {
        throw createError({
          statusCode: 400,
          statusMessage:
            "Invalid salutation. Must be one of: " +
            validSalutations.join(", "),
        });
      }

      // Validate project_uuid exists if provided
      if (updateData.project_uuid && updateData.corporation_uuid) {
        const { data: projectData, error: projectError } = await supabaseServer
          .from("projects")
          .select("uuid")
          .eq("uuid", updateData.project_uuid)
          .eq("corporation_uuid", updateData.corporation_uuid)
          .single();

        if (projectError || !projectData) {
          throw createError({
            statusCode: 400,
            statusMessage: "Invalid project_uuid or project does not belong to the corporation",
          });
        }
      }

      // Prepare update data with proper formatting
      const customerUpdateData = {
        ...updateData,
        // Trim string fields
        customer_address: updateData.customer_address?.trim(),
        customer_city: updateData.customer_city?.trim(),
        customer_state: updateData.customer_state?.trim(),
        customer_country: updateData.customer_country?.trim(),
        customer_zip: updateData.customer_zip?.trim(),
        customer_phone: updateData.customer_phone?.trim(),
        customer_email: updateData.customer_email?.trim(),
        company_name: updateData.company_name?.trim(),
        first_name: updateData.first_name?.trim(),
        middle_name: updateData.middle_name?.trim(),
        last_name: updateData.last_name?.trim(),
        profile_image_url: updateData.profile_image_url?.trim(),
        // Handle project_uuid - allow null
        project_uuid: updateData.project_uuid || null,
      };

      // Remove undefined values to avoid overwriting with null
      Object.keys(customerUpdateData).forEach((key) => {
        if (customerUpdateData[key] === undefined) {
          delete customerUpdateData[key];
        }
      });

      const { data, error } = await supabaseServer
        .from("customers")
        .update(customerUpdateData)
        .eq("uuid", uuid)
        .select();

      if (error) {
        console.error("Error updating customer:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error updating customer: " + error.message,
        });
      }

      if (!data || !data[0]) {
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to update customer - no data returned",
        });
      }

      return {
        success: true,
        data: data[0],
        message: "Customer updated successfully",
      };
    }

    if (method === "DELETE") {
      // Soft delete customer (set is_active to false)
      const { uuid } = query;

      // First, get the customer to retrieve the profile image URL
      const { data: customerData, error: fetchError } = await supabaseServer
        .from("customers")
        .select("profile_image_url")
        .eq("uuid", uuid)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Error fetching customer:", fetchError);
      }

      // Delete the profile image if it exists
      if (customerData?.profile_image_url) {
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const config = useRuntimeConfig();
          const supabaseAdmin = createClient(
            config.public.SUPABASE_URL,
            config.SUPABASE_SERVICE_ROLE_KEY,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false,
              },
            }
          );

          // Extract filename from the URL
          const urlParts = customerData.profile_image_url.split("/");
          const fileName = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params if any

          if (fileName) {
            const { error: deleteError } = await supabaseAdmin.storage
              .from("customer_images")
              .remove([fileName]);

            if (deleteError) {
              console.error("Error deleting customer profile image:", deleteError);
              // Continue with customer deletion even if image deletion fails
            }
          }
        } catch (error) {
          console.error("Error processing customer image deletion:", error);
          // Continue with customer deletion even if image deletion fails
        }
      }

      // Soft delete the customer
      const { data, error } = await supabaseServer
        .from("customers")
        .update({ is_active: false })
        .eq("uuid", uuid)
        .select();

      if (error) {
        console.error("Error deleting customer:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error deleting customer: " + error.message,
        });
      }

      return { success: true };
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  } catch (error: any) {
    console.error("Customers API error:", error);

    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error;
    }

    // Otherwise, create a generic error
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});

