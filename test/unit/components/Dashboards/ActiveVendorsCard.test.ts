import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import CorporationDashboard from '@/components/Dashboards/CorporationDashboard.vue'

const useVendorStore = vi.fn()
const useCorporationStore = vi.fn()
const useBillEntriesStore = vi.fn()
const useEstimatesStore = vi.fn()
const usePurchaseOrdersStore = vi.fn()
const useChangeOrdersStore = vi.fn()

vi.mock('@/stores/vendors', () => ({
  useVendorStore: () => useVendorStore()
}))

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

describe('ActiveVendorsCard', () => {
  const mountComponent = () => {
    return mount(CorporationDashboard, {
      global: {
        stubs: {
          UCard: {
            template: '<div class="ucard"><slot /></div>'
          },
          UIcon: {
            template: '<i class="uicon" />'
          },
          USkeleton: {
            template: '<div class="skeleton" />'
          },
          PendingProjectsCard: {
            template: '<div class="pending-projects-card">Pending Projects Card</div>'
          },
          PendingInvoicesCard: {
            template: '<div class="pending-invoices-card">Pending Invoices Card</div>'
          },
          PendingApprovalsList: {
            template: '<div class="pending-approvals-list">Pending Approvals List</div>'
          },
          QuickActions: {
            template: '<div class="quick-actions">Quick Actions</div>'
          },
          ProjectsByStatusChart: {
            template: '<div class="projects-chart">Projects by Status Chart</div>'
          }
        }
      }
    })
  }

  let vendorsRef: ReturnType<typeof ref>
  let vendorLoadingRef: ReturnType<typeof ref>
  let selectedCorporationIdRef: ReturnType<typeof ref>
  let fetchVendors: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vendorsRef = ref<any[]>([])
    vendorLoadingRef = ref(false)
    selectedCorporationIdRef = ref<string | null>(null)
    fetchVendors = vi.fn().mockResolvedValue(undefined)

    useVendorStore.mockReturnValue(
      reactive({
        get vendors() {
          return vendorsRef.value
        },
        set vendors(value) {
          vendorsRef.value = value
        },
        get loading() {
          return vendorLoadingRef.value
        },
        set loading(value) {
          vendorLoadingRef.value = value
        },
        fetchVendors
      })
    )

    useCorporationStore.mockReturnValue(
      reactive({
        get selectedCorporationId() {
          return selectedCorporationIdRef.value
        },
        set selectedCorporationId(value) {
          selectedCorporationIdRef.value = value
        }
      })
    )

    useBillEntriesStore.mockReturnValue(
      reactive({
        billEntries: []
      })
    )

    useEstimatesStore.mockReturnValue(
      reactive({
        estimates: []
      })
    )

    usePurchaseOrdersStore.mockReturnValue(
      reactive({
        purchaseOrders: []
      })
    )

    useChangeOrdersStore.mockReturnValue(
      reactive({
        changeOrders: []
      })
    )
  })

  describe('Active Vendors Card Rendering', () => {
    it('renders the active vendors card with correct title', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      vendorsRef.value = []

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('Active Vendors')
    })

    it('displays "--" when no corporation is selected', async () => {
      selectedCorporationIdRef.value = null

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('--')
    })

    it('shows loading skeleton when vendors are loading', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      vendorLoadingRef.value = true

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.findAll('.skeleton')).not.toHaveLength(0)
      expect(wrapper.text()).toContain('Active Vendors')
    })

    it('displays correct vendor count when vendors are loaded', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      vendorsRef.value = [
        { id: 1, uuid: 'v1', is_active: true, vendor_name: 'Vendor 1' },
        { id: 2, uuid: 'v2', is_active: true, vendor_name: 'Vendor 2' },
        { id: 3, uuid: 'v3', is_active: false, vendor_name: 'Vendor 3' }
      ]

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('2')
      expect(wrapper.text()).toContain('Active Vendors')
    })

    it('filters out inactive vendors from count', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      vendorsRef.value = [
        { id: 1, uuid: 'v1', is_active: true, vendor_name: 'Vendor 1' },
        { id: 2, uuid: 'v2', is_active: false, vendor_name: 'Vendor 2' },
        { id: 3, uuid: 'v3', is_active: false, vendor_name: 'Vendor 3' },
        { id: 4, uuid: 'v4', is_active: true, vendor_name: 'Vendor 4' }
      ]

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('2')
    })

    it('displays zero when no active vendors exist', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      vendorsRef.value = [
        { id: 1, uuid: 'v1', is_active: false, vendor_name: 'Vendor 1' },
        { id: 2, uuid: 'v2', is_active: false, vendor_name: 'Vendor 2' }
      ]

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('0')
    })

    it('formats large numbers with locale string', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      vendorsRef.value = Array.from({ length: 1250 }, (_, i) => ({
        id: i + 1,
        uuid: `v${i + 1}`,
        is_active: true,
        vendor_name: `Vendor ${i + 1}`
      }))

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('1,250')
    })
  })

  describe('Active Vendors Card Data Fetching', () => {
    it('fetches vendors when corporation is selected', async () => {
      selectedCorporationIdRef.value = 'corp-1'

      const wrapper = mountComponent()
      await flushPromises()

      expect(fetchVendors).toHaveBeenCalledWith('corp-1')
    })

    it('does not fetch vendors when no corporation is selected', async () => {
      selectedCorporationIdRef.value = null

      const wrapper = mountComponent()
      await flushPromises()

      expect(fetchVendors).not.toHaveBeenCalled()
    })

    it('refetches vendors when corporation changes', async () => {
      selectedCorporationIdRef.value = 'corp-1'

      const wrapper = mountComponent()
      await flushPromises()

      fetchVendors.mockClear()
      selectedCorporationIdRef.value = 'corp-2'

      await wrapper.vm.$nextTick()
      await flushPromises()

      expect(fetchVendors).toHaveBeenCalledWith('corp-2')
    })
  })

  describe('Active Vendors Card UI Structure', () => {
    it('has the correct card structure and classes', async () => {
      selectedCorporationIdRef.value = 'corp-1'

      const wrapper = mountComponent()
      await flushPromises()

      const card = wrapper.find('.ucard')
      expect(card.exists()).toBe(true)
    })

    it('contains the correct icon element', async () => {
      selectedCorporationIdRef.value = 'corp-1'

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.uicon').exists()).toBe(true)
    })

    it('displays content in correct order: title, count', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      vendorsRef.value = [
        { id: 1, uuid: 'v1', is_active: true, vendor_name: 'Test Vendor' }
      ]

      const wrapper = mountComponent()
      await flushPromises()

      const text = wrapper.text()
      const titleIndex = text.indexOf('Active Vendors')
      const countIndex = text.indexOf('1')

      expect(titleIndex).toBeLessThan(countIndex)
    })
  })

  describe('Active Vendors Card Error Handling', () => {
    it('handles empty vendors array gracefully', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      vendorsRef.value = []

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('0')
    })

    it('handles undefined vendors gracefully', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      vendorsRef.value = undefined as any

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('--')
    })

    it('handles vendors without is_active property', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      vendorsRef.value = [
        { id: 1, uuid: 'v1', vendor_name: 'Vendor 1' }, // missing is_active
        { id: 2, uuid: 'v2', is_active: true, vendor_name: 'Vendor 2' }
      ]

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('1')
    })
  })

  describe('Active Vendors Card Accessibility', () => {
    it('contains semantic text content for screen readers', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      vendorsRef.value = [
        { id: 1, uuid: 'v1', is_active: true, vendor_name: 'Vendor 1' }
      ]

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('Active Vendors')
      expect(wrapper.text()).toContain('1')
    })
  })
})
