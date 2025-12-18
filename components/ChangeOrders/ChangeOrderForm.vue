<template>
  <div class="flex flex-col">
    <div class="flex gap-4">
      <!-- Left/Main Panel -->
      <div class="flex-1 min-w-0">
        <UCard variant="soft" class="mb-4">
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
        <!-- Skeleton Loaders -->
        <template v-if="loading">
          <!-- Corporation -->
          <div>
            <USkeleton class="h-3 w-20 mb-1" />
            <USkeleton class="h-9 w-full" />
          </div>
          <!-- Project Name -->
          <div>
            <USkeleton class="h-3 w-24 mb-1" />
            <USkeleton class="h-9 w-full" />
          </div>
          <!-- Vendor -->
          <div>
            <USkeleton class="h-3 w-16 mb-1" />
            <USkeleton class="h-9 w-full" />
          </div>
          <!-- Created Date -->
          <div>
            <USkeleton class="h-3 w-28 mb-1" />
            <USkeleton class="h-9 w-full" />
          </div>
          <!-- Change Order # -->
          <div>
            <USkeleton class="h-3 w-32 mb-1" />
            <USkeleton class="h-9 w-full" />
          </div>
          <!-- Ship To -->
          <div>
            <USkeleton class="h-3 w-16 mb-1" />
            <USkeleton class="h-[50px] w-full" />
          </div>
          <!-- Vendor Address -->
          <div>
            <USkeleton class="h-3 w-28 mb-1" />
            <USkeleton class="h-[50px] w-full" />
          </div>
          <!-- Credit Days -->
          <div>
            <USkeleton class="h-3 w-24 mb-1" />
            <USkeleton class="h-9 w-full" />
          </div>
          <!-- Est Delivery Date -->
          <div>
            <USkeleton class="h-3 w-32 mb-1" />
            <USkeleton class="h-9 w-full" />
          </div>
          <!-- Requested By -->
          <div>
            <USkeleton class="h-3 w-28 mb-1" />
            <USkeleton class="h-9 w-full" />
          </div>
          <!-- CO Type -->
          <div>
            <USkeleton class="h-3 w-20 mb-1" />
            <USkeleton class="h-9 w-full" />
          </div>
          <!-- Original Order -->
          <div>
            <USkeleton class="h-3 w-28 mb-1" />
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
          <!-- Shipping Instructions -->
          <div class="md:col-span-1 xl:col-span-1">
            <USkeleton class="h-3 w-40 mb-1" />
            <USkeleton class="h-16 w-full" />
          </div>
          <!-- Reason -->
          <div class="md:col-span-1 xl:col-span-1">
            <USkeleton class="h-3 w-16 mb-1" />
            <USkeleton class="h-16 w-full" />
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
            Project Name <span class="text-red-500">*</span>
          </label>
          <ProjectSelect
            :model-value="form.project_uuid"
            :corporation-uuid="form.corporation_uuid || corpStore.selectedCorporation?.uuid"
            :disabled="!form.corporation_uuid && !corpStore.selectedCorporation || isReadOnly"
            placeholder="Select project"
            size="sm"
            class="w-full"
            @update:model-value="handleProjectChange"
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
            :disabled="!form.corporation_uuid && !corpStore.selectedCorporation || isReadOnly"
            placeholder="Select vendor"
            size="sm"
            class="w-full"
            @update:model-value="onVendorUpdate"
            @change="onVendorUpdate"
          />
        </div>

        <!-- Created Date -->
        <div>
          <label class="block text-xs font-medium text-default mb-1">
            Created Date <span class="text-red-500">*</span>
          </label>
          <UPopover v-model:open="createdDatePopoverOpen" :disabled="isReadOnly">
            <UButton 
              color="neutral" 
              variant="outline" 
              icon="i-heroicons-calendar-days"
              class="w-full justify-start"
              size="sm"
              :disabled="isReadOnly"
            >
              {{ createdDateDisplay }}
            </UButton>
            <template #content>
              <UCalendar v-model="createdDateValue" class="p-2" :disabled="isReadOnly" @update:model-value="createdDatePopoverOpen = false" />
            </template>
          </UPopover>
        </div>

          <!-- Change Order # -->
          <div>
            <label class="block text-xs font-medium text-default mb-1">
              Change Order #
            </label>
            <UInput
              :model-value="form.co_number"
              placeholder="Auto-generated"
              size="sm"
              class="w-full"
              icon="i-heroicons-hashtag"
              disabled
            />
          </div>

        <!-- Ship To (address) -->
        <div>
          <label class="block text-xs font-medium text-default mb-1">
            Ship To
          </label>
          <div class="p-2 bg-gray-50 dark:bg-gray-800 rounded-md text-xs text-muted min-h-[50px] border border-default">
            {{ shipToAddress || 'No address selected' }}
          </div>
        </div>

        <!-- Vendor Address -->
        <div>
          <label class="block text-xs font-medium text-default mb-1">
            Vendor Address
          </label>
          <div class="p-2 bg-gray-50 dark:bg-gray-800 rounded-md text-xs text-muted min-h-[50px] border border-default">
            {{ vendorAddressText || 'No vendor selected' }}
          </div>
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
            :disabled="isReadOnly"
          />
        </div>

        <!-- Est Delivery Date -->
        <div>
          <label class="block text-xs font-medium text-default mb-1">
            Est Delivery Date
          </label>
          <UPopover :disabled="isReadOnly">
            <UButton 
              color="neutral" 
              variant="outline" 
              icon="i-heroicons-calendar-days"
              class="w-full justify-start"
              size="sm"
              :disabled="isReadOnly"
            >
              {{ estDeliveryDateDisplay }}
            </UButton>
            <template #content>
              <UCalendar v-model="estDeliveryDateValue" class="p-2" :disabled="isReadOnly" />
            </template>
          </UPopover>
        </div>

        <!-- Requested By -->
        <div>
          <label class="block text-xs font-medium text-default mb-1">
            Requested By
          </label>
          <UserSelect
            :model-value="form.requested_by || null"
            :corporation-uuid="props.form.corporation_uuid || corpStore.selectedCorporation?.uuid || null"
            placeholder="Select team member"
            size="sm"
            :disabled="isReadOnly"
            @update:model-value="(v) => updateForm({ requested_by: v })"
          />
        </div>

        <!-- CO Type -->
        <div>
          <label class="block text-xs font-medium text-default mb-1">
            CO Type
          </label>
          <USelectMenu
            v-model="coTypeOption"
            :items="coTypeOptions"
            placeholder="Select CO type"
            size="sm"
            class="w-full"
            value-key="value"
            :disabled="isReadOnly"
          />
        </div>

        <!-- Original Order (PO for selected project) -->
        <div>
          <label class="block text-xs font-medium text-default mb-1">
            Original Order
          </label>
          <POSelectForCO
            :model-value="props.form.original_purchase_order_uuid"
            :corporation-uuid="props.form.corporation_uuid || corpStore.selectedCorporation?.uuid"
            :project-uuid="props.form.project_uuid"
            :vendor-uuid="props.form.vendor_uuid"
            :co-type="props.form.co_type"
            :disabled="!props.form.corporation_uuid || !props.form.project_uuid || !props.form.vendor_uuid || isReadOnly"
            placeholder="Select purchase order"
            size="sm"
            @update:model-value="(value) => updateForm({ original_purchase_order_uuid: value })"
          />
        </div>

        <!-- Ship Via -->
        <div>
          <label class="block text-xs font-medium text-default mb-1">
            Ship Via
          </label>
          <ShipViaSelect
            :model-value="shipViaDisplayValue"
            size="sm"
            class="w-full"
            :disabled="isReadOnly"
            @update:model-value="(v) => updateForm({ ship_via: v || '' })"
            @change="(opt) => updateForm({ ship_via_uuid: opt?.shipVia?.uuid || null })"
          />
        </div>

        <!-- Freight -->
        <div>
          <label class="block text-xs font-medium text-default mb-1">
            Freight
          </label>
          <FreightSelect
            :model-value="freightDisplayValue"
            size="sm"
            class="w-full"
            :disabled="isReadOnly"
            @update:model-value="(v) => updateForm({ freight: v || '' })"
            @change="(opt) => updateForm({ freight_uuid: opt?.freight?.uuid || null })"
          />
        </div>

        <!-- Shipping Instructions -->
        <div class="md:col-span-1 xl:col-span-1">
          <label class="block text-xs font-medium text-default mb-1">
            Shipping Instructions
          </label>
          <UTextarea
            :model-value="form.shipping_instructions"
            placeholder="Enter shipping instructions"
            size="sm"
            :rows="2"
            class="w-full"
            autoresize
            :disabled="isReadOnly"
            @update:model-value="(value) => updateForm({ shipping_instructions: value ?? '' })"
          />
        </div>

        <!-- Reason -->
        <div class="md:col-span-1 xl:col-span-1">
          <label class="block text-xs font-medium text-default mb-1">
            Reason
          </label>
          <UTextarea
            :model-value="form.reason || ''"
            placeholder="Reason for change order"
            size="sm"
            :rows="2"
            class="w-full"
            autoresize
            :disabled="isReadOnly"
            @update:model-value="(v) => updateForm({ reason: v || '' })"
          />
        </div>
        </template>
        </div>
        </UCard>
      </div>
    </div>

    <!-- Original Order Items (Change Order Entry) -->
    <div v-if="loading || form.original_purchase_order_uuid" class="mt-6">
      <!-- Skeleton for Items Table -->
      <template v-if="loading">
        <div class="rounded-xl border border-default bg-white dark:bg-gray-900/40 shadow-sm overflow-hidden">
          <div class="flex items-center justify-between gap-4 px-4 py-3 border-b border-default/70 bg-gray-50 dark:bg-gray-800">
            <div>
              <USkeleton class="h-4 w-40" />
              <USkeleton class="h-3 w-64 mt-1" />
            </div>
            <USkeleton class="h-4 w-16" />
          </div>
          <div class="hidden md:block">
            <table class="min-w-full table-fixed divide-y divide-default/60">
              <thead class="bg-muted/20 text-[11px] font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th class="w-1/12 px-4 py-2 text-left"><USkeleton class="h-3 w-20" /></th>
                  <th class="w-1/12 px-4 py-2 text-left"><USkeleton class="h-3 w-16" /></th>
                  <th class="w-1/12 px-4 py-2 text-right"><USkeleton class="h-3 w-20" /></th>
                  <th class="w-1/12 px-4 py-2 text-right"><USkeleton class="h-3 w-20" /></th>
                  <th class="w-1/12 px-4 py-2 text-right"><USkeleton class="h-3 w-20" /></th>
                  <th class="w-1/12 px-4 py-2 text-right"><USkeleton class="h-3 w-20" /></th>
                  <th class="w-1/12 px-4 py-2 text-right"><USkeleton class="h-3 w-16" /></th>
                  <th class="w-1/12 px-4 py-2 text-right"><USkeleton class="h-3 w-20" /></th>
                  <th class="w-1/12 px-4 py-2 text-right"><USkeleton class="h-3 w-16" /></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default/60">
                <tr v-for="i in 3" :key="i" class="align-middle">
                  <td class="px-2 py-2"><USkeleton class="h-4 w-24" /></td>
                  <td class="px-2 py-2"><USkeleton class="h-4 w-32" /></td>
                  <td class="px-2 py-2 text-right"><USkeleton class="h-4 w-16 ml-auto" /></td>
                  <td class="px-2 py-2 text-right"><USkeleton class="h-4 w-12 ml-auto" /></td>
                  <td class="px-2 py-2 text-right"><USkeleton class="h-4 w-20 ml-auto" /></td>
                  <td class="px-2 py-2 text-right"><USkeleton class="h-4 w-20 ml-auto" /></td>
                  <td class="px-2 py-2 text-right"><USkeleton class="h-4 w-16 ml-auto" /></td>
                  <td class="px-2 py-2 text-right"><USkeleton class="h-4 w-20 ml-auto" /></td>
                  <td class="px-2 py-2 text-right"><USkeleton class="h-4 w-8 ml-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
      
      <!-- Actual Items Table (Material CO) -->
      <COItemsTableFromOriginal
        v-else-if="form.co_type === 'MATERIAL'"
        :items="coDisplayItems"
        :loading="originalItemsLoading"
        :error="originalItemsError"
        title="Change Order Items"
        description="Original purchase order values shown for reference. Enter change order price and quantity."
        :readonly="isReadOnly"
        @co-unit-price-change="handleCoUnitPriceChange"
        @co-quantity-change="handleCoQuantityChange"
        @approval-checks-change="handleApprovalChecksChange"
        @remove-row="removeCoRow"
      />
      
      <!-- Labor CO Items Table -->
      <COLaborItemsTable
        v-else-if="form.co_type === 'LABOR'"
        :items="laborCODisplayItems"
        :loading="laborPOItemsLoading"
        :error="laborPOItemsError"
        title="Labor Change Order Items"
        description="Original purchase order amounts shown for reference. Enter change order amounts."
        :readonly="isReadOnly"
        @co-amount-change="handleLaborCoAmountChange"
        @remove-row="removeLaborCoRow"
      />
    </div>
    
    <div v-if="form.original_purchase_order_uuid && hasRemovedCoItems" class="mt-4 flex justify-end">
      <UButton
        size="xs"
        color="primary"
        variant="outline"
        icon="i-heroicons-arrow-path"
        class="self-start"
        @click="openRemovedCoItemsModal"
      >
        Show Removed Items ({{ removedCoItems.length }})
      </UButton>
    </div>
    
    <!-- File Upload and Total CO Amount Section (for Labor CO) -->
    <div v-if="(loading || form.original_purchase_order_uuid) && form.co_type === 'LABOR'" class="mt-6 flex flex-col lg:flex-row gap-6">
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
                  :disabled="isUploading || isReadOnly"
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
                Use the button above to add change order attachments.
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
                      icon="mingcute:delete-fill"
                      color="error"
                      variant="soft"
                      size="xs"
                      class="p-1 h-auto text-xs"
                      :disabled="isReadOnly"
                      @click.stop="removeFile(index)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </UCard>
        </template>
      </div>

      <!-- Total CO Amount (Right) -->
      <div class="w-full lg:flex-1 flex justify-start lg:justify-end">
        <div class="w-full lg:w-auto lg:min-w-[520px]">
          <!-- Skeleton for Total CO Amount -->
          <template v-if="loading">
            <div class="rounded-lg border border-default bg-elevated dark:bg-gray-800/40 px-6 py-3 shadow-sm">
              <div class="flex items-center justify-between">
                <USkeleton class="h-4 w-32" />
                <USkeleton class="h-6 w-24" />
              </div>
            </div>
          </template>
          
          <!-- Actual Total CO Amount -->
          <div
            v-else
            class="rounded-lg border border-default bg-elevated dark:bg-gray-800/40 px-6 py-3 shadow-sm"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-default">Total CO Amount:</span>
              <span class="text-lg font-semibold text-default font-mono">{{ formatCurrency(coItemTotal) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- File Upload and Financial Breakdown Section (for Material CO) -->
    <div v-if="(loading || form.original_purchase_order_uuid) && form.co_type === 'MATERIAL'" class="mt-6 flex flex-col lg:flex-row gap-6">
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
                  :disabled="isUploading || isReadOnly"
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
                Use the button above to add change order attachments.
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
                      icon="mingcute:delete-fill"
                      color="error"
                      variant="soft"
                      size="xs"
                      class="p-1 h-auto text-xs"
                      :disabled="isReadOnly"
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
      <div v-if="form.co_type === 'MATERIAL'" class="w-full lg:w-auto lg:flex-shrink-0 lg:min-w-[320px] lg:max-w-lg">
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
                :disabled="isReadOnly"
                @update:model-value="(value) => updateForm({ terms_and_conditions_uuid: value ?? null })"
              />
            </div>
          </UCard>
        </template>
      </div>

      <!-- Financial Breakdown (Right) -->
      <div class="w-full lg:flex-1 flex justify-start lg:justify-end">
        <div class="w-full lg:w-auto lg:min-w-[520px]">
          <!-- Skeleton for Financial Breakdown -->
          <template v-if="loading">
            <UCard
              variant="soft"
              class="w-full shadow-sm border border-default bg-white dark:bg-gray-900/40"
            >
              <div class="space-y-4">
                <div class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3">
                  <USkeleton class="h-4 w-32" />
                  <div></div>
                  <div></div>
                  <USkeleton class="h-4 w-20 ml-auto" />
                </div>
                <div class="space-y-2">
                  <div v-for="i in 4" :key="i" class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3">
                    <USkeleton class="h-4 w-24" />
                    <USkeleton class="h-8 w-20" />
                    <USkeleton class="h-8 w-24" />
                    <USkeleton class="h-4 w-16" />
                  </div>
                </div>
                <div class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3">
                  <USkeleton class="h-3 w-28" />
                  <div></div>
                  <div></div>
                  <USkeleton class="h-4 w-20 ml-auto" />
                </div>
                <div class="space-y-2">
                  <div v-for="i in 2" :key="i" class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3">
                    <USkeleton class="h-8 w-full" />
                    <USkeleton class="h-8 w-20" />
                    <USkeleton class="h-8 w-24" />
                    <div></div>
                  </div>
                </div>
                <div class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3">
                  <USkeleton class="h-3 w-24" />
                  <div></div>
                  <div></div>
                  <USkeleton class="h-4 w-20 ml-auto" />
                </div>
                <div class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3">
                  <USkeleton class="h-4 w-32" />
                  <div></div>
                  <div></div>
                  <USkeleton class="h-4 w-24 ml-auto" />
                </div>
              </div>
            </UCard>
          </template>
          
          <!-- Actual Financial Breakdown -->
          <FinancialBreakdown
            v-else
            :item-total="coItemTotal"
            :form-data="form"
            :read-only="isReadOnly"
            item-total-label="CO Item Total"
            total-label="Total CO Amount"
            total-field-name="total_co_amount"
            @update="handleFinancialUpdate"
          />
        </div>
      </div>
    </div>

    <!-- Removed CO Items Modal -->
    <UModal v-model:open="removedCoItemsModalOpen">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-base font-semibold">Removed Change Order Items</h3>
          <UButton icon="i-heroicons-x-mark" size="xs" variant="solid" color="neutral" @click="closeRemovedCoItemsModal" />
        </div>
      </template>
      <template #body>
        <div v-if="removedCoItems.length" class="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div
            v-for="(item, index) in removedCoItems"
            :key="`removed-co-${index}`"
            class="p-3 border border-default rounded-lg bg-elevated/40 dark:bg-elevated/20 flex flex-col gap-2"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="text-sm font-semibold text-default truncate">
                  {{ item.name || item.description || `Item ${index + 1}` }}
                </div>
                <div class="text-xs text-muted mt-1 space-x-2">
                  <span v-if="item.co_quantity !== null && item.co_quantity !== undefined">
                    Qty: {{ item.co_quantity }}
                  </span>
                  <span v-if="item.co_unit_price !== null && item.co_unit_price !== undefined">
                    Unit: {{ item.co_unit_price }}
                  </span>
                </div>
                <div v-if="item.removed_at" class="text-[11px] text-muted mt-1">
                  Removed: {{ item.removed_at }}
                </div>
              </div>
              <div class="flex flex-col items-end gap-2 shrink-0">
                <UButton size="xs" color="primary" variant="solid" @click="restoreRemovedCoItem(index)">
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
          <UButton color="neutral" variant="soft" @click="closeRemovedCoItemsModal">
            Close
          </UButton>
          <UButton
            v-if="removedCoItems.length"
            color="primary"
            variant="solid"
            icon="i-heroicons-arrow-uturn-left"
            @click="restoreAllRemovedCoItems"
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

    <!-- Terms and Conditions Preview -->
    <div v-if="form.co_type === 'MATERIAL' && selectedTermsAndCondition" class="mt-6">
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
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, nextTick } from 'vue'
import { CalendarDate, DateFormatter, getLocalTimeZone } from '@internationalized/date'
import { useCorporationStore } from '@/stores/corporations'
import { useProjectAddressesStore } from '@/stores/projectAddresses'
import { useProjectsStore } from '@/stores/projects'
import { useVendorStore } from '@/stores/vendors'
import { usePurchaseOrdersStore } from '@/stores/purchaseOrders'
import { useChangeOrderResourcesStore } from '@/stores/changeOrderResources'
import { useChangeOrdersStore } from '@/stores/changeOrders'
import CorporationSelect from '@/components/Shared/CorporationSelect.vue'
import ProjectSelect from '@/components/Shared/ProjectSelect.vue'
import VendorSelect from '@/components/Shared/VendorSelect.vue'
import POSelectForCO from '@/components/Shared/POSelectForCO.vue'
import ShipViaSelect from '@/components/Shared/ShipViaSelect.vue'
import FreightSelect from '@/components/Shared/FreightSelect.vue'
import UserSelect from '@/components/Shared/UserSelect.vue'
import FilePreview from '@/components/Shared/FilePreview.vue'
import COItemsTableFromOriginal from '@/components/ChangeOrders/COItemsTableFromOriginal.vue'
import COLaborItemsTable from '@/components/ChangeOrders/COLaborItemsTable.vue'
import FinancialBreakdown from '@/components/PurchaseOrders/FinancialBreakdown.vue'
import TermsAndConditionsSelect from '@/components/Shared/TermsAndConditionsSelect.vue'
import { ref } from 'vue'
import { useShipViaStore } from '@/stores/freight'
import { useFreightStore } from '@/stores/freightGlobal'
import { useCostCodeConfigurationsStore } from '@/stores/costCodeConfigurations'
import { useLaborChangeOrderResourcesStore } from '@/stores/laborChangeOrderResources'
import { useLaborChangeOrderItemsStore } from '@/stores/laborChangeOrderItems'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import { useUTCDateFormat } from '@/composables/useUTCDateFormat'
import { useTermsAndConditionsStore } from '@/stores/termsAndConditions'

interface Props {
  form: any
  loading?: boolean
  readonly?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  loading: false,
  readonly: false
})
const emit = defineEmits<{ 'update:form': [value: any] }>()

