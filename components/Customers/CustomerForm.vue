<template>
  <UModal 
    v-model:open="showModal" 
    :title="editingCustomer ? 'Edit Customer' : 'Add New Customer'"
    description="Configure customer details for your organization."
    :ui="{ 
      content: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-1rem)] max-w-5xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] rounded-lg shadow-lg ring ring-default overflow-hidden',
      body: 'p-4 sm:p-6 max-h-[calc(100dvh-12rem)] overflow-y-auto'
    }"
    @update:open="closeModal"
  >
    <template #body>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Left Column (Corporation/Project/Customer Information) -->
        <div class="space-y-3">
          <!-- Corporation Selection -->
          <div>
            <label
              for="corporation"
              class="block text-xs font-medium text-gray-700 mb-1"
            >
              Corporation <span class="text-red-500">*</span>
            </label>
            <CorporationSelect
              :model-value="form.corporation_uuid"
              placeholder="Select Corporation"
              size="sm"
              class="w-full"
              @update:model-value="handleCorporationChange"
            />
          </div>

          <!-- Project Selection -->
          <div>
            <label
              for="project"
              class="block text-xs font-medium text-gray-700 mb-1"
            >
              Project
            </label>
            <ProjectSelect
              :model-value="form.project_uuid"
              :corporation-uuid="form.corporation_uuid"
              placeholder="Select Project (Optional)"
              size="sm"
              class="w-full"
              :disabled="!form.corporation_uuid"
              @update:model-value="handleProjectChange"
            />
            <p v-if="!form.corporation_uuid" class="text-xs text-gray-500 mt-1">
              Please select a corporation first
            </p>
          </div>

          <!-- Profile Image Upload -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Profile Image
            </label>
            <div class="flex items-center gap-4">
              <div v-if="profileImagePreview" class="relative">
                <img
                  :src="profileImagePreview"
                  alt="Profile Preview"
                  class="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                />
                <UButton
                  icon="mingcute:close-fill"
                  color="error"
                  variant="soft"
                  size="xs"
                  class="absolute -top-1 -right-1 p-1 h-6 w-6 rounded-full"
                  @click="removeProfileImage"
                />
              </div>
              <div v-else class="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                <UIcon name="i-heroicons-user" class="w-10 h-10 text-gray-400" />
              </div>
              <div class="flex-1">
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark"
                  @change="handleImageSelect"
                />
                <p class="text-xs text-gray-500 mt-1">
                  Max size: 5MB. Supported: JPG, PNG, GIF
                </p>
              </div>
            </div>
          </div>
          
          <!-- Customer Name - Required Field -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Customer Name <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="form.customer_name"
              variant="subtle"
              placeholder="Customer Name"
              size="sm"
              class="w-full"
            />
          </div>

          <!-- Customer Type -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Customer Type
            </label>
            <UInput
              v-model="form.customer_type"
              variant="subtle"
              placeholder="e.g., Individual, Business"
              size="sm"
              class="w-full"
            />
          </div>

          <!-- Company Name -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <UInput
              v-model="form.company_name"
              variant="subtle"
              placeholder="Company Name"
              size="sm"
              class="w-full"
            />
          </div>
        </div>

        <!-- Right Column (Personal/Contact Information) -->
        <div class="space-y-3">
          <!-- Name Fields -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Salutation</label>
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
              <label class="block text-xs font-medium text-gray-700 mb-1">First Name</label>
              <UInput
                v-model="form.first_name"
                variant="subtle"
                placeholder="First Name"
                size="sm"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
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

          <!-- Address Section -->
          <div class="pt-3 border-t border-gray-200">
            <h4 class="text-xs font-medium text-gray-700 mb-2">Address Information</h4>
            
            <!-- Street Address -->
            <div class="mb-2">
              <label class="block text-xs font-medium text-gray-700 mb-1">Street Address</label>
              <UInput
                v-model="form.customer_address"
                variant="subtle"
                placeholder="Street Address"
                size="sm"
                class="w-full"
              />
            </div>

            <!-- City, State, ZIP -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">City</label>
                <UInput
                  v-model="form.customer_city"
                  variant="subtle"
                  placeholder="City"
                  size="sm"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">State</label>
                <UInput
                  v-model="form.customer_state"
                  variant="subtle"
                  placeholder="State"
                  size="sm"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">ZIP Code</label>
                <UInput
                  v-model="form.customer_zip"
                  variant="subtle"
                  placeholder="ZIP"
                  size="sm"
                  class="w-full"
                />
              </div>
            </div>

            <!-- Country -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Country</label>
              <UInput
                v-model="form.customer_country"
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
                <label class="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                <UInput
                  v-model="form.customer_phone"
                  type="text"
                  variant="subtle"
                  placeholder="Phone"
                  size="sm"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <UInput
                  v-model="form.customer_email"
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
        <UButton color="primary" @click="submitCustomer" :loading="submitting">
          {{ editingCustomer ? "Update" : "Add" }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useCustomerStore } from "@/stores/customers";
