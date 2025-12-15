<template>
  <div class="h-[80vh] flex flex-col">
    <!-- Main Content Area -->
    <div class="flex-1 flex min-h-0">
      <!-- Left Side - All Form Fields (75%) -->
      <div ref="leftPanel" class="flex-1 flex flex-col min-h-0 overflow-y-auto pr-3" style="min-width: 300px;">
        <!-- Bill Details Section - Matching the image layout -->
        <div class="mb-3">          
          <!-- First Row: Corporation, Vendor Name, Acc Num#, Books Date -->
          <div class="grid grid-cols-4 gap-4 mb-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Corporation <span class="text-red-500">*</span>
              </label>
              <UInput
                :model-value="getCorporationName"
                disabled
                size="sm"
                class="w-full"
                icon="i-heroicons-building-office-2-solid"
              />
              <p class="text-xs text-gray-500">Auto-selected from current context</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Vendor Name <span class="text-red-500">*</span>
              </label>
              <VendorSelect
                :model-value="form.vendor_uuid"
                placeholder="Search vendor"
                size="sm"
                :corporation-uuid="corpStore.selectedCorporation?.uuid"
                @change="onVendorChange"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Acc Num#
              </label>
              <UInput
                v-model="form.account_number"
                placeholder="Account number"
                size="sm"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Books Date <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="form.books_date"
                type="date"
                size="sm"
                class="w-full"
              />
            </div>
          </div>

          <!-- Second Row: Address, Bill Date, Due Date, Credit Days -->
          <div class="grid grid-cols-4 gap-4 mb-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <div class="relative">
                <UTextarea
                  v-model="form.address"
                  placeholder="Address"
                  size="sm"
                  class="w-full"
                  :rows="2"
                />
                <UIcon name="i-heroicons-document-text" class="absolute top-2 right-2 w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Bill Date <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="form.bill_date"
                type="date"
                size="sm"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Due Date <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="form.due_date"
                type="date"
                size="sm"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Credit Days
              </label>
              <USelect
                v-model="form.credit_days"
                :items="creditDaysOptions"
                placeholder="Net 10"
                size="sm"
                class="w-full"
              />
            </div>
          </div>

          <!-- Third Row: Amount, Payment Method, Memo, Bill Num. -->
          <div class="grid grid-cols-4 gap-4 mb-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Amount <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <UInput
                  v-model="form.amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  size="sm"
                  class="w-full pl-6"
                  :disabled="form.approval_status === 'Approved'"
                />
                <span class="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 font-medium pointer-events-none">
                  {{ currencySymbol }}
                </span>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <USelect
                v-model="form.pay_method"
                :items="payMethodOptions"
                placeholder="CHECK"
                size="sm"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Memo
              </label>
              <UInput
                v-model="form.memo"
                placeholder="Memo"
                size="sm"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Bill Num. <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="form.number"
                placeholder="Bill number"
                size="sm"
                class="w-full"
              />
            </div>
          </div>

          <!-- Fourth Row: Check Memo, Ref. Num. -->
          <div class="grid grid-cols-4 gap-4 mb-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Check Memo
              </label>
              <UInput
                v-model="form.check_memo"
                placeholder="Check memo"
                size="sm"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Ref. Num.
              </label>
              <UInput
                v-model="form.ref_number"
                placeholder="Reference number"
                size="sm"
                class="w-full"
              />
            </div>
            <div></div>
            <div></div>
          </div>
        </div>

        <!-- Expense Breakdown Table Section (Debit Side) -->
        <div class="mb-3">
          <div class="flex items-center gap-2 mb-2">
            <h3 class="text-lg font-semibold text-gray-900">Expense Breakdown (Debit Side)</h3>
            <UIcon 
              v-if="form.approval_status === 'Approved'"
              name="i-heroicons-lock-closed" 
              class="w-5 h-5 text-gray-400"
            />
            <span 
              v-if="form.approval_status === 'Approved'"
              class="text-sm text-gray-500"
            >
              (Locked after approval)
            </span>
          </div>
          
          <!-- Table Header -->
          <div class="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
            <div class="grid grid-cols-12 gap-4 p-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
              <div class="col-span-2">Purpose</div>
              <div class="col-span-4">Debit Account</div>
              <div class="col-span-3">Description</div>
              <div class="col-span-2">Amount</div>
              <div class="col-span-1 text-right">Action</div>
            </div>

            <!-- Table Rows -->
            <div v-for="(item, index) in form.line_items" :key="index" class="grid grid-cols-12 gap-4 p-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
              <!-- Purpose Name -->
              <div class="col-span-2">
                <UInput
                  v-model="item.purpose_name"
                  placeholder="Purpose (optional)"
                  size="sm"
                  class="w-full"
                  :disabled="form.approval_status === 'Approved'"
                />
              </div>
              
              <!-- Account -->
              <div class="col-span-4">
                <ChartOfAccountsSelect
                  :model-value="item.account_uuid"
                  placeholder="Search account..."
                  size="sm"
                  :corporation-uuid="corpStore.selectedCorporation?.uuid"
                  :disabled="form.approval_status === 'Approved'"
                  @change="(account) => handleAccountChange(index, account)"
                />
              </div>
              
              <!-- Description -->
              <div class="col-span-3">
                <UInput
                  v-model="item.description"
                  placeholder="Description"
                  size="sm"
                  class="w-full"
                  :disabled="form.approval_status === 'Approved'"
                />
              </div>
              
              <!-- Amount -->
              <div class="col-span-2">
                <UInput
                  v-model="item.amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  size="sm"
                  class="w-full"
                  :disabled="form.approval_status === 'Approved'"
                  @input="() => emit('update-line-calculations')"
                />
              </div>
              
              <!-- Action -->
              <div class="col-span-1 flex items-center justify-end gap-1">
                <UButton
                  v-if="form.approval_status !== 'Approved'"
                  icon="i-heroicons-plus"
                  size="sm"
                  color="primary"
                  variant="soft"
                  @click="() => emit('add-line-item')"
                />
                <UButton
                  v-if="form.approval_status !== 'Approved'"
                  icon="i-heroicons-x-mark"
                  size="sm"
                  color="error"
                  variant="soft"
                  @click="() => emit('remove-line-item', index)"
                />
                <!-- Show locked icon when approved -->
                <UIcon 
                  v-if="form.approval_status === 'Approved'"
                  name="i-heroicons-lock-closed" 
                  class="w-4 h-4 text-gray-400"
                />
              </div>
            </div>

            <!-- Add Row Button -->
            <div v-if="form.line_items.length === 0 && form.approval_status !== 'Approved'" class="p-2 text-center">
              <UButton
                icon="i-heroicons-plus"
                color="primary"
                variant="soft"
                @click="() => emit('add-line-item')"
              >
                Add Line Item
              </UButton>
            </div>
            
            <!-- Locked message when approved -->
            <div v-if="form.line_items.length === 0 && form.approval_status === 'Approved'" class="p-2 text-center">
              <div class="flex items-center justify-center gap-2 text-gray-500">
                <UIcon name="i-heroicons-lock-closed" class="w-4 h-4" />
                <span class="text-sm">Debit side is locked after approval</span>
              </div>
            </div>
          </div>

          <!-- Total Amount with Difference -->
          <div class="mt-2 text-right">
            <div class="flex items-center justify-end gap-4">
              <span class="text-lg font-semibold text-gray-900">Total: {{ formatCurrency(totalLineItems) }}</span>
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-700">Difference:</span>
                <span 
                  class="text-sm font-semibold"
                  :class="Math.abs(debitDifference) < 0.01 ? 'text-green-600' : 'text-red-600'"
                >
                  {{ formatCurrency(debitDifference) }}
                </span>
                <UIcon 
                  v-if="Math.abs(debitDifference) >= 0.01"
                  name="i-heroicons-exclamation-triangle" 
                  class="w-4 h-4 text-red-500"
                />
                <UIcon 
                  v-else
                  name="i-heroicons-check-circle" 
                  class="w-4 h-4 text-green-500"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Credit Side Accounts Section (only show when approved) -->
        <div v-if="form.approval_status === 'Approved'" class="mb-3">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Payment Breakdown (Credit Side)</h3>
          
          <!-- Table Header -->
          <div class="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
            <div class="grid grid-cols-12 gap-4 p-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
              <div class="col-span-2">Purpose</div>
              <div class="col-span-4">Credit Account</div>
              <div class="col-span-3">Description</div>
              <div class="col-span-2">Amount</div>
              <div class="col-span-1 text-right">Action</div>
            </div>

            <!-- Table Rows -->
            <div v-for="(item, index) in form.credit_accounts" :key="index" class="grid grid-cols-12 gap-4 p-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
              <!-- Purpose Name -->
              <div class="col-span-2">
                <UInput
                  v-model="item.purpose_name"
                  placeholder="Purpose (optional)"
                  size="sm"
                  class="w-full"
                />
              </div>
              
              <!-- Account -->
              <div class="col-span-4">
                <ChartOfAccountsSelect
                  :model-value="item.account_uuid"
                  placeholder="Search account..."
                  size="sm"
                  :corporation-uuid="corpStore.selectedCorporation?.uuid"
                  @change="(account) => handleCreditAccountChange(index, account)"
                />
              </div>
              
              <!-- Description -->
              <div class="col-span-3">
                <UInput
                  v-model="item.description"
                  placeholder="Description"
                  size="sm"
                  class="w-full"
                />
              </div>
              
              <!-- Amount -->
              <div class="col-span-2">
                <UInput
                  v-model="item.amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  size="sm"
                  class="w-full"
                  @input="() => emit('update-credit-calculations')"
                />
              </div>
              
              <!-- Action -->
              <div class="col-span-1 flex items-center justify-end gap-1">
                <UButton
                  icon="i-heroicons-plus"
                  size="sm"
                  color="primary"
                  variant="soft"
                  @click="() => emit('add-credit-account')"
                />
                <UButton
                  icon="i-heroicons-x-mark"
                  size="sm"
                  color="error"
                  variant="soft"
                  @click="() => emit('remove-credit-account', index)"
                />
              </div>
            </div>

            <!-- Add Row Button -->
            <div v-if="form.credit_accounts.length === 0" class="p-2 text-center">
              <UButton
                icon="i-heroicons-plus"
                color="primary"
                variant="soft"
                @click="() => emit('add-credit-account')"
              >
                Add Credit Account
              </UButton>
            </div>
          </div>

          <!-- Total Amount with Difference -->
          <div class="mt-2 text-right">
            <div class="flex items-center justify-end gap-4">
              <span class="text-lg font-semibold text-gray-900">Total: {{ formatCurrency(totalCreditAccounts) }}</span>
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-700">Difference:</span>
                <span 
                  class="text-sm font-semibold"
                  :class="Math.abs(creditDifference) < 0.01 ? 'text-green-600' : 'text-red-600'"
                >
                  {{ formatCurrency(creditDifference) }}
                </span>
                <UIcon 
                  v-if="Math.abs(creditDifference) >= 0.01"
                  name="i-heroicons-exclamation-triangle" 
                  class="w-4 h-4 text-red-500"
                />
                <UIcon 
                  v-else
                  name="i-heroicons-check-circle" 
                  class="w-4 h-4 text-green-500"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Section: Checkboxes, Balance Status, and Audit Log -->
        <div class="flex justify-between items-center mt-3">
          <div class="flex items-center gap-6">
            <UCheckbox v-model="form.void" label="Void" />
            <UCheckbox v-model="form.hold_payment" label="Hold Payment" />
          </div>
          <div class="flex items-center gap-4">
            <!-- Balance Status Messages -->
            <div v-if="!isDebitBalanced" class="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-red-500" />
              <p class="text-xs font-medium text-red-800">Debit side must be balanced</p>
            </div>
            
            <div v-if="form.approval_status === 'Approved' && !isCreditBalanced" class="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-red-500" />
              <p class="text-xs font-medium text-red-800">Credit side must be balanced</p>
            </div>
            
            <div v-if="isDebitBalanced && (form.approval_status === 'Pending' || (form.approval_status === 'Approved' && isCreditBalanced))" class="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-green-500" />
              <p class="text-xs font-medium text-green-800">Amounts are balanced</p>
            </div>
            
            
          </div>
        </div>
      </div>

      <!-- Resize Handle -->
      <div class="relative flex items-center justify-center w-1 bg-gray-200 hover:bg-gray-300 cursor-ew-resize transition-colors" 
           @mousedown="startResize" 
           @touchstart="startResize">
        <div class="w-1 h-8 bg-gray-400 rounded-full"></div>
      </div>

      <!-- Right Side - File Preview (25%) -->
      <div ref="rightPanel" class="w-80 flex flex-col min-h-0 border-l border-gray-200 pl-4" style="min-width: 250px;">
        <div class="mb-2">
          <h3 class="text-lg font-semibold text-gray-900">Preview</h3>
        </div>
        
        <!-- File Upload Section -->
        <div class="mb-1">
          <UFileUpload v-slot="{ open, removeFile }" v-model="uploadedFile" accept=".pdf,.doc,.docx">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-gray-500" />
                <UButton
                  :label="uploadedFile ? 'Change file' : 'Upload file'"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  @click="open()"
                />
              </div>
              
              <p v-if="uploadedFile" class="text-xs text-gray-600 flex items-center gap-2">
                <UIcon name="i-heroicons-check-circle" class="w-3 h-3 text-green-600" />
                <span class="truncate flex-1">{{ uploadedFile.name }}</span>
                <UButton
                  label="Remove"
                  color="error"
                  variant="solid"
                  size="xs"
                  class="p-1 h-auto"
                  @click="removeFile()"
                />
              </p>
              
              <p v-if="fileUploadErrorMessage" class="text-xs text-red-600 flex items-center gap-1">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-3 h-3" />
                <span class="truncate">{{ fileUploadErrorMessage }}</span>
              </p>
              
              <p class="text-xs text-gray-500">PDF, DOC, DOCX (Max 10MB)</p>
            </div>
          </UFileUpload>
        </div>
        
        <!-- File Preview Section -->
        <div class="flex-1 border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
          <div v-if="form.attachments.length === 0" class="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <UIcon name="i-heroicons-document" class="w-16 h-16 mb-4 text-gray-300" />
            <p class="text-sm font-medium text-gray-600">No files uploaded</p>
            <p class="text-xs text-gray-400">Upload invoice files to see preview</p>
          </div>

          <div v-else class="h-full">
            <!-- Use FilePreview component for inline preview -->
            <FilePreview :attachment="currentPreviewFile" />
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useCorporationStore } from "@/stores/corporations";
import { useChartOfAccountsStore } from "@/stores/chartOfAccounts";
import { useCurrencyFormat } from '@/composables/useCurrencyFormat';
import { useDateFormat } from '@/composables/useDateFormat';
import { useResizablePanels } from '@/composables/useResizablePanels';
import { useFilePreview } from '@/composables/useFilePreview';
import ChartOfAccountsSelect from '@/components/Shared/ChartOfAccountsSelect.vue';
import VendorSelect from '@/components/Shared/VendorSelect.vue';
import FilePreview from '@/components/Shared/FilePreview.vue';

