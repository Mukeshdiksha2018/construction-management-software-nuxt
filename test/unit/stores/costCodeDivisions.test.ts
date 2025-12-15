import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from "pinia";
import { useCostCodeDivisionsStore } from '../../../stores/costCodeDivisions'

// Let TypeScript know about the Node/Vitest global object we use in tests
declare const global: any;

// Mock $fetch once for the whole test file
global.$fetch = vi.fn()

// Mock IndexedDB
const mockDbHelpers = {
  getCostCodeDivisions: vi.fn(),
  addCostCodeDivision: vi.fn(),
  updateCostCodeDivision: vi.fn(),
  deleteCostCodeDivision: vi.fn(),
  deleteAllCostCodeDivisions: vi.fn(),
  saveCostCodeDivisions: vi.fn(),
};

vi.mock('@/utils/indexedDb', () => ({
  dbHelpers: mockDbHelpers
}))

describe('costCodeDivisions Store', () => {
  let store: ReturnType<typeof useCostCodeDivisionsStore>

  const mockDivision = {
    id: 1,
    uuid: 'division-1',
    division_number: '01',
    division_name: 'General Requirements',
    division_order: 1,
    description: 'General project requirements',
    is_active: true,
    corporation_uuid: 'corp-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const mockCorporationUuid = 'corp-1'

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useCostCodeDivisionsStore()
    // Reset store state using store methods
    store.clearDivisions()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.divisions).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('fetchDivisions', () => {
    it('should fetch divisions from API successfully', async () => {
      const mockResponse = { data: [mockDivision] }
      global.$fetch = vi.fn().mockResolvedValue(mockResponse)

      await store.fetchDivisions(mockCorporationUuid, false, false)

      expect(global.$fetch).toHaveBeenCalledWith('/api/cost-code-divisions', {
        query: { corporation_uuid: mockCorporationUuid }
      })
      expect(store.divisions).toEqual([mockDivision])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should fetch divisions from IndexedDB when useIndexedDB is true', async () => {
      mockDbHelpers.getCostCodeDivisions.mockResolvedValue([mockDivision])

      await store.fetchDivisions(mockCorporationUuid, false, true)

      expect(mockDbHelpers.getCostCodeDivisions).toHaveBeenCalledWith(mockCorporationUuid)
      expect(store.divisions).toEqual([mockDivision])
      expect(store.loading).toBe(false)
    })

    it('should handle API fetch error', async () => {
      const error = new Error('Network error')
      global.$fetch = vi.fn().mockRejectedValue(error)

      await store.fetchDivisions(mockCorporationUuid, false, false)

      expect(store.error).toBe('Network error')
      expect(store.divisions).toEqual([])
      expect(store.loading).toBe(false)
    })

    it('should handle IndexedDB fetch error', async () => {
      const error = new Error('IndexedDB error')
      mockDbHelpers.getCostCodeDivisions.mockRejectedValue(error)

      await store.fetchDivisions(mockCorporationUuid, false, true)

      expect(store.error).toBe('IndexedDB error')
      expect(store.divisions).toEqual([])
      expect(store.loading).toBe(false)
    })

    it('should skip fetch if data is cached and not forcing refresh', async () => {
      // First fetch to populate cache
      const mockResponse = { data: [mockDivision] }
      global.$fetch = vi.fn().mockResolvedValue(mockResponse)
      await store.fetchDivisions(mockCorporationUuid, false, false)

      // Clear the mock to verify it's not called again
      global.$fetch = vi.fn()

      // Second fetch should be skipped
      await store.fetchDivisions(mockCorporationUuid, false, false)

      expect(global.$fetch).not.toHaveBeenCalled()
    })

    it('should force fetch when forceRefresh is true', async () => {
      // First fetch to populate cache
      const mockResponse = { data: [mockDivision] }
      global.$fetch = vi.fn().mockResolvedValue(mockResponse)
      await store.fetchDivisions(mockCorporationUuid, false, false)

      // Clear the mock
      global.$fetch = vi.fn().mockResolvedValue(mockResponse)

      // Force refresh should call API again
      await store.fetchDivisions(mockCorporationUuid, true, false)

      expect(global.$fetch).toHaveBeenCalled()
    })
  })

  describe('createDivision', () => {
    it('should create division successfully', async () => {
      const newDivision = {
        division_number: '02',
        division_name: 'Sitework',
        division_order: 2,
        description: 'Site preparation work',
        is_active: true,
        corporation_uuid: mockCorporationUuid
      }

      const mockResponse = { data: { ...newDivision, id: 2, uuid: 'division-2' } }
      global.$fetch = vi.fn().mockResolvedValue(mockResponse)
      mockDbHelpers.addCostCodeDivision.mockResolvedValue(undefined)

      const result = await store.createDivision(newDivision)

      expect(global.$fetch).toHaveBeenCalledWith('/api/cost-code-divisions', {
        method: 'POST',
        body: newDivision
      })
      expect(store.divisions[0]).toEqual(mockResponse.data)
      expect(mockDbHelpers.addCostCodeDivision).toHaveBeenCalledWith(mockCorporationUuid, mockResponse.data)
      expect(result).toEqual(mockResponse.data)
    })

    it('should handle create division error', async () => {
      const newDivision = {
        division_number: '02',
        division_name: 'Sitework',
        division_order: 2,
        description: 'Site preparation work',
        is_active: true,
        corporation_uuid: mockCorporationUuid
      }

      const error = new Error('Create failed')
      global.$fetch = vi.fn().mockRejectedValue(error)

      await expect(store.createDivision(newDivision)).rejects.toThrow('Create failed')
      expect(store.error).toBe('Create failed')
    })

    it('should handle IndexedDB sync error gracefully', async () => {
      const newDivision = {
        division_number: '02',
        division_name: 'Sitework',
        division_order: 2,
        description: 'Site preparation work',
        is_active: true,
        corporation_uuid: mockCorporationUuid
      }

      const mockResponse = { data: { ...newDivision, id: 2, uuid: 'division-2' } }
      global.$fetch = vi.fn().mockResolvedValue(mockResponse)
      mockDbHelpers.addCostCodeDivision.mockRejectedValue(new Error('IndexedDB sync failed'))

      const result = await store.createDivision(newDivision)

      expect(result).toEqual(mockResponse.data)
      expect(store.divisions[0]).toEqual(mockResponse.data)
    })

    it('should allow creating multiple divisions with the same order number', async () => {
      const firstDivision = {
        division_number: '01',
        division_name: 'First Division',
        division_order: 1,
        description: 'First division',
        is_active: true,
        corporation_uuid: mockCorporationUuid
      }

      const secondDivision = {
        division_number: '02',
        division_name: 'Second Division',
        division_order: 1, // Same order number - should be allowed
        description: 'Second division',
        is_active: true,
        corporation_uuid: mockCorporationUuid
      }

      const firstResponse = { data: { ...firstDivision, id: 1, uuid: 'division-1' } }
      const secondResponse = { data: { ...secondDivision, id: 2, uuid: 'division-2' } }

      global.$fetch = vi.fn()
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse)
      mockDbHelpers.addCostCodeDivision.mockResolvedValue(undefined)

      const result1 = await store.createDivision(firstDivision)
      const result2 = await store.createDivision(secondDivision)

      expect(global.$fetch).toHaveBeenCalledTimes(2)
      expect(result1).toEqual(firstResponse.data)
      expect(result2).toEqual(secondResponse.data)
      expect(store.divisions.length).toBe(2)
      // Both divisions should have order 1
      const divisionsWithOrder1 = store.divisions.filter(d => d.division_order === 1)
      expect(divisionsWithOrder1.length).toBe(2)
      // Verify both division numbers exist
      const divisionNumbers = store.divisions.map(d => d.division_number).sort()
      expect(divisionNumbers).toEqual(['01', '02'])
    })
  })

  describe('updateDivision', () => {
    it('should update division successfully', async () => {
      // First populate the store with data
      global.$fetch = vi.fn().mockResolvedValue([mockDivision])
      mockDbHelpers.getCostCodeDivisions.mockResolvedValue([mockDivision])
      await store.fetchDivisions(mockCorporationUuid)

      const updateData = {
        division_name: 'Updated General Requirements',
        description: 'Updated description'
      }

      const updatedDivision = { ...mockDivision, ...updateData }
      const mockResponse = { data: updatedDivision }
      global.$fetch = vi.fn().mockResolvedValue(mockResponse)
      mockDbHelpers.updateCostCodeDivision.mockResolvedValue(undefined)

      const result = await store.updateDivision(mockDivision.uuid, updateData)

      expect(global.$fetch).toHaveBeenCalledWith(`/api/cost-code-divisions/${mockDivision.uuid}`, {
        method: 'PUT',
        body: updateData
      })
      expect(store.divisions[0]).toEqual(updatedDivision)
      expect(mockDbHelpers.updateCostCodeDivision).toHaveBeenCalledWith(mockCorporationUuid, updatedDivision)
      expect(result).toEqual(updatedDivision)
    })

    it('should handle update division error', async () => {
      // First populate the store with data
      global.$fetch = vi.fn().mockResolvedValue([mockDivision])
      mockDbHelpers.getCostCodeDivisions.mockResolvedValue([mockDivision])
      await store.fetchDivisions(mockCorporationUuid)

      const updateData = { division_name: 'Updated Name' }
      const error = new Error('Update failed')
      global.$fetch = vi.fn().mockRejectedValue(error)

      await expect(store.updateDivision(mockDivision.uuid, updateData)).rejects.toThrow('Update failed')
      expect(store.error).toBe('Update failed')
    })

    it('should allow updating division to duplicate order number', async () => {
      // First populate the store with two divisions by fetching them
      const firstDivision = { ...mockDivision, uuid: 'division-1', division_number: '01', division_order: 1 }
      const secondDivision = { ...mockDivision, uuid: 'division-2', division_number: '02', division_order: 2 }
      
      // Populate store by fetching divisions
      global.$fetch = vi.fn().mockResolvedValue({ data: [firstDivision, secondDivision] })
      mockDbHelpers.getCostCodeDivisions.mockResolvedValue([firstDivision, secondDivision])
      await store.fetchDivisions(mockCorporationUuid)

      // Update first division to have same order as second division
      const updateData = {
        division_number: '01',
        division_name: 'Updated Division',
        division_order: 2, // Same order as second division - should be allowed
        description: 'Updated description',
        is_active: true,
        corporation_uuid: mockCorporationUuid
      }

      const updatedDivision = { ...firstDivision, ...updateData }
      const mockResponse = { data: updatedDivision }
      global.$fetch = vi.fn().mockResolvedValue(mockResponse)
      mockDbHelpers.updateCostCodeDivision.mockResolvedValue(undefined)

      const result = await store.updateDivision('division-1', updateData)

      expect(global.$fetch).toHaveBeenCalledWith('/api/cost-code-divisions/division-1', {
        method: 'PUT',
        body: updateData
      })
      expect(result).toEqual(updatedDivision)
      // Find the updated division in the store
      const updatedDiv = store.divisions.find(d => d.uuid === 'division-1')
      const otherDiv = store.divisions.find(d => d.uuid === 'division-2')
      expect(updatedDiv).toBeDefined()
      expect(otherDiv).toBeDefined()
      expect(updatedDiv?.division_order).toBe(2)
      expect(otherDiv?.division_order).toBe(2) // Both have order 2 now
    })

    it('should handle division not found in store', async () => {
      const updateData = { division_name: 'Updated Name' }
      const mockResponse = { data: { ...mockDivision, ...updateData } }
      global.$fetch = vi.fn().mockResolvedValue(mockResponse)

      const result = await store.updateDivision('non-existent-uuid', updateData)

      expect(result).toEqual(mockResponse.data)
      expect(store.divisions).toEqual([]) // Should remain empty since division wasn't found
    })
  })

  describe('deleteDivision', () => {
    it('should delete division successfully', async () => {
      // First populate the store with data
      global.$fetch = vi.fn().mockResolvedValue([mockDivision])
      mockDbHelpers.getCostCodeDivisions.mockResolvedValue([mockDivision])
      await store.fetchDivisions(mockCorporationUuid)

      global.$fetch = vi.fn().mockResolvedValue({})
      mockDbHelpers.deleteCostCodeDivision.mockResolvedValue(undefined)

      await store.deleteDivision(mockDivision.uuid)

      expect(global.$fetch).toHaveBeenCalledWith(`/api/cost-code-divisions/${mockDivision.uuid}`, {
        method: 'DELETE'
      })
      expect(store.divisions).toEqual([])
      expect(mockDbHelpers.deleteCostCodeDivision).toHaveBeenCalledWith(mockCorporationUuid, mockDivision.uuid)
    })

    it('should handle delete division error', async () => {
      // First populate the store with data
      global.$fetch = vi.fn().mockResolvedValue([mockDivision])
      mockDbHelpers.getCostCodeDivisions.mockResolvedValue([mockDivision])
      await store.fetchDivisions(mockCorporationUuid)

      const error = new Error('Delete failed')
      global.$fetch = vi.fn().mockRejectedValue(error)

      await expect(store.deleteDivision(mockDivision.uuid)).rejects.toThrow('Delete failed')
      expect(store.error).toBe('Delete failed')
    })

    it('should handle division not found in store', async () => {
      global.$fetch = vi.fn().mockResolvedValue({})

      await store.deleteDivision('non-existent-uuid')

      expect(global.$fetch).toHaveBeenCalled()
      expect(store.divisions).toEqual([]) // Should remain empty
    })
  })

  describe('bulkImportDivisions', () => {
    it('should bulk import divisions successfully', async () => {
      const divisionsToImport = [
        {
          division_number: '01',
          division_name: 'General Requirements',
          division_order: 1,
          description: 'General project requirements',
          is_active: true,
          corporation_uuid: mockCorporationUuid
        },
        {
          division_number: '02',
          division_name: 'Sitework',
          division_order: 2,
          description: 'Site preparation work',
          is_active: true,
          corporation_uuid: mockCorporationUuid
        }
      ]

      const mockResult = {
        data: { new: 2, duplicates: 0, total: 2 },
        message: 'Import successful'
      }

      global.$fetch = vi.fn().mockResolvedValue(mockResult)
      global.$fetch = vi.fn().mockResolvedValueOnce(mockResult).mockResolvedValueOnce({ data: [] })

      const result = await store.bulkImportDivisions(mockCorporationUuid, divisionsToImport)

      expect(global.$fetch).toHaveBeenCalledWith('/api/cost-code-divisions/bulk', {
        method: 'POST',
        body: {
          corporation_uuid: mockCorporationUuid,
          divisions: divisionsToImport
        }
      })
      expect(result).toEqual(mockResult)
    })

    it('should handle bulk import error', async () => {
      const divisionsToImport = [
        {
          division_number: '01',
          division_name: 'General Requirements',
          division_order: 1,
          description: 'General project requirements',
          is_active: true,
          corporation_uuid: mockCorporationUuid
        }
      ]

      const error = new Error('Bulk import failed')
      global.$fetch = vi.fn().mockRejectedValue(error)

      await expect(store.bulkImportDivisions(mockCorporationUuid, divisionsToImport)).rejects.toThrow('Bulk import failed')
      expect(store.error).toBe('Bulk import failed')
    })
  })

  describe('deleteAllDivisions', () => {
    it('should delete all divisions successfully', async () => {
      // First populate the store with data
      const mockDivisions = [mockDivision, { ...mockDivision, uuid: 'division-2' }]
      global.$fetch = vi.fn().mockResolvedValue(mockDivisions)
      mockDbHelpers.getCostCodeDivisions.mockResolvedValue(mockDivisions)
      await store.fetchDivisions(mockCorporationUuid)

      global.$fetch = vi.fn().mockResolvedValue({})

      await store.deleteAllDivisions(mockCorporationUuid)

      expect(global.$fetch).toHaveBeenCalledWith('/api/cost-code-divisions/delete-all', {
        method: 'DELETE',
        query: { corporation_uuid: mockCorporationUuid }
      })
      expect(store.divisions).toEqual([])
    })

    it('should handle delete all divisions error', async () => {
      // First populate the store with data
      global.$fetch = vi.fn().mockResolvedValue([mockDivision])
      mockDbHelpers.getCostCodeDivisions.mockResolvedValue([mockDivision])
      await store.fetchDivisions(mockCorporationUuid)

      const error = new Error('Delete all failed')
      global.$fetch = vi.fn().mockRejectedValue(error)

      await expect(store.deleteAllDivisions(mockCorporationUuid)).rejects.toThrow('Delete all failed')
      expect(store.error).toBe('Delete all failed')
    })
  })

  describe('Getters', () => {
    beforeEach(async () => {
      // Mock the fetchDivisions to populate the store with test data
      const mockDivisions = [
        { ...mockDivision, uuid: 'division-1', corporation_uuid: 'corp-1', is_active: true },
        { ...mockDivision, uuid: 'division-2', corporation_uuid: 'corp-1', is_active: false },
        { ...mockDivision, uuid: 'division-3', corporation_uuid: 'corp-2', is_active: true }
      ]
      
      global.$fetch = vi.fn().mockResolvedValue(mockDivisions)
      mockDbHelpers.getCostCodeDivisions.mockResolvedValue(mockDivisions)
      
      // Fetch divisions to populate the store
      await store.fetchDivisions('corp-1')
    })

    it('should get divisions by corporation', () => {
      const divisions = store.getDivisionsByCorporation('corp-1')
      expect(divisions).toHaveLength(2)
      expect(divisions.every(d => d.corporation_uuid === 'corp-1')).toBe(true)
    })

    it('should get active divisions by corporation', () => {
      const activeDivisions = store.getActiveDivisions("corp-1");
      expect(activeDivisions).toHaveLength(1);
      // Guard against undefined for TypeScript strict-null checks
      const first = activeDivisions[0]!;
      expect(first.is_active).toBe(true);
      expect(first.corporation_uuid).toBe("corp-1");
    })

    it('should get division by ID', () => {
      const division = store.getDivisionById('division-1')
      expect(division).toEqual(store.divisions[0])
    })

    it('should return undefined for non-existent division ID', () => {
      const division = store.getDivisionById('non-existent')
      expect(division).toBeUndefined()
    })

    it('should get division count by corporation', () => {
      const count = store.getDivisionCountByCorporation('corp-1')
      expect(count).toBe(2)
    })

    it('should get active division count by corporation', () => {
      const count = store.getActiveDivisionCountByCorporation('corp-1')
      expect(count).toBe(1)
    })

    it('should check if division exists', () => {
      expect(store.divisionExists('division-1')).toBe(true)
      expect(store.divisionExists('non-existent')).toBe(false)
    })
  })

  describe('Cache Management', () => {
    it('should clear divisions and cache', async () => {
      // First populate the store with data
      global.$fetch = vi.fn().mockResolvedValue([mockDivision])
      mockDbHelpers.getCostCodeDivisions.mockResolvedValue([mockDivision])
      await store.fetchDivisions(mockCorporationUuid)
      
      store.clearDivisions()

      expect(store.divisions).toEqual([])
    })

    it('should clear error', () => {
      // Simulate an error by directly assigning into the underlying ref via type cast
      (store as any).error = "Some error";
      store.clearError();

      expect(store.error).toBe(null);
    })

    it('should refresh divisions from API', async () => {
      const mockResponse = { data: [mockDivision] }
      global.$fetch = vi.fn().mockResolvedValue(mockResponse)

      await store.refreshDivisionsFromAPI(mockCorporationUuid)

      expect(global.$fetch).toHaveBeenCalledWith('/api/cost-code-divisions', {
        query: { corporation_uuid: mockCorporationUuid }
      })
      expect(store.divisions).toEqual([mockDivision])
    })
  })


  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      global.$fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      await store.fetchDivisions(mockCorporationUuid, false, false);

      expect(store.error).toBe("Network error");
      expect(store.divisions).toEqual([]);
    });

    it("should handle IndexedDB errors gracefully", async () => {
      mockDbHelpers.getCostCodeDivisions.mockRejectedValue(
        new Error("IndexedDB error")
      );

      await store.fetchDivisions(mockCorporationUuid, false, true);

      expect(store.error).toBe("IndexedDB error");
      expect(store.divisions).toEqual([]);
    });
  });

  describe("Fix Scenarios", () => {
    describe("Fix: IndexedDB Synchronization in deleteDivision", () => {
      it("should sync deletion to IndexedDB when deleteDivision is called", async () => {
        // Mock successful operations
        global.$fetch = vi.fn().mockResolvedValue({});
        mockDbHelpers.deleteCostCodeDivision.mockResolvedValue(undefined);

        // First populate the store with data
        global.$fetch = vi.fn().mockResolvedValue({ data: [mockDivision] });
        await store.fetchDivisions(mockCorporationUuid, false, false);

        // Clear the mock to focus on deleteDivision call
        global.$fetch = vi.fn().mockResolvedValue({});

        // Call deleteDivision
        await store.deleteDivision(mockDivision.uuid);

        // Verify IndexedDB deletion was called
        expect(mockDbHelpers.deleteCostCodeDivision).toHaveBeenCalledWith(
          mockCorporationUuid,
          mockDivision.uuid
        );

        // Verify API call was made
        expect(global.$fetch).toHaveBeenCalledWith(
          `/api/cost-code-divisions/${mockDivision.uuid}`,
          {
            method: "DELETE",
          }
        );
      });

      it("should handle IndexedDB deletion failure gracefully", async () => {
        // Mock API success but IndexedDB failure
        global.$fetch = vi.fn().mockResolvedValue({});
        mockDbHelpers.deleteCostCodeDivision.mockRejectedValue(
          new Error("IndexedDB deletion failed")
        );

        // First populate the store with data
        global.$fetch = vi.fn().mockResolvedValue({ data: [mockDivision] });
        await store.fetchDivisions(mockCorporationUuid, false, false);

        // Clear the mock to focus on deleteDivision call
        global.$fetch = vi.fn().mockResolvedValue({});

        // Call deleteDivision - should not throw error
        await expect(
          store.deleteDivision(mockDivision.uuid)
        ).resolves.not.toThrow();

        // Verify API call was still made
        expect(global.$fetch).toHaveBeenCalledWith(
          `/api/cost-code-divisions/${mockDivision.uuid}`,
          {
            method: "DELETE",
          }
        );

        // Verify IndexedDB deletion was attempted
        expect(mockDbHelpers.deleteCostCodeDivision).toHaveBeenCalledWith(
          mockCorporationUuid,
          mockDivision.uuid
        );
      });

      it("should clear cache after successful deleteDivision operation", async () => {
        // Mock successful operations
        global.$fetch = vi.fn().mockResolvedValue({});
        mockDbHelpers.deleteCostCodeDivision.mockResolvedValue(undefined);

        // First populate the store with data
        global.$fetch = vi.fn().mockResolvedValue({ data: [mockDivision] });
        await store.fetchDivisions(mockCorporationUuid, false, false);

        // Clear the mock to focus on deleteDivision call
        global.$fetch = vi.fn().mockResolvedValue({});

        // Call deleteDivision
        await store.deleteDivision(mockDivision.uuid);

        // Verify cache is cleared by attempting to fetch again
        // This should trigger a fresh fetch since cache was cleared
        global.$fetch = vi.fn().mockResolvedValue({ data: [] });
        await store.fetchDivisions(mockCorporationUuid, false, false);

        // Verify fresh fetch was made
        expect(global.$fetch).toHaveBeenCalledWith("/api/cost-code-divisions", {
          query: { corporation_uuid: mockCorporationUuid },
        });
      });
    });

    describe("Fix: IndexedDB Synchronization in createDivision", () => {
      it("should sync creation to IndexedDB when createDivision is called", async () => {
        const newDivision = {
          division_number: "02",
          division_name: "Sitework",
          division_order: 2,
          description: "Site preparation work",
          is_active: true,
          corporation_uuid: mockCorporationUuid,
        };

        const mockResponse = {
          data: { ...newDivision, id: 2, uuid: "division-2" },
        };
        global.$fetch = vi.fn().mockResolvedValue(mockResponse);
        mockDbHelpers.addCostCodeDivision.mockResolvedValue(undefined);

        const result = await store.createDivision(newDivision);

        // Verify API call
        expect(global.$fetch).toHaveBeenCalledWith("/api/cost-code-divisions", {
          method: "POST",
          body: newDivision,
        });

        // Verify IndexedDB sync
        expect(mockDbHelpers.addCostCodeDivision).toHaveBeenCalledWith(
          mockCorporationUuid,
          mockResponse.data
        );

        // Verify result
        expect(result).toEqual(mockResponse.data);
      });

      it("should handle IndexedDB creation failure gracefully", async () => {
        const newDivision = {
          division_number: "02",
          division_name: "Sitework",
          division_order: 2,
          description: "Site preparation work",
          is_active: true,
          corporation_uuid: mockCorporationUuid,
        };

        const mockResponse = {
          data: { ...newDivision, id: 2, uuid: "division-2" },
        };
        global.$fetch = vi.fn().mockResolvedValue(mockResponse);
        mockDbHelpers.addCostCodeDivision.mockRejectedValue(
          new Error("IndexedDB creation failed")
        );

        // Should not throw error
        const result = await expect(
          store.createDivision(newDivision)
        ).resolves.not.toThrow();

        // Verify API call was still made
        expect(global.$fetch).toHaveBeenCalledWith("/api/cost-code-divisions", {
          method: "POST",
          body: newDivision,
        });

        // Verify IndexedDB sync was attempted
        expect(mockDbHelpers.addCostCodeDivision).toHaveBeenCalledWith(
          mockCorporationUuid,
          mockResponse.data
        );
      });
    });

    describe("Fix: IndexedDB Synchronization in updateDivision", () => {
      it("should sync update to IndexedDB when updateDivision is called", async () => {
        const updatedDivision = {
          ...mockDivision,
          division_name: "Updated General Requirements",
          description: "Updated description",
        };

        // First populate the store with the division so it can be found during update
        global.$fetch = vi.fn().mockResolvedValue({ data: [mockDivision] });
        await store.fetchDivisions(mockCorporationUuid, false, false);

        // Now mock the update response
        const mockResponse = { data: updatedDivision };
        global.$fetch = vi.fn().mockResolvedValue(mockResponse);
        mockDbHelpers.updateCostCodeDivision.mockResolvedValue(undefined);

        const result = await store.updateDivision(
          mockDivision.uuid,
          updatedDivision
        );

        // Verify API call
        expect(global.$fetch).toHaveBeenCalledWith(
          `/api/cost-code-divisions/${mockDivision.uuid}`,
          {
            method: "PUT",
            body: updatedDivision,
          }
        );

        // Verify IndexedDB sync - the store uses data.corporation_uuid from the API response
        expect(mockDbHelpers.updateCostCodeDivision).toHaveBeenCalledWith(
          updatedDivision.corporation_uuid,
          updatedDivision
        );

        // Verify result
        expect(result).toEqual(updatedDivision);
      });

      it("should handle IndexedDB update failure gracefully", async () => {
        const updatedDivision = {
          ...mockDivision,
          division_name: "Updated General Requirements",
          description: "Updated description",
        };

        // First populate the store with the division so it can be found during update
        global.$fetch = vi.fn().mockResolvedValue({ data: [mockDivision] });
        await store.fetchDivisions(mockCorporationUuid, false, false);

        // Now mock the update response
        const mockResponse = { data: updatedDivision };
        global.$fetch = vi.fn().mockResolvedValue(mockResponse);
        mockDbHelpers.updateCostCodeDivision.mockRejectedValue(
          new Error("IndexedDB update failed")
        );

        // Should not throw error
        await expect(
          store.updateDivision(mockDivision.uuid, updatedDivision)
        ).resolves.not.toThrow();

        // Verify API call was still made
        expect(global.$fetch).toHaveBeenCalledWith(
          `/api/cost-code-divisions/${mockDivision.uuid}`,
          {
            method: "PUT",
            body: updatedDivision,
          }
        );

        // Verify IndexedDB sync was attempted - the store uses data.corporation_uuid from the API response
        expect(mockDbHelpers.updateCostCodeDivision).toHaveBeenCalledWith(
          updatedDivision.corporation_uuid,
          updatedDivision
        );
      });
    });

    describe("Fix: IndexedDB Synchronization in deleteAllDivisions", () => {
      it("should sync bulk deletion to IndexedDB when deleteAllDivisions is called", async () => {
        // Mock successful operations
        global.$fetch = vi.fn().mockResolvedValue({});
        mockDbHelpers.deleteAllCostCodeDivisions.mockResolvedValue(undefined);

        // First populate the store with data
        const mockDivisions = [
          mockDivision,
          { ...mockDivision, uuid: "division-2" },
        ];
        global.$fetch = vi.fn().mockResolvedValue({ data: mockDivisions });
        await store.fetchDivisions(mockCorporationUuid, false, false);

        // Clear the mock to focus on deleteAllDivisions call
        global.$fetch = vi.fn().mockResolvedValue({});

        // Call deleteAllDivisions
        await store.deleteAllDivisions(mockCorporationUuid);

        // Verify IndexedDB bulk deletion was called
        expect(mockDbHelpers.deleteAllCostCodeDivisions).toHaveBeenCalledWith(
          mockCorporationUuid
        );

        // Verify API call was made
        expect(global.$fetch).toHaveBeenCalledWith(
          "/api/cost-code-divisions/delete-all",
          {
            method: "DELETE",
            query: { corporation_uuid: mockCorporationUuid },
          }
        );
      });

      it("should handle IndexedDB bulk deletion failure gracefully", async () => {
        // Mock API success but IndexedDB failure
        global.$fetch = vi.fn().mockResolvedValue({});
        mockDbHelpers.deleteAllCostCodeDivisions.mockRejectedValue(
          new Error("IndexedDB bulk deletion failed")
        );

        // First populate the store with data
        const mockDivisions = [
          mockDivision,
          { ...mockDivision, uuid: "division-2" },
        ];
        global.$fetch = vi.fn().mockResolvedValue({ data: mockDivisions });
        await store.fetchDivisions(mockCorporationUuid, false, false);

        // Clear the mock to focus on deleteAllDivisions call
        global.$fetch = vi.fn().mockResolvedValue({});

        // Call deleteAllDivisions - should not throw error
        await expect(
          store.deleteAllDivisions(mockCorporationUuid)
        ).resolves.not.toThrow();

        // Verify API call was still made
        expect(global.$fetch).toHaveBeenCalledWith(
          "/api/cost-code-divisions/delete-all",
          {
            method: "DELETE",
            query: { corporation_uuid: mockCorporationUuid },
          }
        );

        // Verify IndexedDB bulk deletion was attempted
        expect(mockDbHelpers.deleteAllCostCodeDivisions).toHaveBeenCalledWith(
          mockCorporationUuid
        );
      });

      it("should clear store data after successful deleteAllDivisions operation", async () => {
        // Mock successful operations
        global.$fetch = vi.fn().mockResolvedValue({});
        mockDbHelpers.deleteAllCostCodeDivisions.mockResolvedValue(undefined);

        // First populate the store with data
        const mockDivisions = [
          mockDivision,
          { ...mockDivision, uuid: "division-2" },
        ];
        global.$fetch = vi.fn().mockResolvedValue({ data: mockDivisions });
        await store.fetchDivisions(mockCorporationUuid, false, false);

        // Verify store has data
        expect(store.divisions).toHaveLength(2);

        // Clear the mock to focus on deleteAllDivisions call
        global.$fetch = vi.fn().mockResolvedValue({});

        // Call deleteAllDivisions
        await store.deleteAllDivisions(mockCorporationUuid);

        // Verify store data is cleared
        expect(store.divisions).toEqual([]);
      });
    });

    describe("Fix: Data Consistency and Cache Management", () => {
      it("should maintain data consistency after mixed operations", async () => {
        // Mock successful operations
        global.$fetch = vi.fn().mockResolvedValue({});
        mockDbHelpers.addCostCodeDivision.mockResolvedValue(undefined);
        mockDbHelpers.updateCostCodeDivision.mockResolvedValue(undefined);
        mockDbHelpers.deleteCostCodeDivision.mockResolvedValue(undefined);

        // First populate the store with data
        global.$fetch = vi.fn().mockResolvedValue({ data: [mockDivision] });
        await store.fetchDivisions(mockCorporationUuid, false, false);

        // Perform mixed operations
        const newDivision = {
          division_number: "02",
          division_name: "Sitework",
          division_order: 2,
          description: "Site preparation work",
          is_active: true,
          corporation_uuid: mockCorporationUuid,
        };

        // Create
        global.$fetch = vi
          .fn()
          .mockResolvedValue({
            data: { ...newDivision, id: 2, uuid: "division-2" },
          });
        await store.createDivision(newDivision);

        // Update
        const updatedDivision = { ...mockDivision, division_name: "Updated" };
        global.$fetch = vi.fn().mockResolvedValue({ data: updatedDivision });
        await store.updateDivision(mockDivision.uuid, updatedDivision);

        // Delete
        global.$fetch = vi.fn().mockResolvedValue({});
        await store.deleteDivision("division-2");

        // Verify all IndexedDB operations were called
        expect(mockDbHelpers.addCostCodeDivision).toHaveBeenCalled();
        expect(mockDbHelpers.updateCostCodeDivision).toHaveBeenCalled();
        expect(mockDbHelpers.deleteCostCodeDivision).toHaveBeenCalled();
      });

      it("should handle concurrent operations with proper cache management", async () => {
        global.$fetch = vi.fn().mockResolvedValue({});
        mockDbHelpers.deleteCostCodeDivision.mockResolvedValue(undefined);
        mockDbHelpers.deleteAllCostCodeDivisions.mockResolvedValue(undefined);

        const mockDivisions = [
          mockDivision,
          { ...mockDivision, uuid: "division-2" },
        ];
        global.$fetch = vi.fn().mockResolvedValue({ data: mockDivisions });
        await store.fetchDivisions(mockCorporationUuid, false, false);

        global.$fetch = vi.fn().mockResolvedValue({});

        const deletePromise = store.deleteDivision(mockDivision.uuid);
        await new Promise((resolve) => setTimeout(resolve, 10)); // Ensure deleteDivision starts first
        const deleteAllPromise = store.deleteAllDivisions(mockCorporationUuid);

        await Promise.all([deletePromise, deleteAllPromise]);

        expect(mockDbHelpers.deleteAllCostCodeDivisions).toHaveBeenCalled();
        expect(store.divisions).toEqual([]);
      });

      it("should handle IndexedDB sync failures without breaking store state", async () => {
        // Mock API success but IndexedDB failures
        global.$fetch = vi.fn().mockResolvedValue({ data: mockDivision });
        mockDbHelpers.addCostCodeDivision.mockRejectedValue(
          new Error("IndexedDB sync failed")
        );

        const newDivision = {
          division_number: "02",
          division_name: "Sitework",
          division_order: 2,
          description: "Site preparation work",
          is_active: true,
          corporation_uuid: mockCorporationUuid,
        };

        // Should not throw error
        await expect(store.createDivision(newDivision)).resolves.not.toThrow();

        // Verify store state is still valid - the division should be added to store despite IndexedDB failure
        expect(store.divisions).toHaveLength(1); // Store should contain the created division
        expect(store.divisions[0]).toEqual(mockDivision); // Should match the API response
        expect(store.error).toBeNull(); // No error should be set
      });
    });

    describe("Fix: CSV Import with IndexedDB Synchronization", () => {
      it("should sync bulk import to IndexedDB when bulkImportDivisions is called", async () => {
        const divisionsToImport = [
          {
            division_number: "01",
            division_name: "General Requirements",
            division_order: 1,
            description: "General project requirements",
            is_active: true,
            corporation_uuid: mockCorporationUuid,
          },
          {
            division_number: "02",
            division_name: "Sitework",
            division_order: 2,
            description: "Site preparation work",
            is_active: true,
            corporation_uuid: mockCorporationUuid,
          },
        ];

        const mockResponse = { data: { message: "Bulk import successful" } };
        global.$fetch = vi.fn().mockResolvedValue(mockResponse);

        // Mock the fetchDivisions call that happens after bulk import
        global.$fetch = vi
          .fn()
          .mockResolvedValueOnce(mockResponse) // For bulk import API call
          .mockResolvedValueOnce({ data: divisionsToImport }); // For fetchDivisions call

        const result = await store.bulkImportDivisions(
          mockCorporationUuid,
          divisionsToImport
        );

        // Verify API call for bulk import
        expect(global.$fetch).toHaveBeenCalledWith(
          "/api/cost-code-divisions/bulk",
          {
            method: "POST",
            body: {
              corporation_uuid: mockCorporationUuid,
              divisions: divisionsToImport,
            },
          }
        );

        // Verify that fetchDivisions was called with proper parameters for IndexedDB sync
        expect(global.$fetch).toHaveBeenCalledWith("/api/cost-code-divisions", {
          query: { corporation_uuid: mockCorporationUuid },
        });

        // Verify result
        expect(result).toEqual(mockResponse);
      });

      it("should sync IndexedDB after fetching divisions from API", async () => {
        // Mock process.client for IndexedDB sync
        const originalProcess = global.process;
        global.process = { ...originalProcess, client: true } as any;

        const divisionsData = [
          {
            uuid: "div-1",
            division_number: "01",
            division_name: "General Requirements",
            division_order: 1,
            description: "General requirements",
            is_active: true,
            corporation_uuid: mockCorporationUuid,
          },
          {
            uuid: "div-2",
            division_number: "02",
            division_name: "Sitework",
            division_order: 2,
            description: "Site preparation",
            is_active: true,
            corporation_uuid: mockCorporationUuid,
          },
        ];

        // Mock API response
        global.$fetch = vi.fn().mockResolvedValue({
          data: divisionsData,
        });

        // Mock IndexedDB save
        const mockSaveCostCodeDivisions = vi.fn().mockResolvedValue(undefined);
        mockDbHelpers.saveCostCodeDivisions = mockSaveCostCodeDivisions;

        // Fetch divisions with forceRefresh=true, useIndexedDB=false
        // This should fetch from API and sync to IndexedDB
        await store.fetchDivisions(mockCorporationUuid, true, false);

        // Verify API was called
        expect(global.$fetch).toHaveBeenCalledWith("/api/cost-code-divisions", {
          query: { corporation_uuid: mockCorporationUuid },
        });

        // Verify IndexedDB sync was called
        expect(mockSaveCostCodeDivisions).toHaveBeenCalledWith(
          mockCorporationUuid,
          divisionsData
        );

        // Verify store has the data
        expect(store.divisions).toEqual(divisionsData);

        // Restore process
        global.process = originalProcess;
      });

      it("should handle IndexedDB sync errors gracefully during fetch", async () => {
        // Mock process.client for IndexedDB sync
        const originalProcess = global.process;
        global.process = { ...originalProcess, client: true } as any;

        const divisionsData = [
          {
            uuid: "div-1",
            division_number: "01",
            division_name: "General Requirements",
            division_order: 1,
            is_active: true,
            corporation_uuid: mockCorporationUuid,
          },
        ];

        // Mock API response
        global.$fetch = vi.fn().mockResolvedValue({
          data: divisionsData,
        });

        // Mock IndexedDB save error
        mockDbHelpers.saveCostCodeDivisions = vi
          .fn()
          .mockRejectedValue(new Error("IndexedDB error"));

        // Should not throw - should handle error gracefully
        await expect(
          store.fetchDivisions(mockCorporationUuid, true, false)
        ).resolves.not.toThrow();

        // Verify store still has the data despite IndexedDB error
        expect(store.divisions).toEqual(divisionsData);

        // Restore process
        global.process = originalProcess;
      });

      it("should handle bulk import errors gracefully", async () => {
        const divisionsToImport = [
          {
            division_number: "01",
            division_name: "General Requirements",
            division_order: 1,
            description: "General project requirements",
            is_active: true,
            corporation_uuid: mockCorporationUuid,
          },
        ];

        const error = new Error("Bulk import failed");
        global.$fetch = vi.fn().mockRejectedValue(error);

        // Should throw error
        await expect(
          store.bulkImportDivisions(mockCorporationUuid, divisionsToImport)
        ).rejects.toThrow("Bulk import failed");

        // Verify API call was attempted
        expect(global.$fetch).toHaveBeenCalledWith(
          "/api/cost-code-divisions/bulk",
          {
            method: "POST",
            body: {
              corporation_uuid: mockCorporationUuid,
              divisions: divisionsToImport,
            },
          }
        );
      });

      it("should clear cache and refresh data after bulk import", async () => {
        const divisionsToImport = [
          {
            division_number: "01",
            division_name: "General Requirements",
            division_order: 1,
            description: "General project requirements",
            is_active: true,
            corporation_uuid: mockCorporationUuid,
          },
        ];

        const mockResponse = { data: { message: "Bulk import successful" } };
        global.$fetch = vi
          .fn()
          .mockResolvedValueOnce(mockResponse) // For bulk import API call
          .mockResolvedValueOnce({ data: divisionsToImport }); // For fetchDivisions call

        // First populate the store with some data
        global.$fetch = vi.fn().mockResolvedValue({ data: [mockDivision] });
        await store.fetchDivisions(mockCorporationUuid, false, false);

        // Verify store has data
        expect(store.divisions).toHaveLength(1);

        // Now perform bulk import
        global.$fetch = vi
          .fn()
          .mockResolvedValueOnce(mockResponse) // For bulk import API call
          .mockResolvedValueOnce({ data: divisionsToImport }); // For fetchDivisions call

        await store.bulkImportDivisions(mockCorporationUuid, divisionsToImport);

        // Verify that data is refreshed after bulk import
        expect(global.$fetch).toHaveBeenCalledWith("/api/cost-code-divisions", {
          query: { corporation_uuid: mockCorporationUuid },
        });
      });

      it("should use correct parameters for IndexedDB refresh after bulk import", async () => {
        const divisionsToImport = [
          {
            division_number: "01",
            division_name: "General Requirements",
            division_order: 1,
            description: "General project requirements",
            is_active: true,
            corporation_uuid: mockCorporationUuid,
          },
        ];

        const mockResponse = { data: { message: "Bulk import successful" } };
        global.$fetch = vi
          .fn()
          .mockResolvedValueOnce(mockResponse) // For bulk import API call
          .mockResolvedValueOnce({ data: divisionsToImport }); // For fetchDivisions call

        await store.bulkImportDivisions(mockCorporationUuid, divisionsToImport);

        // Verify specific parameters for the fix
        expect(global.$fetch).toHaveBeenCalledWith("/api/cost-code-divisions", {
          query: { corporation_uuid: mockCorporationUuid },
        });
      });
    });
  });
})
