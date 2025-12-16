import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CalendarDate } from "@internationalized/date";
import { createPinia, defineStore, setActivePinia } from "pinia";
import { ref } from "vue";
import ReceiptNoteForm from "@/components/PurchaseOrders/ReceiptNoteForm.vue";

const fetchPurchaseOrdersMock = vi.fn();

vi.mock("@/stores/corporations", () => {
  const useCorporationStore = defineStore("corporations", () => ({
    selectedCorporation: { uuid: "corp-1" },
    selectedCorporationId: "corp-1",
  }));
  return { useCorporationStore };
});

const purchaseOrdersData = ref([
  {
    uuid: "po-1",
    po_number: "PO-1",
    project_uuid: "project-keep",
    vendor_uuid: "vendor-1",
    corporation_uuid: "corp-1",
    total_po_amount: 1000,
    status: "Approved",
    po_type: "MATERIAL",
  },
  {
    uuid: "po-2",
    po_number: "PO-2",
    project_uuid: "project-other",
    vendor_uuid: "vendor-2",
    corporation_uuid: "corp-1",
    total_po_amount: 500,
    status: "Approved",
    po_type: "LABOR",
  },
]);

vi.mock("@/stores/purchaseOrders", () => {
  const usePurchaseOrdersStore = defineStore("purchaseOrders", () => {
    return {
      purchaseOrders: purchaseOrdersData,
      fetchPurchaseOrders: fetchPurchaseOrdersMock,
      loading: ref(false),
    };
  });
  return { usePurchaseOrdersStore };
});

const changeOrdersData = ref([
  {
    uuid: "co-1",
    co_number: "CO-1",
    project_uuid: "project-keep",
    vendor_uuid: "vendor-1",
    corporation_uuid: "corp-1",
    total_co_amount: 800,
    status: "Approved",
    co_type: "MATERIAL",
  },
  {
    uuid: "co-2",
    co_number: "CO-2",
    project_uuid: "project-other",
    vendor_uuid: "vendor-2",
    corporation_uuid: "corp-1",
    total_co_amount: 400,
    status: "Approved",
    co_type: "LABOR",
  },
]);

