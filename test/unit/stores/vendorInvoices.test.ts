import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useVendorInvoicesStore } from "@/stores/vendorInvoices";

// Mock $fetch
global.$fetch = vi.fn();

describe("vendorInvoices Store", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchVendorInvoices", () => {
    it("fetches vendor invoices for a corporation", async () => {
      const store = useVendorInvoicesStore();
      const mockInvoices = [
        {
          uuid: "invoice-1",
          corporation_uuid: "corp-1",
          invoice_type: "AGAINST_PO",
          amount: 1000,
          bill_date: "2024-01-15T00:00:00.000Z",
        },
        {
          uuid: "invoice-2",
          corporation_uuid: "corp-1",
          invoice_type: "ENTER_DIRECT_INVOICE",
          amount: 2000,
          bill_date: "2024-01-20T00:00:00.000Z",
        },
      ];

      (global.$fetch as any).mockResolvedValue({
        data: mockInvoices,
      });

      await store.fetchVendorInvoices("corp-1", true);

      expect(global.$fetch).toHaveBeenCalledWith(
        "/api/vendor-invoices?corporation_uuid=corp-1"
      );
      expect(store.vendorInvoices.length).toBe(2);
      expect(store.vendorInvoices[0].uuid).toBe("invoice-1");
      expect(store.vendorInvoices[1].uuid).toBe("invoice-2");
    });

    it("handles fetch errors gracefully", async () => {
      const store = useVendorInvoicesStore();

      (global.$fetch as any).mockRejectedValue(new Error("Network error"));

      await store.fetchVendorInvoices("corp-1", true);

      expect(store.error).toBe("Network error");
      expect(store.vendorInvoices.length).toBe(0);
    });

    it("does not fetch if data already exists and forceRefresh is false", async () => {
      const store = useVendorInvoicesStore();
      const mockInvoices = [
        {
          uuid: "invoice-1",
          corporation_uuid: "corp-1",
          invoice_type: "AGAINST_PO",
          amount: 1000,
        },
      ];

      (global.$fetch as any).mockResolvedValue({
        data: mockInvoices,
      });

      // First fetch
      await store.fetchVendorInvoices("corp-1", false);
      expect(global.$fetch).toHaveBeenCalledTimes(1);

      // Second fetch without forceRefresh should not call API
      await store.fetchVendorInvoices("corp-1", false);
      expect(global.$fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("fetchVendorInvoice", () => {
    it("fetches a single vendor invoice by UUID", async () => {
      const store = useVendorInvoicesStore();
      const mockInvoice = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        invoice_type: "ENTER_DIRECT_INVOICE",
        amount: 1000,
        line_items: [
          {
            uuid: "line-item-1",
            cost_code_uuid: "cc-1",
            unit_price: 100,
            quantity: 5,
            total: 500,
          },
        ],
        financial_breakdown: {
          charges: {},
          sales_taxes: {},
          totals: { item_total: 1000, charges_total: 0, tax_total: 0, total_invoice_amount: 1000 },
        },
      };

      (global.$fetch as any).mockResolvedValue({
        data: mockInvoice,
      });

      const result = await store.fetchVendorInvoice("invoice-1");

      expect(global.$fetch).toHaveBeenCalledWith("/api/vendor-invoices/invoice-1");
      expect(result).toBeDefined();
      expect(result?.uuid).toBe("invoice-1");
      expect(result?.invoice_type).toBe("ENTER_DIRECT_INVOICE");
      expect(Array.isArray(result?.line_items)).toBe(true);
      expect(result?.line_items.length).toBe(1);
      expect(store.currentVendorInvoice?.uuid).toBe("invoice-1");
    });

    it("handles missing invoice", async () => {
      const store = useVendorInvoicesStore();

      (global.$fetch as any).mockRejectedValue(new Error("Invoice not found"));

      const result = await store.fetchVendorInvoice("non-existent");

      expect(result).toBeNull();
      expect(store.error).toBe("Invoice not found");
    });

    it("ensures attachments is always an array", async () => {
      const store = useVendorInvoicesStore();
      const mockInvoice = {
        uuid: "invoice-1",
        attachments: null,
      };

      (global.$fetch as any).mockResolvedValue({
        data: mockInvoice,
      });

      const result = await store.fetchVendorInvoice("invoice-1");

      expect(Array.isArray(result?.attachments)).toBe(true);
    });
  });

  describe("createVendorInvoice", () => {
    it("creates a new vendor invoice", async () => {
      const store = useVendorInvoicesStore();
      const newInvoice = {
        uuid: "invoice-new",
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_PO",
        amount: 1000,
        bill_date: "2024-01-15T00:00:00.000Z",
      };

      (global.$fetch as any).mockResolvedValue({
        data: newInvoice,
      });

      const result = await store.createVendorInvoice({
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_PO",
        bill_date: "2024-01-15",
        amount: 1000,
      });

      expect(global.$fetch).toHaveBeenCalledWith("/api/vendor-invoices", {
        method: "POST",
        body: {
          corporation_uuid: "corp-1",
          invoice_type: "AGAINST_PO",
          bill_date: "2024-01-15",
          amount: 1000,
        },
      });
      expect(result).toBeDefined();
      expect(result?.uuid).toBe("invoice-new");
      expect(store.vendorInvoices.length).toBeGreaterThan(0);
      expect(store.currentVendorInvoice?.uuid).toBe("invoice-new");
    });

    it("creates a direct invoice with line items", async () => {
      const store = useVendorInvoicesStore();
      const newInvoice = {
        uuid: "invoice-new",
        corporation_uuid: "corp-1",
        invoice_type: "ENTER_DIRECT_INVOICE",
        amount: 1000,
        line_items: [
          {
            uuid: "line-item-1",
            cost_code_uuid: "cc-1",
            unit_price: 100,
            quantity: 5,
            total: 500,
          },
        ],
      };

      (global.$fetch as any).mockResolvedValue({
        data: newInvoice,
      });

      const result = await store.createVendorInvoice({
        corporation_uuid: "corp-1",
        project_uuid: "project-1",
        vendor_uuid: "vendor-1",
        invoice_type: "ENTER_DIRECT_INVOICE",
        bill_date: "2024-01-15",
        amount: 1000,
        line_items: [
          {
            cost_code_uuid: "cc-1",
            unit_price: 100,
            quantity: 5,
            total: 500,
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result?.invoice_type).toBe("ENTER_DIRECT_INVOICE");
      expect(Array.isArray(result?.line_items)).toBe(true);
    });

    it("handles creation errors", async () => {
      const store = useVendorInvoicesStore();

      (global.$fetch as any).mockRejectedValue(new Error("Validation error"));

      const result = await store.createVendorInvoice({
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_PO",
        bill_date: "2024-01-15",
        amount: 1000,
      });

      expect(result).toBeNull();
      expect(store.error).toBe("Validation error");
    });
  });

  describe("updateVendorInvoice", () => {
    it("updates an existing vendor invoice", async () => {
      const store = useVendorInvoicesStore();
      const updatedInvoice = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_PO",
        amount: 1500,
        bill_date: "2024-01-20T00:00:00.000Z",
      };

      // Set initial state
      store.vendorInvoices = [
        {
          uuid: "invoice-1",
          corporation_uuid: "corp-1",
          invoice_type: "AGAINST_PO",
          amount: 1000,
        } as any,
      ];

      (global.$fetch as any).mockResolvedValue({
        data: updatedInvoice,
      });

      const result = await store.updateVendorInvoice({
        uuid: "invoice-1",
        amount: 1500,
        bill_date: "2024-01-20",
      });

      expect(global.$fetch).toHaveBeenCalledWith("/api/vendor-invoices", {
        method: "PUT",
        body: {
          uuid: "invoice-1",
          amount: 1500,
          bill_date: "2024-01-20",
        },
      });
      expect(result).toBeDefined();
      expect(result?.amount).toBe(1500);
    });

    it("updates line items for direct invoices", async () => {
      const store = useVendorInvoicesStore();
      const updatedInvoice = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        invoice_type: "ENTER_DIRECT_INVOICE",
        amount: 2000,
        line_items: [
          {
            uuid: "line-item-1",
            cost_code_uuid: "cc-1",
            unit_price: 200,
            quantity: 5,
            total: 1000,
          },
          {
            uuid: "line-item-2",
            cost_code_uuid: "cc-2",
            unit_price: 100,
            quantity: 10,
            total: 1000,
          },
        ],
      };

      (global.$fetch as any).mockResolvedValue({
        data: updatedInvoice,
      });

      const result = await store.updateVendorInvoice({
        uuid: "invoice-1",
        invoice_type: "ENTER_DIRECT_INVOICE",
        amount: 2000,
        line_items: [
          {
            cost_code_uuid: "cc-1",
            unit_price: 200,
            quantity: 5,
            total: 1000,
          },
          {
            cost_code_uuid: "cc-2",
            unit_price: 100,
            quantity: 10,
            total: 1000,
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result?.amount).toBe(2000);
      expect(Array.isArray(result?.line_items)).toBe(true);
      expect(result?.line_items.length).toBe(2);
    });

    it("handles update errors", async () => {
      const store = useVendorInvoicesStore();

      (global.$fetch as any).mockRejectedValue(new Error("Update failed"));

      const result = await store.updateVendorInvoice({
        uuid: "invoice-1",
        amount: 1500,
      });

      expect(result).toBeNull();
      expect(store.error).toBe("Update failed");
    });

    it("preserves display fields (vendor_name, project_name, etc.) when updating invoice in list", async () => {
      const store = useVendorInvoicesStore();
      
      // First, populate the store with an invoice that has display fields
      const existingInvoice = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_PO",
        amount: 1000,
        bill_date: "2024-01-15T00:00:00.000Z",
        // Display fields from JOINs in list endpoint
        vendor_name: "Test Vendor",
        project_name: "Test Project",
        project_id: "PROJ-001",
        po_number: "PO-001",
        co_number: null,
      };
      
      // Use fetchVendorInvoices to populate the store properly
      (global.$fetch as any).mockResolvedValueOnce({
        data: [existingInvoice],
      });
      await store.fetchVendorInvoices("corp-1", true);
      
      // Clear the mock for the update call
      vi.clearAllMocks();

      // API response from update endpoint (doesn't include display fields)
      const updatedInvoice = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_PO",
        amount: 1500, // Updated amount
        bill_date: "2024-01-20T00:00:00.000Z", // Updated date
        // Note: No vendor_name, project_name, etc. in update response
      };

      (global.$fetch as any).mockResolvedValue({
        data: updatedInvoice,
      });

      const result = await store.updateVendorInvoice({
        uuid: "invoice-1",
        amount: 1500,
        bill_date: "2024-01-20",
      });

      expect(result).toBeDefined();
      expect(result?.amount).toBe(1500);
      
      // Verify display fields are preserved in the list
      const updatedInList = store.vendorInvoices.find(i => i.uuid === "invoice-1");
      expect(updatedInList).toBeDefined();
      expect(updatedInList?.vendor_name).toBe("Test Vendor");
      expect(updatedInList?.project_name).toBe("Test Project");
      expect(updatedInList?.project_id).toBe("PROJ-001");
      expect(updatedInList?.po_number).toBe("PO-001");
      // Verify updated fields are applied
      expect(updatedInList?.amount).toBe(1500);
      expect(updatedInList?.bill_date).toBe("2024-01-20T00:00:00.000Z");
    });

    it("preserves display fields even when update response has null/undefined values", async () => {
      const store = useVendorInvoicesStore();
      
      // First, populate the store with an invoice that has display fields
      const existingInvoice = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_CO",
        amount: 1000,
        vendor_name: "CO Vendor",
        project_name: "CO Project",
        co_number: "CO-001",
        po_number: null,
      };
      
      // Use fetchVendorInvoices to populate the store properly
      (global.$fetch as any).mockResolvedValueOnce({
        data: [existingInvoice],
      });
      await store.fetchVendorInvoices("corp-1", true);
      
      // Clear the mock for the update call
      vi.clearAllMocks();

      const updatedInvoice = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        invoice_type: "AGAINST_CO",
        amount: 2000,
        vendor_name: null, // Update response has null
        project_name: undefined, // Update response has undefined
        co_number: null,
        po_number: null,
      };

      (global.$fetch as any).mockResolvedValue({
        data: updatedInvoice,
      });

      await store.updateVendorInvoice({
        uuid: "invoice-1",
        amount: 2000,
      });

      // Verify display fields are preserved using nullish coalescing
      const updatedInList = store.vendorInvoices.find(i => i.uuid === "invoice-1");
      expect(updatedInList?.vendor_name).toBe("CO Vendor");
      expect(updatedInList?.project_name).toBe("CO Project");
      expect(updatedInList?.co_number).toBe("CO-001");
      expect(updatedInList?.amount).toBe(2000);
    });
  });

  describe("deleteVendorInvoice", () => {
    it("soft deletes a vendor invoice", async () => {
      const store = useVendorInvoicesStore();
      const deletedInvoice = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
        is_active: false,
      };

      // Set initial state
      store.vendorInvoices = [
        {
          uuid: "invoice-1",
          corporation_uuid: "corp-1",
          is_active: true,
        } as any,
      ];

      (global.$fetch as any).mockResolvedValue({
        data: deletedInvoice,
      });

      const result = await store.deleteVendorInvoice("invoice-1");

      expect(global.$fetch).toHaveBeenCalledWith("/api/vendor-invoices", {
        method: "DELETE",
        query: { uuid: "invoice-1" },
      });
      expect(result).toBe(true);
      expect(store.vendorInvoices.length).toBe(0);
    });

    it("handles delete errors", async () => {
      const store = useVendorInvoicesStore();

      (global.$fetch as any).mockRejectedValue(new Error("Delete failed"));

      const result = await store.deleteVendorInvoice("invoice-1");

      expect(result).toBe(false);
      expect(store.error).toBe("Delete failed");
    });
  });

  describe("uploadAttachmentsForInvoice", () => {
    it("uploads attachments for an invoice", async () => {
      const store = useVendorInvoicesStore();
      const mockAttachments = [
        {
          uuid: "att-1",
          document_name: "invoice.pdf",
          file_size: 1024,
        },
      ];

      (global.$fetch as any).mockResolvedValue({
        attachments: mockAttachments,
      });

      const result = await store.uploadAttachmentsForInvoice("invoice-1", [
        {
          name: "invoice.pdf",
          type: "application/pdf",
          size: 1024,
          fileData: "base64data",
        },
      ]);

      expect(global.$fetch).toHaveBeenCalledWith("/api/vendor-invoices/documents/upload", {
        method: "POST",
        body: {
          invoice_uuid: "invoice-1",
          files: [
            {
              name: "invoice.pdf",
              type: "application/pdf",
              size: 1024,
              fileData: "base64data",
            },
          ],
        },
      });
      expect(result).toEqual(mockAttachments);
    });

    it("handles upload errors", async () => {
      const store = useVendorInvoicesStore();

      (global.$fetch as any).mockRejectedValue(new Error("Upload failed"));

      const result = await store.uploadAttachmentsForInvoice("invoice-1", [
        {
          name: "invoice.pdf",
          type: "application/pdf",
          size: 1024,
          fileData: "base64data",
        },
      ]);

      expect(result).toBeNull();
    });

    it("skips upload if no pending attachments", async () => {
      const store = useVendorInvoicesStore();

      const result = await store.uploadAttachmentsForInvoice("invoice-1", [
        {
          uuid: "att-1",
          document_name: "invoice.pdf",
          isUploaded: true,
        },
      ]);

      expect(global.$fetch).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe("removeAttachment", () => {
    it("removes an attachment from an invoice", async () => {
      const store = useVendorInvoicesStore();
      const updatedAttachments = [
        {
          uuid: "att-2",
          document_name: "invoice2.pdf",
        },
      ];

      (global.$fetch as any).mockResolvedValue({
        success: true,
        attachments: updatedAttachments,
      });

      const result = await store.removeAttachment("invoice-1", "att-1");

      expect(global.$fetch).toHaveBeenCalledWith("/api/vendor-invoices/documents/remove", {
        method: "POST",
        body: {
          invoice_uuid: "invoice-1",
          attachment_uuid: "att-1",
        },
      });
      expect(result).toBe(true);
    });

    it("handles remove errors", async () => {
      const store = useVendorInvoicesStore();

      (global.$fetch as any).mockRejectedValue(new Error("Remove failed"));

      const result = await store.removeAttachment("invoice-1", "att-1");

      expect(result).toBe(false);
    });
  });

  describe("clearCurrentVendorInvoice", () => {
    it("clears the current vendor invoice", () => {
      const store = useVendorInvoicesStore();
      store.currentVendorInvoice = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
      } as any;

      store.clearCurrentVendorInvoice();

      expect(store.currentVendorInvoice).toBeNull();
    });
  });

  describe("clearData", () => {
    it("clears all store data", () => {
      const store = useVendorInvoicesStore();
      store.vendorInvoices = [
        {
          uuid: "invoice-1",
          corporation_uuid: "corp-1",
        } as any,
      ];
      store.currentVendorInvoice = {
        uuid: "invoice-1",
        corporation_uuid: "corp-1",
      } as any;
      store.error = "Some error";

      store.clearData();

      expect(store.vendorInvoices.length).toBe(0);
      expect(store.currentVendorInvoice).toBeNull();
      expect(store.error).toBeNull();
    });
  });
});

