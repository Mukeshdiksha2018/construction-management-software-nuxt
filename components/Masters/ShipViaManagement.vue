<template>
  <div>
    <div class="flex justify-end items-center mb-4">
      <div class="mr-1">
        <UInput
          v-model="globalFilter"
          placeholder="Search ship via..."
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
        Add Ship Via
      </UButton>
    </div>

    <div v-if="store.loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-4 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-24" />
            </div>
            <div class="col-span-2 flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center justify-center">
              <USkeleton class="h-4 w-16" />
            </div>
          </div>
        </div>
        <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="i in 5" :key="i" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
            <div class="grid grid-cols-4 gap-4 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 border-gray-100 dark:border-gray-700">
              <div class="flex items-center">
                <USkeleton class="h-4 w-32" />
              </div>
              <div class="col-span-2 flex items-center">
                <USkeleton class="h-4 w-48" />
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

    <div v-else-if="filteredShipVia.length">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        v-model:column-pinning="columnPinning"
        :pagination-options="paginationOptions"
        :data="filteredShipVia" 
        :columns="columns"
        v-model:global-filter="globalFilter"
        class="max-h-[70vh] overflow-auto"
      />
      <div v-if="shouldShowPagination" class="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
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
        <UPagination 
          :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
          :items-per-page="table?.tableApi?.getState().pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length"
          @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
        />
        <div class="text-sm text-gray-600">
          Showing {{ (table?.tableApi?.getState().pagination.pageIndex || 0) * (table?.tableApi?.getState().pagination.pageSize || 10) + 1 }} to {{ Math.min(((table?.tableApi?.getState().pagination.pageIndex || 0) + 1) * (table?.tableApi?.getState().pagination.pageSize || 10), table?.tableApi?.getFilteredRowModel().rows.length || 0) }} of {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} ship via services
        </div>
      </div>
    </div>

    <p v-else class="text-gray-500 text-center py-12">No ship via services found.</p>

    <UModal 
      v-model:open="showModal" 
      :title="editingShipVia ? 'Edit Ship Via' : 'Add New Ship Via'"
      description="Configure ship via service details."
      :ui="{ 
        content: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-1rem)] max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] rounded-lg shadow-lg ring ring-default overflow-hidden',
        body: 'p-4 sm:p-6 max-h-[calc(100dvh-12rem)] overflow-y-auto'
      }"
      @update:open="closeModal"
    >
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ship Via <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="form.ship_via"
              variant="subtle"
              placeholder="Enter ship via method (e.g., FedEx, UPS, DHL)"
              size="md"
              class="w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <UTextarea
              v-model="form.description"
              variant="subtle"
              placeholder="Enter description"
              size="md"
              :rows="4"
              class="w-full"
            />
          </div>

          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <UToggle
                v-model="form.active"
                color="primary"
              />
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active
              </span>
            </label>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Toggle to enable or disable this ship via service</p>
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
            @click="saveShipVia"
            :loading="saving"
            :disabled="!isFormValid"
          >
            {{ editingShipVia ? 'Update' : 'Save' }} Ship Via
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showDeleteModal">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-base font-semibold text-red-600">Delete Ship Via</h3>
          <UButton icon="i-heroicons-x-mark" size="xs" variant="solid" color="neutral" @click="closeDeleteModal" />
        </div>
      </template>
      
      <template #body>
        <div class="space-y-4">
          <div class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p class="font-medium text-red-800 dark:text-red-200">Are you sure you want to delete this ship via service?</p>
              <p class="text-sm text-red-600 dark:text-red-300 mt-1">
                This action cannot be undone. The ship via service will be permanently removed.
              </p>
            </div>
          </div>
          
          <div v-if="shipViaToDelete" class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 class="font-medium text-gray-900 dark:text-white mb-2">Ship Via Details:</h4>
            <div class="space-y-1 text-sm">
              <div><span class="text-gray-600 dark:text-gray-400">Ship Via:</span> <span class="font-medium">{{ shipViaToDelete.ship_via }}</span></div>
              <div><span class="text-gray-600 dark:text-gray-400">Active:</span> <span class="font-medium">{{ shipViaToDelete.active ? 'Yes' : 'No' }}</span></div>
              <div v-if="shipViaToDelete.description" class="mt-2">
                <span class="text-gray-600 dark:text-gray-400">Description:</span>
                <div class="mt-1 p-2 bg-white dark:bg-gray-700 rounded border text-sm text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
                  {{ shipViaToDelete.description }}
                </div>
              </div>
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
            @click="confirmDeleteShipVia"
          >
            Delete Ship Via
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, h, resolveComponent, onMounted, useTemplateRef } from "vue";
import { getPaginationRowModel } from "@tanstack/vue-table";
import { useShipViaStore } from "@/stores/freight";
import type { TableColumn } from '@nuxt/ui'

const UButton = resolveComponent('UButton')
const UTable = resolveComponent('UTable')
const UPagination = resolveComponent('UPagination')
const UBadge = resolveComponent('UBadge')
const UTooltip = resolveComponent('UTooltip')
const UToggle = resolveComponent('UToggle')

const store = useShipViaStore();
const toast = useToast();

const showModal = ref(false);
const showDeleteModal = ref(false);
const editingShipVia = ref<any>(null);
const shipViaToDelete = ref<any>(null);
const saving = ref(false);
const isDeleting = ref(false);
const globalFilter = ref('');

