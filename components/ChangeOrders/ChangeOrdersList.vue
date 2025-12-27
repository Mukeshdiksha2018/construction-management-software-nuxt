<template>
  <div>
    <!-- Status Stat Cards with Add New Button -->
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
            Summary ({{ allCOStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(allCOStats.totalValue) }}
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
            Pending ({{ draftStats.count }})
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
            To be approved ({{ readyStats.count }})
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
      
      <!-- Add New Button -->
      <UButton
        icon="i-heroicons-plus"
        color="primary"
        size="xs"
        @click="openCreateModal"
      >
        Add new CO
      </UButton>
    </div>

    <div v-if="loading && !loadingRowUuid && !changeOrders.length">
      <div class="text-center py-12">
        <div class="text-gray-400 mb-4">
          <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 mx-auto animate-spin" />
        </div>
        <p class="text-gray-500 text-lg">Loading change orders...</p>
      </div>
    </div>

    <div v-else-if="error && !loadingRowUuid">
      <UAlert
        icon="i-heroicons-exclamation-triangle"
        color="error"
        variant="soft"
        :title="error"
        :description="'Please try refreshing the page or contact support if the issue persists.'"
      />
    </div>

    <div v-else-if="changeOrders.length && hasPermission('co_view') && isReady">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        v-model:column-pinning="columnPinning"
        :pagination-options="paginationOptions"
        :data="filteredChangeOrders" 
        :columns="columns"
        v-model:selected="selectedRows"
        v-model:global-filter="globalFilter"
        :selectable="true"
        class="max-h-[70vh] overflow-auto"
      />
    </div>

    <div v-else-if="!hasPermission('co_view')" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-lock-closed" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg">Access Denied</p>
      <p class="text-gray-400 text-sm">You don't have permission to view change orders</p>
    </div>

    <div v-else class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-document-text" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg">No change orders found</p>
      <p class="text-gray-400 text-sm mb-6">Create your first change order to get started</p>
      <UButton 
        v-if="hasPermission('co_create')"
        icon="i-heroicons-plus" 
        @click="openCreateModal"
      >
        Add Change Order
      </UButton>
    </div>

    <div v-if="changeOrders.length && hasPermission('co_view') && shouldShowPagination(filteredChangeOrders.length).value" class="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
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
        {{ getPageInfo(table, 'change orders').value }}
      </div>
    </div>

    <!-- Create/Edit Change Order Modal -->
    <UModal v-model:open="showFormModal" :title="formModalTitle" fullscreen scrollable>
      <template #header>
        <div class="grid grid-cols-3 items-center w-full gap-4">
          <div class="flex items-center gap-4 flex-shrink-0">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ formModalTitle }}
            </h3>
            <span
              class="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium border"
              :class="statusChipClass"
            >
              {{ statusLabel }}
            </span>
          </div>

          <!-- Print Button in Center -->
          <div class="flex justify-center">
            <UButton
              v-if="coForm.uuid"
              color="info"
              variant="solid"
              icon="i-heroicons-printer"
              size="sm"
              @click="handlePrintChangeOrder"
            >
              Print
            </UButton>
          </div>

          <div class="flex items-center gap-2 justify-end">
            <div class="flex items-center gap-2">
              <!-- View Audit Log Button -->
              <UButton
                v-if="coForm.uuid && hasPermission('co_view')"
                icon="i-heroicons-shield-check-solid"
                color="info"
                variant="outline"
                size="sm"
                @click="showAuditLogModal = true"
              >
                View Audit Log
              </UButton>
              <UButton
                v-if="isViewMode && hasPermission('co_edit') && coForm.status !== 'Approved'"
                type="button"
                color="primary"
                icon="tdesign:edit-filled"
                size="sm"
                @click="switchToEditMode"
              >
                Edit Change Order
              </UButton>

              <!-- Approval buttons for Ready status -->
              <template v-if="!isViewMode && showApprovalButtons">
                <UButton
                  data-testid="btn-reject-draft"
                  color="error"
                  variant="soft"
                  icon="i-heroicons-arrow-uturn-left"
                  size="sm"
                  :disabled="saving"
                  :loading="saving"
                  @click="handleRejectToDraft"
                >
                  Reject
                </UButton>
                <UButton
                  data-testid="btn-approve-raise"
                  color="primary"
                  variant="solid"
                  icon="i-heroicons-arrow-up-circle"
                  size="sm"
                  :disabled="saving"
                  :loading="saving"
                  @click="handleApproveAndRaise"
                >
                  Approve
                </UButton>
              </template>

              <!-- Regular save buttons for Draft and other statuses -->
              <template v-else-if="!isViewMode && showAnySaveButtons">
                <UTooltip
                  v-if="showSaveDraftButton && isReadOnlyStatus"
                  text="This change order contains received items and cannot be edited. All fields are read-only."
                >
                  <UButton
                    v-if="showSaveDraftButton"
                    data-testid="btn-save-draft"
                    :color="saveDraftButtonColor"
                    :variant="saveDraftButtonVariant"
                    :icon="saveDraftButtonIcon"
                    size="sm"
                    :disabled="isSaveDraftButtonDisabled"
                    :loading="saving"
                    @click="handleSaveAsDraft"
                  >
                    {{ saveDraftButtonLabel }}
                  </UButton>
                </UTooltip>
                <UButton
                  v-else-if="showSaveDraftButton"
                  data-testid="btn-save-draft"
                  :color="saveDraftButtonColor"
                  :variant="saveDraftButtonVariant"
                  :icon="saveDraftButtonIcon"
                  size="sm"
                  :disabled="saving"
                  :loading="saving"
                  @click="handleSaveAsDraft"
                >
                  {{ saveDraftButtonLabel }}
                </UButton>
                <UButton
                  v-if="showMarkReadyButton"
                  data-testid="btn-ready"
                  color="primary"
                  variant="solid"
                  icon="i-heroicons-paper-airplane"
                  size="sm"
                  :disabled="saving"
                  :loading="saving"
                  @click="handleMarkReady"
                >
                  Send for Approval
                </UButton>
              </template>
            </div>

            <UTooltip text="Close Modal" color="neutral">
              <UButton
                color="neutral"
                variant="solid"
                icon="i-heroicons-x-mark"
                size="sm"
                @click="closeFormModal"
              />
            </UTooltip>
          </div>
        </div>
      </template>
      <template #body>
        <ChangeOrderForm
          v-model:form="coForm"
          :loading="loadingDetail"
          :readonly="isViewMode || isReadOnlyStatus"
        />
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" :title="'Delete Change Order'">
      <template #body>
        <div class="p-6">
          <div class="flex items-center mb-4">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-500 mr-3" />
            <div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Delete Change Order</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
            </div>
          </div>

          <div v-if="coToDelete" class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
            <p class="text-sm text-gray-700 dark:text-gray-300">
              <strong>CO Number:</strong> {{ coToDelete.co_number || 'N/A' }}<br>
              <strong>Created Date:</strong> {{ formatDate(coToDelete.created_date) }}<br>
              <strong>Type:</strong> {{ coToDelete.co_type || 'N/A' }}<br>
              <strong>Total Amount:</strong> {{ formatCurrency(coToDelete.total_co_amount || 0) }}<br>
              <strong>Status:</strong> {{ coToDelete.status || 'Draft' }}
            </p>
          </div>

          <p class="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this change order? This will permanently remove the change order and all associated data.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="soft" @click="cancelDelete">
            Cancel
          </UButton>
          <UButton color="error" @click="confirmDelete">
            Delete Change Order
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Audit Log Modal -->
    <UModal 
      v-model:open="showAuditLogModal" 
      title="Change Order Audit Log"
      :description="`View the complete audit trail for ${coForm.co_number || 'this change order'}`"
      size="2xl"
      :ui="{ body: 'p-6' }"
    >
      <template #body>
        <div class="space-y-4">
          <!-- Audit Timeline -->
          <ChangeOrderAuditTimeline 
            :audit-log="coForm.audit_log || []"
            :change-order-uuid="coForm.uuid || ''"
            @logs-loaded="onAuditLogsLoaded"
            @error="onAuditLogError"
          />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-between items-center w-full">
          <div class="text-sm text-gray-500">
            <span v-if="auditLogsCount > 0">{{ auditLogsCount }} audit entries</span>
            <span v-else>No audit entries</span>
          </div>
          <div class="flex gap-2">
            <UButton 
              color="neutral" 
              variant="soft" 
              @click="showAuditLogModal = false"
            >
              Close
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, resolveComponent, useTemplateRef, watch, onMounted } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useTableStandard } from '@/composables/useTableStandard'
import { useDateFormat } from '@/composables/useDateFormat'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import { usePermissions } from '@/composables/usePermissions'
import ChangeOrderForm from './ChangeOrderForm.vue'
import ChangeOrderAuditTimeline from '@/components/ChangeOrders/ChangeOrderAuditTimeline.vue'
import { useCorporationStore } from '@/stores/corporations'
import { useChangeOrderResourcesStore } from '@/stores/changeOrderResources'
import { useLaborChangeOrderItemsStore } from '@/stores/laborChangeOrderItems'
import { useChangeOrderPrint } from '@/composables/useChangeOrderPrint'
import { useShipViaStore } from '@/stores/freight'
import { useProjectAddressesStore } from '@/stores/projectAddresses'

