<template>
  <div>
    <!-- Configurations Table -->
    <div v-if="loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Loading skeleton -->
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-8 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-32" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-12" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-28" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center justify-end">
              <USkeleton class="h-4 w-16" />
            </div>
          </div>
        </div>
        
        <!-- Table Body -->
        <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="i in 8" :key="i" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
            <div class="grid grid-cols-8 gap-4 px-2 py-1 text-xs text-gray-900 dark:text-gray-100">
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-32" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-8" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-16" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-5 w-16 rounded-full" />
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

    <div v-else-if="error">
      <UAlert
        icon="i-heroicons-exclamation-triangle"
        color="error"
        variant="soft"
        :title="error"
        :description="'Please try refreshing the page or contact support if the issue persists.'"
      />
    </div>

    <div v-else-if="configurations.length">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        :pagination-options="paginationOptions"
        :data="filteredConfigurations" 
        :columns="columns"
        v-model:global-filter="props.globalFilter"
        class="max-h-[70vh] overflow-auto"
      />
      
      <!-- Pagination -->
      <div v-if="shouldShowPagination(filteredConfigurations.length).value" class="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
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
          {{ getPageInfo(table, 'configurations').value }}
        </div>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-cog-6-tooth" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      </div>
      <p class="text-gray-500 text-lg font-medium">No cost code configurations found</p>
      <p class="text-gray-400 text-sm">Get started by adding your first configuration</p>
    </div>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" :title="'Delete Configuration'" :description="''">
      <template #body>
        <div class="p-6">
          <div class="flex items-center mb-4">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-500 mr-3" />
            <div>
              <h3 class="text-lg font-medium text-gray-900">Delete Configuration</h3>
              <p class="text-sm text-gray-500">This action cannot be undone.</p>
            </div>
          </div>
          
          <div v-if="configToDelete" class="bg-gray-50 p-4 rounded-lg mb-4">
            <p class="text-sm text-gray-700">
              <strong>Cost Code:</strong> {{ configToDelete.cost_code_number || 'N/A' }}<br>
              <strong>Name:</strong> {{ configToDelete.cost_code_name || 'N/A' }}<br>
              <strong>Sub Category of:</strong> {{ getParentCostCodeName(configToDelete.parent_cost_code_uuid) || 'N/A' }}<br>
              <strong>Preferred Items:</strong> {{ configToDelete.preferred_items?.length || 0 }} items<br>
              <strong>Status:</strong> {{ configToDelete.is_active ? 'Active' : 'Inactive' }}
            </p>
          </div>
          
          <div v-if="configToDelete && configToDelete.preferred_items && configToDelete.preferred_items.length > 0" class="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
            <div class="flex items-start">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h4 class="text-sm font-medium text-red-800 mb-1">Warning: Items Attached</h4>
                <p class="text-sm text-red-700">
                  This cost code has {{ configToDelete.preferred_items.length }} item(s) attached. 
                  Deleting this cost code will also permanently remove all associated items.
                </p>
              </div>
            </div>
          </div>
          
          <p class="text-gray-600">
            Are you sure you want to delete this cost code configuration? This will permanently remove the configuration{{ configToDelete?.preferred_items?.length > 0 ? ' and all its associated preferred items' : '' }}.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="soft" @click="cancelDelete">
            Cancel
          </UButton>
          <UButton color="error" @click="confirmDelete">
            Delete Configuration
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, watch, onMounted, onActivated, useTemplateRef, resolveComponent } from 'vue';
import { useRouter } from 'vue-router';
import { useCorporationStore } from '@/stores/corporations';
import { useCostCodeConfigurationsStore } from '@/stores/costCodeConfigurations';
import { useChartOfAccountsStore } from '@/stores/chartOfAccounts';
import { usePermissions } from '@/composables/usePermissions';
import { useTableStandard } from '@/composables/useTableStandard';
import type { TableColumn } from '@nuxt/ui';

// Resolve components
const UButton = resolveComponent('UButton');
const UTooltip = resolveComponent('UTooltip');

interface Props {
  globalFilter?: string;
  showHeader?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  globalFilter: '',
  showHeader: true
});

// Router
const router = useRouter();

// Stores
const corpStore = useCorporationStore();
const configurationsStore = useCostCodeConfigurationsStore();
const chartOfAccountsStore = useChartOfAccountsStore();
const toast = useToast();
const { hasPermission } = usePermissions();

