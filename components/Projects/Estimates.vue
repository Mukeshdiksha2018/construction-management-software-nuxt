<template>
  <div>
    <!-- Status Stat Cards with Add New Button and Search Bar -->
    <div v-if="isReady && !loading" class="flex items-center gap-4 mb-4">
      <div class="flex flex-row flex-1 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
      <!-- Summary Section (Highlighted) -->
      <div
        @click="clearStatusFilter()"
        :class="[
          'flex-1 px-4 py-2 cursor-pointer transition-colors flex items-center justify-center',
          selectedStatusFilter === null 
            ? 'bg-amber-50 dark:bg-amber-900/20' 
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        ]"
      >
        <div class="flex flex-col items-center text-center">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            Summary ({{ allEstimatesStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(allEstimatesStats.totalValue) }}
          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div class="w-px bg-gray-200 dark:bg-gray-700"></div>
      
      <!-- Draft Section -->
      <div
        @click="toggleStatusFilter('Draft')"
        :class="[
          'flex-1 px-4 py-2 cursor-pointer transition-colors flex items-center justify-center',
          selectedStatusFilter === 'Draft'
            ? 'bg-gray-100 dark:bg-gray-700'
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        ]"
      >
        <div class="flex flex-col items-center text-center">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            Drafting… ({{ draftStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(draftStats.totalValue) }}
          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div class="w-px bg-gray-200 dark:bg-gray-700"></div>
      
      <!-- For Approval Section -->
      <div
        @click="toggleStatusFilter('Ready')"
        :class="[
          'flex-1 px-4 py-2 cursor-pointer transition-colors flex items-center justify-center',
          selectedStatusFilter === 'Ready'
            ? 'bg-gray-100 dark:bg-gray-700'
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        ]"
      >
        <div class="flex flex-col items-center text-center">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            For Approval ({{ readyStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(readyStats.totalValue) }}
          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div class="w-px bg-gray-200 dark:bg-gray-700"></div>
      
      <!-- Approved Section -->
      <div
        @click="toggleStatusFilter('Approved')"
        :class="[
          'flex-1 px-4 py-2 cursor-pointer transition-colors flex items-center justify-center',
          selectedStatusFilter === 'Approved'
            ? 'bg-gray-100 dark:bg-gray-700'
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        ]"
      >
        <div class="flex flex-col items-center text-center">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            Approved ({{ approvedStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(approvedStats.totalValue) }}
          </div>
        </div>
      </div>
      </div>
      
      <!-- Add New Button and Search Bar Stacked -->
      <div class="flex flex-col gap-2">
        <UButton
          v-if="hasPermission('project_estimates_create')"
          icon="i-heroicons-plus"
          color="primary"
          size="xs"
          @click="addNewEstimate"
        >
          Add New Estimate
        </UButton>
        <div class="max-w-sm">
          <UInput
            v-model="globalFilter"
            placeholder="Search estimates..."
            icon="i-heroicons-magnifying-glass"
            variant="subtle"
            size="xs"
            class="w-full"
          />
        </div>
      </div>
    </div>

    <!-- Estimates Table -->
    <div v-if="loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Loading skeleton -->
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-9 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-8" />
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
              <USkeleton class="h-4 w-12" />
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
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center justify-center">
              <USkeleton class="h-4 w-16" />
            </div>
          </div>
        </div>
        
        <!-- Table Body -->
        <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="i in 8" :key="i" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
            <div class="grid grid-cols-9 gap-4 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 border-gray-100 dark:border-gray-700">
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-12" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
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

    <div v-else-if="estimates.length && hasPermission('project_estimates_view') && isReady">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        v-model:column-pinning="columnPinning"
        :pagination-options="paginationOptions"
        :data="filteredEstimates" 
        :columns="columns"
        v-model:selected="selectedEstimates"
        v-model:global-filter="globalFilter"
        :selectable="true"
        class="max-h-[70vh] overflow-auto"
      />
      
      <!-- Pagination -->
      <div v-if="shouldShowPagination(filteredEstimates.length).value" class="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
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
          {{ getPageInfo(table, 'estimates').value }}
        </div>
      </div>
    </div>

    <div v-else-if="!hasPermission('project_estimates_view') && isReady" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-lock-closed" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg">Access Denied</p>
      <p class="text-gray-400 text-sm">You don't have permission to view estimates</p>
    </div>

    <div v-else-if="isReady" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-calculator" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg">No estimates found</p>
      <p class="text-gray-400 text-sm mb-6">Create your first estimate to get started</p>
      <UButton 
        v-if="hasPermission('project_estimates_create')"
        icon="i-heroicons-plus" 
        @click="addNewEstimate"
      >
        Add Estimate
      </UButton>
    </div>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" :title="'Delete Estimate'" :description="''">
      <template #body>
        <div class="p-6">
          <div class="flex items-center mb-4">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-500 mr-3" />
            <div>
              <h3 class="text-lg font-medium text-gray-900">Delete Estimate</h3>
              <p class="text-sm text-gray-500">This action cannot be undone.</p>
            </div>
          </div>
          
          <div v-if="estimateToDelete" class="bg-gray-50 p-4 rounded-lg mb-4">
            <p class="text-sm text-gray-700">
              <strong>Estimate Number:</strong> {{ estimateToDelete.estimate_number || 'N/A' }}<br>
              <strong>Project:</strong> {{ estimateToDelete.project?.project_name || 'N/A' }}<br>
              <strong>Date:</strong> {{ formatDate(estimateToDelete.estimate_date) }}<br>
              <strong>Amount:</strong> {{ formatCurrency(estimateToDelete.final_amount) }}<br>
              <strong>Status:</strong> {{ estimateToDelete.status || 'N/A' }}
            </p>
          </div>
          
          <p class="text-gray-600">
            Are you sure you want to delete this estimate? This will permanently remove the estimate and all associated data.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="soft" @click="cancelDelete">
            Cancel
          </UButton>
          <UButton color="error" @click="confirmDelete">
            Delete Estimate
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Estimate Preview Modal -->
    <UModal 
      v-model:open="showPreviewModal"
      title="Estimate Details"
      description="View complete information about this estimate"
      fullscreen
      :ui="{ 
        body: 'p-4 sm:p-6'
      }"
    >
      <template #body>
        <EstimatePreview v-if="previewEstimate" :estimate="previewEstimate" />
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="showPreviewModal = false">Close</UButton>
          <UButton v-if="hasPermission('project_estimates_edit')" color="primary" icon="tdesign:edit-filled" @click="editEstimateFromPreview">Edit Estimate</UButton>
        </div>
      </template>
    </UModal>

    <!-- Estimate Audit Log Slideover -->
    <AuditLogSlideover
      v-model:open="showEstimateAuditLogModal"
      :entity-id="selectedEstimateForAudit?.uuid || ''"
      entity-type="estimate"
      :corporation-uuid="corporationStore.selectedCorporation?.uuid || ''"
      :title="auditLogTitle"
      :description="auditLogDescription"
      :auto-refresh="true"
      @logs-loaded="onAuditLogsLoaded"
      @error="onAuditLogError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, watch, onMounted, nextTick, useTemplateRef, resolveComponent } from "vue";
