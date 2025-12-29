<template>
  <div>
    <div class="flex justify-end items-center mb-4">
      <div class="mr-1">
        <UInput
          v-model="globalFilter"
          placeholder="Search storage locations..."
          icon="i-heroicons-magnifying-glass"
          variant="subtle"
          size="xs"
        />
      </div>
      <UButton
        v-if="hasPermission('storage_locations_create')"
        icon="material-symbols:add-rounded"
        size="xs"
        color="primary"
        variant="solid"
        @click="openModal"
      >
        Add Storage Location
      </UButton>
    </div>

    <!-- Storage Locations Table -->
    <div v-if="storageLocationsStore.loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Table Header -->
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-5 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-24" />
            </div>
            <div class="col-span-2 flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-12" />
            </div>
            <div class="flex items-center justify-center">
              <USkeleton class="h-4 w-16" />
            </div>
          </div>
        </div>
        
        <!-- Table Body -->
        <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="i in 5" :key="i" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
            <div class="grid grid-cols-5 gap-4 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 border-gray-100 dark:border-gray-700">
              <div class="flex items-center">
                <USkeleton class="h-4 w-32" />
              </div>
              <div class="col-span-2 flex items-center">
                <USkeleton class="h-4 w-48" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-5 w-20 rounded-full" />
              </div>
              <div class="flex items-center justify-end gap-1">
                <USkeleton class="h-6 w-6 rounded" />
                <USkeleton class="h-6 w-6 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="storageLocationsStore.error">
      <p class="text-red-500">Error: {{ storageLocationsStore.error }}</p>
    </div>

    <div v-else-if="storageLocationsStore.storageLocations.length">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        v-model:column-pinning="columnPinning"
        :pagination-options="paginationOptions"
        :data="filteredLocations" 
        :columns="columns"
        v-model:global-filter="globalFilter"
        class="max-h-[70vh] overflow-auto"
      />
      
      <!-- Pagination - only show if more than 10 records -->
      <div v-if="shouldShowPagination" class="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <!-- Page Size Selector -->
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Show:</span>
          <USelect
            v-model="pagination.pageSize"
            :items="[
              { label: '10 per page', value: 10 },
              { label: '25 per page', value: 25 },
              { label: '50 per page', value: 50 },
              { label: '100 per page', value: 100 }
            ]"
            icon="i-heroicons-list-bullet"
            size="sm"
            variant="outline"
            class="w-32"
            @change="updatePageSize"
          />
        </div>
        
        <!-- Pagination Component -->
        <UPagination 
          v-if="table?.tableApi"
          :default-page="Math.min((table.tableApi.getState().pagination.pageIndex || 0) + 1, Math.ceil((table.tableApi.getFilteredRowModel().rows.length || 1) / (table.tableApi.getState().pagination.pageSize || 10)))"
          :items-per-page="table.tableApi.getState().pagination.pageSize || 10"
          :total="table.tableApi.getFilteredRowModel().rows.length || 0"
          @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
        />
        
        <!-- Page Info -->
        <div v-if="table?.tableApi" class="text-sm text-gray-600">
          Showing {{ Math.min((table.tableApi.getState().pagination.pageIndex || 0) * (table.tableApi.getState().pagination.pageSize || 10) + 1, table.tableApi.getFilteredRowModel().rows.length || 0) }} to {{ Math.min(((table.tableApi.getState().pagination.pageIndex || 0) + 1) * (table.tableApi.getState().pagination.pageSize || 10), table.tableApi.getFilteredRowModel().rows.length || 0) }} of {{ table.tableApi.getFilteredRowModel().rows.length || 0 }} storage locations
        </div>
      </div>
    </div>

    <p v-else class="text-gray-500 text-center py-12">No storage locations found.</p>

    <!-- Storage Location Form Modal -->
    <UModal 
      v-model:open="showModal" 
      :title="editingLocation ? 'Edit Storage Location' : 'Add New Storage Location'"
      description="Configure storage location details for your organization."
      :ui="{ 
        content: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-1rem)] max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] rounded-lg shadow-lg ring ring-default overflow-hidden',
        body: 'p-4 sm:p-6 max-h-[calc(100dvh-12rem)] overflow-y-auto'
      }"
      @update:open="closeModal"
    >
      <template #body>
        <div class="space-y-4">
          <!-- Corporation Display -->
          <div>
            <label
              for="corporation"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Corporation <span class="text-red-500">*</span>
            </label>
            <div class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 text-sm">
              <UIcon name="i-heroicons-building-office-2" class="text-gray-500 dark:text-gray-400 w-4 h-4" />
              <span class="text-gray-900 dark:text-gray-100 font-medium">{{ getCorporationName }}</span>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Auto-selected from current context</p>
          </div>

          <!-- Project Selection (Optional) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Associated Project <span class="text-gray-400 text-xs">(Optional)</span>
            </label>
            <ProjectSelect
              v-model="form.project_uuid"
              :corporation-uuid="corpStore.selectedCorporationId || ''"
              placeholder="Select a project (optional)"
              size="md"
            />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Link this storage location to a specific project if needed
            </p>
          </div>

          <!-- Location Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location Name <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="form.location_name"
              variant="subtle"
              placeholder="Enter location name"
              size="md"
              class="w-full"
            />
          </div>

          <!-- Address -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address <span class="text-red-500">*</span>
            </label>
            <UTextarea
              v-model="form.address"
              variant="subtle"
              placeholder="Enter full address"
              size="md"
              :rows="3"
              class="w-full"
            />
          </div>

          <!-- Is Default Checkbox and Status in a row -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Is Default Checkbox -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Location
              </label>
              <div class="flex items-center space-x-2">
                <UCheckbox
                  id="is-default"
                  v-model="form.is_default"
                  color="primary"
                  size="md"
                />
                <label for="is-default" class="text-sm text-gray-600 dark:text-gray-400">Set as default location</label>
              </div>
            </div>

            <!-- Status Select -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status <span class="text-red-500">*</span>
              </label>
              <USelect
                v-model="form.status"
                :items="statusOptions"
                placeholder="Select status"
                variant="subtle"
                size="md"
                class="w-full"
              />
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
            @click="saveLocation"
            :loading="saving"
            :disabled="!isFormValid"
          >
            {{ editingLocation ? 'Update' : 'Save' }} Location
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal 
      v-model:open="showDeleteModal"
      title="Delete Storage Location"
      description="This action cannot be undone. The storage location will be permanently removed."
    >
      <template #body>
        <p class="text-gray-700 dark:text-gray-300">Are you sure you want to delete this storage location? This action cannot be undone.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="showDeleteModal = false">
            Cancel
          </UButton>
          <UButton 
            color="error" 
            @click="confirmDelete"
            :loading="deleting"
          >
            Delete Location
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Preview Location Modal -->
    <UModal 
      v-model:open="showPreviewModal"
      title="Storage Location Details"
      description="View complete information about this storage location"
      :ui="{ 
        content: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-1rem)] max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] rounded-lg shadow-lg ring ring-default overflow-hidden',
        body: 'p-4 sm:p-6'
      }"
    >
      <template #body>
        <div v-if="previewLocation" class="space-y-4">
          <!-- Location Name -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Location Name
            </label>
            <p class="text-base font-semibold text-gray-900 dark:text-gray-100">
              {{ previewLocation.location_name }}
            </p>
          </div>

          <!-- Address -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Address
            </label>
            <p class="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
              {{ previewLocation.address }}
            </p>
          </div>

          <!-- Associated Project (if any) -->
          <div v-if="previewLocation.project_uuid" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Associated Project
            </label>
            <p class="text-sm text-gray-900 dark:text-gray-100">
              {{ previewLocation.project_name || previewLocation.project_uuid }}
            </p>
          </div>

          <!-- Status and Default in a row -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Status -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Status
              </label>
              <UBadge 
                :color="previewLocation.status === 'active' ? 'success' : 'neutral'"
                variant="soft"
                size="sm"
              >
                {{ previewLocation.status === 'active' ? 'Active' : 'Inactive' }}
              </UBadge>
            </div>

            <!-- Is Default -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Default Location
              </label>
              <UBadge 
                v-if="previewLocation.is_default"
                color="primary"
                variant="soft"
                size="sm"
              >
                Default
              </UBadge>
              <span v-else class="text-sm text-gray-500 dark:text-gray-400">No</span>
            </div>
          </div>

          <!-- Metadata -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Additional Information
            </label>
            <div class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-calendar" class="w-3 h-3" />
                <span>Created: {{ new Date(previewLocation.created_at).toLocaleString() }}</span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-clock" class="w-3 h-3" />
                <span>Updated: {{ new Date(previewLocation.updated_at).toLocaleString() }}</span>
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
            @click="() => { showPreviewModal = false; editLocation(previewLocation); }"
          >
            Edit Location
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, h, resolveComponent, onMounted, useTemplateRef } from "vue";
import { getPaginationRowModel } from "@tanstack/vue-table";
import { useStorageLocationsStore } from "@/stores/storageLocations";
import { useCorporationStore } from "@/stores/corporations";
import { usePermissions } from '@/composables/usePermissions';
import ProjectSelect from '@/components/Shared/ProjectSelect.vue';
import type { TableColumn } from '@nuxt/ui'

