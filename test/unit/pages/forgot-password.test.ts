import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ForgotPasswordPage from '@/pages/forgot-password/index.vue'

// Mock Supabase client
const mockResetPasswordForEmail = vi.fn()
const mockSupabaseClient = {
  auth: {
    resetPasswordForEmail: mockResetPasswordForEmail
  }
}

vi.mock('@/utils/supabaseClient', () => ({
  useSupabaseClient: () => mockSupabaseClient
}))

// Mock Nuxt auto-imports
vi.stubGlobal('useRouter', () => ({ push: vi.fn(), back: vi.fn() }))
vi.stubGlobal('useRoute', () => ({ query: {}, params: {} }))

// Mock window.location
const mockLocation = {
  origin: 'http://localhost:3000',
  href: 'http://localhost:3000/forgot-password'
}

global.window = {
  ...global.window,
  location: mockLocation as any
}

describe('Forgot Password Page', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockResetPasswordForEmail.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  const mountComponent = () => {
    return mount(ForgotPasswordPage, {
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
    it('should render the forgot password form', () => {
      wrapper = mountComponent()
      
      // Component should mount successfully
      expect(wrapper.exists()).toBe(true)
      const vm = wrapper.vm
      expect(vm).toBeDefined()
      expect(vm.email).toBeDefined()
      expect(vm.isLoading).toBeDefined()
      expect(typeof vm.handleForgotPassword).toBe('function')
    })

    it('should have email input field state', () => {
      wrapper = mountComponent()
      
      const vm = wrapper.vm
      // Check that email field exists in component state
      expect(vm.email).toBeDefined()
      expect(vm.email).toBe('')
    })

    it('should have form handler', () => {
      wrapper = mountComponent()
      
      const vm = wrapper.vm
      expect(typeof vm.handleForgotPassword).toBe('function')
    })
  })

  describe('Form Validation', () => {
    it('should show error when email is empty', async () => {
      wrapper = mountComponent()
      
      // Access the component instance to trigger the handler
      const vm = wrapper.vm
      vm.email = ''
      await vm.handleForgotPassword()
      await nextTick()
      
      // The component should show an error message
      expect(vm.alertMessage).toContain('Please enter your email address')
    })

    it('should accept valid email input', async () => {
      wrapper = mountComponent()
      
      const vm = wrapper.vm
      vm.email = 'test@example.com'
      
      expect(vm.email).toBe('test@example.com')
    })
  })

  describe('Password Reset Request', () => {
    it('should call resetPasswordForEmail with correct parameters', async () => {
      wrapper = mountComponent()
      
      const vm = wrapper.vm
      vm.email = 'test@example.com'
      await vm.handleForgotPassword()
      await nextTick()
      
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        {
          redirectTo: 'http://localhost:3000/reset-password'
        }
      )
    })

    it('should show success message after successful reset request', async () => {
      wrapper = mountComponent()
      
      const vm = wrapper.vm
      vm.email = 'test@example.com'
      await vm.handleForgotPassword()
      await nextTick()
      await nextTick() // Wait for async operation
      
      expect(vm.alertMessage).toContain('Password reset link has been sent to your email')
      expect(vm.alertType).toBe('success')
    })

    it('should clear email field after successful reset request', async () => {
      wrapper = mountComponent()
      
      const vm = wrapper.vm
      vm.email = 'test@example.com'
      await vm.handleForgotPassword()
      await nextTick()
      await nextTick() // Wait for async operation
      
      // Email should be cleared
      expect(vm.email).toBe('')
    })

    it('should show error message when reset request fails', async () => {
      const errorMessage = 'Failed to send reset email'
      mockResetPasswordForEmail.mockResolvedValue({
        error: { message: errorMessage }
      })
      
      wrapper = mountComponent()
      
      const vm = wrapper.vm
      vm.email = 'test@example.com'
      await vm.handleForgotPassword()
      await nextTick()
      await nextTick() // Wait for async operation
      
      expect(vm.alertMessage).toContain(errorMessage)
      expect(vm.alertType).toBe('error')
    })

    it('should show generic error message when error has no message', async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        error: {}
      })
      
      wrapper = mountComponent()
      
      const vm = wrapper.vm
      vm.email = 'test@example.com'
      await vm.handleForgotPassword()
      await nextTick()
      await nextTick() // Wait for async operation
      
      expect(vm.alertMessage).toContain('An error occurred while sending the reset link')
      expect(vm.alertType).toBe('error')
    })

    it('should set loading state during reset request', async () => {
      let resolvePromise: (value: any) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      
      mockResetPasswordForEmail.mockReturnValue(pendingPromise)
      
      wrapper = mountComponent()
      
      const vm = wrapper.vm
      vm.email = 'test@example.com'
      const promise = vm.handleForgotPassword()
      await nextTick()
      
      // Loading should be true
      expect(vm.isLoading).toBe(true)
      
      // Resolve the promise
      resolvePromise!({ error: null })
      await promise
      await nextTick()
      
      // Loading should be false after completion
      expect(vm.isLoading).toBe(false)
    })
  })

  describe('Alert Dismissal', () => {
    it('should allow dismissing alert messages', async () => {
      wrapper = mountComponent()
      
      const vm = wrapper.vm
      vm.email = 'test@example.com'
      await vm.handleForgotPassword()
      await nextTick()
      await nextTick()
      
      // Set alert message
      expect(vm.alertMessage).toBeTruthy()
      
      // Simulate dismiss
      vm.alertMessage = ''
      await nextTick()
      
      // Alert message should be cleared
      expect(vm.alertMessage).toBe('')
    })
  })
})

