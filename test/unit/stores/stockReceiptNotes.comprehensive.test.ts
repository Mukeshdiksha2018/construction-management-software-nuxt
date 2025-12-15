import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useStockReceiptNotesStore } from '@/stores/stockReceiptNotes'
import type { StockReceiptNote } from '@/stores/stockReceiptNotes'

// Mock $fetch
global.$fetch = vi.fn()

// Mock IndexedDB helpers
vi.mock('@/utils/indexedDb', () => ({
  dbHelpers: {
    getStockReceiptNotes: vi.fn(),
    saveStockReceiptNotes: vi.fn(),
    addStockReceiptNote: vi.fn(),
    updateStockReceiptNote: vi.fn(),
    deleteStockReceiptNote: vi.fn(),
    clearStockReceiptNotes: vi.fn(),
    needsSync: vi.fn(),
  },
}))

describe('StockReceiptNotes Store - Comprehensive Tests', () => {
  let store: ReturnType<typeof useStockReceiptNotesStore>

  beforeEach(async () => {
    setActivePinia(createPinia())
    store = useStockReceiptNotesStore()
    vi.clearAllMocks()
    const { dbHelpers } = await import('@/utils/indexedDb')
    vi.mocked(dbHelpers.getStockReceiptNotes).mockResolvedValue([])
    vi.mocked(dbHelpers.saveStockReceiptNotes).mockResolvedValue(undefined)
    vi.mocked(dbHelpers.addStockReceiptNote).mockResolvedValue(undefined)
    vi.mocked(dbHelpers.updateStockReceiptNote).mockResolvedValue(undefined)
    vi.mocked(dbHelpers.deleteStockReceiptNote).mockResolvedValue(undefined)
    vi.mocked(dbHelpers.clearStockReceiptNotes).mockResolvedValue(undefined)
    vi.mocked(dbHelpers.needsSync).mockResolvedValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.stockReceiptNotes).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('fetchStockReceiptNotes - IndexedDB Integration', () => {
    const mockReceiptNotes: StockReceiptNote[] = [
      {
        uuid: 'grn-1',
        corporation_uuid: 'corp-1',
        project_uuid: 'proj-1',
        purchase_order_uuid: 'po-1',
        receipt_type: 'purchase_order',
        entry_date: '2024-01-01',
        grn_number: 'GRN-1',
        status: 'Received',
        total_received_amount: 1000,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        uuid: 'grn-2',
        corporation_uuid: 'corp-1',
        project_uuid: 'proj-1',
        purchase_order_uuid: 'po-2',
        receipt_type: 'purchase_order',
        entry_date: '2024-01-02',
        grn_number: 'GRN-2',
        status: 'Shipment',
        total_received_amount: 2000,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
    ]

    it('should fetch receipt notes from API and cache them in IndexedDB', async () => {
      ;(global.$fetch as any).mockResolvedValue({
        data: mockReceiptNotes,
      })
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.getStockReceiptNotes).mockResolvedValue([])
      vi.mocked(dbHelpers.needsSync).mockResolvedValue(true)

      await store.fetchStockReceiptNotes('corp-1', { force: true })

      expect(global.$fetch).toHaveBeenCalledWith(
        '/api/stock-receipt-notes?corporation_uuid=corp-1'
      )
      expect(store.stockReceiptNotes.length).toBeGreaterThanOrEqual(2)
      expect(vi.mocked(dbHelpers.saveStockReceiptNotes)).toHaveBeenCalledWith(
        'corp-1',
        expect.arrayContaining([
          expect.objectContaining({ uuid: 'grn-1' }),
          expect.objectContaining({ uuid: 'grn-2' }),
        ])
      )
    })

    it('should load from IndexedDB cache first if available', async () => {
      const cachedNotes = [mockReceiptNotes[0]]
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.getStockReceiptNotes).mockResolvedValue(cachedNotes)
      vi.mocked(dbHelpers.needsSync).mockResolvedValue(false)
      // Set lastFetchedCorporation to match so it doesn't force fetch
      ;(store as any).lastFetchedCorporation = 'corp-1'
      ;(store as any).hasDataForCorporation = new Set(['corp-1'])

      await store.fetchStockReceiptNotes('corp-1', { useIndexedDB: true })

      // Should load from cache
      expect(store.stockReceiptNotes.length).toBeGreaterThanOrEqual(1)
      // Should not call API if cache is fresh
      expect(global.$fetch).not.toHaveBeenCalled()
    })

    it('should use needsSync to determine if fetch is needed', async () => {
      const { dbHelpers } = await import('@/utils/indexedDb')
      // Return cached notes so hasCached becomes true
      const cachedNotes = [mockReceiptNotes[0]]
      vi.mocked(dbHelpers.getStockReceiptNotes).mockResolvedValue(cachedNotes)
      vi.mocked(dbHelpers.needsSync).mockResolvedValue(false) // Cache is fresh, so no fetch
      ;(global.$fetch as any).mockResolvedValue({ data: [] })
      // Set up store state: has cached data AND last fetched is same corporation
      // This triggers the needsSync check path
      ;(store as any).lastFetchedCorporation = 'corp-1'
      ;(store as any).hasDataForCorporation = new Set(['corp-1'])

      await store.fetchStockReceiptNotes('corp-1', { useIndexedDB: true, force: false })

      // needsSync should be checked when hasCached is true AND lastFetchedCorporation matches
      expect(vi.mocked(dbHelpers.needsSync)).toHaveBeenCalledWith(
        'corp-1',
        'stockReceiptNotes',
        5
      )
    })

    it('should fetch from API if cache needs sync', async () => {
      const cachedNotes = [mockReceiptNotes[0]]
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.getStockReceiptNotes).mockResolvedValue(cachedNotes)
      vi.mocked(dbHelpers.needsSync).mockResolvedValue(true)
      ;(global.$fetch as any).mockResolvedValue({
        data: mockReceiptNotes,
      })
      ;(store as any).lastFetchedCorporation = 'corp-1'
      ;(store as any).hasDataForCorporation = new Set(['corp-1'])

      await store.fetchStockReceiptNotes('corp-1', { useIndexedDB: true })

      // Should fetch from API because cache needs sync
      expect(global.$fetch).toHaveBeenCalled()
      expect(vi.mocked(dbHelpers.saveStockReceiptNotes)).toHaveBeenCalled()
    })

    it('should handle API errors gracefully', async () => {
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.getStockReceiptNotes).mockResolvedValue([])
      ;(global.$fetch as any).mockRejectedValue(new Error('API Error'))

      await store.fetchStockReceiptNotes('corp-1', { force: true })

      expect(store.error).toBeTruthy()
      expect(store.loading).toBe(false)
    })

    it('should normalize GRN numbers when loading from IndexedDB', async () => {
      const cachedNotes = [
        {
          ...mockReceiptNotes[0],
          grn_number: 'GRN-000001',
        },
      ]
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.getStockReceiptNotes).mockResolvedValue(cachedNotes)
      vi.mocked(dbHelpers.needsSync).mockResolvedValue(false)
      ;(store as any).lastFetchedCorporation = 'corp-1'
      ;(store as any).hasDataForCorporation = new Set(['corp-1'])

      await store.fetchStockReceiptNotes('corp-1', { useIndexedDB: true })

      // GRN number should be normalized to simple format
      const note = store.stockReceiptNotes.find((n) => n.uuid === 'grn-1')
      expect(note?.grn_number).toBe('GRN-1')
    })
  })

  describe('createStockReceiptNote - IndexedDB Integration', () => {
    it('should create receipt note and save to IndexedDB', async () => {
      const newNote: Partial<StockReceiptNote> = {
        corporation_uuid: 'corp-1',
        project_uuid: 'proj-1',
        purchase_order_uuid: 'po-1',
        receipt_type: 'purchase_order',
        entry_date: '2024-01-01',
        grn_number: 'GRN-1',
        status: 'Received',
        total_received_amount: 1000,
      }

      ;(global.$fetch as any).mockResolvedValue({
        data: { ...newNote, uuid: 'grn-new', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      })
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.addStockReceiptNote).mockResolvedValue(undefined)

      await store.createStockReceiptNote(newNote as any)

      expect(global.$fetch).toHaveBeenCalled()
      expect(vi.mocked(dbHelpers.addStockReceiptNote)).toHaveBeenCalledWith(
        'corp-1',
        expect.objectContaining({ uuid: 'grn-new' })
      )
    })
  })

  describe('updateStockReceiptNote - IndexedDB Integration', () => {
    it('should update receipt note and save to IndexedDB', async () => {
      const updatedNote = {
        uuid: 'grn-1',
        corporation_uuid: 'corp-1',
        grn_number: 'GRN-1',
        status: 'Received',
        total_received_amount: 1500,
      }

      ;(global.$fetch as any).mockResolvedValue({
        data: { ...updatedNote, updated_at: '2024-01-02T00:00:00Z' },
      })
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.updateStockReceiptNote).mockResolvedValue(undefined)

      await store.updateStockReceiptNote(updatedNote as any)

      expect(global.$fetch).toHaveBeenCalled()
      expect(vi.mocked(dbHelpers.updateStockReceiptNote)).toHaveBeenCalledWith(
        'corp-1',
        expect.objectContaining({ uuid: 'grn-1' })
      )
    })
  })

  describe('deleteStockReceiptNote - IndexedDB Integration', () => {
    it('should delete receipt note via API', async () => {
      ;(global.$fetch as any).mockResolvedValue({ data: true })
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.deleteStockReceiptNote).mockResolvedValue(undefined)

      const result = await store.deleteStockReceiptNote('grn-1')

      expect(global.$fetch).toHaveBeenCalled()
      expect(result).toBe(true)
      // Note: IndexedDB delete is called only if note exists in store
      // The IndexedDB integration is verified in fetch/create/update tests
    })
  })
})

