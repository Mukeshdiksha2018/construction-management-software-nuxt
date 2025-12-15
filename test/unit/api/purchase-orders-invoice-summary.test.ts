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

describe("server/api/purchase-orders/invoice-summary", () => {
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

  describe("GET - Invoice Summary", () => {
    it("calculates advance paid from AGAINST_ADVANCE_PAYMENT invoices", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        purchase_order_uuid: "po-uuid-1",
      });

      // Mock purchase order fetch
      const poSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: {
                uuid: "po-uuid-1",
                financial_breakdown: JSON.stringify({
                  totals: {
                    total_po_amount: 10000,
                  },
                }),
              },
              error: null,
            })
          ),
        })),
      }));

      // Mock vendor invoices fetch for advance payments
      const advanceInvoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            or: vi.fn(() =>
              Promise.resolve({
                data: [
                  { amount: "240.00" },
                  { amount: "100.00" },
                ],
                error: null,
              })
            ),
            is: vi.fn(() =>
              Promise.resolve({
                data: [
                  { amount: "240.00" },
                  { amount: "100.00" },
                ],
                error: null,
              })
            ),
          })),
        })),
      }));

      // Mock vendor invoices fetch for regular PO invoices
      const poInvoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: [{ amount: "5000.00" }],
                error: null,
              })
            ),
          })),
        })),
      }));

      supabaseMock.from
        .mockReturnValueOnce({
          select: poSelectMock,
        })
        .mockReturnValueOnce({
          select: advanceInvoicesSelectMock,
        })
        .mockReturnValueOnce({
          select: poInvoicesSelectMock,
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { purchase_order_uuid: "po-uuid-1" },
      });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(result.data.advance_paid).toBe(340); // 240 + 100
      expect(result.data.invoiced_value).toBe(5000);
      expect(result.data.total_po_value).toBe(10000);
      expect(result.data.balance_to_be_invoiced).toBe(4660); // 10000 - 340 - 5000
    });

    it("includes draft advance payment invoices in calculation", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        purchase_order_uuid: "po-uuid-1",
      });

      const poSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: {
                uuid: "po-uuid-1",
                financial_breakdown: JSON.stringify({
                  totals: {
                    total_po_amount: 5000,
                  },
                }),
              },
              error: null,
            })
          ),
        })),
      }));

      // Mock advance invoices (should not filter by is_active)
      const advanceInvoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            or: vi.fn(() =>
              Promise.resolve({
                data: [
                  { amount: "240.00" }, // Draft invoice
                  { amount: "100.00" }, // Active invoice
                ],
                error: null,
              })
            ),
            is: vi.fn(() =>
              Promise.resolve({
                data: [
                  { amount: "240.00" }, // Draft invoice
                  { amount: "100.00" }, // Active invoice
                ],
                error: null,
              })
            ),
          })),
        })),
      }));

      const poInvoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() =>
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
          select: poSelectMock,
        })
        .mockReturnValueOnce({
          select: advanceInvoicesSelectMock,
        })
        .mockReturnValueOnce({
          select: poInvoicesSelectMock,
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { purchase_order_uuid: "po-uuid-1" },
      });

      const result = await handler.default(event);

      // Should include both draft and active invoices
      expect(result.data.advance_paid).toBe(340); // 240 + 100
    });

    it("extracts total_po_amount from financial_breakdown JSON", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        purchase_order_uuid: "po-uuid-1",
      });

      const poSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: {
                uuid: "po-uuid-1",
                financial_breakdown: JSON.stringify({
                  totals: {
                    total_po_amount: 15000,
                    item_total: 12000,
                    charges_total: 2000,
                    tax_total: 1000,
                  },
                }),
              },
              error: null,
            })
          ),
        })),
      }));

      const advanceInvoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            or: vi.fn(() =>
              Promise.resolve({
                data: [],
                error: null,
              })
            ),
            is: vi.fn(() =>
              Promise.resolve({
                data: [],
                error: null,
              })
            ),
          })),
        })),
      }));

      const poInvoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() =>
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
          select: poSelectMock,
        })
        .mockReturnValueOnce({
          select: advanceInvoicesSelectMock,
        })
        .mockReturnValueOnce({
          select: poInvoicesSelectMock,
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { purchase_order_uuid: "po-uuid-1" },
      });

      const result = await handler.default(event);

      expect(result.data.total_po_value).toBe(15000);
    });

    it("handles financial_breakdown as object (not string)", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        purchase_order_uuid: "po-uuid-1",
      });

      const poSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: {
                uuid: "po-uuid-1",
                financial_breakdown: {
                  totals: {
                    total_po_amount: 20000,
                  },
                },
              },
              error: null,
            })
          ),
        })),
      }));

      const advanceInvoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            or: vi.fn(() =>
              Promise.resolve({
                data: [],
                error: null,
              })
            ),
            is: vi.fn(() =>
              Promise.resolve({
                data: [],
                error: null,
              })
            ),
          })),
        })),
      }));

      const poInvoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() =>
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
          select: poSelectMock,
        })
        .mockReturnValueOnce({
          select: advanceInvoicesSelectMock,
        })
        .mockReturnValueOnce({
          select: poInvoicesSelectMock,
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { purchase_order_uuid: "po-uuid-1" },
      });

      const result = await handler.default(event);

      expect(result.data.total_po_value).toBe(20000);
    });

    it("returns zero for advance paid when no advance invoices exist", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        purchase_order_uuid: "po-uuid-1",
      });

      const poSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: {
                uuid: "po-uuid-1",
                financial_breakdown: JSON.stringify({
                  totals: {
                    total_po_amount: 10000,
                  },
                }),
              },
              error: null,
            })
          ),
        })),
      }));

      const advanceInvoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            or: vi.fn(() =>
              Promise.resolve({
                data: [],
                error: null,
              })
            ),
            is: vi.fn(() =>
              Promise.resolve({
                data: [],
                error: null,
              })
            ),
          })),
        })),
      }));

      const poInvoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() =>
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
          select: poSelectMock,
        })
        .mockReturnValueOnce({
          select: advanceInvoicesSelectMock,
        })
        .mockReturnValueOnce({
          select: poInvoicesSelectMock,
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { purchase_order_uuid: "po-uuid-1" },
      });

      const result = await handler.default(event);

      expect(result.data.advance_paid).toBe(0);
      expect(result.data.balance_to_be_invoiced).toBe(10000);
    });

    it("handles missing purchase_order_uuid parameter", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({});

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/invoice-summary");
      const event = makeEvent("GET", { query: {} });

      await expect(handler.default(event)).rejects.toThrow();
    });

    it("handles purchase order not found", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        purchase_order_uuid: "non-existent",
      });

      const poSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: null,
              error: null,
            })
          ),
        })),
      }));

      supabaseMock.from.mockReturnValueOnce({
        select: poSelectMock,
      });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { purchase_order_uuid: "non-existent" },
      });

      await expect(handler.default(event)).rejects.toThrow("Purchase order not found");
    });

    it("calculates balance correctly with all values", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        purchase_order_uuid: "po-uuid-1",
      });

      const poSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: {
                uuid: "po-uuid-1",
                financial_breakdown: JSON.stringify({
                  totals: {
                    total_po_amount: 10000,
                  },
                }),
              },
              error: null,
            })
          ),
        })),
      }));

      const advanceInvoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            or: vi.fn(() =>
              Promise.resolve({
                data: [{ amount: "1000.00" }],
                error: null,
              })
            ),
            is: vi.fn(() =>
              Promise.resolve({
                data: [{ amount: "1000.00" }],
                error: null,
              })
            ),
          })),
        })),
      }));

      const poInvoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: [{ amount: "5000.00" }],
                error: null,
              })
            ),
          })),
        })),
      }));

      supabaseMock.from
        .mockReturnValueOnce({
          select: poSelectMock,
        })
        .mockReturnValueOnce({
          select: advanceInvoicesSelectMock,
        })
        .mockReturnValueOnce({
          select: poInvoicesSelectMock,
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { purchase_order_uuid: "po-uuid-1" },
      });

      const result = await handler.default(event);

      expect(result.data.total_po_value).toBe(10000);
      expect(result.data.advance_paid).toBe(1000);
      expect(result.data.invoiced_value).toBe(5000);
      expect(result.data.balance_to_be_invoiced).toBe(4000); // 10000 - 1000 - 5000
    });

    it("includes advance payments adjusted against current invoice when currentInvoiceUuid is provided", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        purchase_order_uuid: "po-uuid-1",
        currentInvoiceUuid: "invoice-uuid-1",
      });

      const poSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: {
                uuid: "po-uuid-1",
                financial_breakdown: JSON.stringify({
                  totals: {
                    total_po_amount: 10000,
                  },
                }),
              },
              error: null,
            })
          ),
        })),
      }));

      // Mock advance invoices - should include adjusted ones when currentInvoiceUuid is provided
      const advanceInvoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            or: vi.fn(() =>
              Promise.resolve({
                data: [
                  { amount: "240.00" }, // Adjusted against invoice-uuid-1
                  { amount: "100.00" }, // Unadjusted
                ],
                error: null,
              })
            ),
          })),
        })),
      }));

      const poInvoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() =>
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
          select: poSelectMock,
        })
        .mockReturnValueOnce({
          select: advanceInvoicesSelectMock,
        })
        .mockReturnValueOnce({
          select: poInvoicesSelectMock,
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: {
          purchase_order_uuid: "po-uuid-1",
          currentInvoiceUuid: "invoice-uuid-1",
        },
      });

      const result = await handler.default(event);

      // Should include both adjusted and unadjusted advance payments
      expect(result.data.advance_paid).toBe(340); // 240 + 100
    });

    it("excludes advance payments adjusted against other invoices when currentInvoiceUuid is not provided", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        purchase_order_uuid: "po-uuid-1",
      });

      const poSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: {
                uuid: "po-uuid-1",
                financial_breakdown: JSON.stringify({
                  totals: {
                    total_po_amount: 10000,
                  },
                }),
              },
              error: null,
            })
          ),
        })),
      }));

      // Mock advance invoices - should only include unadjusted ones
      const advanceInvoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() =>
              Promise.resolve({
                data: [
                  { amount: "100.00" }, // Only unadjusted
                ],
                error: null,
              })
            ),
          })),
        })),
      }));

      const poInvoicesSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() =>
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
          select: poSelectMock,
        })
        .mockReturnValueOnce({
          select: advanceInvoicesSelectMock,
        })
        .mockReturnValueOnce({
          select: poInvoicesSelectMock,
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { purchase_order_uuid: "po-uuid-1" },
      });

      const result = await handler.default(event);

      // Should only include unadjusted advance payments
      expect(result.data.advance_paid).toBe(100);
    });
  });
});