const corpStore = useCorporationStore()
const projectAddressesStore = useProjectAddressesStore()
const projectsStore = useProjectsStore()
const vendorStore = useVendorStore()
const purchaseOrdersStore = usePurchaseOrdersStore()
const changeOrderResourcesStore = useChangeOrderResourcesStore()
const changeOrdersStore = useChangeOrdersStore()
const shipViaStore = useShipViaStore()
const freightStore = useFreightStore()
const costCodeConfigurationsStore = useCostCodeConfigurationsStore()
const laborChangeOrderResourcesStore = useLaborChangeOrderResourcesStore()
const laborChangeOrderItemsStore = useLaborChangeOrderItemsStore()
const { formatCurrency } = useCurrencyFormat()
const { toUTCString, fromUTCString } = useUTCDateFormat()
const termsAndConditionsStore = useTermsAndConditionsStore()

const df = new DateFormatter('en-US', { dateStyle: 'medium' })


// --- Financial breakdown helpers (mirror PurchaseOrderForm pattern) ---
const normalizeFinancialBreakdown = (breakdown: unknown): Record<string, any> | null => {
  if (!breakdown) return null
  if (typeof breakdown === 'string') {
    try {
      const parsed = JSON.parse(breakdown)
      return typeof parsed === 'object' && parsed !== null ? parsed : null
    } catch {
      return null
    }
  }
  if (typeof breakdown === 'object') {
    return breakdown as Record<string, any>
  }
  return null
}

