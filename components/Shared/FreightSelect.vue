<template>
  <USelectMenu
    :model-value="selectedOption"
    :items="options"
    :loading="store.loading"
    :disabled="disabled || store.loading"
    :placeholder="placeholder"
    :size="size"
    :class="className"
    value-attribute="value"
    option-attribute="label"
    searchable
    :searchable-placeholder="searchablePlaceholder"
    @update:model-value="handleSelection"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useFreightStore } from '@/stores/freightGlobal'

interface Props {
  modelValue?: string
  placeholder?: string
  searchablePlaceholder?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select freight',
  searchablePlaceholder: 'Search freight...',
  size: 'sm',
  className: 'w-full',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'change': [freight: any]
}>()

const store = useFreightStore()

const selectedValue = ref<string | undefined>(props.modelValue)
const selectedOption = ref<any>(undefined)

const options = computed(() => {
  const active = store.getActiveFreight || []
  return active.map(f => ({
    label: f.ship_via,
    value: f.ship_via,
    freight: f
  }))
})

const optionsMap = computed(() => new Map(options.value.map(o => [o.value, o])))

const updateSelected = () => {
  if (!selectedValue.value) {
    selectedOption.value = undefined
  } else {
    const val = selectedValue.value
    selectedOption.value = optionsMap.value.get(val)
      || options.value.find(o => String(o.value).toLowerCase() === String(val).toLowerCase())
      || undefined
  }
}

const handleSelection = (opt: any) => {
  if (opt) {
    selectedValue.value = opt.value
    emit('update:modelValue', opt.value)
    emit('change', opt)
  } else {
    selectedValue.value = undefined
    emit('update:modelValue', undefined)
  }
}

watch(() => props.modelValue, (v) => {
  selectedValue.value = v
  updateSelected()
})

watch(options, () => updateSelected(), { immediate: true })
watch(selectedValue, () => updateSelected())

if (!store.getAllFreight?.length) {
  store.fetchFreight().catch(() => {})
}
</script>
