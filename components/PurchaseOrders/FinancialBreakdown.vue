<template>
  <UCard
    variant="soft"
    class="w-full shadow-sm border border-default bg-white dark:bg-gray-900/40"
  >
    <div class="space-y-4">
      <div class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 text-sm font-semibold text-default">
        <div>{{ itemTotalLabel }}</div>
        <div></div>
        <div></div>
        <div class="text-right font-mono">{{ formatCurrency(itemTotal) }}</div>
      </div>

      <div v-if="!hideCharges" class="space-y-2">
        <div
          v-for="row in chargeRows"
          :key="row.key"
          class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 text-sm"
        >
          <div class="text-default">{{ row.label }}</div>
          <div class="flex items-center gap-1">
            <UInput
              :model-value="toInputString(formData[`${row.key}_charges_percentage`])"
              size="sm"
              inputmode="decimal"
              class="w-20 text-right font-mono"
              :disabled="readOnly"
              @update:model-value="(value) => handleChargePercentageChange(row.key, value)"
            />
            <span class="text-xs text-muted">%</span>
          </div>
          <UInput
            :model-value="toInputString(chargeStates.find(s => s.key === row.key)?.amount ?? formData[`${row.key}_charges_amount`])"
            size="sm"
            inputmode="decimal"
            class="w-24 text-right font-mono"
            disabled
            @update:model-value="(value) => handleChargeAmountChange(row.key, value)"
          />
          <UCheckbox
            :model-value="Boolean(formData[`${row.key}_charges_taxable`])"
            label="Taxable"
            :disabled="readOnly"
            @update:model-value="(value) => handleChargeTaxableChange(row.key, value as boolean)"
          />
        </div>
      </div>

      <div v-if="!hideCharges" class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 text-sm font-semibold text-default">
        <div class="uppercase text-xs tracking-wide text-muted">Charges Total</div>
        <div></div>
        <div></div>
        <div class="text-right font-mono">{{ formatCurrency(chargesTotal) }}</div>
      </div>

      <div class="space-y-2">
        <div
          v-for="row in salesTaxRows"
          :key="row.key"
          class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 text-sm"
        >
          <div>
            <div
              class="w-full rounded-md border border-default bg-gray-50 px-3 py-1.5 text-sm font-medium text-default dark:bg-gray-900/40"
            >
              {{ row.label }}
            </div>
          </div>
          <div class="flex items-center gap-1">
            <UInput
              :model-value="toInputString(formData[`${row.key}_percentage`])"
              size="sm"
              inputmode="decimal"
              class="w-20 text-right font-mono"
              :disabled="readOnly"
              @update:model-value="(value) => handleSalesTaxPercentageChange(row.key, value)"
            />
            <span class="text-xs text-muted">%</span>
          </div>
          <UInput
            :model-value="toInputString(salesTaxStates.find(s => s.key === row.key)?.amount ?? formData[`${row.key}_amount`])"
            size="sm"
            inputmode="decimal"
            class="w-24 text-right font-mono"
            disabled
            @update:model-value="(value) => handleSalesTaxAmountChange(row.key, value)"
          />
          <div></div>
        </div>
      </div>

      <div class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 text-sm font-semibold text-default">
        <div class="uppercase text-xs tracking-wide text-muted">Tax Total</div>
        <div></div>
        <div></div>
        <div class="text-right font-mono">{{ formatCurrency(taxTotal) }}</div>
      </div>

      <div v-if="showTotalAmount" class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 text-sm font-semibold text-default">
        <div>{{ totalAmountLabel }}</div>
        <div></div>
        <div></div>
        <div class="text-right font-mono text-primary-600">{{ formatCurrency(finalTotal + (props.advancePaymentDeduction || 0) + (props.holdbackDeduction || 0)) }}</div>
      </div>

      <!-- Advance Payment Deduction -->
      <div v-if="props.advancePaymentDeduction > 0" class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 text-sm text-default border-t border-gray-200 dark:border-gray-700 pt-2">
        <div class="text-gray-600 dark:text-gray-400">
          <span class="font-medium">Less: Advance Payments</span>
          <span class="text-xs text-gray-500 dark:text-gray-500 ml-2">(Already paid)</span>
        </div>
        <div></div>
        <div></div>
        <div class="text-right font-mono text-red-600 dark:text-red-400">-{{ formatCurrency(props.advancePaymentDeduction) }}</div>
      </div>

      <!-- Holdback Deduction -->
      <div v-if="props.holdbackDeduction > 0" class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 text-sm text-default border-t border-gray-200 dark:border-gray-700 pt-2">
        <div class="text-gray-600 dark:text-gray-400">
          <span class="font-medium">Less: Holdback</span>
          <span class="text-xs text-gray-500 dark:text-gray-500 ml-2">(Retained)</span>
        </div>
        <div></div>
        <div></div>
        <div class="text-right font-mono text-red-600 dark:text-red-400">-{{ formatCurrency(props.holdbackDeduction) }}</div>
      </div>

      <div class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 text-sm font-semibold text-default bg-primary-50 dark:bg-primary-900/20 rounded-md p-2 -mx-1">
        <div>{{ totalLabel }}</div>
        <div></div>
        <div></div>
        <div v-if="!allowEditTotal" class="text-right font-mono text-primary-600">{{ formatCurrency(finalTotal) }}</div>
        <div v-else class="flex justify-end">
          <div class="flex flex-col items-end gap-1">
            <div class="relative">
              <span class="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-default pointer-events-none z-10">
                {{ currencySymbolText }}
              </span>
              <UInput
                :model-value="toInputString(displayTotal)"
                size="sm"
                inputmode="decimal"
                :class="[
                  'w-32 text-right font-mono pl-6 dark:bg-gray-900',
                  totalInvoiceAmountError ? 'border-error-500 focus:border-error-500 focus:ring-error-500' : ''
                ]"
                :disabled="readOnly"
                @update:model-value="(value) => handleTotalAmountChange(value)"
              />
            </div>
            <p
              v-if="totalInvoiceAmountError"
              class="text-xs text-error-600 dark:text-error-400"
            >
              {{ totalInvoiceAmountError }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed, watch, ref, onMounted } from 'vue'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'

