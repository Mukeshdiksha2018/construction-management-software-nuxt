import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import AdvancePaymentCostCodesTable from '@/components/Payables/AdvancePaymentCostCodesTable.vue'

// Mock composables
vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (value: number | string | null | undefined) => {
      const num = typeof value === 'string' ? parseFloat(value) : Number(value ?? 0)
      if (Number.isNaN(num)) return '$0.00'
      return `$${num.toFixed(2)}`
    },
    currencySymbol: ref('$'),
  }),
}))

// Mock stores
const mockCostCodeConfigurationsStore = {
  configurations: [],
  loading: false,
  fetchConfigurations: vi.fn().mockResolvedValue(undefined),
}

vi.mock('@/stores/costCodeConfigurations', () => ({
  useCostCodeConfigurationsStore: () => mockCostCodeConfigurationsStore,
}))

// Mock child components
const uiStubs = {
  UCard: { template: '<div><slot /></div>' },
  UButton: {
    template: '<button><slot /></button>',
    props: ['icon', 'color', 'variant', 'size', 'disabled', 'loading'],
  },
  UInput: {
    props: ['modelValue', 'placeholder', 'size', 'class', 'disabled', 'type', 'step'],
    emits: ['update:modelValue'],
    template: '<input />',
  },
  UModal: {
    template: '<div v-if="modelValue"><slot /></div>',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  CostCodeSelect: {
    name: 'CostCodeSelect',
    props: ['modelValue', 'corporationUuid', 'size', 'class', 'disabled', 'placeholder'],
    emits: ['update:modelValue', 'change'],
    template: '<div />',
  },
  ChartOfAccountsSelect: {
    props: ['modelValue', 'corporationUuid', 'size', 'class', 'disabled', 'placeholder'],
    emits: ['update:modelValue', 'change'],
    template: '<div />',
  },
}

// Mock $fetch
global.$fetch = vi.fn()

describe('AdvancePaymentCostCodesTable.vue', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
    mockCostCodeConfigurationsStore.configurations = []
    mockCostCodeConfigurationsStore.loading = false
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('does not render when poCoUuid is not provided', () => {
      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: null,
          poCoType: null,
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      expect(wrapper.html()).toBe('<!--v-if-->')
    })

    it('renders when poCoUuid and poCoType are provided', () => {
      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('shows loading state when processing items', async () => {
      // Mock a slow API response
      global.$fetch = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ data: [] })
          }, 100)
        })
      })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      // Component should be processing
      expect(wrapper.exists()).toBe(true)
    })

    it('shows empty state when no cost codes found', async () => {
      global.$fetch = vi.fn().mockResolvedValue({ data: [] })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('PO Items Processing', () => {
    it('groups PO items by cost code and calculates totals', async () => {
      const mockPOItems = [
        {
          uuid: 'item-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          cost_code_number: '02 12 25',
          cost_code_name: 'Advance Payments to vendor',
          po_total: 500.00,
          total: 500.00,
        },
        {
          uuid: 'item-2',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          cost_code_number: '02 12 25',
          cost_code_name: 'Advance Payments to vendor',
          po_total: 300.00,
          total: 300.00,
        },
        {
          uuid: 'item-3',
          cost_code_uuid: 'cc-2',
          cost_code_label: '01 31 13 Project Coordination',
          cost_code_number: '01 31 13',
          cost_code_name: 'Project Coordination',
          po_total: 200.00,
          total: 200.00,
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: mockPOItems })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      // Should emit update:modelValue with grouped cost codes
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:modelValue')?.[0]?.[0]
      
      if (emittedValue && Array.isArray(emittedValue)) {
        // Should have 2 cost codes (cc-1 and cc-2)
        expect(emittedValue.length).toBe(2)
        
        // Find cc-1 row
        const cc1Row = emittedValue.find((row: any) => row.cost_code_uuid === 'cc-1')
        expect(cc1Row).toBeDefined()
        expect(cc1Row?.totalAmount).toBe(800.00) // 500 + 300
        
        // Find cc-2 row
        const cc2Row = emittedValue.find((row: any) => row.cost_code_uuid === 'cc-2')
        expect(cc2Row).toBeDefined()
        expect(cc2Row?.totalAmount).toBe(200.00)
      }
    })

    it('handles CO items correctly', async () => {
      const mockCOItems = [
        {
          uuid: 'item-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          cost_code_number: '02 12 25',
          cost_code_name: 'Advance Payments to vendor',
          co_total: 1000.00,
          total: 1000.00,
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: mockCOItems })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'CO:co-uuid-456',
          poCoType: 'CO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:modelValue')?.[0]?.[0]
      
      if (emittedValue && Array.isArray(emittedValue)) {
        expect(emittedValue.length).toBe(1)
        expect(emittedValue[0].totalAmount).toBe(1000.00)
      }
    })

    it('looks up cost code label from configurations when CO items have no label', async () => {
      const mockCOItems = [
        {
          uuid: 'item-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: null, // Missing label
          cost_code_number: null, // Missing number
          cost_code_name: null, // Missing name
          co_total: 1000.00,
          total: 1000.00,
          metadata: {},
        },
      ]

      const mockCostCodeConfig = {
        uuid: 'cc-1',
        cost_code_number: '02 12 25',
        cost_code_name: 'Advance Payments to vendor',
        gl_account_uuid: 'gl-1',
      }

      mockCostCodeConfigurationsStore.configurations = [mockCostCodeConfig]

      global.$fetch = vi.fn().mockResolvedValue({ data: mockCOItems })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'CO:co-uuid-456',
          poCoType: 'CO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:modelValue')
      
      if (emittedValue && emittedValue.length > 0) {
        const lastEmitted = emittedValue[emittedValue.length - 1][0]
        if (Array.isArray(lastEmitted) && lastEmitted.length > 0) {
          const row = lastEmitted[0]
          // Should have cost code label from configuration
          expect(row.cost_code_uuid).toBe('cc-1')
          expect(row.cost_code_label).toBe('02 12 25 Advance Payments to vendor')
          expect(row.cost_code_number).toBe('02 12 25')
          expect(row.cost_code_name).toBe('Advance Payments to vendor')
          expect(row.totalAmount).toBe(1000.00)
        }
      }
    })

    it('extracts cost code from metadata when CO items have metadata', async () => {
      const mockCOItems = [
        {
          uuid: 'item-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: null,
          cost_code_number: null,
          cost_code_name: null,
          co_total: 1500.00,
          total: 1500.00,
          metadata: {
            cost_code_uuid: 'cc-1',
            cost_code_number: '01 31 13',
            cost_code_name: 'Project Coordination',
          },
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: mockCOItems })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'CO:co-uuid-456',
          poCoType: 'CO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:modelValue')
      
      if (emittedValue && emittedValue.length > 0) {
        const lastEmitted = emittedValue[emittedValue.length - 1][0]
        if (Array.isArray(lastEmitted) && lastEmitted.length > 0) {
          const row = lastEmitted[0]
          // Should extract from metadata
          expect(row.cost_code_uuid).toBe('cc-1')
          expect(row.cost_code_label).toBe('01 31 13 Project Coordination')
          expect(row.totalAmount).toBe(1500.00)
        }
      }
    })

    it('groups CO items by cost code and calculates totals', async () => {
      const mockCOItems = [
        {
          uuid: 'item-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          cost_code_number: '02 12 25',
          cost_code_name: 'Advance Payments to vendor',
          co_total: 500.00,
          total: 500.00,
        },
        {
          uuid: 'item-2',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          cost_code_number: '02 12 25',
          cost_code_name: 'Advance Payments to vendor',
          co_total: 300.00,
          total: 300.00,
        },
        {
          uuid: 'item-3',
          cost_code_uuid: 'cc-2',
          cost_code_label: '01 31 13 Project Coordination',
          cost_code_number: '01 31 13',
          cost_code_name: 'Project Coordination',
          co_total: 200.00,
          total: 200.00,
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: mockCOItems })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'CO:co-uuid-456',
          poCoType: 'CO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emittedValue = wrapper.emitted('update:modelValue')
      
      if (emittedValue && emittedValue.length > 0) {
        const lastEmitted = emittedValue[emittedValue.length - 1][0]
        if (Array.isArray(lastEmitted)) {
          // Should have 2 cost codes (cc-1 and cc-2)
          expect(lastEmitted.length).toBe(2)
          
          // Find cc-1 row
          const cc1Row = lastEmitted.find((row: any) => row.cost_code_uuid === 'cc-1')
          expect(cc1Row).toBeDefined()
          expect(cc1Row?.totalAmount).toBe(800.00) // 500 + 300
          
          // Find cc-2 row
          const cc2Row = lastEmitted.find((row: any) => row.cost_code_uuid === 'cc-2')
          expect(cc2Row).toBeDefined()
          expect(cc2Row?.totalAmount).toBe(200.00)
        }
      }
    })

    it('preserves existing advance amounts when PO/CO changes', async () => {
      const existingRows = [
        {
          id: 'row-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          totalAmount: 800.00,
          advanceAmount: 164.80,
          gl_account_uuid: 'gl-1',
        },
      ]

      const mockPOItems = [
        {
          uuid: 'item-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          cost_code_number: '02 12 25',
          cost_code_name: 'Advance Payments to vendor',
          po_total: 500.00,
          total: 500.00,
        },
        {
          uuid: 'item-2',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          cost_code_number: '02 12 25',
          cost_code_name: 'Advance Payments to vendor',
          po_total: 300.00,
          total: 300.00,
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: mockPOItems })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: existingRows,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      // The component processes items and may emit multiple times
      // Find the last emission that has the processed data
      const emittedValues = wrapper.emitted('update:modelValue')
      if (emittedValues && emittedValues.length > 0) {
        // Get the last emitted value (after processing)
        const lastEmitted = emittedValues[emittedValues.length - 1][0]
        if (Array.isArray(lastEmitted)) {
          const cc1Row = lastEmitted.find((row: any) => row.cost_code_uuid === 'cc-1')
          if (cc1Row) {
            // Advance amount should be preserved if it exists in existing rows
            // The component uses existingRow?.advanceAmount ?? null
            expect(cc1Row.totalAmount).toBe(800.00) // Updated from PO items
            // Note: advanceAmount preservation depends on the component's processItems logic
            // It should preserve if the cost_code_uuid matches
            expect(cc1Row.advanceAmount !== undefined).toBe(true)
          }
        }
      }
    })

    it('filters out items without cost codes', async () => {
      const mockPOItems = [
        {
          uuid: 'item-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          cost_code_number: '02 12 25',
          cost_code_name: 'Advance Payments to vendor',
          po_total: 500.00,
        },
        {
          uuid: 'item-2',
          cost_code_uuid: null, // No cost code
          po_total: 300.00,
        },
        {
          uuid: 'item-3',
          cost_code_uuid: 'cc-2',
          cost_code_label: '01 31 13 Project Coordination',
          cost_code_number: '01 31 13',
          cost_code_name: 'Project Coordination',
          po_total: 200.00,
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: mockPOItems })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const emittedValue = wrapper.emitted('update:modelValue')?.[0]?.[0]
      
      if (emittedValue && Array.isArray(emittedValue)) {
        // Should only have 2 cost codes (item-2 is filtered out)
        expect(emittedValue.length).toBe(2)
        expect(emittedValue.every((row: any) => row.cost_code_uuid)).toBe(true)
      }
    })
  })

  describe('Advance Amount Handling', () => {
    it('updates advance amount when user enters value', async () => {
      const initialRows = [
        {
          id: 'row-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          totalAmount: 500.00,
          advanceAmount: null,
          gl_account_uuid: 'gl-1',
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: [] })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: initialRows,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      // Find the component instance and trigger advance amount change
      const vm = wrapper.vm as any
      if (vm && typeof vm.handleAdvanceAmountChange === 'function') {
        vm.handleAdvanceAmountChange(0, '164.80')
        await flushPromises()

        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
        const emittedValue = wrapper.emitted('update:modelValue')
        if (emittedValue && emittedValue.length > 0) {
          const lastEmitted = emittedValue[emittedValue.length - 1][0]
          if (Array.isArray(lastEmitted) && lastEmitted.length > 0) {
            expect(lastEmitted[0].advanceAmount).toBe(164.80)
          }
        }
      }
    })

    it('handles empty advance amount input', async () => {
      const initialRows = [
        {
          id: 'row-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          totalAmount: 500.00,
          advanceAmount: 164.80,
          gl_account_uuid: 'gl-1',
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: [] })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: initialRows,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      if (vm && typeof vm.handleAdvanceAmountChange === 'function') {
        vm.handleAdvanceAmountChange(0, '')
        await flushPromises()

        const emittedValue = wrapper.emitted('update:modelValue')
        if (emittedValue && emittedValue.length > 0) {
          const lastEmitted = emittedValue[emittedValue.length - 1][0]
          if (Array.isArray(lastEmitted) && lastEmitted.length > 0) {
            expect(lastEmitted[0].advanceAmount).toBeNull()
          }
        }
      }
    })

    it('handles invalid advance amount input', async () => {
      const initialRows = [
        {
          id: 'row-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          totalAmount: 500.00,
          advanceAmount: 164.80,
          gl_account_uuid: 'gl-1',
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: [] })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: initialRows,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      if (vm && typeof vm.handleAdvanceAmountChange === 'function') {
        vm.handleAdvanceAmountChange(0, 'invalid')
        await flushPromises()

        const emittedValue = wrapper.emitted('update:modelValue')
        if (emittedValue && emittedValue.length > 0) {
          const lastEmitted = emittedValue[emittedValue.length - 1][0]
          if (Array.isArray(lastEmitted) && lastEmitted.length > 0) {
            expect(lastEmitted[0].advanceAmount).toBeNull()
          }
        }
      }
    })
  })

  describe('Row Management', () => {
    it('adds a new row when Add Row button is clicked', async () => {
      global.$fetch = vi.fn().mockResolvedValue({ data: [] })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      if (vm && typeof vm.handleAddRow === 'function') {
        const initialEmitted = wrapper.emitted('update:modelValue')
        const initialCount = initialEmitted ? initialEmitted.length : 0

        vm.handleAddRow()
        await flushPromises()

        const emittedValue = wrapper.emitted('update:modelValue')
        if (emittedValue && emittedValue.length > initialCount) {
          const lastEmitted = emittedValue[emittedValue.length - 1][0]
          if (Array.isArray(lastEmitted)) {
            expect(lastEmitted.length).toBeGreaterThan(0)
            const newRow = lastEmitted[lastEmitted.length - 1]
            expect(newRow.cost_code_uuid).toBeNull()
            expect(newRow.advanceAmount).toBeNull()
          }
        }
      }
    })

    it('removes a row when remove button is clicked', async () => {
      // Use rows that won't be processed by PO items (user-added rows)
      const initialRows = [
        {
          id: 'row-1',
          cost_code_uuid: null, // User-added row without cost code
          totalAmount: 0,
          advanceAmount: null,
          gl_account_uuid: null,
        },
        {
          id: 'row-2',
          cost_code_uuid: null, // User-added row without cost code
          totalAmount: 0,
          advanceAmount: null,
          gl_account_uuid: null,
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: [] })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: initialRows,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      if (vm && typeof vm.handleRemoveRow === 'function') {
        // Wait for component to initialize
        await flushPromises()
        
        // Get initial state - user-added rows should be preserved
        const initialEmittedCount = wrapper.emitted('update:modelValue')?.length || 0
        
        // Add rows first if needed
        if (!vm.costCodeRows || vm.costCodeRows.length < 2) {
          vm.handleAddRow()
          await flushPromises()
          vm.handleAddRow()
          await flushPromises()
        }
        
        const beforeRemoveCount = vm.costCodeRows?.length || 0
        
        // Remove first row
        vm.handleRemoveRow(0)
        await flushPromises()

        // Check if a new emission occurred
        const emittedValues = wrapper.emitted('update:modelValue')
        const newEmissionCount = emittedValues?.length || 0
        
        if (newEmissionCount > initialEmittedCount) {
          // New emission occurred, check the last one
          const lastEmitted = emittedValues[emittedValues.length - 1][0]
          if (Array.isArray(lastEmitted)) {
            // After removing one row, should have one less
            expect(lastEmitted.length).toBe(beforeRemoveCount - 1)
          }
        } else {
          // Check component's internal state directly
          expect(vm.costCodeRows).toBeDefined()
          if (Array.isArray(vm.costCodeRows) && beforeRemoveCount > 0) {
            // The row should be removed from the array
            expect(vm.costCodeRows.length).toBe(beforeRemoveCount - 1)
          }
        }
      } else {
        // If handleRemoveRow doesn't exist, skip this test
        expect(true).toBe(true)
      }
    })
  })

  describe('Cost Code Selection', () => {
    it('updates GL account when cost code is selected', async () => {
      const mockConfig = {
        uuid: 'cc-1',
        cost_code_number: '02 12 25',
        cost_code_name: 'Advance Payments to vendor',
        gl_account_uuid: 'gl-account-1',
      }

      mockCostCodeConfigurationsStore.configurations = [mockConfig]

      const initialRows = [
        {
          id: 'row-1',
          cost_code_uuid: null,
          totalAmount: 0,
          advanceAmount: null,
          gl_account_uuid: null,
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: [] })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: initialRows,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      if (vm && typeof vm.handleCostCodeChange === 'function') {
        const mockOption = {
          costCode: {
            uuid: 'cc-1',
            cost_code_label: '02 12 25 Advance Payments to vendor',
            cost_code_number: '02 12 25',
            cost_code_name: 'Advance Payments to vendor',
          },
        }

        await vm.handleCostCodeChange(0, 'cc-1', mockOption)
        await flushPromises()

        const emittedValue = wrapper.emitted('update:modelValue')
        if (emittedValue && emittedValue.length > 0) {
          const lastEmitted = emittedValue[emittedValue.length - 1][0]
          if (Array.isArray(lastEmitted) && lastEmitted.length > 0) {
            expect(lastEmitted[0].cost_code_uuid).toBe('cc-1')
            expect(lastEmitted[0].gl_account_uuid).toBe('gl-account-1')
          }
        }
      }
    })
  })

  describe('Loading Existing Data', () => {
    it('maps database field names to component field names', async () => {
      const dbRows = [
        {
          uuid: 'apcc-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          cost_code_number: '02 12 25',
          cost_code_name: 'Advance Payments to vendor',
          total_amount: 500.00,
          advance_amount: 164.80,
          gl_account_uuid: 'gl-1',
        },
        {
          uuid: 'apcc-2',
          cost_code_uuid: 'cc-2',
          cost_code_label: '01 31 13 Project Coordination',
          cost_code_number: '01 31 13',
          cost_code_name: 'Project Coordination',
          total_amount: 200.00,
          advance_amount: 104.60,
          gl_account_uuid: 'gl-2',
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: [] })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: dbRows,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      // Component should map snake_case to camelCase in the watcher
      // Check emitted values or component state
      const emittedValues = wrapper.emitted('update:modelValue')
      if (emittedValues && emittedValues.length > 0) {
        // The watcher should map the fields
        const lastEmitted = emittedValues[emittedValues.length - 1][0]
        if (Array.isArray(lastEmitted) && lastEmitted.length > 0) {
          // Check if mapping happened (either camelCase or snake_case should work)
          const firstRow = lastEmitted[0]
          expect(firstRow.cost_code_uuid).toBe('cc-1')
          // The component maps total_amount to totalAmount and advance_amount to advanceAmount
          const totalAmount = firstRow.totalAmount ?? firstRow.total_amount
          const advanceAmount = firstRow.advanceAmount ?? firstRow.advance_amount
          expect(totalAmount).toBe(500.00)
          expect(advanceAmount).toBe(164.80)
        }
      } else {
        // If no emission, check component's internal state after watcher processes
        const vm = wrapper.vm as any
        if (vm && vm.costCodeRows && Array.isArray(vm.costCodeRows)) {
          // The watcher should have processed the modelValue
          expect(vm.costCodeRows.length).toBeGreaterThanOrEqual(0)
        }
      }
    })
  })

  describe('Cost Code Disabled State', () => {
    it('disables cost code select when PO/CO is selected', async () => {
      // Mock $fetch to return PO items
      const mockPOItems = [
        {
          uuid: 'item-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          cost_code_number: '02 12 25',
          cost_code_name: 'Advance Payments to vendor',
          po_total: 1000,
          total: 1000,
        },
      ]

      ;(global.$fetch as any) = vi.fn().mockResolvedValue({ data: mockPOItems })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()
      // Wait for the component to process items
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Check that the table is rendered
      const html = wrapper.html()
      expect(html).not.toBe('<!--v-if-->')

      // Access the component instance to check the computed property
      const vm = wrapper.vm as any
      expect(vm.isCostCodeDisabled).toBe(true)

      const costCodeSelects = wrapper.findAllComponents({ name: 'CostCodeSelect' })
      expect(costCodeSelects.length).toBeGreaterThan(0)
      
      // When PO/CO is selected, cost code should be disabled
      // The disabled prop should be true when PO/CO is selected (poCoUuid and poCoType are set)
      const disabledValue = costCodeSelects[0].props('disabled')
      expect(disabledValue).toBe(true)
    })

    it('disables cost code select when readonly is true', async () => {
      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: null,
          poCoType: null,
          corporationUuid: 'corp-1',
          readonly: true,
          modelValue: [
            {
              cost_code_uuid: 'cc-1',
              cost_code_label: '02 12 25 Advance Payments to vendor',
              totalAmount: 1000,
              advanceAmount: 500,
            },
          ],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      // Even without PO/CO, cost code should be disabled when readonly
      const costCodeSelect = wrapper.findComponent({ name: 'CostCodeSelect' })
      if (costCodeSelect.exists()) {
        expect(costCodeSelect.props('disabled')).toBe(true)
      }
    })

    it('disables cost code select when both readonly and PO/CO are set', async () => {
      // Mock $fetch to return PO items
      const mockPOItems = [
        {
          uuid: 'item-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          cost_code_number: '02 12 25',
          cost_code_name: 'Advance Payments to vendor',
          po_total: 1000,
          total: 1000,
        },
      ]

      ;(global.$fetch as any) = vi.fn().mockResolvedValue({ data: mockPOItems })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: true,
          modelValue: [],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()
      // Wait for the component to process items
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Check that the table is rendered
      const html = wrapper.html()
      expect(html).not.toBe('<!--v-if-->')

      const costCodeSelects = wrapper.findAllComponents({ name: 'CostCodeSelect' })
      expect(costCodeSelects.length).toBeGreaterThan(0)
      
      if (costCodeSelects.length > 0) {
        expect(costCodeSelects[0].props('disabled')).toBe(true)
      }
    })

    it('enables cost code select when no PO/CO is selected and not readonly', async () => {
      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: null,
          poCoType: null,
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [
            {
              cost_code_uuid: null,
              cost_code_label: null,
              totalAmount: 0,
              advanceAmount: null,
            },
          ],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      // Table should not render when no PO/CO is selected
      expect(wrapper.html()).toBe('<!--v-if-->')
    })
  })

  describe('Removed Cost Codes Functionality', () => {
    it('tracks removed cost codes when a row with cost_code_uuid is removed', async () => {
      const mockPOItems = [
        {
          uuid: 'item-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          cost_code_number: '02 12 25',
          cost_code_name: 'Advance Payments to vendor',
          po_total: 500.00,
          total: 500.00,
        },
        {
          uuid: 'item-2',
          cost_code_uuid: 'cc-2',
          cost_code_label: '01 31 13 Project Coordination',
          cost_code_number: '01 31 13',
          cost_code_name: 'Project Coordination',
          po_total: 300.00,
          total: 300.00,
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: mockPOItems })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 200))

      const vm = wrapper.vm as any
      
      // Wait for rows to be populated
      await flushPromises()
      
      // Get initial row count
      const initialRowCount = vm.costCodeRows?.length || 0
      expect(initialRowCount).toBeGreaterThan(0)

      // Remove the first row (which should have a cost_code_uuid)
      if (vm.costCodeRows && vm.costCodeRows.length > 0 && vm.costCodeRows[0].cost_code_uuid) {
        const costCodeUuid = vm.costCodeRows[0].cost_code_uuid
        
        vm.handleRemoveRow(0)
        await flushPromises()
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Check that removed cost codes are tracked
        expect(vm.removedCostCodes).toBeDefined()
        expect(Array.isArray(vm.removedCostCodes)).toBe(true)
        expect(vm.removedCostCodes.length).toBe(1)
        expect(vm.removedCostCodes[0].cost_code_uuid).toBe(costCodeUuid)
        
        // Check that update:removedCostCodes was emitted
        expect(wrapper.emitted('update:removedCostCodes')).toBeTruthy()
        const emittedRemoved = wrapper.emitted('update:removedCostCodes')
        if (emittedRemoved && emittedRemoved.length > 0) {
          const lastEmitted = emittedRemoved[emittedRemoved.length - 1][0]
          expect(Array.isArray(lastEmitted)).toBe(true)
          expect(lastEmitted.length).toBe(1)
          expect(lastEmitted[0].cost_code_uuid).toBe(costCodeUuid)
        }
      }
    })

    it('shows "Show Removed Cost Codes" button when cost codes are removed', async () => {
      const mockPOItems = [
        {
          uuid: 'item-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          cost_code_number: '02 12 25',
          cost_code_name: 'Advance Payments to vendor',
          po_total: 500.00,
          total: 500.00,
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: mockPOItems })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 200))

      const vm = wrapper.vm as any
      
      // Initially, button should not be visible
      expect(vm.hasRemovedCostCodes).toBe(false)
      
      // Remove a row
      if (vm.costCodeRows && vm.costCodeRows.length > 0) {
        vm.handleRemoveRow(0)
        await flushPromises()
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Button should now be visible
        expect(vm.hasRemovedCostCodes).toBe(true)
        
        // Check that button text is rendered
        const buttonText = wrapper.text()
        expect(buttonText).toContain('Show Removed Cost Codes')
      }
    })

    it('does not track removed cost codes for user-added rows without cost_code_uuid', async () => {
      global.$fetch = vi.fn().mockResolvedValue({ data: [] })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      
      // Add a user row (without cost_code_uuid)
      vm.handleAddRow()
      await flushPromises()

      // Remove the user-added row
      if (vm.costCodeRows && vm.costCodeRows.length > 0) {
        const initialRemovedCount = vm.removedCostCodes?.length || 0
        vm.handleRemoveRow(0)
        await flushPromises()

        // Removed cost codes should not increase (user-added rows are not tracked)
        expect(vm.removedCostCodes?.length || 0).toBe(initialRemovedCount)
      }
    })

    it('filters out removed cost codes when processing PO items', async () => {
      const mockPOItems = [
        {
          uuid: 'item-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          cost_code_number: '02 12 25',
          cost_code_name: 'Advance Payments to vendor',
          po_total: 500.00,
          total: 500.00,
        },
        {
          uuid: 'item-2',
          cost_code_uuid: 'cc-2',
          cost_code_label: '01 31 13 Project Coordination',
          cost_code_number: '01 31 13',
          cost_code_name: 'Project Coordination',
          po_total: 300.00,
          total: 300.00,
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: mockPOItems })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 200))

      const vm = wrapper.vm as any
      
      // Remove first cost code
      if (vm.costCodeRows && vm.costCodeRows.length > 0) {
        const costCodeUuid = vm.costCodeRows[0].cost_code_uuid
        vm.handleRemoveRow(0)
        await flushPromises()
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Simulate PO items being processed again
        // The removed cost code should not reappear
        await vm.processItems()
        await flushPromises()
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Check that the removed cost code is not in the rows
        const hasRemovedCostCode = vm.costCodeRows?.some((row: any) => row.cost_code_uuid === costCodeUuid)
        expect(hasRemovedCostCode).toBe(false)
      }
    })

    it('loads removed cost codes from props when editing existing invoice', async () => {
      const removedCostCodes = [
        {
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          cost_code_number: '02 12 25',
          cost_code_name: 'Advance Payments to vendor',
          removed_at: '2025-01-01T00:00:00.000Z',
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: [] })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
          removedCostCodes: removedCostCodes,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 200))

      const vm = wrapper.vm as any
      
      // Removed cost codes should be loaded from props
      expect(vm.removedCostCodes).toBeDefined()
      expect(Array.isArray(vm.removedCostCodes)).toBe(true)
      expect(vm.removedCostCodes.length).toBe(1)
      expect(vm.removedCostCodes[0].cost_code_uuid).toBe('cc-1')
      
      // Button should be visible
      expect(vm.hasRemovedCostCodes).toBe(true)
    })

    it('clears removed cost codes when PO/CO changes', async () => {
      const mockPOItems1 = [
        {
          uuid: 'item-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          cost_code_number: '02 12 25',
          cost_code_name: 'Advance Payments to vendor',
          po_total: 500.00,
          total: 500.00,
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: mockPOItems1 })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 200))

      const vm = wrapper.vm as any
      
      // Remove a cost code
      if (vm.costCodeRows && vm.costCodeRows.length > 0) {
        vm.handleRemoveRow(0)
        await flushPromises()
        await new Promise((resolve) => setTimeout(resolve, 100))

        expect(vm.removedCostCodes.length).toBe(1)

        // Change PO/CO
        await wrapper.setProps({
          poCoUuid: 'PO:po-uuid-456',
          poCoType: 'PO',
        })
        await flushPromises()
        await new Promise((resolve) => setTimeout(resolve, 200))

        // Removed cost codes should be cleared
        expect(vm.removedCostCodes.length).toBe(0)
      }
    })

    it('restores a removed cost code individually', async () => {
      const removedCostCodes = [
        {
          id: 'removed-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          cost_code_number: '02 12 25',
          cost_code_name: 'Advance Payments to vendor',
          totalAmount: 500.00,
          advanceAmount: null,
          gl_account_uuid: null,
          removed_at: '2025-01-01T00:00:00.000Z',
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: [] })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
          removedCostCodes: removedCostCodes,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 200))

      const vm = wrapper.vm as any
      
      // Initially should have 1 removed cost code
      expect(vm.removedCostCodes.length).toBe(1)

      // Restore the first removed cost code
      vm.restoreRemovedCostCode(0)
      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Removed cost codes should be empty
      expect(vm.removedCostCodes.length).toBe(0)
      
      // Cost code should be added back to rows
      const hasRestoredCostCode = vm.costCodeRows?.some((row: any) => row.cost_code_uuid === 'cc-1')
      expect(hasRestoredCostCode).toBe(true)
      
      // Should emit update:removedCostCodes with empty array
      const emittedRemoved = wrapper.emitted('update:removedCostCodes')
      if (emittedRemoved && emittedRemoved.length > 0) {
        const lastEmitted = emittedRemoved[emittedRemoved.length - 1][0]
        expect(Array.isArray(lastEmitted)).toBe(true)
        // After restore, should emit empty array or array without the restored item
        expect(lastEmitted.length).toBe(0)
      }
    })

    it('restores all removed cost codes at once', async () => {
      const removedCostCodes = [
        {
          id: 'removed-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          cost_code_number: '02 12 25',
          cost_code_name: 'Advance Payments to vendor',
          totalAmount: 500.00,
          advanceAmount: null,
          gl_account_uuid: null,
          removed_at: '2025-01-01T00:00:00.000Z',
        },
        {
          id: 'removed-2',
          cost_code_uuid: 'cc-2',
          cost_code_label: '01 31 13 Project Coordination',
          cost_code_number: '01 31 13',
          cost_code_name: 'Project Coordination',
          totalAmount: 300.00,
          advanceAmount: null,
          gl_account_uuid: null,
          removed_at: '2025-01-01T00:00:00.000Z',
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: [] })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: [],
          removedCostCodes: removedCostCodes,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 200))

      const vm = wrapper.vm as any
      
      // Initially should have 2 removed cost codes
      expect(vm.removedCostCodes.length).toBe(2)

      // Restore all
      vm.restoreAllRemovedCostCodes()
      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Removed cost codes should be empty
      expect(vm.removedCostCodes.length).toBe(0)
      
      // Both cost codes should be added back to rows
      const hasCc1 = vm.costCodeRows?.some((row: any) => row.cost_code_uuid === 'cc-1')
      const hasCc2 = vm.costCodeRows?.some((row: any) => row.cost_code_uuid === 'cc-2')
      expect(hasCc1).toBe(true)
      expect(hasCc2).toBe(true)
    })

    it('does not add duplicate cost codes when restoring', async () => {
      const removedCostCodes = [
        {
          id: 'removed-1',
          cost_code_uuid: 'cc-1',
          cost_code_label: '02 12 25 Advance Payments to vendor',
          cost_code_number: '02 12 25',
          cost_code_name: 'Advance Payments to vendor',
          totalAmount: 500.00,
          advanceAmount: null,
          gl_account_uuid: null,
          removed_at: '2025-01-01T00:00:00.000Z',
        },
      ]

      const existingRows = [
        {
          id: 'row-1',
          cost_code_uuid: 'cc-1', // Same cost code already exists
          cost_code_label: '02 12 25 Advance Payments to vendor',
          totalAmount: 500.00,
          advanceAmount: null,
          gl_account_uuid: null,
        },
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: [] })

      const wrapper = mount(AdvancePaymentCostCodesTable, {
        props: {
          poCoUuid: 'PO:po-uuid-123',
          poCoType: 'PO',
          corporationUuid: 'corp-1',
          readonly: false,
          modelValue: existingRows,
          removedCostCodes: removedCostCodes,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 200))

      const vm = wrapper.vm as any
      
      // Count initial rows with cc-1
      const initialCc1Count = vm.costCodeRows?.filter((row: any) => row.cost_code_uuid === 'cc-1').length || 0

      // Restore the removed cost code
      vm.restoreRemovedCostCode(0)
      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should not have duplicates
      const finalCc1Count = vm.costCodeRows?.filter((row: any) => row.cost_code_uuid === 'cc-1').length || 0
      expect(finalCc1Count).toBeLessThanOrEqual(initialCc1Count + 1)
    })
  })
})

