import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Create hoisted mock that can be updated per test
const supabaseMock = vi.hoisted(() => {
  return {
    from: vi.fn((table: string) => {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    in: vi.fn(() => ({
                      eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
                    })),
                  })),
                })),
              })),
            })),
          })),
        })),
      }
    }) as any,
  }
})

vi.mock('@/utils/supabaseServer', () => ({
  supabaseServer: supabaseMock,
}))

describe("server/api/reports/po-wise-stock-report", () => {
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
    // Reset the mock implementation
    supabaseMock.from.mockImplementation((table: string) => {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                in: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
                })),
              })),
            })),
          })),
        })),
      }
    }) as any
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("should require corporation and project UUIDs", async () => {
    const globals = stubGlobals()
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "",
      project_uuid: "",
    })

    const handler = await import("@/server/api/reports/po-wise-stock-report")
    const event = {} as any

    await expect(handler.default(event)).rejects.toThrow()
    expect(globals.mockCreateError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        statusMessage: expect.stringContaining("Corporation UUID and Project UUID are required"),
      })
    )
  })

  it("should filter out labor purchase orders", async () => {
    const globals = stubGlobals()
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
    })

    const purchaseOrders = [
      {
        uuid: "po-1",
        po_number: "PO-001",
        entry_date: "2024-01-01",
        vendor_uuid: "vendor-1",
        po_type: "MATERIAL",
        po_type_uuid: null,
      },
      {
        uuid: "po-2",
        po_number: "PO-002",
        entry_date: "2024-01-02",
        vendor_uuid: "vendor-2",
        po_type: "LABOR",
        po_type_uuid: null,
      },
    ]

    const poItems = [
      {
        uuid: "po-item-1",
        purchase_order_uuid: "po-1",
        item_uuid: "item-1",
        item_name: "Item 1",
        quantity: 100,
        unit_price: 10.00,
        cost_code_uuid: "cc-1",
        order_index: 0,
      },
    ]

    const vendors = [
      { uuid: "vendor-1", vendor_name: "Vendor One" },
    ]

    const costCodes = [
      { uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" },
    ]

    const preferredItems: any[] = []

    let selectChain: any = {
      eq: vi.fn(function (this: any, ...args: any[]) {
        if (args[0] === "corporation_uuid") {
          return {
            eq: vi.fn(function (this: any, ...args: any[]) {
              if (args[0] === "project_uuid") {
                return {
                  eq: vi.fn(function (this: any, ...args: any[]) {
                    if (args[0] === "is_active") {
                      return {
                        in: vi.fn(function (this: any, ...args: any[]) {
                          if (args[0] === "status") {
                            return Promise.resolve({ data: purchaseOrders, error: null })
                          }
                          return this
                        }),
                      }
                    }
                    return this
                  }),
                }
              }
              return this
            }),
          }
        }
        return this
      }),
    }

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "purchase_order_forms") {
        return {
          select: vi.fn(() => selectChain),
        }
      }
      if (table === "purchase_order_items_list") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: poItems, error: null })),
              })),
            })),
          })),
        }
      }
      if (table === "receipt_note_items") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
                  })),
                })),
              })),
            })),
          })),
        }
      }
      if (table === "return_note_items") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
                  })),
                })),
              })),
            })),
          })),
        };
      }
      if (table === "vendors") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: vendors, error: null })),
          })),
        }
      }
      if (table === "cost_code_configurations") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: costCodes, error: null })),
          })),
        }
      }
      if (table === "cost_code_preferred_items") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: preferredItems, error: null })),
          })),
        }
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      }
    }) as any

    const handler = await import("@/server/api/reports/po-wise-stock-report")
    const event = {} as any

    const result = await handler.default(event)

    expect(result).toBeDefined()
    expect(result.data).toBeDefined()
    // Should only include material PO (po-1), not labor PO (po-2)
    expect(result.data.length).toBe(1)
    expect(result.data[0].po_number).toBe("PO-001")
    expect(result.data[0].uuid).toBe("po-1")
  })

  it("should return empty array when no purchase orders found", async () => {
    const globals = stubGlobals()
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
    })

    const selectChain: any = {
      eq: vi.fn(function (this: any, ...args: any[]) {
        if (args[0] === "corporation_uuid") {
          return {
            eq: vi.fn(function (this: any, ...args: any[]) {
              if (args[0] === "project_uuid") {
                return {
                  eq: vi.fn(function (this: any, ...args: any[]) {
                    if (args[0] === "is_active") {
                      return {
                        in: vi.fn(function (this: any, ...args: any[]) {
                          if (args[0] === "status") {
                            return Promise.resolve({ data: [], error: null })
                          }
                          return this
                        }),
                      }
                    }
                    return this
                  }),
                }
              }
              return this
            }),
          }
        }
        return this
      }),
    }

    supabaseMock.from.mockImplementation(() => ({
      select: vi.fn(() => selectChain),
    })) as any

    const handler = await import("@/server/api/reports/po-wise-stock-report")
    const event = {} as any

    const result = await handler.default(event)

    expect(result).toBeDefined()
    expect(result.data).toEqual([])
  })

  it("should group items by purchase order", async () => {
    const globals = stubGlobals();
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
    });

    const purchaseOrders = [
      {
        uuid: "po-1",
        po_number: "PO-001",
        entry_date: "2024-01-01",
        vendor_uuid: "vendor-1",
        po_type: "MATERIAL",
        po_type_uuid: null,
      },
    ];

    const poItems = [
      {
        uuid: "po-item-1",
        purchase_order_uuid: "po-1",
        item_uuid: "item-1",
        item_name: "Item 1",
        quantity: 100,
        unit_price: 10.0,
        cost_code_uuid: "cc-1",
        order_index: 0,
      },
      {
        uuid: "po-item-2",
        purchase_order_uuid: "po-1",
        item_uuid: "item-2",
        item_name: "Item 2",
        quantity: 200,
        unit_price: 20.0,
        cost_code_uuid: "cc-2",
        order_index: 1,
      },
    ];

    const receiptNoteItems = [
      {
        item_uuid: "po-item-1",
        received_quantity: 100,
        received_total: 1000.0,
        stock_receipt_notes: {
          status: "Received",
          entry_date: "2024-01-10",
          reference_number: "INV-001",
        },
      },
      {
        item_uuid: "po-item-2",
        received_quantity: 200,
        received_total: 4000.0,
        stock_receipt_notes: {
          status: "Received",
          entry_date: "2024-01-11",
          reference_number: "INV-002",
        },
      },
    ];

    const vendors = [{ uuid: "vendor-1", vendor_name: "Vendor One" }];

    const costCodes = [
      { uuid: "cc-1", cost_code_number: "01", cost_code_name: "Code 1" },
      { uuid: "cc-2", cost_code_number: "02", cost_code_name: "Code 2" },
    ];

    const preferredItems: any[] = [];

    let selectChain: any = {
      eq: vi.fn(function (this: any, ...args: any[]) {
        if (args[0] === "corporation_uuid") {
          return {
            eq: vi.fn(function (this: any, ...args: any[]) {
              if (args[0] === "project_uuid") {
                return {
                  eq: vi.fn(function (this: any, ...args: any[]) {
                    if (args[0] === "is_active") {
                      return {
                        in: vi.fn(function (this: any, ...args: any[]) {
                          if (args[0] === "status") {
                            return Promise.resolve({
                              data: purchaseOrders,
                              error: null,
                            });
                          }
                          return this;
                        }),
                      };
                    }
                    return this;
                  }),
                };
              }
              return this;
            }),
          };
        }
        return this;
      }),
    };

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "purchase_order_forms") {
        return {
          select: vi.fn(() => selectChain),
        };
      }
      if (table === "purchase_order_items_list") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() =>
                  Promise.resolve({ data: poItems, error: null })
                ),
              })),
            })),
          })),
        };
      }
      if (table === "receipt_note_items") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    eq: vi.fn(() =>
                      Promise.resolve({ data: receiptNoteItems, error: null })
                    ),
                  })),
                })),
              })),
            })),
          })),
        };
      }
      if (table === "return_note_items") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
                  })),
                })),
              })),
            })),
          })),
        };
      }
      if (table === "vendors") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: vendors, error: null })),
          })),
        };
      }
      if (table === "cost_code_configurations") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: costCodes, error: null })),
          })),
        };
      }
      if (table === "cost_code_preferred_items") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() =>
              Promise.resolve({ data: preferredItems, error: null })
            ),
          })),
        };
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
    }) as any;

    const handler = await import("@/server/api/reports/po-wise-stock-report");
    const event = {} as any;

    const result = await handler.default(event);

    expect(result).toBeDefined();
    expect(result.data.length).toBe(1);
    expect(result.data[0].items.length).toBe(2);
    expect(result.data[0].totals.orderedQuantity).toBe(300); // 100 + 200
    expect(result.data[0].totals.receivedQuantity).toBe(300); // 100 + 200
    expect(result.data[0].totals.returnedQuantity).toBe(0); // No return notes
    expect(result.data[0].totals.totalValue).toBe(5000.0); // 1000 + 4000
  })

  it("should calculate grand totals correctly", async () => {
    const globals = stubGlobals();
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
    });

    const purchaseOrders = [
      {
        uuid: "po-1",
        po_number: "PO-001",
        entry_date: "2024-01-01",
        vendor_uuid: "vendor-1",
        po_type: "MATERIAL",
        po_type_uuid: null,
      },
      {
        uuid: "po-2",
        po_number: "PO-002",
        entry_date: "2024-01-02",
        vendor_uuid: "vendor-2",
        po_type: "MATERIAL",
        po_type_uuid: null,
      },
    ];

    const poItems = [
      {
        uuid: "po-item-1",
        purchase_order_uuid: "po-1",
        item_uuid: "item-1",
        item_name: "Item 1",
        quantity: 100,
        unit_price: 10.0,
        cost_code_uuid: "cc-1",
        order_index: 0,
      },
      {
        uuid: "po-item-2",
        purchase_order_uuid: "po-2",
        item_uuid: "item-2",
        item_name: "Item 2",
        quantity: 200,
        unit_price: 20.0,
        cost_code_uuid: "cc-2",
        order_index: 0,
      },
    ];

    const receiptNoteItems = [
      {
        item_uuid: "po-item-1",
        received_quantity: 100,
        received_total: 1000.0,
        stock_receipt_notes: {
          status: "Received",
          entry_date: "2024-01-10",
          reference_number: "INV-001",
        },
      },
      {
        item_uuid: "po-item-2",
        received_quantity: 200,
        received_total: 4000.0,
        stock_receipt_notes: {
          status: "Received",
          entry_date: "2024-01-11",
          reference_number: "INV-002",
        },
      },
    ];

    const vendors = [
      { uuid: "vendor-1", vendor_name: "Vendor One" },
      { uuid: "vendor-2", vendor_name: "Vendor Two" },
    ];

    const costCodes = [
      { uuid: "cc-1", cost_code_number: "01", cost_code_name: "Code 1" },
      { uuid: "cc-2", cost_code_number: "02", cost_code_name: "Code 2" },
    ];

    const preferredItems: any[] = [];

    let selectChain: any = {
      eq: vi.fn(function (this: any, ...args: any[]) {
        if (args[0] === "corporation_uuid") {
          return {
            eq: vi.fn(function (this: any, ...args: any[]) {
              if (args[0] === "project_uuid") {
                return {
                  eq: vi.fn(function (this: any, ...args: any[]) {
                    if (args[0] === "is_active") {
                      return {
                        in: vi.fn(function (this: any, ...args: any[]) {
                          if (args[0] === "status") {
                            return Promise.resolve({
                              data: purchaseOrders,
                              error: null,
                            });
                          }
                          return this;
                        }),
                      };
                    }
                    return this;
                  }),
                };
              }
              return this;
            }),
          };
        }
        return this;
      }),
    };

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "purchase_order_forms") {
        return {
          select: vi.fn(() => selectChain),
        };
      }
      if (table === "purchase_order_items_list") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() =>
                  Promise.resolve({ data: poItems, error: null })
                ),
              })),
            })),
          })),
        };
      }
      if (table === "receipt_note_items") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    eq: vi.fn(() =>
                      Promise.resolve({ data: receiptNoteItems, error: null })
                    ),
                  })),
                })),
              })),
            })),
          })),
        };
      }
      if (table === "return_note_items") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
                  })),
                })),
              })),
            })),
          })),
        };
      }
      if (table === "vendors") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: vendors, error: null })),
          })),
        };
      }
      if (table === "cost_code_configurations") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: costCodes, error: null })),
          })),
        };
      }
      if (table === "cost_code_preferred_items") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() =>
              Promise.resolve({ data: preferredItems, error: null })
            ),
          })),
        };
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
    }) as any;

    const handler = await import("@/server/api/reports/po-wise-stock-report");
    const event = {} as any;

    const result = await handler.default(event);

    expect(result).toBeDefined();
    expect(result.totals.orderedQuantity).toBe(300); // 100 + 200
    expect(result.totals.receivedQuantity).toBe(300); // 100 + 200
    expect(result.totals.returnedQuantity).toBe(0); // No return notes
    expect(result.totals.totalValue).toBe(5000.0); // 1000 + 4000
  })

  it("should handle database errors", async () => {
    const globals = stubGlobals()
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
    })

    const selectChain: any = {
      eq: vi.fn(function (this: any, ...args: any[]) {
        if (args[0] === "corporation_uuid") {
          return {
            eq: vi.fn(function (this: any, ...args: any[]) {
              if (args[0] === "project_uuid") {
                return {
                  eq: vi.fn(function (this: any, ...args: any[]) {
                    if (args[0] === "is_active") {
                      return {
                        in: vi.fn(function (this: any, ...args: any[]) {
                          if (args[0] === "status") {
                            return Promise.resolve({ data: null, error: { message: "Database error" } })
                          }
                          return this
                        }),
                      }
                    }
                    return this
                  }),
                }
              }
              return this
            }),
          }
        }
        return this
      }),
    }

    supabaseMock.from.mockImplementation(() => ({
      select: vi.fn(() => selectChain),
    })) as any

    const handler = await import("@/server/api/reports/po-wise-stock-report")
    const event = {} as any

    await expect(handler.default(event)).rejects.toThrow()
    expect(globals.mockCreateError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        statusMessage: expect.stringContaining("Error fetching purchase orders"),
      })
    )
  })

  it("should include approved, completed, and partially received purchase orders", async () => {
    const globals = stubGlobals()
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
    })

    // Mix of approved, completed, partially_received, draft, and pending purchase orders
    const purchaseOrders = [
      {
        uuid: "po-approved-1",
        po_number: "PO-APPROVED-001",
        entry_date: "2024-01-01",
        vendor_uuid: "vendor-1",
        po_type: "MATERIAL",
        po_type_uuid: null,
        status: "Approved", // Should be included
      },
      {
        uuid: "po-completed-1",
        po_number: "PO-COMPLETED-001",
        entry_date: "2024-01-02",
        vendor_uuid: "vendor-1",
        po_type: "MATERIAL",
        po_type_uuid: null,
        status: "Completed", // Should be included
      },
      {
        uuid: "po-partially-received-1",
        po_number: "PO-PARTIALLY-001",
        entry_date: "2024-01-03",
        vendor_uuid: "vendor-2",
        po_type: "MATERIAL",
        po_type_uuid: null,
        status: "Partially_Received", // Should be included
      },
      {
        uuid: "po-draft-1",
        po_number: "PO-DRAFT-001",
        entry_date: "2024-01-04",
        vendor_uuid: "vendor-1",
        po_type: "MATERIAL",
        po_type_uuid: null,
        status: "Draft", // Should be excluded
      },
      {
        uuid: "po-pending-1",
        po_number: "PO-PENDING-001",
        entry_date: "2024-01-05",
        vendor_uuid: "vendor-1",
        po_type: "MATERIAL",
        po_type_uuid: null,
        status: "Pending", // Should be excluded
      },
      {
        uuid: "po-approved-2",
        po_number: "PO-APPROVED-002",
        entry_date: "2024-01-06",
        vendor_uuid: "vendor-2",
        po_type: "MATERIAL",
        po_type_uuid: null,
        status: "Approved", // Should be included
      },
    ]

    const poItems = [
      {
        uuid: "po-item-1",
        purchase_order_uuid: "po-approved-1",
        item_uuid: "item-1",
        item_name: "Item 1",
        quantity: 100,
        unit_price: 10.00,
        cost_code_uuid: "cc-1",
        order_index: 0,
      },
      {
        uuid: "po-item-2",
        purchase_order_uuid: "po-completed-1",
        item_uuid: "item-2",
        item_name: "Item 2",
        quantity: 200,
        unit_price: 20.00,
        cost_code_uuid: "cc-2",
        order_index: 0,
      },
      {
        uuid: "po-item-3",
        purchase_order_uuid: "po-partially-received-1",
        item_uuid: "item-3",
        item_name: "Item 3",
        quantity: 150,
        unit_price: 15.00,
        cost_code_uuid: "cc-1",
        order_index: 0,
      },
      {
        uuid: "po-item-4",
        purchase_order_uuid: "po-approved-2",
        item_uuid: "item-4",
        item_name: "Item 4",
        quantity: 300,
        unit_price: 25.00,
        cost_code_uuid: "cc-2",
        order_index: 0,
      },
    ]

    const vendors = [
      { uuid: "vendor-1", vendor_name: "Vendor One" },
      { uuid: "vendor-2", vendor_name: "Vendor Two" },
    ]

    const costCodes = [
      { uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code 1" },
      { uuid: "cc-2", cost_code_number: "02", cost_code_name: "Test Code 2" },
    ]

    const preferredItems: any[] = []

    let selectChain: any = {
      eq: vi.fn(function (this: any, ...args: any[]) {
        if (args[0] === "corporation_uuid") {
          return {
            eq: vi.fn(function (this: any, ...args: any[]) {
              if (args[0] === "project_uuid") {
                return {
                  eq: vi.fn(function (this: any, ...args: any[]) {
                    if (args[0] === "is_active") {
                      return {
                        in: vi.fn(function (this: any, ...args: any[]) {
                          if (args[0] === "status") {
                            // Return approved, completed, and partially_received POs
                            const allowedStatuses = ["Approved", "Completed", "Partially_Received"]
                            const filteredPOs = purchaseOrders.filter((po: any) => allowedStatuses.includes(po.status))
                            return Promise.resolve({ data: filteredPOs, error: null })
                          }
                          return this
                        }),
                      }
                    }
                    return this
                  }),
                }
              }
              return this
            }),
          }
        }
        return this
      }),
    }

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "purchase_order_forms") {
        return {
          select: vi.fn(() => selectChain),
        }
      }
      if (table === "purchase_order_items_list") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: poItems, error: null })),
              })),
            })),
          })),
        }
      }
      if (table === "receipt_note_items") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
                  })),
                })),
              })),
            })),
          })),
        }
      }
      if (table === "return_note_items") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
                  })),
                })),
              })),
            })),
          })),
        };
      }
      if (table === "vendors") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: vendors, error: null })),
          })),
        }
      }
      if (table === "cost_code_configurations") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: costCodes, error: null })),
          })),
        }
      }
      if (table === "cost_code_preferred_items") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: preferredItems, error: null })),
          })),
        }
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      }
    }) as any

    const handler = await import("@/server/api/reports/po-wise-stock-report")
    const event = {} as any

    const result = await handler.default(event)

    expect(result).toBeDefined()
    expect(result.data).toBeDefined()
    // Should include approved, completed, and partially_received purchase orders (4), not draft or pending
    expect(result.data.length).toBe(4)
    
    const poNumbers = result.data.map((po: any) => po.po_number)
    // Verify included statuses
    expect(poNumbers).toContain("PO-APPROVED-001")
    expect(poNumbers).toContain("PO-COMPLETED-001")
    expect(poNumbers).toContain("PO-PARTIALLY-001")
    expect(poNumbers).toContain("PO-APPROVED-002")
    
    // Verify draft and pending POs are not included
    expect(poNumbers).not.toContain("PO-DRAFT-001")
    expect(poNumbers).not.toContain("PO-PENDING-001")
  })

  it("should only include receipt note items from active receipt notes in received quantity", async () => {
    const globals = stubGlobals();
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
    });

    const purchaseOrders = [
      {
        uuid: "po-1",
        po_number: "PO-001",
        entry_date: "2024-01-01",
        vendor_uuid: "vendor-1",
        po_type: "MATERIAL",
        po_type_uuid: null,
        status: "Approved",
      },
    ];

    const poItems = [
      {
        uuid: "po-item-1",
        purchase_order_uuid: "po-1",
        item_uuid: "item-1",
        item_name: "Item 1",
        quantity: 100,
        unit_price: 10.0,
        cost_code_uuid: "cc-1",
        order_index: 0,
      },
    ];

    // Mix of active and inactive receipt note items
    const receiptNoteItems = [
      {
        item_uuid: "po-item-1",
        received_quantity: 30,
        received_total: 300.0,
        stock_receipt_notes: {
          uuid: "rn-active-1",
          status: "Received",
          entry_date: "2024-01-01",
          reference_number: "INV-001",
          updated_at: "2024-01-01",
          is_active: true, // Active receipt note - should be included
        },
      },
      {
        item_uuid: "po-item-1",
        received_quantity: 20,
        received_total: 200.0,
        stock_receipt_notes: {
          uuid: "rn-active-2",
          status: "Received",
          entry_date: "2024-01-02",
          reference_number: "INV-002",
          updated_at: "2024-01-02",
          is_active: true, // Active receipt note - should be included
        },
      },
      {
        item_uuid: "po-item-1",
        received_quantity: 15,
        received_total: 150.0,
        stock_receipt_notes: {
          uuid: "rn-inactive-1",
          status: "Received",
          entry_date: "2024-01-03",
          reference_number: "INV-003",
          updated_at: "2024-01-03",
          is_active: false, // Inactive receipt note - should be excluded
        },
      },
      {
        item_uuid: "po-item-1",
        received_quantity: 10,
        received_total: 100.0,
        stock_receipt_notes: {
          uuid: "rn-inactive-2",
          status: "Received",
          entry_date: "2024-01-04",
          reference_number: "INV-004",
          updated_at: "2024-01-04",
          is_active: false, // Inactive receipt note - should be excluded
        },
      },
    ];

    const vendors = [{ uuid: "vendor-1", vendor_name: "Vendor One" }];

    const costCodes = [
      { uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" },
    ];

    const preferredItems: any[] = [];

    let selectChain: any = {
      eq: vi.fn(function (this: any, ...args: any[]) {
        if (args[0] === "corporation_uuid") {
          return {
            eq: vi.fn(function (this: any, ...args: any[]) {
              if (args[0] === "project_uuid") {
                return {
                  eq: vi.fn(function (this: any, ...args: any[]) {
                    if (args[0] === "is_active") {
                      return {
                        in: vi.fn(function (this: any, ...args: any[]) {
                          if (args[0] === "status") {
                            return Promise.resolve({
                              data: purchaseOrders,
                              error: null,
                            });
                          }
                          return this;
                        }),
                      };
                    }
                    return this;
                  }),
                };
              }
              return this;
            }),
          };
        }
        return this;
      }),
    };

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "purchase_order_forms") {
        return {
          select: vi.fn(() => selectChain),
        };
      }
      if (table === "purchase_order_items_list") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() =>
                  Promise.resolve({ data: poItems, error: null })
                ),
              })),
            })),
          })),
        };
      }
      if (table === "receipt_note_items") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    eq: vi.fn(() =>
                      Promise.resolve({ data: receiptNoteItems, error: null })
                    ),
                  })),
                })),
              })),
            })),
          })),
        };
      }
      if (table === "return_note_items") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
                  })),
                })),
              })),
            })),
          })),
        };
      }
      if (table === "vendors") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: vendors, error: null })),
          })),
        };
      }
      if (table === "cost_code_configurations") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: costCodes, error: null })),
          })),
        };
      }
      if (table === "cost_code_preferred_items") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() =>
              Promise.resolve({ data: preferredItems, error: null })
            ),
          })),
        };
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
    }) as any;

    const handler = await import("@/server/api/reports/po-wise-stock-report");
    const event = {} as any;

    const result = await handler.default(event);

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data.length).toBe(1);

    const po = result.data[0];
    expect(po.items.length).toBe(1);

    const item = po.items[0];
    // Should only include received quantity from active receipt notes (30 + 20 = 50)
    // Should NOT include inactive receipt notes (15 + 10 = 25)
    expect(item.receivedQuantity).toBe(50); // Only from active receipt notes
    expect(item.receivedQuantity).not.toBe(75); // Not including inactive (30 + 20 + 15 + 10)

    // Verify total value is calculated correctly (50 * 10.00 = 500.00)
    expect(item.totalValue).toBe(500.0);

    // Verify PO totals
    expect(po.totals.receivedQuantity).toBe(50);
    expect(po.totals.returnedQuantity).toBe(0); // No return notes
    expect(po.totals.totalValue).toBe(500.0);

    // Verify grand totals
    expect(result.totals.receivedQuantity).toBe(50);
    expect(result.totals.returnedQuantity).toBe(0); // No return notes
    expect(result.totals.totalValue).toBe(500.0);
  })

  it("should include returned quantities from return note items", async () => {
    const globals = stubGlobals();
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
    });

    const purchaseOrders = [
      {
        uuid: "po-1",
        po_number: "PO-001",
        entry_date: "2024-01-01",
        vendor_uuid: "vendor-1",
        po_type: "MATERIAL",
        po_type_uuid: null,
        status: "Approved",
      },
    ];

    const poItems = [
      {
        uuid: "po-item-1",
        purchase_order_uuid: "po-1",
        item_uuid: "item-1",
        item_name: "Item 1",
        quantity: 100,
        unit_price: 10.0,
        cost_code_uuid: "cc-1",
        order_index: 0,
      },
    ];

    const receiptNoteItems = [
      {
        item_uuid: "po-item-1",
        received_quantity: 100,
        received_total: 1000.0,
        stock_receipt_notes: {
          uuid: "rn-1",
          status: "Received",
          entry_date: "2024-01-10",
          reference_number: "INV-001",
          updated_at: "2024-01-10",
          is_active: true,
        },
      },
    ];

    const returnNoteItems = [
      {
        item_uuid: "po-item-1",
        return_quantity: 20,
        stock_return_notes: {
          uuid: "rtn-1",
          status: "Waiting",
          entry_date: "2024-01-15",
          updated_at: "2024-01-15",
          is_active: true,
        },
      },
      {
        item_uuid: "po-item-1",
        return_quantity: 10,
        stock_return_notes: {
          uuid: "rtn-2",
          status: "Returned",
          entry_date: "2024-01-16",
          updated_at: "2024-01-16",
          is_active: true,
        },
      },
    ];

    const vendors = [{ uuid: "vendor-1", vendor_name: "Vendor One" }];

    const costCodes = [
      { uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" },
    ];

    const preferredItems: any[] = [];

    let selectChain: any = {
      eq: vi.fn(function (this: any, ...args: any[]) {
        if (args[0] === "corporation_uuid") {
          return {
            eq: vi.fn(function (this: any, ...args: any[]) {
              if (args[0] === "project_uuid") {
                return {
                  eq: vi.fn(function (this: any, ...args: any[]) {
                    if (args[0] === "is_active") {
                      return {
                        in: vi.fn(function (this: any, ...args: any[]) {
                          if (args[0] === "status") {
                            return Promise.resolve({
                              data: purchaseOrders,
                              error: null,
                            });
                          }
                          return this;
                        }),
                      };
                    }
                    return this;
                  }),
                };
              }
              return this;
            }),
          };
        }
        return this;
      }),
    };

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "purchase_order_forms") {
        return {
          select: vi.fn(() => selectChain),
        };
      }
      if (table === "purchase_order_items_list") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() =>
                  Promise.resolve({ data: poItems, error: null })
                ),
              })),
            })),
          })),
        };
      }
      if (table === "receipt_note_items") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    eq: vi.fn(() =>
                      Promise.resolve({ data: receiptNoteItems, error: null })
                    ),
                  })),
                })),
              })),
            })),
          })),
        };
      }
      if (table === "return_note_items") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    eq: vi.fn(() =>
                      Promise.resolve({ data: returnNoteItems, error: null })
                    ),
                  })),
                })),
              })),
            })),
          })),
        };
      }
      if (table === "vendors") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: vendors, error: null })),
          })),
        };
      }
      if (table === "cost_code_configurations") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: costCodes, error: null })),
          })),
        };
      }
      if (table === "cost_code_preferred_items") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() =>
              Promise.resolve({ data: preferredItems, error: null })
            ),
          })),
        };
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
    }) as any;

    const handler = await import("@/server/api/reports/po-wise-stock-report");
    const event = {} as any;

    const result = await handler.default(event);

    expect(result).toBeDefined();
    expect(result.data.length).toBe(1);

    const po = result.data[0];
    expect(po.items.length).toBe(1);

    const item = po.items[0];
    // Should aggregate returned quantities from multiple return notes (20 + 10 = 30)
    expect(item.returnedQuantity).toBe(30);
    expect(item.receivedQuantity).toBe(100);

    // Verify PO totals
    expect(po.totals.returnedQuantity).toBe(30);
    expect(po.totals.receivedQuantity).toBe(100);

    // Verify grand totals
    expect(result.totals.returnedQuantity).toBe(30);
    expect(result.totals.receivedQuantity).toBe(100);
  });

  it("should exclude inactive return note items from returned quantities", async () => {
    const globals = stubGlobals();
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
    });

    const purchaseOrders = [
      {
        uuid: "po-1",
        po_number: "PO-001",
        entry_date: "2024-01-01",
        vendor_uuid: "vendor-1",
        po_type: "MATERIAL",
        po_type_uuid: null,
        status: "Approved",
      },
    ];

    const poItems = [
      {
        uuid: "po-item-1",
        purchase_order_uuid: "po-1",
        item_uuid: "item-1",
        item_name: "Item 1",
        quantity: 100,
        unit_price: 10.0,
        cost_code_uuid: "cc-1",
        order_index: 0,
      },
    ];

    const receiptNoteItems = [
      {
        item_uuid: "po-item-1",
        received_quantity: 100,
        received_total: 1000.0,
        stock_receipt_notes: {
          uuid: "rn-1",
          status: "Received",
          entry_date: "2024-01-10",
          reference_number: "INV-001",
          updated_at: "2024-01-10",
          is_active: true,
        },
      },
    ];

    const returnNoteItems = [
      {
        item_uuid: "po-item-1",
        return_quantity: 20,
        stock_return_notes: {
          uuid: "rtn-active",
          status: "Waiting",
          entry_date: "2024-01-15",
          updated_at: "2024-01-15",
          is_active: true, // Active - should be included
        },
      },
      {
        item_uuid: "po-item-1",
        return_quantity: 10,
        stock_return_notes: {
          uuid: "rtn-inactive",
          status: "Waiting",
          entry_date: "2024-01-16",
          updated_at: "2024-01-16",
          is_active: false, // Inactive - should be excluded
        },
      },
    ];

    const vendors = [{ uuid: "vendor-1", vendor_name: "Vendor One" }];

    const costCodes = [
      { uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" },
    ];

    const preferredItems: any[] = [];

    let selectChain: any = {
      eq: vi.fn(function (this: any, ...args: any[]) {
        if (args[0] === "corporation_uuid") {
          return {
            eq: vi.fn(function (this: any, ...args: any[]) {
              if (args[0] === "project_uuid") {
                return {
                  eq: vi.fn(function (this: any, ...args: any[]) {
                    if (args[0] === "is_active") {
                      return {
                        in: vi.fn(function (this: any, ...args: any[]) {
                          if (args[0] === "status") {
                            return Promise.resolve({
                              data: purchaseOrders,
                              error: null,
                            });
                          }
                          return this;
                        }),
                      };
                    }
                    return this;
                  }),
                };
              }
              return this;
            }),
          };
        }
        return this;
      }),
    };

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "purchase_order_forms") {
        return {
          select: vi.fn(() => selectChain),
        };
      }
      if (table === "purchase_order_items_list") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() =>
                  Promise.resolve({ data: poItems, error: null })
                ),
              })),
            })),
          })),
        };
      }
      if (table === "receipt_note_items") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    eq: vi.fn(() =>
                      Promise.resolve({ data: receiptNoteItems, error: null })
                    ),
                  })),
                })),
              })),
            })),
          })),
        };
      }
      if (table === "return_note_items") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    eq: vi.fn(() =>
                      Promise.resolve({ data: returnNoteItems, error: null })
                    ),
                  })),
                })),
              })),
            })),
          })),
        };
      }
      if (table === "vendors") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: vendors, error: null })),
          })),
        };
      }
      if (table === "cost_code_configurations") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: costCodes, error: null })),
          })),
        };
      }
      if (table === "cost_code_preferred_items") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() =>
              Promise.resolve({ data: preferredItems, error: null })
            ),
          })),
        };
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
    }) as any;

    const handler = await import("@/server/api/reports/po-wise-stock-report");
    const event = {} as any;

    const result = await handler.default(event);

    expect(result).toBeDefined();
    const item = result.data[0].items[0];
    // Should only include active return note items (20)
    // Should NOT include inactive return note items (10)
    expect(item.returnedQuantity).toBe(20);
    expect(item.returnedQuantity).not.toBe(30); // Not including inactive (20 + 10)

    // Verify totals
    expect(result.data[0].totals.returnedQuantity).toBe(20);
    expect(result.totals.returnedQuantity).toBe(20);
  });

  it("should only allow GET method", async () => {
    const globals = stubGlobals()
    globals.mockGetMethod.mockReturnValue("POST")
    globals.mockGetQuery.mockReturnValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
    })

    const handler = await import("@/server/api/reports/po-wise-stock-report")
    const event = {} as any

    await expect(handler.default(event)).rejects.toThrow()
    expect(globals.mockCreateError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 405,
        statusMessage: "Method not allowed",
      })
    )
  })
})
