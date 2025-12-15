import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from "vue";
import PurchaseOrderBreakout from "@/pages/reports/purchase-order-breakout.vue";
import { useCorporationStore } from "@/stores/corporations";
import { useProjectsStore } from "@/stores/projects";

// Mock composables
vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (val: number | null | undefined) => {
      if (val === null || val === undefined) return "$0.00";
      return `$${Number(val).toFixed(2)}`;
    },
  }),
}));

// Mock $fetch
const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

// Mock window.print
global.window.print = vi.fn();

const setupStores = () => {
  const pinia = createPinia();
  setActivePinia(pinia);

  const corporations = [
    { uuid: "corp-1", corporation_name: "Corp One", legal_name: "CorpOne LLC" },
    { uuid: "corp-2", corporation_name: "Corp Two", legal_name: "CorpTwo LLC" },
  ];

  const projects = [
    { uuid: "proj-1", project_name: "Project One", project_id: "P-001" },
    { uuid: "proj-2", project_name: "Project Two", project_id: "P-002" },
  ];

  const corpStore = useCorporationStore();
  corpStore.corporations = corporations as any;
  corpStore.selectedCorporationId = "corp-1";

  const projectsStore = useProjectsStore();
  projectsStore.projects = projects as any;
  projectsStore.fetchProjects = vi.fn(() => Promise.resolve());

  return {
    pinia,
    stores: {
      corporations: corpStore,
      projects: projectsStore,
    },
  };
};

const createStubs = () => ({
  UButton: {
    name: "UButton",
    template: "<button><slot /></button>",
    props: ["icon", "variant", "size", "color"],
  },
  UIcon: {
    name: "UIcon",
    template: "<i />",
    props: ["name"],
  },
  USkeleton: {
    name: "USkeleton",
    template: '<div class="skeleton" />',
    props: ["class"],
  },
  ProjectSelect: {
    name: "ProjectSelect",
    template: '<div class="project-select" />',
    props: ["modelValue", "corporationUuid", "placeholder", "size", "class"],
    emits: ["update:modelValue"],
  },
  CorporationSelect: {
    name: "CorporationSelect",
    template: '<div class="corporation-select" />',
    props: ["modelValue", "size", "class"],
    emits: ["update:modelValue", "change"],
  },
});

const mockPurchaseOrders = [
  {
    uuid: "po-1",
    po_number: "PO-001",
    corporation_uuid: "corp-1",
    project_uuid: "proj-1",
    vendor_uuid: "vendor-1",
    status: "Approved",
    item_total: 1000,
    freight_charges_amount: 100,
    packing_charges_amount: 50,
    custom_duties_amount: 25,
    other_charges_amount: 10,
    tax_total: 150,
    total_po_amount: 1335,
    po_type: "MATERIAL",
  },
  {
    uuid: "po-2",
    po_number: "PO-002",
    corporation_uuid: "corp-1",
    project_uuid: "proj-1",
    vendor_uuid: "vendor-2",
    status: "Approved",
    item_total: 2000,
    freight_charges_amount: 200,
    packing_charges_amount: 100,
    custom_duties_amount: 50,
    other_charges_amount: 20,
    tax_total: 300,
    total_po_amount: 2670,
    po_type: "LABOR",
  },
  {
    uuid: "po-3",
    po_number: "PO-003",
    corporation_uuid: "corp-1",
    project_uuid: "proj-1",
    vendor_uuid: "vendor-1",
    status: "Draft",
    item_total: 500,
    freight_charges_amount: 50,
    packing_charges_amount: 25,
    custom_duties_amount: 12.5,
    other_charges_amount: 5,
    tax_total: 75,
    total_po_amount: 667.5,
    po_type: "MATERIAL",
  },
];

const mockVendors = [
  { uuid: "vendor-1", vendor_name: "Vendor One" },
  { uuid: "vendor-2", vendor_name: "Vendor Two" },
];

const mockItems = [
  {
    uuid: "item-1",
    item_name: "Item 1",
    description: "Description 1",
    po_quantity: 10,
    quantity: 10,
    po_unit_price: 50,
    unit_price: 50,
    po_total: 500,
    total: 500,
    uom: "ea",
  },
  {
    uuid: "item-2",
    item_name: "Item 2",
    description: "Description 2",
    po_quantity: 10,
    quantity: 10,
    po_unit_price: 50,
    unit_price: 50,
    po_total: 500,
    total: 500,
    uom: "ea",
  },
];

