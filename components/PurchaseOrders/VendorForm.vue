<template>
  <UModal 
    v-model:open="showModal" 
    :title="editingVendor ? 'Edit Vendor' : 'Add New Vendor'"
    description="Configure vendor details for your organization."
    :ui="{ 
      content: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-1rem)] max-w-5xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] rounded-lg shadow-lg ring ring-default overflow-hidden',
      body: 'p-4 sm:p-6 max-h-[calc(100dvh-12rem)] overflow-y-auto'
    }"
    @update:open="closeModal"
  >
    <template #body>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Left Column (Corporation/Vendor Information) -->
        <div class="space-y-3">
          <div>
            <label
              for="corporation"
              class="block text-xs font-medium text-gray-700 mb-1"
            >
              Corporation
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
          
          <!-- Vendor Name - Required Field -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Vendor Name <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="form.vendor_name"
              variant="subtle"
              placeholder="Vendor Name"
              size="sm"
              class="w-full"
            />
          </div>

          <!-- Federal ID and SSN in a row -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Federal ID <span class="text-red-500">*</span></label>
              <UInput
                v-model="form.vendor_federal_id"
                variant="subtle"
                placeholder="--- --- ---"
                size="sm"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">SSN <span class="text-red-500">*</span></label>
              <UInput
                v-model="form.vendor_ssn"
                variant="subtle"
                placeholder="--- -- ---"
                size="sm"
                class="w-full"
              />
            </div>
          </div>

          <!-- Company Name -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Company Name <span class="text-red-500">*</span></label>
            <UInput
              v-model="form.company_name"
              variant="subtle"
              placeholder="Company Name"
              size="sm"
              class="w-full"
            />
          </div>

          <!-- Check Printed As and DBA in a row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Check Printed As <span class="text-red-500">*</span></label>
              <UInput
                v-model="form.check_printed_as"
                variant="subtle"
                placeholder="Check printed as"
                size="sm"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Doing Business As <span class="text-red-500">*</span></label>
              <UInput
                v-model="form.doing_business_as"
                variant="subtle"
                placeholder="DBA"
                size="sm"
                class="w-full"
              />
            </div>
          </div>

          <!-- 1099 Checkbox -->
          <div class="flex items-center space-x-2">
            <UCheckbox
              id="is-1099"
              v-model="form.is_1099"
              color="primary"
              size="sm"
            />
            <label for="is-1099" class="text-xs font-medium text-gray-700">Is 1099</label>
          </div>
        </div>

        <!-- Right Column (Personal/Financial Information) -->
        <div class="space-y-3">
          <!-- Name Fields -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Salutation <span class="text-red-500">*</span></label>
              <USelect
                v-model="form.salutation"
                :items="salutationOptions"
                placeholder="Mr."
                variant="subtle"
                size="sm"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">First Name <span class="text-red-500">*</span></label>
              <UInput
                v-model="form.first_name"
                variant="subtle"
                placeholder="First Name"
                size="sm"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Last Name <span class="text-red-500">*</span></label>
              <UInput
                v-model="form.last_name"
                variant="subtle"
                placeholder="Last Name"
                size="sm"
                class="w-full"
              />
            </div>
          </div>

          <!-- Middle Name -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Middle Name</label>
            <UInput
              v-model="form.middle_name"
              variant="subtle"
              placeholder="Middle Name"
              size="sm"
              class="w-full"
            />
          </div>

          <!-- Opening Balance Section -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Opening Balance</label>
            <div class="flex items-center gap-2">
              <div class="relative flex-1">
                <UInput
                  v-model="formattedOpeningBalance"
                  type="number"
                  step="0.01"
                  variant="subtle"
                  placeholder="0.00"
                  size="sm"
                  class="w-full pl-6"
                />
                <span class="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 font-medium pointer-events-none">
                  {{ currencySymbol }}
                </span>
              </div>
              <span class="text-xs text-gray-500 whitespace-nowrap">As of</span>
              <UInput
                v-model="form.opening_balance_date"
                type="date"
                variant="subtle"
                size="sm"
                class="w-28"
              />
            </div>
          </div>

          <!-- Address Section -->
          <div class="pt-3 border-t border-gray-200">
            <h4 class="text-xs font-medium text-gray-700 mb-2">Address Information</h4>
            
            <!-- Street Address -->
            <div class="mb-2">
              <label class="block text-xs font-medium text-gray-700 mb-1">Street Address <span class="text-red-500">*</span></label>
              <UInput
                v-model="form.vendor_address"
                variant="subtle"
                placeholder="Street Address"
                size="sm"
                class="w-full"
              />
            </div>

            <!-- City, State, ZIP -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">City <span class="text-red-500">*</span></label>
                <UInput
                  v-model="form.vendor_city"
                  variant="subtle"
                  placeholder="City"
                  size="sm"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">State <span class="text-red-500">*</span></label>
                <UInput
                  v-model="form.vendor_state"
                  variant="subtle"
                  placeholder="State"
                  size="sm"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">ZIP Code <span class="text-red-500">*</span></label>
                <UInput
                  v-model="form.vendor_zip"
                  variant="subtle"
                  placeholder="ZIP"
                  size="sm"
                  class="w-full"
                />
              </div>
            </div>

            <!-- Country -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Country <span class="text-red-500">*</span></label>
              <UInput
                v-model="form.vendor_country"
                variant="subtle"
                placeholder="Country"
                size="sm"
                class="w-full"
              />
            </div>
          </div>

          <!-- Contact Information -->
          <div class="pt-3 border-t border-gray-200">
            <h4 class="text-xs font-medium text-gray-700 mb-2">Contact Information</h4>
            
            <!-- Phone and Email in a row -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Phone <span class="text-red-500">*</span></label>
                <UInput
                  v-model="form.vendor_phone"
                  type="text"
                  variant="subtle"
                  placeholder="Phone"
                  size="sm"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Email <span class="text-red-500">*</span></label>
                <UInput
                  v-model="form.vendor_email"
                  type="email"
                  variant="subtle"
                  placeholder="Email"
                  size="sm"
                  class="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton color="neutral" variant="soft" @click="closeModal">
          Cancel
        </UButton>
        <UButton color="primary" @click="submitVendor" :loading="submitting">
          {{ editingVendor ? "Update" : "Add" }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useVendorStore } from "@/stores/vendors";
