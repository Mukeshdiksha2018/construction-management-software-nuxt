<template>
  <div>
    <div class="flex justify-end items-center mb-4">
      <div class="mr-1">
        <UInput
          v-model="globalFilter"
          placeholder="Search approval checks..."
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
        Add Approval Check
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

    <div v-else-if="filteredApprovalChecks.length">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        v-model:column-pinning="columnPinning"
        :pagination-options="paginationOptions"
        :data="filteredApprovalChecks" 
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
          Showing {{ (table?.tableApi?.getState().pagination.pageIndex || 0) * (table?.tableApi?.getState().pagination.pageSize || 10) + 1 }} to {{ Math.min(((table?.tableApi?.getState().pagination.pageIndex || 0) + 1) * (table?.tableApi?.getState().pagination.pageSize || 10), table?.tableApi?.getFilteredRowModel().rows.length || 0) }} of {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} approval checks
        </div>
      </div>
    </div>

    <p v-else class="text-gray-500 text-center py-12">No approval checks found.</p>

    <UModal 
      v-model:open="showModal" 
      :title="editingApprovalCheck ? 'Edit Approval Check' : 'Add New Approval Check'"
      description="Configure approval check details."
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
              Approval Check <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="form.approval_check"
              variant="subtle"
              placeholder="Enter approval check name"
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
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Toggle to enable or disable this approval check</p>
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
            @click="saveApprovalCheck"
            :loading="saving"
            :disabled="!isFormValid"
          >
            {{ editingApprovalCheck ? 'Update' : 'Save' }} Approval Check
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showDeleteModal">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-base font-semibold text-red-600">Delete Approval Check</h3>
          <UButton icon="i-heroicons-x-mark" size="xs" variant="solid" color="neutral" @click="closeDeleteModal" />
        </div>
      </template>
      
      <template #body>
        <div class="space-y-4">
          <div class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p class="font-medium text-red-800 dark:text-red-200">Are you sure you want to delete this approval check?</p>
              <p class="text-sm text-red-600 dark:text-red-300 mt-1">
                This action cannot be undone. The approval check will be permanently removed.
              </p>
            </div>
          </div>
          
          <div v-if="approvalCheckToDelete" class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 class="font-medium text-gray-900 dark:text-white mb-2">Approval Check Details:</h4>
            <div class="space-y-1 text-sm">
              <div><span class="text-gray-600 dark:text-gray-400">Approval Check:</span> <span class="font-medium">{{ approvalCheckToDelete.approval_check }}</span></div>
              <div><span class="text-gray-600 dark:text-gray-400">Active:</span> <span class="font-medium">{{ approvalCheckToDelete.active ? 'Yes' : 'No' }}</span></div>
              <div v-if="approvalCheckToDelete.description" class="mt-2">
                <span class="text-gray-600 dark:text-gray-400">Description:</span>
                <div class="mt-1 p-2 bg-white dark:bg-gray-700 rounded border text-sm text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
                  {{ approvalCheckToDelete.description }}
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
            @click="confirmDeleteApprovalCheck"
          >
            Delete Approval Check
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, h, resolveComponent, onMounted, useTemplateRef } from "vue";
import { getPaginationRowModel } from "@tanstack/vue-table";
import { useApprovalChecksStore } from "@/stores/approvalChecks";
import type { TableColumn } from '@nuxt/ui'

const UButton = resolveComponent('UButton')
const UTable = resolveComponent('UTable')
const UPagination = resolveComponent('UPagination')
const UBadge = resolveComponent('UBadge')
const UTooltip = resolveComponent('UTooltip')
const UToggle = resolveComponent('UToggle')

const store = useApprovalChecksStore();
const toast = useToast();

const showModal = ref(false);
const showDeleteModal = ref(false);
const editingApprovalCheck = ref<any>(null);
const approvalCheckToDelete = ref<any>(null);
const saving = ref(false);
const isDeleting = ref(false);
const globalFilter = ref('');

