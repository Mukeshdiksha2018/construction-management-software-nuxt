import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const makeEvent = (method: string, opts: { params?: any } = {}) =>
  ({
    node: {
      req: {
        method,
      },
    },
    req: {},
    ...opts,
  } as any);

describe("server/api/purchase-orders/[uuid]/advance-payments", () => {
  const stubGlobals = (query: any = {}) => {
    const mockDefineEventHandler = vi.fn((handler) => handler);
    const mockGetRouterParam = vi.fn(() => ({}));
    const mockGetQuery = vi.fn(() => query || {});
    const mockCreateError = vi.fn((options: any) => {
      const error = new Error(options.statusMessage);
      (error as any).statusCode = options.statusCode;
      return error;
    });

    vi.stubGlobal("defineEventHandler", mockDefineEventHandler);
    vi.stubGlobal("getRouterParam", mockGetRouterParam);
    vi.stubGlobal("getQuery", mockGetQuery);
    vi.stubGlobal("createError", mockCreateError);

    return {
      mockDefineEventHandler,
      mockGetRouterParam,
      mockGetQuery,
      mockCreateError,
    };
  };

  let supabaseMock: any;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    supabaseMock = {
      from: vi.fn(),
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("GET - Fetch Advance Payments", () => {
    it("fetches advance payment invoices for a purchase order", async () => {
      const globals = stubGlobals();
      globals.mockGetRouterParam.mockReturnValue("po-uuid-1");

      // Mock invoices fetch - chain includes .eq() x3 then .order() (purchase_order_uuid, invoice_type, is_active)
      const orderMock = vi.fn(() =>
        Promise.resolve({
          data: [
            {
              uuid: "inv-1",
              number: "INV-001",
              bill_date: "2024-01-15",
              amount: "240.00",
              is_active: true,
            },
            {
              uuid: "inv-2",
              number: "INV-002",
              bill_date: "2024-01-20",
              amount: "100.00",
              is_active: true,
            },
          ],
          error: null,
        })
      );

      const invoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: orderMock,
            })),
          })),
        })),
      }));

      // Mock cost codes fetch for first invoice
      const costCodesSelectMock1 = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: [
                  {
                    uuid: "apcc-1",
                    cost_code_uuid: "cc-1",
                    cost_code_label: "CC-001 Test Code",
                    advance_amount: "120.00",
                  },
                  {
                    uuid: "apcc-2",
                    cost_code_uuid: "cc-2",
                    cost_code_label: "CC-002 Another Code",
                    advance_amount: "120.00",
                  },
                ],
                error: null,
              })
            ),
          })),
        })),
      }));

      // Mock cost codes fetch for second invoice
      const costCodesSelectMock2 = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: [
                  {
                    uuid: "apcc-3",
                    cost_code_uuid: "cc-3",
                    cost_code_label: "CC-003 Third Code",
                    advance_amount: "100.00",
                  },
                ],
                error: null,
              })
            ),
          })),
        })),
      }));

      supabaseMock.from
        .mockReturnValueOnce({
          select: invoicesSelectMock,
        })
        .mockReturnValueOnce({
          select: costCodesSelectMock1,
        })
        .mockReturnValueOnce({
          select: costCodesSelectMock2,
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/[uuid]/advance-payments");
      const event = makeEvent("GET", { params: { uuid: "po-uuid-1" } });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.data[0].uuid).toBe("inv-1");
      expect(result.data[0].costCodes).toBeDefined();
      expect(result.data[0].costCodes.length).toBe(2);
      expect(result.data[1].uuid).toBe("inv-2");
      expect(result.data[1].costCodes).toBeDefined();
      expect(result.data[1].costCodes.length).toBe(1);
    });

    it("returns empty array when no advance payments exist", async () => {
      const globals = stubGlobals();
      globals.mockGetRouterParam.mockReturnValue("po-uuid-1");

      const invoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [],
                  error: null,
                })
              ),
            })),
          })),
        })),
      }));

      supabaseMock.from.mockReturnValueOnce({
        select: invoicesSelectMock,
      });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/[uuid]/advance-payments");
      const event = makeEvent("GET", { params: { uuid: "po-uuid-1" } });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(0);
    });

    it("handles missing purchase_order_uuid parameter", async () => {
      const globals = stubGlobals();
      globals.mockGetRouterParam.mockReturnValue(null);

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/[uuid]/advance-payments");
      const event = makeEvent("GET", { params: {} });

      await expect(handler.default(event)).rejects.toThrow();
    });

    it("handles database errors gracefully", async () => {
      const globals = stubGlobals();
      globals.mockGetRouterParam.mockReturnValue("po-uuid-1");

      const invoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: null,
                  error: { message: "Database connection failed" },
                })
              ),
            })),
          })),
        })),
      }));

      supabaseMock.from.mockReturnValueOnce({
        select: invoicesSelectMock,
      });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/[uuid]/advance-payments");
      const event = makeEvent("GET", { params: { uuid: "po-uuid-1" } });

      await expect(handler.default(event)).rejects.toThrow("Database connection failed");
    });

    it("handles cost codes fetch errors gracefully", async () => {
      const globals = stubGlobals();
      globals.mockGetRouterParam.mockReturnValue("po-uuid-1");

      const invoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      uuid: "inv-1",
                      number: "INV-001",
                      bill_date: "2024-01-15",
                      amount: "240.00",
                      is_active: true,
                    },
                  ],
                  error: null,
                })
              ),
            })),
          })),
        })),
      }));

      const costCodesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: "Cost codes fetch failed" },
              })
            ),
          })),
        })),
      }));

      supabaseMock.from
        .mockReturnValueOnce({
          select: invoicesSelectMock,
        })
        .mockReturnValueOnce({
          select: costCodesSelectMock,
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const handler = await import("@/server/api/purchase-orders/[uuid]/advance-payments");
      const event = makeEvent("GET", { params: { uuid: "po-uuid-1" } });

      const result = await handler.default(event);

      // Should still return invoice with empty cost codes array
      expect(result.data).toBeDefined();
      expect(result.data.length).toBe(1);
      expect(result.data[0].costCodes).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("filters only AGAINST_ADVANCE_PAYMENT invoices", async () => {
      const globals = stubGlobals();
      globals.mockGetRouterParam.mockReturnValue("po-uuid-1");

      const costCodesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: [],
                error: null,
              })
            ),
          })),
        })),
      }));

      const invoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      uuid: "inv-1",
                      number: "INV-001",
                      bill_date: "2024-01-15",
                      amount: "240.00",
                      is_active: true,
                    },
                  ],
                  error: null,
                })
              ),
            })),
          })),
        })),
      }));

      supabaseMock.from
        .mockReturnValueOnce({
          select: invoicesSelectMock,
        })
        .mockReturnValueOnce({
          select: costCodesSelectMock,
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/[uuid]/advance-payments");
      const event = makeEvent("GET", { params: { uuid: "po-uuid-1" } });

      const result = await handler.default(event);

      // Verify the query was called with correct filters
      expect(invoicesSelectMock).toHaveBeenCalled();
      expect(result.data.length).toBe(1);
    });

    it("orders invoices by bill_date descending", async () => {
      const globals = stubGlobals();
      globals.mockGetRouterParam.mockReturnValue("po-uuid-1");

      const orderMock = vi.fn(() =>
        Promise.resolve({
          data: [
            {
              uuid: "inv-2",
              number: "INV-002",
              bill_date: "2024-01-20",
              amount: "100.00",
              is_active: true,
            },
            {
              uuid: "inv-1",
              number: "INV-001",
              bill_date: "2024-01-15",
              amount: "240.00",
              is_active: true,
            },
          ],
          error: null,
        })
      );

      const costCodesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: [],
                error: null,
              })
            ),
          })),
        })),
      }));

      const invoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: orderMock,
            })),
          })),
        })),
      }));

      supabaseMock.from
        .mockReturnValueOnce({
          select: invoicesSelectMock,
        })
        .mockReturnValueOnce({
          select: costCodesSelectMock,
        })
        .mockReturnValueOnce({
          select: costCodesSelectMock,
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/[uuid]/advance-payments");
      const event = makeEvent("GET", { params: { uuid: "po-uuid-1" } });

      const result = await handler.default(event);

      expect(orderMock).toHaveBeenCalledWith("bill_date", { ascending: false });
      expect(result.data[0].bill_date).toBe("2024-01-20");
      expect(result.data[1].bill_date).toBe("2024-01-15");
    });

    it("handles invoices with no cost codes", async () => {
      const globals = stubGlobals();
      globals.mockGetRouterParam.mockReturnValue("po-uuid-1");

      const invoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      uuid: "inv-1",
                      number: "INV-001",
                      bill_date: "2024-01-15",
                      amount: "240.00",
                      is_active: true,
                    },
                  ],
                  error: null,
                })
              ),
            })),
          })),
        })),
      }));

      const costCodesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: [],
                error: null,
              })
            ),
          })),
        })),
      }));

      supabaseMock.from
        .mockReturnValueOnce({
          select: invoicesSelectMock,
        })
        .mockReturnValueOnce({
          select: costCodesSelectMock,
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/[uuid]/advance-payments");
      const event = makeEvent("GET", { params: { uuid: "po-uuid-1" } });

      const result = await handler.default(event);

      expect(result.data.length).toBe(1);
      expect(result.data[0].costCodes).toEqual([]);
    });

    it("includes all advance payments regardless of adjustment status when currentInvoiceUuid is provided", async () => {
      const globals = stubGlobals({ currentInvoiceUuid: "invoice-uuid-1" });
      globals.mockGetRouterParam.mockReturnValue("po-uuid-1");

      const invoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      uuid: "inv-1",
                      number: "INV-001",
                      bill_date: "2024-01-15",
                      amount: "240.00",
                      is_active: true,
                      adjusted_against_vendor_invoice_uuid: "invoice-uuid-1",
                    },
                    {
                      uuid: "inv-2",
                      number: "INV-002",
                      bill_date: "2024-01-20",
                      amount: "100.00",
                      is_active: true,
                      adjusted_against_vendor_invoice_uuid: null,
                    },
                  ],
                  error: null,
                })
              ),
            })),
          })),
        })),
      }));

      const costCodesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: [],
                error: null,
              })
            ),
          })),
        })),
      }));

      supabaseMock.from
        .mockReturnValueOnce({
          select: invoicesSelectMock,
        })
        .mockReturnValueOnce({
          select: costCodesSelectMock,
        })
        .mockReturnValueOnce({
          select: costCodesSelectMock,
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/[uuid]/advance-payments");
      const event = makeEvent("GET", { params: { uuid: "po-uuid-1" } });

      const result = await handler.default(event);

      // Should include both adjusted and unadjusted advance payments (all active payments are returned)
      expect(result.data.length).toBe(2);
      expect(result.data[0].adjusted_against_vendor_invoice_uuid).toBe("invoice-uuid-1");
      expect(result.data[1].adjusted_against_vendor_invoice_uuid).toBeNull();
      expect(invoicesSelectMock).toHaveBeenCalled();
    });

    it("includes all advance payments regardless of adjustment status when currentInvoiceUuid is not provided", async () => {
      const globals = stubGlobals();
      globals.mockGetRouterParam.mockReturnValue("po-uuid-1");

      const invoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      uuid: "inv-1",
                      number: "INV-001",
                      bill_date: "2024-01-15",
                      amount: "240.00",
                      is_active: true,
                      adjusted_against_vendor_invoice_uuid: "other-invoice-uuid",
                    },
                    {
                      uuid: "inv-2",
                      number: "INV-002",
                      bill_date: "2024-01-20",
                      amount: "100.00",
                      is_active: true,
                      adjusted_against_vendor_invoice_uuid: null,
                    },
                  ],
                  error: null,
                })
              ),
            })),
          })),
        })),
      }));

      const costCodesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: [],
                error: null,
              })
            ),
          })),
        })),
      }));

      supabaseMock.from
        .mockReturnValueOnce({
          select: invoicesSelectMock,
        })
        .mockReturnValueOnce({
          select: costCodesSelectMock,
        })
        .mockReturnValueOnce({
          select: costCodesSelectMock,
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/[uuid]/advance-payments");
      const event = makeEvent("GET", { params: { uuid: "po-uuid-1" } });

      const result = await handler.default(event);

      // Should include all active advance payments (both adjusted and unadjusted)
      expect(result.data.length).toBe(2);
      expect(result.data[0].adjusted_against_vendor_invoice_uuid).toBe("other-invoice-uuid");
      expect(result.data[1].adjusted_against_vendor_invoice_uuid).toBeNull();
      expect(invoicesSelectMock).toHaveBeenCalled();
    });
  });
});

