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
            Summary ({{ allPOStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(allPOStats.totalValue) }}
          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div class="w-px bg-gray-200 dark:bg-gray-700"></div>
      
      <!-- Draft Section -->
      <div
        @click="toggleStatusFilter('Draft')"
        :class="[
          'flex-1 px-4 py-2 cursor-pointer transition-colors flex items-center justify-center',
          selectedStatusFilter === 'Draft'
            ? 'bg-gray-100 dark:bg-gray-700'
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        ]"
      >
        <div class="flex flex-col items-center text-center">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            Pending ({{ draftStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(draftStats.totalValue) }}
          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div class="w-px bg-gray-200 dark:bg-gray-700"></div>
      
      <!-- For Approval Section -->
      <div
        @click="toggleStatusFilter('Ready')"
        :class="[
          'flex-1 px-4 py-2 cursor-pointer transition-colors flex items-center justify-center',
          selectedStatusFilter === 'Ready'
            ? 'bg-gray-100 dark:bg-gray-700'
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        ]"
      >
        <div class="flex flex-col items-center text-center">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            To be approved ({{ readyStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(readyStats.totalValue) }}
          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div class="w-px bg-gray-200 dark:bg-gray-700"></div>
      
      <!-- To be Raised Section -->
      <div
        @click="toggleStatusFilter('ToBeRaised')"
        :class="[
          'flex-1 px-4 py-2 cursor-pointer transition-colors flex items-center justify-center',
          selectedStatusFilter === 'ToBeRaised'
            ? 'bg-gray-100 dark:bg-gray-700'
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        ]"
      >
        <div class="flex flex-col items-center text-center">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            To be raised ({{ toBeRaisedStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(toBeRaisedStats.totalValue) }}
          </div>
        </div>
      </div>
      </div>
      
      <!-- Add New Button -->
      <UButton
        icon="i-heroicons-plus"
        color="primary"
        size="xs"
        @click="openCreateModal"
      >
        Add new PO
      </UButton>
    </div>

    <!-- Filters -->
    <div v-if="isReady && !loading" class="mb-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div class="flex flex-col sm:flex-row gap-4 items-end">
        <!-- Filters Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_2fr_2fr_2fr_1fr] xl:grid-cols-[2fr_2fr_2fr_2fr_1fr] gap-4 flex-1 items-end">
          <!-- Corporation Filter -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Corporation</label>
            <CorporationSelect
              v-model="filterCorporation"
              placeholder="All Corporations"
              size="sm"
              class="w-full"
            />
          </div>
          
          <!-- Project Filter -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Project</label>
            <ProjectSelect
              v-model="filterProject"
              :corporation-uuid="filterCorporation || undefined"
              placeholder="All Projects"
              size="sm"
              class="w-full"
              :disabled="!filterCorporation"
            />
          </div>
          
          <!-- Vendor Filter -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Vendor</label>
            <VendorSelect
              v-model="filterVendor"
              :corporation-uuid="filterCorporation || selectedCorporationId || undefined"
              placeholder="All Vendors"
              size="sm"
              class="w-full"
              :disabled="!filterCorporation && !selectedCorporationId"
            />
          </div>
          
          <!-- Location Filter -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Location</label>
            <USelect
              v-model="filterLocation"
              :items="uniqueLocations.map(loc => ({ label: loc, value: loc }))"
              placeholder="All Locations"
              size="sm"
              variant="outline"
              clearable
              class="w-full"
            />
          </div>
          
          <!-- Status Filter -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Status</label>
            <USelect
              v-model="filterStatus"
              :items="statusOptions"
              placeholder="All Statuses"
              size="sm"
              variant="outline"
              clearable
              class="w-full"
              :ui="{ content: 'max-h-60 min-w-full w-max' }"
            />
          </div>
        </div>
        
        <!-- Show and Clear Buttons - Stacked -->
        <div class="flex-shrink-0 flex flex-col gap-2">
          <UButton
            color="primary"
            size="sm"
            @click="handleShowResults"
          >
            Show
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            @click="handleClearFilters"
          >
            Clear
          </UButton>
        </div>
      </div>
    </div>

    <!-- Purchase Orders Table -->
    <div v-if="loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Loading skeleton -->
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600" style="grid-template-columns: repeat(13, minmax(0, 1fr));">
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-6" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-24" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-24" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center justify-center">
              <USkeleton class="h-4 w-4 rounded" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center justify-center">
              <USkeleton class="h-4 w-16" />
            </div>
          </div>
        </div>
        
        <!-- Table Body -->
        <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="i in 8" :key="i" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
            <div class="grid grid-cols-13 gap-4 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 border-gray-100 dark:border-gray-700" style="grid-template-columns: repeat(13, minmax(0, 1fr));">
              <div class="flex items-center">
                <USkeleton class="h-4 w-6" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center justify-center">
                <USkeleton class="h-4 w-4 rounded" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-16" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center justify-end gap-1">
                <USkeleton class="h-6 w-6 rounded" />
                <USkeleton class="h-6 w-6 rounded" />
                <USkeleton class="h-6 w-6 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Banner - shown above table without hiding it -->
    <UBanner
      v-if="error && isReady"
      icon="i-heroicons-exclamation-triangle"
      color="error"
      :title="error"
      close
      @close="handleErrorBannerClose"
      class="mb-4"
    />

    <!-- To be Raised Table - Separate from Purchase Orders Table -->
    <!-- Only show when ToBeRaised status filter is active -->
    <!-- Hide when items table is loading to avoid duplicate loading spinners -->
    <div v-if="selectedStatusFilter === 'ToBeRaised' && isReady && hasPermission('po_view') && !loadingItemsTable" class="mb-6">
      <UCard variant="soft" class="mb-4">
        <div v-if="!appliedFilters.corporation || !appliedFilters.project || !appliedFilters.vendor" class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <p class="text-sm text-amber-800 dark:text-amber-200">
              Please select <strong>Corporation</strong>, <strong>Project</strong>, and <strong>Vendor</strong> from the filters above and click "Show Results" to view items to be raised.
            </p>
          </div>
        </div>
        
        <div v-else>
          <!-- Loading state - only show when toBeRaisedItems is loading (not itemsTableData) -->
          <div v-if="loadingToBeRaisedItems" class="text-center py-12">
            <div class="text-gray-400 mb-4">
              <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 mx-auto animate-spin" />
            </div>
            <p class="text-gray-500 text-lg">Loading items...</p>
            <p class="text-gray-400 text-sm">Fetching items to be raised</p>
          </div>
          <!-- Table with data -->
          <UTable
            v-else-if="toBeRaisedItems.length > 0"
            :data="toBeRaisedItems"
            :columns="toBeRaisedColumns"
            :loading="false"
          />
          <!-- Empty state - only show when not loading and no data -->
          <div v-else-if="itemsTableData.length === 0" class="text-center py-12">
            <div class="text-gray-400 mb-4">
              <UIcon name="i-heroicons-document-text" class="w-12 h-12 mx-auto" />
            </div>
            <p class="text-gray-500 text-lg">No items to be raised</p>
            <p class="text-gray-400 text-sm">No items found for the selected project and vendor</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Items Table - Show when filters are applied and data exists or is loading -->
    <!-- Only show on ToBeRaised screen when filters are applied -->
    <div v-if="selectedStatusFilter === 'ToBeRaised' && (itemsTableData.length > 0 || loadingItemsTable) && hasPermission('po_view') && isReady && appliedFilters.corporation && appliedFilters.project" class="mb-6">
      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-x-auto">
        <!-- Loading State -->
        <div v-if="loadingItemsTable && itemsTableData.length === 0" class="text-center py-12">
          <div class="text-gray-400 mb-4">
            <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 mx-auto animate-spin" />
          </div>
          <p class="text-gray-500 text-lg">Loading items...</p>
          <p class="text-gray-400 text-sm">Fetching project items summary</p>
        </div>
        <!-- Table with Data -->
        <UTable
          ref="itemsTable"
          v-else-if="itemsTableData.length > 0"
          sticky
          v-model:column-pinning="itemsTableColumnPinning"
          :data="itemsTableData"
          :columns="itemsTableColumns"
          :loading="loadingItemsTable"
          v-model:selected="selectedItemsTableRows"
          :selectable="true"
          class="w-full overflow-x-auto"
          :ui="{
            td: 'p-4 text-sm text-muted whitespace-normal break-words',
            tr: 'h-auto'
          }"
        />
      </div>
    </div>

    <!-- Purchase Orders Table - Show when NOT on ToBeRaised screen -->
    <!-- On Summary screen: always show table with filters applied directly -->
    <!-- On other status screens: show table with status filter applied -->
    <div v-if="selectedStatusFilter !== 'ToBeRaised' && purchaseOrders.length && hasPermission('po_view') && isReady">
      <UTable 
        ref="table"
        sticky
        v-model:column-pinning="columnPinning"
        v-model:expanded="expanded"
        :data="filteredPurchaseOrders" 
        :columns="columns"
        v-model:selected="selectedPurchaseOrders"
        :selectable="true"
        :watch-options="{ deep: false }"
      >
        <template #expanded="{ row }">
          <!-- Don't show breakdown for labor purchase orders -->
          <div v-if="String(row.original.po_type || '').toUpperCase() !== 'LABOR'">
            <POBreakdown :po-uuid="row.original.uuid" :po-data="row.original" />
          </div>
        </template>
      </UTable>
    </div>

    <div v-else-if="!hasPermission('po_view') && isReady" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-lock-closed" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg">Access Denied</p>
      <p class="text-gray-400 text-sm">You don't have permission to view purchase orders</p>
    </div>

    <div v-else-if="selectedStatusFilter !== 'ToBeRaised' && isReady && (selectedStatusFilter === null || !appliedFilters.corporation || !appliedFilters.project || itemsTableData.length === 0)" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-shopping-cart" class="w-12 h-12 mx-auto" />
      </div>
      <!-- On Summary screen: show message based on filter inputs -->
      <!-- On other screens: show message based on applied filters -->
      <p v-if="(selectedStatusFilter === null && (!filterCorporation || !filterProject)) || (selectedStatusFilter !== null && (!appliedFilters.corporation || !appliedFilters.project))" class="text-gray-500 text-lg">Please select Corporation and Project from the filters above to view purchase orders</p>
      <template v-else>
        <p class="text-gray-500 text-lg">No purchase orders found</p>
        <p class="text-gray-400 text-sm mb-6">No purchase orders match the selected filters</p>
      </template>
      <UButton 
        v-if="hasPermission('po_create') && ((selectedStatusFilter === null && (!filterCorporation || !filterProject)) || (selectedStatusFilter !== null && (!appliedFilters.corporation || !appliedFilters.project)))"
        icon="i-heroicons-plus" 
        @click="openCreateModal"
      >
        Add Purchase Order
      </UButton>
    </div>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" :title="'Delete Purchase Order'">
      <template #body>
        <div class="p-6">
          <div class="flex items-center mb-4">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-500 mr-3" />
            <div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Delete Purchase Order</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
            </div>
          </div>
          
          <div v-if="poToDelete" class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
            <p class="text-sm text-gray-700 dark:text-gray-300">
              <strong>PO Number:</strong> {{ poToDelete.po_number || 'N/A' }}<br>
              <strong>Entry Date:</strong> {{ formatDate(poToDelete.entry_date) }}<br>
              <strong>Type:</strong> {{ poToDelete.po_type || 'N/A' }}<br>
              <strong>Total Amount:</strong> {{ formatCurrency(poToDelete.total_po_amount || 0) }}<br>
              <strong>Status:</strong> {{ poToDelete.status || 'Draft' }}
            </p>
          </div>
          
          <p class="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this purchase order? This will permanently remove the purchase order and all associated data.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="soft" @click="cancelDelete">
            Cancel
          </UButton>
          <UButton color="error" @click="confirmDelete">
            Delete Purchase Order
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Create/Edit/View Purchase Order Modal -->
    <UModal v-model:open="showFormModal" :title="formModalTitle" fullscreen scrollable>
      <template #header>
        <div class="flex items-center justify-between w-full gap-4">
          <div class="flex items-center gap-4 flex-shrink-0">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ formModalTitle }}
            </h3>
            <span
              class="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium border"
              :class="statusChipClass"
            >
              {{ statusLabel }}
            </span>
          </div>

          <!-- Print Button in Center -->
          <div class="flex-1 flex justify-center min-w-0">
            <UButton
              v-if="poForm.uuid"
              color="info"
              variant="solid"
              icon="i-heroicons-printer"
              size="sm"
              @click="handlePrintPurchaseOrder"
            >
              Print
            </UButton>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <!-- View Audit Log Button -->
            <UButton
              v-if="poForm.uuid && hasPermission('po_view')"
              icon="i-heroicons-shield-check-solid"
              color="info"
              variant="outline"
              size="sm"
              @click="showAuditLogModal = true"
            >
              View Audit Log
            </UButton>
            <div class="flex items-center gap-2">
              <UButton
                v-if="isViewMode && hasPermission('po_edit') && poForm.value?.status !== 'Approved'"
                type="button"
                color="primary"
                icon="tdesign:edit-filled"
                size="sm"
                @click="switchToEditMode"
              >
                Edit Purchase Order
              </UButton>

              <!-- Approval buttons for Ready status -->
              <template v-if="!isViewMode && showApprovalButtons">
                <UButton
                  data-testid="btn-reject-draft"
                  color="error"
                  variant="soft"
                  icon="i-heroicons-arrow-uturn-left"
                  size="sm"
                  :disabled="savingPO || !isFormValid"
                  :loading="savingPO"
                  @click="handleRejectToDraft"
                >
                  Reject
                </UButton>
                <UButton
                  data-testid="btn-approve-raise"
                  color="primary"
                  variant="solid"
                  icon="i-heroicons-arrow-up-circle"
                  size="sm"
                  :disabled="savingPO || !isFormValid"
                  :loading="savingPO"
                  @click="handleApproveAndRaise"
                >
                  Approve
                </UButton>
              </template>

              <!-- Regular save buttons for Draft and other statuses -->
              <template v-else-if="!isViewMode && showAnySaveButtons">
                <UTooltip
                  v-if="showSaveDraftButton && isReadOnlyStatus"
                  text="This purchase order contains received items and cannot be edited. All fields are read-only."
                >
                  <UButton
                    v-if="showSaveDraftButton"
                    data-testid="btn-save-draft"
                    :color="saveDraftButtonColor"
                    :variant="saveDraftButtonVariant"
                    :icon="saveDraftButtonIcon"
                    size="sm"
                    :disabled="isEstimateImportBlocked || isSaveDraftButtonDisabled || !isFormValid"
                    :loading="savingPO"
                    @click="handleSaveAsDraft"
                  >
                    {{ saveDraftButtonLabel }}
                  </UButton>
                </UTooltip>
                <UButton
                  v-else-if="showSaveDraftButton"
                  data-testid="btn-save-draft"
                  :color="saveDraftButtonColor"
                  :variant="saveDraftButtonVariant"
                  :icon="saveDraftButtonIcon"
                  size="sm"
                  :disabled="isEstimateImportBlocked || savingPO || !isFormValid"
                  :loading="savingPO"
                  @click="handleSaveAsDraft"
                >
                  {{ saveDraftButtonLabel }}
                </UButton>
                <UButton
                  v-if="showMarkReadyButton"
                  data-testid="btn-ready"
                  color="primary"
                  variant="solid"
                  icon="i-heroicons-paper-airplane"
                  size="sm"
                  :disabled="isEstimateImportBlocked || savingPO || !isFormValid"
                  :loading="savingPO"
                  @click="handleMarkReady"
                >
                  Send for Approval
                </UButton>
              </template>
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
        <PurchaseOrderForm
          v-model:form="poForm"
          :editing-purchase-order="!!poForm.uuid"
          :loading="loadingEditPO"
          :readonly="isViewMode || isReadOnlyStatus"
          @estimate-import-blocked-change="isEstimateImportBlocked = $event"
          @validation-change="isFormValid = $event"
        />
      </template>
    </UModal>

    <!-- Audit Log Modal -->
    <UModal 
      v-model:open="showAuditLogModal" 
      title="Purchase Order Audit Log"
      :description="`View the complete audit trail for ${poForm.po_number || 'this purchase order'}`"
      size="2xl"
      :ui="{ body: 'p-6' }"
    >
      <template #body>
        <div class="space-y-4">
          <!-- Audit Timeline -->
          <PurchaseOrderAuditTimeline 
            :audit-log="poForm.audit_log || []"
            :purchase-order-uuid="poForm.uuid || ''"
            @logs-loaded="onAuditLogsLoaded"
            @error="onAuditLogError"
          />
        </div>
      </template>

      <template #footer>
        <div class="flex justify-between items-center">
          <div class="text-sm text-gray-500">
            <span v-if="auditLogsCount > 0">{{ auditLogsCount }} audit entries</span>
            <span v-else>No audit entries</span>
          </div>
          <div class="flex gap-2">
            <UButton 
              color="neutral" 
              variant="solid" 
              @click="showAuditLogModal = false"
            >
              Close
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Exceeded Quantity Confirmation Modal -->
    <UModal v-model:open="showExceededQuantityModal" title="Items Exceeding Estimate">
      <template #header>
        <div class="flex items-center justify-between w-full gap-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Items Exceeding Estimate
          </h3>
          <UTooltip text="Close Modal" color="neutral">
            <UButton
              color="neutral"
              variant="solid"
              icon="i-heroicons-x-mark"
              size="sm"
              @click="closeExceededQuantityModal"
            />
          </UTooltip>
        </div>
      </template>
      <template #body>
        <div class="p-6">
          <div class="flex items-center mb-4">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-warning-500 mr-3" />
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Some items have values that exceed the estimated values.
            </p>
          </div>

          <div v-if="exceededItems.length" class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
            <div class="space-y-2">
              <div
                v-for="(item, index) in exceededItems"
                :key="index"
                class="text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0"
              >
                <div class="font-medium">
                  {{ item.item_type === 'labor' 
                    ? (item.cost_code_label || item.cost_code_name || `Cost Code ${index + 1}`)
                    : (item.name || item.description || `Item ${index + 1}`)
                  }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1" v-if="item.item_type === 'labor'">
                  Estimate Amount: {{ formatCurrency(item.labor_budgeted_amount || item.estimate_amount || 0) }} | 
                  PO Amount: {{ formatCurrency(item.po_amount || 0) }} | 
                  Exceeded: <span class="font-semibold text-warning-600">{{ formatCurrency(item.exceeded_amount || 0) }}</span>
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1" v-else>
                  Estimate Qty: {{ item.estimate_quantity }} | 
                  Already Used: {{ item.used_quantity || 0 }} | 
                  PO Qty: {{ item.po_quantity }} | 
                  Total: {{ item.total_quantity || item.po_quantity }} | 
                  Exceeded: <span class="font-semibold text-warning-600">{{ item.exceeded_quantity }}</span>
                </div>
              </div>
            </div>
          </div>

          <p class="text-gray-600 dark:text-gray-400 mb-4">
            Would you like to:
          </p>
          <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-1">
            <li><strong>Continue saving</strong> - Save the purchase order as is with exceeded values</li>
            <li><strong>Raise a change order</strong> - Create a change order for the exceeded values</li>
          </ul>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="warning" variant="solid" @click="handleContinueSavingPO">
            Save PO with exceeded values
          </UButton>
          <UButton color="primary" variant="solid" @click="handleRaiseChangeOrder">
            Raise CO for exceeded values
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Change Order Form Modal (for exceeded quantities) -->
    
    <!-- Floating Action Button - Show when rows are selected -->
    <!-- Positioned outside all conditional divs to ensure it's always visible regardless of scrolling -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="selectedItemsTableRowsCount > 0"
        class="fixed bottom-6 right-6 z-[9999]"
        style="position: fixed !important; bottom: 1.5rem !important; right: 1.5rem !important;"
      >
        <UButton
          color="primary"
          size="lg"
          icon="i-heroicons-plus-circle"
          @click="handleRaisePurchaseOrderForPendingQty"
        >
          Raise purchase order for pending QTY
        </UButton>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, watch, onMounted, nextTick, useTemplateRef, resolveComponent } from "vue";