vi.mock("@/stores/changeOrders", () => {
  const useChangeOrdersStore = defineStore("changeOrders", () => {
    return {
      changeOrders: changeOrdersData,
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

const fetchUsersMock = vi.fn(async () => {
  users.value = [];
  hasData.value = true;
});

const users = ref<any[]>([]);
const hasData = ref(false);

vi.mock("@/stores/userProfiles", () => {
  const useUserProfilesStore = defineStore("userProfiles", () => ({
    users,
    hasData,
    fetchUsers: fetchUsersMock,
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
      {
        uuid: "vendor-2",
        vendor_name: "Test Vendor 2",
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
  template: `
    <select
      data-test="project-select"
      :value="modelValue ?? ''"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option value=""></option>
      <option value="project-123">Project 123</option>
      <option value="project-keep">Project Keep</option>
    </select>
  `,
};

const LocationSelectStub = {
  name: "LocationSelect",
  template: '<div class="location-select-stub"></div>',
};

const ReceiptNoteItemsTableStub = {
  name: "ReceiptNoteItemsTable",
  props: ["items", "loading", "error", "corporationUuid", "receiptType"],
  emits: ["received-quantity-change"],
  template: `
    <div class="receipt-note-items-table-stub" data-receipt-type="receiptType">
      <div data-test="receipt-type">{{ receiptType || 'purchase_order' }}</div>
      <div data-test="items-count">{{ items?.length || 0 }}</div>
    </div>
  `,
};

const uiStubs = {
  UCard: { template: "<div><slot /></div>" },
  UInput: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template:
      '<input class="u-input-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  UTextarea: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template:
      '<textarea class="u-textarea-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  USelectMenu: {
    name: "USelectMenu",
    props: ["modelValue", "items"],
    emits: ["update:modelValue"],
    template:
      '<div class="u-select-stub" @click="$emit(\'update:modelValue\', items?.[0] ?? null)"><slot /></div>',
  },
  USelect: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template:
      '<select class="u-select-base" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  UPopover: { template: "<div><slot /><slot name='content' /></div>" },
  UButton: {
    emits: ["click"],
    template:
      '<button class="u-button-stub" @click="$emit(\'click\')"><slot /></button>',
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
    template:
      '<div class="u-file-upload-stub"><slot :open="() => {}" /></div>',
  },
  URadioGroup: {
    name: "URadioGroup",
    props: ["modelValue", "items", "orientation", "size"],
    emits: ["update:modelValue"],
    template:
      '<div class="u-radio-group-stub" @click="$emit(\'update:modelValue\', items?.[0]?.value ?? modelValue)"><slot /></div>',
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

// Mock $fetch for useLocalPOCOData
const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

// Default mock implementation
mockFetch.mockImplementation((url: string) => {
  if (url.includes("/api/purchase-order-forms")) {
    return Promise.resolve({ data: purchaseOrdersData.value });
  }
  if (url.includes("/api/change-orders")) {
    return Promise.resolve({ data: changeOrdersData.value });
  }
  return Promise.resolve({ data: [] });
});

const mountForm = (formOverrides: Record<string, any> = {}) => {
  const form = {
    uuid: null,
    corporation_uuid: "corp-1",
    project_uuid: null,
    purchase_order_uuid: "po-stale",
    entry_date: "2024-04-01T00:00:00.000Z",
    reference_number: "",
    received_by: "",
    location_uuid: null,
    status: "Shipment",
    total_received_amount: null,
    attachments: [],
    notes: "",
    grn_number: "GRN-000001",
    ...formOverrides,
  };

  return mount(ReceiptNoteForm, {
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
};

describe("ReceiptNoteForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    users.value = [];
    hasData.value = false;
    
    // Reset $fetch mock
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/purchase-order-forms")) {
        return Promise.resolve({ data: purchaseOrdersData.value });
      }
      if (url.includes("/api/change-orders")) {
        return Promise.resolve({ data: changeOrdersData.value });
      }
      return Promise.resolve({ data: [] });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("emits updated form when project changes and clears mismatched PO", async () => {
    const wrapper = mountForm();

    await wrapper
      .find("[data-test='project-select']")
      .setValue("project-123");
    await flushPromises();

    const emissions = wrapper.emitted("update:form") ?? [];
    const lastEmission = emissions[emissions.length - 1]?.[0] as Record<string, any>;

    expect(lastEmission?.project_uuid).toBe("project-123");
    expect(lastEmission?.purchase_order_uuid).toBeNull();
  });

  it("normalizes entry date when calendar selection is emitted", async () => {
    const wrapper = mountForm();
    const calendar = wrapper.findComponent({ name: "UCalendar" });

    calendar.vm.$emit("update:modelValue", new CalendarDate(2024, 5, 10));
    await flushPromises();

    const emissions = wrapper.emitted("update:form") ?? [];
    const lastEmission = emissions[emissions.length - 1]?.[0] as Record<string, any>;

    expect(lastEmission?.entry_date).toBe("2024-05-10T00:00:00.000Z");
  });

  it("retains purchase order when project remains matched", async () => {
    const wrapper = mountForm({
      project_uuid: "project-keep",
      purchase_order_uuid: "po-1",
    });

    // Wait for component to mount and fetch purchase orders
    await flushPromises();
    await new Promise(resolve => setTimeout(resolve, 100));

    await wrapper
      .find("[data-test='project-select']")
      .setValue("project-keep");
    await flushPromises();
    await new Promise(resolve => setTimeout(resolve, 100));

    const emissions = wrapper.emitted("update:form") ?? [];
    const lastEmission = emissions[emissions.length - 1]?.[0] as Record<string, any>;

    expect(lastEmission?.project_uuid).toBe("project-keep");
    expect(lastEmission?.purchase_order_uuid).toBe("po-1");
  });

  describe("Receipt Type Prop Passing", () => {
    it("should pass receiptType 'purchase_order' to ReceiptNoteItemsTable when form has purchase_order_uuid", async () => {
      const wrapper = mountForm({
        project_uuid: "project-keep",
        purchase_order_uuid: "po-1",
        receipt_type: "purchase_order",
      });

      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      expect(itemsTable.exists()).toBe(true);
      if (itemsTable.exists()) {
        expect(itemsTable.props("receiptType")).toBe("purchase_order");
      }
    });

    it("should pass receiptType 'change_order' to ReceiptNoteItemsTable when form has change_order_uuid", async () => {
      const wrapper = mountForm({
        project_uuid: "project-keep",
        change_order_uuid: "co-1",
        receipt_type: "change_order",
      });

      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      expect(itemsTable.exists()).toBe(true);
      if (itemsTable.exists()) {
        expect(itemsTable.props("receiptType")).toBe("change_order");
      }
    });

    it("should default to 'purchase_order' when receipt_type is not specified", async () => {
      const wrapper = mountForm({
        project_uuid: "project-keep",
        purchase_order_uuid: "po-1",
        // receipt_type not specified
      });

      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      if (itemsTable.exists()) {
        // The component should default to 'purchase_order'
        expect(itemsTable.props("receiptType")).toBe("purchase_order");
      }
    });

    it("should update receiptType prop when receipt type changes", async () => {
      const wrapper = mountForm({
        project_uuid: "project-keep",
        purchase_order_uuid: "po-1",
        receipt_type: "purchase_order",
      });

      await flushPromises();

      let itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      if (itemsTable.exists()) {
        expect(itemsTable.props("receiptType")).toBe("purchase_order");
      }

      // Simulate changing receipt type to change_order
      const formUpdate = (wrapper.emitted("update:form")?.[0]?.[0] as Record<string, any>) || {};
      await wrapper.setProps({
        form: {
          ...formUpdate,
          receipt_type: "change_order",
          purchase_order_uuid: null,
          change_order_uuid: "co-1",
        },
      });
      await flushPromises();

      itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      if (itemsTable.exists()) {
        expect(itemsTable.props("receiptType")).toBe("change_order");
      }
    });

    it("should not render ReceiptNoteItemsTable when neither purchase_order_uuid nor change_order_uuid is set", () => {
      const wrapper = mountForm({
        project_uuid: "project-keep",
        purchase_order_uuid: null,
        change_order_uuid: null,
        receipt_type: "purchase_order",
      });

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      expect(itemsTable.exists()).toBe(false);
    });
  });
});

