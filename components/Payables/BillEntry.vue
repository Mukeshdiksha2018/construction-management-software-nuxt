<template>
  <div>
    <div class="flex justify-end items-center mb-4">
      <div class="flex-1 max-w-sm mr-2">
        <UInput
          v-model="globalFilter"
          placeholder="Search bills..."
          icon="i-heroicons-magnifying-glass"
          variant="subtle"
          size="xs"
          class="w-full"
        />
      </div>
      <div class="flex gap-3">
        <UButton
          v-if="selectedBills.length > 0"
          icon="i-heroicons-check"
          color="success"
          variant="soft"
          @click="bulkApprove"
        >
          Approve Selected ({{ selectedBills.length }})
        </UButton>
        <UButton
          icon="i-heroicons-plus"
          color="primary"
          size="xs"
          @click="addNewBill"
        >
          Add Bill
        </UButton>
      </div>
    </div>

    <!-- Bills Table -->
    <div v-if="loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Table Header -->
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-10 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
            <!-- Type Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-8" />
            </div>
            <!-- Book Date Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <!-- Bill Date Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <!-- Corporation Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <!-- Payee Name Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <!-- Due Date Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <!-- Amount Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-12" />
            </div>
            <!-- Status Column -->
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-12" />
            </div>
            <!-- Attachment Column -->
            <div class="flex items-center justify-center">
              <USkeleton class="h-4 w-12" />
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
              <!-- Type Cell -->
              <div class="flex items-center">
                <USkeleton class="h-4 w-12" />
              </div>
              <!-- Book Date Cell -->
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <!-- Bill Date Cell -->
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <!-- Corporation Cell -->
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <!-- Payee Name Cell -->
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <!-- Due Date Cell -->
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <!-- Amount Cell -->
              <div class="flex items-center">
                <USkeleton class="h-4 w-16" />
              </div>
              <!-- Status Cell -->
              <div class="flex items-center gap-1">
                <USkeleton class="h-3 w-3 rounded-full" />
                <USkeleton class="h-5 w-16 rounded-full" />
              </div>
              <!-- Attachment Cell -->
              <div class="flex items-center justify-center">
                <USkeleton class="h-5 w-5 rounded" />
              </div>
              <!-- Actions Cell -->
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

    <div v-else-if="bills.length">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        v-model:column-pinning="columnPinning"
        :pagination-options="paginationOptions"
        :data="filteredBills" 
        :columns="columns"
        v-model:selected="selectedBills"
        v-model:global-filter="globalFilter"
        :selectable="true"
        class="max-h-[70vh] overflow-auto"
      />
      
      <!-- Pagination - only show if more than 10 records -->
      <div v-if="shouldShowPagination(filteredBills.length).value" class="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <!-- Page Size Selector -->
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
        
        <!-- Pagination Component -->
        <UPagination v-bind="getPaginationProps(table)" />
        
        <!-- Page Info -->
        <div class="text-sm text-gray-600">
          {{ getPageInfo(table, 'bills').value }}
        </div>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-document-text" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg font-medium">No bills found</p>
      <p class="text-gray-400 text-sm">Get started by adding your first bill</p>
    </div>

    <!-- Add/Edit Bill Modal -->
    <UModal 
      v-model:open="showModal" 
      fullscreen
      :ui="{ body: 'sm:p-2 flex-1 overflow-y-auto p-1' }"
      @update:open="(value) => !value && resetForm()"
    >
      <template #header>
        <div class="flex items-center justify-between w-full">
          <!-- Title on the left -->
          <h3 class="text-lg font-semibold text-gray-900">
            {{ getModalTitle() }}
          </h3>
          
          <!-- Badge in the center -->
          <div class="flex-1 flex justify-center">
            <UBadge 
              :color="getStatusBadgeColor(form.approval_status || 'Pending')"
              variant="solid"
              size="md"
              :icon="getStatusIcon(form.approval_status || 'Pending')"
            >
              {{ form.approval_status || 'Pending' }}
            </UBadge>
          </div>
          
          <!-- Action buttons on the right -->
          <div class="flex items-center gap-2">
            <!-- View Audit button (only show when editing) -->
            <UButton
              v-if="editingBill && form.id"
              icon="i-heroicons-shield-check-solid"
              color="info"
              variant="solid"
              size="xs"
              @click="showBillAuditLog({ id: form.id })"
            >
              View Audit
            </UButton>
            <!-- Close button -->
            <UTooltip text="Close Modal" color="neutral">
              <UButton
                color="neutral"
                variant="solid"
                icon="i-heroicons-x-mark"
                size="sm"
                @click="closeModal"
              />
            </UTooltip>
          </div>
        </div>
      </template>
      <template #body>
        <BillEntryForm
          v-model:form="form"
          :editing-bill="!!editingBill"
          @add-line-item="addLineItem"
          @remove-line-item="removeLineItem"
          @update-line-calculations="updateLineItemCalculations"
          @add-credit-account="addCreditAccount"
          @remove-credit-account="removeCreditAccount"
          @update-credit-calculations="updateCreditAccountCalculations"
          @vendor-change="onVendorChange"
          @file-upload="handleFileUpload"
          @update:form="handleFormUpdate"
        />
      </template>

      <template #footer>
        <div class="flex justify-between items-center">
          <!-- Right side - Form action buttons -->
          <div class="flex gap-3">
            <UButton color="neutral" variant="solid" @click="closeModal">
              Cancel
            </UButton>
            <UButton 
              color="primary" 
              :disabled="!isAmountBalanced"
              @click="submitBill('submit')"
            >
              {{ editingBill ? "Update" : "Add" }} Bill
            </UButton>
            <UButton
              v-if="editingBill && form.approval_status === 'Pending'"
              icon="i-heroicons-check-circle"
              color="success"
              variant="solid"
              @click="approveBill"
            >
              Approve
            </UButton>
            <!-- Pay Button (only show when editing and status is Approved) -->
            <UButton
              v-if="editingBill && form.approval_status === 'Approved'"
              icon="i-heroicons-currency-dollar"
              color="primary"
              variant="solid"
              :disabled="!isAmountBalanced"
              @click="payBill"
            >
              Pay
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" :title="'Delete Bill'" :description="''">
      <template #body>
        <div class="p-6">
          <div class="flex items-center mb-4">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-500 mr-3" />
            <div>
              <h3 class="text-lg font-medium text-gray-900">Delete Bill</h3>
              <p class="text-sm text-gray-500">This action cannot be undone.</p>
            </div>
          </div>
          
          <div v-if="billToDelete" class="bg-gray-50 p-4 rounded-lg mb-4">
            <p class="text-sm text-gray-700">
              <strong>Bill #:</strong> {{ billToDelete.number || 'N/A' }}<br>
              <strong>Vendor:</strong> {{ (billToDelete as any).vendors?.vendor_name || billToDelete.payee_name || 'N/A' }}<br>
              <strong>Amount:</strong> {{ formatCurrency(billToDelete.amount) }}<br>
              <strong>Date:</strong> {{ formatDate(billToDelete.bill_date) || 'N/A' }}
            </p>
          </div>
          
          <p class="text-gray-600">
            Are you sure you want to delete this bill? This will permanently remove the bill and all associated data.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="soft" @click="cancelDelete">
            Cancel
          </UButton>
          <UButton color="error" @click="confirmDelete">
            Delete Bill
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Bill Preview Modal -->
    <AttachmentPreview
      v-model:open="showPreviewModal"
      :attachment="previewBill?.attachments?.[0] || null"
      title="Attachment Preview"
      description="View bill attachments"
      size="7xl"
      :show-edit-button="true"
      :show-delete-button="true"
      @edit="editBillFromPreview"
      @delete="deleteBillFromPreview"
    />

    <!-- Bill Audit Log Slideover -->
    <AuditLogSlideover
      v-model:open="showBillAuditLogModal"
      :entity-id="selectedBillForAudit?.id || ''"
      entity-type="bill_entry"
      :corporation-uuid="corpStore.selectedCorporation?.uuid || ''"
      :title="selectedBillForAudit ? `Bill #${selectedBillForAudit.number || 'N/A'}` : 'Audit Log'"
      :description="selectedBillForAudit ? `${(selectedBillForAudit as any).vendors?.vendor_name || selectedBillForAudit.payee_name || 'Unknown Vendor'} - ${formatCurrency(selectedBillForAudit.amount)}` : 'View audit trail'"
      :auto-refresh="true"
      @logs-loaded="onAuditLogsLoaded"
      @error="onAuditLogError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, watch, onMounted, nextTick, resolveComponent, useTemplateRef } from "vue";