import { useRouter } from 'vue-router'
import PurchaseOrderForm from '@/components/PurchaseOrders/PurchaseOrderForm.vue'
import PurchaseOrderAuditTimeline from '@/components/PurchaseOrders/PurchaseOrderAuditTimeline.vue'
import { useCorporationStore } from '@/stores/corporations'
import { usePurchaseOrdersStore } from '@/stores/purchaseOrders'
import { useTableStandard } from '@/composables/useTableStandard'
import { useDateFormat } from '@/composables/useDateFormat'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import { useUTCDateFormat } from '@/composables/useUTCDateFormat'
import { usePermissions } from '@/composables/usePermissions'
import type { TableColumn } from '@nuxt/ui'
import { usePurchaseOrderResourcesStore } from '@/stores/purchaseOrderResources'
import { useChangeOrdersStore } from '@/stores/changeOrders'
import { usePurchaseOrderPrint } from '@/composables/usePurchaseOrderPrint'
import { useProjectsStore } from '@/stores/projects'
import { useVendorStore } from '@/stores/vendors'
import { useShipViaStore } from '@/stores/freight'
import { useProjectAddressesStore } from '@/stores/projectAddresses'
import ProjectSelect from '@/components/Shared/ProjectSelect.vue'
import VendorSelect from '@/components/Shared/VendorSelect.vue'
import CorporationSelect from '@/components/Shared/CorporationSelect.vue'
import POBreakdown from '@/components/PurchaseOrders/POBreakdown.vue'
import { usePurchaseOrderListResourcesStore } from '@/stores/purchaseOrderListResources'
import { useProjectItemsSummary } from '@/composables/useProjectItemsSummary'

// Resolve components for table columns
const UButton = resolveComponent('UButton')
const UTooltip = resolveComponent('UTooltip')
const UIcon = resolveComponent('UIcon')
const UBadge = resolveComponent('UBadge')
const UPopover = resolveComponent('UPopover')

// Router
const router = useRouter()

// Stores
const corporationStore = useCorporationStore()
const purchaseOrdersStore = usePurchaseOrdersStore()
const changeOrdersStore = useChangeOrdersStore()
const projectsStore = useProjectsStore()
const vendorStore = useVendorStore()
const shipViaStore = useShipViaStore()
const projectAddressesStore = useProjectAddressesStore()
const { formatDate } = useDateFormat()
const { formatCurrency, formatCurrencyAbbreviated } = useCurrencyFormat()
const { toUTCString, getCurrentLocal } = useUTCDateFormat()

// Use permissions composable
const { hasPermission, isReady } = usePermissions()
const purchaseOrderResourcesStore = usePurchaseOrderResourcesStore()
const purchaseOrderListResourcesStore = usePurchaseOrderListResourcesStore()
const { openPurchaseOrderPrint } = usePurchaseOrderPrint()

// Table functionality
const {
  pagination,
  paginationOptions,
  pageSizeOptions,
  updatePageSize,
  getPaginationProps,
  getPageInfo,
  shouldShowPagination
} = useTableStandard()

// Data state
const selectedPurchaseOrders = ref<any[]>([])
const selectedStatusFilter = ref<string | null>(null)
// Filter state (temporary - not applied until Show Results is clicked)
const filterCorporation = ref<string | undefined>(undefined)
const filterProject = ref<string | undefined>(undefined)
const filterVendor = ref<string | undefined>(undefined)
const filterLocation = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)
// Applied filters (only applied when Show Results is clicked)
const appliedFilters = ref({
  corporation: undefined as string | undefined,
  project: undefined as string | undefined,
  vendor: undefined as string | undefined,
  location: undefined as string | undefined,
  status: undefined as string | undefined
})
// Expanded rows state
const expanded = ref<Record<string, boolean>>({})
const poItemsCache = ref<Record<string, { items: any[], loading: boolean, error: string | null }>>({})
const showDeleteModal = ref(false)
const poToDelete = ref<any>(null)
const showFormModal = ref(false)
const isViewMode = ref(false)
const poForm = ref<any>({
  po_items: [],
  attachments: [],
  removed_po_items: []
})
const savingPO = ref(false)
const loadingEditPO = ref(false)
const loadingRowUuid = ref<string | null>(null)
const isEstimateImportBlocked = ref(false)
const isFormValid = ref(true) // Track form validation state
const showExceededQuantityModal = ref(false)
const showAuditLogModal = ref(false)
const auditLogsCount = ref(0)
const exceededItems = ref<any[]>([])
const pendingSaveAction = ref<(() => Promise<void>) | null>(null)
const savingCO = ref(false)

// Column pinning for sticky actions column
const columnPinning = ref({
  left: [],
  right: ['actions']
});

// Table ref for accessing table API
const table = useTemplateRef<any>('table');
// Items table ref for accessing items table API
const itemsTable = useTemplateRef<any>('itemsTable');

// Use purchase orders from store
const purchaseOrders = computed(() => purchaseOrdersStore.purchaseOrders)
const loading = computed(() => purchaseOrdersStore.loading)
// Only show error alert for fetch errors, not delete operation errors
// Delete errors are handled via toast notifications
const error = computed(() => {
  const storeError = purchaseOrdersStore.error
  // Don't show error alert for delete-related errors (they're handled via toast)
  if (storeError && (storeError.includes('delete') || storeError.includes('Cannot delete'))) {
    return null
  }
  return storeError
})
const canEdit = computed(() => hasPermission('po_edit') || hasPermission('po_create'))
const canApprove = computed(() => hasPermission('po_approve'))

// Check if PO status should make the form read-only
const isReadOnlyStatus = computed(() => {
  const status = String(poForm.value?.status || '').toLowerCase()
  // Form should be read-only for Approved, Partially_Received, or Completed statuses
  return status === 'approved' || status === 'partially_received' || status === 'completed'
})

const formModalTitle = computed(() => {
  if (isViewMode.value) return 'View Purchase Order'
  return poForm.value?.uuid ? 'Edit Purchase Order' : 'New Purchase Order'
})

// Approval button visibility
const showApprovalButtons = computed(() => {
  if (isViewMode.value) return false
  if (!poForm.value?.uuid) return false
  if (!canApprove.value) return false
  
  // Don't show approval buttons if status is Partially_Received or Completed
  const status = String(poForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return false
  }
  
  // Only show approval buttons when status is Ready
  return poForm.value.status === 'Ready'
})

const showSaveDraftButton = computed(() => {
  if (isViewMode.value) return false
  if (!canEdit.value) return false
  
  // Show locked button if status is Partially_Received or Completed
  const status = String(poForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return true
  }
  
  // If editing an Approved PO, only approvers can save as draft (unapprove)
  if (poForm.value?.uuid && poForm.value.status === 'Approved') {
    return canApprove.value
  }
  
  return true
})

const showMarkReadyButton = computed(() => {
  if (isViewMode.value) return false
  if (!canEdit.value) return false
  
  // Don't show if status is Partially_Received or Completed
  const status = String(poForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return false
  }
  
  // Don't show if status is already Ready or Approved
  if (poForm.value.status === 'Ready' || poForm.value.status === 'Approved') {
    return false
  }
  
  return true
})

const showAnySaveButtons = computed(() => 
  !showApprovalButtons.value && (showSaveDraftButton.value || showMarkReadyButton.value)
)

const saveDraftButtonLabel = computed(() => {
  const status = String(poForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return 'Locked'
  }
  if (poForm.value?.uuid && poForm.value.status === 'Approved') {
    return 'Reject'
  }
  return 'Save'
})

const saveDraftButtonIcon = computed(() => {
  const status = String(poForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return 'i-heroicons-lock-closed'
  }
  if (poForm.value?.uuid && poForm.value.status === 'Approved') {
    return 'i-heroicons-arrow-uturn-left'
  }
  return 'i-heroicons-document'
})

const saveDraftButtonColor = computed(() => {
  const status = String(poForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return 'warning'
  }
  if (poForm.value?.uuid && poForm.value.status === 'Approved') {
    return 'error'
  }
  return 'primary'
})

const saveDraftButtonVariant = computed((): 'solid' => {
  return 'solid'
})

const isSaveDraftButtonDisabled = computed(() => {
  if (savingPO.value) return true
  const status = String(poForm.value?.status || '').toLowerCase()
  if (status === 'partially_received' || status === 'completed') {
    return true
  }
  return false
})

// Computed
const selectedCorporationId = computed(() => corporationStore.selectedCorporationId)

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

// Ship via lookup
// Latest estimate for the current project
const latestEstimate = computed(() => {
  const corpUuid = poForm.value?.corporation_uuid || appliedFilters.value.corporation
  const projectUuid = poForm.value?.project_uuid || appliedFilters.value.project
  
  if (!corpUuid || !projectUuid) return null
  
  const estimates = purchaseOrderResourcesStore.getEstimatesByProject(corpUuid, projectUuid) || []
  
  // Get the latest approved estimate
  const latest = estimates
    .filter((est: any) => est.status === 'Approved' && est.is_active !== false)
    .sort((a: any, b: any) => {
      const dateA = a.estimate_date ? new Date(a.estimate_date).getTime() : 0
      const dateB = b.estimate_date ? new Date(b.estimate_date).getTime() : 0
      return dateB - dateA
    })[0]
  
  return latest || null
})

const shipViaNameByUuid = computed<Record<string, string>>(() => {
  const list = shipViaStore.getAllShipVia || []
  const map: Record<string, string> = {}
  list.forEach((sv: any) => { 
    if (sv?.uuid) {
      map[sv.uuid] = sv.ship_via || sv.uuid
    }
  })
  return map
})