const UButton = resolveComponent('UButton')
const UTooltip = resolveComponent('UTooltip')
const UIcon = resolveComponent('UIcon')
const UBadge = resolveComponent('UBadge')
const UPopover = resolveComponent('UPopover')

const { formatDate } = useDateFormat()
const { formatCurrency, formatCurrencyAbbreviated } = useCurrencyFormat()
const { hasPermission, isReady } = usePermissions()

const { pagination, paginationOptions, pageSizeOptions, updatePageSize, getPaginationProps, getPageInfo, shouldShowPagination } = useTableStandard()

const selectedRows = ref<any[]>([])
const globalFilter = ref('')
const selectedStatusFilter = ref<string | null>(null)
const showFormModal = ref(false)
const saving = ref(false)
const loadingDetail = ref(false)
const loadingRowUuid = ref<string | null>(null)
const coForm = ref<any>({})
const showDeleteModal = ref(false)
const coToDelete = ref<any>(null)
const showAuditLogModal = ref(false)
const auditLogsCount = ref(0)
const isViewMode = ref(false)

const formModalTitle = computed(() => {
  if (isViewMode.value) return 'View Change Order'
  return coForm.value?.uuid ? 'Edit Change Order' : 'New Change Order'
})

// Status display helpers for form modal
const statusLabel = computed(() => {
  const map: Record<string, string> = {
    Draft: 'Drafting…',
    Ready: 'Ready for approval',
    Approved: 'Change order approved',
    Rejected: 'Change order rejected',
  };
  const status = coForm.value?.status || 'Draft';
  return map[status] || status;
});

