import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const query = getQuery(event)
  const corporationUuid = query.corporation_uuid as string
  const projectUuid = query.project_uuid as string

  if (method !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  if (!corporationUuid || !projectUuid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Corporation UUID and Project UUID are required'
    })
  }

  const supabase = supabaseServer

  try {
    // Step 1: Fetch all purchase order items for the project
    // First, get all POs for the project (excluding labor POs, including Approved, Completed, and Partially_Received statuses)
    const { data: purchaseOrders, error: poError } = await supabase
      .from('purchase_order_forms')
      .select('uuid, po_number, entry_date, vendor_uuid, po_type, po_type_uuid')
      .eq('corporation_uuid', corporationUuid)
      .eq('project_uuid', projectUuid)
      .eq('is_active', true)
      .in('status', ['Approved', 'Completed', 'Partially_Received']) // Include approved, completed, and partially received purchase orders

    if (poError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Error fetching purchase orders: ${poError.message}`
      })
    }

    if (!purchaseOrders || purchaseOrders.length === 0) {
      return { data: [] }
    }

    // Filter out labor purchase orders
    const materialPOs = purchaseOrders.filter((po: any) => {
      const poType = (po.po_type || po.po_type_uuid || '').toUpperCase()
      return poType !== 'LABOR'
    })

    if (materialPOs.length === 0) {
      return { data: [] }
    }

    const poUuids = materialPOs.map(po => po.uuid)
    const poMap = new Map(materialPOs.map(po => [po.uuid, po]))

    // Step 2: Fetch all purchase order items
    const { data: poItems, error: poItemsError } = await supabase
      .from('purchase_order_items_list')
      .select('*')
      .in('purchase_order_uuid', poUuids)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (poItemsError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Error fetching purchase order items: ${poItemsError.message}`
      })
    }

    if (!poItems || poItems.length === 0) {
      return { data: [] }
    }

    // Step 3: Fetch all receipt note items for these PO items
    // Only include items from active receipt notes
    const poItemUuids = poItems.map(item => item.uuid)
    const { data: receiptNoteItems, error: rniError } = await supabase
      .from('receipt_note_items')
      .select(`
        *,
        stock_receipt_notes!inner(
          uuid,
          status,
          entry_date,
          reference_number,
          updated_at,
          is_active
        )
      `)
      .eq('corporation_uuid', corporationUuid)
      .eq('project_uuid', projectUuid)
      .eq('item_type', 'purchase_order')
      .in('item_uuid', poItemUuids)
      .eq('is_active', true)

    if (rniError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Error fetching receipt note items: ${rniError.message}`
      })
    }

    // Step 4: Fetch vendors
    const vendorUuids = Array.from(new Set(purchaseOrders.map(po => po.vendor_uuid).filter(Boolean)))
    let vendors: any[] = []
    if (vendorUuids.length > 0) {
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select('uuid, vendor_name')
        .in('uuid', vendorUuids)

      if (!vendorsError && vendorsData) {
        vendors = vendorsData
      }
    }
    const vendorMap = new Map(vendors.map(v => [v.uuid, v.vendor_name]))

    // Step 5: Fetch cost codes
    const { data: costCodes, error: costCodesError } = await supabase
      .from('cost_code_configurations')
      .select('uuid, cost_code_number, cost_code_name')
      .eq('corporation_uuid', corporationUuid)

    const costCodeMap = new Map()
    if (!costCodesError && costCodes) {
      costCodes.forEach(cc => {
        const label = `${cc.cost_code_number || ''} ${cc.cost_code_name || ''}`.trim()
        costCodeMap.set(cc.uuid, label)
      })
    }

    // Step 6: Fetch cost code preferred items for UOM and item details
    const { data: preferredItems, error: preferredItemsError } = await supabase
      .from('cost_code_preferred_items')
      .select('uuid, item_sequence, unit')
      .in('cost_code_configuration_uuid', Array.from(costCodeMap.keys()))

    const preferredItemsMap = new Map()
    if (!preferredItemsError && preferredItems) {
      preferredItems.forEach(item => {
        preferredItemsMap.set(item.uuid, item)
      })
    }

    // Step 7: Fetch return note items for these PO items
    // Only include items from active return notes
    const { data: returnNoteItems, error: rtnError } = await supabase
      .from('return_note_items')
      .select(`
        *,
        stock_return_notes!inner(
          uuid,
          status,
          entry_date,
          updated_at,
          is_active
        )
      `)
      .eq('corporation_uuid', corporationUuid)
      .eq('project_uuid', projectUuid)
      .eq('item_type', 'purchase_order')
      .in('item_uuid', poItemUuids)
      .eq('is_active', true)

    if (rtnError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Error fetching return note items: ${rtnError.message}`
      })
    }

    // Step 8: Group receipt note items by PO item UUID
    // Filter out items from inactive receipt notes as a safety check
    const receiptItemsByPoItem = new Map<string, any[]>()
    if (receiptNoteItems) {
      receiptNoteItems.forEach((rni: any) => {
        // Filter out items from inactive receipt notes
        const receiptNote = rni.stock_receipt_notes || {}
        if (receiptNote.is_active === false) {
          return // Skip inactive receipt notes
        }
        
        const poItemUuid = rni.item_uuid
        if (!receiptItemsByPoItem.has(poItemUuid)) {
          receiptItemsByPoItem.set(poItemUuid, [])
        }
        receiptItemsByPoItem.get(poItemUuid)!.push(rni)
      })
    }

    // Step 9: Group return note items by PO item UUID
    // Filter out items from inactive return notes as a safety check
    const returnItemsByPoItem = new Map<string, number>()
    if (returnNoteItems) {
      returnNoteItems.forEach((rtni: any) => {
        // Filter out items from inactive return notes
        const returnNote = rtni.stock_return_notes || {}
        if (returnNote.is_active === false) {
          return // Skip inactive return notes
        }
        
        const poItemUuid = rtni.item_uuid
        const returnQuantity = Number(rtni.return_quantity) || 0
        const existingQuantity = returnItemsByPoItem.get(poItemUuid) || 0
        returnItemsByPoItem.set(poItemUuid, existingQuantity + returnQuantity)
      })
    }

    // Step 10: Group PO items by purchase order
    const itemsByPO = new Map<string, any[]>()
    
    for (const poItem of poItems) {
      const poUuid = poItem.purchase_order_uuid
      if (!itemsByPO.has(poUuid)) {
        itemsByPO.set(poUuid, [])
      }
      itemsByPO.get(poUuid)!.push(poItem)
    }

    // Step 11: Build report data grouped by PO
    const reportData: any[] = []

    for (const po of materialPOs) {
      const poItemsForPO = itemsByPO.get(po.uuid) || []
      const vendorName = po.vendor_uuid ? (vendorMap.get(po.vendor_uuid) || 'N/A') : 'N/A'
      
      const items: any[] = []
      let poOrderedQuantity = 0
      let poReceivedQuantity = 0
      let poReturnedQuantity = 0
      let poTotalValue = 0

      for (const poItem of poItemsForPO) {
        const receiptItems = receiptItemsByPoItem.get(poItem.uuid) || []
        const returnedQuantity = returnItemsByPoItem.get(poItem.uuid) || 0
        
        // Get item details from preferred items if available
        const preferredItem = poItem.item_uuid ? preferredItemsMap.get(poItem.item_uuid) : null
        const itemCode = preferredItem?.item_sequence || poItem.model_number || `ITM${String(poItems.indexOf(poItem) + 1).padStart(3, '0')}`
        const itemName = poItem.item_name || poItem.model_number || 'N/A'
        const description = poItem.description || ''
        const costCode = poItem.cost_code_uuid ? (costCodeMap.get(poItem.cost_code_uuid) || '') : ''
        const orderedQuantity = Number(poItem.quantity) || 0
        const unitCost = Number(poItem.unit_price || poItem.po_unit_price) || 0
        const uom = preferredItem?.unit || poItem.unit || poItem.unit_label || ''

        // Aggregate receipt items for this PO item
        let totalReceivedQuantity = 0
        let invoiceNumber = 'NA'
        let invoiceDate = 'NA'
        let status = 'Pending'
        const invoiceNumbers = new Set<string>()
        const invoiceDates = new Set<string>()
        const statuses = new Set<string>()

        for (const receiptItem of receiptItems) {
          const receiptNote = receiptItem.stock_receipt_notes || {}
          const receivedQuantity = Number(receiptItem.received_quantity) || 0
          totalReceivedQuantity += receivedQuantity
          
          const itemStatus = receiptNote.status === 'Received' ? 'Received' : 'In Shipment'
          statuses.add(itemStatus)
          
          const itemInvoiceNumber = receiptNote.reference_number || 'NA'
          if (itemInvoiceNumber !== 'NA') {
            invoiceNumbers.add(itemInvoiceNumber)
          }
          
          const itemInvoiceDate = receiptNote.entry_date ? new Date(receiptNote.entry_date).toISOString().split('T')[0] : 'NA'
          if (itemInvoiceDate !== 'NA') {
            invoiceDates.add(itemInvoiceDate)
          }
        }

        // Determine final status, invoice number, and invoice date
        if (statuses.has('Received')) {
          status = 'Received'
        } else if (statuses.has('In Shipment') || statuses.has('Shipment')) {
          status = 'In Shipment'
        }

        if (invoiceNumbers.size === 1) {
          invoiceNumber = Array.from(invoiceNumbers)[0]
        } else if (invoiceNumbers.size > 1) {
          invoiceNumber = 'Multiple'
        }

        if (invoiceDates.size === 1) {
          invoiceDate = Array.from(invoiceDates)[0]
        } else if (invoiceDates.size > 1) {
          // Use the most recent date
          const sortedDates = Array.from(invoiceDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
          invoiceDate = sortedDates[0]
        }

        const totalValue = totalReceivedQuantity * unitCost

        poOrderedQuantity += orderedQuantity
        poReceivedQuantity += totalReceivedQuantity
        poReturnedQuantity += returnedQuantity
        poTotalValue += totalValue

        items.push({
          itemCode,
          itemName,
          description,
          vendorSource: vendorName,
          costCode,
          poNumber: po.po_number || '',
          poDate: po.entry_date || '',
          orderedQuantity,
          receivedQuantity: totalReceivedQuantity,
          returnedQuantity,
          invoiceNumber,
          invoiceDate,
          status,
          unitCost,
          uom,
          totalValue
        })
      }

      reportData.push({
        uuid: po.uuid,
        po_number: po.po_number || '',
        po_date: po.entry_date || '',
        vendor_uuid: po.vendor_uuid,
        vendor_name: vendorName,
        items,
        totals: {
          orderedQuantity: poOrderedQuantity,
          receivedQuantity: poReceivedQuantity,
          returnedQuantity: poReturnedQuantity,
          totalValue: poTotalValue
        }
      })
    }

    // Step 12: Calculate grand totals
    const grandTotals = reportData.reduce((acc, po) => {
      acc.orderedQuantity += po.totals.orderedQuantity
      acc.receivedQuantity += po.totals.receivedQuantity
      acc.returnedQuantity += po.totals.returnedQuantity
      acc.totalValue += po.totals.totalValue
      return acc
    }, {
      orderedQuantity: 0,
      receivedQuantity: 0,
      returnedQuantity: 0,
      totalValue: 0
    })

    return {
      data: reportData,
      totals: grandTotals
    }
  } catch (error: any) {
    console.error('[PO Wise Stock Report] Error:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Internal server error: ${error.message}`
    })
  }
})

