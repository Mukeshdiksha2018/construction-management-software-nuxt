<template>
  <USelectMenu
    v-model="selectedSequenceValue"
    :items="sequenceOptions"
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

interface SequenceOption {
  label: string
  value: string
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
  item_sequence?: string
  sequence?: string
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
  excludeItemUuids?: string[] // Item UUIDs to exclude from options (e.g., already selected items)
}>(), {
  placeholder: 'Select sequence',
  searchable: true,
  searchablePlaceholder: 'Search sequences...',
  size: 'sm',
  className: 'w-full',
  disabled: false,
  items: () => [],
  useEstimateCreationStore: false,
  excludeItemUuids: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  change: [payload: { value: string | undefined; option?: SequenceOption }]
}>()

const configurationsStore = useCostCodeConfigurationsStore()
const estimateCreationStore = useEstimateCreationStore()

const selectedSequenceValue = ref<string | undefined>(props.modelValue)
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

const providedItems = computed<ExternalItemOption[]>(() =>
  Array.isArray(props.items) ? props.items : []
)

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
      return (activePreferred as ExternalItemOption[]).map((item) => ({
        ...item,
        cost_code_configuration_uuid: configTyped?.uuid,
        cost_code_number: configTyped?.cost_code_number,
        cost_code_name: configTyped?.cost_code_name,
      }))
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
  // When costCodeUuid is provided, mirror ItemSelect behaviour and use preferred_items
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
    
    const preferred = Array.isArray(config?.preferred_items)
      ? config?.preferred_items
      : []
    // Filter out inactive items - only show items with status 'Active'
    const activePreferred = preferred.filter((item: any) => 
      item.status === 'Active' || item.status === undefined || item.status === null
    )
    let mapped = (activePreferred as ExternalItemOption[]).map((item) => ({
      ...item,
      cost_code_configuration_uuid: config?.uuid,
      cost_code_number: config?.cost_code_number,
      cost_code_name: config?.cost_code_name,
    }))
    
    // If we have a modelValue that's not in the preferred items, we need to include it
    // This happens when editing an existing estimate where saved items might not be in preferred items
    if (props.modelValue && props.modelValue.trim() !== '') {
      const modelValueStr = String(props.modelValue)
      const hasModelValue = mapped.some(item => 
        String(item.uuid || item.value || item.item_uuid) === modelValueStr
      )
      
      if (!hasModelValue) {
        // We'll fetch it via getAllItems which should include all items, not just preferred
        let allItems =
          typeof configurationsStore.getAllItems === 'function'
            ? configurationsStore.getAllItems(props.corporationUuid)
            : []
        
        // Filter by project if projectUuid is provided
        if (props.projectUuid && Array.isArray(allItems) && allItems.length > 0) {
          allItems = allItems.filter((item: any) => item.project_uuid === props.projectUuid)
        }
        
        // Filter out inactive items - only show items with status 'Active'
        allItems = allItems.filter((item: any) => 
          item.status === 'Active' || item.status === undefined || item.status === null
        )
        
        const matchingItem = Array.isArray(allItems) 
          ? allItems.find((item: any) => 
              String(item.uuid || item.value || item.item_uuid) === modelValueStr
            )
          : null
        
        if (matchingItem) {
          mapped = [
            {
              ...matchingItem,
              cost_code_configuration_uuid: config?.uuid,
              cost_code_number: config?.cost_code_number,
              cost_code_name: config?.cost_code_name,
            },
            ...mapped
          ]
        }
      }
    }
    
    return mapped
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

