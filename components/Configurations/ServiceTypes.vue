<template>
  <div>
    <div class="flex justify-end items-center mb-4">
      <div class="flex-1 max-w-sm mr-2">
        <UInput
          v-model="searchFilter"
          placeholder="Search service types..."
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
          Add Service Type
        </UButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span class="ml-2 text-gray-600">Loading service types...</span>
    </div>

    <!-- Service Types Table -->
    <div v-else-if="filteredServiceTypes.length > 0">
      <UTable
        :data="filteredServiceTypes"
        :columns="columns"
        class="w-full"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-scale" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg font-medium">No service types found</p>
      <p class="text-gray-400 text-sm">Get started by adding your first service type</p>
    </div>

    <!-- Add/Edit Modal -->
    <UModal 
      v-model:open="showModal" 
      :title="isEditing ? 'Edit Service Type' : 'Add Service Type'"
      description="Configure service type details for your organization."
      :ui="{ 
        content: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-1rem)] max-w-4xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] rounded-lg shadow-lg ring ring-default overflow-hidden',
        body: 'p-4 sm:p-6 max-h-[calc(100dvh-12rem)] overflow-y-auto'
      }"
      @update:open="closeModal"
    >

      <template #body>
        <div class="space-y-4">
          <!-- First Row: Service Type Name and Status -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service Type Name <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="formState.name"
                placeholder="e.g., General Construction, Electrical Services"
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
                placeholder="Describe the service type and what it includes..."
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
            {{ isEditing ? 'Update' : 'Save' }} Service Type
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" title="Delete Service Type">
      <template #body>
        <div class="text-center py-4">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Are you sure?
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            This will permanently delete the service type "{{ selectedServiceType?.name }}". This action cannot be undone.
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

    <!-- Preview Service Type Modal -->
    <UModal 
      v-model:open="showPreviewModal"
      title="Service Type Details"
      description="View complete information about this service type"
      :ui="{ 
        content: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-1rem)] max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] rounded-lg shadow-lg ring ring-default overflow-hidden',
        body: 'p-4 sm:p-6'
      }"
    >
      <template #body>
        <div v-if="previewServiceType" class="space-y-4">
          <!-- Service Type Name -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Service Type Name
            </label>
            <div class="flex items-center space-x-3">
              <div class="w-4 h-4 rounded-full" :style="{ backgroundColor: previewServiceType.color }"></div>
              <p class="text-base font-semibold text-gray-900 dark:text-gray-100">
                {{ previewServiceType.name }}
              </p>
            </div>
          </div>

          <!-- Description -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Description
            </label>
            <p class="text-sm text-gray-900 dark:text-gray-100">
              {{ previewServiceType.description || 'No description provided' }}
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
                :color="previewServiceType.isActive ? 'success' : 'neutral'"
                variant="soft"
                size="sm"
              >
                {{ previewServiceType.isActive ? 'Active' : 'Inactive' }}
              </UBadge>
            </div>

            <!-- Color -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Color Theme
              </label>
              <div class="flex items-center space-x-2">
                <div class="w-6 h-6 rounded-full border border-gray-300" :style="{ backgroundColor: previewServiceType.color }"></div>
                <span class="text-sm text-gray-600 dark:text-gray-400 font-mono">{{ previewServiceType.color }}</span>
              </div>
            </div>
          </div>

          <!-- Metadata -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Additional Information
            </label>
            <div class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div v-if="previewServiceType.created_at" class="flex items-center gap-2">
                <UIcon name="i-heroicons-calendar" class="w-3 h-3" />
                <span>Created: {{ new Date(previewServiceType.created_at).toLocaleString() }}</span>
              </div>
              <div v-if="previewServiceType.updated_at" class="flex items-center gap-2">
                <UIcon name="i-heroicons-clock" class="w-3 h-3" />
                <span>Updated: {{ new Date(previewServiceType.updated_at).toLocaleString() }}</span>
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
            @click="() => { showPreviewModal = false; if (previewServiceType) openEditModal(previewServiceType); }"
          >
            Edit Service Type
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, h, watch, onMounted, resolveComponent } from 'vue'
import { z } from 'zod'
import { useCorporationStore } from '@/stores/corporations'
import { useServiceTypesStore, type ServiceType } from '@/stores/serviceTypes'
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
const selectedServiceType = ref<ServiceType | null>(null)
const previewServiceType = ref<ServiceType | null>(null)
const searchFilter = ref('')

// Stores
const serviceTypesStore = useServiceTypesStore()
const corporationStore = useCorporationStore()

// Status options for the select dropdown
const statusOptions = ['Active', 'Inactive']

// Form state
const formState = reactive({
  name: '',
  description: '',
  color: '#3D5C7C',
  isActive: 'Active' as 'Active' | 'Inactive' | '',
  corporation_uuid: ''
})

