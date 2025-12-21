<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col lg:flex-row gap-4">
      <!-- Main Form -->
      <div class="flex-1">
        <UCard variant="soft">
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
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
              <!-- Bill Date -->
              <div>
                <USkeleton class="h-3 w-20 mb-1" />
                <USkeleton class="h-9 w-full" />
              </div>
              <!-- Number -->
              <div>
                <USkeleton class="h-3 w-16 mb-1" />
                <USkeleton class="h-9 w-full" />
              </div>
              <!-- Invoice Type -->
              <div>
                <USkeleton class="h-3 w-24 mb-1" />
                <USkeleton class="h-9 w-full" />
              </div>
              <!-- Vendor -->
              <div>
                <USkeleton class="h-3 w-20 mb-1" />
                <USkeleton class="h-9 w-full" />
              </div>
              <!-- Credit Days -->
              <div>
                <USkeleton class="h-3 w-24 mb-1" />
                <USkeleton class="h-9 w-full" />
              </div>
              <!-- Due Date -->
              <div>
                <USkeleton class="h-3 w-20 mb-1" />
                <USkeleton class="h-9 w-full" />
              </div>
              <!-- PO Number -->
              <div>
                <USkeleton class="h-3 w-20 mb-1" />
                <USkeleton class="h-9 w-full" />
              </div>
              <!-- Holdback -->
              <div>
                <USkeleton class="h-3 w-20 mb-1" />
                <USkeleton class="h-9 w-full" />
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
                :model-value="form.corporation_uuid || corpStore.selectedCorporation?.uuid"
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

            <!-- Bill Date -->
            <div>
              <label class="block text-xs font-medium text-default mb-1">
                Bill Date <span class="text-red-500">*</span>
              </label>
              <UPopover :disabled="props.readonly">
                <UButton 
                  color="neutral" 
                  variant="outline" 
                  icon="i-heroicons-calendar-days"
                  class="w-full justify-start"
                  size="sm"
                  :disabled="props.readonly"
                >
                  {{ billDateDisplayText }}
                </UButton>
                <template #content>
                  <UCalendar v-model="billDateValue" class="p-2" :disabled="props.readonly" />
                </template>
              </UPopover>
            </div>

            <!-- Invoice Number -->
            <div>
              <label class="block text-xs font-medium text-default mb-1">
                Invoice Number
              </label>
              <UInput
                :model-value="form.number"
                placeholder="Auto-generated"
                size="sm"
                class="w-full"
                disabled
                icon="i-heroicons-hashtag"
              />
            </div>

            <!-- Invoice Type -->
            <div>
              <label class="block text-xs font-medium text-default mb-1">
                Invoice type <span class="text-red-500">*</span>
              </label>
              <USelectMenu
                v-model="invoiceTypeOption"
                :items="invoiceTypeOptions"
                placeholder="Select invoice type"
                size="sm"
                class="w-full"
                value-key="value"
                :disabled="!form.project_uuid || props.readonly"
              />
            </div>

            <!-- Vendor -->
            <div>
              <label class="block text-xs font-medium text-default mb-1">
                Vendor <span class="text-red-500">*</span>
              </label>
              <VendorSelect
                :model-value="form.vendor_uuid"
                :corporation-uuid="form.corporation_uuid || corpStore.selectedCorporation?.uuid"
                :disabled="!form.corporation_uuid && !corpStore.selectedCorporation || areSubsequentFieldsDisabled"
                placeholder="Select vendor"
                size="sm"
                class="w-full"
                @update:model-value="handleVendorChange"
                @change="handleVendorChange"
              />
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
                :disabled="areSubsequentFieldsDisabled"
              />
            </div>

            <!-- Due Date -->
            <div>
              <label class="block text-xs font-medium text-default mb-1">
                Due Date <span class="text-red-500">*</span>
              </label>
              <UPopover v-model:open="dueDatePopoverOpen" :disabled="areSubsequentFieldsDisabled">
                <UButton 
                  color="neutral" 
                  variant="outline" 
                  icon="i-heroicons-calendar-days"
                  class="w-full justify-start"
                  size="sm"
                  :disabled="areSubsequentFieldsDisabled"
                >
                  {{ dueDateDisplayText }}
                </UButton>
                <template #content>
                  <UCalendar v-model="dueDateValue" class="p-2" :disabled="areSubsequentFieldsDisabled" @update:model-value="dueDatePopoverOpen = false" />
                </template>
              </UPopover>
            </div>

            <!-- PO Number (only visible when invoice type is "Against PO") -->
            <div v-if="isAgainstPO">
              <label class="block text-xs font-medium text-default mb-1">
                PO Number <span class="text-red-500">*</span>
              </label>
              <POCOSelect
                :model-value="form.po_co_uuid || (form.purchase_order_uuid ? `PO:${form.purchase_order_uuid}` : undefined)"
                :project-uuid="form.project_uuid"
                :corporation-uuid="form.corporation_uuid || corpStore.selectedCorporation?.uuid"
                :vendor-uuid="form.vendor_uuid"
                :show-invoice-summary="true"
                :showOnlyPOs="true"
                :disabled="areSubsequentFieldsDisabled"
                placeholder="Select purchase order"
                size="sm"
                class="w-full"
                @update:model-value="handlePOCOModelValue"
                @change="handlePOCOChangeForPO"
              />
            </div>

            <!-- CO Number (only visible when invoice type is "Against CO") -->
            <div v-if="isAgainstCO">
              <label class="block text-xs font-medium text-default mb-1">
                CO Number <span class="text-red-500">*</span>
              </label>
              <POCOSelect
                :model-value="form.po_co_uuid || (form.change_order_uuid ? `CO:${form.change_order_uuid}` : undefined)"
                :project-uuid="form.project_uuid"
                :corporation-uuid="form.corporation_uuid || corpStore.selectedCorporation?.uuid"
                :vendor-uuid="form.vendor_uuid"
                :show-invoice-summary="true"
                :showOnlyCOs="true"
                :disabled="areSubsequentFieldsDisabled"
                placeholder="Select change order"
                size="sm"
                class="w-full"
                @update:model-value="handlePOCOModelValue"
                @change="handlePOCOChangeForCO"
              />
            </div>

            <!-- PO/CO Select (only visible when invoice type is "Against Advance Payment") -->
            <div v-if="isAgainstAdvancePayment">
              <label class="block text-xs font-medium text-default mb-1">
                Select PO/CO <span class="text-red-500">*</span>
              </label>
              <POCOSelect
                :model-value="form.po_co_uuid"
                :project-uuid="form.project_uuid"
                :corporation-uuid="form.corporation_uuid || corpStore.selectedCorporation?.uuid"
                :vendor-uuid="form.vendor_uuid"
                :disabled="areSubsequentFieldsDisabled"
                placeholder="Select PO or CO"
                size="sm"
                class="w-full"
                @update:model-value="handlePOCOModelValue"
                @change="handlePOCOChange"
              />
            </div>

            <!-- Holdback Invoice Select (only visible when invoice type is "Against Holdback Amount") -->
            <div v-if="isAgainstHoldback">
              <label class="block text-xs font-medium text-default mb-1">
                Select PO/CO for Holdback <span class="text-red-500">*</span>
              </label>
              <UButton
                :disabled="areSubsequentFieldsDisabled"
                color="neutral"
                variant="outline"
                size="sm"
                class="w-full justify-start"
                @click="showHoldbackModal = true"
              >
                <span v-if="form.holdback_invoice_uuid || form.po_co_uuid">
                  <span v-if="form.po_number">{{ form.po_number }}</span>
                  <span v-else-if="form.co_number">{{ form.co_number }}</span>
                  <span v-else-if="form.holdback_invoice_uuid">Holdback Invoice Selected</span>
                  <span v-else>Selected</span>
                </span>
                <span v-else>
                  {{ !form.project_uuid ? 'Select project first' : !form.vendor_uuid ? 'Select vendor first' : 'Select PO/CO for holdback invoice' }}
                </span>
              </UButton>
            </div>

            <!-- Total Invoice Amount -->
            <div>
              <label class="block text-xs font-medium text-default mb-1">
                Total Invoice Amount <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <UInput
                  :model-value="amountInputValue"
                  type="number"
                  step="0.01"
                  pattern="[0-9.]*"
                  inputmode="decimal"
                  placeholder="0.00"
                  size="sm"
                  class="w-full"
                  :disabled="true"
                  @keypress="(e: KeyboardEvent) => { if (e.key && !/[0-9.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') e.preventDefault(); }"
                  readonly
                />
              </div>
            </div>

            <!-- Holdback (only for Against PO or Against CO) -->
            <div v-if="isAgainstPO || isAgainstCO">
              <label class="block text-xs font-medium text-default mb-1">
                Holdback
              </label>
              <div class="relative">
                <UInput
                  :model-value="holdbackInputValue"
                  type="number"
                  step="0.01"
                  pattern="[0-9.]*"
                  inputmode="decimal"
                  placeholder="0"
                  size="sm"
                  class="w-full pr-8"
                  :disabled="areSubsequentFieldsDisabled"
                  @keypress="(e: KeyboardEvent) => { if (e.key && !/[0-9.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') e.preventDefault(); }"
                  @update:model-value="handleHoldbackChange"
                />
                <div class="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 font-medium pointer-events-none bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded border border-default">
                  %
                </div>
              </div>
            </div>
            </template>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Advance Payment Cost Codes Table (only for Against Advance Payment) -->
    <AdvancePaymentCostCodesTable
      v-if="isAgainstAdvancePayment && !hasAllItemsZeroToBeInvoiced"
      :po-co-uuid="form.po_co_uuid"
      :po-co-type="poCoType"
      :corporation-uuid="form.corporation_uuid || corpStore.selectedCorporation?.uuid"
      :readonly="props.readonly"
      :model-value="advancePaymentCostCodes"
      :removed-cost-codes="removedAdvancePaymentCostCodes"
      @update:model-value="handleAdvancePaymentCostCodesUpdate"
      @update:removed-cost-codes="handleRemovedCostCodesUpdate"
    />

    <!-- Validation Error Message for Zero To Be Invoiced (shown before tables) -->
    <UAlert
      v-if="overInvoicedValidationError && hasAllItemsZeroToBeInvoiced"
      color="error"
      variant="soft"
      class="mt-6"
      title="Cannot Create Invoice"
      :description="overInvoicedValidationError"
    />

    <!-- PO Items Table (only for Against PO) -->
    <div v-if="isAgainstPO && !hasAllItemsZeroToBeInvoiced" class="mt-6">
      <POItemsTableWithEstimates
        :key="`po-items-${form.purchase_order_uuid || 'none'}-${poItemsKey}-${poItems.length}`"
        title="Purchase Order Items"
        :description="form.purchase_order_uuid ? 'Items from the selected purchase order' : 'Select a purchase order to view items'"
        :items="poItems"
        :loading="poItemsLoading"
        :error="poItemsError"
        :corporation-uuid="form.corporation_uuid || corpStore.selectedCorporation?.uuid"
        :project-uuid="form.project_uuid"
        :scoped-cost-code-configurations="scopedCostCodeConfigurations"
        :scoped-item-types="scopedItemTypes"
        :show-estimate-values="false"
        :show-invoice-values="true"
        :readonly="props.readonly"
        :hide-approval-checks="true"
        :hide-model-number="true"
        :hide-location="true"
        @invoice-unit-price-change="handleInvoiceUnitPriceChange"
        @invoice-quantity-change="handleInvoiceQuantityChange"
        @invoice-total-change="handleInvoiceTotalChange"
        @approval-checks-change="handlePOItemApprovalChecksChange"
      />

      <!-- Advance Payment Breakdown Table -->
      <AdvancePaymentBreakdownTable
        ref="poAdvancePaymentBreakdownRef"
        :purchase-order-uuid="form.purchase_order_uuid"
        :current-invoice-uuid="form.uuid"
        :show-adjustment-inputs="true"
        :readonly="props.readonly"
        :adjusted-amounts="adjustedAdvancePaymentAmounts"
        :previously-adjusted-cost-codes="previouslyAdjustedCostCodes"
        @adjusted-amount-change="handleAdjustedAmountChange"
        @adjusted-amounts-update="handleAdjustedAmountsUpdate"
      />
    </div>

    <!-- CO Items Table (only for Against CO) -->
    <div v-if="isAgainstCO && !hasAllItemsZeroToBeInvoiced" class="mt-6">
      <COItemsTableFromOriginal
        :key="`co-items-${form.change_order_uuid || 'none'}-${coItemsKey}-${coItems.length}`"
        title="Change Order Items"
        :description="form.change_order_uuid ? 'Items from the selected change order' : 'Select a change order to view items'"
        :items="coItems"
        :loading="coItemsLoading"
        :error="coItemsError"
        :show-invoice-values="true"
        :readonly="props.readonly"
        :hide-approval-checks="true"
        @invoice-unit-price-change="handleCOInvoiceUnitPriceChange"
        @invoice-quantity-change="handleCOInvoiceQuantityChange"
        @invoice-total-change="handleCOInvoiceTotalChange"
      />

      <!-- Advance Payment Breakdown Table -->
      <AdvancePaymentBreakdownTable
        ref="coAdvancePaymentBreakdownRef"
        :change-order-uuid="form.change_order_uuid"
        :current-invoice-uuid="form.uuid"
        :show-adjustment-inputs="true"
        :readonly="props.readonly"
        :adjusted-amounts="adjustedAdvancePaymentAmounts"
        :previously-adjusted-cost-codes="previouslyAdjustedCostCodes"
        @adjusted-amount-change="handleAdjustedAmountChange"
        @adjusted-amounts-update="handleAdjustedAmountsUpdate"
      />
    </div>

    <!-- Holdback Breakdown Table (only for Against Holdback Amount) -->
    <!-- Show table if we have holdback invoice UUID OR if we have saved holdback cost codes (for existing invoices) -->
    <div v-if="isAgainstHoldback && ((form.purchase_order_uuid || form.change_order_uuid) || (holdbackCostCodes && holdbackCostCodes.length > 0))" class="mt-6">
      <HoldbackBreakdownTable
        :purchase-order-uuid="form.purchase_order_uuid"
        :change-order-uuid="form.change_order_uuid"
        :corporation-uuid="form.corporation_uuid || corpStore.selectedCorporation?.uuid"
        :readonly="props.readonly"
        :model-value="holdbackCostCodes"
        :holdback-invoice-uuid="form.holdback_invoice_uuid"
        @update:model-value="handleHoldbackCostCodesUpdate"
        @release-amounts-update="handleHoldbackReleaseAmountsUpdate"
      />
    </div>

    <!-- Line Items Table (only for Direct Invoice) -->
    <div v-if="isDirectInvoice && !hasAllItemsZeroToBeInvoiced" class="mt-6">
      <DirectVendorInvoiceLineItemsTable
        :items="lineItems"
        :corporation-uuid="form.corporation_uuid || corpStore.selectedCorporation?.uuid"
        :readonly="props.readonly"
        @add-row="handleAddLineItem"
        @remove-row="handleRemoveLineItem"
        @cost-code-change="handleLineItemCostCodeChange"
        @sequence-change="handleLineItemSequenceChange"
        @item-change="handleLineItemItemChange"
        @description-change="handleLineItemDescriptionChange"
        @unit-price-change="handleLineItemUnitPriceChange"
        @quantity-change="handleLineItemQuantityChange"
      />
    </div>

    <!-- File Upload and Financial Breakdown Section (for Advance Payment Invoice) -->
    <div v-if="isAgainstAdvancePayment && !hasAllItemsZeroToBeInvoiced" class="mt-6 flex flex-col lg:flex-row gap-6">
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
            accept=".pdf,.png,.jpg,.jpeg"
            multiple
          >
            <div class="space-y-2">
              <UButton
                :label="isUploading ? 'Uploading...' : (uploadedFiles.length > 0 ? 'Add more files' : 'Choose files')"
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
              Use the button above to attach invoice documents.
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
                    @click.stop="removeFile(index)"
                  />
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Financial Breakdown (Right) -->
      <div class="w-full lg:flex-1 flex justify-start lg:justify-end">
        <div class="w-full lg:w-auto lg:min-w-[520px]">
          <FinancialBreakdown
            :item-total="advancePaymentTotal"
            :form-data="form"
            :read-only="props.readonly"
            item-total-label="Advance Payment Total"
            total-label="Total Invoice Amount"
            total-field-name="amount"
            :hide-charges="true"
            :show-total-amount="true"
            total-amount-label="Total Amount"
            :allow-edit-total="false"
            @update="handleFinancialBreakdownUpdate"
          />
        </div>
      </div>
    </div>

    <!-- File Upload and Financial Breakdown Section (for Direct Invoice) -->
    <div v-if="isDirectInvoice" class="mt-6 flex flex-col lg:flex-row gap-6">
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
            accept=".pdf,.png,.jpg,.jpeg"
            multiple
          >
            <div class="space-y-2">
              <UButton
                :label="isUploading ? 'Uploading...' : (uploadedFiles.length > 0 ? 'Add more files' : 'Choose files')"
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
              Use the button above to attach invoice documents.
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
                    @click.stop="removeFile(index)"
                  />
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Financial Breakdown (Right) -->
      <div class="w-full lg:flex-1 flex justify-start lg:justify-end">
        <div class="w-full lg:w-auto lg:min-w-[520px]">
          <FinancialBreakdown
            :item-total="lineItemsTotal"
            :form-data="form"
            :read-only="props.readonly"
            item-total-label="Item Total"
            total-label="Total Invoice Amount"
            total-field-name="amount"
            :show-total-amount="true"
            total-amount-label="Total Amount"
            :allow-edit-total="false"
            @update="handleFinancialBreakdownUpdate"
          />
        </div>
      </div>
    </div>

    <!-- File Upload and Financial Breakdown Section (for Against PO) -->
    <div v-if="isAgainstPO && !hasAllItemsZeroToBeInvoiced" class="mt-6 flex flex-col lg:flex-row gap-6">
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
            accept=".pdf,.png,.jpg,.jpeg"
            multiple
          >
            <div class="space-y-2">
              <UButton
                :label="isUploading ? 'Uploading...' : (uploadedFiles.length > 0 ? 'Add more files' : 'Choose files')"
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
              Use the button above to attach invoice documents.
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
                    @click.stop="removeFile(index)"
                  />
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Financial Breakdown (Right) -->
      <div class="w-full lg:flex-1 flex justify-start lg:justify-end">
        <div class="w-full lg:w-auto lg:min-w-[520px]">
          <FinancialBreakdown
            :item-total="poItemsTotal"
            :form-data="form"
            :read-only="props.readonly"
            item-total-label="Invoice Items Total"
            total-label="Total Invoice Amount"
            total-field-name="amount"
            :show-total-amount="true"
            total-amount-label="Total Amount"
            :allow-edit-total="false"
            :total-invoice-amount-error="props.totalInvoiceAmountError"
            :advance-payment-deduction="totalAdjustedAdvancePayment"
            :holdback-deduction="poHoldbackAmount"
            @update="handleFinancialBreakdownUpdate"
          />
        </div>
      </div>
    </div>

    <!-- File Upload and Financial Breakdown Section (for Against Holdback Amount) -->
    <div v-if="isAgainstHoldback && (form.purchase_order_uuid || form.change_order_uuid) && form.holdback_invoice_uuid" class="mt-6 flex flex-col lg:flex-row gap-6">
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
            accept=".pdf,.png,.jpg,.jpeg"
            multiple
          >
            <div class="space-y-2">
              <UButton
                :label="isUploading ? 'Uploading...' : (uploadedFiles.length > 0 ? 'Add more files' : 'Choose files')"
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
              Use the button above to attach invoice documents.
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
                    @click.stop="removeFile(index)"
                  />
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Financial Breakdown (Right) -->
      <div class="w-full lg:flex-1 flex justify-start lg:justify-end">
        <div class="w-full lg:w-auto lg:min-w-[520px]">
          <FinancialBreakdown
            :item-total="holdbackReleaseAmountTotal"
            :form-data="form"
            :read-only="props.readonly"
            item-total-label="Release Amount Total"
            total-label="Total Invoice Amount"
            total-field-name="amount"
            :hide-charges="true"
            :show-total-amount="true"
            total-amount-label="Total Amount"
            :allow-edit-total="false"
            @update="handleFinancialBreakdownUpdate"
          />
        </div>
      </div>
    </div>

    <!-- File Upload and Financial Breakdown Section (for Against CO) -->
    <div v-if="isAgainstCO && !hasAllItemsZeroToBeInvoiced" class="mt-6 flex flex-col lg:flex-row gap-6">
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
            accept=".pdf,.png,.jpg,.jpeg"
            multiple
          >
            <div class="space-y-2">
              <UButton
                :label="isUploading ? 'Uploading...' : (uploadedFiles.length > 0 ? 'Add more files' : 'Choose files')"
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
              Use the button above to attach invoice documents.
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
                    @click.stop="removeFile(index)"
                  />
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Financial Breakdown (Right) -->
      <div class="w-full lg:flex-1 flex justify-start lg:justify-end">
        <div class="w-full lg:w-auto lg:min-w-[520px]">
          <FinancialBreakdown
            :item-total="coItemsTotal"
            :form-data="form"
            :read-only="props.readonly"
            item-total-label="CO Items Total"
            total-label="Total Invoice Amount"
            total-field-name="amount"
            :show-total-amount="true"
            total-amount-label="Total Amount"
            :allow-edit-total="false"
            :total-invoice-amount-error="props.totalInvoiceAmountError"
            :advance-payment-deduction="totalAdjustedAdvancePayment"
            :holdback-deduction="coHoldbackAmount"
            @update="handleFinancialBreakdownUpdate"
          />
        </div>
      </div>
    </div>

    <!-- File Preview Modal -->
    <UModal v-model:open="showFilePreviewModal">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">File Preview</h3>
          <UButton icon="i-heroicons-x-mark" size="xs" variant="solid" color="neutral" @click="closeFilePreview" />
        </div>
      </template>
      <template #body>
        <div class="h-[70vh]">
          <FilePreview :attachment="selectedFileForPreview" />
        </div>
      </template>
    </UModal>

    <!-- Holdback Invoice Select Modal -->
    <HoldbackInvoiceSelect
      v-model="showHoldbackModal"
      :project-uuid="form.project_uuid"
      :corporation-uuid="form.corporation_uuid || corpStore.selectedCorporation?.uuid"
      :vendor-uuid="form.vendor_uuid"
      @select="handleHoldbackSelection"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, triggerRef } from "vue";
import { CalendarDate, DateFormatter, getLocalTimeZone } from "@internationalized/date";
import { useCorporationStore } from "@/stores/corporations";
import { useVendorStore } from "@/stores/vendors";
import { useProjectsStore } from "@/stores/projects";
import { useVendorInvoicesStore } from "@/stores/vendorInvoices";
import { useCostCodeConfigurationsStore } from "@/stores/costCodeConfigurations";
import { usePurchaseOrdersStore } from "@/stores/purchaseOrders";
import { useChangeOrdersStore } from "@/stores/changeOrders";
import { usePurchaseOrderResourcesStore } from "@/stores/purchaseOrderResources";
import { useUTCDateFormat } from '@/composables/useUTCDateFormat';
import CorporationSelect from '@/components/Shared/CorporationSelect.vue';
import ProjectSelect from '@/components/Shared/ProjectSelect.vue';
import VendorSelect from '@/components/Shared/VendorSelect.vue';
import PurchaseOrderSelect from '@/components/Shared/PurchaseOrderSelect.vue';
import POCOSelect from '@/components/Shared/POCOSelect.vue';
import FilePreview from '@/components/Shared/FilePreview.vue';
import DirectVendorInvoiceLineItemsTable from '@/components/Payables/DirectVendorInvoiceLineItemsTable.vue';
import AdvancePaymentCostCodesTable from '@/components/Payables/AdvancePaymentCostCodesTable.vue';
import AdvancePaymentBreakdownTable from '@/components/Payables/AdvancePaymentBreakdownTable.vue';
import HoldbackInvoiceSelect from '@/components/Payables/HoldbackInvoiceSelect.vue';
import HoldbackBreakdownTable from '@/components/Payables/HoldbackBreakdownTable.vue';
import FinancialBreakdown from '@/components/PurchaseOrders/FinancialBreakdown.vue';
import POItemsTableWithEstimates from '@/components/PurchaseOrders/POItemsTableWithEstimates.vue';
import COItemsTableFromOriginal from '@/components/ChangeOrders/COItemsTableFromOriginal.vue';

// Props
interface Props {
  form: any;
  editingInvoice: boolean;
  loading?: boolean;
  readonly?: boolean;
  totalInvoiceAmountError?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  readonly: false,
  totalInvoiceAmountError: null
});

// Emits
const emit = defineEmits<{
  'update:form': [value: any];
  'file-upload': [files: File[]];
}>();

// Stores
const corpStore = useCorporationStore();
const vendorStore = useVendorStore();
const projectsStore = useProjectsStore();
const vendorInvoicesStore = useVendorInvoicesStore();
const costCodeConfigurationsStore = useCostCodeConfigurationsStore();
// Import stores for PO/CO data fetching (used by POCOSelect)
// NOTE: We fetch data for the form's corporation, not TopBar's corporation
const purchaseOrdersStore = usePurchaseOrdersStore();
const changeOrdersStore = useChangeOrdersStore();
// Use purchaseOrderResourcesStore for cost codes, item types, and preferred items
// This ensures we fetch data for the form's corporation, not TopBar's corporation
const purchaseOrderResourcesStore = usePurchaseOrderResourcesStore();
const { toUTCString, fromUTCString } = useUTCDateFormat();

