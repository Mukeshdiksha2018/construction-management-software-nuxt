<template>
  <div class="flex flex-col">
    <!-- Main Content Area -->
    <div class="flex-1 flex min-h-0">
      <!-- Left Panel: Main Form -->
      <div ref="leftPanel" class="flex-1 flex flex-col w-full">
        <div class="mb-3 flex flex-col gap-4">
          <!-- Header Section -->
          <UCard variant="soft" class="mb-4">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
            <!-- Skeleton Loaders -->
            <template v-if="loading">
              <!-- Corporation -->
              <div>
                <USkeleton class="h-3 w-24 mb-1" />
                <USkeleton class="h-9 w-full" />
              </div>
              <!-- Project Name -->
              <div>
                <USkeleton class="h-3 w-24 mb-1" />
                <USkeleton class="h-9 w-full" />
              </div>
              <!-- Ship To -->
              <div>
                <USkeleton class="h-3 w-16 mb-1" />
                <USkeleton class="h-[50px] w-full" />
              </div>
              <!-- PO Number -->
              <div>
                <USkeleton class="h-3 w-20 mb-1" />
                <USkeleton class="h-9 w-full" />
              </div>
              <!-- PO Type -->
              <div>
                <USkeleton class="h-3 w-16 mb-1" />
                <USkeleton class="h-9 w-full" />
              </div>
              <!-- Vendor Name -->
              <div>
                <USkeleton class="h-3 w-24 mb-1" />
                <USkeleton class="h-9 w-full" />
              </div>
              <!-- Vendor Address -->
              <div>
                <USkeleton class="h-3 w-28 mb-1" />
                <USkeleton class="h-[50px] w-full" />
              </div>
              <!-- Shipping Instructions -->
              <div>
                <USkeleton class="h-3 w-40 mb-1" />
                <USkeleton class="h-16 w-full" />
              </div>
              <!-- Credit Days -->
              <div>
                <USkeleton class="h-3 w-24 mb-1" />
                <USkeleton class="h-9 w-full" />
              </div>
              <!-- Ship Via -->
              <div>
                <USkeleton class="h-3 w-20 mb-1" />
                <USkeleton class="h-9 w-full" />
              </div>
              <!-- Freight -->
              <div>
                <USkeleton class="h-3 w-16 mb-1" />
                <USkeleton class="h-9 w-full" />
              </div>
              <!-- Entry Date -->
              <div>
                <USkeleton class="h-3 w-20 mb-1" />
                <USkeleton class="h-9 w-full" />
              </div>
              <!-- Est Delivery Date -->
              <div>
                <USkeleton class="h-3 w-32 mb-1" />
                <USkeleton class="h-9 w-full" />
              </div>
              <!-- Include Items -->
              <div>
                <USkeleton class="h-3 w-24 mb-1" />
                <USkeleton class="h-9 w-full" />
              </div>
              <!-- Estimate Details -->
              <div v-if="shouldShowEstimateDetails">
                <USkeleton class="h-3 w-32 mb-1" />
                <USkeleton class="h-[50px] w-full" />
              </div>
            </template>
            
            <!-- Actual Form Fields -->
            <template v-else>
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

            <!-- Project Name -->
            <div>
              <label class="block text-xs font-medium text-default mb-1">
                Project Name
                <span v-if="isProjectPurchaseOrder" class="text-red-500">*</span>
              </label>
              <ProjectSelect
                v-if="isProjectPurchaseOrder"
                :model-value="form.project_uuid"
                :corporation-uuid="props.form.corporation_uuid || corpStore.selectedCorporation?.uuid"
                :disabled="!props.form.corporation_uuid && !corpStore.selectedCorporation || props.readonly"
                placeholder="Select project"
                size="sm"
                class="w-full"
                @update:model-value="handleProjectChange"
              />
              <div v-else class="p-2 bg-gray-50 dark:bg-gray-800 rounded-md text-xs text-muted min-h-[50px] border border-default">
                Custom purchase orders do not require a project.
              </div>
            </div>

            <!-- Ship To (active project address) -->
            <div>
              <label class="block text-xs font-medium text-default mb-1">
                Ship To
              </label>
              <div v-if="isProjectPurchaseOrder" class="p-2 bg-gray-50 dark:bg-gray-800 rounded-md text-xs text-muted min-h-[50px] border border-default">
                {{ activeProjectAddressText || 'No address selected' }}
              </div>
              <UTextarea
                v-else
                :model-value="form.shipping_address_custom || ''"
                placeholder="Enter ship to address"
                size="sm"
                :rows="3"
                class="w-full text-xs"
                :disabled="props.readonly"
                autoresize
                @update:model-value="(value) => handleFormUpdate('shipping_address_custom', value ?? '')"
              />
            </div>

            <!-- PO Number -->
          <div>
            <label class="block text-xs font-medium text-default mb-1">
              PO Number
            </label>
            <UInput
              :model-value="form.po_number"
              placeholder="Auto-generated"
              size="sm"
              class="w-full"
              disabled
              icon="i-heroicons-hashtag"
            />
          </div>

            <!-- PO Type -->
            <div>
              <label class="block text-xs font-medium text-default mb-1">
                PO Type <span class="text-red-500">*</span>
              </label>
              <USelectMenu
                v-model="poTypeOption"
                :items="poTypeOptions"
                placeholder="Select PO type"
                size="sm"
                class="w-full"
                value-key="value"
                :disabled="props.readonly"
              />
            </div>

          <!-- Vendor Name -->
          <div>
            <label class="block text-xs font-medium text-default mb-1">
              Vendor Name <span class="text-red-500">*</span>
            </label>
            <VendorSelect
              :model-value="form.vendor_uuid"
              :corporation-uuid="props.form.corporation_uuid || corpStore.selectedCorporation?.uuid"
              :disabled="!props.form.corporation_uuid && !corpStore.selectedCorporation || props.readonly"
              placeholder="Select vendor"
              size="sm"
              class="w-full"
              @update:model-value="handleVendorChange"
              @change="handleVendorChange"
            />
          </div>

            <!-- Vendor Address -->
            <div>
              <label class="block text-xs font-medium text-default mb-1">
                Vendor Address
              </label>
              <div class="relative p-2 bg-gray-50 dark:bg-gray-800 rounded-md text-xs text-muted min-h-[50px] border border-default group hover:border-primary-400 dark:hover:border-primary-600 transition-colors cursor-pointer">
                <div :class="props.form.vendor_uuid && !props.readonly ? 'pr-8' : ''">
                {{ vendorAddressText || 'No vendor selected' }}
                </div>
                <UButton
                  v-if="props.form.vendor_uuid && !props.readonly"
                  icon="tdesign:edit-filled"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  @click="openVendorEditModal"
                  title="Edit vendor address"
                  class="absolute top-2 right-2 transition-all group-hover:!bg-primary-100 group-hover:!text-primary-600 group-hover:scale-110 dark:group-hover:!bg-primary-900 dark:group-hover:!text-primary-400"
                />
              </div>
            </div>

            <!-- Shipping Instructions -->
            <div>
              <label class="block text-xs font-medium text-default mb-1">
                Shipping Instructions
              </label>
              <UTextarea
                :model-value="form.shipping_instructions"
                placeholder="Enter shipping instructions"
                size="sm"
                :rows="3"
                class="w-full"
                :disabled="props.readonly"
                autoresize
                @update:model-value="(value) => handleFormUpdate('shipping_instructions', value ?? '')"
              />
            </div>

            <!-- Freight -->
            <div v-if="!isLaborPurchaseOrder">
              <label class="block text-xs font-medium text-default mb-1">
                Freight <span class="text-red-500">*</span>
              </label>
              <FreightSelect
                :model-value="freightDisplayValue"
                size="sm"
                class="w-full"
                :disabled="props.readonly"
                @update:model-value="(value) => handleFormUpdate('freight', value || '')"
                @change="(opt: any) => handleFormUpdate('freight_uuid', opt?.freight?.uuid || '')"
              />
            </div>

            <!-- Ship Via -->
            <div v-if="!isLaborPurchaseOrder">
              <label class="block text-xs font-medium text-default mb-1">
                Ship Via <span class="text-red-500">*</span>
              </label>
              <ShipViaSelect
                :model-value="shipViaDisplayValue"
                size="sm"
                class="w-full"
                :disabled="props.readonly"
                @update:model-value="(value) => handleFormUpdate('ship_via', value || '')"
                @change="(opt: any) => handleFormUpdate('ship_via_uuid', opt?.shipVia?.uuid || '')"
              />
            </div>

            <!-- Entry Date -->
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

            <!-- Credit Days -->
            <div>
              <label class="block text-xs font-medium text-default mb-1">
                Credit Days <span class="text-red-500">*</span>
              </label>
              <USelectMenu
                v-model="creditDaysOption"
                :items="creditDaysOptions"
                placeholder="Select credit days"
                size="sm"
                class="w-full"
                value-key="value"
                :disabled="props.readonly"
              />
            </div>

            <!-- Est Delivery Date -->
            <div>
              <label class="block text-xs font-medium text-default mb-1">
                Est Delivery Date <span class="text-red-500">*</span>
              </label>
              <UPopover v-model:open="estimatedDeliveryDatePopoverOpen" :disabled="props.readonly">
                <UButton 
                  color="neutral" 
                  variant="outline" 
                  icon="i-heroicons-calendar-days"
                  class="w-full justify-start"
                  size="sm"
                  :disabled="props.readonly"
                >
                  {{ estimatedDeliveryDateDisplayText }}
                </UButton>
                <template #content>
                  <UCalendar v-model="estimatedDeliveryDateValue" class="p-2" :disabled="props.readonly" @update:model-value="estimatedDeliveryDatePopoverOpen = false" />
                </template>
              </UPopover>
            </div>

            <!-- Include Items (only for Material PO) -->
            <div v-if="!isLaborPurchaseOrder">
              <label class="block text-xs font-medium text-default mb-1">
                Include Items <span class="text-red-500">*</span>
              </label>
              <USelectMenu
                v-model="includeItemsOption"
                :items="filteredIncludeItemsOptions"
                :placeholder="includeItemsPlaceholder"
                size="sm"
                class="w-full"
                value-key="value"
                :disabled="props.readonly || !canEnableIncludeItems"
              />
            </div>

            <!-- Estimate Details (visible when importing from estimate) -->
            <div v-if="shouldShowEstimateDetails" class="xl:col-span-2">
              <label class="block text-xs font-medium text-default mb-1">
                Estimate Details
              </label>
              <div
                class="p-3 rounded-md text-xs min-h-[50px] border transition-colors duration-150"
                :class="estimateDetails?.statusContainerClass || 'bg-gray-50 dark:bg-gray-800 border-default text-muted'"
              >
                <template v-if="estimatesLoading">
                  Loading estimate details...
                </template>
                <template v-else-if="estimateDetails">
                  <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-default/90">
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-default whitespace-nowrap">Estimate #:</span>
                      <span class="font-mono text-sm text-default">{{ estimateDetails.number }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-default whitespace-nowrap">Status:</span>
                      <span
                        class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium border flex-shrink-0"
                        :class="estimateDetails.statusBadgeClass"
                      >
                        {{ estimateDetails.status }}
                      </span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-default whitespace-nowrap">Estimate Date:</span>
                      <span>{{ estimateDetails.estimateDate }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-default whitespace-nowrap">Final Amount:</span>
                      <span class="font-mono text-sm">{{ estimateDetails.finalAmount }}</span>
                    </div>
                    <div
                      v-if="estimateDetails.validUntil"
                      class="flex items-center gap-2 col-span-2"
                    >
                      <span class="font-semibold text-default whitespace-nowrap">Valid Until:</span>
                      <span>{{ estimateDetails.validUntil }}</span>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <span class="text-default">No estimates found for the selected project.</span>
                </template>
              </div>
            </div>
            </template>
          </div>
          </UCard>

          
        </div>
      </div>
    </div>

    <!-- Imported Estimate Items -->
    <div v-if="shouldShowEstimateImportWarning" class="mt-6">
      <UBanner
        color="error"
        icon="i-lucide-info"
        title="Estimate must be approved before creating a purchase order."
        :description="estimateImportBlockedMessage"
      />
    </div>
    <!-- Quantity Exceeded Warning (only show when estimate items section is visible) -->
    <div v-if="hasQuantityExceeded && !props.readonly && shouldShowEstimateItemsSection" class="mt-6">
      <UBanner
        color="warning"
        icon="i-heroicons-exclamation-triangle"
        title="Purchase order quantities exceed estimate quantities"
        :description="quantityExceededMessage"
      />
    </div>
    <div v-if="shouldShowMasterItemsSection" class="mt-6">
      <POItemsFromItemMaster
        :items="poItemsForDisplay"
        :loading="false"
        :error="null"
        title="PO Items"
        description="Preferred items imported from item master"
        loading-message=""
        empty-message="No preferred items found."
        :corporation-uuid="(props.form.corporation_uuid || corpStore.selectedCorporation?.uuid) ?? undefined"
        :project-uuid="props.form.project_uuid ?? undefined"
        :scoped-item-types="scopedItemTypes"
        :scoped-cost-code-configurations="scopedCostCodeConfigurations"
        :show-edit-selection="isImportingFromMaster"
        @edit-selection="handleEditMasterSelection"
        :readonly="props.readonly"
        @add-row="insertPoItemAfter"
        @remove-row="removePoItemAt"
        @cost-code-change="updatePoItemCostCode"
        @item-type-change="updatePoItemType"
        @sequence-change="updatePoItemSequence"
        @item-change="updatePoItemItem"
        @location-change="updatePoItemLocation"
        @approval-checks-change="updatePoItemApprovalChecks"
        @model-number-change="updatePoItemModelNumber"
        @uom-change="updatePoItemUom"
        @po-unit-price-change="updatePoItemPoUnitPrice"
        @po-quantity-change="updatePoItemPoQuantity"
        @po-total-change="updatePoItemPoTotal"
      />
    </div>
    <div v-if="shouldShowEstimateItemsSection" class="mt-6">
      <POItemsTableWithEstimates
        :items="poItemsForDisplay"
        :loading="estimateItemsLoading"
        :error="estimateItemsError"
        title="PO Items"
        description="Material items imported from the latest project estimate"
        loading-message="Preparing material items from estimate…"
        empty-message="No material items found in the selected estimate."
        :corporation-uuid="(props.form.corporation_uuid || corpStore.selectedCorporation?.uuid) ?? undefined"
        :project-uuid="props.form.project_uuid ?? undefined"
        :scoped-item-types="scopedItemTypes"
        :show-edit-selection="isImportingFromEstimate"
        @edit-selection="handleEditEstimateSelection"
        :scoped-cost-code-configurations="scopedCostCodeConfigurations"
        :readonly="props.readonly"
        :used-quantities-by-item="usedQuantitiesByItem"
        :estimate-items="estimatePoItems"
        @add-row="insertPoItemAfter"
        @remove-row="removePoItemAt"
        @cost-code-change="updatePoItemCostCode"
        @item-type-change="updatePoItemType"
        @sequence-change="updatePoItemSequence"
        @item-change="updatePoItemItem"
        @location-change="updatePoItemLocation"
        @approval-checks-change="updatePoItemApprovalChecks"
        @model-number-change="updatePoItemModelNumber"
        @uom-change="updatePoItemUom"
        @po-unit-price-change="updatePoItemPoUnitPrice"
        @po-quantity-change="updatePoItemPoQuantity"
        @po-total-change="updatePoItemPoTotal"
      />
    </div>
    
    <!-- Labor PO Items Section -->
    <div v-if="shouldShowLaborItemsSection" class="mt-6">
      <POLaborItemsTable
        :items="laborPoItemsForDisplay"
        :loading="laborItemsLoading"
        :error="laborItemsError"
        title="Labor PO Items"
        :description="laborItemsDescription"
        loading-message="Loading labor items from estimate…"
        empty-message="No labor items found."
        :corporation-uuid="(props.form.corporation_uuid || corpStore.selectedCorporation?.uuid) ?? undefined"
        :scoped-cost-code-configurations="scopedCostCodeConfigurations"
        :show-labor-budgeted="isLaborPurchaseOrder"
        :show-edit-selection="isLaborPurchaseOrder"
        @edit-selection="handleEditLaborSelection"
        :readonly="props.readonly"
        @add-row="insertLaborPoItemAfter"
        @remove-row="removeLaborPoItemAt"
        @cost-code-change="updateLaborPoItemCostCode"
        @po-amount-change="updateLaborPoItemAmount"
      />
      
      <!-- Labor PO Total -->
      <div class="mt-4 flex justify-end">
        <div class="rounded-lg border border-default bg-elevated dark:bg-gray-800/40 px-6 py-3 shadow-sm">
          <div class="flex items-center gap-4">
            <span class="text-sm font-medium text-default">Total PO Amount:</span>
            <span class="text-lg font-semibold text-default font-mono">{{ formatCurrency(itemTotal) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="hasRemovedPoItems && !props.readonly" class="mt-4 flex justify-end">
      <UButton
        size="xs"
        color="primary"
        variant="outline"
        icon="i-heroicons-arrow-path"
        @click="openRemovedPoItemsModal"
      >
        Show Removed Items ({{ removedPoItems.length }})
      </UButton>
    </div>

    <!-- File Upload Section (for Labor PO) -->
    <div v-if="isLaborPurchaseOrder" class="mt-6">
      <div class="max-w-md">
        <!-- Skeleton Loaders for File Upload -->
        <template v-if="loading">
          <UCard variant="soft" class="mb-3">
            <div class="space-y-3">
              <USkeleton class="h-6 w-32" />
              <USkeleton class="h-10 w-full" />
              <USkeleton class="h-4 w-full" />
            </div>
          </UCard>
          <UCard variant="soft">
            <div class="space-y-3">
              <USkeleton class="h-6 w-40" />
              <div class="space-y-2">
                <USkeleton class="h-12 w-full" />
                <USkeleton class="h-12 w-full" />
                <USkeleton class="h-12 w-full" />
              </div>
            </div>
          </UCard>
        </template>
        
        <!-- Actual File Upload Section -->
        <template v-else>
          <!-- Upload Section -->
          <UCard variant="soft" class="mb-3">
            <div class="flex justify-between items-center mb-3">
              <h4 class="text-base font-bold text-default flex items-center gap-2 border-b border-default/60 pb-2">
                <UIcon name="i-heroicons-cloud-arrow-up-solid" class="w-5 h-5 text-primary-500" />
                File Upload
              </h4>
              <span class="text-xs text-muted bg-elevated px-2 py-1 rounded border border-default/60">
                {{ totalAttachmentCount }} files
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
              accept=".pdf"
              multiple
            >
              <div class="space-y-2">
                <UButton
                  :label="isUploading ? 'Uploading...' : (uploadedFiles.length > 0 ? 'Add more files' : 'Choose PDF files')"
                  color="primary"
                  variant="solid"
                  size="sm"
                  :icon="isUploading ? 'i-heroicons-arrow-path' : 'i-heroicons-document-plus'"
                  :loading="isUploading"
                  :disabled="isUploading || props.readonly"
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
                  PDF files only · Maximum size 10MB each
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
                Use the button above to add purchase order attachments.
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
                      v-if="!props.readonly"
                      icon="mingcute:delete-fill"
                      color="error"
                      variant="soft"
                      size="xs"
                      class="p-1 h-auto text-xs"
                      @click.stop="removeFile(index)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </UCard>
        </template>
      </div>
    </div>

    <!-- File Upload and Financial Breakdown Section (for Material PO) -->
    <div v-if="!isLaborPurchaseOrder" class="mt-6 flex flex-col lg:flex-row gap-6">
      <!-- File Upload Section (Left) -->
      <div class="w-full lg:w-auto lg:flex-shrink-0 lg:max-w-md">
        <!-- Skeleton Loaders for File Upload -->
        <template v-if="loading">
          <UCard variant="soft" class="mb-3">
            <div class="space-y-3">
              <USkeleton class="h-6 w-32" />
              <USkeleton class="h-10 w-full" />
              <USkeleton class="h-4 w-full" />
            </div>
          </UCard>
          <UCard variant="soft">
            <div class="space-y-3">
              <USkeleton class="h-6 w-40" />
              <div class="space-y-2">
                <USkeleton class="h-12 w-full" />
                <USkeleton class="h-12 w-full" />
                <USkeleton class="h-12 w-full" />
              </div>
            </div>
          </UCard>
        </template>
        
        <!-- Actual File Upload Section -->
        <template v-else>
          <!-- Upload Section -->
          <UCard variant="soft" class="mb-3">
            <div class="flex justify-between items-center mb-3">
              <h4 class="text-base font-bold text-default flex items-center gap-2 border-b border-default/60 pb-2">
                <UIcon name="i-heroicons-cloud-arrow-up-solid" class="w-5 h-5 text-primary-500" />
                File Upload
              </h4>
              <span class="text-xs text-muted bg-elevated px-2 py-1 rounded border border-default/60">
                {{ totalAttachmentCount }} files
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
              accept=".pdf"
              multiple
            >
              <div class="space-y-2">
                <UButton
                  :label="isUploading ? 'Uploading...' : (uploadedFiles.length > 0 ? 'Add more files' : 'Choose PDF files')"
                  color="primary"
                  variant="solid"
                  size="sm"
                  :icon="isUploading ? 'i-heroicons-arrow-path' : 'i-heroicons-document-plus'"
                  :loading="isUploading"
                  :disabled="isUploading || props.readonly"
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
                  PDF files only · Maximum size 10MB each
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
                Use the button above to add purchase order attachments.
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
                      v-if="!props.readonly"
                      icon="mingcute:delete-fill"
                      color="error"
                      variant="soft"
                      size="xs"
                      class="p-1 h-auto text-xs"
                      @click.stop="removeFile(index)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </UCard>
        </template>
      </div>

      <!-- Terms and Conditions Section (Middle) -->
      <div v-if="!isLaborPurchaseOrder" class="w-full lg:w-auto lg:flex-shrink-0 lg:min-w-[320px] lg:max-w-lg">
        <template v-if="loading">
          <UCard variant="soft">
            <div class="space-y-3">
              <USkeleton class="h-6 w-40" />
              <USkeleton class="h-10 w-full" />
            </div>
          </UCard>
        </template>
        <template v-else>
          <UCard variant="soft">
            <div class="flex justify-between items-center mb-3">
              <h4 class="text-base font-bold text-default flex items-center gap-2 border-b border-default/60 pb-2">
                <UIcon name="i-heroicons-document-text-solid" class="w-5 h-5 text-primary-500" />
                Terms and Conditions
              </h4>
            </div>
            <div>
              <label class="block text-xs font-medium text-default mb-1">
                Select Terms and Conditions
              </label>
              <TermsAndConditionsSelect
                :model-value="form.terms_and_conditions_uuid"
                placeholder="Select terms and conditions..."
                size="sm"
                class="w-full"
                :disabled="props.readonly"
                @update:model-value="(value) => handleFormUpdate('terms_and_conditions_uuid', value ?? null)"
              />
            </div>
          </UCard>
        </template>
      </div>

      <!-- Financial Breakdown (Right) -->
      <div class="w-full lg:flex-1 flex justify-start lg:justify-end">
        <div class="w-full lg:w-auto lg:min-w-[520px]">
          <FinancialBreakdown
            :item-total="itemTotal"
            :form-data="form"
            :read-only="props.readonly"
            item-total-label="Item Total"
            total-label="Total PO Amount"
            @update="handleFinancialBreakdownUpdate"
          />
        </div>
      </div>
    </div>

    <!-- Removed PO Items Modal -->
    <UModal v-model:open="removedPoItemsModalOpen">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-base font-semibold">Removed PO Items</h3>
          <UButton icon="i-heroicons-x-mark" size="xs" variant="solid" color="neutral" @click="closeRemovedPoItemsModal" />
        </div>
      </template>
      <template #body>
        <div v-if="removedPoItems.length" class="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div
            v-for="(item, index) in removedPoItems"
            :key="item.uuid || item.id || `removed-${index}`"
            class="p-3 border border-default rounded-lg bg-elevated/40 dark:bg-elevated/20 flex flex-col gap-2"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="text-sm font-semibold text-default truncate">
                  {{ item.description || item.name || item.item_name || `Item ${index + 1}` }}
                </div>
                <div class="text-xs text-muted mt-1 space-x-2">
                  <span v-if="item.po_quantity !== null && item.po_quantity !== undefined">
                    Qty: {{ item.po_quantity }}
                  </span>
                  <span v-if="item.po_unit_price !== null && item.po_unit_price !== undefined">
                    Unit: {{ formatCurrency(item.po_unit_price) }}
                  </span>
                </div>
                <div v-if="item.removed_at" class="text-[11px] text-muted mt-1">
                  Removed: {{ item.removed_at }}
                </div>
              </div>
              <div class="flex flex-col items-end gap-2 shrink-0">
                <div class="text-sm font-mono text-default">
                  {{ formatCurrency(computePoItemEffectiveTotal(item)) }}
                </div>
                <UButton size="xs" color="primary" variant="solid" @click="restoreRemovedPoItem(index)">
                  Restore
                </UButton>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="py-6 text-sm text-muted text-center">
          No removed items available.
        </div>
      </template>
      <template #footer>
        <div class="flex justify-between w-full">
          <UButton color="neutral" variant="soft" @click="closeRemovedPoItemsModal">
            Close
          </UButton>
          <UButton
            v-if="removedPoItems.length"
            color="primary"
            variant="solid"
            icon="i-heroicons-arrow-uturn-left"
            @click="restoreAllRemovedPoItems"
          >
            Restore All
          </UButton>
        </div>
      </template>
    </UModal>

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

    <!-- Vendor Edit Modal -->
    <VendorForm 
      v-model="showVendorEditModal" 
      :vendor="editingVendor"
      @vendor-saved="handleVendorSaved"
    />

    <!-- Terms and Conditions Preview -->
    <div v-if="!isLaborPurchaseOrder && selectedTermsAndCondition" class="mt-6">
      <UCard variant="soft">
        <div class="flex justify-between items-center mb-4">
          <h4 class="text-base font-bold text-default flex items-center gap-2 border-b border-default/60 pb-2">
            <UIcon name="i-heroicons-document-text-solid" class="w-5 h-5 text-primary-500" />
            Terms and Conditions Preview
          </h4>
          <UBadge color="primary" variant="soft" size="sm">
            {{ selectedTermsAndCondition.name }}
          </UBadge>
        </div>
        <div 
          class="prose prose-sm dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          v-html="selectedTermsAndCondition.content"
        />
      </UCard>
    </div>

    <!-- Estimate Items Selection Modal -->
    <PurchaseOrdersEstimateItemsSelectionModal
      v-model:open="showEstimateItemsModal"
      :items="estimatePoItems"
      :preselected-items="currentFormItemsForPreselection"
      title="Select Items to Import from Estimate"
      @confirm="handleEstimateItemsConfirm"
      @cancel="handleEstimateItemsCancel"
    />

    <!-- Master Items Selection Modal -->
    <PurchaseOrdersMasterItemsSelectionModal
      v-model:open="showMasterItemsModal"
      :items="masterPoItems"
      :preselected-items="currentFormItemsForPreselection"
      title="Select Items to Import from Master"
      @confirm="handleMasterItemsConfirm"
      @cancel="handleMasterItemsCancel"
    />

    <!-- Labor Items Selection Modal -->
    <LaborItemsSelectionModal
      v-model:open="showLaborItemsModal"
      :items="laborPoItems"
      :preselected-items="currentFormLaborItemsForPreselection"
      title="Select Labor Cost Codes from Estimate"
      :show-labor-budgeted="true"
      :is-from-estimate="true"
      @confirm="handleLaborItemsConfirm"
      @cancel="handleLaborItemsCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { CalendarDate, DateFormatter, getLocalTimeZone } from "@internationalized/date";
import { useCorporationStore } from "@/stores/corporations";
import { usePurchaseOrdersStore } from "@/stores/purchaseOrders";
import { useProjectsStore } from "@/stores/projects";
import { useProjectAddressesStore } from "@/stores/projectAddresses";
import { useVendorStore } from "@/stores/vendors";
import { useUTCDateFormat } from '@/composables/useUTCDateFormat';
import { useCurrencyFormat } from '@/composables/useCurrencyFormat';
import { useShipViaStore } from '@/stores/freight';
import { useFreightStore } from '@/stores/freightGlobal';
// NOTE: We use purchaseOrderResourcesStore for all data fetching to avoid affecting global stores
// Global stores (itemTypesStore, costCodeConfigurationsStore, etc.) remain scoped to TopBar's corporation
import { usePurchaseOrderResourcesStore } from '@/stores/purchaseOrderResources';
import { useUOMStore } from '@/stores/uom';
import { useTermsAndConditionsStore } from '@/stores/termsAndConditions';
import ProjectSelect from '@/components/Shared/ProjectSelect.vue';
import VendorSelect from '@/components/Shared/VendorSelect.vue';
import ShipViaSelect from '@/components/Shared/ShipViaSelect.vue';
import FreightSelect from '@/components/Shared/FreightSelect.vue';
import FilePreview from '@/components/Shared/FilePreview.vue';
import POItemsTableWithEstimates from '@/components/PurchaseOrders/POItemsTableWithEstimates.vue';
import POItemsFromItemMaster from './POItemsFromItemMaster.vue';
import POLaborItemsTable from '@/components/PurchaseOrders/POLaborItemsTable.vue';
import PurchaseOrdersMasterItemsSelectionModal from '@/components/PurchaseOrders/PurchaseOrdersMasterItemsSelectionModal.vue';
import LaborItemsSelectionModal from '@/components/PurchaseOrders/LaborItemsSelectionModal.vue';
import FinancialBreakdown from '@/components/PurchaseOrders/FinancialBreakdown.vue';
import VendorForm from '@/components/PurchaseOrders/VendorForm.vue';
import TermsAndConditionsSelect from '@/components/Shared/TermsAndConditionsSelect.vue';
import CorporationSelect from '@/components/Shared/CorporationSelect.vue';

// Props
interface Props {
  form: any;
  editingPurchaseOrder: boolean;
  loading?: boolean;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  readonly: false
});

// Emits
const emit = defineEmits<{
  'update:form': [value: any];
  'file-upload': [files: File[]];
  'estimate-import-blocked-change': [value: boolean];
  'validation-change': [isValid: boolean];
}>();

// Stores
const corpStore = useCorporationStore();
const purchaseOrdersStore = usePurchaseOrdersStore();
// NOTE: projectsStore is not used for data fetching in this component
// All data fetching is done via purchaseOrderResourcesStore to avoid affecting global stores
const projectAddressesStore = useProjectAddressesStore();
const vendorStore = useVendorStore();
const { toUTCString, fromUTCString } = useUTCDateFormat();
const shipViaStore = useShipViaStore();
const freightStore = useFreightStore();
// Estimates are now managed by purchaseOrderResourcesStore - no global store needed
// NOTE: We use purchaseOrderResourcesStore for all data fetching to avoid affecting global stores
// Global stores (itemTypesStore, costCodeConfigurationsStore, etc.) remain scoped to TopBar's corporation
const purchaseOrderResourcesStore = usePurchaseOrderResourcesStore();
const uomStore = useUOMStore();
const termsAndConditionsStore = useTermsAndConditionsStore();
const itemTypesFetchPromises = new Map<string, Promise<void>>();

const buildItemTypesKey = (corpUuid: string, projectUuid?: string) =>
  projectUuid ? `${corpUuid}::${projectUuid}` : `${corpUuid}::__all__`;

const hasCachedItemTypes = (corpUuid: string, projectUuid?: string) => {
  // Check if item types are cached in purchaseOrderResourcesStore (scoped store)
  const cachedTypes = purchaseOrderResourcesStore.getItemTypes(corpUuid, projectUuid);
  return Array.isArray(cachedTypes) && cachedTypes.length > 0;
};

const fetchItemTypesIfNeeded = async (
  corpUuid: string,
  projectUuid?: string,
  force = false
) => {
  const key = buildItemTypesKey(corpUuid, projectUuid);

  if (!force && hasCachedItemTypes(corpUuid, projectUuid)) {
    return;
  }

  const existingPromise = itemTypesFetchPromises.get(key);
  if (existingPromise) {
    if (!force) {
      return existingPromise;
    }
    try {
      await existingPromise.catch(() => {});
    } finally {
      if (itemTypesFetchPromises.get(key) === existingPromise) {
        itemTypesFetchPromises.delete(key);
      }
    }
  }

  // Use purchaseOrderResourcesStore instead of global itemTypesStore
  // This ensures we don't affect the global store scoped to TopBar's corporation
  const promise: Promise<void> = purchaseOrderResourcesStore
    .ensureItemTypes({ corporationUuid: corpUuid, projectUuid, force })
    .then(() => {}) // Convert to Promise<void>
    .catch((error: unknown) => {
      // Failed to fetch item types
    })
    .finally(() => {
      const current = itemTypesFetchPromises.get(key);
      if (current === promise) {
        itemTypesFetchPromises.delete(key);
      }
    }) as Promise<void>;

  itemTypesFetchPromises.set(key, promise);
  return promise;
};

const selectedCorporationUuid = computed(() => {
  // Prioritize form's corporation_uuid over store's selectedCorporation
  // This ensures we use the corporation selected in the form, not TopBar
  const uuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  return uuid ? String(uuid) : null;
});

const selectedProjectUuid = computed(() => {
  const uuid = props.form.project_uuid;
  return uuid ? String(uuid) : null;
});

// Selected terms and conditions for preview
const selectedTermsAndCondition = computed(() => {
  if (!props.form.terms_and_conditions_uuid) {
    return null
  }
  return termsAndConditionsStore.getTermsAndConditionById(props.form.terms_and_conditions_uuid) || null
});

const { formatCurrency } = useCurrencyFormat();

const formatQuantity = (value: any) => {
  if (value === null || value === undefined) return '0';
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return '0';
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
  return formatter.format(numeric);
};

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

// Date formatter
const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
});

// Date computed properties
const entryDateValue = computed({
  get: () => {
    if (!props.form.entry_date) return null;
    const src = String(props.form.entry_date);
    // Convert UTC string to local date string (YYYY-MM-DD)
    const localYmd = src.includes('T') ? fromUTCString(src) : src;
    // Parse the date string directly to avoid timezone issues
    // Split YYYY-MM-DD and create CalendarDate directly
    const parts = localYmd.split('-');
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new CalendarDate(year, month, day);
      }
    }
    // Fallback: return null if parsing fails
    return null;
  },
  set: (value: CalendarDate | null) => {
    if (value) {
      // Create date string in YYYY-MM-DD format
      const dateString = `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
      // Convert to UTC, treating the date as local midnight
      handleFormUpdate('entry_date', toUTCString(dateString));
    } else {
      handleFormUpdate('entry_date', null);
    }
  }
});

const estimatedDeliveryDateValue = computed({
  get: () => {
    if (!props.form.estimated_delivery_date) return null;
    const src = String(props.form.estimated_delivery_date);
    // Convert UTC string to local date string (YYYY-MM-DD)
    const localYmd = src.includes('T') ? fromUTCString(src) : src;
    // Parse the date string directly to avoid timezone issues
    // Split YYYY-MM-DD and create CalendarDate directly
    const parts = localYmd.split('-');
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new CalendarDate(year, month, day);
      }
    }
    // Fallback: return null if parsing fails
    return null;
  },
  set: (value: CalendarDate | null) => {
    if (value) {
      // Create date string in YYYY-MM-DD format
      const dateString = `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
      // Convert to UTC, treating the date as local midnight
      handleFormUpdate('estimated_delivery_date', toUTCString(dateString));
    } else {
      handleFormUpdate('estimated_delivery_date', null);
    }
  }
});

