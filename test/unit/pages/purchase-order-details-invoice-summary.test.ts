import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date'
import PurchaseOrderDetailsInvoiceSummary from '@/pages/reports/purchase-order-details-invoice-summary.vue'
import { useCorporationStore } from '@/stores/corporations'
import { useProjectsStore } from '@/stores/projects'

// Mock $fetch
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Mock composables
vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (val: number) => `$${val.toFixed(2)}`
  })
}))

vi.mock('@/composables/useUTCDateFormat', () => ({
  useUTCDateFormat: () => ({
    createDateRangeParams: (startDate: string, endDate: string) => {
      if (!startDate || !endDate) return null
      // Convert to UTC timestamps
      const startUTC = new Date(startDate + 'T00:00:00.000Z').toISOString()
      const endUTC = new Date(endDate + 'T23:59:59.999Z').toISOString()
      return {
        start_date: startUTC,
        end_date: endUTC
      }
    }
  })
}))

// Mock router
const mockRouter = {
  back: vi.fn(),
  push: vi.fn(),
}

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter
}))

// Mock useHead
vi.mock('#app', () => ({
  useHead: vi.fn(),
  navigateTo: vi.fn(),
}))

// Mock definePageMeta
vi.mock('#imports', () => ({
  definePageMeta: vi.fn(),
}))

const setupStores = () => {
  const pinia = createPinia()
  setActivePinia(pinia)

  const corporations = [
    { uuid: 'corp-1', corporation_name: 'Corp One', legal_name: 'CorpOne LLC' },
    { uuid: 'corp-2', corporation_name: 'Corp Two', legal_name: 'CorpTwo LLC' },
  ]

  const projects = [
    { uuid: 'proj-1', project_name: 'Project One', project_id: 'P-001' },
    { uuid: 'proj-2', project_name: 'Project Two', project_id: 'P-002' },
  ]

  const corpStore = useCorporationStore()
  corpStore.corporations = corporations as any
  corpStore.selectedCorporationId = 'corp-1'

  const projectsStore = useProjectsStore()
  projectsStore.projects = projects as any
  projectsStore.fetchProjects = vi.fn(() => Promise.resolve())

  return {
    pinia,
    stores: {
      corporations: corpStore,
      projects: projectsStore,
    },
  }
}

// Helper to set up dates for tests
const setupDates = (wrapper: any) => {
  const currentYear = new Date().getFullYear()
  const todayDate = today(getLocalTimeZone())
  wrapper.vm.startDateValue = new CalendarDate(currentYear, 1, 1)
  wrapper.vm.endDateValue = todayDate
}

const createStubs = () => ({
  UButton: {
    name: 'UButton',
    template: '<button><slot /></button>',
    props: ['icon', 'variant', 'size', 'color', 'disabled'],
  },
  UIcon: {
    name: 'UIcon',
    template: '<i />',
    props: ['name'],
  },
  USkeleton: {
    name: 'USkeleton',
    template: '<div class="skeleton" />',
    props: ['class'],
  },
  UPopover: {
    name: 'UPopover',
    template: '<div class="popover"><slot /><slot name="content" /></div>',
    props: ['popper'],
  },
  UCalendar: {
    name: 'UCalendar',
    template: '<div class="calendar" />',
    props: ['modelValue', 'minValue', 'maxValue', 'class'],
    emits: ['update:modelValue'],
  },
  ProjectSelect: {
    name: 'ProjectSelect',
    template: '<div class="project-select" />',
    props: ['modelValue', 'corporationUuid', 'placeholder', 'size', 'class'],
    emits: ['update:modelValue'],
  },
  CorporationSelect: {
    name: 'CorporationSelect',
    template: '<div class="corporation-select" />',
    props: ['modelValue', 'size', 'class'],
    emits: ['update:modelValue', 'change'],
  },
})

