import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCorporationStore } from '../../../stores/corporations'

// Mock useFetch
const mockUseFetch = vi.fn()
;(global as any).useFetch = mockUseFetch

describe('corporations Store', () => {
  let store: ReturnType<typeof useCorporationStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useCorporationStore()
    // Reset store state
    store.corporations = []
    store.loading = false
    store.errorMessage = ''
    store.selectedCorporationId = null
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.corporations).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.errorMessage).toBe('')
      expect(store.selectedCorporationId).toBe(null)
      expect(store.selectedCorporation).toBeUndefined()
    })
  })

  describe('selectedCorporation computed', () => {
    const mockCorporations = [
      {
        id: 1,
        uuid: 'corp-1',
        corporation_name: 'Test Hotel',
        legal_name: 'Test Hotel LLC',
        corporation_location: 'New York',
        number_of_rooms: 100,
        pms_name: 'opera',
        country: 'US',
        currency: 'USD',
        currency_symbol: '$'
      },
      {
        id: 2,
        uuid: 'corp-2',
        corporation_name: 'Beach Resort',
        legal_name: 'Beach Resort Inc',
        corporation_location: 'Miami',
        number_of_rooms: 200,
        pms_name: 'fosse',
        country: 'US',
        currency: 'USD',
        currency_symbol: '$'
      }
    ]

    it('should return selected corporation when selectedCorporationId is set', () => {
      store.corporations = mockCorporations
      store.selectedCorporationId = 'corp-1'

      expect(store.selectedCorporation).toEqual(mockCorporations[0])
    })

    it('should return undefined when selectedCorporationId is not set', () => {
      store.corporations = mockCorporations
      
      expect(store.selectedCorporation).toBeUndefined()
    })

    it('should return undefined when corporation is not found', () => {
      store.corporations = mockCorporations
      store.selectedCorporationId = 'non-existent'

      expect(store.selectedCorporation).toBeUndefined()
    })
  })

  describe('setSelectedCorporation', () => {
    it('should set selected corporation ID', () => {
      store.setSelectedCorporation('corp-1')
      
      expect(store.selectedCorporationId).toBe('corp-1')
    })

    it('should set to null when null is passed', () => {
      store.selectedCorporationId = 'corp-1'
      store.setSelectedCorporation(null)
      
      expect(store.selectedCorporationId).toBe(null)
    })
  })

  describe('isReady computed', () => {
    it('should return true when corporations are loaded', () => {
      store.corporations = [{ id: 1, uuid: 'corp-1', corporation_name: 'Test' }]
      
      expect(store.isReady).toBe(true)
    })

    it('should return false when corporations are empty', () => {
      expect(store.isReady).toBe(false)
    })
  })

  describe('hasSelectedCorporation computed', () => {
    const mockCorporation = {
      id: 1,
      uuid: 'corp-1',
      corporation_name: 'Test Hotel',
      legal_name: 'Test Hotel LLC',
      corporation_location: 'New York',
      number_of_rooms: 100,
      pms_name: 'opera',
      country: 'US',
      currency: 'USD',
      currency_symbol: '$'
    }

    it('should return true when valid corporation is selected', () => {
      store.corporations = [mockCorporation]
      store.selectedCorporationId = 'corp-1'
      
      expect(store.hasSelectedCorporation).toBeTruthy()
    })

    it('should return false when no corporation is selected', () => {
      store.corporations = [mockCorporation]
      
      expect(store.hasSelectedCorporation).toBeFalsy()
    })

    it('should return false when selected corporation does not exist', () => {
      store.corporations = [mockCorporation]
      store.selectedCorporationId = 'non-existent'
      
      expect(store.hasSelectedCorporation).toBeFalsy()
    })
  })

  describe("fetchCorporations", () => {
    const mockCorporations = [
      {
        id: 1,
        uuid: "corp-1",
        corporation_name: "Test Hotel",
        legal_name: "Test Hotel LLC",
        corporation_location: "New York",
        number_of_rooms: 100,
        pms_name: "opera",
        country: "US",
        currency: "USD",
        currency_symbol: "$",
      },
      {
        id: 2,
        uuid: "corp-2",
        corporation_name: "Beach Resort",
        legal_name: "Beach Resort Inc",
        corporation_location: "Miami",
        number_of_rooms: 200,
        pms_name: "fosse",
        country: "US",
        currency: "USD",
        currency_symbol: "$",
      },
    ];

    it("should fetch corporations successfully", async () => {
      global.$fetch = vi
        .fn()
        .mockResolvedValue({ data: mockCorporations }) as any;

      await store.fetchCorporations();

      expect(global.$fetch).toHaveBeenCalledWith("/api/corporations");
      expect(store.corporations).toEqual(mockCorporations);
      expect(store.loading).toBe(false);
      expect(store.errorMessage).toBe("");
    });

    it("should handle fetch error", async () => {
      const errorMessage = "Network error";
      global.$fetch = vi.fn().mockRejectedValue(new Error(errorMessage)) as any;

      await store.fetchCorporations();

      expect(store.corporations).toEqual([]);
      expect(store.loading).toBe(false);
      expect(store.errorMessage).toBe(errorMessage);
    });

    it("should set loading state during fetch", async () => {
      let resolvePromise!: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      global.$fetch = vi.fn().mockReturnValue(fetchPromise) as any;

      const fetchCall = store.fetchCorporations();

      expect(store.loading).toBe(true);

      resolvePromise({ data: mockCorporations });
      await fetchCall;

      expect(store.loading).toBe(false);
    });

    it("should handle API error response", async () => {
      global.$fetch = vi.fn().mockResolvedValue({ error: "API Error" }) as any;

      await store.fetchCorporations();

      expect(store.corporations).toEqual([]);
      expect(store.errorMessage).toBe("API Error");
    });

    it("should handle empty data", async () => {
      global.$fetch = vi.fn().mockResolvedValue({ data: [] }) as any;

      await store.fetchCorporations();

      expect(store.corporations).toEqual([]);
      expect(store.errorMessage).toBe("");
    });

    it("should handle response without data property", async () => {
      global.$fetch = vi.fn().mockResolvedValue({}) as any;

      await store.fetchCorporations();

      expect(store.corporations).toEqual([]);
    });
  });

  describe("addCorporation", () => {
    const newCorporation = {
      corporation_name: "New Hotel",
      legal_name: "New Hotel LLC",
      corporation_location: "Boston",
      number_of_rooms: 150,
      pms_name: "opera",
      country: "US",
      currency: "USD",
      currency_symbol: "$",
    };

    const createdCorporation = {
      id: 3,
      uuid: "corp-3",
      ...newCorporation,
    };

    it("should add corporation successfully", async () => {
      mockUseFetch.mockResolvedValue({
        data: { value: { data: createdCorporation } },
      });

      const result = await store.addCorporation(newCorporation);

      expect(mockUseFetch).toHaveBeenCalledWith("/api/corporations", {
        method: "POST",
        body: newCorporation,
        server: false,
      });
      expect((result as any)?.data).toEqual(createdCorporation);
      expect(store.corporations).toHaveLength(1);
      expect(store.corporations[0]).toEqual(createdCorporation);
      expect(store.errorMessage).toBe("");
    });

    it("should handle add error", async () => {
      const errorMessage = "Validation failed";
      mockUseFetch.mockRejectedValue(new Error(errorMessage));

      await expect(store.addCorporation(newCorporation)).rejects.toThrow(
        errorMessage
      );
      expect(store.errorMessage).toBe(errorMessage);
    });

    it("should handle API error response", async () => {
      mockUseFetch.mockResolvedValue({
        data: { value: { error: "Corporation already exists" } },
      });

      await expect(store.addCorporation(newCorporation)).rejects.toThrow(
        "Corporation already exists"
      );
      expect(store.errorMessage).toBe("Corporation already exists");
    });

    it("should add corporation to beginning of array", async () => {
      store.corporations = [
        {
          id: 1,
          uuid: "corp-1",
          corporation_name: "Existing Hotel",
          legal_name: "Existing Hotel LLC",
          corporation_location: "New York",
          number_of_rooms: 100,
          pms_name: "opera",
          country: "US",
          currency: "USD",
          currency_symbol: "$",
        },
      ];

      mockUseFetch.mockResolvedValue({
        data: { value: { data: createdCorporation } },
      });

      await store.addCorporation(newCorporation);

      expect(store.corporations).toHaveLength(2);
      expect(store.corporations[0]).toEqual(createdCorporation);
    });
  });

  describe("getCorporationByUuid", () => {
    const mockCorporation = {
      id: 1,
      uuid: "corp-1",
      corporation_name: "Test Hotel",
      legal_name: "Test Hotel LLC",
      corporation_location: "New York",
      number_of_rooms: 100,
      pms_name: "opera",
      country: "US",
      currency: "USD",
      currency_symbol: "$",
    };

    it("should get corporation by uuid successfully", async () => {
      mockUseFetch.mockResolvedValue({
        data: { value: { data: mockCorporation } },
      });

      const result = await store.getCorporationByUuid("corp-1");

      expect(mockUseFetch).toHaveBeenCalledWith(
        "/api/corporations?uuid=corp-1",
        {
          server: false,
        }
      );
      expect(result).toEqual(mockCorporation);
    });

    it("should handle fetch error", async () => {
      const errorMessage = "Corporation not found";
      mockUseFetch.mockResolvedValue({
        data: { value: { error: errorMessage } },
      });

      await expect(store.getCorporationByUuid("non-existent")).rejects.toThrow(
        errorMessage
      );
      expect(store.errorMessage).toBe(errorMessage);
    });
  });

  describe("updateCorporation", () => {
    const existingCorporation = {
      id: 1,
      uuid: "corp-1",
      corporation_name: "Test Hotel",
      legal_name: "Test Hotel LLC",
      corporation_location: "New York",
      number_of_rooms: 100,
      pms_name: "opera",
      country: "US",
      currency: "USD",
      currency_symbol: "$",
    };

    const updateData = {
      corporation_name: "Test Hotel - Updated",
      number_of_rooms: 120,
    };

    const updatedCorporation = {
      ...existingCorporation,
      ...updateData,
    };

    beforeEach(() => {
      store.corporations = [existingCorporation];
    });

    it("should update corporation successfully", async () => {
      mockUseFetch.mockResolvedValue({
        data: { value: { data: updatedCorporation } },
      });

      const result = await store.updateCorporation("corp-1", updateData);

      expect(mockUseFetch).toHaveBeenCalledWith("/api/corporations", {
        method: "PUT",
        body: { uuid: "corp-1", ...updateData },
        server: false,
      });
      expect((result as any)?.data).toEqual(updatedCorporation);
      expect(store.corporations[0]).toEqual(updatedCorporation);
      expect(store.errorMessage).toBe("");
    });

    it("should handle update error", async () => {
      const errorMessage = "Update failed";
      mockUseFetch.mockResolvedValue({
        data: { value: { error: errorMessage } },
      });

      await expect(
        store.updateCorporation("corp-1", updateData)
      ).rejects.toThrow(errorMessage);
      expect(store.errorMessage).toBe(errorMessage);
      expect(store.corporations[0]).toEqual(existingCorporation); // Should not update on error
    });

    it("should update correct corporation when multiple exist", async () => {
      const anotherCorporation = {
        id: 2,
        uuid: "corp-2",
        corporation_name: "Another Hotel",
        legal_name: "Another Hotel LLC",
        corporation_location: "Miami",
        number_of_rooms: 200,
        pms_name: "fosse",
        country: "US",
        currency: "USD",
        currency_symbol: "$",
      };

      store.corporations = [existingCorporation, anotherCorporation];

      mockUseFetch.mockResolvedValue({
        data: { value: { data: updatedCorporation } },
      });

      await store.updateCorporation("corp-1", updateData);

      expect(store.corporations).toHaveLength(2);
      expect(store.corporations[0]).toEqual(updatedCorporation);
      expect(store.corporations[1]).toEqual(anotherCorporation);
    });

    it("should handle updating non-existent corporation", async () => {
      mockUseFetch.mockResolvedValue({
        data: { value: { data: updatedCorporation } },
      });

      await store.updateCorporation("non-existent", updateData);

      // Should not throw error, but also should not update anything
      expect(store.corporations[0]).toEqual(existingCorporation);
    });

    it("should use splice for reactivity", async () => {
      const spliceSpy = vi.spyOn(store.corporations, "splice");

      mockUseFetch.mockResolvedValue({
        data: { value: { data: updatedCorporation } },
      });

      await store.updateCorporation("corp-1", updateData);

      expect(spliceSpy).toHaveBeenCalledWith(0, 1, updatedCorporation);
    });
  });

  describe("deleteCorporation", () => {
    const corporationToDelete = {
      id: 1,
      uuid: "corp-1",
      corporation_name: "Test Hotel",
      legal_name: "Test Hotel LLC",
      corporation_location: "New York",
      number_of_rooms: 100,
      pms_name: "opera",
      country: "US",
      currency: "USD",
      currency_symbol: "$",
    };

    beforeEach(() => {
      store.corporations = [corporationToDelete];
    });

    it("should delete corporation successfully", async () => {
      mockUseFetch.mockResolvedValue({
        data: { value: { success: true } },
      });

      await store.deleteCorporation("corp-1");

      expect(mockUseFetch).toHaveBeenCalledWith(
        "/api/corporations?uuid=corp-1",
        {
          method: "DELETE",
          server: false,
        }
      );
      expect(store.corporations).toHaveLength(0);
      expect(store.errorMessage).toBe("");
    });

    it("should handle delete error", async () => {
      const errorMessage = "Delete failed";
      mockUseFetch.mockResolvedValue({
        data: { value: { error: errorMessage } },
      });

      await expect(store.deleteCorporation("corp-1")).rejects.toThrow(
        errorMessage
      );
      expect(store.errorMessage).toBe(errorMessage);
      expect(store.corporations).toHaveLength(1); // Should not remove on error
    });

    it("should delete correct corporation when multiple exist", async () => {
      const anotherCorporation = {
        id: 2,
        uuid: "corp-2",
        corporation_name: "Another Hotel",
        legal_name: "Another Hotel LLC",
        corporation_location: "Miami",
        number_of_rooms: 200,
        pms_name: "fosse",
        country: "US",
        currency: "USD",
        currency_symbol: "$",
      };

      store.corporations = [corporationToDelete, anotherCorporation];

      mockUseFetch.mockResolvedValue({
        data: { value: { success: true } },
      });

      await store.deleteCorporation("corp-1");

      expect(store.corporations).toHaveLength(1);
      expect(store.corporations[0]).toEqual(anotherCorporation);
    });

    it("should handle deleting non-existent corporation", async () => {
      mockUseFetch.mockResolvedValue({
        data: { value: { success: true } },
      });

      await store.deleteCorporation("non-existent");

      // Should not throw error
      expect(store.corporations).toHaveLength(1);
      expect(store.corporations[0]).toEqual(corporationToDelete);
    });
  });

  describe("ensureReady", () => {
    it("should fetch corporations if not ready", async () => {
      global.$fetch = vi
        .fn()
        .mockResolvedValue({ data: [{ id: 1, uuid: "corp-1" }] }) as any;

      const result = await store.ensureReady();

      expect(global.$fetch).toHaveBeenCalledWith("/api/corporations");
      expect(result).toBe(true);
      expect(store.corporations).toHaveLength(1);
    });

    it("should not fetch if already ready", async () => {
      store.corporations = [{ id: 1, uuid: "corp-1" }] as any;
      global.$fetch = vi.fn() as any;

      const result = await store.ensureReady();

      expect(global.$fetch).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe("initializeWithCorporation", () => {
    it("should fetch corporations if not loaded and set selected", async () => {
      global.$fetch = vi.fn().mockResolvedValue({
        data: [{ id: 1, uuid: "corp-1", corporation_name: "Test" }],
      }) as any;

      await store.initializeWithCorporation("corp-1");

      expect(global.$fetch).toHaveBeenCalledWith("/api/corporations");
      expect(store.selectedCorporationId).toBe("corp-1");
    });

    it("should not fetch if corporations already loaded", async () => {
      store.corporations = [
        { id: 1, uuid: "corp-1", corporation_name: "Test" },
      ] as any;
      global.$fetch = vi.fn() as any;

      await store.initializeWithCorporation("corp-1");

      expect(global.$fetch).not.toHaveBeenCalled();
      expect(store.selectedCorporationId).toBe("corp-1");
    });

    it("should handle null corporation ID", async () => {
      store.corporations = [
        { id: 1, uuid: "corp-1", corporation_name: "Test" },
      ] as any;

      await store.initializeWithCorporation(null);

      expect(store.selectedCorporationId).toBe(null);
    });
  });

  describe("Error Handling", () => {
    it("should clear error when operation succeeds", async () => {
      store.errorMessage = "Previous error";
      global.$fetch = vi.fn().mockResolvedValue({ data: [] }) as any;

      await store.fetchCorporations();

      expect(store.errorMessage).toBe("");
    });

    it("should handle API response errors", async () => {
      global.$fetch = vi.fn().mockResolvedValue({ error: "API Error" }) as any;

      await store.fetchCorporations();

      expect(store.errorMessage).toBe("API Error");
    });

    it("should preserve error message on failure", async () => {
      const errorMessage = "Failed to fetch";
      global.$fetch = vi.fn().mockRejectedValue(new Error(errorMessage)) as any;

      await store.fetchCorporations();

      expect(store.errorMessage).toBe(errorMessage);
    });
  });

  describe("Loading State", () => {
    it("should reset loading state after successful fetch", async () => {
      global.$fetch = vi.fn().mockResolvedValue({ data: [] }) as any;

      await store.fetchCorporations();

      expect(store.loading).toBe(false);
    });

    it("should reset loading state after failed fetch", async () => {
      global.$fetch = vi.fn().mockRejectedValue(new Error("Error")) as any;

      await store.fetchCorporations();

      expect(store.loading).toBe(false);
    });

    it("should set loading during add operation", async () => {
      let resolvePromise!: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockUseFetch.mockReturnValue(fetchPromise);

      const addCall = store.addCorporation({ corporation_name: "Test" } as any);

      expect(store.loading).toBe(true);

      resolvePromise({ data: { value: { data: { id: 1 } } } });
      await addCall;

      expect(store.loading).toBe(false);
    });
  });

  describe("IndexedDB Synchronization", () => {
    // Mock IndexedDB helpers using vi.hoisted
    const mockDbHelpers = vi.hoisted(() => ({
      addCorporation: vi.fn(),
      updateCorporation: vi.fn(),
      deleteCorporation: vi.fn(),
      deleteAllCorporations: vi.fn(),
      getCorporations: vi.fn(),
    }));

    vi.mock("@/utils/indexedDb", () => ({
      dbHelpers: mockDbHelpers,
    }));

    beforeEach(() => {
      // Clear all mocks before each test
      vi.clearAllMocks();
    });

    describe("addCorporation with IndexedDB sync", () => {
      it("should sync new corporation to IndexedDB", async () => {
        const newCorporationData = {
          corporation_name: "New Corporation",
          legal_name: "New Corporation LLC",
          corporation_location: "Boston",
          number_of_rooms: 150,
          pms_name: "opera",
          country: "US",
          currency: "USD",
          currency_symbol: "$",
        };

        const createdCorporation = {
          id: 3,
          uuid: "corp-3",
          ...newCorporationData,
        };

        mockUseFetch.mockResolvedValue({
          data: { value: { data: createdCorporation } },
        });

        mockDbHelpers.addCorporation.mockResolvedValue(undefined);

        const result = await store.addCorporation(newCorporationData);

        expect(mockDbHelpers.addCorporation).toHaveBeenCalledWith(
          createdCorporation
        );
        expect(store.corporations).toHaveLength(1);
        expect(store.corporations[0]).toEqual(createdCorporation);
        expect((result as any)?.data).toEqual(createdCorporation);
      });

      it("should handle IndexedDB sync failure gracefully", async () => {
        const newCorporationData = {
          corporation_name: "New Corporation",
          legal_name: "New Corporation LLC",
          corporation_location: "Boston",
          number_of_rooms: 150,
          pms_name: "opera",
          country: "US",
          currency: "USD",
          currency_symbol: "$",
        };

        const createdCorporation = {
          id: 3,
          uuid: "corp-3",
          ...newCorporationData,
        };

        mockUseFetch.mockResolvedValue({
          data: { value: { data: createdCorporation } },
        });

        mockDbHelpers.addCorporation.mockRejectedValue(
          new Error("IndexedDB error")
        );

        const consoleSpy = vi
          .spyOn(console, "warn")
          .mockImplementation(() => {});

        const result = await store.addCorporation(newCorporationData);

        expect(mockDbHelpers.addCorporation).toHaveBeenCalledWith(
          createdCorporation
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to sync corporation to IndexedDB:",
          expect.any(Error)
        );
        expect(store.corporations).toHaveLength(1);
        expect(store.corporations[0]).toEqual(createdCorporation);
        expect((result as any)?.data).toEqual(createdCorporation);

        consoleSpy.mockRestore();
      });
    });

    describe("updateCorporation with IndexedDB sync", () => {
      it("should sync updated corporation to IndexedDB", async () => {
        const existingCorporation = {
          id: 1,
          uuid: "corp-1",
          corporation_name: "Test Corporation",
          legal_name: "Test Corporation LLC",
          corporation_location: "New York",
          number_of_rooms: 100,
          pms_name: "opera",
          country: "US",
          currency: "USD",
          currency_symbol: "$",
        };

        const updateData = {
          corporation_name: "Updated Corporation",
          number_of_rooms: 120,
        };

        const updatedCorporation = {
          ...existingCorporation,
          ...updateData,
        };

        store.corporations = [existingCorporation];

        mockUseFetch.mockResolvedValue({
          data: { value: { data: updatedCorporation } },
        });

        mockDbHelpers.updateCorporation.mockResolvedValue(undefined);

        const result = await store.updateCorporation("corp-1", updateData);

        expect(mockDbHelpers.updateCorporation).toHaveBeenCalledWith(
          updatedCorporation
        );
        expect(store.corporations[0]).toEqual(updatedCorporation);
        expect((result as any)?.data).toEqual(updatedCorporation);
      });
    });

    describe("deleteCorporation with IndexedDB sync", () => {
      it("should sync corporation deletion to IndexedDB", async () => {
        const existingCorporation = {
          id: 1,
          uuid: "corp-1",
          corporation_name: "Test Corporation",
          legal_name: "Test Corporation LLC",
          corporation_location: "New York",
          number_of_rooms: 100,
          pms_name: "opera",
          country: "US",
          currency: "USD",
          currency_symbol: "$",
        };

        store.corporations = [existingCorporation];

        mockUseFetch.mockResolvedValue({
          data: { value: { success: true } },
        });

        mockDbHelpers.deleteCorporation.mockResolvedValue(undefined);

        const result = await store.deleteCorporation("corp-1");

        expect(mockDbHelpers.deleteCorporation).toHaveBeenCalledWith("corp-1");
        expect(store.corporations).toHaveLength(0);
        expect((result as any)?.success).toBe(true);
      });
    });

    describe("bulkImportCorporations", () => {
      it("should bulk import corporations and refresh from IndexedDB", async () => {
        const corporationsData = [
          {
            corporation_name: "Corporation 1",
            legal_name: "Corporation 1 LLC",
            corporation_location: "New York",
            number_of_rooms: 100,
            pms_name: "opera",
            country: "US",
            currency: "USD",
            currency_symbol: "$",
          },
          {
            corporation_name: "Corporation 2",
            legal_name: "Corporation 2 LLC",
            corporation_location: "Miami",
            number_of_rooms: 200,
            pms_name: "fosse",
            country: "US",
            currency: "USD",
            currency_symbol: "$",
          },
        ];

        const bulkResult = {
          success: true,
          message:
            "Import completed: 2 new corporations added, 0 duplicates skipped",
          data: {
            new: 2,
            duplicates: 0,
            total: 2,
            errors: 0,
          },
        };

        const refreshedCorporations = [
          {
            id: 1,
            uuid: "corp-1",
            ...corporationsData[0],
          },
          {
            id: 2,
            uuid: "corp-2",
            ...corporationsData[1],
          },
        ];

        global.$fetch = vi
          .fn()
          .mockResolvedValueOnce(bulkResult) // Bulk import call
          .mockResolvedValueOnce({ data: refreshedCorporations }); // Refresh call

        const result = await store.bulkImportCorporations(corporationsData);

        expect(global.$fetch).toHaveBeenCalledWith("/api/corporations/bulk", {
          method: "POST",
          body: {
            corporations: corporationsData,
          },
        });

        expect(global.$fetch).toHaveBeenCalledWith("/api/corporations");

        expect(result).toEqual(bulkResult);
        expect(store.corporations).toEqual(refreshedCorporations);
      });
    });

    describe("deleteAllCorporations", () => {
      it("should delete all corporations and sync to IndexedDB", async () => {
        const existingCorporations = [
          {
            id: 1,
            uuid: "corp-1",
            corporation_name: "Corporation 1",
            legal_name: "Corporation 1 LLC",
            corporation_location: "New York",
            number_of_rooms: 100,
            pms_name: "opera",
            country: "US",
            currency: "USD",
            currency_symbol: "$",
          },
          {
            id: 2,
            uuid: "corp-2",
            corporation_name: "Corporation 2",
            legal_name: "Corporation 2 LLC",
            corporation_location: "Miami",
            number_of_rooms: 200,
            pms_name: "fosse",
            country: "US",
            currency: "USD",
            currency_symbol: "$",
          },
        ];

        store.corporations = existingCorporations;

        const deleteResult = {
          success: true,
          message: "Successfully deleted 2 corporations",
          data: {
            deleted_count: 2,
          },
        };

        global.$fetch = vi.fn().mockResolvedValue(deleteResult);
        mockDbHelpers.deleteAllCorporations.mockResolvedValue(undefined);

        const result = await store.deleteAllCorporations();

        expect(global.$fetch).toHaveBeenCalledWith(
          "/api/corporations/delete-all",
          {
            method: "DELETE",
          }
        );

        expect(mockDbHelpers.deleteAllCorporations).toHaveBeenCalledWith();
        expect(store.corporations).toHaveLength(0);
        expect(result).toEqual(deleteResult);
      });

      it("should handle IndexedDB sync failure gracefully", async () => {
        const existingCorporations = [
          {
            id: 1,
            uuid: "corp-1",
            corporation_name: "Corporation 1",
            legal_name: "Corporation 1 LLC",
            corporation_location: "New York",
            number_of_rooms: 100,
            pms_name: "opera",
            country: "US",
            currency: "USD",
            currency_symbol: "$",
          },
        ];

        store.corporations = existingCorporations;

        const deleteResult = {
          success: true,
          message: "Successfully deleted 1 corporation",
          data: {
            deleted_count: 1,
          },
        };

        global.$fetch = vi.fn().mockResolvedValue(deleteResult);
        mockDbHelpers.deleteAllCorporations.mockRejectedValue(
          new Error("IndexedDB error")
        );

        const consoleSpy = vi
          .spyOn(console, "warn")
          .mockImplementation(() => {});

        const result = await store.deleteAllCorporations();

        expect(mockDbHelpers.deleteAllCorporations).toHaveBeenCalledWith();
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to sync corporations bulk deletion to IndexedDB:",
          expect.any(Error)
        );
        expect(store.corporations).toHaveLength(0);
        expect(result).toEqual(deleteResult);

        consoleSpy.mockRestore();
      });
    });

    describe("fetchCorporationsFromDB", () => {
      it("should fetch corporations from IndexedDB", async () => {
        const dbCorporations = [
          {
            id: 1,
            uuid: "corp-1",
            corporation_name: "DB Corporation",
            legal_name: "DB Corporation LLC",
            corporation_location: "Database",
            number_of_rooms: 100,
            pms_name: "opera",
            country: "US",
            currency: "USD",
            currency_symbol: "$",
          },
        ];

        mockDbHelpers.getCorporations.mockResolvedValue(dbCorporations);

        await store.fetchCorporationsFromDB();

        expect(mockDbHelpers.getCorporations).toHaveBeenCalled();
        expect(store.corporations).toEqual(dbCorporations);
        expect(store.loading).toBe(false);
        expect(store.errorMessage).toBe("");
      });

      it("should handle IndexedDB fetch error", async () => {
        const errorMessage = "IndexedDB error";
        mockDbHelpers.getCorporations.mockRejectedValue(
          new Error(errorMessage)
        );

        await store.fetchCorporationsFromDB();

        expect(store.corporations).toEqual([]);
        expect(store.loading).toBe(false);
        expect(store.errorMessage).toBe(errorMessage);
      });
    });
  });

  describe("setSelectedCorporationAndFetchData integration with estimates", () => {
    it("should call estimatesStore.fetchEstimates after syncing corporation data", async () => {
      const corpId = "corp-xyz";

      // Mocks for dynamically imported stores
      const projectTypesFetch = vi.fn().mockResolvedValue(undefined);
      const serviceTypesFetch = vi.fn().mockResolvedValue(undefined);
      const costCodeDivisionsFetch = vi.fn().mockResolvedValue(undefined);
      const chartOfAccountsFetch = vi.fn().mockResolvedValue(undefined);
      const vendorsFetch = vi.fn().mockResolvedValue(undefined);
      const storageLocationsFetch = vi.fn().mockResolvedValue(undefined);
      const poInstructionsFetch = vi.fn().mockResolvedValue(undefined);
      const uomFetch = vi.fn().mockResolvedValue(undefined);
      const billEntriesFetch = vi.fn().mockResolvedValue(undefined);
      const projectsFetch = vi.fn().mockResolvedValue(undefined);
      const itemTypesFetch = vi.fn().mockResolvedValue(undefined);
      const costCodeConfigurationsFetch = vi.fn().mockResolvedValue(undefined);
      const estimatesFetch = vi.fn().mockResolvedValue(undefined);

      // Mock dynamic imports used inside setSelectedCorporationAndFetchData
      vi.doMock("@/stores/projectTypes", () => ({
        useProjectTypesStore: () => ({ fetchProjectTypes: projectTypesFetch }),
      }));
      vi.doMock("@/stores/serviceTypes", () => ({
        useServiceTypesStore: () => ({ fetchServiceTypes: serviceTypesFetch }),
      }));
      vi.doMock("@/stores/costCodeDivisions", () => ({
        useCostCodeDivisionsStore: () => ({
          fetchDivisions: costCodeDivisionsFetch,
        }),
      }));
      vi.doMock("@/stores/chartOfAccounts", () => ({
        useChartOfAccountsStore: () => ({
          fetchAccounts: chartOfAccountsFetch,
        }),
      }));
      vi.doMock("@/stores/vendors", () => ({
        useVendorStore: () => ({ fetchVendors: vendorsFetch }),
      }));
      vi.doMock("@/stores/storageLocations", () => ({
        useStorageLocationsStore: () => ({
          fetchStorageLocations: storageLocationsFetch,
        }),
      }));
      vi.doMock("@/stores/poInstructions", () => ({
        usePOInstructionsStore: () => ({
          fetchPOInstructions: poInstructionsFetch,
        }),
      }));
      vi.doMock("@/stores/uom", () => ({
        useUOMStore: () => ({ fetchUOM: uomFetch }),
      }));
      vi.doMock("@/stores/billEntries", () => ({
        useBillEntriesStore: () => ({ fetchBillEntries: billEntriesFetch }),
      }));
      vi.doMock("@/stores/projects", () => ({
        useProjectsStore: () => ({ fetchProjects: projectsFetch }),
      }));
      vi.doMock("@/stores/itemTypes", () => ({
        useItemTypesStore: () => ({ fetchItemTypes: itemTypesFetch }),
      }));
      vi.doMock("@/stores/costCodeConfigurations", () => ({
        useCostCodeConfigurationsStore: () => ({
          fetchConfigurations: costCodeConfigurationsFetch,
        }),
      }));
      vi.doMock("@/stores/estimates", () => ({
        useEstimatesStore: () => ({ fetchEstimates: estimatesFetch }),
      }));

      // Mock date range store to provide params
      vi.doMock("@/stores/dateRange", () => ({
        useDateRangeStore: () => ({
          dateRangeParams: { start_date: "2024-01-01", end_date: "2024-12-31" },
        }),
      }));

      // Mock useIndexedDB.syncCorporationData
      vi.doMock("@/composables/useIndexedDB", () => ({
        useIndexedDB: () => ({
          syncCorporationData: vi.fn().mockResolvedValue(undefined),
        }),
      }));

      // Re-import the store under test to use mocked modules
      const { useCorporationStore: freshUseCorporationStore } = await import(
        "@/stores/corporations"
      );
      const freshStore = freshUseCorporationStore();

      await freshStore.setSelectedCorporationAndFetchData(corpId);

      expect(estimatesFetch).toHaveBeenCalledTimes(1);
      expect(estimatesFetch).toHaveBeenCalledWith(corpId);

      // Also ensure projects were fetched as part of the flow
      expect(projectsFetch).toHaveBeenCalledWith(corpId);
    });
  });
})