// Address popover state - track which PO's popover is open
const shippingAddressPopoverOpen = ref<Record<string, boolean>>({})

// Status stats computed properties
const allPOStats = computed(() => {
  return {
    count: purchaseOrders.value.length,
    totalValue: purchaseOrders.value.reduce((sum, po) => sum + (Number(po.total_po_amount) || 0), 0)
  }
})

const draftStats = computed(() => {
  const draftPOs = purchaseOrders.value.filter(p => (p.status || 'Draft') === 'Draft')
  return {
    count: draftPOs.length,
    totalValue: draftPOs.reduce((sum, p) => sum + (Number(p.total_po_amount) || 0), 0)
  }
})

const readyStats = computed(() => {
  const readyPOs = purchaseOrders.value.filter(p => p.status === 'Ready')
  return {
    count: readyPOs.length,
    totalValue: readyPOs.reduce((sum, p) => sum + (Number(p.total_po_amount) || 0), 0)
  }
})

const toBeRaisedStats = computed(() => {
  // To be raised = Draft status POs that need to be raised to Ready
  const toBeRaisedPOs = purchaseOrders.value.filter(p => (p.status || 'Draft') === 'Draft')
  return {
    count: toBeRaisedPOs.length,
    totalValue: toBeRaisedPOs.reduce((sum, p) => sum + (Number(p.total_po_amount) || 0), 0)
  }
})

const approvedStats = computed(() => {
  const approvedPOs = purchaseOrders.value.filter(p => p.status === 'Approved')
  return {
    count: approvedPOs.length,
    totalValue: approvedPOs.reduce((sum, p) => sum + (Number(p.total_po_amount) || 0), 0)
  }
})

const rejectedStats = computed(() => {
  const rejectedPOs = purchaseOrders.value.filter(p => p.status === 'Rejected')
  return {
    count: rejectedPOs.length,
    totalValue: rejectedPOs.reduce((sum, p) => sum + (Number(p.total_po_amount) || 0), 0)
  }
})

// Get unique values for filter dropdowns
const uniqueProjects = computed(() => {
  const projects = new Map<string, { uuid: string; name: string }>()
  purchaseOrders.value.forEach(po => {
    if (po.project_uuid && po.project_name) {
      projects.set(po.project_uuid, { uuid: po.project_uuid, name: po.project_name })
    }
  })
  return Array.from(projects.values()).sort((a, b) => a.name.localeCompare(b.name))
})

const uniqueVendors = computed(() => {
  const vendors = new Map<string, { uuid: string; name: string }>()
  purchaseOrders.value.forEach(po => {
    if (po.vendor_uuid && po.vendor_name) {
      vendors.set(po.vendor_uuid, { uuid: po.vendor_uuid, name: po.vendor_name })
    }
  })
  return Array.from(vendors.values()).sort((a, b) => a.name.localeCompare(b.name))
})

const uniqueLocations = computed(() => {
  const locations = new Set<string>()
  purchaseOrders.value.forEach(po => {
    if (po.po_items && Array.isArray(po.po_items)) {
      po.po_items.forEach((item: any) => {
        if (item.location) {
          locations.add(item.location)
        }
      })
    }
    // Also check shipping address if available
    if ((po as any).shipping_address_custom) {
      locations.add((po as any).shipping_address_custom)
    }
  })
  return Array.from(locations).sort()
})

const statusOptions = [
  { label: 'Pending', value: 'Draft' },
  { label: 'To be approved', value: 'Ready' },
  { label: 'Purchase order approved', value: 'Approved' },
  { label: 'Purchase order rejected', value: 'Rejected' },
  { label: 'Partially Received', value: 'Partially_Received' },
  { label: 'Completed', value: 'Completed' }
]

const filteredPurchaseOrders = computed(() => {
  let filtered = [...purchaseOrders.value]
  
  // Apply status filter from stats cards if selected
  if (selectedStatusFilter.value) {
    if (selectedStatusFilter.value === 'ToBeRaised') {
      // To be raised = Draft status POs
      filtered = filtered.filter(p => (p.status || 'Draft') === 'Draft')
    } else {
      filtered = filtered.filter(p => p.status === selectedStatusFilter.value)
    }
  }
  
  // Determine which filter values to use:
  // - On Summary screen (selectedStatusFilter === null): use filter inputs directly for immediate filtering
  // - On other screens: use appliedFilters (set when "Show Results" is clicked)
  const useFilterInputs = selectedStatusFilter.value === null || selectedStatusFilter.value === undefined
  
  const activeCorporation = useFilterInputs ? filterCorporation.value : appliedFilters.value.corporation
  const activeProject = useFilterInputs ? filterProject.value : appliedFilters.value.project
  const activeVendor = useFilterInputs ? filterVendor.value : appliedFilters.value.vendor
  const activeLocation = useFilterInputs ? filterLocation.value : appliedFilters.value.location
  const activeStatus = useFilterInputs ? filterStatus.value : appliedFilters.value.status
  
  // Apply filter panel filters
  if (activeCorporation) {
    filtered = filtered.filter(p => p.corporation_uuid === activeCorporation)
  }
  
  if (activeProject) {
    filtered = filtered.filter(p => p.project_uuid === activeProject)
  }
  
  if (activeVendor) {
    filtered = filtered.filter(p => p.vendor_uuid === activeVendor)
  }
  
  if (activeLocation) {
    filtered = filtered.filter(p => {
      // Check if any PO item has this location
      if (p.po_items && Array.isArray(p.po_items)) {
        return p.po_items.some((item: any) => item.location === activeLocation)
      }
      // Or check shipping address
      return (p as any).shipping_address_custom === activeLocation
    })
  }
  
  if (activeStatus) {
    filtered = filtered.filter(p => p.status === activeStatus)
  }
  
  return filtered
})

// Items table data (for the main Show button functionality)
const selectedItemsTableRows = ref<Record<string, boolean>>({})

// Computed property to get the count of selected rows
const selectedItemsTableRowsCount = computed(() => {
  if (!itemsTable.value?.tableApi) {
    return Object.keys(selectedItemsTableRows.value).filter(key => selectedItemsTableRows.value[key]).length
  }
  // Use table API if available
  return itemsTable.value.tableApi.getFilteredSelectedRowModel().rows.length
})

// Column pinning for items table (pin quantity columns to the right)
// Order matters: columns are pinned from left to right in the array
const itemsTableColumnPinning = ref({
  left: [],
  right: ['budget_qty', 'po_qty', 'pending_qty']
})

// To be Raised items state
const toBeRaisedItems = ref<any[]>([])
const loadingToBeRaisedItems = ref(false)

// Project Items Summary composable
const projectItemsSummary = useProjectItemsSummary()
const itemsTableData = computed(() => {
  const items = projectItemsSummary.data.value?.items || []
  // Debug: Log to see if data is available
  if (items.length > 0) {
    console.log('itemsTableData has data:', items.length, 'items')
  }
  return items
})
const loadingItemsTable = computed(() => projectItemsSummary.loading.value)

// Show Results button handler
const handleShowResults = async () => {
  appliedFilters.value = {
    corporation: filterCorporation.value,
    project: filterProject.value,
    vendor: filterVendor.value,
    location: filterLocation.value,
    status: filterStatus.value
  }
  
  // Fetch projects for the selected corporation if not already loaded
  if (appliedFilters.value.corporation) {
    await purchaseOrderListResourcesStore.ensureProjects({
      corporationUuid: appliedFilters.value.corporation,
      force: false
    })
  }
  
  // If ToBeRaised is selected and corporation, project, and vendor are set, fetch items
  if (selectedStatusFilter.value === 'ToBeRaised' && appliedFilters.value.corporation && appliedFilters.value.project && appliedFilters.value.vendor) {
    fetchToBeRaisedItems()
  }
  
  // Fetch items table data when filters are applied (for main table view)
  // Always fetch when corporation and project are set (regardless of status filter)
  if (appliedFilters.value.corporation && appliedFilters.value.project) {
    await fetchItemsTableData()
  }
}

// Clear Filters button handler
const handleClearFilters = () => {
  // Clear all filter inputs
  filterCorporation.value = undefined
  filterProject.value = undefined
  filterVendor.value = undefined
  filterLocation.value = undefined
  filterStatus.value = undefined
  
  // Clear applied filters
  appliedFilters.value = {
    corporation: undefined,
    project: undefined,
    vendor: undefined,
    location: undefined,
    status: undefined
  }
  
  // Clear status filter (return to summary view)
  selectedStatusFilter.value = null
  
  // Clear items table data
  projectItemsSummary.data.value = { items: [] }
  
  // Clear to be raised items
  toBeRaisedItems.value = []
}

// Fetch items to be raised based on corporation, project and vendor
const fetchToBeRaisedItems = async () => {
  if (!appliedFilters.value.corporation || !appliedFilters.value.project || !appliedFilters.value.vendor) {
    toBeRaisedItems.value = []
    return
  }
  
  loadingToBeRaisedItems.value = true
  try {
    // TODO: Replace with actual API endpoint for fetching items to be raised
    // This is a placeholder - you'll need to implement the actual API call
    // based on your business logic for what "items to be raised" means
    const corporationUuid = appliedFilters.value.corporation || selectedCorporationId.value
    const response: any = await $fetch('/api/items-to-be-raised', {
      method: 'GET',
      query: {
        corporation_uuid: corporationUuid,
        project_uuid: appliedFilters.value.project,
        vendor_uuid: appliedFilters.value.vendor
      }
    })
    
    toBeRaisedItems.value = Array.isArray(response?.data) ? response.data : []
  } catch (error: any) {
    console.error('Error fetching items to be raised:', error)
    toBeRaisedItems.value = []
    // Optionally show error toast
    try {
      const toast = useToast()
      toast.add({
        title: 'Error',
        description: 'Failed to load items to be raised',
        color: 'error'
      })
    } catch (e) {
      // Toast not available
    }
  } finally {
    loadingToBeRaisedItems.value = false
  }
}

// To be Raised table columns
const toBeRaisedColumns: TableColumn<any>[] = [
  {
    accessorKey: 'cost_code_label',
    header: 'Cost Code',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.cost_code_label || 'N/A')
  },
  {
    accessorKey: 'item_name',
    header: 'Item Name',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.item_name || row.original.description || 'N/A')
  },
  {
    accessorKey: 'description',
    header: 'Description',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.description || 'N/A')
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
    enableSorting: false,
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }: { row: { original: any } }) => {
      const qty = row.original.quantity || 0
      return h('div', { class: 'text-right' }, String(qty))
    }
  },
  {
    accessorKey: 'unit_price',
    header: 'Unit Price',
    enableSorting: false,
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }: { row: { original: any } }) => {
      const price = row.original.unit_price || 0
      return h('div', { class: 'text-right font-mono text-sm' }, formatCurrency(price))
    }
  },
  {
    accessorKey: 'total',
    header: 'Total',
    enableSorting: false,
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }: { row: { original: any } }) => {
      const total = row.original.total || 0
      return h('div', { class: 'text-right font-mono text-sm font-semibold' }, formatCurrency(total))
    }
  }
]

// Fetch items table data (estimate items with PO quantities)
const fetchItemsTableData = async () => {
  if (!appliedFilters.value.corporation || !appliedFilters.value.project) {
    console.log('fetchItemsTableData: Missing filters', { corporation: appliedFilters.value.corporation, project: appliedFilters.value.project })
    return
  }
  
  try {
    // Use the composable's fetch method which will update the reactive data
    const result = await projectItemsSummary.fetchProjectItemsSummary(
      appliedFilters.value.corporation,
      appliedFilters.value.project,
      appliedFilters.value.vendor || undefined,
      appliedFilters.value.location || undefined
    )
    console.log('fetchItemsTableData: Result', { result, itemsCount: result?.items?.length || 0, dataValue: projectItemsSummary.data.value })
  } catch (error: any) {
    console.error('Error fetching items table data:', error)
    try {
      const toast = useToast()
      toast.add({
        title: 'Error',
        description: error.data?.statusMessage || error.message || 'Failed to load items data',
        color: 'error'
      })
    } catch (e) {
      // Toast not available
    }
  }
}

// Transform selected items to PO items format
const transformSelectedItemsToPoItems = (selectedItems: any[]): any[] => {
  console.log('[transformSelectedItemsToPoItems] Transforming items:', selectedItems.length, 'items');
  if (selectedItems.length > 0) {
    console.log('[transformSelectedItemsToPoItems] Sample item from API:', {
      item_uuid: selectedItems[0]?.item_uuid,
      item_name: selectedItems[0]?.item_name,
      model_number: selectedItems[0]?.model_number,
      hasModelNumber: selectedItems[0]?.model_number !== undefined,
      keys: Object.keys(selectedItems[0] || {})
    });
  }
  
  return selectedItems.map((item: any, index: number) => {
    const pendingQty = parseFloat(item.pending_qty || 0) || 0
    const unitPrice = parseFloat(item.unit_price || 0) || 0
    const poTotal = pendingQty > 0 && unitPrice > 0 ? Math.round((pendingQty * unitPrice + Number.EPSILON) * 100) / 100 : null
    
    const modelNumber = item.model_number || "";
    if (index === 0) {
      console.log('[transformSelectedItemsToPoItems] Setting model_number for first item:', modelNumber);
    }
    
    return {
      id: `pending-${index}-${item.item_uuid || item.cost_code_uuid || index}`,
      cost_code_uuid: item.cost_code_uuid || null,
      cost_code_number: item.cost_code_number || "",
      cost_code_name: item.cost_code_name || "",
      cost_code_label: item.cost_code_label || "",
      division_name: item.division_name || "",
      item_type_uuid: item.item_type_uuid || null,
      item_type_label: item.item_type_label || "",
      sequence: item.sequence || "",
      item_sequence: item.sequence || "",
      sequence_uuid: item.sequence_uuid || null,
      item_uuid: item.item_uuid || null,
      name: item.item_name || "",
      description: item.description || "",
      location: item.location || "",
      location_uuid: item.location_uuid || null,
      // Estimate values (for display in greyed out section)
      unit_price: unitPrice,
      quantity: parseFloat(item.budget_qty || 0) || 0,
      total: unitPrice * parseFloat(item.budget_qty || 0) || 0,
      // PO values (editable, initialized with pending_qty)
      po_unit_price: unitPrice > 0 ? unitPrice : null,
      po_quantity: pendingQty > 0 ? pendingQty : null,
      po_total: poTotal,
      uom_uuid: item.unit_uuid || null,
      uom_label: item.unit_label || "",
      unit_label: item.unit_label || "",
      uom: item.unit_label || "",
      unit_uuid: item.unit_uuid || null,
      approval_checks: null,
      model_number: modelNumber,
      display_metadata: {
        cost_code_label: item.cost_code_label || "",
        cost_code_number: item.cost_code_number || "",
        cost_code_name: item.cost_code_name || "",
        division_name: item.division_name || "",
        item_type_label: item.item_type_label || "",
        sequence: item.sequence || "",
        location_display: item.location || "",
        unit_uuid: item.unit_uuid || null,
        unit_label: item.unit_label || "",
      },
    }
  })
}

