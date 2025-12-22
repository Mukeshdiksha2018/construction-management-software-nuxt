import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const query = getQuery(event)
  const corporationUuid = query.corporation_uuid as string
  const projectUuid = query.project_uuid as string
  const startDate = query.start_date as string
  const endDate = query.end_date as string

  if (method !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  if (!corporationUuid || !projectUuid || !startDate || !endDate) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Corporation UUID, Project UUID, Start Date, and End Date are required'
    })
  }

  const supabase = supabaseServer

  try {
    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('uuid, project_name, project_id')
      .eq('uuid', projectUuid)
      .eq('corporation_uuid', corporationUuid)
      .maybeSingle()

    if (projectError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Error fetching project: ${projectError.message}`
      })
    }

    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found'
      })
    }

    // Fetch all vendors for this corporation
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('uuid, vendor_name')
      .eq('corporation_uuid', corporationUuid)
      .eq('is_active', true)

    if (vendorsError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Error fetching vendors: ${vendorsError.message}`
      })
    }

    if (!vendors || vendors.length === 0) {
      return {
        project: {
          projectName: project.project_name,
          projectId: project.project_id
        },
        vendors: []
      }
    }

    // Fetch purchase orders for this project (Approved, Completed, and Partially_Received)
    const { data: purchaseOrders, error: poError } = await supabase
      .from('purchase_order_forms')
      .select('uuid, vendor_uuid, financial_breakdown')
      .eq('corporation_uuid', corporationUuid)
      .eq('project_uuid', projectUuid)
      .in('status', ['Approved', 'Completed', 'Partially_Received'])
      .eq('is_active', true)

    if (poError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Error fetching purchase orders: ${poError.message}`
      })
    }

    // Fetch change orders for this project (Approved, Completed, and Partially_Received)
    const { data: changeOrders, error: coError } = await supabase
      .from('change_orders')
      .select('uuid, vendor_uuid, financial_breakdown')
      .eq('corporation_uuid', corporationUuid)
      .eq('project_uuid', projectUuid)
      .in('status', ['Approved', 'Completed', 'Partially_Received'])
      .eq('is_active', true)

    if (coError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Error fetching change orders: ${coError.message}`
      })
    }

    // Fetch all invoices for this project (filtered by date range)
    // We need all invoices for holdback and tax calculations
    const { data: invoices, error: invoicesError } = await supabase
      .from('vendor_invoices')
      .select('uuid, vendor_uuid, invoice_type, purchase_order_uuid, change_order_uuid, status, amount, holdback, financial_breakdown')
      .eq('corporation_uuid', corporationUuid)
      .eq('project_uuid', projectUuid)
      .eq('is_active', true)
      .gte('bill_date', startDate)
      .lte('bill_date', endDate)

    if (invoicesError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Error fetching invoices: ${invoicesError.message}`
      })
    }

    // Process data by vendor
    const vendorMap = new Map(vendors.map(v => [v.uuid, v.vendor_name]))
    const vendorDataMap = new Map<string, any>()

    // Initialize vendor data
    vendors.forEach(vendor => {
      vendorDataMap.set(vendor.uuid, {
        vendorUuid: vendor.uuid,
        vendorName: vendor.vendor_name,
        poAmount: 0,
        changeOrderAmount: 0,
        totalInvoiceValue: 0,
        billedByVendor: 0, // Zero for now
        holdback: 0,
        tax: 0,
        balance: 0, // Zero for now
        paidToDate: 0,
        apBalance: 0 // Zero for now
      })
    })

    // Calculate PO amounts by vendor
    if (purchaseOrders) {
      purchaseOrders.forEach(po => {
        if (po.vendor_uuid) {
          const vendorData = vendorDataMap.get(po.vendor_uuid)
          if (vendorData) {
            // Extract total_po_amount from financial_breakdown
            let poAmount = 0
            if (po.financial_breakdown) {
              try {
                const breakdown = typeof po.financial_breakdown === 'string' 
                  ? JSON.parse(po.financial_breakdown) 
                  : po.financial_breakdown
                const totals = breakdown?.totals || {}
                poAmount = parseFloat(totals.total_po_amount || totals.totalAmount || totals.total || "0") || 0
              } catch (parseError) {
                console.error("Error parsing PO financial_breakdown:", parseError)
                poAmount = 0
              }
            }
            vendorData.poAmount += poAmount
          }
        }
      })
    }

    // Calculate Change Order amounts by vendor
    if (changeOrders) {
      changeOrders.forEach(co => {
        if (co.vendor_uuid) {
          const vendorData = vendorDataMap.get(co.vendor_uuid)
          if (vendorData) {
            // Extract total_co_amount from financial_breakdown
            let coAmount = 0
            if (co.financial_breakdown) {
              try {
                const breakdown = typeof co.financial_breakdown === 'string' 
                  ? JSON.parse(co.financial_breakdown) 
                  : co.financial_breakdown
                const totals = breakdown?.totals || {}
                coAmount = parseFloat(totals.total_co_amount || totals.totalAmount || totals.total || "0") || 0
              } catch (parseError) {
                console.error("Error parsing CO financial_breakdown:", parseError)
                coAmount = 0
              }
            }
            vendorData.changeOrderAmount += coAmount
          }
        }
      })
    }

    // Process invoices
    if (invoices) {
      invoices.forEach(invoice => {
        if (!invoice.vendor_uuid) return

        const vendorData = vendorDataMap.get(invoice.vendor_uuid)
        if (!vendorData) return

        // Parse financial breakdown
        let financialBreakdown: any = {}
        if (invoice.financial_breakdown) {
          financialBreakdown = typeof invoice.financial_breakdown === 'string'
            ? JSON.parse(invoice.financial_breakdown)
            : invoice.financial_breakdown
        }

        const invoiceAmount = financialBreakdown?.totals?.total_invoice_amount || invoice.amount || 0
        const taxAmount = financialBreakdown?.totals?.tax_total || 0
        const itemTotal = financialBreakdown?.totals?.item_total || 0
        const chargesTotal = financialBreakdown?.totals?.charges_total || 0

        // Calculate holdback amount
        // Holdback percentage typically applies to the total invoice amount (item_total + charges + tax)
        let holdbackAmount = 0
        if (invoice.holdback && invoice.holdback > 0) {
          // Use total invoice amount for holdback calculation
          const totalAmount = parseFloat(String(invoiceAmount)) || 0
          const holdbackPercentage = parseFloat(String(invoice.holdback)) || 0
          holdbackAmount = totalAmount * (holdbackPercentage / 100)
        }

        // Total Invoice Value: sum of all invoices regardless of status or type
        vendorData.totalInvoiceValue += parseFloat(String(invoiceAmount)) || 0

        // Paid to Date: only include invoices with status 'Paid'
        // Check status case-insensitively to handle 'Paid', 'paid', 'PAID', etc.
        const invoiceStatus = String(invoice.status || '').trim()
        const isPaid = invoiceStatus.toLowerCase() === 'paid'
        if (isPaid) {
          vendorData.paidToDate += parseFloat(String(invoiceAmount)) || 0
        }

        // Holdback: total holdback amount for all invoices
        vendorData.holdback += holdbackAmount

        // Tax: sum of tax totals from all invoices
        vendorData.tax += parseFloat(String(taxAmount)) || 0
      })
    }

    // Convert map to array and calculate totals
    const vendorDataArray = Array.from(vendorDataMap.values())
      .filter(v => v.poAmount > 0 || v.changeOrderAmount > 0 || v.totalInvoiceValue > 0 || v.paidToDate > 0)
      .sort((a, b) => a.vendorName.localeCompare(b.vendorName))

    // Calculate grand totals
    const totals = vendorDataArray.reduce((acc, vendor) => {
      acc.poAmount += vendor.poAmount
      acc.changeOrderAmount += vendor.changeOrderAmount
      acc.totalInvoiceValue += vendor.totalInvoiceValue
      acc.billedByVendor += vendor.billedByVendor
      acc.holdback += vendor.holdback
      acc.tax += vendor.tax
      acc.balance += vendor.balance
      acc.paidToDate += vendor.paidToDate
      acc.apBalance += vendor.apBalance
      return acc
    }, {
      poAmount: 0,
      changeOrderAmount: 0,
      totalInvoiceValue: 0,
      billedByVendor: 0,
      holdback: 0,
      tax: 0,
      balance: 0,
      paidToDate: 0,
      apBalance: 0
    })

    return {
      project: {
        projectName: project.project_name,
        projectId: project.project_id
      },
      vendors: vendorDataArray,
      totals
    }
  } catch (error: any) {
    console.error('Vendor Accounts Payable Summary Report Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Failed to generate report'
    })
  }
})