const statusChipClass = computed(() => {
  const map: Record<string, string> = {
    Draft:
      'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600',
    Ready:
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
    Approved:
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
    Rejected:
      'bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
  };
  const status = coForm.value?.status || 'Draft';
  return map[status] || map.Draft;
});

// Permissions
const canEdit = computed(() => hasPermission('co_edit') || hasPermission('co_create'))
const canApprove = computed(() => hasPermission('co_approve'))

// Check if CO status should make the form read-only
const isReadOnlyStatus = computed(() => {
  const status = String(coForm.value?.status || '').toLowerCase()
  // Form should be read-only for Approved, Partially_Received, or Completed statuses
  return status === 'approved' || status === 'partially_received' || status === 'completed'
})

// Approval button visibility
const showApprovalButtons = computed(() => {
  if (isViewMode.value) return false
  if (!coForm.value?.uuid) return false
  if (!canApprove.value) return false
  
  // Don't show approval buttons if status is Partially_Received or Completed
  const status = String(coForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return false
  }
  
  // Only show approval buttons when status is Ready
  return coForm.value.status === 'Ready'
})

const showSaveDraftButton = computed(() => {
  if (isViewMode.value) return false
  if (!canEdit.value) return false
  
  // Show locked button if status is Partially_Received or Completed
  const status = String(coForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return true
  }
  
  // If editing an Approved CO, only approvers can save as draft (unapprove)
  if (coForm.value?.uuid && coForm.value.status === 'Approved') {
    return canApprove.value
  }
  
  return true
})

const showMarkReadyButton = computed(() => {
  if (isViewMode.value) return false
  if (!canEdit.value) return false
  
  // Don't show if status is Partially_Received or Completed
  const status = String(coForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return false
  }
  
  // Don't show Mark Ready if already at Ready or Approved status
  if (coForm.value?.uuid && ['Ready', 'Approved'].includes(coForm.value.status)) {
    return false
  }
  return true
})

const showAnySaveButtons = computed(() => 
  !showApprovalButtons.value && (showSaveDraftButton.value || showMarkReadyButton.value)
)

const saveDraftButtonLabel = computed(() => {
  const status = String(coForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return 'Locked'
  }
  if (coForm.value?.uuid && coForm.value.status === 'Approved') {
    return 'Reject'
  }
  return 'Save'
})

const saveDraftButtonIcon = computed(() => {
  const status = String(coForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return 'i-heroicons-lock-closed'
  }
  if (coForm.value?.uuid && coForm.value.status === 'Approved') {
    return 'i-heroicons-arrow-uturn-left'
  }
  return 'i-heroicons-document'
})

const saveDraftButtonColor = computed(() => {
  const status = String(coForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return 'warning'
  }
  if (coForm.value?.uuid && coForm.value.status === 'Approved') {
    return 'error'
  }
  return 'primary'
})

const saveDraftButtonVariant = computed((): 'solid' => {
  return 'solid'
})

const isSaveDraftButtonDisabled = computed(() => {
  if (saving.value) return true
  const status = String(coForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return true
  }
  return false
})

// Use change orders store
import { useChangeOrdersStore } from '@/stores/changeOrders'
const changeOrdersStore = useChangeOrdersStore()
const changeOrders = computed(() => changeOrdersStore.changeOrders)
const loading = computed(() => changeOrdersStore.loading)
// Only show error alert for fetch errors, not delete operation errors
// Delete errors are handled via toast notifications
const error = computed(() => {
  const storeError = changeOrdersStore.error
  // Don't show error alert for delete-related errors (they're handled via toast)
  if (storeError && (storeError.includes('delete') || storeError.includes('Cannot delete'))) {
    return null
  }
  return storeError
})
const corporationStore = useCorporationStore()
const changeOrderResourcesStore = useChangeOrderResourcesStore()
const laborChangeOrderItemsStore = useLaborChangeOrderItemsStore()
const { openChangeOrderPrint } = useChangeOrderPrint()
const shipViaStore = useShipViaStore()
const projectAddressesStore = useProjectAddressesStore()
const table = useTemplateRef<any>('table')

