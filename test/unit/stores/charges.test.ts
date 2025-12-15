import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChargesStore } from '../../../stores/charges'

// Mock $fetch
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Mock IndexedDB helpers
const mockDbHelpers = {
  getChargesGlobal: vi.fn().mockResolvedValue([]),
  saveChargesGlobal: vi.fn().mockResolvedValue(undefined),
  addChargeGlobal: vi.fn().mockResolvedValue(undefined),
  updateChargeGlobal: vi.fn().mockResolvedValue(undefined),
  deleteChargeGlobal: vi.fn().mockResolvedValue(undefined)
}

vi.mock('@/utils/indexedDb', () => ({
  dbHelpers: mockDbHelpers
}))

describe('Charges Store', () => {
  let store: ReturnType<typeof useChargesStore>

  beforeEach(() => {
    // Setup process.env before Pinia
    ;(global as any).process = { 
      server: false, 
      client: true,
      env: { NODE_ENV: 'test' }
    }
    
    setActivePinia(createPinia())
    store = useChargesStore()
    // Reset store state
    store.charges = []
    store.loading = false
    store.error = null
    vi.clearAllMocks()
    // Reset IndexedDB mocks
    mockDbHelpers.getChargesGlobal.mockResolvedValue([])
    mockDbHelpers.saveChargesGlobal.mockResolvedValue(undefined)
    mockDbHelpers.addChargeGlobal.mockResolvedValue(undefined)
    mockDbHelpers.updateChargeGlobal.mockResolvedValue(undefined)
    mockDbHelpers.deleteChargeGlobal.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.charges).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('fetchCharges', () => {
    const mockCharges = [
      {
        id: 1,
        uuid: 'charge-1',
        corporation_uuid: null,
        charge_name: 'Standard Freight',
        charge_type: 'FREIGHT',
        status: 'ACTIVE' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      },
      {
        id: 2,
        uuid: 'charge-2',
        corporation_uuid: null,
        charge_name: 'Packing Charge',
        charge_type: 'PACKING',
        status: 'INACTIVE' as const,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }
    ]

    it("should fetch charges successfully", async () => {
      mockDbHelpers.getChargesGlobal.mockResolvedValueOnce([])
      mockDbHelpers.saveChargesGlobal.mockResolvedValueOnce(undefined)

      mockFetch.mockResolvedValueOnce({
        success: true,
        data: mockCharges,
      });

      await store.fetchCharges(undefined, true); // forceFromAPI: true

      expect(mockFetch).toHaveBeenCalledWith("/api/charges", {
        method: "GET",
      });
      expect(store.charges).toEqual(mockCharges);
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
    });

    it("should handle fetch error", async () => {
      const errorMessage = "Failed to fetch charges";
      mockFetch.mockRejectedValueOnce(new Error(errorMessage));

      await expect(store.fetchCharges(undefined, true)).rejects.toThrow(
        errorMessage
      );
      expect(store.error).toBe(errorMessage);
      expect(store.loading).toBe(false);
    });

    it("should replace existing charges when fetching", async () => {
      const existingCharge = {
        id: 3,
        uuid: 'charge-3',
        corporation_uuid: null,
        charge_name: 'Old Charge',
        charge_type: 'OTHER',
        status: 'ACTIVE' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      };

      store.charges = [existingCharge];

      mockFetch.mockResolvedValueOnce({
        success: true,
        data: mockCharges,
      });

      await store.fetchCharges(undefined, true);

      expect(store.charges).toEqual(mockCharges);
      expect(store.charges).toHaveLength(2);
    });
  })

  describe('createCharge', () => {
    const newCharge = {
      corporation_uuid: null,
      charge_name: 'Express Shipping',
      charge_type: 'FREIGHT' as const,
      status: 'ACTIVE' as const
    }

    const createdCharge = {
      id: 3,
      uuid: 'charge-3',
      ...newCharge,
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
      created_by: 'user-1',
      updated_by: 'user-1'
    }

    it('should create charge successfully', async () => {
      mockDbHelpers.addChargeGlobal.mockResolvedValueOnce(undefined)

      mockFetch.mockResolvedValueOnce({
        success: true,
        data: createdCharge
      })

      const result = await store.createCharge(null, newCharge)

      expect(mockFetch).toHaveBeenCalledWith('/api/charges', {
        method: 'POST',
        body: {
          corporation_uuid: null,
          ...newCharge
        }
      })
      expect(result).toEqual(createdCharge)
      expect(store.charges).toHaveLength(1)
      expect(store.charges[0]).toEqual(createdCharge)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle create error', async () => {
      const errorMessage = 'Failed to create charge'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.createCharge(null, newCharge)).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.loading).toBe(false)
    })
  })

  describe('updateCharge', () => {
    const existingCharge = {
      id: 1,
      uuid: 'charge-1',
      corporation_uuid: null,
      charge_name: 'Standard Freight',
      charge_type: 'FREIGHT' as const,
      status: 'ACTIVE' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
      updated_by: 'user-1'
    }

    const updateData = {
      charge_name: 'Standard Freight Updated',
      charge_type: 'FREIGHT' as const,
      status: 'INACTIVE' as const
    }

    const updatedCharge = {
      ...existingCharge,
      ...updateData,
      updated_at: '2024-01-03T00:00:00Z'
    }

    it('should update charge successfully', async () => {
      // Add existing charge to store
      store.charges = [existingCharge]

      mockDbHelpers.updateChargeGlobal.mockResolvedValueOnce(undefined)

      mockFetch.mockResolvedValueOnce({
        success: true,
        data: updatedCharge
      })

      const result = await store.updateCharge('charge-1', updateData)

      expect(mockFetch).toHaveBeenCalledWith('/api/charges/charge-1', {
        method: 'PUT',
        body: updateData
      })
      expect(result).toEqual(updatedCharge)
      expect(store.charges[0]).toEqual(updatedCharge)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle update error', async () => {
      const errorMessage = 'Failed to update charge'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.updateCharge('charge-1', updateData)).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.loading).toBe(false)
    })
  })

  describe('deleteCharge', () => {
    const existingCharge = {
      id: 1,
      uuid: 'charge-1',
      corporation_uuid: null,
      charge_name: 'Standard Freight',
      charge_type: 'FREIGHT' as const,
      status: 'ACTIVE' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
      updated_by: 'user-1'
    }

    it('should delete charge successfully', async () => {
      // Add existing charge to store
      store.charges = [existingCharge]

      mockDbHelpers.deleteChargeGlobal.mockResolvedValueOnce(undefined)

      mockFetch.mockResolvedValueOnce({
        success: true,
        message: 'Charge deleted successfully'
      })

      const result = await store.deleteCharge('charge-1')

      expect(mockFetch).toHaveBeenCalledWith('/api/charges/charge-1', {
        method: 'DELETE'
      })
      expect(result).toEqual({
        success: true,
        message: 'Charge deleted successfully'
      })
      expect(store.charges).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle delete error', async () => {
      const errorMessage = 'Failed to delete charge'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.deleteCharge('charge-1')).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.loading).toBe(false)
    })
  })

  describe('Getters', () => {
    const mockCharges = [
      {
        id: 1,
        uuid: 'charge-1',
        corporation_uuid: null,
        charge_name: 'Standard Freight',
        charge_type: 'FREIGHT' as const,
        status: 'ACTIVE' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      },
      {
        id: 2,
        uuid: 'charge-2',
        corporation_uuid: null,
        charge_name: 'Packing Charge',
        charge_type: 'PACKING' as const,
        status: 'INACTIVE' as const,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      },
      {
        id: 3,
        uuid: 'charge-3',
        corporation_uuid: null,
        charge_name: 'Custom Duties',
        charge_type: 'CUSTOM_DUTIES' as const,
        status: 'ACTIVE' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }
    ]

    beforeEach(() => {
      store.charges = mockCharges
    })

    describe('getActiveCharges', () => {
      it("returns globally active charges", () => {
        const result = store.getActiveCharges('any')
        expect(result.every((c) => c.status === "ACTIVE")).toBe(true)
        expect(result.length).toBe(2)
      })
    })

    describe('getChargesByType', () => {
      it('should return charges by type', () => {
        const result = store.getChargesByType('FREIGHT')
        expect(result).toHaveLength(1)
        expect(result[0].charge_type).toBe('FREIGHT')
      })

      it('should return empty array for non-existent type', () => {
        const result = store.getChargesByType('NON_EXISTENT')
        expect(result).toEqual([])
      })
    })

    describe('getChargeByUuid', () => {
      it('should return charge by UUID', () => {
        const result = store.getChargeByUuid('charge-1')
        expect(result).toEqual(mockCharges[0])
      })

      it('should return undefined for non-existent UUID', () => {
        const result = store.getChargeByUuid('non-existent')
        expect(result).toBeUndefined()
      })
    })
  })

  describe('clearCharges', () => {
    it('should clear all charges', () => {
      store.charges = [
        {
          id: 1,
          uuid: 'charge-1',
          corporation_uuid: null,
          charge_name: 'Test Charge',
          charge_type: 'FREIGHT' as const,
          status: 'ACTIVE' as const,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          created_by: 'user-1',
          updated_by: 'user-1'
        }
      ]

      store.clearCharges()

      expect(store.charges).toEqual([])
    })
  })
})

