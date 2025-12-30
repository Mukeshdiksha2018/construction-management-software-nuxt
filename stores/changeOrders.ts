import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import { dbHelpers } from '@/utils/indexedDb'
import { useAuthStore } from './auth'

export interface COItem {
  order_index?: number
  source?: string | null
  cost_code_uuid?: string | null
  cost_code_label?: string | null
  cost_code_number?: string | null
  cost_code_name?: string | null
  division_name?: string | null
  item_type_uuid?: string | null
  item_type_label?: string | null
  item_uuid?: string | null
  item_name?: string | null
  name?: string | null
  description?: string | null
  model_number?: string | null
  location_uuid?: string | null
  location_label?: string | null
  unit_uuid?: string | null
  unit_label?: string | null
  quantity?: number | null
  unit_price?: number | null
  co_quantity?: number | null
  co_unit_price?: number | null
  co_total?: number | null
  total?: number | null
  metadata?: Record<string, any>
}

export interface ChangeOrder {
  uuid?: string
  corporation_uuid: string
  project_uuid?: string | null
  vendor_uuid?: string | null
  original_purchase_order_uuid?: string | null
  co_number?: string | null
  created_date?: string | null
  credit_days?: string | null
  estimated_delivery_date?: string | null
  requested_by?: string | null
  co_type?: string | null
  ship_via_uuid?: string | null
  freight_uuid?: string | null
  shipping_instructions?: string | null
  reason?: string | null
  shipping_address_uuid?: string | null
  status?: "Draft" | "Ready" | "Approved" | "Rejected" | "Partially_Received" | "Completed"
  is_active?: boolean
  // Financial fields (mirror purchase order fields for FinancialBreakdown component)
  item_total?: number
  freight_charges_percentage?: number
  freight_charges_amount?: number
  freight_charges_taxable?: boolean
  packing_charges_percentage?: number
  packing_charges_amount?: number
  packing_charges_taxable?: boolean
  custom_duties_charges_percentage?: number
  custom_duties_charges_amount?: number
  custom_duties_charges_taxable?: boolean
  other_charges_percentage?: number
  other_charges_amount?: number
  other_charges_taxable?: boolean
  charges_total?: number
  sales_tax_1_percentage?: number
  sales_tax_1_amount?: number
  sales_tax_2_percentage?: number
  sales_tax_2_amount?: number
  tax_total?: number
  total_co_amount?: number
  financial_breakdown?: Record<string, any> | null
  attachments?: any[]
  co_items?: COItem[]
  removed_co_items?: COItem[]
  // Metadata fields for list display (from joined tables)
  project_name?: string | null
  project_id?: string | null
  vendor_name?: string | null
  po_number?: string | null
  // Audit log
  audit_log?: any[] | null
}

