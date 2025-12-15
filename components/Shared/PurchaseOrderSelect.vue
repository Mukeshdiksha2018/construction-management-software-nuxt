<template>
  <USelectMenu
    :model-value="selectedPOOption"
    :items="poOptions"
    :loading="purchaseOrdersStore.loading"
    :disabled="disabled || purchaseOrdersStore.loading || !projectUuid || !vendorUuid"
    :placeholder="!projectUuid ? 'Select project first' : !vendorUuid ? 'Select vendor first' : placeholder"
    :size="size"
    :class="className"
    :ui="menuUi"
    value-key="value"
    label-key="label"
    searchable
    :searchable-placeholder="searchablePlaceholder"
    clearable
    @update:model-value="handleSelection"
  >
    <template #item-label="{ item }">
      <div class="flex items-start justify-between w-full gap-2">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-medium text-sm">
              {{ item.poNumber }}
            </span>
            <UBadge
              :color="item.status_color"
              variant="solid"
              size="xs"
              class="flex-shrink-0"
            >
              {{ item.status }}
            </UBadge>
          </div>
          <div class="text-xs text-muted flex items-center gap-2">
            <span class="truncate">{{ item.vendorName }}</span>
            <span class="flex-shrink-0 font-semibold text-primary-600 dark:text-primary-400">{{ item.formattedAmount }}</span>
          </div>
        </div>
      </div>
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePurchaseOrdersStore } from '@/stores/purchaseOrders'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'

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
  allowedStatuses?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search and select purchase order',
  searchablePlaceholder: 'Search purchase orders...',
  size: 'sm',
  className: 'w-full',
  disabled: false,
  allowedStatuses: () => ['Approved']
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'change': [purchaseOrder: any]
}>()

// Stores
const purchaseOrdersStore = usePurchaseOrdersStore()
const { formatCurrency } = useCurrencyFormat()

// Local state
const selectedPO = ref<string | undefined>(props.modelValue)
const selectedPOOption = ref<any>(undefined)

// UI configuration for dropdown to show full content
const menuUi = {
  content: 'max-h-60 min-w-full w-max',
  item: {
    base: 'whitespace-normal break-words',
    label: 'whitespace-normal break-words text-left'
  }
}

// Helper function to get status color
const getStatusColor = (status: string): "error" | "warning" | "info" | "success" | "primary" | "secondary" | "neutral" => {
  const statusColors: Record<string, "error" | "warning" | "info" | "success" | "primary" | "secondary" | "neutral"> = {
    'Draft': 'neutral',
    'Ready': 'warning',
    'Approved': 'success',
    'Rejected': 'error',
    'Partially_Received': 'info',
    'Completed': 'info'
  };
  return statusColors[status] || 'neutral';
};

// PO options computed property
const poOptions = computed(() => {
  if (!props.projectUuid || !props.corporationUuid || !props.vendorUuid) {
    return [];
  }
  
  // Filter purchase orders by corporation, project, vendor, and allowed statuses
  const filteredPOs = purchaseOrdersStore.purchaseOrders.filter(po => 
    po.corporation_uuid === props.corporationUuid &&
    po.project_uuid === props.projectUuid &&
    po.vendor_uuid === props.vendorUuid &&
    props.allowedStatuses.includes(po.status || '')
  );
  
  return filteredPOs.map(po => {
    const poNumber = po.po_number || 'Unnamed PO';
    const vendorName = po.vendor_name || 'Unknown Vendor';
    const amount = po.total_po_amount || 0;
    const formattedAmount = formatCurrency(amount);
    
    // Use PO number as the main label for the select menu
    return {
      label: poNumber,
      value: po.uuid,
      purchaseOrder: po,
      poNumber: poNumber,
      vendorName: vendorName,
      formattedAmount: formattedAmount,
      status: po.status || 'Draft',
      status_color: getStatusColor(po.status || 'Draft'),
      searchText: `${po.po_number || ''} ${po.vendor_name || ''} ${po.uuid || ''}`.toLowerCase()
    };
  });
});

// Create a Map for fast O(1) lookup of PO options by UUID
const poOptionsMap = computed(() => {
  return new Map(poOptions.value.map(po => [po.value, po]))
})

// Find the selected PO object for display (optimized with Map for O(1) lookup)
const updateSelectedObject = () => {
  if (!selectedPO.value) {
    selectedPOOption.value = undefined
  } else {
    selectedPOOption.value = poOptionsMap.value.get(selectedPO.value) || undefined
  }
}

// Methods
const handleSelection = (po: any) => {
  if (typeof po === 'string') {
    selectedPO.value = po
    emit('update:modelValue', po)
    const option = poOptionsMap.value.get(po)
    if (option) {
      emit('change', option)
    } else {
      emit('change', undefined)
    }
    return
  }

  if (po && typeof po === 'object') {
    const value = po.value ?? po.uuid ?? po.id
    if (value) {
      selectedPO.value = value
      emit('update:modelValue', value)
      emit('change', po)
      return
    }
  }

  selectedPO.value = undefined
  emit('update:modelValue', undefined)
  emit('change', undefined)
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  selectedPO.value = newValue
  updateSelectedObject()
})

watch(poOptions, () => {
  updateSelectedObject()
}, { immediate: true })

watch(selectedPO, () => {
  updateSelectedObject()
})

// Watch for project, corporation, or vendor changes and fetch purchase orders
watch([() => props.projectUuid, () => props.corporationUuid, () => props.vendorUuid], async ([newProjectUuid, newCorpUuid, newVendorUuid], [oldProjectUuid, oldCorpUuid, oldVendorUuid]) => {
  // Clear selected PO when project, corporation, or vendor changes
  if ((newProjectUuid !== oldProjectUuid || newCorpUuid !== oldCorpUuid || newVendorUuid !== oldVendorUuid) && (oldProjectUuid || oldCorpUuid || oldVendorUuid)) {
    selectedPO.value = undefined
    selectedPOOption.value = undefined
    emit('update:modelValue', undefined)
  }
  
  // Fetch purchase orders for the new corporation
  if (newCorpUuid) {
    try {
      await purchaseOrdersStore.fetchPurchaseOrders(newCorpUuid)
    } catch (error) {
      console.error('[PurchaseOrderSelect] Error fetching purchase orders:', error)
    }
  }
}, { immediate: true })

// Load data if needed on mount
if (props.corporationUuid) {
  // Check if we need to fetch purchase orders for this corporation
  const hasPOsForCorp = purchaseOrdersStore.purchaseOrders.some(
    po => po.corporation_uuid === props.corporationUuid
  )
  if (!hasPOsForCorp) {
    purchaseOrdersStore.fetchPurchaseOrders(props.corporationUuid)
  }
}
</script>

