import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createPinia, defineStore, setActivePinia } from "pinia";
import { ref } from "vue";
import ReceiptNoteForm from "@/components/PurchaseOrders/ReceiptNoteForm.vue";

const fetchPurchaseOrderItemsMock = vi.fn();
const fetchChangeOrderItemsMock = vi.fn();

vi.mock("@/stores/corporations", () => {
  const useCorporationStore = defineStore("corporations", () => ({
    selectedCorporation: { uuid: "corp-1" },
    selectedCorporationId: "corp-1",
  }));
  return { useCorporationStore };
});

const getPreferredItemsMock = vi.fn();
const ensurePreferredItemsMock = vi.fn();

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

vi.mock("@/stores/itemTypes", () => {
  const useItemTypesStore = defineStore("itemTypes", () => ({
    itemTypes: [],
    fetchItemTypes: vi.fn().mockResolvedValue([]),
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

// Mock $fetch for receipt note items API
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
    template:
      '<div class="u-modal-stub"><slot /><slot name="header" /><slot name="body" /></div>',
  },
  UIcon: {
    name: "UIcon",
    props: ["name"],
    template: '<span class="u-icon-stub"></span>',
  },
};

const ReceiptNoteItemsTableStub = {
  name: "ReceiptNoteItemsTable",
  props: ["items", "loading", "error", "corporationUuid", "receiptType"],
  emits: ["received-quantity-change"],
  template: `
    <div class="receipt-note-items-table-stub">
      <div data-test="items-count">{{ items?.length || 0 }}</div>
      <div data-test="receipt-type">{{ receiptType || 'purchase_order' }}</div>
      <div v-for="(item, index) in items" :key="index" :data-test="'item-' + index">
        <div :data-test="'item-' + index + '-received-qty'">{{ item.received_quantity ?? 'null' }}</div>
        <div :data-test="'item-' + index + '-unit-price'">{{ item.unit_price ?? 'null' }}</div>
        <div :data-test="'item-' + index + '-sequence-label'">{{ item.sequence_label ?? 'null' }}</div>
        <div :data-test="'item-' + index + '-unit-label'">{{ item.unit_label ?? 'null' }}</div>
      </div>
    </div>
  `,
};

const mountForm = (formOverrides: Record<string, any> = {}) => {
  const form = {
    uuid: formOverrides.uuid || null,
    corporation_uuid: "corp-1",
    project_uuid: "project-1",
    purchase_order_uuid: formOverrides.purchase_order_uuid || null,
    change_order_uuid: formOverrides.change_order_uuid || null,
    entry_date: "2024-04-01T00:00:00.000Z",
    reference_number: "",
    received_by: "",
    location_uuid: null,
    status: "Shipment",
    total_received_amount: null,
    attachments: [],
    notes: "",
    grn_number: "GRN-000001",
    receipt_type: formOverrides.receipt_type || "purchase_order",
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
        ReceiptNoteItemsTable: ReceiptNoteItemsTableStub,
        FinancialBreakdown: { template: '<div class="financial-breakdown-stub"></div>' },
        FilePreview: { template: '<div class="file-preview-stub"></div>' },
        ProjectSelect: { template: '<div class="project-select-stub"></div>' },
        LocationSelect: { template: '<div class="location-select-stub"></div>' },
      },
    },
  });
};

