<template>
  <div class="rounded-xl border border-default bg-white dark:bg-gray-900/40 shadow-sm overflow-hidden">
    <div class="flex items-center justify-between gap-4 px-4 py-3 border-b border-default/70 bg-gray-50 dark:bg-gray-800">
      <div>
        <h3 class="text-sm font-semibold text-default uppercase tracking-wide">
          {{ title }}
        </h3>
        <p v-if="description" class="text-xs text-muted mt-1">
          {{ description }}
        </p>
      </div>
      <div v-if="hasItems" class="flex items-center gap-3 ml-auto">
        <UButton
          v-if="showEditSelection"
          color="neutral"
          variant="solid"
          size="xs"
          icon="tdesign:edit-filled"
          @click="handleEditSelection"
        >
          Edit Selection
        </UButton>
        <span class="text-[11px] font-medium text-muted uppercase tracking-wide">
          {{ items.length }} items
        </span>
      </div>
    </div>

    <div v-if="error" class="px-4 py-3 text-xs text-error-700 bg-error-50/80 dark:bg-error-900/20 border-b border-error-200">
      {{ error }}
    </div>

    <div v-else-if="loading" class="px-4 py-6 text-sm text-muted text-center">
      {{ loadingMessage }}
    </div>

    <div v-else-if="hasItems" :key="`items-${items.length}-${items.map(i => i.id).join('-')}`">
      <div class="hidden md:block">
        <table class="min-w-full table-fixed divide-y divide-default/60">
          <thead class="bg-muted/20 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th class="w-1/12 px-4 py-2 text-left">Cost Code</th>
              <th class="w-1/12 px-4 py-2 text-left">Item Type</th>
              <th class="w-1/12 px-4 py-2 text-left">Sequence</th>
              <th :class="[itemColumnWidthClass, 'px-4 py-2 text-left']">Item</th>
              <th v-if="!hideApprovalChecks" class="w-1/12 px-4 py-2 text-left">Approval Checks</th>
              <th class="w-1/12 px-4 py-2 text-left">Description</th>
              <th v-if="!hideModelNumber" class="w-1/12 px-4 py-2 text-left">Model #</th>
              <th v-if="!hideLocation" class="w-1/12 px-4 py-2 text-left">Location</th>
              <th class="w-1/12 px-4 py-2 text-right">Unit Price</th>
              <th class="w-1/12 px-4 py-2 text-right">UOM</th>
              <th v-if="showInvoiceValues" class="w-1/12 px-4 py-2 text-center">To Be Invoiced</th>
              <th v-if="showEstimateValues" class="w-1/12 px-4 py-2 text-right">Available Qty</th>
              <th class="w-1/12 px-4 py-2 text-right">Qty</th>
              <th class="w-2/12 px-4 py-2 text-right">Total</th>
              <th class="w-1/12 px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default/60 text-sm text-default">
            <tr
              v-for="(item, index) in items"
              :key="item.id"
              :class="[
                'align-middle transition-colors duration-150',
                activeRowIndex === index ? 'bg-primary-50/40 dark:bg-primary-900/20' : '',
                isOverInvoiced(item, index) ? 'bg-error-50/50 dark:bg-error-900/20 border-l-4 border-error-500' : '',
                isQuantityExceeded(item, index) ? 'bg-warning-50/50 dark:bg-warning-900/20 border-l-4 border-warning-500' : ''
              ]"
            >
              <td class="px-2 py-2 align-middle w-1/12">
                <div class="flex flex-col gap-2 min-w-0">
                  <div :class="{ 'pointer-events-none': arePOFieldsDisabled }">
                    <CostCodeSelect
                      :model-value="item.cost_code_uuid ?? undefined"
                      :label="item.cost_code_label"
                      size="xs"
                      class="w-full min-w-0 text-left"
                      :corporation-uuid="corporationUuid"
                      :external-configurations="scopedCostCodeConfigurations"
                      :disabled="arePOFieldsDisabled"
                      @update:model-value="(value) => emitCostCodeChange(index, value as string | undefined)"
                      @change="(option) =>
                        emitCostCodeChange(
                          index,
                          (option?.costCode?.uuid || option?.value || option?.uuid) as string | undefined,
                          option
                        )"
                    >
                      <template #default="slotProps">
                        <div class="flex flex-col text-left min-w-0">
                          <span class="text-xs font-medium text-default truncate">
                            {{ slotProps.option?.label || slotProps.selectedLabel || 'Select cost code' }}
                          </span>
                          <span
                            v-if="slotProps.option?.hint"
                            class="text-[11px] text-muted uppercase tracking-wide truncate"
                          >
                            {{ slotProps.option.hint }}
                          </span>
                        </div>
                      </template>
                    </CostCodeSelect>
                  </div>
                </div>
              </td>
              <td :class="['px-2 py-2 align-middle', itemColumnWidthClass]">
                <div class="flex flex-col gap-2 min-w-0">
                  <ItemTypeSelect
                    :model-value="item.item_type_uuid ?? undefined"
                    size="xs"
                    class="w-full min-w-0 text-left"
                    :corporation-uuid="corporationUuid"
                    :project-uuid="projectUuid"
                    :external-item-types="scopedItemTypes"
                    :disabled="arePOFieldsDisabled"
                    variant="outline"
                    :ui="{
                      trigger: 'flex w-full justify-between gap-2 text-left',
                      content: 'max-h-60 min-w-full w-max'
                    }"
                    @update:model-value="(value) => emitItemTypeChange(index, value as string | undefined)"
                    @change="(option) => emitItemTypeChange(index, option?.value ?? option?.uuid, option)"
                  >
                    <template #default>
                      <span
                        class="flex-1 whitespace-normal text-left"
                        :class="{ 'text-muted': !item.item_type_uuid }"
                      >
                        {{ getItemTypeDisplayLabel(item) }}
                      </span>
                    </template>
                    <template #trailing="{ open }">
                      <UIcon
                        name="i-heroicons-chevron-down-20-solid"
                        class="transition-transform duration-200"
                        :class="{ 'rotate-180': open }"
                      />
                    </template>
                  </ItemTypeSelect>
                </div>
              </td>
              <td class="px-2 py-2 align-middle w-1/12">
                <div class="flex flex-col gap-2 min-w-0">
                  <SequenceSelect
                    :model-value="item.item_uuid ?? undefined"
                    :corporation-uuid="corporationUuid"
                    size="xs"
                    class="w-full min-w-0 text-left"
                    :items="item.options"
                    :disabled="arePOFieldsDisabled"
                    @change="(payload) => emitSequenceChange(index, payload?.value as string | undefined, payload?.option)"
                  />
                </div>
              </td>
              <td :class="['px-2 py-2 align-middle', itemColumnWidthClass]">
                <ItemSelect
                  :model-value="item.item_uuid ?? undefined"
                  :corporation-uuid="corporationUuid"
                  size="xs"
                  class="w-full min-w-0 text-left"
                  placeholder="Select item"
                  :items="item.options"
                  :disabled="arePOFieldsDisabled"
                  @change="(payload) => emitItemChange(index, payload?.value ?? null, payload?.option)"
                />
              </td>
              <td v-if="!hideApprovalChecks" class="px-2 py-2 align-middle w-1/12">
                <ApprovalChecksSelect
                  :model-value="item.approval_checks ?? []"
                  size="xs"
                  class="w-full min-w-0 text-left"
                  :disabled="props.readonly"
                  @update:model-value="(value) => emitApprovalChecksChange(index, value)"
                  @change="(options) => emitApprovalChecksChange(index, options.map(opt => opt.value))"
                />
              </td>
              <td class="px-2 py-2 align-middle w-1/12">
                <UTextarea
                  :rows="3"
                  size="sm"
                  class="w-full text-xs description-textarea"
                  :model-value="item.description || ''"
                  :readonly="arePOFieldsDisabled"
                  :disabled="arePOFieldsDisabled"
                />
              </td>
              <td v-if="!hideModelNumber" class="px-2 py-2 align-middle">
                <UTextarea
                  :rows="2"
                  size="sm"
                  class="w-full text-xs model-number-textarea"
                  :model-value="item.model_number ?? ''"
                  :disabled="props.readonly"
                  @update:model-value="(value) => emitModelNumberChange(index, value)"
                />
              </td>
              <td v-if="!hideLocation" class="px-2 py-2 align-middle w-1/12">
                <div class="flex flex-col gap-2 min-w-0">
                  <LocationSelect
                    :model-value="item.location_uuid ?? undefined"
                    size="xs"
                    class="w-full min-w-0 text-left"
                    :disabled="props.readonly"
                    @update:model-value="(value) => emitLocationChange(index, value as string | undefined)"
                    @change="(opt) => emitLocationChange(index, opt?.value, opt)"
                  />
                </div>
              </td>
              <td class="px-2 py-2 text-right align-middle">
                <div class="flex flex-col items-end gap-1">
                  <div v-if="showEstimateValues" class="w-full max-w-[140px]">
                    <div class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-transparent bg-gray-100 dark:bg-gray-800/40 px-3 py-1.5 po-estimate-value">
                      <span class="text-xs font-semibold text-default">{{ currencySymbolText }}</span>
                      <span class="font-mono text-sm leading-none tracking-tight">
                        {{ formatCurrencyInput(item.unit_price) }}
                      </span>
                    </div>
                  </div>
                  <!-- PO Unit Price (greyed out when showInvoiceValues is true) -->
                  <div v-if="showInvoiceValues" class="w-full max-w-[140px]">
                    <div class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-transparent bg-gray-100 dark:bg-gray-800/40 px-3 py-1.5 po-estimate-value">
                      <span class="text-xs font-semibold text-muted">{{ currencySymbolText }}</span>
                      <span class="font-mono text-sm leading-none tracking-tight text-muted">
                        {{ formatCurrencyInput(item.po_unit_price) }}
                      </span>
                    </div>
                  </div>
                  <!-- Editable PO Unit Price (when showInvoiceValues is false) or Invoice Unit Price (when showInvoiceValues is true) -->
                  <div class="w-full max-w-[140px]">
                    <div
                      class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-default bg-background dark:bg-gray-900/60 px-3 py-1.5 text-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40"
                    >
                      <span class="text-xs font-semibold text-default">{{ currencySymbolText }}</span>
                      <input
                        v-if="!showInvoiceValues"
                        :value="poDrafts[index]?.unitPriceInput ?? toInputString(item.po_unit_price)"
                        inputmode="decimal"
                        :disabled="props.readonly"
                        class="min-w-[2ch] bg-transparent text-right font-mono leading-none outline-none border-none focus:outline-none"
                        @focus="setActiveRow(index)"
                        @blur="clearActiveRow(index)"
                        @input="(event) => emitPoUnitPriceChange(index, (event.target as HTMLInputElement).value)"
                      />
                      <input
                        v-else
                        :value="invoiceDrafts[index]?.unitPriceInput ?? toInputString((item.invoice_unit_price !== null && item.invoice_unit_price !== undefined) ? item.invoice_unit_price : null)"
                        inputmode="decimal"
                        :disabled="props.readonly"
                        class="min-w-[2ch] bg-transparent text-right font-mono leading-none outline-none border-none focus:outline-none"
                        @focus="setActiveRow(index)"
                        @blur="clearActiveRow(index)"
                        @input="(event) => emitInvoiceUnitPriceChange(index, (event.target as HTMLInputElement).value)"
                      />
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-2 py-2 align-middle">
                <UOMSelect
                  :model-value="item.unit_uuid ?? undefined"
                  :corporation-uuid="corporationUuid"
                  size="xs"
                  class="w-full min-w-0 text-left"
                  :disabled="arePOFieldsDisabled"
                  @update:model-value="(value) => emitUomChange(index, value as string | undefined)"
                  @change="(opt) => emitUomChange(index, opt?.value ?? null, opt)"
                />
              </td>
              <td v-if="showInvoiceValues" class="px-2 py-2 text-center align-middle">
                <div class="flex items-center justify-center">
                  <span class="font-mono text-sm text-default">{{ formatQuantity(item.to_be_invoiced ?? 0) }}</span>
                </div>
              </td>
              <td v-if="showEstimateValues" class="px-2 py-2 text-right align-middle">
                <div class="flex flex-col items-end gap-1">
                  <UInput
                    :model-value="formatQuantity(getAvailableQuantity(item, index))"
                    size="xs"
                    class="w-full max-w-[120px] text-right font-mono"
                    :ui="{ base: 'bg-gray-100 dark:bg-gray-800/40 border border-transparent' }"
                    disabled
                  />
                </div>
              </td>
              <td class="px-2 py-2 text-right align-middle">
                <div class="flex flex-col items-end gap-1">
                  <UInput
                    v-if="showEstimateValues"
                    :model-value="formatQuantity(item.quantity)"
                    size="xs"
                    class="w-full max-w-[120px] text-right font-mono"
                    :ui="{ base: 'bg-gray-100 dark:bg-gray-800/40 border border-transparent' }"
                    disabled
                  />
                  <!-- PO Quantity (greyed out when showInvoiceValues is true) -->
                  <UInput
                    v-if="showInvoiceValues"
                    :model-value="formatQuantity(item.po_quantity)"
                    size="xs"
                    class="w-full max-w-[120px] text-right font-mono"
                    :ui="{ base: 'bg-gray-100 dark:bg-gray-800/40 border border-transparent' }"
                    disabled
                  />
                  <!-- Editable PO Quantity (when showInvoiceValues is false) or Invoice Quantity (when showInvoiceValues is true) -->
                  <UInput
                    v-if="!showInvoiceValues"
                    :model-value="poDrafts[index]?.quantityInput ?? toInputString(item.po_quantity)"
                    size="xs"
                    inputmode="decimal"
                    class="w-full max-w-[120px] text-right font-mono"
                    :disabled="props.readonly"
                    @focus="setActiveRow(index)"
                    @blur="clearActiveRow(index)"
                    @update:model-value="(value) => emitPoQuantityChange(index, value)"
                  />
                  <UInput
                    v-else
                    :model-value="invoiceDrafts[index]?.quantityInput ?? toInputString((item.invoice_quantity !== null && item.invoice_quantity !== undefined) ? item.invoice_quantity : null)"
                    size="xs"
                    inputmode="decimal"
                    class="w-full max-w-[120px] text-right font-mono"
                    :disabled="props.readonly"
                    @focus="setActiveRow(index)"
                    @blur="clearActiveRow(index)"
                    @update:model-value="(value) => emitInvoiceQuantityChange(index, value)"
                  />
                </div>
              </td>
              <td class="px-2 py-2 text-right align-middle w-2/12">
                <div class="flex flex-col items-end gap-1">
                  <div v-if="showEstimateValues" class="w-full max-w-[180px]">
                    <div class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-transparent bg-gray-100 dark:bg-gray-800/40 px-3 py-1.5 po-estimate-value">
                      <span class="text-xs font-semibold text-default">{{ currencySymbolText }}</span>
                      <span class="font-mono text-sm leading-none tracking-tight">
                        {{ formatCurrencyInput(item.total) }}
                      </span>
                    </div>
                  </div>
                  <!-- PO Total (greyed out when showInvoiceValues is true) -->
                  <div v-if="showInvoiceValues" class="w-full max-w-[180px]">
                    <div class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-transparent bg-gray-100 dark:bg-gray-800/40 px-3 py-1.5 po-estimate-value">
                      <span class="text-xs font-semibold text-muted">{{ currencySymbolText }}</span>
                      <span class="font-mono text-sm leading-none tracking-tight text-muted">
                        {{ formatCurrencyInput(computePoTotal(item, index)) }}
                      </span>
                    </div>
                  </div>
                  <!-- Editable PO Total (when showInvoiceValues is false) or Invoice Total (when showInvoiceValues is true) -->
                  <div class="w-full max-w-[180px]">
                    <div class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-transparent bg-background dark:bg-gray-900/60 px-3 py-1.5 po-total-display">
                      <span class="text-xs font-semibold text-default">{{ currencySymbolText }}</span>
                      <span class="font-mono text-sm leading-none tracking-tight">
                        {{ showInvoiceValues ? formatCurrencyInput(computeInvoiceTotal(item, index)) : formatCurrencyInput(computePoTotal(item, index)) }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-2 py-2 text-right align-middle">
                <slot name="actions" :item="item" :index="index">
                  <div v-if="!props.readonly" class="flex justify-end gap-2">
                    <UButton
                      icon="i-heroicons-plus"
                      variant="soft"
                      color="neutral"
                      size="xs"
                      class="shrink-0"
                      @click.stop="handleAddRow(index)"
                    />
                    <UButton
                      icon="i-heroicons-minus"
                      variant="soft"
                      color="error"
                      size="xs"
                      class="shrink-0"
                      @click.stop="handleRemoveRow(index)"
                    />
                  </div>
                </slot>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="md:hidden divide-y divide-default/60">
        <div
          v-for="(item, index) in items"
          :key="item.id"
          :class="[
            'px-4 py-4 space-y-3 transition-colors duration-150',
            activeRowIndex === index ? 'bg-primary-50/30 dark:bg-primary-900/10' : '',
            isQuantityExceeded(item, index) ? 'bg-warning-50/50 dark:bg-warning-900/20 border-l-4 border-warning-500' : ''
          ]"
        >
          <div class="space-y-2">
            <span class="text-xs uppercase tracking-wide text-muted/80">Cost Code</span>
            <div :class="{ 'pointer-events-none': arePOFieldsDisabled }">
              <CostCodeSelect
                :model-value="item.cost_code_uuid ?? undefined"
                :label="item.cost_code_label"
                size="xs"
                class="w-full text-left"
                :corporation-uuid="corporationUuid"
                :external-configurations="scopedCostCodeConfigurations"
                :disabled="arePOFieldsDisabled"
                @update:model-value="(value) => emitCostCodeChange(index, value as string | undefined)"
                @change="(option) => emitCostCodeChange(index, option?.uuid, option)"
              >
              </CostCodeSelect>
            </div>
            <div v-if="item.cost_code_number && item.cost_code_name" class="text-[11px] text-muted uppercase tracking-wide">
              {{ item.cost_code_number }} · {{ item.cost_code_name }}
            </div>
          </div>

            <div class="grid grid-cols-2 gap-3 text-xs text-default">
            <div>
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Item Type</span>
              <ItemTypeSelect
                :model-value="item.item_type_uuid ?? undefined"
                size="xs"
                class="w-full text-left"
                :corporation-uuid="corporationUuid"
                :project-uuid="projectUuid"
                :external-item-types="scopedItemTypes"
                :disabled="arePOFieldsDisabled"
                variant="outline"
                :ui="{
                  trigger: 'flex w-full justify-between gap-2 text-left',
                  content: 'max-h-60 min-w-full w-max',
                  item: {
                    base: 'whitespace-normal break-words',
                    label: 'whitespace-normal break-words text-left'
                  }
                }"
                @update:model-value="(value) => emitItemTypeChange(index, value as string | undefined)"
                @change="(option) => emitItemTypeChange(index, option?.value ?? option?.uuid, option)"
              >
                <template #default>
                  <span
                    class="flex-1 whitespace-normal text-left"
                    :class="{ 'text-muted': !item.item_type_uuid }"
                  >
                    {{ getItemTypeDisplayLabel(item) }}
                  </span>
                </template>
                <template #trailing="{ open }">
                  <UIcon
                    name="i-heroicons-chevron-down-20-solid"
                    class="transition-transform duration-200"
                    :class="{ 'rotate-180': open }"
                  />
                </template>
              </ItemTypeSelect>
            </div>
            <div>
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Sequence</span>
              <SequenceSelect
                :model-value="item.item_uuid ?? undefined"
                :corporation-uuid="corporationUuid"
                size="xs"
                class="w-full text-left"
                :items="item.options"
                :disabled="arePOFieldsDisabled"
                @change="(payload) => emitSequenceChange(index, payload?.value as string | undefined, payload?.option)"
              />
            </div>
            <div class="col-span-2 space-y-1">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Item</span>
              <ItemSelect
                :model-value="item.item_uuid ?? undefined"
                :corporation-uuid="corporationUuid"
                size="xs"
                class="w-full text-left"
                placeholder="Select item"
                :items="item.options"
                :disabled="arePOFieldsDisabled"
                @change="(payload) => emitItemChange(index, payload?.value ?? null, payload?.option)"
              />
            </div>
            <div v-if="!hideApprovalChecks" class="col-span-2 space-y-1">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Approval Checks</span>
              <ApprovalChecksSelect
                :model-value="item.approval_checks ?? []"
                size="xs"
                class="w-full text-left"
                :disabled="props.readonly"
                @update:model-value="(value) => emitApprovalChecksChange(index, value)"
                @change="(options) => emitApprovalChecksChange(index, options.map(opt => opt.value))"
              />
            </div>
            <div class="col-span-2">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Description</span>
              <UTextarea
                :rows="3"
                size="xs"
                class="w-full text-xs description-textarea"
                :model-value="item.description || ''"
                :readonly="arePOFieldsDisabled"
                :disabled="arePOFieldsDisabled"
              />
            </div>
            <div v-if="!hideModelNumber">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Model #</span>
              <UTextarea
                :rows="2"
                size="xs"
                class="w-full text-xs model-number-textarea"
                :model-value="item.model_number ?? ''"
                :disabled="props.readonly"
                @update:model-value="(value) => emitModelNumberChange(index, value)"
              />
            </div>
            <div>
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">UOM</span>
              <UOMSelect
                :model-value="item.unit_uuid ?? undefined"
                :corporation-uuid="corporationUuid"
                size="xs"
                class="w-full text-left"
                :disabled="arePOFieldsDisabled"
                @update:model-value="(value) => emitUomChange(index, value as string | undefined)"
                @change="(opt) => emitUomChange(index, opt?.value ?? null, opt)"
              />
            </div>
            <div v-if="showEstimateValues" class="flex flex-col gap-1">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Available Qty</span>
              <UInput
                :model-value="formatQuantity(getAvailableQuantity(item, index))"
                size="xs"
                class="text-right font-mono"
                :ui="{ base: 'bg-gray-100 dark:bg-gray-800/40 border border-transparent' }"
                disabled
              />
            </div>
            <div class="flex flex-col gap-1">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Qty</span>
              <UInput
                v-if="showEstimateValues"
                :model-value="formatQuantity(item.quantity)"
                size="xs"
                class="text-right font-mono"
                :ui="{ base: 'bg-gray-100 dark:bg-gray-800/40 border border-transparent' }"
                disabled
              />
              <!-- PO Quantity (greyed out when showInvoiceValues is true) -->
              <UInput
                v-if="showInvoiceValues"
                :model-value="formatQuantity(item.po_quantity)"
                size="xs"
                class="text-right font-mono"
                :ui="{ base: 'bg-gray-100 dark:bg-gray-800/40 border border-transparent' }"
                disabled
              />
              <!-- Editable PO Quantity (when showInvoiceValues is false) or Invoice Quantity (when showInvoiceValues is true) -->
              <UInput
                v-if="!showInvoiceValues"
                :model-value="poDrafts[index]?.quantityInput ?? toInputString(item.po_quantity)"
                size="xs"
                inputmode="decimal"
                class="text-right font-mono"
                :disabled="props.readonly"
                @focus="setActiveRow(index)"
                @blur="clearActiveRow(index)"
                @update:model-value="(value) => emitPoQuantityChange(index, value)"
              />
              <UInput
                v-else
                :model-value="invoiceDrafts[index]?.quantityInput ?? toInputString((item.invoice_quantity !== null && item.invoice_quantity !== undefined) ? item.invoice_quantity : null)"
                size="xs"
                inputmode="decimal"
                class="text-right font-mono"
                :disabled="props.readonly"
                @focus="setActiveRow(index)"
                @blur="clearActiveRow(index)"
                @update:model-value="(value) => emitInvoiceQuantityChange(index, value)"
              />
            </div>
            <div class="flex flex-col gap-1">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Unit Price</span>
              <div
                v-if="showEstimateValues"
                class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-transparent bg-gray-100 dark:bg-gray-800/40 px-3 py-1.5 po-estimate-value"
              >
                <span class="text-[11px] font-semibold text-default">{{ currencySymbolText }}</span>
                <span class="font-mono text-sm leading-none tracking-tight">
                  {{ formatCurrencyInput(item.unit_price) }}
                </span>
              </div>
              <!-- PO Unit Price (greyed out when showInvoiceValues is true) -->
              <div
                v-if="showInvoiceValues"
                class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-transparent bg-gray-100 dark:bg-gray-800/40 px-3 py-1.5 po-estimate-value"
              >
                <span class="text-[11px] font-semibold text-muted">{{ currencySymbolText }}</span>
                <span class="font-mono text-sm leading-none tracking-tight text-muted">
                  {{ formatCurrencyInput(item.po_unit_price) }}
                </span>
              </div>
              <!-- Editable PO Unit Price (when showInvoiceValues is false) or Invoice Unit Price (when showInvoiceValues is true) -->
              <div
                class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-default bg-background dark:bg-gray-900/60 px-3 py-1.5 text-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40"
              >
                <span class="text-[11px] font-semibold text-default">{{ currencySymbolText }}</span>
                <input
                  v-if="!showInvoiceValues"
                  :value="poDrafts[index]?.unitPriceInput ?? toInputString(item.po_unit_price)"
                  inputmode="decimal"
                  :disabled="props.readonly"
                  class="min-w-[2ch] bg-transparent text-right font-mono leading-none outline-none border-none focus:outline-none"
                  @focus="setActiveRow(index)"
                  @blur="clearActiveRow(index)"
                  @input="(event) => emitPoUnitPriceChange(index, (event.target as HTMLInputElement).value)"
                />
                <input
                  v-else
                  :value="invoiceDrafts[index]?.unitPriceInput ?? toInputString(item.invoice_unit_price !== undefined ? item.invoice_unit_price : item.po_unit_price)"
                  inputmode="decimal"
                  :disabled="props.readonly"
                  class="min-w-[2ch] bg-transparent text-right font-mono leading-none outline-none border-none focus:outline-none"
                  @focus="setActiveRow(index)"
                  @blur="clearActiveRow(index)"
                  @input="(event) => emitInvoiceUnitPriceChange(index, (event.target as HTMLInputElement).value)"
                />
              </div>
            </div>
            <div v-if="!hideLocation" class="col-span-2">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Location</span>
              <LocationSelect
                :model-value="item.location_uuid ?? undefined"
                size="xs"
                class="w-full text-left"
                :disabled="props.readonly"
                @update:model-value="(value) => emitLocationChange(index, value as string | undefined)"
                @change="(opt) => emitLocationChange(index, opt?.value, opt)"
              />
              <div v-if="item.location" class="text-[11px] text-muted uppercase tracking-wide mt-1">
                {{ item.location }}
              </div>
            </div>
            <div class="col-span-2 flex flex-col gap-1">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Total</span>
              <div
                v-if="showEstimateValues"
                class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-transparent bg-gray-100 dark:bg-gray-800/40 px-3 py-1.5 po-estimate-value"
              >
                <span class="text-[11px] font-semibold text-default">{{ currencySymbolText }}</span>
                <span class="font-mono text-sm leading-none tracking-tight">
                  {{ formatCurrencyInput(item.total) }}
                </span>
              </div>
              <!-- PO Total (greyed out when showInvoiceValues is true) -->
              <div
                v-if="showInvoiceValues"
                class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-transparent bg-gray-100 dark:bg-gray-800/40 px-3 py-1.5 po-estimate-value"
              >
                <span class="text-[11px] font-semibold text-muted">{{ currencySymbolText }}</span>
                <span class="font-mono text-sm leading-none tracking-tight text-muted">
                  {{ formatCurrencyInput(computePoTotal(item, index)) }}
                </span>
              </div>
              <!-- Editable PO Total (when showInvoiceValues is false) or Invoice Total (when showInvoiceValues is true) -->
              <div class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-transparent bg-background dark:bg-gray-900/60 px-3 py-1.5 po-total-display">
                <span class="text-[11px] font-semibold text-default">{{ currencySymbolText }}</span>
                <span class="font-mono text-sm leading-none tracking-tight">
                  {{ showInvoiceValues ? formatCurrencyInput(computeInvoiceTotal(item, index)) : formatCurrencyInput(computePoTotal(item, index)) }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="!props.readonly" class="flex justify-end gap-2 pt-2">
            <slot name="actions" :item="item" :index="index">
              <UButton
                icon="i-heroicons-plus"
                variant="soft"
                color="neutral"
                size="xs"
                @click.stop="handleAddRow(index)"
              />
              <UButton
                icon="i-heroicons-minus"
                variant="soft"
                color="error"
                size="xs"
                @click.stop="handleRemoveRow(index)"
              />
            </slot>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="px-4 py-6 text-sm text-muted text-center">
      {{ emptyMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, unref, reactive, ref } from 'vue'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import CostCodeSelect from '@/components/Shared/CostCodeSelect.vue'
  import ItemTypeSelect from '@/components/Shared/ItemTypeSelect.vue'
  import ItemSelect from '@/components/Shared/ItemSelect.vue'
  import SequenceSelect from '@/components/Shared/SequenceSelect.vue'
import LocationSelect from '@/components/Shared/LocationSelect.vue'
import UOMSelect from '@/components/Shared/UOMSelect.vue'
import ApprovalChecksSelect from '@/components/Shared/ApprovalChecksSelect.vue'

interface PurchaseOrderItemDisplay {
  id?: string | number
  name?: string
  description?: string
  item_uuid?: string | null
  cost_code_uuid?: string | null
  cost_code_label?: string
  cost_code_number?: string
  cost_code_name?: string
  division_name?: string
  item_type_uuid?: string | null
  item_type_label?: string
  sequence?: string
  model_number?: string
  location_uuid?: string | null
  unit?: string
  unit_uuid?: string | null
  unit_label?: string
  quantity?: number | string | null
  unit_price?: number | string | null
  total?: number | string | null
  location?: string
  approval_checks?: string[]
  po_unit_price?: string | number | null
  po_quantity?: string | number | null
  po_total?: string | number | null
  invoice_unit_price?: string | number | null
  invoice_quantity?: string | number | null
  invoice_total?: string | number | null
  to_be_invoiced?: string | number | null
  options?: Array<{
    label?: string
    value?: string
    short_name?: string
    description?: string
    unit?: string
    unit_price?: number | string | null
    [key: string]: any
  }>
}

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  items: PurchaseOrderItemDisplay[]
  loading?: boolean
  error?: string | null
  loadingMessage?: string
  emptyMessage?: string
  corporationUuid?: string
  projectUuid?: string
  scopedItemTypes?: any[]
  scopedCostCodeConfigurations?: any[]
  itemColumnWidthClass?: string
  showEstimateValues?: boolean
  showInvoiceValues?: boolean
  readonly?: boolean
  hideApprovalChecks?: boolean
  hideModelNumber?: boolean
  hideLocation?: boolean
  showEditSelection?: boolean
  usedQuantitiesByItem?: Record<string, number>
  estimateItems?: any[]
}>(), {
  title: 'PO Items',
  description: '',
  items: () => [],
  loading: false,
  error: null,
  loadingMessage: 'Loading items…',
  emptyMessage: 'No items found.',
  corporationUuid: undefined,
  projectUuid: undefined,
  scopedItemTypes: undefined,
  scopedCostCodeConfigurations: undefined,
  itemColumnWidthClass: undefined,
  showEstimateValues: true,
  showInvoiceValues: false,
  readonly: false,
  hideApprovalChecks: false,
  hideModelNumber: false,
  hideLocation: false,
  showEditSelection: false,
  usedQuantitiesByItem: () => ({}),
  estimateItems: () => [],
})

