import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface LaborChangeOrderItem {
  uuid?: string
  id?: number
  created_at?: string
  updated_at?: string
  corporation_uuid: string
  project_uuid?: string | null
  purchase_order_uuid: string
  change_order_uuid: string
  order_index: number
  cost_code_uuid?: string | null
  cost_code_number?: string | null
  cost_code_name?: string | null
  cost_code_label?: string | null
  division_name?: string | null
  po_amount: number | null
  co_amount: number | null
  metadata?: Record<string, any>
  is_active?: boolean
}

export const useLaborChangeOrderItemsStore = defineStore('laborChangeOrderItems', () => {
  const items = ref<LaborChangeOrderItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const getItemsByChangeOrder = computed(() => {
    return (changeOrderUuid: string) => {
      return items.value.filter(item => item.change_order_uuid === changeOrderUuid && item.is_active !== false)
    }
  })

  const fetchItems = async (changeOrderUuid: string) => {
    loading.value = true
    error.value = null

    try {
      const response: any = await $fetch('/api/labor-change-order-items', {
        method: 'GET',
        query: {
          change_order_uuid: changeOrderUuid,
        },
      })

      const fetchedItems = Array.isArray(response?.data) ? response.data : []
      // Update existing items or add new ones
      fetchedItems.forEach((item: LaborChangeOrderItem) => {
        const existingIndex = items.value.findIndex(i => i.uuid === item.uuid)
        if (existingIndex >= 0) {
          items.value[existingIndex] = item
        } else {
          items.value.push(item)
        }
      })

      // Remove items that are no longer in the response
      items.value = items.value.filter(item => 
        item.change_order_uuid !== changeOrderUuid || 
        fetchedItems.some((fi: LaborChangeOrderItem) => fi.uuid === item.uuid)
      )

      return fetchedItems
    } catch (err: any) {
      console.error('[LaborChangeOrderItems] Fetch error:', err)
      error.value = err?.data?.statusMessage || err?.message || 'Failed to fetch labor change order items'
      return []
    } finally {
      loading.value = false
    }
  }

  const fetchItemsByPurchaseOrder = async (purchaseOrderUuid: string) => {
    loading.value = true
    error.value = null

    try {
      const response: any = await $fetch('/api/labor-change-order-items', {
        method: 'GET',
        query: {
          purchase_order_uuid: purchaseOrderUuid,
        },
      })

      return Array.isArray(response?.data) ? response.data : []
    } catch (err: any) {
      console.error('[LaborChangeOrderItems] Fetch by PO error:', err)
      error.value = err?.data?.statusMessage || err?.message || 'Failed to fetch labor change order items'
      return []
    } finally {
      loading.value = false
    }
  }

  const saveItems = async (changeOrderUuid: string, purchaseOrderUuid: string, itemsToSave: LaborChangeOrderItem[]) => {
    loading.value = true
    error.value = null

    try {
      const response: any = await $fetch('/api/labor-change-order-items', {
        method: 'POST',
        body: {
          change_order_uuid: changeOrderUuid,
          purchase_order_uuid: purchaseOrderUuid,
          items: itemsToSave,
        },
      })

      // Refetch items after save
      await fetchItems(changeOrderUuid)

      return response
    } catch (err: any) {
      console.error('[LaborChangeOrderItems] Save error:', err)
      error.value = err?.data?.statusMessage || err?.message || 'Failed to save labor change order items'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteItems = async (changeOrderUuid: string) => {
    loading.value = true
    error.value = null

    try {
      await $fetch('/api/labor-change-order-items', {
        method: 'DELETE',
        query: {
          change_order_uuid: changeOrderUuid,
        },
      })

      // Remove items from store
      items.value = items.value.filter(item => item.change_order_uuid !== changeOrderUuid)
    } catch (err: any) {
      console.error('[LaborChangeOrderItems] Delete error:', err)
      error.value = err?.data?.statusMessage || err?.message || 'Failed to delete labor change order items'
      throw err
    } finally {
      loading.value = false
    }
  }

  const clear = () => {
    items.value = []
    error.value = null
  }

  return {
    items,
    loading,
    error,
    getItemsByChangeOrder,
    fetchItems,
    fetchItemsByPurchaseOrder,
    saveItems,
    deleteItems,
    clear,
  }
})

