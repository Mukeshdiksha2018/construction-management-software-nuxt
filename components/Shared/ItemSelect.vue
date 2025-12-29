<template>
  <USelectMenu
    v-model="selectedItemValue"
    :items="itemOptions"
    :filter-fields="['label', 'short_name', 'searchText']"
    :placeholder="placeholder"
    :searchable="searchable"
    :searchable-placeholder="searchablePlaceholder"
    :size="size"
    :class="className"
    :disabled="disabled"
    variant="outline"
    :ui="menuUi"
    value-key="value"
    @update:model-value="handleSelection"
    :trailing-icon="undefined"
  >
    <template #default>
      <span
        class="flex-1 whitespace-normal text-left"
        :class="{ 'text-muted': !currentOption }"
      >
        {{ displayTriggerLabel }}
      </span>
    </template>
    <template #trailing="{ open }">
      <UIcon
        name="i-heroicons-chevron-down-20-solid"
        class="transition-transform duration-200"
        :class="{ 'rotate-180': open }"
      />
    </template>
    <template #item-label="{ item }">
      <div class="flex min-w-0 flex-col text-left">
        <span class="font-medium text-default truncate">
          {{ item.label }}
        </span>
        <span
          v-if="item.subtitle"
          class="text-[11px] text-muted uppercase tracking-wide truncate"
        >
          {{ item.subtitle }}
        </span>
      </div>
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useCostCodeConfigurationsStore } from '@/stores/costCodeConfigurations'
import { useEstimateCreationStore } from '@/stores/estimateCreation'

interface ItemOption {
  label: string
  value: string
  short_name?: string
  description?: string
  unit?: string
  unit_price?: number | string | null
  subtitle?: string
  raw?: any
  searchText?: string
}

interface ExternalItemOption {
  label?: string
  value?: string
  item_name?: string
  uuid?: string
  short_name?: string
  description?: string
  unit?: string
  unit_price?: number | string | null
  [key: string]: any
}

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  searchable?: boolean
  searchablePlaceholder?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  disabled?: boolean
  corporationUuid?: string
  projectUuid?: string
  costCodeUuid?: string
  items?: ExternalItemOption[]
  ui?: any
  useEstimateCreationStore?: boolean // If true, use estimateCreationStore instead of global store
}>(), {
  placeholder: 'Select item',
  searchable: true,
  searchablePlaceholder: 'Search items...',
  size: 'sm',
  className: 'w-full',
  disabled: false,
  items: () => [],
  useEstimateCreationStore: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  change: [payload: { value: string | undefined; option?: ItemOption }]
}>()

const configurationsStore = useCostCodeConfigurationsStore()
const estimateCreationStore = useEstimateCreationStore()

const selectedItemValue = ref<string | undefined>(props.modelValue)
const fetchedConfig = ref<CostCodeConfigurationLike | null>(null)
const fetchingConfig = ref(false)

const defaultUi = {
  trigger: 'flex w-full justify-between gap-2 text-left',
  content: 'max-h-60 min-w-full w-max',
}

const menuUi = computed(() => ({
  ...defaultUi,
  ...(props.ui ?? {}),
}))

const providedItems = computed<ExternalItemOption[]>(() => Array.isArray(props.items) ? props.items : [])

type CostCodeConfigurationLike = {
  preferred_items?: ExternalItemOption[]
  uuid?: string
  cost_code_number?: string
  cost_code_name?: string
}

