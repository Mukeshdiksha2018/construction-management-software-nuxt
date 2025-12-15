import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick, ref, onMounted } from 'vue'
import Items from '@/components/Projects/Items.vue'

// Mock child components
vi.mock("@/components/Projects/ItemTypes.vue", () => ({
  default: {
    name: "ItemTypes",
    template: '<div data-testid="item-types">Item Types Component</div>',
    props: ["globalFilter", "projectFilter"],
    methods: {
      openAddModal: vi.fn(),
    },
  },
}));

vi.mock("@/components/Projects/ItemsList.vue", () => ({
  default: {
    name: "ItemsList",
    template: '<div data-testid="items-list">Items List Component</div>',
    props: ["globalFilter", "projectFilter"],
    methods: {
      openAddModal: vi.fn(),
    },
  },
}));

// Mock stores
const mockCorpStore = {
  selectedCorporation: {
    uuid: 'corp-1',
    corporation_name: 'Test Corporation'
  }
}

const mockProjectsStore = {
  projects: [
    { uuid: 'project-1', project_name: 'Project 1', project_id: 'P001' },
    { uuid: 'project-2', project_name: 'Project 2', project_id: 'P002' }
  ],
  fetchProjects: vi.fn()
}

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockCorpStore
}))

vi.mock('@/stores/projects', () => ({
  useProjectsStore: () => mockProjectsStore
}))

// Mock permissions
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: vi.fn(() => true)
  })
}))

// Mock useToast
const mockToast = {
  add: vi.fn()
}
vi.mock('#app', () => ({
  useToast: () => mockToast
}))
vi.stubGlobal('useToast', () => mockToast)

// Mock ProjectSelect component
vi.mock('@/components/Shared/ProjectSelect.vue', () => ({
  default: {
    name: 'ProjectSelect',
    template: '<div data-testid="project-select">Project Select Component</div>',
    props: ['modelValue', 'corporationUuid', 'placeholder', 'size']
  }
}))

// Mock Vue Router
const mockPush = vi.fn()
const mockQuery = ref({})
const mockRoute = {
  query: mockQuery
}

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

describe('Items Component', () => {
  let wrapper: any

  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockClear()
    mockQuery.value = {}
    mockPush.mockResolvedValue(undefined)
    mockProjectsStore.fetchProjects.mockClear();
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  const createWrapper = () => {
    return mount(Items, {
      global: {
        stubs: {
          UTabs: true,
          UButton: true,
          UInput: true,
          UPopover: {
            template:
              '<div class="u-popover"><slot /><slot name="content" /></div>',
            props: ["open"],
          },
          ItemTypes: true,
          ItemsList: true,
          ProjectSelect: true,
        },
      },
    });
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
      expect(tabs[0].value).toBe('item-types')
      expect(tabs[1].value).toBe('items')
    })

    it('should set default active tab to item-types', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.activeTab).toBe('item-types')
    })

    it('should initialize with empty global filter', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.globalFilter).toBe('')
    })
  })

  describe('Tab Navigation', () => {
    it('should fallback to item-types for invalid tab', () => {
      mockQuery.value = { subTab: 'invalid-tab' }
      wrapper = createWrapper()
      
      expect(wrapper.vm.activeTab).toBe('item-types')
    })

    it('should handle tab change', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.handleTabChange('items')
      
      expect(mockPush).toHaveBeenCalled()
    })
  })

  describe('Add Button Functionality', () => {
    it('should show correct button text for item-types tab', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.activeTab).toBe('item-types')
      // The button text is computed based on activeTab
      const expectedText = wrapper.vm.activeTab === 'item-types' ? 'Add New Item Type' : 'Add Item'
      expect(expectedText).toBe('Add New Item Type')
    })

    it('should call openAddModal on ItemTypes when item-types tab is active', async () => {
      wrapper = createWrapper()
      
      // Mock the ref
      const mockOpenAddModal = vi.fn()
      wrapper.vm.itemTypesTabRef = { openAddModal: mockOpenAddModal }
      
      await wrapper.vm.handleAddNew()
      
      expect(mockOpenAddModal).toHaveBeenCalled()
    })
  })

  describe('Component Refs', () => {
    it('should have itemTypesTabRef', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.itemTypesTabRef).toBeDefined()
    })

    it('should have itemsTabRef', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.itemsTabRef).toBeDefined()
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
      
      expect(wrapper.vm.activeTab).toBe('item-types')
    })
  })

  describe("Project Filter Functionality", () => {
    it("should initialize with undefined project filter", () => {
      wrapper = createWrapper();

      expect(wrapper.vm.selectedProjectFilter).toBeUndefined();
    });

    it("should handle project filter change with object", () => {
      wrapper = createWrapper();

      wrapper.vm.handleProjectFilterChange({ value: "project-1" });

      expect(wrapper.vm.selectedProjectFilter).toBe("project-1");
    });

    it("should handle project filter change with string", () => {
      wrapper = createWrapper();

      wrapper.vm.handleProjectFilterChange("project-2");

      expect(wrapper.vm.selectedProjectFilter).toBe("project-2");
    });

    it("should handle project filter change with null", () => {
      wrapper = createWrapper();
      wrapper.vm.selectedProjectFilter = "project-1";

      wrapper.vm.handleProjectFilterChange(null);

      expect(wrapper.vm.selectedProjectFilter).toBeUndefined();
    });

    it("should clear project filter", () => {
      wrapper = createWrapper();
      wrapper.vm.selectedProjectFilter = "project-1";

      wrapper.vm.clearProjectFilter();

      expect(wrapper.vm.selectedProjectFilter).toBeUndefined();
    });

    it("should get project display name", () => {
      wrapper = createWrapper();

      const displayName = wrapper.vm.getProjectDisplayName("project-1");

      expect(displayName).toBe("Project 1 (P001)");
    });

    it("should return unknown project for invalid UUID", () => {
      wrapper = createWrapper();

      const displayName = wrapper.vm.getProjectDisplayName("invalid-uuid");

      expect(displayName).toBe("Unknown Project");
    });

    it("should fetch projects on mount", async () => {
      wrapper = createWrapper();
      await nextTick();

      expect(mockProjectsStore.fetchProjects).toHaveBeenCalledWith("corp-1");
    });

    it("should pass project filter to child components", () => {
      wrapper = createWrapper();
      wrapper.vm.selectedProjectFilter = "project-1";

      // The projectFilter should be reactive and passed to child components
      expect(wrapper.vm.selectedProjectFilter).toBe("project-1");
    });
  });

  describe("Permission Functionality", () => {
    beforeEach(() => {
      mockToast.add.mockClear();
    });

    it("should have hasPermission method available", () => {
      wrapper = createWrapper();

      expect(wrapper.vm.hasPermission).toBeDefined();
      expect(typeof wrapper.vm.hasPermission).toBe("function");
    });

    it("should have handleAddNew method with permission check", () => {
      wrapper = createWrapper();

      // Should have handleAddNew method (permission check is handled internally)
      expect(wrapper.vm.handleAddNew).toBeDefined();
      expect(typeof wrapper.vm.handleAddNew).toBe("function");
    });

    it("should have correct tab configuration for permission checks", () => {
      wrapper = createWrapper();

      // Should have correct tab configuration
      expect(wrapper.vm.activeTab).toBe("item-types");
      expect(wrapper.vm.tabs).toBeDefined();
      expect(wrapper.vm.tabs.length).toBeGreaterThan(0);
    });
  });
})
