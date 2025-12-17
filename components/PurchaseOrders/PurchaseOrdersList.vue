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
            Summary ({{ allPOStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(allPOStats.totalValue) }}
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
      </div>
      
      <!-- Add New Button -->
      <UButton
        icon="i-heroicons-plus"
        color="primary"
        size="xs"
        @click="openCreateModal"
      >
        Add new PO
      </UButton>
    </div>

    <!-- Filters -->
    <div v-if="isReady && !loading" class="mb-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
        <!-- Project Filter -->
        <div class="flex items-center gap-2">
          <label class="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Project</label>
          <ProjectSelect
            v-model="filterProject"
            :corporation-uuid="selectedCorporationId || undefined"
            placeholder="All Projects"
            size="sm"
            class="flex-1"
          />
        </div>
        
        <!-- Vendor Filter -->
        <div class="flex items-center gap-2">
          <label class="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Vendor</label>
          <VendorSelect
            v-model="filterVendor"
            :corporation-uuid="selectedCorporationId || undefined"
            placeholder="All Vendors"
            size="sm"
            class="flex-1"
          />
        </div>
        
        <!-- Location Filter -->
        <div class="flex items-center gap-2">
          <label class="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Location</label>
          <USelect
            v-model="filterLocation"
            :items="uniqueLocations.map(loc => ({ label: loc, value: loc }))"
            placeholder="All Locations"
            size="sm"
            variant="outline"
            clearable
            class="flex-1"
          />
        </div>
        
        <!-- Status Filter -->
        <div class="flex items-center gap-2">
          <label class="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Status</label>
          <USelect
            v-model="filterStatus"
            :items="statusOptions"
            placeholder="All Statuses"
            size="sm"
            variant="outline"
            clearable
            class="flex-1"
          />
        </div>
        
        <!-- Show Results Button -->
        <div>
          <UButton
            color="primary"
            size="sm"
            @click="handleShowResults"
          >
            Show Results
          </UButton>
        </div>
      </div>
    </div>

    <!-- Purchase Orders Table -->
    <div v-if="loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Loading skeleton -->
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-11 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-6" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-24" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-24" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
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
            <div class="grid grid-cols-11 gap-4 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 border-gray-100 dark:border-gray-700">
              <div class="flex items-center">
                <USkeleton class="h-4 w-6" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
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
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-16" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
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

    <!-- Error Banner - shown above table without hiding it -->
    <UBanner
      v-if="error && isReady"
      icon="i-heroicons-exclamation-triangle"
      color="error"
      :title="error"
      close
      @close="handleErrorBannerClose"
      class="mb-4"
    />

    <div v-if="purchaseOrders.length && hasPermission('po_view') && isReady">
      <UTable 
        ref="table"
        sticky
        v-model:column-pinning="columnPinning"
        v-model:expanded="expanded"
        :data="filteredPurchaseOrders" 
        :columns="columns"
        v-model:selected="selectedPurchaseOrders"
        :selectable="true"
        :watch-options="{ deep: false }"
      >
        <template #expanded="{ row }">
          <!-- Don't show breakdown for labor purchase orders -->
          <div v-if="String(row.original.po_type || '').toUpperCase() !== 'LABOR'">
            <POBreakdown :po-uuid="row.original.uuid" :po-data="row.original" />
          </div>
        </template>
      </UTable>
    </div>

    <div v-else-if="!hasPermission('po_view') && isReady" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-lock-closed" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg">Access Denied</p>
      <p class="text-gray-400 text-sm">You don't have permission to view purchase orders</p>
    </div>

    <div v-else-if="isReady" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-shopping-cart" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg">No purchase orders found</p>
      <p class="text-gray-400 text-sm mb-6">Create your first purchase order to get started</p>
      <UButton 
        v-if="hasPermission('po_create')"
        icon="i-heroicons-plus" 
        @click="openCreateModal"
      >
        Add Purchase Order
      </UButton>
    </div>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" :title="'Delete Purchase Order'">
      <template #body>
        <div class="p-6">
          <div class="flex items-center mb-4">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-500 mr-3" />
            <div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Delete Purchase Order</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
            </div>
          </div>
          
          <div v-if="poToDelete" class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
            <p class="text-sm text-gray-700 dark:text-gray-300">
              <strong>PO Number:</strong> {{ poToDelete.po_number || 'N/A' }}<br>
              <strong>Entry Date:</strong> {{ formatDate(poToDelete.entry_date) }}<br>
              <strong>Type:</strong> {{ poToDelete.po_type || 'N/A' }}<br>
              <strong>Total Amount:</strong> {{ formatCurrency(poToDelete.total_po_amount || 0) }}<br>
              <strong>Status:</strong> {{ poToDelete.status || 'Draft' }}
            </p>
          </div>
          
          <p class="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this purchase order? This will permanently remove the purchase order and all associated data.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="soft" @click="cancelDelete">
            Cancel
          </UButton>
          <UButton color="error" @click="confirmDelete">
            Delete Purchase Order
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Create/Edit/View Purchase Order Modal -->
    <UModal v-model:open="showFormModal" :title="formModalTitle" fullscreen scrollable>
      <template #header>
        <div class="flex items-center justify-between w-full gap-4">
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
          <div class="flex-1 flex justify-center min-w-0">
            <UButton
              v-if="poForm.uuid"
              color="info"
              variant="solid"
              icon="i-heroicons-printer"
              size="sm"
              @click="handlePrintPurchaseOrder"
            >
              Print
            </UButton>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <div class="flex items-center gap-2">
              <UButton
                v-if="isViewMode && hasPermission('po_edit') && poForm.value?.status !== 'Approved'"
                type="button"
                color="primary"
                icon="tdesign:edit-filled"
                size="sm"
                @click="switchToEditMode"
              >
                Edit Purchase Order
              </UButton>

              <!-- Approval buttons for Ready status -->
              <template v-if="!isViewMode && showApprovalButtons">
                <UButton
                  data-testid="btn-reject-draft"
                  color="error"
                  variant="soft"
                  icon="i-heroicons-arrow-uturn-left"
                  size="sm"
                  :disabled="savingPO || !isFormValid"
                  :loading="savingPO"
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
                  :disabled="savingPO || !isFormValid"
                  :loading="savingPO"
                  @click="handleApproveAndRaise"
                >
                  Approve
                </UButton>
              </template>

              <!-- Regular save buttons for Draft and other statuses -->
              <template v-else-if="!isViewMode && showAnySaveButtons">
                <UTooltip
                  v-if="showSaveDraftButton && isReadOnlyStatus"
                  text="This purchase order contains received items and cannot be edited. All fields are read-only."
                >
                  <UButton
                    v-if="showSaveDraftButton"
                    data-testid="btn-save-draft"
                    :color="saveDraftButtonColor"
                    :variant="saveDraftButtonVariant"
                    :icon="saveDraftButtonIcon"
                    size="sm"
                    :disabled="isEstimateImportBlocked || isSaveDraftButtonDisabled || !isFormValid"
                    :loading="savingPO"
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
                  :disabled="isEstimateImportBlocked || savingPO || !isFormValid"
                  :loading="savingPO"
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
                  :disabled="isEstimateImportBlocked || savingPO || !isFormValid"
                  :loading="savingPO"
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
        <PurchaseOrderForm
          v-model:form="poForm"
          :editing-purchase-order="!!poForm.uuid"
          :loading="loadingEditPO"
          :readonly="isViewMode || isReadOnlyStatus"
          @estimate-import-blocked-change="isEstimateImportBlocked = $event"
          @validation-change="isFormValid = $event"
        />
      </template>
    </UModal>

    <!-- Exceeded Quantity Confirmation Modal -->
    <UModal v-model:open="showExceededQuantityModal" title="Items Exceeding Estimate">
      <template #header>
        <div class="flex items-center justify-between w-full gap-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Items Exceeding Estimate
          </h3>
          <UTooltip text="Close Modal" color="neutral">
            <UButton
              color="neutral"
              variant="solid"
              icon="i-heroicons-x-mark"
              size="sm"
              @click="closeExceededQuantityModal"
            />
          </UTooltip>
        </div>
      </template>
      <template #body>
        <div class="p-6">
          <div class="flex items-center mb-4">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-warning-500 mr-3" />
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Some items have values that exceed the estimated values.
            </p>
          </div>

          <div v-if="exceededItems.length" class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
            <div class="space-y-2">
              <div
                v-for="(item, index) in exceededItems"
                :key="index"
                class="text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0"
              >
                <div class="font-medium">
                  {{ item.item_type === 'labor' 
                    ? (item.cost_code_label || item.cost_code_name || `Cost Code ${index + 1}`)
                    : (item.name || item.description || `Item ${index + 1}`)
                  }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1" v-if="item.item_type === 'labor'">
                  Estimate Amount: {{ formatCurrency(item.labor_budgeted_amount || item.estimate_amount || 0) }} | 
                  PO Amount: {{ formatCurrency(item.po_amount || 0) }} | 
                  Exceeded: <span class="font-semibold text-warning-600">{{ formatCurrency(item.exceeded_amount || 0) }}</span>
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1" v-else>
                  Estimate Qty: {{ item.estimate_quantity }} | PO Qty: {{ item.po_quantity }} | 
                  Exceeded: <span class="font-semibold text-warning-600">{{ item.exceeded_quantity }}</span>
                </div>
              </div>
            </div>
          </div>

          <p class="text-gray-600 dark:text-gray-400 mb-4">
            Would you like to:
          </p>
          <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-1">
            <li><strong>Continue saving</strong> - Save the purchase order as is with exceeded values</li>
            <li><strong>Raise a change order</strong> - Create a change order for the exceeded values</li>
          </ul>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="warning" variant="solid" @click="handleContinueSavingPO">
            Save PO with exceeded values
          </UButton>
          <UButton color="primary" variant="solid" @click="handleRaiseChangeOrder">
            Raise CO for exceeded values
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Change Order Form Modal (for exceeded quantities) -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, watch, onMounted, nextTick, useTemplateRef, resolveComponent } from "vue";
import { useRouter } from 'vue-router'
import PurchaseOrderForm from '@/components/PurchaseOrders/PurchaseOrderForm.vue'
import { useCorporationStore } from '@/stores/corporations'
import { usePurchaseOrdersStore } from '@/stores/purchaseOrders'
import { useTableStandard } from '@/composables/useTableStandard'
import { useDateFormat } from '@/composables/useDateFormat'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import { useUTCDateFormat } from '@/composables/useUTCDateFormat'
import { usePermissions } from '@/composables/usePermissions'
import type { TableColumn } from '@nuxt/ui'
import { usePurchaseOrderResourcesStore } from '@/stores/purchaseOrderResources'
import { useChangeOrdersStore } from '@/stores/changeOrders'
import { usePurchaseOrderPrint } from '@/composables/usePurchaseOrderPrint'
import { useProjectsStore } from '@/stores/projects'
import { useVendorStore } from '@/stores/vendors'
import ProjectSelect from '@/components/Shared/ProjectSelect.vue'
import VendorSelect from '@/components/Shared/VendorSelect.vue'
import POBreakdown from '@/components/PurchaseOrders/POBreakdown.vue'

// Resolve components for table columns
const UButton = resolveComponent('UButton')
const UTooltip = resolveComponent('UTooltip')
const UIcon = resolveComponent('UIcon')
const UBadge = resolveComponent('UBadge')

// Router
const router = useRouter()

// Stores
const corporationStore = useCorporationStore()
const purchaseOrdersStore = usePurchaseOrdersStore()
const changeOrdersStore = useChangeOrdersStore()
const projectsStore = useProjectsStore()
const vendorStore = useVendorStore()
const { formatDate } = useDateFormat()
const { formatCurrency, formatCurrencyAbbreviated } = useCurrencyFormat()
const { toUTCString, getCurrentLocal } = useUTCDateFormat()

// Use permissions composable
const { hasPermission, isReady } = usePermissions()
const purchaseOrderResourcesStore = usePurchaseOrderResourcesStore()
const { openPurchaseOrderPrint } = usePurchaseOrderPrint()

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
const selectedPurchaseOrders = ref<any[]>([])
const selectedStatusFilter = ref<string | null>(null)
// Filter state (temporary - not applied until Show Results is clicked)
const filterProject = ref<string | undefined>(undefined)
const filterVendor = ref<string | undefined>(undefined)
const filterLocation = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)
// Applied filters (only applied when Show Results is clicked)
const appliedFilters = ref({
  project: undefined as string | undefined,
  vendor: undefined as string | undefined,
  location: undefined as string | undefined,
  status: undefined as string | undefined
})
// Expanded rows state
const expanded = ref<Record<string, boolean>>({})
const poItemsCache = ref<Record<string, { items: any[], loading: boolean, error: string | null }>>({})
const showDeleteModal = ref(false)
const poToDelete = ref<any>(null)
const showFormModal = ref(false)
const isViewMode = ref(false)
const poForm = ref<any>({
  po_items: [],
  attachments: [],
  removed_po_items: []
})
const savingPO = ref(false)
const loadingEditPO = ref(false)
const loadingRowUuid = ref<string | null>(null)
const isEstimateImportBlocked = ref(false)
const isFormValid = ref(true) // Track form validation state
const showExceededQuantityModal = ref(false)
const exceededItems = ref<any[]>([])
const pendingSaveAction = ref<(() => Promise<void>) | null>(null)
const savingCO = ref(false)