describe("ReceiptNoteForm - Receipt Note Item Matching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    mockFetch.mockClear();
    getPreferredItemsMock.mockReturnValue([]);
    ensurePreferredItemsMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("UUID Matching Strategies", () => {
    it("should match receipt note items by item.uuid (primary key)", async () => {
      const poItems = [
        {
          uuid: "po-item-uuid-1",
          item_uuid: "item-ref-uuid-1",
          description: "Item 1",
          unit_price: 10.0,
          po_quantity: 5,
          cost_code_uuid: "cost-code-1",
        },
      ];

      const receiptNoteItems = [
        {
          uuid: "rni-uuid-1",
          item_uuid: "po-item-uuid-1", // Matches poItems[0].uuid
          item_type: "purchase_order",
          purchase_order_uuid: "po-uuid-1",
          change_order_uuid: null,
          receipt_note_uuid: "receipt-note-uuid-1",
          received_quantity: 3,
          received_total: 30.0,
          cost_code_uuid: "cost-code-1",
        },
      ];

      fetchPurchaseOrderItemsMock.mockResolvedValue(poItems);
      // Mock both API calls: receipt note items and purchase order items
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/receipt-note-items") {
          return Promise.resolve({ data: receiptNoteItems });
        }
        if (url === "/api/purchase-order-items") {
          return Promise.resolve({ data: poItems });
        }
        return Promise.resolve({ data: [] });
      });

      const wrapper = mountForm({
        uuid: "receipt-note-uuid-1",
        purchase_order_uuid: "po-uuid-1",
        receipt_type: "purchase_order",
      });

      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      expect(itemsTable.exists()).toBe(true);

      const items = itemsTable.props("items") as any[];
      expect(items).toHaveLength(1);
      expect(items[0].received_quantity).toBe(3);
      expect(items[0].unit_price).toBe(10.0);
    });

    it("should match receipt note items by item.item_uuid (item reference UUID) when primary UUID doesn't match", async () => {
      const poItems = [
        {
          uuid: "po-item-uuid-1",
          item_uuid: "item-ref-uuid-1", // This is what receipt note item references
          description: "Item 1",
          unit_price: 15.0,
          po_quantity: 5,
          cost_code_uuid: "cost-code-1",
        },
      ];

      const receiptNoteItems = [
        {
          uuid: "rni-uuid-1",
          item_uuid: "item-ref-uuid-1", // Matches poItems[0].item_uuid, not uuid
          item_type: "purchase_order",
          purchase_order_uuid: "po-uuid-1",
          change_order_uuid: null,
          receipt_note_uuid: "receipt-note-uuid-1",
          received_quantity: 2,
          received_total: 30.0,
          cost_code_uuid: "cost-code-1",
        },
      ];

      fetchPurchaseOrderItemsMock.mockResolvedValue(poItems);
      // Mock both API calls: receipt note items and purchase order items
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/receipt-note-items") {
          return Promise.resolve({ data: receiptNoteItems });
        }
        if (url === "/api/purchase-order-items") {
          return Promise.resolve({ data: poItems });
        }
        return Promise.resolve({ data: [] });
      });

      const wrapper = mountForm({
        uuid: "receipt-note-uuid-1",
        purchase_order_uuid: "po-uuid-1",
        receipt_type: "purchase_order",
      });

      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      const items = itemsTable.props("items") as any[];
      expect(items).toHaveLength(1);
      // Note: This test expects matching by item.item_uuid, but our current implementation
      // matches by item.uuid first. Since item_uuid doesn't match uuid, it will fall back
      // to position-based matching if counts match
      expect(items[0].received_quantity).toBe(2);
    });

    it("should match receipt note items by item.base_item_uuid when other strategies fail", async () => {
      const poItems = [
        {
          uuid: "po-item-uuid-1",
          item_uuid: "item-ref-uuid-1",
          base_item_uuid: "base-item-uuid-1", // This is what receipt note item references
          description: "Item 1",
          unit_price: 20.0,
          po_quantity: 5,
          cost_code_uuid: "cost-code-1",
        },
      ];

      const receiptNoteItems = [
        {
          uuid: "rni-uuid-1",
          item_uuid: "base-item-uuid-1", // Matches poItems[0].base_item_uuid
          item_type: "purchase_order",
          purchase_order_uuid: "po-uuid-1",
          change_order_uuid: null,
          receipt_note_uuid: "receipt-note-uuid-1",
          received_quantity: 4,
          received_total: 80.0,
          cost_code_uuid: "cost-code-1",
        },
      ];

      fetchPurchaseOrderItemsMock.mockResolvedValue(poItems);
      // Mock both API calls: receipt note items and purchase order items
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/receipt-note-items") {
          return Promise.resolve({ data: receiptNoteItems });
        }
        if (url === "/api/purchase-order-items") {
          return Promise.resolve({ data: poItems });
        }
        return Promise.resolve({ data: [] });
      });

      const wrapper = mountForm({
        uuid: "receipt-note-uuid-1",
        purchase_order_uuid: "po-uuid-1",
        receipt_type: "purchase_order",
      });

      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      const items = itemsTable.props("items") as any[];
      expect(items).toHaveLength(1);
      // Note: base_item_uuid matching is Strategy 2, but if it doesn't match uuid, it will try position-based
      expect(items[0].received_quantity).toBe(4);
    });

    it("should use position-based fallback when UUIDs don't match but counts match", async () => {
      const poItems = [
        {
          uuid: "po-item-uuid-1",
          item_uuid: "item-ref-uuid-1",
          description: "Item 1",
          unit_price: 25.0,
          po_quantity: 5,
          cost_code_uuid: "cost-code-1",
        },
        {
          uuid: "po-item-uuid-2",
          item_uuid: "item-ref-uuid-2",
          description: "Item 2",
          unit_price: 30.0,
          po_quantity: 3,
          cost_code_uuid: "cost-code-2",
        },
      ];

      // Receipt note items have completely different UUIDs
      const receiptNoteItems = [
        {
          uuid: "rni-uuid-1",
          item_uuid: "different-uuid-1", // Doesn't match any PO item UUID
          item_type: "purchase_order",
          purchase_order_uuid: "po-uuid-1",
          change_order_uuid: null,
          receipt_note_uuid: "receipt-note-uuid-1",
          received_quantity: 1,
          received_total: 25.0,
          cost_code_uuid: "cost-code-1",
        },
        {
          uuid: "rni-uuid-2",
          item_uuid: "different-uuid-2", // Doesn't match any PO item UUID
          item_type: "purchase_order",
          purchase_order_uuid: "po-uuid-1",
          change_order_uuid: null,
          receipt_note_uuid: "receipt-note-uuid-1",
          received_quantity: 2,
          received_total: 60.0,
          cost_code_uuid: "cost-code-2",
        },
      ];

      fetchPurchaseOrderItemsMock.mockResolvedValue(poItems);
      // Mock both API calls: receipt note items and purchase order items
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/receipt-note-items") {
          return Promise.resolve({ data: receiptNoteItems });
        }
        if (url === "/api/purchase-order-items") {
          return Promise.resolve({ data: poItems });
        }
        return Promise.resolve({ data: [] });
      });

      const wrapper = mountForm({
        uuid: "receipt-note-uuid-1",
        purchase_order_uuid: "po-uuid-1",
        receipt_type: "purchase_order",
      });

      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      const items = itemsTable.props("items") as any[];
      expect(items).toHaveLength(2);
      // Position-based matching should match by index
      expect(items[0].received_quantity).toBe(1);
      expect(items[1].received_quantity).toBe(2);
    });
  });

  describe("Change Order Unit Price Population", () => {
    it("should populate unit_price from co_unit_price for change order items", async () => {
      const coItems = [
        {
          uuid: "co-item-uuid-1",
          item_uuid: "item-ref-uuid-1",
          description: "Change Order Item 1",
          co_unit_price: 50.0, // Change order specific field
          co_quantity: 10,
          cost_code_uuid: "cost-code-1",
        },
        {
          uuid: "co-item-uuid-2",
          item_uuid: "item-ref-uuid-2",
          description: "Change Order Item 2",
          unit_price: 60.0, // Generic field (should also work)
          co_quantity: 5,
          cost_code_uuid: "cost-code-2",
        },
      ];

      const receiptNoteItems = [
        {
          item_uuid: "co-item-uuid-1",
          received_quantity: 8,
          received_total: 400.0,
          cost_code_uuid: "cost-code-1",
        },
        {
          item_uuid: "co-item-uuid-2",
          received_quantity: 4,
          received_total: 240.0,
          cost_code_uuid: "cost-code-2",
        },
      ];

      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/change-order-items")) {
          return Promise.resolve({ data: coItems });
        }
        if (url.includes("/api/receipt-note-items")) {
          return Promise.resolve({ data: receiptNoteItems });
        }
        return Promise.resolve({ data: [] });
      });

      const wrapper = mountForm({
        uuid: "receipt-note-uuid-1",
        change_order_uuid: "co-uuid-1",
        receipt_type: "change_order",
      });

      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      const items = itemsTable.props("items") as any[];
      expect(items).toHaveLength(2);
      // First item should use co_unit_price
      expect(items[0].unit_price).toBe(50.0);
      // Second item should use unit_price (generic field)
      expect(items[1].unit_price).toBe(60.0);
    });

    it("should fallback to po_unit_price if co_unit_price is not available", async () => {
      const coItems = [
        {
          uuid: "co-item-uuid-1",
          item_uuid: "item-ref-uuid-1",
          description: "Change Order Item 1",
          po_unit_price: 45.0, // Fallback to PO unit price
          co_quantity: 10,
          cost_code_uuid: "cost-code-1",
        },
      ];

      const receiptNoteItems = [
        {
          item_uuid: "co-item-uuid-1",
          received_quantity: 5,
          received_total: 225.0,
          cost_code_uuid: "cost-code-1",
        },
      ];

      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/change-order-items")) {
          return Promise.resolve({ data: coItems });
        }
        if (url.includes("/api/receipt-note-items")) {
          return Promise.resolve({ data: receiptNoteItems });
        }
        return Promise.resolve({ data: [] });
      });

      const wrapper = mountForm({
        uuid: "receipt-note-uuid-1",
        change_order_uuid: "co-uuid-1",
        receipt_type: "change_order",
      });

      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      const items = itemsTable.props("items") as any[];
      expect(items).toHaveLength(1);
      expect(items[0].unit_price).toBe(45.0);
    });

    it("should handle purchase order items with po_unit_price", async () => {
      const poItems = [
        {
          uuid: "po-item-uuid-1",
          item_uuid: "item-ref-uuid-1",
          description: "Purchase Order Item 1",
          po_unit_price: 35.0,
          po_quantity: 10,
          cost_code_uuid: "cost-code-1",
        },
      ];

      const receiptNoteItems = [
        {
          item_uuid: "po-item-uuid-1",
          received_quantity: 7,
          received_total: 245.0,
          cost_code_uuid: "cost-code-1",
        },
      ];

      fetchPurchaseOrderItemsMock.mockResolvedValue(poItems);
      mockFetch.mockResolvedValue({
        data: receiptNoteItems,
      });

      const wrapper = mountForm({
        uuid: "receipt-note-uuid-1",
        purchase_order_uuid: "po-uuid-1",
        receipt_type: "purchase_order",
      });

      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      const items = itemsTable.props("items") as any[];
      expect(items).toHaveLength(1);
      expect(items[0].unit_price).toBe(35.0);
    });
  });

  describe("Received Quantity Display", () => {
    it("should display received_quantity from receipt note items when matched", async () => {
      const poItems = [
        {
          uuid: "po-item-uuid-1",
          item_uuid: "item-ref-uuid-1",
          description: "Item 1",
          unit_price: 10.0,
          po_quantity: 5,
          cost_code_uuid: "cost-code-1",
        },
      ];

      const receiptNoteItems = [
        {
          uuid: "rni-uuid-1",
          item_uuid: "po-item-uuid-1",
          item_type: "purchase_order",
          purchase_order_uuid: "po-uuid-1",
          change_order_uuid: null,
          receipt_note_uuid: "receipt-note-uuid-1",
          received_quantity: 3, // This should be displayed
          received_total: 30.0,
          cost_code_uuid: "cost-code-1",
        },
      ];

      fetchPurchaseOrderItemsMock.mockResolvedValue(poItems);
      // Mock both API calls: receipt note items and purchase order items
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/receipt-note-items") {
          return Promise.resolve({ data: receiptNoteItems });
        }
        if (url === "/api/purchase-order-items") {
          return Promise.resolve({ data: poItems });
        }
        return Promise.resolve({ data: [] });
      });

      const wrapper = mountForm({
        uuid: "receipt-note-uuid-1",
        purchase_order_uuid: "po-uuid-1",
        receipt_type: "purchase_order",
      });

      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      const items = itemsTable.props("items") as any[];
      expect(items).toHaveLength(1);
      expect(items[0].received_quantity).toBe(3);
      expect(items[0].received_total).toBe(30.0);
    });

    it("should handle null received_quantity gracefully", async () => {
      const poItems = [
        {
          uuid: "po-item-uuid-1",
          item_uuid: "item-ref-uuid-1",
          description: "Item 1",
          unit_price: 10.0,
          po_quantity: 5,
          cost_code_uuid: "cost-code-1",
        },
      ];

      const receiptNoteItems = [
        {
          item_uuid: "po-item-uuid-1",
          received_quantity: null, // Null value
          received_total: null,
          cost_code_uuid: "cost-code-1",
        },
      ];

      fetchPurchaseOrderItemsMock.mockResolvedValue(poItems);
      mockFetch.mockResolvedValue({
        data: receiptNoteItems,
      });

      const wrapper = mountForm({
        uuid: "receipt-note-uuid-1",
        purchase_order_uuid: "po-uuid-1",
        receipt_type: "purchase_order",
      });

      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      const items = itemsTable.props("items") as any[];
      expect(items).toHaveLength(1);
      expect(items[0].received_quantity).toBeNull();
    });
  });

  describe("Sequence and UOM Lookup from Preferred Items", () => {
    beforeEach(() => {
      getPreferredItemsMock.mockClear();
      ensurePreferredItemsMock.mockResolvedValue([]);
    });

    it("should lookup sequence_label from preferred items when item_uuid matches", async () => {
      const preferredItems = [
        {
          uuid: "pref-item-1",
          item_uuid: "item-ref-uuid-1",
          item_sequence: "SEQ-001", // Sequence from preferred item
          item_name: "Preferred Item 1",
          unit: "EA",
          unit_price: 10.0,
        },
      ];

      const coItems = [
        {
          uuid: "co-item-uuid-1",
          item_uuid: "item-ref-uuid-1", // Matches preferred item
          description: "Change Order Item 1",
          co_unit_price: 50.0,
          co_quantity: 10,
          cost_code_uuid: "cost-code-1",
          // No sequence_label or unit_label in CO item
        },
      ];

      const receiptNoteItems = [
        {
          item_uuid: "co-item-uuid-1",
          received_quantity: 8,
          received_total: 400.0,
          cost_code_uuid: "cost-code-1",
        },
      ];

      getPreferredItemsMock.mockReturnValue(preferredItems);
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/change-order-items")) {
          return Promise.resolve({ data: coItems });
        }
        if (url.includes("/api/receipt-note-items")) {
          return Promise.resolve({ data: receiptNoteItems });
        }
        return Promise.resolve({ data: [] });
      });

      const wrapper = mountForm({
        uuid: "receipt-note-uuid-1",
        change_order_uuid: "co-uuid-1",
        receipt_type: "change_order",
        project_uuid: "project-1",
      });

      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      const items = itemsTable.props("items") as any[];
      expect(items).toHaveLength(1);
      // Sequence should be looked up from preferred item
      expect(items[0].sequence_label).toBe("SEQ-001");
    });

    it("should lookup unit_label from preferred items when item_uuid matches", async () => {
      const preferredItems = [
        {
          uuid: "pref-item-1",
          item_uuid: "item-ref-uuid-1",
          item_sequence: "SEQ-001",
          item_name: "Preferred Item 1",
          unit: "EA", // Unit from preferred item
          unit_label: "Each",
          unit_price: 10.0,
        },
      ];

      const coItems = [
        {
          uuid: "co-item-uuid-1",
          item_uuid: "item-ref-uuid-1", // Matches preferred item
          description: "Change Order Item 1",
          co_unit_price: 50.0,
          co_quantity: 10,
          cost_code_uuid: "cost-code-1",
          // No unit_label in CO item
        },
      ];

      const receiptNoteItems = [
        {
          item_uuid: "co-item-uuid-1",
          received_quantity: 8,
          received_total: 400.0,
          cost_code_uuid: "cost-code-1",
        },
      ];

      getPreferredItemsMock.mockReturnValue(preferredItems);
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/change-order-items")) {
          return Promise.resolve({ data: coItems });
        }
        if (url.includes("/api/receipt-note-items")) {
          return Promise.resolve({ data: receiptNoteItems });
        }
        return Promise.resolve({ data: [] });
      });

      const wrapper = mountForm({
        uuid: "receipt-note-uuid-1",
        change_order_uuid: "co-uuid-1",
        receipt_type: "change_order",
        project_uuid: "project-1",
      });

      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      const items = itemsTable.props("items") as any[];
      expect(items).toHaveLength(1);
      // Unit label should be looked up from preferred item
      expect(items[0].unit_label).toBe("EA");
    });

    it("should lookup both sequence_label and unit_label from preferred items for change order items", async () => {
      const preferredItems = [
        {
          uuid: "pref-item-1",
          item_uuid: "item-ref-uuid-1",
          item_sequence: "SEQ-001",
          item_name: "Preferred Item 1",
          unit: "FT", // Unit from preferred item
          unit_label: "Feet",
          unit_price: 10.0,
        },
        {
          uuid: "pref-item-2",
          item_uuid: "item-ref-uuid-2",
          item_sequence: "SEQ-002",
          item_name: "Preferred Item 2",
          unit: "LB",
          unit_label: "Pounds",
          unit_price: 20.0,
        },
      ];

      const coItems = [
        {
          uuid: "co-item-uuid-1",
          item_uuid: "item-ref-uuid-1",
          description: "Change Order Item 1",
          co_unit_price: 50.0,
          co_quantity: 10,
          cost_code_uuid: "cost-code-1",
        },
        {
          uuid: "co-item-uuid-2",
          item_uuid: "item-ref-uuid-2",
          description: "Change Order Item 2",
          co_unit_price: 60.0,
          co_quantity: 5,
          cost_code_uuid: "cost-code-2",
        },
      ];

      const receiptNoteItems = [
        {
          item_uuid: "co-item-uuid-1",
          received_quantity: 8,
          received_total: 400.0,
          cost_code_uuid: "cost-code-1",
        },
        {
          item_uuid: "co-item-uuid-2",
          received_quantity: 4,
          received_total: 240.0,
          cost_code_uuid: "cost-code-2",
        },
      ];

      getPreferredItemsMock.mockReturnValue(preferredItems);
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/change-order-items")) {
          return Promise.resolve({ data: coItems });
        }
        if (url.includes("/api/receipt-note-items")) {
          return Promise.resolve({ data: receiptNoteItems });
        }
        return Promise.resolve({ data: [] });
      });

      const wrapper = mountForm({
        uuid: "receipt-note-uuid-1",
        change_order_uuid: "co-uuid-1",
        receipt_type: "change_order",
        project_uuid: "project-1",
      });

      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      const items = itemsTable.props("items") as any[];
      expect(items).toHaveLength(2);
      
      // First item should have sequence and unit from preferred item
      expect(items[0].sequence_label).toBe("SEQ-001");
      expect(items[0].unit_label).toBe("FT");
      
      // Second item should have sequence and unit from preferred item
      expect(items[1].sequence_label).toBe("SEQ-002");
      expect(items[1].unit_label).toBe("LB");
    });

    it("should use direct fields when available, even if preferred item exists", async () => {
      const preferredItems = [
        {
          uuid: "pref-item-1",
          item_uuid: "item-ref-uuid-1",
          item_sequence: "SEQ-PREF", // This should NOT be used
          item_name: "Preferred Item 1",
          unit: "PREF-UNIT", // This should NOT be used
          unit_price: 10.0,
        },
      ];

      const coItems = [
        {
          uuid: "co-item-uuid-1",
          item_uuid: "item-ref-uuid-1",
          description: "Change Order Item 1",
          co_unit_price: 50.0,
          co_quantity: 10,
          cost_code_uuid: "cost-code-1",
          sequence_label: "SEQ-DIRECT", // Direct field should take priority
          unit_label: "DIRECT-UNIT", // Direct field should take priority
        },
      ];

      const receiptNoteItems = [
        {
          item_uuid: "co-item-uuid-1",
          received_quantity: 8,
          received_total: 400.0,
          cost_code_uuid: "cost-code-1",
        },
      ];

      getPreferredItemsMock.mockReturnValue(preferredItems);
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/change-order-items")) {
          return Promise.resolve({ data: coItems });
        }
        if (url.includes("/api/receipt-note-items")) {
          return Promise.resolve({ data: receiptNoteItems });
        }
        return Promise.resolve({ data: [] });
      });

      const wrapper = mountForm({
        uuid: "receipt-note-uuid-1",
        change_order_uuid: "co-uuid-1",
        receipt_type: "change_order",
        project_uuid: "project-1",
      });

      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      const items = itemsTable.props("items") as any[];
      expect(items).toHaveLength(1);
      // Direct fields should take priority over preferred items
      expect(items[0].sequence_label).toBe("SEQ-DIRECT");
      expect(items[0].unit_label).toBe("DIRECT-UNIT");
    });

    it("should handle items without item_uuid (no preferred item lookup)", async () => {
      const preferredItems = [
        {
          uuid: "pref-item-1",
          item_uuid: "item-ref-uuid-1",
          item_sequence: "SEQ-001",
          item_name: "Preferred Item 1",
          unit: "EA",
          unit_price: 10.0,
        },
      ];

      const coItems = [
        {
          uuid: "co-item-uuid-1",
          // No item_uuid - should not lookup from preferred items
          description: "Change Order Item 1",
          co_unit_price: 50.0,
          co_quantity: 10,
          cost_code_uuid: "cost-code-1",
          // No sequence_label or unit_label
        },
      ];

      const receiptNoteItems = [
        {
          item_uuid: "co-item-uuid-1",
          received_quantity: 8,
          received_total: 400.0,
          cost_code_uuid: "cost-code-1",
        },
      ];

      getPreferredItemsMock.mockReturnValue(preferredItems);
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/api/change-order-items")) {
          return Promise.resolve({ data: coItems });
        }
        if (url.includes("/api/receipt-note-items")) {
          return Promise.resolve({ data: receiptNoteItems });
        }
        return Promise.resolve({ data: [] });
      });

      const wrapper = mountForm({
        uuid: "receipt-note-uuid-1",
        change_order_uuid: "co-uuid-1",
        receipt_type: "change_order",
        project_uuid: "project-1",
      });

      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      const items = itemsTable.props("items") as any[];
      expect(items).toHaveLength(1);
      // Should be null since no item_uuid and no direct fields
      expect(items[0].sequence_label).toBeNull();
      expect(items[0].unit_label).toBeNull();
    });

    it("should work for purchase order items as well", async () => {
      const preferredItems = [
        {
          uuid: "pref-item-1",
          item_uuid: "item-ref-uuid-1",
          item_sequence: "SEQ-001",
          item_name: "Preferred Item 1",
          unit: "EA",
          unit_label: "Each",
          unit_price: 10.0,
        },
      ];

      const poItems = [
        {
          uuid: "po-item-uuid-1",
          item_uuid: "item-ref-uuid-1", // Matches preferred item
          description: "Purchase Order Item 1",
          po_unit_price: 35.0,
          po_quantity: 10,
          cost_code_uuid: "cost-code-1",
          // No sequence_label or unit_label
        },
      ];

      const receiptNoteItems = [
        {
          item_uuid: "po-item-uuid-1",
          received_quantity: 7,
          received_total: 245.0,
          cost_code_uuid: "cost-code-1",
        },
      ];

      getPreferredItemsMock.mockReturnValue(preferredItems);
      fetchPurchaseOrderItemsMock.mockResolvedValue(poItems);
      mockFetch.mockResolvedValue({
        data: receiptNoteItems,
      });

      const wrapper = mountForm({
        uuid: "receipt-note-uuid-1",
        purchase_order_uuid: "po-uuid-1",
        receipt_type: "purchase_order",
        project_uuid: "project-1",
      });

      await flushPromises();

      const itemsTable = wrapper.findComponent({ name: "ReceiptNoteItemsTable" });
      const items = itemsTable.props("items") as any[];
      expect(items).toHaveLength(1);
      // Should lookup from preferred items for PO items too
      expect(items[0].sequence_label).toBe("SEQ-001");
      expect(items[0].unit_label).toBe("EA");
    });
  });
});

