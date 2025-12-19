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
      <div v-if="hasItems" class="text-[11px] font-medium text-muted uppercase tracking-wide">
        {{ items.length }} items
      </div>
    </div>

    <div v-if="error" class="px-4 py-3 text-xs text-error-700 bg-error-50/80 dark:bg-error-900/20 border-b border-error-200">
      {{ error }}
    </div>
    
    <!-- Skeleton Loaders -->
    <div v-else-if="loading" class="px-4 py-4">
      <div class="hidden md:block">
        <table class="min-w-full table-fixed divide-y divide-default/60">
          <thead class="bg-muted/20 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th class="w-1/12 px-4 py-2 text-left"><USkeleton class="h-3 w-20" /></th>
              <th class="w-1/12 px-4 py-2 text-left"><USkeleton class="h-3 w-16" /></th>
              <th class="w-1/12 px-4 py-2 text-left"><USkeleton class="h-3 w-20" /></th>
              <th class="w-1/12 px-4 py-2 text-left"><USkeleton class="h-3 w-20" /></th>
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
              <td class="px-2 py-2"><USkeleton class="h-4 w-32" /></td>
              <td class="px-2 py-2"><USkeleton class="h-4 w-24" /></td>
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
      <div class="md:hidden divide-y divide-default/60">
        <div v-for="i in 3" :key="i" class="px-4 py-4 space-y-3">
          <USkeleton class="h-4 w-32" />
          <USkeleton class="h-3 w-24" />
          <div class="grid grid-cols-2 gap-3">
            <USkeleton class="h-4 w-full" />
            <USkeleton class="h-4 w-full" />
            <USkeleton class="h-4 w-full" />
            <USkeleton class="h-4 w-full" />
            <USkeleton class="h-4 w-full" />
            <USkeleton class="h-4 w-full" />
          </div>
          <USkeleton class="h-8 w-16 ml-auto" />
        </div>
      </div>
    </div>

    <div v-else-if="hasItems">
      <div class="hidden md:block">
        <table class="min-w-full table-fixed divide-y divide-default/60">
          <thead class="bg-muted/20 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th class="w-1/12 px-4 py-2 text-left">Cost Code</th>
              <th class="w-1/12 px-4 py-2 text-left">Sequence</th>
              <th class="w-1/12 px-4 py-2 text-left">Item</th>
              <th v-if="!props.hideApprovalChecks" class="w-1/12 px-4 py-2 text-left">Approval Checks</th>
              <th class="w-1/12 px-4 py-2 text-right">Orig Unit</th>
              <th class="w-1/12 px-4 py-2 text-right">Orig Qty</th>
              <th class="w-1/12 px-4 py-2 text-right">Orig Total</th>
              <th class="w-1/12 px-4 py-2 text-right">CO Unit</th>
              <th v-if="showInvoiceValues" class="w-1/12 px-4 py-2 text-right">To Be Invoiced</th>
              <th class="w-1/12 px-4 py-2 text-right">CO Qty</th>
              <th class="w-1/12 px-4 py-2 text-right">CO Total</th>
              <th class="w-1/12 px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default/60 text-sm text-default">
            <tr
              v-for="(row, index) in displayRows"
              :key="row.id || index"
              class="align-middle"
            >
              <td class="px-2 py-2">
                <div class="text-xs">
                  <div class="font-medium truncate">{{ row.cost_code_label }}</div>
                </div>
              </td>
              <td class="px-2 py-2">
                <div class="text-xs">
                  <div class="font-mono text-[11px] text-muted uppercase tracking-wide truncate">
                    {{ row.sequence || '—' }}
                  </div>
                </div>
              </td>
              <td class="px-2 py-2">
                <div class="text-xs">
                  <div class="font-medium truncate">{{ row.name }}</div>
                  <div v-if="row.item_type_label" class="text-[11px] text-muted uppercase tracking-wide">
                    {{ row.item_type_label }}
                  </div>
                </div>
              </td>
              <td v-if="!props.hideApprovalChecks" class="px-2 py-2 align-middle w-1/12">
                <ApprovalChecksSelect
                  :model-value="row.approval_checks ?? []"
                  size="xs"
                  class="w-full min-w-0 text-left"
                  :disabled="props.readonly"
                  @update:model-value="(value) => emitApprovalChecksChange(index, value)"
                  @change="(options) => emitApprovalChecksChange(index, options.map(opt => opt.value))"
                />
              </td>
              <td class="px-2 py-2 text-right">
                <div class="flex items-center justify-end gap-0.5">
                  <span class="text-xs font-semibold text-default">{{ currencySymbolText }}</span>
                  <span class="font-mono text-sm">{{ formatCurrencyInput(row.unit_price) }}</span>
                </div>
              </td>
              <td class="px-2 py-2 text-right">
                <span class="font-mono text-sm">{{ formatQuantity(row.quantity) }}</span>
              </td>
              <td class="px-2 py-2 text-right">
                <div class="flex items-center justify-end gap-0.5">
                  <span class="text-xs font-semibold text-default">{{ currencySymbolText }}</span>
                  <span class="font-mono text-sm">{{ formatCurrencyInput(row.total) }}</span>
                </div>
              </td>
              <td class="px-2 py-2 text-right">
                <div class="flex flex-col items-end gap-1">
                  <!-- CO Unit Price (greyed out when showInvoiceValues is true) -->
                  <div v-if="showInvoiceValues" class="w-full max-w-[140px]">
                    <div class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-transparent bg-gray-100 dark:bg-gray-800/40 px-3 py-1.5">
                      <span class="text-xs font-semibold text-muted">{{ currencySymbolText }}</span>
                      <span class="font-mono text-sm leading-none tracking-tight text-muted">
                        {{ formatCurrencyInput(row.co_unit_price) }}
                      </span>
                    </div>
                  </div>
                  <!-- Editable CO Unit Price (when showInvoiceValues is false) or Invoice Unit Price (when showInvoiceValues is true) -->
                  <div class="w-full max-w-[140px]">
                    <div class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-default bg-background dark:bg-gray-900/60 px-3 py-1.5 text-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40">
                      <span class="text-xs font-semibold text-default">{{ currencySymbolText }}</span>
                      <input
                        v-if="!showInvoiceValues"
                        :value="coDrafts[index]?.unitPriceInput ?? toInputString(row.co_unit_price)"
                        inputmode="decimal"
                        class="min-w-[2ch] bg-transparent text-right font-mono leading-none outline-none border-none focus:outline-none"
                        :size="Math.max((coDrafts[index]?.unitPriceInput?.length || toInputString(row.co_unit_price).length || 3), 3)"
                        :disabled="props.readonly"
                        @input="(event) => onCoUnitPriceInput(index, (event.target as HTMLInputElement).value)"
                      />
                      <input
                        v-else
                        :value="invoiceDrafts[index]?.unitPriceInput ?? toInputString((row.invoice_unit_price !== null && row.invoice_unit_price !== undefined) ? row.invoice_unit_price : null)"
                        inputmode="decimal"
                        class="min-w-[2ch] bg-transparent text-right font-mono leading-none outline-none border-none focus:outline-none"
                        :disabled="props.readonly"
                        @input="(event) => onInvoiceUnitPriceInput(index, (event.target as HTMLInputElement).value)"
                      />
                    </div>
                  </div>
                </div>
              </td>
              <td v-if="showInvoiceValues" class="px-2 py-2 text-right">
                <div class="flex items-center justify-end">
                  <span class="font-mono text-sm text-default">{{ formatQuantity(row.to_be_invoiced ?? 0) }}</span>
                </div>
              </td>
              <td class="px-2 py-2 text-right">
                <div class="flex flex-col items-end gap-1">
                  <!-- CO Quantity (greyed out when showInvoiceValues is true) -->
                  <UInput
                    v-if="showInvoiceValues"
                    :model-value="formatQuantity(row.co_quantity)"
                    size="xs"
                    class="w-full max-w-[120px] text-right font-mono"
                    :ui="{ base: 'bg-gray-100 dark:bg-gray-800/40 border border-transparent' }"
                    disabled
                  />
                  <!-- Editable CO Quantity (when showInvoiceValues is false) or Invoice Quantity (when showInvoiceValues is true) -->
                  <UInput
                    v-if="!showInvoiceValues"
                    :model-value="coDrafts[index]?.quantityInput ?? toInputString(row.co_quantity)"
                    size="xs"
                    inputmode="decimal"
                    class="w-full max-w-[120px] text-right font-mono"
                    :disabled="props.readonly"
                    @update:model-value="(value) => onCoQuantityInput(index, value)"
                  />
                  <UInput
                    v-else
                    :model-value="invoiceDrafts[index]?.quantityInput ?? toInputString((row.invoice_quantity !== null && row.invoice_quantity !== undefined) ? row.invoice_quantity : null)"
                    size="xs"
                    inputmode="decimal"
                    class="w-full max-w-[120px] text-right font-mono"
                    :disabled="props.readonly"
                    @update:model-value="(value) => onInvoiceQuantityInput(index, value)"
                  />
                </div>
              </td>
              <td class="px-2 py-2 text-right">
                <div class="flex flex-col items-end gap-1">
                  <!-- CO Total (greyed out when showInvoiceValues is true) -->
                  <div v-if="showInvoiceValues" class="w-full max-w-[180px]">
                    <div class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-transparent bg-gray-100 dark:bg-gray-800/40 px-3 py-1.5">
                      <span class="text-xs font-semibold text-muted">{{ currencySymbolText }}</span>
                      <span class="font-mono text-sm leading-none tracking-tight text-muted">
                        {{ formatCurrencyInput(computeCoTotal(row, index)) }}
                      </span>
                    </div>
                  </div>
                  <!-- Editable CO Total (when showInvoiceValues is false) or Invoice Total (when showInvoiceValues is true) -->
                  <div class="w-full max-w-[180px]">
                    <div class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-transparent bg-background dark:bg-gray-900/60 px-3 py-1.5">
                      <span class="text-xs font-semibold text-default">{{ currencySymbolText }}</span>
                      <span class="font-mono text-sm leading-none tracking-tight">
                        {{ showInvoiceValues ? formatCurrencyInput(computeInvoiceTotal(row, index)) : formatCurrencyInput(computeCoTotal(row, index)) }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-2 py-2 text-right">
                <slot name="actions" :row="row" :index="index">
                  <UButton
                    icon="i-heroicons-minus"
                    variant="soft"
                    color="error"
                    size="xs"
                    class="shrink-0"
                    :disabled="props.readonly"
                    @click.stop="emitRemoveRow(index)"
                  />
                </slot>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="md:hidden divide-y divide-default/60">
        <div
          v-for="(row, index) in displayRows"
          :key="row.id || index"
          class="px-4 py-4 space-y-3"
        >
          <div class="text-xs">
            <div class="font-semibold text-default">{{ row.name }}</div>
            <div class="text-[11px] text-muted uppercase tracking-wide">
              {{ row.cost_code_label }}
            </div>
            <div
              v-if="row.sequence"
              class="inline-flex items-center px-2 py-0.5 mt-1 rounded-full border border-default text-[11px] text-muted uppercase tracking-wide"
            >
              {{ row.sequence }}
            </div>
            <div v-if="row.description" class="text-[11px] text-muted mt-1">
              {{ row.description }}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs text-default">
            <div v-if="!props.hideApprovalChecks" class="col-span-2 space-y-1">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Approval Checks</span>
              <ApprovalChecksSelect
                :model-value="row.approval_checks ?? []"
                size="xs"
                class="w-full text-left"
                :disabled="props.readonly"
                @update:model-value="(value) => emitApprovalChecksChange(index, value)"
                @change="(options) => emitApprovalChecksChange(index, options.map(opt => opt.value))"
              />
            </div>
            <div>
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Orig Unit</span>
              <div class="flex items-center gap-0.5">
                <span class="text-[11px] font-semibold text-default">{{ currencySymbolText }}</span>
                <span class="font-mono">{{ formatCurrencyInput(row.unit_price) }}</span>
              </div>
            </div>
            <div>
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Orig Qty</span>
              <div class="font-mono">{{ formatQuantity(row.quantity) }}</div>
            </div>
            <div>
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Orig Total</span>
              <div class="flex items-center gap-0.5">
                <span class="text-[11px] font-semibold text-default">{{ currencySymbolText }}</span>
                <span class="font-mono">{{ formatCurrencyInput(row.total) }}</span>
              </div>
            </div>
            <div>
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">CO Unit</span>
              <!-- CO Unit Price (greyed out when showInvoiceValues is true) -->
              <div
                v-if="showInvoiceValues"
                class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-transparent bg-gray-100 dark:bg-gray-800/40 px-3 py-1.5"
              >
                <span class="text-[11px] font-semibold text-muted">{{ currencySymbolText }}</span>
                <span class="font-mono text-sm leading-none tracking-tight text-muted">
                  {{ formatCurrencyInput(row.co_unit_price) }}
                </span>
              </div>
              <!-- Editable CO Unit Price (when showInvoiceValues is false) or Invoice Unit Price (when showInvoiceValues is true) -->
              <div
                class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-default bg-background dark:bg-gray-900/60 px-3 py-1.5 text-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40"
              >
                <span class="text-[11px] font-semibold text-default">{{ currencySymbolText }}</span>
                <input
                  v-if="!showInvoiceValues"
                  :value="coDrafts[index]?.unitPriceInput ?? toInputString(row.co_unit_price)"
                  inputmode="decimal"
                  class="min-w-[2ch] bg-transparent text-right font-mono leading-none outline-none border-none focus:outline-none"
                  :size="Math.max((coDrafts[index]?.unitPriceInput?.length || toInputString(row.co_unit_price).length || 3), 3)"
                  :disabled="props.readonly"
                  @input="(event) => onCoUnitPriceInput(index, (event.target as HTMLInputElement).value)"
                />
                <input
                  v-else
                  :value="invoiceDrafts[index]?.unitPriceInput ?? toInputString((row.invoice_unit_price !== null && row.invoice_unit_price !== undefined) ? row.invoice_unit_price : null)"
                  inputmode="decimal"
                  class="min-w-[2ch] bg-transparent text-right font-mono leading-none outline-none border-none focus:outline-none"
                  :disabled="props.readonly"
                  @input="(event) => onInvoiceUnitPriceInput(index, (event.target as HTMLInputElement).value)"
                />
              </div>
            </div>
            <div v-if="showInvoiceValues">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">To Be Invoiced</span>
              <span class="font-mono text-sm text-default">{{ formatQuantity(row.to_be_invoiced ?? 0) }}</span>
            </div>
            <div>
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">CO Qty</span>
              <!-- CO Quantity (greyed out when showInvoiceValues is true) -->
              <UInput
                v-if="showInvoiceValues"
                :model-value="formatQuantity(row.co_quantity)"
                size="xs"
                class="text-right font-mono"
                :ui="{ base: 'bg-gray-100 dark:bg-gray-800/40 border border-transparent' }"
                disabled
              />
              <!-- Editable CO Quantity (when showInvoiceValues is false) or Invoice Quantity (when showInvoiceValues is true) -->
              <UInput
                v-if="!showInvoiceValues"
                :model-value="coDrafts[index]?.quantityInput ?? toInputString(row.co_quantity)"
                size="xs"
                inputmode="decimal"
                class="text-right font-mono"
                :disabled="props.readonly"
                @update:model-value="(value) => onCoQuantityInput(index, value)"
              />
              <UInput
                v-else
                :model-value="invoiceDrafts[index]?.quantityInput ?? toInputString((row.invoice_quantity !== null && row.invoice_quantity !== undefined) ? row.invoice_quantity : null)"
                size="xs"
                inputmode="decimal"
                class="text-right font-mono"
                :disabled="props.readonly"
                @update:model-value="(value) => onInvoiceQuantityInput(index, value)"
              />
            </div>
            <div class="col-span-2">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">CO Total</span>
              <!-- CO Total (greyed out when showInvoiceValues is true) -->
              <div
                v-if="showInvoiceValues"
                class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-transparent bg-gray-100 dark:bg-gray-800/40 px-3 py-1.5"
              >
                <span class="text-[11px] font-semibold text-muted">{{ currencySymbolText }}</span>
                <span class="font-mono text-sm leading-none tracking-tight text-muted">
                  {{ formatCurrencyInput(computeCoTotal(row, index)) }}
                </span>
              </div>
              <!-- Editable CO Total (when showInvoiceValues is false) or Invoice Total (when showInvoiceValues is true) -->
              <div class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-transparent bg-background dark:bg-gray-900/60 px-3 py-1.5">
                <span class="text-[11px] font-semibold text-default">{{ currencySymbolText }}</span>
                <span class="font-mono text-sm leading-none tracking-tight">
                  {{ showInvoiceValues ? formatCurrencyInput(computeInvoiceTotal(row, index)) : formatCurrencyInput(computeCoTotal(row, index)) }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <slot name="actions" :row="row" :index="index">
              <UButton
                icon="i-heroicons-minus"
                variant="soft"
                color="error"
                size="xs"
                :disabled="props.readonly"
                @click.stop="emitRemoveRow(index)"
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
import { computed, reactive, unref } from 'vue'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import ApprovalChecksSelect from '@/components/Shared/ApprovalChecksSelect.vue'

interface OriginalItemDisplay {
  id?: string | number
  name?: string
  description?: string
  cost_code_label?: string
  cost_code_number?: string
  cost_code_name?: string
  sequence?: string | null
  item_type_label?: string | null
  approval_checks?: string[]
  unit_price?: number | string | null
  quantity?: number | string | null
  total?: number | string | null
  co_unit_price?: number | string | null
  co_quantity?: number | string | null
  co_total?: number | string | null
  invoice_unit_price?: number | string | null
  invoice_quantity?: number | string | null
  invoice_total?: number | string | null
  to_be_invoiced?: number | string | null
  [key: string]: any
}

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  items: OriginalItemDisplay[]
  loading?: boolean
  error?: string | null
  loadingMessage?: string
  emptyMessage?: string
  readonly?: boolean
  showInvoiceValues?: boolean
  hideApprovalChecks?: boolean
}>(), {
  title: 'Change Order Items',
  description: 'Original order shown for reference. Enter change order values.',
  items: () => [],
  loading: false,
  error: null,
  loadingMessage: 'Loading original order…',
  emptyMessage: 'No original order items found.',
  showInvoiceValues: false,
  hideApprovalChecks: false,
})