// Column pinning for sticky actions column
const columnPinning = ref({
  left: [],
  right: ['actions']
});

// Table ref for accessing table API
const table = useTemplateRef<any>('table');

// Use purchase orders from store
const purchaseOrders = computed(() => purchaseOrdersStore.purchaseOrders)
const loading = computed(() => purchaseOrdersStore.loading)
// Only show error alert for fetch errors, not delete operation errors
// Delete errors are handled via toast notifications
const error = computed(() => {
  const storeError = purchaseOrdersStore.error
  // Don't show error alert for delete-related errors (they're handled via toast)
  if (storeError && (storeError.includes('delete') || storeError.includes('Cannot delete'))) {
    return null
  }
  return storeError
})
const canEdit = computed(() => hasPermission('po_edit') || hasPermission('po_create'))
const canApprove = computed(() => hasPermission('po_approve'))

// Check if PO status should make the form read-only
const isReadOnlyStatus = computed(() => {
  const status = String(poForm.value?.status || '').toLowerCase()
  // Form should be read-only for Approved, Partially_Received, or Completed statuses
  return status === 'approved' || status === 'partially_received' || status === 'completed'
})

const formModalTitle = computed(() => {
  if (isViewMode.value) return 'View Purchase Order'
  return poForm.value?.uuid ? 'Edit Purchase Order' : 'New Purchase Order'
})

// Approval button visibility
const showApprovalButtons = computed(() => {
  if (isViewMode.value) return false
  if (!poForm.value?.uuid) return false
  if (!canApprove.value) return false
  
  // Don't show approval buttons if status is Partially_Received or Completed
  const status = String(poForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return false
  }
  
  // Only show approval buttons when status is Ready
  return poForm.value.status === 'Ready'
})

const showSaveDraftButton = computed(() => {
  if (isViewMode.value) return false
  if (!canEdit.value) return false
  
  // Show locked button if status is Partially_Received or Completed
  const status = String(poForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return true
  }
  
  // If editing an Approved PO, only approvers can save as draft (unapprove)
  if (poForm.value?.uuid && poForm.value.status === 'Approved') {
    return canApprove.value
  }
  
  return true
})

const showMarkReadyButton = computed(() => {
  if (isViewMode.value) return false
  if (!canEdit.value) return false
  
  // Don't show if status is Partially_Received or Completed
  const status = String(poForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return false
  }
  
  // Don't show if status is already Ready or Approved
  if (poForm.value.status === 'Ready' || poForm.value.status === 'Approved') {
    return false
  }
  
  return true
})

const showAnySaveButtons = computed(() => 
  !showApprovalButtons.value && (showSaveDraftButton.value || showMarkReadyButton.value)
)

const saveDraftButtonLabel = computed(() => {
  const status = String(poForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return 'Locked'
  }
  if (poForm.value?.uuid && poForm.value.status === 'Approved') {
    return 'Reject'
  }
  return 'Save'
})

const saveDraftButtonIcon = computed(() => {
  const status = String(poForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return 'i-heroicons-lock-closed'
  }
  if (poForm.value?.uuid && poForm.value.status === 'Approved') {
    return 'i-heroicons-arrow-uturn-left'
  }
  return 'i-heroicons-document'
})

const saveDraftButtonColor = computed(() => {
  const status = String(poForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return 'warning'
  }
  if (poForm.value?.uuid && poForm.value.status === 'Approved') {
    return 'error'
  }
  return 'primary'
})

const saveDraftButtonVariant = computed((): 'solid' => {
  return 'solid'
})

