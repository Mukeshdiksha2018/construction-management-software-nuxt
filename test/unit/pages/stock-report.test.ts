import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date'
import StockReport from '@/pages/reports/stock-report.vue'
import { useCorporationStore } from '@/stores/corporations'
import { useProjectsStore } from '@/stores/projects'

// Mock composables
vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (val: number | null | undefined) => {
      if (val === null || val === undefined) return '$0.00'
      return `$${Number(val).toFixed(2)}`
    }
  })
}))

vi.mock('@/composables/useDateFormat', () => ({
  useDateFormat: () => ({
    formatDate: (date: Date, format: string) => {
      if (!date) return '-'
      const d = new Date(date)
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const year = d.getFullYear()
      return `${month}-${day}-${year}`
    }
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

// Create a mock function that can be accessed in tests
const mockGenerateStockReport = vi.fn()

vi.mock('@/composables/useStockReport', () => {
  const { ref, computed } = require('vue')
  return {
    useStockReport: () => {
      const loading = ref(false)
      const error = ref<string | null>(null)
      
      return {
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        generateStockReport: mockGenerateStockReport
      }
    }
  }
})

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

describe('StockReport.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateStockReport.mockImplementation(async (corpUuid: string, projUuid: string) => {
      await new Promise(resolve => setTimeout(resolve, 10))
      if (!corpUuid || !projUuid) {
        return null
      }
      const currentYear = new Date().getFullYear()
      return {
        items: [
          {
            itemCode: 'ITM001',
            itemName: 'Cement (50kg)',
            description: 'Portland Cement',
            vendorSource: 'Test Vendor',
            costCode: '03 31 13',
            currentStock: 100,
            unitCost: 5.0,
            uom: 'Bag',
            totalValue: 500.0,
            reorderLevel: 50,
            inShipment: 0,
            returnedQty: 0,
            lastPurchaseDate: `${currentYear}-06-15T00:00:00.000Z`,
            lastStockUpdateDate: `${currentYear}-06-15T00:00:00.000Z`,
          },
          {
            itemCode: 'ITM002',
            itemName: 'Steel Rebar',
            description: 'Grade 60 Rebar',
            vendorSource: 'Another Vendor',
            costCode: '03 20 00',
            currentStock: 200,
            unitCost: 10.0,
            uom: 'Ton',
            totalValue: 2000.0,
            reorderLevel: 100,
            inShipment: 50,
            returnedQty: 10,
            lastPurchaseDate: `${currentYear}-06-20T00:00:00.000Z`,
            lastStockUpdateDate: `${currentYear}-06-20T00:00:00.000Z`,
          },
          {
            itemCode: 'ITM003',
            itemName: 'Concrete Mix',
            description: 'Ready Mix Concrete',
            vendorSource: 'Concrete Co',
            costCode: '03 30 00',
            currentStock: 150,
            unitCost: 8.0,
            uom: 'Cubic Yard',
            totalValue: 1200.0,
            reorderLevel: 75,
            inShipment: 25,
            returnedQty: 5,
            lastPurchaseDate: `${currentYear - 1}-12-01T00:00:00.000Z`,
            lastStockUpdateDate: `${currentYear - 1}-12-01T00:00:00.000Z`,
          },
        ],
        totals: {
          currentStock: 450,
          totalValue: 3700.0,
          reorderLevel: 225,
          inShipment: 75,
          returnedQty: 15,
        },
      }
    })
  })

  describe('Component Rendering', () => {
    it('renders the component with all required elements', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(StockReport, {
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

      const wrapper = mount(StockReport, {
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

      const wrapper = mount(StockReport, {
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

      const wrapper = mount(StockReport, {
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

      const wrapper = mount(StockReport, {
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

      const wrapper = mount(StockReport, {
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

      const wrapper = mount(StockReport, {
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
      expect(wrapper.vm.reportData).toBeNull()
      expect(mockGenerateStockReport).not.toHaveBeenCalled()

      wrapper.unmount()
    })

    it('loads report when Show button is clicked with valid inputs', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(StockReport, {
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

      expect(mockGenerateStockReport).toHaveBeenCalledWith('corp-1', 'proj-1')
      expect(wrapper.vm.reportData).not.toBeNull()
      expect(wrapper.vm.reportData?.items.length).toBeGreaterThan(0)

      wrapper.unmount()
    })
  })

  describe('Report Loading', () => {
    it('loads stock report when Show button is clicked', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(StockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await wrapper.vm.loadStockReport()
      await flushPromises()

      expect(mockGenerateStockReport).toHaveBeenCalledWith('corp-1', 'proj-1')
      expect(wrapper.vm.reportData).not.toBeNull()
      expect(wrapper.vm.reportData?.items.length).toBeGreaterThan(0)

      wrapper.unmount()
    })

    it('does not load report when corporation is missing', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(StockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = undefined
      wrapper.vm.selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await wrapper.vm.loadStockReport()
      await flushPromises()

      expect(wrapper.vm.reportData).toBeNull()

      wrapper.unmount()
    })

    it('does not load report when project is missing', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(StockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = undefined
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await wrapper.vm.loadStockReport()
      await flushPromises()

      expect(wrapper.vm.reportData).toBeNull()

      wrapper.unmount()
    })

    it('does not load report when dates are missing', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(StockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      wrapper.vm.startDateValue = null
      wrapper.vm.endDateValue = null
      await wrapper.vm.$nextTick()

      await wrapper.vm.loadStockReport()
      await flushPromises()

      expect(wrapper.vm.reportData).toBeNull()

      wrapper.unmount()
    })
  })

  describe('Date Range Filtering', () => {
    it('filters stock items by lastPurchaseDate when date range is provided', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(StockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      // Set date range to include only items from current year June
      const currentYear = new Date().getFullYear()
      wrapper.vm.startDateValue = new CalendarDate(currentYear, 6, 1)
      wrapper.vm.endDateValue = new CalendarDate(currentYear, 6, 30)
      await wrapper.vm.$nextTick()

      await wrapper.vm.loadStockReport()
      await flushPromises()

      const reportData = wrapper.vm.reportData
      expect(reportData).not.toBeNull()
      // Should only include items from June (ITM001 and ITM002), not ITM003 from previous year
      expect(reportData?.items.length).toBe(2)
      expect(reportData?.items.every((item: any) => 
        item.itemCode === 'ITM001' || item.itemCode === 'ITM002'
      )).toBe(true)

      wrapper.unmount()
    })

    it('filters stock items by lastStockUpdateDate when lastPurchaseDate is not available', async () => {
      const { pinia } = setupStores()

      // Override mock to return items without lastPurchaseDate
      mockGenerateStockReport.mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        const currentYear = new Date().getFullYear()
        return {
          items: [
            {
              itemCode: 'ITM001',
              itemName: 'Cement',
              description: 'Portland Cement',
              vendorSource: 'Test Vendor',
              costCode: '03 31 13',
              currentStock: 100,
              unitCost: 5.0,
              uom: 'Bag',
              totalValue: 500.0,
              reorderLevel: 50,
              inShipment: 0,
              returnedQty: 0,
              lastPurchaseDate: null,
              lastStockUpdateDate: `${currentYear}-06-15T00:00:00.000Z`,
            },
          ],
          totals: { currentStock: 100, totalValue: 500.0, reorderLevel: 50, inShipment: 0, returnedQty: 0 },
        }
      })

      const wrapper = mount(StockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      const currentYear = new Date().getFullYear()
      wrapper.vm.startDateValue = new CalendarDate(currentYear, 6, 1)
      wrapper.vm.endDateValue = new CalendarDate(currentYear, 6, 30)
      await wrapper.vm.$nextTick()

      await wrapper.vm.loadStockReport()
      await flushPromises()

      const reportData = wrapper.vm.reportData
      expect(reportData).not.toBeNull()
      expect(reportData?.items.length).toBe(1)

      wrapper.unmount()
    })

    it('excludes stock items without dates when filtering by date range', async () => {
      const { pinia } = setupStores()

      // Override mock to return items without dates
      mockGenerateStockReport.mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return {
          items: [
            {
              itemCode: 'ITM001',
              itemName: 'Cement',
              description: 'Portland Cement',
              vendorSource: 'Test Vendor',
              costCode: '03 31 13',
              currentStock: 100,
              unitCost: 5.0,
              uom: 'Bag',
              totalValue: 500.0,
              reorderLevel: 50,
              inShipment: 0,
              returnedQty: 0,
              lastPurchaseDate: null,
              lastStockUpdateDate: null,
            },
          ],
          totals: { currentStock: 100, totalValue: 500.0, reorderLevel: 50, inShipment: 0, returnedQty: 0 },
        }
      })

      const wrapper = mount(StockReport, {
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

      await wrapper.vm.loadStockReport()
      await flushPromises()

      const reportData = wrapper.vm.reportData
      expect(reportData).not.toBeNull()
      expect(reportData?.items.length).toBe(0)

      wrapper.unmount()
    })

    it('recalculates totals for filtered items', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(StockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      const currentYear = new Date().getFullYear()
      wrapper.vm.startDateValue = new CalendarDate(currentYear, 6, 1)
      wrapper.vm.endDateValue = new CalendarDate(currentYear, 6, 30)
      await wrapper.vm.$nextTick()

      await wrapper.vm.loadStockReport()
      await flushPromises()

      const reportData = wrapper.vm.reportData
      expect(reportData).not.toBeNull()
      // Totals should be recalculated for filtered items (ITM001 and ITM002 only)
      expect(reportData?.totals.currentStock).toBe(300) // 100 + 200
      expect(reportData?.totals.totalValue).toBe(2500.0) // 500 + 2000

      wrapper.unmount()
    })
  })

  describe('Handlers', () => {
    it('handles corporation change and clears project selection', async () => {
      const { pinia, stores } = setupStores()

      const wrapper = mount(StockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      wrapper.vm.reportData = { items: [], totals: {} } as any
      await wrapper.vm.$nextTick()

      await wrapper.vm.handleCorporationChangeFromSelect({ value: 'corp-2' })
      await flushPromises()

      expect(stores.projects.fetchProjects).toHaveBeenCalledWith('corp-2')
      expect(wrapper.vm.selectedProjectId).toBeUndefined()
      expect(wrapper.vm.reportData).toBeNull()

      wrapper.unmount()
    })

    it('handles project change and clears report data', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(StockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      wrapper.vm.reportData = { items: [], totals: {} } as any
      await wrapper.vm.$nextTick()

      await wrapper.vm.handleProjectChange('proj-2')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.selectedProjectId).toBe('proj-2')
      expect(wrapper.vm.reportData).toBeNull()

      wrapper.unmount()
    })
  })

  describe('Watchers', () => {
    it('clears report data when corporation changes', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(StockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      wrapper.vm.reportData = { items: [], totals: {} } as any
      await wrapper.vm.$nextTick()

      wrapper.vm.selectedCorporationId = 'corp-2'
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.selectedProjectId).toBeUndefined()
      expect(wrapper.vm.reportData).toBeNull()

      wrapper.unmount()
    })

    it('clears report data when project changes', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(StockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      wrapper.vm.reportData = { items: [], totals: {} } as any
      await wrapper.vm.$nextTick()

      wrapper.vm.selectedProjectId = 'proj-2'
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.reportData).toBeNull()

      wrapper.unmount()
    })
  })

  describe('Totals Calculation', () => {
    it('calculates totals correctly for filtered items', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(StockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      const currentYear = new Date().getFullYear()
      wrapper.vm.startDateValue = new CalendarDate(currentYear, 6, 1)
      wrapper.vm.endDateValue = new CalendarDate(currentYear, 6, 30)
      await wrapper.vm.$nextTick()

      await wrapper.vm.loadStockReport()
      await flushPromises()

      const totals = wrapper.vm.totals
      expect(totals.currentStock).toBe(300) // 100 + 200
      expect(totals.totalValue).toBe(2500.0) // 500 + 2000
      expect(totals.reorderLevel).toBe(150) // 50 + 100
      expect(totals.inShipment).toBe(50) // 0 + 50
      expect(totals.returnedQty).toBe(10) // 0 + 10

      wrapper.unmount()
    })
  })

  describe('Error Handling', () => {
    it('handles errors gracefully when report generation fails', async () => {
      const { pinia } = setupStores()

      // Override mock to throw an error
      mockGenerateStockReport.mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        throw new Error('Failed to generate report')
      })

      const wrapper = mount(StockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await wrapper.vm.loadStockReport()
      await flushPromises()

      expect(wrapper.vm.reportData).toBeNull()

      wrapper.unmount()
    })
  })

  describe('Print Functionality', () => {
    it('calls window.print when print button is clicked', async () => {
      const { pinia } = setupStores()

      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})

      const wrapper = mount(StockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      setupDates(wrapper)
      await wrapper.vm.$nextTick()

      await wrapper.vm.loadStockReport()
      await flushPromises()

      await wrapper.vm.printReport()

      expect(printSpy).toHaveBeenCalled()

      printSpy.mockRestore()
      wrapper.unmount()
    })
  })
})

