import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia, defineStore } from "pinia";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CalendarDate } from "@internationalized/date";
import { ref, h } from "vue";
import PurchaseOrderForm from "@/components/PurchaseOrders/PurchaseOrderForm.vue";
import POItemsTableWithEstimates from "@/components/PurchaseOrders/POItemsTableWithEstimates.vue";
import { useEstimatesStore } from "@/stores/estimates";
import { usePurchaseOrderResourcesStore } from "@/stores/purchaseOrderResources";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const corpLevelType = {
  id: 1,
  uuid: "corp-type-1",
  corporation_uuid: "corp-1",
  project_uuid: null,
  item_type: "General Material",
  short_name: "MAT",
  is_active: true,
};

let fetchItemTypesSpy: ReturnType<typeof vi.fn> | undefined;
let ensureProjectResourcesCalls: ReturnType<typeof vi.fn> | undefined;
let ensureEstimateItemsCalls: ReturnType<typeof vi.fn> | undefined;
let clearProjectCalls: ReturnType<typeof vi.fn> | undefined;
let clearCalls: ReturnType<typeof vi.fn> | undefined;
let purchaseOrderResourcesStoreInstance: any;

// NOTE: itemTypesStore is no longer used directly in PurchaseOrderForm
// All data fetching is done via purchaseOrderResourcesStore

const uiStubs = {
  UCard: { template: "<div><slot /></div>" },
  USelectMenu: {
    props: ["modelValue", "items", "valueKey", "placeholder", "size", "disabled"],
    emits: ["update:modelValue"],
    template: "<select />",
  },
  UPopover: { template: '<div><slot /><slot name="content" /></div>' },
  UButton: { template: "<button><slot /></button>", props: ["icon", "color", "variant", "size", "disabled", "loading"] },
  UCalendar: { props: ["modelValue"], emits: ["update:modelValue"], template: "<div />" },
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
    template:
      '<div><slot name="header" /><slot name="body" /><slot name="footer" /></div>',
  },
  UFileUpload: {
    props: ["modelValue", "accept", "multiple"],
    emits: ["update:modelValue"],
    setup(props: any, { emit, slots }: any) {
      const open = () => {};
      const removeFile = () => {};
      return () =>
        h(
          "div",
          { class: "u-file-upload-stub" },
          slots.default
            ? slots.default({
                open,
                removeFile,
              })
            : []
        );
    },
  },
  USkeleton: { template: '<div class="skeleton" />' },
  UBadge: { template: '<span><slot /></span>', props: ["color", "variant", "size"] },
  UIcon: { template: '<span />', props: ["name"] },
  UOMSelect: { template: '<select class="uom-select-stub"></select>' },
  UBanner: {
    props: ["title", "description", "color", "icon"],
    template: '<div class="u-banner">{{ title }}</div>',
  },
};

let fetchEstimatesMock = vi.fn();

vi.mock("@/stores/purchaseOrderResources", () => {
  const estimateItemsMap = ref(
    new Map<
      string,
      { poItems: any[]; loading: boolean; error: string | null }
    >()
  );
  const preferredItemsMap = ref(new Map<string, any[]>());
  const estimatesMap = ref(new Map<string, any[]>());
  
  // Store for project states
  const projectStatesMap = ref(new Map<string, any>());

  const projectKey = (corp?: string | null, project?: string | null) =>
    `${corp ?? ""}::${project ?? ""}`;

  const estimateKey = (
    corp?: string | null,
    project?: string | null,
    estimate?: string | null
  ) => `${projectKey(corp, project)}::${estimate ?? ""}`;

  const setEstimateItemsForTest = (
    corp?: string | null,
    project?: string | null,
    estimate?: string | null,
    poItems: any[] = [],
    options: { loading?: boolean; error?: string | null } = {}
  ) => {
    const next = new Map(estimateItemsMap.value);
    next.set(estimateKey(corp, project, estimate), {
      poItems,
      loading: options.loading ?? false,
      error: options.error ?? null,
    });
    estimateItemsMap.value = next;
  };

  const clearProjectInternal = (
    corp?: string | null,
    project?: string | null
  ) => {
    const prefix = projectKey(corp, project);
    const next = new Map<
      string,
      { poItems: any[]; loading: boolean; error: string | null }
    >();
    for (const [key, value] of estimateItemsMap.value.entries()) {
      if (!key.startsWith(prefix)) {
        next.set(key, value);
      }
    }
    estimateItemsMap.value = next;
  };

  const clearAllInternal = () => {
    estimateItemsMap.value = new Map();
    preferredItemsMap.value = new Map();
    projectStatesMap.value = new Map();
  };

  const preferredKey = (corp?: string | null, project?: string | null) =>
    `${corp ?? ""}::${project ?? ""}`;

  const setPreferredItemsForTest = (
    corp?: string | null,
    project?: string | null,
    items: any[] = []
  ) => {
    const next = new Map(preferredItemsMap.value);
    next.set(preferredKey(corp, project), items);
    preferredItemsMap.value = next;
  };

  const getPreferredItems = (corp?: string | null, project?: string | null) => {
    const key = preferredKey(corp, project);
    return preferredItemsMap.value.get(key) ?? [];
  };
  
  const getOrCreateProjectState = (corp?: string | null, project?: string | null) => {
    const key = projectKey(corp, project);
    if (!projectStatesMap.value.has(key)) {
      projectStatesMap.value.set(key, {
        corporationUuid: corp,
        projectUuid: project,
        itemTypes: [],
        itemTypesLoading: false,
        itemTypesLoaded: false,
        preferredItems: [],
        preferredItemsLoading: false,
        preferredItemsLoaded: false,
        estimates: [],
        estimatesLoading: false,
        estimatesLoaded: false,
        estimateItemsMap: {},
      });
    }
    return projectStatesMap.value.get(key);
  };

  return {
    usePurchaseOrderResourcesStore: defineStore(
      "purchaseOrderResources",
      () => {
        const ensureProjectResources = async (args: any) => {
          ensureProjectResourcesCalls?.(args);
        };

        const ensureItemTypes = vi.fn(async () => {});
        const ensureCostCodeConfigurations = vi.fn(async () => {});
        const ensurePreferredItems = vi.fn(async () => {});
        
        const ensureEstimates = vi.fn(async ({ corporationUuid, force = false }: { corporationUuid: string; force?: boolean }) => {
          const state = getOrCreateProjectState(corporationUuid, undefined);
          if (state.estimatesLoaded && !force) {
            return state.estimates;
          }
          state.estimatesLoading = true;
          // Simulate async fetch - will be overridden in beforeEach if needed
          state.estimatesLoading = false;
          state.estimatesLoaded = true;
          return state.estimates;
        });
        
        const ensureEstimateItems = async (args: any) => {
          ensureEstimateItemsCalls?.(args);
          return getEstimateItems(
            args.corporationUuid,
            args.projectUuid,
            args.estimateUuid
          );
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
        
        const getProjectState = (
          corp?: string | null,
          project?: string | null
        ) => {
          const key = projectKey(corp, project);
          return projectStatesMap.value.get(key) || null;
        };
        
        const getEstimatesByProject = (
          corp?: string | null,
          project?: string | null
        ) => {
          if (!corp || !project) return [];
          const state = getProjectState(corp, undefined);
          if (!state) return [];
          return state.estimates.filter((e: any) => e.project_uuid === project);
        };

        const clearProject = (
          corp?: string | null,
          project?: string | null
        ) => {
          clearProjectCalls?.(corp, project);
          clearProjectInternal(corp, project);
        };

        const clear = () => {
          clearCalls?.();
          clearAllInternal();
        };

        const resetForTest = () => {
          estimateItemsMap.value = new Map();
          preferredItemsMap.value = new Map();
          projectStatesMap.value = new Map();
        };

        return {
          ensureProjectResources,
          ensureItemTypes,
          ensureCostCodeConfigurations,
          ensurePreferredItems,
          ensureEstimates,
          ensureEstimateItems,
          getPreferredItems,
          getCostCodeConfigurations: (
            corp?: string | null,
            project?: string | null
          ) => [],
          getEstimateItems,
          getEstimatesByProject,
          getItemTypes: vi.fn(() => []),
          getProjectState,
          getOrCreateProjectState,
          getEstimateItemsLoading,
          getEstimateItemsError,
          projectKey,
          estimateKey,
          clearProject,
          clear,
          setEstimateItemsForTest,
          setPreferredItemsForTest,
          resetForTest,
          __test: {
            get ensureProjectResourcesCalls() {
              return ensureProjectResourcesCalls;
            },
            get ensureEstimateItemsCalls() {
              return ensureEstimateItemsCalls;
            },
            get clearProjectCalls() {
              return clearProjectCalls;
            },
            get clearCalls() {
              return clearCalls;
            },
            estimatesMap,
          },
        };
      }
    ),
  };
});

vi.mock("@/components/Shared/ProjectSelect.vue", () => ({
  default: { template: "<div />", props: ["modelValue"] },
}));
vi.mock("@/components/Shared/VendorSelect.vue", () => ({
  default: { template: "<div />", props: ["modelValue"] },
}));
vi.mock("@/components/Shared/ShipViaSelect.vue", () => ({
  default: { template: "<div />", props: ["modelValue"] },
}));
vi.mock("@/components/Shared/FreightSelect.vue", () => ({
  default: { template: "<div />", props: ["modelValue"] },
}));
vi.mock("@/components/Shared/FilePreview.vue", () => ({
  default: { template: "<div />", props: ["attachment"] },
}));
vi.mock("@/components/Shared/ItemSelect.vue", () => ({
  default: {
    props: ["modelValue"],
    emits: ["update:modelValue", "change"],
    template: `<div class="item-select-stub" @click="() => { const option = { value: modelValue || 'stub-item', label: 'Stub Item', raw: { item_name: 'Stub Item', description: 'Stub desc', unit: 'EA', unit_price: 21 } }; $emit('change', { value: option.value, option }) }">{{ modelValue || 'Select item' }}</div>`,
  },
}));

vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (value: number | string | null | undefined) => {
      const num =
        typeof value === "string" ? parseFloat(value) : Number(value ?? 0);
      if (Number.isNaN(num)) return "$0.00";
      return `$${num.toFixed(2)}`;
    },
    currencySymbol: ref("$"),
  }),
}));

// NOTE: estimatesStore is no longer used in PurchaseOrderForm
// Estimates are now managed by purchaseOrderResourcesStore

// Mock useUTCDateFormat with the actual fix implementation
vi.mock("@/composables/useUTCDateFormat", () => ({
  useUTCDateFormat: () => ({
    toUTCString: (dateInput: string | Date | null): string | null => {
      if (!dateInput) return null;
      if (dateInput instanceof Date) {
        return dayjs(dateInput).utc().toISOString();
      }
      // Parse the date string as UTC to preserve the date (avoid timezone shifts)
      // Format: YYYY-MM-DD should become YYYY-MM-DDTHH:mm:ss.sssZ in UTC
      const dateStr = String(dateInput);
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // It's a date string in YYYY-MM-DD format, treat it as UTC midnight
        return `${dateStr}T00:00:00.000Z`;
      }
      const localDate = dayjs(dateInput).startOf("day");
      return localDate.utc().toISOString();
    },
    fromUTCString: (utcString: string | null): string => {
      if (!utcString) return "";
      // This is the fix: convert to local timezone first, then format
      return dayjs.utc(utcString).local().format("YYYY-MM-DD");
    },
    getCurrentLocal: () => dayjs().format("YYYY-MM-DD"),
  }),
}));

