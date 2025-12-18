<template>
  <div>
    <div class="flex justify-end items-center mb-4">
      <div class="flex-1 max-w-sm mr-2">
        <UInput
          v-model="globalFilter"
          placeholder="Search vendor invoices..."
          icon="i-heroicons-magnifying-glass"
          variant="subtle"
          size="xs"
          class="w-full"
        />
      </div>
      <div class="flex gap-3">
        <UButton
          icon="i-heroicons-plus"
          color="primary"
          size="xs"
          @click="openCreateModal"
        >
          Add New
        </UButton>
      </div>
    </div>

    <!-- Vendor Invoices Table -->
    <div v-if="loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Loading skeleton -->
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-11 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
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
                <USkeleton class="h-4 w-20" />
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

    <div v-else-if="error">
      <UAlert
        icon="i-heroicons-exclamation-triangle"
        color="error"
        variant="soft"
        :title="error"
        :description="'Please try refreshing the page or contact support if the issue persists.'"
      />
    </div>

    <div v-else-if="vendorInvoices.length && isReady">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        v-model:column-pinning="columnPinning"
        :pagination-options="paginationOptions"
        :data="filteredVendorInvoices" 
        :columns="columns"
        v-model:selected="selectedVendorInvoices"
        v-model:global-filter="globalFilter"
        :selectable="true"
        class="max-h-[70vh] overflow-auto"
      />
      
      <!-- Pagination -->
      <div v-if="shouldShowPagination(filteredVendorInvoices.length).value" class="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
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
          {{ getPageInfo(table, 'vendor invoices').value }}
        </div>
      </div>
    </div>

    <div v-else-if="!isReady" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-lock-closed" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg">Loading...</p>
    </div>

    <div v-else class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-document-text" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg">No vendor invoices found</p>
      <p class="text-gray-400 text-sm mb-6">Create your first vendor invoice to get started</p>
      <UButton 
        icon="i-heroicons-plus" 
        @click="openCreateModal"
      >
        Add Vendor Invoice
      </UButton>
    </div>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" :title="'Delete Vendor Invoice'">
      <template #body>
        <div class="p-6">
          <div class="flex items-center mb-4">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-500 mr-3" />
            <div>
              <h3 class="text-lg font-medium text-gray-900">Delete Vendor Invoice</h3>
              <p class="text-sm text-gray-500">This action cannot be undone.</p>
            </div>
          </div>
          
          <div v-if="invoiceToDelete" class="bg-gray-50 p-4 rounded-lg mb-4">
            <p class="text-sm text-gray-700">
              <strong>Invoice Number:</strong> {{ invoiceToDelete.number || 'N/A' }}<br>
              <strong>Bill Date:</strong> {{ formatDate(invoiceToDelete.bill_date) }}<br>
              <strong>Vendor:</strong> {{ invoiceToDelete.vendor_name || 'N/A' }}<br>
              <strong>Amount:</strong> {{ formatCurrency(invoiceToDelete.amount || 0) }}<br>
            </p>
          </div>
          
          <p class="text-gray-600">
            Are you sure you want to delete this vendor invoice? This will permanently remove the invoice and all associated data.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="soft" @click="cancelDelete">
            Cancel
          </UButton>
          <UButton color="error" @click="confirmDelete">
            Delete Vendor Invoice
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Create/Edit/View Vendor Invoice Modal -->
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

          <div class="flex items-center gap-2 flex-1 justify-end">
            <div class="flex items-center gap-2">
              <!-- No buttons shown when status is Paid -->
              <template v-if="String(invoiceForm.value?.status || '').toLowerCase() === 'paid'">
                <!-- All buttons are hidden when invoice is paid -->
              </template>
              
              <template v-else>
                <UButton
                  v-if="isViewMode && hasPermission('vendor_invoices_edit') && invoiceForm.value?.status !== 'Approved' && invoiceForm.value?.status !== 'Paid'"
                  type="button"
                  color="primary"
                  icon="tdesign:edit-filled"
                  size="sm"
                  @click="switchToEditMode"
                >
                  Edit Vendor Invoice
                </UButton>

                <!-- Approval buttons for Pending status -->
                <template v-if="!isViewMode && showApprovalButtons">
                <UButton
                  data-testid="btn-reject-draft"
                  color="error"
                  variant="soft"
                  icon="i-heroicons-x-circle"
                  size="sm"
                  :disabled="savingInvoice"
                  :loading="savingInvoice"
                  @click="handleRejectToDraft"
                >
                  Reject
                </UButton>
                <UButton
                  data-testid="btn-approve"
                  color="primary"
                  variant="solid"
                  icon="i-heroicons-arrow-up-circle"
                  size="sm"
                  :disabled="savingInvoice"
                  :loading="savingInvoice"
                  @click="handleApprove"
                >
                  Approve
                </UButton>
              </template>

              <!-- Pay button for Approved invoices -->
              <template v-if="!isViewMode && showPayButton">
                <UButton
                  v-if="hasPermission('vendor_invoices_approve')"
                  data-testid="btn-save-draft"
                  color="warning"
                  variant="outline"
                  icon="i-heroicons-arrow-uturn-left"
                  size="sm"
                  :disabled="savingInvoice"
                  :loading="savingInvoice"
                  @click="handleSaveAsDraft"
                >
                  Unapprove &amp; Save as Draft
                </UButton>
                <UButton
                  data-testid="btn-pay"
                  color="success"
                  variant="solid"
                  icon="i-heroicons-banknotes"
                  size="sm"
                  :disabled="savingInvoice"
                  :loading="savingInvoice"
                  @click="handlePay"
                >
                  Pay
                </UButton>
              </template>

              <!-- Regular save buttons for Draft and other statuses -->
              <template v-else-if="!isViewMode && showAnySaveButtons">
                <UTooltip
                  v-if="showSaveDraftButton && isReadOnlyStatus"
                  text="This invoice has been approved or paid and cannot be edited. All fields are read-only."
                >
                  <UButton
                    v-if="showSaveDraftButton"
                    data-testid="btn-save-draft"
                    :color="saveDraftButtonColor"
                    :variant="saveDraftButtonVariant"
                    :icon="saveDraftButtonIcon"
                    size="sm"
                    :disabled="isSaveDraftButtonDisabled"
                    :loading="savingInvoice"
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
                  :disabled="savingInvoice"
                  :loading="savingInvoice"
                  @click="handleSaveAsDraft"
                >
                  {{ saveDraftButtonLabel }}
                </UButton>
                <UButton
                  v-if="showMarkPendingButton"
                  data-testid="btn-pending"
                  color="primary"
                  variant="solid"
                  icon="i-heroicons-paper-airplane"
                  size="sm"
                  :disabled="savingInvoice"
                  :loading="savingInvoice"
                  @click="handleMarkPending"
                >
                  Send for Approval
                </UButton>
              </template>
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
        <VendorInvoiceForm
          v-model:form="invoiceForm"
          :editing-invoice="!!invoiceForm.uuid"
          :loading="loadingEditInvoice"
          :readonly="isViewMode || isReadOnlyStatus"
          :total-invoice-amount-error="totalInvoiceAmountError"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, watch, onMounted, useTemplateRef, resolveComponent, nextTick } from "vue";
