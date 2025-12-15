import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick, reactive } from 'vue'
import PurchaseOrderSelect from '@/components/Shared/PurchaseOrderSelect.vue'

// Mock composables
vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (value: number | string | null | undefined) => {
      const num = typeof value === 'string' ? parseFloat(value) : Number(value ?? 0)
      if (Number.isNaN(num)) return '$0.00'
      return `$${num.toFixed(2)}`
    },
  }),
}))

// Mock the stores with reactive properties
const mockPurchaseOrdersStore = reactive({
  purchaseOrders: [] as any[],
  loading: false,
  error: null,
  fetchPurchaseOrders: vi.fn().mockResolvedValue(undefined),
})

vi.mock('@/stores/purchaseOrders', () => ({
  usePurchaseOrdersStore: () => mockPurchaseOrdersStore,
}))

describe('PurchaseOrderSelect Component', () => {
  let wrapper: any

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // Reset store data
    mockPurchaseOrdersStore.purchaseOrders = []
    mockPurchaseOrdersStore.loading = false
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(PurchaseOrderSelect, {
      props: {
        projectUuid: 'project-1',
        corporationUuid: 'corp-1',
        vendorUuid: 'vendor-1',
        ...props,
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          USelectMenu: {
            template: `
              <select 
                :value="modelValue?.value || modelValue" 
                @change="handleChange"
                :disabled="disabled"
              >
                <option value="">Select...</option>
                <option 
                  v-for="item in items" 
                  :key="item.value" 
                  :value="item.value"
                >
                  {{ item.label }}
                </option>
              </select>
            `,
            props: [
              'modelValue',
              'items',
              'placeholder',
              'disabled',
              'loading',
              'valueKey',
              'labelKey',
              'searchable',
              'searchablePlaceholder',
              'size',
              'class',
            ],
            emits: ['update:model-value'],
            methods: {
              handleChange(e: any) {
                const value = e.target.value
                const item = this.items.find((i: any) => i.value === value)
                this.$emit('update:model-value', item || value || null)
              },
            },
          },
          UBadge: {
            template: '<span class="badge"><slot /></span>',
            props: ['color', 'variant', 'size'],
          },
        },
      },
    })
  }

  describe('Component Mounting', () => {
    it('should mount without errors', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should be disabled when project, corporation, or vendor is missing', () => {
      wrapper = createWrapper({
        projectUuid: undefined,
        vendorUuid: 'vendor-1',
      })
      
      const select = wrapper.find('select')
      expect(select.attributes('disabled')).toBeDefined()
    })

    it('should fetch purchase orders when corporation is provided', async () => {
      wrapper = createWrapper({
        corporationUuid: 'corp-1',
      })

      await nextTick()

      expect(mockPurchaseOrdersStore.fetchPurchaseOrders).toHaveBeenCalledWith('corp-1')
    })
  })

  describe('Default Status Filtering (Approved only)', () => {
    beforeEach(() => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: 'po-1',
          po_number: 'PO-001',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Approved',
          total_po_amount: 1000,
          vendor_name: 'Vendor 1',
        },
        {
          uuid: 'po-2',
          po_number: 'PO-002',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Partially_Received',
          total_po_amount: 2000,
          vendor_name: 'Vendor 1',
        },
        {
          uuid: 'po-3',
          po_number: 'PO-003',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Completed',
          total_po_amount: 3000,
          vendor_name: 'Vendor 1',
        },
        {
          uuid: 'po-4',
          po_number: 'PO-004',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Draft',
          total_po_amount: 4000,
          vendor_name: 'Vendor 1',
        },
      ]
    })

    it('should only show Approved POs by default', async () => {
      wrapper = createWrapper()

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      expect(options.length).toBe(1)
      expect(options[0].value).toBe('po-1')
      expect(options[0].poNumber).toBe('PO-001')
      expect(options[0].status).toBe('Approved')
    })

    it('should not show Partially_Received POs by default', async () => {
      wrapper = createWrapper()

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      const po2Option = options.find((opt: any) => opt.value === 'po-2')
      expect(po2Option).toBeUndefined()
    })

    it('should not show Completed POs by default', async () => {
      wrapper = createWrapper()

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      const po3Option = options.find((opt: any) => opt.value === 'po-3')
      expect(po3Option).toBeUndefined()
    })

    it('should not show Draft POs by default', async () => {
      wrapper = createWrapper()

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      const po4Option = options.find((opt: any) => opt.value === 'po-4')
      expect(po4Option).toBeUndefined()
    })
  })

  describe('Custom Status Filtering (allowedStatuses prop)', () => {
    beforeEach(() => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: 'po-1',
          po_number: 'PO-001',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Approved',
          total_po_amount: 1000,
          vendor_name: 'Vendor 1',
        },
        {
          uuid: 'po-2',
          po_number: 'PO-002',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Partially_Received',
          total_po_amount: 2000,
          vendor_name: 'Vendor 1',
        },
        {
          uuid: 'po-3',
          po_number: 'PO-003',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Completed',
          total_po_amount: 3000,
          vendor_name: 'Vendor 1',
        },
        {
          uuid: 'po-4',
          po_number: 'PO-004',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Draft',
          total_po_amount: 4000,
          vendor_name: 'Vendor 1',
        },
      ]
    })

    it('should show Approved, Partially_Received, and Completed POs when allowedStatuses includes all three', async () => {
      wrapper = createWrapper({
        allowedStatuses: ['Approved', 'Partially_Received', 'Completed'],
      })

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      expect(options.length).toBe(3)
      expect(options.map((opt: any) => opt.value)).toContain('po-1')
      expect(options.map((opt: any) => opt.value)).toContain('po-2')
      expect(options.map((opt: any) => opt.value)).toContain('po-3')
      expect(options.map((opt: any) => opt.value)).not.toContain('po-4')
    })

    it('should show only Partially_Received POs when allowedStatuses is set to only Partially_Received', async () => {
      wrapper = createWrapper({
        allowedStatuses: ['Partially_Received'],
      })

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      expect(options.length).toBe(1)
      expect(options[0].value).toBe('po-2')
      expect(options[0].status).toBe('Partially_Received')
    })

    it('should show only Completed POs when allowedStatuses is set to only Completed', async () => {
      wrapper = createWrapper({
        allowedStatuses: ['Completed'],
      })

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      expect(options.length).toBe(1)
      expect(options[0].value).toBe('po-3')
      expect(options[0].status).toBe('Completed')
    })

    it('should show Approved and Partially_Received POs when allowedStatuses includes both', async () => {
      wrapper = createWrapper({
        allowedStatuses: ['Approved', 'Partially_Received'],
      })

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      expect(options.length).toBe(2)
      expect(options.map((opt: any) => opt.value)).toContain('po-1')
      expect(options.map((opt: any) => opt.value)).toContain('po-2')
      expect(options.map((opt: any) => opt.value)).not.toContain('po-3')
      expect(options.map((opt: any) => opt.value)).not.toContain('po-4')
    })

    it('should handle empty allowedStatuses array', async () => {
      wrapper = createWrapper({
        allowedStatuses: [],
      })

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      expect(options.length).toBe(0)
    })
  })

  describe('Status Color Mapping', () => {
    beforeEach(() => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: 'po-1',
          po_number: 'PO-001',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Approved',
          total_po_amount: 1000,
          vendor_name: 'Vendor 1',
        },
        {
          uuid: 'po-2',
          po_number: 'PO-002',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Partially_Received',
          total_po_amount: 2000,
          vendor_name: 'Vendor 1',
        },
        {
          uuid: 'po-3',
          po_number: 'PO-003',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Completed',
          total_po_amount: 3000,
          vendor_name: 'Vendor 1',
        },
      ]
    })

    it('should map Approved status to success color', async () => {
      wrapper = createWrapper({
        allowedStatuses: ['Approved'],
      })

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      expect(options[0].status_color).toBe('success')
    })

    it('should map Partially_Received status to info color', async () => {
      wrapper = createWrapper({
        allowedStatuses: ['Partially_Received'],
      })

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      expect(options[0].status_color).toBe('info')
    })

    it('should map Completed status to info color', async () => {
      wrapper = createWrapper({
        allowedStatuses: ['Completed'],
      })

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      expect(options[0].status_color).toBe('info')
    })
  })

  describe('PO Options Formatting', () => {
    beforeEach(() => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: 'po-1',
          po_number: 'PO-001',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Approved',
          total_po_amount: 1000.50,
          vendor_name: 'Test Vendor',
        },
        {
          uuid: 'po-2',
          po_number: 'PO-002',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Partially_Received',
          total_po_amount: 2000.75,
          vendor_name: 'Test Vendor',
        },
      ]
    })

    it('should format PO options with correct structure', async () => {
      wrapper = createWrapper({
        allowedStatuses: ['Approved', 'Partially_Received'],
      })

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      expect(options.length).toBe(2)
      
      const po1Option = options.find((opt: any) => opt.value === 'po-1')
      expect(po1Option).toBeDefined()
      expect(po1Option.label).toBe('PO-001')
      expect(po1Option.poNumber).toBe('PO-001')
      expect(po1Option.vendorName).toBe('Test Vendor')
      expect(po1Option.formattedAmount).toBe('$1000.50')
      expect(po1Option.status).toBe('Approved')
      expect(po1Option.purchaseOrder).toBeDefined()
    })

    it('should include search text in options', async () => {
      wrapper = createWrapper({
        allowedStatuses: ['Approved'],
      })

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      expect(options[0].searchText).toContain('po-001')
      expect(options[0].searchText).toContain('test vendor')
      expect(options[0].searchText).toContain('po-1')
    })
  })

  describe('Filtering by Project, Corporation, and Vendor', () => {
    beforeEach(() => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: 'po-1',
          po_number: 'PO-001',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Approved',
          total_po_amount: 1000,
          vendor_name: 'Vendor 1',
        },
        {
          uuid: 'po-2',
          po_number: 'PO-002',
          project_uuid: 'project-2', // Different project
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Approved',
          total_po_amount: 2000,
          vendor_name: 'Vendor 1',
        },
        {
          uuid: 'po-3',
          po_number: 'PO-003',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-2', // Different vendor
          corporation_uuid: 'corp-1',
          status: 'Approved',
          total_po_amount: 3000,
          vendor_name: 'Vendor 2',
        },
        {
          uuid: 'po-4',
          po_number: 'PO-004',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-2', // Different corporation
          status: 'Approved',
          total_po_amount: 4000,
          vendor_name: 'Vendor 1',
        },
      ]
    })

    it('should filter POs by project, corporation, and vendor', async () => {
      wrapper = createWrapper({
        projectUuid: 'project-1',
        corporationUuid: 'corp-1',
        vendorUuid: 'vendor-1',
      })

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      expect(options.length).toBe(1)
      expect(options[0].value).toBe('po-1')
    })

    it('should not include POs from different projects', async () => {
      wrapper = createWrapper({
        projectUuid: 'project-1',
        corporationUuid: 'corp-1',
        vendorUuid: 'vendor-1',
      })

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      const po2Option = options.find((opt: any) => opt.value === 'po-2')
      expect(po2Option).toBeUndefined()
    })

    it('should not include POs from different vendors', async () => {
      wrapper = createWrapper({
        projectUuid: 'project-1',
        corporationUuid: 'corp-1',
        vendorUuid: 'vendor-1',
      })

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      const po3Option = options.find((opt: any) => opt.value === 'po-3')
      expect(po3Option).toBeUndefined()
    })

    it('should not include POs from different corporations', async () => {
      wrapper = createWrapper({
        projectUuid: 'project-1',
        corporationUuid: 'corp-1',
        vendorUuid: 'vendor-1',
      })

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      const po4Option = options.find((opt: any) => opt.value === 'po-4')
      expect(po4Option).toBeUndefined()
    })
  })

  describe('VendorInvoiceForm Integration Scenario', () => {
    beforeEach(() => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: 'po-1',
          po_number: 'PO-001',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Approved',
          total_po_amount: 1000,
          vendor_name: 'Vendor 1',
        },
        {
          uuid: 'po-2',
          po_number: 'PO-002',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Partially_Received',
          total_po_amount: 2000,
          vendor_name: 'Vendor 1',
        },
        {
          uuid: 'po-3',
          po_number: 'PO-003',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Completed',
          total_po_amount: 3000,
          vendor_name: 'Vendor 1',
        },
        {
          uuid: 'po-4',
          po_number: 'PO-004',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Draft',
          total_po_amount: 4000,
          vendor_name: 'Vendor 1',
        },
      ]
    })

    it('should show all three statuses (Approved, Partially_Received, Completed) when used in VendorInvoiceForm', async () => {
      // Simulate VendorInvoiceForm usage with allowedStatuses prop
      wrapper = createWrapper({
        allowedStatuses: ['Approved', 'Partially_Received', 'Completed'],
      })

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      expect(options.length).toBe(3)
      expect(options.map((opt: any) => opt.value)).toContain('po-1')
      expect(options.map((opt: any) => opt.value)).toContain('po-2')
      expect(options.map((opt: any) => opt.value)).toContain('po-3')
      expect(options.map((opt: any) => opt.value)).not.toContain('po-4')
    })

    it('should have correct status colors for all three statuses', async () => {
      wrapper = createWrapper({
        allowedStatuses: ['Approved', 'Partially_Received', 'Completed'],
      })

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      const approvedOption = options.find((opt: any) => opt.status === 'Approved')
      const partiallyReceivedOption = options.find((opt: any) => opt.status === 'Partially_Received')
      const completedOption = options.find((opt: any) => opt.status === 'Completed')
      
      expect(approvedOption.status_color).toBe('success')
      expect(partiallyReceivedOption.status_color).toBe('info')
      expect(completedOption.status_color).toBe('info')
    })
  })

  describe('Edge Cases', () => {
    it('should handle POs with null or undefined status', async () => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: 'po-1',
          po_number: 'PO-001',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: null,
          total_po_amount: 1000,
          vendor_name: 'Vendor 1',
        },
        {
          uuid: 'po-2',
          po_number: 'PO-002',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: undefined,
          total_po_amount: 2000,
          vendor_name: 'Vendor 1',
        },
      ]

      wrapper = createWrapper({
        allowedStatuses: ['Approved'],
      })

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      // POs with null/undefined status should not match 'Approved'
      expect(options.length).toBe(0)
    })

    it('should handle empty purchase orders array', async () => {
      mockPurchaseOrdersStore.purchaseOrders = []

      wrapper = createWrapper()

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      expect(options.length).toBe(0)
    })

    it('should return empty array when project, corporation, or vendor is missing', async () => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: 'po-1',
          po_number: 'PO-001',
          project_uuid: 'project-1',
          vendor_uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          status: 'Approved',
          total_po_amount: 1000,
          vendor_name: 'Vendor 1',
        },
      ]

      wrapper = createWrapper({
        projectUuid: undefined,
        corporationUuid: 'corp-1',
        vendorUuid: 'vendor-1',
      })

      await nextTick()

      const component = wrapper.vm
      const options = component.poOptions
      
      expect(options.length).toBe(0)
    })
  })
})

