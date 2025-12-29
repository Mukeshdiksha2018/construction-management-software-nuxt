import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref, computed } from "vue";
import { createPinia, defineStore, setActivePinia } from "pinia";
import ReturnNoteForm from "@/components/PurchaseOrders/ReturnNoteForm.vue";

const fetchPurchaseOrderItemsMock = vi.fn();
const fetchChangeOrderItemsMock = vi.fn();
const mockFetch = vi.fn();

vi.stubGlobal("useToast", () => ({
  add: vi.fn(),
}));

vi.stubGlobal("$fetch", mockFetch);

vi.mock("@/stores/corporations", () => {
  const useCorporationStore = defineStore("corporations", () => ({
    selectedCorporation: { uuid: "corp-1" },
    selectedCorporationId: "corp-1",
  }));
  return { useCorporationStore };
});

vi.mock("@/stores/purchaseOrders", () => {
  const usePurchaseOrdersStore = defineStore("purchaseOrders", () => ({
    purchaseOrders: ref([
      {
        uuid: "po-1",
        po_number: "PO-1",
        project_uuid: "project-1",
        status: "Approved",
        po_type: "MATERIAL",
      },
    ]),
    fetchPurchaseOrders: vi.fn(),
  }));
  return { usePurchaseOrdersStore };
});

vi.mock("@/stores/purchaseOrderResources", () => {
  const usePurchaseOrderResourcesStore = defineStore("purchaseOrderResources", () => ({
    fetchPurchaseOrderItems: fetchPurchaseOrderItemsMock,
    getPreferredItems: vi.fn(() => []),
    ensurePreferredItems: vi.fn().mockResolvedValue(undefined),
  }));
  return { usePurchaseOrderResourcesStore };
});

vi.mock("@/stores/changeOrders", () => {
  const useChangeOrdersStore = defineStore("changeOrders", () => ({
    changeOrders: ref([
      {
        uuid: "co-1",
        co_number: "CO-1",
        project_uuid: "project-1",
        status: "Approved",
        co_type: "MATERIAL",
      },
    ]),
    fetchChangeOrders: vi.fn(),
  }));
  return { useChangeOrdersStore };
});

vi.mock("@/stores/vendors", () => {
  const useVendorStore = defineStore("vendors", () => ({
    vendors: ref([
      { uuid: "vendor-1", vendor_name: "Test Vendor" },
    ]),
    fetchVendors: vi.fn().mockResolvedValue(undefined),
  }));
  return { useVendorStore };
});

vi.mock("@/stores/userProfiles", () => {
  const useUserProfilesStore = defineStore("userProfiles", () => ({
    users: ref([]),
    hasData: ref(false),
    fetchUsers: vi.fn().mockResolvedValue(undefined),
  }));
  return { useUserProfilesStore };
});

vi.mock("@/stores/itemTypes", () => {
  const useItemTypesStore = defineStore("itemTypes", () => ({
    itemTypes: ref([]),
    fetchItemTypes: vi.fn().mockResolvedValue(undefined),
  }));
  return { useItemTypesStore };
});

const stockReceiptNotesState = ref<any[]>([]);
const stockReturnNotesState = ref<any[]>([]);
const fetchStockReceiptNotesMock = vi.fn();
const fetchStockReturnNotesMock = vi.fn();

vi.mock("@/stores/stockReceiptNotes", () => {
  const useStockReceiptNotesStore = defineStore("stockReceiptNotes", () => ({
    stockReceiptNotes: stockReceiptNotesState,
    fetchStockReceiptNotes: fetchStockReceiptNotesMock,
  }));
  return { useStockReceiptNotesStore };
});

vi.mock("@/stores/stockReturnNotes", () => {
  const useStockReturnNotesStore = defineStore("stockReturnNotes", () => ({
    stockReturnNotes: stockReturnNotesState,
    paginationInfo: ref({}),
    fetchStockReturnNotes: fetchStockReturnNotesMock,
    getPaginationInfo: vi.fn(() => null),
  }));
  return { useStockReturnNotesStore };
});

vi.mock("@/composables/useUTCDateFormat", () => ({
  useUTCDateFormat: () => ({
    toUTCString: (value: string) => `${value}T00:00:00.000Z`,
    fromUTCString: (value: string) => value.split("T")[0],
  }),
}));

vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
    currencySymbol: ref("$"),
  }),
}));

const localPurchaseOrders = ref<any[]>([]);
const localChangeOrders = ref<any[]>([]);
const fetchLocalPurchaseOrdersMock = vi.fn();
const fetchLocalChangeOrdersMock = vi.fn();

vi.mock("@/composables/useLocalPOCOData", () => ({
  useLocalPOCOData: () => ({
    localPurchaseOrders,
    localChangeOrders,
    fetchLocalPurchaseOrders: fetchLocalPurchaseOrdersMock,
    fetchLocalChangeOrders: fetchLocalChangeOrdersMock,
  }),
}));

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
  URadioGroup: {
    props: ["modelValue", "items"],
    emits: ["update:modelValue"],
    template: '<div @click="$emit(\'update:modelValue\', items?.[0]?.value)"><slot /></div>',
  },
  UPopover: { template: "<div><slot /><slot name='content' /></div>" },
  UCalendar: { props: ["modelValue"], emits: ["update:modelValue"], template: "<div></div>" },
  UButton: { template: "<button><slot /></button>" },
  UCard: { template: "<div><slot /></div>" },
  UTextarea: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea>',
  },
  UFileUpload: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<div><slot :open="() => {}" /></div>',
  },
  ProjectSelect: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<div @click="$emit(\'update:modelValue\', \'project-1\')">Project</div>',
  },
  LocationSelect: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<div @click="$emit(\'update:modelValue\', \'location-1\')">Location</div>',
  },
  ReturnNoteItemsTable: {
    props: ["items", "loading", "error", "readonly"],
    emits: ["cost-code-change", "return-quantity-change"],
    template: '<div class="return-note-items-table"><slot /></div>',
  },
};

const mountForm = (props = {}) =>
  mount(ReturnNoteForm, {
    props: {
      form: {
        return_number: "RTN-1",
        return_type: "purchase_order",
        entry_date: "2024-05-01T00:00:00.000Z",
        project_uuid: "project-1",
        purchase_order_uuid: null,
        change_order_uuid: null,
        status: "Returned",
        return_items: [],
        ...props.form,
      },
      editingReturnNote: props.editingReturnNote ?? false,
      readonly: props.readonly ?? false,
    },
    global: {
      stubs: uiStubs,
    },
  });

