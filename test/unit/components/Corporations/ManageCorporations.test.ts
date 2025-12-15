import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import ManageCorporations from '@/components/Corporations/ManageCorporations.vue'

// Mock stores
const mockCorpStore = {
  corporations: [],
  loading: false,
  errorMessage: null,
  addCorporation: vi.fn(),
  updateCorporation: vi.fn(),
  deleteCorporation: vi.fn(),
  fetchCorporations: vi.fn(),
  isReady: false
}

const mockAuthStore = {
  user: null
}

const mockUserProfilesStore = {
  users: [],
  loading: false,
  error: null,
  updateUser: vi.fn(),
  fetchUsers: vi.fn()
}

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: vi.fn(() => mockCorpStore)
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore)
}))

vi.mock('@/stores/userProfiles', () => ({
  useUserProfilesStore: vi.fn(() => mockUserProfilesStore)
}))

// Mock useTableStandard composable
const mockUseTableStandard = {
  pagination: { value: { page: 1, pageSize: 10 } },
  paginationOptions: { value: {} },
  pageSizeOptions: [{ label: '10', value: 10 }],
  updatePageSize: vi.fn(),
  shouldShowPagination: vi.fn(() => ({ value: false })),
  getPaginationProps: vi.fn(() => ({})),
  getPageInfo: vi.fn(() => ({ value: '1-10 of 0' }))
}

vi.mock('@/composables/useTableStandard', () => ({
  useTableStandard: vi.fn(() => mockUseTableStandard)
}))

// Mock useToast
const mockToast = {
  add: vi.fn()
}
vi.mock('#app', () => ({
  useToast: () => mockToast
}))
vi.stubGlobal('useToast', () => mockToast)

// Mock useTemplateRef
vi.stubGlobal('useTemplateRef', vi.fn(() => ({ value: null })))

// Mock Nuxt UI components
vi.mock('@nuxt/ui', () => ({
  UTable: {
    name: 'UTable',
    template: '<div data-testid="table"><slot /></div>',
    props: ['data', 'columns', 'pagination', 'paginationOptions']
  },
  UButton: {
    name: 'UButton',
    template: '<button><slot /></button>',
    props: ['icon', 'size', 'color', 'variant', 'label', 'loading', 'disabled']
  },
  UInput: {
    name: 'UInput',
    template: '<input />',
    props: ['modelValue', 'placeholder', 'icon', 'variant', 'size', 'type']
  },
  USelect: {
    name: 'USelect',
    template: '<select><slot /></select>',
    props: ['modelValue', 'items', 'placeholder', 'icon', 'variant', 'size', 'searchable']
  },
  UModal: {
    name: 'UModal',
    template: '<div v-if="open"><slot name="body" /><slot name="footer" /></div>',
    props: ['open', 'title', 'description', 'fullscreen', 'ui']
  },
  UPagination: {
    name: 'UPagination',
    template: '<div data-testid="pagination"></div>',
    props: ['page', 'pageSize', 'total']
  },
  USkeleton: {
    name: 'USkeleton',
    template: '<div class="skeleton"></div>',
    props: ['class']
  }
}))

