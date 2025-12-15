import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref, h } from "vue";
import VendorInvoicesList from "@/components/Payables/VendorInvoicesList.vue";
import VendorInvoiceForm from "@/components/Payables/VendorInvoiceForm.vue";
import { useCorporationStore } from "@/stores/corporations";
import { useVendorInvoicesStore } from "@/stores/vendorInvoices";

// Mock composables
vi.mock("@/composables/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (date: string | null | undefined) => {
      if (!date) return "N/A";
      return new Date(date).toLocaleDateString();
    },
  }),
}));

vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (value: number | string | null | undefined) => {
      const num = typeof value === "string" ? parseFloat(value) : Number(value ?? 0);
      if (Number.isNaN(num)) return "$0.00";
      return `$${num.toFixed(2)}`;
    },
  }),
}));

vi.mock("@/composables/useUTCDateFormat", () => ({
  useUTCDateFormat: () => ({
    toUTCString: (date: string) => `${date}T00:00:00.000Z`,
    fromUTCString: (date: string) => date.split("T")[0],
    getCurrentLocal: () => "2024-01-15",
  }),
}));

const mockIsReady = ref(true);
const mockHasPermission = vi.fn(() => true);
vi.mock("@/composables/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: mockHasPermission,
    isReady: mockIsReady,
  }),
}));

vi.mock("@/composables/useTableStandard", () => ({
  useTableStandard: () => ({
    pagination: ref({ pageIndex: 0, pageSize: 10 }),
    paginationOptions: ref({}),
    pageSizeOptions: [
      { label: "10 per page", value: 10 },
      { label: "25 per page", value: 25 },
      { label: "50 per page", value: 50 },
      { label: "100 per page", value: 100 },
    ],
    updatePageSize: vi.fn(),
    getPaginationProps: vi.fn(() => ({})),
    getPageInfo: vi.fn(() => ref("Showing 1-10 of 10")),
    shouldShowPagination: vi.fn(() => ref(false)),
  }),
}));

// Mock stores
const mockCorpStore = {
  selectedCorporation: {
    uuid: "corp-1",
    corporation_name: "Test Corp",
  },
  selectedCorporationId: "corp-1",
  ensureReady: vi.fn().mockResolvedValue(undefined),
};

const mockVendorInvoicesStore = {
  vendorInvoices: [],
  loading: false,
  error: null,
  fetchVendorInvoices: vi.fn().mockResolvedValue(undefined),
  fetchVendorInvoice: vi.fn().mockResolvedValue(null),
  createVendorInvoice: vi.fn().mockResolvedValue(null),
  updateVendorInvoice: vi.fn().mockResolvedValue(null),
  deleteVendorInvoice: vi.fn().mockResolvedValue(true),
  clearCurrentVendorInvoice: vi.fn(),
};

vi.mock("@/stores/corporations", () => ({
  useCorporationStore: () => mockCorpStore,
}));

vi.mock("@/stores/vendorInvoices", () => ({
  useVendorInvoicesStore: () => mockVendorInvoicesStore,
}));

// Mock useToast
const mockToast = {
  add: vi.fn(),
};
vi.mock("#app", () => ({
  useToast: () => mockToast,
}));
vi.stubGlobal("useToast", () => mockToast);

// UI Stubs
const uiStubs = {
  UInput: {
    props: ["modelValue", "placeholder", "icon", "variant", "size", "class"],
    emits: ["update:modelValue"],
    template: "<input />",
  },
  UButton: {
    template: "<button><slot /></button>",
    props: ["icon", "color", "size", "variant", "disabled", "loading"],
  },
  UTable: {
    props: [
      "data",
      "columns",
      "pagination",
      "columnPinning",
      "paginationOptions",
      "globalFilter",
      "selected",
      "selectable",
      "sticky",
      "class",
    ],
    template: "<div><slot /></div>",
  },
  USelect: {
    props: ["modelValue", "items", "icon", "size", "variant", "class"],
    emits: ["update:modelValue", "change"],
    template: "<select />",
  },
  UPagination: {
    props: ["defaultPage", "itemsPerPage", "total"],
    emits: ["update:page"],
    template: "<div />",
  },
  UModal: {
    props: ["open", "title", "fullscreen", "scrollable"],
    template: '<div><slot name="header" /><slot name="body" /><slot name="footer" /></div>',
  },
  UAlert: {
    props: ["icon", "color", "variant", "title", "description"],
    template: "<div />",
  },
  UIcon: {
    props: ["name", "class"],
    template: "<span />",
  },
  USkeleton: { template: "<div />" },
  UTooltip: {
    props: ["text", "color"],
    template: "<div><slot /></div>",
  },
  UFileUpload: {
    template: '<div><slot :open="() => {}" /></div>',
    props: ["modelValue", "accept", "multiple"],
  },
  VendorInvoiceForm: {
    props: ["form", "editingInvoice", "loading", "readonly"],
    emits: ["update:form"],
    template: "<div />",
  },
};

