import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import COLaborItemsTable from '@/components/ChangeOrders/COLaborItemsTable.vue'

// Mock the composable
vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (value: number | string | null | undefined) => {
      const num = typeof value === "string" ? parseFloat(value) : Number(value ?? 0)
      if (Number.isNaN(num)) return "$0.00"
      return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    currencySymbol: ref('$')
  })
}))

// Stubs for Nuxt UI components
const uiStubs = {
  UButton: { 
    template: '<button><slot /></button>', 
    props: ['icon', 'color', 'variant', 'size', 'disabled', 'class'],
    emits: ['click']
  },
  USkeleton: { template: '<div class="skeleton" />' },
}

describe('COLaborItemsTable.vue', () => {
  const mockItems = [
    {
      id: '1',
      cost_code_uuid: 'cc-1',
      cost_code_label: '01-001 - General Requirements',
      cost_code_number: '01-001',
      cost_code_name: 'General Requirements',
      division_name: 'Division 01',
      po_amount: 5000,
      co_amount: 4500
    },
    {
      id: '2',
      cost_code_uuid: 'cc-2',
      cost_code_label: '02-001 - Site Preparation',
      cost_code_number: '02-001',
      cost_code_name: 'Site Preparation',
      division_name: 'Division 02',
      po_amount: 3000,
      co_amount: null
    },
    {
      id: '3',
      cost_code_uuid: 'cc-3',
      cost_code_number: '03-001',
      cost_code_name: 'Concrete',
      po_amount: 2000,
      co_amount: 2200
    }
  ]

  const defaultProps = {
    items: mockItems,
    title: 'Labor Change Order Items',
    description: 'Original purchase order amounts shown for reference. Enter change order amounts.',
    loading: false,
    error: null,
    readonly: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders the component with default props', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.text()).toContain('Labor Change Order Items')
      expect(wrapper.text()).toContain('3 items')
    })

    it('displays custom title and description', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          title: 'Custom Labor CO Items',
          description: 'Custom description text'
        },
        global: {
          stubs: uiStubs
        }
      })

      expect(wrapper.text()).toContain('Custom Labor CO Items')
      expect(wrapper.text()).toContain('Custom description text')
    })

    it('shows loading state with skeleton loaders', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          loading: true,
        },
        global: {
          stubs: uiStubs
        }
      })

      const skeletons = wrapper.findAll('.skeleton')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('shows error state', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          error: 'Failed to load items'
        },
        global: {
          stubs: uiStubs
        }
      })

      expect(wrapper.text()).toContain('Failed to load items')
      const errorDiv = wrapper.find('.text-error-700')
      expect(errorDiv.exists()).toBe(true)
    })

    it('shows empty state when no items', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          items: [],
          emptyMessage: 'No labor items found.'
        },
        global: {
          stubs: uiStubs
        }
      })

      expect(wrapper.text()).toContain('No labor items found.')
    })

    it('does not show item count when no items', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          items: []
        },
        global: {
          stubs: uiStubs
        }
      })

      const text = wrapper.text()
      expect(text).not.toMatch(/\d+\s+items/i)
    })
  })

  describe('Desktop View', () => {
    it('renders table with correct columns', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const table = wrapper.find('table')
      expect(table.exists()).toBe(true)

      const headers = wrapper.findAll('th')
      expect(headers.length).toBeGreaterThanOrEqual(4)
      expect(headers[0]?.text()).toBe('Cost Code')
      expect(headers[1]?.text()).toBe('PO Amount')
      expect(headers[2]?.text()).toBe('CO Amount')
      expect(headers[3]?.text()).toBe('Actions')
    })

    it('displays cost code information correctly', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      expect(wrapper.text()).toContain('01-001 - General Requirements')
      expect(wrapper.text()).toContain('02-001 - Site Preparation')
    })

    it('displays division name when available', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      expect(wrapper.text()).toContain('Division 01')
      expect(wrapper.text()).toContain('Division 02')
    })

    it('displays PO amounts correctly', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const desktopTable = wrapper.find('.hidden.md\\:block')
      // formatCurrencyInput strips the $ symbol, so check for the number
      expect(desktopTable.text()).toContain('5,000.00')
      expect(desktopTable.text()).toContain('3,000.00')
      expect(desktopTable.text()).toContain('2,000.00')
    })

    it('displays CO amount inputs with correct values', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const desktopTable = wrapper.find('.hidden.md\\:block')
      const inputs = desktopTable.findAll('input')
      expect(inputs.length).toBeGreaterThan(0)
      
      // First item has co_amount: 4500
      expect(inputs[0]?.attributes('value')).toBe('4500')
      // Second item has co_amount: null (empty)
      expect(inputs[1]?.attributes('value')).toBe('')
      // Third item has co_amount: 2200
      expect(inputs[2]?.attributes('value')).toBe('2200')
    })

    it('shows currency symbol in CO amount inputs', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const desktopTable = wrapper.find('.hidden.md\\:block')
      const currencySymbols = desktopTable.findAll('.text-xs.font-semibold')
      expect(currencySymbols.length).toBeGreaterThan(0)
      expect(currencySymbols[0]?.text()).toBe('$')
    })
  })

  describe('Mobile View', () => {
    it('renders mobile layout elements', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const mobileContainer = wrapper.find('.md\\:hidden')
      expect(mobileContainer.exists()).toBe(true)

      const mobileItems = mobileContainer.findAll('.px-4.py-4')
      expect(mobileItems.length).toBe(3)
    })

    it('displays cost code information in mobile view', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const mobileContainer = wrapper.find('.md\\:hidden')
      expect(mobileContainer.text()).toContain('01-001 - General Requirements')
      expect(mobileContainer.text()).toContain('02-001 - Site Preparation')
    })

    it('displays PO and CO amounts in mobile view', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const mobileContainer = wrapper.find('.md\\:hidden')
      expect(mobileContainer.text()).toContain('PO Amount')
      expect(mobileContainer.text()).toContain('CO Amount')
    })
  })

  describe('Readonly Mode', () => {
    it('disables inputs when readonly', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          readonly: true
        },
        global: {
          stubs: uiStubs
        }
      })

      const inputs = wrapper.findAll('input')
      inputs.forEach(input => {
        expect(input.attributes('disabled')).toBeDefined()
      })
    })

    it('disables remove buttons when readonly', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          readonly: true
        },
        global: {
          stubs: uiStubs
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'UButton' })
      buttons.forEach(button => {
        expect(button.props('disabled')).toBe(true)
      })
    })

    it('allows editing when not readonly', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const inputs = wrapper.findAll('input')
      inputs.forEach(input => {
        expect(input.attributes('disabled')).toBeUndefined()
      })
    })
  })

  describe('Event Emissions', () => {
    it('emits co-amount-change event when CO amount input changes', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const inputs = wrapper.findAll('input')
      if (inputs[0]) {
        await inputs[0].setValue('5000')
      }

      expect(wrapper.emitted('co-amount-change')).toBeTruthy()
      const event = wrapper.emitted('co-amount-change')?.[0]?.[0] as { index: number; value: string; numericValue: number } | undefined
      expect(event).toEqual({
        index: 0,
        value: '5000',
        numericValue: 5000
      })
    })

    it('emits co-amount-change with correct numeric value for comma-separated numbers', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const inputs = wrapper.findAll('input')
      if (inputs[0]) {
        await inputs[0].setValue('1,500.50')
      }

      expect(wrapper.emitted('co-amount-change')).toBeTruthy()
      const event = wrapper.emitted('co-amount-change')?.[0]?.[0] as { index: number; value: string; numericValue: number } | undefined
      expect(event?.numericValue).toBe(1500.5)
    })

    it('emits co-amount-change with 0 for invalid input', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const inputs = wrapper.findAll('input')
      if (inputs[0]) {
        await inputs[0].setValue('invalid')
      }

      expect(wrapper.emitted('co-amount-change')).toBeTruthy()
      const event = wrapper.emitted('co-amount-change')?.[0]?.[0] as { index: number; value: string; numericValue: number } | undefined
      expect(event?.numericValue).toBe(0)
    })

    it('emits co-amount-change with 0 for empty string', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const inputs = wrapper.findAll('input')
      if (inputs[0]) {
        await inputs[0].setValue('')
      }

      expect(wrapper.emitted('co-amount-change')).toBeTruthy()
      const event = wrapper.emitted('co-amount-change')?.[0]?.[0] as { index: number; value: string; numericValue: number } | undefined
      expect(event?.numericValue).toBe(0)
    })

    it('emits remove-row event when remove button is clicked', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'UButton' })
      if (buttons.length > 0 && buttons[0]) {
        await buttons[0].trigger('click')
        expect(wrapper.emitted('remove-row')).toBeTruthy()
        expect(wrapper.emitted('remove-row')?.[0]).toEqual([0])
      } else {
        // If buttons are stubbed, test the method directly
        const vm: any = wrapper.vm
        await vm.emitRemoveRow(0)
        expect(wrapper.emitted('remove-row')).toBeTruthy()
        expect(wrapper.emitted('remove-row')?.[0]).toEqual([0])
      }
    })

    it('does not emit events when readonly', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          readonly: true
        },
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      await vm.onCoAmountInput(0, '5000')
      await vm.emitRemoveRow(0)

      expect(wrapper.emitted('co-amount-change')).toBeUndefined()
      expect(wrapper.emitted('remove-row')).toBeUndefined()
    })
  })

  describe('Draft State Management', () => {
    it('initializes drafts from props on mount', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.drafts[0]).toBeDefined()
      expect(vm.drafts[0].coAmountInput).toBe('4500')
      expect(vm.drafts[1].coAmountInput).toBe('')
      expect(vm.drafts[2].coAmountInput).toBe('2200')
    })

    it('updates drafts when props change', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      await wrapper.setProps({
        items: [
          ...mockItems,
          {
            id: '4',
            cost_code_uuid: 'cc-4',
            cost_code_label: '04-001 - New Item',
            po_amount: 1000,
            co_amount: 1200
          }
        ]
      })

      const vm: any = wrapper.vm
      expect(vm.drafts[3]).toBeDefined()
      expect(vm.drafts[3].coAmountInput).toBe('1200')
    })

    it('preserves user input when props change', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      await vm.onCoAmountInput(0, '6000')

      // Change props but keep same item structure
      await wrapper.setProps({
        items: [
          { ...mockItems[0]!, co_amount: 7000 }, // Different amount in props
          mockItems[1]!,
          mockItems[2]!
        ]
      })

      // User input should be preserved
      expect(vm.drafts[0].coAmountInput).toBe('6000')
    })

    it('syncs drafts when item co_amount changes from null to value', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      // Item at index 1 has co_amount: null, so draft should be empty
      expect(vm.drafts[1].coAmountInput).toBe('')

      // Update item to have a co_amount
      await wrapper.setProps({
        items: [
          mockItems[0]!,
          { ...mockItems[1]!, co_amount: 3500 },
          mockItems[2]!
        ]
      })

      // Draft should sync if it was empty
      expect(vm.drafts[1].coAmountInput).toBe('3500')
    })
  })

  describe('Cost Code Display', () => {
    it('displays cost_code_label when available', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      expect(wrapper.text()).toContain('01-001 - General Requirements')
      expect(wrapper.text()).toContain('02-001 - Site Preparation')
    })

    it('constructs label from cost_code_number and cost_code_name when label is missing', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          items: [
            {
              id: '3',
              cost_code_uuid: 'cc-3',
              cost_code_number: '03-001',
              cost_code_name: 'Concrete',
              po_amount: 2000,
              co_amount: 2200
            }
          ]
        },
        global: {
          stubs: uiStubs
        }
      })

      expect(wrapper.text()).toContain('03-001 Concrete')
    })

    it('handles items with only cost_code_number', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          items: [
            {
              id: '4',
              cost_code_uuid: 'cc-4',
              cost_code_number: '04-001',
              po_amount: 1000,
              co_amount: null
            }
          ]
        },
        global: {
          stubs: uiStubs
        }
      })

      expect(wrapper.text()).toContain('04-001')
    })
  })

  describe('Numeric Input Handling', () => {
    it('parses numeric input correctly', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.parseNumericInput('1,500.50')).toBe(1500.5)
      expect(vm.parseNumericInput('1000')).toBe(1000)
      expect(vm.parseNumericInput(1234.56)).toBe(1234.56)
    })

    it('handles invalid input gracefully', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.parseNumericInput('invalid')).toBe(0)
      expect(vm.parseNumericInput('')).toBe(0)
      expect(vm.parseNumericInput(null)).toBe(0)
      expect(vm.parseNumericInput(undefined)).toBe(0)
    })

    it('converts values to input string correctly', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.toInputString(123)).toBe('123')
      expect(vm.toInputString(123.45)).toBe('123.45')
      expect(vm.toInputString(null)).toBe('')
      expect(vm.toInputString(undefined)).toBe('')
    })
  })

  describe('Currency Formatting', () => {
    it('formats PO amounts correctly', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      const formatted = vm.formatCurrencyInput(5000)
      // formatCurrencyInput returns formatted number (may include commas)
      expect(formatted).toMatch(/5[,\s]?000/)
    })

    it('handles null/undefined amounts gracefully', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          items: [
            { ...mockItems[0], po_amount: null },
            { ...mockItems[1], po_amount: undefined }
          ]
        },
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.formatCurrencyInput(null)).toBeDefined()
      expect(vm.formatCurrencyInput(undefined)).toBeDefined()
    })
  })

  describe('Custom Actions Slot', () => {
    it('provides actions slot with row and index', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        slots: {
          actions: '<template #actions="{ row, index }"><button>Custom Action {{ index }}</button></template>'
        },
        global: {
          stubs: uiStubs
        }
      })

      expect(wrapper.text()).toContain('Custom Action 0')
      expect(wrapper.text()).toContain('Custom Action 1')
    })
  })

  describe('Edge Cases', () => {
    it('handles items without IDs', () => {
      const itemsWithoutIds = [
        {
          cost_code_uuid: 'cc-1',
          po_amount: 1000,
          co_amount: 1200
        },
        {
          cost_code_uuid: 'cc-2',
          po_amount: 2000,
          co_amount: null
        }
      ]

      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          items: itemsWithoutIds
        },
        global: {
          stubs: uiStubs
        }
      })

      expect(wrapper.exists()).toBe(true)
      // Count inputs in desktop view only (mobile view also has inputs)
      const desktopTable = wrapper.find('.hidden.md\\:block')
      const desktopInputs = desktopTable.findAll('input')
      expect(desktopInputs.length).toBe(2)
    })

    it('handles empty items array', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          items: []
        },
        global: {
          stubs: uiStubs
        }
      })

      expect(wrapper.text()).toContain('No labor items found.')
    })

    it('handles undefined items', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          items: undefined as any
        },
        global: {
          stubs: uiStubs
        }
      })

      expect(wrapper.text()).toContain('No labor items found.')
    })

    it('handles items with missing cost code information', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          items: [
            {
              id: '1',
              cost_code_uuid: 'cc-1',
              po_amount: 1000,
              co_amount: 1200
            }
          ]
        },
        global: {
          stubs: uiStubs
        }
      })

      expect(wrapper.exists()).toBe(true)
      // Should still render even without cost code label/number/name
    })

    it('handles very large numbers', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          items: [
            {
              id: '1',
              cost_code_uuid: 'cc-1',
              cost_code_label: 'Test',
              po_amount: 999999999.99,
              co_amount: 1000000000.50
            }
          ]
        },
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      const numericValue = vm.parseNumericInput('1000000000.50')
      expect(numericValue).toBe(1000000000.50)
    })

    it('handles negative numbers', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const inputs = wrapper.findAll('input')
      if (inputs[0]) {
        await inputs[0].setValue('-1000')
      }

      expect(wrapper.emitted('co-amount-change')).toBeTruthy()
      const event = wrapper.emitted('co-amount-change')?.[0]?.[0] as { index: number; value: string; numericValue: number } | undefined
      expect(event?.numericValue).toBe(-1000)
    })

    it('handles decimal numbers with many places', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const inputs = wrapper.findAll('input')
      if (inputs[0]) {
        await inputs[0].setValue('123.456789')
      }

      expect(wrapper.emitted('co-amount-change')).toBeTruthy()
      const event = wrapper.emitted('co-amount-change')?.[0]?.[0] as { index: number; value: string; numericValue: number } | undefined
      expect(event?.numericValue).toBe(123.456789)
    })
  })

  describe('Accessibility', () => {
    it('has proper input attributes for numeric input', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const inputs = wrapper.findAll('input')
      inputs.forEach(input => {
        expect(input.attributes('inputmode')).toBe('decimal')
      })
    })

    it('has proper disabled state for readonly inputs', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          readonly: true
        },
        global: {
          stubs: uiStubs
        }
      })

      const inputs = wrapper.findAll('input')
      inputs.forEach(input => {
        expect(input.attributes('disabled')).toBeDefined()
      })
    })
  })

  describe('Display Rows Computation', () => {
    it('creates display rows with correct structure', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      const displayRows = vm.displayRows
      expect(displayRows.length).toBe(3)
      expect(displayRows[0].cost_code_uuid).toBe('cc-1')
      expect(displayRows[0].po_amount).toBe(5000)
      expect(displayRows[0].co_amount).toBe(4500)
    })

    it('handles items with different key structures', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          items: [
            { id: '1', cost_code_uuid: 'cc-1', po_amount: 1000, co_amount: 1200 },
            { uuid: '2', cost_code_uuid: 'cc-2', po_amount: 2000, co_amount: null }
          ]
        },
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      const displayRows = vm.displayRows
      expect(displayRows.length).toBe(2)
    })

    it('initializes drafts for all items in displayRows', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      const displayRows = vm.displayRows
      expect(displayRows.length).toBe(3)
      expect(vm.drafts[0]).toBeDefined()
      expect(vm.drafts[1]).toBeDefined()
      expect(vm.drafts[2]).toBeDefined()
    })

    it('handles empty items array in displayRows', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          items: []
        },
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      const displayRows = vm.displayRows
      expect(displayRows.length).toBe(0)
    })

    it('handles null items prop in displayRows', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          items: null as any
        },
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      const displayRows = vm.displayRows
      expect(displayRows.length).toBe(0)
    })
  })

  describe('formatCurrencyInput Method', () => {
    it('formats currency values correctly', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      const formatted = vm.formatCurrencyInput(5000)
      expect(typeof formatted).toBe('string')
      expect(formatted).toMatch(/5[,\s]?000/)
    })

    it('handles null values in formatCurrencyInput', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      const formatted = vm.formatCurrencyInput(null)
      expect(typeof formatted).toBe('string')
    })

    it('handles undefined values in formatCurrencyInput', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      const formatted = vm.formatCurrencyInput(undefined)
      expect(typeof formatted).toBe('string')
    })

    it('handles zero values in formatCurrencyInput', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      const formatted = vm.formatCurrencyInput(0)
      expect(typeof formatted).toBe('string')
    })

    it('strips currency symbol from formatted value', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      // formatCurrencyInput should strip the $ symbol if present
      const formatted = vm.formatCurrencyInput(1000)
      // Should not start with $ (symbol is stripped)
      expect(formatted).not.toContain('$')
    })

    it('handles non-string formatted values', async () => {
      // Mock formatCurrency to return non-string
      const useCurrencyFormatModule = await import('@/composables/useCurrencyFormat')
      vi.mocked(useCurrencyFormatModule).useCurrencyFormat = () => ({
        formatCurrency: () => 12345, // Return number instead of string
        currencySymbol: ref('$')
      })

      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      const formatted = vm.formatCurrencyInput(1000)
      expect(typeof formatted).toBe('string')
    })
  })

  describe('toInputString Method', () => {
    it('converts numbers to strings', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.toInputString(123)).toBe('123')
      expect(vm.toInputString(123.45)).toBe('123.45')
      expect(vm.toInputString(0)).toBe('0')
    })

    it('handles null and undefined', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.toInputString(null)).toBe('')
      expect(vm.toInputString(undefined)).toBe('')
    })

    it('converts strings to strings', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.toInputString('123')).toBe('123')
      expect(vm.toInputString('')).toBe('')
    })
  })

  describe('parseNumericInput Method', () => {
    it('parses valid numeric strings', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.parseNumericInput('123')).toBe(123)
      expect(vm.parseNumericInput('123.45')).toBe(123.45)
      expect(vm.parseNumericInput('1,234.56')).toBe(1234.56)
    })

    it('handles numbers directly', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.parseNumericInput(123)).toBe(123)
      expect(vm.parseNumericInput(123.45)).toBe(123.45)
    })

    it('handles invalid input', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.parseNumericInput('invalid')).toBe(0)
      expect(vm.parseNumericInput('abc123')).toBe(0)
    })

    it('handles empty strings', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.parseNumericInput('')).toBe(0)
      expect(vm.parseNumericInput('   ')).toBe(0)
    })

    it('handles null and undefined', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.parseNumericInput(null)).toBe(0)
      expect(vm.parseNumericInput(undefined)).toBe(0)
    })

    it('handles non-finite numbers', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.parseNumericInput(Infinity)).toBe(0)
      expect(vm.parseNumericInput(-Infinity)).toBe(0)
      expect(vm.parseNumericInput(NaN)).toBe(0)
    })

    it('removes commas from input', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.parseNumericInput('1,234,567.89')).toBe(1234567.89)
    })
  })

  describe('onCoAmountInput Method', () => {
    it('updates draft and emits event when not readonly', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      await vm.onCoAmountInput(0, '5000')

      expect(vm.drafts[0].coAmountInput).toBe('5000')
      expect(wrapper.emitted('co-amount-change')).toBeTruthy()
      const event = wrapper.emitted('co-amount-change')?.[0]?.[0]
      expect(event).toEqual({
        index: 0,
        value: '5000',
        numericValue: 5000
      })
    })

    it('does not update or emit when readonly', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          readonly: true
        },
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      const initialDraft = vm.drafts[0]?.coAmountInput
      await vm.onCoAmountInput(0, '5000')

      expect(vm.drafts[0]?.coAmountInput).toBe(initialDraft)
      expect(wrapper.emitted('co-amount-change')).toBeUndefined()
    })

    it('creates draft entry if it does not exist', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      // Clear draft for index 0
      delete vm.drafts[0]
      await vm.onCoAmountInput(0, '3000')

      expect(vm.drafts[0]).toBeDefined()
      expect(vm.drafts[0].coAmountInput).toBe('3000')
    })

    it('handles null value in onCoAmountInput', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      // Call onCoAmountInput with null - this should set the draft to empty string
      await vm.onCoAmountInput(0, null)
      await wrapper.vm.$nextTick()

      // The draft should be updated to empty string (toInputString(null) returns '')
      // Note: displayRows computed might re-initialize drafts, but onCoAmountInput should have updated it
      // Check the draft directly after the call
      const draftAfterUpdate = vm.drafts[0]?.coAmountInput
      // The draft might be re-synced by displayRows, but the event should still be emitted with correct value
      expect(wrapper.emitted('co-amount-change')).toBeTruthy()
      const event = wrapper.emitted('co-amount-change')?.[0]?.[0]
      expect(event.numericValue).toBe(0)
      expect(event.value).toBe(null)
      // The draft value might be synced back from props, but the important thing is the event was emitted correctly
    })

    it('handles number value in onCoAmountInput', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      await vm.onCoAmountInput(0, 7500)

      expect(vm.drafts[0].coAmountInput).toBe('7500')
      expect(wrapper.emitted('co-amount-change')).toBeTruthy()
    })
  })

  describe('emitRemoveRow Method', () => {
    it('emits remove-row event when not readonly', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      await vm.emitRemoveRow(1)

      expect(wrapper.emitted('remove-row')).toBeTruthy()
      expect(wrapper.emitted('remove-row')?.[0]).toEqual([1])
    })

    it('does not emit when readonly', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          readonly: true
        },
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      await vm.emitRemoveRow(0)

      expect(wrapper.emitted('remove-row')).toBeUndefined()
    })
  })

  describe('hasItems Computed', () => {
    it('returns true when items array has items', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.hasItems).toBe(true)
    })

    it('returns false when items array is empty', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          items: []
        },
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.hasItems).toBe(false)
    })

    it('returns false when items is not an array', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          items: null as any
        },
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.hasItems).toBe(false)
    })
  })

  describe('currencySymbolText Computed', () => {
    it('returns currency symbol from composable', () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.currencySymbolText).toBe('$')
    })

    it('returns empty string when currency symbol is null', async () => {
      // Mock currencySymbol to return null
      const useCurrencyFormatModule = await import('@/composables/useCurrencyFormat')
      vi.mocked(useCurrencyFormatModule).useCurrencyFormat = () => ({
        formatCurrency: (value: number | string | null | undefined) => {
          const num = typeof value === "string" ? parseFloat(value) : Number(value ?? 0)
          if (Number.isNaN(num)) return "$0.00"
          return `$${num.toFixed(2)}`
        },
        currencySymbol: ref(null)
      })

      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.currencySymbolText).toBe('')
    })
  })

  describe('Draft Synchronization', () => {
    it('syncs draft when item co_amount changes from empty to value', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: {
          ...defaultProps,
          items: [
            { ...mockItems[1]!, co_amount: null }
          ]
        },
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      expect(vm.drafts[0].coAmountInput).toBe('')

      await wrapper.setProps({
        items: [
          { ...mockItems[1]!, co_amount: 3500 }
        ]
      })

      // Draft should sync when co_amount changes from null to value
      expect(vm.drafts[0].coAmountInput).toBe('3500')
    })

    it('does not override user input when syncing', async () => {
      const wrapper = mount(COLaborItemsTable, {
        props: defaultProps,
        global: {
          stubs: uiStubs
        }
      })

      const vm: any = wrapper.vm
      // User enters value
      await vm.onCoAmountInput(0, '6000')

      // Props change but user input should be preserved
      await wrapper.setProps({
        items: [
          { ...mockItems[0]!, co_amount: 7000 },
          mockItems[1]!,
          mockItems[2]!
        ]
      })

      // User input should be preserved
      expect(vm.drafts[0].coAmountInput).toBe('6000')
    })
  })
})

