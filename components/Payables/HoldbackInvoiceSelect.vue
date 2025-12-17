<template>
  <div>
    <!-- Modal with table -->
    <UModal
      v-model:open="showModal"
      title="Select PO/CO for Holdback Invoice"
      :ui="{
        content: 'max-w-6xl'
      }"
    >
      <template #body>
        <div class="space-y-4">
          <!-- Search -->
          <div>
            <UInput
              v-model="searchFilter"
              placeholder="Search by PO/CO number, vendor..."
              icon="i-heroicons-magnifying-glass"
              variant="subtle"
              size="sm"
              class="w-full"
            />
          </div>

          <!-- Loading state -->
          <div v-if="loading" class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p class="mt-2 text-sm text-gray-500">Loading PO/CO data...</p>
          </div>

          <!-- Table -->
          <div v-else-if="filteredOptions.length > 0">
            <UTable
              :data="filteredOptions"
              :columns="tableColumns"
              class="w-full"
            />
          </div>

          <!-- Empty state -->
          <div v-else class="text-center py-12">
            <UIcon name="i-heroicons-document-text" class="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p class="text-gray-500 text-lg">No PO/CO found</p>
            <p class="text-gray-400 text-sm mt-2">
              No approved, completed, or partially received purchase orders or change orders available for this vendor and project
            </p>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, h, resolveComponent } from 'vue'
import { usePurchaseOrdersStore } from '@/stores/purchaseOrders'
import { useChangeOrdersStore } from '@/stores/changeOrders'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import { useDateFormat } from '@/composables/useDateFormat'
import type { TableColumn } from '@nuxt/ui'

// Props
interface Props {
  modelValue?: boolean
  projectUuid?: string
  corporationUuid?: string
  vendorUuid?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'select': [order: any]
}>()

// Stores
const purchaseOrdersStore = usePurchaseOrdersStore()
const changeOrdersStore = useChangeOrdersStore()
const { formatCurrency } = useCurrencyFormat()
const { formatDate } = useDateFormat()

// Resolve components for table columns
const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')

// Local state
const showModal = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
const searchFilter = ref('')
const itemsCache = ref<Map<string, { items: any[], totalQuantity: number }>>(new Map())
const loadingItems = ref<Set<string>>(new Set())
const cacheUpdateTrigger = ref(0)
const invoiceSummaryCache = ref<Map<string, { advancePaid: number, invoicedValue: number, balanceToBeInvoiced: number, holdbackPercentage: number }>>(new Map())
const loadingInvoiceSummaries = ref<Set<string>>(new Set())
const loading = computed(() => purchaseOrdersStore.loading || changeOrdersStore.loading || loadingInvoiceSummaries.value.size > 0)

// Allowed statuses for PO/CO selection
const allowedStatuses = ['Approved', 'Completed', 'Partially_Received', 'partially_received']

// Helper function to check if status is allowed
const isStatusAllowed = (status: string | undefined): boolean => {
  if (!status) return false
  return allowedStatuses.includes(status)
}

// Helper function to get status color
const getStatusColor = (status: string): "error" | "warning" | "info" | "success" | "primary" | "secondary" | "neutral" => {
  const statusColors: Record<string, "error" | "warning" | "info" | "success" | "primary" | "secondary" | "neutral"> = {
    'Draft': 'neutral',
    'Ready': 'warning',
    'Approved': 'success',
    'Rejected': 'error',
    'Completed': 'info',
    'Partially_Received': 'info',
    'partially_received': 'info'
  };
  return statusColors[status] || 'neutral';
};

