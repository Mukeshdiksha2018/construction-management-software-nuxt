<template>
  <USelectMenu
    :model-value="selectedCOOption"
    :items="coOptions"
    :loading="changeOrdersStore.loading"
    :disabled="disabled || changeOrdersStore.loading || !projectUuid || !vendorUuid"
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
              {{ item.coNumber }}
            </span>
            <UBadge
              :color="item.status_color"
              variant="solid"
              size="xs"
              class="flex-shrink-0"
            >
              {{ item.status }}
            </UBadge>
            <UBadge
              v-if="item.coType"
              :color="item.coType === 'LABOR' ? 'primary' : 'secondary'"
              variant="soft"
              size="xs"
              class="flex-shrink-0"
            >
              {{ item.coType }}
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
import { useChangeOrdersStore } from '@/stores/changeOrders'
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
  placeholder: 'Search and select change order',
  searchablePlaceholder: 'Search change orders...',
  size: 'sm',
  className: 'w-full',
  disabled: false,
  allowedStatuses: () => ['Approved']
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'change': [changeOrder: any]
}>()

// Stores
const changeOrdersStore = useChangeOrdersStore()
const { formatCurrency } = useCurrencyFormat()

// Local state
const selectedCO = ref<string | undefined>(props.modelValue)
const selectedCOOption = ref<any>(undefined)

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

// CO options computed property
const coOptions = computed(() => {
  if (!props.projectUuid || !props.corporationUuid || !props.vendorUuid) {
    return [];
  }
  
  // Filter change orders by corporation, project, vendor, and allowed statuses
  const filteredCOs = changeOrdersStore.changeOrders.filter(co => 
    co.corporation_uuid === props.corporationUuid &&
    co.project_uuid === props.projectUuid &&
    co.vendor_uuid === props.vendorUuid &&
    props.allowedStatuses.includes(co.status || '')
  );
  
  return filteredCOs.map(co => {
    const coNumber = co.co_number || 'Unnamed CO';
    const vendorName = co.vendor_name || 'Unknown Vendor';
    const amount = co.total_co_amount || 0;
    const formattedAmount = formatCurrency(amount);
    
    // Use CO number as the main label for the select menu
    return {
      label: coNumber,
      value: co.uuid,
      changeOrder: co,
      coNumber: coNumber,
      vendorName: vendorName,
      formattedAmount: formattedAmount,
      status: co.status || 'Draft',
      status_color: getStatusColor(co.status || 'Draft'),
      coType: co.co_type || null,
      searchText: `${co.co_number || ''} ${co.vendor_name || ''} ${co.uuid || ''}`.toLowerCase()
    };
  });
});

// Create a Map for fast O(1) lookup of CO options by UUID
const coOptionsMap = computed(() => {
  return new Map(coOptions.value.map(co => [co.value, co]))
})

// Find the selected CO object for display (optimized with Map for O(1) lookup)
const updateSelectedObject = () => {
  if (!selectedCO.value) {
    selectedCOOption.value = undefined
  } else {
    selectedCOOption.value = coOptionsMap.value.get(selectedCO.value) || undefined
  }
}

// Methods
const handleSelection = (co: any) => {
  if (typeof co === 'string') {
    selectedCO.value = co
    emit('update:modelValue', co)
    const option = coOptionsMap.value.get(co)
    if (option) {
      emit('change', option)
    } else {
      emit('change', undefined)
    }
    return
  }

  if (co && typeof co === 'object') {
    const value = co.value ?? co.uuid ?? co.id
    if (value) {
      selectedCO.value = value
      emit('update:modelValue', value)
      emit('change', co)
      return
    }
  }

  selectedCO.value = undefined
  emit('update:modelValue', undefined)
  emit('change', undefined)
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  selectedCO.value = newValue
  updateSelectedObject()
})

watch(coOptions, () => {
  updateSelectedObject()
}, { immediate: true })

watch(selectedCO, () => {
  updateSelectedObject()
})

// Watch for project, corporation, or vendor changes and fetch change orders
watch([() => props.projectUuid, () => props.corporationUuid, () => props.vendorUuid], async ([newProjectUuid, newCorpUuid, newVendorUuid], [oldProjectUuid, oldCorpUuid, oldVendorUuid]) => {
  // Clear selected CO when project, corporation, or vendor changes
  if ((newProjectUuid !== oldProjectUuid || newCorpUuid !== oldCorpUuid || newVendorUuid !== oldVendorUuid) && (oldProjectUuid || oldCorpUuid || oldVendorUuid)) {
    selectedCO.value = undefined
    selectedCOOption.value = undefined
    emit('update:modelValue', undefined)
  }
  
  // Fetch change orders for the new corporation
  if (newCorpUuid) {
    try {
      await changeOrdersStore.fetchChangeOrders(newCorpUuid)
    } catch (error) {
      console.error('[ChangeOrderSelect] Error fetching change orders:', error)
    }
  }
}, { immediate: true })

// Load data if needed on mount
if (props.corporationUuid) {
  // Check if we need to fetch change orders for this corporation
  const hasCOsForCorp = changeOrdersStore.changeOrders.some(
    co => co.corporation_uuid === props.corporationUuid
  )
  if (!hasCOsForCorp) {
    changeOrdersStore.fetchChangeOrders(props.corporationUuid)
  }
}
</script>

