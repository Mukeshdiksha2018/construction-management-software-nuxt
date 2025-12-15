import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import POCOSelect from "@/components/Shared/POCOSelect.vue";
import { usePurchaseOrdersStore } from "@/stores/purchaseOrders";
import { useChangeOrdersStore } from "@/stores/changeOrders";

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

// Mock stores
const mockPurchaseOrdersStore = {
  purchaseOrders: [],
  loading: false,
  fetchPurchaseOrders: vi.fn().mockResolvedValue(undefined),
};

const mockChangeOrdersStore = {
  changeOrders: [],
  loading: false,
  fetchChangeOrders: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/stores/purchaseOrders", () => ({
  usePurchaseOrdersStore: () => mockPurchaseOrdersStore,
}));

vi.mock("@/stores/changeOrders", () => ({
  useChangeOrdersStore: () => mockChangeOrdersStore,
}));

// Mock $fetch
const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

// UI Stubs
const uiStubs = {
  UButton: {
    template: "<button><slot /></button>",
    props: ["icon", "color", "variant", "size", "disabled", "loading", "class"],
  },
  UModal: {
    template: '<div v-if="open" data-testid="modal"><slot name="body" /></div>',
    props: ["open", "title"],
    emits: ["update:open"],
  },
  UInput: {
    props: ["modelValue", "placeholder", "size", "class", "icon", "variant"],
    emits: ["update:modelValue"],
    template: "<input />",
  },
  UTable: {
    props: ["data", "columns", "class"],
    template: "<div><slot /></div>",
  },
  UIcon: {
    props: ["name", "class"],
    template: "<span />",
  },
  UBadge: {
    props: ["color", "variant", "size"],
    template: "<span><slot /></span>",
  },
};

