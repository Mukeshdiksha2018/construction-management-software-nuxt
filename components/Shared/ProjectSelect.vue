<template>
  <USelectMenu
    :model-value="selectedProjectOption"
    :items="projectOptions"
    :loading="projectsStore.loading"
    :disabled="disabled || projectsStore.loading || !corporationUuid"
    :placeholder="!corporationUuid ? 'Select corporation first' : placeholder"
    :size="size"
    :class="className"
    :ui="menuUi"
    value-key="value"
    label-key="label"
    searchable
    :searchable-placeholder="searchablePlaceholder"
    @update:model-value="handleSelection"
  >
    <template #item-label="{ item }">
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2 flex-1">
          <span class="font-medium whitespace-normal break-words text-left">
            {{ item.label }}
          </span>
          <UBadge
            :color="item.status_color"
            variant="solid"
            size="xs"
            class="flex-shrink-0"
          >
            {{ item.status }}
          </UBadge>
        </div>
      </div>
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProjectsStore } from '@/stores/projects'

// Props
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
  placeholder: 'Search and select project',
  searchablePlaceholder: 'Search projects...',
  size: 'sm',
  className: 'w-full',
  disabled: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'change': [project: any]
}>()

// Stores
const projectsStore = useProjectsStore()

// Local state
const selectedProject = ref<string | undefined>(props.modelValue)
const selectedProjectOption = ref<any>(undefined)

// UI configuration for dropdown to show full content
const menuUi = {
  content: 'max-h-60 min-w-full w-max',
  item: {
    base: 'whitespace-normal break-words',
    label: 'whitespace-normal break-words text-left'
  }
}

// Helper function to get status color
const getStatusColor = (status: string): "error" | "warning" | "info" | "success" | "primary" | "secondary" | "neutral" => {
  const statusColors: Record<string, "error" | "warning" | "info" | "success" | "primary" | "secondary" | "neutral"> = {
    'Pending': 'warning',
    'In Progress': 'info',
    'Completed': 'success',
    'On Hold': 'error'
  };
  return statusColors[status] || 'neutral';
};

// Project options computed property
const projectOptions = computed(() => {
  if (!props.corporationUuid) {
    return [];
  }
  
  // Filter projects by corporation and active status
  // Use String() to ensure proper comparison of UUIDs
  const activeProjects = projectsStore.projects.filter(project => 
    project.is_active && String(project.corporation_uuid) === String(props.corporationUuid)
  );
  
  return activeProjects.map(project => ({
    label: `${project.project_name} (${project.project_id})`,
    value: project.uuid,
    project: project,
    status: project.project_status,
    status_color: getStatusColor(project.project_status)
  }));
});

// Create a Map for fast O(1) lookup of project options by UUID
const projectOptionsMap = computed(() => {
  return new Map(projectOptions.value.map(proj => [proj.value, proj]))
})

// Find the selected project object for display (optimized with Map for O(1) lookup)
const updateSelectedObject = () => {
  if (!selectedProject.value) {
    selectedProjectOption.value = undefined
  } else {
    selectedProjectOption.value = projectOptionsMap.value.get(selectedProject.value) || undefined
  }
}

// Methods
const handleSelection = (project: any) => {
  if (typeof project === 'string') {
    selectedProject.value = project
    emit('update:modelValue', project)
    const option = projectOptionsMap.value.get(project)
    if (option) {
      emit('change', option)
    } else {
      emit('change', undefined)
    }
    return
  }

  if (project && typeof project === 'object') {
    const value = project.value ?? project.uuid ?? project.id
    if (value) {
      selectedProject.value = value
      emit('update:modelValue', value)
      emit('change', project)
      return
    }
  }

  selectedProject.value = undefined
  emit('update:modelValue', undefined)
  emit('change', undefined)
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  selectedProject.value = newValue
  updateSelectedObject()
})

watch(projectOptions, () => {
  updateSelectedObject()
}, { immediate: true })

watch(selectedProject, () => {
  updateSelectedObject()
})

// Watch for corporation changes and fetch projects
watch(() => props.corporationUuid, async (newCorpUuid, oldCorpUuid) => {
  // Clear selected project when corporation changes
  if (newCorpUuid !== oldCorpUuid && oldCorpUuid) {
    selectedProject.value = undefined
    selectedProjectOption.value = undefined
    emit('update:modelValue', undefined)
  }
  
  // Fetch projects for the new corporation
  // Use fetchProjectsMetadata with forceRefresh to ensure fresh data
  if (newCorpUuid) {
    try {
      await projectsStore.fetchProjectsMetadata(newCorpUuid, true, false)
    } catch (error) {
      // Silently handle error
    }
  }
}, { immediate: true })

// Load data if needed on mount
if (props.corporationUuid) {
  // Check if we need to fetch projects for this corporation
  const hasProjectsForCorp = projectsStore.projects.some(
    p => String(p.corporation_uuid) === String(props.corporationUuid)
  )
  if (!hasProjectsForCorp) {
    // Use fetchProjectsMetadata with forceRefresh to ensure fresh data
    projectsStore.fetchProjectsMetadata(props.corporationUuid, true, false)
  }
}
</script>