import { useRouter, useRoute } from 'vue-router'
import { useCorporationStore } from '@/stores/corporations'
import { useEstimatesStore } from '@/stores/estimates'
import { useDateRangeStore } from '@/stores/dateRange'
import { useTableStandard } from '@/composables/useTableStandard'
import { useDateFormat } from '@/composables/useDateFormat'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import { useAuditLog } from '@/composables/useAuditLog'
import { usePermissions } from '@/composables/usePermissions'
import { useEstimatePrint } from '@/composables/useEstimatePrint'
import { useApiClient } from '@/composables/useApiClient'
import type { TableColumn } from '@nuxt/ui'
import AuditLogSlideover from '@/components/AuditLogs/AuditLogSlideover.vue'
import EstimatePreview from '@/components/Projects/EstimatePreview.vue'

// Local declaration to satisfy TS for auto-imported useToast
declare function useToast(): { add: (opts: any) => void }

// Resolve components for table columns
const UButton = resolveComponent('UButton')
const UTooltip = resolveComponent('UTooltip')
const UBadge = resolveComponent('UBadge')

// Router
const router = useRouter()
const route = useRoute()

// Stores
const corporationStore = useCorporationStore()
const estimatesStore = useEstimatesStore()
const dateRangeStore = useDateRangeStore()
const { formatDate } = useDateFormat()
const { formatCurrency } = useCurrencyFormat()

