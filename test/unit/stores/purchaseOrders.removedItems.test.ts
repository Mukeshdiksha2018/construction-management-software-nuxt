import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function createDbHelpersMock() {
  return {
    savePurchaseOrders: vi.fn().mockResolvedValue(undefined),
    getPurchaseOrders: vi.fn().mockResolvedValue([]),
    addPurchaseOrder: vi.fn().mockResolvedValue(undefined),
    updatePurchaseOrder: vi.fn().mockResolvedValue(undefined),
    deletePurchaseOrder: vi.fn().mockResolvedValue(undefined),
    clearPurchaseOrders: vi.fn().mockResolvedValue(undefined),
  };
}

var dbHelpersMock: ReturnType<typeof createDbHelpersMock>;

vi.mock("@/utils/indexedDb", () => {
  const helpers = createDbHelpersMock();
  dbHelpersMock = helpers;
  return {
    dbHelpers: helpers,
  };
});

import { setActivePinia, createPinia } from "pinia";
import { usePurchaseOrdersStore } from "@/stores/purchaseOrders";

describe("purchaseOrders store - removed items filtering", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (dbHelpersMock) {
      Object.values(dbHelpersMock).forEach((fn) => fn.mockClear());
      dbHelpersMock.getPurchaseOrders.mockResolvedValue([]);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).$fetch;
  });

  it("filters out removed items when fetching a purchase order", async () => {
    const store = usePurchaseOrdersStore();

    const poFormResponse = {
      data: {
        uuid: "po-1",
        corporation_uuid: "corp-1",
        project_uuid: "proj-1",
        po_number: "PO-001",
        removed_po_items: [
          {
            id: "item-1",
            item_uuid: "item-uuid-1",
            description: "Removed Item 1",
            removed_at: "2024-01-01T00:00:00Z",
          },
          {
            id: "item-3",
            item_uuid: "item-uuid-3",
            description: "Removed Item 3",
            removed_at: "2024-01-01T00:00:01Z",
          },
        ],
      },
    };

    const itemsResponse = {
      data: [
        {
          uuid: "db-item-1",
          purchase_order_uuid: "po-1",
          item_uuid: "item-uuid-1",
          description: "Item 1",
        },
        {
          uuid: "db-item-2",
          purchase_order_uuid: "po-1",
          item_uuid: "item-uuid-2",
          description: "Item 2",
        },
        {
          uuid: "db-item-3",
          purchase_order_uuid: "po-1",
          item_uuid: "item-uuid-3",
          description: "Item 3",
        },
        {
          uuid: "db-item-4",
          purchase_order_uuid: "po-1",
          item_uuid: "item-uuid-4",
          description: "Item 4",
        },
      ],
    };

    (globalThis as any).$fetch = vi.fn((url: string) => {
      if (url.includes("/api/purchase-order-forms/po-1")) {
        return Promise.resolve(poFormResponse);
      }
      if (url.includes("/api/purchase-order-items?purchase_order_uuid=po-1")) {
        return Promise.resolve(itemsResponse);
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    const result = await store.fetchPurchaseOrder("po-1");

    expect(result).toBeDefined();
    expect(result?.po_items).toBeDefined();
    
    // Should only have 2 items (items 2 and 4), items 1 and 3 should be filtered out
    expect(result?.po_items).toHaveLength(2);
    
    const itemUuids = result?.po_items?.map((item: any) => item.item_uuid);
    expect(itemUuids).toContain("item-uuid-2");
    expect(itemUuids).toContain("item-uuid-4");
    expect(itemUuids).not.toContain("item-uuid-1");
    expect(itemUuids).not.toContain("item-uuid-3");
  });

  it("returns all items when removed_po_items is empty", async () => {
    const store = usePurchaseOrdersStore();

    const poFormResponse = {
      data: {
        uuid: "po-2",
        corporation_uuid: "corp-1",
        removed_po_items: [],
      },
    };

    const itemsResponse = {
      data: [
        {
          uuid: "db-item-1",
          item_uuid: "item-uuid-1",
          description: "Item 1",
        },
        {
          uuid: "db-item-2",
          item_uuid: "item-uuid-2",
          description: "Item 2",
        },
      ],
    };

    (globalThis as any).$fetch = vi.fn((url: string) => {
      if (url.includes("/api/purchase-order-forms/po-2")) {
        return Promise.resolve(poFormResponse);
      }
      if (url.includes("/api/purchase-order-items?purchase_order_uuid=po-2")) {
        return Promise.resolve(itemsResponse);
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    const result = await store.fetchPurchaseOrder("po-2");

    expect(result?.po_items).toHaveLength(2);
  });

  it("filters items case-insensitively by item_uuid", async () => {
    const store = usePurchaseOrdersStore();

    const poFormResponse = {
      data: {
        uuid: "po-3",
        corporation_uuid: "corp-1",
        removed_po_items: [
          {
            item_uuid: "ITEM-UUID-1", // Uppercase
            description: "Removed Item",
            removed_at: "2024-01-01T00:00:00Z",
          },
        ],
      },
    };

    const itemsResponse = {
      data: [
        {
          uuid: "db-item-1",
          item_uuid: "item-uuid-1", // Lowercase
          description: "Item 1",
        },
        {
          uuid: "db-item-2",
          item_uuid: "item-uuid-2",
          description: "Item 2",
        },
      ],
    };

    (globalThis as any).$fetch = vi.fn((url: string) => {
      if (url.includes("/api/purchase-order-forms/po-3")) {
        return Promise.resolve(poFormResponse);
      }
      if (url.includes("/api/purchase-order-items?purchase_order_uuid=po-3")) {
        return Promise.resolve(itemsResponse);
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    const result = await store.fetchPurchaseOrder("po-3");

    // Should filter out item-1 despite case difference
    expect(result?.po_items).toHaveLength(1);
    expect(result?.po_items?.[0].item_uuid).toBe("item-uuid-2");
  });

  it("keeps items without item_uuid when filtering", async () => {
    const store = usePurchaseOrdersStore();

    const poFormResponse = {
      data: {
        uuid: "po-4",
        corporation_uuid: "corp-1",
        removed_po_items: [
          {
            item_uuid: "item-uuid-1",
            description: "Removed Item",
            removed_at: "2024-01-01T00:00:00Z",
          },
        ],
      },
    };

    const itemsResponse = {
      data: [
        {
          uuid: "db-item-1",
          item_uuid: "item-uuid-1",
          description: "Item with UUID - should be removed",
        },
        {
          uuid: "db-item-2",
          // No item_uuid
          description: "Item without UUID - should be kept",
        },
      ],
    };

    (globalThis as any).$fetch = vi.fn((url: string) => {
      if (url.includes("/api/purchase-order-forms/po-4")) {
        return Promise.resolve(poFormResponse);
      }
      if (url.includes("/api/purchase-order-items?purchase_order_uuid=po-4")) {
        return Promise.resolve(itemsResponse);
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    const result = await store.fetchPurchaseOrder("po-4");

    // Should keep item without item_uuid
    expect(result?.po_items).toHaveLength(1);
    expect(result?.po_items?.[0].uuid).toBe("db-item-2");
  });

  it("handles empty items list gracefully", async () => {
    const store = usePurchaseOrdersStore();

    const poFormResponse = {
      data: {
        uuid: "po-5",
        corporation_uuid: "corp-1",
        removed_po_items: [
          {
            item_uuid: "item-uuid-1",
            description: "Removed Item",
            removed_at: "2024-01-01T00:00:00Z",
          },
        ],
      },
    };

    const itemsResponse = {
      data: [],
    };

    (globalThis as any).$fetch = vi.fn((url: string) => {
      if (url.includes("/api/purchase-order-forms/po-5")) {
        return Promise.resolve(poFormResponse);
      }
      if (url.includes("/api/purchase-order-items?purchase_order_uuid=po-5")) {
        return Promise.resolve(itemsResponse);
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    const result = await store.fetchPurchaseOrder("po-5");

    expect(result?.po_items).toEqual([]);
  });

  it("preserves removed_po_items in the returned purchase order", async () => {
    const store = usePurchaseOrdersStore();

    const removedItems = [
      {
        item_uuid: "item-uuid-1",
        description: "Removed Item 1",
        removed_at: "2024-01-01T00:00:00Z",
      },
      {
        item_uuid: "item-uuid-2",
        description: "Removed Item 2",
        removed_at: "2024-01-01T00:00:01Z",
      },
    ];

    const poFormResponse = {
      data: {
        uuid: "po-6",
        corporation_uuid: "corp-1",
        removed_po_items: removedItems,
      },
    };

    const itemsResponse = {
      data: [
        {
          uuid: "db-item-3",
          item_uuid: "item-uuid-3",
          description: "Item 3",
        },
      ],
    };

    (globalThis as any).$fetch = vi.fn((url: string) => {
      if (url.includes("/api/purchase-order-forms/po-6")) {
        return Promise.resolve(poFormResponse);
      }
      if (url.includes("/api/purchase-order-items?purchase_order_uuid=po-6")) {
        return Promise.resolve(itemsResponse);
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    const result = await store.fetchPurchaseOrder("po-6");

    // Should preserve removed_po_items
    expect(result?.removed_po_items).toBeDefined();
    expect(result?.removed_po_items).toHaveLength(2);
    expect(result?.removed_po_items).toEqual(removedItems);
  });
});

