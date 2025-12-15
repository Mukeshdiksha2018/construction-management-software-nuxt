<template>
  <USelectMenu
    v-model="selectedVendorObject"
    :items="vendorOptions"
    :filter-fields="['label', 'searchText']"
    :placeholder="!corporationUuid ? 'Select corporation first' : placeholder"
    :searchable="searchable"
    :searchable-placeholder="searchablePlaceholder"
    :size="size"
    :class="className"
    :disabled="disabled || loading || !corporationUuid"
    :loading="loading"
    :ui="menuUi"
    value-key="value"
    label-key="label"
    @update:model-value="handleSelection"
  >
    <template #item-label="{ item }">
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2 flex-1">
          <span class="font-medium whitespace-normal break-words text-left">
            {{ item.label }}
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
      </div>
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useVendorStore } from '@/stores/vendors'

// Props
interface Props {
  modelValue?: string
  placeholder?: string
  searchable?: boolean
  searchablePlaceholder?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  disabled?: boolean
  corporationUuid?: string
  localVendors?: any[] // Optional local vendors array (takes precedence over store)
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search vendor...',
  searchable: true,
  searchablePlaceholder: 'Type to search...',
  size: 'sm',
  className: 'w-full',
  disabled: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'change': [vendor: any]
}>()

// Store (for syncing fetched vendors so other components can access them)
const vendorStore = useVendorStore()

// Local state
const selectedVendor = ref<string | undefined>(props.modelValue)
const selectedVendorObject = ref<any>(undefined)

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
    'Active': 'success',
    'Inactive': 'error'
  };
  return statusColors[status] || 'neutral';
};

// Local state for vendors fetched from API
const vendors = ref<any[]>([])
const loading = ref(false)

// Fetch vendors from API
const fetchVendorsFromAPI = async (corporationUuid: string) => {
  if (!corporationUuid) {
    vendors.value = []
    return
  }
  
  loading.value = true
  try {
    const response = await $fetch(
      `/api/purchase-orders/vendors?corporation_uuid=${corporationUuid}`
    )
    if (response?.error) throw new Error(response.error)
    const fetchedVendors = response?.data || []
    vendors.value = fetchedVendors
    
    // Also update the store so other components can access vendor details
    // This ensures PurchaseOrderForm can look up vendor information
    vendorStore.vendors = fetchedVendors
  } catch (error: any) {
    console.error('Failed to fetch vendors:', error)
    vendors.value = []
  } finally {
    loading.value = false
  }
}

// Computed properties
const vendorOptions = computed(() => {
  // If local vendors are provided, use them instead
  let list: any[] = []
  
  if (props.localVendors !== undefined) {
    list = props.localVendors
  } else {
    // Use vendors fetched from API, filtered by corporation
    list = vendors.value.filter(vendor => 
      !props.corporationUuid || vendor.corporation_uuid === props.corporationUuid
    )
  }
  
  return list.map((vendor) => {
    const status = vendor.is_active ? 'Active' : 'Inactive'
    return {
      label: vendor.vendor_name,
      value: vendor.uuid,
      id: vendor.id,
      vendor: vendor,
      status: status,
      status_color: getStatusColor(status),
      searchText: `${vendor.vendor_name} ${vendor.uuid}`.toLowerCase()
    }
  })
})

// Create a Map for fast O(1) lookup of vendor options by UUID
const vendorOptionsMap = computed(() => {
  return new Map(vendorOptions.value.map(vendor => [vendor.value, vendor]))
})

// Find the selected vendor object for display (optimized with Map for O(1) lookup)
const updateSelectedObject = () => {
  if (!selectedVendor.value) {
    selectedVendorObject.value = undefined
  } else {
    selectedVendorObject.value = vendorOptionsMap.value.get(selectedVendor.value) || undefined
  }
}

// Methods
const handleSelection = (vendor: any) => {
  if (vendor) {
    selectedVendor.value = vendor.value
    emit('update:modelValue', vendor.value)
    emit('change', vendor)
  } else {
    selectedVendor.value = undefined
    emit('update:modelValue', undefined)
  }
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  selectedVendor.value = newValue
  updateSelectedObject()
})

watch(vendorOptions, () => {
  updateSelectedObject()
}, { immediate: true })

watch(selectedVendor, () => {
  updateSelectedObject()
})

// Watch for corporation changes and fetch vendors from API
watch(() => props.corporationUuid, async (newCorpUuid, oldCorpUuid) => {
  // Clear selected vendor when corporation changes
  if (newCorpUuid !== oldCorpUuid && oldCorpUuid) {
    selectedVendor.value = undefined
    selectedVendorObject.value = undefined
    emit('update:modelValue', undefined)
  }
  
  // Fetch vendors from API for the new corporation (only if local vendors are not provided)
  if (props.localVendors === undefined && newCorpUuid) {
    await fetchVendorsFromAPI(newCorpUuid)
  }
}, { immediate: true })

// Load data if needed on mount (only if local vendors are not provided)
if (props.localVendors === undefined && props.corporationUuid) {
  fetchVendorsFromAPI(props.corporationUuid)
}

</script>

