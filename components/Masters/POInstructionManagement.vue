<template>
  <div>
    <div class="flex justify-end items-center mb-4">
      <div class="mr-1">
        <UInput
          v-model="globalFilter"
          placeholder="Search PO instructions..."
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
        Add PO Instruction
      </UButton>
    </div>

    <!-- PO Instructions Table -->
    <div v-if="poInstructionsStore.loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Table Header -->
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
        
        <!-- Table Body -->
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

    <div v-else-if="poInstructionsStore.error">
      <p class="text-red-500">Error: {{ poInstructionsStore.error }}</p>
    </div>

    <div v-else-if="filteredPOInstructions.length">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        v-model:column-pinning="columnPinning"
        :pagination-options="paginationOptions"
        :data="filteredPOInstructions" 
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
          Showing {{ (table?.tableApi?.getState().pagination.pageIndex || 0) * (table?.tableApi?.getState().pagination.pageSize || 10) + 1 }} to {{ Math.min(((table?.tableApi?.getState().pagination.pageIndex || 0) + 1) * (table?.tableApi?.getState().pagination.pageSize || 10), table?.tableApi?.getFilteredRowModel().rows.length || 0) }} of {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} PO instructions
        </div>
      </div>
    </div>

    <p v-else class="text-gray-500 text-center py-12">No PO instructions found.</p>

    <!-- PO Instruction Form Modal -->
    <UModal 
      v-model:open="showModal" 
      :title="editingPOInstruction ? 'Edit PO Instruction' : 'Add New PO Instruction'"
      description="Configure PO instruction details for your organization."
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

          <!-- PO Instruction Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              PO Instruction Name <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="form.po_instruction_name"
              variant="subtle"
              placeholder="Enter PO instruction name"
              size="md"
              class="w-full"
            />
          </div>

          <!-- Instruction -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Instruction <span class="text-red-500">*</span>
            </label>
            <UTextarea
              v-model="form.instruction"
              variant="subtle"
              placeholder="Enter detailed instruction"
              size="md"
              :rows="4"
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
            @click="savePOInstruction"
            :loading="saving"
            :disabled="!isFormValid"
          >
            {{ editingPOInstruction ? 'Update' : 'Save' }} PO Instruction
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-base font-semibold text-red-600">Delete PO Instruction</h3>
          <UButton icon="i-heroicons-x-mark" size="xs" variant="solid" color="neutral" @click="closeDeleteModal" />
        </div>
      </template>
      
      <template #body>
        <div class="space-y-4">
          <div class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p class="font-medium text-red-800 dark:text-red-200">Are you sure you want to delete this PO instruction?</p>
              <p class="text-sm text-red-600 dark:text-red-300 mt-1">
                This action cannot be undone. The PO instruction will be permanently removed.
              </p>
            </div>
          </div>
          
          <div v-if="poInstructionToDelete" class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 class="font-medium text-gray-900 dark:text-white mb-2">PO Instruction Details:</h4>
            <div class="space-y-1 text-sm">
              <div><span class="text-gray-600 dark:text-gray-400">Name:</span> <span class="font-medium">{{ poInstructionToDelete.po_instruction_name }}</span></div>
              <div><span class="text-gray-600 dark:text-gray-400">Status:</span> <span class="font-medium">{{ poInstructionToDelete.status }}</span></div>
              <div class="mt-2">
                <span class="text-gray-600 dark:text-gray-400">Instruction:</span>
                <div class="mt-1 p-2 bg-white dark:bg-gray-700 rounded border text-sm text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
                  {{ poInstructionToDelete.instruction }}
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
            @click="confirmDeletePOInstruction"
          >
            Delete PO Instruction
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, h, resolveComponent, onMounted, useTemplateRef } from "vue";
import { getPaginationRowModel } from "@tanstack/vue-table";
import { useCorporationStore } from "@/stores/corporations";
import { usePOInstructionsStore } from "@/stores/poInstructions";
import type { TableColumn } from '@nuxt/ui'

const UButton = resolveComponent('UButton')
const UTable = resolveComponent('UTable')
const UPagination = resolveComponent('UPagination')
const UBadge = resolveComponent('UBadge')
const UTooltip = resolveComponent('UTooltip')

const corpStore = useCorporationStore();
const poInstructionsStore = usePOInstructionsStore();
const toast = useToast();

const showModal = ref(false);
const showDeleteModal = ref(false);
const editingPOInstruction = ref<any>(null);
const poInstructionToDelete = ref<any>(null);
const saving = ref(false);
const isDeleting = ref(false);
const globalFilter = ref('');

