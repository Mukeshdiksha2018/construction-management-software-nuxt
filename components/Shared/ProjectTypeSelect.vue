<template>
  <USelectMenu
    v-model="selectedProjectTypeObject"
    :items="projectTypeOptions"
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
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProjectTypesStore } from '@/stores/projectTypes'

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
  placeholder: 'Select project type...',
  searchable: true,
  searchablePlaceholder: 'Type to search...',
  size: 'sm',
  className: 'w-full',
  disabled: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'change': [projectType: any]
}>()

// Stores
const projectTypesStore = useProjectTypesStore()

// Local state
const selectedProjectType = ref<string | undefined>(props.modelValue)
const selectedProjectTypeObject = ref<any>(undefined)

// Computed properties
const projectTypeOptions = computed(() => {
  const activeProjectTypes = projectTypesStore.getActiveProjectTypes
  
  if (activeProjectTypes.length === 0) {
    return []
  }
  
  return activeProjectTypes.map(projectType => ({
    label: projectType.name,
    value: projectType.uuid,
    description: projectType.description,
    color: projectType.color,
    searchText: `${projectType.name} ${projectType.description || ''}`.toLowerCase()
  }))
})

// Create a Map for fast O(1) lookup of project type options by UUID
const projectTypeOptionsMap = computed(() => {
  return new Map(projectTypeOptions.value.map(pt => [pt.value, pt]))
})

// Find the selected project type object for display (optimized with Map for O(1) lookup)
const updateSelectedObject = () => {
  if (!selectedProjectType.value) {
    selectedProjectTypeObject.value = undefined
  } else {
    selectedProjectTypeObject.value = projectTypeOptionsMap.value.get(selectedProjectType.value) || undefined
  }
}

// Methods
const handleSelection = (projectType: any) => {
  console.log('[ProjectTypeSelect] handleSelection called with:', {
    projectType,
    projectTypeType: typeof projectType,
    hasValue: projectType && projectType.value,
    projectTypeValue: projectType?.value,
    currentModelValue: props.modelValue
  });
  
  // USelectMenu with value-key may pass either:
  // 1. The full object { label: '...', value: 'uuid', ... }
  // 2. Just the value string 'uuid' (when value-key is used)
  let uuidValue: string | undefined = undefined;
  
  if (projectType) {
    if (typeof projectType === 'string') {
      // USelectMenu passed just the UUID string (when value-key is used)
      uuidValue = projectType;
      console.log('[ProjectTypeSelect] Received UUID string directly:', uuidValue);
    } else if (typeof projectType === 'object' && projectType.value) {
      // USelectMenu passed the full object
      uuidValue = projectType.value;
      console.log('[ProjectTypeSelect] Extracted UUID from object:', uuidValue);
    } else {
      console.log('[ProjectTypeSelect] Unknown projectType format:', projectType);
    }
    
    if (uuidValue) {
      selectedProjectType.value = uuidValue;
      console.log('[ProjectTypeSelect] Emitting update:modelValue with:', uuidValue);
      emit('update:modelValue', uuidValue);
      // Emit change with the full object for consistency, but use the UUID if we only have the string
      console.log('[ProjectTypeSelect] Emitting change with:', projectType);
      emit('change', projectType);
    }
  } else {
    selectedProjectType.value = undefined;
    console.log('[ProjectTypeSelect] Emitting update:modelValue with undefined (clearing)');
    emit('update:modelValue', undefined);
  }
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  console.log('[ProjectTypeSelect] modelValue prop changed:', {
    newValue,
    newValueType: typeof newValue,
    previousValue: selectedProjectType.value
  });
  selectedProjectType.value = newValue
  updateSelectedObject()
})

watch(projectTypeOptions, () => {
  console.log('[ProjectTypeSelect] projectTypeOptions changed, updating selected object');
  updateSelectedObject()
}, { immediate: true })

watch(selectedProjectType, () => {
  console.log('[ProjectTypeSelect] selectedProjectType changed:', selectedProjectType.value);
  updateSelectedObject()
})

// Load data if needed (fetch all project types on first use)
if (projectTypesStore.projectTypes.length === 0) {
  projectTypesStore.fetchProjectTypes()
}

// Expose loading state for parent components
const loading = computed(() => projectTypesStore.loading)
</script>
