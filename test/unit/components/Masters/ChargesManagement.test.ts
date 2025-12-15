import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick, ref } from 'vue'
import ChargesManagement from '../../../../components/Masters/ChargesManagement.vue'

// Mock the stores
const mockChargesStore = {
  charges: [],
  loading: false,
  error: null,
  fetchCharges: vi.fn(),
  createCharge: vi.fn(),
  updateCharge: vi.fn(),
  deleteCharge: vi.fn()
}

// Mock the composables
vi.mock('@/stores/charges', () => ({
  useChargesStore: () => mockChargesStore
}))

// Mock useToast globally
const mockToast = {
  add: vi.fn(),
};
vi.stubGlobal("useToast", () => mockToast);

// Mock Nuxt UI components
vi.mock('@nuxt/ui', () => ({
  UInput: {
    name: 'UInput',
    template: '<input v-bind="$attrs" />',
    props: ['modelValue', 'placeholder', 'icon', 'variant', 'size', 'class']
  },
  UButton: {
    name: 'UButton',
    template: '<button v-bind="$attrs"><slot /></button>',
    props: ['icon', 'size', 'color', 'variant', 'loading', 'disabled', 'onClick']
  },
  UModal: {
    name: 'UModal',
    template: '<div v-if="open" class="modal"><slot /></div>',
    props: ['open', 'title', 'description', 'ui']
  },
  USelect: {
    name: 'USelect',
    template: '<select v-bind="$attrs"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
    props: ['modelValue', 'items', 'placeholder', 'variant', 'size', 'class']
  },
  UTable: {
    name: 'UTable',
    template: '<table><slot /></table>',
    props: ['data', 'columns', 'pagination', 'columnPinning', 'paginationOptions', 'globalFilter', 'class']
  },
  UPagination: {
    name: 'UPagination',
    template: '<div class="pagination"><slot /></div>',
    props: ['defaultPage', 'itemsPerPage', 'total']
  },
  UBadge: {
    name: 'UBadge',
    template: '<span class="badge"><slot /></span>',
    props: ['color', 'variant', 'size']
  },
  UTooltip: {
    name: 'UTooltip',
    template: '<div class="tooltip"><slot /></div>',
    props: ['text']
  },
  USkeleton: {
    name: 'USkeleton',
    template: '<div class="skeleton" />',
    props: ['class']
  },
  UIcon: {
    name: 'UIcon',
    template: '<i class="icon" />',
    props: ['name', 'class']
  }
}))

// Mock TanStack Table
vi.mock('@tanstack/vue-table', () => ({
  getPaginationRowModel: vi.fn()
}))

// Mock Vue composables
vi.stubGlobal('useTemplateRef', vi.fn(() => ref(null)))

describe('ChargesManagement Component', () => {
  let wrapper: any

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // Reset store state
    mockChargesStore.charges = []
    mockChargesStore.loading = false
    mockChargesStore.error = null
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(ChargesManagement, {
      props,
      global: {
        stubs: {
          UInput: true,
          UButton: true,
          UModal: true,
          USelect: true,
          UTable: true,
          UPagination: true,
          UBadge: true,
          UTooltip: true,
          USkeleton: true,
          UIcon: true
        }
      }
    })
  }

  describe('Component Rendering', () => {
    it('should render the component correctly', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should show loading skeleton when loading', async () => {
      mockChargesStore.loading = true
      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.findComponent({ name: 'USkeleton' }).exists()).toBe(true)
    })

    it('should show error message when there is an error', async () => {
      mockChargesStore.error = 'Test error message'
      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.text()).toContain('Test error message')
    })

    it('should show empty state when no charges', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.text()).toContain('No charges found')
    })
  })

  describe('Charges Display', () => {
    const mockCharges = [
      {
        id: 1,
        uuid: 'charge-1',
        corporation_uuid: null,
        charge_name: 'Standard Freight',
        charge_type: 'FREIGHT',
        status: 'ACTIVE',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      },
      {
        id: 2,
        uuid: 'charge-2',
        corporation_uuid: null,
        charge_name: 'Packing Charge',
        charge_type: 'PACKING',
        status: 'INACTIVE',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }
    ]

    beforeEach(() => {
      mockChargesStore.charges = mockCharges
    })

    it('should display charges in table', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const table = wrapper.findComponent({ name: 'UTable' })
      expect(table.exists()).toBe(true)
      expect(mockChargesStore.charges).toHaveLength(2)
    })

    it('should show pagination when more than 10 records', async () => {
      const manyCharges = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        uuid: `charge-${i + 1}`,
        corporation_uuid: null,
        charge_name: `Charge ${i + 1}`,
        charge_type: 'FREIGHT',
        status: 'ACTIVE',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }))
      
      mockChargesStore.charges = manyCharges
      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.findComponent({ name: 'UPagination' }).exists()).toBe(true)
    })
  })

  describe('Form Modal', () => {
    it('should have correct form fields', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const vm = wrapper.vm
      
      expect(vm.form).toBeDefined()
      expect(vm.form).toHaveProperty('charge_name')
      expect(vm.form).toHaveProperty('charge_type')
      expect(vm.form).toHaveProperty('status')
      
      expect(vm.isFormValid).toBeDefined()
      expect(typeof vm.isFormValid).toBe('boolean')
    })

    it('should have correct charge type options', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const vm = wrapper.vm
      
      expect(vm.chargeTypeOptions).toEqual([
        { label: 'Freight', value: 'FREIGHT' },
        { label: 'Packing', value: 'PACKING' },
        { label: 'Custom & Duties', value: 'CUSTOM_DUTIES' },
        { label: 'Other', value: 'OTHER' }
      ])
    })

    it('should have correct status options', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const vm = wrapper.vm
      
      expect(vm.statusOptions).toEqual([
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Inactive', value: 'INACTIVE' }
      ])
    })
  })

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const vm = wrapper.vm
      
      // Empty form should be invalid
      vm.form = {
        charge_name: '',
        charge_type: '',
        status: 'ACTIVE'
      }
      await nextTick()
      expect(vm.isFormValid).toBe(false)
      
      // Form with all required fields should be valid
      vm.form = {
        charge_name: 'Test Charge',
        charge_type: 'FREIGHT',
        status: 'ACTIVE'
      }
      await nextTick()
      expect(vm.isFormValid).toBe(true)
    })
  })

  describe('Search Functionality', () => {
    const mockCharges = [
      {
        id: 1,
        uuid: 'charge-1',
        corporation_uuid: null,
        charge_name: 'Standard Freight',
        charge_type: 'FREIGHT',
        status: 'ACTIVE',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      },
      {
        id: 2,
        uuid: 'charge-2',
        corporation_uuid: null,
        charge_name: 'Packing Charge',
        charge_type: 'PACKING',
        status: 'INACTIVE',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }
    ]

    beforeEach(() => {
      mockChargesStore.charges = mockCharges
    })

    it('should filter charges based on search term', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const vm = wrapper.vm
      
      // Test search by name
      vm.globalFilter = 'Standard'
      await nextTick()
      
      const filtered = vm.filteredCharges
      expect(filtered).toHaveLength(1)
      expect(filtered[0].charge_name).toBe('Standard Freight')
    })

    it('should return all charges when search is empty', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const vm = wrapper.vm
      vm.globalFilter = ''
      
      const filtered = vm.filteredCharges
      expect(filtered).toEqual(mockCharges)
    })
  })

  describe('Component Lifecycle', () => {
    it('should fetch charges on mount', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      expect(mockChargesStore.fetchCharges).toHaveBeenCalled()
    })
  })
})

