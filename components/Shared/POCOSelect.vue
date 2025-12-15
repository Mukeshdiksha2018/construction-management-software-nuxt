<template>
  <div>
    <div :class="[className, 'relative']">
      <!-- Button to open modal -->
      <UButton
        :disabled="props.disabled || purchaseOrdersStore.loading || changeOrdersStore.loading || !props.projectUuid || !props.vendorUuid"
        :size="size"
        class="w-full"
        variant="outline"
        color="neutral"
        @click="openModal"
      >
        <span class="pr-6">{{ selectedOption ? selectedOption.number : (!props.projectUuid ? 'Select project first' : !props.vendorUuid ? 'Select vendor first' : placeholder) }}</span>
      </UButton>
      <!-- Clear button if something is selected -->
      <button
        v-if="selectedOption && !props.disabled"
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors z-10"
        @click.stop="clearSelection"
      >
        <UIcon name="i-heroicons-x-mark" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </button>
    </div>

    <!-- Modal with table -->
    <UModal
      v-model:open="showModal"
      :title="showOnlyPOs ? 'Select Purchase Order' : showOnlyCOs ? 'Select Change Order' : 'Select PO/CO'"
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
              :placeholder="showOnlyPOs ? 'Search by PO number, vendor...' : showOnlyCOs ? 'Search by CO number, vendor...' : 'Search by PO/CO number, vendor...'"
              icon="i-heroicons-magnifying-glass"
              variant="subtle"
              size="sm"
              class="w-full"
            />
          </div>

          <!-- Loading state -->
          <div v-if="purchaseOrdersStore.loading || changeOrdersStore.loading" class="text-center py-12">
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
            <p class="text-gray-500 text-lg">{{ showOnlyPOs ? 'No Purchase Order found' : showOnlyCOs ? 'No Change Order found' : 'No PO/CO found' }}</p>
            <p class="text-gray-400 text-sm mt-2">
              {{ showOnlyPOs 
                ? 'No approved, completed, or partially received purchase orders available for this vendor and project'
                : showOnlyCOs
                ? 'No approved, completed, or partially received change orders available for this vendor and project'
                : 'No approved, completed, or partially received purchase orders or change orders available for this vendor and project'
              }}
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
  modelValue?: string
  placeholder?: string
  searchablePlaceholder?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  disabled?: boolean
  projectUuid?: string
  corporationUuid?: string
  vendorUuid?: string
  showInvoiceSummary?: boolean // Show advance paid, invoiced value, and balance columns
  showOnlyPOs?: boolean // Only show Purchase Orders (hide Change Orders)
  showOnlyCOs?: boolean // Only show Change Orders (hide Purchase Orders)
}

