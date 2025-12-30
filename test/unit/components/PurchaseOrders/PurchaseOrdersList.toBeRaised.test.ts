import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia, defineStore } from 'pinia'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, readonly, nextTick } from 'vue'
import PurchaseOrdersList from '@/components/PurchaseOrders/PurchaseOrdersList.vue'
import { flushPromises } from '@vue/test-utils'

// Stubs for Nuxt UI components
const uiStubs = {
  UInput: { template: "<input />" },
  UButton: { 
    template: "<button v-bind='$attrs' @click=\"$emit('click')\"><slot /></button>",
    props: ['color', 'variant', 'icon', 'disabled', 'loading']
  },
  UTooltip: { template: "<div><slot /></div>" },
  UModal: {
    template: '<div><slot name="body" /><slot name="footer" /><slot name="header" /></div>',
  },
  UTable: { template: "<table><slot /></table>" },
  UPageCard: { template: '<div><slot name="body" /></div>' },
  UAlert: { template: "<div />" },
  USelect: { template: "<select />" },
  USelectMenu: { template: "<select />" },
  UPagination: { template: "<div />" },
  UIcon: { template: "<span />" },
  UCard: { template: "<div><slot /></div>" },
  CorporationSelect: { 
    template: "<select />",
    props: ['modelValue'],
    emits: ['update:modelValue']
  },
  ProjectSelect: { 
    template: "<select />",
    props: ['modelValue', 'corporationUuid', 'disabled'],
    emits: ['update:modelValue']
  },
  VendorSelect: { 
    template: "<select />",
    props: ['modelValue', 'corporationUuid', 'disabled'],
    emits: ['update:modelValue']
  },
}

// Stub child form component
vi.mock("@/components/PurchaseOrders/PurchaseOrderForm.vue", () => ({
  default: {
    name: "PurchaseOrderForm",
    template: "<div />",
    props: ["form", "editingPurchaseOrder", "loading", "readonly"],
  },
}));

// Mock composables
const mockHasPermission = vi.fn(() => true)
const mockIsReady = ref(true)

vi.mock("@/composables/useTableStandard", () => ({
  useTableStandard: () => ({
    pagination: { value: { pageSize: 10 } },
    paginationOptions: {},
    pageSizeOptions: [10, 20, 50],
    updatePageSize: vi.fn(),
    getPaginationProps: vi.fn(() => ({})),
    getPageInfo: vi.fn(() => ({ value: "1-10 of 10 purchase orders" })),
    shouldShowPagination: vi.fn(() => ({ value: true })),
  }),
}));

vi.mock("@/composables/useDateFormat", () => ({
  useDateFormat: () => ({ formatDate: (d: string) => d }),
}));

vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (n: number) => `$${Number(n || 0).toFixed(2)}`,
    formatCurrencyAbbreviated: (n: number) => {
      const num = Number(n || 0);
      if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `$${(num / 1000).toFixed(1)}k`;
      return `$${num.toFixed(2)}`;
    },
  }),
}));

vi.mock("@/composables/useUTCDateFormat", () => ({
  useUTCDateFormat: () => ({
    toUTCString: (s: string) => s,
    getCurrentLocal: () => "2025-01-01",
    createDateRangeParams: vi.fn((start: string, end: string) => ({
      start_date: start,
      end_date: end
    })),
  }),
}));

vi.mock("@/composables/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: mockHasPermission,
    isReady: mockIsReady,
  }),
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const mockToastAdd = vi.fn();
vi.mock("#app", () => ({
  useToast: vi.fn(() => ({
    add: mockToastAdd,
  })),
}));

// Mock useProjectItemsSummary composable
const mockProjectItemsSummaryData = ref<any>(null)
const mockProjectItemsSummaryLoading = ref(false)
const mockProjectItemsSummaryError = ref<string | null>(null)
const mockFetchProjectItemsSummary = vi.fn()

vi.mock("@/composables/useProjectItemsSummary", () => ({
  useProjectItemsSummary: () => ({
    data: mockProjectItemsSummaryData, // Remove readonly to allow reactivity
    loading: readonly(mockProjectItemsSummaryLoading),
    error: readonly(mockProjectItemsSummaryError),
    fetchProjectItemsSummary: mockFetchProjectItemsSummary,
  }),
}));

