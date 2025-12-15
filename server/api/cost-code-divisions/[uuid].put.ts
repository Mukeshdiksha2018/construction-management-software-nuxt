import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const uuid = getRouterParam(event, 'uuid')
    const body = await readBody(event)
    
    if (!uuid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Division UUID is required'
      })
    }

    // Validate division_order range if provided
    if (body.division_order !== undefined && (body.division_order < 1 || body.division_order > 100)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Division order must be between 1 and 100'
      })
    }

    const supabase = supabaseServer

    // Get the current division to check corporation_uuid
    const { data: currentDivision, error: fetchError } = await supabase
      .from("cost_code_divisions")
      .select("corporation_uuid, division_number, division_order")
      .eq("uuid", uuid)
      .single()

    if (fetchError || !currentDivision) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Cost code division not found'
      })
    }

    // Check if division_number already exists for this corporation (excluding current record)
    if (body.division_number && body.division_number !== currentDivision.division_number) {
      const { data: existingDivision } = await supabase
        .from("cost_code_divisions")
        .select("id")
        .eq("corporation_uuid", currentDivision.corporation_uuid)
        .eq("division_number", body.division_number)
        .neq("uuid", uuid)
        .single()

      if (existingDivision) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Division number already exists for this corporation'
        })
      }
    }

    // Note: division_order uniqueness check removed - multiple divisions can have the same order number

    // Prepare update data
    const updateData: any = {}
    if (body.division_number !== undefined) updateData.division_number = body.division_number
    if (body.division_name !== undefined) updateData.division_name = body.division_name
    if (body.division_order !== undefined) updateData.division_order = body.division_order
    if (body.description !== undefined) updateData.description = body.description
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.exclude_in_estimates_and_reports !== undefined) updateData.exclude_in_estimates_and_reports = body.exclude_in_estimates_and_reports

    const { data, error } = await supabase
      .from("cost_code_divisions")
      .update(updateData)
      .eq("uuid", uuid)
      .select()
      .single()

    if (error) {
      console.error("Error updating cost code division:", error);
      
      // Check if it's a unique constraint violation on division_number
      if (error.code === '23505' && error.message?.includes('division_number')) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Division number already exists for this corporation',
        });
      }
      
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to update cost code division",
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
    console.error('Cost code division update error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
