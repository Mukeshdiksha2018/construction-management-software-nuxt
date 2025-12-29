import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import HoldbackBreakdownTable from "@/components/Payables/HoldbackBreakdownTable.vue";

// Mock composables
vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (value: number | string | null | undefined) => {
      const num = typeof value === "string" ? parseFloat(value) : Number(value ?? 0);
      if (Number.isNaN(num)) return "$0.00";
      return `$${num.toFixed(2)}`;
    },
  }),
}));

// Mock $fetch
const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

// UI Stubs
const uiStubs = {
  UCard: {
    props: ["variant"],
    template: "<div><slot /></div>",
  },
  UButton: {
    props: ["icon", "size", "color", "variant", "class"],
    template: "<button @click='$emit(\"click\")'><slot /></button>",
  },
  UInput: {
    props: ["modelValue", "type", "step", "min", "max", "pattern", "inputmode", "size", "class", "disabled", "placeholder"],
    template: "<input :value='modelValue' @input='$emit(\"update:modelValue\", $event.target.value)' />",
    emits: ["update:modelValue"],
  },
  CostCodeSelect: {
    props: ["modelValue", "corporationUuid", "size", "class", "disabled", "placeholder"],
    template: "<select><slot /></select>",
    emits: ["update:modelValue", "change"],
  },
  ChartOfAccountsSelect: {
    props: ["modelValue", "localAccounts", "size", "class", "disabled", "placeholder"],
    template: "<select><slot /></select>",
    emits: ["update:modelValue", "change"],
  },
};