// Helper function to fetch PO items
const fetchPOItems = async (poUuid: string): Promise<{ items: any[], totalQuantity: number }> => {
  const cacheKey = `PO:${poUuid}`
  
  if (itemsCache.value.has(cacheKey)) {
    return itemsCache.value.get(cacheKey)!
  }
  
  if (loadingItems.value.has(cacheKey)) {
    return { items: [], totalQuantity: 0 }
  }
  
  loadingItems.value.add(cacheKey)
  
  try {
    const response = await $fetch<{ data: any[] }>(`/api/purchase-order-items?purchase_order_uuid=${poUuid}`)
    const items = Array.isArray(response?.data) ? response.data : []
    
    let totalQuantity = 0
    items.forEach((item: any) => {
      const qty = item.po_quantity || item.quantity || 0
      totalQuantity += Number(qty) || 0
    })
    
    const result = { items, totalQuantity }
    itemsCache.value.set(cacheKey, result)
    cacheUpdateTrigger.value++
    return result
  } catch (error) {
    console.error(`[HoldbackInvoiceSelect] Error fetching PO items for ${poUuid}:`, error)
    return { items: [], totalQuantity: 0 }
  } finally {
    loadingItems.value.delete(cacheKey)
  }
}

// Helper function to fetch PO invoice summary and holdback info
const fetchPOInvoiceSummary = async (poUuid: string, forceRefresh: boolean = false): Promise<{ advancePaid: number, invoicedValue: number, balanceToBeInvoiced: number, holdbackPercentage: number } | null> => {
  const cacheKey = `PO_SUMMARY:${poUuid}`
  
  if (!forceRefresh && invoiceSummaryCache.value.has(cacheKey)) {
    return invoiceSummaryCache.value.get(cacheKey)!
  }
  
  if (loadingInvoiceSummaries.value.has(cacheKey)) {
    return null
  }
  
  loadingInvoiceSummaries.value.add(cacheKey)
  
  try {
    // Fetch invoice summary
    const summaryResponse = await $fetch<{ data: any }>(`/api/purchase-orders/invoice-summary?purchase_order_uuid=${poUuid}`)
    const summary = summaryResponse?.data
    
    // Fetch existing invoices to get holdback percentage
    let holdbackPercentage = 0
    try {
      const invoicesResponse = await $fetch<{ data: any[] }>(`/api/vendor-invoices?purchase_order_uuid=${poUuid}`)
      const invoices = Array.isArray(invoicesResponse?.data) ? invoicesResponse.data : []
      
      // Get holdback percentage from the first invoice that has it (or use 0 as default)
      const invoiceWithHoldback = invoices.find((inv: any) => inv.holdback && inv.holdback > 0)
      if (invoiceWithHoldback) {
        holdbackPercentage = parseFloat(invoiceWithHoldback.holdback) || 0
      }
    } catch (error) {
      console.warn(`[HoldbackInvoiceSelect] Error fetching invoices for holdback percentage:`, error)
    }
    
    if (summary) {
      const result = {
        advancePaid: summary.advance_paid || 0,
        invoicedValue: summary.invoiced_value || 0,
        balanceToBeInvoiced: summary.balance_to_be_invoiced || 0,
        holdbackPercentage: holdbackPercentage
      }
      invoiceSummaryCache.value.set(cacheKey, result)
      cacheUpdateTrigger.value++
      return result
    }
    
    return null
  } catch (error) {
    console.error(`[HoldbackInvoiceSelect] Error fetching PO invoice summary for ${poUuid}:`, error)
    return null
  } finally {
    loadingInvoiceSummaries.value.delete(cacheKey)
  }
}

// Helper function to fetch CO items
const fetchCOItems = async (coUuid: string): Promise<{ items: any[], totalQuantity: number }> => {
  const cacheKey = `CO:${coUuid}`
  
  if (itemsCache.value.has(cacheKey)) {
    return itemsCache.value.get(cacheKey)!
  }
  
  if (loadingItems.value.has(cacheKey)) {
    return { items: [], totalQuantity: 0 }
  }
  
  loadingItems.value.add(cacheKey)
  
  try {
    const response = await $fetch<{ data: any[] }>(`/api/change-order-items?change_order_uuid=${coUuid}`)
    const items = Array.isArray(response?.data) ? response.data : []
    
    let totalQuantity = 0
    items.forEach((item: any) => {
      const qty = item.co_quantity || item.quantity || 0
      totalQuantity += Number(qty) || 0
    })
    
    const result = { items, totalQuantity }
    itemsCache.value.set(cacheKey, result)
    cacheUpdateTrigger.value++
    return result
  } catch (error) {
    console.error(`[HoldbackInvoiceSelect] Error fetching CO items for ${coUuid}:`, error)
    return { items: [], totalQuantity: 0 }
  } finally {
    loadingItems.value.delete(cacheKey)
  }
}

