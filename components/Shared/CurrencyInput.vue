<template>
  <div class="relative inline-flex items-center justify-end rounded-md border border-default bg-background dark:bg-gray-900/60 px-3 py-1.5 text-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40 transition-colors">
    <span class="text-xs font-semibold text-default shrink-0">{{ currencySymbolText }}</span>
    <input
      :value="modelValue"
      :type="type"
      :inputmode="inputmode"
      :disabled="disabled"
      :placeholder="placeholder"
      :class="[
        'min-w-[2ch] bg-transparent text-right font-mono leading-none outline-none border-none focus:outline-none',
        sizeClasses,
        disabled ? 'cursor-not-allowed opacity-75' : '',
      ]"
      :style="{ width: inputWidth }"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'

interface Props {
  modelValue?: string | number | null
  type?: string
  inputmode?: 'search' | 'email' | 'text' | 'decimal' | 'tel' | 'url' | 'none' | 'numeric'
  disabled?: boolean
  placeholder?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  corporationUuid?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  inputmode: 'decimal',
  disabled: false,
  placeholder: undefined,
  size: 'sm',
  corporationUuid: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}>()

const { currencySymbol } = useCurrencyFormat()
const currencySymbolText = computed(() => unref(currencySymbol) || '')

const sizeClasses = computed(() => {
  const sizeMap = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-sm',
    xl: 'text-base',
  }
  return sizeMap[props.size] || sizeMap.sm
})

const getInputWidth = (value: string | number | null | undefined): string => {
  const str = String(value || '')
  const length = str.length || 2
  // Add 1 extra character for padding and ensure minimum of 2ch
  return `${Math.max(2, length + 1)}ch`
}

const inputWidth = computed(() => getInputWidth(props.modelValue))

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const handleFocus = (event: FocusEvent) => {
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}
</script>

<style scoped>
/* Ensure the input container sizes to content */
input {
  font-variant-numeric: tabular-nums;
}
</style>