import { useCorporationStore } from "@/stores/corporations";
import { useCurrencyFormat } from "@/composables/useCurrencyFormat";

interface VendorFormProps {
  modelValue: boolean;
  vendor?: any;
}

interface VendorFormEmits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'vendor-saved'): void;
}

const props = withDefaults(defineProps<VendorFormProps>(), {
  vendor: null
});

const emit = defineEmits<VendorFormEmits>();

const vendorStore = useVendorStore();
const corpStore = useCorporationStore();
const toast = useToast();
const { currencySymbol, formatCurrency } = useCurrencyFormat();

const submitting = ref(false);

// Computed properties
const showModal = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
});

const editingVendor = computed(() => props.vendor !== null);

const getCorporationName = computed(() => {
  return corpStore.selectedCorporation?.corporation_name || "Unnamed Corporation";
});

// Computed property for formatted opening balance display
const formattedOpeningBalance = computed({
  get: () => {
    if (!form.value.opening_balance || form.value.opening_balance === 0) return '';
    return form.value.opening_balance.toString();
  },
  set: (value: string) => {
    const numericValue = parseFloat(value) || 0;
    form.value.opening_balance = numericValue;
  }
});

// Form data
const form = ref({
  corporation_uuid: "",
  vendor_name: "",
  vendor_type: "",
  vendor_address: "",
  vendor_city: "",
  vendor_state: "",
  vendor_country: "",
  vendor_zip: "",
  vendor_phone: "",
  vendor_email: "",
  is_1099: false,
  vendor_federal_id: "",
  vendor_ssn: "",
  company_name: "",
  check_printed_as: "",
  doing_business_as: "",
  salutation: "Mr.",
  first_name: "",
  middle_name: "",
  last_name: "",
  opening_balance: 0.00,
  opening_balance_date: new Date().toISOString().split('T')[0],
});