// Display text for dates
const entryDateDisplayText = computed(() => {
  if (!entryDateValue.value) return 'Select entry date';
  return df.format(entryDateValue.value.toDate(getLocalTimeZone()));
});

const estimatedDeliveryDateDisplayText = computed(() => {
  if (!estimatedDeliveryDateValue.value) return 'Select delivery date';
  return df.format(estimatedDeliveryDateValue.value.toDate(getLocalTimeZone()));
});

// Guard flag to prevent recursive updates when calculating estimated delivery date
const isUpdatingEstimatedDeliveryDate = ref(false);
const entryDatePopoverOpen = ref(false);
const estimatedDeliveryDatePopoverOpen = ref(false);

// Auto-calculate estimated delivery date when entry date or credit days change
const calculateEstimatedDeliveryDate = (entryDate: CalendarDate | null, creditDays: string | null) => {
  if (!entryDate || !creditDays) return null;
  
  const creditDaysMap: Record<string, number> = {
    'NET_15': 15,
    'NET_25': 25,
    'NET_30': 30,
    'NET_45': 45,
    'NET_60': 60,
  };
  
  const days = creditDaysMap[String(creditDays).toUpperCase()] || 30;
  const estimatedDeliveryDate = entryDate.add({ days });
  return estimatedDeliveryDate;
};

// Display values for Ship Via and Freight (resolve label from UUID when necessary)
const shipViaDisplayValue = computed(() => {
  if (props.form.ship_via && String(props.form.ship_via).trim() !== '') return props.form.ship_via;
  if (props.form.ship_via_uuid) {
    const rec = shipViaStore.getShipViaByUuid(String(props.form.ship_via_uuid));
    return rec?.ship_via || '';
  }
  return '';
});

const freightDisplayValue = computed(() => {
  if (props.form.freight && String(props.form.freight).trim() !== '') return props.form.freight;
  if (props.form.freight_uuid) {
    const rec = freightStore.getFreightByUuid(String(props.form.freight_uuid));
    return rec?.ship_via || '';
  }
  return '';
});

const normalizePoMode = (value?: string | null) => {
  // Always return PROJECT as only one option is available
  // const mode = String(value || "PROJECT").toUpperCase();
  // return mode === "CUSTOM" ? "CUSTOM" : "PROJECT";
  return "PROJECT";
};

const poModeOptions = [
  { label: "Purchase Order for Project", value: "PROJECT" },
  // { label: "Custom Purchase Order", value: "CUSTOM" }, // Commented out - only Project PO available
];

interface PoTypeOption {
  label: string
  value: string
  uuid: string
}

const poTypeOptions: PoTypeOption[] = [
  { label: 'Labor', value: 'LABOR', uuid: 'LABOR' },
  { label: 'Material', value: 'MATERIAL', uuid: 'MATERIAL' },
];

const isCustomPurchaseOrder = computed(() => normalizePoMode(props.form.po_mode) === "CUSTOM");
const isProjectPurchaseOrder = computed(() => !isCustomPurchaseOrder.value);
const isLaborPurchaseOrder = computed(() => {
  const poType = String(props.form.po_type || props.form.po_type_uuid || '').toUpperCase();
  return poType === 'LABOR';
});

// Validation for required fields
const isFormValid = computed(() => {
  // Required for all POs
  const hasCorporation = !!props.form.corporation_uuid;
  const hasPoType = !!(props.form.po_type || props.form.po_type_uuid);
  const hasVendor = !!props.form.vendor_uuid;
  const hasEntryDate = !!props.form.entry_date;
  const hasCreditDays = !!props.form.credit_days;
  const hasEstimatedDeliveryDate = !!props.form.estimated_delivery_date;
  
  // Required for project POs
  const hasProject = isProjectPurchaseOrder.value ? !!props.form.project_uuid : true;
  
  // Required for Material POs only
  const hasFreight = isLaborPurchaseOrder.value ? true : !!(props.form.freight || props.form.freight_uuid);
  const hasShipVia = isLaborPurchaseOrder.value ? true : !!(props.form.ship_via || props.form.ship_via_uuid);
  const hasIncludeItems = isLaborPurchaseOrder.value ? true : !!props.form.include_items;
  
  // Check if quantities exceed available quantities (only for Material POs importing from estimate)
  const quantitiesValid = !hasQuantityExceeded.value;
  
  return hasCorporation && 
         hasPoType && 
         hasVendor && 
         hasEntryDate && 
         hasCreditDays && 
         hasEstimatedDeliveryDate && 
         hasProject && 
         hasFreight && 
         hasShipVia && 
         hasIncludeItems &&
         quantitiesValid;
});

const poModeOption = computed<any>({
  get: () => {
    const mode = normalizePoMode(props.form.po_mode);
    return poModeOptions.find((opt) => opt.value === mode);
  },
  set: (val) => {
    const value = typeof val === "string" ? val : val?.value;
    handlePoModeChange(value);
  },
});

// Options for dropdowns
const creditDaysOptions = [
  { label: 'Net 15', value: 'NET_15' },
  { label: 'Net 25', value: 'NET_25' },
  { label: 'Net 30', value: 'NET_30' },
  { label: 'Net 45', value: 'NET_45' },
  { label: 'Net 60', value: 'NET_60' },
];

// Ship Via and Freight now use shared reusable selects

const includeItemsOptions = [
  { label: 'Custom', value: 'CUSTOM' },
  { label: 'Import Items from Master', value: 'IMPORT_ITEMS_FROM_MASTER' },
  { label: 'Import Items from Estimate', value: 'IMPORT_ITEMS_FROM_ESTIMATE' },
];

// Check if Include Items field can be enabled (requires project, PO type, and vendor)
const canEnableIncludeItems = computed(() => {
  // For project POs, need project, PO type, and vendor
  if (isProjectPurchaseOrder.value) {
    return !!(
      props.form.project_uuid &&
      (props.form.po_type || props.form.po_type_uuid) &&
      props.form.vendor_uuid
    );
  }
  // For custom POs, need PO type and vendor (no project required)
  return !!(
    (props.form.po_type || props.form.po_type_uuid) &&
    props.form.vendor_uuid
  );
});

// Placeholder for Include Items field
const includeItemsPlaceholder = computed(() => {
  if (props.readonly) {
    return 'Select how to include items';
  }
  if (!canEnableIncludeItems.value) {
    if (isProjectPurchaseOrder.value) {
      if (!props.form.project_uuid && !(props.form.po_type || props.form.po_type_uuid) && !props.form.vendor_uuid) {
        return 'Select project, PO type, and vendor first';
      } else if (!props.form.project_uuid) {
        return 'Select project first';
      } else if (!(props.form.po_type || props.form.po_type_uuid)) {
        return 'Select PO type first';
      } else if (!props.form.vendor_uuid) {
        return 'Select vendor first';
      }
    } else {
      if (!(props.form.po_type || props.form.po_type_uuid) && !props.form.vendor_uuid) {
        return 'Select PO type and vendor first';
      } else if (!(props.form.po_type || props.form.po_type_uuid)) {
        return 'Select PO type first';
      } else if (!props.form.vendor_uuid) {
        return 'Select vendor first';
      }
    }
  }
  return 'Select how to include items';
});