import { useVendorStore } from "@/stores/vendors";
import { useCorporationStore } from "@/stores/corporations";
import { useChartOfAccountsStore } from "@/stores/chartOfAccounts";
import { useBillEntriesStore } from "@/stores/billEntries";
import { useCurrencyFormat } from '@/composables/useCurrencyFormat';
import { useDateFormat } from '@/composables/useDateFormat';
import { useUTCDateFormat } from '@/composables/useUTCDateFormat';
import { useAuditLog } from '@/composables/useAuditLog';
import { useDateRangeStore } from "@/stores/dateRange";
import { useTableStandard, createSortableColumn, createActionColumn } from '@/composables/useTableStandard'
import type { TableColumn } from '@nuxt/ui'
import BillEntryForm from './BillEntryForm.vue'
import AuditLogSlideover from '@/components/AuditLogs/AuditLogSlideover.vue'
import AttachmentPreview from '@/components/Shared/AttachmentPreview.vue'

// Use table standard composable
const {
  pagination,
  paginationOptions,
  pageSizeOptions,
  updatePageSize,
  shouldShowPagination,
  getPaginationProps,
  getPageInfo
} = useTableStandard()

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UIcon = resolveComponent('UIcon')
const UTable = resolveComponent('UTable')
const UPagination = resolveComponent('UPagination')
const USelect = resolveComponent('USelect')
const UTooltip = resolveComponent('UTooltip')

