import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { corporation_uuid, tax_name, tax_percentage, status = "ACTIVE" } = body;

    // corporation_uuid is optional (global sales tax)

    if (!tax_name || tax_name.trim() === "") {
      throw createError({
        statusCode: 400,
        statusMessage: "Tax Name is required",
      });
    }

    if (tax_percentage === undefined || tax_percentage === null) {
      throw createError({
        statusCode: 400,
        statusMessage: "Tax Percentage is required",
      });
    }

    const taxPercentageNum = Number(tax_percentage);
    if (isNaN(taxPercentageNum) || taxPercentageNum < 0 || taxPercentageNum > 100) {
      throw createError({
        statusCode: 400,
        statusMessage: "Tax Percentage must be a number between 0 and 100",
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
      .from("sales_tax")
      .insert({
        corporation_uuid: null,
        tax_name: tax_name.trim(),
        tax_percentage: taxPercentageNum,
        status,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to create sales tax",
      });
    }

    return {
      success: true,
      data,
      message: "Sales tax created successfully",
    };
  } catch (error: any) {
    console.error('Error in Sales Tax POST API:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    });
  }
});

