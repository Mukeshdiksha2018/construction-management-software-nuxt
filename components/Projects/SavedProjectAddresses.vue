<template>
  <div>
    <div class="flex justify-end items-center mb-4">
      <div class="flex-1 max-w-sm mr-2">
        <UInput
          v-model="globalFilter"
          placeholder="Search addresses..."
          icon="i-heroicons-magnifying-glass"
          variant="subtle"
          size="xs"
          class="w-full"
        />
      </div>
      <div class="flex gap-3">
        <UButton
          v-if="hasPermission('project_create')"
          icon="i-heroicons-plus"
          color="primary"
          size="xs"
          @click="addNewAddress"
        >
          Add New Address
        </UButton>
      </div>
    </div>

    <!-- Addresses Table -->
    <div v-if="loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-7 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-24" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-24" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-32" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-24" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center justify-end">
              <USkeleton class="h-6 w-16" />
            </div>
          </div>
        </div>
        <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="i in 6" :key="i" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
            <div class="grid grid-cols-7 gap-4 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 border-gray-100 dark:border-gray-700">
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-40" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center justify-end gap-1">
                <USkeleton class="h-6 w-6 rounded" />
                <USkeleton class="h-6 w-6 rounded" />
                <USkeleton class="h-6 w-6 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="error">
      <UAlert
        icon="i-heroicons-exclamation-triangle"
        color="error"
        variant="soft"
        :title="error"
        :description="'Please try refreshing the page or contact support if the issue persists.'"
      />
    </div>

    <div v-else-if="addresses.length && hasPermission('project_view') && isReady">
      <UTable
        ref="table"
        sticky
        v-model:pagination="pagination"
        v-model:column-pinning="columnPinning"
        :pagination-options="paginationOptions"
        :data="filteredAddresses"
        :columns="columns"
        v-model:selected="selectedRows"
        v-model:global-filter="globalFilter"
        :selectable="true"
        class="max-h-[70vh] overflow-auto"
      />

      <div v-if="shouldShowPagination(filteredAddresses.length).value" class="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Show:</span>
          <USelect
            v-model="pagination.pageSize"
            :items="pageSizeOptions"
            icon="i-heroicons-list-bullet"
            size="sm"
            variant="outline"
            class="w-32"
            @change="updatePageSize(table)"
          />
        </div>

        <UPagination v-bind="getPaginationProps(table)" />

        <div class="text-sm text-gray-600">
          {{ getPageInfo(table, 'addresses').value }}
        </div>
      </div>
    </div>

    <div v-else-if="!hasPermission('project_view') && isReady" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-lock-closed" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg">Access Denied</p>
      <p class="text-gray-400 text-sm">You don't have permission to view addresses</p>
    </div>

    <div v-else-if="isReady" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-map-pin" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg">No addresses found</p>
      <p class="text-gray-400 text-sm mb-6">Create your first address to get started</p>
      <UButton
        v-if="hasPermission('project_create')"
        icon="i-heroicons-plus"
        @click="addNewAddress"
      >
        Add Address
      </UButton>
    </div>

    <!-- Add/Edit Address Modal (reusing ProjectDetailsForm) -->
    <UModal
      v-model:open="showForm"
      fullscreen
      :ui="{ body: 'sm:p-2 flex-1 overflow-y-auto p-1' }"
      @update:open="onFormOpenUpdate"
    >
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {{ getModalTitle() }}
          </h3>
          <div class="flex-1 flex justify-center">
            <UBadge
              :color="getStatusBadgeColor(form.project_status || 'Pending')"
              variant="solid"
              size="md"
              :icon="getStatusIcon(form.project_status || 'Pending')"
            >
              {{ form.project_status || 'Pending' }}
            </UBadge>
          </div>
          <div class="flex items-center gap-2">
            <UTooltip text="Close Modal" color="neutral">
              <UButton
                color="neutral"
                variant="solid"
                icon="i-heroicons-x-mark"
                size="sm"
                @click="closeModal"
              />
            </UTooltip>
          </div>
        </div>
      </template>
      <template #body>
        <SavedAddressForm
          v-model:form="form"
          @update:form="handleFormUpdate"
        />
      </template>
      <template #footer>
        <div class="flex justify-between items-center">
          <div class="flex gap-3">
            <UButton color="neutral" variant="solid" @click="closeModal">
              Cancel
            </UButton>
            <UButton
              v-if="editingProject ? hasPermission('project_edit') : hasPermission('project_create')"
              color="primary"
              @click="submitProject"
            >
              {{ editingProject ? 'Update' : 'Add' }} Address
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, watch, onMounted, nextTick, useTemplateRef, resolveComponent } from 'vue'
import { useCorporationStore } from '@/stores/corporations'
import { useProjectsStore } from '@/stores/projects'
import { useTableStandard } from '@/composables/useTableStandard'
import { usePermissions } from '@/composables/usePermissions'
import type { TableColumn } from '@nuxt/ui'
import SavedAddressForm from './SavedAddressForm.vue'

const UButton = resolveComponent('UButton')
const UTooltip = resolveComponent('UTooltip')