const filteredIncludeItemsOptions = computed(() => {
  let options = includeItemsOptions
  
  // Remove 'Custom' option when creating a new purchase order
  if (!props.editingPurchaseOrder || !props.form.uuid) {
    options = options.filter((opt) => opt.value !== 'CUSTOM')
  }
  
  if (isCustomPurchaseOrder.value) {
    return options.filter(
      (opt) => opt.value !== 'IMPORT_ITEMS_FROM_ESTIMATE'
    )
  }
  return options
})

// Labor PO always uses "Against Estimate" behavior - raise_against field removed

const enforceIncludeItemsConsistency = () => {
  // Skip enforcement for Labor PO as they don't use include_items
  if (isLaborPurchaseOrder.value) {
    return;
  }
  
  // Only enforce consistency if a value is already set (don't auto-select for empty values)
  const currentValue = props.form.include_items
  if (!currentValue || String(currentValue).trim() === '') {
    return; // Don't set a default, let user select
  }
  
  const allowedValues = filteredIncludeItemsOptions.value.map(opt => opt.value)
  if (!allowedValues.includes(currentValue)) {
    // When editing and in CUSTOM mode, set to CUSTOM as default
    // Otherwise, clear the invalid value
    if (props.editingPurchaseOrder && props.form.uuid && isCustomPurchaseOrder.value) {
      const customOption = filteredIncludeItemsOptions.value.find(opt => opt.value === 'CUSTOM')
      if (customOption) {
        updateFormFields({ include_items: 'CUSTOM' })
        return
      }
    }
    // Clear the invalid value instead of setting a default
    updateFormFields({ include_items: '' })
  }
}

// Removed Terms & Conditions UI

// Selected options
const resolvePoTypeOption = (input: any): PoTypeOption | undefined => {
  if (input === null || input === undefined || input === '') return undefined;
  if (typeof input === 'object') {
    const candidate = input.uuid ?? input.value ?? input.label ?? input.id;
    return resolvePoTypeOption(candidate);
  }
  const key = String(input).trim().toUpperCase();
  if (!key) return undefined;
  return poTypeOptions.find(
    (opt) => opt.uuid === key || opt.value === key || opt.label.toUpperCase() === key
  );
};

const setPoTypeFromInput = (input: any) => {
  const option = resolvePoTypeOption(input);
  updateFormFields({
    po_type_uuid: option?.uuid ?? null,
    po_type: option?.value ?? null,
  });
};

const poTypeOption = computed<any>({
  get: () => {
    return (
      resolvePoTypeOption(props.form.po_type_uuid) ||
      resolvePoTypeOption(props.form.po_type)
    );
  },
  set: (val) => {
    setPoTypeFromInput(val)
  },
});

const creditDaysOption = computed<any>({
  get: () => {
    const v = props.form.credit_days
    if (!v) return undefined
    const target = String(v).toLowerCase()
    // match by ID first
    let found = creditDaysOptions.find(opt => String(opt.value).toLowerCase() === target)
    if (!found) {
      // legacy label support, normalize underscores to spaces
      found = creditDaysOptions.find(opt => opt.label.toLowerCase() === target.replace(/_/g, ' '))
    }
    return found
  },
  set: (val) => {
    // Handle both string value (when value-key is used) and option object
    const value = typeof val === 'string' ? val : (val?.value || '')
    handleFormUpdate('credit_days', value)
  }
});

// Removed local computeds for ship via and freight; handled by shared selects

const includeItemsOption = computed<any>({
  get: () => {
    const v = props.form.include_items
    // Return undefined if no value is set, so the field shows as unselected
    if (!v || String(v).trim() === '') return undefined
    const target = String(v).toLowerCase()
    // match by ID first
    let found = includeItemsOptions.find(opt => String(opt.value).toLowerCase() === target)
    if (!found) {
      // legacy label support
      found = includeItemsOptions.find(opt => opt.label.toLowerCase() === target.replace(/_/g, ' '))
    }
    const available = filteredIncludeItemsOptions.value
    if (found && available.some(opt => opt.value === found.value)) {
      return found
    }
    // Return undefined if no match found, instead of defaulting to first option
    return undefined
  },
  set: (val) => {
    // Handle both string value (when value-key is used) and option object
    const value = typeof val === 'string' ? val : (val?.value || '')
    handleFormUpdate('include_items', value)
  }
});

const isImportingFromEstimate = computed(() => {
  return String(props.form.include_items || '').toUpperCase() === 'IMPORT_ITEMS_FROM_ESTIMATE';
});

const isImportingFromMaster = computed(() => {
  return String(props.form.include_items || '').toUpperCase() === 'IMPORT_ITEMS_FROM_MASTER';
});

const projectEstimates = computed(() => {
  if (!isProjectPurchaseOrder.value || !props.form.project_uuid) return [];
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (!corpUuid) return [];
  return purchaseOrderResourcesStore.getEstimatesByProject(corpUuid, props.form.project_uuid) || [];
});

const parseEstimateDate = (dateString?: string | null): Date | null => {
  if (!dateString) return null;
  try {
    const source = String(dateString);
    const normalized = source.includes('T') ? fromUTCString(source) : source;
    if (normalized && normalized.includes('-')) {
      const [yearStr, monthStr, dayStr] = normalized.split('-');
      if (yearStr && monthStr && dayStr) {
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10) - 1;
        const day = parseInt(dayStr, 10);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          return new Date(year, month, day);
        }
      }
    }
    const fallback = new Date(source);
    return isNaN(fallback.getTime()) ? null : fallback;
  } catch (error) {
    // Failed to parse estimate date
    return null;
  }
};

const latestProjectEstimate = computed(() => {
  if (!projectEstimates.value.length) return null;
  const sorted = [...projectEstimates.value].sort((a, b) => {
    const dateA = parseEstimateDate(a.estimate_date)?.getTime() || 0;
    const dateB = parseEstimateDate(b.estimate_date)?.getTime() || 0;
    return dateB - dateA;
  });
  return sorted[0];
});

const formatEstimateDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A';
  const source = String(dateString);
  const normalized = source.includes('T') ? fromUTCString(source) : source;
  if (normalized && normalized.includes('-')) {
    const [yearStr, monthStr, dayStr] = normalized.split('-');
    if (yearStr && monthStr && dayStr) {
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const calendarDate = new CalendarDate(year, month, day);
        return df.format(calendarDate.toDate(getLocalTimeZone()));
      }
    }
  }
  const fallback = parseEstimateDate(dateString);
  return fallback ? df.format(fallback) : 'N/A';
};

const estimateStatusStyles: Record<
  string,
  { label: string; containerClass: string; badgeClass: string }
> = {
  draft: {
    label: 'Drafting…',
    containerClass:
      'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-200 dark:border-gray-800',
    badgeClass:
      'bg-gray-500/20 text-gray-700 border-gray-300 dark:bg-gray-700/40 dark:text-gray-200 dark:border-gray-600',
  },
  ready: {
    label: 'Estimate ready for approval',
    containerClass:
      'bg-sky-50 text-sky-800 border-sky-100 dark:bg-sky-900/20 dark:text-sky-200 dark:border-sky-800',
    badgeClass:
      'bg-info/20 text-info border-sky-200 dark:bg-sky-800/40 dark:text-sky-200 dark:border-sky-700',
  },
  approved: {
    label: 'Estimate approved',
    containerClass:
      'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800',
    badgeClass:
      'bg-success/20 text-success border-emerald-200 dark:bg-emerald-800/40 dark:text-emerald-200 dark:border-emerald-700',
  },
};

const defaultEstimateStatusStyle = {
  label: 'Estimate status unavailable',
  containerClass:
    'bg-muted/10 text-default border border-default/60 dark:bg-muted/10 dark:text-default dark:border-default/40',
  badgeClass:
    'bg-default/10 text-default border border-default/40 dark:bg-default/10 dark:text-default dark:border-default/30',
};

const resolveEstimateStatusPresentation = (status?: string | null) => {
  const rawStatus = typeof status === 'string' ? status : '';
  const normalizedKey = rawStatus.trim().toLowerCase();
  const config = estimateStatusStyles[normalizedKey];

  if (config) {
    return {
      key: normalizedKey,
      label: config.label,
      containerClass: config.containerClass,
      badgeClass: config.badgeClass,
    };
  }

  return {
    key: normalizedKey || 'unknown',
    label: rawStatus || defaultEstimateStatusStyle.label,
    containerClass: defaultEstimateStatusStyle.containerClass,
    badgeClass: defaultEstimateStatusStyle.badgeClass,
  };
};

const estimateDetails = computed(() => {
  const estimate = latestProjectEstimate.value;
  if (!estimate) return null;
  const statusInfo = resolveEstimateStatusPresentation(estimate.status);
  return {
    number: estimate.estimate_number || 'N/A',
    status: statusInfo.label,
    statusKey: statusInfo.key,
    statusContainerClass: statusInfo.containerClass,
    statusBadgeClass: statusInfo.badgeClass,
    estimateDate: formatEstimateDate(estimate.estimate_date),
    validUntil: estimate.valid_until ? formatEstimateDate(estimate.valid_until) : null,
    finalAmount: formatCurrency(estimate.final_amount ?? estimate.total_amount ?? 0),
    lineItems: Array.isArray(estimate.line_items) ? estimate.line_items.length : 0,
    projectName: estimate.project?.project_name || '',
  };
});

const isEstimateImportBlocked = computed(() => {
  return (
    isImportingFromEstimate.value &&
    !!estimateDetails.value &&
    estimateDetails.value.statusKey !== 'approved'
  );
});

const estimateImportBlockedMessage = computed(() => {
  if (!isEstimateImportBlocked.value) return '';
  const details = estimateDetails.value;
  const number = details?.number ? ` ${details.number}` : '';
  const status = details?.status ?? 'Unavailable';
  return `Estimate${number} is ${status.toLowerCase()}. Approve the estimate before creating a purchase order or select a different include option.`;
});

const shouldShowEstimateImportWarning = computed(
  () => isEstimateImportBlocked.value
);

watch(
  isEstimateImportBlocked,
  (value) => {
    emit('estimate-import-blocked-change', value);
  },
  { immediate: true }
);

// Computed property for estimates loading state (scoped to purchaseOrderResources store)
const estimatesLoading = computed(() => {
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (!corpUuid) return false;
  const state = purchaseOrderResourcesStore.getProjectState(corpUuid, undefined);
  return state?.estimatesLoading || false;
});

const shouldShowEstimateDetails = computed(() => {
  return (
    isProjectPurchaseOrder.value &&
    isImportingFromEstimate.value &&
    (!!estimateDetails.value || estimatesLoading.value)
  );
});

// Watch for changes that require fetching estimates (when all required fields are selected)
watch(
  [
    () => props.form.corporation_uuid,
    () => props.form.project_uuid,
    () => props.form.include_items,
  ],
  async ([corpUuid, projectUuid, includeItems], [prevCorpUuid]) => {
    // Only fetch estimates if importing from estimate and we have corporation and project
    if (
      isProjectPurchaseOrder.value &&
      String(includeItems || '').toUpperCase() === 'IMPORT_ITEMS_FROM_ESTIMATE' &&
      corpUuid &&
      projectUuid
    ) {
      // Fetch estimates - scoped to purchaseOrderResources store only
      await purchaseOrderResourcesStore.ensureEstimates({
        corporationUuid: corpUuid,
        force: true,
      });
    }
  },
  { immediate: true }
);

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

const resolveFieldValue = (key: string, overrides: Record<string, any> = {}) => {
  if (Object.prototype.hasOwnProperty.call(overrides, key)) {
    return overrides[key]
  }
  return (props.form as any)?.[key]
}

type ChargeRowKey = (typeof chargeRows)[number]['key']

interface ChargeComputationState {
  key: ChargeRowKey
  percentage: number
  amount: number
  taxable: boolean
}

const buildChargeStates = (
  overrides: Record<string, any> = {},
  itemTotalValue?: number
): ChargeComputationState[] => {
  const resolvedItemTotal = roundCurrencyValue(
    itemTotalValue !== undefined
      ? itemTotalValue
      : parseNumericInput(resolveFieldValue('item_total', overrides))
  )
  const itemTotalChanged = Object.prototype.hasOwnProperty.call(overrides, 'item_total')

  return chargeRows.map((row) => {
    const percentageKey = `${row.key}_charges_percentage`
    const amountKey = `${row.key}_charges_amount`
    const taxableKey = `${row.key}_charges_taxable`

    const percentageRaw = resolveFieldValue(percentageKey, overrides)
    const amountRaw = resolveFieldValue(amountKey, overrides)
    const taxableRaw = resolveFieldValue(taxableKey, overrides)

    const percentage = roundTo(parseNumericInput(percentageRaw), 4)
    const taxable = Boolean(taxableRaw)

    const percentageChanged = Object.prototype.hasOwnProperty.call(overrides, percentageKey)
    const amountChanged = Object.prototype.hasOwnProperty.call(overrides, amountKey)

    let amount = roundCurrencyValue(parseNumericInput(amountRaw))
    const shouldRecalculateAmount =
      itemTotalChanged ||
      percentageChanged ||
      (!amountChanged && percentage !== 0)

    if (shouldRecalculateAmount) {
      amount = roundCurrencyValue(resolvedItemTotal * (percentage / 100))
    }

    return {
      key: row.key,
      percentage,
      amount,
      taxable,
    }
  })
}

type SalesTaxRowKey = (typeof salesTaxRows)[number]['key']

interface SalesTaxComputationState {
  key: SalesTaxRowKey
  percentage: number
  amount: number
}

const buildSalesTaxStates = (
  overrides: Record<string, any> = {},
  taxableBase: number,
  options: { chargesChanged?: boolean } = {}
): SalesTaxComputationState[] => {
  const itemTotalChanged = Object.prototype.hasOwnProperty.call(overrides, 'item_total')
  const chargesChanged = options.chargesChanged ?? false

  return salesTaxRows.map((row) => {
    const percentageKey = `${row.key}_percentage`
    const amountKey = `${row.key}_amount`

    const percentageRaw = resolveFieldValue(percentageKey, overrides)
    const amountRaw = resolveFieldValue(amountKey, overrides)

    const percentage = roundTo(parseNumericInput(percentageRaw), 4)
    const percentageChanged = Object.prototype.hasOwnProperty.call(overrides, percentageKey)
    const amountChanged = Object.prototype.hasOwnProperty.call(overrides, amountKey)

    let amount = roundCurrencyValue(parseNumericInput(amountRaw))
    const shouldRecalculateAmount =
      itemTotalChanged ||
      chargesChanged ||
      percentageChanged ||
      (!amountChanged && percentage !== 0)

    if (shouldRecalculateAmount) {
      amount = roundCurrencyValue(taxableBase * (percentage / 100))
    }

    return {
      key: row.key,
      percentage,
      amount,
    }
  })
}

const chargesTotal = computed(() => roundCurrencyValue(parseNumericInput(props.form.charges_total)))
const taxTotal = computed(() => roundCurrencyValue(parseNumericInput(props.form.tax_total)))
const totalPoAmount = computed(() => roundCurrencyValue(parseNumericInput(props.form.total_po_amount)))

const calculateTaxableChargeTotal = (overrides: Record<string, any> = {}) => {
  const states = buildChargeStates(overrides)
  return roundCurrencyValue(
    states.reduce((sum, state) => (state.taxable ? sum + state.amount : sum), 0)
  )
}

const recalculateChargesAndTaxes = (
  overrides: Record<string, any> = {},
  options: { poItems?: any[]; includeItems?: any } = {}
) => {
  // Use the computed itemTotal if no override is provided
  // This ensures we always use the freshly calculated value from po_items
  const resolvedItemTotal = roundCurrencyValue(
    Object.prototype.hasOwnProperty.call(overrides, 'item_total')
      ? parseNumericInput(overrides.item_total)
      : itemTotal.value
  )

  const chargeStates = buildChargeStates(overrides, resolvedItemTotal)
  const chargesTotalValue = roundCurrencyValue(
    chargeStates.reduce((sum, state) => sum + state.amount, 0)
  )
  const taxableChargesValue = roundCurrencyValue(
    chargeStates.reduce((sum, state) => (state.taxable ? sum + state.amount : sum), 0)
  )
  const taxableBase = roundCurrencyValue(resolvedItemTotal + taxableChargesValue)

  const chargesChanged = Object.keys(overrides).some((key) =>
    key.endsWith('_charges_amount') ||
    key.endsWith('_charges_percentage') ||
    key.endsWith('_charges_taxable')
  )

  const salesTaxStates = buildSalesTaxStates(overrides, taxableBase, { chargesChanged })
  const taxTotalValue = roundCurrencyValue(
    salesTaxStates.reduce((sum, state) => sum + state.amount, 0)
  )
  const totalAmount = roundCurrencyValue(resolvedItemTotal + chargesTotalValue + taxTotalValue)

  const updatedFields: Record<string, any> = {
    item_total: resolvedItemTotal,
    charges_total: chargesTotalValue,
    tax_total: taxTotalValue,
    total_po_amount: totalAmount,
  }
  
  // Only include po_items if explicitly provided in options
  if (options.poItems) {
    updatedFields.po_items = options.poItems.map((item: any) => ({ ...item }))
  }
  
  // Only include include_items if explicitly provided in options
  if (options.includeItems !== undefined) {
    updatedFields.include_items = options.includeItems
  }

  chargeStates.forEach((state) => {
    updatedFields[`${state.key}_charges_percentage`] = state.percentage
    updatedFields[`${state.key}_charges_amount`] = state.amount
    updatedFields[`${state.key}_charges_taxable`] = state.taxable
  })

  salesTaxStates.forEach((state) => {
    updatedFields[`${state.key}_percentage`] = state.percentage
    updatedFields[`${state.key}_amount`] = state.amount
  })

  const chargesBreakdown = chargeStates.reduce(
    (acc, state) => {
      acc[state.key] = {
        percentage: state.percentage,
        amount: state.amount,
        taxable: state.taxable,
      }
      return acc
    },
    {} as Record<
      string,
      { percentage: number | null; amount: number | null; taxable: boolean }
    >
  )

  const salesTaxesBreakdown = salesTaxStates.reduce(
    (acc, state) => {
      acc[state.key] = {
        percentage: state.percentage,
        amount: state.amount,
      }
      return acc
    },
    {} as Record<string, { percentage: number | null; amount: number | null }>
  )

  updatedFields.financial_breakdown = {
    charges: chargesBreakdown,
    sales_taxes: salesTaxesBreakdown,
    totals: {
      item_total: resolvedItemTotal,
      charges_total: chargesTotalValue,
      tax_total: taxTotalValue,
      total_po_amount: totalAmount,
    },
  }

  updateFormFields(updatedFields)
}

// Handler for financial breakdown component updates
const handleFinancialBreakdownUpdate = (updates: Record<string, any>) => {
  // The component handles all calculations, we just need to update the form
  updateFormFields(updates)
}

