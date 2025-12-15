<template>
  <USelect
    :model-value="normalizedValue"
    :items="orderOptions"
    :placeholder="placeholder"
    :size="size"
    :class="className"
    :disabled="disabled"
    value-attribute="value"
    option-attribute="label"
    @update:model-value="handleSelection"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Props
interface Props {
  modelValue?: number | null
  placeholder?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  disabled?: boolean
  maxOrder?: number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select order',
  size: 'sm',
  className: 'w-full',
  disabled: false,
  maxOrder: 200
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: number | null]
  'change': [value: number | null]
}>()

// Computed properties
const orderOptions = computed(() => {
  return Array.from({ length: props.maxOrder }, (_, i) => ({
    label: String(i + 1),
    value: i + 1
  }))
})

// Normalize null to undefined for USelect compatibility
const normalizedValue = computed(() => {
  return props.modelValue ?? undefined
})

// Methods
const handleSelection = (value: number | undefined) => {
  const normalizedValue = value ?? null
  emit('update:modelValue', normalizedValue)
  emit('change', normalizedValue)
}
</script>

