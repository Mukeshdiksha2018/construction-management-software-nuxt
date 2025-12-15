import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePOWiseStockReport } from '@/composables/usePOWiseStockReport'
import type { $Fetch } from "nitropack"

// Mock fetch
global.$fetch = vi.fn() as unknown as $Fetch

describe("usePOWiseStockReport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked($fetch).mockResolvedValue({ data: [] })
  })

  it("should initialize with correct default state", () => {
    const poWiseStockReport = usePOWiseStockReport()

    expect(poWiseStockReport.loading.value).toBe(false)
    expect(poWiseStockReport.error.value).toBeNull()
    expect(typeof poWiseStockReport.generatePOWiseStockReport).toBe("function")
  })

  it("should require corporation and project UUIDs", async () => {
    const poWiseStockReport = usePOWiseStockReport()

    const result = await poWiseStockReport.generatePOWiseStockReport("", "")

    expect(result).toBeNull()
    expect(poWiseStockReport.error.value).toBe("Corporation and project are required")
  })

  it("should fetch and return grouped PO data", async () => {
    const corporationUuid = "corp-1"
    const projectUuid = "proj-1"

    const mockResponse = {
      data: [
        {
          uuid: "po-1",
          po_number: "PO-001",
          po_date: "2024-01-01",
          vendor_uuid: "vendor-1",
          vendor_name: "Test Vendor",
          items: [
            {
              itemCode: "ITM001",
              itemName: "Cement (50kg)",
              description: "Portland Cement",
              vendorSource: "Test Vendor",
              costCode: "03 31 13 Heavyweight Structural Con",
              poNumber: "PO-001",
              poDate: "2024-01-01",
              orderedQuantity: 300,
              receivedQuantity: 300,
              returnedQuantity: 0,
              invoiceNumber: "154",
              invoiceDate: "2024-01-12",
              status: "Received",
              unitCost: 5.0,
              uom: "Bag",
              totalValue: 1500.0,
            },
          ],
          totals: {
            orderedQuantity: 300,
            receivedQuantity: 300,
            returnedQuantity: 0,
            totalValue: 1500.0,
          },
        },
      ],
      totals: {
        orderedQuantity: 300,
        receivedQuantity: 300,
        returnedQuantity: 0,
        totalValue: 1500.0,
      },
    };

    vi.mocked($fetch).mockResolvedValue(mockResponse)

    const poWiseStockReport = usePOWiseStockReport()
    const result = await poWiseStockReport.generatePOWiseStockReport(corporationUuid, projectUuid)

    expect(result).toBeDefined()
    expect(result?.data).toBeDefined()
    expect(result?.data.length).toBe(1)
    expect(result?.data[0].po_number).toBe("PO-001")
    expect(result?.data[0].items.length).toBe(1)
    expect(result?.totals.orderedQuantity).toBe(300)
    expect(result?.totals.receivedQuantity).toBe(300)
    expect(result?.totals.returnedQuantity).toBe(0);
    expect(result?.totals.totalValue).toBe(1500.00)
  })

  it("should handle empty response", async () => {
    const corporationUuid = "corp-1"
    const projectUuid = "proj-1"

    vi.mocked($fetch).mockResolvedValue({ data: [] })

    const poWiseStockReport = usePOWiseStockReport()
    const result = await poWiseStockReport.generatePOWiseStockReport(corporationUuid, projectUuid)

    expect(result).toBeDefined()
    expect(result?.data).toEqual([])
    expect(result?.totals.orderedQuantity).toBe(0)
    expect(result?.totals.receivedQuantity).toBe(0)
    expect(result?.totals.returnedQuantity).toBe(0);
    expect(result?.totals.totalValue).toBe(0)
  })

  it("should handle API errors gracefully", async () => {
    const corporationUuid = "corp-1"
    const projectUuid = "proj-1"

    vi.mocked($fetch).mockRejectedValue(new Error("Network error"))

    const poWiseStockReport = usePOWiseStockReport()
    const result = await poWiseStockReport.generatePOWiseStockReport(corporationUuid, projectUuid)

    expect(result).toBeNull()
    // The error message will be the actual error message from the catch block
    expect(poWiseStockReport.error.value).toBe("Network error")
    expect(poWiseStockReport.loading.value).toBe(false)
  })

  it("should set loading state correctly during generation", async () => {
    const corporationUuid = "corp-1"
    const projectUuid = "proj-1"

    vi.mocked($fetch).mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ data: [] }), 100)
      })
    })

    const poWiseStockReport = usePOWiseStockReport()

    // Start generation (don't await)
    const promise = poWiseStockReport.generatePOWiseStockReport(corporationUuid, projectUuid)

    // Loading should be true during generation
    expect(poWiseStockReport.loading.value).toBe(true)

    // Wait for completion
    await promise

    // Loading should be false after completion
    expect(poWiseStockReport.loading.value).toBe(false)
  })

  it("should handle multiple purchase orders", async () => {
    const corporationUuid = "corp-1"
    const projectUuid = "proj-1"

    const mockResponse = {
      data: [
        {
          uuid: "po-1",
          po_number: "PO-001",
          po_date: "2024-01-01",
          vendor_uuid: "vendor-1",
          vendor_name: "Vendor One",
          items: [
            {
              itemCode: "ITM001",
              itemName: "Item 1",
              orderedQuantity: 100,
              receivedQuantity: 100,
              returnedQuantity: 0,
              totalValue: 500.0,
            },
          ],
          totals: {
            orderedQuantity: 100,
            receivedQuantity: 100,
            returnedQuantity: 0,
            totalValue: 500.0,
          },
        },
        {
          uuid: "po-2",
          po_number: "PO-002",
          po_date: "2024-01-15",
          vendor_uuid: "vendor-2",
          vendor_name: "Vendor Two",
          items: [
            {
              itemCode: "ITM002",
              itemName: "Item 2",
              orderedQuantity: 200,
              receivedQuantity: 200,
              returnedQuantity: 0,
              totalValue: 1000.0,
            },
          ],
          totals: {
            orderedQuantity: 200,
            receivedQuantity: 200,
            returnedQuantity: 0,
            totalValue: 1000.0,
          },
        },
      ],
      totals: {
        orderedQuantity: 300,
        receivedQuantity: 300,
        returnedQuantity: 0,
        totalValue: 1500.0,
      },
    };

    vi.mocked($fetch).mockResolvedValue(mockResponse)

    const poWiseStockReport = usePOWiseStockReport()
    const result = await poWiseStockReport.generatePOWiseStockReport(corporationUuid, projectUuid)

    expect(result).toBeDefined()
    expect(result?.data.length).toBe(2)
    expect(result?.totals.orderedQuantity).toBe(300)
    expect(result?.totals.receivedQuantity).toBe(300)
    expect(result?.totals.returnedQuantity).toBe(0);
    expect(result?.totals.totalValue).toBe(1500.00)
  })

  it("should include returned quantities in report data", async () => {
    const corporationUuid = "corp-1";
    const projectUuid = "proj-1";

    const mockResponse = {
      data: [
        {
          uuid: "po-1",
          po_number: "PO-001",
          po_date: "2024-01-01",
          vendor_uuid: "vendor-1",
          vendor_name: "Test Vendor",
          items: [
            {
              itemCode: "ITM001",
              itemName: "Cement (50kg)",
              description: "Portland Cement",
              vendorSource: "Test Vendor",
              costCode: "03 31 13 Heavyweight Structural Con",
              poNumber: "PO-001",
              poDate: "2024-01-01",
              orderedQuantity: 300,
              receivedQuantity: 300,
              returnedQuantity: 50,
              invoiceNumber: "154",
              invoiceDate: "2024-01-12",
              status: "Received",
              unitCost: 5.0,
              uom: "Bag",
              totalValue: 1500.0,
            },
          ],
          totals: {
            orderedQuantity: 300,
            receivedQuantity: 300,
            returnedQuantity: 50,
            totalValue: 1500.0,
          },
        },
      ],
      totals: {
        orderedQuantity: 300,
        receivedQuantity: 300,
        returnedQuantity: 50,
        totalValue: 1500.0,
      },
    };

    vi.mocked($fetch).mockResolvedValue(mockResponse);

    const poWiseStockReport = usePOWiseStockReport();
    const result = await poWiseStockReport.generatePOWiseStockReport(
      corporationUuid,
      projectUuid
    );

    expect(result).toBeDefined();
    expect(result?.data[0].items[0].returnedQuantity).toBe(50);
    expect(result?.data[0].totals.returnedQuantity).toBe(50);
    expect(result?.totals.returnedQuantity).toBe(50);
  });

  it("should handle missing data gracefully", async () => {
    const corporationUuid = "corp-1"
    const projectUuid = "proj-1"

    vi.mocked($fetch).mockResolvedValue({})

    const poWiseStockReport = usePOWiseStockReport()
    const result = await poWiseStockReport.generatePOWiseStockReport(corporationUuid, projectUuid)

    expect(result).toBeDefined()
    expect(result?.data).toEqual([])
      expect(result?.totals.orderedQuantity).toBe(0);
      expect(result?.totals.returnedQuantity).toBe(0);
  })

  it("should call API with correct parameters", async () => {
    const corporationUuid = "corp-1"
    const projectUuid = "proj-1"

    vi.mocked($fetch).mockResolvedValue({ data: [] })

    const poWiseStockReport = usePOWiseStockReport()
    await poWiseStockReport.generatePOWiseStockReport(corporationUuid, projectUuid)

    expect($fetch).toHaveBeenCalledWith(
      "/api/reports/po-wise-stock-report",
      expect.objectContaining({
        method: "GET",
        params: {
          corporation_uuid: corporationUuid,
          project_uuid: projectUuid
        }
      })
    )
  })
})

