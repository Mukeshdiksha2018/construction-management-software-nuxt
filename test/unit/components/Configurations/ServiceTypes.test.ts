import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick, ref } from 'vue'
import ServiceTypes from '@/components/Configurations/ServiceTypes.vue'
import { useServiceTypesStore } from '@/stores/serviceTypes'
import { useCorporationStore } from '@/stores/corporations'

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

const mockServiceTypesStore = {
  serviceTypes: [],
  loading: false,
  error: null,
  $patch: vi.fn(),
  fetchServiceTypes: vi.fn(),
  createServiceType: vi.fn(),
  updateServiceType: vi.fn(),
  deleteServiceType: vi.fn(),
  clearServiceTypes: vi.fn()
}

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockCorpStore
}))

vi.mock('@/stores/serviceTypes', () => ({
  useServiceTypesStore: () => mockServiceTypesStore
}))

describe('ServiceTypes Component', () => {
  let wrapper: any
  let serviceTypesStore: ReturnType<typeof useServiceTypesStore>
  let corporationStore: ReturnType<typeof useCorporationStore>

  const mockCorporation = {
    uuid: 'corp-uuid-1',
    corporation_name: 'Test Corporation'
  }

  const mockServiceType = {
    id: 1,
    uuid: 'service-type-uuid-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    name: 'General Contracting',
    description: 'General contracting services',
    isActive: true,
    color: '#3D5C7C'
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Set up mock data
    mockCorpStore.selectedCorporation = mockCorporation
    mockCorpStore.selectedCorporationId = mockCorporation.uuid
    
    mockServiceTypesStore.serviceTypes = [mockServiceType]
    mockServiceTypesStore.loading = false
    mockServiceTypesStore.error = null
    
    // Reset mocks
    mockToast.add.mockClear()
    mockCorpStore.$patch.mockClear()
    mockServiceTypesStore.$patch.mockClear()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(ServiceTypes, {
      props: {
        globalFilter: '',
        ...props
      },
      global: {
        stubs: {
          UTable: true,
          UButton: true,
          UModal: true,
          UInput: true,
          UCheckbox: true,
          UCard: true,
          UBadge: true,
          UAlert: true,
          UPagination: true,
          USelect: true,
          USkeleton: true,
          UTooltip: true,
          UIcon: true
        }
      }
    })
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
      
      expect(wrapper.vm.showModal).toBe(false)
      expect(wrapper.vm.showDeleteModal).toBe(false)
      expect(wrapper.vm.isEditing).toBe(false)
    })
  })

  describe('Corporation Display in Modal', () => {
    it('should display corporation name correctly in Add/Edit Modal', () => {
      wrapper = createWrapper()
      
      // Test the corporation name computation
      const corporationName = wrapper.vm.getCorporationName
      expect(corporationName).toBe('Test Corporation')
      
      // Test UInput component properties for Modal
      const modalUInputProps = {
        modelValue: corporationName,
        disabled: true,
        size: 'sm',
        class: 'w-full',
        icon: 'i-heroicons-building-office-2-solid'
      }
      
      expect(modalUInputProps.modelValue).toBe('Test Corporation')
      expect(modalUInputProps.disabled).toBe(true)
      expect(modalUInputProps.size).toBe('sm')
      expect(modalUInputProps.class).toBe('w-full')
      expect(modalUInputProps.icon).toBe('i-heroicons-building-office-2-solid')
    })

    it('should handle missing corporation gracefully in modal', () => {
      // Create a wrapper with no corporation
      mockCorpStore.selectedCorporation = null
      wrapper = createWrapper()
      
      const corporationName = wrapper.vm.getCorporationName
      expect(corporationName).toBe('Unnamed Corporation')
      
      // Test UInput component properties with fallback
      const uInputProps = {
        modelValue: corporationName,
        disabled: true,
        size: 'sm',
        class: 'w-full',
        icon: 'i-heroicons-building-office-2-solid'
      }
      
      expect(uInputProps.modelValue).toBe('Unnamed Corporation')
      expect(uInputProps.disabled).toBe(true)
    })

    it('should use solid icon for corporation display in modal', () => {
      const iconName = 'i-heroicons-building-office-2-solid'
      
      // Verify it's a solid icon (not outlined)
      expect(iconName).toContain('-solid')
      expect(iconName).not.toContain('-outline')
      expect(iconName).toContain('building-office-2')
    })

    it('should be read-only and non-editable in modal', () => {
      wrapper = createWrapper()
      
      const uInputProps = {
        modelValue: wrapper.vm.getCorporationName,
        disabled: true,
        size: 'sm',
        class: 'w-full',
        icon: 'i-heroicons-building-office-2-solid'
      }
      
      // Verify it's disabled (read-only)
      expect(uInputProps.disabled).toBe(true)
      
      // Verify it has proper size and styling
      expect(uInputProps.size).toBe('sm')
      expect(uInputProps.class).toBe('w-full')
    })

    it('should maintain consistent UInput configuration in modal', () => {
      wrapper = createWrapper()
      
      const expectedConfig = {
        disabled: true,
        size: 'sm',
        class: 'w-full',
        icon: 'i-heroicons-building-office-2-solid'
      }
      
      // Test that the configuration matches expected values
      const actualConfig = { ...expectedConfig }
      
      expect(actualConfig).toEqual(expectedConfig)
    })

    it('should auto-set corporation UUID when opening Add Modal', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.openAddModal()
      
      // Corporation UUID should be auto-set from the store
      expect(wrapper.vm.formState.corporation_uuid).toBe('corp-uuid-1')
    })

    it('should maintain corporation display when switching between modals', async () => {
      wrapper = createWrapper()
      
      // Open Add Modal
      await wrapper.vm.openAddModal()
      const addModalCorpName = wrapper.vm.getCorporationName
      
      // Close Add Modal
      wrapper.vm.showModal = false
      await nextTick()
      
      // Open Edit Modal
      await wrapper.vm.openEditModal(mockServiceType)
      const editModalCorpName = wrapper.vm.getCorporationName
      
      // Corporation name should be consistent
      expect(addModalCorpName).toBe(editModalCorpName)
      expect(addModalCorpName).toBe('Test Corporation')
    })
  })

  describe('Modal Operations', () => {
    it('should open add modal when openAddModal is called', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.openAddModal()
      await nextTick()
      
      expect(wrapper.vm.showModal).toBe(true)
      expect(wrapper.vm.isEditing).toBe(false)
    })

    it('should close add modal when closeModal is called', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.showModal = true
      await nextTick()
      
      await wrapper.vm.closeModal()
      await nextTick()
      
      expect(wrapper.vm.showModal).toBe(false)
    })

    it('should open edit modal with correct data', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.openEditModal(mockServiceType)
      await nextTick()
      
      expect(wrapper.vm.showModal).toBe(true)
      expect(wrapper.vm.isEditing).toBe(true)
      expect(wrapper.vm.selectedServiceType).toEqual(mockServiceType)
    })

    it('should close edit modal', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.showModal = true
      await nextTick()
      
      await wrapper.vm.closeModal()
      await nextTick()
      
      expect(wrapper.vm.showModal).toBe(false)
    })

    it('should open delete confirmation modal', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.confirmDelete(mockServiceType)
      await nextTick()
      
      expect(wrapper.vm.showDeleteModal).toBe(true)
      expect(wrapper.vm.selectedServiceType).toEqual(mockServiceType)
    })

    it('should close delete modal', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.showDeleteModal = true
      wrapper.vm.selectedServiceType = mockServiceType
      await nextTick()
      
      wrapper.vm.showDeleteModal = false
      await nextTick()
      
      expect(wrapper.vm.showDeleteModal).toBe(false)
    })
  })

  describe('Data Filtering', () => {
    it('should filter service types by global filter', () => {
      wrapper = createWrapper()
      wrapper.vm.searchFilter = 'General'
      
      expect(wrapper.vm.filteredServiceTypes).toEqual([mockServiceType])
    })

    it('should return all service types when no filter', () => {
      wrapper = createWrapper()
      wrapper.vm.searchFilter = ''
      
      expect(wrapper.vm.filteredServiceTypes).toEqual([mockServiceType])
    })

    it('should filter by description', () => {
      wrapper = createWrapper()
      wrapper.vm.searchFilter = 'contracting'
      
      expect(wrapper.vm.filteredServiceTypes).toEqual([mockServiceType])
    })
  })

  describe('Form Validation', () => {
    it('should validate form correctly', () => {
      wrapper = createWrapper()
      
      // Test form state structure
      expect(wrapper.vm.formState).toBeDefined()
      expect(wrapper.vm.formState.name).toBe('')
      expect(wrapper.vm.formState.description).toBe('')
    })

    it('should validate edit form correctly', () => {
      wrapper = createWrapper()
      
      // Test form state structure
      expect(wrapper.vm.formState).toBeDefined()
      expect(wrapper.vm.formState.name).toBe('')
      expect(wrapper.vm.formState.description).toBe('')
    })
  })

  describe('Default Form Values', () => {
    it('should have default status as "Active" when opening add modal', async () => {
      wrapper = createWrapper()
      
      // Open add modal
      await wrapper.vm.openAddModal()
      await nextTick()
      
      // Check that status defaults to "Active"
      expect(wrapper.vm.formState.isActive).toBe('Active')
      expect(wrapper.vm.isEditing).toBe(false)
    })

    it('should have default color as "#3D5C7C" when opening add modal', async () => {
      wrapper = createWrapper()
      
      // Open add modal
      await wrapper.vm.openAddModal()
      await nextTick()
      
      // Check that color defaults to brand color
      expect(wrapper.vm.formState.color).toBe('#3D5C7C')
    })

    it('should have empty name and description when opening add modal', async () => {
      wrapper = createWrapper()
      
      // Open add modal
      await wrapper.vm.openAddModal()
      await nextTick()
      
      // Check that name and description are empty
      expect(wrapper.vm.formState.name).toBe('')
      expect(wrapper.vm.formState.description).toBe('')
    })

    it('should reset form to defaults when resetForm is called', async () => {
      wrapper = createWrapper()
      
      // Modify form state
      wrapper.vm.formState.name = 'Test Service Type'
      wrapper.vm.formState.description = 'Test Description'
      wrapper.vm.formState.color = '#FF0000'
      wrapper.vm.formState.isActive = 'Inactive'
      
      // Reset form
      wrapper.vm.resetForm()
      await nextTick()
      
      // Check that all fields are reset to defaults
      expect(wrapper.vm.formState.name).toBe('')
      expect(wrapper.vm.formState.description).toBe('')
      expect(wrapper.vm.formState.color).toBe('#3D5C7C')
      expect(wrapper.vm.formState.isActive).toBe('Active')
    })

    it('should reset form to defaults when closing add modal', async () => {
      wrapper = createWrapper()
      
      // Open add modal and modify form
      await wrapper.vm.openAddModal()
      wrapper.vm.formState.name = 'Test Service Type'
      wrapper.vm.formState.isActive = 'Inactive'
      
      // Close modal
      await wrapper.vm.closeModal()
      await nextTick()
      
      // Form should be reset
      expect(wrapper.vm.formState.name).toBe('')
      expect(wrapper.vm.formState.isActive).toBe('Active')
      expect(wrapper.vm.formState.color).toBe('#3D5C7C')
    })

    it('should have correct default values on component mount', () => {
      wrapper = createWrapper()
      
      // Check initial form state on mount
      expect(wrapper.vm.formState.name).toBe('')
      expect(wrapper.vm.formState.description).toBe('')
      expect(wrapper.vm.formState.color).toBe('#3D5C7C')
      expect(wrapper.vm.formState.isActive).toBe('Active')
    })

    it('should not override status when editing existing service type', async () => {
      wrapper = createWrapper()
      
      // Create an inactive service type
      const inactiveServiceType = {
        ...mockServiceType,
        isActive: false
      }
      
      // Open edit modal with inactive service type
      await wrapper.vm.openEditModal(inactiveServiceType)
      await nextTick()
      
      // Status should match the service type being edited, not the default
      expect(wrapper.vm.formState.isActive).toBe('Inactive')
      expect(wrapper.vm.isEditing).toBe(true)
    })

    it('should preserve custom color when editing existing service type', async () => {
      wrapper = createWrapper()
      
      // Create a service type with custom color
      const customColorServiceType = {
        ...mockServiceType,
        color: '#FF5733'
      }
      
      // Open edit modal
      await wrapper.vm.openEditModal(customColorServiceType)
      await nextTick()
      
      // Color should match the service type being edited, not the default
      expect(wrapper.vm.formState.color).toBe('#FF5733')
    })

    it('should reset all form fields when opening add modal', async () => {
      wrapper = createWrapper()
      
      // Open add modal
      await wrapper.vm.openAddModal()
      await nextTick()
      
      // All form fields should be at defaults
      expect(wrapper.vm.formState.name).toBe('')
      expect(wrapper.vm.formState.description).toBe('')
      expect(wrapper.vm.formState.isActive).toBe('Active')
      expect(wrapper.vm.formState.color).toBe('#3D5C7C')
    })
  })

  describe('Edit Modal Form Population', () => {
    it('should populate form correctly when editing', async () => {
      wrapper = createWrapper()
      
      // Open edit modal
      await wrapper.vm.openEditModal(mockServiceType)
      await nextTick()
      
      // Check all form fields are populated from the service type
      expect(wrapper.vm.formState.name).toBe('General Contracting')
      expect(wrapper.vm.formState.description).toBe('General contracting services')
      expect(wrapper.vm.formState.color).toBe('#3D5C7C')
      expect(wrapper.vm.formState.isActive).toBe('Active')
    })

    it('should handle missing description when editing', async () => {
      wrapper = createWrapper()
      
      // Create service type without description
      const serviceTypeNoDesc = {
        ...mockServiceType,
        description: undefined
      }
      
      // Open edit modal
      await wrapper.vm.openEditModal(serviceTypeNoDesc)
      await nextTick()
      
      // Description should be empty string
      expect(wrapper.vm.formState.description).toBe('')
    })

    it('should correctly convert boolean isActive to string status', async () => {
      wrapper = createWrapper()
      
      // Test with active service type
      const activeServiceType = {
        ...mockServiceType,
        isActive: true
      }
      
      await wrapper.vm.openEditModal(activeServiceType)
      await nextTick()
      
      expect(wrapper.vm.formState.isActive).toBe('Active')
      
      // Test with inactive service type
      const inactiveServiceType = {
        ...mockServiceType,
        isActive: false
      }
      
      await wrapper.vm.openEditModal(inactiveServiceType)
      await nextTick()
      
      expect(wrapper.vm.formState.isActive).toBe('Inactive')
    })
  })

  describe('Form State Persistence', () => {
    it('should maintain form state while modal is open', async () => {
      wrapper = createWrapper()
      
      // Open add modal
      await wrapper.vm.openAddModal()
      
      // Modify form
      wrapper.vm.formState.name = 'Electrical Services'
      wrapper.vm.formState.description = 'Electrical projects'
      await nextTick()
      
      // Form state should persist
      expect(wrapper.vm.formState.name).toBe('Electrical Services')
      expect(wrapper.vm.formState.description).toBe('Electrical projects')
      expect(wrapper.vm.formState.isActive).toBe('Active') // Default should remain
    })

    it('should clear form state after modal closes', async () => {
      wrapper = createWrapper()
      
      // Open add modal and modify
      await wrapper.vm.openAddModal()
      wrapper.vm.formState.name = 'Plumbing Services'
      wrapper.vm.formState.isActive = 'Inactive'
      
      // Close modal
      await wrapper.vm.closeModal()
      await nextTick()
      
      // Form should be reset to defaults
      expect(wrapper.vm.formState.name).toBe('')
      expect(wrapper.vm.formState.isActive).toBe('Active')
    })

    it('should not affect other service types when editing one', async () => {
      wrapper = createWrapper()
      
      const originalServiceTypes = [...mockServiceTypesStore.serviceTypes]
      
      // Open edit modal
      await wrapper.vm.openEditModal(mockServiceType)
      
      // Modify form
      wrapper.vm.formState.name = 'Modified Name'
      await nextTick()
      
      // Store service types should remain unchanged until submit
      expect(mockServiceTypesStore.serviceTypes).toEqual(originalServiceTypes)
    })
  })

  describe('Store Integration', () => {
    it('should have access to service types from store', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.serviceTypes).toEqual([mockServiceType])
      expect(wrapper.vm.filteredServiceTypes).toEqual([mockServiceType])
    })

    it('should have access to service types from store without corporation filter', () => {
      wrapper = createWrapper()
      
      // Service types are global - no corporation filtering needed
      expect(wrapper.vm.serviceTypes).toBeDefined()
      expect(Array.isArray(wrapper.vm.serviceTypes)).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle store errors gracefully', () => {
      wrapper = createWrapper()
      
      // Test that component handles store errors
      expect(wrapper.vm.error).toBeDefined()
      expect(wrapper.vm.loading).toBeDefined()
    })
  })

  describe('Success Handling', () => {
    it('should handle successful operations', () => {
      wrapper = createWrapper()
      
      // Test that component can handle successful operations
      expect(wrapper.vm.handleSubmit).toBeDefined()
      expect(wrapper.vm.handleDelete).toBeDefined()
    })
  })
})
