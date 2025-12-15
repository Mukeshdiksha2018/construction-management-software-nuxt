<template>
  <USelectMenu
    v-model="selectedDivisionValue"
    :items="divisionOptions"
    :filter-fields="['label', 'searchText']"
    :placeholder="placeholder"
    :searchable="searchable"
    :searchable-placeholder="searchablePlaceholder"
    :size="size"
    :class="className"
    :disabled="disabled || !hasDivisions"
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
import { useCostCodeDivisionsStore } from '@/stores/costCodeDivisions'

interface DivisionOption {
  label: string
  value: string
  subtitle?: string
  raw?: any
  searchText?: string
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
  localDivisions?: any[] // Optional local divisions array (takes precedence over store)
  ui?: any
}>(), {
  placeholder: 'Select division',
  searchable: true,
  searchablePlaceholder: 'Search divisions...',
  size: 'sm',
  className: 'w-full',
  disabled: false,
  localDivisions: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  change: [payload: { value: string | undefined; option?: DivisionOption }]
}>()

const divisionsStore = useCostCodeDivisionsStore()

const selectedDivisionValue = ref<string | undefined>(props.modelValue)

const defaultUi = {
  trigger: 'flex w-full justify-between gap-2 text-left',
  content: 'max-h-60 min-w-full w-max',
}

const menuUi = computed(() => ({
  ...defaultUi,
  ...(props.ui ?? {}),
}))

const storeDivisions = computed(() => {
  // If local divisions are provided, use them instead of store
  if (props.localDivisions && props.localDivisions.length >= 0) {
    // Filter active divisions from local divisions
    return props.localDivisions.filter(
      (division: any) => division.is_active !== false
    )
  }
  
  if (!props.corporationUuid) return []
  
  const getActiveDivisions = divisionsStore.getActiveDivisions
  if (typeof getActiveDivisions === 'function') {
    return getActiveDivisions(props.corporationUuid)
  }
  
  // Fallback: filter manually
  return divisionsStore.divisions.filter(
    (division: any) => 
      division.corporation_uuid === props.corporationUuid && 
      division.is_active
  )
})

const divisionOptions = computed<DivisionOption[]>(() => {
  const divisions = storeDivisions.value

  const normalized = divisions
    .map((division: any) => {
      const value = division.value || division.uuid
      if (!value) return null

      const divisionNumber = division.division_number || ''
      const divisionName = division.division_name || ''
      const label = divisionNumber 
        ? `${divisionNumber} - ${divisionName}` 
        : divisionName

      const subtitle = division.description || undefined

      return {
        label,
        value: String(value),
        subtitle,
        raw: division,
        searchText: `${label} ${divisionNumber} ${divisionName} ${division.description || ''}`.toLowerCase(),
      } as DivisionOption & { searchText: string }
    })
    .filter((option): option is DivisionOption & { searchText: string } => option !== null)

  // Remove duplicates by value, keep first occurrence
  const seen = new Set<string>()
  const unique: DivisionOption[] = []
  normalized.forEach((option) => {
    if (!seen.has(option.value)) {
      seen.add(option.value)
      unique.push(option)
    }
  })

  return unique
})

const hasDivisions = computed(() => divisionOptions.value.length > 0)

const optionsMap = computed(() => {
  return new Map<string, DivisionOption>(divisionOptions.value.map(option => [option.value, option]))
})

const resolveOption = (value?: string) => (value ? optionsMap.value.get(value) : undefined)

const normalizeSelection = (payload?: string | DivisionOption) => {
  if (typeof payload === 'string') {
    return { value: payload, option: resolveOption(payload) }
  }
  const value = payload?.value
  return { value, option: value ? resolveOption(value) ?? payload : payload }
}

const currentOption = computed(() => resolveOption(selectedDivisionValue.value))
const triggerLabel = computed(() => currentOption.value?.label ?? props.placeholder)
const displayTriggerLabel = computed(() => {
  const label = triggerLabel.value ?? ''
  if (!currentOption.value || label.length <= 25) {
    return label
  }
  return `${label.slice(0, 25).trimEnd()}...`
})

const handleSelection = (payload?: string | DivisionOption) => {
  const { value, option } = normalizeSelection(payload)
  selectedDivisionValue.value = value
  emit('update:modelValue', value)
  emit('change', { value, option })
}

watch(
  () => props.modelValue,
  (newValue) => {
    selectedDivisionValue.value = newValue
  }
)

watch(
  [divisionOptions, () => props.corporationUuid, () => props.localDivisions],
  () => {
    if (!selectedDivisionValue.value) return
    
    // If corporation changed, clear selection immediately
    if (!props.corporationUuid) {
      selectedDivisionValue.value = undefined
      emit('update:modelValue', undefined)
      emit('change', { value: undefined, option: undefined })
      return
    }
    
    // Don't clear the value if the options map is empty (options might still be loading)
    // Only clear if we have options but the value is not in them
    if (divisionOptions.value.length === 0) {
      return
    }
    
    // Value exists in the options map, no need to clear
    if (optionsMap.value.has(selectedDivisionValue.value)) {
      return
    }
    
    // We have options but the value is not in them - clear it
    // Use nextTick to ensure all reactive updates have completed
    nextTick(() => {
      if (selectedDivisionValue.value && divisionOptions.value.length > 0 && !optionsMap.value.has(selectedDivisionValue.value)) {
        selectedDivisionValue.value = undefined
        emit('update:modelValue', undefined)
        emit('change', { value: undefined, option: undefined })
      }
    })
  },
  { immediate: true }
)

watch(() => props.corporationUuid, (newUuid, oldUuid) => {
  if (typeof window === 'undefined') return
  
  // If corporation changed, clear the selection
  if (oldUuid && newUuid !== oldUuid && selectedDivisionValue.value) {
    selectedDivisionValue.value = undefined
    emit('update:modelValue', undefined)
    emit('change', { value: undefined, option: undefined })
  }
  
  // If local divisions are provided, don't fetch from store
  if (props.localDivisions !== undefined) {
    return
  }
  
  if (!newUuid) return
  
  // Always fetch divisions for the new corporation to ensure fresh data
  // This ensures we get divisions specific to the selected corporation
  if (newUuid !== oldUuid) {
    // Force fetch from API (useIndexedDB=false) to get fresh data for the new corporation
    divisionsStore.fetchDivisions(newUuid, false, false)
  } else if (!oldUuid) {
    // Initial load - check if we need to fetch
    if (divisionsStore.loading) return
    const getDivisionCountByCorporation = divisionsStore.getDivisionCountByCorporation
    const hasData = typeof getDivisionCountByCorporation === 'function'
      ? getDivisionCountByCorporation(newUuid) > 0
      : divisionsStore.divisions.some((d: any) => d.corporation_uuid === newUuid)
    if (!hasData) {
      divisionsStore.fetchDivisions(newUuid)
    }
  }
}, { immediate: true })
</script>
