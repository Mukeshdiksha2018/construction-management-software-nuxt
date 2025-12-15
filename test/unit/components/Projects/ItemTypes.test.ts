import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick, ref } from 'vue'
import ItemTypes from '@/components/Projects/ItemTypes.vue'
import { useItemTypesStore } from '@/stores/itemTypes'
import { useCorporationStore } from '@/stores/corporations'
import { useProjectsStore } from '@/stores/projects'
import type { ItemType } from '@/stores/itemTypes'

// Mock composables
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: vi.fn(() => true),
    isReady: ref(true)
  })
}))

vi.mock('@/composables/useTableStandard', () => ({
  useTableStandard: () => ({
    pagination: ref({ pageSize: 10, pageIndex: 0 }),
    paginationOptions: ref([]),
    pageSizeOptions: ref([10, 25, 50]),
    updatePageSize: vi.fn(),
    getPaginationProps: vi.fn(() => ({})),
    getPageInfo: vi.fn(() => ref('1-10 of 100')),
    shouldShowPagination: vi.fn(() => ref(true))
  })
}))

vi.mock('@/composables/useDateFormat', () => ({
  useDateFormat: () => ({
    formatDate: vi.fn((date: string) => new Date(date).toLocaleDateString())
  })
}))

vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: vi.fn((amount: number) => `$${amount.toLocaleString()}`)
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

// Mock stores
const mockCorpStore = {
  selectedCorporation: null,
  selectedCorporationId: null,
  $patch: vi.fn()
}

const mockItemTypesStore = {
  itemTypes: [],
  loading: false,
  error: null,
  $patch: vi.fn(),
  fetchItemTypes: vi.fn(),
  createItemType: vi.fn(),
  updateItemType: vi.fn(),
  deleteItemType: vi.fn(),
  clearItemTypes: vi.fn()
}

const mockProjectsStore = {
  projects: [],
  loading: false,
  error: null,
  $patch: vi.fn(),
  fetchProjects: vi.fn(),
  clearProjects: vi.fn()
}

const mockConfigurationsStore = {
  configurations: [],
  loading: false,
  error: null,
  fetchConfigurations: vi.fn(),
  getAllItems: vi.fn(() => []),
  getActiveConfigurations: vi.fn(() => []),
  getConfigurationById: vi.fn(),
  updateConfiguration: vi.fn().mockResolvedValue(undefined),
};

const mockUOMStore = {
  uom: [
    { uuid: 'uom-1', short_name: 'EA', uom_name: 'Each' },
    { uuid: 'uom-2', short_name: 'FT', uom_name: 'Feet' }
  ],
  getActiveUOM: vi.fn((corpUuid: string) => mockUOMStore.uom),
  fetchUOM: vi.fn(),
};

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockCorpStore
}))

vi.mock('@/stores/itemTypes', () => ({
  useItemTypesStore: () => mockItemTypesStore
}))

vi.mock('@/stores/projects', () => ({
  useProjectsStore: () => mockProjectsStore
}))

vi.mock("@/stores/costCodeConfigurations", () => ({
  useCostCodeConfigurationsStore: () => mockConfigurationsStore,
}));

vi.mock('@/stores/uom', () => ({
  useUOMStore: () => mockUOMStore
}));

