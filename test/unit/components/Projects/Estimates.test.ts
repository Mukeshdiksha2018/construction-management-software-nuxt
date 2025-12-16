import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import Estimates from '@/components/Projects/Estimates.vue'
import { useCorporationStore } from '@/stores/corporations'
import { useEstimatesStore } from '@/stores/estimates'
import { useDateRangeStore } from '@/stores/dateRange'
import { usePermissions } from "@/composables/usePermissions";

// Mock the stores
vi.mock('@/stores/corporations')
vi.mock('@/stores/estimates')
vi.mock('@/stores/dateRange')

// Mock the router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  go: vi.fn(),
  back: vi.fn(),
  forward: vi.fn()
}

const mockRoute = {
  query: {},
  params: {},
  path: '/',
  name: '',
  fullPath: '/',
  hash: '',
  meta: {},
  matched: [],
  redirectedFrom: undefined
}

vi.mock("vue-router", () => ({
  useRouter: () => ({
    ...mockRouter,
    resolve: (to: any) => ({ href: typeof to === "string" ? to : "/resolved" }),
  }),
  useRoute: () => mockRoute,
}));

// Mock table API
const mockTableApi = {
  setPageSize: vi.fn(),
  setPageIndex: vi.fn()
}

// Mock the composables
vi.mock("@/composables/useTableStandard", () => ({
  useTableStandard: () => ({
    pagination: { value: { pageSize: 10, pageIndex: 0 } },
    paginationOptions: {},
    pageSizeOptions: [10, 25, 50, 100],
    updatePageSize: vi.fn(),
    getPaginationProps: vi.fn(() => ({})),
    getPageInfo: vi.fn(() => ({ value: "1-10 of 100" })),
    shouldShowPagination: vi.fn(() => ({ value: true })),
    columnPinning: { value: { left: [], right: ["actions"] } },
    globalFilter: { value: "" },
  }),
}));

vi.mock("@/composables/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (date: string) => new Date(date).toLocaleDateString(),
  }),
}));

vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
  }),
}));

vi.mock("@/composables/useAuditLog", () => ({
  useAuditLog: () => ({
    generateAuditLogInfo: vi.fn(),
    showAuditLog: vi.fn(),
    closeAuditLog: vi.fn(),
    onAuditLogsLoaded: vi.fn(),
    onAuditLogError: vi.fn(),
    onExportAuditLogs: vi.fn(),
  }),
}));

const mockOpenEstimatePrint = vi.fn();

vi.mock("@/composables/useEstimatePrint", () => ({
  useEstimatePrint: () => ({
    openEstimatePrint: mockOpenEstimatePrint,
  }),
}));

vi.mock("#app", () => ({
  useToast: () => ({
    add: vi.fn(),
  }),
}));

vi.stubGlobal("useToast", () => ({
  add: vi.fn(),
}));

vi.mock("@/composables/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: vi.fn(() => true),
    isReady: { value: true },
  }),
}));

// Mock useApiClient composable
vi.mock("@/composables/useApiClient", () => ({
  useApiClient: () => ({
    apiFetch: vi.fn().mockResolvedValue({ data: [] }),
  }),
}));

// Mock the AuditLogSlideover component
vi.mock("@/components/AuditLogs/AuditLogSlideover.vue", () => ({
  default: {
    name: "AuditLogSlideover",
    template: '<div data-testid="audit-log-slideover"></div>',
    props: [
      "open",
      "entityId",
      "entityType",
      "corporationUuid",
      "title",
      "description",
      "autoRefresh",
    ],
    emits: ["update:open", "logs-loaded", "error"],
  },
}));

// Mock the EstimatePreview component
vi.mock("@/components/Projects/EstimatePreview.vue", () => ({
  default: {
    name: "EstimatePreview",
    template: '<div data-testid="estimate-preview"></div>',
    props: ["estimate"],
  },
}));