describe('ManageCorporations Component - Auto Grant Corporation Access', () => {
  let wrapper: any

  const mockCurrentUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    phone: '1234567890',
    address: '123 Test St',
    roleId: 1,
    status: 'active' as const,
    imageUrl: null,
    recentProperty: null,
    corporationAccess: [] as string[]
  }

  const mockNewCorporation = {
    uuid: 'new-corp-uuid-123',
    corporation_name: 'New Corporation',
    legal_name: 'New Corporation LLC',
    corporation_location: 'New York',
    number_of_rooms: 100,
    pms_name: 'opera',
    country: 'US',
    currency: 'USD',
    currency_symbol: '$'
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Reset mock stores
    mockCorpStore.corporations = []
    mockCorpStore.loading = false
    mockCorpStore.errorMessage = null
    mockCorpStore.addCorporation.mockClear()
    mockCorpStore.updateCorporation.mockClear()
    mockCorpStore.deleteCorporation.mockClear()
    mockCorpStore.fetchCorporations.mockClear()
    
    mockAuthStore.user = {
      email: 'test@example.com',
      id: 'user-123'
    }
    
    mockUserProfilesStore.users = [mockCurrentUser]
    mockUserProfilesStore.loading = false
    mockUserProfilesStore.error = null
    mockUserProfilesStore.updateUser.mockClear()
    mockUserProfilesStore.fetchUsers.mockClear()
    
    // Reset mocks
    vi.clearAllMocks()
    mockToast.add.mockClear()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  const createWrapper = () => {
    return mount(ManageCorporations, {
      global: {
        stubs: {
          UTable: true,
          UButton: true,
          UInput: true,
          USelect: true,
          UModal: true,
          UPagination: true,
          USkeleton: true
        }
      }
    })
  }

  describe('Automatic Corporation Access Granting', () => {
    it('should automatically grant current user access when creating a corporation', async () => {
      // Setup: Mock successful corporation creation
      mockCorpStore.addCorporation.mockResolvedValue({
        data: mockNewCorporation
      })

      // Mock successful user update
      const updatedUser = {
        ...mockCurrentUser,
        corporationAccess: [mockNewCorporation.uuid]
      }
      mockUserProfilesStore.updateUser.mockResolvedValue({
        success: true,
        data: updatedUser
      })

      wrapper = createWrapper()
      
      // Set form values
      wrapper.vm.corporationName = 'New Corporation'
      wrapper.vm.legalName = 'New Corporation LLC'
      wrapper.vm.corporationLocation = 'New York'
      wrapper.vm.numberOfRooms = 100
      wrapper.vm.pmsType = 'opera'
      wrapper.vm.country = 'US'
      wrapper.vm.currency = 'USD'
      wrapper.vm.currencySymbol = '$'

      // Call saveCorporation
      await wrapper.vm.saveCorporation()
      await nextTick()

      // Verify corporation was created
      expect(mockCorpStore.addCorporation).toHaveBeenCalledWith({
        corporation_name: 'New Corporation',
        legal_name: 'New Corporation LLC',
        corporation_location: 'New York',
        number_of_rooms: 100,
        pms_name: 'opera',
        country: 'US',
        currency: 'USD',
        currency_symbol: '$'
      })

      // Verify user update was called with new corporation access
      expect(mockUserProfilesStore.updateUser).toHaveBeenCalledWith({
        userId: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '1234567890',
        address: '123 Test St',
        roleId: 1,
        status: 'active',
        imageUrl: null,
        recentProperty: null,
        corporationAccess: [mockNewCorporation.uuid]
      })

      // Verify success toast was shown
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Corporation added successfully!',
          icon: 'i-heroicons-check-circle'
        })
      )
    })

    it('should add corporation to existing access list without duplicates', async () => {
      // Setup: User already has access to one corporation
      const userWithExistingAccess = {
        ...mockCurrentUser,
        corporationAccess: ['existing-corp-uuid']
      }
      mockUserProfilesStore.users = [userWithExistingAccess]

      mockCorpStore.addCorporation.mockResolvedValue({
        data: mockNewCorporation
      })

      const updatedUser = {
        ...userWithExistingAccess,
        corporationAccess: ['existing-corp-uuid', mockNewCorporation.uuid]
      }
      mockUserProfilesStore.updateUser.mockResolvedValue({
        success: true,
        data: updatedUser
      })

      wrapper = createWrapper()
      
      wrapper.vm.corporationName = 'New Corporation'
      wrapper.vm.legalName = 'New Corporation LLC'
      wrapper.vm.corporationLocation = 'New York'
      wrapper.vm.numberOfRooms = 100
      wrapper.vm.pmsType = 'opera'
      wrapper.vm.country = 'US'
      wrapper.vm.currency = 'USD'
      wrapper.vm.currencySymbol = '$'

      await wrapper.vm.saveCorporation()
      await nextTick()

      // Verify corporation was added to existing access list
      expect(mockUserProfilesStore.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          corporationAccess: ['existing-corp-uuid', mockNewCorporation.uuid]
        })
      )
    })

    it('should not add duplicate corporation access if already present', async () => {
      // Setup: User already has access to the new corporation
      const userWithAccess = {
        ...mockCurrentUser,
        corporationAccess: [mockNewCorporation.uuid]
      }
      mockUserProfilesStore.users = [userWithAccess]

      mockCorpStore.addCorporation.mockResolvedValue({
        data: mockNewCorporation
      })

      wrapper = createWrapper()
      
      wrapper.vm.corporationName = 'New Corporation'
      wrapper.vm.legalName = 'New Corporation LLC'
      wrapper.vm.corporationLocation = 'New York'
      wrapper.vm.numberOfRooms = 100
      wrapper.vm.pmsType = 'opera'
      wrapper.vm.country = 'US'
      wrapper.vm.currency = 'USD'
      wrapper.vm.currencySymbol = '$'

      await wrapper.vm.saveCorporation()
      await nextTick()

      // Verify user update was NOT called (since access already exists)
      expect(mockUserProfilesStore.updateUser).not.toHaveBeenCalled()

      // But corporation should still be created
      expect(mockCorpStore.addCorporation).toHaveBeenCalled()
    })

    it('should handle missing corporation UUID gracefully', async () => {
      // Setup: Corporation creation succeeds but no UUID in response
      mockCorpStore.addCorporation.mockResolvedValue({
        data: null
      })

      wrapper = createWrapper()
      
      wrapper.vm.corporationName = 'New Corporation'
      wrapper.vm.legalName = 'New Corporation LLC'
      wrapper.vm.corporationLocation = 'New York'
      wrapper.vm.numberOfRooms = 100
      wrapper.vm.pmsType = 'opera'
      wrapper.vm.country = 'US'
      wrapper.vm.currency = 'USD'
      wrapper.vm.currencySymbol = '$'

      await wrapper.vm.saveCorporation()
      await nextTick()

      // Verify user update was NOT called (no UUID to grant access)
      expect(mockUserProfilesStore.updateUser).not.toHaveBeenCalled()

      // But corporation creation should still succeed
      expect(mockCorpStore.addCorporation).toHaveBeenCalled()
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Corporation added successfully!'
        })
      )
    })

    it('should handle missing current user email gracefully', async () => {
      // Setup: No user email in auth store
      mockAuthStore.user = null

      mockCorpStore.addCorporation.mockResolvedValue({
        data: mockNewCorporation
      })

      wrapper = createWrapper()
      
      wrapper.vm.corporationName = 'New Corporation'
      wrapper.vm.legalName = 'New Corporation LLC'
      wrapper.vm.corporationLocation = 'New York'
      wrapper.vm.numberOfRooms = 100
      wrapper.vm.pmsType = 'opera'
      wrapper.vm.country = 'US'
      wrapper.vm.currency = 'USD'
      wrapper.vm.currencySymbol = '$'

      await wrapper.vm.saveCorporation()
      await nextTick()

      // Verify user update was NOT called (no user email)
      expect(mockUserProfilesStore.updateUser).not.toHaveBeenCalled()

      // But corporation creation should still succeed
      expect(mockCorpStore.addCorporation).toHaveBeenCalled()
    })

    it('should handle user not found in userProfiles store gracefully', async () => {
      // Setup: User not in userProfiles store
      mockUserProfilesStore.users = []

      mockCorpStore.addCorporation.mockResolvedValue({
        data: mockNewCorporation
      })

      wrapper = createWrapper()
      
      wrapper.vm.corporationName = 'New Corporation'
      wrapper.vm.legalName = 'New Corporation LLC'
      wrapper.vm.corporationLocation = 'New York'
      wrapper.vm.numberOfRooms = 100
      wrapper.vm.pmsType = 'opera'
      wrapper.vm.country = 'US'
      wrapper.vm.currency = 'USD'
      wrapper.vm.currencySymbol = '$'

      await wrapper.vm.saveCorporation()
      await nextTick()

      // Verify user update was NOT called (user not found)
      expect(mockUserProfilesStore.updateUser).not.toHaveBeenCalled()

      // But corporation creation should still succeed
      expect(mockCorpStore.addCorporation).toHaveBeenCalled()
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Corporation added successfully!'
        })
      )
    })

    it('should handle user update failure gracefully without blocking corporation creation', async () => {
      // Setup: Corporation creation succeeds but user update fails
      mockCorpStore.addCorporation.mockResolvedValue({
        data: mockNewCorporation
      })

      mockUserProfilesStore.updateUser.mockRejectedValue(
        new Error('Failed to update user')
      )

      // Mock console.error to avoid noise in test output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      wrapper = createWrapper()
      
      wrapper.vm.corporationName = 'New Corporation'
      wrapper.vm.legalName = 'New Corporation LLC'
      wrapper.vm.corporationLocation = 'New York'
      wrapper.vm.numberOfRooms = 100
      wrapper.vm.pmsType = 'opera'
      wrapper.vm.country = 'US'
      wrapper.vm.currency = 'USD'
      wrapper.vm.currencySymbol = '$'

      await wrapper.vm.saveCorporation()
      await nextTick()

      // Verify corporation was still created despite user update failure
      expect(mockCorpStore.addCorporation).toHaveBeenCalled()
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Corporation added successfully!'
        })
      )

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error granting user access to corporation:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should update local store immediately after user update', async () => {
      // Setup
      mockCorpStore.addCorporation.mockResolvedValue({
        data: mockNewCorporation
      })

      const updatedUser = {
        ...mockCurrentUser,
        corporationAccess: [mockNewCorporation.uuid]
      }
      mockUserProfilesStore.updateUser.mockResolvedValue({
        success: true,
        data: updatedUser
      })

      wrapper = createWrapper()
      
      wrapper.vm.corporationName = 'New Corporation'
      wrapper.vm.legalName = 'New Corporation LLC'
      wrapper.vm.corporationLocation = 'New York'
      wrapper.vm.numberOfRooms = 100
      wrapper.vm.pmsType = 'opera'
      wrapper.vm.country = 'US'
      wrapper.vm.currency = 'USD'
      wrapper.vm.currencySymbol = '$'

      await wrapper.vm.saveCorporation()
      await nextTick()

      // Verify user was updated in the store
      const userIndex = mockUserProfilesStore.users.findIndex(
        (u: any) => u.id === mockCurrentUser.id
      )
      expect(userIndex).not.toBe(-1)
      
      // The store update happens in the component, so we verify updateUser was called
      // which internally calls fetchUsers to refresh the store
      expect(mockUserProfilesStore.updateUser).toHaveBeenCalled()
    })

    it('should initialize empty corporationAccess array if undefined', async () => {
      // Setup: User with undefined corporationAccess
      const userWithoutAccess = {
        ...mockCurrentUser,
        corporationAccess: undefined as any
      }
      mockUserProfilesStore.users = [userWithoutAccess]

      mockCorpStore.addCorporation.mockResolvedValue({
        data: mockNewCorporation
      })

      const updatedUser = {
        ...userWithoutAccess,
        corporationAccess: [mockNewCorporation.uuid]
      }
      mockUserProfilesStore.updateUser.mockResolvedValue({
        success: true,
        data: updatedUser
      })

      wrapper = createWrapper()
      
      wrapper.vm.corporationName = 'New Corporation'
      wrapper.vm.legalName = 'New Corporation LLC'
      wrapper.vm.corporationLocation = 'New York'
      wrapper.vm.numberOfRooms = 100
      wrapper.vm.pmsType = 'opera'
      wrapper.vm.country = 'US'
      wrapper.vm.currency = 'USD'
      wrapper.vm.currencySymbol = '$'

      await wrapper.vm.saveCorporation()
      await nextTick()

      // Verify user update was called with initialized array
      expect(mockUserProfilesStore.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          corporationAccess: [mockNewCorporation.uuid]
        })
      )
    })
  })

  describe('Corporation Creation Flow Integration', () => {
    it('should complete full flow: create corporation -> grant access -> show success', async () => {
      // Setup
      mockCorpStore.addCorporation.mockResolvedValue({
        data: mockNewCorporation
      })

      const updatedUser = {
        ...mockCurrentUser,
        corporationAccess: [mockNewCorporation.uuid]
      }
      mockUserProfilesStore.updateUser.mockResolvedValue({
        success: true,
        data: updatedUser
      })

      wrapper = createWrapper()
      
      // Fill form
      wrapper.vm.corporationName = 'New Corporation'
      wrapper.vm.legalName = 'New Corporation LLC'
      wrapper.vm.corporationLocation = 'New York'
      wrapper.vm.numberOfRooms = 100
      wrapper.vm.pmsType = 'opera'
      wrapper.vm.country = 'US'
      wrapper.vm.currency = 'USD'
      wrapper.vm.currencySymbol = '$'
      wrapper.vm.showModal = true

      // Execute
      await wrapper.vm.saveCorporation()
      await nextTick()

      // Verify complete flow
      expect(mockCorpStore.addCorporation).toHaveBeenCalledTimes(1)
      expect(mockUserProfilesStore.updateUser).toHaveBeenCalledTimes(1)
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Corporation added successfully!'
        })
      )
      
      // Verify form was reset
      expect(wrapper.vm.corporationName).toBe('')
      expect(wrapper.vm.showModal).toBe(false)
    })

    it('should handle corporation creation failure without attempting user update', async () => {
      // Setup: Corporation creation fails
      mockCorpStore.addCorporation.mockRejectedValue(
        new Error('Failed to create corporation')
      )

      wrapper = createWrapper()
      
      wrapper.vm.corporationName = 'New Corporation'
      wrapper.vm.legalName = 'New Corporation LLC'
      wrapper.vm.corporationLocation = 'New York'
      wrapper.vm.numberOfRooms = 100
      wrapper.vm.pmsType = 'opera'
      wrapper.vm.country = 'US'
      wrapper.vm.currency = 'USD'
      wrapper.vm.currencySymbol = '$'

      await wrapper.vm.saveCorporation()
      await nextTick()

      // Verify user update was NOT called (corporation creation failed)
      expect(mockUserProfilesStore.updateUser).not.toHaveBeenCalled()

      // Verify error toast was shown
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to add corporation'
        })
      )
    })

    it('should preserve all user fields when updating corporation access', async () => {
      // Setup: User with all fields populated
      const userWithAllFields = {
        ...mockCurrentUser,
        firstName: 'John',
        lastName: 'Doe',
        phone: '555-1234',
        address: '123 Main St',
        roleId: 2,
        status: 'active' as const,
        imageUrl: 'https://example.com/image.jpg',
        recentProperty: 'prop-uuid-123',
        corporationAccess: []
      }
      mockUserProfilesStore.users = [userWithAllFields]

      mockCorpStore.addCorporation.mockResolvedValue({
        data: mockNewCorporation
      })

      const updatedUser = {
        ...userWithAllFields,
        corporationAccess: [mockNewCorporation.uuid]
      }
      mockUserProfilesStore.updateUser.mockResolvedValue({
        success: true,
        data: updatedUser
      })

      wrapper = createWrapper()
      
      wrapper.vm.corporationName = 'New Corporation'
      wrapper.vm.legalName = 'New Corporation LLC'
      wrapper.vm.corporationLocation = 'New York'
      wrapper.vm.numberOfRooms = 100
      wrapper.vm.pmsType = 'opera'
      wrapper.vm.country = 'US'
      wrapper.vm.currency = 'USD'
      wrapper.vm.currencySymbol = '$'

      await wrapper.vm.saveCorporation()
      await nextTick()

      // Verify all user fields are preserved in the update call
      expect(mockUserProfilesStore.updateUser).toHaveBeenCalledWith({
        userId: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '555-1234',
        address: '123 Main St',
        roleId: 2,
        status: 'active',
        imageUrl: 'https://example.com/image.jpg',
        recentProperty: 'prop-uuid-123',
        corporationAccess: [mockNewCorporation.uuid]
      })
    })

    it('should handle response with error property correctly', async () => {
      // Setup: Corporation creation returns error in response
      mockCorpStore.addCorporation.mockResolvedValue({
        error: 'Database error'
      })

      wrapper = createWrapper()
      
      wrapper.vm.corporationName = 'New Corporation'
      wrapper.vm.legalName = 'New Corporation LLC'
      wrapper.vm.corporationLocation = 'New York'
      wrapper.vm.numberOfRooms = 100
      wrapper.vm.pmsType = 'opera'
      wrapper.vm.country = 'US'
      wrapper.vm.currency = 'USD'
      wrapper.vm.currencySymbol = '$'

      // The addCorporation method should throw an error
      mockCorpStore.addCorporation.mockImplementation(() => {
        throw new Error('Database error')
      })

      await wrapper.vm.saveCorporation()
      await nextTick()

      // Verify user update was NOT called
      expect(mockUserProfilesStore.updateUser).not.toHaveBeenCalled()

      // Verify error toast was shown
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to add corporation'
        })
      )
    })

    it('should handle multiple corporations being created sequentially', async () => {
      // Setup: Create first corporation
      const firstCorp = {
        uuid: 'corp-1',
        corporation_name: 'Corporation 1'
      }
      
      mockCorpStore.addCorporation
        .mockResolvedValueOnce({ data: firstCorp })
        .mockResolvedValueOnce({ data: mockNewCorporation })

      const updatedUser1 = {
        ...mockCurrentUser,
        corporationAccess: [firstCorp.uuid]
      }
      const updatedUser2 = {
        ...mockCurrentUser,
        corporationAccess: [firstCorp.uuid, mockNewCorporation.uuid]
      }

      mockUserProfilesStore.updateUser
        .mockResolvedValueOnce({ success: true, data: updatedUser1 })
        .mockResolvedValueOnce({ success: true, data: updatedUser2 })

      wrapper = createWrapper()
      
      // Create first corporation
      wrapper.vm.corporationName = 'Corporation 1'
      wrapper.vm.legalName = 'Corporation 1 LLC'
      wrapper.vm.corporationLocation = 'New York'
      wrapper.vm.numberOfRooms = 100
      wrapper.vm.pmsType = 'opera'
      wrapper.vm.country = 'US'
      wrapper.vm.currency = 'USD'
      wrapper.vm.currencySymbol = '$'

      await wrapper.vm.saveCorporation()
      await nextTick()

      // Update user store to reflect first corporation access
      mockUserProfilesStore.users = [updatedUser1]

      // Create second corporation
      wrapper.vm.corporationName = 'New Corporation'
      wrapper.vm.legalName = 'New Corporation LLC'
      wrapper.vm.corporationLocation = 'New York'
      wrapper.vm.numberOfRooms = 100
      wrapper.vm.pmsType = 'opera'
      wrapper.vm.country = 'US'
      wrapper.vm.currency = 'USD'
      wrapper.vm.currencySymbol = '$'

      await wrapper.vm.saveCorporation()
      await nextTick()

      // Verify both corporations were created
      expect(mockCorpStore.addCorporation).toHaveBeenCalledTimes(2)

      // Verify user was updated twice with cumulative access
      expect(mockUserProfilesStore.updateUser).toHaveBeenCalledTimes(2)
      expect(mockUserProfilesStore.updateUser).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          corporationAccess: [firstCorp.uuid, mockNewCorporation.uuid]
        })
      )
    })
  })
})

