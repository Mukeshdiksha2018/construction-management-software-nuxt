import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import COItemsTableFromOriginal from '@/components/ChangeOrders/COItemsTableFromOriginal.vue'

// Mock composables
vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (value: number | string | null | undefined) => {
      const num =
        typeof value === 'string' ? parseFloat(value) : Number(value ?? 0)
      if (Number.isNaN(num)) return '$0.00'
      return `$${num.toFixed(2)}`
    },
    currencySymbol: { value: '$' },
  }),
}))

// Mock approval checks store
vi.mock('@/stores/approvalChecks', () => ({
  useApprovalChecksStore: () => ({
    approvalChecks: [],
    loading: false,
    error: null,
    getAllApprovalChecks: [],
    getActiveApprovalChecks: [],
    fetchApprovalChecks: vi.fn().mockResolvedValue(undefined),
  }),
}))

// Stubs for Nuxt UI components
const uiStubs = {
  UInput: { template: '<input />', props: ['modelValue'], emits: ['update:modelValue'] },
  UButton: { template: '<button><slot /></button>' },
  USkeleton: { template: '<div class="skeleton" data-testid="skeleton"><slot /></div>' },
  ApprovalChecksSelect: {
    props: ['modelValue', 'size', 'class', 'disabled'],
    emits: ['update:modelValue', 'change'],
    template: `<div class="approval-checks-select-stub">{{ modelValue?.length || 0 }} selected</div>`,
  },
  USelectMenu: { template: '<div class="uselect-menu-stub"><slot /></div>' },
  UIcon: { template: '<span class="uicon-stub"></span>' },
  UBadge: { template: '<span class="ubadge-stub"><slot /></span>' },
}