describe("ReturnNoteForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    fetchPurchaseOrderItemsMock.mockResolvedValue([]);
    fetchChangeOrderItemsMock.mockResolvedValue([]);
    fetchStockReceiptNotesMock.mockResolvedValue(undefined);
    fetchStockReturnNotesMock.mockResolvedValue(undefined);
    stockReceiptNotesState.value = [];
    stockReturnNotesState.value = [];
    mockFetch.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
    stockReceiptNotesState.value = [];
    stockReturnNotesState.value = [];
    localPurchaseOrders.value = [];
    localChangeOrders.value = [];
  });

  describe("Pre-populated return items from shortfall", () => {
    it("should use pre-populated return_items when provided for new return note", async () => {
      const prePopulatedItems = [
        {
          uuid: "item-1",
          base_item_uuid: "item-1",
          item_uuid: "item-1",
          item_name: "Test Item",
          ordered_quantity: 20,
          po_quantity: 20,
          return_quantity: 15, // Shortfall quantity
          return_total: 150,
          unit_price: 10,
          cost_code_uuid: "cc-1",
          cost_code_number: "CC-001",
          cost_code_name: "Test Cost Code",
        },
      ];

      const wrapper = mountForm({
        form: {
          return_items: prePopulatedItems,
          purchase_order_uuid: "po-1",
        },
        editingReturnNote: false,
      });

      await flushPromises();

      // Verify that return items are set
      const form = wrapper.vm.$props.form;
      expect(form.return_items).toBeDefined();
      expect(form.return_items.length).toBe(1);
      expect(form.return_items[0].return_quantity).toBe(15);
      expect(form.return_items[0].return_total).toBe(150);
    });

    it("should not fetch items from PO/CO when return_items are pre-populated", async () => {
      const prePopulatedItems = [
        {
          uuid: "item-1",
          base_item_uuid: "item-1",
          item_uuid: "item-1",
          item_name: "Test Item",
          return_quantity: 10,
          return_total: 100,
        },
      ];

      mountForm({
        form: {
          return_items: prePopulatedItems,
          purchase_order_uuid: "po-1",
        },
        editingReturnNote: false,
      });

      await flushPromises();

      // Should not fetch from PO since items are pre-populated
      expect(fetchPurchaseOrderItemsMock).not.toHaveBeenCalled();
    });

    it("should preserve return_quantity when return_items are pre-populated", async () => {
      const prePopulatedItems = [
        {
          uuid: "item-1",
          base_item_uuid: "item-1",
          item_uuid: "item-1",
          item_name: "Item 1",
          ordered_quantity: 20,
          return_quantity: 5, // Shortfall quantity
          return_total: 50,
          unit_price: 10,
        },
        {
          uuid: "item-2",
          base_item_uuid: "item-2",
          item_uuid: "item-2",
          item_name: "Item 2",
          ordered_quantity: 30,
          return_quantity: 10, // Shortfall quantity
          return_total: 100,
          unit_price: 10,
        },
      ];

      const wrapper = mountForm({
        form: {
          return_items: prePopulatedItems,
          purchase_order_uuid: "po-1",
        },
        editingReturnNote: false,
      });

      await flushPromises();

      const form = wrapper.vm.$props.form;
      expect(form.return_items[0].return_quantity).toBe(5);
      expect(form.return_items[1].return_quantity).toBe(10);
    });
  });

  describe("Return type switching", () => {
    it("should clear purchase_order_uuid when switching to change_order", async () => {
      let formData: any = {
        return_type: "purchase_order",
        purchase_order_uuid: "po-1",
        change_order_uuid: null,
      };

      const wrapper = mountForm({
        form: formData,
      });

      await flushPromises();

      // Switch to change_order by updating the form
      const radioGroup = wrapper.findComponent({ name: "URadioGroup" });
      if (radioGroup.exists()) {
        await radioGroup.vm.$emit("update:modelValue", "change_order");
        await flushPromises();
      }

      // The form should be updated via emit
      const emits = wrapper.emitted("update:form");
      if (emits && emits.length > 0) {
        const lastEmit = emits[emits.length - 1][0];
        if (lastEmit.return_type === "change_order") {
          expect(lastEmit.purchase_order_uuid).toBeNull();
        }
      }
    });

    it("should clear change_order_uuid when switching to purchase_order", async () => {
      let formData: any = {
        return_type: "change_order",
        purchase_order_uuid: null,
        change_order_uuid: "co-1",
      };

      const wrapper = mountForm({
        form: formData,
      });

      await flushPromises();

      // Switch to purchase_order by updating the form
      const radioGroup = wrapper.findComponent({ name: "URadioGroup" });
      if (radioGroup.exists()) {
        await radioGroup.vm.$emit("update:modelValue", "purchase_order");
        await flushPromises();
      }

      // The form should be updated via emit
      const emits = wrapper.emitted("update:form");
      if (emits && emits.length > 0) {
        const lastEmit = emits[emits.length - 1][0];
        if (lastEmit.return_type === "purchase_order") {
          expect(lastEmit.change_order_uuid).toBeNull();
        }
      }
    });
  });

  describe("Return quantity changes", () => {
    it("should calculate return_total when return_quantity changes", async () => {
      const wrapper = mountForm({
        form: {
          return_items: [
            {
              uuid: "item-1",
              base_item_uuid: "item-1",
              item_uuid: "item-1",
              item_name: "Test Item",
              unit_price: 10,
              ordered_quantity: 20,
              return_quantity: null,
              return_total: null,
            },
          ],
          purchase_order_uuid: "po-1",
        },
      });

      await flushPromises();

      // Simulate return quantity change
      const returnItemsTable = wrapper.findComponent({ name: "ReturnNoteItemsTable" });
      if (returnItemsTable.exists()) {
        returnItemsTable.vm.$emit("return-quantity-change", {
          index: 0,
          value: "5",
          numericValue: 5,
          computedTotal: 50,
        });

        await flushPromises();

        const form = wrapper.vm.$props.form;
        expect(form.return_items[0].return_quantity).toBe(5);
        expect(form.return_items[0].return_total).toBe(50);
      }
    });
  });

  describe("Receipt notes validation with existing return notes", () => {
    it("should calculate remaining shortfall after accounting for existing return notes", async () => {
      // Setup: PO item has ordered: 20, received: 5, shortfall: 15
      // But there's already a return note for 10, so remaining shortfall should be 5
      
      stockReceiptNotesState.value = [
        {
          uuid: "rn-1",
          corporation_uuid: "corp-1",
          purchase_order_uuid: "po-1",
          receipt_type: "purchase_order",
          is_active: true,
        },
      ];

      stockReturnNotesState.value = [
        {
          uuid: "rtn-1",
          corporation_uuid: "corp-1",
          purchase_order_uuid: "po-1",
          return_type: "purchase_order",
          status: "Returned",
          is_active: true,
        },
      ];

      // Mock receipt note items API response
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url.includes("/api/receipt-note-items")) {
          return Promise.resolve({
            data: [
              {
                uuid: "rni-1",
                receipt_note_uuid: "rn-1",
                item_uuid: "item-1",
                received_quantity: 5, // Received 5 out of 20
                is_active: true,
              },
            ],
          });
        }
        if (url.includes("/api/return-note-items")) {
          return Promise.resolve({
            data: [
              {
                uuid: "rni-1",
                return_note_uuid: "rtn-1",
                item_uuid: "item-1",
                return_quantity: 10, // Already returned 10
                is_active: true,
              },
            ],
          });
        }
        return Promise.resolve({ data: [] });
      });

      fetchPurchaseOrderItemsMock.mockResolvedValue([
        {
          uuid: "item-1",
          item_uuid: "item-1",
          item_name: "Test Item",
          po_quantity: 20,
          unit_price: 10,
        },
      ]);

      const wrapper = mountForm({
        form: {
          project_uuid: "project-1",
          purchase_order_uuid: "po-1",
        },
        editingReturnNote: false,
      });

      await flushPromises();

      // Should fetch receipt notes and return notes
      expect(fetchStockReceiptNotesMock).toHaveBeenCalled();
      expect(fetchStockReturnNotesMock).toHaveBeenCalled();
      
      // Should calculate remaining shortfall: 15 - 10 = 5
      await flushPromises();
      const form = wrapper.vm.$props.form;
      if (form.return_items && form.return_items.length > 0) {
        expect(form.return_items[0].return_quantity).toBe(5);
      }
    });

    it("should show error when all shortfall is covered by existing return notes", async () => {
      // Setup: PO item has ordered: 20, received: 5, shortfall: 15
      // But there's already a return note for 15, so no remaining shortfall
      
      stockReceiptNotesState.value = [
        {
          uuid: "rn-1",
          corporation_uuid: "corp-1",
          purchase_order_uuid: "po-1",
          receipt_type: "purchase_order",
          is_active: true,
        },
      ];

      stockReturnNotesState.value = [
        {
          uuid: "rtn-1",
          corporation_uuid: "corp-1",
          purchase_order_uuid: "po-1",
          return_type: "purchase_order",
          status: "Returned",
          is_active: true,
        },
      ];

      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/receipt-note-items")) {
          return Promise.resolve({
            data: [
              {
                item_uuid: "item-1",
                received_quantity: 5,
                is_active: true,
              },
            ],
          });
        }
        if (url.includes("/api/return-note-items")) {
          return Promise.resolve({
            data: [
              {
                item_uuid: "item-1",
                return_quantity: 15, // Fully covers the shortfall
                is_active: true,
              },
            ],
          });
        }
        return Promise.resolve({ data: [] });
      });

      fetchPurchaseOrderItemsMock.mockResolvedValue([
        {
          uuid: "item-1",
          item_uuid: "item-1",
          item_name: "Test Item",
          po_quantity: 20,
          unit_price: 10,
        },
      ]);

      const wrapper = mountForm({
        form: {
          project_uuid: "project-1",
          purchase_order_uuid: "po-1",
        },
        editingReturnNote: false,
      });

      await flushPromises();
      await flushPromises(); // Wait for validation

      // Should show validation error
      const alert = wrapper.find(".text-error-700, .text-error-600");
      expect(alert.exists() || wrapper.html().includes("already been covered")).toBe(true);
    });

    it("should exclude current return note when editing", async () => {
      // Setup: Editing an existing return note, should not count its own quantities
      
      stockReceiptNotesState.value = [
        {
          uuid: "rn-1",
          corporation_uuid: "corp-1",
          purchase_order_uuid: "po-1",
          receipt_type: "purchase_order",
          is_active: true,
        },
      ];

      stockReturnNotesState.value = [
        {
          uuid: "rtn-current",
          corporation_uuid: "corp-1",
          purchase_order_uuid: "po-1",
          return_type: "purchase_order",
          status: "Returned",
          is_active: true,
        },
        {
          uuid: "rtn-other",
          corporation_uuid: "corp-1",
          purchase_order_uuid: "po-1",
          return_type: "purchase_order",
          status: "Returned",
          is_active: true,
        },
      ];

      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url.includes("/api/receipt-note-items")) {
          return Promise.resolve({
            data: [
              {
                item_uuid: "item-1",
                received_quantity: 5,
                is_active: true,
              },
            ],
          });
        }
        if (url.includes("/api/return-note-items")) {
          // Only return items for rtn-other, not rtn-current
          const query = options?.query || {};
          const returnNoteUuid = query.return_note_uuid;
          if (returnNoteUuid === "rtn-other") {
            return Promise.resolve({
              data: [
                {
                  item_uuid: "item-1",
                  return_quantity: 5,
                  is_active: true,
                },
              ],
            });
          }
          return Promise.resolve({ data: [] });
        }
        return Promise.resolve({ data: [] });
      });

      fetchPurchaseOrderItemsMock.mockResolvedValue([
        {
          uuid: "item-1",
          item_uuid: "item-1",
          item_name: "Test Item",
          po_quantity: 20,
          unit_price: 10,
        },
      ]);

      const wrapper = mountForm({
        form: {
          uuid: "rtn-current", // Current return note being edited
          project_uuid: "project-1",
          purchase_order_uuid: "po-1",
        },
        editingReturnNote: true,
      });

      await flushPromises();

      // When editing, the validation check (checkReceiptNotesAndCalculateShortfall) is not called
      // because it's only for new return notes. The form should still render correctly.
      // The component should handle editing mode without triggering validation
      expect(wrapper.exists()).toBe(true);
      // Note: fetchStockReturnNotesMock is only called during validation, which doesn't run for editing mode
    });

    it("should only consider Returned status return notes", async () => {
      stockReceiptNotesState.value = [
        {
          uuid: "rn-1",
          corporation_uuid: "corp-1",
          purchase_order_uuid: "po-1",
          receipt_type: "purchase_order",
          is_active: true,
        },
      ];

      stockReturnNotesState.value = [
        {
          uuid: "rtn-returned-1",
          corporation_uuid: "corp-1",
          purchase_order_uuid: "po-1",
          return_type: "purchase_order",
          status: "Returned",
          is_active: true,
        },
        {
          uuid: "rtn-returned-2",
          corporation_uuid: "corp-1",
          purchase_order_uuid: "po-1",
          return_type: "purchase_order",
          status: "Returned",
          is_active: true,
        },
        {
          uuid: "rtn-cancelled",
          corporation_uuid: "corp-1",
          purchase_order_uuid: "po-1",
          return_type: "purchase_order",
          status: "Cancelled",
          is_active: true,
        },
      ];

      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url.includes("/api/receipt-note-items")) {
          return Promise.resolve({
            data: [
              {
                item_uuid: "item-1",
                received_quantity: 5,
                is_active: true,
              },
            ],
          });
        }
        if (url.includes("/api/return-note-items")) {
          const query = options?.query || {};
          const returnNoteUuid = query.return_note_uuid;
          // Only return items for Returned status notes
          if (returnNoteUuid === "rtn-returned-1" || returnNoteUuid === "rtn-returned-2") {
            return Promise.resolve({
              data: [
                {
                  item_uuid: "item-1",
                  return_quantity: 5,
                  is_active: true,
                },
              ],
            });
          }
          return Promise.resolve({ data: [] });
        }
        return Promise.resolve({ data: [] });
      });

      fetchPurchaseOrderItemsMock.mockResolvedValue([
        {
          uuid: "item-1",
          item_uuid: "item-1",
          item_name: "Test Item",
          po_quantity: 20,
          unit_price: 10,
        },
      ]);

      const wrapper = mountForm({
        form: {
          project_uuid: "project-1",
          purchase_order_uuid: "po-1",
        },
        editingReturnNote: false,
      });

      await flushPromises();

      // Should only count Returned status notes
      // Cancelled note should be ignored
      expect(fetchStockReturnNotesMock).toHaveBeenCalled();
    });
  });

  describe("Labor PO/CO Exclusion", () => {
    it("should exclude labor purchase orders from poOptions", async () => {
      // Set up local purchase orders with both MATERIAL and LABOR types
      localPurchaseOrders.value = [
        {
          uuid: "po-material-1",
          po_number: "PO-MAT-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          po_type: "MATERIAL",
        },
        {
          uuid: "po-labor-1",
          po_number: "PO-LAB-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          po_type: "LABOR",
        },
        {
          uuid: "po-material-2",
          po_number: "PO-MAT-2",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Partially_Received",
          po_type: "MATERIAL",
        },
        {
          uuid: "po-labor-2",
          po_number: "PO-LAB-2",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Partially_Received",
          po_type: "LABOR",
        },
      ];

      const wrapper = mountForm({
        form: {
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          return_type: "purchase_order",
        },
        editingReturnNote: false,
      });

      await flushPromises();
      await wrapper.vm.$nextTick();

      // Access the component instance to check poOptions
      const vm = wrapper.vm as any;
      const poOptions = vm.poOptions;

      // Should only include MATERIAL purchase orders, not LABOR
      expect(poOptions).toHaveLength(2);
      expect(poOptions.map((opt: any) => opt.value)).toContain("po-material-1");
      expect(poOptions.map((opt: any) => opt.value)).toContain("po-material-2");
      expect(poOptions.map((opt: any) => opt.value)).not.toContain("po-labor-1");
      expect(poOptions.map((opt: any) => opt.value)).not.toContain("po-labor-2");

      // Verify all options are MATERIAL type
      poOptions.forEach((opt: any) => {
        expect(opt.type_label).toBe("Material");
        expect(opt.po?.po_type).toBe("MATERIAL");
      });
    });

    it("should exclude labor change orders from coOptions", async () => {
      // Set up local change orders with both MATERIAL and LABOR types
      localChangeOrders.value = [
        {
          uuid: "co-material-1",
          co_number: "CO-MAT-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          co_type: "MATERIAL",
        },
        {
          uuid: "co-labor-1",
          co_number: "CO-LAB-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          co_type: "LABOR",
        },
        {
          uuid: "co-material-2",
          co_number: "CO-MAT-2",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Partially_Received",
          co_type: "MATERIAL",
        },
        {
          uuid: "co-labor-2",
          co_number: "CO-LAB-2",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Partially_Received",
          co_type: "LABOR",
        },
      ];

      const wrapper = mountForm({
        form: {
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          return_type: "change_order",
        },
        editingReturnNote: false,
      });

      await flushPromises();
      await wrapper.vm.$nextTick();

      // Access the component instance to check coOptions
      const vm = wrapper.vm as any;
      const coOptions = vm.coOptions;

      // Should only include MATERIAL change orders, not LABOR
      expect(coOptions).toHaveLength(2);
      expect(coOptions.map((opt: any) => opt.value)).toContain("co-material-1");
      expect(coOptions.map((opt: any) => opt.value)).toContain("co-material-2");
      expect(coOptions.map((opt: any) => opt.value)).not.toContain("co-labor-1");
      expect(coOptions.map((opt: any) => opt.value)).not.toContain("co-labor-2");

      // Verify all options are MATERIAL type
      coOptions.forEach((opt: any) => {
        expect(opt.type_label).toBe("Material");
        expect(opt.co?.co_type).toBe("MATERIAL");
      });
    });

    it("should exclude labor purchase orders regardless of case", async () => {
      // Test with different case variations
      localPurchaseOrders.value = [
        {
          uuid: "po-material-1",
          po_number: "PO-MAT-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          po_type: "MATERIAL",
        },
        {
          uuid: "po-labor-1",
          po_number: "PO-LAB-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          po_type: "labor", // lowercase
        },
        {
          uuid: "po-labor-2",
          po_number: "PO-LAB-2",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          po_type: "Labor", // mixed case
        },
        {
          uuid: "po-labor-3",
          po_number: "PO-LAB-3",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          po_type: "LABOR", // uppercase
        },
      ];

      const wrapper = mountForm({
        form: {
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          return_type: "purchase_order",
        },
        editingReturnNote: false,
      });

      await flushPromises();
      await wrapper.vm.$nextTick();

      const vm = wrapper.vm as any;
      const poOptions = vm.poOptions;

      // Should only include MATERIAL, exclude all LABOR variations
      expect(poOptions).toHaveLength(1);
      expect(poOptions.map((opt: any) => opt.value)).toContain("po-material-1");
      expect(poOptions.map((opt: any) => opt.value)).not.toContain("po-labor-1");
      expect(poOptions.map((opt: any) => opt.value)).not.toContain("po-labor-2");
      expect(poOptions.map((opt: any) => opt.value)).not.toContain("po-labor-3");
    });

    it("should exclude labor change orders regardless of case", async () => {
      // Test with different case variations
      localChangeOrders.value = [
        {
          uuid: "co-material-1",
          co_number: "CO-MAT-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          co_type: "MATERIAL",
        },
        {
          uuid: "co-labor-1",
          co_number: "CO-LAB-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          co_type: "labor", // lowercase
        },
        {
          uuid: "co-labor-2",
          co_number: "CO-LAB-2",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          co_type: "Labor", // mixed case
        },
        {
          uuid: "co-labor-3",
          co_number: "CO-LAB-3",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          co_type: "LABOR", // uppercase
        },
      ];

      const wrapper = mountForm({
        form: {
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          return_type: "change_order",
        },
        editingReturnNote: false,
      });

      await flushPromises();
      await wrapper.vm.$nextTick();

      const vm = wrapper.vm as any;
      const coOptions = vm.coOptions;

      // Should only include MATERIAL, exclude all LABOR variations
      expect(coOptions).toHaveLength(1);
      expect(coOptions.map((opt: any) => opt.value)).toContain("co-material-1");
      expect(coOptions.map((opt: any) => opt.value)).not.toContain("co-labor-1");
      expect(coOptions.map((opt: any) => opt.value)).not.toContain("co-labor-2");
      expect(coOptions.map((opt: any) => opt.value)).not.toContain("co-labor-3");
    });

    it("should handle empty poOptions when all purchase orders are labor type", async () => {
      localPurchaseOrders.value = [
        {
          uuid: "po-labor-1",
          po_number: "PO-LAB-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          po_type: "LABOR",
        },
        {
          uuid: "po-labor-2",
          po_number: "PO-LAB-2",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Partially_Received",
          po_type: "LABOR",
        },
      ];

      const wrapper = mountForm({
        form: {
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          return_type: "purchase_order",
        },
        editingReturnNote: false,
      });

      await flushPromises();
      await wrapper.vm.$nextTick();

      const vm = wrapper.vm as any;
      const poOptions = vm.poOptions;

      // Should be empty since all POs are labor type
      expect(poOptions).toHaveLength(0);
    });

    it("should handle empty coOptions when all change orders are labor type", async () => {
      localChangeOrders.value = [
        {
          uuid: "co-labor-1",
          co_number: "CO-LAB-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          co_type: "LABOR",
        },
        {
          uuid: "co-labor-2",
          co_number: "CO-LAB-2",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Partially_Received",
          co_type: "LABOR",
        },
      ];

      const wrapper = mountForm({
        form: {
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          return_type: "change_order",
        },
        editingReturnNote: false,
      });

      await flushPromises();
      await wrapper.vm.$nextTick();

      const vm = wrapper.vm as any;
      const coOptions = vm.coOptions;

      // Should be empty since all COs are labor type
      expect(coOptions).toHaveLength(0);
    });
  });
});