// Handle raising purchase order for selected items with pending quantity
const handleRaisePurchaseOrderForPendingQty = async () => {
  if (selectedItemsTableRowsCount.value === 0) {
    return
  }
  
  // Get the selected items using the table API if available
  let selectedItems: any[] = []
  
  if (itemsTable.value?.tableApi) {
    // Use table API to get selected rows
    const selectedRows = itemsTable.value.tableApi.getFilteredSelectedRowModel().rows
    selectedItems = selectedRows.map((row: any) => row.original)
  } else {
    // Fallback: use the selection state object
    const selectedIndices = Object.keys(selectedItemsTableRows.value)
      .filter(key => selectedItemsTableRows.value[key])
      .map(key => parseInt(key))
    
    selectedItems = itemsTableData.value.filter((item: any, index: number) => 
      selectedIndices.includes(index)
    )
  }
  
  if (selectedItems.length === 0) {
    return
  }
  
  // Get vendor UUID from filters or first selected item
  const vendorUuid = appliedFilters.value.vendor || selectedItems[0]?.vendor_uuid || null
  
  // Validate required filters
  if (!appliedFilters.value.corporation || !appliedFilters.value.project) {
    try {
      const toast = useToast()
      toast.add({
        title: 'Error',
        description: 'Please select corporation and project before creating a purchase order',
        color: 'error'
      })
    } catch (e) {
      // Toast not available
    }
    return
  }
  
  // Transform selected items to PO items format
  const poItems = transformSelectedItemsToPoItems(selectedItems)
  
  // Clear previous PO resources before opening new form
  purchaseOrderResourcesStore.clear()
  
  // Fetch vendors, estimates, and estimate items BEFORE opening the modal
  // This ensures the vendor name loads immediately and estimate items are available
  try {
    await Promise.allSettled([
      vendorStore.fetchVendors(appliedFilters.value.corporation),
      // Also fetch project addresses if needed
      projectAddressesStore.fetchAddresses(appliedFilters.value.project),
      // Fetch estimates for the project (required for IMPORT_ITEMS_FROM_ESTIMATE mode)
      purchaseOrderResourcesStore.ensureEstimates({
        corporationUuid: appliedFilters.value.corporation,
        force: true,
      }),
    ])
    
    // After estimates are loaded, fetch estimate items if we have an estimate UUID
    // This ensures the form doesn't try to fetch them again when it opens
    const estimates = purchaseOrderResourcesStore.getEstimatesByProject(
      appliedFilters.value.corporation,
      appliedFilters.value.project
    ) || []
    
    // Get the latest approved estimate
    const latestEstimate = estimates
      .filter((est: any) => est.status === 'Approved' && est.is_active !== false)
      .sort((a: any, b: any) => {
        const dateA = a.estimate_date ? new Date(a.estimate_date).getTime() : 0
        const dateB = b.estimate_date ? new Date(b.estimate_date).getTime() : 0
        return dateB - dateA
      })[0]
    
    if (latestEstimate?.uuid) {
      // Pre-fetch estimate items so they're available when the form opens
      await purchaseOrderResourcesStore.ensureEstimateItems({
        corporationUuid: appliedFilters.value.corporation,
        projectUuid: appliedFilters.value.project,
        estimateUuid: latestEstimate.uuid,
        force: true,
      })
    }
  } catch (error) {
    console.error('Error fetching vendors, addresses, or estimates:', error)
    // Continue anyway - the form will handle loading in onMounted
  }
  
  // Initialize form with pre-filled data
  poForm.value = {
    corporation_uuid: appliedFilters.value.corporation,
    project_uuid: appliedFilters.value.project,
    vendor_uuid: vendorUuid,
    entry_date: toUTCString(getCurrentLocal()),
    po_type: 'MATERIAL',
    po_type_uuid: 'MATERIAL',
    credit_days: '',
    ship_via: '',
    freight: '',
    shipping_instructions: '',
    estimated_delivery_date: '',
    include_items: 'IMPORT_ITEMS_FROM_ESTIMATE', // Set to IMPORT_ITEMS_FROM_ESTIMATE since items are from estimates
    terms_and_conditions: 'Not Required',
    status: 'Draft',
    item_total: 0,
    freight_charges_percentage: 0,
    freight_charges_amount: 0,
    freight_charges_taxable: false,
    packing_charges_percentage: 0,
    packing_charges_amount: 0,
    packing_charges_taxable: false,
    custom_duties_percentage: 0,
    custom_duties_amount: 0,
    custom_duties_taxable: false,
    other_charges_percentage: 0,
    other_charges_amount: 0,
    other_charges_taxable: false,
    charges_total: 0,
    sales_tax_1_percentage: 0,
    sales_tax_1_amount: 0,
    sales_tax_2_percentage: 0,
    sales_tax_2_amount: 0,
    tax_total: 0,
    total_po_amount: 0,
    po_items: poItems, // Pre-populate with selected items
    attachments: [],
    removed_po_items: []
  }
  
  // Reset validation state
  isFormValid.value = false
  isViewMode.value = false
  
  // Open the form modal
  showFormModal.value = true
  
  // Clear selected rows after opening the form
  selectedItemsTableRows.value = {}
}

// Items Table columns (for the main Show button functionality)
const itemsTableColumns: TableColumn<any>[] = [
  {
    id: 'select',
    header: ({ table }: { table: any }) => {
      const UCheckbox = resolveComponent('UCheckbox')
      const isAllSelected = table.getIsAllPageRowsSelected()
      const isSomeSelected = table.getIsSomePageRowsSelected()
      return h(UCheckbox, {
        modelValue: isAllSelected ? true : isSomeSelected ? 'indeterminate' : false,
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => {
          table.toggleAllPageRowsSelected(!!value)
        },
        'aria-label': 'Select all'
      })
    },
    enableSorting: false,
    enableHiding: false,
    meta: { class: { th: 'w-12', td: 'w-12' } },
    cell: ({ row }: { row: any }) => {
      const UCheckbox = resolveComponent('UCheckbox')
      return h(UCheckbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => {
          row.toggleSelected(!!value)
        },
        'aria-label': 'Select row'
      })
    }
  },
  {
    accessorKey: 'corporation_name',
    header: 'Corporation',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.corporation_name || 'N/A')
  },
  {
    accessorKey: 'project_name',
    header: 'Project',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.project_name || 'N/A')
  },
  {
    accessorKey: 'cost_code_label',
    header: 'Cost Code',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.cost_code_label || 'N/A')
  },
  {
    accessorKey: 'vendor_name',
    header: 'Vendor',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.vendor_name || 'N/A')
  },
  {
    accessorKey: 'sequence',
    header: 'Sequence',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.sequence || 'N/A')
  },
  {
    accessorKey: 'item_type_label',
    header: 'Type',
    enableSorting: false,
    size: 100,
    meta: { 
      class: { 
        th: 'text-left', 
        td: 'text-left break-words' 
      } 
    },
    cell: ({ row }: { row: { original: any } }) => h('div', { 
      class: 'break-words',
      style: { minWidth: '80px', maxWidth: '100px' }
    }, row.original.item_type_label || 'N/A')
  },
  {
    accessorKey: 'item_name',
    header: 'Item',
    enableSorting: false,
    size: 150,
    meta: { 
      class: { 
        th: 'text-left', 
        td: 'text-left break-words' 
      } 
    },
    cell: ({ row }: { row: { original: any } }) => h('div', { 
      class: 'break-words',
      style: { minWidth: '120px', maxWidth: '150px' }
    }, row.original.item_name || row.original.description || 'N/A')
  },
  {
    accessorKey: 'description',
    header: 'Description',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.description || 'N/A')
  },
  {
    accessorKey: 'location',
    header: 'Location',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.location || 'N/A')
  },
  {
    id: 'budget_qty',
    accessorKey: 'budget_qty',
    header: 'Budget Qty',
    enableSorting: false,
    size: 120,
    meta: { 
      class: { th: 'text-right whitespace-nowrap', td: 'text-right whitespace-nowrap' }
    },
    cell: ({ row }: { row: { original: any } }) => {
      const qty = row.original.budget_qty || 0
      return h('div', { class: 'text-right' }, String(qty))
    }
  },
  {
    id: 'po_qty',
    accessorKey: 'po_qty',
    header: 'PO Qty',
    enableSorting: false,
    size: 120,
    meta: { 
      class: { th: 'text-right whitespace-nowrap', td: 'text-right whitespace-nowrap' }
    },
    cell: ({ row }: { row: { original: any } }) => {
      const qty = row.original.po_qty || 0
      return h('div', { class: 'text-right' }, String(qty))
    }
  },
  {
    id: 'pending_qty',
    accessorKey: 'pending_qty',
    header: 'Pending Qty',
    enableSorting: false,
    size: 120,
    meta: { 
      class: { th: 'text-right whitespace-nowrap', td: 'text-right whitespace-nowrap' }
    },
    cell: ({ row }: { row: { original: any } }) => {
      const qty = row.original.pending_qty || 0
      return h('div', { class: 'text-right' }, String(qty))
    }
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    enableSorting: false,
    size: 100,
    meta: { 
      class: { th: 'text-left whitespace-nowrap', td: 'text-left whitespace-nowrap' }
    },
    cell: ({ row }: { row: { original: any } }) => {
      const status = row.original.status || 'Pending'
      const isPartial = status === 'Partial'
      return h(UBadge, {
        color: isPartial ? 'warning' : 'orange',
        variant: 'solid',
        size: 'sm'
      }, () => status)
    }
  }
]

// Table columns configuration
const columns: TableColumn<any>[] = [
  {
    id: 'expand',
    header: '',
    enableSorting: false,
    cell: ({ row }: { row: { original: any; id?: string } }) => {
      // Don't show expand button for labor purchase orders
      const poType = String(row.original.po_type || '').toUpperCase()
      const isLaborPO = poType === 'LABOR'
      
      if (isLaborPO) {
        // Return empty div for labor POs
        return h('div', { class: 'w-6' }) // Maintain spacing
      }
      
      const rowId = (row.id || row.original.uuid) as string
      const isExpanded = expanded.value[rowId] || false
      return h(UButton, {
        color: 'primary',
        variant: isExpanded ? 'solid' : 'soft',
        icon: isExpanded ? 'i-heroicons-chevron-down-solid' : 'i-heroicons-chevron-right-solid',
        size: 'xs',
        square: true,
        class: 'transition-transform',
        onClick: () => {
          expanded.value[rowId] = !expanded.value[rowId]
          // Fetch PO items when expanding
          if (expanded.value[rowId] && row.original.uuid) {
            fetchPOItemsForRow(row.original.uuid)
          }
        }
      })
    }
  },
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
    accessorKey: 'po_number',
    header: 'PO Number',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-medium text-default' }, row.original.po_number || 'N/A')
  },
  {
    accessorKey: 'project_name',
    header: 'Project Name',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.project_name || 'N/A')
  },
  {
    accessorKey: 'project_id',
    header: 'Project Number',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.project_id || 'N/A')
  },
  {
    accessorKey: 'vendor_name',
    header: 'Vendor Name',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.vendor_name || 'N/A')
  },
  {
    accessorKey: 'entry_date',
    header: 'Entry Date',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', formatDate(row.original.entry_date))
  },
  {
    accessorKey: 'ship_via_uuid',
    header: 'Shipped Via',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const uuid = row.original.ship_via_uuid
      const label = uuid ? (shipViaNameByUuid.value[uuid] || row.original.ship_via || 'N/A') : (row.original.ship_via || 'N/A')
      return h('div', label)
    }
  },
  {
    accessorKey: 'shipping_address_uuid',
    header: 'Shipped To',
    enableSorting: false,
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }: { row: { original: any } }) => {
      const poUuid = row.original.uuid
      const shippingAddressUuid = row.original.shipping_address_uuid
      const isOpen = shippingAddressPopoverOpen.value[poUuid] || false
      
      if (!shippingAddressUuid) {
        return h('div', { class: 'flex justify-center' }, 'N/A')
      }
      
      return h('div', { class: 'flex justify-center' }, [
        h(UPopover, {
          open: isOpen,
          'onUpdate:open': (value: boolean) => {
            shippingAddressPopoverOpen.value[poUuid] = value
            if (value && shippingAddressUuid) {
              // Lazy load shipping address when popover opens
              loadShippingAddress(shippingAddressUuid, row.original.project_uuid)
            }
          }
        }, {
          default: () => h(UButton, {
            icon: 'i-heroicons-map-pin',
            size: 'xs',
            variant: 'ghost',
            color: 'neutral',
            class: 'hover:scale-105 transition-transform'
          }),
          content: () => renderShippingAddressPopover(shippingAddressUuid, row.original.project_uuid)
        })
      ])
    }
  },
  {
    accessorKey: 'po_type',
    header: 'PO Type',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.po_type || 'N/A')
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const rawStatus = row.original.status || 'Draft';
      // Normalize status for case-insensitive matching (handle both Partially_Received and Partially_received)
      const normalizedStatus = String(rawStatus).toLowerCase();
      
      const statusMap: Record<string, { label: string; color: string }> = {
        draft: {
          label: 'Pending',
          color: 'warning'
        },
        ready: {
          label: 'To be approved',
          color: 'primary'
        },
        approved: {
          label: 'Purchase order approved',
          color: 'success'
        },
        rejected: {
          label: 'Purchase order rejected',
          color: 'error'
        },
        partially_received: {
          label: 'Partially Received',
          color: 'info'
        },
        completed: {
          label: 'Completed',
          color: 'success'
        }
      };
      
      const config = statusMap[normalizedStatus] ?? {
        label: rawStatus,
        color: 'neutral'
      };
      
      return h(UBadge, {
        color: config.color,
        variant: 'soft',
        size: 'sm'
      }, () => config.label)
    }
  },
  {
    accessorKey: 'total_po_amount',
    header: 'Total Amount',
    enableSorting: false,
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }: { row: { original: any } }) => {
      const amount = row.original.total_po_amount || 0;
      const formattedAmount = formatCurrency(amount);
      return h('div', { class: 'text-right font-mono text-sm' }, formattedAmount);
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
    meta: { class: { th: 'text-right sticky right-0 z-10 w-32', td: 'text-right sticky right-0 w-32' } },
    cell: ({ row }: { row: { original: any } }) => {
      const isRowLoading = loadingRowUuid.value === row.original.uuid
      const buttons = [];
      
      if (isRowLoading) {
        buttons.push(
          h(UIcon, {
            name: 'i-heroicons-arrow-path',
            class: 'w-4 h-4 animate-spin text-primary'
          })
        )
      } else {
        // View button - show if user has view permission
        if (hasPermission('po_view')) {
          buttons.push(
            h(UTooltip, { text: 'View Purchase Order Details' }, () => [
              h(UButton, {
                icon: 'i-heroicons-eye-solid',
                size: 'xs',
                variant: 'soft',
                color: 'neutral',
                class: 'hover:scale-105 transition-transform',
                onClick: () => previewPurchaseOrder(row.original)
              }, () => '')
            ])
          );
        }
        
        // Edit button - show if user has edit permission
        if (hasPermission('po_edit')) {
          buttons.push(
            h(UTooltip, { text: 'Edit Purchase Order' }, () => [
              h(UButton, {
                icon: 'tdesign:edit-filled',
                size: 'xs',
                variant: 'soft',
                color: 'secondary',
                class: 'hover:scale-105 transition-transform',
                onClick: () => editPurchaseOrder(row.original)
              }, () => '')
            ])
          );
        }
        
        // Delete button - show if user has delete permission
        if (hasPermission('po_delete')) {
          buttons.push(
            h(UTooltip, { text: 'Delete Purchase Order' }, () => [
              h(UButton, {
                icon: 'mingcute:delete-fill',
                size: 'xs',
                variant: 'soft',
                color: 'error',
                class: 'hover:scale-105 transition-transform',
                onClick: () => deletePurchaseOrder(row.original)
              }, () => '')
            ])
          );
        }
      }
      
      return h('div', { class: 'flex justify-end space-x-2 items-center' }, buttons);
    }
  }
];

