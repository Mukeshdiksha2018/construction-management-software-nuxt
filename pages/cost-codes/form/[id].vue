<template>
  <div class="p-1">
    <!-- Header -->
    <div class="mb-2">
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <UButton
              icon="i-heroicons-arrow-left"
              size="sm"
              variant="solid"
              color="neutral"
              @click="goBack"
            >
              Back
            </UButton>
            <h1 class="text-2xl font-bold text-default">
              {{ isEditMode ? 'Edit Cost Code Configuration' : 'Add New Cost Code Configuration' }}
            </h1>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="soft"
            @click="goBack"
          >
            Cancel
          </UButton>
          <UTooltip v-if="!isFormValid" text="Please fill in all required fields: Corporation, Cost Code Number, Cost Code Name, and GL Account">
            <UButton
              color="primary"
              icon="i-heroicons-check-circle"
              :loading="saving"
              :disabled="!isFormValid || saving"
              @click="handleSave"
            >
              {{ saving ? 'Saving...' : (isEditMode ? 'Update' : 'Create') }}
            </UButton>
          </UTooltip>
          <UButton
            v-else
            color="primary"
            icon="i-heroicons-check-circle"
            :loading="saving"
            :disabled="!isFormValid || saving"
            @click="handleSave"
          >
            {{ saving ? 'Saving...' : (isEditMode ? 'Update' : 'Create') }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- Form Content -->
    <CostCodeConfigurationForm
      v-model:form="form"
      :editing-configuration="isEditMode"
      @validation-change="handleValidationChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useCorporationStore } from '@/stores/corporations';
import { useCostCodeConfigurationsStore } from '@/stores/costCodeConfigurations';
import CostCodeConfigurationForm from '@/components/Corporations/CostCodeConfigurationForm.vue';

definePageMeta({
  layout: "main-layout",
  middleware: "auth",
});

const router = useRouter();
const route = useRoute();
const corpStore = useCorporationStore();
const configurationsStore = useCostCodeConfigurationsStore();
const toast = useToast();

// State
const saving = ref(false);
const isFormValid = ref(false);

// Computed
const isEditMode = computed(() => route.params.id !== 'new');
const configurationId = computed(() => route.params.id as string);

// Form data
const form = ref({
  id: null as string | null,
  corporation_uuid: corpStore.selectedCorporation?.uuid || '',
  division_uuid: null as string | null,
  cost_code_number: '',
  cost_code_name: '',
  parent_cost_code_uuid: null as string | null,
  order: null as number | null,
  gl_account_uuid: null as string | null,
  preferred_vendor_uuid: null as string | null,
  effective_from: null as string | null,
  description: '',
  update_previous_transactions: false,
  is_active: true,
  preferred_items: [] as any[],
  attachments: [] as any[]
});

// Methods
const goBack = () => {
  router.back();
};

const handleValidationChange = (isValid: boolean) => {
  isFormValid.value = isValid;
};

const handleSave = async () => {
  // First check: use isFormValid state
  if (!isFormValid.value) {
    toast.add({
      title: 'Validation Error',
      description: 'Please fill in all required fields: Cost Code Number, Cost Code Name, and GL Account',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  if (!corpStore.selectedCorporation) {
    toast.add({
      title: 'Error',
      description: 'No corporation selected',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  // Secondary validation checks (as backup)
  if (!form.value.cost_code_name?.trim()) {
    toast.add({
      title: 'Validation Error',
      description: 'Cost Code Name is required',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  if (!form.value.cost_code_number?.trim()) {
    toast.add({
      title: 'Validation Error',
      description: 'Cost Code Number is required',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  if (!form.value.gl_account_uuid) {
    toast.add({
      title: 'Validation Error',
      description: 'GL Account is required',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  saving.value = true;

  try {
    const payload = {
      corporation_uuid: corpStore.selectedCorporation.uuid,
      division_uuid: form.value.division_uuid || null,
      cost_code_number: form.value.cost_code_number,
      cost_code_name: form.value.cost_code_name,
      parent_cost_code_uuid: form.value.parent_cost_code_uuid || null,
      order: form.value.order || null,
      gl_account_uuid: form.value.gl_account_uuid,
      preferred_vendor_uuid: form.value.preferred_vendor_uuid || null,
      effective_from: form.value.effective_from || null,
      description: form.value.description || '',
      update_previous_transactions: form.value.update_previous_transactions || false,
      is_active: form.value.is_active ?? true,
      preferred_items: form.value.preferred_items || []
    };

    if (isEditMode.value && form.value.id) {
      // Update existing configuration
      await configurationsStore.updateConfiguration(form.value.id, payload);
      toast.add({
        title: 'Success',
        description: 'Cost code configuration updated successfully',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      });
    } else {
      // Create new configuration
      await configurationsStore.createConfiguration(payload);
      toast.add({
        title: 'Success',
        description: 'Cost code configuration created successfully',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      });
    }

    // Navigate back to list
    router.push('/corporation?tab=cost-codes&subTab=cost-codes-configuration');
  } catch (error) {
    console.error('Error saving cost code configuration:', error);
    toast.add({
      title: 'Error',
      description: `Failed to ${isEditMode.value ? 'update' : 'create'} cost code configuration`,
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
  } finally {
    saving.value = false;
  }
};

const loadConfiguration = async () => {
  if (!isEditMode.value || !corpStore.selectedCorporation) return;

  try {
    // Force refresh from API to get the latest data including preferred_items
    // Using useIndexedDB=false ensures we get fresh data from the API
    await configurationsStore.refreshConfigurationsFromAPI(corpStore.selectedCorporation.uuid);
    
    const configuration = configurationsStore.configurations.find(
      c => c.uuid === configurationId.value
    );

    if (configuration) {
      form.value = {
        id: configuration.uuid,
        corporation_uuid: configuration.corporation_uuid,
        division_uuid: configuration.division_uuid || null,
        cost_code_number: configuration.cost_code_number || '',
        cost_code_name: configuration.cost_code_name || '',
        parent_cost_code_uuid: configuration.parent_cost_code_uuid || null,
        order: configuration.order || null,
        gl_account_uuid: configuration.gl_account_uuid || null,
        preferred_vendor_uuid: configuration.preferred_vendor_uuid || null,
        effective_from: configuration.effective_from || null,
        description: configuration.description || '',
        update_previous_transactions: configuration.update_previous_transactions || false,
        is_active: configuration.is_active ?? true,
        preferred_items: configuration.preferred_items || [],
        attachments: []
      };
    } else {
      toast.add({
        title: 'Error',
        description: 'Cost code configuration not found',
        color: 'error',
        icon: 'i-heroicons-x-circle'
      });
      router.push('/corporation?tab=cost-codes&subTab=cost-codes-configuration');
    }
  } catch (error) {
    console.error('Error loading configuration:', error);
    toast.add({
      title: 'Error',
      description: 'Failed to load cost code configuration',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
  }
};

// Lifecycle
onMounted(async () => {
  if (!corpStore.selectedCorporation) {
    toast.add({
      title: 'Error',
      description: 'Please select a corporation first',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    router.push('/corporation');
    return;
  }

  // Load configuration if editing
  if (isEditMode.value) {
    await loadConfiguration();
  } else {
    // Set corporation UUID for new configuration
    form.value.corporation_uuid = corpStore.selectedCorporation.uuid;
  }
});
</script>