// Helper function to fetch CO invoice summary and holdback info
const fetchCOInvoiceSummary = async (coUuid: string, forceRefresh: boolean = false): Promise<{ advancePaid: number, invoicedValue: number, balanceToBeInvoiced: number, holdbackPercentage: number } | null> => {
  const cacheKey = `CO_SUMMARY:${coUuid}`
  
  if (!forceRefresh && invoiceSummaryCache.value.has(cacheKey)) {
    return invoiceSummaryCache.value.get(cacheKey)!
  }
  
  if (loadingInvoiceSummaries.value.has(cacheKey)) {
    return null
  }
  
  loadingInvoiceSummaries.value.add(cacheKey)
  
  try {
    // Fetch invoice summary
    const summaryResponse = await $fetch<{ data: any }>(`/api/change-orders/invoice-summary?change_order_uuid=${coUuid}`)
    const summary = summaryResponse?.data
    
    // Fetch existing invoices to get holdback percentage
    let holdbackPercentage = 0
    try {
      const invoicesResponse = await $fetch<{ data: any[] }>(`/api/vendor-invoices?change_order_uuid=${coUuid}`)
      const invoices = Array.isArray(invoicesResponse?.data) ? invoicesResponse.data : []
      
      // Get holdback percentage from the first invoice that has it (or use 0 as default)
      const invoiceWithHoldback = invoices.find((inv: any) => inv.holdback && inv.holdback > 0)
      if (invoiceWithHoldback) {
        holdbackPercentage = parseFloat(invoiceWithHoldback.holdback) || 0
      }
    } catch (error) {
      console.warn(`[HoldbackInvoiceSelect] Error fetching invoices for holdback percentage:`, error)
    }
    
    if (summary) {
      const result = {
        advancePaid: summary.advance_paid || 0,
        invoicedValue: summary.invoiced_value || 0,
        balanceToBeInvoiced: summary.balance_to_be_invoiced || 0,
        holdbackPercentage: holdbackPercentage
      }
      invoiceSummaryCache.value.set(cacheKey, result)
      cacheUpdateTrigger.value++
      return result
    }
    
    return null
  } catch (error) {
    console.error(`[HoldbackInvoiceSelect] Error fetching CO invoice summary for ${coUuid}:`, error)
    return null
  } finally {
    loadingInvoiceSummaries.value.delete(cacheKey)
  }
}