const vendorStore = useVendorStore();
const corpStore = useCorporationStore();
const chartOfAccountsStore = useChartOfAccountsStore();
const billEntriesStore = useBillEntriesStore();
const dateRangeStore = useDateRangeStore();
const { formatCurrency, currencySymbol } = useCurrencyFormat();
const { formatDate, isOverdue, isDueSoon } = useDateFormat();
const { fromUTCString, toUTCString, getCurrentLocal } = useUTCDateFormat();

// Audit log functionality
const { 
  generateAuditLogInfo, 
  showAuditLog, 
  closeAuditLog, 
  onAuditLogsLoaded, 
  onAuditLogError, 
  onExportAuditLogs 
} = useAuditLog({
  entityType: 'bill_entry',
  corporationUuid: computed(() => corpStore.selectedCorporation?.uuid || ''),
  formatCurrency
});

const showModal = ref(false);
const editingBill = ref<null | string>(null);
const selectedBills = ref<any[]>([]);
const showDeleteModal = ref(false);
const billToDelete = ref<any>(null);
const showPreviewModal = ref(false);
const previewBill = ref<any>(null);
const globalFilter = ref('');
const uploadedFile = ref<File | null>(null);
const fileUploadError = ref<string | null>(null);
const showBillAuditLogModal = ref(false);
const selectedBillForAudit = ref<any>(null);
const auditLogsCount = ref(0);

// Column pinning for sticky actions column
const columnPinning = ref({
  left: [],
  right: ['actions']
});

// Table ref for accessing table API
const table = useTemplateRef<any>('table');

// Use store states
const loading = computed(() => billEntriesStore.loading);
const error = computed(() => billEntriesStore.error);

// Enhanced form with normalized line items
const form = ref({
  id: "" as string | undefined,
  type: "Bill",
  books_date: "",
  bill_date: "",
  corporation_uuid: "",
  number: "",
  vendor_uuid: "",
  account_number: "",
  pay_method: "CHECK",
  memo: "",
  due_date: "",
  amount: 0,
  approval_status: "Pending",
  approved_by: "",
  address: "",
  credit_days: "Net 10",
  check_memo: "",
  ref_number: "",
  void: false,
  hold_payment: false,
  line_items: [] as any[], // Debit side accounts
  credit_accounts: [] as any[], // Credit side accounts
  attachments: [] as any[]
});


// Use store data
const bills = computed(() => billEntriesStore.billEntries);

// Computed properties for audit log
const auditLogTitle = computed(() => {
  if (selectedBillForAudit.value) {
    return `Audit Log - Bill #${selectedBillForAudit.value.number || 'N/A'}`;
  }
  return 'Audit Log';
});

const auditLogDescription = computed(() => {
  if (selectedBillForAudit.value) {
    const vendorName = (selectedBillForAudit.value as any).vendors?.vendor_name || selectedBillForAudit.value.payee_name || 'Unknown Vendor';
    return `View the complete audit trail for ${vendorName}`;
  }
  return 'View the complete audit trail for this bill';
});

