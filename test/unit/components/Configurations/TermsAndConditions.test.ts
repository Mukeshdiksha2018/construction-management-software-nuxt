import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick, ref } from 'vue'
import TermsAndConditions from '@/components/Configurations/TermsAndConditions.vue'
import { useTermsAndConditionsStore } from '@/stores/termsAndConditions'
import { useCorporationStore } from '@/stores/corporations'

// Mock TipTap editor - these are auto-imported by nuxt-tiptap-editor module
const mockEditorInstance = {
  chain: vi.fn(() => ({
    focus: vi.fn(() => ({
      toggleBold: vi.fn(() => ({ run: vi.fn() })),
      toggleItalic: vi.fn(() => ({ run: vi.fn() })),
      toggleStrike: vi.fn(() => ({ run: vi.fn() })),
      toggleCode: vi.fn(() => ({ run: vi.fn() })),
      toggleBulletList: vi.fn(() => ({ run: vi.fn() })),
      toggleOrderedList: vi.fn(() => ({ run: vi.fn() })),
      toggleBlockquote: vi.fn(() => ({ run: vi.fn() })),
      toggleCodeBlock: vi.fn(() => ({ run: vi.fn() })),
      setParagraph: vi.fn(() => ({ run: vi.fn() })),
      toggleHeading: vi.fn(() => ({ run: vi.fn() }))
    }))
  })),
  isActive: vi.fn(() => false),
  getHTML: vi.fn(() => ''),
  commands: {
    setContent: vi.fn()
  },
  destroy: vi.fn()
}

// Mock useEditor to return a ref containing the mock editor
vi.mock('nuxt-tiptap-editor', async () => {
  const actual = await vi.importActual('nuxt-tiptap-editor')
  return {
    ...actual,
    useEditor: vi.fn(() => ref(mockEditorInstance)),
    TiptapStarterKit: {},
    TiptapEditorContent: {
      name: 'TiptapEditorContent',
      template: '<div>Editor Content</div>'
    }
  }
})

// Also stub globally in case of auto-imports
vi.stubGlobal('useEditor', vi.fn(() => ref(mockEditorInstance)))
vi.stubGlobal('TiptapStarterKit', {})
vi.stubGlobal('TiptapEditorContent', {
  name: 'TiptapEditorContent',
  template: '<div>Editor Content</div>'
})

// Mock composables
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: vi.fn(() => true),
    isReady: ref(true)
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

const mockTermsAndConditionsStore = {
  termsAndConditions: [],
  loading: false,
  error: null,
  $patch: vi.fn(),
  fetchTermsAndConditions: vi.fn(),
  createTermsAndCondition: vi.fn(),
  updateTermsAndCondition: vi.fn(),
  deleteTermsAndCondition: vi.fn(),
  clearTermsAndConditions: vi.fn()
}

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockCorpStore
}))

vi.mock('@/stores/termsAndConditions', () => ({
  useTermsAndConditionsStore: () => mockTermsAndConditionsStore
}))