import { useCorporationStore } from '@/stores/corporations'
import { useVendorInvoicesStore } from '@/stores/vendorInvoices'
import { useVendorStore } from '@/stores/vendors'
import { useProjectsStore } from '@/stores/projects'
import { useCostCodeConfigurationsStore } from '@/stores/costCodeConfigurations'
import { usePurchaseOrdersStore } from '@/stores/purchaseOrders'
import { useChangeOrdersStore } from '@/stores/changeOrders'
import { usePurchaseOrderResourcesStore } from '@/stores/purchaseOrderResources'
import { useTableStandard } from '@/composables/useTableStandard'
import { useDateFormat } from '@/composables/useDateFormat'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import { useUTCDateFormat } from '@/composables/useUTCDateFormat'
import { usePermissions } from '@/composables/usePermissions'
import type { TableColumn } from '@nuxt/ui'
import VendorInvoiceForm from '@/components/Payables/VendorInvoiceForm.vue'

// Local declaration to satisfy TS for auto-imported useToast
declare function useToast(): { add: (opts: any) => void }

// Resolve components for table columns
const UButton = resolveComponent('UButton')
const UTooltip = resolveComponent('UTooltip')
const UIcon = resolveComponent('UIcon')

// Stores
const corporationStore = useCorporationStore()

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
const vendorInvoicesStore = useVendorInvoicesStore()
const vendorStore = useVendorStore()
const projectsStore = useProjectsStore()
const costCodeConfigurationsStore = useCostCodeConfigurationsStore()
const purchaseOrdersStore = usePurchaseOrdersStore()
const changeOrdersStore = useChangeOrdersStore()
const purchaseOrderResourcesStore = usePurchaseOrderResourcesStore()
const { formatDate } = useDateFormat()
const { formatCurrency } = useCurrencyFormat()
const { toUTCString, getCurrentLocal } = useUTCDateFormat()

// Use permissions composable
const { isReady, hasPermission } = usePermissions()
const canEdit = computed(() => hasPermission('vendor_invoices_edit') || hasPermission('vendor_invoices_create'))
const canApprove = computed(() => hasPermission('vendor_invoices_approve'))
const canPay = computed(() => hasPermission('vendor_invoices_payment'))