const applyFinancialBreakdownFromField = () => {
  const raw = (props.form as any)?.financial_breakdown ?? (props.form as any)?.financialBreakdown
  const breakdown = normalizeFinancialBreakdown(raw)
  if (!breakdown) return

  const charges = breakdown.charges ?? {}
  const salesTaxes = breakdown.sales_taxes ?? {}

  const updates: Record<string, any> = {}

  // Charges: freight, packing, custom_duties, other
  const chargeKeys = ['freight', 'packing', 'custom_duties', 'other'] as const
  chargeKeys.forEach((key) => {
    const entry = charges[key] ?? {}
    const pctKey = `${key}_charges_percentage`
    const amtKey = `${key}_charges_amount`
    const taxableKey = `${key}_charges_taxable`

    if ((props.form as any)[pctKey] === undefined && entry.percentage !== undefined && entry.percentage !== null) {
      updates[pctKey] = entry.percentage
    }
    if ((props.form as any)[amtKey] === undefined && entry.amount !== undefined && entry.amount !== null) {
      updates[amtKey] = entry.amount
    }
    if ((props.form as any)[taxableKey] === undefined && entry.taxable !== undefined && entry.taxable !== null) {
      updates[taxableKey] = entry.taxable
    }
  })

  // Sales taxes: sales_tax_1, sales_tax_2
  const salesKeys = ['sales_tax_1', 'sales_tax_2'] as const
  salesKeys.forEach((key) => {
    const entry = salesTaxes[key] ?? {}
    const pctKey = `${key}_percentage`
    const amtKey = `${key}_amount`

    if ((props.form as any)[pctKey] === undefined && entry.percentage !== undefined && entry.percentage !== null) {
      updates[pctKey] = entry.percentage
    }
    if ((props.form as any)[amtKey] === undefined && entry.amount !== undefined && entry.amount !== null) {
      updates[amtKey] = entry.amount
    }
  })

  if (Object.keys(updates).length > 0) {
    updateForm(updates)
  }
}

const isReadOnly = computed(() => {
  if (props.readonly) return true
  const status = String(props.form.status || '').trim().toLowerCase()
  // Form should be read-only for Approved, Partially_Received, or Completed statuses
  return status === 'approved' || status === 'partially_received' || status === 'completed'
})

// Selected terms and conditions for preview
const selectedTermsAndCondition = computed(() => {
  if (!props.form.terms_and_conditions_uuid) {
    return null
  }
  return termsAndConditionsStore.getTermsAndConditionById(props.form.terms_and_conditions_uuid) || null
})