const normalizeNumber = (value: any, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const itemTypeNamesByUuid = computed(() => {
  const lookup = new Map<string, string>();
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (!corpUuid) return lookup;
  // Use purchaseOrderResourcesStore instead of global itemTypesStore
  const activeTypes = purchaseOrderResourcesStore.getItemTypes(
    corpUuid,
    props.form.project_uuid
  );
  activeTypes.forEach((type: any) => {
    lookup.set(type.uuid, type.item_type);
  });
  return lookup;
});

// Scoped item types for passing to child components (avoids polluting global store)
const scopedItemTypes = computed(() => {
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (!corpUuid) return [];
  return purchaseOrderResourcesStore.getItemTypes(
    corpUuid,
    props.form.project_uuid
  );
});

// Scoped cost code configurations for passing to child components (avoids polluting global store)
const scopedCostCodeConfigurations = computed(() => {
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (!corpUuid) {
    return [];
  }
  const configs = purchaseOrderResourcesStore.getCostCodeConfigurations(
    corpUuid,
    props.form.project_uuid
  );
  return configs;
});

const preferredItemOptions = computed(() => {
  const corpUuid = selectedCorporationUuid.value;
  if (!corpUuid) return [];
  const projectUuid = selectedProjectUuid.value ?? undefined;
  const source =
    purchaseOrderResourcesStore.getPreferredItems(corpUuid, projectUuid) || [];
  return source
    .map((item: any) => {
      const value =
        item.item_uuid ||
        item.uuid ||
        item.id ||
        (typeof item.value === "string" ? item.value : "");
      const label =
        item.item_name ||
        item.name ||
        item.label ||
        item.description ||
        String(value);
      // Extract sequence for SequenceSelect matching
      const itemSequence = item.item_sequence || item.sequence || '';
      return {
        label,
        value: String(value || ""),
        item_sequence: itemSequence, // Include sequence for SequenceSelect
        sequence: itemSequence, // Also include as 'sequence' for compatibility
        raw: item,
      };
    })
    .filter((opt: any) => Boolean(opt.value));
});

const preferredItemOptionMap = computed(() => {
  const map = new Map<string, any>();
  preferredItemOptions.value.forEach((opt) => {
    map.set(String(opt.value), opt);
  });
  return map;
});

const preferredItemsForProject = computed(() => {
  const corpUuid = selectedCorporationUuid.value ?? undefined;
  if (!corpUuid) return [];
  const projectUuid = selectedProjectUuid.value ?? undefined;
  // Directly call the getter (Pinia automatically unwraps the computed)
  return purchaseOrderResourcesStore.getPreferredItems(corpUuid, projectUuid) || [];
});

const getPreferredItemsSignature = (items: any[]) =>
  items
    .map((item, index) =>
      String(
        item?.item_uuid ??
          item?.uuid ??
          item?.id ??
          item?.value ??
          `${item?.cost_code_uuid || 'item'}-${index}`
      )
    )
    .join('|');

const transformPreferredItemToPoItem = (item: any, index: number) => {
  const costCodeNumber = item?.cost_code_number || '';
  const costCodeName = item?.cost_code_name || '';
  const costCodeLabel = [costCodeNumber, costCodeName]
    .filter((segment: string) => String(segment || '').trim().length > 0)
    .join(' ')
    .trim();

  const unitLabel =
    item?.unit_label ||
    item?.unit ||
    item?.uom ||
    item?.uom_label ||
    item?.unit_short_name ||
    '';

  // Try to find unit_uuid from UOM store by matching unit string
  let unitUuid = item?.unit_uuid || item?.uom_uuid || null;
  const corpUuidForUOM = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (!unitUuid && unitLabel && corpUuidForUOM) {
    const activeUOMs = uomStore.getActiveUOM(corpUuidForUOM);
    const matchedUOM = activeUOMs.find((uom: any) => 
      uom.short_name?.toLowerCase() === unitLabel.toLowerCase() ||
      uom.uom_name?.toLowerCase() === unitLabel.toLowerCase()
    );
    if (matchedUOM) {
      unitUuid = matchedUOM.uuid;
    }
  }

  const unitPrice = normalizeNumber(item?.unit_price, 0);
  const quantity = normalizeNumber(item?.quantity, 0);
  const total =
    item?.total != null ? normalizeNumber(item?.total, unitPrice * quantity) : unitPrice * quantity;

  const itemTypeLabel =
    item?.item_type_label ||
    item?.item_type ||
    (item?.item_type_uuid ? itemTypeNamesByUuid.value.get(item.item_type_uuid) : '') ||
    '';

  // Set po_unit_price and po_quantity to default values from preferred item
  // User can still change them in the table
  const poUnitPrice = unitPrice > 0 ? unitPrice : null;
  const poQuantity = quantity > 0 ? quantity : 1; // Default to 1 if no quantity specified
  const poTotal = poUnitPrice && poQuantity ? roundCurrencyValue(poUnitPrice * poQuantity) : null;

  // Extract sequence from preferred item (for SequenceSelect matching)
  const itemSequence = item?.item_sequence || item?.sequence || '';

  return {
    id: item?.id || `${item?.cost_code_uuid || 'master'}-${index}`,
    cost_code_uuid: item?.cost_code_uuid || item?.cost_code_configuration_uuid || null,
    cost_code_number: costCodeNumber,
    cost_code_name: costCodeName,
    cost_code_label: costCodeLabel,
    division_name: item?.division_name || '',
    item_type_uuid: item?.item_type_uuid || null,
    item_type_label: itemTypeLabel,
    sequence_uuid: null,
    sequence: itemSequence, // Include sequence for SequenceSelect
    item_sequence: itemSequence, // Also include as item_sequence for compatibility
    item_uuid: item?.item_uuid || item?.uuid || null,
    name: item?.item_name || item?.name || item?.label || '',
    description: item?.description || '',
    approval_checks: null,
    model_number: item?.model_number || '',
    location_uuid: null,
    location: '',
    unit_price: unitPrice,
    po_unit_price: poUnitPrice,
    uom: unitLabel,
    uom_uuid: unitUuid,
    uom_label: unitLabel,
    unit_uuid: unitUuid,
    unit_label: unitLabel,
    quantity,
    po_quantity: poQuantity,
    total,
    po_total: poTotal,
    display_metadata: {
      cost_code_label: costCodeLabel,
      cost_code_number: costCodeNumber,
      cost_code_name: costCodeName,
      division_name: item?.division_name || '',
      item_type_label: itemTypeLabel,
      sequence: itemSequence, // Preserve sequence in display_metadata
      location_display: '',
      unit_label: unitLabel,
      unit_uuid: unitUuid,
    },
  };
};

const applyPreferredItemsToForm = (preferredItems: any[], { force = false } = {}) => {
  if (!Array.isArray(preferredItems) || preferredItems.length === 0) {
    return;
  }

  const signature = getPreferredItemsSignature(preferredItems);
  const currentItems = Array.isArray(props.form.po_items) ? props.form.po_items : [];
  
  // Don't overwrite items if we're editing an existing PO (unless forced)
  if (!force && props.editingPurchaseOrder && currentItems.length > 0) {
    return;
  }
  
  const shouldApply =
    force ||
    !currentItems.length ||
    signature !== lastAppliedPreferredItemsSignature.value;

  if (!shouldApply) {
    return;
  }

  // Transform preferred items to PO items format
  const poItems = preferredItems.map((item, index) => transformPreferredItemToPoItem(item, index));
  
  // Show modal for item selection instead of directly applying
  // Mark this as initial import (not editing existing selection)
  isEditingMasterSelection.value = false;
  
  pendingMasterSignature.value = signature;
  showMasterItemsModal.value = true;
};

const mapPoItemForDisplay = (item: any, index: number, estimateItem?: any) => {
  // Check both metadata (JSONB from DB) and display_metadata (computed/display)
  const display = item?.display_metadata || item?.metadata || {};

  const costCodeNumber = display.cost_code_number || item.cost_code_number || '';
  const costCodeName = display.cost_code_name || item.cost_code_name || '';
  const costCodeLabel =
    display.cost_code_label ||
    [costCodeNumber, costCodeName]
      .filter((segment: string) => String(segment || '').trim().length > 0)
      .join(' ')
      .trim();

  const divisionName = display.division_name || item.division_name || '';
  const itemTypeLabel =
    display.item_type_label ||
    item.item_type_label ||
    (item.item_type_uuid ? itemTypeNamesByUuid.value.get(item.item_type_uuid) : '') ||
    '';
  const locationDisplay =
    display.location_display || item.location || item.location_uuid || '';
  
  // Extract sequence - first try from display_metadata/metadata, then from the item itself,
  // then from estimate item (if available), then look it up from preferred items using item_uuid
  // Also check item.metadata directly (JSONB from database)
  const itemMetadata = item?.metadata || {};
  let sequenceValue = display.sequence || 
                      itemMetadata.sequence ||
                      item.item_sequence || 
                      item.sequence || '';
  
  // If no sequence found and we have an estimate item, use it as source of truth
  if (!sequenceValue && estimateItem) {
    sequenceValue = estimateItem.item_sequence || 
                    estimateItem.sequence || 
                    estimateItem.display_metadata?.sequence ||
                    estimateItem.metadata?.sequence ||
                    '';
  }
  
  // If still no sequence found and we have an item_uuid, look it up in preferred items
  if (!sequenceValue && item.item_uuid) {
    const matchedItem = preferredItemOptionMap.value.get(String(item.item_uuid));
    if (matchedItem?.item_sequence) {
      sequenceValue = matchedItem.item_sequence;
    } else if (matchedItem?.sequence) {
      sequenceValue = matchedItem.sequence;
    } else if (matchedItem?.raw?.item_sequence) {
      sequenceValue = matchedItem.raw.item_sequence;
    }
  }

  // Check for approval_checks_uuids (JSONB from DB) or approval_checks (legacy/display)
  const approvalSource =
    display.approval_checks || 
    item.approval_checks || 
    item.approvalChecks || 
    (item.approval_checks_uuids && Array.isArray(item.approval_checks_uuids) ? item.approval_checks_uuids : null) ||
    null;
  const approvalChecks = Array.isArray(approvalSource)
    ? approvalSource
    : approvalSource
      ? [approvalSource]
      : [];
  
  const unitValue =
    display.unit_label ||
    item.unit_label ||
    item.uom_label ||
    item.unit ||
    item.uom ||
    '';
  const unitUuid = item.uom_uuid || item.unit_uuid || display.unit_uuid || null;

  // Estimate fields: derive from the estimate source of truth (estimateItem)
  // whenever available. Fallback to values on the PO item only if no estimate
  // data is present.
  const estimateUnitPrice = estimateItem
    ? normalizeNumber(estimateItem.unit_price, 0)
    : normalizeNumber(item.unit_price, 0);
  const estimateTotal = estimateItem
    ? normalizeNumber(estimateItem.total, 0)
    : normalizeNumber(item.total, 0);

  let estimateQuantity = estimateItem
    ? normalizeNumber(estimateItem.quantity, 0)
    : normalizeNumber(item.quantity, 0);

  if (estimateUnitPrice && estimateTotal) {
    estimateQuantity =
      Math.round(
        (estimateTotal / estimateUnitPrice + Number.EPSILON) * 10000
      ) / 10000;
  }

  const matchedItemOption =
    item.item_uuid && preferredItemOptionMap.value.get(String(item.item_uuid));
  
  // Resolve item name - prefer saved name, then from estimate item (if available), then lookup from preferred items
  // Also check item.metadata directly (JSONB from database) and display_metadata
  let resolvedItemName =
    item.item_name ||  // Direct database field (primary source)
    item.name ||
    itemMetadata.item_name ||
    display.item_name ||
    '';
  
  // If no item name found and we have an estimate item, use it as source of truth
  if (!resolvedItemName && estimateItem) {
    resolvedItemName = estimateItem.item_name ||
                       estimateItem.name ||
                       estimateItem.display_metadata?.item_name ||
                       estimateItem.metadata?.item_name ||
                       '';
  }
  
  // If still no item name found, lookup from preferred items
  if (!resolvedItemName && item.item_uuid) {
    resolvedItemName = matchedItemOption?.label ||
                       matchedItemOption?.raw?.item_name ||
                       matchedItemOption?.raw?.name ||
                       '';
  }
  
  // Final fallback to description if still no name
  if (!resolvedItemName) {
    resolvedItemName = item.description || '';
  }

  // Extract sequence from item (for SequenceSelect matching)
  // Use the same value we extracted above for consistency
  const resolvedSequence = sequenceValue;
  
  // Also update display_metadata.sequence to ensure it's available for SequenceSelect
  if (sequenceValue && item.display_metadata) {
    item.display_metadata.sequence = sequenceValue;
  }

  const options: any[] = [...preferredItemOptions.value];
  
  if (
    item.item_uuid &&
    !preferredItemOptionMap.value.has(String(item.item_uuid))
  ) {
    // Add the current item to options if it's not in the preferred items list
    // This ensures the select components can display the saved item
    options.push({
      label: resolvedItemName || String(item.item_uuid),
      value: String(item.item_uuid),
      uuid: String(item.item_uuid), // Also add uuid for SequenceSelect/ItemSelect compatibility
      item_uuid: String(item.item_uuid), // And item_uuid
      item_name: resolvedItemName, // Add item_name for ItemSelect
      name: resolvedItemName, // And name
      item_sequence: resolvedSequence, // Include sequence for SequenceSelect
      sequence: resolvedSequence, // Also include as 'sequence' for compatibility
      raw: { 
        ...item, 
        item_sequence: resolvedSequence, // Ensure sequence is in raw data
        sequence: resolvedSequence,
        item_name: resolvedItemName,
        name: resolvedItemName,
      },
    });
  }

  return {
    id: item.id || `${item.cost_code_uuid || 'po'}-${index}`,
    cost_code_uuid: item.cost_code_uuid || null,
    cost_code_number: costCodeNumber,
    cost_code_name: costCodeName,
    cost_code_label: costCodeLabel || costCodeNumber || costCodeName || '',
    division_name: divisionName,
    item_type_uuid: item.item_type_uuid || null,
    item_type_label: itemTypeLabel,
    sequence: sequenceValue,
    item_sequence: sequenceValue, // Also include as item_sequence for compatibility
    item_uuid: item.item_uuid || null,
    name: resolvedItemName,
    description: item.description || '',
    approval_checks: approvalChecks,
    model_number: item.model_number || '',
    location: locationDisplay,
    location_uuid: item.location_uuid || display.location_uuid || null,
    unit_price: estimateUnitPrice,
    unit: unitValue,
    unit_uuid: unitUuid,
    quantity: estimateQuantity,
    total: estimateTotal,
    po_unit_price: item.po_unit_price ?? null,
    po_quantity: item.po_quantity ?? null,
    po_total: item.po_total ?? null,
    options,
    raw: item,
  };
};

const poItemsForDisplay = computed(() => {
  const source = Array.isArray(props.form.po_items) ? props.form.po_items : []

  // Build a lookup of estimate items by item_uuid to use as the source of truth
  // for grey, read-only estimate fields in the PO items table.
  const estimateLookup = new Map<string, any>();
  (estimatePoItems.value || []).forEach((estItem: any) => {
    if (estItem?.item_uuid) {
      estimateLookup.set(String(estItem.item_uuid).toLowerCase(), estItem);
    }
  });
  
  // Get list of removed items
  const removedItems = Array.isArray((props.form as any)?.removed_po_items)
    ? (props.form as any).removed_po_items
    : []
  
  // If no items are removed, just return all mapped items
  if (removedItems.length === 0) {
    const mapped = source.map((item: any, index: number) => {
      const key = item?.item_uuid
        ? String(item.item_uuid).toLowerCase()
        : '';
      const estimateItem = key ? estimateLookup.get(key) : undefined;
      return mapPoItemForDisplay(item, index, estimateItem);
    })
    return mapped
  }
  
  // Build sets of identifiers from removed items for efficient lookup
  const removedItemUuids = new Set<string>()
  const removedKeys = new Set<string>()
  
  removedItems.forEach((removedItem: any) => {
    // Primary: Match by item_uuid (most reliable)
    if (removedItem?.item_uuid) {
      removedItemUuids.add(String(removedItem.item_uuid).toLowerCase())
    }
    
    // Secondary: Match by composite key
    const key = buildPoItemMatchKey(removedItem)
    if (key) {
      removedKeys.add(key)
    }
    
    // Tertiary: Match by id/uuid
    const idKey = normalizeMatchValue(removedItem?.id || removedItem?.uuid)
    if (idKey) {
      removedKeys.add(`id:${idKey}`)
    }
  })
  
  // Filter out items that match any removed item
  const filtered = source.filter((item: any) => {
    // Check by item_uuid first (most reliable)
    if (item?.item_uuid) {
      const itemUuid = String(item.item_uuid).toLowerCase()
      if (removedItemUuids.has(itemUuid)) {
        return false
      }
    }
    
    // Check by composite key
    const key = buildPoItemMatchKey(item)
    if (key && removedKeys.has(key)) {
      return false
    }
    
    // Check by id
    const idKey = normalizeMatchValue(item?.id || item?.uuid)
    if (idKey && removedKeys.has(`id:${idKey}`)) {
      return false
    }
    
    return true // Keep this item
  })
  
  // Map filtered items for display
  return filtered.map((item: any, index: number) => mapPoItemForDisplay(item, index))
})

const removedPoItemsModalOpen = ref(false)
const removedPoItems = computed(() =>
  Array.isArray((props.form as any)?.removed_po_items)
    ? (props.form as any).removed_po_items
    : []
)
const hasRemovedPoItems = computed(() => removedPoItems.value.length > 0)

const openRemovedPoItemsModal = () => {
  removedPoItemsModalOpen.value = true
}

const closeRemovedPoItemsModal = () => {
  removedPoItemsModalOpen.value = false
}

const appendRemovedPoItem = (item: any) => {
  const currentRemoved = Array.isArray((props.form as any)?.removed_po_items)
    ? [...(props.form as any).removed_po_items]
    : []
  const cloned = clonePoItem(item)
  cloned.removed_at = new Date().toISOString()
  currentRemoved.push(cloned)
  return currentRemoved
}

const syncRemovedPoItemsWithCurrent = (items: any[]) => {
  const existingRemoved = Array.isArray((props.form as any)?.removed_po_items)
    ? (props.form as any).removed_po_items
    : []
  if (!existingRemoved.length) return

  const currentKeys = new Set<string>()
  items.forEach((item: any) => {
    const key = buildPoItemMatchKey(item)
    if (key) currentKeys.add(`key:${key}`)
    const fallback = normalizeMatchValue(item?.id || item?.uuid)
    if (fallback) currentKeys.add(`id:${fallback}`)
  })

  const filtered = existingRemoved.filter((item: any) => {
    const key = buildPoItemMatchKey(item)
    if (key && currentKeys.has(`key:${key}`)) {
      return false
    }
    const fallback = normalizeMatchValue(item?.id || item?.uuid)
    if (fallback && currentKeys.has(`id:${fallback}`)) {
      return false
    }
    return true
  })

  if (filtered.length !== existingRemoved.length) {
    updateFormFields({ removed_po_items: filtered })
  }
}

const restoreRemovedPoItem = (index: number) => {
  const currentRemoved = Array.isArray((props.form as any)?.removed_po_items)
    ? [...(props.form as any).removed_po_items]
    : []
  if (!currentRemoved.length) return
  const targetIndex = Math.min(Math.max(index, 0), currentRemoved.length - 1)
  const [restored] = currentRemoved.splice(targetIndex, 1)
  if (!restored) return

  const sanitized = clonePoItem(restored)
  delete sanitized.removed_at
  sanitized.po_total = computePoItemEffectiveTotal(sanitized)

  const currentItems = Array.isArray(props.form.po_items)
    ? [...props.form.po_items]
    : []
  currentItems.push(sanitized)

  // Update both removed_po_items and po_items in a single emission to avoid race conditions
  updateFormFields({ removed_po_items: currentRemoved, po_items: currentItems })
  
  // Recalculate totals after restoring the item
  nextTick(() => {
    recalculateChargesAndTaxes()
  })

  if (!currentRemoved.length) {
    closeRemovedPoItemsModal()
  }
}

const restoreAllRemovedPoItems = () => {
  const currentRemoved = Array.isArray((props.form as any)?.removed_po_items)
    ? [...(props.form as any).removed_po_items]
    : []
  if (!currentRemoved.length) return

  const currentItems = Array.isArray(props.form.po_items)
    ? [...props.form.po_items]
    : []

  currentRemoved.forEach((item: any) => {
    const sanitized = clonePoItem(item)
    delete sanitized.removed_at
    sanitized.po_total = computePoItemEffectiveTotal(sanitized)
    currentItems.push(sanitized)
  })

  // Update both removed_po_items and po_items in a single emission to avoid race conditions
  updateFormFields({ removed_po_items: [], po_items: currentItems })
  
  // Recalculate totals after restoring all items
  nextTick(() => {
    recalculateChargesAndTaxes()
  })
  
  closeRemovedPoItemsModal()
}

const hasImportedEstimateItems = computed(
  () => poItemsForDisplay.value.length > 0
);

const latestEstimateUuid = computed(() => latestProjectEstimate.value?.uuid || null);

const estimateItemsLoading = computed(() =>
  purchaseOrderResourcesStore.getEstimateItemsLoading(
    selectedCorporationUuid.value,
    selectedProjectUuid.value,
    latestEstimateUuid.value
  )
);

const estimateItemsError = computed(() =>
  purchaseOrderResourcesStore.getEstimateItemsError(
    selectedCorporationUuid.value,
    selectedProjectUuid.value,
    latestEstimateUuid.value
  )
);

const estimatePoItems = computed(() =>
  purchaseOrderResourcesStore.getEstimateItems(
    selectedCorporationUuid.value,
    selectedProjectUuid.value,
    latestEstimateUuid.value
  )
);

// Fetch used quantities from existing purchase orders for the estimate
const fetchUsedQuantities = async () => {
  if (!isImportingFromEstimate.value || !isProjectPurchaseOrder.value) {
    usedQuantitiesByItem.value = {};
    return;
  }

  const corpUuid = selectedCorporationUuid.value;
  const projectUuid = selectedProjectUuid.value;
  const estimateUuid = latestEstimateUuid.value;

  if (!corpUuid || !projectUuid || !estimateUuid) {
    usedQuantitiesByItem.value = {};
    return;
  }

  loadingQuantityAvailability.value = true;
  try {
    const response: any = await $fetch("/api/estimate-quantity-availability", {
      method: "GET",
      query: {
        corporation_uuid: corpUuid,
        project_uuid: projectUuid,
        estimate_uuid: estimateUuid,
        exclude_po_uuid: props.editingPurchaseOrder && props.form.uuid ? props.form.uuid : undefined,
      },
    });

    usedQuantitiesByItem.value = response?.data || {};
  } catch (error: any) {
    console.error("Failed to fetch used quantities:", error);
    usedQuantitiesByItem.value = {};
  } finally {
    loadingQuantityAvailability.value = false;
  }
};

// Check if PO quantities exceed available estimate quantities
const quantityExceededItems = computed(() => {
  if (!isImportingFromEstimate.value || !isProjectPurchaseOrder.value) {
    return [];
  }

  const exceededItems: Array<{
    itemUuid: string;
    itemName: string;
    estimateQuantity: number;
    usedQuantity: number;
    currentQuantity: number;
    totalQuantity: number;
  }> = [];

  // Build a map of estimate items by item_uuid
  const estimateItemsMap = new Map<string, any>();
  (estimatePoItems.value || []).forEach((estItem: any) => {
    if (estItem?.item_uuid) {
      estimateItemsMap.set(String(estItem.item_uuid).toLowerCase(), estItem);
    }
  });

  // Check each PO item
  const poItems = Array.isArray(props.form.po_items) ? props.form.po_items : [];
  poItems.forEach((poItem: any) => {
    const itemUuid = poItem?.item_uuid;
    if (!itemUuid) return;

    const itemUuidKey = String(itemUuid).toLowerCase();
    const estimateItem = estimateItemsMap.get(itemUuidKey);
    if (!estimateItem) return;

    const estimateQuantity = parseNumericInput(estimateItem.quantity || 0);
    const currentPoQuantity = parseNumericInput(poItem.po_quantity || 0);
    const usedQuantity = usedQuantitiesByItem.value[itemUuidKey] || 0;
    const totalQuantity = usedQuantity + currentPoQuantity;

    if (totalQuantity > estimateQuantity) {
      exceededItems.push({
        itemUuid: String(itemUuid),
        itemName: poItem.name || poItem.description || estimateItem.name || `Item ${itemUuid.substring(0, 8)}`,
        estimateQuantity,
        usedQuantity,
        currentQuantity: currentPoQuantity,
        totalQuantity,
      });
    }
  });

  return exceededItems;
});

// Check if any items exceed estimate quantities
const hasQuantityExceeded = computed(() => quantityExceededItems.value.length > 0);

// Generate notification message for exceeded quantities
const quantityExceededMessage = computed(() => {
  if (!hasQuantityExceeded.value) return null;

  const items = quantityExceededItems.value;
  if (items.length === 0) return null;

  if (items.length === 1) {
    const item = items[0];
    return `Quantity for "${item.itemName}" exceeds the estimate quantity. Estimate: ${formatQuantity(item.estimateQuantity)}, Already used: ${formatQuantity(item.usedQuantity)}, Current: ${formatQuantity(item.currentQuantity)}, Total: ${formatQuantity(item.totalQuantity)}.`;
  }

  return `${items.length} items exceed their estimate quantities. Total PO quantities (including existing purchase orders) cannot exceed the estimate quantities.`;
});

// Watch for estimate UUID changes to refetch used quantities (after latestEstimateUuid is defined)
watch(
  () => latestEstimateUuid.value,
  async (newEstimateUuid, oldEstimateUuid) => {
    if (
      isImportingFromEstimate.value &&
      isProjectPurchaseOrder.value &&
      newEstimateUuid &&
      newEstimateUuid !== oldEstimateUuid
    ) {
      await fetchUsedQuantities();
    }
  },
  { immediate: false }
);

// Watch for changes that require fetching used quantities (when importing from estimate)
watch(
  [
    () => props.form.corporation_uuid,
    () => props.form.project_uuid,
    () => props.form.include_items,
    () => latestEstimateUuid.value,
  ],
  async ([corpUuid, projectUuid, includeItems, estimateUuid], [prevCorpUuid, prevProjectUuid, prevIncludeItems, prevEstimateUuid]) => {
    // Only fetch used quantities if importing from estimate and we have all required values
    if (
      isProjectPurchaseOrder.value &&
      String(includeItems || '').toUpperCase() === 'IMPORT_ITEMS_FROM_ESTIMATE' &&
      corpUuid &&
      projectUuid &&
      estimateUuid
    ) {
      const wasAlreadyLoading = loadingQuantityAvailability.value;
      await fetchUsedQuantities();
      
      // After fetching used quantities, adjust PO quantities for newly imported items
      // This handles the case where items were imported before used quantities were loaded
      // Only adjust if not editing (editing should preserve existing quantities)
      if (!wasAlreadyLoading && !props.editingPurchaseOrder) {
        const currentItems = Array.isArray(props.form.po_items) ? [...props.form.po_items] : [];
        if (currentItems.length > 0) {
          // Don't adjust existing items - only new ones without saved quantities
          // For now, skip auto-adjustment here to avoid overriding user input
          // Items will be adjusted when confirmed from modal via handleEstimateItemsConfirm
        }
      }
    } else {
      // Clear used quantities if not importing from estimate
      usedQuantitiesByItem.value = {};
    }
  },
  { immediate: false }
);

const masterPoItems = computed(() => {
  const corpUuid = selectedCorporationUuid.value;
  if (!corpUuid) return [];
  const projectUuid = selectedProjectUuid.value ?? undefined;
  const preferredItems = purchaseOrderResourcesStore.getPreferredItems(corpUuid, projectUuid) || [];
  // Transform preferred items to match the format expected by the modal
  return preferredItems.map((item: any, index: number) => {
    const poItem = transformPreferredItemToPoItem(item, index);
    // Convert null to undefined for fields that the modal expects as optional
    return {
      ...poItem,
      po_unit_price: poItem.po_unit_price === null ? undefined : poItem.po_unit_price,
      po_quantity: poItem.po_quantity === null ? undefined : poItem.po_quantity,
      unit_price: poItem.unit_price === null ? undefined : poItem.unit_price,
      quantity: poItem.quantity === null ? undefined : poItem.quantity,
    } as any; // Type assertion to handle interface mismatch
  });
});

const currentEstimateItemsKey = computed(() =>
  purchaseOrderResourcesStore.estimateKey(
    selectedCorporationUuid.value,
    selectedProjectUuid.value,
    latestEstimateUuid.value
  )
);

const shouldShowEstimateItemsSection = computed(() => {
  // Don't show estimate items section for Labor PO
  if (isLaborPurchaseOrder.value) {
    return false;
  }
  
  // Don't show estimate items section if estimate import is blocked (not approved)
  if (isEstimateImportBlocked.value) {
    return false;
  }
  
  const isMaster = isImportingFromMaster.value;
  const isEstimate = isImportingFromEstimate.value;
  const loading = estimateItemsLoading.value;
  const error = !!estimateItemsError.value;
  const hasItems = hasImportedEstimateItems.value;
  
  const shouldShow = !isMaster && (isEstimate || loading || error || hasItems);
  return shouldShow;
});

const shouldShowMasterItemsSection = computed(() => {
  // Don't show master items section for Labor PO
  if (isLaborPurchaseOrder.value) {
    return false;
  }
  if (!isImportingFromMaster.value) {
    return false;
  }
  return poItemsForDisplay.value.length > 0;
});

const shouldShowLaborItemsSection = computed(() => {
  // Always show labor items section for Labor PO (even if empty, to allow adding items)
  return isLaborPurchaseOrder.value;
});

const laborItemsLoading = ref(false);
const laborItemsError = ref<string | null>(null);

// Estimate quantity availability tracking
const usedQuantitiesByItem = ref<Record<string, number>>({});
const loadingQuantityAvailability = ref(false);

// Labor items description
const laborItemsDescription = computed(() => {
  if (latestProjectEstimate.value) {
    return `Labor cost codes from estimate #${latestProjectEstimate.value.estimate_number || 'N/A'}`;
  }
  return 'Labor cost codes for purchase order';
});

// Labor PO Items display
const laborPoItemsForDisplay = computed(() => {
  const source = Array.isArray(props.form.labor_po_items) ? props.form.labor_po_items : [];
  return source.map((item: any, index: number) => ({
    id: item.id || `labor-${index}`,
    cost_code_uuid: item.cost_code_uuid || null,
    cost_code_label: item.cost_code_label || [item.cost_code_number, item.cost_code_name].filter(Boolean).join(' ').trim(),
    cost_code_number: item.cost_code_number || '',
    cost_code_name: item.cost_code_name || '',
    labor_budgeted_amount: item.labor_budgeted_amount || null,
    po_amount: item.po_amount || null,
  }));
});

// Ref to store available labor items for modal
const availableLaborItems = ref<any[]>([]);

// Computed property for labor items available for selection (from estimate or all cost codes)
const laborPoItems = computed(() => {
  return availableLaborItems.value;
});

watch(
  [
    selectedCorporationUuid,
    selectedProjectUuid,
    () => latestEstimateUuid.value,
    () => isProjectPurchaseOrder.value,
  ],
  async ([corpUuid, projectUuid, estimateUuid, isProject]) => {
    if (!corpUuid || !projectUuid || !isProject) {
      if (corpUuid || projectUuid) {
        purchaseOrderResourcesStore.clearProject(corpUuid, projectUuid);
      }
      return;
    }

    await purchaseOrderResourcesStore.ensureProjectResources({
      corporationUuid: corpUuid,
      projectUuid,
      estimateUuid,
    });
  },
  { immediate: true }
);

const lastAppliedEstimateItemsKey = ref<string | null>(null);
// Track if we should skip auto-import for editing mode or when items are pre-populated
// This prevents auto-importing estimate items when loading an existing PO with saved items
// OR when items are already pre-populated (e.g., from "To be raised" screen)
// Use a ref that gets set once on mount to remember if we started with items
const hasInitialPoItems = ref(
  (props.editingPurchaseOrder && Array.isArray(props.form.po_items) && props.form.po_items.length > 0) ||
  (!props.editingPurchaseOrder && Array.isArray(props.form.po_items) && props.form.po_items.length > 0 && props.form.include_items === 'IMPORT_ITEMS_FROM_ESTIMATE')
);
const shouldSkipEstimateAutoImport = computed(() => hasInitialPoItems.value);
const lastAppliedPreferredItemsSignature = ref<string | null>(null);

// Track if we should skip auto-import from master for editing mode
// This prevents auto-importing preferred items when loading an existing PO with "Import from Master"
// Set to true if we're editing an existing PO (regardless of whether items are loaded yet)
const hasInitialMasterItems = ref(props.editingPurchaseOrder && String(props.form.include_items || '').toUpperCase() === 'IMPORT_ITEMS_FROM_MASTER');

// Track if we're currently processing the preferred items watcher to prevent re-entry loops
const isProcessingPreferredItemsWatcher = ref(false);
// Track if we're currently processing the estimate items watcher to prevent re-entry loops
const isProcessingEstimateItemsWatcher = ref(false);
const shouldSkipMasterAutoImport = computed(() => hasInitialMasterItems.value);

// Track if we should skip auto-import labor items for editing mode
// Make it computed so it reacts to form data changes
const hasInitialLaborItems = computed(() => 
  props.editingPurchaseOrder && 
  String(props.form.po_type || props.form.po_type_uuid || '').toUpperCase() === 'LABOR' &&
  Array.isArray(props.form.labor_po_items) && 
  props.form.labor_po_items.length > 0
);
const shouldSkipLaborAutoImport = computed(() => hasInitialLaborItems.value);

// Modal state for estimate items selection
const showEstimateItemsModal = ref(false);
const pendingEstimateKey = ref<string | null>(null);
const isEditingSelection = ref(false); // Track if modal opened for editing vs initial import

// Modal state for master items selection
const showMasterItemsModal = ref(false);
const pendingMasterSignature = ref<string | null>(null);
const isEditingMasterSelection = ref(false); // Track if modal opened for editing vs initial import

// Modal state for labor items selection
const showLaborItemsModal = ref(false);
const pendingLaborItemsKey = ref<string | null>(null);
const isEditingLaborSelection = ref(false); // Track if modal opened for editing vs initial import

// Computed property for preselected items when editing
const currentFormItemsForPreselection = computed(() => {
  // Return current form items when editing, empty array when creating new
  return Array.isArray(props.form.po_items) ? props.form.po_items : [];
});

// Computed property for preselected labor items when editing
const currentFormLaborItemsForPreselection = computed(() => {
  // Return current form labor items when editing, empty array when creating new
  return Array.isArray(props.form.labor_po_items) ? props.form.labor_po_items : [];
});

// Helper to get unique identifier for an item
const getItemUniqueId = (item: any): string => {
  return item.item_uuid || item.uuid || item.id || '';
}

// Helper to calculate available quantity for an item (estimate quantity - used quantities)
const calculateAvailableQuantityForItem = (item: any): number => {
  if (!item?.item_uuid) return 0;
  
  const itemUuidKey = String(item.item_uuid).toLowerCase();
  const estimateQuantity = parseNumericInput(item.quantity || 0);
  const usedQuantity = usedQuantitiesByItem.value[itemUuidKey] || 0;
  
  const availableQuantity = Math.max(0, estimateQuantity - usedQuantity);
  return availableQuantity;
}

// Helper to adjust PO quantities to available quantities for estimate items
// Only adjusts items that don't already have a saved/edited po_quantity value
const adjustPoQuantitiesToAvailable = (items: any[], existingItemIds?: Set<string>): any[] => {
  const existingIds = existingItemIds || new Set<string>();
  
  return items.map((item: any) => {
    const itemId = getItemUniqueId(item);
    const isExistingItem = itemId && existingIds.has(itemId);
    
    // Only adjust if this is a new item (not already in the form)
    // Existing items should preserve their current po_quantity values
    if (!isExistingItem) {
      const availableQty = calculateAvailableQuantityForItem(item);
      
      if (availableQty > 0) {
        const poUnitPrice = item.po_unit_price || item.unit_price || null;
        const poQuantity = availableQty;
        const poTotal = poUnitPrice && poQuantity ? roundCurrencyValue(poUnitPrice * poQuantity) : null;
        
        return {
          ...item,
          po_quantity: poQuantity,
          po_total: poTotal,
        };
      }
    }
    
    return item;
  });
}

// Handler for when user confirms item selection in modal
const handleEstimateItemsConfirm = (selectedItems: any[]) => {
  
  if (isEditingSelection.value) {
    // When editing: Replace items with only the selected ones from the modal
    // This allows user to add/remove items by selecting/deselecting in the modal
    // The modal shows all estimate items, user selects which ones to keep/add
    const currentItems = Array.isArray(props.form.po_items) ? [...props.form.po_items] : [];
    const currentItemIds = new Set(currentItems.map(item => getItemUniqueId(item)));
    const selectedItemIds = new Set(selectedItems.map(item => getItemUniqueId(item)));
    
    // Keep existing items that are still selected in the modal
    const itemsToKeep = currentItems.filter(item => {
      const itemId = getItemUniqueId(item);
      return itemId && selectedItemIds.has(itemId);
    });
    
    // Add newly selected items that don't exist yet
    const newItems = selectedItems.filter(item => {
      const itemId = getItemUniqueId(item);
      return itemId && !currentItemIds.has(itemId);
    });
    
    // Adjust PO quantities to available quantities for new items only (preserve existing items' quantities)
    const existingItemIds = new Set(itemsToKeep.map(item => getItemUniqueId(item)));
    const adjustedNewItems = adjustPoQuantitiesToAvailable(newItems, existingItemIds);
    
    // Merge: keep existing selected items + add new selected items with adjusted quantities
    const mergedItems = [...itemsToKeep, ...adjustedNewItems];
    updatePoItems(mergedItems, true);
  } else {
    // Initial import: Replace all items with selected items, adjusting quantities to available
    // No existing items, so adjust all
    const adjustedItems = adjustPoQuantitiesToAvailable(selectedItems, new Set());
    updatePoItems(adjustedItems, true);
  }
  
  if (pendingEstimateKey.value) {
    lastAppliedEstimateItemsKey.value = pendingEstimateKey.value;
  }
  
  // Clear pending data
  pendingEstimateKey.value = null;
  
  // Reset editing flag
  isEditingSelection.value = false;
};

// Handler for when user cancels item selection
const handleEstimateItemsCancel = () => {
  
  // Clear pending data without applying
  pendingEstimateKey.value = null;
  
  // Only revert include_items if this was the initial import (not editing existing selection)
  // When editing, user already has items selected, so we should not clear include_items
  if (!isEditingSelection.value) {
    // This was initial import - revert include_items since user cancelled
    updateFormFields({ include_items: '' });
    // Clear store only if this was initial import
    purchaseOrderResourcesStore.clear();
  } else {
    // This was editing existing selection - just close modal, don't affect existing data
  }
  
  // Reset editing flag
  isEditingSelection.value = false;
};

// Handler for when user clicks "Edit Selection" button
const handleEditEstimateSelection = () => {
  
  // Get the current estimate items from store
  const currentEstimateItems = estimatePoItems.value;
  
  if (!Array.isArray(currentEstimateItems) || currentEstimateItems.length === 0) {
    return;
  }
  
  // Get the current key
  const key = currentEstimateItemsKey.value;
  
  if (!key) {
    return;
  }
  
  // Mark this as editing existing selection (not initial import)
  isEditingSelection.value = true;
  
  // Set pending data and open modal
  pendingEstimateKey.value = key;
  showEstimateItemsModal.value = true;
  
};

// Handler for when user confirms master item selection in modal
const handleMasterItemsConfirm = (selectedItems: any[]) => {
  
  if (isEditingMasterSelection.value) {
    // When editing: Replace items with only the selected ones from the modal
    const currentItems = Array.isArray(props.form.po_items) ? [...props.form.po_items] : [];
    const currentItemIds = new Set(currentItems.map(item => getItemUniqueId(item)));
    const selectedItemIds = new Set(selectedItems.map(item => getItemUniqueId(item)));
    
    // Keep existing items that are still selected in the modal
    const itemsToKeep = currentItems.filter(item => {
      const itemId = getItemUniqueId(item);
      return itemId && selectedItemIds.has(itemId);
    });
    
    // Add newly selected items that don't exist yet
    const newItems = selectedItems.filter(item => {
      const itemId = getItemUniqueId(item);
      return itemId && !currentItemIds.has(itemId);
    });
    
    
    // Merge: keep existing selected items + add new selected items
    const mergedItems = [...itemsToKeep, ...newItems];
    updatePoItems(mergedItems, true);
  } else {
    // Initial import: Replace all items with selected items
    updatePoItems(selectedItems, true);
  }
  
  if (pendingMasterSignature.value) {
    lastAppliedPreferredItemsSignature.value = pendingMasterSignature.value;
  }
  
  // Clear pending data
  pendingMasterSignature.value = null;
  
  // Reset editing flag
  isEditingMasterSelection.value = false;
};

// Handler for when user cancels master item selection
const handleMasterItemsCancel = () => {
  
  // Clear pending data without applying
  pendingMasterSignature.value = null;
  
  // Only revert include_items if this was the initial import (not editing existing selection)
  if (!isEditingMasterSelection.value) {
    // This was initial import - revert include_items since user cancelled
    updateFormFields({ include_items: '' });
    // Clear store only if this was initial import
    purchaseOrderResourcesStore.clear();
  } else {
    // This was editing existing selection - just close modal, don't affect existing data
  }
  
  // Reset editing flag
  isEditingMasterSelection.value = false;
};

// Handler for when user clicks "Edit Selection" button for master items
const handleEditMasterSelection = () => {
  
  // Get the current master items from store
  const currentMasterItems = masterPoItems.value;
  
  if (!Array.isArray(currentMasterItems) || currentMasterItems.length === 0) {
    return;
  }
  
  // Get the current signature
  const signature = getPreferredItemsSignature(preferredItemsForProject.value);
  
  if (!signature) {
    return;
  }
  
  // Mark this as editing existing selection (not initial import)
  isEditingMasterSelection.value = true;
  
  // Set pending data and open modal
  pendingMasterSignature.value = signature;
  showMasterItemsModal.value = true;
  
};

// Helper to get unique identifier for labor items
const getLaborItemUniqueId = (item: any): string => {
  return item.cost_code_uuid || item.uuid || item.id || '';
}

// Handler for when user confirms labor item selection in modal
const handleLaborItemsConfirm = (selectedItems: any[]) => {
  
  if (isEditingLaborSelection.value) {
    // When editing: Replace items with only the selected ones from the modal
    const currentItems = Array.isArray(props.form.labor_po_items) ? [...props.form.labor_po_items] : [];
    const currentItemIds = new Set(currentItems.map(item => getLaborItemUniqueId(item)));
    const selectedItemIds = new Set(selectedItems.map(item => getLaborItemUniqueId(item)));
    
    // Keep existing items that are still selected in the modal
    const itemsToKeep = currentItems.filter(item => {
      const itemId = getLaborItemUniqueId(item);
      return itemId && selectedItemIds.has(itemId);
    });
    
    // Add newly selected items that don't exist yet
    const newItems = selectedItems.filter(item => {
      const itemId = getLaborItemUniqueId(item);
      return itemId && !currentItemIds.has(itemId);
    });
    
    
    // Merge: keep existing selected items + add new selected items
    const mergedItems = [...itemsToKeep, ...newItems];
    updateFormFields({ labor_po_items: mergedItems });
  } else {
    // Initial import: Replace all items with selected items
    updateFormFields({ labor_po_items: selectedItems });
  }
  
  // Clear pending data
  pendingLaborItemsKey.value = null;
  
  // Reset editing flag
  isEditingLaborSelection.value = false;
};

// Handler for when user cancels labor item selection
const handleLaborItemsCancel = () => {
  
  // Clear pending data without applying
  pendingLaborItemsKey.value = null;
  
  // Reset editing flag
  isEditingLaborSelection.value = false;
};

// Handler for when user clicks "Edit Selection" button for labor items
const handleEditLaborSelection = async () => {
  
  // Load from estimate (Labor PO always uses estimate)
  const projectUuid = props.form.project_uuid;
  const estimateUuid = latestProjectEstimate.value?.uuid;
  
  if (!projectUuid || !estimateUuid) {
    return;
  }
  
  try {
    const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
    if (!corpUuid) {
      return;
    }
    
    const response: any = await $fetch("/api/estimate-line-items", {
      method: "GET",
      query: {
        project_uuid: projectUuid,
        estimate_uuid: estimateUuid,
        corporation_uuid: corpUuid,
      },
    });
    
    const lineItems = Array.isArray(response?.data) ? response.data : [];
    const laborItems = transformEstimateLineItemsToLaborItems(lineItems);
    availableLaborItems.value = laborItems;
  } catch (error: any) {
    return;
  }
  
  if (availableLaborItems.value.length === 0) {
    return;
  }
  
  // Mark this as editing existing selection (not initial import)
  isEditingLaborSelection.value = true;
  
  // Set pending data and open modal
  pendingLaborItemsKey.value = `estimate-${latestProjectEstimate.value?.uuid}`;
  showLaborItemsModal.value = true;
};

// Helper to transform estimate line items to labor items format
const transformEstimateLineItemsToLaborItems = (lineItems: any[]): any[] => {
  const laborItems: any[] = [];
  const currentItems = Array.isArray(props.form.labor_po_items) ? props.form.labor_po_items : [];
  const existingMap = new Map<string, any>();
  currentItems.forEach((item: any) => {
    if (item.cost_code_uuid) {
      existingMap.set(String(item.cost_code_uuid), item);
    }
  });
  
  lineItems.forEach((lineItem: any) => {
    const laborAmount = parseNumericInput(lineItem.labor_amount || 0);
    if (laborAmount <= 0) return;
    
    const costCodeUuid = lineItem.cost_code_uuid;
    if (!costCodeUuid) return;
    
    const costCodeNumber = lineItem.cost_code_number || '';
    const costCodeName = lineItem.cost_code_name || '';
    const costCodeLabel = [costCodeNumber, costCodeName].filter(Boolean).join(' ').trim();
    
    const existing = existingMap.get(String(costCodeUuid));
    if (existing) {
      laborItems.push({
        ...existing,
        labor_budgeted_amount: laborAmount,
        cost_code_number: costCodeNumber,
        cost_code_name: costCodeName,
        cost_code_label: costCodeLabel,
      });
    } else {
      laborItems.push({
        cost_code_uuid: costCodeUuid,
        cost_code_number: costCodeNumber,
        cost_code_name: costCodeName,
        cost_code_label: costCodeLabel,
        labor_budgeted_amount: laborAmount,
        po_amount: null,
      });
    }
  });
  
  return laborItems;
};

// Helper to transform cost code configs to labor items format
const transformCostCodeConfigsToLaborItems = (configs: any[]): any[] => {
  const laborItems: any[] = [];
  const currentItems = Array.isArray(props.form.labor_po_items) ? props.form.labor_po_items : [];
  const existingMap = new Map<string, any>();
  currentItems.forEach((item: any) => {
    if (item.cost_code_uuid) {
      existingMap.set(String(item.cost_code_uuid), item);
    }
  });
  
  configs.forEach((config: any) => {
    const costCodeUuid = config.uuid;
    if (!costCodeUuid) return;
    
    const existing = existingMap.get(String(costCodeUuid));
    if (existing) {
      laborItems.push({
        ...existing,
        labor_budgeted_amount: null,
      });
    } else {
      laborItems.push({
        cost_code_uuid: costCodeUuid,
        cost_code_number: config.cost_code_number || '',
        cost_code_name: config.cost_code_name || '',
        cost_code_label: [config.cost_code_number, config.cost_code_name].filter(Boolean).join(' ').trim(),
        labor_budgeted_amount: null,
        po_amount: null,
      });
    }
  });
  
  return laborItems;
};

const applyEstimateItemsToForm = (
  poItems: any[],
  key: string | null,
  options: { force?: boolean } = {}
) => {
  const { force = false } = options

  if (!Array.isArray(poItems) || poItems.length === 0 || !key) {
    return
  }

  const currentItems = Array.isArray(props.form.po_items) ? props.form.po_items : []
  
  // Don't overwrite items if we're editing an existing PO (unless forced)
  if (!force && props.editingPurchaseOrder && currentItems.length > 0) {
    return
  }
  
  if (!force && lastAppliedEstimateItemsKey.value === key && currentItems.length > 0) {
    return
  }
  
  // Mark this as initial import (not editing existing selection)
  isEditingSelection.value = false;
  pendingEstimateKey.value = key;
  showEstimateItemsModal.value = true;
};

watch(
  [
    () => props.form.include_items,
    () => estimatePoItems.value,
    currentEstimateItemsKey,
    selectedCorporationUuid,
    selectedProjectUuid,
    () => latestEstimateUuid.value,
    () => estimateItemsLoading.value,
  ],
  async (
    [includeItems, poItems, estimateKey, corpUuid, projectUuid, estimateUuid, isLoading],
    [prevIncludeItems]
  ) => {
    // Prevent re-entry loop: if we're already processing this watcher, skip
    if (isProcessingEstimateItemsWatcher.value) {
      return;
    }
    
    try {
      isProcessingEstimateItemsWatcher.value = true;
      
      const includeValue = String(includeItems || '').toUpperCase();
      const previousInclude = String(prevIncludeItems || '').toUpperCase();

      const switchedToEstimate = includeValue === 'IMPORT_ITEMS_FROM_ESTIMATE'
      const switchedFromEstimate = previousInclude === 'IMPORT_ITEMS_FROM_ESTIMATE'

      const isInitialRun = typeof prevIncludeItems === 'undefined'

      // Early exit: If we're editing an existing PO with saved items, skip all estimate imports
      // This prevents auto-importing estimate items when loading an existing PO
      if (switchedToEstimate && shouldSkipEstimateAutoImport.value) {
        return
      }

      // Handle switching to estimate import
      if (switchedToEstimate) {
        
        // Ensure estimates are fetched when switching to estimate import
        if (corpUuid && projectUuid) {
          // Fetch estimates - scoped to purchaseOrderResources store only
          await purchaseOrderResourcesStore.ensureEstimates({
            corporationUuid: corpUuid,
            force: true,
          });
        }
        
        // If we have all required values, load and apply items
        // Skip this if we're editing an existing PO with saved items
        if (corpUuid && projectUuid && estimateUuid && !shouldSkipEstimateAutoImport.value) {
          // If items are already loaded, show modal for selection
          if (Array.isArray(poItems) && poItems.length > 0) {
            applyEstimateItemsToForm(poItems, estimateKey, { force: switchedFromEstimate !== switchedToEstimate })
          } 
          // If items are not loaded and not currently loading, fetch them first
          else if (!isLoading && !shouldSkipEstimateAutoImport.value) {
            try {
              const loadedItems = await purchaseOrderResourcesStore.ensureEstimateItems({
                corporationUuid: corpUuid,
                projectUuid,
                estimateUuid,
                force: true,
              })
              
              // After loading, get the items again and show modal
              // Use the returned items or fetch from store
              const itemsToApply = Array.isArray(loadedItems) && loadedItems.length > 0
                ? loadedItems
                : purchaseOrderResourcesStore.getEstimateItems(corpUuid, projectUuid, estimateUuid);
              
              if (Array.isArray(itemsToApply) && itemsToApply.length > 0 && estimateKey) {
                // Show modal for item selection
                applyEstimateItemsToForm(itemsToApply, estimateKey, { force: switchedFromEstimate !== switchedToEstimate })
              }
            } catch (error) {
              // Failed to load estimate items
            }
          }
        }
      } else if (switchedFromEstimate && !switchedToEstimate) {
        lastAppliedEstimateItemsKey.value = null
        // Clear the skip flag when user switches away from estimate import
        // This allows fresh import if they switch back
        hasInitialPoItems.value = false
      }
    } finally {
      isProcessingEstimateItemsWatcher.value = false;
    }
  },
  { immediate: true }
);

watch(
  [
    () => props.form.include_items,
    () => preferredItemsForProject.value,
    selectedCorporationUuid,
    selectedProjectUuid,
  ],
  async ([includeItems, preferredItems, corpUuid, projectUuid], [prevIncludeItems]) => {
    // Prevent re-entry loop: if we're already processing this watcher, skip
    if (isProcessingPreferredItemsWatcher.value) {
      return;
    }
    
    try {
      isProcessingPreferredItemsWatcher.value = true;
      
      const includeValue = String(includeItems || '').toUpperCase();
      const previousInclude = String(prevIncludeItems || '').toUpperCase();

    const switchedToMaster = includeValue === 'IMPORT_ITEMS_FROM_MASTER'
    const switchedFromMaster = previousInclude === 'IMPORT_ITEMS_FROM_MASTER'
    const preferredSignature = getPreferredItemsSignature(preferredItems || [])

    if (switchedToMaster) {
    // Skip entire application logic when editing an existing PO with "Import from Master"
    // We still fetch preferred items for dropdowns, but don't apply them to the form
    // This check happens on initial mount (immediate: true) before DB items are loaded
    if (shouldSkipMasterAutoImport.value) {
      // Just fetch preferred items for dropdown options, but don't apply to form
      if (corpUuid) {
        await purchaseOrderResourcesStore.ensurePreferredItems({
          corporationUuid: corpUuid,
          projectUuid: projectUuid,
          force: false,
        });
      }
      return; // Exit early - don't apply items to form
    }
    
    // Only apply preferred items when creating a new PO or switching modes
    if (corpUuid) {
      // Check if corporation is different from TopBar's - if so, force refresh
      const isDifferentFromTopBar = corpUuid !== corpStore.selectedCorporation?.uuid;
      const shouldForceRefresh = switchedFromMaster !== switchedToMaster || isDifferentFromTopBar;
      
      // Ensure preferred items are fetched when switching to master import
      await purchaseOrderResourcesStore.ensurePreferredItems({
        corporationUuid: corpUuid,
        projectUuid: projectUuid,
        force: shouldForceRefresh,
      })
      
      // After fetching, get the updated preferred items
      const updatedPreferredItems = purchaseOrderResourcesStore.getPreferredItems(corpUuid, projectUuid) || [];
      const updatedSignature = getPreferredItemsSignature(updatedPreferredItems);
      
      const shouldForce =
        switchedFromMaster !== switchedToMaster ||
        updatedSignature !== lastAppliedPreferredItemsSignature.value ||
        isDifferentFromTopBar;

      applyPreferredItemsToForm(updatedPreferredItems, { force: shouldForce })
    } else {
      // If corporation is not selected yet, just apply what we have
      const shouldForce =
        switchedFromMaster !== switchedToMaster ||
        preferredSignature !== lastAppliedPreferredItemsSignature.value;

      applyPreferredItemsToForm(preferredItems, { force: shouldForce })
    }
    } else if (switchedFromMaster && !switchedToMaster) {
      lastAppliedPreferredItemsSignature.value = null
      // Clear the skip flag when user switches away from master import
      // This allows fresh import if they switch back
      hasInitialMasterItems.value = false
    }
    } finally {
      isProcessingPreferredItemsWatcher.value = false;
    }
  },
  { immediate: true }
);

// Note: Initialization is handled in the main onMounted hook below

const createEmptyPoItem = () => ({
  cost_code_uuid: null,
  cost_code_number: '',
  cost_code_name: '',
  division_name: '',
  item_type_uuid: null,
  sequence_uuid: null,
  item_uuid: null,
  description: '',
  model_number: '',
  location_uuid: null,
  location: '',
  unit_price: 0,
  po_unit_price: null,
  uom: '',
  uom_uuid: null,
  uom_label: '',
  quantity: 0,
  po_quantity: null,
  total: 0,
  po_total: null,
  approval_checks: null,
  display_metadata: {
    cost_code_label: '',
    cost_code_number: '',
    cost_code_name: '',
    division_name: '',
    item_type_label: '',
    sequence: '',
    location_display: '',
    unit_uuid: null,
    unit_label: '',
  },
});

const createEmptyLaborPoItem = () => ({
  cost_code_uuid: null,
  cost_code_number: '',
  cost_code_name: '',
  cost_code_label: '',
  labor_budgeted_amount: null,
  po_amount: null,
});

const computePoItemEffectiveTotal = (item: any): number => {
  const hasPoUnitPrice =
    item?.po_unit_price !== null &&
    item?.po_unit_price !== undefined &&
    item?.po_unit_price !== ''
  const hasPoQuantity =
    item?.po_quantity !== null &&
    item?.po_quantity !== undefined &&
    item?.po_quantity !== ''

  if (hasPoUnitPrice && hasPoQuantity) {
    const poUnitPrice = parseNumericInput(item?.po_unit_price)
    const poQuantity = parseNumericInput(item?.po_quantity)
    return roundCurrencyValue(poUnitPrice * poQuantity)
  }

  const poTotal = parseNumericInput(item?.po_total)
  if (poTotal) {
    return roundCurrencyValue(poTotal)
  }

  return 0
}

// Compute item total directly from PO items using a computed property for maximum reactivity
const itemTotal = computed(() => {
  // For Labor PO, calculate from labor_po_items
  if (isLaborPurchaseOrder.value) {
    const laborItems = Array.isArray(props.form.labor_po_items) ? props.form.labor_po_items : [];
    const total = laborItems.reduce((sum: number, item: any) => {
      const poAmount = parseNumericInput(item?.po_amount);
      return sum + roundCurrencyValue(poAmount);
    }, 0);
    return total;
  }
  
  // For Material PO, calculate from po_items
  const items = Array.isArray(props.form.po_items) ? props.form.po_items : []
  
  // Access deep properties to ensure Vue tracks changes
  // Iterate through all items and access their properties to ensure reactivity
  const total = items.reduce((sum: number, item: any, index: number) => {
    // Force reactivity by accessing the specific fields that affect the total
    // Accessing these properties ensures Vue tracks changes to them
    const unitPrice = item?.po_unit_price
    const quantity = item?.po_quantity
    const poTotal = item?.po_total
    
    // Also access the item itself and its index to ensure array changes are tracked
    const _ = item && index
    
    const itemTotal = computePoItemEffectiveTotal(item)
    return sum + itemTotal
  }, 0)
  
  const rounded = roundCurrencyValue(total)
  return rounded
})

const normalizeMatchValue = (value: any): string => {
  if (value === null || value === undefined) return ''
  return String(value).trim().toUpperCase()
}

const firstNonEmptyMatch = (...values: any[]) => {
  for (const candidate of values) {
    const normalized = normalizeMatchValue(candidate)
    if (normalized) {
      return normalized
    }
  }
  return ''
}

const buildPoItemMatchKey = (item: any): string => {
  const display = item?.display_metadata || {}
  const costCode = firstNonEmptyMatch(
    item?.cost_code_uuid,
    display?.cost_code_uuid,
    item?.cost_code_number,
    display?.cost_code_number,
    item?.cost_code_label,
    display?.cost_code_label
  )
  const itemType = firstNonEmptyMatch(
    item?.item_type_uuid,
    display?.item_type_uuid,
    item?.item_type_label,
    display?.item_type_label
  )
  const itemIdentifier = firstNonEmptyMatch(
    item?.item_uuid,
    display?.item_uuid,
    item?.name,
    item?.item_name,
    display?.item_name,
    item?.description
  )

  if (!costCode && !itemType && !itemIdentifier) {
    return normalizeMatchValue(item?.id || item?.uuid || '')
  }

  return [costCode, itemType, itemIdentifier].join('|')
}

const mergePoSpecificFields = (target: any, source: any) => {
  if (!source || typeof source !== 'object') return

  const hasValue = (value: any) =>
    value !== null && value !== undefined && value !== ''

  const fieldsToCopy = ['po_unit_price', 'po_quantity', 'po_total']
  fieldsToCopy.forEach((field) => {
    if (hasValue(source[field]) && !hasValue(target[field])) {
      target[field] = source[field]
    }
  })

  if (source.unit && !target.unit) {
    target.unit = source.unit
  }
  if (source.unit_label && !target.unit_label) {
    target.unit_label = source.unit_label
  }
  if (source.uom_label && !target.uom_label) {
    target.uom_label = source.uom_label
  }
  if (source.uom_uuid && !target.uom_uuid) {
    target.uom_uuid = source.uom_uuid
  }

  if (source.display_metadata) {
    target.display_metadata = {
      ...(source.display_metadata || {}),
      ...(target.display_metadata || {}),
    }
  }
}

const updatePoItems = (items: any[], skipMerge = false) => {
  // Validate items array
  if (!Array.isArray(items)) {
    return;
  }
  
  if (items.length === 0) {
    // Don't return early - empty array might be valid (e.g., clearing items)
  }

  // If skipMerge is true, just use the items as-is (for direct user edits)
  // Always create a new array reference to ensure reactivity
  if (skipMerge) {
    // Deep clone items to ensure Vue tracks changes
    const clonedItems = items.map((item: any) => ({
      ...item,
      display_metadata: item.display_metadata ? { ...item.display_metadata } : {},
    }))
    
    // Use nextTick to ensure the update happens after any pending updates
    nextTick(() => {
      updateFormFields({
        po_items: clonedItems,
      });
    });
    return
  }
  
  const existingItems = Array.isArray(props.form.po_items)
    ? props.form.po_items
    : []
  const existingLookup = new Map<string, any>()
  const matchedKeys = new Set<string>()
  existingItems.forEach((item: any, index: number) => {
    const key = buildPoItemMatchKey(item)
    if (key) {
      existingLookup.set(`key:${key}`, item)
    }
    const fallback = normalizeMatchValue(item?.id || item?.uuid || index)
    if (fallback) {
      existingLookup.set(`id:${fallback}`, item)
    }
  })

  const cloned = items.map((item: any) => ({
    ...item,
    display_metadata: { ...(item.display_metadata || {}) },
  }))
  const merged = cloned.map((item, index) => {
    const key = buildPoItemMatchKey(item)
    let existing: any = null
    if (key) {
      existing = existingLookup.get(`key:${key}`)
    }
    if (!existing) {
      const fallback = normalizeMatchValue(item?.id || item?.uuid || index)
      if (fallback) {
        existing = existingLookup.get(`id:${fallback}`)
        if (existing) {
          matchedKeys.add(`id:${fallback}`)
        }
      }
    } else {
      matchedKeys.add(`key:${key}`)
      const fallback = normalizeMatchValue(existing?.id || existing?.uuid || index)
      if (fallback) {
        matchedKeys.add(`id:${fallback}`)
      }
    }

    if (existing) {
      mergePoSpecificFields(item, existing)
    }
    item.po_total = computePoItemEffectiveTotal(item)
    return item
  })
  existingItems.forEach((item: any, index: number) => {
    const key = buildPoItemMatchKey(item)
    const fallback = normalizeMatchValue(item?.id || item?.uuid || index)
    const keyMatched = key ? matchedKeys.has(`key:${key}`) : false
    const idMatched = fallback ? matchedKeys.has(`id:${fallback}`) : false

    if (!keyMatched && !idMatched) {
      const clonedItem = {
        ...item,
        display_metadata: { ...(item.display_metadata || {}) },
      }
      clonedItem.po_total = computePoItemEffectiveTotal(clonedItem)
      merged.push(clonedItem)
    }
  })
  // Update the form with the new items array
  // Don't set item_total here - let the computed handle it
  updateFormFields({
    po_items: merged,
  })
  
  // The itemTotal computed will automatically recalculate
  // which will then trigger recalculateChargesAndTaxes via its watcher
};

const insertPoItemAfter = (index: number) => {
  const current = Array.isArray(props.form.po_items)
    ? [...props.form.po_items]
    : [];

  const newItem = createEmptyPoItem();
  const insertIndex = Math.min(Math.max(index, -1), current.length - 1);
  current.splice(insertIndex + 1, 0, newItem);
  updatePoItems(current, true); // Skip merge for direct edits
};

const removePoItemAt = (index: number) => {
  const current = Array.isArray(props.form.po_items)
    ? [...props.form.po_items]
    : [];

  if (!current.length) {
    return;
  }

  const targetIndex = Math.min(Math.max(index, 0), current.length - 1);
  const removedItem = clonePoItem(current[targetIndex])
  current.splice(targetIndex, 1);
  
  if (removedItem) {
    // Ensure removed item has computed total before adding to removed list
    removedItem.po_total = computePoItemEffectiveTotal(removedItem)
    const updatedRemoved = appendRemovedPoItem(removedItem)
    
    // Update both removed_po_items and po_items in a single emission to avoid race conditions
    updateFormFields({ removed_po_items: updatedRemoved, po_items: current })
    
    // Recalculate totals after removing the item
    nextTick(() => {
      recalculateChargesAndTaxes()
    })
    return
  }
  
  // If no item was removed, just update po_items
  updateFormFields({ po_items: current })
  nextTick(() => {
    recalculateChargesAndTaxes()
  })
};

const updatePoItemCostCode = ({ index, value, option }: { index: number; value: string | null; option?: any }) => {
  const current = Array.isArray(props.form.po_items)
    ? [...props.form.po_items]
    : [];

  if (!current.length) {
    return;
  }

  const targetIndex = Math.min(Math.max(index, 0), current.length - 1);
  const item = { ...current[targetIndex] };
  const metadata = { ...(item.display_metadata || {}) };

  item.cost_code_uuid = value || null;

  if (option) {
    const raw = option.costCode || option;
    const costCodeNumber = raw.cost_code_number || raw.cost_code_number_display || '';
    const costCodeName = raw.cost_code_name || '';
    const divisionName = raw.division?.division_name || raw.division_name || '';

    item.cost_code_number = costCodeNumber;
    item.cost_code_name = costCodeName;
    item.division_name = divisionName;

    metadata.cost_code_number = costCodeNumber;
    metadata.cost_code_name = costCodeName;
    metadata.division_name = divisionName;
    metadata.cost_code_label = [costCodeNumber, costCodeName].filter(Boolean).join(' ').trim();
  }

  metadata.cost_code_label = metadata.cost_code_label || '';
  metadata.cost_code_number = metadata.cost_code_number || '';
  metadata.cost_code_name = metadata.cost_code_name || '';
  metadata.division_name = metadata.division_name || '';
  item.display_metadata = metadata;

  current[targetIndex] = item;
  updatePoItems(current, true); // Skip merge for direct edits
};

const updatePoItemType = ({ index, value, option }: { index: number; value: string | null; option?: any }) => {
  const current = Array.isArray(props.form.po_items)
    ? [...props.form.po_items]
    : [];

  if (!current.length) {
    return;
  }

  const targetIndex = Math.min(Math.max(index, 0), current.length - 1);
  const item = { ...current[targetIndex] };
  const metadata = { ...(item.display_metadata || {}) };

  item.item_type_uuid = value || null;

  const resolvedLabel =
    option?.label ||
    option?.item_type ||
    option?.item_type_name ||
    (value ? itemTypeNamesByUuid.value.get(value) : '') ||
    '';

  item.item_type_label = resolvedLabel;
  metadata.item_type_label = resolvedLabel;
  item.display_metadata = metadata;

  current[targetIndex] = item;
  updatePoItems(current, true); // Skip merge for direct edits
};

const updatePoItemLocation = ({ index, value, option }: { index: number; value: string | null; option?: any }) => {
  const current = Array.isArray(props.form.po_items)
    ? [...props.form.po_items]
    : [];

  if (!current.length) {
    return;
  }

  const targetIndex = Math.min(Math.max(index, 0), current.length - 1);
  const item = { ...current[targetIndex] };
  const metadata = { ...(item.display_metadata || {}) };

  item.location_uuid = value || null;

  if (option) {
    const locationName = option?.location_name || option?.label || '';
    item.location = locationName;
    metadata.location_display = locationName;
  }

  if (!option) {
    item.location = '';
    metadata.location_display = '';
  }

  item.display_metadata = metadata;

  current[targetIndex] = item;
  updatePoItems(current, true); // Skip merge for direct edits
};

const updatePoItemItem = ({ index, value, option }: { index: number; value: string | null; option?: any }) => {
  const current = Array.isArray(props.form.po_items)
    ? [...props.form.po_items]
    : [];

  if (!current.length) {
    return;
  }

  const targetIndex = Math.min(Math.max(index, 0), current.length - 1);
  const item = { ...current[targetIndex] };
  const metadata = { ...(item.display_metadata || {}) };

  item.item_uuid = value || null;

  if (option) {
    const raw = option.raw || option;
    const label = option.label || raw?.item_name || raw?.label || '';
    if (label) {
      item.name = label;
      metadata.item_name = label;
    }

    if (raw?.description !== undefined) {
      item.description = raw.description || '';
      metadata.description = raw.description || '';
    }

    if (raw?.unit !== undefined) {
      item.unit = raw.unit || '';
    }

    const resolvedUnitUuid =
      raw?.unit_uuid ||
      raw?.uom_uuid ||
      (raw?.unit && String(raw.unit).length === 36 ? raw.unit : null);
    const resolvedUnitLabel = raw?.unit_label || raw?.unit_short_name || raw?.unit || '';

    if (resolvedUnitUuid || resolvedUnitLabel) {
      item.uom_uuid = resolvedUnitUuid || null;
      item.uom_label = resolvedUnitLabel || '';
      item.uom = resolvedUnitLabel || item.uom || '';
      metadata.unit_uuid = item.uom_uuid;
      metadata.unit_label = resolvedUnitLabel;
      metadata.unit = resolvedUnitLabel;
    }

    if (raw?.item_type_uuid) {
      item.item_type_uuid = raw.item_type_uuid;
      metadata.item_type_uuid = raw.item_type_uuid;
    }

    const unitPrice = normalizeNumber(raw?.unit_price, item.unit_price ?? 0);
    item.unit_price = unitPrice;

    if (raw?.model_number !== undefined) {
      item.model_number = raw.model_number || '';
      metadata.model_number = raw.model_number || '';
    }

    const quantity = normalizeNumber(item.quantity, 0);
    item.total = unitPrice * quantity;
  }

  item.display_metadata = metadata;
  current[targetIndex] = item;
  updatePoItems(current, true); // Skip merge for direct edits
};

// When sequence (item UUID) changes via SequenceSelect, reuse the same logic as item selection
const updatePoItemSequence = ({ index, value, option }: { index: number; value: string | null; option?: any }) => {
  updatePoItemItem({ index, value, option });
};

const updatePoItemPoUnitPrice = ({ index, value, numericValue, computedTotal }: { index: number; value: string | number | null | undefined; numericValue: number; computedTotal: number }) => {
  const current = Array.isArray(props.form.po_items)
    ? [...props.form.po_items]
    : [];

  if (!current.length) {
    return;
  }

  const targetIndex = Math.min(Math.max(index, 0), current.length - 1);
  const item = { ...current[targetIndex] };
  const isEmpty = value === '' || value === null || value === undefined;

  item.po_unit_price = isEmpty ? null : numericValue;
  item.po_total = computedTotal;

  current[targetIndex] = item;
  updatePoItems(current, true); // Skip merge for direct edits
};

const updatePoItemPoQuantity = ({ index, value, numericValue, computedTotal }: { index: number; value: string | number | null | undefined; numericValue: number; computedTotal: number }) => {
  const current = Array.isArray(props.form.po_items)
    ? [...props.form.po_items]
    : [];

  if (!current.length) {
    return;
  }

  const targetIndex = Math.min(Math.max(index, 0), current.length - 1);
  const item = { ...current[targetIndex] };
  const isEmpty = value === '' || value === null || value === undefined;

  item.po_quantity = isEmpty ? null : numericValue;
  item.po_total = computedTotal;

  current[targetIndex] = item;
  updatePoItems(current, true); // Skip merge for direct edits
};

const updatePoItemPoTotal = ({ index, value }: { index: number; value: number }) => {
  // This event is emitted after po-unit-price-change or po-quantity-change
  // The total has already been set by those handlers, so we can skip this
  // to avoid race conditions where we read stale data from props.form.po_items
  return;
};

const updatePoItemModelNumber = ({ index, value }: { index: number; value: string }) => {
  const current = Array.isArray(props.form.po_items)
    ? [...props.form.po_items]
    : [];

  if (!current.length) {
    return;
  }

  const targetIndex = Math.min(Math.max(index, 0), current.length - 1);
  const item = { ...current[targetIndex] };

  item.model_number = value;
  if (item.display_metadata) {
    item.display_metadata.model_number = value;
  }

  current[targetIndex] = item;
  updatePoItems(current, true); // Skip merge for direct edits
};

const updatePoItemApprovalChecks = ({ index, value }: { index: number; value: string[] }) => {
  const current = Array.isArray(props.form.po_items)
    ? [...props.form.po_items]
    : [];

  if (!current.length) {
    return;
  }

  const targetIndex = Math.min(Math.max(index, 0), current.length - 1);
  const item = { ...current[targetIndex] };

  // Store approval checks as array of UUIDs
  item.approval_checks = Array.isArray(value) ? value : [];
  if (item.display_metadata) {
    item.display_metadata.approval_checks = item.approval_checks;
  }

  current[targetIndex] = item;
  updatePoItems(current, true); // Skip merge for direct edits
};

const updatePoItemUom = ({ index, value, option }: { index: number; value: string | null; option?: any }) => {
  const current = Array.isArray(props.form.po_items)
    ? [...props.form.po_items]
    : [];

  if (!current.length) {
    return;
  }

  const targetIndex = Math.min(Math.max(index, 0), current.length - 1);
  const item = { ...current[targetIndex] };
  const metadata = { ...(item.display_metadata || {}) };

  item.uom_uuid = value || null;

  const resolvedLabel =
    option?.label ||
    option?.shortName ||
    option?.uom?.short_name ||
    option?.uom?.uom_name ||
    '';

  item.uom_label = resolvedLabel;
  item.uom = resolvedLabel || item.uom || '';

  metadata.unit_uuid = item.uom_uuid;
  metadata.unit_label = resolvedLabel;
  metadata.unit = resolvedLabel;
  item.display_metadata = metadata;

  current[targetIndex] = item;
  updatePoItems(current, true); // Skip merge for direct edits
};

// Labor PO Items handlers
const insertLaborPoItemAfter = (index: number) => {
  const current = Array.isArray(props.form.labor_po_items)
    ? [...props.form.labor_po_items]
    : [];

  const newItem = createEmptyLaborPoItem();
  const insertIndex = Math.min(Math.max(index, -1), current.length - 1);
  current.splice(insertIndex + 1, 0, newItem);
  updateFormFields({ labor_po_items: current });
};

const removeLaborPoItemAt = (index: number) => {
  const current = Array.isArray(props.form.labor_po_items)
    ? [...props.form.labor_po_items]
    : [];

  if (!current.length) {
    return;
  }

  const targetIndex = Math.min(Math.max(index, 0), current.length - 1);
  current.splice(targetIndex, 1);
  updateFormFields({ labor_po_items: current });
  
  // Recalculate totals after removing the item
  nextTick(() => {
    recalculateChargesAndTaxes()
  })
};

const updateLaborPoItemCostCode = ({ index, value, option }: { index: number; value: string | null; option?: any }) => {
  const current = Array.isArray(props.form.labor_po_items)
    ? [...props.form.labor_po_items]
    : [];

  if (!current.length) {
    return;
  }

  const targetIndex = Math.min(Math.max(index, 0), current.length - 1);
  const item = { ...current[targetIndex] };

  item.cost_code_uuid = value || null;

  if (option) {
    const raw = option.costCode || option;
    const costCodeNumber = raw.cost_code_number || raw.cost_code_number_display || '';
    const costCodeName = raw.cost_code_name || '';
    const divisionName = raw.division?.division_name || raw.division_name || '';

    item.cost_code_number = costCodeNumber;
    item.cost_code_name = costCodeName;
    item.cost_code_label = [costCodeNumber, costCodeName].filter(Boolean).join(' ').trim();
    
    // Fetch labor budgeted amount from estimate (Labor PO always uses estimate)
    if (latestProjectEstimate.value && value) {
      const estimate = latestProjectEstimate.value;
      if (estimate.line_items && Array.isArray(estimate.line_items)) {
        const matchingLineItem = estimate.line_items.find(
          (li: any) => String(li.cost_code_uuid || '') === String(value)
        );
        if (matchingLineItem) {
          const laborAmount = parseNumericInput(matchingLineItem.labor_amount || 0);
          item.labor_budgeted_amount = laborAmount > 0 ? laborAmount : null;
        }
      }
    }
  } else {
    // If cost code is cleared, clear labor budgeted amount
    item.labor_budgeted_amount = null;
  }

  current[targetIndex] = item;
  updateFormFields({ labor_po_items: current });
};

const updateLaborPoItemAmount = ({ index, numericValue }: { index: number; numericValue: number }) => {
  const current = Array.isArray(props.form.labor_po_items)
    ? [...props.form.labor_po_items]
    : [];

  if (!current.length) {
    return;
  }

  const targetIndex = Math.min(Math.max(index, 0), current.length - 1);
  const item = { ...current[targetIndex] };

  item.po_amount = numericValue;

  current[targetIndex] = item;
  updateFormFields({ labor_po_items: current });
  
  // Recalculate totals after updating the amount
  nextTick(() => {
    recalculateChargesAndTaxes()
  })
};

// File upload functionality
const uploadedFiles = ref<File[]>([]);
const fileUploadError = ref<string | null>(null);
const isUploading = ref(false);
// Removed: Estimates are now fetched only when a project is selected

// File preview functionality
const showFilePreviewModal = ref(false);
const selectedFileForPreview = ref<any>(null);

// Vendor edit functionality
const showVendorEditModal = ref(false);
const editingVendor = ref<any>(null);

// Computed property for file upload error message
const fileUploadErrorMessage = computed(() => {
  return fileUploadError.value;
});

const totalAttachmentCount = computed(() =>
  Array.isArray(props.form.attachments) ? props.form.attachments.length : 0
);

const uploadedAttachmentCount = computed(() =>
  Array.isArray(props.form.attachments)
    ? props.form.attachments.filter((att: any) => att?.uuid || att?.isUploaded).length
    : 0
);

// Helper to format country code to full name
const getCountryName = (countryCode: string): string => {
  if (!countryCode) return '';
  const countryMap: Record<string, string> = {
    'US': 'UNITED STATES OF AMERICA',
    'CA': 'CANADA',
    'GB': 'UNITED KINGDOM',
    'AU': 'AUSTRALIA',
    'MX': 'MEXICO',
    // Add more as needed
  };
  return countryMap[countryCode.toUpperCase()] || countryCode.toUpperCase();
};

// Active project address - shows shipping address (Ship To)
// Priority: 1) Primary shipping address, 2) First shipping address
// Only shows addresses with address_type === 'shipment' (no fallback to final-destination or other types)
const activeProjectAddressText = computed(() => {
  if (!isProjectPurchaseOrder.value) {
    return '';
  }
  if (props.form.project_uuid) {
    const addresses = projectAddressesStore.getAddresses(props.form.project_uuid);
    if (addresses && Array.isArray(addresses) && addresses.length) {
      // Filter strictly for shipping addresses only (address_type === 'shipment')
      const shippingAddresses = addresses.filter(a => 
        a.is_active !== false && 
        a.address_type === 'shipment'
      );
      
      if (shippingAddresses.length > 0) {
        // Find primary shipping address first, fallback to first shipping address
        const selectedAddress = shippingAddresses.find(a => a.is_primary) || shippingAddresses[0];
        
        if (selectedAddress) {
          const parts = [
            selectedAddress.address_line_1,
            selectedAddress.address_line_2,
            selectedAddress.city,
            selectedAddress.state,
            selectedAddress.zip_code,
            getCountryName(selectedAddress.country || '')
          ].filter(Boolean)
          if (parts.length > 0) return parts.join(', ').toUpperCase()
        }
      }
    }
  }
  return ''
})

// Vendor address block (display only)
const vendorAddressText = computed(() => {
  if (props.form.vendor_uuid) {
    const vendor = vendorStore.vendors.find((v: any) => v.uuid === props.form.vendor_uuid)
    if (vendor) {
      const parts = [
        vendor.vendor_address,
        vendor.vendor_city,
        vendor.vendor_state,
        vendor.vendor_zip,
        getCountryName(vendor.vendor_country || '')
      ].filter(Boolean)
      const addr = parts.length > 0 ? parts.join(', ').toUpperCase() : ''
      return addr
    }
  }
  return ''
})

// Methods
const updateFormFields = (fields: Record<string, any>) => {
  // Ensure deep cloning for nested arrays to trigger reactivity
  const updatedForm = { ...props.form };
  Object.keys(fields).forEach(key => {
    if ((key === 'po_items' || key === 'removed_po_items') && Array.isArray(fields[key])) {
      // Always create a new array reference with deep-cloned items to ensure Vue tracks changes
      // This ensures that nested property changes (like po_unit_price, po_quantity) trigger reactivity
      updatedForm[key] = fields[key].map((item: any) => ({
        ...item,
        display_metadata: item.display_metadata ? { ...item.display_metadata } : {},
      }));
    } else {
      updatedForm[key] = fields[key];
    }
  });
  
  emit('update:form', updatedForm);
};

const handleFormUpdate = (field: string, value: any) => {
  if (field === 'po_type' || field === 'po_type_uuid') {
    setPoTypeFromInput(value);
    return;
  }
  updateFormFields({ [field]: value });
};

const handlePoModeChange = (value?: string) => {
  const normalized = normalizePoMode(value);
  const updates: Record<string, any> = { po_mode: normalized };

  // CUSTOM mode is no longer available - commented out
  // if (normalized === "CUSTOM") {
  //   if (props.form.project_uuid) {
  //     updates.project_uuid = null;
  //   }
  //   if (props.form.shipping_address_uuid) {
  //     updates.shipping_address_uuid = null;
  //   }
  // } else {
    if (props.form.shipping_address_custom) {
      updates.shipping_address_custom = null;
    }
  // }

  updateFormFields(updates);
  enforceIncludeItemsConsistency();
};

const handleCorporationChange = async (corporationUuid?: string | null) => {
  const normalizedCorporationUuid = corporationUuid || '';
  handleFormUpdate('corporation_uuid', normalizedCorporationUuid);
  
  // Fetch data for the selected corporation
  // NOTE: We do NOT update corpStore.selectedCorporation here to avoid affecting other components
  // The form operates independently with its own corporation selection
  if (normalizedCorporationUuid) {
    await Promise.allSettled([
      vendorStore.fetchVendors(normalizedCorporationUuid),
      ensureItemTypesLoaded(normalizedCorporationUuid, props.form.project_uuid),
      uomStore.fetchUOM(normalizedCorporationUuid, false),
    ]);
  }
  
  // Auto-generate PO Number on corporation selection if not set
  if (normalizedCorporationUuid) {
    generatePONumber();
  }
};

const handleProjectChange = async (projectUuid?: string | null) => {
  const normalizedProjectUuid = projectUuid || '';
  handleFormUpdate('project_uuid', normalizedProjectUuid);
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (normalizedProjectUuid && corpUuid) {
    // Fetch project addresses when project is selected
    await projectAddressesStore.fetchAddresses(normalizedProjectUuid);
    // Set primary (or first) project address into the form for convenience
    const addresses = projectAddressesStore.getAddresses(normalizedProjectUuid) as any[] | undefined;
    const primary = Array.isArray(addresses) && addresses.length
      ? (addresses.find(a => a.is_primary) || addresses[0])
      : null;
    if (primary?.uuid) {
      handleFormUpdate('shipping_address_uuid', primary.uuid);
    }
  }
  // Auto-generate PO Number on project selection if not set
  if (normalizedProjectUuid) {
    generatePONumber();
  }
};

const handleVendorChange = (value: any) => {
  // Normalize incoming value (string UUID or { value: uuid } object)
  const vendorUuid = typeof value === 'string' ? value : (value && typeof value === 'object' ? value.value : '');
  const vendor = vendorUuid ? vendorStore.vendors.find((v: any) => v.uuid === vendorUuid) : null
  handleFormUpdate('vendor_uuid', vendorUuid || '');
};

// Removed PO items management (not needed currently)

// Generate next PO number with pattern PO-<n>, starting at 1
function generatePONumber() {
  // Do not override if already set (e.g., editing)
  if (props.form.po_number && String(props.form.po_number).trim() !== '') return;
  const corporationId = corpStore.selectedCorporation?.uuid || corpStore.selectedCorporationId;
  if (!corporationId) return;

  // Ensure purchase orders are available in store
  const existing = (purchaseOrdersStore.purchaseOrders || []).filter((po: any) => po.corporation_uuid === corporationId);
  let maxNum = 0;
  for (const po of existing) {
    const num = parseInt(String(po.po_number || '').replace(/^PO-/i, ''), 10);
    if (!isNaN(num)) maxNum = Math.max(maxNum, num);
  }
  const next = maxNum + 1;
  handleFormUpdate('po_number', `PO-${next}`);
}

// Removed PO items calculations and watchers (not needed currently)

// File upload methods
const handleFileUpload = async () => {
  fileUploadError.value = null;

  if (uploadedFiles.value.length === 0) {
    return;
  }

  // Prevent starting a new upload if one is already in progress
  if (isUploading.value) {
    return;
  }

  const allowedTypes = ["application/pdf"];
  const maxSize = 10 * 1024 * 1024; // 10MB

  for (const file of uploadedFiles.value) {
    if (!allowedTypes.includes(file.type)) {
      fileUploadError.value = "Invalid file type. Only PDF files are allowed.";
      return;
    }

    if (file.size > maxSize) {
      fileUploadError.value = "File size too large. Maximum size is 10MB per file.";
      return;
    }
  }

  isUploading.value = true;
  try {
    const pendingAttachments = await Promise.all(
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
                tempId: Date.now() + Math.random().toString(36).substring(2),
              });
            };
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(file);
          })
      )
    );

    if (props.editingPurchaseOrder && props.form.uuid) {
      try {
        const response = await $fetch<{
          attachments: any[];
          errors?: Array<{ fileName: string; error: string }>;
        }>("/api/purchase-order-forms/documents/upload", {
          method: "POST",
          body: {
            purchase_order_uuid: props.form.uuid,
            files: pendingAttachments.map((file: any) => ({
              name: file.name,
              type: file.type,
              size: file.size,
              fileData: file.fileData,
            })),
          },
        });

        handleFormUpdate("attachments", response?.attachments ?? []);
        uploadedFiles.value = [];

        if (response?.errors?.length) {
          fileUploadError.value = response.errors
            .map((err) => err.error)
            .join(", ");
        } else {
          fileUploadError.value = null;
        }
      } catch (error) {
        fileUploadError.value = "Failed to upload files. Please try again.";
      }
      return;
    }

    const allAttachments = [
      ...(props.form.attachments || []),
      ...pendingAttachments.map((file: any) => ({
        ...file,
        isUploaded: false,
      })),
    ];

    handleFormUpdate("attachments", allAttachments);
    uploadedFiles.value = [];
  } catch (error) {
    fileUploadError.value = "Failed to process files. Please try again.";
  } finally {
    isUploading.value = false;
  }
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