interface Props {
  itemTotal: number
  formData: Record<string, any>
  readOnly: boolean
  itemTotalLabel?: string
  totalLabel?: string
  totalFieldName?: string // Field name for the final total (e.g., 'total_po_amount' or 'grn_total_with_charges_taxes')
  hideCharges?: boolean // Hide charges section (show only sales tax)
  showTotalAmount?: boolean // Show "Total Amount" label above "Total Invoice Amount"
  totalAmountLabel?: string // Label for the "Total Amount" row
  allowEditTotal?: boolean // Allow editing the total invoice amount field
  totalInvoiceAmountError?: string | null // Error message for total invoice amount field
  advancePaymentDeduction?: number // Amount to deduct for advance payments already made
  holdbackDeduction?: number // Amount to deduct for holdback (retained amount)
}

const props = withDefaults(defineProps<Props>(), {
  itemTotalLabel: 'Item Total',
  totalLabel: 'Total Amount',
  totalFieldName: 'total_po_amount',
  hideCharges: false,
  showTotalAmount: false,
  totalAmountLabel: 'Total Amount',
  allowEditTotal: false,
  totalInvoiceAmountError: null,
  advancePaymentDeduction: 0,
  holdbackDeduction: 0,
})

const emit = defineEmits<{
  (e: 'update', payload: Record<string, any>): void
}>()

const { formatCurrency, currencySymbol } = useCurrencyFormat()
const currencySymbolText = computed(() => currencySymbol.value || '')

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

type ChargeRowKey = (typeof chargeRows)[number]['key']
type SalesTaxRowKey = (typeof salesTaxRows)[number]['key']

interface ChargeComputationState {
  key: ChargeRowKey
  percentage: number
  amount: number
  taxable: boolean
}

interface SalesTaxComputationState {
  key: SalesTaxRowKey
  percentage: number
  amount: number
}

const resolveFieldValue = (key: string): any => {
  return props.formData[key]
}

const buildChargeStates = (): ChargeComputationState[] => {
  const itemTotalValue = roundCurrencyValue(props.itemTotal)

  return chargeRows.map((row) => {
    const percentageKey = `${row.key}_charges_percentage`
    const amountKey = `${row.key}_charges_amount`
    const taxableKey = `${row.key}_charges_taxable`

    const percentage = roundTo(parseNumericInput(resolveFieldValue(percentageKey)), 4)
    const amount = roundCurrencyValue(itemTotalValue * (percentage / 100))
    const taxable = Boolean(resolveFieldValue(taxableKey))

    return {
      key: row.key,
      percentage,
      amount,
      taxable,
    }
  })
}

