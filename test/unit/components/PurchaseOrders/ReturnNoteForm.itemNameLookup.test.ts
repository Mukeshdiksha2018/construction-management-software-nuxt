import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createPinia, defineStore, setActivePinia } from "pinia";
import { ref } from "vue";
import ReturnNoteForm from "@/components/PurchaseOrders/ReturnNoteForm.vue";

const fetchPurchaseOrderItemsMock = vi.fn();
const getPreferredItemsMock = vi.fn();
const ensurePreferredItemsMock = vi.fn();

vi.mock("@/stores/corporations", () => {
  const useCorporationStore = defineStore("corporations", () => ({
    selectedCorporation: { uuid: "corp-1" },
    selectedCorporationId: "corp-1",
  }));
  return { useCorporationStore };
});

vi.mock("@/stores/purchaseOrderResources", () => {
  return {
    usePurchaseOrderResourcesStore: defineStore("purchaseOrderResources", () => ({
      fetchPurchaseOrderItems: fetchPurchaseOrderItemsMock,
      getPreferredItems: getPreferredItemsMock,
      ensurePreferredItems: ensurePreferredItemsMock,
    })),
  };
});

vi.mock("@/stores/changeOrders", () => {
  const useChangeOrdersStore = defineStore("changeOrders", () => ({
    changeOrders: ref([]),
    fetchChangeOrders: vi.fn(),
  }));
  return { useChangeOrdersStore };
});

vi.mock("@/stores/purchaseOrders", () => {
  const usePurchaseOrdersStore = defineStore("purchaseOrders", () => {
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
      purchaseOrders,
      fetchPurchaseOrders: vi.fn().mockResolvedValue(undefined),
      loading: ref(false),
    };
  });
  return { usePurchaseOrdersStore };
});

vi.mock("@/stores/vendors", () => {
  const useVendorStore = defineStore("vendors", () => ({
    vendors: ref([]),
    fetchVendors: vi.fn().mockResolvedValue(undefined),
  }));
  return { useVendorStore };
});

vi.mock("@/stores/itemTypes", () => {
  const useItemTypesStore = defineStore("itemTypes", () => ({
    itemTypes: ref([]),
    fetchItemTypes: vi.fn().mockResolvedValue(undefined),
  }));
  return { useItemTypesStore };
});

vi.mock("@/stores/userProfiles", () => {
  const useUserProfilesStore = defineStore("userProfiles", () => ({
    users: ref([]),
    hasData: ref(false),
    fetchUsers: vi.fn(),
  }));
  return { useUserProfilesStore };
});

vi.mock("@/stores/stockReceiptNotes", () => {
  const useStockReceiptNotesStore = defineStore("stockReceiptNotes", () => ({
    stockReceiptNotes: ref([]),
    fetchStockReceiptNotes: vi.fn().mockResolvedValue(undefined),
  }));
  return { useStockReceiptNotesStore };
});

vi.mock("@/stores/stockReturnNotes", () => {
  const useStockReturnNotesStore = defineStore("stockReturnNotes", () => ({
    stockReturnNotes: ref([]),
    paginationInfo: ref({}),
    fetchStockReturnNotes: vi.fn().mockResolvedValue(undefined),
    getPaginationInfo: vi.fn(() => null),
  }));
  return { useStockReturnNotesStore };
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
    currencySymbol: ref("$"),
    formatCurrency: vi.fn((amount: number) => `$${amount.toFixed(2)}`),
  }),
}));