// Mock data - using current year dates to match default date range
const currentYear = new Date().getFullYear()
const mockPurchaseOrders = [
  {
    uuid: 'po-1',
    po_number: 'PO-001',
    project_uuid: 'proj-1',
    vendor_uuid: 'vendor-1',
    submit_date: `${currentYear}-06-15`,
    entry_date: `${currentYear}-06-15T00:00:00.000Z`,
    status: 'Approved',
    item_total: 53592.54,
    freight_charges_amount: 1000.00,
    packing_charges_amount: 0,
    custom_duties_charges_amount: 0,
    other_charges_amount: 0,
    sales_tax_1_amount: 6967.03,
    sales_tax_2_amount: 0,
    po_type: 'MATERIAL',
  },
  {
    uuid: 'po-2',
    po_number: 'PO-002',
    project_uuid: 'proj-1',
    vendor_uuid: 'vendor-2',
    submit_date: `${currentYear}-06-20`,
    entry_date: `${currentYear}-06-20T00:00:00.000Z`,
    status: 'Received',
    item_total: 6394.00,
    freight_charges_amount: 250.00,
    packing_charges_amount: 0,
    custom_duties_charges_amount: 0,
    other_charges_amount: 0,
    sales_tax_1_amount: 863.72,
    sales_tax_2_amount: 0,
    po_type: 'MATERIAL',
  },
]

const mockChangeOrders = [
  {
    uuid: 'co-1',
    co_number: 'CO-001',
    project_uuid: 'proj-1',
    vendor_uuid: 'vendor-1',
    created_date: `${currentYear}-06-25T00:00:00.000Z`,
    status: 'Approved',
    item_total: 10000.00,
    freight_charges_amount: 500.00,
    packing_charges_amount: 0,
    custom_duties_charges_amount: 0,
    other_charges_amount: 0,
    sales_tax_1_amount: 1300.00,
    sales_tax_2_amount: 0,
    co_type: 'MATERIAL',
  },
]

const mockVendors = [
  { uuid: 'vendor-1', vendor_name: 'Vendor One' },
  { uuid: 'vendor-2', vendor_name: 'Vendor Two' },
]

const mockPOItems = [
  {
    uuid: 'item-1',
    purchase_order_uuid: 'po-1',
    po_quantity: 10,
    po_unit_price: 5359.254,
    po_total: 53592.54,
  },
]

const mockCOItems = [
  {
    uuid: 'item-1',
    change_order_uuid: 'co-1',
    co_quantity: 5,
    co_unit_price: 2000.00,
    co_total: 10000.00,
  },
]

const mockInvoices = [
  {
    uuid: 'inv-1',
    purchase_order_uuid: 'po-1',
    change_order_uuid: null,
    total_invoice_amount: 47908.95,
    amount: 47908.95,
    holdback_amount: 4790.89,
    status: 'Approved',
    payment_amount: 32564.00,
  },
  {
    uuid: 'inv-2',
    purchase_order_uuid: 'po-2',
    change_order_uuid: null,
    total_invoice_amount: 7507.72,
    amount: 7507.72,
    holdback_amount: 750.77,
    status: 'Paid',
    payment_amount: 5264.00,
  },
  {
    uuid: 'inv-3',
    purchase_order_uuid: null,
    change_order_uuid: 'co-1',
    total_invoice_amount: 8000.00,
    amount: 8000.00,
    holdback_amount: 800.00,
    status: 'Approved',
    payment_amount: 5000.00,
  },
]

