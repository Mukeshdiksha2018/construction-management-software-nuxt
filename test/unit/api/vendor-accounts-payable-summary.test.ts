import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Create hoisted mock that can be updated per test
const supabaseMock = vi.hoisted(() => {
  return {
    from: vi.fn(),
  }
})

vi.mock('@/utils/supabaseServer', () => ({
  supabaseServer: supabaseMock,
}))

describe("server/api/reports/vendor-accounts-payable-summary", () => {
  const stubGlobals = () => {
    const mockDefineEventHandler = vi.fn((handler) => handler)
    const mockGetMethod = vi.fn(() => "GET")
    const mockGetQuery = vi.fn(() => ({}))
    const mockCreateError = vi.fn((options: any) => {
      const error = new Error(options.statusMessage)
      ;(error as any).statusCode = options.statusCode
      return error
    })

    vi.stubGlobal("defineEventHandler", mockDefineEventHandler)
    vi.stubGlobal("getMethod", mockGetMethod)
    vi.stubGlobal("getQuery", mockGetQuery)
    vi.stubGlobal("createError", mockCreateError)

    return {
      mockDefineEventHandler,
      mockGetMethod,
      mockGetQuery,
      mockCreateError,
    }
  }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("should require all required parameters", async () => {
    const globals = stubGlobals()
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "",
      project_uuid: "",
      start_date: "",
      end_date: "",
    })

    const handler = await import("@/server/api/reports/vendor-accounts-payable-summary")
    const event = {} as any

    await expect(handler.default(event)).rejects.toThrow()
    expect(globals.mockCreateError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        statusMessage: expect.stringContaining("required"),
      })
    )
  })

  it("should only allow GET method", async () => {
    const globals = stubGlobals()
    globals.mockGetMethod.mockReturnValue("POST")
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      start_date: "2024-01-01",
      end_date: "2024-12-31",
    })

    const handler = await import("@/server/api/reports/vendor-accounts-payable-summary")
    const event = {} as any

    await expect(handler.default(event)).rejects.toThrow()
    expect(globals.mockCreateError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 405,
        statusMessage: "Method not allowed",
      })
    )
  })

  it("should return empty vendors array when no vendors found", async () => {
    const globals = stubGlobals()
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      start_date: "2024-01-01T00:00:00.000Z",
      end_date: "2024-12-31T23:59:59.999Z",
    })

    const project = {
      uuid: "proj-1",
      project_name: "Test Project",
      project_id: "P-001",
    }

    let callCount = 0
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "projects") {
        callCount++
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({ data: project, error: null })
                ),
              })),
            })),
          })),
        }
      }
      if (table === "vendors") {
        callCount++
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      }
    }) as any

    const handler = await import("@/server/api/reports/vendor-accounts-payable-summary")
    const event = {} as any

    const result = await handler.default(event)

    expect(result).toBeDefined()
    expect(result.project).toEqual({
      projectName: "Test Project",
      projectId: "P-001",
    })
    expect(result.vendors).toEqual([])
  })

  it("should calculate PO amounts correctly from financial_breakdown", async () => {
    const globals = stubGlobals()
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      start_date: "2024-01-01T00:00:00.000Z",
      end_date: "2024-12-31T23:59:59.999Z",
    })

    const project = {
      uuid: "proj-1",
      project_name: "Test Project",
      project_id: "P-001",
    }

    const vendors = [
      { uuid: "vendor-1", vendor_name: "Vendor One" },
    ]

    const purchaseOrders = [
      {
        uuid: "po-1",
        vendor_uuid: "vendor-1",
        financial_breakdown: JSON.stringify({
          totals: {
            total_po_amount: 25000,
          },
        }),
      },
      {
        uuid: "po-2",
        vendor_uuid: "vendor-1",
        financial_breakdown: {
          totals: {
            total_po_amount: 17500,
          },
        },
      },
    ]

    const changeOrders: any[] = []
    const invoices: any[] = []

    let tableCallOrder = 0
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "projects") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({ data: project, error: null })
                ),
              })),
            })),
          })),
        }
      }
      if (table === "vendors") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: vendors, error: null })),
            })),
          })),
        }
      }
      if (table === "purchase_order_forms") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() =>
                    Promise.resolve({ data: purchaseOrders, error: null })
                  ),
                })),
              })),
            })),
          })),
        }
      }
      if (table === "change_orders") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() =>
                    Promise.resolve({ data: changeOrders, error: null })
                  ),
                })),
              })),
            })),
          })),
        }
      }
      if (table === "vendor_invoices") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    lte: vi.fn(() =>
                      Promise.resolve({ data: invoices, error: null })
                    ),
                  })),
                })),
              })),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      }
    }) as any

    const handler = await import("@/server/api/reports/vendor-accounts-payable-summary")
    const event = {} as any

    const result = await handler.default(event)

    expect(result).toBeDefined()
    expect(result.vendors.length).toBe(1)
    expect(result.vendors[0].vendorName).toBe("Vendor One")
    expect(result.vendors[0].poAmount).toBe(42500) // 25000 + 17500
    expect(result.totals.poAmount).toBe(42500)
  })

  it("should calculate Change Order amounts correctly", async () => {
    const globals = stubGlobals()
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      start_date: "2024-01-01T00:00:00.000Z",
      end_date: "2024-12-31T23:59:59.999Z",
    })

    const project = {
      uuid: "proj-1",
      project_name: "Test Project",
      project_id: "P-001",
    }

    const vendors = [
      { uuid: "vendor-1", vendor_name: "Vendor One" },
    ]

    const purchaseOrders: any[] = []

    const changeOrders = [
      {
        uuid: "co-1",
        vendor_uuid: "vendor-1",
        financial_breakdown: JSON.stringify({
          totals: {
            total_co_amount: 2151.56,
          },
        }),
      },
      {
        uuid: "co-2",
        vendor_uuid: "vendor-1",
        financial_breakdown: {
          totals: {
            total_co_amount: 1578.23,
          },
        },
      },
    ]

    const invoices: any[] = []

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "projects") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({ data: project, error: null })
                ),
              })),
            })),
          })),
        }
      }
      if (table === "vendors") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: vendors, error: null })),
            })),
          })),
        }
      }
      if (table === "purchase_order_forms") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() =>
                    Promise.resolve({ data: purchaseOrders, error: null })
                  ),
                })),
              })),
            })),
          })),
        }
      }
      if (table === "change_orders") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() =>
                    Promise.resolve({ data: changeOrders, error: null })
                  ),
                })),
              })),
            })),
          })),
        }
      }
      if (table === "vendor_invoices") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    lte: vi.fn(() =>
                      Promise.resolve({ data: invoices, error: null })
                    ),
                  })),
                })),
              })),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      }
    }) as any

    const handler = await import("@/server/api/reports/vendor-accounts-payable-summary")
    const event = {} as any

    const result = await handler.default(event)

    expect(result.vendors[0].changeOrderAmount).toBeCloseTo(3729.79, 2) // 2151.56 + 1578.23
    expect(result.totals.changeOrderAmount).toBeCloseTo(3729.79, 2)
  })

  it("should calculate invoice values correctly for paid invoices only", async () => {
    const globals = stubGlobals()
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      start_date: "2024-01-01T00:00:00.000Z",
      end_date: "2024-12-31T23:59:59.999Z",
    })

    const project = {
      uuid: "proj-1",
      project_name: "Test Project",
      project_id: "P-001",
    }

    const vendors = [
      { uuid: "vendor-1", vendor_name: "Vendor One" },
    ]

    const purchaseOrders: any[] = []
    const changeOrders: any[] = []

    const invoices = [
      {
        uuid: "inv-1",
        vendor_uuid: "vendor-1",
        invoice_type: "AGAINST_PO",
        status: "Paid",
        amount: 10000,
        holdback: null,
        financial_breakdown: JSON.stringify({
          totals: {
            total_invoice_amount: 10000,
            tax_total: 1000,
          },
        }),
      },
      {
        uuid: "inv-2",
        vendor_uuid: "vendor-1",
        invoice_type: "AGAINST_ADVANCE_PAYMENT",
        status: "Paid",
        amount: 5000,
        holdback: null,
        financial_breakdown: JSON.stringify({
          totals: {
            total_invoice_amount: 5000,
            tax_total: 500,
          },
        }),
      },
      {
        uuid: "inv-3",
        vendor_uuid: "vendor-1",
        invoice_type: "AGAINST_PO",
        status: "Draft", // Should not be included
        amount: 3000,
        holdback: null,
        financial_breakdown: JSON.stringify({
          totals: {
            total_invoice_amount: 3000,
            tax_total: 300,
          },
        }),
      },
    ]

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "projects") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({ data: project, error: null })
                ),
              })),
            })),
          })),
        }
      }
      if (table === "vendors") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: vendors, error: null })),
            })),
          })),
        }
      }
      if (table === "purchase_order_forms") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() =>
                    Promise.resolve({ data: purchaseOrders, error: null })
                  ),
                })),
              })),
            })),
          })),
        }
      }
      if (table === "change_orders") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() =>
                    Promise.resolve({ data: changeOrders, error: null })
                  ),
                })),
              })),
            })),
          })),
        }
      }
      if (table === "vendor_invoices") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    lte: vi.fn(() =>
                      Promise.resolve({ data: invoices, error: null })
                    ),
                  })),
                })),
              })),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      }
    }) as any

    const handler = await import("@/server/api/reports/vendor-accounts-payable-summary")
    const event = {} as any

    const result = await handler.default(event)

    expect(result.vendors[0].totalInvoiceValue).toBe(15000) // Only paid invoices: 10000 + 5000
    expect(result.vendors[0].paidToDate).toBe(15000) // All paid invoices
    expect(result.vendors[0].tax).toBe(1800) // Tax from all invoices (paid + draft): 1000 + 500 + 300
    expect(result.totals.totalInvoiceValue).toBe(15000)
    expect(result.totals.paidToDate).toBe(15000)
    expect(result.totals.tax).toBe(1800)
  })

  it("should calculate holdback correctly from invoice percentage", async () => {
    const globals = stubGlobals()
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      start_date: "2024-01-01T00:00:00.000Z",
      end_date: "2024-12-31T23:59:59.999Z",
    })

    const project = {
      uuid: "proj-1",
      project_name: "Test Project",
      project_id: "P-001",
    }

    const vendors = [
      { uuid: "vendor-1", vendor_name: "Vendor One" },
    ]

    const purchaseOrders: any[] = []
    const changeOrders: any[] = []

    const invoices = [
      {
        uuid: "inv-1",
        vendor_uuid: "vendor-1",
        invoice_type: "AGAINST_PO",
        status: "Paid",
        amount: 10000,
        holdback: 10, // 10%
        financial_breakdown: JSON.stringify({
          totals: {
            total_invoice_amount: 10000,
            tax_total: 1000,
          },
        }),
      },
      {
        uuid: "inv-2",
        vendor_uuid: "vendor-1",
        invoice_type: "AGAINST_PO",
        status: "Paid",
        amount: 20000,
        holdback: 5, // 5%
        financial_breakdown: JSON.stringify({
          totals: {
            total_invoice_amount: 20000,
            tax_total: 2000,
          },
        }),
      },
    ]

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "projects") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({ data: project, error: null })
                ),
              })),
            })),
          })),
        }
      }
      if (table === "vendors") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: vendors, error: null })),
            })),
          })),
        }
      }
      if (table === "purchase_order_forms") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() =>
                    Promise.resolve({ data: purchaseOrders, error: null })
                  ),
                })),
              })),
            })),
          })),
        }
      }
      if (table === "change_orders") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() =>
                    Promise.resolve({ data: changeOrders, error: null })
                  ),
                })),
              })),
            })),
          })),
        }
      }
      if (table === "vendor_invoices") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    lte: vi.fn(() =>
                      Promise.resolve({ data: invoices, error: null })
                    ),
                  })),
                })),
              })),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      }
    }) as any

    const handler = await import("@/server/api/reports/vendor-accounts-payable-summary")
    const event = {} as any

    const result = await handler.default(event)

    // Holdback: (10000 * 0.10) + (20000 * 0.05) = 1000 + 1000 = 2000
    expect(result.vendors[0].holdback).toBe(2000)
    expect(result.totals.holdback).toBe(2000)
  })

  it("should filter vendors with no activity", async () => {
    const globals = stubGlobals()
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      start_date: "2024-01-01T00:00:00.000Z",
      end_date: "2024-12-31T23:59:59.999Z",
    })

    const project = {
      uuid: "proj-1",
      project_name: "Test Project",
      project_id: "P-001",
    }

    const vendors = [
      { uuid: "vendor-1", vendor_name: "Vendor One" },
      { uuid: "vendor-2", vendor_name: "Vendor Two" },
    ]

    const purchaseOrders: any[] = []
    const changeOrders: any[] = []
    const invoices: any[] = []

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "projects") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({ data: project, error: null })
                ),
              })),
            })),
          })),
        }
      }
      if (table === "vendors") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: vendors, error: null })),
            })),
          })),
        }
      }
      if (table === "purchase_order_forms") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() =>
                    Promise.resolve({ data: purchaseOrders, error: null })
                  ),
                })),
              })),
            })),
          })),
        }
      }
      if (table === "change_orders") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() =>
                    Promise.resolve({ data: changeOrders, error: null })
                  ),
                })),
              })),
            })),
          })),
        }
      }
      if (table === "vendor_invoices") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    lte: vi.fn(() =>
                      Promise.resolve({ data: invoices, error: null })
                    ),
                  })),
                })),
              })),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      }
    }) as any

    const handler = await import("@/server/api/reports/vendor-accounts-payable-summary")
    const event = {} as any

    const result = await handler.default(event)

    // Should filter out vendors with no PO, CO, or invoice activity
    expect(result.vendors.length).toBe(0)
  })

  it("should handle project not found error", async () => {
    const globals = stubGlobals()
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      start_date: "2024-01-01T00:00:00.000Z",
      end_date: "2024-12-31T23:59:59.999Z",
    })

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "projects") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({ data: null, error: null })
                ),
              })),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      }
    }) as any

    const handler = await import("@/server/api/reports/vendor-accounts-payable-summary")
    const event = {} as any

    await expect(handler.default(event)).rejects.toThrow()
    expect(globals.mockCreateError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        statusMessage: "Project not found",
      })
    )
  })

  it("should handle database errors gracefully", async () => {
    const globals = stubGlobals()
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      start_date: "2024-01-01T00:00:00.000Z",
      end_date: "2024-12-31T23:59:59.999Z",
    })

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "projects") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: null,
                    error: { message: "Database error" },
                  })
                ),
              })),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      }
    }) as any

    const handler = await import("@/server/api/reports/vendor-accounts-payable-summary")
    const event = {} as any

    await expect(handler.default(event)).rejects.toThrow()
  })

  it("should calculate totals correctly across multiple vendors", async () => {
    const globals = stubGlobals()
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      start_date: "2024-01-01T00:00:00.000Z",
      end_date: "2024-12-31T23:59:59.999Z",
    })

    const project = {
      uuid: "proj-1",
      project_name: "Test Project",
      project_id: "P-001",
    }

    const vendors = [
      { uuid: "vendor-1", vendor_name: "Vendor One" },
      { uuid: "vendor-2", vendor_name: "Vendor Two" },
    ]

    const purchaseOrders = [
      {
        uuid: "po-1",
        vendor_uuid: "vendor-1",
        financial_breakdown: JSON.stringify({
          totals: { total_po_amount: 25000 },
        }),
      },
      {
        uuid: "po-2",
        vendor_uuid: "vendor-2",
        financial_breakdown: JSON.stringify({
          totals: { total_po_amount: 17500 },
        }),
      },
    ]

    const changeOrders = [
      {
        uuid: "co-1",
        vendor_uuid: "vendor-1",
        financial_breakdown: JSON.stringify({
          totals: { total_co_amount: 2151.56 },
        }),
      },
    ]

    const invoices = [
      {
        uuid: "inv-1",
        vendor_uuid: "vendor-1",
        invoice_type: "AGAINST_PO",
        status: "Paid",
        amount: 10000,
        holdback: 10,
        financial_breakdown: JSON.stringify({
          totals: {
            total_invoice_amount: 10000,
            tax_total: 1000,
          },
        }),
      },
      {
        uuid: "inv-2",
        vendor_uuid: "vendor-2",
        invoice_type: "AGAINST_PO",
        status: "Paid",
        amount: 5000,
        holdback: 5,
        financial_breakdown: JSON.stringify({
          totals: {
            total_invoice_amount: 5000,
            tax_total: 500,
          },
        }),
      },
    ]

    // Reset the mock before setting implementation to ensure clean state
    supabaseMock.from.mockReset()
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "projects") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({ data: project, error: null })
                ),
              })),
            })),
          })),
        }
      }
      if (table === "vendors") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: vendors, error: null })),
            })),
          })),
        }
      }
      if (table === "purchase_order_forms") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() =>
                    Promise.resolve({ data: purchaseOrders, error: null })
                  ),
                })),
              })),
            })),
          })),
        }
      }
      if (table === "change_orders") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() =>
                    Promise.resolve({ data: changeOrders, error: null })
                  ),
                })),
              })),
            })),
          })),
        }
      }
      if (table === "vendor_invoices") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    lte: vi.fn(() =>
                      Promise.resolve({ data: invoices, error: null })
                    ),
                  })),
                })),
              })),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      }
    }) as any

    const handler = await import("@/server/api/reports/vendor-accounts-payable-summary")
    const event = {} as any

    const result = await handler.default(event)

    expect(result.vendors.length).toBe(2)
    expect(result.totals.poAmount).toBe(42500) // 25000 + 17500
    expect(result.totals.changeOrderAmount).toBeCloseTo(2151.56, 2)
    expect(result.totals.totalInvoiceValue).toBe(15000) // 10000 + 5000
    expect(result.totals.paidToDate).toBe(15000)
    expect(result.totals.holdback).toBe(1250) // (10000 * 0.10) + (5000 * 0.05) = 1000 + 250
    expect(result.totals.tax).toBe(1500) // 1000 + 500
    expect(result.totals.billedByVendor).toBe(0)
    expect(result.totals.balance).toBe(0)
    expect(result.totals.apBalance).toBe(0)
  })

  it("should sort vendors alphabetically", async () => {
    const globals = stubGlobals()
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      start_date: "2024-01-01T00:00:00.000Z",
      end_date: "2024-12-31T23:59:59.999Z",
    })

    const project = {
      uuid: "proj-1",
      project_name: "Test Project",
      project_id: "P-001",
    }

    const vendors = [
      { uuid: "vendor-2", vendor_name: "Zebra Vendor" },
      { uuid: "vendor-1", vendor_name: "Alpha Vendor" },
    ]

    const purchaseOrders = [
      {
        uuid: "po-1",
        vendor_uuid: "vendor-1",
        financial_breakdown: JSON.stringify({
          totals: { total_po_amount: 10000 },
        }),
      },
      {
        uuid: "po-2",
        vendor_uuid: "vendor-2",
        financial_breakdown: JSON.stringify({
          totals: { total_po_amount: 20000 },
        }),
      },
    ]

    const changeOrders: any[] = []
    const invoices: any[] = []

    // Reset the mock before setting implementation to ensure clean state
    supabaseMock.from.mockReset()
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "projects") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({ data: project, error: null })
                ),
              })),
            })),
          })),
        }
      }
      if (table === "vendors") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: vendors, error: null })),
            })),
          })),
        }
      }
      if (table === "purchase_order_forms") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() =>
                    Promise.resolve({ data: purchaseOrders, error: null })
                  ),
                })),
              })),
            })),
          })),
        }
      }
      if (table === "change_orders") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() =>
                    Promise.resolve({ data: changeOrders, error: null })
                  ),
                })),
              })),
            })),
          })),
        }
      }
      if (table === "vendor_invoices") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    lte: vi.fn(() =>
                      Promise.resolve({ data: invoices, error: null })
                    ),
                  })),
                })),
              })),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      }
    }) as any

    const handler = await import("@/server/api/reports/vendor-accounts-payable-summary")
    const event = {} as any

    const result = await handler.default(event)

    expect(result.vendors.length).toBe(2)
    expect(result.vendors[0].vendorName).toBe("Alpha Vendor")
    expect(result.vendors[1].vendorName).toBe("Zebra Vendor")
  })
})

