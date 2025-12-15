<template>
  <USelectMenu
    v-model="selectedItemTypeObject"
    :items="itemTypeOptions"
    :filter-fields="['label', 'short_name', 'searchText']"
    :placeholder="placeholder"
    :searchable="searchable"
    :searchable-placeholder="searchablePlaceholder"
    :size="size"
    :class="className"
    :disabled="disabled"
    :ui="menuUi"
    value-key="value"
    @update:model-value="handleSelection"
  >
    <template #item-label="{ item }">
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2 flex-1">
          <span class="font-medium whitespace-normal break-words text-left">
            {{ item.label }}
          </span>
          <UBadge
            color="info"
            variant="soft"
            size="xs"
          >
            {{ item.short_name }}
          </UBadge>
        </div>
      </div>
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useItemTypesStore } from '@/stores/itemTypes'

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
  projectUuid?: string
  externalItemTypes?: any[] // Optional: pass scoped item types to avoid using global store
  ui?: any
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search item type...',
  searchable: true,
  searchablePlaceholder: 'Type to search...',
  size: 'sm',
  className: 'w-full',
  disabled: false,
  externalItemTypes: undefined
})

const defaultUi = {
  content: 'max-h-60 min-w-full w-max',
  item: {
    base: 'whitespace-normal break-words',
    label: 'whitespace-normal break-words text-left'
  }
}

const menuUi = computed(() => {
  const incoming = props.ui ?? {}
  const incomingItem = (incoming as any).item ?? {}
  return {
    ...defaultUi,
    ...incoming,
    item: {
      ...defaultUi.item,
      ...incomingItem
    }
  }
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'change': [itemType: any]
}>()

// Stores
const itemTypesStore = useItemTypesStore()

// Local state
const selectedItemType = ref<string | undefined>(props.modelValue)
const selectedItemTypeObject = ref<any>(undefined)

// Computed properties - use external if provided, otherwise use global store
const itemTypeOptions = computed(() => {
  let list: any[] = []
  
  // If external item types are provided, use them (scoped to form's corporation)
  if (props.externalItemTypes && Array.isArray(props.externalItemTypes)) {
    list = props.externalItemTypes.filter((itemType: any) => itemType.is_active)
  } 
  // Otherwise fall back to global store (scoped to TopBar's corporation)
  else if (props.corporationUuid) {
    // When projectUuid is provided, show ONLY item types for that project
    // Do not fall back to corporation-wide item types
    list = itemTypesStore.getActiveItemTypes(
      props.corporationUuid, 
      props.projectUuid
    )
  }
  
  return list.map((itemType) => ({
    label: itemType.item_type,
    value: itemType.uuid,
    short_name: itemType.short_name,
    id: itemType.id,
    searchText: `${itemType.item_type} ${itemType.short_name} ${itemType.uuid}`.toLowerCase()
  }))
})

// Create a Map for fast O(1) lookup of item type options by UUID
const itemTypeOptionsMap = computed(() => {
  const map = new Map(itemTypeOptions.value.map(itemType => [itemType.value, itemType]))
  return map
})

// Find the selected item type object for display (optimized with Map for O(1) lookup)
const updateSelectedObject = () => {
  if (!selectedItemType.value) {
    selectedItemTypeObject.value = undefined
    return
  }
  
  // First try to find in the filtered options
  let found = itemTypeOptionsMap.value.get(selectedItemType.value)
  
  // If not found in filtered options, try to find in the full store
  // This handles cases where the item type exists but might not be in the current filtered list
  if (!found && props.corporationUuid) {
    const allItemTypes = itemTypesStore.getActiveItemTypes(props.corporationUuid)
    const itemType = allItemTypes.find((it: any) => it.uuid === selectedItemType.value)
    if (itemType) {
      found = {
        label: itemType.item_type,
        value: itemType.uuid,
        short_name: itemType.short_name,
        id: itemType.id,
        searchText: `${itemType.item_type} ${itemType.short_name} ${itemType.uuid}`.toLowerCase()
      }
    }
  }
  
  selectedItemTypeObject.value = found || undefined
}

// Methods
const handleSelection = (itemType: any) => {
  if (!itemType) {
    selectedItemType.value = undefined
    emit('update:modelValue', undefined)
    return
  }

  const resolvedValue =
    typeof itemType === 'string'
      ? itemType
      : typeof itemType === 'object'
        ? itemType.value ?? itemType.uuid ?? itemType.id ?? undefined
        : undefined

  if (!resolvedValue) {
    return
  }

  selectedItemType.value = resolvedValue
  emit('update:modelValue', resolvedValue)

  const option =
    typeof itemType === 'object' && itemType
      ? itemType
      : itemTypeOptionsMap.value.get(resolvedValue) || { value: resolvedValue }

  emit('change', option)
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  selectedItemType.value = newValue
  updateSelectedObject()
})

watch(itemTypeOptions, () => {
  updateSelectedObject()
}, { immediate: true })

watch(selectedItemType, () => {
  updateSelectedObject()
})

watch(
  () => [props.corporationUuid, props.projectUuid] as const,
  async ([corpUuid, projectUuid]) => {
    // Skip fetching if external item types are provided
    if (props.externalItemTypes) return
    
    if (typeof window === 'undefined') return
    if (!corpUuid) return
    if (itemTypesStore.loading) return
    
    // Check if we have options for THIS SPECIFIC corporation/project combo
    // Don't check global options - check options for this specific selection
    const hasOptionsForThisCorp = itemTypeOptions.value.length > 0
    if (hasOptionsForThisCorp) return
    
    // Check if store already has data for this corporation/project
    // This prevents duplicate API calls when data is already loaded (e.g., by PurchaseOrderForm)
    const hasCachedData = itemTypesStore.hasCachedData(corpUuid, projectUuid)
    
    // Also check if getActiveItemTypes returns any data (even if cache flag not set)
    // This handles cases where data was loaded by another component
    const existingItems = itemTypesStore.getActiveItemTypes(corpUuid, projectUuid)
    const hasStoreData = existingItems.length > 0
    
    if (hasCachedData || hasStoreData) {
      return
    }
    
    try {
      await itemTypesStore.fetchItemTypes(corpUuid, projectUuid)
    } catch (error) {
      console.error('[ItemTypeSelect] Failed to fetch item types', error)
    }
  },
  { immediate: true }
)

</script>