const storeItems = computed<ExternalItemOption[]>(() => {
  if (!props.corporationUuid) {
    return []
  }

  // Use estimateCreationStore if specified (for new estimate creation)
  if (props.useEstimateCreationStore) {
    // getActiveConfigurations is a computed property (auto-unwrapped by Pinia)
    // It returns an array directly, not a function
    const activeConfigs = estimateCreationStore.getActiveConfigurations || []
    
    if (props.costCodeUuid) {
      // Find configuration in estimateCreationStore
      const config = Array.isArray(activeConfigs) 
        ? activeConfigs.find((c: any) => c.uuid === props.costCodeUuid)
        : undefined
      const configTyped = config as CostCodeConfigurationLike | undefined
      const preferred = Array.isArray(configTyped?.preferred_items) ? configTyped?.preferred_items : []
      // Filter out inactive items - only show items with status 'Active'
      const activePreferred = preferred.filter((item: any) => 
        item.status === 'Active' || item.status === undefined || item.status === null
      )
      const result = (activePreferred as ExternalItemOption[]).map((item) => ({
        ...item,
        cost_code_configuration_uuid: configTyped?.uuid,
        cost_code_number: configTyped?.cost_code_number,
        cost_code_name: configTyped?.cost_code_name,
      }))
      return result
    }

    // Get all items from all configurations in estimateCreationStore
    const allItems: ExternalItemOption[] = []
    if (Array.isArray(activeConfigs)) {
      activeConfigs.forEach((config: any) => {
        if (config.preferred_items && Array.isArray(config.preferred_items) && config.preferred_items.length > 0) {
          config.preferred_items.forEach((item: any) => {
            // Filter by project if projectUuid is provided
            // Also filter out inactive items - only show items with status 'Active'
            if ((!props.projectUuid || item.project_uuid === props.projectUuid) &&
                (item.status === 'Active' || item.status === undefined || item.status === null)) {
              allItems.push({
                ...item,
                cost_code_configuration_uuid: config.uuid,
                cost_code_number: config.cost_code_number,
                cost_code_name: config.cost_code_name,
              })
            }
          })
        }
      })
    }
    return allItems
  }

  // Use global store (default behavior)
  if (props.costCodeUuid) {
    // First try to get from store
    const getById = configurationsStore.getConfigurationById
    let config =
      typeof getById === 'function'
        ? (getById(props.costCodeUuid) as CostCodeConfigurationLike | undefined)
        : undefined
    
    // If not in store or no preferred_items, try fetched config
    if (!config || !Array.isArray(config.preferred_items) || config.preferred_items.length === 0) {
      config = fetchedConfig.value || config
    }
    
    const preferred = Array.isArray(config?.preferred_items) ? config?.preferred_items : []
    // Filter out inactive items - only show items with status 'Active'
    const activePreferred = preferred.filter((item: any) => 
      item.status === 'Active' || item.status === undefined || item.status === null
    )
    const result = (activePreferred as ExternalItemOption[]).map((item) => ({
      ...item,
      cost_code_configuration_uuid: config?.uuid,
      cost_code_number: config?.cost_code_number,
      cost_code_name: config?.cost_code_name,
    }))
    return result
  }

  const allItems =
    typeof configurationsStore.getAllItems === 'function'
      ? configurationsStore.getAllItems(props.corporationUuid)
      : []

  // Filter by project if projectUuid is provided
  let filteredItems = Array.isArray(allItems) ? (allItems as ExternalItemOption[]) : []
  if (props.projectUuid && filteredItems.length > 0) {
    filteredItems = filteredItems.filter((item: any) => item.project_uuid === props.projectUuid)
  }
  
  // Filter out inactive items - only show items with status 'Active'
  filteredItems = filteredItems.filter((item: any) => 
    item.status === 'Active' || item.status === undefined || item.status === null
  )

  return filteredItems
})

const itemOptions = computed<ItemOption[]>(() => {
  // Merge providedItems with storeItems to ensure saved items are always available
  // providedItems (from materialItems) take precedence for saved items
  const providedItemsMap = new Map<string, any>()
  providedItems.value.forEach((item: any) => {
    const key = String(item.uuid || item.item_uuid || item.value || '')
    if (key) {
      providedItemsMap.set(key, item)
    }
  })
  
  // Start with provided items, then add store items that aren't already in provided items
  const mergedItems: ExternalItemOption[] = [...providedItems.value]
  storeItems.value.forEach((item: any) => {
    const key = String(item.uuid || item.item_uuid || item.value || '')
    if (key && !providedItemsMap.has(key)) {
      mergedItems.push(item)
    }
  })
  
  // Filter out inactive items - only show items with status 'Active'
  const source = mergedItems.filter((item: any) => {
    const status = String(item.status || '').trim()
    // Show item if status is 'Active' or if status is not set (for backward compatibility)
    return status === '' || status.toLowerCase() === 'active'
  })

  const normalized = source
    .map((item) => {
      const value = item.value || item.uuid || item.item_uuid || item.item_name
      if (!value) {
        return null
      }

      const label = item.label || item.item_name || item.name || String(value)

      const costCodeNumber = (item as any).cost_code_number
      const costCodeName = (item as any).cost_code_name
      const subtitle =
        typeof costCodeNumber === 'string' || typeof costCodeName === 'string'
          ? [costCodeNumber, costCodeName].filter(Boolean).join(' • ')
          : undefined

      const option = {
        label,
        value: String(value),
        short_name: item.short_name || item.unit || '',
        description: item.description,
        unit: item.unit,
        unit_price: item.unit_price,
        subtitle,
        raw: item,
        searchText: `${label} ${subtitle || ''} ${item.short_name || ''}`.toLowerCase(),
      } as ItemOption & { searchText: string }
      
      return option
    })
    .filter((option): option is ItemOption & { searchText: string } => option !== null)

  // Remove duplicates by value, keep first occurrence
  const seen = new Set<string>()
  const unique: ItemOption[] = []
  normalized.forEach((option) => {
    if (!seen.has(option.value)) {
      seen.add(option.value)
      unique.push(option)
    }
  })
  
  return unique
})

