<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Payments</h2>
        <p class="text-gray-600">Manage vendor payments and AP clearing</p>
      </div>
      <UButton
        icon="i-heroicons-plus"
        color="primary"
        @click="addNewPayment"
      >
        Record Payment
      </UButton>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
          <USelectMenu
            v-model="selectedVendor"
            :items="vendorOptions"
            placeholder="All vendors"
            searchable
            clearable
            @update:model-value="applyFilters"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
          <USelect
            v-model="selectedPaymentMethod"
            :items="paymentMethodOptions"
            placeholder="All methods"
            @update:model-value="applyFilters"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
          <div class="flex space-x-2">
            <UInput
              v-model="dateFrom"
              type="date"
              placeholder="From"
              size="sm"
              @update:model-value="applyFilters"
            />
            <UInput
              v-model="dateTo"
              type="date"
              placeholder="To"
              size="sm"
              @update:model-value="applyFilters"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div class="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
      <div class="flex items-center">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400 mr-2" />
        <p class="text-red-800">{{ error }}</p>
      </div>
    </div>

    <!-- Payments List -->
    <div v-else-if="filteredPayments.length" class="space-y-4">
      <div
        v-for="payment in filteredPayments"
        :key="payment.id"
        class="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="flex items-center space-x-3">
              <h3 class="text-lg font-semibold text-gray-900">
                {{ payment.vendors?.vendor_name || 'Unknown Vendor' }}
              </h3>
              <UBadge
                :color="getPaymentMethodColor(payment.payment_method)"
                variant="soft"
                size="sm"
              >
                {{ payment.payment_method }}
              </UBadge>
              <UBadge
                v-if="payment.reference_number"
                color="gray"
                variant="soft"
                size="sm"
              >
                Ref: {{ payment.reference_number }}
              </UBadge>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
              <div>
                <span class="font-medium">Amount:</span>
                <span class="ml-1 font-mono">${{ payment.amount.toFixed(2) }}</span>
              </div>
              <div>
                <span class="font-medium">Date:</span>
                <span class="ml-1">{{ formatDate(payment.payment_date) }}</span>
              </div>
              <div v-if="payment.bill_entries">
                <span class="font-medium">Bill:</span>
                <span class="ml-1">{{ payment.bill_entries.number || 'N/A' }}</span>
              </div>
              <div>
                <span class="font-medium">Created:</span>
                <span class="ml-1">{{ formatDate(payment.created_at) }}</span>
              </div>
            </div>
            <p v-if="payment.memo" class="text-gray-600 mt-2 text-sm">
              {{ payment.memo }}
            </p>
          </div>
          <div class="flex items-center space-x-2">
            <UButton
              icon="i-heroicons-pencil"
              size="sm"
              variant="soft"
              color="primary"
              @click="editPayment(payment)"
            />
            <UButton
              icon="i-heroicons-trash"
              size="sm"
              variant="soft"
              color="red"
              @click="deletePayment(payment)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-credit-card" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg font-medium">No payments found</p>
      <p class="text-gray-400 text-sm">Get started by recording your first payment</p>
    </div>

    <!-- Add/Edit Payment Modal -->
    <UModal 
      v-model:open="showModal" 
      :title="editingPayment ? 'Edit Payment' : 'Record New Payment'"
    >
      <template #body>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Vendor <span class="text-red-500">*</span>
              </label>
              <USelectMenu
                v-model="form.vendor_uuid"
                :items="vendorOptions"
                placeholder="Select vendor"
                searchable
                size="sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Payment Method <span class="text-red-500">*</span>
              </label>
              <USelect
                v-model="form.payment_method"
                :items="paymentMethodOptions"
                placeholder="Select method"
                size="sm"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Payment Date <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="form.payment_date"
                type="date"
                size="sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Amount <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="form.amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                size="sm"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Reference Number
            </label>
            <UInput
              v-model="form.reference_number"
              placeholder="Check number, transaction ID, etc."
              size="sm"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Bill Entry (Optional)
            </label>
            <USelectMenu
              v-model="form.bill_entry_uuid"
              :items="billEntryOptions"
              placeholder="Select bill to pay"
              searchable
              clearable
              size="sm"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Memo
            </label>
            <UTextarea
              v-model="form.memo"
              placeholder="Payment notes or description"
              :rows="3"
              size="sm"
            />
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="soft" @click="closeModal">
            Cancel
          </UButton>
          <UButton 
            color="primary" 
            @click="submitPayment"
            :loading="loading"
          >
            {{ editingPayment ? "Update" : "Record" }} Payment
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal 
      v-model:open="showDeleteModal" 
      title="Confirm Delete Payment"
    >
      <template #body>
        <div class="flex flex-col space-y-4">
          <div class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex-shrink-0">
              <UIcon name="i-heroicons-exclamation-triangle" class="h-8 w-8 text-red-400" />
            </div>
            <div>
              <h3 class="text-lg font-medium text-red-800">Delete Payment</h3>
              <p class="text-sm text-red-700">
                Are you sure you want to delete this payment? This action cannot be undone.
              </p>
            </div>
          </div>
          
          <div v-if="paymentToDelete" class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-medium text-gray-700 mb-2">Payment Details:</h4>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-gray-500">Vendor:</span>
                <span class="ml-2 font-medium">{{ paymentToDelete.vendors?.vendor_name || 'Unknown' }}</span>
              </div>
              <div>
                <span class="text-gray-500">Amount:</span>
                <span class="ml-2 font-medium">${{ paymentToDelete.amount?.toFixed(2) || '0.00' }}</span>
              </div>
              <div>
                <span class="text-gray-500">Method:</span>
                <span class="ml-2 font-medium">{{ paymentToDelete.payment_method }}</span>
              </div>
              <div>
                <span class="text-gray-500">Date:</span>
                <span class="ml-2 font-medium">{{ formatDate(paymentToDelete.payment_date) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="secondary" variant="soft" @click="closeDeleteModal">
            Cancel
          </UButton>
          <UButton 
            color="error" 
            @click="confirmDelete"
            :loading="loading"
          >
            {{ loading ? 'Deleting...' : 'Delete Payment' }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { usePaymentsStore } from "@/stores/payments";
import { useVendorStore } from "@/stores/vendors";
import { useBillEntriesStore } from "@/stores/billEntries";
import { useCorporationStore } from "@/stores/corporations";
import { useDateFormat } from '@/composables/useDateFormat';

const paymentsStore = usePaymentsStore();
const vendorStore = useVendorStore();
const billEntriesStore = useBillEntriesStore();
const corpStore = useCorporationStore();
const { formatDate } = useDateFormat();

const showModal = ref(false);
const showDeleteModal = ref(false);
const editingPayment = ref<string | null>(null);
const paymentToDelete = ref<any>(null);

// Filter states
const selectedVendor = ref("");
const selectedPaymentMethod = ref("");
const dateFrom = ref("");
const dateTo = ref("");

// Use store states
const loading = computed(() => paymentsStore.loading);
const error = computed(() => paymentsStore.error);
const payments = computed(() => paymentsStore.payments);

// Form data
const form = ref({
  vendor_uuid: "",
  payment_method: "CHECK",
  payment_date: "",
  amount: 0,
  reference_number: "",
  bill_entry_uuid: "",
  memo: ""
});

// Computed properties
const vendorOptions = computed(() => {
  const list = vendorStore.vendors ?? [];
  return list.map((vendor) => ({
    label: vendor.vendor_name,
    value: vendor.uuid
  }));
});

const billEntryOptions = computed(() => {
  const list = billEntriesStore.billEntries ?? [];
  return list.map((bill) => ({
    label: `${bill.number || 'No Number'} - ${bill.vendors?.vendor_name || bill.payee_name} - $${bill.amount.toFixed(2)}`,
    value: bill.id
  }));
});

const paymentMethodOptions = [
  { label: "Check", value: "CHECK" },
  { label: "ACH", value: "ACH" },
  { label: "Wire Transfer", value: "WIRE" },
  { label: "Cash", value: "CASH" },
  { label: "Card", value: "CARD" }
];

const filteredPayments = computed(() => {
  let filtered = payments.value;

  if (selectedVendor.value) {
    filtered = filtered.filter(p => p.vendor_uuid === selectedVendor.value);
  }

  if (selectedPaymentMethod.value) {
    filtered = filtered.filter(p => p.payment_method === selectedPaymentMethod.value);
  }

  if (dateFrom.value) {
    filtered = filtered.filter(p => p.payment_date >= dateFrom.value);
  }

  if (dateTo.value) {
    filtered = filtered.filter(p => p.payment_date <= dateTo.value);
  }

  return filtered;
});

// Methods
const addNewPayment = () => {
  resetForm();
  editingPayment.value = null;
  showModal.value = true;
};

const editPayment = (payment: any) => {
  editingPayment.value = payment.id;
  form.value = {
    vendor_uuid: payment.vendor_uuid,
    payment_method: payment.payment_method,
    payment_date: payment.payment_date,
    amount: payment.amount,
    reference_number: payment.reference_number || "",
    bill_entry_uuid: payment.bill_entry_uuid || "",
    memo: payment.memo || ""
  };
  showModal.value = true;
};

const deletePayment = (payment: any) => {
  paymentToDelete.value = payment;
  showDeleteModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingPayment.value = null;
  resetForm();
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  paymentToDelete.value = null;
};

const resetForm = () => {
  form.value = {
    vendor_uuid: "",
    payment_method: "CHECK",
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    reference_number: "",
    bill_entry_uuid: "",
    memo: ""
  };
};

const submitPayment = async () => {
  try {
    if (!corpStore.selectedCorporation?.uuid) {
      throw new Error("No corporation selected");
    }

    const payload = {
      corporation_uuid: corpStore.selectedCorporation.uuid,
      ...form.value,
      amount: parseFloat(form.value.amount.toString())
    };

    if (editingPayment.value) {
      await paymentsStore.updatePayment({
        id: editingPayment.value,
        ...payload
      });
    } else {
      await paymentsStore.createPayment(payload);
    }

    closeModal();
  } catch (error) {
    console.error('Error submitting payment:', error);
  }
};

const confirmDelete = async () => {
  try {
    if (paymentToDelete.value) {
      await paymentsStore.deletePayment(paymentToDelete.value.id);
      closeDeleteModal();
    }
  } catch (error) {
    console.error('Error deleting payment:', error);
  }
};

const applyFilters = () => {
  // Filters are applied automatically through computed property
};

const getPaymentMethodColor = (method: string) => {
  const colors: Record<string, string> = {
    'CHECK': 'blue',
    'ACH': 'green',
    'WIRE': 'primary',
    'CASH': 'yellow',
    'CARD': 'orange'
  };
  return colors[method] || 'gray';
};


// Initialize data on mount
onMounted(async () => {
  if (corpStore.selectedCorporation?.uuid) {
    await Promise.all([
      paymentsStore.fetchPayments(corpStore.selectedCorporation.uuid),
      vendorStore.fetchVendors(corpStore.selectedCorporation.uuid),
      billEntriesStore.fetchBillEntries(corpStore.selectedCorporation.uuid)
    ]);
  }
});

// Data fetching is now handled centrally by TopBar/corporation store
// No need for watchers since components consume store data directly
</script>
