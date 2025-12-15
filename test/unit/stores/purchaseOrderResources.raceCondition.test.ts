import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { usePurchaseOrderResourcesStore } from "@/stores/purchaseOrderResources";

/**
 * Race Condition Tests for purchaseOrderResources Store
 * 
 * These tests specifically verify that the promise-based synchronization
 * prevents race conditions when multiple actions try to load data simultaneously.
 * 
 * Scenario that was fixed:
 * 1. Component calls ensurePreferredItems for an existing PO
 * 2. ensurePreferredItems calls ensureCostCodeConfigurations
 * 3. ensureCostCodeConfigurations starts fetching from API
 * 4. Before fetch completes, ensurePreferredItems tries to extract preferred items
 * 5. Without proper synchronization, it would extract from empty configs array
 * 6. This caused sequence and item name to be missing in UI
 * 
 * Fix:
 * - Added costCodeConfigurationsPromise to track ongoing fetch
 * - When loading is already in progress, subsequent calls await the promise
 * - This ensures all callers get the fully loaded data, not empty arrays
 */

describe("purchaseOrderResources store - Race Condition Handling", () => {
  let store: ReturnType<typeof usePurchaseOrderResourcesStore>;
  let fetchSpy: ReturnType<typeof vi.fn>;
  let fetchDelay = 100; // ms delay to simulate network latency

  const mockConfigsWithPreferredItems = [
    {
      uuid: "cfg-1",
      corporation_uuid: "corp-1",
      cost_code_number: "100",
      cost_code_name: "Concrete",
      preferred_items: [
        {
          uuid: "item-1",
          item_uuid: "item-1",
          item_type_uuid: "type-1",
          item_name: "LED Panel Lights",
          name: "LED Panel Lights",
          item_sequence: "SEQ-001",
          sequence: "SEQ-001",
          unit_uuid: "uom-ea",
          unit: "EA",
          unit_price: 50,
          description: "LED Lights",
          status: "Active",
        },
        {
          uuid: "item-2",
          item_uuid: "item-2",
          item_type_uuid: "type-1",
          item_name: "LED Strip Lights",
          name: "LED Strip Lights",
          item_sequence: "SEQ-002",
          sequence: "SEQ-002",
          unit_uuid: "uom-ea",
          unit: "EA",
          unit_price: 75,
          description: "Strip Lights",
          status: "Active",
        },
      ],
    },
    {
      uuid: "cfg-2",
      corporation_uuid: "corp-1",
      cost_code_number: "200",
      cost_code_name: "Electrical",
      preferred_items: [
        {
          uuid: "item-3",
          item_uuid: "item-3",
          item_type_uuid: "type-2",
          item_name: "False Ceiling Gypsum Boards",
          name: "False Ceiling Gypsum Boards",
          item_sequence: "SEQ-003",
          sequence: "SEQ-003",
          unit_uuid: "uom-sqft",
          unit: "SQFT",
          unit_price: 120,
          description: "Gypsum Boards",
          status: "Active",
        },
      ],
    },
  ];

  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);

    // Mock $fetch with artificial delay to simulate real API latency
    fetchSpy = vi.fn(async (url: string) => {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, fetchDelay));

      if (url.includes("/api/cost-code-configurations")) {
        return { data: mockConfigsWithPreferredItems };
      }
      if (url.includes("/api/item-types")) {
        return { data: [] };
      }
      if (url.includes("/api/estimates")) {
        return { data: [] };
      }
      return { data: [] };
    });
    vi.stubGlobal("$fetch", fetchSpy);

    store = usePurchaseOrderResourcesStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("ensureCostCodeConfigurations - Promise Synchronization", () => {
    it("should wait for ongoing fetch when called while loading", async () => {
      // Start first call (doesn't await yet)
      const firstCall = store.ensureCostCodeConfigurations({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      // Immediately start second call while first is still loading
      const secondCall = store.ensureCostCodeConfigurations({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      // Both should complete with the same data
      const [firstResult, secondResult] = await Promise.all([
        firstCall,
        secondCall,
      ]);

      // Verify both got the full data, not empty arrays
      expect(firstResult).toHaveLength(2);
      expect(secondResult).toHaveLength(2);
      expect(firstResult[0].preferred_items).toHaveLength(2);
      expect(secondResult[0].preferred_items).toHaveLength(2);

      // Verify API was only called once (second call waited for first)
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple parallel calls correctly", async () => {
      // Start 5 parallel calls
      const calls = Array.from({ length: 5 }, () =>
        store.ensureCostCodeConfigurations({
          corporationUuid: "corp-1",
          projectUuid: "proj-1",
        })
      );

      const results = await Promise.all(calls);

      // All calls should return the same fully loaded data
      results.forEach((result) => {
        expect(result).toHaveLength(2);
        expect(result[0].preferred_items).toHaveLength(2);
        expect(result[0].preferred_items[0].item_sequence).toBe("SEQ-001");
      });

      // API should only be called once
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("should clear promise after fetch completes", async () => {
      // First call
      await store.ensureCostCodeConfigurations({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      fetchSpy.mockClear();

      // Second call after completion (should use cache, not trigger new fetch)
      await store.ensureCostCodeConfigurations({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      // Should not make a new API call (data is cached)
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("ensurePreferredItems - Race Condition with Config Loading", () => {
    it("should wait for config loading before extracting preferred items", async () => {
      // This simulates the bug scenario:
      // 1. ensurePreferredItems is called
      // 2. It calls ensureCostCodeConfigurations which starts loading
      // 3. Without the fix, it would try to extract items before loading completes

      const preferredItems = await store.ensurePreferredItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      // Verify we got all preferred items from all configs
      expect(preferredItems).toHaveLength(3); // 2 from cfg-1 + 1 from cfg-2
      expect(preferredItems[0].item_sequence).toBe("SEQ-001");
      expect(preferredItems[0].item_name).toBe("LED Panel Lights");
      expect(preferredItems[1].item_sequence).toBe("SEQ-002");
      expect(preferredItems[1].item_name).toBe("LED Strip Lights");
      expect(preferredItems[2].item_sequence).toBe("SEQ-003");
      expect(preferredItems[2].item_name).toBe("False Ceiling Gypsum Boards");

      // Verify the getter returns the same data
      const getterResult = store.getPreferredItems("corp-1", "proj-1");
      expect(getterResult).toHaveLength(3);
      expect(getterResult[0].item_sequence).toBe("SEQ-001");
    });

    it("should handle parallel calls to ensurePreferredItems correctly", async () => {
      // Start multiple calls simultaneously
      const calls = Array.from({ length: 3 }, () =>
        store.ensurePreferredItems({
          corporationUuid: "corp-1",
          projectUuid: "proj-1",
        })
      );

      const results = await Promise.all(calls);

      // All calls should return the same fully loaded data
      results.forEach((result) => {
        expect(result).toHaveLength(3);
        expect(result[0].item_sequence).toBe("SEQ-001");
        expect(result[0].item_name).toBe("LED Panel Lights");
      });

      // Config API should only be called once
      const configCalls = fetchSpy.mock.calls.filter((call) =>
        call[0].includes("/api/cost-code-configurations")
      );
      expect(configCalls).toHaveLength(1);
    });

    it("should extract items with all required fields for SequenceSelect/ItemSelect", async () => {
      const preferredItems = await store.ensurePreferredItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      // Verify each item has all fields needed for UI components
      preferredItems.forEach((item) => {
        expect(item).toHaveProperty("uuid");
        expect(item).toHaveProperty("item_uuid");
        expect(item).toHaveProperty("item_name");
        expect(item).toHaveProperty("name");
        expect(item).toHaveProperty("item_sequence");
        expect(item).toHaveProperty("sequence");
        expect(item.item_sequence).toBeTruthy(); // Should have a sequence
        expect(item.item_name).toBeTruthy(); // Should have a name
      });
    });
  });

  describe("Integration: Full Flow from Component Mount", () => {
    it("simulates opening an existing PO with 'Import from Master' items", async () => {
      // This simulates what happens in PurchaseOrderForm.vue when opening
      // an existing PO that has include_items: 'IMPORT_ITEMS_FROM_MASTER'

      // Step 1: Component mounts and calls ensurePreferredItems
      const preferredItemsPromise = store.ensurePreferredItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      // Step 2: Before awaiting, check that loading state is correct
      expect(store.getPreferredItemsLoading("corp-1", "proj-1")).toBe(true);

      // Step 3: Await the result
      const preferredItems = await preferredItemsPromise;

      // Step 4: Verify we got the full data
      expect(preferredItems).toHaveLength(3);
      expect(preferredItems[0].item_sequence).toBe("SEQ-001");
      expect(preferredItems[0].item_name).toBe("LED Panel Lights");

      // Step 5: Verify loading is complete
      expect(store.getPreferredItemsLoading("corp-1", "proj-1")).toBe(false);

      // Step 6: Verify configs were also loaded with preferred_items
      const configs = store.getCostCodeConfigurations("corp-1", "proj-1");
      expect(configs).toHaveLength(2);
      expect(configs[0].preferred_items).toHaveLength(2);
      expect(configs[0].preferred_items[0].item_sequence).toBe("SEQ-001");
    });

    it("verifies sequence and item name are available for mapping", async () => {
      // Load preferred items
      await store.ensurePreferredItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      // Simulate what mapPoItemForDisplay does: lookup item by item_uuid
      const preferredItems = store.getPreferredItems("corp-1", "proj-1");
      
      // Create a map like preferredItemOptionMap in PurchaseOrderForm
      const itemMap = new Map(
        preferredItems.map((item) => [String(item.item_uuid), item])
      );

      // Simulate looking up a saved PO item
      const savedItem = { item_uuid: "item-1" };
      const matchedItem = itemMap.get(String(savedItem.item_uuid));

      // Verify the matched item has sequence and name
      expect(matchedItem).toBeDefined();
      expect(matchedItem?.item_sequence).toBe("SEQ-001");
      expect(matchedItem?.item_name).toBe("LED Panel Lights");
      expect(matchedItem?.sequence).toBe("SEQ-001");
      expect(matchedItem?.name).toBe("LED Panel Lights");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle API errors gracefully", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("API Error"));

      await store.ensureCostCodeConfigurations({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        force: true,
      });

      // Should not throw, and should return empty array
      const configs = store.getCostCodeConfigurations("corp-1", "proj-1");
      expect(configs).toEqual([]);
    });

    it("should handle force refresh while loading", async () => {
      // Start normal load
      const normalLoad = store.ensureCostCodeConfigurations({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      // Force refresh while loading
      const forceRefresh = store.ensureCostCodeConfigurations({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        force: true,
      });

      const [normalResult, forceResult] = await Promise.all([
        normalLoad,
        forceRefresh,
      ]);

      // Both should complete with data
      expect(normalResult).toHaveLength(2);
      expect(forceResult).toHaveLength(2);

      // Force should trigger a new fetch
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it("should handle configs without preferred_items field", async () => {
      fetchSpy.mockResolvedValueOnce({
        data: [
          {
            uuid: "cfg-no-items",
            corporation_uuid: "corp-1",
            cost_code_number: "300",
            cost_code_name: "Test",
            // No preferred_items field
          },
        ],
      });

      const preferredItems = await store.ensurePreferredItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      // Should return empty array, not crash
      expect(preferredItems).toEqual([]);
    });

    it("should handle empty preferred_items array", async () => {
      fetchSpy.mockResolvedValueOnce({
        data: [
          {
            uuid: "cfg-empty-items",
            corporation_uuid: "corp-1",
            cost_code_number: "300",
            cost_code_name: "Test",
            preferred_items: [], // Empty array
          },
        ],
      });

      const preferredItems = await store.ensurePreferredItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      // Should return empty array
      expect(preferredItems).toEqual([]);
    });
  });

  describe("Performance: Verifying API is called with correct parameters", () => {
    it("should include with_preferred_items query parameter", async () => {
      await store.ensureCostCodeConfigurations({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/cost-code-configurations",
        expect.objectContaining({
          method: "GET",
          query: expect.objectContaining({
            corporation_uuid: "corp-1",
            with_preferred_items: true,
          }),
        })
      );
    });

    it("should not fetch again when data is already loaded", async () => {
      // First load
      await store.ensurePreferredItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      fetchSpy.mockClear();

      // Second load (should use cache)
      await store.ensurePreferredItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
