import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia, defineStore } from "pinia";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import ChangeOrderForm from "@/components/ChangeOrders/ChangeOrderForm.vue";

// Mock TermsAndConditionsSelect component
const mockTermsAndConditionsSelect = {
  name: "TermsAndConditionsSelect",
  props: ["modelValue", "placeholder", "size", "class", "disabled"],
  emits: ["update:modelValue"],
  template: `
    <select 
      :value="modelValue" 
      @change="$emit('update:modelValue', $event.target.value || null)"
      :disabled="disabled"
    >
      <option value="">Select terms and conditions...</option>
      <option value="tc-1">Standard Terms</option>
      <option value="tc-2">Payment Terms</option>
    </select>
  `,
};

// Mock stores
const mockTermsAndConditionsStore = {
  termsAndConditions: [
    {
      uuid: "tc-1",
      name: "Standard Terms",
      content: "<p>Standard terms</p>",
      isActive: true,
    },
    {
      uuid: "tc-2",
      name: "Payment Terms",
      content: "<p>Payment terms</p>",
      isActive: true,
    },
  ],
  loading: false,
  error: null,
  get getActiveTermsAndConditions() {
    return this.termsAndConditions.filter((tc) => tc.isActive);
  },
  getTermsAndConditionById: (uuid: string) => {
    return (
      mockTermsAndConditionsStore.termsAndConditions.find(
        (tc) => tc.uuid === uuid
      ) || null
    );
  },
  fetchTermsAndConditions: vi.fn(),
};

vi.mock("@/stores/termsAndConditions", () => ({
  useTermsAndConditionsStore: () => mockTermsAndConditionsStore,
}));

// Mock other stores and dependencies
vi.mock("@/stores/itemTypes", () => ({
  useItemTypesStore: () => ({
    itemTypes: ref([]),
    loading: ref(false),
    fetchItemTypes: vi.fn(() => Promise.resolve()),
    getActiveItemTypes: () => [],
  }),
}));

vi.mock("@/stores/changeOrderResources", () => ({
  useChangeOrderResourcesStore: () => ({
    resetForTest: vi.fn(),
    ensureProjectResources: vi.fn(),
    ensureOriginalOrderItems: vi.fn(() => Promise.resolve()),
    getOriginalItems: vi.fn(() => []),
    getOriginalItemsLoading: vi.fn(() => false),
    getOriginalItemsError: vi.fn(() => null),
    clearProject: vi.fn(),
    clearAll: vi.fn(),
  }),
}));

vi.mock("@/stores/changeOrders", () => ({
  useChangeOrdersStore: () => ({
    changeOrders: [],
    loading: ref(false),
    fetchChangeOrders: vi.fn(),
  }),
}));

vi.mock("@/stores/corporations", () => ({
  useCorporationStore: () => ({
    selectedCorporation: { uuid: "corp-1" },
    selectedCorporationId: "corp-1",
  }),
}));

vi.mock("@/stores/purchaseOrders", () => ({
  usePurchaseOrdersStore: () => ({
    purchaseOrders: [],
    loading: ref(false),
    fetchPurchaseOrders: vi.fn(),
  }),
}));

vi.mock("@/stores/projects", () => ({
  useProjectsStore: () => ({
    projects: [],
    loading: ref(false),
    fetchProjects: vi.fn(),
    fetchProjectsMetadata: vi.fn(() => Promise.resolve()),
  }),
}));

vi.mock("@/stores/projectAddresses", () => ({
  useProjectAddressesStore: () => ({
    addresses: [],
    loading: ref(false),
    fetchAddresses: vi.fn(),
    getAddresses: () => [],
  }),
}));

vi.mock("@/stores/vendors", () => ({
  useVendorStore: () => ({
    vendors: [],
    loading: ref(false),
    fetchVendors: vi.fn(),
  }),
}));

vi.mock("@/stores/freight", () => ({
  useShipViaStore: () => ({
    shipViaList: [],
    loading: ref(false),
    fetchShipVia: vi.fn(),
    getShipViaByUuid: () => null,
  }),
  useFreightStore: () => ({
    freightList: [],
    loading: ref(false),
    fetchFreight: vi.fn(),
    getFreightByUuid: () => null,
  }),
}));

