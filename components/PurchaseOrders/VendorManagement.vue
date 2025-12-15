<template>
  <div>
    <div v-if="corpStore.selectedCorporation" class="flex justify-end items-center mb-4">
      <div class="flex-1 max-w-sm mr-2">
        <UInput
          v-model="globalFilter"
          placeholder="Search vendors..."
          icon="i-heroicons-magnifying-glass"
          variant="subtle"
          size="xs"
          class="w-full"
        />
      </div>
      <UButton
        icon="material-symbols:add-rounded"
        size="xs"
        color="primary"
        variant="solid"
        @click="openModal"
      >
        Add Vendor
      </UButton>
    </div>

    <div v-else class="text-gray-500">No corporation selected.</div>

    <!-- Vendor Table -->
    <div v-if="vendorStore.loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Table Header -->
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-8 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
            <!-- Vendor Name Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <!-- Company Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <!-- Type Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-12" />
            </div>
            <!-- Address Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <!-- Phone Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-12" />
            </div>
            <!-- Email Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-12" />
            </div>
            <!-- 1099 Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-8" />
            </div>
            <!-- Actions Column -->
            <div class="flex items-center justify-center">
              <USkeleton class="h-4 w-16" />
            </div>
          </div>
        </div>
        
        <!-- Table Body -->
        <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="i in 8" :key="i" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
            <div class="grid grid-cols-8 gap-4 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 border-gray-100 dark:border-gray-700">
              <!-- Vendor Name Cell -->
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <!-- Company Cell -->
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <!-- Type Cell -->
              <div class="flex items-center">
                <USkeleton class="h-5 w-16 rounded-full" />
              </div>
              <!-- Address Cell -->
              <div class="flex items-center">
                <USkeleton class="h-4 w-32" />
              </div>
              <!-- Phone Cell -->
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <!-- Email Cell -->
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <!-- 1099 Cell -->
              <div class="flex items-center">
                <USkeleton class="h-5 w-12 rounded-full" />
              </div>
              <!-- Actions Cell -->
              <div class="flex items-center justify-end gap-1">
                <USkeleton class="h-6 w-6 rounded" />
                <USkeleton class="h-6 w-6 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="vendorStore.error">
      <p class="text-red-500">Error: {{ vendorStore.error }}</p>
    </div>

    <div v-else-if="vendorStore.vendors.length">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        v-model:column-pinning="columnPinning"
        :pagination-options="paginationOptions"
        :data="filteredVendors" 
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
          Showing {{ (table?.tableApi?.getState().pagination.pageIndex || 0) * (table?.tableApi?.getState().pagination.pageSize || 10) + 1 }} to {{ Math.min(((table?.tableApi?.getState().pagination.pageIndex || 0) + 1) * (table?.tableApi?.getState().pagination.pageSize || 10), table?.tableApi?.getFilteredRowModel().rows.length || 0) }} of {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} vendors
        </div>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <p class="text-gray-500 text-lg font-medium">No vendors found</p>
      <p class="text-gray-400 text-sm">Get started by adding your first vendor</p>
    </div>

    <!-- Vendor Form Component -->
    <VendorForm 
      v-model="showModal" 
      :vendor="editingVendor"
      @vendor-saved="handleVendorSaved"
    />

    <!-- Delete Confirmation Modal -->
    <UModal 
      v-model:open="showDeleteModal"
      title="Delete Vendor"
      description="This action cannot be undone. The vendor will be permanently removed."
    >
      <template #body>
        <p class="text-gray-700">Are you sure you want to delete this vendor? This action cannot be undone.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="soft" @click="showDeleteModal = false">
            Cancel
          </UButton>
          <UButton 
            color="error" 
            @click="confirmDelete"
            :loading="deleting"
          >
            Delete Vendor
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, h, resolveComponent, onMounted, useTemplateRef } from "vue";
import { getPaginationRowModel } from "@tanstack/vue-table";
import { useVendorStore } from "@/stores/vendors";
import { useCorporationStore } from "@/stores/corporations";
import type { TableColumn } from '@nuxt/ui'
import VendorForm from './VendorForm.vue';

