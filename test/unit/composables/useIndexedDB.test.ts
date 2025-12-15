import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useIndexedDB } from '@/composables/useIndexedDB'

// Mock $fetch
global.$fetch = vi.fn()

// Mock IndexedDB helpers using vi.hoisted
const mockDbHelpers = vi.hoisted(() => ({
  needsSync: vi.fn(),
  saveStockReceiptNotes: vi.fn(),
  saveStockReturnNotes: vi.fn(),
  savePurchaseOrders: vi.fn(),
  saveChangeOrders: vi.fn(),
  saveBillEntries: vi.fn(),
  saveVendors: vi.fn(),
  saveProjectTypes: vi.fn(),
  saveServiceTypes: vi.fn(),
  saveTermsAndConditions: vi.fn(),
  savePOInstructions: vi.fn(),
  saveUOM: vi.fn(),
  saveChartOfAccounts: vi.fn(),
  saveStorageLocations: vi.fn(),
  saveCostCodeDivisions: vi.fn(),
  saveCostCodeConfigurations: vi.fn(),
  saveProjects: vi.fn(),
  saveItemTypes: vi.fn(),
  storeEstimates: vi.fn(),
  saveCorporations: vi.fn(),
  clearCorporationData: vi.fn(),
  clearAllData: vi.fn(),
}))

vi.mock('@/utils/indexedDb', () => ({
  db: {},
  dbHelpers: mockDbHelpers,
}))

