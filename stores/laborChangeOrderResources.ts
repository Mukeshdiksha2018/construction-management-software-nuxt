import { defineStore } from 'pinia'
import { reactive, computed } from 'vue'

type Nullable<T> = T | null | undefined

interface LaborPOItemsState {
  purchaseOrderUuid: string
  items: any[]
  loading: boolean
  error: string | null
  fetchedAt: number | null
}

interface LaborChangeOrderProjectState {
  corporationUuid: string
  projectUuid: string
  laborPOMap: Record<string, LaborPOItemsState>
}

const projectKey = (corporationUuid?: Nullable<string>, projectUuid?: Nullable<string>) => {
  const corp = corporationUuid ? String(corporationUuid) : ''
  const project = projectUuid ? String(projectUuid) : ''
  return `${corp}::${project}`
}

const laborPOKey = (corporationUuid?: Nullable<string>, projectUuid?: Nullable<string>, purchaseOrderUuid?: Nullable<string>) => {
  const base = projectKey(corporationUuid, projectUuid)
  const po = purchaseOrderUuid ? String(purchaseOrderUuid) : ''
  return `${base}::${po}`
}

export const useLaborChangeOrderResourcesStore = defineStore('laborChangeOrderResources', () => {
  const projectResources = reactive<Record<string, LaborChangeOrderProjectState>>({})

  const getOrCreateProjectState = (corporationUuid: string, projectUuid: string) => {
    const key = projectKey(corporationUuid, projectUuid)
    if (!projectResources[key]) {
      projectResources[key] = {
        corporationUuid,
        projectUuid,
        laborPOMap: {},
      }
    }
    return projectResources[key]
  }

  const ensureLaborPOItems = async ({
    corporationUuid,
    projectUuid,
    purchaseOrderUuid,
    force = false,
  }: {
    corporationUuid: string
    projectUuid: string
    purchaseOrderUuid: string
    force?: boolean
  }) => {
    if (!purchaseOrderUuid) return []
    const state = getOrCreateProjectState(corporationUuid, projectUuid)
    const key = laborPOKey(corporationUuid, projectUuid, purchaseOrderUuid)
    const existing = state.laborPOMap[key]

    if (existing && existing.items.length > 0 && !force) {
      return existing.items
    }
    if (existing?.loading && !force) {
      return existing.items
    }

    const laborPOState: LaborPOItemsState =
      existing || {
        purchaseOrderUuid,
        items: [],
        loading: false,
        error: null,
        fetchedAt: null,
      }

    laborPOState.loading = true
    laborPOState.error = null
    state.laborPOMap[key] = laborPOState

    try {
      const { apiFetch } = useApiClient();
      const response: any = await apiFetch('/api/labor-purchase-order-items', {
        method: 'GET',
        query: {
          purchase_order_uuid: purchaseOrderUuid,
        },
      })
      const items = Array.isArray(response?.data) ? response.data : []
      laborPOState.items = items
      laborPOState.fetchedAt = Date.now()
    } catch (error: any) {
      console.error('[Labor CO Resources] Failed to fetch labor PO items', error)
      laborPOState.items = []
      laborPOState.error = error?.data?.statusMessage || error?.message || 'Failed to load labor items'
    } finally {
      laborPOState.loading = false
      state.laborPOMap[key] = { ...laborPOState }
    }

    return state.laborPOMap[key].items
  }

  const getLaborPOItemsState = computed(() => {
    return (corporationUuid?: Nullable<string>, projectUuid?: Nullable<string>, purchaseOrderUuid?: Nullable<string>) => {
      if (!corporationUuid || !projectUuid || !purchaseOrderUuid) return null
      const pr = projectResources[projectKey(corporationUuid, projectUuid)]
      if (!pr) return null
      const key = laborPOKey(corporationUuid, projectUuid, purchaseOrderUuid)
      return pr.laborPOMap[key] || null
    }
  })

  const getLaborPOItems = computed(() => {
    return (corporationUuid?: Nullable<string>, projectUuid?: Nullable<string>, purchaseOrderUuid?: Nullable<string>) => {
      const state = getLaborPOItemsState.value(corporationUuid, projectUuid, purchaseOrderUuid)
      return state?.items ?? []
    }
  })

  const getLaborPOItemsLoading = computed(() => {
    return (corporationUuid?: Nullable<string>, projectUuid?: Nullable<string>, purchaseOrderUuid?: Nullable<string>) => {
      const state = getLaborPOItemsState.value(corporationUuid, projectUuid, purchaseOrderUuid)
      return state?.loading ?? false
    }
  })

  const getLaborPOItemsError = computed(() => {
    return (corporationUuid?: Nullable<string>, projectUuid?: Nullable<string>, purchaseOrderUuid?: Nullable<string>) => {
      const state = getLaborPOItemsState.value(corporationUuid, projectUuid, purchaseOrderUuid)
      return state?.error ?? null
    }
  })

  const clearProject = (corporationUuid?: Nullable<string>, projectUuid?: Nullable<string>) => {
    const key = projectKey(corporationUuid, projectUuid)
    if (projectResources[key]) {
      delete projectResources[key]
    }
  }

  const clear = () => {
    Object.keys(projectResources).forEach((k) => delete projectResources[k])
  }

  return {
    ensureLaborPOItems,
    getLaborPOItemsState,
    getLaborPOItems,
    getLaborPOItemsLoading,
    getLaborPOItemsError,
    clearProject,
    clear,
  }
})