// Combined PO/CO options computed property
const poCoOptions = computed(() => {
  const _ = cacheUpdateTrigger.value
  if (invoiceSummaryCache.value.size) {
    invoiceSummaryCache.value.size
  }
  
  if (!props.projectUuid || !props.corporationUuid || !props.vendorUuid) {
    return [];
  }
  
  const options: any[] = [];
  
  // Filter and add Purchase Orders
  const filteredPOs = purchaseOrdersStore.purchaseOrders.filter(po => 
    po.corporation_uuid === props.corporationUuid &&
    po.project_uuid === props.projectUuid &&
    po.vendor_uuid === props.vendorUuid &&
    isStatusAllowed(po.status)
  );
  
  filteredPOs.forEach(po => {
    const poNumber = po.po_number || 'Unnamed PO';
    const vendorName = po.vendor_name || 'Unknown Vendor';
    const amount = po.total_po_amount || 0;
    const formattedAmount = formatCurrency(amount);
    
    // Get items from cache
    const cacheKey = `PO:${po.uuid}`
    let poItems: any[] = []
    let totalQuantity = 0
    
    if (itemsCache.value.has(cacheKey)) {
      const cached = itemsCache.value.get(cacheKey)!
      poItems = cached.items
      totalQuantity = cached.totalQuantity
    } else if (Array.isArray(po.po_items) && po.po_items.length > 0) {
      poItems = po.po_items
      poItems.forEach((item: any) => {
        const qty = item.po_quantity || item.quantity || 0
        totalQuantity += Number(qty) || 0
      })
    } else {
      if (showModal.value && po.uuid) {
        fetchPOItems(po.uuid)
      }
    }
    
    const totalItems = poItems.length
    let avgRate = 0
    if (totalQuantity > 0 && amount > 0) {
      avgRate = amount / totalQuantity
    }
    const formattedAvgRate = formatCurrency(avgRate);
    
    // Format date
    const poDate = po.entry_date || po.created_at || '';
    const formattedDate = formatDate(poDate);
    
    // Get invoice summary
    let invoiceSummary = null
    const summaryCacheKey = `PO_SUMMARY:${po.uuid}`
    if (invoiceSummaryCache.value.has(summaryCacheKey)) {
      invoiceSummary = invoiceSummaryCache.value.get(summaryCacheKey)!
    }
    
    // Calculate holdback amount: Total Invoiced * (Holdback Percentage / 100)
    // Based on the image, holdback amount is calculated from total invoiced value
    const baseAmount = invoiceSummary ? invoiceSummary.invoicedValue : 0
    const holdbackAmount = invoiceSummary && invoiceSummary.holdbackPercentage > 0 && baseAmount > 0
      ? (baseAmount * invoiceSummary.holdbackPercentage / 100)
      : 0
    
    options.push({
      label: poNumber,
      value: `PO:${po.uuid}`,
      order: po,
      number: poNumber,
      vendorName: vendorName,
      formattedAmount: formattedAmount,
      formattedDate: formattedDate || 'N/A',
      totalItems: totalItems,
      avgRate: avgRate,
      formattedAvgRate: formattedAvgRate,
      status: po.status || 'Draft',
      status_color: getStatusColor(po.status || 'Draft'),
      type: 'PO',
      type_label: 'PO',
      type_color: 'primary',
      invoiceSummary: invoiceSummary,
      holdbackPercentage: invoiceSummary?.holdbackPercentage || 0,
      holdbackAmount: holdbackAmount,
      formattedHoldbackAmount: formatCurrency(holdbackAmount),
      formattedInvoicedValue: invoiceSummary ? formatCurrency(invoiceSummary.invoicedValue) : formatCurrency(0),
      searchText: `${po.po_number || ''} ${po.vendor_name || ''} ${po.uuid || ''}`.toLowerCase()
    });
  });
  
  // Filter and add Change Orders
  const filteredCOs = changeOrdersStore.changeOrders.filter(co => 
    co.corporation_uuid === props.corporationUuid &&
    co.project_uuid === props.projectUuid &&
    co.vendor_uuid === props.vendorUuid &&
    isStatusAllowed(co.status)
  );
  
  filteredCOs.forEach(co => {
    const coNumber = co.co_number || 'Unnamed CO';
    const vendorName = co.vendor_name || 'Unknown Vendor';
    const amount = co.total_co_amount || 0;
    const formattedAmount = formatCurrency(amount);
    
    // Get items from cache
    const cacheKey = `CO:${co.uuid}`
    let coItems: any[] = []
    let totalQuantity = 0
    
    if (itemsCache.value.has(cacheKey)) {
      const cached = itemsCache.value.get(cacheKey)!
      coItems = cached.items
      totalQuantity = cached.totalQuantity
    } else if (Array.isArray(co.co_items) && co.co_items.length > 0) {
      coItems = co.co_items
      coItems.forEach((item: any) => {
        const qty = item.co_quantity || item.quantity || 0
        totalQuantity += Number(qty) || 0
      })
    } else {
      if (showModal.value && co.uuid) {
        fetchCOItems(co.uuid)
      }
    }
    
    const totalItems = coItems.length
    let avgRate = 0
    if (totalQuantity > 0 && amount > 0) {
      avgRate = amount / totalQuantity
    }
    const formattedAvgRate = formatCurrency(avgRate);
    
    // Format date
    const coDate = co.created_date || '';
    const formattedDate = formatDate(coDate);
    
    // Get invoice summary
    let invoiceSummary = null
    const summaryCacheKey = `CO_SUMMARY:${co.uuid}`
    if (invoiceSummaryCache.value.has(summaryCacheKey)) {
      invoiceSummary = invoiceSummaryCache.value.get(summaryCacheKey)!
    }
    
    // Calculate holdback amount: Total Invoiced * (Holdback Percentage / 100)
    // Based on the image, holdback amount is calculated from total invoiced value
    const baseAmount = invoiceSummary ? invoiceSummary.invoicedValue : 0
    const holdbackAmount = invoiceSummary && invoiceSummary.holdbackPercentage > 0 && baseAmount > 0
      ? (baseAmount * invoiceSummary.holdbackPercentage / 100)
      : 0
    
    options.push({
      label: coNumber,
      value: `CO:${co.uuid}`,
      order: co,
      number: coNumber,
      vendorName: vendorName,
      formattedAmount: formattedAmount,
      formattedDate: formattedDate || 'N/A',
      totalItems: totalItems,
      avgRate: avgRate,
      formattedAvgRate: formattedAvgRate,
      status: co.status || 'Draft',
      status_color: getStatusColor(co.status || 'Draft'),
      type: 'CO',
      type_label: 'CO',
      type_color: 'secondary',
      invoiceSummary: invoiceSummary,
      holdbackPercentage: invoiceSummary?.holdbackPercentage || 0,
      holdbackAmount: holdbackAmount,
      formattedHoldbackAmount: formatCurrency(holdbackAmount),
      formattedInvoicedValue: invoiceSummary ? formatCurrency(invoiceSummary.invoicedValue) : formatCurrency(0),
      searchText: `${co.co_number || ''} ${co.vendor_name || ''} ${co.uuid || ''}`.toLowerCase()
    });
  });
  
  // Sort by number
  return options.sort((a, b) => {
    const aNum = a.number || '';
    const bNum = b.number || '';
    return aNum.localeCompare(bNum);
  });
});