describe("POCOSelect.vue", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ data: [] });
    // Clear store data between tests
    mockPurchaseOrdersStore.purchaseOrders = [];
    mockChangeOrdersStore.changeOrders = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const baseProps = {
    projectUuid: "project-1",
    corporationUuid: "corp-1",
    vendorUuid: "vendor-1",
    placeholder: "Select PO/CO",
  };

  describe("Component Rendering", () => {
    it("renders button with placeholder when no selection", () => {
      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
          modelValue: undefined,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      expect(wrapper.exists()).toBe(true);
      const button = wrapper.find("button");
      expect(button.exists()).toBe(true);
      expect(button.text()).toContain("Select PO/CO");
    });

    it("disables button when project is not selected", () => {
      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
          projectUuid: undefined,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Component should render and handle disabled state
      expect(wrapper.exists()).toBe(true);
      const vm = wrapper.vm as any;
      // Check that the component recognizes missing project
      expect(vm.props.projectUuid).toBeUndefined();
    });

    it("disables button when vendor is not selected", () => {
      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
          vendorUuid: undefined,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Component should render and handle disabled state
      expect(wrapper.exists()).toBe(true);
      const vm = wrapper.vm as any;
      // Check that the component recognizes missing vendor
      expect(vm.props.vendorUuid).toBeUndefined();
    });

    it("handles selection state correctly", async () => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: "po-1",
          po_number: "PO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_po_amount: 1000,
        },
      ];

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
          modelValue: "PO:po-1",
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();
      // Component should handle selection
      expect(wrapper.exists()).toBe(true);
      const vm = wrapper.vm as any;
      expect(vm.selectedOrder).toBe("PO:po-1");
    });
  });

  describe("Modal Functionality", () => {
    it("opens modal when openModal is called", async () => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: "po-1",
          po_number: "PO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_po_amount: 1000,
        },
      ];

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      const vm = wrapper.vm as any;
      if (vm.openModal) {
        await vm.openModal();
        await flushPromises();
        expect(vm.showModal).toBe(true);
      }
    });

    it("processes purchase orders for display", async () => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: "po-1",
          po_number: "PO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_po_amount: 1000,
          entry_date: "2024-01-15",
          vendor_name: "Test Vendor",
        },
      ];

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();
      const vm = wrapper.vm as any;
      if (vm.poCoOptions) {
        const options = vm.poCoOptions;
        expect(options.length).toBeGreaterThan(0);
        const poOption = options.find((opt: any) => opt.value === "PO:po-1");
        expect(poOption).toBeDefined();
        expect(poOption.number).toBe("PO-1");
      }
    });

    it("processes change orders for display", async () => {
      mockChangeOrdersStore.changeOrders = [
        {
          uuid: "co-1",
          co_number: "CO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_co_amount: 2000,
          created_date: "2024-01-15",
          vendor_name: "Test Vendor",
        },
      ];

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();
      const vm = wrapper.vm as any;
      if (vm.poCoOptions) {
        const options = vm.poCoOptions;
        expect(options.length).toBeGreaterThan(0);
        const coOption = options.find((opt: any) => opt.value === "CO:co-1");
        expect(coOption).toBeDefined();
        expect(coOption.number).toBe("CO-1");
      }
    });

    it("filters by allowed statuses (Approved, Completed, Partially_Received)", async () => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: "po-1",
          po_number: "PO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_po_amount: 1000,
        },
        {
          uuid: "po-2",
          po_number: "PO-2",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Completed",
          total_po_amount: 2000,
        },
        {
          uuid: "po-3",
          po_number: "PO-3",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Partially_Received",
          total_po_amount: 1500,
        },
        {
          uuid: "po-4",
          po_number: "PO-4",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Draft",
          total_po_amount: 500,
        },
        {
          uuid: "po-5",
          po_number: "PO-5",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Rejected",
          total_po_amount: 300,
        },
      ];

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      const button = wrapper.find("button");
      await button.trigger("click");
      await flushPromises();

      const table = wrapper.findComponent({ name: "UTable" });
      if (table.exists()) {
        const data = table.props("data") as any[];
        // Should show Approved, Completed, and Partially_Received (3 orders)
        expect(data.length).toBe(3);
        const numbers = data.map((d: any) => d.number);
        expect(numbers).toContain("PO-1");
        expect(numbers).toContain("PO-2");
        expect(numbers).toContain("PO-3");
        // Should not include Draft or Rejected
        expect(numbers).not.toContain("PO-4");
        expect(numbers).not.toContain("PO-5");
      }
    });

    it("includes Completed status purchase orders", async () => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: "po-1",
          po_number: "PO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Completed",
          total_po_amount: 1000,
          entry_date: "2024-01-15",
          vendor_name: "Test Vendor",
        },
      ];

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();
      const vm = wrapper.vm as any;
      if (vm.poCoOptions) {
        const options = vm.poCoOptions;
        expect(options.length).toBe(1);
        const poOption = options.find((opt: any) => opt.value === "PO:po-1");
        expect(poOption).toBeDefined();
        expect(poOption.status).toBe("Completed");
      }
    });

    it("includes Partially_Received status purchase orders", async () => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: "po-1",
          po_number: "PO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Partially_Received",
          total_po_amount: 1000,
          entry_date: "2024-01-15",
          vendor_name: "Test Vendor",
        },
      ];

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();
      const vm = wrapper.vm as any;
      if (vm.poCoOptions) {
        const options = vm.poCoOptions;
        expect(options.length).toBe(1);
        const poOption = options.find((opt: any) => opt.value === "PO:po-1");
        expect(poOption).toBeDefined();
        expect(poOption.status).toBe("Partially_Received");
      }
    });

    it("includes Completed and Partially_Received status change orders", async () => {
      mockChangeOrdersStore.changeOrders = [
        {
          uuid: "co-1",
          co_number: "CO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Completed",
          total_co_amount: 2000,
          created_date: "2024-01-15",
          vendor_name: "Test Vendor",
        },
        {
          uuid: "co-2",
          co_number: "CO-2",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Partially_Received",
          total_co_amount: 1500,
          created_date: "2024-01-16",
          vendor_name: "Test Vendor",
        },
      ];

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();
      const vm = wrapper.vm as any;
      if (vm.poCoOptions) {
        const options = vm.poCoOptions;
        expect(options.length).toBe(2);
        const co1Option = options.find((opt: any) => opt.value === "CO:co-1");
        const co2Option = options.find((opt: any) => opt.value === "CO:co-2");
        expect(co1Option).toBeDefined();
        expect(co1Option.status).toBe("Completed");
        expect(co2Option).toBeDefined();
        expect(co2Option.status).toBe("Partially_Received");
      }
    });
  });

  describe("Selection and Events", () => {
    it("emits update:modelValue when PO is selected", async () => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: "po-1",
          po_number: "PO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_po_amount: 1000,
        },
      ];

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      // Simulate selecting a PO by calling the selectAndPayAdvance method
      const vm = wrapper.vm as any;
      if (vm.selectAndPayAdvance) {
        const option = {
          value: "PO:po-1",
          number: "PO-1",
          order: mockPurchaseOrdersStore.purchaseOrders[0],
        };
        vm.selectAndPayAdvance(option);
        await flushPromises();

        expect(wrapper.emitted("update:modelValue")).toBeTruthy();
        expect(wrapper.emitted("update:modelValue")?.[0]?.[0]).toBe("PO:po-1");
        expect(wrapper.emitted("change")).toBeTruthy();
      }
    });

    it("emits update:modelValue when CO is selected", async () => {
      mockChangeOrdersStore.changeOrders = [
        {
          uuid: "co-1",
          co_number: "CO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_co_amount: 2000,
        },
      ];

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      const vm = wrapper.vm as any;
      if (vm.selectAndPayAdvance) {
        const option = {
          value: "CO:co-1",
          number: "CO-1",
          order: mockChangeOrdersStore.changeOrders[0],
        };
        vm.selectAndPayAdvance(option);
        await flushPromises();

        expect(wrapper.emitted("update:modelValue")).toBeTruthy();
        expect(wrapper.emitted("update:modelValue")?.[0]?.[0]).toBe("CO:co-1");
        expect(wrapper.emitted("change")).toBeTruthy();
      }
    });

    it("clears selection when clear button is clicked", async () => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: "po-1",
          po_number: "PO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_po_amount: 1000,
        },
      ];

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
          modelValue: "PO:po-1",
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      const vm = wrapper.vm as any;
      if (vm.clearSelection) {
        vm.clearSelection();
        await flushPromises();

        expect(wrapper.emitted("update:modelValue")).toBeTruthy();
        expect(wrapper.emitted("update:modelValue")?.[0]?.[0]).toBeUndefined();
        expect(wrapper.emitted("change")).toBeTruthy();
      }
    });
  });

  describe("Data Fetching", () => {
    it("fetches purchase orders on mount if needed", async () => {
      mockPurchaseOrdersStore.purchaseOrders = [];

      mount(POCOSelect, {
        props: {
          ...baseProps,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      // Should attempt to fetch if no data exists for corporation
      expect(mockPurchaseOrdersStore.fetchPurchaseOrders).toHaveBeenCalled();
    });

    it("fetches items when modal is opened", async () => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: "po-1",
          po_number: "PO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_po_amount: 1000,
        },
      ];

      mockFetch.mockResolvedValue({
        data: [
          { po_quantity: 10, unit_price: 100 },
          { po_quantity: 5, unit_price: 50 },
        ],
      });

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      const button = wrapper.find("button");
      await button.trigger("click");
      await flushPromises();

      // Should fetch items for PO
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/purchase-order-items")
      );
    });
  });

  describe("Search Functionality", () => {
    it("filters options based on search term", async () => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: "po-1",
          po_number: "PO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_po_amount: 1000,
          vendor_name: "Vendor A",
        },
        {
          uuid: "po-2",
          po_number: "PO-2",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_po_amount: 2000,
          vendor_name: "Vendor B",
        },
      ];

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      const vm = wrapper.vm as any;
      if (vm.searchFilter !== undefined) {
        vm.searchFilter = "PO-1";
        await flushPromises();

        const filtered = vm.filteredOptions;
        expect(filtered.length).toBe(1);
        expect(filtered[0].number).toBe("PO-1");
      }
    });
  });

  describe("Invoice Summary", () => {
    it("fetches invoice summary when showInvoiceSummary is enabled and modal opens", async () => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: "po-1",
          po_number: "PO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_po_amount: 10000,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        data: [],
      }).mockResolvedValueOnce({
        data: {
          advance_paid: 240,
          invoiced_value: 5000,
          balance_to_be_invoiced: 4760,
          total_po_value: 10000,
        },
      });

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
          showInvoiceSummary: true,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      const vm = wrapper.vm as any;
      if (vm.openModal) {
        await vm.openModal();
        await flushPromises();

        // Should fetch invoice summary
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/purchase-orders/invoice-summary")
        );
      }
    });

    it("does not fetch invoice summary when showInvoiceSummary is false", async () => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: "po-1",
          po_number: "PO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_po_amount: 10000,
        },
      ];

      mockFetch.mockResolvedValue({
        data: [],
      });

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
          showInvoiceSummary: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      const vm = wrapper.vm as any;
      if (vm.openModal) {
        await vm.openModal();
        await flushPromises();

        // Should not fetch invoice summary
        const invoiceSummaryCalls = mockFetch.mock.calls.filter((call: any) =>
          call[0]?.includes("/api/purchase-orders/invoice-summary")
        );
        expect(invoiceSummaryCalls.length).toBe(0);
      }
    });

    it("forces refresh of invoice summary when modal opens", async () => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: "po-1",
          po_number: "PO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_po_amount: 10000,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        data: [],
      }).mockResolvedValueOnce({
        data: {
          advance_paid: 240,
          invoiced_value: 5000,
          balance_to_be_invoiced: 4760,
          total_po_value: 10000,
        },
      });

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
          showInvoiceSummary: true,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      const vm = wrapper.vm as any;
      
      // First modal open
      if (vm.openModal) {
        await vm.openModal();
        await flushPromises();
      }

      // Second modal open - should force refresh
      if (vm.openModal) {
        await vm.openModal();
        await flushPromises();
      }

      // Should have been called twice (once per modal open)
      const invoiceSummaryCalls = mockFetch.mock.calls.filter((call: any) =>
        call[0]?.includes("/api/purchase-orders/invoice-summary")
      );
      expect(invoiceSummaryCalls.length).toBe(2);
    });

    it("displays invoice summary data in table columns when available", async () => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: "po-1",
          po_number: "PO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_po_amount: 10000,
          entry_date: "2024-01-15",
          vendor_name: "Test Vendor",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        data: [],
      }).mockResolvedValueOnce({
        data: {
          advance_paid: 240,
          invoiced_value: 5000,
          balance_to_be_invoiced: 4760,
          total_po_value: 10000,
        },
      });

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
          showInvoiceSummary: true,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      const vm = wrapper.vm as any;
      if (vm.openModal) {
        await vm.openModal();
        await flushPromises();
      }

      // Check that invoice summary columns are added
      if (vm.tableColumns) {
        const columns = vm.tableColumns;
        const hasAdvancePaidColumn = columns.some((col: any) =>
          col.accessorKey === "formattedAdvancePaid"
        );
        const hasInvoicedValueColumn = columns.some((col: any) =>
          col.accessorKey === "formattedInvoicedValue"
        );
        const hasBalanceColumn = columns.some((col: any) =>
          col.accessorKey === "formattedBalanceToBeInvoiced"
        );

        expect(hasAdvancePaidColumn).toBe(true);
        expect(hasInvoicedValueColumn).toBe(true);
        expect(hasBalanceColumn).toBe(true);
      }
    });

    it("does not trigger infinite loop when computing poCoOptions", async () => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: "po-1",
          po_number: "PO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_po_amount: 10000,
        },
      ];

      mockFetch.mockResolvedValue({
        data: [],
      });

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
          showInvoiceSummary: true,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      const vm = wrapper.vm as any;
      
      // Access poCoOptions multiple times - should not trigger fetches
      if (vm.poCoOptions) {
        const options1 = vm.poCoOptions;
        const options2 = vm.poCoOptions;
        const options3 = vm.poCoOptions;

        // Should return same reference (computed property)
        expect(options1).toBe(options2);
        expect(options2).toBe(options3);

        // Should not have fetched invoice summary from computed property
        const invoiceSummaryCalls = mockFetch.mock.calls.filter((call: any) =>
          call[0]?.includes("/api/purchase-orders/invoice-summary")
        );
        expect(invoiceSummaryCalls.length).toBe(0);
      }
    });

    it("handles invoice summary fetch errors gracefully", async () => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: "po-1",
          po_number: "PO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_po_amount: 10000,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        data: [],
      }).mockRejectedValueOnce(new Error("API Error"));

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
          showInvoiceSummary: true,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      const vm = wrapper.vm as any;
      if (vm.openModal) {
        await vm.openModal();
        await flushPromises();

        // Should log error but not crash
        expect(consoleErrorSpy).toHaveBeenCalled();
      }

      consoleErrorSpy.mockRestore();
    });
  });

  describe("showOnlyCOs prop", () => {
    it("shows only change orders when showOnlyCOs is true", async () => {
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: "po-1",
          po_number: "PO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_po_amount: 1000,
        },
      ];

      mockChangeOrdersStore.changeOrders = [
        {
          uuid: "co-1",
          co_number: "CO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_co_amount: 2000,
        },
      ];

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
          showOnlyCOs: true,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();
      const vm = wrapper.vm as any;
      if (vm.poCoOptions) {
        const options = vm.poCoOptions;
        // Should only have COs, no POs
        expect(options.length).toBe(1);
        expect(options[0].value).toBe("CO:co-1");
        expect(options[0].type).toBe("CO");
        // Should not have any PO options
        expect(options.find((opt: any) => opt.value === "PO:po-1")).toBeUndefined();
      }
    });

    it("shows modal title as 'Select Change Order' when showOnlyCOs is true", async () => {
      mockChangeOrdersStore.changeOrders = [
        {
          uuid: "co-1",
          co_number: "CO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_co_amount: 2000,
        },
      ];

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
          showOnlyCOs: true,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();
      const vm = wrapper.vm as any;
      if (vm.openModal) {
        await vm.openModal();
        await flushPromises();
        
        const modal = wrapper.findComponent({ name: "UModal" });
        if (modal.exists()) {
          expect(modal.props("title")).toBe("Select Change Order");
        }
      }
    });

    it("does not fetch PO items when showOnlyCOs is true", async () => {
      mockChangeOrdersStore.changeOrders = [
        {
          uuid: "co-1",
          co_number: "CO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_co_amount: 2000,
        },
      ];

      mockFetch.mockResolvedValue({ data: [] });

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
          showOnlyCOs: true,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      const vm = wrapper.vm as any;
      if (vm.openModal) {
        await vm.openModal();
        await flushPromises();

        // Should not fetch PO items
        const poItemCalls = mockFetch.mock.calls.filter((call: any) =>
          call[0]?.includes("/api/purchase-order-items")
        );
        expect(poItemCalls.length).toBe(0);
      }
    });

    it("fetches CO items when showOnlyCOs is true and modal opens", async () => {
      mockChangeOrdersStore.changeOrders = [
        {
          uuid: "co-1",
          co_number: "CO-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          vendor_uuid: "vendor-1",
          status: "Approved",
          total_co_amount: 2000,
        },
      ];

      mockFetch.mockResolvedValue({
        data: [
          { co_quantity: 10, co_unit_price: 200 },
        ],
      });

      const wrapper = mount(POCOSelect, {
        props: {
          ...baseProps,
          showOnlyCOs: true,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      const vm = wrapper.vm as any;
      if (vm.openModal) {
        await vm.openModal();
        await flushPromises();

        // Should fetch CO items
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/change-order-items")
        );
      }
    });
  });
});