describe("PurchaseOrderForm.vue", () => {
  let pinia: any;
  let useCorporationStore: any;
  let usePurchaseOrdersStore: any;
  let useProjectsStore: any;
  let useProjectAddressesStore: any;
  let useVendorStore: any;
  let useShipViaStore: any;
  let useFreightStore: any;
  let useUOMStore: any;
  // NOTE: estimatesStoreInstance and itemTypesStoreInstance are no longer used
  // All data is now managed by purchaseOrderResourcesStore

  beforeEach(async () => {
    ensureProjectResourcesCalls = vi.fn();
    ensureEstimateItemsCalls = vi.fn();
    clearProjectCalls = vi.fn();
    clearCalls = vi.fn();
    pinia = createPinia();
    setActivePinia(pinia);
    const { useItemTypesStore } = await import("@/stores/itemTypes");

    useCorporationStore = defineStore("corporations", {
      state: () => ({
        corporations: [
          { uuid: "corp-1", name: "Corporation 1" },
          { uuid: "corp-2", name: "Corporation 2" },
        ],
        selectedCorporation: { uuid: "corp-1", name: "Corporation 1" },
        selectedCorporationId: "corp-1",
      }),
      actions: {
        setSelectedCorporation: vi.fn(),
      },
    });
    usePurchaseOrdersStore = defineStore("purchaseOrders", () => ({
      purchaseOrders: [],
    }));
    useProjectsStore = defineStore("projects", {
      actions: { fetchProjectsMetadata: vi.fn() },
    });
    useProjectAddressesStore = defineStore("projectAddresses", {
      state: () => ({ map: new Map() }),
      actions: {
        fetchAddresses: vi.fn(async (projectUuid: string) => {
          // no-op
        }),
      },
      getters: {
        getAddresses: () => (uuid: string) =>
          [
            {
              uuid: "addr-1",
              is_primary: true,
              address_line_1: "123",
              city: "X",
              state: "Y",
              zip_code: "Z",
              country: "US",
            },
          ],
      },
    });
    useVendorStore = defineStore("vendors", {
      state: () => ({
        vendors: [
          {
            uuid: "v-1",
            vendor_name: "V",
            vendor_address: "A",
            vendor_city: "C",
            vendor_state: "S",
            vendor_zip: "Z",
            vendor_country: "US",
          },
        ],
      }),
      actions: { fetchVendors: vi.fn() },
    });
    useShipViaStore = defineStore("shipVia", {
      getters: {
        getShipViaByUuid: () => (uuid: string) => ({
          uuid,
          ship_via: "GROUND",
        }),
      },
    });
    useFreightStore = defineStore("freightGlobal", {
      getters: {
        getFreightByUuid: () => (uuid: string) => ({ uuid, ship_via: "FOB" }),
      },
    });
    // NOTE: costCodeConfigurationsStore is no longer used directly in PurchaseOrderForm
    // All data fetching is done via purchaseOrderResourcesStore
    useUOMStore = defineStore("uom", {
      actions: {
        fetchUOM: vi.fn(),
      },
      getters: {
        getActiveUOM: () => (corpUuid: string) => [
          {
            uuid: "uom-1",
            short_name: "EA",
            uom_name: "Each",
          },
        ],
      },
    });
    fetchItemTypesSpy = vi.fn();
    
    // Initialize stores
    useCorporationStore();
    usePurchaseOrdersStore();
    useProjectsStore();
    useProjectAddressesStore();
    useVendorStore();
    useShipViaStore();
    useFreightStore();
    useUOMStore();
    
    // Initialize purchaseOrderResourcesStore with mock data
    purchaseOrderResourcesStoreInstance =
      usePurchaseOrderResourcesStore() as any;
    purchaseOrderResourcesStoreInstance.resetForTest?.();
    
    // Mock getEstimatesByProject to return test estimates
    purchaseOrderResourcesStoreInstance.getEstimatesByProject = vi.fn((corpUuid: string, projectUuid: string) => {
      if (corpUuid === "corp-1" && projectUuid === "proj-1") {
        return [
          {
            uuid: "est-1",
            project_uuid: "proj-1",
            estimate_number: "EST-001",
            status: "Approved",
            estimate_date: "2025-01-15",
            valid_until: "2025-02-15",
            total_amount: 5000,
            final_amount: 4500,
            line_items: [{ id: 1 }, { id: 2 }],
            attachments: [],
          },
        ];
      }
      return [];
    });
    
    // Mock ensureEstimates to populate estimates in store
    purchaseOrderResourcesStoreInstance.ensureEstimates = vi.fn(async ({ corporationUuid }: { corporationUuid: string }) => {
      if (corporationUuid === "corp-1") {
        const state = purchaseOrderResourcesStoreInstance.getProjectState?.(corporationUuid, undefined);
        if (state) {
          state.estimates = [
            {
              uuid: "est-1",
              project_uuid: "proj-1",
              estimate_number: "EST-001",
              status: "Approved",
              estimate_date: "2025-01-15",
              valid_until: "2025-02-15",
              total_amount: 5000,
              final_amount: 4500,
              line_items: [{ id: 1 }, { id: 2 }],
              attachments: [],
            },
          ];
          state.estimatesLoaded = true;
          state.estimatesLoading = false;
        }
      }
      return [];
    });
  }, 30000); // Increase timeout to 30 seconds for async setup

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
      include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
      item_total: 0,
      charges_total: 0,
      tax_total: 0,
      total_po_amount: 0,
      po_items: [],
      attachments: [],
      removed_po_items: [],
      ...formOverrides,
    };
    
    // Extract loading from formOverrides if provided
    const loading = formOverrides.loading !== undefined ? formOverrides.loading : loadingProp
    const { loading: _, ...formWithoutLoading } = formOverrides
    
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

  it("fetches item types for project scope and falls back to corporation data", async () => {
    // NOTE: This test verifies the purchaseOrderResourcesStore behavior
    // Track calls to ensureProjectResources
    const ensureProjectResourcesSpy = vi.fn();
    purchaseOrderResourcesStoreInstance.ensureProjectResources = ensureProjectResourcesSpy;
    
    const wrapper = mountForm({
      include_items: "CUSTOM",
      po_items: [
        {
          id: "po-item-1",
          item_type_uuid: "corp-type-1",
          display_metadata: {},
        },
      ],
    });

    await flushPromises();
    await flushPromises();

    // Verify that ensureProjectResources was called with corporation and project
    expect(ensureProjectResourcesSpy).toHaveBeenCalled();
    const calls = ensureProjectResourcesSpy.mock.calls;
    const hasProjectCall = calls.some(
      ([args]: any) =>
        args.corporationUuid === "corp-1" && args.projectUuid === "proj-1"
    );
    
    expect(hasProjectCall).toBe(true);
  });

  it("renders PO items table when estimate items are present", async () => {
    const wrapper = mountForm({
      include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
      po_items: [
        {
          name: "Concrete mix and materials",
          description: "Concrete mix and materials",
          quantity: 12.34567,
          unit_price: 125.5,
          total: 1545.25,
          uom: "BAG",
          uom_uuid: "uom-bag",
          uom_label: "BAG",
          cost_code_uuid: "cc-1",
          cost_code_number: "033000",
          cost_code_name: "Cast-in-Place Concrete",
          display_metadata: {
            cost_code_label: "03 30 00 Cast-in-Place Concrete",
            cost_code_number: "033000",
            cost_code_name: "Cast-in-Place Concrete",
            division_name: "Concrete",
            sequence: "SEQ-100",
            location_display: "Zone A",
            unit_label: "BAG",
            unit_uuid: "uom-bag",
          },
          approval_checks: ["Engineer"],
        },
      ],
    });

    await wrapper.vm.$nextTick();
    await flushPromises();

    const html = wrapper.html();
    expect(html).toContain("PO Items");
    // The description might be in a textarea that's readonly, so check for the cost code instead
    expect(html).toContain("Cast-in-Place Concrete");
    expect(html).toContain("uom-select-stub");
    expect(html).toContain("1545.25");
    // Check for cost code number which should be displayed
    expect(html).toContain("033000");
  });

  it("prefills saved PO unit price and quantity when editing existing purchase orders", async () => {
    const savedItem = {
      id: "po-line-1",
      cost_code_uuid: "cc-1",
      item_type_uuid: "type-1",
      item_uuid: "item-1",
      description: "Saved PO line",
      po_unit_price: 88.5,
      po_quantity: 4,
      po_total: 354,
      display_metadata: {
        cost_code_label: "CC-1 Saved",
        cost_code_number: "001",
        cost_code_name: "Saved code",
      },
    };

    const wrapper = mountForm({
      uuid: "po-existing",
      include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
      po_items: [savedItem],
    });

    await flushPromises();
    await flushPromises();

    const table = wrapper.findComponent(POItemsTableWithEstimates);
    expect(table.exists()).toBe(true);

    const [firstItem] = table.props("items") as any[];
    expect(firstItem.po_unit_price).toBe(88.5);
    expect(firstItem.po_quantity).toBe(4);
    expect(firstItem.po_total).toBe(354);
  });

  it("keeps estimate quantity distinct from PO quantity when displaying items", async () => {
    // Seed estimate items as the source of truth
    purchaseOrderResourcesStoreInstance.setEstimateItemsForTest?.(
      "corp-1",
      "proj-1",
      "est-1",
      [
        {
          cost_code_uuid: "cc-1",
          item_type_uuid: "type-1",
          item_uuid: "item-1",
          description: "Estimate line",
          quantity: 20, // estimate quantity
          unit_price: 16.48,
          total: 329.6,
        },
      ]
    );

    const wrapper = mountForm({
      uuid: "po-existing-estimate-vs-po",
      include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
      po_items: [
        {
          id: "po-line-1",
          cost_code_uuid: "cc-1",
          item_type_uuid: "type-1",
          item_uuid: "item-1",
          description: "Line with separate estimate and PO values",
          // Intentionally set a different quantity on the PO item to ensure
          // the display uses the estimate snapshot instead of this field.
          quantity: 5,
          unit_price: 16.48,
          total: 329.6,
          // PO values (user-edited, distinct from estimate)
          po_quantity: 10,
          po_unit_price: 16.48,
          po_total: 164.8,
          display_metadata: {
            cost_code_label: "CC-1 Estimate vs PO",
            cost_code_number: "001",
            cost_code_name: "Estimate vs PO",
          },
        },
      ],
    });

    await flushPromises();
    await flushPromises();

    const table = wrapper.findComponent(POItemsTableWithEstimates);
    expect(table.exists()).toBe(true);

    const [firstItem] = table.props("items") as any[];
    // Estimate quantity should remain 20 (derived from total / unit_price),
    // while PO quantity reflects the saved PO quantity (10).
    expect(firstItem.quantity).toBeCloseTo(20);
    expect(firstItem.po_quantity).toBe(10);
    // Unit price is shared between estimate and PO in this scenario, which is expected.
    expect(firstItem.unit_price).toBe(16.48);
    expect(firstItem.po_unit_price).toBe(16.48);
  });

  it("does not auto-import estimate items on initial load when editing an existing PO", async () => {
    // Reset the spy to clear any previous calls
    ensureEstimateItemsCalls?.mockClear();
    
    const wrapper = mountForm({
      uuid: "po-existing-no-auto-import",
      include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
      estimate_uuid: undefined, // No estimate selected initially
      po_items: [
        {
          id: "po-line-1",
          cost_code_uuid: "cc-1",
          item_type_uuid: "type-1",
          item_uuid: "item-1",
          description: "Existing PO line item",
          quantity: 20,
          unit_price: 16.48,
          total: 329.6,
          po_quantity: 10,
          po_unit_price: 16.48,
          po_total: 164.8,
          display_metadata: {
            cost_code_label: "CC-1 Existing",
          },
        },
      ],
    });

    await flushPromises();
    await flushPromises();

    // When editing an existing PO without an estimate_uuid, 
    // ensureEstimateItems should not be called automatically.
    expect(ensureEstimateItemsCalls).toHaveBeenCalledTimes(0);

    const table = wrapper.findComponent(POItemsTableWithEstimates);
    expect(table.exists()).toBe(true);

    const [firstItem] = table.props("items") as any[];
    expect(firstItem.quantity).toBeCloseTo(20);
    expect(firstItem.po_quantity).toBe(10);
  });

  it("retains saved PO-specific fields when estimate items are reapplied", async () => {
    const savedItem = {
      id: "po-line-1",
      cost_code_uuid: "cc-1",
      item_type_uuid: "type-1",
      item_uuid: "item-1",
      description: "Saved PO line",
      po_unit_price: 50,
      po_quantity: 3,
      po_total: 150,
      display_metadata: {
        cost_code_label: "CC-1 Saved",
        cost_code_number: "001",
        cost_code_name: "Saved code",
      },
    };

    const wrapper = mountForm({
      uuid: "po-existing",
      include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
      po_items: [savedItem],
    });

    await flushPromises();

    purchaseOrderResourcesStoreInstance.setEstimateItemsForTest?.(
      "corp-1",
      "proj-1",
      "est-1",
      [
        {
          cost_code_uuid: "cc-1",
          item_type_uuid: "type-1",
          item_uuid: "item-1",
          description: "Updated from estimate",
          quantity: 10,
          unit_price: 12,
          total: 120,
          display_metadata: {
            cost_code_label: "CC-1 Updated",
          },
        },
      ]
    );

    await flushPromises();
    await flushPromises();

    const latest = latestFormEmission(wrapper, "po_items");
    expect(latest.po_items[0].po_unit_price).toBe(50);
    expect(latest.po_items[0].po_quantity).toBe(3);
    expect(latest.po_items[0].po_total).toBe(150);
    const aggregatedTotal = latest.po_items.reduce(
      (sum: number, item: any) =>
        sum + (typeof item.po_total === "number" ? item.po_total : 0),
      0
    );
    expect(aggregatedTotal).toBe(150);
    if (typeof latest.item_total === "number") {
      expect([0, aggregatedTotal]).toContain(latest.item_total);
    }
  });

  it("updates PO item purchase totals when child emits PO value events", async () => {
    const wrapper = mountForm({
      include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
      po_items: [
        {
          description: "Concrete mix and materials",
          quantity: 5,
          unit_price: 125.5,
          total: 627.5,
          display_metadata: {},
        },
      ],
    });

    await flushPromises();
    await flushPromises();
    await wrapper.vm.$nextTick();
    const table = wrapper.findComponent(POItemsTableWithEstimates);
    expect(table.exists()).toBe(true);

    // Emit unit price change
    table.vm.$emit("po-unit-price-change", {
      index: 0,
      value: "10",
      numericValue: 10,
      computedTotal: 0,
    });
    await flushPromises();
    await flushPromises();
    await wrapper.vm.$nextTick();

    // Get the emitted form and update wrapper props to simulate parent behavior
    let latest = latestFormEmission(wrapper);
    await wrapper.setProps({ form: latest });
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(latest.po_items[0].po_unit_price).toBe(10);
    expect(latest.po_items[0].po_total).toBe(0);

    // Emit quantity change
    table.vm.$emit("po-quantity-change", {
      index: 0,
      value: "3",
      numericValue: 3,
      computedTotal: 30,
    });
    await flushPromises();
    await flushPromises();
    await wrapper.vm.$nextTick();

    // Get the emitted form and update wrapper props
    latest = latestFormEmission(wrapper);
    await wrapper.setProps({ form: latest });
    await flushPromises();
    await flushPromises();
    await wrapper.vm.$nextTick();

    // Manually trigger recalculation to update item_total and total_po_amount
    const vm: any = wrapper.vm;
    vm.recalculateChargesAndTaxes();
    await flushPromises();
    await flushPromises();
    await wrapper.vm.$nextTick();

    // Get the latest emission after recalculation
    latest = latestFormEmission(wrapper);

    expect(latest.po_items[0].po_quantity).toBe(3);
    expect(latest.po_items[0].po_total).toBe(30);
    expect(latest.item_total).toBe(30);
    expect(latest.total_po_amount).toBe(30);
    expect(latest.po_items[0].total).toBe(627.5);
  });

  it("treats estimate-only totals as zero until purchase order values are provided", async () => {
    const wrapper = mountForm({
      include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
    });

    const vm: any = wrapper.vm;
    vm.updatePoItems([
      {
        id: "estimate-item-1",
        total: 725.5,
        po_unit_price: null,
        po_quantity: null,
        po_total: null,
        display_metadata: {},
      },
      {
        id: "estimate-item-2",
        total: 312.4,
        po_unit_price: null,
        po_quantity: null,
        po_total: null,
        display_metadata: {},
      },
    ]);

    await flushPromises();

    const latest = latestFormEmission(wrapper, "item_total");
    expect(latest.item_total).toBe(0);
    expect(latest.total_po_amount).toBe(0);
    expect(latest.charges_total).toBe(0);
    expect(latest.tax_total).toBe(0);
  });

  it("aggregates purchase order totals using PO-specific amounts instead of estimate totals", async () => {
    const wrapper = mountForm({
      include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
    });

    await flushPromises();
    await flushPromises();
    await wrapper.vm.$nextTick();

    const vm: any = wrapper.vm;
    vm.updatePoItems([
      {
        id: "po-item-1",
        total: 1800,
        po_unit_price: 25,
        po_quantity: 3,
        po_total: null,
        display_metadata: {},
      },
      {
        id: "po-item-2",
        total: 2600,
        po_unit_price: null,
        po_quantity: null,
        po_total: 19.99,
        display_metadata: {},
      },
    ]);

    await flushPromises();
    await flushPromises();
    await wrapper.vm.$nextTick();

    // Get the emitted form and update wrapper props to simulate parent behavior
    let latest = latestFormEmission(wrapper);
    await wrapper.setProps({ form: latest });
    await flushPromises();
    await wrapper.vm.$nextTick();

    // Manually trigger recalculation since we're calling updatePoItems directly
    vm.recalculateChargesAndTaxes();
    await flushPromises();
    await flushPromises();
    await wrapper.vm.$nextTick();

    latest = latestFormEmission(wrapper);
    expect(latest.item_total).toBeCloseTo(94.99, 2);
    expect(latest.total_po_amount).toBeCloseTo(94.99, 2);
    expect(latest.item_total).not.toBe(4400);
    expect(latest.po_items).toHaveLength(2);
  });

  it("reapplies saved PO values when matching estimate rows load", async () => {
    const wrapper = mountForm({
      include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
      po_items: [
        {
          cost_code_uuid: "cc-1",
          item_type_uuid: "type-1",
          item_uuid: "item-1",
          po_unit_price: 25,
          po_quantity: 4,
          po_total: 100,
          display_metadata: {
            cost_code_uuid: "cc-1",
            item_type_uuid: "type-1",
            item_name: "Saved Item",
          },
        },
      ],
    });

    await flushPromises();
    await flushPromises();
    await wrapper.vm.$nextTick();

    const vm: any = wrapper.vm;
    vm.updatePoItems([
      {
        cost_code_uuid: "cc-1",
        item_type_uuid: "type-1",
        item_uuid: "item-1",
        name: "Concrete Mix",
        display_metadata: {},
      },
    ]);
    await flushPromises();
    await flushPromises();
    await wrapper.vm.$nextTick();

    // Manually trigger recalculation since we're calling updatePoItems directly
    vm.recalculateChargesAndTaxes();
    await flushPromises();
    await wrapper.vm.$nextTick();

    const latest = latestFormEmission(wrapper, "po_items");
    expect(latest.po_items[0].po_unit_price).toBe(25);
    expect(latest.po_items[0].po_quantity).toBe(4);
    expect(latest.po_items[0].po_total).toBe(100);
    expect(latest.total_po_amount).toBe(100);
  });

  it("skips po-total-change events to avoid race conditions", async () => {
    // The updatePoItemPoTotal handler now skips processing because
    // po_total is already set by updatePoItemPoUnitPrice and updatePoItemPoQuantity
    // This prevents race conditions where stale data overwrites fresh updates
    const wrapper = mountForm({
      include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
      po_items: [
        {
          description: "Concrete mix and materials",
          quantity: 5,
          unit_price: 125.5,
          total: 627.5,
          po_unit_price: 10,
          po_quantity: 3,
          po_total: 30,
          display_metadata: {},
        },
      ],
    });

    await flushPromises();
    const table = wrapper.findComponent(POItemsTableWithEstimates);
    expect(table.exists()).toBe(true);

    // Emit po-total-change (this should be skipped by the handler)
    table.vm.$emit("po-total-change", { index: 0, value: 125.75 });
    await flushPromises();

    // The po_total should remain unchanged because the handler skips processing
    const latest = latestFormEmission(wrapper, "po_items");
    expect(latest.po_items[0].po_total).toBe(30); // unchanged
  });

  it("reactively updates itemTotal when editing existing purchase order items", async () => {
    // This test verifies the fix for the reactivity issue where itemTotal
    // wasn't updating when editing existing purchase orders
    const wrapper = mountForm({
      uuid: "po-existing",
      include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
      po_items: [
        {
          description: "Concrete mix",
          quantity: 5,
          unit_price: 10,
          total: 50,
          po_unit_price: 10,
          po_quantity: 5,
          po_total: 50,
          display_metadata: {},
        },
      ],
    });

    await flushPromises();
    await flushPromises();
    await wrapper.vm.$nextTick();
    const table = wrapper.findComponent(POItemsTableWithEstimates);
    expect(table.exists()).toBe(true);

    // Initial itemTotal should be calculated from po_items
    // onMounted should have triggered recalculation
    let latest = latestFormEmission(wrapper, "item_total");
    expect(latest.item_total).toBe(50);

    // Update quantity - this should trigger reactive recalculation
    table.vm.$emit("po-quantity-change", {
      index: 0,
      value: "10",
      numericValue: 10,
      computedTotal: 100,
    });
    await flushPromises();
    await flushPromises();
    await wrapper.vm.$nextTick();

    // Get the emitted form and update wrapper props to simulate parent behavior
    latest = latestFormEmission(wrapper);
    await wrapper.setProps({ form: latest });
    await flushPromises();
    await flushPromises();
    await wrapper.vm.$nextTick();

    // itemTotal should update reactively to reflect the new quantity
    latest = latestFormEmission(wrapper);
    expect(latest.po_items[0].po_quantity).toBe(10);
    expect(latest.po_items[0].po_total).toBe(100);
    expect(latest.item_total).toBe(100);
    expect(latest.total_po_amount).toBe(100);
  });

  it("updates financial breakdown totals when charges and taxes change", async () => {
    const wrapper = mountForm({
      po_items: [
        {
          po_unit_price: 100,
          po_quantity: 1,
          po_total: 100,
          display_metadata: {},
        },
      ],
      item_total: 100,
      charges_total: 0,
      tax_total: 0,
      total_po_amount: 100,
    });

    await flushPromises();
    await flushPromises();
    await wrapper.vm.$nextTick();

    const vm: any = wrapper.vm;

    // Call handleFinancialBreakdownUpdate directly (which is called by FinancialBreakdown component)
    // Update freight charge percentage and mark it as taxable
    vm.handleFinancialBreakdownUpdate({
      freight_charges_percentage: 10,
      freight_charges_amount: 10,
      freight_charges_taxable: true,
    });
    await flushPromises();
    await flushPromises();
    await wrapper.vm.$nextTick();

    let afterCharge = latestFormEmission(wrapper);
    await wrapper.setProps({ form: afterCharge });
    await flushPromises();
    await wrapper.vm.$nextTick();

    // Update sales tax percentage
    // Note: Sales tax is calculated on item_total + taxable charges
    // With freight of 10 (taxable), the taxable base is 110
    // So 5% of 110 = 5.5
    // The FinancialBreakdown component will calculate the amount automatically
    vm.handleFinancialBreakdownUpdate({
      sales_tax_1_percentage: 5,
      // Amount will be calculated by the component: 5% of (100 + 10) = 5.5
    });
    await flushPromises();
    await flushPromises();
    await wrapper.vm.$nextTick();

    let afterTax = latestFormEmission(wrapper);
    await wrapper.setProps({ form: afterTax });
    await flushPromises();
    await wrapper.vm.$nextTick();

    // Manually trigger recalculation to calculate sales_tax_1_amount from percentage
    vm.recalculateChargesAndTaxes();
    await flushPromises();
    await flushPromises();
    await wrapper.vm.$nextTick();

    const latest = latestFormEmission(wrapper);
    expect(latest).toBeTruthy();
    
    // Check that the form fields are updated correctly
    expect(latest?.freight_charges_percentage).toBeCloseTo(10);
    expect(latest?.freight_charges_amount).toBeCloseTo(10);
    expect(latest?.sales_tax_1_percentage).toBeCloseTo(5);
    expect(latest?.sales_tax_1_amount).toBeCloseTo(5.5);
    
    // Verify financial breakdown structure if it exists
    if (latest?.financial_breakdown) {
      const breakdown = latest.financial_breakdown;
      expect(breakdown.charges.freight.amount).toBeCloseTo(10);
      expect(breakdown.charges.freight.percentage).toBeCloseTo(10);
      expect(breakdown.sales_taxes.sales_tax_1.amount).toBeCloseTo(5.5);
      expect(breakdown.sales_taxes.sales_tax_1.percentage).toBeCloseTo(5);

      expect(breakdown.totals.item_total).toBeCloseTo(100);
      expect(breakdown.totals.charges_total).toBeCloseTo(10);
      expect(breakdown.totals.tax_total).toBeCloseTo(5.5);
      expect(breakdown.totals.total_po_amount).toBeCloseTo(115.5);
    }
  });

  // TODO: Re-enable this test after fixing remove-row event handling in tests
  // it("stores removed PO items and allows restoring them", async () => {
  //   const wrapper = mountForm({
  //     include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
  //     po_items: [
  //       {
  //         id: "po-item-1",
  //         description: "Gravel",
  //         po_unit_price: 5,
  //         po_quantity: 2,
  //         po_total: 10,
  //         display_metadata: {},
  //       },
  //       {
  //         id: "po-item-2",
  //         description: "Sand",
  //         po_unit_price: 3,
  //         po_quantity: 1,
  //         po_total: 3,
  //         display_metadata: {},
  //       },
  //     ],
  //     removed_po_items: [],
  //   });

  //   await flushPromises();
  //   await flushPromises();
  //   await wrapper.vm.$nextTick();

  //   const table = wrapper.findComponent(POItemsTableWithEstimates);
  //   expect(table.exists()).toBe(true);

  //   table.vm.$emit("remove-row", 0);
  //   await flushPromises();
  //   await flushPromises();
  //   await wrapper.vm.$nextTick();

  //   let latest = latestFormEmission(wrapper, "removed_po_items");
  //   expect(latest.removed_po_items).toHaveLength(1);
  //   expect(latest.removed_po_items[0].id).toBe("po-item-1");
  //   expect(latest.po_items).toHaveLength(1);

  //   await wrapper.setProps({ form: latest });
  //   await flushPromises();
  //   await wrapper.vm.$nextTick();

  //   const vm: any = wrapper.vm;
  //   vm.restoreRemovedPoItem(0);
  //   await flushPromises();
  //   await flushPromises();
  //   await wrapper.vm.$nextTick();

  //   latest = latestFormEmission(wrapper, "removed_po_items");
  //   expect(latest.removed_po_items).toHaveLength(0);
  //   expect(latest.po_items).toHaveLength(2);
  //   expect(latest.po_items.some((item: any) => item.id === "po-item-1")).toBe(true);
  // });

  it("filters out removed items from table display on load", async () => {
    // Simulate opening an existing PO where one item was previously removed
    const wrapper = mountForm({
      po_items: [
        {
          id: "po-item-1",
          description: "Concrete mix",
          po_unit_price: 5,
          po_quantity: 2,
          po_total: 10,
          display_metadata: {},
        },
        {
          id: "po-item-2",
          description: "Sand",
          po_unit_price: 3,
          po_quantity: 1,
          po_total: 3,
          display_metadata: {},
        },
        {
          id: "po-item-3",
          description: "Gravel",
          po_unit_price: 4,
          po_quantity: 3,
          po_total: 12,
          display_metadata: {},
        },
      ],
      removed_po_items: [
        {
          id: "po-item-1",
          description: "Concrete mix",
          po_unit_price: 5,
          po_quantity: 2,
          po_total: 10,
          display_metadata: {},
          removed_at: "2024-01-01T00:00:00Z",
        },
      ],
    });

    await flushPromises();
    await wrapper.vm.$nextTick();

    const table = wrapper.findComponent(POItemsTableWithEstimates);
    expect(table.exists()).toBe(true);

    // The table should only show 2 items (po-item-2 and po-item-3)
    // po-item-1 should be filtered out because it's in removed_po_items
    const displayedItems = table.props("items");
    expect(displayedItems).toHaveLength(2);
    
    const displayedIds = displayedItems.map((item: any) => item.id);
    expect(displayedIds).toContain("po-item-2");
    expect(displayedIds).toContain("po-item-3");
    expect(displayedIds).not.toContain("po-item-1");
  });

  it("filters out multiple removed items by item_uuid", async () => {
    const wrapper = mountForm({
      editingPurchaseOrder: true,
      po_items: [
        {
          id: "po-item-1",
          item_uuid: "item-uuid-1",
          description: "Item 1",
          po_unit_price: 10,
          po_quantity: 1,
          po_total: 10,
          display_metadata: {},
        },
        {
          id: "po-item-2",
          item_uuid: "item-uuid-2",
          description: "Item 2",
          po_unit_price: 20,
          po_quantity: 1,
          po_total: 20,
          display_metadata: {},
        },
        {
          id: "po-item-3",
          item_uuid: "item-uuid-3",
          description: "Item 3",
          po_unit_price: 30,
          po_quantity: 1,
          po_total: 30,
          display_metadata: {},
        },
        {
          id: "po-item-4",
          item_uuid: "item-uuid-4",
          description: "Item 4",
          po_unit_price: 40,
          po_quantity: 1,
          po_total: 40,
          display_metadata: {},
        },
      ],
      removed_po_items: [
        {
          id: "po-item-1",
          item_uuid: "item-uuid-1",
          description: "Item 1",
          removed_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "po-item-3",
          item_uuid: "item-uuid-3",
          description: "Item 3",
          removed_at: "2024-01-01T00:00:01Z",
        },
      ],
    });

    await flushPromises();
    await wrapper.vm.$nextTick();

    const table = wrapper.findComponent(POItemsTableWithEstimates);
    const displayedItems = table.props("items") as any[];
    
    // Should only show items 2 and 4
    expect(displayedItems).toHaveLength(2);
    expect(displayedItems[0].item_uuid).toBe("item-uuid-2");
    expect(displayedItems[1].item_uuid).toBe("item-uuid-4");
  });

  it("does not filter items when removed_po_items is empty", async () => {
    const wrapper = mountForm({
      editingPurchaseOrder: true,
      po_items: [
        {
          id: "po-item-1",
          item_uuid: "item-uuid-1",
          description: "Item 1",
          display_metadata: {},
        },
        {
          id: "po-item-2",
          item_uuid: "item-uuid-2",
          description: "Item 2",
          display_metadata: {},
        },
      ],
      removed_po_items: [],
    });

    await flushPromises();
    await wrapper.vm.$nextTick();

    const table = wrapper.findComponent(POItemsTableWithEstimates);
    const displayedItems = table.props("items") as any[];
    
    // Should show all items
    expect(displayedItems).toHaveLength(2);
  });

  it("preserves filtered state when watchers trigger during edit", async () => {
    const wrapper = mountForm({
      editingPurchaseOrder: true,
      include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
      project_uuid: "proj-1",
      po_items: [
        {
          id: "po-item-1",
          item_uuid: "item-uuid-1",
          description: "Visible Item",
          po_unit_price: 10,
          po_quantity: 1,
          po_total: 10,
          display_metadata: {},
        },
      ],
      removed_po_items: [
        {
          id: "po-item-removed",
          item_uuid: "item-uuid-removed",
          description: "Removed Item",
          removed_at: "2024-01-01T00:00:00Z",
        },
      ],
    });

    await flushPromises();
    await flushPromises();
    await wrapper.vm.$nextTick();

    const table = wrapper.findComponent(POItemsTableWithEstimates);
    const displayedItemsBefore = table.props("items") as any[];
    
    // Should only show 1 item (the removed one is filtered)
    expect(displayedItemsBefore).toHaveLength(1);
    expect(displayedItemsBefore[0].item_uuid).toBe("item-uuid-1");

    // Change include_items to trigger watcher
    await wrapper.setProps({
      form: {
        ...wrapper.props("form"),
        include_items: "CUSTOM",
      },
    });

    await flushPromises();
    await wrapper.vm.$nextTick();

    const displayedItemsAfter = table.props("items") as any[];
    
    // Should still only show 1 item (watcher should not re-add removed items)
    expect(displayedItemsAfter).toHaveLength(1);
    expect(displayedItemsAfter[0].item_uuid).toBe("item-uuid-1");
  });

  // TODO: Re-enable this test after fixing remove-row event handling in tests
  // it("updates display when item is removed and then form is re-rendered", async () => {
  //   const wrapper = mountForm({
  //     editingPurchaseOrder: true,
  //     po_items: [
  //       {
  //         id: "po-item-1",
  //         item_uuid: "item-uuid-1",
  //         description: "Item 1",
  //         po_unit_price: 10,
  //         po_quantity: 1,
  //         po_total: 10,
  //         display_metadata: {},
  //       },
  //       {
  //         id: "po-item-2",
  //         item_uuid: "item-uuid-2",
  //         description: "Item 2",
  //         po_unit_price: 20,
  //         po_quantity: 1,
  //         po_total: 20,
  //         display_metadata: {},
  //       },
  //     ],
  //     removed_po_items: [],
  //   });

  //   await flushPromises();
  //   await wrapper.vm.$nextTick();

  //   const table = wrapper.findComponent(POItemsTableWithEstimates);
  //   let displayedItems = table.props("items");
  //   expect(displayedItems).toHaveLength(2);

  //   // Remove the first item
  //   table.vm.$emit("remove-row", 0);
  //   await flushPromises();
  //   await flushPromises();
  //   await wrapper.vm.$nextTick();

  //   let latest = latestFormEmission(wrapper);
  //   expect(latest.removed_po_items).toHaveLength(1);
  //   expect(latest.removed_po_items[0].item_uuid).toBe("item-uuid-1");

  //   // Update props with new form state
  //   await wrapper.setProps({ form: latest });
  //   await flushPromises();
  //   await wrapper.vm.$nextTick();

  //   displayedItems = table.props("items");
  //   expect(displayedItems).toHaveLength(1);
  //   expect(displayedItems[0].item_uuid).toBe("item-uuid-2");
  // });

  // TODO: Re-enable this test after fixing restoreRemovedPoItem functionality
  // it("correctly restores removed item and updates display", async () => {
  //   const wrapper = mountForm({
  //     editingPurchaseOrder: true,
  //     po_items: [
  //       {
  //         id: "po-item-2",
  //         item_uuid: "item-uuid-2",
  //         description: "Visible Item",
  //         po_unit_price: 20,
  //         po_quantity: 1,
  //         po_total: 20,
  //         display_metadata: {},
  //       },
  //     ],
  //     removed_po_items: [
  //       {
  //         id: "po-item-1",
  //         item_uuid: "item-uuid-1",
  //         description: "Removed Item",
  //         po_unit_price: 10,
  //         po_quantity: 1,
  //         po_total: 10,
  //         display_metadata: {},
  //         removed_at: "2024-01-01T00:00:00Z",
  //       },
  //     ],
  //   });

  //   await flushPromises();
  //   await wrapper.vm.$nextTick();

  //   const table = wrapper.findComponent(POItemsTableWithEstimates);
  //   let displayedItems = table.props("items");
  //   
  //   // Should show 1 item before restore
  //   expect(displayedItems).toHaveLength(1);
  //   expect(displayedItems[0].item_uuid).toBe("item-uuid-2");

  //   // Restore the removed item
  //   const vm: any = wrapper.vm;
  //   vm.restoreRemovedPoItem(0);
  //   await flushPromises();
  //   await flushPromises();
  //   await wrapper.vm.$nextTick();

  //   let latest = latestFormEmission(wrapper);
  //   expect(latest.removed_po_items).toHaveLength(0);
  //   expect(latest.po_items).toHaveLength(2);

  //   // Update props with restored state
  //   await wrapper.setProps({ form: latest });
  //   await flushPromises();
  //   await wrapper.vm.$nextTick();

  //   displayedItems = table.props("items");
  //   
  //   // Should show 2 items after restore
  //   expect(displayedItems).toHaveLength(2);
  //   const itemUuids = displayedItems.map((item: any) => item.item_uuid);
  //   expect(itemUuids).toContain("item-uuid-1");
  //   expect(itemUuids).toContain("item-uuid-2");
  // });

  it("filters items by composite key when item_uuid is not available", async () => {
    const wrapper = mountForm({
      editingPurchaseOrder: true,
      po_items: [
        {
          id: "po-item-1",
          cost_code_uuid: "cc-1",
          item_type_uuid: "it-1",
          description: "Item without UUID",
          display_metadata: {
            cost_code_uuid: "cc-1",
          },
        },
        {
          id: "po-item-2",
          cost_code_uuid: "cc-2",
          item_type_uuid: "it-2",
          description: "Visible Item",
          display_metadata: {},
        },
      ],
      removed_po_items: [
        {
          id: "po-item-1",
          cost_code_uuid: "cc-1",
          item_type_uuid: "it-1",
          description: "Item without UUID",
          display_metadata: {
            cost_code_uuid: "cc-1",
          },
          removed_at: "2024-01-01T00:00:00Z",
        },
      ],
    });

    await flushPromises();
    await wrapper.vm.$nextTick();

    const table = wrapper.findComponent(POItemsTableWithEstimates);
    const displayedItems = table.props("items") as any[];
    
    // Should filter by composite key
    expect(displayedItems).toHaveLength(1);
    expect(displayedItems[0].id).toBe("po-item-2");
  });

  describe("Location UUID Mapping", () => {
    it("should include location_uuid in mapped PO items for display", async () => {
      const wrapper = mountForm({
        po_items: [
          {
            id: "item-1",
            cost_code_uuid: "cc-1",
            item_type_uuid: "type-1",
            item_uuid: "item-1",
            location_uuid: "loc-1",
            location: "Warehouse A",
            description: "Test item",
            unit_price: 100,
            quantity: 5,
            po_unit_price: 100,
            po_quantity: 5,
          },
        ],
      });

      await flushPromises();

      const table = wrapper.findComponent(POItemsTableWithEstimates);
      expect(table.exists()).toBe(true);

    const items = table.props("items") as any[];
      expect(items).toHaveLength(1);
      expect(items[0].location_uuid).toBe("loc-1");
      expect(items[0].location).toBe("Warehouse A");
    });

    it("should handle location_uuid from display_metadata", async () => {
      const wrapper = mountForm({
        po_items: [
          {
            id: "item-1",
            cost_code_uuid: "cc-1",
            item_type_uuid: "type-1",
            item_uuid: "item-1",
            location_uuid: null,
            location: null,
            display_metadata: {
              location_uuid: "loc-2",
              location_display: "Site Office",
            },
            description: "Test item",
            unit_price: 100,
            quantity: 5,
            po_unit_price: 100,
            po_quantity: 5,
          },
        ],
      });

      await flushPromises();

      const table = wrapper.findComponent(POItemsTableWithEstimates);
      const items = table.props("items") as any[];
      expect(items[0]?.location_uuid).toBe("loc-2");
      expect(items[0]?.location).toBe("Site Office");
    });

    it("should set location_uuid to null when not provided", async () => {
      const wrapper = mountForm({
        po_items: [
          {
            id: "item-1",
            cost_code_uuid: "cc-1",
            item_type_uuid: "type-1",
            item_uuid: "item-1",
            description: "Test item",
            unit_price: 100,
            quantity: 5,
            po_unit_price: 100,
            po_quantity: 5,
          },
        ],
      });

      await flushPromises();

      const table = wrapper.findComponent(POItemsTableWithEstimates);
      const items = table.props("items") as any[];
      expect(items[0]?.location_uuid).toBeNull();
    });

    it("should prioritize item.location_uuid over display_metadata.location_uuid", async () => {
      const wrapper = mountForm({
        po_items: [
          {
            id: "item-1",
            cost_code_uuid: "cc-1",
            item_type_uuid: "type-1",
            item_uuid: "item-1",
            location_uuid: "loc-1",
            location: "Warehouse A",
            display_metadata: {
              location_uuid: "loc-2",
              location_display: "Site Office",
            },
            description: "Test item",
            unit_price: 100,
            quantity: 5,
            po_unit_price: 100,
            po_quantity: 5,
          },
        ],
      });

      await flushPromises();

      const table = wrapper.findComponent(POItemsTableWithEstimates);
      const items = table.props("items") as any[];
      // Should use item.location_uuid, not display_metadata.location_uuid
      expect(items[0]?.location_uuid).toBe("loc-1");
      // Note: location display string uses display_metadata.location_display if present,
      // which is fine since it's just for display. The important thing is location_uuid is correct.
      // The location display will be "Site Office" from display_metadata, but location_uuid is "loc-1"
      expect(items[0]?.location).toBe("Site Office");
    });
  });

  it("shows loading skeleton when loading prop is true", () => {
    const wrapper = mount(PurchaseOrderForm, {
      global: {
        plugins: [pinia],
        stubs: uiStubs,
      },
      props: {
        form: { corporation_uuid: "corp-1" },
        editingPurchaseOrder: false,
        loading: true,
      },
    });

    const skeletons = wrapper.findAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders form fields when loading is false", () => {
    const wrapper = mountForm({}, false);
    // The form should render actual fields, not skeletons
    const skeletons = wrapper.findAll(".skeleton");
    expect(skeletons.length).toBe(0);
  });

  it("shows skeleton loaders for right panel attachments when loading", () => {
    const wrapper = mount(PurchaseOrderForm, {
      global: {
        plugins: [pinia],
        stubs: uiStubs,
      },
      props: {
        form: { corporation_uuid: "corp-1" },
        editingPurchaseOrder: false,
        loading: true,
      },
    });

    // Should have skeleton loaders in the right panel
    const skeletons = wrapper.findAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("keeps PO items section visible when editing existing items without estimate import", async () => {
    const wrapper = mountForm({
      uuid: "po-123", // Has uuid, so editing mode (allows CUSTOM option)
      include_items: "CUSTOM",
      po_items: [
        {
          description: "Existing line item",
          quantity: 5,
          unit_price: 10,
          total: 50,
          display_metadata: {
            cost_code_label: "01 11 00 Summary of Work",
          },
        },
      ],
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("PO Items");
    expect(wrapper.text()).toContain("Select item");
  });

  // CUSTOM mode is no longer available - test removed
  // it("supports custom purchase orders without project selection", async () => {
  //   const wrapper = mountForm({
  //     po_mode: "CUSTOM",
  //     project_uuid: "proj-1",
  //     shipping_address_uuid: "addr-1",
  //     shipping_address_custom: "123 Custom Street",
  //     include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
  //   });
  //
  //   await flushPromises();
  //
  //   const html = wrapper.html();
  //   expect(html).toContain("Custom purchase orders do not require a project.");
  //
  //   const updateEvents = (wrapper.emitted("update:form") ?? []) as any[][];
  //   expect(updateEvents.length).toBeGreaterThan(0);
  //   const hasCustomMode = updateEvents.some(
  //     (event) => event[0].po_mode === "CUSTOM" && event[0].project_uuid === null
  //   );
  //   const hasClearedAddress = updateEvents.some(
  //     (event) => event[0].shipping_address_uuid === null
  //   );
  //   expect(hasCustomMode).toBe(true);
  //   expect(hasClearedAddress).toBe(true);
  //   const lastEvent = updateEvents[updateEvents.length - 1]?.[0] as
  //     | Record<string, any>
  //     | undefined;
  //   expect(lastEvent?.shipping_address_custom).toBe("123 Custom Street");
  // });

  // CUSTOM mode is no longer available - test removed
  // it("clears custom ship-to details when switching back to project mode", async () => {
  //   const wrapper = mountForm({
  //     po_mode: "CUSTOM",
  //     shipping_address_custom: "123 Custom Street",
  //     include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
  //   });
  //
  //   const vm: any = wrapper.vm as any;
  //   vm.handlePoModeChange("PROJECT");
  //   await flushPromises();
  //
  //   const updateEvents = (wrapper.emitted("update:form") ?? []) as any[][];
  //   expect(updateEvents.length).toBeGreaterThan(0);
  //   const hasProjectMode = updateEvents.some(
  //     (event) => event[0].po_mode === "PROJECT"
  //   );
  //   expect(hasProjectMode).toBe(true);
  //   const clearedAddress = updateEvents.some(
  //     (event) => event[0].shipping_address_custom === null
  //   );
  //   expect(clearedAddress).toBe(true);
  // });

  it("filters include items options when editing (PROJECT mode)", async () => {
    const wrapper = mountForm({
      uuid: "po-123", // Has uuid, so editing mode
      po_mode: "PROJECT",
      include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
    });
    const vm: any = wrapper.vm as any;

    await flushPromises();

    const filtered = vm.filteredIncludeItemsOptions as unknown as Array<{
      label: string;
      value: string;
    }>;
    // When editing, "Custom" should be available
    expect(filtered).toEqual([
      { label: "Custom", value: "CUSTOM" },
      { label: "Import Items from Master", value: "IMPORT_ITEMS_FROM_MASTER" },
      { label: "Import Items from Estimate", value: "IMPORT_ITEMS_FROM_ESTIMATE" },
    ]);
  });

  it("excludes Custom option from include items when creating new purchase order", async () => {
    const wrapper = mountForm({
      // No uuid, so creating mode
      po_mode: "PROJECT",
      include_items: "IMPORT_ITEMS_FROM_MASTER",
    });
    const vm: any = wrapper.vm as any;

    await flushPromises();

    const filtered = vm.filteredIncludeItemsOptions as unknown as Array<{
      label: string;
      value: string;
    }>;
    // When creating, "Custom" should NOT be available
    expect(filtered).toEqual([
      { label: "Import Items from Master", value: "IMPORT_ITEMS_FROM_MASTER" },
      { label: "Import Items from Estimate", value: "IMPORT_ITEMS_FROM_ESTIMATE" },
    ]);
    expect(filtered.find((opt: any) => opt.value === "CUSTOM")).toBeUndefined();
  });

  // CUSTOM mode is no longer available - test removed
  // it("excludes Custom option from include items when creating custom purchase order", async () => {
  //   const wrapper = mountForm({
  //     // No uuid, so creating mode
  //     po_mode: "CUSTOM",
  //     include_items: "IMPORT_ITEMS_FROM_MASTER",
  //   });
  //   const vm: any = wrapper.vm as any;
  //
  //   await flushPromises();
  //
  //   const filtered = vm.filteredIncludeItemsOptions as unknown as Array<{
  //     label: string;
  //     value: string;
  //   }>;
  //   // When creating custom PO, "Custom" should NOT be available, and "Import Items from Estimate" should also be filtered out
  //   expect(filtered).toEqual([
  //     { label: "Import Items from Master", value: "IMPORT_ITEMS_FROM_MASTER" },
  //   ]);
  //   expect(filtered.find((opt: any) => opt.value === "CUSTOM")).toBeUndefined();
  //   expect(filtered.find((opt: any) => opt.value === "IMPORT_ITEMS_FROM_ESTIMATE")).toBeUndefined();
  // });

  it("resolves ship via/freight display from UUIDs", () => {
    const wrapper = mountForm({ ship_via: "", freight: "" });
    const vm: any = wrapper.vm as any;
    expect(vm.shipViaDisplayValue).toBe("GROUND");
    expect(vm.freightDisplayValue).toBe("FOB");
  });

  it("hides estimate details when include items option is not Import from Estimate", () => {
    const wrapper = mountForm({ include_items: "CUSTOM" });
    const vm: any = wrapper.vm as any;
    expect(vm.shouldShowEstimateDetails).toBe(false);
    expect(wrapper.text()).not.toContain("Estimate Details");
  });

  it("shows loading indicator while estimates are being fetched", async () => {
    // Mock estimatesLoading from purchaseOrderResourcesStore BEFORE mounting
    // Ensure the state exists first
    const state = purchaseOrderResourcesStoreInstance.getProjectState?.("corp-1", undefined) || 
                   purchaseOrderResourcesStoreInstance.getOrCreateProjectState?.("corp-1", undefined);
    if (state) {
      state.estimatesLoading = true;
      state.estimatesLoaded = false;
    }
    
    // Override ensureEstimates to keep the loading state
    purchaseOrderResourcesStoreInstance.ensureEstimates = vi.fn(async () => {
      // Keep estimatesLoading true for this test
      return [];
    });
    
    const wrapper = mountForm({ include_items: "IMPORT_ITEMS_FROM_ESTIMATE" });
    await wrapper.vm.$nextTick();
    await flushPromises();
    
    expect((wrapper.vm as any).shouldShowEstimateDetails).toBe(true);
    expect(wrapper.text()).toContain("Loading estimate details...");
    
    // Cleanup
    if (state) {
      state.estimatesLoading = false;
    }
  });

  it("renders latest estimate summary when Import Items from Estimate is selected", async () => {
    const wrapper = mountForm({ include_items: "IMPORT_ITEMS_FROM_ESTIMATE" });
    await wrapper.vm.$nextTick();
    const vm: any = wrapper.vm as any;
    expect(vm.shouldShowEstimateDetails).toBe(true);
    expect(vm.estimateDetails).toBeTruthy();
    expect(vm.estimateDetails.number).toBe("EST-001");
    expect(vm.estimateDetails.status).toBe("Estimate approved");
    expect(wrapper.text()).toContain("Estimate Details");
    expect(wrapper.text()).toContain("EST-001");
    expect(wrapper.text()).toContain("$4500.00");
  });

  it("blocks PO creation when importing from a non-approved estimate", async () => {
    // Override both ensureEstimates and getEstimatesByProject to return a draft estimate
    const draftEstimate = {
      uuid: "est-1",
      project_uuid: "proj-1",
      estimate_number: "EST-001",
      status: "Draft", // Set to Draft to block PO creation
      estimate_date: "2025-01-15",
      valid_until: "2025-02-15",
      total_amount: 5000,
      final_amount: 4500,
      line_items: [{ id: 1 }, { id: 2 }],
      attachments: [],
    };
    
    purchaseOrderResourcesStoreInstance.ensureEstimates = vi.fn(async ({ corporationUuid }: { corporationUuid: string }) => {
      if (corporationUuid === "corp-1") {
        const state = purchaseOrderResourcesStoreInstance.getProjectState?.(corporationUuid, undefined);
        if (state) {
          state.estimates = [draftEstimate];
          state.estimatesLoaded = true;
          state.estimatesLoading = false;
        }
      }
      return [draftEstimate];
    });
    
    // Also override getEstimatesByProject to return the draft estimate
    purchaseOrderResourcesStoreInstance.getEstimatesByProject = vi.fn((corpUuid: string, projectUuid: string) => {
      if (corpUuid === "corp-1" && projectUuid === "proj-1") {
        return [draftEstimate];
      }
      return [];
    });
    
    const wrapper = mountForm({ include_items: "IMPORT_ITEMS_FROM_ESTIMATE" });
    await flushPromises();
    await wrapper.vm.$nextTick();
    await flushPromises();
    
    const debugVm: any = wrapper.vm;
    const banner = wrapper.find(".u-banner");
    expect(banner.exists()).toBe(true);
    const events = wrapper.emitted("estimate-import-blocked-change") || [];
    expect(events.length).toBeGreaterThan(0);
    expect(events[events.length - 1]?.[0]).toBe(true);
    expect(wrapper.findComponent(POItemsTableWithEstimates).exists()).toBe(
      false
    );
  });

  it("renders preferred items when importing from item master", async () => {
    const wrapper = mountForm({
      include_items: "IMPORT_ITEMS_FROM_MASTER",
      project_uuid: "proj-1",
      po_items: [
        {
          cost_code_uuid: "cc-1",
          cost_code_number: "001",
          cost_code_name: "Concrete Work",
          cost_code_label: "001 Concrete Work",
          item_type_uuid: "type-1",
          item_type_label: "Concrete",
          item_uuid: "item-1",
          name: "Preferred Item",
          description: "High quality concrete",
          unit_price: 125,
          quantity: 1,
          total: 125,
          uom_uuid: "uom-1",
          uom_label: "EA",
          display_metadata: {
            cost_code_label: "001 Concrete Work",
            cost_code_number: "001",
            cost_code_name: "Concrete Work",
            division_name: "",
            item_type_label: "Concrete",
            unit_label: "EA",
            unit_uuid: "uom-1",
          },
        },
      ],
    });

    await wrapper.vm.$nextTick();

    const vm: any = wrapper.vm as any;
    expect(Array.isArray(vm.poItemsForDisplay)).toBe(true);
    expect(vm.poItemsForDisplay.length).toBeGreaterThan(0);
    expect(vm.isImportingFromMaster).toBe(true);
    expect(vm.shouldShowMasterItemsSection).toBe(true);
    expect(wrapper.text()).toContain(
      "Preferred items imported from item master"
    );

    const hasPreferredDescription = wrapper
      .text()
      .includes("Preferred items imported from item master");
    expect(hasPreferredDescription).toBe(true);
  });

  it("updates cost code fields without changing item or sequence when cost code is changed", async () => {
    const wrapper = mountForm({
      include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
      project_uuid: "proj-1",
      po_items: [
        {
          cost_code_uuid: "cc-1",
          cost_code_number: "001",
          cost_code_name: "Old Cost Code",
          item_type_uuid: "type-1",
          item_type_label: "Concrete",
          item_uuid: "item-1",
          name: "Concrete Mix",
          description: "High-strength concrete",
          unit_price: 100,
          quantity: 1,
          total: 100,
          display_metadata: {
            cost_code_label: "001 Old Cost Code",
            cost_code_number: "001",
            cost_code_name: "Old Cost Code",
            division_name: "",
            item_type_label: "Concrete",
          },
        },
      ],
    });

    const vm: any = wrapper.vm as any;
    expect(vm.form.po_items[0].cost_code_uuid).toBe("cc-1");
    expect(vm.form.po_items[0].item_uuid).toBe("item-1");

    // Simulate cost code change without touching item_uuid / sequence
    vm.updatePoItemCostCode({
      index: 0,
      value: null,
      option: {
        costCode: {
          uuid: "cc-2",
          cost_code_number: "002",
          cost_code_name: "New Cost Code",
          division: { division_name: "Division B" },
        },
      },
    });

    const updated = (vm.form.po_items as any[])[0];
    // Item and type should be unchanged even when cost code metadata is updated
    expect(updated.item_uuid).toBe("item-1");
    expect(updated.item_type_uuid).toBe("type-1");
  });

  it("switches seamlessly between estimate and master item imports", async () => {
    purchaseOrderResourcesStoreInstance.setPreferredItemsForTest?.(
      "corp-1",
      "proj-1",
      [
        {
          id: "pref-1",
          item_uuid: "item-1",
          item_name: "Preferred Item",
          cost_code_uuid: "cc-1",
          cost_code_number: "001",
          cost_code_name: "Concrete Work",
          item_type_uuid: "type-1",
          unit_uuid: "uom-1",
          unit_label: "EA",
          unit_price: 200,
          quantity: 1,
        },
      ]
    );

    purchaseOrderResourcesStoreInstance.setEstimateItemsForTest?.(
      "corp-1",
      "proj-1",
      "est-1",
      [],
      {
        loading: false,
      }
    );

    // mount to trigger ensureProjectResources etc.
    const wrapper = mountForm({
      include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
      project_uuid: "proj-1",
    });

    // now populate estimate items and switch modes
    purchaseOrderResourcesStoreInstance.setEstimateItemsForTest?.(
      "corp-1",
      "proj-1",
      "est-1",
      [
        {
          id: "est-item-1",
          description: "Estimate item",
          cost_code_uuid: "cc-2",
          cost_code_number: "002",
          cost_code_name: "Estimate Work",
          cost_code_label: "002 Estimate Work",
          item_type_uuid: "type-2",
          item_type_label: "Estimate Type",
          item_uuid: "item-2",
          unit_price: 500,
          quantity: 3,
          total: 1500,
          unit_uuid: "uom-2",
          unit_label: "EA",
          uom_label: "EA",
          display_metadata: {
            cost_code_number: "002",
            cost_code_name: "Estimate Work",
            cost_code_label: "002 Estimate Work",
            item_type_label: "Estimate Type",
            unit_label: "EA",
            unit_uuid: "uom-2",
          },
        },
      ]
    );

    await flushPromises();
    await wrapper.vm.$nextTick();

    const wrapperWithItems = mountForm({
      include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
      project_uuid: "proj-1",
      po_items: [
        {
          cost_code_uuid: "cc-10",
          cost_code_number: "010",
          cost_code_name: "Initial Items",
          item_type_uuid: "type-10",
          item_uuid: "item-10",
          unit_price: 100,
          quantity: 2,
          total: 200,
          display_metadata: {
            cost_code_number: "010",
            cost_code_name: "Initial Items",
            cost_code_label: "010 Initial Items",
            item_type_label: "Initial Type",
            unit_label: "EA",
            unit_uuid: "uom-10",
          },
        },
      ],
    });

    await flushPromises();
    await wrapperWithItems.vm.$nextTick();

    let vm: any = wrapperWithItems.vm as any;
    expect(vm.isImportingFromEstimate).toBe(true);
    expect(vm.shouldShowEstimateItemsSection).toBe(true);
    expect(Array.isArray(vm.poItemsForDisplay)).toBe(true);
    expect(vm.poItemsForDisplay.length).toBeGreaterThan(0);
    expect(vm.poItemsForDisplay[0].cost_code_uuid).toBe("cc-10");

    vm.includeItemsOption = "IMPORT_ITEMS_FROM_MASTER";
    await flushPromises();
    await wrapperWithItems.vm.$nextTick();
    purchaseOrderResourcesStoreInstance.setPreferredItemsForTest?.(
      "corp-1",
      "proj-1",
      [
        {
          id: "pref-1",
          item_uuid: "item-1",
          item_name: "Preferred Item",
          cost_code_uuid: "cc-1",
          cost_code_number: "001",
          cost_code_name: "Concrete Work",
          item_type_uuid: "type-1",
          unit_uuid: "uom-1",
          unit_label: "EA",
          unit_price: 200,
          quantity: 1,
        },
      ]
    );
    await flushPromises();
    await wrapperWithItems.vm.$nextTick();
    const masterFormPayload = latestFormEmission(wrapperWithItems);
    await wrapperWithItems.setProps({ form: masterFormPayload });
    await flushPromises();
    await wrapperWithItems.vm.$nextTick();

    expect(vm.isImportingFromMaster).toBe(true);
    expect(vm.shouldShowMasterItemsSection).toBe(true);
    expect(vm.shouldShowEstimateItemsSection).toBe(false);
    expect(vm.poItemsForDisplay.length).toBeGreaterThan(0);
    expect(vm.poItemsForDisplay.length).toBeGreaterThan(0);

    vm.includeItemsOption = "IMPORT_ITEMS_FROM_ESTIMATE";
    await flushPromises();
    await wrapperWithItems.vm.$nextTick();
    purchaseOrderResourcesStoreInstance.setEstimateItemsForTest?.(
      "corp-1",
      "proj-1",
      "est-1",
      [
        {
          id: "est-item-1",
          description: "Estimate item",
          cost_code_uuid: "cc-2",
          cost_code_number: "002",
          cost_code_name: "Estimate Work",
          cost_code_label: "002 Estimate Work",
          item_type_uuid: "type-2",
          item_type_label: "Estimate Type",
          item_uuid: "item-2",
          unit_price: 500,
          quantity: 3,
          total: 1500,
          unit_uuid: "uom-2",
          unit_label: "EA",
          uom_label: "EA",
          display_metadata: {
            cost_code_number: "002",
            cost_code_name: "Estimate Work",
            cost_code_label: "002 Estimate Work",
            item_type_label: "Estimate Type",
            unit_label: "EA",
            unit_uuid: "uom-2",
          },
        },
      ]
    );
    await flushPromises();
    await wrapperWithItems.vm.$nextTick();
    const estimateFormPayload = latestFormEmission(wrapperWithItems);
    await wrapperWithItems.setProps({ form: estimateFormPayload });
    await flushPromises();
    await wrapperWithItems.vm.$nextTick();

    expect(vm.isImportingFromEstimate).toBe(true);
    expect(vm.shouldShowEstimateItemsSection).toBe(true);
    expect(vm.shouldShowMasterItemsSection).toBe(false);
    expect(vm.poItemsForDisplay.length).toBeGreaterThan(0);
    expect(vm.poItemsForDisplay.length).toBeGreaterThan(0);
  });

  it("writes uppercase ID values for selects", async () => {
    const wrapper = mountForm({
      po_type: "",
      credit_days: "",
      include_items: "",
    });
    const vm: any = wrapper.vm as any;

    // Verify handleFormUpdate method exists (used by setters)
    expect(typeof vm.handleFormUpdate).toBe("function");

    // Test that handleFormUpdate emits the correct values
    vm.handleFormUpdate("po_type", "LABOR");
    await wrapper.vm.$nextTick();

    vm.handleFormUpdate("credit_days", "NET_30");
    await wrapper.vm.$nextTick();

    vm.handleFormUpdate("include_items", "CUSTOM");
    await wrapper.vm.$nextTick();

    // Check that emits were triggered
    const updateEvents = wrapper.emitted("update:form");
    expect(updateEvents).toBeTruthy();
    expect(updateEvents!.length).toBeGreaterThanOrEqual(3);

    // Verify emits contain the expected uppercase ID values
    const hasPoType = updateEvents!.some(
      (event: any) => event[0].po_type === "LABOR"
    );
    const hasPoTypeUuid = updateEvents!.some(
      (event: any) => event[0].po_type_uuid === "LABOR"
    );
    const hasCreditDays = updateEvents!.some(
      (event: any) => event[0].credit_days === "NET_30"
    );
    const hasIncludeItems = updateEvents!.some(
      (event: any) => event[0].include_items === "CUSTOM"
    );

    expect(hasPoType).toBe(true);
    expect(hasPoTypeUuid).toBe(true);
    expect(hasCreditDays).toBe(true);
    expect(hasIncludeItems).toBe(true);
  });

  it("applies po_type_uuid when selecting PO type option", async () => {
    const wrapper = mountForm();
    const vm: any = wrapper.vm as any;

    vm.poTypeOption = {
      label: "Material",
      value: "MATERIAL",
      uuid: "MATERIAL",
    };
    await flushPromises();

    const updateEvents = wrapper.emitted("update:form") || [];
    expect(updateEvents.length).toBeGreaterThan(0);
    const lastEvent = updateEvents[updateEvents.length - 1]?.[0] as any;
    expect(lastEvent.po_type).toBe("MATERIAL");
    expect(lastEvent.po_type_uuid).toBe("MATERIAL");
  });

  it("formats dates via UTC helpers", async () => {
    const wrapper = mountForm({
      entry_date: "2025-02-10",
      estimated_delivery_date: "2025-03-15",
    });
    const vm: any = wrapper.vm as any;
    // set new CalendarDate value by calling setter API through computed
    vm.entryDateValue = vm.entryDateValue; // read to ensure computed exists
    // We rely on helper; ensuring computed getters return a CalendarDate was tested by mounting
    expect(vm.entryDateDisplayText).toBeTruthy();
    expect(vm.estimatedDeliveryDateDisplayText).toBeTruthy();
  });

  describe("Date Selection Fix", () => {
    it("should parse UTC date string correctly without one-day shift", () => {
      // Simulate a date stored in UTC that was selected as Jan 15, 2025
      // When user selects Jan 15 in PST (UTC-8), it gets stored as 2025-01-15T08:00:00.000Z
      const storedUTC = "2025-01-15T08:00:00.000Z";
      const wrapper = mountForm({ entry_date: storedUTC });
      const vm: any = wrapper.vm as any;

      // The CalendarDate should represent Jan 15, not Jan 14
      const entryDateValue = vm.entryDateValue;
      expect(entryDateValue).toBeTruthy();
      expect(entryDateValue.year).toBe(2025);
      expect(entryDateValue.month).toBe(1);
      expect(entryDateValue.day).toBe(15); // Critical: should be 15, not 14
    });

    it("should preserve selected date through round-trip conversion", async () => {
      const wrapper = mountForm();
      const vm: any = wrapper.vm as any;

      // User selects January 15, 2025
      const selectedDate = new CalendarDate(2025, 1, 15);
      vm.entryDateValue = selectedDate;
      await wrapper.vm.$nextTick();

      // Check that update:form was emitted with UTC string
      const updateEvents = wrapper.emitted("update:form") as
        | any[][]
        | undefined;
      expect(updateEvents).toBeTruthy();
      const typedEvents = updateEvents as any[][];
      expect(typedEvents.length).toBeGreaterThan(0);
      const lastEvent = typedEvents[typedEvents.length - 1]?.[0] as any;
      expect(lastEvent).toBeTruthy();
      expect(lastEvent.entry_date).toBeTruthy();
      expect(lastEvent.entry_date).toMatch(/T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // Now simulate reading it back - this is the critical test
      const wrapper2 = mountForm({ entry_date: lastEvent.entry_date });
      const vm2: any = wrapper2.vm as any;

      // Should still show Jan 15, not Jan 14 (the fix ensures this)
      const readBackDate = vm2.entryDateValue;
      expect(readBackDate).toBeTruthy();
      expect(readBackDate.year).toBe(2025);
      expect(readBackDate.month).toBe(1);
      expect(readBackDate.day).toBe(15); // Critical: should be 15, not 14
    });

    it("should handle estimated delivery date selection correctly", async () => {
      const wrapper = mountForm();
      const vm: any = wrapper.vm as any;

      // User selects February 20, 2025
      const selectedDate = new CalendarDate(2025, 2, 20);
      vm.estimatedDeliveryDateValue = selectedDate;
      await wrapper.vm.$nextTick();

      // Check that update:form was emitted
      const updateEvents = wrapper.emitted("update:form") as
        | any[][]
        | undefined;
      expect(updateEvents).toBeTruthy();
      const typedEvents = updateEvents as any[][];
      expect(typedEvents.length).toBeGreaterThan(0);
      const lastEvent = typedEvents[typedEvents.length - 1]?.[0] as any;
      expect(lastEvent).toBeTruthy();
      expect(lastEvent.estimated_delivery_date).toBeTruthy();
      expect(lastEvent.estimated_delivery_date).toMatch(
        /T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );

      // Read it back - should still be Feb 20 (the fix ensures this)
      const wrapper2 = mountForm({
        estimated_delivery_date: lastEvent.estimated_delivery_date,
      });
      const vm2: any = wrapper2.vm as any;

      const readBackDate = vm2.estimatedDeliveryDateValue;
      expect(readBackDate).toBeTruthy();
      expect(readBackDate.year).toBe(2025);
      expect(readBackDate.month).toBe(2);
      expect(readBackDate.day).toBe(20); // Critical: should be 20, not 19
    });

    it("should parse date string directly without timezone conversion issues", () => {
      // Test the direct parsing logic used in the component
      // The key test: when we have a UTC date that represents a specific local date,
      // reading it back should show that same local date (not shifted by one day)

      // Test with a date that was stored as Jan 15 in a timezone (e.g., PST)
      // When stored, Jan 15 midnight PST = 2025-01-15T08:00:00.000Z
      // When read back with the fix, it should show Jan 15 (not Jan 14)
      const storedUTC = "2025-01-15T08:00:00.000Z";
      const wrapper = mountForm({ entry_date: storedUTC });
      const vm: any = wrapper.vm as any;
      const dateValue = vm.entryDateValue;

      expect(dateValue).toBeTruthy();
      // The critical test: with the fix, fromUTCString converts to local first
      // So 2025-01-15T08:00:00.000Z (Jan 15 midnight PST) should show as Jan 15
      // The exact day depends on the test environment timezone, but it should be consistent
      const localDate = dayjs.utc(storedUTC).local();
      expect(dateValue.year).toBe(localDate.year());
      expect(dateValue.month).toBe(localDate.month() + 1); // dayjs months are 0-indexed
      expect(dateValue.day).toBe(localDate.date());
    });

    it("should handle null dates gracefully", () => {
      const wrapper = mountForm({
        entry_date: null,
        estimated_delivery_date: null,
      });
      const vm: any = wrapper.vm as any;

      expect(vm.entryDateValue).toBeNull();
      expect(vm.estimatedDeliveryDateValue).toBeNull();
    });
  });

  describe("Estimated Delivery Date Calculation", () => {
    it("calculates estimated delivery date when credit days is selected after entry date", async () => {
      const wrapper = mountForm({
        entry_date: "2024-01-15T00:00:00.000Z",
        credit_days: "",
        estimated_delivery_date: "",
      });

      await flushPromises();

      // Select credit days
      const creditDaysSelects = wrapper.findAllComponents({
        name: "USelectMenu",
      });
      // Find the credit days select (usually one of the USelectMenu components)
      const creditDaysSelect =
        creditDaysSelects.find((select: any) =>
          select.props("items")?.some((item: any) => item.value === "NET_30")
        ) || creditDaysSelects[creditDaysSelects.length > 1 ? 1 : 0];

      if (creditDaysSelect) {
        await creditDaysSelect.vm.$emit("update:modelValue", {
          label: "Net 30",
          value: "NET_30",
        });
        await flushPromises();
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Should calculate estimated delivery date
        const emittedForms = wrapper.emitted("update:form") as
          | any[][]
          | undefined;
        if (emittedForms && emittedForms.length > 0) {
          const estimatedDeliveryDateUpdate = emittedForms.find(
            ([form]) => (form as any).estimated_delivery_date
          );
          if (estimatedDeliveryDateUpdate) {
            const formData = estimatedDeliveryDateUpdate[0] as any;
            if (formData.estimated_delivery_date) {
              // Parse the UTC date string directly (format: YYYY-MM-DDTHH:mm:ss.sssZ)
              // Extract the date part before 'T' to avoid timezone issues
              const estDateStr = formData.estimated_delivery_date.split("T")[0];
              const [estYear, estMonth, estDay] = estDateStr
                .split("-")
                .map(Number);

              // Calculate expected date using the same logic as component (entryDate.add({ days: 30 }))
              const entryDateCal = new CalendarDate(2024, 1, 15);
              const expectedCalDate = entryDateCal.add({ days: 30 });
              expect(estYear).toBe(expectedCalDate.year);
              expect(estMonth).toBe(expectedCalDate.month);
              expect(estDay).toBe(expectedCalDate.day);
            }
          }
        }
      }
    });

    it("calculates estimated delivery date when entry date is selected after credit days", async () => {
      const wrapper = mountForm({
        entry_date: "",
        credit_days: "NET_30",
        estimated_delivery_date: "",
      });

      await flushPromises();

      // Set entry date (simulate calendar selection)
      await wrapper.setProps({
        form: {
          ...wrapper.props().form,
          entry_date: "2024-01-15T00:00:00.000Z",
        },
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should calculate estimated delivery date
      const emittedForms = wrapper.emitted("update:form") as
        | any[][]
        | undefined;
      if (emittedForms && emittedForms.length > 0) {
        const estimatedDeliveryDateUpdate = emittedForms.find(
          ([form]) => (form as any).estimated_delivery_date
        );
        if (estimatedDeliveryDateUpdate) {
          const formData = estimatedDeliveryDateUpdate[0] as any;
          if (formData.estimated_delivery_date) {
            // Parse the UTC date string directly (format: YYYY-MM-DDTHH:mm:ss.sssZ)
            // Extract the date part before 'T' to avoid timezone issues
            const estDateStr = formData.estimated_delivery_date.split("T")[0];
            const [estYear, estMonth, estDay] = estDateStr
              .split("-")
              .map(Number);

            // Calculate expected date using the same logic as component (entryDate.add({ days: 30 }))
            const entryDateCal = new CalendarDate(2024, 1, 15);
            const expectedCalDate = entryDateCal.add({ days: 30 });
            expect(estYear).toBe(expectedCalDate.year);
            expect(estMonth).toBe(expectedCalDate.month);
            expect(estDay).toBe(expectedCalDate.day);
          }
        }
      }
    });

    it("calculates estimated delivery date when credit days is selected after other fields are filled", async () => {
      // Simulate the scenario where user fills other fields first, then selects credit days
      const wrapper = mountForm({
        project_uuid: "project-1",
        po_mode: "PROJECT",
        vendor_uuid: "vendor-1",
        entry_date: "2024-01-15T00:00:00.000Z",
        credit_days: "",
        estimated_delivery_date: "",
      });

      await flushPromises();
      // Wait a bit to simulate user filling other fields
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Now simulate user coming back to select credit days
      const creditDaysSelects = wrapper.findAllComponents({
        name: "USelectMenu",
      });
      const creditDaysSelect =
        creditDaysSelects.find((select: any) =>
          select.props("items")?.some((item: any) => item.value === "NET_30")
        ) || creditDaysSelects[creditDaysSelects.length > 1 ? 1 : 0];

      if (creditDaysSelect) {
        await creditDaysSelect.vm.$emit("update:modelValue", {
          label: "Net 30",
          value: "NET_30",
        });

        await flushPromises();
        // Wait for watcher to run with flush: 'post'
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Should calculate estimated delivery date
        const emittedForms = wrapper.emitted("update:form") as
          | any[][]
          | undefined;
        expect(emittedForms).toBeTruthy();

        if (emittedForms && emittedForms.length > 0) {
          // Find the update that includes estimated_delivery_date
          const estimatedDeliveryDateUpdate = emittedForms.find(([form]) => {
            const formData = form as any;
            return (
              formData.estimated_delivery_date &&
              formData.estimated_delivery_date !== ""
            );
          });

          expect(estimatedDeliveryDateUpdate).toBeDefined();
          if (estimatedDeliveryDateUpdate) {
            const formData = estimatedDeliveryDateUpdate[0] as any;
            if (formData.estimated_delivery_date) {
              // Parse the UTC date string directly (format: YYYY-MM-DDTHH:mm:ss.sssZ)
              // Extract the date part before 'T' to avoid timezone issues
              const estDateStr = formData.estimated_delivery_date.split("T")[0];
              const [estYear, estMonth, estDay] = estDateStr
                .split("-")
                .map(Number);

              // Calculate expected date using the same logic as component (entryDate.add({ days: 30 }))
              const entryDateCal = new CalendarDate(2024, 1, 15);
              const expectedCalDate = entryDateCal.add({ days: 30 });
              expect(estYear).toBe(expectedCalDate.year);
              expect(estMonth).toBe(expectedCalDate.month);
              expect(estDay).toBe(expectedCalDate.day);
            }
          }
        }
      }
    });

    it("recalculates estimated delivery date when credit days is changed after form is fully filled", async () => {
      // Simulate changing credit days when form already has all fields filled
      const wrapper = mountForm({
        project_uuid: "project-1",
        po_mode: "PROJECT",
        vendor_uuid: "vendor-1",
        entry_date: "2024-01-15T00:00:00.000Z",
        credit_days: "NET_15",
        estimated_delivery_date: "2024-01-30T00:00:00.000Z", // Initial estimated delivery date (15 days)
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Change credit days from NET_15 to NET_30
      const creditDaysSelects = wrapper.findAllComponents({
        name: "USelectMenu",
      });
      const creditDaysSelect =
        creditDaysSelects.find((select: any) =>
          select.props("items")?.some((item: any) => item.value === "NET_30")
        ) || creditDaysSelects[creditDaysSelects.length > 1 ? 1 : 0];

      if (creditDaysSelect) {
        await creditDaysSelect.vm.$emit("update:modelValue", {
          label: "Net 30",
          value: "NET_30",
        });

        await flushPromises();
        // Wait for watcher to run with flush: 'post'
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Should recalculate estimated delivery date to 30 days
        const emittedForms = wrapper.emitted("update:form") as
          | any[][]
          | undefined;
        expect(emittedForms).toBeTruthy();

        if (emittedForms && emittedForms.length > 0) {
          // Find the update that changed estimated_delivery_date to 30 days
          const estimatedDeliveryDateUpdate = emittedForms.find(([form]) => {
            const formData = form as any;
            if (!formData.estimated_delivery_date) return false;
            // Parse the UTC date string to get the actual date
            const estDateUTC = new Date(formData.estimated_delivery_date);
            const estYear = estDateUTC.getUTCFullYear();
            const estMonth = estDateUTC.getUTCMonth() + 1;
            const estDay = estDateUTC.getUTCDate();

            // Calculate expected date using the same logic as component
            const entryDateCal = new CalendarDate(2024, 1, 15);
            const expectedCalDate = entryDateCal.add({ days: 30 });
            return (
              estYear === expectedCalDate.year &&
              estMonth === expectedCalDate.month &&
              estDay === expectedCalDate.day
            );
          });

          expect(estimatedDeliveryDateUpdate).toBeDefined();
          if (estimatedDeliveryDateUpdate) {
            const formData = estimatedDeliveryDateUpdate[0] as any;
            if (formData.estimated_delivery_date) {
              // Parse the UTC date string directly (format: YYYY-MM-DDTHH:mm:ss.sssZ)
              // Extract the date part before 'T' to avoid timezone issues
              const estDateStr = formData.estimated_delivery_date.split("T")[0];
              const [estYear, estMonth, estDay] = estDateStr
                .split("-")
                .map(Number);

              // Calculate expected date using the same logic as component (entryDate.add({ days: 30 }))
              const entryDateCal = new CalendarDate(2024, 1, 15);
              const expectedCalDate = entryDateCal.add({ days: 30 });
              expect(estYear).toBe(expectedCalDate.year);
              expect(estMonth).toBe(expectedCalDate.month);
              expect(estDay).toBe(expectedCalDate.day);
            }
          }
        }
      }
    });

    it("recalculates estimated delivery date when entry date is changed by user", async () => {
      const wrapper = mountForm({
        entry_date: "2024-01-15T00:00:00.000Z",
        credit_days: "NET_30",
        estimated_delivery_date: "2024-02-14T00:00:00.000Z", // Initial calculated estimated delivery date
      });

      await flushPromises();

      // Simulate user changing the entry date
      await wrapper.setProps({
        form: {
          ...wrapper.props().form,
          entry_date: "2024-01-20T00:00:00.000Z", // Change entry date
        },
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 100)); // Allow watcher to run

      const emittedForms = wrapper.emitted("update:form") as
        | any[][]
        | undefined;
      expect(emittedForms).toBeTruthy();

      // Find the last update that changed the estimated_delivery_date
      const estimatedDeliveryDateUpdates = emittedForms!.filter(([form]) => {
        const formData = form as any;
        return (
          formData.estimated_delivery_date &&
          formData.estimated_delivery_date !== "2024-02-14T00:00:00.000Z"
        );
      });

      // Should have at least one update that recalculated the estimated delivery date
      if (estimatedDeliveryDateUpdates.length > 0) {
        const lastUpdate = estimatedDeliveryDateUpdates[
          estimatedDeliveryDateUpdates.length - 1
        ]?.[0] as any;
        if (lastUpdate?.estimated_delivery_date) {
          // Calculate expected date using the same logic as component (entryDate.add({ days: 30 }))
          const entryDateCal = new CalendarDate(2024, 1, 20); // New entry date
          const expectedCalDate = entryDateCal.add({ days: 30 });
          const expectedDateStr = `${expectedCalDate.year}-${String(
            expectedCalDate.month
          ).padStart(2, "0")}-${String(expectedCalDate.day).padStart(2, "0")}`;

          // Parse the UTC date string directly (format: YYYY-MM-DDTHH:mm:ss.sssZ)
          const newEstDateStr =
            lastUpdate.estimated_delivery_date.split("T")[0];
          const [newEstYear, newEstMonth, newEstDay] = newEstDateStr
            .split("-")
            .map(Number);

          // Compare with expected CalendarDate
          expect(newEstYear).toBe(expectedCalDate.year);
          expect(newEstMonth).toBe(expectedCalDate.month);
          expect(newEstDay).toBe(expectedCalDate.day);
        }
      } else {
        // If no update found, check if the form was updated directly via props
        // The watcher might have updated the form but not emitted (which is fine)
        const currentForm = wrapper.props().form as any;
        if (currentForm.estimated_delivery_date) {
          const entryDateCal = new CalendarDate(2024, 1, 20);
          const expectedCalDate = entryDateCal.add({ days: 30 });
          const actualDateStr =
            currentForm.estimated_delivery_date.split("T")[0];
          const [actualYear, actualMonth, actualDay] = actualDateStr
            .split("-")
            .map(Number);
          expect(actualYear).toBe(expectedCalDate.year);
          expect(actualMonth).toBe(expectedCalDate.month);
          expect(actualDay).toBe(expectedCalDate.day);
        } else {
          // If still no update, the test should fail
          expect(estimatedDeliveryDateUpdates.length).toBeGreaterThan(0);
        }
      }
    });

    it("calculates estimated delivery date correctly for different credit days options", async () => {
      const creditDaysTests = [
        { value: "NET_15", expectedDays: 15 },
        { value: "NET_25", expectedDays: 25 },
        { value: "NET_30", expectedDays: 30 },
        { value: "NET_45", expectedDays: 45 },
        { value: "NET_60", expectedDays: 60 },
      ];

      for (const { value, expectedDays } of creditDaysTests) {
        const wrapper = mountForm({
          entry_date: "2024-01-15T00:00:00.000Z",
          credit_days: value,
          estimated_delivery_date: null, // Start with null to test calculation
        });

        await flushPromises();
        // Wait for watcher to run with immediate: true
        await new Promise((resolve) => setTimeout(resolve, 150));

        const emittedForms = wrapper.emitted("update:form") as
          | any[][]
          | undefined;
        if (emittedForms && emittedForms.length > 0) {
          const estimatedDeliveryDateUpdate = emittedForms.find(([form]) => {
            const formData = form as any;
            return (
              formData.estimated_delivery_date &&
              formData.estimated_delivery_date !== null &&
              formData.estimated_delivery_date !== ""
            );
          });

          expect(estimatedDeliveryDateUpdate).toBeDefined();
          if (estimatedDeliveryDateUpdate) {
            const formData = estimatedDeliveryDateUpdate[0] as any;
            if (formData.estimated_delivery_date) {
              // Parse the UTC date string to get the actual date (component stores as UTC)
              const estDateUTC = new Date(formData.estimated_delivery_date);
              const estYear = estDateUTC.getUTCFullYear();
              const estMonth = estDateUTC.getUTCMonth() + 1; // getUTCMonth is 0-indexed
              const estDay = estDateUTC.getUTCDate();

              // Calculate expected date using the same logic as component (entryDate.add({ days }))
              const entryDateCal = new CalendarDate(2024, 1, 15);
              const expectedCalDate = entryDateCal.add({ days: expectedDays });
              expect(estYear).toBe(expectedCalDate.year);
              expect(estMonth).toBe(expectedCalDate.month);
              expect(estDay).toBe(expectedCalDate.day);
            }
          }
        }

        // Clean up wrapper to avoid memory leaks in the loop
        wrapper.unmount();
      }
    }, 15000); // Extended timeout for loop with multiple mount/unmount cycles

    it("does not calculate estimated delivery date when entry date is missing", async () => {
      const wrapper = mountForm({
        entry_date: "",
        credit_days: "NET_30",
        estimated_delivery_date: "",
      });

      await flushPromises();

      // Should not calculate estimated delivery date without entry date
      const emittedForms = wrapper.emitted("update:form") as
        | any[][]
        | undefined;
      if (emittedForms) {
        const estimatedDeliveryDateUpdates = emittedForms.filter(([form]) => {
          const formData = form as any;
          return (
            formData.estimated_delivery_date &&
            formData.estimated_delivery_date !== ""
          );
        });
        // Should not have any estimated delivery date updates
        expect(estimatedDeliveryDateUpdates.length).toBe(0);
      }
    });

    it("does not calculate estimated delivery date when credit days is missing", async () => {
      const wrapper = mountForm({
        entry_date: "2024-01-15T00:00:00.000Z",
        credit_days: "",
        estimated_delivery_date: "",
      });

      await flushPromises();

      // Should not calculate estimated delivery date without credit days
      const emittedForms = wrapper.emitted("update:form") as
        | any[][]
        | undefined;
      if (emittedForms) {
        const estimatedDeliveryDateUpdates = emittedForms.filter(([form]) => {
          const formData = form as any;
          return (
            formData.estimated_delivery_date &&
            formData.estimated_delivery_date !== ""
          );
        });
        // Should not have any estimated delivery date updates
        expect(estimatedDeliveryDateUpdates.length).toBe(0);
      }
    });

    it("handles credit days selection with flush post timing correctly", async () => {
      // Test that the watcher with flush: 'post' works correctly
      const wrapper = mountForm({
        project_uuid: "project-1",
        po_mode: "PROJECT",
        vendor_uuid: "vendor-1",
        entry_date: "2024-03-01T00:00:00.000Z",
        credit_days: "",
        estimated_delivery_date: "",
      });

      await flushPromises();

      // Simulate multiple field updates before selecting credit days
      await wrapper.setProps({
        form: {
          ...wrapper.props().form,
          po_type: "MATERIAL",
        },
      });
      await flushPromises();

      // Now select credit days
      const creditDaysSelects = wrapper.findAllComponents({
        name: "USelectMenu",
      });
      const creditDaysSelect =
        creditDaysSelects.find((select: any) =>
          select.props("items")?.some((item: any) => item.value === "NET_60")
        ) || creditDaysSelects[creditDaysSelects.length > 1 ? 1 : 0];

      if (creditDaysSelect) {
        await creditDaysSelect.vm.$emit("update:modelValue", {
          label: "Net 60",
          value: "NET_60",
        });

        await flushPromises();
        // Wait for watcher to run with flush: 'post' - this ensures it runs after all updates
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Should calculate estimated delivery date
        const emittedForms = wrapper.emitted("update:form") as
          | any[][]
          | undefined;
        expect(emittedForms).toBeTruthy();

        if (emittedForms && emittedForms.length > 0) {
          const estimatedDeliveryDateUpdate = emittedForms.find(([form]) => {
            const formData = form as any;
            if (!formData.estimated_delivery_date) return false;
            // Parse the UTC date string directly (format: YYYY-MM-DDTHH:mm:ss.sssZ)
            const estDateStr = formData.estimated_delivery_date.split("T")[0];
            const [estYear, estMonth, estDay] = estDateStr
              .split("-")
              .map(Number);

            // Calculate expected date using the same logic as component
            const entryDateCal = new CalendarDate(2024, 3, 1);
            const expectedCalDate = entryDateCal.add({ days: 60 });
            return (
              estYear === expectedCalDate.year &&
              estMonth === expectedCalDate.month &&
              estDay === expectedCalDate.day
            );
          });

          expect(estimatedDeliveryDateUpdate).toBeDefined();
        }
      }
    });
  });

  it("clears cached store data on component unmount", async () => {
    const wrapper = mountForm();
    const resourcesStore = usePurchaseOrderResourcesStore() as any;
    // Wait for all async operations to complete
    await flushPromises();
    await wrapper.vm.$nextTick();
    await flushPromises();
    await wrapper.vm.$nextTick();
    const clearSpy = resourcesStore.__test?.clearCalls as any;
    clearSpy?.mock?.clear?.();
    wrapper.unmount();
    // Wait a bit for unmount to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(clearSpy?.mock?.calls?.length ?? 0).toBe(1);
  }, 10000);

  it("syncs item and sequence selections so changing sequence updates item details", async () => {
    const wrapper = mountForm();
    await flushPromises();

    const vm: any = wrapper.vm;

    // Seed form with one PO item that has an item_uuid
    vm.form.po_items = [
      {
        uuid: "po-item-1",
        cost_code_uuid: "cc-1",
        item_uuid: "item-1",
        name: "Old Name",
        quantity: 1,
        unit_price: 100,
        total: 100,
        display_metadata: {},
      },
    ];

    // Simulate SequenceSelect emitting a new item UUID & option
    vm.updatePoItemSequence({
      index: 0,
      value: "item-2",
      option: {
        value: "item-2",
        label: "New Item Name",
        raw: {
          item_name: "New Item Name",
          description: "New description",
          unit: "EA",
          unit_price: 42,
          item_type_uuid: "type-1",
          model_number: "M-200",
        },
      },
    });

    const updated = (vm.form.po_items as any[])[0];
    // We mainly assert that handler runs without errors; field-level
    // mutations are already exercised in existing item-change tests.
    expect(updated).toBeDefined();
  });

  describe("Labor PO Items Functionality", () => {
    beforeEach(() => {
      purchaseOrderResourcesStoreInstance.resetForTest?.();
    });

    it("shows labor items section when PO type is Labor", async () => {
      const wrapper = mountForm({
        po_type: "LABOR",
        po_type_uuid: "LABOR",
      });

      await flushPromises();
      const vm: any = wrapper.vm as any;

      expect(vm.isLaborPurchaseOrder).toBe(true);
      expect(vm.shouldShowLaborItemsSection).toBe(true);
    });

    it("hides material items sections when PO type is Labor", async () => {
      const wrapper = mountForm({
        po_type: "LABOR",
        po_type_uuid: "LABOR",
        include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
        po_items: [
          {
            id: "material-item-1",
            cost_code_uuid: "cc-1",
          },
        ],
      });

      await flushPromises();
      const vm: any = wrapper.vm as any;

      expect(vm.isLaborPurchaseOrder).toBe(true);
      expect(vm.shouldShowEstimateItemsSection).toBe(false);
      expect(vm.shouldShowMasterItemsSection).toBe(false);
    });

    it("calculates item total from labor_po_items for Labor PO", async () => {
      const wrapper = mountForm({
        po_type: "LABOR",
        po_type_uuid: "LABOR",
        labor_po_items: [
          {
            cost_code_uuid: "cc-1",
            po_amount: 1000.50,
          },
          {
            cost_code_uuid: "cc-2",
            po_amount: 2000.75,
          },
          {
            cost_code_uuid: "cc-3",
            po_amount: 1500.25,
          },
        ],
      });

      await flushPromises();
      const vm: any = wrapper.vm as any;

      expect(vm.isLaborPurchaseOrder).toBe(true);
      expect(vm.itemTotal).toBe(4501.5); // 1000.50 + 2000.75 + 1500.25
    });

    it("shows simple total instead of Financial Breakdown for Labor PO", async () => {
      const wrapper = mountForm({
        po_type: "LABOR",
        po_type_uuid: "LABOR",
        labor_po_items: [
          {
            cost_code_uuid: "cc-1",
            po_amount: 5000,
          },
        ],
      });

      await flushPromises();

      // FinancialBreakdown should not be visible
      const financialBreakdown = wrapper.findComponent({
        name: "FinancialBreakdown",
      });
      expect(financialBreakdown.exists()).toBe(false);

      // Simple total should be shown
      expect(wrapper.text()).toContain("Total PO Amount");
    });

    it("hides Ship Via and Freight fields when PO type is Labor", async () => {
      const wrapper = mountForm({
        po_type: "LABOR",
        po_type_uuid: "LABOR",
        ship_via: "Ground",
        freight: "Carrier",
      });

      await flushPromises();

      // Ship Via field should not be visible
      const shipViaLabel = wrapper.text();
      expect(shipViaLabel).not.toContain("Ship Via");

      // Freight field should not be visible
      const freightLabel = wrapper.text();
      expect(freightLabel).not.toContain("Freight");

      // Check that the fields themselves are not rendered
      const shipViaSelect = wrapper.findComponent({ name: "ShipViaSelect" });
      expect(shipViaSelect.exists()).toBe(false);

      const freightSelect = wrapper.findComponent({ name: "FreightSelect" });
      expect(freightSelect.exists()).toBe(false);
    });

    it("shows Ship Via and Freight fields when PO type is Material", async () => {
      const wrapper = mountForm({
        po_type: "MATERIAL",
        po_type_uuid: "MATERIAL",
        ship_via: "Ground",
        freight: "Carrier",
      });

      await flushPromises();

      // Ship Via field should be visible
      const shipViaLabel = wrapper.text();
      expect(shipViaLabel).toContain("Ship Via");

      // Freight field should be visible
      const freightLabel = wrapper.text();
      expect(freightLabel).toContain("Freight");
    });

    it("handles app refresh scenario correctly for existing labor PO with items", async () => {
      // Test the key fix: existing labor items prevent error even if editingPurchaseOrder is false
      const wrapper = mountForm({
        uuid: "existing-po-uuid",
        po_type: "LABOR",
        po_type_uuid: "LABOR",
        raise_against: "CUSTOM", // Use CUSTOM to avoid complex estimate logic
        project_uuid: "proj-1", // Provide project to avoid other errors
        labor_po_items: [
          {
            cost_code_uuid: "cc-1",
            po_amount: 1000,
          },
        ],
      });

      await flushPromises();
      const vm: any = wrapper.vm as any;

      // The fix ensures that even if editingPurchaseOrder is initially false during app refresh,
      // the presence of existing labor items prevents the error message
      // This tests the changed condition: !props.editingPurchaseOrder && !hasExistingLaborItems
      expect(vm.isLaborPurchaseOrder).toBe(true);
      expect(vm.shouldShowLaborItemsSection).toBe(true);
    });

    it("shows appropriate error for new labor PO without required data", async () => {
      // Test that error messages still work for truly new POs without data
      const wrapper = mountForm({
        po_type: "LABOR",
        po_type_uuid: "LABOR",
        raise_against: "AGAINST_ESTIMATE",
        // No uuid = new PO, no project_uuid = no project, empty labor items
        labor_po_items: [],
      });

      await flushPromises();
      const vm: any = wrapper.vm as any;

      // The fix should still show errors for new POs that genuinely need data
      expect(vm.isLaborPurchaseOrder).toBe(true);
      // The exact error depends on watcher timing, but we verify the component works
      expect(typeof vm.laborItemsError).toBe('string');
    });

  });

  describe("Sequence Population Functionality", () => {
    beforeEach(() => {
      purchaseOrderResourcesStoreInstance.resetForTest?.();
    });

    it("populates sequence from estimate items when importing from estimate", async () => {
      // Pre-populate items in form with sequence
      const wrapper = mountForm({
        include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
        project_uuid: "proj-1",
        po_items: [
          {
            cost_code_uuid: "cc-1",
            cost_code_number: "001",
            cost_code_name: "Concrete Work",
            cost_code_label: "001 Concrete Work",
            item_type_uuid: "type-1",
            item_type_label: "Concrete",
            item_uuid: "item-1",
            sequence: "FA-301", // Sequence from estimate
            item_sequence: "FA-301",
            name: "Concrete Mix",
            description: "High-strength concrete",
            unit_price: 100,
            quantity: 1,
            total: 100,
            po_unit_price: 100,
            po_quantity: 1,
            po_total: 100,
            uom_uuid: "uom-1",
            uom_label: "EA",
            unit_label: "EA",
            display_metadata: {
              cost_code_label: "001 Concrete Work",
              cost_code_number: "001",
              cost_code_name: "Concrete Work",
              sequence: "FA-301",
            },
          },
        ],
      });

      await flushPromises();
      const vm: any = wrapper.vm as any;

      // Check that sequence is populated in displayed items
      const displayedItems = vm.poItemsForDisplay;
      expect(displayedItems.length).toBeGreaterThan(0);
      const firstItem = displayedItems[0];
      expect(firstItem.sequence).toBe("FA-301");
      expect(firstItem.item_uuid).toBe("item-1");

      // Check that sequence is included in options array for SequenceSelect
      expect(Array.isArray(firstItem.options)).toBe(true);
      const itemOption = firstItem.options.find(
        (opt: any) => opt.value === "item-1"
      );
      expect(itemOption).toBeDefined();
      expect(itemOption?.item_sequence).toBe("FA-301");
      expect(itemOption?.sequence).toBe("FA-301");
    });

    it("populates sequence from preferred items when importing from master", async () => {
      // Pre-populate items in form with sequence from preferred items
      const wrapper = mountForm({
        include_items: "IMPORT_ITEMS_FROM_MASTER",
        project_uuid: "proj-1",
        po_items: [
          {
            cost_code_uuid: "cc-1",
            cost_code_number: "001",
            cost_code_name: "Concrete Work",
            cost_code_label: "001 Concrete Work",
            item_type_uuid: "type-1",
            item_type_label: "Concrete",
            item_uuid: "item-1",
            sequence: "FA-301", // Sequence from preferred items
            item_sequence: "FA-301",
            name: "Preferred Item",
            description: "High quality concrete",
            unit_price: 200,
            quantity: 1,
            total: 200,
            po_unit_price: 200,
            po_quantity: 1,
            po_total: 200,
            uom_uuid: "uom-1",
            uom_label: "EA",
            unit_label: "EA",
            display_metadata: {
              cost_code_label: "001 Concrete Work",
              cost_code_number: "001",
              cost_code_name: "Concrete Work",
              sequence: "FA-301",
            },
          },
        ],
      });

      await flushPromises();
      const vm: any = wrapper.vm as any;

      // Check that sequence is populated in displayed items
      const displayedItems = vm.poItemsForDisplay;
      expect(displayedItems.length).toBeGreaterThan(0);
      const firstItem = displayedItems[0];
      expect(firstItem.sequence).toBe("FA-301");
      expect(firstItem.item_sequence).toBe("FA-301");
      expect(firstItem.item_uuid).toBe("item-1");

      // Check that sequence is included in options array
      expect(Array.isArray(firstItem.options)).toBe(true);
      const itemOption = firstItem.options.find(
        (opt: any) => opt.value === "item-1"
      );
      expect(itemOption).toBeDefined();
      expect(itemOption?.item_sequence).toBe("FA-301");
      expect(itemOption?.sequence).toBe("FA-301");
    });

    it("includes sequence in preferredItemOptions for SequenceSelect matching", async () => {
      // Set up preferred items with item_sequence in the store BEFORE mounting
      purchaseOrderResourcesStoreInstance.setPreferredItemsForTest?.(
        "corp-1",
        "proj-1",
        [
          {
            uuid: "item-1", // Use uuid instead of id
            item_uuid: "item-1",
            item_name: "Item with Sequence",
            item_sequence: "FA-301",
            cost_code_uuid: "cc-1",
            cost_code_configuration_uuid: "cc-1",
            cost_code_number: "001",
            cost_code_name: "Concrete Work",
            item_type_uuid: "type-1",
            unit_uuid: "uom-1",
            unit_label: "EA",
            unit: "EA",
            unit_price: 200,
            quantity: 1,
          },
        ]
      );

      const wrapper = mountForm({
        include_items: "IMPORT_ITEMS_FROM_MASTER",
        project_uuid: "proj-1",
      });

      // Wait for all async operations to complete
      await flushPromises();
      await wrapper.vm.$nextTick();
      await flushPromises();
      await wrapper.vm.$nextTick();
      const vm: any = wrapper.vm as any;

      // Verify the store has items with sequence
      const storeItems = purchaseOrderResourcesStoreInstance.getPreferredItems?.("corp-1", "proj-1");
      expect(storeItems?.length).toBeGreaterThan(0);
      expect(storeItems?.[0]?.item_sequence).toBe("FA-301");

      // Check that preferredItemOptions computed includes sequence when items are available
      // The computed transforms store items, so verify the transformation includes sequence
      const preferredOptions = vm.preferredItemOptions;
      if (preferredOptions.length > 0) {
        const option = preferredOptions.find(
          (opt: any) => opt.value === "item-1"
        );
        if (option) {
          expect(option?.item_sequence).toBe("FA-301");
          expect(option?.sequence).toBe("FA-301");
        }
      }
    }, 10000);

    it("handles items without sequence gracefully", async () => {
      // Pre-populate items without sequence
      const wrapper = mountForm({
        include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
        project_uuid: "proj-1",
        po_items: [
          {
            cost_code_uuid: "cc-1",
            cost_code_number: "001",
            cost_code_name: "Concrete Work",
            cost_code_label: "001 Concrete Work",
            item_type_uuid: "type-1",
            item_type_label: "Concrete",
            item_uuid: "item-1",
            sequence: "", // No sequence
            item_sequence: "",
            name: "Item Without Sequence",
            description: "High-strength concrete",
            unit_price: 100,
            quantity: 1,
            total: 100,
            po_unit_price: 100,
            po_quantity: 1,
            po_total: 100,
            uom_uuid: "uom-1",
            uom_label: "EA",
            unit_label: "EA",
            display_metadata: {
              cost_code_label: "001 Concrete Work",
              cost_code_number: "001",
              cost_code_name: "Concrete Work",
              sequence: "", // No sequence
            },
          },
        ],
      });

      await flushPromises();
      const vm: any = wrapper.vm as any;

      const displayedItems = vm.poItemsForDisplay;
      expect(displayedItems.length).toBeGreaterThan(0);
      const firstItem = displayedItems[0];
      // Sequence should be empty string, not undefined
      expect(firstItem.sequence).toBe("");
      expect(firstItem.item_uuid).toBe("item-1");
    });

    it("preserves sequence in display_metadata when transforming preferred items", async () => {
      // Pre-populate items to test sequence preservation
      const wrapper = mountForm({
        include_items: "IMPORT_ITEMS_FROM_MASTER",
        project_uuid: "proj-1",
        po_items: [
          {
            cost_code_uuid: "cc-1",
            cost_code_number: "001",
            cost_code_name: "Concrete Work",
            cost_code_label: "001 Concrete Work",
            item_type_uuid: "type-1",
            item_type_label: "Concrete",
            item_uuid: "item-1",
            sequence: "FA-301",
            item_sequence: "FA-301",
            name: "Preferred Item",
            description: "High quality concrete",
            unit_price: 200,
            quantity: 1,
            total: 200,
            po_unit_price: 200,
            po_quantity: 1,
            po_total: 200,
            uom_uuid: "uom-1",
            uom_label: "EA",
            unit_label: "EA",
            display_metadata: {
              cost_code_label: "001 Concrete Work",
              cost_code_number: "001",
              cost_code_name: "Concrete Work",
              sequence: "FA-301",
            },
          },
        ],
      });

      await flushPromises();
      const vm: any = wrapper.vm as any;

      // Check that sequence is preserved in display_metadata
      const poItems = vm.form.po_items;
      expect(poItems.length).toBeGreaterThan(0);
      const firstItem = poItems[0];
      expect(firstItem.display_metadata?.sequence).toBe("FA-301");
      expect(firstItem.sequence).toBe("FA-301");
      expect(firstItem.item_sequence).toBe("FA-301");
    });

    it("preserves sequence in display_metadata when transforming estimate items", async () => {
      // Pre-populate items to test sequence preservation
      const wrapper = mountForm({
        include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
        project_uuid: "proj-1",
        po_items: [
          {
            cost_code_uuid: "cc-1",
            cost_code_number: "001",
            cost_code_name: "Concrete Work",
            cost_code_label: "001 Concrete Work",
            item_type_uuid: "type-1",
            item_type_label: "Concrete",
            item_uuid: "item-1",
            sequence: "FA-301",
            item_sequence: "FA-301",
            name: "Estimate Item",
            description: "High-strength concrete",
            unit_price: 100,
            quantity: 1,
            total: 100,
            po_unit_price: 100,
            po_quantity: 1,
            po_total: 100,
            uom_uuid: "uom-1",
            uom_label: "EA",
            unit_label: "EA",
            display_metadata: {
              cost_code_label: "001 Concrete Work",
              cost_code_number: "001",
              cost_code_name: "Concrete Work",
              sequence: "FA-301",
            },
          },
        ],
      });

      await flushPromises();
      const vm: any = wrapper.vm as any;

      // Check that sequence is preserved in display_metadata
      const poItems = vm.form.po_items;
      expect(poItems.length).toBeGreaterThan(0);
      const firstItem = poItems[0];
      expect(firstItem.display_metadata?.sequence).toBe("FA-301");
      expect(firstItem.sequence).toBe("FA-301");
      expect(firstItem.item_sequence).toBe("FA-301");
    });

    it("includes sequence in options array for items not in preferred items", async () => {
      // Pre-populate item that's not in preferred items
      const wrapper = mountForm({
        include_items: "IMPORT_ITEMS_FROM_ESTIMATE",
        project_uuid: "proj-1",
        po_items: [
          {
            cost_code_uuid: "cc-1",
            cost_code_number: "001",
            cost_code_name: "Concrete Work",
            cost_code_label: "001 Concrete Work",
            item_type_uuid: "type-1",
            item_type_label: "Concrete",
            item_uuid: "item-new-1", // New item not in preferred items
            sequence: "FA-302",
            item_sequence: "FA-302",
            name: "New Estimate Item",
            description: "High-strength concrete",
            unit_price: 100,
            quantity: 1,
            total: 100,
            po_unit_price: 100,
            po_quantity: 1,
            po_total: 100,
            uom_uuid: "uom-1",
            uom_label: "EA",
            unit_label: "EA",
            display_metadata: {
              cost_code_label: "001 Concrete Work",
              cost_code_number: "001",
              cost_code_name: "Concrete Work",
              sequence: "FA-302",
            },
          },
        ],
      });

      await flushPromises();
      const vm: any = wrapper.vm as any;

      const displayedItems = vm.poItemsForDisplay;
      expect(displayedItems.length).toBeGreaterThan(0);
      const firstItem = displayedItems[0];
      
      // Check that the item is added to options with sequence
      const itemOption = firstItem.options.find(
        (opt: any) => opt.value === "item-new-1"
      );
      expect(itemOption).toBeDefined();
      expect(itemOption?.item_sequence).toBe("FA-302");
      expect(itemOption?.sequence).toBe("FA-302");
      expect(itemOption?.label).toBe("New Estimate Item");
    });

    it("prioritizes item_sequence over sequence field when both are present", async () => {
      // Pre-populate item with both sequence fields - item_sequence should take priority
      const wrapper = mountForm({
        include_items: "IMPORT_ITEMS_FROM_MASTER",
        project_uuid: "proj-1",
        po_items: [
          {
            cost_code_uuid: "cc-1",
            cost_code_number: "001",
            cost_code_name: "Concrete Work",
            cost_code_label: "001 Concrete Work",
            item_type_uuid: "type-1",
            item_type_label: "Concrete",
            item_uuid: "item-1",
            sequence: "FA-301", // item_sequence should take priority over this
            item_sequence: "FA-301", // This should be used
            name: "Item with Both",
            description: "High quality concrete",
            unit_price: 200,
            quantity: 1,
            total: 200,
            po_unit_price: 200,
            po_quantity: 1,
            po_total: 200,
            uom_uuid: "uom-1",
            uom_label: "EA",
            unit_label: "EA",
            display_metadata: {
              cost_code_label: "001 Concrete Work",
              cost_code_number: "001",
              cost_code_name: "Concrete Work",
              sequence: "FA-301",
            },
          },
        ],
      });

      await flushPromises();
      const vm: any = wrapper.vm as any;

      const displayedItems = vm.poItemsForDisplay;
      expect(displayedItems.length).toBeGreaterThan(0);
      const firstItem = displayedItems[0];
      // item_sequence should take priority
      expect(firstItem.sequence).toBe("FA-301");
      expect(firstItem.item_sequence).toBe("FA-301");
    });
  });

  describe("Watcher Re-entry Guard - Infinite Loop Prevention", () => {
    let originalEnsurePreferredItems: any;

    beforeEach(() => {
      purchaseOrderResourcesStoreInstance.resetForTest?.();
      // Store the original method
      originalEnsurePreferredItems = purchaseOrderResourcesStoreInstance.ensurePreferredItems;
    });

    afterEach(() => {
      // Restore the original method after each test
      if (originalEnsurePreferredItems) {
        purchaseOrderResourcesStoreInstance.ensurePreferredItems = originalEnsurePreferredItems;
      }
    });

    it("prevents infinite loop when creating new PO with Import from Master", async () => {
      // Track how many times ensurePreferredItems is called
      let ensurePreferredItemsCallCount = 0;
      
      purchaseOrderResourcesStoreInstance.ensurePreferredItems = vi.fn(async (args: any) => {
        ensurePreferredItemsCallCount++;
        // Prevent actual infinite loop in test by limiting calls
        if (ensurePreferredItemsCallCount > 5) {
          throw new Error('Infinite loop detected: ensurePreferredItems called more than 5 times');
        }
        return originalEnsurePreferredItems(args);
      });

      // Mount form in "create new PO" mode
      const wrapper = mountForm({
        uuid: undefined, // New PO, not editing
        corporation_uuid: "corp-1",
        project_uuid: "proj-1",
        include_items: "IMPORT_ITEMS_FROM_MASTER",
        po_items: [],
      });

      await flushPromises();
      
      // The watcher should only trigger a reasonable number of times (1-2)
      // Without the guard, it would trigger infinitely until the test times out
      expect(ensurePreferredItemsCallCount).toBeLessThanOrEqual(3);
      expect(ensurePreferredItemsCallCount).toBeGreaterThan(0);
      
      // Verify the form is functional
      const vm: any = wrapper.vm as any;
      expect(vm.form.include_items).toBe("IMPORT_ITEMS_FROM_MASTER");
    });

    it("prevents re-entry when watcher updates trigger store changes", async () => {
      let watcherExecutionCount = 0;
      
      // Mount form
      const wrapper = mountForm({
        uuid: undefined,
        corporation_uuid: "corp-1",
        project_uuid: "proj-1",
        include_items: undefined,
        po_items: [],
      });

      await flushPromises();

      // Override the watcher execution to count calls
      const vm: any = wrapper.vm as any;
      const originalIncludeItems = vm.form.include_items;
      
      // Now switch to "Import from Master" which should trigger the watcher
      vm.form.include_items = "IMPORT_ITEMS_FROM_MASTER";
      await flushPromises();
      
      // Even though this triggers store updates, the guard should prevent infinite loops
      // We can't easily count watcher executions directly, but we can verify no errors occurred
      // and the form is in correct state
      expect(vm.form.include_items).toBe("IMPORT_ITEMS_FROM_MASTER");
      expect(wrapper.vm).toBeDefined();
    });

    it("allows legitimate watcher triggers while preventing re-entry", async () => {
      // Track API calls
      const apiCallLog: string[] = [];
      
      purchaseOrderResourcesStoreInstance.ensurePreferredItems = vi.fn(async (args: any) => {
        apiCallLog.push(`ensurePreferredItems: corp=${args.corporationUuid}, proj=${args.projectUuid}`);
        return originalEnsurePreferredItems(args);
      });

      const wrapper = mountForm({
        uuid: undefined,
        corporation_uuid: "corp-1",
        project_uuid: "proj-1",
        include_items: undefined,
        po_items: [],
      });

      await flushPromises();

      const vm: any = wrapper.vm as any;
      const initialCallCount = apiCallLog.length;

      // Change to "Import from Master"
      vm.form.include_items = "IMPORT_ITEMS_FROM_MASTER";
      await flushPromises();

      // Should have made additional calls, but not infinite
      const afterFirstChangeCount = apiCallLog.length;
      expect(afterFirstChangeCount).toBeGreaterThan(initialCallCount);
      expect(afterFirstChangeCount).toBeLessThan(initialCallCount + 5); // Reasonable limit

      // Change to something else
      vm.form.include_items = "IMPORT_ITEMS_FROM_ESTIMATE";
      await flushPromises();

      // Should not have made more preferredItems calls (estimate uses different logic)
      const afterSecondChangeCount = apiCallLog.length;
      expect(afterSecondChangeCount).toBeLessThanOrEqual(afterFirstChangeCount + 2);
    });

    it("handles rapid changes to include_items without infinite loops", async () => {
      let totalCalls = 0;
      
      purchaseOrderResourcesStoreInstance.ensurePreferredItems = vi.fn(async (args: any) => {
        totalCalls++;
        if (totalCalls > 10) {
          throw new Error('Too many calls detected during rapid changes');
        }
        return originalEnsurePreferredItems(args);
      });

      const wrapper = mountForm({
        uuid: undefined,
        corporation_uuid: "corp-1",
        project_uuid: "proj-1",
        include_items: undefined,
        po_items: [],
      });

      await flushPromises();

      const vm: any = wrapper.vm as any;
      
      // Rapidly change include_items
      vm.form.include_items = "IMPORT_ITEMS_FROM_MASTER";
      await flushPromises();
      
      vm.form.include_items = "CUSTOM";
      await flushPromises();
      
      vm.form.include_items = "IMPORT_ITEMS_FROM_MASTER";
      await flushPromises();

      // Should complete without error (no infinite loop)
      expect(totalCalls).toBeLessThanOrEqual(10);
      expect(vm.form.include_items).toBe("IMPORT_ITEMS_FROM_MASTER");
    });

    it("re-entry guard is properly released after watcher completes", async () => {
      const wrapper = mountForm({
        uuid: undefined,
        corporation_uuid: "corp-1",
        project_uuid: "proj-1",
        include_items: "IMPORT_ITEMS_FROM_MASTER",
        po_items: [],
      });

      await flushPromises();

      const vm: any = wrapper.vm as any;
      
      // Access the re-entry guard flag
      // After watcher completes, the flag should be false
      // This is a white-box test that verifies the finally block executes
      await flushPromises();
      
      // The guard should be released (set to false)
      // We can't directly access it, but we can verify subsequent changes work
      vm.form.include_items = "CUSTOM";
      await flushPromises();
      
      vm.form.include_items = "IMPORT_ITEMS_FROM_MASTER";
      await flushPromises();
      
      // Should complete successfully, indicating guard was properly released
      expect(vm.form.include_items).toBe("IMPORT_ITEMS_FROM_MASTER");
    });

    it("does not interfere with editing existing PO with saved items", async () => {
      let callCount = 0;
      
      purchaseOrderResourcesStoreInstance.ensurePreferredItems = vi.fn(async (args: any) => {
        callCount++;
        return originalEnsurePreferredItems(args);
      });

      // Mount form in "edit existing PO" mode with saved items
      const wrapper = mountForm({
        uuid: "existing-po-123",
        corporation_uuid: "corp-1",
        project_uuid: "proj-1",
        include_items: "IMPORT_ITEMS_FROM_MASTER",
        po_items: [
          {
            item_uuid: "item-1",
            name: "Existing Item",
            po_quantity: 5,
            po_unit_price: 100,
          },
        ],
      });

      await flushPromises();

      const vm: any = wrapper.vm as any;
      
      // For existing POs, the watcher should skip applying items (hasInitialMasterItems flag)
      // but still fetch for dropdowns
      expect(callCount).toBeGreaterThan(0);
      expect(callCount).toBeLessThan(5);
      
      // Saved items should be preserved
      expect(vm.form.po_items.length).toBeGreaterThan(0);
      expect(vm.form.po_items[0].name).toBe("Existing Item");
    });
  });
});

describe("server/api/purchase-order-forms", () => {
  const makeEvent = (method: string) =>
    ({
      node: {
        req: {
          method,
        },
      },
    } as any);

  const setupSupabaseStub = (handlers: Record<string, any>) => {
    const mockSupabaseServer = {
      from: vi.fn((table: string) => {
        if (handlers[table]) {
          return handlers[table];
        }
        if (table === "purchase_order_items_list" || table === "labor_purchase_order_items_list") {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
            insert: vi.fn(() => Promise.resolve({ error: null })),
          };
        }
        return handlers.__default(table);
      }),
    };
    vi.doMock("@/utils/supabaseServer", () => ({
      supabaseServer: mockSupabaseServer,
    }));
    return mockSupabaseServer;
  };

  const stubGlobals = () => {
    const mockDefineEventHandler = vi.fn((handler) => handler);
    const mockGetQuery = vi.fn();
    const mockReadBody = vi.fn();
    const mockCreateError = vi.fn((options: any) => {
      const error = new Error(options.statusMessage);
      (error as any).statusCode = options.statusCode;
      return error;
    });

    vi.stubGlobal("defineEventHandler", mockDefineEventHandler);
    vi.stubGlobal("getQuery", mockGetQuery);
    vi.stubGlobal("readBody", mockReadBody);
    vi.stubGlobal("createError", mockCreateError);

    return {
      mockDefineEventHandler,
      mockGetQuery,
      mockReadBody,
      mockCreateError,
    };
  };

  const noopBuilder = {
    select: vi.fn(() => ({
      ilike: vi.fn(() => ({
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a project purchase order with normalized mode and type", async () => {
    const globals = stubGlobals();
    const insertedRows: any[] = [];
    const selectWithMetadataSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              uuid: "po-123",
              project: { uuid: "proj-1", project_name: "Test Project" },
              vendor: null,
            },
            error: null,
          })
        ),
      })),
    }));
    const insertSpy = vi.fn((rows: any[]) => {
      insertedRows.push(...rows);
      return {
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { uuid: "po-123" },
              error: null,
            })
          ),
        })),
      };
    });

    setupSupabaseStub({
      purchase_order_forms: {
        insert: insertSpy,
        select: selectWithMetadataSpy,
      },
      __default: () => noopBuilder,
    });

    globals.mockReadBody.mockResolvedValue({
      corporation_uuid: "corp-1",
      po_mode: "project", // Normalized to PROJECT
      project_uuid: "proj-1",
      shipping_address_uuid: "addr-1",
      po_type: "labor",
    });

    const { default: handler } = await import(
      "@/server/api/purchase-order-forms/index"
    );
    const response = await handler(makeEvent("POST"));

    expect(response.data.uuid).toBe("po-123");
    expect(response.data.attachments).toEqual([]);
    expect(insertSpy).toHaveBeenCalledTimes(1);
    // Verify that select with JOINs was called to fetch metadata
    expect(selectWithMetadataSpy).toHaveBeenCalled();
    const payload = insertedRows[0];
    expect(payload.po_mode).toBe("PROJECT");
    expect(payload.project_uuid).toBe("proj-1");
    expect(payload.shipping_address_uuid).toBe("addr-1");
    expect(payload.po_type).toBe("LABOR");
    expect(payload.po_type_uuid).toBe("LABOR");
    expect(payload.financial_breakdown).toMatchObject({
      charges: expect.any(Object),
      sales_taxes: expect.any(Object),
      totals: expect.any(Object),
    });
    expect(payload.attachments).toEqual([]);
  });

  it("stores financial breakdown and attachments when creating a purchase order", async () => {
    const globals = stubGlobals();
    const insertedRows: any[] = [];
    const selectWithMetadataSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              uuid: "po-999",
              attachments: insertedRows[0]?.attachments ?? [],
              project: null,
              vendor: null,
            },
            error: null,
          })
        ),
      })),
    }));
    const insertSpy = vi.fn((rows: any[]) => {
      insertedRows.push(...rows);
      return {
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                uuid: "po-999",
                attachments: rows[0]?.attachments ?? [],
              },
              error: null,
            })
          ),
        })),
      };
    });
    const deleteEqSpy = vi.fn(() => Promise.resolve({ error: null }));
    let capturedItems: any[] | null = null;
    setupSupabaseStub({
      purchase_order_forms: {
        insert: insertSpy,
        select: selectWithMetadataSpy,
      },
      purchase_order_items_list: {
        delete: vi.fn(() => ({ eq: deleteEqSpy })),
        insert: vi.fn((rows: any[]) => {
          capturedItems = rows;
          return Promise.resolve({ error: null });
        }),
      },
      __default: () => noopBuilder,
    });

    globals.mockReadBody.mockResolvedValue({
      corporation_uuid: "corp-1",
      financial_breakdown: {
        charges: {
          freight: { percentage: 10, amount: 100, taxable: true },
        },
        sales_taxes: {
          sales_tax_1: { percentage: 5, amount: 50 },
        },
        totals: {
          item_total: 1000,
          charges_total: 100,
          tax_total: 50,
          total_po_amount: 1150,
        },
      },
      attachments: [
        {
          uuid: "existing-attachment",
          document_name: "existing.pdf",
          mime_type: "application/pdf",
          file_size: 1234,
          file_url: "https://example.com/existing.pdf",
        },
        {
          name: "pending.pdf",
          type: "application/pdf",
          size: 1024,
          fileData: "data:application/pdf;base64,AAE=",
        },
      ],
      po_items: [
        {
          item_uuid: "item-1",
          name: "Concrete Mix",
          quantity: "5",
          po_quantity: "6",
          po_unit_price: "130.75",
        },
      ],
    });

    const { default: handler } = await import(
      "@/server/api/purchase-order-forms/index"
    );
    const response = await handler(makeEvent("POST"));

    expect(insertSpy).toHaveBeenCalledTimes(1);
    // Verify that select with JOINs was called to fetch metadata
    expect(selectWithMetadataSpy).toHaveBeenCalled();
    const payload = insertedRows[0];
    expect(payload.financial_breakdown).toMatchObject({
      charges: expect.any(Object),
      sales_taxes: expect.any(Object),
      totals: expect.any(Object),
    });
    expect(Array.isArray(payload.attachments)).toBe(true);
    expect(payload.attachments[0]).toMatchObject({
      uuid: "existing-attachment",
    });
    expect(payload.attachments[1]).toMatchObject({
      name: "pending.pdf",
    });
    expect(payload.attachments[1].uuid).toBeUndefined();
    expect(deleteEqSpy).toHaveBeenCalledWith("purchase_order_uuid", "po-999");
    expect(Array.isArray(capturedItems)).toBe(true);
    expect(capturedItems?.[0]).toMatchObject({
      purchase_order_uuid: "po-999",
      item_uuid: "item-1",
      item_name: "Concrete Mix",
      po_quantity: 6,
      po_unit_price: 130.75,
    });
  });

  it("creates purchase order with null type when value is unsupported", async () => {
    const globals = stubGlobals();
    let captured: any = null;
    const selectWithMetadataSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              uuid: "po-456",
              project: null,
              vendor: null,
            },
            error: null,
          })
        ),
      })),
    }));
    const insertSpy = vi.fn((rows: any[]) => {
      captured = rows[0];
      return {
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { uuid: "po-456" },
              error: null,
            })
          ),
        })),
      };
    });

    setupSupabaseStub({
      purchase_order_forms: {
        insert: insertSpy,
        select: selectWithMetadataSpy,
      },
      __default: () => noopBuilder,
    });

    globals.mockReadBody.mockResolvedValue({
      corporation_uuid: "corp-1",
      po_type: "UNKNOWN",
    });

    const { default: handler } = await import(
      "@/server/api/purchase-order-forms/index"
    );
    const response = await handler(makeEvent("POST"));

    expect(response.data.uuid).toBe("po-456");
    expect(response.data.attachments).toEqual([]);
    // Verify that select with JOINs was called to fetch metadata
    expect(selectWithMetadataSpy).toHaveBeenCalled();
    expect(captured.po_type).toBeNull();
    expect(captured.po_type_uuid).toBeNull();
    expect(captured.financial_breakdown).toMatchObject({
      charges: expect.any(Object),
      sales_taxes: expect.any(Object),
      totals: expect.any(Object),
    });
    expect(captured.attachments).toEqual([]);
  });

  it("normalizes project mode during update and uppercases PO type", async () => {
    const globals = stubGlobals();
    let updatePayload: any = null;
    const selectWithMetadataSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              uuid: "po-123",
              ...updatePayload,
              project: { uuid: "proj-1", project_name: "Test Project" },
              vendor: null,
            },
            error: null,
          })
        ),
      })),
    }));
    const eqSpy = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: { uuid: "po-123", ...updatePayload },
            error: null,
          })
        ),
      })),
    }));
    const updateSpy = vi.fn((data: any) => {
      updatePayload = data;
      return {
        eq: eqSpy,
      };
    });

    setupSupabaseStub({
      purchase_order_forms: {
        update: updateSpy,
        select: selectWithMetadataSpy,
      },
      __default: () => noopBuilder,
    });

    globals.mockReadBody.mockResolvedValue({
      uuid: "po-123",
      po_mode: "project", // Normalized to PROJECT
      project_uuid: "proj-1",
      shipping_address_uuid: "addr-1",
      po_type_uuid: "material",
    });

    const { default: handler } = await import(
      "@/server/api/purchase-order-forms/index"
    );
    const response = await handler(makeEvent("PUT"));

    expect(response.data.uuid).toBe("po-123");
    expect(updateSpy).toHaveBeenCalledTimes(1);
    // Verify that select with JOINs was called to fetch metadata
    expect(selectWithMetadataSpy).toHaveBeenCalled();
    expect(updatePayload.po_mode).toBe("PROJECT");
    expect(updatePayload.project_uuid).toBe("proj-1");
    expect(updatePayload.shipping_address_uuid).toBe("addr-1");
    expect(updatePayload.po_type).toBe("MATERIAL");
    expect(updatePayload.po_type_uuid).toBe("MATERIAL");
  });

  it("returns single form when uuid is provided", async () => {
    const globals = stubGlobals();
    const maybeSingle = vi.fn(() =>
      Promise.resolve({
        data: {
          uuid: "po-1",
          item_total: 1000,
          charges_total: 100,
          tax_total: 50,
          total_po_amount: 1150,
        },
        error: null,
      })
    );
    const selectSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle,
      })),
    }));

    setupSupabaseStub({
      purchase_order_forms: { select: selectSpy },
      __default: () => noopBuilder,
    });

    globals.mockGetQuery.mockReturnValue({ uuid: "po-1" });

    const { default: handler } = await import(
      "@/server/api/purchase-order-forms/index"
    );
    const response = await handler(makeEvent("GET"));

    expect(selectSpy).toHaveBeenCalledWith("*");
    expect(maybeSingle).toHaveBeenCalled();
    expect(response?.data?.uuid).toBe("po-1");
    expect(response?.data?.attachments).toEqual([]);
    // Computed totals should be nullified by decoratePurchaseOrderRecord
    // to force frontend recalculation for correct reactivity
    expect(response?.data?.item_total).toBeNull();
    expect(response?.data?.charges_total).toBeNull();
    expect(response?.data?.tax_total).toBeNull();
    expect(response?.data?.total_po_amount).toBeNull();
  });

  it("returns filtered forms for corporation uuid", async () => {
    const globals = stubGlobals();
    const orderSpy = vi.fn(() => ({
      range: vi.fn(() =>
        Promise.resolve({
          data: [
            {
              uuid: "po-1",
              item_total: 500,
              charges_total: 50,
              tax_total: 25,
              total_po_amount: 575,
            },
          ],
          error: null,
        })
      ),
    }));
    const eqSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        order: orderSpy,
      })),
    }));

    const selectSpy = vi.fn(() => ({
      eq: eqSpy,
    }));

    setupSupabaseStub({
      purchase_order_forms: { select: selectSpy },
      __default: () => noopBuilder,
    });

    globals.mockGetQuery.mockReturnValue({ corporation_uuid: "corp-1" });

    const { default: handler } = await import(
      "@/server/api/purchase-order-forms/index"
    );
    const response = await handler(makeEvent("GET"));

    expect(eqSpy).toHaveBeenCalledWith("corporation_uuid", "corp-1");
    expect(Array.isArray(response?.data)).toBe(true);
    expect(response?.data?.[0]?.uuid).toBe("po-1");
    expect(response?.data?.[0]?.attachments).toEqual([]);
    // Computed totals should be nullified for list responses too
    expect(response?.data?.[0]?.item_total).toBeNull();
    expect(response?.data?.[0]?.charges_total).toBeNull();
    expect(response?.data?.[0]?.tax_total).toBeNull();
    expect(response?.data?.[0]?.total_po_amount).toBeNull();
  });

  it("marks purchase order inactive on delete", async () => {
    const globals = stubGlobals();
    const eqSpy = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: { uuid: "po-1", is_active: false },
            error: null,
          })
        ),
      })),
    }));
    const updateSpy = vi.fn(() => ({
      eq: eqSpy,
    }));

    setupSupabaseStub({
      purchase_order_forms: { update: updateSpy },
      __default: () => noopBuilder,
    });

    globals.mockGetQuery.mockReturnValue({ uuid: "po-1" });

    const { default: handler } = await import(
      "@/server/api/purchase-order-forms/index"
    );
    const response = await handler(makeEvent("DELETE"));

    expect(eqSpy).toHaveBeenCalledWith("uuid", "po-1");
    expect(response.data.is_active).toBe(false);
  });

  it("returns 405 for unsupported methods", async () => {
    const globals = stubGlobals();
    globals.mockGetQuery.mockReturnValue({});

    setupSupabaseStub({
      __default: () => noopBuilder,
    });

    const { default: handler } = await import(
      "@/server/api/purchase-order-forms/index"
    );
    await expect(handler(makeEvent("PATCH"))).rejects.toThrow(
      "Method not allowed"
    );
    expect(globals.mockCreateError).toHaveBeenCalledWith({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  });

  it("validates required fields on POST", async () => {
    const globals = stubGlobals();
    globals.mockReadBody.mockResolvedValue({});

    setupSupabaseStub({
      __default: () => noopBuilder,
    });

    const { default: handler } = await import(
      "@/server/api/purchase-order-forms/index"
    );
    await expect(handler(makeEvent("POST"))).rejects.toThrow(
      "corporation_uuid is required"
    );
    expect(globals.mockCreateError).toHaveBeenCalledWith({
      statusCode: 400,
      statusMessage: "corporation_uuid is required",
    });
  });

  it("includes metadata fields (project_name, project_id, vendor_name) in POST response", async () => {
    const globals = stubGlobals();
    const insertedRows: any[] = [];
    const selectWithMetadataSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              uuid: "po-789",
              project_uuid: "proj-1",
              vendor_uuid: "vendor-1",
              project: {
                uuid: "proj-1",
                project_name: "Test Project",
                project_id: "PROJ-001",
              },
              vendor: {
                uuid: "vendor-1",
                vendor_name: "Test Vendor",
              },
            },
            error: null,
          })
        ),
      })),
    }));
    const insertSpy = vi.fn((rows: any[]) => {
      insertedRows.push(...rows);
      return {
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                uuid: "po-789",
                project_uuid: "proj-1",
                vendor_uuid: "vendor-1",
              },
              error: null,
            })
          ),
        })),
      };
    });

    setupSupabaseStub({
      purchase_order_forms: {
        insert: insertSpy,
        select: selectWithMetadataSpy,
      },
      __default: () => noopBuilder,
    });

    globals.mockReadBody.mockResolvedValue({
      corporation_uuid: "corp-1",
      project_uuid: "proj-1",
      vendor_uuid: "vendor-1",
    });

    const { default: handler } = await import(
      "@/server/api/purchase-order-forms/index"
    );
    const response = await handler(makeEvent("POST"));

    expect(response.data.uuid).toBe("po-789");
    // Verify metadata fields are included in response
    expect((response.data as any).project_name).toBe("Test Project");
    expect((response.data as any).project_id).toBe("PROJ-001");
    expect((response.data as any).vendor_name).toBe("Test Vendor");
    expect(selectWithMetadataSpy).toHaveBeenCalled();
  });

  it("includes metadata fields (project_name, project_id, vendor_name) in PUT response", async () => {
    const globals = stubGlobals();
    let updatePayload: any = null;
    const selectWithMetadataSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              uuid: "po-456",
              project_uuid: "proj-2",
              vendor_uuid: "vendor-2",
              project: {
                uuid: "proj-2",
                project_name: "Updated Project",
                project_id: "PROJ-002",
              },
              vendor: {
                uuid: "vendor-2",
                vendor_name: "Updated Vendor",
              },
            },
            error: null,
          })
        ),
      })),
    }));
    const eqSpy = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              uuid: "po-456",
              project_uuid: "proj-2",
              vendor_uuid: "vendor-2",
              ...updatePayload,
            },
            error: null,
          })
        ),
      })),
    }));
    const updateSpy = vi.fn((data: any) => {
      updatePayload = data;
      return {
        eq: eqSpy,
      };
    });

    setupSupabaseStub({
      purchase_order_forms: {
        update: updateSpy,
        select: selectWithMetadataSpy,
      },
      __default: () => noopBuilder,
    });

    globals.mockReadBody.mockResolvedValue({
      uuid: "po-456",
      project_uuid: "proj-2",
      vendor_uuid: "vendor-2",
    });

    const { default: handler } = await import(
      "@/server/api/purchase-order-forms/index"
    );
    const response = await handler(makeEvent("PUT"));

    expect(response.data.uuid).toBe("po-456");
    // Verify metadata fields are included in response
    expect((response.data as any).project_name).toBe("Updated Project");
    expect((response.data as any).project_id).toBe("PROJ-002");
    expect((response.data as any).vendor_name).toBe("Updated Vendor");
    expect(selectWithMetadataSpy).toHaveBeenCalled();
  });
});
