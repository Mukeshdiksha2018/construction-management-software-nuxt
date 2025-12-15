import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref, computed } from "vue";
import { createPinia, defineStore, setActivePinia } from "pinia";
import ReceiptNoteList from "@/components/PurchaseOrders/ReceiptNoteList.vue";

const fetchStockReceiptNotesMock = vi.fn();
const createStockReceiptNoteMock = vi.fn();
const updateStockReceiptNoteMock = vi.fn();
const deleteStockReceiptNoteMock = vi.fn();
const generateNextGrnNumberMock = vi.fn(() => "GRN-000777");

const fetchPurchaseOrdersMock = vi.fn();
const fetchProjectsMetadataMock = vi.fn();

const stockReceiptNotesState = ref<any[]>([]);

vi.stubGlobal("useToast", () => ({
  add: vi.fn(),
}));

const clearPurchaseOrderResourcesSpy = vi.fn();

vi.mock("@/stores/purchaseOrderResources", () => {
  const usePurchaseOrderResourcesStore = defineStore("purchaseOrderResources", () => ({
    clear: clearPurchaseOrderResourcesSpy,
  }));
  return { usePurchaseOrderResourcesStore };
});

vi.mock("@/stores/corporations", () => {
  const useCorporationStore = defineStore("corporations", () => ({
    selectedCorporation: { uuid: "corp-1" },
    selectedCorporationId: "corp-1",
  }));
  return { useCorporationStore };
});

vi.mock("@/stores/stockReceiptNotes", () => {
  const useStockReceiptNotesStore = defineStore("stockReceiptNotes", () => ({
    stockReceiptNotes: stockReceiptNotesState,
    loading: ref(false),
    error: ref(null),
    fetchStockReceiptNotes: fetchStockReceiptNotesMock,
    createStockReceiptNote: createStockReceiptNoteMock,
    updateStockReceiptNote: updateStockReceiptNoteMock,
    deleteStockReceiptNote: deleteStockReceiptNoteMock,
    generateNextGrnNumber: generateNextGrnNumberMock,
  }));
  return { useStockReceiptNotesStore };
});

vi.mock("@/stores/purchaseOrders", () => {
  const usePurchaseOrdersStore = defineStore("purchaseOrders", () => ({
    purchaseOrders: ref([
      {
        uuid: "po-1",
        po_number: "PO-1",
        project_uuid: "project-1",
        total_po_amount: 1200,
      },
    ]),
    fetchPurchaseOrders: fetchPurchaseOrdersMock,
  }));
  return { usePurchaseOrdersStore };
});

vi.mock("@/stores/projects", () => {
  const useProjectsStore = defineStore("projects", () => ({
    projects: computed(() => [
      {
        uuid: "project-1",
        project_name: "Project One",
        project_id: "PRJ-001",
        project_status: "In Progress",
        is_active: true,
      },
    ]),
    fetchProjectsMetadata: fetchProjectsMetadataMock,
  }));
  return { useProjectsStore };
});

vi.mock("@/composables/usePermissions", () => {
  return {
    usePermissions: () => ({
      hasPermission: vi.fn(() => true),
      isReady: ref(true),
    }),
  };
});

vi.mock("@/composables/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (value?: string) => value ?? "",
  }),
}));

vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
    formatCurrencyAbbreviated: (n: number) => {
      const num = Number(n || 0);
      if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `$${(num / 1000).toFixed(1)}k`;
      return `$${num.toFixed(2)}`;
    },
  }),
}));

vi.mock("@/composables/useUTCDateFormat", () => ({
  useUTCDateFormat: () => ({
    toUTCString: (value: string) => `${value}T00:00:00.000Z`,
    getCurrentLocal: () => "2024-05-01",
  }),
}));

