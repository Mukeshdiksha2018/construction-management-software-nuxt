<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col lg:flex-row gap-4">
      <div class="flex-1">
        <UCard variant="soft">
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <!-- Corporation -->
          <div>
            <label class="block text-xs font-medium text-default mb-1">
              Corporation <span class="text-red-500">*</span>
            </label>
            <CorporationSelect
              :model-value="form.corporation_uuid"
              :disabled="props.readonly"
              placeholder="Select corporation"
              size="sm"
              class="w-full"
              @update:model-value="handleCorporationChange"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-default mb-1">
              GRN Number
            </label>
            <UInput
              :model-value="form.grn_number"
              placeholder="Auto-generated"
              size="sm"
              class="w-full"
              icon="i-heroicons-hashtag"
              disabled
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-default mb-1">
              Receipt Type <span class="text-red-500">*</span>
            </label>
            <URadioGroup
              v-model="receiptType"
              :items="receiptTypeOptions"
              orientation="horizontal"
              size="sm"
              class="w-full"
              :disabled="props.readonly"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-default mb-1">
              Entry Date <span class="text-red-500">*</span>
            </label>
            <UPopover v-model:open="entryDatePopoverOpen" :disabled="props.readonly">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-heroicons-calendar-days"
                class="w-full justify-start"
                size="sm"
                :disabled="props.readonly"
              >
                {{ entryDateDisplayText }}
              </UButton>
              <template #content>
                <UCalendar v-model="entryDateValue" class="p-2" :disabled="props.readonly" @update:model-value="entryDatePopoverOpen = false" />
              </template>
            </UPopover>
          </div>

          <div>
            <label class="block text-xs font-medium text-default mb-1">
              Shipment Date
            </label>
            <UPopover v-model:open="shipmentDatePopoverOpen" :disabled="props.readonly">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-heroicons-calendar-days"
                class="w-full justify-start"
                size="sm"
                :disabled="props.readonly"
              >
                {{ shipmentDateDisplayText }}
              </UButton>
              <template #content>
                <UCalendar v-model="shipmentDateValue" class="p-2" :disabled="props.readonly" @update:model-value="shipmentDatePopoverOpen = false" />
              </template>
            </UPopover>
          </div>

          <div>
            <label class="block text-xs font-medium text-default mb-1">
              Received Date
            </label>
            <UPopover v-model:open="receivedDatePopoverOpen" :disabled="props.readonly">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-heroicons-calendar-days"
                class="w-full justify-start"
                size="sm"
                :disabled="props.readonly"
              >
                {{ receivedDateDisplayText }}
              </UButton>
              <template #content>
                <UCalendar v-model="receivedDateValue" class="p-2" :disabled="props.readonly" @update:model-value="receivedDatePopoverOpen = false" />
              </template>
            </UPopover>
          </div>

          <div>
            <label class="block text-xs font-medium text-default mb-1">
              Project Name <span class="text-red-500">*</span>
            </label>
            <ProjectSelect
              :model-value="form.project_uuid"
              :corporation-uuid="form.corporation_uuid || corpStore.selectedCorporation?.uuid"
              :disabled="!form.corporation_uuid && !corpStore.selectedCorporation || props.readonly"
              placeholder="Select project"
              size="sm"
              class="w-full"
              @update:model-value="handleProjectChange"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-default mb-1">
              Vendor
            </label>
            <VendorSelect
              :model-value="form.vendor_uuid"
              :corporation-uuid="form.corporation_uuid || corpStore.selectedCorporation?.uuid"
              :local-vendors="localVendors"
              placeholder="Select vendor"
              size="sm"
              class="w-full"
              :disabled="!form.corporation_uuid && !corpStore.selectedCorporation || props.readonly"
              @update:model-value="handleVendorChange"
            />
          </div>

          <div v-if="receiptType === 'purchase_order'">
            <label class="block text-xs font-medium text-default mb-1">
              Purchase Order <span class="text-red-500">*</span>
            </label>
            <USelectMenu
              v-model="poOption"
              :items="poOptions"
              :disabled="!props.form.project_uuid || (!props.form.vendor_uuid && !props.editingReceiptNote && !props.form.uuid) || props.readonly"
              placeholder="Select PO"
              size="sm"
              class="w-full"
              value-key="value"
              label-key="label"
              searchable
              clearable
            >
              <template #item-label="{ item }">
                <div class="flex items-center justify-between w-full">
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <span class="truncate font-medium">{{ item.label }}</span>
                    <UBadge
                      :color="item.type_color"
                      variant="solid"
                      size="xs"
                    >
                      {{ item.type_label }}
                    </UBadge>
                  </div>
                </div>
              </template>
            </USelectMenu>
          </div>

          <div v-if="receiptType === 'change_order'">
            <label class="block text-xs font-medium text-default mb-1">
              Change Order <span class="text-red-500">*</span>
            </label>
            <USelectMenu
              v-model="coOption"
              :items="coOptions"
              :disabled="!props.form.project_uuid || (!props.form.vendor_uuid && !props.editingReceiptNote && !props.form.uuid) || props.readonly"
              placeholder="Select Change Order"
              size="sm"
              class="w-full"
              value-key="value"
              label-key="label"
              searchable
              clearable
            >
              <template #item-label="{ item }">
                <div class="flex items-center justify-between w-full">
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <span class="truncate font-medium">{{ item.label }}</span>
                    <UBadge
                      :color="item.type_color"
                      variant="solid"
                      size="xs"
                    >
                      {{ item.type_label }}
                    </UBadge>
                  </div>
                </div>
              </template>
            </USelectMenu>
          </div>

          <div>
            <label class="block text-xs font-medium text-default mb-1">
              Reference Number
            </label>
            <UInput
              :model-value="form.reference_number || ''"
              placeholder="Reference / Invoice number"
              size="sm"
              class="w-full"
              icon="i-heroicons-document-text"
              :disabled="props.readonly"
              @update:model-value="(value) => updateFormField('reference_number', value)"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-default mb-1">
              Received By
            </label>
            <div class="flex items-center gap-2">
              <UAvatar
                v-if="receivedByOption?.avatar"
                v-bind="receivedByOption.avatar"
                size="xs"
                class="flex-shrink-0"
              />
              <USelectMenu
                v-model="receivedByOption"
                :items="receivedByOptions"
                placeholder="Select team member"
                size="sm"
                class="flex-1 min-w-0"
                value-key="value"
                searchable
                clearable
                :disabled="props.readonly"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-default mb-1">
              Receiving Location
            </label>
            <LocationSelect
              :model-value="form.location_uuid || null"
              :corporation-uuid="form.corporation_uuid || corpStore.selectedCorporation?.uuid"
              size="sm"
              class="w-full"
              :disabled="props.readonly"
              @update:model-value="(value) => updateFormField('location_uuid', value)"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-default mb-1">
              Status
            </label>
            <USelectMenu
              v-model="statusOption"
              :items="statusOptions"
              placeholder="Select status"
              size="sm"
              class="w-full"
              value-key="value"
              :disabled="props.readonly"
            />
          </div>
        </div>
        </UCard>
      </div>
    </div>

    <ReceiptNoteItemsTable
      v-if="(receiptType === 'purchase_order' && form.purchase_order_uuid) || (receiptType === 'change_order' && form.change_order_uuid)"
      :items="receiptItems"
      :loading="poItemsLoading"
      :error="poItemsError"
      :corporation-uuid="(form.corporation_uuid || corpStore.selectedCorporation?.uuid) ?? null"
      :receipt-type="receiptType"
      :readonly="props.readonly"
      @received-quantity-change="handleReceivedQuantityChange"
    />

    <!-- File Upload, Notes, and Financial Breakdown Section -->
    <div v-if="(receiptType === 'purchase_order' && form.purchase_order_uuid) || (receiptType === 'change_order' && form.change_order_uuid)" class="mt-6 flex flex-col lg:flex-row gap-6">
      <!-- File Upload Section (Left) -->
      <div class="w-full lg:w-auto lg:flex-shrink-0 lg:max-w-md">
        <!-- Upload Section -->
        <UCard variant="soft" class="mb-3">
          <div class="flex justify-between items-center mb-3">
            <h4 class="text-base font-bold text-default flex items-center gap-2 border-b border-default/60 pb-2">
              <UIcon name="i-heroicons-cloud-arrow-up-solid" class="w-5 h-5 text-primary-500" />
              File Upload
            </h4>
            <span class="text-xs text-muted bg-elevated px-2 py-1 rounded border border-default/60">
              {{ attachmentCount }} files
              <span
                v-if="uploadedAttachmentCount > 0"
                class="text-success-600 dark:text-success-400"
              >
                ({{ uploadedAttachmentCount }} uploaded)
              </span>
            </span>
          </div>

          <UFileUpload
            v-slot="{ open }"
            v-model="uploadedFiles"
            accept=".pdf,.png,.jpg,.jpeg"
            multiple
            :disabled="props.readonly"
          >
            <div class="space-y-2">
              <UButton
                :label="uploadedFiles.length > 0 ? 'Add more files' : 'Choose files'"
                color="primary"
                variant="solid"
                size="sm"
                icon="i-heroicons-document-plus"
                :disabled="props.readonly"
                @click="open()"
              />

              <p
                v-if="fileUploadErrorMessage"
                class="text-xs text-error-600 flex items-center gap-1 p-2 bg-error-50 rounded border border-error-200 dark:bg-error-500/10 dark:border-error-500/30"
              >
                <UIcon name="i-heroicons-exclamation-triangle" class="w-3 h-3 flex-shrink-0" />
                <span class="truncate">{{ fileUploadErrorMessage }}</span>
              </p>

              <p class="text-[11px] text-muted text-center">
                PDF or image files · Maximum size 10MB each
              </p>
            </div>
          </UFileUpload>
        </UCard>

        <!-- Uploaded Files List -->
        <UCard variant="soft">
          <div class="flex justify-between items-center mb-3">
            <h4 class="text-base font-bold text-default flex items-center gap-2 border-b border-default/60 pb-2">
              <UIcon name="i-heroicons-document-text-solid" class="w-5 h-5 text-primary-500" />
              Uploaded Files
            </h4>
          </div>

          <div
            v-if="!form.attachments || form.attachments.length === 0"
            class="flex flex-col items-center justify-center min-h-[200px] text-muted p-6"
          >
            <UIcon name="i-heroicons-document" class="w-12 h-12 mb-3 text-muted" />
            <p class="text-sm font-medium mb-1">No files uploaded</p>
            <p class="text-xs text-muted text-center">
              Use the button above to attach delivery documents.
            </p>
          </div>

          <div v-else class="max-h-[300px] overflow-y-auto">
            <div class="space-y-2">
              <div
                v-for="(attachment, index) in form.attachments"
                :key="attachment.uuid || attachment.tempId || `attachment-${index}`"
                class="flex items-center gap-2 p-2 bg-elevated rounded-md border border-default text-xs hover:bg-accented transition-colors"
              >
                <UIcon
                  :name="attachment.uuid || attachment.isUploaded ? 'i-heroicons-check-circle' : 'i-heroicons-arrow-up-tray'"
                  class="w-3 h-3"
                  :class="attachment.uuid || attachment.isUploaded ? 'text-success-600' : 'text-warning-500'"
                />
                <span class="truncate flex-1 text-default">
                  {{ attachment.document_name || attachment.name || `File ${index + 1}` }}
                </span>
                <span class="text-[11px] text-muted">
                  {{ formatFileSize(attachment.size || attachment.file_size) }}
                </span>
                <div class="flex items-center gap-1">
                  <UButton
                    icon="i-heroicons-eye-solid"
                    color="neutral"
                    variant="soft"
                    size="xs"
                    class="p-1 h-auto text-xs"
                    @click.stop="previewFile(attachment)"
                  />
                  <UButton
                    icon="mingcute:delete-fill"
                    color="error"
                    variant="soft"
                    size="xs"
                    class="p-1 h-auto text-xs"
                    :disabled="props.readonly"
                    @click.stop="removeAttachment(index)"
                  />
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Notes Section (Middle) -->
      <div class="w-full lg:flex-1">
        <UCard variant="soft">
          <label class="block text-xs font-medium text-default mb-1">
            Notes
          </label>
          <UTextarea
            :model-value="form.notes || ''"
            placeholder="Additional notes about this receipt"
            size="sm"
            :rows="4"
            class="w-full"
            autoresize
            :disabled="props.readonly"
            @update:model-value="(value) => updateFormField('notes', value)"
          />
        </UCard>
      </div>

      <!-- Financial Breakdown (Right) -->
      <div class="w-full lg:flex-1 flex justify-start lg:justify-end">
        <div class="w-full lg:w-auto lg:min-w-[520px]">
          <FinancialBreakdown
            :item-total="grnItemTotal"
            :form-data="form"
            :read-only="true"
            item-total-label="Item Total"
            total-label="GRN Total"
            total-field-name="grn_total_with_charges_taxes"
            @update="handleFinancialBreakdownUpdate"
          />
        </div>
      </div>
    </div>

    <UCard v-else variant="soft" class="mt-6">
      <label class="block text-xs font-medium text-default mb-1">
        Notes
      </label>
      <UTextarea
        :model-value="form.notes || ''"
        placeholder="Additional notes about this receipt"
        size="sm"
        :rows="4"
        class="w-full"
        autoresize
        @update:model-value="(value) => updateFormField('notes', value)"
      />
    </UCard>

    <!-- File Preview Modal -->
    <UModal v-model:open="showFilePreviewModal">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-base font-semibold">File Preview</h3>
          <UButton icon="i-heroicons-x-mark" size="xs" variant="solid" color="neutral" @click="closeFilePreview" />
        </div>
      </template>
      <template #body>
        <div class="h-[70vh]">
          <FilePreview :attachment="selectedFileForPreview" />
        </div>
      </template>
    </UModal>

    <!-- Receipt Note Items Selection Modal -->
    <ReceiptNoteItemsSelectionModal
      v-model:open="showItemsSelectionModal"
      :items="availableItemsForSelection"
      :preselected-items="currentReceiptItemsForPreselection"
      :title="itemsSelectionModalTitle"
      @confirm="handleItemsSelectionConfirm"
      @cancel="handleItemsSelectionCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from "vue";
