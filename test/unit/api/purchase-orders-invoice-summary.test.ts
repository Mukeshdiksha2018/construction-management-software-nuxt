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

  // Helper to create chainable mock for advance payments query
  // Chain: .select().eq(purchase_order_uuid).eq(invoice_type).eq(status).eq(is_active)
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
  
  // Helper to create chainable mock for advance payments query with financial_breakdown
  // Updated to select both amount and financial_breakdown
  const createAdvancePaymentsWithBreakdownMock = (data: any[]) => {
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

  // Helper to create chainable mock for PO invoices query
  // Chain: .select().eq(purchase_order_uuid).eq(invoice_type).eq(status).eq(is_active)
  const createPOInvoicesMock = (data: any[]) => {
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

  // Helper to create PO select mock
  const createPOSelectMock = (poData: any) => {
    return vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() =>
          Promise.resolve({
            data: poData,
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
        purchase_order_uuid: "po-uuid-1",
      });

      supabaseMock.from
        .mockReturnValueOnce({
          select: createPOSelectMock({
            uuid: "po-uuid-1",
            financial_breakdown: JSON.stringify({
              totals: { total_po_amount: 10000 },
            }),
          }),
        })
        .mockReturnValueOnce({
          select: createAdvancePaymentsMock([
            { amount: "240.00" },
            { amount: "100.00" },
          ]),
        })
        .mockReturnValueOnce({
          select: createPOInvoicesMock([{ amount: "5000.00" }]),
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

    it("only includes advance payments with Paid status (excludes Draft, Pending, Approved)", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        purchase_order_uuid: "po-uuid-1",
      });

      // The API now filters by status="Paid", so only Paid invoices should be returned
      supabaseMock.from
        .mockReturnValueOnce({
          select: createPOSelectMock({
            uuid: "po-uuid-1",
            financial_breakdown: JSON.stringify({
              totals: { total_po_amount: 5000 },
            }),
          }),
        })
        .mockReturnValueOnce({
          // Only Paid advance invoices are returned by the query
          select: createAdvancePaymentsMock([
            { amount: "100.00" }, // Only Paid invoice
          ]),
        })
        .mockReturnValueOnce({
          select: createPOInvoicesMock([]),
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { purchase_order_uuid: "po-uuid-1" },
      });

      const result = await handler.default(event);

      // Should only include Paid invoices
      expect(result.data.advance_paid).toBe(100);
    });

    it("only includes invoiced value with Paid status", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        purchase_order_uuid: "po-uuid-1",
      });

      supabaseMock.from
        .mockReturnValueOnce({
          select: createPOSelectMock({
            uuid: "po-uuid-1",
            financial_breakdown: JSON.stringify({
              totals: { total_po_amount: 10000 },
            }),
          }),
        })
        .mockReturnValueOnce({
          select: createAdvancePaymentsMock([]),
        })
        .mockReturnValueOnce({
          // Only Paid AGAINST_PO invoices
          select: createPOInvoicesMock([
            { amount: "3000.00" },
            { amount: "2000.00" },
          ]),
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { purchase_order_uuid: "po-uuid-1" },
      });

      const result = await handler.default(event);

      expect(result.data.invoiced_value).toBe(5000); // 3000 + 2000
      expect(result.data.balance_to_be_invoiced).toBe(5000); // 10000 - 0 - 5000
    });

    it("extracts total_po_amount from financial_breakdown JSON", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        purchase_order_uuid: "po-uuid-1",
      });

      supabaseMock.from
        .mockReturnValueOnce({
          select: createPOSelectMock({
            uuid: "po-uuid-1",
            financial_breakdown: JSON.stringify({
              totals: {
                total_po_amount: 15000,
                item_total: 12000,
                charges_total: 2000,
                tax_total: 1000,
              },
            }),
          }),
        })
        .mockReturnValueOnce({
          select: createAdvancePaymentsMock([]),
        })
        .mockReturnValueOnce({
          select: createPOInvoicesMock([]),
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

      supabaseMock.from
        .mockReturnValueOnce({
          select: createPOSelectMock({
            uuid: "po-uuid-1",
            financial_breakdown: {
              totals: { total_po_amount: 20000 },
            },
          }),
        })
        .mockReturnValueOnce({
          select: createAdvancePaymentsMock([]),
        })
        .mockReturnValueOnce({
          select: createPOInvoicesMock([]),
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

    it("returns zero for advance paid when no Paid advance invoices exist", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        purchase_order_uuid: "po-uuid-1",
      });

      supabaseMock.from
        .mockReturnValueOnce({
          select: createPOSelectMock({
            uuid: "po-uuid-1",
            financial_breakdown: JSON.stringify({
              totals: { total_po_amount: 10000 },
            }),
          }),
        })
        .mockReturnValueOnce({
          select: createAdvancePaymentsMock([]), // No Paid advance invoices
        })
        .mockReturnValueOnce({
          select: createPOInvoicesMock([]),
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

      const handler = await import("@/server/api/purchase-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { purchase_order_uuid: "non-existent" },
      });

      await expect(handler.default(event)).rejects.toThrow("Purchase order not found");
    });

    it("calculates balance correctly: Total PO Value - Advance Paid - Invoiced Value", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        purchase_order_uuid: "po-uuid-1",
      });

      supabaseMock.from
        .mockReturnValueOnce({
          select: createPOSelectMock({
            uuid: "po-uuid-1",
            financial_breakdown: JSON.stringify({
              totals: { total_po_amount: 10000 },
            }),
          }),
        })
        .mockReturnValueOnce({
          select: createAdvancePaymentsMock([{ amount: "1000.00" }]),
        })
        .mockReturnValueOnce({
          select: createPOInvoicesMock([{ amount: "5000.00" }]),
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
      // Balance = Total PO Value - Advance Paid - Invoiced Value
      expect(result.data.balance_to_be_invoiced).toBe(4000); // 10000 - 1000 - 5000
    });

    it("returns zero balance when total invoiced exceeds PO value", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        purchase_order_uuid: "po-uuid-1",
      });

      supabaseMock.from
        .mockReturnValueOnce({
          select: createPOSelectMock({
            uuid: "po-uuid-1",
            financial_breakdown: JSON.stringify({
              totals: { total_po_amount: 5000 },
            }),
          }),
        })
        .mockReturnValueOnce({
          select: createAdvancePaymentsMock([{ amount: "3000.00" }]),
        })
        .mockReturnValueOnce({
          select: createPOInvoicesMock([{ amount: "4000.00" }]),
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { purchase_order_uuid: "po-uuid-1" },
      });

      const result = await handler.default(event);

      // Balance should be 0, not negative (5000 - 3000 - 4000 = -2000 -> 0)
      expect(result.data.balance_to_be_invoiced).toBe(0);
    });

    it("handles null/undefined amounts gracefully", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        purchase_order_uuid: "po-uuid-1",
      });

      supabaseMock.from
        .mockReturnValueOnce({
          select: createPOSelectMock({
            uuid: "po-uuid-1",
            financial_breakdown: JSON.stringify({
              totals: { total_po_amount: 10000 },
            }),
          }),
        })
        .mockReturnValueOnce({
          select: createAdvancePaymentsMock([
            { amount: null },
            { amount: "100.00" },
            { amount: undefined },
          ]),
        })
        .mockReturnValueOnce({
          select: createPOInvoicesMock([
            { amount: "500.00" },
            { amount: null },
          ]),
        });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/invoice-summary");
      const event = makeEvent("GET", {
        query: { purchase_order_uuid: "po-uuid-1" },
      });

      const result = await handler.default(event);

      expect(result.data.advance_paid).toBe(100);
      expect(result.data.invoiced_value).toBe(500);
    });

    it("rejects non-GET requests", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({
        purchase_order_uuid: "po-uuid-1",
      });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-orders/invoice-summary");
      const event = makeEvent("POST", {
        query: { purchase_order_uuid: "po-uuid-1" },
      });

      await expect(handler.default(event)).rejects.toThrow("Method not allowed");
    });

    describe("Advance Paid Calculation - Tax Exclusion", () => {
      it("calculates advance paid excluding taxes when financial_breakdown has sales_taxes", async () => {
        const globals = stubGlobals();
        globals.mockGetQuery.mockReturnValue({
          purchase_order_uuid: "po-uuid-1",
        });

        supabaseMock.from
          .mockReturnValueOnce({
            select: createPOSelectMock({
              uuid: "po-uuid-1",
              financial_breakdown: JSON.stringify({
                totals: { total_po_amount: 10000 },
              }),
            }),
          })
          .mockReturnValueOnce({
            select: createAdvancePaymentsWithBreakdownMock([
              {
                amount: "110.00", // Total with tax
                financial_breakdown: JSON.stringify({
                  totals: { tax_total: 10 },
                  sales_taxes: {
                    sales_tax_1: { amount: 6 },
                    sales_tax_2: { amount: 4 },
                  },
                }),
              },
              {
                amount: "220.00", // Total with tax
                financial_breakdown: JSON.stringify({
                  totals: { tax_total: 20 },
                  sales_taxes: {
                    sales_tax_1: { amount: 12 },
                    sales_tax_2: { amount: 8 },
                  },
                }),
              },
            ]),
          })
          .mockReturnValueOnce({
            select: createPOInvoicesMock([]),
          });

        vi.doMock("@/utils/supabaseServer", () => ({
          supabaseServer: supabaseMock,
        }));

        const handler = await import("@/server/api/purchase-orders/invoice-summary");
        const event = makeEvent("GET", {
          query: { purchase_order_uuid: "po-uuid-1" },
        });

        const result = await handler.default(event);

        // Advance paid should exclude taxes: (110 - 10) + (220 - 20) = 100 + 200 = 300
        expect(result.data.advance_paid).toBe(300);
      });

      it("calculates advance paid excluding taxes when financial_breakdown has tax_total (no sales_taxes)", async () => {
        const globals = stubGlobals();
        globals.mockGetQuery.mockReturnValue({
          purchase_order_uuid: "po-uuid-1",
        });

        supabaseMock.from
          .mockReturnValueOnce({
            select: createPOSelectMock({
              uuid: "po-uuid-1",
              financial_breakdown: JSON.stringify({
                totals: { total_po_amount: 10000 },
              }),
            }),
          })
          .mockReturnValueOnce({
            select: createAdvancePaymentsWithBreakdownMock([
              {
                amount: "105.00", // Total with tax
                financial_breakdown: JSON.stringify({
                  totals: { tax_total: 5 },
                }),
              },
              {
                amount: "210.00", // Total with tax
                financial_breakdown: JSON.stringify({
                  totals: { tax_total: 10 },
                }),
              },
            ]),
          })
          .mockReturnValueOnce({
            select: createPOInvoicesMock([]),
          });

        vi.doMock("@/utils/supabaseServer", () => ({
          supabaseServer: supabaseMock,
        }));

        const handler = await import("@/server/api/purchase-orders/invoice-summary");
        const event = makeEvent("GET", {
          query: { purchase_order_uuid: "po-uuid-1" },
        });

        const result = await handler.default(event);

        // Advance paid should exclude taxes: (105 - 5) + (210 - 10) = 100 + 200 = 300
        expect(result.data.advance_paid).toBe(300);
      });

      it("falls back to amount when financial_breakdown is missing", async () => {
        const globals = stubGlobals();
        globals.mockGetQuery.mockReturnValue({
          purchase_order_uuid: "po-uuid-1",
        });

        supabaseMock.from
          .mockReturnValueOnce({
            select: createPOSelectMock({
              uuid: "po-uuid-1",
              financial_breakdown: JSON.stringify({
                totals: { total_po_amount: 10000 },
              }),
            }),
          })
          .mockReturnValueOnce({
            select: createAdvancePaymentsWithBreakdownMock([
              {
                amount: "100.00",
                financial_breakdown: null, // No financial breakdown
              },
              {
                amount: "200.00",
                // financial_breakdown is undefined
              },
            ]),
          })
          .mockReturnValueOnce({
            select: createPOInvoicesMock([]),
          });

        vi.doMock("@/utils/supabaseServer", () => ({
          supabaseServer: supabaseMock,
        }));

        const handler = await import("@/server/api/purchase-orders/invoice-summary");
        const event = makeEvent("GET", {
          query: { purchase_order_uuid: "po-uuid-1" },
        });

        const result = await handler.default(event);

        // Should fall back to amount: 100 + 200 = 300
        expect(result.data.advance_paid).toBe(300);
      });

      it("handles financial_breakdown as object (not string)", async () => {
        const globals = stubGlobals();
        globals.mockGetQuery.mockReturnValue({
          purchase_order_uuid: "po-uuid-1",
        });

        supabaseMock.from
          .mockReturnValueOnce({
            select: createPOSelectMock({
              uuid: "po-uuid-1",
              financial_breakdown: JSON.stringify({
                totals: { total_po_amount: 10000 },
              }),
            }),
          })
          .mockReturnValueOnce({
            select: createAdvancePaymentsWithBreakdownMock([
              {
                amount: "110.00",
                financial_breakdown: {
                  // Object format, not string
                  totals: { tax_total: 10 },
                  sales_taxes: {
                    sales_tax_1: { amount: 6 },
                    sales_tax_2: { amount: 4 },
                  },
                },
              },
            ]),
          })
          .mockReturnValueOnce({
            select: createPOInvoicesMock([]),
          });

        vi.doMock("@/utils/supabaseServer", () => ({
          supabaseServer: supabaseMock,
        }));

        const handler = await import("@/server/api/purchase-orders/invoice-summary");
        const event = makeEvent("GET", {
          query: { purchase_order_uuid: "po-uuid-1" },
        });

        const result = await handler.default(event);

        // Should handle object format: 110 - 10 = 100
        expect(result.data.advance_paid).toBe(100);
      });

      it("handles parsing errors gracefully and falls back to amount", async () => {
        const globals = stubGlobals();
        globals.mockGetQuery.mockReturnValue({
          purchase_order_uuid: "po-uuid-1",
        });

        supabaseMock.from
          .mockReturnValueOnce({
            select: createPOSelectMock({
              uuid: "po-uuid-1",
              financial_breakdown: JSON.stringify({
                totals: { total_po_amount: 10000 },
              }),
            }),
          })
          .mockReturnValueOnce({
            select: createAdvancePaymentsWithBreakdownMock([
              {
                amount: "100.00",
                financial_breakdown: "invalid json {", // Invalid JSON
              },
            ]),
          })
          .mockReturnValueOnce({
            select: createPOInvoicesMock([]),
          });

        vi.doMock("@/utils/supabaseServer", () => ({
          supabaseServer: supabaseMock,
        }));

        const handler = await import("@/server/api/purchase-orders/invoice-summary");
        const event = makeEvent("GET", {
          query: { purchase_order_uuid: "po-uuid-1" },
        });

        const result = await handler.default(event);

        // Should fall back to amount when parsing fails
        expect(result.data.advance_paid).toBe(100);
      });

      it("handles mixed scenarios with and without financial_breakdown", async () => {
        const globals = stubGlobals();
        globals.mockGetQuery.mockReturnValue({
          purchase_order_uuid: "po-uuid-1",
        });

        supabaseMock.from
          .mockReturnValueOnce({
            select: createPOSelectMock({
              uuid: "po-uuid-1",
              financial_breakdown: JSON.stringify({
                totals: { total_po_amount: 10000 },
              }),
            }),
          })
          .mockReturnValueOnce({
            select: createAdvancePaymentsWithBreakdownMock([
              {
                amount: "110.00",
                financial_breakdown: JSON.stringify({
                  totals: { tax_total: 10 },
                }),
              },
              {
                amount: "200.00",
                // No financial_breakdown - should use amount
              },
              {
                amount: "330.00",
                financial_breakdown: JSON.stringify({
                  sales_taxes: {
                    sales_tax_1: { amount: 20 },
                    sales_tax_2: { amount: 10 },
                  },
                }),
              },
            ]),
          })
          .mockReturnValueOnce({
            select: createPOInvoicesMock([]),
          });

        vi.doMock("@/utils/supabaseServer", () => ({
          supabaseServer: supabaseMock,
        }));

        const handler = await import("@/server/api/purchase-orders/invoice-summary");
        const event = makeEvent("GET", {
          query: { purchase_order_uuid: "po-uuid-1" },
        });

        const result = await handler.default(event);

        // (110 - 10) + 200 + (330 - 30) = 100 + 200 + 300 = 600
        expect(result.data.advance_paid).toBe(600);
      });

      it("handles zero tax correctly", async () => {
        const globals = stubGlobals();
        globals.mockGetQuery.mockReturnValue({
          purchase_order_uuid: "po-uuid-1",
        });

        supabaseMock.from
          .mockReturnValueOnce({
            select: createPOSelectMock({
              uuid: "po-uuid-1",
              financial_breakdown: JSON.stringify({
                totals: { total_po_amount: 10000 },
              }),
            }),
          })
          .mockReturnValueOnce({
            select: createAdvancePaymentsWithBreakdownMock([
              {
                amount: "100.00",
                financial_breakdown: JSON.stringify({
                  totals: { tax_total: 0 },
                }),
              },
            ]),
          })
          .mockReturnValueOnce({
            select: createPOInvoicesMock([]),
          });

        vi.doMock("@/utils/supabaseServer", () => ({
          supabaseServer: supabaseMock,
        }));

        const handler = await import("@/server/api/purchase-orders/invoice-summary");
        const event = makeEvent("GET", {
          query: { purchase_order_uuid: "po-uuid-1" },
        });

        const result = await handler.default(event);

        // Should handle zero tax: 100 - 0 = 100
        expect(result.data.advance_paid).toBe(100);
      });
    });
  });
});
