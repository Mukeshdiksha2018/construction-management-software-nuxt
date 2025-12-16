import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    if (!body.corporation_uuid || !Array.isArray(body.divisions) || !Array.isArray(body.configurations)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: corporation_uuid, divisions array, and configurations array'
      })
    }

    const supabase = supabaseServer
    const corporationUuid = body.corporation_uuid
    const divisions = body.divisions
    const configurations = body.configurations

    const result = {
      divisions: { new: 0, duplicates: 0, errors: [] as string[] },
      configurations: { new: 0, duplicates: 0, errors: [] as string[] }
    }

    // Step 1: Process divisions first
    const divisionMap = new Map<string, string>() // Maps division_number to division_uuid
    
    for (const division of divisions) {
      try {
        if (!division.division_number || !division.division_name || !division.division_order) {
          result.divisions.errors.push(`Division missing required fields: ${division.division_number || 'N/A'}`)
          continue
        }

        if (division.division_order < 1 || division.division_order > 100) {
          result.divisions.errors.push(`Division ${division.division_number}: Order must be between 1 and 100`)
          continue
        }

        // Check if division already exists
        const { data: existingDivision } = await supabase
          .from("cost_code_divisions")
          .select("uuid")
          .eq("corporation_uuid", corporationUuid)
          .eq("division_number", division.division_number)
          .single()

        if (existingDivision) {
          result.divisions.duplicates++
          divisionMap.set(division.division_number, existingDivision.uuid)
          continue
        }

        // Note: division_order uniqueness check removed - multiple divisions can have the same order number

        // Insert new division
        const { data: newDivision, error: insertError } = await supabase
          .from("cost_code_divisions")
          .insert({
            corporation_uuid: corporationUuid,
            division_number: division.division_number,
            division_name: division.division_name,
            division_order: division.division_order,
            description: division.description || null,
            is_active: division.is_active !== undefined ? division.is_active : true
          })
          .select("uuid")
          .single()

        if (insertError) {
          // Check if it's a unique constraint violation on division_number
          if (insertError.code === '23505' && insertError.message?.includes('division_number')) {
            result.divisions.errors.push(`Division ${division.division_number}: Division number already exists`)
          } else {
            result.divisions.errors.push(`Division ${division.division_number}: ${insertError.message}`)
          }
        } else {
          result.divisions.new++
          divisionMap.set(division.division_number, newDivision.uuid)
        }
      } catch (error: any) {
        result.divisions.errors.push(`Division ${division.division_number || 'Unknown'}: ${error.message}`)
      }
    }

    // Step 2: Process configurations (cost codes)
    // First, we need to get all existing configurations to build a map of cost_code_number to uuid for parent lookups
    const { data: existingConfigs } = await supabase
      .from("cost_code_configurations")
      .select("uuid, cost_code_number")
      .eq("corporation_uuid", corporationUuid)

    const costCodeMap = new Map<string, string>() // Maps cost_code_number to uuid
    if (existingConfigs) {
      existingConfigs.forEach((config: any) => {
        costCodeMap.set(config.cost_code_number, config.uuid)
      })
    }

    // Helper function to refresh cost code map
    async function refreshCostCodeMap() {
      const { data: updatedConfigs } = await supabase
        .from("cost_code_configurations")
        .select("uuid, cost_code_number")
        .eq("corporation_uuid", corporationUuid)
      
      if (updatedConfigs) {
        costCodeMap.clear()
        updatedConfigs.forEach((config: any) => {
          costCodeMap.set(config.cost_code_number, config.uuid)
        })
      }
    }

    // Get GL account for corporation ONCE - try default first, then any account, then null
    // This is done once instead of for every configuration
    let glAccountUuid: string | null = null
    
    const { data: defaultGLAccount } = await supabase
      .from("chart_of_accounts")
      .select("uuid")
      .eq("corporation_uuid", corporationUuid)
      .eq("is_default", true)
      .maybeSingle()

    if (defaultGLAccount) {
      glAccountUuid = defaultGLAccount.uuid
    } else {
      // If no default, try to get any GL account for the corporation
      const { data: anyGLAccount } = await supabase
        .from("chart_of_accounts")
        .select("uuid")
        .eq("corporation_uuid", corporationUuid)
        .limit(1)
        .maybeSingle()
      
      if (anyGLAccount) {
        glAccountUuid = anyGLAccount.uuid
      }
      // If no GL account exists, glAccountUuid remains null (which is allowed by the schema)
    }

    // Helper function to process configurations in batch
    async function processConfigurationsBatch(configs: any[], level: number) {
      const batchSize = 100 // Process 100 at a time
      const batches: any[][] = []
      
      // Split into batches
      for (let i = 0; i < configs.length; i += batchSize) {
        batches.push(configs.slice(i, i + batchSize))
      }
      
      // Process each batch
      for (const batch of batches) {
        const insertDataArray: any[] = []
        const configToInsertMap = new Map<number, any>() // Map index to config for error reporting
        
        // Prepare batch for insertion
        for (let i = 0; i < batch.length; i++) {
          const config = batch[i]
          
          try {
            // Validate required fields
            if (!config.cost_code_number || !config.cost_code_name) {
              result.configurations.errors.push(`Row ${config._rowNumber || 'Unknown'}: Missing required fields (Cost Code Number, Cost Code Name)`)
              continue
            }

            // Check if cost code already exists
            if (costCodeMap.has(config.cost_code_number)) {
              result.configurations.duplicates++
              continue
            }

            // Resolve division UUID if division_number is provided
            let divisionUuid: string | null = null
            if (config.division_number) {
              divisionUuid = divisionMap.get(config.division_number) || null
              if (!divisionUuid && config.division_number.trim() !== '') {
                result.configurations.errors.push(`Cost Code ${config.cost_code_number}: Division "${config.division_number}" not found`)
                continue
              }
            }

            // Resolve parent UUID if parent_cost_code_number is provided
            let parentUuid: string | null = null
            if (config.parent_cost_code_number && config.parent_cost_code_number.trim() !== '') {
              parentUuid = costCodeMap.get(config.parent_cost_code_number) || null
              if (!parentUuid) {
                result.configurations.errors.push(`Cost Code ${config.cost_code_number}: Parent Cost Code "${config.parent_cost_code_number}" not found`)
                continue
              }
            }

            // Validate order range
            const order = config.order ? parseInt(config.order) : null
            if (order !== null && (order < 1 || order > 200)) {
              result.configurations.errors.push(`Cost Code ${config.cost_code_number}: Order must be between 1 and 200`)
              continue
            }

            // Prepare insert data
            const insertData: any = {
              corporation_uuid: corporationUuid,
              division_uuid: divisionUuid,
              cost_code_number: config.cost_code_number,
              cost_code_name: config.cost_code_name,
              parent_cost_code_uuid: parentUuid,
              order_number: order,
              description: config.description || null,
              is_active: config.is_active !== undefined ? config.is_active : true
            }
            
            // Only add gl_account_uuid if we found one (reuse the same one for all)
            if (glAccountUuid) {
              insertData.gl_account_uuid = glAccountUuid
            }
            
            insertDataArray.push(insertData)
            configToInsertMap.set(insertDataArray.length - 1, config)
          } catch (error: any) {
            console.error(`Error preparing cost code ${config.cost_code_number || 'Unknown'}:`, error)
            result.configurations.errors.push(`Cost Code ${config.cost_code_number || 'Unknown'}: ${error.message}`)
          }
        }
        
        // Batch insert if we have data to insert
        if (insertDataArray.length > 0) {
          try {
            const { data: insertedData, error: insertError } = await supabase
              .from("cost_code_configurations")
              .insert(insertDataArray)
              .select("uuid, cost_code_number")

            if (insertError) {
              // If batch insert fails, try individual inserts for better error reporting
              console.error(`Batch insert error, falling back to individual inserts:`, insertError)
              for (const insertData of insertDataArray) {
                const { error: singleError } = await supabase
                  .from("cost_code_configurations")
                  .insert(insertData)
                  .select("uuid, cost_code_number")
                
                if (singleError) {
                  const config = configToInsertMap.get(insertDataArray.indexOf(insertData))
                  result.configurations.errors.push(`Cost Code ${config?.cost_code_number || 'Unknown'}: ${singleError.message}`)
                } else {
                  result.configurations.new++
                }
              }
            } else if (insertedData) {
              result.configurations.new += insertedData.length
              // Update cost code map with newly inserted configurations
              insertedData.forEach((item: any) => {
                if (item.uuid && item.cost_code_number) {
                  costCodeMap.set(item.cost_code_number, item.uuid)
                }
              })
            }
          } catch (error: any) {
            console.error(`Error in batch insert:`, error)
            result.configurations.errors.push(`Batch insert failed: ${error.message}`)
          }
        }
      }
    }

    // Process configurations in order - first level, then sub-levels
    // We need to process in multiple passes: level 0 (no parent), then level 1 (parent exists), then level 2
    const configsByLevel: { [key: number]: typeof configurations } = { 0: [], 1: [], 2: [] }
    
    configurations.forEach((config: any) => {
      if (!config.parent_cost_code_number || config.parent_cost_code_number.trim() === '') {
        configsByLevel[0].push(config)
      } else {
        // Check if it's a second level (parent is itself a sub-cost code)
        const parentConfig = configurations.find((c: any) => c.cost_code_number === config.parent_cost_code_number)
        if (parentConfig && parentConfig.parent_cost_code_number) {
          configsByLevel[2].push(config)
        } else {
          configsByLevel[1].push(config)
        }
      }
    })

    // Process level 0 (top-level cost codes) in batches
    await processConfigurationsBatch(configsByLevel[0], 0)

    // Refresh cost code map after level 0 (only if we inserted new ones)
    if (configsByLevel[0].length > 0) {
      await refreshCostCodeMap()
    }

    // Process level 1 (sub-cost codes) in batches
    await processConfigurationsBatch(configsByLevel[1], 1)

    // Refresh cost code map after level 1 (only if we inserted new ones)
    if (configsByLevel[1].length > 0) {
      await refreshCostCodeMap()
    }

    // Process level 2 (sub-sub-cost codes) in batches
    await processConfigurationsBatch(configsByLevel[2], 2)

    // Build response message
    const totalNew = result.divisions.new + result.configurations.new
    const totalDuplicates = result.divisions.duplicates + result.configurations.duplicates
    const totalErrors = result.divisions.errors.length + result.configurations.errors.length

    let message = `Import completed: ${result.divisions.new} new divisions, ${result.configurations.new} new cost codes. `
    message += `${totalDuplicates} duplicates skipped.`
    
    if (totalErrors > 0) {
      message += ` ${totalErrors} errors occurred.`
    }

    return {
      success: true,
      message,
      data: {
        divisions: {
          new: result.divisions.new,
          duplicates: result.divisions.duplicates,
          total: divisions.length,
          errors: result.divisions.errors.length
        },
        configurations: {
          new: result.configurations.new,
          duplicates: result.configurations.duplicates,
          total: configurations.length,
          errors: result.configurations.errors.length
        },
        errors: {
          divisions: result.divisions.errors,
          configurations: result.configurations.errors
        }
      }
    }
  } catch (error: any) {
    console.error('Unified bulk import error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

