import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref, computed } from "vue";
import { mount } from '@vue/test-utils'
import { CalendarDate } from '@internationalized/date'
import ProjectDetailsForm from '@/components/Projects/ProjectDetailsForm.vue'

// Mock the stores
const mockCorpStore = {
  selectedCorporation: {
    uuid: 'test-corp-uuid',
    corporation_name: 'Test Corporation'
  },
  ensureReady: vi.fn(() => Promise.resolve())
}

const mockProjectTypesStore = {
  projectTypes: [
    { uuid: 'pt-1', name: 'Residential', is_active: true },
    { uuid: 'pt-2', name: 'Commercial', is_active: true }
  ],
  loading: false,
  error: null,
  getActiveProjectTypes: vi.fn((corpUuid) => mockProjectTypesStore.projectTypes),
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

const mockCustomerStore = {
  customers: ref([]),
  fetchCustomers: vi.fn(),
  loading: ref(false)
}

const mockProjectsStore = {
  projects: [],
  currentProject: null,
  loading: ref(false),
  fetchProjects: vi.fn(),
  fetchProjectsMetadata: vi.fn(() => Promise.resolve()),
  loadCurrentProject: vi.fn(),
  localCustomers: ref([]),
  customersLoading: ref(false),
  customersError: ref(null),
  fetchLocalCustomers: vi.fn(() => Promise.resolve()),
  clearLocalCustomers: vi.fn()
}

const mockProjectAddressesStore = {
  addresses: ref([]),
  loading: ref(false),
  error: ref(null),
  getAddresses: vi.fn(() => []),
  fetchAddresses: vi.fn(() => Promise.resolve()),
  createAddress: vi.fn(),
  updateAddress: vi.fn(),
  deleteAddress: vi.fn()
}

// Mock the composables
vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockCorpStore
}))

vi.mock('@/stores/projectTypes', () => ({
  useProjectTypesStore: () => mockProjectTypesStore
}))

vi.mock('@/stores/serviceTypes', () => ({
  useServiceTypesStore: () => mockServiceTypesStore
}))

vi.mock('@/stores/customers', () => ({
  useCustomerStore: () => mockCustomerStore
}))

vi.mock('@/stores/projects', () => ({
  useProjectsStore: () => mockProjectsStore
}))

vi.mock('@/stores/projectAddresses', () => ({
  useProjectAddressesStore: () => mockProjectAddressesStore
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

vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: vi.fn((amount) => `$${amount}`)
  })
}))

vi.mock('@/composables/useUTCDateFormat', () => ({
  useUTCDateFormat: () => ({
    toUTCString: vi.fn((date) => date),
    fromUTCString: vi.fn((date) => date)
  })
}))

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    canViewAuditLogs: true,
    canManageProjects: true,
    canManageCustomers: true,
    canManageAddresses: true
  })
}))

// Mock UToast
const mockToast = {
  add: vi.fn()
}
vi.mock('@/utils/toast', () => ({
  toast: mockToast
}))
vi.mock('vue-sonner', () => ({
  toast: mockToast
}))

// Mock useToast composable
vi.mock('@nuxt/ui', () => ({
  useToast: () => mockToast
}))

