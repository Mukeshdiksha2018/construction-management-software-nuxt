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
              <th class="w-1/4 px-4 py-2 text-left"><USkeleton class="h-3 w-20" /></th>
              <th class="w-1/4 px-4 py-2 text-right"><USkeleton class="h-3 w-20" /></th>
              <th class="w-1/4 px-4 py-2 text-right"><USkeleton class="h-3 w-20" /></th>
              <th class="w-1/4 px-4 py-2 text-right"><USkeleton class="h-3 w-16" /></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default/60">
            <tr v-for="i in 3" :key="i" class="align-middle">
              <td class="px-2 py-2"><USkeleton class="h-4 w-32" /></td>
              <td class="px-2 py-2 text-right"><USkeleton class="h-4 w-20 ml-auto" /></td>
              <td class="px-2 py-2 text-right"><USkeleton class="h-4 w-20 ml-auto" /></td>
              <td class="px-2 py-2 text-right"><USkeleton class="h-4 w-8 ml-auto" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="md:hidden divide-y divide-default/60">
        <div v-for="i in 3" :key="i" class="px-4 py-4 space-y-3">
          <USkeleton class="h-4 w-32" />
          <div class="grid grid-cols-2 gap-3">
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
              <th class="w-1/4 px-4 py-2 text-left">Cost Code</th>
              <th class="w-1/4 px-4 py-2 text-right">PO Amount</th>
              <th class="w-1/4 px-4 py-2 text-right">CO Amount</th>
              <th class="w-1/4 px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default/60 text-sm text-default">
            <tr
              v-for="(row, index) in displayRows"
              :key="row.id || row.cost_code_uuid || index"
              class="align-middle"
            >
              <td class="px-2 py-2">
                <div class="text-xs">
                  <div class="font-medium truncate">{{ row.cost_code_label || `${row.cost_code_number} ${row.cost_code_name}`.trim() }}</div>
                  <div v-if="row.division_name" class="text-[11px] text-muted uppercase tracking-wide mt-0.5">
                    {{ row.division_name }}
                  </div>
                </div>
              </td>
              <td class="px-2 py-2 text-right">
                <div class="flex items-center justify-end gap-0.5">
                  <span class="text-xs font-semibold text-default">{{ currencySymbolText }}</span>
                  <span class="font-mono text-sm">{{ formatCurrencyInput(row.po_amount || 0) }}</span>
                </div>
              </td>
              <td class="px-2 py-2 text-right">
                <div class="flex items-center justify-end rounded-md border border-default bg-background dark:bg-gray-900/60 px-3 py-1.5 text-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40">
                  <div class="flex items-center gap-0 shrink-0">
                    <span class="text-xs font-semibold text-default">{{ currencySymbolText }}</span>
                    <input
                      :value="drafts[index]?.coAmountInput ?? toInputString(row.co_amount)"
                      inputmode="decimal"
                      class="min-w-[3ch] bg-transparent text-right font-mono leading-none outline-none border-none focus:outline-none pl-0"
                      :size="Math.max((drafts[index]?.coAmountInput?.length || toInputString(row.co_amount).length || 3), 3)"
                      :disabled="props.readonly"
                      @input="(event) => onCoAmountInput(index, (event.target as HTMLInputElement).value)"
                    />
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
          :key="row.id || row.cost_code_uuid || index"
          class="px-4 py-4 space-y-3"
        >
          <div class="text-xs">
            <div class="font-semibold text-default">{{ row.cost_code_label || `${row.cost_code_number} ${row.cost_code_name}`.trim() }}</div>
            <div v-if="row.division_name" class="text-[11px] text-muted uppercase tracking-wide mt-1">
              {{ row.division_name }}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs text-default">
            <div>
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">PO Amount</span>
              <div class="flex items-center gap-0.5">
                <span class="text-[11px] font-semibold text-default">{{ currencySymbolText }}</span>
                <span class="font-mono">{{ formatCurrencyInput(row.po_amount || 0) }}</span>
              </div>
            </div>
            <div>
              <span class="block text-[11px] uppercase tracking-wide text-muted/80">CO Amount</span>
              <div class="flex items-center justify-end rounded-md border border-default bg-background dark:bg-gray-900/60 px-3 py-1.5 text-sm">
                <div class="flex items-center gap-0 shrink-0">
                  <span class="text-[11px] font-semibold text-default">{{ currencySymbolText }}</span>
                  <input
                    :value="drafts[index]?.coAmountInput ?? toInputString(row.co_amount)"
                    inputmode="decimal"
                    class="min-w-[3ch] bg-transparent text-right font-mono leading-none outline-none border-none focus:outline-none pl-0"
                    :size="Math.max((drafts[index]?.coAmountInput?.length || toInputString(row.co_amount).length || 3), 3)"
                    :disabled="props.readonly"
                    @input="(event) => onCoAmountInput(index, (event.target as HTMLInputElement).value)"
                  />
                </div>
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

interface LaborCOItemDisplay {
  id?: string | number
  cost_code_uuid?: string | null
  cost_code_number?: string | null
  cost_code_name?: string | null
  cost_code_label?: string | null
  division_name?: string | null
  po_amount?: number | null
  co_amount?: number | null
  [key: string]: any
}

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  items: LaborCOItemDisplay[]
  loading?: boolean
  error?: string | null
  loadingMessage?: string
  emptyMessage?: string
  readonly?: boolean
}>(), {
  title: 'Labor Change Order Items',
  description: 'Original purchase order amounts shown for reference. Enter change order amounts.',
  items: () => [],
  loading: false,
  error: null,
  loadingMessage: 'Loading labor items…',
  emptyMessage: 'No labor items found.',
  readonly: false,
})

const emit = defineEmits<{
  (e: 'co-amount-change', payload: { index: number; value: string | number | null | undefined; numericValue: number }): void
  (e: 'remove-row', index: number): void
}>()

const hasItems = computed(() => Array.isArray(props.items) && props.items.length > 0)
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

const drafts = reactive<Record<number, { coAmountInput: string }>>({})

const displayRows = computed(() => {
  return (props.items || []).map((row, index) => {
    // ensure draft cache exists
    const d = drafts[index] || (drafts[index] = {
      coAmountInput: toInputString(row.co_amount),
    })
    // keep drafts in sync if untouched
    if (d.coAmountInput === '' && toInputString(row.co_amount) !== '') {
      d.coAmountInput = toInputString(row.co_amount)
    }
    return row
  })
})

const onCoAmountInput = (index: number, value: string | number | null | undefined) => {
  if (props.readonly) return
  const d = drafts[index] || (drafts[index] = { coAmountInput: '' })
  d.coAmountInput = toInputString(value)
  const numericValue = parseNumericInput(d.coAmountInput)
  emit('co-amount-change', { index, value, numericValue })
}

const emitRemoveRow = (index: number) => {
  if (props.readonly) return
  emit('remove-row', index)
}
</script>

<style scoped>
</style>

