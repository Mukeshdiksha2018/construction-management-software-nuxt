<template>
  <div>
    <div v-if="showHeader && corpStore.selectedCorporation" class="flex justify-between items-center mb-4">
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-600">Corporation:</span>
          <div class="flex items-center space-x-1">
            <span class="text-lg font-bold text-gray-800">{{ getCorporationName }}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <div class="max-w-sm">
          <UInput
            :model-value="props.globalFilter"
            @update:model-value="$emit('update:globalFilter', $event)"
            placeholder="Search divisions..."
            icon="i-heroicons-magnifying-glass"
            variant="subtle"
            size="xs"
            class="w-full"
          />
        </div>
        <div class="flex gap-2">
          <USelect
            v-if="hasPermission('cost_codes_create')"
            v-model="importOption"
            :items="importOptions"
            size="xs"
            color="secondary"
            variant="soft"
            class="w-32"
            @change="handleImportOptionChange"
          />
          <UButton
            v-if="hasPermission('cost_codes_delete')"
            icon="material-symbols:delete-sweep"
            size="xs"
            color="error"
            variant="soft"
            @click="handleDeleteAll"
            :disabled="!divisionsStore.divisions.length"
          >
            Delete All Divisions
          </UButton>

          <UButton
            v-if="hasPermission('cost_codes_create')"
            icon="material-symbols:add-rounded"
            size="xs"
            color="primary"
            variant="solid"
            @click="openAddModal"
          >
            Add Division
          </UButton>
        </div>
      </div>
    </div>

    <div v-if="showHeader && !corpStore.selectedCorporation" class="text-gray-500">No corporation selected.</div>

    <!-- Cost Code Divisions Table -->
    <div v-if="corpStore.selectedCorporation && divisionsStore.loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Table Header -->
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-6 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-12" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-24" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-24" />
            </div>
            <div class="flex items-center justify-center">
              <USkeleton class="h-4 w-16" />
            </div>
          </div>
        </div>
        
        <!-- Table Body -->
        <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="i in 8" :key="i" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
            <div class="grid grid-cols-6 gap-4 px-2 py-1 text-xs text-gray-900 dark:text-gray-100">
              <div class="flex items-center">
                <USkeleton class="h-4 w-16" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-32" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-5 w-20 rounded-full" />
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="divisionsStore.error">
      <p class="text-red-500">Error: {{ divisionsStore.error }}</p>
    </div>

    <div v-else-if="filteredDivisions.length">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        v-model:column-pinning="columnPinning"
        :pagination-options="paginationOptions"
        :data="filteredDivisions" 
        :columns="columns" 
        class="max-h-[70vh] overflow-auto"
      />
      
      <!-- Pagination - only show if more than 10 records -->
      <div v-if="shouldShowPagination(filteredDivisions.length).value" class="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <!-- Page Size Selector -->
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
        
        <!-- Pagination Component -->
        <UPagination v-bind="getPaginationProps(table)" />
        
        <!-- Page Info -->
        <div class="text-sm text-gray-600">
          {{ getPageInfo(table, 'divisions').value }}
        </div>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <p class="text-gray-500 text-lg font-medium">No cost code divisions found</p>
      <p class="text-gray-400 text-sm">Get started by adding your first division</p>
    </div>

    <!-- Add/Edit Division Modal -->
    <UModal 
      v-model:open="showModal" 
      :title="editingItem ? 'Edit Division' : 'Add New Division'"
      description="Configure division details for your cost code structure."
      @update:open="closeModal"
    >
      <template #body>
        <div class="flex flex-col space-y-4">
          <div>
            <label
              for="selected-corporation"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Corporation <span class="text-red-500">*</span>
            </label>
            <CorporationSelect
              id="selected-corporation"
              :model-value="form.corporation_uuid"
              placeholder="Select corporation"
              size="sm"
              class="w-full"
              @update:model-value="(value) => handleFormUpdate('corporation_uuid', value)"
              @change="handleCorporationChange"
            />
          </div>
          
          <div>
            <label
              for="division-number"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Division Number *
            </label>
            <UInput
              id="division-number"
              v-model="form.division_number"
              variant="subtle"
              placeholder="e.g., 01, 02, 10"
              class="w-full"
              required
            />
          </div>

          <div>
            <label
              for="division-name"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Division Name *
            </label>
            <UInput
              id="division-name"
              v-model="form.division_name"
              variant="subtle"
              placeholder="e.g., General Requirements, Sitework"
              class="w-full"
              required
            />
          </div>

          <div>
            <label
              for="division-order"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Division Order *
            </label>
            <OrderSelect
              v-model="form.division_order"
              placeholder="Select display order"
              size="sm"
              :max-order="100"
            />
            <p class="text-xs text-gray-500 mt-1">
              Select the display order for this division (1-100)
            </p>
          </div>

          <div>
            <label
              for="description"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <UTextarea
              id="description"
              v-model="form.description"
              variant="subtle"
              placeholder="Optional description of the division"
              class="w-full"
              :rows="3"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <UCheckbox
                v-model="form.is_active"
                label="Active"
                class="text-sm"
              />
              <p class="text-xs text-gray-500 mt-1">
                Inactive divisions will not appear in selection lists
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                &nbsp;
              </label>
              <UCheckbox
                v-model="form.exclude_in_estimates_and_reports"
                label="Use as other costcode"
                class="text-sm"
              />
              <p class="text-xs text-gray-500 mt-1">
                When checked, it will be included in other cost codes.
              </p>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="error" variant="soft" @click="closeModal">
            Cancel
          </UButton>
          <UButton color="primary" @click="submitItem">
            {{ editingItem ? "Update" : "Add" }}
          </UButton>
        </div>
      </template>
    </UModal>


    <!-- Delete Confirmation Modal -->
    <UModal 
      v-model:open="showDeleteModal" 
      title="Confirm Delete Division"
      description="This action cannot be undone. The division will be permanently removed."
      @update:open="closeDeleteModal"
    >
      <template #body>
        <div class="flex flex-col space-y-4">
          <div class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-medium text-red-800">Delete Division</h3>
              <p class="text-sm text-red-700">
                Are you sure you want to delete this division? This will permanently remove the division{{ divisionToDelete && getConfigurationsForDivision(divisionToDelete.uuid).length > 0 ? ' and all its associated cost code configurations' : '' }}. This action cannot be undone.
              </p>
            </div>
          </div>
          
          <div v-if="divisionToDelete" class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-medium text-gray-700 mb-2">Division Details:</h4>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-gray-500">Number:</span>
                <span class="ml-2 font-mono font-medium">{{ divisionToDelete.division_number }}</span>
              </div>
              <div>
                <span class="text-gray-500">Name:</span>
                <span class="ml-2 font-medium">{{ divisionToDelete.division_name }}</span>
              </div>
              <div>
                <span class="text-gray-500">Order:</span>
                <span class="ml-2">{{ divisionToDelete.division_order }}</span>
              </div>
              <div>
                <span class="text-gray-500">Status:</span>
                <span class="ml-2">{{ divisionToDelete.is_active ? 'Active' : 'Inactive' }}</span>
              </div>
              <div>
                <span class="text-gray-500">Associated Configurations:</span>
                <span class="ml-2">{{ getConfigurationsForDivision(divisionToDelete.uuid).length }} configuration(s)</span>
              </div>
            </div>
          </div>
          
          <div v-if="divisionToDelete && getConfigurationsForDivision(divisionToDelete.uuid).length > 0" class="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
            <div class="flex items-start">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h4 class="text-sm font-medium text-red-800 mb-1">Warning: Configurations Attached</h4>
                <p class="text-sm text-red-700">
                  This division has {{ getConfigurationsForDivision(divisionToDelete.uuid).length }} cost code configuration(s) associated with it. 
                  Deleting this division will also permanently remove all associated configurations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="secondary" variant="soft" @click="closeDeleteModal">
            Cancel
          </UButton>
          <UButton 
            color="error" 
            @click="confirmDelete"
            :loading="deleting"
          >
            {{ deleting ? 'Deleting...' : 'Delete Division' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete All Confirmation Modal -->
    <UModal 
      v-model:open="showDeleteAllModal" 
      title="Confirm Delete All Divisions"
      description="This action cannot be undone. All divisions will be permanently removed."
      @update:open="closeDeleteAllModal"
    >
      <template #body>
        <div class="flex flex-col space-y-4">
          <div class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-medium text-red-800">Delete All Divisions</h3>
              <p class="text-sm text-red-700">
                Are you sure you want to delete ALL divisions for this corporation? This will permanently remove {{ divisionsStore.divisions.length }} division(s) and cannot be undone.
              </p>
            </div>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-medium text-gray-700 mb-2">Warning:</h4>
            <ul class="text-sm text-gray-600 space-y-1">
              <li>• All {{ divisionsStore.divisions.length }} division(s) will be permanently deleted</li>
              <li>• Any cost code configurations associated with these divisions will also be affected</li>
              <li>• This action cannot be undone</li>
            </ul>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="secondary" variant="soft" @click="closeDeleteAllModal">
            Cancel
          </UButton>
          <UButton 
            color="error" 
            @click="confirmDeleteAll"
            :loading="deleting"
          >
            {{ deleting ? 'Deleting...' : 'Delete All Divisions' }}
          </UButton>
        </div>
      </template>
    </UModal>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, resolveComponent, watch, onMounted } from "vue";
import { useCostCodeDivisionsStore } from "@/stores/costCodeDivisions";
import { useCorporationStore } from "@/stores/corporations";
import { useCostCodeConfigurationsStore } from "@/stores/costCodeConfigurations";
import { usePermissions } from '@/composables/usePermissions';
import { useTableStandard } from '@/composables/useTableStandard'
import OrderSelect from '@/components/Shared/OrderSelect.vue';
import CorporationSelect from '@/components/Shared/CorporationSelect.vue';
import type { TableColumn } from '@nuxt/ui';

interface Props {
  globalFilter?: string;
  showHeader?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  globalFilter: '',
  showHeader: true
});

