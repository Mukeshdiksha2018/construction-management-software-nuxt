<template>
  <div>
    <div class="flex justify-end items-center mb-4">
      <div class="flex-1 max-w-sm mr-2">
        <UInput
          v-model="searchFilter"
          placeholder="Search project types..."
          icon="i-heroicons-magnifying-glass"
          variant="subtle"
          size="xs"
          class="w-full"
        />
      </div>
      <div class="flex gap-3">
        <UButton
          icon="i-heroicons-plus"
          color="primary"
          size="xs"
          @click="openAddModal"
        >
          Add Project Type
        </UButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span class="ml-2 text-gray-600">Loading project types...</span>
    </div>

    <!-- Project Types Table -->
    <div v-else-if="filteredProjectTypes.length > 0">
      <UTable
        :data="filteredProjectTypes"
        :columns="columns"
        class="w-full"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-chart-bar-square" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg font-medium">No project types found</p>
      <p class="text-gray-400 text-sm">Get started by adding your first project type</p>
    </div>

    <!-- Add/Edit Modal -->
    <UModal 
      v-model:open="showModal" 
      :title="isEditing ? 'Edit Project Type' : 'Add Project Type'"
      description="Configure project type details for your organization."
      :ui="{ 
        content: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-1rem)] max-w-4xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] rounded-lg shadow-lg ring ring-default overflow-hidden',
        body: 'p-4 sm:p-6 max-h-[calc(100dvh-12rem)] overflow-y-auto'
      }"
      @update:open="closeModal"
    >

      <template #body>
        <div class="space-y-4">
          <!-- First Row: Project Type Name and Status -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project Type Name <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="formState.name"
                placeholder="e.g., Residential Construction"
                variant="subtle"
                size="sm"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status <span class="text-red-500">*</span>
              </label>
              <USelect
                v-model="formState.isActive"
                :items="statusOptions"
                placeholder="Select status"
                variant="subtle"
                size="sm"
                class="w-full"
              />
            </div>
          </div>

          <!-- Second Row: Description and Color -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <UTextarea
                v-model="formState.description"
                placeholder="Describe the project type..."
                variant="subtle"
                size="sm"
                class="w-full"
                :rows="2"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Color Theme
              </label>
              <div class="space-y-2">
                <UColorPicker 
                  v-model="formState.color" 
                  size="sm"
                  format="hex"
                  class="w-full"
                />
                <!-- Compact Color Preview -->
                <div class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                  <div 
                    class="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600" 
                    :style="{ backgroundColor: formState.color }"
                  ></div>
                  <span class="text-xs font-mono text-gray-600 dark:text-gray-400">{{ formState.color }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="closeModal">
            Cancel
          </UButton>
          <UButton 
            color="primary" 
            @click="handleSubmit"
            :loading="submitting"
            :disabled="!formState.name.trim()"
          >
            {{ isEditing ? 'Update' : 'Save' }} Project Type
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" title="Delete Project Type">
      <template #body>
        <div class="text-center py-4">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Are you sure?
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            This will permanently delete the project type "{{ selectedProjectType?.name }}". This action cannot be undone.
          </p>
          <div class="flex justify-center space-x-3">
            <UButton
              color="neutral"
              variant="ghost"
              @click="showDeleteModal = false"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="deleting"
              @click="handleDelete"
            >
              Delete
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Preview Project Type Modal -->
    <UModal 
      v-model:open="showPreviewModal"
      title="Project Type Details"
      description="View complete information about this project type"
      :ui="{ 
        content: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-1rem)] max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] rounded-lg shadow-lg ring ring-default overflow-hidden',
        body: 'p-4 sm:p-6'
      }"
    >
      <template #body>
        <div v-if="previewProjectType" class="space-y-4">
          <!-- Project Type Name -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Project Type Name
            </label>
            <div class="flex items-center space-x-3">
              <div class="w-4 h-4 rounded-full" :style="{ backgroundColor: previewProjectType.color }"></div>
              <p class="text-base font-semibold text-gray-900 dark:text-gray-100">
                {{ previewProjectType.name }}
              </p>
            </div>
          </div>

          <!-- Description -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Description
            </label>
            <p class="text-sm text-gray-900 dark:text-gray-100">
              {{ previewProjectType.description || 'No description provided' }}
            </p>
          </div>

          <!-- Status and Color in a row -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Status -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Status
              </label>
              <UBadge 
                :color="previewProjectType.isActive ? 'success' : 'neutral'"
                variant="soft"
                size="sm"
              >
                {{ previewProjectType.isActive ? 'Active' : 'Inactive' }}
              </UBadge>
            </div>

            <!-- Color -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Color Theme
              </label>
              <div class="flex items-center space-x-2">
                <div class="w-6 h-6 rounded-full border border-gray-300" :style="{ backgroundColor: previewProjectType.color }"></div>
                <span class="text-sm text-gray-600 dark:text-gray-400 font-mono">{{ previewProjectType.color }}</span>
              </div>
            </div>
          </div>

          <!-- Metadata -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Additional Information
            </label>
            <div class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div v-if="previewProjectType.created_at" class="flex items-center gap-2">
                <UIcon name="i-heroicons-calendar" class="w-3 h-3" />
                <span>Created: {{ new Date(previewProjectType.created_at).toLocaleString() }}</span>
              </div>
              <div v-if="previewProjectType.updated_at" class="flex items-center gap-2">
                <UIcon name="i-heroicons-clock" class="w-3 h-3" />
                <span>Updated: {{ new Date(previewProjectType.updated_at).toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
      
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="showPreviewModal = false">
            Close
          </UButton>
          <UButton 
            color="primary" 
            icon="tdesign:edit-filled"
            @click="() => { showPreviewModal = false; if (previewProjectType) openEditModal(previewProjectType); }"
          >
            Edit Project Type
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted, resolveComponent } from 'vue'
import { z } from 'zod'
import { useProjectTypesStore, type ProjectType } from '@/stores/projectTypes'
import type { TableColumn } from '@nuxt/ui'

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UTooltip = resolveComponent('UTooltip')

// Form validation schema
const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  isActive: z.string().min(1, 'Status is required').refine(val => val === 'Active' || val === 'Inactive', {
    message: 'Status must be Active or Inactive'
  })
})

