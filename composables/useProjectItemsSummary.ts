import { ref, readonly } from 'vue'

export interface ProjectItemsSummaryItem {
  corporation_name: string
  project_name: string
  cost_code_uuid?: string | null
  cost_code_number?: string
  cost_code_name?: string
  cost_code_label: string
  division_name?: string
  vendor_name: string
  vendor_uuid?: string | null
  sequence: string
  sequence_uuid?: string | null
  item_type_uuid?: string | null
  item_type_label: string
  item_uuid?: string | null
  item_name: string
  description: string
  location: string
  location_uuid?: string | null
  unit_price?: number
  unit_uuid?: string | null
  unit_label?: string
  budget_qty: number
  po_qty: number
  pending_qty: number
  status: 'Pending' | 'Partial' | 'Complete'
}

export interface ProjectItemsSummaryData {
  items: ProjectItemsSummaryItem[]
}

export const useProjectItemsSummary = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const data = ref<ProjectItemsSummaryData | null>(null)

  const fetchProjectItemsSummary = async (
    corporationUuid: string,
    projectUuid: string,
    vendorUuid?: string,
    location?: string
  ): Promise<ProjectItemsSummaryData | null> => {
    if (!corporationUuid || !projectUuid) {
      error.value = 'Corporation and project are required'
      data.value = null
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { apiFetch } = useApiClient()
      const response: any = await apiFetch('/api/project-items-summary', {
        method: 'GET',
        query: {
          corporation_uuid: corporationUuid,
          project_uuid: projectUuid,
          vendor_uuid: vendorUuid || undefined,
          location: location || undefined
        }
      })

      const items = Array.isArray(response?.data) ? response.data : []

      const result = {
        items
      }
      
      data.value = result
      return result
    } catch (err: any) {
      error.value = err.data?.statusMessage || err.message || 'Failed to fetch project items summary'
      data.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    data: readonly(data),
    fetchProjectItemsSummary
  }
}

