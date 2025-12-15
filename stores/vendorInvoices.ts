import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'

export interface VendorInvoice {
  id?: number;
  uuid?: string;
  created_at?: string;
  updated_at?: string;
  corporation_uuid: string;
  project_uuid?: string;
  vendor_uuid?: string;
  purchase_order_uuid?: string;
  change_order_uuid?: string;
  invoice_type: string;
  number?: string;
  bill_date: string;
  due_date?: string;
  credit_days?: string;
  amount: number;
  holdback?: number | null;
  is_active?: boolean;
  attachments?: any[];
  line_items?: any[]; // Line items for direct invoices
  created_by?: string;
  updated_by?: string;
  // Metadata fields for list display (from joined tables)
  project_name?: string | null;
  project_id?: string | null;
  vendor_name?: string | null;
  po_number?: string | null;
  co_number?: string | null;
}

export interface CreateVendorInvoicePayload {
  corporation_uuid: string;
  project_uuid?: string;
  vendor_uuid?: string;
  purchase_order_uuid?: string;
  change_order_uuid?: string;
  invoice_type: string;
  number?: string;
  bill_date: string;
  due_date?: string;
  credit_days?: string;
  amount: number;
  holdback?: number | null;
  attachments?: any[];
  line_items?: any[]; // Line items for direct invoices
  po_invoice_items?: any[]; // Invoice items for purchase order-based invoices
  co_invoice_items?: any[]; // Invoice items for change order-based invoices
  advance_payment_cost_codes?: any[]; // Cost codes for advance payment invoices
  removed_advance_payment_cost_codes?: any[]; // Removed cost codes for advance payment invoices
}

export interface UpdateVendorInvoicePayload extends Partial<CreateVendorInvoicePayload> {
  uuid: string;
}

export interface VendorInvoiceResponse {
  data: VendorInvoice;
  error?: string;
}

export interface VendorInvoicesResponse {
  data: VendorInvoice[];
  error?: string;
}

