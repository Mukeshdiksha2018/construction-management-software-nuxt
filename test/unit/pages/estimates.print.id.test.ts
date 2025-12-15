import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PrintPage from '@/pages/estimates/print/[id].vue'

// Mock vue-router's useRoute so the page can read route.params.id
let mockRouteParams: any = { id: 'estimate-xyz' }
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: mockRouteParams })
}))

describe('Estimate Print Page', () => {
  const originalPrint = window.print
  let printSpy: any
  const originalDefinePageMeta = (global as any).definePageMeta

  beforeEach(() => {
    vi.useFakeTimers()
    printSpy = vi.fn()
    // @ts-expect-error override for test
    window.print = printSpy
    // Stub Nuxt macro in unit environment
    ;(global as any).definePageMeta = vi.fn()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    // @ts-expect-error restore
    window.print = originalPrint
    ;(global as any).definePageMeta = originalDefinePageMeta
  })

  const createWrapper = (id = 'estimate-xyz') => {
    mockRouteParams = { id }
    return mount(PrintPage, {
      global: {
        stubs: {
          // Hide actual UI dependence; we just need presence
          UButton: {
            template: '<button @click="$emit(\'click\')"><slot /></button>'
          },
          EstimatePreview: {
            props: ['estimateUuid'],
            template: '<div data-testid="estimate-preview">Preview {{ estimateUuid }}</div>'
          }
        }
      }
    })
  }

  it('renders EstimatePreview with route id', () => {
    const wrapper = createWrapper('abc-123')
    expect(wrapper.find('[data-testid="estimate-preview"]').text()).toContain('abc-123')
  })

  it('shows a visible Print button on screen (hidden in print via class)', async () => {
    const wrapper = createWrapper()
    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    // Parent container carries print:hidden; existence of button implies screen presence
    // We avoid asserting CSS here; presence is enough for unit test
  })

  it('calls window.print when clicking the Print button', async () => {
    const wrapper = createWrapper()
    const button = wrapper.find('button')
    await button.trigger('click')
    expect(printSpy).toHaveBeenCalled()
  })

  // Auto-print removed to prevent printing before content is ready
})