// Salutation options
const salutationOptions = [
  { label: 'Mr.', value: 'Mr.' },
  { label: 'Mrs.', value: 'Mrs.' },
  { label: 'Ms.', value: 'Ms.' },
  { label: 'Dr.', value: 'Dr.' },
  { label: 'Prof.', value: 'Prof.' },
  { label: 'Rev.', value: 'Rev.' },
  { label: 'Sir', value: 'Sir' },
  { label: 'Madam', value: 'Madam' }
];

// Methods
function resetForm() {
  form.value = {
    corporation_uuid: corpStore.selectedCorporation?.uuid || "",
    vendor_name: "",
    vendor_type: "",
    vendor_address: "",
    vendor_city: "",
    vendor_state: "",
    vendor_country: "",
    vendor_zip: "",
    vendor_phone: "",
    vendor_email: "",
    is_1099: false,
    vendor_federal_id: "",
    vendor_ssn: "",
    company_name: "",
    check_printed_as: "",
    doing_business_as: "",
    salutation: "Mr.",
    first_name: "",
    middle_name: "",
    last_name: "",
    opening_balance: 0.00,
    opening_balance_date: new Date().toISOString().split('T')[0],
  };
}

function closeModal() {
  showModal.value = false;
  resetForm();
}

// Watch for modelValue changes
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    if (props.vendor) {
      // Edit mode - populate form with vendor data
      form.value = {
        corporation_uuid: corpStore.selectedCorporation?.uuid || "",
        vendor_name: props.vendor.vendor_name || "",
        vendor_type: props.vendor.vendor_type || "",
        vendor_address: props.vendor.vendor_address || "",
        vendor_city: props.vendor.vendor_city || "",
        vendor_state: props.vendor.vendor_state || "",
        vendor_country: props.vendor.vendor_country || "",
        vendor_zip: props.vendor.vendor_zip || "",
        vendor_phone: props.vendor.vendor_phone || "",
        vendor_email: props.vendor.vendor_email || "",
        is_1099: props.vendor.is_1099 || false,
        vendor_federal_id: props.vendor.vendor_federal_id || "",
        vendor_ssn: props.vendor.vendor_ssn || "",
        company_name: props.vendor.company_name || "",
        check_printed_as: props.vendor.check_printed_as || "",
        doing_business_as: props.vendor.doing_business_as || "",
        salutation: props.vendor.salutation || "Mr.",
        first_name: props.vendor.first_name || "",
        middle_name: props.vendor.middle_name || "",
        last_name: props.vendor.last_name || "",
        opening_balance: props.vendor.opening_balance || 0.00,
        opening_balance_date: props.vendor.opening_balance_date || new Date().toISOString().split('T')[0],
      };
    } else {
      // Add mode - reset form
      resetForm();
    }
  }
});