// Methods
const toggleStatusFilter = (status: string) => {
  if (selectedStatusFilter.value === status) {
    selectedStatusFilter.value = null
  } else {
    selectedStatusFilter.value = status
    // If switching to ToBeRaised, fetch items when corporation, project and vendor are selected
    if (status === 'ToBeRaised' && appliedFilters.value.corporation && appliedFilters.value.project && appliedFilters.value.vendor) {
      fetchToBeRaisedItems()
    }
  }
}

const clearStatusFilter = () => {
  selectedStatusFilter.value = null
  // Also clear all filters when clicking on summary
  handleClearFilters()
}

// Status display helpers for form modal
const statusLabel = computed(() => {
  const map: Record<string, string> = {
    draft: 'Pending',
    ready: 'To be approved',
    approved: 'Purchase order approved',
    rejected: 'Purchase order rejected',
    partially_received: 'Partially Received',
    completed: 'Completed',
  };
  const status = String(poForm.value?.status || 'Draft').toLowerCase();
  return map[status] || poForm.value?.status || 'Draft';
});

const statusChipClass = computed(() => {
  const map: Record<string, string> = {
    draft:
      'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600',
    ready:
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
    approved:
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
    rejected:
      'bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
    partially_received:
      'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900 dark:text-cyan-200 dark:border-cyan-700',
    completed:
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
  };
  const status = String(poForm.value?.status || 'Draft').toLowerCase();
  return map[status] || map.draft;
});

const getStatusBadgeColor = (status: string | undefined): string => {
  const statusMap: Record<string, string> = {
    Draft: 'gray',
    Ready: 'blue',
    Approved: 'green',
    Rejected: 'red',
    Partially_Received: 'cyan',
    Completed: 'green',
  };
  return statusMap[status || 'Draft'] || 'gray';
};

// Audit log handlers
const onAuditLogsLoaded = (logs: any[]) => {
  auditLogsCount.value = logs.length
}

const onAuditLogError = (error: string) => {
  console.error('Audit log error:', error)
  const toast = useToast()
  toast.add({
    title: 'Error',
    description: error || 'Failed to load audit log',
    color: 'error',
    icon: 'i-heroicons-x-circle'
  })
}

// Purchase orders are fetched by TopBar.vue when corporation changes
// This component just reads from the store reactively

