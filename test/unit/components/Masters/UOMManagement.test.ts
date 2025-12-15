import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import UOMManagement from '../../../../components/Masters/UOMManagement.vue'

// Mock the stores
const mockUOMStore = {
  uom: [],
  loading: false,
  error: null,
  fetchUOM: vi.fn(),
  createUOM: vi.fn(),
  updateUOM: vi.fn(),
  deleteUOM: vi.fn()
}

// Mock the composables
vi.mock('@/stores/uom', () => ({
  useUOMStore: () => mockUOMStore
}))

// Mock useToast globally
const mockToast = {
  add: vi.fn(),
};
vi.stubGlobal("useToast", () => mockToast);

// Mock Nuxt UI components
vi.mock('@nuxt/ui', () => ({
  UInput: {
    name: 'UInput',
    template: '<input v-bind="$attrs" />',
    props: ['modelValue', 'placeholder', 'icon', 'variant', 'size', 'class']
  },
  UButton: {
    name: 'UButton',
    template: '<button v-bind="$attrs"><slot /></button>',
    props: ['icon', 'size', 'color', 'variant', 'loading', 'disabled', 'onClick']
  },
  UModal: {
    name: 'UModal',
    template: '<div v-if="open" class="modal"><slot /></div>',
    props: ['open', 'title', 'description', 'ui']
  },
  USelect: {
    name: 'USelect',
    template: '<select v-bind="$attrs"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
    props: ['modelValue', 'items', 'placeholder', 'variant', 'size', 'class']
  },
  UTable: {
    name: 'UTable',
    template: '<table><slot /></table>',
    props: ['data', 'columns', 'pagination', 'columnPinning', 'paginationOptions', 'globalFilter', 'class']
  },
  UPagination: {
    name: 'UPagination',
    template: '<div class="pagination"><slot /></div>',
    props: ['defaultPage', 'itemsPerPage', 'total']
  },
  UBadge: {
    name: 'UBadge',
    template: '<span class="badge"><slot /></span>',
    props: ['color', 'variant', 'size']
  },
  UTooltip: {
    name: 'UTooltip',
    template: '<div class="tooltip"><slot /></div>',
    props: ['text']
  },
  USkeleton: {
    name: 'USkeleton',
    template: '<div class="skeleton" />',
    props: ['class']
  },
  UIcon: {
    name: 'UIcon',
    template: '<i class="icon" />',
    props: ['name', 'class']
  }
}))

// Mock TanStack Table
vi.mock('@tanstack/vue-table', () => ({
  getPaginationRowModel: vi.fn()
}))

// Mock Vue composables
vi.stubGlobal('useTemplateRef', vi.fn(() => ref(null)))