// Vendor edit methods
const openVendorEditModal = () => {
  if (!props.form.vendor_uuid) return;
  
  // Find the vendor data
  const vendor = vendorStore.vendors.find((v: any) => v.uuid === props.form.vendor_uuid);
  if (!vendor) {
    return;
  }
  
  editingVendor.value = vendor;
  showVendorEditModal.value = true;
};

const handleVendorSaved = async () => {
  // Refresh vendors from API to get the updated data
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (corpUuid) {
    await vendorStore.fetchVendors(corpUuid);
  }
  
  // Close the modal
  showVendorEditModal.value = false;
  editingVendor.value = null;
};

const removeFile = async (index: number) => {
  const attachment = props.form.attachments[index];

  if (!attachment) return;

  if (attachment?.uuid && props.editingPurchaseOrder && props.form.uuid) {
    try {
      const response = await $fetch<{
        attachments: any[];
      }>("/api/purchase-order-forms/documents/remove", {
        method: "POST",
        body: {
          purchase_order_uuid: props.form.uuid,
          attachment_uuid: attachment.uuid,
        },
      });

      handleFormUpdate("attachments", response?.attachments ?? []);
      return;
    } catch (error) {
      fileUploadError.value = "Failed to delete file. Please try again.";
      return;
    }
  }

  const updatedAttachments = [...(props.form.attachments || [])];
  updatedAttachments.splice(index, 1);
  handleFormUpdate("attachments", updatedAttachments);

  if (attachment?.tempId) {
    const fileIndex = uploadedFiles.value.findIndex(
      (file) => file.name === attachment.name
    );
    if (fileIndex !== -1) {
      uploadedFiles.value.splice(fileIndex, 1);
    }
  }
};