// Props
interface Props {
  form: any;
  editingBill: boolean;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'update:form': [value: any];
  'add-line-item': [];
  'remove-line-item': [index: number];
  'update-line-calculations': [];
  'add-credit-account': [];
  'remove-credit-account': [index: number];
  'update-credit-calculations': [];
  'vendor-change': [selectedOption: any];
  'file-upload': [file: File | null];
}>();

// Stores
const corpStore = useCorporationStore();
const chartOfAccountsStore = useChartOfAccountsStore();
const { formatCurrency, currencySymbol } = useCurrencyFormat();
const { formatDate } = useDateFormat();


// File preview functionality
const {
  uploadedFile,
  fileUploadError: localFileUploadError,
  handleFileUpload
} = useFilePreview({
  allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  maxSize: 10 * 1024 * 1024 // 10MB
});

// Computed property to handle parent error precedence
const fileUploadErrorMessage = computed(() => {
  return localFileUploadError.value;
});

// Resize functionality
const leftPanel = ref<HTMLElement | null>(null);
const rightPanel = ref<HTMLElement | null>(null);

const { isResizing, startResize } = useResizablePanels({
  minLeftWidth: 300,
  minRightWidth: 250,
  leftPanelRef: leftPanel,
  rightPanelRef: rightPanel
});