// Helper functions for numeric parsing and rounding (same as PurchaseOrderForm)
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

// Generate next Invoice number with pattern INV-<n>, starting at 1
async function generateInvoiceNumber() {
  // Do not override if already set (e.g., editing)
  if (props.form.number && String(props.form.number).trim() !== '') return;
  const corporationId = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid || corpStore.selectedCorporationId;
  if (!corporationId) return;

  // Fetch vendor invoices directly from API for the form's corporation
  // This ensures we get invoices for the form's corporation, not TopBar's
  try {
    const response = await $fetch<{ data: any[] }>(`/api/vendor-invoices?corporation_uuid=${corporationId}`);
    const invoices = Array.isArray(response?.data) ? response.data : [];
    
    // Filter invoices for this corporation (in case API returns more)
    const existing = invoices.filter((inv: any) => inv.corporation_uuid === corporationId);
    let maxNum = 0;
    for (const inv of existing) {
      const num = parseInt(String(inv.number || '').replace(/^INV-/i, ''), 10);
      if (!isNaN(num)) maxNum = Math.max(maxNum, num);
    }
    const next = maxNum + 1;
    handleFormUpdate('number', `INV-${next}`);
  } catch (error) {
    console.error('[VendorInvoiceForm] Error fetching vendor invoices for invoice number generation:', error);
    // Fallback: use store if API fails (though it may have TopBar's corporation data)
    const existing = (vendorInvoicesStore.vendorInvoices || []).filter((inv: any) => inv.corporation_uuid === corporationId);
    let maxNum = 0;
    for (const inv of existing) {
      const num = parseInt(String(inv.number || '').replace(/^INV-/i, ''), 10);
      if (!isNaN(num)) maxNum = Math.max(maxNum, num);
    }
    const next = maxNum + 1;
    handleFormUpdate('number', `INV-${next}`);
  }
}

// Date formatter
const df = new DateFormatter('en-US', {
  dateStyle: 'medium'
});

// Invoice type options
const invoiceTypeOptions = [
  { label: 'Enter Direct Invoice', value: 'ENTER_DIRECT_INVOICE' },
  { label: 'Against PO', value: 'AGAINST_PO' },
  { label: 'Against CO', value: 'AGAINST_CO' },
  { label: 'Against Advance Payment', value: 'AGAINST_ADVANCE_PAYMENT' },
  { label: 'Against the hold back amount', value: 'AGAINST_HOLDBACK_AMOUNT' },
];

// Credit days options
const creditDaysOptions = [
  { label: 'Net 15', value: 'NET_15' },
  { label: 'Net 25', value: 'NET_25' },
  { label: 'Net 30', value: 'NET_30' },
  { label: 'Net 45', value: 'NET_45' },
  { label: 'Net 60', value: 'NET_60' },
];

// Check if invoice type is selected
const isInvoiceTypeSelected = computed(() => {
  return !!props.form.invoice_type && String(props.form.invoice_type).trim() !== '';
});

// Check if invoice type is "Against PO"
const isAgainstPO = computed(() => {
  return String(props.form.invoice_type || '').toUpperCase() === 'AGAINST_PO';
});

// Check if invoice type is "Against CO"
const isAgainstCO = computed(() => {
  return String(props.form.invoice_type || '').toUpperCase() === 'AGAINST_CO';
});

// Check if invoice type is "Enter Direct Invoice"
const isDirectInvoice = computed(() => {
  return String(props.form.invoice_type || '').toUpperCase() === 'ENTER_DIRECT_INVOICE';
});

// Check if invoice type is "Against Advance Payment"
const isAgainstAdvancePayment = computed(() => {
  return String(props.form.invoice_type || '').toUpperCase() === 'AGAINST_ADVANCE_PAYMENT';
});

// Check if invoice type is "Against Holdback Amount"
const isAgainstHoldback = computed(() => {
  return String(props.form.invoice_type || '').toUpperCase() === 'AGAINST_HOLDBACK_AMOUNT';
});

// Determine PO/CO type from po_co_uuid
const poCoType = computed<'PO' | 'CO' | null>(() => {
  const poCoUuid = props.form.po_co_uuid
  if (!poCoUuid || typeof poCoUuid !== 'string') {
    return null
  }
  
  if (poCoUuid.startsWith('PO:')) {
    return 'PO'
  }
  if (poCoUuid.startsWith('CO:')) {
    return 'CO'
  }
  return null
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

// Scoped item types for passing to child components (avoids polluting global store)
const scopedItemTypes = computed(() => {
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (!corpUuid) return [];
  return purchaseOrderResourcesStore.getItemTypes(
    corpUuid,
    props.form.project_uuid
  );
});

// Preferred items for populating options in PO items
const preferredItemOptions = computed(() => {
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (!corpUuid) return [];
  const projectUuid = props.form.project_uuid ?? undefined;
  const source = purchaseOrderResourcesStore.getPreferredItems(corpUuid, projectUuid) || [];
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
      const itemSequence = item.item_sequence || item.sequence || '';
      return {
        label,
        value: String(value || ""),
        item_sequence: itemSequence,
        sequence: itemSequence,
        raw: item,
      };
    })
    .filter((opt: any) => Boolean(opt.value));
});

// Advance payment cost codes
const advancePaymentCostCodes = computed(() => {
  return Array.isArray(props.form.advance_payment_cost_codes) 
    ? props.form.advance_payment_cost_codes 
    : []
});

// Removed advance payment cost codes (for persistence)
const removedAdvancePaymentCostCodes = computed(() => {
  return Array.isArray(props.form.removed_advance_payment_cost_codes) 
    ? props.form.removed_advance_payment_cost_codes 
    : []
});

// Holdback cost codes (for Against Holdback Amount invoice type)
const holdbackCostCodes = computed(() => {
  return Array.isArray(props.form.holdback_cost_codes) 
    ? props.form.holdback_cost_codes 
    : []
});

// Total release amount from holdback breakdown table
const holdbackReleaseAmountTotal = ref(0);

// Debug: Watch form values for holdback invoice
watch(
  [() => props.form.po_number, () => props.form.co_number, () => props.form.po_co_uuid, () => props.form.holdback_invoice_uuid],
  ([newPoNumber, newCoNumber, newPoCoUuid, newHoldbackInvoiceUuid], [oldPoNumber, oldCoNumber, oldPoCoUuid, oldHoldbackInvoiceUuid]) => {
    if (isAgainstHoldback.value) {
      console.log('[VendorInvoiceForm] Form values changed (holdback invoice):', {
        po_number: { old: oldPoNumber, new: newPoNumber },
        co_number: { old: oldCoNumber, new: newCoNumber },
        po_co_uuid: { old: oldPoCoUuid, new: newPoCoUuid },
        holdback_invoice_uuid: { old: oldHoldbackInvoiceUuid, new: newHoldbackInvoiceUuid }
      });
    }
  },
  { immediate: true }
);

// Computed property to determine if subsequent fields should be disabled
const areSubsequentFieldsDisabled = computed(() => {
  return !isInvoiceTypeSelected.value || props.readonly;
});

// Date computed properties
const billDateValue = computed({
  get: () => {
    if (!props.form.bill_date) return null;
    const src = String(props.form.bill_date);
    const localYmd = src.includes('T') ? fromUTCString(src) : src;
    const parts = localYmd.split('-');
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new CalendarDate(year, month, day);
      }
    }
    return null;
  },
  set: (value: CalendarDate | null) => {
    if (value) {
      const dateString = `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
      handleFormUpdate('bill_date', toUTCString(dateString));
    } else {
      handleFormUpdate('bill_date', null);
    }
  }
});

const dueDateValue = computed({
  get: () => {
    if (!props.form.due_date) return null;
    const src = String(props.form.due_date);
    const localYmd = src.includes('T') ? fromUTCString(src) : src;
    const parts = localYmd.split('-');
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new CalendarDate(year, month, day);
      }
    }
    return null;
  },
  set: (value: CalendarDate | null) => {
    if (value) {
      const dateString = `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
      handleFormUpdate('due_date', toUTCString(dateString));
    } else {
      handleFormUpdate('due_date', null);
    }
  }
});

// Display text for dates
const billDateDisplayText = computed(() => {
  if (!billDateValue.value) return 'Select bill date';
  return df.format(billDateValue.value.toDate(getLocalTimeZone()));
});

const dueDateDisplayText = computed(() => {
  if (!dueDateValue.value) return 'Select due date';
  return df.format(dueDateValue.value.toDate(getLocalTimeZone()));
});

// Invoice type option
const invoiceTypeOption = computed<any>({
  get: () => {
    const v = props.form.invoice_type
    if (!v) return undefined
    const target = String(v).toUpperCase()
    return invoiceTypeOptions.find(opt => String(opt.value).toUpperCase() === target)
  },
  set: (val) => {
    const value = typeof val === 'string' ? val : (val?.value || '')
    handleFormUpdate('invoice_type', value)
  }
});

// Credit days option
const creditDaysOption = computed<any>({
  get: () => {
    const v = props.form.credit_days
    if (!v) return undefined
    const target = String(v).toLowerCase()
    let found = creditDaysOptions.find(opt => String(opt.value).toLowerCase() === target)
    if (!found) {
      found = creditDaysOptions.find(opt => opt.label.toLowerCase() === target.replace(/_/g, ' '))
    }
    return found
  },
  set: (val) => {
    const value = typeof val === 'string' ? val : (val?.value || '')
    handleFormUpdate('credit_days', value)
  }
});

// Amount input value
const amountInputValue = computed(() => {
  const amount = props.form.amount
  if (amount === null || amount === undefined || amount === '') return ''
  return String(amount)
});

// Holdback input value
const holdbackInputValue = computed(() => {
  const holdback = props.form.holdback
  if (holdback === null || holdback === undefined || holdback === '') return ''
  return String(holdback)
});

// Line items for direct invoice
const lineItems = computed(() => {
  return Array.isArray(props.form.line_items) ? props.form.line_items : [];
});

// Watch line_items to ensure reactivity (same pattern as PurchaseOrderForm)
watch(
  () => props.form.line_items,
  (newItems, oldItems) => {
    if (newItems !== oldItems) {
      if (Array.isArray(newItems)) {
        // Force lineItemsTotal to recalculate by accessing it
        // This ensures the FinancialBreakdown component's watcher fires
        const _ = lineItemsTotal.value
      }
    }
  },
  { deep: true }
)

// Watch for po_invoice_items to become available and re-map PO items if needed
// This fixes the race condition where items are loaded before invoice items are available
watch(
  () => props.form.po_invoice_items,
  async (newInvoiceItems, oldInvoiceItems) => {
    // Only re-map if:
    // 1. This is an existing invoice (has uuid)
    // 2. We have PO items already loaded
    // 3. Invoice items just became available (were undefined/null before, now defined)
    // 4. We're in Against PO mode
    // 5. We have a purchase order UUID
    const wasUndefined = !oldInvoiceItems || (Array.isArray(oldInvoiceItems) && oldInvoiceItems.length === 0);
    const isNowDefined = Array.isArray(newInvoiceItems);
    
    if (
      props.form.uuid &&
      isAgainstPO.value &&
      props.form.purchase_order_uuid &&
      poItems.value.length > 0 &&
      wasUndefined &&
      isNowDefined
    ) {
      // Re-fetch PO items to re-map with saved invoice values
      await fetchPOItems(props.form.purchase_order_uuid);
    }
  },
  { immediate: false }
)

// Watch for co_invoice_items to become available and re-map CO items if needed
// This fixes the race condition where items are loaded before invoice items are available
watch(
  () => props.form.co_invoice_items,
  async (newInvoiceItems, oldInvoiceItems) => {
    // Only re-map if:
    // 1. This is an existing invoice (has uuid)
    // 2. We have CO items already loaded
    // 3. Invoice items just became available (were undefined/null before, now defined)
    // 4. We're in Against CO mode
    // 5. We have a change order UUID
    const wasUndefined = !oldInvoiceItems || (Array.isArray(oldInvoiceItems) && oldInvoiceItems.length === 0);
    const isNowDefined = Array.isArray(newInvoiceItems);
    
    if (
      props.form.uuid &&
      isAgainstCO.value &&
      props.form.change_order_uuid &&
      coItems.value.length > 0 &&
      wasUndefined &&
      isNowDefined
    ) {
      // Re-fetch CO items to re-map with saved invoice values
      await fetchCOItems(props.form.change_order_uuid);
    }
  },
  { immediate: false }
)

// File upload functionality
const uploadedFiles = ref<File[]>([]);
const fileUploadError = ref<string | null>(null);
const isUploading = ref(false);
const dueDatePopoverOpen = ref(false);

// File preview functionality
const showFilePreviewModal = ref(false);
const selectedFileForPreview = ref<any>(null);

// Holdback invoice selection modal
const showHoldbackModal = ref(false);

// PO items state (for Against PO invoice type)
const poItems = ref<any[]>([]);
const poItemsLoading = ref(false);
const poItemsError = ref<string | null>(null);
const poItemsKey = ref(0); // Key to force re-render of POItemsTableWithEstimates
const poAdvancePaid = ref<number>(0); // Total advance payments made for the selected PO
const poAdvancePaymentBreakdownRef = ref<InstanceType<typeof AdvancePaymentBreakdownTable> | null>(null);

// CO items state (for Against CO invoice type)
const coItems = ref<any[]>([]);
const coItemsLoading = ref(false);
const coItemsError = ref<string | null>(null);
const coItemsKey = ref(0); // Key to force re-render of COItemsTableFromOriginal
const isUpdatingCOInvoiceItems = ref(false); // Guard flag to prevent infinite loops when syncing CO invoice items
const coAdvancePaid = ref<number>(0); // Total advance payments made for the selected CO
const coAdvancePaymentBreakdownRef = ref<InstanceType<typeof AdvancePaymentBreakdownTable> | null>(null);

// Adjusted advance payment amounts (keyed by advancePaymentUuid -> costCodeUuid -> adjustedAmount)
const adjustedAdvancePaymentAmounts = ref<Record<string, Record<string, number>>>({});

// Previously adjusted cost codes from the database (for display in the table)
interface PreviouslyAdjustedCostCode {
  cost_code_uuid: string;
  cost_code_label?: string;
  cost_code_number?: string;
  cost_code_name?: string;
  adjusted_amount: number;
  advance_payment_uuid: string;
}
const previouslyAdjustedCostCodes = ref<PreviouslyAdjustedCostCode[]>([]);

// Guard to prevent watcher from overwriting user input
const isUpdatingAdjustedAmounts = ref(false);

// Fetch previously adjusted cost codes for an existing invoice
const fetchPreviouslyAdjustedCostCodes = async (vendorInvoiceUuid: string, poOrCoUuid?: string, isCO = false) => {
  if (!vendorInvoiceUuid) {
    previouslyAdjustedCostCodes.value = [];
    return;
  }

  try {
    // Build query to fetch adjusted_advance_payment_cost_codes for this invoice
    const queryParams: Record<string, string> = {
      vendor_invoice_uuid: vendorInvoiceUuid,
    };
    
    if (poOrCoUuid) {
      if (isCO) {
        queryParams.change_order_uuid = poOrCoUuid;
      } else {
        queryParams.purchase_order_uuid = poOrCoUuid;
      }
    }

    const response = await $fetch<{ data: any[] }>('/api/adjusted-advance-payment-cost-codes', {
      query: queryParams,
    });

    const costCodes = Array.isArray(response?.data) ? response.data : [];
    previouslyAdjustedCostCodes.value = costCodes.map((cc: any) => ({
      cost_code_uuid: cc.cost_code_uuid,
      cost_code_label: cc.cost_code_label,
      cost_code_number: cc.cost_code_number,
      cost_code_name: cc.cost_code_name,
      adjusted_amount: parseFloat(String(cc.adjusted_amount)) || 0,
      advance_payment_uuid: cc.advance_payment_uuid,
    }));

    console.log('[VendorInvoiceForm] Fetched previously adjusted cost codes:', previouslyAdjustedCostCodes.value);
  } catch (err: any) {
    console.error('[VendorInvoiceForm] Error fetching previously adjusted cost codes:', err);
    previouslyAdjustedCostCodes.value = [];
  }
};

// Fetch ALL previously adjusted cost codes for a PO/CO (across all invoices)
// This is used for new invoices to show remaining amounts
const fetchAllPreviouslyAdjustedCostCodes = async (poOrCoUuid: string, isCO = false, excludeInvoiceUuid?: string) => {
  if (!poOrCoUuid) {
    previouslyAdjustedCostCodes.value = [];
    return;
  }

  try {
    const queryParams: Record<string, string> = {};
    
    if (isCO) {
      queryParams.change_order_uuid = poOrCoUuid;
    } else {
      queryParams.purchase_order_uuid = poOrCoUuid;
    }

    // Exclude current invoice if editing
    if (excludeInvoiceUuid) {
      queryParams.exclude_current_invoice = 'true';
      queryParams.vendor_invoice_uuid = excludeInvoiceUuid;
    }

    const response = await $fetch<{ data: any[] }>('/api/adjusted-advance-payment-cost-codes', {
      query: queryParams,
    });

    const costCodes = Array.isArray(response?.data) ? response.data : [];
    previouslyAdjustedCostCodes.value = costCodes.map((cc: any) => ({
      cost_code_uuid: cc.cost_code_uuid,
      cost_code_label: cc.cost_code_label,
      cost_code_number: cc.cost_code_number,
      cost_code_name: cc.cost_code_name,
      adjusted_amount: parseFloat(String(cc.adjusted_amount)) || 0,
      advance_payment_uuid: cc.advance_payment_uuid,
    }));

    console.log('[VendorInvoiceForm] Fetched all previously adjusted cost codes:', previouslyAdjustedCostCodes.value);
  } catch (err: any) {
    console.error('[VendorInvoiceForm] Error fetching all previously adjusted cost codes:', err);
    previouslyAdjustedCostCodes.value = [];
  }
};

// Watch for form changes to load adjusted amounts when editing
watch(
  () => props.form.adjusted_advance_payment_amounts,
  (newAmounts) => {
    console.log('[VendorInvoiceForm] adjusted_advance_payment_amounts prop changed:', newAmounts);
    
    // Skip if we're currently updating from user input (to prevent overwriting)
    if (isUpdatingAdjustedAmounts.value) {
      console.log('[VendorInvoiceForm] Skipping - currently updating from user input');
      return;
    }
    
    if (newAmounts && typeof newAmounts === 'object' && Object.keys(newAmounts).length > 0) {
      // Deep copy to ensure Vue reactivity works properly with nested objects
      const deepCopy = JSON.parse(JSON.stringify(newAmounts));
      adjustedAdvancePaymentAmounts.value = deepCopy;
      console.log('[VendorInvoiceForm] Updated adjustedAdvancePaymentAmounts:', adjustedAdvancePaymentAmounts.value);
    } else if (!newAmounts) {
      // Only reset if we don't have local values (preserve user input)
      if (Object.keys(adjustedAdvancePaymentAmounts.value).length === 0) {
        adjustedAdvancePaymentAmounts.value = {};
        console.log('[VendorInvoiceForm] Reset adjustedAdvancePaymentAmounts to empty');
      }
    }
  },
  { immediate: true, deep: true }
);

// Watch for form UUID and PO/CO changes to fetch previously adjusted cost codes
// This is needed to display what amounts were previously adjusted
watch(
  [() => props.form.uuid, () => props.form.purchase_order_uuid, () => props.form.change_order_uuid, () => props.form.invoice_type, () => props.editingInvoice],
  async ([newUuid, newPoUuid, newCoUuid, newInvoiceType, newEditingInvoice], [oldUuid]) => {
    // Only fetch for AGAINST_PO or AGAINST_CO invoices
    const invoiceType = String(newInvoiceType || '').toUpperCase();
    if (invoiceType !== 'AGAINST_PO' && invoiceType !== 'AGAINST_CO') {
      previouslyAdjustedCostCodes.value = [];
      return;
    }

    // Determine if this is a PO or CO invoice
    const isCO = invoiceType === 'AGAINST_CO';
    const poOrCoUuid = isCO ? newCoUuid : newPoUuid;

    if (!poOrCoUuid) {
      previouslyAdjustedCostCodes.value = [];
      return;
    }

    // For existing invoices, fetch adjustments for this specific invoice
    // For new invoices, fetch ALL adjustments for the PO/CO to show remaining amounts
    if (newUuid && newEditingInvoice) {
      // Existing invoice - fetch adjustments for this invoice only
      if (newUuid !== oldUuid || previouslyAdjustedCostCodes.value.length === 0) {
        await fetchPreviouslyAdjustedCostCodes(newUuid, poOrCoUuid, isCO);
      }
    } else {
      // New invoice - fetch ALL adjustments for the PO/CO to calculate remaining amounts
      await fetchAllPreviouslyAdjustedCostCodes(poOrCoUuid, isCO, newUuid);
    }
  },
  { immediate: true }
);

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

// Methods
const handleFormUpdate = (field: string, value: any) => {
  // Ensure deep cloning for nested arrays to trigger reactivity (same pattern as PurchaseOrderForm)
  const updatedForm = { ...props.form };
  
  if (field === 'line_items' && Array.isArray(value)) {
    // Always create a new array reference with deep-cloned items to ensure Vue tracks changes
    // This ensures that nested property changes (like unit_price, quantity, total) trigger reactivity
    updatedForm[field] = value.map((item: any) => ({
      ...item,
    }));
  } else if (field === 'po_invoice_items' && Array.isArray(value)) {
    // Always create a new array reference with deep-cloned items to ensure Vue tracks changes
    updatedForm[field] = value.map((item: any) => ({
      ...item,
    }));
  } else if (field === 'co_invoice_items' && Array.isArray(value)) {
    // Always create a new array reference with deep-cloned items to ensure Vue tracks changes
    updatedForm[field] = value.map((item: any) => ({
      ...item,
    }));
  } else if (field === 'advance_payment_cost_codes' && Array.isArray(value)) {
    // Always create a new array reference with deep-cloned items to ensure Vue tracks changes
    updatedForm[field] = value.map((item: any) => ({
      ...item,
    }));
  } else if (field === 'removed_advance_payment_cost_codes') {
    // Always create a new array reference with deep-cloned items to ensure Vue tracks changes
    const arrayValue = Array.isArray(value) ? value : []
    updatedForm[field] = arrayValue.map((item: any) => ({
      ...item,
    }));
  } else {
    updatedForm[field] = value;
  }
  
  emit('update:form', updatedForm);
};

const handleCorporationChange = async (corporationUuid?: string | null) => {
  const normalizedCorporationUuid = corporationUuid || '';
  handleFormUpdate('corporation_uuid', normalizedCorporationUuid);
  
  // Fetch data for the selected corporation
  // NOTE: We do NOT update corpStore.selectedCorporation here to avoid affecting other components
  // The form operates independently with its own corporation selection
  // All data fetching is scoped to the form's corporation, not TopBar's corporation
  if (normalizedCorporationUuid) {
    await Promise.allSettled([
      vendorStore.fetchVendors(normalizedCorporationUuid),
      projectsStore.fetchProjectsMetadata(normalizedCorporationUuid),
      // Note: vendorInvoicesStore.fetchVendorInvoices is scoped to TopBar's corporation
      // We don't fetch it here to avoid polluting the global store
      // The form will fetch vendor invoices directly from API when needed
      costCodeConfigurationsStore.fetchConfigurations(normalizedCorporationUuid, false, false),
      // Fetch PO/CO data for the form's corporation so POCOSelect can use it
      // This ensures POCOSelect shows data for the form's corporation, not TopBar's
      purchaseOrdersStore.fetchPurchaseOrders(normalizedCorporationUuid, true), // forceRefresh = true
      changeOrdersStore.fetchChangeOrders(normalizedCorporationUuid, true), // forceRefresh = true
    ]);
    
    // If project is already selected, ensure project resources are loaded
    // This uses purchaseOrderResourcesStore which is scoped to the form's corporation
    if (props.form.project_uuid) {
      await purchaseOrderResourcesStore.ensureProjectResources({
        corporationUuid: normalizedCorporationUuid,
        projectUuid: props.form.project_uuid,
      });
    }
  }
  
  // Auto-generate Invoice Number on corporation selection if not set
  if (normalizedCorporationUuid) {
    await generateInvoiceNumber();
  }
  
  // Clear project if corporation changes (project must belong to the selected corporation)
  // But skip this check if we're loading an existing invoice (project might not be in store yet)
  if (normalizedCorporationUuid && props.form.project_uuid && !props.form.uuid) {
    // Check if the current project belongs to the new corporation
    const projects = projectsStore.getProjectsMetadata(normalizedCorporationUuid);
    const currentProject = projects?.find((p: any) => p.uuid === props.form.project_uuid);
    if (!currentProject) {
      handleFormUpdate('project_uuid', null);
    }
  }
};

const handleProjectChange = async (projectUuid?: string | null) => {
  const normalizedProjectUuid = projectUuid || '';
  handleFormUpdate('project_uuid', normalizedProjectUuid);
  
  // Ensure project resources (cost codes, item types, preferred items) are loaded
  // This ensures POItemsTableWithEstimates has the data it needs
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (normalizedProjectUuid && corpUuid) {
    await purchaseOrderResourcesStore.ensureProjectResources({
      corporationUuid: corpUuid,
      projectUuid: normalizedProjectUuid,
    });
  }
};

const handleVendorChange = (value: any) => {
  const vendorUuid = typeof value === 'string' ? value : (value && typeof value === 'object' ? value.value : '');
  handleFormUpdate('vendor_uuid', vendorUuid || '');
};