export interface ChangeOrderResponse {
  data: ChangeOrder
  error?: string
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ChangeOrdersResponse {
  data: ChangeOrder[]
  pagination?: PaginationInfo
  error?: string
}

export const useChangeOrdersStore = defineStore('changeOrders', () => {
  const changeOrders = ref<ChangeOrder[]>([])
  const currentChangeOrder = ref<ChangeOrder | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Cache management
  const lastFetchedCorporation = ref<string | null>(null)
  const hasDataForCorporation = ref<Set<string>>(new Set())
  const isClient = typeof window !== 'undefined'
  
  // Pagination state
  const paginationInfo = ref<Record<string, PaginationInfo>>({})
  const loadedPages = ref<Record<string, Set<number>>>({})

  // --- Financial breakdown normalization (similar to purchaseOrders store) ---
  const toNumericOrNull = (value: any): number | null => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null
    }
    if (value === null || value === undefined || value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  const normalizeFinancialBreakdown = (
    breakdown: unknown
  ): Record<string, any> | null => {
    if (!breakdown) return null
    if (typeof breakdown === 'string') {
      try {
        const parsed = JSON.parse(breakdown)
        return typeof parsed === 'object' && parsed !== null ? parsed : null
      } catch {
        return null
      }
    }
    if (typeof breakdown === 'object') {
      return breakdown as Record<string, any>
    }
    return null
  }

  const applyFinancialBreakdownTotals = <T extends Record<string, any>>(order: T): T => {
    if (!order) return order

    const breakdown =
      normalizeFinancialBreakdown(
        (order as any).financial_breakdown ?? (order as any).financialBreakdown
      ) ?? {}

    // Totals
    const totalsSource =
      breakdown.totals ??
      breakdown.total_breakdown ??
      breakdown.totals_breakdown ??
      {}

    const itemTotal =
      toNumericOrNull(totalsSource.item_total ?? totalsSource.itemTotal) ?? null
    const chargesTotal =
      toNumericOrNull(totalsSource.charges_total ?? totalsSource.chargesTotal) ??
      null
    const taxTotal =
      toNumericOrNull(totalsSource.tax_total ?? totalsSource.taxTotal) ?? null
    const totalAmount =
      toNumericOrNull(
        totalsSource.total_co_amount ??
          totalsSource.totalCoAmount ??
          totalsSource.total_co ??
          totalsSource.total
      ) ?? null

    if (itemTotal !== null) {
      ;(order as any).item_total = itemTotal
    }
    if (chargesTotal !== null) {
      ;(order as any).charges_total = chargesTotal
    }
    if (taxTotal !== null) {
      ;(order as any).tax_total = taxTotal
    }
    if (totalAmount !== null) {
      ;(order as any).total_co_amount = totalAmount
    }

    // Charges: freight, packing, custom_duties, other
    const charges = breakdown.charges ?? {}
    const chargeKeys = ['freight', 'packing', 'custom_duties', 'other'] as const

    chargeKeys.forEach((key) => {
      const entry = charges[key] ?? {}
      const pctKey =
        key === 'custom_duties'
          ? 'custom_duties_charges_percentage'
          : `${key}_charges_percentage`
      const amtKey =
        key === 'custom_duties'
          ? 'custom_duties_charges_amount'
          : `${key}_charges_amount`
      const taxableKey =
        key === 'custom_duties'
          ? 'custom_duties_charges_taxable'
          : `${key}_charges_taxable`

      if (entry.percentage !== undefined && entry.percentage !== null) {
        ;(order as any)[pctKey] = entry.percentage
      }
      if (entry.amount !== undefined && entry.amount !== null) {
        ;(order as any)[amtKey] = entry.amount
      }
      if (entry.taxable !== undefined && entry.taxable !== null) {
        ;(order as any)[taxableKey] = entry.taxable
      }
    })

    // Sales taxes
    const salesTaxes = breakdown.sales_taxes ?? {}
    const salesKeys = ['sales_tax_1', 'sales_tax_2'] as const

    salesKeys.forEach((key) => {
      const entry = salesTaxes[key] ?? {}
      const pctKey = `${key}_percentage`
      const amtKey = `${key}_amount`

      if (entry.percentage !== undefined && entry.percentage !== null) {
        ;(order as any)[pctKey] = entry.percentage
      }
      if (entry.amount !== undefined && entry.amount !== null) {
        ;(order as any)[amtKey] = entry.amount
      }
    })

    ;(order as any).financial_breakdown = breakdown

    return order
  }

  // Overlay fields that should be preserved from form data
  const overlayFields: (keyof ChangeOrder)[] = [
    "item_total",
    "charges_total",
    "tax_total",
    "total_co_amount",
    "freight_charges_percentage",
    "freight_charges_amount",
    "freight_charges_taxable",
    "packing_charges_percentage",
    "packing_charges_amount",
    "packing_charges_taxable",
    "custom_duties_charges_percentage",
    "custom_duties_charges_amount",
    "custom_duties_charges_taxable",
    "other_charges_percentage",
    "other_charges_amount",
    "other_charges_taxable",
    "sales_tax_1_percentage",
    "sales_tax_1_amount",
    "sales_tax_2_percentage",
    "sales_tax_2_amount",
  ];

  const overlayChangeOrderValues = (
    target: ChangeOrder,
    source?: Partial<ChangeOrder> | null
  ) => {
    if (!target || !source) return target;
    overlayFields.forEach((field) => {
      const value = source[field];
      if (value !== undefined && value !== null) {
        (target as any)[field] = value;
      }
    });
    if (Array.isArray(source.co_items)) {
      target.co_items = source.co_items;
    }
    if (Array.isArray(source.attachments)) {
      target.attachments = source.attachments;
    }
    if (Array.isArray((source as any).removed_co_items)) {
      (target as any).removed_co_items = (source as any).removed_co_items;
    }
    if (Array.isArray((source as any).labor_co_items)) {
      (target as any).labor_co_items = (source as any).labor_co_items;
    }
    return target;
  };

  // Normalize change order record
  const normalizeChangeOrderRecord = (raw: any): ChangeOrder => {
    const normalized: any = {
      ...raw,
    }

    if (!Array.isArray(normalized.co_items)) {
      normalized.co_items = Array.isArray(raw?.co_items) ? raw.co_items : []
    }

    if (!Array.isArray(normalized.attachments)) {
      normalized.attachments = Array.isArray(raw?.attachments)
        ? raw.attachments
        : []
    }

    if (!Array.isArray(normalized.removed_co_items)) {
      normalized.removed_co_items = Array.isArray(raw?.removed_co_items)
        ? raw.removed_co_items
        : []
    }

    if (!Array.isArray(normalized.labor_co_items)) {
      normalized.labor_co_items = Array.isArray(raw?.labor_co_items)
        ? raw.labor_co_items
        : []
    }

    return applyFinancialBreakdownTotals(normalized) as ChangeOrder
  }

  // Check if we need to fetch data
  const shouldFetchData = (corporationUUID: string) => {
    if (lastFetchedCorporation.value !== corporationUUID) {
      return true
    }
    if (hasDataForCorporation.value.has(corporationUUID)) {
      return false
    }
    return true
  }

  const fetchChangeOrder = async (uuid: string): Promise<ChangeOrder | null> => {
    if (!uuid) return null
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<ChangeOrderResponse>(`/api/change-orders/${uuid}`)
      if (response?.error) throw new Error(response.error)
      let co = response?.data
      if (co) {
        co = normalizeChangeOrderRecord(co)
      }
      if (co?.uuid) {
        if (!Array.isArray((co as any).removed_co_items)) {
          ;(co as any).removed_co_items = []
        }
        try {
          const itemsResponse = await $fetch<{ data: any[] }>(`/api/change-order-items?change_order_uuid=${co.uuid}`)
          let allItems = Array.isArray(itemsResponse?.data) ? itemsResponse.data : []

          // Filter out items that are in removed_co_items
          const removedItems = Array.isArray((co as any).removed_co_items)
            ? (co as any).removed_co_items
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
            allItems = allItems.filter((item: any) => {
              if (item?.item_uuid) {
                const itemUuid = String(item.item_uuid).toLowerCase();
                const isRemoved = removedItemUuids.has(itemUuid);
                return !isRemoved;
              }
              // Keep items without item_uuid (they can't be matched for removal)
              return true;
            });
          }

          // Map approval_checks_uuids (from DB) to approval_checks (for form)
          const mappedItems = allItems.map((item: any) => ({
            ...item,
            approval_checks: Array.isArray(item?.approval_checks_uuids) && item.approval_checks_uuids.length > 0
              ? item.approval_checks_uuids
              : (Array.isArray(item?.approval_checks) && item.approval_checks.length > 0
                ? item.approval_checks
                : []),
          }))
          ;(co as any).co_items = mappedItems
        } catch (e) {
          console.error('[CO] fetch items error', e)
          ;(co as any).co_items = (co as any).co_items || []
        }

        // Fetch labor CO items if this is a LABOR change order
        if (co?.co_type === 'LABOR') {
          try {
            const laborItemsResponse = await $fetch<{ data: any[] }>(`/api/labor-change-order-items?change_order_uuid=${co.uuid}`)
            const laborItems = Array.isArray(laborItemsResponse?.data) ? laborItemsResponse.data : []
            ;(co as any).labor_co_items = laborItems
          } catch (e) {
            console.error('[CO] fetch labor items error', e)
            ;(co as any).labor_co_items = (co as any).labor_co_items || []
          }
        }

        // Cache in IndexedDB
        if (isClient && co?.corporation_uuid) {
          try {
            await dbHelpers.updateChangeOrder(
              co.corporation_uuid,
              co
            )
          } catch (cacheError) {
            console.error(
              'Failed to cache individual change order:',
              cacheError
            )
          }
        }
      }
      return co || null
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch change order'
      return null
    } finally {
      loading.value = false
    }
  }