const props = withDefaults(defineProps<Props>(), {
  searchablePlaceholder: 'Search PO/CO...',
  size: 'sm',
  className: 'w-full',
  disabled: false,
  showInvoiceSummary: false,
  showOnlyPOs: false,
  showOnlyCOs: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'change': [order: any]
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
const selectedOrder = ref<string | undefined>(props.modelValue)
const selectedOption = ref<any>(undefined)
const showModal = ref(false)
const searchFilter = ref('')
const itemsCache = ref<Map<string, { items: any[], totalQuantity: number }>>(new Map())
const loadingItems = ref<Set<string>>(new Set())
const cacheUpdateTrigger = ref(0) // Trigger for reactivity
const invoiceSummaryCache = ref<Map<string, { advancePaid: number, invoicedValue: number, balanceToBeInvoiced: number }>>(new Map())
const loadingInvoiceSummaries = ref<Set<string>>(new Set())

// Table columns configuration - computed to conditionally show invoice summary columns
const tableColumns = computed<TableColumn<any>[]>(() => {
  const baseColumns: TableColumn<any>[] = [
    {
      accessorKey: 'number',
      header: 'PO/CO Number',
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
    }
  ]

  // Add invoice summary columns if showInvoiceSummary is true (only for POs)
  if (props.showInvoiceSummary) {
    baseColumns.push(
      {
        accessorKey: 'formattedAdvancePaid',
        header: 'Advance Paid',
        enableSorting: false,
        cell: ({ row }: any) => {
          const option = row.original
          // Only show for POs
          if (option.type === 'PO' && option.invoiceSummary) {
            return h('div', { class: 'text-sm font-medium' }, formatCurrency(option.invoiceSummary.advancePaid))
          }
          return h('div', { class: 'text-sm' }, '-')
        }
      },
      {
        accessorKey: 'formattedInvoicedValue',
        header: 'Invoiced Value',
        enableSorting: false,
        cell: ({ row }: any) => {
          const option = row.original
          // Only show for POs
          if (option.type === 'PO' && option.invoiceSummary) {
            return h('div', { class: 'text-sm font-medium' }, formatCurrency(option.invoiceSummary.invoicedValue))
          }
          return h('div', { class: 'text-sm' }, '-')
        }
      },
      {
        accessorKey: 'formattedBalanceToBeInvoiced',
        header: 'Balance to be Invoiced',
        enableSorting: false,
        cell: ({ row }: any) => {
          const option = row.original
          // Only show for POs
          if (option.type === 'PO' && option.invoiceSummary) {
            return h('div', { class: 'text-sm font-semibold text-primary-600 dark:text-primary-400' }, formatCurrency(option.invoiceSummary.balanceToBeInvoiced))
          }
          return h('div', { class: 'text-sm' }, '-')
        }
      }
    )
  }

  // Add remaining columns
  baseColumns.push(
    {
      accessorKey: 'formattedAmount',
      header: 'Total PO Value',
      enableSorting: false,
      cell: ({ row }: any) => h('div', { class: 'text-sm font-semibold text-primary-600 dark:text-primary-400' }, row.original.formattedAmount)
    },
    {
      accessorKey: 'vendorName',
      header: 'Vendor',
      enableSorting: false,
      cell: ({ row }: any) => h('div', { class: 'text-sm truncate max-w-[150px]' }, row.original.vendorName)
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
            onClick: () => selectAndPayAdvance(option)
          }, () => props.showInvoiceSummary ? 'Create Invoice' : 'Pay Advance')
        ])
      }
    }
  )

  return baseColumns
})

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
  
  // Check cache first
  if (itemsCache.value.has(cacheKey)) {
    return itemsCache.value.get(cacheKey)!
  }
  
  // Check if already loading
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
    cacheUpdateTrigger.value++ // Trigger reactivity
    return result
  } catch (error) {
    console.error(`[POCOSelect] Error fetching PO items for ${poUuid}:`, error)
    return { items: [], totalQuantity: 0 }
  } finally {
    loadingItems.value.delete(cacheKey)
  }
}

// Helper function to fetch PO invoice summary
const fetchPOInvoiceSummary = async (poUuid: string, forceRefresh: boolean = false): Promise<{ advancePaid: number, invoicedValue: number, balanceToBeInvoiced: number } | null> => {
  const cacheKey = `PO_SUMMARY:${poUuid}`
  
  // Check cache first (unless forcing refresh)
  if (!forceRefresh && invoiceSummaryCache.value.has(cacheKey)) {
    return invoiceSummaryCache.value.get(cacheKey)!
  }
  
  // Check if already loading
  if (loadingInvoiceSummaries.value.has(cacheKey)) {
    return null
  }
  
  loadingInvoiceSummaries.value.add(cacheKey)
  
  try {
    const response = await $fetch<{ data: any }>(`/api/purchase-orders/invoice-summary?purchase_order_uuid=${poUuid}`)
    const summary = response?.data
    
    if (summary) {
      const result = {
        advancePaid: summary.advance_paid || 0,
        invoicedValue: summary.invoiced_value || 0,
        balanceToBeInvoiced: summary.balance_to_be_invoiced || 0
      }
      invoiceSummaryCache.value.set(cacheKey, result)
      cacheUpdateTrigger.value++ // Trigger reactivity
      return result
    }
    
    return null
  } catch (error) {
    console.error(`[POCOSelect] Error fetching PO invoice summary for ${poUuid}:`, error)
    return null
  } finally {
    loadingInvoiceSummaries.value.delete(cacheKey)
  }
}

// Helper function to fetch CO items
const fetchCOItems = async (coUuid: string): Promise<{ items: any[], totalQuantity: number }> => {
  const cacheKey = `CO:${coUuid}`
  
  // Check cache first
  if (itemsCache.value.has(cacheKey)) {
    return itemsCache.value.get(cacheKey)!
  }
  
  // Check if already loading
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
    cacheUpdateTrigger.value++ // Trigger reactivity
    return result
  } catch (error) {
    console.error(`[POCOSelect] Error fetching CO items for ${coUuid}:`, error)
    return { items: [], totalQuantity: 0 }
  } finally {
    loadingItems.value.delete(cacheKey)
  }
}

