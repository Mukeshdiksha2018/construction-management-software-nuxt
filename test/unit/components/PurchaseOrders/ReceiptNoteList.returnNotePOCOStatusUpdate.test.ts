import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref, computed } from "vue";
import { createPinia, defineStore, setActivePinia } from "pinia";
import ReceiptNoteList from "@/components/PurchaseOrders/ReceiptNoteList.vue";

/**
 * Test for reactive PO/CO status updates when return note is created from ReceiptNoteForm
 * This test covers the fix where creating a return note from shortfall items
 * should update the Purchase Order or Change Order status reactively in the lists.
 */

const fetchStockReceiptNotesMock = vi.fn();
const createStockReceiptNoteMock = vi.fn();
const fetchStockReturnNotesMock = vi.fn();
const createStockReturnNoteMock = vi.fn();
const generateNextReturnNumberMock = vi.fn(() => "RTN-1");
const fetchPurchaseOrderMock = vi.fn();
const fetchChangeOrderMock = vi.fn();
const updatePurchaseOrderInListMock = vi.fn();
const updateChangeOrderInListMock = vi.fn();

const stockReceiptNotesState = ref<any[]>([]);
const stockReturnNotesState = ref<any[]>([]);
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
    updateStockReceiptNote: vi.fn(),
    deleteStockReceiptNote: vi.fn(),
    generateNextGrnNumber: vi.fn(() => "GRN-1"),
  }));
  return { useStockReceiptNotesStore };
});