// Form state
const form = ref({
  po_instruction_name: '',
  instruction: '',
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

// Computed property for filtered PO instructions based on global filter
const filteredPOInstructions = computed(() => {
  const corporationUuid = corpStore.selectedCorporationId;
  if (!corporationUuid) return [];

  const poInstructions = poInstructionsStore.getPOInstructionsByCorporation(corporationUuid);
  
  if (!globalFilter.value.trim()) {
    return poInstructions;
  }

  const searchTerm = globalFilter.value.toLowerCase().trim();
  
  return poInstructions.filter(poInstruction => {
    const searchableFields = [
      poInstruction.po_instruction_name || '',
      poInstruction.instruction || '',
      poInstruction.status || ''
    ];

    return searchableFields.some(field => 
      field.toLowerCase().includes(searchTerm)
    );
  });
});

// Computed property to determine if pagination should be shown
const shouldShowPagination = computed(() => {
  return filteredPOInstructions.value.length > 10;
});

// Get corporation name for display
const getCorporationName = computed(() => {
  return corpStore.selectedCorporation?.corporation_name || 'N/A';
});

// Form validation
const isFormValid = computed(() => {
  return form.value.po_instruction_name.trim() !== '' && 
         form.value.instruction.trim() !== '' &&
         (form.value.status === 'ACTIVE' || form.value.status === 'INACTIVE');
});

// Table columns configuration with custom widths
const columns: TableColumn<any>[] = [
  {
    accessorKey: 'po_instruction_name',
    header: 'PO Instruction Name',
    enableSorting: false,
    meta: { 
      style: {
        th: 'width: 25%; min-width: 200px;',
        td: 'width: 25%; min-width: 200px;'
      }
    },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-medium text-default' }, row.original.po_instruction_name)
  },
  {
    accessorKey: 'instruction',
    header: 'Instruction',
    enableSorting: false,
    meta: { 
      style: {
        th: 'width: 45%; max-width: 400px;',
        td: 'width: 45%; max-width: 400px;'
      }
    },
    cell: ({ row }: { row: { original: any } }) => {
      const instruction = row.original.instruction || '';
      // If instruction is longer than 80 characters, show with tooltip
      if (instruction.length > 80) {
        return h(UTooltip, {
          text: instruction
        }, () => h('div', { 
          class: 'text-default text-sm truncate cursor-help',
          style: 'max-width: 380px;'
        }, instruction));
      }
      return h('div', { 
        class: 'text-default text-sm truncate',
        style: 'max-width: 380px;'
      }, instruction);
    }
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
        h(UTooltip, { text: 'Edit PO Instruction' }, () => [
          h(UButton, {
            icon: 'tdesign:edit-filled',
            size: 'xs',
            color: 'secondary',
            variant: 'soft',
            onClick: () => editPOInstruction(row.original)
          })
        ])
      );
      
      // Delete button
      buttons.push(
        h(UTooltip, { text: 'Delete PO Instruction' }, () => [
          h(UButton, {
            icon: 'mingcute:delete-fill',
            size: 'xs',
            color: 'error',
            variant: 'soft',
            onClick: () => deletePOInstruction(row.original)
          })
        ])
      );
      
      return h('div', { class: 'flex justify-end gap-1' }, buttons);
    }
  }
];

// Open modal for adding new PO instruction
const openModal = () => {
  if (!corpStore.selectedCorporationId) {
    toast.add({
      title: 'No Corporation Selected',
      description: 'Please select a corporation first',
      color: 'error'
    });
    return;
  }
  editingPOInstruction.value = null;
  resetForm();
  showModal.value = true;
};

// Close modal
const closeModal = () => {
  showModal.value = false;
  editingPOInstruction.value = null;
  resetForm();
};

// Reset form
const resetForm = () => {
  form.value = {
    po_instruction_name: '',
    instruction: '',
    status: 'ACTIVE'
  };
};

// Edit PO instruction
const editPOInstruction = (poInstruction: any) => {
  editingPOInstruction.value = poInstruction;
  form.value = {
    po_instruction_name: poInstruction.po_instruction_name,
    instruction: poInstruction.instruction,
    status: poInstruction.status
  };
  showModal.value = true;
};

// Save PO instruction (add or update)
const savePOInstruction = async () => {
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
    if (editingPOInstruction.value) {
      // Update existing PO instruction
      await poInstructionsStore.updatePOInstruction(editingPOInstruction.value.uuid, {
        po_instruction_name: form.value.po_instruction_name,
        instruction: form.value.instruction,
        status: form.value.status as 'ACTIVE' | 'INACTIVE'
      });
      toast.add({
        title: 'Success',
        description: 'PO instruction updated successfully',
        color: 'success'
      });
    } else {
      // Add new PO instruction
      await poInstructionsStore.createPOInstruction(corpStore.selectedCorporationId, {
        corporation_uuid: corpStore.selectedCorporationId,
        po_instruction_name: form.value.po_instruction_name,
        instruction: form.value.instruction,
        status: form.value.status as 'ACTIVE' | 'INACTIVE'
      });
      toast.add({
        title: 'Success',
        description: 'PO instruction added successfully',
        color: 'success'
      });
    }
    closeModal();
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to save PO instruction',
      color: 'error'
    });
  } finally {
    saving.value = false;
  }
};

// Delete PO instruction
const deletePOInstruction = (poInstruction: any) => {
  poInstructionToDelete.value = poInstruction;
  showDeleteModal.value = true;
};

// Close delete modal
const closeDeleteModal = () => {
  showDeleteModal.value = false;
  poInstructionToDelete.value = null;
  isDeleting.value = false;
};

// Confirm delete PO instruction
const confirmDeletePOInstruction = async () => {
  if (!poInstructionToDelete.value) return;

  isDeleting.value = true;
  try {
    await poInstructionsStore.deletePOInstruction(poInstructionToDelete.value.uuid);
    toast.add({
      title: 'Success',
      description: 'PO instruction deleted successfully',
      color: 'success'
    });
    closeDeleteModal();
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to delete PO instruction',
      color: 'error'
    });
  } finally {
    isDeleting.value = false;
  }
};

// Update page size
const updatePageSize = (newSize: any) => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageSize(newSize.value || newSize);
  }
};

// Fetch PO instructions when corporation changes
watch(
  () => corpStore.selectedCorporationId,
  (newCorporationId) => {
    if (newCorporationId) {
      poInstructionsStore.fetchPOInstructions(newCorporationId);
    }
  },
  { immediate: true }
);

// Watch for changes in the store's poInstructions to ensure reactivity
watch(
  () => poInstructionsStore.poInstructions,
  () => {
    // Force reactivity update
  },
  { deep: true }
);

// Fetch PO instructions on mount
onMounted(() => {
  if (corpStore.selectedCorporationId) {
    poInstructionsStore.fetchPOInstructions(corpStore.selectedCorporationId);
  }
});
</script>