// Watch for corporation changes and fetch change orders
watch(
  () => corporationStore.selectedCorporationId,
  async (newCorpId) => {
    if (newCorpId) {
      await changeOrdersStore.fetchChangeOrders(newCorpId)
    }
  },
  { immediate: true }
)

const generateChangeOrderNumber = () => {
  // Do not override an existing number (e.g., during edit)
  const current = String(coForm.value?.co_number || '').trim()
  if (current) return
  let maxSeq = 0
  const re = /^CO-(\d+)$/i
  ;(changeOrders.value || []).forEach((co: any) => {
    const match = String(co?.co_number || '').match(re)
    if (match) {
      const seq = parseInt(match[1]!)
      if (!Number.isNaN(seq)) maxSeq = Math.max(maxSeq, seq)
    }
  })
  // Generate in simple format: CO-1, CO-2, CO-3, etc. (no padding)
  const next = maxSeq + 1
  coForm.value.co_number = `CO-${next}`
}

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

// Ship via lookup
const shipViaNameByUuid = computed<Record<string, string>>(() => {
  const list = shipViaStore.getAllShipVia || []
  const map: Record<string, string> = {}
  list.forEach((sv: any) => { 
    if (sv?.uuid) {
      map[sv.uuid] = sv.ship_via || sv.uuid
    }
  })
  return map
})

// Address popover state - track which CO's popover is open
const shippingAddressPopoverOpen = ref<Record<string, boolean>>({})

// Status stats computed properties - filter by TopBar's corporation
const allCOStats = computed(() => {
  const filtered = changeOrders.value.filter((c: any) => 
    String(c.corporation_uuid) === String(selectedCorporationId.value)
  )
  return {
    count: filtered.length,
    totalValue: filtered.reduce((sum, c) => sum + (Number(c.total_co_amount) || 0), 0)
  }
})

const draftStats = computed(() => {
  const draftCOs = changeOrders.value.filter((c: any) => 
    (c.status || 'Draft') === 'Draft' && 
    String(c.corporation_uuid) === String(selectedCorporationId.value)
  )
  return {
    count: draftCOs.length,
    totalValue: draftCOs.reduce((sum, c) => sum + (Number(c.total_co_amount) || 0), 0)
  }
})

const readyStats = computed(() => {
  const readyCOs = changeOrders.value.filter((c: any) => 
    c.status === 'Ready' && 
    String(c.corporation_uuid) === String(selectedCorporationId.value)
  )
  return {
    count: readyCOs.length,
    totalValue: readyCOs.reduce((sum, c) => sum + (Number(c.total_co_amount) || 0), 0)
  }
})

const approvedStats = computed(() => {
  const approvedCOs = changeOrders.value.filter((c: any) => 
    c.status === 'Approved' && 
    String(c.corporation_uuid) === String(selectedCorporationId.value)
  )
  return {
    count: approvedCOs.length,
    totalValue: approvedCOs.reduce((sum, c) => sum + (Number(c.total_co_amount) || 0), 0)
  }
})

const rejectedStats = computed(() => {
  const rejectedCOs = changeOrders.value.filter((c: any) => 
    c.status === 'Rejected' && 
    String(c.corporation_uuid) === String(selectedCorporationId.value)
  )
  return {
    count: rejectedCOs.length,
    totalValue: rejectedCOs.reduce((sum, c) => sum + (Number(c.total_co_amount) || 0), 0)
  }
})

const filteredChangeOrders = computed<any[]>(() => {
  // First filter by TopBar's corporation (the list should only show COs for TopBar's corporation)
  let filtered = Array.isArray(changeOrders.value) 
    ? changeOrders.value.filter((c: any) => 
        String(c.corporation_uuid) === String(selectedCorporationId.value)
      )
    : []
  
  // Apply status filter if selected
  if (selectedStatusFilter.value) {
    filtered = filtered.filter((c: any) => c.status === selectedStatusFilter.value)
  }
  
  // Apply text search filter
  const text = globalFilter.value.trim().toLowerCase()
  if (text) {
    filtered = filtered.filter((row: any) =>
      [row.co_number, row.status]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(text))
    )
  }
  
  return filtered
})

const columnPinning = ref({ left: [], right: ['actions'] })

// Status filter methods
const toggleStatusFilter = (status: string) => {
  if (selectedStatusFilter.value === status) {
    selectedStatusFilter.value = null
  } else {
    selectedStatusFilter.value = status
  }
  
  if (table.value?.tableApi) {
    table.value.tableApi.setPageIndex(0)
  }
}

const clearStatusFilter = () => {
  selectedStatusFilter.value = null
  
  if (table.value?.tableApi) {
    table.value.tableApi.setPageIndex(0)
  }
}

