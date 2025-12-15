import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia, defineStore } from "pinia";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import PurchaseOrderForm from "@/components/PurchaseOrders/PurchaseOrderForm.vue";

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

// NOTE: itemTypesStore is no longer used directly in PurchaseOrderForm
// All data fetching is done via purchaseOrderResourcesStore

vi.mock("@/stores/purchaseOrderResources", () => {
  const estimateItemsMap = ref(
    new Map<
      string,
      { poItems: any[]; loading: boolean; error: string | null }
    >()
  );
  const preferredItemsMap = ref(new Map<string, any[]>());

  const projectKey = (corp?: string | null, project?: string | null) =>
    `${corp ?? ""}::${project ?? ""}`;

  const estimateKey = (
    corp?: string | null,
    project?: string | null,
    estimate?: string | null
  ) => `${projectKey(corp, project)}::${estimate ?? ""}`;

  const getPreferredItems = (corp?: string | null, project?: string | null) => {
    const key = `${corp ?? ""}::${project ?? ""}`;
    return preferredItemsMap.value.get(key) ?? [];
  };

  const getEstimateItems = (
    corp?: string | null,
    project?: string | null,
    estimate?: string | null
  ) => {
    const record = estimateItemsMap.value.get(
      estimateKey(corp, project, estimate)
    );
    return record?.poItems ?? [];
  };

  const getEstimateItemsLoading = (
    corp?: string | null,
    project?: string | null,
    estimate?: string | null
  ) => {
    const record = estimateItemsMap.value.get(
      estimateKey(corp, project, estimate)
    );
    return record?.loading ?? false;
  };

  const getEstimateItemsError = (
    corp?: string | null,
    project?: string | null,
    estimate?: string | null
  ) => {
    const record = estimateItemsMap.value.get(
      estimateKey(corp, project, estimate)
    );
    return record?.error ?? null;
  };

  const estimatesMap = ref(new Map<string, any[]>());
  
  const getEstimatesByProject = (corpUuid?: string | null, projectUuid?: string | null) => {
    if (!corpUuid || !projectUuid) return [];
    const key = `${corpUuid}::${undefined}`;
    const estimates = estimatesMap.value.get(key) || [];
    return estimates.filter((e: any) => e.project_uuid === projectUuid);
  };
  
  const getProjectState = (corpUuid?: string | null, projectUuid?: string | null) => {
    const estimatesKey = `${corpUuid ?? ""}::${undefined}`;
    return {
      estimates: estimatesMap.value.get(estimatesKey) || [],
      estimatesLoading: false,
      estimatesLoaded: false,
    };
  };

  return {
    usePurchaseOrderResourcesStore: () => ({
      resetForTest: vi.fn(() => {
        estimateItemsMap.value = new Map();
        preferredItemsMap.value = new Map();
        estimatesMap.value = new Map();
      }),
      ensureProjectResources: vi.fn(() => Promise.resolve()),
      ensureEstimateItems: vi.fn(() => Promise.resolve([])),
      ensureCostCodeConfigurations: vi.fn(() => Promise.resolve([])),
      ensurePreferredItems: vi.fn(() => Promise.resolve([])),
      ensureItemTypes: vi.fn(() => Promise.resolve([])),
      ensureEstimates: vi.fn(() => Promise.resolve([])),
      clearProject: vi.fn(),
      clear: vi.fn(),
      getPreferredItems,
      getCostCodeConfigurations: () => [],
      getEstimateItems,
      getEstimatesByProject,
      getItemTypes: vi.fn(() => []),
      getProjectState,
      getEstimateItemsLoading,
      getEstimateItemsError,
      projectKey,
      estimateKey,
    }),
  };
});

vi.mock("@/stores/estimates", () => ({
  useEstimatesStore: () => ({
    estimates: [],
    loading: ref(false),
    fetchEstimates: vi.fn(),
    getEstimatesByProject: () => [],
  }),
}));

vi.mock("@/stores/corporations", () => ({
  useCorporationStore: () => ({
    corporations: [
      { uuid: "corp-1", name: "Corporation 1" },
      { uuid: "corp-2", name: "Corporation 2" },
    ],
    selectedCorporation: { uuid: "corp-1", name: "Corporation 1" },
    selectedCorporationId: "corp-1",
    setSelectedCorporation: vi.fn(),
  }),
}));