const corporationStore = useCorporationStore()
const projectsStore = useProjectsStore()
const { hasPermission, isReady } = usePermissions()

const {
  pagination,
  paginationOptions,
  pageSizeOptions,
  updatePageSize,
  getPaginationProps,
  getPageInfo,
  shouldShowPagination
} = useTableStandard()

const selectedRows = ref([])
const globalFilter = ref('')
const showForm = ref(false)
const editingProject = ref<null | string>(null)
const fileUploadError = ref<string | null>(null)
const isModalClosing = ref(false)

const columnPinning = ref({
  left: [],
  right: ['actions']
})

const table = useTemplateRef<any>('table')

const selectedCorporationId = computed(() => corporationStore.selectedCorporationId)
const projects = computed(() => projectsStore.projects)
const loading = computed(() => projectsStore.loading)
const error = computed(() => projectsStore.error)

// Addresses derived from projects with any address fields filled
const addresses = computed(() => {
  return (projects.value || []).filter((p: any) => (
    p.address_line_1 || p.city || p.state || p.zip_code || p.country
  ))
})

const filteredAddresses = computed(() => {
  const q = globalFilter.value.trim().toLowerCase()
  if (!q) return addresses.value
  return addresses.value.filter((p: any) => {
    const hay = [
      p.project_name,
      p.contact_person,
      p.email,
      p.phone,
      p.address_line_1,
      p.address_line_2,
      p.city,
      p.state,
      p.zip_code,
      p.country
    ].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(q)
  })
})

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'project_name',
    header: 'Project',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-medium text-default' }, row.original.project_name || 'N/A')
  },
  {
    accessorKey: 'contact_person',
    header: 'Contact',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.contact_person || 'N/A')
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.phone || 'N/A')
  },
  {
    accessorKey: 'address_line_1',
    header: 'Address',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => h('div', `${row.original.address_line_1 || ''} ${row.original.address_line_2 || ''}`.trim() || 'N/A')
  },
  {
    accessorKey: 'city',
    header: 'City/State',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => h('div', `${row.original.city || ''}${row.original.city && row.original.state ? ', ' : ''}${row.original.state || ''}` || 'N/A')
  },
  {
    accessorKey: 'zip_code',
    header: 'ZIP',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.zip_code || 'N/A')
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const buttons: any[] = []
      if (hasPermission('project_edit')) {
        buttons.push(
          h(UTooltip, { text: 'Edit Address' }, () => [
            h(UButton, {
              icon: 'tdesign:edit-filled',
              size: 'xs',
              variant: 'soft',
              color: 'secondary',
              class: 'hover:scale-105 transition-transform',
              onClick: () => editAddress(row.original)
            }, () => '')
          ])
        )
      }
      if (hasPermission('project_delete')) {
        buttons.push(
          h(UTooltip, { text: 'Delete Project' }, () => [
            h(UButton, {
              icon: 'mingcute:delete-fill',
              size: 'xs',
              variant: 'soft',
              color: 'error',
              class: 'hover:scale-105 transition-transform',
              onClick: () => deleteAddress(row.original)
            }, () => '')
          ])
        )
      }
      return h('div', { class: 'flex justify-end space-x-2' }, buttons)
    }
  }
]

const addNewAddress = () => {
  if (!hasPermission('project_create')) {
    try {
      const toast = useToast();
      toast.add({
        title: 'Access Denied',
        description: "You don't have permission to create addresses.",
        color: 'error',
        icon: 'i-heroicons-x-circle'
      })
    } catch (error) {
      console.error('Error showing toast:', error)
    }
    return
  }
  resetForm()
  showForm.value = true
}

const editAddress = async (project: any) => {
  if (!hasPermission('project_edit')) {
    const toast = useToast();
    toast.add({
      title: 'Access Denied',
      description: "You don't have permission to edit addresses.",
      color: 'error',
      icon: 'i-heroicons-x-circle'
    })
    return
  }
  editingProject.value = project.uuid
  form.value = {
    id: project.uuid,
    corporation_uuid: project.corporation_uuid || selectedCorporationId.value || '',
    project_uuid: project.uuid,
    project_name: project.project_name || '',
    project_id: project.project_id || '',
    project_type_uuid: project.project_type_uuid || '',
    service_type_uuid: project.service_type_uuid || '',
    estimated_amount: project.estimated_amount || '',
    project_description: project.project_description || '',
    area_sq_ft: project.area_sq_ft || '',
    no_of_rooms: project.no_of_rooms || '',
    contingency_percentage: project.contingency_percentage || '',
    project_status: project.project_status || 'Pending',
    project_start_date: project.project_start_date || '',
    project_estimated_completion_date: project.project_estimated_completion_date || '',
    only_total: project.only_total || false,
    enable_labor: project.enable_labor || false,
    enable_material: project.enable_material || false,
    attachments: project.attachments || [],
    address_type: project.address_type || '',
    contact_person: project.contact_person || '',
    email: project.email || '',
    phone: project.phone || '',
    address_line_1: project.address_line_1 || '',
    address_line_2: project.address_line_2 || '',
    city: project.city || '',
    state: project.state || '',
    zip_code: project.zip_code || '',
    country: project.country || ''
  }
  fileUploadError.value = null
  nextTick(() => {
    showForm.value = true
  })
}