const handlePOChange = async (value: any) => {
  // Extract UUID - handle both string and object formats
  let poUuid: string | null = null;
  
  if (typeof value === 'string') {
    poUuid = value || null;
  } else if (value && typeof value === 'object') {
    // Try different possible properties
    poUuid = value.value || value.uuid || value.id || null;
    
    // Also check if it's a purchaseOrder object
    if (!poUuid && value.purchaseOrder) {
      poUuid = value.purchaseOrder.uuid || value.purchaseOrder.value || null;
    }
  }
  
  // Update purchase_order_uuid - ensure it's a string or null, not empty string
  const finalPoUuid = poUuid && poUuid.trim() ? poUuid.trim() : null;
  handleFormUpdate('purchase_order_uuid', finalPoUuid);
  
  // Also update po_number if we have the purchase order object
  if (value && typeof value === 'object' && value.purchaseOrder) {
    handleFormUpdate('po_number', value.purchaseOrder.po_number || '');
  } else if (!finalPoUuid) {
    handleFormUpdate('po_number', '');
    poItems.value = [];
    poItemsError.value = null;
    return;
  }
  
  // Fetch PO items when PO is selected (for Against PO invoice type)
  // We fetch directly here to ensure it happens immediately, and the watcher will also handle it
  if (finalPoUuid && isAgainstPO.value) {
    await fetchPOItems(finalPoUuid);
  } else if (!finalPoUuid) {
    // Clear items if PO is cleared
    poItems.value = [];
    poItemsError.value = null;
    poItemsKey.value += 1; // Force re-render when clearing
  }
};


// Fetch previous invoice quantities for PO items (excluding current invoice)
const fetchPOPreviousInvoiceQuantities = async (poUuid: string, currentInvoiceUuid?: string | null): Promise<Map<string, number>> => {
  if (!poUuid) {
    return new Map();
  }
  
  try {
    // Fetch all vendor invoices for this PO (excluding current invoice if editing)
    const invoicesResponse = await $fetch<{ data: any[] }>(`/api/vendor-invoices?corporation_uuid=${props.form.corporation_uuid || corpStore.selectedCorporation?.uuid || ''}`);
    const allInvoices = Array.isArray(invoicesResponse?.data) ? invoicesResponse.data : [];
    
    // Filter invoices for this PO, excluding current invoice
    const poInvoices = allInvoices.filter((inv: any) => 
      inv.purchase_order_uuid === poUuid && 
      inv.invoice_type === 'AGAINST_PO' &&
      inv.is_active === true &&
      (!currentInvoiceUuid || inv.uuid !== currentInvoiceUuid)
    );
    
    // Fetch invoice items for all these invoices
    const invoiceQuantitiesMap = new Map<string, number>();
    
    for (const invoice of poInvoices) {
      if (invoice.uuid) {
        try {
          const invoiceResponse = await $fetch<{ data: any }>(`/api/vendor-invoices/${invoice.uuid}`);
          const invoiceData = invoiceResponse?.data;
          if (invoiceData?.po_invoice_items && Array.isArray(invoiceData.po_invoice_items)) {
            invoiceData.po_invoice_items.forEach((item: any) => {
              if (item.po_item_uuid && item.invoice_quantity !== null && item.invoice_quantity !== undefined) {
                const currentTotal = invoiceQuantitiesMap.get(item.po_item_uuid) || 0;
                const quantity = parseFloat(String(item.invoice_quantity)) || 0;
                invoiceQuantitiesMap.set(item.po_item_uuid, currentTotal + quantity);
              }
            });
          }
        } catch (error) {
          console.warn(`[VendorInvoiceForm] Failed to fetch invoice items for invoice ${invoice.uuid}:`, error);
        }
      }
    }
    
    return invoiceQuantitiesMap;
  } catch (error) {
    console.warn('[VendorInvoiceForm] Failed to fetch previous PO invoice quantities:', error);
    return new Map();
  }
};

// Fetch previous invoice quantities for CO items (excluding current invoice)
const fetchCOPreviousInvoiceQuantities = async (coUuid: string, currentInvoiceUuid?: string | null): Promise<Map<string, number>> => {
  if (!coUuid) {
    return new Map();
  }
  
  try {
    // Fetch all vendor invoices for this CO (excluding current invoice if editing)
    const invoicesResponse = await $fetch<{ data: any[] }>(`/api/vendor-invoices?corporation_uuid=${props.form.corporation_uuid || corpStore.selectedCorporation?.uuid || ''}`);
    const allInvoices = Array.isArray(invoicesResponse?.data) ? invoicesResponse.data : [];
    
    // Filter invoices for this CO, excluding current invoice
    const coInvoices = allInvoices.filter((inv: any) => 
      inv.change_order_uuid === coUuid && 
      inv.invoice_type === 'AGAINST_CO' &&
      inv.is_active === true &&
      (!currentInvoiceUuid || inv.uuid !== currentInvoiceUuid)
    );
    
    // Fetch invoice items for all these invoices
    const invoiceQuantitiesMap = new Map<string, number>();
    
    for (const invoice of coInvoices) {
      if (invoice.uuid) {
        try {
          const invoiceResponse = await $fetch<{ data: any }>(`/api/vendor-invoices/${invoice.uuid}`);
          const invoiceData = invoiceResponse?.data;
          if (invoiceData?.co_invoice_items && Array.isArray(invoiceData.co_invoice_items)) {
            invoiceData.co_invoice_items.forEach((item: any) => {
              if (item.co_item_uuid && item.invoice_quantity !== null && item.invoice_quantity !== undefined) {
                const currentTotal = invoiceQuantitiesMap.get(item.co_item_uuid) || 0;
                const quantity = parseFloat(String(item.invoice_quantity)) || 0;
                invoiceQuantitiesMap.set(item.co_item_uuid, currentTotal + quantity);
              }
            });
          }
        } catch (error) {
          console.warn(`[VendorInvoiceForm] Failed to fetch invoice items for invoice ${invoice.uuid}:`, error);
        }
      }
    }
    
    return invoiceQuantitiesMap;
  } catch (error) {
    console.warn('[VendorInvoiceForm] Failed to fetch previous CO invoice quantities:', error);
    return new Map();
  }
};

// Fetch PO items and financial breakdown
const fetchPOItems = async (poUuid: string) => {
  if (!poUuid) {
    poItems.value = [];
    return;
  }
  
  poItemsLoading.value = true;
  poItemsError.value = null;
  
  try {
    // Ensure project resources (cost codes, item types, preferred items) are loaded
    // This ensures POItemsTableWithEstimates has the data it needs for cost code, item type, sequence, and item selects
    const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
    if (corpUuid && props.form.project_uuid) {
      await purchaseOrderResourcesStore.ensureProjectResources({
        corporationUuid: corpUuid,
        projectUuid: props.form.project_uuid,
      });
    }
    
    // Fetch previous invoice quantities
    const previousInvoiceQuantities = await fetchPOPreviousInvoiceQuantities(poUuid, props.form.uuid);
    
    // Fetch both PO items and PO details (for financial breakdown)
    // Try purchase-order-forms first, then fallback to purchase-orders
    let poResponse: { data: any } | null = null;
    try {
      poResponse = await $fetch<{ data: any }>(`/api/purchase-order-forms/${poUuid}`);
    } catch (error1) {
      console.warn('[VendorInvoiceForm] Failed to fetch from purchase-order-forms, trying purchase-orders:', error1);
      try {
        const response = await $fetch<{ data: any }>(`/api/purchase-orders?uuid=${poUuid}`);
        poResponse = response;
      } catch (error2) {
        console.warn('[VendorInvoiceForm] Failed to fetch from purchase-orders:', error2);
      }
    }
    
    const itemsResponse = await $fetch<{ data: any[] }>(`/api/purchase-order-items?purchase_order_uuid=${poUuid}`);
    const items = Array.isArray(itemsResponse?.data) ? itemsResponse.data : [];
    
    // Check if we have saved invoice items for this invoice
    let savedInvoiceItems: any[] = [];
    if (props.form.uuid && props.form.po_invoice_items && Array.isArray(props.form.po_invoice_items)) {
      savedInvoiceItems = props.form.po_invoice_items;
    }
    
    // Create a map of saved invoice items by po_item_uuid for quick lookup
    const invoiceItemsMap = new Map<string, any>();
    savedInvoiceItems.forEach((invoiceItem: any) => {
      if (invoiceItem.po_item_uuid) {
        invoiceItemsMap.set(invoiceItem.po_item_uuid, invoiceItem);
      }
    });
    
    // Get preferred items for populating options (sequence and item selects)
    const preferredItems = preferredItemOptions.value;
    const preferredItemOptionMap = new Map<string, any>();
    preferredItems.forEach((opt) => {
      preferredItemOptionMap.set(String(opt.value), opt);
    });
    
    // Map items to the format expected by POItemsTableWithEstimates
    const mappedItems = items.map((item: any, index: number) => {
      const poItemUuid = item.uuid;
      const savedInvoiceItem = invoiceItemsMap.get(poItemUuid);
      
      // Extract sequence from multiple sources (similar to PurchaseOrderForm)
      // Check both metadata (JSONB from DB) and display_metadata (computed/display)
      const display = item?.display_metadata || item?.metadata || {};
      
      // Extract sequence - check multiple sources
      let sequenceValue = 
        display.sequence || 
        item.sequence || 
        item.item_sequence || 
        item.sequence_uuid || 
        '';
      
      // If no sequence found and we have item_uuid, lookup from preferred items
      if (!sequenceValue && item.item_uuid) {
        const matchedItem = preferredItemOptionMap.get(String(item.item_uuid));
        if (matchedItem?.item_sequence) {
          sequenceValue = matchedItem.item_sequence;
        } else if (matchedItem?.sequence) {
          sequenceValue = matchedItem.sequence;
        } else if (matchedItem?.raw?.item_sequence) {
          sequenceValue = matchedItem.raw.item_sequence;
        }
      }
      
      // Build options array - use item.options from API if available, otherwise build from preferred items
      // Include the current item if it's not in preferred items (for saved items)
      let options: any[] = [];
      if (item.options && Array.isArray(item.options) && item.options.length > 0) {
        // Use options from API response if available
        options = item.options;
      } else {
        // Fall back to building from preferred items
        options = [...preferredItems];
        if (item.item_uuid && !preferredItemOptionMap.has(String(item.item_uuid))) {
          // Add the current item to options if it's not in the preferred items list
          // This ensures the select components can display the saved item
          const resolvedItemName = item.description || item.item_name || item.name || String(item.item_uuid);
          const resolvedSequence = sequenceValue || item.sequence || item.item_sequence || '';
          options.push({
            label: resolvedItemName,
            value: String(item.item_uuid),
            uuid: String(item.item_uuid),
            item_uuid: String(item.item_uuid),
            item_name: resolvedItemName,
            name: resolvedItemName,
            item_sequence: resolvedSequence,
            sequence: resolvedSequence,
            raw: item,
          });
        }
      }
      
      return {
      id: item.uuid || item.id || `po-item-${index}`,
        po_item_uuid: poItemUuid, // Store reference to original PO item for saving
      cost_code_uuid: item.cost_code_uuid || null,
      cost_code_label: item.cost_code_label || 
        (item.cost_code_number && item.cost_code_name 
          ? `${item.cost_code_number} ${item.cost_code_name}`.trim()
          : null),
      cost_code_number: item.cost_code_number || '',
      cost_code_name: item.cost_code_name || '',
      item_type_uuid: item.item_type_uuid || null,
      item_type_label: item.item_type_label || '',
      sequence: sequenceValue, // Include sequence for SequenceSelect
      item_sequence: sequenceValue, // Also include as item_sequence for compatibility
      item_uuid: item.item_uuid || null,
      description: item.description || '',
      model_number: item.model_number || '',
      location_uuid: item.location_uuid || null,
      location: item.location || '',
      unit_uuid: item.unit_uuid || null,
      unit_label: item.unit_label || item.unit || '',
      quantity: item.quantity || null,
      unit_price: item.unit_price || null,
      total: item.total || null,
      po_unit_price: item.po_unit_price || item.unit_price || null,
      po_quantity: item.po_quantity || item.quantity || null,
      po_total: item.po_total || item.total || null,
        // For new invoices: show empty fields (null)
        // For existing invoices: 
        //   - If savedInvoiceItem exists: use its values (even if null/undefined)
        //   - If savedInvoiceItems exist but no match: use null (empty field)
        //   - If no savedInvoiceItems at all: fall back to PO values
        invoice_unit_price: props.form.uuid 
          ? (savedInvoiceItem 
              ? (savedInvoiceItem.invoice_unit_price !== undefined ? savedInvoiceItem.invoice_unit_price : null)
              : (savedInvoiceItems.length > 0 ? null : (item.po_unit_price ?? item.unit_price ?? null)))
          : null,
        invoice_quantity: props.form.uuid 
          ? (savedInvoiceItem 
              ? (savedInvoiceItem.invoice_quantity !== undefined ? savedInvoiceItem.invoice_quantity : null)
              : (savedInvoiceItems.length > 0 ? null : (item.po_quantity ?? item.quantity ?? null)))
          : null,
        invoice_total: props.form.uuid 
          ? (savedInvoiceItem 
              ? (savedInvoiceItem.invoice_total !== undefined ? savedInvoiceItem.invoice_total : null)
              : (savedInvoiceItems.length > 0 ? null : (item.po_total ?? item.total ?? null)))
          : null,
      // Calculate "to be invoiced" quantity: PO quantity - sum of previously invoiced quantities
      to_be_invoiced: (() => {
        const poQty = parseFloat(String(item.po_quantity ?? item.quantity ?? 0)) || 0;
        const previouslyInvoiced = previousInvoiceQuantities.get(poItemUuid) || 0;
        const result = Math.max(0, poQty - previouslyInvoiced);
        return result;
      })(),
      approval_checks: props.form.uuid && savedInvoiceItem
        ? (savedInvoiceItem.approval_checks || [])
        : (item.approval_checks || item.approval_checks_uuids || []),
      options: options // Use options from API if available, otherwise from preferred items
      };
    });
    
    // Set loading to false BEFORE setting items to ensure component is ready
    poItemsLoading.value = false;
    
    // Wait for next tick to ensure component state is updated
    await nextTick();
    
    // Create a completely new array with new object references to ensure Vue reactivity
    poItems.value = mappedItems.map(item => ({ ...item }));
    
    // Immediately sync poItems to form.po_invoice_items for saving
    // This ensures the data is available even if the watcher hasn't fired yet
    if (isAgainstPO.value && poItems.value.length > 0) {
      const poInvoiceItems = poItems.value.map((item: any, index: number) => ({
        order_index: index,
        po_item_uuid: item.po_item_uuid || item.id || null,
        cost_code_uuid: item.cost_code_uuid || null,
        cost_code_label: item.cost_code_label || null,
        cost_code_number: item.cost_code_number || '',
        cost_code_name: item.cost_code_name || '',
        division_name: item.division_name || null,
        item_type_uuid: item.item_type_uuid || null,
        item_type_label: item.item_type_label || '',
        item_uuid: item.item_uuid || null,
        item_name: item.item_name || item.description || '',
        description: item.description || '',
        model_number: item.model_number || '',
        location_uuid: item.location_uuid || null,
        location_label: item.location || item.location_label || null,
        unit_uuid: item.unit_uuid || null,
        unit_label: item.unit_label || '',
        // Use the invoice values from the mapped items (which are already set correctly based on new vs existing invoice)
        invoice_quantity: item.invoice_quantity !== undefined ? item.invoice_quantity : null,
        invoice_unit_price: item.invoice_unit_price !== undefined ? item.invoice_unit_price : null,
        invoice_total: item.invoice_total !== undefined ? item.invoice_total : null,
        approval_checks: item.approval_checks || [],
        metadata: item.metadata || {}
      }));
      
      // Update form with po_invoice_items
      isUpdatingPOInvoiceItems.value = true;
      try {
        handleFormUpdate('po_invoice_items', poInvoiceItems);
      } finally {
        await nextTick();
        isUpdatingPOInvoiceItems.value = false;
      }
    }
    
    // Fetch advance payment invoices for this PO to calculate amount without taxes
    // If viewing an existing invoice, include advance payments adjusted against it
    try {
      const queryParams: Record<string, string> = {};
      if (props.form.uuid) {
        queryParams.currentInvoiceUuid = props.form.uuid;
      }
      const advancePaymentsResponse = await $fetch<{ data: any[] }>(
        `/api/purchase-orders/${poUuid}/advance-payments`,
        { query: queryParams }
      );
      
      const advancePayments = Array.isArray(advancePaymentsResponse?.data) ? advancePaymentsResponse.data : [];
      
      // Calculate total advance paid without taxes
      const totalWithoutTaxes = advancePayments.reduce((sum, payment) => {
        const totalAmount = parseFloat(payment.amount || '0') || 0;
        
        // Get tax total from financial_breakdown
        let taxTotal = 0;
        if (payment.financial_breakdown) {
          try {
            let breakdown = payment.financial_breakdown;
            if (typeof breakdown === 'string') {
              breakdown = JSON.parse(breakdown);
            }
            const totals = breakdown?.totals || breakdown || {};
            if (breakdown?.sales_taxes) {
              const salesTaxes = breakdown.sales_taxes;
              const tax1 = parseFloat(salesTaxes.sales_tax_1?.amount || salesTaxes.salesTax1?.amount || '0') || 0;
              const tax2 = parseFloat(salesTaxes.sales_tax_2?.amount || salesTaxes.salesTax2?.amount || '0') || 0;
              taxTotal = tax1 + tax2;
            } else {
              taxTotal = parseFloat(totals.tax_total || totals.taxTotal || '0') || 0;
            }
          } catch (e) {
            // If parsing fails, use 0 for tax
          }
        }
        
        return sum + (totalAmount - taxTotal);
      }, 0);
      
      poAdvancePaid.value = totalWithoutTaxes;
    } catch (error) {
      console.warn('[VendorInvoiceForm] Failed to fetch advance payments:', error);
      poAdvancePaid.value = 0;
    }
    
    // Increment key to force component re-render
    poItemsKey.value += 1;
    
    // Force another tick to ensure the component receives the update and re-renders
    await nextTick();
    
    // Populate financial breakdown from PO if available
    if (poResponse?.data) {
      const po = poResponse.data;
      
      // Try to get financial breakdown from JSON field first
      let poFinancialBreakdown = po.financial_breakdown || po.financialBreakdown;
      
      // If financial_breakdown is a string, parse it
      if (typeof poFinancialBreakdown === 'string') {
        try {
          poFinancialBreakdown = JSON.parse(poFinancialBreakdown);
        } catch (e) {
          console.warn('[VendorInvoiceForm] Failed to parse financial_breakdown string:', e);
          poFinancialBreakdown = null;
        }
      }
      
      // If no financial breakdown JSON, build it from individual fields
      if (!poFinancialBreakdown || (typeof poFinancialBreakdown === 'object' && Object.keys(poFinancialBreakdown).length === 0)) {
        poFinancialBreakdown = {
          charges: {
            freight: {
              percentage: po.freight_charges_percentage ?? null,
              amount: po.freight_charges_amount ?? null,
              taxable: po.freight_charges_taxable ?? false
            },
            packing: {
              percentage: po.packing_charges_percentage ?? null,
              amount: po.packing_charges_amount ?? null,
              taxable: po.packing_charges_taxable ?? false
            },
            custom_duties: {
              percentage: po.custom_duties_percentage ?? null,
              amount: po.custom_duties_amount ?? null,
              taxable: po.custom_duties_taxable ?? false
            },
            other: {
              percentage: po.other_charges_percentage ?? null,
              amount: po.other_charges_amount ?? null,
              taxable: po.other_charges_taxable ?? false
            }
          },
          sales_taxes: {
            sales_tax_1: {
              percentage: po.sales_tax_1_percentage ?? null,
              amount: po.sales_tax_1_amount ?? null
            },
            sales_tax_2: {
              percentage: po.sales_tax_2_percentage ?? null,
              amount: po.sales_tax_2_amount ?? null
            }
          },
          totals: {
            item_total: po.item_total ?? poItemsTotal.value ?? null,
            charges_total: po.charges_total ?? null,
            tax_total: po.tax_total ?? null,
            total_po_amount: po.total_po_amount ?? null
          }
        };
      }
      
      if (poFinancialBreakdown && typeof poFinancialBreakdown === 'object') {
        // For existing invoices, check if there's a saved financial breakdown
        // If there is, use the saved charges and taxes instead of PO values
        let savedFinancialBreakdown = null;
        if (props.form.uuid) {
          // This is an existing invoice - check for saved financial breakdown
          savedFinancialBreakdown = props.form.financial_breakdown;
          if (typeof savedFinancialBreakdown === 'string') {
            try {
              savedFinancialBreakdown = JSON.parse(savedFinancialBreakdown);
            } catch (e) {
              console.warn('[VendorInvoiceForm] Failed to parse saved financial_breakdown:', e);
              savedFinancialBreakdown = null;
            }
          }
        }
        
        // Use saved financial breakdown if available (for existing invoices with saved charges/taxes)
        // Otherwise, use PO financial breakdown (for new invoices or invoices without saved values)
        // Only use saved if it has charges or sales_taxes defined (not just totals)
        const hasSavedChargesOrTaxes = savedFinancialBreakdown && typeof savedFinancialBreakdown === 'object' && 
          (savedFinancialBreakdown.charges || savedFinancialBreakdown.sales_taxes);
        
        const sourceFinancialBreakdown = hasSavedChargesOrTaxes 
          ? savedFinancialBreakdown 
          : poFinancialBreakdown;
        
        // Deep clone the financial breakdown to avoid mutating the original
        const financialBreakdown = JSON.parse(JSON.stringify(sourceFinancialBreakdown));
        
        // Ensure the structure matches what FinancialBreakdown expects
        if (!financialBreakdown.charges) {
          financialBreakdown.charges = {
            freight: { percentage: null, amount: null, taxable: false },
            packing: { percentage: null, amount: null, taxable: false },
            custom_duties: { percentage: null, amount: null, taxable: false },
            other: { percentage: null, amount: null, taxable: false },
          };
        }
        
        if (!financialBreakdown.sales_taxes) {
          financialBreakdown.sales_taxes = {
            sales_tax_1: { percentage: null, amount: null },
            sales_tax_2: { percentage: null, amount: null },
          };
        }
        
        if (!financialBreakdown.totals) {
          financialBreakdown.totals = {
            item_total: null,
            charges_total: null,
            tax_total: null,
            total_po_amount: null,
          };
        }
        
        // Update totals with PO items total if not already set
        if (!financialBreakdown.totals.item_total && poItemsTotal.value > 0) {
          financialBreakdown.totals.item_total = poItemsTotal.value;
        }
        
        // DO NOT map total_po_amount to total_invoice_amount
        // total_invoice_amount should only be calculated from invoice item values + charges + taxes
        // The FinancialBreakdown component will calculate total_invoice_amount automatically
        // We keep total_po_amount for reference only
        
        // Flatten the financial breakdown structure for the form
        // The FinancialBreakdown component expects flat fields like freight_charges_percentage, etc.
        const updatedForm = { ...props.form };
        
        // Explicitly preserve purchase_order_uuid and other critical fields
        // IMPORTANT: Use the poUuid parameter passed to this function, not props.form.purchase_order_uuid
        // because props.form might not have been updated yet due to timing/reactivity
        const preservedFields = {
          purchase_order_uuid: poUuid || props.form.purchase_order_uuid || null,
          change_order_uuid: props.form.change_order_uuid,
          po_co_uuid: props.form.po_co_uuid,
          po_number: props.form.po_number,
          co_number: props.form.co_number,
          invoice_type: props.form.invoice_type,
          project_uuid: props.form.project_uuid,
          vendor_uuid: props.form.vendor_uuid,
        };
        
        // Update financial_breakdown object
        updatedForm.financial_breakdown = financialBreakdown;
        
        // Explicitly preserve critical fields - this ensures purchase_order_uuid is not lost
        Object.assign(updatedForm, preservedFields);
        
        // Flatten charge fields
        if (financialBreakdown.charges) {
          updatedForm.freight_charges_percentage = financialBreakdown.charges.freight?.percentage ?? null;
          updatedForm.freight_charges_amount = financialBreakdown.charges.freight?.amount ?? null;
          updatedForm.freight_charges_taxable = financialBreakdown.charges.freight?.taxable ?? false;
          
          updatedForm.packing_charges_percentage = financialBreakdown.charges.packing?.percentage ?? null;
          updatedForm.packing_charges_amount = financialBreakdown.charges.packing?.amount ?? null;
          updatedForm.packing_charges_taxable = financialBreakdown.charges.packing?.taxable ?? false;
          
          updatedForm.custom_duties_charges_percentage = financialBreakdown.charges.custom_duties?.percentage ?? null;
          updatedForm.custom_duties_charges_amount = financialBreakdown.charges.custom_duties?.amount ?? null;
          updatedForm.custom_duties_charges_taxable = financialBreakdown.charges.custom_duties?.taxable ?? false;
          
          updatedForm.other_charges_percentage = financialBreakdown.charges.other?.percentage ?? null;
          updatedForm.other_charges_amount = financialBreakdown.charges.other?.amount ?? null;
          updatedForm.other_charges_taxable = financialBreakdown.charges.other?.taxable ?? false;
        }
        
        // Flatten sales tax fields
        if (financialBreakdown.sales_taxes) {
          updatedForm.sales_tax_1_percentage = financialBreakdown.sales_taxes.sales_tax_1?.percentage ?? null;
          updatedForm.sales_tax_1_amount = financialBreakdown.sales_taxes.sales_tax_1?.amount ?? null;
          
          updatedForm.sales_tax_2_percentage = financialBreakdown.sales_taxes.sales_tax_2?.percentage ?? null;
          updatedForm.sales_tax_2_amount = financialBreakdown.sales_taxes.sales_tax_2?.amount ?? null;
        }
        
        // Flatten totals fields
        if (financialBreakdown.totals) {
          updatedForm.item_total = financialBreakdown.totals.item_total ?? null;
          updatedForm.charges_total = financialBreakdown.totals.charges_total ?? null;
          updatedForm.tax_total = financialBreakdown.totals.tax_total ?? null;
        }
        
        // For existing invoices (Against PO):
        // Since we fetched advance payment BEFORE building financial breakdown,
        // the FinancialBreakdown component will automatically recalculate with:
        // - item_total (from saved invoice values via poItemsTotal)
        // - charges and taxes (from saved financial breakdown)
        // - current advance payment (poAdvancePaid - fetched above)
        // - current holdback (poHoldbackAmount)
        // So we don't need to clear or manipulate the amount - just let it flow naturally
        
        updatedForm.financial_breakdown = financialBreakdown
        
        // Emit the complete updated form with all flattened fields
        emit('update:form', updatedForm);
      } else {
        console.warn('[VendorInvoiceForm] No valid financial breakdown found in PO');
      }
    } else {
      console.warn('[VendorInvoiceForm] No PO data received from API');
    }
  } catch (error) {
    console.error('[VendorInvoiceForm] Error fetching PO items:', error);
    poItemsError.value = 'Failed to load purchase order items';
    poItems.value = [];
    poItemsLoading.value = false;
  }
};