// Computed property for filtered bills based on global filter
const filteredBills = computed(() => {
  if (!globalFilter.value.trim()) {
    return bills.value;
  }

  const searchTerm = globalFilter.value.toLowerCase().trim();
  
  return bills.value.filter(bill => {
    // Search across all relevant fields
    const searchableFields = [
      bill.type || '',
      bill.number || '',
      (bill as any).vendors?.vendor_name || bill.payee_name || '',
      bill.pay_method || '',
      bill.memo || '',
      bill.approval_status || ''
    ];

    // Check if any field contains the search term
    return searchableFields.some(field => 
      field.toLowerCase().includes(searchTerm)
    );
  });
});

// Computed property to check if amounts are balanced
const isAmountBalanced = computed(() => {
  const mainAmount = parseFloat(String(form.value.amount)) || 0;
  const lineItemsTotal = form.value.line_items.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);
  const creditAccountsTotal = form.value.credit_accounts.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);
  
  // For Pending status: only check debit side balance
  if (form.value.approval_status === 'Pending') {
    const difference = Math.abs(mainAmount - lineItemsTotal);
    return difference < 0.01;
  }
  
  // For Approved status: check both debit and credit sides are balanced
  if (form.value.approval_status === 'Approved') {
    const debitDifference = Math.abs(mainAmount - lineItemsTotal);
    const creditDifference = Math.abs(mainAmount - creditAccountsTotal);
    return debitDifference < 0.01 && creditDifference < 0.01;
  }
  
  // For Paid status: same as Approved
  if (form.value.approval_status === 'Paid') {
    const debitDifference = Math.abs(mainAmount - lineItemsTotal);
    const creditDifference = Math.abs(mainAmount - creditAccountsTotal);
    return debitDifference < 0.01 && creditDifference < 0.01;
  }
  
  return true;
});





// Table columns configuration
const columns: TableColumn<any>[] = [
  {
    accessorKey: 'type',
    header: 'Type',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'text-default' }, row.original.type)
  },
  {
    accessorKey: 'books_date',
    header: 'Book Date',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'text-default' }, formatDate(row.original.books_date))
  },
  {
    accessorKey: 'bill_date',
    header: 'Bill Date',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'text-default' }, formatDate(row.original.bill_date))
  },
  {
    accessorKey: 'corporation',
    header: 'Corporation',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const corporation = corpStore.corporations.find(corp => corp.uuid === row.original.corporation_uuid);
      return h('div', { class: 'text-default' }, corporation?.corporation_name || 'N/A');
    }
  },
  {
    accessorKey: 'payee_name',
    header: 'Payee Name',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'text-default' }, (row.original as any).vendors?.vendor_name || row.original.payee_name || '-')
  },
  {
    accessorKey: 'due_date',
    header: 'Due Date',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      if (!row.original.due_date) return h('div', '-');
      
      const overdue = isOverdue(row.original.due_date) && row.original.approval_status !== 'Approved';
      const dueSoon = isDueSoon(row.original.due_date) && row.original.approval_status !== 'Approved';
      
      return h('div', { 
        class: `${overdue ? 'text-red-600 font-medium' : dueSoon ? 'text-orange-600 font-medium' : ''}` 
      }, [
        h('span', formatDate(row.original.due_date)),
        overdue ? h('UIcon', { name: 'i-heroicons-exclamation-triangle', class: 'w-4 h-4 ml-1 text-red-500' }) : null
      ]);
    }
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const amount = row.original.amount || 0;
      const formattedAmount = formatCurrency(amount);
      
      return h('div', { 
        class: 'text-right font-mono text-sm' 
      }, formattedAmount);
    }
  },
  {
    accessorKey: 'approval_status',
    header: 'Status',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const status = row.original.approval_status;
      const statusConfig = {
        'Pending': { color: 'warning', variant: 'soft', icon: 'i-heroicons-clock' },
        'Approved': { color: 'success', variant: 'soft', icon: 'i-heroicons-check-circle' },
        'Paid': { color: 'info', variant: 'soft', icon: 'i-heroicons-currency-dollar' },
        'Rejected': { color: 'error', variant: 'soft', icon: 'i-heroicons-x-circle' }
      };
      
      const config = statusConfig[status as keyof typeof statusConfig] || { color: 'neutral', variant: 'soft', icon: 'i-heroicons-question-mark-circle' };
      
      return h(UBadge, {
        color: config.color,
        variant: config.variant,
        size: 'sm',
        icon: config.icon
      }, () => status);
    }
  },
  {
    accessorKey: 'attachments',
    header: 'Attachment',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const attachments = row.original.attachments || [];
      if (attachments.length === 0) {
        return h('div', { class: 'flex items-center justify-center' }, [
          h('UIcon', { name: 'i-heroicons-document-text', class: 'w-5 h-5 text-gray-300' })
        ]);
      }
      
      return h('div', { class: 'flex items-center justify-center' }, [
        h(UTooltip, { text: 'View Attachments' }, () => [
          h(UButton, {
            icon: 'i-heroicons-paper-clip',
            size: 'xs',
            variant: 'soft',
            color: 'info',
            onClick: () => previewBillFiles(row.original)
          }, () => '')
        ])
      ]);
    }
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'flex justify-end gap-1' }, [
      h(UTooltip, { text: 'View Audit Log' }, () => [
        h(UButton, {
          icon: 'i-heroicons-shield-check-solid',
          size: 'xs',
          variant: 'solid',
          color: 'info',
          onClick: () => showBillAuditLog(row.original)
        }, () => '')
      ]),
      h(UTooltip, { text: 'Edit Bill' }, () => [
        h(UButton, {
          icon: 'tdesign:edit-filled',
          size: 'xs',
          variant: 'soft',
          color: 'secondary',
          onClick: () => editBill(row.original)
        }, () => '')
      ]),
      h(UTooltip, { text: 'Delete Bill' }, () => [
        h(UButton, {
          icon: 'mingcute:delete-fill',
          size: 'xs',
          variant: 'soft',
          color: 'error',
          onClick: () => deleteBill(row.original)
        }, () => '')
      ])
    ])
  }
];


