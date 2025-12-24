<template>
  <div class="h-[80vh] flex flex-col">
    <!-- Main Content Area -->
    <div class="flex-1 flex min-h-0">
      <!-- Left Panel: Estimate Details -->
      <div ref="leftPanel" class="flex-1 flex flex-col min-h-0 overflow-y-auto pr-3" style="min-width: 800px;">
        <div class="mb-3 flex flex-col gap-4 flex-1 min-h-0">
          <!-- Row 1: Basic Estimate Information -->
          <div class="flex flex-col">
            <div class="mb-3">
              <UCard variant="soft">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <!-- Skeleton Loaders -->
                  <template v-if="isLoading">
                    <!-- Corporation -->
                    <div class="min-w-0">
                      <USkeleton class="h-3 w-24 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div>
                    <!-- Estimate Number -->
                    <div class="min-w-0">
                      <USkeleton class="h-3 w-32 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div>
                    <!-- Project -->
                    <div class="min-w-0">
                      <USkeleton class="h-3 w-20 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div>
                    <!-- Status -->
                    <div v-if="false" class="min-w-0">
                      <USkeleton class="h-3 w-16 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div>
                    <!-- Estimate Date -->
                    <div class="min-w-0">
                      <USkeleton class="h-3 w-28 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div>
                    <!-- Total Amount -->
                    <div v-if="false">
                      <USkeleton class="h-3 w-28 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div>
                    <!-- Tax Amount -->
                    <!-- <div>
                      <USkeleton class="h-3 w-24 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div> -->
                    <!-- Discount Amount -->
                    <!-- <div>
                      <USkeleton class="h-3 w-32 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div> -->
                    <!-- Final Amount -->
                    <div v-if="false">
                      <USkeleton class="h-3 w-28 mb-1" />
                      <USkeleton class="h-9 w-full" />
                    </div>
                  </template>
                  
                  <!-- Actual Form Fields -->
                  <template v-else>
                  <!-- Corporation -->
                  <div class="min-w-0">
                    <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                      Corporation
                    </label>
                    <CorporationSelect
                      :model-value="(props.editingEstimate ? corpStore.selectedCorporationId : estimateCreationStore.selectedCorporationUuid) ?? undefined"
                      placeholder="Select corporation"
                      size="sm"
                      class="w-full"
                      :disabled="isReadOnlyEstimate || editingEstimate"
                      @update:model-value="handleCorporationChange"
                    />
                  </div>

                  <!-- Estimate Number -->
                  <div class="min-w-0">
                    <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                      Estimate Number <span class="text-red-500">*</span>
                    </label>
                    <UInput
                      :model-value="form.estimate_number"
                      placeholder="Estimate Number"
                      size="sm"
                      class="w-full"
                      disabled
                    />
                  </div>

                  <!-- Project -->
                  <div class="min-w-0">
                    <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                      Project <span class="text-red-500">*</span>
                    </label>
                    <USelectMenu
                      :key="`project-select-${estimateCreationStore.selectedCorporationUuid || 'none'}-${projectOptions.length}`"
                      v-model="form.project_uuid"
                      :items="projectOptions"
                      :loading="isProjectSelectLoading"
                      placeholder="Select project"
                      size="sm"
                      class="w-full"
                      value-key="value"
                      label-key="label"
                      :disabled="isReadOnlyEstimate || isProjectSelectLoading"
                      @update:model-value="(value) => handleFormUpdate('project_uuid', value)"
                    />
                  </div>

                  <!-- Status Display -->
                  <div v-if="false" class="min-w-0">
                    <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                      Status
                    </label>
                    <span
                      class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border"
                      :class="statusChipClass"
                    >
                      {{ statusLabel }}
                    </span>
                  </div>

                  <!-- Estimate Date -->
                  <div class="min-w-0">
                    <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                      Estimate Date <span class="text-red-500">*</span>
                    </label>
                    <UPopover v-model:open="estimateDatePopoverOpen" :disabled="isReadOnlyEstimate">
                      <UButton 
                        color="neutral" 
                        variant="outline" 
                        icon="i-heroicons-calendar-days"
                        class="w-full justify-start"
                        size="sm"
                        :disabled="isReadOnlyEstimate"
                      >
                        {{ estimateDateDisplayText }}
                      </UButton>
                      <template #content>
                        <UCalendar v-model="estimateDateValue" class="p-2" :disabled="isReadOnlyEstimate" @update:model-value="estimateDatePopoverOpen = false" />
                      </template>
                    </UPopover>
                  </div>


                  <!-- Total Amount -->
                   <div v-if="false">
                    <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                      Total Amount <span class="text-red-500">*</span>
                    </label>
                    <UInput
                      :model-value="formatCurrencyInline(form.total_amount)"
                      type="text"
                      inputmode="decimal"
                      placeholder="Amount"
                      size="sm"
                      class="w-full"
                      :ui="{ base: 'text-right' }"
                       disabled
                    />
                  </div>

                  <!-- Tax Amount -->
                  <!-- <div>
                    <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                      Tax Amount
                    </label>
                    <UInput
                      :model-value="isEditingTax ? taxEdit : formatCurrencyInline(form.tax_amount)"
                      type="text"
                      inputmode="decimal"
                      placeholder="Tax"
                      size="sm"
                      class="w-full"
                      :ui="{ base: 'text-right' }"
                      :disabled="isReadOnlyEstimate"
                      @focus="startEditTax"
                      @update:model-value="onTaxInput"
                      @blur="commitTax"
                    />
                  </div> -->

                  <!-- Discount Amount -->
                  <!-- <div>
                    <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                      Discount Amount
                    </label>
                    <UInput
                      :model-value="isEditingDiscount ? discountEdit : formatCurrencyInline(form.discount_amount)"
                      type="text"
                      inputmode="decimal"
                      placeholder="Discount"
                      size="sm"
                      class="w-full"
                      :ui="{ base: 'text-right' }"
                      :disabled="isReadOnlyEstimate"
                      @focus="startEditDiscount"
                      @update:model-value="onDiscountInput"
                      @blur="commitDiscount"
                    />
                  </div> -->

                  <!-- Final Amount (calculated) -->
                  <div v-if="false">
                    <label class="block text-xs font-medium text-default mb-1 flex items-center gap-1">
                      Final Amount
                    </label>
                    <UInput
                      :model-value="formatCurrencyInline(calculatedFinalAmount)"
                      disabled
                      size="sm"
                      class="w-full"
                      :ui="{ base: 'text-right' }"
                    />
                  </div>
                  </template>
                </div>

                <p v-if="false && !isLoading" class="text-xs text-muted text-center mt-2">Final Amount = Total Amount</p>
              </UCard>
            </div>
          </div>

          <!-- Row 2: Line Items -->
          <div class="flex flex-col flex-1">
            <div class="mb-3 space-y-4 h-full">
              <!-- Line Items Section -->
              <UCard variant="soft">
                <!-- Skeleton Loaders for Line Items -->
                <template v-if="isLoading">
                  <div class="flex items-center justify-between mb-3">
                    <USkeleton class="h-6 w-32" />
                  </div>
                  <div class="space-y-3">
                    <div class="border border-default rounded-md p-4">
                      <div class="grid grid-cols-6 gap-4 mb-3">
                        <USkeleton class="h-4 w-20" />
                        <USkeleton class="h-4 w-24" />
                        <USkeleton class="h-4 w-16" />
                        <USkeleton class="h-4 w-20" />
                        <USkeleton class="h-4 w-16" />
                        <USkeleton class="h-4 w-20" />
                      </div>
                      <div v-for="i in 3" :key="i" class="grid grid-cols-6 gap-4 py-2 border-t border-default">
                        <USkeleton class="h-4 w-24" />
                        <USkeleton class="h-4 w-32" />
                        <USkeleton class="h-4 w-16" />
                        <USkeleton class="h-4 w-20" />
                        <USkeleton class="h-4 w-16" />
                        <USkeleton class="h-4 w-20" />
                      </div>
                    </div>
                  </div>
                </template>
                
                <!-- Actual Line Items Section -->
                <template v-else>
                <div class="flex items-center justify-between mb-3">
                  <h4 class="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                    <UIcon name="i-heroicons-list-bullet" class="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    Line Items
                  </h4>
                  <UButton
                    v-if="!isReadOnlyEstimate && form.project_uuid"
                    icon="i-heroicons-adjustments-horizontal"
                    color="neutral"
                    variant="solid"
                    size="sm"
                    @click="openCostCodeSelectionModal"
                  >
                    Configure Cost Codes
                  </UButton>
                </div>
                
                <!-- Hierarchical Cost Codes Table -->
                <div v-if="form.project_uuid && !isCheckingExistingEstimate" class="overflow-x-auto">
                  <EstimateLineItemsTable
                    :model-value="form.line_items"
                    :project-uuid="form.project_uuid"
                    :readonly="isReadOnlyEstimate"
                    :editing-estimate="editingEstimate"
                    v-model:deletedUuids="form.removed_cost_code_uuids"
                    @update:model-value="(value) => handleFormUpdate('line_items', value)"
                    @open-cost-code-selection="openCostCodeSelectionModal"
                  />
                </div>
                <div v-else-if="isCheckingExistingEstimate" class="py-6 text-center">
                  <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p class="text-sm text-muted">Checking for existing estimates...</p>
                </div>
                <div v-else class="py-6 text-sm text-muted">Select a project to configure line items.</div>
                </template>
              </UCard>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cost Code Selection Modal -->
    <CostCodeSelectionModal
      :open="isCostCodeSelectionModalOpen"
      :hierarchical-data="hierarchicalDataForModal"
      :removed-cost-code-uuids="form.removed_cost_code_uuids || []"
      @update:open="isCostCodeSelectionModalOpen = $event"
      @confirm="handleCostCodeSelectionConfirm"
      @cancel="handleCostCodeSelectionCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { CalendarDate, DateFormatter, getLocalTimeZone } from "@internationalized/date";
