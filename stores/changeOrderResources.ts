import { defineStore } from 'pinia'
import { reactive, computed } from 'vue'

type Nullable<T> = T | null | undefined

interface OriginalOrderItemsState {
  purchaseOrderUuid: string
  items: any[]
  loading: boolean
  error: string | null
  fetchedAt: number | null
}

interface ChangeOrderProjectState {
  corporationUuid: string
  projectUuid: string
  originalMap: Record<string, OriginalOrderItemsState>
}

const projectKey = (corporationUuid?: Nullable<string>, projectUuid?: Nullable<string>) => {
  const corp = corporationUuid ? String(corporationUuid) : ''
  const project = projectUuid ? String(projectUuid) : ''
  return `${corp}::${project}`
}

const originalKey = (corporationUuid?: Nullable<string>, projectUuid?: Nullable<string>, purchaseOrderUuid?: Nullable<string>) => {
  const base = projectKey(corporationUuid, projectUuid)
  const po = purchaseOrderUuid ? String(purchaseOrderUuid) : ''
  return `${base}::${po}`
}

export const useChangeOrderResourcesStore = defineStore('changeOrderResources', () => {
  const projectResources = reactive<Record<string, ChangeOrderProjectState>>({})

  const getOrCreateProjectState = (corporationUuid: string, projectUuid: string) => {
    const key = projectKey(corporationUuid, projectUuid)
    if (!projectResources[key]) {
      projectResources[key] = {
        corporationUuid,
        projectUuid,
        originalMap: {},
      }
    }
    return projectResources[key]
  }

  const ensureOriginalOrderItems = async ({
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
    const key = originalKey(corporationUuid, projectUuid, purchaseOrderUuid)
    const existing = state.originalMap[key]

    if (existing && existing.items.length > 0 && !force) {
      return existing.items
    }
    if (existing?.loading && !force) {
      return existing.items
    }

    const originalState: OriginalOrderItemsState =
      existing || {
        purchaseOrderUuid,
        items: [],
        loading: false,
        error: null,
        fetchedAt: null,
      }

    originalState.loading = true
    originalState.error = null
    state.originalMap[key] = originalState

    try {
      const { apiFetch } = useApiClient();
      const response: any = await apiFetch('/api/purchase-order-items', {
        method: 'GET',
        query: {
          purchase_order_uuid: purchaseOrderUuid,
        },
      })
      const items = Array.isArray(response?.data) ? response.data : []
      originalState.items = items
      originalState.fetchedAt = Date.now()
    } catch (error: any) {
      console.error('[CO Resources] Failed to fetch original order items', error)
      originalState.items = []
      originalState.error = error?.data?.statusMessage || error?.message || 'Failed to load items'
    } finally {
      originalState.loading = false
      state.originalMap[key] = { ...originalState }
    }

    return state.originalMap[key].items
  }

  const getOriginalItemsState = computed(() => {
    return (corporationUuid?: Nullable<string>, projectUuid?: Nullable<string>, purchaseOrderUuid?: Nullable<string>) => {
      if (!corporationUuid || !projectUuid || !purchaseOrderUuid) return null
      const pr = projectResources[projectKey(corporationUuid, projectUuid)]
      if (!pr) return null
      const key = originalKey(corporationUuid, projectUuid, purchaseOrderUuid)
      return pr.originalMap[key] || null
    }
  })

  const getOriginalItems = computed(() => {
    return (corporationUuid?: Nullable<string>, projectUuid?: Nullable<string>, purchaseOrderUuid?: Nullable<string>) => {
      const state = getOriginalItemsState.value(corporationUuid, projectUuid, purchaseOrderUuid)
      return state?.items ?? []
    }
  })

  const getOriginalItemsLoading = computed(() => {
    return (corporationUuid?: Nullable<string>, projectUuid?: Nullable<string>, purchaseOrderUuid?: Nullable<string>) => {
      const state = getOriginalItemsState.value(corporationUuid, projectUuid, purchaseOrderUuid)
      return state?.loading ?? false
    }
  })

  const getOriginalItemsError = computed(() => {
    return (corporationUuid?: Nullable<string>, projectUuid?: Nullable<string>, purchaseOrderUuid?: Nullable<string>) => {
      const state = getOriginalItemsState.value(corporationUuid, projectUuid, purchaseOrderUuid)
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
    ensureOriginalOrderItems,
    getOriginalItemsState,
    getOriginalItems,
    getOriginalItemsLoading,
    getOriginalItemsError,
    clearProject,
    clear,
  }
})