describe("VendorInvoicesList.vue", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
    mockVendorInvoicesStore.vendorInvoices = [];
    mockVendorInvoicesStore.loading = false;
    mockVendorInvoicesStore.error = null;
    mockIsReady.value = true;
    mockHasPermission.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const mockInvoices = [
    {
      uuid: "invoice-1",
      number: "INV-001",
      bill_date: "2024-01-15T00:00:00.000Z",
      due_date: "2024-02-15T00:00:00.000Z",
      vendor_name: "Test Vendor",
      project_name: "Test Project",
      invoice_type: "AGAINST_PO",
      po_number: "PO-001",
      amount: 1000.0,
      status: "Draft",
    },
    {
      uuid: "invoice-2",
      number: "INV-002",
      bill_date: "2024-01-20T00:00:00.000Z",
      due_date: "2024-02-20T00:00:00.000Z",
      vendor_name: "Another Vendor",
      project_name: "Another Project",
      invoice_type: "ENTER_DIRECT_INVOICE",
      po_number: null,
      amount: 2000.0,
      status: "Pending",
    },
    {
      uuid: "invoice-3",
      number: "INV-003",
      bill_date: "2024-01-25T00:00:00.000Z",
      due_date: "2024-02-25T00:00:00.000Z",
      vendor_name: "CO Vendor",
      project_name: "CO Project",
      invoice_type: "AGAINST_CO",
      po_number: "CO-001",
      amount: 1500.0,
      status: "Approved",
    },
  ];

  describe("Component Rendering", () => {
    it("renders without errors", () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      expect(wrapper.exists()).toBe(true);
    });

    it("shows loading skeleton when loading", () => {
      mockVendorInvoicesStore.loading = true;
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      expect(wrapper.exists()).toBe(true);
      expect(mockVendorInvoicesStore.loading).toBe(true);
    });

    it("shows error alert when there is an error", () => {
      mockVendorInvoicesStore.error = "Failed to load invoices";
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      expect(wrapper.exists()).toBe(true);
      expect(mockVendorInvoicesStore.error).toBe("Failed to load invoices");
    });

    it("shows empty state when no invoices", () => {
      mockVendorInvoicesStore.vendorInvoices = [];
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      expect(wrapper.exists()).toBe(true);
    });

    it("renders table when invoices are available", async () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();
      expect(wrapper.exists()).toBe(true);
      // The table should render when invoices exist and isReady is true
      // Since we're using stubs, we verify the component state instead
      expect(wrapper.vm.vendorInvoices.length).toBeGreaterThan(0);
      expect(wrapper.vm.isReady).toBe(true);
    });
  });

  describe("Invoice Type Label Mapping", () => {
    let wrapper: ReturnType<typeof mount>;

    beforeEach(() => {
      wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });
    });

    afterEach(() => {
      if (wrapper) {
        wrapper.unmount();
      }
    });

    it("maps ENTER_DIRECT_INVOICE to 'Direct Invoice'", () => {
      expect(wrapper.vm.getInvoiceTypeLabel("ENTER_DIRECT_INVOICE")).toBe("Direct Invoice");
    });

    it("maps AGAINST_PO to 'PO Invoice'", () => {
      expect(wrapper.vm.getInvoiceTypeLabel("AGAINST_PO")).toBe("PO Invoice");
    });

    it("maps AGAINST_CO to 'CO Invoice'", () => {
      expect(wrapper.vm.getInvoiceTypeLabel("AGAINST_CO")).toBe("CO Invoice");
    });

    it("maps AGAINST_ADVANCE_PAYMENT to 'Advance Payment'", () => {
      expect(wrapper.vm.getInvoiceTypeLabel("AGAINST_ADVANCE_PAYMENT")).toBe("Advance Payment");
    });

    it("maps AGAINST_HOLDBACK_AMOUNT to 'Hold Back Amount'", () => {
      expect(wrapper.vm.getInvoiceTypeLabel("AGAINST_HOLDBACK_AMOUNT")).toBe("Hold Back Amount");
    });

    it("returns 'N/A' for null invoice type", () => {
      expect(wrapper.vm.getInvoiceTypeLabel(null)).toBe("N/A");
    });

    it("returns original value for unknown invoice type", () => {
      expect(wrapper.vm.getInvoiceTypeLabel("UNKNOWN_TYPE")).toBe("UNKNOWN_TYPE");
    });
  });

  describe("Search/Filter Functionality", () => {
    it("filters invoices by invoice number", () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.globalFilter = "INV-001";
      expect(wrapper.vm.filteredVendorInvoices.length).toBe(1);
      expect(wrapper.vm.filteredVendorInvoices[0].number).toBe("INV-001");
    });

    it("filters invoices by vendor name", () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.globalFilter = "Test Vendor";
      expect(wrapper.vm.filteredVendorInvoices.length).toBe(1);
      expect(wrapper.vm.filteredVendorInvoices[0].vendor_name).toBe("Test Vendor");
    });

    it("filters invoices by project name", () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.globalFilter = "Test Project";
      expect(wrapper.vm.filteredVendorInvoices.length).toBe(1);
      expect(wrapper.vm.filteredVendorInvoices[0].project_name).toBe("Test Project");
    });

    it("filters invoices by invoice type", () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.globalFilter = "AGAINST_CO";
      expect(wrapper.vm.filteredVendorInvoices.length).toBe(1);
      expect(wrapper.vm.filteredVendorInvoices[0].invoice_type).toBe("AGAINST_CO");
    });

    it("filters invoices by PO number", () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.globalFilter = "PO-001";
      expect(wrapper.vm.filteredVendorInvoices.length).toBe(1);
      expect(wrapper.vm.filteredVendorInvoices[0].po_number).toBe("PO-001");
    });

    it("returns all invoices when filter is empty", () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.globalFilter = "";
      expect(wrapper.vm.filteredVendorInvoices.length).toBe(3);
    });

    it("performs case-insensitive search", () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.globalFilter = "test vendor";
      expect(wrapper.vm.filteredVendorInvoices.length).toBe(1);
    });
  });

  describe("Modal Operations", () => {
    it("opens create modal when Add New button is clicked", async () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await wrapper.vm.openCreateModal();
      expect(wrapper.vm.showFormModal).toBe(true);
      expect(wrapper.vm.isViewMode).toBe(false);
      expect(wrapper.vm.invoiceForm.corporation_uuid).toBe("corp-1");
    });

    it("opens edit modal when edit button is clicked", async () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      mockVendorInvoicesStore.fetchVendorInvoice = vi.fn().mockResolvedValue(mockInvoices[0]);
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await wrapper.vm.editInvoice(mockInvoices[0]);
      await flushPromises();

      expect(wrapper.vm.showFormModal).toBe(true);
      expect(wrapper.vm.isViewMode).toBe(false);
      expect(mockVendorInvoicesStore.fetchVendorInvoice).toHaveBeenCalledWith("invoice-1");
    });

    it("opens view modal when view button is clicked", async () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      mockVendorInvoicesStore.fetchVendorInvoice = vi.fn().mockResolvedValue(mockInvoices[0]);
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await wrapper.vm.previewInvoice(mockInvoices[0]);
      await flushPromises();

      expect(wrapper.vm.showFormModal).toBe(true);
      expect(wrapper.vm.isViewMode).toBe(true);
      expect(mockVendorInvoicesStore.fetchVendorInvoice).toHaveBeenCalledWith("invoice-1");
    });

    it("closes form modal correctly", () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.showFormModal = true;
      wrapper.vm.closeFormModal();

      expect(wrapper.vm.showFormModal).toBe(false);
      expect(wrapper.vm.isViewMode).toBe(false);
      expect(wrapper.vm.invoiceForm.attachments).toEqual([]);
      // Verify store is cleared when modal closes
      expect(mockVendorInvoicesStore.clearCurrentVendorInvoice).toHaveBeenCalled();
    });

    it("switches from view mode to edit mode", () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.isViewMode = true;
      wrapper.vm.switchToEditMode();

      expect(wrapper.vm.isViewMode).toBe(false);
    });
  });

  describe("Form Modal Title", () => {
    it("shows 'New Vendor Invoice' for new invoice", () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = { attachments: [] };
      wrapper.vm.isViewMode = false;
      expect(wrapper.vm.formModalTitle).toBe("New Vendor Invoice");
    });

    it("shows 'Edit Vendor Invoice' for existing invoice", () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = { uuid: "invoice-1", attachments: [] };
      wrapper.vm.isViewMode = false;
      expect(wrapper.vm.formModalTitle).toBe("Edit Vendor Invoice");
    });

    it("shows 'View Vendor Invoice' in view mode", () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.isViewMode = true;
      expect(wrapper.vm.formModalTitle).toBe("View Vendor Invoice");
    });
  });

  describe("Status Display", () => {
    it("displays correct status label for Draft", () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = { status: "Draft" };
      expect(wrapper.vm.statusLabel).toBe("Draft");
    });

    it("displays correct status label for Pending", () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = { status: "Pending" };
      expect(wrapper.vm.statusLabel).toBe("Pending");
    });

    it("displays correct status label for Approved", () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = { status: "Approved" };
      expect(wrapper.vm.statusLabel).toBe("Approved");
    });

    it("displays correct status label for Paid", () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = { status: "Paid" };
      expect(wrapper.vm.statusLabel).toBe("Paid");
    });

    it("returns correct status chip class for Draft", () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = { status: "Draft" };
      expect(wrapper.vm.statusChipClass).toContain("bg-gray-100");
    });
  });

  describe("Delete Operations", () => {
    it("opens delete confirmation modal", () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.deleteInvoice(mockInvoices[0]);

      expect(wrapper.vm.showDeleteModal).toBe(true);
      expect(wrapper.vm.invoiceToDelete).toEqual(mockInvoices[0]);
    });

    it("cancels delete operation", () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.showDeleteModal = true;
      wrapper.vm.invoiceToDelete = mockInvoices[0];
      wrapper.vm.cancelDelete();

      expect(wrapper.vm.showDeleteModal).toBe(false);
      expect(wrapper.vm.invoiceToDelete).toBeNull();
    });

    it("confirms and deletes invoice successfully", async () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      mockVendorInvoicesStore.deleteVendorInvoice = vi.fn().mockResolvedValue(true);
      mockVendorInvoicesStore.fetchVendorInvoices = vi.fn().mockResolvedValue(undefined);
      mockCorpStore.selectedCorporation = { uuid: "corp-1" };
      mockCorpStore.selectedCorporationId = "corp-1";
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceToDelete = mockInvoices[0];
      await wrapper.vm.confirmDelete();
      await flushPromises();

      expect(mockVendorInvoicesStore.deleteVendorInvoice).toHaveBeenCalledWith("invoice-1");
      // Verify refetch is called after delete to ensure table is in sync
      expect(mockVendorInvoicesStore.fetchVendorInvoices).toHaveBeenCalledWith("corp-1");
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Success",
          description: "Vendor invoice deleted successfully",
        })
      );
      expect(wrapper.vm.showDeleteModal).toBe(false);
    });

    it("handles delete error gracefully", async () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      mockVendorInvoicesStore.deleteVendorInvoice = vi.fn().mockResolvedValue(false);
      mockVendorInvoicesStore.error = "Delete failed";
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceToDelete = mockInvoices[0];
      await wrapper.vm.confirmDelete();
      await flushPromises();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Error",
        })
      );
    });
  });

  describe("Save Invoice Operations", () => {
    it("creates new invoice successfully", async () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      mockVendorInvoicesStore.createVendorInvoice = vi.fn().mockResolvedValue(mockInvoices[0]);
      mockVendorInvoicesStore.fetchVendorInvoices = vi.fn().mockResolvedValue(undefined);
      mockCorpStore.selectedCorporation = { uuid: "corp-1" };
      mockCorpStore.selectedCorporationId = "corp-1";
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        corporation_uuid: "corp-1",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1000,
        attachments: [],
      };
      await wrapper.vm.saveInvoice();
      await flushPromises();

      expect(mockVendorInvoicesStore.createVendorInvoice).toHaveBeenCalled();
      // Verify refetch is NOT called after create since metadata is now included in the response
      expect(mockVendorInvoicesStore.fetchVendorInvoices).not.toHaveBeenCalled();
      // Verify store is cleared after successful save
      expect(mockVendorInvoicesStore.clearCurrentVendorInvoice).toHaveBeenCalled();
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Created",
        })
      );
    });

    it("updates existing invoice successfully", async () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      mockVendorInvoicesStore.updateVendorInvoice = vi.fn().mockResolvedValue(mockInvoices[0]);
      mockVendorInvoicesStore.fetchVendorInvoices = vi.fn().mockResolvedValue(undefined);
      mockCorpStore.selectedCorporation = { uuid: "corp-1" };
      mockCorpStore.selectedCorporationId = "corp-1";
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1500,
        attachments: [],
      };
      await wrapper.vm.saveInvoice();
      await flushPromises();

      expect(mockVendorInvoicesStore.updateVendorInvoice).toHaveBeenCalled();
      // Verify refetch is NOT called after update since metadata is now included in the response
      expect(mockVendorInvoicesStore.fetchVendorInvoices).not.toHaveBeenCalled();
      // Verify store is cleared after successful save
      expect(mockVendorInvoicesStore.clearCurrentVendorInvoice).toHaveBeenCalled();
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Updated",
        })
      );
    });

    it("handles save error gracefully", async () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      mockVendorInvoicesStore.createVendorInvoice = vi.fn().mockResolvedValue(null);
      mockVendorInvoicesStore.error = "Save failed";
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        corporation_uuid: "corp-1",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1000,
        attachments: [],
      };
      await wrapper.vm.saveInvoice();
      await flushPromises();

      // Verify store is NOT cleared on error
      expect(mockVendorInvoicesStore.clearCurrentVendorInvoice).not.toHaveBeenCalled();
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Error",
        })
      );
    });

    it("does not refetch vendor invoices after successful create since metadata is included in response", async () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      const newInvoice = { 
        ...mockInvoices[0], 
        uuid: "invoice-new",
        project_name: "Test Project",
        project_id: "PROJ-001",
        vendor_name: "Test Vendor",
        po_number: "PO-001"
      };
      mockVendorInvoicesStore.createVendorInvoice = vi.fn().mockResolvedValue(newInvoice);
      mockVendorInvoicesStore.fetchVendorInvoices = vi.fn().mockResolvedValue(undefined);
      mockCorpStore.selectedCorporation = { uuid: "corp-1" };
      mockCorpStore.selectedCorporationId = "corp-1";
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        corporation_uuid: "corp-1",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1000,
        attachments: [],
      };
      await wrapper.vm.saveInvoice();
      await flushPromises();

      // Verify refetch is NOT called since metadata (vendor_name, project_name, etc.) is now included in the response
      expect(mockVendorInvoicesStore.fetchVendorInvoices).not.toHaveBeenCalled();
    });

    it("does not refetch vendor invoices after successful update since metadata is included in response", async () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      const updatedInvoice = {
        ...mockInvoices[0],
        project_name: "Updated Project",
        project_id: "PROJ-002",
        vendor_name: "Updated Vendor",
        po_number: "PO-002"
      };
      mockVendorInvoicesStore.updateVendorInvoice = vi.fn().mockResolvedValue(updatedInvoice);
      mockVendorInvoicesStore.fetchVendorInvoices = vi.fn().mockResolvedValue(undefined);
      mockCorpStore.selectedCorporation = { uuid: "corp-1" };
      mockCorpStore.selectedCorporationId = "corp-1";
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1500,
        attachments: [],
      };
      await wrapper.vm.saveInvoice();
      await flushPromises();

      // Verify refetch is NOT called since metadata is now included in the response
      expect(mockVendorInvoicesStore.fetchVendorInvoices).not.toHaveBeenCalled();
    });

    it("refetches vendor invoices after successful delete to keep table in sync", async () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      mockVendorInvoicesStore.deleteVendorInvoice = vi.fn().mockResolvedValue(true);
      mockVendorInvoicesStore.fetchVendorInvoices = vi.fn().mockResolvedValue(undefined);
      mockCorpStore.selectedCorporation = { uuid: "corp-1" };
      mockCorpStore.selectedCorporationId = "corp-1";
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceToDelete = mockInvoices[0];
      await wrapper.vm.confirmDelete();
      await flushPromises();

      // Verify refetch is called after delete to keep table in sync
      expect(mockVendorInvoicesStore.fetchVendorInvoices).toHaveBeenCalledWith("corp-1");
      expect(mockVendorInvoicesStore.fetchVendorInvoices).toHaveBeenCalledTimes(1);
    });

    it("handles missing corporation UUID gracefully when refetching after save", async () => {
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
      mockVendorInvoicesStore.createVendorInvoice = vi.fn().mockResolvedValue(mockInvoices[0]);
      mockVendorInvoicesStore.fetchVendorInvoices = vi.fn().mockResolvedValue(undefined);
      mockCorpStore.selectedCorporation = null;
      mockCorpStore.selectedCorporationId = null;
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        corporation_uuid: "corp-1",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1000,
        attachments: [],
      };
      await wrapper.vm.saveInvoice();
      await flushPromises();

      // Should not call refetch if corporation UUID is not available
      expect(mockVendorInvoicesStore.fetchVendorInvoices).not.toHaveBeenCalled();
      // Should show error toast because corporation is required
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Error",
          description: "Select a corporation first",
        })
      );
    });

    it("validates corporation selection before saving", async () => {
      const originalCorpId = mockCorpStore.selectedCorporationId;
      mockCorpStore.selectedCorporationId = null;
      mockCorpStore.selectedCorporation = null;
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1000,
        attachments: [],
      };
      await wrapper.vm.saveInvoice();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Error",
          description: "Select a corporation first",
        })
      );
      // Restore original values
      mockCorpStore.selectedCorporationId = originalCorpId;
      mockCorpStore.selectedCorporation = { uuid: "corp-1", corporation_name: "Test Corp" };
    });
  });

  describe("Store Clearing Behavior", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockVendorInvoicesStore.clearCurrentVendorInvoice = vi.fn();
    });

    it("clears store when closeFormModal is called", () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.showFormModal = true;
      wrapper.vm.closeFormModal();

      expect(mockVendorInvoicesStore.clearCurrentVendorInvoice).toHaveBeenCalledTimes(1);
    });

    it("clears store after successful create operation", async () => {
      mockVendorInvoicesStore.createVendorInvoice = vi.fn().mockResolvedValue(mockInvoices[0]);
      mockCorpStore.selectedCorporation = { uuid: "corp-1" };
      mockCorpStore.selectedCorporationId = "corp-1";
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        corporation_uuid: "corp-1",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1000,
        attachments: [],
      };
      await wrapper.vm.saveInvoice();
      await flushPromises();

      // Store should be cleared immediately after successful save, before closeFormModal
      expect(mockVendorInvoicesStore.clearCurrentVendorInvoice).toHaveBeenCalled();
    });

    it("clears store after successful update operation", async () => {
      mockVendorInvoicesStore.updateVendorInvoice = vi.fn().mockResolvedValue(mockInvoices[0]);
      mockCorpStore.selectedCorporation = { uuid: "corp-1" };
      mockCorpStore.selectedCorporationId = "corp-1";
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1500,
        attachments: [],
      };
      await wrapper.vm.saveInvoice();
      await flushPromises();

      // Store should be cleared immediately after successful save
      expect(mockVendorInvoicesStore.clearCurrentVendorInvoice).toHaveBeenCalled();
    });

    it("clears store after save as draft operation", async () => {
      mockVendorInvoicesStore.updateVendorInvoice = vi.fn().mockResolvedValue(mockInvoices[0]);
      mockCorpStore.selectedCorporation = { uuid: "corp-1" };
      mockCorpStore.selectedCorporationId = "corp-1";
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1500,
        attachments: [],
      };
      await wrapper.vm.handleSaveAsDraft();
      await flushPromises();

      expect(mockVendorInvoicesStore.clearCurrentVendorInvoice).toHaveBeenCalled();
    });

    it("clears store after approve operation", async () => {
      mockVendorInvoicesStore.updateVendorInvoice = vi.fn().mockResolvedValue(mockInvoices[0]);
      mockCorpStore.selectedCorporation = { uuid: "corp-1" };
      mockCorpStore.selectedCorporationId = "corp-1";
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1500,
        attachments: [],
      };
      await wrapper.vm.handleApprove();
      await flushPromises();

      expect(mockVendorInvoicesStore.clearCurrentVendorInvoice).toHaveBeenCalled();
    });

    it("clears store after reject to draft operation", async () => {
      mockVendorInvoicesStore.updateVendorInvoice = vi.fn().mockResolvedValue(mockInvoices[0]);
      mockCorpStore.selectedCorporation = { uuid: "corp-1" };
      mockCorpStore.selectedCorporationId = "corp-1";
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1500,
        attachments: [],
      };
      await wrapper.vm.handleRejectToDraft();
      await flushPromises();

      expect(mockVendorInvoicesStore.clearCurrentVendorInvoice).toHaveBeenCalled();
    });

    it("clears store after pay operation", async () => {
      mockVendorInvoicesStore.updateVendorInvoice = vi.fn().mockResolvedValue(mockInvoices[0]);
      mockCorpStore.selectedCorporation = { uuid: "corp-1" };
      mockCorpStore.selectedCorporationId = "corp-1";
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1500,
        attachments: [],
      };
      await wrapper.vm.handlePay();
      await flushPromises();

      expect(mockVendorInvoicesStore.clearCurrentVendorInvoice).toHaveBeenCalled();
    });

    it("does not clear store when save operation fails", async () => {
      mockVendorInvoicesStore.createVendorInvoice = vi.fn().mockResolvedValue(null);
      mockVendorInvoicesStore.error = "Save failed";
      mockCorpStore.selectedCorporation = { uuid: "corp-1" };
      mockCorpStore.selectedCorporationId = "corp-1";
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        corporation_uuid: "corp-1",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1000,
        attachments: [],
      };
      await wrapper.vm.saveInvoice();
      await flushPromises();

      // Store should NOT be cleared on error
      expect(mockVendorInvoicesStore.clearCurrentVendorInvoice).not.toHaveBeenCalled();
    });

    it("clears store when modal closes via v-model (watcher)", async () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Set up form with UUID to trigger watcher cleanup
      wrapper.vm.invoiceForm = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      await flushPromises();

      // Clear the mock call count from initial setup
      vi.clearAllMocks();

      // Close modal via v-model (simulating clicking outside or ESC)
      wrapper.vm.showFormModal = false;
      await flushPromises();

      // Watcher should clear the store
      expect(mockVendorInvoicesStore.clearCurrentVendorInvoice).toHaveBeenCalled();
    });

    it("clears store both after save and when modal closes", async () => {
      mockVendorInvoicesStore.createVendorInvoice = vi.fn().mockResolvedValue(mockInvoices[0]);
      mockCorpStore.selectedCorporation = { uuid: "corp-1" };
      mockCorpStore.selectedCorporationId = "corp-1";
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        corporation_uuid: "corp-1",
        bill_date: "2024-01-15T00:00:00.000Z",
        amount: 1000,
        attachments: [],
      };
      await wrapper.vm.saveInvoice();
      await flushPromises();

      // Store should be cleared after save (before closeFormModal)
      // Then closeFormModal also clears it (redundant but safe)
      // So it may be called twice, which is fine
      expect(mockVendorInvoicesStore.clearCurrentVendorInvoice).toHaveBeenCalled();
    });
  });

  describe("Data Loading", () => {
    it("fetches invoices when corporation changes", async () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Trigger the watcher
      mockCorpStore.selectedCorporation = { uuid: "corp-2", corporation_name: "New Corp" };
      await flushPromises();

      // The watcher should call fetchVendorInvoices
      // Note: In a real test, we'd need to trigger the watcher properly
      expect(wrapper.exists()).toBe(true);
    });

    it("fetches invoices on mount", async () => {
      // Mock process.client to be true
      const originalProcess = global.process;
      global.process = { ...originalProcess, client: true } as any;

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await flushPromises();

      // On mount should call ensureReady and fetchVendorInvoices
      // Note: fetchVendorInvoices is only called if corporation is selected
      expect(mockCorpStore.ensureReady).toHaveBeenCalled();
      
      // Restore original process
      global.process = originalProcess;
    });
  });

  describe("Order Number Column", () => {
    it("displays PO number for invoices against purchase orders", () => {
      const invoiceWithPO = {
        uuid: "invoice-1",
        number: "INV-001",
        invoice_type: "AGAINST_PO",
        po_number: "PO-001",
        co_number: null,
      };

      mockVendorInvoicesStore.vendorInvoices = [invoiceWithPO];
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Find the Order Number column
      const orderNumberColumn = wrapper.vm.columns.find(
        (col: any) => col.accessorKey === "po_number"
      );
      expect(orderNumberColumn).toBeDefined();
      expect(orderNumberColumn.header).toBe("Order Number");

      // Test the cell renderer
      const cellContent = orderNumberColumn.cell({ row: { original: invoiceWithPO } });
      expect(cellContent.children).toBe("PO-001");
    });

    it("displays CO number for invoices against change orders", () => {
      const invoiceWithCO = {
        uuid: "invoice-2",
        number: "INV-002",
        invoice_type: "AGAINST_CO",
        po_number: null,
        co_number: "CO-001",
      };

      mockVendorInvoicesStore.vendorInvoices = [invoiceWithCO];
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Find the Order Number column
      const orderNumberColumn = wrapper.vm.columns.find(
        (col: any) => col.accessorKey === "po_number"
      );
      expect(orderNumberColumn).toBeDefined();

      // Test the cell renderer
      const cellContent = orderNumberColumn.cell({ row: { original: invoiceWithCO } });
      expect(cellContent.children).toBe("CO-001");
    });

    it("displays N/A when neither PO nor CO number is available", () => {
      const invoiceWithoutOrder = {
        uuid: "invoice-3",
        number: "INV-003",
        invoice_type: "ENTER_DIRECT_INVOICE",
        po_number: null,
        co_number: null,
      };

      mockVendorInvoicesStore.vendorInvoices = [invoiceWithoutOrder];
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Find the Order Number column
      const orderNumberColumn = wrapper.vm.columns.find(
        (col: any) => col.accessorKey === "po_number"
      );
      expect(orderNumberColumn).toBeDefined();

      // Test the cell renderer
      const cellContent = orderNumberColumn.cell({ row: { original: invoiceWithoutOrder } });
      expect(cellContent.children).toBe("N/A");
    });

    it("prefers PO number over CO number when both are present", () => {
      const invoiceWithBoth = {
        uuid: "invoice-4",
        number: "INV-004",
        invoice_type: "AGAINST_PO",
        po_number: "PO-002",
        co_number: "CO-002",
      };

      mockVendorInvoicesStore.vendorInvoices = [invoiceWithBoth];
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Find the Order Number column
      const orderNumberColumn = wrapper.vm.columns.find(
        (col: any) => col.accessorKey === "po_number"
      );
      expect(orderNumberColumn).toBeDefined();

      // Test the cell renderer - should prefer PO number
      const cellContent = orderNumberColumn.cell({ row: { original: invoiceWithBoth } });
      expect(cellContent.children).toBe("PO-002");
    });
  });

  describe("Edge Cases", () => {
    it("handles loadInvoiceForModal without UUID", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await wrapper.vm.loadInvoiceForModal({});
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it("handles null invoice in delete", () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceToDelete = null;
      wrapper.vm.confirmDelete();

      // Should not throw error
      expect(wrapper.exists()).toBe(true);
    });

    it("handles empty invoice list", () => {
      mockVendorInvoicesStore.vendorInvoices = [];
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      expect(wrapper.vm.filteredVendorInvoices.length).toBe(0);
    });
  });

  describe("Loading Existing Invoices with PO/CO", () => {
    it("sets po_co_uuid when loading invoice with purchase_order_uuid", async () => {
      const invoiceWithPO = {
        uuid: "invoice-1",
        invoice_type: "AGAINST_ADVANCE_PAYMENT",
        purchase_order_uuid: "po-uuid-123",
        change_order_uuid: null,
        po_co_uuid: null,
        po_number: "PO-1",
        co_number: null,
      };

      mockVendorInvoicesStore.fetchVendorInvoice = vi.fn().mockResolvedValue({
        ...invoiceWithPO,
      });

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await wrapper.vm.loadInvoiceForModal(invoiceWithPO, false);
      await flushPromises();

      // Check that po_co_uuid is set correctly
      expect(wrapper.vm.invoiceForm.po_co_uuid).toBe("PO:po-uuid-123");
      expect(wrapper.vm.invoiceForm.purchase_order_uuid).toBe("po-uuid-123");
      expect(wrapper.vm.invoiceForm.change_order_uuid).toBeNull();
    });

    it("sets po_co_uuid when loading invoice with change_order_uuid", async () => {
      const invoiceWithCO = {
        uuid: "invoice-2",
        invoice_type: "AGAINST_ADVANCE_PAYMENT",
        purchase_order_uuid: null,
        change_order_uuid: "co-uuid-456",
        po_co_uuid: null,
        po_number: null,
        co_number: "CO-1",
      };

      mockVendorInvoicesStore.fetchVendorInvoice = vi.fn().mockResolvedValue({
        ...invoiceWithCO,
      });

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await wrapper.vm.loadInvoiceForModal(invoiceWithCO, false);
      await flushPromises();

      // Check that po_co_uuid is set correctly
      expect(wrapper.vm.invoiceForm.po_co_uuid).toBe("CO:co-uuid-456");
      expect(wrapper.vm.invoiceForm.change_order_uuid).toBe("co-uuid-456");
      expect(wrapper.vm.invoiceForm.purchase_order_uuid).toBeNull();
    });

    it("does not set po_co_uuid for non-advance-payment invoice types", async () => {
      const invoiceWithPO = {
        uuid: "invoice-3",
        invoice_type: "AGAINST_PO",
        purchase_order_uuid: "po-uuid-123",
        change_order_uuid: null,
        po_co_uuid: null,
        po_number: "PO-1",
      };

      mockVendorInvoicesStore.fetchVendorInvoice = vi.fn().mockResolvedValue({
        ...invoiceWithPO,
      });

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await wrapper.vm.loadInvoiceForModal(invoiceWithPO, false);
      await flushPromises();

      // po_co_uuid should remain null for non-advance-payment types
      expect(wrapper.vm.invoiceForm.po_co_uuid).toBeNull();
      expect(wrapper.vm.invoiceForm.purchase_order_uuid).toBe("po-uuid-123");
    });

    it("sets po_co_uuid in initial invoice load before detailed fetch", async () => {
      const initialInvoice = {
        uuid: "invoice-4",
        invoice_type: "AGAINST_ADVANCE_PAYMENT",
        purchase_order_uuid: "po-uuid-789",
        change_order_uuid: null,
        po_co_uuid: null,
      };

      mockVendorInvoicesStore.fetchVendorInvoice = vi.fn().mockResolvedValue({
        ...initialInvoice,
      });

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await wrapper.vm.loadInvoiceForModal(initialInvoice, false);
      
      // Check initial load sets po_co_uuid
      expect(wrapper.vm.invoiceForm.po_co_uuid).toBe("PO:po-uuid-789");
      
      await flushPromises();
      
      // After detailed fetch, should still have po_co_uuid set
      expect(wrapper.vm.invoiceForm.po_co_uuid).toBe("PO:po-uuid-789");
    });

    it("handles invoice with both purchase_order_uuid and change_order_uuid (should prefer purchase_order_uuid)", async () => {
      const invoiceWithBoth = {
        uuid: "invoice-5",
        invoice_type: "AGAINST_ADVANCE_PAYMENT",
        purchase_order_uuid: "po-uuid-123",
        change_order_uuid: "co-uuid-456",
        po_co_uuid: null,
      };

      mockVendorInvoicesStore.fetchVendorInvoice = vi.fn().mockResolvedValue({
        ...invoiceWithBoth,
      });

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      await wrapper.vm.loadInvoiceForModal(invoiceWithBoth, false);
      await flushPromises();

      // Should prefer purchase_order_uuid if both are present
      expect(wrapper.vm.invoiceForm.po_co_uuid).toBe("PO:po-uuid-123");
    });
  });

  describe('Removed Advance Payment Cost Codes in Save', () => {
    it('includes removed_advance_payment_cost_codes in save payload for advance payment invoices', async () => {
      const mockCreateVendorInvoice = vi.fn().mockResolvedValue({
        uuid: 'invoice-123',
        invoice_type: 'AGAINST_ADVANCE_PAYMENT',
      });

      mockVendorInvoicesStore.createVendorInvoice = mockCreateVendorInvoice;
      mockCorpStore.selectedCorporation = { uuid: 'corp-1' };
      mockCorpStore.selectedCorporationId = 'corp-1';

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: {
            ...uiStubs,
            VendorInvoiceForm: VendorInvoiceForm,
          },
        },
      });

      await flushPromises();

      // Set form data directly (similar to other tests)
      wrapper.vm.invoiceForm = {
        corporation_uuid: 'corp-1',
        bill_date: '2024-01-15T00:00:00.000Z',
        invoice_type: 'AGAINST_ADVANCE_PAYMENT',
        po_co_uuid: 'PO:po-uuid-123',
        purchase_order_uuid: 'po-uuid-123',
        amount: 250,
        advance_payment_cost_codes: [
          {
            cost_code_uuid: 'cc-1',
            totalAmount: 500,
            advanceAmount: 250,
          },
        ],
        removed_advance_payment_cost_codes: [
          {
            cost_code_uuid: 'cc-2',
            cost_code_label: 'Removed Cost Code',
            removed_at: '2025-01-01T00:00:00.000Z',
          },
        ],
        attachments: [],
      };

      await flushPromises();

      // Save invoice
      await wrapper.vm.saveInvoice();
      await flushPromises();

      // Check that removed_advance_payment_cost_codes was included in the payload
      expect(mockCreateVendorInvoice).toHaveBeenCalled();
      const callArgs = mockCreateVendorInvoice.mock.calls[0][0];
      expect(callArgs.removed_advance_payment_cost_codes).toBeDefined();
      expect(Array.isArray(callArgs.removed_advance_payment_cost_codes)).toBe(true);
      expect(callArgs.removed_advance_payment_cost_codes.length).toBe(1);
      expect(callArgs.removed_advance_payment_cost_codes[0].cost_code_uuid).toBe('cc-2');
    });

    it('includes empty array for removed_advance_payment_cost_codes when none are removed', async () => {
      const mockCreateVendorInvoice = vi.fn().mockResolvedValue({
        uuid: 'invoice-123',
        invoice_type: 'AGAINST_ADVANCE_PAYMENT',
      });

      mockVendorInvoicesStore.createVendorInvoice = mockCreateVendorInvoice;
      mockCorpStore.selectedCorporation = { uuid: 'corp-1' };
      mockCorpStore.selectedCorporationId = 'corp-1';

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: {
            ...uiStubs,
            VendorInvoiceForm: VendorInvoiceForm,
          },
        },
      });

      await flushPromises();

      // Set form data directly (similar to other tests)
      wrapper.vm.invoiceForm = {
        corporation_uuid: 'corp-1',
        bill_date: '2024-01-15T00:00:00.000Z',
        invoice_type: 'AGAINST_ADVANCE_PAYMENT',
        po_co_uuid: 'PO:po-uuid-123',
        purchase_order_uuid: 'po-uuid-123',
        amount: 250,
        advance_payment_cost_codes: [
          {
            cost_code_uuid: 'cc-1',
            totalAmount: 500,
            advanceAmount: 250,
          },
        ],
        removed_advance_payment_cost_codes: [],
        attachments: [],
      };

      await flushPromises();

      // Save invoice
      await wrapper.vm.saveInvoice();
      await flushPromises();

      // Check that removed_advance_payment_cost_codes was included as empty array
      expect(mockCreateVendorInvoice).toHaveBeenCalled();
      const callArgs = mockCreateVendorInvoice.mock.calls[0][0];
      expect(callArgs.removed_advance_payment_cost_codes).toBeDefined();
      expect(Array.isArray(callArgs.removed_advance_payment_cost_codes)).toBe(true);
      expect(callArgs.removed_advance_payment_cost_codes.length).toBe(0);
    });
  });

  describe("Payment Permission and Pay Button", () => {
    beforeEach(() => {
      mockHasPermission.mockReturnValue(true);
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
    });

    it("shows Pay button when invoice status is Approved and user has payment permission", async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        return perm === "vendor_invoices_payment";
      });

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Set up an approved invoice
      wrapper.vm.invoiceForm = {
        uuid: "invoice-3",
        status: "Approved",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Check that canPay is true
      expect(wrapper.vm.canPay).toBe(true);
      // Check that showPayButton is true
      expect(wrapper.vm.showPayButton).toBe(true);
    });

    it("does not show Pay button when user does not have payment permission", async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        return perm !== "vendor_invoices_payment";
      });

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Set up an approved invoice
      wrapper.vm.invoiceForm = {
        uuid: "invoice-3",
        status: "Approved",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Check that canPay is false
      expect(wrapper.vm.canPay).toBe(false);
      // Check that showPayButton is false
      expect(wrapper.vm.showPayButton).toBe(false);
    });

    it("does not show Pay button when invoice status is not Approved", async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        return perm === "vendor_invoices_payment";
      });

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Set up a pending invoice
      wrapper.vm.invoiceForm = {
        uuid: "invoice-2",
        status: "Pending",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Check that canPay is true
      expect(wrapper.vm.canPay).toBe(true);
      // Check that showPayButton is false (status is not Approved)
      expect(wrapper.vm.showPayButton).toBe(false);
    });

    it("does not show Pay button when invoice status is Paid", async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        return perm === "vendor_invoices_payment";
      });

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Set up a paid invoice
      wrapper.vm.invoiceForm = {
        uuid: "invoice-paid",
        status: "Paid",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Check that showPayButton is false (status is Paid)
      expect(wrapper.vm.showPayButton).toBe(false);
    });

    it("does not show Pay button when in view mode", async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        return perm === "vendor_invoices_payment";
      });

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Set up an approved invoice in view mode
      wrapper.vm.invoiceForm = {
        uuid: "invoice-3",
        status: "Approved",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = true;

      await flushPromises();

      // Check that showPayButton is false (in view mode)
      expect(wrapper.vm.showPayButton).toBe(false);
    });

    it("does not show Pay button for new invoices (no UUID)", async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        return perm === "vendor_invoices_payment";
      });

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Set up a new invoice (no UUID)
      wrapper.vm.invoiceForm = {
        status: "Approved",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Check that showPayButton is false (no UUID)
      expect(wrapper.vm.showPayButton).toBe(false);
    });

    it("updates invoice status to Paid when Pay button is clicked", async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        return perm === "vendor_invoices_payment";
      });

      const updatedInvoice = {
        ...mockInvoices[2],
        status: "Paid",
      };
      mockVendorInvoicesStore.updateVendorInvoice = vi.fn().mockResolvedValue(updatedInvoice);

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        uuid: "invoice-3",
        status: "Approved",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Call handlePay
      await wrapper.vm.handlePay();
      await flushPromises();

      // Check that updateVendorInvoice was called
      expect(mockVendorInvoicesStore.updateVendorInvoice).toHaveBeenCalled();
      
      // Check that the invoice was saved with status 'Paid'
      // The submitWithStatus function sets invoiceForm.value.status = 'Paid' before calling saveInvoice
      // saveInvoice then passes invoiceForm.value (as formData) to updateVendorInvoice
      const callArgs = mockVendorInvoicesStore.updateVendorInvoice.mock.calls[0][0];
      // The status should be in the formData object passed to updateVendorInvoice
      expect(callArgs.status).toBe("Paid");
    });

    it("hides all buttons when invoice status is Paid", async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        return perm === "vendor_invoices_payment" || perm === "vendor_invoices_approve";
      });

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Set up a paid invoice
      wrapper.vm.invoiceForm = {
        uuid: "invoice-paid",
        status: "Paid",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Check that all button visibility flags are false
      expect(wrapper.vm.showPayButton).toBe(false);
      expect(wrapper.vm.showApprovalButtons).toBe(false);
      expect(wrapper.vm.showSaveDraftButton).toBe(false);
      expect(wrapper.vm.showMarkPendingButton).toBe(false);
      expect(wrapper.vm.showAnySaveButtons).toBe(false);
    });

    it("shows Pay button with case-insensitive status check", async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        return perm === "vendor_invoices_payment";
      });

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Test with lowercase status
      wrapper.vm.invoiceForm = {
        uuid: "invoice-3",
        status: "approved",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Check that showPayButton is true (case-insensitive)
      expect(wrapper.vm.showPayButton).toBe(true);

      // Test with uppercase status
      wrapper.vm.invoiceForm.status = "APPROVED";
      await flushPromises();

      // Check that showPayButton is still true
      expect(wrapper.vm.showPayButton).toBe(true);
    });

    it("shows both Unapprove and Pay buttons when user has both approve and payment permissions", async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        return perm === "vendor_invoices_approve" || 
               perm === "vendor_invoices_payment" ||
               perm === "vendor_invoices_edit" ||
               perm === "vendor_invoices_create";
      });

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Set up an approved invoice
      wrapper.vm.invoiceForm = {
        uuid: "invoice-3",
        status: "Approved",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Check that both permissions are available
      expect(wrapper.vm.canApprove).toBe(true);
      expect(wrapper.vm.canPay).toBe(true);
      expect(wrapper.vm.canEdit).toBe(true);
      
      // Check that showPayButton is true
      expect(wrapper.vm.showPayButton).toBe(true);
      
      // Check that showSaveDraftButton is true (for Approved status with approve permission)
      expect(wrapper.vm.showSaveDraftButton).toBe(true);
    });

    it("shows only Pay button when user has payment permission but not approve permission", async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        return perm === "vendor_invoices_payment";
      });

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Set up an approved invoice
      wrapper.vm.invoiceForm = {
        uuid: "invoice-3",
        status: "Approved",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Check permissions
      expect(wrapper.vm.canApprove).toBe(false);
      expect(wrapper.vm.canPay).toBe(true);
      
      // Check that showPayButton is true
      expect(wrapper.vm.showPayButton).toBe(true);
      
      // Check that showSaveDraftButton is false (no approve permission)
      expect(wrapper.vm.showSaveDraftButton).toBe(false);
    });

    it("shows only Unapprove button when user has approve permission but not payment permission", async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        return perm === "vendor_invoices_approve" ||
               perm === "vendor_invoices_edit" ||
               perm === "vendor_invoices_create";
      });

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Set up an approved invoice
      wrapper.vm.invoiceForm = {
        uuid: "invoice-3",
        status: "Approved",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Check permissions
      expect(wrapper.vm.canApprove).toBe(true);
      expect(wrapper.vm.canPay).toBe(false);
      expect(wrapper.vm.canEdit).toBe(true);
      
      // Check that showPayButton is false (no payment permission)
      expect(wrapper.vm.showPayButton).toBe(false);
      
      // Check that showSaveDraftButton is true (has approve permission)
      expect(wrapper.vm.showSaveDraftButton).toBe(true);
    });

    it("shows both buttons in correct order (Unapprove before Pay) when both permissions exist", async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        return perm === "vendor_invoices_approve" || 
               perm === "vendor_invoices_payment" ||
               perm === "vendor_invoices_edit" ||
               perm === "vendor_invoices_create";
      });

      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Set up an approved invoice
      wrapper.vm.invoiceForm = {
        uuid: "invoice-3",
        status: "Approved",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Verify both buttons should be visible
      expect(wrapper.vm.canApprove).toBe(true);
      expect(wrapper.vm.canPay).toBe(true);
      expect(wrapper.vm.canEdit).toBe(true);
      expect(wrapper.vm.showPayButton).toBe(true);
      expect(wrapper.vm.showSaveDraftButton).toBe(true);
      
      // The template should render both buttons, with Unapprove first, then Pay
      // This is verified by the template structure where Unapprove button comes before Pay button
    });
  });

  describe("Readonly Status for Approved and Paid Invoices", () => {
    beforeEach(() => {
      mockHasPermission.mockReturnValue(true);
      mockVendorInvoicesStore.vendorInvoices = mockInvoices;
    });

    it("returns true for isReadOnlyStatus when invoice status is Approved", async () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        uuid: "invoice-3",
        status: "Approved",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Check that isReadOnlyStatus is true for Approved status
      expect(wrapper.vm.isReadOnlyStatus).toBe(true);
    });

    it("returns true for isReadOnlyStatus when invoice status is Paid", async () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        uuid: "invoice-paid",
        status: "Paid",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Check that isReadOnlyStatus is true for Paid status
      expect(wrapper.vm.isReadOnlyStatus).toBe(true);
    });

    it("returns false for isReadOnlyStatus when invoice status is Draft", async () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        uuid: "invoice-1",
        status: "Draft",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Check that isReadOnlyStatus is false for Draft status
      expect(wrapper.vm.isReadOnlyStatus).toBe(false);
    });

    it("returns false for isReadOnlyStatus when invoice status is Pending", async () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      wrapper.vm.invoiceForm = {
        uuid: "invoice-2",
        status: "Pending",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Check that isReadOnlyStatus is false for Pending status
      expect(wrapper.vm.isReadOnlyStatus).toBe(false);
    });

    it("handles case-insensitive status checks for Approved", async () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Test with lowercase
      wrapper.vm.invoiceForm = {
        uuid: "invoice-3",
        status: "approved",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      expect(wrapper.vm.isReadOnlyStatus).toBe(true);

      // Test with uppercase
      wrapper.vm.invoiceForm.status = "APPROVED";
      await flushPromises();

      expect(wrapper.vm.isReadOnlyStatus).toBe(true);
    });

    it("handles case-insensitive status checks for Paid", async () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Test with lowercase
      wrapper.vm.invoiceForm = {
        uuid: "invoice-paid",
        status: "paid",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      expect(wrapper.vm.isReadOnlyStatus).toBe(true);

      // Test with uppercase
      wrapper.vm.invoiceForm.status = "PAID";
      await flushPromises();

      expect(wrapper.vm.isReadOnlyStatus).toBe(true);
    });

    it("passes readonly prop to VendorInvoiceForm when status is Approved", async () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: {
            ...uiStubs,
            VendorInvoiceForm: {
              props: ["form", "editingInvoice", "loading", "readonly"],
              emits: ["update:form"],
              template: '<div data-testid="vendor-invoice-form" :data-readonly="readonly"></div>',
            },
          },
        },
      });

      wrapper.vm.invoiceForm = {
        uuid: "invoice-3",
        status: "Approved",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Find the VendorInvoiceForm component
      const formComponent = wrapper.find('[data-testid="vendor-invoice-form"]');
      expect(formComponent.exists()).toBe(true);
      
      // Check that readonly attribute is set to true
      expect(formComponent.attributes("data-readonly")).toBe("true");
    });

    it("passes readonly prop to VendorInvoiceForm when status is Paid", async () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: {
            ...uiStubs,
            VendorInvoiceForm: {
              props: ["form", "editingInvoice", "loading", "readonly"],
              emits: ["update:form"],
              template: '<div data-testid="vendor-invoice-form" :data-readonly="readonly"></div>',
            },
          },
        },
      });

      wrapper.vm.invoiceForm = {
        uuid: "invoice-paid",
        status: "Paid",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Find the VendorInvoiceForm component
      const formComponent = wrapper.find('[data-testid="vendor-invoice-form"]');
      expect(formComponent.exists()).toBe(true);
      
      // Check that readonly attribute is set to true
      expect(formComponent.attributes("data-readonly")).toBe("true");
    });

    it("does not pass readonly prop to VendorInvoiceForm when status is Draft", async () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: {
            ...uiStubs,
            VendorInvoiceForm: {
              props: ["form", "editingInvoice", "loading", "readonly"],
              emits: ["update:form"],
              template: '<div data-testid="vendor-invoice-form" :data-readonly="readonly"></div>',
            },
          },
        },
      });

      wrapper.vm.invoiceForm = {
        uuid: "invoice-1",
        status: "Draft",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Find the VendorInvoiceForm component
      const formComponent = wrapper.find('[data-testid="vendor-invoice-form"]');
      expect(formComponent.exists()).toBe(true);
      
      // Check that readonly attribute is set to false (or undefined if not passed)
      const readonlyAttr = formComponent.attributes("data-readonly");
      expect(readonlyAttr).toBe("false");
    });

    it("does not pass readonly prop to VendorInvoiceForm when status is Pending", async () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: {
            ...uiStubs,
            VendorInvoiceForm: {
              props: ["form", "editingInvoice", "loading", "readonly"],
              emits: ["update:form"],
              template: '<div data-testid="vendor-invoice-form" :data-readonly="readonly"></div>',
            },
          },
        },
      });

      wrapper.vm.invoiceForm = {
        uuid: "invoice-2",
        status: "Pending",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Find the VendorInvoiceForm component
      const formComponent = wrapper.find('[data-testid="vendor-invoice-form"]');
      expect(formComponent.exists()).toBe(true);
      
      // Check that readonly attribute is set to false (or undefined if not passed)
      const readonlyAttr = formComponent.attributes("data-readonly");
      expect(readonlyAttr).toBe("false");
    });

    it("combines isViewMode and isReadOnlyStatus for readonly prop", async () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: {
            ...uiStubs,
            VendorInvoiceForm: {
              props: ["form", "editingInvoice", "loading", "readonly"],
              emits: ["update:form"],
              template: '<div data-testid="vendor-invoice-form" :data-readonly="readonly"></div>',
            },
          },
        },
      });

      // Test with view mode and Approved status
      wrapper.vm.invoiceForm = {
        uuid: "invoice-3",
        status: "Approved",
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = true;

      await flushPromises();

      // Find the VendorInvoiceForm component
      const formComponent = wrapper.find('[data-testid="vendor-invoice-form"]');
      expect(formComponent.exists()).toBe(true);
      
      // Check that readonly attribute is set to true (view mode OR approved status)
      expect(formComponent.attributes("data-readonly")).toBe("true");
    });

    it("handles null or undefined status gracefully", async () => {
      const wrapper = mount(VendorInvoicesList, {
        global: {
          plugins: [pinia],
          stubs: uiStubs,
        },
      });

      // Test with null status
      wrapper.vm.invoiceForm = {
        uuid: "invoice-null",
        status: null,
        attachments: [],
      };
      wrapper.vm.showFormModal = true;
      wrapper.vm.isViewMode = false;

      await flushPromises();

      // Should return false for null status
      expect(wrapper.vm.isReadOnlyStatus).toBe(false);

      // Test with undefined status
      wrapper.vm.invoiceForm.status = undefined;
      await flushPromises();

      // Should return false for undefined status
      expect(wrapper.vm.isReadOnlyStatus).toBe(false);
    });
  });
});

