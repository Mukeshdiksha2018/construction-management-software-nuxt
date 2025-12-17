<template>
  <div>
    <div class="flex justify-end items-center mb-4">
      <div class="mr-1">
        <UInput
          v-model="globalFilter"
          placeholder="Search UOM..."
          icon="i-heroicons-magnifying-glass"
          variant="subtle"
          size="xs"
        />
      </div>
      <UButton
        icon="material-symbols:add-rounded"
        size="xs"
        color="primary"
        variant="solid"
        @click="openModal"
      >
        Add UOM
      </UButton>
    </div>

    <div v-if="store.loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Table Header -->
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-4 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
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
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center justify-center">
              <USkeleton class="h-4 w-16" />
            </div>
          </div>
        </div>
        
        <!-- Table Body -->
        <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="i in 5" :key="i" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
            <div class="grid grid-cols-4 gap-4 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 border-gray-100 dark:border-gray-700">
              <div class="flex items-center">
                <USkeleton class="h-4 w-32" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-16" />
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

    <div v-else-if="store.error">
      <p class="text-red-500">Error: {{ store.error }}</p>
    </div>

    <div v-else-if="filteredUOM.length">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        v-model:column-pinning="columnPinning"
        :pagination-options="paginationOptions"
        :data="filteredUOM" 
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
          :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
          :items-per-page="table?.tableApi?.getState().pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length"
          @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
        />
        
        <!-- Page Info -->
        <div class="text-sm text-gray-600">
          Showing {{ (table?.tableApi?.getState().pagination.pageIndex || 0) * (table?.tableApi?.getState().pagination.pageSize || 10) + 1 }} to {{ Math.min(((table?.tableApi?.getState().pagination.pageIndex || 0) + 1) * (table?.tableApi?.getState().pagination.pageSize || 10), table?.tableApi?.getFilteredRowModel().rows.length || 0) }} of {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} UOM
        </div>
      </div>
    </div>

    <p v-else class="text-gray-500 text-center py-12">No UOM found.</p>

    <!-- UOM Form Modal -->
    <UModal 
      v-model:open="showModal" 
      :title="editingUOM ? 'Edit UOM' : 'Add New UOM'"
      description="Configure UOM details for your organization."
      :ui="{ 
        content: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-1rem)] max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] rounded-lg shadow-lg ring ring-default overflow-hidden',
        body: 'p-4 sm:p-6 max-h-[calc(100dvh-12rem)] overflow-y-auto'
      }"
      @update:open="closeModal"
    >
      <template #body>
        <div class="space-y-4">
          <!-- UOM Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              UOM Name <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="form.uom_name"
              variant="subtle"
              placeholder="Enter UOM name (e.g., Kilogram, Meter)"
              size="md"
              class="w-full"
            />
          </div>

          <!-- Short Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Short Name <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="form.short_name"
              variant="subtle"
              placeholder="Enter short name (e.g., KG, M)"
              size="md"
              class="w-full"
            />
          </div>

          <!-- Status -->
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
      </template>
      
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="closeModal">
            Cancel
          </UButton>
          <UButton 
            color="primary" 
            @click="saveUOM"
            :loading="saving"
            :disabled="!isFormValid"
          >
            {{ editingUOM ? 'Update' : 'Save' }} UOM
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-base font-semibold text-red-600">Delete UOM</h3>
          <UButton icon="i-heroicons-x-mark" size="xs" variant="solid" color="neutral" @click="closeDeleteModal" />
        </div>
      </template>
      
      <template #body>
        <div class="space-y-4">
          <div class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p class="font-medium text-red-800 dark:text-red-200">Are you sure you want to delete this UOM?</p>
              <p class="text-sm text-red-600 dark:text-red-300 mt-1">
                This action cannot be undone. The UOM will be permanently removed.
              </p>
            </div>
          </div>
          
          <div v-if="uomToDelete" class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 class="font-medium text-gray-900 dark:text-white mb-2">UOM Details:</h4>
            <div class="space-y-1 text-sm">
              <div><span class="text-gray-600 dark:text-gray-400">Name:</span> <span class="font-medium">{{ uomToDelete.uom_name }}</span></div>
              <div><span class="text-gray-600 dark:text-gray-400">Short Name:</span> <span class="font-medium">{{ uomToDelete.short_name }}</span></div>
              <div><span class="text-gray-600 dark:text-gray-400">Status:</span> <span class="font-medium">{{ uomToDelete.status }}</span></div>
            </div>
          </div>
          
        </div>
      </template>
      
      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton variant="solid" color="neutral" @click="closeDeleteModal">Cancel</UButton>
          <UButton 
            variant="solid" 
            color="error" 
            :loading="isDeleting"
            @click="confirmDeleteUOM"
          >
            Delete UOM
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, h, resolveComponent, onMounted, useTemplateRef } from "vue";
import { getPaginationRowModel } from "@tanstack/vue-table";
import { useUOMStore } from "@/stores/uom";
import type { TableColumn } from '@nuxt/ui'

const UButton = resolveComponent('UButton')
const UTable = resolveComponent('UTable')
const UPagination = resolveComponent('UPagination')
const UBadge = resolveComponent('UBadge')
const UTooltip = resolveComponent('UTooltip')

const store = useUOMStore();
const toast = useToast();

const showModal = ref(false);
const showDeleteModal = ref(false);
const editingUOM = ref<any>(null);
const uomToDelete = ref<any>(null);
const saving = ref(false);
const isDeleting = ref(false);
const globalFilter = ref('');

