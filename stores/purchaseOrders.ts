import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import { dbHelpers } from "@/utils/indexedDb";
import { useCorporationStore } from "./corporations";

export interface POItem {
  id?: number;
  uuid?: string;
  cost_code_uuid?: string;
  item_type_uuid?: string;
  sequence_uuid?: string;
  item_uuid?: string;
  description?: string;
  model_number?: string;
  location_uuid?: string;
  unit_price?: number | null;
  uom?: string;
  quantity?: number | null;
  total?: number | null;
  approval_checks?: string;
  source?: string | null;
  cost_code_label?: string;
  cost_code_number?: string;
  cost_code_name?: string;
  division_name?: string;
  item_type_label?: string;
  name?: string;
  item_name?: string;
  location?: string;
  unit_label?: string;
  unit_uuid?: string | null;
  po_unit_price?: number | null;
  po_quantity?: number | null;
  po_total?: number | null;
  display_metadata?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface PurchaseOrder {
  id?: number;
  uuid?: string;
  created_at?: string;
  updated_at?: string;
  corporation_uuid: string;
  project_uuid?: string;
  po_number?: string;
  entry_date: string;
  po_type?: string;
  po_type_uuid?: string;
  credit_days?: string;
  ship_via?: string;
  freight?: string;
  shipping_instructions?: string;
  estimated_delivery_date?: string;
  include_items?: string;
  terms_and_conditions?: string;
  item_total?: number;
  freight_charges_percentage?: number;
  freight_charges_amount?: number;
  freight_charges_taxable?: boolean;
  packing_charges_percentage?: number;
  packing_charges_amount?: number;
  packing_charges_taxable?: boolean;
  custom_duties_percentage?: number;
  custom_duties_amount?: number;
  custom_duties_taxable?: boolean;
  other_charges_percentage?: number;
  other_charges_amount?: number;
  other_charges_taxable?: boolean;
  charges_total?: number;
  sales_tax_1_percentage?: number;
  sales_tax_1_amount?: number;
  sales_tax_2_percentage?: number;
  sales_tax_2_amount?: number;
  tax_total?: number;
  total_po_amount?: number;
  vendor_uuid?: string;
  billing_address_uuid?: string;
  shipping_address_uuid?: string;
  status?: "Draft" | "Ready" | "Approved" | "Rejected" | "Partially_Received" | "Completed";
  is_active?: boolean;
  po_items?: POItem[];
  attachments?: any[];
  removed_po_items?: POItem[];
  financial_breakdown?: Record<string, any> | null;
  // Metadata fields for list display (from joined tables)
  project_name?: string | null;
  project_id?: string | null;
  vendor_name?: string | null;
}

export interface CreatePurchaseOrderPayload {
  corporation_uuid: string;
  project_uuid?: string;
  po_number?: string;
  entry_date: string;
  po_type?: string;
  po_type_uuid?: string;
  credit_days?: string;
  ship_via?: string;
  freight?: string;
  shipping_instructions?: string;
  estimated_delivery_date?: string;
  include_items?: string;
  terms_and_conditions?: string;
  item_total?: number;
  freight_charges_percentage?: number;
  freight_charges_amount?: number;
  freight_charges_taxable?: boolean;
  packing_charges_percentage?: number;
  packing_charges_amount?: number;
  packing_charges_taxable?: boolean;
  custom_duties_percentage?: number;
  custom_duties_amount?: number;
  custom_duties_taxable?: boolean;
  other_charges_percentage?: number;
  other_charges_amount?: number;
  other_charges_taxable?: boolean;
  charges_total?: number;
  sales_tax_1_percentage?: number;
  sales_tax_1_amount?: number;
  sales_tax_2_percentage?: number;
  sales_tax_2_amount?: number;
  tax_total?: number;
  total_po_amount?: number;
  vendor_uuid?: string;
    billing_address_uuid?: string;
    shipping_address_uuid?: string;
    status?: "Draft" | "Ready" | "Approved" | "Rejected" | "Partially_Received" | "Completed";
    po_items?: POItem[];
  attachments?: any[];
  removed_po_items?: POItem[];
  financial_breakdown?: Record<string, any> | null;
}

export interface UpdatePurchaseOrderPayload
  extends Partial<CreatePurchaseOrderPayload> {
  uuid: string;
}

export interface PurchaseOrderResponse {
  data: PurchaseOrder;
  error?: string;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PurchaseOrdersResponse {
  data: PurchaseOrder[];
  pagination?: PaginationInfo;
  error?: string;
}

export const usePurchaseOrdersStore = defineStore("purchaseOrders", () => {
  const purchaseOrders = ref<PurchaseOrder[]>([]);
  const currentPurchaseOrder = ref<PurchaseOrder | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Cache management
  const lastFetchedCorporation = ref<string | null>(null);
  const hasDataForCorporation = ref<Set<string>>(new Set());
  
  // Pagination state
  const paginationInfo = ref<Record<string, PaginationInfo>>({});
  const loadedPages = ref<Record<string, Set<number>>>({});

  const uploadAttachmentsForPurchaseOrder = async (
    purchaseOrderUuid: string,
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
      }>("/api/purchase-order-forms/documents/upload", {
        method: "POST",
        body: {
          purchase_order_uuid: purchaseOrderUuid,
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
      console.error("Error uploading purchase order attachments:", error);
    }

    return null;
  };

  const mapStoredItemToFormItem = (item: any, index: number) => {
    const toNullableNumber = (value: any): number | null => {
      if (value === null || value === undefined || value === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const id =
      item?.uuid || item?.id || `${item?.purchase_order_uuid || "po"}-${index}`;
    const displayMetadata = {
      cost_code_label: item?.cost_code_label || "",
      cost_code_number: item?.cost_code_number || "",
      cost_code_name: item?.cost_code_name || "",
      division_name: item?.division_name || "",
      item_type_label: item?.item_type_label || "",
      sequence: "",
      location_display: item?.location_label || "",
      unit_label: item?.unit_label || "",
      unit_uuid: item?.unit_uuid || null,
      item_name: item?.item_name || "",
      model_number: item?.model_number || "",
    };

    const mappedItem = {
      id,
      uuid: item?.uuid || null,
      source: item?.source || null,
      cost_code_uuid: item?.cost_code_uuid || null,
      cost_code_label: item?.cost_code_label || "",
      cost_code_number: item?.cost_code_number || "",
      cost_code_name: item?.cost_code_name || "",
      division_name: item?.division_name || "",
      item_type_uuid: item?.item_type_uuid || null,
      item_type_label: item?.item_type_label || "",
      item_uuid: item?.item_uuid || null,
      name: item?.item_name || item?.name || "",
      item_name: item?.item_name || "",
      description: item?.description || "",
      model_number: item?.model_number || "",
      location_uuid: item?.location_uuid || null,
      location: item?.location_label || "",
      unit_uuid: item?.unit_uuid || null,
      unit_label: item?.unit_label || "",
      unit: item?.unit_label || "",
      quantity: toNullableNumber(item?.quantity),
      unit_price: toNullableNumber(item?.unit_price),
      po_quantity: toNullableNumber(item?.po_quantity),
      po_unit_price: toNullableNumber(item?.po_unit_price),
      po_total: toNullableNumber(item?.po_total),
      total: item?.total ?? null,
      // Map approval_checks_uuids (from DB) to approval_checks (for form)
      approval_checks: (() => {
        const fromUuids = Array.isArray(item?.approval_checks_uuids) && item.approval_checks_uuids.length > 0
          ? item.approval_checks_uuids
          : null;
        const fromChecks = Array.isArray(item?.approval_checks) && item.approval_checks.length > 0
          ? item.approval_checks
          : null;
        const result = fromUuids || fromChecks || [];
        return result;
      })(),
      display_metadata: displayMetadata,
      metadata: item?.metadata || {},
    };

    return mappedItem;
  };

  const toNumberOrNull = (value: any): number | null => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const prepareItemsForSave = (items: any[] = []) => {
    return items.map((item, index) => {
      const hasValue = (value: any) =>
        value !== null && value !== undefined && value !== "";

      // Estimate fields (read-only in UI, should always reflect original estimate)
      // quantity/unit_price/total are meant to represent the estimate snapshot and
      // MUST NOT be changed when the user edits PO values. However, during PO editing
      // we might accidentally derive/display them from PO fields. To be safe, we
      // recompute the estimate quantity from the estimate total + unit price here.
      const baseUnitPrice = toNumberOrNull(item?.unit_price);
      const baseTotal = toNumberOrNull(item?.total);
      let baseQuantity = toNumberOrNull(item?.quantity);

      if (
        baseTotal !== null &&
        baseUnitPrice !== null &&
        baseUnitPrice !== 0
      ) {
        // Derive estimate quantity from total / unit_price. This allows us to
        // keep the grey estimate quantity stable even if quantity was
        // accidentally changed elsewhere.
        baseQuantity =
          Math.round(
            (baseTotal / baseUnitPrice + Number.EPSILON) * 10000
          ) / 10000;
      }

      const poQuantityRaw = hasValue(item?.po_quantity)
        ? item?.po_quantity
        : null;
      let poQuantity = toNumberOrNull(poQuantityRaw);

      const poUnitPriceRaw = hasValue(item?.po_unit_price)
        ? item?.po_unit_price
        : null;
      let poUnitPrice = toNumberOrNull(poUnitPriceRaw);

      const poTotalRaw = hasValue(item?.po_total)
        ? item?.po_total
        : hasValue(item?.po_unit_price) && hasValue(item?.po_quantity)
        ? Number(item.po_unit_price) * Number(item.po_quantity)
        : null;
      let poTotal = toNumberOrNull(poTotalRaw);

      if (poTotal === null && poQuantity !== null && poUnitPrice !== null) {
        poTotal =
          Math.round((poQuantity * poUnitPrice + Number.EPSILON) * 100) / 100;
      }

      if (
        poUnitPrice === null &&
        poTotal !== null &&
        poQuantity !== null &&
        poQuantity !== 0
      ) {
        poUnitPrice =
          Math.round((poTotal / poQuantity + Number.EPSILON) * 100) / 100;
      }

      if (
        poQuantity === null &&
        poTotal !== null &&
        poUnitPrice !== null &&
        poUnitPrice !== 0
      ) {
        poQuantity =
          Math.round((poTotal / poUnitPrice + Number.EPSILON) * 100) / 100;
      }

      if (poQuantity === null) {
        poQuantity = baseQuantity;
      }

      if (
        poUnitPrice === null &&
        poTotal !== null &&
        poQuantity !== null &&
        poQuantity !== 0
      ) {
        poUnitPrice =
          Math.round((poTotal / poQuantity + Number.EPSILON) * 100) / 100;
      }

      if (poUnitPrice === null) {
        poUnitPrice = baseUnitPrice;
      }

      if (poTotal === null && poQuantity !== null && poUnitPrice !== null) {
        poTotal =
          Math.round((poQuantity * poUnitPrice + Number.EPSILON) * 100) / 100;
      }

      return {
        ...item,
        // Ensure estimate snapshot fields are consistent and not polluted by PO edits
        quantity: baseQuantity,
        unit_price: baseUnitPrice,
        total: baseTotal,
        order_index: item?.order_index ?? index,
        po_quantity: poQuantity,
        po_unit_price: poUnitPrice,
        po_total: poTotal,
      };
    });
  };

  const overlayFields: (keyof PurchaseOrder)[] = [
    "item_total",
    "charges_total",
    "tax_total",
    "total_po_amount",
    "freight_charges_percentage",
    "freight_charges_amount",
    "freight_charges_taxable",
    "packing_charges_percentage",
    "packing_charges_amount",
    "packing_charges_taxable",
    "custom_duties_percentage",
    "custom_duties_amount",
    "custom_duties_taxable",
    "other_charges_percentage",
    "other_charges_amount",
    "other_charges_taxable",
    "sales_tax_1_percentage",
    "sales_tax_1_amount",
    "sales_tax_2_percentage",
    "sales_tax_2_amount",
  ];

  const overlayPurchaseOrderValues = (
    target: PurchaseOrder,
    source?: Partial<PurchaseOrder> | null
  ) => {
    if (!target || !source) return target;
    overlayFields.forEach((field) => {
      const value = source[field];
      if (value !== undefined && value !== null) {
        (target as any)[field] = value;
      }
    });
    if (Array.isArray(source.po_items)) {
      target.po_items = source.po_items;
    }
    if (Array.isArray(source.attachments)) {
      target.attachments = source.attachments;
    }
    if (Array.isArray((source as any).removed_po_items)) {
      (target as any).removed_po_items = (source as any).removed_po_items;
    }
    return target;
  };

  const isClient = typeof window !== "undefined";

const toNumericOrNull = (value: any): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeFinancialBreakdown = (
  breakdown: unknown
): Record<string, any> | null => {
  if (!breakdown) return null;
  if (typeof breakdown === "string") {
    try {
      const parsed = JSON.parse(breakdown);
      return typeof parsed === "object" && parsed !== null ? parsed : null;
    } catch {
      return null;
    }
  }
  if (typeof breakdown === "object") {
    return breakdown as Record<string, any>;
  }
  return null;
};

const applyFinancialBreakdownTotals = <T extends Record<string, any>>(order: T): T => {
  if (!order) return order;

  const breakdown =
    normalizeFinancialBreakdown(
      (order as any).financial_breakdown ?? (order as any).financialBreakdown
    ) ?? {};

  const totalsSource =
    breakdown.totals ??
    breakdown.total_breakdown ??
    breakdown.totals_breakdown ??
    {};

  const itemTotal =
    toNumericOrNull(totalsSource.item_total ?? totalsSource.itemTotal) ?? null;
  const chargesTotal =
    toNumericOrNull(totalsSource.charges_total ?? totalsSource.chargesTotal) ??
    null;
  const taxTotal =
    toNumericOrNull(totalsSource.tax_total ?? totalsSource.taxTotal) ?? null;
  const totalAmount =
    toNumericOrNull(
      totalsSource.total_po_amount ??
        totalsSource.totalAmount ??
        totalsSource.total_po ??
        totalsSource.total
    ) ?? null;

  if (itemTotal !== null) {
    (order as any).item_total = itemTotal;
  }
  if (chargesTotal !== null) {
    (order as any).charges_total = chargesTotal;
  }
  if (taxTotal !== null) {
    (order as any).tax_total = taxTotal;
  }
  if (totalAmount !== null) {
    (order as any).total_po_amount = totalAmount;
  }

  (order as any).financial_breakdown = breakdown;

  return order;
};

const normalizePurchaseOrderRecord = (raw: any): PurchaseOrder => {
  const normalized: any = {
    ...raw,
  };

  if (!Array.isArray(normalized.po_items)) {
    normalized.po_items = Array.isArray(raw?.po_items) ? raw.po_items : [];
  }

  if (!Array.isArray(normalized.attachments)) {
    normalized.attachments = Array.isArray(raw?.attachments)
      ? raw.attachments
      : [];
  }

  if (!Array.isArray(normalized.removed_po_items)) {
    normalized.removed_po_items = Array.isArray(raw?.removed_po_items)
      ? raw.removed_po_items
      : [];
  }

  return applyFinancialBreakdownTotals(normalized) as PurchaseOrder;
};

  const savePurchaseOrderItems = async (
    purchaseOrderUuid: string,
    corporationUuid?: string | null,
    projectUuid?: string | null,
    items: any[] = []
  ) => {
    try {
      const preparedItems = prepareItemsForSave(items);
      await $fetch("/api/purchase-order-items", {
        method: "POST",
        body: {
          purchase_order_uuid: purchaseOrderUuid,
          corporation_uuid: corporationUuid ?? null,
          project_uuid: projectUuid ?? null,
          items: preparedItems,
        },
      });
    } catch (error) {
      console.error("Error saving purchase order items:", error);
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
   * Fetch purchase orders for a specific corporation with pagination
   */
  const fetchPurchaseOrders = async (
    corporationUUID: string,
    forceRefresh = false,
    page = 1,
    pageSize = 100
  ) => {
    if (process.server) return;

    const shouldFetch = shouldFetchData(corporationUUID);
    if (!forceRefresh && !shouldFetch && page === 1) {
      return;
    }

    // Check if this page is already loaded
    const corpKey = corporationUUID;
    if (!loadedPages.value[corpKey]) {
      loadedPages.value[corpKey] = new Set();
    }
    if (!forceRefresh && loadedPages.value[corpKey].has(page)) {
      return; // Page already loaded
    }

    error.value = null;

    // Load from cache only for first page and if not forcing refresh
    if (
      isClient &&
      !forceRefresh &&
      page === 1 &&
      (!purchaseOrders.value.length || shouldFetch)
    ) {
      try {
        const cached = await dbHelpers.getPurchaseOrders(corporationUUID);
        if (cached.length) {
          purchaseOrders.value = cached.map((po) =>
            normalizePurchaseOrderRecord(po)
          ) as PurchaseOrder[];
          lastFetchedCorporation.value = corporationUUID;
          hasDataForCorporation.value.add(corporationUUID);
          // Mark first page as loaded
          loadedPages.value[corpKey].add(1);
        }
      } catch (cacheError) {
        console.error("Error loading cached purchase orders:", cacheError);
      }
    }

    loading.value = true;
    try {
      const response = await $fetch<PurchaseOrdersResponse>(
        `/api/purchase-order-forms?corporation_uuid=${corporationUUID}&page=${page}&page_size=${pageSize}`
      );
      if (response?.error) throw new Error(response.error);

      const orders = Array.isArray(response?.data) ? response.data : [];
      const normalizedOrders = orders.map((po) =>
        normalizePurchaseOrderRecord(po)
      );

      // Merge with existing orders (avoid duplicates)
      if (page === 1) {
        purchaseOrders.value = normalizedOrders;
      } else {
        // For subsequent pages, merge and avoid duplicates
        const existingUuids = new Set(purchaseOrders.value.map(po => po.uuid));
        const newOrders = normalizedOrders.filter(po => po.uuid && !existingUuids.has(po.uuid));
        purchaseOrders.value = [...purchaseOrders.value, ...newOrders];
      }

      // Store pagination info
      if (response.pagination) {
        paginationInfo.value[corpKey] = response.pagination;
      }

      // Mark this page as loaded
      loadedPages.value[corpKey].add(page);

      lastFetchedCorporation.value = corporationUUID;
      hasDataForCorporation.value.add(corporationUUID);

      if (isClient) {
        try {
          await dbHelpers.savePurchaseOrders(
            corporationUUID,
            purchaseOrders.value
          );
        } catch (cacheError) {
          console.error("Failed to cache purchase orders:", cacheError);
        }
      }
    } catch (err: any) {
      console.error("Error fetching purchase orders:", err);
      error.value = err.message || "Failed to fetch purchase orders";
      if (isClient && page === 1) {
        try {
          const cached = await dbHelpers.getPurchaseOrders(corporationUUID);
          if (cached.length) {
            purchaseOrders.value = cached.map((po) =>
              normalizePurchaseOrderRecord(po)
            ) as PurchaseOrder[];
            error.value = null;
            lastFetchedCorporation.value = corporationUUID;
            hasDataForCorporation.value.add(corporationUUID);
          } else {
            purchaseOrders.value = [];
            hasDataForCorporation.value.delete(corporationUUID);
          }
        } catch (cacheError) {
          console.error("Error loading cached purchase orders:", cacheError);
          purchaseOrders.value = [];
          hasDataForCorporation.value.delete(corporationUUID);
        }
      } else {
        if (page === 1) {
          purchaseOrders.value = [];
          hasDataForCorporation.value.delete(corporationUUID);
        }
      }
    } finally {
      loading.value = false;
    }
  };

  /**
   * Load more purchase orders (next page) for lazy loading
   */
  const loadMorePurchaseOrders = async (corporationUUID: string) => {
    const corpKey = corporationUUID;
    const currentPagination = paginationInfo.value[corpKey];
    
    if (!currentPagination || !currentPagination.hasMore) {
      return; // No more pages to load
    }

    const nextPage = currentPagination.page + 1;
    await fetchPurchaseOrders(corporationUUID, false, nextPage);
  };

  /**
   * Get pagination info for a corporation
   */
  const getPaginationInfo = (corporationUUID: string): PaginationInfo | null => {
    return paginationInfo.value[corporationUUID] || null;
  };

  /**
   * Fetch a single purchase order by UUID
   */
  const fetchPurchaseOrder = async (
    uuid: string
  ): Promise<PurchaseOrder | null> => {
    loading.value = true;
    error.value = null;
    try {
      const response = await $fetch<PurchaseOrderResponse>(
        `/api/purchase-order-forms/${uuid}`
      );
      if (response?.error) throw new Error(response.error);

      let purchaseOrder: PurchaseOrder | null = response?.data || null;

      if (purchaseOrder) {
        purchaseOrder = normalizePurchaseOrderRecord(purchaseOrder);
      }

      if (purchaseOrder?.uuid) {
        if (!Array.isArray((purchaseOrder as any).removed_po_items)) {
          (purchaseOrder as any).removed_po_items = [];
        }
        
        // Check PO type to determine what items to load
        const normalizedPoType = (purchaseOrder.po_type || "").toUpperCase();
        const isLaborPO = normalizedPoType === "LABOR";
        
        // For LABOR POs, labor items should already be in the response from the API
        if (isLaborPO) {
          // Ensure labor_po_items exists and is an array
          if (!Array.isArray((purchaseOrder as any).labor_po_items)) {
            (purchaseOrder as any).labor_po_items = [];
          }
          // Material items should be empty for labor POs
          purchaseOrder.po_items = [];
        } else {
          // For MATERIAL POs, fetch material items
          try {
            const itemsResponse = await $fetch<{
              data: any[];
            }>(
              `/api/purchase-order-items?purchase_order_uuid=${purchaseOrder.uuid}`
            );

            const allItems = Array.isArray(itemsResponse?.data)
              ? itemsResponse.data.map((item: any, index: number) =>
                  mapStoredItemToFormItem(item, index)
                )
              : [];

            // Filter out items that are in removed_po_items
            const removedItems = Array.isArray((purchaseOrder as any).removed_po_items)
              ? (purchaseOrder as any).removed_po_items
              : [];
            
            if (removedItems.length > 0) {
              // Build a set of removed item_uuids for efficient lookup
              const removedItemUuids = new Set<string>();
              removedItems.forEach((removedItem: any) => {
                if (removedItem?.item_uuid) {
                  removedItemUuids.add(String(removedItem.item_uuid).toLowerCase());
                }
              });

              // Filter out removed items
              purchaseOrder.po_items = allItems.filter((item: any) => {
                if (item?.item_uuid) {
                  const itemUuid = String(item.item_uuid).toLowerCase();
                  const isRemoved = removedItemUuids.has(itemUuid);
                  return !isRemoved;
                }
                return true; // Keep items without item_uuid
              });
            } else {
              purchaseOrder.po_items = allItems;
            }

          // Restore original estimate values from the estimate (only for MATERIAL POs)
          // When a PO is saved, quantity/unit_price/total get overwritten with PO values
          // We need to restore them from the estimate so grey fields show correct values
          if (!isLaborPO && purchaseOrder.project_uuid && purchaseOrder.corporation_uuid) {
            try {
              // Get the latest estimate for this project
              const { useEstimatesStore } = await import('@/stores/estimates');
              const estimatesStore = useEstimatesStore();
              
              // Ensure estimates are loaded
              await estimatesStore.fetchEstimates(purchaseOrder.corporation_uuid);
              
              // Find the latest estimate for this project
              // Support both ref-style (estimates.value) and plain array (estimates)
              let allEstimatesRaw: any[] = [];
              const estimatesValue = (estimatesStore as any).estimates;
              
              if (Array.isArray(estimatesValue)) {
                allEstimatesRaw = estimatesValue;
              } else if (estimatesValue && typeof estimatesValue === 'object' && 'value' in estimatesValue) {
                // It's a ref
                allEstimatesRaw = Array.isArray(estimatesValue.value) ? estimatesValue.value : [];
              } else {
                // Fallback: try to access value directly
                allEstimatesRaw = [];
              }

              const projectEstimates = Array.isArray(allEstimatesRaw) 
                ? allEstimatesRaw.filter(
                    (est: any) => est && est.project_uuid === purchaseOrder.project_uuid
                  )
                : [];
              
              if (projectEstimates.length > 0) {
                // Sort by estimate_date descending to get the latest
                const sorted = [...projectEstimates].sort((a: any, b: any) => {
                  const dateA = a.estimate_date ? new Date(a.estimate_date).getTime() : 0;
                  const dateB = b.estimate_date ? new Date(b.estimate_date).getTime() : 0;
                  return dateB - dateA;
                });
                
                const latestEstimate = sorted[0];
                const estimateUuid = latestEstimate?.uuid;
                
                if (estimateUuid) {
                  // Fetch estimate items for this estimate
                  const { usePurchaseOrderResourcesStore } = await import('@/stores/purchaseOrderResources');
                  const poResourcesStore = usePurchaseOrderResourcesStore();
                  
                  await poResourcesStore.ensureEstimateItems({
                    corporationUuid: purchaseOrder.corporation_uuid,
                    projectUuid: purchaseOrder.project_uuid,
                    estimateUuid,
                  });
                  
                  // Get estimate items (these contain the original estimate values)
                  const estimateItems = poResourcesStore.getEstimateItems(
                    purchaseOrder.corporation_uuid,
                    purchaseOrder.project_uuid,
                    estimateUuid
                  );
                  
                  // Create a map of estimate items by item_uuid for quick lookup
                  const estimateItemsMap = new Map<string, any>();
                  estimateItems.forEach((estItem: any) => {
                    if (estItem.item_uuid) {
                      estimateItemsMap.set(String(estItem.item_uuid).toLowerCase(), estItem);
                    }
                  });
                  
                  // Restore original estimate values for each PO item
                  // Estimate values (quantity, unit_price, total) should always come from the estimate
                  purchaseOrder.po_items = purchaseOrder.po_items.map((poItem: any) => {
                    if (!poItem.item_uuid) return poItem;
                    
                    const itemUuidKey = String(poItem.item_uuid).toLowerCase();
                    const estimateItem = estimateItemsMap.get(itemUuidKey);
                    
                    if (estimateItem) {
                      // Always restore original estimate values from the estimate
                      // These are the greyed-out read-only values that should never change
                      return {
                        ...poItem,
                        quantity: estimateItem.quantity ?? poItem.quantity,
                        unit_price: estimateItem.unit_price ?? poItem.unit_price,
                        total: estimateItem.total ?? (estimateItem.quantity && estimateItem.unit_price 
                          ? estimateItem.quantity * estimateItem.unit_price 
                          : poItem.total),
                      };
                    }
                    
                    return poItem;
                  });
                }
              }
            } catch (estimateError) {
              console.warn("Failed to restore estimate values for PO items:", estimateError);
              // Continue without restoring estimate values - not critical
            }
          }
          } catch (itemsError) {
            console.error("Error fetching purchase order item list:", itemsError);
            purchaseOrder.po_items = purchaseOrder.po_items || [];
          }
        }

        currentPurchaseOrder.value = purchaseOrder;

        if (isClient && purchaseOrder?.corporation_uuid) {
          try {
            await dbHelpers.updatePurchaseOrder(
              purchaseOrder.corporation_uuid,
              purchaseOrder
            );
          } catch (cacheError) {
            console.error(
              "Failed to cache individual purchase order:",
              cacheError
            );
          }
        }
      }

      return purchaseOrder;
    } catch (err: any) {
      error.value = err.message || "Failed to fetch purchase order";
      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Create a new purchase order
   */
  const createPurchaseOrder = async (
    poData: CreatePurchaseOrderPayload
  ): Promise<PurchaseOrder | null> => {
    loading.value = true;
    error.value = null;
    try {
      const response = await $fetch<PurchaseOrderResponse>(
        "/api/purchase-order-forms",
        {
          method: "POST",
          body: poData,
        }
      );
      if (response?.error) throw new Error(response.error);

      const newPO = response?.data;
      if (newPO) {
        let uploadedAttachments: any[] | null = null;
        if (newPO.uuid) {
          uploadedAttachments = await uploadAttachmentsForPurchaseOrder(
            newPO.uuid,
            poData.attachments || []
          );
        }

        if (uploadedAttachments) {
          newPO.attachments = uploadedAttachments;
        }

        if (newPO.uuid) {
          await savePurchaseOrderItems(
            newPO.uuid,
            newPO.corporation_uuid,
            newPO.project_uuid,
            poData.po_items || []
          );
        }

        newPO.po_items = poData.po_items || [];
        newPO.removed_po_items = poData.removed_po_items || [];
        overlayPurchaseOrderValues(newPO, poData as Partial<PurchaseOrder>);
        applyFinancialBreakdownTotals(newPO);

        // Store in IndexedDB with the correct corporation_uuid
        // This ensures data is saved to the correct corporation's IndexedDB
        if (isClient && newPO.corporation_uuid) {
          try {
            await dbHelpers.addPurchaseOrder(newPO.corporation_uuid, newPO);
          } catch (cacheError) {
            console.error(
              "Failed to cache created purchase order:",
              cacheError
            );
          }
        }

        // Only add to local store if it matches the currently selected corporation
        // This prevents showing purchase orders from other corporations in the list
        // Similar to how Estimates store handles this
        const corpStore = useCorporationStore();
        if (newPO.corporation_uuid === corpStore.selectedCorporationId) {
          purchaseOrders.value.unshift(newPO);
        }

        // Always update currentPurchaseOrder (regardless of selected corporation)
        // This ensures the form shows the created data
        currentPurchaseOrder.value = newPO;

        if (poData.corporation_uuid) {
          hasDataForCorporation.value.delete(poData.corporation_uuid);
        }

        // Clear purchaseOrderResources store after successful save
        // This ensures estimate items and other resources are cleared when PO is saved
        if (isClient) {
          try {
            const { usePurchaseOrderResourcesStore } = await import(
              "@/stores/purchaseOrderResources"
            );
            const poResourcesStore = usePurchaseOrderResourcesStore();
            poResourcesStore.clear();
            console.log(
              "[PO Store] Cleared purchaseOrderResources store after successful create"
            );
          } catch (clearError) {
            console.warn(
              "[PO Store] Failed to clear purchaseOrderResources store:",
              clearError
            );
          }
        }
      }
      return newPO || null;
    } catch (err: any) {
      error.value = err.message || "Failed to create purchase order";
      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Update an existing purchase order
   */
  const updatePurchaseOrder = async (
    poData: UpdatePurchaseOrderPayload
  ): Promise<PurchaseOrder | null> => {
    loading.value = true;
    error.value = null;
    try {
      const response = await $fetch<PurchaseOrderResponse>(
        "/api/purchase-order-forms",
        {
          method: "PUT",
          body: poData,
        }
      );
      if (response?.error) throw new Error(response.error);

      const updatedPO = response?.data;
      if (updatedPO) {
        // Normalize the response data first
        let normalized = normalizePurchaseOrderRecord(updatedPO);

        let uploadedAttachments: any[] | null = null;
        if (normalized.uuid) {
          uploadedAttachments = await uploadAttachmentsForPurchaseOrder(
            normalized.uuid,
            poData.attachments || []
          );
        }

        if (uploadedAttachments) {
          normalized.attachments = uploadedAttachments;
        }

        if (normalized.uuid) {
          await savePurchaseOrderItems(
            normalized.uuid,
            normalized.corporation_uuid,
            normalized.project_uuid,
            poData.po_items || []
          );
        }

        // Merge form data back into response (like Change Orders)
        normalized.po_items = poData.po_items || [];
        normalized.removed_po_items = poData.removed_po_items || [];
        overlayPurchaseOrderValues(
          normalized,
          poData as Partial<PurchaseOrder>
        );
        applyFinancialBreakdownTotals(normalized);

        // Store in IndexedDB with the correct corporation_uuid
        // This ensures data is saved to the correct corporation's IndexedDB
        if (isClient && normalized.corporation_uuid) {
          try {
            await dbHelpers.updatePurchaseOrder(
              normalized.corporation_uuid,
              normalized
            );
          } catch (cacheError) {
            console.error(
              "Failed to cache updated purchase order:",
              cacheError
            );
          }
        }

        // Only update in local store if it matches the currently selected corporation
        // This prevents showing purchase orders from other corporations in the list
        // Similar to how Estimates store handles this
        const corpStore = useCorporationStore();
        if (normalized.corporation_uuid === corpStore.selectedCorporationId) {
          const index = purchaseOrders.value.findIndex(
            (p) => p.uuid === normalized.uuid
          );
          if (index !== -1) {
            purchaseOrders.value[index] = normalized;
          } else {
            // If PO doesn't exist in store but corporation matches, add it
            // This handles the case where PO was created/updated for the selected corporation
            purchaseOrders.value.push(normalized);
          }
        }

        // Always update currentPurchaseOrder if it matches (regardless of selected corporation)
        // This ensures the form shows the updated data
        if (currentPurchaseOrder.value?.uuid === normalized.uuid) {
          currentPurchaseOrder.value = normalized;
        }

        if (normalized.corporation_uuid) {
          hasDataForCorporation.value.delete(normalized.corporation_uuid);
        }

        // Clear purchaseOrderResources store after successful save
        // This ensures estimate items and other resources are cleared when PO is saved
        if (isClient) {
          try {
            const { usePurchaseOrderResourcesStore } = await import(
              "@/stores/purchaseOrderResources"
            );
            const poResourcesStore = usePurchaseOrderResourcesStore();
            poResourcesStore.clear();
            console.log(
              "[PO Store] Cleared purchaseOrderResources store after successful update"
            );
          } catch (clearError) {
            console.warn(
              "[PO Store] Failed to clear purchaseOrderResources store:",
              clearError
            );
          }
        }

        return normalized;
      }
      return null;
    } catch (err: any) {
      error.value = err.message || "Failed to update purchase order";
      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Delete a purchase order
   */
  const deletePurchaseOrder = async (uuid: string): Promise<boolean> => {
    loading.value = true;
    error.value = null;
    try {
      const response = await $fetch<PurchaseOrderResponse>(
        "/api/purchase-order-forms",
        {
          method: "DELETE",
          query: { uuid },
        }
      );
      if (response?.error) throw new Error(response.error);

      const index = purchaseOrders.value.findIndex((p) => p.uuid === uuid);
      if (index !== -1) {
        const po = purchaseOrders.value[index];
        if (po) {
          purchaseOrders.value.splice(index, 1);
          if (currentPurchaseOrder.value?.uuid === uuid) {
            currentPurchaseOrder.value = null;
          }
          if (po.corporation_uuid) {
            hasDataForCorporation.value.delete(po.corporation_uuid);
            if (isClient) {
              try {
                await dbHelpers.deletePurchaseOrder(po.corporation_uuid, uuid);
              } catch (cacheError) {
                console.error(
                  "Failed to remove cached purchase order:",
                  cacheError
                );
              }
            }
          }
        }
      }
      return true;
    } catch (err: any) {
      error.value = err.message || "Failed to delete purchase order";
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Clear current purchase order
   */
  const clearCurrentPurchaseOrder = () => {
    currentPurchaseOrder.value = null;
  };

  /**
   * Get purchase orders by status
   */
  const getPurchaseOrdersByStatus = (
    status: PurchaseOrder["status"]
  ): PurchaseOrder[] => {
    return purchaseOrders.value.filter((po) => po.status === status);
  };

  /**
   * Get purchase order statistics
   */
  const getPurchaseOrderStats = () => {
    const total = purchaseOrders.value.length;
    const byStatus = {
      Draft: purchaseOrders.value.filter((p) => p.status === "Draft").length,
      Ready: purchaseOrders.value.filter((p) => p.status === "Ready")
        .length,
      Approved: purchaseOrders.value.filter((p) => p.status === "Approved")
        .length,
      Rejected: purchaseOrders.value.filter((p) => p.status === "Rejected")
        .length,
      Partially_Received: purchaseOrders.value.filter((p) => p.status === "Partially_Received")
        .length,
      Completed: purchaseOrders.value.filter((p) => p.status === "Completed")
        .length,
    };

    const totalAmount = purchaseOrders.value.reduce(
      (sum, po) => sum + (po.total_po_amount || 0),
      0
    );

    return {
      total,
      byStatus,
      totalAmount,
    };
  };

  /**
   * Update a purchase order in the list (for external updates like receipt notes)
   * This ensures proper reactivity when updating from outside the store
   */
  const updatePurchaseOrderInList = (updatedPO: PurchaseOrder) => {
    if (!updatedPO?.uuid) return;
    // Normalize the data before storing (ensures consistency)
    const normalized = normalizePurchaseOrderRecord(updatedPO);
    const index = purchaseOrders.value.findIndex((p) => p.uuid === normalized.uuid);
    if (index !== -1) {
      purchaseOrders.value[index] = normalized;
    } else {
      // If not found in array, add it (shouldn't happen, but handle gracefully)
      purchaseOrders.value.push(normalized);
    }
    // Also update currentPurchaseOrder if it matches
    if (currentPurchaseOrder.value?.uuid === normalized.uuid) {
      currentPurchaseOrder.value = normalized;
    }
    // Update IndexedDB cache
    if (isClient && normalized.corporation_uuid) {
      dbHelpers.updatePurchaseOrder(normalized.corporation_uuid, normalized).catch((cacheError: any) => {
        console.error("Failed to cache updated purchase order:", cacheError);
      });
    }
  };

  /**
   * Clear all data
   */
  const clearData = () => {
    const corpId = lastFetchedCorporation.value;
    purchaseOrders.value = [];
    currentPurchaseOrder.value = null;
    error.value = null;
    lastFetchedCorporation.value = null;
    hasDataForCorporation.value.clear();
    if (isClient && corpId) {
      dbHelpers.clearPurchaseOrders(corpId).catch((cacheError: any) => {
        console.error("Failed to clear cached purchase orders:", cacheError);
      });
    }
  };

  return {
    // State
    purchaseOrders: readonly(purchaseOrders),
    currentPurchaseOrder,
    loading: readonly(loading),
    error: readonly(error),
    paginationInfo: readonly(paginationInfo),

    // Actions
    fetchPurchaseOrders,
    loadMorePurchaseOrders,
    getPaginationInfo,
    fetchPurchaseOrder,
    createPurchaseOrder,
    updatePurchaseOrder,
    updatePurchaseOrderInList,
    deletePurchaseOrder,
    clearCurrentPurchaseOrder,
    getPurchaseOrdersByStatus,
    getPurchaseOrderStats,
    clearData,
  };
});

