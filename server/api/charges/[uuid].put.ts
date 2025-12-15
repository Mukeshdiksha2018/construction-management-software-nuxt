import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  try {
    const uuid = getRouterParam(event, 'uuid');
    const body = await readBody(event);
    const { charge_name, charge_type, status } = body;

    if (!uuid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Charge UUID is required'
      });
    }

    // Validate required fields
    if (!charge_name || charge_name.trim() === '') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Charge Name is required'
      });
    }

    if (!charge_type || !["FREIGHT", "PACKING", "CUSTOM_DUTIES", "OTHER"].includes(charge_type)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Charge Type is required and must be one of: FREIGHT, PACKING, CUSTOM_DUTIES, OTHER'
      });
    }

    // Validate status
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Status must be either ACTIVE or INACTIVE'
      });
    }

    const supabase = supabaseServer;

    const { data, error } = await supabase
      .from('charges')
      .update({
        charge_name: charge_name.trim(),
        charge_type,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('uuid', uuid)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update charge'
      });
    }

    return {
      success: true,
      data,
      message: 'Charge updated successfully'
    };
  } catch (error: any) {
    console.error('Error in Charges PUT API:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    });
  }
});

