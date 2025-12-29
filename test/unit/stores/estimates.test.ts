import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEstimatesStore } from '@/stores/estimates'
import { useCorporationStore } from '@/stores/corporations'

// Mock $fetch
global.$fetch = vi.fn()

// Mock IndexedDB helpers
vi.mock("@/utils/indexedDb", () => ({
  dbHelpers: {
    storeEstimates: vi.fn().mockResolvedValue(undefined),
    getEstimates: vi.fn().mockResolvedValue([]),
    addEstimate: vi.fn().mockResolvedValue(undefined),
    updateEstimate: vi.fn().mockResolvedValue(undefined),
    deleteEstimate: vi.fn().mockResolvedValue(undefined),
    getEstimateByUuid: vi.fn().mockResolvedValue(null),
  },
}));

describe('Estimates Store', () => {
  let estimatesStore: ReturnType<typeof useEstimatesStore>
  let corporationStore: ReturnType<typeof useCorporationStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    estimatesStore = useEstimatesStore()
    corporationStore = useCorporationStore()
    
    // Set up a mock corporation - setSelectedCorporation takes the UUID string
    corporationStore.setSelectedCorporation('test-corp-uuid')
    
    // Also ensure the corporations array has the corporation
    corporationStore.corporations = [{
      uuid: 'test-corp-uuid',
      corporation_name: 'Test Corporation',
      corporation_id: 'TEST001'
    }]
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(estimatesStore.estimates).toEqual([])
      expect(estimatesStore.loading).toBe(false)
      expect(estimatesStore.error).toBe(null)
    })
  })

  describe("fetchEstimates", () => {
    it("should fetch estimates for a corporation (from IndexedDB only)", async () => {
      const mockEstimates = [
        {
          uuid: "estimate-1",
          estimate_number: "EST-001",
          project_uuid: "project-1",
          corporation_uuid: "test-corp-uuid",
          estimate_date: "2024-01-01",
          total_amount: 1000,
          final_amount: 1100,
          status: "Draft",
          line_items: [],
        },
      ];

      // Mock IndexedDB response
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimates).mockResolvedValue(mockEstimates as any);

      await estimatesStore.fetchEstimates("test-corp-uuid");

      expect(estimatesStore.estimates).toEqual(mockEstimates);
      expect(estimatesStore.loading).toBe(false);
      expect(estimatesStore.error).toBe(null);
      expect(dbHelpers.getEstimates).toHaveBeenCalledWith("test-corp-uuid");
    });

    it("should handle IndexedDB errors", async () => {
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimates).mockRejectedValue(
        new Error("IndexedDB Error")
      );

      await estimatesStore.fetchEstimates("test-corp-uuid");

      expect(estimatesStore.estimates).toEqual([]);
      expect(estimatesStore.loading).toBe(false);
      expect(estimatesStore.error).toBe("IndexedDB Error");
    });

    it("should not make API calls during fetchEstimates", async () => {
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimates).mockResolvedValue([]);

      await estimatesStore.fetchEstimates("test-corp-uuid");

      expect(global.$fetch).not.toHaveBeenCalled();
    });

    it("should set loading state correctly", async () => {
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimates).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );

      const fetchPromise = estimatesStore.fetchEstimates("test-corp-uuid");

      expect(estimatesStore.loading).toBe(true);

      await fetchPromise;

      expect(estimatesStore.loading).toBe(false);
    });
  });

  describe("refreshEstimatesFromAPI", () => {
    it("should refresh estimates from API and update IndexedDB", async () => {
      const mockEstimates = [
        {
          uuid: "estimate-1",
          estimate_number: "EST-001",
          project_uuid: "project-1",
          corporation_uuid: "test-corp-uuid",
          estimate_date: "2024-01-01",
          total_amount: 1000,
          final_amount: 1100,
          status: "Draft",
          line_items: [],
        },
      ];

      // Mock API response with pagination
      vi.mocked(global.$fetch).mockResolvedValue({
        data: mockEstimates,
        pagination: {
          page: 1,
          pageSize: 100,
          totalRecords: 1,
          totalPages: 1,
          hasMore: false,
        },
      });

      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.storeEstimates).mockResolvedValue(undefined);

      await estimatesStore.refreshEstimatesFromAPI("test-corp-uuid", 1, 100);

      expect(global.$fetch).toHaveBeenCalledWith("/api/estimates", {
        method: "GET",
        query: { corporation_uuid: "test-corp-uuid", page: 1, page_size: 100 },
      });
      expect(dbHelpers.storeEstimates).toHaveBeenCalledWith(mockEstimates);
      expect(estimatesStore.estimates).toEqual(mockEstimates);
      // Verify pagination info is stored
      const paginationInfo = estimatesStore.getPaginationInfo("test-corp-uuid");
      expect(paginationInfo).toBeTruthy();
      expect(paginationInfo?.totalRecords).toBe(1);
      // Loading should be false after successful refresh
      expect(estimatesStore.loading).toBe(false);
      expect(estimatesStore.error).toBe(null);
    });

    it("should handle API errors during refresh", async () => {
      vi.mocked(global.$fetch).mockRejectedValue(new Error("API Error"));

      await estimatesStore.refreshEstimatesFromAPI("test-corp-uuid", 1, 100);

      // The method sets error state when API fails
      expect(estimatesStore.error).toBe("Failed to refresh estimates");
      expect(estimatesStore.estimates).toEqual([]);
      // Loading should be false after error
      expect(estimatesStore.loading).toBe(false);
    });

    it("should set loading state during refresh", async () => {
      vi.mocked(global.$fetch).mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve({ data: [] }), 100))
      );

      const refreshPromise =
        estimatesStore.refreshEstimatesFromAPI("test-corp-uuid", 1, 100);

      // The method sets loading state to true during refresh
      expect(estimatesStore.loading).toBe(true);

      await refreshPromise;

      // Loading should be false after completion
      expect(estimatesStore.loading).toBe(false);
    });
  });

  describe('createEstimate', () => {
    it('should create a new estimate and add to store if corporation matches', async () => {
      const newEstimate = {
        corporation_uuid: "test-corp-uuid",
        project_uuid: "project-1",
        estimate_number: "EST-002",
        estimate_date: "2024-01-02",
        total_amount: 2000,
        final_amount: 2200,
        status: "Draft" as const,
        line_items: [],
      };

      const createdEstimate = {
        uuid: "estimate-2",
        ...newEstimate,
      };

      // Mock the $fetch response
      vi.mocked(global.$fetch).mockResolvedValue({
        data: createdEstimate,
      });

      const { dbHelpers } = await import("@/utils/indexedDb");

      const result = await estimatesStore.createEstimate(newEstimate);

      expect(result).toBe(true);
      // Should add to store since corporation matches (test-corp-uuid)
      expect(estimatesStore.estimates).toHaveLength(1);
      expect(estimatesStore.estimates[0].uuid).toBe("estimate-2");
      // Using granular update for IDB now
      expect(dbHelpers.updateEstimate).toHaveBeenCalledWith(
        "test-corp-uuid",
        createdEstimate
      );

      // Verify store sent UTC ISO date in body
      const calls = vi.mocked(global.$fetch).mock.calls;
      const postCall = [...calls]
        .reverse()
        .find(
          ([url, opts]: any) =>
            url === "/api/estimates" && opts?.method === "POST"
        )!;
      const options = postCall[1] as any;
      expect(options.body?.estimate_date).toMatch(
        /T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    })

    it('should create estimate but not add to store if corporation does not match', async () => {
      const newEstimate = {
        corporation_uuid: "other-corp-uuid", // Different from selected
        project_uuid: "project-1",
        estimate_number: "EST-003",
        estimate_date: "2024-01-03",
        total_amount: 3000,
        final_amount: 3300,
        status: "Draft" as const,
        line_items: [],
      };

      const createdEstimate = {
        uuid: "estimate-3",
        ...newEstimate,
      };

      // Mock the $fetch response
      vi.mocked(global.$fetch).mockResolvedValue({
        data: createdEstimate,
      });

      const { dbHelpers } = await import("@/utils/indexedDb");

      const result = await estimatesStore.createEstimate(newEstimate);

      expect(result).toBe(true);
      // Should NOT add to store since corporation doesn't match
      expect(estimatesStore.estimates).toHaveLength(0);
      // Should still save to IndexedDB
      expect(dbHelpers.updateEstimate).toHaveBeenCalledWith(
        "other-corp-uuid",
        createdEstimate
      );
    })

    it('should handle creation errors', async () => {
      const newEstimate = {
        corporation_uuid: 'test-corp-uuid',
        project_uuid: 'project-1',
        estimate_number: 'EST-002',
        estimate_date: '2024-01-02',
        total_amount: 2000,
        final_amount: 2200,
        status: 'Draft' as const,
        line_items: []
      }

      // Mock API error
      vi.mocked(global.$fetch).mockRejectedValue(new Error('Creation failed'))

      const result = await estimatesStore.createEstimate(newEstimate)

      expect(result).toBe(false)
      expect(estimatesStore.error).toBe('Creation failed')
    })
  })

  describe('updateEstimate', () => {
    beforeEach(async () => {
      // Set up initial estimates by using fetchEstimates
      const mockEstimates = [
        {
          uuid: "estimate-1",
          estimate_number: "EST-001",
          project_uuid: "project-1",
          corporation_uuid: "test-corp-uuid",
          estimate_date: "2024-01-01",
          total_amount: 1000,
          final_amount: 1100,
          status: "Draft",
          line_items: [],
        },
      ];

      // Mock IndexedDB response
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimates).mockResolvedValue(mockEstimates as any);

      await estimatesStore.fetchEstimates("test-corp-uuid");
    })

    it("should update an existing estimate and update store if corporation matches", async () => {
      const updatedEstimate = {
        uuid: "estimate-1",
        estimate_number: "EST-001-UPDATED",
        project_uuid: "project-1",
        corporation_uuid: "test-corp-uuid",
        estimate_date: "2024-01-01",
        total_amount: 1500,
        final_amount: 1650,
        status: "Pending" as const,
        line_items: [],
      };

      // Mock the $fetch response
      vi.mocked(global.$fetch).mockResolvedValue({
        data: updatedEstimate,
      });

      const { dbHelpers } = await import("@/utils/indexedDb");

      const result = await estimatesStore.updateEstimate(updatedEstimate);

      expect(result).toBe(true);
      // Should update in store since corporation matches
      expect(estimatesStore.estimates).toHaveLength(1);
      expect(estimatesStore.estimates[0].estimate_number).toBe(
        "EST-001-UPDATED"
      );
      // Using granular update for IDB now
      expect(dbHelpers.updateEstimate).toHaveBeenCalledWith(
        "test-corp-uuid",
        updatedEstimate
      );

      // Verify store sent UTC ISO date in body for update
      const calls = vi.mocked(global.$fetch).mock.calls;
      const putCall = [...calls]
        .reverse()
        .find(
          ([url, opts]: any) =>
            typeof url === "string" &&
            url.startsWith("/api/estimates/") &&
            opts?.method === "PUT"
        )!;
      const options = putCall[1] as any;
      expect(options.body?.estimate_date).toMatch(
        /T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it("should update estimate but not update store if corporation does not match", async () => {
      const updatedEstimate = {
        uuid: "estimate-1",
        estimate_number: "EST-001-UPDATED",
        project_uuid: "project-1",
        corporation_uuid: "other-corp-uuid", // Different from selected
        estimate_date: "2024-01-01",
        total_amount: 1500,
        final_amount: 1650,
        status: "Pending" as const,
        line_items: [],
      };

      // Mock the $fetch response
      vi.mocked(global.$fetch).mockResolvedValue({
        data: updatedEstimate,
      });

      const { dbHelpers } = await import("@/utils/indexedDb");

      const result = await estimatesStore.updateEstimate(updatedEstimate);

      expect(result).toBe(true);
      // Should NOT update in store since corporation doesn't match
      // The estimate in store should remain unchanged
      expect(estimatesStore.estimates).toHaveLength(1);
      expect(estimatesStore.estimates[0].estimate_number).toBe("EST-001"); // Original value
      // Should still save to IndexedDB
      expect(dbHelpers.updateEstimate).toHaveBeenCalledWith(
        "other-corp-uuid",
        updatedEstimate
      );
    });

    it("should convert empty date strings to null in payload", async () => {
      vi.mocked(global.$fetch).mockResolvedValue({
        data: { uuid: "estimate-1" },
      } as any);
      await estimatesStore.updateEstimate({
        uuid: "estimate-1",
        estimate_date: "",
      });
      const calls = vi.mocked(global.$fetch).mock.calls;
      const putCall = [...calls]
        .reverse()
        .find(
          ([url, opts]: any) =>
            typeof url === "string" &&
            url.startsWith("/api/estimates/") &&
            opts?.method === "PUT"
        )!;
      const options = putCall[1] as any;
      expect(options.body?.estimate_date).toBeNull();
    });

    it('should handle update errors', async () => {
      const updatedEstimate = {
        uuid: 'estimate-1',
        estimate_number: 'EST-001-UPDATED',
        project_uuid: 'project-1',
        corporation_uuid: 'test-corp-uuid',
        estimate_date: '2024-01-01',
        total_amount: 1500,
        final_amount: 1650,
        status: 'Pending' as const,
        line_items: []
      }

      // Mock API error
      vi.mocked(global.$fetch).mockRejectedValue(new Error('Update failed'))

      const result = await estimatesStore.updateEstimate(updatedEstimate)

      expect(result).toBe(false)
      expect(estimatesStore.error).toBe('Update failed')
    })
  })

  describe('deleteEstimate', () => {
    beforeEach(async () => {
      // Set up initial estimates by using fetchEstimates
      const mockEstimates = [
        {
          uuid: 'estimate-1',
          estimate_number: 'EST-001',
          project_uuid: 'project-1',
          corporation_uuid: 'test-corp-uuid',
          estimate_date: '2024-01-01',
          total_amount: 1000,
          final_amount: 1100,
          status: 'Draft',
          line_items: []
        }
      ]

      // Mock the $fetch response
      vi.mocked(global.$fetch).mockResolvedValue({
        data: mockEstimates
      })

      await estimatesStore.fetchEstimates('test-corp-uuid')
    })

    it('should delete an estimate', async () => {
      // Mock the $fetch response
      vi.mocked(global.$fetch).mockResolvedValue({
        message: "Estimate deleted successfully",
      });

      const { dbHelpers } = await import("@/utils/indexedDb");

      const result = await estimatesStore.deleteEstimate("estimate-1");

      expect(result).toBe(true);
      expect(estimatesStore.estimates).toHaveLength(0);
      // Using granular delete for IDB now
      expect(dbHelpers.deleteEstimate).toHaveBeenCalledWith(
        "test-corp-uuid",
        "estimate-1"
      );
    })

    it('should handle delete errors', async () => {
      // Mock API error
      const deleteError = new Error('Delete failed')
      vi.mocked(global.$fetch).mockRejectedValue(deleteError)

      // The function now throws errors instead of returning false
      await expect(estimatesStore.deleteEstimate('estimate-1')).rejects.toThrow('Delete failed')
      expect(estimatesStore.error).toBe('Delete failed')
    })
  })

  describe('getEstimateByUuid', () => {
    beforeEach(async () => {
      // Set up initial estimates by using fetchEstimates
      const mockEstimates = [
        {
          uuid: 'estimate-1',
          estimate_number: 'EST-001',
          project_uuid: 'project-1',
          corporation_uuid: 'test-corp-uuid',
          estimate_date: '2024-01-01',
          total_amount: 1000,
          final_amount: 1100,
          status: 'Draft',
          line_items: []
        },
        {
          uuid: 'estimate-2',
          estimate_number: 'EST-002',
          project_uuid: 'project-2',
          corporation_uuid: 'test-corp-uuid',
          estimate_date: '2024-01-02',
          total_amount: 2000,
          final_amount: 2200,
          status: 'Pending',
          line_items: []
        }
      ]

      // Mock the $fetch response
      vi.mocked(global.$fetch).mockResolvedValue({
        data: mockEstimates
      })

      await estimatesStore.fetchEstimates('test-corp-uuid')
    })

    it('should return the correct estimate by UUID', () => {
      const estimate = estimatesStore.getEstimateByUuid('estimate-1')
      expect(estimate).toEqual(estimatesStore.estimates[0])
    })

    it('should return undefined for non-existent UUID', () => {
      const estimate = estimatesStore.getEstimateByUuid('non-existent')
      expect(estimate).toBeUndefined()
    })
  })

  describe('clearEstimates', () => {
    it('should clear the estimates and error state', () => {
      estimatesStore.estimates = [{ uuid: 'test' } as any]
      estimatesStore.error = 'Some error'
      estimatesStore.clearEstimates()
      expect(estimatesStore.estimates).toEqual([])
      expect(estimatesStore.error).toBe(null)
    })
  })
})
