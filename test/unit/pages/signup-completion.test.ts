import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SignupPage from '@/pages/auth/signup.vue'

// Mock Supabase client
const mockGetSession = vi.fn()
const mockUpdateUser = vi.fn()
const mockSetSession = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()

const mockFrom = vi.fn()
const mockSupabaseClient = {
  auth: {
    getSession: mockGetSession,
    updateUser: mockUpdateUser,
    setSession: mockSetSession
  },
  from: mockFrom
}

vi.mock('@/utils/supabaseClient', () => ({
  useSupabaseClient: () => mockSupabaseClient
}))

// Mock $fetch for API calls
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Mock auth store
const mockAuthStore = {
  syncAuthState: vi.fn(),
  fetchUser: vi.fn().mockResolvedValue(undefined),
  user: null,
  isInitialized: false
}

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore
}))

// Mock router
const mockRouterPush = vi.fn()
const mockRouter = {
  push: mockRouterPush
}

const mockRoute = {
  query: {}
}

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
  useRoute: () => mockRoute
}))

// Mock useToast
const mockToastAdd = vi.fn()
const mockToast = {
  add: mockToastAdd
}

vi.stubGlobal('useToast', () => mockToast)

// Mock window and timers
global.window = {
  location: {
    hash: '',
    href: '',
    origin: 'http://localhost:3000',
    pathname: '/auth/signup'
  },
  history: {
    replaceState: vi.fn()
  }
} as any

// Mock setTimeout and clearTimeout
vi.useFakeTimers()

