<template>
  <div>
    <div v-if="corpStore.selectedCorporation" class="flex justify-end items-center mb-4">
      <div class="flex-1 max-w-sm mr-2">
        <UInput
          v-model="globalFilter"
          placeholder="Search customers..."
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
        Add Customer
      </UButton>
    </div>

    <div v-else class="text-gray-500">No corporation selected.</div>

    <!-- Customer Table -->
    <div v-if="customerStore.loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Table Header -->
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-10 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
            <!-- Profile Image Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <!-- Corporation Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <!-- Customer Name Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-32" />
            </div>
            <!-- Project Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-24" />
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
            <!-- Company Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
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
            <div class="grid grid-cols-10 gap-4 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 border-gray-100 dark:border-gray-700">
              <!-- Profile Image Cell -->
              <div class="flex items-center">
                <USkeleton class="h-10 w-10 rounded-full" />
              </div>
              <!-- Corporation Cell -->
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <!-- Customer Name Cell -->
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <!-- Project Cell -->
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
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
              <!-- Company Cell -->
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
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

    <div v-else-if="customerStore.error">
      <p class="text-red-500">Error: {{ customerStore.error }}</p>
    </div>

    <div v-else-if="customerStore.customers.length">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        v-model:column-pinning="columnPinning"
        :pagination-options="paginationOptions"
        :data="filteredCustomers" 
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
          Showing {{ (table?.tableApi?.getState().pagination.pageIndex || 0) * (table?.tableApi?.getState().pagination.pageSize || 10) + 1 }} to {{ Math.min(((table?.tableApi?.getState().pagination.pageIndex || 0) + 1) * (table?.tableApi?.getState().pagination.pageSize || 10), table?.tableApi?.getFilteredRowModel().rows.length || 0) }} of {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} customers
        </div>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-3-3h-2a3 3 0 00-3 3v2zM9 10a3 3 0 100-6 3 3 0 000 6zM5 20h5v-2a3 3 0 00-3-3H5a3 3 0 00-3 3v2z" />
        </svg>
      </div>
      <p class="text-gray-500 text-lg font-medium">No customers found</p>
      <p class="text-gray-400 text-sm">Get started by adding your first customer</p>
    </div>

    <!-- Customer Form Component -->
    <CustomerForm 
      v-model="showModal" 
      :customer="editingCustomer"
      @customer-saved="handleCustomerSaved"
    />

    <!-- Delete Confirmation Modal -->
    <UModal 
      v-model:open="showDeleteModal"
      title="Delete Customer"
      description="This action cannot be undone. The customer will be permanently removed."
    >
      <template #body>
        <p class="text-gray-700">Are you sure you want to delete this customer? This action cannot be undone.</p>
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
            Delete Customer
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, h, resolveComponent, onMounted, useTemplateRef } from "vue";
import { getPaginationRowModel } from "@tanstack/vue-table";
import { useCustomerStore } from "@/stores/customers";
import { useCorporationStore } from "@/stores/corporations";
import { useProjectsStore } from "@/stores/projects";
import type { TableColumn } from '@nuxt/ui'
import CustomerForm from './CustomerForm.vue';

const UButton = resolveComponent('UButton')
const UTable = resolveComponent('UTable')
const UPagination = resolveComponent('UPagination')

const customerStore = useCustomerStore();
const corpStore = useCorporationStore();
const projectsStore = useProjectsStore();

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

const projectNameByUuid = computed<Record<string, string>>(() => {
  const list = projectsStore.projects || []
  const map: Record<string, string> = {}
  list.forEach((project: any) => { 
    if (project?.uuid) {
      map[project.uuid] = `${project.project_id} - ${project.project_name}` || project.uuid
    }
  })
  return map
})

const toast = useToast();

const showModal = ref(false);
const showDeleteModal = ref(false);
const editingCustomer = ref<any>(null);
const customerToDelete = ref<number | null>(null);
const deleting = ref(false);
const globalFilter = ref('');

// Pagination state for TanStack Table
const pagination = ref({
  pageIndex: 0,
  pageSize: 10
});

// Column pinning state
const columnPinning = ref({
  left: ['profile_image', 'customer_name'],
  right: ['actions']
});

// Pagination options for TanStack Table
const paginationOptions = ref({
  getPaginationRowModel: getPaginationRowModel()
});

// Table ref for accessing table API
const table = useTemplateRef<any>('table');

// Computed property for filtered customers based on global filter
const filteredCustomers = computed(() => {
  if (!globalFilter.value.trim()) {
    return customerStore.customers;
  }

  const searchTerm = globalFilter.value.toLowerCase().trim();
  
  return customerStore.customers.filter(customer => {
    // Search across all relevant fields
    const searchableFields = [
      customer.customer_name || '',
      customer.customer_type || '',
      customer.customer_address || '',
      customer.customer_city || '',
      customer.customer_state || '',
      customer.customer_country || '',
      customer.customer_zip || '',
      customer.customer_phone || '',
      customer.customer_email || '',
      customer.company_name || '',
      customer.first_name || '',
      customer.last_name || ''
    ];

    // Check if any field contains the search term
    return searchableFields.some(field => 
      field.toLowerCase().includes(searchTerm)
    );
  });
});

// Computed property to determine if pagination should be shown
const shouldShowPagination = computed(() => {
  return filteredCustomers.value.length > 10;
});

