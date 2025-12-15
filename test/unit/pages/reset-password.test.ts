import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ResetPasswordPage from '@/pages/reset-password/index.vue'

// Mock Supabase client
const mockSetSession = vi.fn()
const mockGetSession = vi.fn()
const mockUpdateUser = vi.fn()
const mockSignOut = vi.fn()

const mockSupabaseClient = {
  auth: {
    setSession: mockSetSession,
    getSession: mockGetSession,
    updateUser: mockUpdateUser,
    signOut: mockSignOut
  }
}

vi.mock('@/utils/supabaseClient', () => ({
  useSupabaseClient: () => mockSupabaseClient
}))

// Mock router
const mockPush = vi.fn()
const mockBack = vi.fn()
const mockRouter = {
  push: mockPush,
  back: mockBack
}

// Mock route
const mockRoute = {
  query: {},
  params: {}
}

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
  useRoute: () => mockRoute
}))

// Mock globally for Nuxt auto-imports
vi.stubGlobal('useRouter', () => mockRouter)
vi.stubGlobal('useRoute', () => mockRoute)

// Mock window.location and history
const mockReplaceState = vi.fn()
const mockLocation = {
  origin: 'http://localhost:3000',
  pathname: '/reset-password',
  hash: ''
}

global.window = {
  ...global.window,
  location: mockLocation as any,
  history: {
    replaceState: mockReplaceState
  } as any
}