const emit = defineEmits<{
  'update:globalFilter': [value: string]
}>();

const divisionsStore = useCostCodeDivisionsStore();
const corpStore = useCorporationStore();
const configurationsStore = useCostCodeConfigurationsStore();
const toast = useToast();
const { hasPermission } = usePermissions();

const UButton = resolveComponent('UButton');

// Use table standard composable
const {
  pagination,
  paginationOptions,
  pageSizeOptions,
  updatePageSize,
  shouldShowPagination,
  getPaginationProps,
  getPageInfo
} = useTableStandard()

// Table ref for pagination
const table = useTemplateRef<any>('table');

// Column pinning for sticky actions column
const columnPinning = ref({
  left: [],
  right: ['actions']
});

// State
const showModal = ref(false);
const editingItem = ref<null | string>(null);
const form = ref({
  corporation_uuid: '',
  division_number: '',
  division_name: '',
  division_order: 1,
  description: '',
  is_active: true,
  exclude_in_estimates_and_reports: false
});

// Delete confirmation modal variables
const showDeleteModal = ref(false);
const showDeleteAllModal = ref(false);
const divisionToDelete = ref<any>(null);
const deleting = ref(false);

// Import option related variables (only needed when showHeader is true)
const importOption = ref('import-csv');

// Import options for the select dropdown
const importOptions = [
  { 
    label: "Import CSV", 
    value: "import-csv",
    icon: "material-symbols:upload-file"
  }
];