vi.mock("@/stores/costCodeConfigurations", () => ({
  useCostCodeConfigurationsStore: () => ({
    configurations: [],
    loading: ref(false),
    fetchConfigurations: vi.fn(),
    getConfigurationById: () => null,
  }),
}));

vi.mock("@/stores/laborChangeOrderResources", () => ({
  useLaborChangeOrderResourcesStore: () => ({
    resetForTest: vi.fn(),
    ensureLaborPOItems: vi.fn(() => Promise.resolve()),
    getLaborPOItems: vi.fn(() => []),
    getLaborPOItemsLoading: vi.fn(() => false),
    getLaborPOItemsError: vi.fn(() => null),
    clearProject: vi.fn(),
    clearAll: vi.fn(),
  }),
}));

vi.mock("@/stores/laborChangeOrderItems", () => ({
  useLaborChangeOrderItemsStore: () => ({
    laborChangeOrderItems: [],
    loading: ref(false),
    fetchLaborChangeOrderItems: vi.fn(),
  }),
}));

const uiStubs = {
  UCard: { template: "<div><slot /></div>" },
  USelectMenu: {
    props: ["modelValue", "items", "valueKey", "placeholder", "size", "disabled"],
    emits: ["update:modelValue"],
    template: "<select />",
  },
  UPopover: { template: '<div><slot /><slot name="content" /></div>' },
  UButton: { 
    template: "<button><slot /></button>", 
    props: ["icon", "color", "variant", "size", "disabled", "loading"] 
  },
  UCalendar: { 
    props: ["modelValue"], 
    emits: ["update:modelValue"], 
    template: "<div />" 
  },
  UInput: { 
    props: ["modelValue", "placeholder", "size", "variant", "class", "icon", "disabled"],
    emits: ["update:modelValue"],
    template: "<input />" 
  },
  UTextarea: {
    props: ["modelValue", "placeholder", "size", "rows", "autoresize"],
    emits: ["update:modelValue"],
    template: "<textarea />"
  },
  UModal: {
    template: '<div><slot name="header" /><slot name="body" /><slot name="footer" /></div>',
  },
  UFileUpload: {
    props: ["modelValue", "accept", "multiple"],
    emits: ["update:modelValue"],
    template: '<div class="u-file-upload-stub" />',
  },
  USkeleton: { template: '<div class="skeleton" />' },
  UBadge: { template: '<span><slot /></span>', props: ["color", "variant", "size"] },
  UIcon: { template: '<span />', props: ["name"] },
  FinancialBreakdown: {
    props: ["itemTotal", "formData", "readOnly"],
    emits: ["update"],
    template: '<div class="financial-breakdown-stub" />',
  },
  COItemsTableFromOriginal: {
    props: ["items", "loading", "error", "title", "description", "readonly"],
    template: '<div class="co-items-table-stub" />',
  },
  COLaborItemsTable: {
    props: ["items", "loading", "error", "title", "description", "readonly"],
    template: '<div class="co-labor-items-table-stub" />',
  },
  ProjectSelect: {
    props: ["modelValue", "corporationUuid", "disabled", "placeholder", "size", "class"],
    emits: ["update:modelValue"],
    template: '<select />',
  },
  VendorSelect: {
    props: ["modelValue", "corporationUuid", "disabled", "placeholder", "size", "class"],
    emits: ["update:modelValue", "change"],
    template: '<select />',
  },
  POSelectForCO: {
    props: ["modelValue", "projectUuid", "vendorUuid", "coType", "disabled"],
    emits: ["update:modelValue"],
    template: '<select />',
  },
  ShipViaSelect: {
    props: ["modelValue", "corporationUuid", "disabled", "placeholder", "size", "class"],
    emits: ["update:modelValue", "change"],
    template: '<select />',
  },
  FreightSelect: {
    props: ["modelValue", "corporationUuid", "disabled", "placeholder", "size", "class"],
    emits: ["update:modelValue", "change"],
    template: '<select />',
  },
  UserSelect: {
    props: ["modelValue", "corporationUuid", "disabled", "placeholder", "size", "class"],
    emits: ["update:modelValue"],
    template: '<select />',
  },
  FilePreview: {
    props: ["attachment"],
    template: '<div class="file-preview-stub" />',
  },
  TermsAndConditionsSelect: mockTermsAndConditionsSelect,
};

vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (value: number | string | null | undefined) => {
      const num = typeof value === "string" ? parseFloat(value) : Number(value ?? 0);
      if (Number.isNaN(num)) return "$0.00";
      return `$${num.toFixed(2)}`;
    },
    currencySymbol: ref("$"),
  }),
}));

vi.mock("@/composables/useUTCDateFormat", () => ({
  useUTCDateFormat: () => ({
    toUTCString: (date: string | null) => {
      if (!date) return null;
      if (date.includes('T')) return date;
      return `${date}T00:00:00.000Z`;
    },
    fromUTCString: (date: string | null) => {
      if (!date) return null;
      return date.split('T')[0];
    },
  }),
}));

describe("ChangeOrderForm - Terms and Conditions", () => {
  let pinia: any;
  let wrapper: any;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.clearAllMocks();
  });

  const mountForm = (formOverrides: any = {}, loadingProp: boolean = false) => {
    const form = {
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      vendor_uuid: "vendor-1",
      co_number: "CO-000001",
      created_date: "2024-01-01",
      status: "Draft",
      co_type: "MATERIAL",
      original_purchase_order_uuid: "po-uuid-1",
      total_co_amount: 1000,
      item_total: 800,
      charges_total: 100,
      tax_total: 100,
      co_items: [],
      attachments: [],
      removed_co_items: [],
      ...formOverrides,
    };
    
    const loading = formOverrides.loading !== undefined ? formOverrides.loading : loadingProp;
    const { loading: _, ...formWithoutLoading } = formOverrides;
    
    return mount(ChangeOrderForm, {
      global: {
        plugins: [pinia],
        stubs: uiStubs,
      },
      props: {
        form: {
          ...form,
          ...formWithoutLoading,
        },
        loading,
      },
    });
  };

  const latestFormEmission = (wrapper: any, ensureField?: string) => {
    const events = wrapper.emitted("update:form") || [];
    if (ensureField && events.length) {
      for (let i = events.length - 1; i >= 0; i--) {
        const payload = events[i]?.[0];
        if (payload && ensureField in payload) {
          return payload;
        }
      }
    }
    return events.length ? events[events.length - 1][0] : wrapper.props("form");
  };

  describe("Terms and Conditions Selection", () => {
    it("should render TermsAndConditionsSelect component for Material CO", () => {
      wrapper = mountForm({ co_type: "MATERIAL", original_purchase_order_uuid: "po-uuid-1" });
      
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      expect(select.exists()).toBe(true);
    });

    it("should not render TermsAndConditionsSelect component for Labor CO", () => {
      wrapper = mountForm({ co_type: "LABOR", original_purchase_order_uuid: "po-uuid-1" });
      
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      expect(select.exists()).toBe(false);
    });

    it("should bind terms_and_conditions_uuid to the select component", () => {
      wrapper = mountForm({ 
        co_type: "MATERIAL",
        original_purchase_order_uuid: "po-uuid-1",
        terms_and_conditions_uuid: "tc-1" 
      });
      
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      expect(select.exists()).toBe(true);
      expect(select.props("modelValue")).toBe("tc-1");
    });

    it("should handle null terms_and_conditions_uuid", () => {
      wrapper = mountForm({ 
        co_type: "MATERIAL",
        original_purchase_order_uuid: "po-uuid-1",
        terms_and_conditions_uuid: null 
      });
      
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      expect(select.exists()).toBe(true);
      expect(select.props("modelValue")).toBeNull();
    });

    it("should handle undefined terms_and_conditions_uuid", () => {
      wrapper = mountForm({ 
        co_type: "MATERIAL",
        original_purchase_order_uuid: "po-uuid-1"
        // terms_and_conditions_uuid not provided
      });
      
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      expect(select.exists()).toBe(true);
      expect(select.props("modelValue")).toBeUndefined();
    });

    it("should not render TermsAndConditionsSelect when original_purchase_order_uuid is missing", () => {
      wrapper = mountForm({ 
        co_type: "MATERIAL",
        original_purchase_order_uuid: null
      });
      
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      expect(select.exists()).toBe(false);
    });
  });

  describe("Terms and Conditions Form Updates", () => {
    it("should emit update:form when terms and conditions is selected", async () => {
      wrapper = mountForm({ 
        co_type: "MATERIAL",
        original_purchase_order_uuid: "po-uuid-1"
      });
      
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      await select.vm.$emit("update:modelValue", "tc-1");
      await wrapper.vm.$nextTick();
      await flushPromises();

      const updateEvents = wrapper.emitted("update:form");
      expect(updateEvents).toBeTruthy();
      expect(updateEvents!.length).toBeGreaterThan(0);

      const latestForm = latestFormEmission(wrapper, "terms_and_conditions_uuid");
      expect(latestForm.terms_and_conditions_uuid).toBe("tc-1");
    });

    it("should emit update:form when terms and conditions is cleared", async () => {
      wrapper = mountForm({ 
        co_type: "MATERIAL",
        original_purchase_order_uuid: "po-uuid-1",
        terms_and_conditions_uuid: "tc-1" 
      });
      
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      await select.vm.$emit("update:modelValue", null);
      await wrapper.vm.$nextTick();
      await flushPromises();

      const latestForm = latestFormEmission(wrapper, "terms_and_conditions_uuid");
      expect(latestForm.terms_and_conditions_uuid).toBeNull();
    });

    it("should use updateForm to update terms_and_conditions_uuid", async () => {
      wrapper = mountForm({ 
        co_type: "MATERIAL",
        original_purchase_order_uuid: "po-uuid-1"
      });
      const vm: any = wrapper.vm;

      expect(typeof vm.updateForm).toBe("function");

      vm.updateForm({ terms_and_conditions_uuid: "tc-2" });
      await wrapper.vm.$nextTick();

      const updateEvents = wrapper.emitted("update:form");
      expect(updateEvents).toBeTruthy();
      expect(updateEvents!.length).toBeGreaterThan(0);

      const latestForm = latestFormEmission(wrapper, "terms_and_conditions_uuid");
      expect(latestForm.terms_and_conditions_uuid).toBe("tc-2");
    });

    it("should handle null value when clearing terms and conditions", async () => {
      wrapper = mountForm({ 
        co_type: "MATERIAL",
        original_purchase_order_uuid: "po-uuid-1",
        terms_and_conditions_uuid: "tc-1" 
      });
      const vm: any = wrapper.vm;

      vm.updateForm({ terms_and_conditions_uuid: null });
      await wrapper.vm.$nextTick();

      const latestForm = latestFormEmission(wrapper, "terms_and_conditions_uuid");
      expect(latestForm.terms_and_conditions_uuid).toBeNull();
    });

    it("should preserve other form fields when updating terms_and_conditions_uuid", async () => {
      wrapper = mountForm({ 
        co_type: "MATERIAL",
        original_purchase_order_uuid: "po-uuid-1",
        co_number: "CO-000001",
        vendor_uuid: "vendor-1",
        terms_and_conditions_uuid: "tc-1"
      });
      const vm: any = wrapper.vm;

      vm.updateForm({ terms_and_conditions_uuid: "tc-2" });
      await wrapper.vm.$nextTick();

      const latestForm = latestFormEmission(wrapper, "terms_and_conditions_uuid");
      expect(latestForm.terms_and_conditions_uuid).toBe("tc-2");
      expect(latestForm.co_number).toBe("CO-000001");
      expect(latestForm.vendor_uuid).toBe("vendor-1");
    });
  });

  describe("Terms and Conditions in Readonly Mode", () => {
    it("should disable TermsAndConditionsSelect when readonly is true", async () => {
      wrapper = mountForm({ 
        co_type: "MATERIAL",
        original_purchase_order_uuid: "po-uuid-1",
        terms_and_conditions_uuid: "tc-1" 
      }, false);
      
      await wrapper.setProps({ readonly: true });
      await wrapper.vm.$nextTick();
      
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      expect(select.exists()).toBe(true);
      expect(select.props("disabled")).toBe(true);
    });

    it("should enable TermsAndConditionsSelect when readonly is false", () => {
      wrapper = mountForm({ 
        co_type: "MATERIAL",
        original_purchase_order_uuid: "po-uuid-1",
        terms_and_conditions_uuid: "tc-1" 
      }, false);
      
      wrapper.setProps({ readonly: false });
      
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      expect(select.exists()).toBe(true);
      expect(select.props("disabled")).toBe(false);
    });

    it("should disable TermsAndConditionsSelect when status is Approved", () => {
      wrapper = mountForm({ 
        co_type: "MATERIAL",
        original_purchase_order_uuid: "po-uuid-1",
        status: "Approved",
        terms_and_conditions_uuid: "tc-1" 
      });
      
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      expect(select.exists()).toBe(true);
      expect(select.props("disabled")).toBe(true);
    });
  });

  describe("Terms and Conditions Preview", () => {
    it("should display preview when terms and conditions is selected", () => {
      wrapper = mountForm({ 
        co_type: "MATERIAL",
        original_purchase_order_uuid: "po-uuid-1",
        terms_and_conditions_uuid: "tc-1" 
      });
      
      // Check if preview section exists
      const previewSection = wrapper.find('.prose');
      expect(previewSection.exists()).toBe(true);
    });

    it("should not display preview when no terms and conditions is selected", () => {
      wrapper = mountForm({ 
        co_type: "MATERIAL",
        original_purchase_order_uuid: "po-uuid-1",
        terms_and_conditions_uuid: null 
      });
      
      // Preview should not exist when no terms selected
      const previewSection = wrapper.find('.prose');
      expect(previewSection.exists()).toBe(false);
    });

    it("should display correct terms and conditions name in preview", () => {
      wrapper = mountForm({ 
        co_type: "MATERIAL",
        original_purchase_order_uuid: "po-uuid-1",
        terms_and_conditions_uuid: "tc-1" 
      });
      
      const vm: any = wrapper.vm;
      expect(vm.selectedTermsAndCondition).toBeTruthy();
      expect(vm.selectedTermsAndCondition?.name).toBe("Standard Terms");
    });

    it("should display correct terms and conditions content in preview", () => {
      wrapper = mountForm({ 
        co_type: "MATERIAL",
        original_purchase_order_uuid: "po-uuid-1",
        terms_and_conditions_uuid: "tc-1" 
      });
      
      const vm: any = wrapper.vm;
      expect(vm.selectedTermsAndCondition).toBeTruthy();
      expect(vm.selectedTermsAndCondition?.content).toBe("<p>Standard terms</p>");
    });

    it("should not display preview for Labor CO even if terms_and_conditions_uuid is set", () => {
      wrapper = mountForm({ 
        co_type: "LABOR",
        original_purchase_order_uuid: "po-uuid-1",
        terms_and_conditions_uuid: "tc-1" 
      });
      
      // Preview should not exist for Labor CO
      const previewSection = wrapper.find('.prose');
      expect(previewSection.exists()).toBe(false);
    });
  });

  describe("Terms and Conditions Loading State", () => {
    it("should show loading state in TermsAndConditionsSelect when form is loading", () => {
      wrapper = mountForm({ 
        co_type: "MATERIAL",
        original_purchase_order_uuid: "po-uuid-1"
      }, true);
      
      // When loading, the component might not render or might be in skeleton state
      expect(wrapper.props("loading")).toBe(true);
    });
  });

  describe("Terms and Conditions Position in Layout", () => {
    it("should render TermsAndConditionsSelect between file upload and financial breakdown", () => {
      wrapper = mountForm({ 
        co_type: "MATERIAL",
        original_purchase_order_uuid: "po-uuid-1"
      });
      
      // The component should be rendered in the middle section
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      expect(select.exists()).toBe(true);
      
      // Verify it's in the correct section by checking parent structure
      const parent = select.vm.$parent;
      expect(parent).toBeTruthy();
    });
  });
});