import { useCorporationStore } from "@/stores/corporations";
import { useProjectsStore } from "@/stores/projects";
import { useEstimateCreationStore } from "@/stores/estimateCreation";
import { useCurrencyFormat } from '@/composables/useCurrencyFormat';
import { useApiClient } from '@/composables/useApiClient';
import EstimateLineItemsTable from './EstimateLineItemsTable.vue';
import CorporationSelect from '@/components/Shared/CorporationSelect.vue';
import CostCodeSelectionModal from './CostCodeSelectionModal.vue';
import { useCostCodeDivisionsStore } from '@/stores/costCodeDivisions';
import { useCostCodeConfigurationsStore } from '@/stores/costCodeConfigurations';

// Props
interface Props {
  form: any;
  editingEstimate: boolean;
  readonly?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  loading: false,
});

// Emits
const emit = defineEmits<{
  'update:form': [value: any];
  'validation-change': [isValid: boolean];
}>();

// Stores
const corpStore = useCorporationStore();
const projectsStore = useProjectsStore();
const estimateCreationStore = useEstimateCreationStore();
const divisionsStore = useCostCodeDivisionsStore();
const configurationsStore = useCostCodeConfigurationsStore();

// API client for direct API calls
const { apiFetch } = useApiClient();

// Local declaration to satisfy TS for auto-imported useToast
declare function useToast(): { add: (opts: any) => void }

