import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    if (!body.corporation_uuid || !Array.isArray(body.divisions)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: corporation_uuid and divisions array'
      })
    }

    const supabase = supabaseServer
    const corporationUuid = body.corporation_uuid
    const divisions = body.divisions

    let newCount = 0
    let duplicateCount = 0
    const errors: string[] = []

    // Process each division
    for (const division of divisions) {
      try {
        // Validate required fields
        if (!division.division_number || !division.division_name || !division.division_order) {
          errors.push(`Division missing required fields: ${division.division_number || 'N/A'}`)
          continue
        }

        // Validate division_order range
        if (division.division_order < 1 || division.division_order > 100) {
          errors.push(`Division ${division.division_number}: Order must be between 1 and 100`)
          continue
        }

        // Check if division already exists
        const { data: existingDivision } = await supabase
          .from("cost_code_divisions")
          .select("id")
          .eq("corporation_uuid", corporationUuid)
          .eq("division_number", division.division_number)
          .single()

        if (existingDivision) {
          duplicateCount++
          continue
        }

        // Note: division_order uniqueness check removed - multiple divisions can have the same order number

        // Insert new division
        const { error: insertError } = await supabase
          .from("cost_code_divisions")
          .insert({
            corporation_uuid: corporationUuid,
            division_number: division.division_number,
            division_name: division.division_name,
            division_order: division.division_order,
            description: division.description || null,
            is_active: division.is_active !== undefined ? division.is_active : true
          })

        if (insertError) {
          // Check if it's a unique constraint violation on division_number
          if (insertError.code === '23505' && insertError.message?.includes('division_number')) {
            errors.push(`Division ${division.division_number}: Division number already exists`)
          } else {
            errors.push(`Division ${division.division_number}: ${insertError.message}`)
          }
        } else {
          newCount++
        }
      } catch (error: any) {
        errors.push(`Division ${division.division_number || 'Unknown'}: ${error.message}`)
      }
    }

    const result = {
      success: true,
      message: `Import completed: ${newCount} new divisions added, ${duplicateCount} duplicates skipped`,
      data: {
        new: newCount,
        duplicates: duplicateCount,
        total: divisions.length,
        errors: errors.length
      }
    }

    if (errors.length > 0) {
      result.message += `, ${errors.length} errors occurred`
    }

    return result
  } catch (error: any) {
    console.error('Bulk import error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
