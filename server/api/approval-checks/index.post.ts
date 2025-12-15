import { supabaseServer } from "@/utils/supabaseServer";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { approval_check, description, active = true } = body;

    if (!approval_check || approval_check.trim() === '') {
      throw createError({ statusCode: 400, statusMessage: 'Approval Check is required' });
    }
    if (typeof active !== 'boolean') {
      throw createError({ statusCode: 400, statusMessage: 'Active must be a boolean value' });
    }

    const supabase = supabaseServer;
    const { data, error } = await supabase
      .from("approval_checks")
      .insert({
        approval_check: approval_check.trim(),
        description: description?.trim() || null,
        active,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      if (error.code === '23505') {
        throw createError({ statusCode: 400, statusMessage: 'Approval Check already exists' });
      }
      throw createError({ statusCode: 500, statusMessage: 'Failed to create approval check' });
    }

    return { success: true, data, message: 'Approval Check created successfully' };
  } catch (error: any) {
    console.error('Error in Approval Checks POST API:', error);
    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.statusMessage || 'Internal server error' });
  }
});