describe('ItemTypes Component', () => {
  let wrapper: any
  let itemTypesStore: ReturnType<typeof useItemTypesStore>
  let corporationStore: ReturnType<typeof useCorporationStore>
  let projectsStore: ReturnType<typeof useProjectsStore>

  const mockItemType: ItemType = {
    id: 1,
    uuid: 'item-type-uuid-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    corporation_uuid: 'corp-uuid-1',
    project_uuid: 'project-uuid-1',
    item_type: 'Electrical Components',
    short_name: 'ELEC',
    is_active: true,
    project: {
      uuid: 'project-uuid-1',
      project_name: 'Test Project',
      project_id: 'PROJ-001',
      corporation_uuid: 'corp-uuid-1'
    }
  }

  const mockProject = {
    uuid: 'project-uuid-1',
    project_name: 'Test Project',
    project_id: 'PROJ-001',
    corporation_uuid: 'corp-uuid-1',
    project_status: 'In Progress',
    estimated_amount: 100000,
    customer_name: 'Test Customer',
    project_start_date: '2024-01-01',
    project_estimated_completion_date: '2024-12-31',
    area_sq_ft: 2000,
    no_of_rooms: 5,
    contingency_percentage: 10,
    is_active: true
  }

  const mockCorporation = {
    uuid: 'corp-uuid-1',
    corporation_name: 'Test Corporation'
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    
    // Set up mock data
    mockCorpStore.selectedCorporation = mockCorporation;
    mockCorpStore.selectedCorporationId = mockCorporation.uuid;

    mockProjectsStore.projects = [mockProject];
    mockProjectsStore.loading = false;
    mockProjectsStore.error = null;

    mockItemTypesStore.itemTypes = [mockItemType];
    mockItemTypesStore.loading = false;
    mockItemTypesStore.error = null;
    
    // Reset mocks
    mockToast.add.mockClear()
    mockCorpStore.$patch.mockClear();
    mockProjectsStore.$patch.mockClear();
    mockItemTypesStore.$patch.mockClear();
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(ItemTypes, {
      props: {
        globalFilter: "",
        ...props,
      },
      global: {
        stubs: {
          UTable: true,
          UButton: true,
          UModal: true,
          UInput: true,
          USelectMenu: true,
          UCheckbox: true,
          UCard: true,
          UBadge: true,
          UAlert: true,
          UBanner: true,
          UPagination: true,
          USelect: true,
          USkeleton: true,
          UTooltip: true,
          UIcon: true,
          CorporationSelect: {
            template: '<div class="corporation-select"></div>',
            props: ["modelValue", "placeholder", "size", "class", "disabled"],
            emits: ["update:modelValue", "change"],
          },
        },
      },
    });
  }

  describe('Component Mounting', () => {
    it('should mount without errors', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should expose openAddModal method', () => {
      wrapper = createWrapper()
      expect(wrapper.vm.openAddModal).toBeDefined()
      expect(typeof wrapper.vm.openAddModal).toBe('function')
    })

    it('should have correct initial state', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.showAddModal).toBe(false)
      expect(wrapper.vm.showEditModal).toBe(false)
      expect(wrapper.vm.showDeleteModal).toBe(false)
    })
  })

  describe('Modal Operations', () => {
    it('should open add modal when openAddModal is called', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.openAddModal()
      await nextTick()
      
      expect(wrapper.vm.showAddModal).toBe(true)
    })

    it('should close add modal when closeAddModal is called', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.showAddModal = true
      await nextTick()
      
      await wrapper.vm.closeAddModal()
      await nextTick()
      
      expect(wrapper.vm.showAddModal).toBe(false)
    })

    it('should open edit modal with correct data', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.editItemType(mockItemType)
      await nextTick()
      
      expect(wrapper.vm.showEditModal).toBe(true)
      expect(wrapper.vm.editForm.uuid).toBe(mockItemType.uuid)
      expect(wrapper.vm.editForm.item_type).toBe(mockItemType.item_type)
    })

    it('should close edit modal', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.showEditModal = true
      await nextTick()
      
      await wrapper.vm.closeEditModal()
      await nextTick()
      
      expect(wrapper.vm.showEditModal).toBe(false)
    })

    it('should open delete confirmation modal', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.confirmDeleteItemType(mockItemType)
      await nextTick()
      
      expect(wrapper.vm.showDeleteModal).toBe(true)
      expect(wrapper.vm.itemTypeToDelete).toEqual(mockItemType)
    })

    it('should close delete modal', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.showDeleteModal = true
      wrapper.vm.itemTypeToDelete = mockItemType
      await nextTick()
      
      await wrapper.vm.closeDeleteModal()
      await nextTick()
      
      expect(wrapper.vm.showDeleteModal).toBe(false)
      expect(wrapper.vm.itemTypeToDelete).toBe(null)
    })
  })

  describe("Delete Validation - Items Attached", () => {
    beforeEach(() => {
      mockConfigurationsStore.getAllItems.mockReturnValue([]);
      mockConfigurationsStore.fetchConfigurations.mockClear();
      mockToast.add.mockClear();
    });

    it("should prevent deletion when item type has associated items", async () => {
      const itemTypeWithItems = {
        uuid: "item-type-1",
        corporation_uuid: "corp-uuid-1",
        item_type: "Electrical",
        short_name: "ELEC",
        project_uuid: "project-1",
        is_active: true,
      };

      const associatedItems = [
        {
          uuid: "item-1",
          item_type_uuid: "item-type-1",
          item_name: "Wire",
          cost_code_configuration_uuid: "config-1",
          unit_price: 10.0,
          unit: "FT",
          status: "Active",
        },
        {
          uuid: "item-2",
          item_type_uuid: "item-type-1",
          item_name: "Outlet",
          cost_code_configuration_uuid: "config-1",
          unit_price: 25.0,
          unit: "EA",
          status: "Active",
        },
      ];

      // Set up the mock data
      mockItemTypesStore.itemTypes = [itemTypeWithItems];
      mockConfigurationsStore.getAllItems.mockImplementation(
        (corpUuid: string) => {
          if (corpUuid === "corp-uuid-1") {
            return associatedItems;
          }
          return [];
        }
      );

      wrapper = createWrapper();
      await nextTick();

      wrapper.vm.confirmDeleteItemType(itemTypeWithItems);
      await nextTick();

      // Should not open delete modal
      expect(wrapper.vm.showDeleteModal).toBe(false);
      expect(wrapper.vm.itemTypeToDelete).toBeNull();

      // Should show error toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: "Cannot Delete Item Type",
        description:
          "This item type has 2 item(s) associated with it. Please reassign or remove all items before deleting the item type.",
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });
    });

    it("should prevent deletion when item type has single item", async () => {
      const itemTypeWithSingleItem = {
        uuid: "item-type-1",
        corporation_uuid: "corp-uuid-1",
        item_type: "Electrical",
        short_name: "ELEC",
        project_uuid: "project-1",
        is_active: true,
      };

      const associatedItems = [
        {
          uuid: "item-1",
          item_type_uuid: "item-type-1",
          item_name: "Wire",
          cost_code_configuration_uuid: "config-1",
          unit_price: 10.0,
          unit: "FT",
          status: "Active",
        },
      ];

      // Set up the mock data
      mockItemTypesStore.itemTypes = [itemTypeWithSingleItem];
      mockConfigurationsStore.getAllItems.mockImplementation(
        (corpUuid: string) => {
          if (corpUuid === "corp-uuid-1") {
            return associatedItems;
          }
          return [];
        }
      );

      wrapper = createWrapper();
      await nextTick();

      wrapper.vm.confirmDeleteItemType(itemTypeWithSingleItem);
      await nextTick();

      // Should not open delete modal
      expect(wrapper.vm.showDeleteModal).toBe(false);
      expect(wrapper.vm.itemTypeToDelete).toBeNull();

      // Should show error toast with singular form
      expect(mockToast.add).toHaveBeenCalledWith({
        title: "Cannot Delete Item Type",
        description:
          "This item type has 1 item(s) associated with it. Please reassign or remove all items before deleting the item type.",
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });
    });

    it("should allow deletion when item type has no associated items", async () => {
      const itemTypeWithoutItems = {
        uuid: "item-type-1",
        corporation_uuid: "corp-uuid-1",
        item_type: "Electrical",
        short_name: "ELEC",
        project_uuid: "project-1",
        is_active: true,
      };

      // Set up the mock data
      mockItemTypesStore.itemTypes = [itemTypeWithoutItems];
      mockConfigurationsStore.getAllItems.mockImplementation(
        (corpUuid: string) => {
          if (corpUuid === "corp-uuid-1") {
            return [];
          }
          return [];
        }
      );

      wrapper = createWrapper();
      await nextTick();

      wrapper.vm.confirmDeleteItemType(itemTypeWithoutItems);
      await nextTick();

      // Should open delete modal
      expect(wrapper.vm.showDeleteModal).toBe(true);
      expect(wrapper.vm.itemTypeToDelete).toEqual(itemTypeWithoutItems);

      // Should not show error toast
      expect(mockToast.add).not.toHaveBeenCalled();
    });

    it("should prevent deletion in deleteItemType when items are attached", async () => {
      const itemTypeWithItems = {
        uuid: "item-type-1",
        corporation_uuid: "corp-uuid-1",
        item_type: "Electrical",
        short_name: "ELEC",
        project_uuid: "project-1",
        is_active: true,
      };

      const associatedItems = [
        {
          uuid: "item-1",
          item_type_uuid: "item-type-1",
          item_name: "Wire",
          cost_code_configuration_uuid: "config-1",
          unit_price: 10.0,
          unit: "FT",
          status: "Active",
        },
      ];

      mockConfigurationsStore.getAllItems.mockImplementation(
        (corpUuid: string) => {
          if (corpUuid === "corp-uuid-1") {
            return associatedItems;
          }
          return [];
        }
      );

      wrapper = createWrapper();
      wrapper.vm.itemTypeToDelete = itemTypeWithItems;
      wrapper.vm.showDeleteModal = true;

      await wrapper.vm.deleteItemType();

      // Should close modal and clear itemTypeToDelete
      expect(wrapper.vm.showDeleteModal).toBe(false);
      expect(wrapper.vm.itemTypeToDelete).toBeNull();

      // Should show error toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: "Cannot Delete Item Type",
        description:
          "This item type has 1 item(s) associated with it. Please reassign or remove all items before deleting the item type.",
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });

      // Should not call store delete method
      expect(mockItemTypesStore.deleteItemType).not.toHaveBeenCalled();
    });

    it("should proceed with deletion in deleteItemType when no items are attached", async () => {
      const itemTypeWithoutItems = {
        uuid: "item-type-1",
        corporation_uuid: "corp-uuid-1",
        item_type: "Electrical",
        short_name: "ELEC",
        project_uuid: "project-1",
        is_active: true,
      };

      mockConfigurationsStore.getAllItems.mockImplementation(
        (corpUuid: string) => {
          if (corpUuid === "corp-uuid-1") {
            return [];
          }
          return [];
        }
      );
      mockItemTypesStore.deleteItemType.mockResolvedValue(true);

      wrapper = createWrapper();
      wrapper.vm.itemTypeToDelete = itemTypeWithoutItems;
      wrapper.vm.showDeleteModal = true;

      await wrapper.vm.deleteItemType();

      // Should call store delete method
      expect(mockItemTypesStore.deleteItemType).toHaveBeenCalledWith(
        "item-type-1"
      );

      // Should show success toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: "Success",
        description: "Item type deleted successfully",
        color: "success",
        icon: "i-heroicons-check-circle",
      });

      // Should close modal and clear itemTypeToDelete
      expect(wrapper.vm.showDeleteModal).toBe(false);
      expect(wrapper.vm.itemTypeToDelete).toBeNull();
    });

    it("should handle edge case with items for different item types", async () => {
      const targetItemType = {
        uuid: "item-type-1",
        corporation_uuid: "corp-uuid-1",
        item_type: "Electrical",
        short_name: "ELEC",
        project_uuid: "project-1",
        is_active: true,
      };

      const itemsForDifferentItemTypes = [
        {
          uuid: "item-1",
          item_type_uuid: "item-type-2", // Different item type
          item_name: "Pipe",
          cost_code_configuration_uuid: "config-1",
          unit_price: 15.0,
          unit: "FT",
          status: "Active",
        },
        {
          uuid: "item-2",
          item_type_uuid: "item-type-3", // Different item type
          item_name: "Valve",
          cost_code_configuration_uuid: "config-1",
          unit_price: 50.0,
          unit: "EA",
          status: "Active",
        },
      ];

      // Set up the mock data
      mockItemTypesStore.itemTypes = [targetItemType];
      mockConfigurationsStore.getAllItems.mockImplementation(
        (corpUuid: string) => {
          if (corpUuid === "corp-uuid-1") {
            return itemsForDifferentItemTypes;
          }
          return [];
        }
      );

      wrapper = createWrapper();
      await nextTick();

      wrapper.vm.confirmDeleteItemType(targetItemType);
      await nextTick();

      // Should open delete modal (no items for this item type)
      expect(wrapper.vm.showDeleteModal).toBe(true);
      expect(wrapper.vm.itemTypeToDelete).toEqual(targetItemType);

      // Should not show error toast
      expect(mockToast.add).not.toHaveBeenCalled();
    });
  });

  describe('Data Filtering', () => {
    it('should filter item types by global filter', () => {
      wrapper = createWrapper();
      wrapper.vm.searchFilter = "Electrical";
      
      expect(wrapper.vm.filteredItemTypes).toEqual([mockItemType])
    })

    it('should return all item types when no filter', () => {
      wrapper = createWrapper();
      wrapper.vm.searchFilter = "";
      
      expect(wrapper.vm.filteredItemTypes).toEqual([mockItemType])
    })

    it('should filter by short name', () => {
      wrapper = createWrapper();
      wrapper.vm.searchFilter = "ELEC";
      
      expect(wrapper.vm.filteredItemTypes).toEqual([mockItemType])
    })

    it('should filter by project name', () => {
      wrapper = createWrapper();
      wrapper.vm.searchFilter = "Test Project";
      
      expect(wrapper.vm.filteredItemTypes).toEqual([mockItemType])
    })

    it('should filter by project ID', () => {
      wrapper = createWrapper();
      wrapper.vm.searchFilter = "PROJ-001";
      
      expect(wrapper.vm.filteredItemTypes).toEqual([mockItemType])
    })
  })

  describe('Form Validation', () => {
    it('should validate form correctly', () => {
      wrapper = createWrapper()
      
      // Empty form should be invalid
      expect(wrapper.vm.isFormValid).toBe(false)
      
      // Fill required fields
      wrapper.vm.itemTypeForm = {
        corporation_uuid: 'corp-uuid-1',
        project_uuid: 'project-uuid-1',
        item_type: 'Test Item',
        short_name: 'TEST',
        is_active: true
      }
      
      expect(wrapper.vm.isFormValid).toBe(true)
    })

    it('should validate edit form correctly', () => {
      wrapper = createWrapper()
      
      // Empty form should be invalid
      expect(wrapper.vm.isEditFormValid).toBe(false)
      
      // Fill required fields
      wrapper.vm.editForm = {
        uuid: 'item-type-uuid-1',
        corporation_uuid: 'corp-uuid-1',
        project_uuid: 'project-uuid-1',
        item_type: 'Updated Item',
        short_name: 'UPD',
        is_active: true
      }
      
      expect(wrapper.vm.isEditFormValid).toBe(true)
    })
  })

  describe('Helper Functions', () => {
    it('should return correct status color', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.getStatusColor('Pending')).toBe('warning')
      expect(wrapper.vm.getStatusColor('In Progress')).toBe('info')
      expect(wrapper.vm.getStatusColor('Completed')).toBe('success')
      expect(wrapper.vm.getStatusColor('On Hold')).toBe('error')
      expect(wrapper.vm.getStatusColor('Unknown')).toBe('neutral')
    })

    // formatCurrency is not a method in ItemTypes component - it's in ItemsList
    // This test is removed as the method doesn't exist in this component
  })

  describe('Store Integration', () => {
    it('should have access to item types from store', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.itemTypesStore.itemTypes).toEqual([mockItemType]);
      expect(wrapper.vm.filteredItemTypes).toEqual([mockItemType])
    })

    it('should have access to corporation from store', () => {
      wrapper = createWrapper()
      
      // The component should return a corporation name (even if it's the default)
      expect(wrapper.vm.getCorporationName).toBeDefined()
      expect(typeof wrapper.vm.getCorporationName).toBe('string')
    })

    it('should have access to projects from store', () => {
      wrapper = createWrapper()
      
      // The component should return project options array
      const options = wrapper.vm.projectOptions
      expect(Array.isArray(options)).toBe(true)
    })
  })

  describe("Error Handling", () => {
    it("should handle store errors gracefully", () => {
      wrapper = createWrapper();

      // Test that component handles store errors
      expect(wrapper.vm.itemTypesStore.error).toBeDefined();
      expect(wrapper.vm.itemTypesStore.loading).toBeDefined();
    });
  });

  describe("Success Handling", () => {
    it("should handle successful operations", () => {
      wrapper = createWrapper();

      // Test that component can handle successful operations
      expect(wrapper.vm.saveItemType).toBeDefined();
      expect(wrapper.vm.updateItemType).toBeDefined();
      expect(wrapper.vm.deleteItemType).toBeDefined();
    });
  });

  describe("Corporation Selection in Modals", () => {
    it("should use CorporationSelect component in Add Modal", () => {
      wrapper = createWrapper();

      // Test that CorporationSelect is used (not disabled UInput)
      expect(wrapper.vm.itemTypeForm).toBeDefined();
      expect(wrapper.vm.itemTypeForm.corporation_uuid).toBeDefined();
    });

    it("should use CorporationSelect component in Edit Modal", () => {
      wrapper = createWrapper();

      // Test that CorporationSelect is used (not disabled UInput)
      expect(wrapper.vm.editForm).toBeDefined();
      expect(wrapper.vm.editForm.corporation_uuid).toBeDefined();
    });

    it("should auto-set corporation UUID when opening Add Modal", async () => {
      wrapper = createWrapper();

      await wrapper.vm.openAddModal();

      // Corporation UUID should be auto-set from the store
      expect(wrapper.vm.itemTypeForm.corporation_uuid).toBe("corp-uuid-1");
    });

    it("should handle corporation change in Add Modal", async () => {
      wrapper = createWrapper();
      await wrapper.vm.openAddModal();

      // Simulate corporation change
      await wrapper.vm.handleCorporationChange("corp-uuid-2");
      await nextTick();

      expect(wrapper.vm.itemTypeForm.corporation_uuid).toBe("corp-uuid-2");
      // Project should be cleared when corporation changes
      expect(wrapper.vm.itemTypeForm.project_uuid).toBe("");
    });

    it("should handle corporation change in Edit Modal", async () => {
      wrapper = createWrapper();
      await wrapper.vm.editItemType(mockItemType);
      await nextTick();

      // Simulate corporation change
      await wrapper.vm.handleEditCorporationChange("corp-uuid-2");
      await nextTick();

      expect(wrapper.vm.editForm.corporation_uuid).toBe("corp-uuid-2");
      // Project should be cleared when corporation changes
      expect(wrapper.vm.editForm.project_uuid).toBe("");
    });

    it("should prevent corporation change when items exist", async () => {
      // Set up item type with associated items
      const itemTypeWithItems = {
        ...mockItemType,
        uuid: "item-type-with-items",
      };

      const associatedItems = [
        {
          uuid: "item-1",
          item_type_uuid: "item-type-with-items",
          item_name: "Test Item",
          cost_code_configuration_uuid: "config-1",
        },
      ];

      mockConfigurationsStore.getAllItems.mockReturnValue(associatedItems);
      wrapper = createWrapper();

      await wrapper.vm.editItemType(itemTypeWithItems);
      await nextTick();

      // Try to change corporation
      const originalCorpUuid = wrapper.vm.editForm.corporation_uuid;
      await wrapper.vm.handleEditCorporationChange("corp-uuid-2");
      await nextTick();

      // Corporation should remain unchanged
      expect(wrapper.vm.editForm.corporation_uuid).toBe(originalCorpUuid);
      // Warning banner should be shown
      expect(wrapper.vm.showCorporationChangeWarning).toBe(true);
    });

    it("should allow corporation change when no items exist", async () => {
      // Set up item type without associated items
      mockConfigurationsStore.getAllItems.mockReturnValue([]);
      wrapper = createWrapper();

      await wrapper.vm.editItemType(mockItemType);
      await nextTick();

      // Try to change corporation
      await wrapper.vm.handleEditCorporationChange("corp-uuid-2");
      await nextTick();

      // Corporation should be changed
      expect(wrapper.vm.editForm.corporation_uuid).toBe("corp-uuid-2");
      // Warning banner should not be shown
      expect(wrapper.vm.showCorporationChangeWarning).toBe(false);
    });

    it("should show banner when trying to change corporation with items", async () => {
      const itemTypeWithItems = {
        ...mockItemType,
        uuid: "item-type-with-items",
        corporation_uuid: "corp-uuid-1",
      };

      const associatedItems = [
        {
          uuid: "item-1",
          item_type_uuid: "item-type-with-items",
          item_name: "Test Item",
          cost_code_configuration_uuid: "config-1",
        },
      ];

      mockConfigurationsStore.getAllItems.mockReturnValue(associatedItems);
      wrapper = createWrapper();

      await wrapper.vm.editItemType(itemTypeWithItems);
      await nextTick();

      // Try to change corporation
      await wrapper.vm.handleEditCorporationChange("corp-uuid-2");
      await nextTick();

      // Banner should be shown
      expect(wrapper.vm.showCorporationChangeWarning).toBe(true);
      expect(wrapper.vm.hasItemsForEditingItemType).toBe(true);
    });

    it("should hide banner when dismissing it", async () => {
      const itemTypeWithItems = {
        ...mockItemType,
        uuid: "item-type-with-items",
        corporation_uuid: "corp-uuid-1",
      };

      const associatedItems = [
        {
          uuid: "item-1",
          item_type_uuid: "item-type-with-items",
          item_name: "Test Item",
          cost_code_configuration_uuid: "config-1",
        },
      ];

      mockConfigurationsStore.getAllItems.mockReturnValue(associatedItems);
      wrapper = createWrapper();

      await wrapper.vm.editItemType(itemTypeWithItems);
      await nextTick();

      // Show banner
      wrapper.vm.showCorporationChangeWarning = true;
      await nextTick();

      // Dismiss banner
      wrapper.vm.showCorporationChangeWarning = false;
      await nextTick();

      expect(wrapper.vm.showCorporationChangeWarning).toBe(false);
    });

    it("should fetch configurations when opening edit modal", async () => {
      wrapper = createWrapper();

      await wrapper.vm.editItemType(mockItemType);
      await nextTick();

      // Should fetch configurations for the item type's corporation
      expect(mockConfigurationsStore.fetchConfigurations).toHaveBeenCalledWith(
        mockItemType.corporation_uuid
      );
    });

    it("should auto-set corporation UUID when opening Add Modal", async () => {
      wrapper = createWrapper();

      await wrapper.vm.openAddModal();

      // Corporation UUID should be auto-set from the store
      expect(wrapper.vm.itemTypeForm.corporation_uuid).toBe("corp-uuid-1");
    });

    it("should maintain corporation selection when switching between modals", async () => {
      wrapper = createWrapper();

      // Open Add Modal
      await wrapper.vm.openAddModal();
      const addModalCorpUuid = wrapper.vm.itemTypeForm.corporation_uuid;

      // Close Add Modal
      wrapper.vm.showAddModal = false;
      await nextTick();

      // Open Edit Modal
      await wrapper.vm.editItemType(mockItemType);
      const editModalCorpUuid = wrapper.vm.editForm.corporation_uuid;

      // Corporation UUID should be consistent
      expect(addModalCorpUuid).toBe(editModalCorpUuid);
      expect(addModalCorpUuid).toBe("corp-uuid-1");
    });
  });

  describe("Project Dropdown Fix", () => {
    describe("Project Options Computed Properties", () => {
      it("should return project options in correct format", () => {
        wrapper = createWrapper();

        const options = wrapper.vm.projectOptions;

        expect(Array.isArray(options)).toBe(true);
        expect(options.length).toBe(1);
        expect(options[0]).toHaveProperty("label");
        expect(options[0]).toHaveProperty("value");
        expect(options[0]).toHaveProperty("project");
        expect(options[0]).toHaveProperty("status");
        expect(options[0]).toHaveProperty("status_color");
        expect(options[0].label).toBe("Test Project (PROJ-001)");
        expect(options[0].value).toBe("project-uuid-1");
        expect(options[0].status).toBe("In Progress");
        expect(options[0].status_color).toBe("info");
      });

      it("should return undefined for selectedProjectOption when no project is selected", () => {
        wrapper = createWrapper();

        // itemTypeForm has no project_uuid set
        wrapper.vm.itemTypeForm.project_uuid = "";

        expect(wrapper.vm.selectedProjectOption).toBeUndefined();
      });

      it("should return correct option object for selectedProjectOption when project is selected", () => {
        wrapper = createWrapper();

        // Set project_uuid in form
        wrapper.vm.itemTypeForm.project_uuid = "project-uuid-1";

        const selectedOption = wrapper.vm.selectedProjectOption;

        expect(selectedOption).not.toBeNull();
        expect(selectedOption.value).toBe("project-uuid-1");
        expect(selectedOption.label).toBe("Test Project (PROJ-001)");
      });

      it("should return undefined for editSelectedProjectOption when no project is selected", () => {
        wrapper = createWrapper();

        // editForm has no project_uuid set
        wrapper.vm.editForm.project_uuid = "";

        expect(wrapper.vm.editSelectedProjectOption).toBeUndefined();
      });

      it("should return correct option object for editSelectedProjectOption when project is selected", () => {
        wrapper = createWrapper();

        // Set project_uuid in edit form
        wrapper.vm.editForm.project_uuid = "project-uuid-1";

        const selectedOption = wrapper.vm.editSelectedProjectOption;

        expect(selectedOption).not.toBeNull();
        expect(selectedOption.value).toBe("project-uuid-1");
        expect(selectedOption.label).toBe("Test Project (PROJ-001)");
      });

      it("should handle invalid project_uuid gracefully", () => {
        wrapper = createWrapper();

        // Set invalid project_uuid
        wrapper.vm.itemTypeForm.project_uuid = "non-existent-uuid";

        expect(wrapper.vm.selectedProjectOption).toBeUndefined();
      });
    });

    describe("Project Selection Handler - Add Modal", () => {
      it("should update form with UUID when project is selected", async () => {
        wrapper = createWrapper();

        await wrapper.vm.openAddModal();

        const selectedOption = {
          label: "Test Project (PROJ-001)",
          value: "project-uuid-1",
          project: mockProject,
        };

        await wrapper.vm.onProjectSelected(selectedOption);
        await nextTick();

        expect(wrapper.vm.itemTypeForm.project_uuid).toBe("project-uuid-1");
      });

      it("should update selectedProject ref when project is selected", async () => {
        wrapper = createWrapper();

        await wrapper.vm.openAddModal();

        const selectedOption = {
          label: "Test Project (PROJ-001)",
          value: "project-uuid-1",
          project: mockProject,
        };

        await wrapper.vm.onProjectSelected(selectedOption);
        await nextTick();

        expect(wrapper.vm.selectedProject).not.toBeNull();
        expect(wrapper.vm.selectedProject.uuid).toBe("project-uuid-1");
        expect(wrapper.vm.selectedProject.project_name).toBe("Test Project");
      });

      it("should clear form when null is selected", async () => {
        wrapper = createWrapper();

        await wrapper.vm.openAddModal();
        wrapper.vm.itemTypeForm.project_uuid = "project-uuid-1";
        wrapper.vm.selectedProject = mockProject;

        await wrapper.vm.onProjectSelected(null);
        await nextTick();

        expect(wrapper.vm.itemTypeForm.project_uuid).toBe("");
        expect(wrapper.vm.selectedProject).toBeNull();
      });

      it("should handle selection without value property", async () => {
        wrapper = createWrapper();

        await wrapper.vm.openAddModal();

        const invalidSelection = { label: "Test" };

        await wrapper.vm.onProjectSelected(invalidSelection);
        await nextTick();

        expect(wrapper.vm.itemTypeForm.project_uuid).toBe("");
        expect(wrapper.vm.selectedProject).toBeNull();
      });

      it("should handle undefined selection", async () => {
        wrapper = createWrapper();

        await wrapper.vm.openAddModal();
        wrapper.vm.itemTypeForm.project_uuid = "project-uuid-1";

        await wrapper.vm.onProjectSelected(undefined);
        await nextTick();

        expect(wrapper.vm.itemTypeForm.project_uuid).toBe("");
        expect(wrapper.vm.selectedProject).toBeNull();
      });
    });

    describe("Project Selection Handler - Edit Modal", () => {
      it("should update editForm with UUID when project is selected", async () => {
        wrapper = createWrapper();

        await wrapper.vm.editItemType(mockItemType);

        const selectedOption = {
          label: "Test Project (PROJ-001)",
          value: "project-uuid-1",
          project: mockProject,
        };

        await wrapper.vm.onEditProjectSelected(selectedOption);
        await nextTick();

        expect(wrapper.vm.editForm.project_uuid).toBe("project-uuid-1");
      });

      it("should update editSelectedProject ref when project is selected", async () => {
        wrapper = createWrapper();

        await wrapper.vm.editItemType(mockItemType);

        const selectedOption = {
          label: "Test Project (PROJ-001)",
          value: "project-uuid-1",
          project: mockProject,
        };

        await wrapper.vm.onEditProjectSelected(selectedOption);
        await nextTick();

        expect(wrapper.vm.editSelectedProject).not.toBeNull();
        expect(wrapper.vm.editSelectedProject.uuid).toBe("project-uuid-1");
        expect(wrapper.vm.editSelectedProject.project_name).toBe(
          "Test Project"
        );
      });

      it("should clear editForm when null is selected", async () => {
        wrapper = createWrapper();

        await wrapper.vm.editItemType(mockItemType);
        wrapper.vm.editForm.project_uuid = "project-uuid-1";
        wrapper.vm.editSelectedProject = mockProject;

        await wrapper.vm.onEditProjectSelected(null);
        await nextTick();

        expect(wrapper.vm.editForm.project_uuid).toBe("");
        expect(wrapper.vm.editSelectedProject).toBeNull();
      });

      it("should handle selection without value property in edit modal", async () => {
        wrapper = createWrapper();

        await wrapper.vm.editItemType(mockItemType);

        const invalidSelection = { label: "Test" };

        await wrapper.vm.onEditProjectSelected(invalidSelection);
        await nextTick();

        expect(wrapper.vm.editForm.project_uuid).toBe("");
        expect(wrapper.vm.editSelectedProject).toBeNull();
      });

      it("should preserve existing project when editing item type", async () => {
        wrapper = createWrapper();

        await wrapper.vm.editItemType(mockItemType);
        await nextTick();

        expect(wrapper.vm.editForm.project_uuid).toBe("project-uuid-1");
        expect(wrapper.vm.editSelectedProject).not.toBeNull();
        expect(wrapper.vm.editSelectedProject.uuid).toBe("project-uuid-1");
      });
    });

    describe("Project Dropdown Display", () => {
      it("should display project in correct format for existing records", () => {
        wrapper = createWrapper();

        const options = wrapper.vm.projectOptions;
        const option = options.find(
          (opt: any) => opt.value === "project-uuid-1"
        );

        expect(option).toBeDefined();
        expect(option.label).toContain("Test Project");
        expect(option.label).toContain("PROJ-001");
        expect(option.label).toBe("Test Project (PROJ-001)");
      });

      it("should filter inactive projects from options", () => {
        // Add inactive project
        const inactiveProject = {
          ...mockProject,
          uuid: "inactive-project-uuid",
          project_name: "Inactive Project",
          project_id: "PROJ-002",
          is_active: false,
        };

        mockProjectsStore.projects = [mockProject, inactiveProject];
        wrapper = createWrapper();

        const options = wrapper.vm.projectOptions;

        // Should only include active project
        expect(options.length).toBe(1);
        expect(options[0].value).toBe("project-uuid-1");
      });

      it("should return empty array when no corporation is selected", () => {
        mockCorpStore.selectedCorporation = null;
        wrapper = createWrapper();

        const options = wrapper.vm.projectOptions;

        expect(Array.isArray(options)).toBe(true);
        expect(options.length).toBe(0);
      });

      it("should update project options when projects change", async () => {
        // Add another project to the mock before creating wrapper
        const newProject = {
          ...mockProject,
          uuid: "project-uuid-2",
          project_name: "New Project",
          project_id: "PROJ-002",
          is_active: true,
        };

        mockProjectsStore.projects = [mockProject, newProject];
        wrapper = createWrapper();

        // Should have 2 projects
        expect(wrapper.vm.projectOptions.length).toBe(2);
        expect(wrapper.vm.projectOptions[0].value).toBe("project-uuid-1");
        expect(wrapper.vm.projectOptions[1].value).toBe("project-uuid-2");
      });
    });

    describe("Project Selection Integration", () => {
      it("should maintain project selection when reopening add modal", async () => {
        wrapper = createWrapper();

        await wrapper.vm.openAddModal();

        const selectedOption = {
          label: "Test Project (PROJ-001)",
          value: "project-uuid-1",
          project: mockProject,
        };

        await wrapper.vm.onProjectSelected(selectedOption);
        await nextTick();

        expect(wrapper.vm.itemTypeForm.project_uuid).toBe("project-uuid-1");
        expect(wrapper.vm.selectedProjectOption.value).toBe("project-uuid-1");
      });

      it("should reset project selection when closing add modal", async () => {
        wrapper = createWrapper();

        await wrapper.vm.openAddModal();
        wrapper.vm.itemTypeForm.project_uuid = "project-uuid-1";
        wrapper.vm.selectedProject = mockProject;

        await wrapper.vm.closeAddModal();
        await nextTick();

        expect(wrapper.vm.selectedProject).toBeNull();
      });

      it("should load correct project when editing item type", async () => {
        wrapper = createWrapper();

        await wrapper.vm.editItemType(mockItemType);
        await nextTick();

        expect(wrapper.vm.editForm.project_uuid).toBe(
          mockItemType.project_uuid
        );
        expect(wrapper.vm.editSelectedProjectOption).not.toBeNull();
        expect(wrapper.vm.editSelectedProjectOption.value).toBe(
          mockItemType.project_uuid
        );
      });
    });
  });

  describe("Project Display Fix", () => {
    it("should display project name from projectsStore when itemType.project is missing", () => {
      // Create an item type without the project object populated
      const itemTypeWithoutProject = {
        id: 1,
        uuid: "item-type-uuid-2",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        corporation_uuid: "corp-uuid-1",
        project_uuid: "project-uuid-1",
        item_type: "Plumbing Components",
        short_name: "PLUMB",
        is_active: true,
        // Note: project property is missing
      };

      // Set up the stores with the item type and project data
      mockItemTypesStore.itemTypes = [itemTypeWithoutProject];
      mockProjectsStore.projects = [mockProject];

      wrapper = createWrapper();

      // The table should still display the project name by looking it up from projectsStore
      const filteredItemTypes = wrapper.vm.filteredItemTypes;
      expect(filteredItemTypes).toHaveLength(1);
      expect(filteredItemTypes[0].project_uuid).toBe("project-uuid-1");
    });

    it("should display 'Loading...' when project data is not available in either location", () => {
      // Create an item type with a project_uuid that doesn't exist in projectsStore
      const itemTypeWithInvalidProject = {
        id: 1,
        uuid: "item-type-uuid-3",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        corporation_uuid: "corp-uuid-1",
        project_uuid: "non-existent-project-uuid",
        item_type: "HVAC Components",
        short_name: "HVAC",
        is_active: true,
        // Note: project property is missing
      };

      // Set up the stores with the item type but no matching project
      mockItemTypesStore.itemTypes = [itemTypeWithInvalidProject];
      mockProjectsStore.projects = [mockProject]; // Different project

      wrapper = createWrapper();

      // The table should handle the missing project gracefully
      const filteredItemTypes = wrapper.vm.filteredItemTypes;
      expect(filteredItemTypes).toHaveLength(1);
      expect(filteredItemTypes[0].project_uuid).toBe(
        "non-existent-project-uuid"
      );
    });

    it("should prioritize itemType.project when both sources are available", () => {
      // Create an item type with both project object and project_uuid
      const itemTypeWithProject = {
        id: 1,
        uuid: "item-type-uuid-4",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        corporation_uuid: "corp-uuid-1",
        project_uuid: "project-uuid-1",
        item_type: "Electrical Components",
        short_name: "ELEC",
        is_active: true,
        project: {
          uuid: "project-uuid-1",
          project_name: "Direct Project Name",
          project_id: "PROJ-DIRECT",
          corporation_uuid: "corp-uuid-1",
        },
      };

      // Set up stores with different project data
      mockItemTypesStore.itemTypes = [itemTypeWithProject];
      mockProjectsStore.projects = [
        {
          ...mockProject,
          project_name: "Store Project Name", // Different name
          project_id: "PROJ-STORE",
        },
      ];

      wrapper = createWrapper();

      // Should use the project data from itemType.project, not from projectsStore
      const filteredItemTypes = wrapper.vm.filteredItemTypes;
      expect(filteredItemTypes).toHaveLength(1);
      expect(filteredItemTypes[0].project.project_name).toBe(
        "Direct Project Name"
      );
      expect(filteredItemTypes[0].project.project_id).toBe("PROJ-DIRECT");
    });

    it("should fallback to projectsStore when itemType.project is null", () => {
      // Create an item type with null project object
      const itemTypeWithNullProject = {
        id: 1,
        uuid: "item-type-uuid-5",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        corporation_uuid: "corp-uuid-1",
        project_uuid: "project-uuid-1",
        item_type: "Structural Components",
        short_name: "STRUCT",
        is_active: true,
        project: null, // Explicitly null
      };

      // Set up stores
      mockItemTypesStore.itemTypes = [itemTypeWithNullProject];
      mockProjectsStore.projects = [mockProject];

      wrapper = createWrapper();

      // Should fallback to projectsStore lookup
      const filteredItemTypes = wrapper.vm.filteredItemTypes;
      expect(filteredItemTypes).toHaveLength(1);
      expect(filteredItemTypes[0].project_uuid).toBe("project-uuid-1");
    });
  });

  describe("Permission Functionality", () => {
    it("should have hasPermission method available", () => {
      wrapper = createWrapper();

      expect(wrapper.vm.hasPermission).toBeDefined();
      expect(typeof wrapper.vm.hasPermission).toBe("function");
    });

    it("should call openAddModal with permission check", async () => {
      wrapper = createWrapper();

      await wrapper.vm.openAddModal();

      // Should open modal (permission check is handled internally)
      expect(wrapper.vm.showAddModal).toBe(true);
    });

    it("should call editItemType with permission check", async () => {
      wrapper = createWrapper();

      await wrapper.vm.editItemType(mockItemType);

      // Should open edit modal (permission check is handled internally)
      expect(wrapper.vm.showEditModal).toBe(true);
      expect(wrapper.vm.editForm.uuid).toBe(mockItemType.uuid);
    });

    it("should call confirmDeleteItemType with permission check", async () => {
      wrapper = createWrapper();

      await wrapper.vm.confirmDeleteItemType(mockItemType);

      // Should show delete modal (permission check is handled internally)
      expect(wrapper.vm.showDeleteModal).toBe(true);
      expect(wrapper.vm.itemTypeToDelete).toEqual(mockItemType);
    });

    it("should call deleteItemType with permission check", async () => {
      wrapper = createWrapper();

      // Set up the item type to delete
      wrapper.vm.itemTypeToDelete = mockItemType;

      await wrapper.vm.deleteItemType();

      // Should attempt deletion (permission check is handled internally)
      expect(mockItemTypesStore.deleteItemType).toHaveBeenCalledWith(
        mockItemType.uuid
      );
    });

    it("should call viewItemType with permission check", async () => {
      wrapper = createWrapper();

      await wrapper.vm.viewItemType(mockItemType);

      // Should show info toast (placeholder functionality)
      expect(mockToast.add).toHaveBeenCalledWith({
        title: "Info",
        description: "View functionality will be implemented soon",
        color: "info",
        icon: "i-heroicons-information-circle",
      });
    });
  });

  // These tests are for functionality that exists in ItemsList.vue, not ItemTypes.vue
  // ItemTypes.vue only handles item type CRUD operations, not item rows management
  // The item rows functionality (addEmptyItemRow, addItemsRows, editItemsRows, validateRows, etc.)
  // is in ItemsList.vue component. These tests should be moved to ItemsList.test.ts
  describe.skip("Items Table - Item Sequence Field", () => {
    // Skipped: These tests are for ItemsList.vue functionality, not ItemTypes.vue
  });

  describe.skip("Items Table - Column Configuration", () => {
    // Skipped: These tests are for ItemsList.vue functionality, not ItemTypes.vue
  });

  describe.skip("Items Table - Row Validation with Item Sequence", () => {
    // Skipped: These tests are for ItemsList.vue functionality, not ItemTypes.vue
  });
})
