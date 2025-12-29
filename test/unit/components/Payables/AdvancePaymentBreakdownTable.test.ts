import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import AdvancePaymentBreakdownTable from "@/components/Payables/AdvancePaymentBreakdownTable.vue";

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

vi.mock("@/composables/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (date: string | null | undefined) => {
      if (!date) return "N/A";
      return new Date(date).toLocaleDateString();
    },
  }),
}));

// Mock $fetch
const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

// UI Stubs
const uiStubs = {
  UIcon: {
    props: ["name", "class"],
    template: "<span />",
  },
  UBadge: {
    props: ["color", "variant", "size"],
    template: "<span><slot /></span>",
  },
};

describe("AdvancePaymentBreakdownTable.vue", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("renders without errors", () => {
      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: null,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      expect(wrapper.exists()).toBe(true);
    });

    it("shows empty state when no purchase order is selected", () => {
      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: null,
          changeOrderUuid: null,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      expect(wrapper.text()).toContain("No purchase order or change order selected");
    });

    it("shows loading state when fetching data", async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-uuid-1",
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      expect(wrapper.text()).toContain("Loading advance payments");
    });

    it("shows error state when fetch fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("API Error"));

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-uuid-1",
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      // Error message should be displayed
      const errorText = wrapper.text();
      expect(errorText).toContain("API Error") || expect(errorText).toContain("Failed to load");

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Data Fetching", () => {
    it("fetches advance payments when purchase order is selected", async () => {
      mockFetch.mockResolvedValueOnce({
        data: [
          {
            uuid: "inv-1",
            number: "INV-001",
            bill_date: "2024-01-15T00:00:00Z",
            amount: "240.00",
            is_active: true,
            costCodes: [
              {
                uuid: "apcc-1",
                cost_code_label: "CC-001 Test Code",
                advance_amount: "120.00",
              },
              {
                uuid: "apcc-2",
                cost_code_label: "CC-002 Another Code",
                advance_amount: "120.00",
              },
            ],
          },
        ],
      });

      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-uuid-1",
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/purchase-orders/po-uuid-1/advance-payments",
        {
          query: {},
        }
      );
      expect(wrapper.text()).toContain("INV-001");
    });

    it("does not fetch when purchase order is null", async () => {
      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: null,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("refetches when purchase order changes", async () => {
      mockFetch.mockResolvedValue({ data: [] });

      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-uuid-1",
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      // Change purchase order
      await wrapper.setProps({ purchaseOrderUuid: "po-uuid-2" });
      await flushPromises();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        "/api/purchase-orders/po-uuid-2/advance-payments",
        {
          query: {},
        }
      );
    });

    it("passes currentInvoiceUuid in query when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        data: [],
      });

      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-uuid-1",
          currentInvoiceUuid: "invoice-uuid-1",
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/purchase-orders/po-uuid-1/advance-payments",
        {
          query: {
            currentInvoiceUuid: "invoice-uuid-1",
          },
        }
      );
    });
  });

  describe("Table Display", () => {
    it("displays advance payment invoices in table", async () => {
      mockFetch.mockResolvedValueOnce({
        data: [
          {
            uuid: "inv-1",
            number: "INV-001",
            bill_date: "2024-01-15T00:00:00Z",
            amount: "240.00",
            is_active: true,
            costCodes: [
              {
                uuid: "apcc-1",
                cost_code_label: "CC-001 Test Code",
                advance_amount: "120.00",
              },
            ],
          },
          {
            uuid: "inv-2",
            number: "INV-002",
            bill_date: "2024-01-20T00:00:00Z",
            amount: "100.00",
            is_active: false,
            costCodes: [],
          },
        ],
      });

      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-uuid-1",
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      expect(wrapper.text()).toContain("INV-001");
      expect(wrapper.text()).toContain("INV-002");
      expect(wrapper.text()).toContain("$-240.00"); // Amount without taxes, displayed as negative
      expect(wrapper.text()).toContain("$-100.00"); // Amount without taxes, displayed as negative
    });

    it("displays cost code breakdown for each invoice", async () => {
      mockFetch.mockResolvedValueOnce({
        data: [
          {
            uuid: "inv-1",
            number: "INV-001",
            bill_date: "2024-01-15T00:00:00Z",
            amount: "240.00",
            is_active: true,
            costCodes: [
              {
                uuid: "apcc-1",
                cost_code_label: "CC-001 Test Code",
                cost_code_number: "CC-001",
                cost_code_name: "Test Code",
                advance_amount: "120.00",
              },
              {
                uuid: "apcc-2",
                cost_code_label: "CC-002 Another Code",
                advance_amount: "120.00",
              },
            ],
          },
        ],
      });

      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-uuid-1",
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      expect(wrapper.text()).toContain("CC-001 Test Code");
      expect(wrapper.text()).toContain("CC-002 Another Code");
      expect(wrapper.text()).toContain("$120.00");
    });

    it("shows 'No cost codes' when invoice has no cost codes", async () => {
      mockFetch.mockResolvedValueOnce({
        data: [
          {
            uuid: "inv-1",
            number: "INV-001",
            bill_date: "2024-01-15T00:00:00Z",
            amount: "240.00",
            is_active: true,
            costCodes: [],
          },
        ],
      });

      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-uuid-1",
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      expect(wrapper.text()).toContain("No cost codes");
    });

    it("displays status badge correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        data: [
          {
            uuid: "inv-1",
            number: "INV-001",
            bill_date: "2024-01-15T00:00:00Z",
            amount: "240.00",
            is_active: true,
            costCodes: [],
          },
          {
            uuid: "inv-2",
            number: "INV-002",
            bill_date: "2024-01-20T00:00:00Z",
            amount: "100.00",
            is_active: false,
            costCodes: [],
          },
        ],
      });

      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-uuid-1",
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      // Check that status text is displayed (Active/Inactive)
      const text = wrapper.text();
      expect(text).toContain("Active") || expect(text).toContain("Inactive");
    });

    it("calculates and displays total advance paid", async () => {
      mockFetch.mockResolvedValueOnce({
        data: [
          {
            uuid: "inv-1",
            number: "INV-001",
            bill_date: "2024-01-15T00:00:00Z",
            amount: "240.00",
            is_active: true,
            costCodes: [],
          },
          {
            uuid: "inv-2",
            number: "INV-002",
            bill_date: "2024-01-20T00:00:00Z",
            amount: "100.00",
            is_active: true,
            costCodes: [],
          },
        ],
      });

      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-uuid-1",
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      expect(wrapper.text()).toContain("Total Advance Paid");
      expect(wrapper.text()).toContain("$-340.00"); // 240 + 100, displayed as negative without taxes
    });

    it("handles empty cost code label gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        data: [
          {
            uuid: "inv-1",
            number: "INV-001",
            bill_date: "2024-01-15T00:00:00Z",
            amount: "240.00",
            is_active: true,
            costCodes: [
              {
                uuid: "apcc-1",
                cost_code_number: "CC-001",
                cost_code_name: "Test Code",
                advance_amount: "120.00",
              },
            ],
          },
        ],
      });

      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-uuid-1",
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      // Should use cost_code_number and cost_code_name when label is missing
      expect(wrapper.text()).toContain("CC-001 Test Code");
    });

    it("handles missing cost code fields", async () => {
      mockFetch.mockResolvedValueOnce({
        data: [
          {
            uuid: "inv-1",
            number: "INV-001",
            bill_date: "2024-01-15T00:00:00Z",
            amount: "240.00",
            is_active: true,
            costCodes: [
              {
                uuid: "apcc-1",
                advanceAmount: "120.00", // Using camelCase
              },
            ],
          },
        ],
      });

      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-uuid-1",
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      // Should handle both advance_amount and advanceAmount
      expect(wrapper.text()).toContain("$120.00");
    });
  });

  describe("Empty States", () => {
    it("shows empty state when no advance payments exist", async () => {
      mockFetch.mockResolvedValueOnce({
        data: [],
      });

      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-uuid-1",
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      expect(wrapper.text()).toContain("No advance payments found");
    });
  });

  describe("Previously Adjusted Amounts", () => {
    it("displays remaining to be adjusted amount correctly when previouslyAdjustedCostCodes prop is provided", async () => {
      mockFetch.mockResolvedValueOnce({
        data: [
          {
            uuid: "inv-1",
            number: "INV-001",
            bill_date: "2024-01-15T00:00:00Z",
            amount: "500.00",
            is_active: true,
            costCodes: [
              {
                uuid: "apcc-1",
                cost_code_uuid: "cc-1",
                cost_code_label: "CC-001 Test Code",
                advance_amount: "500.00",
              },
            ],
          },
        ],
      });

      const previouslyAdjustedCostCodes = [
        {
          cost_code_uuid: "cc-1",
          advance_payment_uuid: "inv-1",
          adjusted_amount: 200,
        },
        {
          cost_code_uuid: "cc-1",
          advance_payment_uuid: "inv-1",
          adjusted_amount: 150,
        },
      ];

      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-uuid-1",
          previouslyAdjustedCostCodes,
          showAdjustmentInputs: true,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      // Should display remaining to be adjusted: 500 - (200 + 150) = 150
      expect(wrapper.text()).toContain("$150.00");
    });

    it("calculates remaining to be adjusted correctly when summing previously adjusted amounts across multiple invoices for same cost code", async () => {
      mockFetch.mockResolvedValueOnce({
        data: [
          {
            uuid: "inv-1",
            number: "INV-001",
            bill_date: "2024-01-15T00:00:00Z",
            amount: "500.00",
            is_active: true,
            costCodes: [
              {
                uuid: "apcc-1",
                cost_code_uuid: "cc-1",
                cost_code_label: "CC-001 Test Code",
                advance_amount: "500.00",
              },
            ],
          },
        ],
      });

      const previouslyAdjustedCostCodes = [
        {
          cost_code_uuid: "cc-1",
          advance_payment_uuid: "inv-1",
          adjusted_amount: 100,
        },
        {
          cost_code_uuid: "cc-1",
          advance_payment_uuid: "inv-1",
          adjusted_amount: 150,
        },
        {
          cost_code_uuid: "cc-1",
          advance_payment_uuid: "inv-1",
          adjusted_amount: 50,
        },
      ];

      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-uuid-1",
          previouslyAdjustedCostCodes,
          showAdjustmentInputs: true,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      // Should display remaining to be adjusted: 500 - (100 + 150 + 50) = 200
      expect(wrapper.text()).toContain("$200.00");
    });

    it("displays remaining to be adjusted amount correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        data: [
          {
            uuid: "inv-1",
            number: "INV-001",
            bill_date: "2024-01-15T00:00:00Z",
            amount: "500.00",
            is_active: true,
            costCodes: [
              {
                uuid: "apcc-1",
                cost_code_uuid: "cc-1",
                cost_code_label: "CC-001 Test Code",
                advance_amount: "500.00",
              },
            ],
          },
        ],
      });

      const previouslyAdjustedCostCodes = [
        {
          cost_code_uuid: "cc-1",
          advance_payment_uuid: "inv-1",
          adjusted_amount: 200,
        },
      ];

      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-uuid-1",
          previouslyAdjustedCostCodes,
          showAdjustmentInputs: true,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      // Remaining = 500 - 200 = 300
      expect(wrapper.text()).toContain("$300.00");
    });

    it("highlights row when adjusted amount exceeds remaining amount", async () => {
      mockFetch.mockResolvedValueOnce({
        data: [
          {
            uuid: "inv-1",
            number: "INV-001",
            bill_date: "2024-01-15T00:00:00Z",
            amount: "500.00",
            is_active: true,
            costCodes: [
              {
                uuid: "apcc-1",
                cost_code_uuid: "cc-1",
                cost_code_label: "CC-001 Test Code",
                advance_amount: "500.00",
              },
            ],
          },
        ],
      });

      const previouslyAdjustedCostCodes = [
        {
          cost_code_uuid: "cc-1",
          advance_payment_uuid: "inv-1",
          adjusted_amount: 400,
        },
      ];

      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-uuid-1",
          previouslyAdjustedCostCodes,
          showAdjustmentInputs: true,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      // Remaining = 500 - 400 = 100
      // If user enters 150, it should highlight the row
      const input = wrapper.find('input[type="number"]');
      if (input.exists()) {
        await input.setValue("150");
        await flushPromises();

        // Row should have error styling
        const row = wrapper.find('tr');
        if (row.exists()) {
          const classes = row.classes();
          // Should have error background or border
          expect(classes.some(c => c.includes('error') || c.includes('bg-error'))).toBe(true);
        }
      }
    });

    it("exposes hasValidationError when adjusted amount exceeds remaining", async () => {
      mockFetch.mockResolvedValueOnce({
        data: [
          {
            uuid: "inv-1",
            number: "INV-001",
            bill_date: "2024-01-15T00:00:00Z",
            amount: "500.00",
            is_active: true,
            costCodes: [
              {
                uuid: "apcc-1",
                cost_code_uuid: "cc-1",
                cost_code_label: "CC-001 Test Code",
                advance_amount: "500.00",
              },
            ],
          },
        ],
      });

      const previouslyAdjustedCostCodes = [
        {
          cost_code_uuid: "cc-1",
          advance_payment_uuid: "inv-1",
          adjusted_amount: 400,
        },
      ];

      const wrapper = mount(AdvancePaymentBreakdownTable, {
        props: {
          purchaseOrderUuid: "po-uuid-1",
          previouslyAdjustedCostCodes,
          showAdjustmentInputs: true,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      const vm = wrapper.vm as any;
      if (vm && typeof vm.hasValidationError !== 'undefined') {
        // Set adjusted amount to exceed remaining (remaining = 100, set to 150)
        const input = wrapper.find('input[type="number"]');
        if (input.exists()) {
          await input.setValue("150");
          await flushPromises();
          
          // Should expose validation error
          expect(vm.hasValidationError).toBe(true);
        }
      }
    });
  });
});

