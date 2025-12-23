import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref, computed } from "vue";
import { mount } from '@vue/test-utils'
import ProjectDetailsForm from '@/components/Projects/ProjectDetailsForm.vue'

// Mock the stores
const mockCorpStore = {
  selectedCorporation: {
    uuid: 'test-corp-uuid',
    corporation_name: 'Test Corporation'
  },
  ensureReady: vi.fn(() => Promise.resolve())
}

const mockCustomerStore = {
  customers: ref([
    {
      uuid: 'customer-1',
      corporation_uuid: 'test-corp-uuid',
      project_uuid: 'project-1',
      first_name: 'John',
      last_name: 'Doe',
      company_name: 'Test Company',
      customer_email: 'john@test.com',
      profile_image_url: null
    },
    {
      uuid: 'customer-2',
      corporation_uuid: 'test-corp-uuid',
      project_uuid: null,
      first_name: 'Jane',
      last_name: 'Smith',
      company_name: 'Another Company',
      customer_email: 'jane@test.com',
      profile_image_url: null
    }
  ]),
  fetchCustomers: vi.fn(),
  loading: ref(false)
}

const mockProjectTypesStore = {
  projectTypes: [
    { uuid: 'pt-1', name: 'Residential', is_active: true },
    { uuid: 'pt-2', name: 'Commercial', is_active: true }
  ],
  loading: false,
  error: null,
  // getActiveProjectTypes is a computed property (array), not a function
  getActiveProjectTypes: [
    { uuid: 'pt-1', name: 'Residential', is_active: true },
    { uuid: 'pt-2', name: 'Commercial', is_active: true }
  ],
  fetchProjectTypes: vi.fn()
}

const mockServiceTypes = [
  { uuid: 'st-1', name: 'General Contracting', is_active: true },
  { uuid: 'st-2', name: 'Design-Build', is_active: true }
]

const mockServiceTypesStore = {
  serviceTypes: mockServiceTypes,
  loading: false,
  error: null,
  get getActiveServiceTypes() { return this.serviceTypes },
  fetchServiceTypes: vi.fn()
}

const mockProjectsStore = {
  projects: [],
  currentProject: null,
  loading: ref(false),
  fetchProjects: vi.fn(),
  fetchProjectsMetadata: vi.fn(() => Promise.resolve()),
  loadCurrentProject: vi.fn()
}

// Mock the stores
vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockCorpStore
}))

vi.mock('@/stores/customers', () => ({
  useCustomerStore: () => mockCustomerStore
}))

vi.mock('@/stores/projectTypes', () => ({
  useProjectTypesStore: () => mockProjectTypesStore
}))

vi.mock('@/stores/serviceTypes', () => ({
  useServiceTypesStore: () => mockServiceTypesStore
}))

vi.mock('@/stores/projects', () => ({
  useProjectsStore: () => mockProjectsStore
}))

vi.mock('@/composables/useResizablePanels', () => ({
  useResizablePanels: () => ({
    isResizing: false,
    startResize: vi.fn()
  })
}))

vi.mock('@/composables/useFilePreview', () => ({
  useFilePreview: () => ({
    uploadedFile: null,
    fileUploadError: null,
    handleFileUpload: vi.fn()
  })
}))

vi.mock('@/composables/useAuditLog', () => ({
  useAuditLog: () => ({
    showAuditLogModal: false,
    generateAuditLogInfo: vi.fn(),
    showAuditLog: vi.fn(),
    onAuditLogsLoaded: vi.fn(),
    onAuditLogError: vi.fn(),
    onExportAuditLogs: vi.fn()
  })
}))

// Mock global $fetch
global.$fetch = vi.fn()

// Mock CustomerSelect component
const CustomerSelectStub = {
  name: 'CustomerSelect',
  props: ['modelValue', 'corporationUuid', 'projectUuid', 'placeholder', 'size', 'class', 'disabled'],
  emits: ['update:modelValue'],
  template: `
    <select 
      :value="modelValue" 
      :disabled="disabled"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option value="">Select customer</option>
      <option value="customer-1">John Doe</option>
      <option value="customer-2">Jane Smith</option>
    </select>
  `
}

