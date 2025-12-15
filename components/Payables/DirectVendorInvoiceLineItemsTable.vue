<template>
  <div class="rounded-xl border border-default bg-white dark:bg-gray-900/40 shadow-sm overflow-hidden">
    <div class="flex items-center justify-between gap-4 px-4 py-3 border-b border-default/70 bg-gray-50 dark:bg-gray-800">
      <div>
        <h3 class="text-sm font-semibold text-default uppercase tracking-wide">
          Line Items
        </h3>
        <p v-if="items.length > 0" class="text-xs text-muted mt-1">
          {{ items.length }} {{ items.length === 1 ? 'item' : 'items' }}
        </p>
      </div>
    </div>

    <div v-if="items.length === 0" class="px-4 py-8 text-center">
      <p class="text-sm text-muted mb-4">No line items added yet</p>
      <UButton
        v-if="!readonly"
        icon="i-heroicons-plus"
        size="sm"
        color="primary"
        variant="outline"
        @click="handleAddRow(-1)"
      >
        Add First Item
      </UButton>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-default/60">
        <thead class="bg-muted/20 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <tr>
            <th class="px-3 py-2 text-left">Cost Code</th>
            <th class="px-3 py-2 text-left">Sequence</th>
            <th class="px-3 py-2 text-left">Item Name</th>
            <th class="px-3 py-2 text-left">Description</th>
            <th class="px-3 py-2 text-right">Unit Price</th>
            <th class="px-3 py-2 text-left">UOM</th>
            <th class="px-3 py-2 text-right">Quantity</th>
            <th class="px-3 py-2 text-right">Total</th>
            <th class="px-3 py-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default/60 text-sm text-default bg-white dark:bg-gray-900/40">
          <tr
            v-for="(item, index) in items"
            :key="item.id || index"
            class="align-middle transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <!-- Cost Code -->
            <td class="px-2 py-2 align-middle">
              <CostCodeSelect
                :model-value="item.cost_code_uuid || undefined"
                :corporation-uuid="corporationUuid"
                size="xs"
                class="w-full"
                :disabled="readonly"
                placeholder="Select Cost code"
                @update:model-value="(value) => handleCostCodeChange(index, value)"
                @change="(option) => handleCostCodeChange(index, option?.costCode?.uuid || option?.value, option)"
              />
            </td>

            <!-- Sequence -->
            <td class="px-2 py-2 align-middle">
              <SequenceSelect
                :model-value="item.item_uuid || undefined"
                :corporation-uuid="corporationUuid"
                size="xs"
                class="w-full"
                :disabled="readonly"
                placeholder="Select"
                @change="(payload) => handleItemUuidChange(index, payload?.value, payload?.option)"
              />
            </td>

            <!-- Item Name -->
            <td class="px-2 py-2 align-middle">
              <ItemSelect
                :model-value="item.item_uuid || undefined"
                :corporation-uuid="corporationUuid"
                size="xs"
                class="w-full"
                :disabled="readonly"
                placeholder="Select item"
                @change="(payload) => handleItemUuidChange(index, payload?.value, payload?.option)"
              />
            </td>

            <!-- Description -->
            <td class="px-2 py-2 align-middle">
              <UInput
                :model-value="item.description || ''"
                size="xs"
                class="w-full"
                :disabled="readonly"
                placeholder="Description"
                @update:model-value="(value) => handleDescriptionChange(index, value)"
              />
            </td>

            <!-- Unit Price -->
            <td class="px-2 py-2 text-right align-middle">
              <div class="flex items-center justify-end gap-1">
                <span class="text-xs font-semibold text-default">$</span>
                <UInput
                  :model-value="itemDrafts[index]?.unitPriceInput ?? toInputString(item.unit_price)"
                  type="number"
                  step="0.01"
                  size="xs"
                  class="w-full max-w-[100px] text-right font-mono"
                  :disabled="readonly"
                  placeholder="0.00"
                  @update:model-value="(value) => handleUnitPriceChange(index, value)"
                />
              </div>
            </td>

            <!-- UOM -->
            <td class="px-2 py-2 align-middle">
              <UInput
                :model-value="item.uom || item.unit_label || '-'"
                size="xs"
                class="w-full"
                :disabled="readonly"
                placeholder="-"
                readonly
              />
            </td>

            <!-- Quantity -->
            <td class="px-2 py-2 text-right align-middle">
              <UInput
                :model-value="itemDrafts[index]?.quantityInput ?? toInputString(item.quantity)"
                type="number"
                step="0.01"
                size="xs"
                class="w-full max-w-[80px] text-right font-mono"
                :disabled="readonly"
                placeholder="0"
                @update:model-value="(value) => handleQuantityChange(index, value)"
              />
            </td>

            <!-- Total -->
            <td class="px-2 py-2 text-right align-middle">
              <div class="flex items-center justify-end gap-1">
                <span class="text-xs font-semibold text-default">$</span>
                <span class="font-mono text-sm font-semibold">
                  {{ formatCurrencyInput(getRowTotal(item, index)) }}
                </span>
              </div>
            </td>

            <!-- Actions -->
            <td class="px-2 py-2 text-center align-middle">
              <div v-if="!readonly" class="flex justify-center gap-1">
                <UButton
                  icon="i-heroicons-plus"
                  variant="soft"
                  color="primary"
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
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, reactive, ref } from 'vue'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import CostCodeSelect from '@/components/Shared/CostCodeSelect.vue'
import SequenceSelect from '@/components/Shared/SequenceSelect.vue'
import ItemSelect from '@/components/Shared/ItemSelect.vue'