// Table functionality
const {
  pagination,
  paginationOptions,
  pageSizeOptions,
  updatePageSize,
  getPaginationProps,
  getPageInfo,
  shouldShowPagination
} = useTableStandard();

// State
const showDeleteModal = ref(false);
const configToDelete = ref<any>(null);

// Table ref
const table = useTemplateRef<any>('table');

// Column pinning for sticky actions column
const columnPinning = ref({
  left: [],
  right: ['actions']
});

// Computed
const configurations = computed(() => configurationsStore.configurations);
const loading = computed(() => configurationsStore.loading);
const error = computed(() => configurationsStore.error);

const corporationNameByUuid = computed<Record<string, string>>(() => {
  const list = corpStore.corporations || []
  const map: Record<string, string> = {}
  list.forEach((corp: any) => { 
    if (corp?.uuid) {
      map[corp.uuid] = corp.corporation_name || corp.uuid
    }
  })
  return map
})

const filteredConfigurations = computed(() => {
  if (!props.globalFilter?.trim()) {
    return [...configurations.value];
  }

  const searchTerm = props.globalFilter.toLowerCase().trim();
  
  return [...configurations.value].filter(config => {
    const searchableFields = [
      config.cost_code_number || '',
      config.cost_code_name || '',
      config.description || ''
    ];
    return searchableFields.some(field => 
      field.toLowerCase().includes(searchTerm)
    );
  });
});

// Table columns
const columns: TableColumn<any>[] = [
  {
    accessorKey: 'corporation_uuid',
    header: 'Corporation',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const uuid = row.original.corporation_uuid
      const label = uuid ? (corporationNameByUuid.value[uuid] || uuid) : 'N/A'
      return h('div', label)
    }
  },
  {
    accessorKey: 'cost_code_number',
    header: 'Cost Code',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => h('div', { class: 'text-xs font-medium text-default' }, row.original.cost_code_number || '-')
  },
  {
    accessorKey: 'cost_code_name',
    header: 'Cost Code Name',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => h('div', { class: 'text-xs font-medium text-default' }, row.original.cost_code_name || '-')
  },
  {
    accessorKey: 'parent_cost_code_uuid',
    header: 'Sub Category of',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => {
      const parentCostCodeName = getParentCostCodeName(row.original.parent_cost_code_uuid);
      return h('div', { class: 'text-xs text-muted' }, parentCostCodeName || '-')
    }
  },
  {
    accessorKey: 'preferred_items',
    header: 'Items',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => {
      const itemCount = row.original.preferred_items?.length || 0;
      return h('div', { class: 'text-xs text-muted' }, itemCount > 0 ? `${itemCount} item${itemCount > 1 ? 's' : ''}` : 'No items')
    }
  },
  {
    accessorKey: 'description',
    header: 'Description',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => h('div', { class: 'text-xs text-muted max-w-xs truncate' }, row.original.description || '-')
  },
  {
    accessorKey: 'gl_account_uuid',
    header: 'GL Account',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => {
      const glAccountName = getGLAccountName(row.original.gl_account_uuid);
      return h('div', { class: 'text-xs text-muted max-w-xs truncate' }, glAccountName || '-')
    }
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
    meta: { class: { th: 'text-right sticky right-0 z-10 w-24', td: 'text-right sticky right-0 w-24' } },
    cell: ({ row }) => {
      const buttons = [];
      
      // Edit button - show if user has edit permission
      if (hasPermission('cost_codes_edit')) {
        buttons.push(
          h(UTooltip, { text: 'Edit Configuration' }, () => [
            h(UButton, {
              icon: 'tdesign:edit-filled',
              size: 'xs',
              variant: 'soft',
              color: 'secondary',
              class: 'hover:scale-105 transition-transform',
              onClick: () => editConfiguration(row.original)
            }, () => '')
          ])
        );
      }
      
      // Delete button - show if user has delete permission
      if (hasPermission('cost_codes_delete')) {
        buttons.push(
          h(UTooltip, { text: 'Delete Configuration' }, () => [
            h(UButton, {
              icon: 'mingcute:delete-fill',
              size: 'xs',
              variant: 'soft',
              color: 'error',
              class: 'hover:scale-105 transition-transform',
              onClick: () => deleteConfiguration(row.original)
            }, () => '')
          ])
        );
      }
      
      return h('div', { class: 'flex justify-end space-x-2' }, buttons);
    }
  }
];