const UButton = resolveComponent('UButton')
const UTable = resolveComponent('UTable')
const UPagination = resolveComponent('UPagination')
const UBadge = resolveComponent('UBadge')
const UTooltip = resolveComponent('UTooltip')

const storageLocationsStore = useStorageLocationsStore();
const corpStore = useCorporationStore();
const toast = useToast();
const { hasPermission } = usePermissions();

const showModal = ref(false);
const showDeleteModal = ref(false);
const showPreviewModal = ref(false);
const editingLocation = ref<any>(null);
const locationToDelete = ref<number | null>(null);
const previewLocation = ref<any>(null);
const deleting = ref(false);
const saving = ref(false);
const globalFilter = ref('');

// Form state
const form = ref({
  location_name: '',
  address: '',
  project_uuid: '' as string | undefined,
  is_default: false,
  status: 'active' as 'active' | 'inactive'
});

// Status options
const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' }
];

// Pagination state for TanStack Table
const pagination = ref({
  pageIndex: 0,
  pageSize: 10
});

// Column pinning state - pin actions column to the right
const columnPinning = ref({
  left: [],
  right: ['actions']
});

// Pagination options for TanStack Table
const paginationOptions = ref({
  getPaginationRowModel: getPaginationRowModel()
});

// Table ref for accessing table API
const table = useTemplateRef<any>('table');

