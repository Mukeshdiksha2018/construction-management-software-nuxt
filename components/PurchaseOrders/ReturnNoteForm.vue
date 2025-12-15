<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col lg:flex-row gap-4">
      <div class="flex-1">
        <UCard variant="soft">
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div>
            <label class="block text-xs font-medium text-default mb-1">
              Return Number
            </label>
            <UInput
              :model-value="form.return_number"
              placeholder="Auto-generated"
              size="sm"
              class="w-full"
              icon="i-heroicons-hashtag"
              disabled
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-default mb-1">
              Return Type <span class="text-red-500">*</span>
            </label>
            <URadioGroup
              v-model="returnType"
              :items="returnTypeOptions"
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
              Project Name <span class="text-red-500">*</span>
            </label>
            <ProjectSelect
              :model-value="form.project_uuid"
              :corporation-uuid="corpStore.selectedCorporation?.uuid"
              :disabled="!corpStore.selectedCorporation || props.readonly"
              placeholder="Select project"
              size="sm"
              class="w-full"
              @update:model-value="handleProjectChange"
            />
          </div>

          <div v-if="returnType === 'purchase_order'">
            <label class="block text-xs font-medium text-default mb-1">
              Purchase Order <span class="text-red-500">*</span>
            </label>
            <USelectMenu
              v-model="poOption"
              :items="poOptions"
              :disabled="!props.form.project_uuid || props.readonly"
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

          <div v-if="returnType === 'change_order'">
            <label class="block text-xs font-medium text-default mb-1">
              Change Order <span class="text-red-500">*</span>
            </label>
            <USelectMenu
              v-model="coOption"
              :items="coOptions"
              :disabled="!props.form.project_uuid || props.readonly"
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
              Returned By
            </label>
            <div class="flex items-center gap-2">
              <UAvatar
                v-if="returnedByOption?.avatar"
                v-bind="returnedByOption.avatar"
                size="xs"
                class="flex-shrink-0"
              />
              <USelectMenu
                v-model="returnedByOption"
                :items="returnedByOptions"
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
              Return Location
            </label>
            <LocationSelect
              :model-value="form.location_uuid || null"
              :corporation-uuid="corpStore.selectedCorporation?.uuid"
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
              :disabled="true"
            />
          </div>
        </div>
        </UCard>
      </div>
    </div>

    <!-- Receipt Notes Validation Error -->
    <UAlert
      v-if="receiptNotesValidationError"
      icon="i-heroicons-exclamation-triangle"
      color="error"
      variant="soft"
      :title="receiptNotesValidationError"
      class="mb-4"
    />

    <div v-if="(returnType === 'purchase_order' && form.purchase_order_uuid) || (returnType === 'change_order' && form.change_order_uuid)" class="space-y-4">
      <ReturnNoteItemsTable
        :items="returnItems"
        :loading="poItemsLoading || checkingReceiptNotes"
        :error="poItemsError || receiptNotesValidationError"
        :corporation-uuid="corpStore.selectedCorporation?.uuid ?? null"
        :return-type="returnType"
        :readonly="props.readonly || !!receiptNotesValidationError"
        :removed-return-items="removedReturnItems"
        @cost-code-change="handleCostCodeChange"
        @return-quantity-change="handleReturnQuantityChange"
        @add-row="handleAddReturnItem"
        @remove-row="handleRemoveReturnItem"
        @update:removed-return-items="handleRemovedReturnItemsUpdate"
        @restore-item="handleRestoreItem"
        @restore-all-items="handleRestoreAllItems"
      />
    </div>

    <!-- File Upload and Notes Section -->
    <div v-if="(returnType === 'purchase_order' && form.purchase_order_uuid) || (returnType === 'change_order' && form.change_order_uuid)" class="mt-6 flex flex-col lg:flex-row gap-6">
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
              Use the button above to attach return documents.
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

      <!-- Notes Section (Right) -->
      <div class="w-full lg:flex-1">
        <UCard variant="soft">
          <label class="block text-xs font-medium text-default mb-1">
            Notes
          </label>
          <UTextarea
            :model-value="form.notes || ''"
            placeholder="Additional notes about this return"
            size="sm"
            :rows="4"
            class="w-full"
            autoresize
            :disabled="props.readonly"
            @update:model-value="(value) => updateFormField('notes', value)"
          />
        </UCard>
      </div>
    </div>

    <UCard v-else variant="soft" class="mt-6">
      <label class="block text-xs font-medium text-default mb-1">
        Notes
      </label>
      <UTextarea
        :model-value="form.notes || ''"
        placeholder="Additional notes about this return"
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
import ProjectSelect from "@/components/Shared/ProjectSelect.vue";
import LocationSelect from "@/components/Shared/LocationSelect.vue";
import ReturnNoteItemsTable from "@/components/PurchaseOrders/ReturnNoteItemsTable.vue";
import { useUserProfilesStore } from "@/stores/userProfiles";
import { useItemTypesStore } from "@/stores/itemTypes";
import { useStockReceiptNotesStore } from "@/stores/stockReceiptNotes";
import { useStockReturnNotesStore } from "@/stores/stockReturnNotes";
import FilePreview from "@/components/Shared/FilePreview.vue";

interface Props {
  form: any;
  editingReturnNote: boolean;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
});

const emit = defineEmits<{
  "update:form": [value: any];
}>();

