import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref, computed } from "vue";
import { createPinia, defineStore, setActivePinia } from "pinia";
import ReceiptNoteList from "@/components/PurchaseOrders/ReceiptNoteList.vue";

/**
 * Test for PO/CO status refresh when receipt note is saved and PO/CO is marked as Completed
 * This test covers the fix where saving a receipt note (without shortfall) should
 * refresh the Purchase Order or Change Order in the store/IndexedDB when the corporation matches.
 */

const fetchStockReceiptNotesMock = vi.fn();
const createStockReceiptNoteMock = vi.fn();
const updateStockReceiptNoteMock = vi.fn();
const fetchPurchaseOrderMock = vi.fn();
const fetchChangeOrderMock = vi.fn();
const updatePurchaseOrderInListMock = vi.fn();
const updateChangeOrderInListMock = vi.fn();

const stockReceiptNotesState = ref<any[]>([]);
const purchaseOrdersState = ref<any[]>([]);
const changeOrdersState = ref<any[]>([]);

vi.stubGlobal("useToast", () => ({
  add: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

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
    deleteStockReceiptNote: vi.fn(),
    generateNextGrnNumber: vi.fn(() => "GRN-1"),
  }));
  return { useStockReceiptNotesStore };
});

vi.mock("@/stores/purchaseOrders", () => {
  const usePurchaseOrdersStore = defineStore("purchaseOrders", () => ({
    purchaseOrders: purchaseOrdersState,
    loading: ref(false),
    error: ref(null),
    fetchPurchaseOrders: vi.fn(),
    fetchPurchaseOrder: fetchPurchaseOrderMock,
    updatePurchaseOrderInList: updatePurchaseOrderInListMock,
  }));
  return { usePurchaseOrdersStore };
});

vi.mock("@/stores/changeOrders", () => {
  const useChangeOrdersStore = defineStore("changeOrders", () => ({
    changeOrders: changeOrdersState,
    loading: ref(false),
    error: ref(null),
    fetchChangeOrders: vi.fn(),
    fetchChangeOrder: fetchChangeOrderMock,
    updateChangeOrderInList: updateChangeOrderInListMock,
  }));
  return { useChangeOrdersStore };
});