vi.mock("@/composables/useLocalPOCOData", () => ({
  useLocalPOCOData: () => ({
    localPurchaseOrders: ref([
      {
        uuid: "po-1",
        po_number: "PO-001",
        project_uuid: "project-1",
        vendor_uuid: "vendor-1",
        status: "Approved",
        po_type: "MATERIAL",
      },
    ]),
    localChangeOrders: ref([]),
    fetchLocalPurchaseOrders: vi.fn().mockResolvedValue(undefined),
    fetchLocalChangeOrders: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock $fetch for return note items API
const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

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
    template:
      '<div class="u-modal-stub"><slot /><slot name="header" /><slot name="body" /></div>',
  },
  UIcon: {
    name: "UIcon",
    props: ["name"],
    template: '<span class="u-icon-stub"></span>',
  },
  UAvatar: { template: "<div class='u-avatar-stub'></div>" },
};

const ReturnNoteItemsTableStub = {
  name: "ReturnNoteItemsTable",
  props: ["items", "loading", "error", "corporationUuid", "returnType"],
  emits: ["return-quantity-change"],
  template: `
    <div class="return-note-items-table-stub">
      <div v-for="(item, index) in items" :key="index" :data-test="'item-' + index">
        <div :data-test="'item-' + index + '-item-name'">{{ item.item_name || '—' }}</div>
        <div :data-test="'item-' + index + '-description'">{{ item.description || '—' }}</div>
        <div :data-test="'item-' + index + '-item-uuid'">{{ item.item_uuid || 'null' }}</div>
      </div>
    </div>
  `,
};

const ProjectSelectStub = {
  name: "ProjectSelect",
  props: ["modelValue", "corporationUuid"],
  emits: ["update:modelValue"],
  template:
    '<select class="project-select-stub" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" />',
};

const LocationSelectStub = {
  name: "LocationSelect",
  props: ["modelValue", "corporationUuid"],
  emits: ["update:modelValue"],
  template:
    '<select class="location-select-stub" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" />',
};

const CorporationSelectStub = {
  name: "CorporationSelect",
  props: ["modelValue"],
  emits: ["update:modelValue"],
  template:
    '<select class="corporation-select-stub" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" />',
};

const mountForm = (formOverrides: Record<string, any> = {}) => {
  const form = {
    uuid: null,
    corporation_uuid: "corp-1",
    project_uuid: formOverrides.project_uuid !== undefined ? formOverrides.project_uuid : "project-1",
    purchase_order_uuid: formOverrides.purchase_order_uuid !== undefined ? formOverrides.purchase_order_uuid : "po-1",
    change_order_uuid: formOverrides.change_order_uuid !== undefined ? formOverrides.change_order_uuid : null,
    return_type: formOverrides.return_type !== undefined ? formOverrides.return_type : "purchase_order",
    entry_date: "2024-04-01T00:00:00.000Z",
    reference_number: "",
    returned_by: "",
    location_uuid: null,
    status: "Returned",
    total_return_amount: null,
    attachments: [],
    notes: "",
    return_number: "RTN-000001",
    return_items: [],
    ...formOverrides,
  };

  return mount(ReturnNoteForm, {
    props: {
      form,
      editingReturnNote: Boolean(form.uuid),
    },
    global: {
      plugins: [createPinia()],
      stubs: {
        ...uiStubs,
        ProjectSelect: ProjectSelectStub,
        LocationSelect: LocationSelectStub,
        CorporationSelect: CorporationSelectStub,
        ReturnNoteItemsTable: ReturnNoteItemsTableStub,
        FinancialBreakdown: { template: '<div class="financial-breakdown-stub"></div>' },
        FilePreview: { template: '<div class="file-preview-stub"></div>' },
      },
    },
  });
};

describe("ReturnNoteForm - Item Name Lookup from Preferred Items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    
    // Reset mocks
    fetchPurchaseOrderItemsMock.mockReset();
    getPreferredItemsMock.mockReset();
    ensurePreferredItemsMock.mockReset();
    mockFetch.mockReset();
    
    // Default mock for return note items
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/return-note-items")) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes("/api/stock-receipt-notes")) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes("/api/stock-return-notes")) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes("/api/purchase-orders/vendors")) {
        return Promise.resolve([]);
      }
      return Promise.resolve({ data: [] });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Item Name Lookup Priority", () => {
    it("should prioritize item_name from preferred items by item_uuid", async () => {
      const itemUuid1 = "item-uuid-1";
      const itemUuid2 = "item-uuid-2";
      
      // Mock preferred items with correct item names
      const preferredItems = [
        {
          item_uuid: itemUuid1,
          item_name: "Paper",
          item_sequence: "1001",
          unit: "TNS",
        },
        {
          item_uuid: itemUuid2,
          item_name: "Pen",
          item_sequence: "1002",
          unit: "EA",
        },
      ];
      
      getPreferredItemsMock.mockReturnValue(preferredItems);
      ensurePreferredItemsMock.mockResolvedValue(undefined);
      
      // Mock PO items where item_name is actually description (wrong data)
      const poItems = [
        {
          uuid: "po-item-1",
          item_uuid: itemUuid1,
          item_name: "used to write", // This is wrong - should be "Paper"
          description: "used to write",
          po_quantity: 10,
          po_unit_price: 5.00,
          cost_code_uuid: "cc-1",
          metadata: {},
        },
        {
          uuid: "po-item-2",
          item_uuid: itemUuid2,
          item_name: "used for book", // This is wrong - should be "Pen"
          description: "used for book",
          po_quantity: 20,
          po_unit_price: 2.50,
          cost_code_uuid: "cc-2",
          metadata: {},
        },
      ];
      
      fetchPurchaseOrderItemsMock.mockResolvedValue(poItems);
      
      const wrapper = mountForm({
        purchase_order_uuid: "po-1",
        project_uuid: "project-1",
        return_type: "purchase_order",
      });
      
      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      // Check that preferred items were fetched
      expect(ensurePreferredItemsMock).toHaveBeenCalled();
      
      // Check that return items have correct item_name from preferred items
      const itemsTable = wrapper.findComponent({ name: "ReturnNoteItemsTable" });
      expect(itemsTable.exists()).toBe(true);
      
      const items = itemsTable.props("items");
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      
      // Verify item names are from preferred items, not from PO items
      const item1 = items.find((item: any) => item.item_uuid === itemUuid1);
      const item2 = items.find((item: any) => item.item_uuid === itemUuid2);
      
      expect(item1).toBeDefined();
      expect(item1?.item_name).toBe("Paper"); // Should be from preferred items
      expect(item1?.item_name).not.toBe("used to write"); // Should NOT be from PO item
      
      expect(item2).toBeDefined();
      expect(item2?.item_name).toBe("Pen"); // Should be from preferred items
      expect(item2?.item_name).not.toBe("used for book"); // Should NOT be from PO item
    });

    it("should fallback to item.item_name if preferred item not found", async () => {
      const itemUuid1 = "item-uuid-1";
      
      // Mock preferred items - item_uuid-1 is NOT in the list
      const preferredItems: any[] = [];
      
      getPreferredItemsMock.mockReturnValue(preferredItems);
      ensurePreferredItemsMock.mockResolvedValue(undefined);
      
      // Mock PO item with correct item_name
      const poItems = [
        {
          uuid: "po-item-1",
          item_uuid: itemUuid1,
          item_name: "Correct Item Name",
          description: "Item description",
          po_quantity: 10,
          po_unit_price: 5.00,
          cost_code_uuid: "cc-1",
          metadata: {},
        },
      ];
      
      fetchPurchaseOrderItemsMock.mockResolvedValue(poItems);
      
      const wrapper = mountForm({
        purchase_order_uuid: "po-1",
        project_uuid: "project-1",
        return_type: "purchase_order",
      });
      
      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      const itemsTable = wrapper.findComponent({ name: "ReturnNoteItemsTable" });
      const items = itemsTable.props("items");
      
      const item1 = items.find((item: any) => item.item_uuid === itemUuid1);
      expect(item1).toBeDefined();
      expect(item1?.item_name).toBe("Correct Item Name"); // Should use item.item_name as fallback
    });

    it("should fallback to metadata.item_name if item.item_name not available", async () => {
      const itemUuid1 = "item-uuid-1";
      
      // Mock preferred items - item_uuid-1 is NOT in the list
      const preferredItems: any[] = [];
      
      getPreferredItemsMock.mockReturnValue(preferredItems);
      ensurePreferredItemsMock.mockResolvedValue(undefined);
      
      // Mock PO item with item_name in metadata
      const poItems = [
        {
          uuid: "po-item-1",
          item_uuid: itemUuid1,
          item_name: null, // Not available
          description: "Item description",
          po_quantity: 10,
          po_unit_price: 5.00,
          cost_code_uuid: "cc-1",
          metadata: {
            item_name: "Metadata Item Name",
          },
        },
      ];
      
      fetchPurchaseOrderItemsMock.mockResolvedValue(poItems);
      
      const wrapper = mountForm({
        purchase_order_uuid: "po-1",
        project_uuid: "project-1",
        return_type: "purchase_order",
      });
      
      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      const itemsTable = wrapper.findComponent({ name: "ReturnNoteItemsTable" });
      const items = itemsTable.props("items");
      
      const item1 = items.find((item: any) => item.item_uuid === itemUuid1);
      expect(item1).toBeDefined();
      expect(item1?.item_name).toBe("Metadata Item Name"); // Should use metadata.item_name
    });

    it("should fallback to item.name if sequence exists and other sources don't have item_name", async () => {
      const itemUuid1 = "item-uuid-1";
      
      // Mock preferred items - item_uuid-1 is NOT in the list
      const preferredItems: any[] = [];
      
      getPreferredItemsMock.mockReturnValue(preferredItems);
      ensurePreferredItemsMock.mockResolvedValue(undefined);
      
      // Mock PO item with name field and sequence
      const poItems = [
        {
          uuid: "po-item-1",
          item_uuid: itemUuid1,
          item_name: null,
          name: "Item Name from Name Field",
          description: "Item description",
          sequence: "1001",
          po_quantity: 10,
          po_unit_price: 5.00,
          cost_code_uuid: "cc-1",
          metadata: {},
        },
      ];
      
      fetchPurchaseOrderItemsMock.mockResolvedValue(poItems);
      
      const wrapper = mountForm({
        purchase_order_uuid: "po-1",
        project_uuid: "project-1",
        return_type: "purchase_order",
      });
      
      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      const itemsTable = wrapper.findComponent({ name: "ReturnNoteItemsTable" });
      const items = itemsTable.props("items");
      
      const item1 = items.find((item: any) => item.item_uuid === itemUuid1);
      expect(item1).toBeDefined();
      expect(item1?.item_name).toBe("Item Name from Name Field"); // Should use item.name
    });

    it("should return null if no item_name found in any source", async () => {
      const itemUuid1 = "item-uuid-1";
      
      // Mock preferred items - item_uuid-1 is NOT in the list
      const preferredItems: any[] = [];
      
      getPreferredItemsMock.mockReturnValue(preferredItems);
      ensurePreferredItemsMock.mockResolvedValue(undefined);
      
      // Mock PO item with no item_name anywhere
      const poItems = [
        {
          uuid: "po-item-1",
          item_uuid: itemUuid1,
          item_name: null,
          description: "Item description",
          po_quantity: 10,
          po_unit_price: 5.00,
          cost_code_uuid: "cc-1",
          metadata: {},
        },
      ];
      
      fetchPurchaseOrderItemsMock.mockResolvedValue(poItems);
      
      const wrapper = mountForm({
        purchase_order_uuid: "po-1",
        project_uuid: "project-1",
        return_type: "purchase_order",
      });
      
      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      const itemsTable = wrapper.findComponent({ name: "ReturnNoteItemsTable" });
      const items = itemsTable.props("items");
      
      const item1 = items.find((item: any) => item.item_uuid === itemUuid1);
      expect(item1).toBeDefined();
      expect(item1?.item_name).toBeNull(); // Should be null when no source has item_name
    });

    it("should match preferred items by exact item_uuid (case-sensitive)", async () => {
      const itemUuid1 = "item-uuid-1";
      
      // Mock preferred items with matching item_uuid
      const preferredItems = [
        {
          item_uuid: itemUuid1, // Exact match
          item_name: "Paper",
          item_sequence: "1001",
          unit: "TNS",
        },
      ];
      
      getPreferredItemsMock.mockReturnValue(preferredItems);
      ensurePreferredItemsMock.mockResolvedValue(undefined);
      
      // Mock PO item with matching item_uuid
      const poItems = [
        {
          uuid: "po-item-1",
          item_uuid: itemUuid1,
          item_name: "wrong name",
          description: "Item description",
          po_quantity: 10,
          po_unit_price: 5.00,
          cost_code_uuid: "cc-1",
          metadata: {},
        },
      ];
      
      fetchPurchaseOrderItemsMock.mockResolvedValue(poItems);
      
      const wrapper = mountForm({
        purchase_order_uuid: "po-1",
        project_uuid: "project-1",
        return_type: "purchase_order",
      });
      
      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      const itemsTable = wrapper.findComponent({ name: "ReturnNoteItemsTable" });
      const items = itemsTable.props("items");
      
      const item1 = items.find((item: any) => item.item_uuid === itemUuid1);
      expect(item1).toBeDefined();
      expect(item1?.item_name).toBe("Paper"); // Should use preferred item's item_name when UUID matches exactly
    });

    it("should handle display_metadata.item_name as fallback", async () => {
      const itemUuid1 = "item-uuid-1";
      
      // Mock preferred items - item_uuid-1 is NOT in the list
      const preferredItems: any[] = [];
      
      getPreferredItemsMock.mockReturnValue(preferredItems);
      ensurePreferredItemsMock.mockResolvedValue(undefined);
      
      // Mock PO item with item_name in display_metadata
      const poItems = [
        {
          uuid: "po-item-1",
          item_uuid: itemUuid1,
          item_name: null,
          description: "Item description",
          po_quantity: 10,
          po_unit_price: 5.00,
          cost_code_uuid: "cc-1",
          metadata: {},
          display_metadata: {
            item_name: "Display Metadata Item Name",
          },
        },
      ];
      
      fetchPurchaseOrderItemsMock.mockResolvedValue(poItems);
      
      const wrapper = mountForm({
        purchase_order_uuid: "po-1",
        project_uuid: "project-1",
        return_type: "purchase_order",
      });
      
      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      const itemsTable = wrapper.findComponent({ name: "ReturnNoteItemsTable" });
      const items = itemsTable.props("items");
      
      const item1 = items.find((item: any) => item.item_uuid === itemUuid1);
      expect(item1).toBeDefined();
      expect(item1?.item_name).toBe("Display Metadata Item Name"); // Should use display_metadata.item_name
    });
  });
});