const updateForm = (fields: Record<string, any>) => {
  // Prevent any further mutation once change order is approved
  if (isReadOnly.value) {
    return
  }
  // Ensure deep cloning for nested arrays to trigger reactivity
  const updatedForm = { ...props.form };
  Object.keys(fields).forEach(key => {
    if ((key === 'co_items' || key === 'removed_co_items' || key === 'labor_co_items') && Array.isArray(fields[key])) {
      // Always create a new array reference with deep-cloned items to ensure Vue tracks changes
      // This ensures that nested property changes (like co_unit_price, co_quantity) trigger reactivity
      updatedForm[key] = fields[key].map((item: any) => ({
        ...item,
        display_metadata: item.display_metadata ? { ...item.display_metadata } : {},
      }));
    } else {
      updatedForm[key] = fields[key];
    }
  });
  
  emit('update:form', updatedForm);
}

const handleCorporationChange = async (corporationUuid?: string | null) => {
  const normalizedCorporationUuid = corporationUuid || ''
  
  // Update corporation_uuid and clear dependent fields in a single update
  // This ensures the prop updates atomically and triggers ProjectSelect's watcher
  updateForm({ 
    corporation_uuid: normalizedCorporationUuid,
    project_uuid: '',
    vendor_uuid: '',
    original_purchase_order_uuid: '',
    shipping_address_uuid: ''
  })
  
  // Wait for next tick to ensure the form prop is updated before fetching
  await nextTick()
  
  // Fetch data for the selected corporation
  // NOTE: We do NOT update corpStore.selectedCorporation here to avoid affecting other components
  // The form operates independently with its own corporation selection
  // NOTE: We don't fetch projects here - ProjectSelect's internal watcher will handle it
  if (normalizedCorporationUuid) {
    await Promise.allSettled([
      vendorStore.fetchVendors(normalizedCorporationUuid),
      purchaseOrdersStore.fetchPurchaseOrders(normalizedCorporationUuid),
      changeOrdersStore.fetchChangeOrders(normalizedCorporationUuid),
    ])
  }
  
  // Auto-generate CO Number on corporation selection if not set
  if (normalizedCorporationUuid) {
    generateCONumber()
  }
}

const handleProjectChange = async (projectUuid?: string | null) => {
  const normalized = projectUuid || ''
  updateForm({ project_uuid: normalized })
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid
  if (normalized && corpUuid) {
    try {
      await projectAddressesStore.fetchAddresses(normalized)
      const addresses = projectAddressesStore.getAddresses(normalized) as any[] | undefined
      const primary = Array.isArray(addresses) && addresses.length
        ? (addresses.find(a => a.is_primary) || addresses[0])
        : null
      if (primary?.uuid) {
        updateForm({ shipping_address_uuid: primary.uuid })
      }
    } catch (e) {
      // no-op
    }
  }
  // Auto-generate CO Number on project selection if not set
  if (normalized) {
    generateCONumber()
  }
}

const onVendorUpdate = (v: any) => {
  const value = typeof v === 'string' ? v : (v && v.value) ? String(v.value) : ''
  updateForm({ vendor_uuid: value })
}

// Generate next CO number with pattern CO-<n>, starting at 1
function generateCONumber() {
  // Do not override if already set (e.g., editing)
  if (props.form.co_number && String(props.form.co_number).trim() !== '') return
  // Use form's corporation_uuid, fallback to store's selectedCorporation
  const corporationId = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid
  if (!corporationId) return

  // Ensure change orders are available in store
  const existing = (changeOrdersStore.changeOrders || []).filter((co: any) => co.corporation_uuid === corporationId)
  let maxNum = 0
  for (const co of existing) {
    // Extract numeric part from both CO-000001 and CO-1 formats
    const coNumber = String(co.co_number || '').replace(/^CO-/i, '')
    const num = parseInt(coNumber, 10)
    if (!isNaN(num)) maxNum = Math.max(maxNum, num)
  }
  const next = maxNum + 1
  // Generate in simple format: CO-1, CO-2, CO-3, etc.
  updateForm({ co_number: `CO-${next}` })
}

// Dates
const createdDateValue = computed({
  get: () => {
    const src = String(props.form.created_date || '')
    if (!src) return null
    const base = src.includes('T') ? src.substring(0, src.indexOf('T')) : src
    const ymd = base.split('-')
    const [y, m, d] = ymd.length === 3 ? (ymd as [string, string, string]) : [undefined, undefined, undefined] as any
    if (typeof y === 'string' && typeof m === 'string' && typeof d === 'string') {
      const year = parseInt(y, 10)
      const month = parseInt(m, 10)
      const day = parseInt(d, 10)
      return new CalendarDate(year, month, day)
    }
    return null
  },
  set: (val: CalendarDate | null) => {
    if (val) {
      const s = `${val.year}-${String(val.month).padStart(2, '0')}-${String(val.day).padStart(2, '0')}`
      updateForm({ created_date: `${s}T00:00:00.000Z` })
    } else {
      updateForm({ created_date: null })
    }
  }
})
const createdDateDisplay = computed(() => {
  if (!createdDateValue.value) return 'Select created date'
  return df.format((createdDateValue.value as CalendarDate).toDate(getLocalTimeZone()))
})

const estDeliveryDateValue = computed({
  get: () => {
    const src = String(props.form.estimated_delivery_date || '')
    if (!src) return null
    const base = src.includes('T') ? src.substring(0, src.indexOf('T')) : src
    const ymd = base.split('-')
    const [y, m, d] = ymd.length === 3 ? (ymd as [string, string, string]) : [undefined, undefined, undefined] as any
    if (typeof y === 'string' && typeof m === 'string' && typeof d === 'string') {
      const year = parseInt(y, 10)
      const month = parseInt(m, 10)
      const day = parseInt(d, 10)
      return new CalendarDate(year, month, day)
    }
    return null
  },
  set: (val: CalendarDate | null) => {
    if (val) {
      const s = `${val.year}-${String(val.month).padStart(2, '0')}-${String(val.day).padStart(2, '0')}`
      updateForm({ estimated_delivery_date: `${s}T23:59:59.000Z` })
    } else {
      updateForm({ estimated_delivery_date: null })
    }
  }
})
const estDeliveryDateDisplay = computed(() => {
  if (!estDeliveryDateValue.value) return 'Select delivery date'
  return df.format((estDeliveryDateValue.value as CalendarDate).toDate(getLocalTimeZone()))
})

// Guard flag to prevent recursive updates when calculating estimated delivery date
const isUpdatingEstimatedDeliveryDate = ref(false)
const createdDatePopoverOpen = ref(false)

// Auto-calculate estimated delivery date when created date or credit days change
const calculateEstimatedDeliveryDate = (createdDate: CalendarDate | null, creditDays: string | null) => {
  if (!createdDate || !creditDays) return null;
  
  const creditDaysMap: Record<string, number> = {
    'NET_15': 15,
    'NET_25': 25,
    'NET_30': 30,
    'NET_45': 45,
    'NET_60': 60,
  };
  
  const days = creditDaysMap[String(creditDays).toUpperCase()] || 30;
  const estimatedDeliveryDate = createdDate.add({ days });
  return estimatedDeliveryDate;
};

// Country code helper (limited map similar to PO form)
const getCountryName = (countryCode: string): string => {
  if (!countryCode) return ''
  const countryMap: Record<string, string> = {
    US: 'UNITED STATES OF AMERICA',
    CA: 'CANADA',
    GB: 'UNITED KINGDOM',
    AU: 'AUSTRALIA',
    MX: 'MEXICO'
  }
  return countryMap[countryCode.toUpperCase()] || countryCode.toUpperCase()
}