// Local state (removed showAuditLogModal as it's now in the composable)

// Computed properties
const getCorporationName = computed(() => {
  return corpStore.selectedCorporation?.corporation_name || "Unnamed Corporation";
});






const currentPreviewFile = computed(() => {
  if (props.form.attachments.length === 0) return null;
  const file = props.form.attachments[0];
  return file;
});

const totalLineItems = computed(() => {
  return props.form.line_items.reduce((total: number, item: any) => {
    return total + (parseFloat(item.amount) || 0);
  }, 0);
});

const totalCreditAccounts = computed(() => {
  return props.form.credit_accounts.reduce((total: number, item: any) => {
    return total + (parseFloat(item.amount) || 0);
  }, 0);
});

const debitDifference = computed(() => {
  return totalLineItems.value - (parseFloat(props.form.amount) || 0);
});

const creditDifference = computed(() => {
  return totalCreditAccounts.value - (parseFloat(props.form.amount) || 0);
});

const isDebitBalanced = computed(() => {
  return Math.abs(debitDifference.value) < 0.01;
});

const isCreditBalanced = computed(() => {
  return Math.abs(creditDifference.value) < 0.01;
});

const difference = computed(() => {
  return debitDifference.value;
});


// Options
const statusOptions = [
  { 
    label: "Pending", 
    value: "Pending",
    color: "warning",
    icon: "i-heroicons-clock"
  },
  { 
    label: "Approved", 
    value: "Approved",
    color: "success",
    icon: "i-heroicons-check-circle"
  },
  { 
    label: "Rejected", 
    value: "Rejected",
    color: "error",
    icon: "i-heroicons-x-circle"
  }
];

