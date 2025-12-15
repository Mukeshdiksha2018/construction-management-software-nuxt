<template>
  <USelectMenu
    v-model="selectedTermsAndConditionObject"
    :items="termsAndConditionOptions"
    :filter-fields="['label', 'description', 'searchText']"
    :placeholder="placeholder"
    :searchable="searchable"
    :searchable-placeholder="searchablePlaceholder"
    :size="size"
    :class="className"
    :disabled="disabled"
    :loading="loading"
    value-key="value"
    label-key="label"
    @update:model-value="handleSelection"
  >
    <template #default>
      <span
        class="flex-1 whitespace-normal text-left"
        :class="{ 'text-muted': !selectedTermsAndConditionObject }"
      >
        {{ displayLabel }}
      </span>
    </template>
    <template #item-label="{ item }">
      <span class="truncate font-medium">{{ item.label }}</span>
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTermsAndConditionsStore } from '@/stores/termsAndConditions'

// Props
interface Props {
  modelValue?: string
  placeholder?: string
  searchable?: boolean
  searchablePlaceholder?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select terms and conditions...',
  searchable: true,
  searchablePlaceholder: 'Type to search...',
  size: 'sm',
  className: 'w-full',
  disabled: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'change': [termsAndCondition: any]
}>()

// Stores
const termsAndConditionsStore = useTermsAndConditionsStore()

// Local state
const selectedTermsAndCondition = ref<string | undefined>(props.modelValue)
const selectedTermsAndConditionObject = ref<any>(undefined)

// Computed properties
const termsAndConditionOptions = computed(() => {
  const activeTermsAndConditions = termsAndConditionsStore.getActiveTermsAndConditions
  
  if (activeTermsAndConditions.length === 0) {
    return []
  }
  
  return activeTermsAndConditions.map(tc => {
    // Strip HTML tags from content for description/preview
    const contentPreview = tc.content 
      ? tc.content.replace(/<[^>]*>/g, '').substring(0, 50) 
      : ''
    
    return {
      label: tc.name,
      value: tc.uuid,
      description: contentPreview || undefined,
      searchText: `${tc.name} ${contentPreview}`.toLowerCase()
    }
  })
})

// Create a Map for fast O(1) lookup of terms and condition options by UUID
const termsAndConditionOptionsMap = computed(() => {
  return new Map(termsAndConditionOptions.value.map(tc => [tc.value, tc]))
})

// Find the selected terms and condition object for display (optimized with Map for O(1) lookup)
const updateSelectedObject = () => {
  if (!selectedTermsAndCondition.value) {
    selectedTermsAndConditionObject.value = undefined
  } else {
    selectedTermsAndConditionObject.value = termsAndConditionOptionsMap.value.get(selectedTermsAndCondition.value) || undefined
  }
}

// Computed property for display label
const displayLabel = computed(() => {
  if (selectedTermsAndConditionObject.value?.label) {
    return selectedTermsAndConditionObject.value.label
  }
  return props.placeholder
})

// Methods
const handleSelection = (termsAndCondition: any) => {
  console.log('[TermsAndConditionsSelect] handleSelection called with:', {
    termsAndCondition,
    termsAndConditionType: typeof termsAndCondition,
    hasValue: termsAndCondition && termsAndCondition.value,
    termsAndConditionValue: termsAndCondition?.value,
    currentModelValue: props.modelValue
  });
  
  // USelectMenu with value-key may pass either:
  // 1. The full object { label: '...', value: 'uuid', ... }
  // 2. Just the value string 'uuid' (when value-key is used)
  let uuidValue: string | undefined = undefined;
  
  if (termsAndCondition) {
    if (typeof termsAndCondition === 'string') {
      // USelectMenu passed just the UUID string (when value-key is used)
      uuidValue = termsAndCondition;
      console.log('[TermsAndConditionsSelect] Received UUID string directly:', uuidValue);
    } else if (typeof termsAndCondition === 'object' && termsAndCondition.value) {
      // USelectMenu passed the full object
      uuidValue = termsAndCondition.value;
      console.log('[TermsAndConditionsSelect] Extracted UUID from object:', uuidValue);
    } else {
      console.log('[TermsAndConditionsSelect] Unknown termsAndCondition format:', termsAndCondition);
    }
    
    if (uuidValue) {
      selectedTermsAndCondition.value = uuidValue;
      console.log('[TermsAndConditionsSelect] Emitting update:modelValue with:', uuidValue);
      emit('update:modelValue', uuidValue);
      // Emit change with the full object for consistency, but use the UUID if we only have the string
      console.log('[TermsAndConditionsSelect] Emitting change with:', termsAndCondition);
      emit('change', termsAndCondition);
    }
  } else {
    selectedTermsAndCondition.value = undefined;
    console.log('[TermsAndConditionsSelect] Emitting update:modelValue with undefined (clearing)');
    emit('update:modelValue', undefined);
  }
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  selectedTermsAndCondition.value = newValue
  updateSelectedObject()
})

watch(termsAndConditionOptions, () => {
  updateSelectedObject()
}, { immediate: true })

watch(selectedTermsAndCondition, () => {
  updateSelectedObject()
})

// Load data if needed (fetch all terms and conditions on first use)
if (termsAndConditionsStore.termsAndConditions.length === 0) {
  termsAndConditionsStore.fetchTermsAndConditions()
}

// Expose loading state for parent components
const loading = computed(() => termsAndConditionsStore.loading)
</script>