const corpStore = useCorporationStore();
const purchaseOrdersStore = usePurchaseOrdersStore();
const purchaseOrderResourcesStore = usePurchaseOrderResourcesStore();
const changeOrdersStore = useChangeOrdersStore();
const vendorStore = useVendorStore();
const userProfilesStore = useUserProfilesStore();
const itemTypesStore = useItemTypesStore();
const stockReceiptNotesStore = useStockReceiptNotesStore();
const stockReturnNotesStore = useStockReturnNotesStore();
const { users: allUsers, hasData: hasUsersData } = storeToRefs(userProfilesStore);
const { toUTCString, fromUTCString } = useUTCDateFormat();
const { formatCurrency } = useCurrencyFormat();

// PO Items state
const poItems = ref<any[]>([]);
const poItemsLoading = ref(false);
const entryDatePopoverOpen = ref(false);
const poItemsError = ref<string | null>(null);
const returnItems = ref<any[]>([]);

// Validation state for receipt notes check
const receiptNotesValidationError = ref<string | null>(null);
const checkingReceiptNotes = ref(false);

// Return type state - sync with form
const returnType = computed({
  get: () => {
    // If form has return_type, use it; otherwise default to purchase_order
    return props.form.return_type || 'purchase_order';
  },
  set: (value: 'purchase_order' | 'change_order') => {
    const currentType = props.form.return_type || 'purchase_order';
    
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
    
    // Always update return_type
    updateFormField("return_type", value);
  },
});

const returnTypeOptions = [
  { label: 'Purchase Order', value: 'purchase_order' },
  { label: 'Change Order', value: 'change_order' },
];

