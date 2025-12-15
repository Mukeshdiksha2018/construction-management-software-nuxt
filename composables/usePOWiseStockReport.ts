import { ref, readonly } from 'vue'

export interface POWiseStockReportItem {
  itemCode: string
  itemName: string
  description: string
  vendorSource: string
  costCode: string
  poNumber: string
  poDate: string
  orderedQuantity: number
  receivedQuantity: number
  returnedQuantity: number
  invoiceNumber: string
  invoiceDate: string
  status: string
  unitCost: number
  uom: string
  totalValue: number
}

export interface POWiseStockReportPO {
  uuid: string
  po_number: string
  po_date: string
  vendor_uuid: string | null
  vendor_name: string
  items: POWiseStockReportItem[]
  totals: {
    orderedQuantity: number
    receivedQuantity: number
    returnedQuantity: number
    totalValue: number
  }
}

export interface POWiseStockReportData {
  data: POWiseStockReportPO[]
  totals: {
    orderedQuantity: number
    receivedQuantity: number
    returnedQuantity: number
    totalValue: number
  }
}

export const usePOWiseStockReport = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const generatePOWiseStockReport = async (
    corporationUuid: string,
    projectUuid: string
  ): Promise<POWiseStockReportData | null> => {
    if (!corporationUuid || !projectUuid) {
      error.value = 'Corporation and project are required'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const response = await $fetch('/api/reports/po-wise-stock-report', {
        method: 'GET',
        params: {
          corporation_uuid: corporationUuid,
          project_uuid: projectUuid
        }
      })

      const data = response?.data || []
      const totals = response?.totals || {
        orderedQuantity: 0,
        receivedQuantity: 0,
        returnedQuantity: 0,
        totalValue: 0
      }

      return {
        data,
        totals
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to generate PO-wise stock report'
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    generatePOWiseStockReport
  }
}

