import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const makeEvent = (method: string, opts: { query?: any; body?: any } = {}) =>
  ({
    node: {
      req: {
        method,
      },
    },
    req: {},
    ...opts,
  } as any);

describe("server/api/purchase-order-items", () => {
  const stubGlobals = () => {
    const mockDefineEventHandler = vi.fn((handler) => handler);
    const mockGetQuery = vi.fn(() => ({}));
    const mockReadBody = vi.fn();
    const mockCreateError = vi.fn((options: any) => {
      const error = new Error(options.statusMessage);
      (error as any).statusCode = options.statusCode;
      return error;
    });

    vi.stubGlobal("defineEventHandler", mockDefineEventHandler);
    vi.stubGlobal("getQuery", mockGetQuery);
    vi.stubGlobal("readBody", mockReadBody);
    vi.stubGlobal("createError", mockCreateError);

    return {
      mockDefineEventHandler,
      mockGetQuery,
      mockReadBody,
      mockCreateError,
    };
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("replaces existing items with sanitized input on POST", async () => {
    const globals = stubGlobals();
    globals.mockReadBody.mockResolvedValue({
      purchase_order_uuid: "po-1",
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      items: [
        {
          order_index: 0,
          cost_code_uuid: "cc-1",
          cost_code_label: "01 Concrete",
          item_type_uuid: "type-1",
          item_type_label: "Concrete",
          item_uuid: "item-1",
          name: "Concrete Mix",
          description: "High strength concrete",
          model_number: "M-123",
          location_uuid: "loc-1",
          location: "Zone A",
          unit_uuid: "uom-1",
          unit_label: "CY",
          quantity: "5",
          unit_price: "120.5",
          po_quantity: "6",
          po_unit_price: "130.75",
          po_total: "784.5",
          total: "602.5",
        },
      ],
    });

    const deleteEqSpy = vi.fn(() => Promise.resolve({ error: null }));
    const insertedBatches: any[][] = [];
    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === "purchase_order_items_list") {
          return {
            delete: vi.fn(() => ({ eq: deleteEqSpy })),
            insert: vi.fn((rows: any[]) => {
              insertedBatches.push(rows);
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {
          select: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: {
                  corporation_uuid: "corp-1",
                  project_uuid: "proj-1",
                },
                error: null,
              })
            ),
          })),
        };
      }),
    };
    vi.doMock("@/utils/supabaseServer", () => ({
      supabaseServer: supabaseMock,
    }));

    globals.mockGetQuery.mockReturnValue({});

    const { default: handler } = await import(
      "@/server/api/purchase-order-items/index"
    );
    const response = await handler(makeEvent("POST"));

    expect(deleteEqSpy).toHaveBeenCalledWith("purchase_order_uuid", "po-1");
    expect(insertedBatches).toHaveLength(1);
    expect(insertedBatches[0]).toHaveLength(1);
    expect(insertedBatches[0][0]).toMatchObject({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      purchase_order_uuid: "po-1",
      order_index: 0,
      item_name: "Concrete Mix",
      quantity: 6,
      po_unit_price: 130.75,
      po_total: 784.5,
    });
    expect(response).toEqual({ success: true });
  });

  it("saves null for quantity when po_quantity is not provided", async () => {
    const globals = stubGlobals();
    globals.mockReadBody.mockResolvedValue({
      purchase_order_uuid: "po-1",
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      items: [
        {
          order_index: 0,
          cost_code_uuid: "cc-1",
          item_uuid: "item-1",
          name: "Concrete Mix",
          quantity: 10, // Estimate has quantity of 10
          unit_price: 100, // Estimate has unit_price of 100
          po_quantity: null, // User did not enter po_quantity
          po_unit_price: null, // User did not enter po_unit_price
          po_total: null,
          total: 1000,
        },
      ],
    });

    const deleteEqSpy = vi.fn(() => Promise.resolve({ error: null }));
    const insertedBatches: any[][] = [];
    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === "purchase_order_items_list") {
          return {
            delete: vi.fn(() => ({ eq: deleteEqSpy })),
            insert: vi.fn((rows: any[]) => {
              insertedBatches.push(rows);
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {
          select: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: {
                  corporation_uuid: "corp-1",
                  project_uuid: "proj-1",
                },
                error: null,
              })
            ),
          })),
        };
      }),
    };
    vi.doMock("@/utils/supabaseServer", () => ({
      supabaseServer: supabaseMock,
    }));

    globals.mockGetQuery.mockReturnValue({});

    const { default: handler } = await import(
      "@/server/api/purchase-order-items/index"
    );
    const response = await handler(makeEvent("POST"));

    expect(deleteEqSpy).toHaveBeenCalledWith("purchase_order_uuid", "po-1");
    expect(insertedBatches).toHaveLength(1);
    expect(insertedBatches[0]).toHaveLength(1);
    // Should save null for quantity and unit_price, NOT the estimate's values
    expect(insertedBatches[0][0]).toMatchObject({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      purchase_order_uuid: "po-1",
      order_index: 0,
      item_name: "Concrete Mix",
      quantity: null, // Should be null, not 10 from estimate
      unit_price: null, // Should be null, not 100 from estimate
      po_quantity: null,
      po_unit_price: null,
      po_total: null,
      total: 1000, // Estimate total remains unchanged
    });
    expect(response).toEqual({ success: true });
  });

  it("deletes items when empty array provided", async () => {
    const globals = stubGlobals();
    globals.mockReadBody.mockResolvedValue({
      purchase_order_uuid: "po-1",
      items: [],
    });

    const deleteEqSpy = vi.fn(() => Promise.resolve({ error: null }));
    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === "purchase_order_items_list") {
          return {
            delete: vi.fn(() => ({ eq: deleteEqSpy })),
            insert: vi.fn(() => Promise.resolve({ error: null })),
          };
        }
        if (table === "purchase_order_forms") {
          const maybeSingleResponse = Promise.resolve({
            data: {
              corporation_uuid: "corp-1",
              project_uuid: "proj-1",
            },
            error: null,
          });
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => maybeSingleResponse),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({ data: null, error: null })
            ),
          })),
        };
      }),
    };
    vi.doMock("@/utils/supabaseServer", () => ({
      supabaseServer: supabaseMock,
    }));

    globals.mockGetQuery.mockReturnValue({});

    const { default: handler } = await import(
      "@/server/api/purchase-order-items/index"
    );
    const response = await handler(makeEvent("POST"));

    expect(deleteEqSpy).toHaveBeenCalledWith("purchase_order_uuid", "po-1");
    expect(response).toEqual({ success: true });
  });
});