import { storeToRefs } from "pinia";
import { CalendarDate, DateFormatter, getLocalTimeZone } from "@internationalized/date";
import { useCorporationStore } from "@/stores/corporations";
import { usePurchaseOrdersStore } from "@/stores/purchaseOrders";
import { usePurchaseOrderResourcesStore } from "@/stores/purchaseOrderResources";
import { useChangeOrdersStore } from "@/stores/changeOrders";
import { useVendorStore } from "@/stores/vendors";
import { useUTCDateFormat } from "@/composables/useUTCDateFormat";
import { useCurrencyFormat } from "@/composables/useCurrencyFormat";
import { useLocalPOCOData } from "@/composables/useLocalPOCOData";
import ProjectSelect from "@/components/Shared/ProjectSelect.vue";
import LocationSelect from "@/components/Shared/LocationSelect.vue";
import CorporationSelect from "@/components/Shared/CorporationSelect.vue";
import VendorSelect from "@/components/Shared/VendorSelect.vue";
import ReceiptNoteItemsTable from "@/components/PurchaseOrders/ReceiptNoteItemsTable.vue";
import { useUserProfilesStore } from "@/stores/userProfiles";
import { useItemTypesStore } from "@/stores/itemTypes";
import FinancialBreakdown from "@/components/PurchaseOrders/FinancialBreakdown.vue";
import FilePreview from "@/components/Shared/FilePreview.vue";
import ReceiptNoteItemsSelectionModal from "@/components/PurchaseOrders/ReceiptNoteItemsSelectionModal.vue";

interface Props {
  form: any;
  editingReceiptNote: boolean;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
});

const emit = defineEmits<{
  "update:form": [value: any];
  "shortfall-detected": [items: any[]];
}>();

const corpStore = useCorporationStore();
const purchaseOrdersStore = usePurchaseOrdersStore();
const purchaseOrderResourcesStore = usePurchaseOrderResourcesStore();
const changeOrdersStore = useChangeOrdersStore();
const vendorStore = useVendorStore();
const userProfilesStore = useUserProfilesStore();
const itemTypesStore = useItemTypesStore();
const { users: allUsers, hasData: hasUsersData } = storeToRefs(userProfilesStore);
const { toUTCString, fromUTCString } = useUTCDateFormat();
const { formatCurrency } = useCurrencyFormat();

// PO Items state
const poItems = ref<any[]>([]);
const poItemsLoading = ref(false);
const entryDatePopoverOpen = ref(false);
const shipmentDatePopoverOpen = ref(false);
const receivedDatePopoverOpen = ref(false);
const poItemsError = ref<string | null>(null);
const receiptItems = ref<any[]>([]);

// Items selection modal state
const showItemsSelectionModal = ref(false);
const availableItemsForSelection = ref<any[]>([]);
const pendingSourceUuid = ref<string | null>(null);
const pendingSourceType = ref<string | null>(null);

// Local purchase orders and change orders (independent from global store)
const { localPurchaseOrders, localChangeOrders, fetchLocalPurchaseOrders, fetchLocalChangeOrders } = useLocalPOCOData();

// Local vendors (independent from global store)
const localVendors = ref<any[]>([]);

/**
 * Fetch vendors directly via API (independent from global store)
 * @param corporationUuid - The corporation UUID to fetch vendors for
 */
const fetchLocalVendors = async (corporationUuid: string) => {
  if (!corporationUuid) {
    localVendors.value = [];
    return;
  }
  
  try {
    const response: any = await $fetch("/api/purchase-orders/vendors", {
      method: "GET",
      query: {
        corporation_uuid: corporationUuid,
      },
    });
    
    // Handle different response formats
    const vendors = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
      ? response.data
      : [];
    
    localVendors.value = vendors;
  } catch (error: any) {
    console.error("[ReceiptNoteForm] Failed to fetch vendors:", error);
    localVendors.value = [];
  }
};

// Receipt type state - sync with form
const receiptType = computed({
  get: () => {
    // If form has receipt_type, use it; otherwise default to purchase_order
    return props.form.receipt_type || 'purchase_order';
  },
  set: (value: 'purchase_order' | 'change_order') => {
    const currentType = props.form.receipt_type || 'purchase_order';
    
    // Only clear fields if actually switching types
    if (currentType !== value) {
      if (value === 'purchase_order') {
        // Clear change order selection
        updateFormField("change_order_uuid", null);
        // Clear purchase_order_uuid if it was a change order UUID
        if (currentType === 'change_order' && props.form.purchase_order_uuid) {
          updateFormField("purchase_order_uuid", null);
        }
      } else if (value === 'change_order') {
        // Clear purchase order selection
        updateFormField("purchase_order_uuid", null);
        // Clear change_order_uuid if it was a purchase order UUID
        if (currentType === 'purchase_order' && props.form.change_order_uuid) {
          updateFormField("change_order_uuid", null);
        }
      }
    }
    
    // Always update receipt_type
    updateFormField("receipt_type", value);
  },
});

const receiptTypeOptions = [
  { label: 'Purchase Order', value: 'purchase_order' },
  { label: 'Change Order', value: 'change_order' },
];

// Reset internal state when form changes (for new receipt notes)
watch(
  () => props.form,
  (newForm) => {
    // Reset internal state when creating a new receipt note (no UUID)
    if (!newForm?.uuid) {
      poItems.value = [];
      poItemsLoading.value = false;
      poItemsError.value = null;
      // Don't reset receiptItems here - let the PO watch handle it
    }
  },
  { immediate: true }
);

