import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { usePurchaseOrderResourcesStore } from "@/stores/purchaseOrderResources";

// Mock $fetch for API calls (store now fetches directly from API, not from global stores)
let mockItemTypesResponse: any[] = [];
let mockConfigurationsResponse: any[] = [];
let mockEstimatesResponse: any[] = [];

describe("purchaseOrderResources store", () => {
  let store: ReturnType<typeof usePurchaseOrderResourcesStore>;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
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
        uuid: "cfg-1",
        corporation_uuid: "corp-1",
        cost_code_number: "100",
        cost_code_name: "Concrete",
        preferred_items: [
          {
            uuid: "pref-project",
            item_type_uuid: "type-project",
            project_uuid: "proj-1",
            item_name: "Rebar",
            unit_uuid: "uom-ea",
            unit: "EA",
            unit_price: 12,
            description: "Steel rebar",
            status: "Active",
          },
          {
            uuid: "pref-corp",
            item_type_uuid: "type-corp",
            project_uuid: null,
            item_name: "Generic Labor",
            unit_uuid: "uom-hr",
            unit: "HR",
            unit_price: 45,
            description: "Labor",
            status: "Active",
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

    const pinia = createPinia();
    setActivePinia(pinia);

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
        return {
          data: [
            {
              cost_code_uuid: "cc-1",
              cost_code_number: "100",
              cost_code_name: "Concrete",
              division_name: "Division",
              material_items: [
                {
                  item_uuid: "item-1",
                  name: "Concrete Bag",
                  quantity: 3,
                  unit_price: 25,
                  unit_uuid: "uom-ea",
                  unit: "EA",
                  description: "Ready mix bag",
                },
              ],
            },
          ],
        };
      }
      return { data: [] };
    });
    vi.stubGlobal("$fetch", fetchSpy);

    store = usePurchaseOrderResourcesStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads and caches project resources", async () => {
    await store.ensureProjectResources({
      corporationUuid: "corp-1",
      projectUuid: "proj-1",
      estimateUuid: "est-1",
    });

    // Verify API calls were made (store now fetches directly from API)
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/item-types",
      expect.objectContaining({
        method: "GET",
        query: expect.objectContaining({
          corporation_uuid: "corp-1",
        }),
      })
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/cost-code-configurations",
      expect.objectContaining({
        method: "GET",
        query: expect.objectContaining({
          corporation_uuid: "corp-1",
        }),
      })
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/estimates",
      expect.objectContaining({
        method: "GET",
        query: expect.objectContaining({
          corporation_uuid: "corp-1",
        }),
      })
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/estimate-line-items",
      expect.objectContaining({
        method: "GET",
      })
    );

    const itemTypes = store.getItemTypes("corp-1", "proj-1");
    // Store includes both project-specific and corporation-level active item types
    expect(itemTypes.length).toBeGreaterThanOrEqual(1);
    expect(itemTypes.some((item: any) => item.uuid === "type-project")).toBe(true);

    const preferredItems = store.getPreferredItems("corp-1", "proj-1");
    expect(preferredItems.length).toBe(2);
    expect(preferredItems[0].item_name).toBe("Rebar");

    const estimateItems = store.getEstimateItems("corp-1", "proj-1", "est-1");
    expect(estimateItems.length).toBe(1);
    expect(estimateItems[0].total).toBe(75);
    expect(estimateItems[0].uom_uuid).toBe("uom-ea");
    expect(estimateItems[0].unit_label).toBe("EA");
    expect(store.getEstimateItemsLoading("corp-1", "proj-1", "est-1")).toBe(
      false
    );
    expect(store.getEstimateItemsError("corp-1", "proj-1", "est-1")).toBeNull();
  });

  it("reuses cached estimate items without refetching", async () => {
    await store.ensureProjectResources({
      corporationUuid: "corp-1",
      projectUuid: "proj-1",
      estimateUuid: "est-1",
    });
    const initialCallCount = fetchSpy.mock.calls.length;
    fetchSpy.mockClear();

    await store.ensureProjectResources({
      corporationUuid: "corp-1",
      projectUuid: "proj-1",
      estimateUuid: "est-1",
    });

    // Should not make new API calls since data is cached
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("clears cached data for a specific project", async () => {
    await store.ensureProjectResources({
      corporationUuid: "corp-1",
      projectUuid: "proj-1",
      estimateUuid: "est-1",
    });
    store.clearProject("corp-1", "proj-1");
    expect(store.getItemTypes("corp-1", "proj-1")).toEqual([]);
    expect(store.getPreferredItems("corp-1", "proj-1")).toEqual([]);
    expect(store.getEstimateItems("corp-1", "proj-1", "est-1")).toEqual([]);
  });

  it("clears all cached data", async () => {
    await store.ensureProjectResources({
      corporationUuid: "corp-1",
      projectUuid: "proj-1",
      estimateUuid: "est-1",
    });
    store.clear();
    expect(store.getItemTypes("corp-1", "proj-1")).toEqual([]);
    expect(store.getPreferredItems("corp-1", "proj-1")).toEqual([]);
    expect(store.getEstimateItems("corp-1", "proj-1", "est-1")).toEqual([]);
  });

  it("serves cached estimate items without fetching when window is undefined", async () => {
    await store.ensureProjectResources({
      corporationUuid: "corp-1",
      projectUuid: "proj-1",
      estimateUuid: "est-1",
    });
    const originalWindow = (globalThis as any).window;
    // @ts-expect-error deliberate override for test
    (globalThis as any).window = undefined;

    fetchSpy.mockClear();
    await store.ensureEstimateItems({
      corporationUuid: "corp-1",
      projectUuid: "proj-1",
      estimateUuid: "est-1",
    });
    expect(fetchSpy).not.toHaveBeenCalled();

    (globalThis as any).window = originalWindow;
  });
});