describe('PurchaseOrderDetailsInvoiceSummary.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
    // Default mock implementation that returns empty data
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/api/purchase-order-forms') {
        return Promise.resolve({ data: [] })
      }
      if (url === '/api/change-orders') {
        return Promise.resolve({ data: [] })
      }
      if (url === '/api/purchase-orders/vendors') {
        return Promise.resolve({ data: mockVendors })
      }
      if (url === '/api/vendor-invoices') {
        return Promise.resolve({ data: [] })
      }
      if (url === '/api/purchase-order-items') {
        return Promise.resolve({ data: [] })
      }
      if (url === '/api/labor-purchase-order-items') {
        return Promise.resolve({ data: [] })
      }
      if (url === '/api/change-order-items') {
        return Promise.resolve({ data: [] })
      }
      if (url === '/api/labor-change-order-items') {
        return Promise.resolve({ data: [] })
      }
      return Promise.resolve({ data: [] })
    })
  })

  describe('Component Rendering', () => {
    it('renders the component with all required elements', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      expect(wrapper.findComponent({ name: 'CorporationSelect' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'ProjectSelect' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'UCalendar' }).exists()).toBe(true)

      wrapper.unmount()
    })

    it('shows placeholder when no corporation is selected', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()
      ;(wrapper.vm as any).selectedCorporationId = undefined
      await wrapper.vm.$nextTick()

      expect(wrapper.html()).toContain('Please select a corporation')
      const icon = wrapper.findComponent({ name: 'UIcon' })
      expect(icon.exists()).toBe(true)

      wrapper.unmount()
    })

    it('shows placeholder when corporation selected but no project', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()
      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = undefined
      await wrapper.vm.$nextTick()

      expect(wrapper.html()).toContain('Please select a project')
      const icons = wrapper.findAllComponents({ name: 'UIcon' })
      expect(icons.length).toBeGreaterThan(0)

      wrapper.unmount()
    })

    it('shows placeholder when dates are not selected', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()
      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      ;(wrapper.vm as any).startDateValue = null
      ;(wrapper.vm as any).endDateValue = null
      await wrapper.vm.$nextTick()

      expect(wrapper.html()).toContain('Please select start date and end date')
      const icons = wrapper.findAllComponents({ name: 'UIcon' })
      expect(icons.length).toBeGreaterThan(0)

      wrapper.unmount()
    })
  })

  describe('Date Range Selection', () => {
    it('initializes with default date range (Jan 1 to today)', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      const currentYear = new Date().getFullYear()
      const todayDate = today(getLocalTimeZone())

      expect(wrapper.vm.startDateValue).toBeInstanceOf(CalendarDate)
      expect(wrapper.vm.startDateValue?.year).toBe(currentYear)
      expect(wrapper.vm.startDateValue?.month).toBe(1)
      expect(wrapper.vm.startDateValue?.day).toBe(1)

      expect(wrapper.vm.endDateValue).toBeInstanceOf(CalendarDate)
      expect(wrapper.vm.endDateValue?.year).toBe(todayDate.year)
      expect(wrapper.vm.endDateValue?.month).toBe(todayDate.month)
      expect(wrapper.vm.endDateValue?.day).toBe(todayDate.day)

      wrapper.unmount()
    })

    it('validates date range correctly', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      const currentYear = new Date().getFullYear()
      const todayDate = today(getLocalTimeZone())

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'

      // Valid range: start <= end
      wrapper.vm.startDateValue = new CalendarDate(currentYear, 1, 1)
      wrapper.vm.endDateValue = todayDate
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.canGenerateReport).toBe(true)

      // Invalid range: start > end
      wrapper.vm.startDateValue = todayDate.add({ days: 1 })
      wrapper.vm.endDateValue = todayDate
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.canGenerateReport).toBe(false)

      wrapper.unmount()
    })

    it('does not automatically load report when project is selected', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      await wrapper.vm.$nextTick()

      // Report should not be loaded automatically
      expect(wrapper.vm.reportData.length).toBe(0)
      expect(mockFetch).not.toHaveBeenCalled()

      wrapper.unmount()
    })

    it('loads report when Show button is clicked with valid inputs', async () => {
      const { pinia } = setupStores()

      mockFetch
        .mockResolvedValueOnce({ data: mockPurchaseOrders })
        .mockResolvedValueOnce({ data: mockChangeOrders })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: mockPOItems })
        .mockResolvedValueOnce({ data: mockPOItems })
        .mockResolvedValueOnce({ data: mockCOItems })
        .mockResolvedValueOnce({ data: mockInvoices })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      const currentYear = new Date().getFullYear()
      const todayDate = today(getLocalTimeZone())

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      wrapper.vm.startDateValue = new CalendarDate(currentYear, 1, 1)
      wrapper.vm.endDateValue = todayDate
      await wrapper.vm.$nextTick()

      await wrapper.vm.handleShowReport()
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith('/api/purchase-order-forms', expect.any(Object))
      expect(mockFetch).toHaveBeenCalledWith('/api/change-orders', expect.any(Object))
      expect(wrapper.vm.reportData.length).toBeGreaterThan(0)

      wrapper.unmount()
    })
  })

  describe('Report Loading', () => {
    it('loads purchase orders and change orders when Show button is clicked', async () => {
      const { pinia } = setupStores()

      mockFetch
        .mockResolvedValueOnce({ data: mockPurchaseOrders }) // Purchase orders
        .mockResolvedValueOnce({ data: mockChangeOrders }) // Change orders
        .mockResolvedValueOnce({ data: mockVendors }) // Vendors
        .mockResolvedValueOnce({ data: mockPOItems }) // PO items for po-1
        .mockResolvedValueOnce({ data: mockPOItems }) // PO items for po-2
        .mockResolvedValueOnce({ data: mockCOItems }) // CO items for co-1
        .mockResolvedValueOnce({ data: mockInvoices }) // All invoices

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      const currentYear = new Date().getFullYear()
      const todayDate = today(getLocalTimeZone())

      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      ;(wrapper.vm as any).startDateValue = new CalendarDate(currentYear, 1, 1)
      ;(wrapper.vm as any).endDateValue = todayDate
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).loadReport()
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith('/api/purchase-order-forms', expect.any(Object))
      expect(mockFetch).toHaveBeenCalledWith('/api/change-orders', expect.any(Object))
      expect((wrapper.vm as any).reportData.length).toBeGreaterThan(0)

      wrapper.unmount()
    })

    it('calculates goods amount from item_total for purchase orders', async () => {
      const { pinia } = setupStores()

      mockFetch
        .mockResolvedValueOnce({ data: [mockPurchaseOrders[0]] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: mockInvoices.filter(inv => inv.purchase_order_uuid === 'po-1') })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).loadReport()
      await flushPromises()

      const reportData = (wrapper.vm as any).reportData
      expect(reportData.length).toBe(1)
      expect(reportData[0].goods_amount).toBe(53592.54)
      expect(reportData[0].type).toBe('PO')

      wrapper.unmount()
    })

    it('calculates goods amount from item_total for change orders', async () => {
      const { pinia } = setupStores()

      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/purchase-order-forms') {
          return Promise.resolve({ data: [] })
        }
        if (url === '/api/change-orders') {
          return Promise.resolve({ data: [mockChangeOrders[0]] })
        }
        if (url === '/api/purchase-orders/vendors') {
          return Promise.resolve({ data: mockVendors })
        }
        if (url === '/api/vendor-invoices') {
          return Promise.resolve({ data: mockInvoices })
        }
        return Promise.resolve({ data: [] })
      })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).loadReport()
      await flushPromises()

      const reportData = (wrapper.vm as any).reportData
      expect(reportData.length).toBe(1)
      expect(reportData[0].goods_amount).toBe(10000.00)
      expect(reportData[0].type).toBe('CO')
      expect(reportData[0].co_number).toBe('CO-001')

      wrapper.unmount()
    })

    it('calculates item_total from items if not available in PO', async () => {
      const { pinia } = setupStores()

      const poWithoutItemTotal = {
        ...mockPurchaseOrders[0],
        item_total: null,
      }

      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/purchase-order-forms') {
          return Promise.resolve({ data: [poWithoutItemTotal] })
        }
        if (url === '/api/change-orders') {
          return Promise.resolve({ data: [] })
        }
        if (url === '/api/purchase-orders/vendors') {
          return Promise.resolve({ data: mockVendors })
        }
        if (url === '/api/purchase-order-items') {
          return Promise.resolve({ data: mockPOItems })
        }
        if (url === '/api/vendor-invoices') {
          return Promise.resolve({ data: [] })
        }
        return Promise.resolve({ data: [] })
      })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).loadReport()
      await flushPromises()

      const reportData = (wrapper.vm as any).reportData
      expect(reportData.length).toBe(1)
      expect(reportData[0].goods_amount).toBe(53592.54) // Calculated from items

      wrapper.unmount()
    })

    it('calculates item_total from items if not available in CO', async () => {
      const { pinia } = setupStores()

      const coWithoutItemTotal = {
        ...mockChangeOrders[0],
        item_total: null,
      }

      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/purchase-order-forms') {
          return Promise.resolve({ data: [] })
        }
        if (url === '/api/change-orders') {
          return Promise.resolve({ data: [coWithoutItemTotal] })
        }
        if (url === '/api/purchase-orders/vendors') {
          return Promise.resolve({ data: mockVendors })
        }
        if (url === '/api/change-order-items') {
          return Promise.resolve({ data: mockCOItems })
        }
        if (url === '/api/vendor-invoices') {
          return Promise.resolve({ data: [] })
        }
        return Promise.resolve({ data: [] })
      })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).loadReport()
      await flushPromises()

      const reportData = (wrapper.vm as any).reportData
      expect(reportData.length).toBe(1)
      expect(reportData[0].goods_amount).toBe(10000.00) // Calculated from items

      wrapper.unmount()
    })
  })

  describe('Date Range Filtering', () => {
    it('filters purchase orders by entry_date when date range is provided', async () => {
      const { pinia } = setupStores()

      const currentYear = new Date().getFullYear()
      const poInRange = {
        ...mockPurchaseOrders[0],
        entry_date: `${currentYear}-06-15T00:00:00.000Z`,
      }
      const poOutOfRange = {
        ...mockPurchaseOrders[1],
        entry_date: `${currentYear - 1}-12-01T00:00:00.000Z`,
      }

      mockFetch
        .mockResolvedValueOnce({ data: [poInRange, poOutOfRange] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: [] })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      // Set date range to include only poInRange
      wrapper.vm.startDateValue = new CalendarDate(currentYear, 6, 1)
      wrapper.vm.endDateValue = new CalendarDate(currentYear, 6, 30)
      await wrapper.vm.$nextTick()

      await wrapper.vm.loadReport()
      await flushPromises()

      const reportData = wrapper.vm.reportData
      expect(reportData.length).toBe(1)
      expect(reportData[0].po_number).toBe('PO-001')

      wrapper.unmount()
    })

    it('filters change orders by created_date when date range is provided', async () => {
      const { pinia } = setupStores()

      const currentYear = new Date().getFullYear()
      const coInRange = {
        ...mockChangeOrders[0],
        created_date: `${currentYear}-06-20T00:00:00.000Z`,
      }
      const coOutOfRange = {
        ...mockChangeOrders[0],
        uuid: 'co-2',
        co_number: 'CO-002',
        created_date: `${currentYear - 1}-12-01T00:00:00.000Z`,
      }

      mockFetch
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [coInRange, coOutOfRange] })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: [] })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      // Set date range to include only coInRange
      wrapper.vm.startDateValue = new CalendarDate(currentYear, 6, 1)
      wrapper.vm.endDateValue = new CalendarDate(currentYear, 6, 30)
      await wrapper.vm.$nextTick()

      await wrapper.vm.loadReport()
      await flushPromises()

      const reportData = wrapper.vm.reportData
      expect(reportData.length).toBe(1)
      expect(reportData[0].co_number).toBe('CO-001')

      wrapper.unmount()
    })

    it('excludes purchase orders without entry_date when filtering by date range', async () => {
      const { pinia } = setupStores()

      const poWithoutDate = {
        ...mockPurchaseOrders[0],
        entry_date: null,
      }

      mockFetch
        .mockResolvedValueOnce({ data: [poWithoutDate] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: [] })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      const currentYear = new Date().getFullYear()
      wrapper.vm.startDateValue = new CalendarDate(currentYear, 1, 1)
      wrapper.vm.endDateValue = new CalendarDate(currentYear, 12, 31)
      await wrapper.vm.$nextTick()

      await wrapper.vm.loadReport()
      await flushPromises()

      const reportData = wrapper.vm.reportData
      expect(reportData.length).toBe(0)

      wrapper.unmount()
    })

    it('excludes change orders without created_date when filtering by date range', async () => {
      const { pinia } = setupStores()

      const coWithoutDate = {
        ...mockChangeOrders[0],
        created_date: null,
      }

      mockFetch
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [coWithoutDate] })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: [] })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      const currentYear = new Date().getFullYear()
      wrapper.vm.startDateValue = new CalendarDate(currentYear, 1, 1)
      wrapper.vm.endDateValue = new CalendarDate(currentYear, 12, 31)
      await wrapper.vm.$nextTick()

      await wrapper.vm.loadReport()
      await flushPromises()

      const reportData = wrapper.vm.reportData
      expect(reportData.length).toBe(0)

      wrapper.unmount()
    })
  })

  describe('Invoice Summary Calculations', () => {
    it('calculates total invoiced from invoices for purchase orders', async () => {
      const { pinia } = setupStores()

      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/purchase-order-forms') {
          return Promise.resolve({ data: [mockPurchaseOrders[0]] })
        }
        if (url === '/api/change-orders') {
          return Promise.resolve({ data: [] })
        }
        if (url === '/api/purchase-orders/vendors') {
          return Promise.resolve({ data: mockVendors })
        }
        if (url === '/api/vendor-invoices') {
          const poUuid = options?.params?.purchase_order_uuid
          if (poUuid === 'po-1') {
            return Promise.resolve({ data: mockInvoices.filter(inv => inv.purchase_order_uuid === 'po-1') })
          }
          return Promise.resolve({ data: [] })
        }
        return Promise.resolve({ data: [] })
      })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).loadReport()
      await flushPromises()

      const reportData = (wrapper.vm as any).reportData
      expect(reportData[0].total_invoiced).toBe(47908.95)
      expect(reportData[0].holdback).toBe(4790.89)
      expect(reportData[0].total_paid).toBe(32564.00)

      wrapper.unmount()
    })

    it('calculates total invoiced from invoices for change orders', async () => {
      const { pinia } = setupStores()

      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/purchase-order-forms') {
          return Promise.resolve({ data: [] })
        }
        if (url === '/api/change-orders') {
          return Promise.resolve({ data: [mockChangeOrders[0]] })
        }
        if (url === '/api/purchase-orders/vendors') {
          return Promise.resolve({ data: mockVendors })
        }
        if (url === '/api/vendor-invoices') {
          // For COs, all invoices are fetched and filtered client-side
          return Promise.resolve({ data: mockInvoices })
        }
        return Promise.resolve({ data: [] })
      })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).loadReport()
      await flushPromises()

      const reportData = (wrapper.vm as any).reportData
      expect(reportData[0].total_invoiced).toBe(8000.00)
      expect(reportData[0].holdback).toBe(800.00)
      expect(reportData[0].total_paid).toBe(5000.00)

      wrapper.unmount()
    })

    it('calculates balance to be invoiced correctly', async () => {
      const { pinia } = setupStores()

      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/purchase-order-forms') {
          return Promise.resolve({ data: [mockPurchaseOrders[0]] })
        }
        if (url === '/api/change-orders') {
          return Promise.resolve({ data: [] })
        }
        if (url === '/api/purchase-orders/vendors') {
          return Promise.resolve({ data: mockVendors })
        }
        if (url === '/api/vendor-invoices') {
          const poUuid = options?.params?.purchase_order_uuid
          if (poUuid === 'po-1') {
            return Promise.resolve({ data: mockInvoices.filter(inv => inv.purchase_order_uuid === 'po-1') })
          }
          return Promise.resolve({ data: [] })
        }
        return Promise.resolve({ data: [] })
      })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).loadReport()
      await flushPromises()

      const reportData = (wrapper.vm as any).reportData
      const poTotal = 53592.54 + 1000.00 + 0 + 6967.03 // goods + freight + additional + hst
      const expectedBalance = poTotal - 47908.95
      expect(reportData[0].balance_to_invoice).toBe(expectedBalance)

      wrapper.unmount()
    })
  })

  describe('Financial Breakdown Calculations', () => {
    it('calculates PO total correctly including all charges and taxes', async () => {
      const { pinia } = setupStores()

      mockFetch
        .mockResolvedValueOnce({ data: [mockPurchaseOrders[0]] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: [] })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).loadReport()
      await flushPromises()

      const reportData = (wrapper.vm as any).reportData
      const expectedTotal = 53592.54 + 1000.00 + 0 + 6967.03 // goods + freight + additional + hst
      expect(reportData[0].po_total).toBe(expectedTotal)
      expect(reportData[0].freight_amount).toBe(1000.00)
      expect(reportData[0].additional_charges).toBe(0)
      expect(reportData[0].hst).toBe(6967.03)

      wrapper.unmount()
    })

    it('calculates CO total correctly including all charges and taxes', async () => {
      const { pinia } = setupStores()

      mockFetch
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [mockChangeOrders[0]] })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: [] })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).loadReport()
      await flushPromises()

      const reportData = (wrapper.vm as any).reportData
      const expectedTotal = 10000.00 + 500.00 + 0 + 1300.00 // goods + freight + additional + hst
      expect(reportData[0].po_total).toBe(expectedTotal)
      expect(reportData[0].freight_amount).toBe(500.00)
      expect(reportData[0].additional_charges).toBe(0)
      expect(reportData[0].hst).toBe(1300.00)

      wrapper.unmount()
    })
  })

  describe('Combined PO and CO Display', () => {
    it('displays both purchase orders and change orders in the same table', async () => {
      const { pinia } = setupStores()

      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/purchase-order-forms') {
          return Promise.resolve({ data: mockPurchaseOrders })
        }
        if (url === '/api/change-orders') {
          return Promise.resolve({ data: mockChangeOrders })
        }
        if (url === '/api/purchase-orders/vendors') {
          return Promise.resolve({ data: mockVendors })
        }
        if (url === '/api/purchase-order-items') {
          return Promise.resolve({ data: mockPOItems })
        }
        if (url === '/api/change-order-items') {
          return Promise.resolve({ data: mockCOItems })
        }
        if (url === '/api/vendor-invoices') {
          const poUuid = options?.params?.purchase_order_uuid
          if (poUuid === 'po-1') {
            return Promise.resolve({ data: mockInvoices.filter(inv => inv.purchase_order_uuid === 'po-1') })
          }
          if (poUuid === 'po-2') {
            return Promise.resolve({ data: mockInvoices.filter(inv => inv.purchase_order_uuid === 'po-2') })
          }
          // For COs, all invoices are fetched and filtered client-side
          return Promise.resolve({ data: mockInvoices })
        }
        return Promise.resolve({ data: [] })
      })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).loadReport()
      await flushPromises()

      const reportData = (wrapper.vm as any).reportData
      expect(reportData.length).toBe(3) // 2 POs + 1 CO

      const poRows = reportData.filter((row: any) => row.type === 'PO')
      const coRows = reportData.filter((row: any) => row.type === 'CO')
      expect(poRows.length).toBe(2)
      expect(coRows.length).toBe(1)

      wrapper.unmount()
    })

    it('sorts combined data by submit date (newest first)', async () => {
      const { pinia } = setupStores()

      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/purchase-order-forms') {
          return Promise.resolve({ data: mockPurchaseOrders })
        }
        if (url === '/api/change-orders') {
          return Promise.resolve({ data: mockChangeOrders })
        }
        if (url === '/api/purchase-orders/vendors') {
          return Promise.resolve({ data: mockVendors })
        }
        if (url === '/api/purchase-order-items') {
          return Promise.resolve({ data: mockPOItems })
        }
        if (url === '/api/change-order-items') {
          return Promise.resolve({ data: mockCOItems })
        }
        if (url === '/api/vendor-invoices') {
          const poUuid = options?.params?.purchase_order_uuid
          if (poUuid === 'po-1') {
            return Promise.resolve({ data: mockInvoices.filter(inv => inv.purchase_order_uuid === 'po-1') })
          }
          if (poUuid === 'po-2') {
            return Promise.resolve({ data: mockInvoices.filter(inv => inv.purchase_order_uuid === 'po-2') })
          }
          // For COs, all invoices are fetched and filtered client-side
          return Promise.resolve({ data: mockInvoices })
        }
        return Promise.resolve({ data: [] })
      })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).loadReport()
      await flushPromises()

      const reportData = (wrapper.vm as any).reportData
      // CO-001 (June 25) should be first, then PO-002 (June 20), then PO-001 (June 15)
      expect(reportData[0].co_number || reportData[0].po_number).toBe('CO-001')
      expect(reportData[1].po_number).toBe('PO-002')
      expect(reportData[2].po_number).toBe('PO-001')

      wrapper.unmount()
    })

    it('displays PO number for purchase orders and CO number for change orders', async () => {
      const { pinia } = setupStores()

      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/purchase-order-forms') {
          return Promise.resolve({ data: [mockPurchaseOrders[0]] })
        }
        if (url === '/api/change-orders') {
          return Promise.resolve({ data: [mockChangeOrders[0]] })
        }
        if (url === '/api/purchase-orders/vendors') {
          return Promise.resolve({ data: mockVendors })
        }
        if (url === '/api/purchase-order-items') {
          return Promise.resolve({ data: mockPOItems })
        }
        if (url === '/api/change-order-items') {
          return Promise.resolve({ data: mockCOItems })
        }
        if (url === '/api/vendor-invoices') {
          const poUuid = options?.params?.purchase_order_uuid
          if (poUuid === 'po-1') {
            return Promise.resolve({ data: mockInvoices.filter(inv => inv.purchase_order_uuid === 'po-1') })
          }
          // For COs, all invoices are fetched and filtered client-side
          return Promise.resolve({ data: mockInvoices })
        }
        return Promise.resolve({ data: [] })
      })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).loadReport()
      await flushPromises()

      const reportData = (wrapper.vm as any).reportData
      const poRow = reportData.find((row: any) => row.type === 'PO')
      const coRow = reportData.find((row: any) => row.type === 'CO')

      expect(poRow.po_number).toBe('PO-001')
      expect(poRow.co_number).toBeNull()
      expect(coRow.co_number).toBe('CO-001')
      expect(coRow.po_number).toBeNull()

      wrapper.unmount()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty purchase orders and change orders', async () => {
      const { pinia } = setupStores()

      mockFetch
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: mockVendors })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).loadReport()
      await flushPromises()

      const reportData = (wrapper.vm as any).reportData
      expect(reportData.length).toBe(0)

      wrapper.unmount()
    })

    it('handles missing vendor information gracefully', async () => {
      const { pinia } = setupStores()

      const poWithoutVendor = {
        ...mockPurchaseOrders[0],
        vendor_uuid: null,
      }

      mockFetch
        .mockResolvedValueOnce({ data: [poWithoutVendor] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: [] })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).loadReport()
      await flushPromises()

      const reportData = (wrapper.vm as any).reportData
      expect(reportData[0].vendor_name).toBe('N/A')

      wrapper.unmount()
    })

    it('handles API errors gracefully', async () => {
      const { pinia } = setupStores()

      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).loadReport()
      await flushPromises()

      expect((wrapper.vm as any).error).toBeTruthy()
      expect((wrapper.vm as any).reportData.length).toBe(0)

      wrapper.unmount()
    })

    it('handles labor PO items correctly', async () => {
      const { pinia } = setupStores()

      const currentYear = new Date().getFullYear()
      const laborPO = {
        ...mockPurchaseOrders[0],
        po_type: 'LABOR',
        item_total: null,
        entry_date: `${currentYear}-06-15T00:00:00.000Z`,
      }

      const laborItems = [
        {
          uuid: 'labor-item-1',
          purchase_order_uuid: 'po-1',
          po_amount: 53592.54,
        },
      ]

      mockFetch
        .mockResolvedValueOnce({ data: [laborPO] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: laborItems })
        .mockResolvedValueOnce({ data: [] })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).loadReport()
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith('/api/labor-purchase-order-items', expect.any(Object))

      wrapper.unmount()
    })

    it('handles labor CO items correctly', async () => {
      const { pinia } = setupStores()

      const laborCO = {
        ...mockChangeOrders[0],
        co_type: 'LABOR',
        item_total: null,
      }

      const laborItems = [
        {
          uuid: 'labor-item-1',
          change_order_uuid: 'co-1',
          co_amount: 10000.00,
        },
      ]

      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/purchase-order-forms') {
          return Promise.resolve({ data: [] })
        }
        if (url === '/api/change-orders') {
          return Promise.resolve({ data: [laborCO] })
        }
        if (url === '/api/purchase-orders/vendors') {
          return Promise.resolve({ data: mockVendors })
        }
        if (url === '/api/vendor-invoices') {
          return Promise.resolve({ data: mockInvoices })
        }
        if (url === '/api/labor-change-order-items') {
          return Promise.resolve({ data: laborItems })
        }
        return Promise.resolve({ data: [] })
      })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).loadReport()
      await flushPromises()

      // Check that labor-change-order-items endpoint was called
      const laborCall = mockFetch.mock.calls.find(
        (call: any) => call[0] === '/api/labor-change-order-items'
      )
      expect(laborCall).toBeDefined()

      wrapper.unmount()
    })
  })

  describe('Print Functionality', () => {
    it('calls window.print when print button is clicked', async () => {
      const { pinia } = setupStores()

      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})

      mockFetch
        .mockResolvedValueOnce({ data: [mockPurchaseOrders[0]] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: [] })

      const wrapper = mount(PurchaseOrderDetailsInvoiceSummary, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      ;(wrapper.vm as any).selectedCorporationId = 'corp-1'
      ;(wrapper.vm as any).selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).loadReport()
      await flushPromises()

      await (wrapper.vm as any).printReport()

      expect(printSpy).toHaveBeenCalled()

      printSpy.mockRestore()
      wrapper.unmount()
    })
  })
})

