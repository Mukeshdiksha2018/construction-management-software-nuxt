import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFreightStore } from '../../../stores/freightGlobal'

// Mock $fetch
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Mock IndexedDB helpers
vi.mock('../../../utils/indexedDb', () => ({
  dbHelpers: {
    getFreight: vi.fn(async () => []),
    saveFreight: vi.fn(async () => undefined),
    addFreight: vi.fn(async () => undefined),
    updateFreight: vi.fn(async () => undefined),
    deleteFreight: vi.fn(async () => undefined),
  }
}))

const { dbHelpers } = await import('../../../utils/indexedDb')

describe('Freight Global Store', () => {
  let store: ReturnType<typeof useFreightStore>

  beforeEach(() => {
    ;(global as any).process = { server: false, client: true, env: { NODE_ENV: 'test' } }
    setActivePinia(createPinia())
    store = useFreightStore()
    store.freight = [] as any
    store.loading = false
    store.error = null
    vi.clearAllMocks()
  })

  afterEach(() => vi.restoreAllMocks())

  describe('initial state', () => {
    it('is correct', () => {
      expect(store.freight).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('fetchFreight', () => {
    const list = [
      { id: 1, uuid: 'f-1', ship_via: 'Carrier A', description: 'Desc', active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
      { id: 2, uuid: 'f-2', ship_via: 'Carrier B', description: 'Desc', active: false, created_at: '2025-01-02', updated_at: '2025-01-02' }
    ]

    it('fetches successfully (force API path)', async () => {
      mockFetch.mockResolvedValueOnce({ success: true, data: list })
      await store.fetchFreight(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/freight', { method: 'GET' })
      expect(store.freight).toEqual(list)
      expect(store.error).toBe(null)
      expect(dbHelpers.saveFreight).toHaveBeenCalledWith(list)
    })

    it('hydrates from IndexedDB cache when available', async () => {
      (dbHelpers.getFreight as any).mockResolvedValueOnce(list)
      await store.fetchFreight(false)
      expect(mockFetch).not.toHaveBeenCalled()
      expect(store.freight).toEqual(list)
    })

    it('handles fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fetch err'))
      await expect(store.fetchFreight(true)).rejects.toThrow('fetch err')
      expect(store.error).toBe('fetch err')
    })
  })

  describe('createFreight', () => {
    const payload = { ship_via: 'Carrier C', description: 'New', active: true }
    const created = { id: 3, uuid: 'f-3', ...payload, created_at: '2025-01-03', updated_at: '2025-01-03' }

    it('creates successfully', async () => {
      mockFetch.mockResolvedValueOnce({ success: true, data: created })
      const res = await store.createFreight(payload)
      expect(mockFetch).toHaveBeenCalledWith('/api/freight', { method: 'POST', body: payload })
      expect(res).toEqual(created)
      expect(store.freight[0]).toEqual(created)
      expect(dbHelpers.addFreight).toHaveBeenCalledWith(created)
    })

    it('handles create error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('create err'))
      await expect(store.createFreight(payload)).rejects.toThrow('create err')
      expect(store.error).toBe('create err')
    })
  })

  describe('updateFreight', () => {
    const existing = { id: 1, uuid: 'f-1', ship_via: 'Old', description: 'D', active: true, created_at: '2025-01-01', updated_at: '2025-01-01' }
    const update = { ship_via: 'New', description: 'ND', active: true }
    const updated = { ...existing, ...update, updated_at: '2025-01-04' }

    it('updates successfully', async () => {
      store.freight = [existing]
      mockFetch.mockResolvedValueOnce({ success: true, data: updated })
      const res = await store.updateFreight(existing.uuid, update)
      expect(mockFetch).toHaveBeenCalledWith(`/api/freight/${existing.uuid}`, { method: 'PUT', body: update })
      expect(res).toEqual(updated)
      expect(store.freight[0]).toEqual(updated)
      expect(dbHelpers.updateFreight).toHaveBeenCalledWith(updated)
    })

    it('handles update error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('update err'))
      await expect(store.updateFreight('f-1', update)).rejects.toThrow('update err')
      expect(store.error).toBe('update err')
    })
  })

  describe('deleteFreight', () => {
    it('deletes successfully', async () => {
      const row = { id: 1, uuid: 'f-1', ship_via: 'X', description: null, active: true, created_at: '2025-01-01', updated_at: '2025-01-01' }
      store.freight = [row]
      mockFetch.mockResolvedValueOnce({ success: true, message: 'Freight deleted successfully' })
      const res = await store.deleteFreight('f-1')
      expect(mockFetch).toHaveBeenCalledWith('/api/freight/f-1', { method: 'DELETE' })
      expect(res).toEqual({ success: true, message: 'Freight deleted successfully' })
      expect(store.freight).toEqual([])
      expect(dbHelpers.deleteFreight).toHaveBeenCalledWith('f-1')
    })

    it('handles delete error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('delete err'))
      await expect(store.deleteFreight('f-1')).rejects.toThrow('delete err')
      expect(store.error).toBe('delete err')
    })
  })
})
