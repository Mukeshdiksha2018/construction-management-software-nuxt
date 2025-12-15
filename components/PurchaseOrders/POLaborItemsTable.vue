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
      <div v-if="hasItems || showEditSelection" class="flex items-center gap-3 ml-auto">
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
        <span v-if="hasItems" class="text-[11px] font-medium text-muted uppercase tracking-wide">
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

    <div v-else-if="hasItems">
      <div class="hidden md:block">
        <table class="min-w-full table-fixed divide-y divide-default/60">
          <thead class="bg-muted/20 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th class="px-4 py-2 text-left">Cost Code</th>
              <th v-if="showLaborBudgeted" class="px-4 py-2 text-right">Labor Budgeted Amount</th>
              <th class="px-4 py-2 text-right">PO Amount</th>
              <th class="w-1/12 px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default/60 text-sm text-default">
            <tr
              v-for="(item, index) in items"
              :key="item.id || `labor-item-${index}`"
              :class="[
                'align-middle transition-colors duration-150',
                activeRowIndex === index ? 'bg-primary-50/40 dark:bg-primary-900/20' : ''
              ]"
            >
              <td class="px-2 py-2 align-middle">
                <div class="flex flex-col gap-2 min-w-0">
                  <CostCodeSelect
                    :model-value="item.cost_code_uuid ?? undefined"
                    :label="item.cost_code_label"
                    size="xs"
                    class="w-full min-w-0 text-left"
                    :corporation-uuid="corporationUuid"
                    :external-configurations="scopedCostCodeConfigurations"
                    :disabled="props.readonly"
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
              </td>
              <td v-if="showLaborBudgeted" class="px-2 py-2 text-right align-middle">
                <div class="w-full max-w-[180px] ml-auto">
                  <div class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-transparent bg-gray-100 dark:bg-gray-800/40 px-3 py-1.5 po-estimate-value">
                    <span class="text-xs font-semibold text-default">{{ currencySymbolText }}</span>
                    <span class="font-mono text-sm leading-none tracking-tight">
                      {{ formatCurrencyInput(item.labor_budgeted_amount || 0) }}
                    </span>
                  </div>
                </div>
              </td>
              <td class="px-2 py-2 text-right align-middle">
                <div class="w-full max-w-[180px] ml-auto">
                  <CurrencyInput
                    :model-value="poDrafts[index]?.poAmountInput ?? toInputString(item.po_amount)"
                    inputmode="decimal"
                    :disabled="props.readonly"
                    size="sm"
                    :corporation-uuid="corporationUuid"
                    @update:model-value="(value) => emitPoAmountChange(index, value)"
                    @focus="() => setActiveRow(index)"
                    @blur="() => clearActiveRow(index)"
                  />
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
          :key="item.id || `labor-item-${index}`"
          :class="[
            'px-4 py-4 space-y-3 transition-colors duration-150',
            activeRowIndex === index ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''
          ]"
        >
          <div class="space-y-2">
            <span class="text-xs uppercase tracking-wide text-muted/80">Cost Code</span>
            <CostCodeSelect
              :model-value="item.cost_code_uuid ?? undefined"
              :label="item.cost_code_label"
              size="xs"
              class="w-full text-left"
              :corporation-uuid="corporationUuid"
              :external-configurations="scopedCostCodeConfigurations"
              :disabled="props.readonly"
              @update:model-value="(value) => emitCostCodeChange(index, value as string | undefined)"
              @change="(option) => emitCostCodeChange(index, option?.uuid, option)"
            />
            <div v-if="item.cost_code_number && item.cost_code_name" class="text-[11px] text-muted uppercase tracking-wide">
              {{ item.cost_code_number }} · {{ item.cost_code_name }}
            </div>
          </div>

          <div v-if="showLaborBudgeted" class="space-y-1">
            <span class="block text-[11px] uppercase tracking-wide text-muted/80">Labor Budgeted Amount</span>
            <div class="grid grid-cols-[auto_auto] items-center justify-end gap-0 rounded-md border border-transparent bg-gray-100 dark:bg-gray-800/40 px-3 py-1.5 po-estimate-value">
              <span class="text-[11px] font-semibold text-default">{{ currencySymbolText }}</span>
              <span class="font-mono text-sm leading-none tracking-tight">
                {{ formatCurrencyInput(item.labor_budgeted_amount || 0) }}
              </span>
            </div>
          </div>

          <div class="space-y-1">
            <span class="block text-[11px] uppercase tracking-wide text-muted/80">PO Amount</span>
            <CurrencyInput
              :model-value="poDrafts[index]?.poAmountInput ?? toInputString(item.po_amount)"
              inputmode="decimal"
              :disabled="props.readonly"
              size="sm"
              :corporation-uuid="corporationUuid"
              @update:model-value="(value) => emitPoAmountChange(index, value)"
              @focus="() => setActiveRow(index)"
              @blur="() => clearActiveRow(index)"
            />
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
import CurrencyInput from '@/components/Shared/CurrencyInput.vue'

