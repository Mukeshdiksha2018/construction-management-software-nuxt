<template>
  <div>
    <!-- Status Stat Cards with Add New Button -->
    <div v-if="isReady && !loading" class="flex items-center gap-4 mb-4">
      <div class="flex flex-row flex-1 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
      <!-- Summary Section (Highlighted) -->
      <div
        @click="clearStatusFilter()"
        :class="[
          'flex-1 px-4 py-2 cursor-pointer transition-colors flex items-center justify-center',
          selectedStatusFilter === null 
            ? 'bg-amber-50 dark:bg-amber-900/20' 
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        ]"
      >
        <div class="flex flex-col items-center text-center">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            Summary ({{ allStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(allStats.totalValue) }}
          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div class="w-px bg-gray-200 dark:bg-gray-700"></div>
      
      <!-- Shipment Section -->
      <div
        @click="toggleStatusFilter('Shipment')"
        :class="[
          'flex-1 px-4 py-2 cursor-pointer transition-colors flex items-center justify-center',
          selectedStatusFilter === 'Shipment'
            ? 'bg-gray-100 dark:bg-gray-700'
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        ]"
      >
        <div class="flex flex-col items-center text-center">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            Shipment ({{ shipmentStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(shipmentStats.totalValue) }}
          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div class="w-px bg-gray-200 dark:bg-gray-700"></div>
      
      <!-- Received Section -->
      <div
        @click="toggleStatusFilter('Received')"
        :class="[
          'flex-1 px-4 py-2 cursor-pointer transition-colors flex items-center justify-center',
          selectedStatusFilter === 'Received'
            ? 'bg-gray-100 dark:bg-gray-700'
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        ]"
      >
        <div class="flex flex-col items-center text-center">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            Received ({{ receivedStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(receivedStats.totalValue) }}
          </div>
        </div>
      </div>
      </div>
      
      <!-- Add New Button -->
      <UButton
        v-if="hasPermission('po_create')"
        icon="i-heroicons-plus"
        color="primary"
        size="xs"
        @click="openCreateModal"
      >
        Add new Receipt Note
      </UButton>
    </div>

    <div v-if="loading" class="space-y-2">
      <div class="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-9 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
            <USkeleton v-for="n in 9" :key="`header-${n}`" class="h-4 w-20" />
          </div>
        </div>
        <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="i in 6" :key="`row-${i}`" class="grid grid-cols-9 gap-4 px-2 py-2">
            <USkeleton v-for="n in 9" :key="`row-${i}-${n}`" class="h-4 w-full" />
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
        description="Please try refreshing the page or contact support if the issue persists."
      />
    </div>

    <div
      v-else-if="hasPermission('po_view') && filteredReceiptNotes.length && isReady"
    >
      <UTable
        ref="table"
        sticky
        v-model:pagination="pagination"
        v-model:column-pinning="columnPinning"
        :pagination-options="paginationOptions"
        :data="filteredReceiptNotes"
        :columns="columns"
        class="max-h-[70vh] overflow-auto"
      />

      <div
        v-if="shouldShowPagination(filteredReceiptNotes.length).value"
        class="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4"
      >
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Show:</span>
          <USelect
            v-model="pagination.pageSize"
            :items="pageSizeOptions"
            icon="i-heroicons-list-bullet"
            size="sm"
            variant="outline"
            class="w-32"
            @change="handlePageSizeChange"
          />
        </div>
        <UPagination v-bind="getPaginationProps(table)" />
        <div class="text-sm text-gray-600">
          {{ getPageInfo(table, 'receipt notes').value }}
        </div>
      </div>
    </div>

    <div
      v-else-if="!hasPermission('po_view') && isReady"
      class="text-center py-12"
    >
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-lock-closed" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg">Access Denied</p>
      <p class="text-gray-400 text-sm">
        You don't have permission to view receipt notes
      </p>
    </div>

    <div v-else-if="isReady" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-document" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg">No receipt notes found</p>
      <p class="text-gray-400 text-sm mb-6">
        Click add new to create your first receipt note
      </p>
      <UButton
        v-if="hasPermission('po_create')"
        icon="i-heroicons-plus"
        @click="openCreateModal"
      >
        Add Receipt Note
      </UButton>
    </div>

    <UModal v-model:open="showDeleteModal" title="Delete Receipt Note">
      <template #body>
        <div class="p-6 space-y-4">
          <div class="flex items-center gap-3">
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="w-8 h-8 text-red-500"
            />
            <div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                Delete Receipt Note
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <div v-if="receiptNoteToDelete" class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <p class="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <span class="block">
                <strong>GRN Number:</strong>
                {{ receiptNoteToDelete.grn_number }}
              </span>
              <span class="block">
                <strong>Entry Date:</strong>
                {{ formatDate(receiptNoteToDelete.entry_date) }}
              </span>
              <span class="block">
                <strong>Status:</strong>
                {{ receiptNoteToDelete.status }}
              </span>
              <span class="block">
                <strong>Total Received:</strong>
                {{ formatCurrency(receiptNoteToDelete.total_received_amount || 0) }}
              </span>
            </p>
          </div>
          <p class="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this receipt note? The associated
            data will be removed.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="soft" @click="cancelDelete">
            Cancel
          </UButton>
          <UButton color="error" @click="confirmDelete">
            Delete Receipt Note
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="showFormModal"
      :title="formModalTitle"
      fullscreen
      scrollable
      :ui="receiptNoteModalUi"
    >
      <template #header>
        <div class="flex items-center justify-between w-full gap-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ formModalTitle }}
          </h3>

          <div class="flex items-center gap-2 flex-1 justify-end">
            <div class="flex items-center gap-2">
              <UButton
                v-if="isViewMode && canEdit"
                type="button"
                color="primary"
                icon="tdesign:edit-filled"
                size="sm"
                @click="switchToEditMode"
              >
                Edit Receipt Note
              </UButton>
              
              <UButton
                v-if="!isViewMode && canEdit"
                type="button"
                color="primary"
                size="sm"
                :loading="savingReceiptNote"
                :disabled="savingReceiptNote || hasFormValidationError"
                @click="saveReceiptNote"
              >
                {{ receiptNoteForm?.uuid ? "Update" : "Save" }}
              </UButton>
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
        <ReceiptNoteForm
          ref="receiptNoteFormRef"
          v-if="showFormModal"
          v-model:form="receiptNoteForm"
          :editing-receipt-note="Boolean(receiptNoteForm?.uuid)"
          :readonly="isViewMode"
        />
      </template>
    </UModal>

    <!-- Shortfall Quantity Confirmation Modal -->
    <UModal v-model:open="showShortfallModal" title="Items with Shortfall Quantities">
      <template #header>
        <div class="flex items-center justify-between w-full gap-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Items with Shortfall Quantities
          </h3>
          <UTooltip text="Close Modal" color="neutral">
            <UButton
              color="neutral"
              variant="solid"
              icon="i-heroicons-x-mark"
              size="sm"
              @click="closeShortfallModal"
            />
          </UTooltip>
        </div>
      </template>
      <template #body>
        <div class="p-6">
          <div class="flex items-center mb-4">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-warning-500 mr-3" />
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Some items have received quantities that are less than the ordered quantities.
            </p>
          </div>

          <div v-if="shortfallItemsForModal.length" class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
            <div class="space-y-2">
              <div
                v-for="(item, index) in shortfallItemsForModal"
                :key="index"
                class="text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0"
              >
                <div class="font-medium">{{ item.item_name || item.description || `Item ${index + 1}` }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Ordered Qty: {{ item.ordered_quantity }} | Received Qty: {{ item.received_quantity }} | 
                  Shortfall: <span class="font-semibold text-warning-600">{{ item.shortfall_quantity }}</span>
                </div>
              </div>
            </div>
          </div>

          <p class="text-gray-600 dark:text-gray-400 mb-4">
            Would you like to:
          </p>
          <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-1">
            <li><strong>Save as Open PO</strong> - Save the receipt note as is with shortfall quantities</li>
            <li><strong>Raise a Return Note</strong> - Create a return note for the shortfall quantities</li>
          </ul>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="warning" variant="solid" @click="handleSaveAsOpenPO">
            Save as Open PO
          </UButton>
          <UButton color="primary" variant="solid" @click="handleRaiseReturnNote">
            Raise Return Note
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Return Note Form Modal (for shortfall quantities) -->
    <UModal
      v-model:open="showReturnNoteModal"
      title="Create Return Note for Shortfall Quantities"
      fullscreen
      scrollable
    >
      <template #header>
        <div class="flex items-center justify-between w-full gap-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Create Return Note for Shortfall Quantities
          </h3>
          <UTooltip text="Close Modal" color="neutral">
            <UButton
              color="neutral"
              variant="solid"
              icon="i-heroicons-x-mark"
              size="sm"
              @click="closeReturnNoteModal"
            />
          </UTooltip>
        </div>
      </template>
      <template #body>
        <ReturnNoteForm
          v-if="showReturnNoteModal && returnNoteFormData"
          ref="returnNoteFormRef"
          v-model:form="returnNoteFormData"
          :editing-return-note="false"
          :readonly="false"
        />
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="soft"
            @click="closeReturnNoteModal"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            variant="solid"
            :loading="savingReturnNote"
            :disabled="savingReturnNote || hasReturnNoteFormValidationError"
            @click="saveReturnNoteFromShortfall"
          >
            Save Return Note
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  h,
  watch,
  onMounted,
  useTemplateRef,
  resolveComponent,
  nextTick,
} from "vue";
import ReceiptNoteForm from "@/components/PurchaseOrders/ReceiptNoteForm.vue";
import ReturnNoteForm from "@/components/PurchaseOrders/ReturnNoteForm.vue";
import { useCorporationStore } from "@/stores/corporations";
import { useStockReceiptNotesStore } from "@/stores/stockReceiptNotes";
import { useStockReturnNotesStore } from "@/stores/stockReturnNotes";
import { usePurchaseOrdersStore } from "@/stores/purchaseOrders";
import { usePurchaseOrderResourcesStore } from "@/stores/purchaseOrderResources";
import { useChangeOrdersStore } from "@/stores/changeOrders";
import { useProjectsStore } from "@/stores/projects";
import { useVendorStore } from "@/stores/vendors";
import { useUserProfilesStore } from "@/stores/userProfiles";
import { usePermissions } from "@/composables/usePermissions";
import { useDateFormat } from "@/composables/useDateFormat";
import { useCurrencyFormat } from "@/composables/useCurrencyFormat";
import { useUTCDateFormat } from "@/composables/useUTCDateFormat";
import { useTableStandard } from "@/composables/useTableStandard";
import type { TableColumn } from "@nuxt/ui";

const UButton = resolveComponent("UButton");
const UTooltip = resolveComponent("UTooltip");
const UBadge = resolveComponent("UBadge");
const UAvatar = resolveComponent("UAvatar");

const corporationStore = useCorporationStore();

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
const stockReceiptNotesStore = useStockReceiptNotesStore();
const stockReturnNotesStore = useStockReturnNotesStore();
const purchaseOrdersStore = usePurchaseOrdersStore();
const purchaseOrderResourcesStore = usePurchaseOrderResourcesStore();
const changeOrdersStore = useChangeOrdersStore();
const projectsStore = useProjectsStore();
const vendorStore = useVendorStore();
const userProfilesStore = useUserProfilesStore();
const { hasPermission, isReady } = usePermissions();
const { formatDate } = useDateFormat();
const { formatCurrency, formatCurrencyAbbreviated } = useCurrencyFormat();
const { toUTCString, getCurrentLocal } = useUTCDateFormat();

const {
  pagination,
  paginationOptions,
  pageSizeOptions,
  updatePageSize,
  getPaginationProps,
  getPageInfo,
  shouldShowPagination,
} = useTableStandard();

const table = useTemplateRef<any>("table");

// Column pinning for sticky actions column
const columnPinning = ref({
  left: [],
  right: ['actions']
});

const globalFilter = ref("");
const selectedStatusFilter = ref<string | null>(null);
const showDeleteModal = ref(false);
const receiptNoteToDelete = ref<any>(null);
const showFormModal = ref(false);
const receiptNoteForm = ref<any>({});
const savingReceiptNote = ref(false);
const loadingEdit = ref(false);
const isViewMode = ref(false);
const showReturnNoteModal = ref(false);
const returnNoteFormData = ref<any>(null);
const returnNoteFormRef = ref<any>(null);
const savingReturnNote = ref(false);

// Ref to track validation state for return note form - updated via watch to ensure reactivity
const hasReturnNoteFormValidationError = ref(false);

// Watch the return note form ref's validation state to update the button disabled state
watch(
  () => returnNoteFormRef.value?.hasValidationError,
  (hasError) => {
    hasReturnNoteFormValidationError.value = hasError ?? false;
  },
  { immediate: true }
);

// Also watch for changes in the return note form ref itself
watch(
  () => returnNoteFormRef.value,
  (formRef) => {
    if (formRef) {
      hasReturnNoteFormValidationError.value = formRef.hasValidationError ?? false;
    } else {
      hasReturnNoteFormValidationError.value = false;
    }
  },
  { immediate: true }
);
const shortfallItemsForReturn = ref<any[]>([]);
const pendingReceiptNoteSave = ref<(() => Promise<void>) | null>(null);
const showShortfallModal = ref(false);
const shortfallItemsForModal = ref<any[]>([]);
const receiptNoteFormRef = ref<any>(null);

// Ref to track validation state - updated via watch to ensure reactivity
const hasFormValidationError = ref(false);

// Watch the form ref's validation state to update the button disabled state
watch(
  () => receiptNoteFormRef.value?.hasValidationError,
  (hasError) => {
    hasFormValidationError.value = hasError ?? false;
  },
  { immediate: true }
);

// Also watch for changes in the form ref itself
watch(
  () => receiptNoteFormRef.value,
  (formRef) => {
    if (formRef) {
      hasFormValidationError.value = formRef.hasValidationError ?? false;
    } else {
      hasFormValidationError.value = false;
    }
  },
  { immediate: true }
);

const selectedCorporationId = computed(
  () => corporationStore.selectedCorporationId
);

const receiptNotes = computed(() =>
  stockReceiptNotesStore.stockReceiptNotes.filter(
    (note) => note.corporation_uuid === selectedCorporationId.value
  )
);

const loading = computed(() => stockReceiptNotesStore.loading);
// Only show error alert for fetch errors, not delete operation errors
// Delete errors are handled via toast notifications
const error = computed(() => {
  const storeError = stockReceiptNotesStore.error
  // Don't show error alert for delete-related errors (they're handled via toast)
  if (storeError && (storeError.includes('delete') || storeError.includes('Cannot delete'))) {
    return null
  }
  return storeError
});
const canEdit = computed(
  () => hasPermission("po_edit") || hasPermission("po_create")
);
const formModalTitle = computed(() =>
  receiptNoteForm.value?.uuid ? "Edit Stock Receipt Note" : "New Stock Receipt Note"
);
const receiptNoteModalUi = {
  body: "sm:p-3 p-2",
  header: "px-2 py-2 sm:px-3 sm:py-2",
  footer: "px-2 py-2 sm:px-3 sm:py-3"
};

const cardUi = {
  primary: {
    container:
      "p-2 sm:p-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 rounded-lg",
    wrapper: "w-full",
    body: "flex flex-row items-center justify-between w-full min-w-0",
  },
  neutral: {
    container:
      "p-2 sm:p-3 bg-gray-50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800 rounded-lg",
    wrapper: "w-full",
    body: "flex flex-row items-center justify-between w-full min-w-0",
  },
  warning: {
    container:
      "p-2 sm:p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg",
    wrapper: "w-full",
    body: "flex flex-row items-center justify-between w-full min-w-0",
  },
  success: {
    container:
      "p-2 sm:p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg",
    wrapper: "w-full",
    body: "flex flex-row items-center justify-between w-full min-w-0",
  },
  info: {
    container:
      "p-2 sm:p-3 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 rounded-lg",
    wrapper: "w-full",
    body: "flex flex-row items-center justify-between w-full min-w-0",
  },
  error: {
    container:
      "p-2 sm:p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-lg",
    wrapper: "w-full",
    body: "flex flex-row items-center justify-between w-full min-w-0",
  },
};

const projectLookup = computed(() => {
  const map = new Map<string, string>();
  const list = projectsStore.projects ?? [];
  list.forEach((project: any) => {
    if (project?.uuid) {
      map.set(project.uuid, project.project_name || project.project_id || "");
    }
  });
  return map;
});

const purchaseOrderLookup = computed(() => {
  const map = new Map<
    string,
    { poNumber: string; total: number; projectUuid?: string | null; vendorUuid?: string | null }
  >();
  const list = purchaseOrdersStore.purchaseOrders ?? [];
  list.forEach((po: any) => {
    if (po?.uuid) {
      map.set(po.uuid, {
        poNumber: po.po_number || "Unnamed PO",
        total: Number(po.total_po_amount) || 0,
        projectUuid: po.project_uuid,
        vendorUuid: po.vendor_uuid || null,
      });
    }
  });
  return map;
});

const changeOrderLookup = computed(() => {
  const map = new Map<
    string,
    { coNumber: string; total: number; projectUuid?: string | null; vendorUuid?: string | null }
  >();
  const list = changeOrdersStore.changeOrders ?? [];
  list.forEach((co: any) => {
    if (co?.uuid) {
      map.set(co.uuid, {
        coNumber: co.co_number || "Unnamed CO",
        total: Number(co.total_co_amount) || 0,
        projectUuid: co.project_uuid,
        vendorUuid: co.vendor_uuid || null,
      });
    }
  });
  return map;
});

const vendorLookup = computed(() => {
  const map = new Map<string, string>();
  const list = vendorStore.vendors ?? [];
  list.forEach((vendor: any) => {
    if (vendor?.uuid) {
      map.set(vendor.uuid, vendor.vendor_name || vendor.uuid);
    }
  });
  return map;
});

const userLookup = computed(() => {
  const map = new Map<string, { name: string; imageUrl?: string }>();
  const list = userProfilesStore.users ?? [];
  list.forEach((user: any) => {
    if (user?.id) {
      const firstName = user.firstName || "";
      const lastName = user.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim() || user.email?.split("@")[0] || "Unknown User";
      map.set(user.id, {
        name: fullName,
        imageUrl: user.imageUrl || undefined,
      });
    }
  });
  return map;
});

const allStats = computed(() => ({
  count: receiptNotes.value.length,
  totalValue: receiptNotes.value.reduce(
    (sum, note) => sum + (Number(note.total_received_amount) || 0),
    0
  ),
}));

const shipmentStats = computed(() => {
  const shipment = receiptNotes.value.filter(
    (note) => (note.status || "Shipment") === "Shipment"
  );
  return {
    count: shipment.length,
    totalValue: shipment.reduce(
      (sum, note) => sum + (Number(note.total_received_amount) || 0),
      0
    ),
  };
});

const receivedStats = computed(() => {
  const received = receiptNotes.value.filter((note) => note.status === "Received");
  return {
    count: received.length,
    totalValue: received.reduce(
      (sum, note) => sum + (Number(note.total_received_amount) || 0),
      0
    ),
  };
});

const filteredReceiptNotes = computed(() => {
  let list = [...receiptNotes.value];

  if (selectedStatusFilter.value) {
    list = list.filter(
      (note) => (note.status || "Shipment") === selectedStatusFilter.value
    );
  }

  const filter = globalFilter.value.trim().toLowerCase();
  if (filter) {
    list = list.filter((note) => {
      const receiptType = note.receipt_type || 'purchase_order';
      let orderNumber = "";
      if (receiptType === 'change_order') {
        orderNumber =
          changeOrderLookup.value.get(note.purchase_order_uuid || "")?.coNumber ||
          "";
      } else {
        orderNumber =
          purchaseOrderLookup.value.get(note.purchase_order_uuid || "")?.poNumber ||
          "";
      }
      const projectName =
        projectLookup.value.get(note.project_uuid || "") || "";
      return (
        note.grn_number?.toLowerCase().includes(filter) ||
        orderNumber.toLowerCase().includes(filter) ||
        projectName.toLowerCase().includes(filter) ||
        note.status?.toLowerCase().includes(filter)
      );
    });
  }

  return list;
});

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'corporation_uuid',
    header: 'Corporation',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const uuid = row.original.corporation_uuid
      const label = uuid ? (corporationNameByUuid.value[uuid] || uuid) : 'N/A'
      return h('div', label)
    }
  },
  {
    accessorKey: "project_uuid",
    header: "Project",
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => {
      const name =
        projectLookup.value.get(row.original.project_uuid || "") || "N/A";
      return h("div", name);
    },
  },
  {
    accessorKey: "grn_number",
    header: "GRN Number",
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) =>
      h(
        "div",
        { class: "font-medium text-default" },
        row.original.grn_number || "N/A"
      ),
  },
  {
    accessorKey: "vendor",
    header: "Vendor",
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => {
      const receiptType = row.original.receipt_type || 'purchase_order';
      let vendorUuid: string | null = null;
      
      if (receiptType === 'change_order') {
        const co = changeOrderLookup.value.get(row.original.purchase_order_uuid || "");
        vendorUuid = co?.vendorUuid || null;
      } else {
        const po = purchaseOrderLookup.value.get(row.original.purchase_order_uuid || "");
        vendorUuid = po?.vendorUuid || null;
      }
      
      const vendorName = vendorUuid ? (vendorLookup.value.get(vendorUuid) || "N/A") : "N/A";
      return h("div", vendorName);
    },
  },
  {
    accessorKey: "entry_date",
    header: "Entry date",
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) =>
      h("div", formatDate(row.original.entry_date || new Date().toISOString())),
  },
  {
    accessorKey: "received_by",
    header: "Received by",
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => {
      const userId = row.original.received_by;
      if (!userId) {
        return h("div", { class: "text-muted" }, "N/A");
      }
      
      const user = userLookup.value.get(userId);
      if (!user) {
        return h("div", { class: "text-muted" }, "Unknown");
      }
      
      return h("div", { class: "flex items-center gap-2" }, [
        h("div", { class: "w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden" },
          user.imageUrl && user.imageUrl.trim() !== ""
            ? h(UAvatar, {
                src: user.imageUrl,
                alt: user.name,
                size: "xs"
              })
            : h("svg", {
                class: "w-3 h-3 text-primary-600 dark:text-primary-400",
                fill: "none",
                viewBox: "0 0 24 24",
                stroke: "currentColor"
              }, [
                h("path", {
                  "stroke-linecap": "round",
                  "stroke-linejoin": "round",
                  "stroke-width": "2",
                  d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                })
              ])
        ),
        h("div", { class: "text-sm text-default" }, user.name)
      ]);
    },
  },
  {
    accessorKey: "total_received_amount",
    header: "Amount",
    enableSorting: false,
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => {
      const amount = row.original.total_received_amount || 0;
      return h(
        "div",
        { class: "text-right font-mono text-sm" },
        formatCurrency(amount)
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => {
      const status = row.original.status || "Shipment";
      const statusMap: Record<string, { label: string; color: string }> = {
        Shipment: {
          label: "Shipment",
          color: "warning"
        },
        Received: {
          label: "Received",
          color: "success"
        }
      };
      
      const config = statusMap[status] ?? {
        label: status,
        color: "neutral"
      };
      
      return h(UBadge, {
        color: config.color,
        variant: "soft",
        size: "sm"
      }, () => config.label);
    },
  },
  {
    id: "actions",
    header: "Action",
    enableSorting: false,
    meta: { class: { th: 'text-right sticky right-0 z-10 w-32', td: 'text-right sticky right-0 w-32' } },
    cell: ({ row }) => {
      const buttons = [];
      
      // View button - show if user has view permission
      if (hasPermission("po_view")) {
        buttons.push(
          h(
            UTooltip,
            { text: "View Receipt Note Details" },
            () =>
              h(
                UButton,
                {
                  icon: "i-heroicons-eye-solid",
                  size: "xs",
                  variant: "soft",
                  color: "neutral",
                  class: "hover:scale-105 transition-transform",
                  onClick: () => previewReceiptNote(row.original),
                },
                () => ""
              )
          )
        );
      }
      
      // Edit button - show if user has edit permission
      if (hasPermission("po_edit")) {
        buttons.push(
          h(
            UTooltip,
            { text: "Edit Receipt Note" },
            () =>
              h(
                UButton,
                {
                  icon: "tdesign:edit-filled",
                  size: "xs",
                  variant: "soft",
                  color: "secondary",
                  class: "hover:scale-105 transition-transform",
                  onClick: () => editReceiptNote(row.original),
                },
                () => ""
              )
          )
        );
      }
      
      // Delete button - show if user has delete permission
      if (hasPermission("po_delete")) {
        buttons.push(
          h(
            UTooltip,
            { text: "Delete Receipt Note" },
            () =>
              h(
                UButton,
                {
                  icon: "mingcute:delete-fill",
                  size: "xs",
                  variant: "soft",
                  color: "error",
                  class: "hover:scale-105 transition-transform",
                  onClick: () => deleteReceiptNote(row.original),
                },
                () => ""
              )
          )
        );
      }
      return h("div", { class: "flex justify-end space-x-2" }, buttons);
    },
  },
];

const createEmptyForm = () => ({
  uuid: null,
  corporation_uuid: corporationStore.selectedCorporationId,
  project_uuid: null,
  purchase_order_uuid: null,
  change_order_uuid: null,
  receipt_type: 'purchase_order' as 'purchase_order' | 'change_order',
  entry_date: toUTCString(getCurrentLocal()),
  grn_number: "",
  reference_number: "",
  received_by: "",
  location_uuid: null,
  notes: "",
  status: "Shipment",
  total_received_amount: null,
  attachments: [],
});

const ensureSupportingData = async (corporationUuid: string) => {
  await Promise.allSettled([
    purchaseOrdersStore.fetchPurchaseOrders(corporationUuid),
    changeOrdersStore.fetchChangeOrders(corporationUuid),
    projectsStore.fetchProjectsMetadata(corporationUuid).catch(() => {}),
    vendorStore.fetchVendors(corporationUuid).catch(() => {}),
    userProfilesStore.fetchUsers(false).catch(() => {}),
  ]);
};

// Receipt notes are fetched by TopBar.vue when corporation changes
// This component just reads from the store reactively
// Only fetch supporting data when needed (e.g., when opening a form)

const openCreateModal = async () => {
  // Clear resource store before opening new receipt note
  purchaseOrderResourcesStore.clear();

  if (!hasPermission("po_create")) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to create receipt notes.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }

  const corpUuid = corporationStore.selectedCorporationId;
  if (!corpUuid) {
    const toast = useToast();
    toast.add({
      title: "Select Corporation",
      description: "Please select a corporation before creating a receipt note.",
      color: "error",
    });
    return;
  }

  await ensureSupportingData(corpUuid);

  const grnNumber = stockReceiptNotesStore.generateNextGrnNumber(corpUuid);
  receiptNoteForm.value = {
    ...createEmptyForm(),
    corporation_uuid: corpUuid,
    grn_number: grnNumber,
  };

  showFormModal.value = true;
};

