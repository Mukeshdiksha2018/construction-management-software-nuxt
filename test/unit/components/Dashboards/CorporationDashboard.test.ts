import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import CorporationDashboard from '@/components/Dashboards/CorporationDashboard.vue'

const useCorporationStore = vi.fn()
const useBillEntriesStore = vi.fn()
const useEstimatesStore = vi.fn()
const usePurchaseOrdersStore = vi.fn()
const useChangeOrdersStore = vi.fn()
const useVendorStore = vi.fn()

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => useCorporationStore()
}))

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

vi.mock('@/stores/vendors', () => ({
  useVendorStore: () => useVendorStore()
}))

// Mock child components
vi.mock('@/components/Dashboards/PendingProjectsCard.vue', () => ({
  default: {
    name: 'PendingProjectsCard',
    template: '<div class="pending-projects-card">Pending Projects</div>'
  }
}))

vi.mock('@/components/Dashboards/PendingInvoicesCard.vue', () => ({
  default: {
    name: 'PendingInvoicesCard',
    props: ['corporationUuid'],
    template: '<div class="pending-invoices-card">Pending Invoices</div>'
  }
}))

vi.mock('@/components/Dashboards/charts/ProjectsByStatusChart.vue', () => ({
  default: {
    name: 'ProjectsByStatusChart',
    template: '<div class="projects-by-status-chart">Chart</div>'
  }
}))

vi.mock('@/components/Dashboards/lists/PendingApprovalsList.vue', () => ({
  default: {
    name: 'PendingApprovalsList',
    template: '<div class="pending-approvals-list">Approvals</div>'
  }
}))

vi.mock('@/components/Dashboards/actions/QuickActions.vue', () => ({
  default: {
    name: 'QuickActions',
    template: '<div class="quick-actions">Actions</div>'
  }
}))

