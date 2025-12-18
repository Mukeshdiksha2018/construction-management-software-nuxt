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

describe("server/api/change-orders/invoice-summary", () => {
  const stubGlobals = () => {
    const mockDefineEventHandler = vi.fn((handler) => handler);
    const mockGetQuery = vi.fn(() => ({}));
    const mockCreateError = vi.fn((options: any) => {
      const error = new Error(options.statusMessage);
      (error as any).statusCode = options.statusCode;
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

  let supabaseMock: any;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    // Create a fresh supabase mock for each test
    supabaseMock = {
      from: vi.fn(),
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Helper to create chainable mock for advance payments query
  // Chain: .select().eq(change_order_uuid).eq(invoice_type).eq(status).eq(is_active)
  const createAdvancePaymentsMock = (data: any[]) => {
    return vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data,
                error: null,
              })
            ),
          })),
        })),
      })),
    }));
  };

  // Helper to create chainable mock for CO invoices query
  // Chain: .select().eq(change_order_uuid).eq(invoice_type).eq(status).eq(is_active)
  const createCOInvoicesMock = (data: any[]) => {
    return vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data,
                error: null,
              })
            ),
          })),
        })),
      })),
    }));
  };

  // Helper to create CO select mock
  const createCOSelectMock = (coData: any) => {
    return vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() =>
          Promise.resolve({
            data: coData,
            error: null,
          })
        ),
      })),
    }));
  };

  describe("GET - Invoice Summary", () => {
    it("calculates advance paid from AGAINST_ADVANCE_PAYMENT invoices with Paid status", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        change_order_uuid: "co-uuid-1",
      });

      supabaseMock.from
        .mockReturnValueOnce({
          select: createCOSelectMock({
            uuid: "co-uuid-1",
            financial_breakdown: JSON.stringify({
              totals: { total_co_amount: 8000 },
            }),
          }),
        })
        .mockReturnValueOnce({
          select: createAdvancePaymentsMock([
            { amount: "200.00" },
            { amount: "150.00" },
          ]),
        })
        .mockReturnValueOnce({
          select: createCOInvoicesMock([{ amount: "3000.00" }]),
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { change_order_uuid: "co-uuid-1" },
      });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(result.data.advance_paid).toBe(350); // 200 + 150
      expect(result.data.invoiced_value).toBe(3000);
      expect(result.data.total_co_value).toBe(8000);
      expect(result.data.balance_to_be_invoiced).toBe(4650); // 8000 - 350 - 3000
    });

    it("only includes advance payments with Paid status (excludes Draft, Pending, Approved)", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        change_order_uuid: "co-uuid-1",
      });

      // The API now filters by status="Paid", so only Paid invoices should be returned
      supabaseMock.from
        .mockReturnValueOnce({
          select: createCOSelectMock({
            uuid: "co-uuid-1",
            financial_breakdown: JSON.stringify({
              totals: { total_co_amount: 5000 },
            }),
          }),
        })
        .mockReturnValueOnce({
          // Only Paid advance invoices are returned by the query
          select: createAdvancePaymentsMock([
            { amount: "250.00" }, // Only Paid invoice
          ]),
        })
        .mockReturnValueOnce({
          select: createCOInvoicesMock([]),
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { change_order_uuid: "co-uuid-1" },
      });

      const result = await handler.default(event);

      // Should only include Paid invoices
      expect(result.data.advance_paid).toBe(250);
    });

    it("only includes invoiced value with Paid status", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        change_order_uuid: "co-uuid-1",
      });

      supabaseMock.from
        .mockReturnValueOnce({
          select: createCOSelectMock({
            uuid: "co-uuid-1",
            financial_breakdown: JSON.stringify({
              totals: { total_co_amount: 10000 },
            }),
          }),
        })
        .mockReturnValueOnce({
          select: createAdvancePaymentsMock([]),
        })
        .mockReturnValueOnce({
          // Only Paid AGAINST_CO invoices
          select: createCOInvoicesMock([
            { amount: "2500.00" },
            { amount: "1500.00" },
          ]),
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { change_order_uuid: "co-uuid-1" },
      });

      const result = await handler.default(event);

      expect(result.data.invoiced_value).toBe(4000); // 2500 + 1500
      expect(result.data.balance_to_be_invoiced).toBe(6000); // 10000 - 0 - 4000
    });

    it("extracts total_co_amount from financial_breakdown JSON", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        change_order_uuid: "co-uuid-1",
      });

      supabaseMock.from
        .mockReturnValueOnce({
          select: createCOSelectMock({
            uuid: "co-uuid-1",
            financial_breakdown: JSON.stringify({
              totals: {
                total_co_amount: 12000,
                item_total: 10000,
                charges_total: 1500,
                tax_total: 500,
              },
            }),
          }),
        })
        .mockReturnValueOnce({
          select: createAdvancePaymentsMock([]),
        })
        .mockReturnValueOnce({
          select: createCOInvoicesMock([]),
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { change_order_uuid: "co-uuid-1" },
      });

      const result = await handler.default(event);

      expect(result.data.total_co_value).toBe(12000);
    });

    it("handles financial_breakdown as object (not string)", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        change_order_uuid: "co-uuid-1",
      });

      supabaseMock.from
        .mockReturnValueOnce({
          select: createCOSelectMock({
            uuid: "co-uuid-1",
            financial_breakdown: {
              totals: { total_co_amount: 18000 },
            },
          }),
        })
        .mockReturnValueOnce({
          select: createAdvancePaymentsMock([]),
        })
        .mockReturnValueOnce({
          select: createCOInvoicesMock([]),
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { change_order_uuid: "co-uuid-1" },
      });

      const result = await handler.default(event);

      expect(result.data.total_co_value).toBe(18000);
    });

    it("returns zero for advance paid when no Paid advance invoices exist", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        change_order_uuid: "co-uuid-1",
      });

      supabaseMock.from
        .mockReturnValueOnce({
          select: createCOSelectMock({
            uuid: "co-uuid-1",
            financial_breakdown: JSON.stringify({
              totals: { total_co_amount: 7500 },
            }),
          }),
        })
        .mockReturnValueOnce({
          select: createAdvancePaymentsMock([]), // No Paid advance invoices
        })
        .mockReturnValueOnce({
          select: createCOInvoicesMock([]),
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { change_order_uuid: "co-uuid-1" },
      });

      const result = await handler.default(event);

      expect(result.data.advance_paid).toBe(0);
      expect(result.data.balance_to_be_invoiced).toBe(7500);
    });

    it("handles missing change_order_uuid parameter", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({});

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/invoice-summary");
      const event = makeEvent("GET", { query: {} });

      await expect(handler.default(event)).rejects.toThrow();
    });

    it("handles change order not found", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        change_order_uuid: "non-existent",
      });

      supabaseMock.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: null,
              })
            ),
          })),
        })),
      });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { change_order_uuid: "non-existent" },
      });

      await expect(handler.default(event)).rejects.toThrow("Change order not found");
    });

    it("calculates balance correctly: Total CO Value - Advance Paid - Invoiced Value", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        change_order_uuid: "co-uuid-1",
      });

      supabaseMock.from
        .mockReturnValueOnce({
          select: createCOSelectMock({
            uuid: "co-uuid-1",
            financial_breakdown: JSON.stringify({
              totals: { total_co_amount: 15000 },
            }),
          }),
        })
        .mockReturnValueOnce({
          select: createAdvancePaymentsMock([{ amount: "2000.00" }]),
        })
        .mockReturnValueOnce({
          select: createCOInvoicesMock([{ amount: "8000.00" }]),
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { change_order_uuid: "co-uuid-1" },
      });

      const result = await handler.default(event);

      expect(result.data.total_co_value).toBe(15000);
      expect(result.data.advance_paid).toBe(2000);
      expect(result.data.invoiced_value).toBe(8000);
      // Balance = Total CO Value - Advance Paid - Invoiced Value
      expect(result.data.balance_to_be_invoiced).toBe(5000); // 15000 - 2000 - 8000
    });

    it("returns zero balance when total invoiced exceeds CO value", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        change_order_uuid: "co-uuid-1",
      });

      supabaseMock.from
        .mockReturnValueOnce({
          select: createCOSelectMock({
            uuid: "co-uuid-1",
            financial_breakdown: JSON.stringify({
              totals: { total_co_amount: 5000 },
            }),
          }),
        })
        .mockReturnValueOnce({
          select: createAdvancePaymentsMock([{ amount: "3000.00" }]),
        })
        .mockReturnValueOnce({
          select: createCOInvoicesMock([{ amount: "4000.00" }]),
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { change_order_uuid: "co-uuid-1" },
      });

      const result = await handler.default(event);

      // Balance should be 0, not negative (5000 - 3000 - 4000 = -2000 -> 0)
      expect(result.data.balance_to_be_invoiced).toBe(0);
    });

    it("handles null/undefined amounts gracefully", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        change_order_uuid: "co-uuid-1",
      });

      supabaseMock.from
        .mockReturnValueOnce({
          select: createCOSelectMock({
            uuid: "co-uuid-1",
            financial_breakdown: JSON.stringify({
              totals: { total_co_amount: 10000 },
            }),
          }),
        })
        .mockReturnValueOnce({
          select: createAdvancePaymentsMock([
            { amount: null },
            { amount: "200.00" },
            { amount: undefined },
          ]),
        })
        .mockReturnValueOnce({
          select: createCOInvoicesMock([
            { amount: "1000.00" },
            { amount: null },
          ]),
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { change_order_uuid: "co-uuid-1" },
      });

      const result = await handler.default(event);

      expect(result.data.advance_paid).toBe(200);
      expect(result.data.invoiced_value).toBe(1000);
    });

    it("rejects non-GET requests", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        change_order_uuid: "co-uuid-1",
      });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/invoice-summary");
      const event = makeEvent("POST", {
        query: { change_order_uuid: "co-uuid-1" },
      });

      await expect(handler.default(event)).rejects.toThrow("Method not allowed");
    });

    it("handles missing financial_breakdown gracefully", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        change_order_uuid: "co-uuid-1",
      });

      supabaseMock.from
        .mockReturnValueOnce({
          select: createCOSelectMock({
            uuid: "co-uuid-1",
            financial_breakdown: null, // No financial breakdown
          }),
        })
        .mockReturnValueOnce({
          select: createAdvancePaymentsMock([{ amount: "500.00" }]),
        })
        .mockReturnValueOnce({
          select: createCOInvoicesMock([{ amount: "1000.00" }]),
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { change_order_uuid: "co-uuid-1" },
      });

      const result = await handler.default(event);

      expect(result.data.total_co_value).toBe(0);
      expect(result.data.advance_paid).toBe(500);
      expect(result.data.invoiced_value).toBe(1000);
      expect(result.data.balance_to_be_invoiced).toBe(0); // Max(0, 0 - 500 - 1000)
    });

    it("returns correct response structure", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        change_order_uuid: "co-uuid-1",
      });

      supabaseMock.from
        .mockReturnValueOnce({
          select: createCOSelectMock({
            uuid: "co-uuid-1",
            financial_breakdown: JSON.stringify({
              totals: { total_co_amount: 10000 },
            }),
          }),
        })
        .mockReturnValueOnce({
          select: createAdvancePaymentsMock([{ amount: "1000.00" }]),
        })
        .mockReturnValueOnce({
          select: createCOInvoicesMock([{ amount: "2000.00" }]),
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { change_order_uuid: "co-uuid-1" },
      });

      const result = await handler.default(event);

      expect(result).toHaveProperty("data");
      expect(result.data).toHaveProperty("change_order_uuid", "co-uuid-1");
      expect(result.data).toHaveProperty("total_co_value");
      expect(result.data).toHaveProperty("advance_paid");
      expect(result.data).toHaveProperty("invoiced_value");
      expect(result.data).toHaveProperty("balance_to_be_invoiced");
    });
  });
});