const optionsMap = computed(() => {
  return new Map<string, ItemOption>(itemOptions.value.map(option => [option.value, option]))
})

const resolveOption = (value?: string) => (value ? optionsMap.value.get(value) : undefined)

const normalizeSelection = (payload?: string | ItemOption) => {
  if (typeof payload === 'string') {
    return { value: payload, option: resolveOption(payload) }
  }
  const value = payload?.value
  return { value, option: value ? resolveOption(value) ?? payload : payload }
}

const currentOption = computed(() => resolveOption(selectedItemValue.value))
const triggerLabel = computed(() => currentOption.value?.label ?? props.placeholder)
const displayTriggerLabel = computed(() => {
  const label = triggerLabel.value ?? ''
  if (!currentOption.value || label.length <= 25) {
    return label
  }
  return `${label.slice(0, 25).trimEnd()}...`
})

const handleSelection = (payload?: string | ItemOption) => {
  const { value, option } = normalizeSelection(payload)
  selectedItemValue.value = value
  emit('update:modelValue', value)
  emit('change', { value, option })
}

watch(
  () => props.modelValue,
  (newValue) => {
    selectedItemValue.value = newValue
  }
)

watch(
  itemOptions,
  () => {
    if (!selectedItemValue.value) return
    
    // Don't clear the value if the options map is empty (options might still be loading)
    // Only clear if we have options but the value is not in them
    if (itemOptions.value.length === 0) {
      return
    }
    
    // Value exists in the options map, no need to clear
    if (optionsMap.value.has(selectedItemValue.value)) {
      return
    }
    
    // We have options but the value is not in them - clear it
    // Use nextTick to ensure all reactive updates have completed
    nextTick(() => {
      if (selectedItemValue.value && itemOptions.value.length > 0 && !optionsMap.value.has(selectedItemValue.value)) {
      selectedItemValue.value = undefined
      emit('update:modelValue', undefined)
      emit('change', { value: undefined, option: undefined })
    }
    })
  },
  { immediate: true }
)

// Fetch configuration with preferred items from API when costCodeUuid is provided
const fetchConfigurationFromAPI = async (costCodeUuid: string, corporationUuid: string) => {
  if (fetchingConfig.value) {
    return
  }
  
  try {
    fetchingConfig.value = true
    // Fetch all configurations for the corporation and find the one we need
    const response: any = await $fetch('/api/cost-code-configurations', {
      query: { corporation_uuid: corporationUuid },
    })
    
    const data = response?.data || response || []
    const config = Array.isArray(data) 
      ? data.find((c: any) => c.uuid === costCodeUuid)
      : null
    
    if (config) {
      // Ensure preferred_items is properly mapped (API returns preferred_items, not cost_code_preferred_items)
      const mappedConfig = {
        ...config,
        preferred_items: config.preferred_items || config.cost_code_preferred_items || []
      }
      fetchedConfig.value = mappedConfig as CostCodeConfigurationLike
    } else {
      fetchedConfig.value = null
    }
  } catch (err: any) {
    console.error('[ItemSelect] Error fetching configuration from API:', err)
    fetchedConfig.value = null
  } finally {
    fetchingConfig.value = false
  }
}

watch(() => [props.costCodeUuid, props.corporationUuid], ([costCodeUuid, corporationUuid]) => {
  if (typeof window === 'undefined') {
    return
  }
  if (!costCodeUuid || !corporationUuid) {
    fetchedConfig.value = null
    return
  }
  
  // If using estimateCreationStore, data is already fetched there
  if (props.useEstimateCreationStore) {
    fetchedConfig.value = null
    return
  }
  
  // Check if we have the config in store with preferred_items
  const getById = configurationsStore.getConfigurationById
  const config = typeof getById === 'function'
    ? (getById(costCodeUuid) as CostCodeConfigurationLike | undefined)
    : undefined
  
  // If config not in store or doesn't have preferred_items, fetch from API
  if (!config || !Array.isArray(config.preferred_items) || config.preferred_items.length === 0) {
    fetchConfigurationFromAPI(costCodeUuid, corporationUuid)
  } else {
    // Clear fetched config if we have it in store
    fetchedConfig.value = null
  }
}, { immediate: true, deep: true })

watch(() => props.corporationUuid, (newUuid) => {
  if (typeof window === 'undefined') return
  if (!newUuid) return
  
  // If using estimateCreationStore, data is already fetched there, no need to fetch in global store
  if (props.useEstimateCreationStore) {
    return
  }
  
  if (configurationsStore.loading) return
  const hasData = configurationsStore.getConfigurationCountByCorporation(newUuid) > 0
  if (!hasData) {
    configurationsStore.fetchConfigurations(newUuid)
  }
}, { immediate: true })
</script>

