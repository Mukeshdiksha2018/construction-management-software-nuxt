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

// Note: $fetch mock removed - we no longer use external API calls for update-return-fields

describe("server/api/stock-return-notes - Purchase Order Status Update", () => {
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("POST - Update PO status to Completed when all items have zero shortfall", () => {
    it("should NOT update PO status to Completed when items still have shortfall", async () => {
      const globals = stubGlobals();
      const poUuid = "po-123";
      const corporationUuid = "corp-123";
      const item1Uuid = "item-1";
      const item2Uuid = "item-2";

      const mockReturnNote = {
        uuid: "return-note-123",
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        is_active: true,
      };

      // Mock PO items: ordered quantities
      const poItems = [
        { uuid: item1Uuid, po_quantity: 100 },
        { uuid: item2Uuid, po_quantity: 50 },
      ];

      // Mock receipt note items: received quantities
      const receiptNoteItems = [
        { item_uuid: item1Uuid, received_quantity: 60 },
        { item_uuid: item2Uuid, received_quantity: 30 },
      ];

      // Mock return note items: returned quantities
      // After this return, item1: 100 - 60 - 30 = 10 (still has shortfall), item2: 50 - 30 - 20 = 0
      const returnNoteItems = [
        { item_uuid: item1Uuid, return_quantity: 30 },
        { item_uuid: item2Uuid, return_quantity: 20 },
      ];

      const poUpdateSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_return_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "return_number") {
                return createChainableQuery({ data: [], error: null });
              }
              return createChainableQuery({ data: mockReturnNote, error: null });
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockReturnNote, error: null })),
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
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        return_items: [
          { uuid: item1Uuid, return_quantity: 30 },
          { uuid: item2Uuid, return_quantity: 20 },
        ],
      });

      const handler = await import("@/server/api/stock-return-notes/index");
      const event = {
        node: {
          req: {
            method: "POST",
          },
        },
      } as any;

      await handler.default(event);

      // Verify PO status was NOT updated (items still have shortfall)
      expect(poUpdateSpy).not.toHaveBeenCalled();
    });

    it("should NOT update PO status when return_type is change_order", async () => {
      const globals = stubGlobals();
      const changeOrderUuid = "co-123";
      const corporationUuid = "corp-123";

      const mockReturnNote = {
        uuid: "return-note-123",
        corporation_uuid: corporationUuid,
        change_order_uuid: changeOrderUuid,
        return_type: "change_order",
        return_number: "RTN-001",
        status: "Waiting",
        is_active: true,
      };

      const poUpdateSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_return_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "return_number") {
                return createChainableQuery({ data: [], error: null });
              }
              return createChainableQuery({ data: mockReturnNote, error: null });
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockReturnNote, error: null })),
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
        return_type: "change_order",
        return_number: "RTN-001",
        status: "Waiting",
      });

      const handler = await import("@/server/api/stock-return-notes/index");
      const event = {
        node: {
          req: {
            method: "POST",
          },
        },
      } as any;

      await handler.default(event);

      // Verify PO status was NOT updated (it's a change order, not a purchase order)
      expect(poUpdateSpy).not.toHaveBeenCalled();
    });

    it("should NOT update PO status when purchase_order_uuid is missing", async () => {
      const globals = stubGlobals();
      const corporationUuid = "corp-123";

      const mockReturnNote = {
        uuid: "return-note-123",
        corporation_uuid: corporationUuid,
        purchase_order_uuid: null,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        is_active: true,
      };

      const poUpdateSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_return_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "return_number") {
                return createChainableQuery({ data: [], error: null });
              }
              return createChainableQuery({ data: mockReturnNote, error: null });
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockReturnNote, error: null })),
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
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
      });

      const handler = await import("@/server/api/stock-return-notes/index");
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
      const item1Uuid = "item-1";

      const mockReturnNote = {
        uuid: "return-note-123",
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        is_active: true,
      };

      const poItems = [{ uuid: item1Uuid, po_quantity: 100 }];
      const receiptNoteItems = [{ item_uuid: item1Uuid, received_quantity: 50 }];
      const returnNoteItems = [{ item_uuid: item1Uuid, return_quantity: 50 }];

      const poUpdateError = { message: "Database error updating PO status" };
      const poUpdateSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: poUpdateError })),
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_return_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "return_number") {
                return createChainableQuery({ data: [], error: null });
              }
              return createChainableQuery({ data: mockReturnNote, error: null });
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockReturnNote, error: null })),
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
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        return_items: [{ uuid: item1Uuid, return_quantity: 50 }],
      });

      const handler = await import("@/server/api/stock-return-notes/index");
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
        "[StockReturnNotes] Failed to update PO status to Completed:",
        poUpdateError
      );

      // Verify return note was still created despite PO update failure
      expect(supabaseMock.from).toHaveBeenCalledWith("stock_return_notes");

      consoleErrorSpy.mockRestore();
    });

    it("should handle errors gracefully when fetching PO items fails", async () => {
      const globals = stubGlobals();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const poUuid = "po-123";
      const corporationUuid = "corp-123";

      const mockReturnNote = {
        uuid: "return-note-123",
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        is_active: true,
      };

      const poUpdateSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_return_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "return_number") {
                return createChainableQuery({ data: [], error: null });
              }
              return createChainableQuery({ data: mockReturnNote, error: null });
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockReturnNote, error: null })),
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
            select: vi.fn(() => createChainableQuery({ data: null, error: { message: "Failed to fetch PO items" } })),
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
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
      });

      const handler = await import("@/server/api/stock-return-notes/index");
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
        "[StockReturnNotes] Failed to fetch PO items for completion check:",
        expect.objectContaining({ message: "Failed to fetch PO items" })
      );

      // Verify PO status was NOT updated (because we couldn't check completion)
      expect(poUpdateSpy).not.toHaveBeenCalled();

      // Verify return note was still created despite error
      expect(supabaseMock.from).toHaveBeenCalledWith("stock_return_notes");

      consoleErrorSpy.mockRestore();
    });
  });

  describe("PUT - Update PO status to Completed when all items have zero shortfall", () => {
    it("should handle case when PO has no items (should not update)", async () => {
      const globals = stubGlobals();
      const poUuid = "po-123";
      const corporationUuid = "corp-123";

      const mockReturnNote = {
        uuid: "return-note-123",
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        is_active: true,
      };

      const poUpdateSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_return_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "return_number") {
                return createChainableQuery({ data: [], error: null });
              }
              return createChainableQuery({ data: mockReturnNote, error: null });
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockReturnNote, error: null })),
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
            select: vi.fn(() => createChainableQuery({ data: [], error: null })),
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
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
      });

      const handler = await import("@/server/api/stock-return-notes/index");
      const event = {
        node: {
          req: {
            method: "POST",
          },
        },
      } as any;

      await handler.default(event);

      // Verify PO status was NOT updated (no items to check)
      expect(poUpdateSpy).not.toHaveBeenCalled();
    });

    it("should handle case when receipt note items fetch fails gracefully", async () => {
      const globals = stubGlobals();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const poUuid = "po-123";
      const corporationUuid = "corp-123";
      const item1Uuid = "item-1";

      const mockReturnNote = {
        uuid: "return-note-123",
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        is_active: true,
      };

      const poItems = [{ uuid: item1Uuid, po_quantity: 100 }];

      const poUpdateSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_return_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "return_number") {
                return createChainableQuery({ data: [], error: null });
              }
              return createChainableQuery({ data: mockReturnNote, error: null });
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockReturnNote, error: null })),
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
            select: vi.fn(() => createChainableQuery({ data: null, error: { message: "Failed to fetch receipt items" } })),
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
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
      });

      const handler = await import("@/server/api/stock-return-notes/index");
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
        "[StockReturnNotes] Failed to fetch receipt note items for completion check:",
        expect.objectContaining({ message: "Failed to fetch receipt items" })
      );

      // Verify PO status was NOT updated (because we couldn't check completion)
      expect(poUpdateSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
