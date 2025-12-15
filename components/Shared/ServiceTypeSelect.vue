<template>
  <USelectMenu
    v-model="selectedServiceTypeObject"
    :items="serviceTypeOptions"
    :filter-fields="['label', 'description', 'searchText']"
    :placeholder="placeholder"
    :searchable="searchable"
    :searchable-placeholder="searchablePlaceholder"
    :size="size"
    :class="className"
    :disabled="disabled"
    :loading="loading"
    value-key="value"
    @update:model-value="handleSelection"
  >
    <template #item-label="{ item }">
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <span class="truncate font-medium">{{ item.label }}</span>
        </div>
        <div v-if="item.description" class="flex-shrink-0 ml-2">
          <span class="text-xs text-muted truncate max-w-32">
            {{ item.description }}
          </span>
        </div>
      </div>
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useServiceTypesStore } from '@/stores/serviceTypes'

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
  placeholder: 'Select service type...',
  searchable: true,
  searchablePlaceholder: 'Type to search...',
  size: 'sm',
  className: 'w-full',
  disabled: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'change': [serviceType: any]
}>()

// Stores
const serviceTypesStore = useServiceTypesStore()

// Local state
const selectedServiceType = ref<string | undefined>(props.modelValue)
const selectedServiceTypeObject = ref<any>(undefined)

// Computed properties
const serviceTypeOptions = computed(() => {
  const activeServiceTypes = serviceTypesStore.getActiveServiceTypes
  
  if (activeServiceTypes.length === 0) {
    return []
  }
  
  return activeServiceTypes.map(serviceType => ({
    label: serviceType.name,
    value: serviceType.uuid,
    description: serviceType.description,
    color: serviceType.color,
    searchText: `${serviceType.name} ${serviceType.description || ''}`.toLowerCase()
  }))
})

// Create a Map for fast O(1) lookup of service type options by UUID
const serviceTypeOptionsMap = computed(() => {
  return new Map(serviceTypeOptions.value.map(st => [st.value, st]))
})

// Find the selected service type object for display (optimized with Map for O(1) lookup)
const updateSelectedObject = () => {
  if (!selectedServiceType.value) {
    selectedServiceTypeObject.value = undefined
  } else {
    selectedServiceTypeObject.value = serviceTypeOptionsMap.value.get(selectedServiceType.value) || undefined
  }
}

// Methods
const handleSelection = (serviceType: any) => {
  console.log('[ServiceTypeSelect] handleSelection called with:', {
    serviceType,
    serviceTypeType: typeof serviceType,
    hasValue: serviceType && serviceType.value,
    serviceTypeValue: serviceType?.value,
    currentModelValue: props.modelValue
  });
  
  // USelectMenu with value-key may pass either:
  // 1. The full object { label: '...', value: 'uuid', ... }
  // 2. Just the value string 'uuid' (when value-key is used)
  let uuidValue: string | undefined = undefined;
  
  if (serviceType) {
    if (typeof serviceType === 'string') {
      // USelectMenu passed just the UUID string (when value-key is used)
      uuidValue = serviceType;
      console.log('[ServiceTypeSelect] Received UUID string directly:', uuidValue);
    } else if (typeof serviceType === 'object' && serviceType.value) {
      // USelectMenu passed the full object
      uuidValue = serviceType.value;
      console.log('[ServiceTypeSelect] Extracted UUID from object:', uuidValue);
    } else {
      console.log('[ServiceTypeSelect] Unknown serviceType format:', serviceType);
    }
    
    if (uuidValue) {
      selectedServiceType.value = uuidValue;
      console.log('[ServiceTypeSelect] Emitting update:modelValue with:', uuidValue);
      emit('update:modelValue', uuidValue);
      // Emit change with the full object for consistency, but use the UUID if we only have the string
      console.log('[ServiceTypeSelect] Emitting change with:', serviceType);
      emit('change', serviceType);
    }
  } else {
    selectedServiceType.value = undefined;
    console.log('[ServiceTypeSelect] Emitting update:modelValue with undefined (clearing)');
    emit('update:modelValue', undefined);
  }
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  selectedServiceType.value = newValue
  updateSelectedObject()
})

watch(serviceTypeOptions, () => {
  updateSelectedObject()
}, { immediate: true })

watch(selectedServiceType, () => {
  updateSelectedObject()
})

// Load data if needed (fetch all service types on first use)
if (serviceTypesStore.serviceTypes.length === 0) {
  serviceTypesStore.fetchServiceTypes()
}

// Expose loading state for parent components
const loading = computed(() => serviceTypesStore.loading)
</script>
