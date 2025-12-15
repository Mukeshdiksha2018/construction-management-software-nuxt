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

const mockToast = {
  add: vi.fn(),
};

vi.stubGlobal("useToast", () => mockToast);

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

// Create a mock ReceiptNoteForm that can expose validation state
const createReceiptNoteFormStub = (overReceivedItems: any[] = [], hasOverReceived: boolean = false, validationError: string | null = null) => {
  return {
    name: "ReceiptNoteForm",
    props: ["form"],
    emits: ["update:form"],
    setup(props: any, { expose }: any) {
      expose({
        hasOverReceivedItems: hasOverReceived,
        overReceivedItems,
        overReceivedValidationError: validationError,
        validateReceivedQuantities: () => !hasOverReceived,
      });
      return {};
    },
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
};

const uiStubs = {
  UInput: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<input class="u-input-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  USelectMenu: {
    props: ["modelValue", "items"],
    emits: ["update:modelValue"],
    template: '<div class="u-select-menu-stub" @click="$emit(\'update:modelValue\', items?.[0] ?? null)"><slot /></div>',
  },
  USelect: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<select class="u-select-stub" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  UButton: {
    emits: ["click"],
    template: '<button class="u-button-stub" type="button" @click="$emit(\'click\')"><slot /></button>',
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
    template: '<div class="u-modal-stub"><slot name="header" /><slot name="body" /><slot name="footer" /></div>',
  },
  UPagination: { template: "<div class='u-pagination-stub'></div>" },
  UFileUpload: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<div class="u-file-upload-stub"><slot :open="() => {}" /></div>',
  },
};

const mountList = (formStub: any = createReceiptNoteFormStub()) =>
  mount(ReceiptNoteList, {
    global: {
      stubs: {
        ...uiStubs,
        ReceiptNoteForm: formStub,
      },
    },
  });

describe("ReceiptNoteList - Over-Received Quantity Validation", () => {
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

  describe("saveReceiptNote - Over-Received Validation", () => {
    it("should prevent saving when hasOverReceivedItems is true", async () => {
      const overReceivedItems = [
        {
          id: "item-1",
          ordered_quantity: 10,
          received_quantity: 15,
          item_name: "Item 1",
        },
      ];
      const validationError = "Cannot save receipt note: 1 item(s) have received quantity greater than ordered quantity. \"Item 1\" (Ordered: 10, Received: 15)";

      const formStub = createReceiptNoteFormStub(overReceivedItems, true, validationError);
      const wrapper = mountList(formStub);
      await flushPromises();

      // Open the form
      const addButton = wrapper
        .findAll("button.u-button-stub")
        .find((btn) => btn.text().includes("Add new Receipt Note"));
      await addButton!.trigger("click");
      await flushPromises();

      // Set form values
      const applyValuesButton = wrapper.find("[data-test='set-form-values']");
      await applyValuesButton.trigger("click");
      await flushPromises();

      // Try to save
      const saveButton = wrapper
        .findAll("button.u-button-stub")
        .find((btn) => btn.text().trim() === "Save");
      await saveButton!.trigger("click");
      await flushPromises();

      // Should not call createStockReceiptNote
      expect(createStockReceiptNoteMock).not.toHaveBeenCalled();

      // Should show error toast
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: validationError,
          color: "error",
        })
      );
    });

    it("should allow saving when hasOverReceivedItems is false", async () => {
      const formStub = createReceiptNoteFormStub([], false, null);
      const wrapper = mountList(formStub);
      await flushPromises();

      // Open the form
      const addButton = wrapper
        .findAll("button.u-button-stub")
        .find((btn) => btn.text().includes("Add new Receipt Note"));
      await addButton!.trigger("click");
      await flushPromises();

      // Set form values
      const applyValuesButton = wrapper.find("[data-test='set-form-values']");
      await applyValuesButton.trigger("click");
      await flushPromises();

      // Try to save
      const saveButton = wrapper
        .findAll("button.u-button-stub")
        .find((btn) => btn.text().trim() === "Save");
      await saveButton!.trigger("click");
      await flushPromises();

      // Should call createStockReceiptNote
      expect(createStockReceiptNoteMock).toHaveBeenCalled();
    });

    it("should show default error message when validationError is not provided", async () => {
      const formStub = createReceiptNoteFormStub([{ id: "item-1" }], true, null);
      const wrapper = mountList(formStub);
      await flushPromises();

      // Open the form
      const addButton = wrapper
        .findAll("button.u-button-stub")
        .find((btn) => btn.text().includes("Add new Receipt Note"));
      await addButton!.trigger("click");
      await flushPromises();

      // Set form values
      const applyValuesButton = wrapper.find("[data-test='set-form-values']");
      await applyValuesButton.trigger("click");
      await flushPromises();

      // Try to save
      const saveButton = wrapper
        .findAll("button.u-button-stub")
        .find((btn) => btn.text().trim() === "Save");
      await saveButton!.trigger("click");
      await flushPromises();

      // Should show default error message
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: expect.stringContaining("Cannot save receipt note"),
          color: "error",
        })
      );
    });

    it("should check validation before checking for shortfall quantities", async () => {
      const overReceivedItems = [
        {
          id: "item-1",
          ordered_quantity: 10,
          received_quantity: 15,
          item_name: "Item 1",
        },
      ];
      const validationError = "Cannot save receipt note: 1 item(s) have received quantity greater than ordered quantity.";

      const formStub = createReceiptNoteFormStub(overReceivedItems, true, validationError);
      const wrapper = mountList(formStub);
      await flushPromises();

      // Open the form
      const addButton = wrapper
        .findAll("button.u-button-stub")
        .find((btn) => btn.text().includes("Add new Receipt Note"));
      await addButton!.trigger("click");
      await flushPromises();

      // Set form values
      const applyValuesButton = wrapper.find("[data-test='set-form-values']");
      await applyValuesButton.trigger("click");
      await flushPromises();

      // Try to save
      const saveButton = wrapper
        .findAll("button.u-button-stub")
        .find((btn) => btn.text().trim() === "Save");
      await saveButton!.trigger("click");
      await flushPromises();

      // Should not call createStockReceiptNote (validation should prevent it)
      expect(createStockReceiptNoteMock).not.toHaveBeenCalled();

      // Should show error toast
      expect(mockToast.add).toHaveBeenCalled();
    });

    it("should handle case when receiptNoteFormRef is null", async () => {
      const wrapper = mountList();
      await flushPromises();

      // Open the form
      const addButton = wrapper
        .findAll("button.u-button-stub")
        .find((btn) => btn.text().includes("Add new Receipt Note"));
      await addButton!.trigger("click");
      await flushPromises();

      // Set form values
      const applyValuesButton = wrapper.find("[data-test='set-form-values']");
      await applyValuesButton.trigger("click");
      await flushPromises();

      // Try to save - should not crash even if ref is null
      const saveButton = wrapper
        .findAll("button.u-button-stub")
        .find((btn) => btn.text().trim() === "Save");
      
      // This should not throw an error
      await expect(saveButton!.trigger("click")).resolves.not.toThrow();
    });
  });
});