async function submitVendor() {
  // Validate required fields
  const requiredFields = [
    { field: 'vendor_name', label: 'Vendor Name' },
    { field: 'vendor_federal_id', label: 'Federal ID' },
    { field: 'vendor_ssn', label: 'SSN' },
    { field: 'company_name', label: 'Company Name' },
    { field: 'check_printed_as', label: 'Check Printed As' },
    { field: 'doing_business_as', label: 'Doing Business As' },
    { field: 'salutation', label: 'Salutation' },
    { field: 'first_name', label: 'First Name' },
    { field: 'last_name', label: 'Last Name' },
    { field: 'vendor_address', label: 'Street Address' },
    { field: 'vendor_city', label: 'City' },
    { field: 'vendor_state', label: 'State' },
    { field: 'vendor_zip', label: 'ZIP Code' },
    { field: 'vendor_country', label: 'Country' },
    { field: 'vendor_phone', label: 'Phone' },
    { field: 'vendor_email', label: 'Email' }
  ];

  for (const { field, label } of requiredFields) {
    if (!form.value[field] || form.value[field].toString().trim() === '') {
      toast.add({
        title: 'Validation Error',
        description: `Please fill in the ${label}`,
        icon: 'i-heroicons-exclamation-triangle',
      });
      return;
    }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(form.value.vendor_email)) {
    toast.add({
      title: 'Validation Error',
      description: 'Please enter a valid email address',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  // Ensure corporation is set from the store
  if (!corpStore.selectedCorporation?.uuid) {
    toast.add({
      title: 'Error',
      description: 'No corporation selected. Please select a corporation first.',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  // Set corporation_uuid from the store
  form.value.corporation_uuid = corpStore.selectedCorporation.uuid;

  submitting.value = true;

  try {
    const payload = {
      corporation_uuid: form.value.corporation_uuid,
      vendor_name: form.value.vendor_name,
      vendor_type: form.value.vendor_type,
      vendor_address: form.value.vendor_address,
      vendor_city: form.value.vendor_city,
      vendor_state: form.value.vendor_state,
      vendor_country: form.value.vendor_country,
      vendor_zip: form.value.vendor_zip,
      vendor_phone: form.value.vendor_phone,
      vendor_email: form.value.vendor_email,
      is_1099: form.value.is_1099,
      vendor_federal_id: form.value.vendor_federal_id,
      vendor_ssn: form.value.vendor_ssn,
      company_name: form.value.company_name,
      check_printed_as: form.value.check_printed_as,
      doing_business_as: form.value.doing_business_as,
      salutation: form.value.salutation,
      first_name: form.value.first_name,
      middle_name: form.value.middle_name,
      last_name: form.value.last_name,
      opening_balance: form.value.opening_balance,
      opening_balance_date: form.value.opening_balance_date,
    };

    if (editingVendor.value) {
      // Update existing vendor
      await vendorStore.updateVendor(
        payload.corporation_uuid,
        props.vendor,
        {
          vendor_name: payload.vendor_name,
          vendor_type: payload.vendor_type,
          vendor_address: payload.vendor_address,
          vendor_city: payload.vendor_city,
          vendor_state: payload.vendor_state,
          vendor_country: payload.vendor_country,
          vendor_zip: payload.vendor_zip,
          vendor_email: payload.vendor_email,
          is_1099: payload.is_1099,
          vendor_federal_id: payload.vendor_federal_id,
          vendor_ssn: payload.vendor_ssn,
          company_name: payload.company_name,
          check_printed_as: payload.check_printed_as,
          doing_business_as: payload.doing_business_as,
          salutation: payload.salutation,
          first_name: payload.first_name,
          middle_name: payload.middle_name,
          last_name: payload.last_name,
          opening_balance: payload.opening_balance,
          opening_balance_date: payload.opening_balance_date,
          ...(payload.vendor_phone !== null
            ? { vendor_phone: payload.vendor_phone }
            : {}),
        }
      );

      // Show success toast for update
      toast.add({
        title: 'Vendor updated successfully!',
        icon: 'i-heroicons-check-circle',
      });
    } else {
      // Add new vendor
      await vendorStore.addVendor(
        payload.corporation_uuid,
        {
          vendor_name: payload.vendor_name,
          vendor_type: payload.vendor_type,
          vendor_address: payload.vendor_address,
          vendor_city: payload.vendor_city,
          vendor_state: payload.vendor_state,
          vendor_country: payload.vendor_country,
          vendor_zip: payload.vendor_zip,
          vendor_phone: payload.vendor_phone,
          vendor_email: payload.vendor_email,
          is_1099: payload.is_1099,
          vendor_federal_id: payload.vendor_federal_id,
          vendor_ssn: payload.vendor_ssn,
          company_name: payload.company_name,
          check_printed_as: payload.check_printed_as,
          doing_business_as: payload.doing_business_as,
          salutation: payload.salutation,
          first_name: payload.first_name,
          middle_name: payload.middle_name,
          last_name: payload.last_name,
          opening_balance: payload.opening_balance,
          opening_balance_date: payload.opening_balance_date,
        }
      );

      // Show success toast for add
      toast.add({
        title: 'Vendor added successfully!',
        icon: 'i-heroicons-check-circle',
      });
    }

    // Close modal and emit event
    closeModal();
    emit('vendor-saved');
  } catch (error) {
    // Show error toast
    const action = editingVendor.value ? 'updating' : 'adding';
    toast.add({
      title: `Failed to ${action} vendor`,
      description: error instanceof Error ? error.message : `An error occurred while ${action}`,
      icon: 'i-heroicons-exclamation-triangle',
    });
  } finally {
    submitting.value = false;
  }
}
</script>
