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
      
      <!-- Returned Section -->
      <div
        @click="toggleStatusFilter('Returned')"
        :class="[
          'flex-1 px-4 py-2 cursor-pointer transition-colors flex items-center justify-center',
          selectedStatusFilter === 'Returned'
            ? 'bg-gray-100 dark:bg-gray-700'
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        ]"
      >
        <div class="flex flex-col items-center text-center">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            Returned ({{ returnedStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(returnedStats.totalValue) }}
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
        Add new Return Note
      </UButton>
    </div>

    <div v-if="loading" class="space-y-2">
      <div class="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-7 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
            <USkeleton v-for="n in 8" :key="`header-${n}`" class="h-4 w-20" />
          </div>
        </div>
        <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="i in 6" :key="`row-${i}`" class="grid grid-cols-8 gap-4 px-2 py-2">
            <USkeleton v-for="n in 8" :key="`row-${i}-${n}`" class="h-4 w-full" />
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
      v-else-if="hasPermission('po_view') && filteredReturnNotes.length && isReady"
    >
      <UTable
        ref="table"
        sticky
        v-model:pagination="pagination"
        v-model:column-pinning="columnPinning"
        :pagination-options="paginationOptions"
        :data="filteredReturnNotes"
        :columns="columns"
        class="max-h-[70vh] overflow-auto"
      />

      <div
        v-if="shouldShowPagination(filteredReturnNotes.length).value"
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
          {{ getPageInfo(table, 'return notes').value }}
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
        You don't have permission to view return notes
      </p>
    </div>

    <div v-else-if="isReady" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-document" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg">No return notes found</p>
      <p class="text-gray-400 text-sm mb-6">
        Click add new to create your first return note
      </p>
      <UButton
        v-if="hasPermission('po_create')"
        icon="i-heroicons-plus"
        @click="openCreateModal"
      >
        Add Return Note
      </UButton>
    </div>

    <UModal v-model:open="showDeleteModal" title="Delete Return Note">
      <template #body>
        <div class="p-6 space-y-4">
          <div class="flex items-center gap-3">
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="w-8 h-8 text-red-500"
            />
            <div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                Delete Return Note
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <div v-if="returnNoteToDelete" class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <p class="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <span class="block">
                <strong>Return Number:</strong>
                {{ returnNoteToDelete.return_number }}
              </span>
              <span class="block">
                <strong>Entry Date:</strong>
                {{ formatDate(returnNoteToDelete.entry_date) }}
              </span>
              <span class="block">
                <strong>Status:</strong>
                {{ returnNoteToDelete.status }}
              </span>
              <span class="block">
                <strong>Total Return:</strong>
                {{ formatCurrency(returnNoteToDelete.total_return_amount || 0) }}
              </span>
            </p>
          </div>
          <p class="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this return note? The associated
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
            Delete Return Note
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="showFormModal"
      :title="formModalTitle"
      fullscreen
      scrollable
      :ui="returnNoteModalUi"
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
                Edit Return Note
              </UButton>
              
              <UButton
                v-if="!isViewMode && canEdit"
                type="button"
                color="primary"
                size="sm"
                :loading="savingReturnNote"
                :disabled="savingReturnNote || hasFormValidationError"
                @click="saveReturnNote"
              >
                {{ returnNoteForm?.uuid ? "Update" : "Save" }}
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
        <ReturnNoteForm
          ref="returnNoteFormRef"
          v-if="showFormModal"
          v-model:form="returnNoteForm"
          :editing-return-note="Boolean(returnNoteForm?.uuid)"
          :readonly="isViewMode"
        />
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
import ReturnNoteForm from "@/components/PurchaseOrders/ReturnNoteForm.vue";
import { useCorporationStore } from "@/stores/corporations";
import { useStockReturnNotesStore } from "@/stores/stockReturnNotes";
import { usePurchaseOrdersStore } from "@/stores/purchaseOrders";
import { usePurchaseOrderResourcesStore } from "@/stores/purchaseOrderResources";
import { useChangeOrdersStore } from "@/stores/changeOrders";
import { useProjectsStore } from "@/stores/projects";
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
const stockReturnNotesStore = useStockReturnNotesStore();
const purchaseOrdersStore = usePurchaseOrdersStore();
const purchaseOrderResourcesStore = usePurchaseOrderResourcesStore();
const changeOrdersStore = useChangeOrdersStore();
const projectsStore = useProjectsStore();
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
const returnNoteToDelete = ref<any>(null);
const showFormModal = ref(false);
const returnNoteForm = ref<any>({});
const savingReturnNote = ref(false);
const loadingEdit = ref(false);
const isViewMode = ref(false);
const returnNoteFormRef = ref<any>(null);

// Ref to track validation state - updated via watch to ensure reactivity
const hasFormValidationError = ref(false);

// Watch the form ref's validation state to update the button disabled state
watch(
  () => returnNoteFormRef.value?.hasValidationError,
  (hasError) => {
    hasFormValidationError.value = hasError ?? false;
  },
  { immediate: true }
);

// Also watch for changes in the form ref itself
watch(
  () => returnNoteFormRef.value,
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

const returnNotes = computed(() =>
  stockReturnNotesStore.stockReturnNotes.filter(
    (note) => note.corporation_uuid === selectedCorporationId.value
  )
);

const loading = computed(() => stockReturnNotesStore.loading);
// Only show error alert for fetch errors, not delete operation errors
// Delete errors are handled via toast notifications
const error = computed(() => {
  const storeError = stockReturnNotesStore.error
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
  returnNoteForm.value?.uuid ? "Edit Stock Return Note" : "New Stock Return Note"
);
const returnNoteModalUi = {
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
    { poNumber: string; total: number; projectUuid?: string | null }
  >();
  const list = purchaseOrdersStore.purchaseOrders ?? [];
  list.forEach((po: any) => {
    if (po?.uuid) {
      map.set(po.uuid, {
        poNumber: po.po_number || "Unnamed PO",
        total: Number(po.total_po_amount) || 0,
        projectUuid: po.project_uuid,
      });
    }
  });
  return map;
});

const changeOrderLookup = computed(() => {
  const map = new Map<
    string,
    { coNumber: string; total: number; projectUuid?: string | null }
  >();
  const list = changeOrdersStore.changeOrders ?? [];
  list.forEach((co: any) => {
    if (co?.uuid) {
      map.set(co.uuid, {
        coNumber: co.co_number || "Unnamed CO",
        total: Number(co.total_co_amount) || 0,
        projectUuid: co.project_uuid,
      });
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
  count: returnNotes.value.length,
  totalValue: returnNotes.value.reduce(
    (sum, note) => sum + (Number(note.total_return_amount) || 0),
    0
  ),
}));

const returnedStats = computed(() => {
  // All return notes should have "Returned" status
  // Filter for "Returned" status, and also include notes without status (default to "Returned")
  const returned = returnNotes.value.filter((note) => {
    const status = note.status || "Returned";
    return status === "Returned";
  });
  return {
    count: returned.length,
    totalValue: returned.reduce(
      (sum, note) => sum + (Number(note.total_return_amount) || 0),
      0
    ),
  };
});

const filteredReturnNotes = computed(() => {
  let list = [...returnNotes.value];

  if (selectedStatusFilter.value) {
    list = list.filter(
      (note) => (note.status || "Returned") === selectedStatusFilter.value
    );
  }

  const filter = globalFilter.value.trim().toLowerCase();
  if (filter) {
    list = list.filter((note) => {
      const returnType = note.return_type || 'purchase_order';
      let orderNumber = "";
      if (returnType === 'change_order') {
        orderNumber =
          changeOrderLookup.value.get(note.change_order_uuid || "")?.coNumber ||
          "";
      } else {
        orderNumber =
          purchaseOrderLookup.value.get(note.purchase_order_uuid || "")?.poNumber ||
          "";
      }
      const projectName =
        projectLookup.value.get(note.project_uuid || "") || "";
      return (
        note.return_number?.toLowerCase().includes(filter) ||
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
    accessorKey: "entry_date",
    header: "Entry Date",
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) =>
      h("div", formatDate(row.original.entry_date || new Date().toISOString())),
  },
  {
    accessorKey: "return_number",
    header: "Return Number",
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) =>
      h(
        "div",
        { class: "font-medium text-default" },
        row.original.return_number || "N/A"
      ),
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
    accessorKey: "purchase_order_uuid",
    header: "PO/CO Number",
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => {
      const returnType = row.original.return_type || 'purchase_order';
      if (returnType === 'change_order') {
        const co =
          changeOrderLookup.value.get(row.original.change_order_uuid || "");
        return h("div", co?.coNumber || "N/A");
      } else {
        const po =
          purchaseOrderLookup.value.get(row.original.purchase_order_uuid || "");
        return h("div", po?.poNumber || "N/A");
      }
    },
  },
  {
    accessorKey: "returned_by",
    header: "Returned by",
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => {
      const userId = row.original.returned_by;
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
    accessorKey: "status",
    header: "Status",
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }) => {
      // Normalize status: convert "Waiting" to "Returned" and default to "Returned"
      let status = row.original.status || "Returned";
      if (status === "Waiting" || status.toLowerCase() === "waiting") {
        status = "Returned";
      }
      
      const statusMap: Record<string, { label: string; color: string }> = {
        Returned: {
          label: "Returned",
          color: "success"
        }
      };
      
      const config = statusMap[status] ?? {
        label: "Returned",
        color: "success"
      };
      
      return h(UBadge, {
        color: config.color,
        variant: "soft",
        size: "sm"
      }, () => config.label);
    },
  },
  {
    accessorKey: "total_return_amount",
    header: "Total Return",
    enableSorting: false,
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => {
      const amount = row.original.total_return_amount || 0;
      return h(
        "div",
        { class: "text-right font-mono text-sm" },
        formatCurrency(amount)
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    enableSorting: false,
    meta: { class: { th: 'text-right sticky right-0 z-10 w-32', td: 'text-right sticky right-0 w-32' } },
    cell: ({ row }) => {
      const buttons = [];
      
      // View button - show if user has view permission
      if (hasPermission("po_view")) {
        buttons.push(
          h(
            UTooltip,
            { text: "View Return Note Details" },
            () =>
              h(
                UButton,
                {
                  icon: "i-heroicons-eye-solid",
                  size: "xs",
                  variant: "soft",
                  color: "neutral",
                  class: "hover:scale-105 transition-transform",
                  onClick: () => previewReturnNote(row.original),
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
            { text: "Edit Return Note" },
            () =>
              h(
                UButton,
                {
                  icon: "tdesign:edit-filled",
                  size: "xs",
                  variant: "soft",
                  color: "secondary",
                  class: "hover:scale-105 transition-transform",
                  onClick: () => editReturnNote(row.original),
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
            { text: "Delete Return Note" },
            () =>
              h(
                UButton,
                {
                  icon: "mingcute:delete-fill",
                  size: "xs",
                  variant: "soft",
                  color: "error",
                  class: "hover:scale-105 transition-transform",
                  onClick: () => deleteReturnNote(row.original),
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
  return_type: 'purchase_order' as 'purchase_order' | 'change_order',
  entry_date: toUTCString(getCurrentLocal()),
  return_number: "",
  reference_number: "",
  returned_by: "",
  location_uuid: null,
  notes: "",
  status: "Returned",
  total_return_amount: null,
  attachments: [],
});

const ensureSupportingData = async (corporationUuid: string) => {
  await Promise.allSettled([
    purchaseOrdersStore.fetchPurchaseOrders(corporationUuid),
    changeOrdersStore.fetchChangeOrders(corporationUuid),
    projectsStore.fetchProjectsMetadata(corporationUuid).catch(() => {}),
    userProfilesStore.fetchUsers(false).catch(() => {}),
  ]);
};

// Return notes are fetched by TopBar.vue when corporation changes
// This component just reads from the store reactively
// Only fetch supporting data when needed (e.g., when opening a form)

const openCreateModal = async () => {
  // Clear resource store before opening new return note
  purchaseOrderResourcesStore.clear();

  if (!hasPermission("po_create")) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to create return notes.",
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
      description: "Please select a corporation before creating a return note.",
      color: "error",
    });
    return;
  }

  await ensureSupportingData(corpUuid);
  await stockReturnNotesStore.fetchStockReturnNotes(corpUuid, false, 1, 100);

  const returnNumber = stockReturnNotesStore.generateNextReturnNumber(corpUuid);
  returnNoteForm.value = {
    ...createEmptyForm(),
    corporation_uuid: corpUuid,
    return_number: returnNumber,
  };

  showFormModal.value = true;
};

const loadReturnNoteForModal = async (note: any, viewMode: boolean = false) => {
  // Clear resource store before loading return note
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
    
    
    // Use return_type from database (defaults to 'purchase_order' if not set)
    const returnType = formData.return_type || 'purchase_order';
    formData.return_type = returnType;
    
    
    // Use the correct UUID column based on return_type
    // purchase_order_uuid and change_order_uuid are now separate columns
    if (returnType === 'change_order') {
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
    
    
    returnNoteForm.value = formData;
    showFormModal.value = true;
  } catch (error) {
    console.error("[RNL] Failed to load return note details:", error);
    const toast = useToast();
    toast.add({
      title: "Error",
      description: "Failed to load return note details.",
      color: "error",
    });
  } finally {
    loadingEdit.value = false;
  }
};

const editReturnNote = async (note: any) => {
  if (!hasPermission("po_edit")) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to edit return notes.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }

  await loadReturnNoteForModal(note, false);
};

const previewReturnNote = async (note: any) => {
  if (!hasPermission("po_view")) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to view return note details.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }
  
  await loadReturnNoteForModal(note, true);
};

const switchToEditMode = () => {
  if (!hasPermission("po_edit")) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to edit return notes.",
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
  // Form will be reset when modal opens next time via openCreateModal or editReturnNote
};

const saveReturnNote = async () => {
  if (savingReturnNote.value) return;
  
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
  
  // Use form's corporation_uuid (not TopBar's selectedCorporationId)
  // This allows the form to operate independently with its own corporation selection
  const formCorpUuid = returnNoteForm.value?.corporation_uuid;
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

  // Check if return_items is empty (validation error case)
  if (!returnNoteForm.value?.return_items || returnNoteForm.value.return_items.length === 0) {
    const toast = useToast();
    toast.add({
      title: "Validation Error",
      description: "Cannot create return note: All quantities have already been received. There is no shortfall quantity to return.",
      color: "error",
    });
    return;
  }

  // Check if form's corporation matches TopBar's selected corporation
  // Only update store/IndexedDB if they match, otherwise just call API directly
  const shouldUpdateStore = formCorpUuid && topBarCorpUuid && formCorpUuid === topBarCorpUuid;

  savingReturnNote.value = true;
  try {
    const formData = { ...returnNoteForm.value };
    
    // Ensure return_items are included from the form
    // Get return_items from the ReturnNoteForm component if available
    let returnItems = formData.return_items || [];
    
    // If return_items is not in formData, try to get it from the component's returnItems
    // This is a fallback in case the form wasn't properly updated
    
    // Calculate total return amount from return items
    let totalReturnAmount = formData.total_return_amount;
    
    if (totalReturnAmount === undefined || totalReturnAmount === null) {
      // Calculate from return_items
      totalReturnAmount = returnItems.reduce((sum: number, item: any) => {
        const returnTotal = parseFloat(String(item.return_total || 0)) || 0;
        return sum + returnTotal;
      }, 0);
      totalReturnAmount = Math.round((totalReturnAmount + Number.EPSILON) * 100) / 100;
      
      // Update form data for consistency
      formData.total_return_amount = totalReturnAmount;
    }

    // Ensure return_type is set (defaults to 'purchase_order')
    const returnType = formData.return_type || 'purchase_order';
    formData.return_type = returnType;

    // Always set status to "Returned" - never save "Waiting" status
    formData.status = "Returned";

    // Clear the opposite UUID column based on return_type
    // purchase_order_uuid and change_order_uuid are now separate columns
    if (returnType === 'change_order') {
      // For change orders, clear purchase_order_uuid
      formData.purchase_order_uuid = null;
      // change_order_uuid is already set in formData
    } else {
      // For purchase orders, clear change_order_uuid
      formData.change_order_uuid = null;
      // purchase_order_uuid is already set in formData
    }

    // Explicitly include return_items in the payload
    const payload = {
      ...formData,
      corporation_uuid: corpUuid,
      return_items: returnItems, // Explicitly include return_items
    };
    

    if (returnNoteForm.value?.uuid) {
      // Update existing return note
      if (shouldUpdateStore) {
        // Form's corporation matches TopBar's selected corporation - update store and IndexedDB
        await stockReturnNotesStore.updateStockReturnNote(payload);
      } else {
        // Form's corporation is different - just call API directly (bypass store/IndexedDB)
        await $fetch("/api/stock-return-notes", {
          method: "PUT",
          body: payload,
        });
      }
      const toast = useToast();
      toast.add({
        title: "Updated",
        description: "Return note updated successfully.",
        color: "success",
      });
    } else {
      // Create new return note
      if (shouldUpdateStore) {
        // Form's corporation matches TopBar's selected corporation - update store and IndexedDB
        await stockReturnNotesStore.createStockReturnNote(payload);
      } else {
        // Form's corporation is different - just call API directly (bypass store/IndexedDB)
        await $fetch("/api/stock-return-notes", {
          method: "POST",
          body: payload,
        });
      }
      const toast = useToast();
      toast.add({
        title: "Created",
        description: "Return note created successfully.",
        color: "success",
      });
    }
    
    // Refresh the specific purchase order if status was updated to Completed
    // This happens after the store action completes, which means the API has finished
    // updating the PO status (the API awaits the PO update before returning)
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
        console.error("[ReturnNoteList] Failed to refresh purchase order:", refreshError);
        // Don't fail the operation, just log the error
      }
    }

    // Refresh the specific change order if status was updated to Completed
    // This happens after the store action completes, which means the API has finished
    // updating the CO status (the API awaits the CO update before returning)
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
        console.error("[ReturnNoteList] Failed to refresh change order:", refreshError);
        // Don't fail the operation, just log the error
      }
    }
    showFormModal.value = false;
    // Reset form after closing
    await nextTick();
    returnNoteForm.value = createEmptyForm();
  } catch (error: any) {
    console.error("[ReturnNoteList] save error", error);
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

const deleteReturnNote = (note: any) => {
  if (!hasPermission("po_delete")) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to delete return notes.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }

  returnNoteToDelete.value = note;
  showDeleteModal.value = true;
};

// Helper function to clean error messages
const getCleanMessage = (msg: string | undefined): string => {
  if (!msg) return ''
  let clean = msg
  // Remove [METHOD] "URL": statusCode patterns like [DELETE] "/api/return-notes?uuid=...": 400
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
  if (!returnNoteToDelete.value) return;
  try {
    await stockReturnNotesStore.deleteStockReturnNote(
      returnNoteToDelete.value.uuid
    );
    const toast = useToast();
    toast.add({
      title: "Deleted",
      description: "Return note deleted successfully.",
      color: "success",
    });
    showDeleteModal.value = false;
    returnNoteToDelete.value = null;
  } catch (error: any) {
    console.error("[ReturnNoteList] delete error", error);
    // Clear the store error after handling it so it doesn't affect the table display
    stockReturnNotesStore.error = null
    
    const toast = useToast();
    let errorDescription = 'Failed to delete return note.'
    
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
  returnNoteToDelete.value = null;
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

// Return notes are automatically fetched by TopBar.vue when corporation changes
// Fetch users when corporation changes to ensure they're available for the table
watch(selectedCorporationId, (newCorpUuid) => {
  if (newCorpUuid) {
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
  // Return notes are automatically fetched by TopBar.vue when corporation changes
  // No need to fetch here - just use the store data reactively
  returnNoteForm.value = createEmptyForm();
});
</script>

