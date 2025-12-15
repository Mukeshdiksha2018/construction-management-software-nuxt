import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia, defineStore } from 'pinia'
import { useStockReport } from '@/composables/useStockReport'
import type { $Fetch } from "nitropack"

// Mock fetch
global.$fetch = vi.fn() as unknown as $Fetch

describe("useStockReport", () => {
  let pinia: any
  let mockCostCodeConfigurationsStore: any

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()

    // Reset $fetch mock to return empty data by default
    vi.mocked($fetch).mockResolvedValue({ data: [] })

    // Mock cost code configurations store
    mockCostCodeConfigurationsStore = defineStore("costCodeConfigurations", () => ({
      fetchConfigurations: vi.fn(),
      getItemById: vi.fn((itemUuid: string) => {
        // Mock project items
        const projectItems: Record<string, any> = {
          'project-item-1': {
            uuid: 'project-item-1',
            item_name: 'Test Item 1',
            item_sequence: 'ITEM-001',
            unit: 'EA',
            unit_price: 10.00
          },
          'project-item-2': {
            uuid: 'project-item-2',
            item_name: 'Test Item 2',
            item_sequence: 'ITEM-002',
            unit: 'KG',
            unit_price: 20.00
          }
        }
        return projectItems[itemUuid] || null
      })
    }))

    mockCostCodeConfigurationsStore()
  })

  it("should initialize with correct default state", () => {
    const stockReport = useStockReport()

    expect(stockReport.loading.value).toBe(false)
    expect(stockReport.error.value).toBeNull()
    expect(typeof stockReport.generateStockReport).toBe("function")
  })

  it("should require corporation and project UUIDs", async () => {
    const stockReport = useStockReport()

    const result = await stockReport.generateStockReport("", "")

    expect(result).toBeNull()
    expect(stockReport.error.value).toBe("Corporation and project are required")
  })

  it("should aggregate multiple receipt notes for the same item by project item UUID", async () => {
    const corporationUuid = "corp-1"
    const projectUuid = "proj-1"
    const projectItemUuid = "project-item-1"
    const poItemUuid1 = "po-item-1"
    const poItemUuid2 = "po-item-2"
    const poUuid = "po-1"
    const vendorUuid = "vendor-1"

    // Mock receipt note items - same project item in different receipt notes
    const receiptNoteItems = [
      {
        receipt_note_uuid: "rn-1",
        receipt_note_status: "Received",
        receipt_note_entry_date: "2024-01-01",
        receipt_note_updated_at: "2024-01-01",
        receipt_type: "purchase_order",
        item_type: "purchase_order",
        item_uuid: poItemUuid1, // Different PO item UUID
        purchase_order_uuid: poUuid,
        change_order_uuid: null,
        cost_code_uuid: "cc-1",
        received_quantity: 5,
        received_total: 50.00
      },
      {
        receipt_note_uuid: "rn-2",
        receipt_note_status: "Received",
        receipt_note_entry_date: "2024-01-02",
        receipt_note_updated_at: "2024-01-02",
        receipt_type: "purchase_order",
        item_type: "purchase_order",
        item_uuid: poItemUuid2, // Different PO item UUID
        purchase_order_uuid: poUuid,
        change_order_uuid: null,
        cost_code_uuid: "cc-1",
        received_quantity: 3,
        received_total: 30.00
      }
    ]

    // Mock PO items - both reference the same project item
    const poItems = [
      {
        uuid: poItemUuid1,
        item_uuid: projectItemUuid, // Same project item UUID
        item_name: "Test Item 1",
        description: "Test Description",
        unit_price: 10.00,
        uom: "EA"
      },
      {
        uuid: poItemUuid2,
        item_uuid: projectItemUuid, // Same project item UUID
        item_name: "Test Item 1",
        description: "Test Description",
        unit_price: 10.00,
        uom: "EA"
      }
    ]

    // Mock API responses
    vi.mocked($fetch).mockImplementation((url: string) => {
      if (url === "/api/receipt-note-items") {
        return Promise.resolve({ data: receiptNoteItems })
      }
      if (url === "/api/purchase-orders/vendors") {
        return Promise.resolve({
          data: [{ uuid: vendorUuid, vendor_name: "Test Vendor" }]
        })
      }
      if (url === "/api/cost-code-configurations") {
        return Promise.resolve({ data: [{ uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" }] })
      }
      if (url === "/api/purchase-order-items") {
        return Promise.resolve({ data: poItems })
      }
      if (url === `/api/purchase-order-forms/${poUuid}`) {
        return Promise.resolve({
          data: { uuid: poUuid, vendor_uuid: vendorUuid }
        })
      }
      return Promise.resolve({ data: [] })
    })

    const stockReport = useStockReport()
    const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

    expect(result).toBeDefined()
    expect(result?.items).toBeDefined()
    expect(result?.items.length).toBe(1) // Should be aggregated into one item

    const item = result?.items[0]
    expect(item?.itemName).toBe("Test Item 1")
    expect(item?.currentStock).toBe(8) // 5 + 3
    expect(item?.totalValue).toBe(80.00) // 50 + 30
    expect(item?.unitCost).toBe(10.00) // Weighted average
    expect(item?.inShipment).toBe(0) // Both are received
  })

  it("should aggregate shipment and received quantities separately", async () => {
    const corporationUuid = "corp-1"
    const projectUuid = "proj-1"
    const projectItemUuid = "project-item-1"
    const poItemUuid = "po-item-1"
    const poUuid = "po-1"
    const vendorUuid = "vendor-1"

    const receiptNoteItems = [
      {
        receipt_note_uuid: "rn-1",
        receipt_note_status: "Shipment",
        receipt_note_entry_date: "2024-01-01",
        receipt_note_updated_at: "2024-01-01",
        receipt_type: "purchase_order",
        item_type: "purchase_order",
        item_uuid: poItemUuid,
        purchase_order_uuid: poUuid,
        change_order_uuid: null,
        cost_code_uuid: "cc-1",
        received_quantity: 10,
        received_total: 100.00
      },
      {
        receipt_note_uuid: "rn-2",
        receipt_note_status: "Received",
        receipt_note_entry_date: "2024-01-02",
        receipt_note_updated_at: "2024-01-02",
        receipt_type: "purchase_order",
        item_type: "purchase_order",
        item_uuid: poItemUuid,
        purchase_order_uuid: poUuid,
        change_order_uuid: null,
        cost_code_uuid: "cc-1",
        received_quantity: 5,
        received_total: 50.00
      },
      {
        receipt_note_uuid: "rn-3",
        receipt_note_status: "Shipment",
        receipt_note_entry_date: "2024-01-03",
        receipt_note_updated_at: "2024-01-03",
        receipt_type: "purchase_order",
        item_type: "purchase_order",
        item_uuid: poItemUuid,
        purchase_order_uuid: poUuid,
        change_order_uuid: null,
        cost_code_uuid: "cc-1",
        received_quantity: 3,
        received_total: 30.00
      }
    ]

    const poItems = [
      {
        uuid: poItemUuid,
        item_uuid: projectItemUuid,
        item_name: "Test Item 1",
        description: "Test Description",
        unit_price: 10.00,
        uom: "EA"
      }
    ]

    vi.mocked($fetch).mockImplementation((url: string) => {
      if (url === "/api/receipt-note-items") {
        return Promise.resolve({ data: receiptNoteItems })
      }
      if (url === "/api/purchase-orders/vendors") {
        return Promise.resolve({
          data: [{ uuid: vendorUuid, vendor_name: "Test Vendor" }]
        })
      }
      if (url === "/api/cost-code-configurations") {
        return Promise.resolve({ data: [{ uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" }] })
      }
      if (url === "/api/purchase-order-items") {
        return Promise.resolve({ data: poItems })
      }
      if (url === `/api/purchase-order-forms/${poUuid}`) {
        return Promise.resolve({
          data: { uuid: poUuid, vendor_uuid: vendorUuid }
        })
      }
      return Promise.resolve({ data: [] })
    })

    const stockReport = useStockReport()
    const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

    expect(result).toBeDefined()
    const item = result?.items[0]
    expect(item?.currentStock).toBe(5) // Only received quantities
    expect(item?.inShipment).toBe(13) // 10 + 3 shipment quantities
    expect(item?.totalValue).toBe(180.00) // 100 + 50 + 30
  })

  it("should handle items from different purchase orders with same project item", async () => {
    const corporationUuid = "corp-1"
    const projectUuid = "proj-1"
    const projectItemUuid = "project-item-1"
    const poItemUuid1 = "po-item-1"
    const poItemUuid2 = "po-item-2"
    const poUuid1 = "po-1"
    const poUuid2 = "po-2"
    const vendorUuid = "vendor-1"

    const receiptNoteItems = [
      {
        receipt_note_uuid: "rn-1",
        receipt_note_status: "Received",
        receipt_note_entry_date: "2024-01-01",
        receipt_note_updated_at: "2024-01-01",
        receipt_type: "purchase_order",
        item_type: "purchase_order",
        item_uuid: poItemUuid1,
        purchase_order_uuid: poUuid1,
        change_order_uuid: null,
        cost_code_uuid: "cc-1",
        received_quantity: 4,
        received_total: 40.00
      },
      {
        receipt_note_uuid: "rn-2",
        receipt_note_status: "Received",
        receipt_note_entry_date: "2024-01-02",
        receipt_note_updated_at: "2024-01-02",
        receipt_type: "purchase_order",
        item_type: "purchase_order",
        item_uuid: poItemUuid2,
        purchase_order_uuid: poUuid2,
        change_order_uuid: null,
        cost_code_uuid: "cc-1",
        received_quantity: 6,
        received_total: 60.00
      }
    ]

    const poItems1 = [
      {
        uuid: poItemUuid1,
        item_uuid: projectItemUuid,
        item_name: "Test Item 1",
        description: "Test Description",
        unit_price: 10.00,
        uom: "EA"
      }
    ]

    const poItems2 = [
      {
        uuid: poItemUuid2,
        item_uuid: projectItemUuid,
        item_name: "Test Item 1",
        description: "Test Description",
        unit_price: 10.00,
        uom: "EA"
      }
    ]

    vi.mocked($fetch).mockImplementation((url: string, options?: any) => {
      if (url === "/api/receipt-note-items") {
        return Promise.resolve({ data: receiptNoteItems })
      }
      if (url === "/api/purchase-orders/vendors") {
        return Promise.resolve({
          data: [{ uuid: vendorUuid, vendor_name: "Test Vendor" }]
        })
      }
      if (url === "/api/cost-code-configurations") {
        return Promise.resolve({ data: [{ uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" }] })
      }
      if (url === "/api/purchase-order-items") {
        const params = options?.params || {}
        if (params.purchase_order_uuid === poUuid1) {
          return Promise.resolve({ data: poItems1 })
        }
        if (params.purchase_order_uuid === poUuid2) {
          return Promise.resolve({ data: poItems2 })
        }
        return Promise.resolve({ data: [] })
      }
      if (url === `/api/purchase-order-forms/${poUuid1}` || url === `/api/purchase-order-forms/${poUuid2}`) {
        return Promise.resolve({
          data: { uuid: url.includes(poUuid1) ? poUuid1 : poUuid2, vendor_uuid: vendorUuid }
        })
      }
      return Promise.resolve({ data: [] })
    })

    const stockReport = useStockReport()
    const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

    expect(result).toBeDefined()
    expect(result?.items.length).toBe(1) // Should be aggregated into one item
    const item = result?.items[0]
    expect(item?.currentStock).toBe(10) // 4 + 6
    expect(item?.totalValue).toBe(100.00) // 40 + 60
  })

  it("should handle change order items", async () => {
    const corporationUuid = "corp-1"
    const projectUuid = "proj-1"
    const projectItemUuid = "project-item-1"
    const coItemUuid = "co-item-1"
    const coUuid = "co-1"
    const vendorUuid = "vendor-1"

    const receiptNoteItems = [
      {
        receipt_note_uuid: "rn-1",
        receipt_note_status: "Received",
        receipt_note_entry_date: "2024-01-01",
        receipt_note_updated_at: "2024-01-01",
        receipt_type: "change_order",
        item_type: "change_order",
        item_uuid: coItemUuid,
        purchase_order_uuid: null,
        change_order_uuid: coUuid,
        cost_code_uuid: "cc-1",
        received_quantity: 7,
        received_total: 70.00
      }
    ]

    const coItems = [
      {
        uuid: coItemUuid,
        item_uuid: projectItemUuid,
        item_name: "Test Item 1",
        description: "Test Description",
        co_unit_price: 10.00,
        uom: "EA"
      }
    ]

    vi.mocked($fetch).mockImplementation((url: string, options?: any) => {
      if (url === "/api/receipt-note-items") {
        return Promise.resolve({ data: receiptNoteItems })
      }
      if (url === "/api/purchase-orders/vendors") {
        return Promise.resolve({
          data: [{ uuid: vendorUuid, vendor_name: "Test Vendor" }]
        })
      }
      if (url === "/api/cost-code-configurations") {
        return Promise.resolve({ data: [{ uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" }] })
      }
      if (url === "/api/change-order-items") {
        return Promise.resolve({ data: coItems })
      }
      if (url === "/api/change-orders") {
        return Promise.resolve({
          data: [{ uuid: coUuid, vendor_uuid: vendorUuid }]
        })
      }
      return Promise.resolve({ data: [] })
    })

    const stockReport = useStockReport()
    const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

    expect(result).toBeDefined()
    expect(result?.items.length).toBe(1)
    const item = result?.items[0]
    expect(item?.currentStock).toBe(7)
    expect(item?.totalValue).toBe(70.00)
  })

  it("should calculate weighted average unit cost correctly", async () => {
    const corporationUuid = "corp-1"
    const projectUuid = "proj-1"
    const projectItemUuid = "project-item-1"
    const poItemUuid1 = "po-item-1"
    const poItemUuid2 = "po-item-2"
    const poUuid = "po-1"
    const vendorUuid = "vendor-1"

    const receiptNoteItems = [
      {
        receipt_note_uuid: "rn-1",
        receipt_note_status: "Received",
        receipt_note_entry_date: "2024-01-01",
        receipt_note_updated_at: "2024-01-01",
        receipt_type: "purchase_order",
        item_type: "purchase_order",
        item_uuid: poItemUuid1,
        purchase_order_uuid: poUuid,
        change_order_uuid: null,
        cost_code_uuid: "cc-1",
        received_quantity: 5,
        received_total: 50.00 // $10 per unit
      },
      {
        receipt_note_uuid: "rn-2",
        receipt_note_status: "Received",
        receipt_note_entry_date: "2024-01-02",
        receipt_note_updated_at: "2024-01-02",
        receipt_type: "purchase_order",
        item_type: "purchase_order",
        item_uuid: poItemUuid2,
        purchase_order_uuid: poUuid,
        change_order_uuid: null,
        cost_code_uuid: "cc-1",
        received_quantity: 3,
        received_total: 45.00 // $15 per unit
      }
    ]

    const poItems = [
      {
        uuid: poItemUuid1,
        item_uuid: projectItemUuid,
        item_name: "Test Item 1",
        unit_price: 10.00,
        uom: "EA"
      },
      {
        uuid: poItemUuid2,
        item_uuid: projectItemUuid,
        item_name: "Test Item 1",
        unit_price: 15.00,
        uom: "EA"
      }
    ]

    vi.mocked($fetch).mockImplementation((url: string) => {
      if (url === "/api/receipt-note-items") {
        return Promise.resolve({ data: receiptNoteItems })
      }
      if (url === "/api/purchase-orders/vendors") {
        return Promise.resolve({
          data: [{ uuid: vendorUuid, vendor_name: "Test Vendor" }]
        })
      }
      if (url === "/api/cost-code-configurations") {
        return Promise.resolve({ data: [{ uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" }] })
      }
      if (url === "/api/purchase-order-items") {
        return Promise.resolve({ data: poItems })
      }
      if (url === `/api/purchase-order-forms/${poUuid}`) {
        return Promise.resolve({
          data: { uuid: poUuid, vendor_uuid: vendorUuid }
        })
      }
      return Promise.resolve({ data: [] })
    })

    const stockReport = useStockReport()
    const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

    const item = result?.items[0]
    // Weighted average: (50 + 45) / (5 + 3) = 95 / 8 = 11.875
    expect(item?.unitCost).toBeCloseTo(11.875, 2)
    expect(item?.totalValue).toBe(95.00)
  })

  it("should handle multiple vendors and mark as 'Multiple'", async () => {
    const corporationUuid = "corp-1"
    const projectUuid = "proj-1"
    const projectItemUuid = "project-item-1"
    const poItemUuid1 = "po-item-1"
    const poItemUuid2 = "po-item-2"
    const poUuid1 = "po-1"
    const poUuid2 = "po-2"
    const vendorUuid1 = "vendor-1"
    const vendorUuid2 = "vendor-2"

    const receiptNoteItems = [
      {
        receipt_note_uuid: "rn-1",
        receipt_note_status: "Received",
        receipt_note_entry_date: "2024-01-01",
        receipt_note_updated_at: "2024-01-01",
        receipt_type: "purchase_order",
        item_type: "purchase_order",
        item_uuid: poItemUuid1,
        purchase_order_uuid: poUuid1,
        change_order_uuid: null,
        cost_code_uuid: "cc-1",
        received_quantity: 5,
        received_total: 50.00
      },
      {
        receipt_note_uuid: "rn-2",
        receipt_note_status: "Received",
        receipt_note_entry_date: "2024-01-02",
        receipt_note_updated_at: "2024-01-02",
        receipt_type: "purchase_order",
        item_type: "purchase_order",
        item_uuid: poItemUuid2,
        purchase_order_uuid: poUuid2,
        change_order_uuid: null,
        cost_code_uuid: "cc-1",
        received_quantity: 3,
        received_total: 30.00
      }
    ]

    const poItems1 = [
      {
        uuid: poItemUuid1,
        item_uuid: projectItemUuid,
        item_name: "Test Item 1",
        unit_price: 10.00,
        uom: "EA"
      }
    ]

    const poItems2 = [
      {
        uuid: poItemUuid2,
        item_uuid: projectItemUuid,
        item_name: "Test Item 1",
        unit_price: 10.00,
        uom: "EA"
      }
    ]

    vi.mocked($fetch).mockImplementation((url: string, options?: any) => {
      if (url === "/api/receipt-note-items") {
        return Promise.resolve({ data: receiptNoteItems })
      }
      if (url === "/api/purchase-orders/vendors") {
        return Promise.resolve({
          data: [
            { uuid: vendorUuid1, vendor_name: "Vendor 1" },
            { uuid: vendorUuid2, vendor_name: "Vendor 2" }
          ]
        })
      }
      if (url === "/api/cost-code-configurations") {
        return Promise.resolve({ data: [{ uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" }] })
      }
      if (url === "/api/purchase-order-items") {
        const params = options?.params || {}
        if (params.purchase_order_uuid === poUuid1) {
          return Promise.resolve({ data: poItems1 })
        }
        if (params.purchase_order_uuid === poUuid2) {
          return Promise.resolve({ data: poItems2 })
        }
        return Promise.resolve({ data: [] })
      }
      if (url === `/api/purchase-order-forms/${poUuid1}`) {
        return Promise.resolve({
          data: { uuid: poUuid1, vendor_uuid: vendorUuid1 }
        })
      }
      if (url === `/api/purchase-order-forms/${poUuid2}`) {
        return Promise.resolve({
          data: { uuid: poUuid2, vendor_uuid: vendorUuid2 }
        })
      }
      return Promise.resolve({ data: [] })
    })

    const stockReport = useStockReport()
    const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

    const item = result?.items[0]
    expect(item?.vendorSource).toBe("Multiple")
  })

  it("should calculate totals correctly", async () => {
    const corporationUuid = "corp-1"
    const projectUuid = "proj-1"
    const projectItemUuid1 = "project-item-1"
    const projectItemUuid2 = "project-item-2"
    const poItemUuid1 = "po-item-1"
    const poItemUuid2 = "po-item-2"
    const poUuid = "po-1"
    const vendorUuid = "vendor-1"

    const receiptNoteItems = [
      {
        receipt_note_uuid: "rn-1",
        receipt_note_status: "Received",
        receipt_note_entry_date: "2024-01-01",
        receipt_note_updated_at: "2024-01-01",
        receipt_type: "purchase_order",
        item_type: "purchase_order",
        item_uuid: poItemUuid1,
        purchase_order_uuid: poUuid,
        change_order_uuid: null,
        cost_code_uuid: "cc-1",
        received_quantity: 5,
        received_total: 50.00
      },
      {
        receipt_note_uuid: "rn-2",
        receipt_note_status: "Received",
        receipt_note_entry_date: "2024-01-02",
        receipt_note_updated_at: "2024-01-02",
        receipt_type: "purchase_order",
        item_type: "purchase_order",
        item_uuid: poItemUuid2,
        purchase_order_uuid: poUuid,
        change_order_uuid: null,
        cost_code_uuid: "cc-2",
        received_quantity: 3,
        received_total: 60.00
      }
    ]

    const poItems = [
      {
        uuid: poItemUuid1,
        item_uuid: projectItemUuid1,
        item_name: "Test Item 1",
        unit_price: 10.00,
        uom: "EA"
      },
      {
        uuid: poItemUuid2,
        item_uuid: projectItemUuid2,
        item_name: "Test Item 2",
        unit_price: 20.00,
        uom: "KG"
      }
    ]

    vi.mocked($fetch).mockImplementation((url: string) => {
      if (url === "/api/receipt-note-items") {
        return Promise.resolve({ data: receiptNoteItems })
      }
      if (url === "/api/purchase-orders/vendors") {
        return Promise.resolve({
          data: [{ uuid: vendorUuid, vendor_name: "Test Vendor" }]
        })
      }
      if (url === "/api/cost-code-configurations") {
        return Promise.resolve({
          data: [
            { uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code 1" },
            { uuid: "cc-2", cost_code_number: "02", cost_code_name: "Test Code 2" }
          ]
        })
      }
      if (url === "/api/purchase-order-items") {
        return Promise.resolve({ data: poItems })
      }
      if (url === `/api/purchase-order-forms/${poUuid}`) {
        return Promise.resolve({
          data: { uuid: poUuid, vendor_uuid: vendorUuid }
        })
      }
      return Promise.resolve({ data: [] })
    })

    const stockReport = useStockReport()
    const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

    expect(result?.totals).toBeDefined()
    expect(result?.totals.currentStock).toBe(8) // 5 + 3
    expect(result?.totals.totalValue).toBe(110.00) // 50 + 60
    expect(result?.totals.inShipment).toBe(0)
  })

  it("should handle errors gracefully in individual API calls", async () => {
    // Mock to throw error on the main API call
    vi.mocked($fetch).mockImplementation((url: string) => {
      if (url === "/api/receipt-note-items") {
        return Promise.reject(new Error("Network error"))
      }
      return Promise.resolve({ data: [] })
    })

    const stockReport = useStockReport()
    const result = await stockReport.generateStockReport("corp-1", "proj-1")

    // Individual API errors are caught and return empty arrays, so result will have empty items
    expect(result).toBeDefined()
    expect(result?.items).toEqual([])
    expect(stockReport.loading.value).toBe(false)
  })

  it("should handle errors in main flow and return null", async () => {
    // Mock cost code configurations store to throw error
    const errorStore = defineStore("costCodeConfigurations", () => ({
      fetchConfigurations: vi.fn().mockRejectedValue(new Error("Store error")),
      getItemById: vi.fn()
    }))

    // Create new pinia to isolate this test
    const newPinia = createPinia()
    setActivePinia(newPinia)

    errorStore()

    vi.mocked($fetch).mockResolvedValue({ data: [] })

    const stockReport = useStockReport()
    const result = await stockReport.generateStockReport("corp-1", "proj-1")

    // Main flow error should return null
    expect(result).toBeNull()
    expect(stockReport.error.value).toContain("Store error")
    expect(stockReport.loading.value).toBe(false)
  })

  it("should set loading state correctly during generation", async () => {
    const corporationUuid = "corp-1"
    const projectUuid = "proj-1"

    vi.mocked($fetch).mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ data: [] }), 100)
      })
    })

    const stockReport = useStockReport()

    // Start generation (don't await)
    const promise = stockReport.generateStockReport(corporationUuid, projectUuid)

    // Loading should be true during generation
    expect(stockReport.loading.value).toBe(true)

    // Wait for completion
    await promise

    // Loading should be false after completion
    expect(stockReport.loading.value).toBe(false)
  })

  it("should skip items when item details are not found", async () => {
    const corporationUuid = "corp-1"
    const projectUuid = "proj-1"
    const poItemUuid = "po-item-1"
    const poUuid = "po-1"

    const receiptNoteItems = [
      {
        receipt_note_uuid: "rn-1",
        receipt_note_status: "Received",
        receipt_note_entry_date: "2024-01-01",
        receipt_note_updated_at: "2024-01-01",
        receipt_type: "purchase_order",
        item_type: "purchase_order",
        item_uuid: poItemUuid,
        purchase_order_uuid: poUuid,
        change_order_uuid: null,
        cost_code_uuid: "cc-1",
        received_quantity: 5,
        received_total: 50.00
      }
    ]

    vi.mocked($fetch).mockImplementation((url: string) => {
      if (url === "/api/receipt-note-items") {
        return Promise.resolve({ data: receiptNoteItems })
      }
      if (url === "/api/purchase-orders/vendors") {
        return Promise.resolve({ data: [] })
      }
      if (url === "/api/cost-code-configurations") {
        return Promise.resolve({ data: [] })
      }
      if (url === "/api/purchase-order-items") {
        return Promise.resolve({ data: [] }) // No items found
      }
      return Promise.resolve({ data: [] })
    })

    const stockReport = useStockReport()
    const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

    expect(result).toBeDefined()
    expect(result?.items.length).toBe(0) // Item should be skipped
  })

  it("should use item sequence from project item when available", async () => {
    const corporationUuid = "corp-1"
    const projectUuid = "proj-1"
    const projectItemUuid = "project-item-1"
    const poItemUuid = "po-item-1"
    const poUuid = "po-1"
    const vendorUuid = "vendor-1"

    const receiptNoteItems = [
      {
        receipt_note_uuid: "rn-1",
        receipt_note_status: "Received",
        receipt_note_entry_date: "2024-01-01",
        receipt_note_updated_at: "2024-01-01",
        receipt_type: "purchase_order",
        item_type: "purchase_order",
        item_uuid: poItemUuid,
        purchase_order_uuid: poUuid,
        change_order_uuid: null,
        cost_code_uuid: "cc-1",
        received_quantity: 5,
        received_total: 50.00
      }
    ]

    const poItems = [
      {
        uuid: poItemUuid,
        item_uuid: projectItemUuid,
        item_name: "Test Item 1",
        unit_price: 10.00,
        uom: "EA"
      }
    ]

    vi.mocked($fetch).mockImplementation((url: string) => {
      if (url === "/api/receipt-note-items") {
        return Promise.resolve({ data: receiptNoteItems })
      }
      if (url === "/api/purchase-orders/vendors") {
        return Promise.resolve({
          data: [{ uuid: vendorUuid, vendor_name: "Test Vendor" }]
        })
      }
      if (url === "/api/cost-code-configurations") {
        return Promise.resolve({ data: [{ uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" }] })
      }
      if (url === "/api/purchase-order-items") {
        return Promise.resolve({ data: poItems })
      }
      if (url === `/api/purchase-order-forms/${poUuid}`) {
        return Promise.resolve({
          data: { uuid: poUuid, vendor_uuid: vendorUuid }
        })
      }
      return Promise.resolve({ data: [] })
    })

    const stockReport = useStockReport()
    const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

    const item = result?.items[0]
    expect(item?.itemCode).toBe("ITEM-001") // From project item
  })

  describe("Active Receipt Note Filtering", () => {
    it("should exclude receipt note items from inactive receipt notes", async () => {
      const corporationUuid = "corp-1"
      const projectUuid = "proj-1"
      const projectItemUuid = "project-item-1"
      const poItemUuid = "po-item-1"
      const poUuid = "po-1"
      const vendorUuid = "vendor-1"

      // Mock receipt note items - one from active receipt note, one from inactive
      const receiptNoteItems = [
        {
          receipt_note_uuid: "rn-active",
          receipt_note_status: "Received",
          receipt_note_entry_date: "2024-01-01",
          receipt_note_updated_at: "2024-01-01",
          receipt_type: "purchase_order",
          receipt_note_is_active: true, // Active receipt note
          item_type: "purchase_order",
          item_uuid: poItemUuid,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          cost_code_uuid: "cc-1",
          received_quantity: 10,
          received_total: 100.00
        },
        {
          receipt_note_uuid: "rn-inactive",
          receipt_note_status: "Received",
          receipt_note_entry_date: "2024-01-02",
          receipt_note_updated_at: "2024-01-02",
          receipt_type: "purchase_order",
          receipt_note_is_active: false, // Inactive receipt note - should be excluded
          item_type: "purchase_order",
          item_uuid: poItemUuid,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          cost_code_uuid: "cc-1",
          received_quantity: 5,
          received_total: 50.00
        }
      ]

      const poItems = [
        {
          uuid: poItemUuid,
          item_uuid: projectItemUuid,
          item_name: "Test Item 1",
          unit_price: 10.00,
          uom: "EA"
        }
      ]

      vi.mocked($fetch).mockImplementation((url: string) => {
        if (url === "/api/receipt-note-items") {
          return Promise.resolve({ data: receiptNoteItems })
        }
        if (url === "/api/purchase-orders/vendors") {
          return Promise.resolve({
            data: [{ uuid: vendorUuid, vendor_name: "Test Vendor" }]
          })
        }
        if (url === "/api/cost-code-configurations") {
          return Promise.resolve({ data: [{ uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" }] })
        }
        if (url === "/api/purchase-order-items") {
          return Promise.resolve({ data: poItems })
        }
        if (url === `/api/purchase-order-forms/${poUuid}`) {
          return Promise.resolve({
            data: { uuid: poUuid, vendor_uuid: vendorUuid }
          })
        }
        return Promise.resolve({ data: [] })
      })

      const stockReport = useStockReport()
      const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

      expect(result).toBeDefined()
      expect(result?.items.length).toBe(1)
      
      const item = result?.items[0]
      // Should only include quantities from active receipt note
      expect(item?.currentStock).toBe(10) // Only from active receipt note
      expect(item?.totalValue).toBe(100.00) // Only from active receipt note
      // Should NOT include the 5 quantity and 50.00 value from inactive receipt note
    })

    it("should include receipt note items from active receipt notes only", async () => {
      const corporationUuid = "corp-1"
      const projectUuid = "proj-1"
      const projectItemUuid = "project-item-1"
      const poItemUuid1 = "po-item-1"
      const poItemUuid2 = "po-item-2"
      const poUuid = "po-1"
      const vendorUuid = "vendor-1"

      // Mock receipt note items - all from active receipt notes
      const receiptNoteItems = [
        {
          receipt_note_uuid: "rn-active-1",
          receipt_note_status: "Received",
          receipt_note_entry_date: "2024-01-01",
          receipt_note_updated_at: "2024-01-01",
          receipt_type: "purchase_order",
          receipt_note_is_active: true, // Active
          item_type: "purchase_order",
          item_uuid: poItemUuid1,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          cost_code_uuid: "cc-1",
          received_quantity: 5,
          received_total: 50.00
        },
        {
          receipt_note_uuid: "rn-active-2",
          receipt_note_status: "Received",
          receipt_note_entry_date: "2024-01-02",
          receipt_note_updated_at: "2024-01-02",
          receipt_type: "purchase_order",
          receipt_note_is_active: true, // Active
          item_type: "purchase_order",
          item_uuid: poItemUuid2,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          cost_code_uuid: "cc-1",
          received_quantity: 3,
          received_total: 30.00
        }
      ]

      const poItems = [
        {
          uuid: poItemUuid1,
          item_uuid: projectItemUuid,
          item_name: "Test Item 1",
          unit_price: 10.00,
          uom: "EA"
        },
        {
          uuid: poItemUuid2,
          item_uuid: projectItemUuid,
          item_name: "Test Item 1",
          unit_price: 10.00,
          uom: "EA"
        }
      ]

      vi.mocked($fetch).mockImplementation((url: string) => {
        if (url === "/api/receipt-note-items") {
          return Promise.resolve({ data: receiptNoteItems })
        }
        if (url === "/api/purchase-orders/vendors") {
          return Promise.resolve({
            data: [{ uuid: vendorUuid, vendor_name: "Test Vendor" }]
          })
        }
        if (url === "/api/cost-code-configurations") {
          return Promise.resolve({ data: [{ uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" }] })
        }
        if (url === "/api/purchase-order-items") {
          return Promise.resolve({ data: poItems })
        }
        if (url === `/api/purchase-order-forms/${poUuid}`) {
          return Promise.resolve({
            data: { uuid: poUuid, vendor_uuid: vendorUuid }
          })
        }
        return Promise.resolve({ data: [] })
      })

      const stockReport = useStockReport()
      const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

      expect(result).toBeDefined()
      expect(result?.items.length).toBe(1)
      
      const item = result?.items[0]
      // Should include quantities from both active receipt notes
      expect(item?.currentStock).toBe(8) // 5 + 3
      expect(item?.totalValue).toBe(80.00) // 50 + 30
    })

    it("should handle receipt notes with is_active undefined or null as active", async () => {
      const corporationUuid = "corp-1"
      const projectUuid = "proj-1"
      const projectItemUuid = "project-item-1"
      const poItemUuid = "po-item-1"
      const poUuid = "po-1"
      const vendorUuid = "vendor-1"

      // Mock receipt note items - one with undefined is_active, one with null
      const receiptNoteItems = [
        {
          receipt_note_uuid: "rn-undefined",
          receipt_note_status: "Received",
          receipt_note_entry_date: "2024-01-01",
          receipt_note_updated_at: "2024-01-01",
          receipt_type: "purchase_order",
          receipt_note_is_active: undefined, // Should be treated as active
          item_type: "purchase_order",
          item_uuid: poItemUuid,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          cost_code_uuid: "cc-1",
          received_quantity: 5,
          received_total: 50.00
        },
        {
          receipt_note_uuid: "rn-null",
          receipt_note_status: "Received",
          receipt_note_entry_date: "2024-01-02",
          receipt_note_updated_at: "2024-01-02",
          receipt_type: "purchase_order",
          receipt_note_is_active: null, // Should be treated as active
          item_type: "purchase_order",
          item_uuid: poItemUuid,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          cost_code_uuid: "cc-1",
          received_quantity: 3,
          received_total: 30.00
        }
      ]

      const poItems = [
        {
          uuid: poItemUuid,
          item_uuid: projectItemUuid,
          item_name: "Test Item 1",
          unit_price: 10.00,
          uom: "EA"
        }
      ]

      vi.mocked($fetch).mockImplementation((url: string) => {
        if (url === "/api/receipt-note-items") {
          return Promise.resolve({ data: receiptNoteItems })
        }
        if (url === "/api/purchase-orders/vendors") {
          return Promise.resolve({
            data: [{ uuid: vendorUuid, vendor_name: "Test Vendor" }]
          })
        }
        if (url === "/api/cost-code-configurations") {
          return Promise.resolve({ data: [{ uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" }] })
        }
        if (url === "/api/purchase-order-items") {
          return Promise.resolve({ data: poItems })
        }
        if (url === `/api/purchase-order-forms/${poUuid}`) {
          return Promise.resolve({
            data: { uuid: poUuid, vendor_uuid: vendorUuid }
          })
        }
        return Promise.resolve({ data: [] })
      })

      const stockReport = useStockReport()
      const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

      expect(result).toBeDefined()
      expect(result?.items.length).toBe(1)
      
      const item = result?.items[0]
      // Should include quantities from both (undefined/null treated as active)
      expect(item?.currentStock).toBe(8) // 5 + 3
      expect(item?.totalValue).toBe(80.00) // 50 + 30
    })

    it("should filter inactive receipt notes for change orders as well", async () => {
      const corporationUuid = "corp-1"
      const projectUuid = "proj-1"
      const projectItemUuid = "project-item-1"
      const coItemUuid = "co-item-1"
      const coUuid = "co-1"
      const vendorUuid = "vendor-1"

      // Mock receipt note items - one from active CO receipt note, one from inactive
      const receiptNoteItems = [
        {
          receipt_note_uuid: "rn-co-active",
          receipt_note_status: "Received",
          receipt_note_entry_date: "2024-01-01",
          receipt_note_updated_at: "2024-01-01",
          receipt_type: "change_order",
          receipt_note_is_active: true, // Active receipt note
          item_type: "change_order",
          item_uuid: coItemUuid,
          purchase_order_uuid: null,
          change_order_uuid: coUuid,
          cost_code_uuid: "cc-1",
          received_quantity: 7,
          received_total: 70.00
        },
        {
          receipt_note_uuid: "rn-co-inactive",
          receipt_note_status: "Received",
          receipt_note_entry_date: "2024-01-02",
          receipt_note_updated_at: "2024-01-02",
          receipt_type: "change_order",
          receipt_note_is_active: false, // Inactive receipt note - should be excluded
          item_type: "change_order",
          item_uuid: coItemUuid,
          purchase_order_uuid: null,
          change_order_uuid: coUuid,
          cost_code_uuid: "cc-1",
          received_quantity: 3,
          received_total: 30.00
        }
      ]

      const coItems = [
        {
          uuid: coItemUuid,
          item_uuid: projectItemUuid,
          item_name: "Test Item 1",
          co_unit_price: 10.00,
          uom: "EA"
        }
      ]

      vi.mocked($fetch).mockImplementation((url: string, options?: any) => {
        if (url === "/api/receipt-note-items") {
          return Promise.resolve({ data: receiptNoteItems })
        }
        if (url === "/api/purchase-orders/vendors") {
          return Promise.resolve({
            data: [{ uuid: vendorUuid, vendor_name: "Test Vendor" }]
          })
        }
        if (url === "/api/cost-code-configurations") {
          return Promise.resolve({ data: [{ uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" }] })
        }
        if (url === "/api/change-order-items") {
          return Promise.resolve({ data: coItems })
        }
        if (url === "/api/change-orders") {
          return Promise.resolve({
            data: [{ uuid: coUuid, vendor_uuid: vendorUuid }]
          })
        }
        return Promise.resolve({ data: [] })
      })

      const stockReport = useStockReport()
      const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

      expect(result).toBeDefined()
      expect(result?.items.length).toBe(1)
      
      const item = result?.items[0]
      // Should only include quantities from active receipt note
      expect(item?.currentStock).toBe(7) // Only from active receipt note
      expect(item?.totalValue).toBe(70.00) // Only from active receipt note
      // Should NOT include the 3 quantity and 30.00 value from inactive receipt note
    })
  })

  describe("Returned Quantity", () => {
    it("should include returned quantities from return notes in the report", async () => {
      const corporationUuid = "corp-1"
      const projectUuid = "proj-1"
      const projectItemUuid = "project-item-1"
      const poItemUuid = "po-item-1"
      const poUuid = "po-1"
      const vendorUuid = "vendor-1"

      const receiptNoteItems = [
        {
          receipt_note_uuid: "rn-1",
          receipt_note_status: "Received",
          receipt_note_entry_date: "2024-01-01",
          receipt_note_updated_at: "2024-01-01",
          receipt_type: "purchase_order",
          receipt_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          cost_code_uuid: "cc-1",
          received_quantity: 20,
          received_total: 200.00
        }
      ]

      const returnNoteItems = [
        {
          return_note_uuid: "rtn-1",
          return_note_status: "Waiting",
          return_note_entry_date: "2024-01-02",
          return_note_updated_at: "2024-01-02",
          return_type: "purchase_order",
          return_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          return_quantity: 5,
          is_active: true
        }
      ]

      const poItems = [
        {
          uuid: poItemUuid,
          item_uuid: projectItemUuid,
          item_name: "Test Item 1",
          unit_price: 10.00,
          uom: "EA"
        }
      ]

      vi.mocked($fetch).mockImplementation((url: string) => {
        if (url === "/api/receipt-note-items") {
          return Promise.resolve({ data: receiptNoteItems })
        }
        if (url === "/api/return-note-items") {
          return Promise.resolve({ data: returnNoteItems })
        }
        if (url === "/api/purchase-orders/vendors") {
          return Promise.resolve({
            data: [{ uuid: vendorUuid, vendor_name: "Test Vendor" }]
          })
        }
        if (url === "/api/cost-code-configurations") {
          return Promise.resolve({ data: [{ uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" }] })
        }
        if (url === "/api/purchase-order-items") {
          return Promise.resolve({ data: poItems })
        }
        if (url === `/api/purchase-order-forms/${poUuid}`) {
          return Promise.resolve({
            data: { uuid: poUuid, vendor_uuid: vendorUuid }
          })
        }
        return Promise.resolve({ data: [] })
      })

      const stockReport = useStockReport()
      const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

      expect(result).toBeDefined()
      expect(result?.items.length).toBe(1)
      
      const item = result?.items[0]
      expect(item?.returnedQty).toBe(5) // Returned quantity should be included
      expect(item?.currentStock).toBe(20) // Received quantity
    })

    it("should aggregate returned quantities from multiple return notes", async () => {
      const corporationUuid = "corp-1"
      const projectUuid = "proj-1"
      const projectItemUuid = "project-item-1"
      const poItemUuid = "po-item-1"
      const poUuid = "po-1"
      const vendorUuid = "vendor-1"

      const receiptNoteItems = [
        {
          receipt_note_uuid: "rn-1",
          receipt_note_status: "Received",
          receipt_note_entry_date: "2024-01-01",
          receipt_note_updated_at: "2024-01-01",
          receipt_type: "purchase_order",
          receipt_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          cost_code_uuid: "cc-1",
          received_quantity: 20,
          received_total: 200.00
        }
      ]

      const returnNoteItems = [
        {
          return_note_uuid: "rtn-1",
          return_note_status: "Waiting",
          return_note_entry_date: "2024-01-02",
          return_note_updated_at: "2024-01-02",
          return_type: "purchase_order",
          return_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          return_quantity: 5,
          is_active: true
        },
        {
          return_note_uuid: "rtn-2",
          return_note_status: "Returned",
          return_note_entry_date: "2024-01-03",
          return_note_updated_at: "2024-01-03",
          return_type: "purchase_order",
          return_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          return_quantity: 3,
          is_active: true
        }
      ]

      const poItems = [
        {
          uuid: poItemUuid,
          item_uuid: projectItemUuid,
          item_name: "Test Item 1",
          unit_price: 10.00,
          uom: "EA"
        }
      ]

      vi.mocked($fetch).mockImplementation((url: string) => {
        if (url === "/api/receipt-note-items") {
          return Promise.resolve({ data: receiptNoteItems })
        }
        if (url === "/api/return-note-items") {
          return Promise.resolve({ data: returnNoteItems })
        }
        if (url === "/api/purchase-orders/vendors") {
          return Promise.resolve({
            data: [{ uuid: vendorUuid, vendor_name: "Test Vendor" }]
          })
        }
        if (url === "/api/cost-code-configurations") {
          return Promise.resolve({ data: [{ uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" }] })
        }
        if (url === "/api/purchase-order-items") {
          return Promise.resolve({ data: poItems })
        }
        if (url === `/api/purchase-order-forms/${poUuid}`) {
          return Promise.resolve({
            data: { uuid: poUuid, vendor_uuid: vendorUuid }
          })
        }
        return Promise.resolve({ data: [] })
      })

      const stockReport = useStockReport()
      const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

      expect(result).toBeDefined()
      const item = result?.items[0]
      expect(item?.returnedQty).toBe(8) // 5 + 3 aggregated
    })

    it("should aggregate returned quantities for items from different POs with same project item", async () => {
      const corporationUuid = "corp-1"
      const projectUuid = "proj-1"
      const projectItemUuid = "project-item-1"
      const poItemUuid1 = "po-item-1"
      const poItemUuid2 = "po-item-2"
      const poUuid1 = "po-1"
      const poUuid2 = "po-2"
      const vendorUuid = "vendor-1"

      const receiptNoteItems = [
        {
          receipt_note_uuid: "rn-1",
          receipt_note_status: "Received",
          receipt_note_entry_date: "2024-01-01",
          receipt_note_updated_at: "2024-01-01",
          receipt_type: "purchase_order",
          receipt_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid1,
          purchase_order_uuid: poUuid1,
          change_order_uuid: null,
          cost_code_uuid: "cc-1",
          received_quantity: 10,
          received_total: 100.00
        }
      ]

      const returnNoteItems = [
        {
          return_note_uuid: "rtn-1",
          return_note_status: "Waiting",
          return_note_entry_date: "2024-01-02",
          return_note_updated_at: "2024-01-02",
          return_type: "purchase_order",
          return_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid1,
          purchase_order_uuid: poUuid1,
          change_order_uuid: null,
          return_quantity: 3,
          is_active: true
        },
        {
          return_note_uuid: "rtn-2",
          return_note_status: "Returned",
          return_note_entry_date: "2024-01-03",
          return_note_updated_at: "2024-01-03",
          return_type: "purchase_order",
          return_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid2,
          purchase_order_uuid: poUuid2,
          change_order_uuid: null,
          return_quantity: 2,
          is_active: true
        }
      ]

      const poItems1 = [
        {
          uuid: poItemUuid1,
          item_uuid: projectItemUuid, // Same project item
          item_name: "Test Item 1",
          unit_price: 10.00,
          uom: "EA"
        }
      ]

      const poItems2 = [
        {
          uuid: poItemUuid2,
          item_uuid: projectItemUuid, // Same project item
          item_name: "Test Item 1",
          unit_price: 10.00,
          uom: "EA"
        }
      ]

      vi.mocked($fetch).mockImplementation((url: string, options?: any) => {
        if (url === "/api/receipt-note-items") {
          return Promise.resolve({ data: receiptNoteItems })
        }
        if (url === "/api/return-note-items") {
          return Promise.resolve({ data: returnNoteItems })
        }
        if (url === "/api/purchase-orders/vendors") {
          return Promise.resolve({
            data: [{ uuid: vendorUuid, vendor_name: "Test Vendor" }]
          })
        }
        if (url === "/api/cost-code-configurations") {
          return Promise.resolve({ data: [{ uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" }] })
        }
        if (url === "/api/purchase-order-items") {
          const params = options?.params || {}
          if (params.purchase_order_uuid === poUuid1) {
            return Promise.resolve({ data: poItems1 })
          }
          if (params.purchase_order_uuid === poUuid2) {
            return Promise.resolve({ data: poItems2 })
          }
          return Promise.resolve({ data: [] })
        }
        if (url === `/api/purchase-order-forms/${poUuid1}` || url === `/api/purchase-order-forms/${poUuid2}`) {
          return Promise.resolve({
            data: { uuid: url.includes(poUuid1) ? poUuid1 : poUuid2, vendor_uuid: vendorUuid }
          })
        }
        return Promise.resolve({ data: [] })
      })

      const stockReport = useStockReport()
      const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

      expect(result).toBeDefined()
      expect(result?.items.length).toBe(1) // Should be aggregated by project item UUID
      const item = result?.items[0]
      expect(item?.returnedQty).toBe(5) // 3 + 2 aggregated from different POs
    })

    it("should include returned quantities in totals", async () => {
      const corporationUuid = "corp-1"
      const projectUuid = "proj-1"
      const projectItemUuid1 = "project-item-1"
      const projectItemUuid2 = "project-item-2"
      const poItemUuid1 = "po-item-1"
      const poItemUuid2 = "po-item-2"
      const poUuid = "po-1"
      const vendorUuid = "vendor-1"

      const receiptNoteItems = [
        {
          receipt_note_uuid: "rn-1",
          receipt_note_status: "Received",
          receipt_note_entry_date: "2024-01-01",
          receipt_note_updated_at: "2024-01-01",
          receipt_type: "purchase_order",
          receipt_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid1,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          cost_code_uuid: "cc-1",
          received_quantity: 10,
          received_total: 100.00
        },
        {
          receipt_note_uuid: "rn-2",
          receipt_note_status: "Received",
          receipt_note_entry_date: "2024-01-02",
          receipt_note_updated_at: "2024-01-02",
          receipt_type: "purchase_order",
          receipt_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid2,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          cost_code_uuid: "cc-2",
          received_quantity: 15,
          received_total: 300.00
        }
      ]

      const returnNoteItems = [
        {
          return_note_uuid: "rtn-1",
          return_note_status: "Waiting",
          return_note_entry_date: "2024-01-03",
          return_note_updated_at: "2024-01-03",
          return_type: "purchase_order",
          return_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid1,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          return_quantity: 4,
          is_active: true
        },
        {
          return_note_uuid: "rtn-2",
          return_note_status: "Returned",
          return_note_entry_date: "2024-01-04",
          return_note_updated_at: "2024-01-04",
          return_type: "purchase_order",
          return_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid2,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          return_quantity: 6,
          is_active: true
        }
      ]

      const poItems = [
        {
          uuid: poItemUuid1,
          item_uuid: projectItemUuid1,
          item_name: "Test Item 1",
          unit_price: 10.00,
          uom: "EA"
        },
        {
          uuid: poItemUuid2,
          item_uuid: projectItemUuid2,
          item_name: "Test Item 2",
          unit_price: 20.00,
          uom: "KG"
        }
      ]

      vi.mocked($fetch).mockImplementation((url: string) => {
        if (url === "/api/receipt-note-items") {
          return Promise.resolve({ data: receiptNoteItems })
        }
        if (url === "/api/return-note-items") {
          return Promise.resolve({ data: returnNoteItems })
        }
        if (url === "/api/purchase-orders/vendors") {
          return Promise.resolve({
            data: [{ uuid: vendorUuid, vendor_name: "Test Vendor" }]
          })
        }
        if (url === "/api/cost-code-configurations") {
          return Promise.resolve({
            data: [
              { uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code 1" },
              { uuid: "cc-2", cost_code_number: "02", cost_code_name: "Test Code 2" }
            ]
          })
        }
        if (url === "/api/purchase-order-items") {
          return Promise.resolve({ data: poItems })
        }
        if (url === `/api/purchase-order-forms/${poUuid}`) {
          return Promise.resolve({
            data: { uuid: poUuid, vendor_uuid: vendorUuid }
          })
        }
        return Promise.resolve({ data: [] })
      })

      const stockReport = useStockReport()
      const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

      expect(result?.totals).toBeDefined()
      expect(result?.totals.returnedQty).toBe(10) // 4 + 6
      expect(result?.totals.currentStock).toBe(25) // 10 + 15
    })

    it("should handle returned quantities for change order items", async () => {
      const corporationUuid = "corp-1"
      const projectUuid = "proj-1"
      const projectItemUuid = "project-item-1"
      const coItemUuid = "co-item-1"
      const coUuid = "co-1"
      const vendorUuid = "vendor-1"

      const receiptNoteItems = [
        {
          receipt_note_uuid: "rn-1",
          receipt_note_status: "Received",
          receipt_note_entry_date: "2024-01-01",
          receipt_note_updated_at: "2024-01-01",
          receipt_type: "change_order",
          receipt_note_is_active: true,
          item_type: "change_order",
          item_uuid: coItemUuid,
          purchase_order_uuid: null,
          change_order_uuid: coUuid,
          cost_code_uuid: "cc-1",
          received_quantity: 12,
          received_total: 120.00
        }
      ]

      const returnNoteItems = [
        {
          return_note_uuid: "rtn-1",
          return_note_status: "Waiting",
          return_note_entry_date: "2024-01-02",
          return_note_updated_at: "2024-01-02",
          return_type: "change_order",
          return_note_is_active: true,
          item_type: "change_order",
          item_uuid: coItemUuid,
          purchase_order_uuid: null,
          change_order_uuid: coUuid,
          return_quantity: 4,
          is_active: true
        }
      ]

      const coItems = [
        {
          uuid: coItemUuid,
          item_uuid: projectItemUuid,
          item_name: "Test Item 1",
          co_unit_price: 10.00,
          uom: "EA"
        }
      ]

      vi.mocked($fetch).mockImplementation((url: string, options?: any) => {
        if (url === "/api/receipt-note-items") {
          return Promise.resolve({ data: receiptNoteItems })
        }
        if (url === "/api/return-note-items") {
          return Promise.resolve({ data: returnNoteItems })
        }
        if (url === "/api/purchase-orders/vendors") {
          return Promise.resolve({
            data: [{ uuid: vendorUuid, vendor_name: "Test Vendor" }]
          })
        }
        if (url === "/api/cost-code-configurations") {
          return Promise.resolve({ data: [{ uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" }] })
        }
        if (url === "/api/change-order-items") {
          return Promise.resolve({ data: coItems })
        }
        if (url === "/api/change-orders") {
          return Promise.resolve({
            data: [{ uuid: coUuid, vendor_uuid: vendorUuid }]
          })
        }
        return Promise.resolve({ data: [] })
      })

      const stockReport = useStockReport()
      const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

      expect(result).toBeDefined()
      expect(result?.items.length).toBe(1)
      const item = result?.items[0]
      expect(item?.returnedQty).toBe(4)
      expect(item?.currentStock).toBe(12)
    })

    it("should exclude inactive return note items from returned quantities", async () => {
      const corporationUuid = "corp-1"
      const projectUuid = "proj-1"
      const projectItemUuid = "project-item-1"
      const poItemUuid = "po-item-1"
      const poUuid = "po-1"
      const vendorUuid = "vendor-1"

      const receiptNoteItems = [
        {
          receipt_note_uuid: "rn-1",
          receipt_note_status: "Received",
          receipt_note_entry_date: "2024-01-01",
          receipt_note_updated_at: "2024-01-01",
          receipt_type: "purchase_order",
          receipt_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          cost_code_uuid: "cc-1",
          received_quantity: 20,
          received_total: 200.00
        }
      ]

      const returnNoteItems = [
        {
          return_note_uuid: "rtn-active",
          return_note_status: "Waiting",
          return_note_entry_date: "2024-01-02",
          return_note_updated_at: "2024-01-02",
          return_type: "purchase_order",
          return_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          return_quantity: 5,
          is_active: true // Active
        },
        {
          return_note_uuid: "rtn-inactive",
          return_note_status: "Waiting",
          return_note_entry_date: "2024-01-03",
          return_note_updated_at: "2024-01-03",
          return_type: "purchase_order",
          return_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          return_quantity: 3,
          is_active: false // Inactive - should be excluded
        }
      ]

      const poItems = [
        {
          uuid: poItemUuid,
          item_uuid: projectItemUuid,
          item_name: "Test Item 1",
          unit_price: 10.00,
          uom: "EA"
        }
      ]

      vi.mocked($fetch).mockImplementation((url: string) => {
        if (url === "/api/receipt-note-items") {
          return Promise.resolve({ data: receiptNoteItems })
        }
        if (url === "/api/return-note-items") {
          return Promise.resolve({ data: returnNoteItems })
        }
        if (url === "/api/purchase-orders/vendors") {
          return Promise.resolve({
            data: [{ uuid: vendorUuid, vendor_name: "Test Vendor" }]
          })
        }
        if (url === "/api/cost-code-configurations") {
          return Promise.resolve({ data: [{ uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" }] })
        }
        if (url === "/api/purchase-order-items") {
          return Promise.resolve({ data: poItems })
        }
        if (url === `/api/purchase-order-forms/${poUuid}`) {
          return Promise.resolve({
            data: { uuid: poUuid, vendor_uuid: vendorUuid }
          })
        }
        return Promise.resolve({ data: [] })
      })

      const stockReport = useStockReport()
      const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

      expect(result).toBeDefined()
      const item = result?.items[0]
      expect(item?.returnedQty).toBe(5) // Only from active return note item
      // Should NOT include the 3 from inactive return note item
    })

    it("should handle items with no return notes (returnedQty should be 0)", async () => {
      const corporationUuid = "corp-1"
      const projectUuid = "proj-1"
      const projectItemUuid = "project-item-1"
      const poItemUuid = "po-item-1"
      const poUuid = "po-1"
      const vendorUuid = "vendor-1"

      const receiptNoteItems = [
        {
          receipt_note_uuid: "rn-1",
          receipt_note_status: "Received",
          receipt_note_entry_date: "2024-01-01",
          receipt_note_updated_at: "2024-01-01",
          receipt_type: "purchase_order",
          receipt_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          cost_code_uuid: "cc-1",
          received_quantity: 10,
          received_total: 100.00
        }
      ]

      const poItems = [
        {
          uuid: poItemUuid,
          item_uuid: projectItemUuid,
          item_name: "Test Item 1",
          unit_price: 10.00,
          uom: "EA"
        }
      ]

      vi.mocked($fetch).mockImplementation((url: string) => {
        if (url === "/api/receipt-note-items") {
          return Promise.resolve({ data: receiptNoteItems })
        }
        if (url === "/api/return-note-items") {
          return Promise.resolve({ data: [] }) // No return notes
        }
        if (url === "/api/purchase-orders/vendors") {
          return Promise.resolve({
            data: [{ uuid: vendorUuid, vendor_name: "Test Vendor" }]
          })
        }
        if (url === "/api/cost-code-configurations") {
          return Promise.resolve({ data: [{ uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" }] })
        }
        if (url === "/api/purchase-order-items") {
          return Promise.resolve({ data: poItems })
        }
        if (url === `/api/purchase-order-forms/${poUuid}`) {
          return Promise.resolve({
            data: { uuid: poUuid, vendor_uuid: vendorUuid }
          })
        }
        return Promise.resolve({ data: [] })
      })

      const stockReport = useStockReport()
      const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

      expect(result).toBeDefined()
      const item = result?.items[0]
      expect(item?.returnedQty).toBe(0) // No return notes
      expect(item?.currentStock).toBe(10)
    })

    it("should aggregate returned quantities from all active return note items regardless of status", async () => {
      const corporationUuid = "corp-1"
      const projectUuid = "proj-1"
      const projectItemUuid = "project-item-1"
      const poItemUuid = "po-item-1"
      const poUuid = "po-1"
      const vendorUuid = "vendor-1"

      const receiptNoteItems = [
        {
          receipt_note_uuid: "rn-1",
          receipt_note_status: "Received",
          receipt_note_entry_date: "2024-01-01",
          receipt_note_updated_at: "2024-01-01",
          receipt_type: "purchase_order",
          receipt_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          cost_code_uuid: "cc-1",
          received_quantity: 20,
          received_total: 200.00
        }
      ]

      const returnNoteItems = [
        {
          return_note_uuid: "rtn-waiting",
          return_note_status: "Waiting",
          return_note_entry_date: "2024-01-02",
          return_note_updated_at: "2024-01-02",
          return_type: "purchase_order",
          return_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          return_quantity: 5,
          is_active: true
        },
        {
          return_note_uuid: "rtn-returned",
          return_note_status: "Returned",
          return_note_entry_date: "2024-01-03",
          return_note_updated_at: "2024-01-03",
          return_type: "purchase_order",
          return_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          return_quantity: 3,
          is_active: true
        },
        {
          return_note_uuid: "rtn-cancelled",
          return_note_status: "Cancelled",
          return_note_entry_date: "2024-01-04",
          return_note_updated_at: "2024-01-04",
          return_type: "purchase_order",
          return_note_is_active: true,
          item_type: "purchase_order",
          item_uuid: poItemUuid,
          purchase_order_uuid: poUuid,
          change_order_uuid: null,
          return_quantity: 2,
          is_active: true
        }
      ]

      const poItems = [
        {
          uuid: poItemUuid,
          item_uuid: projectItemUuid,
          item_name: "Test Item 1",
          unit_price: 10.00,
          uom: "EA"
        }
      ]

      vi.mocked($fetch).mockImplementation((url: string) => {
        if (url === "/api/receipt-note-items") {
          return Promise.resolve({ data: receiptNoteItems })
        }
        if (url === "/api/return-note-items") {
          return Promise.resolve({ data: returnNoteItems })
        }
        if (url === "/api/purchase-orders/vendors") {
          return Promise.resolve({
            data: [{ uuid: vendorUuid, vendor_name: "Test Vendor" }]
          })
        }
        if (url === "/api/cost-code-configurations") {
          return Promise.resolve({ data: [{ uuid: "cc-1", cost_code_number: "01", cost_code_name: "Test Code" }] })
        }
        if (url === "/api/purchase-order-items") {
          return Promise.resolve({ data: poItems })
        }
        if (url === `/api/purchase-order-forms/${poUuid}`) {
          return Promise.resolve({
            data: { uuid: poUuid, vendor_uuid: vendorUuid }
          })
        }
        return Promise.resolve({ data: [] })
      })

      const stockReport = useStockReport()
      const result = await stockReport.generateStockReport(corporationUuid, projectUuid)

      expect(result).toBeDefined()
      const item = result?.items[0]
      // Current implementation includes all active return note items regardless of status
      // (5 + 3 + 2 = 10)
      expect(item?.returnedQty).toBe(10)
    })
  })
})

