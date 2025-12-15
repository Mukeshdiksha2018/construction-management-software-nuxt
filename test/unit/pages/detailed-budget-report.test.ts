import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DetailedBudgetReport from '@/pages/reports/detailed-budget-report.vue'
import { useCorporationStore } from '@/stores/corporations'
import { useProjectsStore } from '@/stores/projects'

// Mock composables
vi.mock('@/composables/useBudgetReport', () => ({
  useBudgetReport: () => ({
    loading: { value: false },
    error: { value: null },
    generateBudgetReport: vi.fn(() => Promise.resolve({
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
              totalAmount: 2500, // Purchase Order Amount + Change Order Amount (2000 + 500)
              costPerRoom: 250, // 2500 / 10 rooms
              paidAmount: 5000,
              budgetRemaining: -2500, // totalAmount - paidAmount (2500 - 5000)
              subCostCodes: []
            }
          ],
          totalBudgeted: 10000,
          totalPurchaseOrder: 2000,
          totalChangeOrder: 500,
          totalAmount: 2500, // Purchase Order Amount + Change Order Amount (2000 + 500)
          totalPaid: 5000,
          totalRemaining: -2500 // totalAmount - totalPaid (2500 - 5000)
        }
      ],
      summary: {
        totalBudgeted: 10000,
        totalPurchaseOrder: 2000,
        totalChangeOrder: 500,
        totalAmount: 2500, // Purchase Order Amount + Change Order Amount (2000 + 500)
        totalPaid: 5000,
        totalRemaining: -2500, // totalAmount - totalPaid (2500 - 5000)
        costPerRoom: 250 // 2500 / 10 rooms
      }
    }))
  })
}))

vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (val: number) => `$${val.toFixed(2)}`
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

describe('DetailedBudgetReport.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

    it('loads report when both corporation and project are selected', async () => {
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
      await wrapper.vm.loadBudgetReport()
      await flushPromises()

      expect(wrapper.vm.reportData).toBeDefined()
      expect(wrapper.vm.reportData?.project.projectName).toBe('Test Project')

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
})

