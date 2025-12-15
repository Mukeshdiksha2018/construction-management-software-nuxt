import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useServiceTypesStore } from '@/stores/serviceTypes'

// Mock $fetch
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('ServiceTypes Store', () => {
  let store: ReturnType<typeof useServiceTypesStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useServiceTypesStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.serviceTypes).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('fetchServiceTypes', () => {
    it('should fetch service types successfully', async () => {
      const mockServiceTypes = [
        {
          id: 1,
          uuid: "st-1",
          name: "General Contracting",
          description: "General contracting services",
          color: "#3B82F6",
          isActive: true,
          created_at: "2023-01-01T00:00:00Z",
        },
        {
          id: 2,
          uuid: "st-2",
          name: "Design-Build",
          description: "Design and build services",
          color: "#10B981",
          isActive: true,
          created_at: "2023-01-02T00:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({ data: mockServiceTypes })

      await store.fetchServiceTypes()

      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
      expect(store.serviceTypes).toEqual(mockServiceTypes)
      expect(mockFetch).toHaveBeenCalledWith('/api/service-types')
    })

    it('should handle fetch error', async () => {
      const errorMessage = 'Failed to fetch service types'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await store.fetchServiceTypes()

      expect(store.loading).toBe(false)
      expect(store.error).toBe(errorMessage)
      expect(store.serviceTypes).toEqual([])
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(promise)

      const fetchPromise = store.fetchServiceTypes()

      expect(store.loading).toBe(true)

      resolvePromise!({ data: [] })
      await fetchPromise

      expect(store.loading).toBe(false)
    })
  })

  describe('createServiceType', () => {
    it('should create service type successfully', async () => {
      const newServiceType = {
        name: "Construction Management",
        description: "Construction management services",
        color: "#F59E0B",
        isActive: true,
      };

      const createdServiceType = {
        id: 3,
        uuid: 'st-3',
        ...newServiceType,
        created_at: '2023-01-03T00:00:00Z'
      }

      mockFetch.mockResolvedValueOnce({ data: createdServiceType })

      const result = await store.createServiceType(newServiceType)

      expect(result).toEqual(createdServiceType)
      expect(mockFetch).toHaveBeenCalledWith('/api/service-types', {
        method: 'POST',
        body: newServiceType
      })
    })

    it('should handle create service type error', async () => {
      const newServiceType = {
        name: 'Construction Management'
      }

      const errorMessage = 'Failed to create service type'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.createServiceType(newServiceType)).rejects.toThrow(errorMessage)
    })
  })

  describe('updateServiceType', () => {
    it('should update service type successfully', async () => {
      const serviceTypeUuid = 'st-1'
      const updateData = {
        name: 'Updated General Contracting',
        description: 'Updated description'
      }

      const updatedServiceType = {
        id: 1,
        uuid: serviceTypeUuid,
        ...updateData,
        updated_at: '2023-01-03T00:00:00Z'
      }

      mockFetch.mockResolvedValueOnce({ data: updatedServiceType })

      const result = await store.updateServiceType(serviceTypeUuid, updateData)

      expect(result).toEqual(updatedServiceType)
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/service-types/${serviceTypeUuid}`,
        {
          method: "PUT",
          body: updateData,
        }
      );
    })

    it('should handle update service type error', async () => {
      const serviceTypeUuid = 'st-1'
      const updateData = { name: 'Updated Name' }

      const errorMessage = 'Failed to update service type'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.updateServiceType(serviceTypeUuid, updateData)).rejects.toThrow(errorMessage)
    })
  })

  describe('deleteServiceType', () => {
    it('should delete service type successfully', async () => {
      const serviceTypeUuid = 'st-1'
      const deletedServiceType = {
        id: 1,
        uuid: serviceTypeUuid,
        isActive: false,
        updated_at: "2023-01-03T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({ data: deletedServiceType })

      await store.deleteServiceType(serviceTypeUuid)

      expect(store.error).toBe(null)
      expect(mockFetch).toHaveBeenCalledWith(`/api/service-types/${serviceTypeUuid}`, {
        method: 'DELETE'
      })
    })

    it('should handle delete service type error', async () => {
      const serviceTypeUuid = 'st-1'
      const errorMessage = 'Failed to delete service type'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.deleteServiceType(serviceTypeUuid)).rejects.toThrow(errorMessage)
    })
  })

  describe('getActiveServiceTypes', () => {
    const mockServiceTypes = [
      {
        id: 1,
        uuid: "st-1",
        name: "General Contracting",
        isActive: true,
      },
      {
        id: 2,
        uuid: "st-2",
        name: "Design-Build",
        isActive: true,
      },
      {
        id: 3,
        uuid: "st-3",
        name: "Construction Management",
        isActive: false,
      },
      {
        id: 4,
        uuid: "st-4",
        name: "Subcontracting",
        isActive: true,
      },
    ];

    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({ data: mockServiceTypes })
      await store.fetchServiceTypes()
    })

    it('should return all active service types (global)', () => {
      const activeTypes = store.getActiveServiceTypes
      expect(activeTypes).toHaveLength(3)
      expect(activeTypes.every((type) => type.isActive)).toBe(true)
    })

    it('should filter out inactive types', () => {
      const activeTypes = store.getActiveServiceTypes
      const hasInactive = activeTypes.some((type) => !type.isActive)
      expect(hasInactive).toBe(false)
    })
  })

  describe('getServiceTypeById', () => {
    const mockServiceTypes = [
      {
        id: 1,
        uuid: "st-1",
        name: "General Contracting",
        isActive: true,
      },
      {
        id: 2,
        uuid: "st-2",
        name: "Design-Build",
        isActive: true,
      },
    ];

    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({ data: mockServiceTypes })
      await store.fetchServiceTypes()
    })

    it('should return service type by UUID', () => {
      const serviceType = store.getServiceTypeById('st-1')
      expect(serviceType).toEqual({
        id: 1,
        uuid: "st-1",
        name: "General Contracting",
        isActive: true,
      });
    })

    it('should return undefined for non-existent service type', () => {
      const serviceType = store.getServiceTypeById('non-existent')
      expect(serviceType).toBeUndefined()
    })
  })

  describe('clearError', () => {
    it('should clear error state', () => {
      store.error = 'Some error'
      store.clearError()
      expect(store.error).toBe(null)
    })
  })

  describe('clearServiceTypes', () => {
    it('should clear service types array', () => {
      store.serviceTypes = [
        { id: 1, uuid: 'st-1', name: 'General Contracting' }
      ]
      store.clearServiceTypes()
      expect(store.serviceTypes).toEqual([])
    })
  })

  describe('Service Type Statistics', () => {
    const mockServiceTypes = [
      {
        id: 1,
        uuid: "st-1",
        name: "General Contracting",
        isActive: true,
      },
      {
        id: 2,
        uuid: "st-2",
        name: "Design-Build",
        isActive: true,
      },
      {
        id: 3,
        uuid: "st-3",
        name: "Construction Management",
        isActive: false,
      },
    ];

    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({ data: mockServiceTypes })
      await store.fetchServiceTypes()
    })

    it('should get total service type count', () => {
      const count = store.getServiceTypeCount
      expect(count).toBe(3)
    })

    it('should get active service type count', () => {
      const count = store.getActiveServiceTypeCount
      expect(count).toBe(2)
    })

    it('should check if service type exists', () => {
      expect(store.serviceTypeExists('st-1')).toBe(true)
      expect(store.serviceTypeExists('non-existent')).toBe(false)
    })
  })

  describe("Service Type Lookup for UI Display", () => {
    beforeEach(async () => {
      const mockServiceTypes = [
        {
          id: 1,
          uuid: "st-1",
          name: "Plumbing",
          isActive: true,
        },
        {
          id: 2,
          uuid: "st-2",
          name: "Electrical",
          isActive: true,
        },
        {
          id: 3,
          uuid: "st-3",
          name: "HVAC",
          isActive: false, // inactive
        },
        {
          id: 4,
          uuid: "st-4",
          name: "General Contracting",
          isActive: true,
        },
      ];

      mockFetch.mockResolvedValueOnce({ data: mockServiceTypes });
      await store.fetchServiceTypes();
    });

    it("should return active service types for UI lookup mapping", () => {
      const activeTypes = store.getActiveServiceTypes;

      // Verify we get only active types
      expect(activeTypes).toHaveLength(3);
      expect(activeTypes.every((type) => type.isActive)).toBe(true);

      // Verify the structure is correct for UI lookup
      const lookupMap = activeTypes.reduce((map, type) => {
        map[type.uuid] = type.name;
        return map;
      }, {} as Record<string, string>);

      expect(lookupMap).toEqual({
        "st-1": "Plumbing",
        "st-2": "Electrical",
        "st-4": "General Contracting",
      });

      // Verify inactive type is not included
      expect(lookupMap["st-3"]).toBeUndefined();
    });

    it("should handle service types with missing names gracefully", async () => {
      // Clear the store first to avoid interference from previous test
      store.clearServiceTypes();

      const mockServiceTypesWithMissingNames = [
        {
          id: 1,
          uuid: "st-1",
          name: "Valid Service",
          isActive: true,
        },
        {
          id: 2,
          uuid: "st-2",
          name: null, // missing name
          isActive: true,
        },
        {
          id: 3,
          uuid: "st-3",
          name: "", // empty name
          isActive: true,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        data: mockServiceTypesWithMissingNames,
      });
      await store.fetchServiceTypes();

      const activeTypes = store.getActiveServiceTypes;
      const lookupMap = activeTypes.reduce((map, type) => {
        map[type.uuid] = type.name || type.uuid; // fallback to UUID if name is missing
        return map;
      }, {} as Record<string, string>);

      expect(lookupMap).toEqual({
        "st-1": "Valid Service",
        "st-2": "st-2", // fallback to UUID
        "st-3": "st-3", // fallback to UUID
      });
    });
  });
})
