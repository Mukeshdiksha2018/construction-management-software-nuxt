import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ProjectDetailsForm from '@/components/Projects/ProjectDetailsForm.vue'

// Mock stores
const mockCorporationStore = {
  selectedCorporation: { uuid: 'corp-1', corporation_name: 'Test Corp' }
}

const mockProjectAddressesStore = {
  getAddresses: vi.fn(() => []),
  fetchAddresses: vi.fn()
}

const mockProjectsStore = {
  currentProject: null,
  updateProject: vi.fn(),
  fetchProjectsMetadata: vi.fn().mockResolvedValue(undefined),
  projectsMetadata: []
}

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockCorporationStore
}))

vi.mock('@/stores/projectTypes', () => ({
  useProjectTypesStore: () => ({})
}))

vi.mock('@/stores/serviceTypes', () => ({
  useServiceTypesStore: () => ({})
}))

vi.mock('@/stores/projectAddresses', () => ({
  useProjectAddressesStore: () => mockProjectAddressesStore
}))

vi.mock('@/stores/projects', () => ({
  useProjectsStore: () => mockProjectsStore
}))

vi.mock('@/composables/useUTCDateFormat', () => ({
  useUTCDateFormat: () => ({
    toUTCString: (date: string) => date ? `${date}T00:00:00.000Z` : null,
    fromUTCString: (utc: string) => utc ? utc.split('T')[0] : ''
  })
}))

vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (val: number) => `$${val?.toFixed(2) || '0.00'}`
  })
}))

vi.mock('@/composables/useAuditLog', () => ({
  useAuditLog: () => ({
    showAuditLogModal: { value: false },
    generateAuditLogInfo: vi.fn(),
    showAuditLog: vi.fn(),
    onAuditLogsLoaded: vi.fn(),
    onAuditLogError: vi.fn(),
    onExportAuditLogs: vi.fn()
  })
}))

// UI Component stubs
const uiStubs = {
  UCard: { template: '<div class="u-card"><slot /></div>' },
  UInput: { 
    props: ['modelValue', 'placeholder', 'size', 'disabled', 'icon'],
    template: '<input :value="modelValue" />' 
  },
  USelectMenu: { 
    props: ['modelValue', 'items', 'valueKey'],
    template: '<select />' 
  },
  UButton: { 
    props: ['icon', 'color', 'variant', 'size', 'disabled', 'loading'],
    template: '<button><slot /></button>' 
  },
  UPopover: { 
    template: '<div><slot /><slot name="content" /></div>' 
  },
  UCalendar: { 
    props: ['modelValue'],
    template: '<div />' 
  },
  UCheckbox: { 
    props: ['modelValue', 'label'],
    template: '<input type="checkbox" />' 
  },
  UIcon: { template: '<span />', props: ['name'] },
  UBadge: { template: '<span><slot /></span>', props: ['color', 'variant', 'size'] },
  UFileUpload: {
    props: ['modelValue', 'accept', 'multiple'],
    template: '<div><slot :open="() => {}" :removeFile="() => {}" /></div>'
  },
  USkeleton: { template: '<div class="skeleton" data-testid="skeleton" />' },
  UModal: {
    props: ['open'],
    template: '<div v-if="open"><slot name="header" /><slot name="body" /><slot name="footer" /></div>'
  },
  AuditLogModal: { template: '<div />' },
  FilePreview: { template: '<div />' },
  ProjectTypeSelect: { template: '<div />' },
  ServiceTypeSelect: { template: '<div />' },
  CorporationSelect: { template: '<div />' },
  UserSelect: { template: '<div />' }
}