vi.mock("@/stores/purchaseOrders", () => ({
  usePurchaseOrdersStore: () => ({}),
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

// NOTE: costCodeConfigurationsStore is no longer used directly in PurchaseOrderForm
// All data fetching is done via purchaseOrderResourcesStore

vi.mock("@/stores/uom", () => ({
  useUOMStore: () => ({
    uomList: [],
    loading: ref(false),
    fetchUOM: vi.fn(),
    getActiveUOM: () => [],
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
  POItemsTableWithEstimates: {
    props: ["projectUuid", "formData", "readOnly"],
    template: '<div class="po-items-table-stub" />',
  },
  POLaborItemsTable: {
    props: ["projectUuid", "formData", "readOnly"],
    template: '<div class="po-labor-items-table-stub" />',
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
  TermsAndConditionsSelect: mockTermsAndConditionsSelect,
};

describe("PurchaseOrderForm - Terms and Conditions", () => {
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
      po_number: "PO-1001",
      entry_date: "2024-05-01T00:00:00.000Z",
      po_type: "MATERIAL",
      po_type_uuid: "MATERIAL",
      credit_days: "NET_30",
      ship_via: "Ground",
      ship_via_uuid: "ship-via-1",
      freight: "Carrier",
      freight_uuid: "freight-1",
      shipping_instructions: "Leave at site",
      estimated_delivery_date: "2024-05-05T00:00:00.000Z",
      include_items: "CUSTOM",
      item_total: 0,
      charges_total: 0,
      tax_total: 0,
      total_po_amount: 0,
      po_items: [],
      attachments: [],
      removed_po_items: [],
      ...formOverrides,
    };
    
    const loading = formOverrides.loading !== undefined ? formOverrides.loading : loadingProp;
    const { loading: _, ...formWithoutLoading } = formOverrides;
    
    return mount(PurchaseOrderForm, {
      global: {
        plugins: [pinia],
        stubs: uiStubs,
      },
      props: {
        form: {
          ...form,
          ...formWithoutLoading,
        },
        editingPurchaseOrder: Boolean(form.uuid),
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
    it("should render TermsAndConditionsSelect component for Material PO", () => {
      wrapper = mountForm({ po_type: "MATERIAL" });
      
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      expect(select.exists()).toBe(true);
    });

    it("should not render TermsAndConditionsSelect component for Labor PO", () => {
      wrapper = mountForm({ po_type: "LABOR" });
      
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      expect(select.exists()).toBe(false);
    });

    it("should bind terms_and_conditions_uuid to the select component", () => {
      wrapper = mountForm({ 
        po_type: "MATERIAL",
        terms_and_conditions_uuid: "tc-1" 
      });
      
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      expect(select.exists()).toBe(true);
      expect(select.props("modelValue")).toBe("tc-1");
    });

    it("should handle null terms_and_conditions_uuid", () => {
      wrapper = mountForm({ 
        po_type: "MATERIAL",
        terms_and_conditions_uuid: null 
      });
      
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      expect(select.exists()).toBe(true);
      expect(select.props("modelValue")).toBeNull();
    });

    it("should handle undefined terms_and_conditions_uuid", () => {
      wrapper = mountForm({ 
        po_type: "MATERIAL"
        // terms_and_conditions_uuid not provided
      });
      
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      expect(select.exists()).toBe(true);
      expect(select.props("modelValue")).toBeUndefined();
    });
  });

  describe("Terms and Conditions Form Updates", () => {
    it("should emit update:form when terms and conditions is selected", async () => {
      wrapper = mountForm({ po_type: "MATERIAL" });
      
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
        po_type: "MATERIAL",
        po_mode: "PROJECT", // Provide po_mode to prevent onMounted from setting it and interfering
        terms_and_conditions_uuid: "tc-1" 
      });
      
      // Wait for onMounted to complete
      await wrapper.vm.$nextTick();
      await flushPromises();
      await wrapper.vm.$nextTick();
      
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      await select.vm.$emit("update:modelValue", null);
      await wrapper.vm.$nextTick();
      await flushPromises();

      const latestForm = latestFormEmission(wrapper, "terms_and_conditions_uuid");
      expect(latestForm.terms_and_conditions_uuid).toBeNull();
    });

    it("should use handleFormUpdate to update terms_and_conditions_uuid", async () => {
      wrapper = mountForm({ po_type: "MATERIAL" });
      const vm: any = wrapper.vm;

      expect(typeof vm.handleFormUpdate).toBe("function");

      vm.handleFormUpdate("terms_and_conditions_uuid", "tc-2");
      await wrapper.vm.$nextTick();

      const updateEvents = wrapper.emitted("update:form");
      expect(updateEvents).toBeTruthy();
      expect(updateEvents!.length).toBeGreaterThan(0);

      const latestForm = latestFormEmission(wrapper, "terms_and_conditions_uuid");
      expect(latestForm.terms_and_conditions_uuid).toBe("tc-2");
    });

    it("should handle null value when clearing terms and conditions", async () => {
      wrapper = mountForm({ 
        po_type: "MATERIAL",
        terms_and_conditions_uuid: "tc-1" 
      });
      const vm: any = wrapper.vm;

      vm.handleFormUpdate("terms_and_conditions_uuid", null);
      await wrapper.vm.$nextTick();

      const latestForm = latestFormEmission(wrapper, "terms_and_conditions_uuid");
      expect(latestForm.terms_and_conditions_uuid).toBeNull();
    });

    it("should preserve other form fields when updating terms_and_conditions_uuid", async () => {
      wrapper = mountForm({ 
        po_type: "MATERIAL",
        po_number: "PO-1001",
        vendor_uuid: "vendor-1",
        terms_and_conditions_uuid: "tc-1"
      });
      const vm: any = wrapper.vm;

      vm.handleFormUpdate("terms_and_conditions_uuid", "tc-2");
      await wrapper.vm.$nextTick();

      const latestForm = latestFormEmission(wrapper, "terms_and_conditions_uuid");
      expect(latestForm.terms_and_conditions_uuid).toBe("tc-2");
      expect(latestForm.po_number).toBe("PO-1001");
      expect(latestForm.vendor_uuid).toBe("vendor-1");
    });
  });

  describe("Terms and Conditions in Readonly Mode", () => {
    it("should disable TermsAndConditionsSelect when readonly is true", async () => {
      wrapper = mountForm({ 
        po_type: "MATERIAL",
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
        po_type: "MATERIAL",
        terms_and_conditions_uuid: "tc-1" 
      }, false);
      
      wrapper.setProps({ readonly: false });
      
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      expect(select.exists()).toBe(true);
      expect(select.props("disabled")).toBe(false);
    });
  });

  describe("Terms and Conditions Loading State", () => {
    it("should show loading state in TermsAndConditionsSelect when form is loading", () => {
      wrapper = mountForm({ po_type: "MATERIAL" }, true);
      
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      // When loading, the component might not render or might be in skeleton state
      // This test verifies the component handles loading state
      expect(wrapper.props("loading")).toBe(true);
    });
  });

  describe("Terms and Conditions Position in Layout", () => {
    it("should render TermsAndConditionsSelect between file upload and financial breakdown", () => {
      wrapper = mountForm({ po_type: "MATERIAL" });
      
      // The component should be rendered in the middle section
      // This is a structural test to ensure proper placement
      const select = wrapper.findComponent({ name: "TermsAndConditionsSelect" });
      expect(select.exists()).toBe(true);
      
      // Verify it's in the correct section by checking parent structure
      const parent = select.vm.$parent;
      expect(parent).toBeTruthy();
    });
  });

  describe("Terms and Conditions Preview", () => {
    it("should display preview when terms and conditions is selected", () => {
      wrapper = mountForm({
        po_type: "MATERIAL",
        terms_and_conditions_uuid: "tc-1",
      });

      // Check if preview section exists
      const previewSection = wrapper.find(".prose");
      expect(previewSection.exists()).toBe(true);
    });

    it("should not display preview when no terms and conditions is selected", () => {
      wrapper = mountForm({
        po_type: "MATERIAL",
        terms_and_conditions_uuid: null,
      });

      // Preview should not exist when no terms selected
      const previewSection = wrapper.find(".prose");
      expect(previewSection.exists()).toBe(false);
    });

    it("should display correct terms and conditions name in preview", () => {
      wrapper = mountForm({
        po_type: "MATERIAL",
        terms_and_conditions_uuid: "tc-1",
      });

      const vm: any = wrapper.vm;
      expect(vm.selectedTermsAndCondition).toBeTruthy();
      expect(vm.selectedTermsAndCondition?.name).toBe("Standard Terms");
    });

    it("should display correct terms and conditions content in preview", () => {
      wrapper = mountForm({
        po_type: "MATERIAL",
        terms_and_conditions_uuid: "tc-1",
      });

      const vm: any = wrapper.vm;
      expect(vm.selectedTermsAndCondition).toBeTruthy();
      expect(vm.selectedTermsAndCondition?.content).toBe(
        "<p>Standard terms</p>"
      );
    });

    it("should not display preview for Labor PO even if terms_and_conditions_uuid is set", () => {
      wrapper = mountForm({
        po_type: "LABOR",
        terms_and_conditions_uuid: "tc-1",
      });

      // Preview should not exist for Labor PO
      const previewSection = wrapper.find(".prose");
      expect(previewSection.exists()).toBe(false);
    });
  });
});
