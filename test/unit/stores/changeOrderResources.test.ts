import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useChangeOrderResourcesStore } from "@/stores/changeOrderResources";

describe("changeOrderResources store", () => {
  let store: ReturnType<typeof useChangeOrderResourcesStore>;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);

    fetchSpy = vi.fn(async () => ({
      data: [
        {
          item_uuid: "item-1",
          name: "Original Concrete Bag",
          quantity: 3,
          unit_price: 25,
          unit_uuid: "uom-ea",
          unit: "EA",
          description: "Original order item",
        },
      ],
    }));

    // @ts-expect-error global stub in tests
    vi.stubGlobal("$fetch", fetchSpy);

    store = useChangeOrderResourcesStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads and caches original order items", async () => {
    const items = await store.ensureOriginalOrderItems({
      corporationUuid: "corp-1",
      projectUuid: "proj-1",
      purchaseOrderUuid: "po-1",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith("/api/purchase-order-items", {
      method: "GET",
      query: {
        purchase_order_uuid: "po-1",
      },
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      item_uuid: "item-1",
      name: "Original Concrete Bag",
    });

    const state = store.getOriginalItemsState(
      "corp-1",
      "proj-1",
      "po-1",
    );
    expect(state?.items).toHaveLength(1);
    expect(state?.loading).toBe(false);
    expect(state?.error).toBeNull();

    expect(
      store.getOriginalItems("corp-1", "proj-1", "po-1"),
    ).toHaveLength(1);
    expect(
      store.getOriginalItemsLoading("corp-1", "proj-1", "po-1"),
    ).toBe(false);
    expect(
      store.getOriginalItemsError("corp-1", "proj-1", "po-1"),
    ).toBeNull();
  });

  it("reuses cached original order items without refetching", async () => {
    await store.ensureOriginalOrderItems({
      corporationUuid: "corp-1",
      projectUuid: "proj-1",
      purchaseOrderUuid: "po-1",
    });

    fetchSpy.mockClear();

    const items = await store.ensureOriginalOrderItems({
      corporationUuid: "corp-1",
      projectUuid: "proj-1",
      purchaseOrderUuid: "po-1",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(items).toHaveLength(1);
  });

  it("does not refetch while a fetch is already in progress", async () => {
    let resolveFetch: (() => void) | null = null;

    const pendingPromise = new Promise<any>((resolve) => {
      resolveFetch = () =>
        resolve({
          data: [
            {
              item_uuid: "item-1",
              name: "Original Concrete Bag",
            },
          ],
        });
    });

    fetchSpy.mockImplementationOnce(() => pendingPromise);

    const firstPromise = store.ensureOriginalOrderItems({
      corporationUuid: "corp-1",
      projectUuid: "proj-1",
      purchaseOrderUuid: "po-1",
    });

    const secondPromise = store.ensureOriginalOrderItems({
      corporationUuid: "corp-1",
      projectUuid: "proj-1",
      purchaseOrderUuid: "po-1",
    });

    // Second call should return immediately with current (empty) items
    const secondResult = await secondPromise;
    expect(secondResult).toEqual([]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Now resolve the first fetch and ensure items are stored
    resolveFetch?.();
    const firstResult = await firstPromise;
    expect(firstResult).toHaveLength(1);
    expect(
      store.getOriginalItems("corp-1", "proj-1", "po-1"),
    ).toHaveLength(1);
  });

  it("handles API errors and exposes error state", async () => {
    fetchSpy.mockRejectedValueOnce({
      data: { statusMessage: "Something went wrong" },
    });

    const items = await store.ensureOriginalOrderItems({
      corporationUuid: "corp-1",
      projectUuid: "proj-1",
      purchaseOrderUuid: "po-err",
    });

    expect(items).toEqual([]);

    const state = store.getOriginalItemsState(
      "corp-1",
      "proj-1",
      "po-err",
    );
    expect(state?.items).toEqual([]);
    expect(state?.loading).toBe(false);
    expect(state?.error).toBe("Something went wrong");

    expect(
      store.getOriginalItemsError("corp-1", "proj-1", "po-err"),
    ).toBe("Something went wrong");
  });

  it("returns empty array when purchaseOrderUuid is missing", async () => {
    const items = await store.ensureOriginalOrderItems({
      // @ts-expect-error testing missing purchaseOrderUuid
      corporationUuid: "corp-1",
      projectUuid: "proj-1",
      purchaseOrderUuid: "",
    });

    expect(items).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("clears cached data for a specific project", async () => {
    await store.ensureOriginalOrderItems({
      corporationUuid: "corp-1",
      projectUuid: "proj-1",
      purchaseOrderUuid: "po-1",
    });

    expect(
      store.getOriginalItems("corp-1", "proj-1", "po-1"),
    ).toHaveLength(1);

    store.clearProject("corp-1", "proj-1");

    expect(
      store.getOriginalItems("corp-1", "proj-1", "po-1"),
    ).toEqual([]);
    expect(
      store.getOriginalItemsState("corp-1", "proj-1", "po-1"),
    ).toBeNull();
  });

  it("clears all cached data", async () => {
    await store.ensureOriginalOrderItems({
      corporationUuid: "corp-1",
      projectUuid: "proj-1",
      purchaseOrderUuid: "po-1",
    });
    await store.ensureOriginalOrderItems({
      corporationUuid: "corp-1",
      projectUuid: "proj-2",
      purchaseOrderUuid: "po-2",
    });

    expect(
      store.getOriginalItems("corp-1", "proj-1", "po-1"),
    ).toHaveLength(1);
    expect(
      store.getOriginalItems("corp-1", "proj-2", "po-2"),
    ).toHaveLength(1);

    store.clear();

    expect(
      store.getOriginalItems("corp-1", "proj-1", "po-1"),
    ).toEqual([]);
    expect(
      store.getOriginalItems("corp-1", "proj-2", "po-2"),
    ).toEqual([]);
  });
});