// Vendor address block (display only)
const vendorAddressText = computed(() => {
  if (props.form.vendor_uuid) {
    const vendor = vendorStore.vendors.find(v => v.uuid === props.form.vendor_uuid)
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

onMounted(async () => {
  // Initialize corporation_uuid in form if not set
  if (!props.form.corporation_uuid && corpStore.selectedCorporation?.uuid) {
    updateForm({ corporation_uuid: corpStore.selectedCorporation.uuid })
  }
  
  // NOTE: We do NOT update corpStore.selectedCorporation here to avoid affecting other components
  // The form operates independently with its own corporation selection (props.form.corporation_uuid)
  
  // Use the form's corporation_uuid for fetching data (independent from TopBar)
  const corpUuid = props.form.corporation_uuid || corpStore.selectedCorporation?.uuid
  if (corpUuid) {
    await Promise.allSettled([
      vendorStore.fetchVendors(String(corpUuid)),
      purchaseOrdersStore.fetchPurchaseOrders(String(corpUuid)),
      changeOrdersStore.fetchChangeOrders(String(corpUuid)),
      // NOTE: We don't fetch projects metadata here - ProjectSelect's internal watcher will handle it
      props.form.project_uuid ? projectAddressesStore.fetchAddresses(props.form.project_uuid) : Promise.resolve(),
    ])
  }
  
  // If creating and co_number empty, generate initial number
  if (!props.form.uuid && (!props.form.co_number || String(props.form.co_number).trim() === '')) {
    generateCONumber()
  }
})

// Watch form's corporation_uuid for changes and fetch data
watch(() => props.form.corporation_uuid, async (newCorpUuid) => {
  if (!newCorpUuid) return
  try {
    // NOTE: We don't fetch projects here - ProjectSelect's internal watcher will handle it
    await Promise.allSettled([
      vendorStore.fetchVendors(String(newCorpUuid)),
      purchaseOrdersStore.fetchPurchaseOrders(String(newCorpUuid)),
      changeOrdersStore.fetchChangeOrders(String(newCorpUuid)),
    ])
  } catch (e) {
    // no-op
  }
}, { immediate: true })

// Change Order Items from Original Order
// Use form's corporation_uuid, fallback to store's selectedCorporation
const selectedCorpUuid = computed(() => String(props.form.corporation_uuid || corpStore.selectedCorporation?.uuid || ''))
const originalOrderUuid = computed(() => String(props.form?.original_purchase_order_uuid || ''))

const ensureOriginalItems = async (force = false) => {
  const corp = selectedCorpUuid.value
  const proj = String(props.form?.project_uuid || '')
  const po = originalOrderUuid.value
  if (!corp || !proj || !po) return
  await changeOrderResourcesStore.ensureOriginalOrderItems({
    corporationUuid: corp,
    projectUuid: proj,
    purchaseOrderUuid: po,
    force,
  })
}

watch([() => props.form.project_uuid, () => props.form.original_purchase_order_uuid], async ([proj, po]) => {
  if (proj && po) {
    await ensureOriginalItems()
  }
}, { immediate: true })

// Labor CO Items from Labor PO
const ensureLaborPOItems = async (force = false) => {
  const corp = selectedCorpUuid.value
  const proj = String(props.form?.project_uuid || '')
  const po = originalOrderUuid.value
  const coType = String(props.form?.co_type || '')
  if (!corp || !proj || !po || coType !== 'LABOR') return
  await laborChangeOrderResourcesStore.ensureLaborPOItems({
    corporationUuid: corp,
    projectUuid: proj,
    purchaseOrderUuid: po,
    force,
  })
}

// Only fetch original PO items when creating a NEW change order (no uuid yet)
watch([() => props.form.project_uuid, () => props.form.original_purchase_order_uuid, () => props.form.co_type, () => props.form.uuid], async ([proj, po, coType, uuid]) => {
  // For new change orders (no uuid), fetch original PO items to populate form
  // For existing change orders (has uuid), we'll use saved items from labor_change_order_items_list
  if (proj && po && coType === 'LABOR' && !uuid) {
    await ensureLaborPOItems()
  }
}, { immediate: true })

const laborPOItemsLoading = computed(() =>
  laborChangeOrderResourcesStore.getLaborPOItemsLoading(
    selectedCorpUuid.value,
    String(props.form?.project_uuid || ''),
    originalOrderUuid.value
  )
)
const laborPOItemsError = computed(() =>
  laborChangeOrderResourcesStore.getLaborPOItemsError(
    selectedCorpUuid.value,
    String(props.form?.project_uuid || ''),
    originalOrderUuid.value
  )
)
const laborPOItems = computed(() =>
  laborChangeOrderResourcesStore.getLaborPOItems(
    selectedCorpUuid.value,
    String(props.form?.project_uuid || ''),
    originalOrderUuid.value
  ) as any[]
)

// Load saved labor CO items if editing
watch([() => props.form.uuid, () => props.form.co_type], async ([coUuid, coType]) => {
  if (coUuid && coType === 'LABOR') {
    await laborChangeOrderItemsStore.fetchItems(String(coUuid))
    // Load saved items into form data (always load when editing, even if form already has items)
    const savedItems = laborChangeOrderItemsStore.getItemsByChangeOrder(String(coUuid))
    if (savedItems.length > 0) {
      // Always update form with saved items when editing
      updateForm({ labor_co_items: savedItems.map((item: any) => ({
        cost_code_uuid: item.cost_code_uuid,
        cost_code_number: item.cost_code_number,
        cost_code_name: item.cost_code_name,
        cost_code_label: item.cost_code_label,
        division_name: item.division_name,
        po_amount: item.po_amount,
        co_amount: item.co_amount,
        order_index: item.order_index,
        uuid: item.uuid, // Include uuid from saved item
      })) })
    }
  }
}, { immediate: true })

// Map saved labor CO items by cost_code_uuid
const laborCOItemsMap = computed(() => {
  const map = new Map<string, any>()
  // Check saved items from store (when editing existing CO)
  const savedItems = props.form?.uuid 
    ? laborChangeOrderItemsStore.getItemsByChangeOrder(String(props.form.uuid))
    : []
  // Also check form data (for new COs or unsaved changes)
  const formItems = Array.isArray((props.form as any)?.labor_co_items) ? (props.form as any).labor_co_items : []
  // Merge both, with form items taking precedence
  const allItems = [...savedItems, ...formItems]
  allItems.forEach((item: any) => {
    const key = String(item.cost_code_uuid || '')
    if (key) {
      map.set(key, item)
    }
  })
  return map
})

const laborCODisplayItems = computed(() => {
  // For existing change orders (has uuid), use saved items from labor_change_order_items_list
  // For new change orders, use original PO items and merge with form data
  const savedItems = props.form?.uuid 
    ? laborChangeOrderItemsStore.getItemsByChangeOrder(String(props.form.uuid))
    : []
  
  // If editing existing CO, use saved items directly
  if (props.form?.uuid && savedItems.length > 0) {
    return savedItems.map((row: any, idx: number) => ({
      id: row?.uuid || row?.id || `labor-${row.cost_code_uuid || idx}`,
      cost_code_uuid: row?.cost_code_uuid || null,
      cost_code_number: row?.cost_code_number || '',
      cost_code_name: row?.cost_code_name || '',
      cost_code_label: row?.cost_code_label || [row?.cost_code_number, row?.cost_code_name].filter(Boolean).join(' ').trim(),
      division_name: row?.division_name || null,
      po_amount: row?.po_amount ?? 0,
      co_amount: row?.co_amount ?? null,
      uuid: row?.uuid,
    }))
  }
  
  // For new COs, use original PO items and merge with form data
  const source = Array.isArray(laborPOItems.value) ? laborPOItems.value : []
  
  // Check if labor_co_items is pre-populated (e.g., from exceeded quantities)
  // If so, only show items that are in labor_co_items
  const laborCoItemsList = Array.isArray((props.form as any)?.labor_co_items) ? (props.form as any).labor_co_items : []
  const hasPrePopulatedLaborCoItems = laborCoItemsList.length > 0
  
  // Build set of labor_co_items cost_code_uuids for filtering
  const laborCoItemsCostCodeUuids = new Set<string>()
  if (hasPrePopulatedLaborCoItems) {
    laborCoItemsList.forEach((item: any) => {
      if (item.cost_code_uuid) {
        laborCoItemsCostCodeUuids.add(String(item.cost_code_uuid).toLowerCase())
      }
    })
  }
  
  // Filter source to only include items in labor_co_items if pre-populated
  const filteredSource = hasPrePopulatedLaborCoItems
    ? source.filter((row: any) => {
        const costCodeUuid = String(row?.cost_code_uuid || '').toLowerCase()
        return costCodeUuid && laborCoItemsCostCodeUuids.has(costCodeUuid)
      })
    : source
  
  return filteredSource.map((row: any, idx: number) => {
    const base = {
      id: row?.uuid || row?.id || `labor-${row.cost_code_uuid || idx}`,
      cost_code_uuid: row?.cost_code_uuid || null,
      cost_code_number: row?.cost_code_number || '',
      cost_code_name: row?.cost_code_name || '',
      cost_code_label: row?.cost_code_label || [row?.cost_code_number, row?.cost_code_name].filter(Boolean).join(' ').trim(),
      division_name: row?.division_name || null,
      po_amount: row?.po_amount ?? 0,
    }
    const matched = laborCOItemsMap.value.get(String(base.cost_code_uuid || ''))
    return {
      ...base,
      co_amount: matched?.co_amount ?? null,
      uuid: matched?.uuid,
    }
  })
})

const updateLaborCoItemsAt = (costCodeUuid: string, fields: Record<string, any>) => {
  const list = Array.isArray((props.form as any)?.labor_co_items) ? [...(props.form as any).labor_co_items] : []
  const existingIndex = list.findIndex((it: any) => String(it.cost_code_uuid) === String(costCodeUuid))
  const recordBase = {
    cost_code_uuid: costCodeUuid || null,
    order_index: list.length,
  }
  if (existingIndex >= 0) {
    list[existingIndex] = { ...list[existingIndex], ...recordBase, ...fields }
  } else {
    list.push({ ...recordBase, ...fields })
  }
  updateForm({ labor_co_items: list })
}

const handleLaborCoAmountChange = ({ index, numericValue }: { index: number; numericValue: number }) => {
  const item = laborCODisplayItems.value[index]
  if (!item || !item.cost_code_uuid) return
  updateLaborCoItemsAt(String(item.cost_code_uuid), { 
    co_amount: numericValue,
    cost_code_number: item.cost_code_number,
    cost_code_name: item.cost_code_name,
    cost_code_label: item.cost_code_label,
    division_name: item.division_name,
    po_amount: item.po_amount,
  })
}

const removeLaborCoRow = (index: number) => {
  const item = laborCODisplayItems.value[index]
  if (!item || !item.cost_code_uuid) return
  const list = Array.isArray((props.form as any)?.labor_co_items) ? [...(props.form as any).labor_co_items] : []
  const filtered = list.filter((it: any) => String(it.cost_code_uuid) !== String(item.cost_code_uuid))
  updateForm({ labor_co_items: filtered })
}

const originalItemsLoading = computed(() =>
  changeOrderResourcesStore.getOriginalItemsLoading(
    selectedCorpUuid.value,
    String(props.form?.project_uuid || ''),
    originalOrderUuid.value
  )
)
const originalItemsError = computed(() =>
  changeOrderResourcesStore.getOriginalItemsError(
    selectedCorpUuid.value,
    String(props.form?.project_uuid || ''),
    originalOrderUuid.value
  )
)
const originalItems = computed(() =>
  changeOrderResourcesStore.getOriginalItems(
    selectedCorpUuid.value,
    String(props.form?.project_uuid || ''),
    originalOrderUuid.value
  ) as any[]
)

const normalize = (v: any) => (v === null || v === undefined ? '' : String(v).trim().toUpperCase())
const buildCoMatchKey = (item: any) => {
  return [
    normalize(item?.cost_code_uuid || item?.cost_code_id),
    normalize(item?.item_uuid || item?.item_id),
    normalize(item?.model_number || ''),
  ].join('|')
}

const coItemsMap = computed(() => {
  const map = new Map<string, any>()
  const list = Array.isArray(props.form?.co_items) ? props.form.co_items : []
  list.forEach((ci: any) => {
    map.set(buildCoMatchKey(ci), ci)
  })
  return map
})

const coDisplayItems = computed(() => {
  const source = Array.isArray(originalItems.value) ? originalItems.value : []
  // Build set of removed item keys to exclude from display
  const removed = Array.isArray((props.form as any)?.removed_co_items) ? (props.form as any).removed_co_items : []
  const removedKeys = new Set<string>()
  removed.forEach((item: any) => {
    removedKeys.add(buildCoMatchKey(item))
  })
  
  // Check if co_items is pre-populated (e.g., from exceeded quantities)
  // Only filter by co_items when editing an existing change order (has uuid)
  // For new change orders, always show all items regardless of co_items
  const coItemsList = Array.isArray(props.form?.co_items) ? props.form.co_items : []
  const isEditingExistingCO = !!props.form?.uuid
  const hasPrePopulatedCoItems = isEditingExistingCO && coItemsList.length > 0
  
  // Build set of co_items keys for filtering
  const coItemsKeys = new Set<string>()
  if (hasPrePopulatedCoItems) {
    coItemsList.forEach((item: any) => {
      coItemsKeys.add(buildCoMatchKey(item))
    })
  }
  
  const filtered = source.filter((row: any) => {
    const rowKey = buildCoMatchKey(row)
    // Exclude removed items
    if (removedKeys.has(rowKey)) return false
    // If editing existing CO and co_items is pre-populated, only include items that are in co_items
    // For new COs, always show all items
    if (hasPrePopulatedCoItems && !coItemsKeys.has(rowKey)) return false
    return true
  })
  
  return filtered.map((row: any, idx: number) => {
    // Fetch sequence from cost code configurations store using item_uuid
    const itemUuid = row?.item_uuid || null
    const itemFromStore = itemUuid ? costCodeConfigurationsStore.getItemById(itemUuid) : null
    const sequence = itemFromStore?.item_sequence || row?.item_sequence || row?.sequence || null
    
    // Get item name - prioritize item_name strictly (same logic as POBreakdown)
    const metadata = row?.metadata || row?.display_metadata || {}
    let itemName = row?.item_name || ''
    if (!itemName) {
      itemName = metadata?.item_name || ''
    }
    // If we have sequence but still no item_name, try row.name (preferred items may use 'name' field)
    // Also fallback to row.name if no item_name found (for backward compatibility with test data)
    if (!itemName) {
      if (sequence) {
        itemName = row?.name || ''
      } else {
        // Fallback to name even without sequence (for test compatibility and legacy data)
        itemName = row?.name || ''
      }
    }
    
    const base = {
      id: row?.uuid || row?.id || `orig-${idx}`,
      name: itemName || '',
      description: row?.description || '',
      cost_code_label: [row?.cost_code_number, row?.cost_code_name].filter(Boolean).join(' ').trim(),
      cost_code_number: row?.cost_code_number || '',
      cost_code_name: row?.cost_code_name || '',
      unit_price: row?.po_unit_price ?? row?.unit_price ?? 0,
      quantity: row?.po_quantity ?? row?.quantity ?? 0,
      total: row?.po_total ?? row?.total ?? 0,
      // keys used for matching
      cost_code_uuid: row?.cost_code_uuid || null,
      item_uuid: itemUuid,
      model_number: row?.model_number || '',
      sequence: sequence,
      // Map approval_checks_uuids (from DB) to approval_checks (for display)
      approval_checks: Array.isArray(row?.approval_checks_uuids) && row.approval_checks_uuids.length > 0
        ? row.approval_checks_uuids
        : (Array.isArray(row?.approval_checks) && row.approval_checks.length > 0
          ? row.approval_checks
          : []),
    }
    const matched = coItemsMap.value.get(buildCoMatchKey(base)) || {}
    return {
      ...base,
      co_unit_price: matched?.co_unit_price ?? null,
      co_quantity: matched?.co_quantity ?? null,
      co_total: matched?.co_total ?? null,
      // Use approval_checks from matched item (saved CO item) or fall back to base (from original PO)
      approval_checks: Array.isArray(matched?.approval_checks) && matched.approval_checks.length > 0
        ? matched.approval_checks
        : base.approval_checks,
    }
  })
})

const updateCoItemsAt = (index: number, fields: Record<string, any>) => {
  const list = Array.isArray(props.form?.co_items) ? [...props.form.co_items] : []
  const base = coDisplayItems.value[index]
  if (!base) return
  const key = buildCoMatchKey(base)
  const existingIndex = list.findIndex((it: any) => buildCoMatchKey(it) === key)
  const recordBase = {
    cost_code_uuid: base.cost_code_uuid || null,
    item_uuid: base.item_uuid || null,
    model_number: base.model_number || '',
    name: base.name || '',
    description: base.description || '',
  }
  if (existingIndex >= 0) {
    list[existingIndex] = { ...list[existingIndex], ...recordBase, ...fields }
  } else {
    list.push({ ...recordBase, ...fields })
  }
  updateForm({ co_items: list })
}

const handleCoUnitPriceChange = ({ index, value, numericValue, computedTotal }: { index: number; value: any; numericValue: number; computedTotal: number }) => {
  updateCoItemsAt(index, { co_unit_price: numericValue, co_total: computedTotal })
}

const handleCoQuantityChange = ({ index, value, numericValue, computedTotal }: { index: number; value: any; numericValue: number; computedTotal: number }) => {
  updateCoItemsAt(index, { co_quantity: numericValue, co_total: computedTotal })
}

const handleApprovalChecksChange = ({ index, value }: { index: number; value: string[] }) => {
  updateCoItemsAt(index, { approval_checks: value || [] })
}

const removeCoRow = (index: number) => {
  const list = Array.isArray(props.form?.co_items) ? [...props.form.co_items] : []
  const base = coDisplayItems.value[index]
  if (!base) return
  // Remove from co_items
  const key = buildCoMatchKey(base)
  const filtered = list.filter((it: any) => buildCoMatchKey(it) !== key)
  // Append to removed list, including totals snapshot for reference
  const matched = (props.form?.co_items || []).find((it: any) => buildCoMatchKey(it) === key) || {}
  const removedSnapshot = {
    cost_code_uuid: base.cost_code_uuid || null,
    item_uuid: base.item_uuid || null,
    model_number: base.model_number || '',
    name: base.name || '',
    description: base.description || '',
    co_unit_price: matched.co_unit_price ?? null,
    co_quantity: matched.co_quantity ?? null,
    co_total: matched.co_total ?? null,
  }
  const updatedRemoved = appendRemovedCoItem(removedSnapshot)
  updateForm({ removed_co_items: updatedRemoved, co_items: filtered })
}

// Removed CO items management
const removedCoItemsModalOpen = ref(false)
const removedCoItems = computed(() =>
  Array.isArray((props.form as any)?.removed_co_items)
    ? (props.form as any).removed_co_items
    : []
)
const hasRemovedCoItems = computed(() => removedCoItems.value.length > 0)

const openRemovedCoItemsModal = () => {
  removedCoItemsModalOpen.value = true
}

const closeRemovedCoItemsModal = () => {
  removedCoItemsModalOpen.value = false
}

const cloneCoItem = (item: any) => {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(item)
    } catch {
      // fall through
    }
  }
  try {
    return JSON.parse(JSON.stringify(item ?? {}))
  } catch {
    return item
  }
}

const appendRemovedCoItem = (item: any) => {
  const currentRemoved = Array.isArray((props.form as any)?.removed_co_items)
    ? [...(props.form as any).removed_co_items]
    : []
  const cloned = cloneCoItem(item)
  cloned.removed_at = new Date().toISOString()
  currentRemoved.push(cloned)
  return currentRemoved
}

const restoreRemovedCoItem = (index: number) => {
  const currentRemoved = Array.isArray((props.form as any)?.removed_co_items)
    ? [...(props.form as any).removed_co_items]
    : []
  if (!currentRemoved.length) return
  const targetIndex = Math.min(Math.max(index, 0), currentRemoved.length - 1)
  const [restored] = currentRemoved.splice(targetIndex, 1)
  if (!restored) return
  const sanitized = cloneCoItem(restored)
  delete sanitized.removed_at
  // Merge back into co_items
  const list = Array.isArray(props.form?.co_items) ? [...props.form.co_items] : []
  // Ensure the restored line has matching base identifiers
  const base = {
    cost_code_uuid: sanitized.cost_code_uuid || null,
    item_uuid: sanitized.item_uuid || null,
    model_number: sanitized.model_number || '',
    name: sanitized.name || '',
    description: sanitized.description || '',
    co_unit_price: sanitized.co_unit_price ?? null,
    co_quantity: sanitized.co_quantity ?? null,
    co_total: sanitized.co_total ?? null,
  }
  list.push(base)
  updateForm({ removed_co_items: currentRemoved, co_items: list })
}

const restoreAllRemovedCoItems = () => {
  const currentRemoved = Array.isArray((props.form as any)?.removed_co_items)
    ? [...(props.form as any).removed_co_items]
    : []
  if (!currentRemoved.length) return
  const list = Array.isArray(props.form?.co_items) ? [...props.form.co_items] : []
  currentRemoved.forEach((it: any) => {
    const sanitized = cloneCoItem(it)
    delete sanitized.removed_at
    const base = {
      cost_code_uuid: sanitized.cost_code_uuid || null,
      item_uuid: sanitized.item_uuid || null,
      model_number: sanitized.model_number || '',
      name: sanitized.name || '',
      description: sanitized.description || '',
      co_unit_price: sanitized.co_unit_price ?? null,
      co_quantity: sanitized.co_quantity ?? null,
      co_total: sanitized.co_total ?? null,
    }
    list.push(base)
  })
  updateForm({ removed_co_items: [], co_items: list })
  closeRemovedCoItemsModal()
}

const syncRemovedCoItemsWithCurrent = (items: any[]) => {
  const existingRemoved = Array.isArray((props.form as any)?.removed_co_items)
    ? (props.form as any).removed_co_items
    : []
  if (!existingRemoved.length) return
  const currentKeys = new Set<string>()
  items.forEach((item: any) => {
    currentKeys.add(buildCoMatchKey(item))
  })
  const filtered = existingRemoved.filter((it: any) => !currentKeys.has(buildCoMatchKey(it)))
  if (filtered.length !== existingRemoved.length) {
    updateForm({ removed_co_items: filtered })
  }
}

// (reassignment removed; logic handled in removeCoRow)

// Compute CO item total from co_items (Material) or labor_co_items (Labor)
const coItemTotal = computed(() => {
  const toNum = (v: any) => {
    if (v === null || v === undefined || v === '') return 0
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0
    const n = Number(String(v).replace(/,/g, '').trim())
    return Number.isFinite(n) ? n : 0
  }
  const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100
  
  // For Labor CO, calculate from labor_co_items
  if (props.form?.co_type === 'LABOR') {
    // For existing CO, prefer saved items from store (they have the actual saved co_amount values)
    // For new CO, use form items
    let laborItems: any[] = []
    
    if (props.form?.uuid) {
      // When editing existing CO, use saved items from store as primary source
      // Access store items directly for reactivity - accessing items.value ensures reactivity
      const allStoreItems = laborChangeOrderItemsStore.items
      const savedItems = allStoreItems.filter(item => 
        item.change_order_uuid === props.form.uuid && item.is_active !== false
      )
      const formItems = Array.isArray((props.form as any)?.labor_co_items) ? (props.form as any).labor_co_items : []
      
      // If we have saved items, use them as the base (they have the actual saved co_amount values)
      if (savedItems.length > 0) {
        // Create a map starting with saved items (they have the actual saved values)
        const itemsMap = new Map<string, any>()
        savedItems.forEach((item: any) => {
          const key = String(item?.cost_code_uuid || '')
          if (key) itemsMap.set(key, item)
        })
        
        // Override with form items if they exist and have co_amount (for unsaved changes)
        formItems.forEach((item: any) => {
          const key = String(item?.cost_code_uuid || '')
          if (key && item?.co_amount !== null && item?.co_amount !== undefined) {
            itemsMap.set(key, item)
          }
        })
        
        laborItems = Array.from(itemsMap.values())
      } else {
        // Fallback to form items if no saved items yet
        laborItems = formItems
      }
    } else {
      // For new CO, just use form items
      laborItems = Array.isArray((props.form as any)?.labor_co_items) ? (props.form as any).labor_co_items : []
    }
    
    const total = laborItems.reduce((sum: number, item: any) => {
      const coAmount = toNum(item?.co_amount)
      return sum + (Number.isFinite(coAmount) ? coAmount : 0)
    }, 0)
    return round2(total)
  }
  
  // For Material CO, calculate from co_items (co_unit_price * co_quantity or co_total)
  const items = Array.isArray(props.form?.co_items) ? props.form.co_items : []
  const total = items.reduce((sum: number, item: any) => {
    const unit = toNum(item?.co_unit_price)
    const qty = toNum(item?.co_quantity)
    const line =
      (unit || qty) ? unit * qty : toNum(item?.co_total)
    return sum + (Number.isFinite(line) ? line : 0)
  }, 0)
  return round2(total)
})

// Prefill charges/taxes (percentages and taxable flags) from the original PO when selected
const prefillFinancialsFromOriginalOrder = () => {
  const poUuid = String(props.form?.original_purchase_order_uuid || '')
  if (!poUuid) return
  const po = (purchaseOrdersStore.purchaseOrders || []).find((p: any) => String(p.uuid) === poUuid)
  if (!po) return
  const fieldsToCopy = [
    'freight_charges_percentage',
    'freight_charges_taxable',
    'packing_charges_percentage',
    'packing_charges_taxable',
    'custom_duties_charges_percentage',
    'custom_duties_charges_taxable',
    'other_charges_percentage',
    'other_charges_taxable',
    'sales_tax_1_percentage',
    'sales_tax_2_percentage',
  ]
  const updates: Record<string, any> = {}
  fieldsToCopy.forEach((key) => {
    const current: any = props.form as any
    const poAny: any = po as any
    if (current[key] === undefined || current[key] === null || current[key] === '') {
      if (poAny[key] !== undefined) {
        updates[key] = poAny[key]
      }
    }
  })
  if (Object.keys(updates).length > 0) {
    updateForm(updates)
  }
}

// When editing an existing change order that has financial_breakdown JSON,
// populate the percentage fields so FinancialBreakdown can calculate amounts.
watch(
  () => (props.form as any)?.financial_breakdown ?? (props.form as any)?.financialBreakdown,
  () => {
    applyFinancialBreakdownFromField()
  },
  { immediate: true }
)

// Trigger prefill when original order changes (after items load as well)
watch(() => props.form.original_purchase_order_uuid, () => {
  prefillFinancialsFromOriginalOrder()
})

// Handle updates from FinancialBreakdown
const handleFinancialUpdate = (updates: Record<string, any>) => {
  updateForm(updates)
}

// Resolve Ship Via / Freight display values from UUID fallback
const shipViaDisplayValue = computed(() => {
  if (props.form.ship_via && String(props.form.ship_via).trim() !== '') return props.form.ship_via
  if (props.form.ship_via_uuid) {
    const rec = shipViaStore.getShipViaByUuid?.(String(props.form.ship_via_uuid))
    return rec?.ship_via || ''
  }
  return ''
})

const freightDisplayValue = computed(() => {
  if (props.form.freight && String(props.form.freight).trim() !== '') return props.form.freight
  if (props.form.freight_uuid) {
    const rec = freightStore.getFreightByUuid?.(String(props.form.freight_uuid))
    return rec?.ship_via || ''
  }
  return ''
})

// Keep removed list in sync when co_items changes
watch(() => props.form.co_items, (newItems, oldItems) => {
  if (newItems !== oldItems && Array.isArray(newItems)) {
    syncRemovedCoItemsWithCurrent(newItems)
    // force coItemTotal reactivity
    const _ = coItemTotal.value
  }
}, { deep: true })

// File preview functionality
const showFilePreviewModal = ref(false)
const selectedFileForPreview = ref<any>(null)

// File upload functionality
const uploadedFiles = ref<File[]>([])
const fileUploadError = ref<string | null>(null)
const isUploading = ref(false)

// Computed properties for attachments
const fileUploadErrorMessage = computed(() => fileUploadError.value)
const totalAttachmentCount = computed(() =>
  Array.isArray(props.form.attachments) ? props.form.attachments.length : 0
)
const uploadedAttachmentCount = computed(() =>
  Array.isArray(props.form.attachments)
    ? props.form.attachments.filter((att: any) => att?.uuid || att?.isUploaded).length
    : 0
)

const handleFileUpload = async () => {
  fileUploadError.value = null
  if (uploadedFiles.value.length === 0) return
  if (isUploading.value) return

  const allowedTypes = ['application/pdf']
  const maxSize = 10 * 1024 * 1024

  for (const file of uploadedFiles.value) {
    if (!allowedTypes.includes(file.type)) {
      fileUploadError.value = 'Invalid file type. Only PDF files are allowed.'
      return
    }
    if (file.size > maxSize) {
      fileUploadError.value = 'File size too large. Maximum size is 10MB per file.'
      return
    }
  }

  isUploading.value = true
  try {
    const pendingAttachments = await Promise.all(
      uploadedFiles.value.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              const fileData = e.target?.result
              if (typeof fileData !== 'string') {
                reject(new Error('Failed to read file'))
                return
              }
              resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                fileData,
                tempId: Date.now() + Math.random().toString(36).substring(2)
              })
            }
            reader.onerror = () => reject(new Error('Failed to read file'))
            reader.readAsDataURL(file)
          })
      )
    )

    const allAttachments = [
      ...(props.form.attachments || []),
      ...pendingAttachments.map((file: any) => ({
        ...file,
        isUploaded: false
      }))
    ]
    updateForm({ attachments: allAttachments })
    uploadedFiles.value = []
  } catch (error) {
    console.error('Error processing files:', error)
    fileUploadError.value = 'Failed to process files. Please try again.'
  } finally {
    isUploading.value = false
  }
}

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
  }
  showFilePreviewModal.value = true
}

