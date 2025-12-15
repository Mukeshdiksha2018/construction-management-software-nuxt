import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function createDbHelpersMock() {
  return {
    saveChangeOrders: vi.fn().mockResolvedValue(undefined),
    getChangeOrders: vi.fn().mockResolvedValue([]),
    addChangeOrder: vi.fn().mockResolvedValue(undefined),
    updateChangeOrder: vi.fn().mockResolvedValue(undefined),
    deleteChangeOrder: vi.fn().mockResolvedValue(undefined),
    clearChangeOrders: vi.fn().mockResolvedValue(undefined),
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
import { useChangeOrdersStore } from "@/stores/changeOrders";

describe("changeOrders store - removed items filtering", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (dbHelpersMock) {
      Object.values(dbHelpersMock).forEach((fn) => fn.mockClear());
      dbHelpersMock.getChangeOrders.mockResolvedValue([]);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).$fetch;
  });

  it("filters out removed items when fetching a change order", async () => {
    const store = useChangeOrdersStore();

    const coFormResponse = {
      data: {
        uuid: "co-1",
        corporation_uuid: "corp-1",
        project_uuid: "proj-1",
        co_number: "CO-000001",
        removed_co_items: [
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
          change_order_uuid: "co-1",
          item_uuid: "item-uuid-1",
          description: "Item 1",
        },
        {
          uuid: "db-item-2",
          change_order_uuid: "co-1",
          item_uuid: "item-uuid-2",
          description: "Item 2",
        },
        {
          uuid: "db-item-3",
          change_order_uuid: "co-1",
          item_uuid: "item-uuid-3",
          description: "Item 3",
        },
        {
          uuid: "db-item-4",
          change_order_uuid: "co-1",
          item_uuid: "item-uuid-4",
          description: "Item 4",
        },
      ],
    };

    (globalThis as any).$fetch = vi.fn((url: string) => {
      if (url.includes("/api/change-orders/co-1")) {
        return Promise.resolve(coFormResponse);
      }
      if (url.includes("/api/change-order-items?change_order_uuid=co-1")) {
        return Promise.resolve(itemsResponse);
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    const result = await store.fetchChangeOrder("co-1");

    expect(result).toBeDefined();
    expect(result?.co_items).toBeDefined();

    // Should only have 2 items (items 2 and 4), items 1 and 3 should be filtered out
    expect(result?.co_items).toHaveLength(2);

    const itemUuids = result?.co_items?.map((item: any) => item.item_uuid);
    expect(itemUuids).toContain("item-uuid-2");
    expect(itemUuids).toContain("item-uuid-4");
    expect(itemUuids).not.toContain("item-uuid-1");
    expect(itemUuids).not.toContain("item-uuid-3");
  });

  it("returns all items when removed_co_items is empty", async () => {
    const store = useChangeOrdersStore();

    const coFormResponse = {
      data: {
        uuid: "co-2",
        corporation_uuid: "corp-1",
        removed_co_items: [],
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
      if (url.includes("/api/change-orders/co-2")) {
        return Promise.resolve(coFormResponse);
      }
      if (url.includes("/api/change-order-items?change_order_uuid=co-2")) {
        return Promise.resolve(itemsResponse);
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    const result = await store.fetchChangeOrder("co-2");

    expect(result?.co_items).toHaveLength(2);
  });

  it("filters items case-insensitively by item_uuid", async () => {
    const store = useChangeOrdersStore();

    const coFormResponse = {
      data: {
        uuid: "co-3",
        corporation_uuid: "corp-1",
        removed_co_items: [
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
      if (url.includes("/api/change-orders/co-3")) {
        return Promise.resolve(coFormResponse);
      }
      if (url.includes("/api/change-order-items?change_order_uuid=co-3")) {
        return Promise.resolve(itemsResponse);
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    const result = await store.fetchChangeOrder("co-3");

    // Should filter out item-1 despite case difference
    expect(result?.co_items).toHaveLength(1);
    expect(result?.co_items?.[0].item_uuid).toBe("item-uuid-2");
  });

  it("keeps items without item_uuid when filtering", async () => {
    const store = useChangeOrdersStore();

    const coFormResponse = {
      data: {
        uuid: "co-4",
        corporation_uuid: "corp-1",
        removed_co_items: [
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
      if (url.includes("/api/change-orders/co-4")) {
        return Promise.resolve(coFormResponse);
      }
      if (url.includes("/api/change-order-items?change_order_uuid=co-4")) {
        return Promise.resolve(itemsResponse);
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    const result = await store.fetchChangeOrder("co-4");

    // Should keep item without item_uuid
    expect(result?.co_items).toHaveLength(1);
    expect(result?.co_items?.[0].uuid).toBe("db-item-2");
  });

  it("handles empty items list gracefully", async () => {
    const store = useChangeOrdersStore();

    const coFormResponse = {
      data: {
        uuid: "co-5",
        corporation_uuid: "corp-1",
        removed_co_items: [
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
      if (url.includes("/api/change-orders/co-5")) {
        return Promise.resolve(coFormResponse);
      }
      if (url.includes("/api/change-order-items?change_order_uuid=co-5")) {
        return Promise.resolve(itemsResponse);
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    const result = await store.fetchChangeOrder("co-5");

    expect(result?.co_items).toEqual([]);
  });

  it("preserves removed_co_items in the returned change order", async () => {
    const store = useChangeOrdersStore();

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

    const coFormResponse = {
      data: {
        uuid: "co-6",
        corporation_uuid: "corp-1",
        removed_co_items: removedItems,
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
      if (url.includes("/api/change-orders/co-6")) {
        return Promise.resolve(coFormResponse);
      }
      if (url.includes("/api/change-order-items?change_order_uuid=co-6")) {
        return Promise.resolve(itemsResponse);
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    const result = await store.fetchChangeOrder("co-6");

    // Should preserve removed_co_items
    expect(result?.removed_co_items).toBeDefined();
    expect(result?.removed_co_items).toHaveLength(2);
    expect(result?.removed_co_items).toEqual(removedItems);
  });
});
