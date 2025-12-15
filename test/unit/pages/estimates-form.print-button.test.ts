import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EstimateFormPage from '@/pages/estimates/form/[id].vue'

// Mock permissions to allow viewing
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: () => true, isReady: { value: true } })
}))

// Mock composable to assert it gets called
const openEstimatePrintMock = vi.fn()
vi.mock('@/composables/useEstimatePrint', () => ({
  useEstimatePrint: () => ({ openEstimatePrint: openEstimatePrintMock })
}))

// Mock router/route
const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
  useRoute: () => ({ params: { id: 'est-123' } })
}))

// Mock stores used by the page
vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => ({ selectedCorporation: { uuid: 'corp-1' }, selectedCorporationId: 'corp-1' })
}))

vi.mock('@/stores/estimates', () => ({
  useEstimatesStore: () => ({
    getEstimateByUuid: vi.fn(),
    updateEstimate: vi.fn().mockResolvedValue(true),
    createEstimate: vi.fn().mockResolvedValue(true)
  })
}))

vi.mock('@/stores/projects', () => ({
  useProjectsStore: () => ({})
}))

vi.mock('@/stores/purchaseOrders', () => ({
  usePurchaseOrdersStore: () => ({
    purchaseOrders: [],
    fetchPurchaseOrders: vi.fn().mockResolvedValue(undefined)
  })
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        first_name: 'Test',
        last_name: 'User'
      }
    }
  })
}))

// Stub child component EstimateForm
vi.mock('@/components/Projects/EstimateForm.vue', () => ({
  default: { template: '<div data-testid="estimate-form"></div>' }
}))

// Stub EstimateAuditTimeline component
vi.mock('@/components/Projects/EstimateAuditTimeline.vue', () => ({
  default: { template: '<div data-testid="audit-timeline"></div>' }
}))

describe('Estimate form page print button', () => {
  let pinia: any

  beforeEach(() => {
    openEstimatePrintMock.mockClear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  const mountPage = () => mount(EstimateFormPage, {
    global: {
      plugins: [pinia],
      stubs: {
        UButton: { 
          template: '<button @click="$emit(\'click\')" data-testid="u-button"><slot /></button>',
          props: ['icon', 'color', 'variant', 'disabled']
        },
        UAlert: { template: '<div></div>' },
        UIcon: { template: '<span></span>' }
      }
    }
  })

  it('shows Print button when editing and permission allows', async () => {
    const wrapper = mountPage()
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    // Editing mode since route id != 'new'
    const html = wrapper.html()
    // The Print button should be in the HTML when editingEstimate is true
    // Since route id is 'est-123' (not 'new'), editingEstimate should be true
    expect(html).toContain('Print')
  })

  it('calls openEstimatePrint with the current id when clicking Print', async () => {
    const wrapper = mountPage()
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
    // Find button containing "Print" text
    const buttons = wrapper.findAll('button')
    const printBtn = buttons.find(b => {
      const text = b.text().toLowerCase().trim()
      return text.includes('print')
    })
    expect(printBtn).toBeTruthy()
    if (printBtn) {
      await printBtn.trigger('click')
      await wrapper.vm.$nextTick()
      expect(openEstimatePrintMock).toHaveBeenCalledWith('est-123')
    }
  })
})