// Methods
const addNewBill = async () => {
  // Ensure corporations are loaded before opening the modal
  if (corpStore.corporations.length === 0) {
    await corpStore.fetchCorporations();
  }
  
  resetForm();
  showModal.value = true;
};

const editBill = async (bill: any) => {
  editingBill.value = bill.id;
  
  // Ensure corporations are loaded first
  if (corpStore.corporations.length === 0) {
    await corpStore.fetchCorporations();
  }
  
  // Ensure accounts are loaded before populating the form
  if (chartOfAccountsStore.accounts.length === 0) {
    await chartOfAccountsStore.fetchAccounts(corpStore.selectedCorporation?.uuid || '');
  }
  
  // Map line items properly - handle both array and object structures
  let lineItems = [];
  if (bill.bill_entry_lines && Array.isArray(bill.bill_entry_lines)) {
    lineItems = bill.bill_entry_lines.map((line: any) => ({
      description: line.description || "",
      account_uuid: line.account_uuid || "",
      amount: parseFloat(line.amount) || 0,
      purpose_name: "" // Add empty purpose_name for form compatibility
    }));
  } else if (bill.line_items && Array.isArray(bill.line_items)) {
    lineItems = bill.line_items.map((line: any) => ({
      description: line.description || "",
      account_uuid: line.account_uuid || "",
      amount: parseFloat(line.amount) || 0,
      purpose_name: "" // Add empty purpose_name for form compatibility
    }));
  }
  
  // Handle attachments - they might be stored as JSON string or array
  let attachments = [];
  if (bill.attachments) {
    if (typeof bill.attachments === 'string') {
      try {
        attachments = JSON.parse(bill.attachments);
      } catch (e) {
        console.error('Error parsing attachments JSON:', e);
        attachments = [];
      }
    } else if (Array.isArray(bill.attachments)) {
      attachments = bill.attachments;
    }
  }
  
  form.value = {
    id: bill.id,
    type: bill.type || "Bill",
    books_date: fromUTCString(bill.books_date),
    bill_date: fromUTCString(bill.bill_date),
    corporation_uuid: bill.corporation_uuid || "",
    number: bill.number || "",
    vendor_uuid: bill.vendor_uuid || "",
    account_number: bill.account_number || "",
    pay_method: bill.pay_method || "CHECK",
    memo: bill.memo || "",
    due_date: fromUTCString(bill.due_date),
    amount: parseFloat(bill.amount) || 0,
    approval_status: bill.approval_status || "Pending",
    approved_by: bill.approved_by || "",
    address: bill.address || "",
    credit_days: bill.credit_days || "Net 10",
    check_memo: bill.check_memo || "",
    ref_number: bill.ref_number || "",
    void: bill.void || false,
    hold_payment: bill.hold_payment || false,
    line_items: lineItems,
    credit_accounts: bill.credit_accounts || [],
    attachments: attachments
  };
  
  // Reset uploaded file when editing (existing attachments are already in form.attachments)
  uploadedFile.value = null;
  fileUploadError.value = null;
  // Force reactivity update
  form.value = { ...form.value };
  
  // Use nextTick to ensure DOM is updated
  nextTick(() => {
    showModal.value = true;
  });
};