// Currency formatting
const { currencySymbol, formatCurrency } = useCurrencyFormat();

// Loading state - only show full form skeletons on initial load
// When corporation changes, only the project selector will show loading spinner
const isLoading = computed(() => {
  // Only show full form skeletons on initial estimate load (from parent)
  return props.loading;
});

// Loading state for project selector - show spinner when fetching projects
const isProjectSelectLoading = computed(() => {
  // When creating new estimates, show loading when estimateCreationStore is loading
  if (!props.editingEstimate) {
    return estimateCreationStore.loading;
  }
  
  // When editing, show loading when projectsStore is loading
  return projectsStore.loading;
});

function formatCurrencyInline(value: any) {
  const num = parseFloat(value)
  const safe = Number.isFinite(num) ? num : 0
  // Use formatCurrency which already returns the symbol + formatted amount
  return formatCurrency(safe)
}

function parseCurrencyInput(input: any) {
  if (input == null) return 0
  const str = String(input)
  // Remove any non-numeric (keep digits, dot, minus). Also strip commas.
  const cleaned = str.replace(/,/g, '').replace(/[^0-9.\-]/g, '')
  const num = parseFloat(cleaned)
  return Number.isFinite(num) ? num : 0
}

// Inline-edit state for tax and discount to avoid formatting while typing
const isEditingTax = ref(false)
const taxEdit = ref('')
const startEditTax = () => {
  if (isReadOnlyEstimate.value) return
  isEditingTax.value = true
  taxEdit.value = String(parseFloat(props.form.tax_amount) || '')
}
const onTaxInput = (value: any) => {
  if (isReadOnlyEstimate.value) return
  taxEdit.value = String(value ?? '')
}
const commitTax = () => {
  if (isReadOnlyEstimate.value) return
  isEditingTax.value = false
  const parsed = parseCurrencyInput(taxEdit.value)
  handleFormUpdate('tax_amount', parsed)
}