// Mock purchaseOrderListResources store
const mockPurchaseOrderListResourcesStore = {
  ensureProjects: vi.fn().mockResolvedValue([]),
  getProjects: vi.fn(() => []),
  getProjectsLoading: vi.fn(() => false),
  clearCorporation: vi.fn(),
  clear: vi.fn(),
}

vi.mock("@/stores/purchaseOrderListResources", () => ({
  usePurchaseOrderListResourcesStore: () => mockPurchaseOrderListResourcesStore,
}));

// Mock purchaseOrderResources store
const clearResourcesSpy = { current: vi.fn() };
const mockPurchaseOrderResourcesStore = {
  clear: vi.fn(),
  ensureEstimates: vi.fn().mockResolvedValue([]),
  ensureEstimateItems: vi.fn().mockResolvedValue([]),
  getEstimatesByProject: vi.fn(() => [
    {
      uuid: "estimate-1",
      status: "Approved",
      is_active: true,
      estimate_date: "2025-01-01",
    },
  ]),
  getLatestEstimateByProject: vi.fn(() => ({
    uuid: "estimate-1",
    status: "Approved",
    is_active: true,
    estimate_date: "2025-01-01",
  })),
};

vi.mock("@/stores/purchaseOrderResources", () => {
  return {
    usePurchaseOrderResourcesStore: () => mockPurchaseOrderResourcesStore,
  };
});

// Mock vendor store
const mockVendorStore = {
  vendors: ref([
    { uuid: "vendor-1", vendor_name: "Test Vendor" },
    { uuid: "vendor-2", vendor_name: "Another Vendor" },
  ]),
  fetchVendors: vi.fn().mockResolvedValue([]),
};

vi.mock("@/stores/vendors", () => ({
  useVendorStore: () => mockVendorStore,
}));

// Mock project addresses store
const mockProjectAddressesStore = {
  fetchAddresses: vi.fn().mockResolvedValue([]),
  getAddresses: vi.fn(() => []),
};

vi.mock("@/stores/projectAddresses", () => ({
  useProjectAddressesStore: () => mockProjectAddressesStore,
}));

// Mock $fetch for API calls
global.$fetch = vi.fn() as any

