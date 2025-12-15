import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  try {
    const uuid = getRouterParam(event, 'uuid');
    const body = await readBody(event);
    const { approval_check, description, active } = body;

    if (!uuid) {
      throw createError({ statusCode: 400, statusMessage: 'Approval Check UUID is required' });
    }
    if (!approval_check || approval_check.trim() === '') {
      throw createError({ statusCode: 400, statusMessage: 'Approval Check is required' });
    }
    if (typeof active !== 'boolean') {
      throw createError({ statusCode: 400, statusMessage: 'Active must be a boolean value' });
    }

    const supabase = supabaseServer;
    const { data, error } = await supabase
      .from("approval_checks")
      .update({
        approval_check: approval_check.trim(),
        description: description?.trim() || null,
        active,
        updated_at: new Date().toISOString(),
      })
      .eq("uuid", uuid)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      if (error.code === '23505') {
        throw createError({ statusCode: 400, statusMessage: 'Approval Check already exists' });
      }
      throw createError({ statusCode: 500, statusMessage: 'Failed to update approval check' });
    }

    return { success: true, data, message: 'Approval Check updated successfully' };
  } catch (error: any) {
    console.error('Error in Approval Checks PUT API:', error);
    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.statusMessage || 'Internal server error' });
  }
});