const openCreateModal = () => {
  if (!hasPermission('po_create')) {
    try {
      const toast = useToast();
      toast.add({
        title: "Access Denied",
        description: "You don't have permission to create purchase orders.",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
    } catch (error) {
      // Error showing toast
    }
    return;
  }
  
  // Clear previous PO resources before opening new form
  purchaseOrderResourcesStore.clear()
  
  poForm.value = {
    corporation_uuid: corporationStore.selectedCorporationId,
    entry_date: toUTCString(getCurrentLocal()),
    po_type: '',
    po_type_uuid: '',
    credit_days: '',
    ship_via: '',
    freight: '',
    shipping_instructions: '',
    estimated_delivery_date: '',
    include_items: '',
    terms_and_conditions: 'Not Required',
    status: 'Draft',
    item_total: 0,
    freight_charges_percentage: 0,
    freight_charges_amount: 0,
    freight_charges_taxable: false,
    packing_charges_percentage: 0,
    packing_charges_amount: 0,
    packing_charges_taxable: false,
    custom_duties_percentage: 0,
    custom_duties_amount: 0,
    custom_duties_taxable: false,
    other_charges_percentage: 0,
    other_charges_amount: 0,
    other_charges_taxable: false,
    charges_total: 0,
    sales_tax_1_percentage: 0,
    sales_tax_1_amount: 0,
    sales_tax_2_percentage: 0,
    sales_tax_2_amount: 0,
    tax_total: 0,
    total_po_amount: 0,
    po_items: [],
    attachments: [],
    removed_po_items: []
  }
  // Reset validation state - form will be invalid initially
  isFormValid.value = false
  showFormModal.value = true
}

const loadPurchaseOrderForModal = async (po: any, viewMode: boolean = false) => {
  if (!po?.uuid) {
    return
  }

  // Clear previous PO resources before loading a different PO
  purchaseOrderResourcesStore.clear()

  // Set initial form data from row
  poForm.value = { ...po }
  isViewMode.value = viewMode
  
  // Open modal immediately
  showFormModal.value = true
  loadingEditPO.value = true
  loadingRowUuid.value = po.uuid
  
  try {
    const detailed = await purchaseOrdersStore.fetchPurchaseOrder(po.uuid)
    if (!detailed) {
      const toast = useToast();
      toast.add({
        title: "Error",
        description: "Failed to load purchase order details.",
        color: "error",
      });
      return;
    }

    poForm.value = {
      ...detailed,
      po_type: detailed.po_type || "",
      po_type_uuid: detailed.po_type_uuid || "",
      credit_days: detailed.credit_days || "",
      include_items: detailed.include_items || "",
      po_items: detailed.po_items || [],
      attachments: detailed.attachments || [],
      removed_po_items: detailed.removed_po_items || [],
      audit_log: Array.isArray(detailed.audit_log) ? detailed.audit_log : [],
    };
  } catch (error) {
    const toast = useToast();
    toast.add({
      title: "Error",
      description: "Failed to load purchase order details.",
      color: "error",
    });
  } finally {
    loadingEditPO.value = false;
    loadingRowUuid.value = null;
  }
}

const editPurchaseOrder = async (po: any) => {
  if (!hasPermission('po_edit')) {
    try {
      const toast = useToast();
      toast.add({
        title: "Access Denied",
        description: "You don't have permission to edit purchase orders.",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
    } catch (error) {
      // Error showing toast
    }
    return;
  }
  await loadPurchaseOrderForModal(po, false)
}

const switchToEditMode = () => {
  if (!hasPermission('po_edit')) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to edit purchase orders.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }
  isViewMode.value = false
}

const closeFormModal = () => {
  purchaseOrderResourcesStore.clear()
  showFormModal.value = false
  isViewMode.value = false
  poForm.value = {
    po_items: [],
    attachments: [],
    removed_po_items: []
  }
  loadingEditPO.value = false
  loadingRowUuid.value = null
  // Reset validation state
  isFormValid.value = true
}

// Print handler
const handlePrintPurchaseOrder = () => {
  if (!poForm.value?.uuid) return
  if (!hasPermission('po_view')) {
    const toast = useToast()
    toast.add({
      title: 'Access Denied',
      description: "You don't have permission to view purchase orders.",
      color: 'error',
      icon: 'i-heroicons-x-circle'
    })
    return
  }
  openPurchaseOrderPrint(poForm.value.uuid)
}

// Used quantities tracking for quantity availability checks
const usedQuantitiesByItem = ref<Record<string, number>>({})
const loadingQuantityAvailability = ref(false)

// Fetch used quantities from existing purchase orders for the estimate
const fetchUsedQuantities = async () => {
  const includeItems = String(poForm.value?.include_items || '').toUpperCase()
  const poType = String(poForm.value?.po_type || '').toUpperCase()
  const isLaborPO = poType === 'LABOR'
  
  // Only fetch for material POs importing from estimate or labor POs
  const checkMaterialPOs = includeItems === 'IMPORT_ITEMS_FROM_ESTIMATE'
  const checkLaborPOs = isLaborPO
  
  if (!checkMaterialPOs && !checkLaborPOs) {
    usedQuantitiesByItem.value = {}
    return
  }

  const corpUuid = poForm.value?.corporation_uuid || corporationStore.selectedCorporationId
  const projectUuid = poForm.value?.project_uuid
  const estimateUuid = latestEstimate.value?.uuid

  if (!corpUuid || !projectUuid || !estimateUuid) {
    usedQuantitiesByItem.value = {}
    return
  }

  loadingQuantityAvailability.value = true
  try {
    // Always exclude the current PO if it has a UUID (for both new and existing POs)
    // This ensures that when checking quantities, we don't double-count the current PO
    const excludePoUuid = poForm.value?.uuid || null
    
    // Debug logging
    console.log('[fetchUsedQuantities]', {
      excludePoUuid,
      poFormUuid: poForm.value?.uuid,
      hasUuid: !!poForm.value?.uuid,
    })
    
    const response: any = await $fetch("/api/estimate-quantity-availability", {
      method: "GET",
      query: {
        corporation_uuid: corpUuid,
        project_uuid: projectUuid,
        estimate_uuid: estimateUuid,
        exclude_po_uuid: excludePoUuid || undefined, // Exclude current PO when editing (use undefined instead of null)
      },
    })

    // Normalize keys to lowercase to match lookup in POItemsTableWithEstimates
    const normalizedData: Record<string, number> = {}
    if (response?.data && typeof response.data === 'object') {
      Object.keys(response.data).forEach((key) => {
        const normalizedKey = String(key).toLowerCase()
        normalizedData[normalizedKey] = response.data[key]
      })
    }
    usedQuantitiesByItem.value = normalizedData
  } catch (error: any) {
    console.error("Failed to fetch used quantities:", error)
    usedQuantitiesByItem.value = {}
  } finally {
    loadingQuantityAvailability.value = false
  }
}

// Check for items exceeding estimate quantities
const checkForExceededQuantities = async (): Promise<{ hasExceeded: boolean; items: any[] }> => {
  const includeItems = String(poForm.value?.include_items || '').toUpperCase()
  const poType = String(poForm.value?.po_type || '').toUpperCase()
  const isLaborPO = poType === 'LABOR'
  
  // Check material POs when importing from estimate
  const checkMaterialPOs = includeItems === 'IMPORT_ITEMS_FROM_ESTIMATE'
  // Check labor POs - labor POs always use estimate (no raise_against field needed)
  const checkLaborPOs = isLaborPO
  
  // Only check if creating against estimate
  if (!checkMaterialPOs && !checkLaborPOs) {
    return { hasExceeded: false, items: [] }
  }
  
  // Fetch used quantities first
  await fetchUsedQuantities()
  
  // Get estimate items to use as source of truth for estimate quantities
  // This ensures we're using the actual estimate quantities, not potentially modified values from PO items
  const corpUuid = poForm.value?.corporation_uuid || corporationStore.selectedCorporationId
  const projectUuid = poForm.value?.project_uuid
  const estimateUuid = latestEstimate.value?.uuid
  
  // Ensure estimate items are loaded
  if (corpUuid && projectUuid && estimateUuid) {
    await purchaseOrderResourcesStore.ensureEstimateItems({
      corporationUuid: corpUuid,
      projectUuid: projectUuid,
      estimateUuid: estimateUuid,
    })
  }
  
  const estimateItems = purchaseOrderResourcesStore.getEstimateItems(
    corpUuid || '',
    projectUuid || '',
    estimateUuid || ''
  ) || []
  
  // Build a lookup map of estimate items by item_uuid for quick access
  const estimateItemsMap = new Map<string, any>()
  estimateItems.forEach((estItem: any) => {
    if (estItem?.item_uuid) {
      estimateItemsMap.set(String(estItem.item_uuid).toLowerCase(), estItem)
    }
  })
  
  const exceeded: any[] = []
  
  // Check material items - account for used quantities from other POs
  if (checkMaterialPOs) {
    const poItems = Array.isArray(poForm.value?.po_items) ? poForm.value.po_items : []
    
    poItems.forEach((item: any) => {
      const itemUuid = item?.item_uuid
      if (!itemUuid) return
      
      const itemUuidKey = String(itemUuid).toLowerCase()
      
      // Get estimate quantity from estimate items map (source of truth)
      // Fallback to item.quantity only if estimate item is not found
      const estimateItem = estimateItemsMap.get(itemUuidKey)
      const estimateQty = estimateItem 
        ? parseFloat(String(estimateItem.quantity || 0))
        : parseFloat(String(item.quantity || 0))
      
      const poQty = parseFloat(String(item.po_quantity || 0))
      const usedQuantity = usedQuantitiesByItem.value[itemUuidKey] || 0
      const totalQuantity = usedQuantity + poQty
      
      // Debug logging to help identify the issue
      if (totalQuantity > estimateQty && estimateQty > 0) {
        console.log('[PO Quantity Check] Item exceeded:', {
          itemUuid: itemUuid,
          itemUuidKey,
          estimateQty,
          poQty,
          usedQuantity,
          totalQuantity,
          exceeded: totalQuantity - estimateQty,
          excludePoUuid: poForm.value?.uuid,
        })
      }
      
      if (totalQuantity > estimateQty && estimateQty > 0) {
        exceeded.push({
          ...item,
          estimate_quantity: estimateQty,
          po_quantity: poQty,
          used_quantity: usedQuantity,
          total_quantity: totalQuantity,
          exceeded_quantity: totalQuantity - estimateQty,
          item_type: 'material',
        })
      }
    })
  }
  
  // Check labor items - labor POs always use estimate
  if (checkLaborPOs) {
    const laborItems = Array.isArray(poForm.value?.labor_po_items) ? poForm.value.labor_po_items : []
    
    laborItems.forEach((item: any) => {
      const estimateAmount = parseFloat(String(item.labor_budgeted_amount || 0))
      const poAmount = parseFloat(String(item.po_amount || 0))
      
      if (poAmount > estimateAmount && estimateAmount > 0) {
        exceeded.push({
          ...item,
          estimate_amount: estimateAmount,
          labor_budgeted_amount: estimateAmount,
          po_amount: poAmount,
          exceeded_amount: poAmount - estimateAmount,
          item_type: 'labor',
        })
      }
    })
  }
  
  return {
    hasExceeded: exceeded.length > 0,
    items: exceeded,
  }
}

// Status-based save handlers
// All status changes (Draft, Ready, Approved) go through the same validation flow:
// 1. Check for exceeded quantities
// 2. If exceeded, show modal to allow user to raise change order or continue
// 3. If not exceeded, save directly
const submitWithStatus = async (status: 'Draft' | 'Ready' | 'Approved') => {
  if (savingPO.value) return
  
  poForm.value.status = status
  
  // Check for exceeded quantities before saving (for both new and existing POs)
  // This allows users to raise a change order for the difference
  // This validation applies to ALL status changes: Draft, Ready, and Approved
  const { hasExceeded, items } = await checkForExceededQuantities()
  
  if (hasExceeded) {
    exceededItems.value = items
    pendingSaveAction.value = async () => {
      await savePurchaseOrder()
    }
    showExceededQuantityModal.value = true
    return
  }
  
  await savePurchaseOrder()
}

const handleSaveAsDraft = () => submitWithStatus('Draft')
const handleMarkReady = () => submitWithStatus('Ready')

// Approve handler - uses same validation flow as other status changes
const handleApprove = async () => {
  await submitWithStatus('Approved')
}

// Approve and raise handler - uses same validation flow as other status changes
const handleApproveAndRaise = async () => {
  // Approve and potentially trigger additional workflow (e.g., create receipt note)
  await submitWithStatus('Approved')
  // TODO: Add additional logic for "raise" action if needed
  // For now, it just approves like handleApprove
}

// Reject handler - uses same validation flow as other status changes
const handleRejectToDraft = () => submitWithStatus('Draft')

const savePurchaseOrder = async (skipModalClose = false): Promise<any | null> => {
  // Determine the correct corporation_uuid to use
  // For new POs: use poForm.value.corporation_uuid (from form selector) or fallback to TopBar's selected
  // For editing: use poForm.value.corporation_uuid (from form, which should match the loaded PO's corporation)
  // This ensures we save to the correct corporation, not the one selected in TopBar
  let corporationUuid: string | undefined
  if (poForm.value.uuid) {
    // When editing, use the form's corporation_uuid (should match the loaded PO's corporation)
    corporationUuid = poForm.value.corporation_uuid || corporationStore.selectedCorporationId
  } else {
    // When creating new, prioritize form's corporation_uuid (from form selector)
    corporationUuid = poForm.value.corporation_uuid || corporationStore.selectedCorporationId
  }

  if (!corporationUuid) {
    const toast = useToast();
    toast.add({ title: 'Error', description: 'Corporation is required to save purchase order', color: 'error' })
    return null
  }
  
  savingPO.value = true
  try {
    let result = null
    
    if (poForm.value.uuid) {
      // Ensure corporation_uuid is set correctly in the payload
      const payload = { 
        uuid: poForm.value.uuid, 
        ...poForm.value,
        corporation_uuid: corporationUuid, // Explicitly set to ensure correct corporation
        raise_against: poForm.value.raise_against || null, // Explicitly include raise_against
      }
      result = await purchaseOrdersStore.updatePurchaseOrder(payload)
      // Update the form with the returned PO data to ensure it's in sync
      if (result && result.uuid) {
        poForm.value = { ...poForm.value, ...result }
      }
      if (result && !skipModalClose) {
        const toast = useToast();
        toast.add({ 
          title: 'Updated', 
          description: `Purchase order ${poForm.value.status === 'Approved' ? 'approved' : 'updated'} successfully`, 
          color: 'success' 
        })
        
        // Refetch "to be raised" items if we're in ToBeRaised filter mode
        // This updates the table after updating a PO from the "to be raised" screen
        if (
          selectedStatusFilter.value === 'ToBeRaised' &&
          appliedFilters.value.corporation &&
          appliedFilters.value.project &&
          appliedFilters.value.vendor
        ) {
          await fetchToBeRaisedItems()
        }
        
        // Close modal immediately after successful save
        closeFormModal()
      }
    } else {
      // Ensure corporation_uuid is set correctly in the payload
      const payload = { 
        ...poForm.value, 
        corporation_uuid: corporationUuid, // Use form's corporation_uuid, not TopBar's
        raise_against: poForm.value.raise_against || null, // Explicitly include raise_against
      }
      result = await purchaseOrdersStore.createPurchaseOrder(payload)
      // Update the form with the returned PO data (including UUID) so subsequent validations work correctly
      if (result && result.uuid) {
        poForm.value.uuid = result.uuid
        poForm.value = { ...poForm.value, ...result }
      }
      if (result && !skipModalClose) {
        const toast = useToast();
        toast.add({ title: 'Created', description: 'Purchase order created', color: 'success' })
        
        // Refetch items table data if filters are applied (items table is visible)
        // This updates the pending quantities after creating a PO from the items table
        if (appliedFilters.value.corporation && appliedFilters.value.project) {
          await fetchItemsTableData()
        }
        
        // Return to summary screen after successful creation from "to be raised" screen
        // Clear status filter and applied filters to show purchase orders table
        // No need to refetch "to be raised" items since we're navigating away
        const wasOnToBeRaisedScreen = selectedStatusFilter.value === 'ToBeRaised'
        if (
          wasOnToBeRaisedScreen &&
          appliedFilters.value.corporation &&
          appliedFilters.value.project &&
          appliedFilters.value.vendor
        ) {
          // Return to summary screen after successful creation
          // Clear status filter and applied filters to show purchase orders table
          selectedStatusFilter.value = null
          appliedFilters.value = {
            corporation: undefined,
            project: undefined,
            vendor: undefined,
            location: undefined,
            status: undefined
          }
          // Also clear the filter inputs
          filterCorporation.value = undefined
          filterProject.value = undefined
          filterVendor.value = undefined
          filterLocation.value = undefined
          filterStatus.value = undefined
        }
        
        closeFormModal()
      } else if (result) {
        // Even if skipModalClose is true, we should still refetch items table data
        // This handles the case when creating a CO (which calls savePurchaseOrder with skipModalClose=true)
        if (appliedFilters.value.corporation && appliedFilters.value.project) {
          await fetchItemsTableData()
        }
        
        // Also refetch "to be raised" items if applicable
        // Note: We don't clear the status filter here because handleRaiseChangeOrder will handle it
        // after the CO is successfully created
        if (
          selectedStatusFilter.value === 'ToBeRaised' &&
          appliedFilters.value.corporation &&
          appliedFilters.value.project &&
          appliedFilters.value.vendor
        ) {
          await fetchToBeRaisedItems()
        }
      }
    }
    
    if (!result) {
      throw new Error('Failed to save purchase order')
    }
    
    return result
  } catch (e) {
    const toast = useToast();
    toast.add({ title: 'Error', description: 'Failed to save purchase order', color: 'error' })
    return null
  } finally {
    savingPO.value = false
  }
}

const deletePurchaseOrder = (po: any) => {
  if (!hasPermission('po_delete')) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to delete purchase orders.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }
  
  poToDelete.value = po
  showDeleteModal.value = true
}

// Helper function to clean error messages
const getCleanMessage = (msg: string | undefined): string => {
  if (!msg) return ''
  let clean = msg
  // Remove [METHOD] "URL": statusCode patterns like [DELETE] "/api/purchase-orders?uuid=...": 400
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

// Handle error banner close
const handleErrorBannerClose = () => {
  // Clear the error from the store
  purchaseOrdersStore.error = null
}

const confirmDelete = async () => {
  if (!hasPermission('po_delete')) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to delete purchase orders.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }

  if (!poToDelete.value) return

  try {
    const success = await purchaseOrdersStore.deletePurchaseOrder(poToDelete.value.uuid)
    
    if (success) {
      const toast = useToast();
      toast.add({
        title: "Success",
        description: "Purchase order deleted successfully",
        color: "success",
        icon: "i-heroicons-check-circle",
      });
      showDeleteModal.value = false
      poToDelete.value = null
    } else {
      // If deletePurchaseOrder returns false, check the error from the store
      const storeError = purchaseOrdersStore.error || 'Failed to delete purchase order'
      const toast = useToast();
      toast.add({
        title: "Error",
        description: getCleanMessage(storeError) || "Failed to delete purchase order",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
      // Clear the store error after handling it so it doesn't affect the table display
      purchaseOrdersStore.error = null
    }
  } catch (error: any) {
    // Clear the store error after handling it so it doesn't affect the table display
    purchaseOrdersStore.error = null
    
    const toast = useToast();
    let errorDescription = 'Failed to delete purchase order'
    
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
      icon: "i-heroicons-x-circle",
    });
  }
}

const cancelDelete = () => {
  showDeleteModal.value = false
  poToDelete.value = null
}

// Handle exceeded quantity modal actions
const handleContinueSavingPO = async () => {
  showExceededQuantityModal.value = false
  if (pendingSaveAction.value) {
    await pendingSaveAction.value()
    pendingSaveAction.value = null
  }
  exceededItems.value = []
}

const handleRaiseChangeOrder = async () => {
  showExceededQuantityModal.value = false

  // Store the current form data before it gets cleared during PO save
  // This must happen BEFORE calling pendingSaveAction since that clears the form
  // Use deep clone to avoid reactive proxy issues
  const currentFormData = JSON.parse(JSON.stringify(poForm.value))

  // Adjust PO items quantities/amounts to match estimate quantities/amounts before saving
  const exceededItemsList = exceededItems.value
  const currentPoType = String(currentFormData?.po_type || '').toUpperCase()
  const isCurrentLaborPO = currentPoType === 'LABOR'
  
  if (exceededItemsList.length > 0) {
    // Handle material items
    if (!isCurrentLaborPO && Array.isArray(currentFormData.po_items)) {
      // Create a map of exceeded items by item_uuid for quick lookup
      const exceededMap = new Map<string, any>()
      exceededItemsList
        .filter((item: any) => item.item_type !== 'labor')
        .forEach((item: any) => {
          const key = String(item.item_uuid || '').toLowerCase()
          if (key) {
            exceededMap.set(key, item)
          }
        })

      // Update PO items to set po_quantity to available quantity (estimate quantity - used quantity)
      const updatedPoItems = currentFormData.po_items.map((item: any) => {
        const key = String(item.item_uuid || '').toLowerCase()
        const exceededItem = key ? exceededMap.get(key) : null
        
        if (exceededItem) {
          // Set po_quantity to available quantity (estimate quantity - used quantity)
          const estimateQty = parseFloat(String(exceededItem.estimate_quantity || exceededItem.quantity || 0))
          const usedQty = parseFloat(String(exceededItem.used_quantity || 0))
          const availableQty = Math.max(0, estimateQty - usedQty) // Available quantity
          const poUnitPrice = parseFloat(String(item.po_unit_price || item.unit_price || 0))
          const poTotal = Math.round((availableQty * poUnitPrice + Number.EPSILON) * 100) / 100
          
          return {
            ...item,
            po_quantity: availableQty,
            po_total: poTotal, // Recalculate total
          }
        }
        return item
      })
      
      // Calculate new item_total from adjusted material items
      const newItemTotal = updatedPoItems.reduce((sum: number, item: any) => {
        const poTotal = parseFloat(String(item.po_total || 0))
        return sum + poTotal
      }, 0)

      // Round to 2 decimal places
      const roundedItemTotal = Math.round((newItemTotal + Number.EPSILON) * 100) / 100

      // Recalculate charges based on percentages
      const freightPercentage = parseFloat(String(currentFormData.freight_charges_percentage || 0))
      const packingPercentage = parseFloat(String(currentFormData.packing_charges_percentage || 0))
      const customDutiesPercentage = parseFloat(String(currentFormData.custom_duties_percentage || 0))
      const otherChargesPercentage = parseFloat(String(currentFormData.other_charges_percentage || 0))
      
      const freightAmount = Math.round((roundedItemTotal * (freightPercentage / 100) + Number.EPSILON) * 100) / 100
      const packingAmount = Math.round((roundedItemTotal * (packingPercentage / 100) + Number.EPSILON) * 100) / 100
      const customDutiesAmount = Math.round((roundedItemTotal * (customDutiesPercentage / 100) + Number.EPSILON) * 100) / 100
      const otherChargesAmount = Math.round((roundedItemTotal * (otherChargesPercentage / 100) + Number.EPSILON) * 100) / 100
      
      const chargesTotal = freightAmount + packingAmount + customDutiesAmount + otherChargesAmount
      
      // Calculate taxable base (item_total + taxable charges)
      const freightTaxable = poForm.value.freight_charges_taxable || false
      const packingTaxable = poForm.value.packing_charges_taxable || false
      const customDutiesTaxable = poForm.value.custom_duties_taxable || false
      const otherChargesTaxable = poForm.value.other_charges_taxable || false
      
      const taxableBase = roundedItemTotal + 
        (freightTaxable ? freightAmount : 0) +
        (packingTaxable ? packingAmount : 0) +
        (customDutiesTaxable ? customDutiesAmount : 0) +
        (otherChargesTaxable ? otherChargesAmount : 0)
      
      // Calculate taxes
      const salesTax1Percentage = parseFloat(String(poForm.value.sales_tax_1_percentage || 0))
      const salesTax2Percentage = parseFloat(String(poForm.value.sales_tax_2_percentage || 0))
      
      const salesTax1Amount = Math.round((taxableBase * (salesTax1Percentage / 100) + Number.EPSILON) * 100) / 100
      const salesTax2Amount = Math.round((taxableBase * (salesTax2Percentage / 100) + Number.EPSILON) * 100) / 100
      const taxTotal = salesTax1Amount + salesTax2Amount
      
      // Calculate final total
      const totalPoAmount = roundedItemTotal + chargesTotal + taxTotal
      
      // Update financial breakdown
      const currentFinancialBreakdown = poForm.value.financial_breakdown || {}
      const updatedFinancialBreakdown = {
        ...currentFinancialBreakdown,
        charges: {
          freight: {
            percentage: freightPercentage || null,
            amount: freightAmount || null,
            taxable: freightTaxable || false,
          },
          packing: {
            percentage: packingPercentage || null,
            amount: packingAmount || null,
            taxable: packingTaxable || false,
          },
          custom_duties: {
            percentage: customDutiesPercentage || null,
            amount: customDutiesAmount || null,
            taxable: customDutiesTaxable || false,
          },
          other: {
            percentage: otherChargesPercentage || null,
            amount: otherChargesAmount || null,
            taxable: otherChargesTaxable || false,
          },
        },
        sales_taxes: {
          sales_tax_1: {
            percentage: salesTax1Percentage || null,
            amount: salesTax1Amount || null,
          },
          sales_tax_2: {
            percentage: salesTax2Percentage || null,
            amount: salesTax2Amount || null,
          },
        },
        totals: {
          item_total: roundedItemTotal,
          charges_total: chargesTotal,
          tax_total: taxTotal,
          total_po_amount: totalPoAmount,
        },
      }
      
      // Update the form with adjusted quantities and recalculated totals
      poForm.value = {
        ...poForm.value,
        po_items: updatedPoItems,
        item_total: roundedItemTotal,
        freight_charges_amount: freightAmount,
        packing_charges_amount: packingAmount,
        custom_duties_amount: customDutiesAmount,
        other_charges_amount: otherChargesAmount,
        charges_total: chargesTotal,
        sales_tax_1_amount: salesTax1Amount,
        sales_tax_2_amount: salesTax2Amount,
        tax_total: taxTotal,
        total_po_amount: totalPoAmount,
        financial_breakdown: updatedFinancialBreakdown,
      }
    }
    
    // Handle labor items
    if (isCurrentLaborPO && Array.isArray(currentFormData.labor_po_items)) {
      // Create a map of exceeded items by cost_code_uuid for quick lookup
      const exceededMap = new Map<string, any>()
      exceededItemsList
        .filter((item: any) => item.item_type === 'labor')
        .forEach((item: any) => {
          const key = String(item.cost_code_uuid || '').toLowerCase()
          if (key) {
            exceededMap.set(key, item)
          }
        })

      // Update labor PO items to set po_amount to labor_budgeted_amount
      const updatedLaborItems = currentFormData.labor_po_items.map((item: any) => {
        const key = String(item.cost_code_uuid || '').toLowerCase()
        const exceededItem = key ? exceededMap.get(key) : null
        
        if (exceededItem) {
          // Set po_amount to labor_budgeted_amount (estimate amount)
          const estimateAmount = parseFloat(String(exceededItem.labor_budgeted_amount || exceededItem.estimate_amount || 0))
          
          return {
            ...item,
            po_amount: estimateAmount,
          }
        }
        return item
      })
      
      // Calculate new item_total from adjusted labor items
      const newItemTotal = updatedLaborItems.reduce((sum: number, item: any) => {
        const poAmount = parseFloat(String(item.po_amount || 0))
        return sum + poAmount
      }, 0)
      
      // Round to 2 decimal places
      const roundedItemTotal = Math.round((newItemTotal + Number.EPSILON) * 100) / 100
      
      // Recalculate charges based on percentages
      const freightPercentage = parseFloat(String(poForm.value.freight_charges_percentage || 0))
      const packingPercentage = parseFloat(String(poForm.value.packing_charges_percentage || 0))
      const customDutiesPercentage = parseFloat(String(poForm.value.custom_duties_percentage || 0))
      const otherChargesPercentage = parseFloat(String(poForm.value.other_charges_percentage || 0))
      
      const freightAmount = Math.round((roundedItemTotal * (freightPercentage / 100) + Number.EPSILON) * 100) / 100
      const packingAmount = Math.round((roundedItemTotal * (packingPercentage / 100) + Number.EPSILON) * 100) / 100
      const customDutiesAmount = Math.round((roundedItemTotal * (customDutiesPercentage / 100) + Number.EPSILON) * 100) / 100
      const otherChargesAmount = Math.round((roundedItemTotal * (otherChargesPercentage / 100) + Number.EPSILON) * 100) / 100
      
      const chargesTotal = freightAmount + packingAmount + customDutiesAmount + otherChargesAmount
      
      // Calculate taxable base (item_total + taxable charges)
      const freightTaxable = poForm.value.freight_charges_taxable || false
      const packingTaxable = poForm.value.packing_charges_taxable || false
      const customDutiesTaxable = poForm.value.custom_duties_taxable || false
      const otherChargesTaxable = poForm.value.other_charges_taxable || false
      
      const taxableBase = roundedItemTotal + 
        (freightTaxable ? freightAmount : 0) +
        (packingTaxable ? packingAmount : 0) +
        (customDutiesTaxable ? customDutiesAmount : 0) +
        (otherChargesTaxable ? otherChargesAmount : 0)
      
      // Calculate taxes
      const salesTax1Percentage = parseFloat(String(poForm.value.sales_tax_1_percentage || 0))
      const salesTax2Percentage = parseFloat(String(poForm.value.sales_tax_2_percentage || 0))
      
      const salesTax1Amount = Math.round((taxableBase * (salesTax1Percentage / 100) + Number.EPSILON) * 100) / 100
      const salesTax2Amount = Math.round((taxableBase * (salesTax2Percentage / 100) + Number.EPSILON) * 100) / 100
      const taxTotal = salesTax1Amount + salesTax2Amount
      
      // Calculate final total
      const totalPoAmount = roundedItemTotal + chargesTotal + taxTotal
      
      // Update financial breakdown
      const currentFinancialBreakdown = poForm.value.financial_breakdown || {}
      const updatedFinancialBreakdown = {
        ...currentFinancialBreakdown,
        charges: {
          freight: {
            percentage: freightPercentage || null,
            amount: freightAmount || null,
            taxable: freightTaxable || false,
          },
          packing: {
            percentage: packingPercentage || null,
            amount: packingAmount || null,
            taxable: packingTaxable || false,
          },
          custom_duties: {
            percentage: customDutiesPercentage || null,
            amount: customDutiesAmount || null,
            taxable: customDutiesTaxable || false,
          },
          other: {
            percentage: otherChargesPercentage || null,
            amount: otherChargesAmount || null,
            taxable: otherChargesTaxable || false,
          },
        },
        sales_taxes: {
          sales_tax_1: {
            percentage: salesTax1Percentage || null,
            amount: salesTax1Amount || null,
          },
          sales_tax_2: {
            percentage: salesTax2Percentage || null,
            amount: salesTax2Amount || null,
          },
        },
        totals: {
          item_total: roundedItemTotal,
          charges_total: chargesTotal,
          tax_total: taxTotal,
          total_po_amount: totalPoAmount,
        },
      }
      
      // Update the form with adjusted amounts, recalculated totals, and preserved raise_against
      poForm.value = {
        ...poForm.value,
        labor_po_items: updatedLaborItems,
        item_total: roundedItemTotal,
        freight_charges_amount: freightAmount,
        packing_charges_amount: packingAmount,
        custom_duties_amount: customDutiesAmount,
        other_charges_amount: otherChargesAmount,
        charges_total: chargesTotal,
        sales_tax_1_amount: salesTax1Amount,
        sales_tax_2_amount: salesTax2Amount,
        tax_total: taxTotal,
        total_po_amount: totalPoAmount,
        financial_breakdown: updatedFinancialBreakdown,
        raise_against: poForm.value.raise_against || null, // Explicitly preserve raise_against
      }
    }
  }
  
  // First, save the PO to get the UUID (skip modal close since we're creating CO)
  let savedPo: any = null
  
  // Check if PO is already saved (has UUID)
  if (currentFormData.uuid) {
    // PO is already saved, use currentFormData but we'll still fetch to get complete data
    savedPo = { uuid: currentFormData.uuid }
  } else if (pendingSaveAction.value) {
    // PO needs to be saved
    try {
      // Call savePurchaseOrder directly with skipModalClose=true to get the returned PO
      savedPo = await savePurchaseOrder(true)
      
      if (!savedPo || !savedPo.uuid) {
        throw new Error('Failed to save purchase order or get UUID')
      }
    } catch (error) {
      const toast = useToast()
      toast.add({
        title: 'Error',
        description: 'Failed to save purchase order. Cannot create change order.',
        color: 'error',
      })
      return
    }
  } else {
    // No pending save action and no UUID - need to save the PO
    try {
      savedPo = await savePurchaseOrder(true)
      if (!savedPo || !savedPo.uuid) {
        throw new Error('Failed to save purchase order or get UUID')
      }
    } catch (error) {
      const toast = useToast()
      toast.add({
        title: 'Error',
        description: 'Failed to save purchase order. Cannot create change order.',
        color: 'error',
      })
      return
    }
  }
  
  // Refetch the saved purchase order using its UUID to get all the complete data
  // Start with currentFormData which has all the form fields, then merge with fetched data
  let poData: any = { ...currentFormData } // Start with form data
  
  if (savedPo?.uuid && corporationStore.selectedCorporationId) {
    try {
      const detailed = await purchaseOrdersStore.fetchPurchaseOrder(savedPo.uuid)
      if (detailed) {
        // Cast to any to access all properties
        const detailedAny = detailed as any
        // Merge fetched data (from DB) with currentFormData (from form)
        // Fetched data has the UUID and all DB fields, form data has user-entered values
        poData = {
          ...currentFormData, // Start with form data
          ...detailedAny, // Override with DB data (includes UUID and all fields)
          // Ensure critical fields are set
          uuid: detailedAny.uuid,
          corporation_uuid: detailedAny.corporation_uuid || currentFormData.corporation_uuid,
          project_uuid: detailedAny.project_uuid || currentFormData.project_uuid,
          vendor_uuid: detailedAny.vendor_uuid || currentFormData.vendor_uuid,
          credit_days: detailedAny.credit_days || currentFormData.credit_days,
          ship_via_uuid: detailedAny.ship_via_uuid || currentFormData.ship_via_uuid,
          freight_uuid: detailedAny.freight_uuid || currentFormData.freight_uuid,
          shipping_address_uuid: detailedAny.shipping_address_uuid || currentFormData.shipping_address_uuid,
          terms_and_conditions_uuid: detailedAny.terms_and_conditions_uuid || currentFormData.terms_and_conditions_uuid,
          po_type: detailedAny.po_type || currentFormData.po_type || "",
          po_type_uuid: detailedAny.po_type_uuid || currentFormData.po_type_uuid || "",
          include_items: detailedAny.include_items || currentFormData.include_items || "",
          raise_against: detailedAny.raise_against || currentFormData.raise_against || null,
          po_items: detailedAny.po_items || currentFormData.po_items || [],
          labor_po_items: detailedAny.labor_po_items || currentFormData.labor_po_items || [],
          attachments: detailedAny.attachments || currentFormData.attachments || [],
          removed_po_items: detailedAny.removed_po_items || currentFormData.removed_po_items || [],
        }
      } else {
        poData = {
          ...currentFormData,
          ...savedPo,
          uuid: savedPo.uuid, // Ensure UUID is set
        }
      }
    } catch (error) {
      // Merge saved PO with currentFormData as fallback
      poData = {
        ...currentFormData,
        ...savedPo,
        uuid: savedPo?.uuid || currentFormData.uuid,
      }
    }
  } else if (savedPo) {
    // Use saved PO merged with currentFormData if we have it but couldn't fetch detailed
    poData = {
      ...currentFormData,
      ...savedPo,
      uuid: savedPo.uuid,
    }
  } else {
    // Use currentFormData as-is, but it won't have UUID
  }
  
  const exceeded = exceededItems.value
  const changeOrderPoType = String(poData?.po_type || '').toUpperCase()
  const isChangeOrderLaborPO = changeOrderPoType === 'LABOR'
  
  // Generate CO number
  const existingCOs = changeOrdersStore.changeOrders || []
  let maxSeq = 0
  const re = /^CO-(\d+)$/i
  existingCOs.forEach((co: any) => {
    const match = String(co?.co_number || '').match(re)
    if (match) {
      const seq = parseInt(match[1]!)
      if (!Number.isNaN(seq)) maxSeq = Math.max(maxSeq, seq)
    }
  })
  const nextCONumber = `CO-${maxSeq + 1}`
  
  // Separate material and labor items
  const materialExceeded = exceeded.filter((item: any) => item.item_type !== 'labor')
  const laborExceeded = exceeded.filter((item: any) => item.item_type === 'labor')
  
  // Prepare change order items from exceeded quantities (for material POs)
  // Include all fields from the original PO item to ensure proper display
  const coItems = materialExceeded.map((item: any) => {
    // Get cost code info from display_metadata or item itself
    const display = item?.display_metadata || item?.metadata || {}
    const costCodeNumber = display.cost_code_number || item.cost_code_number || ''
    const costCodeName = display.cost_code_name || item.cost_code_name || ''
    const costCodeLabel = display.cost_code_label || item.cost_code_label || [costCodeNumber, costCodeName].filter(Boolean).join(' ').trim()
    
    // Get unit info
    const unitLabel = display.unit_label || item.unit_label || item.uom_label || item.unit || item.uom || ''
    const unitUuid = item.uom_uuid || item.unit_uuid || display.unit_uuid || null
    
    // Get location info
    const locationLabel = display.location_display || item.location || ''
    const locationUuid = item.location_uuid || display.location_uuid || null
    
    // Get item type info
    const itemTypeLabel = display.item_type_label || item.item_type_label || ''
    const itemTypeUuid = item.item_type_uuid || display.item_type_uuid || null
    
    // Original estimate values (for display in CO form)
    const estimateQuantity = item.estimate_quantity || item.quantity || 0
    const estimateUnitPrice = item.unit_price || 0
    const estimateTotal = estimateQuantity * estimateUnitPrice
    
    // CO values (exceeded portion)
    // Use the PO unit price, defaulting to 0 if not available
    const coUnitPrice = parseFloat(String(item.po_unit_price ?? item.unit_price ?? 0)) || 0
    const coQuantity = parseFloat(String(item.exceeded_quantity ?? 0)) || 0
    const coTotal = coQuantity * coUnitPrice
    
    return {
      cost_code_uuid: item.cost_code_uuid || null,
      cost_code_number: costCodeNumber || null,
      cost_code_name: costCodeName || null,
      cost_code_label: costCodeLabel || null,
      division_name: display.division_name || item.division_name || null,
      item_type_uuid: itemTypeUuid,
      item_type_label: itemTypeLabel || null,
      item_uuid: item.item_uuid || null,
      name: item.name || item.item_name || item.description || '',
      description: item.description || '',
      model_number: item.model_number || '',
      location_uuid: locationUuid,
      location_label: locationLabel || null,
      unit_uuid: unitUuid,
      unit_label: unitLabel || null,
      // Original estimate values (for reference in CO form)
      // These should be the original estimate quantity/price/total
      quantity: estimateQuantity > 0 ? estimateQuantity : null,
      unit_price: estimateUnitPrice > 0 ? estimateUnitPrice : null,
      total: estimateTotal > 0 ? estimateTotal : null,
      // CO values (exceeded portion) - these are what the CO is for
      co_unit_price: coUnitPrice,
      co_quantity: coQuantity,
      co_total: coTotal,
      approval_checks: item.approval_checks || item.approval_checks_uuids || [],
    }
  })
  
  // Prepare labor change order items from exceeded amounts (for labor POs)
  const laborCoItems = laborExceeded.map((item: any, index: number) => ({
    cost_code_uuid: item.cost_code_uuid || null,
    cost_code_number: item.cost_code_number || '',
    cost_code_name: item.cost_code_name || '',
    cost_code_label: item.cost_code_label || [item.cost_code_number, item.cost_code_name].filter(Boolean).join(' ').trim(),
    division_name: item.division_name || null,
    po_amount: item.labor_budgeted_amount || item.estimate_amount || 0, // Original PO amount (estimate)
    co_amount: item.exceeded_amount || 0, // Only the exceeded portion
    order_index: index,
  }))
  
  // Normalize PO type to CO type (LABOR or MATERIAL)
  const poType = String(poData.po_type || poData.po_type_uuid || 'MATERIAL').toUpperCase()
  const normalizedCoType = poType === 'LABOR' ? 'LABOR' : 'MATERIAL'
  
  // Calculate CO item total from exceeded items
  const calculateCOItemTotal = () => {
    if (normalizedCoType === 'LABOR') {
      return laborCoItems.reduce((sum: number, item: any) => {
        const coAmount = parseFloat(item.co_amount) || 0
        return sum + coAmount
      }, 0)
    } else {
      return coItems.reduce((sum: number, item: any) => {
        const coTotal = parseFloat(item.co_total) || 0
        return sum + coTotal
      }, 0)
    }
  }
  
  const coItemTotal = calculateCOItemTotal()
  
  // Calculate financial breakdown from PO's financial breakdown
  // Use the same percentages and taxable flags, but recalculate amounts based on CO item total
  const buildFinancialBreakdown = () => {
    const formData = poData && typeof poData === 'object' ? poData : poForm.value
    const poBreakdown = formData?.financial_breakdown || formData?.financialBreakdown || {}
    const charges = poBreakdown.charges || {}
    const salesTaxes = poBreakdown.sales_taxes || {}
    
    // Recalculate charges based on CO item total
    const chargeStates: Record<string, any> = {}
    const chargeKeys = ['freight', 'packing', 'custom_duties', 'other'] as const
    let chargesTotal = 0
    
    chargeKeys.forEach((key) => {
      const entry = charges[key] || {}
      const percentage = parseFloat(entry.percentage) || 0
      const taxable = Boolean(entry.taxable)
      const amount = (coItemTotal * percentage) / 100
      
      chargeStates[key] = {
        percentage,
        amount: Math.round((amount + Number.EPSILON) * 100) / 100,
        taxable,
      }
      
      chargesTotal += chargeStates[key].amount
    })
    
    // Calculate taxable base (CO item total + taxable charges)
    const taxableCharges = Object.values(chargeStates).reduce((sum: number, state: any) => {
      return sum + (state.taxable ? state.amount : 0)
    }, 0)
    const taxableBase = coItemTotal + taxableCharges
    
    // Recalculate sales taxes based on taxable base
    const salesTaxStates: Record<string, any> = {}
    let taxTotal = 0
    
    const salesKeys = ['sales_tax_1', 'sales_tax_2'] as const
    salesKeys.forEach((key) => {
      const entry = salesTaxes[key] || {}
      const percentage = parseFloat(entry.percentage) || 0
      const amount = (taxableBase * percentage) / 100
      
      salesTaxStates[key] = {
        percentage,
        amount: Math.round((amount + Number.EPSILON) * 100) / 100,
      }
      
      taxTotal += salesTaxStates[key].amount
    })
    
    const totalCOAmount = coItemTotal + chargesTotal + taxTotal
    
    return {
      charges: chargeStates,
      sales_taxes: salesTaxStates,
      totals: {
        item_total: Math.round((coItemTotal + Number.EPSILON) * 100) / 100,
        charges_total: Math.round((chargesTotal + Number.EPSILON) * 100) / 100,
        tax_total: Math.round((taxTotal + Number.EPSILON) * 100) / 100,
        total_co_amount: Math.round((totalCOAmount + Number.EPSILON) * 100) / 100,
      },
    }
  }
  
  const financialBreakdown = buildFinancialBreakdown()
  
  // Helper to normalize empty strings to null
  const normalizeToNull = (value: any): any => {
    if (value === '' || value === undefined) return null
    return value
  }
  
  // Ensure we have valid poData - use poForm.value directly if poData is invalid
  const formData = poData && typeof poData === 'object' ? poData : poForm.value
  
  const changeOrderData: any = {
    // Required fields
    corporation_uuid: normalizeToNull(formData?.corporation_uuid || corporationStore.selectedCorporationId),
    co_number: nextCONumber,
    created_date: new Date().toISOString(),
    status: 'Draft',
    co_type: normalizedCoType,
    
    // Project and vendor
    project_uuid: normalizeToNull(formData?.project_uuid),
    vendor_uuid: normalizeToNull(formData?.vendor_uuid),
    original_purchase_order_uuid: normalizeToNull(formData?.uuid),
    
    // Shipping and delivery
    credit_days: normalizeToNull(formData?.credit_days),
    ship_via: normalizeToNull(formData?.ship_via),
    ship_via_uuid: normalizeToNull(formData?.ship_via_uuid),
    freight: normalizeToNull(formData?.freight),
    freight_uuid: normalizeToNull(formData?.freight_uuid),
    shipping_instructions: normalizeToNull(formData?.shipping_instructions),
    shipping_address_uuid: normalizeToNull(formData?.shipping_address_uuid),
    estimated_delivery_date: normalizeToNull(formData?.estimated_delivery_date),
    
    // Additional fields
    requested_by: normalizeToNull(formData?.requested_by),
    terms_and_conditions_uuid: normalizeToNull(formData?.terms_and_conditions_uuid),
    reason: isChangeOrderLaborPO 
      ? `Change order for amounts exceeding estimate in PO ${formData?.po_number || ''}`
      : `Change order for quantities exceeding estimate in PO ${formData?.po_number || ''}`,
    attachments: [],
    
    // Financial breakdown (calculated from CO items)
    financial_breakdown: financialBreakdown,
    
    // Financial totals
    item_total: financialBreakdown.totals.item_total,
    charges_total: financialBreakdown.totals.charges_total,
    tax_total: financialBreakdown.totals.tax_total,
    total_co_amount: financialBreakdown.totals.total_co_amount,
    
    // Copy charge percentages and taxable flags from PO
    freight_charges_percentage: formData?.freight_charges_percentage || null,
    freight_charges_amount: financialBreakdown.charges.freight?.amount || null,
    freight_charges_taxable: formData?.freight_charges_taxable || null,
    packing_charges_percentage: formData?.packing_charges_percentage || null,
    packing_charges_amount: financialBreakdown.charges.packing?.amount || null,
    packing_charges_taxable: formData?.packing_charges_taxable || null,
    custom_duties_charges_percentage: formData?.custom_duties_charges_percentage || null,
    custom_duties_charges_amount: financialBreakdown.charges.custom_duties?.amount || null,
    custom_duties_charges_taxable: formData?.custom_duties_charges_taxable || null,
    other_charges_percentage: formData?.other_charges_percentage || null,
    other_charges_amount: financialBreakdown.charges.other?.amount || null,
    other_charges_taxable: formData?.other_charges_taxable || null,
    sales_tax_1_percentage: formData?.sales_tax_1_percentage || null,
    sales_tax_1_amount: financialBreakdown.sales_taxes.sales_tax_1?.amount || null,
    sales_tax_2_percentage: formData?.sales_tax_2_percentage || null,
    sales_tax_2_amount: financialBreakdown.sales_taxes.sales_tax_2?.amount || null,
  }
  
  // Add items based on PO type
  if (isChangeOrderLaborPO) {
    changeOrderData.labor_co_items = laborCoItems
    changeOrderData.removed_labor_co_items = []
  } else {
    changeOrderData.co_items = coItems
    changeOrderData.removed_co_items = []
  }
  
  // Create change order directly without showing modal
  savingCO.value = true
  try {
    const result = await changeOrdersStore.createChangeOrder(changeOrderData)
    
    if (result) {
      const toast = useToast()
      toast.add({
        title: 'Success',
        description: `Change order ${result.co_number} created successfully for exceeded quantities`,
        color: 'success',
      })
      
      // Close exceeded quantity modal
      closeExceededQuantityModal()
      
      // Refresh change orders list
      const corpUuid = changeOrderData.corporation_uuid
      if (corpUuid) {
        await changeOrdersStore.fetchChangeOrders(corpUuid, false)
      }
      
      // Return to summary screen after successful creation from "to be raised" screen
      // Clear status filter and applied filters to show purchase orders table
      // No need to refetch "to be raised" items since we're navigating away
      const wasOnToBeRaisedScreen = selectedStatusFilter.value === 'ToBeRaised'
      if (
        wasOnToBeRaisedScreen &&
        appliedFilters.value.corporation &&
        appliedFilters.value.project &&
        appliedFilters.value.vendor
      ) {
        // Return to summary screen after successful creation
        // Clear status filter and applied filters to show purchase orders table
        selectedStatusFilter.value = null
        appliedFilters.value = {
          corporation: undefined,
          project: undefined,
          vendor: undefined,
          location: undefined,
          status: undefined
        }
        // Also clear the filter inputs
        filterCorporation.value = undefined
        filterProject.value = undefined
        filterVendor.value = undefined
        filterLocation.value = undefined
        filterStatus.value = undefined
      }
      
      // PO was already saved at the beginning of this function, no need to save again
      // Close the form modal now that CO is created
      closeFormModal()
    } else {
      throw new Error('Failed to create change order')
    }
  } catch (error: any) {
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to create change order',
      color: 'error',
    })
  } finally {
    savingCO.value = false
    pendingSaveAction.value = null
    exceededItems.value = []
  }
}