// Watch for entry date and credit days changes to auto-calculate estimated delivery date
watch(
  [() => entryDateValue.value, () => props.form.credit_days],
  ([newEntryDate, newCreditDays], [oldEntryDate, oldCreditDays]) => {
    // Skip if we're already updating to prevent recursive updates
    if (isUpdatingEstimatedDeliveryDate.value) {
      return;
    }
    
    // Only auto-calculate if both entry date and credit days are set
    if (newEntryDate && newCreditDays) {
      // Check if estimated delivery date was manually set (different from calculated)
      const calculatedEstimatedDeliveryDate = calculateEstimatedDeliveryDate(newEntryDate, newCreditDays);
      if (calculatedEstimatedDeliveryDate) {
        // Calculate the new estimated delivery date string
        const newEstimatedDeliveryDateString = `${calculatedEstimatedDeliveryDate.year}-${String(calculatedEstimatedDeliveryDate.month).padStart(2, '0')}-${String(calculatedEstimatedDeliveryDate.day).padStart(2, '0')}`;
        const newEstimatedDeliveryDateUTC = toUTCString(newEstimatedDeliveryDateString);
        
        // Get current estimated delivery date from form (avoid reading computed property to prevent recursion)
        const currentEstimatedDeliveryDateUTC = props.form.estimated_delivery_date;
        
        // Calculate old estimated delivery date if we had both old values
        let oldCalculatedEstimatedDeliveryDateUTC: string | null = null;
        if (oldEntryDate && oldCreditDays) {
          const oldCalculated = calculateEstimatedDeliveryDate(oldEntryDate, oldCreditDays);
          if (oldCalculated) {
            const oldDateString = `${oldCalculated.year}-${String(oldCalculated.month).padStart(2, '0')}-${String(oldCalculated.day).padStart(2, '0')}`;
            oldCalculatedEstimatedDeliveryDateUTC = toUTCString(oldDateString);
          }
        }
        
        // Check if entry date changed (by comparing the date strings)
        const entryDateChanged = oldEntryDate && newEntryDate && 
          (oldEntryDate.year !== newEntryDate.year || 
           oldEntryDate.month !== newEntryDate.month || 
           oldEntryDate.day !== newEntryDate.day);
        
        // Check if credit days changed (handle empty/null/undefined cases)
        const creditDaysChanged = String(oldCreditDays || '') !== String(newCreditDays || '');
        
        // Update if:
        // 1. Estimated delivery date is empty/null, OR
        // 2. Entry date changed (always recalculate when entry date changes), OR
        // 3. Credit days changed (always recalculate when credit days changes), OR
        // 4. Current estimated delivery date matches the old calculated value (meaning it was auto-calculated, not manually set)
        const shouldUpdate = !currentEstimatedDeliveryDateUTC || 
                            entryDateChanged ||
                            creditDaysChanged ||
                            (oldCalculatedEstimatedDeliveryDateUTC && currentEstimatedDeliveryDateUTC === oldCalculatedEstimatedDeliveryDateUTC);
        
        // Only update if the new value is different from current
        if (shouldUpdate && currentEstimatedDeliveryDateUTC !== newEstimatedDeliveryDateUTC) {
          isUpdatingEstimatedDeliveryDate.value = true;
          try {
            handleFormUpdate('estimated_delivery_date', newEstimatedDeliveryDateUTC);
          } finally {
            // Reset flag after a short delay to allow the update to complete
            nextTick(() => {
              isUpdatingEstimatedDeliveryDate.value = false;
            });
          }
        }
      }
    } else if (!newEntryDate || !newCreditDays) {
      // If either entry date or credit days is cleared, clear estimated delivery date only if it was auto-calculated
      // We can't easily determine if it was manually set, so we'll leave it as is to avoid clearing user input
    }
  },
  { flush: 'post', immediate: true }
);

