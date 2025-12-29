import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useStockReturnNotesStore } from '@/stores/stockReturnNotes'
import type { StockReturnNote } from '@/stores/stockReturnNotes'

// Mock $fetch
global.$fetch = vi.fn()

// Mock IndexedDB helpers
vi.mock('@/utils/indexedDb', () => ({
  dbHelpers: {
    getStockReturnNotes: vi.fn(),
    saveStockReturnNotes: vi.fn(),
    addStockReturnNote: vi.fn(),
    updateStockReturnNote: vi.fn(),
    deleteStockReturnNote: vi.fn(),
    clearStockReturnNotes: vi.fn(),
    needsSync: vi.fn(),
  },
}))

describe('StockReturnNotes Store - Comprehensive Tests', () => {
  let store: ReturnType<typeof useStockReturnNotesStore>

  beforeEach(async () => {
    setActivePinia(createPinia())
    store = useStockReturnNotesStore()
    vi.clearAllMocks()
    const { dbHelpers } = await import('@/utils/indexedDb')
    vi.mocked(dbHelpers.getStockReturnNotes).mockResolvedValue([])
    vi.mocked(dbHelpers.saveStockReturnNotes).mockResolvedValue(undefined)
    vi.mocked(dbHelpers.addStockReturnNote).mockResolvedValue(undefined)
    vi.mocked(dbHelpers.updateStockReturnNote).mockResolvedValue(undefined)
    vi.mocked(dbHelpers.deleteStockReturnNote).mockResolvedValue(undefined)
    vi.mocked(dbHelpers.clearStockReturnNotes).mockResolvedValue(undefined)
    vi.mocked(dbHelpers.needsSync).mockResolvedValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.stockReturnNotes).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('fetchStockReturnNotes - IndexedDB Integration', () => {
    const mockReturnNotes: StockReturnNote[] = [
      {
        uuid: 'rtn-1',
        corporation_uuid: 'corp-1',
        project_uuid: 'proj-1',
        purchase_order_uuid: 'po-1',
        change_order_uuid: null,
        return_type: 'purchase_order',
        entry_date: '2024-01-01',
        return_number: 'RTN-1',
        status: 'Returned',
        total_return_amount: 500,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        uuid: 'rtn-2',
        corporation_uuid: 'corp-1',
        project_uuid: 'proj-1',
        purchase_order_uuid: null,
        change_order_uuid: 'co-1',
        return_type: 'change_order',
        entry_date: '2024-01-02',
        return_number: 'RTN-2',
        status: 'Waiting',
        total_return_amount: 300,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
    ]

    it('should fetch return notes from API and cache them in IndexedDB', async () => {
      ;(global.$fetch as any).mockResolvedValue({
        data: mockReturnNotes,
        pagination: {
          page: 1,
          pageSize: 100,
          totalRecords: 2,
          totalPages: 1,
          hasMore: false,
        },
      })
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.getStockReturnNotes).mockResolvedValue([])
      vi.mocked(dbHelpers.needsSync).mockResolvedValue(true)

      await store.fetchStockReturnNotes('corp-1', true, 1, 100)

      expect(global.$fetch).toHaveBeenCalledWith(
        '/api/stock-return-notes?corporation_uuid=corp-1&page=1&page_size=100'
      )
      expect(store.stockReturnNotes.length).toBeGreaterThanOrEqual(2)
      expect(vi.mocked(dbHelpers.saveStockReturnNotes)).toHaveBeenCalledWith(
        'corp-1',
        expect.arrayContaining([
          expect.objectContaining({ uuid: 'rtn-1' }),
          expect.objectContaining({ uuid: 'rtn-2' }),
        ])
      )
    })

    it('should load from IndexedDB cache first if available', async () => {
      const cachedNotes = [mockReturnNotes[0]]
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.getStockReturnNotes).mockResolvedValue(cachedNotes)
      vi.mocked(dbHelpers.needsSync).mockResolvedValue(false)
      // Set lastFetchedCorporation to match so it doesn't force fetch
      ;(store as any).lastFetchedCorporation = 'corp-1'
      ;(store as any).hasDataForCorporation = new Set(['corp-1'])

      await store.fetchStockReturnNotes('corp-1', false, 1, 100)

      // Should load from cache
      expect(store.stockReturnNotes.length).toBeGreaterThanOrEqual(1)
      // Should not call API if cache is fresh
      expect(global.$fetch).not.toHaveBeenCalled()
    })

    it('should use needsSync to determine if fetch is needed', async () => {
      const { dbHelpers } = await import('@/utils/indexedDb')
      // Return cached notes so hasCached becomes true
      const cachedNotes = [mockReturnNotes[0]]
      vi.mocked(dbHelpers.getStockReturnNotes).mockResolvedValue(cachedNotes)
      vi.mocked(dbHelpers.needsSync).mockResolvedValue(false) // Cache is fresh, so no fetch
      ;(global.$fetch as any).mockResolvedValue({ data: [] })
      // Set up store state: has cached data AND last fetched is same corporation
      // This triggers the needsSync check path
      ;(store as any).lastFetchedCorporation = 'corp-1'
      ;(store as any).hasDataForCorporation = new Set(['corp-1'])

      await store.fetchStockReturnNotes('corp-1', false, 1, 100)

      // needsSync should be checked when hasCached is true AND lastFetchedCorporation matches
      expect(vi.mocked(dbHelpers.needsSync)).toHaveBeenCalledWith(
        'corp-1',
        'stockReturnNotes',
        5
      )
    })

    it('should fetch from API if cache needs sync', async () => {
      const cachedNotes = [mockReturnNotes[0]]
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.getStockReturnNotes).mockResolvedValue(cachedNotes)
      vi.mocked(dbHelpers.needsSync).mockResolvedValue(true)
      ;(global.$fetch as any).mockResolvedValue({
        data: mockReturnNotes,
        pagination: {
          page: 1,
          pageSize: 100,
          totalRecords: 2,
          totalPages: 1,
          hasMore: false,
        },
      })
      ;(store as any).lastFetchedCorporation = 'corp-1'
      ;(store as any).hasDataForCorporation = new Set(['corp-1'])

      await store.fetchStockReturnNotes('corp-1', false, 1, 100)

      // Should fetch from API because cache needs sync
      expect(global.$fetch).toHaveBeenCalled()
      expect(vi.mocked(dbHelpers.saveStockReturnNotes)).toHaveBeenCalled()
    })

    it('should handle API errors gracefully', async () => {
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.getStockReturnNotes).mockResolvedValue([])
      ;(global.$fetch as any).mockRejectedValue(new Error('API Error'))

      await store.fetchStockReturnNotes('corp-1', true, 1, 100)

      expect(store.error).toBeTruthy()
      expect(store.loading).toBe(false)
    })

    it('should normalize return numbers when loading from IndexedDB', async () => {
      const cachedNotes = [
        {
          ...mockReturnNotes[0],
          return_number: 'RTN-000001',
        },
      ]
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.getStockReturnNotes).mockResolvedValue(cachedNotes)
      vi.mocked(dbHelpers.needsSync).mockResolvedValue(false)
      ;(store as any).lastFetchedCorporation = 'corp-1'
      ;(store as any).hasDataForCorporation = new Set(['corp-1'])

      await store.fetchStockReturnNotes('corp-1', false, 1, 100)

      // Return number should be normalized to simple format
      const note = store.stockReturnNotes.find((n) => n.uuid === 'rtn-1')
      expect(note?.return_number).toBe('RTN-1')
    })

    it('should use IndexedDB by default', async () => {
      const cachedNotes = [mockReturnNotes[0]]
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.getStockReturnNotes).mockResolvedValue(cachedNotes)
      vi.mocked(dbHelpers.needsSync).mockResolvedValue(false)
      ;(store as any).lastFetchedCorporation = 'corp-1'
      ;(store as any).hasDataForCorporation = new Set(['corp-1'])

      // Don't specify force, should default to false and use IndexedDB
      await store.fetchStockReturnNotes('corp-1', false, 1, 100)

      // Should try to load from IndexedDB
      expect(vi.mocked(dbHelpers.getStockReturnNotes)).toHaveBeenCalledWith('corp-1')
    })
  })

  describe('createStockReturnNote - IndexedDB Integration', () => {
    it('should create return note and save to IndexedDB', async () => {
      const newNote: Partial<StockReturnNote> = {
        corporation_uuid: 'corp-1',
        project_uuid: 'proj-1',
        purchase_order_uuid: 'po-1',
        return_type: 'purchase_order',
        entry_date: '2024-01-01',
        return_number: 'RTN-1',
        status: 'Waiting',
        total_return_amount: 500,
      }

      ;(global.$fetch as any).mockResolvedValue({
        data: { ...newNote, uuid: 'rtn-new', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      })
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.addStockReturnNote).mockResolvedValue(undefined)

      await store.createStockReturnNote(newNote as any)

      expect(global.$fetch).toHaveBeenCalled()
      expect(vi.mocked(dbHelpers.addStockReturnNote)).toHaveBeenCalledWith(
        'corp-1',
        expect.objectContaining({ uuid: 'rtn-new' })
      )
    })
  })

  describe('updateStockReturnNote - IndexedDB Integration', () => {
    it('should update return note and save to IndexedDB', async () => {
      const updatedNote = {
        uuid: 'rtn-1',
        corporation_uuid: 'corp-1',
        return_number: 'RTN-1',
        status: 'Returned',
        total_return_amount: 600,
      }

      ;(global.$fetch as any).mockResolvedValue({
        data: { ...updatedNote, updated_at: '2024-01-02T00:00:00Z' },
      })
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.updateStockReturnNote).mockResolvedValue(undefined)

      await store.updateStockReturnNote(updatedNote as any)

      expect(global.$fetch).toHaveBeenCalled()
      expect(vi.mocked(dbHelpers.updateStockReturnNote)).toHaveBeenCalledWith(
        'corp-1',
        expect.objectContaining({ uuid: 'rtn-1' })
      )
    })
  })

  describe('deleteStockReturnNote - IndexedDB Integration', () => {
    it('should delete return note via API', async () => {
      ;(global.$fetch as any).mockResolvedValue({ data: true })
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.deleteStockReturnNote).mockResolvedValue(undefined)

      const result = await store.deleteStockReturnNote('rtn-1')

      expect(global.$fetch).toHaveBeenCalled()
      expect(result).toBe(true)
      // Note: IndexedDB delete is called only if note exists in store
      // The IndexedDB integration is verified in fetch/create/update tests
    })
  })
})