vi.mock("@/stores/stockReturnNotes", () => {
  const useStockReturnNotesStore = defineStore("stockReturnNotes", () => ({
    stockReturnNotes: stockReturnNotesState,
    loading: ref(false),
    error: ref(null),
    paginationInfo: ref({}),
    fetchStockReturnNotes: fetchStockReturnNotesMock,
    getPaginationInfo: vi.fn(() => null),
    createStockReturnNote: createStockReturnNoteMock,
    generateNextReturnNumber: generateNextReturnNumberMock,
  }));
  return { useStockReturnNotesStore };
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

// Mock ReceiptNoteForm with shortfallItems exposed
const ReceiptNoteFormStub = {
  name: "ReceiptNoteForm",
  props: ["form", "editingReceiptNote", "readonly"],
  emits: ["update:form"],
  setup(props: any, { expose }: any) {
    // Calculate total received quantities from other receipt notes (excluding current one)
    const totalReceivedQuantitiesMap = computed(() => {
      const map = new Map<string, number>();
      const currentReceiptNoteId = props.form?.uuid;
      const poUuid = props.form?.purchase_order_uuid;
      const coUuid = props.form?.change_order_uuid;
      const receiptType = props.form?.receipt_type || 'purchase_order';

      // Filter receipt notes that match the current PO/CO and exclude the current receipt note
      stockReceiptNotesState.value.forEach((note: any) => {
        if (note.is_active === false || note.uuid === currentReceiptNoteId) return;

        const isMatchingPO = receiptType === 'purchase_order' && note.purchase_order_uuid === poUuid;
        const isMatchingCO = receiptType === 'change_order' && note.change_order_uuid === coUuid;

        if ((isMatchingPO || isMatchingCO) && note.receipt_items) {
          note.receipt_items.forEach((rni: any) => {
            if (rni.is_active === false) return;
            const itemUuid = rni.item_uuid || rni.base_item_uuid;
            if (itemUuid) {
              const key = String(itemUuid).trim().toLowerCase();
              const existingQty = map.get(key) || 0;
              const receivedQty = parseFloat(String(rni.received_quantity || 0)) || 0;
              map.set(key, existingQty + receivedQty);
            }
          });
        }
      });

      return map;
    });

    // Calculate leftover quantity for an item
    const getLeftoverQuantity = (item: any): number => {
      const orderedQty = parseFloat(String(item.ordered_quantity || item.po_quantity || 0)) || 0;
      const itemUuid = item.uuid || item.base_item_uuid;
      if (!itemUuid) {
        return orderedQty;
      }
      const key = String(itemUuid).trim().toLowerCase();
      const totalReceived = totalReceivedQuantitiesMap.value.get(key) || 0;
      const leftover = orderedQty - totalReceived;
      return Math.max(0, leftover);
    };

    const shortfallItems = computed(() => {
      if (!props.form?.receipt_items || !Array.isArray(props.form.receipt_items)) {
        return [];
      }

      return props.form.receipt_items
        .map((item: any) => {
          const leftoverQty = getLeftoverQuantity(item);
          const receivedQty = parseFloat(String(item.received_quantity || 0)) || 0;

          // Shortfall is the difference between leftover quantity and received quantity
          if (receivedQty < leftoverQty && leftoverQty > 0) {
            return {
              ...item,
              ordered_quantity: parseFloat(String(item.ordered_quantity || item.po_quantity || 0)) || 0,
              received_quantity: receivedQty,
              leftover_quantity: leftoverQty,
              shortfall_quantity: leftoverQty - receivedQty,
            };
          }
          return null;
        })
        .filter((item: any) => item !== null);
    });

    const hasShortfallItems = computed(() => shortfallItems.value.length > 0);

    expose({
      shortfallItems,
      hasShortfallItems,
    });

    return {};
  },
  template: `
    <div class="receipt-note-form-stub">
      <slot />
    </div>
  `,
};

// Mock ReturnNoteForm that allows updating return quantities
const ReturnNoteFormStub = {
  name: "ReturnNoteForm",
  props: ["form", "editingReturnNote", "readonly"],
  emits: ["update:form"],
  setup(props: any, { expose }: any) {
    const hasValidationError = ref(false);
    const receiptNotesValidationError = ref<string | null>(null);

    expose({
      hasValidationError,
      receiptNotesValidationError,
    });

    return {};
  },
  template: `
    <div class="return-note-form-stub">
      <div v-if="form.return_items && form.return_items.length > 0">
        <div v-for="(item, index) in form.return_items" :key="index" data-test="return-item">
          Item: {{ item.item_name }}, Return Qty: {{ item.return_quantity }}
        </div>
      </div>
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
        ReturnNoteForm: ReturnNoteFormStub,
      },
    },
  });

describe("ReceiptNoteList - Return Note PO/CO Status Update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    stockReceiptNotesState.value = [];
    stockReturnNotesState.value = [];
    purchaseOrdersState.value = [
      {
        uuid: "po-1",
        po_number: "PO-1",
        project_uuid: "project-1",
        corporation_uuid: "corp-1",
        total_po_amount: 1200,
        status: "Partially_Received",
      },
    ];
    changeOrdersState.value = [
      {
        uuid: "co-1",
        co_number: "CO-1",
        project_uuid: "project-1",
        corporation_uuid: "corp-1",
        total_co_amount: 800,
        status: "Partially_Received",
      },
    ];
    fetchStockReceiptNotesMock.mockResolvedValue(undefined);
    fetchStockReturnNotesMock.mockResolvedValue(undefined);
    createStockReceiptNoteMock.mockResolvedValue({
      uuid: "rn-new",
      corporation_uuid: "corp-1",
    });
    createStockReturnNoteMock.mockResolvedValue({
      uuid: "rtn-new",
      corporation_uuid: "corp-1",
      return_number: "RTN-1",
    });
    mockFetch.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Purchase Order status update when return note is created from shortfall", () => {
    it("should fetch and update PO status reactively when return note is created from ReceiptNoteForm", async () => {
      const wrapper = mountList();
      await flushPromises();

      // Mock the updated PO with Completed status
      const updatedPO = {
        uuid: "po-1",
        po_number: "PO-1",
        project_uuid: "project-1",
        corporation_uuid: "corp-1",
        total_po_amount: 1200,
        status: "Completed", // Status updated after return note
      };

      fetchPurchaseOrderMock.mockResolvedValue(updatedPO);

      // Simulate the flow:
      // 1. User creates receipt note with shortfall
      // 2. Shortfall modal appears
      // 3. User clicks "Raise Return Note"
      // 4. Return note form opens
      // 5. User saves return note

      // Access the component instance to call saveReturnNoteFromShortfall
      const vm = wrapper.vm as any;

      // Set up return note form data (simulating what happens when "Raise Return Note" is clicked)
      // Set corporation_uuid to match TopBar's selected corporation so shouldUpdateStore is true
      vm.returnNoteFormData = {
        return_number: "RTN-1",
        entry_date: "2024-05-01T00:00:00.000Z",
        return_type: "purchase_order",
        purchase_order_uuid: "po-1",
        change_order_uuid: null,
        project_uuid: "project-1",
        corporation_uuid: "corp-1", // Match TopBar's selectedCorporationId
        status: "Waiting",
        return_items: [
          {
            base_item_uuid: "item-1",
            item_uuid: "item-1",
            item_name: "Test Item",
            return_quantity: 15,
            unit_price: 10,
            return_total: 150,
          },
        ],
        total_return_amount: 150,
      };

      // Call saveReturnNoteFromShortfall directly
      await vm.saveReturnNoteFromShortfall();
      await flushPromises();

      // Verify that status is always saved as "Returned" (even if form had "Waiting")
      expect(createStockReturnNoteMock).toHaveBeenCalled();
      const createCallArgs = createStockReturnNoteMock.mock.calls[0]?.[0];
      if (createCallArgs) {
        expect(createCallArgs.status).toBe("Returned");
      }

      // Verify that fetchPurchaseOrder was called with the correct PO UUID
      expect(fetchPurchaseOrderMock).toHaveBeenCalledWith("po-1");

      // Verify that updatePurchaseOrderInList was called with the updated PO
      expect(updatePurchaseOrderInListMock).toHaveBeenCalledWith(updatedPO);

      // Verify the PO in the store was updated
      const poInStore = purchaseOrdersState.value.find((po) => po.uuid === "po-1");
      // Note: The store update happens inside updatePurchaseOrderInList, which is mocked
      // In a real scenario, the store would be updated reactively
    });

    it("should handle errors gracefully when PO fetch fails", async () => {
      const wrapper = mountList();
      await flushPromises();

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      fetchPurchaseOrderMock.mockRejectedValue(new Error("Failed to fetch PO"));

      const vm = wrapper.vm as any;
      vm.returnNoteFormData = {
        return_number: "RTN-1",
        entry_date: "2024-05-01T00:00:00.000Z",
        return_type: "purchase_order",
        purchase_order_uuid: "po-1",
        change_order_uuid: null,
        project_uuid: "project-1",
        corporation_uuid: "corp-1", // Match TopBar's selectedCorporationId
        status: "Waiting",
        return_items: [
          {
            base_item_uuid: "item-1",
            item_uuid: "item-1",
            item_name: "Test Item",
            return_quantity: 15,
            unit_price: 10,
            return_total: 150,
          },
        ],
        total_return_amount: 150,
      };

      await vm.saveReturnNoteFromShortfall();
      await flushPromises();

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ReceiptNoteList] Failed to refresh purchase order:",
        expect.any(Error)
      );

      // Verify return note was still created despite error
      expect(createStockReturnNoteMock).toHaveBeenCalled();
      
      // Verify that status is always saved as "Returned"
      const createCallArgs = createStockReturnNoteMock.mock.calls[0]?.[0];
      if (createCallArgs) {
        expect(createCallArgs.status).toBe("Returned");
      }

      // Verify updatePurchaseOrderInList was NOT called (because fetch failed)
      expect(updatePurchaseOrderInListMock).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should not update PO if purchase_order_uuid is missing", async () => {
      const wrapper = mountList();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.returnNoteFormData = {
        return_number: "RTN-1",
        entry_date: "2024-05-01T00:00:00.000Z",
        return_type: "purchase_order",
        purchase_order_uuid: null, // Missing UUID
        change_order_uuid: null,
        project_uuid: "project-1",
        status: "Waiting",
        return_items: [],
        total_return_amount: 0,
      };

      await vm.saveReturnNoteFromShortfall();
      await flushPromises();

      // Verify fetchPurchaseOrder was NOT called (no UUID)
      expect(fetchPurchaseOrderMock).not.toHaveBeenCalled();

      // Verify updatePurchaseOrderInList was NOT called
      expect(updatePurchaseOrderInListMock).not.toHaveBeenCalled();
    });
  });

  describe("Change Order status update when return note is created from shortfall", () => {
    it("should fetch and update CO status reactively when return note is created from ReceiptNoteForm", async () => {
      const wrapper = mountList();
      await flushPromises();

      // Mock the updated CO with Completed status
      const updatedCO = {
        uuid: "co-1",
        co_number: "CO-1",
        project_uuid: "project-1",
        corporation_uuid: "corp-1",
        total_co_amount: 800,
        status: "Completed", // Status updated after return note
      };

      fetchChangeOrderMock.mockResolvedValue(updatedCO);

      const vm = wrapper.vm as any;
      vm.returnNoteFormData = {
        return_number: "RTN-1",
        entry_date: "2024-05-01T00:00:00.000Z",
        return_type: "change_order",
        purchase_order_uuid: null,
        change_order_uuid: "co-1",
        project_uuid: "project-1",
        corporation_uuid: "corp-1", // Match TopBar's selectedCorporationId
        status: "Waiting",
        return_items: [
          {
            base_item_uuid: "item-1",
            item_uuid: "item-1",
            item_name: "Test Item",
            return_quantity: 10,
            unit_price: 8,
            return_total: 80,
          },
        ],
        total_return_amount: 80,
      };

      await vm.saveReturnNoteFromShortfall();
      await flushPromises();

      // Verify that status is always saved as "Returned"
      expect(createStockReturnNoteMock).toHaveBeenCalled();
      const createCallArgs = createStockReturnNoteMock.mock.calls[0]?.[0];
      if (createCallArgs) {
        expect(createCallArgs.status).toBe("Returned");
      }

      // Verify that fetchChangeOrder was called with the correct CO UUID
      expect(fetchChangeOrderMock).toHaveBeenCalledWith("co-1");

      // Verify that updateChangeOrderInList was called with the updated CO
      expect(updateChangeOrderInListMock).toHaveBeenCalledWith(updatedCO);
    });

    it("should handle errors gracefully when CO fetch fails", async () => {
      const wrapper = mountList();
      await flushPromises();

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      fetchChangeOrderMock.mockRejectedValue(new Error("Failed to fetch CO"));

      const vm = wrapper.vm as any;
      vm.returnNoteFormData = {
        return_number: "RTN-1",
        entry_date: "2024-05-01T00:00:00.000Z",
        return_type: "change_order",
        purchase_order_uuid: null,
        change_order_uuid: "co-1",
        project_uuid: "project-1",
        corporation_uuid: "corp-1", // Match TopBar's selectedCorporationId
        status: "Waiting",
        return_items: [
          {
            base_item_uuid: "item-1",
            item_uuid: "item-1",
            item_name: "Test Item",
            return_quantity: 10,
            unit_price: 8,
            return_total: 80,
          },
        ],
        total_return_amount: 80,
      };

      await vm.saveReturnNoteFromShortfall();
      await flushPromises();

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ReceiptNoteList] Failed to refresh change order:",
        expect.any(Error)
      );

      // Verify return note was still created despite error
      expect(createStockReturnNoteMock).toHaveBeenCalled();

      // Verify updateChangeOrderInList was NOT called (because fetch failed)
      expect(updateChangeOrderInListMock).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should not update CO if change_order_uuid is missing", async () => {
      const wrapper = mountList();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.returnNoteFormData = {
        return_number: "RTN-1",
        entry_date: "2024-05-01T00:00:00.000Z",
        return_type: "change_order",
        purchase_order_uuid: null,
        change_order_uuid: null, // Missing UUID
        project_uuid: "project-1",
        status: "Waiting",
        return_items: [],
        total_return_amount: 0,
      };

      await vm.saveReturnNoteFromShortfall();
      await flushPromises();

      // Verify fetchChangeOrder was NOT called (no UUID)
      expect(fetchChangeOrderMock).not.toHaveBeenCalled();

      // Verify updateChangeOrderInList was NOT called
      expect(updateChangeOrderInListMock).not.toHaveBeenCalled();
    });
  });

  describe("Form data synchronization", () => {
    it("should use latest form data from returnNoteFormData when saving", async () => {
      const wrapper = mountList();
      await flushPromises();

      const updatedPO = {
        uuid: "po-1",
        po_number: "PO-1",
        project_uuid: "project-1",
        corporation_uuid: "corp-1",
        total_po_amount: 1200,
        status: "Completed",
      };

      fetchPurchaseOrderMock.mockResolvedValue(updatedPO);

      const vm = wrapper.vm as any;

      // Set initial form data
      vm.returnNoteFormData = {
        return_number: "RTN-1",
        entry_date: "2024-05-01T00:00:00.000Z",
        return_type: "purchase_order",
        purchase_order_uuid: "po-1",
        change_order_uuid: null,
        project_uuid: "project-1",
        corporation_uuid: "corp-1", // Match TopBar's selectedCorporationId
        status: "Waiting",
        return_items: [
          {
            base_item_uuid: "item-1",
            item_uuid: "item-1",
            item_name: "Test Item",
            return_quantity: 15,
            unit_price: 10,
            return_total: 150,
          },
        ],
        total_return_amount: 150,
      };

      // Simulate user updating return quantity (this would happen via ReturnNoteItemsTable)
      vm.returnNoteFormData.return_items[0].return_quantity = 20;
      vm.returnNoteFormData.return_items[0].return_total = 200;
      vm.returnNoteFormData.total_return_amount = 200;

      await vm.saveReturnNoteFromShortfall();
      await flushPromises();

      // Verify that createStockReturnNote was called with the updated return quantity
      expect(createStockReturnNoteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "Returned", // Status should always be "Returned"
          return_items: expect.arrayContaining([
            expect.objectContaining({
              return_quantity: 20, // Updated quantity
              return_total: 200, // Updated total
            }),
          ]),
          total_return_amount: 200, // Updated total amount
        })
      );

      // Verify PO was still refreshed correctly
      expect(fetchPurchaseOrderMock).toHaveBeenCalledWith("po-1");
      expect(updatePurchaseOrderInListMock).toHaveBeenCalledWith(updatedPO);
    });
  });
});