const closeFilePreview = () => {
  showFilePreviewModal.value = false
  selectedFileForPreview.value = null
}

const removeFile = (index: number) => {
  const updatedAttachments = Array.isArray(props.form.attachments) ? [...props.form.attachments] : []
  updatedAttachments.splice(index, 1)
  updateForm({ attachments: updatedAttachments })
}

watch(() => uploadedFiles.value, () => {
  handleFileUpload()
}, { deep: true })

// Credit days
const creditDaysOptions = [
  { label: 'Net 15', value: 'NET_15' },
  { label: 'Net 25', value: 'NET_25' },
  { label: 'Net 30', value: 'NET_30' },
  { label: 'Net 45', value: 'NET_45' },
  { label: 'Net 60', value: 'NET_60' },
]
const creditDaysOption = computed<any>({
  get: () => {
    const v = props.form.credit_days
    if (!v) return undefined
    const target = String(v).toLowerCase()
    return creditDaysOptions.find(opt => String(opt.value).toLowerCase() === target) || undefined
  },
  set: (val) => {
    const value = typeof val === 'string' ? val : (val?.value || '')
    updateForm({ credit_days: value })
  }
})

// CO Type
const coTypeOptions = [
  { label: 'Labor', value: 'LABOR' },
  { label: 'Material', value: 'MATERIAL' },
]
const coTypeOption = computed<any>({
  get: () => {
    const v = props.form.co_type
    if (!v) return undefined
    const target = String(v).toUpperCase()
    return coTypeOptions.find(opt => String(opt.value).toUpperCase() === target)
  },
  set: (val) => {
    const value = typeof val === 'string' ? val : (val?.value || '')
    updateForm({ co_type: value })
  }
})