// Reset advance paid when PO changes
watch(
  () => props.form.purchase_order_uuid,
  (newPoUuid, oldPoUuid) => {
    if (newPoUuid !== oldPoUuid) {
      poAdvancePaid.value = 0;
    }
  }
);

// Fetch CO items and financial breakdown
const fetchCOItems = async (coUuid: string) => {
  if (!coUuid) {
    coItems.value = [];
    return;
  }
  
  coItemsLoading.value = true;
  coItemsError.value = null;
  
  // Fetch advance payment invoices for this CO to calculate amount without taxes
  // This ensures coAdvancePaid is set before FinancialBreakdown calculates totals
  // If viewing an existing invoice, include advance payments adjusted against it
  try {
    const queryParams: Record<string, string> = {};
    if (props.form.uuid) {
      queryParams.currentInvoiceUuid = props.form.uuid;
    }
    const advancePaymentsResponse = await $fetch<{ data: any[] }>(
      `/api/change-orders/${coUuid}/advance-payments`,
      { query: queryParams }
    );
    
    const advancePayments = Array.isArray(advancePaymentsResponse?.data) ? advancePaymentsResponse.data : [];
    
    // Calculate total advance paid without taxes
    const totalWithoutTaxes = advancePayments.reduce((sum, payment) => {
      const totalAmount = parseFloat(payment.amount || '0') || 0;
      
      // Get tax total from financial_breakdown
      let taxTotal = 0;
      if (payment.financial_breakdown) {
        try {
          let breakdown = payment.financial_breakdown;
          if (typeof breakdown === 'string') {
            breakdown = JSON.parse(breakdown);
          }
          const totals = breakdown?.totals || breakdown || {};
          if (breakdown?.sales_taxes) {
            const salesTaxes = breakdown.sales_taxes;
            const tax1 = parseFloat(salesTaxes.sales_tax_1?.amount || salesTaxes.salesTax1?.amount || '0') || 0;
            const tax2 = parseFloat(salesTaxes.sales_tax_2?.amount || salesTaxes.salesTax2?.amount || '0') || 0;
            taxTotal = tax1 + tax2;
          } else {
            taxTotal = parseFloat(totals.tax_total || totals.taxTotal || '0') || 0;
          }
        } catch (e) {
          // If parsing fails, use 0 for tax
        }
      }
      
      return sum + (totalAmount - taxTotal);
    }, 0);
    
    coAdvancePaid.value = totalWithoutTaxes;
  } catch (error) {
    console.warn('[VendorInvoiceForm] Failed to fetch CO advance payments:', error);
    coAdvancePaid.value = 0;
  }
  
  try {
    // Fetch previous invoice quantities
    const previousInvoiceQuantities = await fetchCOPreviousInvoiceQuantities(coUuid, props.form.uuid);
    
    // Fetch both CO items and CO details (for financial breakdown)
    const coResponse = await $fetch<{ data: any }>(`/api/change-orders/${coUuid}`);
    const itemsResponse = await $fetch<{ data: any[] }>(`/api/change-order-items?change_order_uuid=${coUuid}`);
    const items = Array.isArray(itemsResponse?.data) ? itemsResponse.data : [];
    
    // Check if we have saved invoice items for this invoice
    let savedInvoiceItems: any[] = [];
    if (props.form.uuid && props.form.co_invoice_items && Array.isArray(props.form.co_invoice_items)) {
      savedInvoiceItems = props.form.co_invoice_items;
    }
    
    // Create a map of saved invoice items by co_item_uuid for quick lookup
    const invoiceItemsMap = new Map<string, any>();
    savedInvoiceItems.forEach((invoiceItem: any) => {
      if (invoiceItem.co_item_uuid) {
        invoiceItemsMap.set(invoiceItem.co_item_uuid, invoiceItem);
      }
    });
    
    // Map items to the format expected by COItemsTableFromOriginal
    // Original values: unit_price, quantity, total (from PO)
    // CO values: co_unit_price, co_quantity, co_total
    // Invoice values: invoice_unit_price, invoice_quantity, invoice_total
    const mappedItems = items.map((item: any, index: number) => {
      const coItemUuid = item.uuid;
      const savedInvoiceItem = invoiceItemsMap.get(coItemUuid);
      
      // Extract metadata (cost code info might be in metadata)
      const metadata = item.metadata || item.display_metadata || item.displayMetadata || {};
      
      // Fetch sequence from cost code configurations store using item_uuid (similar to ChangeOrderForm)
      const itemUuid = item.item_uuid || null;
      const itemFromStore = itemUuid ? costCodeConfigurationsStore.getItemById(itemUuid) : null;
      const sequence = itemFromStore?.item_sequence || item.item_sequence || item.sequence || null;
      
      // Get cost code UUID from item or metadata
      const costCodeUuid = item.cost_code_uuid || metadata.cost_code_uuid || null;
      
      // Fetch cost code information from the cost code configurations store using cost_code_uuid
      // This is the primary source of truth for cost code information
      let costCodeNumber = '';
      let costCodeName = '';
      let costCodeLabel = null;
      
      if (costCodeUuid) {
        const costCodeConfig = costCodeConfigurationsStore.getConfigurationById(costCodeUuid);
        if (costCodeConfig) {
          // Use store values as primary source
          costCodeNumber = costCodeConfig.cost_code_number || '';
          costCodeName = costCodeConfig.cost_code_name || '';
          // Construct label from number + name
          costCodeLabel = [costCodeNumber, costCodeName].filter(Boolean).join(' ').trim() || null;
        }
      }
      
      // Fallback to item/metadata values if store doesn't have them
      if (!costCodeNumber) {
        costCodeNumber = item.cost_code_number || metadata.cost_code_number || '';
      }
      if (!costCodeName) {
        costCodeName = item.cost_code_name || metadata.cost_code_name || '';
      }
      if (!costCodeLabel) {
        // Construct cost_code_label from item/metadata or constructed from number + name
        costCodeLabel = item.cost_code_label || 
          metadata.cost_code_label || 
          metadata.cost_code ||
          [costCodeNumber, costCodeName].filter(Boolean).join(' ').trim() ||
          null;
      }
      
      return {
        id: item.uuid || item.id || `co-item-${index}`,
        co_item_uuid: coItemUuid, // Store reference to original CO item for saving
        cost_code_uuid: costCodeUuid,
        cost_code_label: costCodeLabel,
        cost_code_number: costCodeNumber,
        cost_code_name: costCodeName,
        item_type_uuid: item.item_type_uuid || null,
        item_type_label: item.item_type_label || '',
        item_uuid: itemUuid,
        name: item.item_name || item.name || item.description || '',
        description: item.description || '',
        model_number: item.model_number || '',
        sequence: sequence,
        location_uuid: item.location_uuid || null,
        location: item.location_label || item.location || '',
        unit_uuid: item.unit_uuid || null,
        unit_label: item.unit_label || item.unit || '',
        // Original values (from PO)
        unit_price: item.unit_price || null,
        quantity: item.quantity || null,
        total: item.total || null,
        // CO values
        co_unit_price: item.co_unit_price || null,
        co_quantity: item.co_quantity || null,
        co_total: item.co_total || null,
        // For new invoices: show empty fields (null)
        // For existing invoices: 
        //   - If savedInvoiceItem exists: use its values (even if null/undefined)
        //   - If savedInvoiceItems exist but no match: use null (empty field)
        //   - If no savedInvoiceItems at all: fall back to CO values
        invoice_unit_price: props.form.uuid 
          ? (savedInvoiceItem 
              ? (savedInvoiceItem.invoice_unit_price !== undefined ? savedInvoiceItem.invoice_unit_price : null)
              : (savedInvoiceItems.length > 0 ? null : (item.co_unit_price ?? null)))
          : null,
        invoice_quantity: props.form.uuid 
          ? (savedInvoiceItem 
              ? (savedInvoiceItem.invoice_quantity !== undefined ? savedInvoiceItem.invoice_quantity : null)
              : (savedInvoiceItems.length > 0 ? null : (item.co_quantity ?? null)))
          : null,
        invoice_total: props.form.uuid 
          ? (savedInvoiceItem 
              ? (savedInvoiceItem.invoice_total !== undefined ? savedInvoiceItem.invoice_total : null)
              : (savedInvoiceItems.length > 0 ? null : (item.co_total ?? null)))
          : null,
        // Calculate "to be invoiced" quantity: CO quantity - sum of previously invoiced quantities
        to_be_invoiced: (() => {
          const coQty = parseFloat(String(item.co_quantity ?? 0)) || 0;
          const previouslyInvoiced = previousInvoiceQuantities.get(coItemUuid) || 0;
          const result = Math.max(0, coQty - previouslyInvoiced);
          return result;
        })(),
        approval_checks: item.approval_checks || [],
        options: item.options || []
      };
    });
    
    // Set loading to false BEFORE setting items to ensure component is ready
    coItemsLoading.value = false;
    
    // Wait for next tick to ensure component state is updated
    await nextTick();
    
    // Create a completely new array with new object references to ensure Vue reactivity
    coItems.value = mappedItems.map(item => ({ ...item }));
    
    // Immediately sync coItems to form.co_invoice_items for saving
    // This ensures the data is available even if the watcher hasn't fired yet
    if (isAgainstCO.value && coItems.value.length > 0) {
      const coInvoiceItems = coItems.value.map((item: any, index: number) => ({
        order_index: index,
        co_item_uuid: item.co_item_uuid || item.id || null,
        cost_code_uuid: item.cost_code_uuid || null,
        cost_code_label: item.cost_code_label || null,
        cost_code_number: item.cost_code_number || '',
        cost_code_name: item.cost_code_name || '',
        division_name: item.division_name || null,
        item_type_uuid: item.item_type_uuid || null,
        item_type_label: item.item_type_label || '',
        item_uuid: item.item_uuid || null,
        item_name: item.item_name || item.name || item.description || '',
        description: item.description || '',
        model_number: item.model_number || '',
        location_uuid: item.location_uuid || null,
        location_label: item.location || item.location_label || null,
        unit_uuid: item.unit_uuid || null,
        unit_label: item.unit_label || '',
        // Use the invoice values from the mapped items (which are already set correctly based on new vs existing invoice)
        invoice_quantity: item.invoice_quantity !== undefined ? item.invoice_quantity : null,
        invoice_unit_price: item.invoice_unit_price !== undefined ? item.invoice_unit_price : null,
        invoice_total: item.invoice_total !== undefined ? item.invoice_total : null,
        metadata: item.metadata || {}
      }));
      
      // Update form with co_invoice_items
      isUpdatingCOInvoiceItems.value = true;
      try {
        handleFormUpdate('co_invoice_items', coInvoiceItems);
      } finally {
        await nextTick();
        isUpdatingCOInvoiceItems.value = false;
      }
    }
    
    // Increment key to force component re-render
    coItemsKey.value += 1;
    
    // Force another tick to ensure the component receives the update and re-renders
    await nextTick();
    
    // Populate financial breakdown from CO if available
    if (coResponse?.data) {
      const co = coResponse.data;
      
      // Try to get financial breakdown from JSON field first
      let coFinancialBreakdown = co.financial_breakdown || co.financialBreakdown;
      
      // If financial_breakdown is a string, parse it
      if (typeof coFinancialBreakdown === 'string') {
        try {
          coFinancialBreakdown = JSON.parse(coFinancialBreakdown);
        } catch (e) {
          console.warn('[VendorInvoiceForm] Failed to parse financial_breakdown string:', e);
          coFinancialBreakdown = null;
        }
      }
      
      // If no financial breakdown JSON, build it from individual fields
      if (!coFinancialBreakdown || (typeof coFinancialBreakdown === 'object' && Object.keys(coFinancialBreakdown).length === 0)) {
        coFinancialBreakdown = {
          charges: {
            freight: {
              percentage: co.freight_charges_percentage ?? null,
              amount: co.freight_charges_amount ?? null,
              taxable: co.freight_charges_taxable ?? false
            },
            packing: {
              percentage: co.packing_charges_percentage ?? null,
              amount: co.packing_charges_amount ?? null,
              taxable: co.packing_charges_taxable ?? false
            },
            custom_duties: {
              percentage: co.custom_duties_charges_percentage ?? null,
              amount: co.custom_duties_charges_amount ?? null,
              taxable: co.custom_duties_charges_taxable ?? false
            },
            other: {
              percentage: co.other_charges_percentage ?? null,
              amount: co.other_charges_amount ?? null,
              taxable: co.other_charges_taxable ?? false
            }
          },
          sales_taxes: {
            sales_tax_1: {
              percentage: co.sales_tax_1_percentage ?? null,
              amount: co.sales_tax_1_amount ?? null
            },
            sales_tax_2: {
              percentage: co.sales_tax_2_percentage ?? null,
              amount: co.sales_tax_2_amount ?? null
            }
          },
          totals: {
            // Always use invoice values (coItemsTotal) instead of CO values (co.item_total)
            // coItemsTotal is calculated from invoice_unit_price * invoice_quantity
            item_total: coItemsTotal.value ?? null,
            charges_total: co.charges_total ?? null,
            tax_total: co.tax_total ?? null,
            total_co_amount: co.total_co_amount ?? null
          }
        };
      }
      
      if (coFinancialBreakdown && typeof coFinancialBreakdown === 'object') {
        // For existing invoices, check if there's a saved financial breakdown
        // If there is, use the saved charges and taxes instead of CO values
        let savedFinancialBreakdown = null;
        if (props.form.uuid) {
          // This is an existing invoice - check for saved financial breakdown
          savedFinancialBreakdown = props.form.financial_breakdown;
          if (typeof savedFinancialBreakdown === 'string') {
            try {
              savedFinancialBreakdown = JSON.parse(savedFinancialBreakdown);
            } catch (e) {
              console.warn('[VendorInvoiceForm] Failed to parse saved financial_breakdown:', e);
              savedFinancialBreakdown = null;
            }
          }
        }
        
        // Use saved financial breakdown if available (for existing invoices with saved charges/taxes)
        // Otherwise, use CO financial breakdown (for new invoices or invoices without saved values)
        // Only use saved if it has charges or sales_taxes defined (not just totals)
        const hasSavedChargesOrTaxes = savedFinancialBreakdown && typeof savedFinancialBreakdown === 'object' && 
          (savedFinancialBreakdown.charges || savedFinancialBreakdown.sales_taxes);
        
        // If we have saved financial breakdown with charges/taxes, use it
        // Otherwise, use CO financial breakdown
        let sourceFinancialBreakdown = coFinancialBreakdown;
        if (hasSavedChargesOrTaxes) {
          sourceFinancialBreakdown = savedFinancialBreakdown;
        }
        
        // Deep clone the financial breakdown to avoid mutating the original
        const financialBreakdown = JSON.parse(JSON.stringify(sourceFinancialBreakdown));
        
        // If we're using saved financial breakdown, ensure we preserve all saved totals
        // Merge in any missing structure from CO breakdown, but preserve saved values
        if (hasSavedChargesOrTaxes && coFinancialBreakdown) {
          // Ensure we have the full structure, but preserve saved values
          if (!financialBreakdown.totals && coFinancialBreakdown.totals) {
            financialBreakdown.totals = { ...coFinancialBreakdown.totals };
          } else if (financialBreakdown.totals && coFinancialBreakdown.totals) {
            // Merge: saved totals take precedence, but fill in missing fields from CO
            financialBreakdown.totals = {
              ...coFinancialBreakdown.totals,
              ...financialBreakdown.totals, // Saved totals override CO totals
            };
          }
        }
        
        // Ensure the structure matches what FinancialBreakdown expects
        if (!financialBreakdown.charges) {
          financialBreakdown.charges = {
            freight: { percentage: null, amount: null, taxable: false },
            packing: { percentage: null, amount: null, taxable: false },
            custom_duties: { percentage: null, amount: null, taxable: false },
            other: { percentage: null, amount: null, taxable: false },
          };
        }
        
        if (!financialBreakdown.sales_taxes) {
          financialBreakdown.sales_taxes = {
            sales_tax_1: { percentage: null, amount: null },
            sales_tax_2: { percentage: null, amount: null },
          };
        }
        
        if (!financialBreakdown.totals) {
          financialBreakdown.totals = {
            item_total: null,
            charges_total: null,
            tax_total: null,
            total_co_amount: null,
          };
        }
        
        // Update totals with CO items total (from invoice values) if not already set
        // For existing invoices with saved financial breakdown, preserve the saved totals
        // For new invoices or invoices without saved totals, use coItemsTotal
        // coItemsTotal is calculated from invoice_unit_price * invoice_quantity (or invoice_total)
        if (hasSavedChargesOrTaxes && financialBreakdown.totals.item_total !== null && financialBreakdown.totals.item_total !== undefined) {
          // Preserve saved item_total from the invoice's financial breakdown
          // Don't overwrite it
        } else if (!financialBreakdown.totals.item_total && coItemsTotal.value > 0) {
          // Only update if not already set and we have invoice items total
          financialBreakdown.totals.item_total = coItemsTotal.value;
        }
        
        // DO NOT map total_co_amount to total_invoice_amount
        // total_invoice_amount should only be calculated from invoice item values + charges + taxes
        // The FinancialBreakdown component will calculate total_invoice_amount automatically
        // We keep total_co_amount for reference only
        
        // Flatten the financial breakdown structure for the form
        const updatedForm = { ...props.form };
        
        // Explicitly preserve change_order_uuid and other critical fields
        const preservedFields = {
          change_order_uuid: coUuid || props.form.change_order_uuid || null,
          purchase_order_uuid: props.form.purchase_order_uuid,
          po_co_uuid: props.form.po_co_uuid,
          po_number: props.form.po_number,
          co_number: props.form.co_number,
          invoice_type: props.form.invoice_type,
          project_uuid: props.form.project_uuid,
          vendor_uuid: props.form.vendor_uuid,
        };
        
        // Update financial_breakdown object
        updatedForm.financial_breakdown = financialBreakdown;
        
        // Explicitly preserve critical fields
        Object.assign(updatedForm, preservedFields);
        
        // Flatten charge fields
        if (financialBreakdown.charges) {
          updatedForm.freight_charges_percentage = financialBreakdown.charges.freight?.percentage ?? null;
          updatedForm.freight_charges_amount = financialBreakdown.charges.freight?.amount ?? null;
          updatedForm.freight_charges_taxable = financialBreakdown.charges.freight?.taxable ?? false;
          
          updatedForm.packing_charges_percentage = financialBreakdown.charges.packing?.percentage ?? null;
          updatedForm.packing_charges_amount = financialBreakdown.charges.packing?.amount ?? null;
          updatedForm.packing_charges_taxable = financialBreakdown.charges.packing?.taxable ?? false;
          
          updatedForm.custom_duties_charges_percentage = financialBreakdown.charges.custom_duties?.percentage ?? null;
          updatedForm.custom_duties_charges_amount = financialBreakdown.charges.custom_duties?.amount ?? null;
          updatedForm.custom_duties_charges_taxable = financialBreakdown.charges.custom_duties?.taxable ?? false;
          
          updatedForm.other_charges_percentage = financialBreakdown.charges.other?.percentage ?? null;
          updatedForm.other_charges_amount = financialBreakdown.charges.other?.amount ?? null;
          updatedForm.other_charges_taxable = financialBreakdown.charges.other?.taxable ?? false;
        }
        
        // Flatten sales tax fields
        if (financialBreakdown.sales_taxes) {
          updatedForm.sales_tax_1_percentage = financialBreakdown.sales_taxes.sales_tax_1?.percentage ?? null;
          updatedForm.sales_tax_1_amount = financialBreakdown.sales_taxes.sales_tax_1?.amount ?? null;
          
          updatedForm.sales_tax_2_percentage = financialBreakdown.sales_taxes.sales_tax_2?.percentage ?? null;
          updatedForm.sales_tax_2_amount = financialBreakdown.sales_taxes.sales_tax_2?.amount ?? null;
        }
        
        // Flatten totals fields
        if (financialBreakdown.totals) {
          updatedForm.item_total = financialBreakdown.totals.item_total ?? null;
          updatedForm.charges_total = financialBreakdown.totals.charges_total ?? null;
          updatedForm.tax_total = financialBreakdown.totals.tax_total ?? null;
        }
        
        // For existing invoices (Against CO):
        // Since we fetched advance payment BEFORE building financial breakdown,
        // the FinancialBreakdown component will automatically recalculate with:
        // - item_total (from saved invoice values via coItemsTotal)
        // - charges and taxes (from saved financial breakdown)
        // - current advance payment (coAdvancePaid - fetched above)
        // - current holdback (coHoldbackAmount)
        // So we don't need to clear or manipulate the amount - just let it flow naturally
        
        updatedForm.financial_breakdown = financialBreakdown
        
        // Emit the complete updated form with all flattened fields
        emit('update:form', updatedForm);
      } else {
        console.warn('[VendorInvoiceForm] No valid financial breakdown found in CO');
      }
    } else {
      console.warn('[VendorInvoiceForm] No CO data received from API');
    }
  } catch (error) {
    console.error('[VendorInvoiceForm] Error fetching CO items:', error);
    coItemsError.value = 'Failed to load change order items';
    coItems.value = [];
  } finally {
    coItemsLoading.value = false;
  }
};

// Handle update:model-value event (string value like "PO:uuid" or "CO:uuid")
const handlePOCOModelValue = (value: string | undefined) => {
  // Just update the po_co_uuid for the component binding
  // The actual UUID extraction will be handled by handlePOCOChange
  handleFormUpdate('po_co_uuid', value || null);
}

// Handle POCO change specifically for Against PO invoices
const handlePOCOChangeForPO = async (value: any) => {
  // Set flag to prevent watcher from interfering
  isUpdatingFromPOCOSelect.value = true;
  
  try {
    // Extract PO UUID from the value
    if (!value || typeof value !== 'object') {
      handleFormUpdate('purchase_order_uuid', null);
      handleFormUpdate('po_number', '');
      handleFormUpdate('po_co_uuid', null);
      poItems.value = [];
      poItemsError.value = null;
      return;
    }
    
    const optionValue = value.value; // This should be "PO:uuid"
    const optionOrder = value.order; // The full PO object
    
    if (optionValue && typeof optionValue === 'string' && optionValue.startsWith('PO:')) {
      const extractedUuid = optionValue.replace(/^PO:/, '').trim();
      if (extractedUuid && extractedUuid.length > 0) {
        // Update all fields in a single form update to ensure consistency
        const updatedForm = { ...props.form };
        updatedForm.purchase_order_uuid = extractedUuid;
        updatedForm.po_co_uuid = optionValue;
        
        // Extract PO number
        if (optionOrder) {
          updatedForm.po_number = optionOrder.po_number || value.number || '';
        } else {
          updatedForm.po_number = value.number || '';
        }
        
        emit('update:form', updatedForm);
        
        // Fetch PO items
        if (isAgainstPO.value) {
          await fetchPOItems(extractedUuid);
        }
      }
    } else {
      const updatedForm = { ...props.form };
      updatedForm.purchase_order_uuid = null;
      updatedForm.po_number = '';
      updatedForm.po_co_uuid = null;
      emit('update:form', updatedForm);
      poItems.value = [];
      poItemsError.value = null;
    }
  } finally {
    // Reset flag after updates are complete
    await nextTick();
    isUpdatingFromPOCOSelect.value = false;
  }
}

