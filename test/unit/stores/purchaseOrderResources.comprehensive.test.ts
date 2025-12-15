import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createPinia, setActivePinia, defineStore } from "pinia";
import { ref, computed } from "vue";
import { usePurchaseOrderResourcesStore } from "@/stores/purchaseOrderResources";

let mockItemTypesResponse: any[] = [];
let mockConfigurationsResponse: any[] = [];
let mockEstimatesResponse: any[] = [];
let fetchSpy: ReturnType<typeof vi.fn>;

// Mock $fetch for API calls (store now fetches directly from API, not from global stores)
vi.stubGlobal("$fetch", vi.fn());

describe("PurchaseOrderResources Store - Comprehensive Tests", () => {
  let store: ReturnType<typeof usePurchaseOrderResourcesStore>;

  beforeEach(async () => {
    setActivePinia(createPinia());
    store = usePurchaseOrderResourcesStore();
    vi.clearAllMocks();

    mockItemTypesResponse = [
      {
        uuid: "type-project",
        corporation_uuid: "corp-1",
        project_uuid: "proj-1",
        item_type: "Material",
        short_name: "MAT",
        is_active: true,
      },
      {
        uuid: "type-corp",
        corporation_uuid: "corp-1",
        project_uuid: null,
        item_type: "Labor",
        short_name: "LAB",
        is_active: true,
      },
    ];

    mockConfigurationsResponse = [
      {
        uuid: "config-1",
        corporation_uuid: "corp-1",
        cost_code_number: "CC-001",
        cost_code_name: "Material",
        preferred_items: [
          {
            item_uuid: "item-1",
            item_name: "Preferred Item 1",
            unit_price: 100,
            quantity: 5,
            project_uuid: "proj-1",
          },
          {
            item_uuid: "item-2",
            item_name: "Preferred Item 2",
            unit_price: 200,
            quantity: 3,
            project_uuid: null,
          },
        ],
      },
    ];

    mockEstimatesResponse = [
      {
        uuid: "est-1",
        corporation_uuid: "corp-1",
        project_uuid: "proj-1",
        estimate_number: "EST-001",
        status: "Approved",
      },
    ];

    // Mock $fetch to return different responses based on URL
    fetchSpy = vi.fn(async (url: string, options?: any) => {
      if (url.includes("/api/item-types")) {
        return { data: mockItemTypesResponse };
      }
      if (url.includes("/api/cost-code-configurations")) {
        return { data: mockConfigurationsResponse };
      }
      if (url.includes("/api/estimates")) {
        return { data: mockEstimatesResponse };
      }
      if (url.includes("/api/estimate-line-items")) {
        return { data: [] };
      }
      return { data: [] };
    });
    vi.stubGlobal("$fetch", fetchSpy);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("ensureItemTypes", () => {
    it("should fetch item types for project scope", async () => {
      const result = await store.ensureItemTypes({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/item-types",
        expect.objectContaining({
          method: "GET",
          query: expect.objectContaining({
            corporation_uuid: "corp-1",
            project_uuid: "proj-1",
          }),
        })
      );
      // Store includes both project-specific and corporation-level active item types
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((item: any) => item.uuid === "type-project")).toBe(true);
    });

    it("should fetch item types for corporation scope", async () => {
      const result = await store.ensureItemTypes({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      expect(fetchSpy).toHaveBeenCalled();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should not fetch if already loaded", async () => {
      await store.ensureItemTypes({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });
      const initialCallCount = fetchSpy.mock.calls.length;
      fetchSpy.mockClear();

      await store.ensureItemTypes({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("should force refresh when force is true", async () => {
      await store.ensureItemTypes({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });
      fetchSpy.mockClear();

      await store.ensureItemTypes({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        force: true,
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/item-types",
        expect.objectContaining({
          method: "GET",
          query: expect.objectContaining({
            corporation_uuid: "corp-1",
            project_uuid: "proj-1",
          }),
        })
      );
    });

    it("should handle fetch errors gracefully", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Fetch failed"));

      const result = await store.ensureItemTypes({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      expect(result).toEqual([]);
    });
  });

  describe("ensurePreferredItems", () => {
    it("should fetch preferred items for project", async () => {
      const result = await store.ensurePreferredItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/cost-code-configurations",
        expect.objectContaining({
          method: "GET",
          query: expect.objectContaining({
            corporation_uuid: "corp-1",
          }),
        })
      );
      expect(result).toHaveLength(2);
      expect(result[0].item_uuid).toBe("item-1");
    });

    it("should filter preferred items by project", async () => {
      const result = await store.ensurePreferredItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      const projectItems = result.filter((item: any) => item.project_uuid === "proj-1");
      expect(projectItems.length).toBeGreaterThan(0);
    });

    it("should include corporation-wide items when project specified", async () => {
      const result = await store.ensurePreferredItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      const corpItems = result.filter((item: any) => !item.project_uuid);
      expect(corpItems.length).toBeGreaterThan(0);
    });

    it("should not fetch if already loaded", async () => {
      await store.ensurePreferredItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });
      const initialCallCount = fetchSpy.mock.calls.length;
      fetchSpy.mockClear();

      await store.ensurePreferredItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("should force refresh when force is true", async () => {
      await store.ensurePreferredItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });
      fetchSpy.mockClear();

      await store.ensurePreferredItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        force: true,
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/cost-code-configurations",
        expect.objectContaining({
          method: "GET",
          query: expect.objectContaining({
            corporation_uuid: "corp-1",
          }),
        })
      );
    });

    it("should handle fetch errors gracefully", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Fetch failed"));

      const result = await store.ensurePreferredItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      expect(result).toEqual([]);
    });
  });

  describe("ensureEstimateItems", () => {
    const mockEstimateResponse = {
      data: [
        {
          cost_code_uuid: "cc-1",
          cost_code_number: "CC-001",
          cost_code_name: "Material",
          material_items: [
            {
              item_uuid: "item-1",
              name: "Material Item 1",
              unit_price: 50,
              quantity: 10,
              total: 500,
              unit_label: "EA",
            },
            {
              item_uuid: "item-2",
              name: "Material Item 2",
              unit_price: 75,
              quantity: 5,
              total: 375,
              unit_label: "EA",
            },
          ],
        },
      ],
    };

    it("should fetch estimate items successfully", async () => {
      ;(global.$fetch as any).mockResolvedValue(mockEstimateResponse);

      const result = await store.ensureEstimateItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: "est-1",
      });

      expect(global.$fetch).toHaveBeenCalledWith(
        "/api/estimate-line-items",
        expect.objectContaining({
          method: "GET",
          query: {
            project_uuid: "proj-1",
            estimate_uuid: "est-1",
            corporation_uuid: "corp-1",
          },
        })
      );
      expect(result).toHaveLength(2);
      expect(result[0].item_uuid).toBe("item-1");
    });

    it("should transform estimate items to PO items format", async () => {
      ;(global.$fetch as any).mockResolvedValue(mockEstimateResponse);

      const result = await store.ensureEstimateItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: "est-1",
      });

      expect(result[0]).toHaveProperty("cost_code_uuid");
      expect(result[0]).toHaveProperty("item_uuid");
      expect(result[0]).toHaveProperty("unit_price");
      expect(result[0]).toHaveProperty("quantity");
      expect(result[0]).toHaveProperty("display_metadata");
    });

    it("should preserve sequence from estimate items in transformed PO items", async () => {
      const responseWithSequence = {
        data: [
          {
            cost_code_uuid: "cc-1",
            cost_code_number: "001",
            cost_code_name: "Concrete Work",
            division_name: "Division A",
            material_items: [
              {
                item_uuid: "item-1",
                name: "Concrete Mix",
                sequence: "FA-301", // Sequence from estimate
                item_sequence: "FA-301",
                quantity: 3,
                unit_price: 25,
                unit_uuid: "uom-ea",
                unit: "EA",
                unit_label: "EA",
                description: "High-strength concrete",
              },
            ],
          },
        ],
      };

      ;(global.$fetch as any).mockResolvedValue(responseWithSequence);

      const result = await store.ensureEstimateItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: "est-1",
      });

      expect(result[0]).toHaveProperty("sequence");
      expect(result[0]).toHaveProperty("item_sequence");
      expect(result[0].sequence).toBe("FA-301");
      expect(result[0].item_sequence).toBe("FA-301");
      expect(result[0].display_metadata.sequence).toBe("FA-301");
    });

    it("should handle estimate items with sequence field but no item_sequence", async () => {
      const responseWithSequenceOnly = {
        data: [
          {
            cost_code_uuid: "cc-1",
            cost_code_number: "001",
            cost_code_name: "Concrete Work",
            division_name: "Division A",
            material_items: [
              {
                item_uuid: "item-1",
                name: "Concrete Mix",
                sequence: "FA-301", // Only sequence field
                quantity: 3,
                unit_price: 25,
                unit_uuid: "uom-ea",
                unit: "EA",
                unit_label: "EA",
                description: "High-strength concrete",
              },
            ],
          },
        ],
      };

      ;(global.$fetch as any).mockResolvedValue(responseWithSequenceOnly);

      const result = await store.ensureEstimateItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: "est-1",
      });

      expect(result[0].sequence).toBe("FA-301");
      expect(result[0].item_sequence).toBe("FA-301");
      expect(result[0].display_metadata.sequence).toBe("FA-301");
    });

    it("should handle estimate items without sequence gracefully", async () => {
      const responseWithoutSequence = {
        data: [
          {
            cost_code_uuid: "cc-1",
            cost_code_number: "001",
            cost_code_name: "Concrete Work",
            division_name: "Division A",
            material_items: [
              {
                item_uuid: "item-1",
                name: "Concrete Mix",
                // No sequence fields
                quantity: 3,
                unit_price: 25,
                unit_uuid: "uom-ea",
                unit: "EA",
                unit_label: "EA",
                description: "High-strength concrete",
              },
            ],
          },
        ],
      };

      ;(global.$fetch as any).mockResolvedValue(responseWithoutSequence);

      const result = await store.ensureEstimateItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: "est-1",
      });

      expect(result[0]).toHaveProperty("sequence");
      expect(result[0]).toHaveProperty("item_sequence");
      expect(result[0].sequence).toBe("");
      expect(result[0].item_sequence).toBe("");
      expect(result[0].display_metadata.sequence).toBe("");
    });

    it("should return empty array if estimateUuid is not provided", async () => {
      const result = await store.ensureEstimateItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: null,
      });

      expect(result).toEqual([]);
      expect(global.$fetch).not.toHaveBeenCalled();
    });

    it("should not fetch if already loaded", async () => {
      ;(global.$fetch as any).mockResolvedValue(mockEstimateResponse);

      await store.ensureEstimateItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: "est-1",
      });
      vi.clearAllMocks();

      const result = await store.ensureEstimateItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: "est-1",
      });

      expect(global.$fetch).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it("should force refresh when force is true", async () => {
      ;(global.$fetch as any).mockResolvedValue(mockEstimateResponse);

      await store.ensureEstimateItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: "est-1",
      });
      vi.clearAllMocks();

      await store.ensureEstimateItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: "est-1",
        force: true,
      });

      expect(global.$fetch).toHaveBeenCalled();
    });

    it("should handle API errors gracefully", async () => {
      ;(global.$fetch as any).mockRejectedValue(new Error("API Error"));

      const result = await store.ensureEstimateItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: "est-1",
      });

      expect(result).toEqual([]);
    });

    it("should handle empty response", async () => {
      ;(global.$fetch as any).mockResolvedValue({ data: [] });

      const result = await store.ensureEstimateItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: "est-1",
      });

      expect(result).toEqual([]);
    });

    it("should normalize unit prices and quantities", async () => {
      const responseWithVariations = {
        data: [
          {
            cost_code_uuid: "cc-1",
            material_items: [
              {
                item_uuid: "item-1",
                unitPrice: 50, // Alternative field name
                qty: 10, // Alternative field name
              },
            ],
          },
        ],
      };
      ;(global.$fetch as any).mockResolvedValue(responseWithVariations);

      const result = await store.ensureEstimateItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: "est-1",
      });

      expect(result[0].unit_price).toBe(50);
      expect(result[0].quantity).toBe(10);
    });

    it("should calculate total if not provided", async () => {
      const responseWithoutTotal = {
        data: [
          {
            cost_code_uuid: "cc-1",
            material_items: [
              {
                item_uuid: "item-1",
                unit_price: 50,
                quantity: 10,
                // total not provided
              },
            ],
          },
        ],
      };
      ;(global.$fetch as any).mockResolvedValue(responseWithoutTotal);

      const result = await store.ensureEstimateItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: "est-1",
      });

      expect(result[0].total).toBe(500);
    });

    it("should return cached items on server side", async () => {
      const originalWindow = global.window;
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
      });

      const result = await store.ensureEstimateItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: "est-1",
      });

      expect(result).toEqual([]);
      expect(global.$fetch).not.toHaveBeenCalled();

      Object.defineProperty(global, "window", {
        value: originalWindow,
        writable: true,
      });
    });
  });

  describe("ensureProjectResources", () => {
    it("should fetch all project resources", async () => {
      await store.ensureProjectResources({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: "est-1",
      });

      // Verify API calls were made for item types, configurations, estimates, and estimate items
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/item-types",
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/cost-code-configurations",
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/estimates",
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/estimate-line-items",
        expect.objectContaining({
          method: "GET",
        })
      );
    });

    it("should skip estimate items if estimateUuid not provided", async () => {
      await store.ensureProjectResources({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      // Verify item types, configurations, and estimates were fetched
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/item-types",
        expect.anything()
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/cost-code-configurations",
        expect.anything()
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/estimates",
        expect.anything()
      );
      // Estimate items should not be fetched
      const estimateItemCalls = fetchSpy.mock.calls.filter(
        (call: any[]) => call[0]?.includes("/api/estimate-line-items")
      );
      expect(estimateItemCalls).toHaveLength(0);
    });

    it("should handle missing corporation or project UUID", async () => {
      await store.ensureProjectResources({
        corporationUuid: "",
        projectUuid: "proj-1",
      });

      // Should not make any API calls if corporation UUID is missing
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("fetchPurchaseOrderItems", () => {
    const mockPOItems = [
      {
        uuid: "poi-1",
        purchase_order_uuid: "po-1",
        item_uuid: "item-1",
        po_quantity: 10,
        po_unit_price: 50,
        po_total: 500,
      },
      {
        uuid: "poi-2",
        purchase_order_uuid: "po-1",
        item_uuid: "item-2",
        po_quantity: 5,
        po_unit_price: 100,
        po_total: 500,
      },
    ];

    it("should fetch purchase order items successfully", async () => {
      ;(global.$fetch as any).mockResolvedValue({
        data: mockPOItems,
      });

      const result = await store.fetchPurchaseOrderItems("po-1");

      expect(global.$fetch).toHaveBeenCalledWith(
        "/api/purchase-order-items",
        expect.objectContaining({
          method: "GET",
          query: {
            purchase_order_uuid: "po-1",
          },
        })
      );
      expect(result).toHaveLength(2);
      expect(result[0].uuid).toBe("poi-1");
    });

    it("should return empty array on error", async () => {
      ;(global.$fetch as any).mockRejectedValue(new Error("API Error"));

      const result = await store.fetchPurchaseOrderItems("po-1");

      expect(result).toEqual([]);
    });

    it("should return empty array if purchaseOrderUuid is empty", async () => {
      const result = await store.fetchPurchaseOrderItems("");

      expect(result).toEqual([]);
      expect(global.$fetch).not.toHaveBeenCalled();
    });

    it("should return empty array on server side", async () => {
      const originalWindow = global.window;
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
      });

      const result = await store.fetchPurchaseOrderItems("po-1");

      expect(result).toEqual([]);
      expect(global.$fetch).not.toHaveBeenCalled();

      Object.defineProperty(global, "window", {
        value: originalWindow,
        writable: true,
      });
    });

    it("should handle non-array response", async () => {
      ;(global.$fetch as any).mockResolvedValue({
        data: null,
      });

      const result = await store.fetchPurchaseOrderItems("po-1");

      expect(result).toEqual([]);
    });
  });

  describe("getItemTypes", () => {
    it("should return item types for project", async () => {
      await store.ensureItemTypes({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      const result = store.getItemTypes("corp-1", "proj-1");

      // Store includes both project-specific and corporation-level active item types
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((item: any) => item.uuid === "type-project")).toBe(true);
    });

    it("should return empty array if not loaded", () => {
      const result = store.getItemTypes("corp-1", "proj-2");

      expect(result).toEqual([]);
    });
  });

  describe("getPreferredItems", () => {
    it("should return preferred items for project", async () => {
      await store.ensurePreferredItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      const result = store.getPreferredItems("corp-1", "proj-1");

      expect(result).toHaveLength(2);
    });

    it("should return empty array if not loaded", () => {
      const result = store.getPreferredItems("corp-1", "proj-2");

      expect(result).toEqual([]);
    });
  });

  describe("getEstimateItems", () => {
    it("should return estimate items", async () => {
      const mockResponse = {
        data: [
          {
            cost_code_uuid: "cc-1",
            material_items: [
              {
                item_uuid: "item-1",
                unit_price: 50,
                quantity: 10,
              },
            ],
          },
        ],
      };
      ;(global.$fetch as any).mockResolvedValue(mockResponse);

      await store.ensureEstimateItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: "est-1",
      });

      const result = store.getEstimateItems("corp-1", "proj-1", "est-1");

      expect(result).toHaveLength(1);
      expect(result[0].item_uuid).toBe("item-1");
    });

    it("should return empty array if not loaded", () => {
      const result = store.getEstimateItems("corp-1", "proj-1", "est-2");

      expect(result).toEqual([]);
    });
  });

  describe("getEstimateItemsLoading", () => {
    it("should return loading state", async () => {
      ;(global.$fetch as any).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: [] }), 100);
          })
      );

      const promise = store.ensureEstimateItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: "est-1",
      });

      const loading = store.getEstimateItemsLoading("corp-1", "proj-1", "est-1");
      expect(loading).toBe(true);

      await promise;
      const loadingAfter = store.getEstimateItemsLoading("corp-1", "proj-1", "est-1");
      expect(loadingAfter).toBe(false);
    });
  });

  describe("getEstimateItemsError", () => {
    it("should return error state", async () => {
      ;(global.$fetch as any).mockRejectedValue(new Error("API Error"));

      await store.ensureEstimateItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: "est-1",
      });

      const error = store.getEstimateItemsError("corp-1", "proj-1", "est-1");

      expect(error).toBe("API Error");
    });

    it("should return null if no error", async () => {
      ;(global.$fetch as any).mockResolvedValue({ data: [] });

      await store.ensureEstimateItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
        estimateUuid: "est-1",
      });

      const error = store.getEstimateItemsError("corp-1", "proj-1", "est-1");

      expect(error).toBe(null);
    });
  });

  describe("clearProject", () => {
    it("should clear project resources", async () => {

      await store.ensureItemTypes({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      store.clearProject("corp-1", "proj-1");

      const result = store.getItemTypes("corp-1", "proj-1");
      expect(result).toEqual([]);
    });
  });

  describe("clear", () => {
    it("should clear all project resources", async () => {
      await store.ensureItemTypes({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });
      await store.ensurePreferredItems({
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      });

      store.clear();

      expect(store.getItemTypes("corp-1", "proj-1")).toEqual([]);
      expect(store.getPreferredItems("corp-1", "proj-1")).toEqual([]);
    });
  });

  describe("projectKey and estimateKey", () => {
    it("should generate correct project keys", () => {
      const key1 = store.projectKey("corp-1", "proj-1");
      const key2 = store.projectKey("corp-1", "proj-1");
      const key3 = store.projectKey("corp-1", "proj-2");

      expect(key1).toBe("corp-1::proj-1");
      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });

    it("should generate correct estimate keys", () => {
      const key1 = store.estimateKey("corp-1", "proj-1", "est-1");
      const key2 = store.estimateKey("corp-1", "proj-1", "est-1");
      const key3 = store.estimateKey("corp-1", "proj-1", "est-2");

      expect(key1).toBe("corp-1::proj-1::est-1");
      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });

    it("should handle null/undefined values in keys", () => {
      const key1 = store.projectKey(null, undefined);
      const key2 = store.projectKey("", "");
      const key3 = store.estimateKey(null, undefined, null);

      expect(key1).toBe("::");
      expect(key2).toBe("::");
      expect(key3).toBe("::::");
    });
  });
});

