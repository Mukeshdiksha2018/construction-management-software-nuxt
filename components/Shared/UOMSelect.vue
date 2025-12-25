<template>
  <USelectMenu
    :model-value="selectedOption"
    :items="uomOptions"
    :loading="uomStore.loading"
    :disabled="disabled || uomStore.loading"
    :placeholder="placeholder"
    :size="size"
    :class="className"
    :ui="menuUi"
    value-attribute="value"
    option-attribute="label"
    searchable
    :searchable-placeholder="searchablePlaceholder"
    @update:model-value="handleSelection"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useUOMStore } from '@/stores/uom'

interface Props {
  modelValue?: string
  placeholder?: string
  searchablePlaceholder?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  disabled?: boolean
  corporationUuid?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select UOM',
  searchablePlaceholder: 'Search UOM...',
  size: 'sm',
  className: 'w-full',
  disabled: false,
  corporationUuid: undefined,
})

interface UOMOption {
  label: string
  value: string
  shortName: string
  uom: any
}

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  change: [option: UOMOption | undefined]
}>()

const uomStore = useUOMStore()

// UI configuration for dropdown to show full content width
const menuUi = {
  content: 'max-h-60 min-w-full w-max',
}

const selectedValue = ref<string | undefined>(props.modelValue)
const selectedOption = ref<UOMOption | undefined>(undefined)

const activeUoms = computed(() => {
  const corp = props.corporationUuid || 'global'
  return uomStore.getActiveUOM(corp) || []
})

const uomOptions = computed<UOMOption[]>(() =>
  activeUoms.value.map((u) => ({
    label: u.short_name || u.uom_name,
    value: u.uuid,
    shortName: u.short_name || u.uom_name,
    uom: u,
  }))
)

const optionByUuid = computed(() => new Map(uomOptions.value.map((opt) => [opt.value, opt])))
const optionByShortName = computed(() => {
  const entries = uomOptions.value.map((opt) => [String(opt.shortName || '').toUpperCase(), opt] as const)
  return new Map(entries)
})

const resolveOption = (value?: string) => {
  if (!value) return undefined
  return (
    optionByUuid.value.get(value) ||
    optionByShortName.value.get(String(value).toUpperCase()) ||
    undefined
  )
}

const updateSelectedOption = () => {
  selectedOption.value = resolveOption(selectedValue.value)
}

const handleSelection = (opt: UOMOption | undefined) => {
  if (opt) {
    selectedValue.value = opt.value
    emit('update:modelValue', opt.value)
    emit('change', opt)
  } else {
    selectedValue.value = undefined
    emit('update:modelValue', undefined)
    emit('change', undefined)
  }
}

watch(
  () => props.modelValue,
  (next) => {
    selectedValue.value = next
    updateSelectedOption()
  }
)

watch(
  uomOptions,
  () => {
    updateSelectedOption()
  },
  { immediate: true }
)

watch(selectedValue, () => updateSelectedOption())

watch(
  () => props.corporationUuid,
  () => {
    if (!uomStore.loading) {
      uomStore.fetchUOM(undefined, true).catch(() => {})
    }
  }
)

if (!Array.isArray(uomStore.uom) || uomStore.uom.length === 0) {
  uomStore.fetchUOM(undefined, true).catch(() => {})
}
</script>