// Financial calculation helpers
const parseNumericInput = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  const normalized = String(value).replace(/,/g, '').trim()
  if (!normalized) return 0
  const numeric = Number(normalized)
  return Number.isFinite(numeric) ? numeric : 0
}

const toInputString = (value: any): string => {
  if (value === null || value === undefined) return ''
  return typeof value === 'number' ? String(value) : String(value)
}

const roundCurrencyValue = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

const roundTo = (value: number, decimals = 4): number => {
  if (!Number.isFinite(value)) return 0
  const factor = Math.pow(10, decimals)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

const chargeRows = [
  { key: 'freight', label: 'Freight Charges' },
  { key: 'packing', label: 'Packing Charges' },
  { key: 'custom_duties', label: 'Custom & Duties' },
  { key: 'other', label: 'Other Charges' },
] as const

const salesTaxRows = [
  { key: 'sales_tax_1', label: 'Sales Tax 1' },
  { key: 'sales_tax_2', label: 'Sales Tax 2' },
] as const

// Calculate GRN Item Total from receipt items
const grnItemTotal = computed(() => {
  const items = receiptItems.value || []
  const total = items.reduce((sum: number, item: any) => {
    const receivedTotal = parseNumericInput(item.received_total)
    return sum + receivedTotal
  }, 0)
  const rounded = roundCurrencyValue(total)
  return rounded
})


// Watch form data for charges/taxes to ensure FinancialBreakdown recalculates
watch(
  () => [
    props.form.freight_charges_percentage,
    props.form.packing_charges_percentage,
    props.form.custom_duties_charges_percentage,
    props.form.other_charges_percentage,
    props.form.sales_tax_1_percentage,
    props.form.sales_tax_2_percentage,
  ],
  () => {
    // FinancialBreakdown should automatically recalculate when formData changes
  },
  { deep: false }
);

// Note: Financial calculations are now handled by FinancialBreakdown component

// Handler for financial breakdown component updates
const handleFinancialBreakdownUpdate = (updates: Record<string, any>) => {
  // Update total_received_amount with GRN Total from financial breakdown
  // This should always match grn_total_with_charges_taxes
  if (updates.grn_total_with_charges_taxes !== undefined) {
    updates.total_received_amount = updates.grn_total_with_charges_taxes;
  } else {
    // Try to get it from financial_breakdown.totals
    if (updates.financial_breakdown?.totals?.grn_total_with_charges_taxes !== undefined) {
      updates.grn_total_with_charges_taxes = updates.financial_breakdown.totals.grn_total_with_charges_taxes;
      updates.total_received_amount = updates.grn_total_with_charges_taxes;
    }
  }

  // Update all form fields at once (similar to PurchaseOrderForm)
  const source = props.form;
  const next = { ...source };
  Object.keys(updates).forEach((key) => {
    next[key] = updates[key];
  });

  // Also update receipt items with grn_total and grn_total_with_charges_taxes per item
  if (receiptItems.value.length > 0 && grnItemTotal.value > 0) {
    const grnTotalValue = updates.grn_total_with_charges_taxes || updates.total_po_amount || 0
    
    const updatedReceiptItems = receiptItems.value.map((item: any) => {
      const itemGrnTotal = parseNumericInput(item.received_total)
      const itemGrnTotalWithCharges = (itemGrnTotal / grnItemTotal.value) * grnTotalValue

      return {
        ...item,
        grn_total: itemGrnTotal,
        grn_total_with_charges_taxes: Number.isFinite(itemGrnTotalWithCharges) ? roundCurrencyValue(itemGrnTotalWithCharges) : null,
      }
    })

    receiptItems.value = updatedReceiptItems
    next.receipt_items = updatedReceiptItems
  }

  // Emit all updates at once
  emit("update:form", next);
}

// Recalculate GRN totals - now handled by FinancialBreakdown component
// This function is kept for backward compatibility but is a no-op
const recalculateGrnTotals = () => {
  // The FinancialBreakdown component handles all calculations
  // This is kept for any watchers that might still call it
}

const statusOptions = [
  { label: "In Shipment", value: "Shipment" },
  { label: "Received", value: "Received" },
];

const uploadedFiles = ref<File[]>([]);
const fileUploadError = ref<string | null>(null);

// File preview functionality
const showFilePreviewModal = ref(false);
const selectedFileForPreview = ref<any>(null);

// Helper function to get PO type color and label
const getPOTypeInfo = (poType: string) => {
  const typeInfo: Record<string, { color: "error" | "warning" | "info" | "success" | "primary" | "secondary" | "neutral", label: string }> = {
    'LABOR': { color: 'primary', label: 'Labor' },
    'MATERIAL': { color: 'success', label: 'Material' }
  }
  return typeInfo[poType] || { color: 'neutral' as const, label: 'Unknown' }
}

// Helper function to get CO type color and label (same as PO types)
const getCOTypeInfo = (coType: string) => {
  const typeInfo: Record<string, { color: "error" | "warning" | "info" | "success" | "primary" | "secondary" | "neutral", label: string }> = {
    'LABOR': { color: 'primary', label: 'Labor' },
    'MATERIAL': { color: 'success', label: 'Material' }
  }
  return typeInfo[coType] || { color: 'neutral' as const, label: 'Unknown' }
}

const poOptions = computed(() => {
  const list = localPurchaseOrders.value ?? [];
  if (!Array.isArray(list)) return [];

  const corporationUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  const projectUuid = props.form.project_uuid
    ? String(props.form.project_uuid)
    : null;
  const vendorUuid = props.form.vendor_uuid
    ? String(props.form.vendor_uuid)
    : null;

  // Determine allowed statuses based on whether we're editing an existing receipt note
  const isEditing = props.editingReceiptNote || !!props.form.uuid;
  const allowedStatuses = isEditing
    ? ['Approved', 'Partially_Received', 'Completed']
    : ['Approved', 'Partially_Received'];

  // Get current PO UUID if editing (for fallback when vendor is not set)
  const currentPoUuid = props.form.purchase_order_uuid || null;
  
  return list
    .filter((po) => {
      if (!po?.uuid) return false;
      
      // Filter by corporation UUID (form's corporation takes priority)
      if (corporationUuid && po.corporation_uuid !== corporationUuid) return false;
      
      // Filter by project UUID if provided
      if (projectUuid && po.project_uuid !== projectUuid) return false;
      
      // Vendor filtering logic:
      // 1. If vendor is selected: Only show POs matching that vendor
      // 2. If vendor is NOT selected AND editing: Show only the current PO (if it exists)
      // 3. If vendor is NOT selected AND creating new: Show nothing (require vendor selection)
      if (vendorUuid) {
        // Vendor is selected - filter by vendor
        if (po.vendor_uuid !== vendorUuid) return false;
      } else {
        // Vendor is NOT selected
        if (isEditing && currentPoUuid) {
          // Editing existing receipt note - only show the current PO
          if (po.uuid !== currentPoUuid) return false;
        } else {
          // Creating new receipt note - require vendor selection (show nothing)
          return false;
        }
      }
      
      // Only show material purchase orders (exclude labor)
      const poType = String(po.po_type || '').trim().toUpperCase();
      if (poType !== 'MATERIAL') return false;
      
      // Show purchase orders with allowed statuses (case-insensitive)
      const poStatus = String(po.status || '').trim();
      const isAllowedStatus = allowedStatuses.some(
        (status) => poStatus.toLowerCase() === status.toLowerCase()
      );
      if (!isAllowedStatus) return false;
      
      return true;
    })
    .map((po) => {
      // Use local vendors instead of global store
      const vendor = localVendors.value.find(v => v.uuid === po.vendor_uuid)
      const vendorName = vendor?.vendor_name || 'N/A'
      const poNum = po?.po_number || 'Unnamed PO'
      const typeInfo = getPOTypeInfo(String(po.po_type || '').toUpperCase())

      return {
        label: `${poNum} — ${vendorName}`,
      value: po.uuid,
      project_uuid: po.project_uuid,
      vendor_uuid: po.vendor_uuid,
      total: po.total_po_amount ?? 0,
        type_color: typeInfo.color,
        type_label: typeInfo.label,
        po: po
      };
    });
});

const poOption = computed({
  get: () => {
    if (!props.form.purchase_order_uuid) return null;
    return (
      poOptions.value.find(
        (opt) => opt.value === props.form.purchase_order_uuid
      ) ?? null
    );
  },
  set: (option) => {
    const value =
      typeof option === "string"
        ? option
        : option?.value
        ? String(option.value)
        : null;
    updateFormField("purchase_order_uuid", value ?? null);
  },
});

const coOptions = computed(() => {
  const list = localChangeOrders.value ?? [];
  if (!Array.isArray(list)) return [];

  const corporationUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  const projectUuid = props.form.project_uuid
    ? String(props.form.project_uuid)
    : null;
  const vendorUuid = props.form.vendor_uuid
    ? String(props.form.vendor_uuid)
    : null;

  // Determine allowed statuses based on whether we're editing an existing receipt note
  const isEditing = props.editingReceiptNote || !!props.form.uuid;
  const allowedStatuses = isEditing
    ? ['Approved', 'Partially_Received', 'Completed']
    : ['Approved', 'Partially_Received'];

  // Get current CO UUID if editing (for fallback when vendor is not set)
  const currentCoUuid = props.form.change_order_uuid || null;
  
  return list
    .filter((co) => {
      if (!co?.uuid) return false;
      
      // Filter by corporation UUID (form's corporation takes priority)
      if (corporationUuid && co.corporation_uuid !== corporationUuid) return false;
      
      // Filter by project UUID if provided
      if (projectUuid && co.project_uuid !== projectUuid) return false;
      
      // Vendor filtering logic:
      // 1. If vendor is selected: Only show COs matching that vendor
      // 2. If vendor is NOT selected AND editing: Show only the current CO (if it exists)
      // 3. If vendor is NOT selected AND creating new: Show nothing (require vendor selection)
      if (vendorUuid) {
        // Vendor is selected - filter by vendor
        if (co.vendor_uuid !== vendorUuid) return false;
      } else {
        // Vendor is NOT selected
        if (isEditing && currentCoUuid) {
          // Editing existing receipt note - only show the current CO
          if (co.uuid !== currentCoUuid) return false;
        } else {
          // Creating new receipt note - require vendor selection (show nothing)
          return false;
        }
      }
      
      // Only show material change orders (exclude labor)
      const coType = String(co.co_type || '').trim().toUpperCase();
      if (coType !== 'MATERIAL') return false;
      
      // Show change orders with allowed statuses (case-insensitive)
      const coStatus = String(co.status || '').trim();
      const isAllowedStatus = allowedStatuses.some(
        (status) => coStatus.toLowerCase() === status.toLowerCase()
      );
      if (!isAllowedStatus) return false;
      
      return true;
    })
    .map((co) => {
      // Use local vendors instead of global store
      const vendor = localVendors.value.find(v => v.uuid === co.vendor_uuid)
      const vendorName = vendor?.vendor_name || co.vendor_name || 'N/A'
      const coNum = co?.co_number || 'Unnamed CO'
      const typeInfo = getCOTypeInfo(String(co.co_type || '').toUpperCase())

      return {
        label: `${coNum} — ${vendorName}`,
      value: co.uuid,
      project_uuid: co.project_uuid,
      vendor_uuid: co.vendor_uuid,
      total: co.total_co_amount ?? 0,
        type_color: typeInfo.color,
        type_label: typeInfo.label,
        co: co
      };
    });
});

const coOption = computed({
  get: () => {
    if (!props.form.change_order_uuid) return null;
    return (
      coOptions.value.find(
        (opt) => opt.value === props.form.change_order_uuid
      ) ?? null
    );
  },
  set: (option) => {
    const value =
      typeof option === "string"
        ? option
        : option?.value
        ? String(option.value)
        : null;
    updateFormField("change_order_uuid", value ?? null);
  },
});

const statusOption = computed<any>({
  get: () => {
    const value = String(props.form.status || "Shipment");
    return (
      statusOptions.find(
        (option) => option.value.toLowerCase() === value.toLowerCase()
      ) ?? statusOptions[0]
    );
  },
  set: (option) => {
    const value =
      typeof option === "string"
        ? option
        : option?.value
        ? String(option.value)
        : "Shipment";
    updateFormField("status", value);
  },
});

const computeInitials = (user: any) => {
  const segments = [user.firstName, user.lastName]
    .filter((value: any) => typeof value === "string" && value.trim().length > 0)
    .map((value: string) => value.trim()[0]?.toUpperCase())
    .join("");
  if (segments.length) return segments;
  const emailFirst = typeof user.email === "string" ? user.email.trim()[0] : "";
  return emailFirst ? emailFirst.toUpperCase() : "U";
};

const selectedCorporationUuid = computed(
  () => corpStore.selectedCorporation?.uuid ?? corpStore.selectedCorporationId ?? null
);

const corporationUsers = computed(() => {
  const corpUuid = selectedCorporationUuid.value;
  const list = Array.isArray(allUsers.value) ? allUsers.value : [];
  return list.filter((user: any) => {
    if (user.status !== "active") return false;
    if (!corpUuid) return true;
    if (!Array.isArray(user.corporationAccess)) return false;
    return user.corporationAccess.includes(corpUuid);
  });
});

const receivedByOptions = computed(() =>
  corporationUsers.value.map((user) => {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
    const label = fullName || user.email || "Team Member";
    const alt = label;
    const avatar = user.imageUrl
      ? {
          src: user.imageUrl,
          alt,
          size: "xs" as const,
        }
      : {
          alt,
          text: computeInitials(user),
          size: "xs" as const,
        };
    return {
      label,
      value: String(user.id ?? user.email ?? ""),
      description: user.email,
      avatar,
      user,
    };
  })
);

const receivedByOption = computed<any>({
  get: () => {
    if (!props.form.received_by) return null;
    return (
      receivedByOptions.value.find(
        (option) => option.value === props.form.received_by
      ) ?? null
    );
  },
  set: (option) => {
    const value =
      typeof option === "string"
        ? option
        : option?.value
        ? String(option.value)
        : null;
    updateFormField("received_by", value ?? null);
  },
});

const ensureUsersLoaded = async () => {
  try {
    await userProfilesStore.fetchUsers();
  } catch (error) {
    console.error("[ReceiptNoteForm] Failed to load users:", error);
  }
};

const shouldFetchUsers = computed(
  () => !hasUsersData.value || !(Array.isArray(allUsers.value) && allUsers.value.length > 0)
);

watch(
  [selectedCorporationUuid, shouldFetchUsers],
  ([, needsData]) => {
    if (needsData) {
      ensureUsersLoaded();
    }
  },
  { immediate: true }
);

// Ensure vendors are loaded
const ensureVendorsLoaded = async () => {
  // Use form's corporation_uuid, fallback to store's selectedCorporation
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (corpUuid) {
    try {
      await vendorStore.fetchVendors(corpUuid);
    } catch (error) {
      console.error("[ReceiptNoteForm] Failed to load vendors:", error);
    }
  }
};


watch(
  [() => props.form.corporation_uuid, selectedCorporationUuid],
  async ([formCorpUuid]) => {
    // Prioritize form's corporation_uuid
    const corpUuid = formCorpUuid || selectedCorporationUuid.value;
    if (corpUuid) {
      await Promise.allSettled([
        ensureVendorsLoaded(),
        fetchLocalVendors(String(corpUuid)),
        fetchLocalPurchaseOrders(String(corpUuid)),
        fetchLocalChangeOrders(String(corpUuid)),
      ]);
    }
  },
  { immediate: true }
);

onMounted(async () => {
  // Initialize corporation_uuid in form if not set
  if (!props.form.corporation_uuid && corpStore.selectedCorporation?.uuid) {
    updateFormField('corporation_uuid', corpStore.selectedCorporation.uuid);
  }
  
  // NOTE: We do NOT update corpStore.selectedCorporation here to avoid affecting other components
  // The form operates independently with its own corporation selection (props.form.corporation_uuid)
  
  // Use the form's corporation_uuid for fetching data (independent from TopBar)
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  
  if (shouldFetchUsers.value) {
    ensureUsersLoaded();
  }
  
  if (corpUuid) {
    await Promise.allSettled([
      ensureVendorsLoaded(),
      fetchLocalVendors(String(corpUuid)),
      fetchLocalPurchaseOrders(String(corpUuid)),
      fetchLocalChangeOrders(String(corpUuid)),
    ]);
  }
  
  // When editing an existing receipt note, ensure financial data is loaded
  if (props.editingReceiptNote && props.form.uuid) {
    const currentReceiptType = receiptType.value;
    if (currentReceiptType === 'purchase_order' && props.form.purchase_order_uuid) {
      await loadFinancialDataFromSource(props.form.purchase_order_uuid, 'purchase_order');
    } else if (currentReceiptType === 'change_order' && props.form.change_order_uuid) {
      await loadFinancialDataFromSource(props.form.change_order_uuid, 'change_order');
    }
  }
});

const df = new DateFormatter("en-US", {
  dateStyle: "medium",
});

const entryDateValue = computed<CalendarDate | null>({
  get: () => {
    if (!props.form.entry_date) return null;
    const src = String(props.form.entry_date);
    const localYmd = src.includes("T") ? fromUTCString(src) : src;
    const parts = localYmd.split("-");
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        return new CalendarDate(year, month, day);
      }
    }
    return null;
  },
  set: (value) => {
    if (value) {
      const dateString = `${value.year}-${String(value.month).padStart(
        2,
        "0"
      )}-${String(value.day).padStart(2, "0")}`;
      updateFormField("entry_date", toUTCString(dateString));
    } else {
      updateFormField("entry_date", null);
    }
  },
});