// Helper function to get parent cost code name
const getParentCostCodeName = (parentCostCodeUuid: string | null | undefined) => {
  if (!parentCostCodeUuid) return '';
  const configuration = configurationsStore.configurations.find((c: any) => c.uuid === parentCostCodeUuid);
  return configuration ? configuration.cost_code_name : '';
};

// Helper function to get GL account name
const getGLAccountName = (glAccountUuid: string | null | undefined) => {
  if (!glAccountUuid) return '';
  const account = chartOfAccountsStore.accounts.find((a: any) => a.uuid === glAccountUuid);
  return account ? `${account.code} - ${account.account_name}` : '';
};

// Methods
const addNewConfiguration = () => {
  // Check for create permission
  if (!hasPermission('cost_codes_create')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to create cost code configurations. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  router.push('/cost-codes/form/new');
};

const editConfiguration = (config: any) => {
  // Check for edit permission
  if (!hasPermission('cost_codes_edit')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to edit cost code configurations. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  router.push(`/cost-codes/form/${config.uuid}`);
};

const deleteConfiguration = (config: any) => {
  // Check for delete permission
  if (!hasPermission('cost_codes_delete')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to delete cost code configurations. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  // Check if cost code has items attached
  const hasItems = config.preferred_items && config.preferred_items.length > 0;
  
  if (hasItems) {
    toast.add({
      title: 'Cannot Delete Cost Code',
      description: `This cost code has ${config.preferred_items.length} item(s) attached. Please reassign or remove all items before deleting the cost code.`,
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  configToDelete.value = config;
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  // Check for delete permission
  if (!hasPermission('cost_codes_delete')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to delete cost code configurations. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  if (!configToDelete.value) return;

  // Double-check: Ensure no items are attached before deletion
  const hasItems = configToDelete.value.preferred_items && configToDelete.value.preferred_items.length > 0;
  
  if (hasItems) {
    toast.add({
      title: 'Cannot Delete Cost Code',
      description: `This cost code has ${configToDelete.value.preferred_items.length} item(s) attached. Please reassign or remove all items before deleting the cost code.`,
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    showDeleteModal.value = false;
    configToDelete.value = null;
    return;
  }

  try {
    await configurationsStore.deleteConfiguration(configToDelete.value.uuid);
    
    toast.add({
      title: 'Success',
      description: 'Configuration deleted successfully',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    });
    
    showDeleteModal.value = false;
    configToDelete.value = null;
  } catch (error) {
    console.error('Error deleting configuration:', error);
    toast.add({
      title: 'Error',
      description: 'Failed to delete configuration',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
  }
};

const cancelDelete = () => {
  showDeleteModal.value = false;
  configToDelete.value = null;
};

// Watch for pagination changes
watch(() => pagination.value.pageSize, (newSize) => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageSize(newSize);
  }
});

watch(() => props.globalFilter, () => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageIndex(0);
  }
});

// Watch for corporation changes
watch(
  () => corpStore.selectedCorporation?.uuid,
  (uuid) => {
    if (uuid) {
      configurationsStore.fetchConfigurations(uuid);
      chartOfAccountsStore.fetchAccounts(uuid);
    }
  },
  { immediate: true }
);

// Initialize
onMounted(async () => {
  if (corpStore.selectedCorporation?.uuid) {
    await configurationsStore.fetchConfigurations(corpStore.selectedCorporation.uuid);
    chartOfAccountsStore.fetchAccounts(corpStore.selectedCorporation.uuid);
  }
});

// Refresh data when component becomes visible (e.g., after navigating back from edit)
onActivated(() => {
  if (corpStore.selectedCorporation?.uuid) {
    configurationsStore.fetchConfigurations(
      corpStore.selectedCorporation.uuid,
      true, // force refresh to get latest data from IndexedDB
      true  // use IndexedDB
    );
    chartOfAccountsStore.fetchAccounts(corpStore.selectedCorporation.uuid);
  }
});

// Expose method for parent component to trigger add
defineExpose({
  openAddModal: addNewConfiguration
});
</script>