const emit = defineEmits<{
  (e: 'co-unit-price-change', payload: { index: number; value: string | number | null | undefined; numericValue: number; computedTotal: number }): void
  (e: 'co-quantity-change', payload: { index: number; value: string | number | null | undefined; numericValue: number; computedTotal: number }): void
  (e: 'invoice-unit-price-change', payload: { index: number; value: string | number | null | undefined; numericValue: number; computedTotal: number }): void
  (e: 'invoice-quantity-change', payload: { index: number; value: string | number | null | undefined; numericValue: number; computedTotal: number }): void
  (e: 'invoice-total-change', payload: { index: number; value: number }): void
  (e: 'approval-checks-change', payload: { index: number; value: string[] }): void
  (e: 'remove-row', index: number): void
}>()

const hasItems = computed(() => Array.isArray(props.items) && props.items.length > 0)
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

const coDrafts = reactive<Record<number, { unitPriceInput: string; quantityInput: string }>>({})
const invoiceDrafts = reactive<Record<number, { unitPriceInput: string; quantityInput: string }>>({})
const showInvoiceValues = computed(() => props.showInvoiceValues === true)

const displayRows = computed(() => {
  return (props.items || []).map((row, index) => {
    // Initialize CO drafts
    const coDraft = coDrafts[index] || (coDrafts[index] = {
      unitPriceInput: toInputString(row.co_unit_price),
      quantityInput: toInputString(row.co_quantity),
    })
    // Keep CO drafts in sync if untouched
    if (coDraft.unitPriceInput === '' && toInputString(row.co_unit_price) !== '') {
      coDraft.unitPriceInput = toInputString(row.co_unit_price)
    }
    if (coDraft.quantityInput === '' && toInputString(row.co_quantity) !== '') {
      coDraft.quantityInput = toInputString(row.co_quantity)
    }
    
    // Initialize invoice drafts if showInvoiceValues is enabled
    if (showInvoiceValues.value) {
      // Use invoice values if they are explicitly set (not null/undefined), otherwise show empty
      // This ensures that:
      // - New invoices: invoice_unit_price/invoice_quantity will be null, so we show empty fields
      // - Existing invoices: invoice_unit_price/invoice_quantity will have saved values or null
      // - Don't fall back to CO values for new invoices - user should enter invoice values manually
      const invoiceUnitInput = (row.invoice_unit_price !== null && row.invoice_unit_price !== undefined)
        ? toInputString(row.invoice_unit_price)
        : ''
      const invoiceQuantityInput = (row.invoice_quantity !== null && row.invoice_quantity !== undefined)
        ? toInputString(row.invoice_quantity)
        : ''
      
      const invoiceDraft = invoiceDrafts[index] || (invoiceDrafts[index] = {
        unitPriceInput: invoiceUnitInput,
        quantityInput: invoiceQuantityInput,
      })
      
      // Keep invoice drafts in sync if untouched
      if (invoiceDraft.unitPriceInput === '' && invoiceUnitInput !== '') {
        invoiceDraft.unitPriceInput = invoiceUnitInput
      }
      if (invoiceDraft.quantityInput === '' && invoiceQuantityInput !== '') {
        invoiceDraft.quantityInput = invoiceQuantityInput
      }
    }
    
    return row
  })
})