import { useCorporationStore } from "@/stores/corporations";
import { useProjectsStore } from "@/stores/projects";
import CorporationSelect from '@/components/Shared/CorporationSelect.vue';
import ProjectSelect from '@/components/Shared/ProjectSelect.vue';

interface CustomerFormProps {
  modelValue: boolean;
  customer?: any;
}

interface CustomerFormEmits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'customer-saved'): void;
}

const props = withDefaults(defineProps<CustomerFormProps>(), {
  customer: null
});

const emit = defineEmits<CustomerFormEmits>();

const customerStore = useCustomerStore();
const corpStore = useCorporationStore();
const projectsStore = useProjectsStore();
const toast = useToast();

const submitting = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const profileImagePreview = ref<string | null>(null);
const profileImageFile = ref<File | null>(null);

// Computed properties
const showModal = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
});

const editingCustomer = computed(() => props.customer !== null);

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

// Form data
const form = ref({
  corporation_uuid: "",
  project_uuid: null as string | null,
  customer_name: "",
  customer_type: "",
  customer_address: "",
  customer_city: "",
  customer_state: "",
  customer_country: "",
  customer_zip: "",
  customer_phone: "",
  customer_email: "",
  company_name: "",
  salutation: "Mr.",
  first_name: "",
  middle_name: "",
  last_name: "",
  profile_image_url: "",
});

// Methods
function resetForm() {
  form.value = {
    corporation_uuid: corpStore.selectedCorporation?.uuid || "",
    project_uuid: null,
    customer_name: "",
    customer_type: "",
    customer_address: "",
    customer_city: "",
    customer_state: "",
    customer_country: "",
    customer_zip: "",
    customer_phone: "",
    customer_email: "",
    company_name: "",
    salutation: "Mr.",
    first_name: "",
    middle_name: "",
    last_name: "",
    profile_image_url: "",
  };
  profileImagePreview.value = null;
  profileImageFile.value = null;
}

function closeModal() {
  showModal.value = false;
  resetForm();
}

// Handle corporation change - clear project selection when corporation changes
function handleCorporationChange(corporationUuid: string | null | undefined) {
  const oldCorporationUuid = form.value.corporation_uuid;
  form.value.corporation_uuid = corporationUuid || "";
  // Clear project selection when corporation changes
  if (oldCorporationUuid !== form.value.corporation_uuid) {
    form.value.project_uuid = null;
  }
}

// Handle project change
function handleProjectChange(projectUuid: string | null | undefined) {
  form.value.project_uuid = projectUuid || null;
}