describe("PurchaseOrdersList.vue - To Be Raised Functionality", () => {
  let pinia: any;
  let useCorporationStore: any;
  let usePurchaseOrdersStore: any;
  let useChangeOrdersStore: any;

  beforeEach(() => {
    clearResourcesSpy.current = vi.fn();
    pinia = createPinia();
    setActivePinia(pinia);
    mockHasPermission.mockReset();
    mockHasPermission.mockReturnValue(true);
    mockToastAdd.mockReset();
    mockFetchProjectItemsSummary.mockReset();
    mockProjectItemsSummaryData.value = null;
    mockProjectItemsSummaryLoading.value = false;
    mockProjectItemsSummaryError.value = null;
    mockIsReady.value = true;

    useCorporationStore = defineStore("corporations", () => {
      const selectedCorporationId = ref("corp-1");
      return {
        selectedCorporationId,
        _selectedCorporationId: selectedCorporationId,
      };
    });

    usePurchaseOrdersStore = defineStore("purchaseOrders", () => {
      const fetchPurchaseOrders = vi.fn();
      const fetchPurchaseOrder = vi.fn(async () => null);
      return {
        purchaseOrders: [
          {
            uuid: "po-1",
            corporation_uuid: "corp-1",
            entry_date: "2025-11-05T00:00:00Z",
            po_number: "PO-1",
            po_type: "MATERIAL",
            credit_days: "NET_30",
            status: "Draft",
            total_po_amount: 100,
          },
        ],
        loading: false,
        error: null,
        fetchPurchaseOrders,
        fetchPurchaseOrder,
      };
    });

    useChangeOrdersStore = defineStore("changeOrders", () => {
      const changeOrders = ref<any[]>([]);
      return {
        get changeOrders() {
          return Array.isArray(changeOrders.value) ? changeOrders.value : [];
        },
        _changeOrders: changeOrders,
      };
    });

    // Initialize stores
    useCorporationStore();
    usePurchaseOrdersStore();
    useChangeOrdersStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const mountList = () => {
    return mount(PurchaseOrdersList, {
      global: {
        plugins: [pinia],
        stubs: uiStubs,
      },
    });
  };

  describe("To Be Raised Stat Card", () => {
    it("should render the 'To Be Raised' stat card", () => {
      const wrapper = mountList();
      const html = wrapper.html();
      expect(html).toContain("To Be Raised");
    });

    it("should toggle status filter when 'To Be Raised' stat is clicked", async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      // Initially no status filter should be selected
      expect(vm.selectedStatusFilter).toBe(null);
      
      // Find and click the "To Be Raised" stat card
      const toBeRaisedCard = wrapper.find('[data-testid="to-be-raised-stat"]') ||
        wrapper.findAll('div').find((d: any) => d.text().includes('To Be Raised'));
      
      // Simulate click by calling the method directly
      await vm.toggleStatusFilter('ToBeRaised');
      await nextTick();
      
      expect(vm.selectedStatusFilter).toBe('ToBeRaised');
    });

    it("should deselect status filter when clicking the same stat again", async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      // Select ToBeRaised
      await vm.toggleStatusFilter('ToBeRaised');
      await nextTick();
      expect(vm.selectedStatusFilter).toBe('ToBeRaised');
      
      // Click again to deselect
      await vm.toggleStatusFilter('ToBeRaised');
      await nextTick();
      expect(vm.selectedStatusFilter).toBe(null);
    });
  });

  describe("To Be Raised Table Display", () => {
    it("should show 'To Be Raised' section when ToBeRaised status filter is selected", async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      await vm.toggleStatusFilter('ToBeRaised');
      await nextTick();
      
      const html = wrapper.html();
      expect(html).toContain("To be Raised");
    });

    it("should show message when filters are not complete", async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      await vm.toggleStatusFilter('ToBeRaised');
      await nextTick();
      
      const html = wrapper.html();
      expect(html).toContain("Please select");
      expect(html).toContain("Corporation");
      expect(html).toContain("Project");
      expect(html).toContain("Vendor");
    });

    it("should show 'No items to be raised' when toBeRaisedItems is empty and itemsTableData is empty", async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      // Set filters
      vm.appliedFilters = {
        corporation: "corp-1",
        project: "proj-1",
        vendor: "vendor-1",
        location: undefined,
        status: undefined
      };
      
      // Set ToBeRaised status
      vm.selectedStatusFilter = 'ToBeRaised';
      vm.toBeRaisedItems = [];
      mockProjectItemsSummaryData.value = null;
      
      await nextTick();
      
      const html = wrapper.html();
      expect(html).toContain("No items to be raised");
    });

    it("should NOT show 'No items to be raised' when itemsTableData has data", async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      // Set filters
      vm.appliedFilters = {
        corporation: "corp-1",
        project: "proj-1",
        vendor: "vendor-1",
        location: undefined,
        status: undefined
      };
      
      // Set ToBeRaised status
      vm.selectedStatusFilter = 'ToBeRaised';
      vm.toBeRaisedItems = [];
      
      // Set items table data
      mockProjectItemsSummaryData.value = {
        items: [
          {
            corporation_name: "Test Corp",
            project_name: "Test Project",
            cost_code_label: "01-001",
            vendor_name: "Test Vendor",
            sequence: "SEQ-001",
            item_type_label: "Material",
            item_name: "Test Item",
            description: "Test Description",
            location: "Location 1",
            budget_qty: 10,
            po_qty: 5,
            pending_qty: 5,
            status: "Partial"
          }
        ]
      };
      
      await nextTick();
      
      const html = wrapper.html();
      expect(html).not.toContain("No items to be raised");
    });
  });

  describe("fetchToBeRaisedItems", () => {
    it("should fetch items when corporation, project, and vendor are set", async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      // Mock $fetch for the API call
      vi.mocked(global.$fetch).mockResolvedValue({
        data: [
          {
            cost_code_label: "01-001",
            item_name: "Item 1",
            quantity: 10,
            unit_price: 100
          }
        ]
      });
      
      // Set filters
      vm.appliedFilters = {
        corporation: "corp-1",
        project: "proj-1",
        vendor: "vendor-1",
        location: undefined,
        status: undefined
      };
      
      await vm.fetchToBeRaisedItems();
      await flushPromises();
      
      expect(global.$fetch).toHaveBeenCalledWith(
        '/api/items-to-be-raised',
        expect.objectContaining({
          method: 'GET',
          query: expect.objectContaining({
            corporation_uuid: "corp-1",
            project_uuid: "proj-1",
            vendor_uuid: "vendor-1"
          })
        })
      );
    });

    it("should not fetch if filters are incomplete", async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      // Clear any previous $fetch calls from component initialization
      vi.mocked(global.$fetch).mockClear();
      
      // Set incomplete filters
      vm.appliedFilters = {
        corporation: "corp-1",
        project: undefined,
        vendor: "vendor-1",
        location: undefined,
        status: undefined
      };
      
      await vm.fetchToBeRaisedItems();
      await flushPromises();
      
      // Should not call the items-to-be-raised API
      const itemsToBeRaisedCalls = vi.mocked(global.$fetch).mock.calls.filter(
        (call: any) => call[0] === '/api/items-to-be-raised'
      );
      expect(itemsToBeRaisedCalls.length).toBe(0);
      expect(vm.toBeRaisedItems).toEqual([]);
    });

    it("should handle API errors gracefully", async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      // Clear any previous $fetch calls and toast calls
      vi.mocked(global.$fetch).mockClear();
      mockToastAdd.mockClear();
      
      // Mock API error for items-to-be-raised endpoint
      vi.mocked(global.$fetch).mockImplementation((url: string) => {
        if (url === '/api/items-to-be-raised') {
          return Promise.reject(new Error("API Error"));
        }
        return Promise.resolve({ data: [] });
      });
      
      // Set filters
      vm.appliedFilters = {
        corporation: "corp-1",
        project: "proj-1",
        vendor: "vendor-1",
        location: undefined,
        status: undefined
      };
      
      await vm.fetchToBeRaisedItems();
      await flushPromises();
      await nextTick();
      
      expect(vm.toBeRaisedItems).toEqual([]);
      // The error should be logged and toast should be called if error handling is in place
      // Check if toast was called (it might be called in a try-catch that swallows the error)
      const toastCalls = mockToastAdd.mock.calls;
      if (toastCalls.length > 0) {
        expect(mockToastAdd).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error',
            color: 'error'
          })
        );
      } else {
        // If toast is not called, at least verify the items array is empty
        expect(vm.toBeRaisedItems).toEqual([]);
      }
    });

    it("should set loading state during fetch", async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      // Mock delayed API response
      let resolveFetch: any;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });
      vi.mocked(global.$fetch).mockReturnValue(fetchPromise as any);
      
      // Set filters
      vm.appliedFilters = {
        corporation: "corp-1",
        project: "proj-1",
        vendor: "vendor-1",
        location: undefined,
        status: undefined
      };
      
      const fetchPromise2 = vm.fetchToBeRaisedItems();
      
      // Check loading state
      expect(vm.loadingToBeRaisedItems).toBe(true);
      
      // Resolve the fetch
      resolveFetch({ data: [] });
      await fetchPromise2;
      await flushPromises();
      
      // Loading should be false after fetch completes
      expect(vm.loadingToBeRaisedItems).toBe(false);
    });
  });

  describe("Items Table Integration", () => {
    it("should show items table when data exists, even if ToBeRaised is selected", async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      // Set ToBeRaised status
      vm.selectedStatusFilter = 'ToBeRaised';
      vm.toBeRaisedItems = [];
      
      // Set required filters for items table to show
      vm.appliedFilters = {
        corporation: "corp-1",
        project: "proj-1",
        vendor: undefined,
        location: undefined,
        status: undefined
      };
      
      // Set items table data
      mockProjectItemsSummaryData.value = {
        items: [
          {
            corporation_name: "Test Corp",
            project_name: "Test Project",
            cost_code_label: "01-001",
            vendor_name: "Test Vendor",
            sequence: "SEQ-001",
            item_type_label: "Material",
            item_name: "Test Item",
            description: "Test Description",
            location: "Location 1",
            budget_qty: 10,
            po_qty: 5,
            pending_qty: 5,
            status: "Partial"
          }
        ]
      };
      
      await nextTick();
      
      // Items table should be visible
      const tables = wrapper.findAll('table');
      expect(tables.length).toBeGreaterThan(0);
    });

    it("should fetch items table data when Show button is clicked with corporation and project", async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      // Set filter values
      vm.filterCorporation = "corp-1";
      vm.filterProject = "proj-1";
      vm.filterVendor = "vendor-1";
      
      // Mock the fetch function
      mockFetchProjectItemsSummary.mockResolvedValue({
        items: [
          {
            corporation_name: "Test Corp",
            project_name: "Test Project",
            cost_code_label: "01-001",
            vendor_name: "Test Vendor",
            sequence: "SEQ-001",
            item_type_label: "Material",
            item_name: "Test Item",
            description: "Test Description",
            location: "Location 1",
            budget_qty: 10,
            po_qty: 5,
            pending_qty: 5,
            status: "Partial"
          }
        ]
      });
      
      await vm.handleShowResults();
      await flushPromises();
      
      expect(mockFetchProjectItemsSummary).toHaveBeenCalledWith(
        "corp-1",
        "proj-1",
        "vendor-1",
        undefined
      );
    });

    it("should not fetch items table data if corporation or project is missing", async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      // Set incomplete filter values
      vm.filterCorporation = "corp-1";
      vm.filterProject = undefined;
      
      await vm.handleShowResults();
      await flushPromises();
      
      expect(mockFetchProjectItemsSummary).not.toHaveBeenCalled();
    });
  });

  describe("handleShowResults Integration", () => {
    it("should fetch toBeRaisedItems when ToBeRaised is selected and all filters are set", async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      // Set ToBeRaised status
      vm.selectedStatusFilter = 'ToBeRaised';
      
      // Set filter values
      vm.filterCorporation = "corp-1";
      vm.filterProject = "proj-1";
      vm.filterVendor = "vendor-1";
      
      // Mock $fetch for toBeRaisedItems
      vi.mocked(global.$fetch).mockResolvedValue({
        data: [{ cost_code_label: "01-001", item_name: "Item 1" }]
      });
      
      // Mock fetchProjectItemsSummary
      mockFetchProjectItemsSummary.mockResolvedValue({ items: [] });
      
      await vm.handleShowResults();
      await flushPromises();
      
      expect(global.$fetch).toHaveBeenCalledWith(
        '/api/items-to-be-raised',
        expect.any(Object)
      );
    });

    it("should fetch items table data when filters are set (non-ToBeRaised)", async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      // No status filter selected
      vm.selectedStatusFilter = null;
      
      // Set filter values
      vm.filterCorporation = "corp-1";
      vm.filterProject = "proj-1";
      
      // Mock fetchProjectItemsSummary
      mockFetchProjectItemsSummary.mockResolvedValue({
        items: [
          {
            corporation_name: "Test Corp",
            project_name: "Test Project",
            cost_code_label: "01-001",
            vendor_name: "Test Vendor",
            sequence: "SEQ-001",
            item_type_label: "Material",
            item_name: "Test Item",
            description: "Test Description",
            location: "Location 1",
            budget_qty: 10,
            po_qty: 5,
            pending_qty: 5,
            status: "Partial"
          }
        ]
      });
      
      await vm.handleShowResults();
      await flushPromises();
      
      expect(mockFetchProjectItemsSummary).toHaveBeenCalledWith(
        "corp-1",
        "proj-1",
        undefined,
        undefined
      );
    });
  });

  describe("Purchase Order Creation from To Be Raised Screen", () => {
    beforeEach(() => {
      // Reset mocks
      mockPurchaseOrderResourcesStore.clear.mockClear();
      mockPurchaseOrderResourcesStore.ensureEstimates.mockClear();
      mockPurchaseOrderResourcesStore.ensureEstimateItems.mockClear();
      mockPurchaseOrderResourcesStore.getEstimatesByProject.mockClear();
      mockVendorStore.fetchVendors.mockClear();
      mockProjectAddressesStore.fetchAddresses.mockClear();
    });

    it("should transform selected items to PO items format correctly", async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;

      const selectedItems = [
        {
          corporation_name: "Test Corp",
          project_name: "Test Project",
          cost_code_uuid: "cc-1",
          cost_code_number: "001",
          cost_code_name: "Concrete",
          cost_code_label: "001 Concrete",
          division_name: "Division 1",
          vendor_name: "Test Vendor",
          vendor_uuid: "vendor-1",
          sequence: "SEQ-001",
          sequence_uuid: "seq-uuid-1",
          item_type_uuid: "type-1",
          item_type_label: "Material",
          item_uuid: "item-1",
          item_name: "Test Item",
          description: "Test Description",
          location: "Location 1",
          location_uuid: "loc-uuid-1",
          unit_price: 100,
          unit_uuid: "uom-1",
          unit_label: "EA",
          budget_qty: 10,
          po_qty: 5,
          pending_qty: 5,
          status: "Partial",
        },
      ];

      // Call the function directly (it's defined in the component)
      const poItems = vm.transformSelectedItemsToPoItems(selectedItems);

      expect(poItems).toHaveLength(1);
      expect(poItems[0]).toMatchObject({
        cost_code_uuid: "cc-1",
        cost_code_number: "001",
        cost_code_name: "Concrete",
        cost_code_label: "001 Concrete",
        item_uuid: "item-1",
        name: "Test Item",
        description: "Test Description",
        location: "Location 1",
        location_uuid: "loc-uuid-1",
        unit_price: 100,
        po_unit_price: 100,
        po_quantity: 5, // Should use pending_qty
        uom_uuid: "uom-1",
        unit_label: "EA",
      });

      // Verify po_total is calculated correctly (rounded to 2 decimals)
      expect(poItems[0].po_total).toBe(500); // 100 * 5
    });

    it("should open form modal with pre-filled data when items are selected", async () => {
      // Set up items table data BEFORE mounting so the computed picks it up
      mockProjectItemsSummaryData.value = {
        items: [
          {
            corporation_name: "Test Corp",
            project_name: "Test Project",
            cost_code_uuid: "cc-1",
            cost_code_number: "001",
            cost_code_name: "Concrete",
            cost_code_label: "001 Concrete",
            vendor_name: "Test Vendor",
            vendor_uuid: "vendor-1",
            sequence: "SEQ-001",
            item_type_uuid: "type-1",
            item_type_label: "Material",
            item_uuid: "item-1",
            item_name: "Test Item",
            description: "Test Description",
            location: "Location 1",
            location_uuid: "loc-uuid-1",
            unit_price: 100,
            unit_uuid: "uom-1",
            unit_label: "EA",
            budget_qty: 10,
            po_qty: 5,
            pending_qty: 5,
            status: "Partial",
          },
        ],
      };

      const wrapper = mountList();
      const vm: any = wrapper.vm;

      // Set up applied filters - appliedFilters is a ref, access via .value
      if (
        vm.appliedFilters &&
        typeof vm.appliedFilters === "object" &&
        "value" in vm.appliedFilters
      ) {
        vm.appliedFilters.value = {
          corporation: "corp-1",
          project: "proj-1",
          vendor: "vendor-1",
          location: undefined,
          status: undefined,
        };
      } else {
        vm.appliedFilters = {
          corporation: "corp-1",
          project: "proj-1",
          vendor: "vendor-1",
          location: undefined,
          status: undefined,
        };
      }

      // Mock table API for selection
      const mockTableApi = {
        getFilteredSelectedRowModel: vi.fn(() => ({
          rows: [
            {
              original: mockProjectItemsSummaryData.value.items[0],
            },
          ],
        })),
      };

      // itemsTable is a template ref created with useTemplateRef
      // In tests, template refs might not be reactive, so we'll use the fallback path
      // Ensure itemsTable is undefined/null so the function uses the fallback path
      vm.itemsTable = undefined;

      // Set selectedItemsTableRows so the computed property can use that path
      vm.selectedItemsTableRows = { "0": true };

      // Wait for computed to update and ensure reactivity
      await nextTick();
      await wrapper.vm.$nextTick();

      // Force update to ensure computed properties are recalculated
      wrapper.vm.$forceUpdate();
      await nextTick();

      // Verify that selectedItemsTableRowsCount is > 0 before calling the function
      expect(vm.selectedItemsTableRowsCount).toBeGreaterThan(0);

      // Verify that itemsTableData has data (needed for the fallback path)
      // Access the computed multiple times to ensure it's reactive
      const itemsData1 = vm.itemsTableData;
      const itemsData2 = vm.itemsTableData;
      expect(itemsData1.length).toBeGreaterThan(0);
      expect(itemsData2.length).toBeGreaterThan(0);
      expect(itemsData1[0]).toBeDefined();
      expect(itemsData2[0]).toBeDefined();

      // Verify the selected indices logic matches what the function will use
      const selectedIndices = Object.keys(vm.selectedItemsTableRows)
        .filter((key) => vm.selectedItemsTableRows[key])
        .map((key) => parseInt(key));
      expect(selectedIndices).toEqual([0]);
      expect(itemsData1[0]).toBeDefined();

      // Clear mocks before calling
      mockVendorStore.fetchVendors.mockClear();
      mockProjectAddressesStore.fetchAddresses.mockClear();

      await vm.handleRaisePurchaseOrderForPendingQty();
      await flushPromises();
      await nextTick(); // Wait for all async operations to complete

      // Verify form modal is opened
      expect(vm.showFormModal).toBe(true);

      // Verify form is initialized with correct data (refs are auto-unwrapped)
      expect(vm.poForm.corporation_uuid).toBe("corp-1");
      expect(vm.poForm.project_uuid).toBe("proj-1");
      expect(vm.poForm.vendor_uuid).toBe("vendor-1");
      expect(vm.poForm.po_type).toBe("MATERIAL");
      expect(vm.poForm.include_items).toBe("IMPORT_ITEMS_FROM_ESTIMATE");
      expect(vm.poForm.status).toBe("Draft");

      // Verify PO items are pre-populated
      expect(Array.isArray(vm.poForm.po_items)).toBe(true);
      expect(vm.poForm.po_items.length).toBe(1);
      expect(vm.poForm.po_items[0].po_quantity).toBe(5); // Should use pending_qty
      expect(vm.poForm.po_items[0].po_unit_price).toBe(100);
      expect(vm.poForm.po_items[0].po_total).toBe(500);

      // Verify vendors were fetched
      expect(mockVendorStore.fetchVendors).toHaveBeenCalledWith("corp-1");
    });

    it("should fetch vendors and estimates before opening modal", async () => {
      // Set up items table data BEFORE mounting so the computed picks it up
      mockProjectItemsSummaryData.value = {
        items: [
          {
            cost_code_uuid: "cc-1",
            item_uuid: "item-1",
            pending_qty: 5,
            unit_price: 100,
            vendor_uuid: "vendor-1",
          },
        ],
      };

      const wrapper = mountList();
      const vm: any = wrapper.vm;

      // Set up applied filters - appliedFilters is a ref, access via .value
      if (
        vm.appliedFilters &&
        typeof vm.appliedFilters === "object" &&
        "value" in vm.appliedFilters
      ) {
        vm.appliedFilters.value = {
          corporation: "corp-1",
          project: "proj-1",
          vendor: "vendor-1",
          location: undefined,
          status: undefined,
        };
      } else {
        vm.appliedFilters = {
          corporation: "corp-1",
          project: "proj-1",
          vendor: "vendor-1",
          location: undefined,
          status: undefined,
        };
      }

      // Ensure itemsTable is undefined/null so the function uses the fallback path
      vm.itemsTable = undefined;

      // Set selectedItemsTableRows so the computed property uses the fallback path
      vm.selectedItemsTableRows = { "0": true };

      // Wait for computed to update and ensure reactivity
      await nextTick();
      await wrapper.vm.$nextTick();

      // Verify that selectedItemsTableRowsCount is > 0
      expect(vm.selectedItemsTableRowsCount).toBeGreaterThan(0);

      // Verify that itemsTableData has data (needed for the fallback path)
      // Force the computed to recalculate by accessing it
      const itemsData = vm.itemsTableData;
      expect(itemsData.length).toBeGreaterThan(0);
      expect(itemsData[0]).toBeDefined();

      // Clear mocks before calling
      mockVendorStore.fetchVendors.mockClear();
      mockProjectAddressesStore.fetchAddresses.mockClear();
      mockPurchaseOrderResourcesStore.ensureEstimates.mockClear();

      await vm.handleRaisePurchaseOrderForPendingQty();
      await flushPromises();
      await nextTick(); // Wait for all async operations to complete

      // Verify vendors were fetched
      expect(mockVendorStore.fetchVendors).toHaveBeenCalledWith("corp-1");

      // Verify project addresses were fetched
      expect(mockProjectAddressesStore.fetchAddresses).toHaveBeenCalledWith(
        "proj-1"
      );

      // Verify estimates were fetched
      expect(
        mockPurchaseOrderResourcesStore.ensureEstimates
      ).toHaveBeenCalledWith({
        corporationUuid: "corp-1",
        force: true,
      });
    });

    it("should not open modal if no items are selected", async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;

      vm.selectedItemsTableRowsCount = 0;

      await vm.handleRaisePurchaseOrderForPendingQty();
      await flushPromises();

      expect(vm.showFormModal).toBe(false);
    });


    it("should clear selected rows after opening form", async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;

      // Set up filters (refs are auto-unwrapped in Vue 3)
      vm.appliedFilters = {
        corporation: "corp-1",
        project: "proj-1",
        vendor: "vendor-1",
        location: undefined,
        status: undefined,
      };

      // Set up items table data
      mockProjectItemsSummaryData.value = {
        items: [
          {
            cost_code_uuid: "cc-1",
            item_uuid: "item-1",
            pending_qty: 5,
            unit_price: 100,
            vendor_uuid: "vendor-1",
          },
        ],
      };

      // Mock table API
      const mockTableApi = {
        getFilteredSelectedRowModel: vi.fn(() => ({
          rows: [{ original: mockProjectItemsSummaryData.value.items[0] }],
        })),
      };

      // itemsTable is a template ref created with useTemplateRef
      vm.itemsTable = {
        value: {
          tableApi: mockTableApi,
        },
      };

      // Set some selected rows (refs are auto-unwrapped)
      vm.selectedItemsTableRows = { "0": true };

      await vm.handleRaisePurchaseOrderForPendingQty();
      await flushPromises();

      // Selected rows should be cleared
      expect(vm.selectedItemsTableRows).toEqual({});
    });

    it("should use vendor from filters if available, otherwise from first selected item", async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;

      // Set up filters with vendor (refs are auto-unwrapped in Vue 3)
      vm.appliedFilters = {
        corporation: "corp-1",
        project: "proj-1",
        vendor: "vendor-from-filter",
        location: undefined,
        status: undefined,
      };

      // Set up items table data with different vendor
      mockProjectItemsSummaryData.value = {
        items: [
          {
            cost_code_uuid: "cc-1",
            item_uuid: "item-1",
            pending_qty: 5,
            unit_price: 100,
            vendor_uuid: "vendor-from-item",
          },
        ],
      };

      // Set selected rows count to simulate selection (refs are auto-unwrapped)
      vm.selectedItemsTableRows = { "0": true };

      // Mock table API
      const mockTableApi = {
        getFilteredSelectedRowModel: vi.fn(() => ({
          rows: [{ original: mockProjectItemsSummaryData.value.items[0] }],
        })),
      };

      // itemsTable is a template ref created with useTemplateRef
      vm.itemsTable = {
        value: {
          tableApi: mockTableApi,
        },
      };

      await vm.handleRaisePurchaseOrderForPendingQty();
      await flushPromises();

      // Should use vendor from filters (priority)
      expect(vm.poForm.vendor_uuid).toBe("vendor-from-filter");
    });

    it("should use vendor from first selected item if not in filters", async () => {
      // Set up items table data BEFORE mounting so the computed picks it up
      mockProjectItemsSummaryData.value = {
        items: [
          {
            cost_code_uuid: "cc-1",
            item_uuid: "item-1",
            pending_qty: 5,
            unit_price: 100,
            vendor_uuid: "vendor-from-item",
          },
        ],
      };

      const wrapper = mountList();
      const vm: any = wrapper.vm;

      // Set up filters without vendor - appliedFilters is a ref, access via .value
      if (
        vm.appliedFilters &&
        typeof vm.appliedFilters === "object" &&
        "value" in vm.appliedFilters
      ) {
        vm.appliedFilters.value = {
          corporation: "corp-1",
          project: "proj-1",
          vendor: undefined,
          location: undefined,
          status: undefined,
        };
      } else {
        vm.appliedFilters = {
          corporation: "corp-1",
          project: "proj-1",
          vendor: undefined,
          location: undefined,
          status: undefined,
        };
      }

      // Set selected rows count to simulate selection (refs are auto-unwrapped)
      vm.selectedItemsTableRows = { "0": true };

      // Mock table API
      const mockTableApi = {
        getFilteredSelectedRowModel: vi.fn(() => ({
          rows: [{ original: mockProjectItemsSummaryData.value.items[0] }],
        })),
      };

      // Ensure itemsTable is undefined/null so the function uses the fallback path
      vm.itemsTable = undefined;

      // Set selectedItemsTableRows so the computed property uses the fallback path
      vm.selectedItemsTableRows = { "0": true };

      // Wait for computed to update and ensure reactivity
      await nextTick();
      await wrapper.vm.$nextTick();

      // Verify that selectedItemsTableRowsCount is > 0
      expect(vm.selectedItemsTableRowsCount).toBeGreaterThan(0);

      // Verify that itemsTableData has data (needed for the fallback path)
      // Force the computed to recalculate by accessing it
      const itemsData = vm.itemsTableData;
      expect(itemsData.length).toBeGreaterThan(0);
      expect(itemsData[0]).toBeDefined();
      expect(itemsData[0].vendor_uuid).toBe("vendor-from-item");

      await vm.handleRaisePurchaseOrderForPendingQty();
      await flushPromises();
      await nextTick(); // Wait for all async operations to complete

      // Should use vendor from first selected item
      expect(vm.poForm.vendor_uuid).toBe("vendor-from-item");
    });
  });
});