describe("HoldbackBreakdownTable.vue", () => {
  let pinia: ReturnType<typeof createPinia>;

  const mockPOItems = [
    {
      uuid: "item-1",
      cost_code_uuid: "cc-1",
      cost_code_number: "CC-001",
      cost_code_name: "Test Code 1",
      po_total: 10000,
      invoice_total: 10000,
    },
    {
      uuid: "item-2",
      cost_code_uuid: "cc-2",
      cost_code_number: "CC-002",
      cost_code_name: "Test Code 2",
      po_total: 5000,
      invoice_total: 5000,
    },
    {
      uuid: "item-3",
      cost_code_uuid: "cc-3",
      cost_code_number: "CC-003",
      cost_code_name: "Test Code 3",
      po_total: 3000,
      invoice_total: 3000,
    },
  ];

  const mockHoldbackInvoice = {
    uuid: "holdback-invoice-1",
    number: "HB-INV-001",
    amount: 18000,
    holdback: 10, // 10%
    financial_breakdown: {
      totals: {
        holdback_amount: 1800, // 10% of 18000
      },
    },
  };

  const mockCostCodeConfigs = [
    {
      uuid: "cc-1",
      cost_code_number: "CC-001",
      cost_code_name: "Test Code 1",
      gl_account_uuid: "gl-1",
      is_active: true,
    },
    {
      uuid: "cc-2",
      cost_code_number: "CC-002",
      cost_code_name: "Test Code 2",
      gl_account_uuid: "gl-2",
      is_active: true,
    },
    {
      uuid: "cc-3",
      cost_code_number: "CC-003",
      cost_code_name: "Test Code 3",
      gl_account_uuid: "gl-3",
      is_active: true,
    },
  ];

  const mockChartOfAccounts = [
    { uuid: "gl-1", account_name: "GL Account 1" },
    { uuid: "gl-2", account_name: "GL Account 2" },
    { uuid: "gl-3", account_name: "GL Account 3" },
  ];

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();

    // Default mock implementations
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === "string") {
        if (url.includes("/api/purchase-order-items")) {
          return Promise.resolve({ data: mockPOItems });
        }
        if (url.includes("/api/vendor-invoices/holdback-invoice-1")) {
          return Promise.resolve({ data: mockHoldbackInvoice });
        }
        if (url.includes("/api/cost-code-configurations")) {
          return Promise.resolve({ data: mockCostCodeConfigs });
        }
        if (url.includes("/api/corporations/chart-of-accounts")) {
          return Promise.resolve({ data: mockChartOfAccounts });
        }
      }
      return Promise.resolve({ data: null });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Filtering Rows with Zero Remaining Amount", () => {
    it("should show rows with positive remaining amount", async () => {
      const wrapper = mount(HoldbackBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-1",
          holdbackInvoiceUuid: "holdback-invoice-1",
          corporationUuid: "corp-1",
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await flushPromises();

      const vm = wrapper.vm;
      
      // All rows should have positive remaining amount initially
      // CC-001: 10000/18000 * 1800 = 1000 holdback, 0 released = 1000 remaining
      // CC-002: 5000/18000 * 1800 = 500 holdback, 0 released = 500 remaining
      // CC-003: 3000/18000 * 1800 = 300 holdback, 0 released = 300 remaining
      
      expect(vm.filteredCostCodeRows.length).toBeGreaterThan(0);
      
      // All rows should be visible since they have positive remaining amounts
      // The filteredCostCodeRows computed property already filters out zero remaining amounts
      // So all rows in filteredCostCodeRows should have remaining > 0 (or no cost code/retainage)
      const visibleRows = vm.filteredCostCodeRows;
      expect(visibleRows.length).toBeGreaterThan(0);
    });

    it("should filter out rows with zero remaining amount", async () => {
      const wrapper = mount(HoldbackBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-1",
          holdbackInvoiceUuid: "holdback-invoice-1",
          corporationUuid: "corp-1",
          previouslyReleasedCostCodes: [
            {
              cost_code_uuid: "cc-1",
              release_amount: 1000, // Fully released
              holdback_invoice_uuid: "holdback-invoice-1",
              vendor_invoice_uuid: "other-invoice-1",
            },
            {
              cost_code_uuid: "cc-2",
              release_amount: 500, // Fully released
              holdback_invoice_uuid: "holdback-invoice-1",
              vendor_invoice_uuid: "other-invoice-2",
            },
          ],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await flushPromises();

      const vm = wrapper.vm;
      
      // CC-001 and CC-002 should be filtered out (remaining = 0)
      // CC-003 should still be visible (remaining = 300)
      
      const filteredRows = vm.filteredCostCodeRows;
      
      // Should only show CC-003 (with remaining amount > 0)
      const cc3Row = filteredRows.find((row: any) => row.cost_code_uuid === "cc-3");
      expect(cc3Row).toBeDefined();
      
      // CC-1 and CC-2 should be filtered out
      const cc1Row = filteredRows.find((row: any) => row.cost_code_uuid === "cc-1");
      const cc2Row = filteredRows.find((row: any) => row.cost_code_uuid === "cc-2");
      expect(cc1Row).toBeUndefined();
      expect(cc2Row).toBeUndefined();
      
      // Verify remaining amount for CC-3
      if (cc3Row) {
        const originalIndex = vm.getOriginalIndex(cc3Row.id);
        const remaining = vm.getRemainingReleaseAmount(cc3Row, originalIndex);
        expect(remaining).toBeGreaterThan(0);
      }
    });

    it("should filter out rows when release amount equals available amount", async () => {
      const wrapper = mount(HoldbackBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-1",
          holdbackInvoiceUuid: "holdback-invoice-1",
          corporationUuid: "corp-1",
          modelValue: [
            {
              id: "row-1",
              cost_code_uuid: "cc-1",
              cost_code_number: "CC-001",
              cost_code_name: "Test Code 1",
              retainageAmount: 1000,
              releaseAmount: 1000, // Fully released
              gl_account_uuid: "gl-1",
            },
            {
              id: "row-2",
              cost_code_uuid: "cc-2",
              cost_code_number: "CC-002",
              cost_code_name: "Test Code 2",
              retainageAmount: 500,
              releaseAmount: 200, // Partially released, remaining = 300
              gl_account_uuid: "gl-2",
            },
          ],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await flushPromises();

      const vm = wrapper.vm;
      
      // CC-1 should be filtered out (remaining = 0)
      // CC-2 should be visible (remaining = 300)
      
      const filteredRows = vm.filteredCostCodeRows;
      
      const cc1Row = filteredRows.find((row: any) => row.cost_code_uuid === "cc-1");
      const cc2Row = filteredRows.find((row: any) => row.cost_code_uuid === "cc-2");
      
      expect(cc1Row).toBeUndefined(); // Should be filtered out
      expect(cc2Row).toBeDefined(); // Should be visible
      
      if (cc2Row) {
        const originalIndex = vm.getOriginalIndex(cc2Row.id);
        const remaining = vm.getRemainingReleaseAmount(cc2Row, originalIndex);
        expect(remaining).toBe(300);
      }
    });

    it("should show rows with negative remaining amount (over by)", async () => {
      const wrapper = mount(HoldbackBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-1",
          holdbackInvoiceUuid: "holdback-invoice-1",
          corporationUuid: "corp-1",
          modelValue: [
            {
              id: "row-1",
              cost_code_uuid: "cc-1",
              cost_code_number: "CC-001",
              cost_code_name: "Test Code 1",
              retainageAmount: 1000,
              releaseAmount: 1200, // Over by 200
              gl_account_uuid: "gl-1",
            },
          ],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await flushPromises();

      const vm = wrapper.vm;
      
      // CC-1 should still be visible even though remaining is negative (over by)
      // This is important for validation/error display
      
      const filteredRows = vm.filteredCostCodeRows;
      const cc1Row = filteredRows.find((row: any) => row.cost_code_uuid === "cc-1");
      
      expect(cc1Row).toBeDefined(); // Should be visible for error display
      
      if (cc1Row) {
        const originalIndex = vm.getOriginalIndex(cc1Row.id);
        const remaining = vm.getRemainingReleaseAmount(cc1Row, originalIndex);
        expect(remaining).toBeLessThan(0); // Negative (over by)
      }
    });

    it("should show rows without cost code (for adding new rows)", async () => {
      const wrapper = mount(HoldbackBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-1",
          holdbackInvoiceUuid: "holdback-invoice-1",
          corporationUuid: "corp-1",
          modelValue: [
            {
              id: "row-1",
              cost_code_uuid: "cc-1",
              cost_code_number: "CC-001",
              cost_code_name: "Test Code 1",
              retainageAmount: 1000,
              releaseAmount: 1000, // Fully released, should be filtered
              gl_account_uuid: "gl-1",
            },
            {
              id: "row-2",
              cost_code_uuid: null, // No cost code - should be visible
              cost_code_number: "",
              cost_code_name: "",
              retainageAmount: 0,
              releaseAmount: 0,
              gl_account_uuid: null,
            },
          ],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await flushPromises();

      const vm = wrapper.vm;
      
      const filteredRows = vm.filteredCostCodeRows;
      
      // Row without cost code should be visible (for adding new rows)
      const emptyRow = filteredRows.find((row: any) => !row.cost_code_uuid);
      expect(emptyRow).toBeDefined();
      
      // Row with zero remaining should be filtered out
      const cc1Row = filteredRows.find((row: any) => row.cost_code_uuid === "cc-1");
      expect(cc1Row).toBeUndefined();
    });

    it("should show rows without retainage amount (for adding new rows)", async () => {
      const wrapper = mount(HoldbackBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-1",
          holdbackInvoiceUuid: "holdback-invoice-1",
          corporationUuid: "corp-1",
          modelValue: [
            {
              id: "row-1",
              cost_code_uuid: "cc-1",
              cost_code_number: "CC-001",
              cost_code_name: "Test Code 1",
              retainageAmount: 0, // No retainage amount
              releaseAmount: 0,
              gl_account_uuid: "gl-1",
            },
          ],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await flushPromises();

      const vm = wrapper.vm;
      
      const filteredRows = vm.filteredCostCodeRows;
      
      // Row without retainage amount should be visible (for adding new rows)
      const rowWithoutRetainage = filteredRows.find((row: any) => 
        row.cost_code_uuid === "cc-1" && (!row.retainageAmount || row.retainageAmount === 0)
      );
      expect(rowWithoutRetainage).toBeDefined();
    });

    it("should update filtered rows when release amounts change", async () => {
      const wrapper = mount(HoldbackBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-1",
          holdbackInvoiceUuid: "holdback-invoice-1",
          corporationUuid: "corp-1",
          modelValue: [
            {
              id: "row-1",
              cost_code_uuid: "cc-1",
              cost_code_number: "CC-001",
              cost_code_name: "Test Code 1",
              retainageAmount: 1000,
              releaseAmount: 500, // Partially released, remaining = 500
              gl_account_uuid: "gl-1",
            },
          ],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await flushPromises();

      const vm = wrapper.vm;
      
      // Initially, row should be visible (remaining = 500)
      let filteredRows = vm.filteredCostCodeRows;
      let cc1Row = filteredRows.find((row: any) => row.cost_code_uuid === "cc-1");
      expect(cc1Row).toBeDefined();
      
      // Update release amount to fully release (remaining = 0)
      await wrapper.setProps({
        modelValue: [
          {
            id: "row-1",
            cost_code_uuid: "cc-1",
            cost_code_number: "CC-001",
            cost_code_name: "Test Code 1",
            retainageAmount: 1000,
            releaseAmount: 1000, // Fully released
            gl_account_uuid: "gl-1",
          },
        ],
      });
      
      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await flushPromises();
      
      // Now row should be filtered out (remaining = 0)
      filteredRows = vm.filteredCostCodeRows;
      cc1Row = filteredRows.find((row: any) => row.cost_code_uuid === "cc-1");
      expect(cc1Row).toBeUndefined();
    });

    it("should handle multiple rows with different remaining amounts", async () => {
      const wrapper = mount(HoldbackBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-1",
          holdbackInvoiceUuid: "holdback-invoice-1",
          corporationUuid: "corp-1",
          previouslyReleasedCostCodes: [
            {
              cost_code_uuid: "cc-1",
              release_amount: 1000, // Fully released
              holdback_invoice_uuid: "holdback-invoice-1",
              vendor_invoice_uuid: "other-invoice-1",
            },
          ],
          modelValue: [
            {
              id: "row-1",
              cost_code_uuid: "cc-1",
              cost_code_number: "CC-001",
              cost_code_name: "Test Code 1",
              retainageAmount: 1000,
              releaseAmount: 0,
              gl_account_uuid: "gl-1",
            },
            {
              id: "row-2",
              cost_code_uuid: "cc-2",
              cost_code_number: "CC-002",
              cost_code_name: "Test Code 2",
              retainageAmount: 500,
              releaseAmount: 200, // Remaining = 300
              gl_account_uuid: "gl-2",
            },
            {
              id: "row-3",
              cost_code_uuid: "cc-3",
              cost_code_number: "CC-003",
              cost_code_name: "Test Code 3",
              retainageAmount: 300,
              releaseAmount: 300, // Fully released
              gl_account_uuid: "gl-3",
            },
          ],
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await flushPromises();

      const vm = wrapper.vm;
      
      const filteredRows = vm.filteredCostCodeRows;
      
      // CC-1: 1000 retainage - 1000 previously released = 0 remaining (filtered out)
      // CC-2: 500 retainage - 0 previously released - 200 current release = 300 remaining (visible)
      // CC-3: 300 retainage - 0 previously released - 300 current release = 0 remaining (filtered out)
      
      const cc1Row = filteredRows.find((row: any) => row.cost_code_uuid === "cc-1");
      const cc2Row = filteredRows.find((row: any) => row.cost_code_uuid === "cc-2");
      const cc3Row = filteredRows.find((row: any) => row.cost_code_uuid === "cc-3");
      
      expect(cc1Row).toBeUndefined(); // Filtered out (remaining = 0)
      expect(cc2Row).toBeDefined(); // Visible (remaining = 300)
      expect(cc3Row).toBeUndefined(); // Filtered out (remaining = 0)
      
      if (cc2Row) {
        const originalIndex = vm.getOriginalIndex(cc2Row.id);
        const remaining = vm.getRemainingReleaseAmount(cc2Row, originalIndex);
        expect(remaining).toBe(300);
      }
    });
  });

  describe("getOriginalIndex Helper", () => {
    it("should return correct original index for a row", async () => {
      const wrapper = mount(HoldbackBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-1",
          holdbackInvoiceUuid: "holdback-invoice-1",
          corporationUuid: "corp-1",
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await flushPromises();

      const vm = wrapper.vm;
      
      if (vm.costCodeRows.length > 0) {
        const firstRow = vm.costCodeRows[0];
        const originalIndex = vm.getOriginalIndex(firstRow.id);
        expect(originalIndex).toBe(0);
      }
    });

    it("should return -1 for non-existent row id", async () => {
      const wrapper = mount(HoldbackBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-1",
          holdbackInvoiceUuid: "holdback-invoice-1",
          corporationUuid: "corp-1",
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await flushPromises();

      const vm = wrapper.vm;
      
      const originalIndex = vm.getOriginalIndex("non-existent-id");
      expect(originalIndex).toBe(-1);
    });
  });
});

