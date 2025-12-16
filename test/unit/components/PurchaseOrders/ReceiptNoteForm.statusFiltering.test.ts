import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createPinia, defineStore, setActivePinia } from "pinia";
import { ref } from "vue";
import ReceiptNoteForm from "@/components/PurchaseOrders/ReceiptNoteForm.vue";

vi.mock("@/stores/corporations", () => {
  const useCorporationStore = defineStore("corporations", () => ({
    selectedCorporation: { uuid: "corp-1" },
    selectedCorporationId: "corp-1",
  }));
  return { useCorporationStore };
});

// Mock purchase orders with various statuses
const purchaseOrders = ref([
  {
    uuid: "po-approved",
    po_number: "PO-APPROVED",
    project_uuid: "project-1",
    vendor_uuid: "vendor-1",
    corporation_uuid: "corp-1",
    total_po_amount: 1000,
    status: "Approved",
    po_type: "MATERIAL",
  },
  {
    uuid: "po-partially-received",
    po_number: "PO-PARTIAL",
    project_uuid: "project-1",
    vendor_uuid: "vendor-1",
    corporation_uuid: "corp-1",
    total_po_amount: 2000,
    status: "Partially_Received",
    po_type: "MATERIAL",
  },
  {
    uuid: "po-completed",
    po_number: "PO-COMPLETED",
    project_uuid: "project-1",
    vendor_uuid: "vendor-1",
    corporation_uuid: "corp-1",
    total_po_amount: 3000,
    status: "Completed",
    po_type: "MATERIAL",
  },
  {
    uuid: "po-draft",
    po_number: "PO-DRAFT",
    project_uuid: "project-1",
    vendor_uuid: "vendor-1",
    corporation_uuid: "corp-1",
    total_po_amount: 4000,
    status: "Draft",
    po_type: "MATERIAL",
  },
  {
    uuid: "po-ready",
    po_number: "PO-READY",
    project_uuid: "project-1",
    vendor_uuid: "vendor-1",
    corporation_uuid: "corp-1",
    total_po_amount: 5000,
    status: "Ready",
    po_type: "MATERIAL",
  },
  {
    uuid: "po-rejected",
    po_number: "PO-REJECTED",
    project_uuid: "project-1",
    vendor_uuid: "vendor-1",
    corporation_uuid: "corp-1",
    total_po_amount: 6000,
    status: "Rejected",
    po_type: "MATERIAL",
  },
]);

vi.mock("@/stores/purchaseOrders", () => {
  const usePurchaseOrdersStore = defineStore("purchaseOrders", () => ({
    purchaseOrders,
    fetchPurchaseOrders: vi.fn(),
    loading: ref(false),
  }));
  return { usePurchaseOrdersStore };
});

// Mock change orders with various statuses
const changeOrders = ref([
  {
    uuid: "co-approved",
    co_number: "CO-APPROVED",
    project_uuid: "project-1",
    vendor_uuid: "vendor-1",
    corporation_uuid: "corp-1",
    total_co_amount: 1000,
    status: "Approved",
    co_type: "MATERIAL",
  },
  {
    uuid: "co-partially-received",
    co_number: "CO-PARTIAL",
    project_uuid: "project-1",
    vendor_uuid: "vendor-1",
    corporation_uuid: "corp-1",
    total_co_amount: 2000,
    status: "Partially_Received",
    co_type: "MATERIAL",
  },
  {
    uuid: "co-completed",
    co_number: "CO-COMPLETED",
    project_uuid: "project-1",
    vendor_uuid: "vendor-1",
    corporation_uuid: "corp-1",
    total_co_amount: 3000,
    status: "Completed",
    co_type: "MATERIAL",
  },
  {
    uuid: "co-draft",
    co_number: "CO-DRAFT",
    project_uuid: "project-1",
    vendor_uuid: "vendor-1",
    corporation_uuid: "corp-1",
    total_co_amount: 4000,
    status: "Draft",
    co_type: "MATERIAL",
  },
  {
    uuid: "co-ready",
    co_number: "CO-READY",
    project_uuid: "project-1",
    vendor_uuid: "vendor-1",
    corporation_uuid: "corp-1",
    total_co_amount: 5000,
    status: "Ready",
    co_type: "MATERIAL",
  },
  {
    uuid: "co-rejected",
    co_number: "CO-REJECTED",
    project_uuid: "project-1",
    vendor_uuid: "vendor-1",
    corporation_uuid: "corp-1",
    total_co_amount: 6000,
    status: "Rejected",
    co_type: "MATERIAL",
  },
]);