const isEditingDiscount = ref(false)
const discountEdit = ref('')
const startEditDiscount = () => {
  if (isReadOnlyEstimate.value) return
  isEditingDiscount.value = true
  discountEdit.value = String(parseFloat(props.form.discount_amount) || '')
}
const onDiscountInput = (value: any) => {
  if (isReadOnlyEstimate.value) return
  discountEdit.value = String(value ?? '')
}
const commitDiscount = () => {
  if (isReadOnlyEstimate.value) return
  isEditingDiscount.value = false
  const parsed = parseCurrencyInput(discountEdit.value)
  handleFormUpdate('discount_amount', parsed)
}

// Panel references
const leftPanel = ref<HTMLElement | null>(null);
const estimateDatePopoverOpen = ref(false);

// Handle corporation change
const handleCorporationChange = async (corporationUuid: string | undefined) => {
  if (corporationUuid) {
    // Only allow corporation change when creating new estimates
    if (props.editingEstimate) {
      return; // Corporation is locked when editing
    }
    
    // Clear project selection since projects are corporation-specific
    handleFormUpdate('project_uuid', '');
    // Clear line items when corporation changes
    handleFormUpdate('line_items', []);
    // Update form's corporation_uuid
    handleFormUpdate('corporation_uuid', corporationUuid);
    
    // Reset the modal shown tracking for new corporation
    hasShownModalForProject.value.clear();
    
    // Fetch all required data for the new corporation using the estimate creation store
    // This is isolated from the global corporation context
    await estimateCreationStore.setCorporationAndFetchData(corporationUuid);
  }
};

// Date formatter for display
const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
});