// Handle POCO change specifically for Against CO invoices
const handlePOCOChangeForCO = async (value: any) => {
  // Set flag to prevent watcher from interfering
  isUpdatingFromPOCOSelect.value = true;
  
  try {
    // Extract CO UUID from the value
    if (!value || typeof value !== 'object') {
      handleFormUpdate('change_order_uuid', null);
      handleFormUpdate('co_number', '');
      handleFormUpdate('po_co_uuid', null);
      coItems.value = [];
      coItemsError.value = null;
      return;
    }
    
    const optionValue = value.value; // This should be "CO:uuid"
    const optionOrder = value.order; // The full CO object
    
    if (optionValue && typeof optionValue === 'string' && optionValue.startsWith('CO:')) {
      const extractedUuid = optionValue.replace(/^CO:/, '').trim();
      if (extractedUuid && extractedUuid.length > 0) {
        // Update all fields in a single form update to ensure consistency
        const updatedForm = { ...props.form };
        updatedForm.change_order_uuid = extractedUuid;
        updatedForm.po_co_uuid = optionValue;
        
        // Extract CO number
        if (optionOrder) {
          updatedForm.co_number = optionOrder.co_number || value.number || '';
        } else {
          updatedForm.co_number = value.number || '';
        }
        
        emit('update:form', updatedForm);
        
        // Fetch CO items
        if (isAgainstCO.value) {
          await fetchCOItems(extractedUuid);
        }
      }
    } else {
      const updatedForm = { ...props.form };
      updatedForm.change_order_uuid = null;
      updatedForm.co_number = '';
      updatedForm.po_co_uuid = null;
      emit('update:form', updatedForm);
      coItems.value = [];
      coItemsError.value = null;
    }
  } finally {
    // Reset flag after updates are complete
    await nextTick();
    isUpdatingFromPOCOSelect.value = false;
  }
}

// Handle change event (full option object with all details)
const handlePOCOChange = (value: any) => {
  // The value from change event is an object with { value: "PO:uuid" or "CO:uuid", order: {...}, type: "PO" or "CO", ... }
  if (!value || typeof value !== 'object') {
    // If value is cleared/undefined, clear everything
    handleFormUpdate('po_co_uuid', null);
    handleFormUpdate('purchase_order_uuid', null);
    handleFormUpdate('change_order_uuid', null);
    handleFormUpdate('po_number', '');
    handleFormUpdate('co_number', '');
    return;
  }
  
  const optionValue = value.value; // This should be "PO:uuid" or "CO:uuid"
  const optionType = value.type; // This should be "PO" or "CO"
  const optionOrder = value.order; // The full PO or CO object
  
  let poCoUuid = '';
  let poNumber = '';
  let coNumber = '';
  let purchaseOrderUuid: string | null = null;
  let changeOrderUuid: string | null = null;
  
  // Extract UUIDs based on the option value
  if (optionValue && typeof optionValue === 'string' && optionValue.length > 0) {
    if (optionValue.startsWith('PO:')) {
      poCoUuid = optionValue;
      const extractedUuid = optionValue.replace(/^PO:/, '').trim();
      // Only set if we have a valid UUID (non-empty after removing prefix)
      if (extractedUuid && extractedUuid.length > 0) {
        purchaseOrderUuid = extractedUuid;
      } else {
        purchaseOrderUuid = null;
      }
      changeOrderUuid = null; // Clear change order when PO is selected
      
      // Extract PO number
      if (optionOrder) {
        poNumber = optionOrder.po_number || value.number || '';
      } else {
        poNumber = value.number || '';
      }
      coNumber = '';
    } else if (optionValue.startsWith('CO:')) {
      poCoUuid = optionValue;
      const extractedUuid = optionValue.replace(/^CO:/, '').trim();
      // Only set if we have a valid UUID (non-empty after removing prefix)
      if (extractedUuid && extractedUuid.length > 0) {
        changeOrderUuid = extractedUuid;
      } else {
        changeOrderUuid = null;
      }
      purchaseOrderUuid = null; // Clear purchase order when CO is selected
      
      // Extract CO number
      if (optionOrder) {
        coNumber = optionOrder.co_number || value.number || '';
      } else {
        coNumber = value.number || '';
      }
      poNumber = '';
    } else {
      console.warn('[VendorInvoiceForm] Invalid optionValue format:', optionValue);
    }
  } else {
    console.warn('[VendorInvoiceForm] Missing or invalid optionValue:', optionValue);
  }
  
  // Set flag to prevent watcher from interfering
  isUpdatingFromPOCOSelect.value = true;
  
  // Update all fields in a single form update to ensure consistency
  // This prevents race conditions where multiple handleFormUpdate calls might overwrite each other
  const updatedForm = { ...props.form };
  updatedForm.po_co_uuid = poCoUuid || null;
  updatedForm.purchase_order_uuid = purchaseOrderUuid;
  updatedForm.change_order_uuid = changeOrderUuid;
  updatedForm.po_number = poNumber;
  updatedForm.co_number = coNumber;
  
  emit('update:form', updatedForm);
  
  // Reset flag after updates are complete
  nextTick(() => {
    isUpdatingFromPOCOSelect.value = false;
  });
};

const handleAmountChange = (value: string | null) => {
  let numericValue = 0;
  if (value !== null && value !== undefined && value !== '') {
    numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      numericValue = 0;
    }
  }
  
  handleFormUpdate('amount', numericValue);
  
  // If invoice type is AGAINST_ADVANCE_PAYMENT, also update financial_breakdown
  if (isAgainstAdvancePayment.value) {
    updateFinancialBreakdownForAdvancePayment(numericValue);
  }
};

const handleHoldbackChange = (value: string | null) => {
  if (value === null || value === undefined || value === '') {
    handleFormUpdate('holdback', null);
    return;
  }
  const numericValue = parseFloat(value);
  if (!isNaN(numericValue)) {
    handleFormUpdate('holdback', numericValue);
  }
};

// Fetch holdback invoice details to populate PO/CO number when loading existing invoice
const fetchHoldbackInvoiceDetails = async () => {
  console.log('[VendorInvoiceForm] fetchHoldbackInvoiceDetails called', {
    holdback_invoice_uuid: props.form.holdback_invoice_uuid,
    isAgainstHoldback: isAgainstHoldback.value,
    isFetching: isFetchingHoldbackInvoiceDetails.value,
    current_po_number: props.form.po_number,
    current_co_number: props.form.co_number,
    current_po_co_uuid: props.form.po_co_uuid
  });
  
  if (isFetchingHoldbackInvoiceDetails.value) {
    console.log('[VendorInvoiceForm] Already fetching, skipping...');
    return; // Prevent concurrent fetches
  }
  
  if (!props.form.holdback_invoice_uuid || !isAgainstHoldback.value) {
    console.log('[VendorInvoiceForm] Missing holdback_invoice_uuid or not against holdback, skipping...', {
      holdback_invoice_uuid: props.form.holdback_invoice_uuid,
      isAgainstHoldback: isAgainstHoldback.value
    });
    return;
  }
  
  isFetchingHoldbackInvoiceDetails.value = true;
  
  try {
    console.log('[VendorInvoiceForm] Fetching holdback invoice:', props.form.holdback_invoice_uuid);
    // Fetch the holdback invoice to get its PO/CO UUID
    const invoiceResponse = await $fetch<{ data: any }>(`/api/vendor-invoices/${props.form.holdback_invoice_uuid}`);
    const holdbackInvoice = invoiceResponse?.data;
    
    console.log('[VendorInvoiceForm] Holdback invoice fetched:', {
      invoice: holdbackInvoice,
      invoice_type: holdbackInvoice?.invoice_type,
      purchase_order_uuid: holdbackInvoice?.purchase_order_uuid,
      change_order_uuid: holdbackInvoice?.change_order_uuid,
      po_number: holdbackInvoice?.po_number,
      co_number: holdbackInvoice?.co_number
    });
    
    if (!holdbackInvoice) {
      console.warn('[VendorInvoiceForm] No holdback invoice data returned');
      return;
    }
    
    const updatedForm = { ...props.form };
    
    // Determine if this is against PO or CO based on invoice type
    if (holdbackInvoice.invoice_type === 'AGAINST_PO' && holdbackInvoice.purchase_order_uuid) {
      const poUuid = holdbackInvoice.purchase_order_uuid;
      console.log('[VendorInvoiceForm] Processing AGAINST_PO invoice', { poUuid });
      
      // Only update if not already set (to avoid overwriting)
      if (!updatedForm.purchase_order_uuid || updatedForm.purchase_order_uuid !== poUuid) {
        updatedForm.purchase_order_uuid = poUuid;
        updatedForm.po_co_uuid = `PO:${poUuid}`;
        updatedForm.change_order_uuid = null;
        console.log('[VendorInvoiceForm] Updated purchase_order_uuid and po_co_uuid', {
          purchase_order_uuid: updatedForm.purchase_order_uuid,
          po_co_uuid: updatedForm.po_co_uuid
        });
      }
      
      // Always get PO number from invoice, or fetch from PO if not available
      // This ensures we always have the PO number even if form already has an empty string
      let poNumber = holdbackInvoice.po_number || '';
      console.log('[VendorInvoiceForm] Initial PO number from invoice:', poNumber);
      
      if (!poNumber && poUuid) {
        try {
          console.log('[VendorInvoiceForm] Fetching PO number from API:', poUuid);
          const poResponse = await $fetch<{ data: any }>(`/api/purchase-order-forms/${poUuid}`);
          poNumber = poResponse?.data?.po_number || '';
          console.log('[VendorInvoiceForm] PO number fetched from API:', poNumber);
        } catch (error) {
          console.warn('[VendorInvoiceForm] Error fetching PO number:', error);
        }
      }
      updatedForm.po_number = poNumber;
      updatedForm.co_number = '';
      
      // Also ensure po_co_uuid is set
      if (!updatedForm.po_co_uuid || updatedForm.po_co_uuid !== `PO:${poUuid}`) {
        updatedForm.po_co_uuid = `PO:${poUuid}`;
      }
      
      console.log('[VendorInvoiceForm] Final PO values:', {
        po_number: updatedForm.po_number,
        po_co_uuid: updatedForm.po_co_uuid,
        purchase_order_uuid: updatedForm.purchase_order_uuid
      });
    } else if (holdbackInvoice.invoice_type === 'AGAINST_CO' && holdbackInvoice.change_order_uuid) {
      const coUuid = holdbackInvoice.change_order_uuid;
      console.log('[VendorInvoiceForm] Processing AGAINST_CO invoice', { coUuid });
      
      // Only update if not already set (to avoid overwriting)
      if (!updatedForm.change_order_uuid || updatedForm.change_order_uuid !== coUuid) {
        updatedForm.change_order_uuid = coUuid;
        updatedForm.po_co_uuid = `CO:${coUuid}`;
        updatedForm.purchase_order_uuid = null;
        console.log('[VendorInvoiceForm] Updated change_order_uuid and po_co_uuid', {
          change_order_uuid: updatedForm.change_order_uuid,
          po_co_uuid: updatedForm.po_co_uuid
        });
      }
      
      // Always get CO number from invoice, or fetch from CO if not available
      // This ensures we always have the CO number even if form already has an empty string
      let coNumber = holdbackInvoice.co_number || '';
      console.log('[VendorInvoiceForm] Initial CO number from invoice:', coNumber);
      
      if (!coNumber && coUuid) {
        try {
          console.log('[VendorInvoiceForm] Fetching CO number from API:', coUuid);
          const coResponse = await $fetch<{ data: any }>(`/api/change-orders/${coUuid}`);
          coNumber = coResponse?.data?.co_number || '';
          console.log('[VendorInvoiceForm] CO number fetched from API:', coNumber);
        } catch (error) {
          console.warn('[VendorInvoiceForm] Error fetching CO number:', error);
        }
      }
      updatedForm.co_number = coNumber;
      updatedForm.po_number = '';
      
      // Also ensure po_co_uuid is set
      if (!updatedForm.po_co_uuid || updatedForm.po_co_uuid !== `CO:${coUuid}`) {
        updatedForm.po_co_uuid = `CO:${coUuid}`;
      }
      
      console.log('[VendorInvoiceForm] Final CO values:', {
        co_number: updatedForm.co_number,
        po_co_uuid: updatedForm.po_co_uuid,
        change_order_uuid: updatedForm.change_order_uuid
      });
    } else {
      console.warn('[VendorInvoiceForm] Invalid invoice type or missing UUID', {
        invoice_type: holdbackInvoice.invoice_type,
        purchase_order_uuid: holdbackInvoice.purchase_order_uuid,
        change_order_uuid: holdbackInvoice.change_order_uuid
      });
    }
    
    // Always emit update to ensure form is updated (even if values appear the same, they might be empty strings)
    console.log('[VendorInvoiceForm] Emitting form update with:', {
      po_number: updatedForm.po_number,
      co_number: updatedForm.co_number,
      po_co_uuid: updatedForm.po_co_uuid,
      purchase_order_uuid: updatedForm.purchase_order_uuid,
      change_order_uuid: updatedForm.change_order_uuid
    });
    emit('update:form', updatedForm);
  } catch (error) {
    console.error('[VendorInvoiceForm] Error fetching holdback invoice details:', error);
  } finally {
    isFetchingHoldbackInvoiceDetails.value = false;
  }
};

// Handle holdback invoice selection
const handleHoldbackSelection = async (invoice: any) => {
  if (!invoice || typeof invoice !== 'object' || !invoice.uuid) {
    return;
  }
  
  const updatedForm = { ...props.form };
  
  // Store the holdback invoice UUID for the breakdown table
  updatedForm.holdback_invoice_uuid = invoice.uuid;
  
  // Determine if this is against PO or CO based on invoice type
  if (invoice.invoice_type === 'AGAINST_PO' && invoice.purchase_order_uuid) {
    const poUuid = invoice.purchase_order_uuid;
    updatedForm.purchase_order_uuid = poUuid;
    updatedForm.po_co_uuid = `PO:${poUuid}`;
    updatedForm.change_order_uuid = null;
    
    // Get PO number from invoice, or fetch from PO if not available
    let poNumber = invoice.po_number || '';
    if (!poNumber && poUuid) {
      try {
        const poResponse = await $fetch<{ data: any }>(`/api/purchase-order-forms/${poUuid}`);
        poNumber = poResponse?.data?.po_number || '';
      } catch (error) {
        console.warn('[VendorInvoiceForm] Error fetching PO number:', error);
      }
    }
    updatedForm.po_number = poNumber;
    updatedForm.co_number = '';
    
    // Fetch PO items if needed
    if (isAgainstHoldback.value) {
      await fetchPOItems(poUuid);
    }
  } else if (invoice.invoice_type === 'AGAINST_CO' && invoice.change_order_uuid) {
    const coUuid = invoice.change_order_uuid;
    updatedForm.change_order_uuid = coUuid;
    updatedForm.po_co_uuid = `CO:${coUuid}`;
    updatedForm.purchase_order_uuid = null;
    
    // Get CO number from invoice, or fetch from CO if not available
    let coNumber = invoice.co_number || '';
    if (!coNumber && coUuid) {
      try {
        const coResponse = await $fetch<{ data: any }>(`/api/change-orders/${coUuid}`);
        coNumber = coResponse?.data?.co_number || '';
      } catch (error) {
        console.warn('[VendorInvoiceForm] Error fetching CO number:', error);
      }
    }
    updatedForm.co_number = coNumber;
    updatedForm.po_number = '';
    
    // Fetch CO items if needed
    if (isAgainstHoldback.value) {
      await fetchCOItems(coUuid);
    }
  } else {
    console.warn('[VendorInvoiceForm] Invalid invoice type for holdback selection:', invoice.invoice_type);
    return;
  }
  
  // Set holdback percentage from the invoice
  const holdbackPercentage = typeof invoice.holdback === 'number' 
    ? invoice.holdback 
    : (parseFloat(String(invoice.holdback || '0')) || 0);
  
  if (holdbackPercentage > 0) {
    updatedForm.holdback = holdbackPercentage;
  }
  
  // Don't set amount here - it will be calculated from release amounts in the breakdown table
  // The financial breakdown will calculate the total based on release amounts
  
  emit('update:form', updatedForm);
};

// Handle advance payment cost codes update
const handleAdvancePaymentCostCodesUpdate = (value: any[]) => {
  handleFormUpdate('advance_payment_cost_codes', value);
};

// Handle removed cost codes update
const handleRemovedCostCodesUpdate = (value: any[]) => {
  // Ensure we're passing an array
  const arrayValue = Array.isArray(value) ? value : []
  handleFormUpdate('removed_advance_payment_cost_codes', arrayValue);
};

// Handle holdback cost codes update
const handleHoldbackCostCodesUpdate = (value: any[]) => {
  handleFormUpdate('holdback_cost_codes', value);
};

// Handle holdback release amounts update
const handleHoldbackReleaseAmountsUpdate = (totalReleaseAmount: number) => {
  // Round to 2 decimal places to avoid floating point precision issues
  const roundedTotal = Math.round(totalReleaseAmount * 100) / 100;
  holdbackReleaseAmountTotal.value = roundedTotal;
  
  // Update financial_breakdown.totals.item_total to ensure it matches the release amount total
  // This ensures the FinancialBreakdown component has the correct item_total
  const updatedForm = { ...props.form };
  if (!updatedForm.financial_breakdown || typeof updatedForm.financial_breakdown === 'string') {
    try {
      updatedForm.financial_breakdown = typeof updatedForm.financial_breakdown === 'string' 
        ? JSON.parse(updatedForm.financial_breakdown) 
        : { totals: {} };
    } catch (e) {
      updatedForm.financial_breakdown = { totals: {} };
    }
  }
  if (!updatedForm.financial_breakdown.totals) {
    updatedForm.financial_breakdown.totals = {};
  }
  updatedForm.financial_breakdown.totals.item_total = roundedTotal;
  
  emit('update:form', updatedForm);
  
  // Don't update amount here - FinancialBreakdown component will calculate it based on item_total + charges + taxes
  // The FinancialBreakdown component watches itemTotal and will automatically update the amount
};

// Helper function to update financial_breakdown for advance payment invoices
// skipGuard: if true, skip the guard check (used when called from watcher that already has guard)
const updateFinancialBreakdownForAdvancePayment = (amount: number, skipGuard = false) => {
  // Skip if we're already updating to prevent recursive updates (unless skipGuard is true)
  if (!skipGuard && isUpdatingAdvancePaymentAmount.value) {
    return;
  }
  
  const updatedForm = { ...props.form };
  
  // Deep clone financial_breakdown to avoid mutating the original
  if (!updatedForm.financial_breakdown) {
    updatedForm.financial_breakdown = {
      charges: {
        freight: { percentage: null, amount: null, taxable: false },
        packing: { percentage: null, amount: null, taxable: false },
        custom_duties: { percentage: null, amount: null, taxable: false },
        other: { percentage: null, amount: null, taxable: false },
      },
      sales_taxes: {
        sales_tax_1: { percentage: null, amount: null },
        sales_tax_2: { percentage: null, amount: null },
      },
      totals: {
        item_total: null,
        charges_total: null,
        tax_total: null,
        total_invoice_amount: null,
      },
    };
  } else {
    // Deep clone existing financial_breakdown
    updatedForm.financial_breakdown = JSON.parse(JSON.stringify(updatedForm.financial_breakdown));
  }
  
  // Ensure totals object exists
  if (!updatedForm.financial_breakdown.totals) {
    updatedForm.financial_breakdown.totals = {
      item_total: null,
      charges_total: null,
      tax_total: null,
      total_invoice_amount: null,
    };
  }
  
  // For advance payment invoices, charges are hidden, so charges_total should always be 0
  // The FinancialBreakdown component will recalculate tax_total based on sales tax percentages
  // We need to update item_total so the component can recalculate correctly
  
  const currentItemTotal = updatedForm.financial_breakdown.totals.item_total || 0;
  const currentTaxTotal = updatedForm.financial_breakdown.totals.tax_total || 0;
  const currentTotal = updatedForm.financial_breakdown.totals.total_invoice_amount || 0;
  
  // For advance payment invoices, charges and taxes are always 0
  // Ensure charges_total and tax_total are set to 0 (not null)
  updatedForm.financial_breakdown.totals.charges_total = 0;
  updatedForm.financial_breakdown.totals.tax_total = 0;
  
  // Only update if item_total changed - this will trigger FinancialBreakdown to recalculate
  if (Math.abs(amount - currentItemTotal) > 0.01) {
    // Update item_total to match the advance payment total
    updatedForm.financial_breakdown.totals.item_total = amount || 0;
    
    // Calculate total_invoice_amount = item_total + tax_total
    // For advance payments, this equals item_total since tax_total is 0
    updatedForm.financial_breakdown.totals.total_invoice_amount = amount;
    
    emit('update:form', updatedForm);
  } else {
    // Even if item_total hasn't changed, ensure totals are correct
    // Update total_invoice_amount to match item_total (since tax_total is 0)
    const currentItemTotalValue = updatedForm.financial_breakdown.totals.item_total || 0;
    if (Math.abs(updatedForm.financial_breakdown.totals.total_invoice_amount - currentItemTotalValue) > 0.01) {
      updatedForm.financial_breakdown.totals.total_invoice_amount = currentItemTotalValue;
      emit('update:form', updatedForm);
    } else if (updatedForm.financial_breakdown.totals.tax_total === null || updatedForm.financial_breakdown.totals.charges_total === null) {
      // Ensure null values are set to 0
      emit('update:form', updatedForm);
    }
  }
};

// Line items handlers
const createEmptyLineItem = () => ({
  id: Date.now() + Math.random().toString(36).substring(2),
  cost_code_uuid: null,
  sequence_uuid: null,
  item_uuid: null,
  description: '',
  unit_price: null,
  uom: '',
  quantity: null,
  total: null,
});

const handleAddLineItem = (index: number) => {
  const currentItems = [...lineItems.value];
  const newItem = createEmptyLineItem();
  const insertIndex = index === -1 ? currentItems.length : Math.min(index + 1, currentItems.length);
  currentItems.splice(insertIndex, 0, newItem);
  handleFormUpdate('line_items', currentItems);
};

const handleRemoveLineItem = (index: number) => {
  const currentItems = [...lineItems.value];
  if (index >= 0 && index < currentItems.length) {
    currentItems.splice(index, 1);
    handleFormUpdate('line_items', currentItems);
  }
};

const handleLineItemCostCodeChange = ({ index, value, option }: { index: number; value: string | null; option?: any }) => {
  const currentItems = [...lineItems.value];
  if (index >= 0 && index < currentItems.length) {
    const item = { ...currentItems[index] };
    item.cost_code_uuid = value;
    
    // If cost code changes, clear sequence and item
    if (item.cost_code_uuid !== value) {
      item.sequence_uuid = null;
      item.item_uuid = null;
    }
    
    currentItems[index] = item;
    handleFormUpdate('line_items', currentItems);
  }
};

const handleLineItemSequenceChange = ({ index, value, option }: { index: number; value: string | null; option?: any }) => {
  const currentItems = [...lineItems.value];
  if (index >= 0 && index < currentItems.length) {
    const item = { ...currentItems[index] };
    item.sequence_uuid = value;
    item.item_uuid = value; // Sequence select uses item_uuid
    
    // Populate item data from option if available
    const raw = option?.raw || option?.option?.raw;
    if (raw) {
      item.description = raw.description || item.description || '';
      item.unit_price = raw.unit_price || item.unit_price || null;
      item.uom = raw.unit_label || raw.unit || raw.short_name || item.uom || '';
      item.unit_label = raw.unit_label || raw.unit || raw.short_name || '';
    }
    
    currentItems[index] = item;
    handleFormUpdate('line_items', currentItems);
  }
};

const handleLineItemItemChange = ({ index, value, option }: { index: number; value: string | null; option?: any }) => {
  const currentItems = [...lineItems.value];
  if (index >= 0 && index < currentItems.length) {
    const item = { ...currentItems[index] };
    item.item_uuid = value;
    item.sequence_uuid = value; // Keep sequence_uuid in sync with item_uuid
    
    // Populate item data from option if available
    const raw = option?.raw || option?.option?.raw;
    if (raw) {
      item.description = raw.description || raw.item_name || item.description || '';
      item.unit_price = raw.unit_price || item.unit_price || null;
      item.uom = raw.unit_label || raw.unit || raw.short_name || item.uom || '';
      item.unit_label = raw.unit_label || raw.unit || raw.short_name || '';
    }
    
    currentItems[index] = item;
    handleFormUpdate('line_items', currentItems);
  }
};

const handleLineItemDescriptionChange = ({ index, value }: { index: number; value: string }) => {
  const currentItems = [...lineItems.value];
  if (index >= 0 && index < currentItems.length) {
    const item = { ...currentItems[index] };
    item.description = value;
    currentItems[index] = item;
    handleFormUpdate('line_items', currentItems);
  }
};

const updateLineItems = (items: any[]) => {
  // Always create a new array reference with deep-cloned items to ensure Vue tracks changes
  // This ensures that nested property changes (like unit_price, quantity, total) trigger reactivity
  const clonedItems = items.map((item: any) => ({
    ...item,
  }))
  
  // Use nextTick to ensure the update happens after any pending updates (same pattern as PurchaseOrderForm)
  nextTick(() => {
    handleFormUpdate('line_items', clonedItems);
    // Force lineItemsTotal to recalculate immediately after update
    const _ = lineItemsTotal.value
  });
}

const handleLineItemUnitPriceChange = ({ index, value, numericValue, computedTotal }: { index: number; value: number | null; numericValue: number; computedTotal: number }) => {
  const currentItems = Array.isArray(lineItems.value) ? [...lineItems.value] : [];
  
  if (!currentItems.length) {
    return;
  }

  const targetIndex = Math.min(Math.max(index, 0), currentItems.length - 1);
  const item = { ...currentItems[targetIndex] };
  const isEmpty = value === null || value === undefined;

  item.unit_price = isEmpty ? null : numericValue;
  item.total = computedTotal;

  currentItems[targetIndex] = item;
  updateLineItems(currentItems);
};

