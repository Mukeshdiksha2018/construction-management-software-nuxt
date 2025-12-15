import { defineStore } from 'pinia'

export interface Freight {
  id: number
  uuid: string
  ship_via: string
  description: string | null
  active: boolean
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
}

export interface CreateFreightData {
  ship_via: string
  description?: string | null
  active?: boolean
}

export interface UpdateFreightData {
  ship_via: string
  description?: string | null
  active: boolean
}

export const useFreightStore = defineStore('freightGlobal', {
  state: () => ({
    freight: [] as Freight[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    getAllFreight: (state) => state.freight,
    getActiveFreight: (state) => state.freight.filter(f => f.active),
    getFreightByUuid: (state) => (uuid: string) => state.freight.find(f => f.uuid === uuid),
  },

  actions: {
    async fetchFreight(forceFromAPI: boolean = false) {
      this.loading = true
      this.error = null
      try {
        let data: Freight[] = []
        if (!forceFromAPI) {
          const { dbHelpers } = await import('@/utils/indexedDb')
          data = await dbHelpers.getFreight()
          if (!data || data.length === 0) {
            const response = await $fetch('/api/freight', { method: 'GET' })
            data = response?.data || response
            if (Array.isArray(data)) await dbHelpers.saveFreight(data)
          }
        } else {
          const response = await $fetch('/api/freight', { method: 'GET' })
          data = response?.data || response
          const { dbHelpers } = await import('@/utils/indexedDb')
          if (Array.isArray(data)) await dbHelpers.saveFreight(data)
        }
        this.freight = Array.isArray(data) ? data : []
      } catch (e: any) {
        this.error = e.message || 'Failed to fetch freight'
        throw e
      } finally {
        this.loading = false
      }
    },

    async createFreight(payload: CreateFreightData) {
      this.loading = true
      this.error = null
      try {
        const response = await $fetch('/api/freight', { method: 'POST', body: payload })
        const data = response?.data || response
        if (data) {
          this.freight.push(data)
          const { dbHelpers } = await import('@/utils/indexedDb')
          await dbHelpers.addFreight(data)
        }
        return data
      } catch (e: any) {
        this.error = e.message || 'Failed to create freight'
        throw e
      } finally {
        this.loading = false
      }
    },

    async updateFreight(uuid: string, payload: UpdateFreightData) {
      this.loading = true
      this.error = null
      try {
        const response = await $fetch(`/api/freight/${uuid}`, { method: 'PUT', body: payload })
        const data = response?.data || response
        if (data) {
          const idx = this.freight.findIndex(f => f.uuid === uuid)
          if (idx !== -1) this.freight[idx] = data
          const { dbHelpers } = await import('@/utils/indexedDb')
          await dbHelpers.updateFreight(data)
        }
        return data
      } catch (e: any) {
        this.error = e.message || 'Failed to update freight'
        throw e
      } finally {
        this.loading = false
      }
    },

    async deleteFreight(uuid: string) {
      this.loading = true
      this.error = null
      try {
        const response = await $fetch(`/api/freight/${uuid}`, { method: 'DELETE' })
        this.freight = this.freight.filter(f => f.uuid !== uuid)
        const { dbHelpers } = await import('@/utils/indexedDb')
        await dbHelpers.deleteFreight(uuid)
        return response
      } catch (e: any) {
        this.error = e.message || 'Failed to delete freight'
        throw e
      } finally {
        this.loading = false
      }
    },

    clearFreight() {
      this.freight = []
    }
  }
})