describe('Reset Password Page', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocation.hash = ''
    mockRoute.query = {}
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    mockSetSession.mockResolvedValue({ data: { session: null }, error: null })
    mockUpdateUser.mockResolvedValue({ data: {}, error: null })
    mockSignOut.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.useFakeTimers()
    vi.runAllTimers()
    vi.useRealTimers()
  })

  const mountComponent = () => {
    return mount(ResetPasswordPage, {
      global: {
        stubs: {
          UCard: true,
          UAlert: true,
          UInput: true,
          UButton: true,
          NuxtLink: true
        }
      }
    })
  }

  describe('Component Rendering', () => {
    it('should render the reset password form', () => {
      wrapper = mountComponent()
      
      // Component should mount successfully
      expect(wrapper.exists()).toBe(true)
      const vm = wrapper.vm
      expect(vm).toBeDefined()
      expect(vm.newPassword).toBeDefined()
      expect(vm.confirmPassword).toBeDefined()
    })

    it('should have password input fields', () => {
      wrapper = mountComponent()
      
      const vm = wrapper.vm
      // Check that password fields exist in component state
      expect(vm.newPassword).toBeDefined()
      expect(vm.confirmPassword).toBeDefined()
    })

    it('should have reset password handler', () => {
      wrapper = mountComponent()
      
      const vm = wrapper.vm
      expect(typeof vm.handleResetPassword).toBe('function')
    })

    it('should have form validation', () => {
      wrapper = mountComponent()
      
      const vm = wrapper.vm
      expect(vm.isFormValid).toBeDefined()
    })
  })

  describe('Hash Fragment Handling', () => {
    it('should process recovery tokens from URL hash', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: { id: 'user-123' }
      }

      mockLocation.hash = '#access_token=test-access-token&refresh_token=test-refresh-token&type=recovery'
      mockSetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      wrapper = mountComponent()
      await nextTick()
      await nextTick() // Wait for onMounted

      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token'
      })
    })

    it('should clean up URL hash after setting session', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: { id: 'user-123' }
      }

      mockLocation.hash = '#access_token=test-access-token&refresh_token=test-refresh-token&type=recovery'
      mockSetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      wrapper = mountComponent()
      await nextTick()
      await nextTick()

      expect(mockReplaceState).toHaveBeenCalled()
    })

    it('should show error when hash session setup fails', async () => {
      mockLocation.hash = '#access_token=test-access-token&refresh_token=test-refresh-token&type=recovery'
      mockSetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid token' }
      })

      vi.useFakeTimers()
      wrapper = mountComponent()
      await nextTick()
      // Wait for onMounted async operations
      await vi.runAllTimersAsync()
      await nextTick()

      const vm = wrapper.vm
      expect(vm.alertMessage).toContain('Failed to authenticate')
      
      // Advance timer for the setTimeout in the component
      vi.advanceTimersByTime(3000)
      await nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/forgot-password')
      vi.useRealTimers()
    }, 10000)

    it('should ignore hash if type is not recovery', async () => {
      mockLocation.hash = '#access_token=test-access-token&refresh_token=test-refresh-token&type=invite'
      
      wrapper = mountComponent()
      await nextTick()
      await nextTick()

      expect(mockSetSession).not.toHaveBeenCalled()
    })
  })

  describe('Query Parameter Handling', () => {
    it('should process callback parameters from query string', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: { id: 'user-123' }
      }

      mockRoute.query = {
        success: 'true',
        user_id: 'user-123',
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token'
      }

      mockSetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      wrapper = mountComponent()
      await nextTick()
      await nextTick()

      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token'
      })
    })

    it('should show error message from query parameter', async () => {
      mockRoute.query = {
        error: 'Invalid%20reset%20link'
      }

      vi.useFakeTimers()
      wrapper = mountComponent()
      await nextTick()
      // Wait for onMounted async operations
      await vi.runAllTimersAsync()
      await nextTick()

      const vm = wrapper.vm
      expect(vm.alertMessage).toContain('Invalid reset link')
      
      // Advance timer for the setTimeout in the component
      vi.advanceTimersByTime(3000)
      await nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/forgot-password')
      vi.useRealTimers()
    }, 10000)
  })

  describe('Session Validation', () => {
    it('should show error when no session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      vi.useFakeTimers()
      wrapper = mountComponent()
      await nextTick()
      // Wait for onMounted async operations
      await vi.runAllTimersAsync()
      await nextTick()

      const vm = wrapper.vm
      expect(vm.alertMessage).toContain('Invalid or expired reset link')
      
      // Advance timer for the setTimeout in the component
      vi.advanceTimersByTime(3000)
      await nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/forgot-password')
      vi.useRealTimers()
    }, 10000)

    it('should allow password reset when session exists', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: { id: 'user-123' }
      }

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      wrapper = mountComponent()
      await nextTick()
      // Wait for onMounted to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

      const vm = wrapper.vm
      expect(vm.alertMessage).toContain('Please enter your new password below')
    })
  })

  describe('Password Validation', () => {
    it('should disable button when password is too short', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: { id: 'user-123' }
      }

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      wrapper = mountComponent()
      await nextTick()
      await nextTick()

      const vm = wrapper.vm
      vm.newPassword = 'Short1'
      vm.confirmPassword = 'Short1'
      await nextTick()

      expect(vm.isFormValid).toBe(false)
    })

    it('should disable button when passwords do not match', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: { id: 'user-123' }
      }

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      wrapper = mountComponent()
      await nextTick()
      await nextTick()

      const vm = wrapper.vm
      vm.newPassword = 'ValidPass123'
      vm.confirmPassword = 'DifferentPass123'
      await nextTick()

      expect(vm.isFormValid).toBe(false)
    })

    it('should disable button when password lacks required characters', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: { id: 'user-123' }
      }

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      wrapper = mountComponent()
      await nextTick()
      await nextTick()

      const vm = wrapper.vm
      // Password without uppercase
      vm.newPassword = 'lowercase123'
      vm.confirmPassword = 'lowercase123'
      await nextTick()

      expect(vm.isFormValid).toBe(false)
    })

    it('should enable button when password meets all requirements', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: { id: 'user-123' }
      }

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      wrapper = mountComponent()
      await nextTick()
      await nextTick()

      const vm = wrapper.vm
      vm.newPassword = 'ValidPass123'
      vm.confirmPassword = 'ValidPass123'
      await nextTick()

      expect(vm.isFormValid).toBe(true)
    })
  })

  describe('Password Reset Submission', () => {
    it('should show error when form is invalid', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: { id: 'user-123' }
      }

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      wrapper = mountComponent()
      await nextTick()
      await nextTick()

      const vm = wrapper.vm
      await vm.handleResetPassword()
      await nextTick()

      expect(vm.alertMessage).toContain('Please ensure passwords match')
      expect(mockUpdateUser).not.toHaveBeenCalled()
    })

    it('should update password when form is valid', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: { id: 'user-123' }
      }

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      wrapper = mountComponent()
      await nextTick()
      await nextTick()

      const vm = wrapper.vm
      vm.newPassword = 'NewPass123'
      vm.confirmPassword = 'NewPass123'
      await nextTick()

      await vm.handleResetPassword()
      await nextTick()
      await nextTick()

      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: 'NewPass123'
      })
    })

    it('should show success message after password update', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: { id: 'user-123' }
      }

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      vi.useFakeTimers()
      wrapper = mountComponent()
      await nextTick()
      await nextTick()

      const vm = wrapper.vm
      vm.newPassword = 'NewPass123'
      vm.confirmPassword = 'NewPass123'
      await nextTick()

      await vm.handleResetPassword()
      await nextTick()
      await nextTick()

      expect(vm.alertMessage).toContain('Password has been successfully reset')
      
      vi.advanceTimersByTime(2000)
      await nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/')
      vi.useRealTimers()
    })

    it('should clear password fields after successful reset', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: { id: 'user-123' }
      }

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      wrapper = mountComponent()
      await nextTick()
      await nextTick()

      const vm = wrapper.vm
      vm.newPassword = 'NewPass123'
      vm.confirmPassword = 'NewPass123'
      await nextTick()

      await vm.handleResetPassword()
      await nextTick()
      await nextTick()

      // Password fields should be cleared
      expect(vm.newPassword).toBe('')
      expect(vm.confirmPassword).toBe('')
    })

    it('should sign out user after password reset', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: { id: 'user-123' }
      }

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      wrapper = mountComponent()
      await nextTick()
      await nextTick()

      const vm = wrapper.vm
      vm.newPassword = 'NewPass123'
      vm.confirmPassword = 'NewPass123'
      await nextTick()

      await vm.handleResetPassword()
      await nextTick()
      await nextTick()

      expect(mockSignOut).toHaveBeenCalled()
    })

    it('should show error when password update fails', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: { id: 'user-123' }
      }

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      mockUpdateUser.mockResolvedValue({
        data: null,
        error: { message: 'Password update failed' }
      })

      wrapper = mountComponent()
      await nextTick()
      await nextTick()

      const vm = wrapper.vm
      vm.newPassword = 'NewPass123'
      vm.confirmPassword = 'NewPass123'
      await nextTick()

      await vm.handleResetPassword()
      await nextTick()
      await nextTick()

      expect(vm.alertMessage).toContain('Password update failed')
    })

    it('should check session before updating if not ready', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: { id: 'user-123' }
      }

      // First call returns null (not ready), second call returns session
      mockGetSession
        .mockResolvedValueOnce({ data: { session: null }, error: null })
        .mockResolvedValueOnce({ data: { session: mockSession }, error: null })

      wrapper = mountComponent()
      await nextTick()
      await nextTick()

      const vm = wrapper.vm
      vm.newPassword = 'NewPass123'
      vm.confirmPassword = 'NewPass123'
      await nextTick()

      await vm.handleResetPassword()
      await nextTick()
      await nextTick()

      // Should check session again (once in onMounted, once in handleResetPassword)
      expect(mockGetSession).toHaveBeenCalled()
    })

    it('should show error if session expired during submission', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: { id: 'user-123' }
      }

      // Session exists initially, but expires during submission
      // First call in onMounted sets isSessionReady to true
      // Second call in handleResetPassword (when isSessionReady is false) returns null
      mockGetSession
        .mockResolvedValueOnce({ data: { session: mockSession }, error: null })
        .mockResolvedValueOnce({ data: { session: null }, error: null })

      vi.useFakeTimers()
      wrapper = mountComponent()
      await nextTick()
      // Wait for onMounted async operations
      await vi.runAllTimersAsync()
      await nextTick()

      const vm = wrapper.vm
      // Reset isSessionReady to false to simulate session expiring
      vm.isSessionReady = false
      vm.newPassword = 'NewPass123'
      vm.confirmPassword = 'NewPass123'
      await nextTick()

      const resetPromise = vm.handleResetPassword()
      await nextTick()
      await resetPromise
      await nextTick()

      expect(vm.alertMessage).toContain('Session expired')
      
      // Advance timer for the setTimeout in the component
      vi.advanceTimersByTime(3000)
      await nextTick()
      
      expect(mockPush).toHaveBeenCalledWith('/forgot-password')
      vi.useRealTimers()
    }, 15000) // Increase timeout for this test
  })

  describe('Password Strength Indicator', () => {
    it('should show password strength when password is entered', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: { id: 'user-123' }
      }

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      wrapper = mountComponent()
      await nextTick()
      await nextTick()

      const vm = wrapper.vm
      vm.newPassword = 'Test'
      await nextTick()

      // Password strength indicator should be computed
      expect(vm.passwordStrength).toBeDefined()
      expect(vm.passwordStrength.label).toBeTruthy()
    })
  })
})