// Use permissions composable
const { hasPermission, isReady } = usePermissions()
const { openEstimatePrint } = useEstimatePrint()

// API client for direct API calls
const { apiFetch } = useApiClient()

// Audit log functionality
const { 
  generateAuditLogInfo, 
  showAuditLog, 
  closeAuditLog, 
  onAuditLogsLoaded, 
  onAuditLogError, 
  onExportAuditLogs 
} = useAuditLog({
  entityType: 'estimate',
  corporationUuid: computed(() => corporationStore.selectedCorporation?.uuid || ''),
  formatCurrency
});

// Table functionality
const {
  pagination,
  paginationOptions,
  pageSizeOptions,
  updatePageSize,
  getPaginationProps,
  getPageInfo,
  shouldShowPagination
} = useTableStandard()

// Data state
const selectedEstimates = ref<any[]>([])
const globalFilter = ref('')
const selectedStatusFilter = ref<string | null>(null)
const showPreviewModal = ref(false)
const previewEstimate = ref<any>(null)
const showDeleteModal = ref(false)
const estimateToDelete = ref<any>(null)
const showEstimateAuditLogModal = ref(false)
const selectedEstimateForAudit = ref<any>(null)
const auditLogsCount = ref(0)

// Column pinning for sticky actions column
const columnPinning = ref({
  left: [],
  right: ['actions']
});

// Table ref for accessing table API
const table = useTemplateRef<any>('table');

// Use estimates from store
const estimates = computed(() => estimatesStore.estimates)
const loading = computed(() => estimatesStore.loading)
// Only show error alert for fetch errors, not delete operation errors
// Delete errors are handled via toast notifications
const error = computed(() => {
  const storeError = estimatesStore.error
  // Don't show error alert for delete-related errors (they're handled via toast)
  if (storeError && (storeError.includes('delete') || storeError.includes('Cannot delete'))) {
    return null
  }
  return storeError
})

// Computed
const selectedCorporationId = computed(() => corporationStore.selectedCorporationId)

const corporationNameByUuid = computed<Record<string, string>>(() => {
  const list = corporationStore.corporations || []
  const map: Record<string, string> = {}
  list.forEach((corp: any) => { 
    if (corp?.uuid) {
      map[corp.uuid] = corp.corporation_name || corp.uuid
    }
  })
  return map
})

// Status stats computed properties
const allEstimatesStats = computed(() => {
  return {
    count: estimates.value.length,
    totalValue: estimates.value.reduce((sum, e) => sum + (Number(e.final_amount) || Number(e.total_amount) || 0), 0)
  }
})

const draftStats = computed(() => {
  const draftEstimates = estimates.value.filter(e => e.status === 'Draft')
  return {
    count: draftEstimates.length,
    totalValue: draftEstimates.reduce((sum, e) => sum + (Number(e.final_amount) || Number(e.total_amount) || 0), 0)
  }
})

const readyStats = computed(() => {
  const readyEstimates = estimates.value.filter(e => (e.status as string) === 'Ready')
  return {
    count: readyEstimates.length,
    totalValue: readyEstimates.reduce((sum, e) => sum + (Number(e.final_amount) || Number(e.total_amount) || 0), 0)
  }
})