const deleteBill = (bill: any) => {
  billToDelete.value = bill;
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  if (!billToDelete.value) return;

  try {
    await billEntriesStore.deleteBillEntry(billToDelete.value.id);
    
    // Remove from local state
    const index = billEntriesStore.billEntries.findIndex(b => b.id === billToDelete.value.id);
    if (index > -1) {
      billEntriesStore.billEntries.splice(index, 1);
    }
    
    showDeleteModal.value = false;
    billToDelete.value = null;
  } catch (error) {
    console.error('Error deleting bill:', error);
    // You might want to show a toast notification here
  }
};

const cancelDelete = () => {
  showDeleteModal.value = false;
  billToDelete.value = null;
};

const editBillFromPreview = () => {
  if (previewBill.value) {
    showPreviewModal.value = false;
    editBill(previewBill.value);
  }
};

const deleteBillFromPreview = () => {
  if (previewBill.value) {
    showPreviewModal.value = false;
    deleteBill(previewBill.value);
  }
};

// Modal title with status
const getModalTitle = () => {
  if (editingBill.value) {
    return `Edit Bill`;
  }
  return 'Add New Bill';
};

// Approve bill method
const approveBill = async () => {
  try {
    // Update the form status locally first
    form.value.approval_status = 'Approved';
    
    // If we're editing an existing bill, update it in the backend
    if (editingBill.value && form.value.id) {
      await billEntriesStore.updateBillEntry(form.value.id, {
        ...form.value,
        approval_status: 'Approved'
      });
      
      // Update the specific entry in the store instead of refetching all
      const billIndex = billEntriesStore.billEntries.findIndex(bill => bill.id === form.value.id);
      if (billIndex !== -1 && billEntriesStore.billEntries[billIndex]) {
        billEntriesStore.billEntries[billIndex].approval_status = 'Approved';
      }
      
    }
  } catch (error) {
    console.error('Error approving bill:', error);
    // Revert the status if the update failed
    form.value.approval_status = 'Pending';
  }
};

// Pay bill method
const payBill = async () => {
  try {
    // Update the form status locally first
    form.value.approval_status = 'Paid';
    
    // If we're editing an existing bill, update it in the backend
    if (editingBill.value && form.value.id) {
      await billEntriesStore.updateBillEntry(form.value.id, {
        ...form.value,
        approval_status: 'Paid'
      });
      
      // Update the specific entry in the store instead of refetching all
      const billIndex = billEntriesStore.billEntries.findIndex(bill => bill.id === form.value.id);
      if (billIndex !== -1 && billEntriesStore.billEntries[billIndex]) {
        billEntriesStore.billEntries[billIndex].approval_status = 'Paid';
      }
      
    }
  } catch (error) {
    console.error('Error paying bill:', error);
    // Revert the status if the update failed
    form.value.approval_status = 'Approved';
  }
};

// Status badge helper methods
const getStatusBadgeColor = (status: string) => {
  const statusConfig = {
    'Pending': 'warning',
    'Approved': 'success',
    'Paid': 'info',
    'Rejected': 'error'
  };
  return statusConfig[status as keyof typeof statusConfig] || 'warning';
};

const getStatusIcon = (status: string) => {
  const statusConfig = {
    'Pending': 'i-heroicons-clock',
    'Approved': 'i-heroicons-check-circle',
    'Paid': 'i-heroicons-currency-dollar',
    'Rejected': 'i-heroicons-x-circle'
  };
  return statusConfig[status as keyof typeof statusConfig] || 'i-heroicons-clock';
};

const closeModal = () => {
  showModal.value = false;
  editingBill.value = null;
  resetForm();
};

const handleFormUpdate = (value: any) => {
  form.value = value;
};