// Combined PO/CO options computed property
const poCoOptions = computed(() => {
  // Access cacheUpdateTrigger to make this reactive to cache changes
  const _ = cacheUpdateTrigger.value
  // Also access invoiceSummaryCache to make it reactive
  if (props.showInvoiceSummary) {
    invoiceSummaryCache.value.size // Access to trigger reactivity
  }
  
  if (!props.projectUuid || !props.corporationUuid || !props.vendorUuid) {
    return [];
  }
  
  const options: any[] = [];
  
  // Filter and add Purchase Orders (only if not showing only COs)
  if (!props.showOnlyCOs) {
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
    
    // Get items from cache or use po_items if available
    const cacheKey = `PO:${po.uuid}`
    let poItems: any[] = []
    let totalQuantity = 0
    
    if (itemsCache.value.has(cacheKey)) {
      const cached = itemsCache.value.get(cacheKey)!
      poItems = cached.items
      totalQuantity = cached.totalQuantity
    } else if (Array.isArray(po.po_items) && po.po_items.length > 0) {
      // Use items if they're already loaded
      poItems = po.po_items
      poItems.forEach((item: any) => {
        const qty = item.po_quantity || item.quantity || 0
        totalQuantity += Number(qty) || 0
      })
    } else {
      // Trigger async fetch (will update on next render)
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
    
    // Get invoice summary if showInvoiceSummary is enabled
    // Only use cached data - fetching happens in openModal to avoid infinite loops
    let invoiceSummary = null
    if (props.showInvoiceSummary) {
      const cacheKey = `PO_SUMMARY:${po.uuid}`
      if (invoiceSummaryCache.value.has(cacheKey)) {
        invoiceSummary = invoiceSummaryCache.value.get(cacheKey)!
      }
    }
    
    options.push({
      label: poNumber,
      value: `PO:${po.uuid}`, // Prefix with PO: to distinguish from CO
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
      invoiceSummary: invoiceSummary, // Add invoice summary data
      searchText: `${po.po_number || ''} ${po.vendor_name || ''} ${po.uuid || ''}`.toLowerCase()
    });
    });
  }
  
  // Filter and add Change Orders (only if showOnlyPOs is false and showOnlyCOs is true or both are false)
  if (!props.showOnlyPOs || props.showOnlyCOs) {
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
    
    // Get items from cache or use co_items if available
    const cacheKey = `CO:${co.uuid}`
    let coItems: any[] = []
    let totalQuantity = 0
    
    if (itemsCache.value.has(cacheKey)) {
      const cached = itemsCache.value.get(cacheKey)!
      coItems = cached.items
      totalQuantity = cached.totalQuantity
    } else if (Array.isArray(co.co_items) && co.co_items.length > 0) {
      // Use items if they're already loaded
      coItems = co.co_items
      coItems.forEach((item: any) => {
        const qty = item.co_quantity || item.quantity || 0
        totalQuantity += Number(qty) || 0
      })
    } else {
      // Trigger async fetch (will update on next render)
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
    
    options.push({
      label: coNumber,
      value: `CO:${co.uuid}`, // Prefix with CO: to distinguish from PO
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
      searchText: `${co.co_number || ''} ${co.vendor_name || ''} ${co.uuid || ''}`.toLowerCase()
    });
    });
  }
  
  // Sort by number (PO/CO number)
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

// Create a Map for fast O(1) lookup of options by value
const optionsMap = computed(() => {
  return new Map(poCoOptions.value.map(option => [option.value, option]))
})

// Find the selected option object for display
const updateSelectedObject = () => {
  if (!selectedOrder.value) {
    selectedOption.value = undefined
  } else {
    selectedOption.value = optionsMap.value.get(selectedOrder.value) || undefined
  }
}

