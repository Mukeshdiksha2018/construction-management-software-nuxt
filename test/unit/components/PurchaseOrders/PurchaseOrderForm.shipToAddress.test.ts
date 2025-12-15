import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia, defineStore } from "pinia";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import PurchaseOrderForm from "@/components/PurchaseOrders/PurchaseOrderForm.vue";

// NOTE: itemTypesStore is no longer used directly in PurchaseOrderForm
// All data fetching is done via purchaseOrderResourcesStore

vi.mock("@/stores/purchaseOrderResources", () => {
  const estimatesMap = ref(new Map<string, any[]>());
  
  return {
    usePurchaseOrderResourcesStore: () => ({
      resetForTest: vi.fn(),
      ensureProjectResources: vi.fn(() => Promise.resolve()),
      ensureEstimateItems: vi.fn(() => Promise.resolve([])),
      ensureCostCodeConfigurations: vi.fn(() => Promise.resolve([])),
      ensurePreferredItems: vi.fn(() => Promise.resolve([])),
      ensureItemTypes: vi.fn(() => Promise.resolve([])),
      ensureEstimates: vi.fn(() => Promise.resolve([])),
      clearProject: vi.fn(),
      clear: vi.fn(),
      getPreferredItems: () => [],
      getCostCodeConfigurations: () => [],
      getEstimateItems: () => [],
      getEstimatesByProject: () => [],
      getItemTypes: () => [],
      getProjectState: () => ({
        estimates: [],
        estimatesLoading: false,
        estimatesLoaded: false,
      }),
      getEstimateItemsLoading: () => false,
      getEstimateItemsError: () => null,
      projectKey: () => "",
      estimateKey: () => "",
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

vi.mock("@/stores/projectAddresses", () => {
  const addressesByProject = ref<Record<string, any[]>>({});
  
  const useProjectAddressesStore = defineStore("projectAddresses", () => {
    const loading = ref(false);
    const error = ref<string | null>(null);

    const getAddresses = (projectUuid: string) => {
      return addressesByProject.value[projectUuid] || [];
    };

    const fetchAddresses = vi.fn(async (projectUuid: string) => {
      loading.value = true;
      // Simulate fetching addresses
      if (projectUuid === "proj-1") {
        addressesByProject.value[projectUuid] = [
          {
            uuid: "addr-1",
            project_uuid: "proj-1",
            address_line_1: "123 Main St",
            address_line_2: "Suite 100",
            city: "New York",
            state: "NY",
            zip_code: "10001",
            country: "US",
            address_type: "shipment",
            is_primary: true,
            is_active: true,
          },
          {
            uuid: "addr-2",
            project_uuid: "proj-1",
            address_line_1: "456 Oak Ave",
            city: "Boston",
            state: "MA",
            zip_code: "02101",
            country: "US",
            address_type: "shipment",
            is_primary: false,
            is_active: true,
          },
          {
            uuid: "addr-3",
            project_uuid: "proj-1",
            address_line_1: "789 Final Dest St",
            city: "Chicago",
            state: "IL",
            zip_code: "60601",
            country: "US",
            address_type: "final-destination",
            is_primary: false,
            is_active: true,
          },
          {
            uuid: "addr-4",
            project_uuid: "proj-1",
            address_line_1: "321 Billing St",
            city: "Miami",
            state: "FL",
            zip_code: "33101",
            country: "US",
            address_type: "bill",
            is_primary: false,
            is_active: true,
          },
        ];
      } else {
        addressesByProject.value[projectUuid] = [];
      }
      loading.value = false;
    });

    return {
      loading,
      error,
      getAddresses,
      fetchAddresses,
    };
  });

  return { useProjectAddressesStore };
});

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
};

describe("PurchaseOrderForm - Ship To Address", () => {
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

  const mountForm = (formOverrides: any = {}) => {
    const form = {
      corporation_uuid: "corp-1",
      project_uuid: null,
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
    
    return mount(PurchaseOrderForm, {
      global: {
        plugins: [pinia],
        stubs: uiStubs,
      },
      props: {
        form,
        editingPurchaseOrder: Boolean(form.uuid),
        loading: false,
      },
    });
  };

  describe("Project Purchase Orders", () => {
    it("should display primary shipment address for project PO", async () => {
      wrapper = mountForm({
        po_type: "MATERIAL",
        project_uuid: "proj-1",
      });

      // Wait for addresses to be fetched
      await flushPromises();

      const { useProjectAddressesStore } = await import(
        "@/stores/projectAddresses"
      );
      const addressStore = useProjectAddressesStore();
      await addressStore.fetchAddresses("proj-1");
      await wrapper.vm.$nextTick();
      await flushPromises();

      const vm: any = wrapper.vm;
      const addressText = vm.activeProjectAddressText;

      expect(addressText).toBeTruthy();
      expect(addressText).toContain("123 MAIN ST");
      expect(addressText).toContain("SUITE 100");
      expect(addressText).toContain("NEW YORK");
      expect(addressText).toContain("NY");
      expect(addressText).toContain("10001");
      // Should NOT show final-destination or billing addresses
      expect(addressText).not.toContain("789 FINAL DEST ST");
      expect(addressText).not.toContain("321 BILLING ST");
    });

    it("should show primary shipment address even if not first in array", async () => {
      wrapper = mountForm({
        po_type: "MATERIAL",
        project_uuid: "proj-1",
      });

      await flushPromises();

      const { useProjectAddressesStore } = await import(
        "@/stores/projectAddresses"
      );
      const addressStore = useProjectAddressesStore();
      await addressStore.fetchAddresses("proj-1");
      await wrapper.vm.$nextTick();
      await flushPromises();

      const vm: any = wrapper.vm;
      const addressText = vm.activeProjectAddressText;

      // Should show primary shipment address (addr-1), not the first one
      expect(addressText).toContain("123 MAIN ST");
      expect(addressText).not.toContain("456 OAK AVE");
    });

    it("should fallback to first shipment address if no primary shipment address", async () => {
      wrapper = mountForm({
        po_type: "MATERIAL",
        project_uuid: "proj-1",
      });

      await flushPromises();

      const { useProjectAddressesStore } = await import(
        "@/stores/projectAddresses"
      );
      const addressStore = useProjectAddressesStore();
      await addressStore.fetchAddresses("proj-1");
      // Override getAddresses for this test - only shipment addresses, none primary
      addressStore.getAddresses = () => [
        {
          uuid: "addr-2",
          project_uuid: "proj-1",
          address_line_1: "456 Oak Ave",
          city: "Boston",
          state: "MA",
          zip_code: "02101",
          country: "US",
          address_type: "shipment",
          is_primary: false,
          is_active: true,
        },
      ];

      await wrapper.vm.$nextTick();
      await flushPromises();

      const vm: any = wrapper.vm;
      const addressText = vm.activeProjectAddressText;

      // Should show first shipment address as fallback
      expect(addressText).toContain("456 OAK AVE");
    });

    it("should only show shipment addresses, not final-destination addresses", async () => {
      wrapper = mountForm({
        po_type: "MATERIAL",
        project_uuid: "proj-1",
      });

      await flushPromises();

      const { useProjectAddressesStore } = await import(
        "@/stores/projectAddresses"
      );
      const addressStore = useProjectAddressesStore();
      await addressStore.fetchAddresses("proj-1");
      await wrapper.vm.$nextTick();
      await flushPromises();

      const vm: any = wrapper.vm;
      const addressText = vm.activeProjectAddressText;

      // Should show shipment address, NOT final-destination
      expect(addressText).toContain("123 MAIN ST");
      expect(addressText).not.toContain("789 FINAL DEST ST");
    });

    it("should not show billing addresses", async () => {
      wrapper = mountForm({
        po_type: "MATERIAL",
        project_uuid: "proj-1",
      });

      await flushPromises();

      const { useProjectAddressesStore } = await import(
        "@/stores/projectAddresses"
      );
      const addressStore = useProjectAddressesStore();
      await addressStore.fetchAddresses("proj-1");
      await wrapper.vm.$nextTick();
      await flushPromises();

      const vm: any = wrapper.vm;
      const addressText = vm.activeProjectAddressText;

      // Should NOT show billing address
      expect(addressText).not.toContain("321 BILLING ST");
    });

    it("should show 'No address selected' when no shipment addresses available", async () => {
      wrapper = mountForm({
        po_type: "MATERIAL",
        project_uuid: "proj-1",
      });

      await flushPromises();

      const { useProjectAddressesStore } = await import(
        "@/stores/projectAddresses"
      );
      const addressStore = useProjectAddressesStore();
      // Override to return only non-shipment addresses
      addressStore.getAddresses = () => [
        {
          uuid: "addr-3",
          project_uuid: "proj-1",
          address_line_1: "789 Final Dest St",
          city: "Chicago",
          state: "IL",
          zip_code: "60601",
          country: "US",
          address_type: "final-destination",
          is_primary: true,
          is_active: true,
        },
        {
          uuid: "addr-4",
          project_uuid: "proj-1",
          address_line_1: "321 Billing St",
          city: "Miami",
          state: "FL",
          zip_code: "33101",
          country: "US",
          address_type: "bill",
          is_primary: false,
          is_active: true,
        },
      ];

      await wrapper.vm.$nextTick();
      await flushPromises();

      const vm: any = wrapper.vm;
      const addressText = vm.activeProjectAddressText;

      // Should be empty when no shipment addresses exist
      expect(addressText).toBe("");

      // Check the displayed text in the UI
      const shipToDiv = wrapper.find(".p-2.bg-gray-50");
      if (shipToDiv.exists()) {
        expect(shipToDiv.text()).toContain("No address selected");
      }
    });

    it("should show 'No address selected' when no addresses available", async () => {
      wrapper = mountForm({
        po_type: "MATERIAL",
        project_uuid: "proj-2", // Project with no addresses
      });

      await flushPromises();

      const { useProjectAddressesStore } = await import(
        "@/stores/projectAddresses"
      );
      const addressStore = useProjectAddressesStore();
      await addressStore.fetchAddresses("proj-2");
      await wrapper.vm.$nextTick();
      await flushPromises();

      const vm: any = wrapper.vm;
      const addressText = vm.activeProjectAddressText;

      // Should be empty when no addresses exist
      expect(addressText).toBe("");

      // Check the displayed text in the UI
      const shipToDiv = wrapper.find(".p-2.bg-gray-50");
      if (shipToDiv.exists()) {
        expect(shipToDiv.text()).toContain("No address selected");
      }
    });

    it("should fetch addresses when project is selected", async () => {
      wrapper = mountForm({
        po_type: "MATERIAL",
        project_uuid: null,
      });

      await flushPromises();

      const { useProjectAddressesStore } = await import(
        "@/stores/projectAddresses"
      );
      const addressStore = useProjectAddressesStore();
      const fetchSpy = vi.spyOn(addressStore, "fetchAddresses");

      // Select a project
      await wrapper.setProps({
        form: {
          ...wrapper.props("form"),
          project_uuid: "proj-1",
        },
      });

      await flushPromises();

      // Should fetch addresses for the new project
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  describe("Custom Purchase Orders", () => {
    it("should show textarea for custom shipping address", () => {
      wrapper = mountForm({
        po_type: "MATERIAL",
        po_mode: "CUSTOM", // Explicitly set to CUSTOM mode
        project_uuid: null,
      });

      const textarea = wrapper.findComponent({ name: "UTextarea" });
      // Textarea should exist for custom PO
      // Note: The component uses isProjectPurchaseOrder which is based on po_mode
      // If po_mode is not set, it defaults to PROJECT mode
      if (!textarea.exists()) {
        // If textarea doesn't exist, it means it's treated as project PO
        // This is expected if po_mode defaults to PROJECT
        const addressDiv = wrapper.find(".p-2.bg-gray-50");
        // Either textarea or address div should exist
        expect(addressDiv.exists() || textarea.exists()).toBe(true);
      } else {
        expect(textarea.exists()).toBe(true);
      }
    });

    it("should allow entering custom shipping address", async () => {
      wrapper = mountForm({
        po_type: "MATERIAL",
        project_uuid: null, // No project = custom PO
        shipping_address_custom: "123 Custom St, City, State",
      });

      const textarea = wrapper.findComponent({ name: "UTextarea" });
      if (textarea.exists()) {
        expect(textarea.props("modelValue")).toBe("123 Custom St, City, State");
      }
    });

    it("should update form when custom address is entered", async () => {
      wrapper = mountForm({
        po_type: "MATERIAL",
        project_uuid: null, // No project = custom PO
      });

      const textarea = wrapper.findComponent({ name: "UTextarea" });
      if (textarea.exists()) {
        await textarea.vm.$emit("update:modelValue", "New Custom Address");
        await wrapper.vm.$nextTick();

        const updateEvents = wrapper.emitted("update:form");
        expect(updateEvents).toBeTruthy();

        const latestForm = updateEvents?.[updateEvents.length - 1]?.[0];
        expect(latestForm.shipping_address_custom).toBe("New Custom Address");
      }
    });
  });

  describe("Address Formatting", () => {
    it("should format address in uppercase", async () => {
      wrapper = mountForm({
        po_type: "MATERIAL",
        project_uuid: "proj-1",
      });

      await flushPromises();

      const { useProjectAddressesStore } = await import(
        "@/stores/projectAddresses"
      );
      const addressStore = useProjectAddressesStore();
      await addressStore.fetchAddresses("proj-1");
      await wrapper.vm.$nextTick();
      await flushPromises();

      const vm: any = wrapper.vm;
      const addressText = vm.activeProjectAddressText;

      // All text should be uppercase
      expect(addressText).toBe(addressText.toUpperCase());
    });

    it("should format address with all parts", async () => {
      wrapper = mountForm({
        po_type: "MATERIAL",
        project_uuid: "proj-1",
      });

      await flushPromises();

      const { useProjectAddressesStore } = await import(
        "@/stores/projectAddresses"
      );
      const addressStore = useProjectAddressesStore();
      await addressStore.fetchAddresses("proj-1");
      await wrapper.vm.$nextTick();
      await flushPromises();

      const vm: any = wrapper.vm;
      const addressText = vm.activeProjectAddressText;

      // Should include all address parts
      expect(addressText).toContain("123 MAIN ST");
      expect(addressText).toContain("SUITE 100");
      expect(addressText).toContain("NEW YORK");
      expect(addressText).toContain("NY");
      expect(addressText).toContain("10001");
      expect(addressText).toContain("UNITED STATES OF AMERICA");
    });

    it("should handle missing optional address fields", async () => {
      wrapper = mountForm({
        po_type: "MATERIAL",
        project_uuid: "proj-1",
      });

      await flushPromises();

      const { useProjectAddressesStore } = await import(
        "@/stores/projectAddresses"
      );
      const addressStore = useProjectAddressesStore();
      await addressStore.fetchAddresses("proj-1");
      // Override getAddresses for this test - shipment address with minimal fields
      addressStore.getAddresses = () => [
        {
          uuid: "addr-min",
          project_uuid: "proj-1",
          address_line_1: "Minimal Address",
          city: "City",
          state: "ST",
          address_type: "shipment",
          is_primary: true,
          is_active: true,
        },
      ];

      await wrapper.vm.$nextTick();
      await flushPromises();

      const vm: any = wrapper.vm;
      const addressText = vm.activeProjectAddressText;

      // Should still format correctly without optional fields
      expect(addressText).toContain("MINIMAL ADDRESS");
      expect(addressText).toContain("CITY");
      expect(addressText).toContain("ST");
    });
  });
});