// Watch for uploaded files changes
watch(() => uploadedFiles.value, () => {
  handleFileUpload();
  emit('file-upload', uploadedFiles.value);
}, { deep: true });

watch(
  () => props.form.po_mode,
  (mode) => {
    const normalized = normalizePoMode(mode);
    // CUSTOM mode is no longer available - commented out
    // if (normalized === "CUSTOM") {
    //   const updates: Record<string, any> = {};
    //   if (props.form.project_uuid) {
    //     updates.project_uuid = null;
    //   }
    //   if (props.form.shipping_address_uuid) {
    //     updates.shipping_address_uuid = null;
    //   }
    //   if (Object.keys(updates).length > 0) {
    //     updateFormFields(updates);
    //   }
    //   enforceIncludeItemsConsistency();
    // } else {
      if (props.form.shipping_address_custom) {
        updateFormFields({ shipping_address_custom: null });
      }
      enforceIncludeItemsConsistency();
    // }
  },
  { immediate: true }
);

// Watch PO type changes to handle Labor vs Material PO transitions
watch(
  () => isLaborPurchaseOrder.value,
  async (isLabor, wasLabor) => {
    // When switching to Labor PO, clear material-specific items and initialize labor items
    if (isLabor && !wasLabor) {
      const updates: Record<string, any> = {
        include_items: null,
        po_items: [],
        labor_po_items: Array.isArray(props.form.labor_po_items) ? props.form.labor_po_items : [],
      };
      updateFormFields(updates);
      
      // Explicitly trigger labor items loading from estimate after form update
      // Skip if editing an existing PO with labor items
      if (!shouldSkipLaborAutoImport.value) {
        await nextTick();
        // Automatically load labor items from estimate (Labor PO always uses estimate)
        const projectUuid = props.form.project_uuid;
        const estimateUuid = latestProjectEstimate.value?.uuid;
        
        if (projectUuid && estimateUuid) {
          laborItemsLoading.value = true;
          laborItemsError.value = null;
          try {
            const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
            if (!corpUuid) {
              throw new Error('No corporation selected');
            }
            
            // Fetch estimate line items from API
            const response: any = await $fetch("/api/estimate-line-items", {
              method: "GET",
              query: {
                project_uuid: projectUuid,
                estimate_uuid: estimateUuid,
                corporation_uuid: corpUuid,
              },
            });

            const lineItems = Array.isArray(response?.data) ? response.data : [];
            
            if (!lineItems || lineItems.length === 0) {
              throw new Error('Estimate line items not available');
            }
            
            // Load labor items from the estimate line items
            await loadLaborItemsFromEstimateLineItems(lineItems);
          } catch (error: any) {
            laborItemsError.value = error.message || 'Failed to load labor items from estimate';
          } finally {
            laborItemsLoading.value = false;
          }
        } else if (projectUuid && !estimateUuid) {
          laborItemsError.value = 'Please select a project with an approved estimate';
        } else {
          laborItemsError.value = 'Please select a project first';
        }
      }
    }
    // When switching to Material PO, clear labor-specific items
    else if (!isLabor && wasLabor) {
      const updates: Record<string, any> = {
        labor_po_items: [],
        include_items: props.form.include_items || 'CUSTOM',
      };
      updateFormFields(updates);
    }
  },
  { immediate: true }
);

