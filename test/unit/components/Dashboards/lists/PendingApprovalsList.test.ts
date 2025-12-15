import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import PendingApprovalsList from '@/components/Dashboards/lists/PendingApprovalsList.vue'

const useBillEntriesStore = vi.fn()
const useEstimatesStore = vi.fn()
const usePurchaseOrdersStore = vi.fn()
const useChangeOrdersStore = vi.fn()
const useCurrencyFormat = vi.fn()
const useDateFormat = vi.fn()
const navigateTo = vi.fn()

vi.mock('@/stores/billEntries', () => ({
  useBillEntriesStore: () => useBillEntriesStore()
}))

vi.mock('@/stores/estimates', () => ({
  useEstimatesStore: () => useEstimatesStore()
}))

vi.mock('@/stores/purchaseOrders', () => ({
  usePurchaseOrdersStore: () => usePurchaseOrdersStore()
}))

vi.mock('@/stores/changeOrders', () => ({
  useChangeOrdersStore: () => useChangeOrdersStore()
}))

vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => useCurrencyFormat()
}))

vi.mock('@/composables/useDateFormat', () => ({
  useDateFormat: () => useDateFormat()
}))

vi.stubGlobal('navigateTo', navigateTo)

describe('PendingApprovalsList', () => {
  const mountComponent = () => {
    return mount(PendingApprovalsList, {
      global: {
        stubs: {
          UCard: {
            template: '<div class="ucard"><slot /></div>'
          },
          UIcon: {
            template: '<i class="uicon" />'
          },
          UButton: {
            template: '<button @click="$emit(\'click\')"><slot /></button>'
          }
        }
      }
    })
  }

  let billEntriesRef: ReturnType<typeof ref>
  let estimatesRef: ReturnType<typeof ref>
  let purchaseOrdersRef: ReturnType<typeof ref>
  let changeOrdersRef: ReturnType<typeof ref>
  let formatCurrencyFn: ReturnType<typeof vi.fn>
  let getDaysAgoFn: ReturnType<typeof vi.fn>

  beforeEach(() => {
    billEntriesRef = ref<any[]>([])
    estimatesRef = ref<any[]>([])
    purchaseOrdersRef = ref<any[]>([])
    changeOrdersRef = ref<any[]>([])
    formatCurrencyFn = vi.fn((amount) => `$${amount.toFixed(2)}`)
    getDaysAgoFn = vi.fn((date) => {
      if (!date) return 0
      const dateObj = new Date(date)
      const now = new Date()
      const diffInMs = now.getTime() - dateObj.getTime()
      return Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    })

    useBillEntriesStore.mockReturnValue(
      reactive({
        get billEntries() {
          return billEntriesRef.value
        },
        set billEntries(value) {
          billEntriesRef.value = value
        }
      })
    )

    useEstimatesStore.mockReturnValue(
      reactive({
        get estimates() {
          return estimatesRef.value
        },
        set estimates(value) {
          estimatesRef.value = value
        }
      })
    )

    usePurchaseOrdersStore.mockReturnValue(
      reactive({
        get purchaseOrders() {
          return purchaseOrdersRef.value
        },
        set purchaseOrders(value) {
          purchaseOrdersRef.value = value
        }
      })
    )

    useChangeOrdersStore.mockReturnValue(
      reactive({
        get changeOrders() {
          return changeOrdersRef.value
        },
        set changeOrders(value) {
          changeOrdersRef.value = value
        }
      })
    )

    useCurrencyFormat.mockReturnValue({
      formatCurrency: formatCurrencyFn
    })

    useDateFormat.mockReturnValue({
      formatDate: vi.fn(),
      getDaysAgo: getDaysAgoFn
    })

    navigateTo.mockClear()
  })

  it('shows empty state when no pending items exist', async () => {
    billEntriesRef.value = []
    estimatesRef.value = []
    purchaseOrdersRef.value = []
    changeOrdersRef.value = []

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('All Caught Up!')
    expect(wrapper.text()).toContain('No pending approvals at the moment.')
  })

  it('displays pending bill entries', async () => {
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    
    billEntriesRef.value = [
      {
        id: 1,
        number: 'BILL-001',
        payee_name: 'Vendor ABC',
        amount: 1500,
        approval_status: 'Pending',
        bill_date: twoDaysAgo.toISOString()
      }
    ]
    estimatesRef.value = []
    purchaseOrdersRef.value = []
    changeOrdersRef.value = []

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('BILL-001')
    expect(wrapper.text()).toContain('Bill Entry')
    expect(wrapper.text()).toContain('Vendor ABC')
    expect(formatCurrencyFn).toHaveBeenCalledWith(1500)
  })

  it('displays pending estimates with status Ready', async () => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    billEntriesRef.value = []
    purchaseOrdersRef.value = []
    changeOrdersRef.value = []
    estimatesRef.value = [
      {
        uuid: 'estimate-1',
        estimate_number: 'ES-123456',
        status: 'Ready',
        final_amount: 2500,
        estimate_date: threeDaysAgo.toISOString(),
        project: {
          project_name: 'Project Alpha',
          uuid: 'project-1'
        }
      }
    ]

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('ES-123456')
    expect(wrapper.text()).toContain('Estimate')
    expect(wrapper.text()).toContain('Project Alpha')
    expect(formatCurrencyFn).toHaveBeenCalledWith(2500)
  })

  it('does not display estimates with status other than Ready', async () => {
    billEntriesRef.value = []
    purchaseOrdersRef.value = []
    changeOrdersRef.value = []
    estimatesRef.value = [
      {
        uuid: 'estimate-1',
        estimate_number: 'ES-123456',
        status: 'Draft',
        final_amount: 2500,
        estimate_date: new Date().toISOString(),
        project: {
          project_name: 'Project Alpha',
          uuid: 'project-1'
        }
      },
      {
        uuid: 'estimate-2',
        estimate_number: 'ES-123457',
        status: 'Approved',
        final_amount: 3000,
        estimate_date: new Date().toISOString(),
        project: {
          project_name: 'Project Beta',
          uuid: 'project-2'
        }
      }
    ]

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).not.toContain('ES-123456')
    expect(wrapper.text()).not.toContain('ES-123457')
    expect(wrapper.text()).toContain('All Caught Up!')
  })

  it('does not display bill entries with approval_status other than Pending', async () => {
    billEntriesRef.value = [
      {
        id: 1,
        number: 'BILL-001',
        payee_name: 'Vendor ABC',
        amount: 1500,
        approval_status: 'Approved',
        bill_date: new Date().toISOString()
      }
    ]
    estimatesRef.value = []
    purchaseOrdersRef.value = []
    changeOrdersRef.value = []

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).not.toContain('BILL-001')
    expect(wrapper.text()).toContain('All Caught Up!')
  })

  it('displays both bill entries and estimates together', async () => {
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)
    
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    billEntriesRef.value = [
      {
        id: 1,
        number: 'BILL-001',
        payee_name: 'Vendor ABC',
        amount: 1500,
        approval_status: 'Pending',
        bill_date: twoDaysAgo.toISOString()
      }
    ]
    purchaseOrdersRef.value = []
    changeOrdersRef.value = []
    estimatesRef.value = [
      {
        uuid: 'estimate-1',
        estimate_number: 'ES-123456',
        status: 'Ready',
        final_amount: 2500,
        estimate_date: oneDayAgo.toISOString(),
        project: {
          project_name: 'Project Alpha',
          uuid: 'project-1'
        }
      }
    ]

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('BILL-001')
    expect(wrapper.text()).toContain('ES-123456')
    expect(wrapper.text()).toContain('Bill Entry')
    expect(wrapper.text()).toContain('Estimate')
    expect(wrapper.text()).toContain('View All Pending Approvals (2)')
  })

  it('sorts items by days ago (most recent first)', async () => {
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)
    
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    billEntriesRef.value = [
      {
        id: 1,
        number: 'BILL-001',
        payee_name: 'Vendor ABC',
        amount: 1500,
        approval_status: 'Pending',
        bill_date: threeDaysAgo.toISOString()
      }
    ]
    purchaseOrdersRef.value = []
    changeOrdersRef.value = []
    estimatesRef.value = [
      {
        uuid: 'estimate-1',
        estimate_number: 'ES-123456',
        status: 'Ready',
        final_amount: 2500,
        estimate_date: oneDayAgo.toISOString(),
        project: {
          project_name: 'Project Alpha',
          uuid: 'project-1'
        }
      }
    ]

    const wrapper = mountComponent()
    await flushPromises()

    const items = wrapper.findAll('.flex.items-center.justify-between.p-3')
    expect(items.length).toBe(2)
    
    // First item should be the estimate (1 day ago - most recent)
    expect(items[0].text()).toContain('ES-123456')
    // Second item should be the bill (3 days ago)
    expect(items[1].text()).toContain('BILL-001')
  })

  it('navigates to estimate form when clicking on an estimate', async () => {
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    billEntriesRef.value = []
    purchaseOrdersRef.value = []
    changeOrdersRef.value = []
    estimatesRef.value = [
      {
        uuid: 'estimate-1',
        estimate_number: 'ES-123456',
        status: 'Ready',
        final_amount: 2500,
        estimate_date: oneDayAgo.toISOString(),
        project: {
          project_name: 'Project Alpha',
          uuid: 'project-1'
        }
      }
    ]

    const wrapper = mountComponent()
    await flushPromises()

    const estimateItem = wrapper.find('.flex.items-center.justify-between.p-3')
    await estimateItem.trigger('click')

    expect(navigateTo).toHaveBeenCalledWith('/estimates/form/estimate-1')
  })

  it('navigates to payables page when clicking on a bill entry', async () => {
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    billEntriesRef.value = [
      {
        id: 1,
        number: 'BILL-001',
        payee_name: 'Vendor ABC',
        amount: 1500,
        approval_status: 'Pending',
        bill_date: oneDayAgo.toISOString()
      }
    ]
    estimatesRef.value = []
    purchaseOrdersRef.value = []
    changeOrdersRef.value = []

    const wrapper = mountComponent()
    await flushPromises()

    const billItem = wrapper.find('.flex.items-center.justify-between.p-3')
    await billItem.trigger('click')

    expect(navigateTo).toHaveBeenCalledWith('/payables')
  })

  it('shows correct total count including both bills and estimates', async () => {
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    billEntriesRef.value = [
      {
        id: 1,
        number: 'BILL-001',
        payee_name: 'Vendor ABC',
        amount: 1500,
        approval_status: 'Pending',
        bill_date: oneDayAgo.toISOString()
      },
      {
        id: 2,
        number: 'BILL-002',
        payee_name: 'Vendor XYZ',
        amount: 2000,
        approval_status: 'Pending',
        bill_date: oneDayAgo.toISOString()
      }
    ]
    purchaseOrdersRef.value = []
    changeOrdersRef.value = []
    estimatesRef.value = [
      {
        uuid: 'estimate-1',
        estimate_number: 'ES-123456',
        status: 'Ready',
        final_amount: 2500,
        estimate_date: oneDayAgo.toISOString(),
        project: {
          project_name: 'Project Alpha',
          uuid: 'project-1'
        }
      }
    ]

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('View All Pending Approvals (3)')
  })

  it('handles estimates without project information', async () => {
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    billEntriesRef.value = []
    purchaseOrdersRef.value = []
    changeOrdersRef.value = []
    estimatesRef.value = [
      {
        uuid: 'estimate-1',
        estimate_number: 'ES-123456',
        status: 'Ready',
        final_amount: 2500,
        estimate_date: oneDayAgo.toISOString(),
        project: null
      }
    ]

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('ES-123456')
    expect(wrapper.text()).toContain('N/A')
  })

  it('uses priority status based on amount for both bills and estimates', async () => {
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    billEntriesRef.value = [
      {
        id: 1,
        number: 'BILL-HIGH',
        payee_name: 'Vendor ABC',
        amount: 6000, // High priority
        approval_status: 'Pending',
        bill_date: oneDayAgo.toISOString()
      }
    ]
    purchaseOrdersRef.value = []
    changeOrdersRef.value = []
    estimatesRef.value = [
      {
        uuid: 'estimate-1',
        estimate_number: 'ES-HIGH',
        status: 'Ready',
        final_amount: 5500, // High priority
        estimate_date: oneDayAgo.toISOString(),
        project: {
          project_name: 'Project Alpha',
          uuid: 'project-1'
        }
      }
    ]

    const wrapper = mountComponent()
    await flushPromises()

    // Both items should be rendered (high priority items should have red status)
    expect(wrapper.text()).toContain('BILL-HIGH')
    expect(wrapper.text()).toContain('ES-HIGH')
  })
})