// Shipping address methods (must be defined before columns that reference them)
const loadShippingAddress = async (addressUuid: string, projectUuid?: string) => {
  if (!addressUuid) return
  
  // If we have project UUID, fetch all project addresses (they're cached by project)
  if (projectUuid) {
    const existingAddresses = projectAddressesStore.getAddresses(projectUuid)
    if (existingAddresses.length > 0) {
      // Check if the specific address is already loaded
      const address = existingAddresses.find(addr => addr.uuid === addressUuid)
      if (address) {
        return // Already loaded
      }
    }
    
    // Fetch all project addresses (will be cached in store)
    try {
      await projectAddressesStore.fetchAddresses(projectUuid)
    } catch (error) {
      console.error('Error fetching project addresses:', error)
    }
  }
}

const formatShippingAddress = (address: any) => {
  const parts = []
  if (address.address_line_1) parts.push(address.address_line_1)
  if (address.address_line_2) parts.push(address.address_line_2)
  const cityStateZip = [address.city, address.state, address.zip_code].filter(Boolean).join(', ')
  if (cityStateZip) parts.push(cityStateZip)
  if (address.country) parts.push(address.country)
  return parts.join('\n') || 'No address'
}

const renderShippingAddressPopover = (addressUuid: string, projectUuid?: string) => {
  let address: any = null
  
  // Try to find the address from project addresses if we have project UUID
  if (projectUuid) {
    const addresses = projectAddressesStore.getAddresses(projectUuid)
    address = addresses.find(addr => addr.uuid === addressUuid)
  }
  
  if (!address) {
    return h('div', { class: 'p-4 w-80' }, [
      h('div', { class: 'text-sm text-gray-500 dark:text-gray-400' }, 'Address not found')
    ])
  }
  
  return h('div', { class: 'p-4 w-80' }, [
    h('div', { class: 'text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3' }, 'Shipping Address'),
    h('div', { 
      class: 'mb-4 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0 last:mb-0'
    }, [
      // Header with icon and label
      h('div', { class: 'flex items-center gap-2 mb-2' }, [
        h(UIcon, { 
          name: 'i-heroicons-truck', 
          class: 'w-4 h-4 text-info' 
        }),
        h('div', { class: 'text-xs font-semibold text-info' }, 'Shipping Address')
      ]),
      // Address content
      h('div', { class: 'text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line mb-2' }, formatShippingAddress(address)),
      // Contact information
      ...(address.contact_person || address.phone || address.email ? [
        h('div', { class: 'space-y-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700' }, [
          ...(address.contact_person ? [
            h('div', { class: 'text-xs text-gray-500 dark:text-gray-500' }, `Contact: ${address.contact_person}`)
          ] : []),
          ...(address.phone ? [
            h('div', { class: 'text-xs text-gray-500 dark:text-gray-500' }, `Phone: ${address.phone}`)
          ] : []),
          ...(address.email ? [
            h('div', { class: 'text-xs text-gray-500 dark:text-gray-500' }, `Email: ${address.email}`)
          ] : [])
        ])
      ] : [])
    ])
  ])
}