describe('CorporationDashboard', () => {
  const mountComponent = () => {
    return mount(CorporationDashboard, {
      global: {
        stubs: {
          UCard: {
            template: '<div class="ucard"><slot name="header" /><slot /><slot name="footer" /></div>',
            props: ['ui']
          },
          UIcon: {
            template: '<i class="uicon" />',
            props: ['name', 'class']
          },
          USkeleton: {
            template: '<div class="skeleton" />',
            props: ['class']
          },
          UBadge: {
            template: '<span class="ubadge"><slot /></span>',
            props: ['color', 'variant', 'size']
          }
        }
      }
    })
  }

  let selectedCorporationIdRef: ReturnType<typeof ref>
  let billEntriesRef: ReturnType<typeof ref>
  let estimatesRef: ReturnType<typeof ref>
  let purchaseOrdersRef: ReturnType<typeof ref>
  let changeOrdersRef: ReturnType<typeof ref>
  let vendorsRef: ReturnType<typeof ref>
  let vendorLoadingRef: ReturnType<typeof ref>
  let fetchVendors: ReturnType<typeof vi.fn>

  beforeEach(() => {
    selectedCorporationIdRef = ref<string | null>(null)
    billEntriesRef = ref<any[]>([])
    estimatesRef = ref<any[]>([])
    purchaseOrdersRef = ref<any[]>([])
    changeOrdersRef = ref<any[]>([])
    vendorsRef = ref<any[]>([])
    vendorLoadingRef = ref(false)
    fetchVendors = vi.fn().mockResolvedValue(undefined)

    useCorporationStore.mockReturnValue(
      reactive({
        get selectedCorporationId() {
          return selectedCorporationIdRef.value
        }
      })
    )

    useBillEntriesStore.mockReturnValue(
      reactive({
        get billEntries() {
          return billEntriesRef.value
        }
      })
    )

    useEstimatesStore.mockReturnValue(
      reactive({
        get estimates() {
          return estimatesRef.value
        }
      })
    )

    usePurchaseOrdersStore.mockReturnValue(
      reactive({
        get purchaseOrders() {
          return purchaseOrdersRef.value
        }
      })
    )

    useChangeOrdersStore.mockReturnValue(
      reactive({
        get changeOrders() {
          return changeOrdersRef.value
        }
      })
    )

    useVendorStore.mockReturnValue(
      reactive({
        get vendors() {
          return vendorsRef.value
        },
        get loading() {
          return vendorLoadingRef.value
        },
        fetchVendors
      })
    )
  })

  describe('Component Rendering', () => {
    it('renders without errors', () => {
      const wrapper = mountComponent()
      expect(wrapper.exists()).toBe(true)
    })

    it('renders all dashboard sections', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.pending-projects-card').exists()).toBe(true)
      expect(wrapper.find('.pending-invoices-card').exists()).toBe(true)
      expect(wrapper.find('.projects-by-status-chart').exists()).toBe(true)
      expect(wrapper.find('.pending-approvals-list').exists()).toBe(true)
      expect(wrapper.find('.quick-actions').exists()).toBe(true)
    })
  })

  describe('Vendor Count Display', () => {
    it('shows skeleton when loading vendors', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      vendorLoadingRef.value = true
      vendorsRef.value = []

      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.vendorShowSkeleton).toBe(true)
    })

    it('displays vendor count when loaded', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      vendorLoadingRef.value = false
      vendorsRef.value = [
        { uuid: 'v1', is_active: true },
        { uuid: 'v2', is_active: true },
        { uuid: 'v3', is_active: false }
      ]

      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.vendorCount).toBe(2) // Only active vendors
      expect(vm.vendorCountDisplay).toBe('2')
      expect(vm.vendorShowSkeleton).toBe(false)
    })

    it('shows "--" when no corporation is selected', () => {
      selectedCorporationIdRef.value = null

      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      expect(vm.vendorCountDisplay).toBe('--')
      expect(vm.vendorCount).toBe(0)
    })

    it('shows "--" when vendors data is undefined', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      vendorLoadingRef.value = false
      vendorsRef.value = undefined as any

      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.vendorCount).toBe(-1)
      expect(vm.vendorCountDisplay).toBe('--')
    })
  })

  describe('Vendor Data Fetching', () => {
    it('fetches vendors on mount when corporation is selected', async () => {
      selectedCorporationIdRef.value = 'corp-1'

      mountComponent()
      await flushPromises()

      expect(fetchVendors).toHaveBeenCalledWith('corp-1')
    })

    it('fetches vendors when corporation changes', async () => {
      selectedCorporationIdRef.value = null

      const wrapper = mountComponent()
      await flushPromises()

      // Change corporation
      selectedCorporationIdRef.value = 'corp-2'
      await flushPromises()

      expect(fetchVendors).toHaveBeenCalledWith('corp-2')
    })

    it('does not fetch vendors when corporation is null', async () => {
      selectedCorporationIdRef.value = null

      mountComponent()
      await flushPromises()

      expect(fetchVendors).not.toHaveBeenCalled()
    })

    it('handles fetch errors gracefully', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      fetchVendors.mockRejectedValueOnce(new Error('Fetch failed'))

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mountComponent()
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Pending Approvals Calculation', () => {
    it('calculates total pending approvals correctly', () => {
      billEntriesRef.value = [
        { uuid: 'be1', approval_status: 'Pending' },
        { uuid: 'be2', approval_status: 'Approved' },
        { uuid: 'be3', approval_status: 'Pending' }
      ]

      estimatesRef.value = [
        { uuid: 'e1', status: 'Ready' },
        { uuid: 'e2', status: 'Draft' }
      ]

      purchaseOrdersRef.value = [
        { uuid: 'po1', status: 'Ready' }
      ]

      changeOrdersRef.value = [
        { uuid: 'co1', status: 'Ready' },
        { uuid: 'co2', status: 'Approved' }
      ]

      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      // 2 pending bill entries + 1 ready estimate + 1 ready PO + 1 ready CO = 5
      expect(vm.totalPendingApprovals).toBe(5)
    })

    it('returns 0 when no pending approvals', () => {
      billEntriesRef.value = []
      estimatesRef.value = []
      purchaseOrdersRef.value = []
      changeOrdersRef.value = []

      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      expect(vm.totalPendingApprovals).toBe(0)
    })

    it('handles undefined arrays gracefully', () => {
      billEntriesRef.value = undefined as any
      estimatesRef.value = undefined as any
      purchaseOrdersRef.value = undefined as any
      changeOrdersRef.value = undefined as any

      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      expect(vm.totalPendingApprovals).toBe(0)
    })
  })

  describe('TypeScript Type Safety', () => {
    it('has correct type for ensureVendorsLoaded function parameter', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      // TypeScript should allow string | null
      expect(typeof vm.ensureVendorsLoaded).toBe('function')
      
      // Should accept string
      expect(() => vm.ensureVendorsLoaded('corp-1')).not.toThrow()
      
      // Should accept null
      expect(() => vm.ensureVendorsLoaded(null)).not.toThrow()
    })

    it('passes corporation-uuid prop correctly to PendingInvoicesCard', () => {
      selectedCorporationIdRef.value = 'corp-1'

      const wrapper = mountComponent()
      const pendingInvoicesCard = wrapper.findComponent({ name: 'PendingInvoicesCard' })

      expect(pendingInvoicesCard.exists()).toBe(true)
      expect(pendingInvoicesCard.props('corporationUuid')).toBe('corp-1')
    })

    it('handles null corporation-uuid prop correctly', () => {
      selectedCorporationIdRef.value = null

      const wrapper = mountComponent()
      const pendingInvoicesCard = wrapper.findComponent({ name: 'PendingInvoicesCard' })

      expect(pendingInvoicesCard.exists()).toBe(true)
      // Should convert null to undefined
      expect(pendingInvoicesCard.props('corporationUuid')).toBeUndefined()
    })
  })
})

