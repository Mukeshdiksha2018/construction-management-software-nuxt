import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Create hoisted mock that can be updated per test
const supabaseMock = vi.hoisted(() => {
  return {
    from: vi.fn((table: string) => {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      };
    }) as any,
  };
});

vi.mock("@/utils/supabaseServer", () => ({
  supabaseServer: supabaseMock,
}));

describe("server/api/stock-return-notes", () => {
  const stubGlobals = () => {
    const mockDefineEventHandler = vi.fn((handler) => handler);
    const mockGetMethod = vi.fn(() => "DELETE");
    const mockGetQuery = vi.fn(() => ({ uuid: "test-uuid" }));
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
    // Reset the mock implementation
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "stock_return_notes") {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      uuid: "test-uuid",
                      return_number: "RTN-001",
                      is_active: false,
                    },
                    error: null,
                  })
                ),
              })),
            })),
          })),
        };
      }
      if (table === "return_note_items") {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: [
                  {
                    uuid: "item-1",
                    return_note_uuid: "test-uuid",
                    is_active: false,
                  },
                  {
                    uuid: "item-2",
                    return_note_uuid: "test-uuid",
                    is_active: false,
                  },
                ],
                error: null,
              })
            ),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      };
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("DELETE method", () => {
    it("should require uuid query parameter", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({});

      const handler = await import("@/server/api/stock-return-notes/index");
      const event = {
        node: {
          req: {
            method: "DELETE",
          },
        },
      } as any;

      await expect(handler.default(event)).rejects.toThrow();
      expect(globals.mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          statusMessage: "uuid query parameter is required",
        })
      );
    });

    it("should soft-delete the return note by setting is_active to false", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ uuid: "test-uuid" });
      globals.mockGetMethod.mockReturnValue("DELETE");

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: {
                  uuid: "test-uuid",
                  return_number: "RTN-001",
                  is_active: false,
                },
                error: null,
              })
            ),
          })),
        })),
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_return_notes") {
          return {
            update: updateSpy,
          };
        }
        if (table === "return_note_items") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({
                  data: [],
                  error: null,
                })
              ),
            })),
          };
        }
        return {};
      });

      const handler = await import("@/server/api/stock-return-notes/index");
      const event = {
        node: {
          req: {
            method: "DELETE",
          },
        },
      } as any;

      const result = await handler.default(event);

      expect(updateSpy).toHaveBeenCalledWith({ is_active: false });
      expect(result.data).toBeDefined();
      expect(result.data.is_active).toBe(false);
    });

    it("should soft-delete all related return_note_items when return note is deleted", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ uuid: "test-uuid" });
      globals.mockGetMethod.mockReturnValue("DELETE");

      const returnNoteEqSpy = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                uuid: "test-uuid",
                return_number: "RTN-001",
                is_active: false,
              },
              error: null,
            })
          ),
        })),
      }));

      const returnNoteUpdateSpy = vi.fn(() => ({
        eq: returnNoteEqSpy,
      }));

      const itemsEqSpy = vi.fn(() =>
        Promise.resolve({
          data: [
            {
              uuid: "item-1",
              return_note_uuid: "test-uuid",
              is_active: false,
            },
            {
              uuid: "item-2",
              return_note_uuid: "test-uuid",
              is_active: false,
            },
          ],
          error: null,
        })
      );

      const itemsUpdateSpy = vi.fn(() => ({
        eq: itemsEqSpy,
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_return_notes") {
          return {
            update: returnNoteUpdateSpy,
          };
        }
        if (table === "return_note_items") {
          return {
            update: itemsUpdateSpy,
          };
        }
        return {};
      });

      const handler = await import("@/server/api/stock-return-notes/index");
      const event = {
        node: {
          req: {
            method: "DELETE",
          },
        },
      } as any;

      await handler.default(event);

      // Verify return note was soft-deleted
      expect(returnNoteUpdateSpy).toHaveBeenCalledWith({ is_active: false });
      expect(returnNoteEqSpy).toHaveBeenCalledWith("uuid", "test-uuid");

      // Verify return note items were soft-deleted
      expect(itemsUpdateSpy).toHaveBeenCalledWith({ is_active: false });
      expect(itemsEqSpy).toHaveBeenCalledWith("return_note_uuid", "test-uuid");
    });

    it("should handle errors when soft-deleting return note", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ uuid: "test-uuid" });
      globals.mockGetMethod.mockReturnValue("DELETE");

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: "Database error" },
              })
            ),
          })),
        })),
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_return_notes") {
          return {
            update: updateSpy,
          };
        }
        return {};
      });

      const handler = await import("@/server/api/stock-return-notes/index");
      const event = {
        node: {
          req: {
            method: "DELETE",
          },
        },
      } as any;

      await expect(handler.default(event)).rejects.toThrow();
      expect(globals.mockCreateError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          statusMessage: expect.stringContaining("Failed to delete stock return note"),
        })
      );
    });

    it("should continue even if soft-deleting return_note_items fails", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ uuid: "test-uuid" });
      globals.mockGetMethod.mockReturnValue("DELETE");

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const returnNoteUpdateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: {
                  uuid: "test-uuid",
                  return_number: "RTN-001",
                  is_active: false,
                },
                error: null,
              })
            ),
          })),
        })),
      }));

      const itemsUpdateSpy = vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({
            data: null,
            error: { message: "Failed to update items" },
          })
        ),
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_return_notes") {
          return {
            update: returnNoteUpdateSpy,
          };
        }
        if (table === "return_note_items") {
          return {
            update: itemsUpdateSpy,
          };
        }
        return {};
      });

      const handler = await import("@/server/api/stock-return-notes/index");
      const event = {
        node: {
          req: {
            method: "DELETE",
          },
        },
      } as any;

      // Should not throw error even if items update fails
      const result = await handler.default(event);

      // Verify return note was still soft-deleted
      expect(returnNoteUpdateSpy).toHaveBeenCalledWith({ is_active: false });
      expect(result.data).toBeDefined();
      expect(result.data.is_active).toBe(false);

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[StockReturnNotes] Failed to soft-delete return_note_items:",
        expect.objectContaining({ message: "Failed to update items" })
      );

      consoleErrorSpy.mockRestore();
    });

    it("should return the soft-deleted return note data", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ uuid: "test-uuid" });
      globals.mockGetMethod.mockReturnValue("DELETE");

      const mockReturnNote = {
        uuid: "test-uuid",
        return_number: "RTN-001",
        corporation_uuid: "corp-1",
        project_uuid: "project-1",
        purchase_order_uuid: "po-1",
        status: "Waiting",
        is_active: false,
      };

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: mockReturnNote,
                error: null,
              })
            ),
          })),
        })),
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "stock_return_notes") {
          return {
            update: updateSpy,
          };
        }
        if (table === "return_note_items") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({
                  data: [],
                  error: null,
                })
              ),
            })),
          };
        }
        return {};
      });

      const handler = await import("@/server/api/stock-return-notes/index");
      const event = {
        node: {
          req: {
            method: "DELETE",
          },
        },
      } as any;

      const result = await handler.default(event);

      expect(result.data).toEqual(mockReturnNote);
      expect(result.data.is_active).toBe(false);
    });
  });
});

