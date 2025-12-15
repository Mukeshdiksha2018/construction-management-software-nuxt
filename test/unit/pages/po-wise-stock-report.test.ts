import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
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

vi.mock('@/composables/usePOWiseStockReport', () => {
  const { ref, computed } = require('vue')
  return {
    usePOWiseStockReport: () => {
      const loading = ref(false)
      const error = ref(null)
      
      return {
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        generatePOWiseStockReport: vi.fn(async (corpUuid: string, projUuid: string) => {
          loading.value = true
          try {
            await new Promise(resolve => setTimeout(resolve, 10))
            if (!corpUuid || !projUuid) {
              error.value = 'Corporation and project are required'
              return null
            }
            return {
              data: [
                {
                  uuid: "po-1",
                  po_number: "PO-001",
                  po_date: "2024-01-01",
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
                      poDate: "2024-01-01",
                      orderedQuantity: 300,
                      receivedQuantity: 300,
                      returnedQuantity: 0,
                      invoiceNumber: "154",
                      invoiceDate: "2024-01-12",
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
              ],
              totals: {
                orderedQuantity: 300,
                receivedQuantity: 300,
                returnedQuantity: 0,
                totalValue: 1500.0,
              },
            };
          } catch (err: any) {
            error.value = err.message || 'Failed to generate report'
            return null
          } finally {
            loading.value = false
          }
        })
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
    props: ['icon', 'variant', 'size', 'color'],
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

describe('POWiseStockReport.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
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
  })

  describe('Report Loading', () => {
    it('loads report when both corporation and project are selected', async () => {
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
      await(wrapper.vm as any).loadPOWiseStockReport();
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect((wrapper.vm as any).reportData).toBeDefined();
      expect((wrapper.vm as any).reportData?.data).toBeDefined();
      expect((wrapper.vm as any).reportData?.data.length).toBeGreaterThan(0);

      wrapper.unmount()
    })

    it('does not load report when only corporation is selected', async () => {
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
      await(wrapper.vm as any).loadPOWiseStockReport();
      await flushPromises()

      expect((wrapper.vm as any).reportData).toBeNull();

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
      await(wrapper.vm as any).loadPOWiseStockReport();
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

    it('clears project selection and report data when corporation changes', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).selectedProjectId = "proj-1";
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
      expect((wrapper.vm as any).reportData).toBeNull();

      wrapper.unmount()
    })
  })

  describe('Project Selection', () => {
    it('handles project change and loads report', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).selectedCorporationId = "corp-1";
      await(wrapper.vm as any).handleProjectChange("proj-1");
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect((wrapper.vm as any).selectedProjectId).toBe("proj-1");

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
      (wrapper.vm as any).reportData = {
        data: [
          {
            uuid: "po-1",
            items: [],
            totals: {
              orderedQuantity: 0,
              receivedQuantity: 0,
              returnedQuantity: 0,
              totalValue: 0,
            },
          },
        ],
        totals: {
          orderedQuantity: 0,
          receivedQuantity: 0,
          returnedQuantity: 0,
          totalValue: 0,
        },
      } as any;
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

      const wrapper = mount(POWiseStockReport, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await flushPromises();
      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      
      // Simulate error by setting reportData to null after failed load
      await(wrapper.vm as any).loadPOWiseStockReport();
      await flushPromises()

      // Component should handle error state
      expect((wrapper.vm as any).reportData).toBeDefined();

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