vi.mock("@/composables/useTableStandard", () => {
  return {
    useTableStandard: () => {
      const pagination = ref({ pageSize: 10, page: 1 });
      return {
        pagination,
        paginationOptions: {},
        pageSizeOptions: [10, 25, 50],
        updatePageSize: vi.fn(),
        getPaginationProps: () => ({}),
        getPageInfo: () => ref("1-10 of 10"),
        shouldShowPagination: () => ref(false),
      };
    },
  };
});

const ReceiptNoteFormStub = {
  name: "ReceiptNoteForm",
  props: ["form"],
  emits: ["update:form"],
  template: `
    <div class="receipt-note-form-stub">
      <button
        data-test="set-form-values"
        type="button"
        @click="$emit('update:form', {
          ...form,
          project_uuid: 'project-1',
          purchase_order_uuid: 'po-1',
          entry_date: '2024-05-15T00:00:00.000Z',
          total_received_amount: 500
        })"
      >
        apply values
      </button>
    </div>
  `,
};

const uiStubs = {
  UInput: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template:
      '<input class="u-input-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  USelectMenu: {
    props: ["modelValue", "items"],
    emits: ["update:modelValue"],
    template:
      '<div class="u-select-menu-stub" @click="$emit(\'update:modelValue\', items?.[0] ?? null)"><slot /></div>',
  },
  USelect: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template:
      '<select class="u-select-stub" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  UButton: {
    emits: ["click"],
    template:
      '<button class="u-button-stub" type="button" @click="$emit(\'click\')"><slot /></button>',
  },
  UPageCard: { template: "<div class='u-page-card'><slot name='body' /></div>" },
  UTable: { template: "<div class='u-table-stub'><slot /></div>" },
  UCard: { template: "<div class='u-card-stub'><slot /></div>" },
  UBadge: { template: "<span class='u-badge-stub'><slot /></span>" },
  UAlert: { template: "<div class='u-alert-stub'><slot /></div>" },
  USkeleton: { template: "<div class='u-skeleton-stub' />" },
  UIcon: { template: "<i class='u-icon-stub'></i>" },
  UModal: {
    emits: ["update:open"],
    props: ["open"],
    template:
      '<div class="u-modal-stub"><slot name="header" /><slot name="body" /><slot name="footer" /></div>',
  },
  UPagination: { template: "<div class='u-pagination-stub'></div>" },
  UFileUpload: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template:
      '<div class="u-file-upload-stub"><slot :open="() => {}" /></div>',
  },
};

const mountList = () =>
  mount(ReceiptNoteList, {
    global: {
      stubs: {
        ...uiStubs,
        ReceiptNoteForm: ReceiptNoteFormStub,
      },
    },
  });

describe("ReceiptNoteList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    stockReceiptNotesState.value = [
      {
        uuid: "note-1",
        corporation_uuid: "corp-1",
        grn_number: "GRN-100",
        project_uuid: "project-1",
        purchase_order_uuid: "po-1",
        status: "Shipment",
        total_received_amount: 250,
        entry_date: "2024-05-10T00:00:00.000Z",
      },
    ];
    fetchStockReceiptNotesMock.mockResolvedValue(undefined);
    fetchPurchaseOrdersMock.mockResolvedValue(undefined);
    fetchProjectsMetadataMock.mockResolvedValue(undefined);
    createStockReceiptNoteMock.mockResolvedValue({
      uuid: "note-new",
      corporation_uuid: "corp-1",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not fetch receipt notes on mount (TopBar handles fetching)", async () => {
    mountList();
    await flushPromises();

    // TopBar handles fetching, so component should not fetch on mount
    expect(fetchStockReceiptNotesMock).not.toHaveBeenCalled();
    expect(fetchPurchaseOrdersMock).not.toHaveBeenCalled();
    expect(fetchProjectsMetadataMock).not.toHaveBeenCalled();
  });

  it("creates a new receipt note with corporation context when saved", async () => {
    const wrapper = mountList();
    await flushPromises();

    const addButton = wrapper
      .findAll("button.u-button-stub")
      .find((btn) => btn.text().includes("Add new Receipt Note"));
    expect(addButton).toBeTruthy();

    await addButton!.trigger("click");
    await flushPromises();

    const applyValuesButton = wrapper.find("[data-test='set-form-values']");
    await applyValuesButton.trigger("click");
    await flushPromises();

    const saveButton = wrapper
      .findAll("button.u-button-stub")
      .find((btn) => btn.text().trim() === "Save");
    expect(saveButton).toBeTruthy();

    await saveButton!.trigger("click");
    await flushPromises();

    expect(createStockReceiptNoteMock).toHaveBeenCalledTimes(1);
    expect(createStockReceiptNoteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        corporation_uuid: "corp-1",
        project_uuid: "project-1",
        purchase_order_uuid: "po-1",
        entry_date: "2024-05-15T00:00:00.000Z",
      })
    );
  });
});