const sequenceOptions = computed<SequenceOption[]>(() => {
  // Merge providedItems with storeItems to ensure saved items are always available
  // providedItems (from materialItems) take precedence for saved items
  const providedItemsMap = new Map<string, any>()
  providedItems.value.forEach((item: any) => {
    const key = String(item.uuid || item.item_uuid || item.value || '')
    if (key) {
      providedItemsMap.set(key, item)
    }
  })
  
  // Create a set of excluded item UUIDs for quick lookup
  const excludedUuidsSet = new Set(
    (props.excludeItemUuids || []).map((uuid: string) => String(uuid).toLowerCase())
  )
  
  // Start with provided items, then add store items that aren't already in provided items
  // Also exclude items that are in the excludeItemUuids list
  const mergedItems: ExternalItemOption[] = [...providedItems.value]
  storeItems.value.forEach((item: any) => {
    const key = String(item.uuid || item.item_uuid || item.value || '')
    const keyLower = key.toLowerCase()
    // Include if not in providedItems and not in excludedUuids
    // Also check if it's the current modelValue (allow current selection)
    const isCurrentValue = props.modelValue && String(props.modelValue).toLowerCase() === keyLower
    if (key && !providedItemsMap.has(key) && (!excludedUuidsSet.has(keyLower) || isCurrentValue)) {
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
      const seq = item.item_sequence || item.sequence
      const itemUuid = item.uuid || item.value || item.item_uuid
      if (!seq || !itemUuid) {
        return null
      }

      const value = String(itemUuid)
      const label = String(seq)

      const costCodeNumber = (item as any).cost_code_number
      const costCodeName = (item as any).cost_code_name
      const itemName = item.item_name || item.name
      const subtitleParts: string[] = []
      if (itemName) subtitleParts.push(itemName)
      if (costCodeNumber || costCodeName) {
        subtitleParts.push(
          [costCodeNumber, costCodeName].filter(Boolean).join(' • ')
        )
      }
      const subtitle =
        subtitleParts.length > 0 ? subtitleParts.join(' • ') : undefined

      const option = {
        label,
        value,
        subtitle,
        raw: item,
        searchText: `${label} ${subtitle || ''}`.toLowerCase(),
      } as SequenceOption & { searchText: string }
      
      return option
    })
    .filter(
      (option): option is SequenceOption & { searchText: string } =>
        option !== null
    )

  // Remove duplicates by value (item_uuid), keep first occurrence
  const seen = new Set<string>()
  const unique: SequenceOption[] = []
  normalized.forEach((option) => {
    if (!seen.has(option.value)) {
      seen.add(option.value)
      unique.push(option)
    }
  })
  
  return unique
})

const optionsMap = computed(() => {
  return new Map<string, SequenceOption>(
    sequenceOptions.value.map((option) => [option.value, option])
  )
})

const resolveOption = (value?: string) =>
  value ? optionsMap.value.get(value) : undefined

const normalizeSelection = (payload?: string | SequenceOption) => {
  if (typeof payload === 'string') {
    return { value: payload, option: resolveOption(payload) }
  }
  const value = payload?.value
  return { value, option: value ? resolveOption(value) ?? payload : payload }
}

const currentOption = computed(() => resolveOption(selectedSequenceValue.value))
const triggerLabel = computed(
  () => currentOption.value?.label ?? props.placeholder
)
const displayTriggerLabel = computed(() => {
  const label = triggerLabel.value ?? ''
  if (!currentOption.value || label.length <= 25) {
    return label
  }
  return `${label.slice(0, 25).trimEnd()}...`
})

const handleSelection = (payload?: string | SequenceOption) => {
  const { value, option } = normalizeSelection(payload)
  selectedSequenceValue.value = value
  emit('update:modelValue', value)
  emit('change', { value, option })
}

watch(
  () => props.modelValue,
  (newValue) => {
    selectedSequenceValue.value = newValue
  }
)

watch(
  sequenceOptions,
  () => {
    if (!selectedSequenceValue.value) return
    
    // Don't clear the value if the options map is empty (options might still be loading)
    // Only clear if we have options but the value is not in them
    if (sequenceOptions.value.length === 0) {
      return
    }
    
    // Value exists in the options map, no need to clear
    if (optionsMap.value.has(selectedSequenceValue.value)) {
      return
    }
    
    // We have options but the value is not in them - clear it
    // Use nextTick to ensure all reactive updates have completed
    nextTick(() => {
      if (selectedSequenceValue.value && sequenceOptions.value.length > 0 && !optionsMap.value.has(selectedSequenceValue.value)) {
      selectedSequenceValue.value = undefined
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
    console.error('[SequenceSelect] Error fetching configuration from API:', err)
    fetchedConfig.value = null
  } finally {
    fetchingConfig.value = false
  }
}

watch(() => [props.costCodeUuid, props.corporationUuid], ([costCodeUuid, corporationUuid]) => {
  if (typeof window === 'undefined') return
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

watch(
  () => props.corporationUuid,
  (newUuid) => {
    if (typeof window === 'undefined') return
    if (!newUuid) return
    
    // If using estimateCreationStore, data is already fetched there, no need to fetch in global store
    if (props.useEstimateCreationStore) {
      return
    }
    
    if (configurationsStore.loading) return
    const hasData =
      configurationsStore.getConfigurationCountByCorporation(newUuid) > 0
    if (!hasData) {
      configurationsStore.fetchConfigurations(newUuid)
    }
  },
  { immediate: true }
)
</script>