const approvedStats = computed(() => {
  const approvedEstimates = estimates.value.filter(e => e.status === 'Approved')
  return {
    count: approvedEstimates.length,
    totalValue: approvedEstimates.reduce((sum, e) => sum + (Number(e.final_amount) || Number(e.total_amount) || 0), 0)
  }
})

const filteredEstimates = computed(() => {
  let filtered = [...estimates.value]
  
  // Apply status filter if selected
  if (selectedStatusFilter.value) {
    filtered = filtered.filter(e => e.status === selectedStatusFilter.value)
  }
  
  return filtered
})

// Table columns configuration
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
    accessorKey: 'estimate_date',
    header: 'Date',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', formatDate(row.original.estimate_date))
  },
  {
    accessorKey: 'estimate_number',
    header: 'Estimate #',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-medium text-default' }, row.original.estimate_number || 'N/A')
  },
  {
    accessorKey: 'project_name',
    header: 'Project',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.project?.project_name || 'N/A')
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const rawStatus: string = row.original.status || 'Draft'
      const statusMap: Record<string, { label: string; color: string }> = {
        Draft: {
          label: 'Drafting…',
          color: 'warning'
        },
        Ready: {
          label: 'Estimate ready for approval',
          color: 'primary'
        },
        Approved: {
          label: 'Estimate approved',
          color: 'success'
        }
      }

      const config = statusMap[rawStatus] ?? {
        label: rawStatus,
        color: 'neutral'
      }

      return h(UBadge, {
        color: config.color,
        variant: 'soft',
        size: 'sm'
      }, () => config.label)
    }
  },
  {
    accessorKey: 'valid_until',
    header: 'Valid Until',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const validUntil = row.original.valid_until;
      return h('div', validUntil ? formatDate(validUntil) : 'N/A')
    }
  },
  {
    accessorKey: 'total_amount',
    header: 'Total Amount',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const amount = row.original.total_amount || 0;
      const formattedAmount = formatCurrency(amount);
      return h('div', { class: 'font-mono text-sm' }, formattedAmount);
    }
  },
  {
    accessorKey: 'final_amount',
    header: 'Final Amount',
    enableSorting: false,
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }: { row: { original: any } }) => {
      const amount = row.original.final_amount || 0;
      const formattedAmount = formatCurrency(amount);
      return h('div', { class: 'text-right font-mono text-sm font-semibold' }, formattedAmount);
    }
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    enableSorting: false,
    meta: { class: { th: 'text-right sticky right-0 z-10 w-32', td: 'text-right sticky right-0 w-32' } },
    cell: ({ row }: { row: { original: any } }) => {
      const buttons = [];
      
      // Print button - show if user has view permission
      if (hasPermission('project_estimates_view')) {
        buttons.push(
          h(UTooltip, { text: 'Print Estimate (PDF)' }, () => [
            h(UButton, {
              icon: 'i-heroicons-printer-solid',
              size: 'xs',
              variant: 'soft',
              color: 'neutral',
              class: 'hover:scale-105 transition-transform',
              onClick: () => openEstimatePrint(row.original)
            }, () => '')
          ])
        );
      }
      
      // View button - show if user has view permission
      if (hasPermission('project_estimates_view')) {
        buttons.push(
          h(UTooltip, { text: 'View Estimate Details' }, () => [
            h(UButton, {
              icon: 'i-heroicons-eye-solid',
              size: 'xs',
              variant: 'soft',
              color: 'neutral',
              class: 'hover:scale-105 transition-transform',
              onClick: () => previewEstimateDetails(row.original)
            }, () => '')
          ])
        );
      }
      
      // Edit button - show if user has edit permission
      if (hasPermission('project_estimates_edit')) {
        buttons.push(
          h(UTooltip, { text: 'Edit Estimate' }, () => [
            h(UButton, {
              icon: 'tdesign:edit-filled',
              size: 'xs',
              variant: 'soft',
              color: 'secondary',
              class: 'hover:scale-105 transition-transform',
              onClick: () => editEstimate(row.original)
            }, () => '')
          ])
        );
      }
      
      // Delete button - show if user has delete permission
      if (hasPermission('project_estimates_delete')) {
        buttons.push(
          h(UTooltip, { text: 'Delete Estimate' }, () => [
            h(UButton, {
              icon: 'mingcute:delete-fill',
              size: 'xs',
              variant: 'soft',
              color: 'error',
              class: 'hover:scale-105 transition-transform',
              onClick: () => deleteEstimate(row.original)
            }, () => '')
          ])
        );
      }
      
      return h('div', { class: 'flex justify-end space-x-2' }, buttons);
    }
  }
];

