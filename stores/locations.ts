import { defineStore } from 'pinia'

export interface LocationRecord {
  uuid: string
  location_name: string
  location_code?: string | null
  description?: string | null
  address_line1: string
  address_line2?: string | null
  city: string
  state: string
  zip: string
  country: string
  phone?: string | null
  email?: string | null
  active: boolean
  created_at?: string
  updated_at?: string
}

export interface CreateLocationData extends Omit<LocationRecord, 'uuid' | 'created_at' | 'updated_at'> {}
export interface UpdateLocationData extends Partial<CreateLocationData> {}

export const useLocationsStore = defineStore('locations', {
  state: () => ({
    locations: [] as LocationRecord[],
    loading: false as boolean,
    error: null as string | null,
  }),
  getters: {
    getAll: (state) => state.locations,
    getActive: (state) => state.locations.filter(l => l.active),
    getByUuid: (state) => (uuid: string) => state.locations.find(l => l.uuid === uuid),
  },
  actions: {
    async fetchLocations(forceFromAPI: boolean = false) {
      this.loading = true
      this.error = null
      try {
        let data: LocationRecord[] = []
        if (forceFromAPI) {
          const { apiFetch } = useApiClient();
          const response: any = await apiFetch('/api/location', { method: 'GET' })
          data = response?.data || response || []
        } else {
          const { dbHelpers } = await import('@/utils/indexedDb')
          // Try IndexedDB first
          if (dbHelpers.getLocations) {
            data = await (dbHelpers as any).getLocations()
          }
          if (!data || data.length === 0) {
            const { apiFetch } = useApiClient();
          const response: any = await apiFetch('/api/location', { method: 'GET' })
            data = response?.data || response || []
            if (Array.isArray(data) && (dbHelpers as any).saveLocations) {
              await (dbHelpers as any).saveLocations(data)
            }
          }
        }
        this.locations = Array.isArray(data) ? data : []
      } catch (e: any) {
        this.error = e?.message || 'Failed to fetch locations'
      } finally {
        this.loading = false
      }
    },
    async createLocation(payload: CreateLocationData) {
      this.error = null
      const { apiFetch } = useApiClient();
      const response: any = await apiFetch('/api/location', { method: 'POST', body: payload })
      const created: LocationRecord = response?.data || response
      if (created) {
        this.locations.unshift(created)
        const { dbHelpers } = await import('@/utils/indexedDb')
        if ((dbHelpers as any).addLocation) {
          await (dbHelpers as any).addLocation(created)
        }
      }
      return created
    },
    async updateLocation(uuid: string, payload: UpdateLocationData) {
      this.error = null
      const { apiFetch } = useApiClient();
      const response: any = await apiFetch(`/api/location/${uuid}`, { method: 'PUT', body: payload })
      const updated: LocationRecord = response?.data || response
      if (updated) {
        const idx = this.locations.findIndex(l => l.uuid === uuid)
        if (idx !== -1) this.locations[idx] = updated
        const { dbHelpers } = await import('@/utils/indexedDb')
        if ((dbHelpers as any).updateLocation) {
          await (dbHelpers as any).updateLocation(updated)
        }
      }
      return updated
    },
    async deleteLocation(uuid: string) {
      this.error = null
      const { apiFetch } = useApiClient();
      await apiFetch(`/api/location/${uuid}`, { method: 'DELETE' })
      this.locations = this.locations.filter(l => l.uuid !== uuid)
      const { dbHelpers } = await import('@/utils/indexedDb')
      if ((dbHelpers as any).deleteLocation) {
        await (dbHelpers as any).deleteLocation(uuid)
      }
    },
    clear() {
      this.locations = []
      this.error = null
      this.loading = false
    }
  }
})