const entryDateDisplayText = computed(() => {
  if (!entryDateValue.value) return "Select entry date";
  return df.format(entryDateValue.value.toDate(getLocalTimeZone()));
});

const shipmentDateValue = computed<CalendarDate | null>({
  get: () => {
    if (!props.form.shipment_date) return null;
    const src = String(props.form.shipment_date);
    const localYmd = src.includes("T") ? fromUTCString(src) : src;
    const parts = localYmd.split("-");
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        return new CalendarDate(year, month, day);
      }
    }
    return null;
  },
  set: (value) => {
    if (value) {
      const dateString = `${value.year}-${String(value.month).padStart(
        2,
        "0"
      )}-${String(value.day).padStart(2, "0")}`;
      updateFormField("shipment_date", toUTCString(dateString));
    } else {
      updateFormField("shipment_date", null);
    }
  },
});

const shipmentDateDisplayText = computed(() => {
  if (!shipmentDateValue.value) return "Select shipment date";
  return df.format(shipmentDateValue.value.toDate(getLocalTimeZone()));
});

const receivedDateValue = computed<CalendarDate | null>({
  get: () => {
    if (!props.form.received_date) return null;
    const src = String(props.form.received_date);
    const localYmd = src.includes("T") ? fromUTCString(src) : src;
    const parts = localYmd.split("-");
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        return new CalendarDate(year, month, day);
      }
    }
    return null;
  },
  set: (value) => {
    if (value) {
      const dateString = `${value.year}-${String(value.month).padStart(
        2,
        "0"
      )}-${String(value.day).padStart(2, "0")}`;
      updateFormField("received_date", toUTCString(dateString));
    } else {
      updateFormField("received_date", null);
    }
  },
});