// Debug log - fires immediately when component is created
console.log('[POItemsTableWithEstimates] Component created with props:', {
  hasScopedCostCodeConfigurations: !!props.scopedCostCodeConfigurations,
  scopedCostCodeConfigurationsCount: props.scopedCostCodeConfigurations?.length || 0,
  sampleConfigs: props.scopedCostCodeConfigurations?.slice(0, 2).map((c: any) => ({
    uuid: c?.uuid,
    cost_code_number: c?.cost_code_number,
  })),
});

const hasItems = computed(() => Array.isArray(props.items) && props.items.length > 0)
const corporationUuid = computed(() => props.corporationUuid)
const projectUuid = computed(() => props.projectUuid)
const showEstimateValues = computed(() => props.showEstimateValues !== false)
const showInvoiceValues = computed(() => props.showInvoiceValues === true)
const itemColumnWidthClass = computed(() => props.itemColumnWidthClass || 'w-1/12')

// Computed properties for scoped data to pass to child components
const scopedCostCodeConfigurations = computed(() => {
  console.log('[POItemsTableWithEstimates] scopedCostCodeConfigurations computed:', {
    hasValue: !!props.scopedCostCodeConfigurations,
    count: props.scopedCostCodeConfigurations?.length || 0,
  });
  return props.scopedCostCodeConfigurations || [];
});