const UButton = resolveComponent('UButton')
const UTable = resolveComponent('UTable')
const UPagination = resolveComponent('UPagination')

const vendorStore = useVendorStore();
const corpStore = useCorporationStore();
const toast = useToast();

const showModal = ref(false);
const showDeleteModal = ref(false);
const editingVendor = ref<any>(null);
const vendorToDelete = ref<number | null>(null);
const deleting = ref(false);
const globalFilter = ref('');

// Pagination state for TanStack Table
const pagination = ref({
  pageIndex: 0,
  pageSize: 10
});

// Column pinning state
const columnPinning = ref({
  left: ['vendor_name'],
  right: ['actions']
});

// Pagination options for TanStack Table
const paginationOptions = ref({
  getPaginationRowModel: getPaginationRowModel()
});

// Table ref for accessing table API
const table = useTemplateRef<any>('table');

// Computed property for filtered vendors based on global filter
const filteredVendors = computed(() => {
  if (!globalFilter.value.trim()) {
    return vendorStore.vendors;
  }

  const searchTerm = globalFilter.value.toLowerCase().trim();
  
  return vendorStore.vendors.filter(vendor => {
    // Search across all relevant fields
    const searchableFields = [
      vendor.vendor_name || '',
      vendor.vendor_type || '',
      vendor.vendor_address || '',
      (vendor as any).vendor_city || '',
      (vendor as any).vendor_state || '',
      (vendor as any).vendor_country || '',
      (vendor as any).vendor_zip || '',
      vendor.vendor_phone || '',
      vendor.vendor_email || '',
      (vendor as any).vendor_federal_id || '',
      (vendor as any).vendor_ssn || '',
      (vendor as any).company_name || '',
      (vendor as any).check_printed_as || '',
      (vendor as any).doing_business_as || '',
      (vendor as any).first_name || '',
      (vendor as any).last_name || ''
    ];

    // Check if any field contains the search term
    return searchableFields.some(field => 
      field.toLowerCase().includes(searchTerm)
    );
  });
});

// Computed property to determine if pagination should be shown
const shouldShowPagination = computed(() => {
  return filteredVendors.value.length > 10;
});

// Loading data for skeleton state
const loadingData = ref([
  {
    id: 1,
    uuid: '1',
    vendor_name: '',
    vendor_type: '',
    vendor_address: '',
    vendor_city: '',
    vendor_state: '',
    vendor_country: '',
    vendor_zip: '',
    vendor_phone: '',
    vendor_email: '',
    is_1099: false,
    vendor_federal_id: '',
    vendor_ssn: '',
    company_name: '',
    check_printed_as: '',
    doing_business_as: '',
    salutation: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    opening_balance: 0,
    opening_balance_date: ''
  },
  {
    id: 2,
    uuid: '2',
    vendor_name: '',
    vendor_type: '',
    vendor_address: '',
    vendor_city: '',
    vendor_state: '',
    vendor_country: '',
    vendor_zip: '',
    vendor_phone: '',
    vendor_email: '',
    is_1099: false,
    vendor_federal_id: '',
    vendor_ssn: '',
    company_name: '',
    check_printed_as: '',
    doing_business_as: '',
    salutation: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    opening_balance: 0,
    opening_balance_date: ''
  },
  {
    id: 3,
    uuid: '3',
    vendor_name: '',
    vendor_type: '',
    vendor_address: '',
    vendor_city: '',
    vendor_state: '',
    vendor_country: '',
    vendor_zip: '',
    vendor_phone: '',
    vendor_email: '',
    is_1099: false,
    vendor_federal_id: '',
    vendor_ssn: '',
    company_name: '',
    check_printed_as: '',
    doing_business_as: '',
    salutation: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    opening_balance: 0,
    opening_balance_date: ''
  }
]);