const buildSalesTaxStates = (taxableBase: number): SalesTaxComputationState[] => {
  return salesTaxRows.map((row) => {
    const percentageKey = `${row.key}_percentage`
    const percentage = roundTo(parseNumericInput(resolveFieldValue(percentageKey)), 4)
    const amount = roundCurrencyValue(taxableBase * (percentage / 100))

    return {
      key: row.key,
      percentage,
      amount,
    }
  })
}

const chargeStates = computed(() => buildChargeStates())
const chargesTotal = computed(() => {
  const states = chargeStates.value
  return roundCurrencyValue(states.reduce((sum, state) => sum + state.amount, 0))
})

const taxableChargesTotal = computed(() => {
  const states = chargeStates.value
  return roundCurrencyValue(states.reduce((sum, state) => (state.taxable ? sum + state.amount : sum), 0))
})

const taxableBase = computed(() => {
  if (props.hideCharges) {
    // When charges are hidden, taxable base is just the item total
    return roundCurrencyValue(props.itemTotal)
  }
  return roundCurrencyValue(props.itemTotal + taxableChargesTotal.value)
})

const salesTaxStates = computed(() => buildSalesTaxStates(taxableBase.value))
const taxTotal = computed(() => {
  const states = salesTaxStates.value
  return roundCurrencyValue(states.reduce((sum, state) => sum + state.amount, 0))
})

const finalTotal = computed(() => {
  let baseTotal: number
  if (props.hideCharges) {
    // When charges are hidden, final total is item total + tax total
    baseTotal = roundCurrencyValue(props.itemTotal + taxTotal.value)
  } else {
    baseTotal = roundCurrencyValue(props.itemTotal + chargesTotal.value + taxTotal.value)
  }
  // Subtract advance payment deduction and holdback deduction if present
  const advanceDeduction = roundCurrencyValue(props.advancePaymentDeduction || 0)
  const holdbackDeduction = roundCurrencyValue(props.holdbackDeduction || 0)
  return roundCurrencyValue(Math.max(0, baseTotal - advanceDeduction - holdbackDeduction))
})

// Helper to parse financial_breakdown if it's a string
const getFinancialBreakdown = (): any => {
  const fb = props.formData.financial_breakdown
  if (!fb) return null
  
  // If it's already an object, return it
  if (typeof fb === 'object' && fb !== null) {
    return fb
  }
  
  // If it's a string, try to parse it
  if (typeof fb === 'string') {
    try {
      return JSON.parse(fb)
    } catch (e) {
      console.warn('[FinancialBreakdown] Failed to parse financial_breakdown string:', e)
      return null
    }
  }
  
  return null
}

// Display total: use manually edited value if allowEditTotal is true and value exists in formData, otherwise use calculated finalTotal
const displayTotal = computed(() => {
  if (props.allowEditTotal) {
    // For editable totals (Against PO), check financial_breakdown.totals.total_invoice_amount first
    // This is the partial payment amount saved in the DB
    const financialBreakdown = getFinancialBreakdown()
    let manualValue = null
    
    if (financialBreakdown?.totals) {
      // Priority order for Against PO invoices:
      // 1. total_invoice_amount (the partial payment amount)
      // 2. amount (fallback)
      // 3. totals[totalFieldName] (fallback)
      manualValue = financialBreakdown.totals.total_invoice_amount ?? 
                   financialBreakdown.totals.amount ?? 
                   financialBreakdown.totals[props.totalFieldName]
    }
    
    // Fallback to direct formData field
    if (manualValue === null || manualValue === undefined || manualValue === '') {
      manualValue = props.formData[props.totalFieldName]
    }
    
    // Return the value if it exists, otherwise return empty (0) to show empty field
    // This allows users to enter partial payment amounts
    if (manualValue !== null && manualValue !== undefined && manualValue !== '') {
      return parseNumericInput(manualValue)
    }
    // Return 0 (empty) instead of calculated total for Against PO invoices
    // This allows users to enter partial payment amounts
    return 0
  }
  // For non-editable totals (Direct Invoice, Advance Payment), use calculated total
  return finalTotal.value
})