const isSaveDraftButtonDisabled = computed(() => {
  if (savingPO.value) return true
  const status = String(poForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return true
  }
  return false
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
const allPOStats = computed(() => {
  return {
    count: purchaseOrders.value.length,
    totalValue: purchaseOrders.value.reduce((sum, po) => sum + (Number(po.total_po_amount) || 0), 0)
  }
})

const draftStats = computed(() => {
  const draftPOs = purchaseOrders.value.filter(p => (p.status || 'Draft') === 'Draft')
  return {
    count: draftPOs.length,
    totalValue: draftPOs.reduce((sum, p) => sum + (Number(p.total_po_amount) || 0), 0)
  }
})

const readyStats = computed(() => {
  const readyPOs = purchaseOrders.value.filter(p => p.status === 'Ready')
  return {
    count: readyPOs.length,
    totalValue: readyPOs.reduce((sum, p) => sum + (Number(p.total_po_amount) || 0), 0)
  }
})

const approvedStats = computed(() => {
  const approvedPOs = purchaseOrders.value.filter(p => p.status === 'Approved')
  return {
    count: approvedPOs.length,
    totalValue: approvedPOs.reduce((sum, p) => sum + (Number(p.total_po_amount) || 0), 0)
  }
})

const rejectedStats = computed(() => {
  const rejectedPOs = purchaseOrders.value.filter(p => p.status === 'Rejected')
  return {
    count: rejectedPOs.length,
    totalValue: rejectedPOs.reduce((sum, p) => sum + (Number(p.total_po_amount) || 0), 0)
  }
})

// Get unique values for filter dropdowns
const uniqueProjects = computed(() => {
  const projects = new Map<string, { uuid: string; name: string }>()
  purchaseOrders.value.forEach(po => {
    if (po.project_uuid && po.project_name) {
      projects.set(po.project_uuid, { uuid: po.project_uuid, name: po.project_name })
    }
  })
  return Array.from(projects.values()).sort((a, b) => a.name.localeCompare(b.name))
})

const uniqueVendors = computed(() => {
  const vendors = new Map<string, { uuid: string; name: string }>()
  purchaseOrders.value.forEach(po => {
    if (po.vendor_uuid && po.vendor_name) {
      vendors.set(po.vendor_uuid, { uuid: po.vendor_uuid, name: po.vendor_name })
    }
  })
  return Array.from(vendors.values()).sort((a, b) => a.name.localeCompare(b.name))
})

const uniqueLocations = computed(() => {
  const locations = new Set<string>()
  purchaseOrders.value.forEach(po => {
    if (po.po_items && Array.isArray(po.po_items)) {
      po.po_items.forEach((item: any) => {
        if (item.location) {
          locations.add(item.location)
        }
      })
    }
    // Also check shipping address if available
    if ((po as any).shipping_address_custom) {
      locations.add((po as any).shipping_address_custom)
    }
  })
  return Array.from(locations).sort()
})

const statusOptions = [
  { label: 'Draft', value: 'Draft' },
  { label: 'Ready', value: 'Ready' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Rejected', value: 'Rejected' },
  { label: 'Partially Received', value: 'Partially_Received' },
  { label: 'Completed', value: 'Completed' }
]

const filteredPurchaseOrders = computed(() => {
  let filtered = [...purchaseOrders.value]
  
  // Apply status filter from stats cards if selected
  if (selectedStatusFilter.value) {
    filtered = filtered.filter(p => p.status === selectedStatusFilter.value)
  }
  
  // Apply filter panel filters (only when Show Results is clicked)
  if (appliedFilters.value.project) {
    filtered = filtered.filter(p => p.project_uuid === appliedFilters.value.project)
  }
  
  if (appliedFilters.value.vendor) {
    filtered = filtered.filter(p => p.vendor_uuid === appliedFilters.value.vendor)
  }
  
  if (appliedFilters.value.location) {
    filtered = filtered.filter(p => {
      // Check if any PO item has this location
      if (p.po_items && Array.isArray(p.po_items)) {
        return p.po_items.some((item: any) => item.location === appliedFilters.value.location)
      }
      // Or check shipping address
      return (p as any).shipping_address_custom === appliedFilters.value.location
    })
  }
  
  if (appliedFilters.value.status) {
    filtered = filtered.filter(p => p.status === appliedFilters.value.status)
  }
  
  return filtered
})

// Show Results button handler
const handleShowResults = () => {
  appliedFilters.value = {
    project: filterProject.value,
    vendor: filterVendor.value,
    location: filterLocation.value,
    status: filterStatus.value
  }
}

// Table columns configuration
const columns: TableColumn<any>[] = [
  {
    id: 'expand',
    header: '',
    enableSorting: false,
    cell: ({ row }: { row: { original: any; id?: string } }) => {
      // Don't show expand button for labor purchase orders
      const poType = String(row.original.po_type || '').toUpperCase()
      const isLaborPO = poType === 'LABOR'
      
      if (isLaborPO) {
        // Return empty div for labor POs
        return h('div', { class: 'w-6' }) // Maintain spacing
      }
      
      const rowId = (row.id || row.original.uuid) as string
      const isExpanded = expanded.value[rowId] || false
      return h(UButton, {
        color: 'primary',
        variant: isExpanded ? 'solid' : 'soft',
        icon: isExpanded ? 'i-heroicons-chevron-down-solid' : 'i-heroicons-chevron-right-solid',
        size: 'xs',
        square: true,
        class: 'transition-transform',
        onClick: () => {
          expanded.value[rowId] = !expanded.value[rowId]
          // Fetch PO items when expanding
          if (expanded.value[rowId] && row.original.uuid) {
            fetchPOItemsForRow(row.original.uuid)
          }
        }
      })
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
    accessorKey: 'po_number',
    header: 'PO Number',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-medium text-default' }, row.original.po_number || 'N/A')
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
    accessorKey: 'entry_date',
    header: 'Entry Date',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', formatDate(row.original.entry_date))
  },
  {
    accessorKey: 'estimated_delivery_date',
    header: 'Est. Delivery Date',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const date = row.original.estimated_delivery_date;
      return h('div', date ? formatDate(date) : 'N/A');
    }
  },
  {
    accessorKey: 'po_type',
    header: 'PO Type',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.po_type || 'N/A')
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const rawStatus = row.original.status || 'Draft';
      // Normalize status for case-insensitive matching (handle both Partially_Received and Partially_received)
      const normalizedStatus = String(rawStatus).toLowerCase();
      
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
      };
      
      const config = statusMap[normalizedStatus] ?? {
        label: rawStatus,
        color: 'neutral'
      };
      
      return h(UBadge, {
        color: config.color,
        variant: 'soft',
        size: 'sm'
      }, () => config.label)
    }
  },
  {
    accessorKey: 'total_po_amount',
    header: 'Total Amount',
    enableSorting: false,
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }: { row: { original: any } }) => {
      const amount = row.original.total_po_amount || 0;
      const formattedAmount = formatCurrency(amount);
      return h('div', { class: 'text-right font-mono text-sm' }, formattedAmount);
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
    meta: { class: { th: 'text-right sticky right-0 z-10 w-32', td: 'text-right sticky right-0 w-32' } },
    cell: ({ row }: { row: { original: any } }) => {
      const isRowLoading = loadingRowUuid.value === row.original.uuid
      const buttons = [];
      
      if (isRowLoading) {
        buttons.push(
          h(UIcon, {
            name: 'i-heroicons-arrow-path',
            class: 'w-4 h-4 animate-spin text-primary'
          })
        )
      } else {
        // View button - show if user has view permission
        if (hasPermission('po_view')) {
          buttons.push(
            h(UTooltip, { text: 'View Purchase Order Details' }, () => [
              h(UButton, {
                icon: 'i-heroicons-eye-solid',
                size: 'xs',
                variant: 'soft',
                color: 'neutral',
                class: 'hover:scale-105 transition-transform',
                onClick: () => previewPurchaseOrder(row.original)
              }, () => '')
            ])
          );
        }
        
        // Edit button - show if user has edit permission
        if (hasPermission('po_edit')) {
          buttons.push(
            h(UTooltip, { text: 'Edit Purchase Order' }, () => [
              h(UButton, {
                icon: 'tdesign:edit-filled',
                size: 'xs',
                variant: 'soft',
                color: 'secondary',
                class: 'hover:scale-105 transition-transform',
                onClick: () => editPurchaseOrder(row.original)
              }, () => '')
            ])
          );
        }
        
        // Delete button - show if user has delete permission
        if (hasPermission('po_delete')) {
          buttons.push(
            h(UTooltip, { text: 'Delete Purchase Order' }, () => [
              h(UButton, {
                icon: 'mingcute:delete-fill',
                size: 'xs',
                variant: 'soft',
                color: 'error',
                class: 'hover:scale-105 transition-transform',
                onClick: () => deletePurchaseOrder(row.original)
              }, () => '')
            ])
          );
        }
      }
      
      return h('div', { class: 'flex justify-end space-x-2 items-center' }, buttons);
    }
  }
];

// Methods
const toggleStatusFilter = (status: string) => {
  if (selectedStatusFilter.value === status) {
    selectedStatusFilter.value = null
  } else {
    selectedStatusFilter.value = status
  }
}

const clearStatusFilter = () => {
  selectedStatusFilter.value = null
}

// Status display helpers for form modal
const statusLabel = computed(() => {
  const map: Record<string, string> = {
    draft: 'Pending',
    ready: 'To be approved',
    approved: 'Purchase order approved',
    rejected: 'Purchase order rejected',
    partially_received: 'Partially Received',
    completed: 'Completed',
  };
  const status = String(poForm.value?.status || 'Draft').toLowerCase();
  return map[status] || poForm.value?.status || 'Draft';
});