vi.mock("@/stores/projects", () => {
  const useProjectsStore = defineStore("projects", () => ({
    projects: computed(() => [
      {
        uuid: "project-1",
        project_name: "Project One",
        project_id: "PRJ-001",
      },
    ]),
    fetchProjectsMetadata: vi.fn().mockResolvedValue(undefined),
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

// Mock ReceiptNoteForm without shortfall items
const ReceiptNoteFormStub = {
  name: "ReceiptNoteForm",
  props: ["form", "editingReceiptNote", "readonly"],
  emits: ["update:form"],
  setup(props: any, { expose }: any) {
    const hasShortfallItems = computed(() => false);
    const shortfallItems = computed(() => []);
    const hasOverReceivedItems = computed(() => false);

    expose({
      shortfallItems,
      hasShortfallItems,
      hasOverReceivedItems,
    });

    return {};
  },
  template: `
    <div class="receipt-note-form-stub">
      <slot />
    </div>
  `,
};

const uiStubs = {
  UInput: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  USelectMenu: {
    props: ["modelValue", "items"],
    emits: ["update:modelValue"],
    template: '<div @click="$emit(\'update:modelValue\', items?.[0] ?? null)"><slot /></div>',
  },
  USelect: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  UButton: {
    emits: ["click"],
    template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
  },
  UPageCard: { template: "<div><slot name='body' /></div>" },
  UTable: { template: "<div><slot /></div>" },
  UBadge: { template: "<span><slot /></span>" },
  UAlert: { template: "<div><slot /></div>" },
  USkeleton: { template: "<div />" },
  UIcon: { template: "<i></i>" },
  UModal: {
    emits: ["update:open"],
    props: ["open"],
    template: '<div class="u-modal-stub" :class="{ hidden: !open }"><slot name="header" /><slot name="body" /><slot name="footer" /></div>',
  },
  UPagination: { template: "<div></div>" },
  UTooltip: { template: "<div><slot /></div>" },
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

describe("ReceiptNoteList - PO/CO Completion Refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    stockReceiptNotesState.value = [];
    purchaseOrdersState.value = [
      {
        uuid: "po-1",
        po_number: "PO-1",
        project_uuid: "project-1",
        corporation_uuid: "corp-1",
        total_po_amount: 1200,
        status: "Approved",
      },
    ];
    changeOrdersState.value = [
      {
        uuid: "co-1",
        co_number: "CO-1",
        project_uuid: "project-1",
        corporation_uuid: "corp-1",
        total_co_amount: 800,
        status: "Approved",
      },
    ];
    fetchStockReceiptNotesMock.mockResolvedValue(undefined);
    createStockReceiptNoteMock.mockResolvedValue({
      uuid: "rn-new",
      corporation_uuid: "corp-1",
    });
    updateStockReceiptNoteMock.mockResolvedValue(undefined);
    mockFetch.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Purchase Order refresh when marked as Completed", () => {
    it("should fetch and update PO in store/IndexedDB when marked as Completed (corporation matches)", async () => {
      const wrapper = mountList();
      await flushPromises();

      // Mock the updated PO with Completed status
      const updatedPO = {
        uuid: "po-1",
        po_number: "PO-1",
        project_uuid: "project-1",
        corporation_uuid: "corp-1",
        total_po_amount: 1200,
        status: "Completed", // Status updated after receipt note save
      };

      fetchPurchaseOrderMock.mockResolvedValue(updatedPO);

      // Access the component instance to call performSaveReceiptNote
      const vm = wrapper.vm as any;

      // Set up receipt note form data (no shortfall - all items fully received)
      vm.receiptNoteForm = {
        receipt_type: "purchase_order",
        purchase_order_uuid: "po-1",
        change_order_uuid: null,
        project_uuid: "project-1",
        corporation_uuid: "corp-1", // Match TopBar's selectedCorporationId
        grn_number: "GRN-1",
        entry_date: "2024-05-01T00:00:00.000Z",
        status: "Received",
        receipt_items: [
          {
            uuid: "item-1",
            item_name: "Test Item",
            received_quantity: 100,
            ordered_quantity: 100,
            unit_price: 10,
            received_total: 1000,
          },
        ],
        total_received_amount: 1000,
        grn_total_with_charges_taxes: 1000,
      };

      // Call performSaveReceiptNote with saveAsOpenPO = false (normal save)
      await vm.performSaveReceiptNote(false);
      await flushPromises();

      // Verify receipt note was created
      expect(createStockReceiptNoteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          corporation_uuid: "corp-1",
          purchase_order_uuid: "po-1",
          receipt_type: "purchase_order",
          save_as_open_po: false,
        })
      );

      // Verify that fetchPurchaseOrder was called with the correct PO UUID
      expect(fetchPurchaseOrderMock).toHaveBeenCalledWith("po-1");

      // Verify that updatePurchaseOrderInList was called with the updated PO
      expect(updatePurchaseOrderInListMock).toHaveBeenCalledWith(updatedPO);
    });

    it("should NOT refresh PO when corporation does not match", async () => {
      const wrapper = mountList();
      await flushPromises();

      fetchPurchaseOrderMock.mockResolvedValue({
        uuid: "po-1",
        status: "Completed",
      });

      const vm = wrapper.vm as any;

      // Set form's corporation to different corporation
      vm.receiptNoteForm = {
        receipt_type: "purchase_order",
        purchase_order_uuid: "po-1",
        change_order_uuid: null,
        project_uuid: "project-1",
        corporation_uuid: "corp-2", // Different from TopBar's selectedCorporationId ("corp-1")
        grn_number: "GRN-1",
        entry_date: "2024-05-01T00:00:00.000Z",
        status: "Received",
        receipt_items: [],
        total_received_amount: 1000,
      };

      await vm.performSaveReceiptNote(false);
      await flushPromises();

      // Verify receipt note was still created
      expect(createStockReceiptNoteMock).toHaveBeenCalled();

      // Verify that fetchPurchaseOrder was NOT called (corporation mismatch)
      expect(fetchPurchaseOrderMock).not.toHaveBeenCalled();

      // Verify that updatePurchaseOrderInList was NOT called
      expect(updatePurchaseOrderInListMock).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully when PO fetch fails", async () => {
      const wrapper = mountList();
      await flushPromises();

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      fetchPurchaseOrderMock.mockRejectedValue(new Error("Failed to fetch PO"));

      const vm = wrapper.vm as any;
      vm.receiptNoteForm = {
        receipt_type: "purchase_order",
        purchase_order_uuid: "po-1",
        change_order_uuid: null,
        project_uuid: "project-1",
        corporation_uuid: "corp-1", // Match TopBar's selectedCorporationId
        grn_number: "GRN-1",
        entry_date: "2024-05-01T00:00:00.000Z",
        status: "Received",
        receipt_items: [],
        total_received_amount: 1000,
      };

      await vm.performSaveReceiptNote(false);
      await flushPromises();

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ReceiptNoteList] Failed to refresh purchase order after completion check:",
        expect.any(Error)
      );

      // Verify receipt note was still created despite error
      expect(createStockReceiptNoteMock).toHaveBeenCalled();

      // Verify updatePurchaseOrderInList was NOT called (because fetch failed)
      expect(updatePurchaseOrderInListMock).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should NOT refresh PO when saveAsOpenPO is true (should refresh for Partially_Received instead)", async () => {
      const wrapper = mountList();
      await flushPromises();

      const updatedPO = {
        uuid: "po-1",
        status: "Partially_Received",
      };

      fetchPurchaseOrderMock.mockResolvedValue(updatedPO);

      const vm = wrapper.vm as any;
      vm.receiptNoteForm = {
        receipt_type: "purchase_order",
        purchase_order_uuid: "po-1",
        change_order_uuid: null,
        project_uuid: "project-1",
        corporation_uuid: "corp-1",
        grn_number: "GRN-1",
        entry_date: "2024-05-01T00:00:00.000Z",
        status: "Received",
        receipt_items: [],
        total_received_amount: 1000,
      };

      // Call with saveAsOpenPO = true (should refresh for Partially_Received, not Completed)
      await vm.performSaveReceiptNote(true);
      await flushPromises();

      // Verify fetchPurchaseOrder was called (for Partially_Received refresh)
      expect(fetchPurchaseOrderMock).toHaveBeenCalledWith("po-1");

      // Verify updatePurchaseOrderInList was called (for Partially_Received)
      expect(updatePurchaseOrderInListMock).toHaveBeenCalledWith(updatedPO);
    });
  });

  describe("Change Order refresh when marked as Completed", () => {
    it("should fetch and update CO in store/IndexedDB when marked as Completed (corporation matches)", async () => {
      const wrapper = mountList();
      await flushPromises();

      // Mock the updated CO with Completed status
      const updatedCO = {
        uuid: "co-1",
        co_number: "CO-1",
        project_uuid: "project-1",
        corporation_uuid: "corp-1",
        total_co_amount: 800,
        status: "Completed", // Status updated after receipt note save
      };

      fetchChangeOrderMock.mockResolvedValue(updatedCO);

      const vm = wrapper.vm as any;

      // Set up receipt note form data for change order (no shortfall)
      vm.receiptNoteForm = {
        receipt_type: "change_order",
        purchase_order_uuid: null,
        change_order_uuid: "co-1",
        project_uuid: "project-1",
        corporation_uuid: "corp-1", // Match TopBar's selectedCorporationId
        grn_number: "GRN-1",
        entry_date: "2024-05-01T00:00:00.000Z",
        status: "Received",
        receipt_items: [
          {
            uuid: "item-1",
            item_name: "Test Item",
            received_quantity: 50,
            ordered_quantity: 50,
            unit_price: 8,
            received_total: 400,
          },
        ],
        total_received_amount: 400,
        grn_total_with_charges_taxes: 400,
      };

      // Call performSaveReceiptNote with saveAsOpenPO = false (normal save)
      await vm.performSaveReceiptNote(false);
      await flushPromises();

      // Verify receipt note was created
      expect(createStockReceiptNoteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          corporation_uuid: "corp-1",
          change_order_uuid: "co-1",
          receipt_type: "change_order",
          save_as_open_po: false,
        })
      );

      // Verify that fetchChangeOrder was called with the correct CO UUID
      expect(fetchChangeOrderMock).toHaveBeenCalledWith("co-1");

      // Verify that updateChangeOrderInList was called with the updated CO
      expect(updateChangeOrderInListMock).toHaveBeenCalledWith(updatedCO);
    });

    it("should NOT refresh CO when corporation does not match", async () => {
      const wrapper = mountList();
      await flushPromises();

      fetchChangeOrderMock.mockResolvedValue({
        uuid: "co-1",
        status: "Completed",
      });

      const vm = wrapper.vm as any;

      // Set form's corporation to different corporation
      vm.receiptNoteForm = {
        receipt_type: "change_order",
        purchase_order_uuid: null,
        change_order_uuid: "co-1",
        project_uuid: "project-1",
        corporation_uuid: "corp-2", // Different from TopBar's selectedCorporationId
        grn_number: "GRN-1",
        entry_date: "2024-05-01T00:00:00.000Z",
        status: "Received",
        receipt_items: [],
        total_received_amount: 400,
      };

      await vm.performSaveReceiptNote(false);
      await flushPromises();

      // Verify receipt note was still created
      expect(createStockReceiptNoteMock).toHaveBeenCalled();

      // Verify that fetchChangeOrder was NOT called (corporation mismatch)
      expect(fetchChangeOrderMock).not.toHaveBeenCalled();

      // Verify that updateChangeOrderInList was NOT called
      expect(updateChangeOrderInListMock).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully when CO fetch fails", async () => {
      const wrapper = mountList();
      await flushPromises();

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      fetchChangeOrderMock.mockRejectedValue(new Error("Failed to fetch CO"));

      const vm = wrapper.vm as any;
      vm.receiptNoteForm = {
        receipt_type: "change_order",
        purchase_order_uuid: null,
        change_order_uuid: "co-1",
        project_uuid: "project-1",
        corporation_uuid: "corp-1", // Match TopBar's selectedCorporationId
        grn_number: "GRN-1",
        entry_date: "2024-05-01T00:00:00.000Z",
        status: "Received",
        receipt_items: [],
        total_received_amount: 400,
      };

      await vm.performSaveReceiptNote(false);
      await flushPromises();

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ReceiptNoteList] Failed to refresh change order after completion check:",
        expect.any(Error)
      );

      // Verify receipt note was still created despite error
      expect(createStockReceiptNoteMock).toHaveBeenCalled();

      // Verify updateChangeOrderInList was NOT called (because fetch failed)
      expect(updateChangeOrderInListMock).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Update existing receipt note", () => {
    it("should refresh PO when updating existing receipt note and PO is marked as Completed", async () => {
      const wrapper = mountList();
      await flushPromises();

      const updatedPO = {
        uuid: "po-1",
        status: "Completed",
      };

      fetchPurchaseOrderMock.mockResolvedValue(updatedPO);

      const vm = wrapper.vm as any;
      vm.receiptNoteForm = {
        uuid: "rn-existing", // Existing receipt note
        receipt_type: "purchase_order",
        purchase_order_uuid: "po-1",
        change_order_uuid: null,
        project_uuid: "project-1",
        corporation_uuid: "corp-1", // Match TopBar's selectedCorporationId
        grn_number: "GRN-1",
        entry_date: "2024-05-01T00:00:00.000Z",
        status: "Received",
        receipt_items: [],
        total_received_amount: 1000,
      };

      await vm.performSaveReceiptNote(false);
      await flushPromises();

      // Verify receipt note was updated (not created)
      expect(updateStockReceiptNoteMock).toHaveBeenCalled();

      // Verify PO was refreshed
      expect(fetchPurchaseOrderMock).toHaveBeenCalledWith("po-1");
      expect(updatePurchaseOrderInListMock).toHaveBeenCalledWith(updatedPO);
    });
  });
});