const form = ref({
  approval_check: '',
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

const filteredApprovalChecks = computed(() => {
  const list = store.getAllApprovalChecks;
  if (!globalFilter.value.trim()) return list;
  const search = globalFilter.value.toLowerCase().trim();
  return list.filter(item => [item.approval_check || '', item.description || '', item.active ? 'active' : 'inactive']
    .some(f => f.toLowerCase().includes(search)));
});

const shouldShowPagination = computed(() => filteredApprovalChecks.value.length > 10);
const isFormValid = computed(() => form.value.approval_check.trim() !== '');

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'approval_check',
    header: 'Approval Check',
    enableSorting: false,
    meta: { style: { th: 'width: 25%; min-width: 200px;', td: 'width: 25%; min-width: 200px;' } },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-medium text-default' }, row.original.approval_check)
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
        h(UTooltip, { text: 'Edit Approval Check' }, () => [
          h(UButton, { icon: 'tdesign:edit-filled', size: 'xs', color: 'secondary', variant: 'soft', onClick: () => editApprovalCheck(row.original) })
        ])
      );
      buttons.push(
        h(UTooltip, { text: 'Delete Approval Check' }, () => [
          h(UButton, { icon: 'mingcute:delete-fill', size: 'xs', color: 'error', variant: 'soft', onClick: () => deleteApprovalCheck(row.original) })
        ])
      );
      return h('div', { class: 'flex justify-end gap-1' }, buttons);
    }
  }
];

const openModal = () => { editingApprovalCheck.value = null; resetForm(); showModal.value = true; };
const closeModal = () => { showModal.value = false; editingApprovalCheck.value = null; resetForm(); };
const resetForm = () => { form.value = { approval_check: '', description: '', active: true }; };
const editApprovalCheck = (item: any) => { editingApprovalCheck.value = item; form.value = { approval_check: item.approval_check, description: item.description || '', active: item.active }; showModal.value = true; };

const saveApprovalCheck = async () => {
  if (!isFormValid.value) { toast.add({ title: 'Validation Error', description: 'Please fill in all required fields', color: 'error' }); return; }
  saving.value = true;
  try {
    if (editingApprovalCheck.value) {
      await store.updateApprovalCheck(editingApprovalCheck.value.uuid, { approval_check: form.value.approval_check, description: form.value.description || null, active: form.value.active });
      toast.add({ title: 'Success', description: 'Approval Check updated successfully', color: 'success' });
    } else {
      await store.createApprovalCheck({ approval_check: form.value.approval_check, description: form.value.description || null, active: form.value.active });
      toast.add({ title: 'Success', description: 'Approval Check added successfully', color: 'success' });
    }
    closeModal();
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.message || 'Failed to save approval check', color: 'error' });
  } finally { saving.value = false; }
};

const deleteApprovalCheck = (item: any) => { approvalCheckToDelete.value = item; showDeleteModal.value = true; };
const closeDeleteModal = () => { showDeleteModal.value = false; approvalCheckToDelete.value = null; isDeleting.value = false; };
const confirmDeleteApprovalCheck = async () => {
  if (!approvalCheckToDelete.value) return;
  isDeleting.value = true;
  try { await store.deleteApprovalCheck(approvalCheckToDelete.value.uuid); toast.add({ title: 'Success', description: 'Approval Check deleted successfully', color: 'success' }); closeDeleteModal(); }
  catch (error: any) { toast.add({ title: 'Error', description: error.message || 'Failed to delete approval check', color: 'error' }); }
  finally { isDeleting.value = false; }
};

const updatePageSize = (newSize: any) => { if (table.value?.tableApi) table.value.tableApi.setPageSize(newSize.value || newSize); };

watch(() => store.approvalChecks, () => {}, { deep: true });

onMounted(() => { store.fetchApprovalChecks(); });
</script>