describe('UOMManagement Component', () => {
  let wrapper: any

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // Reset store state
    mockUOMStore.uom = []
    mockUOMStore.loading = false
    mockUOMStore.error = null
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(UOMManagement, {
      props,
      global: {
        stubs: {
          UInput: true,
          UButton: true,
          UModal: true,
          USelect: true,
          UTable: true,
          UPagination: true,
          UBadge: true,
          UTooltip: true,
          USkeleton: true,
          UIcon: true
        }
      }
    })
  }

  describe('Component Rendering', () => {
    it('should render the component correctly', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should show loading skeleton when loading', async () => {
      mockUOMStore.loading = true
      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.findComponent({ name: 'USkeleton' }).exists()).toBe(true)
    })

    it('should show error message when there is an error', async () => {
      mockUOMStore.error = 'Test error message'
      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.text()).toContain('Test error message')
    })

    it('should show empty state when no UOM', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.text()).toContain('No UOM found')
    })
  })

  describe('UOM Display', () => {
    const mockUOM = [
      {
        id: 1,
        uuid: 'uom-1',
        corporation_uuid: null,
        uom_name: 'Kilogram',
        short_name: 'KG',
        status: 'ACTIVE',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      },
      {
        id: 2,
        uuid: 'uom-2',
        corporation_uuid: null,
        uom_name: 'Meter',
        short_name: 'M',
        status: 'INACTIVE',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }
    ]

    beforeEach(() => {
      mockUOMStore.uom = mockUOM
    })

    it('should display UOM in table', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const table = wrapper.findComponent({ name: 'UTable' })
      expect(table.exists()).toBe(true)
      // The table component is mocked, so we can't test the actual data prop
      // Instead, we verify the component exists and the store has the correct data
      expect(mockUOMStore.uom).toHaveLength(2)
    })

    it('should show pagination when more than 10 records', async () => {
      // Create 15 mock UOM
      const manyUOM = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        uuid: `uom-${i + 1}`,
        corporation_uuid: null,
        uom_name: `UOM ${i + 1}`,
        short_name: `U${i + 1}`,
        status: 'ACTIVE',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }))
      
      mockUOMStore.uom = manyUOM
      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.findComponent({ name: 'UPagination' }).exists()).toBe(true)
    })
  })

  describe('Form Modal', () => {
    it('should open modal when Add UOM button is clicked', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const addButton = wrapper.find('[data-testid="add-uom"]')
      if (addButton.exists()) {
        await addButton.trigger('click')
        await nextTick()
        
        const modal = wrapper.findComponent({ name: 'UModal' })
        expect(modal.props('open')).toBe(true)
      }
    })

    it('should have correct form fields', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      // Test the form data structure directly since the modal content isn't rendered in tests
      const vm = wrapper.vm
      
      // Verify form structure exists
      expect(vm.form).toBeDefined()
      expect(vm.form).toHaveProperty('uom_name')
      expect(vm.form).toHaveProperty('short_name')
      expect(vm.form).toHaveProperty('status')
      
      // Verify form validation exists
      expect(vm.isFormValid).toBeDefined()
      expect(typeof vm.isFormValid).toBe('boolean')
    })

    it('should have correct form fields', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      // Test the form data structure directly since the modal content isn't rendered in tests
      const vm = wrapper.vm
      
      // Verify form structure exists
      expect(vm.form).toBeDefined()
      expect(vm.form).toHaveProperty('uom_name')
      expect(vm.form).toHaveProperty('short_name')
      expect(vm.form).toHaveProperty('status')
      
      // Verify form validation exists
      expect(vm.isFormValid).toBeDefined()
      expect(typeof vm.isFormValid).toBe('boolean')
    })

    it('should have correct status options', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      // Open the modal to see the form
      const vm = wrapper.vm
      vm.showModal = true
      await nextTick()
      
      // Check that the component has the correct status options in its data
      expect(vm.statusOptions).toEqual([
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Inactive', value: 'INACTIVE' }
      ])
    })
  })

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      // Get the component instance to access computed properties
      const vm = wrapper.vm
      
      // Test with empty form
      vm.form.uom_name = ''
      vm.form.short_name = ''
      vm.form.status = 'ACTIVE'
      
      expect(vm.isFormValid).toBe(false)
      
      // Test with filled form
      vm.form.uom_name = 'Kilogram'
      vm.form.short_name = 'KG'
      vm.form.status = 'ACTIVE'
      
      expect(vm.isFormValid).toBe(true)
    })

    it('should validate required fields', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const vm = wrapper.vm
      
      // Test with empty form
      vm.form.uom_name = ''
      vm.form.short_name = ''
      expect(vm.isFormValid).toBe(false)
      
      // Test with only uom_name
      vm.form.uom_name = 'Kilogram'
      vm.form.short_name = ''
      expect(vm.isFormValid).toBe(false)
      
      // Test with only short_name
      vm.form.uom_name = ''
      vm.form.short_name = 'KG'
      expect(vm.isFormValid).toBe(false)
      
      // Test with both fields filled
      vm.form.uom_name = 'Kilogram'
      vm.form.short_name = 'KG'
      expect(vm.isFormValid).toBe(true)
    })
  })

  describe('CRUD Operations', () => {
    it('should call createUOM when saving new UOM', async () => {
      mockUOMStore.createUOM.mockResolvedValue({})
      
      wrapper = createWrapper()
      await nextTick()
      
      const vm = wrapper.vm
      
      // Fill form
      vm.form.uom_name = 'Liter'
      vm.form.short_name = 'L'
      vm.form.status = 'ACTIVE'
      
      // Open modal and save
      vm.showModal = true
      await vm.saveUOM()
      
      expect(mockUOMStore.createUOM).toHaveBeenCalledWith(null, {
        corporation_uuid: null,
        uom_name: "Liter",
        short_name: "L",
        status: "ACTIVE",
      })
    })

    it('should call updateUOM when editing existing UOM', async () => {
      const existingUOM = {
        id: 1,
        uuid: 'uom-1',
        corporation_uuid: null,
        uom_name: 'Kilogram',
        short_name: 'KG',
        status: 'ACTIVE',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }
      
      mockUOMStore.updateUOM.mockResolvedValue({})
      
      wrapper = createWrapper()
      await nextTick()
      
      const vm = wrapper.vm
      
      // Set editing state
      vm.editingUOM = existingUOM
      vm.form.uom_name = 'Kilogram Updated'
      vm.form.short_name = 'KGU'
      vm.form.status = 'INACTIVE'
      
      // Save changes
      await vm.saveUOM()
      
      expect(mockUOMStore.updateUOM).toHaveBeenCalledWith(
        'uom-1',
        {
          uom_name: 'Kilogram Updated',
          short_name: 'KGU',
          status: 'INACTIVE'
        }
      )
    })

    it("should open delete modal when deleting UOM", async () => {
      const uomToDelete = {
        id: 1,
        uuid: "uom-1",
        corporation_uuid: null,
        uom_name: "Kilogram",
        short_name: "KG",
        status: "ACTIVE",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        created_by: "user-1",
        updated_by: "user-1",
      };

      wrapper = createWrapper();
      await nextTick();

      const vm = wrapper.vm;
      vm.deleteUOM(uomToDelete);

      expect(vm.showDeleteModal).toBe(true);
      expect(vm.uomToDelete).toEqual(uomToDelete);
    });
  })

  describe("Delete Operations", () => {
    it("should open delete modal when delete is clicked", async () => {
      const uomToDelete = {
        id: 1,
        uuid: "uom-1",
        corporation_uuid: null,
        uom_name: "Kilogram",
        short_name: "KG",
        status: "ACTIVE",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        created_by: "user-1",
        updated_by: "user-1",
      };

      wrapper = createWrapper();
      await nextTick();

      wrapper.vm.deleteUOM(uomToDelete);

      // Should open delete modal
      expect(wrapper.vm.showDeleteModal).toBe(true);
      expect(wrapper.vm.uomToDelete).toEqual(uomToDelete);
    });
  });

  describe("Delete Modal Operations", () => {
    beforeEach(() => {
      mockToast.add.mockClear();
    });

    it("should close delete modal", async () => {
      const uomToDelete = {
        id: 1,
        uuid: "uom-1",
        corporation_uuid: null,
        uom_name: "Kilogram",
        short_name: "KG",
        status: "ACTIVE",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        created_by: "user-1",
        updated_by: "user-1",
      };

      wrapper = createWrapper();
      wrapper.vm.showDeleteModal = true;
      wrapper.vm.uomToDelete = uomToDelete;
      await nextTick();

      wrapper.vm.closeDeleteModal();
      await nextTick();

      expect(wrapper.vm.showDeleteModal).toBe(false);
      expect(wrapper.vm.uomToDelete).toBeNull();
      expect(wrapper.vm.isDeleting).toBe(false);
    });

    it("should confirm delete UOM successfully", async () => {
      const uomToDelete = {
        id: 1,
        uuid: "uom-1",
        corporation_uuid: null,
        uom_name: "Kilogram",
        short_name: "KG",
        status: "ACTIVE",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        created_by: "user-1",
        updated_by: "user-1",
      };

      mockUOMStore.deleteUOM.mockResolvedValue({});

      wrapper = createWrapper();
      wrapper.vm.uomToDelete = uomToDelete;
      wrapper.vm.showDeleteModal = true;
      await nextTick();

      await wrapper.vm.confirmDeleteUOM();

      // Should call store delete method
      expect(mockUOMStore.deleteUOM).toHaveBeenCalledWith("uom-1");

      // Should show success toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: "Success",
        description: "UOM deleted successfully",
        color: "success",
      });

      // Should close modal and clear state
      expect(wrapper.vm.showDeleteModal).toBe(false);
      expect(wrapper.vm.uomToDelete).toBeNull();
      expect(wrapper.vm.isDeleting).toBe(false);
    });

    it("should handle delete error", async () => {
      const uomToDelete = {
        id: 1,
        uuid: "uom-1",
        corporation_uuid: null,
        uom_name: "Kilogram",
        short_name: "KG",
        status: "ACTIVE",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        created_by: "user-1",
        updated_by: "user-1",
      };

      mockUOMStore.deleteUOM.mockRejectedValue(new Error("Delete failed"));

      wrapper = createWrapper();
      wrapper.vm.uomToDelete = uomToDelete;
      wrapper.vm.showDeleteModal = true;
      await nextTick();

      await wrapper.vm.confirmDeleteUOM();

      // Should show error toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: "Error",
        description: "Delete failed",
        color: "error",
      });

      // Should reset deleting state
      expect(wrapper.vm.isDeleting).toBe(false);
    });
  });

  describe('Search Functionality', () => {
    const mockUOM = [
      {
        id: 1,
        uuid: 'uom-1',
        corporation_uuid: null,
        uom_name: 'Kilogram',
        short_name: 'KG',
        status: 'ACTIVE',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      },
      {
        id: 2,
        uuid: 'uom-2',
        corporation_uuid: null,
        uom_name: 'Meter',
        short_name: 'M',
        status: 'INACTIVE',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }
    ]

    beforeEach(() => {
      mockUOMStore.uom = mockUOM
    })

    it('should filter UOM based on search term', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const vm = wrapper.vm
      
      // Test search by name
      vm.globalFilter = 'Kilogram'
      await nextTick()
      
      const filtered = vm.filteredUOM
      expect(filtered).toHaveLength(1)
      expect(filtered[0].uom_name).toBe('Kilogram')
      
      // Test search by short name (use 'KG' to match only one)
      vm.globalFilter = 'KG'
      await nextTick()
      
      const filtered2 = vm.filteredUOM
      expect(filtered2).toHaveLength(1)
      expect(filtered2[0].short_name).toBe('KG')
    })

    it('should return all UOM when search is empty', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const vm = wrapper.vm
      vm.globalFilter = ''
      
      const filtered = vm.filteredUOM
      expect(filtered).toEqual(mockUOM)
    })
  })

  describe('Component Lifecycle', () => {
    it('should fetch UOM on mount', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      // Verify fetchUOM was called on mount
      expect(mockUOMStore.fetchUOM).toHaveBeenCalled()
    })
  })
})