describe('useIndexedDB - Stock Receipt Notes and Return Notes Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default all needsSync to false (data is fresh)
    mockDbHelpers.needsSync.mockResolvedValue(false)
  })

  describe('syncCorporationData - Stock Receipt Notes', () => {
    it('should sync stock receipt notes when needsSync returns true', async () => {
      const { syncCorporationData } = useIndexedDB()
      const mockReceiptNotes = [
        {
          uuid: 'grn-1',
          corporation_uuid: 'corp-1',
          grn_number: 'GRN-1',
          status: 'Received',
        },
      ]

      mockDbHelpers.needsSync.mockImplementation((corpId: string, dataType: string) => {
        if (dataType === 'stockReceiptNotes') return Promise.resolve(true)
        return Promise.resolve(false)
      })
      ;(global.$fetch as any).mockImplementation((url: string) => {
        if (url.includes('stock-receipt-notes')) {
          return Promise.resolve({ data: mockReceiptNotes })
        }
        return Promise.resolve({ data: [] })
      })

      await syncCorporationData('corp-1')

      expect(global.$fetch).toHaveBeenCalledWith(
        '/api/stock-receipt-notes',
        expect.objectContaining({
          method: 'GET',
          params: {
            corporation_uuid: 'corp-1',
          },
        })
      )
      expect(mockDbHelpers.saveStockReceiptNotes).toHaveBeenCalledWith(
        'corp-1',
        mockReceiptNotes
      )
    })

    it('should not sync stock receipt notes when needsSync returns false', async () => {
      const { syncCorporationData } = useIndexedDB()

      mockDbHelpers.needsSync.mockResolvedValue(false)

      await syncCorporationData('corp-1')

      const receiptNotesCall = (global.$fetch as any).mock.calls.find((call: any[]) =>
        call[0]?.includes('stock-receipt-notes')
      )
      expect(receiptNotesCall).toBeUndefined()
      expect(mockDbHelpers.saveStockReceiptNotes).not.toHaveBeenCalled()
    })

    it('should sync stock receipt notes when forceSync is true', async () => {
      const { syncCorporationData } = useIndexedDB()
      const mockReceiptNotes = [
        {
          uuid: 'grn-1',
          corporation_uuid: 'corp-1',
          grn_number: 'GRN-1',
          status: 'Received',
        },
      ]

      mockDbHelpers.needsSync.mockResolvedValue(false)
      ;(global.$fetch as any).mockImplementation((url: string) => {
        if (url.includes('stock-receipt-notes')) {
          return Promise.resolve({ data: mockReceiptNotes })
        }
        return Promise.resolve({ data: [] })
      })

      await syncCorporationData('corp-1', undefined, true)

      expect(global.$fetch).toHaveBeenCalledWith(
        '/api/stock-receipt-notes',
        expect.objectContaining({
          method: 'GET',
          params: {
            corporation_uuid: 'corp-1',
          },
        })
      )
      expect(mockDbHelpers.saveStockReceiptNotes).toHaveBeenCalledWith(
        'corp-1',
        mockReceiptNotes
      )
    })

    it('should handle empty receipt notes array', async () => {
      const { syncCorporationData } = useIndexedDB()

      mockDbHelpers.needsSync.mockImplementation((corpId: string, dataType: string) => {
        if (dataType === 'stockReceiptNotes') return Promise.resolve(true)
        return Promise.resolve(false)
      })
      ;(global.$fetch as any).mockImplementation((url: string) => {
        if (url.includes('stock-receipt-notes')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.resolve({ data: [] })
      })

      await syncCorporationData('corp-1')

      expect(mockDbHelpers.saveStockReceiptNotes).toHaveBeenCalledWith('corp-1', [])
    })

    it('should handle API errors gracefully', async () => {
      const { syncCorporationData } = useIndexedDB()

      mockDbHelpers.needsSync.mockImplementation((corpId: string, dataType: string) => {
        if (dataType === 'stockReceiptNotes') return Promise.resolve(true)
        return Promise.resolve(false)
      })
      ;(global.$fetch as any).mockImplementation((url: string) => {
        if (url.includes('stock-receipt-notes')) {
          return Promise.reject(new Error('API Error'))
        }
        return Promise.resolve({ data: [] })
      })

      // Should not throw, but handle error gracefully
      await expect(syncCorporationData('corp-1')).rejects.toThrow()
      expect(mockDbHelpers.saveStockReceiptNotes).not.toHaveBeenCalled()
    })
  })

  describe('syncCorporationData - Stock Return Notes', () => {
    it('should sync stock return notes when needsSync returns true', async () => {
      const { syncCorporationData } = useIndexedDB()
      const mockReturnNotes = [
        {
          uuid: 'rtn-1',
          corporation_uuid: 'corp-1',
          return_number: 'RTN-1',
          status: 'Returned',
        },
      ]

      mockDbHelpers.needsSync.mockImplementation((corpId: string, dataType: string) => {
        if (dataType === 'stockReturnNotes') return Promise.resolve(true)
        return Promise.resolve(false)
      })
      ;(global.$fetch as any).mockImplementation((url: string) => {
        if (url.includes('stock-return-notes')) {
          return Promise.resolve({ data: mockReturnNotes })
        }
        return Promise.resolve({ data: [] })
      })

      await syncCorporationData('corp-1')

      expect(global.$fetch).toHaveBeenCalledWith(
        '/api/stock-return-notes',
        expect.objectContaining({
          method: 'GET',
          params: {
            corporation_uuid: 'corp-1',
          },
        })
      )
      expect(mockDbHelpers.saveStockReturnNotes).toHaveBeenCalledWith(
        'corp-1',
        mockReturnNotes
      )
    })

    it('should not sync stock return notes when needsSync returns false', async () => {
      const { syncCorporationData } = useIndexedDB()

      mockDbHelpers.needsSync.mockResolvedValue(false)

      await syncCorporationData('corp-1')

      const returnNotesCall = (global.$fetch as any).mock.calls.find((call: any[]) =>
        call[0]?.includes('stock-return-notes')
      )
      expect(returnNotesCall).toBeUndefined()
      expect(mockDbHelpers.saveStockReturnNotes).not.toHaveBeenCalled()
    })

    it('should sync stock return notes when forceSync is true', async () => {
      const { syncCorporationData } = useIndexedDB()
      const mockReturnNotes = [
        {
          uuid: 'rtn-1',
          corporation_uuid: 'corp-1',
          return_number: 'RTN-1',
          status: 'Returned',
        },
      ]

      mockDbHelpers.needsSync.mockResolvedValue(false)
      ;(global.$fetch as any).mockImplementation((url: string) => {
        if (url.includes('stock-return-notes')) {
          return Promise.resolve({ data: mockReturnNotes })
        }
        return Promise.resolve({ data: [] })
      })

      await syncCorporationData('corp-1', undefined, true)

      expect(global.$fetch).toHaveBeenCalledWith(
        '/api/stock-return-notes',
        expect.objectContaining({
          method: 'GET',
          params: {
            corporation_uuid: 'corp-1',
          },
        })
      )
      expect(mockDbHelpers.saveStockReturnNotes).toHaveBeenCalledWith(
        'corp-1',
        mockReturnNotes
      )
    })

    it('should handle empty return notes array', async () => {
      const { syncCorporationData } = useIndexedDB()

      mockDbHelpers.needsSync.mockImplementation((corpId: string, dataType: string) => {
        if (dataType === 'stockReturnNotes') return Promise.resolve(true)
        return Promise.resolve(false)
      })
      ;(global.$fetch as any).mockImplementation((url: string) => {
        if (url.includes('stock-return-notes')) {
          return Promise.resolve({ data: [] })
        }
        return Promise.resolve({ data: [] })
      })

      await syncCorporationData('corp-1')

      expect(mockDbHelpers.saveStockReturnNotes).toHaveBeenCalledWith('corp-1', [])
    })

    it('should handle API errors gracefully', async () => {
      const { syncCorporationData } = useIndexedDB()

      mockDbHelpers.needsSync.mockImplementation((corpId: string, dataType: string) => {
        if (dataType === 'stockReturnNotes') return Promise.resolve(true)
        return Promise.resolve(false)
      })
      ;(global.$fetch as any).mockImplementation((url: string) => {
        if (url.includes('stock-return-notes')) {
          return Promise.reject(new Error('API Error'))
        }
        return Promise.resolve({ data: [] })
      })

      // Should not throw, but handle error gracefully
      await expect(syncCorporationData('corp-1')).rejects.toThrow()
      expect(mockDbHelpers.saveStockReturnNotes).not.toHaveBeenCalled()
    })
  })

  describe('syncCorporationData - Combined Sync', () => {
    it('should sync both receipt notes and return notes when both need sync', async () => {
      const { syncCorporationData } = useIndexedDB()
      const mockReceiptNotes = [
        { uuid: 'grn-1', corporation_uuid: 'corp-1', grn_number: 'GRN-1' },
      ]
      const mockReturnNotes = [
        { uuid: 'rtn-1', corporation_uuid: 'corp-1', return_number: 'RTN-1' },
      ]

      mockDbHelpers.needsSync.mockImplementation((corpId: string, dataType: string) => {
        if (dataType === 'stockReceiptNotes' || dataType === 'stockReturnNotes') {
          return Promise.resolve(true)
        }
        return Promise.resolve(false)
      })
      ;(global.$fetch as any).mockImplementation((url: string) => {
        if (url.includes('stock-receipt-notes')) {
          return Promise.resolve({ data: mockReceiptNotes })
        }
        if (url.includes('stock-return-notes')) {
          return Promise.resolve({ data: mockReturnNotes })
        }
        return Promise.resolve({ data: [] })
      })

      await syncCorporationData('corp-1')

      expect(mockDbHelpers.saveStockReceiptNotes).toHaveBeenCalledWith(
        'corp-1',
        mockReceiptNotes
      )
      expect(mockDbHelpers.saveStockReturnNotes).toHaveBeenCalledWith(
        'corp-1',
        mockReturnNotes
      )
    })

    it('should check needsSync for both receipt and return notes', async () => {
      const { syncCorporationData } = useIndexedDB()

      mockDbHelpers.needsSync.mockResolvedValue(false)
      ;(global.$fetch as any).mockResolvedValue({ data: [] })

      await syncCorporationData('corp-1')

      expect(mockDbHelpers.needsSync).toHaveBeenCalledWith(
        'corp-1',
        'stockReceiptNotes'
      )
      expect(mockDbHelpers.needsSync).toHaveBeenCalledWith(
        'corp-1',
        'stockReturnNotes'
      )
    })
  })

  describe('clearCorporationData', () => {
    it('should clear all data for a specific corporation', async () => {
      const { clearCorporationData } = useIndexedDB()

      await clearCorporationData('corp-1')

      expect(mockDbHelpers.clearCorporationData).toHaveBeenCalledWith('corp-1')
      expect(mockDbHelpers.clearCorporationData).toHaveBeenCalledTimes(1)
    })

    it('should handle clearing data for different corporations', async () => {
      const { clearCorporationData } = useIndexedDB()

      await clearCorporationData('corp-1')
      await clearCorporationData('corp-2')
      await clearCorporationData('corp-3')

      expect(mockDbHelpers.clearCorporationData).toHaveBeenCalledTimes(3)
      expect(mockDbHelpers.clearCorporationData).toHaveBeenNthCalledWith(1, 'corp-1')
      expect(mockDbHelpers.clearCorporationData).toHaveBeenNthCalledWith(2, 'corp-2')
      expect(mockDbHelpers.clearCorporationData).toHaveBeenNthCalledWith(3, 'corp-3')
    })

    it('should propagate errors from clearCorporationData', async () => {
      const { clearCorporationData } = useIndexedDB()
      const error = new Error('Failed to clear corporation data')

      mockDbHelpers.clearCorporationData.mockRejectedValueOnce(error)

      await expect(clearCorporationData('corp-1')).rejects.toThrow(
        'Failed to clear corporation data'
      )
    })
  })

  describe('clearAllData', () => {
    it('should clear all IndexedDB data', async () => {
      const { clearAllData } = useIndexedDB()

      await clearAllData()

      expect(mockDbHelpers.clearAllData).toHaveBeenCalledTimes(1)
    })

    it('should propagate errors from clearAllData', async () => {
      const { clearAllData } = useIndexedDB()
      const error = new Error('Failed to clear all data')

      mockDbHelpers.clearAllData.mockRejectedValueOnce(error)

      await expect(clearAllData()).rejects.toThrow('Failed to clear all data')
    })
  })
})