const computeCoTotal = (row: OriginalItemDisplay, index?: number): number => {
  const d = index !== undefined ? coDrafts[index] : undefined
  if (d) {
    const unit = parseNumericInput(d.unitPriceInput)
    const qty = parseNumericInput(d.quantityInput)
    return roundCurrency(unit * qty)
  }
  const unitStored = parseNumericInput(row.co_unit_price)
  const qtyStored = parseNumericInput(row.co_quantity)
  const storedTotal = parseNumericInput(row.co_total)
  if (unitStored || qtyStored) {
    return roundCurrency(unitStored * qtyStored)
  }
  if (storedTotal) return roundCurrency(storedTotal)
  return 0
}

const computeInvoiceTotal = (row: OriginalItemDisplay, index?: number): number => {
  if (!showInvoiceValues.value) return 0
  
  const d = index !== undefined ? invoiceDrafts[index] : undefined
  if (d) {
    const unit = parseNumericInput(d.unitPriceInput)
    const qty = parseNumericInput(d.quantityInput)
    // If draft has non-zero values, use them
    if (unit > 0 && qty > 0) {
      return roundCurrency(unit * qty)
    }
    // If draft values are 0 or empty, check invoice_total before returning 0
    if (row.invoice_total !== null && row.invoice_total !== undefined) {
      const storedTotal = parseNumericInput(row.invoice_total)
      if (storedTotal > 0) {
        return roundCurrency(storedTotal)
      }
    }
    // Draft exists but values are 0/empty and no invoice_total, return 0
    return 0
  }
  
  // No draft - check if invoice values are explicitly set (not null/undefined)
  // For new invoices, invoice_unit_price and invoice_quantity are null, so don't fall back to CO values
  const hasInvoiceUnitPrice = row.invoice_unit_price !== null && row.invoice_unit_price !== undefined
  const hasInvoiceQuantity = row.invoice_quantity !== null && row.invoice_quantity !== undefined
  
  if (hasInvoiceUnitPrice && hasInvoiceQuantity) {
    const unitStored = parseNumericInput(row.invoice_unit_price)
    const qtyStored = parseNumericInput(row.invoice_quantity)
    if (unitStored > 0 && qtyStored > 0) {
      return roundCurrency(unitStored * qtyStored)
    }
  }
  
  // If invoice_total is explicitly set (not null/undefined), use it
  if (row.invoice_total !== null && row.invoice_total !== undefined) {
    const storedTotal = parseNumericInput(row.invoice_total)
    if (storedTotal > 0) {
      return roundCurrency(storedTotal)
    }
  }
  
  // For new invoices, return 0 instead of falling back to CO values
  return 0
}

