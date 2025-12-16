import { defineStore } from 'pinia'

export interface VendorSummary {
  vendor_name: string
  contact_name: string
  email: string
  phone: string
  total_amount: number
  current: number
  days31_60: number
  days61_90: number
  over90: number
  bills: BillSummary[]
}

export interface BillSummary {
  bill_id: number
  bill_date: string
  due_date: string
  amount: number
  description: string
  status: string
}

export interface AgingSummary {
  total_amount: number
  current: number
  days31_60: number
  days61_90: number
  over90: number
}

export interface APAgingReport {
  summary: AgingSummary
  vendors: VendorSummary[]
  generated_at: string
}

export const useAPAgingStore = defineStore('apAging', () => {
  const report = ref<APAgingReport | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Fetch AP aging report
  const fetchAPAgingReport = async (corporationUuid: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { apiFetch } = useApiClient();
      const { data } = await apiFetch(`/api/reports/ap-aging/${corporationUuid}`)
      report.value = data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch AP aging report'
      console.error('Error fetching AP aging report:', err)
    } finally {
      loading.value = false
    }
  }

  // Get total amount by age bucket
  const getTotalByAge = (ageBucket: keyof AgingSummary): number => {
    return report.value?.summary[ageBucket] || 0
  }

  // Get percentage of total for each age bucket
  const getPercentageByAge = (ageBucket: keyof AgingSummary): number => {
    const total = report.value?.summary.total_amount || 0
    if (total === 0) return 0
    return (getTotalByAge(ageBucket) / total) * 100
  }

  // Get vendors sorted by total amount
  const getVendorsByTotal = (): VendorSummary[] => {
    if (!report.value) return []
    return [...report.value.vendors].sort((a, b) => b.total_amount - a.total_amount)
  }

  // Get vendors with overdue amounts (31+ days)
  const getOverdueVendors = (): VendorSummary[] => {
    if (!report.value) return []
    return report.value.vendors.filter(vendor => 
      vendor.days31_60 > 0 || vendor.days61_90 > 0 || vendor.over90 > 0
    )
  }

  // Get critical vendors (over 90 days overdue)
  const getCriticalVendors = (): VendorSummary[] => {
    if (!report.value) return []
    return report.value.vendors.filter(vendor => vendor.over90 > 0)
  }

  // Get aging distribution for a specific vendor
  const getVendorAgingDistribution = (vendorName: string) => {
    const vendor = report.value?.vendors.find(v => v.vendor_name === vendorName)
    if (!vendor) return null

    const total = vendor.total_amount
    if (total === 0) return null

    return {
      current: {
        amount: vendor.current,
        percentage: (vendor.current / total) * 100
      },
      days31_60: {
        amount: vendor.days31_60,
        percentage: (vendor.days31_60 / total) * 100
      },
      days61_90: {
        amount: vendor.days61_90,
        percentage: (vendor.days61_90 / total) * 100
      },
      over90: {
        amount: vendor.over90,
        percentage: (vendor.over90 / total) * 100
      }
    }
  }

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`
  }

  // Get report generation date
  const getReportDate = (): string | null => {
    return report.value?.generated_at || null
  }

  // Check if report is recent (within last 24 hours)
  const isReportRecent = (): boolean => {
    if (!report.value?.generated_at) return false
    const reportDate = new Date(report.value.generated_at)
    const now = new Date()
    const hoursDiff = (now.getTime() - reportDate.getTime()) / (1000 * 60 * 60)
    return hoursDiff < 24
  }

  return {
    report: readonly(report),
    loading: readonly(loading),
    error: readonly(error),
    fetchAPAgingReport,
    getTotalByAge,
    getPercentageByAge,
    getVendorsByTotal,
    getOverdueVendors,
    getCriticalVendors,
    getVendorAgingDistribution,
    formatCurrency,
    formatPercentage,
    getReportDate,
    isReportRecent
  }
})
