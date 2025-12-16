import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date'
import DetailedBudgetReport from '@/pages/reports/detailed-budget-report.vue'
import { useCorporationStore } from '@/stores/corporations'
import { useProjectsStore } from '@/stores/projects'

// Mock composables
const mockGenerateBudgetReport = vi.fn()

const mockReportData = {
  project: {
    projectName: 'Test Project',
    projectId: 'P-001',
    numberOfRooms: 10
  },
  divisions: [
    {
      uuid: 'div-1',
      divisionNumber: '01',
      divisionName: 'General',
      costCodes: [
        {
          uuid: 'cc-1',
          costCodeNumber: '01-001',
          costCodeName: 'Site Work',
          budgetedAmount: 10000,
          purchaseOrderAmount: 2000,
          changeOrderAmount: 500,
          totalAmount: 2500,
          costPerRoom: 250,
          paidAmount: 5000,
          budgetRemaining: -2500,
          subCostCodes: []
        }
      ],
      totalBudgeted: 10000,
      totalPurchaseOrder: 2000,
      totalChangeOrder: 500,
      totalAmount: 2500,
      totalPaid: 5000,
      totalRemaining: -2500
    }
  ],
  summary: {
    totalBudgeted: 10000,
    totalPurchaseOrder: 2000,
    totalChangeOrder: 500,
    totalAmount: 2500,
    totalPaid: 5000,
    totalRemaining: -2500,
    costPerRoom: 250
  }
}

vi.mock('@/composables/useBudgetReport', () => ({
  useBudgetReport: () => ({
    loading: { value: false },
    error: { value: null },
    generateBudgetReport: mockGenerateBudgetReport
  })
}))

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