const statusChipClass = computed(() => {
  const map: Record<string, string> = {
    draft:
      'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600',
    ready:
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
    approved:
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
    rejected:
      'bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
    partially_received:
      'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900 dark:text-cyan-200 dark:border-cyan-700',
    completed:
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
  };
  const status = String(poForm.value?.status || 'Draft').toLowerCase();
  return map[status] || map.draft;
});

// Purchase orders are fetched by TopBar.vue when corporation changes
// This component just reads from the store reactively

const openCreateModal = () => {
  if (!hasPermission('po_create')) {
    try {
      const toast = useToast();
      toast.add({
        title: "Access Denied",
        description: "You don't have permission to create purchase orders.",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
    } catch (error) {
      // Error showing toast
    }
    return;
  }
  
  // Clear previous PO resources before opening new form
  purchaseOrderResourcesStore.clear()
  
  poForm.value = {
    corporation_uuid: corporationStore.selectedCorporationId,
    entry_date: toUTCString(getCurrentLocal()),
    po_type: '',
    po_type_uuid: '',
    credit_days: '',
    ship_via: '',
    freight: '',
    shipping_instructions: '',
    estimated_delivery_date: '',
    include_items: '',
    terms_and_conditions: 'Not Required',
    status: 'Draft',
    item_total: 0,
    freight_charges_percentage: 0,
    freight_charges_amount: 0,
    freight_charges_taxable: false,
    packing_charges_percentage: 0,
    packing_charges_amount: 0,
    packing_charges_taxable: false,
    custom_duties_percentage: 0,
    custom_duties_amount: 0,
    custom_duties_taxable: false,
    other_charges_percentage: 0,
    other_charges_amount: 0,
    other_charges_taxable: false,
    charges_total: 0,
    sales_tax_1_percentage: 0,
    sales_tax_1_amount: 0,
    sales_tax_2_percentage: 0,
    sales_tax_2_amount: 0,
    tax_total: 0,
    total_po_amount: 0,
    po_items: [],
    attachments: [],
    removed_po_items: []
  }
  // Reset validation state - form will be invalid initially
  isFormValid.value = false
  showFormModal.value = true
}

const loadPurchaseOrderForModal = async (po: any, viewMode: boolean = false) => {
  if (!po?.uuid) {
    return
  }

  // Clear previous PO resources before loading a different PO
  purchaseOrderResourcesStore.clear()

  // Set initial form data from row
  poForm.value = { ...po }
  isViewMode.value = viewMode
  
  // Open modal immediately
  showFormModal.value = true
  loadingEditPO.value = true
  loadingRowUuid.value = po.uuid
  
  try {
    const detailed = await purchaseOrdersStore.fetchPurchaseOrder(po.uuid)
    if (!detailed) {
      const toast = useToast();
      toast.add({
        title: "Error",
        description: "Failed to load purchase order details.",
        color: "error",
      });
      return;
    }

    poForm.value = {
      ...detailed,
      po_type: detailed.po_type || "",
      po_type_uuid: detailed.po_type_uuid || "",
      credit_days: detailed.credit_days || "",
      include_items: detailed.include_items || "",
      po_items: detailed.po_items || [],
      attachments: detailed.attachments || [],
      removed_po_items: detailed.removed_po_items || [],
    };
  } catch (error) {
    const toast = useToast();
    toast.add({
      title: "Error",
      description: "Failed to load purchase order details.",
      color: "error",
    });
  } finally {
    loadingEditPO.value = false;
    loadingRowUuid.value = null;
  }
}

const editPurchaseOrder = async (po: any) => {
  if (!hasPermission('po_edit')) {
    try {
      const toast = useToast();
      toast.add({
        title: "Access Denied",
        description: "You don't have permission to edit purchase orders.",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
    } catch (error) {
      // Error showing toast
    }
    return;
  }
  await loadPurchaseOrderForModal(po, false)
}

const switchToEditMode = () => {
  if (!hasPermission('po_edit')) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to edit purchase orders.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }
  isViewMode.value = false
}

const closeFormModal = () => {
  purchaseOrderResourcesStore.clear()
  showFormModal.value = false
  isViewMode.value = false
  poForm.value = {
    po_items: [],
    attachments: [],
    removed_po_items: []
  }
  loadingEditPO.value = false
  loadingRowUuid.value = null
  // Reset validation state
  isFormValid.value = true
}

// Print handler
const handlePrintPurchaseOrder = () => {
  if (!poForm.value?.uuid) return
  if (!hasPermission('po_view')) {
    const toast = useToast()
    toast.add({
      title: 'Access Denied',
      description: "You don't have permission to view purchase orders.",
      color: 'error',
      icon: 'i-heroicons-x-circle'
    })
    return
  }
  openPurchaseOrderPrint(poForm.value.uuid)
}

// Check for items exceeding estimate quantities
const checkForExceededQuantities = (): { hasExceeded: boolean; items: any[] } => {
  const includeItems = String(poForm.value?.include_items || '').toUpperCase()
  const raiseAgainst = String(poForm.value?.raise_against || '').toUpperCase()
  const poType = String(poForm.value?.po_type || '').toUpperCase()
  const isLaborPO = poType === 'LABOR'
  
  // Check material POs when importing from estimate
  const checkMaterialPOs = includeItems === 'IMPORT_ITEMS_FROM_ESTIMATE'
  // Check labor POs when raise against is estimate
  const checkLaborPOs = isLaborPO && raiseAgainst === 'AGAINST_ESTIMATE'
  
  // Only check if creating against estimate
  if (!checkMaterialPOs && !checkLaborPOs) {
    return { hasExceeded: false, items: [] }
  }
  
  const exceeded: any[] = []
  
  // Check material items
  if (checkMaterialPOs) {
    const poItems = Array.isArray(poForm.value?.po_items) ? poForm.value.po_items : []
    
    poItems.forEach((item: any) => {
      const estimateQty = parseFloat(String(item.quantity || 0))
      const poQty = parseFloat(String(item.po_quantity || 0))
      
      if (poQty > estimateQty && estimateQty > 0) {
        exceeded.push({
          ...item,
          estimate_quantity: estimateQty,
          po_quantity: poQty,
          exceeded_quantity: poQty - estimateQty,
          item_type: 'material',
        })
      }
    })
  }
  
  // Check labor items
  if (checkLaborPOs) {
    const laborItems = Array.isArray(poForm.value?.labor_po_items) ? poForm.value.labor_po_items : []
    
    laborItems.forEach((item: any) => {
      const estimateAmount = parseFloat(String(item.labor_budgeted_amount || 0))
      const poAmount = parseFloat(String(item.po_amount || 0))
      
      if (poAmount > estimateAmount && estimateAmount > 0) {
        exceeded.push({
          ...item,
          estimate_amount: estimateAmount,
          labor_budgeted_amount: estimateAmount,
          po_amount: poAmount,
          exceeded_amount: poAmount - estimateAmount,
          item_type: 'labor',
        })
      }
    })
  }
  
  return {
    hasExceeded: exceeded.length > 0,
    items: exceeded,
  }
}

// Status-based save handlers
const submitWithStatus = async (status: 'Draft' | 'Ready' | 'Approved') => {
  if (savingPO.value) return
  
  poForm.value.status = status
  
  // Only check for exceeded quantities and show modal for NEW purchase orders
  // For existing purchase orders, skip the modal and save directly
  const isNewPurchaseOrder = !poForm.value?.uuid
  
  if (isNewPurchaseOrder) {
    // Check for exceeded quantities before saving
    const { hasExceeded, items } = checkForExceededQuantities()
    
    if (hasExceeded) {
      exceededItems.value = items
      pendingSaveAction.value = async () => {
        await savePurchaseOrder()
      }
      showExceededQuantityModal.value = true
      return
    }
  }
  
  await savePurchaseOrder()
}

const handleSaveAsDraft = () => submitWithStatus('Draft')
const handleMarkReady = () => submitWithStatus('Ready')

const handleApprove = async () => {
  await submitWithStatus('Approved')
}

const handleApproveAndRaise = async () => {
  // Approve and potentially trigger additional workflow (e.g., create receipt note)
  await submitWithStatus('Approved')
  // TODO: Add additional logic for "raise" action if needed
  // For now, it just approves like handleApprove
}

const handleRejectToDraft = () => submitWithStatus('Draft')

const savePurchaseOrder = async (skipModalClose = false): Promise<any | null> => {
  // Determine the correct corporation_uuid to use
  // For new POs: use poForm.value.corporation_uuid (from form selector) or fallback to TopBar's selected
  // For editing: use poForm.value.corporation_uuid (from form, which should match the loaded PO's corporation)
  // This ensures we save to the correct corporation, not the one selected in TopBar
  let corporationUuid: string | undefined
  if (poForm.value.uuid) {
    // When editing, use the form's corporation_uuid (should match the loaded PO's corporation)
    corporationUuid = poForm.value.corporation_uuid || corporationStore.selectedCorporationId
  } else {
    // When creating new, prioritize form's corporation_uuid (from form selector)
    corporationUuid = poForm.value.corporation_uuid || corporationStore.selectedCorporationId
  }

  if (!corporationUuid) {
    const toast = useToast();
    toast.add({ title: 'Error', description: 'Corporation is required to save purchase order', color: 'error' })
    return null
  }
  
  savingPO.value = true
  try {
    let result = null
    
    if (poForm.value.uuid) {
      // Ensure corporation_uuid is set correctly in the payload
      const payload = { 
        uuid: poForm.value.uuid, 
        ...poForm.value,
        corporation_uuid: corporationUuid, // Explicitly set to ensure correct corporation
        raise_against: poForm.value.raise_against || null, // Explicitly include raise_against
      }
      result = await purchaseOrdersStore.updatePurchaseOrder(payload)
      if (result && !skipModalClose) {
        const toast = useToast();
        toast.add({ 
          title: 'Updated', 
          description: `Purchase order ${poForm.value.status === 'Approved' ? 'approved' : 'updated'} successfully`, 
          color: 'success' 
        })
        
        // Close modal immediately after successful save
        closeFormModal()
      }
    } else {
      // Ensure corporation_uuid is set correctly in the payload
      const payload = { 
        ...poForm.value, 
        corporation_uuid: corporationUuid, // Use form's corporation_uuid, not TopBar's
        raise_against: poForm.value.raise_against || null, // Explicitly include raise_against
      }
      result = await purchaseOrdersStore.createPurchaseOrder(payload)
      if (result && !skipModalClose) {
        const toast = useToast();
        toast.add({ title: 'Created', description: 'Purchase order created', color: 'success' })
        closeFormModal()
      }
    }
    
    if (!result) {
      throw new Error('Failed to save purchase order')
    }
    
    return result
  } catch (e) {
    const toast = useToast();
    toast.add({ title: 'Error', description: 'Failed to save purchase order', color: 'error' })
    return null
  } finally {
    savingPO.value = false
  }
}

const deletePurchaseOrder = (po: any) => {
  if (!hasPermission('po_delete')) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to delete purchase orders.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }
  
  poToDelete.value = po
  showDeleteModal.value = true
}

// Helper function to clean error messages
const getCleanMessage = (msg: string | undefined): string => {
  if (!msg) return ''
  let clean = msg
  // Remove [METHOD] "URL": statusCode patterns like [DELETE] "/api/purchase-orders?uuid=...": 400
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

// Handle error banner close
const handleErrorBannerClose = () => {
  // Clear the error from the store
  purchaseOrdersStore.error = null
}

const confirmDelete = async () => {
  if (!hasPermission('po_delete')) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to delete purchase orders.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }

  if (!poToDelete.value) return

  try {
    const success = await purchaseOrdersStore.deletePurchaseOrder(poToDelete.value.uuid)
    
    if (success) {
      const toast = useToast();
      toast.add({
        title: "Success",
        description: "Purchase order deleted successfully",
        color: "success",
        icon: "i-heroicons-check-circle",
      });
      showDeleteModal.value = false
      poToDelete.value = null
    } else {
      // If deletePurchaseOrder returns false, check the error from the store
      const storeError = purchaseOrdersStore.error || 'Failed to delete purchase order'
      const toast = useToast();
      toast.add({
        title: "Error",
        description: getCleanMessage(storeError) || "Failed to delete purchase order",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
      // Clear the store error after handling it so it doesn't affect the table display
      purchaseOrdersStore.error = null
    }
  } catch (error: any) {
    // Clear the store error after handling it so it doesn't affect the table display
    purchaseOrdersStore.error = null
    
    const toast = useToast();
    let errorDescription = 'Failed to delete purchase order'
    
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
  poToDelete.value = null
}

// Handle exceeded quantity modal actions
const handleContinueSavingPO = async () => {
  showExceededQuantityModal.value = false
  if (pendingSaveAction.value) {
    await pendingSaveAction.value()
    pendingSaveAction.value = null
  }
  exceededItems.value = []
}

const handleRaiseChangeOrder = async () => {
  showExceededQuantityModal.value = false

  // Store the current form data before it gets cleared during PO save
  // This must happen BEFORE calling pendingSaveAction since that clears the form
  // Use deep clone to avoid reactive proxy issues
  const currentFormData = JSON.parse(JSON.stringify(poForm.value))

  // Adjust PO items quantities/amounts to match estimate quantities/amounts before saving
  const exceededItemsList = exceededItems.value
  const currentPoType = String(currentFormData?.po_type || '').toUpperCase()
  const isCurrentLaborPO = currentPoType === 'LABOR'
  
  if (exceededItemsList.length > 0) {
    // Handle material items
    if (!isCurrentLaborPO && Array.isArray(currentFormData.po_items)) {
      // Create a map of exceeded items by item_uuid for quick lookup
      const exceededMap = new Map<string, any>()
      exceededItemsList
        .filter((item: any) => item.item_type !== 'labor')
        .forEach((item: any) => {
          const key = String(item.item_uuid || '').toLowerCase()
          if (key) {
            exceededMap.set(key, item)
          }
        })

      // Update PO items to set po_quantity to estimate quantity (quantity field)
      const updatedPoItems = currentFormData.po_items.map((item: any) => {
        const key = String(item.item_uuid || '').toLowerCase()
        const exceededItem = key ? exceededMap.get(key) : null
        
        if (exceededItem) {
          // Set po_quantity to estimate quantity
          const estimateQty = parseFloat(String(exceededItem.estimate_quantity || exceededItem.quantity || 0))
          const poUnitPrice = parseFloat(String(item.po_unit_price || item.unit_price || 0))
          const poTotal = Math.round((estimateQty * poUnitPrice + Number.EPSILON) * 100) / 100
          
          return {
            ...item,
            po_quantity: estimateQty,
            po_total: poTotal, // Recalculate total
          }
        }
        return item
      })
      
      // Calculate new item_total from adjusted material items
      const newItemTotal = updatedPoItems.reduce((sum: number, item: any) => {
        const poTotal = parseFloat(String(item.po_total || 0))
        return sum + poTotal
      }, 0)

      // Round to 2 decimal places
      const roundedItemTotal = Math.round((newItemTotal + Number.EPSILON) * 100) / 100

      // Recalculate charges based on percentages
      const freightPercentage = parseFloat(String(currentFormData.freight_charges_percentage || 0))
      const packingPercentage = parseFloat(String(currentFormData.packing_charges_percentage || 0))
      const customDutiesPercentage = parseFloat(String(currentFormData.custom_duties_percentage || 0))
      const otherChargesPercentage = parseFloat(String(currentFormData.other_charges_percentage || 0))
      
      const freightAmount = Math.round((roundedItemTotal * (freightPercentage / 100) + Number.EPSILON) * 100) / 100
      const packingAmount = Math.round((roundedItemTotal * (packingPercentage / 100) + Number.EPSILON) * 100) / 100
      const customDutiesAmount = Math.round((roundedItemTotal * (customDutiesPercentage / 100) + Number.EPSILON) * 100) / 100
      const otherChargesAmount = Math.round((roundedItemTotal * (otherChargesPercentage / 100) + Number.EPSILON) * 100) / 100
      
      const chargesTotal = freightAmount + packingAmount + customDutiesAmount + otherChargesAmount
      
      // Calculate taxable base (item_total + taxable charges)
      const freightTaxable = poForm.value.freight_charges_taxable || false
      const packingTaxable = poForm.value.packing_charges_taxable || false
      const customDutiesTaxable = poForm.value.custom_duties_taxable || false
      const otherChargesTaxable = poForm.value.other_charges_taxable || false
      
      const taxableBase = roundedItemTotal + 
        (freightTaxable ? freightAmount : 0) +
        (packingTaxable ? packingAmount : 0) +
        (customDutiesTaxable ? customDutiesAmount : 0) +
        (otherChargesTaxable ? otherChargesAmount : 0)
      
      // Calculate taxes
      const salesTax1Percentage = parseFloat(String(poForm.value.sales_tax_1_percentage || 0))
      const salesTax2Percentage = parseFloat(String(poForm.value.sales_tax_2_percentage || 0))
      
      const salesTax1Amount = Math.round((taxableBase * (salesTax1Percentage / 100) + Number.EPSILON) * 100) / 100
      const salesTax2Amount = Math.round((taxableBase * (salesTax2Percentage / 100) + Number.EPSILON) * 100) / 100
      const taxTotal = salesTax1Amount + salesTax2Amount
      
      // Calculate final total
      const totalPoAmount = roundedItemTotal + chargesTotal + taxTotal
      
      // Update financial breakdown
      const currentFinancialBreakdown = poForm.value.financial_breakdown || {}
      const updatedFinancialBreakdown = {
        ...currentFinancialBreakdown,
        charges: {
          freight: {
            percentage: freightPercentage || null,
            amount: freightAmount || null,
            taxable: freightTaxable || false,
          },
          packing: {
            percentage: packingPercentage || null,
            amount: packingAmount || null,
            taxable: packingTaxable || false,
          },
          custom_duties: {
            percentage: customDutiesPercentage || null,
            amount: customDutiesAmount || null,
            taxable: customDutiesTaxable || false,
          },
          other: {
            percentage: otherChargesPercentage || null,
            amount: otherChargesAmount || null,
            taxable: otherChargesTaxable || false,
          },
        },
        sales_taxes: {
          sales_tax_1: {
            percentage: salesTax1Percentage || null,
            amount: salesTax1Amount || null,
          },
          sales_tax_2: {
            percentage: salesTax2Percentage || null,
            amount: salesTax2Amount || null,
          },
        },
        totals: {
          item_total: roundedItemTotal,
          charges_total: chargesTotal,
          tax_total: taxTotal,
          total_po_amount: totalPoAmount,
        },
      }
      
      // Update the form with adjusted quantities and recalculated totals
      poForm.value = {
        ...poForm.value,
        po_items: updatedPoItems,
        item_total: roundedItemTotal,
        freight_charges_amount: freightAmount,
        packing_charges_amount: packingAmount,
        custom_duties_amount: customDutiesAmount,
        other_charges_amount: otherChargesAmount,
        charges_total: chargesTotal,
        sales_tax_1_amount: salesTax1Amount,
        sales_tax_2_amount: salesTax2Amount,
        tax_total: taxTotal,
        total_po_amount: totalPoAmount,
        financial_breakdown: updatedFinancialBreakdown,
      }
    }
    
    // Handle labor items
    if (isCurrentLaborPO && Array.isArray(currentFormData.labor_po_items)) {
      // Create a map of exceeded items by cost_code_uuid for quick lookup
      const exceededMap = new Map<string, any>()
      exceededItemsList
        .filter((item: any) => item.item_type === 'labor')
        .forEach((item: any) => {
          const key = String(item.cost_code_uuid || '').toLowerCase()
          if (key) {
            exceededMap.set(key, item)
          }
        })

      // Update labor PO items to set po_amount to labor_budgeted_amount
      const updatedLaborItems = currentFormData.labor_po_items.map((item: any) => {
        const key = String(item.cost_code_uuid || '').toLowerCase()
        const exceededItem = key ? exceededMap.get(key) : null
        
        if (exceededItem) {
          // Set po_amount to labor_budgeted_amount (estimate amount)
          const estimateAmount = parseFloat(String(exceededItem.labor_budgeted_amount || exceededItem.estimate_amount || 0))
          
          return {
            ...item,
            po_amount: estimateAmount,
          }
        }
        return item
      })
      
      // Calculate new item_total from adjusted labor items
      const newItemTotal = updatedLaborItems.reduce((sum: number, item: any) => {
        const poAmount = parseFloat(String(item.po_amount || 0))
        return sum + poAmount
      }, 0)
      
      // Round to 2 decimal places
      const roundedItemTotal = Math.round((newItemTotal + Number.EPSILON) * 100) / 100
      
      // Recalculate charges based on percentages
      const freightPercentage = parseFloat(String(poForm.value.freight_charges_percentage || 0))
      const packingPercentage = parseFloat(String(poForm.value.packing_charges_percentage || 0))
      const customDutiesPercentage = parseFloat(String(poForm.value.custom_duties_percentage || 0))
      const otherChargesPercentage = parseFloat(String(poForm.value.other_charges_percentage || 0))
      
      const freightAmount = Math.round((roundedItemTotal * (freightPercentage / 100) + Number.EPSILON) * 100) / 100
      const packingAmount = Math.round((roundedItemTotal * (packingPercentage / 100) + Number.EPSILON) * 100) / 100
      const customDutiesAmount = Math.round((roundedItemTotal * (customDutiesPercentage / 100) + Number.EPSILON) * 100) / 100
      const otherChargesAmount = Math.round((roundedItemTotal * (otherChargesPercentage / 100) + Number.EPSILON) * 100) / 100
      
      const chargesTotal = freightAmount + packingAmount + customDutiesAmount + otherChargesAmount
      
      // Calculate taxable base (item_total + taxable charges)
      const freightTaxable = poForm.value.freight_charges_taxable || false
      const packingTaxable = poForm.value.packing_charges_taxable || false
      const customDutiesTaxable = poForm.value.custom_duties_taxable || false
      const otherChargesTaxable = poForm.value.other_charges_taxable || false
      
      const taxableBase = roundedItemTotal + 
        (freightTaxable ? freightAmount : 0) +
        (packingTaxable ? packingAmount : 0) +
        (customDutiesTaxable ? customDutiesAmount : 0) +
        (otherChargesTaxable ? otherChargesAmount : 0)
      
      // Calculate taxes
      const salesTax1Percentage = parseFloat(String(poForm.value.sales_tax_1_percentage || 0))
      const salesTax2Percentage = parseFloat(String(poForm.value.sales_tax_2_percentage || 0))
      
      const salesTax1Amount = Math.round((taxableBase * (salesTax1Percentage / 100) + Number.EPSILON) * 100) / 100
      const salesTax2Amount = Math.round((taxableBase * (salesTax2Percentage / 100) + Number.EPSILON) * 100) / 100
      const taxTotal = salesTax1Amount + salesTax2Amount
      
      // Calculate final total
      const totalPoAmount = roundedItemTotal + chargesTotal + taxTotal
      
      // Update financial breakdown
      const currentFinancialBreakdown = poForm.value.financial_breakdown || {}
      const updatedFinancialBreakdown = {
        ...currentFinancialBreakdown,
        charges: {
          freight: {
            percentage: freightPercentage || null,
            amount: freightAmount || null,
            taxable: freightTaxable || false,
          },
          packing: {
            percentage: packingPercentage || null,
            amount: packingAmount || null,
            taxable: packingTaxable || false,
          },
          custom_duties: {
            percentage: customDutiesPercentage || null,
            amount: customDutiesAmount || null,
            taxable: customDutiesTaxable || false,
          },
          other: {
            percentage: otherChargesPercentage || null,
            amount: otherChargesAmount || null,
            taxable: otherChargesTaxable || false,
          },
        },
        sales_taxes: {
          sales_tax_1: {
            percentage: salesTax1Percentage || null,
            amount: salesTax1Amount || null,
          },
          sales_tax_2: {
            percentage: salesTax2Percentage || null,
            amount: salesTax2Amount || null,
          },
        },
        totals: {
          item_total: roundedItemTotal,
          charges_total: chargesTotal,
          tax_total: taxTotal,
          total_po_amount: totalPoAmount,
        },
      }
      
      // Update the form with adjusted amounts, recalculated totals, and preserved raise_against
      poForm.value = {
        ...poForm.value,
        labor_po_items: updatedLaborItems,
        item_total: roundedItemTotal,
        freight_charges_amount: freightAmount,
        packing_charges_amount: packingAmount,
        custom_duties_amount: customDutiesAmount,
        other_charges_amount: otherChargesAmount,
        charges_total: chargesTotal,
        sales_tax_1_amount: salesTax1Amount,
        sales_tax_2_amount: salesTax2Amount,
        tax_total: taxTotal,
        total_po_amount: totalPoAmount,
        financial_breakdown: updatedFinancialBreakdown,
        raise_against: poForm.value.raise_against || null, // Explicitly preserve raise_against
      }
    }
  }
  
  // First, save the PO to get the UUID (skip modal close since we're creating CO)
  let savedPo: any = null
  
  // Check if PO is already saved (has UUID)
  if (currentFormData.uuid) {
    // PO is already saved, use currentFormData but we'll still fetch to get complete data
    savedPo = { uuid: currentFormData.uuid }
  } else if (pendingSaveAction.value) {
    // PO needs to be saved
    try {
      // Call savePurchaseOrder directly with skipModalClose=true to get the returned PO
      savedPo = await savePurchaseOrder(true)
      
      if (!savedPo || !savedPo.uuid) {
        throw new Error('Failed to save purchase order or get UUID')
      }
    } catch (error) {
      const toast = useToast()
      toast.add({
        title: 'Error',
        description: 'Failed to save purchase order. Cannot create change order.',
        color: 'error',
      })
      return
    }
  } else {
    // No pending save action and no UUID - need to save the PO
    try {
      savedPo = await savePurchaseOrder(true)
      if (!savedPo || !savedPo.uuid) {
        throw new Error('Failed to save purchase order or get UUID')
      }
    } catch (error) {
      const toast = useToast()
      toast.add({
        title: 'Error',
        description: 'Failed to save purchase order. Cannot create change order.',
        color: 'error',
      })
      return
    }
  }
  
  // Refetch the saved purchase order using its UUID to get all the complete data
  // Start with currentFormData which has all the form fields, then merge with fetched data
  let poData: any = { ...currentFormData } // Start with form data
  
  if (savedPo?.uuid && corporationStore.selectedCorporationId) {
    try {
      const detailed = await purchaseOrdersStore.fetchPurchaseOrder(savedPo.uuid)
      if (detailed) {
        // Cast to any to access all properties
        const detailedAny = detailed as any
        // Merge fetched data (from DB) with currentFormData (from form)
        // Fetched data has the UUID and all DB fields, form data has user-entered values
        poData = {
          ...currentFormData, // Start with form data
          ...detailedAny, // Override with DB data (includes UUID and all fields)
          // Ensure critical fields are set
          uuid: detailedAny.uuid,
          corporation_uuid: detailedAny.corporation_uuid || currentFormData.corporation_uuid,
          project_uuid: detailedAny.project_uuid || currentFormData.project_uuid,
          vendor_uuid: detailedAny.vendor_uuid || currentFormData.vendor_uuid,
          credit_days: detailedAny.credit_days || currentFormData.credit_days,
          ship_via_uuid: detailedAny.ship_via_uuid || currentFormData.ship_via_uuid,
          freight_uuid: detailedAny.freight_uuid || currentFormData.freight_uuid,
          shipping_address_uuid: detailedAny.shipping_address_uuid || currentFormData.shipping_address_uuid,
          terms_and_conditions_uuid: detailedAny.terms_and_conditions_uuid || currentFormData.terms_and_conditions_uuid,
          po_type: detailedAny.po_type || currentFormData.po_type || "",
          po_type_uuid: detailedAny.po_type_uuid || currentFormData.po_type_uuid || "",
          include_items: detailedAny.include_items || currentFormData.include_items || "",
          raise_against: detailedAny.raise_against || currentFormData.raise_against || null,
          po_items: detailedAny.po_items || currentFormData.po_items || [],
          labor_po_items: detailedAny.labor_po_items || currentFormData.labor_po_items || [],
          attachments: detailedAny.attachments || currentFormData.attachments || [],
          removed_po_items: detailedAny.removed_po_items || currentFormData.removed_po_items || [],
        }
      } else {
        poData = {
          ...currentFormData,
          ...savedPo,
          uuid: savedPo.uuid, // Ensure UUID is set
        }
      }
    } catch (error) {
      // Merge saved PO with currentFormData as fallback
      poData = {
        ...currentFormData,
        ...savedPo,
        uuid: savedPo?.uuid || currentFormData.uuid,
      }
    }
  } else if (savedPo) {
    // Use saved PO merged with currentFormData if we have it but couldn't fetch detailed
    poData = {
      ...currentFormData,
      ...savedPo,
      uuid: savedPo.uuid,
    }
  } else {
    // Use currentFormData as-is, but it won't have UUID
  }
  
  const exceeded = exceededItems.value
  const changeOrderPoType = String(poData?.po_type || '').toUpperCase()
  const isChangeOrderLaborPO = changeOrderPoType === 'LABOR'
  
  // Generate CO number
  const existingCOs = changeOrdersStore.changeOrders || []
  let maxSeq = 0
  const re = /^CO-(\d+)$/i
  existingCOs.forEach((co: any) => {
    const match = String(co?.co_number || '').match(re)
    if (match) {
      const seq = parseInt(match[1]!)
      if (!Number.isNaN(seq)) maxSeq = Math.max(maxSeq, seq)
    }
  })
  const nextCONumber = `CO-${maxSeq + 1}`
  
  // Separate material and labor items
  const materialExceeded = exceeded.filter((item: any) => item.item_type !== 'labor')
  const laborExceeded = exceeded.filter((item: any) => item.item_type === 'labor')
  
  // Prepare change order items from exceeded quantities (for material POs)
  // Include all fields from the original PO item to ensure proper display
  const coItems = materialExceeded.map((item: any) => {
    // Get cost code info from display_metadata or item itself
    const display = item?.display_metadata || item?.metadata || {}
    const costCodeNumber = display.cost_code_number || item.cost_code_number || ''
    const costCodeName = display.cost_code_name || item.cost_code_name || ''
    const costCodeLabel = display.cost_code_label || item.cost_code_label || [costCodeNumber, costCodeName].filter(Boolean).join(' ').trim()
    
    // Get unit info
    const unitLabel = display.unit_label || item.unit_label || item.uom_label || item.unit || item.uom || ''
    const unitUuid = item.uom_uuid || item.unit_uuid || display.unit_uuid || null
    
    // Get location info
    const locationLabel = display.location_display || item.location || ''
    const locationUuid = item.location_uuid || display.location_uuid || null
    
    // Get item type info
    const itemTypeLabel = display.item_type_label || item.item_type_label || ''
    const itemTypeUuid = item.item_type_uuid || display.item_type_uuid || null
    
    // Original estimate values (for display in CO form)
    const estimateQuantity = item.estimate_quantity || item.quantity || 0
    const estimateUnitPrice = item.unit_price || 0
    const estimateTotal = estimateQuantity * estimateUnitPrice
    
    // CO values (exceeded portion)
    // Use the PO unit price, defaulting to 0 if not available
    const coUnitPrice = parseFloat(String(item.po_unit_price ?? item.unit_price ?? 0)) || 0
    const coQuantity = parseFloat(String(item.exceeded_quantity ?? 0)) || 0
    const coTotal = coQuantity * coUnitPrice
    
    return {
      cost_code_uuid: item.cost_code_uuid || null,
      cost_code_number: costCodeNumber || null,
      cost_code_name: costCodeName || null,
      cost_code_label: costCodeLabel || null,
      division_name: display.division_name || item.division_name || null,
      item_type_uuid: itemTypeUuid,
      item_type_label: itemTypeLabel || null,
      item_uuid: item.item_uuid || null,
      name: item.name || item.item_name || item.description || '',
      description: item.description || '',
      model_number: item.model_number || '',
      location_uuid: locationUuid,
      location_label: locationLabel || null,
      unit_uuid: unitUuid,
      unit_label: unitLabel || null,
      // Original estimate values (for reference in CO form)
      // These should be the original estimate quantity/price/total
      quantity: estimateQuantity > 0 ? estimateQuantity : null,
      unit_price: estimateUnitPrice > 0 ? estimateUnitPrice : null,
      total: estimateTotal > 0 ? estimateTotal : null,
      // CO values (exceeded portion) - these are what the CO is for
      co_unit_price: coUnitPrice,
      co_quantity: coQuantity,
      co_total: coTotal,
      approval_checks: item.approval_checks || item.approval_checks_uuids || [],
    }
  })
  
  // Prepare labor change order items from exceeded amounts (for labor POs)
  const laborCoItems = laborExceeded.map((item: any, index: number) => ({
    cost_code_uuid: item.cost_code_uuid || null,
    cost_code_number: item.cost_code_number || '',
    cost_code_name: item.cost_code_name || '',
    cost_code_label: item.cost_code_label || [item.cost_code_number, item.cost_code_name].filter(Boolean).join(' ').trim(),
    division_name: item.division_name || null,
    po_amount: item.labor_budgeted_amount || item.estimate_amount || 0, // Original PO amount (estimate)
    co_amount: item.exceeded_amount || 0, // Only the exceeded portion
    order_index: index,
  }))
  
  // Normalize PO type to CO type (LABOR or MATERIAL)
  const poType = String(poData.po_type || poData.po_type_uuid || 'MATERIAL').toUpperCase()
  const normalizedCoType = poType === 'LABOR' ? 'LABOR' : 'MATERIAL'
  
  // Calculate CO item total from exceeded items
  const calculateCOItemTotal = () => {
    if (normalizedCoType === 'LABOR') {
      return laborCoItems.reduce((sum: number, item: any) => {
        const coAmount = parseFloat(item.co_amount) || 0
        return sum + coAmount
      }, 0)
    } else {
      return coItems.reduce((sum: number, item: any) => {
        const coTotal = parseFloat(item.co_total) || 0
        return sum + coTotal
      }, 0)
    }
  }
  
  const coItemTotal = calculateCOItemTotal()
  
  // Calculate financial breakdown from PO's financial breakdown
  // Use the same percentages and taxable flags, but recalculate amounts based on CO item total
  const buildFinancialBreakdown = () => {
    const formData = poData && typeof poData === 'object' ? poData : poForm.value
    const poBreakdown = formData?.financial_breakdown || formData?.financialBreakdown || {}
    const charges = poBreakdown.charges || {}
    const salesTaxes = poBreakdown.sales_taxes || {}
    
    // Recalculate charges based on CO item total
    const chargeStates: Record<string, any> = {}
    const chargeKeys = ['freight', 'packing', 'custom_duties', 'other'] as const
    let chargesTotal = 0
    
    chargeKeys.forEach((key) => {
      const entry = charges[key] || {}
      const percentage = parseFloat(entry.percentage) || 0
      const taxable = Boolean(entry.taxable)
      const amount = (coItemTotal * percentage) / 100
      
      chargeStates[key] = {
        percentage,
        amount: Math.round((amount + Number.EPSILON) * 100) / 100,
        taxable,
      }
      
      chargesTotal += chargeStates[key].amount
    })
    
    // Calculate taxable base (CO item total + taxable charges)
    const taxableCharges = Object.values(chargeStates).reduce((sum: number, state: any) => {
      return sum + (state.taxable ? state.amount : 0)
    }, 0)
    const taxableBase = coItemTotal + taxableCharges
    
    // Recalculate sales taxes based on taxable base
    const salesTaxStates: Record<string, any> = {}
    let taxTotal = 0
    
    const salesKeys = ['sales_tax_1', 'sales_tax_2'] as const
    salesKeys.forEach((key) => {
      const entry = salesTaxes[key] || {}
      const percentage = parseFloat(entry.percentage) || 0
      const amount = (taxableBase * percentage) / 100
      
      salesTaxStates[key] = {
        percentage,
        amount: Math.round((amount + Number.EPSILON) * 100) / 100,
      }
      
      taxTotal += salesTaxStates[key].amount
    })
    
    const totalCOAmount = coItemTotal + chargesTotal + taxTotal
    
    return {
      charges: chargeStates,
      sales_taxes: salesTaxStates,
      totals: {
        item_total: Math.round((coItemTotal + Number.EPSILON) * 100) / 100,
        charges_total: Math.round((chargesTotal + Number.EPSILON) * 100) / 100,
        tax_total: Math.round((taxTotal + Number.EPSILON) * 100) / 100,
        total_co_amount: Math.round((totalCOAmount + Number.EPSILON) * 100) / 100,
      },
    }
  }
  
  const financialBreakdown = buildFinancialBreakdown()
  
  // Helper to normalize empty strings to null
  const normalizeToNull = (value: any): any => {
    if (value === '' || value === undefined) return null
    return value
  }
  
  // Ensure we have valid poData - use poForm.value directly if poData is invalid
  const formData = poData && typeof poData === 'object' ? poData : poForm.value
  
  const changeOrderData: any = {
    // Required fields
    corporation_uuid: normalizeToNull(formData?.corporation_uuid || corporationStore.selectedCorporationId),
    co_number: nextCONumber,
    created_date: new Date().toISOString(),
    status: 'Draft',
    co_type: normalizedCoType,
    
    // Project and vendor
    project_uuid: normalizeToNull(formData?.project_uuid),
    vendor_uuid: normalizeToNull(formData?.vendor_uuid),
    original_purchase_order_uuid: normalizeToNull(formData?.uuid),
    
    // Shipping and delivery
    credit_days: normalizeToNull(formData?.credit_days),
    ship_via: normalizeToNull(formData?.ship_via),
    ship_via_uuid: normalizeToNull(formData?.ship_via_uuid),
    freight: normalizeToNull(formData?.freight),
    freight_uuid: normalizeToNull(formData?.freight_uuid),
    shipping_instructions: normalizeToNull(formData?.shipping_instructions),
    shipping_address_uuid: normalizeToNull(formData?.shipping_address_uuid),
    estimated_delivery_date: normalizeToNull(formData?.estimated_delivery_date),
    
    // Additional fields
    requested_by: normalizeToNull(formData?.requested_by),
    terms_and_conditions_uuid: normalizeToNull(formData?.terms_and_conditions_uuid),
    reason: isChangeOrderLaborPO 
      ? `Change order for amounts exceeding estimate in PO ${formData?.po_number || ''}`
      : `Change order for quantities exceeding estimate in PO ${formData?.po_number || ''}`,
    attachments: [],
    
    // Financial breakdown (calculated from CO items)
    financial_breakdown: financialBreakdown,
    
    // Financial totals
    item_total: financialBreakdown.totals.item_total,
    charges_total: financialBreakdown.totals.charges_total,
    tax_total: financialBreakdown.totals.tax_total,
    total_co_amount: financialBreakdown.totals.total_co_amount,
    
    // Copy charge percentages and taxable flags from PO
    freight_charges_percentage: formData?.freight_charges_percentage || null,
    freight_charges_amount: financialBreakdown.charges.freight?.amount || null,
    freight_charges_taxable: formData?.freight_charges_taxable || null,
    packing_charges_percentage: formData?.packing_charges_percentage || null,
    packing_charges_amount: financialBreakdown.charges.packing?.amount || null,
    packing_charges_taxable: formData?.packing_charges_taxable || null,
    custom_duties_charges_percentage: formData?.custom_duties_charges_percentage || null,
    custom_duties_charges_amount: financialBreakdown.charges.custom_duties?.amount || null,
    custom_duties_charges_taxable: formData?.custom_duties_charges_taxable || null,
    other_charges_percentage: formData?.other_charges_percentage || null,
    other_charges_amount: financialBreakdown.charges.other?.amount || null,
    other_charges_taxable: formData?.other_charges_taxable || null,
    sales_tax_1_percentage: formData?.sales_tax_1_percentage || null,
    sales_tax_1_amount: financialBreakdown.sales_taxes.sales_tax_1?.amount || null,
    sales_tax_2_percentage: formData?.sales_tax_2_percentage || null,
    sales_tax_2_amount: financialBreakdown.sales_taxes.sales_tax_2?.amount || null,
  }
  
  // Add items based on PO type
  if (isChangeOrderLaborPO) {
    changeOrderData.labor_co_items = laborCoItems
    changeOrderData.removed_labor_co_items = []
  } else {
    changeOrderData.co_items = coItems
    changeOrderData.removed_co_items = []
  }
  
  // Create change order directly without showing modal
  savingCO.value = true
  try {
    const result = await changeOrdersStore.createChangeOrder(changeOrderData)
    
    if (result) {
      const toast = useToast()
      toast.add({
        title: 'Success',
        description: `Change order ${result.co_number} created successfully for exceeded quantities`,
        color: 'success',
      })
      
      // Close exceeded quantity modal
      closeExceededQuantityModal()
      
      // Refresh change orders list
      const corpUuid = changeOrderData.corporation_uuid
      if (corpUuid) {
        await changeOrdersStore.fetchChangeOrders(corpUuid, false)
      }
      
      // PO was already saved at the beginning of this function, no need to save again
      // Close the form modal now that CO is created
      closeFormModal()
    } else {
      throw new Error('Failed to create change order')
    }
  } catch (error: any) {
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to create change order',
      color: 'error',
    })
  } finally {
    savingCO.value = false
    pendingSaveAction.value = null
    exceededItems.value = []
  }
}

const closeExceededQuantityModal = () => {
  showExceededQuantityModal.value = false
  pendingSaveAction.value = null
  exceededItems.value = []
}


const previewPurchaseOrder = async (po: any) => {
  if (!hasPermission('po_view')) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to view purchase order details.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }
  
  await loadPurchaseOrderForModal(po, true)
}

// Fetch PO items for expanded row
const fetchPOItemsForRow = async (poUuid: string) => {
  if (!poUuid || poItemsCache.value[poUuid]) {
    return
  }

  // Initialize cache entry
  poItemsCache.value[poUuid] = {
    items: [],
    loading: true,
    error: null
  }

  try {
    const items = await purchaseOrderResourcesStore.fetchPurchaseOrderItems(poUuid)
    poItemsCache.value[poUuid] = {
      items: Array.isArray(items) ? items : [],
      loading: false,
      error: null
    }
  } catch (error: any) {
    poItemsCache.value[poUuid] = {
      items: [],
      loading: false,
      error: error?.message || 'Failed to load PO items'
    }
  }
}

// Watchers
// Note: Filters are only applied when "Show Results" is clicked

// Watch modal close to ensure cleanup happens regardless of how it's closed
// (ESC key, click outside modal, or clicking X button)
watch(showFormModal, (isOpen, wasOpen) => {
  // If modal just closed, ensure cleanup happens
  if (wasOpen && !isOpen) {
    purchaseOrderResourcesStore.clear()
    isViewMode.value = false
    poForm.value = {
      po_items: [],
      attachments: [],
      removed_po_items: []
    }
    loadingEditPO.value = false
    loadingRowUuid.value = null
    // Reset validation state
    isFormValid.value = true
  }
  // If modal just opened, reset validation state (will be updated by form)
  if (!wasOpen && isOpen) {
    isFormValid.value = false
  }
});

// Purchase orders are automatically fetched by TopBar.vue when corporation changes
// No need to fetch here - just use the store data reactively
</script>