describe('Signup Page - Completion Flow', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute.query = {}
    global.window.location.hash = ''
    
    // Setup default mock responses - incomplete profile for onMounted
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-123',
            email: 'test@example.com'
          }
        }
      },
      error: null
    })

    mockUpdateUser.mockResolvedValue({ error: null })

    // Setup profile query chain for onMounted (incomplete profile)
    mockSelect.mockReturnValue({
      eq: mockEq
    })

    mockEq.mockReturnValue({
      single: mockSingle,
      select: vi.fn().mockResolvedValue({
        data: [{ id: 1 }],
        error: null
      })
    })

    // Default: incomplete profile (so onMounted doesn't redirect)
    mockSingle.mockResolvedValue({
      data: {
        first_name: null,
        last_name: null,
        status: 'pending'
      },
      error: null
    })

    // Setup update chain
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 1 }],
          error: null
        })
      })
    })

    // Mock $fetch for complete-signup API endpoint
    mockFetch.mockResolvedValue({
      success: true,
      data: {
        user_id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        status: 'active'
      },
      message: 'Signup completed successfully'
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
    wrapper?.unmount()
  })

  const mountComponent = () => {
    return mount(SignupPage, {
      global: {
        stubs: {
          UCard: true,
          UInput: true,
          UButton: true,
          UAlert: true,
          NuxtLink: true
        }
      }
    })
  }

  describe('Successful Signup Completion', () => {
    it('should show success toast notification after successful signup', async () => {
      // Clear any calls from onMounted
      mockRouterPush.mockClear()
      mockFetch.mockClear()
      
      wrapper = mountComponent()
      
      // Wait for onMounted to complete
      await nextTick()
      await nextTick()
      
      // Clear any redirects from onMounted
      mockRouterPush.mockClear()
      
      // Set form values via component instance
      const vm = wrapper.vm
      vm.form.firstName = 'John'
      vm.form.lastName = 'Doe'
      vm.form.password = 'password123'
      vm.form.confirmPassword = 'password123'

      // Mock successful API response
      mockFetch.mockResolvedValue({
        success: true,
        data: {
          user_id: 'user-123',
          first_name: 'John',
          last_name: 'Doe',
          status: 'active'
        },
        message: 'Signup completed successfully'
      })

      // Trigger signup
      await wrapper.vm.handleSignup()

      // Wait for async operations
      await nextTick()
      vi.advanceTimersByTime(100)

      // Verify API was called
      expect(mockFetch).toHaveBeenCalledWith('/api/users/complete-signup', {
        method: 'POST',
        body: {
          userId: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          password: 'password123'
        }
      })

      // Verify toast was called with correct parameters
      expect(mockToastAdd).toHaveBeenCalledWith({
        title: 'Signup Successful',
        description: 'Signup is successful, please login to continue',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      })
    })

    it('should redirect to login page (/) after successful signup', async () => {
      // Clear any calls from onMounted
      mockRouterPush.mockClear()
      mockFetch.mockClear()
      
      wrapper = mountComponent()
      
      // Wait for onMounted to complete
      await nextTick()
      await nextTick()
      
      // Clear any redirects from onMounted
      mockRouterPush.mockClear()
      
      // Set form values via component instance
      const vm = wrapper.vm
      vm.form.firstName = 'John'
      vm.form.lastName = 'Doe'
      vm.form.password = 'password123'
      vm.form.confirmPassword = 'password123'

      // Mock successful API response
      mockFetch.mockResolvedValue({
        success: true,
        data: {
          user_id: 'user-123',
          first_name: 'John',
          last_name: 'Doe',
          status: 'active'
        },
        message: 'Signup completed successfully'
      })

      // Trigger signup
      await wrapper.vm.handleSignup()

      // Wait for async operations
      await nextTick()
      
      // Fast-forward timers to trigger setTimeout
      vi.advanceTimersByTime(1500)
      await nextTick()
      await nextTick() // Extra tick for nextTick inside setTimeout

      // Verify redirect to login page
      expect(mockRouterPush).toHaveBeenCalledWith('/')
      expect(mockRouterPush).not.toHaveBeenCalledWith('/Dashboard')
    })

    it('should redirect after 1500ms delay', async () => {
      // Clear any calls from onMounted
      mockRouterPush.mockClear()
      mockFetch.mockClear()
      
      wrapper = mountComponent()
      
      // Wait for onMounted to complete
      await nextTick()
      await nextTick()
      
      // Clear any redirects from onMounted
      mockRouterPush.mockClear()
      
      // Set form values via component instance
      const vm = wrapper.vm
      vm.form.firstName = 'John'
      vm.form.lastName = 'Doe'
      vm.form.password = 'password123'
      vm.form.confirmPassword = 'password123'

      // Mock successful API response
      mockFetch.mockResolvedValue({
        success: true,
        data: {
          user_id: 'user-123',
          first_name: 'John',
          last_name: 'Doe',
          status: 'active'
        },
        message: 'Signup completed successfully'
      })

      // Trigger signup
      await wrapper.vm.handleSignup()

      await nextTick()

      // Verify redirect is not called immediately
      expect(mockRouterPush).not.toHaveBeenCalled()

      // Fast-forward 1499ms - should still not be called
      vi.advanceTimersByTime(1499)
      await nextTick()
      expect(mockRouterPush).not.toHaveBeenCalled()

      // Fast-forward 1ms more (total 1500ms) - should be called now
      vi.advanceTimersByTime(1)
      await nextTick()
      await nextTick() // Extra tick for nextTick inside setTimeout
      expect(mockRouterPush).toHaveBeenCalledWith('/')
    })

    it('should update user profile before showing toast and redirecting', async () => {
      // Clear any calls from onMounted
      mockRouterPush.mockClear()
      mockFetch.mockClear()
      
      wrapper = mountComponent()
      
      // Wait for onMounted to complete
      await nextTick()
      await nextTick()
      
      // Clear any redirects from onMounted
      mockRouterPush.mockClear()
      
      // Set form values via component instance
      const vm = wrapper.vm
      vm.form.firstName = 'John'
      vm.form.lastName = 'Doe'
      vm.form.password = 'password123'
      vm.form.confirmPassword = 'password123'

      // Mock successful API response
      mockFetch.mockResolvedValue({
        success: true,
        data: {
          user_id: 'user-123',
          first_name: 'John',
          last_name: 'Doe',
          status: 'active'
        },
        message: 'Signup completed successfully'
      })

      // Trigger signup
      await wrapper.vm.handleSignup()

      await nextTick()

      // Verify API was called with correct data
      expect(mockFetch).toHaveBeenCalledWith('/api/users/complete-signup', {
        method: 'POST',
        body: {
          userId: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          password: 'password123'
        }
      })
      
      // Verify auth store fetchUser was called
      expect(mockAuthStore.fetchUser).toHaveBeenCalled()
    })

    it('should fetch user data from auth store after successful signup', async () => {
      // Clear any calls from onMounted
      mockRouterPush.mockClear()
      mockFetch.mockClear()
      mockAuthStore.fetchUser.mockClear()
      
      wrapper = mountComponent()
      
      // Wait for onMounted to complete
      await nextTick()
      await nextTick()
      
      // Clear any redirects from onMounted
      mockRouterPush.mockClear()
      
      // Set form values via component instance
      const vm = wrapper.vm
      vm.form.firstName = 'John'
      vm.form.lastName = 'Doe'
      vm.form.password = 'password123'
      vm.form.confirmPassword = 'password123'

      // Mock successful API response
      mockFetch.mockResolvedValue({
        success: true,
        data: {
          user_id: 'user-123',
          first_name: 'John',
          last_name: 'Doe',
          status: 'active'
        },
        message: 'Signup completed successfully'
      })

      // Trigger signup
      await wrapper.vm.handleSignup()

      await nextTick()

      // Verify auth store fetchUser was called
      expect(mockAuthStore.fetchUser).toHaveBeenCalled()
    })

    it('should update user password during signup', async () => {
      mockFetch.mockClear()
      
      wrapper = mountComponent()
      
      // Set form values via component instance
      const vm = wrapper.vm
      vm.form.firstName = 'John'
      vm.form.lastName = 'Doe'
      vm.form.password = 'password123'
      vm.form.confirmPassword = 'password123'

      // Mock successful API response
      mockFetch.mockResolvedValue({
        success: true,
        data: {
          user_id: 'user-123',
          first_name: 'John',
          last_name: 'Doe',
          status: 'active'
        },
        message: 'Signup completed successfully'
      })

      // Trigger signup
      await wrapper.vm.handleSignup()

      await nextTick()

      // Verify API was called with password in the body
      expect(mockFetch).toHaveBeenCalledWith('/api/users/complete-signup', {
        method: 'POST',
        body: {
          userId: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          password: 'password123'
        }
      })
    })

    it('should update user metadata with first and last name', async () => {
      mockFetch.mockClear()
      
      wrapper = mountComponent()
      
      // Set form values via component instance
      const vm = wrapper.vm
      vm.form.firstName = 'John'
      vm.form.lastName = 'Doe'
      vm.form.password = 'password123'
      vm.form.confirmPassword = 'password123'

      // Mock successful API response
      mockFetch.mockResolvedValue({
        success: true,
        data: {
          user_id: 'user-123',
          first_name: 'John',
          last_name: 'Doe',
          status: 'active'
        },
        message: 'Signup completed successfully'
      })

      // Trigger signup
      await wrapper.vm.handleSignup()

      await nextTick()

      // Verify API was called with first and last name in the body
      expect(mockFetch).toHaveBeenCalledWith('/api/users/complete-signup', {
        method: 'POST',
        body: {
          userId: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          password: 'password123'
        }
      })
    })
  })

  describe('Error Handling', () => {
    it('should not show toast or redirect if signup fails', async () => {
      // Clear any calls from onMounted
      mockRouterPush.mockClear()
      mockFetch.mockClear()
      
      wrapper = mountComponent()
      
      // Wait for onMounted to complete
      await nextTick()
      await nextTick()
      
      // Clear any redirects from onMounted
      mockRouterPush.mockClear()
      
      // Set form values via component instance
      const vm = wrapper.vm
      vm.form.firstName = 'John'
      vm.form.lastName = 'Doe'
      vm.form.password = 'password123'
      vm.form.confirmPassword = 'password123'

      // Mock API error
      mockFetch.mockRejectedValue(new Error('API call failed'))

      // Trigger signup
      await wrapper.vm.handleSignup()

      await nextTick()
      vi.advanceTimersByTime(1500)
      await nextTick()

      // Verify toast was not called
      expect(mockToastAdd).not.toHaveBeenCalled()
      
      // Verify redirect was not called (from handleSignup - onMounted might have called it)
      const calls = mockRouterPush.mock.calls.filter(call => call[0] === '/')
      expect(calls.length).toBe(0)
    })

    it('should not show toast or redirect if profile update fails', async () => {
      // Clear any calls from onMounted
      mockRouterPush.mockClear()
      mockFetch.mockClear()
      
      wrapper = mountComponent()
      
      // Wait for onMounted to complete
      await nextTick()
      await nextTick()
      
      // Clear any redirects from onMounted
      mockRouterPush.mockClear()
      
      // Set form values via component instance
      const vm = wrapper.vm
      vm.form.firstName = 'John'
      vm.form.lastName = 'Doe'
      vm.form.password = 'password123'
      vm.form.confirmPassword = 'password123'

      // Mock API error response
      mockFetch.mockResolvedValue({
        success: false,
        message: 'Profile update failed'
      })

      // Trigger signup
      await wrapper.vm.handleSignup()

      await nextTick()
      vi.advanceTimersByTime(1500)
      await nextTick()

      // Verify toast was not called
      expect(mockToastAdd).not.toHaveBeenCalled()
      
      // Verify redirect was not called (from handleSignup)
      const calls = mockRouterPush.mock.calls.filter(call => call[0] === '/')
      expect(calls.length).toBe(0)
    })

    it('should not show toast or redirect if no session exists', async () => {
      // Clear any calls from onMounted
      mockRouterPush.mockClear()
      mockFetch.mockClear()
      mockToastAdd.mockClear()
      
      wrapper = mountComponent()
      
      // Wait for onMounted to complete
      await nextTick()
      await nextTick()
      
      // Clear any redirects and API calls from onMounted
      mockRouterPush.mockClear()
      mockToastAdd.mockClear()
      mockFetch.mockClear() // Clear fetch calls from onMounted
      
      // Set form values via component instance
      const vm = wrapper.vm
      vm.form.firstName = 'John'
      vm.form.lastName = 'Doe'
      vm.form.password = 'password123'
      vm.form.confirmPassword = 'password123'

      // Mock no session for handleSignup
      // Reset mockGetSession to return no session for handleSignup call
      // The onMounted already ran with a session, now handleSignup should get no session
      mockGetSession.mockReset()
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      // Trigger signup - should throw error and not call API
      await wrapper.vm.handleSignup()

      await nextTick()
      vi.advanceTimersByTime(1500)
      await nextTick()

      // Verify no complete-signup API call was made (handleSignup should throw before calling API)
      const completeSignupCalls = mockFetch.mock.calls.filter(
        call => Array.isArray(call) && call.length > 0 && call[0] === '/api/users/complete-signup'
      )
      expect(completeSignupCalls.length).toBe(0)
      
      // Verify toast was not called
      expect(mockToastAdd).not.toHaveBeenCalled()
      
      // Verify redirect was not called (from handleSignup)
      const calls = mockRouterPush.mock.calls.filter(call => call[0] === '/')
      expect(calls.length).toBe(0)
    })
  })

  describe('Form Validation', () => {
    it('should not proceed with signup if form is invalid', async () => {
      // Clear any calls from onMounted
      mockRouterPush.mockClear()
      
      wrapper = mountComponent()
      
      // Wait for onMounted to complete
      await nextTick()
      await nextTick()
      
      // Clear any redirects from onMounted
      mockRouterPush.mockClear()
      
      // Set invalid form values (passwords don't match) via component instance
      const vm = wrapper.vm
      vm.form.firstName = 'John'
      vm.form.lastName = 'Doe'
      vm.form.password = 'password123'
      vm.form.confirmPassword = 'differentpassword'

      // Trigger signup
      await wrapper.vm.handleSignup()

      await nextTick()

      // Verify toast was not called
      expect(mockToastAdd).not.toHaveBeenCalled()
      
      // Verify redirect was not called (from handleSignup)
      const calls = mockRouterPush.mock.calls.filter(call => call[0] === '/')
      expect(calls.length).toBe(0)
      
      // Verify no API calls were made
      expect(mockUpdateUser).not.toHaveBeenCalled()
    })

    it('should not proceed with signup if password is too short', async () => {
      // Clear any calls from onMounted
      mockRouterPush.mockClear()
      
      wrapper = mountComponent()
      
      // Wait for onMounted to complete
      await nextTick()
      await nextTick()
      
      // Clear any redirects from onMounted
      mockRouterPush.mockClear()
      
      // Set form values with short password via component instance
      const vm = wrapper.vm
      vm.form.firstName = 'John'
      vm.form.lastName = 'Doe'
      vm.form.password = 'short'
      vm.form.confirmPassword = 'short'

      // Trigger signup
      await wrapper.vm.handleSignup()

      await nextTick()

      // Verify toast was not called
      expect(mockToastAdd).not.toHaveBeenCalled()
      
      // Verify redirect was not called (from handleSignup)
      const calls = mockRouterPush.mock.calls.filter(call => call[0] === '/')
      expect(calls.length).toBe(0)
    })
  })
})