// Date computed properties for UCalendar
const estimateDateValue = computed({
  get: () => {
    if (!props.form.estimate_date) return null;
    const date = new Date(props.form.estimate_date);
    return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  },
  set: (value: CalendarDate | null) => {
    if (value) {
      const dateString = `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
      handleFormUpdate('estimate_date', dateString);
    } else {
      handleFormUpdate('estimate_date', null);
    }
  }
});

// Display text for date inputs
const estimateDateDisplayText = computed(() => {
  if (!estimateDateValue.value) return 'Select estimate date';
  return df.format(estimateDateValue.value.toDate(getLocalTimeZone()));
});

// Project options - use estimateCreationStore for new estimates, global store for editing
const projectOptions = computed(() => {
  // Get the corporation UUID to filter projects
  // When editing, use the estimate's corporation_uuid, not the TopBar's selected corporation
  const corporationUuid = props.editingEstimate
    ? (props.form.corporation_uuid || corpStore.selectedCorporationId)
    : (estimateCreationStore.selectedCorporationUuid || props.form.corporation_uuid);
  
  if (!corporationUuid) {
    return [];
  }
  
  // Get projects from appropriate store
  const allProjects = props.editingEstimate 
    ? (projectsStore.projects || [])
    : (estimateCreationStore.projects || []);
  
  // Filter by corporation and active status
  let filteredProjects = allProjects.filter(project => 
    project.corporation_uuid === corporationUuid && 
    (project.is_active !== false) // Include if is_active is true or undefined
  );
  
  // When editing, if the current project is not in the filtered list, add it
  // This handles cases where the project might be from a different corporation or not yet loaded
  if (props.editingEstimate && props.form.project_uuid) {
    const currentProjectInList = filteredProjects.find(p => p.uuid === props.form.project_uuid);
    if (!currentProjectInList) {
      // Try to find it in all projects (might be from different corporation)
      const currentProject = allProjects.find(p => p.uuid === props.form.project_uuid);
      if (currentProject) {
        filteredProjects = [currentProject, ...filteredProjects];
      } else if (props.form.project) {
        // Use the project data from the form if available
        filteredProjects = [props.form.project, ...filteredProjects];
      }
    }
  }
  
  return filteredProjects.map(project => ({
    uuid: project.uuid,
    value: project.uuid, // Add value for USelectMenu
    label: `${project.project_name || project.project_id || 'Unnamed'} (${project.project_id || project.uuid})`,
    project_name: project.project_name,
    project_id: project.project_id
  }));
});


const statusLabel = computed(() => {
  const map: Record<string, string> = {
    Draft: 'Drafting…',
    Ready: 'Estimate ready for approval',
    Approved: 'Estimate approved'
  }
  const status = props.form.status || 'Draft'
  return map[status] || status
});

const statusChipClass = computed(() => {
  const map: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-700 border-gray-200',
    Ready: 'bg-blue-100 text-blue-700 border-blue-200',
    Approved: 'bg-green-100 text-green-700 border-green-200',
  };
  const status = props.form.status || 'Draft'
  return map[status] || map.Draft;
});

const isReadOnlyEstimate = computed(() => {
  return props.readonly || (props.editingEstimate && props.form?.status === 'Approved')
})

// Calculated final amount
const calculatedFinalAmount = computed(() => {
  const total = parseFloat(props.form.total_amount) || 0;
  const tax = parseFloat(props.form.tax_amount) || 0;
  const discount = parseFloat(props.form.discount_amount) || 0;
  return (total + tax - discount).toFixed(2);
});

// Helper function to get project contingency percentage
const getProjectContingencyPercent = (): number => {
  if (!props.form.project_uuid) return 0;
  const projects = props.editingEstimate 
    ? projectsStore.projects 
    : estimateCreationStore.projects;
  const project = projects.find(p => p.uuid === props.form.project_uuid);
  if (!project) return 0;
  const raw = project.contingency_percentage;
  if (raw === null || raw === undefined || raw === '') {
    return 0;
  }
  const parsed = parseFloat(String(raw));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

// Methods
const handleFormUpdate = (field: string, value: any) => {
  const updatedForm = { ...props.form, [field]: value };
  
  // Update total amount from line items when line_items change
  if (field === 'line_items') {
    // Calculate base total (sum of all item.total_amount)
    const baseTotal = (value || []).reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.total_amount) || 0);
    }, 0);
    
    // Calculate contingency total
    const contingencyTotal = (value || []).reduce((sum: number, item: any) => {
      // Only apply contingency if contingency_enabled is true
      if (item.contingency_enabled === true) {
        const baseAmount = parseFloat(item.total_amount) || 0;
        // Use item's contingency_percentage, or fallback to project contingency if null/undefined
        let contingencyPercent = parseFloat(item.contingency_percentage);
        if (isNaN(contingencyPercent) || contingencyPercent === null || contingencyPercent === undefined) {
          contingencyPercent = getProjectContingencyPercent();
        }
        // Calculate contingency amount: base * (percentage / 100)
        const contingencyAmount = baseAmount * (contingencyPercent / 100);
        return sum + contingencyAmount;
      }
      return sum;
    }, 0);
    
    // Total amount = base total + contingency total
    updatedForm.total_amount = baseTotal + contingencyTotal;
  }
  
  // Update final amount when financial fields change
  if (['total_amount', 'tax_amount', 'discount_amount', 'line_items'].includes(field)) {
    const total = parseFloat(updatedForm.total_amount) || 0;
    const tax = parseFloat(updatedForm.tax_amount) || 0;
    const discount = parseFloat(updatedForm.discount_amount) || 0;
    updatedForm.final_amount = total + tax - discount;
  }
  
  emit('update:form', updatedForm);
};

// Line item methods are now handled by EstimateLineItemsTable component

// Validation
const isValid = computed(() => {
  const f = props.form;
  return !!(
    f.estimate_number &&
    f.project_uuid &&
    f.estimate_date &&
    f.total_amount &&
    f.final_amount
  );
});

// Watch for validation changes
watch(() => isValid.value, (isValid) => {
  emit('validation-change', isValid);
}, { immediate: true });

// Watch for corporation changes in estimateCreationStore to ensure projects are loaded
watch(() => estimateCreationStore.selectedCorporationUuid, async (newCorpUuid, oldCorpUuid) => {
  // Only watch when creating new estimates (not editing)
  if (props.editingEstimate) return;
  
  // If corporation changed, projects should already be fetched by handleCorporationChange
  // But ensure they're loaded if somehow they're missing
  if (newCorpUuid && newCorpUuid !== oldCorpUuid) {
    const hasProjects = estimateCreationStore.projects.some(
      (p: any) => p.corporation_uuid === newCorpUuid
    );
    if (!hasProjects) {
      // Projects might not be loaded yet, fetch them
      await estimateCreationStore.setCorporationAndFetchData(newCorpUuid);
    }
  }
}, { immediate: true });

// Cost code selection modal state
const isCostCodeSelectionModalOpen = ref(false);
const hierarchicalDataForModal = ref<any[]>([]);
const hasShownModalForProject = ref<Set<string>>(new Set());
const isCheckingExistingEstimate = ref(false);

// Build hierarchical data for modal (similar to EstimateLineItemsTable)
const buildHierarchicalData = (divisions: any[], configurations: any[]): any[] => {
  if (!divisions?.length || !configurations?.length) return [];

  const mainDivisions = divisions
    .filter(division => division?.is_active !== false && division?.exclude_in_estimates_and_reports !== true)
    .sort((a, b) => (a.division_order || 0) - (b.division_order || 0));

  const excludedDivisionUuids = new Set(
    divisions
      .filter(division => division?.is_active !== false && division?.exclude_in_estimates_and_reports === true)
      .map(division => division.uuid)
  );

  const divisionsData = mainDivisions.map(division => {
    const divisionConfigurations = configurations
      .filter(config => 
        config?.division_uuid === division?.uuid && 
        config?.is_active !== false && 
        !config?.parent_cost_code_uuid
      )
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const costCodes = divisionConfigurations.map(costCode => {
      const subCostCodes = configurations
        .filter(subConfig => 
          subConfig?.parent_cost_code_uuid === costCode?.uuid && 
          subConfig?.is_active !== false
        )
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(subConfig => {
          const subSubCostCodes = configurations
            .filter(subSubConfig => 
              subSubConfig?.parent_cost_code_uuid === subConfig?.uuid && 
              subSubConfig?.is_active !== false
            )
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          return {
            ...subConfig,
            subSubCostCodes
          };
        });

      return {
        ...costCode,
        subCostCodes
      };
    });

    return {
      ...division,
      costCodes
    };
  });

  // Add "Other Costs" section
  const otherCostCodes = configurations
    .filter(config => 
      (
        !config?.division_uuid || 
        (config?.division_uuid && excludedDivisionUuids.has(config.division_uuid))
      ) &&
      config?.is_active !== false && 
      !config?.parent_cost_code_uuid
    )
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(costCode => {
      const subCostCodes = configurations
        .filter(subConfig => 
          subConfig?.parent_cost_code_uuid === costCode?.uuid && 
          subConfig?.is_active !== false
        )
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(subConfig => {
          const subSubCostCodes = configurations
            .filter(subSubConfig => 
              subSubConfig?.parent_cost_code_uuid === subConfig?.uuid && 
              subSubConfig?.is_active !== false
            )
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          return {
            ...subConfig,
            subSubCostCodes
          };
        });

      return {
        ...costCode,
        subCostCodes
      };
    });

  if (otherCostCodes.length > 0) {
    divisionsData.push({
      uuid: 'other-costs',
      division_number: 'OTHER',
      division_name: 'OTHER COSTS',
      division_order: 999,
      description: 'Cost codes not assigned to any division',
      is_active: true,
      exclude_in_estimates_and_reports: true,
      costCodes: otherCostCodes
    });
  }

  return divisionsData;
};

// Open cost code selection modal
const openCostCodeSelectionModal = async () => {
  const corporationUuid = props.editingEstimate
    ? (props.form.corporation_uuid || corpStore.selectedCorporationId)
    : (estimateCreationStore.selectedCorporationUuid || props.form.corporation_uuid);

  if (!corporationUuid) {
    console.warn('No corporation selected');
    return;
  }

  try {
    let divisions: any[] = [];
    let configurations: any[] = [];

    if (props.editingEstimate) {
      // When editing, use global stores
      // Fetch if needed
      const hasDivisions = divisionsStore.getActiveDivisions(corporationUuid)?.length > 0;
      const hasConfigurations = configurationsStore.getActiveConfigurations(corporationUuid)?.length > 0;

      if (!hasDivisions || !hasConfigurations) {
        await Promise.all([
          divisionsStore.fetchDivisions(corporationUuid),
          configurationsStore.fetchConfigurations(corporationUuid)
        ]);
      }

      divisions = divisionsStore.getActiveDivisions(corporationUuid) || [];
      configurations = configurationsStore.getActiveConfigurations(corporationUuid) || [];
    } else {
      // When creating new, use estimateCreationStore
      // Ensure data is loaded
      if (!estimateCreationStore.selectedCorporationUuid || 
          estimateCreationStore.costCodeDivisions.length === 0 ||
          estimateCreationStore.costCodeConfigurations.length === 0) {
        await estimateCreationStore.setCorporationAndFetchData(corporationUuid);
      }

      divisions = estimateCreationStore.getActiveDivisions || [];
      configurations = estimateCreationStore.getActiveConfigurations || [];
    }

    // Build hierarchical data
    hierarchicalDataForModal.value = buildHierarchicalData(divisions, configurations);
    
    // Only open if we have data
    if (hierarchicalDataForModal.value.length > 0) {
      isCostCodeSelectionModalOpen.value = true;
    }
  } catch (error) {
    console.error('Error loading cost code data for modal:', error);
  }
};

// Handle cost code selection confirm
const handleCostCodeSelectionConfirm = (removedUuids: string[]) => {
  handleFormUpdate('removed_cost_code_uuids', removedUuids);
};

// Handle cost code selection cancel
const handleCostCodeSelectionCancel = () => {
  // Do nothing, just close modal
};

// Watch for project selection to auto-open modal
watch(() => props.form.project_uuid, async (newProjectUuid, oldProjectUuid) => {
  // Only auto-open if:
  // 1. A project is selected (not empty)
  // 2. Project actually changed
  // 3. We haven't shown the modal for this project yet
  // 4. Not in read-only mode
  if (
    newProjectUuid && 
    newProjectUuid !== oldProjectUuid && 
    !hasShownModalForProject.value.has(newProjectUuid) &&
    !isReadOnlyEstimate.value &&
    !props.editingEstimate // Only auto-open for new estimates
  ) {
    // Get corporation UUID for the API call
    const corporationUuid = estimateCreationStore.selectedCorporationUuid || props.form.corporation_uuid;
    
    if (corporationUuid) {
      // Set checking flag to prevent table from rendering while checking
      isCheckingExistingEstimate.value = true;
      
      try {
        // Make a direct API call to check if an estimate exists for this project
        // This is scoped to this component and independent of the global estimates store
        const response: any = await apiFetch('/api/estimates', {
          query: {
            corporation_uuid: corporationUuid,
            project_uuid: newProjectUuid,
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
          
          // Clear the project selection to prevent further actions
          handleFormUpdate('project_uuid', '');
          // Reset checking flag
          isCheckingExistingEstimate.value = false;
          return;
        }
      } catch (error) {
        // If API call fails, log error but don't block the user
        console.error('Error checking for existing estimates:', error);
        // Continue with the normal flow if check fails
      } finally {
        // Always reset checking flag
        isCheckingExistingEstimate.value = false;
      }
    }
    
    // Mark that we'll show the modal for this project
    hasShownModalForProject.value.add(newProjectUuid);
    
    // Open the modal
    await openCostCodeSelectionModal();
  }
}, { immediate: false });

// Initialize with current corporation if creating new estimate
onMounted(async () => {
  // Only use estimateCreationStore when creating new estimates
  if (!props.editingEstimate && corpStore.selectedCorporationId) {
    await estimateCreationStore.setCorporationAndFetchData(corpStore.selectedCorporationId);
  }
  // When editing, ensure projects are loaded for the estimate's corporation
  else if (props.editingEstimate && props.form.corporation_uuid) {
    // Fetch projects for the estimate's corporation (not necessarily the TopBar's selected one)
    const estimateCorpUuid = props.form.corporation_uuid;
    const hasProjectsForCorp = projectsStore.projects.some(p => p.corporation_uuid === estimateCorpUuid);
    if (!hasProjectsForCorp || projectsStore.projects.length === 0) {
      await projectsStore.fetchProjects(estimateCorpUuid);
    }
  }
});
</script>
