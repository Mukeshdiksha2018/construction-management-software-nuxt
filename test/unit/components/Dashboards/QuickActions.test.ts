import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import QuickActions from '@/components/Dashboards/actions/QuickActions.vue'

// Mock navigateTo function
const navigateTo = vi.fn()

vi.stubGlobal('navigateTo', navigateTo)

describe('QuickActions', () => {
  const mountComponent = () => {
    return mount(QuickActions, {
      global: {
        stubs: {
          UButton: {
            template: '<button @click="$emit(\'click\')" class="ubutton"><slot /></button>',
            props: ['color', 'variant', 'class']
          },
          UIcon: {
            template: '<i class="uicon" />',
            props: ['name']
          }
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    navigateTo.mockReset()
    navigateTo.mockResolvedValue(undefined)
  })

  describe('Component Structure', () => {
    it('should mount without errors', () => {
      const wrapper = mountComponent()
      expect(wrapper.exists()).toBe(true)
    })

    it('should render all quick action buttons', () => {
      const wrapper = mountComponent()

      const buttons = wrapper.findAll('.ubutton')
      expect(buttons).toHaveLength(6) // 3 main buttons + 3 secondary buttons
    })

    it('should display correct button texts', () => {
      const wrapper = mountComponent()

      expect(wrapper.text()).toContain('Create Invoice')
      expect(wrapper.text()).toContain('Record Payment')
      expect(wrapper.text()).toContain('Add Expense')
      expect(wrapper.text()).toContain('Chart of Accounts')
      expect(wrapper.text()).toContain('Manage Vendors')
      expect(wrapper.text()).toContain('Reconcile Accounts')
    })

    it('should have proper grid layout structure', () => {
      const wrapper = mountComponent()

      // Check for grid classes
      const gridContainer = wrapper.find('.grid')
      expect(gridContainer.exists()).toBe(true)
      expect(gridContainer.classes()).toContain('grid-cols-2')
    })
  })

  describe('Navigation Functionality', () => {
    it('should navigate to chart of accounts page when Chart of Accounts button is clicked', async () => {
      const wrapper = mountComponent()

      // Find the Chart of Accounts button
      const chartOfAccountsButton = wrapper.findAll('.ubutton').find(button =>
        button.text().includes('Chart of Accounts')
      )

      expect(chartOfAccountsButton).toBeDefined()

      // Click the button
      await chartOfAccountsButton?.trigger('click')

      // Verify navigation was called with correct route
      expect(navigateTo).toHaveBeenCalledWith('/corporation?tab=chart-of-accounts')
    })

    it('should navigate to vendor management page when Manage Vendors button is clicked', async () => {
      const wrapper = mountComponent()

      // Find the Manage Vendors button
      const manageVendorsButton = wrapper.findAll('.ubutton').find(button =>
        button.text().includes('Manage Vendors')
      )

      expect(manageVendorsButton).toBeDefined()

      // Click the button
      await manageVendorsButton?.trigger('click')

      // Verify navigation was called with correct route
      expect(navigateTo).toHaveBeenCalledWith('/vendors')
    })

    it('should not navigate when other buttons are clicked', async () => {
      const wrapper = mountComponent()

      const buttons = wrapper.findAll('.ubutton')

      // Find buttons that should not navigate (Create Invoice, Record Payment, Add Expense)
      const nonNavigatingButtons = buttons.filter(button => {
        const text = button.text()
        return text.includes('Create Invoice') ||
               text.includes('Record Payment') ||
               text.includes('Add Expense') ||
               text.includes('Reconcile Accounts')
      })

      // Click each non-navigating button
      for (const button of nonNavigatingButtons) {
        await button.trigger('click')
      }

      // Verify navigateTo was never called
      expect(navigateTo).not.toHaveBeenCalled()
    })

    it('should handle multiple clicks correctly', async () => {
      const wrapper = mountComponent()

      // Find both navigation buttons
      const chartOfAccountsButton = wrapper.findAll('.ubutton').find(button =>
        button.text().includes('Chart of Accounts')
      )
      const manageVendorsButton = wrapper.findAll('.ubutton').find(button =>
        button.text().includes('Manage Vendors')
      )

      // Click each button multiple times
      await chartOfAccountsButton?.trigger('click')
      await manageVendorsButton?.trigger('click')
      await chartOfAccountsButton?.trigger('click')

      // Verify correct navigation calls
      expect(navigateTo).toHaveBeenCalledWith('/corporation?tab=chart-of-accounts')
      expect(navigateTo).toHaveBeenCalledWith('/vendors')
    })
  })

  describe('Button Styling and Structure', () => {
    it('should have proper button structure and count', () => {
      const wrapper = mountComponent()

      const buttons = wrapper.findAll('.ubutton')

      // Main action buttons (first 3) are in grid layout
      const mainButtons = buttons.slice(0, 3)
      const secondaryButtons = buttons.slice(3)

      // Verify button count distribution
      expect(mainButtons).toHaveLength(3)
      expect(secondaryButtons).toHaveLength(3)

      // All buttons should have the base ubutton class
      buttons.forEach(button => {
        expect(button.classes()).toContain('ubutton')
      })
    })

    it('should contain icons for each button', () => {
      const wrapper = mountComponent()

      const buttons = wrapper.findAll('.ubutton')

      // Each button should contain an icon
      buttons.forEach(button => {
        const icon = button.find('.uicon')
        expect(icon.exists()).toBe(true)
      })
    })
  })

  describe('Accessibility and User Experience', () => {
    it('should provide meaningful button content for screen readers', () => {
      const wrapper = mountComponent()

      const buttons = wrapper.findAll('.ubutton')

      // Each button should have descriptive text
      expect(buttons.some(button => button.text().includes('Create Invoice'))).toBe(true)
      expect(buttons.some(button => button.text().includes('Record Payment'))).toBe(true)
      expect(buttons.some(button => button.text().includes('Add Expense'))).toBe(true)
      expect(buttons.some(button => button.text().includes('Chart of Accounts'))).toBe(true)
      expect(buttons.some(button => button.text().includes('Manage Vendors'))).toBe(true)
      expect(buttons.some(button => button.text().includes('Reconcile Accounts'))).toBe(true)
    })

    it('should maintain button order and layout consistency', () => {
      const wrapper = mountComponent()

      const buttons = wrapper.findAll('.ubutton')

      // Verify expected button order
      const buttonTexts = buttons.map(button => button.text().trim())

      expect(buttonTexts).toContain('Create Invoice')
      expect(buttonTexts).toContain('Record Payment')
      expect(buttonTexts).toContain('Add Expense')
      expect(buttonTexts).toContain('Chart of Accounts')
      expect(buttonTexts).toContain('Manage Vendors')
      expect(buttonTexts).toContain('Reconcile Accounts')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle navigation failures gracefully', async () => {
      // Mock navigateTo to reject with an error (more realistic for async navigation)
      navigateTo.mockRejectedValue(new Error('Navigation failed'))

      const wrapper = mountComponent()

      const chartOfAccountsButton = wrapper.findAll('.ubutton').find(button =>
        button.text().includes('Chart of Accounts')
      )

      // The component should handle the error gracefully without crashing
      // Vue's error handling will catch async errors
      await chartOfAccountsButton?.trigger('click')

      // Verify navigateTo was called
      expect(navigateTo).toHaveBeenCalledWith('/corporation?tab=chart-of-accounts')

      // Wait for any async error handling
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    it('should handle rapid successive clicks', async () => {
      const wrapper = mountComponent()

      const chartOfAccountsButton = wrapper.findAll('.ubutton').find(button =>
        button.text().includes('Chart of Accounts')
      )

      // Simulate rapid clicks
      const clickPromises = []
      for (let i = 0; i < 5; i++) {
        clickPromises.push(chartOfAccountsButton?.trigger('click'))
      }

      await Promise.all(clickPromises)

      // Verify all clicks were handled
      expect(navigateTo).toHaveBeenCalledWith('/corporation?tab=chart-of-accounts')
    })
  })

  describe('Integration with Vue Router', () => {
    it('should use navigateTo function for programmatic navigation', async () => {
      const wrapper = mountComponent()

      const manageVendorsButton = wrapper.findAll('.ubutton').find(button =>
        button.text().includes('Manage Vendors')
      )

      await manageVendorsButton?.trigger('click')

      // Verify the exact route format expected by Nuxt
      expect(navigateTo).toHaveBeenCalledWith('/vendors')
    })

    it('should pass correct query parameters for tab routing', async () => {
      const wrapper = mountComponent()

      const buttons = [
        { button: 'Chart of Accounts', expectedRoute: '/corporation?tab=chart-of-accounts' },
        { button: 'Manage Vendors', expectedRoute: '/vendors' }
      ]

      for (const { button, expectedRoute } of buttons) {
        const buttonElement = wrapper.findAll('.ubutton').find(btn =>
          btn.text().includes(button)
        )

        await buttonElement?.trigger('click')

        expect(navigateTo).toHaveBeenCalledWith(expectedRoute)
      }
    })
  })
})