const loadReceiptNoteForModal = async (note: any, viewMode: boolean = false) => {
  // Clear resource store before loading receipt note
  purchaseOrderResourcesStore.clear();

  if (!note?.uuid) {
    return
  }

  isViewMode.value = viewMode
  loadingEdit.value = true;
  
  try {
    // Ensure supporting data is loaded (including change orders)
    const corpUuid = corporationStore.selectedCorporationId;
    if (corpUuid) {
      await ensureSupportingData(corpUuid);
    }
    
    const formData = { ...note };
    
    
    // Use receipt_type from database (defaults to 'purchase_order' if not set)
    const receiptType = formData.receipt_type || 'purchase_order';
    formData.receipt_type = receiptType;
    
    
    // Use the correct UUID column based on receipt_type
    // purchase_order_uuid and change_order_uuid are now separate columns
    if (receiptType === 'change_order') {
      // For change orders, use change_order_uuid from database
      // Support legacy data where it might still be in purchase_order_uuid
      if (!formData.change_order_uuid && formData.purchase_order_uuid) {
        formData.change_order_uuid = formData.purchase_order_uuid;
        formData.purchase_order_uuid = null;
      }
    } else {
      // For purchase orders, ensure change_order_uuid is null
      formData.change_order_uuid = null;
    }
    
    
    receiptNoteForm.value = formData;
    showFormModal.value = true;
  } catch (error) {
    console.error("[RNL] Failed to load receipt note details:", error);
    const toast = useToast();
    toast.add({
      title: "Error",
      description: "Failed to load receipt note details.",
      color: "error",
    });
  } finally {
    loadingEdit.value = false;
  }
};