const deleteAddress = async (project: any) => {
  if (!hasPermission('project_delete')) {
    const toast = useToast();
    toast.add({
      title: 'Access Denied',
      description: "You don't have permission to delete addresses.",
      color: 'error',
      icon: 'i-heroicons-x-circle'
    })
    return
  }
  try {
    await projectsStore.deleteProject(project.uuid)
    const toast = useToast();
    toast.add({
      title: 'Success',
      description: 'Address deleted successfully',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
  } catch (error) {
    console.error('Error deleting address:', error)
    const toast = useToast();
    toast.add({
      title: 'Error',
      description: 'Failed to delete address',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    })
  }
}

const form = ref({
  id: '' as string | undefined,
  corporation_uuid: '',
  project_uuid: '',
  project_name: '',
  project_id: '',
  project_type_uuid: '',
  service_type_uuid: '',
  estimated_amount: '',
  project_description: '',
  area_sq_ft: '',
  no_of_rooms: '',
  contingency_percentage: '',
  project_status: 'Pending',
  project_start_date: '',
  project_estimated_completion_date: '',
  only_total: false,
  enable_labor: false,
  enable_material: false,
  attachments: [] as any[],
  address_type: '',
  contact_person: '',
  email: '',
  phone: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  zip_code: '',
  country: ''
})

const resetForm = () => {
  form.value = {
    id: undefined,
    corporation_uuid: selectedCorporationId.value || '',
    project_uuid: '',
    project_name: '',
    project_id: '',
    project_type_uuid: '',
    service_type_uuid: '',
    estimated_amount: '',
    project_description: '',
    area_sq_ft: '',
    no_of_rooms: '',
    contingency_percentage: '',
    project_status: 'Pending',
    project_start_date: '',
    project_estimated_completion_date: '',
    only_total: false,
    enable_labor: false,
    enable_material: false,
    attachments: [],
    address_type: '',
    contact_person: '',
    email: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    zip_code: '',
    country: ''
  }
  fileUploadError.value = null
}

const handleFormUpdate = (value: any) => {
  if (!isModalClosing.value) {
    try {
      form.value = value
    } catch (error) {
      console.error('Error updating form:', error)
    }
  }
}

const submitProject = async () => {
  try {
    form.value.corporation_uuid = selectedCorporationId.value || ''
    const projectData: any = {
      ...form.value,
      project_start_date: form.value.project_start_date || new Date().toISOString().split('T')[0]
    }
    delete projectData.attachments
    let response
    if (editingProject.value) {
      response = await projectsStore.updateProject({ uuid: editingProject.value, ...projectData })
    } else {
      response = await projectsStore.createProject(projectData)
    }
    if (response) {
      const toast = useToast();
      toast.add({
        title: 'Success',
        description: editingProject.value ? 'Address updated successfully' : 'Address added successfully',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      })
      showForm.value = false
    }
  } catch (error) {
    console.error('Error submitting address:', error)
    const toast = useToast();
    toast.add({
      title: 'Error',
      description: 'Failed to save address',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    })
  }
}

const closeModal = () => {
  try {
    isModalClosing.value = true
    showForm.value = false
    editingProject.value = null
    nextTick(() => {
      resetForm()
      isModalClosing.value = false
    })
  } catch (error) {
    console.error('Error closing modal:', error)
    showForm.value = false
    editingProject.value = null
    isModalClosing.value = false
  }
}

const onFormOpenUpdate = (value: boolean) => {
  if (!value && !isModalClosing.value) {
    try {
      isModalClosing.value = true
      editingProject.value = null
      nextTick(() => {
        resetForm()
        isModalClosing.value = false
      })
    } catch (error) {
      console.error('Error in modal update:open handler:', error)
      isModalClosing.value = false
    }
  }
}

const getModalTitle = () => {
  if (editingProject.value) return 'Edit Address'
  return 'Add New Address'
}

const getStatusBadgeColor = (status: string) => {
  const statusConfig = {
    'Pending': 'warning',
    'In Progress': 'info',
    'Completed': 'success',
    'On Hold': 'error'
  } as const
  return (statusConfig as any)[status] || 'warning'
}

const getStatusIcon = (status: string) => {
  const statusConfig = {
    'Pending': 'i-heroicons-clock',
    'In Progress': 'i-heroicons-play',
    'Completed': 'i-heroicons-check-circle',
    'On Hold': 'i-heroicons-pause'
  } as const
  return (statusConfig as any)[status] || 'i-heroicons-clock'
}

watch(selectedCorporationId, (newCorpId) => {
  if (newCorpId) {
    projectsStore.fetchProjects(newCorpId)
  }
}, { immediate: true })

onMounted(() => {
  nextTick(() => {
    if (selectedCorporationId.value) {
      projectsStore.fetchProjects(selectedCorporationId.value)
    }
  })
})
</script>


