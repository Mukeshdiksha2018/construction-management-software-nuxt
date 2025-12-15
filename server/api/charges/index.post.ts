import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { corporation_uuid, charge_name, charge_type, status = "ACTIVE" } = body;

    // corporation_uuid is optional (global charges)

    if (!charge_name || charge_name.trim() === "") {
      throw createError({
        statusCode: 400,
        statusMessage: "Charge Name is required",
      });
    }

    if (!charge_type || !["FREIGHT", "PACKING", "CUSTOM_DUTIES", "OTHER"].includes(charge_type)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Charge Type is required and must be one of: FREIGHT, PACKING, CUSTOM_DUTIES, OTHER",
      });
    }

    // Validate status
    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Status must be either ACTIVE or INACTIVE",
      });
    }

    const supabase = supabaseServer;

    const { data, error } = await supabase
      .from("charges")
      .insert({
        corporation_uuid: null,
        charge_name: charge_name.trim(),
        charge_type,
        status,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to create charge",
      });
    }

    return {
      success: true,
      data,
      message: "Charge created successfully",
    };
  } catch (error: any) {
    console.error('Error in Charges POST API:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    });
  }
});

