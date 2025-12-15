import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { createPinia, defineStore, setActivePinia } from "pinia";
import ReceiptNoteForm from "@/components/PurchaseOrders/ReceiptNoteForm.vue";

const fetchPurchaseOrdersMock = vi.fn();

vi.mock("@/stores/corporations", () => {
  const useCorporationStore = defineStore("corporations", () => ({
    selectedCorporation: { uuid: "corp-1" },
    selectedCorporationId: "corp-1",
  }));
  return { useCorporationStore };
});

vi.mock("@/stores/purchaseOrders", () => {
  const usePurchaseOrdersStore = defineStore("purchaseOrders", () => {
    const purchaseOrders = ref([
      {
        uuid: "po-1",
        po_number: "PO-1",
        project_uuid: "project-1",
        vendor_uuid: "vendor-1",
        total_po_amount: 1000,
        status: "Approved",
        po_type: "MATERIAL",
      },
    ]);
    return {
      purchaseOrders,
      fetchPurchaseOrders: fetchPurchaseOrdersMock,
      loading: ref(false),
    };
  });
  return { usePurchaseOrdersStore };
});

vi.mock("@/stores/changeOrders", () => {
  const useChangeOrdersStore = defineStore("changeOrders", () => {
    const changeOrders = ref([
      {
        uuid: "co-1",
        co_number: "CO-1",
        project_uuid: "project-1",
        vendor_uuid: "vendor-1",
        total_co_amount: 800,
        status: "Approved",
        co_type: "MATERIAL",
      },
    ]);
    return {
      changeOrders,
      fetchChangeOrders: vi.fn(),
    };
  });
  return { useChangeOrdersStore };
});

vi.mock("@/stores/purchaseOrderResources", () => {
  const usePurchaseOrderResourcesStore = defineStore("purchaseOrderResources", () => ({
    fetchPurchaseOrderItems: vi.fn().mockResolvedValue([]),
  }));
  return { usePurchaseOrderResourcesStore };
});

vi.mock("@/stores/itemTypes", () => {
  const useItemTypesStore = defineStore("itemTypes", () => ({
    itemTypes: [],
    fetchItemTypes: vi.fn().mockResolvedValue([]),
  }));
  return { useItemTypesStore };
});

const users = ref<any[]>([]);
const hasData = ref(false);

vi.mock("@/stores/userProfiles", () => {
  const useUserProfilesStore = defineStore("userProfiles", () => ({
    users,
    hasData,
    fetchUsers: vi.fn().mockResolvedValue(undefined),
  }));
  return { useUserProfilesStore };
});

vi.mock("@/stores/vendors", () => {
  const useVendorStore = defineStore("vendors", () => {
    const vendors = ref([
      {
        uuid: "vendor-1",
        vendor_name: "Test Vendor 1",
        corporation_uuid: "corp-1",
      },
    ]);
    return {
      vendors,
      fetchVendors: vi.fn().mockResolvedValue(undefined),
    };
  });
  return { useVendorStore };
});

vi.mock("@/composables/useUTCDateFormat", () => {
  const toUTCString = (value: string | null) => {
    if (!value) return null as any;
    return `${value}T00:00:00.000Z`;
  };
  const fromUTCString = (value: string) =>
    value.split("T")[0] ?? value;
  return {
    useUTCDateFormat: () => ({
      toUTCString,
      fromUTCString,
    }),
  };
});

vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    currencySymbol: "$",
    formatCurrency: vi.fn((amount: number) => `$${amount.toFixed(2)}`),
  }),
}));

const ProjectSelectStub = {
  name: "ProjectSelect",
  props: ["modelValue"],
  emits: ["update:modelValue"],
  template: `<select data-test="project-select" :value="modelValue ?? ''" @change="$emit('update:modelValue', $event.target.value)"><option value=""></option><option value="project-1">Project 1</option></select>`,
};

const LocationSelectStub = {
  name: "LocationSelect",
  template: '<div class="location-select-stub"></div>',
};

const ReceiptNoteItemsTableStub = {
  name: "ReceiptNoteItemsTable",
  props: ["items", "loading", "error", "corporationUuid", "receiptType"],
  emits: ["received-quantity-change"],
  template: `<div class="receipt-note-items-table-stub"></div>`,
};