const resetForm = () => {
  const today = getCurrentLocal();
  form.value = {
    id: undefined,
    type: "Bill",
    books_date: today,
    bill_date: today,
    corporation_uuid: corpStore.selectedCorporation?.uuid || "",
    number: "",
    vendor_uuid: "",
    account_number: "",
    pay_method: "CHECK",
    memo: "",
    due_date: today,
    amount: 0,
    approval_status: "Pending",
    approved_by: "",
    address: "",
    credit_days: "Net 10",
    check_memo: "",
    ref_number: "",
    void: false,
    hold_payment: false,
    line_items: [],
    credit_accounts: [],
    attachments: []
  };
  uploadedFile.value = null;
  fileUploadError.value = null;
};

const addLineItem = () => {
  form.value.line_items.push({
    description: "",
    account_uuid: "",
    amount: 0,
    purpose_name: ""
  });
};

const removeLineItem = (index: number) => {
  form.value.line_items.splice(index, 1);
  updateLineItemCalculations();
};

const addCreditAccount = () => {
  form.value.credit_accounts.push({
    description: "",
    account_uuid: "",
    amount: 0,
    purpose_name: ""
  });
};

const removeCreditAccount = (index: number) => {
  form.value.credit_accounts.splice(index, 1);
  updateCreditAccountCalculations();
};

const updateLineItemCalculations = () => {
  // Calculate total from line items but don't auto-overwrite main amount
  // The main amount field should remain independent
  // Validation will ensure amounts are balanced before submission
  const total = form.value.line_items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  // Don't modify the main amount - let users control it independently
  // The difference validation will catch any imbalances
};

const updateCreditAccountCalculations = () => {
  // Calculate total from credit accounts
  const total = form.value.credit_accounts.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  // Credit accounts should balance with the main amount
  // Validation will ensure amounts are balanced before submission
};

const onVendorChange = (selectedOption: any) => {
  // Handle both string UUID and object selection
  const vendorUuid = typeof selectedOption === 'string' ? selectedOption : selectedOption?.value;
  // Update the form value to ensure it's properly set
  form.value.vendor_uuid = vendorUuid;
};

const submitBill = async (mode: 'draft' | 'submit') => {
  try {
    // Ensure vendor_uuid is a string, not an object
    const vendorUuid = typeof form.value.vendor_uuid === 'string' 
      ? form.value.vendor_uuid 
      : (form.value.vendor_uuid as any)?.value || '';

    // Clean up line items to ensure proper UUID values
    const cleanedLineItems = form.value.line_items.map(item => ({
      description: item.description || "",
      account_uuid: typeof item.account_uuid === 'string' 
        ? item.account_uuid 
        : (item.account_uuid as any)?.value || "",
      amount: parseFloat(item.amount) || 0
    }));

    // Get vendor name for payee_name
    const selectedVendor = vendorStore.vendors.find(v => v.uuid === vendorUuid);
    const payeeName = selectedVendor?.vendor_name || '';

    // Convert dates to UTC before sending to API
    const payload = {
      ...form.value,
      vendor_uuid: vendorUuid,
      line_items: cleanedLineItems,
      approval_status: mode === 'draft' ? 'Pending' : form.value.approval_status,
      payee_name: payeeName, // Use actual vendor name
      attachments: form.value.attachments, // Include attachments in payload
      books_date: toUTCString(form.value.books_date),
      bill_date: toUTCString(form.value.bill_date),
      due_date: toUTCString(form.value.due_date)
    };


    let billId;
    if (editingBill.value) {
      await billEntriesStore.updateBillEntry(editingBill.value, payload);
      billId = editingBill.value;
    } else {
      const result = await billEntriesStore.createBillEntry(payload);
      billId = result?.id || result?.data?.id;
    }

    // Handle file upload for new bills (attachments with file objects need to be uploaded)
    if (billId && form.value.attachments.length > 0) {
      const attachment = form.value.attachments[0];
      
      // Only upload if this is a temporary attachment with a file object
      if (attachment.file) {
        await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const fileData = e.target?.result as string;
            
            try {
              const response = await $fetch('/api/bill-entries/upload-attachment', {
                method: 'POST',
                body: {
                  billEntryId: billId,
                  fileData: fileData,
                  fileName: attachment.name,
                  fileType: attachment.type,
                  fileSize: attachment.size
                }
              });
              
              if ('success' in response && response.success) {
                resolve(response);
              } else if ('error' in response) {
                console.error('Upload failed:', response.error);
                reject(new Error(response.error));
              }
            } catch (error) {
              console.error('Error uploading file:', error);
              reject(error);
            }
          };
          
          reader.onerror = () => reject(new Error('File reading failed'));
          reader.readAsDataURL(attachment.file);
        });
      }
    }

    // Close modal and update the specific entry in store
    closeModal();
    
    // If editing, update the specific entry in the store
    if (editingBill.value && billId) {
      const billIndex = billEntriesStore.billEntries.findIndex(bill => bill.id === billId);
      if (billIndex !== -1) {
        // Update the existing entry with the new data
        billEntriesStore.billEntries[billIndex] = { ...billEntriesStore.billEntries[billIndex], ...payload };
      }
    }
    // Note: For new bills, the store's createBillEntry method already adds the bill to the store
  } catch (error) {
    console.error('Error submitting bill:', error);
  }
};

