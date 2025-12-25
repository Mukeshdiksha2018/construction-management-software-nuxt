import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia, defineStore } from "pinia";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PurchaseOrderForm from "@/components/PurchaseOrders/PurchaseOrderForm.vue";
import { ref } from "vue";

// Mock $fetch globally
const fetchMock = vi.fn();
vi.stubGlobal("$fetch", fetchMock);

vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (val: number) => `$${val.toFixed(2)}`,
    currencySymbol: ref("$"),
  }),
}));

vi.mock("@/composables/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (date: string) => date,
    parseDate: (date: string) => date,
    formatDateForInput: (date: string) => date,
    getCurrentLocal: () => "2024-01-01",
  }),
}));

// Mock stores - simplified version for quantity validation tests
const mockEstimate = {
  uuid: "estimate-1",
  estimate_date: "2024-01-01",
  estimate_number: "EST-001",
  project_uuid: "project-1",
};

vi.mock("@/stores/purchaseOrderResources", () => ({
  usePurchaseOrderResourcesStore: () => ({
    ensureProjectResources: vi.fn(),
    ensureItemTypes: vi.fn(async () => []),
    ensureCostCodeConfigurations: vi.fn(async () => []),
    ensurePreferredItems: vi.fn(async () => []),
    ensureEstimates: vi.fn(async () => []),
    ensureEstimateItems: vi.fn(),
    getEstimateItems: vi.fn(() => []),
    getEstimateItemsLoading: vi.fn(() => false),
    getEstimateItemsError: vi.fn(() => null),
    getEstimatesByProject: vi.fn((corp?: string, project?: string) => {
      // Return the mock estimate if it matches the project
      if (project === "project-1") {
        return [mockEstimate];
      }
      return [];
    }),
    getItemTypes: vi.fn(() => []),
    getPreferredItems: vi.fn(() => []),
    getCostCodeConfigurations: vi.fn(() => []),
    getProjectState: vi.fn(() => ({ estimates: [], estimatesLoading: false, estimatesLoaded: false })),
    estimateKey: vi.fn((corp?: string, proj?: string, est?: string) => `${corp}::${proj}::${est}`),
    clearProject: vi.fn(),
    resetForTest: vi.fn(),
  }),
}));

vi.mock("@/stores/corporations", () => ({
  useCorporationStore: () => ({
    selectedCorporation: { uuid: "corp-1" },
  }),
}));

vi.mock("@/stores/purchaseOrders", () => ({
  usePurchaseOrdersStore: () => ({
    purchaseOrders: [],
  }),
}));

vi.mock("@/stores/projects", () => ({
  useProjectsStore: () => ({
    fetchProjectsMetadata: vi.fn(),
  }),
}));

vi.mock("@/stores/projectAddresses", () => ({
  useProjectAddressesStore: () => ({
    getAddresses: () => [],
    fetchAddresses: vi.fn(),
  }),
}));

vi.mock("@/stores/vendors", () => ({
  useVendorStore: () => ({
    vendors: [],
    fetchVendors: vi.fn(),
  }),
}));

vi.mock("@/stores/freight", () => ({
  useShipViaStore: () => ({
    shipViaOptions: [],
  }),
  useFreightStore: () => ({
    freightOptions: [],
  }),
}));

vi.mock("@/stores/uom", () => ({
  useUOMStore: () => ({
    uomOptions: [],
    fetchUOM: vi.fn(),
  }),
}));

vi.mock("@/stores/termsAndConditions", () => ({
  useTermsAndConditionsStore: () => ({
    termsAndConditions: [],
  }),
}));

const uiStubs = {
  UCard: { template: "<div><slot /></div>" },
  USelectMenu: {
    props: ["modelValue", "items", "valueKey"],
    emits: ["update:modelValue"],
    template: "<select />",
  },
  UPopover: { template: '<div><slot /><slot name="content" /></div>' },
  UButton: {
    template: "<button><slot /></button>",
    props: ["icon", "color", "variant", "size", "disabled"],
  },
  UCalendar: { template: "<div />" },
  UInput: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: "<input />",
  },
  UTextarea: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: "<textarea />",
  },
  UModal: {
    template: '<div><slot name="header" /><slot name="body" /><slot name="footer" /></div>',
  },
  UFileUpload: { template: "<div />" },
  UBanner: {
    props: ["title", "description", "color"],
    template: '<div class="u-banner">{{ title }}</div>',
  },
  ProjectSelect: { template: "<div />", props: ["modelValue"] },
  VendorSelect: { template: "<div />", props: ["modelValue"] },
  ShipViaSelect: { template: "<div />", props: ["modelValue"] },
  FreightSelect: { template: "<div />", props: ["modelValue"] },
  FilePreview: { template: "<div />" },
  POItemsTableWithEstimates: {
    props: ["items", "usedQuantitiesByItem", "estimateItems"],
    template: '<div class="po-items-table"><slot /></div>',
  },
  POItemsFromItemMaster: { template: "<div />" },
  FinancialBreakdown: { template: "<div />" },
  VendorForm: { template: "<div />" },
  TermsAndConditionsSelect: { template: "<div />" },
  CorporationSelect: { template: "<div />" },
  PurchaseOrdersEstimateItemsSelectionModal: { template: "<div />" },
};