watch(filteredIncludeItemsOptions, () => {
  enforceIncludeItemsConsistency();
});

// Note: Financial calculations are now handled by FinancialBreakdown component
// The component watches itemTotal and recalculates automatically

// Watch po_items to sync removed items and ensure reactivity
watch(
  () => props.form.po_items,
  (newItems, oldItems) => {
    if (newItems !== oldItems) {
      if (Array.isArray(newItems)) {
        syncRemovedPoItemsWithCurrent(newItems)
      }
      // Force itemTotal to recalculate by accessing it
      // This ensures the FinancialBreakdown component's watcher fires
      const _ = itemTotal.value
    }
  },
  { deep: true }
)

// Watch labor_po_items to ensure reactivity
watch(
  () => props.form.labor_po_items,
  (newItems, oldItems) => {
    if (newItems !== oldItems) {
      // Force itemTotal to recalculate by accessing it
      // This ensures the FinancialBreakdown component's watcher fires
      const _ = itemTotal.value
    }
  },
  { deep: true }
)

// Watch for vendor changes to update addresses
watch(() => props.form.vendor_uuid, () => {
  // Address will update automatically via computed property
});

const ensureItemTypesLoaded = async (
  corpUuid?: string | null,
  projectUuid?: string | null,
  options: { force?: boolean } = {}
) => {
  if (typeof window === 'undefined') return;
  const normalizedCorp = corpUuid ? String(corpUuid) : '';
  if (!normalizedCorp) return;

  const normalizedProject = projectUuid ? String(projectUuid) : undefined;
  const force = Boolean(options.force);

  if (normalizedProject) {
    await fetchItemTypesIfNeeded(normalizedCorp, normalizedProject, force);

    // Use purchaseOrderResourcesStore instead of global itemTypesStore
    const hasProjectItems =
      purchaseOrderResourcesStore.getItemTypes(normalizedCorp, normalizedProject)
        .length > 0;

    if (!hasProjectItems) {
      await fetchItemTypesIfNeeded(
        normalizedCorp,
        undefined,
        force || !hasCachedItemTypes(normalizedCorp)
      );
    }
  } else {
    await fetchItemTypesIfNeeded(normalizedCorp, undefined, force);
  }
};

// Watch for corporation changes to fetch cost codes and preferred items
watch(() => props.form.corporation_uuid, async (newCorpUuid, oldCorpUuid) => {
  if (!newCorpUuid) return;
  
  // Always fetch fresh data from API
  // This ensures we have the latest data regardless of TopBar's selected corporation
  const corporationChanged = oldCorpUuid && oldCorpUuid !== newCorpUuid;
  
  // Ensure cost codes and preferred items are fetched for the selected corporation
  // This ensures cost codes are available regardless of TopBar's selected corporation
  const projectUuid = props.form.project_uuid ?? undefined;
  
  await Promise.allSettled([
    purchaseOrderResourcesStore.ensureCostCodeConfigurations({
      corporationUuid: newCorpUuid,
      projectUuid: projectUuid,
      force: corporationChanged, // Force refresh if corporation changed
    }),
    purchaseOrderResourcesStore.ensurePreferredItems({
      corporationUuid: newCorpUuid,
      projectUuid: projectUuid,
      force: corporationChanged, // Force refresh if corporation changed
    }),
    // Fetch estimates - scoped to purchaseOrderResources store only
    purchaseOrderResourcesStore.ensureEstimates({
      corporationUuid: newCorpUuid,
      force: true,
    }),
  ]);
});

// Watch for project changes to update addresses, preload item types, and fetch project-specific estimates
watch(() => props.form.project_uuid, async (newProjectUuid) => {
  if (!isProjectPurchaseOrder.value) return;
  // Use form's corporation_uuid, fallback to store's selectedCorporation
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (corpUuid && newProjectUuid) {
    await Promise.allSettled([
      projectAddressesStore.fetchAddresses(newProjectUuid),
      ensureItemTypesLoaded(corpUuid, newProjectUuid),
      // Fetch estimates - scoped to purchaseOrderResources store only
      purchaseOrderResourcesStore.ensureEstimates({
        corporationUuid: corpUuid,
        force: true,
      }),
      // Ensure cost code configurations are loaded for the project
      purchaseOrderResourcesStore.ensureCostCodeConfigurations({
        corporationUuid: corpUuid,
        projectUuid: newProjectUuid,
        force: false,
      }),
      // Ensure preferred items are loaded for the project
      purchaseOrderResourcesStore.ensurePreferredItems({
        corporationUuid: corpUuid,
        projectUuid: newProjectUuid,
        force: false,
      }),
    ]);
    const addresses = projectAddressesStore.getAddresses(newProjectUuid) as any[] | undefined;
    const primary = Array.isArray(addresses) && addresses.length
      ? (addresses.find(a => a.is_primary) || addresses[0])
      : null;
    if (primary?.uuid) {
      handleFormUpdate('shipping_address_uuid', primary.uuid);
    }
  }
});

// Initialize
onMounted(async () => {
  // Initialize corporation_uuid in form if not set
  if (!props.form.corporation_uuid && corpStore.selectedCorporation?.uuid) {
    handleFormUpdate('corporation_uuid', corpStore.selectedCorporation.uuid);
  }
  
  // NOTE: We do NOT update corpStore.selectedCorporation here to avoid affecting other components
  // The form operates independently with its own corporation selection (props.form.corporation_uuid)
  // This ensures ItemsList, ItemTypes, Estimates, and other components stay synced with TopBar
  
  // Use the form's corporation_uuid for fetching data (independent from TopBar)
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (corpUuid) {
    await Promise.allSettled([
      vendorStore.fetchVendors(corpUuid),
      // Estimates are fetched only when a project is selected (see project watcher below)
      ensureItemTypesLoaded(corpUuid, props.form.project_uuid),
      // Fetch UOM to enable unit_uuid lookups when importing from master
      uomStore.fetchUOM(corpUuid, false),
      // NOTE: We don't fetch projects metadata here to avoid affecting global projectsStore
      // Projects metadata is managed by TopBar's corporation selection
      Promise.resolve(),
      props.form.project_uuid ? projectAddressesStore.fetchAddresses(props.form.project_uuid) : Promise.resolve(),
    ]);
    
    // CRITICAL: For existing POs with "Import from Master", explicitly fetch preferred items
    // This is necessary because the watcher depends on preferredItemsForProject which starts empty
    // and won't trigger if the items are never populated
    const isEditingMasterPO = 
      props.editingPurchaseOrder && 
      String(props.form.include_items || '').toUpperCase() === 'IMPORT_ITEMS_FROM_MASTER';
    
    if (isEditingMasterPO) {
      await purchaseOrderResourcesStore.ensurePreferredItems({
        corporationUuid: corpUuid,
        projectUuid: props.form.project_uuid,
        force: false,
      });
    }
  }
  // If creating and po_number empty, generate initial number
  if (!props.form.uuid && (!props.form.po_number || String(props.form.po_number).trim() === '')) {
    generatePONumber();
  }
  
  // Set default po_mode to PROJECT if not set
  // Use multiple nextTick calls to ensure this happens after all computed properties are initialized
  if (!props.form.po_mode || String(props.form.po_mode).trim() === '') {
    await nextTick();
    await nextTick();
    handleFormUpdate('po_mode', 'PROJECT');
    // If po_items exist, trigger recalculation to ensure item_total is calculated
    if (Array.isArray(props.form.po_items) && props.form.po_items.length > 0) {
      await nextTick();
      recalculateChargesAndTaxes();
    }
  }
  
  // Note: Financial calculations are now handled by FinancialBreakdown component
  // The component will automatically calculate on mount
});

onBeforeUnmount(() => {
  purchaseOrderResourcesStore.clear();
});

watch(() => corpStore.selectedCorporation?.uuid, async (newCorpUuid) => {
  if (!newCorpUuid) return;
  // Estimates are fetched only when a project is selected (see project watcher)
  // No need to fetch all estimates when corporation changes
  await ensureItemTypesLoaded(newCorpUuid, props.form.project_uuid);
}, { immediate: true });

// Watch validation state and emit changes
watch(() => isFormValid.value, (isValid) => {
  emit('validation-change', isValid);
}, { immediate: true });

// Watch for Labor PO Type and project/estimate changes to load labor items
watch(
  [
    () => isLaborPurchaseOrder.value,
    () => props.form.project_uuid,
    () => latestProjectEstimate.value?.uuid,
  ],
  async ([isLabor, projectUuid, estimateUuid], [prevIsLabor, prevProjectUuid, prevEstimateUuid]) => {
    // Only process if it's a Labor PO
    if (!isLabor) {
      // Clear labor items if switching away from Labor PO
      if (prevIsLabor && !isLabor) {
        updateFormFields({ labor_po_items: [] });
      }
      return;
    }

    // Initialize labor_po_items if it doesn't exist
    if (!Array.isArray(props.form.labor_po_items)) {
      updateFormFields({ labor_po_items: [] });
    }

    // Clear error state when opening existing labor POs with items
    if (props.editingPurchaseOrder && Array.isArray(props.form.labor_po_items) && props.form.labor_po_items.length > 0) {
      laborItemsError.value = null;
    }
    
    // Skip loading if we just switched to Labor PO (handled by PO type watcher)
    // Only handle changes when already in Labor PO mode
    const justSwitchedToLabor = prevIsLabor === false && isLabor === true;
    if (justSwitchedToLabor) {
      return; // Let the PO type watcher handle the initial load
    }

    // Labor PO always uses "Against Estimate" behavior
    // Skip auto-loading if editing an existing PO with labor items
    if (shouldSkipLaborAutoImport.value) {
      return;
    }
    
    // Load if: estimate UUID changed while already in Labor PO mode
    const estimateUuidChanged = estimateUuid !== prevEstimateUuid;
    
    if (estimateUuidChanged && projectUuid && estimateUuid) {
      // Set loading state
      laborItemsLoading.value = true;
      laborItemsError.value = null;
      
      try {
        const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
        if (!corpUuid) {
          throw new Error('No corporation selected');
        }
        
        // Fetch estimate line items from API (similar to how material items are fetched)
        const response: any = await $fetch("/api/estimate-line-items", {
          method: "GET",
          query: {
            project_uuid: projectUuid,
            estimate_uuid: estimateUuid,
            corporation_uuid: corpUuid,
          },
        });

        const lineItems = Array.isArray(response?.data) ? response.data : [];
        
        if (!lineItems || lineItems.length === 0) {
          throw new Error('Estimate line items not available');
        }
        
        // Load labor items from the estimate line items (only cost codes with labor amounts)
        await loadLaborItemsFromEstimateLineItems(lineItems);
      } catch (error: any) {
        laborItemsError.value = error.message || 'Failed to load labor items from estimate';
        // Clear items on error
        updateFormFields({ labor_po_items: [] });
      } finally {
        laborItemsLoading.value = false;
      }
    } else if (estimateUuidChanged && !estimateUuid) {
      // If estimate UUID was cleared, clear items
      updateFormFields({ labor_po_items: [] });
      laborItemsError.value = null;
    }
  },
  { immediate: true }
);

// Load all cost codes for Custom option
const loadAllCostCodes = async () => {
  // Use form's corporation_uuid, fallback to store's selectedCorporation
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (!corpUuid) {
    return;
  }

  // Ensure preferred items are loaded (which fetches configurations internally)
  // This uses purchaseOrderResourcesStore, not the global costCodeConfigurationsStore
  await purchaseOrderResourcesStore.ensurePreferredItems({
    corporationUuid: corpUuid,
    projectUuid: undefined,
    force: false,
  });

  // Fetch configurations directly from API for this store only (not affecting global store)
  // We need the raw configurations for labor PO items, not just preferred items
  let allConfigurations: any[] = [];
  try {
    const response: any = await $fetch("/api/cost-code-configurations", {
      method: "GET",
      query: { corporation_uuid: corpUuid },
    });
    const configs = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
    // Filter to active configurations only
    allConfigurations = configs.filter((config: any) => config.is_active !== false);
  } catch (error) {
    return;
  }
  
  if (!allConfigurations || allConfigurations.length === 0) {
    // No cost codes available, clear items or keep existing
    return;
  }

  // Transform configurations to labor items format
  const laborItems = transformCostCodeConfigsToLaborItems(allConfigurations);
  
  // Don't open modal automatically when editing an existing PO with labor items
  // The modal should only open when user clicks "Edit Selection" button
  if (shouldSkipLaborAutoImport.value) {
    return;
  }
  
  // Show modal for item selection instead of directly applying
  // Mark this as initial import (not editing existing selection)
  isEditingLaborSelection.value = false;
  availableLaborItems.value = laborItems;
  pendingLaborItemsKey.value = 'custom-all';
  showLaborItemsModal.value = true;
};

// Load labor items from estimate line items (similar to how material items are loaded)
const loadLaborItemsFromEstimateLineItems = async (lineItems: any[]) => {
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return;
  }

  // Transform estimate line items to labor items format
  const laborItems = transformEstimateLineItemsToLaborItems(lineItems);
  
  if (laborItems.length === 0) {
    return;
  }
  
  // Don't open modal automatically when editing an existing PO with labor items
  // The modal should only open when user clicks "Edit Selection" button
  if (shouldSkipLaborAutoImport.value) {
    return;
  }
  
  // Show modal for item selection instead of directly applying
  // Mark this as initial import (not editing existing selection)
  isEditingLaborSelection.value = false;
  availableLaborItems.value = laborItems;
  pendingLaborItemsKey.value = `estimate-${latestProjectEstimate.value?.uuid}`;
  showLaborItemsModal.value = true;
};

const clonePoItem = (item: any) => {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(item)
    } catch (error) {
      // fall through to JSON clone
    }
  }
  try {
    return JSON.parse(JSON.stringify(item ?? {}))
  } catch (error) {
    return item
  }
}

</script>