const isRecalculating = ref(false)

const recalculateAndEmit = () => {
  if (isRecalculating.value) return
  isRecalculating.value = true

  try {
    const states = chargeStates.value
    const taxStates = salesTaxStates.value

    // If allowEditTotal is true, preserve manually edited total, otherwise use calculated total
    // For Against PO/CO invoices, use total_invoice_amount (partial payment amount) from DB
    let totalValue = finalTotal.value
    if (props.allowEditTotal) {
      const financialBreakdown = getFinancialBreakdown()
      let manualValue = null
      
      if (financialBreakdown?.totals) {
        // For Against PO/CO, prioritize total_invoice_amount (partial payment amount)
        manualValue = financialBreakdown.totals.total_invoice_amount ?? 
                     financialBreakdown.totals.amount ?? 
                     financialBreakdown.totals[props.totalFieldName]
      }
      
      // Fallback to direct formData field
      if (manualValue === null || manualValue === undefined || manualValue === '') {
        manualValue = props.formData[props.totalFieldName]
      }
      
      // If there's a manual value, use it; otherwise use calculated total
      // Special case: If manualValue is 0 but there's an item total, recalculate
      // This handles the case where we clear the amount to force recalculation
      const manualValueNum = parseNumericInput(manualValue)
      if (manualValue !== null && manualValue !== undefined && manualValue !== '' && 
          !(manualValueNum === 0 && props.itemTotal > 0)) {
        // Use manual value
        totalValue = manualValueNum
      } else {
        // No manual value OR manual value is 0 with items - use calculated total
        // This ensures the total invoice amount updates automatically for both PO and CO invoices
        totalValue = finalTotal.value
      }
    }

    const updates: Record<string, any> = {
      item_total: roundCurrencyValue(props.itemTotal),
      charges_total: props.hideCharges ? 0 : chargesTotal.value,
      tax_total: taxTotal.value,
      [props.totalFieldName]: roundCurrencyValue(totalValue),
    }

    // Update charge amounts (calculated from percentages) - only if charges are not hidden
    if (!props.hideCharges) {
    states.forEach((state) => {
      updates[`${state.key}_charges_amount`] = state.amount
    })
    }

    // Update sales tax amounts (calculated from percentages)
    taxStates.forEach((state) => {
      updates[`${state.key}_amount`] = state.amount
    })

    // Include financial_breakdown for saving
    const chargesBreakdown = props.hideCharges 
      ? {
          freight: { percentage: null, amount: null, taxable: false },
          packing: { percentage: null, amount: null, taxable: false },
          custom_duties: { percentage: null, amount: null, taxable: false },
          other: { percentage: null, amount: null, taxable: false },
        }
      : states.reduce(
      (acc, state) => {
        acc[state.key] = {
          percentage: state.percentage,
          amount: state.amount,
          taxable: state.taxable,
        }
        return acc
      },
      {} as Record<string, { percentage: number | null; amount: number | null; taxable: boolean }>
    )

    const salesTaxesBreakdown = taxStates.reduce(
      (acc, state) => {
        acc[state.key] = {
          percentage: state.percentage,
          amount: state.amount,
        }
        return acc
      },
      {} as Record<string, { percentage: number | null; amount: number | null }>
    )

    updates.financial_breakdown = {
      charges: chargesBreakdown,
      sales_taxes: salesTaxesBreakdown,
      totals: {
        item_total: roundCurrencyValue(props.itemTotal),
        charges_total: props.hideCharges ? 0 : chargesTotal.value,
        tax_total: taxTotal.value,
        [props.totalFieldName]: roundCurrencyValue(totalValue),
      },
    }

    emit('update', updates)
  } finally {
    // Use nextTick to ensure the update has been processed before allowing recalculation
    setTimeout(() => {
      isRecalculating.value = false
    }, 0)
  }
}

const handleChargePercentageChange = (key: ChargeRowKey, value: string | number) => {
  if (props.readOnly) return
  
  const percentage = roundTo(parseNumericInput(value), 4)
  const amount = roundCurrencyValue(props.itemTotal * (percentage / 100))
  
  const updates: Record<string, any> = {
    [`${key}_charges_percentage`]: percentage,
    [`${key}_charges_amount`]: amount,
  }
  
  emit('update', updates)
  // Recalculate after a short delay to ensure form data is updated
  setTimeout(() => recalculateAndEmit(), 0)
}