const onCoUnitPriceInput = (index: number, value: string | number | null | undefined) => {
  if (props.readonly || showInvoiceValues.value) return
  const d = coDrafts[index] || (coDrafts[index] = { unitPriceInput: '', quantityInput: '' })
  d.unitPriceInput = toInputString(value)
  const unit = parseNumericInput(d.unitPriceInput)
  const qty = parseNumericInput(d.quantityInput)
  const computedTotal = roundCurrency(unit * qty)
  emit('co-unit-price-change', { index, value, numericValue: unit, computedTotal })
}

const onCoQuantityInput = (index: number, value: string | number | null | undefined) => {
  if (props.readonly || showInvoiceValues.value) return
  const d = coDrafts[index] || (coDrafts[index] = { unitPriceInput: '', quantityInput: '' })
  d.quantityInput = toInputString(value)
  const qty = parseNumericInput(d.quantityInput)
  const unit = parseNumericInput(d.unitPriceInput)
  const computedTotal = roundCurrency(unit * qty)
  emit('co-quantity-change', { index, value, numericValue: qty, computedTotal })
}

const onInvoiceUnitPriceInput = (index: number, value: string | number | null | undefined) => {
  if (props.readonly || !showInvoiceValues.value) return
  const row = props.items[index]
  const invoiceUnitInput = (row?.invoice_unit_price !== null && row?.invoice_unit_price !== undefined)
    ? toInputString(row.invoice_unit_price)
    : ''
  const invoiceQuantityInput = (row?.invoice_quantity !== null && row?.invoice_quantity !== undefined)
    ? toInputString(row.invoice_quantity)
    : ''
  const d = invoiceDrafts[index] || (invoiceDrafts[index] = {
    unitPriceInput: invoiceUnitInput,
    quantityInput: invoiceQuantityInput,
  })
  d.unitPriceInput = toInputString(value)
  const unit = parseNumericInput(d.unitPriceInput)
  const qty = parseNumericInput(d.quantityInput)
  const computedTotal = roundCurrency(unit * qty)
  emit('invoice-unit-price-change', { index, value, numericValue: unit, computedTotal })
  emit('invoice-total-change', { index, value: computedTotal })
}

