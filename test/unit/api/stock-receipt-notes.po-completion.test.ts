import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Create a chainable mock builder that supports multiple chained calls
const createChainableQuery = (finalResult: any) => {
  const chain: any = {
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve(finalResult)),
    single: vi.fn(() => Promise.resolve(finalResult)),
    maybeSingle: vi.fn(() => Promise.resolve(finalResult)),
  };
  // Make it thenable - when awaited, it resolves to finalResult
  chain.then = (onFulfilled?: any, onRejected?: any) => {
    return Promise.resolve(finalResult).then(onFulfilled, onRejected);
  };
  chain.catch = (onRejected?: any) => {
    return Promise.resolve(finalResult).catch(onRejected);
  };
  return chain;
};

// Create hoisted mock that can be updated per test
const supabaseMock = vi.hoisted(() => {
  return {
    from: vi.fn((table: string) => {
      return {
        select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      };
    }) as any,
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "http://example.com/file" } })),
      })),
    },
  };
});

vi.mock("@/utils/supabaseServer", () => ({
  supabaseServer: supabaseMock,
}));

// Mock $fetch for update-receipt-fields endpoint
const mockFetch = vi.fn();
vi.mock("#imports", () => ({
  $fetch: mockFetch,
}));

describe("server/api/stock-receipt-notes - Purchase Order/Change Order Completion", () => {
  const stubGlobals = () => {
    const mockDefineEventHandler = vi.fn((handler) => handler);
    const mockGetMethod = vi.fn(() => "POST");
    const mockGetQuery = vi.fn(() => ({}));
    const mockReadBody = vi.fn(() => Promise.resolve({}));
    const mockCreateError = vi.fn((options: any) => {
      const error = new Error(options.statusMessage);
      (error as any).statusCode = options.statusCode;
      return error;
    });

    vi.stubGlobal("defineEventHandler", mockDefineEventHandler);
    vi.stubGlobal("getMethod", mockGetMethod);
    vi.stubGlobal("getQuery", mockGetQuery);
    vi.stubGlobal("readBody", mockReadBody);
    vi.stubGlobal("createError", mockCreateError);
    vi.stubGlobal("$fetch", mockFetch);

    return {
      mockDefineEventHandler,
      mockGetMethod,
      mockGetQuery,
      mockReadBody,
      mockCreateError,
    };
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("POST - Mark PO as Completed when all items fully received", () => {
    it("should mark PO as Completed when all items are fully received (no shortfall)", async () => {
      const globals = stubGlobals();
      const poUuid = "po-123";
      const corporationUuid = "corp-123";

      const mockReceiptNote = {
        uuid: "receipt-note-123",
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        receipt_type: "purchase_order",
        grn_number: "GRN-001",
        status: "Shipment",
        is_active: true,
      };

      // Mock PO items - all fully received
      const poItems = [
        { uuid: "item-1", po_quantity: 100 },
        { uuid: "item-2", po_quantity: 50 },
      ];

      // Mock receipt note items - all items fully received
      const receiptNoteItems = [
        { item_uuid: "item-1", received_quantity: 100 },
        { item_uuid: "item-2", received_quantity: 50 },
      ];

      // Mock return note items - no returns
      const returnNoteItems: any[] = [];

      const poEqSpy = vi.fn(() => Promise.resolve({ error: null }));
      const poUpdateSpy = vi.fn(() => ({
        eq: poEqSpy,
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_receipt_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "grn_number") {
                return createChainableQuery({ data: [], error: null });
              }
              return createChainableQuery({ data: mockReceiptNote, error: null });
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockReceiptNote, error: null })),
              })),
            })),
          };
        }
        if (table === "purchase_order_forms") {
          return {
            update: poUpdateSpy,
          };
        }
        if (table === "purchase_order_items_list") {
          return {
            select: vi.fn(() => createChainableQuery({ data: poItems, error: null })),
          };
        }
        if (table === "receipt_note_items") {
          return {
            select: vi.fn(() => createChainableQuery({ data: receiptNoteItems, error: null })),
          };
        }
        if (table === "return_note_items") {
          return {
            select: vi.fn(() => createChainableQuery({ data: returnNoteItems, error: null })),
          };
        }
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("POST");
      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        receipt_type: "purchase_order",
        save_as_open_po: false, // Normal save, not saving as open PO
        grn_number: "GRN-001",
        status: "Shipment",
        receipt_items: [
          { uuid: "item-1", received_quantity: 100 },
          { uuid: "item-2", received_quantity: 50 },
        ],
      });

      const handler = await import("@/server/api/stock-receipt-notes/index");
      const event = {
        node: {
          req: {
            method: "POST",
          },
        },
      } as any;

      await handler.default(event);

      // Verify PO status was updated to Completed
      expect(poUpdateSpy).toHaveBeenCalledWith({ status: "Completed" });
      expect(poEqSpy).toHaveBeenCalledWith("uuid", poUuid);
    });

    it("should NOT mark PO as Completed when there is shortfall remaining", async () => {
      const globals = stubGlobals();
      const poUuid = "po-123";
      const corporationUuid = "corp-123";

      const mockReceiptNote = {
        uuid: "receipt-note-123",
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        receipt_type: "purchase_order",
        grn_number: "GRN-001",
        status: "Shipment",
        is_active: true,
      };

      // Mock PO items - ordered 100, but only 80 received (shortfall of 20)
      const poItems = [
        { uuid: "item-1", po_quantity: 100 },
      ];

      // Mock receipt note items - only 80 received (shortfall of 20)
      const receiptNoteItems = [
        { item_uuid: "item-1", received_quantity: 80 },
      ];

      // Mock return note items - no returns
      const returnNoteItems: any[] = [];

      const poUpdateSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_receipt_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "grn_number") {
                return createChainableQuery({ data: [], error: null });
              }
              return createChainableQuery({ data: mockReceiptNote, error: null });
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockReceiptNote, error: null })),
              })),
            })),
          };
        }
        if (table === "purchase_order_forms") {
          return {
            update: poUpdateSpy,
          };
        }
        if (table === "purchase_order_items_list") {
          return {
            select: vi.fn(() => createChainableQuery({ data: poItems, error: null })),
          };
        }
        if (table === "receipt_note_items") {
          return {
            select: vi.fn(() => createChainableQuery({ data: receiptNoteItems, error: null })),
          };
        }
        if (table === "return_note_items") {
          return {
            select: vi.fn(() => createChainableQuery({ data: returnNoteItems, error: null })),
          };
        }
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("POST");
      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        receipt_type: "purchase_order",
        save_as_open_po: false,
        grn_number: "GRN-001",
        status: "Shipment",
        receipt_items: [
          { uuid: "item-1", received_quantity: 80 },
        ],
      });

      const handler = await import("@/server/api/stock-receipt-notes/index");
      const event = {
        node: {
          req: {
            method: "POST",
          },
        },
      } as any;

      await handler.default(event);

      // Verify PO status was NOT updated to Completed (shortfall exists)
      expect(poUpdateSpy).not.toHaveBeenCalled();
    });

    it("should mark PO as Completed when all items fully received including returns", async () => {
      const globals = stubGlobals();
      const poUuid = "po-123";
      const corporationUuid = "corp-123";

      const mockReceiptNote = {
        uuid: "receipt-note-123",
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        receipt_type: "purchase_order",
        grn_number: "GRN-001",
        status: "Shipment",
        is_active: true,
      };

      // Mock PO items - ordered 100
      const poItems = [
        { uuid: "item-1", po_quantity: 100 },
      ];

      // Mock receipt note items - 80 received
      const receiptNoteItems = [
        { item_uuid: "item-1", received_quantity: 80 },
      ];

      // Mock return note items - 20 returned (80 received + 20 returned = 100 total, no shortfall)
      const returnNoteItems = [
        { item_uuid: "item-1", return_quantity: 20 },
      ];

      const poUpdateSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_receipt_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "grn_number") {
                return createChainableQuery({ data: [], error: null });
              }
              return createChainableQuery({ data: mockReceiptNote, error: null });
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockReceiptNote, error: null })),
              })),
            })),
          };
        }
        if (table === "purchase_order_forms") {
          return {
            update: poUpdateSpy,
          };
        }
        if (table === "purchase_order_items_list") {
          return {
            select: vi.fn(() => createChainableQuery({ data: poItems, error: null })),
          };
        }
        if (table === "receipt_note_items") {
          return {
            select: vi.fn(() => createChainableQuery({ data: receiptNoteItems, error: null })),
          };
        }
        if (table === "return_note_items") {
          return {
            select: vi.fn(() => createChainableQuery({ data: returnNoteItems, error: null })),
          };
        }
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("POST");
      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        receipt_type: "purchase_order",
        save_as_open_po: false,
        grn_number: "GRN-001",
        status: "Shipment",
        receipt_items: [
          { uuid: "item-1", received_quantity: 80 },
        ],
      });

      const handler = await import("@/server/api/stock-receipt-notes/index");
      const event = {
        node: {
          req: {
            method: "POST",
          },
        },
      } as any;

      await handler.default(event);

      // Verify PO status was updated to Completed (80 received + 20 returned = 100, no shortfall)
      expect(poUpdateSpy).toHaveBeenCalledWith({ status: "Completed" });
    });

    it("should NOT mark PO as Completed when save_as_open_po is true", async () => {
      const globals = stubGlobals();
      const poUuid = "po-123";
      const corporationUuid = "corp-123";

      const mockReceiptNote = {
        uuid: "receipt-note-123",
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        receipt_type: "purchase_order",
        grn_number: "GRN-001",
        status: "Shipment",
        is_active: true,
      };

      const poItems = [
        { uuid: "item-1", po_quantity: 100 },
      ];

      const receiptNoteItems = [
        { item_uuid: "item-1", received_quantity: 100 },
      ];

      const returnNoteItems: any[] = [];

      const poUpdateSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_receipt_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "grn_number") {
                return createChainableQuery({ data: [], error: null });
              }
              return createChainableQuery({ data: mockReceiptNote, error: null });
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockReceiptNote, error: null })),
              })),
            })),
          };
        }
        if (table === "purchase_order_forms") {
          return {
            update: poUpdateSpy,
          };
        }
        if (table === "purchase_order_items_list") {
          return {
            select: vi.fn(() => createChainableQuery({ data: poItems, error: null })),
          };
        }
        if (table === "receipt_note_items") {
          return {
            select: vi.fn(() => createChainableQuery({ data: receiptNoteItems, error: null })),
          };
        }
        if (table === "return_note_items") {
          return {
            select: vi.fn(() => createChainableQuery({ data: returnNoteItems, error: null })),
          };
        }
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("POST");
      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        receipt_type: "purchase_order",
        save_as_open_po: true, // Saving as open PO - should mark as Partially_Received, not Completed
        grn_number: "GRN-001",
        status: "Shipment",
        receipt_items: [
          { uuid: "item-1", received_quantity: 100 },
        ],
      });

      const handler = await import("@/server/api/stock-receipt-notes/index");
      const event = {
        node: {
          req: {
            method: "POST",
          },
        },
      } as any;

      await handler.default(event);

      // Verify PO status was updated to Partially_Received (not Completed) when save_as_open_po is true
      expect(poUpdateSpy).toHaveBeenCalledWith({ status: "Partially_Received" });
    });
  });

  describe("POST - Mark Change Order as Completed when all items fully received", () => {
    it("should mark CO as Completed when all items are fully received (no shortfall)", async () => {
      const globals = stubGlobals();
      const coUuid = "co-123";
      const corporationUuid = "corp-123";

      const mockReceiptNote = {
        uuid: "receipt-note-123",
        corporation_uuid: corporationUuid,
        change_order_uuid: coUuid,
        receipt_type: "change_order",
        grn_number: "GRN-001",
        status: "Shipment",
        is_active: true,
      };

      // Mock CO items - all fully received
      const coItems = [
        { uuid: "item-1", co_quantity: 100 },
        { uuid: "item-2", co_quantity: 50 },
      ];

      // Mock receipt note items - all items fully received
      const receiptNoteItems = [
        { item_uuid: "item-1", received_quantity: 100 },
        { item_uuid: "item-2", received_quantity: 50 },
      ];

      // Mock return note items - no returns
      const returnNoteItems: any[] = [];

      const coEqSpy = vi.fn(() => Promise.resolve({ error: null }));
      const coUpdateSpy = vi.fn(() => ({
        eq: coEqSpy,
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_receipt_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "grn_number") {
                return createChainableQuery({ data: [], error: null });
              }
              return createChainableQuery({ data: mockReceiptNote, error: null });
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockReceiptNote, error: null })),
              })),
            })),
          };
        }
        if (table === "change_orders") {
          return {
            update: coUpdateSpy,
          };
        }
        if (table === "change_order_items_list") {
          return {
            select: vi.fn(() => createChainableQuery({ data: coItems, error: null })),
          };
        }
        if (table === "receipt_note_items") {
          return {
            select: vi.fn(() => createChainableQuery({ data: receiptNoteItems, error: null })),
          };
        }
        if (table === "return_note_items") {
          return {
            select: vi.fn(() => createChainableQuery({ data: returnNoteItems, error: null })),
          };
        }
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("POST");
      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: corporationUuid,
        change_order_uuid: coUuid,
        receipt_type: "change_order",
        save_as_open_po: false,
        grn_number: "GRN-001",
        status: "Shipment",
        receipt_items: [
          { uuid: "item-1", received_quantity: 100 },
          { uuid: "item-2", received_quantity: 50 },
        ],
      });

      const handler = await import("@/server/api/stock-receipt-notes/index");
      const event = {
        node: {
          req: {
            method: "POST",
          },
        },
      } as any;

      await handler.default(event);

      // Verify CO status was updated to Completed
      expect(coUpdateSpy).toHaveBeenCalledWith({ status: "Completed" });
      expect(coEqSpy).toHaveBeenCalledWith("uuid", coUuid);
    });

    it("should NOT mark CO as Completed when there is shortfall remaining", async () => {
      const globals = stubGlobals();
      const coUuid = "co-123";
      const corporationUuid = "corp-123";

      const mockReceiptNote = {
        uuid: "receipt-note-123",
        corporation_uuid: corporationUuid,
        change_order_uuid: coUuid,
        receipt_type: "change_order",
        grn_number: "GRN-001",
        status: "Shipment",
        is_active: true,
      };

      const coItems = [
        { uuid: "item-1", co_quantity: 100 },
      ];

      const receiptNoteItems = [
        { item_uuid: "item-1", received_quantity: 80 },
      ];

      const returnNoteItems: any[] = [];

      const coUpdateSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_receipt_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "grn_number") {
                return createChainableQuery({ data: [], error: null });
              }
              return createChainableQuery({ data: mockReceiptNote, error: null });
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockReceiptNote, error: null })),
              })),
            })),
          };
        }
        if (table === "change_orders") {
          return {
            update: coUpdateSpy,
          };
        }
        if (table === "change_order_items_list") {
          return {
            select: vi.fn(() => createChainableQuery({ data: coItems, error: null })),
          };
        }
        if (table === "receipt_note_items") {
          return {
            select: vi.fn(() => createChainableQuery({ data: receiptNoteItems, error: null })),
          };
        }
        if (table === "return_note_items") {
          return {
            select: vi.fn(() => createChainableQuery({ data: returnNoteItems, error: null })),
          };
        }
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("POST");
      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: corporationUuid,
        change_order_uuid: coUuid,
        receipt_type: "change_order",
        save_as_open_po: false,
        grn_number: "GRN-001",
        status: "Shipment",
        receipt_items: [
          { uuid: "item-1", received_quantity: 80 },
        ],
      });

      const handler = await import("@/server/api/stock-receipt-notes/index");
      const event = {
        node: {
          req: {
            method: "POST",
          },
        },
      } as any;

      await handler.default(event);

      // Verify CO status was NOT updated to Completed (shortfall exists)
      expect(coUpdateSpy).not.toHaveBeenCalled();
    });
  });

  describe("PUT - Mark PO/CO as Completed when updating receipt note", () => {
    it("should mark PO as Completed when updating receipt note and all items fully received", async () => {
      const globals = stubGlobals();
      const poUuid = "po-123";
      const corporationUuid = "corp-123";
      const receiptNoteUuid = "receipt-note-123";

      const existingReceiptNote = {
        uuid: receiptNoteUuid,
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        receipt_type: "purchase_order",
        grn_number: "GRN-001",
        status: "Shipment",
        is_active: true,
      };

      const poItems = [
        { uuid: "item-1", po_quantity: 100 },
      ];

      const receiptNoteItems = [
        { item_uuid: "item-1", received_quantity: 100 },
      ];

      const returnNoteItems: any[] = [];

      const poUpdateSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_receipt_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "grn_number") {
                return createChainableQuery({ data: [], error: null });
              }
              return createChainableQuery({ data: existingReceiptNote, error: null });
            }),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: existingReceiptNote, error: null })),
                })),
              })),
            })),
          };
        }
        if (table === "purchase_order_forms") {
          return {
            update: poUpdateSpy,
          };
        }
        if (table === "purchase_order_items_list") {
          return {
            select: vi.fn(() => createChainableQuery({ data: poItems, error: null })),
          };
        }
        if (table === "receipt_note_items") {
          return {
            select: vi.fn(() => createChainableQuery({ data: receiptNoteItems, error: null })),
          };
        }
        if (table === "return_note_items") {
          return {
            select: vi.fn(() => createChainableQuery({ data: returnNoteItems, error: null })),
          };
        }
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("PUT");
      globals.mockReadBody.mockResolvedValue({
        uuid: receiptNoteUuid,
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        receipt_type: "purchase_order",
        save_as_open_po: false,
        grn_number: "GRN-001",
        status: "Shipment",
        receipt_items: [
          { uuid: "item-1", received_quantity: 100 },
        ],
      });

      const handler = await import("@/server/api/stock-receipt-notes/index");
      const event = {
        node: {
          req: {
            method: "PUT",
          },
        },
      } as any;

      await handler.default(event);

      // Verify PO status was updated to Completed
      expect(poUpdateSpy).toHaveBeenCalledWith({ status: "Completed" });
    });
  });

  describe("Error handling", () => {
    it("should handle errors gracefully when completion check fails", async () => {
      const globals = stubGlobals();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const poUuid = "po-123";
      const corporationUuid = "corp-123";

      const mockReceiptNote = {
        uuid: "receipt-note-123",
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        receipt_type: "purchase_order",
        grn_number: "GRN-001",
        status: "Shipment",
        is_active: true,
      };

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_receipt_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "grn_number") {
                return createChainableQuery({ data: [], error: null });
              }
              return createChainableQuery({ data: mockReceiptNote, error: null });
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockReceiptNote, error: null })),
              })),
            })),
          };
        }
        if (table === "purchase_order_items_list") {
          // Simulate error when fetching PO items
          return {
            select: vi.fn(() => createChainableQuery({ data: null, error: { message: "Database error" } })),
          };
        }
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("POST");
      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        receipt_type: "purchase_order",
        save_as_open_po: false,
        grn_number: "GRN-001",
        status: "Shipment",
      });

      const handler = await import("@/server/api/stock-receipt-notes/index");
      const event = {
        node: {
          req: {
            method: "POST",
          },
        },
      } as any;

      // Should not throw error, but should log it
      await handler.default(event);

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[StockReceiptNotes] Failed to fetch PO items for completion check:",
        expect.any(Object)
      );

      // Verify receipt note was still created despite error
      expect(supabaseMock.from).toHaveBeenCalledWith("stock_receipt_notes");

      consoleErrorSpy.mockRestore();
    });
  });
});