const handleChargeAmountChange = (key: ChargeRowKey, value: string | number) => {
  if (props.readOnly) return
  
  const amount = roundCurrencyValue(parseNumericInput(value))
  const percentage = props.itemTotal > 0 ? roundTo((amount / props.itemTotal) * 100, 4) : 0
  
  const updates: Record<string, any> = {
    [`${key}_charges_amount`]: amount,
    [`${key}_charges_percentage`]: percentage,
  }
  
  emit('update', updates)
  setTimeout(() => recalculateAndEmit(), 0)
}

const handleChargeTaxableChange = (key: ChargeRowKey, value: boolean) => {
  if (props.readOnly) return
  
  const updates: Record<string, any> = {
    [`${key}_charges_taxable`]: value,
  }
  
  emit('update', updates)
  setTimeout(() => recalculateAndEmit(), 0)
}

const handleSalesTaxPercentageChange = (key: SalesTaxRowKey, value: string | number) => {
  if (props.readOnly) return
  
  const percentage = roundTo(parseNumericInput(value), 4)
  
  const updates: Record<string, any> = {
    [`${key}_percentage`]: percentage,
  }
  
  emit('update', updates)
  setTimeout(() => recalculateAndEmit(), 0)
}

const handleSalesTaxAmountChange = (key: SalesTaxRowKey, value: string | number) => {
  if (props.readOnly) return
  
  const amount = roundCurrencyValue(parseNumericInput(value))
  const percentage = taxableBase.value > 0 ? roundTo((amount / taxableBase.value) * 100, 4) : 0
  
  const updates: Record<string, any> = {
    [`${key}_amount`]: amount,
    [`${key}_percentage`]: percentage,
  }
  
  emit('update', updates)
  setTimeout(() => recalculateAndEmit(), 0)
}

const handleTotalAmountChange = (value: string | number) => {
  if (props.readOnly || !props.allowEditTotal) return
  
  const amount = roundCurrencyValue(parseNumericInput(value))
  
  const updates: Record<string, any> = {
    [props.totalFieldName]: amount,
  }
  
  // Also update the amount field if totalFieldName is 'amount'
  if (props.totalFieldName === 'amount') {
    updates.amount = amount
  }
  
  // For Against PO invoices, also update financial_breakdown.totals.total_invoice_amount
  // This is the partial payment amount that should be saved to the DB
  const financialBreakdown = getFinancialBreakdown()
  if (financialBreakdown) {
    if (!updates.financial_breakdown) {
      updates.financial_breakdown = JSON.parse(JSON.stringify(financialBreakdown))
    }
    if (!updates.financial_breakdown.totals) {
      updates.financial_breakdown.totals = {}
    }
    // Save the partial payment amount to total_invoice_amount
    updates.financial_breakdown.totals.total_invoice_amount = amount
    // Also update amount for consistency
    updates.financial_breakdown.totals.amount = amount
  } else {
    // If no financial_breakdown exists, create it
    updates.financial_breakdown = {
      totals: {
        total_invoice_amount: amount,
        amount: amount,
      }
    }
  }
  
  emit('update', updates)
}

// Watch itemTotal to recalculate when it changes
watch(
  () => props.itemTotal,
  (newTotal, oldTotal) => {
    // Only recalculate if the value actually changed
    if (newTotal !== oldTotal) {
      // Recalculate amounts based on percentages when itemTotal changes
      recalculateAndEmit()
    }
  },
  { immediate: true }
)

// Watch formData changes to recalculate (for when percentages change externally)
watch(
  () => [
    ...chargeRows.map((row) => resolveFieldValue(`${row.key}_charges_percentage`)),
    ...chargeRows.map((row) => resolveFieldValue(`${row.key}_charges_taxable`)),
    ...salesTaxRows.map((row) => resolveFieldValue(`${row.key}_percentage`)),
  ],
  () => {
    recalculateAndEmit()
  },
  { deep: false }
)

onMounted(() => {
  recalculateAndEmit()
})
</script>