interface VendorInvoiceLineItem {
  id?: string | number
  cost_code_uuid?: string | null
  sequence_uuid?: string | null
  item_uuid?: string | null
  description?: string
  unit_price?: number | null
  uom?: string
  unit_label?: string
  quantity?: number | null
  total?: number | null
}

const props = withDefaults(defineProps<{
  items: VendorInvoiceLineItem[]
  corporationUuid?: string
  readonly?: boolean
}>(), {
  items: () => [],
  readonly: false
})

const emit = defineEmits<{
  'add-row': [index: number]
  'remove-row': [index: number]
  'cost-code-change': [payload: { index: number; value: string | null; option?: any }]
  'sequence-change': [payload: { index: number; value: string | null; option?: any }]
  'item-change': [payload: { index: number; value: string | null; option?: any }]
  'description-change': [payload: { index: number; value: string }]
  'unit-price-change': [payload: { index: number; value: number | null; numericValue: number; computedTotal: number }]
  'quantity-change': [payload: { index: number; value: number | null; numericValue: number; computedTotal: number }]
}>()

const { formatCurrency } = useCurrencyFormat()

const formatCurrencyInput = (value: any): string => {
  if (value === null || value === undefined || value === '') return '0.00'
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (isNaN(num)) return '0.00'
  return num.toFixed(2)
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

const roundCurrency = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

const toInputString = (value: any): string => {
  if (value === null || value === undefined) return ''
  return typeof value === 'number' ? String(value) : String(value)
}

// Reactive draft system to track input values while typing
const itemDrafts = reactive<Record<
  number,
  {
    key: string
    unitPriceInput: string
    quantityInput: string
    unitTouched: boolean
    quantityTouched: boolean
  }
>>({})

const buildDraftKey = (item: VendorInvoiceLineItem, index: number) => {
  return [
    item.id ?? '',
    item.cost_code_uuid ?? '',
    item.item_uuid ?? '',
    index,
  ]
    .map((segment) => String(segment || '').trim().toUpperCase())
    .filter(Boolean)
    .join('|')
}

// Watch items to sync drafts
watch(
  () => props.items,
  (newItems = []) => {
    newItems.forEach((item, index) => {
      const unitInput = toInputString(item.unit_price)
      const quantityInput = toInputString(item.quantity)
      const draftKey = buildDraftKey(item, index)
      const draft = itemDrafts[index]

      if (!draft || draft.key !== draftKey) {
        itemDrafts[index] = {
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

    // Clean up drafts for removed items
    Object.keys(itemDrafts).forEach((key) => {
      const idx = Number(key)
      if (!Number.isNaN(idx) && !newItems[idx]) {
        delete itemDrafts[idx]
      }
    })
  },
  { immediate: true }
)

// Compute total from draft values or item values
const getRowTotal = (item: VendorInvoiceLineItem, index: number): number => {
  const draft = itemDrafts[index]

  if (draft) {
    const unitFromDraft = parseNumericInput(draft.unitPriceInput)
    const quantityFromDraft = parseNumericInput(draft.quantityInput)
    const unitFromItem = parseNumericInput(item.unit_price)
    const quantityFromItem = parseNumericInput(item.quantity)
    const draftDiffers =
      draft.unitTouched ||
      draft.quantityTouched ||
      draft.unitPriceInput !== toInputString(item.unit_price) ||
      draft.quantityInput !== toInputString(item.quantity)

    if (draftDiffers) {
      return roundCurrency(unitFromDraft * quantityFromDraft)
    }

    if (unitFromItem || quantityFromItem) {
      return roundCurrency(unitFromItem * quantityFromItem)
    }
  }

  const storedUnit = parseNumericInput(item.unit_price)
  const storedQuantity = parseNumericInput(item.quantity)
  if (storedUnit || storedQuantity) {
    return roundCurrency(storedUnit * storedQuantity)
  }

  const storedTotal = parseNumericInput(item.total)
  if (storedTotal) {
    return roundCurrency(storedTotal)
  }

  return 0
}

const handleAddRow = (index: number) => {
  emit('add-row', index)
}

const handleRemoveRow = (index: number) => {
  emit('remove-row', index)
}

const handleCostCodeChange = (index: number, value: string | null | undefined, option?: any) => {
  emit('cost-code-change', { index, value: value || null, option })
}

const handleItemUuidChange = (index: number, value: string | null | undefined, option?: any) => {
  // Extract item details from the option
  const rawItem = option?.raw || option?.option?.raw || option
  
  // Emit both sequence-change and item-change events to keep parent in sync
  // Both events use the same item_uuid value
  emit('sequence-change', { index, value: value || null, option })
  emit('item-change', { index, value: value || null, option })
}

const handleSequenceChange = (index: number, value: string | null | undefined, option?: any) => {
  // This is now handled by handleItemUuidChange, but keep for backward compatibility
  handleItemUuidChange(index, value, option)
}

const handleItemChange = (index: number, value: string | null | undefined, option?: any) => {
  // This is now handled by handleItemUuidChange, but keep for backward compatibility
  handleItemUuidChange(index, value, option)
}

const handleDescriptionChange = (index: number, value: string) => {
  emit('description-change', { index, value: value || '' })
}

const handleUnitPriceChange = (index: number, value: string | null) => {
  const item = props.items?.[index]
  const draft =
    itemDrafts[index] ||
    (itemDrafts[index] = {
      key: buildDraftKey(item as VendorInvoiceLineItem, index),
      unitPriceInput: toInputString(item?.unit_price),
      quantityInput: toInputString(item?.quantity),
      unitTouched: false,
      quantityTouched: false,
    })
  draft.unitPriceInput = toInputString(value)
  draft.unitTouched = true
  const numericValue = parseNumericInput(draft.unitPriceInput)
  const quantityNumeric = parseNumericInput(draft.quantityInput ?? '')
  const computedTotal = roundCurrency(numericValue * quantityNumeric)
  emit('unit-price-change', { 
    index, 
    value: numericValue || null, 
    numericValue, 
    computedTotal 
  })
}

const handleQuantityChange = (index: number, value: string | null) => {
  const item = props.items?.[index]
  const draft =
    itemDrafts[index] ||
    (itemDrafts[index] = {
      key: buildDraftKey(item as VendorInvoiceLineItem, index),
      unitPriceInput: toInputString(item?.unit_price),
      quantityInput: toInputString(item?.quantity),
      unitTouched: false,
      quantityTouched: false,
    })
  draft.quantityInput = toInputString(value)
  draft.quantityTouched = true
  const numericValue = parseNumericInput(draft.quantityInput)
  const unitNumeric = parseNumericInput(draft.unitPriceInput ?? '')
  const computedTotal = roundCurrency(unitNumeric * numericValue)
  emit('quantity-change', { 
    index, 
    value: numericValue || null, 
    numericValue, 
    computedTotal 
  })
}
</script>