// Table columns configuration
const columns: TableColumn<any>[] = [
  {
    accessorKey: 'vendor_name',
    header: 'Vendor Name',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-medium text-default' }, row.original.vendor_name)
  },
  {
    accessorKey: 'company_name',
    header: 'Company',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-medium text-default' }, (row.original as any).company_name || 'N/A')
  },
  {
    accessorKey: 'vendor_type',
    header: 'Type',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('span', { 
      class: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800' 
    }, row.original.vendor_type)
  },
  {
    accessorKey: 'vendor_address',
    header: 'Address',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const address = row.original.vendor_address;
      const city = (row.original as any).vendor_city;
      const state = (row.original as any).vendor_state;
      const zip = (row.original as any).vendor_zip;
      
      const fullAddress = [address, city, state, zip].filter(Boolean).join(', ');
      return h('div', { class: 'text-muted max-w-xs truncate' }, fullAddress || 'N/A');
    }
  },
  {
    accessorKey: 'vendor_phone',
    header: 'Phone',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'text-muted font-mono' }, row.original.vendor_phone)
  },
  {
    accessorKey: 'vendor_email',
    header: 'Email',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'text-muted max-w-xs truncate' }, row.original.vendor_email)
  },
  {
    accessorKey: 'is_1099',
    header: '1099',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const is1099 = (row.original as any).is_1099;
      return h('span', { 
        class: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          is1099 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }` 
      }, is1099 ? 'Yes' : 'No');
    }
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    enableSorting: false,
    meta: { class: { th: 'text-right sticky right-0 bg-transparent z-10', td: 'text-right sticky right-0 bg-transparent' } },
    cell: ({ row }: { row: { original: any } }) => {
      return h('div', { class: 'flex justify-end space-x-2' }, [
        h(UButton, {
          icon: 'tdesign:edit-filled',
          size: 'xs',
          variant: 'soft',
          color: 'secondary',
          class: 'hover:scale-105 transition-transform',
          onClick: () => editVendor(row.original)
        }, () => ''),
        h(UButton, {
          icon: 'mingcute:delete-fill',
          size: 'xs',
          variant: 'soft',
          color: 'error',
          class: 'hover:scale-105 transition-transform',
          onClick: () => handleDeleteVendor(row.original.id)
        }, () => '')
      ])
    }
  }
];

// Skeleton columns for loading state
const skeletonColumns: TableColumn<any>[] = [
  {
    accessorKey: 'vendor_name',
    header: 'Vendor Name',
    cell: () => h('div', { class: 'flex items-center gap-3' }, [
      h('div', { class: 'h-4 w-4 rounded-full bg-gray-200' }),
      h('div', { class: 'h-4 w-32 bg-gray-200 rounded' })
    ])
  },
  {
    accessorKey: 'company_name',
    header: 'Company',
    cell: () => h('div', { class: 'h-4 w-24 bg-gray-200 rounded' })
  },
  {
    accessorKey: 'vendor_type',
    header: 'Type',
    cell: () => h('div', { class: 'h-4 w-20 bg-gray-200 rounded' })
  },
  {
    accessorKey: 'vendor_address',
    header: 'Address',
    cell: () => h('div', { class: 'space-y-2' }, [
      h('div', { class: 'h-4 w-40 bg-gray-200 rounded' }),
      h('div', { class: 'h-3 w-32 bg-gray-200 rounded' })
    ])
  },
  {
    accessorKey: 'vendor_phone',
    header: 'Phone',
    cell: () => h('div', { class: 'h-4 w-24 bg-gray-200 rounded' })
  },
  {
    accessorKey: 'vendor_email',
    header: 'Email',
    cell: () => h('div', { class: 'space-y-2' }, [
      h('div', { class: 'h-4 w-36 bg-gray-200 rounded' }),
      h('div', { class: 'h-3 w-28 bg-gray-200 rounded' })
    ])
  },
  {
    accessorKey: 'is_1099',
    header: '1099',
    cell: () => h('div', { class: 'h-4 w-12 bg-gray-200 rounded' })
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    cell: () => h('div', { class: 'flex justify-end space-x-2' }, [
      h('div', { class: 'h-8 w-16 bg-gray-200 rounded' }),
      h('div', { class: 'h-8 w-16 bg-gray-200 rounded' })
    ])
  }
];

const getCorporationName = computed(() => {
  return (
    corpStore.selectedCorporation?.corporation_name || "Unnamed Corporation"
  );
});

// Function to update page size in TanStack Table
function updatePageSize() {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageSize(pagination.value.pageSize);
  }
}
// Load vendors when corporation changes
watch(
  () => corpStore.selectedCorporation?.uuid,
  (uuid) => {
    if (uuid && process.client) {
      vendorStore.fetchVendors(uuid);
    }
  },
  { immediate: true }
);

// Initialize when component mounts
onMounted(async () => {
  if (process.client) {
    // Ensure the corporation store is ready
    await corpStore.ensureReady();
    
    if (corpStore.selectedCorporation?.uuid) {
      vendorStore.fetchVendors(corpStore.selectedCorporation.uuid);
    }
  }
});

// Watchers to sync pagination with TanStack Table
watch(() => pagination.value.pageSize, (newSize) => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageSize(newSize);
  }
});

watch(globalFilter, () => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageIndex(0); // Reset to first page when filter changes
  }
});

function openModal() {
  // Ensure corporation is selected before opening modal
  if (!corpStore.selectedCorporation?.uuid) {
    toast.add({
      title: 'Error',
      description: 'Please select a corporation first before adding vendors.',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  editingVendor.value = null;
  showModal.value = true;
}

function handleVendorSaved() {
  // Refresh the vendors list after saving - force API refresh to get latest data
  if (corpStore.selectedCorporation?.uuid) {
    vendorStore.refreshVendorsFromAPI(corpStore.selectedCorporation.uuid);
  }
}

function editVendor(vendor: any) {
  // Ensure corporation is selected before editing
  if (!corpStore.selectedCorporation?.uuid) {
    toast.add({
      title: 'Error',
      description: 'Please select a corporation first before editing vendors.',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  editingVendor.value = vendor;
  showModal.value = true;
}

async function handleDeleteVendor(id: number) {
  // Validate that we have a valid ID
  if (!id || isNaN(id)) {
    toast.add({
      title: 'Error',
      description: 'Invalid vendor ID',
      icon: 'i-heroicons-exclamation-triangle',

    });
    return;
  }

  // Find the vendor to confirm it exists
  const vendor = vendorStore.vendors.find(v => v.id === id);
  if (!vendor) {
    toast.add({
      title: 'Error',
      description: 'Vendor not found',
      icon: 'i-heroicons-exclamation-triangle',

    });
    return;
  }

  showDeleteModal.value = true;
  vendorToDelete.value = id;
}

async function confirmDelete() {
  if (!vendorToDelete.value) {
    console.error('No vendor ID to delete');
    toast.add({
      title: 'Error',
      description: 'No vendor selected for deletion',
      icon: 'i-heroicons-exclamation-triangle',

    });
    return;
  }

  deleting.value = true;
  try {
    const vendor = vendorStore.vendors.find(v => v.id === vendorToDelete.value);
    if (vendor) {
      const result = await vendorStore.deleteVendor(
        vendor.corporation_uuid,
        vendor
      );
    
    if (result) {
      // Show success toast
      toast.add({
        title: 'Vendor deleted successfully!',
        icon: 'i-heroicons-check-circle',
  
      });
    } else {
      throw new Error('Delete operation failed');
    }
    } else {
      throw new Error('Vendor not found');
    }
  } catch (error) {
    console.error('Error in confirmDelete:', error);
    // Show error toast
    toast.add({
      title: 'Failed to delete vendor',
      description: error instanceof Error ? error.message : 'An error occurred while deleting',
      icon: 'i-heroicons-exclamation-triangle',

    });
  } finally {
    showDeleteModal.value = false;
    vendorToDelete.value = null;
    deleting.value = false;
  }
}
</script>