const columns = computed<TableColumn<any>[]>(() => [
  {
    accessorKey: 'created_date',
    header: 'Created Date',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', formatDate(row.original.created_date))
  },
  {
    accessorKey: 'co_number',
    header: 'CO Number',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-medium text-default' }, row.original.co_number || 'N/A')
  },
  {
    accessorKey: 'project_name',
    header: 'Project Name',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.project_name || 'N/A')
  },
  {
    accessorKey: 'project_id',
    header: 'Project Number',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.project_id || 'N/A')
  },
  {
    accessorKey: 'vendor_name',
    header: 'Vendor Name',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.vendor_name || 'N/A')
  },
  {
    accessorKey: 'po_number',
    header: 'Original Order',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.po_number || 'N/A')
  },
  {
    accessorKey: 'ship_via_uuid',
    header: 'Shipped Via',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const uuid = row.original.ship_via_uuid
      const label = uuid ? (shipViaNameByUuid.value[uuid] || row.original.ship_via || 'N/A') : (row.original.ship_via || 'N/A')
      return h('div', label)
    }
  },
  {
    accessorKey: 'shipping_address_uuid',
    header: 'Shipped To',
    enableSorting: false,
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }: { row: { original: any } }) => {
      const coUuid = row.original.uuid
      const shippingAddressUuid = row.original.shipping_address_uuid
      const isOpen = shippingAddressPopoverOpen.value[coUuid] || false
      
      if (!shippingAddressUuid) {
        return h('div', { class: 'flex justify-center' }, 'N/A')
      }
      
      return h('div', { class: 'flex justify-center' }, [
        h(UPopover, {
          open: isOpen,
          'onUpdate:open': (value: boolean) => {
            shippingAddressPopoverOpen.value[coUuid] = value
            if (value && shippingAddressUuid) {
              // Lazy load shipping address when popover opens
              loadShippingAddress(shippingAddressUuid, row.original.project_uuid)
            }
          }
        }, {
          default: () => h(UButton, {
            icon: 'i-heroicons-map-pin',
            size: 'xs',
            variant: 'ghost',
            color: 'neutral',
            class: 'hover:scale-105 transition-transform'
          }),
          content: () => renderShippingAddressPopover(shippingAddressUuid, row.original.project_uuid)
        })
      ])
    }
  },
  {
    accessorKey: 'co_type',
    header: 'CO Type',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.co_type || 'N/A')
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const rawStatus = row.original.status || 'Draft'
      // Normalize status for case-insensitive matching (handle both Partially_Received and Partially_received)
      const normalizedStatus = String(rawStatus).toLowerCase()
      
      const statusMap: Record<string, { label: string; color: string }> = {
        draft: {
          label: 'Pending',
          color: 'warning'
        },
        ready: {
          label: 'To be approved',
          color: 'primary'
        },
        approved: {
          label: 'Purchase order approved',
          color: 'success'
        },
        rejected: {
          label: 'Purchase order rejected',
          color: 'error'
        },
        partially_received: {
          label: 'Partially Received',
          color: 'info'
        },
        completed: {
          label: 'Completed',
          color: 'success'
        }
      }
      
      const config = statusMap[normalizedStatus] ?? {
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
    accessorKey: 'total_co_amount',
    header: 'Total Amount',
    enableSorting: false,
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }: { row: { original: any } }) => {
      const amount = row.original.total_co_amount || 0
      return h('div', { class: 'text-right font-mono text-sm' }, formatCurrency(amount))
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
    meta: { class: { th: 'text-right sticky right-0 z-10 w-32', td: 'text-right sticky right-0 w-32' } },
    cell: ({ row }: { row: { original: any } }) => {
      const isRowLoading = loadingRowUuid.value === row.original.uuid
      const buttons: any[] = []
      
      if (isRowLoading) {
        buttons.push(
          h(UIcon, {
            name: 'i-heroicons-arrow-path',
            class: 'w-4 h-4 animate-spin text-primary'
          })
        )
      } else {
        // View button - show if user has view permission
        if (hasPermission('co_view')) {
          buttons.push(
            h(UTooltip, { text: 'View Change Order Details' }, () => [
              h(UButton, {
                icon: 'i-heroicons-eye-solid',
                size: 'xs',
                variant: 'soft',
                color: 'neutral',
                class: 'hover:scale-105 transition-transform',
                onClick: () => previewChangeOrder(row.original),
              }, () => '')
            ])
          )
        }
        
        // Edit button - show if user has edit permission
        if (hasPermission('co_edit')) {
          buttons.push(
            h(UTooltip, { text: 'Edit Change Order' }, () => [
              h(UButton, {
                icon: 'tdesign:edit-filled',
                size: 'xs',
                variant: 'soft',
                color: 'secondary',
                class: 'hover:scale-105 transition-transform',
                onClick: () => editChangeOrder(row.original),
              }, () => '')
            ])
          )
        }
        
        // Delete button - show if user has delete permission
        if (hasPermission('co_delete')) {
          buttons.push(
            h(UTooltip, { text: 'Delete Change Order' }, () => [
              h(UButton, {
                icon: 'mingcute:delete-fill',
                size: 'xs',
                variant: 'soft',
                color: 'error',
                class: 'hover:scale-105 transition-transform',
                onClick: () => deleteChangeOrder(row.original),
              }, () => '')
            ])
          )
        }
      }
      return h('div', { class: 'flex justify-end space-x-2 items-center' }, buttons)
    }
  }
])

const openCreateModal = () => {
  // Clear previous CO resources before opening new form
  changeOrderResourcesStore.clear()
  
  isViewMode.value = false
  // Initialize form with corporation_uuid from form selector or fallback to TopBar's selected
  // This ensures the form starts with the correct corporation context
  coForm.value = {
    corporation_uuid: corporationStore.selectedCorporationId || '',
    co_number: '',
    created_date: new Date().toISOString(),
    status: 'Draft',
    co_type: '',
    credit_days: '',
    ship_via: '',
    freight: '',
    shipping_instructions: '',
    estimated_delivery_date: '',
    requested_by: '',
    reason: '',
    item_total: 0,
    total_amount: 0,
    co_items: [],
    attachments: [],
    removed_co_items: [],
  }
  // Auto-generate CO number
  generateChangeOrderNumber()
  showFormModal.value = true
}

