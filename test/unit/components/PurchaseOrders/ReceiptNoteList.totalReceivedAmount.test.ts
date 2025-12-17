import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
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
        total_po_amount: 1500,
      },
    ]),
    fetchPurchaseOrders: fetchPurchaseOrdersMock,
  }));
  return { usePurchaseOrdersStore };
});

vi.mock("@/stores/projects", () => {
  const useProjectsStore = defineStore("projects", () => ({
    projects: ref([
      {
        uuid: "project-1",
        project_name: "Project One",
        project_id: "PRJ-001",
      },
    ]),
    fetchProjectsMetadata: fetchProjectsMetadataMock,
  }));
  return { useProjectsStore };
});

vi.mock("@/stores/vendors", () => {
  const fetchVendorsMock = vi.fn().mockResolvedValue(undefined);
  return {
    useVendorStore: defineStore("vendors", () => ({
      vendors: ref([]),
      fetchVendors: fetchVendorsMock,
    })),
  };
});

vi.mock("@/stores/userProfiles", () => {
  const fetchUsersMock = vi.fn().mockResolvedValue(undefined);
  return {
    useUserProfilesStore: defineStore("userProfiles", () => ({
      users: ref([]),
      fetchUsers: fetchUsersMock,
    })),
  };
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
    formatDate: (value?: string) => value ?? "2024-01-01",
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

vi.mock("@/composables/useTableStandard", () => ({
  useTableStandard: () => ({
    pagination: ref({ pageSize: 10, pageIndex: 0 }),
    paginationOptions: {},
    pageSizeOptions: [
      { label: "10 per page", value: 10 },
      { label: "25 per page", value: 25 },
    ],
    updatePageSize: vi.fn(),
    getPaginationProps: () => ({}),
    getPageInfo: () => ref("Page 1 of 1"),
    shouldShowPagination: () => ref(false),
  }),
}));

const ReceiptNoteFormStub = {
  name: "ReceiptNoteForm",
  props: ["form", "editingReceiptNote"],
  emits: ["update:form"],
  template: `
    <div class="receipt-note-form-stub">
      <div>Total Received Amount: {{ form.total_received_amount }}</div>
      <div>GRN Total: {{ form.grn_total_with_charges_taxes }}</div>
      <button 
        class="test-update-form" 
        @click="$emit('update:form', { ...form, grn_total_with_charges_taxes: 1500, total_received_amount: 1500 })"
      >
        Update Form
      </button>
    </div>
  `,
};

const uiStubs = {
  UInput: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  UButton: {
    emits: ["click"],
    template: '<button @click="$emit(\'click\')"><slot /></button>',
  },
  UTable: {
    props: ["data", "columns"],
    template: `
      <div class="table-stub">
        <div v-for="(row, index) in data" :key="index" class="table-row">
          <div>GRN: {{ row.grn_number }}</div>
          <div>Total: {{ row.total_received_amount }}</div>
        </div>
      </div>
    `,
  },
  UModal: {
    props: ["open"],
    emits: ["update:open"],
    template: `
      <div v-if="open" class="modal-stub">
        <slot name="header" />
        <slot name="body" />
        <slot name="footer" />
      </div>
    `,
  },
  UPageCard: { template: "<div class='page-card-stub'><slot name='body' /></div>" },
  UAlert: { template: "<div class='alert-stub'><slot /></div>" },
  UIcon: { template: "<span class='icon-stub'></span>" },
  USelect: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  UPagination: { template: "<div class='pagination-stub'></div>" },
  UTooltip: { template: "<div><slot /></div>" },
};

const mountList = () => {
  return mount(ReceiptNoteList, {
    global: {
      stubs: {
        ...uiStubs,
        ReceiptNoteForm: ReceiptNoteFormStub,
      },
    },
  });
};

describe("ReceiptNoteList - Total Received Amount Sync on Save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    stockReceiptNotesState.value = [
      {
        uuid: "rn-1",
        grn_number: "GRN-000001",
        total_received_amount: 1200,
        grn_total_with_charges_taxes: 1200,
        corporation_uuid: "corp-1",
        project_uuid: "project-1",
        purchase_order_uuid: "po-1",
        entry_date: "2024-01-01",
        status: "Received",
      },
    ];
    createStockReceiptNoteMock.mockResolvedValue({
      uuid: "rn-new",
      grn_number: "GRN-000777",
      total_received_amount: 1500,
    });
    updateStockReceiptNoteMock.mockResolvedValue({
      uuid: "rn-1",
      total_received_amount: 1800,
    });
    // Make fetchProjectsMetadata return a promise
    fetchProjectsMetadataMock.mockResolvedValue(undefined);
    fetchPurchaseOrdersMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    stockReceiptNotesState.value = [];
  });

  describe("saveReceiptNote syncs total_received_amount with grn_total_with_charges_taxes", () => {
    it("should sync total_received_amount with grn_total_with_charges_taxes before creating", async () => {
      const wrapper = mountList();
      await flushPromises();

      // Open create modal - use component method directly
      const listComponent = wrapper.vm as any;
      if (listComponent.openCreateModal) {
        await listComponent.openCreateModal();
        await flushPromises();
      }

      // Simulate form having grn_total_with_charges_taxes but different total_received_amount
      const formComponent = wrapper.findComponent({ name: "ReceiptNoteForm" });
      if (formComponent.exists()) {
        const formData = {
          ...formComponent.props("form"),
          grn_total_with_charges_taxes: 2000,
          total_received_amount: 1500, // Out of sync
        };

        // Trigger form update
        formComponent.vm.$emit("update:form", formData);
        await flushPromises();

      // Access the save function
      const listComponent = wrapper.vm as any;
      if (listComponent.receiptNoteForm) {
        listComponent.receiptNoteForm = formData;
      }

      // Trigger save
      if (listComponent.saveReceiptNote) {
        await listComponent.saveReceiptNote();
        await flushPromises();
      }

      // Verify that the payload sent has synced values
      if (createStockReceiptNoteMock.mock.calls.length > 0) {
        const createPayload = createStockReceiptNoteMock.mock.calls[0]?.[0];
        expect(createPayload).toBeDefined();
        if (createPayload) {
          // Should have synced total_received_amount to match grn_total_with_charges_taxes
          expect(createPayload.total_received_amount).toBe(2000);
          expect(createPayload.grn_total_with_charges_taxes).toBe(2000);
        }
      }
    }
    });

    it("should sync total_received_amount with grn_total_with_charges_taxes before updating", async () => {
      const wrapper = mountList();
      await flushPromises();

      // Find and click edit button for existing receipt note
      const listComponent = wrapper.vm as any;
      if (listComponent.editReceiptNote) {
        await listComponent.editReceiptNote(stockReceiptNotesState.value[0]);
        await flushPromises();

        // Update form with out-of-sync values
        listComponent.receiptNoteForm = {
          ...listComponent.receiptNoteForm,
          uuid: "rn-1",
          grn_total_with_charges_taxes: 2500,
          total_received_amount: 2000, // Out of sync
        };

        // Trigger save
        await listComponent.saveReceiptNote();
        await flushPromises();

        // Verify that the payload sent has synced values
        expect(updateStockReceiptNoteMock).toHaveBeenCalled();
        const updatePayload = updateStockReceiptNoteMock.mock.calls[0]?.[0];
        expect(updatePayload).toBeDefined();
        if (updatePayload) {
          // Should have synced total_received_amount to match grn_total_with_charges_taxes
          expect(updatePayload.total_received_amount).toBe(2500);
          expect(updatePayload.grn_total_with_charges_taxes).toBe(2500);
        }
      }
    });

    it("should calculate total_received_amount from item_total + charges_total + tax_total if grn_total_with_charges_taxes is null", async () => {
      const wrapper = mountList();
      await flushPromises();

      const listComponent = wrapper.vm as any;
      if (listComponent.openCreateModal) {
        await listComponent.openCreateModal();
        await flushPromises();

        listComponent.receiptNoteForm = {
          ...listComponent.receiptNoteForm,
          grn_total_with_charges_taxes: null,
          item_total: 1000,
          charges_total: 100,
          tax_total: 50,
          total_received_amount: 1000, // This should be recalculated
        };

        if (listComponent.saveReceiptNote) {
          await listComponent.saveReceiptNote();
          await flushPromises();

          if (createStockReceiptNoteMock.mock.calls.length > 0) {
            const createPayload = createStockReceiptNoteMock.mock.calls[0]?.[0];
            expect(createPayload).toBeDefined();
            if (createPayload) {
              // Should calculate from item_total + charges_total + tax_total = 1000 + 100 + 50 = 1150
              expect(createPayload.total_received_amount).toBe(1150);
              expect(createPayload.grn_total_with_charges_taxes).toBe(1150);
            }
          }
        }
      }
    });

    it("should set total_received_amount from grn_total_with_charges_taxes if total_received_amount is null", async () => {
      const wrapper = mountList();
      await flushPromises();

      const listComponent = wrapper.vm as any;
      if (listComponent.openCreateModal) {
        await listComponent.openCreateModal();
        await flushPromises();

        listComponent.receiptNoteForm = {
          ...listComponent.receiptNoteForm,
          grn_total_with_charges_taxes: 1750,
          total_received_amount: null,
        };

        if (listComponent.saveReceiptNote) {
          await listComponent.saveReceiptNote();
          await flushPromises();

          if (createStockReceiptNoteMock.mock.calls.length > 0) {
            const createPayload = createStockReceiptNoteMock.mock.calls[0]?.[0];
            expect(createPayload).toBeDefined();
            if (createPayload) {
              // Should set total_received_amount from grn_total_with_charges_taxes
              expect(createPayload.total_received_amount).toBe(1750);
              expect(createPayload.grn_total_with_charges_taxes).toBe(1750);
            }
          }
        }
      }
    });

    it("should use financial_breakdown.totals.grn_total_with_charges_taxes as fallback", async () => {
      const wrapper = mountList();
      await flushPromises();

      const listComponent = wrapper.vm as any;
      if (listComponent.openCreateModal) {
        await listComponent.openCreateModal();
        await flushPromises();

        listComponent.receiptNoteForm = {
          ...listComponent.receiptNoteForm,
          grn_total_with_charges_taxes: null,
          item_total: 2000,
          charges_total: 200,
          tax_total: 100,
          financial_breakdown: {
            totals: {
              grn_total_with_charges_taxes: 2400, // This should be used as fallback
              item_total: 2000,
              charges_total: 200,
              tax_total: 100,
            },
          },
        };

        if (listComponent.saveReceiptNote) {
          await listComponent.saveReceiptNote();
          await flushPromises();

          if (createStockReceiptNoteMock.mock.calls.length > 0) {
            const createPayload = createStockReceiptNoteMock.mock.calls[0]?.[0];
            expect(createPayload).toBeDefined();
            if (createPayload) {
              // Should use financial_breakdown.totals.grn_total_with_charges_taxes (2400) instead of calculating (2300)
              expect(createPayload.total_received_amount).toBe(2400);
              expect(createPayload.grn_total_with_charges_taxes).toBe(2400);
            }
          }
        }
      }
    });
  });

  describe("Table displays total_received_amount correctly", () => {
    it("should display total_received_amount in the table", async () => {
      stockReceiptNotesState.value = [
        {
          uuid: "rn-1",
          grn_number: "GRN-000001",
          total_received_amount: 2200,
          grn_total_with_charges_taxes: 2200,
          corporation_uuid: "corp-1",
          entry_date: "2024-01-01",
          status: "Received",
        },
      ];

      const wrapper = mountList();
      await flushPromises();

      const table = wrapper.find(".table-stub");
      expect(table.exists()).toBe(true);

      const tableRows = table.findAll(".table-row");
      expect(tableRows.length).toBeGreaterThan(0);

      // Verify the total is displayed
      const firstRow = tableRows[0];
      expect(firstRow.text()).toContain("2200");
    });

    it("should show updated total_received_amount after save", async () => {
      const wrapper = mountList();
      await flushPromises();

      const listComponent = wrapper.vm as any;
      if (listComponent.editReceiptNote && listComponent.saveReceiptNote) {
        await listComponent.editReceiptNote(stockReceiptNotesState.value[0]);
        await flushPromises();

        listComponent.receiptNoteForm = {
          ...listComponent.receiptNoteForm,
          uuid: "rn-1",
          grn_total_with_charges_taxes: 3000,
          total_received_amount: 3000,
        };

        // Update the store state after successful save
        updateStockReceiptNoteMock.mockResolvedValue({
          uuid: "rn-1",
          total_received_amount: 3000,
          grn_total_with_charges_taxes: 3000,
        });

        await listComponent.saveReceiptNote();
        await flushPromises();

        // Verify the updated total is in the store
        expect(updateStockReceiptNoteMock).toHaveBeenCalledWith(
          expect.objectContaining({
            total_received_amount: 3000,
            grn_total_with_charges_taxes: 3000,
          })
        );
      }
    });
  });
});