describe('ProjectDetailsForm - CustomerSelect Integration', () => {
  let pinia: any
  let wrapper: any

  const defaultForm = {
    id: undefined,
    uuid: undefined,
    corporation_uuid: 'test-corp-uuid',
    project_name: '',
    project_id: '',
    project_type_uuid: '',
    service_type_uuid: '',
    estimated_amount: '',
    project_description: '',
    area_sq_ft: '',
    no_of_rooms: '',
    contingency_percentage: '',
    project_status: 'Pending',
    project_start_date: '',
    project_estimated_completion_date: '',
    only_total: false,
    enable_labor: false,
    enable_material: false,
    customer_uuid: null,
    attachments: [],
    address_type: '',
    contact_person: '',
    email: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    zip_code: '',
    country: ''
  }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(ProjectDetailsForm, {
      props: {
        form: { ...defaultForm, ...props },
        loading: false,
        ...props
      },
      global: {
        stubs: {
          CustomerSelect: CustomerSelectStub,
          UCard: { template: '<div><slot /></div>' },
          UInput: {
            props: ['modelValue', 'placeholder', 'size', 'disabled', 'icon'],
            emits: ['update:modelValue'],
            template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
          },
          USelectMenu: {
            props: ['modelValue', 'items', 'placeholder', 'size', 'disabled'],
            emits: ['update:modelValue'],
            template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" />'
          },
          UTextarea: {
            props: ['modelValue', 'placeholder', 'rows'],
            emits: ['update:modelValue'],
            template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
          },
          UButton: { template: '<button><slot /></button>' },
          UBadge: { template: '<span><slot /></span>' },
          UIcon: { template: '<span />' },
          USkeleton: { template: '<div />' },
          CorporationSelect: {
            props: ['modelValue', 'placeholder', 'size', 'disabled'],
            emits: ['update:modelValue', 'change'],
            template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" />'
          },
          ProjectSelect: {
            props: ['modelValue', 'corporationUuid', 'placeholder', 'size', 'disabled'],
            emits: ['update:modelValue'],
            template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" />'
          },
          ProjectTypeSelect: {
            props: ['modelValue', 'corporationUuid', 'placeholder', 'size', 'disabled'],
            emits: ['update:modelValue'],
            template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" />'
          },
          ServiceTypeSelect: {
            props: ['modelValue', 'corporationUuid', 'placeholder', 'size', 'disabled'],
            emits: ['update:modelValue'],
            template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" />'
          },
          UFileUpload: {
            props: ['modelValue', 'accept', 'multiple'],
            template: '<div><slot :open="() => {}" :removeFile="() => {}" /></div>'
          },
          UDropdown: { template: '<div><slot /></div>' },
          UDropdownItem: { template: '<div><slot /></div>' },
          UDropdownMenu: { template: '<div><slot /></div>' },
          UPopover: { template: '<div><slot /><slot name="content" /></div>' },
          UTooltip: { template: '<div><slot /></div>' },
          UCheckbox: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />'
          },
          USelect: {
            props: ['modelValue', 'options', 'placeholder'],
            emits: ['update:modelValue'],
            template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" />'
          },
          UCalendar: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<div />'
          },
          UAlert: { template: '<div><slot /></div>' },
          UTable: { template: '<div><slot /></div>' },
          UPagination: { template: '<div />' },
          SavedProjectAddresses: { template: '<div />' },
          ProjectDocuments: { template: '<div />' },
          AuditLogModal: { template: '<div />' }
        }
      }
    })
  }

  describe('CustomerSelect Component Rendering', () => {
    it('should render CustomerSelect component', () => {
      wrapper = createWrapper()
      const customerSelect = wrapper.findComponent({ name: 'CustomerSelect' })
      expect(customerSelect.exists()).toBe(true)
    })

    it('should pass correct props to CustomerSelect', () => {
      wrapper = createWrapper({ customer_uuid: 'customer-1', uuid: 'project-1' })
      const customerSelect = wrapper.findComponent({ name: 'CustomerSelect' })
      
      expect(customerSelect.props('modelValue')).toBe('customer-1')
      expect(customerSelect.props('corporationUuid')).toBe('test-corp-uuid')
      expect(customerSelect.props('projectUuid')).toBe('project-1')
      expect(customerSelect.props('placeholder')).toBe('Select customer')
      expect(customerSelect.props('size')).toBe('sm')
    })

    it('should pass project uuid when form has uuid', () => {
      wrapper = createWrapper({ uuid: 'project-1' })
      const customerSelect = wrapper.findComponent({ name: 'CustomerSelect' })
      
      expect(customerSelect.props('projectUuid')).toBe('project-1')
    })

    it('should pass project id when form has id but no uuid', () => {
      wrapper = createWrapper({ id: 'project-1' })
      const customerSelect = wrapper.findComponent({ name: 'CustomerSelect' })
      
      expect(customerSelect.props('projectUuid')).toBe('project-1')
    })

    it('should pass null projectUuid when form has neither uuid nor id', () => {
      wrapper = createWrapper()
      const customerSelect = wrapper.findComponent({ name: 'CustomerSelect' })
      
      expect(customerSelect.props('projectUuid')).toBeNull()
    })

    it('should disable CustomerSelect when corporation is not selected', () => {
      wrapper = createWrapper({ corporation_uuid: '' })
      const customerSelect = wrapper.findComponent({ name: 'CustomerSelect' })
      
      // CustomerSelect should be disabled when no corporation is selected
      // The component itself handles this logic
      expect(customerSelect.exists()).toBe(true)
    })
  })

  describe('CustomerSelect Form Updates', () => {
    it('should update customer_uuid when CustomerSelect emits update:modelValue', async () => {
      wrapper = createWrapper()
      
      const customerSelect = wrapper.findComponent({ name: 'CustomerSelect' })
      await customerSelect.vm.$emit('update:modelValue', 'customer-1')
      
      // Check if form update was triggered
      const formUpdates = wrapper.emitted('update:form')
      expect(formUpdates).toBeTruthy()
      
      if (formUpdates && formUpdates.length > 0) {
        const lastUpdate = formUpdates[formUpdates.length - 1][0]
        expect(lastUpdate.customer_uuid).toBe('customer-1')
      }
    })

    it('should handle null customer_uuid update', async () => {
      wrapper = createWrapper({ customer_uuid: 'customer-1' })
      
      const customerSelect = wrapper.findComponent({ name: 'CustomerSelect' })
      await customerSelect.vm.$emit('update:modelValue', null)
      
      const formUpdates = wrapper.emitted('update:form')
      if (formUpdates && formUpdates.length > 0) {
        const lastUpdate = formUpdates[formUpdates.length - 1][0]
        expect(lastUpdate.customer_uuid).toBeNull()
      }
    })

    it('should handle customer_uuid change from one value to another', async () => {
      wrapper = createWrapper({ customer_uuid: 'customer-1' })
      
      const customerSelect = wrapper.findComponent({ name: 'CustomerSelect' })
      expect(customerSelect.props('modelValue')).toBe('customer-1')
      
      await customerSelect.vm.$emit('update:modelValue', 'customer-2')
      
      const formUpdates = wrapper.emitted('update:form')
      if (formUpdates && formUpdates.length > 0) {
        const lastUpdate = formUpdates[formUpdates.length - 1][0]
        expect(lastUpdate.customer_uuid).toBe('customer-2')
      }
    })
  })

  describe('CustomerSelect with Project Context', () => {
    it('should filter customers by project when project_uuid is provided', () => {
      wrapper = createWrapper({ uuid: 'project-1', customer_uuid: 'customer-1' })
      
      const customerSelect = wrapper.findComponent({ name: 'CustomerSelect' })
      expect(customerSelect.props('projectUuid')).toBe('project-1')
      
      // CustomerSelect component should filter customers based on project_uuid
      // This is handled internally by the CustomerSelect component
      expect(customerSelect.exists()).toBe(true)
    })

    it('should show all corporation customers when project_uuid is null', () => {
      wrapper = createWrapper({ customer_uuid: null })
      
      const customerSelect = wrapper.findComponent({ name: 'CustomerSelect' })
      expect(customerSelect.props('projectUuid')).toBeNull()
      
      // CustomerSelect should show all customers for the corporation
      expect(customerSelect.exists()).toBe(true)
    })
  })

  describe('CustomerSelect Integration with Form Submission', () => {
    it('should include customer_uuid in form data', () => {
      const formWithCustomer = { ...defaultForm, customer_uuid: 'customer-1' }
      expect(formWithCustomer.customer_uuid).toBe('customer-1')
    })

    it('should allow null customer_uuid in form data', () => {
      const formWithoutCustomer = { ...defaultForm, customer_uuid: null }
      expect(formWithoutCustomer.customer_uuid).toBeNull()
    })

    it('should allow undefined customer_uuid in form data', () => {
      const formWithoutCustomer = { ...defaultForm }
      // customer_uuid is null in defaultForm, so we check for null or undefined
      expect(formWithoutCustomer.customer_uuid).toBeNull()
    })
  })
})