const closeExceededQuantityModal = () => {
  showExceededQuantityModal.value = false
  pendingSaveAction.value = null
  exceededItems.value = []
}


const previewPurchaseOrder = async (po: any) => {
  if (!hasPermission('po_view')) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to view purchase order details.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }
  
  await loadPurchaseOrderForModal(po, true)
}

// Shipping address methods
const loadShippingAddress = async (addressUuid: string, projectUuid?: string) => {
  if (!addressUuid) return
  
  // If we have project UUID, fetch all project addresses (they're cached by project)
  if (projectUuid) {
    const existingAddresses = projectAddressesStore.getAddresses(projectUuid)
    if (existingAddresses.length > 0) {
      // Check if the specific address is already loaded
      const address = existingAddresses.find(addr => addr.uuid === addressUuid)
      if (address) {
        return // Already loaded
      }
    }
    
    // Fetch all project addresses (will be cached in store)
    try {
      await projectAddressesStore.fetchAddresses(projectUuid)
    } catch (error) {
      console.error('Error fetching project addresses:', error)
    }
  }
}

const formatShippingAddress = (address: any) => {
  const parts = []
  if (address.address_line_1) parts.push(address.address_line_1)
  if (address.address_line_2) parts.push(address.address_line_2)
  const cityStateZip = [address.city, address.state, address.zip_code].filter(Boolean).join(', ')
  if (cityStateZip) parts.push(cityStateZip)
  if (address.country) parts.push(address.country)
  return parts.join('\n') || 'No address'
}