const editReceiptNote = async (note: any) => {
  if (!hasPermission("po_edit")) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to edit receipt notes.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }

  await loadReceiptNoteForModal(note, false);
};

const previewReceiptNote = async (note: any) => {
  if (!hasPermission("po_view")) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to view receipt note details.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }
  
  await loadReceiptNoteForModal(note, true);
};

const switchToEditMode = () => {
  if (!hasPermission("po_edit")) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to edit receipt notes.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }
  isViewMode.value = false;
};

const closeFormModal = () => {
  showFormModal.value = false;
  isViewMode.value = false;
  // Form will be reset when modal opens next time via openCreateModal or editReceiptNote
};

// Check for existing return notes for shortfall items
const checkExistingReturnNotesForShortfall = async (
  shortfallItems: any[],
  receiptData: any
): Promise<any[]> => {
  if (!shortfallItems || shortfallItems.length === 0) {
    return shortfallItems;
  }

  const corpUuid = corporationStore.selectedCorporationId;
  if (!corpUuid) {
    return shortfallItems;
  }

  const returnType = receiptData.receipt_type || 'purchase_order';
  const sourceUuid = returnType === 'purchase_order' 
    ? receiptData.purchase_order_uuid 
    : receiptData.change_order_uuid;

  if (!sourceUuid) {
    return shortfallItems;
  }

  try {
    // Fetch existing return notes for this PO/CO
    await stockReturnNotesStore.fetchStockReturnNotes(corpUuid, { force: false });
    // Filter return notes for this corporation (getNotesForCorporation is not exported, so filter directly)
    const allReturnNotes = stockReturnNotesStore.stockReturnNotes.filter(
      (note: any) => note.corporation_uuid === corpUuid
    );
    
    // Filter return notes that match the source (PO/CO), return type, status, and are active
    // Only consider return notes in "Waiting" or "Returned" status (not cancelled/inactive)
    const matchingReturnNotes = allReturnNotes.filter((note: any) => {
      // Check if note is active (explicitly check for false, undefined/null means active)
      if (note.is_active === false) {
        return false;
      }

      // Check status - only consider "Waiting" or "Returned" status (case-insensitive)
      const status = String(note.status || '').trim();
      const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      if (normalizedStatus !== 'Waiting' && normalizedStatus !== 'Returned') {
        return false;
      }

      // Check if it matches the source (PO/CO) and return type
      if (returnType === 'purchase_order') {
        return note.purchase_order_uuid === sourceUuid && note.return_type === 'purchase_order';
      } else {
        return note.change_order_uuid === sourceUuid && note.return_type === 'change_order';
      }
    });

    if (matchingReturnNotes.length === 0) {
      return shortfallItems;
    }

    // Fetch return note items for all matching return notes
    const projectUuid = receiptData.project_uuid;
    const returnNoteUuids = matchingReturnNotes.map((note: any) => note.uuid);
    
    // Fetch return note items for all matching return notes
    const allReturnNoteItems: any[] = [];
    for (const returnNoteUuid of returnNoteUuids) {
      try {
        const response: any = await $fetch("/api/return-note-items", {
          method: "GET",
          query: {
            corporation_uuid: corpUuid,
            project_uuid: projectUuid || undefined,
            return_note_uuid: returnNoteUuid,
            item_type: returnType,
          },
        });
        
        const items = Array.isArray(response?.data) ? response.data : [];
        allReturnNoteItems.push(...items);
      } catch (error) {
        // Continue if one fails
        console.error(`[ReceiptNoteList] Failed to fetch return note items for ${returnNoteUuid}:`, error);
      }
    }

    // Create a map of returned quantities by item_uuid
    // Only consider active return note items (API should filter, but double-check)
    const returnedQuantitiesMap = new Map<string, number>();
    allReturnNoteItems.forEach((rni: any) => {
      // Skip inactive items (API should filter, but be safe)
      if (rni.is_active === false) {
        return;
      }

      const itemUuid = rni.item_uuid || rni.base_item_uuid;
      if (itemUuid) {
        const key = String(itemUuid).trim().toLowerCase();
        const existingQty = returnedQuantitiesMap.get(key) || 0;
        const returnQty = parseFloat(String(rni.return_quantity || 0)) || 0;
        returnedQuantitiesMap.set(key, existingQty + returnQty);
      }
    });

    // Filter out shortfall items that are already fully covered by return notes
    // Match by item.uuid (PO/CO item UUID) which is what return_note_items.item_uuid references
    // Also update the shortfall_quantity to reflect the remaining shortfall after returns
    const unmatchedShortfallItems = shortfallItems
      .map((item: any) => {
        // The item.uuid in shortfall items is the PO/CO item UUID (from purchase_order_items_list or change_order_items_list)
        // This is what return_note_items.item_uuid references
        const itemUuid = item.uuid || item.base_item_uuid || item.item_uuid;
        if (!itemUuid) {
          // Keep items without UUID (can't match, so show modal with original shortfall)
          return item;
        }

        const key = String(itemUuid).trim().toLowerCase();
        const returnedQty = returnedQuantitiesMap.get(key) || 0;
        const originalShortfallQty = parseFloat(String(item.shortfall_quantity || 0)) || 0;

        // Calculate remaining shortfall after returns
        const remainingShortfall = Math.max(0, originalShortfallQty - returnedQty);

        // If there's remaining shortfall, update the item with the new shortfall quantity
        if (remainingShortfall > 0) {
          return {
            ...item,
            shortfall_quantity: remainingShortfall,
            // Also update received_quantity to reflect what's actually remaining to be received
            // This helps with display accuracy
            received_quantity: parseFloat(String(item.ordered_quantity || 0)) - remainingShortfall,
          };
        }

        // Return null for items that are fully covered (will be filtered out)
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return unmatchedShortfallItems;
  } catch (error) {
    console.error("[ReceiptNoteList] Error checking existing return notes:", error);
    // On error, return all shortfall items (better to show modal than miss something)
    return shortfallItems;
  }
};

// Check for items with shortfall quantities
const checkForShortfallQuantities = async (): Promise<{ hasShortfall: boolean; items: any[] }> => {
  if (!receiptNoteFormRef.value) {
    return { hasShortfall: false, items: [] };
  }

  // Access the computed property - it might be a ref or a computed
  const shortfallItemsRef = receiptNoteFormRef.value.shortfallItems;
  const shortfallItems = shortfallItemsRef?.value || shortfallItemsRef || [];
  
  if (!Array.isArray(shortfallItems) || shortfallItems.length === 0) {
    return { hasShortfall: false, items: [] };
  }

  // Check for existing return notes and filter out already covered items
  const receiptData = receiptNoteForm.value;
  const unmatchedShortfallItems = await checkExistingReturnNotesForShortfall(shortfallItems, receiptData);
  
  return {
    hasShortfall: unmatchedShortfallItems.length > 0,
    items: unmatchedShortfallItems,
  };
};

const saveReceiptNote = async () => {
  if (savingReceiptNote.value) return;
  const corpUuid = corporationStore.selectedCorporationId;
  if (!corpUuid) {
    const toast = useToast();
    toast.add({
      title: "Select Corporation",
      description: "Please select a corporation before saving.",
      color: "error",
    });
    return;
  }

  // Check for over-received quantities (received > ordered) before saving
  if (receiptNoteFormRef.value?.hasOverReceivedItems) {
    const errorMessage = receiptNoteFormRef.value.overReceivedValidationError || 
      "Cannot save receipt note: One or more items have received quantity greater than ordered quantity.";
    const toast = useToast();
    toast.add({
      title: "Validation Error",
      description: errorMessage,
      color: "error",
    });
    return;
  }

  // Check for shortfall quantities before saving
  // Only show shortfall modal when creating a new receipt note (not when editing an existing one)
  const isNewReceiptNote = !receiptNoteForm.value?.uuid;
  
  if (isNewReceiptNote) {
    const { hasShortfall, items } = await checkForShortfallQuantities();

    if (hasShortfall && !isViewMode.value) {
      shortfallItemsForModal.value = items;
      pendingReceiptNoteSave.value = async () => {
        await performSaveReceiptNote(true); // Pass true to indicate saving as open PO
      };
      showShortfallModal.value = true;
      return;
    }
  }

  await performSaveReceiptNote(false); // Pass false for normal save
};

const performSaveReceiptNote = async (saveAsOpenPO: boolean = false, suppressToast: boolean = false) => {
  if (savingReceiptNote.value) return;
  const corpUuid = corporationStore.selectedCorporationId;
  if (!corpUuid) {
    const toast = useToast();
    toast.add({
      title: "Select Corporation",
      description: "Please select a corporation before saving.",
      color: "error",
    });
    return;
  }

  savingReceiptNote.value = true;
  try {
    // Ensure total_received_amount is synced with grn_total_with_charges_taxes before saving
    const formData = { ...receiptNoteForm.value };
    
    // Calculate GRN total from FinancialBreakdown data if grn_total_with_charges_taxes is not available
    // This ensures we always save the correct GRN total (item_total + charges_total + tax_total)
    let grnTotalWithCharges = formData.grn_total_with_charges_taxes;
    
    if (grnTotalWithCharges === undefined || grnTotalWithCharges === null) {
      // Calculate from FinancialBreakdown totals: item_total + charges_total + tax_total
      const itemTotal = parseFloat(String(formData.item_total || 0)) || 0;
      const chargesTotal = parseFloat(String(formData.charges_total || 0)) || 0;
      const taxTotal = parseFloat(String(formData.tax_total || 0)) || 0;
      
      grnTotalWithCharges = itemTotal + chargesTotal + taxTotal;
      grnTotalWithCharges = Math.round((grnTotalWithCharges + Number.EPSILON) * 100) / 100;
      
      // Also check financial_breakdown.totals if available
      if (formData.financial_breakdown?.totals?.grn_total_with_charges_taxes) {
        const breakdownTotal = parseFloat(String(formData.financial_breakdown.totals.grn_total_with_charges_taxes)) || 0;
        if (breakdownTotal > 0) {
          grnTotalWithCharges = breakdownTotal;
        }
      }
      
      // Update form data for consistency
      formData.grn_total_with_charges_taxes = grnTotalWithCharges;
    }
    
    // Always use the calculated GRN total (with charges/taxes) for total_received_amount
    // This ensures consistency: both purchase orders and change orders save the GRN total
    formData.total_received_amount = grnTotalWithCharges;

    // Ensure receipt_type is set (defaults to 'purchase_order')
    const receiptType = formData.receipt_type || 'purchase_order';
    formData.receipt_type = receiptType;

    // Clear the opposite UUID column based on receipt_type
    // purchase_order_uuid and change_order_uuid are now separate columns
    if (receiptType === 'change_order') {
      // For change orders, clear purchase_order_uuid
      formData.purchase_order_uuid = null;
      // change_order_uuid is already set in formData
    } else {
      // For purchase orders, clear change_order_uuid
      formData.change_order_uuid = null;
      // purchase_order_uuid is already set in formData
    }

    const payload = {
      ...formData,
      corporation_uuid: corpUuid,
      save_as_open_po: saveAsOpenPO, // Flag to indicate saving as open PO
    };

    if (receiptNoteForm.value?.uuid) {
      await stockReceiptNotesStore.updateStockReceiptNote(payload);
      if (!suppressToast) {
        const toast = useToast();
        toast.add({
          title: "Updated",
          description: "Receipt note updated successfully.",
          color: "success",
        });
      }
    } else {
      await stockReceiptNotesStore.createStockReceiptNote(payload);
      if (!suppressToast) {
        const toast = useToast();
        toast.add({
          title: "Created",
          description: "Receipt note created successfully.",
          color: "success",
        });
      }
    }
    
    // Check if form's corporation matches TopBar's selected corporation
    // Only update store/IndexedDB if they match, otherwise just call API directly
    const formCorpUuid = formData.corporation_uuid;
    const topBarCorpUuid = corporationStore.selectedCorporationId;
    const shouldUpdateStore = formCorpUuid && topBarCorpUuid && formCorpUuid === topBarCorpUuid;

    // Refresh the specific purchase order if status was updated to Partially_Received
    // Only refresh if form's corporation matches TopBar's selected corporation
    if (saveAsOpenPO && receiptType === 'purchase_order' && formData.purchase_order_uuid && shouldUpdateStore) {
      try {
        // Fetch only the specific purchase order that was updated
        const updatedPO = await purchaseOrdersStore.fetchPurchaseOrder(formData.purchase_order_uuid);
        if (updatedPO) {
          // Use store method to update the purchase order in the list (ensures proper reactivity and IndexedDB update)
          purchaseOrdersStore.updatePurchaseOrderInList(updatedPO);
        }
      } catch (refreshError) {
        console.error("[ReceiptNoteList] Failed to refresh purchase order:", refreshError);
        // Don't fail the operation, just log the error
      }
    }

    // Refresh the specific change order if status was updated to Partially_Received
    // Only refresh if form's corporation matches TopBar's selected corporation
    if (saveAsOpenPO && receiptType === 'change_order' && formData.change_order_uuid && shouldUpdateStore) {
      try {
        // Fetch only the specific change order that was updated
        const updatedCO = await changeOrdersStore.fetchChangeOrder(formData.change_order_uuid);
        if (updatedCO) {
          // Use store method to update the change order in the list (ensures proper reactivity and IndexedDB update)
          changeOrdersStore.updateChangeOrderInList(updatedCO);
        }
      } catch (refreshError) {
        console.error("[ReceiptNoteList] Failed to refresh change order:", refreshError);
        // Don't fail the operation, just log the error
      }
    }

    // Refresh the specific purchase order if status was updated to Completed
    // This happens when saveAsOpenPO is false (normal save) and all items are fully received
    // Only refresh if form's corporation matches TopBar's selected corporation

    if (!saveAsOpenPO && receiptType === 'purchase_order' && formData.purchase_order_uuid && shouldUpdateStore) {
      try {
        // Fetch only the specific purchase order that was updated
        // The API may have marked it as Completed if all items are fully received
        const updatedPO = await purchaseOrdersStore.fetchPurchaseOrder(formData.purchase_order_uuid);
        if (updatedPO) {
          // Use store method to update the purchase order in the list (ensures proper reactivity and IndexedDB update)
          purchaseOrdersStore.updatePurchaseOrderInList(updatedPO);
        }
      } catch (refreshError) {
        console.error("[ReceiptNoteList] Failed to refresh purchase order after completion check:", refreshError);
        // Don't fail the operation, just log the error
      }
    }

    // Refresh the specific change order if status was updated to Completed
    // This happens when saveAsOpenPO is false (normal save) and all items are fully received
    // Only refresh if form's corporation matches TopBar's selected corporation
    if (!saveAsOpenPO && receiptType === 'change_order' && formData.change_order_uuid && shouldUpdateStore) {
      try {
        // Fetch only the specific change order that was updated
        // The API may have marked it as Completed if all items are fully received
        const updatedCO = await changeOrdersStore.fetchChangeOrder(formData.change_order_uuid);
        if (updatedCO) {
          // Use store method to update the change order in the list (ensures proper reactivity and IndexedDB update)
          changeOrdersStore.updateChangeOrderInList(updatedCO);
        }
      } catch (refreshError) {
        console.error("[ReceiptNoteList] Failed to refresh change order after completion check:", refreshError);
        // Don't fail the operation, just log the error
      }
    }
    
    showFormModal.value = false;
    // Reset form after closing
    await nextTick();
    receiptNoteForm.value = createEmptyForm();
  } catch (error: any) {
    console.error("[ReceiptNoteList] save error", error);
    const toast = useToast();
    toast.add({
      title: "Error",
      description: error?.message || "Failed to save receipt note.",
      color: "error",
    });
  } finally {
    savingReceiptNote.value = false;
  }
};

const deleteReceiptNote = (note: any) => {
  if (!hasPermission("po_delete")) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to delete receipt notes.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }

  receiptNoteToDelete.value = note;
  showDeleteModal.value = true;
};

// Helper function to clean error messages
const getCleanMessage = (msg: string | undefined): string => {
  if (!msg) return ''
  let clean = msg
  // Remove [METHOD] "URL": statusCode patterns like [DELETE] "/api/receipt-notes?uuid=...": 400
  clean = clean.replace(/\[.*?\]\s*"[^"]*":\s*\d{3}\s*/g, '')
  // Remove [METHOD] "URL" patterns (without status code)
  clean = clean.replace(/\[.*?\]\s*"[^"]*":\s*/g, '')
  // Remove API endpoint URLs (standalone)
  clean = clean.replace(/\/api\/[^\s"]+/g, '')
  // Remove status codes like "500" or "400" (standalone numbers, but keep them in context)
  clean = clean.replace(/\b\d{3}\b(?=\s|$)/g, '')
  // Remove common error prefixes
  clean = clean.replace(/^(FetchError|Error|Failed to load resource):\s*/i, '')
  // Remove extra whitespace and leading/trailing colons
  clean = clean.trim().replace(/\s+/g, ' ').replace(/^\s*:\s*/, '').replace(/\s*:\s*$/, '')
  return clean
}

const confirmDelete = async () => {
  if (!receiptNoteToDelete.value) return;
  try {
    await stockReceiptNotesStore.deleteStockReceiptNote(
      receiptNoteToDelete.value.uuid
    );
    const toast = useToast();
    toast.add({
      title: "Deleted",
      description: "Receipt note deleted successfully.",
      color: "success",
    });
    showDeleteModal.value = false;
    receiptNoteToDelete.value = null;
  } catch (error: any) {
    console.error("[ReceiptNoteList] delete error", error);
    // Clear the store error after handling it so it doesn't affect the table display
    stockReceiptNotesStore.error = null
    
    const toast = useToast();
    let errorDescription = 'Failed to delete receipt note.'
    
    // Use statusMessage from API if available (it should be clean), otherwise use cleaned message
    if (error?.statusMessage) {
      errorDescription = getCleanMessage(error.statusMessage) || errorDescription
    } else if (error?.message) {
      errorDescription = getCleanMessage(error.message) || errorDescription
    }
    
    toast.add({
      title: "Error",
      description: errorDescription,
      color: "error",
    });
  }
};

const cancelDelete = () => {
  showDeleteModal.value = false;
  receiptNoteToDelete.value = null;
};

// Handle shortfall items - save as open PO
const handleSaveAsOpenPO = async () => {
  showShortfallModal.value = false;
  
  // Save the receipt note normally (as open PO) - this will update PO status to Partially_Received
  if (pendingReceiptNoteSave.value) {
    await pendingReceiptNoteSave.value();
    pendingReceiptNoteSave.value = null;
  } else {
    await performSaveReceiptNote(true); // Pass true to indicate saving as open PO
  }
  
  shortfallItemsForModal.value = [];
};

// Handle shortfall items - raise return note
const handleRaiseReturnNote = async () => {
  showShortfallModal.value = false;
  
  const shortfallItems = shortfallItemsForModal.value;
  if (!shortfallItems || shortfallItems.length === 0) {
    return;
  }

  shortfallItemsForReturn.value = shortfallItems;

  // Get the receipt note data to use as reference
  const receiptData = receiptNoteForm.value;
  const corpUuid = corporationStore.selectedCorporationId;
  
  if (!corpUuid) {
    const toast = useToast();
    toast.add({
      title: "Select Corporation",
      description: "Please select a corporation before creating return note.",
      color: "error",
    });
    return;
  }

  // First, save the receipt note as open PO (suppress toast - we'll show combined message later)
  try {
    await performSaveReceiptNote(true, true); // Save as open PO, suppress toast
  } catch (error: any) {
    console.error("[ReceiptNoteList] Failed to save receipt note:", error);
    const toast = useToast();
    toast.add({
      title: "Error",
      description: "Failed to save receipt note. Return note was not created.",
      color: "error",
    });
    return;
  }

  // Now automatically create the return note
  try {
    // Generate next return number
    await stockReturnNotesStore.fetchStockReturnNotes(corpUuid);
    const returnNumber = stockReturnNotesStore.generateNextReturnNumber(corpUuid);

    // Prepare return note items from shortfall items
    const returnItems = shortfallItems.map((item: any) => {
      const returnType = receiptData.receipt_type || 'purchase_order';
      const orderedQty = item.ordered_quantity || item.po_quantity || 0;
      
      return {
        base_item_uuid: item.uuid || item.base_item_uuid || null,
        cost_code_uuid: item.cost_code_uuid || null,
        cost_code_number: item.cost_code_number || '',
        cost_code_name: item.cost_code_name || '',
        cost_code_label: item.cost_code_label || [item.cost_code_number, item.cost_code_name].filter(Boolean).join(' ').trim(),
        item_type_uuid: item.item_type_uuid || null,
        item_type_code: item.item_type_code || null,
        item_type_label: item.item_type_label || null,
        item_uuid: item.item_uuid || null,
        item_name: item.item_name || '',
        description: item.description || '',
        model_number: item.model_number || '',
        unit_uuid: item.unit_uuid || null,
        unit_label: item.unit_label || '',
        unit_price: item.unit_price || 0,
        // Set ordered quantity based on return type
        ordered_quantity: orderedQty,
        po_quantity: returnType === 'purchase_order' ? orderedQty : null,
        co_quantity: returnType === 'change_order' ? orderedQty : null,
        return_quantity: item.shortfall_quantity, // The shortfall quantity
        return_total: item.shortfall_quantity * (item.unit_price || 0),
        location_uuid: item.location_uuid || null,
        location_label: item.location_label || null,
        sequence_label: item.sequence_label || null,
      };
    });

    // Calculate total return amount
    const totalReturnAmount = returnItems.reduce((sum: number, item: any) => {
      return sum + (item.return_total || 0);
    }, 0);

    // Determine return type based on receipt type
    const returnType = receiptData.receipt_type || 'purchase_order';
    const purchaseOrderUuid = returnType === 'purchase_order' ? receiptData.purchase_order_uuid : null;
    const changeOrderUuid = returnType === 'change_order' ? receiptData.change_order_uuid : null;

    // Create return note payload
    const returnNotePayload = {
      return_number: returnNumber,
      entry_date: receiptData.entry_date || toUTCString(getCurrentLocal()),
      return_type: returnType,
      purchase_order_uuid: purchaseOrderUuid,
      change_order_uuid: changeOrderUuid,
      project_uuid: receiptData.project_uuid || null,
      returned_by: receiptData.received_by || null,
      location_uuid: receiptData.location_uuid || null,
      notes: `Return note for shortfall quantities from receipt note ${receiptData.grn_number || ''}`,
      status: 'Returned',
      return_items: returnItems,
      total_return_amount: totalReturnAmount,
      attachments: [],
      corporation_uuid: corpUuid,
    };

    // Check if form's corporation matches TopBar's selected corporation
    const topBarCorpUuid = corporationStore.selectedCorporationId;
    const shouldUpdateStore = corpUuid && topBarCorpUuid && corpUuid === topBarCorpUuid;

    // Create the return note automatically
    let createdReturnNote;
    if (shouldUpdateStore) {
      // Form's corporation matches TopBar's selected corporation - update store and IndexedDB
      createdReturnNote = await stockReturnNotesStore.createStockReturnNote(returnNotePayload);
    } else {
      // Form's corporation is different - just call API directly (bypass store/IndexedDB)
      const response = await $fetch("/api/stock-return-notes", {
        method: "POST",
        body: returnNotePayload,
      });
      createdReturnNote = (response as any)?.data ?? response ?? null;
    }

    // Refresh purchase order or change order if needed
    if (returnType === 'purchase_order' && purchaseOrderUuid && shouldUpdateStore && topBarCorpUuid) {
      try {
        const updatedPO = await purchaseOrdersStore.fetchPurchaseOrder(purchaseOrderUuid);
        if (updatedPO) {
          purchaseOrdersStore.updatePurchaseOrderInList(updatedPO);
        }
      } catch (refreshError) {
        console.error("[ReceiptNoteList] Failed to refresh purchase order:", refreshError);
      }
    }

    if (returnType === 'change_order' && changeOrderUuid && shouldUpdateStore && topBarCorpUuid) {
      try {
        const updatedCO = await changeOrdersStore.fetchChangeOrder(changeOrderUuid);
        if (updatedCO) {
          changeOrdersStore.updateChangeOrderInList(updatedCO);
        }
      } catch (refreshError) {
        console.error("[ReceiptNoteList] Failed to refresh change order:", refreshError);
      }
    }

    // Refresh return notes store if needed
    if (shouldUpdateStore && topBarCorpUuid) {
      await stockReturnNotesStore.fetchStockReturnNotes(topBarCorpUuid, { force: true });
    }

    // Fetch return note items to ensure they're available
    if (createdReturnNote?.uuid) {
      try {
        await $fetch("/api/return-note-items", {
          method: "GET",
          query: {
            corporation_uuid: corpUuid,
            project_uuid: returnNotePayload.project_uuid || undefined,
            return_note_uuid: createdReturnNote.uuid,
            item_type: returnType,
          },
        });
      } catch (error) {
        console.warn("[ReceiptNoteList] Failed to fetch return note items after creation:", error);
      }
    }

    // Show success message
    const toast = useToast();
    toast.add({
      title: "Success",
      description: "Receipt note saved and return note created successfully.",
      color: "success",
    });

    // Clear shortfall state
    shortfallItemsForModal.value = [];
    shortfallItemsForReturn.value = [];
    
    // Close the receipt note form modal
    closeFormModal();
  } catch (error: any) {
    console.error("[ReceiptNoteList] Failed to create return note:", error);
    const toast = useToast();
    let errorDescription = 'Failed to create return note.';
    
    if (error?.statusMessage) {
      errorDescription = error.statusMessage;
    } else if (error?.message) {
      errorDescription = error.message;
    }
    
    toast.add({
      title: "Error",
      description: errorDescription,
      color: "error",
    });
  }
};

// Save return note from shortfall
const saveReturnNoteFromShortfall = async () => {
  if (savingReturnNote.value) return;
  
  // Use form's corporation_uuid (not TopBar's selectedCorporationId)
  // This allows the form to operate independently with its own corporation selection
  const formCorpUuid = returnNoteFormData.value?.corporation_uuid;
  const topBarCorpUuid = corporationStore.selectedCorporationId;
  
  // Use form's corporation_uuid if available, otherwise fall back to TopBar's selected corporation
  const corpUuid = formCorpUuid || topBarCorpUuid;
  
  if (!corpUuid) {
    const toast = useToast();
    toast.add({
      title: "Select Corporation",
      description: "Please select a corporation before saving.",
      color: "error",
    });
    return;
  }

  // Check if form's corporation matches TopBar's selected corporation
  // Only update store/IndexedDB if they match, otherwise just call API directly
  const shouldUpdateStore = formCorpUuid && topBarCorpUuid && formCorpUuid === topBarCorpUuid;

  // Check for validation errors
  if (returnNoteFormRef.value?.hasValidationError) {
    const toast = useToast();
    toast.add({
      title: "Validation Error",
      description: returnNoteFormRef.value.combinedValidationError || returnNoteFormRef.value.receiptNotesValidationError || "Cannot save return note due to validation errors.",
      color: "error",
    });
    return;
  }

  savingReturnNote.value = true;
  try {
    // Wait for any pending form updates to propagate
    await nextTick();
    
    // Get the latest form data from returnNoteFormData (which is bound via v-model)
    // This ensures we have the most up-to-date data including any changes made in ReturnNoteItemsTable
    // Read directly from returnNoteFormData.value right before using it to ensure we have the latest data
    const latestFormData = returnNoteFormData.value;
    if (!latestFormData) {
      throw new Error("Return note form data is not available");
    }
    
    const formData = { ...latestFormData };
    
    // Ensure return_items are included - get from formData which should be synced via v-model
    let returnItems = formData.return_items || [];
    
    // Calculate total return amount from return items
    let totalReturnAmount = formData.total_return_amount;
    
    if (totalReturnAmount === undefined || totalReturnAmount === null) {
      totalReturnAmount = returnItems.reduce((sum: number, item: any) => {
        const returnTotal = parseFloat(String(item.return_total || 0)) || 0;
        return sum + returnTotal;
      }, 0);
      totalReturnAmount = Math.round((totalReturnAmount + Number.EPSILON) * 100) / 100;
      formData.total_return_amount = totalReturnAmount;
    }

    // Ensure return_type is set
    const returnType = formData.return_type || 'purchase_order';
    formData.return_type = returnType;

    // Always set status to "Returned" - never save "Waiting" status
    formData.status = "Returned";

    // Clear the opposite UUID column based on return_type
    if (returnType === 'change_order') {
      formData.purchase_order_uuid = null;
    } else {
      formData.change_order_uuid = null;
    }

    const payload = {
      ...formData,
      corporation_uuid: corpUuid,
      return_items: returnItems,
    };

    let createdReturnNote;
    if (shouldUpdateStore) {
      // Form's corporation matches TopBar's selected corporation - update store and IndexedDB
      createdReturnNote = await stockReturnNotesStore.createStockReturnNote(payload);
    } else {
      // Form's corporation is different - just call API directly (bypass store/IndexedDB)
      const response = await $fetch("/api/stock-return-notes", {
        method: "POST",
        body: payload,
      });
      createdReturnNote = (response as any)?.data ?? response ?? null;
    }
    
    // The API updates the PO/CO status when the return note is created
    // The API awaits the PO/CO update before returning, so the status should be updated by now
    // But we'll refresh the PO/CO to ensure we have the latest data
    
    // Refresh the specific purchase order if status was updated to Completed
    // This happens after the return note is saved, which means the API has finished
    // updating the PO status (the API awaits the PO update before returning)
    // Use formData (the payload sent to API) instead of returnNoteFormData.value to ensure we have the correct UUIDs
    // Only refresh if form's corporation matches TopBar's selected corporation
    if (returnType === 'purchase_order' && formData.purchase_order_uuid && shouldUpdateStore && topBarCorpUuid) {
      try {
        // Fetch only the specific purchase order that was updated
        const updatedPO = await purchaseOrdersStore.fetchPurchaseOrder(formData.purchase_order_uuid);
        if (updatedPO) {
          // Use store method to update the purchase order in the list (ensures proper reactivity)
          purchaseOrdersStore.updatePurchaseOrderInList(updatedPO);
        }
      } catch (refreshError) {
        console.error("[ReceiptNoteList] Failed to refresh purchase order:", refreshError);
        // Don't fail the operation, just log the error
      }
    }

    // Refresh the specific change order if status was updated to Completed
    // This happens after the return note is saved, which means the API has finished
    // updating the CO status (the API awaits the CO update before returning)
    // Use formData (the payload sent to API) instead of returnNoteFormData.value to ensure we have the correct UUIDs
    // Only refresh if form's corporation matches TopBar's selected corporation
    if (returnType === 'change_order' && formData.change_order_uuid && shouldUpdateStore && topBarCorpUuid) {
      try {
        // Fetch only the specific change order that was updated
        const updatedCO = await changeOrdersStore.fetchChangeOrder(formData.change_order_uuid);
        if (updatedCO) {
          // Use store method to update the change order in the list (ensures proper reactivity)
          changeOrdersStore.updateChangeOrderInList(updatedCO);
        }
      } catch (refreshError) {
        console.error("[ReceiptNoteList] Failed to refresh change order:", refreshError);
        // Don't fail the operation, just log the error
      }
    }
    
    // Only refresh return notes store if form's corporation matches TopBar's selected corporation
    // This ensures we don't unnecessarily fetch data for a different corporation
    if (shouldUpdateStore && topBarCorpUuid) {
      // Refresh return notes store to ensure the new return note is available for shortfall checking
      // Force refresh to get the latest data including the return note items
      await stockReturnNotesStore.fetchStockReturnNotes(topBarCorpUuid, { force: true });
    }
    
    // Also fetch return note items to ensure they're available for the shortfall check
    // This ensures the return note items are in the database and can be queried
    if (createdReturnNote?.uuid) {
      try {
        await $fetch("/api/return-note-items", {
          method: "GET",
          query: {
            corporation_uuid: corpUuid,
            project_uuid: formData.project_uuid || undefined,
            return_note_uuid: createdReturnNote.uuid,
            item_type: formData.return_type || 'purchase_order',
          },
        });
      } catch (error) {
        // Continue even if this fails - the main fetch should have worked
        console.warn("[ReceiptNoteList] Failed to fetch return note items after creation:", error);
      }
    }
    
    const toast = useToast();
    toast.add({
      title: "Created",
      description: "Return note created successfully.",
      color: "success",
    });

    // Close return note modal
    closeReturnNoteModal();

    // Ensure shortfall modal is closed and clear state
    showShortfallModal.value = false;
    shortfallItemsForModal.value = [];
    shortfallItemsForReturn.value = [];
    
    // Now save the receipt note as open PO
    // The shortfall check should now filter out items that have return notes
    // and show only the remaining shortfall quantities
    if (pendingReceiptNoteSave.value) {
      await pendingReceiptNoteSave.value();
      pendingReceiptNoteSave.value = null;
    } else {
      await performSaveReceiptNote();
    }
  } catch (error: any) {
    console.error("[ReceiptNoteList] save return note error", error);
    const toast = useToast();
    toast.add({
      title: "Error",
      description: error?.message || "Failed to save return note.",
      color: "error",
    });
  } finally {
    savingReturnNote.value = false;
  }
};

// Close return note modal
const closeReturnNoteModal = () => {
  showReturnNoteModal.value = false;
  returnNoteFormData.value = null;
  shortfallItemsForReturn.value = [];
};

// Close shortfall modal
const closeShortfallModal = () => {
  showShortfallModal.value = false;
  pendingReceiptNoteSave.value = null;
  shortfallItemsForModal.value = [];
};

const toggleStatusFilter = (status: string) => {
  if (selectedStatusFilter.value === status) {
    selectedStatusFilter.value = null;
  } else {
    selectedStatusFilter.value = status;
  }
  resetTablePage();
};

const clearStatusFilter = () => {
  selectedStatusFilter.value = null;
  resetTablePage();
};

const handlePageSizeChange = () => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageSize(pagination.value.pageSize);
  }
};

const resetTablePage = () => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageIndex(0);
  }
};

// Receipt notes are automatically fetched by TopBar.vue when corporation changes
// Fetch vendors and users when corporation changes to ensure they're available for the table
watch(selectedCorporationId, (newCorpUuid) => {
  if (newCorpUuid) {
    vendorStore.fetchVendors(newCorpUuid).catch(() => {});
    userProfilesStore.fetchUsers(false).catch(() => {});
  }
}, { immediate: true });

watch(globalFilter, () => {
  resetTablePage();
});

watch(
  () => pagination.value.pageSize,
  (newSize) => {
    if (table.value?.tableApi) {
      table.value.tableApi.setPageSize(newSize);
    }
  }
);

// Watch modal close to ensure cleanup happens regardless of how it's closed
// (ESC key, click outside modal, or clicking X button)
watch(showFormModal, (isOpen, wasOpen) => {
  // If modal just closed, ensure cleanup happens
  if (wasOpen && !isOpen) {
    purchaseOrderResourcesStore.clear();
    isViewMode.value = false;
  }
});

onMounted(() => {
  // Receipt notes are automatically fetched by TopBar.vue when corporation changes
  // No need to fetch here - just use the store data reactively
  receiptNoteForm.value = createEmptyForm();
});
</script>
