import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia, defineStore } from 'pinia'
import { computed, ref, readonly } from 'vue'
import { useBudgetReport } from '@/composables/useBudgetReport'
import type { $Fetch } from "nitropack";

// Mock fetch
global.$fetch = vi.fn() as unknown as $Fetch;

describe("useBudgetReport", () => {
  let pinia: any;
  let mockCostCodeDivisionsStore: any;
  let mockCostCodeConfigurationsStore: any;
  let mockEstimatesStore: any;
  let mockPurchaseOrdersStore: any;
  let mockChangeOrdersStore: any;
  let mockBillEntriesStore: any;
  let mockProjectsStore: any;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();

    // Reset $fetch mock to return empty data by default
    vi.mocked($fetch).mockResolvedValue({ data: [] });

    // Mock store factories
    mockCostCodeDivisionsStore = defineStore("costCodeDivisions", () => ({
      fetchDivisions: vi.fn(),
      getActiveDivisions: vi.fn(() => [
        {
          uuid: "div-1",
          division_number: "01",
          division_name: "General Requirements",
          division_order: 1,
        },
        {
          uuid: "div-2",
          division_number: "02",
          division_name: "Site Construction",
          division_order: 2,
        },
      ]),
    }));

    mockCostCodeConfigurationsStore = defineStore(
      "costCodeConfigurations",
      () => ({
        fetchConfigurations: vi.fn(),
        getConfigurationsByCorporation: vi.fn(() => [
          {
            uuid: "cc-1",
            cost_code_number: "01-100",
            cost_code_name: "Project Management",
            division_uuid: "div-1",
            parent_cost_code_uuid: null,
            is_active: true,
            order: 1,
          },
          {
            uuid: "cc-2",
            cost_code_number: "02-200",
            cost_code_name: "Site Work",
            division_uuid: "div-2",
            parent_cost_code_uuid: null,
            is_active: true,
            order: 1,
          },
          {
            uuid: "cc-3",
            cost_code_number: "02-210",
            cost_code_name: "Excavation",
            division_uuid: "div-2",
            parent_cost_code_uuid: "cc-2",
            is_active: true,
            order: 1,
          },
        ]),
      })
    );

    mockEstimatesStore = defineStore("estimates", () => ({
      fetchEstimates: vi.fn(),
      getEstimatesByProject: vi.fn(() => [
        {
          uuid: "est-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          line_items: [
            {
              cost_code_uuid: "cc-1",
              total_amount: 5000,
            },
            {
              cost_code_uuid: "cc-2",
              total_amount: 10000,
            },
          ],
        },
      ]),
    }));

    mockPurchaseOrdersStore = defineStore("purchaseOrders", () => ({
      fetchPurchaseOrders: vi.fn(),
      purchaseOrders: [
        {
          uuid: "po-1",
          project_uuid: "proj-1",
          status: "Draft",
          is_active: true,
          po_items: [
            {
              cost_code_uuid: "cc-1",
              po_unit_price: 100,
              po_quantity: 4,
              po_total: 400,
            },
          ],
        },
      ],
    }));

    mockChangeOrdersStore = defineStore("changeOrders", () => ({
      fetchChangeOrders: vi.fn(),
      changeOrders: [
        {
          uuid: "co-1",
          project_uuid: "proj-1",
          status: "Approved", // Changed to Approved - only Approved COs are included in change order amounts
          is_active: true,
          co_type: "MATERIAL", // Add co_type for material change orders
          co_items: [
            {
              cost_code_uuid: "cc-1",
              co_unit_price: 50,
              co_quantity: 2,
              co_total: 100,
            },
          ],
        },
      ],
    }));

    mockBillEntriesStore = defineStore("billEntries", () => ({
      fetchBillEntries: vi.fn(),
      billEntries: [],
    }));

    mockProjectsStore = defineStore("projects", () => ({
      currentProject: null,
      loadCurrentProject: vi.fn(),
      fetchProject: vi.fn(),
      projects: [
        {
          uuid: "proj-1",
          project_name: "Test Project",
          project_id: "TP-001",
          no_of_rooms: 100,
        },
      ],
    }));

    // Initialize all stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockEstimatesStore();
    mockPurchaseOrdersStore();
    mockChangeOrdersStore();
    mockBillEntriesStore();
    mockProjectsStore();
  });

  it("should initialize with correct default state", () => {
    const budgetReport = useBudgetReport();

    expect(budgetReport.loading.value).toBe(false);
    expect(budgetReport.error.value).toBeNull();
    expect(typeof budgetReport.generateBudgetReport).toBe("function");
  });

  it("should require corporation and project UUIDs", async () => {
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("", "");

    expect(result).toBeNull();
    expect(budgetReport.error.value).toBe(
      "Corporation and project are required"
    );
  });

  it("should calculate budgeted amounts from estimates only (not including POs)", async () => {
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    expect(result).toBeDefined();
    expect(result?.divisions).toBeDefined();

    // Find the cost code cc-1 which has:
    // - Estimate: 5000
    // - PO (Draft): 400 (should NOT be in budgeted)
    // - CO (Draft): 100
    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    expect(division1).toBeDefined();

    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");
    expect(costCode1).toBeDefined();

    // Budgeted should ONLY include estimate amount (5000), NOT the PO amount (400)
    expect(costCode1?.budgetedAmount).toBe(5000);
    // Purchase order amount should be 0 (Draft PO is not included)
    expect(costCode1?.purchaseOrderAmount).toBe(0);
    expect(costCode1?.changeOrderAmount).toBe(100);
    // Total amount = Purchase Order Amount + Change Order Amount (excluding Budgeted Amount)
    expect(costCode1?.totalAmount).toBe(100); // 0 + 100 (PO + CO, excluding budget)
  });

  it("should add PO amounts to paid only when PO is approved", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize all stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockEstimatesStore();
    mockBillEntriesStore();
    mockProjectsStore();

    // Override the PO store with an approved PO that has items already loaded
    const approvedPOStore = defineStore("purchaseOrders", () => ({
      fetchPurchaseOrders: vi.fn(),
      purchaseOrders: [
        {
          uuid: "po-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          po_items: [
            {
              cost_code_uuid: "cc-1",
              po_unit_price: 100,
              po_quantity: 4,
              po_total: 400,
            },
          ],
        },
      ],
    }));

    // Override CO store with approved CO
    const approvedCOStore = defineStore("changeOrders", () => ({
      fetchChangeOrders: vi.fn(),
      changeOrders: [
        {
          uuid: "co-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          co_type: "MATERIAL",
          co_items: [
            {
              cost_code_uuid: "cc-1",
              co_unit_price: 50,
              co_quantity: 2,
              co_total: 100,
            },
          ],
        },
      ],
    }));

    approvedPOStore();
    approvedCOStore();
    
    // Mock vendor invoices API - return a paid invoice for the PO
    vi.mocked($fetch).mockImplementation((url: string | any) => {
      const urlStr = typeof url === 'string' ? url : (url?.url || String(url));
      if (urlStr.includes("/api/vendor-invoices") && !urlStr.includes("/api/vendor-invoices/")) {
        return Promise.resolve({
          data: [
            {
              uuid: "invoice-1",
              project_uuid: "proj-1",
              status: "Paid",
              is_active: true,
              invoice_type: "AGAINST_PO",
              purchase_order_uuid: "po-1",
              amount: "500", // Total invoice amount including taxes
            },
          ],
        });
      }
      if (urlStr.includes("/api/vendor-invoices/invoice-1")) {
        return Promise.resolve({
          data: {
            uuid: "invoice-1",
            project_uuid: "proj-1",
            status: "Paid",
            is_active: true,
            invoice_type: "AGAINST_PO",
            purchase_order_uuid: "po-1",
            amount: "500",
            financial_breakdown: {
              totals: {
                item_total: 400,
                charges_total: 50,
                tax_total: 50,
              },
            },
            po_invoice_items: [
              {
                cost_code_uuid: "cc-1",
                invoice_total: 400,
                is_active: true,
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: [] });
    });
    
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Budgeted should still be just the estimate (5000)
    expect(costCode1?.budgetedAmount).toBe(5000);
    // Purchase order amount should be 400 (from Approved PO)
    expect(costCode1?.purchaseOrderAmount).toBe(400);
    // Change order amount should be 100 (from Approved CO)
    expect(costCode1?.changeOrderAmount).toBe(100);
    // Total amount = Purchase Order Amount + Change Order Amount (excluding Budgeted Amount)
    expect(costCode1?.totalAmount).toBe(500); // 400 + 100 (PO + CO, excluding budget)
    // Paid should be from vendor invoice: 500 (proportional distribution of invoice total)
    expect(costCode1?.paidAmount).toBe(500);
    // Budget remaining = Budgeted Amount - Total Amount = 5000 - 500 = 4500
    expect(costCode1?.budgetRemaining).toBe(4500);
  });

  it("should not add PO amounts to paid when PO is draft", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize all stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockEstimatesStore();
    mockPurchaseOrdersStore();
    mockBillEntriesStore();
    mockProjectsStore();

    // Override CO store with no change orders (or Draft ones that won't be included)
    const noCOStore = defineStore("changeOrders", () => ({
      fetchChangeOrders: vi.fn(),
      changeOrders: [], // No change orders
    }));

    noCOStore();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Draft PO should not contribute to paid amount
    // No approved COs, so paid should be 0
    expect(costCode1?.paidAmount).toBe(0);
  });

  it("should calculate hierarchical cost code totals correctly", async () => {
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division2 = result?.divisions.find((d) => d.uuid === "div-2");
    expect(division2).toBeDefined();

    // Parent cost code (cc-2)
    const parentCostCode = division2?.costCodes.find(
      (cc) => cc.uuid === "cc-2"
    );
    expect(parentCostCode).toBeDefined();

    // Should have budgeted amount of 10000 from estimate
    expect(parentCostCode?.budgetedAmount).toBe(10000);

    // Check if it has sub cost codes - cc-3 doesn't have budget, so subCostCodes will be undefined
    // This is expected behavior: only cost codes with budget are shown
    expect(parentCostCode?.subCostCodes).toBeUndefined();
  });

  it("should calculate division totals correctly", async () => {
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    expect(division1).toBeDefined();

    // Division 1 has cost code cc-1 with estimate 5000
    expect(division1?.totalBudgeted).toBe(5000);
    expect(division1?.totalPurchaseOrder).toBe(0); // Draft PO not included
    expect(division1?.totalChangeOrder).toBe(100);
    // Total amount = Purchase Order Amount + Change Order Amount (excluding Budgeted Amount)
    expect(division1?.totalAmount).toBe(100); // 0 + 100 (PO + CO, excluding budget)
  });

  it("should calculate overall summary correctly", async () => {
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    expect(result?.summary).toBeDefined();

    // Total budgeted should be sum of all estimates: 5000 (cc-1) + 10000 (cc-2) = 15000
    expect(result?.summary.totalBudgeted).toBe(15000);
    // Total purchase orders: 0 (Draft PO not included)
    expect(result?.summary.totalPurchaseOrder).toBe(0);
    // Total change orders: 100
    expect(result?.summary.totalChangeOrder).toBe(100);
    // Total amount = Purchase Order Amount + Change Order Amount (excluding Budgeted Amount)
    expect(result?.summary.totalAmount).toBe(100); // 0 + 100 (PO + CO, excluding budget)
    // Cost per room: 100 / 100 = 1
    expect(result?.summary.costPerRoom).toBe(1);
  });

  it("should handle change orders correctly", async () => {
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Change order amount should be tracked separately
    expect(costCode1?.changeOrderAmount).toBe(100);
    // Should not be added to budgeted
    expect(costCode1?.budgetedAmount).toBe(5000);
  });

  it("should add approved change order amounts to paid", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize all stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockEstimatesStore();
    mockPurchaseOrdersStore();
    mockBillEntriesStore();
    mockProjectsStore();

    // Override CO store with approved CO that has items already loaded
    const approvedCOStore = defineStore("changeOrders", () => ({
      fetchChangeOrders: vi.fn(),
      changeOrders: [
        {
          uuid: "co-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          co_type: "MATERIAL", // Add co_type for material change orders
          co_items: [
            {
              cost_code_uuid: "cc-1",
              co_unit_price: 50,
              co_quantity: 2,
              co_total: 100,
            },
          ],
        },
      ],
    }));

    approvedCOStore();
    
      // Mock vendor invoices API - return a paid invoice for the CO
    vi.mocked($fetch).mockImplementation((url: string | any) => {
      const urlStr = typeof url === 'string' ? url : (url?.url || String(url));
      if (urlStr.includes("/api/vendor-invoices") && !urlStr.includes("/api/vendor-invoices/")) {
        return Promise.resolve({
          data: [
            {
              uuid: "invoice-1",
              project_uuid: "proj-1",
              status: "Paid",
              is_active: true,
              invoice_type: "AGAINST_CO",
              change_order_uuid: "co-1",
              amount: "100",
            },
          ],
        });
      }
      if (urlStr.includes("/api/vendor-invoices/invoice-1")) {
        return Promise.resolve({
          data: {
            uuid: "invoice-1",
            project_uuid: "proj-1",
            status: "Paid",
            is_active: true,
            invoice_type: "AGAINST_CO",
            change_order_uuid: "co-1",
            amount: "100",
            financial_breakdown: {
              totals: {
                item_total: 100,
                charges_total: 0,
                tax_total: 0,
              },
            },
            co_invoice_items: [
              {
                cost_code_uuid: "cc-1",
                invoice_total: 100,
                is_active: true,
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: [] });
    });
    
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Approved CO should contribute to paid amount via vendor invoice
    expect(costCode1?.paidAmount).toBe(100);
  });

  it("should calculate cost per room correctly", async () => {
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Total amount for cc-1: 100 (0 PO + 100 CO, excluding budget)
    // Number of rooms: 100
    // Cost per room: 100 / 100 = 1
    expect(costCode1?.costPerRoom).toBe(1);
  });

  it("should handle projects without no_of_rooms gracefully", async () => {
    // Create new pinia instance to reset stores
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize all required stores with new pinia
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockEstimatesStore();
    mockPurchaseOrdersStore();
    mockChangeOrdersStore();
    mockBillEntriesStore();

    // Override project store without no_of_rooms
    const projectStoreNoRooms = defineStore("projects", () => ({
      currentProject: null,
      loadCurrentProject: vi.fn(),
      fetchProject: vi.fn(),
      projects: [
        {
          uuid: "proj-1",
          project_name: "Test Project",
          project_id: "TP-001",
          // no no_of_rooms field
        },
      ],
    }));

    projectStoreNoRooms();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    // Should default to 0 rooms when no_of_rooms is not available
    expect(result?.project.numberOfRooms).toBe(0);
  });

  it("should return null and set error when project is not found", async () => {
    // Override project store with no projects
    const emptyProjectStore = defineStore("projects", () => ({
      projects: [],
    }));

    emptyProjectStore();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport(
      "corp-1",
      "proj-999"
    );

    expect(result).toBeNull();
    expect(budgetReport.error.value).toBe("Project not found");
  });

  it("should filter inactive cost codes", async () => {
    // Override cost code store with inactive codes
    const costCodeStoreWithInactive = defineStore(
      "costCodeConfigurations",
      () => ({
        fetchConfigurations: vi.fn(),
        getConfigurationsByCorporation: vi.fn(() => [
          {
            uuid: "cc-1",
            cost_code_number: "01-100",
            cost_code_name: "Project Management",
            division_uuid: "div-1",
            parent_cost_code_uuid: null,
            is_active: true,
            order: 1,
          },
          {
            uuid: "cc-inactive",
            cost_code_number: "01-999",
            cost_code_name: "Inactive Code",
            division_uuid: "div-1",
            parent_cost_code_uuid: null,
            is_active: false, // Inactive
            order: 2,
          },
        ]),
      })
    );

    costCodeStoreWithInactive();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const inactiveCostCode = division1?.costCodes.find(
      (cc) => cc.uuid === "cc-inactive"
    );

    // Inactive cost code should not be included
    expect(inactiveCostCode).toBeUndefined();
  });

  it("should show cost codes that have any activity (budgeted, PO, CO, or paid amounts)", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize base stores
    mockCostCodeDivisionsStore();
    mockPurchaseOrdersStore();
    mockChangeOrdersStore();
    mockBillEntriesStore();
    mockProjectsStore();

    // Override cost code store with multiple cost codes
    const costCodeStoreMultiple = defineStore("costCodeConfigurations", () => ({
      fetchConfigurations: vi.fn(),
      getConfigurationsByCorporation: vi.fn(() => [
        {
          uuid: "cc-1",
          cost_code_number: "01-100",
          cost_code_name: "Project Management",
          division_uuid: "div-1",
          parent_cost_code_uuid: null,
          is_active: true,
          order: 1,
        },
        {
          uuid: "cc-no-budget",
          cost_code_number: "01-200",
          cost_code_name: "No Budget Code",
          division_uuid: "div-1",
          parent_cost_code_uuid: null,
          is_active: true,
          order: 2,
        },
        {
          uuid: "cc-2",
          cost_code_number: "02-200",
          cost_code_name: "Site Work",
          division_uuid: "div-2",
          parent_cost_code_uuid: null,
          is_active: true,
          order: 1,
        },
      ]),
    }));

    // Override estimates store with estimates for cc-1 and cc-2 (not cc-no-budget)
    const estimateStoreFiltered = defineStore("estimates", () => ({
      fetchEstimates: vi.fn(),
      getEstimatesByProject: vi.fn(() => [
        {
          uuid: "est-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          line_items: [
            {
              cost_code_uuid: "cc-1",
              total_amount: 5000, // cc-1 has budget
            },
            {
              cost_code_uuid: "cc-2",
              total_amount: 10000, // cc-2 has budget
            },
            // cc-no-budget has no estimate line item
          ],
        },
      ]),
    }));

    costCodeStoreMultiple();
    estimateStoreFiltered();
    
    // Mock vendor invoices API to return empty (no paid invoices)
    vi.mocked($fetch).mockImplementation((url: string | any) => {
      const urlStr = String(url || '');
      if (urlStr.includes("/api/vendor-invoices")) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
    
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    expect(division1).toBeDefined();

    // cc-1 should be included (has budget)
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");
    expect(costCode1).toBeDefined();
    expect(costCode1?.budgetedAmount).toBe(5000);

    // cc-no-budget should NOT be included (no budget, no PO, no CO, no paid)
    const costCodeNoBudget = division1?.costCodes.find(
      (cc) => cc.uuid === "cc-no-budget"
    );
    expect(costCodeNoBudget).toBeUndefined();

    // div-2 should be included (cc-2 has budget from estimate)
    const division2 = result?.divisions.find((d) => d.uuid === "div-2");
    expect(division2).toBeDefined();
  });

  it("should use po_total when available, otherwise calculate from unit price and quantity", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize all stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockEstimatesStore();
    mockBillEntriesStore();
    mockProjectsStore();

    // Override PO store with approved PO that has items with explicit po_total
    const poStoreWithTotal = defineStore("purchaseOrders", () => ({
      fetchPurchaseOrders: vi.fn(),
      purchaseOrders: [
        {
          uuid: "po-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          po_items: [
            {
              cost_code_uuid: "cc-1",
              po_unit_price: 100,
              po_quantity: 4,
              po_total: 500, // Different from unit_price * quantity (400)
            },
          ],
        },
      ],
    }));

    // Override CO store with no change orders to isolate PO test
    const noCOStore = defineStore("changeOrders", () => ({
      fetchChangeOrders: vi.fn(),
      changeOrders: [], // No change orders
    }));

    poStoreWithTotal();
    noCOStore();
    
    // Mock vendor invoices API - return a paid invoice for the PO
    vi.mocked($fetch).mockImplementation((url: string | any) => {
      const urlStr = typeof url === 'string' ? url : (url?.url || String(url));
      if (urlStr.includes("/api/vendor-invoices") && !urlStr.includes("/api/vendor-invoices/")) {
        return Promise.resolve({
          data: [
            {
              uuid: "invoice-1",
              project_uuid: "proj-1",
              status: "Paid",
              is_active: true,
              invoice_type: "AGAINST_PO",
              purchase_order_uuid: "po-1",
              amount: "500",
            },
          ],
        });
      }
      if (urlStr.includes("/api/vendor-invoices/invoice-1")) {
        return Promise.resolve({
          data: {
            uuid: "invoice-1",
            project_uuid: "proj-1",
            status: "Paid",
            is_active: true,
            invoice_type: "AGAINST_PO",
            purchase_order_uuid: "po-1",
            amount: "500",
            financial_breakdown: {
              totals: {
                item_total: 500,
                charges_total: 0,
                tax_total: 0,
              },
            },
            po_invoice_items: [
              {
                cost_code_uuid: "cc-1",
                invoice_total: 500,
                is_active: true,
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: [] });
    });
    
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Should use invoice amount (500) from paid vendor invoice
    expect(costCode1?.paidAmount).toBe(500);
  });

  it("should handle errors gracefully", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Override division store to throw error
    const errorDivisionStore = defineStore("costCodeDivisions", () => ({
      fetchDivisions: vi.fn().mockRejectedValue(new Error("Network error")),
      getActiveDivisions: vi.fn(() => []),
    }));

    // Initialize other required stores
    mockCostCodeConfigurationsStore();
    mockEstimatesStore();
    mockPurchaseOrdersStore();
    mockChangeOrdersStore();
    mockBillEntriesStore();
    mockProjectsStore();

    errorDivisionStore();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    expect(result).toBeNull();
    expect(budgetReport.error.value).toContain("Network error");
    expect(budgetReport.loading.value).toBe(false);
  });

  it("should set loading state correctly during generation", async () => {
    const budgetReport = useBudgetReport();

    // Start generation (don't await)
    const promise = budgetReport.generateBudgetReport("corp-1", "proj-1");

    // Loading should be true during generation
    expect(budgetReport.loading.value).toBe(true);

    // Wait for completion
    await promise;

    // Loading should be false after completion
    expect(budgetReport.loading.value).toBe(false);
  });

  it("should calculate budgeted amount including contingency when contingency is enabled", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize base stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockPurchaseOrdersStore();
    mockBillEntriesStore();
    mockProjectsStore();

    // Override change orders store with no change orders
    const changeOrdersStoreEmpty = defineStore("changeOrders", () => ({
      fetchChangeOrders: vi.fn(),
      changeOrders: [],
    }));

    // Override estimates store with an estimate that has contingency enabled
    // total_amount is the base amount (without contingency)
    const estimateStoreWithContingency = defineStore("estimates", () => ({
      fetchEstimates: vi.fn(),
      getEstimatesByProject: vi.fn(() => [
        {
          uuid: "est-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          line_items: [
            {
              cost_code_uuid: "cc-1",
              total_amount: 1000, // base amount (without contingency)
              contingency_enabled: true,
              contingency_percentage: 10,
            },
          ],
        },
      ]),
    }));

    changeOrdersStoreEmpty();
    estimateStoreWithContingency();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Budgeted amount = base amount (1000) + contingency (1000 * 10% = 100) = 1100
    expect(costCode1?.budgetedAmount).toBe(1100);

    // Total amount = Purchase Order Amount + Change Order Amount (excluding Budgeted Amount)
    // Total amount should be 0 (0 PO + 0 CO, excluding budget)
    expect(costCode1?.totalAmount).toBe(0);
  });

  it("should use total_amount directly when contingency is disabled", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize base stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockPurchaseOrdersStore();
    mockBillEntriesStore();
    mockProjectsStore();

    // Override change orders store with no change orders
    const changeOrdersStoreEmpty = defineStore("changeOrders", () => ({
      fetchChangeOrders: vi.fn(),
      changeOrders: [],
    }));

    // Override estimates store with an estimate that has contingency disabled
    const estimateStoreNoContingency = defineStore("estimates", () => ({
      fetchEstimates: vi.fn(),
      getEstimatesByProject: vi.fn(() => [
        {
          uuid: "est-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          line_items: [
            {
              cost_code_uuid: "cc-1",
              total_amount: 1000, // base amount (no contingency added)
              contingency_enabled: false,
              contingency_percentage: 10, // This is ignored since contingency_enabled is false
            },
          ],
        },
      ]),
    }));

    changeOrdersStoreEmpty();
    estimateStoreNoContingency();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Budgeted amount should use total_amount directly (1000) since contingency is disabled
    expect(costCode1?.budgetedAmount).toBe(1000);
  });

  it("should use project contingency percentage when item contingency_percentage is null", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize base stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockPurchaseOrdersStore();
    mockBillEntriesStore();

    // Override projects store with project that has 5% contingency
    const projectsStoreWithContingency = defineStore("projects", () => ({
      currentProject: {
        uuid: "proj-1",
        project_name: "Test Project",
        project_id: "TP-001",
        no_of_rooms: 100,
        contingency_percentage: 5,
      },
      loadCurrentProject: vi.fn(),
      fetchProject: vi.fn(),
      projects: [
        {
          uuid: "proj-1",
          project_name: "Test Project",
          project_id: "TP-001",
          no_of_rooms: 100,
          contingency_percentage: 5,
        },
      ],
    }));

    // Override change orders store with no change orders
    const changeOrdersStoreEmpty = defineStore("changeOrders", () => ({
      fetchChangeOrders: vi.fn(),
      changeOrders: [],
    }));

    // Override estimates store with an estimate that has contingency enabled but null percentage
    const estimateStoreWithNullContingency = defineStore("estimates", () => ({
      fetchEstimates: vi.fn(),
      getEstimatesByProject: vi.fn(() => [
        {
          uuid: "est-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          line_items: [
            {
              cost_code_uuid: "cc-1",
              total_amount: 1000, // base amount
              contingency_enabled: true,
              contingency_percentage: null, // Will use project contingency (5%)
            },
          ],
        },
      ]),
    }));

    projectsStoreWithContingency();
    changeOrdersStoreEmpty();
    estimateStoreWithNullContingency();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Budgeted amount = base amount (1000) + contingency (1000 * 5% = 50) = 1050
    expect(costCode1?.budgetedAmount).toBe(1050);
  });

  it("should use project contingency percentage when item contingency_percentage is undefined", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize base stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockPurchaseOrdersStore();
    mockBillEntriesStore();

    // Override projects store with project that has 5% contingency
    const projectsStoreWithContingency = defineStore("projects", () => ({
      currentProject: {
        uuid: "proj-1",
        project_name: "Test Project",
        project_id: "TP-001",
        no_of_rooms: 100,
        contingency_percentage: 5,
      },
      loadCurrentProject: vi.fn(),
      fetchProject: vi.fn(),
      projects: [
        {
          uuid: "proj-1",
          project_name: "Test Project",
          project_id: "TP-001",
          no_of_rooms: 100,
          contingency_percentage: 5,
        },
      ],
    }));

    // Override change orders store with no change orders
    const changeOrdersStoreEmpty = defineStore("changeOrders", () => ({
      fetchChangeOrders: vi.fn(),
      changeOrders: [],
    }));

    // Override estimates store with an estimate that has contingency enabled but undefined percentage
    const estimateStoreWithUndefinedContingency = defineStore("estimates", () => ({
      fetchEstimates: vi.fn(),
      getEstimatesByProject: vi.fn(() => [
        {
          uuid: "est-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          line_items: [
            {
              cost_code_uuid: "cc-1",
              total_amount: 1000, // base amount
              contingency_enabled: true,
              // contingency_percentage is undefined - will use project contingency (5%)
            },
          ],
        },
      ]),
    }));

    projectsStoreWithContingency();
    changeOrdersStoreEmpty();
    estimateStoreWithUndefinedContingency();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Budgeted amount = base amount (1000) + contingency (1000 * 5% = 50) = 1050
    expect(costCode1?.budgetedAmount).toBe(1050);
  });

  it("should use stored contingency_amount if available", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize base stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockPurchaseOrdersStore();
    mockBillEntriesStore();
    mockProjectsStore();

    // Override change orders store with no change orders
    const changeOrdersStoreEmpty = defineStore("changeOrders", () => ({
      fetchChangeOrders: vi.fn(),
      changeOrders: [],
    }));

    // Override estimates store with an estimate that has stored contingency_amount
    const estimateStoreWithStoredContingency = defineStore("estimates", () => ({
      fetchEstimates: vi.fn(),
      getEstimatesByProject: vi.fn(() => [
        {
          uuid: "est-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          line_items: [
            {
              cost_code_uuid: "cc-1",
              total_amount: 1000, // base amount
              contingency_amount: 75, // stored contingency amount (should be used instead of calculating)
              contingency_enabled: true,
              contingency_percentage: 10, // This should be ignored since contingency_amount is available
            },
          ],
        },
      ]),
    }));

    changeOrdersStoreEmpty();
    estimateStoreWithStoredContingency();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Budgeted amount = base amount (1000) + stored contingency_amount (75) = 1075
    // Note: Should use stored contingency_amount (75) instead of calculating (1000 * 10% = 100)
    expect(costCode1?.budgetedAmount).toBe(1075);
  });

  it("should handle decimal contingency percentages", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize base stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockPurchaseOrdersStore();
    mockBillEntriesStore();
    mockProjectsStore();

    // Override change orders store with no change orders
    const changeOrdersStoreEmpty = defineStore("changeOrders", () => ({
      fetchChangeOrders: vi.fn(),
      changeOrders: [],
    }));

    // Override estimates store with an estimate that has decimal contingency percentage
    const estimateStoreWithDecimalContingency = defineStore("estimates", () => ({
      fetchEstimates: vi.fn(),
      getEstimatesByProject: vi.fn(() => [
        {
          uuid: "est-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          line_items: [
            {
              cost_code_uuid: "cc-1",
              total_amount: 1000, // base amount
              contingency_enabled: true,
              contingency_percentage: 7.5, // decimal percentage
            },
          ],
        },
      ]),
    }));

    changeOrdersStoreEmpty();
    estimateStoreWithDecimalContingency();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Budgeted amount = base amount (1000) + contingency (1000 * 7.5% = 75) = 1075
    expect(costCode1?.budgetedAmount).toBe(1075);
  });

  it("should handle mixed line items with and without contingency", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize base stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockPurchaseOrdersStore();
    mockBillEntriesStore();

    // Override projects store with project that has 5% contingency
    const projectsStoreWithContingency = defineStore("projects", () => ({
      currentProject: {
        uuid: "proj-1",
        project_name: "Test Project",
        project_id: "TP-001",
        no_of_rooms: 100,
        contingency_percentage: 5,
      },
      loadCurrentProject: vi.fn(),
      fetchProject: vi.fn(),
      projects: [
        {
          uuid: "proj-1",
          project_name: "Test Project",
          project_id: "TP-001",
          no_of_rooms: 100,
          contingency_percentage: 5,
        },
      ],
    }));

    // Override change orders store with no change orders
    const changeOrdersStoreEmpty = defineStore("changeOrders", () => ({
      fetchChangeOrders: vi.fn(),
      changeOrders: [],
    }));

    // Override estimates store with mixed line items
    const estimateStoreWithMixedContingency = defineStore("estimates", () => ({
      fetchEstimates: vi.fn(),
      getEstimatesByProject: vi.fn(() => [
        {
          uuid: "est-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          line_items: [
            {
              cost_code_uuid: "cc-1",
              total_amount: 1000,
              contingency_enabled: true,
              contingency_percentage: 10, // Custom 10%
            },
            {
              cost_code_uuid: "cc-2",
              total_amount: 2000,
              contingency_enabled: false, // No contingency
              contingency_percentage: 5,
            },
            {
              cost_code_uuid: "cc-3",
              total_amount: 3000,
              contingency_enabled: true,
              contingency_percentage: null, // Will use project 5%
            },
          ],
        },
      ]),
    }));

    projectsStoreWithContingency();
    changeOrdersStoreEmpty();
    estimateStoreWithMixedContingency();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const division2 = result?.divisions.find((d) => d.uuid === "div-2");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");
    const costCode2 = division2?.costCodes.find((cc) => cc.uuid === "cc-2");
    // cc-3 is a sub-cost code of cc-2, so it's nested in cc-2's subCostCodes array
    const costCode3 = costCode2?.subCostCodes?.find((cc) => cc.uuid === "cc-3");

    // Budgeted amount for cc-1 = 1000 + (1000 * 10%) = 1100
    expect(costCode1?.budgetedAmount).toBe(1100);

    // Budgeted amount for cc-3 = 3000 + (3000 * 5%) = 3150
    expect(costCode3?.budgetedAmount).toBe(3150);

    // Budgeted amount for cc-2 = 2000 (no contingency) + cc-3's amount (3150) = 5150
    // Note: cc-2 is a parent cost code, so it includes its children's totals
    expect(costCode2?.budgetedAmount).toBe(5150);

    // Total budgeted should be sum: 1100 (cc-1) + 5150 (cc-2, which includes cc-3) = 6250
    // Note: cc-3 is included in cc-2's total, so we don't add it separately
    expect(result?.summary.totalBudgeted).toBe(6250);
  });

  describe("Estimate Filtering", () => {
    it("should only include approved and active estimates for budgeted amount calculation", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize base stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockPurchaseOrdersStore();
      mockChangeOrdersStore();
      mockBillEntriesStore();
      mockProjectsStore();

      // Override estimates store with multiple estimates (approved/active, draft, inactive)
      const estimateStoreFiltered = defineStore("estimates", () => ({
        fetchEstimates: vi.fn(),
        getEstimatesByProject: vi.fn(() => [
          {
            uuid: "est-approved-active",
            project_uuid: "proj-1",
            status: "Approved",
            is_active: true,
            line_items: [
              {
                cost_code_uuid: "cc-1",
                total_amount: 5000, // Should be included
              },
            ],
          },
          {
            uuid: "est-draft",
            project_uuid: "proj-1",
            status: "Draft",
            is_active: true,
            line_items: [
              {
                cost_code_uuid: "cc-1",
                total_amount: 2000, // Should NOT be included (not approved)
              },
            ],
          },
          {
            uuid: "est-inactive",
            project_uuid: "proj-1",
            status: "Approved",
            is_active: false,
            line_items: [
              {
                cost_code_uuid: "cc-1",
                total_amount: 1000, // Should NOT be included (not active)
              },
            ],
          },
          {
            uuid: "est-wrong-project",
            project_uuid: "proj-2", // Different project
            status: "Approved",
            is_active: true,
            line_items: [
              {
                cost_code_uuid: "cc-1",
                total_amount: 3000, // Should NOT be included (wrong project)
              },
            ],
          },
        ]),
      }));

      estimateStoreFiltered();
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

      // Only approved and active estimate for proj-1 should be included: 5000
      expect(costCode1?.budgetedAmount).toBe(5000);
    });

    it("should exclude draft estimates from budgeted amount calculation", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize base stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockPurchaseOrdersStore();
      mockBillEntriesStore();
      mockProjectsStore();

      // Override change orders store with no change orders (or only draft ones)
      const noCOStore = defineStore("changeOrders", () => ({
        fetchChangeOrders: vi.fn(),
        changeOrders: [], // No change orders
      }));

      // Override purchase orders store with no approved POs
      const noPOStore = defineStore("purchaseOrders", () => ({
        fetchPurchaseOrders: vi.fn(),
        purchaseOrders: [], // No purchase orders
      }));

      // Override estimates store with only draft estimates
      const estimateStoreDraft = defineStore("estimates", () => ({
        fetchEstimates: vi.fn(),
        getEstimatesByProject: vi.fn(() => [
          {
            uuid: "est-draft-1",
            project_uuid: "proj-1",
            status: "Draft",
            is_active: true,
            line_items: [
              {
                cost_code_uuid: "cc-1",
                total_amount: 5000, // Should NOT be included
              },
            ],
          },
        ]),
      }));

      noCOStore();
      noPOStore();
      estimateStoreDraft();
      
      // Mock vendor invoices API to return empty (no paid invoices)
      vi.mocked($fetch).mockImplementation((url: string | any) => {
        const urlStr = String(url || '');
        if (urlStr.includes("/api/vendor-invoices") && !urlStr.includes("/api/vendor-invoices/")) {
          return Promise.resolve({ data: [] });
        }
        // For other API calls, return empty data
        return Promise.resolve({ data: [] });
      });
      
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

      // Draft estimates should not be included, and no PO/CO/paid amounts, so cost code should not be shown
      expect(costCode1).toBeUndefined();
    });

    it("should exclude inactive estimates from budgeted amount calculation", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize base stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockBillEntriesStore();
      mockProjectsStore();

      // Override change orders store with no change orders
      const noCOStore = defineStore("changeOrders", () => ({
        fetchChangeOrders: vi.fn(),
        changeOrders: [], // No change orders
      }));

      // Override purchase orders store with no approved POs
      const noPOStore = defineStore("purchaseOrders", () => ({
        fetchPurchaseOrders: vi.fn(),
        purchaseOrders: [], // No purchase orders
      }));

      // Override estimates store with only inactive estimates
      const estimateStoreInactive = defineStore("estimates", () => ({
        fetchEstimates: vi.fn(),
        getEstimatesByProject: vi.fn(() => [
          {
            uuid: "est-inactive-1",
            project_uuid: "proj-1",
            status: "Approved",
            is_active: false,
            line_items: [
              {
                cost_code_uuid: "cc-1",
                total_amount: 5000, // Should NOT be included
              },
            ],
          },
        ]),
      }));

      noCOStore();
      noPOStore();
      estimateStoreInactive();
      
      // Mock vendor invoices API to return empty (no paid invoices)
      vi.mocked($fetch).mockImplementation((url: string | any) => {
        const urlStr = String(url || '');
        if (urlStr.includes("/api/vendor-invoices") && !urlStr.includes("/api/vendor-invoices/")) {
          return Promise.resolve({ data: [] });
        }
        // For other API calls, return empty data
        return Promise.resolve({ data: [] });
      });
      
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

      // Inactive estimates should not be included, and no PO/CO/paid amounts, so cost code should not be shown
      expect(costCode1).toBeUndefined();
    });

    it("should only include estimates for the specific project", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize base stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockPurchaseOrdersStore();
      mockChangeOrdersStore();
      mockBillEntriesStore();
      mockProjectsStore();

      // Override estimates store with estimates for different projects
      const estimateStoreMultipleProjects = defineStore("estimates", () => ({
        fetchEstimates: vi.fn(),
        getEstimatesByProject: vi.fn(() => [
          {
            uuid: "est-proj-1",
            project_uuid: "proj-1",
            status: "Approved",
            is_active: true,
            line_items: [
              {
                cost_code_uuid: "cc-1",
                total_amount: 5000, // Should be included (correct project)
              },
            ],
          },
          {
            uuid: "est-proj-2",
            project_uuid: "proj-2",
            status: "Approved",
            is_active: true,
            line_items: [
              {
                cost_code_uuid: "cc-1",
                total_amount: 3000, // Should NOT be included (different project)
              },
            ],
          },
        ]),
      }));

      estimateStoreMultipleProjects();
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

      // Only estimate for proj-1 should be included: 5000
      expect(costCode1?.budgetedAmount).toBe(5000);
    });
  });

  it("should include purchase order amounts when PO is approved", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize all stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockEstimatesStore();
    mockChangeOrdersStore();
    mockBillEntriesStore();
    mockProjectsStore();

    // Override PO store with approved PO
    const approvedPOStore = defineStore("purchaseOrders", () => ({
      fetchPurchaseOrders: vi.fn(),
      purchaseOrders: [
        {
          uuid: "po-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          po_items: [
            {
              cost_code_uuid: "cc-1",
              po_unit_price: 100,
              po_quantity: 3,
              po_total: 300,
            },
          ],
        },
      ],
    }));

    approvedPOStore();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Purchase order amount should be included
    expect(costCode1?.purchaseOrderAmount).toBe(300);
    // Total amount = Purchase Order Amount + Change Order Amount (excluding Budgeted Amount)
    // Total should be: 300 (PO) + 100 (CO) = 400
    expect(costCode1?.totalAmount).toBe(400);
  });

  it("should not include purchase order amounts when PO is draft", async () => {
    // This test uses the default mock which has a Draft PO
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Draft PO should not contribute to purchase order amount
    expect(costCode1?.purchaseOrderAmount).toBe(0);
  });

  it("should use po_total when available, otherwise calculate from unit price and quantity for purchase order amounts", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize all stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockEstimatesStore();
    mockChangeOrdersStore();
    mockBillEntriesStore();
    mockProjectsStore();

    // Override PO store with approved PO that has explicit po_total
    const poStoreWithTotal = defineStore("purchaseOrders", () => ({
      fetchPurchaseOrders: vi.fn(),
      purchaseOrders: [
        {
          uuid: "po-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          po_items: [
            {
              cost_code_uuid: "cc-1",
              po_unit_price: 100,
              po_quantity: 4,
              po_total: 450, // Different from unit_price * quantity (400)
            },
          ],
        },
      ],
    }));

    poStoreWithTotal();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Should use po_total (450) not calculated value (400)
    expect(costCode1?.purchaseOrderAmount).toBe(450);
  });

  it("should calculate purchase order amounts from unit price and quantity when po_total is not available", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize all stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockEstimatesStore();
    mockChangeOrdersStore();
    mockBillEntriesStore();
    mockProjectsStore();

    // Override PO store with approved PO that has no po_total
    const poStoreWithoutTotal = defineStore("purchaseOrders", () => ({
      fetchPurchaseOrders: vi.fn(),
      purchaseOrders: [
        {
          uuid: "po-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          po_items: [
            {
              cost_code_uuid: "cc-1",
              po_unit_price: 100,
              po_quantity: 5,
              // No po_total field
            },
          ],
        },
      ],
    }));

    poStoreWithoutTotal();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Should calculate: 100 * 5 = 500
    expect(costCode1?.purchaseOrderAmount).toBe(500);
  });

  it("should include purchase order amounts in division totals", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize all stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockEstimatesStore();
    mockChangeOrdersStore();
    mockBillEntriesStore();
    mockProjectsStore();

    // Override PO store with approved PO
    const approvedPOStore = defineStore("purchaseOrders", () => ({
      fetchPurchaseOrders: vi.fn(),
      purchaseOrders: [
        {
          uuid: "po-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          po_items: [
            {
              cost_code_uuid: "cc-1",
              po_unit_price: 100,
              po_quantity: 2,
              po_total: 200,
            },
          ],
        },
      ],
    }));

    approvedPOStore();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    expect(division1).toBeDefined();

    // Division total should include purchase order amount
    expect(division1?.totalPurchaseOrder).toBe(200);
    // Total amount = Purchase Order Amount + Change Order Amount (excluding Budgeted Amount)
    // Total amount: 200 (PO) + 100 (CO) = 300
    expect(division1?.totalAmount).toBe(300);
  });

  it("should include purchase order amounts in overall summary", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize all stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockEstimatesStore();
    mockChangeOrdersStore();
    mockBillEntriesStore();
    mockProjectsStore();

    // Override PO store with approved POs for multiple cost codes
    const approvedPOStore = defineStore("purchaseOrders", () => ({
      fetchPurchaseOrders: vi.fn(),
      purchaseOrders: [
        {
          uuid: "po-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          po_items: [
            {
              cost_code_uuid: "cc-1",
              po_unit_price: 100,
              po_quantity: 2,
              po_total: 200,
            },
            {
              cost_code_uuid: "cc-2",
              po_unit_price: 50,
              po_quantity: 4,
              po_total: 200,
            },
          ],
        },
      ],
    }));

    approvedPOStore();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    expect(result?.summary).toBeDefined();

    // Summary should include total purchase order amount: 200 + 200 = 400
    expect(result?.summary.totalPurchaseOrder).toBe(400);
    // Total amount = Purchase Order Amount + Change Order Amount (excluding Budgeted Amount)
    // Total amount: 400 (PO) + 100 (CO) = 500
    expect(result?.summary.totalAmount).toBe(500);
  });

  it("should include charges and taxes in purchase order amounts", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize all stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockEstimatesStore();
    mockChangeOrdersStore();
    mockBillEntriesStore();
    mockProjectsStore();

    // Override PO store with approved PO that has charges and taxes
    const poStoreWithCharges = defineStore("purchaseOrders", () => ({
      fetchPurchaseOrders: vi.fn(),
      purchaseOrders: [
        {
          uuid: "po-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          charges_total: 50, // $50 in charges
          tax_total: 25, // $25 in taxes
          po_items: [
            {
              cost_code_uuid: "cc-1",
              po_unit_price: 100,
              po_quantity: 2,
              po_total: 200, // Item total: $200
            },
          ],
        },
      ],
    }));

    poStoreWithCharges();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Purchase order amount should include item amount + charges + taxes
    // Item: $200, Charges: $50, Taxes: $25, Total: $275
    expect(costCode1?.purchaseOrderAmount).toBe(275);
  });

  it("should include charges and taxes in change order amounts for material COs", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize all stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockEstimatesStore();
    mockPurchaseOrdersStore();
    mockBillEntriesStore();
    mockProjectsStore();

    // Override CO store with approved material CO that has charges and taxes
    const coStoreWithCharges = defineStore("changeOrders", () => ({
      fetchChangeOrders: vi.fn(),
      changeOrders: [
        {
          uuid: "co-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          co_type: "MATERIAL",
          charges_total: 30, // $30 in charges
          tax_total: 15, // $15 in taxes
          co_items: [
            {
              cost_code_uuid: "cc-1",
              co_unit_price: 50,
              co_quantity: 2,
              co_total: 100, // Item total: $100
            },
          ],
        },
      ],
    }));

    coStoreWithCharges();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Change order amount should include item amount + charges + taxes
    // Item: $100, Charges: $30, Taxes: $15, Total: $145
    expect(costCode1?.changeOrderAmount).toBe(145);
  });

  it("should include charges and taxes in change order amounts for labor COs", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize all stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockEstimatesStore();
    mockPurchaseOrdersStore();
    mockBillEntriesStore();
    mockProjectsStore();

    // Override CO store with approved labor CO that has charges and taxes
    const coStoreWithCharges = defineStore("changeOrders", () => ({
      fetchChangeOrders: vi.fn(),
      changeOrders: [
        {
          uuid: "co-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          co_type: "LABOR",
          charges_total: 20, // $20 in charges
          tax_total: 10, // $10 in taxes
        },
      ],
    }));

    // Mock labor change order items API response
    vi.mocked($fetch).mockImplementation((url: string) => {
      if (url === "/api/labor-change-order-items") {
        return Promise.resolve({
          data: [
            {
              uuid: "lco-item-1",
              change_order_uuid: "co-1",
              cost_code_uuid: "cc-1",
              co_amount: 150, // Item total: $150
              is_active: true,
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    coStoreWithCharges();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Change order amount should include item amount + charges + taxes
    // Item: $150, Charges: $20, Taxes: $10, Total: $180
    expect(costCode1?.changeOrderAmount).toBe(180);
  });

  it("should distribute charges and taxes proportionally across multiple cost codes", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize all stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockEstimatesStore();
    mockChangeOrdersStore();
    mockBillEntriesStore();
    mockProjectsStore();

    // Override PO store with approved PO that has multiple cost codes
    const poStoreMultipleCodes = defineStore("purchaseOrders", () => ({
      fetchPurchaseOrders: vi.fn(),
      purchaseOrders: [
        {
          uuid: "po-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          charges_total: 60, // $60 in charges
          tax_total: 30, // $30 in taxes
          // Total charges and taxes: $90
          po_items: [
            {
              cost_code_uuid: "cc-1",
              po_unit_price: 100,
              po_quantity: 2,
              po_total: 200, // Item: $200 (66.67% of $300 total)
            },
            {
              cost_code_uuid: "cc-2",
              po_unit_price: 50,
              po_quantity: 2,
              po_total: 100, // Item: $100 (33.33% of $300 total)
            },
          ],
        },
      ],
    }));

    poStoreMultipleCodes();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const division2 = result?.divisions.find((d) => d.uuid === "div-2");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");
    const costCode2 = division2?.costCodes.find((cc) => cc.uuid === "cc-2");

    // cc-1: $200 item + (200/300 * 90) = $200 + $60 = $260
    expect(costCode1?.purchaseOrderAmount).toBe(260);
    // cc-2: $100 item + (100/300 * 90) = $100 + $30 = $130
    expect(costCode2?.purchaseOrderAmount).toBe(130);
    // Total should be: $260 + $130 = $390 (which is $300 items + $90 charges/taxes)
    expect(costCode1?.purchaseOrderAmount + costCode2?.purchaseOrderAmount).toBe(390);
  });

  it("should handle purchase orders with no charges or taxes", async () => {
    // Create new pinia to isolate this test
    const newPinia = createPinia();
    setActivePinia(newPinia);

    // Reinitialize all stores
    mockCostCodeDivisionsStore();
    mockCostCodeConfigurationsStore();
    mockEstimatesStore();
    mockChangeOrdersStore();
    mockBillEntriesStore();
    mockProjectsStore();

    // Override PO store with approved PO that has no charges or taxes
    const poStoreNoCharges = defineStore("purchaseOrders", () => ({
      fetchPurchaseOrders: vi.fn(),
      purchaseOrders: [
        {
          uuid: "po-1",
          project_uuid: "proj-1",
          status: "Approved",
          is_active: true,
          charges_total: 0,
          tax_total: 0,
          po_items: [
            {
              cost_code_uuid: "cc-1",
              po_unit_price: 100,
              po_quantity: 2,
              po_total: 200,
            },
          ],
        },
      ],
    }));

    poStoreNoCharges();
    const budgetReport = useBudgetReport();

    const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

    const division1 = result?.divisions.find((d) => d.uuid === "div-1");
    const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

    // Purchase order amount should be just the item amount when no charges/taxes
    expect(costCode1?.purchaseOrderAmount).toBe(200);
  });

  describe("Labor Purchase Orders in Purchase Order Amount Calculation", () => {
    it("should include labor purchase orders in purchase order amount calculation", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize all stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockEstimatesStore();
      mockChangeOrdersStore();
      mockBillEntriesStore();
      mockProjectsStore();

      // Override PO store with approved labor PO
      const poStoreLabor = defineStore("purchaseOrders", () => ({
        fetchPurchaseOrders: vi.fn(),
        purchaseOrders: [
          {
            uuid: "po-labor-1",
            project_uuid: "proj-1",
            status: "Approved",
            is_active: true,
            po_type: "LABOR",
            charges_total: 0,
            tax_total: 0,
          },
        ],
      }));

      // Mock labor purchase order items API response
      vi.mocked($fetch).mockImplementation((url: string) => {
        if (url === "/api/labor-purchase-order-items") {
          return Promise.resolve({
            data: [
              {
                uuid: "lpo-item-1",
                purchase_order_uuid: "po-labor-1",
                cost_code_uuid: "cc-1",
                po_amount: 500, // Labor PO amount: $500
                is_active: true,
              },
            ],
          });
        }
        // For other API calls, return empty data
        return Promise.resolve({ data: [] });
      });

      poStoreLabor();
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

      // Purchase order amount should include labor PO amount
      expect(costCode1?.purchaseOrderAmount).toBe(500);
    });

    it("should include charges and taxes in purchase order amounts for labor POs", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize all stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockEstimatesStore();
      mockChangeOrdersStore();
      mockBillEntriesStore();
      mockProjectsStore();

      // Override PO store with approved labor PO that has charges and taxes
      const poStoreLaborWithCharges = defineStore("purchaseOrders", () => ({
        fetchPurchaseOrders: vi.fn(),
        purchaseOrders: [
          {
            uuid: "po-labor-1",
            project_uuid: "proj-1",
            status: "Approved",
            is_active: true,
            po_type: "LABOR",
            charges_total: 50, // $50 in charges
            tax_total: 25, // $25 in taxes
          },
        ],
      }));

      // Mock labor purchase order items API response
      vi.mocked($fetch).mockImplementation((url: string) => {
        if (url === "/api/labor-purchase-order-items") {
          return Promise.resolve({
            data: [
              {
                uuid: "lpo-item-1",
                purchase_order_uuid: "po-labor-1",
                cost_code_uuid: "cc-1",
                po_amount: 300, // Labor PO amount: $300
                is_active: true,
              },
            ],
          });
        }
        // For other API calls, return empty data
        return Promise.resolve({ data: [] });
      });

      poStoreLaborWithCharges();
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

      // Purchase order amount should include item amount + charges + taxes
      // Item: $300, Charges: $50, Taxes: $25, Total: $375
      expect(costCode1?.purchaseOrderAmount).toBe(375);
    });

    it("should distribute charges and taxes proportionally across multiple cost codes for labor POs", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize all stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockEstimatesStore();
      mockChangeOrdersStore();
      mockBillEntriesStore();
      mockProjectsStore();

      // Override PO store with approved labor PO that has multiple cost codes
      const poStoreLaborMultipleCodes = defineStore("purchaseOrders", () => ({
        fetchPurchaseOrders: vi.fn(),
        purchaseOrders: [
          {
            uuid: "po-labor-1",
            project_uuid: "proj-1",
            status: "Approved",
            is_active: true,
            po_type: "LABOR",
            charges_total: 40, // $40 in charges
            tax_total: 20, // $20 in taxes
            // Total charges and taxes: $60
          },
        ],
      }));

      // Mock labor purchase order items API response with multiple cost codes
      vi.mocked($fetch).mockImplementation((url: string) => {
        if (url === "/api/labor-purchase-order-items") {
          return Promise.resolve({
            data: [
              {
                uuid: "lpo-item-1",
                purchase_order_uuid: "po-labor-1",
                cost_code_uuid: "cc-1",
                po_amount: 400, // Item: $400 (80% of $500 total)
                is_active: true,
              },
              {
                uuid: "lpo-item-2",
                purchase_order_uuid: "po-labor-1",
                cost_code_uuid: "cc-2",
                po_amount: 100, // Item: $100 (20% of $500 total)
                is_active: true,
              },
            ],
          });
        }
        // For other API calls, return empty data
        return Promise.resolve({ data: [] });
      });

      poStoreLaborMultipleCodes();
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const division2 = result?.divisions.find((d) => d.uuid === "div-2");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");
      const costCode2 = division2?.costCodes.find((cc) => cc.uuid === "cc-2");

      // cc-1: $400 item + (400/500 * 60) = $400 + $48 = $448
      expect(costCode1?.purchaseOrderAmount).toBe(448);
      // cc-2: $100 item + (100/500 * 60) = $100 + $12 = $112
      expect(costCode2?.purchaseOrderAmount).toBe(112);
      // Total should be: $448 + $112 = $560 (which is $500 items + $60 charges/taxes)
      expect(costCode1?.purchaseOrderAmount + costCode2?.purchaseOrderAmount).toBe(560);
    });

    it("should handle labor purchase orders with no charges or taxes", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize all stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockEstimatesStore();
      mockChangeOrdersStore();
      mockBillEntriesStore();
      mockProjectsStore();

      // Override PO store with approved labor PO that has no charges or taxes
      const poStoreLaborNoCharges = defineStore("purchaseOrders", () => ({
        fetchPurchaseOrders: vi.fn(),
        purchaseOrders: [
          {
            uuid: "po-labor-1",
            project_uuid: "proj-1",
            status: "Approved",
            is_active: true,
            po_type: "LABOR",
            charges_total: 0,
            tax_total: 0,
          },
        ],
      }));

      // Mock labor purchase order items API response
      vi.mocked($fetch).mockImplementation((url: string) => {
        if (url === "/api/labor-purchase-order-items") {
          return Promise.resolve({
            data: [
              {
                uuid: "lpo-item-1",
                purchase_order_uuid: "po-labor-1",
                cost_code_uuid: "cc-1",
                po_amount: 250,
                is_active: true,
              },
            ],
          });
        }
        // For other API calls, return empty data
        return Promise.resolve({ data: [] });
      });

      poStoreLaborNoCharges();
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

      // Purchase order amount should be just the item amount when no charges/taxes
      expect(costCode1?.purchaseOrderAmount).toBe(250);
    });

    it("should include both material and labor purchase orders in purchase order amount calculation", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize all stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockEstimatesStore();
      mockChangeOrdersStore();
      mockBillEntriesStore();
      mockProjectsStore();

      // Override PO store with both material and labor POs
      const poStoreMixed = defineStore("purchaseOrders", () => ({
        fetchPurchaseOrders: vi.fn(),
        purchaseOrders: [
          {
            uuid: "po-material-1",
            project_uuid: "proj-1",
            status: "Approved",
            is_active: true,
            po_type: "MATERIAL",
            charges_total: 0,
            tax_total: 0,
            po_items: [
              {
                cost_code_uuid: "cc-1",
                po_unit_price: 100,
                po_quantity: 2,
                po_total: 200, // Material PO: $200
              },
            ],
          },
          {
            uuid: "po-labor-1",
            project_uuid: "proj-1",
            status: "Approved",
            is_active: true,
            po_type: "LABOR",
            charges_total: 0,
            tax_total: 0,
          },
        ],
      }));

      // Mock labor purchase order items API response
      vi.mocked($fetch).mockImplementation((url: string) => {
        if (url === "/api/labor-purchase-order-items") {
          return Promise.resolve({
            data: [
              {
                uuid: "lpo-item-1",
                purchase_order_uuid: "po-labor-1",
                cost_code_uuid: "cc-1",
                po_amount: 300, // Labor PO: $300
                is_active: true,
              },
            ],
          });
        }
        // For other API calls, return empty data
        return Promise.resolve({ data: [] });
      });

      poStoreMixed();
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

      // Purchase order amount should include both material ($200) and labor ($300) = $500
      expect(costCode1?.purchaseOrderAmount).toBe(500);
    });

    it("should filter out inactive labor purchase order items", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize all stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockEstimatesStore();
      mockChangeOrdersStore();
      mockBillEntriesStore();
      mockProjectsStore();

      // Override PO store with approved labor PO
      const poStoreLabor = defineStore("purchaseOrders", () => ({
        fetchPurchaseOrders: vi.fn(),
        purchaseOrders: [
          {
            uuid: "po-labor-1",
            project_uuid: "proj-1",
            status: "Approved",
            is_active: true,
            po_type: "LABOR",
            charges_total: 0,
            tax_total: 0,
          },
        ],
      }));

      // Mock labor purchase order items API response with both active and inactive items
      vi.mocked($fetch).mockImplementation((url: string) => {
        if (url === "/api/labor-purchase-order-items") {
          return Promise.resolve({
            data: [
              {
                uuid: "lpo-item-1",
                purchase_order_uuid: "po-labor-1",
                cost_code_uuid: "cc-1",
                po_amount: 400,
                is_active: true, // Active item
              },
              {
                uuid: "lpo-item-2",
                purchase_order_uuid: "po-labor-1",
                cost_code_uuid: "cc-1",
                po_amount: 100,
                is_active: false, // Inactive item - should be filtered out
              },
            ],
          });
        }
        // For other API calls, return empty data
        return Promise.resolve({ data: [] });
      });

      poStoreLabor();
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

      // Purchase order amount should only include active item ($400), not inactive ($100)
      expect(costCode1?.purchaseOrderAmount).toBe(400);
    });
  });

  describe("Purchase Order and Change Order Status Filtering", () => {
    it("should include purchase orders with Partially_Received status in purchase order amount calculation", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize all stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockEstimatesStore();
      mockBillEntriesStore();
      mockProjectsStore();

      // Override CO store with no change orders to isolate PO test
      const noCOStore = defineStore("changeOrders", () => ({
        fetchChangeOrders: vi.fn(),
        changeOrders: [],
      }));

      // Override PO store with Partially_Received PO
      const partiallyReceivedPOStore = defineStore("purchaseOrders", () => ({
        fetchPurchaseOrders: vi.fn(),
        purchaseOrders: [
          {
            uuid: "po-1",
            project_uuid: "proj-1",
            status: "Partially_Received",
            is_active: true,
            po_items: [
              {
                cost_code_uuid: "cc-1",
                po_unit_price: 100,
                po_quantity: 3,
                po_total: 300,
              },
            ],
          },
        ],
      }));

      noCOStore();
      partiallyReceivedPOStore();
      
      // Mock vendor invoices API - return a paid invoice for the PO
      vi.mocked($fetch).mockImplementation((url: string | any) => {
        const urlStr = String(url || '');
        if (urlStr.includes("/api/vendor-invoices") && !urlStr.includes("/api/vendor-invoices/")) {
          return Promise.resolve({
            data: [
              {
                uuid: "invoice-1",
                project_uuid: "proj-1",
                status: "Paid",
                is_active: true,
                invoice_type: "AGAINST_PO",
                purchase_order_uuid: "po-1",
                amount: "300",
              },
            ],
          });
        }
        if (urlStr.includes("/api/vendor-invoices/invoice-1")) {
          return Promise.resolve({
            data: {
              uuid: "invoice-1",
              project_uuid: "proj-1",
              status: "Paid",
              is_active: true,
              invoice_type: "AGAINST_PO",
              purchase_order_uuid: "po-1",
              amount: "300",
              financial_breakdown: {
                totals: {
                  item_total: 300,
                  charges_total: 0,
                  tax_total: 0,
                },
              },
              po_invoice_items: [
                {
                  cost_code_uuid: "cc-1",
                  invoice_total: 300,
                  is_active: true,
                },
              ],
            },
          });
        }
        // For other API calls, return empty data
        return Promise.resolve({ data: [] });
      });
      
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

      // Purchase order amount should include Partially_Received PO
      expect(costCode1?.purchaseOrderAmount).toBe(300);
      // Paid amount should come from vendor invoice
      expect(costCode1?.paidAmount).toBe(300);
    });

    it("should include purchase orders with Completed status in purchase order amount calculation", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize all stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockEstimatesStore();
      mockBillEntriesStore();
      mockProjectsStore();

      // Override CO store with no change orders to isolate PO test
      const noCOStore = defineStore("changeOrders", () => ({
        fetchChangeOrders: vi.fn(),
        changeOrders: [],
      }));

      // Override PO store with Completed PO
      const completedPOStore = defineStore("purchaseOrders", () => ({
        fetchPurchaseOrders: vi.fn(),
        purchaseOrders: [
          {
            uuid: "po-1",
            project_uuid: "proj-1",
            status: "Completed",
            is_active: true,
            po_items: [
              {
                cost_code_uuid: "cc-1",
                po_unit_price: 100,
                po_quantity: 4,
                po_total: 400,
              },
            ],
          },
        ],
      }));

      noCOStore();
      completedPOStore();
      
      // Mock vendor invoices API - return a paid invoice for the PO
      vi.mocked($fetch).mockImplementation((url: string | any) => {
        const urlStr = String(url || '');
        if (urlStr.includes("/api/vendor-invoices") && !urlStr.includes("/api/vendor-invoices/")) {
          return Promise.resolve({
            data: [
              {
                uuid: "invoice-1",
                project_uuid: "proj-1",
                status: "Paid",
                is_active: true,
                invoice_type: "AGAINST_PO",
                purchase_order_uuid: "po-1",
                amount: "400",
              },
            ],
          });
        }
        if (urlStr.includes("/api/vendor-invoices/invoice-1")) {
          return Promise.resolve({
            data: {
              uuid: "invoice-1",
              project_uuid: "proj-1",
              status: "Paid",
              is_active: true,
              invoice_type: "AGAINST_PO",
              purchase_order_uuid: "po-1",
              amount: "400",
              financial_breakdown: {
                totals: {
                  item_total: 400,
                  charges_total: 0,
                  tax_total: 0,
                },
              },
              po_invoice_items: [
                {
                  cost_code_uuid: "cc-1",
                  invoice_total: 400,
                  is_active: true,
                },
              ],
            },
          });
        }
        // For other API calls, return empty data
        return Promise.resolve({ data: [] });
      });
      
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

      // Purchase order amount should include Completed PO
      expect(costCode1?.purchaseOrderAmount).toBe(400);
      // Paid amount should come from vendor invoice
      expect(costCode1?.paidAmount).toBe(400);
    });

    it("should include change orders with Partially_Received status in change order amount calculation", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize all stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockEstimatesStore();
      mockPurchaseOrdersStore();
      mockBillEntriesStore();
      mockProjectsStore();

      // Override CO store with Partially_Received CO
      const partiallyReceivedCOStore = defineStore("changeOrders", () => ({
        fetchChangeOrders: vi.fn(),
        changeOrders: [
          {
            uuid: "co-1",
            project_uuid: "proj-1",
            status: "Partially_Received",
            is_active: true,
            co_type: "MATERIAL",
            co_items: [
              {
                cost_code_uuid: "cc-1",
                co_unit_price: 50,
                co_quantity: 3,
                co_total: 150,
              },
            ],
          },
        ],
      }));

      partiallyReceivedCOStore();
      
      // Mock vendor invoices API - return a paid invoice for the CO
    vi.mocked($fetch).mockImplementation((url: string | any) => {
      const urlStr = typeof url === 'string' ? url : (url?.url || String(url));
      if (urlStr.includes("/api/vendor-invoices") && !urlStr.includes("/api/vendor-invoices/")) {
          return Promise.resolve({
            data: [
              {
                uuid: "invoice-1",
                project_uuid: "proj-1",
                status: "Paid",
                is_active: true,
                invoice_type: "AGAINST_CO",
                change_order_uuid: "co-1",
                amount: "150",
              },
            ],
          });
        }
        if (urlStr.includes("/api/vendor-invoices/invoice-1")) {
          return Promise.resolve({
            data: {
              uuid: "invoice-1",
              project_uuid: "proj-1",
              status: "Paid",
              is_active: true,
              invoice_type: "AGAINST_CO",
              change_order_uuid: "co-1",
              amount: "150",
              financial_breakdown: {
                totals: {
                  item_total: 150,
                  charges_total: 0,
                  tax_total: 0,
                },
              },
              co_invoice_items: [
                {
                  cost_code_uuid: "cc-1",
                  invoice_total: 150,
                  is_active: true,
                },
              ],
            },
          });
        }
        // For other API calls, return empty data
        return Promise.resolve({ data: [] });
      });
      
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

      // Change order amount should include Partially_Received CO
      expect(costCode1?.changeOrderAmount).toBe(150);
      // Paid amount should come from vendor invoice
      expect(costCode1?.paidAmount).toBe(150);
    });

    it("should include change orders with Completed status in change order amount calculation", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize all stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockEstimatesStore();
      mockPurchaseOrdersStore();
      mockBillEntriesStore();
      mockProjectsStore();

      // Override CO store with Completed CO
      const completedCOStore = defineStore("changeOrders", () => ({
        fetchChangeOrders: vi.fn(),
        changeOrders: [
          {
            uuid: "co-1",
            project_uuid: "proj-1",
            status: "Completed",
            is_active: true,
            co_type: "MATERIAL",
            co_items: [
              {
                cost_code_uuid: "cc-1",
                co_unit_price: 50,
                co_quantity: 4,
                co_total: 200,
              },
            ],
          },
        ],
      }));

      completedCOStore();
      
      // Mock vendor invoices API - return a paid invoice for the CO
    vi.mocked($fetch).mockImplementation((url: string | any) => {
      const urlStr = typeof url === 'string' ? url : (url?.url || String(url));
      if (urlStr.includes("/api/vendor-invoices") && !urlStr.includes("/api/vendor-invoices/")) {
          return Promise.resolve({
            data: [
              {
                uuid: "invoice-1",
                project_uuid: "proj-1",
                status: "Paid",
                is_active: true,
                invoice_type: "AGAINST_CO",
                change_order_uuid: "co-1",
                amount: "200",
              },
            ],
          });
        }
        if (urlStr.includes("/api/vendor-invoices/invoice-1")) {
          return Promise.resolve({
            data: {
              uuid: "invoice-1",
              project_uuid: "proj-1",
              status: "Paid",
              is_active: true,
              invoice_type: "AGAINST_CO",
              change_order_uuid: "co-1",
              amount: "200",
              financial_breakdown: {
                totals: {
                  item_total: 200,
                  charges_total: 0,
                  tax_total: 0,
                },
              },
              co_invoice_items: [
                {
                  cost_code_uuid: "cc-1",
                  invoice_total: 200,
                  is_active: true,
                },
              ],
            },
          });
        }
        // For other API calls, return empty data
        return Promise.resolve({ data: [] });
      });
      
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

      // Change order amount should include Completed CO
      expect(costCode1?.changeOrderAmount).toBe(200);
      // Paid amount should come from vendor invoice
      expect(costCode1?.paidAmount).toBe(200);
    });

    it("should include purchase orders with all three statuses (Approved, Partially_Received, Completed) in calculations", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize all stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockEstimatesStore();
      mockBillEntriesStore();
      mockProjectsStore();

      // Override CO store with no change orders to isolate PO test
      const noCOStore = defineStore("changeOrders", () => ({
        fetchChangeOrders: vi.fn(),
        changeOrders: [],
      }));

      // Override PO store with POs in all three statuses
      const multiStatusPOStore = defineStore("purchaseOrders", () => ({
        fetchPurchaseOrders: vi.fn(),
        purchaseOrders: [
          {
            uuid: "po-approved",
            project_uuid: "proj-1",
            status: "Approved",
            is_active: true,
            po_items: [
              {
                cost_code_uuid: "cc-1",
                po_unit_price: 100,
                po_quantity: 1,
                po_total: 100,
              },
            ],
          },
          {
            uuid: "po-partially",
            project_uuid: "proj-1",
            status: "Partially_Received",
            is_active: true,
            po_items: [
              {
                cost_code_uuid: "cc-1",
                po_unit_price: 100,
                po_quantity: 2,
                po_total: 200,
              },
            ],
          },
          {
            uuid: "po-completed",
            project_uuid: "proj-1",
            status: "Completed",
            is_active: true,
            po_items: [
              {
                cost_code_uuid: "cc-1",
                po_unit_price: 100,
                po_quantity: 3,
                po_total: 300,
              },
            ],
          },
        ],
      }));

      noCOStore();
      multiStatusPOStore();
      
      // Mock vendor invoices API - return paid invoices for all POs
      vi.mocked($fetch).mockImplementation((url: string | any) => {
        const urlStr = String(url || '');
        if (urlStr.includes("/api/vendor-invoices") && !urlStr.includes("/api/vendor-invoices/")) {
          return Promise.resolve({
            data: [
              {
                uuid: "invoice-1",
                project_uuid: "proj-1",
                status: "Paid",
                is_active: true,
                invoice_type: "AGAINST_PO",
                purchase_order_uuid: "po-approved",
                amount: "100",
              },
              {
                uuid: "invoice-2",
                project_uuid: "proj-1",
                status: "Paid",
                is_active: true,
                invoice_type: "AGAINST_PO",
                purchase_order_uuid: "po-partially",
                amount: "200",
              },
              {
                uuid: "invoice-3",
                project_uuid: "proj-1",
                status: "Paid",
                is_active: true,
                invoice_type: "AGAINST_PO",
                purchase_order_uuid: "po-completed",
                amount: "300",
              },
            ],
          });
        }
        if (urlStr.includes("/api/vendor-invoices/invoice-1")) {
          return Promise.resolve({
            data: {
              uuid: "invoice-1",
              amount: "100",
              invoice_type: "AGAINST_PO",
              financial_breakdown: { totals: { item_total: 100, charges_total: 0, tax_total: 0 } },
              po_invoice_items: [{ cost_code_uuid: "cc-1", invoice_total: 100, is_active: true }],
            },
          });
        }
        if (urlStr.includes("/api/vendor-invoices/invoice-2")) {
          return Promise.resolve({
            data: {
              uuid: "invoice-2",
              amount: "200",
              invoice_type: "AGAINST_PO",
              financial_breakdown: { totals: { item_total: 200, charges_total: 0, tax_total: 0 } },
              po_invoice_items: [{ cost_code_uuid: "cc-1", invoice_total: 200, is_active: true }],
            },
          });
        }
        if (urlStr.includes("/api/vendor-invoices/invoice-3")) {
          return Promise.resolve({
            data: {
              uuid: "invoice-3",
              amount: "300",
              invoice_type: "AGAINST_PO",
              financial_breakdown: { totals: { item_total: 300, charges_total: 0, tax_total: 0 } },
              po_invoice_items: [{ cost_code_uuid: "cc-1", invoice_total: 300, is_active: true }],
            },
          });
        }
        // For other API calls, return empty data
        return Promise.resolve({ data: [] });
      });
      
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

      // Purchase order amount should include all three: 100 + 200 + 300 = 600
      expect(costCode1?.purchaseOrderAmount).toBe(600);
      // Paid amount should come from vendor invoices: 100 + 200 + 300 = 600
      expect(costCode1?.paidAmount).toBe(600);
    });

    it("should include change orders with all three statuses (Approved, Partially_Received, Completed) in calculations", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize all stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockEstimatesStore();
      mockPurchaseOrdersStore();
      mockBillEntriesStore();

      // Override projects store to ensure fetchProject returns the project
      const projectsStoreOverride = defineStore("projects", () => {
        const projectsMetadata = ref([
          {
            uuid: "proj-1",
            project_name: "Test Project",
            project_id: "TP-001",
            no_of_rooms: 100,
          },
        ]);
        return {
          currentProject: null,
          loadCurrentProject: vi.fn(),
          fetchProject: vi.fn((uuid: string) => {
            return Promise.resolve({
              uuid: "proj-1",
              project_name: "Test Project",
              project_id: "TP-001",
              no_of_rooms: 100,
            });
          }),
          projects: computed(() => projectsMetadata.value as any[]),
          projectsMetadata: readonly(projectsMetadata),
        };
      });

      // Override CO store with COs in all three statuses
      const multiStatusCOStore = defineStore("changeOrders", () => ({
        fetchChangeOrders: vi.fn(),
        changeOrders: [
          {
            uuid: "co-approved",
            project_uuid: "proj-1",
            status: "Approved",
            is_active: true,
            co_type: "MATERIAL",
            co_items: [
              {
                cost_code_uuid: "cc-1",
                co_unit_price: 50,
                co_quantity: 1,
                co_total: 50,
              },
            ],
          },
          {
            uuid: "co-partially",
            project_uuid: "proj-1",
            status: "Partially_Received",
            is_active: true,
            co_type: "MATERIAL",
            co_items: [
              {
                cost_code_uuid: "cc-1",
                co_unit_price: 50,
                co_quantity: 2,
                co_total: 100,
              },
            ],
          },
          {
            uuid: "co-completed",
            project_uuid: "proj-1",
            status: "Completed",
            is_active: true,
            co_type: "MATERIAL",
            co_items: [
              {
                cost_code_uuid: "cc-1",
                co_unit_price: 50,
                co_quantity: 3,
                co_total: 150,
              },
            ],
          },
        ],
      }));

      multiStatusCOStore();
      
      // Mock vendor invoices API - return paid invoices for all COs
      vi.mocked($fetch).mockImplementation((url: string | any) => {
        const urlStr = String(url || '');
        if (urlStr.includes("/api/vendor-invoices") && !urlStr.includes("/api/vendor-invoices/")) {
          return Promise.resolve({
            data: [
              {
                uuid: "invoice-1",
                project_uuid: "proj-1",
                status: "Paid",
                is_active: true,
                invoice_type: "AGAINST_CO",
                change_order_uuid: "co-approved",
                amount: "50",
              },
              {
                uuid: "invoice-2",
                project_uuid: "proj-1",
                status: "Paid",
                is_active: true,
                invoice_type: "AGAINST_CO",
                change_order_uuid: "co-partially",
                amount: "100",
              },
              {
                uuid: "invoice-3",
                project_uuid: "proj-1",
                status: "Paid",
                is_active: true,
                invoice_type: "AGAINST_CO",
                change_order_uuid: "co-completed",
                amount: "150",
              },
            ],
          });
        }
        if (urlStr.includes("/api/vendor-invoices/invoice-1")) {
          return Promise.resolve({
            data: {
              uuid: "invoice-1",
              amount: "50",
              invoice_type: "AGAINST_CO",
              financial_breakdown: { totals: { item_total: 50, charges_total: 0, tax_total: 0 } },
              co_invoice_items: [{ cost_code_uuid: "cc-1", invoice_total: 50, is_active: true }],
            },
          });
        }
        if (urlStr.includes("/api/vendor-invoices/invoice-2")) {
          return Promise.resolve({
            data: {
              uuid: "invoice-2",
              amount: "100",
              invoice_type: "AGAINST_CO",
              financial_breakdown: { totals: { item_total: 100, charges_total: 0, tax_total: 0 } },
              co_invoice_items: [{ cost_code_uuid: "cc-1", invoice_total: 100, is_active: true }],
            },
          });
        }
        if (urlStr.includes("/api/vendor-invoices/invoice-3")) {
          return Promise.resolve({
            data: {
              uuid: "invoice-3",
              amount: "150",
              invoice_type: "AGAINST_CO",
              financial_breakdown: { totals: { item_total: 150, charges_total: 0, tax_total: 0 } },
              co_invoice_items: [{ cost_code_uuid: "cc-1", invoice_total: 150, is_active: true }],
            },
          });
        }
        // For other API calls, return empty data
        return Promise.resolve({ data: [] });
      });
      
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

      // Change order amount should include all three: 50 + 100 + 150 = 300
      expect(costCode1?.changeOrderAmount).toBe(300);
      // Paid amount should come from vendor invoices: 50 + 100 + 150 = 300
      expect(costCode1?.paidAmount).toBe(300);
    });

    it("should handle case-insensitive status matching for purchase orders", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize all stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockEstimatesStore();
      mockBillEntriesStore();
      mockProjectsStore();

      // Override CO store with no change orders to isolate PO test
      const noCOStore = defineStore("changeOrders", () => ({
        fetchChangeOrders: vi.fn(),
        changeOrders: [],
      }));

      // Override PO store with PO using lowercase status
      const lowercaseStatusPOStore = defineStore("purchaseOrders", () => ({
        fetchPurchaseOrders: vi.fn(),
        purchaseOrders: [
          {
            uuid: "po-1",
            project_uuid: "proj-1",
            status: "partially_received", // lowercase
            is_active: true,
            po_items: [
              {
                cost_code_uuid: "cc-1",
                po_unit_price: 100,
                po_quantity: 2,
                po_total: 200,
              },
            ],
          },
        ],
      }));

      noCOStore();
      lowercaseStatusPOStore();
      
      // Mock vendor invoices API - return a paid invoice for the PO
      vi.mocked($fetch).mockImplementation((url: string | any) => {
        const urlStr = String(url || '');
        if (urlStr.includes("/api/vendor-invoices") && !urlStr.includes("/api/vendor-invoices/")) {
          return Promise.resolve({
            data: [
              {
                uuid: "invoice-1",
                project_uuid: "proj-1",
                status: "Paid",
                is_active: true,
                invoice_type: "AGAINST_PO",
                purchase_order_uuid: "po-1",
                amount: "200",
              },
            ],
          });
        }
        if (urlStr.includes("/api/vendor-invoices/invoice-1")) {
          return Promise.resolve({
            data: {
              uuid: "invoice-1",
              amount: "200",
              invoice_type: "AGAINST_PO",
              financial_breakdown: { totals: { item_total: 200, charges_total: 0, tax_total: 0 } },
              po_invoice_items: [{ cost_code_uuid: "cc-1", invoice_total: 200, is_active: true }],
            },
          });
        }
        // For other API calls, return empty data
        return Promise.resolve({ data: [] });
      });
      
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

      // Should handle lowercase status correctly
      expect(costCode1?.purchaseOrderAmount).toBe(200);
      expect(costCode1?.paidAmount).toBe(200);
    });

    it("should handle case-insensitive status matching for change orders", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize all stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockEstimatesStore();
      mockPurchaseOrdersStore();
      mockBillEntriesStore();
      mockProjectsStore();

      // Override CO store with CO using mixed case status
      const mixedCaseStatusCOStore = defineStore("changeOrders", () => ({
        fetchChangeOrders: vi.fn(),
        changeOrders: [
          {
            uuid: "co-1",
            project_uuid: "proj-1",
            status: "COMPLETED", // uppercase
            is_active: true,
            co_type: "MATERIAL",
            co_items: [
              {
                cost_code_uuid: "cc-1",
                co_unit_price: 50,
                co_quantity: 2,
                co_total: 100,
              },
            ],
          },
        ],
      }));

      mixedCaseStatusCOStore();
      
      // Mock vendor invoices API - return a paid invoice for the CO
      vi.mocked($fetch).mockImplementation((url: string | any) => {
        const urlStr = String(url || '');
        if (urlStr.includes("/api/vendor-invoices") && !urlStr.includes("/api/vendor-invoices/")) {
          return Promise.resolve({
            data: [
              {
                uuid: "invoice-1",
                project_uuid: "proj-1",
                status: "Paid",
                is_active: true,
                invoice_type: "AGAINST_CO",
                change_order_uuid: "co-1",
                amount: "100",
              },
            ],
          });
        }
        if (urlStr.includes("/api/vendor-invoices/invoice-1")) {
          return Promise.resolve({
            data: {
              uuid: "invoice-1",
              amount: "100",
              invoice_type: "AGAINST_CO",
              financial_breakdown: { totals: { item_total: 100, charges_total: 0, tax_total: 0 } },
              co_invoice_items: [{ cost_code_uuid: "cc-1", invoice_total: 100, is_active: true }],
            },
          });
        }
        // For other API calls, return empty data
        return Promise.resolve({ data: [] });
      });
      
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

      // Should handle uppercase status correctly
      expect(costCode1?.changeOrderAmount).toBe(100);
      expect(costCode1?.paidAmount).toBe(100);
    });

    it("should exclude purchase orders with Draft or Ready status from calculations", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize all stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockEstimatesStore();
      mockBillEntriesStore();
      mockProjectsStore();

      // Override CO store with no change orders to isolate PO test
      const noCOStore = defineStore("changeOrders", () => ({
        fetchChangeOrders: vi.fn(),
        changeOrders: [],
      }));

      // Override PO store with POs in Draft and Ready statuses
      const excludedStatusPOStore = defineStore("purchaseOrders", () => ({
        fetchPurchaseOrders: vi.fn(),
        purchaseOrders: [
          {
            uuid: "po-draft",
            project_uuid: "proj-1",
            status: "Draft",
            is_active: true,
            po_items: [
              {
                cost_code_uuid: "cc-1",
                po_unit_price: 100,
                po_quantity: 2,
                po_total: 200,
              },
            ],
          },
          {
            uuid: "po-ready",
            project_uuid: "proj-1",
            status: "Ready",
            is_active: true,
            po_items: [
              {
                cost_code_uuid: "cc-1",
                po_unit_price: 100,
                po_quantity: 3,
                po_total: 300,
              },
            ],
          },
        ],
      }));

      noCOStore();
      excludedStatusPOStore();
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

      // Draft and Ready POs should not be included
      expect(costCode1?.purchaseOrderAmount).toBe(0);
      expect(costCode1?.paidAmount).toBe(0);
    });

    it("should exclude change orders with Draft or Ready status from calculations", async () => {
      // Create new pinia to isolate this test
      const newPinia = createPinia();
      setActivePinia(newPinia);

      // Reinitialize all stores
      mockCostCodeDivisionsStore();
      mockCostCodeConfigurationsStore();
      mockEstimatesStore();
      mockPurchaseOrdersStore();
      mockBillEntriesStore();
      mockProjectsStore();

      // Override CO store with COs in Draft and Ready statuses
      const excludedStatusCOStore = defineStore("changeOrders", () => ({
        fetchChangeOrders: vi.fn(),
        changeOrders: [
          {
            uuid: "co-draft",
            project_uuid: "proj-1",
            status: "Draft",
            is_active: true,
            co_type: "MATERIAL",
            co_items: [
              {
                cost_code_uuid: "cc-1",
                co_unit_price: 50,
                co_quantity: 2,
                co_total: 100,
              },
            ],
          },
          {
            uuid: "co-ready",
            project_uuid: "proj-1",
            status: "Ready",
            is_active: true,
            co_type: "MATERIAL",
            co_items: [
              {
                cost_code_uuid: "cc-1",
                co_unit_price: 50,
                co_quantity: 3,
                co_total: 150,
              },
            ],
          },
        ],
      }));

      excludedStatusCOStore();
      const budgetReport = useBudgetReport();

      const result = await budgetReport.generateBudgetReport("corp-1", "proj-1");

      const division1 = result?.divisions.find((d) => d.uuid === "div-1");
      const costCode1 = division1?.costCodes.find((cc) => cc.uuid === "cc-1");

      // Draft and Ready COs should not be included
      expect(costCode1?.changeOrderAmount).toBe(0);
      expect(costCode1?.paidAmount).toBe(0);
    });
  });
});

