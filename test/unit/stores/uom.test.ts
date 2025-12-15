import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUOMStore } from '../../../stores/uom'

// Mock $fetch
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('UOM Store', () => {
  let store: ReturnType<typeof useUOMStore>

  beforeEach(() => {
    // Setup process.env before Pinia
    ;(global as any).process = { 
      server: false, 
      client: true,
      env: { NODE_ENV: 'test' }
    }
    
    setActivePinia(createPinia())
    store = useUOMStore()
    // Reset store state
    store.uom = []
    store.loading = false
    store.error = null
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.uom).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('fetchUOM', () => {
    const mockUOM = [
      {
        id: 1,
        uuid: 'uom-1',
        corporation_uuid: 'corp-1',
        uom_name: 'Kilogram',
        short_name: 'KG',
        status: 'ACTIVE' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      },
      {
        id: 2,
        uuid: 'uom-2',
        corporation_uuid: 'corp-1',
        uom_name: 'Meter',
        short_name: 'M',
        status: 'INACTIVE' as const,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }
    ]

    it("should fetch UOM successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        success: true,
        data: mockUOM,
      });

      await store.fetchUOM("corp-1", true); // forceFromAPI: true (ignored)

      expect(mockFetch).toHaveBeenCalledWith("/api/uom", {
        method: "GET",
      });
      expect(store.uom).toEqual(mockUOM);
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
    });

    it("should handle fetch error", async () => {
      const errorMessage = "Failed to fetch UOM";
      mockFetch.mockRejectedValueOnce(new Error(errorMessage));

      await expect(store.fetchUOM("corp-1", true)).rejects.toThrow(
        errorMessage
      ); // forceFromAPI: true
      expect(store.error).toBe(errorMessage);
      expect(store.loading).toBe(false);
    });

    it("should clear existing UOM for corporation before adding new ones", async () => {
      // Add existing UOM for different corporation
      const existingCorp2UOM = {
        id: 3,
        uuid: "uom-3",
        corporation_uuid: "corp-2",
        uom_name: "Other Corp UOM",
        short_name: "OCU",
        status: "ACTIVE" as const,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        created_by: "user-1",
        updated_by: "user-1",
      };

      store.uom = [existingCorp2UOM];

      mockFetch.mockResolvedValueOnce({
        success: true,
        data: mockUOM,
      });

      await store.fetchUOM("corp-1", true); // forceFromAPI: true

      // Global fetch replaces list entirely
      expect(store.uom).toEqual(mockUOM);
      expect(store.uom).toHaveLength(2);
    });
  })

  describe('createUOM', () => {
    const newUOM = {
      corporation_uuid: 'corp-1',
      uom_name: 'Liter',
      short_name: 'L',
      status: 'ACTIVE' as const
    }

    const createdUOM = {
      id: 3,
      uuid: 'uom-3',
      ...newUOM,
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
      created_by: 'user-1',
      updated_by: 'user-1'
    }

    it('should create UOM successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        success: true,
        data: createdUOM
      })

      const result = await store.createUOM('corp-1', newUOM)

      expect(mockFetch).toHaveBeenCalledWith('/api/uom', {
        method: 'POST',
        body: {
          corporation_uuid: 'corp-1',
          ...newUOM
        }
      })
      expect(result).toEqual(createdUOM)
      expect(store.uom).toHaveLength(1)
      expect(store.uom[0]).toEqual(createdUOM)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle create error', async () => {
      const errorMessage = 'Failed to create UOM'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.createUOM('corp-1', newUOM)).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.loading).toBe(false)
    })
  })

  describe('updateUOM', () => {
    const existingUOM = {
      id: 1,
      uuid: 'uom-1',
      corporation_uuid: 'corp-1',
      uom_name: 'Kilogram',
      short_name: 'KG',
      status: 'ACTIVE' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
      updated_by: 'user-1'
    }

    const updateData = {
      uom_name: 'Kilogram Updated',
      short_name: 'KGU',
      status: 'INACTIVE' as const
    }

    const updatedUOM = {
      ...existingUOM,
      ...updateData,
      updated_at: '2024-01-03T00:00:00Z'
    }

    it('should update UOM successfully', async () => {
      // Add existing UOM to store
      store.uom = [existingUOM]

      mockFetch.mockResolvedValueOnce({
        success: true,
        data: updatedUOM
      })

      const result = await store.updateUOM('uom-1', updateData)

      expect(mockFetch).toHaveBeenCalledWith('/api/uom/uom-1', {
        method: 'PUT',
        body: updateData
      })
      expect(result).toEqual(updatedUOM)
      expect(store.uom[0]).toEqual(updatedUOM)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle update error', async () => {
      const errorMessage = 'Failed to update UOM'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.updateUOM('uom-1', updateData)).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.loading).toBe(false)
    })
  })

  describe('deleteUOM', () => {
    const existingUOM = {
      id: 1,
      uuid: 'uom-1',
      corporation_uuid: 'corp-1',
      uom_name: 'Kilogram',
      short_name: 'KG',
      status: 'ACTIVE' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
      updated_by: 'user-1'
    }

    it('should delete UOM successfully', async () => {
      // Add existing UOM to store
      store.uom = [existingUOM]

      mockFetch.mockResolvedValueOnce({
        success: true,
        message: 'UOM deleted successfully'
      })

      const result = await store.deleteUOM('uom-1')

      expect(mockFetch).toHaveBeenCalledWith('/api/uom/uom-1', {
        method: 'DELETE'
      })
      expect(result).toEqual({
        success: true,
        message: 'UOM deleted successfully'
      })
      expect(store.uom).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle delete error', async () => {
      const errorMessage = 'Failed to delete UOM'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.deleteUOM('uom-1')).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.loading).toBe(false)
    })
  })

  describe('Getters', () => {
    const mockUOM = [
      {
        id: 1,
        uuid: 'uom-1',
        corporation_uuid: 'corp-1',
        uom_name: 'Kilogram',
        short_name: 'KG',
        status: 'ACTIVE' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      },
      {
        id: 2,
        uuid: 'uom-2',
        corporation_uuid: 'corp-1',
        uom_name: 'Meter',
        short_name: 'M',
        status: 'INACTIVE' as const,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      },
      {
        id: 3,
        uuid: 'uom-3',
        corporation_uuid: 'corp-2',
        uom_name: 'Other Corp UOM',
        short_name: 'OCU',
        status: 'ACTIVE' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }
    ]

    beforeEach(() => {
      store.uom = mockUOM
    })

    describe('getUOMByCorporation', () => {
      it("returns all UOM globally (corporation ignored)", () => {
        const result = store.getUOMByCorporation("corp-1");
        expect(result).toHaveLength(3);
      });

      it("returns all UOM for any corporation id (global behavior)", () => {
        const result = store.getUOMByCorporation("non-existent");
        expect(result).toHaveLength(3);
      });
    })

    describe('getActiveUOM', () => {
      it("returns globally active UOM", () => {
        const result = store.getActiveUOM("any");
        expect(result.every((u) => u.status === "ACTIVE")).toBe(true);
        expect(result.length).toBe(2);
      });

      it("returns globally active UOM regardless of corporation", () => {
        const result = store.getActiveUOM("non-existent");
        expect(result.length).toBe(2);
      });
    })

    describe('getUOMByUuid', () => {
      it('should return UOM by UUID', () => {
        const result = store.getUOMByUuid('uom-1')
        expect(result).toEqual(mockUOM[0])
      })

      it('should return undefined for non-existent UUID', () => {
        const result = store.getUOMByUuid('non-existent')
        expect(result).toBeUndefined()
      })
    })
  })

  describe('clearUOM', () => {
    it('should clear all UOM', () => {
      store.uom = [
        {
          id: 1,
          uuid: 'uom-1',
          corporation_uuid: 'corp-1',
          uom_name: 'Test',
          short_name: 'T',
          status: 'ACTIVE' as const,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          created_by: 'user-1',
          updated_by: 'user-1'
        }
      ]

      store.clearUOM()

      expect(store.uom).toEqual([])
    })
  })
})