// Form state
const form = ref({
  uom_name: '',
  short_name: '',
  status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
});

// Status options
const statusOptions = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' }
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

const filteredUOM = computed(() => {
  const list = store.uom;
  if (!globalFilter.value.trim()) return list;
  const search = globalFilter.value.toLowerCase().trim();
  return list.filter(item => [item.uom_name || '', item.short_name || '', item.status || '']
    .some(f => f.toLowerCase().includes(search)));
});

const shouldShowPagination = computed(() => filteredUOM.value.length > 10);
const isFormValid = computed(() => form.value.uom_name.trim() !== '' && form.value.short_name.trim() !== '');

// Table columns configuration with custom widths
const columns: TableColumn<any>[] = [
  {
    accessorKey: 'uom_name',
    header: 'UOM Name',
    enableSorting: false,
    meta: { 
      style: {
        th: 'width: 35%; min-width: 200px;',
        td: 'width: 35%; min-width: 200px;'
      }
    },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-medium text-default' }, row.original.uom_name)
  },
  {
    accessorKey: 'short_name',
    header: 'Short Name',
    enableSorting: false,
    meta: { 
      style: {
        th: 'width: 25%; min-width: 120px;',
        td: 'width: 25%; min-width: 120px;'
      }
    },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'text-default text-sm' }, row.original.short_name)
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: false,
    meta: { 
      style: {
        th: 'width: 15%;',
        td: 'width: 15%;'
      }
    },
    cell: ({ row }: { row: { original: any } }) => {
      const status = row.original.status;
      return h(UBadge, { 
        color: status === 'ACTIVE' ? 'success' : 'neutral',
        variant: 'soft',
        size: 'sm'
      }, () => status === 'ACTIVE' ? 'Active' : 'Inactive')
    }
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    enableSorting: false,
    enableHiding: false,
    meta: { 
      class: {
        th: 'text-right sticky right-0 z-10 w-24',
        td: 'text-right sticky right-0 w-24'
      }
    },
    cell: ({ row }: { row: { original: any } }) => {
      const buttons = [];
      
      // Edit button
      buttons.push(
        h(UTooltip, { text: 'Edit UOM' }, () => [
          h(UButton, {
            icon: 'tdesign:edit-filled',
            size: 'xs',
            color: 'secondary',
            variant: 'soft',
            onClick: () => editUOM(row.original)
          })
        ])
      );
      
      // Delete button
      buttons.push(
        h(UTooltip, { text: 'Delete UOM' }, () => [
          h(UButton, {
            icon: 'mingcute:delete-fill',
            size: 'xs',
            color: 'error',
            variant: 'soft',
            onClick: () => deleteUOM(row.original)
          })
        ])
      );
      
      return h('div', { class: 'flex justify-end gap-1' }, buttons);
    }
  }
];

// Open modal for adding new UOM
const openModal = () => {
  editingUOM.value = null;
  resetForm();
  showModal.value = true;
};

// Close modal
const closeModal = () => {
  showModal.value = false;
  editingUOM.value = null;
  resetForm();
};

// Reset form
const resetForm = () => {
  form.value = {
    uom_name: '',
    short_name: '',
    status: 'ACTIVE'
  };
};

// Edit UOM
const editUOM = (uom: any) => {
  editingUOM.value = uom;
  form.value = {
    uom_name: uom.uom_name,
    short_name: uom.short_name,
    status: uom.status
  };
  showModal.value = true;
};

// Save UOM (add or update)
const saveUOM = async () => {
  if (!isFormValid.value) {
    toast.add({
      title: 'Validation Error',
      description: 'Please fill in all required fields',
      color: 'error'
    });
    return;
  }

  saving.value = true;
  try {
    if (editingUOM.value) {
      await store.updateUOM(editingUOM.value.uuid, {
        uom_name: form.value.uom_name,
        short_name: form.value.short_name,
        status: form.value.status as 'ACTIVE' | 'INACTIVE'
      });
      toast.add({ title: 'Success', description: 'UOM updated successfully', color: 'success' });
    } else {
      await store.createUOM(null, {
        corporation_uuid: null,
        uom_name: form.value.uom_name,
        short_name: form.value.short_name,
        status: form.value.status as 'ACTIVE' | 'INACTIVE'
      });
      toast.add({ title: 'Success', description: 'UOM added successfully', color: 'success' });
    }
    closeModal();
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to save UOM',
      color: 'error'
    });
  } finally {
    saving.value = false;
  }
};

const deleteUOM = (item: any) => { uomToDelete.value = item; showDeleteModal.value = true; };

// Close delete modal
const closeDeleteModal = () => {
  showDeleteModal.value = false;
  uomToDelete.value = null;
  isDeleting.value = false;
};

const confirmDeleteUOM = async () => {
  if (!uomToDelete.value) return;
  isDeleting.value = true;
  try { await store.deleteUOM(uomToDelete.value.uuid); toast.add({ title: 'Success', description: 'UOM deleted successfully', color: 'success' }); closeDeleteModal(); }
  catch (error: any) { toast.add({ title: 'Error', description: error.message || 'Failed to delete UOM', color: 'error' }); }
  finally { isDeleting.value = false; }
};

const updatePageSize = (newSize: any) => { if (table.value?.tableApi) table.value.tableApi.setPageSize(newSize.value || newSize); };

watch(() => store.uom, () => {}, { deep: true });

onMounted(() => { store.fetchUOM(); });
</script>