const receivedDateDisplayText = computed(() => {
  if (!receivedDateValue.value) return "Select received date";
  return df.format(receivedDateValue.value.toDate(getLocalTimeZone()));
});

const updateAttachments = (attachments: any[]) => {
  updateFormField("attachments", attachments);
};

const updateFormField = (field: string, value: any, base?: Record<string, any>) => {
  const source = base ?? props.form;
  const next = { ...source, [field]: value };
  emit("update:form", next);
  return next;
};

const handleCorporationChange = async (corporationUuid?: string | null) => {
  const normalizedCorporationUuid = corporationUuid || '';
  updateFormField('corporation_uuid', normalizedCorporationUuid);
  
  // Fetch data for the selected corporation
  // NOTE: We do NOT update corpStore.selectedCorporation here to avoid affecting other components
  // The form operates independently with its own corporation selection
  if (normalizedCorporationUuid) {
    await Promise.allSettled([
      vendorStore.fetchVendors(normalizedCorporationUuid),
      fetchLocalPurchaseOrders(normalizedCorporationUuid),
      fetchLocalChangeOrders(normalizedCorporationUuid),
      ensureUsersLoaded(),
    ]);
    
    // Clear project selection when corporation changes (projects are corporation-specific)
    if (props.form.project_uuid) {
      updateFormField("project_uuid", null);
    }
  }
};

const handleProjectChange = (projectUuid?: string | null) => {
  const nextForm = updateFormField("project_uuid", projectUuid || null);

  const currentPurchaseOrderUuid = nextForm.purchase_order_uuid;
  const currentChangeOrderUuid = nextForm.change_order_uuid;

  if (projectUuid) {
    // Check PO's project_uuid directly from localPurchaseOrders instead of poOptions
    // because poOptions is filtered by project_uuid and might not include the current PO
    // when the project changes
    if (currentPurchaseOrderUuid) {
      const po = localPurchaseOrders.value.find((p: any) => p.uuid === currentPurchaseOrderUuid);
      if (!po || po.project_uuid !== projectUuid) {
        updateFormField("purchase_order_uuid", null, nextForm);
      }
    }

    // Check CO's project_uuid directly from localChangeOrders instead of coOptions
    // because coOptions is filtered by project_uuid and might not include the current CO
    // when the project changes
    if (currentChangeOrderUuid) {
      const co = localChangeOrders.value.find((c: any) => c.uuid === currentChangeOrderUuid);
      if (!co || co.project_uuid !== projectUuid) {
        updateFormField("change_order_uuid", null, nextForm);
      }
    }
  } else {
    // Clear both PO and CO when no project is selected
    if (currentPurchaseOrderUuid) {
      updateFormField("purchase_order_uuid", null, nextForm);
    }
    if (currentChangeOrderUuid) {
      updateFormField("change_order_uuid", null, nextForm);
    }
  }
};

const handleVendorChange = (vendorUuid?: string | null) => {
  const nextForm = updateFormField("vendor_uuid", vendorUuid || null);

  const currentPurchaseOrderUuid = nextForm.purchase_order_uuid;
  const currentChangeOrderUuid = nextForm.change_order_uuid;

  if (vendorUuid) {
    // Check PO's vendor_uuid directly from localPurchaseOrders instead of poOptions
    // because poOptions is filtered by vendor_uuid and might not include the current PO
    // when the vendor changes
    if (currentPurchaseOrderUuid) {
      const po = localPurchaseOrders.value.find((p: any) => p.uuid === currentPurchaseOrderUuid);
      if (!po || po.vendor_uuid !== vendorUuid) {
        updateFormField("purchase_order_uuid", null, nextForm);
      }
    }

    // Check CO's vendor_uuid directly from localChangeOrders instead of coOptions
    // because coOptions is filtered by vendor_uuid and might not include the current CO
    // when the vendor changes
    if (currentChangeOrderUuid) {
      const co = localChangeOrders.value.find((c: any) => c.uuid === currentChangeOrderUuid);
      if (!co || co.vendor_uuid !== vendorUuid) {
        updateFormField("change_order_uuid", null, nextForm);
      }
    }
  } else {
    // Clear both PO and CO when no vendor is selected
    if (currentPurchaseOrderUuid) {
      updateFormField("purchase_order_uuid", null, nextForm);
    }
    if (currentChangeOrderUuid) {
      updateFormField("change_order_uuid", null, nextForm);
    }
  }
};

const formatFileSize = (size?: number | null) => {
  if (!size || size <= 0) return "0 KB";
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const attachmentCount = computed(
  () => (props.form.attachments ? props.form.attachments.length : 0)
);

const uploadedAttachmentCount = computed(() =>
  Array.isArray(props.form.attachments)
    ? props.form.attachments.filter((att: any) => att?.uuid || att?.isUploaded).length
    : 0
);

const fileUploadErrorMessage = computed(() => fileUploadError.value);

const removeAttachment = (index: number) => {
  const attachments = Array.isArray(props.form.attachments)
    ? [...props.form.attachments]
    : [];
  attachments.splice(index, 1);
  updateAttachments(attachments);
};

const previewFile = (attachment: any) => {
  // Map the attachment to the format expected by FilePreview component
  selectedFileForPreview.value = {
    id: attachment.uuid || attachment.tempId,
    // Handle both database format (document_name) and temporary format (name)
    file_name: attachment.document_name || attachment.name,
    name: attachment.document_name || attachment.name,
    // Handle both database format (mime_type) and temporary format (type)
    file_type: attachment.mime_type || attachment.type,
    type: attachment.mime_type || attachment.type,
    // Handle both database format (file_size) and temporary format (size)
    file_size: attachment.file_size || attachment.size,
    size: attachment.file_size || attachment.size,
    // For database files, use file_url; for temporary files, use base64 data
    file_url: attachment.file_url || attachment.url || attachment.fileData,
    url: attachment.file_url || attachment.url || attachment.fileData
  };
  showFilePreviewModal.value = true;
};

const closeFilePreview = () => {
  showFilePreviewModal.value = false;
  selectedFileForPreview.value = null;
};

const handleFileUpload = async () => {
  fileUploadError.value = null;

  if (!uploadedFiles.value.length) {
    return;
  }

  const allowedTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
  ];
  const maxSize = 10 * 1024 * 1024;

  for (const file of uploadedFiles.value) {
    if (!allowedTypes.includes(file.type)) {
      fileUploadError.value =
        "Invalid file type. Only PDF or image files are allowed.";
      uploadedFiles.value = [];
      return;
    }

    if (file.size > maxSize) {
      fileUploadError.value = "File size too large. Maximum size is 10MB.";
      uploadedFiles.value = [];
      return;
    }
  }

  try {
    const processed = await Promise.all(
      uploadedFiles.value.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const fileData = e.target?.result;
              if (typeof fileData !== "string") {
                reject(new Error("Failed to read file"));
                return;
              }

              resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                fileData,
                tempId:
                  Date.now().toString(36) +
                  Math.random().toString(36).slice(2),
                isUploaded: false,
              });
            };
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(file);
          })
      )
    );

    const current = Array.isArray(props.form.attachments)
      ? [...props.form.attachments]
      : [];
    updateAttachments(current.concat(processed));
    uploadedFiles.value = [];
  } catch (error) {
    console.error("[ReceiptNoteForm] file processing error:", error);
    fileUploadError.value = "Failed to process files. Please try again.";
  }
};

watch(uploadedFiles, handleFileUpload, { deep: true });

watch(
  () => props.form.project_uuid,
  (projectUuid) => {
    if (!projectUuid && props.form.purchase_order_uuid) {
      updateFormField("purchase_order_uuid", null);
    }
  }
);

