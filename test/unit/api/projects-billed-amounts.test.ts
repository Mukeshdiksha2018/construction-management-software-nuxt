import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const makeEvent = (opts: { query?: any } = {}) =>
  ({
    node: {
      req: {
        method: "GET",
      },
    },
    req: {},
    ...opts,
  } as any);

describe("server/api/projects/billed-amounts", () => {
  const stubGlobals = () => {
    const mockDefineEventHandler = vi.fn((handler) => handler);
    const mockGetQuery = vi.fn(() => ({}));
    const mockCreateError = vi.fn((options: any) => {
      const error = new Error(options.statusMessage);
      (error as any).statusCode = options.statusCode;
      (error as any).statusMessage = options.statusMessage;
      return error;
    });

    vi.stubGlobal("defineEventHandler", mockDefineEventHandler);
    vi.stubGlobal("getQuery", mockGetQuery);
    vi.stubGlobal("createError", mockCreateError);

    return {
      mockDefineEventHandler,
      mockGetQuery,
      mockCreateError,
    };
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Set environment variables to prevent import errors
    process.env.NUXT_SUPABASE_URL = "https://test.supabase.co";
    process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });
  
  afterEach(() => {
    delete process.env.NUXT_SUPABASE_URL;
    delete process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("GET - Fetch billed amounts", () => {
    it("returns 400 when corporation_uuid is missing", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({});

      const { default: handler } = await import(
        "@/server/api/projects/billed-amounts.get"
      );

      const event = makeEvent({ query: {} });

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
        statusMessage: "corporation_uuid is required",
      });
    });

    it("returns aggregated billed amounts by project", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ corporation_uuid: "corp-1" });

      const mockInvoices = [
        { project_uuid: "project-1", amount: "10000" },
        { project_uuid: "project-1", amount: "5000" },
        { project_uuid: "project-2", amount: "20000" },
        { project_uuid: "project-3", amount: "7500.50" },
      ];

      const selectSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            neq: vi.fn(() => ({
              not: vi.fn(() =>
                Promise.resolve({
                  data: mockInvoices,
                  error: null,
                })
              ),
            })),
          })),
        })),
      }));

      const supabaseMock = {
        from: vi.fn(() => ({
          select: selectSpy,
        })),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const { default: handler } = await import(
        "@/server/api/projects/billed-amounts.get"
      );

      const event = makeEvent({ query: { corporation_uuid: "corp-1" } });
      const result = await handler(event);

      expect(result).toEqual({
        data: {
          "project-1": 15000,
          "project-2": 20000,
          "project-3": 7500.5,
        },
        error: null,
      });
    });

    it("returns empty object when no paid invoices exist", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ corporation_uuid: "corp-1" });

      const selectSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            neq: vi.fn(() => ({
              not: vi.fn(() =>
                Promise.resolve({
                  data: [],
                  error: null,
                })
              ),
            })),
          })),
        })),
      }));

      const supabaseMock = {
        from: vi.fn(() => ({
          select: selectSpy,
        })),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const { default: handler } = await import(
        "@/server/api/projects/billed-amounts.get"
      );

      const event = makeEvent({ query: { corporation_uuid: "corp-1" } });
      const result = await handler(event);

      expect(result).toEqual({
        data: {},
        error: null,
      });
    });

    it("handles invoices with null amounts", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ corporation_uuid: "corp-1" });

      const mockInvoices = [
        { project_uuid: "project-1", amount: "10000" },
        { project_uuid: "project-1", amount: null },
        { project_uuid: "project-2", amount: "0" },
      ];

      const selectSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            neq: vi.fn(() => ({
              not: vi.fn(() =>
                Promise.resolve({
                  data: mockInvoices,
                  error: null,
                })
              ),
            })),
          })),
        })),
      }));

      const supabaseMock = {
        from: vi.fn(() => ({
          select: selectSpy,
        })),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const { default: handler } = await import(
        "@/server/api/projects/billed-amounts.get"
      );

      const event = makeEvent({ query: { corporation_uuid: "corp-1" } });
      const result = await handler(event);

      expect(result.data["project-1"]).toBe(10000);
      expect(result.data["project-2"]).toBe(0);
    });

    it("skips invoices without project_uuid", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ corporation_uuid: "corp-1" });

      const mockInvoices = [
        { project_uuid: "project-1", amount: "10000" },
        { project_uuid: null, amount: "5000" },
        { project_uuid: undefined, amount: "3000" },
      ];

      const selectSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            neq: vi.fn(() => ({
              not: vi.fn(() =>
                Promise.resolve({
                  data: mockInvoices,
                  error: null,
                })
              ),
            })),
          })),
        })),
      }));

      const supabaseMock = {
        from: vi.fn(() => ({
          select: selectSpy,
        })),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const { default: handler } = await import(
        "@/server/api/projects/billed-amounts.get"
      );

      const event = makeEvent({ query: { corporation_uuid: "corp-1" } });
      const result = await handler(event);

      // Only project-1 should be included
      expect(Object.keys(result.data)).toHaveLength(1);
      expect(result.data["project-1"]).toBe(10000);
    });

    it("returns 500 when database query fails", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ corporation_uuid: "corp-1" });

      const selectSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            neq: vi.fn(() => ({
              not: vi.fn(() =>
                Promise.resolve({
                  data: null,
                  error: { message: "Database connection failed" },
                })
              ),
            })),
          })),
        })),
      }));

      const supabaseMock = {
        from: vi.fn(() => ({
          select: selectSpy,
        })),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const { default: handler } = await import(
        "@/server/api/projects/billed-amounts.get"
      );

      const event = makeEvent({ query: { corporation_uuid: "corp-1" } });

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: "Database connection failed",
      });
    });

    it("aggregates amounts for multiple projects correctly", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ corporation_uuid: "corp-1" });

      const mockInvoices = [
        { project_uuid: "project-a", amount: "1000" },
        { project_uuid: "project-b", amount: "2000" },
        { project_uuid: "project-c", amount: "3000" },
        { project_uuid: "project-a", amount: "500" },
        { project_uuid: "project-b", amount: "1500" },
      ];

      const selectSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            neq: vi.fn(() => ({
              not: vi.fn(() =>
                Promise.resolve({
                  data: mockInvoices,
                  error: null,
                })
              ),
            })),
          })),
        })),
      }));

      const supabaseMock = {
        from: vi.fn(() => ({
          select: selectSpy,
        })),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const { default: handler } = await import(
        "@/server/api/projects/billed-amounts.get"
      );

      const event = makeEvent({ query: { corporation_uuid: "corp-1" } });
      const result = await handler(event);

      expect(result.data["project-a"]).toBe(1500);
      expect(result.data["project-b"]).toBe(3500);
      expect(result.data["project-c"]).toBe(3000);
    });

    it("queries the vendor_invoices table", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ corporation_uuid: "corp-123" });

      const selectSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            neq: vi.fn(() => ({
              not: vi.fn(() =>
                Promise.resolve({
                  data: [],
                  error: null,
                })
              ),
            })),
          })),
        })),
      }));

      const fromSpy = vi.fn(() => ({
        select: selectSpy,
      }));

      const supabaseMock = {
        from: fromSpy,
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const { default: handler } = await import(
        "@/server/api/projects/billed-amounts.get"
      );

      const event = makeEvent({ query: { corporation_uuid: "corp-123" } });
      await handler(event);

      expect(fromSpy).toHaveBeenCalledWith("vendor_invoices");
    });

    it("selects only project_uuid and amount columns", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ corporation_uuid: "corp-1" });

      const selectSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            neq: vi.fn(() => ({
              not: vi.fn(() =>
                Promise.resolve({
                  data: [],
                  error: null,
                })
              ),
            })),
          })),
        })),
      }));

      const supabaseMock = {
        from: vi.fn(() => ({
          select: selectSpy,
        })),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      // Reset modules to ensure the mock is applied
      vi.resetModules();

      const { default: handler } = await import(
        "@/server/api/projects/billed-amounts.get"
      );

      const event = makeEvent({ query: { corporation_uuid: "corp-1" } });
      await handler(event);

      expect(selectSpy).toHaveBeenCalledWith("project_uuid, amount, financial_breakdown");
    });
  });
});