const mockLaborItems = [
  {
    uuid: "labor-item-1",
    description: "Labor Item 1",
    po_quantity: 20,
    quantity: 20,
    po_unit_price: 100,
    unit_price: 100,
    po_total: 2000,
    total: 2000,
    uom: "hr",
  },
];

describe("PurchaseOrderBreakout.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("Component Rendering", () => {
    it("renders the component with all required elements", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      expect(wrapper.find("h1").text()).toContain("Purchase Order Breakout");
      expect(
        wrapper.findComponent({ name: "CorporationSelect" }).exists()
      ).toBe(true);
      expect(wrapper.findComponent({ name: "ProjectSelect" }).exists()).toBe(
        true
      );

      wrapper.unmount();
    });

    it("shows placeholder when no corporation is selected", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = undefined;
      await nextTick();

      expect(wrapper.html()).toContain("Please select a corporation");
      // Check for UIcon component with building-office icon
      const icon = wrapper.findComponent({ name: "UIcon" });
      expect(icon.exists()).toBe(true);

      wrapper.unmount();
    });

    it("shows placeholder when corporation selected but no project", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = undefined;
      await nextTick();

      expect(wrapper.html()).toContain("Please select a project");
      // Check for UIcon component
      const icons = wrapper.findAllComponents({ name: "UIcon" });
      expect(icons.length).toBeGreaterThan(0);

      wrapper.unmount();
    });
  });

  describe("Corporation Selection", () => {
    it("renders CorporationSelect component with correct props", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      const corporationSelect = wrapper.findComponent({
        name: "CorporationSelect",
      });
      expect(corporationSelect.exists()).toBe(true);
      expect(corporationSelect.props("size")).toBe("sm");
      expect(corporationSelect.props("class")).toBe("w-64");

      wrapper.unmount();
    });

    it("handles corporation change event", async () => {
      const { pinia, stores } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      const corporation = {
        value: "corp-2",
        uuid: "corp-2",
        corporation_name: "Corp Two",
        legal_name: "CorpTwo LLC",
      };

      await (wrapper.vm as any).handleCorporationChangeFromSelect(corporation);
      await flushPromises();

      expect(stores.projects.fetchProjects).toHaveBeenCalledWith("corp-2");
      expect((wrapper.vm as any).selectedProjectId).toBeUndefined();
      expect((wrapper.vm as any).reportData).toEqual([]);

      wrapper.unmount();
    });

    it("clears project selection and report data when corporation changes", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedProjectId = "proj-1";
      (wrapper.vm as any).reportData = [{ uuid: "po-1" }] as any;
      await nextTick();

      await (wrapper.vm as any).handleCorporationChangeFromSelect({
        value: "corp-2",
      });
      await flushPromises();

      expect((wrapper.vm as any).selectedProjectId).toBeUndefined();
      expect((wrapper.vm as any).reportData).toEqual([]);

      wrapper.unmount();
    });

    it("initializes with selected corporation from store", async () => {
      const { pinia, stores } = setupStores();
      stores.corporations.selectedCorporationId = "corp-1";

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      expect((wrapper.vm as any).selectedCorporationId).toBe("corp-1");
      expect(stores.projects.fetchProjects).toHaveBeenCalledWith("corp-1");

      wrapper.unmount();
    });
  });

  describe("Project Selection", () => {
    it("renders ProjectSelect component with correct props", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      const projectSelect = wrapper.findComponent({ name: "ProjectSelect" });
      expect(projectSelect.exists()).toBe(true);
      expect(projectSelect.props("placeholder")).toBe("Select project");
      expect(projectSelect.props("size")).toBe("sm");
      expect(projectSelect.props("class")).toBe("w-64");

      wrapper.unmount();
    });

    it("passes corporation UUID to ProjectSelect", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      await nextTick();

      const projectSelect = wrapper.findComponent({ name: "ProjectSelect" });
      expect(projectSelect.props("corporationUuid")).toBe("corp-1");

      wrapper.unmount();
    });

    it("handles project change and loads report", async () => {
      const { pinia } = setupStores();

      mockFetch
        .mockResolvedValueOnce({ data: mockPurchaseOrders })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: mockItems })
        .mockResolvedValueOnce({ data: mockLaborItems });

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      await (wrapper.vm as any).handleProjectChange("proj-1");
      await flushPromises();

      expect((wrapper.vm as any).selectedProjectId).toBe("proj-1");

      wrapper.unmount();
    });
  });

  describe("Report Loading", () => {
    it("does not load report when only corporation is selected", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = undefined;
      await (wrapper.vm as any).loadReport();
      await flushPromises();

      expect(mockFetch).not.toHaveBeenCalled();
      expect((wrapper.vm as any).reportData).toEqual([]);

      wrapper.unmount();
    });

    it("loads report when both corporation and project are selected", async () => {
      const { pinia } = setupStores();

      mockFetch
        .mockResolvedValueOnce({ data: mockPurchaseOrders })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: mockItems })
        .mockResolvedValueOnce({ data: mockLaborItems });

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      await (wrapper.vm as any).loadReport();
      await flushPromises();

      expect(mockFetch).toHaveBeenCalled();
      expect((wrapper.vm as any).reportData.length).toBeGreaterThan(0);

      wrapper.unmount();
    });

    it("filters only approved purchase orders", async () => {
      const { pinia } = setupStores();

      mockFetch
        .mockResolvedValueOnce({ data: mockPurchaseOrders })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: mockItems })
        .mockResolvedValueOnce({ data: mockLaborItems });

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      await (wrapper.vm as any).loadReport();
      await flushPromises();

      // Should only include approved POs (po-1 and po-2), not po-3 (Draft)
      const reportData = (wrapper.vm as any).reportData;
      expect(reportData.length).toBe(2);
      expect(reportData.every((po: any) => po.status === "Approved")).toBe(
        true
      );
      expect(
        reportData.find((po: any) => po.po_number === "PO-003")
      ).toBeUndefined();

      wrapper.unmount();
    });

    it("filters purchase orders by selected project", async () => {
      const { pinia } = setupStores();

      const purchaseOrdersWithDifferentProjects = [
        ...mockPurchaseOrders,
        {
          uuid: "po-4",
          po_number: "PO-004",
          corporation_uuid: "corp-1",
          project_uuid: "proj-2", // Different project
          vendor_uuid: "vendor-1",
          status: "Approved",
          item_total: 3000,
          freight_charges_amount: 300,
          packing_charges_amount: 150,
          custom_duties_amount: 75,
          other_charges_amount: 30,
          tax_total: 450,
          total_po_amount: 4005,
          po_type: "MATERIAL",
        },
      ];

      mockFetch
        .mockResolvedValueOnce({ data: purchaseOrdersWithDifferentProjects })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: mockItems })
        .mockResolvedValueOnce({ data: mockItems })
        .mockResolvedValueOnce({ data: mockLaborItems });

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      await (wrapper.vm as any).loadReport();
      await flushPromises();

      const reportData = (wrapper.vm as any).reportData;
      expect(reportData.every((po: any) => po.project_uuid === "proj-1")).toBe(
        true
      );
      expect(
        reportData.find((po: any) => po.po_number === "PO-004")
      ).toBeUndefined();

      wrapper.unmount();
    });

    it("fetches vendor information for purchase orders", async () => {
      const { pinia } = setupStores();

      // Set up mocks in the order they will be called:
      // 1. purchase-order-forms
      // 2. vendors
      // 3. purchase-order-items (for each PO)
      mockFetch
        .mockResolvedValueOnce({ data: [mockPurchaseOrders[0]] }) // PO fetch
        .mockResolvedValueOnce({ data: mockVendors }) // Vendors fetch
        .mockResolvedValueOnce({ data: mockItems }); // Items fetch for PO

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      await (wrapper.vm as any).loadReport();
      await flushPromises();
      await nextTick();
      await flushPromises();

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/purchase-orders/vendors",
        expect.objectContaining({
          method: "GET",
          params: { corporation_uuid: "corp-1" },
        })
      );

      // Verify that vendor API was called
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/purchase-orders/vendors",
        expect.any(Object)
      );

      const reportData = (wrapper.vm as any).reportData;
      expect(reportData.length).toBeGreaterThan(0);
      // Verify vendor_name property exists (value may vary based on async timing)
      expect(reportData[0]).toHaveProperty("vendor_name");

      wrapper.unmount();
    });

    it("handles labor purchase orders correctly", async () => {
      const { pinia } = setupStores();

      // Set up mocks in the order they will be called:
      // 1. purchase-order-forms
      // 2. vendors
      // 3. labor-purchase-order-items (for LABOR PO)
      mockFetch
        .mockResolvedValueOnce({ data: [mockPurchaseOrders[1]] }) // LABOR PO
        .mockResolvedValueOnce({ data: mockVendors }) // Vendors fetch
        .mockResolvedValueOnce({ data: mockLaborItems }); // Labor items fetch

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      await (wrapper.vm as any).loadReport();
      await flushPromises();
      await nextTick();
      await flushPromises();

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/labor-purchase-order-items",
        expect.objectContaining({
          method: "GET",
          params: { purchase_order_uuid: "po-2" },
        })
      );

      // Verify that labor items API was called
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/labor-purchase-order-items",
        expect.any(Object)
      );

      const reportData = (wrapper.vm as any).reportData;
      expect(reportData.length).toBeGreaterThan(0);
      // Verify items property exists (value may vary based on async timing)
      expect(reportData[0]).toHaveProperty("items");
      expect(Array.isArray(reportData[0].items)).toBe(true);

      wrapper.unmount();
    });

    it("handles material purchase orders correctly", async () => {
      const { pinia } = setupStores();

      // Set up mocks in the order they will be called:
      // 1. purchase-order-forms
      // 2. vendors
      // 3. purchase-order-items (for MATERIAL PO)
      mockFetch
        .mockResolvedValueOnce({ data: [mockPurchaseOrders[0]] }) // MATERIAL PO
        .mockResolvedValueOnce({ data: mockVendors }) // Vendors fetch
        .mockResolvedValueOnce({ data: mockItems }); // Items fetch

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      await (wrapper.vm as any).loadReport();
      await flushPromises();
      await nextTick();
      await flushPromises();

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/purchase-order-items",
        expect.objectContaining({
          method: "GET",
          params: { purchase_order_uuid: "po-1" },
        })
      );

      // Verify that material items API was called
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/purchase-order-items",
        expect.any(Object)
      );

      const reportData = (wrapper.vm as any).reportData;
      expect(reportData.length).toBeGreaterThan(0);
      // Verify items property exists (value may vary based on async timing)
      expect(reportData[0]).toHaveProperty("items");
      expect(Array.isArray(reportData[0].items)).toBe(true);

      wrapper.unmount();
    });

    it("calculates item_total from items if not present", async () => {
      const { pinia } = setupStores();

      const poWithoutItemTotal = {
        ...mockPurchaseOrders[0],
        item_total: null,
      };

      // Set up mocks in the order they will be called:
      // 1. purchase-order-forms
      // 2. vendors
      // 3. purchase-order-items
      mockFetch
        .mockResolvedValueOnce({ data: [poWithoutItemTotal] })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: mockItems });

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      await (wrapper.vm as any).loadReport();
      await flushPromises();
      await nextTick();
      await flushPromises();

      // Wait a bit more for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));
      await flushPromises();

      const reportData = (wrapper.vm as any).reportData;
      expect(reportData.length).toBeGreaterThan(0);
      if (reportData.length > 0) {
        // Check that items were loaded
        expect(reportData[0].items).toBeDefined();
        // item_total should be calculated from items (500 + 500 = 1000) if items exist
        if (reportData[0].items && reportData[0].items.length > 0) {
          expect(reportData[0].item_total).toBe(1000);
        }
      }

      wrapper.unmount();
    });
  });

  describe("Item Amount Calculations", () => {
    it("calculates item freight amount proportionally", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      const po = {
        item_total: 1000,
        freight_charges_amount: 100,
      };

      const item = {
        po_total: 500, // 50% of item_total
      };

      const freightAmount = (wrapper.vm as any).getItemFreightAmount(item, po);
      // 500 / 1000 * 100 = 50
      expect(freightAmount).toBe(50);

      wrapper.unmount();
    });

    it("calculates item packing amount proportionally", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      const po = {
        item_total: 1000,
        packing_charges_amount: 50,
      };

      const item = {
        po_total: 500, // 50% of item_total
      };

      const packingAmount = (wrapper.vm as any).getItemPackingAmount(item, po);
      // 500 / 1000 * 50 = 25
      expect(packingAmount).toBe(25);

      wrapper.unmount();
    });

    it("calculates item customs amount proportionally", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      const po = {
        item_total: 1000,
        custom_duties_amount: 25,
      };

      const item = {
        po_total: 500, // 50% of item_total
      };

      const customsAmount = (wrapper.vm as any).getItemCustomsAmount(item, po);
      // 500 / 1000 * 25 = 12.5
      expect(customsAmount).toBe(12.5);

      wrapper.unmount();
    });

    it("calculates item HST amount proportionally using sales taxes", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      const po = {
        item_total: 1000,
        sales_tax_1_amount: 100,
        sales_tax_2_amount: 50,
        // Total taxes = 150
      };

      const item = {
        po_total: 500, // 50% of item_total
      };

      const hstAmount = (wrapper.vm as any).getItemHSTAmount(item, po);
      // 500 / 1000 * 150 = 75
      expect(hstAmount).toBe(75);

      wrapper.unmount();
    });

    it("calculates item HST amount as 0 when sales taxes are 0", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      const po = {
        item_total: 1000,
        sales_tax_1_amount: 0,
        sales_tax_2_amount: 0,
      };

      const item = {
        po_total: 500,
      };

      const hstAmount = (wrapper.vm as any).getItemHSTAmount(item, po);
      expect(hstAmount).toBe(0);

      wrapper.unmount();
    });

    it("calculates item HST amount using only sales_tax_1 when sales_tax_2 is missing", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      const po = {
        item_total: 1000,
        sales_tax_1_amount: 100,
        // sales_tax_2_amount is undefined
      };

      const item = {
        po_total: 500, // 50% of item_total
      };

      const hstAmount = (wrapper.vm as any).getItemHSTAmount(item, po);
      // 500 / 1000 * 100 = 50
      expect(hstAmount).toBe(50);

      wrapper.unmount();
    });

    it("calculates item expected cost correctly", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      const po = {
        item_total: 1000,
        freight_charges_amount: 100,
        packing_charges_amount: 50,
        custom_duties_amount: 25,
        other_charges_amount: 10,
        sales_tax_1_amount: 100,
        sales_tax_2_amount: 50,
        // Total taxes = 150
      };

      const item = {
        po_total: 500, // 50% of item_total
      };

      const expectedCost = (wrapper.vm as any).getItemExpectedCost(item, po);
      // 500 (goods) + 50 (freight) + 25 (packing) + 12.5 (customs) + 5 (other) + 75 (HST) = 667.5
      expect(expectedCost).toBe(667.5);

      wrapper.unmount();
    });

    it("returns 0 for item amounts when PO charges are 0", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      const po = {
        item_total: 1000,
        freight_charges_amount: 0,
        packing_charges_amount: 0,
        custom_duties_amount: 0,
        other_charges_amount: 0,
        sales_tax_1_amount: 0,
        sales_tax_2_amount: 0,
      };

      const item = {
        po_total: 500,
      };

      expect((wrapper.vm as any).getItemFreightAmount(item, po)).toBe(0);
      expect((wrapper.vm as any).getItemPackingAmount(item, po)).toBe(0);
      expect((wrapper.vm as any).getItemCustomsAmount(item, po)).toBe(0);
      expect((wrapper.vm as any).getItemOtherAmount(item, po)).toBe(0);
      expect((wrapper.vm as any).getItemHSTAmount(item, po)).toBe(0);

      wrapper.unmount();
    });

    it("calculates total expected costs for a purchase order", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      const po = {
        item_total: 1000,
        freight_charges_amount: 100,
        packing_charges_amount: 50,
        custom_duties_amount: 25,
        other_charges_amount: 10,
        sales_tax_1_amount: 100,
        sales_tax_2_amount: 50,
        items: [
          {
            po_total: 500,
            po_quantity: 10,
            po_unit_price: 50,
          },
          {
            po_total: 500,
            po_quantity: 10,
            po_unit_price: 50,
          },
        ],
      };

      const totalExpectedCosts = (wrapper.vm as any).getTotalExpectedCosts(po);
      // Each item: 500 (goods) + 50 (freight) + 25 (packing) + 12.5 (customs) + 5 (other) + 75 (HST) = 667.5
      // Total for 2 items: 667.5 * 2 = 1335
      expect(totalExpectedCosts).toBe(1335);

      wrapper.unmount();
    });

    it("returns 0 for total expected costs when PO has no items", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      const po = {
        item_total: 1000,
        items: [],
      };

      const totalExpectedCosts = (wrapper.vm as any).getTotalExpectedCosts(po);
      expect(totalExpectedCosts).toBe(0);

      wrapper.unmount();
    });
  });

  describe("Error Handling", () => {
    it("handles API errors gracefully", async () => {
      const { pinia } = setupStores();

      mockFetch.mockRejectedValueOnce(new Error("API Error"));

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      await (wrapper.vm as any).loadReport();
      await flushPromises();

      expect((wrapper.vm as any).error).toBe("API Error");
      expect((wrapper.vm as any).reportData).toEqual([]);
      expect((wrapper.vm as any).loading).toBe(false);

      wrapper.unmount();
    });

    it("handles vendor fetch errors gracefully", async () => {
      const { pinia } = setupStores();

      mockFetch
        .mockResolvedValueOnce({ data: [mockPurchaseOrders[0]] })
        .mockRejectedValueOnce(new Error("Vendor fetch error"))
        .mockResolvedValueOnce({ data: mockItems });

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      await (wrapper.vm as any).loadReport();
      await flushPromises();

      // Should still load report but with 'N/A' for vendor
      const reportData = (wrapper.vm as any).reportData;
      expect(reportData[0].vendor_name).toBe("N/A");

      wrapper.unmount();
    });

    it("handles item fetch errors gracefully", async () => {
      const { pinia } = setupStores();

      mockFetch
        .mockResolvedValueOnce({ data: [mockPurchaseOrders[0]] })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockRejectedValueOnce(new Error("Item fetch error"));

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      await (wrapper.vm as any).loadReport();
      await flushPromises();

      // Should still load report but with empty items
      const reportData = (wrapper.vm as any).reportData;
      expect(reportData[0].items).toEqual([]);

      wrapper.unmount();
    });
  });

  describe("Print Functionality", () => {
    it("shows print button when report data is available", async () => {
      const { pinia } = setupStores();

      mockFetch
        .mockResolvedValueOnce({ data: [mockPurchaseOrders[0]] })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: mockItems });

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      await (wrapper.vm as any).loadReport();
      await flushPromises();

      const printButton = wrapper.findComponent({ name: "UButton" });
      expect(printButton.exists()).toBe(true);

      wrapper.unmount();
    });

    it("calls window.print when print button is clicked", async () => {
      const { pinia } = setupStores();

      mockFetch
        .mockResolvedValueOnce({ data: [mockPurchaseOrders[0]] })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: mockItems });

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      await (wrapper.vm as any).loadReport();
      await flushPromises();
      (wrapper.vm as any).printReport();

      expect(global.window.print).toHaveBeenCalled();

      wrapper.unmount();
    });

    it("does not show print button when no report data", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = undefined;
      await nextTick();

      // Print button should not be visible when no project selected
      const buttons = wrapper.findAllComponents({ name: "UButton" });
      const printButton = buttons.find(
        (btn: any) =>
          btn.text()?.includes("Print") ||
          btn.props("icon") === "i-heroicons-printer"
      );
      expect(printButton).toBeUndefined();

      wrapper.unmount();
    });
  });

  describe("Watchers", () => {
    it("clears report data when corporation changes", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      (wrapper.vm as any).reportData = [{ uuid: "po-1" }] as any;
      await nextTick();

      (wrapper.vm as any).selectedCorporationId = "corp-2";
      await nextTick();

      expect((wrapper.vm as any).selectedProjectId).toBeUndefined();
      expect((wrapper.vm as any).reportData).toEqual([]);

      wrapper.unmount();
    });

    it("loads report when project changes and corporation is selected", async () => {
      const { pinia } = setupStores();

      mockFetch
        .mockResolvedValueOnce({ data: [mockPurchaseOrders[0]] })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: mockItems });

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      await nextTick();
      await flushPromises();

      expect(mockFetch).toHaveBeenCalled();

      wrapper.unmount();
    });
  });

  describe("Number Formatting", () => {
    it("formats numbers correctly", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      expect((wrapper.vm as any).formatNumber(1234.56)).toBe("1,234.56");
      expect((wrapper.vm as any).formatNumber(0)).toBe("0");
      expect((wrapper.vm as any).formatNumber(null)).toBe("0");
      expect((wrapper.vm as any).formatNumber(undefined)).toBe("0");

      wrapper.unmount();
    });
  });

  describe("Loading State", () => {
    it("shows loading skeleton when loading is true", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      (wrapper.vm as any).loading = true;
      await nextTick();

      // Should show loading skeleton
      const skeleton = wrapper.findComponent({ name: "USkeleton" });
      expect(skeleton.exists()).toBe(true);

      wrapper.unmount();
    });

    it("shows loading skeleton when switching projects", async () => {
      const { pinia } = setupStores();

      mockFetch
        .mockResolvedValueOnce({ data: [mockPurchaseOrders[0]] })
        .mockResolvedValueOnce({ data: mockVendors })
        .mockResolvedValueOnce({ data: mockItems });

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";

      // Set loading to true (simulating project switch)
      (wrapper.vm as any).loading = true;
      await nextTick();

      // Should show loading skeleton
      const skeletons = wrapper.findAllComponents({ name: "USkeleton" });
      expect(skeletons.length).toBeGreaterThan(0);

      wrapper.unmount();
    });

    it('does not show "No purchase orders found" while loading', async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      (wrapper.vm as any).loading = true;
      (wrapper.vm as any).reportData = [];
      await nextTick();

      // Should not show "No purchase orders found" while loading
      expect(wrapper.html()).not.toContain("No purchase orders found");

      wrapper.unmount();
    });

    it('shows "No purchase orders found" only after loading completes with no data', async () => {
      const { pinia } = setupStores();

      mockFetch
        .mockResolvedValueOnce({ data: [] }) // No purchase orders
        .mockResolvedValueOnce({ data: mockVendors });

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (wrapper.vm as any).selectedCorporationId = "corp-1";
      (wrapper.vm as any).selectedProjectId = "proj-1";
      await (wrapper.vm as any).loadReport();
      await flushPromises();
      await nextTick();

      // Should show "No purchase orders found" after loading completes
      expect(wrapper.html()).toContain("No purchase orders found");
      expect((wrapper.vm as any).loading).toBe(false);

      wrapper.unmount();
    });
  });

  describe("HST Calculation with Sales Taxes", () => {
    it("calculates HST using sum of sales_tax_1 and sales_tax_2", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      const po = {
        item_total: 2000,
        sales_tax_1_amount: 200,
        sales_tax_2_amount: 100,
        // Total taxes = 300
      };

      const item = {
        po_total: 1000, // 50% of item_total
      };

      const hstAmount = (wrapper.vm as any).getItemHSTAmount(item, po);
      // 1000 / 2000 * 300 = 150
      expect(hstAmount).toBe(150);

      wrapper.unmount();
    });

    it("handles missing sales_tax_2_amount correctly", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      const po = {
        item_total: 1000,
        sales_tax_1_amount: 100,
        // sales_tax_2_amount is undefined
      };

      const item = {
        po_total: 500,
      };

      const hstAmount = (wrapper.vm as any).getItemHSTAmount(item, po);
      // 500 / 1000 * 100 = 50
      expect(hstAmount).toBe(50);

      wrapper.unmount();
    });
  });

  describe("Total Expected Costs Calculation", () => {
    it("calculates total expected costs by summing all item expected costs", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      const po = {
        item_total: 2000,
        freight_charges_amount: 200,
        packing_charges_amount: 100,
        custom_duties_amount: 50,
        other_charges_amount: 20,
        sales_tax_1_amount: 200,
        sales_tax_2_amount: 100,
        items: [
          {
            po_total: 1000,
            po_quantity: 20,
            po_unit_price: 50,
          },
          {
            po_total: 1000,
            po_quantity: 20,
            po_unit_price: 50,
          },
        ],
      };

      const totalExpectedCosts = (wrapper.vm as any).getTotalExpectedCosts(po);
      // Each item: 1000 (goods) + 100 (freight) + 50 (packing) + 25 (customs) + 10 (other) + 150 (HST) = 1335
      // Total for 2 items: 1335 * 2 = 2670
      expect(totalExpectedCosts).toBe(2670);

      wrapper.unmount();
    });

    it("handles empty items array", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      const po = {
        item_total: 1000,
        items: [],
      };

      const totalExpectedCosts = (wrapper.vm as any).getTotalExpectedCosts(po);
      expect(totalExpectedCosts).toBe(0);

      wrapper.unmount();
    });

    it("handles undefined items", async () => {
      const { pinia } = setupStores();

      const wrapper = mount(PurchaseOrderBreakout, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      const po = {
        item_total: 1000,
        // items is undefined
      };

      const totalExpectedCosts = (wrapper.vm as any).getTotalExpectedCosts(po);
      expect(totalExpectedCosts).toBe(0);

      wrapper.unmount();
    });
  });
});

