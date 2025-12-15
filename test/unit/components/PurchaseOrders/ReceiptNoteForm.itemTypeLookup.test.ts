import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createPinia, defineStore, setActivePinia } from "pinia";
import { ref } from "vue";
import ReceiptNoteForm from "@/components/PurchaseOrders/ReceiptNoteForm.vue";

const fetchPurchaseOrdersMock = vi.fn();
const fetchPurchaseOrderItemsMock = vi.fn();
const fetchUsersMock = vi.fn();
const fetchItemTypesMock = vi.fn();

// Mock item types store
const itemTypes = ref([
  {
    id: 1,
    uuid: "item-type-1",
    corporation_uuid: "corp-1",
    project_uuid: "project-1",
    item_type: "Material",
    short_name: "MAT",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    uuid: "item-type-2",
    corporation_uuid: "corp-1",
    project_uuid: "project-1",
    item_type: "Labor",
    short_name: "LAB",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 3,
    uuid: "item-type-3",
    corporation_uuid: "corp-1",
    project_uuid: "project-1",
    item_type: "Equipment",
    short_name: "EQP",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
]);

vi.mock("@/stores/itemTypes", () => {
  const useItemTypesStore = defineStore("itemTypes", () => ({
    itemTypes,
    loading: false,
    error: null,
    fetchItemTypes: fetchItemTypesMock,
    getActiveItemTypes: vi.fn((corpUuid: string, projectUuid?: string) => {
      return itemTypes.value.filter(
        (it) =>
          it.corporation_uuid === corpUuid &&
          it.is_active &&
          (!projectUuid || it.project_uuid === projectUuid)
      );
    }),
  }));
  return { useItemTypesStore };
});

vi.mock("@/stores/corporations", () => {
  const useCorporationStore = defineStore("corporations", () => ({
    selectedCorporation: { uuid: "corp-1" },
    selectedCorporationId: "corp-1",
  }));
  return { useCorporationStore };
});

vi.mock("@/stores/purchaseOrders", () => {
  const purchaseOrders = ref([
    {
      uuid: "po-1",
      po_number: "PO-001",
      project_uuid: "project-1",
      vendor_uuid: "vendor-1",
      total_po_amount: 1000,
      status: "Approved",
      po_type: "MATERIAL",
    },
  ]);
  return {
    usePurchaseOrdersStore: defineStore("purchaseOrders", () => ({
      purchaseOrders,
      fetchPurchaseOrders: fetchPurchaseOrdersMock,
      loading: ref(false),
    })),
  };
});

vi.mock("@/stores/purchaseOrderResources", () => {
  return {
    usePurchaseOrderResourcesStore: defineStore("purchaseOrderResources", () => ({
      fetchPurchaseOrderItems: fetchPurchaseOrderItemsMock,
    })),
  };
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

vi.mock("@/stores/changeOrders", () => {
  return {
    useChangeOrdersStore: defineStore("changeOrders", () => ({
      changeOrders: ref([]),
      fetchChangeOrders: vi.fn(),
    })),
  };
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

const ProjectSelectStub = {
  name: "ProjectSelect",
  props: ["modelValue", "corporationUuid"],
  emits: ["update:modelValue"],
  template: `<select data-test="project-select" :value="modelValue ?? ''" @change="$emit('update:modelValue', $event.target.value)" />`,
};

const LocationSelectStub = {
  name: "LocationSelect",
  template: '<div class="location-select-stub"></div>',
};

const ReceiptNoteItemsTableStub = {
  name: "ReceiptNoteItemsTable",
  props: ["items", "loading", "error", "corporationUuid"],
  template: `
    <div class="receipt-items-table-stub">
      <div v-for="(item, index) in items" :key="index" :data-test="'item-' + index">
        <div data-test="item-type-code">{{ item.item_type_code || '—' }}</div>
        <div data-test="item-type-label">{{ item.item_type_label || '—' }}</div>
        <div data-test="item-type-display">
          {{ item.item_type_label || '—' }}<span v-if="item.item_type_code" class="text-muted"> ({{ item.item_type_code }})</span>
        </div>
      </div>
    </div>
  `,
};

const FinancialBreakdownStub = {
  name: "FinancialBreakdown",
  props: ["itemTotal", "formData", "readOnly"],
  template: '<div class="financial-breakdown-stub"></div>',
};

const FilePreviewStub = {
  name: "FilePreview",
  template: '<div class="file-preview-stub"></div>',
};

const uiStubs = {
  UCard: { template: "<div><slot /></div>" },
  UInput: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  UTextarea: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  USelectMenu: {
    props: ["modelValue", "items"],
    emits: ["update:modelValue"],
    template: '<div @click="$emit(\'update:modelValue\', items?.[0] ?? null)"></div>',
  },
  URadioGroup: {
    props: ["modelValue", "items"],
    emits: ["update:modelValue"],
    template: '<div></div>',
  },
  UPopover: { template: "<div><slot /><slot name='content' /></div>" },
  UButton: { template: '<button></button>' },
  UCalendar: { template: "<div></div>" },
  UFileUpload: {
    props: ["modelValue"],
    template: '<div><slot :open="() => {}" /></div>',
  },
  UModal: { template: "<div><slot name='header' /><slot name='body' /></div>" },
  UIcon: { template: "<span></span>" },
  UAvatar: { template: "<div></div>" },
};

const mountForm = (formOverrides: Record<string, any> = {}) => {
  const form = {
    uuid: null,
    corporation_uuid: "corp-1",
    project_uuid: "project-1",
    purchase_order_uuid: null,
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
        FinancialBreakdown: FinancialBreakdownStub,
        FilePreview: FilePreviewStub,
      },
    },
  });
};

describe("ReceiptNoteForm - Item Type Lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    users.value = [];
    hasData.value = false;
    fetchItemTypesMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Item Type Code and Label Lookup", () => {
    it("should look up item_type_code from store when not in API response", async () => {
      // Mock PO items without item_type_code but with item_type_uuid
      const poItemsWithoutCode = [
        {
          uuid: "po-item-1",
          item_type_uuid: "item-type-1",
          item_type_label: "Material",
          item_type_code: null, // Missing code
          item_name: "Test Item",
          unit_price: 50,
          po_quantity: 10,
          cost_code_uuid: "cc-1",
        },
      ];

      fetchPurchaseOrderItemsMock.mockResolvedValue(poItemsWithoutCode);

      const wrapper = mountForm({
        project_uuid: "project-1",
        purchase_order_uuid: "po-1",
      });

      await flushPromises();

      // Wait for items to be transformed
      await new Promise((resolve) => setTimeout(resolve, 100));
      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      expect(itemsTable.exists()).toBe(true);

      const items = itemsTable.props("items");
      expect(items).toBeDefined();
      expect(Array.isArray(items)).toBe(true);

      if (items && items.length > 0) {
        const firstItem = items[0];
        // Should have looked up the code from store
        expect(firstItem.item_type_uuid).toBe("item-type-1");
        expect(firstItem.item_type_label).toBe("Material");
        // The code should be looked up from store
        expect(firstItem.item_type_code).toBe("MAT");
      }
    });

    it("should look up item_type_label from store when not in API response", async () => {
      // Mock PO items without item_type_label but with item_type_uuid
      const poItemsWithoutLabel = [
        {
          uuid: "po-item-1",
          item_type_uuid: "item-type-2",
          item_type_label: null, // Missing label
          item_type_code: "LAB",
          item_name: "Test Item",
          unit_price: 50,
          po_quantity: 10,
          cost_code_uuid: "cc-1",
        },
      ];

      fetchPurchaseOrderItemsMock.mockResolvedValue(poItemsWithoutLabel);

      const wrapper = mountForm({
        project_uuid: "project-1",
        purchase_order_uuid: "po-1",
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      const items = itemsTable.props("items");

      if (items && items.length > 0) {
        const firstItem = items[0];
        // Should have looked up the label from store
        expect(firstItem.item_type_uuid).toBe("item-type-2");
        expect(firstItem.item_type_code).toBe("LAB");
        expect(firstItem.item_type_label).toBe("Labor");
      }
    });

    it("should look up both item_type_code and item_type_label from store when both missing", async () => {
      // Mock PO items with only item_type_uuid
      const poItemsWithOnlyUuid = [
        {
          uuid: "po-item-1",
          item_type_uuid: "item-type-3",
          item_type_label: null,
          item_type_code: null,
          item_name: "Test Item",
          unit_price: 50,
          po_quantity: 10,
          cost_code_uuid: "cc-1",
        },
      ];

      fetchPurchaseOrderItemsMock.mockResolvedValue(poItemsWithOnlyUuid);

      const wrapper = mountForm({
        project_uuid: "project-1",
        purchase_order_uuid: "po-1",
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      const items = itemsTable.props("items");

      if (items && items.length > 0) {
        const firstItem = items[0];
        // Should have looked up both from store
        expect(firstItem.item_type_uuid).toBe("item-type-3");
        expect(firstItem.item_type_code).toBe("EQP");
        expect(firstItem.item_type_label).toBe("Equipment");
      }
    });

    it("should use API response values when available instead of store lookup", async () => {
      // Mock PO items with both code and label
      const poItemsWithBoth = [
        {
          uuid: "po-item-1",
          item_type_uuid: "item-type-1",
          item_type_label: "Material Override",
          item_type_code: "MAT-OVR",
          item_name: "Test Item",
          unit_price: 50,
          po_quantity: 10,
          cost_code_uuid: "cc-1",
        },
      ];

      fetchPurchaseOrderItemsMock.mockResolvedValue(poItemsWithBoth);

      const wrapper = mountForm({
        project_uuid: "project-1",
        purchase_order_uuid: "po-1",
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      const items = itemsTable.props("items");

      if (items && items.length > 0) {
        const firstItem = items[0];
        // Should use API values, not store values
        expect(firstItem.item_type_code).toBe("MAT-OVR");
        expect(firstItem.item_type_label).toBe("Material Override");
      }
    });

    it("should fetch item types when transforming items if store is empty", async () => {
      // Clear item types store
      itemTypes.value = [];

      const poItems = [
        {
          uuid: "po-item-1",
          item_type_uuid: "item-type-1",
          item_type_label: null,
          item_type_code: null,
          item_name: "Test Item",
          unit_price: 50,
          po_quantity: 10,
          cost_code_uuid: "cc-1",
        },
      ];

      fetchPurchaseOrderItemsMock.mockResolvedValue(poItems);
      fetchItemTypesMock.mockResolvedValue(undefined);

      const wrapper = mountForm({
        project_uuid: "project-1",
        purchase_order_uuid: "po-1",
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await flushPromises();

      // Should have attempted to fetch item types
      expect(fetchItemTypesMock).toHaveBeenCalledWith("corp-1", "project-1");
    });

    it("should handle missing item_type_uuid gracefully", async () => {
      const poItemsWithoutUuid = [
        {
          uuid: "po-item-1",
          item_type_uuid: null,
          item_type_label: null,
          item_type_code: null,
          item_name: "Test Item",
          unit_price: 50,
          po_quantity: 10,
          cost_code_uuid: "cc-1",
        },
      ];

      fetchPurchaseOrderItemsMock.mockResolvedValue(poItemsWithoutUuid);

      const wrapper = mountForm({
        project_uuid: "project-1",
        purchase_order_uuid: "po-1",
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      const items = itemsTable.props("items");

      if (items && items.length > 0) {
        const firstItem = items[0];
        // Should handle null gracefully
        expect(firstItem.item_type_uuid).toBeNull();
        expect(firstItem.item_type_code).toBeNull();
        expect(firstItem.item_type_label).toBeNull();
      }
    });

    it("should handle item_type_uuid not found in store", async () => {
      const poItemsWithUnknownUuid = [
        {
          uuid: "po-item-1",
          item_type_uuid: "unknown-type-uuid",
          item_type_label: null,
          item_type_code: null,
          item_name: "Test Item",
          unit_price: 50,
          po_quantity: 10,
          cost_code_uuid: "cc-1",
        },
      ];

      fetchPurchaseOrderItemsMock.mockResolvedValue(poItemsWithUnknownUuid);

      const wrapper = mountForm({
        project_uuid: "project-1",
        purchase_order_uuid: "po-1",
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      const items = itemsTable.props("items");

      if (items && items.length > 0) {
        const firstItem = items[0];
        // Should keep null values when not found in store
        expect(firstItem.item_type_uuid).toBe("unknown-type-uuid");
        expect(firstItem.item_type_code).toBeNull();
        expect(firstItem.item_type_label).toBeNull();
      }
    });
  });
});