const uiStubs = {
  UCard: { template: "<div><slot /></div>" },
  UInput: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<input class="u-input-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  UTextarea: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<textarea class="u-textarea-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  USelectMenu: {
    name: "USelectMenu",
    props: ["modelValue", "items"],
    emits: ["update:modelValue"],
    template: '<div class="u-select-stub" @click="$emit(\'update:modelValue\', items?.[0] ?? null)"><slot /></div>',
  },
  USelect: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<select class="u-select-base" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  UPopover: { template: "<div><slot /><slot name='content' /></div>" },
  UButton: {
    emits: ["click"],
    template: '<button class="u-button-stub" @click="$emit(\'click\')"><slot /></button>',
  },
  UCalendar: {
    name: "UCalendar",
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: "<div class='u-calendar-stub'></div>",
  },
  UBadge: { template: "<span class='u-badge-stub'><slot /></span>" },
  UAlert: { template: "<div class='u-alert-stub'><slot /></div>" },
  UFileUpload: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<div class="u-file-upload-stub"><slot :open="() => {}" /></div>',
  },
  URadioGroup: {
    name: "URadioGroup",
    props: ["modelValue", "items", "orientation", "size"],
    emits: ["update:modelValue"],
    template: '<div class="u-radio-group-stub" @click="$emit(\'update:modelValue\', items?.[0]?.value ?? modelValue)"><slot /></div>',
  },
  UModal: {
    name: "UModal",
    props: ["open"],
    emits: ["update:open"],
    template: '<div class="u-modal-stub"><slot /><slot name="header" /><slot name="body" /></div>',
  },
  UIcon: {
    name: "UIcon",
    props: ["name"],
    template: '<span class="u-icon-stub"></span>',
  },
};

vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ data: [] }));

const mountForm = (formOverrides: Record<string, any> = {}, receiptItems: any[] = []) => {
  const form = {
    uuid: null,
    corporation_uuid: "corp-1",
    project_uuid: "project-1",
    purchase_order_uuid: "po-1",
    entry_date: "2024-04-01T00:00:00.000Z",
    reference_number: "",
    received_by: "",
    location_uuid: null,
    status: "Shipment",
    total_received_amount: null,
    attachments: [],
    notes: "",
    grn_number: "GRN-000001",
    receipt_items: receiptItems,
    ...formOverrides,
  };

  const wrapper = mount(ReceiptNoteForm, {
    props: {
      form,
      editingReceiptNote: Boolean(form.uuid),
    },
    global: {
      stubs: {
        ...uiStubs,
        ProjectSelect: ProjectSelectStub,
        LocationSelect: LocationSelectStub,
        ReceiptNoteItemsTable: ReceiptNoteItemsTableStub,
        FinancialBreakdown: { template: '<div class="financial-breakdown-stub"></div>' },
        FilePreview: { template: '<div class="file-preview-stub"></div>' },
      },
    },
  });

  // Set receiptItems directly on the component instance for testing
  if (receiptItems.length > 0) {
    const vm = wrapper.vm as any;
    if (vm.receiptItems) {
      vm.receiptItems = receiptItems;
    }
  }

  return wrapper;
};