describe("server/api/stock-receipt-notes", () => {
  const makeEvent = (method: string) =>
    ({
      node: {
        req: {
          method,
        },
      },
    } as any);

  const setupSupabaseStub = (handlers: Record<string, any>) => {
    const mockSupabaseServer = {
      from: vi.fn((table: string) => {
        if (handlers[table]) {
          return handlers[table];
        }
        if (table === "receipt_note_items" || table === "purchase_order_items_list" || table === "change_order_items_list") {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
            insert: vi.fn(() => Promise.resolve({ error: null, data: [] })),
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
            contains: vi.fn(() => Promise.resolve({ data: [], error: null })),
          };
        }
        if (table === "stock_receipt_notes") {
          // Default mock for stock_receipt_notes if not overridden
          // This should not be used when handlers[table] exists, but provide a fallback
          const defaultSelect = vi.fn((query?: string) => {
            // For generateNextGrnNumber: select("grn_number").eq().order().limit()
            if (query === "grn_number") {
              return {
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => Promise.resolve({ data: [{ grn_number: "GRN-000001" }], error: null })),
                  })),
                })),
              };
            }
            // For uuid conflict check: select("uuid").eq().eq().neq().maybeSingle()
            if (query === "uuid") {
              return {
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    neq: vi.fn(() => ({
                      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
                    })),
                  })),
                })),
              };
            }
            // For other selects
            return {
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
                  })),
                })),
                maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
                single: vi.fn(() => Promise.resolve({ data: null, error: null })),
              })),
            };
          });
          return {
            select: defaultSelect,
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: null, error: null })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: null, error: null })),
                })),
              })),
            })),
          };
        }
        if (table === "stock-receipt-note-documents") {
          return {
            upload: vi.fn(() => Promise.resolve({ error: null })),
            getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/file.pdf" } })),
            remove: vi.fn(() => Promise.resolve({ error: null })),
          };
        }
        return handlers.__default(table);
      }),
      storage: {
        from: vi.fn((bucket: string) => {
          if (bucket === "stock-receipt-note-documents") {
            return {
              upload: vi.fn(() => Promise.resolve({ error: null })),
              getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/file.pdf" } })),
              remove: vi.fn(() => Promise.resolve({ error: null })),
            };
          }
          return handlers.__default(bucket);
        }),
      },
    };
    vi.doMock("@/utils/supabaseServer", () => ({
      supabaseServer: mockSupabaseServer,
    }));
    return mockSupabaseServer;
  };

  const stubGlobals = () => {
    const mockDefineEventHandler = vi.fn((handler) => handler);
    const mockGetQuery = vi.fn();
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
    vi.stubGlobal("$fetch", vi.fn(() => Promise.resolve({})));

    return {
      mockDefineEventHandler,
      mockGetQuery,
      mockReadBody,
      mockCreateError,
    };
  };

  const noopBuilder = {
    select: vi.fn(() => ({
      ilike: vi.fn(() => ({
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a receipt note for purchase order with metadata", async () => {
    const globals = stubGlobals();
    const insertedRows: any[] = [];
    const selectWithMetadataSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              uuid: "rn-123",
              receipt_type: "purchase_order",
              project: {
                uuid: "proj-1",
                project_name: "Test Project",
                project_id: "PROJ-001",
              },
              purchase_order: {
                uuid: "po-1",
                po_number: "PO-001",
                vendor_uuid: "vendor-1",
              },
              change_order: null,
            },
            error: null,
          })
        ),
      })),
    }));
    const vendorSelectSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() =>
          Promise.resolve({
            data: { vendor_name: "Test Vendor" },
            error: null,
          })
        ),
      })),
    }));
    const insertSpy = vi.fn((rows: any[]) => {
      insertedRows.push(...rows);
      return {
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { uuid: "rn-123" },
              error: null,
            })
          ),
        })),
      };
    });

    setupSupabaseStub({
      stock_receipt_notes: {
        insert: insertSpy,
        select: vi.fn((query?: string) => {
          // If query is for grn_number (generateNextGrnNumber), return chain for GRN number generation
          // generateNextGrnNumber: select("grn_number").eq().order().limit()
          if (query === "grn_number") {
            return {
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({ data: [{ grn_number: "GRN-000001" }], error: null })),
                })),
              })),
            };
          }
          // If query is for uuid (conflict check in ensureUniqueGrnNumber)
          if (query === "uuid") {
            return {
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  neq: vi.fn(() => ({
                    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
                  })),
                })),
              })),
            };
          }
          // Otherwise return metadata spy
          return selectWithMetadataSpy();
        }),
      },
      vendors: {
        select: vendorSelectSpy,
      },
      __default: () => noopBuilder,
    });

    globals.mockReadBody.mockResolvedValue({
      corporation_uuid: "corp-1",
      receipt_type: "purchase_order",
      project_uuid: "proj-1",
      purchase_order_uuid: "po-1",
      entry_date: "2024-01-01T00:00:00.000Z",
    });

    const { default: handler } = await import(
      "@/server/api/stock-receipt-notes/index"
    );
    const response = await handler(makeEvent("POST"));

    expect(response.data.uuid).toBe("rn-123");
    expect(insertSpy).toHaveBeenCalledTimes(1);
    // Verify that select with JOINs was called to fetch metadata
    expect(selectWithMetadataSpy).toHaveBeenCalled();
    // Verify metadata fields are included in response
    expect((response.data as any).project_name).toBe("Test Project");
    expect((response.data as any).project_id).toBe("PROJ-001");
    expect((response.data as any).po_number).toBe("PO-001");
    expect((response.data as any).vendor_name).toBe("Test Vendor");
  });

  it("creates a receipt note for change order with metadata", async () => {
    const globals = stubGlobals();
    const insertedRows: any[] = [];
    const selectWithMetadataSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              uuid: "rn-456",
              receipt_type: "change_order",
              project: {
                uuid: "proj-2",
                project_name: "Another Project",
                project_id: "PROJ-002",
              },
              purchase_order: null,
              change_order: {
                uuid: "co-1",
                co_number: "CO-001",
                vendor_uuid: "vendor-2",
              },
            },
            error: null,
          })
        ),
      })),
    }));
    const vendorSelectSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() =>
          Promise.resolve({
            data: { vendor_name: "Another Vendor" },
            error: null,
          })
        ),
      })),
    }));
    const insertSpy = vi.fn((rows: any[]) => {
      insertedRows.push(...rows);
      return {
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { uuid: "rn-456" },
              error: null,
            })
          ),
        })),
      };
    });

    setupSupabaseStub({
      stock_receipt_notes: {
        insert: insertSpy,
        select: vi.fn((query?: string) => {
          // If query is for grn_number (generateNextGrnNumber), return chain for GRN number generation
          // generateNextGrnNumber: select("grn_number").eq().order().limit()
          if (query === "grn_number") {
            return {
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({ data: [{ grn_number: "GRN-000001" }], error: null })),
                })),
              })),
            };
          }
          // If query is for uuid (conflict check in ensureUniqueGrnNumber)
          if (query === "uuid") {
            return {
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  neq: vi.fn(() => ({
                    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
                  })),
                })),
              })),
            };
          }
          // Otherwise return metadata spy
          return selectWithMetadataSpy();
        }),
      },
      vendors: {
        select: vendorSelectSpy,
      },
      __default: () => noopBuilder,
    });

    globals.mockReadBody.mockResolvedValue({
      corporation_uuid: "corp-1",
      receipt_type: "change_order",
      project_uuid: "proj-2",
      change_order_uuid: "co-1",
      entry_date: "2024-01-02T00:00:00.000Z",
    });

    const { default: handler } = await import(
      "@/server/api/stock-receipt-notes/index"
    );
    const response = await handler(makeEvent("POST"));

    expect(response.data.uuid).toBe("rn-456");
    expect(insertSpy).toHaveBeenCalledTimes(1);
    // Verify that select with JOINs was called to fetch metadata
    expect(selectWithMetadataSpy).toHaveBeenCalled();
    // Verify metadata fields are included in response
    expect((response.data as any).project_name).toBe("Another Project");
    expect((response.data as any).project_id).toBe("PROJ-002");
    expect((response.data as any).co_number).toBe("CO-001");
    expect((response.data as any).vendor_name).toBe("Another Vendor");
  });

  it("includes metadata fields in PUT response for purchase order receipt", async () => {
    const globals = stubGlobals();
    let updatePayload: any = null;
    const selectWithMetadataSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              uuid: "rn-789",
              receipt_type: "purchase_order",
              project: {
                uuid: "proj-3",
                project_name: "Updated Project",
                project_id: "PROJ-003",
              },
              purchase_order: {
                uuid: "po-2",
                po_number: "PO-002",
                vendor_uuid: "vendor-3",
              },
              change_order: null,
            },
            error: null,
          })
        ),
      })),
    }));
    const vendorSelectSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() =>
          Promise.resolve({
            data: { vendor_name: "Updated Vendor" },
            error: null,
          })
        ),
      })),
    }));
    const eqSpy = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              uuid: "rn-789",
              receipt_type: "purchase_order",
              project_uuid: "proj-3",
              purchase_order_uuid: "po-2",
              corporation_uuid: "corp-1",
            },
            error: null,
          })
        ),
      })),
    }));
    const updateSpy = vi.fn((data: any) => {
      updatePayload = data;
      return {
        eq: eqSpy,
      };
    });
    const existingSelectSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() =>
          Promise.resolve({
            data: {
              uuid: "rn-789",
              receipt_type: "purchase_order",
              project_uuid: "proj-3",
              purchase_order_uuid: "po-2",
              corporation_uuid: "corp-1",
            },
            error: null,
          })
        ),
      })),
    }));

    setupSupabaseStub({
      stock_receipt_notes: {
        update: updateSpy,
        select: vi.fn((query?: string) => {
          // If query is for grn_number (generateNextGrnNumber), return chain for GRN number generation
          // generateNextGrnNumber: select("grn_number").eq().order().limit()
          if (query === "grn_number") {
            return {
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({ data: [{ grn_number: "GRN-000001" }], error: null })),
                })),
              })),
            };
          }
          // If query is for uuid (conflict check in ensureUniqueGrnNumber)
          if (query === "uuid") {
            return {
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  neq: vi.fn(() => ({
                    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
                  })),
                })),
              })),
            };
          }
          // If query includes JOINs (has commas), return metadata spy
          if (query && query.includes(',')) {
            return selectWithMetadataSpy();
          }
          // Otherwise return existing record spy
          return existingSelectSpy();
        }),
      },
      vendors: {
        select: vendorSelectSpy,
      },
      __default: () => noopBuilder,
    });

    globals.mockReadBody.mockResolvedValue({
      uuid: "rn-789",
      receipt_type: "purchase_order",
      project_uuid: "proj-3",
      purchase_order_uuid: "po-2",
      status: "Received",
    });

    const { default: handler } = await import(
      "@/server/api/stock-receipt-notes/index"
    );
    const response = await handler(makeEvent("PUT"));

    expect(response.data.uuid).toBe("rn-789");
    expect(updateSpy).toHaveBeenCalledTimes(1);
    // Verify that select with JOINs was called to fetch metadata
    expect(selectWithMetadataSpy).toHaveBeenCalled();
    // Verify metadata fields are included in response
    expect((response.data as any).project_name).toBe("Updated Project");
    expect((response.data as any).project_id).toBe("PROJ-003");
    expect((response.data as any).po_number).toBe("PO-002");
    expect((response.data as any).vendor_name).toBe("Updated Vendor");
  });

  it("includes metadata fields in PUT response for change order receipt", async () => {
    const globals = stubGlobals();
    let updatePayload: any = null;
    const selectWithMetadataSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              uuid: "rn-999",
              receipt_type: "change_order",
              project: {
                uuid: "proj-4",
                project_name: "CO Project",
                project_id: "PROJ-004",
              },
              purchase_order: null,
              change_order: {
                uuid: "co-2",
                co_number: "CO-002",
                vendor_uuid: "vendor-4",
              },
            },
            error: null,
          })
        ),
      })),
    }));
    const vendorSelectSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() =>
          Promise.resolve({
            data: { vendor_name: "CO Vendor" },
            error: null,
          })
        ),
      })),
    }));
    const eqSpy = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              uuid: "rn-999",
              receipt_type: "change_order",
              project_uuid: "proj-4",
              purchase_order_uuid: "co-2",
              corporation_uuid: "corp-1",
            },
            error: null,
          })
        ),
      })),
    }));
    const updateSpy = vi.fn((data: any) => {
      updatePayload = data;
      return {
        eq: eqSpy,
      };
    });
    const existingSelectSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() =>
          Promise.resolve({
            data: {
              uuid: "rn-999",
              receipt_type: "change_order",
              project_uuid: "proj-4",
              purchase_order_uuid: "co-2",
              corporation_uuid: "corp-1",
            },
            error: null,
          })
        ),
      })),
    }));

    setupSupabaseStub({
      stock_receipt_notes: {
        update: updateSpy,
        select: vi.fn((query?: string) => {
          // If query is for grn_number (generateNextGrnNumber), return chain for GRN number generation
          // generateNextGrnNumber: select("grn_number").eq().order().limit()
          if (query === "grn_number") {
            return {
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({ data: [{ grn_number: "GRN-000001" }], error: null })),
                })),
              })),
            };
          }
          // If query includes JOINs (has commas), return metadata spy
          if (query && query.includes(',')) {
            return selectWithMetadataSpy();
          }
          // Otherwise return existing record spy
          return existingSelectSpy();
        }),
      },
      vendors: {
        select: vendorSelectSpy,
      },
      __default: () => noopBuilder,
    });

    globals.mockReadBody.mockResolvedValue({
      uuid: "rn-999",
      receipt_type: "change_order",
      project_uuid: "proj-4",
      change_order_uuid: "co-2",
      status: "Received",
    });

    const { default: handler } = await import(
      "@/server/api/stock-receipt-notes/index"
    );
    const response = await handler(makeEvent("PUT"));

    expect(response.data.uuid).toBe("rn-999");
    expect(updateSpy).toHaveBeenCalledTimes(1);
    // Verify that select with JOINs was called to fetch metadata
    expect(selectWithMetadataSpy).toHaveBeenCalled();
    // Verify metadata fields are included in response
    expect((response.data as any).project_name).toBe("CO Project");
    expect((response.data as any).project_id).toBe("PROJ-004");
    expect((response.data as any).co_number).toBe("CO-002");
    expect((response.data as any).vendor_name).toBe("CO Vendor");
  });

  it("validates required fields on POST", async () => {
    const globals = stubGlobals();
    globals.mockReadBody.mockResolvedValue({});

    setupSupabaseStub({
      __default: () => noopBuilder,
    });

    const { default: handler } = await import(
      "@/server/api/stock-receipt-notes/index"
    );
    await expect(handler(makeEvent("POST"))).rejects.toThrow(
      "corporation_uuid is required"
    );
    expect(globals.mockCreateError).toHaveBeenCalledWith({
      statusCode: 400,
      statusMessage: "corporation_uuid is required",
    });
  });

  describe('Modal Close Watcher - Resource Cleanup', () => {
    it('clears purchase order resources when modal is closed via watcher', async () => {
      const globals = stubGlobals();
      setupSupabaseStub({
        stock_receipt_notes: { select: vi.fn(() => noopBuilder) },
        stock_return_notes: { select: vi.fn(() => noopBuilder) },
        __default: () => noopBuilder,
      });

      const wrapper = mount(ReceiptNoteList, {
        global: {
          plugins: [createPinia()],
          stubs: {
            UTable: true,
            UModal: true,
            UButton: true,
            UInput: true,
            UIcon: true,
            UPageCard: true,
            ReceiptNoteForm: true,
          },
        },
      });

      const vm: any = wrapper.vm as any;

      // Open modal
      vm.showFormModal = true;
      await wrapper.vm.$nextTick();

      // Clear spy
      clearPurchaseOrderResourcesSpy.mockClear();

      // Close modal via watcher (simulate ESC or outside click)
      vm.showFormModal = false;
      await wrapper.vm.$nextTick();

      // Should have cleared purchase order resources
      expect(clearPurchaseOrderResourcesSpy).toHaveBeenCalled();
    });

    it('clears resources when opening a new receipt note', async () => {
      const globals = stubGlobals();
      setupSupabaseStub({
        stock_receipt_notes: { select: vi.fn(() => noopBuilder) },
        stock_return_notes: { select: vi.fn(() => noopBuilder) },
        __default: () => noopBuilder,
      });

      const wrapper = mount(ReceiptNoteList, {
        global: {
          plugins: [createPinia()],
          stubs: {
            UTable: true,
            UModal: true,
            UButton: true,
            UInput: true,
            UIcon: true,
            UPageCard: true,
            ReceiptNoteForm: true,
          },
        },
      });

      const vm: any = wrapper.vm as any;

      clearPurchaseOrderResourcesSpy.mockClear();

      // Open create modal
      await vm.openCreateModal();
      await wrapper.vm.$nextTick();

      // Should have cleared resources
      expect(clearPurchaseOrderResourcesSpy).toHaveBeenCalled();
    });

    it('resets view mode when modal closes via watcher', async () => {
      const globals = stubGlobals();
      setupSupabaseStub({
        stock_receipt_notes: { select: vi.fn(() => noopBuilder) },
        stock_return_notes: { select: vi.fn(() => noopBuilder) },
        __default: () => noopBuilder,
      });

      const wrapper = mount(ReceiptNoteList, {
        global: {
          plugins: [createPinia()],
          stubs: {
            UTable: true,
            UModal: true,
            UButton: true,
            UInput: true,
            UIcon: true,
            UPageCard: true,
            ReceiptNoteForm: true,
          },
        },
      });

      const vm: any = wrapper.vm as any;

      // Set view mode
      vm.isViewMode = true;
      vm.showFormModal = true;
      await wrapper.vm.$nextTick();

      // Close via watcher
      vm.showFormModal = false;
      await wrapper.vm.$nextTick();

      // View mode should be reset
      expect(vm.isViewMode).toBe(false);
    });
  });
});

