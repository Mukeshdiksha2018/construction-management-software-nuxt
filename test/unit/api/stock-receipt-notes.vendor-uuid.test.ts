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

describe("server/api/stock-receipt-notes - vendor_uuid Column Handling", () => {
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

  describe("POST - Create receipt note with vendor_uuid", () => {
    it("should successfully create receipt note with vendor_uuid when column exists", async () => {
      const globals = stubGlobals();
      const corporationUuid = "corp-123";
      const vendorUuid = "vendor-123";
      const poUuid = "po-123";

      const mockReceiptNote = {
        uuid: "receipt-note-123",
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        vendor_uuid: vendorUuid,
        receipt_type: "purchase_order",
        grn_number: "GRN-001",
        status: "Shipment",
        is_active: true,
      };

      const insertSpy = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockReceiptNote, error: null })),
        })),
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
            insert: insertSpy,
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
        vendor_uuid: vendorUuid,
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

      // Verify insert was called
      expect(insertSpy).toHaveBeenCalled();
      
      // Verify vendor_uuid was included in the insert data
      const insertCall = insertSpy.mock.calls[0][0];
      expect(insertCall[0]).toHaveProperty("vendor_uuid", vendorUuid);
    });

    it("should retry without vendor_uuid when column doesn't exist in schema cache", async () => {
      const globals = stubGlobals();
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const corporationUuid = "corp-123";
      const vendorUuid = "vendor-123";
      const poUuid = "po-123";

      const mockReceiptNote = {
        uuid: "receipt-note-123",
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        receipt_type: "purchase_order",
        grn_number: "GRN-001",
        status: "Shipment",
        is_active: true,
      };

      const schemaError = {
        message: "Could not find the 'vendor_uuid' column of 'stock_receipt_notes' in the schema cache",
      };

      let insertCallCount = 0;
      const insertSpy = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => {
            insertCallCount++;
            // First call fails with schema error, second succeeds
            if (insertCallCount === 1) {
              return Promise.resolve({ data: null, error: schemaError });
            }
            return Promise.resolve({ data: mockReceiptNote, error: null });
          }),
        })),
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
            insert: insertSpy,
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
        vendor_uuid: vendorUuid,
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

      // Should not throw error, should retry without vendor_uuid
      await handler.default(event);

      // Verify insert was called twice (first attempt, then retry without vendor_uuid)
      expect(insertSpy).toHaveBeenCalledTimes(2);
      
      // Verify second call (retry) does NOT include vendor_uuid
      // This is the key assertion - the retry should work without vendor_uuid
      const secondInsertCall = insertSpy.mock.calls[1][0];
      expect(Array.isArray(secondInsertCall)).toBe(true);
      expect(secondInsertCall[0]).not.toHaveProperty("vendor_uuid");
      
      // Verify warning was logged about retrying without vendor_uuid
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[StockReceiptNotes] vendor_uuid column not found in schema, retrying without it"
      );
      
      // Verify the operation succeeded (no error thrown)
      // The handler should complete successfully after the retry

      consoleWarnSpy.mockRestore();
    });

    it("should successfully create receipt note without vendor_uuid", async () => {
      const globals = stubGlobals();
      const corporationUuid = "corp-123";
      const poUuid = "po-123";

      const mockReceiptNote = {
        uuid: "receipt-note-123",
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        receipt_type: "purchase_order",
        grn_number: "GRN-001",
        status: "Shipment",
        is_active: true,
      };

      const insertSpy = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockReceiptNote, error: null })),
        })),
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
            insert: insertSpy,
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

      // Verify insert was called
      expect(insertSpy).toHaveBeenCalled();
      
      // Verify vendor_uuid was NOT included in the insert data
      const insertCall = insertSpy.mock.calls[0][0];
      expect(insertCall[0]).not.toHaveProperty("vendor_uuid");
    });

    it("should not include vendor_uuid when value is null or empty string", async () => {
      const globals = stubGlobals();
      const corporationUuid = "corp-123";
      const poUuid = "po-123";

      const mockReceiptNote = {
        uuid: "receipt-note-123",
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        receipt_type: "purchase_order",
        grn_number: "GRN-001",
        status: "Shipment",
        is_active: true,
      };

      const insertSpy = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockReceiptNote, error: null })),
        })),
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
            insert: insertSpy,
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
        vendor_uuid: null, // null value
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

      // Verify insert was called
      expect(insertSpy).toHaveBeenCalled();
      
      // Verify vendor_uuid was NOT included in the insert data when null
      const insertCall = insertSpy.mock.calls[0][0];
      expect(insertCall[0]).not.toHaveProperty("vendor_uuid");
    });
  });

  describe("PUT - Update receipt note with vendor_uuid", () => {
    it("should successfully update receipt note with vendor_uuid when column exists", async () => {
      const globals = stubGlobals();
      const corporationUuid = "corp-123";
      const vendorUuid = "vendor-123";
      const poUuid = "po-123";
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

      const updatedReceiptNote = {
        ...existingReceiptNote,
        vendor_uuid: vendorUuid,
      };

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: updatedReceiptNote, error: null })),
          })),
        })),
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
            update: updateSpy,
          };
        }
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("PUT");
      globals.mockGetQuery.mockReturnValue({ uuid: receiptNoteUuid });
      globals.mockReadBody.mockResolvedValue({
        uuid: receiptNoteUuid,
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        vendor_uuid: vendorUuid,
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

      // Verify update was called
      expect(updateSpy).toHaveBeenCalled();
      
      // Verify vendor_uuid was included in the update payload
      const updateCall = updateSpy.mock.calls[0][0];
      expect(updateCall).toHaveProperty("vendor_uuid", vendorUuid);
    });

    it("should retry without vendor_uuid when column doesn't exist in schema cache", async () => {
      const globals = stubGlobals();
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const corporationUuid = "corp-123";
      const vendorUuid = "vendor-123";
      const poUuid = "po-123";
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

      const updatedReceiptNote = {
        ...existingReceiptNote,
      };

      const schemaError = {
        message: "Could not find the 'vendor_uuid' column of 'stock_receipt_notes' in the schema cache",
      };

      let updateCallCount = 0;
      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => {
              updateCallCount++;
              // First call fails with schema error, second succeeds
              if (updateCallCount === 1) {
                return Promise.resolve({ data: null, error: schemaError });
              }
              return Promise.resolve({ data: updatedReceiptNote, error: null });
            }),
          })),
        })),
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
            update: updateSpy,
          };
        }
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("PUT");
      globals.mockGetQuery.mockReturnValue({ uuid: receiptNoteUuid });
      globals.mockReadBody.mockResolvedValue({
        uuid: receiptNoteUuid,
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        vendor_uuid: vendorUuid,
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

      // Should not throw error, should retry without vendor_uuid
      await handler.default(event);

      // Verify update was called twice (first attempt, then retry without vendor_uuid)
      expect(updateSpy).toHaveBeenCalledTimes(2);
      
      // Verify second call (retry) does NOT include vendor_uuid
      // This is the key assertion - the retry should work without vendor_uuid
      const secondUpdateCall = updateSpy.mock.calls[1][0];
      expect(secondUpdateCall).not.toHaveProperty("vendor_uuid");
      
      // Verify warning was logged about retrying without vendor_uuid
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[StockReceiptNotes] vendor_uuid column not found in schema, retrying update without it"
      );
      
      // Verify the operation succeeded (no error thrown)
      // The handler should complete successfully after the retry
      
      // Verify warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[StockReceiptNotes] vendor_uuid column not found in schema, retrying update without it"
      );

      consoleWarnSpy.mockRestore();
    });

    it("should successfully update receipt note without vendor_uuid", async () => {
      const globals = stubGlobals();
      const corporationUuid = "corp-123";
      const poUuid = "po-123";
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

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: existingReceiptNote, error: null })),
          })),
        })),
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
            update: updateSpy,
          };
        }
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("PUT");
      globals.mockGetQuery.mockReturnValue({ uuid: receiptNoteUuid });
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

      // Verify update was called
      expect(updateSpy).toHaveBeenCalled();
      
      // Verify vendor_uuid was NOT included in the update payload
      const updateCall = updateSpy.mock.calls[0][0];
      expect(updateCall).not.toHaveProperty("vendor_uuid");
    });

    it("should not retry on non-vendor_uuid schema errors", async () => {
      const globals = stubGlobals();
      const corporationUuid = "corp-123";
      const vendorUuid = "vendor-123";
      const poUuid = "po-123";
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

      const otherError = {
        message: "Some other database error",
      };

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: otherError })),
          })),
        })),
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
            update: updateSpy,
          };
        }
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("PUT");
      globals.mockGetQuery.mockReturnValue({ uuid: receiptNoteUuid });
      globals.mockReadBody.mockResolvedValue({
        uuid: receiptNoteUuid,
        corporation_uuid: corporationUuid,
        purchase_order_uuid: poUuid,
        vendor_uuid: vendorUuid,
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

      // Should throw error (not retry) for non-vendor_uuid errors
      await expect(handler.default(event)).rejects.toThrow();

      // Verify update was called only once (no retry)
      expect(updateSpy).toHaveBeenCalledTimes(1);
    });
  });
});

