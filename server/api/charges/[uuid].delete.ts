import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  try {
    const uuid = getRouterParam(event, 'uuid');

    if (!uuid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Charge UUID is required'
      });
    }

    const supabase = supabaseServer;

    const { error } = await supabase
      .from('charges')
      .delete()
      .eq('uuid', uuid);

    if (error) {
      console.error('Database error:', error);
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete charge'
      });
    }

    return {
      success: true,
      message: 'Charge deleted successfully'
    };
  } catch (error: any) {
    console.error('Error in Charges DELETE API:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    });
  }
});