const onInvoiceQuantityInput = (index: number, value: string | number | null | undefined) => {
  if (props.readonly || !showInvoiceValues.value) return
  const row = props.items[index]
  const invoiceUnitInput = (row?.invoice_unit_price !== null && row?.invoice_unit_price !== undefined)
    ? toInputString(row.invoice_unit_price)
    : ''
  const invoiceQuantityInput = (row?.invoice_quantity !== null && row?.invoice_quantity !== undefined)
    ? toInputString(row.invoice_quantity)
    : ''
  const d = invoiceDrafts[index] || (invoiceDrafts[index] = {
    unitPriceInput: invoiceUnitInput,
    quantityInput: invoiceQuantityInput,
  })
  d.quantityInput = toInputString(value)
  const qty = parseNumericInput(d.quantityInput)
  const unit = parseNumericInput(d.unitPriceInput)
  const computedTotal = roundCurrency(unit * qty)
  emit('invoice-quantity-change', { index, value, numericValue: qty, computedTotal })
  emit('invoice-total-change', { index, value: computedTotal })
}

const emitApprovalChecksChange = (index: number, value: string[]) => {
  if (props.readonly) return
  emit('approval-checks-change', { index, value: value || [] })
}

const emitRemoveRow = (index: number) => {
  if (props.readonly) return
  emit('remove-row', index)
}

// Expose drafts and other methods for testing
// Expose coDrafts as 'drafts' for backward compatibility with tests
// Tests access vm.drafts when showInvoiceValues is false (default), which should be coDrafts
defineExpose({
  drafts: coDrafts, // Expose coDrafts as 'drafts' for backward compatibility
  coDrafts,
  invoiceDrafts,
  computeCoTotal,
  computeInvoiceTotal,
  formatCurrencyInput,
  formatQuantity,
  parseNumericInput,
  toInputString,
  roundCurrency,
  onCoUnitPriceInput,
  onCoQuantityInput,
  onInvoiceUnitPriceInput,
  onInvoiceQuantityInput,
  emitApprovalChecksChange,
  emitRemoveRow,
})
</script>

<style scoped>
</style>