// Ship to address
const shipToAddress = computed(() => {
  if (!props.form.project_uuid) return ''
  const addresses = projectAddressesStore.getAddresses(props.form.project_uuid)
  if (addresses && addresses.length) {
    const primary = addresses.find((a: any) => a.is_primary) || addresses[0]
    const parts = [
      primary?.address_line_1,
      primary?.address_line_2,
      primary?.city,
      primary?.state,
      primary?.zip_code,
      ((primary?.country as string) || '').toUpperCase()
    ].filter(Boolean)
    if (parts.length) return parts.join(', ').toUpperCase()
  }
  return ''
})

// Ensure addresses are fetched and shipping address is set when editing/pre-filled
watch(() => props.form.project_uuid, async (newProjectUuid) => {
  if (!newProjectUuid) return
  try {
    await projectAddressesStore.fetchAddresses(String(newProjectUuid))
    const addresses = projectAddressesStore.getAddresses(String(newProjectUuid)) as any[] | undefined
    const primary = Array.isArray(addresses) && addresses.length
      ? (addresses.find(a => a.is_primary) || addresses[0])
      : null
    if (primary?.uuid) {
      updateForm({ shipping_address_uuid: primary.uuid })
    }
  } catch (e) {
    // no-op
  }
}, { immediate: true })

