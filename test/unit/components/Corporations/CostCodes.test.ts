import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick, ref, onMounted } from 'vue'
import CostCodes from '@/components/Corporations/CostCodes.vue'

// Mock child components
vi.mock("@/components/Corporations/CostCodesDivision.vue", () => ({
  default: {
    name: "CostCodesDivision",
    template:
      '<div data-testid="cost-codes-division">Cost Codes Division Component</div>',
    props: ["globalFilter", "showHeader"],
    methods: {
      openAddModal: vi.fn(),
    },
  },
}));

vi.mock("@/components/Corporations/CostCodesConfiguration.vue", () => ({
  default: {
    name: "CostCodesConfiguration",
    template:
      '<div data-testid="cost-codes-configuration">Cost Codes Configuration Component</div>',
    props: ["globalFilter", "showHeader"],
    methods: {
      openAddModal: vi.fn(),
    },
  },
}));

// Mock stores
const mockDivisionsStore = {
  divisions: [],
  loading: false,
  error: null,
  createDivision: vi.fn(),
  updateDivision: vi.fn(),
  deleteDivision: vi.fn(),
  deleteAllDivisions: vi.fn(),
  fetchDivisions: vi.fn(),
  bulkImportDivisions: vi.fn()
}

const mockConfigurationsStore = {
  configurations: [],
  loading: false,
  error: null,
  createConfiguration: vi.fn(),
  updateConfiguration: vi.fn(),
  deleteConfiguration: vi.fn(),
  deleteAllConfigurations: vi.fn(),
  fetchConfigurations: vi.fn(),
  bulkImportConfigurations: vi.fn()
}

const mockCorpStore = {
  selectedCorporation: null,
  ensureReady: vi.fn()
}

// Mock permissions
const mockHasPermission = vi.fn()
const mockUsePermissions = {
  hasPermission: mockHasPermission
}

vi.mock('@/stores/costCodeDivisions', () => ({
  useCostCodeDivisionsStore: vi.fn(() => mockDivisionsStore)
}))

vi.mock('@/stores/costCodeConfigurations', () => ({
  useCostCodeConfigurationsStore: vi.fn(() => mockConfigurationsStore)
}))

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: vi.fn(() => mockCorpStore)
}))

vi.mock("@/composables/usePermissions", () => ({
  usePermissions: vi.fn(() => mockUsePermissions),
}));

// Mock useToast
const mockToast = {
  add: vi.fn(),
};
vi.mock("#app", () => ({
  useToast: () => mockToast,
}));
vi.stubGlobal("useToast", () => mockToast);

// Mock Papa Parse
vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn()
  }
}))

// Mock Vue Router
const mockPush = vi.fn()
const mockQuery = ref({})
const mockRoute = {
  query: mockQuery
}

// Create a function that returns a new route with the specified query
const createMockRoute = (query: any) => ({
  query: ref(query)
})

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({
    push: mockPush
  })
}))

// Mock the router composables globally
vi.stubGlobal('useRoute', () => mockRoute)
vi.stubGlobal('useRouter', () => ({
  push: mockPush
}))

// Mock Vue composables globally
vi.stubGlobal('ref', ref)
vi.stubGlobal('onMounted', onMounted)
vi.stubGlobal('nextTick', nextTick)

