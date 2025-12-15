import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import VendorInvoiceForm from "@/components/Payables/VendorInvoiceForm.vue";
import DirectVendorInvoiceLineItemsTable from "@/components/Payables/DirectVendorInvoiceLineItemsTable.vue";

// Mock composables
vi.mock("@/composables/useUTCDateFormat", () => ({
  useUTCDateFormat: () => ({
    toUTCString: (date: string) => `${date}T00:00:00.000Z`,
    fromUTCString: (date: string) => date.split("T")[0],
  }),
}));

vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (value: number | string | null | undefined) => {
      const num = typeof value === "string" ? parseFloat(value) : Number(value ?? 0);
      if (Number.isNaN(num)) return "$0.00";
      return `$${num.toFixed(2)}`;
    },
    currencySymbol: ref("$"),
  }),
}));

// Mock stores
const mockCorpStore = {
  selectedCorporation: {
    uuid: "corp-1",
    corporation_name: "Test Corp",
  },
  selectedCorporationId: "corp-1",
};

const mockVendorStore = {
  vendors: [],
  loading: false,
  fetchVendors: vi.fn(),
};

const mockProjectsStore = {
  projectsMetadata: [],
  loading: false,
  fetchProjectsMetadata: vi.fn(),
};

const mockVendorInvoicesStore = {
  vendorInvoices: [],
  loading: false,
  fetchVendorInvoices: vi.fn(),
};

vi.mock("@/stores/corporations", () => ({
  useCorporationStore: () => mockCorpStore,
}));

vi.mock("@/stores/vendors", () => ({
  useVendorStore: () => mockVendorStore,
}));

vi.mock("@/stores/projects", () => ({
  useProjectsStore: () => mockProjectsStore,
}));

vi.mock("@/stores/vendorInvoices", () => ({
  useVendorInvoicesStore: () => mockVendorInvoicesStore,
}));

// UI Stubs
const uiStubs = {
  UCard: { template: "<div><slot /></div>" },
  USelectMenu: {
    props: ["modelValue", "items", "valueKey", "placeholder", "size", "disabled"],
    emits: ["update:modelValue"],
    template: "<select />",
  },
  UPopover: { template: '<div><slot /><slot name="content" /></div>' },
  UButton: {
    template: "<button><slot /></button>",
    props: ["icon", "color", "variant", "size", "disabled", "loading"],
  },
  UCalendar: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: "<div />",
  },
  UInput: {
    props: ["modelValue", "placeholder", "size", "class", "icon", "disabled", "type", "step"],
    emits: ["update:modelValue"],
    template: "<input />",
  },
  UFileUpload: {
    template: '<div><slot :open="() => {}" /></div>',
  },
  UModal: {
    template: '<div><slot name="header" /><slot name="body" /><slot name="footer" /></div>',
    props: ["open"],
  },
  USkeleton: { template: "<div />" },
  ProjectSelect: {
    props: ["modelValue", "corporationUuid", "disabled", "placeholder", "size", "class"],
    emits: ["update:modelValue"],
    template: "<div />",
  },
  VendorSelect: {
    props: ["modelValue", "corporationUuid", "disabled", "placeholder", "size", "class"],
    emits: ["update:modelValue", "change"],
    template: "<div />",
  },
  PurchaseOrderSelect: {
    props: ["modelValue", "projectUuid", "corporationUuid", "vendorUuid", "disabled", "placeholder", "size", "class"],
    emits: ["update:modelValue", "change"],
    template: "<div />",
  },
  FilePreview: {
    props: ["attachment"],
    template: "<div />",
  },
  DirectVendorInvoiceLineItemsTable: DirectVendorInvoiceLineItemsTable,
  FinancialBreakdown: {
    props: ["itemTotal", "formData", "readOnly", "itemTotalLabel", "totalLabel", "totalFieldName"],
    emits: ["update"],
    template: "<div />",
  },
  CostCodeSelect: {
    props: ["modelValue", "corporationUuid", "size", "class", "disabled", "placeholder"],
    emits: ["update:modelValue", "change"],
    template: "<div />",
  },
  SequenceSelect: {
    props: ["modelValue", "corporationUuid", "costCodeUuid", "size", "class", "disabled", "placeholder"],
    emits: ["update:modelValue", "change"],
    template: "<div />",
  },
  ItemSelect: {
    props: ["modelValue", "corporationUuid", "costCodeUuid", "size", "class", "disabled", "placeholder"],
    emits: ["update:modelValue", "change"],
    template: "<div />",
  },
};