// Table columns configuration
const columns: TableColumn<any>[] = [
  {
    accessorKey: 'profile_image_url',
    header: 'Profile',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const imageUrl = row.original.profile_image_url;
      if (imageUrl) {
        return h('img', {
          src: imageUrl,
          alt: 'Profile',
          class: 'w-10 h-10 rounded-full object-cover'
        });
      }
      return h('div', {
        class: 'w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center'
      }, [
        h('span', { class: 'text-gray-400 text-xs' }, 'N/A')
      ]);
    }
  },
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
    accessorKey: 'customer_name',
    header: 'Customer Name',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-medium text-default' }, row.original.customer_name)
  },
  {
    accessorKey: 'project_uuid',
    header: 'Project',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const uuid = row.original.project_uuid
      const label = uuid ? (projectNameByUuid.value[uuid] || 'N/A') : 'N/A'
      return h('div', { class: 'text-muted' }, label)
    }
  },
  {
    accessorKey: 'customer_type',
    header: 'Type',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const type = row.original.customer_type;
      if (!type) return h('div', { class: 'text-muted' }, 'N/A');
      return h('span', { 
        class: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800' 
      }, type);
    }
  },
  {
    accessorKey: 'customer_address',
    header: 'Address',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const address = row.original.customer_address;
      const city = row.original.customer_city;
      const state = row.original.customer_state;
      const zip = row.original.customer_zip;
      
      const fullAddress = [address, city, state, zip].filter(Boolean).join(', ');
      return h('div', { class: 'text-muted max-w-xs truncate' }, fullAddress || 'N/A');
    }
  },
  {
    accessorKey: 'customer_phone',
    header: 'Phone',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'text-muted font-mono' }, row.original.customer_phone || 'N/A')
  },
  {
    accessorKey: 'customer_email',
    header: 'Email',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'text-muted max-w-xs truncate' }, row.original.customer_email || 'N/A')
  },
  {
    accessorKey: 'company_name',
    header: 'Company',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-medium text-default' }, row.original.company_name || 'N/A')
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    enableSorting: false,
    meta: { class: { th: 'text-right sticky right-0 z-10 w-24', td: 'text-right sticky right-0 w-24' } },
    cell: ({ row }: { row: { original: any } }) => {
      return h('div', { class: 'flex justify-end space-x-2' }, [
        h(UButton, {
          icon: 'tdesign:edit-filled',
          size: 'xs',
          variant: 'soft',
          color: 'secondary',
          class: 'hover:scale-105 transition-transform',
          onClick: () => editCustomer(row.original)
        }, () => ''),
        h(UButton, {
          icon: 'mingcute:delete-fill',
          size: 'xs',
          variant: 'soft',
          color: 'error',
          class: 'hover:scale-105 transition-transform',
          onClick: () => handleDeleteCustomer(row.original.id)
        }, () => '')
      ])
    }
  }
];

// Function to update page size in TanStack Table
function updatePageSize() {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageSize(pagination.value.pageSize);
  }
}

// Load customers when corporation changes
watch(
  () => corpStore.selectedCorporation?.uuid,
  (uuid) => {
    if (uuid && process.client) {
      customerStore.fetchCustomers(uuid);
      // Also fetch projects for the project dropdown
      projectsStore.fetchProjectsMetadata(uuid);
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
      customerStore.fetchCustomers(corpStore.selectedCorporation.uuid);
      projectsStore.fetchProjectsMetadata(corpStore.selectedCorporation.uuid);
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
      description: 'Please select a corporation first before adding customers.',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  editingCustomer.value = null;
  showModal.value = true;
}

function handleCustomerSaved() {
  // Refresh the customers list after saving - force API refresh to get latest data
  if (corpStore.selectedCorporation?.uuid) {
    customerStore.refreshCustomersFromAPI(corpStore.selectedCorporation.uuid);
  }
}

function editCustomer(customer: any) {
  // Ensure corporation is selected before editing
  if (!corpStore.selectedCorporation?.uuid) {
    toast.add({
      title: 'Error',
      description: 'Please select a corporation first before editing customers.',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  editingCustomer.value = customer;
  showModal.value = true;
}

async function handleDeleteCustomer(id: number) {
  // Validate that we have a valid ID
  if (!id || isNaN(id)) {
    toast.add({
      title: 'Error',
      description: 'Invalid customer ID',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  // Find the customer to confirm it exists
  const customer = customerStore.customers.find(c => c.id === id);
  if (!customer) {
    toast.add({
      title: 'Error',
      description: 'Customer not found',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  showDeleteModal.value = true;
  customerToDelete.value = id;
}

async function confirmDelete() {
  if (!customerToDelete.value) {
    console.error('No customer ID to delete');
    toast.add({
      title: 'Error',
      description: 'No customer selected for deletion',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  deleting.value = true;
  try {
    const customer = customerStore.customers.find(c => c.id === customerToDelete.value);
    if (customer) {
      const result = await customerStore.deleteCustomer(
        customer.corporation_uuid,
        customer
      );
    
    if (result) {
      // Show success toast
      toast.add({
        title: 'Customer deleted successfully!',
        icon: 'i-heroicons-check-circle',
      });
    } else {
      throw new Error('Delete operation failed');
    }
    } else {
      throw new Error('Customer not found');
    }
  } catch (error) {
    console.error('Error in confirmDelete:', error);
    // Show error toast
    toast.add({
      title: 'Failed to delete customer',
      description: error instanceof Error ? error.message : 'An error occurred while deleting',
      icon: 'i-heroicons-exclamation-triangle',
    });
  } finally {
    showDeleteModal.value = false;
    customerToDelete.value = null;
    deleting.value = false;
  }
}
</script>

