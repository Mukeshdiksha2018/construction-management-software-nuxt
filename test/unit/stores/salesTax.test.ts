import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSalesTaxStore } from '../../../stores/salesTax'

// Mock $fetch
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Mock IndexedDB helpers
const mockDbHelpers = {
  getSalesTaxGlobal: vi.fn().mockResolvedValue([]),
  saveSalesTaxGlobal: vi.fn().mockResolvedValue(undefined),
  addSalesTaxGlobal: vi.fn().mockResolvedValue(undefined),
  updateSalesTaxGlobal: vi.fn().mockResolvedValue(undefined),
  deleteSalesTaxGlobal: vi.fn().mockResolvedValue(undefined)
}

vi.mock('@/utils/indexedDb', () => ({
  dbHelpers: mockDbHelpers
}))

describe('Sales Tax Store', () => {
  let store: ReturnType<typeof useSalesTaxStore>

  beforeEach(() => {
    // Setup process.env before Pinia
    ;(global as any).process = { 
      server: false, 
      client: true,
      env: { NODE_ENV: 'test' }
    }
    
    setActivePinia(createPinia())
    store = useSalesTaxStore()
    // Reset store state
    store.salesTax = []
    store.loading = false
    store.error = null
    vi.clearAllMocks()
    // Reset IndexedDB mocks
    mockDbHelpers.getSalesTaxGlobal.mockResolvedValue([])
    mockDbHelpers.saveSalesTaxGlobal.mockResolvedValue(undefined)
    mockDbHelpers.addSalesTaxGlobal.mockResolvedValue(undefined)
    mockDbHelpers.updateSalesTaxGlobal.mockResolvedValue(undefined)
    mockDbHelpers.deleteSalesTaxGlobal.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.salesTax).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('fetchSalesTax', () => {
    const mockSalesTax = [
      {
        id: 1,
        uuid: 'tax-1',
        corporation_uuid: null,
        tax_name: 'State Tax',
        tax_percentage: 8.5,
        status: 'ACTIVE' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      },
      {
        id: 2,
        uuid: 'tax-2',
        corporation_uuid: null,
        tax_name: 'Federal Tax',
        tax_percentage: 5.0,
        status: 'INACTIVE' as const,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }
    ]

    it("should fetch sales tax successfully", async () => {
      mockDbHelpers.getSalesTaxGlobal.mockResolvedValueOnce([])
      mockDbHelpers.saveSalesTaxGlobal.mockResolvedValueOnce(undefined)

      mockFetch.mockResolvedValueOnce({
        success: true,
        data: mockSalesTax,
      });

      await store.fetchSalesTax(undefined, true); // forceFromAPI: true

      expect(mockFetch).toHaveBeenCalledWith("/api/sales-tax", {
        method: "GET",
      });
      expect(store.salesTax).toEqual(mockSalesTax);
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
    });

    it("should handle fetch error", async () => {
      const errorMessage = "Failed to fetch sales tax";
      mockFetch.mockRejectedValueOnce(new Error(errorMessage));

      await expect(store.fetchSalesTax(undefined, true)).rejects.toThrow(
        errorMessage
      );
      expect(store.error).toBe(errorMessage);
      expect(store.loading).toBe(false);
    });

    it("should replace existing sales tax when fetching", async () => {
      const existingTax = {
        id: 3,
        uuid: 'tax-3',
        corporation_uuid: null,
        tax_name: 'Old Tax',
        tax_percentage: 10.0,
        status: 'ACTIVE' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      };

      store.salesTax = [existingTax];

      mockFetch.mockResolvedValueOnce({
        success: true,
        data: mockSalesTax,
      });

      await store.fetchSalesTax(undefined, true);

      expect(store.salesTax).toEqual(mockSalesTax);
      expect(store.salesTax).toHaveLength(2);
    });
  })

  describe('createSalesTax', () => {
    const newSalesTax = {
      corporation_uuid: null,
      tax_name: 'City Tax',
      tax_percentage: 2.5,
      status: 'ACTIVE' as const
    }

    const createdSalesTax = {
      id: 3,
      uuid: 'tax-3',
      ...newSalesTax,
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
      created_by: 'user-1',
      updated_by: 'user-1'
    }

    it('should create sales tax successfully', async () => {
      mockDbHelpers.addSalesTaxGlobal.mockResolvedValueOnce(undefined)

      mockFetch.mockResolvedValueOnce({
        success: true,
        data: createdSalesTax
      })

      const result = await store.createSalesTax(null, newSalesTax)

      expect(mockFetch).toHaveBeenCalledWith('/api/sales-tax', {
        method: 'POST',
        body: {
          corporation_uuid: null,
          ...newSalesTax
        }
      })
      expect(result).toEqual(createdSalesTax)
      expect(store.salesTax).toHaveLength(1)
      expect(store.salesTax[0]).toEqual(createdSalesTax)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle create error', async () => {
      const errorMessage = 'Failed to create sales tax'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.createSalesTax(null, newSalesTax)).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.loading).toBe(false)
    })
  })

  describe('updateSalesTax', () => {
    const existingSalesTax = {
      id: 1,
      uuid: 'tax-1',
      corporation_uuid: null,
      tax_name: 'State Tax',
      tax_percentage: 8.5,
      status: 'ACTIVE' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
      updated_by: 'user-1'
    }

    const updateData = {
      tax_name: 'State Tax Updated',
      tax_percentage: 9.0,
      status: 'INACTIVE' as const
    }

    const updatedSalesTax = {
      ...existingSalesTax,
      ...updateData,
      updated_at: '2024-01-03T00:00:00Z'
    }

    it('should update sales tax successfully', async () => {
      // Add existing sales tax to store
      store.salesTax = [existingSalesTax]

      mockDbHelpers.updateSalesTaxGlobal.mockResolvedValueOnce(undefined)

      mockFetch.mockResolvedValueOnce({
        success: true,
        data: updatedSalesTax
      })

      const result = await store.updateSalesTax('tax-1', updateData)

      expect(mockFetch).toHaveBeenCalledWith('/api/sales-tax/tax-1', {
        method: 'PUT',
        body: updateData
      })
      expect(result).toEqual(updatedSalesTax)
      expect(store.salesTax[0]).toEqual(updatedSalesTax)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle update error', async () => {
      const errorMessage = 'Failed to update sales tax'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.updateSalesTax('tax-1', updateData)).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.loading).toBe(false)
    })
  })

  describe('deleteSalesTax', () => {
    const existingSalesTax = {
      id: 1,
      uuid: 'tax-1',
      corporation_uuid: null,
      tax_name: 'State Tax',
      tax_percentage: 8.5,
      status: 'ACTIVE' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
      updated_by: 'user-1'
    }

    it('should delete sales tax successfully', async () => {
      // Add existing sales tax to store
      store.salesTax = [existingSalesTax]

      mockDbHelpers.deleteSalesTaxGlobal.mockResolvedValueOnce(undefined)

      mockFetch.mockResolvedValueOnce({
        success: true,
        message: 'Sales tax deleted successfully'
      })

      const result = await store.deleteSalesTax('tax-1')

      expect(mockFetch).toHaveBeenCalledWith('/api/sales-tax/tax-1', {
        method: 'DELETE'
      })
      expect(result).toEqual({
        success: true,
        message: 'Sales tax deleted successfully'
      })
      expect(store.salesTax).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle delete error', async () => {
      const errorMessage = 'Failed to delete sales tax'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.deleteSalesTax('tax-1')).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.loading).toBe(false)
    })
  })

  describe('Getters', () => {
    const mockSalesTax = [
      {
        id: 1,
        uuid: 'tax-1',
        corporation_uuid: null,
        tax_name: 'State Tax',
        tax_percentage: 8.5,
        status: 'ACTIVE' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      },
      {
        id: 2,
        uuid: 'tax-2',
        corporation_uuid: null,
        tax_name: 'Federal Tax',
        tax_percentage: 5.0,
        status: 'INACTIVE' as const,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      },
      {
        id: 3,
        uuid: 'tax-3',
        corporation_uuid: null,
        tax_name: 'City Tax',
        tax_percentage: 2.5,
        status: 'ACTIVE' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }
    ]

    beforeEach(() => {
      store.salesTax = mockSalesTax
    })

    describe('getActiveSalesTax', () => {
      it("returns globally active sales tax", () => {
        const result = store.getActiveSalesTax('any')
        expect(result.every((t) => t.status === "ACTIVE")).toBe(true)
        expect(result.length).toBe(2)
      })
    })

    describe('getSalesTaxByUuid', () => {
      it('should return sales tax by UUID', () => {
        const result = store.getSalesTaxByUuid('tax-1')
        expect(result).toEqual(mockSalesTax[0])
      })

      it('should return undefined for non-existent UUID', () => {
        const result = store.getSalesTaxByUuid('non-existent')
        expect(result).toBeUndefined()
      })
    })
  })

  describe('clearSalesTax', () => {
    it('should clear all sales tax', () => {
      store.salesTax = [
        {
          id: 1,
          uuid: 'tax-1',
          corporation_uuid: null,
          tax_name: 'Test Tax',
          tax_percentage: 10.0,
          status: 'ACTIVE' as const,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          created_by: 'user-1',
          updated_by: 'user-1'
        }
      ]

      store.clearSalesTax()

      expect(store.salesTax).toEqual([])
    })
  })
})