export const useVendorInvoicesStore = defineStore("vendorInvoices", () => {
  const vendorInvoices = ref<VendorInvoice[]>([]);
  const currentVendorInvoice = ref<VendorInvoice | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Cache management
  const lastFetchedCorporation = ref<string | null>(null);
  const hasDataForCorporation = ref<Set<string>>(new Set());

  const uploadAttachmentsForInvoice = async (
    invoiceUuid: string,
    attachments: any[] = []
  ) => {
    const pending = (attachments || []).filter(
      (att) =>
        !att?.uuid &&
        (typeof att?.fileData === "string" ? att.fileData : att?.url)
    );

    if (!pending.length) {
      return null;
    }

    try {
      const response = await $fetch<{
        attachments: any[];
        errors?: Array<{ fileName: string; error: string }>;
      }>("/api/vendor-invoices/documents/upload", {
        method: "POST",
        body: {
          invoice_uuid: invoiceUuid,
          files: pending.map((att) => ({
            name: att.name || att.document_name || "attachment.pdf",
            type: att.type || att.mime_type || "application/pdf",
            size: att.size || att.file_size || 0,
            fileData: att.fileData || att.url || "",
          })),
        },
      });

      if (response?.attachments) {
        return response.attachments;
      }
    } catch (error) {
      console.error("Error uploading vendor invoice attachments:", error);
    }

    return null;
  };

  const removeAttachment = async (
    invoiceUuid: string,
    attachmentUuid: string
  ): Promise<boolean> => {
    try {
      const response = await $fetch<{
        success: boolean;
        attachments: any[];
      }>("/api/vendor-invoices/documents/remove", {
        method: "POST",
        body: {
          invoice_uuid: invoiceUuid,
          attachment_uuid: attachmentUuid,
        },
      });

      return response?.success || false;
    } catch (error) {
      console.error("Error removing vendor invoice attachment:", error);
      return false;
    }
  };

  // Check if we need to fetch data
  const shouldFetchData = (corporationUUID: string) => {
    if (lastFetchedCorporation.value !== corporationUUID) {
      return true;
    }
    if (hasDataForCorporation.value.has(corporationUUID)) {
      return false;
    }
    return true;
  };

  /**
   * Fetch all vendor invoices for a specific corporation
   */
  const fetchVendorInvoices = async (
    corporationUUID: string,
    forceRefresh = false
  ) => {
    if (process.server) return;

    const shouldFetch = shouldFetchData(corporationUUID);
    if (!forceRefresh && !shouldFetch) {
      return;
    }

    error.value = null;
    loading.value = true;
    
    try {
      const response = await $fetch<VendorInvoicesResponse>(
        `/api/vendor-invoices?corporation_uuid=${corporationUUID}`
      );
      if (response?.error) throw new Error(response.error);

      const invoices = Array.isArray(response?.data) ? response.data : [];
      vendorInvoices.value = invoices;
      lastFetchedCorporation.value = corporationUUID;
      hasDataForCorporation.value.add(corporationUUID);
    } catch (err: any) {
      console.error("Error fetching vendor invoices:", err);
      error.value = err.message || "Failed to fetch vendor invoices";
      vendorInvoices.value = [];
      hasDataForCorporation.value.delete(corporationUUID);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Fetch a single vendor invoice by UUID
   */
  const fetchVendorInvoice = async (
    uuid: string
  ): Promise<VendorInvoice | null> => {
    loading.value = true;
    error.value = null;
    try {
      const response = await $fetch<VendorInvoiceResponse>(
        `/api/vendor-invoices/${uuid}`
      );
      if (response?.error) throw new Error(response.error);

      const invoice: VendorInvoice | null = response?.data || null;

      if (invoice) {
        if (!Array.isArray(invoice.attachments)) {
          invoice.attachments = [];
        }
        currentVendorInvoice.value = invoice;
      }

      return invoice;
    } catch (err: any) {
      error.value = err.message || "Failed to fetch vendor invoice";
      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Create a new vendor invoice
   */
  const createVendorInvoice = async (
    invoiceData: CreateVendorInvoicePayload
  ): Promise<VendorInvoice | null> => {
    loading.value = true;
    error.value = null;
    try {
      const response = await $fetch<VendorInvoiceResponse>(
        "/api/vendor-invoices",
        {
          method: "POST",
          body: invoiceData,
        }
      );
      if (response?.error) throw new Error(response.error);

      const newInvoice = response?.data;
      if (newInvoice) {
        let uploadedAttachments: any[] | null = null;
        if (newInvoice.uuid) {
          uploadedAttachments = await uploadAttachmentsForInvoice(
            newInvoice.uuid,
            invoiceData.attachments || []
          );
        }

        if (uploadedAttachments) {
          newInvoice.attachments = uploadedAttachments;
        }

        vendorInvoices.value.unshift(newInvoice);
        currentVendorInvoice.value = newInvoice;
      }
      return newInvoice || null;
    } catch (err: any) {
      error.value = err.message || "Failed to create vendor invoice";
      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Update an existing vendor invoice
   */
  const updateVendorInvoice = async (
    invoiceData: UpdateVendorInvoicePayload
  ): Promise<VendorInvoice | null> => {
    loading.value = true;
    error.value = null;
    try {
      const response = await $fetch<VendorInvoiceResponse>(
        "/api/vendor-invoices",
        {
          method: "PUT",
          body: invoiceData,
        }
      );
      if (response?.error) throw new Error(response.error);

      const updatedInvoice = response?.data;
      if (updatedInvoice) {
        let uploadedAttachments: any[] | null = null;
        if (updatedInvoice.uuid) {
          uploadedAttachments = await uploadAttachmentsForInvoice(
            updatedInvoice.uuid,
            invoiceData.attachments || []
          );
        }

        if (uploadedAttachments) {
          updatedInvoice.attachments = uploadedAttachments;
        }

        const index = vendorInvoices.value.findIndex(
          (i) => i.uuid === updatedInvoice.uuid
        );
        if (index !== -1) {
          // Merge updated invoice with existing one to preserve display fields (vendor_name, project_name, etc.)
          // that come from JOINs in the list endpoint but not in the update response
          const existingInvoice = vendorInvoices.value[index];
          vendorInvoices.value[index] = {
            ...existingInvoice,
            ...updatedInvoice,
            // Preserve display fields from existing invoice if not in updated response
            vendor_name: updatedInvoice.vendor_name ?? existingInvoice.vendor_name,
            project_name: updatedInvoice.project_name ?? existingInvoice.project_name,
            project_id: updatedInvoice.project_id ?? existingInvoice.project_id,
            po_number: updatedInvoice.po_number ?? existingInvoice.po_number,
            co_number: updatedInvoice.co_number ?? existingInvoice.co_number,
          };
        }
        if (currentVendorInvoice.value?.uuid === updatedInvoice.uuid) {
          currentVendorInvoice.value = updatedInvoice;
        }
      }
      return updatedInvoice || null;
    } catch (err: any) {
      error.value = err.message || "Failed to update vendor invoice";
      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Delete a vendor invoice
   */
  const deleteVendorInvoice = async (uuid: string): Promise<boolean> => {
    loading.value = true;
    error.value = null;
    try {
      const response = await $fetch<VendorInvoiceResponse>(
        "/api/vendor-invoices",
        {
          method: "DELETE",
          query: { uuid },
        }
      );
      if (response?.error) throw new Error(response.error);

      const index = vendorInvoices.value.findIndex((i) => i.uuid === uuid);
      if (index !== -1) {
        const invoice = vendorInvoices.value[index];
        if (invoice) {
          vendorInvoices.value.splice(index, 1);
          if (currentVendorInvoice.value?.uuid === uuid) {
            currentVendorInvoice.value = null;
          }
          if (invoice.corporation_uuid) {
            hasDataForCorporation.value.delete(invoice.corporation_uuid);
          }
        }
      }
      return true;
    } catch (err: any) {
      error.value = err.message || "Failed to delete vendor invoice";
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Clear current vendor invoice
   */
  const clearCurrentVendorInvoice = () => {
    currentVendorInvoice.value = null;
  };

  /**
   * Clear all data
   */
  const clearData = () => {
    const corpId = lastFetchedCorporation.value;
    vendorInvoices.value = [];
    currentVendorInvoice.value = null;
    error.value = null;
    lastFetchedCorporation.value = null;
    hasDataForCorporation.value.clear();
  };

  return {
    // State
    vendorInvoices: readonly(vendorInvoices),
    currentVendorInvoice,
    loading: readonly(loading),
    error: readonly(error),

    // Actions
    fetchVendorInvoices,
    fetchVendorInvoice,
    createVendorInvoice,
    updateVendorInvoice,
    deleteVendorInvoice,
    uploadAttachmentsForInvoice,
    removeAttachment,
    clearCurrentVendorInvoice,
    clearData,
  };
});