const renderShippingAddressPopover = (addressUuid: string, projectUuid?: string) => {
  let address: any = null
  
  // Try to find the address from project addresses if we have project UUID
  if (projectUuid) {
    const addresses = projectAddressesStore.getAddresses(projectUuid)
    address = addresses.find(addr => addr.uuid === addressUuid)
  }
  
  if (!address) {
    return h('div', { class: 'p-4 w-80' }, [
      h('div', { class: 'text-sm text-gray-500 dark:text-gray-400' }, 'Address not found')
    ])
  }
  
  return h('div', { class: 'p-4 w-80' }, [
    h('div', { class: 'text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3' }, 'Shipping Address'),
    h('div', { 
      class: 'mb-4 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0 last:mb-0'
    }, [
      // Header with icon and label
      h('div', { class: 'flex items-center gap-2 mb-2' }, [
        h(UIcon, { 
          name: 'i-heroicons-truck', 
          class: 'w-4 h-4 text-info' 
        }),
        h('div', { class: 'text-xs font-semibold text-info' }, 'Shipping Address')
      ]),
      // Address content
      h('div', { class: 'text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line mb-2' }, formatShippingAddress(address)),
      // Contact information
      ...(address.contact_person || address.phone || address.email ? [
        h('div', { class: 'space-y-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700' }, [
          ...(address.contact_person ? [
            h('div', { class: 'text-xs text-gray-500 dark:text-gray-500' }, `Contact: ${address.contact_person}`)
          ] : []),
          ...(address.phone ? [
            h('div', { class: 'text-xs text-gray-500 dark:text-gray-500' }, `Phone: ${address.phone}`)
          ] : []),
          ...(address.email ? [
            h('div', { class: 'text-xs text-gray-500 dark:text-gray-500' }, `Email: ${address.email}`)
          ] : [])
        ])
      ] : [])
    ])
  ])
}

// Fetch PO items for expanded row
const fetchPOItemsForRow = async (poUuid: string) => {
  if (!poUuid || poItemsCache.value[poUuid]) {
    return
  }

  // Initialize cache entry
  poItemsCache.value[poUuid] = {
    items: [],
    loading: true,
    error: null
  }

  try {
    const items = await purchaseOrderResourcesStore.fetchPurchaseOrderItems(poUuid)
    poItemsCache.value[poUuid] = {
      items: Array.isArray(items) ? items : [],
      loading: false,
      error: null
    }
  } catch (error: any) {
    poItemsCache.value[poUuid] = {
      items: [],
      loading: false,
      error: error?.message || 'Failed to load PO items'
    }
  }
}

// Watchers
// Note: Filters are only applied when "Show Results" is clicked

// Watch modal close to ensure cleanup happens regardless of how it's closed
// (ESC key, click outside modal, or clicking X button)
watch(showFormModal, (isOpen, wasOpen) => {
  // If modal just closed, ensure cleanup happens
  if (wasOpen && !isOpen) {
    purchaseOrderResourcesStore.clear()
    isViewMode.value = false
    poForm.value = {
      po_items: [],
      attachments: [],
      removed_po_items: []
    }
    loadingEditPO.value = false
    loadingRowUuid.value = null
    // Reset validation state
    isFormValid.value = true
  }
  // If modal just opened, reset validation state (will be updated by form)
  if (!wasOpen && isOpen) {
    isFormValid.value = false
  }
});

// Watch for corporation filter changes to fetch projects
watch(() => filterCorporation.value, async (newCorpUuid, oldCorpUuid) => {
  // Clear project filter when corporation changes
  if (newCorpUuid !== oldCorpUuid && oldCorpUuid) {
    filterProject.value = undefined
  }
  
  // Fetch projects for the new corporation
  if (newCorpUuid) {
    await purchaseOrderListResourcesStore.ensureProjects({
      corporationUuid: newCorpUuid,
      force: false
    })
  }
}, { immediate: false })

// Load ship via data on mount
onMounted(async () => {
  try {
    await shipViaStore.fetchShipVia()
  } catch (error) {
    console.error('Error fetching ship via:', error)
  }
})

// Purchase orders are automatically fetched by TopBar.vue when corporation changes
// No need to fetch here - just use the store data reactively
</script>