// Transform PO items to receipt items format
const transformPoItemsToReceiptItems = (items: any[]) => {
  // Get preferred items for lookup (for sequence and UOM)
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  const projectUuid = props.form.project_uuid;
  const preferredItemsGetter = purchaseOrderResourcesStore.getPreferredItems;
  const preferredItems = (typeof preferredItemsGetter === 'function' && corpUuid && projectUuid)
    ? preferredItemsGetter(corpUuid, projectUuid) || []
    : [];
  
  // Create a map for quick lookup by item_uuid
  const preferredItemsMap = new Map<string, any>();
  preferredItems.forEach((prefItem: any) => {
    const itemUuid = prefItem.item_uuid || prefItem.uuid;
    if (itemUuid) {
      preferredItemsMap.set(String(itemUuid), prefItem);
    }
  });
  
  return items.map((item) => {
    const metadata = item.display_metadata || item.metadata || {};
    const itemTypeUuid = item.item_type_uuid || metadata.item_type_uuid || null;
    
    // Look up item type from store if available
    let itemTypeCode = item.item_type_code || metadata.item_type_code || item.short_name || metadata.short_name || null;
    let itemTypeLabel = item.item_type_label || metadata.item_type_label || null;
    
    if (itemTypeUuid && itemTypesStore.itemTypes.length > 0) {
      const itemType = itemTypesStore.itemTypes.find((it: any) => it.uuid === itemTypeUuid);
      if (itemType) {
        // Use store values if not already set
        if (!itemTypeCode) {
          itemTypeCode = itemType.short_name || null;
        }
        if (!itemTypeLabel) {
          itemTypeLabel = itemType.item_type || null;
        }
      }
    }
    
    // Look up preferred item by item_uuid for sequence and UOM
    const itemUuid = item.item_uuid || null;
    const preferredItem = itemUuid ? preferredItemsMap.get(String(itemUuid)) : null;
    
    // Get sequence from preferred item if not in item
    let sequenceLabel = item.sequence_label || item.sequence || metadata.sequence || null;
    if (!sequenceLabel && preferredItem) {
      sequenceLabel = preferredItem.item_sequence || null;
    }
    
    // Get unit_label from preferred item if not in item
    let unitLabel = item.unit_label || item.uom_label || item.unit || metadata.unit_label || metadata.unit || null;
    if (!unitLabel && preferredItem) {
      unitLabel = preferredItem.unit || preferredItem.unit_label || preferredItem.uom || preferredItem.uom_label || null;
    }
    
    return {
      id: item.uuid || item.id,
      base_item_uuid: item.uuid,
      uuid: item.uuid,
      cost_code_uuid: item.cost_code_uuid || metadata.cost_code_uuid || null,
      cost_code_label: item.cost_code_label || metadata.cost_code_label || 
        (item.cost_code_number && item.cost_code_name 
          ? `${item.cost_code_number} ${item.cost_code_name}`.trim()
          : (metadata.cost_code_number && metadata.cost_code_name
            ? `${metadata.cost_code_number} ${metadata.cost_code_name}`.trim()
            : null)),
      cost_code_number: item.cost_code_number || metadata.cost_code_number || null,
      cost_code_name: item.cost_code_name || metadata.cost_code_name || null,
      item_type_uuid: itemTypeUuid,
      item_type_code: itemTypeCode,
      item_type_label: itemTypeLabel,
      sequence_label: sequenceLabel,
      item_uuid: itemUuid,
      // Get item name - prioritize item_name strictly (same logic as POBreakdown)
      item_name: (() => {
        let itemName = item.item_name || ''
        if (!itemName) {
          itemName = metadata.item_name || ''
        }
        // If we have sequence but still no item_name, try item.name (preferred items may use 'name' field)
        if (!itemName && sequenceLabel) {
          itemName = item.name || ''
        }
        return itemName || null
      })(),
      description: item.description || metadata.description || null,
      model_number: item.model_number || metadata.model_number || null,
      unit_uuid: item.unit_uuid || item.uom_uuid || metadata.unit_uuid || null,
      unit_label: unitLabel,
      // For change orders, use co_unit_price; for purchase orders, use po_unit_price
      // Also check metadata and handle both CO and PO unit prices
      unit_price: (() => {
        const price = item.unit_price || 
                      item.co_unit_price || 
                      item.po_unit_price || 
                      metadata.unit_price || 
                      metadata.co_unit_price || 
                      metadata.po_unit_price || 
                      0;
        return price;
      })(),
      ordered_quantity: item.po_quantity || item.co_quantity || item.quantity || 0,
      po_quantity: item.po_quantity || item.co_quantity || item.quantity || 0,
      received_quantity: item.received_quantity || null,
      received_total: item.received_total || null,
      location_uuid: item.location_uuid || metadata.location_uuid || null,
      location_label: item.location_label || item.location || metadata.location_display || metadata.location_label || null,
    };
  });
};

// Computed property for items selection modal title
const itemsSelectionModalTitle = computed(() => {
  if (pendingSourceType.value === 'purchase_order') {
    return 'Select Items from Purchase Order';
  } else if (pendingSourceType.value === 'change_order') {
    return 'Select Items from Change Order';
  }
  return 'Select Items to Import';
});

// Computed property for preselected items when editing
const currentReceiptItemsForPreselection = computed(() => {
  return Array.isArray(receiptItems.value) ? receiptItems.value : [];
});