// Modal methods
const openModal = async () => {
  if (props.disabled || purchaseOrdersStore.loading || changeOrdersStore.loading || !props.projectUuid || !props.vendorUuid) {
    return
  }
  showModal.value = true
  searchFilter.value = ''
  
  // Fetch items and invoice summaries for all POs and COs in parallel
  const fetchPromises: Promise<any>[] = []
  
  // Pre-fetch items for all visible POs (only if not showing only COs)
  if (!props.showOnlyCOs) {
    const filteredPOs = purchaseOrdersStore.purchaseOrders.filter(po => 
      po.corporation_uuid === props.corporationUuid &&
      po.project_uuid === props.projectUuid &&
      po.vendor_uuid === props.vendorUuid &&
      isStatusAllowed(po.status)
    )
    
    // Fetch PO items and summaries
    filteredPOs.forEach(po => {
      if (po.uuid && (!Array.isArray(po.po_items) || po.po_items.length === 0)) {
        fetchPromises.push(fetchPOItems(po.uuid))
      }
      // Fetch invoice summary if enabled (always refresh to get latest data including draft invoices)
      if (props.showInvoiceSummary && po.uuid) {
        fetchPromises.push(fetchPOInvoiceSummary(po.uuid, true))
      }
    })
  }
  
  // Fetch CO items (only if showOnlyPOs is false or showOnlyCOs is true)
  if (!props.showOnlyPOs || props.showOnlyCOs) {
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
    })
  }
  
  await Promise.all(fetchPromises)
}

const closeModal = () => {
  showModal.value = false
  searchFilter.value = ''
}

const clearSelection = () => {
  selectedOrder.value = undefined
  selectedOption.value = undefined
  emit('update:modelValue', undefined)
  emit('change', undefined)
}

const selectAndPayAdvance = (option: any) => {
  selectedOrder.value = option.value
  selectedOption.value = option
  emit('update:modelValue', option.value)
  emit('change', option)
  closeModal()
}

// Methods
const handleSelection = (order: any) => {
  if (typeof order === 'string') {
    selectedOrder.value = order
    emit('update:modelValue', order)
    const option = optionsMap.value.get(order)
    if (option) {
      emit('change', option)
    } else {
      emit('change', undefined)
    }
    return
  }

  if (order && typeof order === 'object') {
    const value = order.value ?? order.uuid ?? order.id
    if (value) {
      selectedOrder.value = value
      emit('update:modelValue', value)
      emit('change', order)
      return
    }
  }

  selectedOrder.value = undefined
  emit('update:modelValue', undefined)
  emit('change', undefined)
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  selectedOrder.value = newValue
  updateSelectedObject()
})

watch(poCoOptions, () => {
  updateSelectedObject()
}, { immediate: true })

watch(selectedOrder, () => {
  updateSelectedObject()
})

// Watch for project, corporation, or vendor changes and fetch data
watch([() => props.projectUuid, () => props.corporationUuid, () => props.vendorUuid], async ([newProjectUuid, newCorpUuid, newVendorUuid], [oldProjectUuid, oldCorpUuid, oldVendorUuid]) => {
  // Clear selected order when project, corporation, or vendor changes
  if ((newProjectUuid !== oldProjectUuid || newCorpUuid !== oldCorpUuid || newVendorUuid !== oldVendorUuid) && (oldProjectUuid || oldCorpUuid || oldVendorUuid)) {
    selectedOrder.value = undefined
    selectedOption.value = undefined
    emit('update:modelValue', undefined)
  }
  
  // Fetch purchase orders and change orders for the new corporation
  if (newCorpUuid) {
    try {
      await Promise.all([
        purchaseOrdersStore.fetchPurchaseOrders(newCorpUuid),
        changeOrdersStore.fetchChangeOrders(newCorpUuid)
      ])
    } catch (error) {
      console.error('[POCOSelect] Error fetching orders:', error)
    }
  }
}, { immediate: true })

// Load data if needed on mount
if (props.corporationUuid && typeof window !== 'undefined') {
  // Check if we need to fetch data for this corporation
  const hasPOsForCorp = purchaseOrdersStore.purchaseOrders.some(
    po => po.corporation_uuid === props.corporationUuid
  )
  const hasCOsForCorp = changeOrdersStore.changeOrders.some(
    co => co.corporation_uuid === props.corporationUuid
  )
  
  Promise.all([
    hasPOsForCorp ? Promise.resolve() : purchaseOrdersStore.fetchPurchaseOrders(props.corporationUuid),
    hasCOsForCorp ? Promise.resolve() : changeOrdersStore.fetchChangeOrders(props.corporationUuid)
  ]).catch(error => {
    console.error('[POCOSelect] Error loading data on mount:', error)
  })
}
</script>