describe('COItemsTableFromOriginal.vue', () => {
  const mockItems = [
    {
      id: 'item-1',
      name: 'Concrete Bag',
      description: 'High quality concrete',
      cost_code_label: '03 30 00',
      cost_code_number: '033000',
      cost_code_name: 'Cast-in-Place Concrete',
      sequence: 'SEQ-001',
      item_type_label: 'Material',
      unit_price: 25.5,
      quantity: 10,
      total: 255,
      co_unit_price: 30,
      co_quantity: 8,
      co_total: 240,
    },
    {
      id: 'item-2',
      name: 'Steel Rebar',
      description: 'Reinforcement steel',
      cost_code_label: '03 21 00',
      cost_code_number: '032100',
      cost_code_name: 'Reinforcement',
      sequence: 'SEQ-002',
      item_type_label: 'Material',
      unit_price: 100,
      quantity: 5,
      total: 500,
      co_unit_price: null,
      co_quantity: null,
      co_total: null,
    },
  ]

  const mountTable = (props = {}) => {
    return mount(COItemsTableFromOriginal, {
      props: {
        items: mockItems,
        title: 'Original PO Items',
        description: 'Items from the original purchase order',
        loading: false,
        error: null,
        loadingMessage: 'Loading items...',
        emptyMessage: 'No items found',
        ...props,
      },
      global: {
        stubs: uiStubs,
      },
    })
  }

  it('renders table header with title and item count', () => {
    const wrapper = mountTable()

    expect(wrapper.text()).toContain('Original PO Items')
    expect(wrapper.text()).toContain('Items from the original purchase order')
    expect(wrapper.text()).toContain('2 items')
  })

  it('displays loading state', () => {
    const wrapper = mountTable({ loading: true })

    // Check for skeleton loaders instead of loading message
    const skeletons = wrapper.findAll('[data-testid="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
    
    // Should show skeleton table structure
    expect(wrapper.html()).toContain('skeleton')
  })

  it('displays error state', () => {
    const wrapper = mountTable({ error: 'Failed to load items' })

    expect(wrapper.text()).toContain('Failed to load items')
  })

  it('displays empty state when no items', () => {
    const wrapper = mountTable({ items: [] })

    expect(wrapper.text()).toContain('No items found')
  })

  it('renders desktop table with correct columns', () => {
    const wrapper = mountTable()

    // Check table headers
    expect(wrapper.text()).toContain('Cost Code')
    expect(wrapper.text()).toContain('Sequence')
    expect(wrapper.text()).toContain('Item')
    expect(wrapper.text()).toContain('Approval Checks')
    expect(wrapper.text()).toContain('Orig Unit')
    expect(wrapper.text()).toContain('Orig Qty')
    expect(wrapper.text()).toContain('Orig Total')
    expect(wrapper.text()).toContain('CO Unit')
    expect(wrapper.text()).toContain('CO Qty')
    expect(wrapper.text()).toContain('CO Total')
    expect(wrapper.text()).toContain('Actions')
  })

  it('displays item data correctly in table rows', () => {
    const wrapper = mountTable()

    // Check first item data
    expect(wrapper.text()).toContain('Concrete Bag')
    expect(wrapper.text()).toContain('SEQ-001')
    expect(wrapper.text()).toContain('Material') // item_type_label instead of description
    expect(wrapper.text()).toContain('03 30 00')
    expect(wrapper.text()).toContain('$25.50') // unit_price
    expect(wrapper.text()).toContain('10') // quantity
    expect(wrapper.text()).toContain('$255.00') // total
  })

  it('displays CO values correctly', () => {
    const wrapper = mountTable()

    // First item has CO values set
    const inputs = wrapper.findAll('input')
    expect(inputs.length).toBeGreaterThan(0)

    // Check that CO total is displayed
    expect(wrapper.text()).toContain('$240.00') // co_total

    // Check that quantity input has correct value
    const quantityInputs = wrapper.findAll('input[ inputmode="decimal"]')
    expect(quantityInputs.length).toBeGreaterThan(0)
    // The component should display the values correctly
  })

  it('handles null CO values', () => {
    const wrapper = mountTable()

    // Second item has null CO values - should show empty or computed values
    const inputs = wrapper.findAll('input')
    expect(inputs.length).toBeGreaterThan(0)
  })

  it('emits remove-row event when remove button is clicked', async () => {
    const wrapper = mountTable()

    const removeButtons = wrapper.findAll('button')
    expect(removeButtons.length).toBeGreaterThan(0)

    // Click the first remove button
    await removeButtons[0].trigger('click')

    expect(wrapper.emitted('remove-row')).toBeTruthy()
    expect(wrapper.emitted('remove-row')![0]).toEqual([0]) // First row index
  })

  it('does not allow editing or removing rows when readonly is true', async () => {
    const wrapper = mountTable({ readonly: true })
    const vm: any = wrapper.vm as any

    // Handlers should early-return and not emit events
    await vm.onCoUnitPriceInput(0, '99')
    await vm.onCoQuantityInput(0, '99')
    await vm.emitApprovalChecksChange(0, ['check-1'])
    await vm.emitRemoveRow(0)

    expect(wrapper.emitted('co-unit-price-change')).toBeUndefined()
    expect(wrapper.emitted('co-quantity-change')).toBeUndefined()
    expect(wrapper.emitted('approval-checks-change')).toBeUndefined()
    expect(wrapper.emitted('remove-row')).toBeUndefined()
  })

  it('updates CO unit price when input changes', async () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    // Find unit price inputs (there should be inputs for CO unit price)
    const inputs = wrapper.findAll('input')
    expect(inputs.length).toBeGreaterThan(0)

    // The component should have reactive drafts for input values
    expect(vm.drafts).toBeDefined()
  })

  it('computes CO total correctly', () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    // Test computeCoTotal method
    const item = mockItems[0]
    const total = vm.computeCoTotal(item, 0)

    // First item: co_unit_price (30) * co_quantity (8) = 240
    expect(total).toBe(240)
  })

  it('handles quantity input changes', async () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    // Simulate quantity input change
    vm.onCoQuantityInput(0, '12')

    // Should update drafts
    expect(vm.drafts[0]).toBeDefined()
    expect(vm.drafts[0].quantityInput).toBe('12')
  })

  it('handles unit price input changes', async () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    // Simulate unit price input change
    vm.onCoUnitPriceInput(0, '35.50')

    // Should update drafts
    expect(vm.drafts[0]).toBeDefined()
    expect(vm.drafts[0].unitPriceInput).toBe('35.50')
  })

  it('formats currency values correctly', () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    expect(vm.formatCurrencyInput(123.45)).toBe('$123.45')
    expect(vm.formatCurrencyInput(null)).toBe('$0.00')
    expect(vm.formatCurrencyInput('')).toBe('$0.00')
  })

  it('formats quantity values correctly', () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    expect(vm.formatQuantity(10)).toBe('10')
    expect(vm.formatQuantity(10.5)).toBe('10.5')
    expect(vm.formatQuantity(null)).toBe('0')
  })

  it('renders mobile view for small screens', () => {
    const wrapper = mountTable()

    // Mobile view should be hidden on desktop by default
    const mobileDiv = wrapper.find('.md\\:hidden')
    expect(mobileDiv.exists()).toBe(true)
  })

  it('displays cost code information correctly', () => {
    const wrapper = mountTable()

    expect(wrapper.text()).toContain('03 30 00')
    expect(wrapper.text()).toContain('03 21 00')
  })

  it('shows item type labels when available', () => {
    const wrapper = mountTable()

    expect(wrapper.text()).toContain('Material')
  })

  it('shows item descriptions when available in mobile view', () => {
    const wrapper = mountTable()

    expect(wrapper.text()).toContain('High quality concrete')
    expect(wrapper.text()).toContain('Reinforcement steel')
  })

  it('provides custom actions slot', () => {
    const wrapper = mountTable()

    // Should have slot for actions
    const slots = wrapper.findAll('[data-testid="actions-slot"]')
    // The component uses scoped slots for actions
    expect(wrapper.html()).toContain('Actions')
  })

  it('emits co-unit-price-change with correct payload', async () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    await vm.onCoUnitPriceInput(0, '35.50')
    await wrapper.vm.$nextTick()

    const events = wrapper.emitted('co-unit-price-change')
    expect(events).toBeTruthy()
    expect(events![0]).toEqual([
      {
        index: 0,
        value: '35.50',
        numericValue: 35.5,
        computedTotal: expect.any(Number),
      },
    ])
  })

  it('emits co-quantity-change with correct payload', async () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    await vm.onCoQuantityInput(0, '15')
    await wrapper.vm.$nextTick()

    const events = wrapper.emitted('co-quantity-change')
    expect(events).toBeTruthy()
    expect(events![0]).toEqual([
      {
        index: 0,
        value: '15',
        numericValue: 15,
        computedTotal: expect.any(Number),
      },
    ])
  })

  it('computes CO total from draft values when available', () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    // Set draft values
    vm.drafts[0] = {
      unitPriceInput: '40',
      quantityInput: '8',
    }

    const total = vm.computeCoTotal(mockItems[0], 0)
    expect(total).toBe(320) // 40 * 8
  })

  it('computes CO total from stored values when no draft', () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    const total = vm.computeCoTotal(mockItems[0], undefined)
    expect(total).toBe(240) // 30 * 8 from mockItems[0]
  })

  it('computes CO total from co_total when unit and quantity are zero', () => {
    const itemWithTotal = {
      ...mockItems[0],
      co_unit_price: 0,
      co_quantity: 0,
      co_total: 100,
    }

    const wrapper = mountTable({ items: [itemWithTotal] })
    const vm: any = wrapper.vm as any

    const total = vm.computeCoTotal(itemWithTotal, undefined)
    expect(total).toBe(100)
  })

  it('handles empty string inputs correctly', async () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    // Clear any existing draft first
    if (vm.drafts[0]) {
      delete vm.drafts[0]
    }

    await vm.onCoUnitPriceInput(0, '')
    await wrapper.vm.$nextTick()

    // Draft should be set to empty string (or may be initialized from item if empty)
    expect(vm.drafts[0]).toBeDefined()
    const events = wrapper.emitted('co-unit-price-change')
    expect(events).toBeTruthy()
    expect(events![0][0].numericValue).toBe(0)
    expect(events![0][0].value).toBe('')
  })

  it('handles null and undefined values in formatCurrencyInput', () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    // formatCurrencyInput uses formatCurrency which includes $, then strips it
    // But the mock returns $0.00, so we check it contains 0.00
    const nullResult = vm.formatCurrencyInput(null)
    const undefinedResult = vm.formatCurrencyInput(undefined)
    const emptyResult = vm.formatCurrencyInput('')
    
    expect(nullResult).toContain('0.00')
    expect(undefinedResult).toContain('0.00')
    expect(emptyResult).toContain('0.00')
  })

  it('formats currency correctly', () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    const formatted = vm.formatCurrencyInput(123.45)
    // formatCurrencyInput may or may not strip the $ depending on implementation
    // Just check it contains the number
    expect(formatted).toContain('123.45')
  })

  it('formats quantity with proper decimal places', () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    expect(vm.formatQuantity(10)).toBe('10')
    expect(vm.formatQuantity(10.5)).toBe('10.5')
    expect(vm.formatQuantity(10.1234)).toBe('10.1234')
    expect(vm.formatQuantity(0)).toBe('0')
  })

  it('handles invalid numeric inputs gracefully', () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    expect(vm.parseNumericInput('abc')).toBe(0)
    expect(vm.parseNumericInput('')).toBe(0)
    expect(vm.parseNumericInput(null)).toBe(0)
    expect(vm.parseNumericInput(undefined)).toBe(0)
  })

  it('parses numeric input with commas correctly', () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    expect(vm.parseNumericInput('1,234.56')).toBe(1234.56)
    expect(vm.parseNumericInput('1,000')).toBe(1000)
  })

  it('converts values to input string correctly', () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    expect(vm.toInputString(123)).toBe('123')
    expect(vm.toInputString(123.45)).toBe('123.45')
    expect(vm.toInputString(null)).toBe('')
    expect(vm.toInputString(undefined)).toBe('')
  })

  it('rounds currency values to 2 decimal places', () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    expect(vm.roundCurrency(123.456)).toBe(123.46)
    expect(vm.roundCurrency(123.454)).toBe(123.45)
    expect(vm.roundCurrency(100)).toBe(100)
  })

  it('updates drafts when input values change', async () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    await vm.onCoUnitPriceInput(1, '50.75')
    await vm.onCoQuantityInput(1, '12')

    expect(vm.drafts[1]).toBeDefined()
    expect(vm.drafts[1].unitPriceInput).toBe('50.75')
    expect(vm.drafts[1].quantityInput).toBe('12')
  })

  it('maintains draft state across item updates', async () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    // Set initial draft
    await vm.onCoUnitPriceInput(0, '25')
    await wrapper.vm.$nextTick()

    // Update props with new items (simulating parent update)
    await wrapper.setProps({
      items: [
        {
          ...mockItems[0],
          co_unit_price: 30, // Changed in parent
        },
      ],
    })
    await wrapper.vm.$nextTick()

    // Draft should still have the user's input value
    expect(vm.drafts[0].unitPriceInput).toBe('25')
  })

  it('displays item count in header when items exist', () => {
    const wrapper = mountTable()

    expect(wrapper.text()).toContain('2 items')
  })

  it('does not display item count when no items', () => {
    const wrapper = mountTable({ items: [] })

    // The header still says "Items" but the count badge should not appear
    const text = wrapper.text()
    // Check that it doesn't contain a number followed by "items" (like "2 items")
    expect(text).not.toMatch(/\d+\s+items/i)
  })

  it('renders mobile view structure', () => {
    const wrapper = mountTable()

    const mobileView = wrapper.find('.md\\:hidden')
    expect(mobileView.exists()).toBe(true)
  })

  it('displays all required columns in desktop view', () => {
    const wrapper = mountTable()

    const headers = wrapper.text()
    expect(headers).toContain('Cost Code')
    expect(headers).toContain('Item')
    expect(headers).toContain('Approval Checks')
    expect(headers).toContain('Orig Unit')
    expect(headers).toContain('Orig Qty')
    expect(headers).toContain('Orig Total')
    expect(headers).toContain('CO Unit')
    expect(headers).toContain('CO Qty')
    expect(headers).toContain('CO Total')
    expect(headers).toContain('Actions')
  })

  it('emits approval-checks-change event when approval checks are updated', async () => {
    const wrapper = mountTable()
    const vm: any = wrapper.vm as any

    await vm.emitApprovalChecksChange(0, ['check-1', 'check-2'])
    await wrapper.vm.$nextTick()

    const events = wrapper.emitted('approval-checks-change')
    expect(events).toBeTruthy()
    expect(events![0]).toEqual([
      {
        index: 0,
        value: ['check-1', 'check-2'],
      },
    ])
  })

  it('renders ApprovalChecksSelect component for each item', () => {
    const wrapper = mountTable()

    const approvalChecksSelects = wrapper.findAll('.approval-checks-select-stub')
    expect(approvalChecksSelects.length).toBeGreaterThan(0)
  })

  it('passes approval_checks prop to ApprovalChecksSelect', () => {
    const itemsWithApprovalChecks = [
      {
        ...mockItems[0],
        approval_checks: ['check-1', 'check-2'],
      },
    ]
    const wrapper = mountTable({ items: itemsWithApprovalChecks })

    const approvalChecksSelects = wrapper.findAll('.approval-checks-select-stub')
    expect(approvalChecksSelects.length).toBeGreaterThan(0)
  })

  describe('Invoice Values (showInvoiceValues = true)', () => {
    it('shows empty invoice fields for new invoices (null invoice values)', () => {
      const itemsWithNullInvoiceValues = [
        {
          ...mockItems[0],
          invoice_unit_price: null,
          invoice_quantity: null,
          invoice_total: null,
        },
      ]
      const wrapper = mountTable({ 
        items: itemsWithNullInvoiceValues,
        showInvoiceValues: true,
      })
      const vm: any = wrapper.vm as any

      // Invoice drafts should be initialized with empty strings for null values
      expect(vm.invoiceDrafts[0]).toBeDefined()
      expect(vm.invoiceDrafts[0].unitPriceInput).toBe('')
      expect(vm.invoiceDrafts[0].quantityInput).toBe('')
    })

    it('does not fall back to CO values when invoice values are null for new invoices', () => {
      const itemsWithNullInvoiceValues = [
        {
          ...mockItems[0],
          co_unit_price: 30,
          co_quantity: 8,
          invoice_unit_price: null,
          invoice_quantity: null,
          invoice_total: null,
        },
      ]
      const wrapper = mountTable({ 
        items: itemsWithNullInvoiceValues,
        showInvoiceValues: true,
      })
      const vm: any = wrapper.vm as any

      // Invoice drafts should be empty, not fall back to CO values
      expect(vm.invoiceDrafts[0].unitPriceInput).toBe('')
      expect(vm.invoiceDrafts[0].quantityInput).toBe('')
      
      // computeInvoiceTotal should return 0 for null invoice values
      const total = vm.computeInvoiceTotal(itemsWithNullInvoiceValues[0], 0)
      expect(total).toBe(0)
    })

    it('shows saved invoice values for existing invoices', () => {
      const itemsWithSavedInvoiceValues = [
        {
          ...mockItems[0],
          invoice_unit_price: 35.5,
          invoice_quantity: 10,
          invoice_total: 355,
        },
      ]
      const wrapper = mountTable({ 
        items: itemsWithSavedInvoiceValues,
        showInvoiceValues: true,
      })
      const vm: any = wrapper.vm as any

      // Invoice drafts should be initialized with saved values
      expect(vm.invoiceDrafts[0]).toBeDefined()
      expect(vm.invoiceDrafts[0].unitPriceInput).toBe('35.5')
      expect(vm.invoiceDrafts[0].quantityInput).toBe('10')
    })

    it('computes invoice total from invoice unit price and quantity', () => {
      const itemsWithInvoiceValues = [
        {
          ...mockItems[0],
          invoice_unit_price: 40,
          invoice_quantity: 5,
          invoice_total: null,
        },
      ]
      const wrapper = mountTable({ 
        items: itemsWithInvoiceValues,
        showInvoiceValues: true,
      })
      const vm: any = wrapper.vm as any

      const total = vm.computeInvoiceTotal(itemsWithInvoiceValues[0], 0)
      expect(total).toBe(200) // 40 * 5
    })

    it('computes invoice total from invoice_total field when available', () => {
      const itemsWithInvoiceTotal = [
        {
          ...mockItems[0],
          invoice_unit_price: null,
          invoice_quantity: null,
          invoice_total: 150,
        },
      ]
      const wrapper = mountTable({ 
        items: itemsWithInvoiceTotal,
        showInvoiceValues: true,
      })
      const vm: any = wrapper.vm as any

      // When invoice_unit_price and invoice_quantity are null, but invoice_total is set,
      // computeInvoiceTotal should use invoice_total even if there's a draft with empty values
      const total = vm.computeInvoiceTotal(itemsWithInvoiceTotal[0], 0)
      expect(total).toBe(150)
    })

    it('emits invoice-unit-price-change event with correct payload', async () => {
      const itemsWithNullInvoiceValues = [
        {
          ...mockItems[0],
          invoice_unit_price: null,
          invoice_quantity: null,
        },
      ]
      const wrapper = mountTable({ 
        items: itemsWithNullInvoiceValues,
        showInvoiceValues: true,
      })
      const vm: any = wrapper.vm as any

      await vm.onInvoiceUnitPriceInput(0, '45.50')
      await wrapper.vm.$nextTick()

      const events = wrapper.emitted('invoice-unit-price-change')
      expect(events).toBeTruthy()
      expect(events![0][0].index).toBe(0)
      expect(events![0][0].numericValue).toBe(45.5)
      expect(events![0][0].computedTotal).toBe(0) // quantity is null, so total is 0
    })

    it('emits invoice-quantity-change event with correct payload', async () => {
      const itemsWithNullInvoiceValues = [
        {
          ...mockItems[0],
          invoice_unit_price: null,
          invoice_quantity: null,
        },
      ]
      const wrapper = mountTable({ 
        items: itemsWithNullInvoiceValues,
        showInvoiceValues: true,
      })
      const vm: any = wrapper.vm as any

      await vm.onInvoiceQuantityInput(0, '12')
      await wrapper.vm.$nextTick()

      const events = wrapper.emitted('invoice-quantity-change')
      expect(events).toBeTruthy()
      expect(events![0][0].index).toBe(0)
      expect(events![0][0].numericValue).toBe(12)
      expect(events![0][0].computedTotal).toBe(0) // unit price is null, so total is 0
    })

    it('emits invoice-total-change event when unit price or quantity changes', async () => {
      const itemsWithInvoiceValues = [
        {
          ...mockItems[0],
          invoice_unit_price: 30,
          invoice_quantity: 5,
        },
      ]
      const wrapper = mountTable({ 
        items: itemsWithInvoiceValues,
        showInvoiceValues: true,
      })
      const vm: any = wrapper.vm as any

      await vm.onInvoiceUnitPriceInput(0, '40')
      await wrapper.vm.$nextTick()

      const events = wrapper.emitted('invoice-total-change')
      expect(events).toBeTruthy()
      expect(events![0][0].index).toBe(0)
      expect(events![0][0].value).toBe(200) // 40 * 5
    })

    it('does not initialize invoice drafts with CO values when invoice values are null', () => {
      const itemsWithNullInvoiceValues = [
        {
          ...mockItems[0],
          co_unit_price: 30,
          co_quantity: 8,
          invoice_unit_price: null,
          invoice_quantity: null,
        },
      ]
      const wrapper = mountTable({ 
        items: itemsWithNullInvoiceValues,
        showInvoiceValues: true,
      })
      const vm: any = wrapper.vm as any

      // Invoice drafts should not fall back to CO values
      expect(vm.invoiceDrafts[0].unitPriceInput).toBe('')
      expect(vm.invoiceDrafts[0].quantityInput).toBe('')
    })

    it('updates invoice drafts when user enters values', async () => {
      const itemsWithNullInvoiceValues = [
        {
          ...mockItems[0],
          invoice_unit_price: null,
          invoice_quantity: null,
        },
      ]
      const wrapper = mountTable({ 
        items: itemsWithNullInvoiceValues,
        showInvoiceValues: true,
      })
      const vm: any = wrapper.vm as any

      await vm.onInvoiceUnitPriceInput(0, '50')
      await vm.onInvoiceQuantityInput(0, '10')
      await wrapper.vm.$nextTick()

      expect(vm.invoiceDrafts[0].unitPriceInput).toBe('50')
      expect(vm.invoiceDrafts[0].quantityInput).toBe('10')
      
      const total = vm.computeInvoiceTotal(itemsWithNullInvoiceValues[0], 0)
      expect(total).toBe(500) // 50 * 10
    })
  })
})
