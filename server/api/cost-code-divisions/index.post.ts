import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    // Validate required fields
    if (!body.corporation_uuid || !body.division_number || !body.division_name || !body.division_order) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: corporation_uuid, division_number, division_name, division_order'
      })
    }

    // Validate division_order range
    if (body.division_order < 1 || body.division_order > 100) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Division order must be between 1 and 100'
      })
    }

    const supabase = supabaseServer

    // Check if division_number already exists for this corporation
    const { data: existingDivision } = await supabase
      .from("cost_code_divisions")
      .select("id")
      .eq("corporation_uuid", body.corporation_uuid)
      .eq("division_number", body.division_number)
      .single()

    if (existingDivision) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Division number already exists for this corporation'
      })
    }

    // Note: division_order uniqueness check removed - multiple divisions can have the same order number

    const { data, error } = await supabase
      .from("cost_code_divisions")
      .insert({
        corporation_uuid: body.corporation_uuid,
        division_number: body.division_number,
        division_name: body.division_name,
        division_order: body.division_order,
        description: body.description || null,
        is_active: body.is_active !== undefined ? body.is_active : true,
        exclude_in_estimates_and_reports: body.exclude_in_estimates_and_reports !== undefined ? body.exclude_in_estimates_and_reports : false
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating cost code division:", error);
      
      // Check if it's a unique constraint violation on division_number
      if (error.code === '23505' && error.message?.includes('division_number')) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Division number already exists for this corporation',
        });
      }
      
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to create cost code division",
      });
    }

    // Map database column names to frontend expected names
    const mappedData = {
      id: data.id,
      uuid: data.uuid,
      division_number: data.division_number,
      division_name: data.division_name,
      division_order: data.division_order,
      description: data.description,
      is_active: data.is_active,
      exclude_in_estimates_and_reports: data.exclude_in_estimates_and_reports,
      corporation_uuid: data.corporation_uuid,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return {
      success: true,
      data: mappedData
    }
  } catch (error: any) {
    console.error('Cost code division creation error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