const bulkApprove = async () => {
  try {
    for (const bill of selectedBills.value) {
      await billEntriesStore.updateBillEntry(bill.id, {
        ...bill,
        approval_status: 'Approved'
      });
      
      // Update the specific entry in the store
      const billIndex = billEntriesStore.billEntries.findIndex(b => b.id === bill.id);
      if (billIndex !== -1 && billEntriesStore.billEntries[billIndex]) {
        billEntriesStore.billEntries[billIndex].approval_status = 'Approved';
      }
    }
    selectedBills.value = [];
  } catch (error) {
    console.error('Error bulk approving bills:', error);
  }
};

const handleFileUpload = async (file: File | null) => {
  // Clear any previous errors
  fileUploadError.value = null;
  
  if (!file) {
    // Clear attachments if no file selected
    form.value.attachments = [];
    return;
  }
  
  // Validate file type
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) {
    fileUploadError.value = 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.';
    uploadedFile.value = null;
    return;
  }
  
  // Validate file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    fileUploadError.value = 'File size too large. Maximum size is 10MB.';
    uploadedFile.value = null;
    return;
  }
  
  try {
    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const fileData = e.target?.result as string;
      
      // If we're editing an existing bill, upload the attachment immediately
      if (editingBill.value) {
        try {
          const response = await $fetch('/api/bill-entries/upload-attachment', {
            method: 'POST',
            body: {
              billEntryId: editingBill.value,
              fileData: fileData,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size
            }
          });
          
          if ('success' in response && response.success) {
            // Update the form with the new attachment data
            const uploadedAttachment = response.data.attachment;
            form.value.attachments = [uploadedAttachment];
          } else if ('error' in response) {
            console.error('Upload failed:', response.error);
            fileUploadError.value = 'Failed to upload file. Please try again.';
            uploadedFile.value = null;
          }
        } catch (error) {
          console.error('Error uploading file during edit:', error);
          fileUploadError.value = 'Failed to upload file. Please try again.';
          uploadedFile.value = null;
        }
      } else {
        // For new bills, store the file data temporarily
        const tempAttachment = {
          name: file.name,
          type: file.type,
          size: file.size,
          url: fileData, // Store base64 data temporarily
          file: file // Store the file object for later upload
        };
        form.value.attachments = [tempAttachment];
      }
    };
    
    reader.readAsDataURL(file);
  } catch (error) {
    console.error('Error processing file:', error);
    uploadedFile.value = null;
  }
};

const previewBillFiles = (bill: any) => {
  previewBill.value = bill;
  showPreviewModal.value = true;
};

// File preview methods are now handled by the AttachmentPreview component

// Audit log methods (now using composable)
const showBillAuditLog = (bill: any) => {
  selectedBillForAudit.value = bill;
  showBillAuditLogModal.value = true;
};

const closeBillAuditLog = () => {
  showBillAuditLogModal.value = false;
  selectedBillForAudit.value = null;
  auditLogsCount.value = 0;
};

const exportAuditLogs = () => {
  // Export audit logs functionality would be implemented here
};





// Watch for uploaded file changes
watch(() => uploadedFile.value, (newFile) => {
  handleFileUpload(newFile);
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


// Data fetching is now handled centrally by TopBar/corporation store
// Components just consume store data directly

// Initialize data on mount
onMounted(async () => {
  // Ensure corporations are loaded first
  if (corpStore.corporations.length === 0) {
    await corpStore.fetchCorporations();
  }
  
  // Data is already fetched by TopBar, no need to fetch again
});
</script>