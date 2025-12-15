import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick, ref } from 'vue'
import SalesTaxManagement from '../../../../components/Masters/SalesTaxManagement.vue'

// Mock the stores
const mockSalesTaxStore = {
  salesTax: [],
  loading: false,
  error: null,
  fetchSalesTax: vi.fn(),
  createSalesTax: vi.fn(),
  updateSalesTax: vi.fn(),
  deleteSalesTax: vi.fn()
}

// Mock the composables
vi.mock('@/stores/salesTax', () => ({
  useSalesTaxStore: () => mockSalesTaxStore
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
    props: ['modelValue', 'placeholder', 'icon', 'variant', 'size', 'class', 'type']
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

describe('SalesTaxManagement Component', () => {
  let wrapper: any

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // Reset store state
    mockSalesTaxStore.salesTax = []
    mockSalesTaxStore.loading = false
    mockSalesTaxStore.error = null
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(SalesTaxManagement, {
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
      mockSalesTaxStore.loading = true
      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.findComponent({ name: 'USkeleton' }).exists()).toBe(true)
    })

    it('should show error message when there is an error', async () => {
      mockSalesTaxStore.error = 'Test error message'
      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.text()).toContain('Test error message')
    })

    it('should show empty state when no sales tax', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.text()).toContain('No sales tax found')
    })
  })

  describe('Sales Tax Display', () => {
    const mockSalesTax = [
      {
        id: 1,
        uuid: 'tax-1',
        corporation_uuid: null,
        tax_name: 'State Tax',
        tax_percentage: 8.5,
        status: 'ACTIVE',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      },
      {
        id: 2,
        uuid: 'tax-2',
        corporation_uuid: null,
        tax_name: 'Federal Tax',
        tax_percentage: 5.0,
        status: 'INACTIVE',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }
    ]

    beforeEach(() => {
      mockSalesTaxStore.salesTax = mockSalesTax
    })

    it('should display sales tax in table', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const table = wrapper.findComponent({ name: 'UTable' })
      expect(table.exists()).toBe(true)
      expect(mockSalesTaxStore.salesTax).toHaveLength(2)
    })

    it('should show pagination when more than 10 records', async () => {
      const manySalesTax = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        uuid: `tax-${i + 1}`,
        corporation_uuid: null,
        tax_name: `Tax ${i + 1}`,
        tax_percentage: 5.0 + i,
        status: 'ACTIVE',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }))
      
      mockSalesTaxStore.salesTax = manySalesTax
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
      expect(vm.form).toHaveProperty('tax_name')
      expect(vm.form).toHaveProperty('tax_percentage')
      expect(vm.form).toHaveProperty('status')
      
      expect(vm.isFormValid).toBeDefined()
      expect(typeof vm.isFormValid).toBe('boolean')
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
        tax_name: '',
        tax_percentage: 0,
        status: 'ACTIVE'
      }
      await nextTick()
      expect(vm.isFormValid).toBe(false)
      
      // Form with all required fields should be valid
      vm.form = {
        tax_name: 'Test Tax',
        tax_percentage: 10.5,
        status: 'ACTIVE'
      }
      await nextTick()
      expect(vm.isFormValid).toBe(true)
    })

    it('should validate tax percentage range', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const vm = wrapper.vm
      
      // Percentage out of range should be invalid
      vm.form = {
        tax_name: 'Test Tax',
        tax_percentage: 150,
        status: 'ACTIVE'
      }
      await nextTick()
      expect(vm.isFormValid).toBe(false)
      
      // Valid percentage should be valid
      vm.form = {
        tax_name: 'Test Tax',
        tax_percentage: 10.5,
        status: 'ACTIVE'
      }
      await nextTick()
      expect(vm.isFormValid).toBe(true)
    })
  })

  describe('Search Functionality', () => {
    const mockSalesTax = [
      {
        id: 1,
        uuid: 'tax-1',
        corporation_uuid: null,
        tax_name: 'State Tax',
        tax_percentage: 8.5,
        status: 'ACTIVE',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      },
      {
        id: 2,
        uuid: 'tax-2',
        corporation_uuid: null,
        tax_name: 'Federal Tax',
        tax_percentage: 5.0,
        status: 'INACTIVE',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }
    ]

    beforeEach(() => {
      mockSalesTaxStore.salesTax = mockSalesTax
    })

    it('should filter sales tax based on search term', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const vm = wrapper.vm
      
      // Test search by name
      vm.globalFilter = 'State'
      await nextTick()
      
      const filtered = vm.filteredSalesTax
      expect(filtered).toHaveLength(1)
      expect(filtered[0].tax_name).toBe('State Tax')
    })

    it('should return all sales tax when search is empty', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      const vm = wrapper.vm
      vm.globalFilter = ''
      
      const filtered = vm.filteredSalesTax
      expect(filtered).toEqual(mockSalesTax)
    })
  })

  describe('Component Lifecycle', () => {
    it('should fetch sales tax on mount', async () => {
      wrapper = createWrapper()
      await nextTick()
      
      expect(mockSalesTaxStore.fetchSalesTax).toHaveBeenCalled()
    })
  })
})

