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

describe("purchaseOrders store attachments", () => {
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

  it("uploads pending attachments after creating a purchase order", async () => {
    const store = usePurchaseOrdersStore();

    const createResponse = {
      data: {
        uuid: "po-create-1",
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
      if (url === "/api/purchase-order-forms" && options?.method === "POST") {
        return createResponse;
      }
      if (
        url === "/api/purchase-order-forms/documents/upload" &&
        options?.method === "POST"
      ) {
        expect(options.body.purchase_order_uuid).toBe("po-create-1");
        expect(Array.isArray(options.body.files)).toBe(true);
        expect(options.body.files[0].name).toBe("pending.pdf");
        return uploadResponse;
      }
      if (url === "/api/purchase-order-items" && options?.method === "POST") {
        expect(options.body.purchase_order_uuid).toBe("po-create-1");
        expect(options.body.corporation_uuid).toBe("corp-1");
        expect(options.body.project_uuid).toBe("proj-1");
        expect(Array.isArray(options.body.items)).toBe(true);
        expect(options.body.items[0].description).toBe("Widget");
        expect(options.body.items[0].po_quantity).toBe(3);
        expect(options.body.items[0].po_unit_price).toBe(10);
        expect(options.body.items[0].po_total).toBe(30);
        return { success: true };
      }

      throw new Error(`Unexpected $fetch call: ${url}`);
    });

    const payload = {
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      entry_date: "2025-01-01",
      attachments: [
        {
          name: "pending.pdf",
          type: "application/pdf",
          size: 1024,
          fileData: "data:application/pdf;base64,AAE=",
        },
      ],
      po_items: [
        {
          description: "Widget",
          quantity: 3,
          unit_price: 10,
          po_unit_price: null,
          po_quantity: null,
          po_total: null,
        },
      ],
    } as any;

    const po = await store.createPurchaseOrder(payload);

    const calls = fetchSpy.mock.calls.map(([url]: any) => url);
    expect(calls).toEqual([
      "/api/purchase-order-forms",
      "/api/purchase-order-forms/documents/upload",
      "/api/purchase-order-items",
    ]);
  });

  it("fetches purchase order and populates stored items", async () => {
    const store = usePurchaseOrdersStore();

    const fetchSpy = vi.fn(async (url: string) => {
      if (url === "/api/purchase-order-forms/po-42") {
        return {
          data: {
            uuid: "po-42",
            corporation_uuid: "corp-1",
            project_uuid: "proj-9",
            attachments: [],
          },
        };
      }
      if (url === "/api/purchase-order-items?purchase_order_uuid=po-42") {
        return {
          data: [
            {
              uuid: "item-line-1",
              item_uuid: "item-abc",
              item_name: "Concrete Mix",
              po_quantity: "6",
              po_unit_price: "45.5",
              po_total: "273",
            },
          ],
        };
      }

      throw new Error(`Unexpected $fetch call: ${url}`);
    });
    (globalThis as any).$fetch = fetchSpy;

    const po = await store.fetchPurchaseOrder("po-42");

    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      "/api/purchase-order-items?purchase_order_uuid=po-42"
    );
    expect(po?.po_items?.[0]).toMatchObject({
      uuid: "item-line-1",
      item_uuid: "item-abc",
      name: "Concrete Mix",
      po_quantity: 6,
      po_unit_price: 45.5,
      po_total: 273,
      display_metadata: expect.objectContaining({
        item_name: "Concrete Mix",
      }),
    });
    expect(store.currentPurchaseOrder?.po_items?.[0]).toMatchObject({
      uuid: "item-line-1",
      item_uuid: "item-abc",
      name: "Concrete Mix",
      po_quantity: 6,
      po_unit_price: 45.5,
      po_total: 273,
    });
  });
});

