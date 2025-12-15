import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { corporation_uuid, uom_name, short_name, status = "ACTIVE" } = body;

    // corporation_uuid is now optional (global UOM)

    if (!uom_name || uom_name.trim() === "") {
      throw createError({
        statusCode: 400,
        statusMessage: "UOM Name is required",
      });
    }

    if (!short_name || short_name.trim() === "") {
      throw createError({
        statusCode: 400,
        statusMessage: "Short Name is required",
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
      .from("uom")
      .insert({
        corporation_uuid: null,
        uom_name: uom_name.trim(),
        short_name: short_name.trim(),
        status,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to create UOM",
      });
    }

    return {
      success: true,
      data,
      message: "UOM created successfully",
    };
  } catch (error: any) {
    console.error('Error in UOM POST API:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    });
  }
});
