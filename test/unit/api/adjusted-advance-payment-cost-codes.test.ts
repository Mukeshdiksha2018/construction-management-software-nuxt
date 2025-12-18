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

describe("server/api/adjusted-advance-payment-cost-codes", () => {
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

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("GET - Fetch adjusted advance payment cost codes", () => {
    it("fetches adjusted cost codes by vendor_invoice_uuid", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ vendor_invoice_uuid: "invoice-1" });

      const adjustedCostCodes = [
        {
          uuid: "acc-1",
          vendor_invoice_uuid: "invoice-1",
          advance_payment_uuid: "ap-1",
          cost_code_uuid: "cc-1",
          adjusted_amount: 500,
          cost_code_label: "01010 General Conditions",
          is_active: true,
        },
        {
          uuid: "acc-2",
          vendor_invoice_uuid: "invoice-1",
          advance_payment_uuid: "ap-1",
          cost_code_uuid: "cc-2",
          adjusted_amount: 300,
          cost_code_label: "02020 Site Work",
          is_active: true,
        },
      ];

      // Mock the chained query: .from().select().eq().eq().order()
      const orderSpy = vi.fn(() =>
        Promise.resolve({
          data: adjustedCostCodes,
          error: null,
        })
      );

      const eq2Spy = vi.fn(() => ({
        order: orderSpy,
        eq: vi.fn(() => ({
          order: orderSpy,
        })),
      }));

      const eq1Spy = vi.fn(() => ({
        eq: eq2Spy,
      }));

      const selectSpy = vi.fn(() => ({
        eq: eq1Spy,
      }));

      const supabaseMock = {
        from: vi.fn(() => ({
          select: selectSpy,
        })),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/adjusted-advance-payment-cost-codes/index");
      const event = makeEvent("GET", { query: { vendor_invoice_uuid: "invoice-1" } });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.data[0].adjusted_amount).toBe(500);
      expect(supabaseMock.from).toHaveBeenCalledWith("adjusted_advance_payment_cost_codes");
    });

    it("fetches adjusted cost codes with optional purchase_order_uuid filter", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ 
        vendor_invoice_uuid: "invoice-1",
        purchase_order_uuid: "po-1" 
      });

      const adjustedCostCodes = [
        {
          uuid: "acc-1",
          vendor_invoice_uuid: "invoice-1",
          purchase_order_uuid: "po-1",
          advance_payment_uuid: "ap-1",
          cost_code_uuid: "cc-1",
          adjusted_amount: 500,
          is_active: true,
        },
      ];

      const orderSpy = vi.fn(() =>
        Promise.resolve({
          data: adjustedCostCodes,
          error: null,
        })
      );

      // Chain: .from().select().eq().eq().eq().order()
      const eq3Spy = vi.fn(() => ({
        order: orderSpy,
        eq: vi.fn(() => ({
          order: orderSpy,
        })),
      }));

      const eq2Spy = vi.fn(() => ({
        eq: eq3Spy,
        order: orderSpy,
      }));

      const eq1Spy = vi.fn(() => ({
        eq: eq2Spy,
      }));

      const selectSpy = vi.fn(() => ({
        eq: eq1Spy,
      }));

      const supabaseMock = {
        from: vi.fn(() => ({
          select: selectSpy,
        })),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/adjusted-advance-payment-cost-codes/index");
      const event = makeEvent("GET", { 
        query: { 
          vendor_invoice_uuid: "invoice-1",
          purchase_order_uuid: "po-1"
        } 
      });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(1);
    });

    it("fetches adjusted cost codes with optional change_order_uuid filter", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ 
        vendor_invoice_uuid: "invoice-1",
        change_order_uuid: "co-1" 
      });

      const adjustedCostCodes = [
        {
          uuid: "acc-1",
          vendor_invoice_uuid: "invoice-1",
          change_order_uuid: "co-1",
          advance_payment_uuid: "ap-1",
          cost_code_uuid: "cc-1",
          adjusted_amount: 250,
          is_active: true,
        },
      ];

      const orderSpy = vi.fn(() =>
        Promise.resolve({
          data: adjustedCostCodes,
          error: null,
        })
      );

      const eq3Spy = vi.fn(() => ({
        order: orderSpy,
        eq: vi.fn(() => ({
          order: orderSpy,
        })),
      }));

      const eq2Spy = vi.fn(() => ({
        eq: eq3Spy,
        order: orderSpy,
      }));

      const eq1Spy = vi.fn(() => ({
        eq: eq2Spy,
      }));

      const selectSpy = vi.fn(() => ({
        eq: eq1Spy,
      }));

      const supabaseMock = {
        from: vi.fn(() => ({
          select: selectSpy,
        })),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/adjusted-advance-payment-cost-codes/index");
      const event = makeEvent("GET", { 
        query: { 
          vendor_invoice_uuid: "invoice-1",
          change_order_uuid: "co-1"
        } 
      });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].adjusted_amount).toBe(250);
    });

    it("returns error when vendor_invoice_uuid is missing", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({});

      const supabaseMock = {
        from: vi.fn(),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/adjusted-advance-payment-cost-codes/index");
      const event = makeEvent("GET", { query: {} });

      await expect(handler.default(event)).rejects.toThrow("vendor_invoice_uuid is required");
    });

    it("returns error for non-GET methods", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ vendor_invoice_uuid: "invoice-1" });

      const supabaseMock = {
        from: vi.fn(),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/adjusted-advance-payment-cost-codes/index");
      const event = makeEvent("POST", { query: { vendor_invoice_uuid: "invoice-1" } });

      await expect(handler.default(event)).rejects.toThrow("Method not allowed");
    });

    it("handles database errors gracefully", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ vendor_invoice_uuid: "invoice-1" });

      const orderSpy = vi.fn(() =>
        Promise.resolve({
          data: null,
          error: { message: "Database connection failed" },
        })
      );

      const eq2Spy = vi.fn(() => ({
        order: orderSpy,
        eq: vi.fn(() => ({
          order: orderSpy,
        })),
      }));

      const eq1Spy = vi.fn(() => ({
        eq: eq2Spy,
      }));

      const selectSpy = vi.fn(() => ({
        eq: eq1Spy,
      }));

      const supabaseMock = {
        from: vi.fn(() => ({
          select: selectSpy,
        })),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/adjusted-advance-payment-cost-codes/index");
      const event = makeEvent("GET", { query: { vendor_invoice_uuid: "invoice-1" } });

      await expect(handler.default(event)).rejects.toThrow("Database error: Database connection failed");
    });

    it("returns empty array when no records found", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ vendor_invoice_uuid: "invoice-1" });

      const orderSpy = vi.fn(() =>
        Promise.resolve({
          data: [],
          error: null,
        })
      );

      const eq2Spy = vi.fn(() => ({
        order: orderSpy,
        eq: vi.fn(() => ({
          order: orderSpy,
        })),
      }));

      const eq1Spy = vi.fn(() => ({
        eq: eq2Spy,
      }));

      const selectSpy = vi.fn(() => ({
        eq: eq1Spy,
      }));

      const supabaseMock = {
        from: vi.fn(() => ({
          select: selectSpy,
        })),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/adjusted-advance-payment-cost-codes/index");
      const event = makeEvent("GET", { query: { vendor_invoice_uuid: "invoice-1" } });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(0);
    });
  });
});