const handleLineItemQuantityChange = ({ index, value, numericValue, computedTotal }: { index: number; value: number | null; numericValue: number; computedTotal: number }) => {
  const currentItems = Array.isArray(lineItems.value) ? [...lineItems.value] : [];
  
  if (!currentItems.length) {
    return;
  }

  const targetIndex = Math.min(Math.max(index, 0), currentItems.length - 1);
  const item = { ...currentItems[targetIndex] };
  const isEmpty = value === null || value === undefined;

  item.quantity = isEmpty ? null : numericValue;
  item.total = computedTotal;

  currentItems[targetIndex] = item;
  updateLineItems(currentItems);
};

// Handle invoice unit price changes for PO items
// Similar to how direct invoice handles line item unit price changes
// The poItemsTotal computed property will automatically recalculate, and FinancialBreakdown will update
const handleInvoiceUnitPriceChange = ({ index, value, numericValue, computedTotal }: { index: number; value: string | number | null | undefined; numericValue: number; computedTotal: number }) => {
  const currentItems = [...poItems.value];
  if (index >= 0 && index < currentItems.length) {
    const item = { ...currentItems[index] };
    item.invoice_unit_price = numericValue;
    item.invoice_total = computedTotal;
    currentItems[index] = item;
    poItems.value = currentItems;
    // poItemsTotal computed property will automatically update
    // FinancialBreakdown watches itemTotal and will recalculate charges/taxes automatically
    // This matches the behavior of direct invoices - no manual amount update needed
  }
};

// Handle invoice quantity changes for PO items
// Similar to how direct invoice handles line item quantity changes
// The poItemsTotal computed property will automatically recalculate, and FinancialBreakdown will update
const handleInvoiceQuantityChange = ({ index, value, numericValue, computedTotal }: { index: number; value: string | number | null | undefined; numericValue: number; computedTotal: number }) => {
  const currentItems = [...poItems.value];
  if (index >= 0 && index < currentItems.length) {
    const item = { ...currentItems[index] };
    item.invoice_quantity = numericValue;
    item.invoice_total = computedTotal;
    currentItems[index] = item;
    poItems.value = currentItems;
    // poItemsTotal computed property will automatically update
    // FinancialBreakdown watches itemTotal and will recalculate charges/taxes automatically
    // This matches the behavior of direct invoices - no manual amount update needed
  }
};

// Handle invoice total changes for PO items
// Similar to how direct invoice handles line item total changes
// The poItemsTotal computed property will automatically recalculate, and FinancialBreakdown will update
const handleInvoiceTotalChange = ({ index, value }: { index: number; value: number }) => {
  const currentItems = [...poItems.value];
  if (index >= 0 && index < currentItems.length) {
    const item = { ...currentItems[index] };
    item.invoice_total = value;
    currentItems[index] = item;
    poItems.value = currentItems;
    // poItemsTotal computed property will automatically update
    // FinancialBreakdown watches itemTotal and will recalculate charges/taxes automatically
    // This matches the behavior of direct invoices - no manual amount update needed
  }
};

// Handle approval checks changes for PO items
const handlePOItemApprovalChecksChange = ({ index, value }: { index: number; value: string[] }) => {
  const currentItems = [...poItems.value];
  if (index >= 0 && index < currentItems.length) {
    const item = { ...currentItems[index] };
    item.approval_checks = Array.isArray(value) ? value : [];
    currentItems[index] = item;
    poItems.value = currentItems;
  }
};

// Handle invoice unit price changes for CO items
// Similar to how PO items handle invoice unit price changes
// The coItemsTotal computed property will automatically recalculate, and FinancialBreakdown will update
const handleCOInvoiceUnitPriceChange = async ({ index, value, numericValue, computedTotal }: { index: number; value: string | number | null | undefined; numericValue: number; computedTotal: number }) => {
  const currentItems = [...coItems.value];
  if (index >= 0 && index < currentItems.length) {
    const item = { ...currentItems[index] };
    item.invoice_unit_price = numericValue;
    item.invoice_total = computedTotal;
    currentItems[index] = item;
    coItems.value = currentItems;
    // Wait for nextTick to ensure watcher fires
    await nextTick();
    // coItemsTotal computed property will automatically update
    // FinancialBreakdown watches itemTotal and will recalculate charges/taxes automatically
    // This matches the behavior of direct invoices - no manual amount update needed
  }
};

// Handle invoice quantity changes for CO items
// Similar to how PO items handle invoice quantity changes
// The coItemsTotal computed property will automatically recalculate, and FinancialBreakdown will update
const handleCOInvoiceQuantityChange = async ({ index, value, numericValue, computedTotal }: { index: number; value: string | number | null | undefined; numericValue: number; computedTotal: number }) => {
  const currentItems = [...coItems.value];
  if (index >= 0 && index < currentItems.length) {
    const item = { ...currentItems[index] };
    item.invoice_quantity = numericValue;
    item.invoice_total = computedTotal;
    currentItems[index] = item;
    coItems.value = currentItems;
    // Wait for nextTick to ensure watcher fires
    await nextTick();
    // coItemsTotal computed property will automatically update
    // FinancialBreakdown watches itemTotal and will recalculate charges/taxes automatically
    // This matches the behavior of direct invoices - no manual amount update needed
  }
};

// Handle invoice total changes for CO items
// Similar to how PO items handle invoice total changes
// The coItemsTotal computed property will automatically recalculate, and FinancialBreakdown will update
const handleCOInvoiceTotalChange = ({ index, value }: { index: number; value: number }) => {
  const currentItems = [...coItems.value];
  if (index >= 0 && index < currentItems.length) {
    const item = { ...currentItems[index] };
    item.invoice_total = value;
    currentItems[index] = item;
    coItems.value = currentItems;
    // coItemsTotal computed property will automatically update
    // FinancialBreakdown watches itemTotal and will recalculate charges/taxes automatically
    // This matches the behavior of direct invoices - no manual amount update needed
  }
};

// Helper function to compute effective total for a line item (same pattern as computePoItemEffectiveTotal)
const computeLineItemEffectiveTotal = (item: any): number => {
  const hasUnitPrice =
    item?.unit_price !== null &&
    item?.unit_price !== undefined &&
    item?.unit_price !== ''
  const hasQuantity =
    item?.quantity !== null &&
    item?.quantity !== undefined &&
    item?.quantity !== ''

  if (hasUnitPrice && hasQuantity) {
    const unitPrice = parseNumericInput(item?.unit_price)
    const quantity = parseNumericInput(item?.quantity)
    return roundCurrencyValue(unitPrice * quantity)
  }

  const itemTotal = parseNumericInput(item?.total)
  if (itemTotal) {
    return roundCurrencyValue(itemTotal)
  }

  return 0
}

// Calculate total from line items - directly access properties for maximum reactivity (same pattern as itemTotal in PurchaseOrderForm)
const lineItemsTotal = computed(() => {
  // Access props.form.line_items directly to ensure reactivity (same as PurchaseOrderForm accesses props.form.po_items)
  const items = Array.isArray(props.form.line_items) ? props.form.line_items : []
  
  // Access deep properties to ensure Vue tracks changes
  // Iterate through all items and access their properties to ensure reactivity
  const total = items.reduce((sum: number, item: any, index: number) => {
    // Force reactivity by accessing the specific fields that affect the total
    // Accessing these properties ensures Vue tracks changes to them
    const unitPrice = item?.unit_price
    const quantity = item?.quantity
    const itemTotal = item?.total
    
    // Also access the item itself and its index to ensure array changes are tracked
    const _ = item && index
    
    const effectiveTotal = computeLineItemEffectiveTotal(item)
    return sum + effectiveTotal
  }, 0)
  
  return roundCurrencyValue(total)
})

// Calculate total from advance payment cost codes
const advancePaymentTotal = computed(() => {
  const costCodes = Array.isArray(props.form.advance_payment_cost_codes) 
    ? props.form.advance_payment_cost_codes 
    : []
  
  const total = costCodes.reduce((sum: number, row: any) => {
    // Handle both camelCase and snake_case field names
    const advanceAmount = row.advanceAmount !== undefined 
      ? row.advanceAmount 
      : (row.advance_amount !== undefined ? row.advance_amount : null)
    
    if (advanceAmount === null || advanceAmount === undefined || advanceAmount === '') {
      return sum
    }
    
    const numericValue = parseNumericInput(advanceAmount)
    return sum + numericValue
  }, 0)
  
  return roundCurrencyValue(total)
})

// Calculate total from PO items (for Against PO invoice type)
// Always use invoice values (invoice qty and unit price) when showInvoiceValues is enabled
// This matches how direct invoices calculate from line items
// For new invoices, invoice values are null, so return 0 (don't fall back to PO values)
const poItemsTotal = computed(() => {
  const items = poItems.value || []
  
  const total = items.reduce((sum: number, item: any) => {
    // Only use invoice values - don't fall back to PO values
    // For new invoices, invoice_unit_price and invoice_quantity are null, so return 0 for that item
    const hasInvoiceUnitPrice = item.invoice_unit_price !== null && item.invoice_unit_price !== undefined
    const hasInvoiceQuantity = item.invoice_quantity !== null && item.invoice_quantity !== undefined
    
    // Calculate from invoice unit price and quantity if both are available
    if (hasInvoiceUnitPrice && hasInvoiceQuantity) {
      const invoiceUnitPrice = parseNumericInput(item.invoice_unit_price)
      const invoiceQuantity = parseNumericInput(item.invoice_quantity)
      if (invoiceUnitPrice > 0 && invoiceQuantity > 0) {
        return sum + roundCurrencyValue(invoiceUnitPrice * invoiceQuantity)
      }
    }
    
    // Fallback to invoice_total if available (and invoice_unit_price/invoice_quantity are not set)
    if (item.invoice_total !== null && item.invoice_total !== undefined) {
      const invoiceTotal = parseNumericInput(item.invoice_total)
      if (invoiceTotal > 0) {
        return sum + roundCurrencyValue(invoiceTotal)
      }
    }
    
    // For new invoices, invoice values are null, so return 0 (don't add anything to sum)
    return sum
  }, 0)
  
  return roundCurrencyValue(total)
})

// Calculate total from CO items (for Against CO invoice type)
// Always use invoice values (invoice qty and unit price) when showInvoiceValues is enabled
// This matches how direct invoices calculate from line items
// For new invoices, invoice values are null, so return 0 (don't fall back to CO values)
const coItemsTotal = computed(() => {
  const items = coItems.value || []
  
  const total = items.reduce((sum: number, item: any) => {
    // Only use invoice values - don't fall back to CO values
    // For new invoices, invoice_unit_price and invoice_quantity are null, so return 0 for that item
    const hasInvoiceUnitPrice = item.invoice_unit_price !== null && item.invoice_unit_price !== undefined
    const hasInvoiceQuantity = item.invoice_quantity !== null && item.invoice_quantity !== undefined
    
    // Calculate from invoice unit price and quantity if both are available
    if (hasInvoiceUnitPrice && hasInvoiceQuantity) {
      const invoiceUnitPrice = parseNumericInput(item.invoice_unit_price)
      const invoiceQuantity = parseNumericInput(item.invoice_quantity)
      if (invoiceUnitPrice > 0 && invoiceQuantity > 0) {
        return sum + roundCurrencyValue(invoiceUnitPrice * invoiceQuantity)
      }
    }
    
    // Fallback to invoice_total if available (and invoice_unit_price/invoice_quantity are not set)
    if (item.invoice_total !== null && item.invoice_total !== undefined) {
      const invoiceTotal = parseNumericInput(item.invoice_total)
      if (invoiceTotal > 0) {
        return sum + roundCurrencyValue(invoiceTotal)
      }
    }
    
    // For new invoices, invoice values are null, so return 0 (don't add anything to sum)
    return sum
  }, 0)
  
  return roundCurrencyValue(total)
})

const updateInvoiceAmount = () => {
  // Update amount based on invoice type
  if (isAgainstAdvancePayment.value) {
    // For advance payment invoices, use the sum of advance amounts
    handleFormUpdate('amount', advancePaymentTotal.value);
  } else if (isDirectInvoice.value) {
    // For direct invoices, use line items total (will be overridden by FinancialBreakdown if used)
    handleFormUpdate('amount', lineItemsTotal.value);
  }
};

// Handler for financial breakdown component updates
const handleFinancialBreakdownUpdate = (updates: Record<string, any>) => {
  // The FinancialBreakdown component handles all calculations
  // We just need to update the form with the updates
  const updatedForm = { ...props.form };
  Object.keys(updates).forEach((key) => {
    updatedForm[key] = updates[key];
  });
  emit('update:form', updatedForm);
};

const previewFile = (attachment: any) => {
  selectedFileForPreview.value = {
    id: attachment.uuid || attachment.tempId,
    file_name: attachment.document_name || attachment.name,
    name: attachment.document_name || attachment.name,
    file_type: attachment.mime_type || attachment.type,
    type: attachment.mime_type || attachment.type,
    file_size: attachment.file_size || attachment.size,
    size: attachment.file_size || attachment.size,
    file_url: attachment.file_url || attachment.url || attachment.fileData,
    url: attachment.file_url || attachment.url || attachment.fileData
  };
  showFilePreviewModal.value = true;
};

const closeFilePreview = () => {
  showFilePreviewModal.value = false;
  selectedFileForPreview.value = null;
};