const loadChangeOrderForModal = async (co: any, viewMode: boolean = false) => {
  if (!co?.uuid) {
    console.warn('[COL] loadChangeOrderForModal called without UUID', co)
    return
  }

  // Clear previous CO resources before loading a different CO
  changeOrderResourcesStore.clear()

  // Set initial form data from row
  coForm.value = { ...co }
  isViewMode.value = viewMode
  
  // Open modal immediately
  showFormModal.value = true
  loadingDetail.value = true
  loadingRowUuid.value = co.uuid
  
  try {
    const detailed = await changeOrdersStore.fetchChangeOrder(co.uuid)
    if (!detailed) {
      const toast = useToast();
      toast.add({
        title: "Error",
        description: "Failed to load change order details.",
        color: "error",
      });
      return;
    }

    coForm.value = {
      ...detailed,
      audit_log: Array.isArray(detailed.audit_log) ? detailed.audit_log : [],
    };
  } catch (error) {
    console.error("[COL] Failed to fetch change order details:", error);
    const toast = useToast();
    toast.add({
      title: "Error",
      description: "Failed to load change order details.",
      color: "error",
    });
  } finally {
    loadingDetail.value = false
    loadingRowUuid.value = null
  }
}

const editChangeOrder = async (co: any) => {
  if (!hasPermission('co_edit')) {
    try {
      const toast = useToast();
      toast.add({
        title: "Access Denied",
        description: "You don't have permission to edit change orders.",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
    } catch (error) {
      console.error('Error showing toast:', error);
    }
    return;
  }
  await loadChangeOrderForModal(co, false)
}

const previewChangeOrder = async (co: any) => {
  if (!hasPermission('co_view')) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to view change order details.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }
  
  await loadChangeOrderForModal(co, true)
}

const switchToEditMode = () => {
  if (!hasPermission('co_edit')) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to edit change orders.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }
  isViewMode.value = false
}

const closeFormModal = () => {
  changeOrderResourcesStore.clear()
  showFormModal.value = false
  isViewMode.value = false
  coForm.value = {}
  loadingDetail.value = false
  loadingRowUuid.value = null
}

// Print handler
const handlePrintChangeOrder = () => {
  if (!coForm.value?.uuid) return
  if (!hasPermission('co_view')) {
    const toast = useToast()
    toast.add({
      title: 'Access Denied',
      description: "You don't have permission to view change orders.",
      color: 'error',
      icon: 'i-heroicons-x-circle'
    })
    return
  }
  openChangeOrderPrint(coForm.value.uuid)
}

// Status transition methods
const submitWithStatus = async (status: string) => {
  coForm.value.status = status
  await saveChangeOrder()
}

const handleSaveAsDraft = () => submitWithStatus('Draft')
const handleMarkReady = () => submitWithStatus('Ready')

const handleApprove = async () => {
  await submitWithStatus('Approved')
}

const handleApproveAndRaise = async () => {
  // Approve and potentially trigger additional workflow
  await submitWithStatus('Approved')
  // TODO: Add additional logic for "raise" action if needed
}

const handleRejectToDraft = () => submitWithStatus('Draft')

const saveChangeOrder = async () => {
  // Determine the correct corporation_uuid to use
  // For new COs: use coForm.value.corporation_uuid (from form selector) or fallback to TopBar's selected
  // For editing: use coForm.value.corporation_uuid (from form, which should match the loaded CO's corporation)
  // This ensures we save to the correct corporation, not the one selected in TopBar
  const corporationUuid = coForm.value.corporation_uuid || corporationStore.selectedCorporationId

  if (!corporationUuid) {
    const toast = useToast();
    toast.add({ title: 'Error', description: 'Corporation is required to save change order', color: 'error' })
    return
  }

  saving.value = true
  try {
    const payload = { ...coForm.value }
    
    // Ensure corporation_uuid is set from form (prioritize form's value)
    payload.corporation_uuid = corporationUuid
    
    // Ensure labor_co_items is always included for LABOR change orders
    if (payload.co_type === 'LABOR') {
      // Collect labor_co_items from both form and store (when editing)
      let laborItems: any[] = []
      
      // First, get items from form (these have any unsaved changes)
      const formItems = Array.isArray(coForm.value.labor_co_items) ? coForm.value.labor_co_items : []
      
      // If editing existing CO, also check store for saved items
      if (payload.uuid) {
        const savedItems = laborChangeOrderItemsStore.getItemsByChangeOrder(String(payload.uuid))
        
        // Create a map starting with saved items (they have the actual saved values)
        const itemsMap = new Map<string, any>()
        savedItems.forEach((item: any) => {
          const key = String(item?.cost_code_uuid || '')
          if (key) {
            itemsMap.set(key, {
              cost_code_uuid: item.cost_code_uuid,
              cost_code_number: item.cost_code_number,
              cost_code_name: item.cost_code_name,
              cost_code_label: item.cost_code_label,
              division_name: item.division_name,
              po_amount: item.po_amount,
              co_amount: item.co_amount,
              order_index: item.order_index,
              uuid: item.uuid,
            })
          }
        })
        
        // Override with form items if they exist (for unsaved changes)
        formItems.forEach((item: any) => {
          const key = String(item?.cost_code_uuid || '')
          if (key) {
            itemsMap.set(key, {
              cost_code_uuid: item.cost_code_uuid,
              cost_code_number: item.cost_code_number,
              cost_code_name: item.cost_code_name,
              cost_code_label: item.cost_code_label,
              division_name: item.division_name,
              po_amount: item.po_amount,
              co_amount: item.co_amount,
              order_index: item.order_index,
              uuid: item.uuid,
            })
          }
        })
        
        laborItems = Array.from(itemsMap.values())
      } else {
        // For new CO, just use form items
        laborItems = formItems.map((item: any) => ({
          cost_code_uuid: item.cost_code_uuid,
          cost_code_number: item.cost_code_number,
          cost_code_name: item.cost_code_name,
          cost_code_label: item.cost_code_label,
          division_name: item.division_name,
          po_amount: item.po_amount,
          co_amount: item.co_amount,
          order_index: item.order_index,
          uuid: item.uuid,
        }))
      }
      
      // Always set labor_co_items in payload (even if empty array)
      // This ensures the API knows to update/preserve labor items
      payload.labor_co_items = laborItems
    }
    
    let result = null
    if (payload.uuid) {
      result = await changeOrdersStore.updateChangeOrder(payload)
    } else {
      result = await changeOrdersStore.createChangeOrder(payload)
    }
    
    if (result) {
      // The store handles adding/updating the item in the array if it matches TopBar's corporation
      // and marks the data as stale by deleting from hasDataForCorporation.
      // Fetch change orders for TopBar's corporation (without forceRefresh) so it:
      // 1. Checks if data is stale (it will be, since we marked it as stale)
      // 2. Loads from IndexedDB first if available (for quick display)
      // 3. Then fetches from API to get fresh data
      // This matches the strategy used in PurchaseOrdersList
      if (selectedCorporationId.value) {
        await changeOrdersStore.fetchChangeOrders(selectedCorporationId.value, false)
      }
      
      // Close modal immediately after successful save
      closeFormModal()
    } else {
      const toast = useToast();
      toast.add({ title: 'Error', description: 'Failed to save change order', color: 'error' })
    }
  } finally {
    saving.value = false
  }
}