// Handle image selection
function handleImageSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    toast.add({
      title: 'Invalid File',
      description: 'Please select an image file',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    toast.add({
      title: 'File Too Large',
      description: 'Image size must be less than 5MB',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  profileImageFile.value = file;

  // Create preview
  const reader = new FileReader();
  reader.onload = (e) => {
    profileImagePreview.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}

// Remove profile image
function removeProfileImage() {
  profileImagePreview.value = null;
  profileImageFile.value = null;
  form.value.profile_image_url = "";
  if (fileInput.value) {
    fileInput.value.value = "";
  }
}

// Upload profile image
async function uploadProfileImage(): Promise<string | null> {
  if (!profileImageFile.value) {
    return form.value.profile_image_url || null;
  }

  try {
    const reader = new FileReader();
    const imageData = await new Promise<string>((resolve, reject) => {
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(profileImageFile.value!);
    });

    // Generate a unique filename
    const fileExtension = profileImageFile.value.name.split('.').pop();
    const fileName = `customer_${Date.now()}.${fileExtension}`;

    // Upload to API
    const { apiFetch } = useApiClient();
    const response = await apiFetch('/api/customers/upload-image', {
      method: 'POST',
      body: {
        imageData,
        fileName,
        customerUuid: editingCustomer.value?.uuid || null,
        oldImageUrl: editingCustomer.value?.profile_image_url || form.value.profile_image_url || null,
      },
    });

    if (response?.error) {
      throw new Error(response.error);
    }

    return response?.data?.imageUrl || null;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

// Watch for modelValue changes
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    // Ensure corporations are loaded
    await corpStore.ensureReady();
    
    if (props.customer) {
      // Edit mode - populate form with customer data
      form.value = {
        corporation_uuid: props.customer.corporation_uuid || "",
        project_uuid: props.customer.project_uuid || null,
        customer_name: props.customer.customer_name || "",
        customer_type: props.customer.customer_type || "",
        customer_address: props.customer.customer_address || "",
        customer_city: props.customer.customer_city || "",
        customer_state: props.customer.customer_state || "",
        customer_country: props.customer.customer_country || "",
        customer_zip: props.customer.customer_zip || "",
        customer_phone: props.customer.customer_phone || "",
        customer_email: props.customer.customer_email || "",
        company_name: props.customer.company_name || "",
        salutation: props.customer.salutation || "Mr.",
        first_name: props.customer.first_name || "",
        middle_name: props.customer.middle_name || "",
        last_name: props.customer.last_name || "",
        profile_image_url: props.customer.profile_image_url || "",
      };
      
      // Set profile image preview if exists
      if (props.customer.profile_image_url) {
        profileImagePreview.value = props.customer.profile_image_url;
      }
      
      // Projects will be automatically loaded by ProjectSelect component
    } else {
      // Add mode - reset form
      resetForm();
    }
  }
});

async function submitCustomer() {
  // Validate required fields
  if (!form.value.corporation_uuid) {
    toast.add({
      title: 'Validation Error',
      description: 'Please select a corporation',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  if (!form.value.customer_name || form.value.customer_name.trim() === '') {
    toast.add({
      title: 'Validation Error',
      description: 'Please enter a customer name',
      icon: 'i-heroicons-exclamation-triangle',
    });
    return;
  }

  // Validate email format if provided
  if (form.value.customer_email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.value.customer_email)) {
      toast.add({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        icon: 'i-heroicons-exclamation-triangle',
      });
      return;
    }
  }

  submitting.value = true;

  try {
    // Upload profile image if a new one was selected
    let profileImageUrl = form.value.profile_image_url;
    if (profileImageFile.value) {
      profileImageUrl = await uploadProfileImage();
      if (!profileImageUrl) {
        throw new Error('Failed to upload profile image');
      }
    }

    const payload = {
      corporation_uuid: form.value.corporation_uuid,
      project_uuid: form.value.project_uuid || null,
      customer_name: form.value.customer_name.trim(),
      customer_type: form.value.customer_type?.trim() || "",
      customer_address: form.value.customer_address?.trim() || "",
      customer_city: form.value.customer_city?.trim() || "",
      customer_state: form.value.customer_state?.trim() || "",
      customer_country: form.value.customer_country?.trim() || "",
      customer_zip: form.value.customer_zip?.trim() || "",
      customer_phone: form.value.customer_phone?.trim() || "",
      customer_email: form.value.customer_email?.trim() || "",
      company_name: form.value.company_name?.trim() || "",
      salutation: form.value.salutation || "Mr.",
      first_name: form.value.first_name?.trim() || "",
      middle_name: form.value.middle_name?.trim() || "",
      last_name: form.value.last_name?.trim() || "",
      profile_image_url: profileImageUrl || "",
    };

    if (editingCustomer.value) {
      // Update existing customer
      await customerStore.updateCustomer(
        payload.corporation_uuid,
        props.customer,
        payload
      );

      toast.add({
        title: 'Customer updated successfully!',
        icon: 'i-heroicons-check-circle',
      });
    } else {
      // Add new customer
      await customerStore.addCustomer(
        payload.corporation_uuid,
        payload
      );

      toast.add({
        title: 'Customer added successfully!',
        icon: 'i-heroicons-check-circle',
      });
    }

    // Close modal and emit event
    closeModal();
    emit('customer-saved');
  } catch (error) {
    // Show error toast
    const action = editingCustomer.value ? 'updating' : 'adding';
    toast.add({
      title: `Failed to ${action} customer`,
      description: error instanceof Error ? error.message : `An error occurred while ${action}`,
      icon: 'i-heroicons-exclamation-triangle',
    });
  } finally {
    submitting.value = false;
  }
}
</script>