// Reactive state
const submitting = ref(false)
const deleting = ref(false)
const showModal = ref(false)
const showDeleteModal = ref(false)
const showPreviewModal = ref(false)
const isEditing = ref(false)
const selectedProjectType = ref<ProjectType | null>(null)
const previewProjectType = ref<ProjectType | null>(null)
const searchFilter = ref('')

// Stores
const projectTypesStore = useProjectTypesStore()

// Status options for the select dropdown
const statusOptions = ['Active', 'Inactive']

// Form state
const formState = reactive({
  name: '',
  description: '',
  color: '#3B82F6',
  isActive: 'Active' as 'Active' | 'Inactive' | ''
})

// Table columns configuration
const columns: TableColumn<any>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const projectType = row.original as ProjectType;
      return h('div', { class: 'flex items-center space-x-3' }, [
        h('div', { 
          class: 'w-3 h-3 rounded-full',
          style: { backgroundColor: projectType.color }
        }),
        h('span', { class: 'font-medium' }, projectType.name)
      ]);
    }
  },
  {
    accessorKey: 'description',
    header: 'Description',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const projectType = row.original as ProjectType;
      return h('span', { 
        class: 'text-gray-600 dark:text-gray-400' 
      }, projectType.description || 'No description');
    }
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const projectType = row.original as ProjectType;
      return h(UBadge, {
        color: projectType.isActive ? 'success' : 'neutral',
        variant: 'soft',
        size: 'sm'
      }, () => projectType.isActive ? 'Active' : 'Inactive');
    }
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const projectType = row.original as ProjectType;
      return h('div', { class: 'flex justify-end gap-1' }, [
        h(UTooltip, { text: 'View Details' }, () => [
          h(UButton, {
            icon: 'i-heroicons-eye-solid',
            size: 'xs',
            color: 'neutral',
            variant: 'soft',
            onClick: () => viewProjectType(projectType)
          })
        ]),
        h(UTooltip, { text: 'Edit Project Type' }, () => [
          h(UButton, {
            icon: 'tdesign:edit-filled',
            size: 'xs',
            color: 'secondary',
            variant: 'soft',
            onClick: () => openEditModal(projectType)
          })
        ]),
        h(UTooltip, { text: 'Delete Project Type' }, () => [
          h(UButton, {
            icon: 'mingcute:delete-fill',
            size: 'xs',
            color: 'error',
            variant: 'soft',
            onClick: () => confirmDelete(projectType)
          })
        ])
      ]);
    }
  }
]

