<template>
  <USelectMenu
    :model-value="selectedOption"
    :items="options"
    :loading="store.loading"
    :disabled="disabled || store.loading"
    :placeholder="placeholder"
    :size="size"
    :class="className"
    variant="outline"
    value-key="value"
    searchable
    :searchable-placeholder="searchablePlaceholder"
    :ui="menuUi"
    @update:model-value="handleSelection"
    :trailing-icon="undefined"
  >
    <template #default>
      <span
        class="flex-1 whitespace-normal text-left"
        :class="{ 'text-muted': !selectedOption }"
      >
        {{ triggerLabel }}
      </span>
    </template>
    <template #trailing="{ open }">
      <UIcon
        name="i-heroicons-chevron-down-20-solid"
        class="transition-transform duration-200"
        :class="{ 'rotate-180': open }"
      />
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLocationsStore } from '@/stores/locations'

interface Props {
  modelValue?: string
  placeholder?: string
  searchablePlaceholder?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select location',
  searchablePlaceholder: 'Search locations...',
  size: 'sm',
  className: 'w-full',
  disabled: false
})

const emit = defineEmits<{ 'update:modelValue': [value: string | undefined], 'change': [loc: any] }>()

const store = useLocationsStore()

const selectedValue = ref<string | undefined>(props.modelValue)
const selectedOption = ref<any>(undefined)

const options = computed(() => {
  const list = store.getActive || []
  return list.map((l: any) => ({
    label: `${l.location_name} (${l.city}, ${l.state})`,
    value: l.uuid,
    location: l
  }))
})

const optionsMap = computed(() => new Map(options.value.map(o => [o.value, o])))

const updateSelectedObject = () => {
  if (!selectedValue.value) {
    selectedOption.value = undefined
  } else {
    selectedOption.value = optionsMap.value.get(selectedValue.value) || undefined
  }
}

const menuUi = computed(() => ({
  trigger: 'flex w-full justify-between gap-2 text-left',
  content: 'max-h-60 min-w-full w-max',
}))

const triggerLabel = computed(() => selectedOption.value?.label ?? props.placeholder)

const handleSelection = (payload: any) => {
  if (payload) {
    const value = typeof payload === 'string' 
      ? payload 
      : (payload.value ?? payload.uuid ?? payload.id)
    
    if (value) {
      selectedValue.value = value
      emit('update:modelValue', value)
      const option = typeof payload === 'object' ? payload : optionsMap.value.get(value)
      emit('change', option || undefined)
    } else {
      selectedValue.value = undefined
      selectedOption.value = undefined
      emit('update:modelValue', undefined)
      emit('change', undefined)
    }
  } else {
    selectedValue.value = undefined
    selectedOption.value = undefined
    emit('update:modelValue', undefined)
    emit('change', undefined)
  }
}

watch(
  () => props.modelValue,
  (newValue) => {
    selectedValue.value = newValue
    updateSelectedObject()
  },
  { immediate: true }
)

watch(
  options,
  () => {
    updateSelectedObject()
  },
  { immediate: true }
)

watch(
  selectedValue,
  () => {
    updateSelectedObject()
  }
)

// Ensure locations are loaded when component mounts
if (typeof window !== 'undefined') {
  const allLocations = store.getAll || []
  if (!allLocations.length) {
    store.fetchLocations().catch(() => {})
  }
}
</script>