const scopedItemTypes = computed(() => {
  return props.scopedItemTypes || [];
});

// Debug log for scoped cost code configurations
watch(
  () => props.scopedCostCodeConfigurations,
  (newValue) => {
    console.log('[POItemsTableWithEstimates] scopedCostCodeConfigurations watcher fired:', {
      hasValue: !!newValue,
      count: newValue?.length || 0,
      sample: newValue?.slice(0, 2).map((c: any) => ({
        uuid: c?.uuid,
        cost_code_number: c?.cost_code_number,
      })),
    });
  },
  { immediate: true }
)

// When showing invoice values, PO fields (cost code, item type, sequence, item name, description) should be readonly
const arePOFieldsDisabled = computed(() => props.readonly || showInvoiceValues.value)


const { formatCurrency, currencySymbol } = useCurrencyFormat()

const currencySymbolText = computed(() => unref(currencySymbol) || '')

const quantityFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
})

const formatQuantity = (value: any) => {
  const numeric = Number(value ?? 0)
  if (!Number.isFinite(numeric)) return '0'
  return quantityFormatter.format(numeric)
}

const parseNumericInput = (value: any): number => {
  if (value === null || value === undefined) return 0
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

const roundCurrency = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

const formatCurrencyInput = (value: any): string => {
  const formatted = formatCurrency(value)
  const symbol = currencySymbolText.value
  if (typeof formatted !== 'string') {
    return String(formatted ?? '')
  }
  if (symbol && formatted.startsWith(symbol)) {
    return formatted.slice(symbol.length).trimStart()
  }
  return formatted
}

const poDrafts = reactive<Record<
  number,
  {
    key: string;
    unitPriceInput: string;
    quantityInput: string;
    unitTouched: boolean;
    quantityTouched: boolean;
  }
>>({})
const invoiceDrafts = reactive<Record<
  number,
  {
    key: string;
    unitPriceInput: string;
    quantityInput: string;
    unitTouched: boolean;
    quantityTouched: boolean;
  }
>>({})
const activeRowIndex = ref<number | null>(null)


const buildDraftKey = (item: PurchaseOrderItemDisplay, index: number) => {
  return [
    item.id ?? "",
    item.cost_code_uuid ?? "",
    item.item_type_uuid ?? "",
    item.item_uuid ?? "",
    index,
  ]
    .map((segment) => String(segment || "").trim().toUpperCase())
    .filter(Boolean)
    .join("|")
}

watch(
  () => props.items,
  (newItems = []) => {
    // Ensure we have a valid array
    if (!Array.isArray(newItems)) {
      return
    }
    
    newItems.forEach((item, index) => {
      const unitInput = toInputString(item.po_unit_price)
      const quantityInput = toInputString(item.po_quantity)
      const draftKey = buildDraftKey(item, index)
      const draft = poDrafts[index]

      if (!draft || draft.key !== draftKey) {
        poDrafts[index] = {
          key: draftKey,
          unitPriceInput: unitInput,
          quantityInput,
          unitTouched: false,
          quantityTouched: false,
        }
        return
      }

      draft.key = draftKey
      if (!draft.unitTouched && draft.unitPriceInput !== unitInput) {
        draft.unitPriceInput = unitInput
      }
      if (!draft.quantityTouched && draft.quantityInput !== quantityInput) {
        draft.quantityInput = quantityInput
      }
    })

    Object.keys(poDrafts).forEach((key) => {
      const idx = Number(key)
      if (!Number.isNaN(idx) && !newItems[idx]) {
        delete poDrafts[idx]
      }
    })
    
    // Initialize invoice drafts if showInvoiceValues is enabled
    if (showInvoiceValues.value) {
      newItems.forEach((item, index) => {
        // Use invoice values if they are explicitly set (not null/undefined), otherwise show empty
        // This ensures that:
        // - New invoices: invoice_unit_price/invoice_quantity will be null, so we show empty fields
        // - Existing invoices: invoice_unit_price/invoice_quantity will have saved values or null
        // - Don't fall back to PO values for new invoices - user should enter invoice values manually
        const invoiceUnitInput = (item.invoice_unit_price !== null && item.invoice_unit_price !== undefined)
          ? toInputString(item.invoice_unit_price)
          : ''
        const invoiceQuantityInput = (item.invoice_quantity !== null && item.invoice_quantity !== undefined)
          ? toInputString(item.invoice_quantity)
          : ''
        const draftKey = buildDraftKey(item, index)
        const invoiceDraft = invoiceDrafts[index]

        if (!invoiceDraft || invoiceDraft.key !== draftKey) {
          invoiceDrafts[index] = {
            key: draftKey,
            unitPriceInput: invoiceUnitInput,
            quantityInput: invoiceQuantityInput,
            unitTouched: false,
            quantityTouched: false,
          }
          return
        }

        invoiceDraft.key = draftKey
        // Update if not touched and value has changed
        // This ensures saved invoice values are applied when loading existing invoices
        if (!invoiceDraft.unitTouched && invoiceDraft.unitPriceInput !== invoiceUnitInput) {
          invoiceDraft.unitPriceInput = invoiceUnitInput
        }
        if (!invoiceDraft.quantityTouched && invoiceDraft.quantityInput !== invoiceQuantityInput) {
          invoiceDraft.quantityInput = invoiceQuantityInput
        }
      })

      Object.keys(invoiceDrafts).forEach((key) => {
        const idx = Number(key)
        if (!Number.isNaN(idx) && !newItems[idx]) {
          delete invoiceDrafts[idx]
        }
      })
    }
  },
  { immediate: true, deep: true }
)

const computePoTotal = (item: PurchaseOrderItemDisplay, index?: number): number => {
  const draft = index !== undefined ? poDrafts[index] : undefined

  if (draft) {
    const unitFromDraft = parseNumericInput(draft.unitPriceInput)
    const quantityFromDraft = parseNumericInput(draft.quantityInput)
    const unitFromItem = parseNumericInput(item.po_unit_price)
    const quantityFromItem = parseNumericInput(item.po_quantity)
    const draftDiffers =
      draft.unitTouched ||
      draft.quantityTouched ||
      draft.unitPriceInput !== toInputString(item.po_unit_price) ||
      draft.quantityInput !== toInputString(item.po_quantity)

    if (draftDiffers) {
      return roundCurrency(unitFromDraft * quantityFromDraft)
    }

    if (unitFromItem || quantityFromItem) {
      return roundCurrency(unitFromItem * quantityFromItem)
    }
  }

  const storedUnit = parseNumericInput(item.po_unit_price)
  const storedQuantity = parseNumericInput(item.po_quantity)
  if (storedUnit || storedQuantity) {
    return roundCurrency(storedUnit * storedQuantity)
  }

  const storedTotal = parseNumericInput(item.po_total)
  if (storedTotal) {
    return roundCurrency(storedTotal)
  }

  return 0
}

const computeInvoiceTotal = (item: PurchaseOrderItemDisplay, index?: number): number => {
  if (!showInvoiceValues.value) return 0
  
  const draft = index !== undefined ? invoiceDrafts[index] : undefined

  if (draft) {
    const unitFromDraft = parseNumericInput(draft.unitPriceInput)
    const quantityFromDraft = parseNumericInput(draft.quantityInput)
    
    // If draft has been touched or has values, use draft values
    if (draft.unitTouched || draft.quantityTouched || (unitFromDraft > 0 && quantityFromDraft > 0)) {
      return roundCurrency(unitFromDraft * quantityFromDraft)
    }
    
    // Otherwise, check if invoice values are set (not null/undefined)
    // For new invoices, invoice_unit_price and invoice_quantity are null, so we should return 0
    const hasInvoiceUnitPrice = item.invoice_unit_price !== null && item.invoice_unit_price !== undefined
    const hasInvoiceQuantity = item.invoice_quantity !== null && item.invoice_quantity !== undefined
    
    if (hasInvoiceUnitPrice && hasInvoiceQuantity) {
      const unitFromItem = parseNumericInput(item.invoice_unit_price)
      const quantityFromItem = parseNumericInput(item.invoice_quantity)
      if (unitFromItem > 0 && quantityFromItem > 0) {
        return roundCurrency(unitFromItem * quantityFromItem)
      }
    }
    
    // If invoice_total is set (not null/undefined), use it
    if (item.invoice_total !== null && item.invoice_total !== undefined) {
      const storedTotal = parseNumericInput(item.invoice_total)
      if (storedTotal > 0) {
        return roundCurrency(storedTotal)
      }
    }
  }

  // No draft - check if invoice values are explicitly set (not null/undefined)
  // For new invoices, invoice_unit_price and invoice_quantity are null, so don't fall back to PO values
  const hasInvoiceUnitPrice = item.invoice_unit_price !== null && item.invoice_unit_price !== undefined
  const hasInvoiceQuantity = item.invoice_quantity !== null && item.invoice_quantity !== undefined
  
  if (hasInvoiceUnitPrice && hasInvoiceQuantity) {
    const storedUnit = parseNumericInput(item.invoice_unit_price)
    const storedQuantity = parseNumericInput(item.invoice_quantity)
    if (storedUnit > 0 && storedQuantity > 0) {
      return roundCurrency(storedUnit * storedQuantity)
    }
  }

  // If invoice_total is explicitly set (not null/undefined), use it
  if (item.invoice_total !== null && item.invoice_total !== undefined) {
    const storedTotal = parseNumericInput(item.invoice_total)
    if (storedTotal > 0) {
      return roundCurrency(storedTotal)
    }
  }

  // For new invoices, return 0 instead of falling back to PO values
  return 0
}

const emit = defineEmits<{
  (e: 'edit-selection'): void
  (e: 'add-row', index: number): void
  (e: 'remove-row', index: number): void
  (e: 'cost-code-change', payload: { index: number; value: string | null; option?: any }): void
  (e: 'location-change', payload: { index: number; value: string | null; option?: any }): void
  (e: 'item-type-change', payload: { index: number; value: string | null; option?: any }): void
  (e: 'sequence-change', payload: { index: number; value: string | null; option?: any }): void
  (e: 'item-change', payload: { index: number; value: string | null; option?: any }): void
  (e: 'approval-checks-change', payload: { index: number; value: string[] }): void
  (e: 'model-number-change', payload: { index: number; value: string }): void
  (e: 'uom-change', payload: { index: number; value: string | null; option?: any }): void
  (e: 'po-unit-price-change', payload: { index: number; value: string | number | null | undefined; numericValue: number; computedTotal: number }): void
  (e: 'po-quantity-change', payload: { index: number; value: string | number | null | undefined; numericValue: number; computedTotal: number }): void
  (e: 'po-total-change', payload: { index: number; value: number }): void
  (e: 'invoice-unit-price-change', payload: { index: number; value: string | number | null | undefined; numericValue: number; computedTotal: number }): void
  (e: 'invoice-quantity-change', payload: { index: number; value: string | number | null | undefined; numericValue: number; computedTotal: number }): void
  (e: 'invoice-total-change', payload: { index: number; value: number }): void
}>()

const handleAddRow = (index: number) => {
  emit('add-row', index)
}

const handleRemoveRow = (index: number) => {
  emit('remove-row', index)
}

const emitCostCodeChange = (index: number, value?: string, option?: any) => {
  // Don't emit changes when readonly to prevent modifications while preserving appearance
  if (!props.readonly) {
    emit('cost-code-change', { index, value: value ?? null, option })
  }
}

const emitItemTypeChange = (index: number, value?: string, option?: any) => {
  emit('item-type-change', { index, value: value ?? null, option })
}

const emitSequenceChange = (index: number, value?: string | null, option?: any) => {
  emit('sequence-change', { index, value: value ?? null, option })
}

const emitLocationChange = (index: number, value?: string, option?: any) => {
  emit('location-change', { index, value: value ?? null, option })
}

const emitItemChange = (index: number, value?: string | null, option?: any) => {
  emit('item-change', { index, value: value ?? null, option })
}

const emitApprovalChecksChange = (index: number, value: string[]) => {
  emit('approval-checks-change', { index, value: value || [] })
}

const emitModelNumberChange = (index: number, value?: string) => {
  emit('model-number-change', { index, value: value ?? '' })
}

const emitUomChange = (index: number, value?: string | null, option?: any) => {
  emit('uom-change', { index, value: value ?? null, option })
}

const emitPoTotalChange = (index: number, total: number) => {
  emit('po-total-change', { index, value: total })
}

const emitPoUnitPriceChange = (index: number, value: string | number | null | undefined) => {
  const item = props.items?.[index]
  const draft =
    poDrafts[index] ||
    (poDrafts[index] = {
      key: buildDraftKey(item as PurchaseOrderItemDisplay, index),
      unitPriceInput: toInputString(item?.po_unit_price),
      quantityInput: toInputString(item?.po_quantity),
      unitTouched: false,
      quantityTouched: false,
    })
  draft.unitPriceInput = toInputString(value)
  draft.unitTouched = true
  const numericValue = parseNumericInput(draft.unitPriceInput)
  const quantityNumeric = parseNumericInput(draft.quantityInput ?? '')
  const computedTotal = roundCurrency(numericValue * quantityNumeric)
  emit('po-unit-price-change', { index, value, numericValue, computedTotal })
  emitPoTotalChange(index, computedTotal)
}

const emitPoQuantityChange = (index: number, value: string | number | null | undefined) => {
  const item = props.items?.[index]
  const draft =
    poDrafts[index] ||
    (poDrafts[index] = {
      key: buildDraftKey(item as PurchaseOrderItemDisplay, index),
      unitPriceInput: toInputString(item?.po_unit_price),
      quantityInput: toInputString(item?.po_quantity),
      unitTouched: false,
      quantityTouched: false,
    })
  draft.quantityInput = toInputString(value)
  draft.quantityTouched = true
  const numericValue = parseNumericInput(draft.quantityInput)
  const unitNumeric = parseNumericInput(draft.unitPriceInput ?? '')
  const computedTotal = roundCurrency(unitNumeric * numericValue)
  emit('po-quantity-change', { index, value, numericValue, computedTotal })
  emitPoTotalChange(index, computedTotal)
}

const emitInvoiceTotalChange = (index: number, total: number) => {
  emit('invoice-total-change', { index, value: total })
}

const emitInvoiceUnitPriceChange = (index: number, value: string | number | null | undefined) => {
  const item = props.items?.[index]
  const invoiceUnitInput = (item?.invoice_unit_price !== null && item?.invoice_unit_price !== undefined)
    ? toInputString(item.invoice_unit_price)
    : ''
  const invoiceQuantityInput = (item?.invoice_quantity !== null && item?.invoice_quantity !== undefined)
    ? toInputString(item.invoice_quantity)
    : ''
  const draft =
    invoiceDrafts[index] ||
    (invoiceDrafts[index] = {
      key: buildDraftKey(item as PurchaseOrderItemDisplay, index),
      unitPriceInput: invoiceUnitInput,
      quantityInput: invoiceQuantityInput,
      unitTouched: false,
      quantityTouched: false,
    })
  draft.unitPriceInput = toInputString(value)
  draft.unitTouched = true
  const numericValue = parseNumericInput(draft.unitPriceInput)
  const quantityNumeric = parseNumericInput(draft.quantityInput ?? '')
  const computedTotal = roundCurrency(numericValue * quantityNumeric)
  emit('invoice-unit-price-change', { index, value, numericValue, computedTotal })
  emitInvoiceTotalChange(index, computedTotal)
}

// Check if an item has invoice quantity greater than to_be_invoiced
const isOverInvoiced = (item: PurchaseOrderItemDisplay, index: number): boolean => {
  if (!showInvoiceValues.value) return false
  const toBeInvoiced = parseNumericInput(item.to_be_invoiced ?? 0)
  if (toBeInvoiced <= 0) return false // No limit if to_be_invoiced is 0 or negative
  
  // Check both the draft value and the actual item value
  const draftValue = invoiceDrafts[index]?.quantityInput
  const currentValue = item.invoice_quantity
  
  // Parse draft value if it exists
  if (draftValue !== undefined && draftValue !== null && draftValue !== '') {
    const draftNumeric = parseNumericInput(draftValue)
    if (draftNumeric > toBeInvoiced) return true
  }
  
  // Parse current value
  const currentNumeric = parseNumericInput(currentValue)
  return currentNumeric > toBeInvoiced
}

// Build a map of estimate items by item_uuid for quick lookup
const estimateItemsMap = computed(() => {
  const map = new Map<string, any>();
  const estimateItems = props.estimateItems || [];
  estimateItems.forEach((estItem: any) => {
    if (estItem?.item_uuid) {
      map.set(String(estItem.item_uuid).toLowerCase(), estItem);
    }
  });
  return map;
});

// Get available quantity for a PO item (estimate quantity - used quantities from other POs)
const getAvailableQuantity = (item: PurchaseOrderItemDisplay, index: number): number => {
  if (!item.item_uuid) return 0;
  
  const itemUuidKey = String(item.item_uuid).toLowerCase();
  const estimateItem = estimateItemsMap.value.get(itemUuidKey);
  if (!estimateItem) return 0;
  
  const estimateQuantity = parseNumericInput(estimateItem.quantity || 0);
  const usedQuantity = props.usedQuantitiesByItem?.[itemUuidKey] || 0;
  
  const availableQuantity = Math.max(0, estimateQuantity - usedQuantity);
  return availableQuantity;
}

// Check if an item has PO quantity exceeding available estimate quantity
const isQuantityExceeded = (item: PurchaseOrderItemDisplay, index: number): boolean => {
  if (showInvoiceValues.value) return false; // Only check for PO quantities, not invoice
  if (!item.item_uuid) return false;
  
  const itemUuidKey = String(item.item_uuid).toLowerCase();
  const estimateItem = estimateItemsMap.value.get(itemUuidKey);
  if (!estimateItem) return false;
  
  const estimateQuantity = parseNumericInput(estimateItem.quantity || 0);
  if (estimateQuantity <= 0) return false; // No limit if estimate quantity is 0 or negative
  
  // Check both the draft value and the actual item value
  const draftValue = poDrafts[index]?.quantityInput;
  const currentValue = item.po_quantity;
  const usedQuantity = props.usedQuantitiesByItem?.[itemUuidKey] || 0;
  
  let currentPoQuantity = 0;
  
  // Parse draft value if it exists (user is typing)
  if (draftValue !== undefined && draftValue !== null && draftValue !== '') {
    currentPoQuantity = parseNumericInput(draftValue);
  } else if (currentValue !== null && currentValue !== undefined && currentValue !== '') {
    currentPoQuantity = parseNumericInput(currentValue);
  }
  
  const totalQuantity = usedQuantity + currentPoQuantity;
  return totalQuantity > estimateQuantity;
}

const emitInvoiceQuantityChange = (index: number, value: string | number | null | undefined) => {
  const item = props.items?.[index]
  const invoiceUnitInput = (item?.invoice_unit_price !== null && item?.invoice_unit_price !== undefined)
    ? toInputString(item.invoice_unit_price)
    : ''
  const invoiceQuantityInput = (item?.invoice_quantity !== null && item?.invoice_quantity !== undefined)
    ? toInputString(item.invoice_quantity)
    : ''
  const draft =
    invoiceDrafts[index] ||
    (invoiceDrafts[index] = {
      key: buildDraftKey(item as PurchaseOrderItemDisplay, index),
      unitPriceInput: invoiceUnitInput,
      quantityInput: invoiceQuantityInput,
      unitTouched: false,
      quantityTouched: false,
    })
  draft.quantityInput = toInputString(value)
  draft.quantityTouched = true
  const numericValue = parseNumericInput(draft.quantityInput)
  const unitNumeric = parseNumericInput(draft.unitPriceInput ?? '')
  const computedTotal = roundCurrency(unitNumeric * numericValue)
  emit('invoice-quantity-change', { index, value, numericValue, computedTotal })
  emitInvoiceTotalChange(index, computedTotal)
}

const setActiveRow = (index: number | null) => {
  activeRowIndex.value = index
}

const clearActiveRow = (index: number) => {
  if (activeRowIndex.value === index) {
    activeRowIndex.value = null
  }
}

const handleEditSelection = () => {
  emit('edit-selection')
}

// Helper to get item type display label
const getItemTypeDisplayLabel = (item: PurchaseOrderItemDisplay): string => {
  // Try to find the item type label from scopedItemTypes if available
  if (item.item_type_uuid && props.scopedItemTypes && Array.isArray(props.scopedItemTypes)) {
    const itemType = props.scopedItemTypes.find((it: any) => it.uuid === item.item_type_uuid)
    if (itemType?.item_type) {
      return itemType.item_type
    }
  }
  
  // Fallback to stored label
  if (item.item_type_label) {
    return item.item_type_label
  }
  
  // Final fallback
  return 'Select item type'
}

// Expose to template
defineExpose({ formatCurrency, formatQuantity })
</script>

<style scoped>
</style>