// Fetch items when purchase order or change order changes
const fetchItems = async (sourceUuid: string | null, sourceType: string | null, showModal = true) => {
  
  if (!sourceUuid || !sourceType) {
    poItems.value = [];
    receiptItems.value = [];
    return;
  }

  poItemsLoading.value = true;
  poItemsError.value = null;

  try {
    // Ensure item types and preferred items are loaded for lookup
    const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
    const projectUuid = props.form.project_uuid;
    if (corpUuid && projectUuid) {
      // Fetch item types if needed
      if (itemTypesStore.itemTypes.length === 0) {
        try {
          await itemTypesStore.fetchItemTypes(corpUuid, projectUuid);
        } catch (error) {
          // Continue even if item types fetch fails
        }
      }
      
      // Ensure preferred items are loaded (for sequence and UOM lookup)
      try {
        await purchaseOrderResourcesStore.ensurePreferredItems({
          corporationUuid: corpUuid,
          projectUuid: projectUuid,
          force: false,
        });
      } catch (error) {
        // Continue even if preferred items fetch fails
      }
    }

    let items: any[] = [];

    if (sourceType === 'purchase_order') {
      // Try to use the store function, fallback to direct API call
      if (typeof purchaseOrderResourcesStore.fetchPurchaseOrderItems === 'function') {
        items = await purchaseOrderResourcesStore.fetchPurchaseOrderItems(sourceUuid);
      } else {
        // Fallback: call API directly
        const response: any = await $fetch("/api/purchase-order-items", {
          method: "GET",
          query: {
            purchase_order_uuid: sourceUuid,
          },
        });
        items = Array.isArray(response?.data) ? response.data : [];
      }
    } else if (sourceType === 'change_order') {
      // Fetch change order items
      const response: any = await $fetch("/api/change-order-items", {
        method: "GET",
        query: {
          change_order_uuid: sourceUuid,
        },
      });
      items = Array.isArray(response?.data) ? response.data : [];
    }
    
    poItems.value = items;
    const transformed = transformPoItemsToReceiptItems(items);

    // If showModal is true and we're creating a new receipt note, show the selection modal
    if (showModal && !props.editingReceiptNote) {
      availableItemsForSelection.value = transformed;
      pendingSourceUuid.value = sourceUuid;
      pendingSourceType.value = sourceType;
      showItemsSelectionModal.value = true;
      poItemsLoading.value = false;
      return;
    }

    // For new receipt notes, ensure received quantities are null (not prefilled)
    if (!props.editingReceiptNote) {
      const newReceiptItems = transformed.map((item) => ({
        ...item,
        received_quantity: null, // Ensure no prefilled received quantity for new receipts
        received_total: null,
      }));
      receiptItems.value = newReceiptItems;
    } else {
      // When editing, fetch receipt note items from the new receipt_note_items table
      let receiptNoteItemsMap = new Map<string, any>();
      let poItemsWithReceiptNote: any[] = [];
      let receiptNoteItems: any[] = []; // Declare outside the if block so it's accessible later
      let currentReceiptType: string = receiptType.value;
      let currentPoUuid: string | null = null;
      let currentCoUuid: string | null = null;
      
      if (props.form.uuid) {
        try {
          const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
          const projectUuid = props.form.project_uuid;
          
          if (!corpUuid) {
          } else {
            
            const receiptNoteItemsResponse: any = await $fetch("/api/receipt-note-items", {
              method: "GET",
              query: {
                corporation_uuid: corpUuid,
                project_uuid: projectUuid || undefined,
                receipt_note_uuid: props.form.uuid,
                item_type: receiptType.value, // Filter by receipt type for better performance and correctness
              },
            });
            
            
            receiptNoteItems = Array.isArray(receiptNoteItemsResponse?.data) 
              ? receiptNoteItemsResponse.data 
              : [];
            
            // Set receipt type and UUIDs early so they can be used in the query below
            currentReceiptType = receiptType.value;
            currentPoUuid = currentReceiptType === 'purchase_order' 
              ? (props.form.purchase_order_uuid || sourceUuid)
              : null;
            currentCoUuid = currentReceiptType === 'change_order'
              ? (props.form.change_order_uuid || sourceUuid)
              : null;
            
            
            // Query purchase order items to find which current items reference this receipt note
            // This helps us match receipt note items to current PO items when UUIDs have changed
            if (currentReceiptType === 'purchase_order' && currentPoUuid && props.form.uuid) {
              try {
                const poItemsResponse: any = await $fetch("/api/purchase-order-items", {
                  method: "GET",
                  query: {
                    purchase_order_uuid: currentPoUuid,
                    corporation_uuid: corpUuid,
                  },
                });
                const allPoItems = Array.isArray(poItemsResponse?.data) ? poItemsResponse.data : [];
                // Find PO items that have this receipt note UUID in their receipt_note_uuids array
                poItemsWithReceiptNote = allPoItems.filter((poItem: any) => {
                  const receiptNoteUuids = poItem.receipt_note_uuids || [];
                  return Array.isArray(receiptNoteUuids) && receiptNoteUuids.includes(props.form.uuid);
                });
                
                // Also create a map of receipt note item_uuid to receipt note item for direct lookup
                // This will help us match even when PO item UUIDs have changed
                const receiptNoteItemUuidMap = new Map<string, any>();
                receiptNoteItems.forEach((rni: any) => {
                  if (rni.item_uuid) {
                    receiptNoteItemUuidMap.set(String(rni.item_uuid).trim().toLowerCase(), rni);
                  }
                });
                
                // Try to find current PO items that match receipt note items by checking if
                // any current PO item's UUID matches a receipt note item's item_uuid
                // OR if we can match by position when counts match
              } catch (error) {
              }
            }
            
            // Create a map by item_uuid (the UUID of the original PO/CO item)
            // The receipt_note_items.item_uuid field references purchase_order_items_list.uuid for PO items
            // or change_order_items_list.uuid for CO items
            // Filter by item_type and purchase_order_uuid/change_order_uuid to ensure we only match items of the correct type and order
            // Note: currentReceiptType, currentPoUuid, and currentCoUuid are already declared above
            
            // Check if receipt note items belong to the current purchase order
            const receiptNoteItemsForCurrentPo = receiptNoteItems.filter((rni: any) => 
              currentReceiptType === 'purchase_order' 
                ? rni.purchase_order_uuid === currentPoUuid
                : rni.change_order_uuid === currentCoUuid
            );
            
            let skippedCount = 0;
            receiptNoteItems.forEach((rni: any) => {
              // Only process receipt note items that match the current receipt type
              const rniItemType = rni.item_type || rni.receipt_type || currentReceiptType;
              if (rniItemType !== currentReceiptType) {
                skippedCount++;
                return;
              }
              
              // For purchase orders, ensure the receipt note item belongs to the current purchase order
              if (currentReceiptType === 'purchase_order' && currentPoUuid) {
                if (rni.purchase_order_uuid !== currentPoUuid) {
                  skippedCount++;
                  return;
                }
              }
              
              // For change orders, ensure the receipt note item belongs to the current change order
              if (currentReceiptType === 'change_order' && currentCoUuid) {
                if (rni.change_order_uuid !== currentCoUuid) {
                  skippedCount++;
                  return;
                }
              }
              
              // Map by item_uuid (the primary matching field)
              if (rni.item_uuid) {
                const itemUuidKey = String(rni.item_uuid).trim().toLowerCase();
                receiptNoteItemsMap.set(itemUuidKey, rni);
              } else {
              }
            });
            
          }
        } catch (error: any) {
          console.error("[ReceiptNoteForm] Failed to fetch receipt note items:", error);
          // Continue with fallback to props.form.receipt_items if available
        }
      }
      
      // Create an array of receipt note items in order for position-based matching fallback
      // IMPORTANT: We need to preserve the order from the original receiptNoteItems array
      // to ensure position-based matching works correctly
      const receiptNoteItemsArray: any[] = [];
      receiptNoteItems.forEach((rni: any) => {
        // Only include items that passed all filters (are in the map)
        const rniItemType = rni.item_type || rni.receipt_type || currentReceiptType;
        if (rniItemType === currentReceiptType) {
          if (currentReceiptType === 'purchase_order' && currentPoUuid) {
            if (rni.purchase_order_uuid === currentPoUuid && receiptNoteItemsMap.has(String(rni.item_uuid).trim().toLowerCase())) {
              receiptNoteItemsArray.push(rni);
            }
          } else if (currentReceiptType === 'change_order' && currentCoUuid) {
            if (rni.change_order_uuid === currentCoUuid && receiptNoteItemsMap.has(String(rni.item_uuid).trim().toLowerCase())) {
              receiptNoteItemsArray.push(rni);
            }
          }
        }
      });
      
      
      // Merge receipt note items with transformed PO/CO items
      receiptItems.value = transformed.map((item, index) => {
        // Get the item UUID that should match the receipt note item
        // For purchase orders: match by purchase_order_item_uuid column
        // For change orders: match by change_order_item_uuid column
        const itemUuid = item.uuid || item.base_item_uuid || item.id;
        const currentReceiptType = receiptType.value;
        
        
        // Match based on receipt type
        // Try multiple matching strategies:
        // 1. Match by item.uuid (the row's primary key UUID)
        // 2. Match by item.item_uuid (the item reference UUID - fallback for legacy data)
        // 3. Match by item.base_item_uuid (another potential identifier)
        let receiptNoteItem = null;
        let matchedBy = null;
        
        // Strategy 1: Try matching by item.uuid (primary key - this is what receipt_note_items.item_uuid references)
        // This is the correct field for matching purchase order and change order items
        if (item.uuid) {
          const itemUuidKey = String(item.uuid).trim().toLowerCase();
          receiptNoteItem = receiptNoteItemsMap.get(itemUuidKey);
          if (receiptNoteItem) {
            matchedBy = 'item.uuid';
          }
        }
        
        // Strategy 2: If no match, try matching by base_item_uuid (should be same as uuid, but check anyway)
        if (!receiptNoteItem && item.base_item_uuid && item.base_item_uuid !== item.uuid) {
          const baseItemUuidKey = String(item.base_item_uuid).trim().toLowerCase();
          receiptNoteItem = receiptNoteItemsMap.get(baseItemUuidKey);
          if (receiptNoteItem) {
            matchedBy = 'base_item_uuid';
          }
        }
        
        // Strategy 3: Fallback - try matching by item.item_uuid (master item reference)
        // This should rarely match, but included for legacy data compatibility
        if (!receiptNoteItem && item.item_uuid) {
          const itemRefUuidKey = String(item.item_uuid).trim().toLowerCase();
          receiptNoteItem = receiptNoteItemsMap.get(itemRefUuidKey);
          if (receiptNoteItem) {
            matchedBy = 'item.item_uuid';
          }
        }
        
        // Strategy 4: Try matching by checking if this PO item has the receipt note UUID in its receipt_note_uuids array
        // This handles cases where PO items were recreated but still reference the receipt note
        if (!receiptNoteItem && poItemsWithReceiptNote.length > 0) {
          const poItemWithReceiptNote = poItemsWithReceiptNote.find((poItem: any) => 
            poItem.uuid === item.uuid
          );
          if (poItemWithReceiptNote) {
            // This PO item references the receipt note, so try to find a receipt note item by position
            // We use position because UUIDs don't match (items were likely recreated)
            if (receiptNoteItemsArray.length > 0 && index < receiptNoteItemsArray.length) {
              receiptNoteItem = receiptNoteItemsArray[index];
              matchedBy = 'receipt_note_uuids array + position';
            }
          }
        }
        
        // Strategy 5: Fallback to position-based matching when UUIDs don't match
        // This handles cases where receipt note items were created with old PO item UUIDs
        // We match by position if we have the same number of items OR if we're within bounds
        if (!receiptNoteItem && receiptNoteItemsArray.length > 0) {
          // If we have the same number of receipt note items as PO items, match by position
          if (receiptNoteItemsArray.length === transformed.length && index < receiptNoteItemsArray.length) {
            receiptNoteItem = receiptNoteItemsArray[index];
            matchedBy = 'position (same count)';
          } 
          // If we have more receipt note items, still try position-based matching
          else if (receiptNoteItemsArray.length > transformed.length && index < receiptNoteItemsArray.length) {
            receiptNoteItem = receiptNoteItemsArray[index];
            matchedBy = 'position (more receipt items)';
          }
          // If we have fewer receipt note items, only match if within bounds
          else if (index < receiptNoteItemsArray.length) {
            receiptNoteItem = receiptNoteItemsArray[index];
            matchedBy = 'position (fewer receipt items)';
          }
        }
        
        if (receiptNoteItem) {
          // Use data from receipt_note_items table
          // Ensure received_quantity is properly set (can be 0, so use nullish coalescing carefully)
          const receivedQty = receiptNoteItem.received_quantity !== null && receiptNoteItem.received_quantity !== undefined 
            ? receiptNoteItem.received_quantity 
            : null;
          
          
          return {
            ...item,
            cost_code_uuid: receiptNoteItem.cost_code_uuid ?? item.cost_code_uuid,
            cost_code_label: receiptNoteItem.cost_code_label ?? item.cost_code_label,
            cost_code_number: receiptNoteItem.cost_code_number ?? item.cost_code_number,
            cost_code_name: receiptNoteItem.cost_code_name ?? item.cost_code_name,
            received_quantity: receivedQty,
            received_total: receiptNoteItem.received_total ?? null,
            grn_total: receiptNoteItem.grn_total ?? null,
            grn_total_with_charges_taxes: receiptNoteItem.grn_total_with_charges_taxes ?? null,
            location_uuid: receiptNoteItem.location_uuid ?? item.location_uuid,
            location_label: receiptNoteItem.location_label ?? item.location_label,
          };
        }
        
        // Fallback: If no receipt note item found, check props.form.receipt_items (for backward compatibility)
        if (props.form.receipt_items && Array.isArray(props.form.receipt_items)) {
          const existing = props.form.receipt_items.find(
            (ri: any) => (ri.uuid || ri.base_item_uuid) === itemUuid
          );
          if (existing) {
            return {
              ...item,
              cost_code_uuid: existing.cost_code_uuid ?? item.cost_code_uuid,
              cost_code_label: existing.cost_code_label ?? item.cost_code_label,
              cost_code_number: existing.cost_code_number ?? item.cost_code_number,
              cost_code_name: existing.cost_code_name ?? item.cost_code_name,
              received_quantity: existing.received_quantity ?? item.received_quantity,
              received_total: existing.received_total ?? item.received_total,
            };
          }
        }
        
        
        return item;
      });
    }
  } catch (error: any) {
    console.error("[ReceiptNoteForm] Failed to fetch PO items:", error);
    poItemsError.value = error?.message || "Failed to load purchase order items";
    poItems.value = [];
    receiptItems.value = [];
  } finally {
    poItemsLoading.value = false;
  }
};

// Handle received quantity change
const handleReceivedQuantityChange = (payload: {
  index: number;
  value: string | number | null | undefined;
  numericValue: number;
  computedTotal: number;
}) => {
  const { index, numericValue } = payload;
  const item = receiptItems.value[index];
  
  if (!item) {
    return;
  }

  // Update the item - create a new array to ensure reactivity
  const updatedItems = [...receiptItems.value];
  updatedItems[index] = {
    ...item,
    received_quantity: numericValue,
    received_total: payload.computedTotal,
  };
  receiptItems.value = updatedItems;

  // Update form with receipt items for saving
  updateFormField("receipt_items", receiptItems.value);
};

// Check for items with received quantity less than PO quantity
const parseNumericValue = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value).replace(/,/g, '').trim();
  if (!normalized) return 0;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
};