describe('ProjectDetailsForm - Loading Skeletons', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
  })

  const baseForm = {
    project_name: '',
    project_id: '',
    project_type_uuid: '',
    service_type_uuid: '',
    project_status: 'Pending',
    estimated_amount: 0,
    area_sq_ft: null,
    no_of_rooms: null,
    contingency_percentage: 0,
    project_start_date: '',
    project_estimated_completion_date: '',
    only_total: false,
    enable_labor: false,
    enable_material: false,
    attachments: [],
    tempAddresses: []
  }

  const mountForm = (props: any = {}) => {
    return mount(ProjectDetailsForm, {
      props: {
        form: baseForm,
        editingProject: false,
        loading: false,
        ...props
      },
      global: {
        stubs: uiStubs
      }
    })
  }

  describe('Loading state - Skeletons displayed', () => {
    it('should show skeletons for all form fields when loading is true', () => {
      const wrapper = mountForm({ loading: true })
      
      // Check for skeleton elements
      const skeletons = wrapper.findAll('[data-testid="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
      
      // Verify skeletons are shown instead of form fields
      expect(wrapper.find('.u-card').exists()).toBe(true)
      // Form inputs should not be visible when loading
      const inputs = wrapper.findAll('input')
      expect(inputs.length).toBe(0) // No actual inputs, only skeletons
    })

    it('should show skeletons for Project Options section when loading', () => {
      const wrapper = mountForm({ loading: true })
      
      // Should have skeleton in the Project Options card
      const skeletons = wrapper.findAll('[data-testid="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should show skeletons for Address Management section when loading', () => {
      const wrapper = mountForm({ loading: true })
      
      const skeletons = wrapper.findAll('[data-testid="skeleton"]')
      // Should have skeletons for address section
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should show skeletons for File Upload section when loading', () => {
      const wrapper = mountForm({ loading: true })
      
      const skeletons = wrapper.findAll('[data-testid="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Loading state - Form fields displayed', () => {
    it('should show actual form fields when loading is false', () => {
      const wrapper = mountForm({ loading: false })
      
      // Should not show skeletons
      const skeletons = wrapper.findAll('[data-testid="skeleton"]')
      expect(skeletons.length).toBe(0)
      
      // Should show the form structure
      expect(wrapper.find('.u-card').exists()).toBe(true)
    })

    it('should show form fields with data when loading is false and form has data', () => {
      const formWithData = {
        ...baseForm,
        project_name: 'Test Project',
        project_id: 'PRO-123456',
        project_type_uuid: 'type-1',
        service_type_uuid: 'service-1'
      }
      
      const wrapper = mountForm({ 
        loading: false,
        form: formWithData
      })
      
      const skeletons = wrapper.findAll('[data-testid="skeleton"]')
      expect(skeletons.length).toBe(0)
    })
  })

  describe('Loading prop default value', () => {
    it('should default loading to false when not provided', () => {
      const wrapper = mountForm()
      
      // Should not show skeletons by default
      const skeletons = wrapper.findAll('[data-testid="skeleton"]')
      expect(skeletons.length).toBe(0)
    })
  })

  describe('Estimate status with loading', () => {
    it('should handle latestEstimate prop correctly when loading is false', () => {
      const wrapper = mountForm({
        loading: false,
        latestEstimate: {
          status: 'Approved',
          final_amount: 15000
        }
      })
      
      // @ts-expect-error accessing setup state for test
      const metadata = wrapper.vm.estimateStatusMetadata
      expect(metadata).toBeDefined()
      expect(metadata.hasEstimate).toBe(true)
      expect(metadata.amount).toContain('15000')
    })

    it('should not break when latestEstimate is null and loading is true', () => {
      const wrapper = mountForm({
        loading: true,
        latestEstimate: null
      })
      
      // Should still render skeletons without errors
      const skeletons = wrapper.findAll('[data-testid="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Address Grouping Display', () => {
    it('should show address sections when addresses exist', () => {
      const formWithAddresses = {
        ...baseForm,
        tempAddresses: [
          { tempId: 'temp-1', address_type: 'shipment', address_line_1: '123 Ship St', city: 'City', state: 'State' },
          { tempId: 'temp-2', address_type: 'bill', address_line_1: '456 Bill Ave', city: 'City', state: 'State' },
          { tempId: 'temp-3', address_type: 'final-destination', address_line_1: '789 Final Rd', city: 'City', state: 'State' },
        ]
      }
      
      const wrapper = mountForm({
        loading: false,
        form: formWithAddresses
      })
      
      // Should render without errors
      expect(wrapper.find('.u-card').exists()).toBe(true)
    })

    it('should handle empty address groups gracefully', () => {
      const formWithNoAddresses = {
        ...baseForm,
        tempAddresses: []
      }
      
      const wrapper = mountForm({
        loading: false,
        form: formWithNoAddresses
      })
      
      // Should render without errors
      expect(wrapper.find('.u-card').exists()).toBe(true)
    })
  })
})