// Check if invoice status should make the form read-only
const isReadOnlyStatus = computed(() => {
  const status = String(invoiceForm.value?.status || '').toLowerCase()
  // Form should be read-only for Approved and Paid statuses
  return status === 'approved' || status === 'paid'
})

// Invoice type mapping
const invoiceTypeMap: Record<string, string> = {
  'ENTER_DIRECT_INVOICE': 'Direct Invoice',
  'AGAINST_PO': 'PO Invoice',
  'AGAINST_CO': 'CO Invoice',
  'AGAINST_ADVANCE_PAYMENT': 'Advance Payment',
  'AGAINST_HOLDBACK_AMOUNT': 'Hold Back Amount',
};

const getInvoiceTypeLabel = (invoiceType: string | null | undefined): string => {
  if (!invoiceType) return 'N/A';
  return invoiceTypeMap[invoiceType] || invoiceType;
};

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
const selectedVendorInvoices = ref<any[]>([])
const globalFilter = ref('')
const showDeleteModal = ref(false)
const invoiceToDelete = ref<any>(null)
const showFormModal = ref(false)
const isViewMode = ref(false)
const invoiceForm = ref<any>({
  attachments: []
})
const savingInvoice = ref(false)
const loadingEditInvoice = ref(false)
const totalInvoiceAmountError = ref<string | null>(null)

// Approval button visibility
const showApprovalButtons = computed(() => {
  if (isViewMode.value) return false
  if (!invoiceForm.value?.uuid) return false
  if (!canApprove.value) return false
  
  // Don't show approval buttons if status is Paid
  const status = String(invoiceForm.value?.status || '').toLowerCase()
  if (status === 'paid') {
    return false
  }
  
  // Only show approval buttons when status is Pending
  return invoiceForm.value.status === 'Pending'
})

const showSaveDraftButton = computed(() => {
  if (isViewMode.value) return false
  if (!canEdit.value) return false
  
  // Don't show any buttons if status is Paid
  const invoiceStatus = String(invoiceForm.value?.status || '').toLowerCase()
  if (invoiceStatus === 'paid') {
    return false
  }
  
  // If editing an Approved invoice, only approvers can save as draft (unapprove)
  // Show it alongside Pay button (Pay button template will handle displaying both)
  if (invoiceForm.value?.uuid && invoiceStatus === 'approved') {
    return canApprove.value
  }
  
  return true
})

const showMarkPendingButton = computed(() => {
  if (isViewMode.value) return false
  if (!canEdit.value) return false
  
  // Don't show if status is Paid
  const invoiceStatus = String(invoiceForm.value?.status || '').toLowerCase()
  if (invoiceStatus === 'paid') {
    return false
  }
  
  // Don't show if status is already Pending or Approved (case-insensitive)
  if (invoiceStatus === 'pending' || invoiceStatus === 'approved') {
    return false
  }
  
  return true
})

const showPayButton = computed(() => {
  if (isViewMode.value) return false
  if (!invoiceForm.value?.uuid) return false
  if (!canPay.value) return false
  
  // Only show Pay button when status is Approved (case-insensitive check)
  const status = String(invoiceForm.value?.status || '').toLowerCase()
  return status === 'approved'
})

const showAnySaveButtons = computed(() => 
  !showApprovalButtons.value && !showPayButton.value && (showSaveDraftButton.value || showMarkPendingButton.value)
)

const saveDraftButtonLabel = computed(() => {
  const invoiceStatus = String(invoiceForm.value?.status || '').toLowerCase()
  if (invoiceStatus === 'paid') {
    return 'Locked'
  }
  if (invoiceForm.value?.uuid && invoiceStatus === 'approved') {
    return 'Unapprove & Save as Draft'
  }
  return 'Save'
})

const saveDraftButtonIcon = computed(() => {
  const invoiceStatus = String(invoiceForm.value?.status || '').toLowerCase()
  if (invoiceStatus === 'paid') {
    return 'i-heroicons-lock-closed'
  }
  if (invoiceForm.value?.uuid && invoiceStatus === 'approved') {
    return 'i-heroicons-arrow-uturn-left'
  }
  return 'i-heroicons-check'
})

const saveDraftButtonColor = computed(() => {
  const invoiceStatus = String(invoiceForm.value?.status || '').toLowerCase()
  if (invoiceStatus === 'paid') {
    return 'neutral'
  }
  if (invoiceForm.value?.uuid && invoiceStatus === 'approved') {
    return 'warning'
  }
  return 'primary'
})

const saveDraftButtonVariant = computed(() => {
  const status = String(invoiceForm.value?.status || '').toLowerCase()
  if (status === 'paid') {
    return 'soft'
  }
  if (invoiceForm.value?.uuid && status === 'approved') {
    return 'outline'
  }
  return 'solid'
})

