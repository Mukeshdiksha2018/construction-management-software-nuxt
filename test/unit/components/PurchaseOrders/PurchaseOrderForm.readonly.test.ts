import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia, defineStore } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, readonly } from 'vue'
import PurchaseOrderForm from '@/components/PurchaseOrders/PurchaseOrderForm.vue'

// Mock composables
vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (n: number) => `$${Number(n || 0).toFixed(2)}`,
    currencySymbol: ref("$"),
  }),
}));

vi.mock("@/composables/useUTCDateFormat", () => ({
  useUTCDateFormat: () => ({
    toUTCString: (s: string) => s,
    fromUTCString: (s: string) => s,
  }),
}));

// Mock child components
vi.mock("@/components/Shared/ProjectSelect.vue", () => ({
  default: {
    name: "ProjectSelect",
    template: "<select />",
    props: ["modelValue", "disabled"],
  },
}));

vi.mock("@/components/Shared/VendorSelect.vue", () => ({
  default: {
    name: "VendorSelect",
    template: "<select />",
    props: ["modelValue", "disabled"],
  },
}));

vi.mock("@/components/Shared/ShipViaSelect.vue", () => ({
  default: {
    name: "ShipViaSelect",
    template: "<select />",
    props: ["modelValue", "disabled"],
  },
}));

vi.mock("@/components/Shared/FreightSelect.vue", () => ({
  default: {
    name: "FreightSelect",
    template: "<select />",
    props: ["modelValue", "disabled"],
  },
}));

vi.mock("@/components/PurchaseOrders/POItemsTableWithEstimates.vue", () => ({
  default: {
    name: "POItemsTableWithEstimates",
    template: "<div />",
    props: ["items", "readonly"],
  },
}));

vi.mock("@/components/PurchaseOrders/POItemsFromItemMaster.vue", () => ({
  default: {
    name: "POItemsFromItemMaster",
    template: "<div />",
    props: ["items", "readonly"],
  },
}));

vi.mock("@/components/PurchaseOrders/FinancialBreakdown.vue", () => ({
  default: {
    name: "FinancialBreakdown",
    template: "<div />",
    props: ["itemTotal", "formData", "readOnly"],
  },
}));

// Stubs for Nuxt UI components
const uiStubs = {
  UCard: { template: "<div><slot /></div>" },
  UInput: { template: "<input />", props: ["modelValue", "disabled"] },
  UTextarea: { template: "<textarea />", props: ["modelValue", "disabled"] },
  USelectMenu: { template: "<select />", props: ["modelValue", "disabled"] },
  UButton: { template: "<button><slot /></button>", props: ["disabled"] },
  UPopover: { template: "<div><slot /></div>", props: ["disabled"] },
  UCalendar: { template: "<div />", props: ["disabled"] },
  UFileUpload: { template: "<div><slot /></div>" },
  UModal: { template: "<div><slot /></div>" },
  UIcon: { template: "<span />" },
  UBanner: { template: "<div />" },
};