const form = ref({
  ship_via: '',
  description: '',
  active: true
});

const pagination = ref({
  pageIndex: 0,
  pageSize: 10
});

const columnPinning = ref({
  left: [],
  right: ['actions']
});

const paginationOptions = ref({
  getPaginationRowModel: getPaginationRowModel()
});

const table = useTemplateRef<any>('table');

const filteredShipVia = computed(() => {
  const list = store.getAllShipVia;
  if (!globalFilter.value.trim()) return list;
  const search = globalFilter.value.toLowerCase().trim();
  return list.filter(item => [item.ship_via || '', item.description || '', item.active ? 'active' : 'inactive']
    .some(f => f.toLowerCase().includes(search)));
});

const shouldShowPagination = computed(() => filteredShipVia.value.length > 10);
const isFormValid = computed(() => form.value.ship_via.trim() !== '');

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'ship_via',
    header: 'Ship Via',
    enableSorting: false,
    meta: { style: { th: 'width: 25%; min-width: 200px;', td: 'width: 25%; min-width: 200px;' } },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-medium text-default' }, row.original.ship_via)
  },
  {
    accessorKey: 'description',
    header: 'Description',
    enableSorting: false,
    meta: { style: { th: 'width: 45%; max-width: 400px;', td: 'width: 45%; max-width: 400px;' } },
    cell: ({ row }: { row: { original: any } }) => {
      const description = row.original.description || '';
      if (description.length > 80) {
        return h(UTooltip, { text: description }, () => h('div', { class: 'text-default text-sm truncate cursor-help', style: 'max-width: 380px;' }, description));
      }
      return h('div', { class: 'text-default text-sm truncate', style: 'max-width: 380px;' }, description || '-');
    }
  },
  {
    accessorKey: 'active',
    header: 'Active',
    enableSorting: false,
    meta: { style: { th: 'width: 15%;', td: 'width: 15%;' } },
    cell: ({ row }: { row: { original: any } }) => {
      const active = row.original.active;
      return h(UBadge, { color: active ? 'success' : 'neutral', variant: 'soft', size: 'sm' }, () => active ? 'Active' : 'Inactive')
    }
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    enableSorting: false,
    enableHiding: false,
    meta: { style: { th: 'width: 15%; min-width: 120px;', td: 'width: 15%; min-width: 120px;' } },
    cell: ({ row }: { row: { original: any } }) => {
      const buttons = [] as any[];
      buttons.push(
        h(UTooltip, { text: 'Edit Ship Via' }, () => [
          h(UButton, { icon: 'tdesign:edit-filled', size: 'xs', color: 'secondary', variant: 'soft', onClick: () => editShipVia(row.original) })
        ])
      );
      buttons.push(
        h(UTooltip, { text: 'Delete Ship Via' }, () => [
          h(UButton, { icon: 'mingcute:delete-fill', size: 'xs', color: 'error', variant: 'soft', onClick: () => deleteShipVia(row.original) })
        ])
      );
      return h('div', { class: 'flex justify-end gap-1' }, buttons);
    }
  }
];

const openModal = () => { editingShipVia.value = null; resetForm(); showModal.value = true; };
const closeModal = () => { showModal.value = false; editingShipVia.value = null; resetForm(); };
const resetForm = () => { form.value = { ship_via: '', description: '', active: true }; };
const editShipVia = (item: any) => { editingShipVia.value = item; form.value = { ship_via: item.ship_via, description: item.description || '', active: item.active }; showModal.value = true; };

const saveShipVia = async () => {
  if (!isFormValid.value) { toast.add({ title: 'Validation Error', description: 'Please fill in all required fields', color: 'error' }); return; }
  saving.value = true;
  try {
    if (editingShipVia.value) {
      await store.updateShipVia(editingShipVia.value.uuid, { ship_via: form.value.ship_via, description: form.value.description || null, active: form.value.active });
      toast.add({ title: 'Success', description: 'Ship Via updated successfully', color: 'success' });
    } else {
      await store.createShipVia({ ship_via: form.value.ship_via, description: form.value.description || null, active: form.value.active });
      toast.add({ title: 'Success', description: 'Ship Via added successfully', color: 'success' });
    }
    closeModal();
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.message || 'Failed to save ship via', color: 'error' });
  } finally { saving.value = false; }
};

const deleteShipVia = (item: any) => { shipViaToDelete.value = item; showDeleteModal.value = true; };
const closeDeleteModal = () => { showDeleteModal.value = false; shipViaToDelete.value = null; isDeleting.value = false; };
const confirmDeleteShipVia = async () => {
  if (!shipViaToDelete.value) return;
  isDeleting.value = true;
  try { await store.deleteShipVia(shipViaToDelete.value.uuid); toast.add({ title: 'Success', description: 'Ship Via deleted successfully', color: 'success' }); closeDeleteModal(); }
  catch (error: any) { toast.add({ title: 'Error', description: error.message || 'Failed to delete ship via', color: 'error' }); }
  finally { isDeleting.value = false; }
};

const updatePageSize = (newSize: any) => { if (table.value?.tableApi) table.value.tableApi.setPageSize(newSize.value || newSize); };

watch(() => store.shipVia, () => {}, { deep: true });

onMounted(() => { store.fetchShipVia(); });
</script>
