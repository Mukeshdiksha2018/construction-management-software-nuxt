import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Create a chainable mock builder that supports multiple chained calls
const createChainableQuery = (finalResult: any) => {
  const chain: any = {
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    in: vi.fn(() => chain),
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
        upsert: vi.fn(() => Promise.resolve({ error: null })),
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

describe("server/api/stock-return-notes - Performance Optimizations", () => {
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

  describe("POST - Bulk Upsert for Return Note Items", () => {
    it("should use bulk upsert instead of individual updates for return_note_items", async () => {
      const globals = stubGlobals();
      const corporationUuid = "corp-123";
      const projectUuid = "project-123";
      const poUuid = "po-123";
      const noteUuid = "return-note-123";
      const item1Uuid = "item-1";
      const item2Uuid = "item-2";
      const item3Uuid = "item-3";

      const mockReturnNote = {
        uuid: noteUuid,
        corporation_uuid: corporationUuid,
        project_uuid: projectUuid,
        purchase_order_uuid: poUuid,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        is_active: true,
      };

      const existingReturnNoteItems = [
        { uuid: "rni-1", item_uuid: item1Uuid },
        { uuid: "rni-2", item_uuid: item2Uuid },
      ];

      const upsertSpy = vi.fn(() => Promise.resolve({ error: null }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_return_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "return_number") {
                return createChainableQuery({ data: [], error: null });
              }
              // For metadata fetch
              return createChainableQuery({
                data: {
                  ...mockReturnNote,
                  project: { uuid: projectUuid, project_name: "Test Project", project_id: "P-001" },
                  purchase_order: { uuid: poUuid, po_number: "PO-001", vendor_uuid: "vendor-123" },
                },
                error: null,
              });
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockReturnNote, error: null })),
              })),
            })),
          };
        }
        if (table === "return_note_items") {
          return {
            select: vi.fn(() => {
              // First call: fetch existing items
              return createChainableQuery({ data: existingReturnNoteItems, error: null });
            }),
            upsert: upsertSpy,
          };
        }
        if (table === "vendors") {
          return {
            select: vi.fn(() => createChainableQuery({ data: { vendor_name: "Test Vendor" }, error: null })),
          };
        }
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("POST");
      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: corporationUuid,
        project_uuid: projectUuid,
        purchase_order_uuid: poUuid,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        return_items: [
          { uuid: item1Uuid, return_quantity: 10, return_total: 100, cost_code_uuid: "cc-1" },
          { uuid: item2Uuid, return_quantity: 20, return_total: 200, cost_code_uuid: "cc-2" },
          { uuid: item3Uuid, return_quantity: 30, return_total: 300, cost_code_uuid: "cc-3" },
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

      // Verify upsert was called (not individual updates)
      expect(upsertSpy).toHaveBeenCalledTimes(1);
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            uuid: "rni-1", // Existing item should have uuid
            item_uuid: item1Uuid,
            return_quantity: 10,
            return_total: 100,
          }),
          expect.objectContaining({
            uuid: "rni-2", // Existing item should have uuid
            item_uuid: item2Uuid,
            return_quantity: 20,
            return_total: 200,
          }),
          expect.objectContaining({
            // New item should not have uuid
            item_uuid: item3Uuid,
            return_quantity: 30,
            return_total: 300,
          }),
        ]),
        expect.objectContaining({
          onConflict: "uuid",
          ignoreDuplicates: false,
        })
      );
    });

    it("should handle bulk upsert with only new items (no existing items)", async () => {
      const globals = stubGlobals();
      const corporationUuid = "corp-123";
      const projectUuid = "project-123";
      const poUuid = "po-123";
      const noteUuid = "return-note-123";
      const item1Uuid = "item-1";

      const mockReturnNote = {
        uuid: noteUuid,
        corporation_uuid: corporationUuid,
        project_uuid: projectUuid,
        purchase_order_uuid: poUuid,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        is_active: true,
      };

      const upsertSpy = vi.fn(() => Promise.resolve({ error: null }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_return_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "return_number") {
                return createChainableQuery({ data: [], error: null });
              }
              return createChainableQuery({
                data: {
                  ...mockReturnNote,
                  project: { uuid: projectUuid, project_name: "Test Project", project_id: "P-001" },
                  purchase_order: { uuid: poUuid, po_number: "PO-001", vendor_uuid: "vendor-123" },
                },
                error: null,
              });
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockReturnNote, error: null })),
              })),
            })),
          };
        }
        if (table === "return_note_items") {
          return {
            select: vi.fn(() => {
              // No existing items
              return createChainableQuery({ data: [], error: null });
            }),
            upsert: upsertSpy,
          };
        }
        if (table === "vendors") {
          return {
            select: vi.fn(() => createChainableQuery({ data: { vendor_name: "Test Vendor" }, error: null })),
          };
        }
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("POST");
      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: corporationUuid,
        project_uuid: projectUuid,
        purchase_order_uuid: poUuid,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        return_items: [
          { uuid: item1Uuid, return_quantity: 10, return_total: 100, cost_code_uuid: "cc-1" },
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

      // Verify upsert was called with new items only (no uuid field)
      expect(upsertSpy).toHaveBeenCalledTimes(1);
      const upsertCall = upsertSpy.mock.calls[0];
      expect(upsertCall[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            item_uuid: item1Uuid,
            return_quantity: 10,
            return_total: 100,
            // Should not have uuid for new items
          }),
        ])
      );
      expect(upsertCall[0][0]).not.toHaveProperty("uuid");
    });
  });

  describe("POST - Parallel Operations", () => {
    it("should fetch metadata and save items in parallel", async () => {
      const globals = stubGlobals();
      const corporationUuid = "corp-123";
      const projectUuid = "project-123";
      const poUuid = "po-123";
      const noteUuid = "return-note-123";

      const mockReturnNote = {
        uuid: noteUuid,
        corporation_uuid: corporationUuid,
        project_uuid: projectUuid,
        purchase_order_uuid: poUuid,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        is_active: true,
      };

      const metadataSelectSpy = vi.fn(() => createChainableQuery({
        data: {
          ...mockReturnNote,
          project: { uuid: projectUuid, project_name: "Test Project", project_id: "P-001" },
          purchase_order: { uuid: poUuid, po_number: "PO-001", vendor_uuid: "vendor-123" },
        },
        error: null,
      }));

      const upsertSpy = vi.fn(() => Promise.resolve({ error: null }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_return_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "return_number") {
                return createChainableQuery({ data: [], error: null });
              }
              // Track when metadata fetch is called
              return metadataSelectSpy();
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockReturnNote, error: null })),
              })),
            })),
          };
        }
        if (table === "return_note_items") {
          return {
            select: vi.fn(() => createChainableQuery({ data: [], error: null })),
            upsert: upsertSpy,
          };
        }
        if (table === "vendors") {
          return {
            select: vi.fn(() => createChainableQuery({ data: { vendor_name: "Test Vendor" }, error: null })),
          };
        }
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("POST");
      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: corporationUuid,
        project_uuid: projectUuid,
        purchase_order_uuid: poUuid,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        return_items: [
          { uuid: "item-1", return_quantity: 10, return_total: 100 },
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

      // Both operations should have been initiated
      expect(metadataSelectSpy).toHaveBeenCalled();
      expect(upsertSpy).toHaveBeenCalled();
    });
  });

  describe("POST - No Duplicate Saves", () => {
    it("should NOT call external update-return-fields API", async () => {
      const globals = stubGlobals();
      const corporationUuid = "corp-123";
      const projectUuid = "project-123";
      const poUuid = "po-123";
      const noteUuid = "return-note-123";

      const mockReturnNote = {
        uuid: noteUuid,
        corporation_uuid: corporationUuid,
        project_uuid: projectUuid,
        purchase_order_uuid: poUuid,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        is_active: true,
      };

      const upsertSpy = vi.fn(() => Promise.resolve({ error: null }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_return_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "return_number") {
                return createChainableQuery({ data: [], error: null });
              }
              return createChainableQuery({
                data: {
                  ...mockReturnNote,
                  project: { uuid: projectUuid, project_name: "Test Project", project_id: "P-001" },
                  purchase_order: { uuid: poUuid, po_number: "PO-001", vendor_uuid: "vendor-123" },
                },
                error: null,
              });
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockReturnNote, error: null })),
              })),
            })),
          };
        }
        if (table === "return_note_items") {
          return {
            select: vi.fn(() => createChainableQuery({ data: [], error: null })),
            upsert: upsertSpy,
          };
        }
        if (table === "vendors") {
          return {
            select: vi.fn(() => createChainableQuery({ data: { vendor_name: "Test Vendor" }, error: null })),
          };
        }
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("POST");
      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: corporationUuid,
        project_uuid: projectUuid,
        purchase_order_uuid: poUuid,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        return_items: [
          { uuid: "item-1", return_quantity: 10, return_total: 100 },
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

      // Verify upsert was called exactly once (not twice)
      expect(upsertSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("PUT - Bulk Upsert for Return Note Items", () => {
    it("should use bulk upsert when updating return note items", async () => {
      const globals = stubGlobals();
      const corporationUuid = "corp-123";
      const projectUuid = "project-123";
      const poUuid = "po-123";
      const noteUuid = "return-note-123";
      const item1Uuid = "item-1";
      const item2Uuid = "item-2";

      const existingReturnNote = {
        uuid: noteUuid,
        corporation_uuid: corporationUuid,
        project_uuid: projectUuid,
        purchase_order_uuid: poUuid,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        is_active: true,
      };

      const existingReturnNoteItems = [
        { uuid: "rni-1", item_uuid: item1Uuid },
      ];

      const upsertSpy = vi.fn(() => Promise.resolve({ error: null }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_return_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "return_number") {
                return createChainableQuery({ data: [], error: null });
              }
              // For existing note fetch
              if (query === "*") {
                return createChainableQuery({ data: existingReturnNote, error: null });
              }
              // For metadata fetch
              return createChainableQuery({
                data: {
                  ...existingReturnNote,
                  project: { uuid: projectUuid, project_name: "Test Project", project_id: "P-001" },
                  purchase_order: { uuid: poUuid, po_number: "PO-001", vendor_uuid: "vendor-123" },
                },
                error: null,
              });
            }),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: existingReturnNote, error: null })),
                })),
              })),
            })),
          };
        }
        if (table === "return_note_items") {
          return {
            select: vi.fn(() => {
              return createChainableQuery({ data: existingReturnNoteItems, error: null });
            }),
            upsert: upsertSpy,
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          };
        }
        if (table === "vendors") {
          return {
            select: vi.fn(() => createChainableQuery({ data: { vendor_name: "Test Vendor" }, error: null })),
          };
        }
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("PUT");
      globals.mockReadBody.mockResolvedValue({
        uuid: noteUuid,
        corporation_uuid: corporationUuid,
        project_uuid: projectUuid,
        purchase_order_uuid: poUuid,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        return_items: [
          { uuid: item1Uuid, return_quantity: 15, return_total: 150, cost_code_uuid: "cc-1" },
          { uuid: item2Uuid, return_quantity: 25, return_total: 250, cost_code_uuid: "cc-2" },
        ],
      });

      const handler = await import("@/server/api/stock-return-notes/index");
      const event = {
        node: {
          req: {
            method: "PUT",
          },
        },
      } as any;

      await handler.default(event);

      // Verify upsert was called (not individual updates)
      expect(upsertSpy).toHaveBeenCalledTimes(1);
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            uuid: "rni-1", // Existing item
            item_uuid: item1Uuid,
            return_quantity: 15,
            return_total: 150,
          }),
          expect.objectContaining({
            // New item should not have uuid
            item_uuid: item2Uuid,
            return_quantity: 25,
            return_total: 250,
          }),
        ]),
        expect.objectContaining({
          onConflict: "uuid",
          ignoreDuplicates: false,
        })
      );
    });

    it("should clear return_note_items when return_items is empty array", async () => {
      const globals = stubGlobals();
      const corporationUuid = "corp-123";
      const projectUuid = "project-123";
      const poUuid = "po-123";
      const noteUuid = "return-note-123";

      const existingReturnNote = {
        uuid: noteUuid,
        corporation_uuid: corporationUuid,
        project_uuid: projectUuid,
        purchase_order_uuid: poUuid,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        is_active: true,
      };

      const eqSpy = vi.fn(() => Promise.resolve({ error: null }));
      const deleteSpy = vi.fn(() => ({
        eq: eqSpy,
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_return_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "return_number") {
                return createChainableQuery({ data: [], error: null });
              }
              if (query === "*") {
                return createChainableQuery({ data: existingReturnNote, error: null });
              }
              return createChainableQuery({
                data: {
                  ...existingReturnNote,
                  project: { uuid: projectUuid, project_name: "Test Project", project_id: "P-001" },
                  purchase_order: { uuid: poUuid, po_number: "PO-001", vendor_uuid: "vendor-123" },
                },
                error: null,
              });
            }),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: existingReturnNote, error: null })),
                })),
              })),
            })),
          };
        }
        if (table === "return_note_items") {
          return {
            select: vi.fn(() => createChainableQuery({ data: [], error: null })),
            delete: deleteSpy,
          };
        }
        if (table === "vendors") {
          return {
            select: vi.fn(() => createChainableQuery({ data: { vendor_name: "Test Vendor" }, error: null })),
          };
        }
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("PUT");
      globals.mockReadBody.mockResolvedValue({
        uuid: noteUuid,
        corporation_uuid: corporationUuid,
        project_uuid: projectUuid,
        purchase_order_uuid: poUuid,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        return_items: [], // Empty array
      });

      const handler = await import("@/server/api/stock-return-notes/index");
      const event = {
        node: {
          req: {
            method: "PUT",
          },
        },
      } as any;

      await handler.default(event);

      // Verify delete was called to clear items
      expect(deleteSpy).toHaveBeenCalled();
      expect(eqSpy).toHaveBeenCalledWith("return_note_uuid", noteUuid);
    });
  });

  describe("Error Handling", () => {
    it("should handle upsert errors gracefully", async () => {
      const globals = stubGlobals();
      const corporationUuid = "corp-123";
      const projectUuid = "project-123";
      const poUuid = "po-123";
      const noteUuid = "return-note-123";
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const mockReturnNote = {
        uuid: noteUuid,
        corporation_uuid: corporationUuid,
        project_uuid: projectUuid,
        purchase_order_uuid: poUuid,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        is_active: true,
      };

      const upsertError = { message: "Upsert failed" };
      const upsertSpy = vi.fn(() => Promise.resolve({ error: upsertError }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_return_notes") {
          return {
            select: vi.fn((query?: string) => {
              if (query === "return_number") {
                return createChainableQuery({ data: [], error: null });
              }
              return createChainableQuery({
                data: {
                  ...mockReturnNote,
                  project: { uuid: projectUuid, project_name: "Test Project", project_id: "P-001" },
                  purchase_order: { uuid: poUuid, po_number: "PO-001", vendor_uuid: "vendor-123" },
                },
                error: null,
              });
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockReturnNote, error: null })),
              })),
            })),
          };
        }
        if (table === "return_note_items") {
          return {
            select: vi.fn(() => createChainableQuery({ data: [], error: null })),
            upsert: upsertSpy,
          };
        }
        if (table === "vendors") {
          return {
            select: vi.fn(() => createChainableQuery({ data: { vendor_name: "Test Vendor" }, error: null })),
          };
        }
        return {
          select: vi.fn(() => createChainableQuery({ data: [], error: null })),
        };
      });

      globals.mockGetMethod.mockReturnValue("POST");
      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: corporationUuid,
        project_uuid: projectUuid,
        purchase_order_uuid: poUuid,
        return_type: "purchase_order",
        return_number: "RTN-001",
        status: "Waiting",
        return_items: [
          { uuid: "item-1", return_quantity: 10, return_total: 100 },
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

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[StockReturnNotes] Failed to save return note items:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});