// Reset internal state when form changes (for new return notes)
watch(
  () => props.form,
  (newForm) => {
    // Reset internal state when creating a new return note (no UUID)
    if (!newForm?.uuid) {
      poItems.value = [];
      poItemsLoading.value = false;
      poItemsError.value = null;
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

const roundCurrencyValue = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

// Calculate Return Item Total from return items
const returnItemTotal = computed(() => {
  const items = returnItems.value || []
  const total = items.reduce((sum: number, item: any) => {
    const returnTotal = parseNumericInput(item.return_total)
    return sum + returnTotal
  }, 0)
  return roundCurrencyValue(total)
})

const statusOptions = [
  { label: "Returned", value: "Returned" },
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
  const list = purchaseOrdersStore.purchaseOrders ?? [];
  if (!Array.isArray(list)) return [];

  const projectUuid = props.form.project_uuid
    ? String(props.form.project_uuid)
    : null;

  // Determine allowed statuses based on whether we're editing an existing return note
  const isEditing = props.editingReturnNote || !!props.form.uuid;
  const allowedStatuses = isEditing
    ? ['Approved', 'Partially_Received', 'Completed']
    : ['Approved', 'Partially_Received'];

  return list
    .filter((po) => {
      if (!po?.uuid) return false;
      // Show purchase orders with allowed statuses (case-insensitive)
      const poStatus = String(po.status || '').trim();
      const isAllowedStatus = allowedStatuses.some(
        (status) => poStatus.toLowerCase() === status.toLowerCase()
      );
      if (!isAllowedStatus) return false;
      if (!projectUuid) return true;
      return po.project_uuid === projectUuid;
    })
    .map((po) => {
      const vendor = vendorStore.vendors.find(v => v.uuid === po.vendor_uuid)
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
  const list = changeOrdersStore.changeOrders ?? [];
  if (!Array.isArray(list)) return [];

  const projectUuid = props.form.project_uuid
    ? String(props.form.project_uuid)
    : null;

  // Determine allowed statuses based on whether we're editing an existing return note
  const isEditing = props.editingReturnNote || !!props.form.uuid;
  const allowedStatuses = isEditing
    ? ['Approved', 'Partially_Received', 'Completed']
    : ['Approved', 'Partially_Received'];

  return list
    .filter((co) => {
      if (!co?.uuid) return false;
      // Show change orders with allowed statuses (case-insensitive)
      const coStatus = String(co.status || '').trim();
      const isAllowedStatus = allowedStatuses.some(
        (status) => coStatus.toLowerCase() === status.toLowerCase()
      );
      if (!isAllowedStatus) return false;
      if (!projectUuid) return true;
      return co.project_uuid === projectUuid;
    })
    .map((co) => {
      const vendor = vendorStore.vendors.find(v => v.uuid === co.vendor_uuid)
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
    const value = String(props.form.status || "Returned");
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
        : "Returned";
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

const returnedByOptions = computed(() =>
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

const returnedByOption = computed<any>({
  get: () => {
    if (!props.form.returned_by) return null;
    return (
      returnedByOptions.value.find(
        (option) => option.value === props.form.returned_by
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
    updateFormField("returned_by", value ?? null);
  },
});

const ensureUsersLoaded = async () => {
  try {
    await userProfilesStore.fetchUsers();
  } catch (error) {
    console.error("[ReturnNoteForm] Failed to load users:", error);
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
  const corpUuid = corpStore.selectedCorporation?.uuid;
  if (corpUuid && vendorStore.vendors.length === 0) {
    try {
      await vendorStore.fetchVendors(corpUuid);
    } catch (error) {
      console.error("[ReturnNoteForm] Failed to load vendors:", error);
    }
  }
};

watch(selectedCorporationUuid, async (corpUuid) => {
  if (corpUuid) {
    await ensureVendorsLoaded();
  }
}, { immediate: true });

onMounted(() => {
  if (shouldFetchUsers.value) {
    ensureUsersLoaded();
  }
  ensureVendorsLoaded();
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

const updateAttachments = (attachments: any[]) => {
  updateFormField("attachments", attachments);
};

const updateFormField = (field: string, value: any, base?: Record<string, any>) => {
  const source = base ?? props.form;
  const next = { ...source, [field]: value };
  emit("update:form", next);
  return next;
};

const handleProjectChange = (projectUuid?: string | null) => {
  const nextForm = updateFormField("project_uuid", projectUuid || null);

  const currentPurchaseOrderUuid = nextForm.purchase_order_uuid;
  const currentChangeOrderUuid = nextForm.change_order_uuid;

  if (projectUuid) {
    // Clear PO if it doesn't match the selected project
    const matchingPOOption = poOptions.value.find(
      (option) => option.value === currentPurchaseOrderUuid
    );
    if (!matchingPOOption && currentPurchaseOrderUuid) {
      updateFormField("purchase_order_uuid", null, nextForm);
    }

    // Clear CO if it doesn't match the selected project
    const matchingCOOption = coOptions.value.find(
      (option) => option.value === currentChangeOrderUuid
    );
    if (!matchingCOOption && currentChangeOrderUuid) {
      updateFormField("change_order_uuid", null, nextForm);
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
    console.error("[ReturnNoteForm] file processing error:", error);
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

// Check receipt notes and calculate shortfall quantities
const checkReceiptNotesAndCalculateShortfall = async (
  sourceUuid: string,
  sourceType: 'purchase_order' | 'change_order',
  transformedItems: any[]
) => {
  checkingReceiptNotes.value = true;
  receiptNotesValidationError.value = null;

  try {
    const corpUuid = corpStore.selectedCorporation?.uuid;
    const projectUuid = props.form.project_uuid;

    if (!corpUuid || !projectUuid) {
      // If no corp or project, allow manual entry
      returnItems.value = transformedItems.map((item) => ({
        ...item,
        return_quantity: null,
        return_total: null,
      }));
      updateFormField("return_items", returnItems.value);
      return;
    }

    // Fetch all receipt notes for this PO/CO
    await stockReceiptNotesStore.fetchStockReceiptNotes(corpUuid, { force: false });
    const allReceiptNotes = stockReceiptNotesStore.stockReceiptNotes.filter(
      (note: any) => note.corporation_uuid === corpUuid
    );

    // Filter receipt notes that match the source (PO/CO) and receipt type
    const matchingReceiptNotes = allReceiptNotes.filter((note: any) => {
      if (note.is_active === false) return false;
      const receiptType = note.receipt_type || 'purchase_order';
      
      if (sourceType === 'purchase_order') {
        return note.purchase_order_uuid === sourceUuid && receiptType === 'purchase_order';
      } else {
        return note.change_order_uuid === sourceUuid && receiptType === 'change_order';
      }
    });

    if (matchingReceiptNotes.length === 0) {
      // No receipt notes found - allow manual entry
      returnItems.value = transformedItems.map((item) => ({
        ...item,
        return_quantity: null,
        return_total: null,
      }));
      updateFormField("return_items", returnItems.value);
      return;
    }

    // Fetch receipt note items for all matching receipt notes
    const allReceiptNoteItems: any[] = [];
    for (const receiptNote of matchingReceiptNotes) {
      try {
        const response: any = await $fetch("/api/receipt-note-items", {
          method: "GET",
          query: {
            corporation_uuid: corpUuid,
            project_uuid: projectUuid,
            receipt_note_uuid: receiptNote.uuid,
            item_type: sourceType,
          },
        });
        
        const items = Array.isArray(response?.data) ? response.data : [];
        allReceiptNoteItems.push(...items);
      } catch (error) {
        console.error(`[ReturnNoteForm] Failed to fetch receipt note items for ${receiptNote.uuid}:`, error);
      }
    }

    // Create a map of received quantities by item_uuid
    const receivedQuantitiesMap = new Map<string, number>();
    allReceiptNoteItems.forEach((rni: any) => {
      if (rni.is_active === false) return;
      
      const itemUuid = rni.item_uuid || rni.base_item_uuid;
      if (itemUuid) {
        const key = String(itemUuid).trim().toLowerCase();
        const existingQty = receivedQuantitiesMap.get(key) || 0;
        const receivedQty = parseFloat(String(rni.received_quantity || 0)) || 0;
        receivedQuantitiesMap.set(key, existingQty + receivedQty);
      }
    });

    // Fetch existing return notes for the same PO/CO (excluding the current one if editing)
    await stockReturnNotesStore.fetchStockReturnNotes(corpUuid, { force: false });
    const allReturnNotes = stockReturnNotesStore.stockReturnNotes.filter(
      (note: any) => note.corporation_uuid === corpUuid
    );

    // Filter return notes that match the source (PO/CO) and return type, excluding current return note if editing
    const matchingReturnNotes = allReturnNotes.filter((note: any) => {
      if (note.is_active === false) return false;
      // Exclude current return note if editing
      if (props.editingReturnNote && props.form.uuid && note.uuid === props.form.uuid) {
        return false;
      }
      
      const normalizedStatus = String(note.status || '').trim().toLowerCase();
      // Only consider active return notes (Returned status)
      if (normalizedStatus !== 'returned') {
        return false;
      }

      const noteReturnType = note.return_type || 'purchase_order';
      
      if (sourceType === 'purchase_order') {
        return note.purchase_order_uuid === sourceUuid && noteReturnType === 'purchase_order';
      } else {
        return note.change_order_uuid === sourceUuid && noteReturnType === 'change_order';
      }
    });

    // Fetch return note items for all matching return notes
    const allReturnNoteItems: any[] = [];
    for (const returnNote of matchingReturnNotes) {
      try {
        const response: any = await $fetch("/api/return-note-items", {
          method: "GET",
          query: {
            corporation_uuid: corpUuid,
            project_uuid: projectUuid,
            return_note_uuid: returnNote.uuid,
            item_type: sourceType,
          },
        });
        
        const items = Array.isArray(response?.data) ? response.data : [];
        allReturnNoteItems.push(...items);
      } catch (error) {
        console.error(`[ReturnNoteForm] Failed to fetch return note items for ${returnNote.uuid}:`, error);
      }
    }

    // Create a map of already returned quantities by item_uuid
    const returnedQuantitiesMap = new Map<string, number>();
    allReturnNoteItems.forEach((rni: any) => {
      if (rni.is_active === false) return;
      
      const itemUuid = rni.item_uuid || rni.base_item_uuid;
      if (itemUuid) {
        const key = String(itemUuid).trim().toLowerCase();
        const existingQty = returnedQuantitiesMap.get(key) || 0;
        const returnQty = parseFloat(String(rni.return_quantity || 0)) || 0;
        returnedQuantitiesMap.set(key, existingQty + returnQty);
      }
    });

    // Calculate shortfall for each item, accounting for existing return notes
    const itemsWithShortfall: any[] = [];
    let hasAnyRemainingShortfall = false;
    let itemsWithOrderedQty = 0; // Count items that have ordered quantity > 0
    let itemsFullyReceivedCount = 0; // Count items that are fully received
    let itemsWithRemainingReturnQty = 0; // Count items with remaining return quantity > 0

    for (const item of transformedItems) {
      const itemUuid = item.uuid || item.base_item_uuid || item.item_uuid;
      const orderedQty = parseFloat(String(item.ordered_quantity || item.po_quantity || item.co_quantity || 0)) || 0;
      
      if (!itemUuid || orderedQty === 0) {
        // Item without UUID or zero quantity - allow manual entry
        itemsWithShortfall.push({
          ...item,
          return_quantity: null,
          return_total: null,
        });
        continue;
      }

      itemsWithOrderedQty++; // Count items with ordered quantity

      const key = String(itemUuid).trim().toLowerCase();
      const receivedQty = receivedQuantitiesMap.get(key) || 0;
      const alreadyReturnedQty = returnedQuantitiesMap.get(key) || 0;
      
      // Calculate shortfall: ordered - received
      const shortfallQty = orderedQty - receivedQty;
      
      // Calculate remaining return quantity: shortfall - already returned
      const remainingReturnQty = shortfallQty - alreadyReturnedQty;

      if (shortfallQty <= 0) {
        // Fully received - no shortfall (receivedQty >= orderedQty)
        itemsFullyReceivedCount++;
        itemsWithShortfall.push({
          ...item,
          return_quantity: null,
          return_total: null,
        });
      } else if (remainingReturnQty > 0) {
        // There is remaining shortfall after accounting for existing return notes
        hasAnyRemainingShortfall = true;
        itemsWithRemainingReturnQty++;
        itemsWithShortfall.push({
          ...item,
          return_quantity: remainingReturnQty,
          return_total: remainingReturnQty * (parseFloat(String(item.unit_price || 0)) || 0),
        });
      } else {
        // Shortfall exists but has already been fully covered by existing return notes
        itemsWithShortfall.push({
          ...item,
          return_quantity: null,
          return_total: null,
        });
      }
    }

    // If all items are fully received OR all shortfall has been covered by existing return notes, show error
    if (!hasAnyRemainingShortfall && itemsWithOrderedQty > 0) {
      if (itemsFullyReceivedCount === itemsWithOrderedQty) {
        receiptNotesValidationError.value = 
          `Cannot create return note: All quantities for this ${sourceType === 'purchase_order' ? 'purchase order' : 'change order'} have already been received across existing receipt notes. There is no shortfall quantity to return.`;
      } else {
        receiptNotesValidationError.value = 
          `Cannot create return note: All shortfall quantities for this ${sourceType === 'purchase_order' ? 'purchase order' : 'change order'} have already been covered by existing return notes. There is no remaining quantity to return.`;
      }
      returnItems.value = [];
      updateFormField("return_items", []);
      return;
    }

    // If there's remaining shortfall, pre-populate return quantities
    if (hasAnyRemainingShortfall) {
      returnItems.value = itemsWithShortfall;
      updateFormField("return_items", returnItems.value);
    } else {
      // No remaining shortfall - allow manual entry (shouldn't reach here due to error above, but just in case)
      returnItems.value = itemsWithShortfall;
      updateFormField("return_items", returnItems.value);
    }
  } catch (error) {
    console.error("[ReturnNoteForm] Error checking receipt notes:", error);
    // On error, allow manual entry
    returnItems.value = transformedItems.map((item) => ({
      ...item,
      return_quantity: null,
      return_total: null,
    }));
    updateFormField("return_items", returnItems.value);
  } finally {
    checkingReceiptNotes.value = false;
  }
};

// Transform PO/CO items to return items format
const transformItemsToReturnItems = (items: any[]) => {
  // Get preferred items for lookup (for sequence and UOM)
  const corpUuid = corpStore.selectedCorporation?.uuid;
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
      unit_price: item.unit_price || item.co_unit_price || item.po_unit_price || 0,
      ordered_quantity: item.po_quantity || item.co_quantity || item.quantity || 0,
      po_quantity: item.po_quantity || item.co_quantity || item.quantity || 0,
      co_quantity: item.co_quantity || item.po_quantity || item.quantity || 0,
      return_quantity: item.return_quantity || null,
      return_total: item.return_total || null,
      location_uuid: item.location_uuid || metadata.location_uuid || null,
      location_label: item.location_label || item.location || metadata.location_display || metadata.location_label || null,
    };
  });
};

// Fetch items when purchase order or change order changes
const fetchItems = async (sourceUuid: string | null, sourceType: string | null) => {
  
  if (!sourceUuid || !sourceType) {
    poItems.value = [];
    returnItems.value = [];
    return;
  }

  poItemsLoading.value = true;
  poItemsError.value = null;

  try {
    // Ensure item types and preferred items are loaded for lookup
    const corpUuid = corpStore.selectedCorporation?.uuid;
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
    const transformed = transformItemsToReturnItems(items);

    // For new return notes, check if return_items are already provided (e.g., from shortfall)
    if (!props.editingReturnNote) {
      // If return_items are already in the form (e.g., from shortfall items), use them
      if (props.form.return_items && Array.isArray(props.form.return_items) && props.form.return_items.length > 0) {
        // Use the provided return_items (they already have return_quantity set)
        returnItems.value = props.form.return_items.map((item: any) => ({
          ...item,
          // Ensure all required fields are present
          base_item_uuid: item.base_item_uuid || item.uuid || null,
          cost_code_uuid: item.cost_code_uuid || null,
          cost_code_number: item.cost_code_number || '',
          cost_code_name: item.cost_code_name || '',
          item_type_uuid: item.item_type_uuid || null,
          item_uuid: item.item_uuid || null,
          item_name: item.item_name || '',
          description: item.description || '',
          model_number: item.model_number || '',
          unit_uuid: item.unit_uuid || null,
          unit_label: item.unit_label || '',
          unit_price: item.unit_price || 0,
          return_quantity: item.return_quantity || null,
          return_total: item.return_total || (item.return_quantity && item.unit_price ? item.return_quantity * item.unit_price : null),
          location_uuid: item.location_uuid || null,
        }));
        // Update form with return items
        updateFormField("return_items", returnItems.value);
        // Clear validation error since items are pre-populated
        receiptNotesValidationError.value = null;
      } else {
        // No return_items provided, check receipt notes to calculate shortfall
        await checkReceiptNotesAndCalculateShortfall(
          sourceUuid,
          sourceType as 'purchase_order' | 'change_order',
          transformed
        );
      }
    } else {
      // When editing, fetch return note items from the return_note_items table
      let returnNoteItemsMap = new Map<string, any>();
      let returnNoteItems: any[] = [];
      let currentReturnType: string = returnType.value;
      let currentPoUuid: string | null = null;
      let currentCoUuid: string | null = null;
      
      if (props.form.uuid) {
        try {
          const corpUuid = corpStore.selectedCorporation?.uuid;
          const projectUuid = props.form.project_uuid;
          
          if (!corpUuid) {
          } else {
            
            const returnNoteItemsResponse: any = await $fetch("/api/return-note-items", {
              method: "GET",
              query: {
                corporation_uuid: corpUuid,
                project_uuid: projectUuid || undefined,
                return_note_uuid: props.form.uuid,
                item_type: returnType.value, // Filter by return type for better performance and correctness
              },
            });
            
            
            returnNoteItems = Array.isArray(returnNoteItemsResponse?.data) 
              ? returnNoteItemsResponse.data 
              : [];
            
            // Set return type and UUIDs early so they can be used in the query below
            currentReturnType = returnType.value;
            currentPoUuid = currentReturnType === 'purchase_order' 
              ? (props.form.purchase_order_uuid || sourceUuid)
              : null;
            currentCoUuid = currentReturnType === 'change_order'
              ? (props.form.change_order_uuid || sourceUuid)
              : null;
            
            
            let skippedCount = 0;
            returnNoteItems.forEach((rni: any) => {
              // Only process return note items that match the current return type
              const rniItemType = rni.item_type || rni.return_type || currentReturnType;
              if (rniItemType !== currentReturnType) {
                skippedCount++;
                return;
              }
              
              // For purchase orders, ensure the return note item belongs to the current purchase order
              if (currentReturnType === 'purchase_order' && currentPoUuid) {
                if (rni.purchase_order_uuid !== currentPoUuid) {
                  skippedCount++;
                  return;
                }
              }
              
              // For change orders, ensure the return note item belongs to the current change order
              if (currentReturnType === 'change_order' && currentCoUuid) {
                if (rni.change_order_uuid !== currentCoUuid) {
                  skippedCount++;
                  return;
                }
              }
              
              // Map by item_uuid (the primary matching field)
              if (rni.item_uuid) {
                const itemUuidKey = String(rni.item_uuid).trim().toLowerCase();
                returnNoteItemsMap.set(itemUuidKey, rni);
              } else {
              }
            });
            
          }
        } catch (error: any) {
          console.error("[ReturnNoteForm] Failed to fetch return note items:", error);
          // Continue with fallback to props.form.return_items if available
        }
      }
      
      // Create an array of return note items in order for position-based matching fallback
      const returnNoteItemsArray: any[] = [];
      returnNoteItems.forEach((rni: any) => {
        // Only include items that passed all filters (are in the map)
        const rniItemType = rni.item_type || rni.return_type || currentReturnType;
        if (rniItemType === currentReturnType) {
          if (currentReturnType === 'purchase_order' && currentPoUuid) {
            if (rni.purchase_order_uuid === currentPoUuid && returnNoteItemsMap.has(String(rni.item_uuid).trim().toLowerCase())) {
              returnNoteItemsArray.push(rni);
            }
          } else if (currentReturnType === 'change_order' && currentCoUuid) {
            if (rni.change_order_uuid === currentCoUuid && returnNoteItemsMap.has(String(rni.item_uuid).trim().toLowerCase())) {
              returnNoteItemsArray.push(rni);
            }
          }
        }
      });
      
      
      // Merge return note items with transformed PO/CO items
      returnItems.value = transformed.map((item, index) => {
        const itemUuid = item.uuid || item.base_item_uuid || item.id;
        const currentReturnType = returnType.value;
        
        
        // Try multiple matching strategies
        let returnNoteItem = null;
        let matchedBy = null;
        
        // Strategy 1: Try matching by item.uuid (primary key)
        if (item.uuid) {
          const itemUuidKey = String(item.uuid).trim().toLowerCase();
          returnNoteItem = returnNoteItemsMap.get(itemUuidKey);
          if (returnNoteItem) {
            matchedBy = 'item.uuid';
          }
        }
        
        // Strategy 2: If no match, try matching by base_item_uuid
        if (!returnNoteItem && item.base_item_uuid && item.base_item_uuid !== item.uuid) {
          const baseItemUuidKey = String(item.base_item_uuid).trim().toLowerCase();
          returnNoteItem = returnNoteItemsMap.get(baseItemUuidKey);
          if (returnNoteItem) {
            matchedBy = 'base_item_uuid';
          }
        }
        
        // Strategy 3: Fallback - try matching by item.item_uuid
        if (!returnNoteItem && item.item_uuid) {
          const itemRefUuidKey = String(item.item_uuid).trim().toLowerCase();
          returnNoteItem = returnNoteItemsMap.get(itemRefUuidKey);
          if (returnNoteItem) {
            matchedBy = 'item.item_uuid';
          }
        }
        
        // Strategy 4: Fallback to position-based matching when UUIDs don't match
        if (!returnNoteItem && returnNoteItemsArray.length > 0) {
          // If we have the same number of return note items as PO items, match by position
          if (returnNoteItemsArray.length === transformed.length && index < returnNoteItemsArray.length) {
            returnNoteItem = returnNoteItemsArray[index];
            matchedBy = 'position (same count)';
          } 
          // If we have more return note items, still try position-based matching
          else if (returnNoteItemsArray.length > transformed.length && index < returnNoteItemsArray.length) {
            returnNoteItem = returnNoteItemsArray[index];
            matchedBy = 'position (more return items)';
          }
          // If we have fewer return note items, only match if within bounds
          else if (index < returnNoteItemsArray.length) {
            returnNoteItem = returnNoteItemsArray[index];
            matchedBy = 'position (fewer return items)';
          }
        }
        
        if (returnNoteItem) {
          // Use data from return_note_items table
          const returnQty = returnNoteItem.return_quantity !== null && returnNoteItem.return_quantity !== undefined 
            ? returnNoteItem.return_quantity 
            : null;
          
          
          return {
            ...item,
            cost_code_uuid: returnNoteItem.cost_code_uuid ?? item.cost_code_uuid,
            cost_code_label: returnNoteItem.cost_code_label ?? item.cost_code_label,
            cost_code_number: returnNoteItem.cost_code_number ?? item.cost_code_number,
            cost_code_name: returnNoteItem.cost_code_name ?? item.cost_code_name,
            return_quantity: returnQty,
            return_total: returnNoteItem.return_total ?? null,
          };
        }
        
        // Fallback: If no return note item found, check props.form.return_items (for backward compatibility)
        if (props.form.return_items && Array.isArray(props.form.return_items)) {
          const existing = props.form.return_items.find(
            (ri: any) => (ri.uuid || ri.base_item_uuid) === itemUuid
          );
          if (existing) {
            return {
              ...item,
              cost_code_uuid: existing.cost_code_uuid ?? item.cost_code_uuid,
              cost_code_label: existing.cost_code_label ?? item.cost_code_label,
              cost_code_number: existing.cost_code_number ?? item.cost_code_number,
              cost_code_name: existing.cost_code_name ?? item.cost_code_name,
              return_quantity: existing.return_quantity ?? item.return_quantity,
              return_total: existing.return_total ?? item.return_total,
            };
          }
        }
        
        
        return item;
      });
      
      // Update form with return items after merging (for editing mode)
      updateFormField("return_items", returnItems.value);
    }
  } catch (error: any) {
    console.error("[ReturnNoteForm] Failed to fetch PO/CO items:", error);
    poItemsError.value = error?.message || "Failed to load purchase order items";
    poItems.value = [];
    returnItems.value = [];
  } finally {
    poItemsLoading.value = false;
  }
};

// Handle cost code change
const handleCostCodeChange = (payload: { index: number; value: string | null; option?: any }) => {
  const { index, value, option } = payload;
  const item = returnItems.value[index];
  if (!item) return;

  // Update the item
  returnItems.value[index] = {
    ...item,
    cost_code_uuid: value,
    cost_code_label: option?.label || 
      (option?.cost_code_number && option?.cost_code_name
        ? `${option.cost_code_number} ${option.cost_code_name}`.trim()
        : null),
    cost_code_number: option?.cost_code_number || null,
    cost_code_name: option?.cost_code_name || null,
  };

  // Update form with return items for saving
  updateFormField("return_items", returnItems.value);
};

// Handle return quantity change
const handleReturnQuantityChange = (payload: {
  index: number;
  value: string | number | null | undefined;
  numericValue: number;
  computedTotal: number;
}) => {
  const { index, numericValue, computedTotal } = payload;
  const item = returnItems.value[index];
  if (!item) {
    return;
  }


  // Update the item - IMPORTANT: preserve uuid and base_item_uuid
  returnItems.value[index] = {
    ...item,
    return_quantity: numericValue,
    return_total: computedTotal,
    // Explicitly preserve UUID fields to ensure they're not lost
    uuid: item.uuid,
    base_item_uuid: item.base_item_uuid,
  };


  // Update form with return items for saving
  updateFormField("return_items", returnItems.value);
  
  // Update total return amount
  const totalReturnAmount = returnItems.value.reduce((sum, item) => {
    return sum + (parseNumericInput(item.return_total) || 0);
  }, 0);
  updateFormField("total_return_amount", roundCurrencyValue(totalReturnAmount));
};

// Helper function to clone return item
const cloneReturnItem = (item: any): any => {
  return JSON.parse(JSON.stringify(item));
};

// Helper function to build match key for return items
const buildReturnItemMatchKey = (item: any): string | null => {
  if (!item) return null;
  const parts = [
    item.base_item_uuid || item.uuid || item.item_uuid,
    item.cost_code_uuid,
    item.item_type_uuid,
    item.item_uuid,
  ].filter(Boolean);
  return parts.length > 0 ? parts.map(String).join('|').toLowerCase() : null;
};

// Helper function to normalize match value
const normalizeMatchValue = (value: any): string | null => {
  if (!value) return null;
  return String(value).trim().toLowerCase();
};

// Removed return items functionality
// Use a ref that we manage directly - don't sync with form to avoid race conditions
const removedReturnItemsRef = ref<any[]>([])
let isUpdatingRemovedItems = false // Flag to prevent watcher from overwriting our updates

// Initialize from form on mount
onMounted(() => {
  const formRemoved = (props.form as any)?.removed_return_items
  if (Array.isArray(formRemoved) && formRemoved.length > 0) {
    removedReturnItemsRef.value = [...formRemoved]
  }
})

// Watch form changes only when we're not updating ourselves (e.g., when loading existing data)
watch(
  () => (props.form as any)?.removed_return_items,
  (newRemovedItems) => {
    // Skip if we're in the middle of updating
    if (isUpdatingRemovedItems) {
      return
    }
    const newArray = Array.isArray(newRemovedItems) ? newRemovedItems : []
    removedReturnItemsRef.value = [...newArray]
  },
  { deep: true }
)

const removedReturnItems = computed(() => removedReturnItemsRef.value)
const hasRemovedReturnItems = computed(() => removedReturnItems.value.length > 0)

// Handle removed return items update from child
const handleRemovedReturnItemsUpdate = (value: any[]) => {
  updateFormField("removed_return_items", value);
};

// Handle restore item from child
const handleRestoreItem = (item: any) => {
  // Sanitize the restored item (remove removed_at)
  const sanitized = cloneReturnItem(item);
  delete sanitized.removed_at;
  
  // Add back to returnItems
  const currentItems = Array.isArray(returnItems.value)
    ? [...returnItems.value]
    : [];
  currentItems.push(sanitized);
  returnItems.value = currentItems;
  
  // Remove from removed items ref
  const updatedRemoved = removedReturnItemsRef.value.filter(
    (removedItem) => removedItem.base_item_uuid !== item.base_item_uuid
  );
  removedReturnItemsRef.value = [...updatedRemoved];
  
  // Update form with return items and removed items
  updateFormField("return_items", currentItems);
  updateFormField("removed_return_items", updatedRemoved);
  
  // Recalculate total return amount
  const totalReturnAmount = currentItems.reduce((sum, item) => {
    return sum + (parseNumericInput(item.return_total) || 0);
  }, 0);
  updateFormField("total_return_amount", roundCurrencyValue(totalReturnAmount));
};

// Handle restore all items from child
const handleRestoreAllItems = () => {
  const currentRemoved = [...removedReturnItemsRef.value];
  if (!currentRemoved.length) return;
  
  // Sanitize all restored items
  const sanitized = currentRemoved.map((item: any) => {
    const cloned = cloneReturnItem(item);
    delete cloned.removed_at;
    return cloned;
  });
  
  // Add all back to returnItems
  const currentItems = Array.isArray(returnItems.value)
    ? [...returnItems.value]
    : [];
  currentItems.push(...sanitized);
  returnItems.value = currentItems;
  
  // Clear removed items ref
  removedReturnItemsRef.value = [];
  
  // Update both removed_return_items and return_items
  updateFormField("removed_return_items", []);
  updateFormField("return_items", currentItems);
  
  // Recalculate total return amount
  const totalReturnAmount = currentItems.reduce((sum, item) => {
    return sum + (parseNumericInput(item.return_total) || 0);
  }, 0);
  updateFormField("total_return_amount", roundCurrencyValue(totalReturnAmount));
};

// Handle removing a return item
const handleRemoveReturnItem = (index: number) => {
  if (index < 0 || index >= returnItems.value.length) return;
  
  const itemToRemove = returnItems.value[index];
  if (!itemToRemove) return;
  
  // Clone the item and add removed_at timestamp
  const cloned = cloneReturnItem(itemToRemove);
  cloned.removed_at = new Date().toISOString();
  
  // Get current removed items from the ref
  const currentRemoved = [...removedReturnItemsRef.value];
  currentRemoved.push(cloned);
  
  // Set flag to prevent watcher from overwriting
  isUpdatingRemovedItems = true
  
  // Update the ref immediately for reactivity
  removedReturnItemsRef.value = [...currentRemoved];
  
  // Remove from returnItems
  const updatedItems = returnItems.value.filter((_, i) => i !== index);
  returnItems.value = updatedItems;
  
  // Update form with both return_items and removed_return_items
  updateFormField("return_items", updatedItems);
  updateFormField("removed_return_items", currentRemoved);
  
  // Reset flag after a tick to allow external updates
  nextTick(() => {
    isUpdatingRemovedItems = false
  })
  
  // Recalculate total return amount
  const totalReturnAmount = updatedItems.reduce((sum, item) => {
    return sum + (parseNumericInput(item.return_total) || 0);
  }, 0);
  updateFormField("total_return_amount", roundCurrencyValue(totalReturnAmount));
};

// Handle adding a return item (no-op for now, but keeping for consistency)
const handleAddReturnItem = (index: number) => {
  // This is intentionally empty - we don't allow adding new items
  // Only removal and restoration are supported
};


// Expose validation state to parent
defineExpose({
  receiptNotesValidationError,
  hasValidationError: computed(() => !!receiptNotesValidationError.value),
});

// Watch for purchase order or change order changes
watch(
  [() => props.form.purchase_order_uuid, () => props.form.change_order_uuid, () => returnType.value],
  async ([poUuid, coUuid, currentReturnType], [oldPoUuid, oldCoUuid, oldReturnType]) => {
    // If return_items are already provided (e.g., from shortfall), don't fetch from PO/CO
    // This prevents overwriting pre-populated return_items
    if (!props.editingReturnNote && props.form.return_items && Array.isArray(props.form.return_items) && props.form.return_items.length > 0) {
      // Use the provided return_items
      returnItems.value = props.form.return_items.map((item: any) => ({
        ...item,
        // Ensure all required fields are present
        base_item_uuid: item.base_item_uuid || item.uuid || null,
        cost_code_uuid: item.cost_code_uuid || null,
        cost_code_number: item.cost_code_number || '',
        cost_code_name: item.cost_code_name || '',
        item_type_uuid: item.item_type_uuid || null,
        item_uuid: item.item_uuid || null,
        item_name: item.item_name || '',
        description: item.description || '',
        model_number: item.model_number || '',
        unit_uuid: item.unit_uuid || null,
        unit_label: item.unit_label || '',
        unit_price: item.unit_price || 0,
        return_quantity: item.return_quantity || null,
        return_total: item.return_total || (item.return_quantity && item.unit_price ? item.return_quantity * item.unit_price : null),
        location_uuid: item.location_uuid || null,
      }));
      updateFormField("return_items", returnItems.value);
      return;
    }

    // Determine which one changed and handle accordingly
    const isPoChange = poUuid !== oldPoUuid;
    const isCoChange = coUuid !== oldCoUuid;
    const isReturnTypeChange = currentReturnType !== oldReturnType;

    // If return type changed, clear items first
    if (isReturnTypeChange) {
      await fetchItems(null, null);
      // If we have a UUID for the new type, fetch items for it
      if (currentReturnType === 'purchase_order' && poUuid) {
        await fetchItems(poUuid, 'purchase_order');
      } else if (currentReturnType === 'change_order' && coUuid) {
        await fetchItems(coUuid, 'change_order');
      }
      return;
    }

    // If both changed, prioritize the current return type
    let sourceUuid = null;
    let sourceType = null;

    if (currentReturnType === 'purchase_order' && isPoChange) {
      sourceUuid = poUuid;
      sourceType = 'purchase_order';
    } else if (currentReturnType === 'change_order' && isCoChange) {
      sourceUuid = coUuid;
      sourceType = 'change_order';
    }

    // If clearing (setting to null/undefined), clear items and return early
    if (!sourceUuid || !sourceType) {
      // Only clear if we had a previous value
      if ((oldPoUuid !== undefined && oldPoUuid !== null) || (oldCoUuid !== undefined && oldCoUuid !== null)) {
        await fetchItems(null, null);
      }
      return;
    }

    // Fetch items for the selected source
    await fetchItems(sourceUuid, sourceType);
  },
  { immediate: true }
);
</script>

