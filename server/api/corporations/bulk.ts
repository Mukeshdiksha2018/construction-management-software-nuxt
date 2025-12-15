import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    if (!Array.isArray(body.corporations)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required field: corporations array'
      })
    }

    const supabase = supabaseServer
    const corporations = body.corporations

    let newCount = 0
    let duplicateCount = 0
    const errors: string[] = []

    // Process each corporation
    for (const corporation of corporations) {
      try {
        // Validate required fields
        if (!corporation.corporation_name) {
          errors.push(`Corporation missing required field: corporation_name`)
          continue
        }

        // Check if corporation already exists
        const { data: existingCorporation } = await supabase
          .from("corporations")
          .select("id")
          .eq("corporation_name", corporation.corporation_name)
          .single()

        if (existingCorporation) {
          duplicateCount++
          continue
        }

        // Insert new corporation
        const { error: insertError } = await supabase
          .from("corporations")
          .insert({
            corporation_name: corporation.corporation_name,
            corporation_address: corporation.corporation_address || '',
            corporation_city: corporation.corporation_city || null,
            corporation_state: corporation.corporation_state || null,
            corporation_country: corporation.corporation_country || null,
            corporation_zip: corporation.corporation_zip || null,
            corporation_phone: corporation.corporation_phone || '',
            corporation_email: corporation.corporation_email || '',
            corporation_website: corporation.corporation_website || null,
            corporation_federal_id: corporation.corporation_federal_id || null,
            corporation_state_id: corporation.corporation_state_id || null,
            corporation_type: corporation.corporation_type || 'Corporation',
            is_active: corporation.is_active !== undefined ? corporation.is_active : true
          })

        if (insertError) {
          errors.push(`Corporation ${corporation.corporation_name}: ${insertError.message}`)
        } else {
          newCount++
        }
      } catch (error: any) {
        errors.push(`Corporation ${corporation.corporation_name || 'Unknown'}: ${error.message}`)
      }
    }

    const result = {
      success: true,
      message: `Import completed: ${newCount} new corporations added, ${duplicateCount} duplicates skipped`,
      data: {
        new: newCount,
        duplicates: duplicateCount,
        total: corporations.length,
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