interface LaborPOItem {
  id?: string | number
  cost_code_uuid?: string | null
  cost_code_label?: string
  cost_code_number?: string
  cost_code_name?: string
  labor_budgeted_amount?: number | null
  po_amount?: number | null
}

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  items: LaborPOItem[]
  loading?: boolean
  error?: string | null
  loadingMessage?: string
  emptyMessage?: string
  corporationUuid?: string
  scopedCostCodeConfigurations?: any[]
  showLaborBudgeted?: boolean
  readonly?: boolean
  showEditSelection?: boolean
}>(), {
  title: 'Labor PO Items',
  description: '',
  items: () => [],
  loading: false,
  error: null,
  loadingMessage: 'Loading items…',
  emptyMessage: 'No items found.',
  corporationUuid: undefined,
  scopedCostCodeConfigurations: undefined,
  showLaborBudgeted: false,
  readonly: false,
  showEditSelection: false,
})

const hasItems = computed(() => Array.isArray(props.items) && props.items.length > 0)
const corporationUuid = computed(() => props.corporationUuid)
const showLaborBudgeted = computed(() => props.showLaborBudgeted !== false)

// Computed property for scoped cost code configurations
const scopedCostCodeConfigurations = computed(() => {
  console.log('[POLaborItemsTable] scopedCostCodeConfigurations computed:', {
    hasValue: !!props.scopedCostCodeConfigurations,
    count: props.scopedCostCodeConfigurations?.length || 0,
  });
  return props.scopedCostCodeConfigurations || [];
});

const { formatCurrency, currencySymbol } = useCurrencyFormat()
const currencySymbolText = computed(() => unref(currencySymbol) || '')

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
    key: string
    poAmountInput: string
    amountTouched: boolean
  }
>>({})
const activeRowIndex = ref<number | null>(null)

const buildDraftKey = (item: LaborPOItem, index: number) => {
  return [
    item.id ?? "",
    item.cost_code_uuid ?? "",
    index,
  ]
    .map((segment) => String(segment || "").trim().toUpperCase())
    .filter(Boolean)
    .join("|")
}

watch(
  () => props.items,
  (newItems = []) => {
    newItems.forEach((item, index) => {
      const poAmountInput = toInputString(item.po_amount)
      const draftKey = buildDraftKey(item, index)
      const draft = poDrafts[index]

      if (!draft || draft.key !== draftKey) {
        poDrafts[index] = {
          key: draftKey,
          poAmountInput,
          amountTouched: false,
        }
        return
      }

      draft.key = draftKey
      if (!draft.amountTouched && draft.poAmountInput !== poAmountInput) {
        draft.poAmountInput = poAmountInput
      }
    })

    Object.keys(poDrafts).forEach((key) => {
      const idx = Number(key)
      if (!Number.isNaN(idx) && !newItems[idx]) {
        delete poDrafts[idx]
      }
    })
  },
  { immediate: true }
)

const emit = defineEmits<{
  (e: 'add-row', index: number): void
  (e: 'remove-row', index: number): void
  (e: 'cost-code-change', payload: { index: number; value: string | null; option?: any }): void
  (e: 'po-amount-change', payload: { index: number; value: string | number | null | undefined; numericValue: number }): void
  (e: 'edit-selection'): void
}>()

const handleEditSelection = () => {
  emit('edit-selection')
}

const handleAddRow = (index: number) => {
  emit('add-row', index)
}

const handleRemoveRow = (index: number) => {
  emit('remove-row', index)
}

const emitCostCodeChange = (index: number, value?: string, option?: any) => {
  emit('cost-code-change', { index, value: value ?? null, option })
}

const emitPoAmountChange = (index: number, value: string | number | null | undefined) => {
  const item = props.items?.[index]
  const draft =
    poDrafts[index] ||
    (poDrafts[index] = {
      key: buildDraftKey(item as LaborPOItem, index),
      poAmountInput: toInputString(item?.po_amount),
      amountTouched: false,
    })
  draft.poAmountInput = toInputString(value)
  draft.amountTouched = true
  const numericValue = parseNumericInput(draft.poAmountInput)
  emit('po-amount-change', { index, value, numericValue })
}

const setActiveRow = (index: number | null) => {
  activeRowIndex.value = index
}

const clearActiveRow = (index: number) => {
  if (activeRowIndex.value === index) {
    activeRowIndex.value = null
  }
}
</script>

<style scoped>
</style>