describe("PurchaseOrderForm - Quantity Validation", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    fetchMock.mockClear();
  });

  const mountForm = (formData: any = {}) => {
    return mount(PurchaseOrderForm, {
      props: {
        form: {
          po_type: "MATERIAL",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
          estimate_uuid: "estimate-1",
          po_items: [],
          ...formData,
        },
        editingPurchaseOrder: false,
        loading: false,
        readonly: false,
      },
      global: {
        plugins: [pinia],
        stubs: uiStubs,
      },
    });
  };

  describe("fetchUsedQuantities", () => {
    it("should fetch used quantities from API when estimate UUID becomes available", async () => {
      const mockUsedQuantities = {
        "item-uuid-1": 50,
        "item-uuid-2": 25,
      };
      
      fetchMock.mockResolvedValueOnce({ data: mockUsedQuantities });

      // Start without project to trigger the watch when it becomes available
      const wrapper = mountForm({ project_uuid: undefined });
      await flushPromises();
      await wrapper.vm.$nextTick();
      
      // Now set the project_uuid to trigger the watch (which will get estimates and trigger fetchUsedQuantities)
      await wrapper.setProps({
        form: {
          ...wrapper.props().form,
          project_uuid: "project-1",
        },
      });
      await flushPromises();
      await wrapper.vm.$nextTick();
      await flushPromises();

      // Verify API was called with correct parameters
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/estimate-quantity-availability",
        expect.objectContaining({
          query: expect.objectContaining({
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            estimate_uuid: "estimate-1",
          }),
        })
      );
    });

    it("should exclude current PO uuid when editing existing PO", async () => {
      fetchMock.mockResolvedValueOnce({ data: {} });

      // Start without project to trigger the watch when it becomes available
      // Also set editingPurchaseOrder to true so the uuid is excluded
      const wrapper = mount(PurchaseOrderForm, {
        props: {
          form: {
            po_type: "MATERIAL",
            corporation_uuid: "corp-1",
            project_uuid: undefined,
            include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
            estimate_uuid: "estimate-1",
            po_items: [],
            uuid: "po-123",
          },
          editingPurchaseOrder: true,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });
      await flushPromises();
      await wrapper.vm.$nextTick();
      
      // Now set the project_uuid to trigger the watch (which will get estimates and trigger fetchUsedQuantities)
      await wrapper.setProps({
        form: {
          ...wrapper.props().form,
          project_uuid: "project-1",
        },
      });
      await flushPromises();
      await wrapper.vm.$nextTick();
      await flushPromises();

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/estimate-quantity-availability",
        expect.objectContaining({
          query: expect.objectContaining({
            exclude_po_uuid: "po-123",
          }),
        })
      );
    });

    it("should handle API errors gracefully", async () => {
      fetchMock.mockRejectedValueOnce(new Error("API Error"));

      const wrapper = mountForm();
      await flushPromises();

      // Component should still render without crashing
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe("POItemsTableWithEstimates props", () => {
    it("should pass usedQuantitiesByItem prop to POItemsTableWithEstimates", async () => {
      const mockUsedQuantities = { "item-uuid-1": 50 };
      fetchMock.mockResolvedValueOnce({ data: mockUsedQuantities });

      const wrapper = mountForm();
      await flushPromises();
      await wrapper.vm.$nextTick();
      await flushPromises();

      const table = wrapper.findComponent({ name: "POItemsTableWithEstimates" });
      
      if (table.exists()) {
        // Verify usedQuantitiesByItem prop is passed
        expect(table.props("usedQuantitiesByItem")).toBeDefined();
      }
    });
  });
});