// Watch for created date and credit days changes to auto-calculate estimated delivery date
watch(
  [() => createdDateValue.value, () => props.form.credit_days],
  ([newCreatedDate, newCreditDays], [oldCreatedDate, oldCreditDays]) => {
    // Skip if we're already updating to prevent recursive updates
    if (isUpdatingEstimatedDeliveryDate.value) {
      return;
    }
    
    // Only auto-calculate if both created date and credit days are set
    if (newCreatedDate && newCreditDays) {
      // Check if estimated delivery date was manually set (different from calculated)
      const calculatedEstimatedDeliveryDate = calculateEstimatedDeliveryDate(newCreatedDate, newCreditDays);
      if (calculatedEstimatedDeliveryDate) {
        // Calculate the new estimated delivery date string
        const newEstimatedDeliveryDateString = `${calculatedEstimatedDeliveryDate.year}-${String(calculatedEstimatedDeliveryDate.month).padStart(2, '0')}-${String(calculatedEstimatedDeliveryDate.day).padStart(2, '0')}`;
        const newEstimatedDeliveryDateUTC = toUTCString(newEstimatedDeliveryDateString);
        
        // Get current estimated delivery date from form (avoid reading computed property to prevent recursion)
        const currentEstimatedDeliveryDateUTC = props.form.estimated_delivery_date;
        
        // Calculate old estimated delivery date if we had both old values
        let oldCalculatedEstimatedDeliveryDateUTC: string | null = null;
        if (oldCreatedDate && oldCreditDays) {
          const oldCalculated = calculateEstimatedDeliveryDate(oldCreatedDate, oldCreditDays);
          if (oldCalculated) {
            const oldDateString = `${oldCalculated.year}-${String(oldCalculated.month).padStart(2, '0')}-${String(oldCalculated.day).padStart(2, '0')}`;
            oldCalculatedEstimatedDeliveryDateUTC = toUTCString(oldDateString);
          }
        }
        
        // Check if created date changed (by comparing the date strings)
        const createdDateChanged = oldCreatedDate && newCreatedDate && 
          (oldCreatedDate.year !== newCreatedDate.year || 
           oldCreatedDate.month !== newCreatedDate.month || 
           oldCreatedDate.day !== newCreatedDate.day);
        
        // Check if credit days changed (handle empty/null/undefined cases)
        const creditDaysChanged = String(oldCreditDays || '') !== String(newCreditDays || '');
        
        // Update if:
        // 1. Estimated delivery date is empty/null, OR
        // 2. Created date changed (always recalculate when created date changes), OR
        // 3. Credit days changed (always recalculate when credit days changes), OR
        // 4. Current estimated delivery date matches the old calculated value (meaning it was auto-calculated, not manually set)
        const shouldUpdate = !currentEstimatedDeliveryDateUTC || 
                            createdDateChanged ||
                            creditDaysChanged ||
                            (oldCalculatedEstimatedDeliveryDateUTC && currentEstimatedDeliveryDateUTC === oldCalculatedEstimatedDeliveryDateUTC);
        
        // Only update if the new value is different from current
        if (shouldUpdate && currentEstimatedDeliveryDateUTC !== newEstimatedDeliveryDateUTC) {
          isUpdatingEstimatedDeliveryDate.value = true;
          try {
            updateForm({ estimated_delivery_date: newEstimatedDeliveryDateUTC });
          } finally {
            // Reset flag after a short delay to allow the update to complete
            nextTick(() => {
              isUpdatingEstimatedDeliveryDate.value = false;
            });
          }
        }
      }
    } else if (!newCreatedDate || !newCreditDays) {
      // If either created date or credit days is cleared, clear estimated delivery date only if it was auto-calculated
      // We can't easily determine if it was manually set, so we'll leave it as is to avoid clearing user input
    }
  },
  { flush: 'post', immediate: true }
);
</script>