// Methods
const toggleStatusFilter = (status: string) => {
  if (selectedStatusFilter.value === status) {
    // If clicking the same status, clear the filter
    selectedStatusFilter.value = null
  } else {
    // Otherwise, set the new filter
    selectedStatusFilter.value = status
  }
  
  // Reset to first page when filter changes
  if (table.value?.tableApi) {
    table.value.tableApi.setPageIndex(0)
  }
}

const clearStatusFilter = () => {
  selectedStatusFilter.value = null
  
  // Reset to first page when filter is cleared
  if (table.value?.tableApi) {
    table.value.tableApi.setPageIndex(0)
  }
}

const addNewEstimate = async () => {
  if (!hasPermission('project_estimates_create')) {
    try {
      const toast = useToast();
      toast.add({
        title: "Access Denied",
        description: "You don't have permission to create estimates.",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
    } catch (error) {
      console.error('Error showing toast:', error);
    }
    return;
  }
  
  // Check if there's a project selected in the route query
  const projectUuid = route.query?.projectUuid;
  
  if (projectUuid && typeof projectUuid === 'string') {
    const corporationUuid = corporationStore.selectedCorporationId;
    
    if (corporationUuid) {
      try {
        // Make a direct API call to check if an estimate exists for this project
        // This is independent of the global estimates store state
        const response: any = await apiFetch('/api/estimates', {
          query: {
            corporation_uuid: corporationUuid,
            project_uuid: projectUuid,
            page: 1,
            page_size: 1
          }
        });
        
        const existingEstimates = response?.data || [];
        
        if (existingEstimates && existingEstimates.length > 0) {
          // Find the project name for better error message
          const project = existingEstimates[0]?.project;
          const projectName = project?.project_name || project?.project_id || 'this project';
          const estimateNumber = existingEstimates[0]?.estimate_number || 'N/A';
          
          const toast = useToast();
          toast.add({
            title: "Estimate Already Exists",
            description: `An estimate (${estimateNumber}) already exists for ${projectName}. Please edit the existing estimate instead of creating a new one.`,
            color: "warning",
            icon: "i-heroicons-exclamation-triangle",
          });
          return;
        }
      } catch (error) {
        // If API call fails, log error but don't block the user
        console.error('Error checking for existing estimates:', error);
        // Continue with navigation if check fails
      }
    }
  }
  
  router.push('/estimates/form/new')
}

const editEstimate = (estimate: any) => {
  if (!hasPermission('project_estimates_edit')) {
    try {
      const toast = useToast();
      toast.add({
        title: "Access Denied",
        description: "You don't have permission to edit estimates.",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
    } catch (error) {
      console.error('Error showing toast:', error);
    }
    return;
  }
  
  router.push(`/estimates/form/${estimate.uuid}`)
}

const deleteEstimate = (estimate: any) => {
  if (!hasPermission('project_estimates_delete')) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to delete estimates.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }
  
  estimateToDelete.value = estimate
  showDeleteModal.value = true
}

// Helper function to clean error messages
const getCleanMessage = (msg: string | undefined): string => {
  if (!msg) return ''
  let clean = msg
  // Remove [METHOD] "URL": statusCode patterns like [DELETE] "/api/estimates?uuid=...": 400
  clean = clean.replace(/\[.*?\]\s*"[^"]*":\s*\d{3}\s*/g, '')
  // Remove [METHOD] "URL" patterns (without status code)
  clean = clean.replace(/\[.*?\]\s*"[^"]*":\s*/g, '')
  // Remove API endpoint URLs (standalone)
  clean = clean.replace(/\/api\/[^\s"]+/g, '')
  // Remove status codes like "500" or "400" (standalone numbers, but keep them in context)
  clean = clean.replace(/\b\d{3}\b(?=\s|$)/g, '')
  // Remove common error prefixes
  clean = clean.replace(/^(FetchError|Error|Failed to load resource):\s*/i, '')
  // Remove extra whitespace and leading/trailing colons
  clean = clean.trim().replace(/\s+/g, ' ').replace(/^\s*:\s*/, '').replace(/\s*:\s*$/, '')
  return clean
}

const confirmDelete = async () => {
  if (!hasPermission('project_estimates_delete')) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to delete estimates.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }

  if (!estimateToDelete.value) return

  try {
    const success = await estimatesStore.deleteEstimate(estimateToDelete.value.uuid)
    
    if (success) {
      const toast = useToast();
      toast.add({
        title: "Success",
        description: "Estimate deleted successfully",
        color: "success",
        icon: "i-heroicons-check-circle",
      });
      showDeleteModal.value = false
      estimateToDelete.value = null
    }
  } catch (error: any) {
    console.error('Error deleting estimate:', error)
    // Clear the store error after handling it so it doesn't affect the table display
    estimatesStore.error = null
    
    const toast = useToast();
    let errorDescription = 'Failed to delete estimate'
    
    // Use statusMessage from API if available (it should be clean), otherwise use cleaned message
    if (error?.statusMessage) {
      errorDescription = getCleanMessage(error.statusMessage) || errorDescription
    } else if (error?.message) {
      errorDescription = getCleanMessage(error.message) || errorDescription
    }
    
    toast.add({
      title: "Error",
      description: errorDescription,
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    // Keep the modal open on error so user can see the error message
  }
}

const cancelDelete = () => {
  showDeleteModal.value = false
  estimateToDelete.value = null
}

const previewEstimateDetails = (estimate: any) => {
  if (!hasPermission('project_estimates_view')) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to view estimate details.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }
  
  previewEstimate.value = estimate;
  showPreviewModal.value = true;
}

const editEstimateFromPreview = () => {
  if (previewEstimate.value) {
    showPreviewModal.value = false;
    editEstimate(previewEstimate.value);
  }
}

// Backward-compatible method used in tests
const openPrintPreview = (estimate: any) => openEstimatePrint(estimate)

// Audit log methods
const showEstimateAuditLog = (estimate: any) => {
  if (!hasPermission('project_estimates_view')) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to view audit logs.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }
  
  selectedEstimateForAudit.value = estimate;
  showEstimateAuditLogModal.value = true;
}

const closeEstimateAuditLog = () => {
  showEstimateAuditLogModal.value = false;
  selectedEstimateForAudit.value = null;
  auditLogsCount.value = 0;
}

const auditLogTitle = computed(() => {
  if (selectedEstimateForAudit.value) {
    return `Estimate ${selectedEstimateForAudit.value.estimate_number || 'N/A'}`;
  }
  return 'Audit Log';
});

const auditLogDescription = computed(() => {
  if (selectedEstimateForAudit.value) {
    return `Track changes for estimate ${selectedEstimateForAudit.value.estimate_number || 'N/A'}`;
  }
  return 'View audit trail';
});

// Status badge helper methods
const getStatusBadgeColor = (status: string): 'neutral' | 'warning' | 'success' | 'error' => {
  const statusConfig: Record<string, 'neutral' | 'warning' | 'success' | 'error'> = {
    'Draft': 'neutral',
    'Pending': 'warning',
    'Approved': 'success',
    'Rejected': 'error',
    'Expired': 'neutral'
  };
  return statusConfig[status] || 'neutral';
};

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

// Estimates are automatically fetched by TopBar.vue when corporation changes
// No need to fetch here - just use the store data reactively
</script>
