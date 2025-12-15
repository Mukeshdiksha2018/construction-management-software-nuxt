<template>
  <USelectMenu
    :model-value="selectedPOOption"
    :items="poOptions"
    :loading="purchaseOrdersStore.loading"
    :disabled="disabled || purchaseOrdersStore.loading || !corporationUuid || !projectUuid || !vendorUuid"
    :placeholder="!corporationUuid ? 'Select corporation first' : (!projectUuid ? 'Select project first' : (!vendorUuid ? 'Select vendor first' : placeholder))"
    :size="size"
    :class="className"
    value-key="value"
    label-key="label"
    searchable
    :searchable-placeholder="searchablePlaceholder"
    @update:model-value="handleSelection"
  >
    <template #item-label="{ item }">
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <span class="truncate font-medium">{{ item.label }}</span>
          <UBadge
            :color="item.type_color"
            variant="solid"
            size="xs"
          >
            {{ item.type_label }}
          </UBadge>
        </div>
      </div>
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { usePurchaseOrdersStore } from '@/stores/purchaseOrders'
import { useVendorStore } from '@/stores/vendors'

// Props
interface Props {
  modelValue?: string
  placeholder?: string
  searchablePlaceholder?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  disabled?: boolean
  corporationUuid?: string
  projectUuid?: string
  vendorUuid?: string
  coType?: string // Filter by CO type
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search and select purchase order',
  searchablePlaceholder: 'Search purchase orders...',
  size: 'sm',
  className: 'w-full',
  disabled: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'change': [po: any]
}>()

// Stores
const purchaseOrdersStore = usePurchaseOrdersStore()
const vendorStore = useVendorStore()

// Local state
const selectedPO = ref<string | undefined>(props.modelValue)
const selectedPOOption = ref<any>(undefined)

// Helper function to get PO type color and label
const getPOTypeInfo = (poType: string) => {
  const typeInfo: Record<string, { color: "error" | "warning" | "info" | "success" | "primary" | "secondary" | "neutral", label: string }> = {
    'LABOR': { color: 'primary', label: 'Labor' },
    'MATERIAL': { color: 'success', label: 'Material' }
  }
  return typeInfo[poType] || { color: 'neutral' as const, label: 'Unknown' }
}

// PO options computed property
const poOptions = computed(() => {
  if (!props.corporationUuid || !props.projectUuid || !props.vendorUuid) {
    return []
  }

  // Filter POs by corporation, project, vendor, and optionally by CO type
  const filteredPOs = purchaseOrdersStore.purchaseOrders.filter(po => {
    if (!po?.uuid) return false

    const sameCorporation = String(po.corporation_uuid || '') === props.corporationUuid
    const sameProject = String(po.project_uuid || '') === props.projectUuid
    const sameVendor = String(po.vendor_uuid || '') === props.vendorUuid

    // Filter by PO type if CO type is specified
    const poType = String(po.po_type || '').toUpperCase()
    const coType = String(props.coType || '').toUpperCase()
    const sameType = coType ? poType === coType : true

    return sameCorporation && sameProject && sameVendor && sameType
  })

  return filteredPOs.map(po => {
    const vendor = vendorStore.vendors.find(v => v.uuid === po.vendor_uuid)
    const vendorName = vendor?.vendor_name || 'N/A'
    const poNum = po?.po_number || 'Unnamed PO'

    const typeInfo = getPOTypeInfo(String(po.po_type || '').toUpperCase())

    return {
      label: `${poNum} — ${vendorName}`,
      value: po.uuid,
      po: po,
      type_color: typeInfo.color,
      type_label: typeInfo.label
    }
  })
})

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
      emit('change', option.po)
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
      emit('change', po.po || po)
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
}, { immediate: true })

watch(poOptions, () => {
  updateSelectedObject()
}, { immediate: true })

watch(selectedPO, () => {
  updateSelectedObject()
})

// Watch for when purchase orders store finishes loading and update selection
watch(() => purchaseOrdersStore.loading, async (isLoading, wasLoading) => {
  // When loading finishes, update the selected object
  if (wasLoading && !isLoading && selectedPO.value) {
    updateSelectedObject()
    // If still not found and we have modelValue, try fetching again
    if (!selectedPOOption.value && props.modelValue && props.corporationUuid && props.projectUuid && props.vendorUuid) {
      if (props.corporationUuid) {
        try {
          await purchaseOrdersStore.fetchPurchaseOrders(props.corporationUuid)
          updateSelectedObject()
        } catch (error) {
          console.error('[POSelectForCO] Error fetching purchase orders:', error)
        }
      }
    }
  }
})

// Watch for corporation/project/vendor changes and fetch POs
watch([() => props.corporationUuid, () => props.projectUuid, () => props.vendorUuid], async ([newCorpUuid, newProjectUuid, newVendorUuid], [oldCorpUuid, oldProjectUuid, oldVendorUuid]) => {
  // Clear selected PO only when corporation/project/vendor actually changes (not on initial load)
  if ((newCorpUuid !== oldCorpUuid || newProjectUuid !== oldProjectUuid || newVendorUuid !== oldVendorUuid) && (oldCorpUuid || oldProjectUuid || oldVendorUuid)) {
    selectedPO.value = undefined
    selectedPOOption.value = undefined
    emit('update:modelValue', undefined)
  }

  // Fetch POs if we have corporation, project, and vendor
  if (newCorpUuid && newProjectUuid && newVendorUuid) {
    try {
      await purchaseOrdersStore.fetchPurchaseOrders(newCorpUuid)
      // Update selected object after fetching
      updateSelectedObject()
    } catch (error) {
      console.error('[POSelectForCO] Error fetching purchase orders:', error)
    }
  }
}, { immediate: true })

// Load data if needed on mount
if (props.corporationUuid && props.projectUuid && props.vendorUuid) {
  // Check if we need to fetch POs for this corporation
  const hasPOsForCorp = purchaseOrdersStore.purchaseOrders.some(
    po => po.corporation_uuid === props.corporationUuid
  )
  if (!hasPOsForCorp) {
    purchaseOrdersStore.fetchPurchaseOrders(props.corporationUuid).then(() => {
      updateSelectedObject()
    })
  } else {
    // POs are already loaded, update selected object immediately
    updateSelectedObject()
  }
}

// Ensure selection is updated after component is fully mounted
onMounted(() => {
  // If we have a modelValue but no selected option, try to update
  if (props.modelValue && !selectedPOOption.value) {
    updateSelectedObject()
    // If still not found and we have corporation/project/vendor, fetch POs
    if (!selectedPOOption.value && props.corporationUuid && props.projectUuid && props.vendorUuid) {
      if (props.corporationUuid) {
        purchaseOrdersStore.fetchPurchaseOrders(props.corporationUuid).then(() => {
          updateSelectedObject()
        })
      }
    }
  } else if (props.modelValue) {
    // If we have modelValue, ensure selected object is updated
    updateSelectedObject()
  }
})
</script>
