<template>
  <div class="rounded-xl border border-default bg-white dark:bg-gray-900/40 shadow-sm overflow-hidden">
    <div class="flex items-center justify-between gap-4 px-4 py-3 border-b border-default/70 bg-gray-50 dark:bg-gray-800">
      <div>
        <h3 class="text-sm font-semibold text-default uppercase tracking-wide">
          GRN Items
        </h3>
        <p v-if="hasItems" class="text-[11px] text-muted mt-1">
          Update the received quantity or cost code for each purchase order line.
        </p>
      </div>
      <div v-if="hasItems" class="flex items-center gap-3">
        <slot name="header-actions" />
        <div class="text-[11px] font-medium text-muted uppercase tracking-wide">
          {{ items.length }} items
        </div>
      </div>
    </div>

    <div v-if="error" class="px-4 py-3 text-xs text-error-700 bg-error-50/80 dark:bg-error-900/20 border-b border-error-200">
      {{ error }}
    </div>

    <div v-else-if="loading" class="px-4 py-6 text-sm text-muted text-center">
      {{ loadingMessage }}
    </div>

    <div v-else-if="hasItems">
      <div class="hidden md:block">
        <table class="min-w-full table-fixed divide-y divide-default/60">
          <thead class="bg-muted/20 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th class="w-[160px] px-4 py-2 text-left">Cost Codes</th>
              <th class="w-[120px] px-4 py-2 text-left">Type</th>
              <th class="w-[120px] px-4 py-2 text-left">Sequence</th>
              <th class="w-[170px] px-4 py-2 text-left">Item</th>
              <th class="w-[150px] px-4 py-2 text-left">Received At</th>
              <th class="w-[220px] px-4 py-2 text-left">Description</th>
              <th class="w-[140px] px-4 py-2 text-left">Model Number</th>
              <th class="w-[110px] px-4 py-2 text-right">Unit Price</th>
              <th class="w-[90px] px-4 py-2 text-right">UOM</th>
              <th class="w-[90px] px-4 py-2 text-right">{{ quantityColumnLabel }}</th>
              <th class="w-[120px] px-4 py-2 text-right">Received Qty</th>
              <th class="w-[120px] px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default/60 text-sm text-default">
            <tr
              v-for="(item, index) in items"
              :key="item.id ?? index"
              :class="[
                'align-middle transition-colors duration-150',
                activeRowIndex === index ? 'bg-primary-50/40 dark:bg-primary-900/20' : '',
                isOverReceived(item) ? 'bg-error-50/50 dark:bg-error-900/20 border-l-4 border-error-500' : ''
              ]"
            >
              <td class="px-3 py-2 align-middle">
                <div class="text-xs font-medium text-default">
                  <div v-if="item.cost_code_label" class="font-semibold">
                    {{ item.cost_code_label }}
                  </div>
                  <div v-else-if="item.cost_code_number || item.cost_code_name" class="font-semibold">
                    {{ [item.cost_code_number, item.cost_code_name].filter(Boolean).join(' ') }}
                  </div>
                  <div v-else class="text-muted">—</div>
                </div>
              </td>
              <td class="px-3 py-2 align-middle">
                <div class="text-xs font-medium text-default leading-tight">
                  <span v-if="item.item_type_label || item.item_type_code">
                    {{ item.item_type_label || '—' }}<span v-if="item.item_type_code" class="text-muted"> ({{ item.item_type_code }})</span>
                  </span>
                  <span v-else>—</span>
                </div>
              </td>
              <td class="px-3 py-2 align-middle text-xs text-default">
                {{ item.sequence_label || '—' }}
              </td>
              <td class="px-3 py-2 align-middle">
                <div class="text-xs font-medium text-default truncate">
                  {{ item.item_name || '—' }}
                </div>
              </td>
              <td class="px-3 py-2 text-left align-middle">
                <div class="text-xs text-default">
                  {{ item.location_label || '—' }}
                </div>
              </td>
              <td class="px-3 py-2 align-middle">
                <div class="text-xs text-muted whitespace-pre-line min-h-[36px]">
                  {{ item.description || '—' }}
                </div>
              </td>
              <td class="px-3 py-2 align-middle text-xs text-default">
                {{ item.model_number || '—' }}
              </td>
              <td class="px-3 py-2 text-right align-middle">
                <div class="inline-flex items-center justify-end gap-1 rounded-md border border-default bg-background px-3 py-1.5 font-mono text-sm">
                  <span class="text-xs font-semibold text-default">{{ currencySymbolText }}</span>
                  <span>{{ formatCurrencyInput(item.unit_price) }}</span>
                </div>
              </td>
              <td class="px-3 py-2 text-right align-middle font-mono text-xs uppercase text-default">
                {{ item.unit_label || '—' }}
              </td>
              <td class="px-3 py-2 text-right align-middle font-mono text-sm text-default">
                {{ formatQuantity(item.ordered_quantity ?? item.po_quantity ?? 0) }}
              </td>
              <td class="px-3 py-2 text-right align-middle">
                <UInput
                  :model-value="getReceivedInputValue(item, index)"
                  size="xs"
                  inputmode="decimal"
                  class="w-full max-w-[130px] text-right font-mono"
                  :disabled="props.readonly"
                  @focus="setActiveRow(index)"
                  @blur="clearActiveRow(index)"
                  @update:model-value="(value) => emitReceivedQuantityChange(index, value)"
                />
              </td>
              <td class="px-3 py-2 text-right align-middle">
                <div class="inline-flex items-center justify-end gap-1 rounded-md border border-default bg-background px-3 py-1.5 font-mono text-sm">
                  <span class="text-xs font-semibold text-default">{{ currencySymbolText }}</span>
                  <span>{{ formatCurrencyInput(computeRowTotal(item, index)) }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="md:hidden divide-y divide-default/60">
        <div
          v-for="(item, index) in items"
          :key="item.id ?? index"
          :class="[
            'px-4 py-4 space-y-3 transition-colors duration-150',
            activeRowIndex === index ? 'bg-primary-50/30 dark:bg-primary-900/10' : '',
            isOverReceived(item) ? 'bg-error-50/50 dark:bg-error-900/20 border-l-4 border-error-500' : ''
          ]"
        >
          <div class="space-y-2">
            <span class="text-[11px] uppercase tracking-wide text-muted/80">Cost Code</span>
            <div class="text-xs font-medium text-default">
              <div v-if="item.cost_code_label" class="font-semibold">
                {{ item.cost_code_label }}
              </div>
              <div v-else-if="item.cost_code_number || item.cost_code_name" class="font-semibold">
                {{ [item.cost_code_number, item.cost_code_name].filter(Boolean).join(' ') }}
              </div>
              <div v-else class="text-muted">—</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs text-default">
            <div class="flex flex-col gap-1">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Type</span>
              <span class="font-semibold">
                <span v-if="item.item_type_label || item.item_type_code">
                  {{ item.item_type_label || '—' }}<span v-if="item.item_type_code" class="text-muted"> ({{ item.item_type_code }})</span>
                </span>
                <span v-else>—</span>
              </span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Sequence</span>
              <span>{{ item.sequence_label || '—' }}</span>
            </div>
            <div class="col-span-2 flex flex-col gap-1">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Item</span>
              <span class="font-semibold">{{ item.item_name || '—' }}</span>
            </div>
            <div class="col-span-2 flex flex-col gap-1">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Received At</span>
              <span class="text-xs text-default">
                {{ item.location_label || '—' }}
              </span>
            </div>
            <div class="col-span-2 flex flex-col gap-1">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Description</span>
              <span class="text-muted whitespace-pre-line">{{ item.description || '—' }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Model Number</span>
              <span>{{ item.model_number || '—' }}</span>
            </div>
            <div class="flex flex-col gap-1 items-end text-right">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Unit Price</span>
              <span class="font-mono text-sm">
                {{ currencySymbolText }} {{ formatCurrencyInput(item.unit_price) }}
              </span>
            </div>
            <div class="flex flex-col gap-1 items-end text-right">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">UOM</span>
              <span class="font-mono text-xs uppercase">
                {{ item.unit_label || '—' }}
              </span>
            </div>
            <div class="flex flex-col gap-1 items-end text-right">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">{{ quantityColumnLabel }}</span>
              <span class="font-mono text-sm">
                {{ formatQuantity(item.ordered_quantity ?? item.po_quantity ?? 0) }}
              </span>
            </div>
            <div class="flex flex-col gap-1 items-end text-right">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Received Qty</span>
              <UInput
                :model-value="getReceivedInputValue(item, index)"
                size="xs"
                inputmode="decimal"
                class="text-right font-mono"
                :disabled="props.readonly"
                @focus="setActiveRow(index)"
                @blur="clearActiveRow(index)"
                @update:model-value="(value) => emitReceivedQuantityChange(index, value)"
              />
            </div>
            <div class="col-span-2 flex flex-col gap-1 items-end text-right">
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">Total</span>
              <span class="font-mono text-sm">
                {{ currencySymbolText }} {{ formatCurrencyInput(computeRowTotal(item, index)) }}
              </span>
            </div>
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
import { computed, reactive, watch, ref } from 'vue'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'

interface ReceiptNoteItemDisplay {
  id?: string | number
  base_item_uuid?: string | null
  cost_code_uuid?: string | null
  cost_code_label?: string | null
  cost_code_number?: string | null
  cost_code_name?: string | null
  item_type_uuid?: string | null
  item_type_code?: string | null
  item_type_label?: string | null
  sequence_label?: string | null
  item_uuid?: string | null
  item_name?: string | null
  description?: string | null
  model_number?: string | null
  unit_uuid?: string | null
  unit_label?: string | null
  unit_price?: number | null
  ordered_quantity?: number | null
  po_quantity?: number | null
  received_quantity?: number | null
  received_total?: number | null
  grn_total?: number | null
  grn_total_with_charges_taxes?: number | null
  location_uuid?: string | null
  location_label?: string | null
}

const props = withDefaults(defineProps<{
  items: ReceiptNoteItemDisplay[]
  loading?: boolean
  error?: string | null
  loadingMessage?: string
  emptyMessage?: string
  corporationUuid?: string | null
  receiptType?: 'purchase_order' | 'change_order'
  readonly?: boolean
}>(), {
  items: () => [],
  loading: false,
  readonly: false,
  error: null,
  loadingMessage: 'Loading items…',
  emptyMessage: 'No receipt items found.',
  corporationUuid: null,
  receiptType: 'purchase_order',
})

const emit = defineEmits<{
  (e: 'received-quantity-change', payload: {
    index: number
    value: string | number | null | undefined
    numericValue: number
    computedTotal: number
  }): void
}>()

const { formatCurrency, currencySymbol } = useCurrencyFormat()

const currencySymbolText = computed(() => currencySymbol.value || '')
const hasItems = computed(() => Array.isArray(props.items) && props.items.length > 0)
const corporationUuid = computed(() => props.corporationUuid)
const quantityColumnLabel = computed(() => {
  return props.receiptType === 'change_order' ? 'CO Qty' : 'PO Qty'
})

const drafts = reactive<Record<number, { key: string; receivedInput: string; touched: boolean }>>({})
const activeRowIndex = ref<number | null>(null)


const toInputString = (value: any): string => {
  if (value === null || value === undefined) return ''
  return typeof value === 'number' ? String(value) : String(value)
}

const getReceivedInputValue = (item: ReceiptNoteItemDisplay, index: number): string => {
  const draft = drafts[index]
  const itemValue = toInputString(item.received_quantity)
  const draftValue = draft?.receivedInput
  const isTouched = draft?.touched ?? false
  
  const result = (isTouched ? draftValue : null) ?? itemValue
  
  return result
}

const parseNumericInput = (value: any): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const normalized = String(value).replace(/,/g, '').trim()
  if (!normalized) return 0
  const numeric = Number(normalized)
  return Number.isFinite(numeric) ? numeric : 0
}

const quantityFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
})

const formatQuantity = (value: any) => {
  const numeric = parseNumericInput(value)
  return quantityFormatter.format(numeric)
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

const buildDraftKey = (item: ReceiptNoteItemDisplay, index: number) => {
  const segments = [
    item.id ?? '',
    item.base_item_uuid ?? '',
    item.cost_code_uuid ?? '',
    item.item_uuid ?? '',
    index,
  ]
  return segments
    .map((segment) => String(segment || '').trim().toUpperCase())
    .filter(Boolean)
    .join('|')
}

watch(
  () => props.items,
  (newItems = []) => {
    newItems.forEach((item, index) => {
      const draftKey = buildDraftKey(item, index)
      const draft = drafts[index]
      const receivedInput = toInputString(item.received_quantity)

      if (!draft || draft.key !== draftKey) {
        drafts[index] = {
          key: draftKey,
          receivedInput,
          touched: false,
        }
        return
      }

      draft.key = draftKey
      // Always sync from item if draft hasn't been touched by user
      // This ensures that when data loads/updates, the draft reflects the actual item value
      if (!draft.touched) {
        draft.receivedInput = receivedInput
      }
    })

    Object.keys(drafts).forEach((key) => {
      const idx = Number(key)
      if (!Number.isNaN(idx) && !newItems[idx]) {
        delete drafts[idx]
      }
    })
  },
  { immediate: true, deep: true }
)

const computeRowTotal = (item: ReceiptNoteItemDisplay, index: number) => {
  const draft = drafts[index]
  const unit = parseNumericInput(item.unit_price)

  // If there's a draft (user is editing), calculate from draft input
  if (draft && draft.touched) {
    const quantityFromDraft = parseNumericInput(draft.receivedInput)
    return roundCurrency(unit * quantityFromDraft)
  }

  // Priority: Use grn_total_with_charges_taxes if available (this includes charges/taxes proportionally allocated)
  // This is the actual GRN total per item, not just received_total
  if (typeof (item as any).grn_total_with_charges_taxes === 'number' && Number.isFinite((item as any).grn_total_with_charges_taxes)) {
    return roundCurrency((item as any).grn_total_with_charges_taxes)
  }

  // Fallback: Use received_total if GRN total is not yet calculated
  if (typeof item.received_total === 'number' && Number.isFinite(item.received_total)) {
    return roundCurrency(item.received_total)
  }

  // Final fallback: Calculate from unit price * quantity
  const quantity = parseNumericInput(item.received_quantity)
  return roundCurrency(unit * quantity)
}

const roundCurrency = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100


const emitReceivedQuantityChange = (index: number, value: string | number | null | undefined) => {
  const item = props.items?.[index]
  const draft =
    drafts[index] ||
    (drafts[index] = {
      key: buildDraftKey(item as ReceiptNoteItemDisplay, index),
      receivedInput: toInputString(item?.received_quantity),
      touched: false,
    })

  draft.receivedInput = toInputString(value)
  draft.touched = true

  const numericValue = parseNumericInput(draft.receivedInput)
  const unitNumeric = parseNumericInput(item?.unit_price)
  const computedTotal = roundCurrency(unitNumeric * numericValue)

  emit('received-quantity-change', {
    index,
    value,
    numericValue,
    computedTotal,
  })
}

const setActiveRow = (index: number | null) => {
  activeRowIndex.value = index
}

const clearActiveRow = (index: number) => {
  if (activeRowIndex.value === index) {
    activeRowIndex.value = null
  }
}

// Check if an item has received quantity greater than ordered quantity
const isOverReceived = (item: ReceiptNoteItemDisplay): boolean => {
  const orderedQty = parseNumericInput(item.ordered_quantity ?? item.po_quantity ?? 0)
  const receivedQty = parseNumericInput(item.received_quantity ?? 0)
  return receivedQty > orderedQty && orderedQty > 0
}
</script>