// Computed property for filtered locations based on global filter
const filteredLocations = computed(() => {
  if (!globalFilter.value.trim()) {
    return storageLocationsStore.storageLocations;
  }

  const searchTerm = globalFilter.value.toLowerCase().trim();
  
  return storageLocationsStore.storageLocations.filter(location => {
    const searchableFields = [
      location.location_name || '',
      location.address || '',
      location.status || ''
    ];

    return searchableFields.some(field => 
      field.toLowerCase().includes(searchTerm)
    );
  });
});

// Computed property to determine if pagination should be shown
const shouldShowPagination = computed(() => {
  return filteredLocations.value.length > 10;
});

// Get corporation name for display
const getCorporationName = computed(() => {
  return corpStore.selectedCorporation?.corporation_name || 'N/A';
});

// Form validation
const isFormValid = computed(() => {
  return form.value.location_name.trim() !== '' && 
         form.value.address.trim() !== '';
});

// Table columns configuration with custom widths
const columns: TableColumn<any>[] = [
  {
    accessorKey: 'location_name',
    header: 'Location Name',
    enableSorting: false,
    meta: { 
      class: { th: 'text-left', td: 'text-left' },
      style: {
        th: 'width: 25%; min-width: 200px;',
        td: 'width: 25%; min-width: 200px;'
      }
    },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-medium text-default' }, row.original.location_name)
  },
  {
    accessorKey: 'address',
    header: 'Address',
    enableSorting: false,
    meta: { 
      class: { th: 'text-left', td: 'text-left' },
      style: {
        th: 'width: 30%; max-width: 300px;',
        td: 'width: 30%; max-width: 300px;'
      }
    },
    cell: ({ row }: { row: { original: any } }) => {
      const address = row.original.address || '';
      // If address is longer than 60 characters, show with tooltip
      if (address.length > 60) {
        return h(UTooltip, {
          text: address
        }, () => h('div', { 
          class: 'text-default text-sm truncate cursor-help',
          style: 'max-width: 280px;'
        }, address));
      }
      return h('div', { 
        class: 'text-default text-sm truncate',
        style: 'max-width: 280px;'
      }, address);
    }
  },
  {
    accessorKey: 'is_default',
    header: 'Default',
    enableSorting: false,
    meta: { 
      class: { th: 'text-left', td: 'text-left' },
      style: {
        th: 'width: 12%;',
        td: 'width: 12%;'
      }
    },
    cell: ({ row }: { row: { original: any } }) => {
      if (row.original.is_default) {
        return h(UBadge, { 
          color: 'primary',
          variant: 'soft',
          size: 'sm'
        }, () => 'Default')
      }
      return h('span', { class: 'text-gray-400 text-xs' }, '-')
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: false,
    meta: { 
      class: { th: 'text-left', td: 'text-left' },
      style: {
        th: 'width: 15%;',
        td: 'width: 15%;'
      }
    },
    cell: ({ row }: { row: { original: any } }) => {
      const status = row.original.status;
      return h(UBadge, { 
        color: status === 'active' ? 'success' : 'neutral',
        variant: 'soft',
        size: 'sm'
      }, () => status === 'active' ? 'Active' : 'Inactive')
    }
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    enableSorting: false,
    enableHiding: false,
    meta: { 
      class: { th: 'text-right sticky right-0 z-10 w-32', td: 'text-right sticky right-0 w-32' },
      style: {
        th: 'width: 18%; min-width: 120px;',
        td: 'width: 18%; min-width: 120px;'
      }
    },
    cell: ({ row }: { row: { original: any } }) => {
      const buttons = [];
      
      // View button - always show if user has view permission
      if (hasPermission('storage_locations_view')) {
        buttons.push(
          h(UTooltip, { text: 'View Details' }, () => [
            h(UButton, {
              icon: 'i-heroicons-eye-solid',
              size: 'xs',
              color: 'neutral',
              variant: 'soft',
              onClick: () => viewLocation(row.original)
            })
          ])
        );
      }
      
      // Edit button - show if user has edit permission
      if (hasPermission('storage_locations_edit')) {
        buttons.push(
          h(UTooltip, { text: 'Edit Location' }, () => [
            h(UButton, {
              icon: 'tdesign:edit-filled',
              size: 'xs',
              color: 'secondary',
              variant: 'soft',
              onClick: () => editLocation(row.original)
            })
          ])
        );
      }
      
      // Delete button - show if user has delete permission
      if (hasPermission('storage_locations_delete')) {
        buttons.push(
          h(UTooltip, { text: 'Delete Location' }, () => [
            h(UButton, {
              icon: 'mingcute:delete-fill',
              size: 'xs',
              color: 'error',
              variant: 'soft',
              onClick: () => openDeleteModal(row.original.id)
            })
          ])
        );
      }
      
      return h('div', { class: 'flex justify-end gap-1' }, buttons);
    }
  }
];

// Open modal for adding new location
const openModal = () => {
  // Check for create permission
  if (!hasPermission('storage_locations_create')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to create storage locations. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }
  
  if (!corpStore.selectedCorporationId) {
    toast.add({
      title: 'No Corporation Selected',
      description: 'Please select a corporation first',
      color: 'error'
    });
    return;
  }
  editingLocation.value = null;
  resetForm();
  showModal.value = true;
};

// Close modal
const closeModal = () => {
  showModal.value = false;
  editingLocation.value = null;
  resetForm();
};

// Reset form
const resetForm = () => {
  form.value = {
    location_name: '',
    address: '',
    project_uuid: undefined,
    is_default: false,
    status: 'active'
  };
};

// View location details
const viewLocation = (location: any) => {
  previewLocation.value = location;
  showPreviewModal.value = true;
};

// Edit location
const editLocation = (location: any) => {
  // Check for edit permission
  if (!hasPermission('storage_locations_edit')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to edit storage locations. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }
  
  editingLocation.value = location;
  form.value = {
    location_name: location.location_name,
    address: location.address,
    project_uuid: location.project_uuid,
    is_default: location.is_default,
    status: location.status
  };
  showModal.value = true;
};

// Save location (add or update)
const saveLocation = async () => {
  if (!isFormValid.value) {
    toast.add({
      title: 'Validation Error',
      description: 'Please fill in all required fields',
      color: 'error'
    });
    return;
  }

  if (!corpStore.selectedCorporationId) {
    toast.add({
      title: 'Error',
      description: 'No corporation selected',
      color: 'error'
    });
    return;
  }

  saving.value = true;
  try {
    if (editingLocation.value) {
      // Update existing location
      await storageLocationsStore.updateStorageLocation(
        corpStore.selectedCorporationId,
        editingLocation.value,
        form.value
      );
      toast.add({
        title: 'Success',
        description: 'Storage location updated successfully',
        color: 'success'
      });
    } else {
      // Add new location
      await storageLocationsStore.addStorageLocation(
        corpStore.selectedCorporationId,
        form.value
      );
      toast.add({
        title: 'Success',
        description: 'Storage location added successfully',
        color: 'success'
      });
    }
    closeModal();
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to save storage location',
      color: 'error'
    });
  } finally {
    saving.value = false;
  }
};

