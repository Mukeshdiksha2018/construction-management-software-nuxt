import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);
  const body =
    method === "POST" || method === "PUT" ? await readBody(event) : null;

  try {
    if (method === "GET") {
      // Fetch vendors for a specific corporation
      const { corporation_uuid } = query;

      const { data, error } = await supabaseServer
        .from("vendors")
        .select("*")
        .eq("corporation_uuid", corporation_uuid)
        .eq("is_active", true);

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
      // Add a new vendor
      const {
        corporation_uuid,
        vendor_name,
        vendor_type,
        vendor_address,
        vendor_city,
        vendor_state,
        vendor_country,
        vendor_zip,
        vendor_phone,
        vendor_email,
        is_1099,
        vendor_federal_id,
        vendor_ssn,
        company_name,
        check_printed_as,
        doing_business_as,
        salutation,
        first_name,
        middle_name,
        last_name,
        opening_balance,
        opening_balance_date,
      } = body;

      // Validate required fields
      if (!corporation_uuid || !vendor_name) {
        throw createError({
          statusCode: 400,
          statusMessage:
            "Missing required fields: corporation_uuid and vendor_name are required",
        });
      }

      // Validate email format if provided
      if (vendor_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendor_email)) {
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid email format",
        });
      }

      // Validate phone format if provided (basic validation)
      if (vendor_phone && !/^[\d\s\-\+\(\)]+$/.test(vendor_phone)) {
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

      // Validate opening balance is a number if provided
      if (opening_balance && isNaN(parseFloat(opening_balance))) {
        throw createError({
          statusCode: 400,
          statusMessage: "Opening balance must be a valid number",
        });
      }

      // Validate opening balance date format if provided
      if (
        opening_balance_date &&
        !/^\d{4}-\d{2}-\d{2}$/.test(opening_balance_date)
      ) {
        throw createError({
          statusCode: 400,
          statusMessage: "Opening balance date must be in YYYY-MM-DD format",
        });
      }

      const vendorData = {
        corporation_uuid,
        vendor_name: vendor_name.trim(),
        vendor_type: vendor_type?.trim() || "",
        vendor_address: vendor_address?.trim() || "",
        vendor_city: vendor_city?.trim() || "",
        vendor_state: vendor_state?.trim() || "",
        vendor_country: vendor_country?.trim() || "",
        vendor_zip: vendor_zip?.trim() || "",
        vendor_phone: vendor_phone?.trim() || "",
        vendor_email: vendor_email?.trim() || "",
        is_1099: Boolean(is_1099),
        vendor_federal_id: vendor_federal_id?.trim() || "",
        vendor_ssn: vendor_ssn?.trim() || "",
        company_name: company_name?.trim() || "",
        check_printed_as: check_printed_as?.trim() || "",
        doing_business_as: doing_business_as?.trim() || "",
        salutation: salutation || "Mr.",
        first_name: first_name?.trim() || "",
        middle_name: middle_name?.trim() || "",
        last_name: last_name?.trim() || "",
        opening_balance: opening_balance ? parseFloat(opening_balance) : 0.0,
        opening_balance_date:
          opening_balance_date || new Date().toISOString().split("T")[0],
        is_active: true,
      };

      const { data, error } = await supabaseServer
        .from("vendors")
        .insert([vendorData])
        .select();

      if (error) {
        console.error("Error creating vendor:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error creating vendor: " + error.message,
        });
      }

      if (!data || !data[0]) {
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to create vendor - no data returned",
        });
      }

      return {
        success: true,
        data: data[0],
        message: "Vendor created successfully",
      };
    }

    if (method === "PUT") {
      // Update vendor
      const { uuid, ...updateData } = body;

      if (!uuid) {
        throw createError({
          statusCode: 400,
          statusMessage: "Vendor UUID is required for update",
        });
      }

      // Validate email format if provided
      if (
        updateData.vendor_email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.vendor_email)
      ) {
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid email format",
        });
      }

      // Validate phone format if provided (basic validation)
      if (
        updateData.vendor_phone &&
        !/^[\d\s\-\+\(\)]+$/.test(updateData.vendor_phone)
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

      // Validate opening balance is a number if provided
      if (
        updateData.opening_balance &&
        isNaN(parseFloat(updateData.opening_balance))
      ) {
        throw createError({
          statusCode: 400,
          statusMessage: "Opening balance must be a valid number",
        });
      }

      // Validate opening balance date format if provided
      if (
        updateData.opening_balance_date &&
        !/^\d{4}-\d{2}-\d{2}$/.test(updateData.opening_balance_date)
      ) {
        throw createError({
          statusCode: 400,
          statusMessage: "Opening balance date must be in YYYY-MM-DD format",
        });
      }

      // Prepare update data with proper formatting
      const vendorUpdateData = {
        ...updateData,
        // Trim string fields
        vendor_name: updateData.vendor_name?.trim(),
        vendor_type: updateData.vendor_type?.trim(),
        vendor_address: updateData.vendor_address?.trim(),
        vendor_city: updateData.vendor_city?.trim(),
        vendor_state: updateData.vendor_state?.trim(),
        vendor_country: updateData.vendor_country?.trim(),
        vendor_zip: updateData.vendor_zip?.trim(),
        vendor_phone: updateData.vendor_phone?.trim(),
        vendor_email: updateData.vendor_email?.trim(),
        vendor_federal_id: updateData.vendor_federal_id?.trim(),
        vendor_ssn: updateData.vendor_ssn?.trim(),
        company_name: updateData.company_name?.trim(),
        check_printed_as: updateData.check_printed_as?.trim(),
        doing_business_as: updateData.doing_business_as?.trim(),
        first_name: updateData.first_name?.trim(),
        middle_name: updateData.middle_name?.trim(),
        last_name: updateData.last_name?.trim(),
        // Convert boolean
        is_1099:
          updateData.is_1099 !== undefined
            ? Boolean(updateData.is_1099)
            : undefined,
        // Convert numbers
        opening_balance: updateData.opening_balance
          ? parseFloat(updateData.opening_balance)
          : undefined,
      };

      // Remove undefined values to avoid overwriting with null
      Object.keys(vendorUpdateData).forEach((key) => {
        if (vendorUpdateData[key] === undefined) {
          delete vendorUpdateData[key];
        }
      });

      const { data, error } = await supabaseServer
        .from("vendors")
        .update(vendorUpdateData)
        .eq("uuid", uuid)
        .select();

      if (error) {
        console.error("Error updating vendor:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error updating vendor: " + error.message,
        });
      }

      if (!data || !data[0]) {
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to update vendor - no data returned",
        });
      }

      return {
        success: true,
        data: data[0],
        message: "Vendor updated successfully",
      };
    }

    if (method === "DELETE") {
      // Soft delete vendor (set is_active to false)
      const { uuid } = query;

      const { data, error } = await supabaseServer
        .from("vendors")
        .update({ is_active: false })
        .eq("uuid", uuid)
        .select();

      if (error) {
        console.error("Error deleting vendor:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Error deleting vendor: " + error.message,
        });
      }

      return { success: true };
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  } catch (error: any) {
    console.error("Vendors API error:", error);

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