// Filtered options based on search
const filteredOptions = computed(() => {
  if (!searchFilter.value.trim()) {
    return poCoOptions.value
  }
  
  const searchTerm = searchFilter.value.toLowerCase().trim()
  return poCoOptions.value.filter(option => {
    return option.searchText.includes(searchTerm) ||
           option.number.toLowerCase().includes(searchTerm) ||
           option.vendorName.toLowerCase().includes(searchTerm)
  })
})

// Table columns configuration
const tableColumns = computed<TableColumn<any>[]>(() => {
  return [
    {
      accessorKey: 'number',
      header: 'PO Number',
      enableSorting: false,
      cell: ({ row }: any) => {
        const option = row.original
        return h('div', { class: 'flex items-center gap-2 flex-wrap' }, [
          h('span', { class: 'font-medium text-sm' }, option.number),
          h(UBadge as any, {
            color: option.status_color,
            variant: 'solid',
            size: 'xs'
          }, () => option.status),
          h(UBadge as any, {
            color: option.type_color,
            variant: 'soft',
            size: 'xs'
          }, () => option.type_label)
        ])
      }
    },
    {
      accessorKey: 'formattedDate',
      header: 'PO Date',
      enableSorting: false,
      cell: ({ row }: any) => h('div', { class: 'text-sm' }, row.original.formattedDate)
    },
    {
      accessorKey: 'totalItems',
      header: 'No of Items',
      enableSorting: false,
      cell: ({ row }: any) => h('div', { class: 'text-sm font-medium' }, row.original.totalItems)
    },
    {
      accessorKey: 'formattedAvgRate',
      header: 'Avg Rate',
      enableSorting: false,
      cell: ({ row }: any) => h('div', { class: 'text-sm font-medium' }, row.original.formattedAvgRate)
    },
    {
      accessorKey: 'formattedAmount',
      header: 'Total PO Value',
      enableSorting: false,
      cell: ({ row }: any) => h('div', { class: 'text-sm font-semibold text-primary-600 dark:text-primary-400' }, row.original.formattedAmount)
    },
    {
      accessorKey: 'formattedInvoicedValue',
      header: 'Total Invoiced',
      enableSorting: false,
      cell: ({ row }: any) => h('div', { class: 'text-sm font-medium' }, row.original.formattedInvoicedValue)
    },
    {
      accessorKey: 'holdbackPercentage',
      header: '% Holdback',
      enableSorting: false,
      cell: ({ row }: any) => h('div', { class: 'text-sm font-medium' }, `${row.original.holdbackPercentage || 0}%`)
    },
    {
      accessorKey: 'formattedHoldbackAmount',
      header: 'Holdback Amount',
      enableSorting: false,
      cell: ({ row }: any) => h('div', { class: 'text-sm font-semibold text-primary-600 dark:text-primary-400' }, row.original.formattedHoldbackAmount)
    },
    {
      accessorKey: 'action',
      header: 'Action',
      enableSorting: false,
      cell: ({ row }: any) => {
        const option = row.original
        return h('div', { class: 'flex justify-center' }, [
          h(UButton as any, {
            color: 'primary',
            size: 'sm',
            onClick: () => selectHoldbackInvoice(option)
          }, () => 'Create Holdback Invoice')
        ])
      }
    }
  ]
})