// Computed properties
const getCorporationName = computed(() => {
  return corpStore.selectedCorporation?.corporation_name || "Unnamed Corporation";
});

const filteredDivisions = computed(() => {
  if (!props.globalFilter.trim()) {
    return [...divisionsStore.divisions];
  }

  const searchTerm = props.globalFilter.toLowerCase().trim();
  
  return [...divisionsStore.divisions].filter(division => {
    const searchableFields = [
      division.division_number || '',
      division.division_name || '',
      division.description || ''
    ];
    return searchableFields.some(field => 
      field.toLowerCase().includes(searchTerm)
    );
  });
});

// Helper function to check if a division has associated cost code configurations
const getConfigurationsForDivision = (divisionUuid: string) => {
  return configurationsStore.configurations.filter(config => 
    config.division_uuid === divisionUuid
  );
};

// Table columns configuration
const columns: TableColumn<any>[] = [
  {
    accessorKey: 'division_number',
    header: 'Number',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => h('div', { class: 'font-mono text-xs text-default' }, row.original.division_number)
  },
  {
    accessorKey: 'division_name',
    header: 'Division Name',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => h('div', { class: 'text-xs text-default' }, row.original.division_name)
  },
  {
    accessorKey: 'division_order',
    header: 'Order',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => h('div', { class: 'text-xs text-default' }, row.original.division_order)
  },
  {
    accessorKey: 'description',
    header: 'Description',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => h('div', { class: 'text-muted max-w-xs truncate' }, row.original.description || '-')
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => {
      const isActive = row.original.is_active;
      const colorClass = isActive ? 'bg-success/10 text-success' : 'bg-error/10 text-error';
      
      return h('span', { 
        class: `inline-flex items-center px-2 py-1 gap-1 rounded-md text-xs font-medium ${colorClass}` 
      }, isActive ? 'Active' : 'Inactive')
    }
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    enableSorting: false,
    meta: { class: { th: 'text-right sticky right-0 z-10', td: 'text-right sticky right-0' } },
    cell: ({ row }) => {
      const buttons = [];
      
      // Edit button - show if user has edit permission
      if (hasPermission('cost_codes_edit')) {
        buttons.push(
          h(UButton, {
            icon: 'tdesign:edit-filled',
            size: 'xs',
            variant: 'soft',
            color: 'secondary',
            class: 'hover:scale-105 transition-transform',
            onClick: () => editDivision(row.original)
          }, () => '')
        );
      }
      
      // Delete button - show if user has delete permission
      if (hasPermission('cost_codes_delete')) {
        buttons.push(
          h(UButton, {
            icon: 'mingcute:delete-fill',
            size: 'xs',
            variant: 'soft',
            color: 'error',
            class: 'hover:scale-105 transition-transform',
            onClick: () => deleteDivision(row.original.uuid)
          }, () => '')
        );
      }
      
      return h('div', { class: 'flex justify-end space-x-2' }, buttons);
    }
  }
];