const payMethodOptions = [
  { label: "CHECK", value: "CHECK" },
  { label: "ACH", value: "ACH" },
  { label: "Wire Transfer", value: "WIRE" },
  { label: "Cash", value: "CASH" },
  { label: "Card", value: "CARD" }
];

const creditDaysOptions = [
  { label: "Net 10", value: "Net 10" },
  { label: "Net 15", value: "Net 15" },
  { label: "Net 30", value: "Net 30" },
  { label: "Net 45", value: "Net 45" },
  { label: "Net 60", value: "Net 60" },
  { label: "Due on Receipt", value: "Due on Receipt" }
];

const typeOptions = [
  { label: "Bill", value: "Bill" },
  { label: "Debit Memo", value: "Debit Memo" }
];

// Methods
const addLineItem = () => {
  emit('add-line-item');
};

const removeLineItem = (index: number) => {
  emit('remove-line-item', index);
};

const updateLineItemCalculations = () => {
  emit('update-line-calculations');
};

const onVendorChange = (selectedOption: any) => {
  emit('vendor-change', selectedOption);
};

const handleAccountChange = (index: number, account: any) => {
  // Handle both string UUID and object with value property
  let accountUuid = null;
  if (typeof account === 'string') {
    accountUuid = account;
  } else if (account?.value) {
    accountUuid = account.value;
  }
  
  // Update the line item with the selected account
  if (props.form.line_items[index] && accountUuid) {
    props.form.line_items[index].account_uuid = accountUuid;
    
    // Force reactivity update
    props.form.line_items = [...props.form.line_items];
  }
};

const handleCreditAccountChange = (index: number, account: any) => {
  // Handle both string UUID and object with value property
  let accountUuid = null;
  if (typeof account === 'string') {
    accountUuid = account;
  } else if (account?.value) {
    accountUuid = account.value;
  }
  
  // Update the credit account with the selected account
  if (props.form.credit_accounts[index] && accountUuid) {
    props.form.credit_accounts[index].account_uuid = accountUuid;
    
    // Force reactivity update
    props.form.credit_accounts = [...props.form.credit_accounts];
  }
};

const getSelectedAccountInfo = (accountUuid: string) => {
  if (!accountUuid) return null;
  const accounts = chartOfAccountsStore.accounts ?? [];
  return accounts.find(acc => acc.uuid === accountUuid);
};


// Audit log methods are now handled by the composable

// Watch for uploaded file changes
watch(() => uploadedFile.value, (newFile) => {
  // Use the composable's handleFileUpload method
  handleFileUpload(newFile);
  emit('file-upload', newFile);
});

</script>