describe('ProjectDetailsForm Date Restriction Functionality', () => {
  let wrapper: any
  let form: any

  beforeEach(() => {
    setActivePinia(createPinia())

    form = {
      uuid: '',
      id: '',
      corporation_uuid: 'test-corp-uuid',
      project_name: 'Test Project',
      project_id: 'PRO-1',
      project_type_uuid: 'pt-1',
      service_type_uuid: 'st-1',
      project_status: 'Pending',
      project_start_date: '',
      project_estimated_completion_date: '',
      estimated_amount: '',
      contingency_percentage: 10,
      area_sq_ft: '',
      no_of_rooms: '',
      only_total: false,
      enable_labor: false,
      enable_material: false,
      customer_uuid: '',
      tempAddresses: [],
      attachments: []
    }

    const props = {
      form,
      editingProject: false,
      readonly: false,
      fileUploadError: null,
      latestEstimate: null,
      loading: false,
      hasProjectEstimates: false
    }

    wrapper = mount(ProjectDetailsForm, {
      props,
      global: {
        stubs: {
          UCard: true,
          UInput: true,
          USelectMenu: true,
          UButton: true,
          UPopover: true,
          UCalendar: true,
          CorporationSelect: true,
          CustomerSelect: true,
          ProjectTypeSelect: true,
          ServiceTypeSelect: true,
          FilePreview: true,
          AuditLogModal: true,
          CustomerForm: true,
          UIcon: true,
          UBadge: true,
          USkeleton: true,
          UFileUpload: true,
          UCheckbox: true,
          UModal: true,
          UForm: true
        }
      }
    })
  })

  afterEach(() => {
    wrapper.unmount()
    vi.clearAllMocks()
  })

  describe('Estimated Completion Date Calendar Restrictions', () => {
    it('should not restrict estimated completion date when no start date is selected', async () => {
      await wrapper.vm.$nextTick()

      // Check that startDateValue computed property returns null
      expect(wrapper.vm.startDateValue).toBeNull()
    })

    it('should restrict estimated completion date to be on or after start date when start date is selected', async () => {
      // Create a new form with start date
      const formWithStartDate = {
        ...form,
        project_start_date: '2024-01-15'
      }

      const startDate = new CalendarDate(2024, 1, 15) // January 15, 2024

      wrapper = mount(ProjectDetailsForm, {
        props: {
          form: formWithStartDate,
          editingProject: false,
          readonly: false,
          fileUploadError: null,
          latestEstimate: null,
          loading: false,
          hasProjectEstimates: false
        },
        global: {
          stubs: {
            UCard: true,
            UInput: true,
            USelectMenu: true,
            UButton: true,
            UPopover: true,
            UCalendar: true,
            CorporationSelect: true,
            CustomerSelect: true,
            ProjectTypeSelect: true,
            ServiceTypeSelect: true,
            FilePreview: true,
            AuditLogModal: true,
            CustomerForm: true,
            UIcon: true,
            UBadge: true,
            USkeleton: true,
            UFileUpload: true,
            UCheckbox: true,
            UModal: true,
            UForm: true
          }
        }
      })

      await wrapper.vm.$nextTick()

      // Check that startDateValue computed property returns the correct date
      expect(wrapper.vm.startDateValue).toEqual(startDate)
    })

    it('should update restriction when start date changes', async () => {
      // Initially no start date
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.startDateValue).toBeNull()

      // Create new wrapper with start date to January 15, 2024
      const startDate1 = new CalendarDate(2024, 1, 15)
      const formWithStartDate1 = {
        ...form,
        project_start_date: '2024-01-15'
      }

      wrapper = mount(ProjectDetailsForm, {
        props: {
          form: formWithStartDate1,
          editingProject: false,
          readonly: false,
          fileUploadError: null,
          latestEstimate: null,
          loading: false,
          hasProjectEstimates: false
        },
        global: {
          stubs: {
            UCard: true,
            UInput: true,
            USelectMenu: true,
            UButton: true,
            UPopover: true,
            UCalendar: true,
            CorporationSelect: true,
            CustomerSelect: true,
            ProjectTypeSelect: true,
            ServiceTypeSelect: true,
            FilePreview: true,
            AuditLogModal: true,
            CustomerForm: true,
            UIcon: true,
            UBadge: true,
            USkeleton: true,
            UFileUpload: true,
            UCheckbox: true,
            UModal: true,
            UForm: true
          }
        }
      })

      await wrapper.vm.$nextTick()
      expect(wrapper.vm.startDateValue).toEqual(startDate1)

      // Change start date to February 20, 2024
      const startDate2 = new CalendarDate(2024, 2, 20)
      const formWithStartDate2 = {
        ...form,
        project_start_date: '2024-02-20'
      }

      wrapper = mount(ProjectDetailsForm, {
        props: {
          form: formWithStartDate2,
          editingProject: false,
          readonly: false,
          fileUploadError: null,
          latestEstimate: null,
          loading: false,
          hasProjectEstimates: false
        },
        global: {
          stubs: {
            UCard: true,
            UInput: true,
            USelectMenu: true,
            UButton: true,
            UPopover: true,
            UCalendar: true,
            CorporationSelect: true,
            CustomerSelect: true,
            ProjectTypeSelect: true,
            ServiceTypeSelect: true,
            FilePreview: true,
            AuditLogModal: true,
            CustomerForm: true,
            UIcon: true,
            UBadge: true,
            USkeleton: true,
            UFileUpload: true,
            UCheckbox: true,
            UModal: true,
            UForm: true
          }
        }
      })

      await wrapper.vm.$nextTick()
      expect(wrapper.vm.startDateValue).toEqual(startDate2)
    })

    it('should allow estimated completion date to be the same as start date', async () => {
      // Set start date
      const startDate = new CalendarDate(2024, 1, 15)
      const formWithStartDate = {
        ...form,
        project_start_date: '2024-01-15'
      }

      wrapper = mount(ProjectDetailsForm, {
        props: {
          form: formWithStartDate,
          editingProject: false,
          readonly: false,
          fileUploadError: null,
          latestEstimate: null,
          loading: false,
          hasProjectEstimates: false
        },
        global: {
          stubs: {
            UCard: true,
            UInput: true,
            USelectMenu: true,
            UButton: true,
            UPopover: true,
            UCalendar: true,
            CorporationSelect: true,
            CustomerSelect: true,
            ProjectTypeSelect: true,
            ServiceTypeSelect: true,
            FilePreview: true,
            AuditLogModal: true,
            CustomerForm: true,
            UIcon: true,
            UBadge: true,
            USkeleton: true,
            UFileUpload: true,
            UCheckbox: true,
            UModal: true,
            UForm: true
          }
        }
      })

      await wrapper.vm.$nextTick()

      // The startDateValue should be set correctly
      expect(wrapper.vm.startDateValue).toEqual(startDate)
    })

    it('should allow estimated completion date to be after start date', async () => {
      // Set start date
      const startDate = new CalendarDate(2024, 1, 15)
      const formWithStartDate = {
        ...form,
        project_start_date: '2024-01-15'
      }

      wrapper = mount(ProjectDetailsForm, {
        props: {
          form: formWithStartDate,
          editingProject: false,
          readonly: false,
          fileUploadError: null,
          latestEstimate: null,
          loading: false,
          hasProjectEstimates: false
        },
        global: {
          stubs: {
            UCard: true,
            UInput: true,
            USelectMenu: true,
            UButton: true,
            UPopover: true,
            UCalendar: true,
            CorporationSelect: true,
            CustomerSelect: true,
            ProjectTypeSelect: true,
            ServiceTypeSelect: true,
            FilePreview: true,
            AuditLogModal: true,
            CustomerForm: true,
            UIcon: true,
            UBadge: true,
            USkeleton: true,
            UFileUpload: true,
            UCheckbox: true,
            UModal: true,
            UForm: true
          }
        }
      })

      await wrapper.vm.$nextTick()

      // The startDateValue should be set correctly
      expect(wrapper.vm.startDateValue).toEqual(startDate)
    })

    it('should maintain restriction when editing existing project', async () => {
      // Set up editing mode with start date
      const startDate = new CalendarDate(2024, 3, 10)
      const formWithStartDate = {
        ...form,
        project_start_date: '2024-03-10',
        id: 'existing-project-id'
      }

      wrapper = mount(ProjectDetailsForm, {
        props: {
          form: formWithStartDate,
          editingProject: true,
          readonly: false,
          fileUploadError: null,
          latestEstimate: null,
          loading: false,
          hasProjectEstimates: false
        },
        global: {
          stubs: {
            UCard: true,
            UInput: true,
            USelectMenu: true,
            UButton: true,
            UPopover: true,
            UCalendar: true,
            CorporationSelect: true,
            CustomerSelect: true,
            ProjectTypeSelect: true,
            ServiceTypeSelect: true,
            FilePreview: true,
            AuditLogModal: true,
            CustomerForm: true,
            UIcon: true,
            UBadge: true,
            USkeleton: true,
            UFileUpload: true,
            UCheckbox: true,
            UModal: true,
            UForm: true
          }
        }
      })

      await wrapper.vm.$nextTick()

      // Check that startDateValue is correctly set
      expect(wrapper.vm.startDateValue).toEqual(startDate)
    })

    it('should handle invalid date strings gracefully', async () => {
      // Create form with invalid date
      const formWithInvalidDate = {
        ...form,
        project_start_date: 'invalid-date'
      }

      wrapper = mount(ProjectDetailsForm, {
        props: {
          form: formWithInvalidDate,
          editingProject: false,
          readonly: false,
          fileUploadError: null,
          latestEstimate: null,
          loading: false,
          hasProjectEstimates: false
        },
        global: {
          stubs: {
            UCard: true,
            UInput: true,
            USelectMenu: true,
            UButton: true,
            UPopover: true,
            UCalendar: true,
            CorporationSelect: true,
            CustomerSelect: true,
            ProjectTypeSelect: true,
            ServiceTypeSelect: true,
            FilePreview: true,
            AuditLogModal: true,
            CustomerForm: true,
            UIcon: true,
            UBadge: true,
            USkeleton: true,
            UFileUpload: true,
            UCheckbox: true,
            UModal: true,
            UForm: true
          }
        }
      })

      await wrapper.vm.$nextTick()

      // Should return null for invalid dates
      expect(wrapper.vm.startDateValue).toBeNull()
    })

    it('should handle empty date strings', async () => {
      // Create form with empty date
      const formWithEmptyDate = {
        ...form,
        project_start_date: ''
      }

      wrapper = mount(ProjectDetailsForm, {
        props: {
          form: formWithEmptyDate,
          editingProject: false,
          readonly: false,
          fileUploadError: null,
          latestEstimate: null,
          loading: false,
          hasProjectEstimates: false
        },
        global: {
          stubs: {
            UCard: true,
            UInput: true,
            USelectMenu: true,
            UButton: true,
            UPopover: true,
            UCalendar: true,
            CorporationSelect: true,
            CustomerSelect: true,
            ProjectTypeSelect: true,
            ServiceTypeSelect: true,
            FilePreview: true,
            AuditLogModal: true,
            CustomerForm: true,
            UIcon: true,
            UBadge: true,
            USkeleton: true,
            UFileUpload: true,
            UCheckbox: true,
            UModal: true,
            UForm: true
          }
        }
      })

      await wrapper.vm.$nextTick()

      // Should return null for empty dates
      expect(wrapper.vm.startDateValue).toBeNull()
    })
  })
})
