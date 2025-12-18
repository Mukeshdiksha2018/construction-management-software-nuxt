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

describe("server/api/vendor-invoices", () => {
  const stubGlobals = () => {
    const mockDefineEventHandler = vi.fn((handler) => handler);
    const mockGetQuery = vi.fn(() => ({}));
    const mockReadBody = vi.fn();
    const mockCreateError = vi.fn((options: any) => {
      const error = new Error(options.statusMessage);
      (error as any).statusCode = options.statusCode;
      return error;
    });

    vi.stubGlobal("defineEventHandler", mockDefineEventHandler);
    vi.stubGlobal("getQuery", mockGetQuery);
    vi.stubGlobal("readBody", mockReadBody);
    vi.stubGlobal("createError", mockCreateError);

    return {
      mockDefineEventHandler,
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

  describe("GET - Fetch vendor invoices", () => {
    it("fetches all vendor invoices for a corporation", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ corporation_uuid: "corp-1" });

      const selectSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      uuid: "invoice-1",
                      corporation_uuid: "corp-1",
                      invoice_type: "AGAINST_PO",
                      amount: 1000,
                      bill_date: "2024-01-15T00:00:00.000Z",
                    },
                  ],
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

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("GET", { query: { corporation_uuid: "corp-1" } });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it("fetches single vendor invoice by UUID with line items", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ uuid: "invoice-1" });

      const invoiceData = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        invoice_type: "ENTER_DIRECT_INVOICE",
        amount: 1000,
        bill_date: "2024-01-15T00:00:00.000Z",
        financial_breakdown: {
          charges: {
            freight: { percentage: 5, amount: 50, taxable: false },
          },
          sales_taxes: {},
          totals: { item_total: 1000, charges_total: 50, tax_total: 0, total_invoice_amount: 1050 },
        },
      };

      const lineItemsData = [
        {
          uuid: "line-item-1",
          vendor_invoice_uuid: "invoice-1",
          cost_code_uuid: "cc-1",
          unit_price: 100,
          quantity: 5,
          total: 500,
        },
        {
          uuid: "line-item-2",
          vendor_invoice_uuid: "invoice-1",
          cost_code_uuid: "cc-2",
          unit_price: 50,
          quantity: 10,
          total: 500,
        },
      ];

      const selectSpy = vi.fn((columns: string) => {
        if (columns === "*") {
          return {
            eq: vi.fn((field: string) => {
              if (field === "uuid") {
                return {
                  maybeSingle: vi.fn(() =>
                    Promise.resolve({
                      data: invoiceData,
                      error: null,
                    })
                  ),
                };
              }
              if (field === "vendor_invoice_uuid") {
                return {
                  eq: vi.fn(() => ({
                    order: vi.fn(() =>
                      Promise.resolve({
                        data: lineItemsData,
                        error: null,
                      })
                    ),
                  })),
                };
              }
              return { eq: vi.fn() };
            }),
          };
        }
        return { eq: vi.fn() };
      });

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              select: selectSpy,
              delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
              insert: vi.fn(() => Promise.resolve({ error: null })),
              update: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: invoiceData, error: null })),
              })),
            };
          }
          if (table === "direct_vendor_invoice_line_items") {
            return {
              select: selectSpy,
              delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
              insert: vi.fn(() => Promise.resolve({ error: null })),
            };
          }
          return {
            select: selectSpy,
            delete: vi.fn(() => ({ eq: vi.fn() })),
            insert: vi.fn(),
            update: vi.fn(),
          };
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("GET", { query: { uuid: "invoice-1" } });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(result.data.uuid).toBe("invoice-1");
      expect(result.data.invoice_type).toBe("ENTER_DIRECT_INVOICE");
      expect(Array.isArray(result.data.line_items)).toBe(true);
      expect(result.data.line_items.length).toBe(2);
    });

    it("returns empty line items for non-direct invoices", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ uuid: "invoice-1" });

      const invoiceData = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_PO",
        amount: 1000,
        bill_date: "2024-01-15T00:00:00.000Z",
      };

      const selectSpy = vi.fn((columns: string) => {
        return {
          eq: vi.fn((field: string) => {
            if (field === "uuid") {
              return {
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: invoiceData,
                    error: null,
                  })
                ),
              };
            }
            return { eq: vi.fn() };
          }),
        };
      });

      const selectPoItemsSpy = vi.fn(() => ({
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

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              select: selectSpy,
              delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
              insert: vi.fn(() => Promise.resolve({ error: null })),
              update: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: invoiceData, error: null })),
              })),
            };
          }
          if (table === "purchase_order_invoice_items_list") {
            return {
              select: selectPoItemsSpy,
            };
          }
          return {
            select: selectSpy,
            delete: vi.fn(() => ({ eq: vi.fn() })),
            insert: vi.fn(),
            update: vi.fn(),
          };
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("GET", { query: { uuid: "invoice-1" } });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(result.data.invoice_type).toBe("AGAINST_PO");
      expect(Array.isArray(result.data.line_items)).toBe(true);
      expect(result.data.line_items.length).toBe(0);
      expect(Array.isArray(result.data.po_invoice_items)).toBe(true);
      expect(result.data.po_invoice_items.length).toBe(0);
    });

    it("returns 404 when invoice not found", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ uuid: "non-existent" });

      const selectSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: null,
              error: null,
            })
          ),
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

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("GET", { query: { uuid: "non-existent" } });

      await expect(handler.default(event)).rejects.toThrow("Vendor invoice not found");
    });
  });

  describe("POST - Create vendor invoice", () => {
    it("creates a vendor invoice with required fields", async () => {
      const globals = stubGlobals();
      const invoiceData = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_PO",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1000,
      };

      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_PO",
        bill_date: "2024-01-15",
        amount: 1000,
      });

      const insertSpy = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: invoiceData,
              error: null,
            })
          ),
        })),
      }));

      const selectWithMetadataSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                ...invoiceData,
                project: null,
                vendor: null,
                purchase_order: null,
                change_order: null,
              },
              error: null,
            })
          ),
        })),
      }));

      const selectPoItemsSpy = vi.fn(() => ({
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

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              insert: insertSpy,
              select: vi.fn((query?: string) => {
                // If query includes JOINs (has commas), return metadata spy
                if (query && query.includes(',')) {
                  return selectWithMetadataSpy();
                }
                // Otherwise return insert spy
                return insertSpy().select();
              }),
            };
          }
          if (table === "purchase_order_invoice_items_list") {
            return {
              delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
              insert: vi.fn(() => Promise.resolve({ error: null })),
              select: selectPoItemsSpy,
            };
          }
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
            delete: vi.fn(() => Promise.resolve({ error: null })),
            insert: vi.fn(() => Promise.resolve({ error: null })),
          };
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("POST", {
        body: {
          corporation_uuid: "corp-1",
          invoice_type: "AGAINST_PO",
          bill_date: "2024-01-15",
          amount: 1000,
        },
      });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(result.data.uuid).toBe("invoice-1");
      expect(insertSpy).toHaveBeenCalled();
    });

    it("creates a direct invoice with line items", async () => {
      const globals = stubGlobals();
      const invoiceData = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        invoice_type: "ENTER_DIRECT_INVOICE",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1000,
      };

      const lineItems = [
        {
          cost_code_uuid: "cc-1",
          unit_price: 100,
          quantity: 5,
          total: 500,
        },
        {
          cost_code_uuid: "cc-2",
          unit_price: 50,
          quantity: 10,
          total: 500,
        },
      ];

      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: "corp-1",
        project_uuid: "project-1",
        invoice_type: "ENTER_DIRECT_INVOICE",
        bill_date: "2024-01-15",
        amount: 1000,
        line_items: lineItems,
      });

      const insertedLineItems: any[] = [];
      const deleteLineItemsSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      const insertLineItemsSpy = vi.fn((items: any[]) => {
        insertedLineItems.push(...items);
        return Promise.resolve({ error: null });
      });

      const insertSpy = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: invoiceData,
              error: null,
            })
          ),
        })),
      }));

      const selectWithMetadataSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                ...invoiceData,
                project: null,
                vendor: null,
                purchase_order: null,
                change_order: null,
              },
              error: null,
            })
          ),
        })),
      }));

      const selectLineItemsSpy = vi.fn(() => ({
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

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              insert: insertSpy,
              select: vi.fn((query?: string) => {
                // If query includes JOINs (has commas), return metadata spy
                if (query && query.includes(',')) {
                  return selectWithMetadataSpy();
                }
                // Otherwise return insert spy
                return insertSpy().select();
              }),
              delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
              update: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: invoiceData, error: null })),
              })),
            };
          }
          if (table === "direct_vendor_invoice_line_items") {
            return {
              delete: deleteLineItemsSpy,
              insert: insertLineItemsSpy,
              select: selectLineItemsSpy,
            };
          }
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
            delete: vi.fn(() => ({ eq: vi.fn() })),
            insert: vi.fn(),
            update: vi.fn(),
          };
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("POST", {
        body: {
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          invoice_type: "ENTER_DIRECT_INVOICE",
          bill_date: "2024-01-15",
          amount: 1000,
          line_items: lineItems,
        },
      });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(result.data.invoice_type).toBe("ENTER_DIRECT_INVOICE");
      expect(deleteLineItemsSpy).toHaveBeenCalled();
      expect(insertLineItemsSpy).toHaveBeenCalled();
      expect(insertedLineItems.length).toBe(2);
    });

    it("validates required fields", async () => {
      const globals = stubGlobals();
      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: "corp-1",
        // Missing invoice_type, bill_date, amount
      });

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("POST", {
        body: {
          corporation_uuid: "corp-1",
        },
      });

      await expect(handler.default(event)).rejects.toThrow();
    });

    it("validates invoice type", async () => {
      const globals = stubGlobals();
      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: "corp-1",
        invoice_type: "INVALID_TYPE",
        bill_date: "2024-01-15",
        amount: 1000,
      });

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("POST", {
        body: {
          corporation_uuid: "corp-1",
          invoice_type: "INVALID_TYPE",
          bill_date: "2024-01-15",
          amount: 1000,
        },
      });

      await expect(handler.default(event)).rejects.toThrow("Invalid invoice_type");
    });

    it("handles financial breakdown in POST", async () => {
      const globals = stubGlobals();
      const invoiceData = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        invoice_type: "ENTER_DIRECT_INVOICE",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1050,
        financial_breakdown: {
          charges: {
            freight: { percentage: 5, amount: 50, taxable: false },
          },
          sales_taxes: {},
          totals: { item_total: 1000, charges_total: 50, tax_total: 0, total_invoice_amount: 1050 },
        },
      };

      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: "corp-1",
        invoice_type: "ENTER_DIRECT_INVOICE",
        bill_date: "2024-01-15",
        amount: 1050,
        item_total: 1000,
        freight_charges_percentage: 5,
        freight_charges_amount: 50,
      });

      const insertSpy = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: invoiceData,
              error: null,
            })
          ),
        })),
      }));

      const selectWithMetadataSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                ...invoiceData,
                project: null,
                vendor: null,
                purchase_order: null,
                change_order: null,
              },
              error: null,
            })
          ),
        })),
      }));

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              insert: insertSpy,
              select: vi.fn((query?: string) => {
                // If query includes JOINs (has commas), return metadata spy
                if (query && query.includes(',')) {
                  return selectWithMetadataSpy();
                }
                // Otherwise return insert spy
                return insertSpy().select();
              }),
            };
          }
          return {
            select: vi.fn(() => ({
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
            delete: vi.fn(() => Promise.resolve({ error: null })),
            insert: vi.fn(() => Promise.resolve({ error: null })),
          };
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("POST", {
        body: {
          corporation_uuid: "corp-1",
          invoice_type: "ENTER_DIRECT_INVOICE",
          bill_date: "2024-01-15",
          amount: 1050,
          item_total: 1000,
          freight_charges_percentage: 5,
          freight_charges_amount: 50,
        },
      });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(insertSpy).toHaveBeenCalled();
      const insertCall = insertSpy.mock.calls[0][0][0];
      expect(insertCall.financial_breakdown).toBeDefined();
      expect(insertCall.financial_breakdown.charges.freight.percentage).toBe(5);
    });
  });

  describe("PUT - Update vendor invoice", () => {
    it("updates vendor invoice with new values", async () => {
      const globals = stubGlobals();
      const updatedData = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_PO",
        bill_date: "2024-01-20T00:00:00.000Z",
        amount: 1500,
      };

      globals.mockReadBody.mockResolvedValue({
        uuid: "invoice-1",
        amount: 1500,
        bill_date: "2024-01-20",
      });

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: updatedData,
                error: null,
              })
            ),
          })),
        })),
      }));

      const selectCurrentSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: { 
                invoice_type: "AGAINST_PO",
                purchase_order_uuid: "po-uuid-1"
              },
              error: null,
            })
          ),
        })),
      }));

      const selectWithMetadataSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                ...updatedData,
                project: null,
                vendor: null,
                purchase_order: null,
                change_order: null,
              },
              error: null,
            })
          ),
        })),
      }));

      const selectPoItemsSpy = vi.fn(() => ({
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

      // Default mock for all other tables
      const defaultTableMock = () => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
          in: vi.fn(() => Promise.resolve({ error: null })),
        })),
      });

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              update: updateSpy,
              select: vi.fn((query?: string) => {
                // If query includes invoice_type and purchase_order_uuid (current invoice query), return current invoice spy
                if (query && query.includes("invoice_type") && query.includes("purchase_order_uuid") && !query.includes("*")) {
                  return selectCurrentSpy();
                }
                // Otherwise return metadata spy (for queries with *, or JOINs, etc.)
                return selectWithMetadataSpy();
              }),
              delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
            };
          }
          if (table === "purchase_order_invoice_items_list") {
            return {
              delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
              insert: vi.fn(() => Promise.resolve({ error: null })),
              select: selectPoItemsSpy,
            };
          }
          // Return default mock for all other tables
          return defaultTableMock();
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("PUT", {
        body: {
          uuid: "invoice-1",
          amount: 1500,
          bill_date: "2024-01-20",
        },
      });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(result.data.amount).toBe(1500);
      expect(updateSpy).toHaveBeenCalled();
    });

    it("updates line items when invoice type is ENTER_DIRECT_INVOICE", async () => {
      const globals = stubGlobals();
      const updatedData = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        invoice_type: "ENTER_DIRECT_INVOICE",
        amount: 1000,
      };

      const lineItems = [
        {
          cost_code_uuid: "cc-1",
          unit_price: 100,
          quantity: 5,
          total: 500,
        },
      ];

      globals.mockReadBody.mockResolvedValue({
        uuid: "invoice-1",
        invoice_type: "ENTER_DIRECT_INVOICE",
        line_items: lineItems,
      });

      const updatedLineItems: any[] = [];
      const deleteLineItemsSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      const insertLineItemsSpy = vi.fn((items: any[]) => {
        updatedLineItems.push(...items);
        return Promise.resolve({ error: null });
      });

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: updatedData,
                error: null,
              })
            ),
          })),
        })),
      }));

      const selectCurrentSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: { 
                invoice_type: "ENTER_DIRECT_INVOICE",
                purchase_order_uuid: null
              },
              error: null,
            })
          ),
        })),
      }));

      const selectLineItemsSpy = vi.fn(() => ({
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

      const selectWithMetadataSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                ...updatedData,
                project: null,
                vendor: null,
                purchase_order: null,
                change_order: null,
              },
              error: null,
            })
          ),
        })),
      }));

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              update: updateSpy,
              select: vi.fn((query?: string) => {
                // If query includes invoice_type and purchase_order_uuid (current invoice query), return current invoice spy
                if (query && query.includes("invoice_type") && query.includes("purchase_order_uuid") && !query.includes("*")) {
                  return selectCurrentSpy();
                }
                // Otherwise return metadata spy (for queries with *, or JOINs, etc.)
                return selectWithMetadataSpy();
              }),
            };
          }
          if (table === "direct_vendor_invoice_line_items") {
            return {
              delete: deleteLineItemsSpy,
              insert: insertLineItemsSpy,
              select: selectLineItemsSpy,
            };
          }
          return {};
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("PUT", {
        body: {
          uuid: "invoice-1",
          invoice_type: "ENTER_DIRECT_INVOICE",
          line_items: lineItems,
        },
      });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(deleteLineItemsSpy).toHaveBeenCalled();
      expect(insertLineItemsSpy).toHaveBeenCalled();
      expect(updatedLineItems.length).toBe(1);
    });

    it("deletes line items when switching from ENTER_DIRECT_INVOICE to another type", async () => {
      const globals = stubGlobals();
      const updatedData = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_PO",
        amount: 1000,
      };

      globals.mockReadBody.mockResolvedValue({
        uuid: "invoice-1",
        invoice_type: "AGAINST_PO",
      });

      const deleteLineItemsSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: updatedData,
                error: null,
              })
            ),
          })),
        })),
      }));

      const selectCurrentSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: { 
                invoice_type: "ENTER_DIRECT_INVOICE",
                purchase_order_uuid: null
              },
              error: null,
            })
          ),
        })),
      }));

      const selectWithMetadataSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                uuid: "invoice-1",
                corporation_uuid: "corp-1",
                invoice_type: "AGAINST_PO",
                amount: 1000,
                project: null,
                vendor: null,
                purchase_order: null,
                change_order: null,
              },
              error: null,
            })
          ),
        })),
      }));

      // Default mock for all other tables
      const defaultTableMock = () => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
          in: vi.fn(() => Promise.resolve({ error: null })),
        })),
      });

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              update: updateSpy,
              select: vi.fn((query?: string) => {
                // If query includes invoice_type and purchase_order_uuid (current invoice query), return current invoice spy
                if (query && query.includes("invoice_type") && query.includes("purchase_order_uuid") && !query.includes("*")) {
                  return selectCurrentSpy();
                }
                // Otherwise return metadata spy (for queries with *, or JOINs, etc.)
                return selectWithMetadataSpy();
              }),
              delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
            };
          }
          if (table === "direct_vendor_invoice_line_items") {
            return {
              delete: deleteLineItemsSpy,
              insert: vi.fn(() => Promise.resolve({ error: null })),
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
                  })),
                })),
              })),
            };
          }
          if (table === "purchase_order_invoice_items_list") {
            return {
              delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
              insert: vi.fn(() => Promise.resolve({ error: null })),
              select: vi.fn(() => ({
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
            };
          }
          // Return default mock for all other tables
          return defaultTableMock();
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("PUT", {
        body: {
          uuid: "invoice-1",
          invoice_type: "AGAINST_PO",
        },
      });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(deleteLineItemsSpy).toHaveBeenCalled();
    });

    it("handles financial breakdown updates", async () => {
      const globals = stubGlobals();
      const updatedData = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        invoice_type: "ENTER_DIRECT_INVOICE",
        amount: 1050,
        financial_breakdown: {
          charges: {
            freight: { percentage: 5, amount: 50, taxable: false },
          },
          sales_taxes: {},
          totals: { item_total: 1000, charges_total: 50, tax_total: 0, total_invoice_amount: 1050 },
        },
      };

      globals.mockReadBody.mockResolvedValue({
        uuid: "invoice-1",
        item_total: 1000,
        freight_charges_percentage: 5,
        freight_charges_amount: 50,
        amount: 1050,
      });

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: updatedData,
                error: null,
              })
            ),
          })),
        })),
      }));

      const selectCurrentSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: { 
                invoice_type: "ENTER_DIRECT_INVOICE",
                purchase_order_uuid: null
              },
              error: null,
            })
          ),
        })),
      }));

      const selectWithMetadataSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                ...updatedData,
                project: null,
                vendor: null,
                purchase_order: null,
                change_order: null,
              },
              error: null,
            })
          ),
        })),
      }));

      const selectLineItemsSpy = vi.fn(() => ({
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

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              update: updateSpy,
              select: vi.fn((query?: string) => {
                // If query includes invoice_type and purchase_order_uuid (current invoice query), return current invoice spy
                if (query && query.includes("invoice_type") && query.includes("purchase_order_uuid") && !query.includes("*")) {
                  return selectCurrentSpy();
                }
                // Otherwise return metadata spy (for queries with *, or JOINs, etc.)
                return selectWithMetadataSpy();
              }),
            };
          }
          if (table === "direct_vendor_invoice_line_items") {
            return {
              select: selectLineItemsSpy,
            };
          }
          return {};
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("PUT", {
        body: {
          uuid: "invoice-1",
          item_total: 1000,
          freight_charges_percentage: 5,
          freight_charges_amount: 50,
          amount: 1050,
        },
      });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(updateSpy).toHaveBeenCalled();
      const updateCall = updateSpy.mock.calls[0][0];
      expect(updateCall.financial_breakdown).toBeDefined();
    });
  });

  describe("DELETE - Soft delete vendor invoice", () => {
    it("soft deletes vendor invoice by setting is_active to false", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ uuid: "invoice-1" });

      const deletedData = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        is_active: false,
      };

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: deletedData,
                error: null,
              })
            ),
          })),
        })),
      }));

      const selectCurrentSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: { 
                uuid: "invoice-1",
                invoice_type: "AGAINST_PO"
              },
              error: null,
            })
          ),
        })),
      }));

      const unmarkUpdateSpy = vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({
            error: null,
          })
        ),
      }));

      // Default mock for all other tables
      const defaultTableMock = () => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
          in: vi.fn(() => Promise.resolve({ error: null })),
        })),
      });

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              update: updateSpy,
              select: vi.fn((query?: string) => {
                // If query includes invoice_type (current invoice query for DELETE or PUT), return current invoice spy
                if (query && query.includes("invoice_type") && !query.includes("*")) {
                  return selectCurrentSpy();
                }
                // Otherwise return a default spy
                return selectCurrentSpy();
              }),
            };
          }
          // Return default mock for all other tables (including adjusted_advance_payment_cost_codes)
          return defaultTableMock();
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("DELETE", { query: { uuid: "invoice-1" } });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(result.data.is_active).toBe(false);
      expect(updateSpy).toHaveBeenCalled();
      // The DELETE handler calls update on vendor_invoices: first to unmark advance payments, then to set is_active
      // Also calls update on adjusted_advance_payment_cost_codes to deactivate them
      // Check the last update call which should have is_active: false
      const updateCalls = updateSpy.mock.calls;
      const lastUpdateCall = updateCalls[updateCalls.length - 1][0];
      expect(lastUpdateCall.is_active).toBe(false);
    });
  });

  describe("Financial Breakdown Flattening", () => {
    it("flattens financial breakdown in GET response", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ uuid: "invoice-1" });

      const invoiceData = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        invoice_type: "ENTER_DIRECT_INVOICE",
        amount: 1050,
        financial_breakdown: {
          charges: {
            freight: { percentage: 5, amount: 50, taxable: false },
            packing: { percentage: 2, amount: 20, taxable: true },
          },
          sales_taxes: {
            sales_tax_1: { percentage: 8, amount: 84 },
          },
          totals: {
            item_total: 1000,
            charges_total: 70,
            tax_total: 84,
            total_invoice_amount: 1050,
          },
        },
      };

      const selectSpy = vi.fn((columns: string) => {
        return {
          eq: vi.fn((field: string) => {
            if (field === "uuid") {
              return {
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: invoiceData,
                    error: null,
                  })
                ),
              };
            }
            if (field === "vendor_invoice_uuid") {
              return {
                eq: vi.fn(() => ({
                  order: vi.fn(() =>
                    Promise.resolve({
                      data: [],
                      error: null,
                    })
                  ),
                })),
              };
            }
            return { eq: vi.fn() };
          }),
        };
      });

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              select: selectSpy,
              delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
              insert: vi.fn(() => Promise.resolve({ error: null })),
              update: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: invoiceData, error: null })),
              })),
            };
          }
          if (table === "direct_vendor_invoice_line_items") {
            return {
              select: selectSpy,
              delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
              insert: vi.fn(() => Promise.resolve({ error: null })),
            };
          }
          return {
            select: selectSpy,
            delete: vi.fn(() => ({ eq: vi.fn() })),
            insert: vi.fn(),
            update: vi.fn(),
          };
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("GET", { query: { uuid: "invoice-1" } });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      // Check flattened fields
      expect(result.data.freight_charges_percentage).toBe(5);
      expect(result.data.freight_charges_amount).toBe(50);
      expect(result.data.freight_charges_taxable).toBe(false);
      expect(result.data.packing_charges_percentage).toBe(2);
      expect(result.data.packing_charges_amount).toBe(20);
      expect(result.data.packing_charges_taxable).toBe(true);
      expect(result.data.sales_tax_1_percentage).toBe(8);
      expect(result.data.sales_tax_1_amount).toBe(84);
      expect(result.data.item_total).toBe(1000);
      expect(result.data.charges_total).toBe(70);
      expect(result.data.tax_total).toBe(84);
    });
  });

  describe("Error Handling", () => {
    it("handles database errors gracefully", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ corporation_uuid: "corp-1" });

      const supabaseMock = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() =>
                  Promise.resolve({
                    data: null,
                    error: { message: "Database error" },
                  })
                ),
              })),
            })),
          })),
        })),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("GET", { query: { corporation_uuid: "corp-1" } });

      await expect(handler.default(event)).rejects.toThrow();
    });

    it("validates UUID is required for PUT", async () => {
      const globals = stubGlobals();
      globals.mockReadBody.mockResolvedValue({
        // Missing uuid
        amount: 1500,
      });

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("PUT", {
        body: {
          amount: 1500,
        },
      });

      await expect(handler.default(event)).rejects.toThrow("uuid is required");
    });

    it("validates UUID is required for DELETE", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({});

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("DELETE", { query: {} });

      await expect(handler.default(event)).rejects.toThrow("uuid is required");
    });
  });

  describe("Financial Breakdown for Advance Payment Invoices", () => {
    it("builds financial_breakdown correctly for AGAINST_ADVANCE_PAYMENT invoice", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({});

      const body = {
        corporation_uuid: "corp-1",
        project_uuid: "project-1",
        vendor_uuid: "vendor-1",
        invoice_type: "AGAINST_ADVANCE_PAYMENT",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1500.00,
        financial_breakdown: {
          charges: {
            freight: { percentage: null, amount: null, taxable: false },
            packing: { percentage: null, amount: null, taxable: false },
            custom_duties: { percentage: null, amount: null, taxable: false },
            other: { percentage: null, amount: null, taxable: false },
          },
          sales_taxes: {
            sales_tax_1: { percentage: null, amount: null },
            sales_tax_2: { percentage: null, amount: null },
          },
          totals: {
            item_total: 0,
            charges_total: 0,
            tax_total: 0,
            total_invoice_amount: 0,
          },
        },
      };

      globals.mockReadBody.mockResolvedValue(body);

      const insertSpy = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { uuid: "invoice-1", ...body },
              error: null,
            })
          ),
        })),
      }));

      const selectSpy = vi.fn((columns: string) => {
        // If query includes JOINs (has commas), return metadata response
        if (columns && columns.includes(',')) {
          return {
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: {
                    uuid: "invoice-1",
                    ...body,
                    project: null,
                    vendor: null,
                    purchase_order: null,
                    change_order: null,
                  },
                  error: null,
                })
              ),
            })),
          };
        }
        return {
          eq: vi.fn((field: string) => {
            if (field === "vendor_invoice_uuid") {
              return {
                eq: vi.fn(() => ({
                  order: vi.fn(() =>
                    Promise.resolve({
                      data: [],
                      error: null,
                    })
                  ),
                })),
              };
            }
            if (field === "is_active") {
              return {
                order: vi.fn(() =>
                  Promise.resolve({
                    data: [],
                    error: null,
                  })
                ),
              };
            }
            return { eq: vi.fn() };
          }),
        };
      });

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              insert: insertSpy,
              select: selectSpy,
            };
          }
          // For advance_payment_cost_codes table
          return {
            select: selectSpy,
          };
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const { default: handler } = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("POST", { body });
      globals.mockReadBody.mockResolvedValue(body);

      await handler(event);

      expect(insertSpy).toHaveBeenCalled();
      const insertCall = insertSpy.mock.calls[0][0][0];
      
      // Check that financial_breakdown is correctly built
      expect(insertCall.financial_breakdown).toBeDefined();
      expect(insertCall.financial_breakdown.totals).toBeDefined();
      expect(insertCall.financial_breakdown.totals.total_invoice_amount).toBe(1500.00);
      expect(insertCall.financial_breakdown.totals.item_total).toBe(1500.00);
      expect(insertCall.financial_breakdown.totals.charges_total).toBe(0);
      expect(insertCall.financial_breakdown.totals.tax_total).toBe(0);
    });

    it("updates financial_breakdown totals when amount changes for advance payment invoice", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({});

      const body = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_ADVANCE_PAYMENT",
        amount: 2000.00,
        financial_breakdown: {
          charges: {
            freight: { percentage: null, amount: null, taxable: false },
            packing: { percentage: null, amount: null, taxable: false },
            custom_duties: { percentage: null, amount: null, taxable: false },
            other: { percentage: null, amount: null, taxable: false },
          },
          sales_taxes: {
            sales_tax_1: { percentage: null, amount: null },
            sales_tax_2: { percentage: null, amount: null },
          },
          totals: {
            item_total: 0,
            charges_total: 0,
            tax_total: 0,
            total_invoice_amount: 0,
          },
        },
      };

      globals.mockReadBody.mockResolvedValue(body);

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { uuid: "invoice-1", ...body },
                error: null,
              })
            ),
          })),
        })),
      }));

      const selectCurrentSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: { 
                invoice_type: "AGAINST_ADVANCE_PAYMENT",
                purchase_order_uuid: "po-uuid-1"
              },
              error: null,
            })
          ),
        })),
      }));

      const selectWithMetadataSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                uuid: "invoice-1",
                ...body,
                project: null,
                vendor: null,
                purchase_order: null,
                change_order: null,
              },
              error: null,
            })
          ),
        })),
      }));

      const selectAdvancePaymentSpy = vi.fn((columns: string) => {
        return {
          eq: vi.fn((field: string) => {
            if (field === "vendor_invoice_uuid") {
              return {
                eq: vi.fn(() => ({
                  order: vi.fn(() =>
                    Promise.resolve({
                      data: [],
                      error: null,
                    })
                  ),
                })),
              };
            }
            if (field === "is_active") {
              return {
                order: vi.fn(() =>
                  Promise.resolve({
                    data: [],
                    error: null,
                  })
                ),
              };
            }
            return { eq: vi.fn() };
          }),
        };
      });

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              update: updateSpy,
              select: vi.fn((query?: string) => {
                // If query includes invoice_type and purchase_order_uuid (current invoice query), return current invoice spy
                if (query && query.includes("invoice_type") && query.includes("purchase_order_uuid") && !query.includes("*")) {
                  return selectCurrentSpy();
                }
                // Otherwise return metadata spy (for queries with *, or JOINs, etc.)
                return selectWithMetadataSpy();
              }),
            };
          }
          // For advance_payment_cost_codes table
          return {
            select: selectAdvancePaymentSpy,
          };
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const { default: handler } = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("PUT", { body });
      globals.mockReadBody.mockResolvedValue(body);

      await handler(event);

      expect(updateSpy).toHaveBeenCalled();
      const updateCall = updateSpy.mock.calls[0][0];
      
      // Check that financial_breakdown totals are updated to match amount
      expect(updateCall.financial_breakdown).toBeDefined();
      expect(updateCall.financial_breakdown.totals).toBeDefined();
      expect(updateCall.financial_breakdown.totals.total_invoice_amount).toBe(2000.00);
      expect(updateCall.financial_breakdown.totals.item_total).toBe(2000.00);
    });
  });

  describe("Metadata inclusion in responses", () => {
    it("includes metadata fields in POST response", async () => {
      const globals = stubGlobals();
      const insertSpy = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                uuid: "invoice-123",
                corporation_uuid: "corp-1",
                project_uuid: "proj-1",
                vendor_uuid: "vendor-1",
                purchase_order_uuid: "po-1",
                invoice_type: "AGAINST_PO",
                bill_date: "2024-01-15T00:00:00.000Z",
                amount: 1000,
              },
              error: null,
            })
          ),
        })),
      }));

      const selectWithMetadataSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                uuid: "invoice-123",
                corporation_uuid: "corp-1",
                project_uuid: "proj-1",
                vendor_uuid: "vendor-1",
                purchase_order_uuid: "po-1",
                invoice_type: "AGAINST_PO",
                bill_date: "2024-01-15T00:00:00.000Z",
                amount: 1000,
                project: {
                  uuid: "proj-1",
                  project_name: "Test Project",
                  project_id: "PROJ-001",
                },
                vendor: {
                  uuid: "vendor-1",
                  vendor_name: "Test Vendor",
                },
                purchase_order: {
                  uuid: "po-1",
                  po_number: "PO-001",
                },
              },
              error: null,
            })
          ),
        })),
      }));

      const selectPoItemsSpy = vi.fn(() => ({
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

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              insert: insertSpy,
              select: vi.fn((query?: string) => {
                // If query includes JOINs (has commas), return metadata spy
                if (query && query.includes(',')) {
                  return selectWithMetadataSpy();
                }
                // Otherwise return insert spy
                return insertSpy().select();
              }),
            };
          }
          if (table === "purchase_order_invoice_items_list") {
            return {
              delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
              insert: vi.fn(() => Promise.resolve({ error: null })),
              select: selectPoItemsSpy,
            };
          }
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
            delete: vi.fn(() => Promise.resolve({ error: null })),
            insert: vi.fn(() => Promise.resolve({ error: null })),
          };
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      vi.doMock("@/server/api/vendor-invoices/utils", () => ({
        decorateVendorInvoiceRecord: (record: any) => ({ ...record }),
        buildFinancialBreakdown: () => ({}),
        sanitizeAttachments: (attachments: any) => attachments || [],
      }));

      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: "corp-1",
        project_uuid: "proj-1",
        vendor_uuid: "vendor-1",
        purchase_order_uuid: "po-1",
        invoice_type: "AGAINST_PO",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1000,
      });

      const { default: handler } = await import("@/server/api/vendor-invoices/index");
      const response = await handler(makeEvent("POST"));

      expect(response.data.uuid).toBe("invoice-123");
      expect(insertSpy).toHaveBeenCalledTimes(1);
      // Verify that select with JOINs was called to fetch metadata
      expect(selectWithMetadataSpy).toHaveBeenCalled();
      // Verify metadata fields are included in response
      expect((response.data as any).project_name).toBe("Test Project");
      expect((response.data as any).project_id).toBe("PROJ-001");
      expect((response.data as any).vendor_name).toBe("Test Vendor");
      expect((response.data as any).po_number).toBe("PO-001");
    });

    it("includes metadata fields in PUT response", async () => {
      const globals = stubGlobals();
      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: {
                  uuid: "invoice-123",
                  corporation_uuid: "corp-1",
                  project_uuid: "proj-1",
                  vendor_uuid: "vendor-1",
                  purchase_order_uuid: "po-1",
                  invoice_type: "AGAINST_PO",
                  bill_date: "2024-01-15T00:00:00.000Z",
                  amount: 1500,
                },
                error: null,
              })
            ),
          })),
        })),
      }));

      const existingSelectSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: {
                invoice_type: "AGAINST_PO",
                purchase_order_uuid: "po-1",
              },
              error: null,
            })
          ),
        })),
      }));

      const selectWithMetadataSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                uuid: "invoice-123",
                corporation_uuid: "corp-1",
                project_uuid: "proj-1",
                vendor_uuid: "vendor-1",
                purchase_order_uuid: "po-1",
                invoice_type: "AGAINST_PO",
                bill_date: "2024-01-15T00:00:00.000Z",
                amount: 1500,
                project: {
                  uuid: "proj-1",
                  project_name: "Test Project",
                  project_id: "PROJ-001",
                },
                vendor: {
                  uuid: "vendor-1",
                  vendor_name: "Test Vendor",
                },
                purchase_order: {
                  uuid: "po-1",
                  po_number: "PO-001",
                },
              },
              error: null,
            })
          ),
        })),
      }));

      const selectPoItemsSpy = vi.fn(() => ({
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

      // Default mock for all other tables
      const defaultTableMock = () => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
          in: vi.fn(() => Promise.resolve({ error: null })),
        })),
      });

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              update: updateSpy,
              select: vi.fn((query?: string) => {
                // If query includes invoice_type and purchase_order_uuid (current invoice query), return current invoice spy
                if (query && query.includes("invoice_type") && query.includes("purchase_order_uuid") && !query.includes("*")) {
                  return existingSelectSpy();
                }
                // Otherwise return metadata spy (for queries with *, or JOINs, etc.)
                return selectWithMetadataSpy();
              }),
              delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
            };
          }
          if (table === "purchase_order_invoice_items_list") {
            return {
              delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
              insert: vi.fn(() => Promise.resolve({ error: null })),
              select: selectPoItemsSpy,
            };
          }
          // Return default mock for all other tables
          return defaultTableMock();
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      vi.doMock("@/server/api/vendor-invoices/utils", () => ({
        decorateVendorInvoiceRecord: (record: any) => ({ ...record }),
        buildFinancialBreakdown: () => ({}),
        sanitizeAttachments: (attachments: any) => attachments || [],
      }));

      globals.mockReadBody.mockResolvedValue({
        uuid: "invoice-123",
        amount: 1500,
      });

      const { default: handler } = await import("@/server/api/vendor-invoices/index");
      const response = await handler(makeEvent("PUT"));

      expect(response.data.uuid).toBe("invoice-123");
      expect(updateSpy).toHaveBeenCalledTimes(1);
      // Verify that select with JOINs was called to fetch metadata
      expect(selectWithMetadataSpy).toHaveBeenCalled();
      // Verify metadata fields are included in response
      expect((response.data as any).project_name).toBe("Test Project");
      expect((response.data as any).project_id).toBe("PROJ-001");
      expect((response.data as any).vendor_name).toBe("Test Vendor");
      expect((response.data as any).po_number).toBe("PO-001");
    });

    it("includes change order metadata in POST response when change_order_uuid is set", async () => {
      const globals = stubGlobals();
      const insertSpy = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                uuid: "invoice-456",
                corporation_uuid: "corp-1",
                project_uuid: "proj-2",
                vendor_uuid: "vendor-2",
                change_order_uuid: "co-1",
                invoice_type: "AGAINST_CO",
                bill_date: "2024-01-15T00:00:00.000Z",
                amount: 2000,
              },
              error: null,
            })
          ),
        })),
      }));

      const selectWithMetadataSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                uuid: "invoice-456",
                corporation_uuid: "corp-1",
                project_uuid: "proj-2",
                vendor_uuid: "vendor-2",
                change_order_uuid: "co-1",
                invoice_type: "AGAINST_CO",
                bill_date: "2024-01-15T00:00:00.000Z",
                amount: 2000,
                project: {
                  uuid: "proj-2",
                  project_name: "CO Project",
                  project_id: "PROJ-002",
                },
                vendor: {
                  uuid: "vendor-2",
                  vendor_name: "CO Vendor",
                },
                change_order: {
                  uuid: "co-1",
                  co_number: "CO-001",
                },
              },
              error: null,
            })
          ),
        })),
      }));

      const selectCoItemsSpy = vi.fn(() => ({
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

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              insert: insertSpy,
              select: vi.fn((query?: string) => {
                // If query includes JOINs (has commas), return metadata spy
                if (query && query.includes(',')) {
                  return selectWithMetadataSpy();
                }
                // Otherwise return insert spy
                return insertSpy().select();
              }),
            };
          }
          if (table === "change_order_invoice_items_list") {
            return {
              delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
              insert: vi.fn(() => Promise.resolve({ error: null })),
              select: selectCoItemsSpy,
            };
          }
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
            delete: vi.fn(() => Promise.resolve({ error: null })),
            insert: vi.fn(() => Promise.resolve({ error: null })),
          };
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      vi.doMock("@/server/api/vendor-invoices/utils", () => ({
        decorateVendorInvoiceRecord: (record: any) => ({ ...record }),
        buildFinancialBreakdown: () => ({}),
        sanitizeAttachments: (attachments: any) => attachments || [],
      }));

      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: "corp-1",
        project_uuid: "proj-2",
        vendor_uuid: "vendor-2",
        change_order_uuid: "co-1",
        invoice_type: "AGAINST_CO",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 2000,
      });

      const { default: handler } = await import("@/server/api/vendor-invoices/index");
      const response = await handler(makeEvent("POST"));

      expect(response.data.uuid).toBe("invoice-456");
      expect(insertSpy).toHaveBeenCalledTimes(1);
      // Verify metadata fields are included in response
      expect((response.data as any).project_name).toBe("CO Project");
      expect((response.data as any).project_id).toBe("PROJ-002");
      expect((response.data as any).vendor_name).toBe("CO Vendor");
      expect((response.data as any).co_number).toBe("CO-001");
    });
  });

  describe("PO Invoice Items - Save and Load", () => {
    it("saves po_invoice_items when creating AGAINST_PO invoice", async () => {
      const globals = stubGlobals();
      const invoiceUuid = "invoice-with-po-items";
      
      const poInvoiceItems = [
        {
          order_index: 0,
          po_item_uuid: "po-item-1",
          cost_code_uuid: "cc-1",
          invoice_quantity: 15,
          invoice_unit_price: 120,
          invoice_total: 1800,
        },
        {
          order_index: 1,
          po_item_uuid: "po-item-2",
          cost_code_uuid: "cc-2",
          invoice_quantity: 8,
          invoice_unit_price: 200,
          invoice_total: 1600,
        },
      ];

      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: "corp-1",
        project_uuid: "proj-1",
        vendor_uuid: "vendor-1",
        purchase_order_uuid: "po-1",
        invoice_type: "AGAINST_PO",
        bill_date: "2024-01-15",
        amount: 3400,
        po_invoice_items: poInvoiceItems,
      });

      const invoiceData = {
        uuid: invoiceUuid,
        corporation_uuid: "corp-1",
        project_uuid: "proj-1",
        vendor_uuid: "vendor-1",
        purchase_order_uuid: "po-1",
        invoice_type: "AGAINST_PO",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 3400,
      };

      const insertSpy = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: invoiceData,
              error: null,
            })
          ),
        })),
      }));

      const deleteSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      const insertPoItemsSpy = vi.fn(() =>
        Promise.resolve({ error: null })
      );

      const selectWithMetadataSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                ...invoiceData,
                project: null,
                vendor: null,
                purchase_order: null,
                change_order: null,
              },
              error: null,
            })
          ),
        })),
      }));

      const selectPoItemsSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: poInvoiceItems,
                error: null,
              })
            ),
          })),
        })),
      }));

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              insert: insertSpy,
              select: selectWithMetadataSpy,
            };
          }
          if (table === "purchase_order_invoice_items_list") {
            return {
              delete: deleteSpy,
              insert: insertPoItemsSpy,
              select: selectPoItemsSpy,
            };
          }
          return {};
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("POST", {
        body: {
          corporation_uuid: "corp-1",
          invoice_type: "AGAINST_PO",
          bill_date: "2024-01-15",
          amount: 3400,
          po_invoice_items: poInvoiceItems,
        },
      });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(result.data.invoice_type).toBe("AGAINST_PO");
      
      // Verify po_invoice_items were saved
      expect(supabaseMock.from).toHaveBeenCalledWith("purchase_order_invoice_items_list");
      expect(deleteSpy).toHaveBeenCalled(); // Should delete existing items first
      expect(insertPoItemsSpy).toHaveBeenCalled(); // Should insert new items
      
      // Verify po_invoice_items are returned in response
      expect(result.data.po_invoice_items).toBeDefined();
      expect(Array.isArray(result.data.po_invoice_items)).toBe(true);
      expect(result.data.po_invoice_items.length).toBe(2);
    });

    it("loads po_invoice_items when fetching AGAINST_PO invoice by UUID", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ uuid: "invoice-1" });

      const invoiceData = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_PO",
        purchase_order_uuid: "po-1",
        amount: 3400,
        bill_date: "2024-01-15T00:00:00.000Z",
      };

      const poInvoiceItems = [
        {
          uuid: "invoice-item-1",
          po_item_uuid: "po-item-1",
          invoice_quantity: 15,
          invoice_unit_price: 120,
          invoice_total: 1800,
          order_index: 0,
        },
        {
          uuid: "invoice-item-2",
          po_item_uuid: "po-item-2",
          invoice_quantity: 8,
          invoice_unit_price: 200,
          invoice_total: 1600,
          order_index: 1,
        },
      ];

      const selectInvoiceSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: invoiceData,
              error: null,
            })
          ),
        })),
      }));

      const selectPoItemsSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: poInvoiceItems,
                error: null,
              })
            ),
          })),
        })),
      }));

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              select: selectInvoiceSpy,
            };
          }
          if (table === "purchase_order_invoice_items_list") {
            return {
              select: selectPoItemsSpy,
            };
          }
          return {};
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("GET", { query: { uuid: "invoice-1" } });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(result.data.invoice_type).toBe("AGAINST_PO");
      
      // Verify po_invoice_items were fetched
      expect(supabaseMock.from).toHaveBeenCalledWith("purchase_order_invoice_items_list");
      expect(selectPoItemsSpy).toHaveBeenCalled();
      
      // Verify po_invoice_items are returned in response
      expect(result.data.po_invoice_items).toBeDefined();
      expect(Array.isArray(result.data.po_invoice_items)).toBe(true);
      expect(result.data.po_invoice_items.length).toBe(2);
      expect(result.data.po_invoice_items[0].invoice_quantity).toBe(15);
      expect(result.data.po_invoice_items[0].invoice_unit_price).toBe(120);
      expect(result.data.po_invoice_items[1].invoice_quantity).toBe(8);
      expect(result.data.po_invoice_items[1].invoice_unit_price).toBe(200);
    });

    it("updates po_invoice_items when updating AGAINST_PO invoice", async () => {
      const globals = stubGlobals();
      const invoiceUuid = "invoice-update-po-items";
      
      const updatedPoInvoiceItems = [
        {
          order_index: 0,
          po_item_uuid: "po-item-1",
          invoice_quantity: 20, // Updated from 15
          invoice_unit_price: 130, // Updated from 120
          invoice_total: 2600, // Updated
        },
      ];

      globals.mockReadBody.mockResolvedValue({
        uuid: invoiceUuid,
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_PO",
        purchase_order_uuid: "po-1",
        amount: 2600,
        po_invoice_items: updatedPoInvoiceItems,
      });

      const existingInvoiceData = {
        uuid: invoiceUuid,
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_PO",
        purchase_order_uuid: "po-1",
        amount: 3400,
      };

      const updatedInvoiceData = {
        ...existingInvoiceData,
        amount: 2600,
      };

      const existingSelectSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: {
                invoice_type: "AGAINST_PO",
                purchase_order_uuid: "po-1",
              },
              error: null,
            })
          ),
        })),
      }));

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: updatedInvoiceData,
                error: null,
              })
            ),
          })),
        })),
      }));

      const selectWithMetadataSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                ...updatedInvoiceData,
                project: null,
                vendor: null,
                purchase_order: null,
                change_order: null,
              },
              error: null,
            })
          ),
        })),
      }));

      const deletePoItemsSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      const insertPoItemsSpy = vi.fn(() =>
        Promise.resolve({ error: null })
      );

      const selectPoItemsSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: updatedPoInvoiceItems,
                error: null,
              })
            ),
          })),
        })),
      }));

      // Default mock for all other tables
      const defaultTableMock = () => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
          in: vi.fn(() => Promise.resolve({ error: null })),
        })),
      });

      const supabaseMock = {
        from: vi.fn((table: string) => {
        if (table === "vendor_invoices") {
          return {
            select: vi.fn((query?: string) => {
              // If query includes invoice_type and purchase_order_uuid (current invoice query), return current invoice spy
              if (query && query.includes("invoice_type") && query.includes("purchase_order_uuid") && !query.includes("*")) {
                return existingSelectSpy();
              }
              // Otherwise return metadata spy (for queries with *, or JOINs, etc.)
              return selectWithMetadataSpy();
            }),
            update: updateSpy,
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          };
        }
        if (table === "purchase_order_invoice_items_list") {
            return {
              delete: deletePoItemsSpy,
              insert: insertPoItemsSpy,
              select: selectPoItemsSpy,
            };
          }
          // Return default mock for all other tables
          return defaultTableMock();
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("PUT", {
        body: {
          uuid: invoiceUuid,
          amount: 2600,
          po_invoice_items: updatedPoInvoiceItems,
        },
      });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(result.data.invoice_type).toBe("AGAINST_PO");
      
      // Verify po_invoice_items were updated
      expect(supabaseMock.from).toHaveBeenCalledWith("purchase_order_invoice_items_list");
      expect(deletePoItemsSpy).toHaveBeenCalled(); // Should delete existing items first
      expect(insertPoItemsSpy).toHaveBeenCalled(); // Should insert updated items
      
      // Verify updated po_invoice_items are returned
      expect(result.data.po_invoice_items).toBeDefined();
      expect(Array.isArray(result.data.po_invoice_items)).toBe(true);
      expect(result.data.po_invoice_items.length).toBe(1);
      expect(result.data.po_invoice_items[0].invoice_quantity).toBe(20);
      expect(result.data.po_invoice_items[0].invoice_unit_price).toBe(130);
    });

    it("does not fetch po_invoice_items for non-AGAINST_PO invoice types", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ uuid: "invoice-direct" });

      const invoiceData = {
        uuid: "invoice-direct",
        corporation_uuid: "corp-1",
        invoice_type: "ENTER_DIRECT_INVOICE",
        amount: 1000,
        bill_date: "2024-01-15T00:00:00.000Z",
      };

      const selectInvoiceSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: invoiceData,
              error: null,
            })
          ),
        })),
      }));

      const selectLineItemsSpy = vi.fn(() => ({
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

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              select: selectInvoiceSpy,
            };
          }
          if (table === "direct_vendor_invoice_line_items") {
            return {
              select: selectLineItemsSpy,
            };
          }
          return {};
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("GET", { query: { uuid: "invoice-direct" } });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(result.data.invoice_type).toBe("ENTER_DIRECT_INVOICE");
      
      // Should not fetch from purchase_order_invoice_items_list
      const poItemsCalls = supabaseMock.from.mock.calls.filter(
        (call: any[]) => call[0] === "purchase_order_invoice_items_list"
      );
      expect(poItemsCalls.length).toBe(0);
      
      // po_invoice_items should not be in response for non-AGAINST_PO invoices
      expect(result.data.po_invoice_items).toBeUndefined();
    });
  });

  describe("CO Invoice Items - Save and Load", () => {
    it("saves co_invoice_items when creating AGAINST_CO invoice", async () => {
      const globals = stubGlobals();
      const invoiceUuid = "invoice-with-co-items";
      
      const coInvoiceItems = [
        {
          order_index: 0,
          co_item_uuid: "co-item-1",
          cost_code_uuid: "cc-1",
          invoice_quantity: 10,
          invoice_unit_price: 150,
          invoice_total: 1500,
        },
        {
          order_index: 1,
          co_item_uuid: "co-item-2",
          cost_code_uuid: "cc-2",
          invoice_quantity: 5,
          invoice_unit_price: 300,
          invoice_total: 1500,
        },
      ];

      globals.mockReadBody.mockResolvedValue({
        corporation_uuid: "corp-1",
        project_uuid: "proj-1",
        vendor_uuid: "vendor-1",
        change_order_uuid: "co-1",
        invoice_type: "AGAINST_CO",
        bill_date: "2024-01-15",
        amount: 3000,
        co_invoice_items: coInvoiceItems,
      });

      const invoiceData = {
        uuid: invoiceUuid,
        corporation_uuid: "corp-1",
        project_uuid: "proj-1",
        vendor_uuid: "vendor-1",
        change_order_uuid: "co-1",
        invoice_type: "AGAINST_CO",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 3000,
      };

      const insertSpy = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: invoiceData,
              error: null,
            })
          ),
        })),
      }));

      const deleteSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      const insertCoItemsSpy = vi.fn(() =>
        Promise.resolve({ error: null })
      );

      const selectWithMetadataSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                ...invoiceData,
                project: null,
                vendor: null,
                purchase_order: null,
                change_order: null,
              },
              error: null,
            })
          ),
        })),
      }));

      const selectCoItemsSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: coInvoiceItems,
                error: null,
              })
            ),
          })),
        })),
      }));

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              insert: insertSpy,
              select: selectWithMetadataSpy,
            };
          }
          if (table === "change_order_invoice_items_list") {
            return {
              delete: deleteSpy,
              insert: insertCoItemsSpy,
              select: selectCoItemsSpy,
            };
          }
          return {};
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("POST", {
        body: {
          corporation_uuid: "corp-1",
          invoice_type: "AGAINST_CO",
          bill_date: "2024-01-15",
          amount: 3000,
          co_invoice_items: coInvoiceItems,
        },
      });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(result.data.invoice_type).toBe("AGAINST_CO");
      
      // Verify co_invoice_items were saved
      expect(supabaseMock.from).toHaveBeenCalledWith("change_order_invoice_items_list");
      expect(deleteSpy).toHaveBeenCalled(); // Should delete existing items first
      expect(insertCoItemsSpy).toHaveBeenCalled(); // Should insert new items
      
      // Verify co_invoice_items are returned in response
      expect(result.data.co_invoice_items).toBeDefined();
      expect(Array.isArray(result.data.co_invoice_items)).toBe(true);
      expect(result.data.co_invoice_items.length).toBe(2);
    });

    it("loads co_invoice_items when fetching AGAINST_CO invoice by UUID", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ uuid: "invoice-co-1" });

      const invoiceData = {
        uuid: "invoice-co-1",
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_CO",
        change_order_uuid: "co-1",
        amount: 3000,
        bill_date: "2024-01-15T00:00:00.000Z",
      };

      const coInvoiceItems = [
        {
          uuid: "co-invoice-item-1",
          co_item_uuid: "co-item-1",
          invoice_quantity: 10,
          invoice_unit_price: 150,
          invoice_total: 1500,
          order_index: 0,
        },
        {
          uuid: "co-invoice-item-2",
          co_item_uuid: "co-item-2",
          invoice_quantity: 5,
          invoice_unit_price: 300,
          invoice_total: 1500,
          order_index: 1,
        },
      ];

      const selectInvoiceSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: invoiceData,
              error: null,
            })
          ),
        })),
      }));

      const selectCoItemsSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: coInvoiceItems,
                error: null,
              })
            ),
          })),
        })),
      }));

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              select: selectInvoiceSpy,
            };
          }
          if (table === "change_order_invoice_items_list") {
            return {
              select: selectCoItemsSpy,
            };
          }
          return {};
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("GET", { query: { uuid: "invoice-co-1" } });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(result.data.invoice_type).toBe("AGAINST_CO");
      
      // Verify co_invoice_items were fetched
      expect(supabaseMock.from).toHaveBeenCalledWith("change_order_invoice_items_list");
      expect(selectCoItemsSpy).toHaveBeenCalled();
      
      // Verify co_invoice_items are returned in response
      expect(result.data.co_invoice_items).toBeDefined();
      expect(Array.isArray(result.data.co_invoice_items)).toBe(true);
      expect(result.data.co_invoice_items.length).toBe(2);
      expect(result.data.co_invoice_items[0].invoice_quantity).toBe(10);
      expect(result.data.co_invoice_items[0].invoice_unit_price).toBe(150);
      expect(result.data.co_invoice_items[1].invoice_quantity).toBe(5);
      expect(result.data.co_invoice_items[1].invoice_unit_price).toBe(300);
    });

    it("updates co_invoice_items when updating AGAINST_CO invoice", async () => {
      const globals = stubGlobals();
      const invoiceUuid = "invoice-update-co-items";
      
      const updatedCoInvoiceItems = [
        {
          order_index: 0,
          co_item_uuid: "co-item-1",
          invoice_quantity: 12, // Updated from 10
          invoice_unit_price: 160, // Updated from 150
          invoice_total: 1920, // Updated
        },
      ];

      globals.mockReadBody.mockResolvedValue({
        uuid: invoiceUuid,
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_CO",
        change_order_uuid: "co-1",
        amount: 1920,
        co_invoice_items: updatedCoInvoiceItems,
      });

      const existingInvoiceData = {
        uuid: invoiceUuid,
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_CO",
        change_order_uuid: "co-1",
        amount: 3000,
      };

      const updatedInvoiceData = {
        ...existingInvoiceData,
        amount: 1920,
      };

      const existingSelectSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: {
                invoice_type: "AGAINST_CO",
                purchase_order_uuid: null,
              },
              error: null,
            })
          ),
        })),
      }));

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: updatedInvoiceData,
                error: null,
              })
            ),
          })),
        })),
      }));

      const selectWithMetadataSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                ...updatedInvoiceData,
                project: null,
                vendor: null,
                purchase_order: null,
                change_order: null,
              },
              error: null,
            })
          ),
        })),
      }));

      const deleteCoItemsSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      const insertCoItemsSpy = vi.fn(() =>
        Promise.resolve({ error: null })
      );

      const selectCoItemsSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: updatedCoInvoiceItems,
                error: null,
              })
            ),
          })),
        })),
      }));

      // Default mock for all other tables
      const defaultTableMock = () => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
          in: vi.fn(() => Promise.resolve({ error: null })),
        })),
      });

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              select: vi.fn((query?: string) => {
                // If query includes invoice_type and purchase_order_uuid (current invoice query), return current invoice spy
                if (query && query.includes("invoice_type") && query.includes("purchase_order_uuid") && !query.includes("*")) {
                  return existingSelectSpy();
                }
                // Otherwise return metadata spy (for queries with *, or JOINs, etc.)
                return selectWithMetadataSpy();
              }),
              update: updateSpy,
              delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
            };
          }
          if (table === "change_order_invoice_items_list") {
            return {
              delete: deleteCoItemsSpy,
              insert: insertCoItemsSpy,
              select: selectCoItemsSpy,
            };
          }
          // Return default mock for all other tables
          return defaultTableMock();
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("PUT", {
        body: {
          uuid: invoiceUuid,
          amount: 1920,
          co_invoice_items: updatedCoInvoiceItems,
        },
      });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(result.data.invoice_type).toBe("AGAINST_CO");
      
      // Verify co_invoice_items were updated
      expect(supabaseMock.from).toHaveBeenCalledWith("change_order_invoice_items_list");
      expect(deleteCoItemsSpy).toHaveBeenCalled(); // Should delete existing items first
      expect(insertCoItemsSpy).toHaveBeenCalled(); // Should insert updated items
      
      // Verify updated co_invoice_items are returned
      expect(result.data.co_invoice_items).toBeDefined();
      expect(Array.isArray(result.data.co_invoice_items)).toBe(true);
      expect(result.data.co_invoice_items.length).toBe(1);
      expect(result.data.co_invoice_items[0].invoice_quantity).toBe(12);
      expect(result.data.co_invoice_items[0].invoice_unit_price).toBe(160);
    });

    it("does not fetch co_invoice_items for non-AGAINST_CO invoice types", async () => {
      const globals = stubGlobals();
      globals.mockGetQuery.mockReturnValue({ uuid: "invoice-direct" });

      const invoiceData = {
        uuid: "invoice-direct",
        corporation_uuid: "corp-1",
        invoice_type: "ENTER_DIRECT_INVOICE",
        amount: 1000,
        bill_date: "2024-01-15T00:00:00.000Z",
      };

      const selectInvoiceSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: invoiceData,
              error: null,
            })
          ),
        })),
      }));

      const selectLineItemsSpy = vi.fn(() => ({
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

      const supabaseMock = {
        from: vi.fn((table: string) => {
          if (table === "vendor_invoices") {
            return {
              select: selectInvoiceSpy,
            };
          }
          if (table === "direct_vendor_invoice_line_items") {
            return {
              select: selectLineItemsSpy,
            };
          }
          return {};
        }),
      };

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/vendor-invoices/index");
      const event = makeEvent("GET", { query: { uuid: "invoice-direct" } });

      const result = await handler.default(event);

      expect(result.data).toBeDefined();
      expect(result.data.invoice_type).toBe("ENTER_DIRECT_INVOICE");
      
      // Should not fetch from change_order_invoice_items_list
      const coItemsCalls = supabaseMock.from.mock.calls.filter(
        (call: any[]) => call[0] === "change_order_invoice_items_list"
      );
      expect(coItemsCalls.length).toBe(0);
      
      // co_invoice_items should not be in response for non-AGAINST_CO invoices
      expect(result.data.co_invoice_items).toBeUndefined();
    });
  });

  describe("Adjusted Advance Payment Cost Codes", () => {
    describe("POST - Create invoice with adjusted advance payments", () => {
      it("creates AGAINST_PO invoice and persists adjusted advance payment cost codes", async () => {
        const globals = stubGlobals();
        const invoiceData = {
          uuid: "invoice-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          purchase_order_uuid: "po-1",
          invoice_type: "AGAINST_PO",
          bill_date: "2024-01-15T00:00:00.000Z",
          amount: 1000,
          adjusted_advance_payment_uuid: "ap-1",
        };

        globals.mockReadBody.mockResolvedValue({
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          purchase_order_uuid: "po-1",
          invoice_type: "AGAINST_PO",
          bill_date: "2024-01-15",
          amount: 1000,
          adjusted_advance_payment_uuid: "ap-1",
          adjusted_advance_payment_amounts: {
            "ap-1": {
              "cc-1": 500,
              "cc-2": 300,
            },
          },
          po_invoice_items: [],
        });

        const insertInvoiceSpy = vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: invoiceData,
                error: null,
              })
            ),
          })),
        }));

        const insertAdjustedCostCodesSpy = vi.fn(() =>
          Promise.resolve({ error: null })
        );

        const selectAdvancePaymentCostCodesSpy = vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: [
                  { uuid: "apcc-1", cost_code_uuid: "cc-1", cost_code_number: "01010", cost_code_name: "General" },
                  { uuid: "apcc-2", cost_code_uuid: "cc-2", cost_code_number: "02020", cost_code_name: "Site Work" },
                ],
                error: null,
              })
            ),
          })),
        }));

        // Comprehensive mock that returns proper chains for all methods
        const createTableMock = (customData: any = {}) => ({
          select: vi.fn((columns?: string) => {
            // Handle JOINs in select (e.g., "*,project:projects!project_uuid(uuid,project_name)")
            const eqMock: any = vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: customData.single || invoiceData, error: null })),
              maybeSingle: vi.fn(() => Promise.resolve({ data: customData.maybeSingle || invoiceData, error: null })),
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: customData.order || [], error: null })),
                single: vi.fn(() => Promise.resolve({ data: customData.single || invoiceData, error: null })),
              })),
              order: vi.fn(() => ({
                range: vi.fn(() => Promise.resolve({ data: customData.range || [], error: null })),
              })),
            }));
            return { eq: eqMock };
          }),
          insert: vi.fn((data?: any) => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: customData.insert || invoiceData, error: null })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: customData.update || invoiceData, error: null })),
              })),
            })),
            in: vi.fn(() => Promise.resolve({ error: null })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        });

        const supabaseMock = {
          from: vi.fn((table: string) => {
            if (table === "vendor_invoices") {
              const mock = createTableMock({ insert: invoiceData, single: invoiceData });
              mock.insert = insertInvoiceSpy;
              return mock;
            }
            if (table === "advance_payment_cost_codes") {
              return { select: selectAdvancePaymentCostCodesSpy };
            }
            if (table === "adjusted_advance_payment_cost_codes") {
              return {
                insert: insertAdjustedCostCodesSpy,
                delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
              };
            }
            return createTableMock();
          }),
        };

        vi.doMock("@/utils/supabaseServer", () => ({
          supabaseServer: supabaseMock,
        }));

        const handler = await import("@/server/api/vendor-invoices/index");
        const event = makeEvent("POST");

        const result = await handler.default(event);

        expect(result.data).toBeDefined();
        expect(result.data.uuid).toBe("invoice-1");
        
        // Verify adjusted_advance_payment_cost_codes table was called
        expect(supabaseMock.from).toHaveBeenCalledWith("adjusted_advance_payment_cost_codes");
        expect(insertAdjustedCostCodesSpy).toHaveBeenCalled();
      });

      it("creates AGAINST_CO invoice and persists adjusted advance payment cost codes", async () => {
        const globals = stubGlobals();
        const invoiceData = {
          uuid: "invoice-2",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          change_order_uuid: "co-1",
          invoice_type: "AGAINST_CO",
          bill_date: "2024-01-15T00:00:00.000Z",
          amount: 800,
          adjusted_advance_payment_uuid: "ap-2",
        };

        globals.mockReadBody.mockResolvedValue({
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          change_order_uuid: "co-1",
          invoice_type: "AGAINST_CO",
          bill_date: "2024-01-15",
          amount: 800,
          adjusted_advance_payment_uuid: "ap-2",
          adjusted_advance_payment_amounts: {
            "ap-2": {
              "cc-3": 400,
            },
          },
          co_invoice_items: [],
        });

        const insertInvoiceSpy = vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: invoiceData,
                error: null,
              })
            ),
          })),
        }));

        const insertAdjustedCostCodesSpy = vi.fn(() =>
          Promise.resolve({ error: null })
        );

        const selectAdvancePaymentCostCodesSpy = vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: [
                  { uuid: "apcc-3", cost_code_uuid: "cc-3", cost_code_number: "03030", cost_code_name: "Concrete" },
                ],
                error: null,
              })
            ),
          })),
        }));

        // Comprehensive mock that returns proper chains for all methods
        const createTableMock = (customData: any = {}) => ({
          select: vi.fn((columns?: string) => {
            const eqMock: any = vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: customData.single || invoiceData, error: null })),
              maybeSingle: vi.fn(() => Promise.resolve({ data: customData.maybeSingle || invoiceData, error: null })),
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: customData.order || [], error: null })),
                single: vi.fn(() => Promise.resolve({ data: customData.single || invoiceData, error: null })),
              })),
              order: vi.fn(() => ({
                range: vi.fn(() => Promise.resolve({ data: customData.range || [], error: null })),
              })),
            }));
            return { eq: eqMock };
          }),
          insert: vi.fn((data?: any) => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: customData.insert || invoiceData, error: null })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: customData.update || invoiceData, error: null })),
              })),
            })),
            in: vi.fn(() => Promise.resolve({ error: null })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        });

        const supabaseMock = {
          from: vi.fn((table: string) => {
            if (table === "vendor_invoices") {
              const mock = createTableMock({ insert: invoiceData, single: invoiceData });
              mock.insert = insertInvoiceSpy;
              return mock;
            }
            if (table === "advance_payment_cost_codes") {
              return { select: selectAdvancePaymentCostCodesSpy };
            }
            if (table === "adjusted_advance_payment_cost_codes") {
              return {
                insert: insertAdjustedCostCodesSpy,
                delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
              };
            }
            return createTableMock();
          }),
        };

        vi.doMock("@/utils/supabaseServer", () => ({
          supabaseServer: supabaseMock,
        }));

        const handler = await import("@/server/api/vendor-invoices/index");
        const event = makeEvent("POST");

        const result = await handler.default(event);

        expect(result.data).toBeDefined();
        expect(result.data.uuid).toBe("invoice-2");
        
        // Verify adjusted_advance_payment_cost_codes table was called for CO invoice
        expect(supabaseMock.from).toHaveBeenCalledWith("adjusted_advance_payment_cost_codes");
        expect(insertAdjustedCostCodesSpy).toHaveBeenCalled();
      });
    });

    describe("DELETE - Deactivate adjusted advance payment cost codes", () => {
      it("deactivates adjusted advance payment cost codes when vendor invoice is deleted", async () => {
        const globals = stubGlobals();
        globals.mockGetQuery.mockReturnValue({ uuid: "invoice-1" });

        const invoiceData = {
          uuid: "invoice-1",
          corporation_uuid: "corp-1",
          invoice_type: "AGAINST_PO",
          purchase_order_uuid: "po-1",
          amount: 1000,
          is_active: false,
        };

        const deactivateAdjustedCostCodesSpy = vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        }));

        const updateInvoiceSpy = vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: invoiceData, error: null })),
            })),
          })),
        }));

        const supabaseMock = {
          from: vi.fn((table: string) => {
            if (table === "vendor_invoices") {
              return {
                update: updateInvoiceSpy,
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(() => Promise.resolve({ data: invoiceData, error: null })),
                  })),
                })),
              };
            }
            if (table === "adjusted_advance_payment_cost_codes") {
              return {
                update: deactivateAdjustedCostCodesSpy,
              };
            }
            return {
              update: vi.fn(() => ({
                in: vi.fn(() => Promise.resolve({ error: null })),
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
            };
          }),
        };

        vi.doMock("@/utils/supabaseServer", () => ({
          supabaseServer: supabaseMock,
        }));

        const handler = await import("@/server/api/vendor-invoices/index");
        const event = makeEvent("DELETE", { query: { uuid: "invoice-1" } });

        const result = await handler.default(event);

        expect(result.data).toBeDefined();
        expect(result.data.is_active).toBe(false);
        
        // Verify adjusted_advance_payment_cost_codes were deactivated
        expect(supabaseMock.from).toHaveBeenCalledWith("adjusted_advance_payment_cost_codes");
        expect(deactivateAdjustedCostCodesSpy).toHaveBeenCalled();
      });
    });

    describe("GET - Fetch invoice with adjusted advance payment amounts", () => {
      it("fetches AGAINST_PO invoice with adjusted_advance_payment_amounts", async () => {
        const globals = stubGlobals();
        globals.mockGetQuery.mockReturnValue({ uuid: "invoice-1" });

        const invoiceData = {
          uuid: "invoice-1",
          corporation_uuid: "corp-1",
          invoice_type: "AGAINST_PO",
          purchase_order_uuid: "po-1",
          adjusted_advance_payment_uuid: "ap-1",
          amount: 1000,
          bill_date: "2024-01-15T00:00:00.000Z",
        };

        const adjustedCostCodesData = [
          {
            uuid: "acc-1",
            vendor_invoice_uuid: "invoice-1",
            advance_payment_uuid: "ap-1",
            cost_code_uuid: "cc-1",
            adjusted_amount: "500",
            is_active: true,
          },
          {
            uuid: "acc-2",
            vendor_invoice_uuid: "invoice-1",
            advance_payment_uuid: "ap-1",
            cost_code_uuid: "cc-2",
            adjusted_amount: "300",
            is_active: true,
          },
        ];

        const poInvoiceItemsData: any[] = [];

        const selectInvoiceSpy = vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: invoiceData,
                error: null,
              })
            ),
          })),
        }));

        const selectAdjustedCostCodesSpy = vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: adjustedCostCodesData,
                error: null,
              })
            ),
          })),
        }));

        const selectPoInvoiceItemsSpy = vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: poInvoiceItemsData,
                  error: null,
                })
              ),
            })),
          })),
        }));

        const supabaseMock = {
          from: vi.fn((table: string) => {
            if (table === "vendor_invoices") {
              return {
                select: selectInvoiceSpy,
              };
            }
            if (table === "adjusted_advance_payment_cost_codes") {
              return {
                select: selectAdjustedCostCodesSpy,
              };
            }
            if (table === "purchase_order_invoice_items_list") {
              return {
                select: selectPoInvoiceItemsSpy,
              };
            }
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
                  })),
                })),
              })),
            };
          }),
        };

        vi.doMock("@/utils/supabaseServer", () => ({
          supabaseServer: supabaseMock,
        }));

        const handler = await import("@/server/api/vendor-invoices/[uuid]");
        const event = {
          node: { req: { method: "GET" } },
        };
        vi.stubGlobal("getRouterParam", vi.fn(() => "invoice-1"));

        const result = await handler.default(event as any);

        expect(result.data).toBeDefined();
        expect(result.data.adjusted_advance_payment_amounts).toBeDefined();
        expect(result.data.adjusted_advance_payment_amounts["ap-1"]).toBeDefined();
        expect(result.data.adjusted_advance_payment_amounts["ap-1"]["cc-1"]).toBe(500);
        expect(result.data.adjusted_advance_payment_amounts["ap-1"]["cc-2"]).toBe(300);
      });

      it("fetches AGAINST_CO invoice with adjusted_advance_payment_amounts", async () => {
        const globals = stubGlobals();
        globals.mockGetQuery.mockReturnValue({ uuid: "invoice-2" });

        const invoiceData = {
          uuid: "invoice-2",
          corporation_uuid: "corp-1",
          invoice_type: "AGAINST_CO",
          change_order_uuid: "co-1",
          adjusted_advance_payment_uuid: "ap-2",
          amount: 800,
          bill_date: "2024-01-15T00:00:00.000Z",
        };

        const adjustedCostCodesData = [
          {
            uuid: "acc-3",
            vendor_invoice_uuid: "invoice-2",
            advance_payment_uuid: "ap-2",
            cost_code_uuid: "cc-3",
            adjusted_amount: "400",
            is_active: true,
          },
        ];

        const coInvoiceItemsData: any[] = [];

        const selectInvoiceSpy = vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: invoiceData,
                error: null,
              })
            ),
          })),
        }));

        const selectAdjustedCostCodesSpy = vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: adjustedCostCodesData,
                error: null,
              })
            ),
          })),
        }));

        const selectCoInvoiceItemsSpy = vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: coInvoiceItemsData,
                  error: null,
                })
              ),
            })),
          })),
        }));

        const supabaseMock = {
          from: vi.fn((table: string) => {
            if (table === "vendor_invoices") {
              return {
                select: selectInvoiceSpy,
              };
            }
            if (table === "adjusted_advance_payment_cost_codes") {
              return {
                select: selectAdjustedCostCodesSpy,
              };
            }
            if (table === "change_order_invoice_items_list") {
              return {
                select: selectCoInvoiceItemsSpy,
              };
            }
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
                  })),
                })),
              })),
            };
          }),
        };

        vi.doMock("@/utils/supabaseServer", () => ({
          supabaseServer: supabaseMock,
        }));

        const handler = await import("@/server/api/vendor-invoices/[uuid]");
        const event = {
          node: { req: { method: "GET" } },
        };
        vi.stubGlobal("getRouterParam", vi.fn(() => "invoice-2"));

        const result = await handler.default(event as any);

        expect(result.data).toBeDefined();
        expect(result.data.adjusted_advance_payment_amounts).toBeDefined();
        expect(result.data.adjusted_advance_payment_amounts["ap-2"]).toBeDefined();
        expect(result.data.adjusted_advance_payment_amounts["ap-2"]["cc-3"]).toBe(400);
      });

      it("returns empty adjusted_advance_payment_amounts for invoices without adjustments", async () => {
        const globals = stubGlobals();
        globals.mockGetQuery.mockReturnValue({ uuid: "invoice-3" });

        const invoiceData = {
          uuid: "invoice-3",
          corporation_uuid: "corp-1",
          invoice_type: "AGAINST_PO",
          purchase_order_uuid: "po-1",
          adjusted_advance_payment_uuid: null, // No advance payment adjusted
          amount: 500,
          bill_date: "2024-01-15T00:00:00.000Z",
        };

        const selectInvoiceSpy = vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: invoiceData,
                error: null,
              })
            ),
          })),
        }));

        const selectPoInvoiceItemsSpy = vi.fn(() => ({
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

        const selectAdjustedSpy = vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: [],
                error: null,
              })
            ),
          })),
        }));

        const supabaseMock = {
          from: vi.fn((table: string) => {
            if (table === "vendor_invoices") {
              return {
                select: selectInvoiceSpy,
              };
            }
            if (table === "purchase_order_invoice_items_list") {
              return {
                select: selectPoInvoiceItemsSpy,
              };
            }
            if (table === "adjusted_advance_payment_cost_codes") {
              return {
                select: selectAdjustedSpy,
              };
            }
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
                  })),
                })),
              })),
            };
          }),
        };

        vi.doMock("@/utils/supabaseServer", () => ({
          supabaseServer: supabaseMock,
        }));

        const handler = await import("@/server/api/vendor-invoices/[uuid]");
        const event = {
          node: { req: { method: "GET" } },
        };
        vi.stubGlobal("getRouterParam", vi.fn(() => "invoice-3"));

        const result = await handler.default(event as any);

        expect(result.data).toBeDefined();
        expect(result.data.adjusted_advance_payment_amounts).toBeDefined();
        expect(Object.keys(result.data.adjusted_advance_payment_amounts).length).toBe(0);
      });
    });

    describe("PUT - Update invoice with adjusted advance payments", () => {
      it("updates AGAINST_PO invoice and updates adjusted advance payment cost codes", async () => {
        const globals = stubGlobals();
        globals.mockGetQuery.mockReturnValue({ uuid: "invoice-1" });
        
        const invoiceData = {
          uuid: "invoice-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          purchase_order_uuid: "po-1",
          invoice_type: "AGAINST_PO",
          bill_date: "2024-01-15T00:00:00.000Z",
          amount: 1200,
          adjusted_advance_payment_uuid: "ap-1",
        };

        globals.mockReadBody.mockResolvedValue({
          uuid: "invoice-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          purchase_order_uuid: "po-1",
          invoice_type: "AGAINST_PO",
          bill_date: "2024-01-15",
          amount: 1200,
          adjusted_advance_payment_uuid: "ap-1",
          adjusted_advance_payment_amounts: {
            "ap-1": {
              "cc-1": 600, // Updated amount
              "cc-2": 400, // Updated amount
            },
          },
          po_invoice_items: [],
        });

        const deleteAdjustedCostCodesSpy = vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        }));

        const insertAdjustedCostCodesSpy = vi.fn(() =>
          Promise.resolve({ error: null })
        );

        const selectAdvancePaymentCostCodesSpy = vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: [
                  { uuid: "apcc-1", cost_code_uuid: "cc-1", cost_code_number: "01010", cost_code_name: "General" },
                  { uuid: "apcc-2", cost_code_uuid: "cc-2", cost_code_number: "02020", cost_code_name: "Site Work" },
                ],
                error: null,
              })
            ),
          })),
        }));

        const updateInvoiceSpy = vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: invoiceData, error: null })),
            })),
          })),
        }));

        const selectPoInvoiceItemsSpy = vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        }));

        const defaultTableMock = () => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          })),
          insert: vi.fn(() => Promise.resolve({ error: null })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
            in: vi.fn(() => Promise.resolve({ error: null })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        });

        const supabaseMock = {
          from: vi.fn((table: string) => {
            if (table === "vendor_invoices") {
              return {
                update: updateInvoiceSpy,
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(() => Promise.resolve({ data: invoiceData, error: null })),
                    single: vi.fn(() => Promise.resolve({ data: invoiceData, error: null })),
                  })),
                })),
              };
            }
            if (table === "advance_payment_cost_codes") {
              return {
                select: selectAdvancePaymentCostCodesSpy,
              };
            }
            if (table === "adjusted_advance_payment_cost_codes") {
              return {
                delete: deleteAdjustedCostCodesSpy,
                insert: insertAdjustedCostCodesSpy,
              };
            }
            if (table === "purchase_order_invoice_items_list") {
              return {
                select: selectPoInvoiceItemsSpy,
                delete: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ error: null })),
                })),
                insert: vi.fn(() => Promise.resolve({ error: null })),
              };
            }
            return defaultTableMock();
          }),
        };

        vi.doMock("@/utils/supabaseServer", () => ({
          supabaseServer: supabaseMock,
        }));

        const handler = await import("@/server/api/vendor-invoices/index");
        const event = makeEvent("PUT", { query: { uuid: "invoice-1" } });

        const result = await handler.default(event);

        expect(result.data).toBeDefined();
        expect(result.data.uuid).toBe("invoice-1");
        
        // Verify adjusted cost codes were deleted and re-inserted
        expect(supabaseMock.from).toHaveBeenCalledWith("adjusted_advance_payment_cost_codes");
        expect(deleteAdjustedCostCodesSpy).toHaveBeenCalled();
        expect(insertAdjustedCostCodesSpy).toHaveBeenCalled();
      });

      it("clears adjusted advance payment cost codes when adjusted_advance_payment_uuid is removed", async () => {
        const globals = stubGlobals();
        globals.mockGetQuery.mockReturnValue({ uuid: "invoice-1" });
        
        const invoiceData = {
          uuid: "invoice-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          purchase_order_uuid: "po-1",
          invoice_type: "AGAINST_PO",
          bill_date: "2024-01-15T00:00:00.000Z",
          amount: 1200,
          adjusted_advance_payment_uuid: null, // Removed
        };

        globals.mockReadBody.mockResolvedValue({
          uuid: "invoice-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          purchase_order_uuid: "po-1",
          invoice_type: "AGAINST_PO",
          bill_date: "2024-01-15",
          amount: 1200,
          adjusted_advance_payment_uuid: null, // No longer adjusting an advance payment
          adjusted_advance_payment_amounts: {},
          po_invoice_items: [],
        });

        const deleteAdjustedCostCodesSpy = vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        }));

        const updateInvoiceSpy = vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: invoiceData, error: null })),
            })),
          })),
        }));

        const selectPoInvoiceItemsSpy = vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        }));

        const defaultTableMock = () => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          })),
          insert: vi.fn(() => Promise.resolve({ error: null })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
            in: vi.fn(() => Promise.resolve({ error: null })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        });

        const supabaseMock = {
          from: vi.fn((table: string) => {
            if (table === "vendor_invoices") {
              return {
                update: updateInvoiceSpy,
                select: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(() => Promise.resolve({ data: invoiceData, error: null })),
                    single: vi.fn(() => Promise.resolve({ data: invoiceData, error: null })),
                  })),
                })),
              };
            }
            if (table === "adjusted_advance_payment_cost_codes") {
              return {
                delete: deleteAdjustedCostCodesSpy,
              };
            }
            if (table === "purchase_order_invoice_items_list") {
              return {
                select: selectPoInvoiceItemsSpy,
                delete: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ error: null })),
                })),
                insert: vi.fn(() => Promise.resolve({ error: null })),
              };
            }
            return defaultTableMock();
          }),
        };

        vi.doMock("@/utils/supabaseServer", () => ({
          supabaseServer: supabaseMock,
        }));

        const handler = await import("@/server/api/vendor-invoices/index");
        const event = makeEvent("PUT", { query: { uuid: "invoice-1" } });

        const result = await handler.default(event);

        expect(result.data).toBeDefined();
        
        // Verify adjusted cost codes were deleted when adjusted_advance_payment_uuid is removed
        expect(supabaseMock.from).toHaveBeenCalledWith("adjusted_advance_payment_cost_codes");
        expect(deleteAdjustedCostCodesSpy).toHaveBeenCalled();
      });
    });
  });
});