vi.mock("@/stores/changeOrders", () => {
  const useChangeOrdersStore = defineStore("changeOrders", () => ({
    changeOrders,
    fetchChangeOrders: vi.fn(),
  }));
  return { useChangeOrdersStore };
});

vi.mock("@/stores/purchaseOrderResources", () => {
  const usePurchaseOrderResourcesStore = defineStore("purchaseOrderResources", () => ({
    fetchPurchaseOrderItems: vi.fn().mockResolvedValue([]),
    getPreferredItems: vi.fn().mockReturnValue([]),
    ensurePreferredItems: vi.fn().mockResolvedValue(undefined),
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
  const fromUTCString = (value: string) => value.split("T")[0] ?? value;
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
    template: '<div class="u-select-menu-stub" :data-items="JSON.stringify(items)"><slot /></div>',
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
      <option value="project-1">Project 1</option>
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
  template: `<div class="receipt-note-items-table-stub"></div>`,
};

// Mock $fetch to return purchase orders and change orders
const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

// Default mock implementation - can be overridden in tests
mockFetch.mockImplementation((url: string) => {
  if (url.includes("/api/purchase-order-forms")) {
    return Promise.resolve({ data: purchaseOrders.value });
  }
  if (url.includes("/api/change-orders")) {
    return Promise.resolve({ data: changeOrders.value });
  }
  return Promise.resolve({ data: [] });
});

const mountForm = (formOverrides: Record<string, any> = {}) => {
  const form = {
    uuid: null,
    corporation_uuid: "corp-1",
    project_uuid: "project-1",
    purchase_order_uuid: null,
    change_order_uuid: null,
    entry_date: "2024-04-01T00:00:00.000Z",
    reference_number: "",
    received_by: "",
    location_uuid: null,
    status: "Shipment",
    total_received_amount: null,
    attachments: [],
    notes: "",
    grn_number: "GRN-000001",
    receipt_type: "purchase_order",
    receipt_items: [],
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

describe("ReceiptNoteForm - Status Filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    users.value = [];
    hasData.value = false;
    
    // Reset mock to return purchase orders and change orders
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/purchase-order-forms")) {
        return Promise.resolve({ data: purchaseOrders.value });
      }
      if (url.includes("/api/change-orders")) {
        return Promise.resolve({ data: changeOrders.value });
      }
      return Promise.resolve({ data: [] });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Purchase Order Status Filtering - New Receipt Note", () => {
    it("should only show Approved and Partially_Received POs when creating new receipt note", async () => {
      const wrapper = mountForm({
        uuid: null, // New receipt note
        project_uuid: "project-1",
      });

      await flushPromises();

      // Access the component instance to check poOptions
      const vm = wrapper.vm as any;
      const poOptions = vm.poOptions;

      // Should only include Approved and Partially_Received
      expect(poOptions).toHaveLength(2);
      expect(poOptions.map((opt: any) => opt.value)).toContain("po-approved");
      expect(poOptions.map((opt: any) => opt.value)).toContain("po-partially-received");
      
      // Should NOT include Completed, Draft, Ready, or Rejected
      expect(poOptions.map((opt: any) => opt.value)).not.toContain("po-completed");
      expect(poOptions.map((opt: any) => opt.value)).not.toContain("po-draft");
      expect(poOptions.map((opt: any) => opt.value)).not.toContain("po-ready");
      expect(poOptions.map((opt: any) => opt.value)).not.toContain("po-rejected");
    });

    it("should show all three statuses (Approved, Partially_Received, Completed) when editing existing receipt note", async () => {
      const wrapper = mountForm({
        uuid: "receipt-note-1", // Existing receipt note
        project_uuid: "project-1",
      });

      await flushPromises();

      // Access the component instance to check poOptions
      const vm = wrapper.vm as any;
      const poOptions = vm.poOptions;

      // Should include Approved, Partially_Received, and Completed
      expect(poOptions).toHaveLength(3);
      expect(poOptions.map((opt: any) => opt.value)).toContain("po-approved");
      expect(poOptions.map((opt: any) => opt.value)).toContain("po-partially-received");
      expect(poOptions.map((opt: any) => opt.value)).toContain("po-completed");
      
      // Should NOT include Draft, Ready, or Rejected
      expect(poOptions.map((opt: any) => opt.value)).not.toContain("po-draft");
      expect(poOptions.map((opt: any) => opt.value)).not.toContain("po-ready");
      expect(poOptions.map((opt: any) => opt.value)).not.toContain("po-rejected");
    });

    it("should handle case-insensitive status matching", async () => {
      // Update one PO to have lowercase status
      purchaseOrders.value = purchaseOrders.value.map((po) => {
        if (po.uuid === "po-approved") {
          return { ...po, status: "approved" }; // lowercase
        }
        if (po.uuid === "po-partially-received") {
          return { ...po, status: "partially_received" }; // lowercase
        }
        if (po.uuid === "po-completed") {
          return { ...po, status: "completed" }; // lowercase
        }
        return po;
      });

      const wrapper = mountForm({
        uuid: "receipt-note-1", // Existing receipt note
        project_uuid: "project-1",
      });

      await flushPromises();

      const vm = wrapper.vm as any;
      const poOptions = vm.poOptions;

      // Should still match despite case differences
      expect(poOptions).toHaveLength(3);
      expect(poOptions.map((opt: any) => opt.value)).toContain("po-approved");
      expect(poOptions.map((opt: any) => opt.value)).toContain("po-partially-received");
      expect(poOptions.map((opt: any) => opt.value)).toContain("po-completed");
    });
  });

  describe("Change Order Status Filtering - New Receipt Note", () => {
    it("should only show Approved and Partially_Received COs when creating new receipt note", async () => {
      const wrapper = mountForm({
        uuid: null, // New receipt note
        project_uuid: "project-1",
        receipt_type: "change_order",
      });

      await flushPromises();

      // Access the component instance to check coOptions
      const vm = wrapper.vm as any;
      const coOptions = vm.coOptions;

      // Should only include Approved and Partially_Received
      expect(coOptions).toHaveLength(2);
      expect(coOptions.map((opt: any) => opt.value)).toContain("co-approved");
      expect(coOptions.map((opt: any) => opt.value)).toContain("co-partially-received");
      
      // Should NOT include Completed, Draft, Ready, or Rejected
      expect(coOptions.map((opt: any) => opt.value)).not.toContain("co-completed");
      expect(coOptions.map((opt: any) => opt.value)).not.toContain("co-draft");
      expect(coOptions.map((opt: any) => opt.value)).not.toContain("co-ready");
      expect(coOptions.map((opt: any) => opt.value)).not.toContain("co-rejected");
    });

    it("should show all three statuses (Approved, Partially_Received, Completed) when editing existing receipt note", async () => {
      const wrapper = mountForm({
        uuid: "receipt-note-1", // Existing receipt note
        project_uuid: "project-1",
        receipt_type: "change_order",
      });

      await flushPromises();

      // Access the component instance to check coOptions
      const vm = wrapper.vm as any;
      const coOptions = vm.coOptions;

      // Should include Approved, Partially_Received, and Completed
      expect(coOptions).toHaveLength(3);
      expect(coOptions.map((opt: any) => opt.value)).toContain("co-approved");
      expect(coOptions.map((opt: any) => opt.value)).toContain("co-partially-received");
      expect(coOptions.map((opt: any) => opt.value)).toContain("co-completed");
      
      // Should NOT include Draft, Ready, or Rejected
      expect(coOptions.map((opt: any) => opt.value)).not.toContain("co-draft");
      expect(coOptions.map((opt: any) => opt.value)).not.toContain("co-ready");
      expect(coOptions.map((opt: any) => opt.value)).not.toContain("co-rejected");
    });

    it("should handle case-insensitive status matching for change orders", async () => {
      // Update one CO to have lowercase status
      changeOrders.value = changeOrders.value.map((co) => {
        if (co.uuid === "co-approved") {
          return { ...co, status: "approved" }; // lowercase
        }
        if (co.uuid === "co-partially-received") {
          return { ...co, status: "partially_received" }; // lowercase
        }
        if (co.uuid === "co-completed") {
          return { ...co, status: "completed" }; // lowercase
        }
        return co;
      });

      const wrapper = mountForm({
        uuid: "receipt-note-1", // Existing receipt note
        project_uuid: "project-1",
        receipt_type: "change_order",
      });

      await flushPromises();

      const vm = wrapper.vm as any;
      const coOptions = vm.coOptions;

      // Should still match despite case differences
      expect(coOptions).toHaveLength(3);
      expect(coOptions.map((opt: any) => opt.value)).toContain("co-approved");
      expect(coOptions.map((opt: any) => opt.value)).toContain("co-partially-received");
      expect(coOptions.map((opt: any) => opt.value)).toContain("co-completed");
    });
  });

  describe("Status Filtering Edge Cases", () => {
    it("should handle empty status gracefully", async () => {
      // Add a PO with empty/null status
      purchaseOrders.value.push({
        uuid: "po-empty-status",
        po_number: "PO-EMPTY",
        project_uuid: "project-1",
        vendor_uuid: "vendor-1",
        total_po_amount: 7000,
        status: "",
        po_type: "MATERIAL",
      });

      const wrapper = mountForm({
        uuid: null,
        project_uuid: "project-1",
      });

      await flushPromises();

      const vm = wrapper.vm as any;
      const poOptions = vm.poOptions;

      // Should not include PO with empty status
      expect(poOptions.map((opt: any) => opt.value)).not.toContain("po-empty-status");
    });

    it("should filter by project_uuid correctly", async () => {
      // Add a PO for a different project
      purchaseOrders.value.push({
        uuid: "po-other-project",
        po_number: "PO-OTHER",
        project_uuid: "project-2",
        vendor_uuid: "vendor-1",
        total_po_amount: 8000,
        status: "Approved",
        po_type: "MATERIAL",
      });

      const wrapper = mountForm({
        uuid: null,
        project_uuid: "project-1",
      });

      await flushPromises();

      const vm = wrapper.vm as any;
      const poOptions = vm.poOptions;

      // Should not include PO from different project
      expect(poOptions.map((opt: any) => opt.value)).not.toContain("po-other-project");
    });

    it("should update options when switching between new and edit mode", async () => {
      // Start with new receipt note
      const wrapper = mountForm({
        uuid: null,
        project_uuid: "project-1",
      });

      await flushPromises();

      let vm = wrapper.vm as any;
      let poOptions = vm.poOptions;

      // Should have 2 options (Approved, Partially_Received)
      expect(poOptions).toHaveLength(2);

      // Switch to edit mode
      await wrapper.setProps({
        form: {
          ...wrapper.props().form,
          uuid: "receipt-note-1",
        },
        editingReceiptNote: true,
      });

      await flushPromises();

      vm = wrapper.vm as any;
      poOptions = vm.poOptions;

      // Should now have 3 options (Approved, Partially_Received, Completed)
      expect(poOptions).toHaveLength(3);
      expect(poOptions.map((opt: any) => opt.value)).toContain("po-completed");
    });
  });
});

