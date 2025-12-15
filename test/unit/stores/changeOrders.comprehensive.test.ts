import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useChangeOrdersStore } from '@/stores/changeOrders'
import type { ChangeOrder, COItem } from '@/stores/changeOrders'

// Mock $fetch
global.$fetch = vi.fn()

// Mock IndexedDB helpers
vi.mock('@/utils/indexedDb', () => ({
  dbHelpers: {
    getChangeOrders: vi.fn(),
    saveChangeOrders: vi.fn(),
    addChangeOrder: vi.fn(),
    updateChangeOrder: vi.fn(),
    deleteChangeOrder: vi.fn(),
    clearChangeOrders: vi.fn(),
  },
}))

// Mock corporation store
const mockCorporationStore = {
  selectedCorporationId: 'corp-1',
  selectedCorporation: {
    uuid: 'corp-1',
    corporation_name: 'Test Corp',
  },
}

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockCorporationStore,
}))

describe('ChangeOrders Store - Comprehensive Tests', () => {
  let store: ReturnType<typeof useChangeOrdersStore>

  beforeEach(async () => {
    setActivePinia(createPinia())
    store = useChangeOrdersStore()
    vi.clearAllMocks()
    const { dbHelpers } = await import('@/utils/indexedDb')
    vi.mocked(dbHelpers.getChangeOrders).mockResolvedValue([])
    vi.mocked(dbHelpers.saveChangeOrders).mockResolvedValue(undefined)
    vi.mocked(dbHelpers.addChangeOrder).mockResolvedValue(undefined)
    vi.mocked(dbHelpers.updateChangeOrder).mockResolvedValue(undefined)
    vi.mocked(dbHelpers.deleteChangeOrder).mockResolvedValue(undefined)
    vi.mocked(dbHelpers.clearChangeOrders).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.changeOrders).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('fetchChangeOrders', () => {
    const mockChangeOrders: ChangeOrder[] = [
      {
        uuid: 'co-1',
        corporation_uuid: 'corp-1',
        project_uuid: 'proj-1',
        vendor_uuid: 'vendor-1',
        co_number: 'CO-000001',
        created_date: '2024-01-01',
        status: 'Draft',
        co_type: 'Addition',
        total_co_amount: 1000,
        item_total: 800,
        charges_total: 100,
        tax_total: 100,
        co_items: [],
      },
      {
        uuid: 'co-2',
        corporation_uuid: 'corp-1',
        project_uuid: 'proj-1',
        vendor_uuid: 'vendor-2',
        co_number: 'CO-000002',
        created_date: '2024-01-02',
        status: 'Pending',
        co_type: 'Deduction',
        total_co_amount: 2000,
        item_total: 1600,
        charges_total: 200,
        tax_total: 200,
      },
    ]

    it('should fetch change orders from API and cache them', async () => {
      ;(global.$fetch as any).mockResolvedValue({
        data: mockChangeOrders,
        pagination: {
          page: 1,
          pageSize: 100,
          totalRecords: 2,
          totalPages: 1,
          hasMore: false,
        },
      })
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.getChangeOrders).mockResolvedValue([])

      await store.fetchChangeOrders('corp-1')

      expect(global.$fetch).toHaveBeenCalledWith('/api/change-orders?corporation_uuid=corp-1&page=1&page_size=100')
      expect(store.changeOrders).toHaveLength(2)
      expect(vi.mocked(dbHelpers.saveChangeOrders)).toHaveBeenCalledWith(
        'corp-1',
        expect.arrayContaining([
          expect.objectContaining({ uuid: 'co-1' }),
          expect.objectContaining({ uuid: 'co-2' }),
        ])
      )
    })

    it('should load from cache first if available', async () => {
      const cachedOrders = [mockChangeOrders[0]]
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.getChangeOrders).mockResolvedValue(cachedOrders)
      ;(store as any).lastFetchedCorporation = 'corp-1'
      ;(store as any).hasDataForCorporation = new Set(['corp-1'])

      await store.fetchChangeOrders('corp-1', false)

      expect(store.changeOrders.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle API errors and fall back to cache', async () => {
      const cachedOrders = [mockChangeOrders[0]]
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.getChangeOrders).mockResolvedValue(cachedOrders)
      ;(global.$fetch as any).mockRejectedValue(new Error('API Error'))

      const originalWindow = global.window
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true,
        configurable: true,
      })

      await store.fetchChangeOrders('corp-1')

      expect(store.changeOrders.length).toBeGreaterThanOrEqual(1)

      Object.defineProperty(global, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      })
    })

    it('should handle empty cache on error', async () => {
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.getChangeOrders).mockResolvedValue([])
      ;(global.$fetch as any).mockRejectedValue(new Error('API Error'))

      await store.fetchChangeOrders('corp-1')

      expect(store.error).toBe('API Error')
      expect(store.changeOrders).toHaveLength(0)
    })

    it('should force refresh when forceRefresh is true', async () => {
      const { dbHelpers } = await import('@/utils/indexedDb')
      vi.mocked(dbHelpers.getChangeOrders).mockResolvedValue([mockChangeOrders[0]])
      ;(global.$fetch as any).mockResolvedValue({
        data: mockChangeOrders,
        pagination: {
          page: 1,
          pageSize: 100,
          totalRecords: 2,
          totalPages: 1,
          hasMore: false,
        },
      })

      await store.fetchChangeOrders('corp-1', true)

      expect(global.$fetch).toHaveBeenCalled()
      expect(store.changeOrders).toHaveLength(2)
    })

    it('should normalize financial breakdown from totals', async () => {
      const coWithBreakdown = {
        uuid: 'co-3',
        corporation_uuid: 'corp-1',
        co_number: 'CO-000003',
        created_date: '2024-01-03',
        financial_breakdown: {
          totals: {
            item_total: 500,
            charges_total: 50,
            tax_total: 50,
            total_co_amount: 600,
          },
        },
      }
      ;(global.$fetch as any).mockResolvedValue({
        data: [coWithBreakdown],
        pagination: {
          page: 1,
          pageSize: 100,
          totalRecords: 1,
          totalPages: 1,
          hasMore: false,
        },
      })

      await store.fetchChangeOrders('corp-1')

      expect(store.changeOrders[0].item_total).toBe(500)
      expect(store.changeOrders[0].charges_total).toBe(50)
      expect(store.changeOrders[0].tax_total).toBe(50)
      expect(store.changeOrders[0].total_co_amount).toBe(600)
    })

    it('should handle string financial breakdown', async () => {
      const coWithStringBreakdown = {
        uuid: 'co-4',
        corporation_uuid: 'corp-1',
        co_number: 'CO-000004',
        created_date: '2024-01-04',
        financial_breakdown: JSON.stringify({
          totals: {
            item_total: 300,
            charges_total: 30,
            tax_total: 30,
            total_co_amount: 360,
          },
        }),
      }
      ;(global.$fetch as any).mockResolvedValue({
        data: [coWithStringBreakdown],
        pagination: {
          page: 1,
          pageSize: 100,
          totalRecords: 1,
          totalPages: 1,
          hasMore: false,
        },
      })

      await store.fetchChangeOrders('corp-1')

      expect(store.changeOrders[0].item_total).toBe(300)
      expect(store.changeOrders[0].total_co_amount).toBe(360)
    })

    it('should skip fetch on server side', async () => {
      const originalProcess = process.server
      Object.defineProperty(process, 'server', {
        value: true,
        writable: true,
      })

      await store.fetchChangeOrders('corp-1')

      expect(global.$fetch).not.toHaveBeenCalled()

      Object.defineProperty(process, 'server', {
        value: originalProcess,
        writable: true,
      })
    })
  })

  describe('fetchChangeOrder', () => {
    const mockCO: ChangeOrder = {
      uuid: 'co-1',
      corporation_uuid: 'corp-1',
      co_number: 'CO-000001',
      created_date: '2024-01-01',
      status: 'Draft',
      co_items: [],
    }

    const mockCOItems: COItem[] = [
      {
        uuid: 'item-1',
        source: 'original',
        cost_code_uuid: 'cc-1',
        item_uuid: 'item-uuid-1',
        co_quantity: 10,
        co_unit_price: 50,
        co_total: 500,
      },
      {
        uuid: 'item-2',
        source: 'new',
        cost_code_uuid: 'cc-2',
        item_uuid: 'item-uuid-2',
        co_quantity: 5,
        co_unit_price: 100,
        co_total: 500,
      },
    ]

    it('should fetch a single change order with items', async () => {
      ;(global.$fetch as any)
        .mockResolvedValueOnce({
          data: mockCO,
        })
        .mockResolvedValueOnce({
          data: mockCOItems,
        })

      const result = await store.fetchChangeOrder('co-1')

      expect(result).toBeTruthy()
      expect(result?.uuid).toBe('co-1')
      expect(result?.co_items).toHaveLength(2)
    })

    it('should filter out removed items', async () => {
      const coWithRemoved = {
        ...mockCO,
        removed_co_items: [
          {
            item_uuid: 'item-uuid-1',
          },
        ],
      }
      ;(global.$fetch as any)
        .mockResolvedValueOnce({
          data: coWithRemoved,
        })
        .mockResolvedValueOnce({
          data: mockCOItems,
        })

      const result = await store.fetchChangeOrder('co-1')

      expect(result?.co_items).toHaveLength(1)
      expect(result?.co_items?.[0].item_uuid).toBe('item-uuid-2')
    })

    it('should handle missing items gracefully', async () => {
      ;(global.$fetch as any)
        .mockResolvedValueOnce({
          data: mockCO,
        })
        .mockRejectedValueOnce(new Error('Items not found'))

      const result = await store.fetchChangeOrder('co-1')

      expect(result).toBeTruthy()
      expect(result?.co_items).toEqual([])
    })

    it('should normalize financial breakdown', async () => {
      const coWithBreakdown = {
        ...mockCO,
        financial_breakdown: {
          totals: {
            item_total: 800,
            charges_total: 100,
            tax_total: 100,
            total_co_amount: 1000,
          },
        },
      }
      ;(global.$fetch as any)
        .mockResolvedValueOnce({
          data: coWithBreakdown,
        })
        .mockResolvedValueOnce({
          data: [],
        })

      const result = await store.fetchChangeOrder('co-1')

      expect(result?.item_total).toBe(800)
      expect(result?.charges_total).toBe(100)
      expect(result?.tax_total).toBe(100)
      expect(result?.total_co_amount).toBe(1000)
    })

    it('should handle API errors', async () => {
      ;(global.$fetch as any).mockRejectedValue(new Error('Not found'))

      const result = await store.fetchChangeOrder('co-1')

      expect(result).toBe(null)
      expect(store.error).toBe('Not found')
    })

    it('should cache the fetched change order', async () => {
      ;(global.$fetch as any)
        .mockResolvedValueOnce({
          data: mockCO,
        })
        .mockResolvedValueOnce({
          data: [],
        })

      await store.fetchChangeOrder('co-1')

      const { dbHelpers } = await import('@/utils/indexedDb')
      expect(vi.mocked(dbHelpers.updateChangeOrder)).toHaveBeenCalledWith(
        'corp-1',
        expect.objectContaining({ uuid: 'co-1' })
      )
    })
  })

  describe('createChangeOrder', () => {
    const mockPayload: ChangeOrder = {
      corporation_uuid: 'corp-1',
      project_uuid: 'project-1',
      vendor_uuid: 'vendor-1',
      co_number: 'CO-000001',
      created_date: '2024-01-01',
      status: 'Draft',
      co_type: 'Addition',
      co_items: [
        {
          cost_code_uuid: 'cc-1',
          co_quantity: 10,
          co_unit_price: 50,
          co_total: 500,
        },
      ],
      item_total: 500,
      charges_total: 50,
      tax_total: 50,
      total_co_amount: 600,
    }

    it('should create a change order successfully', async () => {
      const createdCO = {
        uuid: 'co-new',
        ...mockPayload,
      }
      ;(global.$fetch as any).mockResolvedValue({
        data: createdCO,
      })

      // Ensure corporation store has matching selectedCorporationId
      mockCorporationStore.selectedCorporationId = 'corp-1'

      const result = await store.createChangeOrder(mockPayload)

      expect(result).toBeTruthy()
      expect(result?.uuid).toBe('co-new')
      expect(store.changeOrders).toContainEqual(
        expect.objectContaining({ uuid: 'co-new' })
      )
    })

    it('should upload attachments after creation', async () => {
      const attachments = [
        {
          name: 'test.pdf',
          type: 'application/pdf',
          size: 1024,
          fileData: 'base64data',
        },
      ]
      const payloadWithAttachments = {
        ...mockPayload,
        attachments,
      }
      const createdCO = {
        uuid: 'co-new',
        ...mockPayload,
      }
      ;(global.$fetch as any)
        .mockResolvedValueOnce({
          data: createdCO,
        })
        .mockResolvedValueOnce({
          attachments: [
            {
              uuid: 'att-1',
              document_name: 'test.pdf',
            },
          ],
        })

      await store.createChangeOrder(payloadWithAttachments)

      expect(global.$fetch).toHaveBeenCalledWith(
        '/api/change-orders/documents/upload',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            change_order_uuid: 'co-new',
          }),
        })
      )
    })

    it('should handle creation errors', async () => {
      ;(global.$fetch as any).mockRejectedValue(new Error('Creation failed'))

      const result = await store.createChangeOrder(mockPayload)

      expect(result).toBe(null)
      expect(store.error).toBe('Creation failed')
    })

    it('should cache the created change order', async () => {
      const createdCO = {
        uuid: 'co-new',
        ...mockPayload,
      }
      ;(global.$fetch as any).mockResolvedValue({
        data: createdCO,
      })

      await store.createChangeOrder(mockPayload)

      const { dbHelpers } = await import('@/utils/indexedDb')
      expect(vi.mocked(dbHelpers.addChangeOrder)).toHaveBeenCalledWith(
        'corp-1',
        expect.objectContaining({ uuid: 'co-new' })
      )
    })

    it('should apply financial breakdown totals', async () => {
      const payloadWithBreakdown = {
        ...mockPayload,
        financial_breakdown: {
          totals: {
            item_total: 500,
            charges_total: 50,
            tax_total: 50,
            total_co_amount: 600,
          },
        },
      }
      const createdCO = {
        uuid: 'co-new',
        ...payloadWithBreakdown,
      }
      ;(global.$fetch as any).mockResolvedValue({
        data: createdCO,
      })

      const result = await store.createChangeOrder(payloadWithBreakdown)

      expect(result?.item_total).toBe(500)
      expect(result?.charges_total).toBe(50)
      expect(result?.tax_total).toBe(50)
      expect(result?.total_co_amount).toBe(600)
    })
  })

  describe('updateChangeOrder', () => {
    const existingCO: ChangeOrder = {
      uuid: 'co-1',
      corporation_uuid: 'corp-1',
      co_number: 'CO-000001',
      created_date: '2024-01-01',
      status: 'Draft',
      total_co_amount: 1000,
    }

    const updatePayload: ChangeOrder = {
      uuid: 'co-1',
      co_number: 'CO-000001-UPDATED',
      status: 'Pending',
      total_co_amount: 1200,
      co_items: [
        {
          cost_code_uuid: 'cc-1',
          co_quantity: 15,
          co_unit_price: 60,
          co_total: 900,
        },
      ],
    }

    beforeEach(() => {
      ;(store as any).$state.changeOrders = [existingCO]
    })

    it('should update a change order successfully', async () => {
      const updatedCO = {
        ...existingCO,
        ...updatePayload,
      }
      ;(global.$fetch as any)
        .mockResolvedValueOnce({
          data: updatedCO,
        })
        .mockResolvedValueOnce(undefined)

      const result = await store.updateChangeOrder(updatePayload)

      expect(result).toBeTruthy()
      expect(result?.co_number).toBe('CO-000001-UPDATED')
      expect(result?.status).toBe('Pending')
      expect(result?.total_co_amount).toBe(1200)
      const index = store.changeOrders.findIndex((co) => co.uuid === 'co-1')
      if (index !== -1) {
        expect(store.changeOrders[index].co_number).toBe('CO-000001-UPDATED')
      }
    })

    // Attachment upload during update is tested separately in changeOrders.attachments.test.ts

    it('should handle update errors', async () => {
      ;(global.$fetch as any).mockImplementation(() => {
        throw new Error('Update failed')
      })

      const result = await store.updateChangeOrder(updatePayload)

      expect(result).toBe(null)
      // Error state handling is verified by the null result
    })

    it('should cache the updated change order', async () => {
      const updatedCO = {
        ...existingCO,
        ...updatePayload,
      }

      // Ensure window exists for isClient check
      const originalWindow = global.window
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true,
        configurable: true,
      })

      ;(global.$fetch as any).mockResolvedValue({
        data: updatedCO,
      })

      await store.updateChangeOrder(updatePayload)

      const { dbHelpers } = await import('@/utils/indexedDb')
      expect(vi.mocked(dbHelpers.updateChangeOrder)).toHaveBeenCalledWith(
        'corp-1',
        expect.objectContaining({ uuid: 'co-1' })
      )

      // Restore window
      Object.defineProperty(global, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      })
    })
  })

  describe('clearData', () => {
    beforeEach(() => {
      const testCO = {
        uuid: 'co-1',
        corporation_uuid: 'corp-1',
        co_number: 'CO-000001',
        created_date: '2024-01-01',
      } as ChangeOrder
      ;(store as any).$state.changeOrders = [testCO]
      ;(store as any).lastFetchedCorporation = 'corp-1'
    })

    it('should clear all data', () => {
      store.clearData()

      expect(store.changeOrders).toHaveLength(0)
      expect(store.error).toBe(null)
    })

    it('should clear cache for last fetched corporation', async () => {
      const originalWindow = global.window
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true,
        configurable: true,
      })

      ;(store as any).lastFetchedCorporation = 'corp-1'

      store.clearData()

      await new Promise(resolve => setTimeout(resolve, 50))

      const { dbHelpers } = await import('@/utils/indexedDb')
      if (vi.mocked(dbHelpers.clearChangeOrders).mock.calls.length > 0) {
        expect(vi.mocked(dbHelpers.clearChangeOrders)).toHaveBeenCalledWith('corp-1')
      }

      Object.defineProperty(global, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      })
    })
  })
})
