import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useShipViaStore } from '../../../stores/freight'

// Mock $fetch
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Mock IndexedDB helpers (no-op implementations)
vi.mock('../../../utils/indexedDb', () => ({
  dbHelpers: {
    getShipVia: vi.fn(async () => []),
    saveShipVia: vi.fn(async () => undefined),
    addShipVia: vi.fn(async () => undefined),
    updateShipVia: vi.fn(async () => undefined),
    deleteShipVia: vi.fn(async () => undefined),
  }
}))

const { dbHelpers } = await import('../../../utils/indexedDb')

describe('Ship Via Store', () => {
  let store: ReturnType<typeof useShipViaStore>

  beforeEach(() => {
    ;(global as any).process = { server: false, client: true, env: { NODE_ENV: 'test' } }
    setActivePinia(createPinia())
    store = useShipViaStore()
    store.shipVia = [] as any
    store.loading = false
    store.error = null
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.shipVia).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('fetchShipVia', () => {
    const mockList = [
      { id: 1, uuid: 'sv-1', ship_via: 'FedEx', description: 'Express', active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
      { id: 2, uuid: 'sv-2', ship_via: 'UPS', description: 'Ground', active: false, created_at: '2024-01-02', updated_at: '2024-01-02' },
    ]

    it('should fetch ship via successfully (force API)', async () => {
      mockFetch.mockResolvedValueOnce({ success: true, data: mockList })
      await store.fetchShipVia(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/ship-via', { method: 'GET' })
      expect(store.shipVia).toEqual(mockList)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
      expect(dbHelpers.saveShipVia).toHaveBeenCalledWith(mockList)
    })

    it('should hydrate from IndexedDB when available', async () => {
      (dbHelpers.getShipVia as any).mockResolvedValueOnce(mockList)
      await store.fetchShipVia(false)
      expect(mockFetch).not.toHaveBeenCalled()
      expect(store.shipVia).toEqual(mockList)
    })

    it('should handle fetch error', async () => {
      const errorMessage = 'Failed to fetch shipVia'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))
      await expect(store.fetchShipVia(true)).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.loading).toBe(false)
    })
  })

  describe('createShipVia', () => {
    const payload = { ship_via: 'DHL', description: 'Intl', active: true }
    const created = { id: 3, uuid: 'sv-3', ...payload, created_at: '2024-01-03', updated_at: '2024-01-03' }

    it('should create successfully', async () => {
      mockFetch.mockResolvedValueOnce({ success: true, data: created })
      const result = await store.createShipVia(payload)
      expect(mockFetch).toHaveBeenCalledWith('/api/ship-via', { method: 'POST', body: payload })
      expect(result).toEqual(created)
      expect(store.shipVia[0]).toEqual(created)
      expect(dbHelpers.addShipVia).toHaveBeenCalledWith(created)
    })

    it('should handle create error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('create err'))
      await expect(store.createShipVia(payload)).rejects.toThrow('create err')
      expect(store.error).toBe('create err')
    })
  })

  describe('updateShipVia', () => {
    const existing = { id: 1, uuid: 'sv-1', ship_via: 'FedEx', description: 'Express', active: true, created_at: '2024-01-01', updated_at: '2024-01-01' }
    const update = { ship_via: 'FedEx Priority', description: 'Priority', active: true }
    const updated = { ...existing, ...update, updated_at: '2024-01-04' }

    it('should update successfully', async () => {
      store.shipVia = [existing]
      mockFetch.mockResolvedValueOnce({ success: true, data: updated })
      const result = await store.updateShipVia(existing.uuid, update)
      expect(mockFetch).toHaveBeenCalledWith(`/api/ship-via/${existing.uuid}`, { method: 'PUT', body: update })
      expect(result).toEqual(updated)
      expect(store.shipVia[0]).toEqual(updated)
      expect(dbHelpers.updateShipVia).toHaveBeenCalledWith(updated)
    })

    it('should handle update error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('update err'))
      await expect(store.updateShipVia('sv-1', update)).rejects.toThrow('update err')
      expect(store.error).toBe('update err')
    })
  })

  describe('deleteShipVia', () => {
    it('should delete successfully', async () => {
      const existing = { id: 1, uuid: 'sv-1', ship_via: 'FedEx', description: 'Express', active: true, created_at: '2024-01-01', updated_at: '2024-01-01' }
      store.shipVia = [existing]
      mockFetch.mockResolvedValueOnce({ success: true, message: 'Ship Via deleted successfully' })
      const res = await store.deleteShipVia('sv-1')
      expect(mockFetch).toHaveBeenCalledWith('/api/ship-via/sv-1', { method: 'DELETE' })
      expect(res).toEqual({ success: true, message: 'Ship Via deleted successfully' })
      expect(store.shipVia).toEqual([])
      expect(dbHelpers.deleteShipVia).toHaveBeenCalledWith('sv-1')
    })

    it('should handle delete error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('delete err'))
      await expect(store.deleteShipVia('sv-1')).rejects.toThrow('delete err')
      expect(store.error).toBe('delete err')
    })
  })
})