const shortfallItems = computed(() => {
  if (!Array.isArray(receiptItems.value) || receiptItems.value.length === 0) {
    return [];
  }

  return receiptItems.value
    .map((item, index) => {
      const orderedQty = parseNumericValue(item.ordered_quantity ?? item.po_quantity ?? 0);
      const receivedQty = parseNumericValue(item.received_quantity ?? 0);
      
      if (receivedQty < orderedQty && orderedQty > 0) {
        return {
          ...item,
          index,
          ordered_quantity: orderedQty,
          received_quantity: receivedQty,
          shortfall_quantity: orderedQty - receivedQty,
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
});

const hasShortfallItems = computed(() => shortfallItems.value.length > 0);

// Check for items with received quantity greater than PO/CO quantity
const overReceivedItems = computed(() => {
  if (!Array.isArray(receiptItems.value) || receiptItems.value.length === 0) {
    return [];
  }

  return receiptItems.value
    .map((item, index) => {
      const orderedQty = parseNumericValue(item.ordered_quantity ?? item.po_quantity ?? 0);
      const receivedQty = parseNumericValue(item.received_quantity ?? 0);
      
      if (receivedQty > orderedQty && orderedQty > 0) {
        return {
          ...item,
          index,
          ordered_quantity: orderedQty,
          received_quantity: receivedQty,
          over_received_quantity: receivedQty - orderedQty,
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
});

const hasOverReceivedItems = computed(() => overReceivedItems.value.length > 0);

const overReceivedValidationError = computed(() => {
  if (!hasOverReceivedItems.value) return null;
  
  const itemCount = overReceivedItems.value.length;
  const itemsList = overReceivedItems.value
    .map((item, idx) => {
      const itemName = item.item_name || item.description || `Item ${idx + 1}`;
      const orderedQty = item.ordered_quantity ?? 0;
      const receivedQty = item.received_quantity ?? 0;
      return `"${itemName}" (Ordered: ${orderedQty}, Received: ${receivedQty})`;
    })
    .join('; ');
  
  return `Cannot save receipt note: ${itemCount} item(s) have received quantity greater than ordered quantity. ${itemsList}`;
});

// Combined validation error (for consistency with ReturnNoteForm)
const hasValidationError = computed(() => !!hasOverReceivedItems.value);

// Expose shortfall items and over-received validation to parent component
defineExpose({
  shortfallItems,
  hasShortfallItems,
  overReceivedItems,
  hasOverReceivedItems,
  overReceivedValidationError,
  hasValidationError,
});

// Handler for when user confirms item selection in modal
const handleItemsSelectionConfirm = async (selectedItems: any[]) => {
  if (!pendingSourceUuid.value || !pendingSourceType.value) {
    return;
  }

  // Transform selected items to receipt items format
  const transformed = transformPoItemsToReceiptItems(selectedItems);
  
  // For new receipt notes, ensure received quantities are null (not prefilled)
  const newReceiptItems = transformed.map((item) => ({
    ...item,
    received_quantity: null,
    received_total: null,
  }));
  
  receiptItems.value = newReceiptItems;
  
  // Update form with receipt items
  updateFormField("receipt_items", receiptItems.value);
  
  // Load financial data from source
  await loadFinancialDataFromSource(pendingSourceUuid.value, pendingSourceType.value);
  
  // Clear pending data
  pendingSourceUuid.value = null;
  pendingSourceType.value = null;
  availableItemsForSelection.value = [];
};

// Handler for when user cancels item selection
const handleItemsSelectionCancel = () => {
  // Clear the PO/CO selection if user cancels
  if (pendingSourceType.value === 'purchase_order') {
    updateFormField("purchase_order_uuid", null);
  } else if (pendingSourceType.value === 'change_order') {
    updateFormField("change_order_uuid", null);
  }
  
  // Clear pending data
  pendingSourceUuid.value = null;
  pendingSourceType.value = null;
  availableItemsForSelection.value = [];
  
  // Clear items
  poItems.value = [];
  receiptItems.value = [];
};

// Watch for purchase order or change order changes
watch(
  [() => props.form.purchase_order_uuid, () => props.form.change_order_uuid, () => receiptType.value],
  async ([poUuid, coUuid, currentReceiptType], [oldPoUuid, oldCoUuid, oldReceiptType]) => {
    // Determine which one changed and handle accordingly
    const isPoChange = poUuid !== oldPoUuid;
    const isCoChange = coUuid !== oldCoUuid;
    const isInitialMount = oldPoUuid === undefined && oldCoUuid === undefined && oldReceiptType === undefined;
    const isReceiptTypeChange = !isInitialMount && currentReceiptType !== oldReceiptType;

    // If receipt type changed (but not on initial mount), clear items first
    if (isReceiptTypeChange) {
      await fetchItems(null, null, false);
      // If we have a UUID for the new type, fetch items for it
      if (currentReceiptType === 'purchase_order' && poUuid) {
        await fetchItems(poUuid, 'purchase_order', true);
        await loadFinancialDataFromSource(poUuid, 'purchase_order');
      } else if (currentReceiptType === 'change_order' && coUuid) {
        await fetchItems(coUuid, 'change_order', true);
        await loadFinancialDataFromSource(coUuid, 'change_order');
      }
      return;
    }

    // If both changed, prioritize the current receipt type
    let sourceUuid = null;
    let sourceType = null;

    if (currentReceiptType === 'purchase_order' && isPoChange) {
      sourceUuid = poUuid;
      sourceType = 'purchase_order';
    } else if (currentReceiptType === 'change_order' && isCoChange) {
      sourceUuid = coUuid;
      sourceType = 'change_order';
    }

    // If clearing (setting to null/undefined), clear items and return early
    if (!sourceUuid || !sourceType) {
      // Only clear if we had a previous value
      if ((oldPoUuid !== undefined && oldPoUuid !== null) || (oldCoUuid !== undefined && oldCoUuid !== null)) {
        await fetchItems(null, null, false);
      }
      return;
    }

    // Fetch items and load financial data for the selected source
    // Show modal for new receipt notes when PO/CO changes after mount, but auto-populate on initial mount
    // Skip modal for editing existing ones
    const shouldShowModal = !props.editingReceiptNote && !isInitialMount;
    await fetchItems(sourceUuid, sourceType, shouldShowModal);
    
    // Only load financial data if we're not showing the modal (editing existing receipt note or initial mount)
    if (!shouldShowModal) {
      await loadFinancialDataFromSource(sourceUuid, sourceType);
    }
  },
  { immediate: true }
);

// Load financial data from purchase order or change order
const loadFinancialDataFromSource = async (sourceUuid: string, sourceType: string) => {
  try {
    const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;

    if (sourceType === 'purchase_order') {
      // Ensure local purchase orders are loaded
      if (corpUuid && localPurchaseOrders.value.length === 0) {
        await fetchLocalPurchaseOrders(corpUuid);
      }

      const po = localPurchaseOrders.value.find((p: any) => p.uuid === sourceUuid);
      if (!po) {
        // Try fetching the specific PO if not found
        try {
          const response: any = await $fetch(`/api/purchase-order-forms`, {
            method: "GET",
            query: { uuid: sourceUuid },
          });
          if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
            const fetchedPO = response.data[0];
            await applyChargeTaxPercentages(fetchedPO);
            return;
          }
        } catch (fetchError) {
          console.error("[ReceiptNoteForm] Failed to fetch PO:", fetchError);
        }
        return;
      }

      await applyChargeTaxPercentages(po);
    } else if (sourceType === 'change_order') {
      // Ensure local change orders are loaded
      if (corpUuid && localChangeOrders.value.length === 0) {
        await fetchLocalChangeOrders(corpUuid);
      }

      const co = localChangeOrders.value.find((c: any) => c.uuid === sourceUuid);
      
      if (!co) {
        // Try fetching the specific CO if not found
        try {
          const response: any = await $fetch(`/api/change-orders`, {
            method: "GET",
            query: { uuid: sourceUuid },
          });
          if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
            const fetchedCO = response.data[0];
            await applyChargeTaxPercentages(fetchedCO);
            return;
          }
        } catch (fetchError) {
          console.error("[ReceiptNoteForm] Failed to fetch CO:", fetchError);
        }
        return;
      }

      await applyChargeTaxPercentages(co);
    }
  } catch (error) {
    console.error("[ReceiptNoteForm] Failed to load financial data:", error);
  }
};

// Apply charge and tax percentages to form
const applyChargeTaxPercentages = async (po: any) => {
  const updates: Record<string, any> = {};

  // Load charge percentages and taxable flags only
  // DO NOT copy amounts - they will be recalculated by FinancialBreakdown based on GRN item total
  chargeRows.forEach((row) => {
    const percentageKey = `${row.key}_charges_percentage`;
    const taxableKey = `${row.key}_charges_taxable`;

    if (po[percentageKey] !== undefined) {
      updates[percentageKey] = po[percentageKey];
    }
    if (po[taxableKey] !== undefined) {
      updates[taxableKey] = po[taxableKey];
    }
    // Don't copy amounts - they will be recalculated by FinancialBreakdown component
    // based on GRN item total (grnItemTotal), not PO item total
  });

  // Load sales tax percentages only
  // DO NOT copy amounts - they will be recalculated by FinancialBreakdown based on GRN item total
  salesTaxRows.forEach((row) => {
    const percentageKey = `${row.key}_percentage`;

    if (po[percentageKey] !== undefined) {
      updates[percentageKey] = po[percentageKey];
    }
    // Don't copy amounts - they will be recalculated by FinancialBreakdown component
    // based on GRN item total (grnItemTotal), not PO item total
  });

  // Apply all updates at once to avoid multiple emits
  if (Object.keys(updates).length > 0) {
    const source = props.form;
    const next = { ...source, ...updates };
    emit("update:form", next);
    
    // The FinancialBreakdown component will automatically recalculate when formData changes
    // It watches for percentage changes and recalculates amounts based on itemTotal (grnItemTotal)
    // Use nextTick to ensure the form update is processed before FinancialBreakdown recalculates
    await nextTick();
  }
};

// Note: Financial calculations are now handled by FinancialBreakdown component
// The component watches itemTotal (grnItemTotal) and formData changes automatically
</script>

<style scoped>
/* Force FinancialBreakdown UCard to take full width of its column */
.flex-shrink-0 > div :deep(.w-full),
.flex-shrink-0 > div :deep([class*="w-1/2"]),
.flex-shrink-0 > div :deep([class*="w-5/12"]),
.flex-shrink-0 > div :deep([class*="w-1/3"]) {
  width: 100% !important;
  max-width: 100% !important;
}
</style>