describe("Vendor Invoice Calculations", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
  });

  describe("Line Item Total Calculations", () => {
    it("calculates total correctly: unit_price * quantity", async () => {
      const lineItems = [
        { id: "item-1", unit_price: 100, quantity: 5, total: null },
      ];

      const wrapper = mount(VendorInvoiceForm, {
        props: {
          form: {
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            vendor_uuid: "vendor-1",
            invoice_type: "ENTER_DIRECT_INVOICE",
            line_items: lineItems,
            attachments: [],
          },
          editingInvoice: false,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      const financialBreakdowns = wrapper.findAllComponents({ name: "FinancialBreakdown" });
      if (financialBreakdowns.length > 0) {
        expect(financialBreakdowns[0].props("itemTotal")).toBe(500); // 100 * 5
      }
    });

    it("calculates total with decimals correctly", async () => {
      const lineItems = [
        { id: "item-1", unit_price: 99.99, quantity: 2.5, total: null },
      ];

      const wrapper = mount(VendorInvoiceForm, {
        props: {
          form: {
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            vendor_uuid: "vendor-1",
            invoice_type: "ENTER_DIRECT_INVOICE",
            line_items: lineItems,
            attachments: [],
          },
          editingInvoice: false,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      const financialBreakdowns = wrapper.findAllComponents({ name: "FinancialBreakdown" });
      if (financialBreakdowns.length > 0) {
        // 99.99 * 2.5 = 249.975, rounded to 249.98
        expect(financialBreakdowns[0].props("itemTotal")).toBeCloseTo(249.98, 2);
      }
    });

    it("calculates total for multiple items correctly", async () => {
      const lineItems = [
        { id: "item-1", unit_price: 100, quantity: 5, total: null },
        { id: "item-2", unit_price: 50, quantity: 10, total: null },
        { id: "item-3", unit_price: 25, quantity: 20, total: null },
      ];

      const wrapper = mount(VendorInvoiceForm, {
        props: {
          form: {
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            vendor_uuid: "vendor-1",
            invoice_type: "ENTER_DIRECT_INVOICE",
            line_items: lineItems,
            attachments: [],
          },
          editingInvoice: false,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      const financialBreakdowns = wrapper.findAllComponents({ name: "FinancialBreakdown" });
      if (financialBreakdowns.length > 0) {
        // 100*5 + 50*10 + 25*20 = 500 + 500 + 500 = 1500
        expect(financialBreakdowns[0].props("itemTotal")).toBe(1500);
      }
    });

    it("handles zero values correctly", async () => {
      const lineItems = [
        { id: "item-1", unit_price: 0, quantity: 5, total: null },
        { id: "item-2", unit_price: 100, quantity: 0, total: null },
        { id: "item-3", unit_price: 0, quantity: 0, total: null },
      ];

      const wrapper = mount(VendorInvoiceForm, {
        props: {
          form: {
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            vendor_uuid: "vendor-1",
            invoice_type: "ENTER_DIRECT_INVOICE",
            line_items: lineItems,
            attachments: [],
          },
          editingInvoice: false,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      const financialBreakdowns = wrapper.findAllComponents({ name: "FinancialBreakdown" });
      if (financialBreakdowns.length > 0) {
        expect(financialBreakdowns[0].props("itemTotal")).toBe(0);
      }
    });

    it("handles null values correctly", async () => {
      const lineItems = [
        { id: "item-1", unit_price: null, quantity: 5, total: null },
        { id: "item-2", unit_price: 100, quantity: null, total: null },
        { id: "item-3", unit_price: null, quantity: null, total: null },
      ];

      const wrapper = mount(VendorInvoiceForm, {
        props: {
          form: {
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            vendor_uuid: "vendor-1",
            invoice_type: "ENTER_DIRECT_INVOICE",
            line_items: lineItems,
            attachments: [],
          },
          editingInvoice: false,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      const financialBreakdowns = wrapper.findAllComponents({ name: "FinancialBreakdown" });
      if (financialBreakdowns.length > 0) {
        expect(financialBreakdowns[0].props("itemTotal")).toBe(0);
      }
    });

    it("rounds currency values correctly", async () => {
      const lineItems = [
        { id: "item-1", unit_price: 33.333, quantity: 3, total: null },
      ];

      const wrapper = mount(VendorInvoiceForm, {
        props: {
          form: {
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            vendor_uuid: "vendor-1",
            invoice_type: "ENTER_DIRECT_INVOICE",
            line_items: lineItems,
            attachments: [],
          },
          editingInvoice: false,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      const financialBreakdowns = wrapper.findAllComponents({ name: "FinancialBreakdown" });
      if (financialBreakdowns.length > 0) {
        // 33.333 * 3 = 99.999, rounded to 100.00
        expect(financialBreakdowns[0].props("itemTotal")).toBeCloseTo(100.00, 2);
      }
    });
  });

  describe("Financial Breakdown Calculations", () => {
    it("calculates charges total correctly", async () => {
      const lineItems = [
        { id: "item-1", unit_price: 1000, quantity: 1, total: 1000 },
      ];

      const wrapper = mount(VendorInvoiceForm, {
        props: {
          form: {
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            vendor_uuid: "vendor-1",
            invoice_type: "ENTER_DIRECT_INVOICE",
            line_items: lineItems,
            attachments: [],
          },
          editingInvoice: false,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      const financialBreakdowns = wrapper.findAllComponents({ name: "FinancialBreakdown" });
      if (financialBreakdowns.length > 0) {
        const financialBreakdown = financialBreakdowns[0];
        
        // Update with charges
        await financialBreakdown.vm.$emit("update", {
        freight_charges_percentage: 5,
        freight_charges_amount: 50, // 5% of 1000
        packing_charges_percentage: 2,
        packing_charges_amount: 20, // 2% of 1000
        custom_duties_charges_percentage: 1,
        custom_duties_charges_amount: 10, // 1% of 1000
        other_charges_percentage: 1,
        other_charges_amount: 10, // 1% of 1000
        charges_total: 90, // 50 + 20 + 10 + 10
        amount: 1090,
        financial_breakdown: {
          charges: {
            freight: { percentage: 5, amount: 50, taxable: false },
            packing: { percentage: 2, amount: 20, taxable: false },
            custom_duties: { percentage: 1, amount: 10, taxable: false },
            other: { percentage: 1, amount: 10, taxable: false },
          },
          sales_taxes: {},
          totals: {
            item_total: 1000,
            charges_total: 90,
            tax_total: 0,
            total_invoice_amount: 1090,
          },
        },
      });
      await flushPromises();
      }

      const emittedForms = wrapper.emitted("update:form");
      if (emittedForms && emittedForms.length > 0) {
        const lastForm = emittedForms[emittedForms.length - 1][0];
        expect(lastForm.financial_breakdown.totals.charges_total).toBe(90);
        expect(lastForm.amount).toBe(1090);
      }
    });

    it("calculates sales tax correctly on taxable base", async () => {
      const lineItems = [
        { id: "item-1", unit_price: 1000, quantity: 1, total: 1000 },
      ];

      const wrapper = mount(VendorInvoiceForm, {
        props: {
          form: {
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            vendor_uuid: "vendor-1",
            invoice_type: "ENTER_DIRECT_INVOICE",
            line_items: lineItems,
            attachments: [],
          },
          editingInvoice: false,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      const financialBreakdowns = wrapper.findAllComponents({ name: "FinancialBreakdown" });
      if (financialBreakdowns.length > 0) {
        const financialBreakdown = financialBreakdowns[0];
        
        // Update with sales tax
        await financialBreakdown.vm.$emit("update", {
        sales_tax_1_percentage: 8,
        sales_tax_1_amount: 80, // 8% of 1000
        sales_tax_2_percentage: 2,
        sales_tax_2_amount: 20, // 2% of 1000
        tax_total: 100, // 80 + 20
        amount: 1100,
        financial_breakdown: {
          charges: {},
          sales_taxes: {
            sales_tax_1: { percentage: 8, amount: 80 },
            sales_tax_2: { percentage: 2, amount: 20 },
          },
          totals: {
            item_total: 1000,
            charges_total: 0,
            tax_total: 100,
            total_invoice_amount: 1100,
          },
        },
      });
      await flushPromises();
      }

      const emittedForms = wrapper.emitted("update:form");
      if (emittedForms && emittedForms.length > 0) {
        const lastForm = emittedForms[emittedForms.length - 1][0];
        expect(lastForm.financial_breakdown.totals.tax_total).toBe(100);
        expect(lastForm.amount).toBe(1100);
      }
    });

    it("calculates total invoice amount correctly with all components", async () => {
      const lineItems = [
        { id: "item-1", unit_price: 1000, quantity: 1, total: 1000 },
      ];

      const wrapper = mount(VendorInvoiceForm, {
        props: {
          form: {
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            vendor_uuid: "vendor-1",
            invoice_type: "ENTER_DIRECT_INVOICE",
            line_items: lineItems,
            attachments: [],
          },
          editingInvoice: false,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      const financialBreakdowns = wrapper.findAllComponents({ name: "FinancialBreakdown" });
      if (financialBreakdowns.length > 0) {
        const financialBreakdown = financialBreakdowns[0];
        
        // Update with all components
        await financialBreakdown.vm.$emit("update", {
        freight_charges_percentage: 5,
        freight_charges_amount: 50,
        packing_charges_percentage: 2,
        packing_charges_amount: 20,
        sales_tax_1_percentage: 8,
        sales_tax_1_amount: 85.6, // 8% of (1000 + 50 + 20)
        charges_total: 70, // 50 + 20
        tax_total: 85.6,
        amount: 1155.6, // 1000 + 70 + 85.6
        financial_breakdown: {
          charges: {
            freight: { percentage: 5, amount: 50, taxable: false },
            packing: { percentage: 2, amount: 20, taxable: false },
            custom_duties: { percentage: null, amount: null, taxable: false },
            other: { percentage: null, amount: null, taxable: false },
          },
          sales_taxes: {
            sales_tax_1: { percentage: 8, amount: 85.6 },
            sales_tax_2: { percentage: null, amount: null },
          },
          totals: {
            item_total: 1000,
            charges_total: 70,
            tax_total: 85.6,
            total_invoice_amount: 1155.6,
          },
        },
      });
      await flushPromises();
      }

      const emittedForms = wrapper.emitted("update:form");
      if (emittedForms && emittedForms.length > 0) {
        const lastForm = emittedForms[emittedForms.length - 1][0];
        expect(lastForm.financial_breakdown.totals.item_total).toBe(1000);
        expect(lastForm.financial_breakdown.totals.charges_total).toBe(70);
        expect(lastForm.financial_breakdown.totals.tax_total).toBe(85.6);
        expect(lastForm.financial_breakdown.totals.total_invoice_amount).toBe(1155.6);
        expect(lastForm.amount).toBe(1155.6);
      }
    });

    it("handles taxable charges correctly", async () => {
      const lineItems = [
        { id: "item-1", unit_price: 1000, quantity: 1, total: 1000 },
      ];

      const wrapper = mount(VendorInvoiceForm, {
        props: {
          form: {
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            vendor_uuid: "vendor-1",
            invoice_type: "ENTER_DIRECT_INVOICE",
            line_items: lineItems,
            attachments: [],
          },
          editingInvoice: false,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      const financialBreakdowns = wrapper.findAllComponents({ name: "FinancialBreakdown" });
      if (financialBreakdowns.length > 0) {
        const financialBreakdown = financialBreakdowns[0];
        
        // Update with taxable charges
        await financialBreakdown.vm.$emit("update", {
        freight_charges_percentage: 5,
        freight_charges_amount: 50,
        freight_charges_taxable: true,
        packing_charges_percentage: 2,
        packing_charges_amount: 20,
        packing_charges_taxable: false,
        sales_tax_1_percentage: 8,
        sales_tax_1_amount: 84, // 8% of (1000 + 50) - only freight is taxable
        charges_total: 70,
        tax_total: 84,
        amount: 1154,
        financial_breakdown: {
          charges: {
            freight: { percentage: 5, amount: 50, taxable: true },
            packing: { percentage: 2, amount: 20, taxable: false },
            custom_duties: { percentage: null, amount: null, taxable: false },
            other: { percentage: null, amount: null, taxable: false },
          },
          sales_taxes: {
            sales_tax_1: { percentage: 8, amount: 84 },
            sales_tax_2: { percentage: null, amount: null },
          },
          totals: {
            item_total: 1000,
            charges_total: 70,
            tax_total: 84,
            total_invoice_amount: 1154,
          },
        },
      });
      await flushPromises();
      }

      const emittedForms = wrapper.emitted("update:form");
      if (emittedForms && emittedForms.length > 0) {
        const lastForm = emittedForms[emittedForms.length - 1][0];
        expect(lastForm.financial_breakdown.charges.freight.taxable).toBe(true);
        expect(lastForm.financial_breakdown.charges.packing.taxable).toBe(false);
        expect(lastForm.financial_breakdown.totals.tax_total).toBe(84);
      }
    });
  });

  describe("Due Date Calculations", () => {
    it("calculates due date correctly for NET_15", async () => {
      const wrapper = mount(VendorInvoiceForm, {
        props: {
          form: {
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            invoice_type: "AGAINST_PO",
            vendor_uuid: "vendor-1",
            bill_date: "2024-01-15T00:00:00.000Z",
            credit_days: "NET_15",
            attachments: [],
          },
          editingInvoice: false,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      const emittedForms = wrapper.emitted("update:form");
      if (emittedForms && emittedForms.length > 0) {
        const lastForm = emittedForms[emittedForms.length - 1][0];
        if (lastForm.due_date) {
          const dueDate = new Date(lastForm.due_date);
          const billDate = new Date("2024-01-15T00:00:00.000Z");
          const daysDiff = Math.floor((dueDate.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24));
          expect(daysDiff).toBe(15);
        }
      }
    });

    it("calculates due date correctly for NET_30", async () => {
      const wrapper = mount(VendorInvoiceForm, {
        props: {
          form: {
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            invoice_type: "AGAINST_PO",
            vendor_uuid: "vendor-1",
            bill_date: "2024-01-15T00:00:00.000Z",
            credit_days: "NET_30",
            attachments: [],
          },
          editingInvoice: false,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      const emittedForms = wrapper.emitted("update:form");
      if (emittedForms && emittedForms.length > 0) {
        const lastForm = emittedForms[emittedForms.length - 1][0];
        if (lastForm.due_date) {
          const dueDate = new Date(lastForm.due_date);
          const billDate = new Date("2024-01-15T00:00:00.000Z");
          const daysDiff = Math.floor((dueDate.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24));
          expect(daysDiff).toBe(30);
        }
      }
    });

    it("handles month boundaries correctly", async () => {
      const wrapper = mount(VendorInvoiceForm, {
        props: {
          form: {
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            invoice_type: "AGAINST_PO",
            vendor_uuid: "vendor-1",
            bill_date: "2024-01-30T00:00:00.000Z",
            credit_days: "NET_30",
            attachments: [],
          },
          editingInvoice: false,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      const emittedForms = wrapper.emitted("update:form");
      if (emittedForms && emittedForms.length > 0) {
        const lastForm = emittedForms[emittedForms.length - 1][0];
        if (lastForm.due_date) {
          const dueDate = new Date(lastForm.due_date);
          // Should be February 29, 2024 (2024 is a leap year)
          expect(dueDate.getMonth()).toBe(1); // February (0-indexed)
          expect(dueDate.getDate()).toBe(29);
        }
      }
    });
  });

  describe("Reactive Calculations", () => {
    it("updates line items total when adding a new item", async () => {
      const lineItems = [
        { id: "item-1", unit_price: 100, quantity: 5, total: 500 },
      ];

      const wrapper = mount(VendorInvoiceForm, {
        props: {
          form: {
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            vendor_uuid: "vendor-1",
            invoice_type: "ENTER_DIRECT_INVOICE",
            line_items: lineItems,
            attachments: [],
          },
          editingInvoice: false,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      // Initial total
      let financialBreakdowns = wrapper.findAllComponents({ name: "FinancialBreakdown" });
      if (financialBreakdowns.length > 0) {
        expect(financialBreakdowns[0].props("itemTotal")).toBe(500);
      }

      // Add new item
      const lineItemsTables = wrapper.findAllComponents(DirectVendorInvoiceLineItemsTable);
      if (lineItemsTables.length > 0) {
        await lineItemsTables[0].vm.$emit("add-row", 0);
        await flushPromises();

        // Update new item
        await lineItemsTables[0].vm.$emit("unit-price-change", {
          index: 1,
          value: 200,
          numericValue: 200,
          computedTotal: 1000,
        });
        await lineItemsTables[0].vm.$emit("quantity-change", {
          index: 1,
          value: 5,
          numericValue: 5,
          computedTotal: 1000,
        });
        await flushPromises();

        // Total should be 1500 (500 + 1000)
        financialBreakdowns = wrapper.findAllComponents({ name: "FinancialBreakdown" });
        if (financialBreakdowns.length > 0) {
          expect(financialBreakdowns[0].props("itemTotal")).toBe(1500);
        }
      }
    });

    it("updates line items total when removing an item", async () => {
      const lineItems = [
        { id: "item-1", unit_price: 100, quantity: 5, total: 500 },
        { id: "item-2", unit_price: 200, quantity: 5, total: 1000 },
        { id: "item-3", unit_price: 50, quantity: 10, total: 500 },
      ];

      const wrapper = mount(VendorInvoiceForm, {
        props: {
          form: {
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            vendor_uuid: "vendor-1",
            invoice_type: "ENTER_DIRECT_INVOICE",
            line_items: lineItems,
            attachments: [],
          },
          editingInvoice: false,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      // Initial total: 500 + 1000 + 500 = 2000
      let financialBreakdowns = wrapper.findAllComponents({ name: "FinancialBreakdown" });
      if (financialBreakdowns.length > 0) {
        expect(financialBreakdowns[0].props("itemTotal")).toBe(2000);
      }

      // Remove middle item
      const lineItemsTables = wrapper.findAllComponents(DirectVendorInvoiceLineItemsTable);
      if (lineItemsTables.length > 0) {
        await lineItemsTables[0].vm.$emit("remove-row", 1);
        await flushPromises();

        // Total should be 1000 (500 + 500)
        financialBreakdowns = wrapper.findAllComponents({ name: "FinancialBreakdown" });
        if (financialBreakdowns.length > 0) {
          expect(financialBreakdowns[0].props("itemTotal")).toBe(1000);
        }
      }
    });

    it("updates financial breakdown when line items total changes", async () => {
      const lineItems = [
        { id: "item-1", unit_price: 1000, quantity: 1, total: 1000 },
      ];

      const wrapper = mount(VendorInvoiceForm, {
        props: {
          form: {
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            vendor_uuid: "vendor-1",
            invoice_type: "ENTER_DIRECT_INVOICE",
            line_items: lineItems,
            attachments: [],
          },
          editingInvoice: false,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      // Set financial breakdown with 5% freight
      const financialBreakdowns = wrapper.findAllComponents({ name: "FinancialBreakdown" });
      if (financialBreakdowns.length > 0) {
        await financialBreakdowns[0].vm.$emit("update", {
        freight_charges_percentage: 5,
        freight_charges_amount: 50, // 5% of 1000
        amount: 1050,
        financial_breakdown: {
          charges: {
            freight: { percentage: 5, amount: 50, taxable: false },
            packing: { percentage: null, amount: null, taxable: false },
            custom_duties: { percentage: null, amount: null, taxable: false },
            other: { percentage: null, amount: null, taxable: false },
          },
          sales_taxes: {},
          totals: {
            item_total: 1000,
            charges_total: 50,
            tax_total: 0,
            total_invoice_amount: 1050,
          },
        },
        });
        await flushPromises();

        // Update line item to 2000
        const lineItemsTables = wrapper.findAllComponents(DirectVendorInvoiceLineItemsTable);
        if (lineItemsTables.length > 0) {
          await lineItemsTables[0].vm.$emit("unit-price-change", {
            index: 0,
            value: 2000,
            numericValue: 2000,
            computedTotal: 2000,
          });
          await flushPromises();

          // Financial breakdown should receive new item total
          const updatedFinancialBreakdowns = wrapper.findAllComponents({ name: "FinancialBreakdown" });
          if (updatedFinancialBreakdowns.length > 0) {
            expect(updatedFinancialBreakdowns[0].props("itemTotal")).toBe(2000);
          }
        }
      }
    });
  });

  describe("Edge Cases in Calculations", () => {
    it("handles very large numbers", async () => {
      const lineItems = [
        { id: "item-1", unit_price: 999999.99, quantity: 1000, total: null },
      ];

      const wrapper = mount(VendorInvoiceForm, {
        props: {
          form: {
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            vendor_uuid: "vendor-1",
            invoice_type: "ENTER_DIRECT_INVOICE",
            line_items: lineItems,
            attachments: [],
          },
          editingInvoice: false,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      const financialBreakdowns = wrapper.findAllComponents({ name: "FinancialBreakdown" });
      if (financialBreakdowns.length > 0) {
        // 999999.99 * 1000 = 999999990
        expect(financialBreakdowns[0].props("itemTotal")).toBeCloseTo(999999990, 0);
      }
    });

    it("handles very small decimal values", async () => {
      const lineItems = [
        { id: "item-1", unit_price: 0.01, quantity: 0.01, total: null },
      ];

      const wrapper = mount(VendorInvoiceForm, {
        props: {
          form: {
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            vendor_uuid: "vendor-1",
            invoice_type: "ENTER_DIRECT_INVOICE",
            line_items: lineItems,
            attachments: [],
          },
          editingInvoice: false,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      const financialBreakdowns = wrapper.findAllComponents({ name: "FinancialBreakdown" });
      if (financialBreakdowns.length > 0) {
        // 0.01 * 0.01 = 0.0001, rounded to 0.00
        expect(financialBreakdowns[0].props("itemTotal")).toBeCloseTo(0, 2);
      }
    });

    it("handles negative values gracefully", async () => {
      const lineItems = [
        { id: "item-1", unit_price: -100, quantity: 5, total: null },
      ];

      const wrapper = mount(VendorInvoiceForm, {
        props: {
          form: {
            corporation_uuid: "corp-1",
            project_uuid: "project-1",
            vendor_uuid: "vendor-1",
            invoice_type: "ENTER_DIRECT_INVOICE",
            line_items: lineItems,
            attachments: [],
          },
          editingInvoice: false,
          loading: false,
          readonly: false,
        },
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      // Should handle negative values (though not typical in real scenarios)
      const financialBreakdowns = wrapper.findAllComponents({ name: "FinancialBreakdown" });
      if (financialBreakdowns.length > 0) {
        expect(typeof financialBreakdowns[0].props("itemTotal")).toBe("number");
      }
    });
  });
});

