import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date'
import POWiseStockReport from '@/pages/reports/po-wise-stock-report.vue'
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
const mockGeneratePOWiseStockReport = vi.fn()

vi.mock('@/composables/usePOWiseStockReport', () => {
  const { ref, computed } = require('vue')
  return {
    usePOWiseStockReport: () => {
      const loading = ref(false)
      const error = ref(null)
      
      return {
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        generatePOWiseStockReport: mockGeneratePOWiseStockReport
      }
    }
  }
})

// Mock $fetch
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Mock window.print
global.window.print = vi.fn()

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
  VendorSelect: {
    name: 'VendorSelect',
    template: '<div class="vendor-select" />',
    props: ['modelValue', 'corporationUuid', 'placeholder', 'size', 'class'],
    emits: ['update:modelValue'],
  },
})

// Helper to set up dates for tests
const setupDates = (wrapper: any) => {
  const currentYear = new Date().getFullYear()
  const todayDate = today(getLocalTimeZone())
  wrapper.vm.startDateValue = new CalendarDate(currentYear, 1, 1)
  wrapper.vm.endDateValue = todayDate
}

describe('POWiseStockReport.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
    mockGeneratePOWiseStockReport.mockImplementation(async (corpUuid: string, projUuid: string) => {
      await new Promise(resolve => setTimeout(resolve, 10))
      if (!corpUuid || !projUuid) {
        return null
      }
      // Use current year from today
      const todayDate = today(getLocalTimeZone())
      const currentYear = todayDate.year
      return {
        data: [
          {
            uuid: "po-1",
            po_number: "PO-001",
            po_date: `${currentYear}-06-15T00:00:00.000Z`,
            vendor_uuid: "vendor-1",
            vendor_name: "Test Vendor",
            items: [
              {
                itemCode: "ITM001",
                itemName: "Cement (50kg)",
                description: "Portland Cement",
                vendorSource: "Test Vendor",
                costCode: "03 31 13 Heavyweight Structural Con",
                poNumber: "PO-001",
                poDate: `${currentYear}-06-15T00:00:00.000Z`,
                orderedQuantity: 300,
                receivedQuantity: 300,
                returnedQuantity: 0,
                invoiceNumber: "154",
                invoiceDate: `${currentYear}-06-20T00:00:00.000Z`,
                status: "Received",
                unitCost: 5.0,
                uom: "Bag",
                totalValue: 1500.0,
              },
            ],
            totals: {
              orderedQuantity: 300,
              receivedQuantity: 300,
              returnedQuantity: 0,
              totalValue: 1500.0,
            },
          },
          {
            uuid: "po-2",
            po_number: "PO-002",
            po_date: `${currentYear}-07-20T00:00:00.000Z`,
            vendor_uuid: "vendor-2",
            vendor_name: "Another Vendor",
            items: [
              {
                itemCode: "ITM002",
                itemName: "Steel Rebar",
                description: "Grade 60 Rebar",
                vendorSource: "Another Vendor",
                costCode: "03 20 00",
                poNumber: "PO-002",
                poDate: `${currentYear}-07-20T00:00:00.000Z`,
                orderedQuantity: 200,
                receivedQuantity: 200,
                returnedQuantity: 0,
                invoiceNumber: "155",
                invoiceDate: `${currentYear}-07-25T00:00:00.000Z`,
                status: "Received",
                unitCost: 10.0,
                uom: "Ton",
                totalValue: 2000.0,
              },
            ],
            totals: {
              orderedQuantity: 200,
              receivedQuantity: 200,
              returnedQuantity: 0,
              totalValue: 2000.0,
            },
          },
        ],
        totals: {
          orderedQuantity: 500,
          receivedQuantity: 500,
          returnedQuantity: 0,
          totalValue: 3500.0,
        },
      }
    })
  })

  describe('Component Rendering', () => {
    it('renders the component with all required elements', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      expect(wrapper.find('h1').text()).toContain('PO Wise Stock Report')
      expect(wrapper.findComponent({ name: 'CorporationSelect' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'ProjectSelect' }).exists()).toBe(true)

      wrapper.unmount()
    })

    it('shows placeholder when no corporation is selected', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).selectedCorporationId = undefined;
      await wrapper.vm.$nextTick()

      expect(wrapper.html()).toContain('Please select a corporation')
      const icon = wrapper.findComponent({ name: 'UIcon' })
      expect(icon.exists()).toBe(true)

      wrapper.unmount()
    })

    it('shows placeholder when corporation selected but no project', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = undefined;
      await wrapper.vm.$nextTick()

      expect(wrapper.html()).toContain('Please select a project')
      const icons = wrapper.findAllComponents({ name: 'UIcon' })
      expect(icons.length).toBeGreaterThan(0)

      wrapper.unmount()
    })

    it('shows placeholder when dates are not selected', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      (wrapper.vm as any).startDateValue = null;
      (wrapper.vm as any).endDateValue = null;
      await wrapper.vm.$nextTick()

      expect(wrapper.html()).toContain('Please select start date and end date')
      const icons = wrapper.findAllComponents({ name: 'UIcon' })
      expect(icons.length).toBeGreaterThan(0)

      wrapper.unmount()
    })
  })

  describe('Report Loading', () => {
    it('does not automatically load report when project is selected', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      setupDates(wrapper);
      await wrapper.vm.$nextTick()

      // Report should not be loaded automatically
      expect((wrapper.vm as any).reportData).toBeNull();
      expect(mockGeneratePOWiseStockReport).not.toHaveBeenCalled();

      wrapper.unmount()
    })

    it('loads report when Show button is clicked with valid inputs', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      setupDates(wrapper);
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).handleShowReport();
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(mockGeneratePOWiseStockReport).toHaveBeenCalledWith('corp-1', 'proj-1');
      expect((wrapper.vm as any).reportData).toBeDefined();
      expect((wrapper.vm as any).reportData?.data).toBeDefined();
      expect((wrapper.vm as any).reportData?.data.length).toBeGreaterThan(0);

      wrapper.unmount()
    })

    it('does not load report when dates are missing', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      (wrapper.vm as any).startDateValue = null;
      (wrapper.vm as any).endDateValue = null;
      await(wrapper.vm as any).loadPOWiseStockReport();
      await flushPromises()

      expect((wrapper.vm as any).reportData).toBeNull();
      expect(mockGeneratePOWiseStockReport).not.toHaveBeenCalled();

      wrapper.unmount()
    })

    it('shows report data grouped by purchase orders', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      setupDates(wrapper);
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).handleShowReport();
      await flushPromises()
      await wrapper.vm.$nextTick()

      const reportData = (wrapper.vm as any).reportData;
      expect(reportData).toBeDefined()
      expect(reportData?.data).toBeDefined()
      if (reportData?.data && reportData.data.length > 0) {
        expect(reportData.data[0]).toHaveProperty('uuid')
        expect(reportData.data[0]).toHaveProperty('po_number')
        expect(reportData.data[0]).toHaveProperty('items')
        expect(reportData.data[0]).toHaveProperty('totals')
      }

      wrapper.unmount()
    })
  })

  describe('Corporation Selection', () => {
    it('handles corporation change event', async () => {
      const { pinia, stores } = setupStores()

      const wrapper = mount(POWiseStockReport, {
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

      await(wrapper.vm as any).handleCorporationChangeFromSelect(corporation);
      await flushPromises()

      expect(stores.projects.fetchProjects).toHaveBeenCalledWith('corp-2')
      expect((wrapper.vm as any).selectedProjectId).toBeUndefined();
      expect((wrapper.vm as any).reportData).toBeNull();

      wrapper.unmount()
    })

    it('clears project, vendor selection and report data when corporation changes', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).selectedProjectId = "proj-1";
      (wrapper.vm as any).selectedVendorId = "vendor-1";
      (wrapper.vm as any).reportData = {
        data: [],
        totals: {
          orderedQuantity: 0,
          receivedQuantity: 0,
          returnedQuantity: 0,
          totalValue: 0,
        },
      } as any;
      await wrapper.vm.$nextTick()

      await(wrapper.vm as any).handleCorporationChangeFromSelect({
        value: "corp-2",
      });
      await flushPromises()

      expect((wrapper.vm as any).selectedProjectId).toBeUndefined();
      expect((wrapper.vm as any).selectedVendorId).toBeUndefined();
      expect((wrapper.vm as any).reportData).toBeNull();

      wrapper.unmount()
    })
  })

  describe('Project Selection', () => {
    it('handles project change and clears report data', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).reportData = { data: [], totals: {} } as any;
      await(wrapper.vm as any).handleProjectChange("proj-1");
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect((wrapper.vm as any).selectedProjectId).toBe("proj-1");
      expect((wrapper.vm as any).reportData).toBeNull();

      wrapper.unmount()
    })
  })

  describe('Date Range Filtering', () => {
    it('filters POs by po_date when date range is provided', async () => {
      const { pinia } = setupStores()
      const currentYear = today(getLocalTimeZone()).year

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      // Set date range to include only June (PO-001)
      (wrapper.vm as any).startDateValue = new CalendarDate(currentYear, 6, 1);
      (wrapper.vm as any).endDateValue = new CalendarDate(currentYear, 6, 30);
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).handleShowReport();
      await flushPromises()
      await wrapper.vm.$nextTick()

      const reportData = (wrapper.vm as any).reportData;
      expect(reportData).not.toBeNull();
      // Should only include PO-001 from June, not PO-002 from July
      expect(reportData?.data.length).toBe(1);
      expect(reportData?.data[0].po_number).toBe('PO-001');

      wrapper.unmount()
    })

    it('filters POs by vendor when vendor is selected', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      (wrapper.vm as any).selectedVendorId = "vendor-1";
      setupDates(wrapper);
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).handleShowReport();
      await flushPromises()
      await wrapper.vm.$nextTick()

      const reportData = (wrapper.vm as any).reportData;
      expect(reportData).not.toBeNull();
      // Should only include PO-001 from vendor-1
      expect(reportData?.data.length).toBe(1);
      expect(reportData?.data[0].vendor_uuid).toBe('vendor-1');

      wrapper.unmount()
    })

    it('recalculates totals for filtered POs', async () => {
      const { pinia } = setupStores()
      const currentYear = today(getLocalTimeZone()).year

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      // Set date range to include only June (PO-001)
      (wrapper.vm as any).startDateValue = new CalendarDate(currentYear, 6, 1);
      (wrapper.vm as any).endDateValue = new CalendarDate(currentYear, 6, 30);
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).handleShowReport();
      await flushPromises()
      await wrapper.vm.$nextTick()

      const totals = (wrapper.vm as any).totals;
      // Totals should be recalculated for filtered PO (PO-001 only)
      expect(totals.orderedQuantity).toBe(300);
      expect(totals.totalValue).toBe(1500.0);

      wrapper.unmount()
    })
  })

  describe('Number and Date Formatting', () => {
    it('formats numbers correctly', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      expect((wrapper.vm as any).formatNumber(1234.56)).toBe("1,234.56");
      expect((wrapper.vm as any).formatNumber(0)).toBe("0");
      expect((wrapper.vm as any).formatNumber(null)).toBe("0");
      expect((wrapper.vm as any).formatNumber(undefined)).toBe("0");

      wrapper.unmount()
    })

    it('formats dates correctly', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      const dateStr = '2024-01-15T00:00:00Z'
      const formatted = (wrapper.vm as any).formatDate(dateStr);
      expect(formatted).toMatch(/\d{2}-\d{2}-\d{4}/)
      
      expect((wrapper.vm as any).formatDate(null)).toBe("-");
      expect((wrapper.vm as any).formatDate(undefined)).toBe("-");
      expect((wrapper.vm as any).formatDate("NA")).toBe("-");

      wrapper.unmount()
    })
  })

  describe('Totals Calculation', () => {
    it('calculates totals correctly from report data', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).reportData = {
        data: [
          {
            uuid: "po-1",
            items: [],
            totals: {
              orderedQuantity: 100,
              receivedQuantity: 100,
              returnedQuantity: 0,
              totalValue: 500.0,
            },
          },
          {
            uuid: "po-2",
            items: [],
            totals: {
              orderedQuantity: 200,
              receivedQuantity: 200,
              returnedQuantity: 0,
              totalValue: 1000.0,
            },
          },
        ],
        totals: {
          orderedQuantity: 300,
          receivedQuantity: 300,
          returnedQuantity: 0,
          totalValue: 1500.0,
        },
      } as any;

      await wrapper.vm.$nextTick()

      const totals = (wrapper.vm as any).totals;
      expect(totals.orderedQuantity).toBe(300)
      expect(totals.receivedQuantity).toBe(300)
      expect(totals.returnedQuantity).toBe(0);
      expect(totals.totalValue).toBe(1500.00)

      wrapper.unmount()
    })

    it('returns zero totals when report data is null', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).reportData = null;
      await wrapper.vm.$nextTick()

      const totals = (wrapper.vm as any).totals;
      expect(totals.orderedQuantity).toBe(0)
      expect(totals.receivedQuantity).toBe(0)
      expect(totals.returnedQuantity).toBe(0);
      expect(totals.totalValue).toBe(0)

      wrapper.unmount()
    })
  })

  describe('Print Functionality', () => {
    it('shows print button when report data is available', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      setupDates(wrapper);
      await wrapper.vm.$nextTick()

      await (wrapper.vm as any).handleShowReport();
      await flushPromises()
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'UButton' })
      const printButton = buttons.find((btn: any) => 
        btn.props('icon') === 'i-heroicons-printer'
      )
      expect(printButton).toBeDefined()

      wrapper.unmount()
    })

    it('calls window.print when print button is clicked', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).printReport();

      expect(global.window.print).toHaveBeenCalled()

      wrapper.unmount()
    })
  })

  describe('Error Handling', () => {
    it('handles errors gracefully', async () => {
      const { pinia } = setupStores()

      // Override mock to throw an error
      mockGeneratePOWiseStockReport.mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        throw new Error('Failed to generate report')
      })

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      setupDates(wrapper);
      await wrapper.vm.$nextTick()
      
      await (wrapper.vm as any).handleShowReport();
      await flushPromises()

      // Component should handle error state
      expect((wrapper.vm as any).reportData).toBeNull();

      wrapper.unmount()
    })
  })

  describe('Initialization', () => {
    it('initializes with selected corporation from store', async () => {
      const { pinia, stores } = setupStores()
      stores.corporations.selectedCorporationId = 'corp-1'

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises()

      expect((wrapper.vm as any).selectedCorporationId).toBe("corp-1");
      expect(stores.projects.fetchProjects).toHaveBeenCalledWith('corp-1')

      wrapper.unmount()
    })
  })
})