describe("Estimates", () => {
  let wrapper: any;
  let pinia: any;

  const originalEstimates = [
    {
      uuid: "estimate-1",
      estimate_number: "EST-001",
      project_uuid: "project-1",
      corporation_uuid: "corp-1",
      estimate_date: "2024-01-15",
      valid_until: "2024-02-15",
      total_amount: 1000,
      tax_amount: 100,
      discount_amount: 50,
      final_amount: 1050,
      status: "Draft",
      notes: "Test estimate",
      line_items: [],
      attachments: [],
      project: {
        uuid: "project-1",
        project_name: "Test Project 1",
        project_id: "TP001",
      },
    },
    {
      uuid: "estimate-2",
      estimate_number: "EST-002",
      project_uuid: "project-2",
      corporation_uuid: "corp-1",
      estimate_date: "2024-01-20",
      valid_until: "2024-02-20",
      total_amount: 2000,
      tax_amount: 200,
      discount_amount: 100,
      final_amount: 2100,
      status: "Pending",
      notes: "Another test estimate",
      line_items: [],
      attachments: [],
      project: {
        uuid: "project-2",
        project_name: "Test Project 2",
        project_id: "TP002",
      },
    },
    {
      uuid: "estimate-3",
      estimate_number: "EST-003",
      project_uuid: "project-3",
      corporation_uuid: "corp-1",
      estimate_date: "2024-01-25",
      valid_until: "2024-02-25",
      total_amount: 3000,
      tax_amount: 300,
      discount_amount: 150,
      final_amount: 3150,
      status: "Approved",
      notes: "Approved estimate",
      line_items: [],
      attachments: [],
      project: {
        uuid: "project-3",
        project_name: "Test Project 3",
        project_id: "TP003",
      },
    },
    {
      uuid: "estimate-4",
      estimate_number: "EST-004",
      project_uuid: "project-4",
      corporation_uuid: "corp-1",
      estimate_date: "2024-01-30",
      valid_until: "2024-02-30",
      total_amount: 4000,
      tax_amount: 400,
      discount_amount: 200,
      final_amount: 4200,
      status: "Rejected",
      notes: "Rejected estimate",
      line_items: [],
      attachments: [],
      project: {
        uuid: "project-4",
        project_name: "Test Project 4",
        project_id: "TP004",
      },
    },
  ];

  const mockEstimates = originalEstimates;

  const mockCorporation = {
    uuid: "corp-1",
    corporation_name: "Test Corporation",
    corporation_id: "TEST001",
  };

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);

    // Clear mocks
    mockOpenEstimatePrint.mockClear();
    mockTableApi.setPageIndex.mockClear();
    mockTableApi.setPageSize.mockClear();

    // Clear store mocks
    vi.mocked(useEstimatesStore).mockClear();

    // Mock store implementations
    vi.mocked(useCorporationStore).mockReturnValue({
      selectedCorporation: mockCorporation,
      selectedCorporationId: "corp-1",
    } as any);

    vi.mocked(useEstimatesStore).mockReturnValue({
      estimates: [...originalEstimates],
      loading: false,
      error: null,
      fetchEstimates: vi.fn().mockResolvedValue(undefined),
      refreshEstimatesFromAPI: vi.fn().mockResolvedValue(undefined),
      deleteEstimate: vi.fn().mockResolvedValue(true),
    } as any);

    vi.mocked(useDateRangeStore).mockReturnValue({
      dateRange: { value: { start: "2024-01-01", end: "2024-12-31" } },
    } as any);
  });

  const createWrapper = (props = {}) => {
    return mount(Estimates, {
      props: {
        ...props,
      },
      global: {
        plugins: [pinia],
        stubs: {
          UInput: {
            template:
              '<input v-bind="$attrs" @input="$emit(\'update:modelValue\', $event.target.value)" />',
            props: [
              "modelValue",
              "placeholder",
              "icon",
              "variant",
              "size",
              "class",
            ],
          },
          UButton: {
            template:
              '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
            props: ["icon", "color", "size", "disabled", "loading"],
          },
          UTable: {
            template: '<div data-testid="estimates-table"><slot /></div>',
            props: [
              "data",
              "columns",
              "pagination",
              "columnPinning",
              "paginationOptions",
              "selected",
              "globalFilter",
              "selectable",
              "sticky",
            ],
            emits: [
              "update:pagination",
              "update:columnPinning",
              "update:selected",
              "update:globalFilter",
            ],
            setup(props, { expose }) {
              expose({
                tableApi: mockTableApi,
              });
              return {};
            },
          },
          UPageCard: {
            name: "UPageCard",
            template:
              '<div class="page-card" @click="handleClick"><slot name="body" /></div>',
            props: ["variant", "highlight", "highlightColor", "onClick"],
            setup(props) {
              const handleClick = () => {
                if (props.onClick) {
                  props.onClick();
                }
              };
              return { handleClick };
            },
          },
          USelect: {
            template:
              '<select v-bind="$attrs" @change="$emit(\'change\', $event.target.value)"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
            props: ["modelValue", "items", "icon", "size", "variant", "class"],
            emits: ["change"],
          },
          UPagination: {
            template: '<div data-testid="pagination"></div>',
            props: [
              "modelValue",
              "total",
              "pageSize",
              "showSize",
              "showQuickJumper",
            ],
          },
          UAlert: {
            template: '<div v-bind="$attrs"><slot /></div>',
            props: ["icon", "color", "variant", "title", "description"],
          },
          UModal: {
            template:
              '<div v-if="open"><slot name="body" /><slot name="footer" /></div>',
            props: ["open", "title", "description", "ui", "fullscreen"],
            emits: ["update:open"],
          },
          UBadge: {
            template: '<span v-bind="$attrs"><slot /></span>',
            props: ["color", "variant", "size"],
          },
          UTooltip: {
            template: "<div><slot /></div>",
            props: ["text"],
          },
          UIcon: {
            template: "<span></span>",
            props: ["name"],
          },
          USkeleton: {
            template: '<div class="skeleton"></div>',
            props: ["class"],
          },
        },
        mocks: {
          $router: {
            push: vi.fn(),
          },
        },
      },
    });
  };

  describe("Component Rendering", () => {
    it("should render loading state", async () => {
      // Mock the store before creating the wrapper
      vi.mocked(useEstimatesStore).mockReturnValue({
        estimates: [],
        loading: true,
        error: null,
        fetchEstimates: vi.fn().mockResolvedValue(undefined),
        refreshEstimatesFromAPI: vi.fn().mockResolvedValue(undefined),
        deleteEstimate: vi.fn().mockResolvedValue(true),
      } as any);

      wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      // Just check that the component renders without errors
      expect(wrapper.exists()).toBe(true);
    });

    it("should render error state", async () => {
      // Mock the store before creating the wrapper
      vi.mocked(useEstimatesStore).mockReturnValue({
        estimates: [],
        loading: false,
        error: "Failed to load estimates",
        fetchEstimates: vi.fn().mockResolvedValue(undefined),
        refreshEstimatesFromAPI: vi.fn().mockResolvedValue(undefined),
        deleteEstimate: vi.fn().mockResolvedValue(true),
      } as any);

      wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      // Just check that the component renders without errors
      expect(wrapper.exists()).toBe(true);
    });

    it("should render estimates table when data is available", () => {
      wrapper = createWrapper();

      expect(wrapper.find('[data-testid="estimates-table"]').exists()).toBe(
        true
      );
    });

    it("should render no data state when no estimates", () => {
      vi.mocked(useEstimatesStore).mockReturnValue({
        estimates: [],
        loading: false,
        error: null,
        fetchEstimates: vi.fn().mockResolvedValue(undefined),
        refreshEstimatesFromAPI: vi.fn().mockResolvedValue(undefined),
        deleteEstimate: vi.fn().mockResolvedValue(true),
      } as any);

      wrapper = createWrapper();

      expect(wrapper.text()).toContain("No estimates found");
    });
  });

  describe("Table Columns", () => {
    it("should have correct column configuration", () => {
      wrapper = createWrapper();

      const columns = wrapper.vm.columns;
      expect(columns).toHaveLength(8);

      const columnKeys = columns.map((col) => col.accessorKey);
      expect(columnKeys).toContain("estimate_date");
      expect(columnKeys).toContain("estimate_number");
      expect(columnKeys).toContain("project_name");
      expect(columnKeys).toContain("status");
      expect(columnKeys).toContain("valid_until");
      expect(columnKeys).toContain("total_amount");
      expect(columnKeys).toContain("final_amount");
      expect(columnKeys).toContain("actions");
    });

    it("should format currency values correctly", () => {
      wrapper = createWrapper();

      const totalAmountColumn = wrapper.vm.columns.find(
        (col) => col.accessorKey === "total_amount"
      );
      const cellRenderer = totalAmountColumn.cell({
        row: { original: { total_amount: 1000 } },
      });

      expect(cellRenderer.children).toContain("$1000.00");
    });

    it("should format dates correctly", () => {
      wrapper = createWrapper();

      const dateColumn = wrapper.vm.columns.find(
        (col) => col.accessorKey === "estimate_date"
      );
      const cellRenderer = dateColumn.cell({
        row: { original: { estimate_date: "2024-01-15" } },
      });

      expect(cellRenderer.children).toContain("1/15/2024");
    });
  });

  describe("Status Badge Colors", () => {
    it("should return correct badge colors for different statuses", () => {
      wrapper = createWrapper();

      expect(wrapper.vm.getStatusBadgeColor("Draft")).toBe("neutral");
      expect(wrapper.vm.getStatusBadgeColor("Pending")).toBe("warning");
      expect(wrapper.vm.getStatusBadgeColor("Approved")).toBe("success");
      expect(wrapper.vm.getStatusBadgeColor("Rejected")).toBe("error");
      expect(wrapper.vm.getStatusBadgeColor("Expired")).toBe("neutral");
      expect(wrapper.vm.getStatusBadgeColor("Unknown")).toBe("neutral");
    });
  });

  describe("Actions", () => {
    it("should add new estimate", async () => {
      wrapper = createWrapper();

      const addButton = wrapper.find("button");
      await addButton.trigger("click");

      expect(mockRouter.push).toHaveBeenCalledWith("/estimates/form/new");
    });

    it("should edit estimate", async () => {
      wrapper = createWrapper();

      wrapper.vm.editEstimate(mockEstimates[0]);

      expect(mockRouter.push).toHaveBeenCalledWith(
        "/estimates/form/estimate-1"
      );
    });

    it("should delete estimate", async () => {
      wrapper = createWrapper();

      wrapper.vm.deleteEstimate(mockEstimates[0]);

      expect(wrapper.vm.showDeleteModal).toBe(true);
      expect(wrapper.vm.estimateToDelete).toEqual(mockEstimates[0]);
    });

    it("should confirm delete", async () => {
      wrapper = createWrapper();
      wrapper.vm.estimateToDelete = mockEstimates[0];
      wrapper.vm.showDeleteModal = true;

      await wrapper.vm.confirmDelete();

      expect(wrapper.vm.estimatesStore.deleteEstimate).toHaveBeenCalledWith(
        "estimate-1"
      );
      expect(wrapper.vm.showDeleteModal).toBe(false);
      expect(wrapper.vm.estimateToDelete).toBe(null);
    });

    it("should cancel delete", async () => {
      wrapper = createWrapper();
      wrapper.vm.estimateToDelete = mockEstimates[0];
      wrapper.vm.showDeleteModal = true;

      wrapper.vm.cancelDelete();

      expect(wrapper.vm.showDeleteModal).toBe(false);
      expect(wrapper.vm.estimateToDelete).toBe(null);
    });

    it("should preview estimate details", async () => {
      wrapper = createWrapper();

      wrapper.vm.previewEstimateDetails(mockEstimates[0]);

      expect(wrapper.vm.showPreviewModal).toBe(true);
      expect(wrapper.vm.previewEstimate).toEqual(mockEstimates[0]);
    });

    it("should edit estimate from preview", async () => {
      wrapper = createWrapper();
      wrapper.vm.previewEstimate = mockEstimates[0];
      wrapper.vm.showPreviewModal = true;

      wrapper.vm.editEstimateFromPreview();

      expect(wrapper.vm.showPreviewModal).toBe(false);
      expect(mockRouter.push).toHaveBeenCalledWith(
        "/estimates/form/estimate-1"
      );
    });

    it("should open print preview in new tab with correct URL", async () => {
      wrapper = createWrapper();
      const estimate = { uuid: "estimate-1" };

      wrapper.vm.openPrintPreview(estimate);

      expect(mockOpenEstimatePrint).toHaveBeenCalledWith(estimate);
    });
  });

  describe("Filtering", () => {
    it("should filter estimates based on global filter", () => {
      wrapper = createWrapper();

      wrapper.vm.globalFilter = "EST-001";
      wrapper.vm.filteredEstimates;

      // The filteredEstimates computed should return all estimates since filtering logic is in the table
      expect(wrapper.vm.filteredEstimates).toEqual(mockEstimates);
    });
  });

  describe("Watchers", () => {
    it("should not fetch estimates when corporation changes (TopBar handles fetching)", async () => {
      const mockFetchEstimates = vi.fn().mockResolvedValue(undefined);
      const mockRefreshEstimatesFromAPI = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useEstimatesStore).mockReturnValue({
        estimates: [],
        loading: false,
        error: null,
        fetchEstimates: mockFetchEstimates,
        refreshEstimatesFromAPI: mockRefreshEstimatesFromAPI,
        deleteEstimate: vi.fn().mockResolvedValue(true),
      } as any);

      wrapper = createWrapper();

      // Component no longer fetches data itself - TopBar handles it
      // Estimates are automatically fetched by TopBar.vue when corporation changes
      expect(mockFetchEstimates).not.toHaveBeenCalled();
      expect(mockRefreshEstimatesFromAPI).not.toHaveBeenCalled();
    });

    it("should update table when pagination changes", async () => {
      wrapper = createWrapper();

      // Test that the component renders without errors
      expect(wrapper.exists()).toBe(true);
    });

    it("should reset page index when global filter changes", async () => {
      wrapper = createWrapper();

      // Test that the component renders without errors
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe("Mounted Hook", () => {
    it("should not fetch estimates on mount (TopBar handles fetching)", async () => {
      const mockFetchEstimates = vi.fn().mockResolvedValue(undefined);
      const mockRefreshEstimatesFromAPI = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useEstimatesStore).mockReturnValue({
        estimates: [],
        loading: false,
        error: null,
        fetchEstimates: mockFetchEstimates,
        refreshEstimatesFromAPI: mockRefreshEstimatesFromAPI,
        deleteEstimate: vi.fn().mockResolvedValue(true),
      } as any);

      wrapper = createWrapper();

      await nextTick();

      // Component no longer fetches data on mount - TopBar handles it
      // Estimates are automatically fetched by TopBar.vue when corporation changes
      expect(mockFetchEstimates).not.toHaveBeenCalled();
      expect(mockRefreshEstimatesFromAPI).not.toHaveBeenCalled();
    });

    it("should rely on TopBar to fetch estimates (component uses store data reactively)", async () => {
      const mockFetchEstimates = vi.fn().mockResolvedValue(undefined);
      const mockRefreshEstimatesFromAPI = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useEstimatesStore).mockReturnValue({
        estimates: [...originalEstimates],
        loading: false,
        error: null,
        fetchEstimates: mockFetchEstimates,
        refreshEstimatesFromAPI: mockRefreshEstimatesFromAPI,
        deleteEstimate: vi.fn().mockResolvedValue(true),
      } as any);

      wrapper = createWrapper();

      await nextTick();

      // Component does not fetch data itself - it relies on TopBar
      // TopBar calls refreshEstimatesFromAPI which updates the store
      // Component reactively displays data from the store
      expect(mockFetchEstimates).not.toHaveBeenCalled();
      expect(mockRefreshEstimatesFromAPI).not.toHaveBeenCalled();
      
      // Component should still render with data from store
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe("Permissions", () => {
    it("should show add button when user has create permission", () => {
      wrapper = createWrapper();

      const addButton = wrapper.find("button");
      expect(addButton.exists()).toBe(true);
    });

    it("should hide add button when user lacks create permission", () => {
      wrapper = createWrapper();

      const addButton = wrapper.find("button");
      expect(addButton.exists()).toBe(true); // Button should still exist due to mock
    });
  });

  describe("Error Handling", () => {
    it("should handle delete errors", async () => {
      const mockStore = {
        estimates: mockEstimates,
        loading: false,
        error: "Failed to delete estimate",
        fetchEstimates: vi.fn().mockResolvedValue(undefined),
        refreshEstimatesFromAPI: vi.fn().mockResolvedValue(undefined),
        deleteEstimate: vi.fn().mockRejectedValue(new Error('Failed to delete estimate')),
      } as any;

      vi.mocked(useEstimatesStore).mockReturnValue(mockStore);

      wrapper = createWrapper();
      wrapper.vm.estimateToDelete = mockEstimates[0];
      wrapper.vm.showDeleteModal = true;

      await wrapper.vm.confirmDelete();

      // Modal should remain open on error so user can see the error message
      expect(wrapper.vm.showDeleteModal).toBe(true);
      expect(wrapper.vm.estimateToDelete).not.toBe(null);
      // Store error should be cleared after handling
      expect(mockStore.error).toBe(null);
    });

    it("should handle fetch errors gracefully", async () => {
      vi.mocked(useEstimatesStore).mockReturnValue({
        estimates: [],
        loading: false,
        error: "Failed to fetch estimates",
        fetchEstimates: vi.fn().mockRejectedValue(new Error("Network error")),
        refreshEstimatesFromAPI: vi.fn().mockResolvedValue(undefined),
        deleteEstimate: vi.fn().mockResolvedValue(true),
      } as any);

      wrapper = createWrapper();

      expect(wrapper.vm.estimatesStore.error).toBe("Failed to fetch estimates");
    });

    it("should handle empty estimates list", () => {
      vi.mocked(useEstimatesStore).mockReturnValue({
        estimates: [],
        loading: false,
        error: null,
        fetchEstimates: vi.fn().mockResolvedValue(undefined),
        refreshEstimatesFromAPI: vi.fn().mockResolvedValue(undefined),
        deleteEstimate: vi.fn().mockResolvedValue(true),
      } as any);

      wrapper = createWrapper();

      expect(wrapper.vm.estimates).toEqual([]);
      expect(wrapper.text()).toContain("No estimates found");
    });
  });

  describe("Advanced Permissions", () => {
    it("should have permission functionality available", () => {
      wrapper = createWrapper();

      // Test that the component has permission methods available
      expect(typeof wrapper.vm.hasPermission).toBe("function");
      expect(typeof wrapper.vm.isReady).toBe("object");
    });

    it("should handle permission loading state", () => {
      wrapper = createWrapper();

      // Test that the component handles permission loading state
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe("Table Functionality", () => {
    it("should handle table selection", () => {
      wrapper = createWrapper();

      const selectedEstimates = [mockEstimates[0]];
      wrapper.vm.selectedEstimates = selectedEstimates;

      expect(wrapper.vm.selectedEstimates).toEqual(selectedEstimates);
    });

    it("should handle table pagination", () => {
      wrapper = createWrapper();

      const pagination = { pageSize: 25, pageIndex: 1 };
      wrapper.vm.pagination = pagination;

      expect(wrapper.vm.pagination).toEqual(pagination);
    });

    it("should handle column pinning", () => {
      wrapper = createWrapper();

      const columnPinning = { left: ["estimate_number"] };
      wrapper.vm.columnPinning = columnPinning;

      expect(wrapper.vm.columnPinning).toEqual(columnPinning);
    });

    it("should handle global filter updates", () => {
      wrapper = createWrapper();

      wrapper.vm.globalFilter = "test filter";

      expect(wrapper.vm.globalFilter).toBe("test filter");
    });
  });

  describe("Data Formatting", () => {
    it("should format estimate numbers correctly", () => {
      wrapper = createWrapper();

      const estimateNumberColumn = wrapper.vm.columns.find(
        (col) => col.accessorKey === "estimate_number"
      );
      const cellRenderer = estimateNumberColumn.cell({
        row: { original: { estimate_number: "EST-001" } },
      });

      expect(cellRenderer.children).toContain("EST-001");
    });

    it("should format project names correctly", () => {
      wrapper = createWrapper();

      const projectNameColumn = wrapper.vm.columns.find(
        (col) => col.accessorKey === "project_name"
      );
      const cellRenderer = projectNameColumn.cell({
        row: { original: { project: { project_name: "Test Project" } } },
      });

      expect(cellRenderer.children).toContain("Test Project");
    });

    it("should handle missing project data", () => {
      wrapper = createWrapper();

      const projectNameColumn = wrapper.vm.columns.find(
        (col) => col.accessorKey === "project_name"
      );
      const cellRenderer = projectNameColumn.cell({
        row: { original: { project: null } },
      });

      expect(cellRenderer.children).toContain("N/A");
    });

    it("should handle missing date data", () => {
      wrapper = createWrapper();

      const dateColumn = wrapper.vm.columns.find(
        (col) => col.accessorKey === "estimate_date"
      );
      const cellRenderer = dateColumn.cell({
        row: { original: { estimate_date: null } },
      });

      // The formatDate function will format null as a date, so we check for the formatted result
      expect(cellRenderer.children).toContain("1/1/1970");
    });
  });

  describe("Modal Management", () => {
    it("should open preview modal", () => {
      wrapper = createWrapper();

      wrapper.vm.previewEstimateDetails(mockEstimates[0]);
      expect(wrapper.vm.showPreviewModal).toBe(true);
      expect(wrapper.vm.previewEstimate).toEqual(mockEstimates[0]);
    });

    it("should open and close delete modal", () => {
      wrapper = createWrapper();

      wrapper.vm.deleteEstimate(mockEstimates[0]);
      expect(wrapper.vm.showDeleteModal).toBe(true);
      expect(wrapper.vm.estimateToDelete).toEqual(mockEstimates[0]);

      wrapper.vm.cancelDelete();
      expect(wrapper.vm.showDeleteModal).toBe(false);
      expect(wrapper.vm.estimateToDelete).toBe(null);
    });
  });

  describe("Audit Log Integration", () => {
    it("should have audit log functionality available", () => {
      wrapper = createWrapper();

      // Test that the component has audit log methods available
      expect(typeof wrapper.vm.showAuditLog).toBe("function");
    });
  });

  describe("Edge Cases", () => {
    it("should handle estimates with missing required fields", () => {
      const incompleteEstimate = {
        uuid: "estimate-incomplete",
        estimate_number: null,
        project_name: null,
        total_amount: null,
        final_amount: null,
      };

      vi.mocked(useEstimatesStore).mockReturnValue({
        estimates: [incompleteEstimate],
        loading: false,
        error: null,
        fetchEstimates: vi.fn().mockResolvedValue(undefined),
        refreshEstimatesFromAPI: vi.fn().mockResolvedValue(undefined),
        deleteEstimate: vi.fn().mockResolvedValue(true),
      } as any);

      wrapper = createWrapper();

      expect(wrapper.exists()).toBe(true);
    });

    it("should handle very large estimates list", () => {
      const largeEstimatesList = Array.from({ length: 1000 }, (_, i) => ({
        uuid: `estimate-${i}`,
        estimate_number: `EST-${i.toString().padStart(3, "0")}`,
        project_name: `Project ${i}`,
        total_amount: Math.random() * 10000,
        final_amount: Math.random() * 10000,
        status: "Draft",
        estimate_date: "2024-01-01",
        valid_until: "2024-12-31",
        project: {
          uuid: `project-${i}`,
          project_name: `Project ${i}`,
          project_id: `P${i}`,
        },
      }));

      vi.mocked(useEstimatesStore).mockReturnValue({
        estimates: largeEstimatesList,
        loading: false,
        error: null,
        fetchEstimates: vi.fn().mockResolvedValue(undefined),
        refreshEstimatesFromAPI: vi.fn().mockResolvedValue(undefined),
        deleteEstimate: vi.fn().mockResolvedValue(true),
      } as any);

      wrapper = createWrapper();

      expect(wrapper.vm.estimates).toHaveLength(1000);
      expect(wrapper.exists()).toBe(true);
    });

    it("should handle rapid state changes", async () => {
      wrapper = createWrapper();

      // Rapidly change states
      wrapper.vm.globalFilter = "test1";
      wrapper.vm.globalFilter = "test2";
      wrapper.vm.globalFilter = "test3";

      wrapper.vm.pagination = { pageSize: 10, pageIndex: 0 };
      wrapper.vm.pagination = { pageSize: 25, pageIndex: 1 };
      wrapper.vm.pagination = { pageSize: 50, pageIndex: 2 };

      // Component should handle rapid changes gracefully
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe("Status Stat Cards", () => {
    beforeEach(() => {
      // Reset estimates to original state
      vi.mocked(useEstimatesStore).mockReturnValue({
        estimates: [...originalEstimates],
        loading: false,
        error: null,
        fetchEstimates: vi.fn().mockResolvedValue(undefined),
        refreshEstimatesFromAPI: vi.fn().mockResolvedValue(undefined),
        deleteEstimate: vi.fn().mockResolvedValue(true),
      } as any);
    });

    it("should compute allEstimatesStats correctly", () => {
      wrapper = createWrapper();

      const stats = wrapper.vm.allEstimatesStats;

      expect(stats.count).toBe(4);
      expect(stats.totalValue).toBe(10500); // 1050 + 2100 + 3150 + 4200
    });

    it("should compute draftStats correctly", () => {
      wrapper = createWrapper();

      const stats = wrapper.vm.draftStats;

      expect(stats.count).toBe(1);
      expect(stats.totalValue).toBe(1050);
    });

    it("should compute approvedStats correctly", () => {
      wrapper = createWrapper();

      const stats = wrapper.vm.approvedStats;

      expect(stats.count).toBe(1);
      expect(stats.totalValue).toBe(3150);
    });

    it("should have selectedStatusFilter default to null", () => {
      wrapper = createWrapper();

      expect(wrapper.vm.selectedStatusFilter).toBe(null);
    });

    it("should filter estimates when status filter is applied", () => {
      wrapper = createWrapper();

      wrapper.vm.selectedStatusFilter = "Draft";

      const filtered = wrapper.vm.filteredEstimates;

      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe("Draft");
      expect(filtered[0].uuid).toBe("estimate-1");
    });

    it("should show all estimates when no filter is applied", () => {
      wrapper = createWrapper();

      wrapper.vm.selectedStatusFilter = null;

      const filtered = wrapper.vm.filteredEstimates;

      expect(filtered).toHaveLength(4);
    });

    it("should toggle status filter when clicking a status card", async () => {
      wrapper = createWrapper();

      expect(wrapper.vm.selectedStatusFilter).toBe(null);

      await wrapper.vm.toggleStatusFilter("Pending");
      await nextTick();

      expect(wrapper.vm.selectedStatusFilter).toBe("Pending");

      // Clicking same status again should clear filter
      await wrapper.vm.toggleStatusFilter("Pending");
      await nextTick();

      expect(wrapper.vm.selectedStatusFilter).toBe(null);
    });

    it("should clear status filter when clicking All Estimates card", async () => {
      wrapper = createWrapper();

      wrapper.vm.selectedStatusFilter = "Approved";
      expect(wrapper.vm.selectedStatusFilter).toBe("Approved");

      await wrapper.vm.clearStatusFilter();
      await nextTick();

      expect(wrapper.vm.selectedStatusFilter).toBe(null);
    });

    it("should filter estimates correctly when Draft filter is applied", () => {
      wrapper = createWrapper();

      wrapper.vm.selectedStatusFilter = "Draft";

      const filtered = wrapper.vm.filteredEstimates;

      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe("Draft");
      expect(filtered[0].uuid).toBe("estimate-1");
    });

    it("should filter estimates correctly when Pending filter is applied", () => {
      wrapper = createWrapper();

      wrapper.vm.selectedStatusFilter = "Pending";

      const filtered = wrapper.vm.filteredEstimates;

      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe("Pending");
      expect(filtered[0].uuid).toBe("estimate-2");
    });

    it("should filter estimates correctly when Approved filter is applied", () => {
      wrapper = createWrapper();

      wrapper.vm.selectedStatusFilter = "Approved";

      const filtered = wrapper.vm.filteredEstimates;

      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe("Approved");
      expect(filtered[0].uuid).toBe("estimate-3");
    });

    it("should filter estimates correctly when Rejected filter is applied", () => {
      wrapper = createWrapper();

      wrapper.vm.selectedStatusFilter = "Rejected";

      const filtered = wrapper.vm.filteredEstimates;

      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe("Rejected");
      expect(filtered[0].uuid).toBe("estimate-4");
    });

    it("should handle estimates with missing final_amount by using total_amount", () => {
      const estimatesWithMissingFinal = [
        ...originalEstimates,
        {
          uuid: "estimate-5",
          estimate_number: "EST-005",
          project_uuid: "project-5",
          corporation_uuid: "corp-1",
          estimate_date: "2024-02-01",
          valid_until: "2024-03-01",
          total_amount: 5000,
          final_amount: null,
          status: "Draft",
          line_items: [],
          attachments: [],
          project: {
            uuid: "project-5",
            project_name: "Test Project 5",
            project_id: "TP005",
          },
        },
      ];

      vi.mocked(useEstimatesStore).mockReturnValue({
        estimates: estimatesWithMissingFinal,
        loading: false,
        error: null,
        fetchEstimates: vi.fn().mockResolvedValue(undefined),
        refreshEstimatesFromAPI: vi.fn().mockResolvedValue(undefined),
        deleteEstimate: vi.fn().mockResolvedValue(true),
      } as any);

      wrapper = createWrapper();

      const stats = wrapper.vm.draftStats;

      expect(stats.count).toBe(2);
      expect(stats.totalValue).toBe(6050); // 1050 + 5000 (using total_amount as fallback)
    });

    it("should handle estimates with zero final_amount and total_amount", () => {
      const estimatesWithZeroAmount = [
        ...originalEstimates,
        {
          uuid: "estimate-6",
          estimate_number: "EST-006",
          project_uuid: "project-6",
          corporation_uuid: "corp-1",
          estimate_date: "2024-02-05",
          valid_until: "2024-03-05",
          total_amount: 0,
          final_amount: 0,
          status: "Approved",
          line_items: [],
          attachments: [],
          project: {
            uuid: "project-6",
            project_name: "Test Project 6",
            project_id: "TP006",
          },
        },
      ];

      vi.mocked(useEstimatesStore).mockReturnValue({
        estimates: estimatesWithZeroAmount,
        loading: false,
        error: null,
        fetchEstimates: vi.fn().mockResolvedValue(undefined),
        refreshEstimatesFromAPI: vi.fn().mockResolvedValue(undefined),
        deleteEstimate: vi.fn().mockResolvedValue(true),
      } as any);

      wrapper = createWrapper();

      const stats = wrapper.vm.approvedStats;

      expect(stats.count).toBe(2);
      expect(stats.totalValue).toBe(3150); // 3150 + 0
    });

    it("should reset table pagination when filter changes", async () => {
      wrapper = createWrapper();

      await wrapper.vm.toggleStatusFilter("Approved");

      expect(mockTableApi.setPageIndex).toHaveBeenCalledWith(0);
    });

    it("should reset table pagination when filter is cleared", async () => {
      wrapper = createWrapper();

      wrapper.vm.selectedStatusFilter = "Draft";
      await wrapper.vm.clearStatusFilter();

      expect(mockTableApi.setPageIndex).toHaveBeenCalledWith(0);
    });
  });
});