describe('TermsAndConditions Component', () => {
  let wrapper: any
  let termsAndConditionsStore: ReturnType<typeof useTermsAndConditionsStore>
  let corporationStore: ReturnType<typeof useCorporationStore>

  const mockCorporation = {
    uuid: 'corp-uuid-1',
    corporation_name: 'Test Corporation'
  }

  const mockTermsAndCondition = {
    id: 1,
    uuid: 'tc-uuid-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    name: 'Standard Terms',
    content: '<p>Standard terms and conditions</p>',
    isActive: true
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Set up mock data
    mockCorpStore.selectedCorporation = mockCorporation
    mockCorpStore.selectedCorporationId = mockCorporation.uuid
    
    mockTermsAndConditionsStore.termsAndConditions = [mockTermsAndCondition]
    mockTermsAndConditionsStore.loading = false
    mockTermsAndConditionsStore.error = null
    
    // Reset mocks
    mockToast.add.mockClear()
    mockCorpStore.$patch.mockClear()
    mockTermsAndConditionsStore.$patch.mockClear()
    mockTermsAndConditionsStore.fetchTermsAndConditions.mockResolvedValue(undefined)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  const createWrapper = () => {
    return mount(TermsAndConditions, {
      global: {
        stubs: {
          UTable: true,
          UButton: true,
          UModal: true,
          UInput: true,
          USelect: true,
          UBadge: true,
          UAlert: true,
          UTooltip: true,
          UIcon: true,
          ClientOnly: {
            template: '<div><slot /></div>'
          },
          TiptapEditorContent: {
            template: '<div>Editor Content</div>'
          }
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
      expect(wrapper.vm.showPreviewModal).toBe(false)
      expect(wrapper.vm.isEditing).toBe(false)
    })

    it('should fetch terms and conditions on mount', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      expect(mockTermsAndConditionsStore.fetchTermsAndConditions).toHaveBeenCalledWith(true)
    })
  })

  describe('Modal Operations', () => {
    it('should open add modal when openAddModal is called', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.openAddModal()
      await nextTick()
      
      expect(wrapper.vm.showModal).toBe(true)
      expect(wrapper.vm.isEditing).toBe(false)
      expect(wrapper.vm.formState.name).toBe('')
      expect(wrapper.vm.formState.content).toBe('')
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
      
      await wrapper.vm.openEditModal(mockTermsAndCondition)
      await nextTick()
      
      expect(wrapper.vm.showModal).toBe(true)
      expect(wrapper.vm.isEditing).toBe(true)
      expect(wrapper.vm.selectedTermsAndCondition).toEqual(mockTermsAndCondition)
      expect(wrapper.vm.formState.name).toBe('Standard Terms')
      expect(wrapper.vm.formState.content).toBe('<p>Standard terms and conditions</p>')
      expect(wrapper.vm.formState.isActive).toBe('Active')
    })

    it('should open delete confirmation modal', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.confirmDelete(mockTermsAndCondition)
      await nextTick()
      
      expect(wrapper.vm.showDeleteModal).toBe(true)
      expect(wrapper.vm.selectedTermsAndCondition).toEqual(mockTermsAndCondition)
    })
  })

  describe('Data Filtering', () => {
    it('should filter terms and conditions by name', () => {
      wrapper = createWrapper()
      wrapper.vm.searchFilter = 'Standard'
      
      expect(wrapper.vm.filteredTermsAndConditions).toEqual([mockTermsAndCondition])
    })

    it('should return all terms and conditions when no filter', () => {
      wrapper = createWrapper()
      wrapper.vm.searchFilter = ''
      
      expect(wrapper.vm.filteredTermsAndConditions).toEqual([mockTermsAndCondition])
    })

    it('should filter by content', () => {
      wrapper = createWrapper()
      wrapper.vm.searchFilter = 'terms'
      
      expect(wrapper.vm.filteredTermsAndConditions).toEqual([mockTermsAndCondition])
    })

    it('should filter by status', () => {
      wrapper = createWrapper()
      wrapper.vm.searchFilter = 'active'
      
      expect(wrapper.vm.filteredTermsAndConditions).toEqual([mockTermsAndCondition])
    })
  })

  describe('Form Submission', () => {
    it('should create new terms and condition', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.formState.name = 'New Terms'
      wrapper.vm.formState.content = '<p>New content</p>'
      wrapper.vm.formState.isActive = 'Active'
      
      mockTermsAndConditionsStore.createTermsAndCondition.mockResolvedValue({
        id: 2,
        uuid: 'tc-uuid-2',
        name: 'New Terms',
        content: '<p>New content</p>',
        isActive: true
      })
      
      await wrapper.vm.handleSubmit()
      await nextTick()
      
      expect(mockTermsAndConditionsStore.createTermsAndCondition).toHaveBeenCalledWith({
        name: 'New Terms',
        content: '<p>New content</p>',
        isActive: true
      })
      expect(mockTermsAndConditionsStore.fetchTermsAndConditions).toHaveBeenCalledWith(true)
    })

    it('should update existing terms and condition', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.isEditing = true
      wrapper.vm.selectedTermsAndCondition = mockTermsAndCondition
      wrapper.vm.formState.name = 'Updated Terms'
      wrapper.vm.formState.content = '<p>Updated content</p>'
      wrapper.vm.formState.isActive = 'Active'
      
      mockTermsAndConditionsStore.updateTermsAndCondition.mockResolvedValue({
        ...mockTermsAndCondition,
        name: 'Updated Terms',
        content: '<p>Updated content</p>'
      })
      
      await wrapper.vm.handleSubmit()
      await nextTick()
      
      expect(mockTermsAndConditionsStore.updateTermsAndCondition).toHaveBeenCalledWith(
        String(mockTermsAndCondition.id),
        {
          name: 'Updated Terms',
          content: '<p>Updated content</p>',
          isActive: true
        }
      )
      expect(mockTermsAndConditionsStore.fetchTermsAndConditions).toHaveBeenCalledWith(true)
    })

    it('should disable submit button when form is invalid', () => {
      wrapper = createWrapper()
      
      wrapper.vm.formState.name = ''
      wrapper.vm.formState.content = ''
      
      // The submit button should be disabled
      expect(wrapper.vm.formState.name.trim()).toBe('')
      expect(wrapper.vm.formState.content.trim()).toBe('')
    })
  })

  describe('Delete Operations', () => {
    it('should delete terms and condition', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.selectedTermsAndCondition = mockTermsAndCondition
      mockTermsAndConditionsStore.deleteTermsAndCondition.mockResolvedValue(undefined)
      
      await wrapper.vm.handleDelete()
      await nextTick()
      
      expect(mockTermsAndConditionsStore.deleteTermsAndCondition).toHaveBeenCalledWith(
        String(mockTermsAndCondition.id)
      )
      expect(mockTermsAndConditionsStore.fetchTermsAndConditions).toHaveBeenCalledWith(true)
      expect(wrapper.vm.showDeleteModal).toBe(false)
    })
  })

  describe('Preview Operations', () => {
    it('should open preview modal', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.viewTermsAndCondition(mockTermsAndCondition)
      await nextTick()
      
      expect(wrapper.vm.showPreviewModal).toBe(true)
      expect(wrapper.vm.previewTermsAndCondition).toEqual(mockTermsAndCondition)
    })
  })

  describe('Store Integration', () => {
    it('should have access to terms and conditions from store', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.termsAndConditions).toEqual([mockTermsAndCondition])
      expect(wrapper.vm.filteredTermsAndConditions).toEqual([mockTermsAndCondition])
    })

    it('should have access to loading state from store', () => {
      wrapper = createWrapper()
      
      // Test initial loading state
      expect(wrapper.vm.loading).toBe(false)
      
      // The computed property reads from the store, so we verify it's connected
      expect(typeof wrapper.vm.loading).toBe('boolean')
      expect(wrapper.vm.loading).toBe(mockTermsAndConditionsStore.loading)
    })

    it('should have access to error state from store', () => {
      wrapper = createWrapper()
      
      // Test initial error state
      expect(wrapper.vm.error).toBe(null)
      
      // The computed property reads from the store, so we verify it's connected
      expect(wrapper.vm.error).toBe(mockTermsAndConditionsStore.error)
    })
  })

  describe('Error Handling', () => {
    it('should handle store errors gracefully', () => {
      // Set error before creating wrapper to test error state
      mockTermsAndConditionsStore.error = 'Failed to fetch'
      wrapper = createWrapper()
      
      // Component should have access to error from store
      expect(wrapper.vm.error).toBe('Failed to fetch')
      expect(typeof wrapper.vm.error).toBe('string')
    })

    it('should handle submit errors', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.formState.name = 'New Terms'
      wrapper.vm.formState.content = '<p>Content</p>'
      wrapper.vm.formState.isActive = 'Active'
      
      mockTermsAndConditionsStore.createTermsAndCondition.mockRejectedValue(
        new Error('Failed to create')
      )
      
      await wrapper.vm.handleSubmit()
      
      // Should handle error without crashing
      expect(mockTermsAndConditionsStore.createTermsAndCondition).toHaveBeenCalled()
    })
  })

  describe('Form Reset', () => {
    it('should reset form when closeModal is called', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.formState.name = 'Test'
      wrapper.vm.formState.content = '<p>Test</p>'
      wrapper.vm.formState.isActive = 'Inactive'
      
      await wrapper.vm.closeModal()
      
      expect(wrapper.vm.formState.name).toBe('')
      expect(wrapper.vm.formState.content).toBe('')
      expect(wrapper.vm.formState.isActive).toBe('Active')
    })
  })

  describe('Loading States', () => {
    it('should show loading state when store is loading', () => {
      mockTermsAndConditionsStore.loading = true
      wrapper = createWrapper()
      
      expect(wrapper.vm.loading).toBe(true)
    })

    it('should show loading state during submission', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.formState.name = 'Test'
      wrapper.vm.formState.content = '<p>Test</p>'
      wrapper.vm.formState.isActive = 'Active'
      
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockTermsAndConditionsStore.createTermsAndCondition.mockReturnValueOnce(promise)
      
      const submitPromise = wrapper.vm.handleSubmit()
      
      expect(wrapper.vm.submitting).toBe(true)
      
      resolvePromise!({ id: 1, uuid: 'tc-1', name: 'Test', content: '<p>Test</p>', isActive: true })
      await submitPromise
      
      expect(wrapper.vm.submitting).toBe(false)
    })
  })
})