// Computed properties from store
const projectTypes = computed(() => projectTypesStore.projectTypes)
const loading = computed(() => projectTypesStore.loading)
const error = computed(() => projectTypesStore.error)

// Computed property for filtered project types
const filteredProjectTypes = computed(() => {
  if (!searchFilter.value.trim()) {
    return [...projectTypes.value]
  }

  const searchTerm = searchFilter.value.toLowerCase().trim()
  
  return projectTypes.value.filter(projectType => {
    const searchableFields = [
      projectType.name || '',
      projectType.description || '',
      projectType.isActive ? 'active' : 'inactive'
    ]

    return searchableFields.some(field => 
      field.toLowerCase().includes(searchTerm)
    )
  })
})

// Methods
const openAddModal = () => {
  isEditing.value = false
  selectedProjectType.value = null
  resetForm()
  showModal.value = true
}

const openEditModal = (projectType: ProjectType) => {
  isEditing.value = true
  selectedProjectType.value = projectType
  formState.name = projectType.name
  formState.description = projectType.description || ''
  formState.color = projectType.color
  formState.isActive = projectType.isActive ? 'Active' : 'Inactive'
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

const resetForm = () => {
  formState.name = ''
  formState.description = ''
  formState.color = '#3B82F6'
  formState.isActive = 'Active'
}

const handleSubmit = async () => {
  submitting.value = true
  
  try {
    // Ensure isActive is a boolean
    const formData = {
      name: formState.name,
      description: formState.description,
      color: formState.color,
      isActive: formState.isActive === 'Active'
    }
    
    let result = null;
    if (isEditing.value && selectedProjectType.value) {
      // Update existing project type
      result = await projectTypesStore.updateProjectType(selectedProjectType.value.id!.toString(), formData)
    } else {
      // Create new project type
      result = await projectTypesStore.createProjectType(formData)
    }
    
    closeModal()
    
    // Show success notification with proper project type name
    const toast = useToast()
    const projectTypeName = result?.name || formState.name || 'Project type'
    const action = isEditing.value ? 'updated' : 'created'
    
    toast.add({
      title: `Project type ${action} successfully`,
      description: `"${projectTypeName}" has been ${action} successfully.`,
      color: 'success'
    })
  } catch (error: any) {
    console.error('Error saving project type:', error)
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to save project type. Please try again.',
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}

const viewProjectType = (projectType: ProjectType) => {
  previewProjectType.value = projectType
  showPreviewModal.value = true
}

const confirmDelete = (projectType: ProjectType) => {
  selectedProjectType.value = projectType
  showDeleteModal.value = true
}

const handleDelete = async () => {
  if (!selectedProjectType.value) return
  
  deleting.value = true
  
  try {
    // Store the project type name before deletion
    const projectTypeName = selectedProjectType.value?.name || 'Project type'
    const projectTypeId = selectedProjectType.value.id?.toString()
    
    if (!projectTypeId) {
      throw new Error('Project type ID is required for deletion')
    }
    
    // Verify we're using the correct store
    if (!projectTypesStore || typeof projectTypesStore.deleteProjectType !== 'function') {
      throw new Error('Project types store is not properly initialized')
    }
    
    // Use id instead of uuid for more reliable deletion
    await projectTypesStore.deleteProjectType(projectTypeId)
    
    showDeleteModal.value = false
    selectedProjectType.value = null
    
    // Show success notification
    const toast = useToast()
    toast.add({
      title: 'Project type deleted successfully',
      description: `"${projectTypeName}" has been deleted successfully.`,
      color: 'success'
    })
  } catch (error: any) {
    console.error('Error deleting project type:', error)
    console.error('Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      statusMessage: error.statusMessage,
      url: error.url
    })
    
    const toast = useToast()
    
    // Extract clean error message without technical details
    const getCleanMessage = (msg: string | undefined): string => {
      if (!msg) return ''
      // Remove API endpoint URLs
      let clean = msg.replace(/\[.*?\]\s*"/g, '').replace(/\/api\/[^"]+/g, '')
      // Remove status codes like "500" or "400"
      clean = clean.replace(/\b\d{3}\b/g, '')
      // Remove common error prefixes
      clean = clean.replace(/^(FetchError|Error|Failed to load resource):\s*/i, '')
      // Remove extra whitespace
      clean = clean.trim().replace(/\s+/g, ' ')
      return clean
    }
    
    // Provide more specific error messages based on the error
    let errorTitle = 'Error'
    let errorDescription = 'Failed to delete project type. Please try again.'
    const statusCode = error.statusCode
    
    // Check if it's a constraint error (project type in use)
    if (statusCode === 400 || error.message?.includes('being used') || error.message?.includes('Cannot delete')) {
      errorTitle = 'Cannot Delete Project Type'
      
      // Format the error message for better readability
      if (error.data?.projectList && Array.isArray(error.data.projectList)) {
        const projectList = error.data.projectList
        const count = error.data.count || projectList.length
        const hasMore = error.data.hasMore || false
        
        // Create a readable list format for toast notification
        const projectsText = projectList.length <= 3
          ? projectList.join(', ')
          : `${projectList.slice(0, 3).join(', ')}${hasMore ? `, and ${count - 3} more` : `, and ${projectList.length - 3} more`}`
        
        errorDescription = `This project type is currently being used by ${count} active project(s): ${projectsText}. Please update these projects to use a different project type before deleting.`
      } else {
        // Use statusMessage from API if available, otherwise use cleaned message
        const apiMessage = error.statusMessage || error.message
        errorDescription = apiMessage ? getCleanMessage(apiMessage) : 'This project type is currently being used by one or more projects. Please remove or change the project type from these projects before deleting.'
      }
    } else if (statusCode === 404) {
      errorTitle = 'Project Type Not Found'
      errorDescription = 'The project type you are trying to delete does not exist. It may have already been deleted.'
    } else if (statusCode === 500) {
      errorTitle = 'Server Error'
      const apiMessage = error.statusMessage || error.message
      errorDescription = apiMessage ? getCleanMessage(apiMessage) : 'An unexpected error occurred while deleting the project type. Please try again later.'
    } else {
      // For any other error, use cleaned message
      const apiMessage = error.statusMessage || error.message
      errorDescription = apiMessage ? getCleanMessage(apiMessage) : 'Failed to delete project type. Please try again.'
    }
    
    toast.add({
      title: errorTitle,
      description: errorDescription,
      color: 'error',
      timeout: statusCode === 400 ? 12000 : 5000 // Show constraint errors longer
    })
  } finally {
    deleting.value = false
  }
}

// Load data on mount (fetch all project types regardless of corporation)
onMounted(async () => {
  await projectTypesStore.fetchProjectTypes()
})
</script>