// Table columns configuration
const columns: TableColumn<any>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const serviceType = row.original as ServiceType;
      return h('div', { class: 'flex items-center space-x-3' }, [
        h('div', { 
          class: 'w-3 h-3 rounded-full',
          style: { backgroundColor: serviceType.color }
        }),
        h('span', { class: 'font-medium' }, serviceType.name)
      ]);
    }
  },
  {
    accessorKey: 'description',
    header: 'Description',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const serviceType = row.original as ServiceType;
      return h('span', { 
        class: 'text-gray-600 dark:text-gray-400' 
      }, serviceType.description || 'No description');
    }
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const serviceType = row.original as ServiceType;
      return h(UBadge, {
        color: serviceType.isActive ? 'success' : 'neutral',
        variant: 'soft',
        size: 'sm'
      }, () => serviceType.isActive ? 'Active' : 'Inactive');
    }
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const serviceType = row.original as ServiceType;
      return h('div', { class: 'flex justify-end gap-1' }, [
        h(UTooltip, { text: 'View Details' }, () => [
          h(UButton, {
            icon: 'i-heroicons-eye-solid',
            size: 'xs',
            color: 'neutral',
            variant: 'soft',
            onClick: () => viewServiceType(serviceType)
          })
        ]),
        h(UTooltip, { text: 'Edit Service Type' }, () => [
          h(UButton, {
            icon: 'tdesign:edit-filled',
            size: 'xs',
            color: 'secondary',
            variant: 'soft',
            onClick: () => openEditModal(serviceType)
          })
        ]),
        h(UTooltip, { text: 'Delete Service Type' }, () => [
          h(UButton, {
            icon: 'mingcute:delete-fill',
            size: 'xs',
            color: 'error',
            variant: 'soft',
            onClick: () => confirmDelete(serviceType)
          })
        ])
      ]);
    }
  }
]

// Computed properties from store
const serviceTypes = computed(() => serviceTypesStore.serviceTypes)
const loading = computed(() => serviceTypesStore.loading)
const error = computed(() => serviceTypesStore.error)

// Computed property for corporation name
const getCorporationName = computed(() => {
  return corporationStore.selectedCorporation?.corporation_name || 'Unnamed Corporation'
})

// Computed property for filtered service types
const filteredServiceTypes = computed(() => {
  if (!searchFilter.value.trim()) {
    return [...serviceTypes.value]
  }

  const searchTerm = searchFilter.value.toLowerCase().trim()
  
  return serviceTypes.value.filter(serviceType => {
    const searchableFields = [
      serviceType.name || '',
      serviceType.description || '',
      serviceType.isActive ? 'active' : 'inactive'
    ]

    return searchableFields.some(field => 
      field.toLowerCase().includes(searchTerm)
    )
  })
})

// Methods

const openAddModal = () => {
  isEditing.value = false
  selectedServiceType.value = null
  resetForm()
  // Auto-set corporation UUID from the store
  formState.corporation_uuid = corporationStore.selectedCorporation?.uuid || ''
  showModal.value = true
}

const openEditModal = (serviceType: ServiceType) => {
  isEditing.value = true
  selectedServiceType.value = serviceType
  formState.name = serviceType.name
  formState.description = serviceType.description || ''
  formState.color = serviceType.color
  formState.isActive = serviceType.isActive ? 'Active' : 'Inactive'
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

const resetForm = () => {
  formState.name = ''
  formState.description = ''
  formState.color = '#3D5C7C'
  formState.isActive = 'Active'
  formState.corporation_uuid = ''
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
    if (isEditing.value && selectedServiceType.value) {
      // Update existing service type
      result = await serviceTypesStore.updateServiceType(selectedServiceType.value.id!.toString(), formData)
    } else {
      // Create new service type
      result = await serviceTypesStore.createServiceType(formData)
    }
    
    closeModal()
    
    // Show success notification with proper service type name
    const toast = useToast()
    const serviceTypeName = result?.name || formState.name || 'Service type'
    const action = isEditing.value ? 'updated' : 'created'
    
    toast.add({
      title: `Service type ${action} successfully`,
      description: `"${serviceTypeName}" has been ${action} successfully.`,
      color: 'success'
    })
  } catch (error: any) {
    console.error('Error saving service type:', error)
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to save service type. Please try again.',
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}

const viewServiceType = (serviceType: ServiceType) => {
  previewServiceType.value = serviceType
  showPreviewModal.value = true
}

const confirmDelete = (serviceType: ServiceType) => {
  selectedServiceType.value = serviceType
  showDeleteModal.value = true
}

const handleDelete = async () => {
  if (!selectedServiceType.value) return
  
  deleting.value = true
  
  try {
    // Store the service type name before deletion
    const serviceTypeName = selectedServiceType.value?.name || 'Service type'
    const serviceTypeId = selectedServiceType.value.id?.toString()
    
    if (!serviceTypeId) {
      throw new Error('Service type ID is required for deletion')
    }
    
    // Verify we're using the correct store
    if (!serviceTypesStore || typeof serviceTypesStore.deleteServiceType !== 'function') {
      throw new Error('Service types store is not properly initialized')
    }
    
    console.log('Deleting service type with ID:', serviceTypeId)
    console.log('Using store:', serviceTypesStore)
    
    // Use id instead of uuid for more reliable deletion
    await serviceTypesStore.deleteServiceType(serviceTypeId)
    
    showDeleteModal.value = false
    selectedServiceType.value = null
    
    // Show success notification
    const toast = useToast()
    toast.add({
      title: 'Service type deleted successfully',
      description: `"${serviceTypeName}" has been deleted successfully.`,
      color: 'success'
    })
  } catch (error: any) {
    console.error('Error deleting service type:', error)
    console.error('Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      statusMessage: error.statusMessage,
      url: error.url
    })
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to delete service type. Please try again.',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

// Load data on mount (fetch all service types regardless of corporation)
onMounted(async () => {
  await serviceTypesStore.fetchServiceTypes()
})
</script>