const formatFileSize = (size?: number | null) => {
  if (!size || size <= 0) return "0 KB";
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const removeFile = async (index: number) => {
  const attachment = props.form.attachments[index];

  if (!attachment) return;

  if (attachment?.uuid && props.editingInvoice && props.form.uuid) {
    try {
      const response = await $fetch<{ attachments: any[] }>("/api/vendor-invoices/documents/remove", {
        method: "POST",
        body: {
          invoice_uuid: props.form.uuid,
          attachment_uuid: attachment.uuid,
        },
      });
      handleFormUpdate("attachments", response?.attachments ?? []);
      return;
    } catch (error) {
      console.error("Error deleting file from storage:", error);
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

// Auto-calculate due date when bill date or credit days change
const calculateDueDate = (billDate: CalendarDate | null, creditDays: string | null) => {
  if (!billDate || !creditDays) return null;
  
  const creditDaysMap: Record<string, number> = {
    'NET_15': 15,
    'NET_25': 25,
    'NET_30': 30,
    'NET_45': 45,
    'NET_60': 60,
  };
  
  const days = creditDaysMap[String(creditDays).toUpperCase()] || 30;
  const dueDate = billDate.add({ days });
  return dueDate;
};

// Watch for invoice type changes to clear PO Number if not "Against PO" and initialize line items for direct invoice
watch(
  () => props.form.invoice_type,
  async (newInvoiceType, oldInvoiceType) => {
    // If switching away from "Against PO", clear the PO UUID and items
    const wasAgainstPO = String(oldInvoiceType || '').toUpperCase() === 'AGAINST_PO';
    const isNowAgainstPO = String(newInvoiceType || '').toUpperCase() === 'AGAINST_PO';
    
    if (wasAgainstPO && !isNowAgainstPO) {
      handleFormUpdate('purchase_order_uuid', null);
      handleFormUpdate('po_number', '');
      poItems.value = [];
      poItemsError.value = null;
    }
    
    // If switching to "Against PO", fetch PO items if PO is already selected
    if (!wasAgainstPO && isNowAgainstPO && props.form.purchase_order_uuid) {
      await fetchPOItems(props.form.purchase_order_uuid);
      // Update amount after fetching items (will be handled by poItemsTotal watcher)
      nextTick(() => {
        if (poItemsTotal.value > 0) {
          handleFormUpdate('amount', poItemsTotal.value);
        }
      });
    }
    
    // If switching away from "Against CO", clear the CO UUID and items
    const wasAgainstCO = String(oldInvoiceType || '').toUpperCase() === 'AGAINST_CO';
    const isNowAgainstCO = String(newInvoiceType || '').toUpperCase() === 'AGAINST_CO';
    
    if (wasAgainstCO && !isNowAgainstCO) {
      handleFormUpdate('change_order_uuid', null);
      handleFormUpdate('co_number', '');
      coItems.value = [];
      coItemsError.value = null;
    }
    
    // If switching to "Against CO", fetch CO items if CO is already selected
    if (!wasAgainstCO && isNowAgainstCO && props.form.change_order_uuid) {
      await fetchCOItems(props.form.change_order_uuid);
      // Update amount after fetching items (will be handled by coItemsTotal watcher)
      nextTick(() => {
        if (coItemsTotal.value > 0) {
          handleFormUpdate('amount', coItemsTotal.value);
        }
      });
    }
    
    // If switching away from "Against Advance Payment", clear PO/CO selection and advance payment cost codes
    const wasAgainstAdvancePayment = String(oldInvoiceType || '').toUpperCase() === 'AGAINST_ADVANCE_PAYMENT';
    const isNowAgainstAdvancePayment = String(newInvoiceType || '').toUpperCase() === 'AGAINST_ADVANCE_PAYMENT';
    
    if (wasAgainstAdvancePayment && !isNowAgainstAdvancePayment) {
      handleFormUpdate('po_co_uuid', null);
      handleFormUpdate('purchase_order_uuid', null);
      handleFormUpdate('change_order_uuid', null);
      handleFormUpdate('po_number', '');
      handleFormUpdate('co_number', '');
      handleFormUpdate('advance_payment_cost_codes', []);
    }
    
    // If switching away from "Against Holdback Amount", clear PO/CO selection
    const wasAgainstHoldback = String(oldInvoiceType || '').toUpperCase() === 'AGAINST_HOLDBACK_AMOUNT';
    const isNowAgainstHoldback = String(newInvoiceType || '').toUpperCase() === 'AGAINST_HOLDBACK_AMOUNT';
    
    if (wasAgainstHoldback && !isNowAgainstHoldback) {
      handleFormUpdate('po_co_uuid', null);
      handleFormUpdate('purchase_order_uuid', null);
      handleFormUpdate('change_order_uuid', null);
      handleFormUpdate('po_number', '');
      handleFormUpdate('co_number', '');
      handleFormUpdate('holdback', null);
      handleFormUpdate('holdback_invoice_uuid', null);
      handleFormUpdate('holdback_cost_codes', []);
      poItems.value = [];
      coItems.value = [];
      poItemsError.value = null;
      coItemsError.value = null;
      holdbackReleaseAmountTotal.value = 0;
    }
    
    // If switching to "Against Holdback Amount", open modal if project and vendor are selected
    if (!wasAgainstHoldback && isNowAgainstHoldback && props.form.project_uuid && props.form.vendor_uuid) {
      showHoldbackModal.value = true;
    }
    
    // If switching to "Enter Direct Invoice", initialize line items if empty
    const isNowDirectInvoice = String(newInvoiceType || '').toUpperCase() === 'ENTER_DIRECT_INVOICE';
    if (isNowDirectInvoice && (!props.form.line_items || props.form.line_items.length === 0)) {
      handleFormUpdate('line_items', [createEmptyLineItem()]);
    }
    
    // If switching away from "Enter Direct Invoice", clear line items
    const wasDirectInvoice = String(oldInvoiceType || '').toUpperCase() === 'ENTER_DIRECT_INVOICE';
    if (wasDirectInvoice && !isNowDirectInvoice) {
      handleFormUpdate('line_items', []);
      handleFormUpdate('amount', 0);
    }
    
    // Update amount based on new invoice type
    if (isAgainstAdvancePayment.value) {
      // If switching to advance payment, update amount from advance payment total
      const newTotal = advancePaymentTotal.value;
      handleFormUpdate('amount', newTotal);
      updateFinancialBreakdownForAdvancePayment(newTotal);
    } else if (isDirectInvoice.value) {
      // If switching to direct invoice, update amount from line items total
      handleFormUpdate('amount', lineItemsTotal.value);
    }
  }
);

// Watch for project changes to clear dependent fields
watch(
  () => props.form.project_uuid,
  (newProjectUuid, oldProjectUuid) => {
    // Skip clearing fields if we're loading an existing invoice (uuid exists)
    // This prevents watchers from clearing fields during initial load
    if (props.form.uuid && props.editingInvoice && !oldProjectUuid) {
      // This is initial load of existing invoice - don't clear fields
      return;
    }
    
    // If project is cleared, clear invoice type and all subsequent fields
    if (!newProjectUuid && oldProjectUuid) {
      handleFormUpdate('invoice_type', null);
      handleFormUpdate('vendor_uuid', null);
      handleFormUpdate('credit_days', null);
      handleFormUpdate('due_date', null);
      handleFormUpdate('purchase_order_uuid', null);
      handleFormUpdate('po_number', '');
      handleFormUpdate('po_co_uuid', null);
      handleFormUpdate('change_order_uuid', null);
      handleFormUpdate('co_number', '');
    }
    // If project changed and we have a PO selected, clear it
    else if (newProjectUuid !== oldProjectUuid && props.form.purchase_order_uuid) {
      handleFormUpdate('purchase_order_uuid', null);
      handleFormUpdate('po_number', '');
    }
    // If project changed and we have a CO selected, clear it
    else if (newProjectUuid !== oldProjectUuid && props.form.change_order_uuid) {
      handleFormUpdate('change_order_uuid', null);
      handleFormUpdate('co_number', '');
    }
    // If project changed and we have a PO/CO selected (for advance payment), clear it
    else if (newProjectUuid !== oldProjectUuid && props.form.po_co_uuid) {
      handleFormUpdate('po_co_uuid', null);
      handleFormUpdate('purchase_order_uuid', null);
      handleFormUpdate('change_order_uuid', null);
      handleFormUpdate('po_number', '');
      handleFormUpdate('co_number', '');
    }
  }
);

// Watch for vendor changes to clear PO if it doesn't match the new vendor
watch(
  () => props.form.vendor_uuid,
  (newVendorUuid, oldVendorUuid) => {
    // If vendor changed and we have a PO selected, clear it
    if (newVendorUuid !== oldVendorUuid && props.form.purchase_order_uuid) {
      handleFormUpdate('purchase_order_uuid', null);
      handleFormUpdate('po_number', '');
    }
    // If vendor changed and we have a CO selected, clear it
    if (newVendorUuid !== oldVendorUuid && props.form.change_order_uuid) {
      handleFormUpdate('change_order_uuid', null);
      handleFormUpdate('co_number', '');
    }
    // If vendor changed and we have a PO/CO selected (for advance payment), clear it
    if (newVendorUuid !== oldVendorUuid && props.form.po_co_uuid) {
      handleFormUpdate('po_co_uuid', null);
      handleFormUpdate('purchase_order_uuid', null);
      handleFormUpdate('change_order_uuid', null);
      handleFormUpdate('po_number', '');
      handleFormUpdate('co_number', '');
    }
  }
);

// Watch for corporation/project/vendor changes to ensure PO/CO data is fetched for POCOSelect
// This ensures POCOSelect has data for the form's corporation, not TopBar's corporation
watch(
  [() => props.form.corporation_uuid, () => props.form.project_uuid, () => props.form.vendor_uuid],
  async ([newCorpUuid, newProjectUuid, newVendorUuid], [oldCorpUuid, oldProjectUuid, oldVendorUuid]) => {
    // Only fetch if we have all required fields and something changed
    if (newCorpUuid && newProjectUuid && newVendorUuid) {
      const corpChanged = newCorpUuid !== oldCorpUuid;
      const projectChanged = newProjectUuid !== oldProjectUuid;
      const vendorChanged = newVendorUuid !== oldVendorUuid;
      
      // Fetch PO/CO data when corporation changes (force refresh to ensure fresh data)
      // Also fetch when project or vendor changes if corporation is set (to ensure data is available)
      if (corpChanged || (projectChanged && newCorpUuid) || (vendorChanged && newCorpUuid)) {
        try {
          await Promise.allSettled([
            purchaseOrdersStore.fetchPurchaseOrders(newCorpUuid, corpChanged), // forceRefresh only if corp changed
            changeOrdersStore.fetchChangeOrders(newCorpUuid, corpChanged), // forceRefresh only if corp changed
          ]);
        } catch (error) {
          console.error('[VendorInvoiceForm] Error fetching PO/CO data:', error);
        }
      }
    }
  },
  { immediate: false } // Don't run immediately - let handleCorporationChange handle initial fetch
);

// Watch for purchase_order_uuid changes to fetch PO items (for Against PO invoices)
watch(
  () => props.form.purchase_order_uuid,
  async (newPoUuid, oldPoUuid) => {
    // Skip if we're currently updating from POCOSelect to avoid duplicate fetches
    if (isUpdatingFromPOCOSelect.value) {
      return;
    }
    
    if (isAgainstPO.value && newPoUuid && newPoUuid !== oldPoUuid) {
      await fetchPOItems(newPoUuid);
    } else if (!newPoUuid) {
      poItems.value = [];
      poItemsError.value = null;
      poItemsKey.value += 1; // Force re-render when clearing
    }
  }
);

// Watch for change_order_uuid changes to fetch CO items (for Against CO invoices)
watch(
  () => props.form.change_order_uuid,
  async (newCoUuid, oldCoUuid) => {
    // Skip if we're currently updating from POCOSelect to avoid duplicate fetches
    if (isUpdatingFromPOCOSelect.value) {
      return;
    }
    
    if (isAgainstCO.value && newCoUuid && newCoUuid !== oldCoUuid) {
      await fetchCOItems(newCoUuid);
    } else if (!newCoUuid) {
      coItems.value = [];
      coItemsError.value = null;
      coItemsKey.value += 1; // Force re-render when clearing
    }
  }
);

// Watch for purchase_order_uuid or change_order_uuid changes to update po_co_uuid for POCOSelect component
// This is mainly for when loading existing invoices, not for user selections (which are handled by handlePOCOChange)
// We use a flag to prevent circular updates when handlePOCOChange is setting values
const isUpdatingFromPOCOSelect = ref(false);
const isUpdatingAdvancePaymentAmount = ref(false); // Guard flag to prevent recursive updates
const isUpdatingDueDate = ref(false); // Guard flag to prevent recursive updates when calculating due date
const isFetchingHoldbackInvoiceDetails = ref(false); // Guard flag to prevent recursive fetches

// Watch for holdback_invoice_uuid to fetch PO/CO number when loading existing invoice
watch(
  [() => props.form.holdback_invoice_uuid, () => props.form.uuid, () => props.editingInvoice, () => props.form.invoice_type],
  async ([newHoldbackInvoiceUuid, newUuid, newEditingInvoice, newInvoiceType], [oldHoldbackInvoiceUuid]) => {
    console.log('[VendorInvoiceForm] Holdback invoice watcher triggered', {
      newHoldbackInvoiceUuid,
      oldHoldbackInvoiceUuid,
      newUuid,
      newEditingInvoice,
      newInvoiceType,
      current_po_number: props.form.po_number,
      current_co_number: props.form.co_number
    });
    
    // Only fetch for existing holdback invoices
    if (!newHoldbackInvoiceUuid || !newUuid || !newEditingInvoice) {
      console.log('[VendorInvoiceForm] Watcher: Missing required fields, skipping', {
        hasHoldbackInvoiceUuid: !!newHoldbackInvoiceUuid,
        hasUuid: !!newUuid,
        isEditing: !!newEditingInvoice
      });
      return;
    }
    
    // Only fetch if invoice type is AGAINST_HOLDBACK_AMOUNT
    if (String(newInvoiceType || '').toUpperCase() !== 'AGAINST_HOLDBACK_AMOUNT') {
      console.log('[VendorInvoiceForm] Watcher: Not AGAINST_HOLDBACK_AMOUNT, skipping', {
        invoice_type: newInvoiceType
      });
      return;
    }
    
    // Always fetch if holdback_invoice_uuid changed (loading new invoice)
    // Or if PO/CO number is missing/empty (even if it's an empty string)
    const poNumberEmpty = !props.form.po_number || String(props.form.po_number).trim() === '';
    const coNumberEmpty = !props.form.co_number || String(props.form.co_number).trim() === '';
    const shouldFetch = newHoldbackInvoiceUuid !== oldHoldbackInvoiceUuid || 
                       (poNumberEmpty && coNumberEmpty);
    
    console.log('[VendorInvoiceForm] Watcher: Should fetch?', {
      shouldFetch,
      holdbackInvoiceUuidChanged: newHoldbackInvoiceUuid !== oldHoldbackInvoiceUuid,
      poNumberEmpty,
      coNumberEmpty
    });
    
    if (shouldFetch) {
      console.log('[VendorInvoiceForm] Watcher: Calling fetchHoldbackInvoiceDetails');
      // Add a small delay to ensure form is fully loaded
      await nextTick();
      // Fetch holdback invoice details to get PO/CO number
      await fetchHoldbackInvoiceDetails();
    } else {
      console.log('[VendorInvoiceForm] Watcher: Skipping fetch (already has PO/CO numbers)');
    }
  },
  { immediate: true }
);

// Watch for po_co_uuid to fetch PO/CO number when it's set but number is missing
// This handles the case where po_co_uuid is set but po_number/co_number are empty
watch(
  [() => props.form.po_co_uuid, () => props.form.po_number, () => props.form.co_number, () => props.form.invoice_type, () => props.form.uuid, () => props.editingInvoice],
  async ([newPoCoUuid, newPoNumber, newCoNumber, invoiceType, uuid, editingInvoice], [oldPoCoUuid]) => {
    console.log('[VendorInvoiceForm] po_co_uuid watcher triggered', {
      newPoCoUuid,
      oldPoCoUuid,
      newPoNumber,
      newCoNumber,
      invoiceType,
      uuid,
      editingInvoice
    });
    
    // Only for holdback invoices
    if (String(invoiceType || '').toUpperCase() !== 'AGAINST_HOLDBACK_AMOUNT') {
      console.log('[VendorInvoiceForm] po_co_uuid watcher: Not AGAINST_HOLDBACK_AMOUNT, skipping');
      return;
    }
    
    // Only for existing invoices
    if (!uuid || !editingInvoice) {
      console.log('[VendorInvoiceForm] po_co_uuid watcher: Not existing invoice, skipping', {
        hasUuid: !!uuid,
        isEditing: !!editingInvoice
      });
      return;
    }
    
    // Only if po_co_uuid is set and changed
    if (!newPoCoUuid || newPoCoUuid === oldPoCoUuid) {
      console.log('[VendorInvoiceForm] po_co_uuid watcher: po_co_uuid not set or unchanged, skipping', {
        hasPoCoUuid: !!newPoCoUuid,
        changed: newPoCoUuid !== oldPoCoUuid
      });
      return;
    }
    
    // Only if PO/CO number is missing
    const poNumberEmpty = !newPoNumber || String(newPoNumber).trim() === '';
    const coNumberEmpty = !newCoNumber || String(newCoNumber).trim() === '';
    
    console.log('[VendorInvoiceForm] po_co_uuid watcher: Checking if numbers are missing', {
      poNumberEmpty,
      coNumberEmpty
    });
    
    if (!poNumberEmpty && !coNumberEmpty) {
      console.log('[VendorInvoiceForm] po_co_uuid watcher: Already has numbers, skipping');
      return; // Already has numbers
    }
    
    console.log('[VendorInvoiceForm] po_co_uuid watcher: Fetching PO/CO number', {
      po_co_uuid: newPoCoUuid,
      po_number: newPoNumber,
      co_number: newCoNumber
    });
    
    // Extract UUID from po_co_uuid (format: "PO:uuid" or "CO:uuid")
    if (newPoCoUuid.startsWith('PO:')) {
      const poUuid = newPoCoUuid.replace(/^PO:/, '').trim();
      if (poUuid && poNumberEmpty) {
        try {
          console.log('[VendorInvoiceForm] Fetching PO number for:', poUuid);
          const poResponse = await $fetch<{ data: any }>(`/api/purchase-order-forms/${poUuid}`);
          const poNumber = poResponse?.data?.po_number || '';
          if (poNumber) {
            console.log('[VendorInvoiceForm] Fetched PO number:', poNumber);
            const updatedForm = { ...props.form };
            updatedForm.po_number = poNumber;
            emit('update:form', updatedForm);
          }
        } catch (error) {
          console.warn('[VendorInvoiceForm] Error fetching PO number:', error);
        }
      }
    } else if (newPoCoUuid.startsWith('CO:')) {
      const coUuid = newPoCoUuid.replace(/^CO:/, '').trim();
      if (coUuid && coNumberEmpty) {
        try {
          console.log('[VendorInvoiceForm] Fetching CO number for:', coUuid);
          const coResponse = await $fetch<{ data: any }>(`/api/change-orders/${coUuid}`);
          const coNumber = coResponse?.data?.co_number || '';
          if (coNumber) {
            console.log('[VendorInvoiceForm] Fetched CO number:', coNumber);
            const updatedForm = { ...props.form };
            updatedForm.co_number = coNumber;
            emit('update:form', updatedForm);
          }
        } catch (error) {
          console.warn('[VendorInvoiceForm] Error fetching CO number:', error);
        }
      }
    }
  },
  { immediate: true }
);

watch(
  [() => props.form.purchase_order_uuid, () => props.form.change_order_uuid, () => props.form.invoice_type],
  ([newPurchaseOrderUuid, newChangeOrderUuid, invoiceType], [oldPurchaseOrderUuid, oldChangeOrderUuid, oldInvoiceType]) => {
    // Skip if we're currently updating from POCOSelect to avoid circular updates
    if (isUpdatingFromPOCOSelect.value) {
      return;
    }
    
    // Only update if we're in "Against Advance Payment" mode (not "Against PO")
    const isAgainstAdvancePayment = String(invoiceType || '').toUpperCase() === 'AGAINST_ADVANCE_PAYMENT';
    const isAgainstPO = String(invoiceType || '').toUpperCase() === 'AGAINST_PO';
    
    // Skip if we're in Against PO mode - handlePOCOChangeForPO handles that
    if (isAgainstPO) {
      return;
    }
    
    if (isAgainstAdvancePayment) {
      // Only update po_co_uuid if it's not already set correctly (to avoid circular updates)
      const currentPoCoUuid = props.form.po_co_uuid;
      
      // If purchase_order_uuid is set and po_co_uuid doesn't match, update it
      if (newPurchaseOrderUuid && currentPoCoUuid !== `PO:${newPurchaseOrderUuid}`) {
        handleFormUpdate('po_co_uuid', `PO:${newPurchaseOrderUuid}`);
      }
      // If change_order_uuid is set and po_co_uuid doesn't match, update it
      else if (newChangeOrderUuid && currentPoCoUuid !== `CO:${newChangeOrderUuid}`) {
        handleFormUpdate('po_co_uuid', `CO:${newChangeOrderUuid}`);
      }
      // If both are cleared, clear po_co_uuid
      else if (!newPurchaseOrderUuid && !newChangeOrderUuid && (oldPurchaseOrderUuid || oldChangeOrderUuid)) {
        handleFormUpdate('po_co_uuid', null);
      }
    }
  },
  { immediate: true } // Run immediately when component mounts to handle initial load
);

// Watch for advance payment cost codes changes to update amount and financial_breakdown
// Watch the array directly to catch all changes including initial mount
// Use a flag to track if this is the initial load of an existing invoice
const isInitialLoad = ref(true);

// Reset initial load flag when switching between invoices
watch(
  () => props.form.uuid,
  (newUuid, oldUuid) => {
    // Reset initial load flag when UUID changes (including when reopening after closing)
    // This ensures proper initialization when reopening the same or different invoice
    // Also reset when UUID becomes undefined (form is closed/reset)
    if (newUuid !== oldUuid) {
      // Always reset initial load flag when UUID changes
      isInitialLoad.value = true;
      // Reset the updating flag when form is closed/reset
      if (!newUuid) {
        isUpdatingAdvancePaymentAmount.value = false;
      } else {
        // When opening a new invoice, ensure updating flag is reset
        // Use nextTick to ensure this happens after other watchers
        nextTick(() => {
          isUpdatingAdvancePaymentAmount.value = false;
        });
      }
    }
  },
  { immediate: false }
);

watch(
  () => props.form.advance_payment_cost_codes,
  (newCostCodes, oldCostCodes) => {
    // Skip if we're already updating to prevent recursive updates
    if (isUpdatingAdvancePaymentAmount.value) {
      return;
    }
    
    // Skip if invoice type is not advance payment
    if (!isAgainstAdvancePayment.value) {
      return;
    }
    
    // Skip if form is being closed/reset (no UUID and no cost codes)
    if (!props.form.uuid && (!newCostCodes || !Array.isArray(newCostCodes) || newCostCodes.length === 0)) {
      return;
    }
    
    // For existing invoices, we still need to update the financial breakdown
    // to ensure item_total and total_invoice_amount match the current advance payment total
    const isExistingInvoice = props.form.uuid && props.editingInvoice;
    
    // Check if cost codes just became available (were empty/undefined, now have data)
    // This handles the case when reopening an invoice and cost codes are loaded asynchronously
    const wasEmpty = !oldCostCodes || !Array.isArray(oldCostCodes) || oldCostCodes.length === 0;
    const isNowAvailable = Array.isArray(newCostCodes) && newCostCodes.length > 0;
    const costCodesBecameAvailable = wasEmpty && isNowAvailable;
    
    // Check if this is initial load BEFORE setting it to false
    const isInitialLoadOfExisting = isInitialLoad.value && isExistingInvoice;
    
    const newTotal = advancePaymentTotal.value;
    const currentAmount = props.form.amount || 0;
    
    // For existing invoices on initial load, always update to ensure financial breakdown is correct
    // For subsequent changes, only update if the total actually changed
    // Also update if financial breakdown is missing or incomplete
    // Also update if cost codes just became available (reopening case)
    const hasFinancialBreakdown = props.form.financial_breakdown && 
      typeof props.form.financial_breakdown === 'object' &&
      props.form.financial_breakdown.totals &&
      props.form.financial_breakdown.totals.item_total !== null &&
      props.form.financial_breakdown.totals.item_total !== undefined &&
      props.form.financial_breakdown.totals.tax_total !== null &&
      props.form.financial_breakdown.totals.tax_total !== undefined;
    
    const currentItemTotal = props.form.financial_breakdown?.totals?.item_total || 0;
    const totalsMatch = Math.abs(currentItemTotal - newTotal) < 0.01;
    
    const shouldUpdate = isInitialLoadOfExisting || 
      costCodesBecameAvailable ||
      !hasFinancialBreakdown ||
      !totalsMatch ||
      Math.abs(newTotal - currentAmount) > 0.01;
    
    if (shouldUpdate && newTotal > 0) {
      isUpdatingAdvancePaymentAmount.value = true;
      try {
        handleFormUpdate('amount', newTotal);
        // Update financial breakdown - this will trigger FinancialBreakdown component to recalculate
        updateFinancialBreakdownForAdvancePayment(newTotal, true); // Pass skipGuard=true since we already have guard
        // Use nextTick to ensure the update is processed and FinancialBreakdown component can detect the change
        nextTick(() => {
          // FinancialBreakdown component should now recalculate with the updated item_total
        });
      } finally {
        // Mark initial load as complete AFTER update (but only if we have cost codes)
        if (isInitialLoad.value && isNowAvailable) {
          isInitialLoad.value = false;
        }
        // Reset flag after a short delay to allow the update to complete
        nextTick(() => {
          isUpdatingAdvancePaymentAmount.value = false;
        });
      }
    } else if (isInitialLoad.value && isNowAvailable && hasFinancialBreakdown && totalsMatch) {
      // Even if we don't update, mark initial load as complete if everything is already correct
      isInitialLoad.value = false;
    }
  },
  { immediate: true, deep: true } // Immediate and deep watch to catch initial values and nested property changes
);

// Handle adjusted amount change from AdvancePaymentBreakdownTable
const handleAdjustedAmountChange = (advancePaymentUuid: string, costCode: any, amount: number | null) => {
  // This is handled by handleAdjustedAmountsUpdate, but we keep it for individual change tracking if needed
  // The parent component will receive the full update via adjusted-amounts-update event
};

// Calculate total adjusted amount from adjusted advance payment amounts
const totalAdjustedAdvancePayment = computed(() => {
  let total = 0;
  Object.values(adjustedAdvancePaymentAmounts.value).forEach((costCodeAmounts) => {
    Object.values(costCodeAmounts).forEach((amount) => {
      total += amount || 0;
    });
  });
  return total;
});

// Handle adjusted amounts update from AdvancePaymentBreakdownTable
const handleAdjustedAmountsUpdate = (adjustedAmounts: Record<string, Record<string, number>>) => {
  // Set guard to prevent watcher from overwriting this update
  isUpdatingAdjustedAmounts.value = true;
  
  // Deep copy to ensure Vue reactivity works properly with nested objects
  const deepCopiedAmounts: Record<string, Record<string, number>> = JSON.parse(JSON.stringify(adjustedAmounts));
  adjustedAdvancePaymentAmounts.value = deepCopiedAmounts;
  
  // Force trigger reactivity to ensure computed properties update
  triggerRef(adjustedAdvancePaymentAmounts);
  
  // Calculate total adjusted amount
  let totalAdjusted = 0;
  Object.values(deepCopiedAmounts).forEach((costCodeAmounts) => {
    Object.values(costCodeAmounts).forEach((amount) => {
      totalAdjusted += amount || 0;
    });
  });
  
  // If there are adjusted amounts, we should also track which advance payment is being adjusted
  // Find the first advance payment UUID that has adjustments
  const firstAdjustedPaymentUuid = Object.keys(deepCopiedAmounts).find(uuid => 
    Object.keys(deepCopiedAmounts[uuid] || {}).length > 0
  );
  
  // IMPORTANT: Emit both fields in a SINGLE update to avoid race condition
  // When calling handleFormUpdate twice in sequence, the second call may use stale props.form
  // because Vue reactivity hasn't propagated the first update yet
  const updatedFields: Record<string, any> = {
    adjusted_advance_payment_amounts: deepCopiedAmounts,
    adjusted_advance_payment_uuid: (firstAdjustedPaymentUuid && totalAdjusted > 0) 
      ? firstAdjustedPaymentUuid 
      : null
  };
  
  // Emit a single update with both fields
  emit('update:form', { 
    ...props.form, 
    ...updatedFields 
  });
  
  // Reset guard after a short delay to allow the form update to complete
  nextTick(() => {
    isUpdatingAdjustedAmounts.value = false;
  });
};

// Watch for form UUID and invoice type changes to ensure financial breakdown is initialized
// This handles the case when reopening an existing advance payment invoice
watch(
  [() => props.form.uuid, () => props.form.invoice_type, () => props.editingInvoice],
  ([newUuid, newInvoiceType, newEditingInvoice], [oldUuid, oldInvoiceType, oldEditingInvoice]) => {
    // Skip if form is being closed/reset (UUID becomes undefined)
    if (!newUuid) {
      return;
    }
    
    // Only handle advance payment invoices
    if (String(newInvoiceType || '').toUpperCase() !== 'AGAINST_ADVANCE_PAYMENT') {
      return;
    }
    
    // Only handle existing invoices that are being edited
    const isExistingInvoice = newUuid && newEditingInvoice;
    if (!isExistingInvoice) {
      return;
    }
    
    // Check if UUID changed (reopening an invoice) or invoice type changed to advance payment
    // UUID changed when: going from undefined/null to a UUID (opening), or from one UUID to another (switching)
    const uuidChanged = newUuid !== oldUuid && newUuid;
    const invoiceTypeChanged = newInvoiceType !== oldInvoiceType && 
      String(newInvoiceType || '').toUpperCase() === 'AGAINST_ADVANCE_PAYMENT';
    
    if (uuidChanged || invoiceTypeChanged) {
      // Reset initial load flag when UUID changes (this should already be set by UUID watcher, but ensure it)
      isInitialLoad.value = true;
      
      // Wait for data to be loaded - use multiple ticks to ensure advance_payment_cost_codes are available
      nextTick(() => {
        nextTick(() => {
          // Check if advance payment cost codes are available
          const costCodes = Array.isArray(props.form.advance_payment_cost_codes) 
            ? props.form.advance_payment_cost_codes 
            : [];
          
          if (costCodes.length > 0) {
            const advanceTotal = advancePaymentTotal.value;
            
            // Check if financial breakdown needs initialization
            const hasFinancialBreakdown = props.form.financial_breakdown && 
              typeof props.form.financial_breakdown === 'object' &&
              props.form.financial_breakdown.totals &&
              props.form.financial_breakdown.totals.item_total !== null &&
              props.form.financial_breakdown.totals.item_total !== undefined &&
              props.form.financial_breakdown.totals.tax_total !== null &&
              props.form.financial_breakdown.totals.tax_total !== undefined;
            
            const currentItemTotal = props.form.financial_breakdown?.totals?.item_total || 0;
            
            // Initialize if financial breakdown is missing, incomplete, or if totals don't match
            if (!hasFinancialBreakdown || Math.abs(currentItemTotal - advanceTotal) > 0.01) {
              if (advanceTotal > 0 && !isUpdatingAdvancePaymentAmount.value) {
                isUpdatingAdvancePaymentAmount.value = true;
                try {
                  handleFormUpdate('amount', advanceTotal);
                  updateFinancialBreakdownForAdvancePayment(advanceTotal, true);
                } finally {
                  nextTick(() => {
                    isUpdatingAdvancePaymentAmount.value = false;
                  });
                }
              }
            }
          }
        });
      });
    }
  },
  { immediate: false } // Don't run immediately - let the advance_payment_cost_codes watcher handle initial load
);

// Watch for when advance_payment_cost_codes becomes available (for existing invoices)
// This handles the case when reopening an invoice and the cost codes are loaded asynchronously
watch(
  () => props.form.advance_payment_cost_codes,
  (newCostCodes, oldCostCodes) => {
    // Only handle advance payment invoices
    if (!isAgainstAdvancePayment.value) {
      return;
    }
    
    // Only handle existing invoices
    const isExistingInvoice = props.form.uuid && props.editingInvoice;
    if (!isExistingInvoice) {
      return;
    }
    
    // Check if cost codes just became available (were empty/undefined, now have data)
    const wasEmpty = !oldCostCodes || !Array.isArray(oldCostCodes) || oldCostCodes.length === 0;
    const isNowAvailable = Array.isArray(newCostCodes) && newCostCodes.length > 0;
    
    if (wasEmpty && isNowAvailable && isInitialLoad.value) {
      // Cost codes just became available - ensure financial breakdown is initialized
      const advanceTotal = advancePaymentTotal.value;
      if (advanceTotal > 0 && !isUpdatingAdvancePaymentAmount.value) {
        isUpdatingAdvancePaymentAmount.value = true;
        try {
          handleFormUpdate('amount', advanceTotal);
          updateFinancialBreakdownForAdvancePayment(advanceTotal, true);
        } finally {
          nextTick(() => {
            isUpdatingAdvancePaymentAmount.value = false;
            isInitialLoad.value = false;
          });
        }
      }
    }
  },
  { immediate: false, deep: true }
);

// Calculate holdback amount from percentage for PO invoices
// Holdback is calculated from: itemTotal + chargesTotal + taxTotal (before advance payment deduction)
// This needs to be reactive to changes in financial breakdown totals
const poHoldbackAmount = computed(() => {
  if (!isAgainstPO.value || !props.form.holdback) {
    return 0
  }
  
  // Get the base total (item total + charges + taxes) from financial breakdown
  // If financial breakdown is not available yet, calculate from poItemsTotal
  let baseTotal = poItemsTotal.value
  
  // Try to get charges and taxes from financial breakdown if available
  const financialBreakdown = props.form.financial_breakdown
  if (financialBreakdown) {
    let fb = financialBreakdown
    if (typeof fb === 'string') {
      try {
        fb = JSON.parse(fb)
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    if (fb && typeof fb === 'object' && fb.totals) {
      const itemTotal = parseNumericInput(fb.totals.item_total || poItemsTotal.value)
      const chargesTotal = parseNumericInput(fb.totals.charges_total || 0)
      const taxTotal = parseNumericInput(fb.totals.tax_total || 0)
      baseTotal = itemTotal + chargesTotal + taxTotal
    }
  }
  
  const holdbackPercentage = parseNumericInput(props.form.holdback)
  if (holdbackPercentage <= 0 || baseTotal <= 0) {
    return 0
  }
  
  return roundCurrencyValue((baseTotal * holdbackPercentage) / 100)
})

// Calculate holdback amount from percentage for CO invoices
// Holdback is calculated from: itemTotal + chargesTotal + taxTotal (before advance payment deduction)
// This needs to be reactive to changes in financial breakdown totals
const coHoldbackAmount = computed(() => {
  if (!isAgainstCO.value || !props.form.holdback) {
    return 0
  }
  
  // Get the base total (item total + charges + taxes) from financial breakdown
  // If financial breakdown is not available yet, calculate from coItemsTotal
  let baseTotal = coItemsTotal.value
  
  // Try to get charges and taxes from financial breakdown if available
  const financialBreakdown = props.form.financial_breakdown
  if (financialBreakdown) {
    let fb = financialBreakdown
    if (typeof fb === 'string') {
      try {
        fb = JSON.parse(fb)
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    if (fb && typeof fb === 'object' && fb.totals) {
      const itemTotal = parseNumericInput(fb.totals.item_total || coItemsTotal.value)
      const chargesTotal = parseNumericInput(fb.totals.charges_total || 0)
      const taxTotal = parseNumericInput(fb.totals.tax_total || 0)
      baseTotal = itemTotal + chargesTotal + taxTotal
    }
  }
  
  const holdbackPercentage = parseNumericInput(props.form.holdback)
  if (holdbackPercentage <= 0 || baseTotal <= 0) {
    return 0
  }
  
  return roundCurrencyValue((baseTotal * holdbackPercentage) / 100)
})

// Watch for financial_breakdown changes to sync amount for Against PO, Against CO, and Against Holdback Amount invoices
// For Against PO and Against CO, the FinancialBreakdown calculates: item_total (from invoice values) + charges + taxes - advances - holdbacks
// For Against Holdback Amount, the FinancialBreakdown calculates: item_total (from release amounts) + charges + taxes
// The calculated NET total is stored in financial_breakdown.totals.amount (via totalFieldName="amount")
watch(
  () => props.form.financial_breakdown,
  (newBreakdown) => {
    if ((isAgainstPO.value || isAgainstCO.value || isAgainstHoldback.value)) {
      // Parse financial_breakdown if it's a string
      let financialBreakdown = newBreakdown
      if (typeof financialBreakdown === 'string') {
        try {
          financialBreakdown = JSON.parse(financialBreakdown)
        } catch (e) {
          console.warn('[VendorInvoiceForm] Failed to parse financial_breakdown in watcher:', e)
          return
        }
      }
      
      if (financialBreakdown?.totals) {
        // For Against PO and Against CO, the FinancialBreakdown component sets totals.amount
        // (using totalFieldName="amount") which is the NET total after all deductions
        // For Against Holdback Amount, the FinancialBreakdown component sets totals.amount
        // which is the total after charges and taxes (release amounts + charges + taxes)
        // For backwards compatibility, also check total_invoice_amount (used in older saved invoices)
        const calculatedAmount = financialBreakdown.totals.amount ?? 
                           financialBreakdown.totals.total_invoice_amount
        
        // Only update if there's a valid calculated amount
        if (calculatedAmount !== null && calculatedAmount !== undefined && calculatedAmount !== '') {
          const calculatedAmountNum = parseNumericInput(calculatedAmount)
          const currentAmount = parseNumericInput(props.form.amount || 0)
          
          // Update amount to match the calculated total from FinancialBreakdown
          // For Against PO/CO: (invoice_item_total + charges + taxes - advances - holdbacks)
          // For Against Holdback Amount: (release_amount_total + charges + taxes)
          if (Math.abs(calculatedAmountNum - currentAmount) > 0.01) {
            handleFormUpdate('amount', calculatedAmountNum)
          }
        } else {
          // If calculated amount is null/undefined/empty, set amount to 0
          // This happens when there are no invoice values entered yet
          if (props.form.amount !== 0 && props.form.amount !== null) {
            handleFormUpdate('amount', 0)
          }
        }
      }
    }
  },
  { deep: true, immediate: true }
);

// Watch poItemsTotal to ensure FinancialBreakdown recalculates when invoice values change
// This matches the behavior of direct invoices where lineItemsTotal changes trigger recalculation
// The FinancialBreakdown component watches itemTotal prop and will automatically recalculate charges/taxes
watch(
  () => poItemsTotal.value,
  (newTotal, oldTotal) => {
    if (isAgainstPO.value && newTotal !== oldTotal) {
      // FinancialBreakdown component automatically watches itemTotal and recalculates
      // No manual intervention needed - same as direct invoices
    }
  }
);

// Watch coItemsTotal to ensure FinancialBreakdown recalculates when invoice values change
// This matches the behavior of PO invoices where poItemsTotal changes trigger recalculation
// The FinancialBreakdown component watches itemTotal prop and will automatically recalculate charges/taxes
watch(
  () => coItemsTotal.value,
  (newTotal, oldTotal) => {
    if (isAgainstCO.value && newTotal !== oldTotal) {
      // FinancialBreakdown component automatically watches itemTotal and recalculates
      // No manual intervention needed - same as PO invoices
    }
  }
);

// Watch poItems to sync invoice values to form.po_invoice_items for saving
// This ensures the invoice items are saved to the database when the form is submitted
const isUpdatingPOInvoiceItems = ref(false);
watch(
  () => poItems.value,
  (newItems) => {
    // Skip if we're already updating to prevent infinite loops
    if (isUpdatingPOInvoiceItems.value) return;
    
    if (isAgainstPO.value && Array.isArray(newItems) && newItems.length > 0) {
      // Convert poItems to po_invoice_items format for saving
      const poInvoiceItems = newItems.map((item: any, index: number) => ({
        order_index: index,
        po_item_uuid: item.po_item_uuid || item.id || null,
        cost_code_uuid: item.cost_code_uuid || null,
        cost_code_label: item.cost_code_label || null,
        cost_code_number: item.cost_code_number || '',
        cost_code_name: item.cost_code_name || '',
        division_name: item.division_name || null,
        item_type_uuid: item.item_type_uuid || null,
        item_type_label: item.item_type_label || '',
        item_uuid: item.item_uuid || null,
        item_name: item.item_name || item.description || '',
        description: item.description || '',
        model_number: item.model_number || '',
        location_uuid: item.location_uuid || null,
        location_label: item.location || item.location_label || null,
        unit_uuid: item.unit_uuid || null,
        unit_label: item.unit_label || '',
        invoice_quantity: item.invoice_quantity ?? item.po_quantity ?? null,
        invoice_unit_price: item.invoice_unit_price ?? item.po_unit_price ?? null,
        invoice_total: item.invoice_total ?? item.po_total ?? null,
        approval_checks: item.approval_checks || [],
        metadata: item.metadata || {}
      }));
      
      // Update form with po_invoice_items
      isUpdatingPOInvoiceItems.value = true;
      try {
        handleFormUpdate('po_invoice_items', poInvoiceItems);
      } finally {
        nextTick(() => {
          isUpdatingPOInvoiceItems.value = false;
        });
      }
    } else if (isAgainstPO.value && (!newItems || newItems.length === 0)) {
      // Clear po_invoice_items if no items
      isUpdatingPOInvoiceItems.value = true;
      try {
        handleFormUpdate('po_invoice_items', []);
      } finally {
        nextTick(() => {
          isUpdatingPOInvoiceItems.value = false;
        });
      }
    }
  },
  { deep: true }
);

// Watch coItems to sync invoice values to form.co_invoice_items for saving
// This ensures the invoice items are saved to the database when the form is submitted
watch(
  () => coItems.value,
  (newItems) => {
    // Skip if we're already updating to prevent infinite loops
    if (isUpdatingCOInvoiceItems.value) return;
    
    if (isAgainstCO.value && Array.isArray(newItems) && newItems.length > 0) {
      // Convert coItems to co_invoice_items format for saving
      const coInvoiceItems = newItems.map((item: any, index: number) => ({
        order_index: index,
        co_item_uuid: item.co_item_uuid || item.id || null,
        cost_code_uuid: item.cost_code_uuid || null,
        cost_code_label: item.cost_code_label || null,
        cost_code_number: item.cost_code_number || '',
        cost_code_name: item.cost_code_name || '',
        division_name: item.division_name || null,
        item_type_uuid: item.item_type_uuid || null,
        item_type_label: item.item_type_label || '',
        item_uuid: item.item_uuid || null,
        item_name: item.item_name || item.name || item.description || '',
        description: item.description || '',
        model_number: item.model_number || '',
        location_uuid: item.location_uuid || null,
        location_label: item.location || item.location_label || null,
        unit_uuid: item.unit_uuid || null,
        unit_label: item.unit_label || '',
        invoice_quantity: item.invoice_quantity !== null && item.invoice_quantity !== undefined ? item.invoice_quantity : null,
        invoice_unit_price: item.invoice_unit_price !== null && item.invoice_unit_price !== undefined ? item.invoice_unit_price : null,
        invoice_total: item.invoice_total !== null && item.invoice_total !== undefined ? item.invoice_total : null,
        metadata: item.metadata || {}
      }));
      
      // Update form with co_invoice_items
      isUpdatingCOInvoiceItems.value = true;
      try {
        handleFormUpdate('co_invoice_items', coInvoiceItems);
      } finally {
        nextTick(() => {
          isUpdatingCOInvoiceItems.value = false;
        });
      }
    } else if (isAgainstCO.value && (!newItems || newItems.length === 0)) {
      // Clear co_invoice_items if no items
      isUpdatingCOInvoiceItems.value = true;
      try {
        handleFormUpdate('co_invoice_items', []);
      } finally {
        nextTick(() => {
          isUpdatingCOInvoiceItems.value = false;
        });
      }
    }
  },
  { deep: true }
);

// Watch for PO items total changes - DO NOT auto-update amount for Against PO invoices
// For Against PO, the amount should only come from financial_breakdown.totals.total_invoice_amount
// or be manually entered by the user (for partial payments)
// This watcher is intentionally disabled for Against PO to allow partial payments

// Watch for line items changes to update amount (for direct invoices)
watch(
  () => lineItemsTotal.value,
  (newTotal) => {
    if (isDirectInvoice.value) {
      // Only update if financial breakdown is not being used
      // Financial breakdown will override this if it's active
      if (!props.form.financial_breakdown || 
          !props.form.financial_breakdown.totals || 
          !props.form.financial_breakdown.totals.total_invoice_amount) {
        handleFormUpdate('amount', newTotal);
      }
    }
  }
);

// Watch for bill date and credit days changes to auto-calculate due date
watch(
  [() => billDateValue.value, () => props.form.credit_days],
  ([newBillDate, newCreditDays], [oldBillDate, oldCreditDays]) => {
    // Skip if we're already updating to prevent recursive updates
    if (isUpdatingDueDate.value) {
      return;
    }
    
    // Only auto-calculate if both bill date and credit days are set
    if (newBillDate && newCreditDays) {
      // Check if due date was manually set (different from calculated)
      const calculatedDueDate = calculateDueDate(newBillDate, newCreditDays);
      if (calculatedDueDate) {
        // Calculate the new due date string
        const newDueDateString = `${calculatedDueDate.year}-${String(calculatedDueDate.month).padStart(2, '0')}-${String(calculatedDueDate.day).padStart(2, '0')}`;
        const newDueDateUTC = toUTCString(newDueDateString);
        
        // Get current due date from form (avoid reading computed property to prevent recursion)
        const currentDueDateUTC = props.form.due_date;
        
        // Calculate old due date if we had both old values
        let oldCalculatedDueDateUTC: string | null = null;
        if (oldBillDate && oldCreditDays) {
          const oldCalculated = calculateDueDate(oldBillDate, oldCreditDays);
          if (oldCalculated) {
            const oldDateString = `${oldCalculated.year}-${String(oldCalculated.month).padStart(2, '0')}-${String(oldCalculated.day).padStart(2, '0')}`;
            oldCalculatedDueDateUTC = toUTCString(oldDateString);
          }
        }
        
        // Check if bill date changed (by comparing the date strings)
        const billDateChanged = oldBillDate && newBillDate && 
          (oldBillDate.year !== newBillDate.year || 
           oldBillDate.month !== newBillDate.month || 
           oldBillDate.day !== newBillDate.day);
        
        // Check if credit days changed (handle empty/null/undefined cases)
        const creditDaysChanged = String(oldCreditDays || '') !== String(newCreditDays || '');
        
        // Update if:
        // 1. Due date is empty/null, OR
        // 2. Bill date changed (always recalculate when bill date changes), OR
        // 3. Credit days changed (always recalculate when credit days changes), OR
        // 4. Current due date matches the old calculated value (meaning it was auto-calculated, not manually set)
        const shouldUpdate = !currentDueDateUTC || 
                            billDateChanged ||
                            creditDaysChanged ||
                            (oldCalculatedDueDateUTC && currentDueDateUTC === oldCalculatedDueDateUTC);
        
        // Only update if the new value is different from current
        if (shouldUpdate && currentDueDateUTC !== newDueDateUTC) {
          isUpdatingDueDate.value = true;
          try {
            handleFormUpdate('due_date', newDueDateUTC);
          } finally {
            // Reset flag after a short delay to allow the update to complete
            nextTick(() => {
              isUpdatingDueDate.value = false;
            });
          }
        }
      }
    } else if (!newBillDate || !newCreditDays) {
      // If either bill date or credit days is cleared, clear due date only if it was auto-calculated
      // We can't easily determine if it was manually set, so we'll leave it as is to avoid clearing user input
    }
  },
  { flush: 'post' }
);

// Watch for uploaded files changes
watch(() => uploadedFiles.value, async () => {
  fileUploadError.value = null;

  if (uploadedFiles.value.length === 0) {
    return;
  }

  if (isUploading.value) {
    return;
  }

  const allowedTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
  ];
  const maxSize = 10 * 1024 * 1024; // 10MB

  for (const file of uploadedFiles.value) {
    if (!allowedTypes.includes(file.type)) {
      fileUploadError.value = "Invalid file type. Only PDF or image files are allowed.";
      uploadedFiles.value = [];
      return;
    }

    if (file.size > maxSize) {
      fileUploadError.value = "File size too large. Maximum size is 10MB.";
      uploadedFiles.value = [];
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

    if (props.editingInvoice && props.form.uuid) {
      try {
        const response = await $fetch<{
          attachments: any[];
          errors?: Array<{ fileName: string; error: string }>;
        }>("/api/vendor-invoices/documents/upload", {
          method: "POST",
          body: {
            invoice_uuid: props.form.uuid,
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
        console.error("Error uploading invoice files:", error);
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
    console.error("Error processing files:", error);
    fileUploadError.value = "Failed to process files. Please try again.";
  } finally {
    isUploading.value = false;
  }
}, { deep: true });

// Watch for form corporation_uuid changes to regenerate invoice number if needed
watch(
  () => props.form.corporation_uuid,
  async (newCorpUuid) => {
    if (newCorpUuid) {
      // Fetch cost code configurations for the new corporation (scoped to form)
      // Note: We don't fetch vendorInvoicesStore here to avoid polluting the global store
      // The form operates independently with its own corporation selection
      await Promise.allSettled([
        costCodeConfigurationsStore.fetchConfigurations(newCorpUuid, false, false),
      ]);
      
      // Regenerate invoice number if creating new invoice and number is empty
      if (!props.form.uuid && (!props.form.number || String(props.form.number).trim() === '')) {
        await generateInvoiceNumber();
      }
    }
  }
);

// Initialize
onMounted(async () => {
  // Initialize corporation_uuid from form or fallback to selected corporation
  // For new invoices, use the selected corporation from TopBar as default
  // For existing invoices, use the form's corporation_uuid
  // NOTE: The form's corporation selection is isolated from TopBar's selection
  if (!props.form.corporation_uuid && !props.form.uuid) {
    // New invoice: initialize with selected corporation from TopBar as default
    const selectedCorpUuid = corpStore.selectedCorporation?.uuid;
    if (selectedCorpUuid) {
      handleFormUpdate('corporation_uuid', selectedCorpUuid);
    }
  }
  
  // Use form's corporation_uuid, fallback to TopBar's only for initial load
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid;
  if (corpUuid) {
    await Promise.allSettled([
      vendorStore.fetchVendors(corpUuid),
      projectsStore.fetchProjectsMetadata(corpUuid),
      // Note: vendorInvoicesStore.fetchVendorInvoices is scoped to TopBar's corporation
      // We don't fetch it here to avoid polluting the global store
      // The form will fetch vendor invoices directly from API when needed
      costCodeConfigurationsStore.fetchConfigurations(corpUuid, false, false),
      // Fetch PO/CO data for the form's corporation so POCOSelect can use it
      // This ensures POCOSelect shows data for the form's corporation, not TopBar's
      purchaseOrdersStore.fetchPurchaseOrders(corpUuid, false), // Don't force refresh on mount
      changeOrdersStore.fetchChangeOrders(corpUuid, false), // Don't force refresh on mount
    ]);
    
    // If project is already selected, ensure project resources are loaded
    // This uses purchaseOrderResourcesStore which is scoped to the form's corporation
    // This ensures POItemsTableWithEstimates has cost codes, item types, and preferred items
    if (props.form.project_uuid) {
      await purchaseOrderResourcesStore.ensureProjectResources({
        corporationUuid: corpUuid,
        projectUuid: props.form.project_uuid,
      });
    }
  }
  
  // Wait for all async operations and computed values to be ready
  await nextTick();
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // Initialize amount based on invoice type first (before invoice number generation)
  // to ensure it's set correctly on mount
  // Skip this for existing invoices with populated financial_breakdown to preserve existing data
  if (isAgainstAdvancePayment.value) {
    const isExistingInvoice = props.form.uuid && props.editingInvoice;
    const total = advancePaymentTotal.value;
    
    // Check if financial_breakdown exists and has correct values
    const hasExistingFinancialBreakdown = props.form.financial_breakdown && 
      typeof props.form.financial_breakdown === 'object' &&
      props.form.financial_breakdown.totals &&
      props.form.financial_breakdown.totals.item_total !== null &&
      props.form.financial_breakdown.totals.item_total !== undefined &&
      props.form.financial_breakdown.totals.tax_total !== null &&
      props.form.financial_breakdown.totals.tax_total !== undefined;
    
    // Check if totals match
    const currentItemTotal = props.form.financial_breakdown?.totals?.item_total || 0;
    const totalsMatch = Math.abs(currentItemTotal - total) < 0.01;
    
    // Update on mount if:
    // 1. New invoice (always initialize)
    // 2. Existing invoice without financial breakdown
    // 3. Existing invoice where totals don't match
    if (!isExistingInvoice || !hasExistingFinancialBreakdown || !totalsMatch) {
      // Always update on mount if there's a total, regardless of current amount
      // The watcher will handle subsequent changes
      if (total > 0) {
        isUpdatingAdvancePaymentAmount.value = true;
        try {
          handleFormUpdate('amount', total);
          updateFinancialBreakdownForAdvancePayment(total, true); // Pass skipGuard=true since we already have guard
        } finally {
          nextTick(() => {
            isUpdatingAdvancePaymentAmount.value = false;
          });
        }
      }
    } else if (isExistingInvoice && hasExistingFinancialBreakdown) {
      // Even if totals match, ensure tax_total is 0 (not null) for advance payments
      const taxTotal = props.form.financial_breakdown.totals.tax_total;
      if (taxTotal === null || taxTotal === undefined) {
        isUpdatingAdvancePaymentAmount.value = true;
        try {
          updateFinancialBreakdownForAdvancePayment(total, true);
        } finally {
          nextTick(() => {
            isUpdatingAdvancePaymentAmount.value = false;
          });
        }
      }
    }
  } else if (isDirectInvoice.value) {
    const total = lineItemsTotal.value;
    if (total > 0) {
      handleFormUpdate('amount', total);
    }
  }
  
  // If creating and number empty, generate initial number (after amount is set)
  if (!props.form.uuid && (!props.form.number || String(props.form.number).trim() === '')) {
    await generateInvoiceNumber();
  }
  
  // If loading an existing invoice with Against PO type and PO selected, fetch PO items
  if (isAgainstPO.value && props.form.purchase_order_uuid) {
    await fetchPOItems(props.form.purchase_order_uuid);
  }
  
  // If loading an existing holdback invoice, fetch the holdback invoice details to get PO/CO number
  if (isAgainstHoldback.value && props.form.holdback_invoice_uuid && props.form.uuid && props.editingInvoice) {
    console.log('[VendorInvoiceForm] onMounted: Calling fetchHoldbackInvoiceDetails', {
      isAgainstHoldback: isAgainstHoldback.value,
      holdback_invoice_uuid: props.form.holdback_invoice_uuid,
      uuid: props.form.uuid,
      editingInvoice: props.editingInvoice,
      current_po_number: props.form.po_number,
      current_co_number: props.form.co_number
    });
    await fetchHoldbackInvoiceDetails();
  }
  
  // Also check if po_co_uuid is set but po_number/co_number are missing (for holdback invoices)
  if (isAgainstHoldback.value && props.form.po_co_uuid && props.form.uuid && props.editingInvoice) {
    const poNumberEmpty = !props.form.po_number || String(props.form.po_number).trim() === '';
    const coNumberEmpty = !props.form.co_number || String(props.form.co_number).trim() === '';
    
    if (poNumberEmpty || coNumberEmpty) {
      console.log('[VendorInvoiceForm] onMounted: po_co_uuid is set but number is missing, fetching...', {
        po_co_uuid: props.form.po_co_uuid,
        po_number: props.form.po_number,
        co_number: props.form.co_number
      });
      
      // Extract UUID from po_co_uuid and fetch the number
      if (props.form.po_co_uuid.startsWith('PO:')) {
        const poUuid = props.form.po_co_uuid.replace(/^PO:/, '').trim();
        if (poUuid && poNumberEmpty) {
          try {
            console.log('[VendorInvoiceForm] onMounted: Fetching PO number for:', poUuid);
            const poResponse = await $fetch<{ data: any }>(`/api/purchase-order-forms/${poUuid}`);
            const poNumber = poResponse?.data?.po_number || '';
            if (poNumber) {
              console.log('[VendorInvoiceForm] onMounted: Fetched PO number:', poNumber);
              handleFormUpdate('po_number', poNumber);
            }
          } catch (error) {
            console.warn('[VendorInvoiceForm] onMounted: Error fetching PO number:', error);
          }
        }
      } else if (props.form.po_co_uuid.startsWith('CO:')) {
        const coUuid = props.form.po_co_uuid.replace(/^CO:/, '').trim();
        if (coUuid && coNumberEmpty) {
          try {
            console.log('[VendorInvoiceForm] onMounted: Fetching CO number for:', coUuid);
            const coResponse = await $fetch<{ data: any }>(`/api/change-orders/${coUuid}`);
            const coNumber = coResponse?.data?.co_number || '';
            if (coNumber) {
              console.log('[VendorInvoiceForm] onMounted: Fetched CO number:', coNumber);
              handleFormUpdate('co_number', coNumber);
            }
          } catch (error) {
            console.warn('[VendorInvoiceForm] onMounted: Error fetching CO number:', error);
          }
        }
      }
    }
  }
  
  // If loading an existing invoice with Against CO type and CO selected, fetch CO items
  if (isAgainstCO.value && props.form.change_order_uuid) {
    await fetchCOItems(props.form.change_order_uuid);
  }
  
  // Note: We don't need to manually initialize amount for Against PO/CO invoices in onMounted
  // The watch function on financial_breakdown (lines 3546-3591) handles syncing the amount
  // from financial_breakdown.totals.amount automatically, both for new and existing invoices
});

// Validation: Check for items with invoice quantity > to_be_invoiced
const parseNumericValue = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value).replace(/,/g, '').trim();
  if (!normalized) return 0;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
};

const overInvoicedItems = computed(() => {
  const items: any[] = [];
  
  // Check PO items
  if (isAgainstPO.value && Array.isArray(poItems.value)) {
    poItems.value.forEach((item: any, index: number) => {
      const toBeInvoiced = parseNumericValue(item.to_be_invoiced ?? 0);
      const invoiceQty = parseNumericValue(item.invoice_quantity ?? 0);
      
      if (toBeInvoiced > 0 && invoiceQty > toBeInvoiced) {
        items.push({
          ...item,
          index,
          to_be_invoiced: toBeInvoiced,
          invoice_quantity: invoiceQty,
          over_invoiced_quantity: invoiceQty - toBeInvoiced,
          source: 'PO'
        });
      }
    });
  }
  
  // Check CO items
  if (isAgainstCO.value && Array.isArray(coItems.value)) {
    coItems.value.forEach((item: any, index: number) => {
      const toBeInvoiced = parseNumericValue(item.to_be_invoiced ?? 0);
      const invoiceQty = parseNumericValue(item.invoice_quantity ?? 0);
      
      if (toBeInvoiced > 0 && invoiceQty > toBeInvoiced) {
        items.push({
          ...item,
          index,
          to_be_invoiced: toBeInvoiced,
          invoice_quantity: invoiceQty,
          over_invoiced_quantity: invoiceQty - toBeInvoiced,
          source: 'CO'
        });
      }
    });
  }
  
  return items;
});

const hasOverInvoicedItems = computed(() => overInvoicedItems.value.length > 0);

// Check if all items have to_be_invoiced === 0 (no items available to invoice)
const hasAllItemsZeroToBeInvoiced = computed(() => {
  // Only check for new invoices (not editing existing ones)
  if (props.form.uuid) return false;
  
  // Check PO items
  if (isAgainstPO.value && Array.isArray(poItems.value) && poItems.value.length > 0) {
    // Must have at least one item, and all items must have to_be_invoiced <= 0
    const allZero = poItems.value.every((item: any) => {
      const toBeInvoiced = parseNumericValue(item.to_be_invoiced ?? 0);
      return toBeInvoiced <= 0;
    });
    return allZero;
  }
  
  // Check CO items
  if (isAgainstCO.value && Array.isArray(coItems.value) && coItems.value.length > 0) {
    // Must have at least one item, and all items must have to_be_invoiced <= 0
    const allZero = coItems.value.every((item: any) => {
      const toBeInvoiced = parseNumericValue(item.to_be_invoiced ?? 0);
      return toBeInvoiced <= 0;
    });
    return allZero;
  }
  
  return false;
});

// Check for over-adjusted advance payment amounts
const hasAdvancePaymentValidationError = computed(() => {
  if (isAgainstPO.value && poAdvancePaymentBreakdownRef.value) {
    return poAdvancePaymentBreakdownRef.value.hasValidationError ?? false;
  }
  if (isAgainstCO.value && coAdvancePaymentBreakdownRef.value) {
    return coAdvancePaymentBreakdownRef.value.hasValidationError ?? false;
  }
  return false;
});

const overInvoicedValidationError = computed(() => {
  if (!hasOverInvoicedItems.value && !hasAdvancePaymentValidationError.value && !hasAllItemsZeroToBeInvoiced.value) return null;
  
  // If all items have zero to_be_invoiced, show specific error
  if (hasAllItemsZeroToBeInvoiced.value) {
    return "Cannot create invoice: All items have zero quantity available to be invoiced. All quantities have already been invoiced.";
  }
  
  const itemCount = overInvoicedItems.value.length;
  const itemsList = overInvoicedItems.value
    .map((item, idx) => {
      const itemName = item.item_name || item.name || item.description || `Item ${idx + 1}`;
      const toBeInvoiced = item.to_be_invoiced ?? 0;
      const invoiceQty = item.invoice_quantity ?? 0;
      return `"${itemName}" (To Be Invoiced: ${toBeInvoiced}, Invoice Qty: ${invoiceQty})`;
    })
    .join('; ');
  
  return `${itemCount} item(s) have invoice quantity greater than to be invoiced quantity. ${itemsList}`;
});

const hasValidationError = computed(() => hasOverInvoicedItems.value || hasAdvancePaymentValidationError.value || hasAllItemsZeroToBeInvoiced.value);

// Expose validation errors to parent component
defineExpose({
  overInvoicedItems,
  hasOverInvoicedItems,
  overInvoicedValidationError,
  hasAdvancePaymentValidationError,
  hasAllItemsZeroToBeInvoiced,
  hasValidationError,
});

</script>