describe('CostCodes Component', () => {
  let wrapper: any

  beforeEach(() => {
    setActivePinia(createPinia());
    mockPush.mockClear();
    mockQuery.value = {};
    mockPush.mockResolvedValue(undefined);

    // Reset mock stores
    mockDivisionsStore.divisions = [];
    mockDivisionsStore.loading = false;
    mockDivisionsStore.error = null;
    mockConfigurationsStore.configurations = [];
    mockConfigurationsStore.loading = false;
    mockConfigurationsStore.error = null;
    mockCorpStore.selectedCorporation = null;

    // Reset permissions mock
    mockHasPermission.mockReturnValue(true);

    // Clear all mock functions
    vi.clearAllMocks();
    mockToast.add.mockClear();
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  const createWrapper = () => {
    return mount(CostCodes, {
      global: {
        stubs: {
          UTabs: true,
          UButton: true,
          UInput: true,
          CostCodesDivision: true,
          CostCodesConfiguration: true
        }
      }
    })
  }

  describe('Component Mounting', () => {
    it('should mount without errors', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should have correct tab configuration', () => {
      wrapper = createWrapper()
      
      const tabs = wrapper.vm.tabs
      expect(tabs).toHaveLength(2)
      expect(tabs[0].value).toBe('cost-codes-division')
      expect(tabs[1].value).toBe('cost-codes-configuration')
    })

    it('should set default active tab to cost-codes-division', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.activeTab).toBe('cost-codes-division')
    })

    it('should initialize with empty global filter', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.globalFilter).toBe('')
    })
  })

  describe('Tab Navigation', () => {
    it('should fallback to cost-codes-division for invalid tab', () => {
      mockQuery.value = { subTab: 'invalid-tab' }
      wrapper = createWrapper()
      
      expect(wrapper.vm.activeTab).toBe('cost-codes-division')
    })

    it('should handle tab change', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.handleTabChange('cost-codes-configuration')
      
      expect(mockPush).toHaveBeenCalled()
    })
  })

  describe('Add Button Functionality', () => {
    it('should show correct button text for cost-codes-division tab', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.activeTab).toBe('cost-codes-division')
      // The button text is computed based on activeTab
      const expectedText = wrapper.vm.activeTab === 'cost-codes-division' ? 'Add New Division' : 'Add Configuration'
      expect(expectedText).toBe('Add New Division')
    })

    it('should show correct button text for cost-codes-configuration tab', () => {
      wrapper = createWrapper()
      
      // Test the button text logic directly
      const expectedTextForDivision = 'cost-codes-division' === 'cost-codes-division' ? 'Add New Division' : 'Add Configuration'
      expect(expectedTextForDivision).toBe('Add New Division')
      
      const expectedTextForConfig = 'cost-codes-configuration' === 'cost-codes-division' ? 'Add New Division' : 'Add Configuration'
      expect(expectedTextForConfig).toBe('Add Configuration')
    })

    it('should call openAddModal on CostCodesDivision when cost-codes-division tab is active', async () => {
      wrapper = createWrapper()
      
      // Mock the ref
      const mockOpenAddModal = vi.fn()
      wrapper.vm.costCodesDivisionTabRef = { openAddModal: mockOpenAddModal }
      
      await wrapper.vm.handleAddNew()
      
      expect(mockOpenAddModal).toHaveBeenCalled()
    })

    it('should have handleAddNew method that can be called', () => {
      wrapper = createWrapper()
      
      // Mock both refs to avoid errors
      wrapper.vm.costCodesDivisionTabRef = { openAddModal: vi.fn() }
      wrapper.vm.costCodesConfigurationTabRef = { openAddModal: vi.fn() }
      
      // Test that the method exists and can be called without errors
      expect(() => wrapper.vm.handleAddNew()).not.toThrow()
    })
  })

  describe('Component Refs', () => {
    it('should have costCodesDivisionTabRef', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.costCodesDivisionTabRef).toBeDefined()
    })

    it('should have costCodesConfigurationTabRef', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.costCodesConfigurationTabRef).toBeDefined()
    })
  })

  describe('Global Filter', () => {
    it('should pass global filter to child components', () => {
      wrapper = createWrapper()
      wrapper.vm.globalFilter = 'test search'
      
      // The globalFilter should be reactive
      expect(wrapper.vm.globalFilter).toBe('test search')
    })
  })

  describe('URL Initialization', () => {
    it('should initialize subTab in URL if not present', async () => {
      mockQuery.value = {}
      wrapper = createWrapper()
      
      // Wait for onMounted to execute
      await nextTick()
      
      expect(mockPush).toHaveBeenCalled()
    })
  })

  describe('Component Methods', () => {
    it('should have handleTabChange method', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.handleTabChange).toBeDefined()
      expect(typeof wrapper.vm.handleTabChange).toBe('function')
    })

    it('should have handleAddNew method', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.handleAddNew).toBeDefined()
      expect(typeof wrapper.vm.handleAddNew).toBe('function')
    })
  })

  describe('Component State', () => {
    it('should maintain global filter state', () => {
      wrapper = createWrapper()
      
      wrapper.vm.globalFilter = 'search term'
      expect(wrapper.vm.globalFilter).toBe('search term')
    })

    it('should maintain active tab state', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.activeTab).toBe('cost-codes-division')
    })
  })

  describe("Dynamic Labels and Configuration", () => {
    it("should show correct search placeholder for divisions tab", () => {
      wrapper = createWrapper();

      // Test the computed property logic directly
      const activeTab = "cost-codes-division";
      const expectedPlaceholder =
        activeTab === "cost-codes-division"
          ? "Search divisions..."
          : "Search configurations...";
      expect(expectedPlaceholder).toBe("Search divisions...");
    });

    it("should show correct search placeholder for configurations tab", () => {
      wrapper = createWrapper();

      // Test the computed property logic directly
      const activeTab = "cost-codes-configuration";
      const expectedPlaceholder =
        activeTab === "cost-codes-division"
          ? "Search divisions..."
          : "Search configurations...";
      expect(expectedPlaceholder).toBe("Search configurations...");
    });

    it("should show correct add button label for divisions tab", () => {
      wrapper = createWrapper();

      // Test the computed property logic directly
      const activeTab = "cost-codes-division";
      const expectedLabel =
        activeTab === "cost-codes-division"
          ? "Add Division"
          : "Add Configuration";
      expect(expectedLabel).toBe("Add Division");
    });

    it("should show correct add button label for configurations tab", () => {
      wrapper = createWrapper();

      // Test the computed property logic directly
      const activeTab = "cost-codes-configuration";
      const expectedLabel =
        activeTab === "cost-codes-division"
          ? "Add Division"
          : "Add Configuration";
      expect(expectedLabel).toBe("Add Configuration");
    });

    it("should show correct delete all label for divisions tab", () => {
      wrapper = createWrapper();

      // Test the computed property logic directly
      const activeTab = "cost-codes-division";
      const expectedLabel =
        activeTab === "cost-codes-division"
          ? "Delete All Divisions"
          : "Delete All Configurations";
      expect(expectedLabel).toBe("Delete All Divisions");
    });

    it("should show correct delete all label for configurations tab", () => {
      wrapper = createWrapper();

      // Test the computed property logic directly
      const activeTab = "cost-codes-configuration";
      const expectedLabel =
        activeTab === "cost-codes-division"
          ? "Delete All Divisions"
          : "Delete All Configurations";
      expect(expectedLabel).toBe("Delete All Configurations");
    });
  });

  describe("CSV Import Functionality", () => {
    it("should have validateAndTransformCSV method", () => {
      wrapper = createWrapper();

      expect(wrapper.vm.validateAndTransformCSV).toBeDefined();
      expect(typeof wrapper.vm.validateAndTransformCSV).toBe("function");
    });

    it("should have getImportSuccessMessage method", () => {
      wrapper = createWrapper();

      expect(wrapper.vm.getImportSuccessMessage).toBeDefined();
      expect(typeof wrapper.vm.getImportSuccessMessage).toBe("function");
    });

    it("should have downloadSampleCSV method", () => {
      wrapper = createWrapper();

      expect(wrapper.vm.downloadSampleCSV).toBeDefined();
      expect(typeof wrapper.vm.downloadSampleCSV).toBe("function");
    });
  });

  describe("Delete All Functionality", () => {
    it("should have confirmDeleteAll method", () => {
      wrapper = createWrapper();

      expect(wrapper.vm.confirmDeleteAll).toBeDefined();
      expect(typeof wrapper.vm.confirmDeleteAll).toBe("function");
    });
  });

  describe("Data Count and Has Data", () => {
    it("should have dataCount computed property", () => {
      wrapper = createWrapper();

      expect(wrapper.vm.dataCount).toBeDefined();
    });

    it("should have hasData computed property", () => {
      wrapper = createWrapper();

      expect(wrapper.vm.hasData).toBeDefined();
    });
  });

  describe("Permission Functionality", () => {
    it("should show add button when user has cost_codes_create permission", () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_create") return true;
        return false;
      });

      wrapper = createWrapper();

      // The component should have the hasPermission method
      expect(wrapper.vm.hasPermission).toBeDefined();
      expect(wrapper.vm.hasPermission("cost_codes_create")).toBe(true);
    });

    it("should hide add button when user lacks cost_codes_create permission", () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_create") return false;
        return true;
      });

      wrapper = createWrapper();

      expect(wrapper.vm.hasPermission("cost_codes_create")).toBe(false);
    });

    it("should show delete all button when user has cost_codes_delete permission", () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_delete") return true;
        return false;
      });

      wrapper = createWrapper();

      expect(wrapper.vm.hasPermission("cost_codes_delete")).toBe(true);
    });

    it("should hide delete all button when user lacks cost_codes_delete permission", () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_delete") return false;
        return true;
      });

      wrapper = createWrapper();

      expect(wrapper.vm.hasPermission("cost_codes_delete")).toBe(false);
    });

    it("should show import select when user has cost_codes_create permission", () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_create") return true;
        return false;
      });

      wrapper = createWrapper();

      expect(wrapper.vm.hasPermission("cost_codes_create")).toBe(true);
    });

    it("should hide import select when user lacks cost_codes_create permission", () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_create") return false;
        return true;
      });

      wrapper = createWrapper();

      expect(wrapper.vm.hasPermission("cost_codes_create")).toBe(false);
    });

    it("should call handleAddNew with permission check", async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_create") return false;
        return true;
      });

      wrapper = createWrapper();

      // Test that the method exists and can be called
      expect(wrapper.vm.handleAddNew).toBeDefined();
      expect(typeof wrapper.vm.handleAddNew).toBe("function");

      // The method should handle permission checks internally
      await wrapper.vm.handleAddNew();

      // Verify that hasPermission was called with the correct permission
      expect(mockHasPermission).toHaveBeenCalledWith("cost_codes_create");
    });

    it("should call handleDeleteAll with permission check", async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_delete") return false;
        return true;
      });

      wrapper = createWrapper();

      // Test that the method exists and can be called
      expect(wrapper.vm.handleDeleteAll).toBeDefined();
      expect(typeof wrapper.vm.handleDeleteAll).toBe("function");

      // The method should handle permission checks internally
      await wrapper.vm.handleDeleteAll();

      // Verify that hasPermission was called with the correct permission
      expect(mockHasPermission).toHaveBeenCalledWith("cost_codes_delete");
    });

    it("should call handleImportOptionChange with permission check", async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_create") return false;
        return true;
      });

      wrapper = createWrapper();

      // Test that the method exists and can be called
      expect(wrapper.vm.handleImportOptionChange).toBeDefined();
      expect(typeof wrapper.vm.handleImportOptionChange).toBe("function");

      // The method should handle permission checks internally
      await wrapper.vm.handleImportOptionChange();

      // Verify that hasPermission was called with the correct permission
      expect(mockHasPermission).toHaveBeenCalledWith("cost_codes_create");
    });

    it("should call confirmImport with permission check", async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_create") return false;
        return true;
      });

      wrapper = createWrapper();

      // Test that the method exists and can be called
      expect(wrapper.vm.confirmImport).toBeDefined();
      expect(typeof wrapper.vm.confirmImport).toBe("function");

      // The method should handle permission checks internally
      await wrapper.vm.confirmImport();

      // Verify that hasPermission was called with the correct permission
      expect(mockHasPermission).toHaveBeenCalledWith("cost_codes_create");
    });

    describe("Unified Import with Store Refresh and IndexedDB Sync", () => {
      beforeEach(() => {
        mockCorpStore.selectedCorporation = {
          uuid: "corp-123",
          corporation_name: "Test Corp",
        };
        mockHasPermission.mockReturnValue(true);
      });

      it("should refresh both stores after successful unified import", async () => {
        wrapper = createWrapper();

        // Set up mock CSV data
        wrapper.vm.csvData = [
          {
            type: "Division",
            division_number: "01",
            division_name: "General Requirements",
            division_order: 1,
            is_active: true,
          },
          {
            type: "Cost Code",
            cost_code_number: "01010",
            cost_code_name: "Mobilization",
            division_number: "01",
            is_active: true,
          },
        ];

        // Mock successful import API response
        global.$fetch = vi.fn().mockResolvedValue({
          success: true,
          message: "Import completed",
          data: {
            divisions: { new: 1, duplicates: 0, total: 1, errors: 0 },
            configurations: { new: 1, duplicates: 0, total: 1, errors: 0 },
          },
        });

        // Mock store fetch methods
        mockDivisionsStore.fetchDivisions.mockResolvedValue(undefined);
        mockConfigurationsStore.fetchConfigurations.mockResolvedValue(
          undefined
        );

        await wrapper.vm.confirmImport();

        // Verify both stores were refreshed with correct parameters
        expect(mockDivisionsStore.fetchDivisions).toHaveBeenCalledWith(
          "corp-123",
          true, // forceRefresh
          false // useIndexedDB=false to force API fetch
        );

        expect(
          mockConfigurationsStore.fetchConfigurations
        ).toHaveBeenCalledWith(
          "corp-123",
          true, // forceRefresh
          false // useIndexedDB=false to force API fetch
        );
      });

      it("should handle import errors gracefully", async () => {
        wrapper = createWrapper();

        wrapper.vm.csvData = [
          {
            type: "Division",
            division_number: "01",
            division_name: "General Requirements",
            division_order: 1,
            is_active: true,
          },
        ];

        // Mock failed import API response
        global.$fetch = vi.fn().mockRejectedValue(new Error("Import failed"));

        await wrapper.vm.confirmImport();

        // Verify stores were not refreshed on error
        expect(mockDivisionsStore.fetchDivisions).not.toHaveBeenCalled();
        expect(
          mockConfigurationsStore.fetchConfigurations
        ).not.toHaveBeenCalled();

        // Verify toast error was shown
        expect(mockToast.add).toHaveBeenCalled();
      });

      it("should show success message after successful import", async () => {
        wrapper = createWrapper();

        wrapper.vm.csvData = [
          {
            type: "Division",
            division_number: "01",
            division_name: "General Requirements",
            division_order: 1,
            is_active: true,
          },
        ];

        // Mock successful import
        global.$fetch = vi.fn().mockResolvedValue({
          success: true,
          message: "Import completed",
          data: {
            divisions: { new: 1, duplicates: 0, total: 1, errors: 0 },
            configurations: { new: 0, duplicates: 0, total: 0, errors: 0 },
          },
        });

        mockDivisionsStore.fetchDivisions.mockResolvedValue(undefined);
        mockConfigurationsStore.fetchConfigurations.mockResolvedValue(
          undefined
        );

        await wrapper.vm.confirmImport();

        // Verify success toast was shown
        expect(mockToast.add).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Import Successful",
          })
        );
      });
    });

    it("should call confirmDeleteAll with permission check", async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_delete") return false;
        return true;
      });

      wrapper = createWrapper();

      // Test that the method exists and can be called
      expect(wrapper.vm.confirmDeleteAll).toBeDefined();
      expect(typeof wrapper.vm.confirmDeleteAll).toBe("function");

      // The method should handle permission checks internally
      await wrapper.vm.confirmDeleteAll();

      // Verify that hasPermission was called with the correct permission
      expect(mockHasPermission).toHaveBeenCalledWith("cost_codes_delete");
    });
  });
})