// Open delete confirmation modal
const openDeleteModal = (locationId: number) => {
  // Check for delete permission
  if (!hasPermission('storage_locations_delete')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to delete storage locations. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }
  
  locationToDelete.value = locationId;
  showDeleteModal.value = true;
};

// Confirm delete
const confirmDelete = async () => {
  if (locationToDelete.value === null || !corpStore.selectedCorporationId) return;

  const location = storageLocationsStore.storageLocations.find(
    (l) => l.id === locationToDelete.value
  );

  if (!location) return;

  deleting.value = true;
  try {
    await storageLocationsStore.deleteStorageLocation(
      corpStore.selectedCorporationId,
      location
    );
    toast.add({
      title: 'Success',
      description: 'Storage location deleted successfully',
      color: 'success'
    });
    showDeleteModal.value = false;
    locationToDelete.value = null;
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to delete storage location',
      color: 'error'
    });
  } finally {
    deleting.value = false;
  }
};

// Update page size
const updatePageSize = (newSize: any) => {
  if (table.value?.tableApi) {
    const size = newSize.value || newSize;
    table.value.tableApi.setPageSize(size);
    // Reset to first page when changing page size to prevent out-of-bounds errors
    table.value.tableApi.setPageIndex(0);
  }
};

// Fetch storage locations when corporation changes
watch(
  () => corpStore.selectedCorporationId,
  (newCorporationId) => {
    if (newCorporationId) {
      storageLocationsStore.fetchStorageLocations(newCorporationId);
    }
  },
  { immediate: true }
);

// Fetch storage locations on mount
onMounted(() => {
  if (corpStore.selectedCorporationId) {
    storageLocationsStore.fetchStorageLocations(corpStore.selectedCorporationId);
  }
});
</script>
