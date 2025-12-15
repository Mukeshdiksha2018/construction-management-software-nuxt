import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  try {
    const uuid = getRouterParam(event, 'uuid');
    const body = await readBody(event);
    const { ship_via, description, active } = body;

    if (!uuid) {
      throw createError({ statusCode: 400, statusMessage: 'Freight UUID is required' });
    }
    if (!ship_via || ship_via.trim() === '') {
      throw createError({ statusCode: 400, statusMessage: 'Ship Via is required' });
    }
    if (typeof active !== 'boolean') {
      throw createError({ statusCode: 400, statusMessage: 'Active must be a boolean value' });
    }

    const supabase = supabaseServer;
    const { data, error } = await supabase
      .from('freight')
      .update({ ship_via: ship_via.trim(), description: description?.trim() || null, active, updated_at: new Date().toISOString() })
      .eq('uuid', uuid)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      if (error.code === '23505') {
        throw createError({ statusCode: 400, statusMessage: 'Freight entry with this Ship Via already exists' });
      }
      throw createError({ statusCode: 500, statusMessage: 'Failed to update freight' });
    }

    return { success: true, data, message: 'Freight updated successfully' };
  } catch (error: any) {
    console.error('Error in Freight PUT API:', error);
    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.statusMessage || 'Internal server error' });
  }
});