describe("ReceiptNoteForm - Over-Received Quantity Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    users.value = [];
    hasData.value = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("overReceivedItems computed property", () => {
    it("should return empty array when no items have over-received quantities", () => {
      const receiptItems = [
        {
          id: "item-1",
          ordered_quantity: 10,
          po_quantity: 10,
          received_quantity: 5,
          item_name: "Item 1",
        },
        {
          id: "item-2",
          ordered_quantity: 8,
          po_quantity: 8,
          received_quantity: 3,
          item_name: "Item 2",
        },
      ];

      const wrapper = mountForm({}, receiptItems);
      const vm = wrapper.vm as any;

      expect(vm.overReceivedItems).toEqual([]);
      expect(vm.hasOverReceivedItems).toBe(false);
    });

    it("should detect items with received quantity greater than ordered quantity", () => {
      const receiptItems = [
        {
          id: "item-1",
          ordered_quantity: 10,
          po_quantity: 10,
          received_quantity: 15,
          item_name: "Item 1",
          description: "Test Item 1",
        },
        {
          id: "item-2",
          ordered_quantity: 8,
          po_quantity: 8,
          received_quantity: 3,
          item_name: "Item 2",
        },
      ];

      const wrapper = mountForm({}, receiptItems);
      const vm = wrapper.vm as any;

      expect(vm.overReceivedItems.length).toBe(1);
      expect(vm.overReceivedItems[0].item_name).toBe("Item 1");
      expect(vm.overReceivedItems[0].ordered_quantity).toBe(10);
      expect(vm.overReceivedItems[0].received_quantity).toBe(15);
      expect(vm.overReceivedItems[0].over_received_quantity).toBe(5);
      expect(vm.hasOverReceivedItems).toBe(true);
    });

    it("should detect multiple items with over-received quantities", () => {
      const receiptItems = [
        {
          id: "item-1",
          ordered_quantity: 10,
          po_quantity: 10,
          received_quantity: 15,
          item_name: "Item 1",
        },
        {
          id: "item-2",
          ordered_quantity: 8,
          po_quantity: 8,
          received_quantity: 12,
          item_name: "Item 2",
        },
      ];

      const wrapper = mountForm({}, receiptItems);
      const vm = wrapper.vm as any;

      expect(vm.overReceivedItems.length).toBe(2);
      expect(vm.hasOverReceivedItems).toBe(true);
    });

    it("should use po_quantity when ordered_quantity is not available", () => {
      const receiptItems = [
        {
          id: "item-1",
          po_quantity: 10,
          received_quantity: 15,
          item_name: "Item 1",
        },
      ];

      const wrapper = mountForm({}, receiptItems);
      const vm = wrapper.vm as any;

      expect(vm.overReceivedItems.length).toBe(1);
      expect(vm.overReceivedItems[0].ordered_quantity).toBe(10);
    });

    it("should handle items with zero ordered quantity", () => {
      const receiptItems = [
        {
          id: "item-1",
          ordered_quantity: 0,
          po_quantity: 0,
          received_quantity: 5,
          item_name: "Item 1",
        },
      ];

      const wrapper = mountForm({}, receiptItems);
      const vm = wrapper.vm as any;

      // Items with zero ordered quantity should not be considered over-received
      expect(vm.overReceivedItems.length).toBe(0);
    });

    it("should handle null or undefined quantities", () => {
      const receiptItems = [
        {
          id: "item-1",
          ordered_quantity: null,
          po_quantity: null,
          received_quantity: 5,
          item_name: "Item 1",
        },
        {
          id: "item-2",
          ordered_quantity: 10,
          received_quantity: null,
          item_name: "Item 2",
        },
      ];

      const wrapper = mountForm({}, receiptItems);
      const vm = wrapper.vm as any;

      // Should handle null values gracefully
      expect(vm.overReceivedItems.length).toBe(0);
    });

    it("should handle string quantities and convert them to numbers", () => {
      const receiptItems = [
        {
          id: "item-1",
          ordered_quantity: "10",
          po_quantity: "10",
          received_quantity: "15",
          item_name: "Item 1",
        },
      ];

      const wrapper = mountForm({}, receiptItems);
      const vm = wrapper.vm as any;

      expect(vm.overReceivedItems.length).toBe(1);
      expect(vm.overReceivedItems[0].ordered_quantity).toBe(10);
      expect(vm.overReceivedItems[0].received_quantity).toBe(15);
    });

    it("should handle decimal quantities", () => {
      const receiptItems = [
        {
          id: "item-1",
          ordered_quantity: 10.5,
          po_quantity: 10.5,
          received_quantity: 12.8,
          item_name: "Item 1",
        },
      ];

      const wrapper = mountForm({}, receiptItems);
      const vm = wrapper.vm as any;

      expect(vm.overReceivedItems.length).toBe(1);
      expect(vm.overReceivedItems[0].over_received_quantity).toBeCloseTo(2.3, 1);
    });

    it("should handle empty receipt items array", () => {
      const wrapper = mountForm({}, []);
      const vm = wrapper.vm as any;

      expect(vm.overReceivedItems).toEqual([]);
      expect(vm.hasOverReceivedItems).toBe(false);
    });
  });

  describe("overReceivedValidationError computed property", () => {
    it("should return null when there are no over-received items", () => {
      const receiptItems = [
        {
          id: "item-1",
          ordered_quantity: 10,
          received_quantity: 5,
          item_name: "Item 1",
        },
      ];

      const wrapper = mountForm({}, receiptItems);
      const vm = wrapper.vm as any;

      expect(vm.overReceivedValidationError).toBeNull();
    });

    it("should return error message with single item details", () => {
      const receiptItems = [
        {
          id: "item-1",
          ordered_quantity: 10,
          received_quantity: 15,
          item_name: "Item 1",
        },
      ];

      const wrapper = mountForm({}, receiptItems);
      const vm = wrapper.vm as any;

      expect(vm.overReceivedValidationError).toContain("Cannot save receipt note");
      expect(vm.overReceivedValidationError).toContain("1 item(s)");
      expect(vm.overReceivedValidationError).toContain("Item 1");
      expect(vm.overReceivedValidationError).toContain("Ordered: 10");
      expect(vm.overReceivedValidationError).toContain("Received: 15");
    });

    it("should return error message with multiple items details", () => {
      const receiptItems = [
        {
          id: "item-1",
          ordered_quantity: 10,
          received_quantity: 15,
          item_name: "Item 1",
        },
        {
          id: "item-2",
          ordered_quantity: 8,
          received_quantity: 12,
          item_name: "Item 2",
        },
      ];

      const wrapper = mountForm({}, receiptItems);
      const vm = wrapper.vm as any;

      expect(vm.overReceivedValidationError).toContain("2 item(s)");
      expect(vm.overReceivedValidationError).toContain("Item 1");
      expect(vm.overReceivedValidationError).toContain("Item 2");
    });

    it("should use description when item_name is not available", () => {
      const receiptItems = [
        {
          id: "item-1",
          ordered_quantity: 10,
          received_quantity: 15,
          description: "Test Description",
        },
      ];

      const wrapper = mountForm({}, receiptItems);
      const vm = wrapper.vm as any;

      expect(vm.overReceivedValidationError).toContain("Test Description");
    });

    it("should use fallback name when neither item_name nor description is available", () => {
      const receiptItems = [
        {
          id: "item-1",
          ordered_quantity: 10,
          received_quantity: 15,
        },
      ];

      const wrapper = mountForm({}, receiptItems);
      const vm = wrapper.vm as any;

      expect(vm.overReceivedValidationError).toContain("Item 1");
    });
  });

  describe("defineExpose - exposed properties", () => {
    it("should expose overReceivedItems", () => {
      const receiptItems = [
        {
          id: "item-1",
          ordered_quantity: 10,
          received_quantity: 15,
          item_name: "Item 1",
        },
      ];

      const wrapper = mountForm({}, receiptItems);
      const vm = wrapper.vm as any;

      // Check that the property is accessible (exposed)
      expect(vm.overReceivedItems).toBeDefined();
      expect(Array.isArray(vm.overReceivedItems)).toBe(true);
    });

    it("should expose hasOverReceivedItems", () => {
      const receiptItems = [
        {
          id: "item-1",
          ordered_quantity: 10,
          received_quantity: 15,
          item_name: "Item 1",
        },
      ];

      const wrapper = mountForm({}, receiptItems);
      const vm = wrapper.vm as any;

      expect(vm.hasOverReceivedItems).toBeDefined();
      expect(typeof vm.hasOverReceivedItems).toBe("boolean");
      expect(vm.hasOverReceivedItems).toBe(true);
    });

    it("should expose overReceivedValidationError", () => {
      const receiptItems = [
        {
          id: "item-1",
          ordered_quantity: 10,
          received_quantity: 15,
          item_name: "Item 1",
        },
      ];

      const wrapper = mountForm({}, receiptItems);
      const vm = wrapper.vm as any;

      expect(vm.overReceivedValidationError).toBeDefined();
      expect(typeof vm.overReceivedValidationError === "string" || vm.overReceivedValidationError === null).toBe(true);
    });
  });

  describe("Change Order items", () => {
    it("should detect over-received quantities for change order items", () => {
      const receiptItems = [
        {
          id: "item-1",
          ordered_quantity: 10,
          co_quantity: 10,
          received_quantity: 15,
          item_name: "Item 1",
        },
      ];

      const wrapper = mountForm(
        {
          receipt_type: "change_order",
          change_order_uuid: "co-1",
          purchase_order_uuid: null,
        },
        receiptItems
      );
      const vm = wrapper.vm as any;

      expect(vm.overReceivedItems.length).toBe(1);
      expect(vm.hasOverReceivedItems).toBe(true);
    });
  });
});

