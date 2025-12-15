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

describe("changeOrders store attachments", () => {
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

  it("uploads pending attachments after creating a change order", async () => {
    const store = useChangeOrdersStore();

    const createResponse = {
      data: {
        uuid: "co-create-1",
        corporation_uuid: "corp-1",
        project_uuid: "proj-1",
        attachments: [],
      },
    };

    const uploadResponse = {
      attachments: [
        {
          uuid: "upload-1",
          document_name: "pending.pdf",
          mime_type: "application/pdf",
          file_size: 1024,
          file_url: "https://example.com/pending.pdf",
        },
      ],
    };

    const fetchSpy = vi.fn();
    (globalThis as any).$fetch = fetchSpy;

    fetchSpy.mockImplementation(async (url: string, options: any) => {
      if (url === "/api/change-orders" && options?.method === "POST") {
        return createResponse;
      }
      if (
        url === "/api/change-orders/documents/upload" &&
        options?.method === "POST"
      ) {
        expect(options.body.change_order_uuid).toBe("co-create-1");
        expect(Array.isArray(options.body.files)).toBe(true);
        expect(options.body.files[0].name).toBe("pending.pdf");
        return uploadResponse;
      }

      throw new Error(`Unexpected $fetch call: ${url}`);
    });

    const payload = {
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      co_number: "CO-000001",
      created_date: "2025-01-01",
      status: "Draft",
      attachments: [
        {
          name: "pending.pdf",
          type: "application/pdf",
          size: 1024,
          fileData: "data:application/pdf;base64,AAE=",
        },
      ],
      co_items: [
        {
          description: "Widget",
          quantity: 3,
          unit_price: 10,
          co_unit_price: 12,
          co_quantity: 2,
          co_total: 24,
        },
      ],
    } as any;

    const co = await store.createChangeOrder(payload);

    const calls = fetchSpy.mock.calls.map(([url]: any) => url);
    expect(calls).toEqual([
      "/api/change-orders",
      "/api/change-orders/documents/upload",
    ]);
  });

  it("fetches change order and populates stored items", async () => {
    const store = useChangeOrdersStore();

    const fetchSpy = vi.fn(async (url: string) => {
      if (url === "/api/change-orders/co-42") {
        return {
          data: {
            uuid: "co-42",
            corporation_uuid: "corp-1",
            project_uuid: "proj-9",
            attachments: [],
          },
        };
      }
      if (url === "/api/change-order-items?change_order_uuid=co-42") {
        return {
          data: [
            {
              uuid: "item-line-1",
              item_uuid: "item-abc",
              item_name: "Steel Rebar",
              co_quantity: "6",
              co_unit_price: "45.5",
              co_total: "273",
            },
          ],
        };
      }

      throw new Error(`Unexpected $fetch call: ${url}`);
    });
    (globalThis as any).$fetch = fetchSpy;

    const co = await store.fetchChangeOrder("co-42");

    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      "/api/change-order-items?change_order_uuid=co-42"
    );
    expect(co?.co_items?.[0]).toMatchObject({
      uuid: "item-line-1",
      item_uuid: "item-abc",
      item_name: "Steel Rebar",
      co_quantity: "6", // API returns strings
      co_unit_price: "45.5", // API returns strings
      co_total: "273", // API returns strings
    });
    expect(store.currentPurchaseOrder).toBeUndefined(); // Change orders don't have currentPurchaseOrder
  });

  it("uploads attachments during change order update", async () => {
    const store = useChangeOrdersStore();

    const updateResponse = {
      data: {
        uuid: "co-update-1",
        corporation_uuid: "corp-1",
        project_uuid: "proj-1",
        attachments: [],
      },
    };

    const uploadResponse = {
      attachments: [
        {
          uuid: "upload-2",
          document_name: "updated.pdf",
          mime_type: "application/pdf",
          file_size: 2048,
          file_url: "https://example.com/updated.pdf",
        },
      ],
    };

    const fetchSpy = vi.fn();
    (globalThis as any).$fetch = fetchSpy;

    fetchSpy.mockImplementation(async (url: string, options: any) => {
      if (url === "/api/change-orders" && options?.method === "PUT") {
        return updateResponse;
      }
      if (
        url === "/api/change-orders/documents/upload" &&
        options?.method === "POST"
      ) {
        expect(options.body.change_order_uuid).toBe("co-update-1");
        return uploadResponse;
      }

      throw new Error(`Unexpected $fetch call: ${url}`);
    });

    const payload = {
      uuid: "co-update-1",
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      co_number: "CO-000001",
      status: "Pending",
      attachments: [
        {
          name: "updated.pdf",
          type: "application/pdf",
          size: 2048,
          fileData: "data:application/pdf;base64,BBE=",
        },
      ],
    } as any;

    const co = await store.updateChangeOrder(payload);

    const calls = fetchSpy.mock.calls.map(([url]: any) => url);
    expect(calls).toEqual([
      "/api/change-orders",
      "/api/change-orders/documents/upload",
    ]);
  });
});
