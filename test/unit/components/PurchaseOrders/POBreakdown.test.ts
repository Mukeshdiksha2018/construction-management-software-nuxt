import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, defineStore } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import POBreakdown from '@/components/PurchaseOrders/POBreakdown.vue'

// Mock composables
vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (value: number | string | null | undefined) => {
      const num = typeof value === 'string' ? parseFloat(value) : Number(value ?? 0)
      if (Number.isNaN(num)) return '$0.00'
      // Ensure space after dollar sign as per component requirement
      return `$ ${num.toFixed(2)}`
    },
    currencySymbol: ref('$'),
  }),
}))

// Mock UI components
const uiStubs = {
  UIcon: { template: '<span />' },
}

// Mock purchaseOrderResourcesStore
const mockFetchPurchaseOrderItems = vi.fn()

vi.mock('@/stores/purchaseOrderResources', () => ({
  usePurchaseOrderResourcesStore: defineStore('purchaseOrderResources', () => ({
    fetchPurchaseOrderItems: mockFetchPurchaseOrderItems,
    clear: vi.fn(),
  })),
}))

describe('POBreakdown.vue', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
    mockFetchPurchaseOrderItems.mockClear()
  })

  const createMockPOData = (overrides: any = {}) => ({
    uuid: 'po-1',
    freight_charges_percentage: 0,
    freight_charges_amount: 0,
    freight_charges_taxable: false,
    packing_charges_percentage: 0,
    packing_charges_amount: 0,
    packing_charges_taxable: false,
    custom_duties_percentage: 0,
    custom_duties_amount: 0,
    custom_duties_taxable: false,
    other_charges_percentage: 0,
    other_charges_amount: 0,
    other_charges_taxable: false,
    sales_tax_1_percentage: 0,
    sales_tax_2_percentage: 0,
    ...overrides,
  })

  const createMockItem = (overrides: any = {}) => ({
    uuid: 'item-1',
    item_name: 'Test Item',
    po_quantity: 10,
    po_unit_price: 100,
    po_total: 1000,
    location: 'Location A',
    metadata: {
      sequence: 'SEQ-001',
      item_type_label: 'Material',
      item_name: 'Test Item',
    },
    ...overrides,
  })

  describe('Loading State', () => {
    it('shows loading spinner when fetching items', async () => {
      // Mock a delayed response
      let resolveFetch: any
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve
      })
      mockFetchPurchaseOrderItems.mockReturnValue(fetchPromise)

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await wrapper.vm.$nextTick()

      // Should show loading state
      expect(wrapper.text()).toContain('Loading items...')
      expect(wrapper.find('[name="i-heroicons-arrow-path"]').exists() || 
             wrapper.html().includes('animate-spin')).toBeTruthy()

      // Resolve the promise
      resolveFetch([])
      await flushPromises()
    })

    it('hides loading state after items are loaded', async () => {
      mockFetchPurchaseOrderItems.mockResolvedValue([
        createMockItem(),
      ])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      expect(wrapper.text()).not.toContain('Loading items...')
      expect(wrapper.find('table').exists()).toBe(true)
    })
  })

  describe('Error State', () => {
    it('displays error message when fetch fails', async () => {
      mockFetchPurchaseOrderItems.mockRejectedValue(new Error('Failed to fetch items'))

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm: any = wrapper.vm
      expect(vm.error).toBeTruthy()
      expect(vm.error).toContain('Failed')
      expect(wrapper.find('table').exists()).toBe(false)
    })

    it('displays custom error message when provided', async () => {
      mockFetchPurchaseOrderItems.mockRejectedValue(new Error('Network error'))

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm: any = wrapper.vm
      expect(vm.error).toBeTruthy()
      expect(vm.error).toContain('Network error')
    })

    it('shows error when poUuid is missing', async () => {
      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: '',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      // Manually trigger fetchItems to test the error case
      const vm: any = wrapper.vm
      await vm.fetchItems()
      await flushPromises()

      expect(vm.error).toBeTruthy()
      expect(vm.error).toContain('PO UUID is required')
    })
  })

  describe('Empty State', () => {
    it('displays empty message when no items are returned', async () => {
      mockFetchPurchaseOrderItems.mockResolvedValue([])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      expect(wrapper.text()).toContain('No items found')
      expect(wrapper.find('table').exists()).toBe(false)
    })

    it('displays empty message when items is null', async () => {
      mockFetchPurchaseOrderItems.mockResolvedValue(null)

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      expect(wrapper.text()).toContain('No items found')
    })
  })

  describe('Table Rendering', () => {
    it('renders table with correct columns', async () => {
      mockFetchPurchaseOrderItems.mockResolvedValue([
        createMockItem(),
      ])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const table = wrapper.find('table')
      expect(table.exists()).toBe(true)

      // Check for all column headers
      const headers = ['Sequence', 'Type', 'Item', 'Location', 'Quantity', 'Unit Cost', 
                      'Goods Amount', 'Freight', 'Packaging', 'Customs & Duties', 
                      'Other Amount', 'Taxes', 'Total']
      
      headers.forEach(header => {
        expect(wrapper.text()).toContain(header)
      })
    })

    it('renders items in table rows', async () => {
      const items = [
        createMockItem({ uuid: 'item-1', item_name: 'Item 1' }),
        createMockItem({ uuid: 'item-2', item_name: 'Item 2' }),
        createMockItem({ uuid: 'item-3', item_name: 'Item 3' }),
      ]

      mockFetchPurchaseOrderItems.mockResolvedValue(items)

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(3)
    })

    it('uses correct key for v-for items', async () => {
      const items = [
        createMockItem({ uuid: 'item-1' }),
        createMockItem({ id: 'item-2', uuid: undefined }),
        createMockItem({ uuid: undefined, id: undefined }),
      ]

      mockFetchPurchaseOrderItems.mockResolvedValue(items)

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(3)
    })
  })

  describe('Data Display Functions', () => {
    it('displays sequence correctly from metadata', async () => {
      const item = createMockItem({
        metadata: { sequence: 'SEQ-123' },
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      expect(wrapper.text()).toContain('SEQ-123')
    })

    it('displays sequence fallback when metadata is missing', async () => {
      const item = createMockItem({
        metadata: {},
        sequence: 'SEQ-FALLBACK',
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      expect(wrapper.text()).toContain('SEQ-FALLBACK')
    })

    it('displays item type correctly', async () => {
      const item = createMockItem({
        metadata: { item_type_label: 'Material' },
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      expect(wrapper.text()).toContain('Material')
    })

    it('displays item name correctly from item_name field', async () => {
      const item = createMockItem({
        item_name: 'Direct Item Name',
        metadata: { item_name: 'Metadata Item Name' },
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      // Should prefer item_name over metadata.item_name
      expect(wrapper.text()).toContain('Direct Item Name')
    })

    it('displays location correctly', async () => {
      const item = createMockItem({
        location: 'Warehouse A',
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      expect(wrapper.text()).toContain('Warehouse A')
    })

    it('displays location fallback when location is missing', async () => {
      const item = createMockItem({
        location: undefined,
        location_label: 'Location Label',
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      expect(wrapper.text()).toContain('Location Label')
    })

    it('formats quantity correctly', async () => {
      const item = createMockItem({
        po_quantity: 1234.56,
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      // Should format with locale string
      expect(wrapper.text()).toContain('1,234.56')
    })

    it('formats currency correctly with space after dollar sign', async () => {
      const item = createMockItem({
        po_unit_price: 1234.56,
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      // Should have space after dollar sign
      expect(wrapper.text()).toContain('$ 1234.56')
    })
  })

  describe('Amount Calculations', () => {
    it('calculates goods amount correctly (quantity * unit price)', async () => {
      const item = createMockItem({
        po_quantity: 10,
        po_unit_price: 100,
        po_total: undefined, // Should calculate
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm: any = wrapper.vm
      const goodsAmount = vm.getGoodsAmount(item)
      expect(goodsAmount).toBe(1000) // 10 * 100
    })

    it('calculates freight amount from percentage', async () => {
      const poData = createMockPOData({
        freight_charges_percentage: 5,
      })

      const item = createMockItem({
        po_quantity: 10,
        po_unit_price: 100,
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm: any = wrapper.vm
      const freightAmount = vm.getFreightAmount(item)
      // 5% of 1000 = 50
      expect(freightAmount).toBe(50)
    })

    it('calculates freight amount from fixed amount (proportional)', async () => {
      const poData = createMockPOData({
        freight_charges_amount: 200,
      })

      const items = [
        createMockItem({ uuid: 'item-1', po_quantity: 10, po_unit_price: 100 }), // 1000
        createMockItem({ uuid: 'item-2', po_quantity: 5, po_unit_price: 200 }),  // 1000
      ]

      mockFetchPurchaseOrderItems.mockResolvedValue(items)

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm: any = wrapper.vm
      const freightAmount = vm.getFreightAmount(items[0])
      // Total goods = 2000, item 1 = 1000, so freight = (1000/2000) * 200 = 100
      expect(freightAmount).toBe(100)
    })

    it('uses item freight_amount when available', async () => {
      const item = createMockItem({
        freight_amount: 75,
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData({
            freight_charges_percentage: 5,
          }),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm: any = wrapper.vm
      const freightAmount = vm.getFreightAmount(item)
      // Should use item's freight_amount instead of calculating
      expect(freightAmount).toBe(75)
    })

    it('calculates packing amount correctly', async () => {
      const poData = createMockPOData({
        packing_charges_percentage: 3,
      })

      const item = createMockItem({
        po_quantity: 10,
        po_unit_price: 100,
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm: any = wrapper.vm
      const packingAmount = vm.getPackingAmount(item)
      // 3% of 1000 = 30
      expect(packingAmount).toBe(30)
    })

    it('calculates customs amount correctly', async () => {
      const poData = createMockPOData({
        custom_duties_percentage: 10,
      })

      const item = createMockItem({
        po_quantity: 10,
        po_unit_price: 100,
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm: any = wrapper.vm
      const customsAmount = vm.getCustomsAmount(item)
      // 10% of 1000 = 100
      expect(customsAmount).toBe(100)
    })

    it('calculates other amount correctly', async () => {
      const poData = createMockPOData({
        other_charges_percentage: 2,
      })

      const item = createMockItem({
        po_quantity: 10,
        po_unit_price: 100,
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm: any = wrapper.vm
      const otherAmount = vm.getOtherAmount(item)
      // 2% of 1000 = 20
      expect(otherAmount).toBe(20)
    })

    it('calculates taxes correctly with taxable charges', async () => {
      const poData = createMockPOData({
        sales_tax_1_percentage: 10,
        sales_tax_2_percentage: 5,
        freight_charges_taxable: true,
        packing_charges_taxable: true,
        freight_charges_percentage: 5,
        packing_charges_percentage: 3,
      })

      const item = createMockItem({
        po_quantity: 10,
        po_unit_price: 100,
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm: any = wrapper.vm
      const taxesAmount = vm.getTaxesAmount(item)
      
      // Goods: 1000
      // Freight (5%): 50 (taxable)
      // Packing (3%): 30 (taxable)
      // Taxable base: 1000 + 50 + 30 = 1080
      // Tax 1 (10%): 108
      // Tax 2 (5%): 54
      // Total taxes: 162
      expect(taxesAmount).toBeCloseTo(162, 2)
    })

    it('calculates taxes correctly with non-taxable charges', async () => {
      const poData = createMockPOData({
        sales_tax_1_percentage: 10,
        freight_charges_taxable: false,
        freight_charges_percentage: 5,
      })

      const item = createMockItem({
        po_quantity: 10,
        po_unit_price: 100,
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm: any = wrapper.vm
      const taxesAmount = vm.getTaxesAmount(item)
      
      // Goods: 1000
      // Freight (5%): 50 (not taxable)
      // Taxable base: 1000 only
      // Tax 1 (10%): 100
      expect(taxesAmount).toBe(100)
    })

    it('calculates item total correctly', async () => {
      const poData = createMockPOData({
        freight_charges_percentage: 5,
        packing_charges_percentage: 3,
        sales_tax_1_percentage: 10,
      })

      const item = createMockItem({
        po_quantity: 10,
        po_unit_price: 100,
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm: any = wrapper.vm
      const itemTotal = vm.getItemTotal(item)
      
      // Goods: 1000
      // Freight: 50
      // Packing: 30
      // Taxable base: 1000 (charges not taxable)
      // Tax: 100
      // Total: 1000 + 50 + 30 + 100 = 1180
      expect(itemTotal).toBeCloseTo(1180, 2)
    })
  })

  describe('Total Calculations', () => {
    it('calculates total freight amount across all items', async () => {
      const poData = createMockPOData({
        freight_charges_percentage: 5,
      })

      const items = [
        createMockItem({ uuid: 'item-1', po_quantity: 10, po_unit_price: 100 }), // 1000
        createMockItem({ uuid: 'item-2', po_quantity: 5, po_unit_price: 200 }),   // 1000
      ]

      mockFetchPurchaseOrderItems.mockResolvedValue(items)

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm: any = wrapper.vm
      // Each item: 5% of 1000 = 50
      // Total: 50 + 50 = 100
      expect(vm.totalFreightAmount).toBe(100)
    })

    it('calculates total packing amount across all items', async () => {
      const poData = createMockPOData({
        packing_charges_percentage: 3,
      })

      const items = [
        createMockItem({ uuid: 'item-1', po_quantity: 10, po_unit_price: 100 }),
        createMockItem({ uuid: 'item-2', po_quantity: 5, po_unit_price: 200 }),
      ]

      mockFetchPurchaseOrderItems.mockResolvedValue(items)

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm: any = wrapper.vm
      // Each item: 3% of 1000 = 30
      // Total: 30 + 30 = 60
      expect(vm.totalPackingAmount).toBe(60)
    })

    it('calculates total amount correctly', async () => {
      const poData = createMockPOData({
        freight_charges_percentage: 5,
        sales_tax_1_percentage: 10,
      })

      const items = [
        createMockItem({ uuid: 'item-1', po_quantity: 10, po_unit_price: 100 }),
        createMockItem({ uuid: 'item-2', po_quantity: 5, po_unit_price: 200 }),
      ]

      mockFetchPurchaseOrderItems.mockResolvedValue(items)

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm: any = wrapper.vm
      // Item 1: 1000 + 50 (freight) + 100 (tax) = 1150
      // Item 2: 1000 + 50 (freight) + 100 (tax) = 1150
      // Total: 2300
      expect(vm.totalAmount).toBeCloseTo(2300, 2)
    })
  })

  describe('Rowspan Display', () => {
    it('displays totals in first row with rowspan for multiple items', async () => {
      const items = [
        createMockItem({ uuid: 'item-1' }),
        createMockItem({ uuid: 'item-2' }),
        createMockItem({ uuid: 'item-3' }),
      ]

      mockFetchPurchaseOrderItems.mockResolvedValue(items)

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(3)

      // First row should have rowspan attributes for totals
      const firstRow = rows[0]
      if (firstRow) {
        const rowspanCells = firstRow.findAll('[rowspan]')
        // Should have rowspan for Freight, Packing, Customs, Other, Taxes, Total (6 cells)
        expect(rowspanCells.length).toBeGreaterThan(0)
      }
    })

    it('only shows totals in first row', async () => {
      const items = [
        createMockItem({ uuid: 'item-1' }),
        createMockItem({ uuid: 'item-2' }),
      ]

      mockFetchPurchaseOrderItems.mockResolvedValue(items)

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(2)
      
      // First row should have rowspan cells
      const firstRow = rows[0]
      if (firstRow) {
        const firstRowCells = firstRow.findAll('td[rowspan]')
        expect(firstRowCells.length).toBeGreaterThan(0)
        
        // Second row should have fewer cells (no totals columns)
        const secondRow = rows[1]
        if (secondRow) {
          const secondRowCells = secondRow.findAll('td')
          // Second row should have fewer cells since totals are in first row with rowspan
          expect(secondRowCells.length).toBeLessThan(firstRow.findAll('td').length)
        }
      }
    })
  })

  describe('Watchers and Lifecycle', () => {
    it('fetches items when poUuid changes', async () => {
      mockFetchPurchaseOrderItems.mockResolvedValue([])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      // Initial call count (watch immediate + onMounted)
      const initialCallCount = mockFetchPurchaseOrderItems.mock.calls.length
      expect(initialCallCount).toBeGreaterThan(0)
      expect(mockFetchPurchaseOrderItems).toHaveBeenCalledWith('po-1')

      // Change poUuid
      await wrapper.setProps({ poUuid: 'po-2' })
      await flushPromises()

      expect(mockFetchPurchaseOrderItems).toHaveBeenCalledWith('po-2')
      // Should have been called at least one more time
      expect(mockFetchPurchaseOrderItems.mock.calls.length).toBeGreaterThan(initialCallCount)
    })

    it('fetches items on mount', async () => {
      mockFetchPurchaseOrderItems.mockResolvedValue([])

      mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      expect(mockFetchPurchaseOrderItems).toHaveBeenCalledWith('po-1')
    })
  })

  describe('Edge Cases', () => {
    it('handles zero quantities correctly', async () => {
      const item = createMockItem({
        po_quantity: 0,
        po_unit_price: 100,
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm: any = wrapper.vm
      const goodsAmount = vm.getGoodsAmount(item)
      expect(goodsAmount).toBe(0)
    })

    it('handles null/undefined values gracefully', async () => {
      const item = createMockItem({
        po_quantity: null,
        po_unit_price: undefined,
        location: null,
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      // Should not crash, should display empty or default values
      expect(wrapper.find('table').exists()).toBe(true)
    })

    it('handles items with missing metadata', async () => {
      const item = {
        uuid: 'item-1',
        po_quantity: 10,
        po_unit_price: 100,
        // No metadata
      }

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      // Should still render
      expect(wrapper.find('table').exists()).toBe(true)
    })

    it('handles empty string poUuid', async () => {
      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: '',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      // Manually trigger fetchItems to test the error case
      const vm: any = wrapper.vm
      await vm.fetchItems()
      await flushPromises()

      expect(vm.error).toBeTruthy()
      expect(vm.error).toContain('PO UUID is required')
    })

    it('handles formatCurrencyCompact with showEmpty flag', async () => {
      const item = createMockItem({
        freight_amount: 0,
      })

      mockFetchPurchaseOrderItems.mockResolvedValue([item])

      const wrapper = mount(POBreakdown, {
        props: {
          poUuid: 'po-1',
          poData: createMockPOData(),
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      })

      await flushPromises()

      const vm: any = wrapper.vm
      // When showEmpty is false, should return empty string for 0
      const result1 = vm.formatCurrencyCompact(0, false)
      expect(result1).toBe('')

      // When showEmpty is true, should return formatted currency
      const result2 = vm.formatCurrencyCompact(0, true)
      expect(result2).toBe('$ 0.00')
    })
  })
})