  const fetchChangeOrders = async (
    corporationUuid: string,
    forceRefresh = false,
    page = 1,
    pageSize = 100,
    filters: { project_uuid?: string; vendor_uuid?: string } = {}
  ) => {
    if (process.server) return

    const shouldFetch = shouldFetchData(corporationUuid)
    if (!forceRefresh && !shouldFetch && page === 1) {
      return
    }

    // Check if this page is already loaded
    const corpKey = corporationUuid
    if (!loadedPages.value[corpKey]) {
      loadedPages.value[corpKey] = new Set()
    }
    if (!forceRefresh && loadedPages.value[corpKey].has(page)) {
      return // Page already loaded
    }

    error.value = null

    // Try to load from cache first (only for first page)
    if (
      isClient &&
      !forceRefresh &&
      page === 1 &&
      (!changeOrders.value.length || shouldFetch)
    ) {
      try {
        const cached = await dbHelpers.getChangeOrders(corporationUuid)
        if (cached.length) {
          changeOrders.value = cached.map((co) =>
            normalizeChangeOrderRecord(co)
          ) as ChangeOrder[]
          lastFetchedCorporation.value = corporationUuid
          hasDataForCorporation.value.add(corporationUuid)
          loadedPages.value[corpKey].add(1)
        }
      } catch (cacheError) {
        console.error('Error loading cached change orders:', cacheError)
      }
    }

    loading.value = true
    try {
      // Build query string with filters
      const queryParams = new URLSearchParams({
        corporation_uuid: corporationUuid,
        page: page.toString(),
        page_size: pageSize.toString()
      });

      if (filters.project_uuid) {
        queryParams.append('project_uuid', filters.project_uuid);
      }
      if (filters.vendor_uuid) {
        queryParams.append('vendor_uuid', filters.vendor_uuid);
      }

      const response = await $fetch<ChangeOrdersResponse>(`/api/change-orders?${queryParams.toString()}`)
      if (response?.error) throw new Error(response.error)

      const orders = Array.isArray(response?.data) ? response.data : []
      const normalizedOrders = orders.map((co) =>
        normalizeChangeOrderRecord(co)
      )

      // Merge with existing orders (avoid duplicates)
      if (page === 1) {
        changeOrders.value = normalizedOrders
      } else {
        const existingUuids = new Set(changeOrders.value.map(co => co.uuid))
        const newOrders = normalizedOrders.filter(co => co.uuid && !existingUuids.has(co.uuid))
        changeOrders.value = [...changeOrders.value, ...newOrders]
      }

      // Store pagination info
      if (response.pagination) {
        paginationInfo.value[corpKey] = response.pagination
      }

      // Mark this page as loaded
      loadedPages.value[corpKey].add(page)

      lastFetchedCorporation.value = corporationUuid
      hasDataForCorporation.value.add(corporationUuid)

      // Cache in IndexedDB
      if (isClient) {
        try {
          await dbHelpers.saveChangeOrders(
            corporationUuid,
            changeOrders.value
          )
        } catch (cacheError) {
          console.error('Failed to cache change orders:', cacheError)
        }
      }
    } catch (err: any) {
      console.error('Error fetching change orders:', err)
      error.value = err.message || 'Failed to fetch change orders'
      // Fallback to cache on error (only for first page)
      if (isClient && page === 1) {
        try {
          const cached = await dbHelpers.getChangeOrders(corporationUuid)
          if (cached.length) {
            changeOrders.value = cached.map((co) =>
              normalizeChangeOrderRecord(co)
            ) as ChangeOrder[]
            error.value = null
            lastFetchedCorporation.value = corporationUuid
            hasDataForCorporation.value.add(corporationUuid)
          } else {
            changeOrders.value = []
            hasDataForCorporation.value.delete(corporationUuid)
          }
        } catch (cacheError) {
          console.error('Error loading cached change orders:', cacheError)
          changeOrders.value = []
          hasDataForCorporation.value.delete(corporationUuid)
        }
      } else {
        if (page === 1) {
          changeOrders.value = []
          hasDataForCorporation.value.delete(corporationUuid)
        }
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Load more change orders (next page) for lazy loading
   */
  const loadMoreChangeOrders = async (corporationUuid: string) => {
    const corpKey = corporationUuid
    const currentPagination = paginationInfo.value[corpKey]
    
    if (!currentPagination || !currentPagination.hasMore) {
      return // No more pages to load
    }

    const nextPage = currentPagination.page + 1
    await fetchChangeOrders(corporationUuid, false, nextPage)
  }

  /**
   * Get pagination info for a corporation
   */
  const getPaginationInfo = (corporationUuid: string): PaginationInfo | null => {
    return paginationInfo.value[corporationUuid] || null
  }

  const uploadAttachments = async (changeOrderUuid: string, attachments: any[] = []) => {
    const pending = (attachments || []).filter(
      (att) => !att?.uuid && (typeof att?.fileData === 'string' ? att.fileData : att?.url)
    )
    if (!pending.length) return null
    try {
      const response = await $fetch<{ attachments: any[]; errors?: Array<{ fileName: string; error: string }> }>(
        '/api/change-orders/documents/upload',
        {
          method: 'POST',
          body: {
            change_order_uuid: changeOrderUuid,
            files: pending.map((att) => ({
              name: att.name || att.document_name || 'attachment.pdf',
              type: att.type || att.mime_type || 'application/pdf',
              size: att.size || att.file_size || 0,
              fileData: att.fileData || att.url || '',
            })),
          },
        }
      )
      if (response?.attachments) return response.attachments
    } catch (e) {
      console.error('[CO] upload attachments error', e)
    }
    return null
  }

  const createChangeOrder = async (payload: ChangeOrder): Promise<ChangeOrder | null> => {
    loading.value = true
    error.value = null
    try {
      // Include user info for audit log
      const authStore = useAuthStore();
      const user = authStore.user;
      const userInfo = user
        ? {
            user_id: user.id || "",
            user_name:
              user.user_metadata?.full_name ||
              `${user.user_metadata?.first_name || ""} ${
                user.user_metadata?.last_name || ""
              }`.trim() ||
              user.email?.split("@")[0] ||
              "Unknown User",
            user_email: user.email || "",
            user_image_url:
              user.user_metadata?.avatar_url ||
              user.user_metadata?.image_url ||
              null,
          }
        : null;

      const response = await $fetch<ChangeOrderResponse>('/api/change-orders', {
        method: 'POST',
        body: userInfo ? { ...payload, ...userInfo } : payload,
      })
      if (response?.error) throw new Error(response.error)
      const created = response?.data
      if (created) {
        const normalized = normalizeChangeOrderRecord(created);
        if (normalized?.uuid) {
          const uploaded = await uploadAttachments(
            normalized.uuid,
            payload.attachments || []
          );
          if (uploaded) normalized.attachments = uploaded;
        }

        // Merge form data back into response (like Purchase Orders)
        normalized.co_items = payload.co_items || [];
        normalized.removed_co_items = payload.removed_co_items || [];
        if (payload.co_type === "LABOR") {
          normalized.labor_co_items = payload.labor_co_items || [];
        }
        overlayChangeOrderValues(normalized, payload as Partial<ChangeOrder>);
        applyFinancialBreakdownTotals(normalized);

        // Only add to local store if it matches the currently selected corporation
        // This prevents showing change orders from other corporations in the list
        // Similar to how Purchase Orders store handles this
        const { useCorporationStore } = await import("@/stores/corporations");
        const corpStore = useCorporationStore();
        if (normalized.corporation_uuid === corpStore.selectedCorporationId) {
          changeOrders.value.unshift(normalized);
        }

        // Always update currentChangeOrder (regardless of selected corporation)
        // This ensures the form shows the created data
        currentChangeOrder.value = normalized;
        // Cache in IndexedDB
        if (isClient && normalized?.corporation_uuid) {
          try {
            await dbHelpers.addChangeOrder(
              normalized.corporation_uuid,
              normalized
            );
          } catch (cacheError) {
            console.error("Failed to cache created change order:", cacheError);
          }
        }
        if (payload.corporation_uuid) {
          hasDataForCorporation.value.delete(payload.corporation_uuid);
        }
        return normalized;
      }
      return null
    } catch (err: any) {
      error.value = err.message || 'Failed to create change order'
      return null
    } finally {
      loading.value = false
    }
  }

  const updateChangeOrder = async (payload: ChangeOrder): Promise<ChangeOrder | null> => {
    loading.value = true
    error.value = null
    try {
      // Include user info for audit log
      const authStore = useAuthStore();
      const user = authStore.user;
      const userInfo = user
        ? {
            user_id: user.id || "",
            user_name:
              user.user_metadata?.full_name ||
              `${user.user_metadata?.first_name || ""} ${
                user.user_metadata?.last_name || ""
              }`.trim() ||
              user.email?.split("@")[0] ||
              "Unknown User",
            user_email: user.email || "",
            user_image_url:
              user.user_metadata?.avatar_url ||
              user.user_metadata?.image_url ||
              null,
          }
        : null;

      const response = await $fetch<ChangeOrderResponse>('/api/change-orders', {
        method: 'PUT',
        body: userInfo ? { ...payload, ...userInfo } : payload,
      })
      if (response?.error) throw new Error(response.error)
      const updated = response?.data
      if (updated) {
        const normalized = normalizeChangeOrderRecord(updated);
        if (normalized?.uuid) {
          const uploaded = await uploadAttachments(
            normalized.uuid,
            payload.attachments || []
          );
          if (uploaded) normalized.attachments = uploaded;
        }

        // Merge form data back into response (like Purchase Orders)
        normalized.co_items = payload.co_items || [];
        normalized.removed_co_items = payload.removed_co_items || [];
        if (payload.co_type === "LABOR") {
          normalized.labor_co_items = payload.labor_co_items || [];
        }
        overlayChangeOrderValues(normalized, payload as Partial<ChangeOrder>);
        applyFinancialBreakdownTotals(normalized);

        // Only update in local store if it matches the currently selected corporation
        // This prevents showing change orders from other corporations in the list
        // Similar to how Purchase Orders store handles this
        const { useCorporationStore } = await import("@/stores/corporations");
        const corpStore = useCorporationStore();
        if (normalized.corporation_uuid === corpStore.selectedCorporationId) {
          const idx = changeOrders.value.findIndex(
            (c) => c.uuid === normalized.uuid
          );
          if (idx !== -1) {
            changeOrders.value[idx] = normalized;
          } else {
            // If CO doesn't exist in store but corporation matches, add it
            // This handles the case where CO was created/updated for the selected corporation
            changeOrders.value.push(normalized);
          }
        }

        // Always update currentChangeOrder if it matches (regardless of selected corporation)
        // This ensures the form shows the updated data
        if (currentChangeOrder.value?.uuid === normalized.uuid) {
          currentChangeOrder.value = normalized;
        }
        // Cache in IndexedDB
        if (isClient && normalized?.corporation_uuid) {
          try {
            await dbHelpers.updateChangeOrder(
              normalized.corporation_uuid,
              normalized
            );
          } catch (cacheError) {
            console.error("Failed to cache updated change order:", cacheError);
          }
        }
        if (normalized.corporation_uuid) {
          hasDataForCorporation.value.delete(normalized.corporation_uuid);
        }
        return normalized;
      }
      return null
    } catch (err: any) {
      error.value = err.message || 'Failed to update change order'
      return null
    } finally {
      loading.value = false
    }
  }

  const deleteChangeOrder = async (uuid: string): Promise<boolean> => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<ChangeOrderResponse>('/api/change-orders', {
        method: 'DELETE',
        query: { uuid },
      })
      if (response?.error) throw new Error(response.error)

      const index = changeOrders.value.findIndex((c) => c.uuid === uuid)
      if (index !== -1) {
        const co = changeOrders.value[index]
        if (co) {
          changeOrders.value.splice(index, 1)
          if (currentChangeOrder.value?.uuid === uuid) {
            currentChangeOrder.value = null
          }
          if (co.corporation_uuid) {
            hasDataForCorporation.value.delete(co.corporation_uuid)
            if (isClient) {
              try {
                await dbHelpers.deleteChangeOrder(co.corporation_uuid, uuid)
              } catch (cacheError) {
                console.error(
                  'Failed to delete cached change order:',
                  cacheError
                )
              }
            }
          }
        }
      }
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to delete change order'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Clear current change order
   */
  const clearCurrentChangeOrder = () => {
    currentChangeOrder.value = null
  }

  /**
   * Update a change order in the list (for external updates like receipt notes)
   * This ensures proper reactivity when updating from outside the store
   */
  const updateChangeOrderInList = (updatedCO: ChangeOrder) => {
    if (!updatedCO?.uuid) return;
    // Normalize the data before storing (ensures consistency)
    const normalized = normalizeChangeOrderRecord(updatedCO);
    const index = changeOrders.value.findIndex((c) => c.uuid === normalized.uuid);
    if (index !== -1) {
      changeOrders.value[index] = normalized;
    } else {
      // If not found in array, add it (shouldn't happen, but handle gracefully)
      changeOrders.value.push(normalized);
    }
    // Also update currentChangeOrder if it matches
    if (currentChangeOrder.value?.uuid === normalized.uuid) {
      currentChangeOrder.value = normalized;
    }
    // Update IndexedDB cache
    if (isClient && normalized.corporation_uuid) {
      dbHelpers.updateChangeOrder(normalized.corporation_uuid, normalized).catch((cacheError: any) => {
        console.error("Failed to cache updated change order:", cacheError);
      });
    }
  };

  /**
   * Clear all data
   */
  const clearData = () => {
    const corpId = lastFetchedCorporation.value
    changeOrders.value = []
    currentChangeOrder.value = null
    error.value = null
    lastFetchedCorporation.value = null
    hasDataForCorporation.value.clear()
    if (isClient && corpId) {
      dbHelpers.clearChangeOrders(corpId).catch((cacheError: any) => {
        console.error('Failed to clear cached change orders:', cacheError)
      })
    }
  }

  return {
    changeOrders: readonly(changeOrders),
    currentChangeOrder,
    loading: readonly(loading),
    error: readonly(error),
    paginationInfo: readonly(paginationInfo),
    fetchChangeOrders,
    loadMoreChangeOrders,
    getPaginationInfo,
    fetchChangeOrder,
    createChangeOrder,
    updateChangeOrder,
    updateChangeOrderInList,
    deleteChangeOrder,
    clearCurrentChangeOrder,
    clearData,
  }
})


