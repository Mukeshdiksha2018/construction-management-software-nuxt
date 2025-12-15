import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  try {
    const uuid = getRouterParam(event, 'uuid');
    const body = await readBody(event);
    const { uom_name, short_name, status } = body;

    if (!uuid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'UOM UUID is required'
      });
    }

    // Validate required fields
    if (!uom_name || uom_name.trim() === '') {
      throw createError({
        statusCode: 400,
        statusMessage: 'UOM Name is required'
      });
    }

    if (!short_name || short_name.trim() === '') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Short Name is required'
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
      .from('uom')
      .update({
        uom_name: uom_name.trim(),
        short_name: short_name.trim(),
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
        statusMessage: 'Failed to update UOM'
      });
    }

    return {
      success: true,
      data,
      message: 'UOM updated successfully'
    };
  } catch (error: any) {
    console.error('Error in UOM PUT API:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    });
  }
});