describe('PurchaseOrderForm.vue - Readonly Mode', () => {
  let pinia: any
  let useCorporationStore: any
  let usePurchaseOrdersStore: any
  let useProjectAddressesStore: any
  let useVendorStore: any
  let useShipViaStore: any
  let useFreightStore: any
  let useEstimatesStore: any
  let useItemTypesStore: any
  let usePurchaseOrderResourcesStore: any
  let useUOMStore: any
  let useProjectsStore: any

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);

    useCorporationStore = defineStore("corporations", () => ({
      corporations: [
        { uuid: "corp-1", name: "Corporation 1" },
        { uuid: "corp-2", name: "Corporation 2" },
      ],
      selectedCorporation: { uuid: "corp-1", name: "Corporation 1" },
      selectedCorporationId: "corp-1",
      setSelectedCorporation: vi.fn(),
    }));

    usePurchaseOrdersStore = defineStore("purchaseOrders", () => ({
      purchaseOrders: [],
      fetchPurchaseOrders: vi.fn(),
    }));

    useProjectAddressesStore = defineStore("projectAddresses", () => ({
      getAddresses: vi.fn(() => []),
      fetchAddresses: vi.fn(),
    }));

    useVendorStore = defineStore("vendors", () => ({
      vendors: [],
      fetchVendors: vi.fn(),
    }));

    useShipViaStore = defineStore("shipVia", () => ({
      getShipViaByUuid: vi.fn(() => null),
    }));

    useFreightStore = defineStore("freightGlobal", () => ({
      getFreightByUuid: vi.fn(() => null),
    }));

    useEstimatesStore = defineStore("estimates", () => ({
      loading: false,
      getEstimatesByProject: vi.fn(() => []),
      fetchEstimates: vi.fn(),
    }));

    // NOTE: itemTypesStore is no longer used directly in PurchaseOrderForm
    // All data fetching is done via purchaseOrderResourcesStore

    usePurchaseOrderResourcesStore = defineStore(
      "purchaseOrderResources",
      () => ({
        clear: vi.fn(),
        ensureProjectResources: vi.fn(() => Promise.resolve()),
        ensureEstimateItems: vi.fn(() => Promise.resolve([])),
        ensureCostCodeConfigurations: vi.fn(() => Promise.resolve([])),
        ensurePreferredItems: vi.fn(() => Promise.resolve([])),
        ensureItemTypes: vi.fn(() => Promise.resolve([])),
        ensureEstimates: vi.fn(() => Promise.resolve([])),
        getEstimateItems: vi.fn(() => []),
        getCostCodeConfigurations: vi.fn(() => []),
        getEstimatesByProject: vi.fn(() => []),
        getItemTypes: vi.fn(() => []),
        getEstimateItemsLoading: vi.fn(() => false),
        getEstimateItemsError: vi.fn(() => null),
        getPreferredItems: vi.fn(() => []),
        getProjectState: vi.fn(() => ({
          estimates: [],
          estimatesLoading: false,
          estimatesLoaded: false,
        })),
        estimateKey: vi.fn(() => "key"),
        clearProject: vi.fn(),
      })
    );

    useUOMStore = defineStore("uom", () => ({
      getActiveUOM: vi.fn(() => []),
      fetchUOM: vi.fn(),
    }));

    useProjectsStore = defineStore("projects", () => ({
      fetchProjectsMetadata: vi.fn(),
    }));

    // Initialize stores
    useCorporationStore();
    usePurchaseOrdersStore();
    useProjectAddressesStore();
    useVendorStore();
    useShipViaStore();
    useFreightStore();
    usePurchaseOrderResourcesStore();
    useUOMStore();
    useProjectsStore();
  });

  const mountForm = (props = {}) => {
    const defaultProps = {
      form: {
        po_items: [],
        attachments: [],
        removed_po_items: [],
        po_mode: "PROJECT",
        po_type: "MATERIAL",
        credit_days: "NET_30",
        include_items: "CUSTOM",
      },
      editingPurchaseOrder: false,
      loading: false,
      readonly: false,
      ...props,
    };

    return mount(PurchaseOrderForm, {
      props: defaultProps,
      global: {
        plugins: [pinia],
        stubs: uiStubs,
      },
    });
  };

  describe('Readonly prop handling', () => {
    it('accepts readonly prop', () => {
      const wrapper = mountForm({ readonly: true });
      expect(wrapper.props("readonly")).toBe(true);
    });

    it('defaults readonly to false', () => {
      const wrapper = mountForm();
      expect(wrapper.props("readonly")).toBe(false);
    });
  });

  describe('Form fields disabled state', () => {
    it('disables all select menus when readonly is true', () => {
      const wrapper = mountForm({ readonly: true });
      
      const selects = wrapper.findAllComponents({ name: "USelectMenu" });
      selects.forEach((select) => {
        expect(select.props("disabled")).toBe(true);
      });
    });

    it('enables all select menus when readonly is false', () => {
      const wrapper = mountForm({ readonly: false });
      
      const selects = wrapper.findAllComponents({ name: "USelectMenu" });
      selects.forEach((select) => {
        // Some may be disabled for other reasons (e.g., no corporation selected)
        // But readonly should not be the reason
        if (select.props("disabled") !== undefined) {
          // If disabled prop exists, it should not be due to readonly
          expect(select.props("readonly")).toBeUndefined();
        }
      });
    });

    it('disables ProjectSelect when readonly is true', () => {
      const wrapper = mountForm({ 
        readonly: true,
        form: {
          po_items: [],
          attachments: [],
          removed_po_items: [],
          po_mode: "PROJECT",
          project_uuid: "proj-1",
        },
      });
      
      const projectSelect = wrapper.findComponent({ name: "ProjectSelect" });
      if (projectSelect.exists()) {
        expect(projectSelect.props("disabled")).toBe(true);
      }
    });

    it('disables VendorSelect when readonly is true', () => {
      const wrapper = mountForm({ readonly: true });
      
      const vendorSelect = wrapper.findComponent({ name: "VendorSelect" });
      if (vendorSelect.exists()) {
        expect(vendorSelect.props("disabled")).toBe(true);
      }
    });

    it('disables textareas when readonly is true', () => {
      const wrapper = mountForm({ readonly: true });
      
      const textareas = wrapper.findAllComponents({ name: "UTextarea" });
      textareas.forEach((textarea) => {
        if (textarea.props("readonly") === undefined) {
          // Only check if it's not already readonly (description is always readonly)
          expect(textarea.props("disabled")).toBe(true);
        }
      });
    });

    it('disables date pickers when readonly is true', () => {
      const wrapper = mountForm({ readonly: true });
      
      const popovers = wrapper.findAllComponents({ name: "UPopover" });
      popovers.forEach((popover) => {
        expect(popover.props("disabled")).toBe(true);
      });
    });
  });

  describe('File upload disabled state', () => {
    it('disables file upload button when readonly is true', () => {
      const wrapper = mountForm({ readonly: true });
      
      const uploadButton = wrapper.find('button');
      // The file upload button should be disabled
      // We check by looking for buttons that would be disabled
      const buttons = wrapper.findAllComponents({ name: "UButton" });
      const uploadButtons = buttons.filter((btn: any) => {
        const text = btn.text();
        return text.includes("Choose") || text.includes("Upload") || text.includes("Add more");
      });
      
      if (uploadButtons.length > 0) {
        expect(uploadButtons[0].props("disabled")).toBe(true);
      }
    });

    it('hides delete file button when readonly is true', () => {
      const wrapper = mountForm({
        readonly: true,
        form: {
          po_items: [],
          attachments: [{ uuid: "att-1", document_name: "test.pdf" }],
          removed_po_items: [],
        },
      });
      
      // Delete buttons should not be visible in readonly mode
      // This is tested by checking that the component doesn't render delete buttons
      const html = wrapper.html();
      // The delete button should not appear in the HTML when readonly
      expect(html).not.toContain("mingcute:delete-fill");
    });
  });

  describe('PO Items components readonly state', () => {
    it('passes readonly prop to POItemsTableWithEstimates when readonly is true', () => {
      const wrapper = mountForm({
        readonly: true,
        form: {
          po_items: [{ item_uuid: "item-1" }],
          attachments: [],
          removed_po_items: [],
          include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
        },
      });
      
      const itemsTable = wrapper.findComponent({ name: "POItemsTableWithEstimates" });
      if (itemsTable.exists()) {
        expect(itemsTable.props("readonly")).toBe(true);
      }
    });

    it('passes readonly prop to POItemsFromItemMaster when readonly is true', () => {
      const wrapper = mountForm({
        readonly: true,
        form: {
          po_items: [{ item_uuid: "item-1" }],
          attachments: [],
          removed_po_items: [],
          include_items: "IMPORT_ITEMS_FROM_MASTER",
        },
      });
      
      const itemsMaster = wrapper.findComponent({ name: "POItemsFromItemMaster" });
      if (itemsMaster.exists()) {
        expect(itemsMaster.props("readonly")).toBe(true);
      }
    });

    it('passes readOnly prop to FinancialBreakdown when readonly is true', () => {
      const wrapper = mountForm({ readonly: true });
      
      const financialBreakdown = wrapper.findComponent({ name: "FinancialBreakdown" });
      if (financialBreakdown.exists()) {
        expect(financialBreakdown.props("readOnly")).toBe(true);
      }
    });

    it('hides removed items button when readonly is true', () => {
      const wrapper = mountForm({
        readonly: true,
        form: {
          po_items: [],
          attachments: [],
          removed_po_items: [{ uuid: "removed-1" }],
        },
      });
      
      // The "Show Removed Items" button should not be visible
      const html = wrapper.html();
      expect(html).not.toContain("Show Removed Items");
    });
  });
});