// Preview columns for CSV import
const previewColumns: TableColumn<any>[] = [
  {
    accessorKey: 'division_number',
    header: 'Number',
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-mono font-medium text-default' }, row.original.division_number)
  },
  {
    accessorKey: 'division_name',
    header: 'Division Name',
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-medium text-default' }, row.original.division_name)
  },
  {
    accessorKey: 'division_order',
    header: 'Order',
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'text-center text-default' }, row.original.division_order)
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'text-muted max-w-xs truncate' }, row.original.description || '-')
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }: { row: { original: any } }) => {
      const isActive = row.original.is_active;
      const colorClass = isActive ? 'bg-success/10 text-success' : 'bg-error/10 text-error';
      
      return h('span', { 
        class: `inline-flex items-center px-2 py-1 gap-1 rounded-md text-xs font-medium ${colorClass}` 
      }, isActive ? 'Active' : 'Inactive')
    }
  }
];


// Event handlers
function openAddModal() {
  // Check for create permission
  if (!hasPermission('cost_codes_create')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to create cost code divisions. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  editingItem.value = null;
  form.value = {
    corporation_uuid: corpStore.selectedCorporation?.uuid || '',
    division_number: '',
    division_name: '',
    division_order: 1,
    description: '',
    is_active: true,
    exclude_in_estimates_and_reports: false
  };
  showModal.value = true;
}

function editDivision(division: any) {
  // Check for edit permission
  if (!hasPermission('cost_codes_edit')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to edit cost code divisions. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  editingItem.value = division.uuid;
  form.value = {
    corporation_uuid: division.corporation_uuid || corpStore.selectedCorporation?.uuid || '',
    division_number: division.division_number,
    division_name: division.division_name,
    division_order: division.division_order,
    description: division.description || '',
    is_active: division.is_active,
    exclude_in_estimates_and_reports: division.exclude_in_estimates_and_reports || false
  };
  showModal.value = true;
}

function deleteDivision(uuid: string) {
  // Check for delete permission
  if (!hasPermission('cost_codes_delete')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to delete cost code divisions. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  const division = divisionsStore.divisions.find(div => div.uuid === uuid);
  if (!division) return;

  // Check if division has associated cost code configurations
  const associatedConfigurations = getConfigurationsForDivision(uuid);
  
  if (associatedConfigurations.length > 0) {
    toast.add({
      title: 'Cannot Delete Division',
      description: `This division has ${associatedConfigurations.length} cost code configuration(s) associated with it. Please reassign or remove all configurations before deleting the division.`,
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  divisionToDelete.value = division;
  showDeleteModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editingItem.value = null;
  form.value = {
    corporation_uuid: '',
    division_number: '',
    division_name: '',
    division_order: 1,
    description: '',
    is_active: true,
    exclude_in_estimates_and_reports: false
  };
}

async function submitItem() {
  if (!form.value.corporation_uuid) {
    toast.add({
      title: 'Validation Error',
      description: 'Please select a corporation',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }
  
  try {
    const payload = {
      ...form.value
    };

    if (editingItem.value) {
      await divisionsStore.updateDivision(editingItem.value, payload);
      toast.add({
        title: 'Division updated successfully!',
        icon: 'i-heroicons-check-circle',
      });
    } else {
      await divisionsStore.createDivision(payload);
      toast.add({
        title: 'Division added successfully!',
        icon: 'i-heroicons-check-circle',
      });
    }

    closeModal();
  } catch (error: any) {
    // Extract user-friendly error message
    let errorMessage = 'An error occurred while saving';
    let errorTitle = 'Failed to save division';
    
    if (error?.data?.statusMessage) {
      errorMessage = error.data.statusMessage;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Note: Duplicate sequence error handling removed - multiple divisions can have the same order number
    
    toast.add({
      title: errorTitle,
      description: errorMessage,
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle',
    });
  }
}

// Handle Delete All button click with permission check
function handleDeleteAll() {
  // Check for delete permission
  if (!hasPermission('cost_codes_delete')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to delete cost code divisions. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }
  
  showDeleteAllModal.value = true;
}

// Import functions (only needed when showHeader is true)
function handleImportOptionChange() {
  // Check for create permission
  if (!hasPermission('cost_codes_create')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to import cost code divisions. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  if (importOption.value === 'import-csv') {
    // This will be handled by the parent component
    console.log('Import CSV requested - handled by parent');
  }
  importOption.value = 'import-csv';
}

// Delete functions
function closeDeleteModal() {
  showDeleteModal.value = false;
  divisionToDelete.value = null;
  deleting.value = false;
}

async function confirmDelete() {
  // Check for delete permission
  if (!hasPermission('cost_codes_delete')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to delete cost code divisions. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  if (!divisionToDelete.value || !corpStore.selectedCorporation) {
    toast.add({
      title: 'Error',
      description: 'No division selected for deletion',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  // Double-check: Ensure no configurations are associated before deletion
  const associatedConfigurations = getConfigurationsForDivision(divisionToDelete.value.uuid);
  
  if (associatedConfigurations.length > 0) {
    toast.add({
      title: 'Cannot Delete Division',
      description: `This division has ${associatedConfigurations.length} cost code configuration(s) associated with it. Please reassign or remove all configurations before deleting the division.`,
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    closeDeleteModal();
    return;
  }

  deleting.value = true;

  try {
    await divisionsStore.deleteDivision(divisionToDelete.value.uuid);
    
    // Refresh divisions to ensure IndexedDB is in sync
    if (corpStore.selectedCorporation?.uuid) {
      await divisionsStore.fetchDivisions(corpStore.selectedCorporation.uuid, true, true);
    }
    
    toast.add({
      title: 'Division deleted successfully!',
      icon: 'i-heroicons-check-circle',
    });
    
    closeDeleteModal();
  } catch (error) {
    console.error('Delete error:', error);
    
    toast.add({
      title: 'Failed to delete division',
      description: error instanceof Error ? error.message : 'An error occurred while deleting',
      icon: 'i-heroicons-exclamation-triangle',
    });
  } finally {
    deleting.value = false;
  }
}

// Delete All functions
function closeDeleteAllModal() {
  showDeleteAllModal.value = false;
  deleting.value = false;
}

async function confirmDeleteAll() {
  // Check for delete permission
  if (!hasPermission('cost_codes_delete')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to delete cost code divisions. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  if (!corpStore.selectedCorporation) {
    toast.add({
      title: 'Error',
      description: 'No corporation selected for deletion',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  deleting.value = true;

  try {
    await divisionsStore.deleteAllDivisions(corpStore.selectedCorporation.uuid);
    
    // Refresh divisions to ensure IndexedDB is in sync
    await divisionsStore.fetchDivisions(corpStore.selectedCorporation.uuid, true, true);
    
    toast.add({
      title: 'All divisions deleted successfully!',
      icon: 'i-heroicons-check-circle',
    });
    
    closeDeleteAllModal();
  } catch (error) {
    console.error('Delete all error:', error);
    
    toast.add({
      title: 'Failed to delete all divisions',
      description: error instanceof Error ? error.message : 'An error occurred while deleting',
      icon: 'i-heroicons-exclamation-triangle',
    });
  } finally {
    deleting.value = false;
  }
}

// Watchers to sync pageSize with TanStack Table
watch(() => pagination.value.pageSize, (newSize) => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageSize(newSize);
  }
});

watch(() => props.globalFilter, () => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageIndex(0); // Reset to first page when filter changes
  }
});

// Load divisions and configurations when corporation changes
watch(
  () => corpStore.selectedCorporation?.uuid,
  (uuid) => {
    if (!uuid || process.server) return;

    // If we already have divisions for this corporation in the store, reuse them
    // instead of refetching on every mount/tab switch.
    const hasDivisions =
      typeof divisionsStore.getDivisionCountByCorporation === "function"
        ? divisionsStore.getDivisionCountByCorporation(uuid) > 0
        : divisionsStore.divisions.some(
            (division: any) => division.corporation_uuid === uuid
          );

    if (!hasDivisions) {
      // First time for this corporation: fetch from API (and sync to IndexedDB)
      divisionsStore.fetchDivisions(uuid, true, false);
    }

    // For configurations, apply a similar guard: only fetch if none exist for this corporation
    const hasConfigurations = (configurationsStore.configurations || []).some(
      (config: any) => config.corporation_uuid === uuid
    );

    if (!hasConfigurations) {
      configurationsStore.fetchConfigurations(uuid, true, false);
    }
  },
  { immediate: true }
);

// Handle form updates
function handleFormUpdate(field: string, value: any) {
  form.value = { ...form.value, [field]: value };
}

// Handle corporation change
function handleCorporationChange(corporation: any) {
  if (corporation && corporation.value) {
    handleFormUpdate('corporation_uuid', corporation.value);
  }
}

// Expose method for parent component
defineExpose({
  openAddModal
});
</script>