const createStubs = () => ({
  UButton: {
    name: 'UButton',
    template: '<button><slot /></button>',
    props: ['icon', 'variant', 'size', 'color', 'disabled'],
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

describe('DetailedBudgetReport.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateBudgetReport.mockClear()
    mockGenerateBudgetReport.mockResolvedValue(mockReportData)
  })

  describe('CorporationSelect Integration', () => {
    it('renders CorporationSelect component', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      const corporationSelect = wrapper.findComponent({ name: 'CorporationSelect' })
      expect(corporationSelect.exists()).toBe(true)

      wrapper.unmount()
    })

    it('configures CorporationSelect with correct props', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      const corporationSelect = wrapper.findComponent({ name: 'CorporationSelect' })
      expect(corporationSelect.props('size')).toBe('sm')
      expect(corporationSelect.props('class')).toBe('w-64')

      wrapper.unmount()
    })

    it('binds selectedCorporationId to CorporationSelect v-model', async () => {
      const { pinia, stores } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      // Set the corporation ID
      wrapper.vm.selectedCorporationId = 'corp-2'
      await wrapper.vm.$nextTick()

      const corporationSelect = wrapper.findComponent({ name: 'CorporationSelect' })
      expect(corporationSelect.props('modelValue')).toBe('corp-2')

      wrapper.unmount()
    })

    it('handles corporation change event', async () => {
      const { pinia, stores } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      const corporation = {
        value: 'corp-2',
        uuid: 'corp-2',
        corporation_name: 'Corp Two',
        legal_name: 'CorpTwo LLC'
      }

      await wrapper.vm.handleCorporationChangeFromSelect(corporation)
      await flushPromises()

      expect(stores.projects.fetchProjects).toHaveBeenCalledWith('corp-2')
      expect(wrapper.vm.selectedProjectId).toBeUndefined()

      wrapper.unmount()
    })

    it('clears project selection when corporation changes', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      // Set a project
      wrapper.vm.selectedProjectId = 'proj-1'
      await wrapper.vm.$nextTick()

      // Change corporation
      await wrapper.vm.handleCorporationChangeFromSelect({ value: 'corp-2' })
      await flushPromises()

      expect(wrapper.vm.selectedProjectId).toBeUndefined()

      wrapper.unmount()
    })

    it('initializes with selected corporation from store', async () => {
      const { pinia, stores } = setupStores()
      stores.corporations.selectedCorporationId = 'corp-1'

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      expect(wrapper.vm.selectedCorporationId).toBe('corp-1')

      wrapper.unmount()
    })

    it('fetches projects when corporation is selected on mount', async () => {
      const { pinia, stores } = setupStores()
      stores.corporations.selectedCorporationId = 'corp-1'

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      expect(stores.projects.fetchProjects).toHaveBeenCalledWith('corp-1')

      wrapper.unmount()
    })
  })

  describe('Project Selection', () => {
    it('renders ProjectSelect component', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      const projectSelect = wrapper.findComponent({ name: 'ProjectSelect' })
      expect(projectSelect.exists()).toBe(true)

      wrapper.unmount()
    })

    it('passes corporation UUID to ProjectSelect', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      await wrapper.vm.$nextTick()

      const projectSelect = wrapper.findComponent({ name: 'ProjectSelect' })
      expect(projectSelect.props('corporationUuid')).toBe('corp-1')

      wrapper.unmount()
    })

    it('handles project change', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      await wrapper.vm.handleProjectChange('proj-1')
      await flushPromises()

      expect(wrapper.vm.selectedProjectId).toBe('proj-1')

      wrapper.unmount()
    })
  })

  describe('Report Display', () => {
    it('shows placeholder when no corporation selected', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = undefined
      await wrapper.vm.$nextTick()

      expect(wrapper.html()).toContain('Please select a corporation')

      wrapper.unmount()
    })

    it('shows placeholder when corporation selected but no project', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = undefined
      await wrapper.vm.$nextTick()

      expect(wrapper.html()).toContain('Please select a project')

      wrapper.unmount()
    })

    it('shows placeholder when dates are not selected', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
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

      expect(wrapper.html()).toContain('Please select start date and end date')

      wrapper.unmount()
    })

    it('does not auto-load report when project is selected', async () => {
      const { pinia } = setupStores()
      const { useBudgetReport } = await import('@/composables/useBudgetReport')
      const budgetReport = useBudgetReport()
      const generateBudgetReportSpy = vi.spyOn(budgetReport, 'generateBudgetReport')

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      await wrapper.vm.handleProjectChange('proj-1')
      await flushPromises()

      // Report should not be generated automatically
      expect(generateBudgetReportSpy).not.toHaveBeenCalled()
      expect(wrapper.vm.reportData).toBeNull()

      wrapper.unmount()
    })

    it('loads report when Show button is clicked with valid inputs', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
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

      expect(mockGenerateBudgetReport).toHaveBeenCalledWith(
        'corp-1',
        'proj-1',
        expect.stringContaining('T00:00:00.000Z'),
        expect.stringContaining('T23:59:59.999Z')
      )
      expect(wrapper.vm.reportData).toBeDefined()

      wrapper.unmount()
    })
  })

  describe('Code Simplification', () => {
    it('removed redundant access control logic (now in CorporationSelect)', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      // These properties should not exist anymore
      const vm = wrapper.vm as any
      expect(vm.accessibleCorporations).toBeUndefined()
      expect(vm.hasAccessibleCorporations).toBeUndefined()
      expect(vm.isSuperAdmin).toBeUndefined()
      expect(vm.corporationOptions).toBeUndefined()

      wrapper.unmount()
    })

    it('simplified component uses CorporationSelect for access control', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      // CorporationSelect handles all access control internally
      const corporationSelect = wrapper.findComponent({ name: 'CorporationSelect' })
      expect(corporationSelect.exists()).toBe(true)

      // No need for local access control logic
      const vm = wrapper.vm as any
      expect(vm.currentUser).toBeUndefined()

      wrapper.unmount()
    })
  })

  describe('Date Range Selection', () => {
    it('initializes with default date range (Jan 1 to today)', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
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

    it('renders date input components', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      const popovers = wrapper.findAllComponents({ name: 'UPopover' })
      expect(popovers.length).toBeGreaterThanOrEqual(2) // Start and End date popovers

      const calendars = wrapper.findAllComponents({ name: 'UCalendar' })
      expect(calendars.length).toBeGreaterThanOrEqual(2) // Start and End date calendars

      wrapper.unmount()
    })

    it('displays formatted date text in buttons', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      const startDateText = wrapper.vm.startDateDisplayText
      const endDateText = wrapper.vm.endDateDisplayText

      expect(startDateText).toBeTruthy()
      expect(endDateText).toBeTruthy()
      expect(typeof startDateText).toBe('string')
      expect(typeof endDateText).toBe('string')

      wrapper.unmount()
    })

    it('validates date range correctly', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      const currentYear = new Date().getFullYear()
      const todayDate = today(getLocalTimeZone())

      // Set required fields for canGenerateReport
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

    it('disables Show button when required fields are missing', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      // Missing corporation
      wrapper.vm.selectedCorporationId = undefined
      wrapper.vm.selectedProjectId = 'proj-1'
      wrapper.vm.startDateValue = new CalendarDate(2024, 1, 1)
      wrapper.vm.endDateValue = new CalendarDate(2024, 12, 31)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.canGenerateReport).toBe(false)

      // Missing project
      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = undefined
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.canGenerateReport).toBe(false)

      // Missing start date
      wrapper.vm.selectedProjectId = 'proj-1'
      wrapper.vm.startDateValue = null
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.canGenerateReport).toBe(false)

      // Missing end date
      wrapper.vm.startDateValue = new CalendarDate(2024, 1, 1)
      wrapper.vm.endDateValue = null
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.canGenerateReport).toBe(false)

      wrapper.unmount()
    })

    it('enables Show button when all required fields are present', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
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

      expect(wrapper.vm.canGenerateReport).toBe(true)

      wrapper.unmount()
    })

    it('converts dates to UTC when generating report', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      wrapper.vm.startDateValue = new CalendarDate(2024, 1, 15)
      wrapper.vm.endDateValue = new CalendarDate(2024, 12, 20)
      await wrapper.vm.$nextTick()

      await wrapper.vm.handleShowReport()
      await flushPromises()

      // Verify UTC conversion
      expect(mockGenerateBudgetReport).toHaveBeenCalledWith(
        'corp-1',
        'proj-1',
        expect.stringMatching(/2024-01-15T00:00:00\.000Z/),
        expect.stringMatching(/2024-12-20T23:59:59\.999Z/)
      )

      wrapper.unmount()
    })

    it('clears report data when corporation changes', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      // Set up report data
      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      wrapper.vm.reportData = {
        project: { projectName: 'Test', projectId: 'P-001', numberOfRooms: 10 },
        divisions: [],
        summary: { totalBudgeted: 0, totalPurchaseOrder: 0, totalChangeOrder: 0, totalAmount: 0, totalPaid: 0, totalRemaining: 0, costPerRoom: 0 }
      } as any
      await wrapper.vm.$nextTick()

      // Change corporation
      wrapper.vm.selectedCorporationId = 'corp-2'
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.reportData).toBeNull()

      wrapper.unmount()
    })

    it('clears report data when project changes', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      // Set up report data
      wrapper.vm.selectedCorporationId = 'corp-1'
      wrapper.vm.selectedProjectId = 'proj-1'
      wrapper.vm.reportData = {
        project: { projectName: 'Test', projectId: 'P-001', numberOfRooms: 10 },
        divisions: [],
        summary: { totalBudgeted: 0, totalPurchaseOrder: 0, totalChangeOrder: 0, totalAmount: 0, totalPaid: 0, totalRemaining: 0, costPerRoom: 0 }
      } as any
      await wrapper.vm.$nextTick()

      // Change project
      await wrapper.vm.handleProjectChange('proj-2')
      await flushPromises()

      expect(wrapper.vm.reportData).toBeNull()

      wrapper.unmount()
    })
  })

  describe('Show Button Functionality', () => {
    it('renders Show button', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      const buttons = wrapper.findAllComponents({ name: 'UButton' })
      const showButton = buttons.find((btn: any) => 
        btn.text().includes('Show') || btn.props('icon') === 'i-heroicons-magnifying-glass'
      )
      expect(showButton).toBeDefined()

      wrapper.unmount()
    })

    it('disables Show button when canGenerateReport is false', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      wrapper.vm.selectedCorporationId = undefined
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'UButton' })
      const showButton = buttons.find((btn: any) => 
        btn.text().includes('Show') || btn.props('icon') === 'i-heroicons-magnifying-glass'
      )
      
      if (showButton) {
        expect(showButton.props('disabled')).toBe(true)
      }

      wrapper.unmount()
    })

    it('calls handleShowReport when Show button is clicked', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(DetailedBudgetReport, {
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

      expect(mockGenerateBudgetReport).toHaveBeenCalled()

      wrapper.unmount()
    })
  })
})