// Methods
const selectHoldbackInvoice = (option: any) => {
  emit('select', option)
  showModal.value = false
}

// Watch for modal opening to fetch data
watch(showModal, async (isOpen) => {
  if (isOpen && props.projectUuid && props.corporationUuid && props.vendorUuid) {
    searchFilter.value = ''
    
    // Fetch items and invoice summaries for all POs and COs
    const fetchPromises: Promise<any>[] = []
    
    const filteredPOs = purchaseOrdersStore.purchaseOrders.filter(po => 
      po.corporation_uuid === props.corporationUuid &&
      po.project_uuid === props.projectUuid &&
      po.vendor_uuid === props.vendorUuid &&
      isStatusAllowed(po.status)
    )
    
    filteredPOs.forEach(po => {
      if (po.uuid && (!Array.isArray(po.po_items) || po.po_items.length === 0)) {
        fetchPromises.push(fetchPOItems(po.uuid))
      }
      if (po.uuid) {
        fetchPromises.push(fetchPOInvoiceSummary(po.uuid, true))
      }
    })
    
    const filteredCOs = changeOrdersStore.changeOrders.filter(co => 
      co.corporation_uuid === props.corporationUuid &&
      co.project_uuid === props.projectUuid &&
      co.vendor_uuid === props.vendorUuid &&
      isStatusAllowed(co.status)
    )
    
    filteredCOs.forEach(co => {
      if (co.uuid && (!Array.isArray(co.co_items) || co.co_items.length === 0)) {
        fetchPromises.push(fetchCOItems(co.uuid))
      }
      if (co.uuid) {
        fetchPromises.push(fetchCOInvoiceSummary(co.uuid, true))
      }
    })
    
    await Promise.all(fetchPromises)
  }
})

// Watch for project, corporation, or vendor changes and fetch data
watch([() => props.projectUuid, () => props.corporationUuid, () => props.vendorUuid], async ([newProjectUuid, newCorpUuid, newVendorUuid]) => {
  if (newCorpUuid) {
    try {
      await Promise.all([
        purchaseOrdersStore.fetchPurchaseOrders(newCorpUuid),
        changeOrdersStore.fetchChangeOrders(newCorpUuid)
      ])
    } catch (error) {
      console.error('[HoldbackInvoiceSelect] Error fetching orders:', error)
    }
  }
}, { immediate: true })
</script>