const deleteChangeOrder = (co: any) => {
  if (!hasPermission('co_delete')) {
    try {
      const toast = useToast();
      toast.add({
        title: "Access Denied",
        description: "You don't have permission to delete change orders.",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
    } catch (error) {
      console.error('Error showing toast:', error);
    }
    return;
  }

  coToDelete.value = co
  showDeleteModal.value = true
}

// Helper function to clean error messages
const getCleanMessage = (msg: string | undefined): string => {
  if (!msg) return ''
  let clean = msg
  // Remove [METHOD] "URL": statusCode patterns like [DELETE] "/api/change-orders?uuid=...": 400
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
  if (!hasPermission('co_delete')) {
    try {
      const toast = useToast();
      toast.add({
        title: "Access Denied",
        description: "You don't have permission to delete change orders.",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
    } catch (error) {
      console.error('Error showing toast:', error);
    }
    return;
  }

  if (!coToDelete.value) return

  try {
    const success = await changeOrdersStore.deleteChangeOrder(coToDelete.value.uuid)

    if (success) {
      const toast = useToast();
      toast.add({
        title: "Success",
        description: "Change order deleted successfully",
        color: "success",
        icon: "i-heroicons-check-circle",
      });
      showDeleteModal.value = false
      coToDelete.value = null
    } else {
      // If deleteChangeOrder returns false, check the error from the store
      const storeError = changeOrdersStore.error || 'Failed to delete change order'
      const toast = useToast();
      toast.add({
        title: "Error",
        description: getCleanMessage(storeError) || "Failed to delete change order",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
      // Clear the store error after handling it so it doesn't affect the table display
      changeOrdersStore.error = null
    }
  } catch (error: any) {
    console.error('Error deleting change order:', error)
    // Clear the store error after handling it so it doesn't affect the table display
    changeOrdersStore.error = null
    
    const toast = useToast();
    let errorDescription = 'Failed to delete change order'
    
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
  }
}

const cancelDelete = () => {
  showDeleteModal.value = false
  coToDelete.value = null
}

// Audit log handlers
const onAuditLogsLoaded = (logs: any[]) => {
  auditLogsCount.value = logs.length
}

const onAuditLogError = (error: string) => {
  console.error('Audit log error:', error)
  const toast = useToast()
  toast.add({
    title: 'Error',
    description: error || 'Failed to load audit log',
    color: 'error',
    icon: 'i-heroicons-x-circle'
  })
}

// Load ship via data on mount
onMounted(async () => {
  try {
    await shipViaStore.fetchShipVia()
  } catch (error) {
    console.error('Error fetching ship via:', error)
  }
})

// Watch modal close to ensure cleanup happens regardless of how it's closed
// (ESC key, click outside modal, or clicking X button)
watch(showFormModal, (isOpen, wasOpen) => {
  // If modal just closed, ensure cleanup happens
  if (wasOpen && !isOpen) {
    changeOrderResourcesStore.clear()
    isViewMode.value = false
    coForm.value = {}
    loadingDetail.value = false
    loadingRowUuid.value = null
  }
});
</script>