const isSaveDraftButtonDisabled = computed(() => {
  const status = String(invoiceForm.value?.status || '').toLowerCase()
  return status === 'paid'
})

// Column pinning for sticky actions column
const columnPinning = ref({
  left: [],
  right: ['actions']
});

// Table ref for accessing table API
const table = useTemplateRef<any>('table');

// Use store data
const vendorInvoices = computed(() => vendorInvoicesStore.vendorInvoices)
const loading = computed(() => vendorInvoicesStore.loading)
const error = computed(() => vendorInvoicesStore.error)

const formModalTitle = computed(() => {
  if (isViewMode.value) return 'View Vendor Invoice'
  return invoiceForm.value?.uuid ? 'Edit Vendor Invoice' : 'New Vendor Invoice'
})

// Status display helpers for form modal
const statusLabel = computed(() => {
  const map: Record<string, string> = {
    Draft: 'Draft',
    Pending: 'Pending',
    Approved: 'Approved',
    Paid: 'Paid',
  };
  const status = invoiceForm.value?.status || 'Draft';
  return map[status] || status;
});

const statusChipClass = computed(() => {
  const map: Record<string, string> = {
    Draft:
      'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600',
    Pending:
      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700',
    Approved:
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
    Paid:
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
  };
  const status = invoiceForm.value?.status || 'Draft';
  return map[status] || map.Draft;
});

const filteredVendorInvoices = computed(() => {
  let filtered = [...vendorInvoices.value]
  
  if (globalFilter.value.trim()) {
    const searchTerm = globalFilter.value.toLowerCase().trim()
    filtered = filtered.filter(invoice => {
      const searchableFields = [
        invoice.number || '',
        invoice.vendor_name || '',
        invoice.project_name || '',
        invoice.invoice_type || '',
        invoice.po_number || '',
      ]
      return searchableFields.some(field => 
        field.toLowerCase().includes(searchTerm)
      )
    })
  }
  
  return filtered
})

// Table columns configuration
const columns: TableColumn<any>[] = [
  {
    accessorKey: 'bill_date',
    header: 'Bill Date',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => h('div', formatDate(row.original.bill_date))
  },
  {
    accessorKey: 'number',
    header: 'Invoice Number',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-medium text-default' }, row.original.number || 'N/A')
  },
  {
    accessorKey: 'project_name',
    header: 'Project Name',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.project_name || 'N/A')
  },
  {
    accessorKey: 'vendor_name',
    header: 'Vendor Name',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.vendor_name || 'N/A')
  },
  {
    accessorKey: 'invoice_type',
    header: 'Invoice Type',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => h('div', getInvoiceTypeLabel(row.original.invoice_type))
  },
  {
    accessorKey: 'due_date',
    header: 'Due Date',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const date = row.original.due_date;
      return h('div', date ? formatDate(date) : 'N/A');
    }
  },
  {
    accessorKey: 'po_number',
    header: 'Order Number',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      // Show PO number for PO invoices, CO number for CO invoices
      const orderNumber = row.original.po_number || row.original.co_number || 'N/A';
      return h('div', orderNumber);
    }
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const amount = row.original.amount || 0;
      const formattedAmount = formatCurrency(amount);
      return h('div', { class: 'text-right font-mono text-sm' }, formattedAmount);
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      let rawStatus = row.original.status || 'Draft';
      // Show Draft status as Pending in the table
      if (rawStatus === 'Draft') {
        rawStatus = 'Pending';
      }
      const statusMap: Record<string, { label: string; class: string }> = {
        Draft: {
          label: 'Draft',
          class: 'bg-warning/10 text-warning border border-warning/20'
        },
        Pending: {
          label: 'Pending',
          class: 'bg-amber-100 text-amber-700 border border-amber-200'
        },
        Approved: {
          label: 'Approved',
          class: 'bg-success/10 text-success border border-success/20'
        },
        Paid: {
          label: 'Paid',
          class: 'bg-primary/10 text-primary border border-primary/20'
        }
      };
      
      const { label, class: colorClass } = statusMap[rawStatus] ?? {
        label: rawStatus,
        class: 'bg-elevated text-default border border-default'
      };
      
      return h('span', { 
        class: `inline-flex items-center px-2 py-1 gap-1 rounded-md text-xs font-medium ${colorClass}` 
      }, label)
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
    meta: { class: { th: 'text-right sticky right-0 z-10 w-32', td: 'text-right sticky right-0 w-32' } },
    cell: ({ row }: { row: { original: any } }) => {
      const buttons = [];
      
      // View button
      buttons.push(
        h(UTooltip, { text: 'View Vendor Invoice Details' }, () => [
          h(UButton, {
            icon: 'i-heroicons-eye-solid',
            size: 'xs',
            variant: 'soft',
            color: 'neutral',
            class: 'hover:scale-105 transition-transform',
            onClick: () => previewInvoice(row.original)
          }, () => '')
        ])
      );
      
      // Edit button
      buttons.push(
        h(UTooltip, { text: 'Edit Vendor Invoice' }, () => [
          h(UButton, {
            icon: 'tdesign:edit-filled',
            size: 'xs',
            variant: 'soft',
            color: 'secondary',
            class: 'hover:scale-105 transition-transform',
            onClick: () => editInvoice(row.original)
          }, () => '')
        ])
      );
      
      // Delete button
      buttons.push(
        h(UTooltip, { text: 'Delete Vendor Invoice' }, () => [
          h(UButton, {
            icon: 'mingcute:delete-fill',
            size: 'xs',
            variant: 'soft',
            color: 'error',
            class: 'hover:scale-105 transition-transform',
            onClick: () => deleteInvoice(row.original)
          }, () => '')
        ])
      );
      
      return h('div', { class: 'flex justify-end space-x-2 items-center' }, buttons);
    }
  }
];

