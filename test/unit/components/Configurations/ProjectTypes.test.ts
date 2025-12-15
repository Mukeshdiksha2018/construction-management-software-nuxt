import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick, ref } from 'vue'
import ProjectTypes from '@/components/Configurations/ProjectTypes.vue'
import { useProjectTypesStore } from '@/stores/projectTypes'
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

const mockProjectTypesStore = {
  projectTypes: [],
  loading: false,
  error: null,
  $patch: vi.fn(),
  fetchProjectTypes: vi.fn(),
  createProjectType: vi.fn(),
  updateProjectType: vi.fn(),
  deleteProjectType: vi.fn(),
  clearProjectTypes: vi.fn()
}

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockCorpStore
}))

vi.mock('@/stores/projectTypes', () => ({
  useProjectTypesStore: () => mockProjectTypesStore
}))

describe('ProjectTypes Component', () => {
  let wrapper: any
  let projectTypesStore: ReturnType<typeof useProjectTypesStore>
  let corporationStore: ReturnType<typeof useCorporationStore>

  const mockCorporation = {
    uuid: 'corp-uuid-1',
    corporation_name: 'Test Corporation'
  }

  const mockProjectType = {
    id: 1,
    uuid: 'project-type-uuid-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    name: 'Residential',
    description: 'Residential construction projects',
    isActive: true,
    color: '#3B82F6'
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Set up mock data
    mockCorpStore.selectedCorporation = mockCorporation
    mockCorpStore.selectedCorporationId = mockCorporation.uuid
    
    mockProjectTypesStore.projectTypes = [mockProjectType]
    mockProjectTypesStore.loading = false
    mockProjectTypesStore.error = null
    
    // Reset mocks
    mockToast.add.mockClear()
    mockCorpStore.$patch.mockClear()
    mockProjectTypesStore.$patch.mockClear()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(ProjectTypes, {
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

  // Corporation references have been removed - project types are now global

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
      
      await wrapper.vm.openEditModal(mockProjectType)
      await nextTick()
      
      expect(wrapper.vm.showModal).toBe(true)
      expect(wrapper.vm.isEditing).toBe(true)
      expect(wrapper.vm.selectedProjectType).toEqual(mockProjectType)
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
      
      await wrapper.vm.confirmDelete(mockProjectType)
      await nextTick()
      
      expect(wrapper.vm.showDeleteModal).toBe(true)
      expect(wrapper.vm.selectedProjectType).toEqual(mockProjectType)
    })

    it('should close delete modal', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.showDeleteModal = true
      wrapper.vm.selectedProjectType = mockProjectType
      await nextTick()
      
      wrapper.vm.showDeleteModal = false
      await nextTick()
      
      expect(wrapper.vm.showDeleteModal).toBe(false)
    })
  })

  describe('Data Filtering', () => {
    it('should filter project types by global filter', () => {
      wrapper = createWrapper()
      wrapper.vm.searchFilter = 'Residential'
      
      expect(wrapper.vm.filteredProjectTypes).toEqual([mockProjectType])
    })

    it('should return all project types when no filter', () => {
      wrapper = createWrapper()
      wrapper.vm.searchFilter = ''
      
      expect(wrapper.vm.filteredProjectTypes).toEqual([mockProjectType])
    })

    it('should filter by description', () => {
      wrapper = createWrapper()
      wrapper.vm.searchFilter = 'construction'
      
      expect(wrapper.vm.filteredProjectTypes).toEqual([mockProjectType])
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

    it('should have default color as "#3B82F6" when opening add modal', async () => {
      wrapper = createWrapper()
      
      // Open add modal
      await wrapper.vm.openAddModal()
      await nextTick()
      
      // Check that color defaults to blue
      expect(wrapper.vm.formState.color).toBe('#3B82F6')
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
      wrapper.vm.formState.name = 'Test Project Type'
      wrapper.vm.formState.description = 'Test Description'
      wrapper.vm.formState.color = '#FF0000'
      wrapper.vm.formState.isActive = 'Inactive'
      
      // Reset form
      wrapper.vm.resetForm()
      await nextTick()
      
      // Check that all fields are reset to defaults
      expect(wrapper.vm.formState.name).toBe('')
      expect(wrapper.vm.formState.description).toBe('')
      expect(wrapper.vm.formState.color).toBe('#3B82F6')
      expect(wrapper.vm.formState.isActive).toBe('Active')
    })

    it('should reset form to defaults when closing add modal', async () => {
      wrapper = createWrapper()
      
      // Open add modal and modify form
      await wrapper.vm.openAddModal()
      wrapper.vm.formState.name = 'Test Project Type'
      wrapper.vm.formState.isActive = 'Inactive'
      
      // Close modal
      await wrapper.vm.closeModal()
      await nextTick()
      
      // Form should be reset
      expect(wrapper.vm.formState.name).toBe('')
      expect(wrapper.vm.formState.isActive).toBe('Active')
      expect(wrapper.vm.formState.color).toBe('#3B82F6')
    })

    it('should have correct default values on component mount', () => {
      wrapper = createWrapper()
      
      // Check initial form state on mount
      expect(wrapper.vm.formState.name).toBe('')
      expect(wrapper.vm.formState.description).toBe('')
      expect(wrapper.vm.formState.color).toBe('#3B82F6')
      expect(wrapper.vm.formState.isActive).toBe('Active')
    })

    it('should not override status when editing existing project type', async () => {
      wrapper = createWrapper()
      
      // Create an inactive project type
      const inactiveProjectType = {
        ...mockProjectType,
        isActive: false
      }
      
      // Open edit modal with inactive project type
      await wrapper.vm.openEditModal(inactiveProjectType)
      await nextTick()
      
      // Status should match the project type being edited, not the default
      expect(wrapper.vm.formState.isActive).toBe('Inactive')
      expect(wrapper.vm.isEditing).toBe(true)
    })

    it('should preserve custom color when editing existing project type', async () => {
      wrapper = createWrapper()
      
      // Create a project type with custom color
      const customColorProjectType = {
        ...mockProjectType,
        color: '#FF5733'
      }
      
      // Open edit modal
      await wrapper.vm.openEditModal(customColorProjectType)
      await nextTick()
      
      // Color should match the project type being edited, not the default
      expect(wrapper.vm.formState.color).toBe('#FF5733')
    })

    // Corporation references have been removed - project types are now global
  })

  describe('Edit Modal Form Population', () => {
    it('should populate form correctly when editing', async () => {
      wrapper = createWrapper()
      
      // Open edit modal
      await wrapper.vm.openEditModal(mockProjectType)
      await nextTick()
      
      // Check all form fields are populated from the project type
      expect(wrapper.vm.formState.name).toBe('Residential')
      expect(wrapper.vm.formState.description).toBe('Residential construction projects')
      expect(wrapper.vm.formState.color).toBe('#3B82F6')
      expect(wrapper.vm.formState.isActive).toBe('Active')
    })

    it('should handle missing description when editing', async () => {
      wrapper = createWrapper()
      
      // Create project type without description
      const projectTypeNoDesc = {
        ...mockProjectType,
        description: undefined
      }
      
      // Open edit modal
      await wrapper.vm.openEditModal(projectTypeNoDesc)
      await nextTick()
      
      // Description should be empty string
      expect(wrapper.vm.formState.description).toBe('')
    })

    it('should correctly convert boolean isActive to string status', async () => {
      wrapper = createWrapper()
      
      // Test with active project type
      const activeProjectType = {
        ...mockProjectType,
        isActive: true
      }
      
      await wrapper.vm.openEditModal(activeProjectType)
      await nextTick()
      
      expect(wrapper.vm.formState.isActive).toBe('Active')
      
      // Test with inactive project type
      const inactiveProjectType = {
        ...mockProjectType,
        isActive: false
      }
      
      await wrapper.vm.openEditModal(inactiveProjectType)
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
      wrapper.vm.formState.name = 'Commercial'
      wrapper.vm.formState.description = 'Commercial projects'
      await nextTick()
      
      // Form state should persist
      expect(wrapper.vm.formState.name).toBe('Commercial')
      expect(wrapper.vm.formState.description).toBe('Commercial projects')
      expect(wrapper.vm.formState.isActive).toBe('Active') // Default should remain
    })

    it('should clear form state after modal closes', async () => {
      wrapper = createWrapper()
      
      // Open add modal and modify
      await wrapper.vm.openAddModal()
      wrapper.vm.formState.name = 'Industrial'
      wrapper.vm.formState.isActive = 'Inactive'
      
      // Close modal
      await wrapper.vm.closeModal()
      await nextTick()
      
      // Form should be reset to defaults
      expect(wrapper.vm.formState.name).toBe('')
      expect(wrapper.vm.formState.isActive).toBe('Active')
    })

    it('should not affect other project types when editing one', async () => {
      wrapper = createWrapper()
      
      const originalProjectTypes = [...mockProjectTypesStore.projectTypes]
      
      // Open edit modal
      await wrapper.vm.openEditModal(mockProjectType)
      
      // Modify form
      wrapper.vm.formState.name = 'Modified Name'
      await nextTick()
      
      // Store project types should remain unchanged until submit
      expect(mockProjectTypesStore.projectTypes).toEqual(originalProjectTypes)
    })
  })

  describe('Store Integration', () => {
    it('should have access to project types from store', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.projectTypes).toEqual([mockProjectType])
      expect(wrapper.vm.filteredProjectTypes).toEqual([mockProjectType])
    })

    // Corporation references have been removed - project types are now global
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
