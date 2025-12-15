import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    if (!body.corporation_uuid || !Array.isArray(body.vendors)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: corporation_uuid and vendors array'
      })
    }

    const supabase = supabaseServer
    const corporationUuid = body.corporation_uuid
    const vendors = body.vendors

    let newCount = 0
    let duplicateCount = 0
    const errors: string[] = []

    // Process each vendor
    for (const vendor of vendors) {
      try {
        // Validate required fields
        if (!vendor.vendor_name) {
          errors.push(`Vendor missing required field: vendor_name`)
          continue
        }

        // Check if vendor already exists
        const { data: existingVendor } = await supabase
          .from("vendors")
          .select("id")
          .eq("corporation_uuid", corporationUuid)
          .eq("vendor_name", vendor.vendor_name)
          .single()

        if (existingVendor) {
          duplicateCount++
          continue
        }

        // Insert new vendor
        const { error: insertError } = await supabase
          .from("vendors")
          .insert({
            corporation_uuid: corporationUuid,
            vendor_name: vendor.vendor_name,
            vendor_type: vendor.vendor_type || 'Supplier',
            vendor_address: vendor.vendor_address || '',
            vendor_city: vendor.vendor_city || null,
            vendor_state: vendor.vendor_state || null,
            vendor_country: vendor.vendor_country || null,
            vendor_zip: vendor.vendor_zip || null,
            vendor_phone: vendor.vendor_phone || '',
            vendor_email: vendor.vendor_email || '',
            is_1099: vendor.is_1099 || false,
            vendor_federal_id: vendor.vendor_federal_id || null,
            vendor_ssn: vendor.vendor_ssn || null,
            company_name: vendor.company_name || null,
            check_printed_as: vendor.check_printed_as || null,
            doing_business_as: vendor.doing_business_as || null,
            salutation: vendor.salutation || null,
            first_name: vendor.first_name || null,
            middle_name: vendor.middle_name || null,
            last_name: vendor.last_name || null,
            opening_balance: vendor.opening_balance || 0,
            opening_balance_date: vendor.opening_balance_date || null,
            is_active: vendor.is_active !== undefined ? vendor.is_active : true
          })

        if (insertError) {
          errors.push(`Vendor ${vendor.vendor_name}: ${insertError.message}`)
        } else {
          newCount++
        }
      } catch (error: any) {
        errors.push(`Vendor ${vendor.vendor_name || 'Unknown'}: ${error.message}`)
      }
    }

    const result = {
      success: true,
      message: `Import completed: ${newCount} new vendors added, ${duplicateCount} duplicates skipped`,
      data: {
        new: newCount,
        duplicates: duplicateCount,
        total: vendors.length,
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