// Methods
const openCreateModal = () => {
  invoiceForm.value = {
    corporation_uuid: corporationStore.selectedCorporation?.uuid || corporationStore.selectedCorporationId,
    bill_date: toUTCString(getCurrentLocal()),
    due_date: null,
    number: null,
    invoice_type: '',
    vendor_uuid: null,
    credit_days: null,
    purchase_order_uuid: null,
    po_co_uuid: null,
    change_order_uuid: null,
    po_number: '',
    co_number: '',
    holdback: null,
    project_uuid: null,
    amount: 0,
    line_items: [],
    attachments: [],
    advance_payment_cost_codes: [],
    removed_advance_payment_cost_codes: []
  }
  showFormModal.value = true
  isViewMode.value = false
}

const loadInvoiceForModal = async (invoice: any, viewMode: boolean = false) => {
  if (!invoice?.uuid) {
    console.warn('[VIL] loadInvoiceForModal called without UUID', invoice)
    return
  }

  // Reset form first
  invoiceForm.value = { attachments: [] }
  isViewMode.value = viewMode
  showFormModal.value = true
  loadingEditInvoice.value = true
  
  try {
    const detailed = await vendorInvoicesStore.fetchVendorInvoice(invoice.uuid) as any
    if (!detailed) {
      return
    }

    // Set po_co_uuid based on purchase_order_uuid or change_order_uuid for POCOSelect component
    // This is needed when loading existing invoices with "Against Advance Payment" type
    if (detailed.invoice_type === 'AGAINST_ADVANCE_PAYMENT') {
      if (detailed.purchase_order_uuid) {
        detailed.po_co_uuid = `PO:${detailed.purchase_order_uuid}`
      } else if (detailed.change_order_uuid) {
        detailed.po_co_uuid = `CO:${detailed.change_order_uuid}`
      }
    }

    // Load fields in sequence to ensure dependencies are resolved correctly:
    // 1. Corporation (must be first - other fields depend on it)
    if (detailed.corporation_uuid) {
      invoiceForm.value = { ...invoiceForm.value, corporation_uuid: detailed.corporation_uuid }
      await nextTick()
      
      // Fetch data for the corporation (projects, vendors, etc.)
      await Promise.allSettled([
        vendorStore.fetchVendors(detailed.corporation_uuid),
        projectsStore.fetchProjectsMetadata(detailed.corporation_uuid),
        costCodeConfigurationsStore.fetchConfigurations(detailed.corporation_uuid, false, false),
        purchaseOrdersStore.fetchPurchaseOrders(detailed.corporation_uuid, false),
        changeOrdersStore.fetchChangeOrders(detailed.corporation_uuid, false),
      ])
      
      // Wait a bit for watchers to settle
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // 2. Project (depends on corporation)
    if (detailed.project_uuid) {
      invoiceForm.value = { ...invoiceForm.value, project_uuid: detailed.project_uuid }
      await nextTick()
      
      // Ensure project resources are loaded
      if (detailed.corporation_uuid) {
        await purchaseOrderResourcesStore.ensureProjectResources({
          corporationUuid: detailed.corporation_uuid,
          projectUuid: detailed.project_uuid,
        })
      }
      
      // Wait for project watchers to fire
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // 3. Invoice type (depends on project)
    if (detailed.invoice_type) {
      invoiceForm.value = { ...invoiceForm.value, invoice_type: detailed.invoice_type }
      await nextTick()
      // Wait for invoice type watchers to fire
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // 4. Vendor (depends on corporation)
    if (detailed.vendor_uuid) {
      invoiceForm.value = { ...invoiceForm.value, vendor_uuid: detailed.vendor_uuid }
      await nextTick()
      // Wait for vendor watchers to fire
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // 5. Purchase order / Change order / PO/CO (depends on project, vendor, corporation)
    // Set purchase_order_uuid or change_order_uuid first
    if (detailed.purchase_order_uuid) {
      invoiceForm.value = { 
        ...invoiceForm.value, 
        purchase_order_uuid: detailed.purchase_order_uuid,
        po_number: detailed.po_number || ''
      }
      await nextTick()
    } else {
      // Explicitly set to null if not present
      invoiceForm.value = { ...invoiceForm.value, purchase_order_uuid: null }
    }
    if (detailed.change_order_uuid) {
      invoiceForm.value = { 
        ...invoiceForm.value, 
        change_order_uuid: detailed.change_order_uuid,
        co_number: detailed.co_number || ''
      }
      await nextTick()
    } else {
      // Explicitly set to null if not present
      invoiceForm.value = { ...invoiceForm.value, change_order_uuid: null }
    }
    // Set po_co_uuid for advance payment invoices
    if (detailed.po_co_uuid) {
      invoiceForm.value = { ...invoiceForm.value, po_co_uuid: detailed.po_co_uuid }
      await nextTick()
    } else {
      // Explicitly set to null if not present (for non-advance-payment invoices)
      invoiceForm.value = { ...invoiceForm.value, po_co_uuid: null }
    }

    // 6. Now set all remaining fields at once (dates, amounts, etc.)
    const remainingFields = {
      bill_date: detailed.bill_date,
      due_date: detailed.due_date,
      number: detailed.number,
      credit_days: detailed.credit_days,
      holdback: detailed.holdback,
      amount: detailed.amount,
      line_items: detailed.line_items || [],
      attachments: detailed.attachments || [],
      advance_payment_cost_codes: detailed.advance_payment_cost_codes || [],
      removed_advance_payment_cost_codes: detailed.removed_advance_payment_cost_codes || [],
      po_invoice_items: detailed.po_invoice_items || [],
      co_invoice_items: detailed.co_invoice_items || [],
      financial_breakdown: detailed.financial_breakdown,
      uuid: detailed.uuid,
      status: detailed.status,
      // Include any other fields that might be needed
      ...Object.keys(detailed).reduce((acc: any, key: string) => {
        // Only include fields that haven't been set yet
        if (!['corporation_uuid', 'project_uuid', 'invoice_type', 'vendor_uuid', 
              'purchase_order_uuid', 'change_order_uuid', 'po_co_uuid', 'po_number', 'co_number'].includes(key)) {
          acc[key] = detailed[key]
        }
        return acc
      }, {})
    }
    
    invoiceForm.value = { ...invoiceForm.value, ...remainingFields }
    await nextTick()
    
    // Wait a bit more for all watchers to settle
    await new Promise(resolve => setTimeout(resolve, 100))
  } catch (error) {
    console.error("[VIL] Failed to fetch invoice details:", error);
  } finally {
    loadingEditInvoice.value = false;
  }
}

const editInvoice = async (invoice: any) => {
  await loadInvoiceForModal(invoice, false)
}

const switchToEditMode = () => {
  isViewMode.value = false
}

const closeFormModal = () => {
  showFormModal.value = false
  isViewMode.value = false
  invoiceForm.value = {
    attachments: []
  }
  loadingEditInvoice.value = false
  totalInvoiceAmountError.value = null
  // Clear the current vendor invoice from the store when modal closes
  vendorInvoicesStore.clearCurrentVendorInvoice()
}

// Status-based save handlers
const submitWithStatus = async (status: 'Draft' | 'Pending' | 'Approved' | 'Paid') => {
  if (savingInvoice.value) return
  
  invoiceForm.value.status = status
  
  await saveInvoice()
}

const handleSaveAsDraft = () => {
  // For approved invoices, unapprove and save as draft
  const invoiceStatus = String(invoiceForm.value?.status || '').toLowerCase()
  if (invoiceForm.value?.uuid && invoiceStatus === 'approved') {
    return submitWithStatus('Draft')
  }
  // For new invoices or draft invoices, save as pending
  return submitWithStatus('Pending')
}
const handleMarkPending = () => submitWithStatus('Pending')
const handleApprove = async () => {
  await submitWithStatus('Approved')
}
const handleRejectToDraft = () => submitWithStatus('Pending')
const handlePay = async () => {
  await submitWithStatus('Paid')
}

const saveInvoice = async () => {
  if (!corporationStore.selectedCorporationId) {
    const toast = useToast();
    toast.add({ title: 'Error', description: 'Select a corporation first', color: 'error' })
    return
  }
  
  // Validate Against PO invoice type - amount must be entered
  const invoiceType = String(invoiceForm.value.invoice_type || '').toUpperCase()
  const isAgainstPO = invoiceType === 'AGAINST_PO'
  const amount = invoiceForm.value.amount || 0
  const amountValue = typeof amount === 'number' ? amount : parseFloat(String(amount)) || 0
  
  if (isAgainstPO && (amountValue === 0 || amountValue === null || amountValue === undefined || isNaN(amountValue))) {
    totalInvoiceAmountError.value = 'Please enter the amount to be paid for the invoice'
    const toast = useToast();
    toast.add({ 
      title: 'Validation Error', 
      description: 'Please enter the amount to be paid for the invoice in Total Invoice Amount', 
      color: 'error' 
    })
    savingInvoice.value = false
    return
  }
  
  // Clear error if validation passes
  totalInvoiceAmountError.value = null
  
  savingInvoice.value = true
  try {
    // Prepare form data for submission
    const formData = { ...invoiceForm.value };
    
    // Ensure status is set (default to Draft if not set)
    if (!formData.status) {
      formData.status = 'Draft'
    }
    
    // If this is an AGAINST_PO invoice, ensure po_invoice_items is populated
    const invoiceType = String(formData.invoice_type || '').toUpperCase();
    if (invoiceType === 'AGAINST_PO') {
      // Ensure po_invoice_items is set - it should be synced by the watcher
      // but we'll ensure it's present even if watcher hasn't fired
      if (!formData.po_invoice_items || !Array.isArray(formData.po_invoice_items)) {
        console.warn('[VIL] po_invoice_items not found in form data, setting empty array');
        formData.po_invoice_items = [];
      } else {
        console.log('[VIL] po_invoice_items found:', formData.po_invoice_items.length, 'items');
      }

      // Calculate and include advance payment deduction amount
      // This is the amount that will be deducted from the invoice total
      // Calculate total before deduction from invoice's own totals: item_total + charges_total + tax_total
      if (formData.financial_breakdown && typeof formData.financial_breakdown === 'object') {
        const fb = formData.financial_breakdown;
        const itemTotal = parseFloat(fb.totals?.item_total || '0') || 0;
        const chargesTotal = parseFloat(fb.totals?.charges_total || '0') || 0;
        const taxTotal = parseFloat(fb.totals?.tax_total || '0') || 0;
        const totalBeforeDeduction = itemTotal + chargesTotal + taxTotal;
        const finalAmount = parseFloat(formData.amount || '0') || 0;
        const deductionAmount = Math.max(0, totalBeforeDeduction - finalAmount);
        
        if (deductionAmount > 0) {
          formData.advance_payment_deduction = deductionAmount;
          console.log('[VIL] Advance payment deduction:', deductionAmount, 'calculated from totals:', { itemTotal, chargesTotal, taxTotal, totalBeforeDeduction, finalAmount });
        }
      }

      // Log adjusted advance payment amounts for debugging
      console.log('[VIL] AGAINST_PO adjusted_advance_payment_amounts:', formData.adjusted_advance_payment_amounts);
      console.log('[VIL] AGAINST_PO adjusted_advance_payment_uuid:', formData.adjusted_advance_payment_uuid);
      console.log('[VIL] Full formData being sent:', JSON.stringify({
        adjusted_advance_payment_amounts: formData.adjusted_advance_payment_amounts,
        adjusted_advance_payment_uuid: formData.adjusted_advance_payment_uuid,
      }, null, 2));
    }
    
    // If this is an AGAINST_CO invoice, ensure co_invoice_items is populated
    if (invoiceType === 'AGAINST_CO') {
      // Ensure co_invoice_items is set - it should be synced by the watcher
      // but we'll ensure it's present even if watcher hasn't fired
      if (!formData.co_invoice_items || !Array.isArray(formData.co_invoice_items)) {
        console.warn('[VIL] co_invoice_items not found in form data, setting empty array');
        formData.co_invoice_items = [];
      } else {
        console.log('[VIL] co_invoice_items found:', formData.co_invoice_items.length, 'items');
      }
      
      // Log adjusted advance payment amounts for debugging
      console.log('[VIL] AGAINST_CO adjusted_advance_payment_amounts:', formData.adjusted_advance_payment_amounts);
      console.log('[VIL] AGAINST_CO adjusted_advance_payment_uuid:', formData.adjusted_advance_payment_uuid);
    }
    
    // If this is an AGAINST_ADVANCE_PAYMENT invoice, ensure advance_payment_cost_codes and removed_advance_payment_cost_codes are populated
    if (invoiceType === 'AGAINST_ADVANCE_PAYMENT') {
      // Ensure advance_payment_cost_codes is set
      if (!formData.advance_payment_cost_codes || !Array.isArray(formData.advance_payment_cost_codes)) {
        console.warn('[VIL] advance_payment_cost_codes not found in form data, setting empty array');
        formData.advance_payment_cost_codes = [];
      } else {
        console.log('[VIL] advance_payment_cost_codes found:', formData.advance_payment_cost_codes.length, 'items');
      }
      
      // Ensure removed_advance_payment_cost_codes is set (even if empty)
      if (!formData.removed_advance_payment_cost_codes || !Array.isArray(formData.removed_advance_payment_cost_codes)) {
        formData.removed_advance_payment_cost_codes = [];
      }
    }
    
    
    let savedInvoice;
    if (invoiceForm.value.uuid) {
      savedInvoice = await vendorInvoicesStore.updateVendorInvoice({
        uuid: invoiceForm.value.uuid,
        ...formData
      })
    } else {
      savedInvoice = await vendorInvoicesStore.createVendorInvoice(formData)
    }
    
    if (savedInvoice) {
      // Clear the store immediately after successful save operation
      // This ensures the store is cleared for all save operations: save as draft, approve, reject, pay
      vendorInvoicesStore.clearCurrentVendorInvoice()
      
      const toast = useToast();
      toast.add({ 
        title: invoiceForm.value.uuid ? 'Updated' : 'Created', 
        description: `Vendor invoice ${invoiceForm.value.uuid ? 'updated' : 'created'} successfully`, 
        color: 'success' 
      })
      
      closeFormModal()
    } else {
      throw new Error(vendorInvoicesStore.error || 'Failed to save vendor invoice')
    }
  } catch (e) {
    console.error('Error saving vendor invoice:', e)
    const toast = useToast();
    toast.add({ 
      title: 'Error', 
      description: vendorInvoicesStore.error || 'Failed to save vendor invoice', 
      color: 'error' 
    })
  } finally {
    savingInvoice.value = false
  }
}

const deleteInvoice = (invoice: any) => {
  invoiceToDelete.value = invoice
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (!invoiceToDelete.value?.uuid) return

  try {
    const success = await vendorInvoicesStore.deleteVendorInvoice(invoiceToDelete.value.uuid)
    
    if (success) {
      // Refetch the vendor invoices list to ensure the table is in sync
      const corpUuid = corporationStore.selectedCorporation?.uuid || corporationStore.selectedCorporationId
      if (corpUuid) {
        await vendorInvoicesStore.fetchVendorInvoices(corpUuid)
      }
      
      const toast = useToast();
      toast.add({
        title: "Success",
        description: "Vendor invoice deleted successfully",
        color: "success",
        icon: "i-heroicons-check-circle",
      });
      
      showDeleteModal.value = false
      invoiceToDelete.value = null
    } else {
      throw new Error(vendorInvoicesStore.error || 'Failed to delete vendor invoice')
    }
  } catch (error) {
    console.error('Error deleting vendor invoice:', error)
    const toast = useToast();
    toast.add({
      title: "Error",
      description: vendorInvoicesStore.error || "Failed to delete vendor invoice",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  }
}

const cancelDelete = () => {
  showDeleteModal.value = false
  invoiceToDelete.value = null
}

const previewInvoice = async (invoice: any) => {
  await loadInvoiceForModal(invoice, true)
}

// Watchers to sync pagination with TanStack Table
watch(() => pagination.value.pageSize, (newSize) => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageSize(newSize);
  }
});

watch(globalFilter, () => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageIndex(0);
  }
});

// Watch for corporation changes to fetch invoices
watch(
  () => corporationStore.selectedCorporation?.uuid,
  (uuid) => {
    if (uuid && process.client) {
      vendorInvoicesStore.fetchVendorInvoices(uuid);
    }
  },
  { immediate: true }
);

// Watch for amount changes to clear error
watch(
  () => invoiceForm.value.amount,
  () => {
    if (totalInvoiceAmountError.value) {
      totalInvoiceAmountError.value = null
    }
  }
)

// Watch for modal closing via v-model (clicking outside or ESC key)
// This ensures the store is cleared even if the modal is closed without calling closeFormModal()
watch(showFormModal, (isOpen) => {
  if (!isOpen) {
    // Modal was closed - clear the store
    vendorInvoicesStore.clearCurrentVendorInvoice()
    // Also reset local form state if not already reset
    if (invoiceForm.value?.uuid) {
      invoiceForm.value = {
        attachments: []
      }
      isViewMode.value = false
      loadingEditInvoice.value = false
      totalInvoiceAmountError.value = null
    }
  }
});

// Initialize when component mounts
onMounted(async () => {
  if (process.client) {
    await corporationStore.ensureReady();
    
    if (corporationStore.selectedCorporation?.uuid) {
      await vendorInvoicesStore.fetchVendorInvoices(
        corporationStore.selectedCorporation.uuid
      );
    }
  }
});

</script>

