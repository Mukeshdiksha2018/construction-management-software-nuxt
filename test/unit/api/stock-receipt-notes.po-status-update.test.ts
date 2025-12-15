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

describe("server/api/stock-receipt-notes - Purchase Order Status Update", () => {
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

  describe("POST - Update PO status to Partially_Received", () => {
    it("should NOT update PO status when save_as_open_po is false", async () => {
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

      await handler.default(event);

      // Verify PO status was NOT updated
      expect(poUpdateSpy).not.toHaveBeenCalled();
    });

    it("should NOT update PO status when receipt_type is change_order", async () => {
      const globals = stubGlobals();
      const changeOrderUuid = "co-123";
      const corporationUuid = "corp-123";

      const mockReceiptNote = {
        uuid: "receipt-note-123",
        corporation_uuid: corporationUuid,
        change_order_uuid: changeOrderUuid,
        receipt_type: "change_order",
        grn_number: "GRN-001",
        status: "Shipment",
        is_active: true,
      };

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
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("POST");
      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: corporationUuid,
        change_order_uuid: changeOrderUuid,
        receipt_type: "change_order",
        save_as_open_po: true,
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

      await handler.default(event);

      // Verify PO status was NOT updated (because it's a change order, not a purchase order)
      expect(poUpdateSpy).not.toHaveBeenCalled();
    });

    it("should NOT update PO status when purchase_order_uuid is missing", async () => {
      const globals = stubGlobals();
      const corporationUuid = "corp-123";

      const mockReceiptNote = {
        uuid: "receipt-note-123",
        corporation_uuid: corporationUuid,
        purchase_order_uuid: null,
        receipt_type: "purchase_order",
        grn_number: "GRN-001",
        status: "Shipment",
        is_active: true,
      };

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
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("POST");
      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: corporationUuid,
        purchase_order_uuid: null,
        receipt_type: "purchase_order",
        save_as_open_po: true,
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

      await handler.default(event);

      // Verify PO status was NOT updated (no purchase_order_uuid)
      expect(poUpdateSpy).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully when PO status update fails", async () => {
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

      const poUpdateError = { message: "Database error updating PO status" };
      const poUpdateSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: poUpdateError })),
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
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("POST");
      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        receipt_type: "purchase_order",
        save_as_open_po: true,
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
        "[StockReceiptNotes] Failed to update PO status to Partially_Received:",
        poUpdateError
      );

      // Verify receipt note was still created despite PO update failure
      expect(supabaseMock.from).toHaveBeenCalledWith("stock_receipt_notes");

      consoleErrorSpy.mockRestore();
    });
  });

  describe("PUT - Update PO status to Partially_Received", () => {
    it("should NOT update PO status when updating receipt note without save_as_open_po flag", async () => {
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
        grn_number: "GRN-001",
        status: "Shipment",
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

      // Verify PO status was NOT updated
      expect(poUpdateSpy).not.toHaveBeenCalled();
    });

    it("should handle case when save_as_open_po is undefined (should not update)", async () => {
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
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("POST");
      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        receipt_type: "purchase_order",
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

      await handler.default(event);

      // Verify PO status was NOT updated (save_as_open_po is undefined, not true)
      expect(poUpdateSpy).not.toHaveBeenCalled();
    });
  });
});
