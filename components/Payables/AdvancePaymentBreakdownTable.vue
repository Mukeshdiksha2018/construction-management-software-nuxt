<template>
  <div class="mt-6">
    <div class="mb-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Advance Payment Breakdown</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{ purchaseOrderUuid ? 'Advance payments made for this purchase order' : changeOrderUuid ? 'Advance payments made for this change order' : 'Select a purchase order or change order to view advance payments' }}
      </p>
      <p v-if="showAdjustmentInputs" class="text-sm text-primary-600 dark:text-primary-400 mt-1">
        Enter the amount to adjust from each cost code below
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <p class="mt-2 text-sm text-gray-500">Loading advance payments...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-md bg-error-50 dark:bg-error-900/20 p-4">
      <p class="text-sm text-error-600 dark:text-error-400">{{ error }}</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="(!purchaseOrderUuid && !changeOrderUuid) || advancePayments.length === 0" class="rounded-md bg-gray-50 dark:bg-gray-800/50 p-8 text-center">
      <UIcon name="i-heroicons-document-text" class="w-12 h-12 mx-auto text-gray-400 mb-4" />
      <p class="text-gray-500 text-sm">
        {{ (!purchaseOrderUuid && !changeOrderUuid) ? 'No purchase order or change order selected' : purchaseOrderUuid ? 'No advance payments found for this purchase order' : 'No advance payments found for this change order' }}
      </p>
    </div>

    <!-- Advance Payments Table -->
    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
              Invoice Number
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
              Invoice Date
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
              Status
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
              Cost Code Breakdown
            </th>
            <th v-if="hasPreviouslyAdjustedCostCodes" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400 border-b border-gray-200 dark:border-gray-700">
              Previously Adjusted
            </th>
            <th v-if="hasPreviouslyAdjustedCostCodes && showAdjustmentInputs" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400 border-b border-gray-200 dark:border-gray-700">
              Remaining to be Adjusted
            </th>
            <th v-if="showAdjustmentInputs" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
              Adjust Amount
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
              Total Amount
            </th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          <tr
            v-for="(payment, index) in advancePayments"
            :key="payment.uuid || index"
            :class="[
              'hover:bg-gray-50 dark:hover:bg-gray-800/50',
              hasOverAdjustedAmount(payment) ? 'bg-error-50/50 dark:bg-error-900/20 border-l-4 border-error-500' : ''
            ]"
          >
            <!-- Invoice Number -->
            <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
              {{ payment.number || 'N/A' }}
            </td>

            <!-- Invoice Date -->
            <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
              {{ formatDate(payment.bill_date) }}
            </td>

            <!-- Status -->
            <td class="px-4 py-3">
              <UBadge
                :color="getStatusColor(payment.is_active)"
                variant="soft"
                size="sm"
              >
                {{ payment.is_active ? 'Active' : 'Inactive' }}
              </UBadge>
            </td>

            <!-- Cost Code Breakdown -->
            <td class="px-4 py-3">
              <div v-if="payment.costCodes && payment.costCodes.length > 0" class="space-y-1">
                <div
                  v-for="(costCode, ccIndex) in payment.costCodes"
                  :key="costCode.uuid || ccIndex"
                  class="text-xs text-gray-600 dark:text-gray-400"
                >
                  <span class="font-medium">
                    {{ costCode.cost_code_label || 
                       (costCode.cost_code_number && costCode.cost_code_name 
                         ? `${costCode.cost_code_number} ${costCode.cost_code_name}`.trim()
                         : 'N/A') }}
                  </span>
                  <span class="text-gray-500 dark:text-gray-500 ml-2">
                    - {{ formatCurrency(costCode.advance_amount || costCode.advanceAmount || 0) }}
                  </span>
                </div>
              </div>
              <span v-else class="text-xs text-gray-400">No cost codes</span>
            </td>

            <!-- Previously Adjusted Column (only shown when hasPreviouslyAdjustedCostCodes is true) -->
            <td v-if="hasPreviouslyAdjustedCostCodes" class="px-4 py-3">
              <div v-if="payment.costCodes && payment.costCodes.length > 0" class="space-y-1">
                <div
                  v-for="(costCode, ccIndex) in payment.costCodes"
                  :key="'prev-' + (costCode.uuid || ccIndex)"
                  class="text-xs"
                >
                  <span 
                    v-if="getPreviouslyAdjustedAmount(payment.uuid, costCode.uuid || costCode.cost_code_uuid) > 0"
                    class="font-medium text-green-600 dark:text-green-400"
                  >
                    {{ formatCurrency(getPreviouslyAdjustedAmount(payment.uuid, costCode.uuid || costCode.cost_code_uuid)) }}
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </div>
              </div>
              <div v-else class="text-right">
                <span 
                  v-if="getTotalPreviouslyAdjustedForPayment(payment.uuid) > 0"
                  class="text-xs font-medium text-green-600 dark:text-green-400"
                >
                  {{ formatCurrency(getTotalPreviouslyAdjustedForPayment(payment.uuid)) }}
                </span>
                <span v-else class="text-xs text-gray-400">-</span>
              </div>
            </td>

            <!-- Remaining to be Adjusted Column (only shown when hasPreviouslyAdjustedCostCodes and showAdjustmentInputs) -->
            <td v-if="hasPreviouslyAdjustedCostCodes && showAdjustmentInputs" class="px-4 py-3">
              <div v-if="payment.costCodes && payment.costCodes.length > 0" class="space-y-1">
                <div
                  v-for="(costCode, ccIndex) in payment.costCodes"
                  :key="'remaining-' + (costCode.uuid || ccIndex)"
                  class="text-xs"
                >
                  <span class="font-medium text-blue-600 dark:text-blue-400">
                    {{ formatCurrency(getRemainingAmount(payment.uuid, costCode)) }}
                  </span>
                </div>
              </div>
              <span v-else class="text-xs text-gray-400">-</span>
            </td>

            <!-- Adjust Amount Column (only shown when showAdjustmentInputs is true) -->
            <td v-if="showAdjustmentInputs" class="px-4 py-3">
              <div v-if="payment.costCodes && payment.costCodes.length > 0" class="space-y-2">
                <div
                  v-for="(costCode, ccIndex) in payment.costCodes"
                  :key="costCode.uuid || ccIndex"
                  class="flex items-center gap-2"
                >
                  <UInput
                    :model-value="getAdjustedAmount(payment.uuid, costCode.cost_code_uuid || costCode.uuid)"
                    type="number"
                    step="1"
                    min="0"
                    pattern="[0-9.]*"
                    inputmode="decimal"
                    :max="getRemainingAmount(payment.uuid, costCode) + (parseFloat(getAdjustedAmount(payment.uuid, costCode.cost_code_uuid || costCode.uuid)) || 0)"
                    placeholder="0.00"
                    size="xs"
                    class="w-24"
                    :disabled="readonly"
                    @keypress="(e: KeyboardEvent) => { if (e.key && !/[0-9.]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') e.preventDefault(); }"
                    @update:model-value="handleAdjustedAmountChange(payment.uuid, costCode, $event)"
                  />
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    / {{ formatCurrency(getRemainingAmount(payment.uuid, costCode)) }}
                  </span>
                </div>
              </div>
              <span v-else class="text-xs text-gray-400">No cost codes</span>
            </td>

            <!-- Total Amount -->
            <td class="px-4 py-3 text-right">
              <div class="text-sm font-semibold text-red-600 dark:text-red-400">
                {{ formatCurrency(-getAmountWithoutTaxes(payment)) }}
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="advancePayments.length > 0" class="bg-gray-50 dark:bg-gray-800">
          <tr>
            <td :colspan="footerColspan" class="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
              Total Advance Paid:
            </td>
            <td class="px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 text-right">
              {{ formatCurrency(-totalAdvancePaidWithoutTaxes) }}
            </td>
          </tr>
          <tr v-if="hasPreviouslyAdjustedCostCodes && totalPreviouslyAdjusted > 0">
            <td :colspan="footerColspan" class="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
              Total Previously Adjusted:
            </td>
            <td class="px-4 py-3 text-sm font-bold text-green-600 dark:text-green-400 text-right">
              {{ formatCurrency(totalPreviouslyAdjusted) }}
            </td>
          </tr>
          <tr v-if="showAdjustmentInputs">
            <td :colspan="footerColspan" class="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
              Total Adjusted:
            </td>
            <td class="px-4 py-3 text-sm font-bold text-primary-600 dark:text-primary-400 text-right">
              {{ formatCurrency(totalAdjustedAmount) }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDateFormat } from '@/composables/useDateFormat'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'

interface PreviouslyAdjustedCostCode {
  cost_code_uuid: string
  cost_code_label?: string
  cost_code_number?: string
  cost_code_name?: string
  adjusted_amount: number
  advance_payment_uuid: string
}

interface Props {
  purchaseOrderUuid?: string | null
  changeOrderUuid?: string | null
  currentInvoiceUuid?: string | null
  showAdjustmentInputs?: boolean
  readonly?: boolean
  adjustedAmounts?: Record<string, Record<string, number>> // Map of advancePaymentUuid -> costCodeUuid -> adjustedAmount
  previouslyAdjustedCostCodes?: PreviouslyAdjustedCostCode[] // Cost codes that were previously adjusted for this invoice
}

const props = withDefaults(defineProps<Props>(), {
  purchaseOrderUuid: null,
  changeOrderUuid: null,
  currentInvoiceUuid: null,
  showAdjustmentInputs: false,
  readonly: false,
  adjustedAmounts: () => ({}),
  previouslyAdjustedCostCodes: () => []
})

const emit = defineEmits<{
  'adjusted-amount-change': [advancePaymentUuid: string, costCode: any, amount: number | null]
  'adjusted-amounts-update': [adjustedAmounts: Record<string, Record<string, number>>]
}>()

const { formatDate } = useDateFormat()
const { formatCurrency } = useCurrencyFormat()

const advancePayments = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Local state for adjusted amounts (keyed by advancePaymentUuid -> costCodeUuid)
const localAdjustedAmounts = ref<Record<string, Record<string, number>>>({})

// Check if we have previously adjusted cost codes to display
const hasPreviouslyAdjustedCostCodes = computed(() => {
  return props.previouslyAdjustedCostCodes && props.previouslyAdjustedCostCodes.length > 0
})

// Get previously adjusted amount for a specific advance payment and cost code
// Sum all adjustments across all invoices for this advance payment and cost code
const getPreviouslyAdjustedAmount = (advancePaymentUuid: string, costCodeUuid: string): number => {
  if (!props.previouslyAdjustedCostCodes || props.previouslyAdjustedCostCodes.length === 0) {
    return 0
  }
  // Filter all matching cost codes and sum their adjusted amounts
  const matches = props.previouslyAdjustedCostCodes.filter(
    cc => cc.advance_payment_uuid === advancePaymentUuid && cc.cost_code_uuid === costCodeUuid
  )
  return matches.reduce((sum, cc) => sum + (parseFloat(String(cc.adjusted_amount)) || 0), 0)
}

// Get remaining amount to be adjusted for a specific advance payment and cost code
// This is: advance_amount - previously_adjusted (not including current adjustment)
const getRemainingAmount = (advancePaymentUuid: string, costCode: any): number => {
  const advanceAmount = parseFloat(costCode.advance_amount || costCode.advanceAmount || '0') || 0
  const costCodeUuid = costCode.cost_code_uuid || costCode.uuid
  const previouslyAdjusted = getPreviouslyAdjustedAmount(advancePaymentUuid, costCodeUuid)
  const remaining = advanceAmount - previouslyAdjusted
  return Math.max(0, remaining) // Don't allow negative
}

// Get total previously adjusted amount for a specific advance payment
const getTotalPreviouslyAdjustedForPayment = (advancePaymentUuid: string): number => {
  if (!props.previouslyAdjustedCostCodes || props.previouslyAdjustedCostCodes.length === 0) {
    return 0
  }
  return props.previouslyAdjustedCostCodes
    .filter(cc => cc.advance_payment_uuid === advancePaymentUuid)
    .reduce((sum, cc) => sum + (parseFloat(String(cc.adjusted_amount)) || 0), 0)
}

// Get total previously adjusted amount across all payments
const totalPreviouslyAdjusted = computed(() => {
  if (!props.previouslyAdjustedCostCodes || props.previouslyAdjustedCostCodes.length === 0) {
    return 0
  }
  return props.previouslyAdjustedCostCodes.reduce(
    (sum, cc) => sum + (parseFloat(String(cc.adjusted_amount)) || 0), 0
  )
})

// Calculate footer colspan based on visible columns
const footerColspan = computed(() => {
  let cols = 4 // Invoice Number, Invoice Date, Status, Cost Code Breakdown
  if (hasPreviouslyAdjustedCostCodes.value) cols++
  if (hasPreviouslyAdjustedCostCodes.value && props.showAdjustmentInputs) cols++ // Remaining column
  if (props.showAdjustmentInputs) cols++
  return cols
})

// Check if any cost code in a payment has over-adjusted amount
const hasOverAdjustedAmount = (payment: any): boolean => {
  if (!payment.costCodes || payment.costCodes.length === 0) return false
  if (!props.showAdjustmentInputs) return false
  
  return payment.costCodes.some((costCode: any) => {
    const costCodeUuid = costCode.cost_code_uuid || costCode.uuid
    const currentlyAdjusted = parseFloat(getAdjustedAmount(payment.uuid, costCodeUuid)) || 0
    const remaining = getRemainingAmount(payment.uuid, costCode)
    // If currently adjusted exceeds remaining, it's an error
    return currentlyAdjusted > remaining
  })
}

// Initialize local adjusted amounts from props
watch(
  () => props.adjustedAmounts,
  (newAmounts) => {
    console.log('[APBT] adjustedAmounts prop changed:', newAmounts)
    if (newAmounts && Object.keys(newAmounts).length > 0) {
      // Deep copy to ensure Vue reactivity works properly with nested objects
      localAdjustedAmounts.value = JSON.parse(JSON.stringify(newAmounts))
      console.log('[APBT] Updated localAdjustedAmounts:', localAdjustedAmounts.value)
      // Debug: Show the actual structure
      console.log('[APBT] localAdjustedAmounts structure:', {
        paymentKeys: Object.keys(localAdjustedAmounts.value),
        sample: Object.entries(localAdjustedAmounts.value).map(([paymentUuid, costCodes]) => ({
          paymentUuid,
          costCodeKeys: Object.keys(costCodes as Record<string, number>),
          values: costCodes
        }))
      })
    }
  },
  { immediate: true, deep: true }
)

// Fetch advance payment invoices for the purchase order or change order
const fetchAdvancePayments = async () => {
  console.log('[APBT] fetchAdvancePayments called with:', { 
    purchaseOrderUuid: props.purchaseOrderUuid, 
    changeOrderUuid: props.changeOrderUuid,
    currentInvoiceUuid: props.currentInvoiceUuid 
  })
  
  if (!props.purchaseOrderUuid && !props.changeOrderUuid) {
    console.log('[APBT] No PO or CO UUID, returning empty')
    advancePayments.value = []
    return
  }

  loading.value = true
  error.value = null

  try {
    // Build query parameters
    const queryParams: Record<string, string> = {}
    if (props.currentInvoiceUuid) {
      queryParams.currentInvoiceUuid = props.currentInvoiceUuid
    }

    // Fetch advance payment invoices with cost codes for this PO or CO
    let apiUrl = ''
    if (props.purchaseOrderUuid) {
      apiUrl = `/api/purchase-orders/${props.purchaseOrderUuid}/advance-payments`
    } else if (props.changeOrderUuid) {
      apiUrl = `/api/change-orders/${props.changeOrderUuid}/advance-payments`
    }

    const response = await $fetch<{ data: any[] }>(
      apiUrl,
      {
        query: queryParams
      }
    )

    const payments = Array.isArray(response?.data) ? response.data : []
    advancePayments.value = payments
    
    // Debug: Log structure of payments and cost codes
    console.log('[APBT] Advance payments fetched:', {
      count: payments.length,
      purchaseOrderUuid: props.purchaseOrderUuid,
      changeOrderUuid: props.changeOrderUuid,
      currentInvoiceUuid: props.currentInvoiceUuid,
      samplePayment: payments.length > 0 && payments[0] ? {
        uuid: payments[0].uuid,
        costCodesCount: payments[0].costCodes?.length || 0,
        adjusted_against: payments[0].adjusted_against_vendor_invoice_uuid,
        sampleCostCode: payments[0].costCodes?.[0] ? {
          uuid: payments[0].costCodes[0].uuid,
          cost_code_uuid: payments[0].costCodes[0].cost_code_uuid,
          allKeys: Object.keys(payments[0].costCodes[0])
        } : 'no cost codes'
      } : 'no payments returned'
    })
  } catch (err: any) {
    console.error('Error fetching advance payments:', err)
    error.value = err.message || 'Failed to load advance payments'
    advancePayments.value = []
  } finally {
    loading.value = false
  }
}

// Get amount without taxes for a payment
const getAmountWithoutTaxes = (payment: any): number => {
  const totalAmount = parseFloat(payment.amount || '0') || 0
  
  // Try to get tax total from financial_breakdown
  let taxTotal = 0
  if (payment.financial_breakdown) {
    try {
      let breakdown = payment.financial_breakdown
      
      // Parse if it's a string
      if (typeof breakdown === 'string') {
        try {
          breakdown = JSON.parse(breakdown)
        } catch (parseError) {
          // If parsing fails, use 0 for tax
        }
      }

      // Handle both nested structure and flattened structure
      const totals = breakdown?.totals || breakdown || {}
      
      // Calculate total tax from sales taxes if available
      if (breakdown?.sales_taxes) {
        const salesTaxes = breakdown.sales_taxes
        const tax1 = parseFloat(salesTaxes.sales_tax_1?.amount || salesTaxes.salesTax1?.amount || '0') || 0
        const tax2 = parseFloat(salesTaxes.sales_tax_2?.amount || salesTaxes.salesTax2?.amount || '0') || 0
        taxTotal = tax1 + tax2
      } else {
        // Fallback to totals.tax_total
        taxTotal = parseFloat(totals.tax_total || totals.taxTotal || '0') || 0
      }
    } catch (error) {
      // If there's an error, use 0 for tax
      taxTotal = 0
    }
  }
  
  // Return amount without taxes
  return totalAmount - taxTotal
}

// Calculate total advance paid without taxes
const totalAdvancePaidWithoutTaxes = computed(() => {
  return advancePayments.value.reduce(
    (sum, payment) => sum + getAmountWithoutTaxes(payment),
    0
  )
})

// Get status color for badge based on is_active
const getStatusColor = (isActive: boolean | undefined): "error" | "warning" | "info" | "success" | "primary" | "secondary" | "neutral" => {
  return isActive ? 'success' : 'neutral'
}

// Get adjusted amount for a specific advance payment and cost code
const getAdjustedAmount = (advancePaymentUuid: string, costCodeUuid: string): string => {
  const amount = localAdjustedAmounts.value[advancePaymentUuid]?.[costCodeUuid]
  // Debug: Log lookup details
  if (Object.keys(localAdjustedAmounts.value).length > 0) {
    console.log('[APBT] getAdjustedAmount lookup:', { 
      advancePaymentUuid, 
      costCodeUuid, 
      found: amount,
      availablePaymentKeys: Object.keys(localAdjustedAmounts.value),
      availableCostCodeKeys: localAdjustedAmounts.value[advancePaymentUuid] 
        ? Object.keys(localAdjustedAmounts.value[advancePaymentUuid]) 
        : 'payment not found'
    })
  }
  if (amount === null || amount === undefined) return ''
  return String(amount)
}

// Handle adjusted amount change
const handleAdjustedAmountChange = (advancePaymentUuid: string, costCode: any, value: string | null) => {
  console.log('[APBT] handleAdjustedAmountChange called:', { advancePaymentUuid, costCode, value })
  // IMPORTANT: Prioritize cost_code_uuid over uuid to match the database storage
  // cost_code_uuid is the foreign key to cost_code_configurations
  // uuid is the row ID of advance_payment_cost_codes table
  const costCodeUuid = costCode.cost_code_uuid || costCode.uuid
  console.log('[APBT] costCodeUuid:', costCodeUuid)
  if (!costCodeUuid) {
    console.warn('[APBT] costCodeUuid is falsy, returning early!')
    return
  }

  // Parse the value
  let numericValue: number | null = null
  if (value !== null && value !== undefined && value !== '') {
    const parsed = parseFloat(value)
    if (!isNaN(parsed) && parsed >= 0) {
      // Calculate max allowed: advance_amount - previously_adjusted
      const advanceAmount = parseFloat(costCode.advance_amount || costCode.advanceAmount || '0') || 0
      const previouslyAdjusted = getPreviouslyAdjustedAmount(advancePaymentUuid, costCodeUuid)
      const maxAllowed = advanceAmount - previouslyAdjusted
      // Allow user to type any value (for validation/highlighting), but don't cap it
      numericValue = parsed
    }
  }

  // Update local state
  if (!localAdjustedAmounts.value[advancePaymentUuid]) {
    localAdjustedAmounts.value[advancePaymentUuid] = {}
  }
  
  if (numericValue !== null && numericValue > 0) {
    localAdjustedAmounts.value[advancePaymentUuid][costCodeUuid] = numericValue
  } else {
    delete localAdjustedAmounts.value[advancePaymentUuid][costCodeUuid]
    if (Object.keys(localAdjustedAmounts.value[advancePaymentUuid]).length === 0) {
      delete localAdjustedAmounts.value[advancePaymentUuid]
    }
  }

  // Emit events
  emit('adjusted-amount-change', advancePaymentUuid, costCode, numericValue)
  // Deep copy to ensure Vue reactivity is triggered in parent component
  const deepCopy = JSON.parse(JSON.stringify(localAdjustedAmounts.value))
  console.log('[APBT] Emitting adjusted-amounts-update:', deepCopy)
  emit('adjusted-amounts-update', deepCopy)
}

// Calculate total adjusted amount across all advance payments
const totalAdjustedAmount = computed(() => {
  let total = 0
  Object.values(localAdjustedAmounts.value).forEach((costCodeAmounts) => {
    Object.values(costCodeAmounts).forEach((amount) => {
      total += amount || 0
    })
  })
  return total
})

// Watch for purchase order changes
// Watch for changes to purchaseOrderUuid, changeOrderUuid, OR currentInvoiceUuid
// We need to re-fetch when currentInvoiceUuid changes because the API filters based on it
// (it includes advance payments that were adjusted against the current invoice)
watch(
  () => [props.purchaseOrderUuid, props.changeOrderUuid, props.currentInvoiceUuid],
  ([newPoUuid, newCoUuid, newCurrentInvoiceUuid]) => {
    console.log('[APBT] PO/CO/Invoice UUID watcher fired:', { newPoUuid, newCoUuid, newCurrentInvoiceUuid })
    if (newPoUuid || newCoUuid) {
      fetchAdvancePayments()
    } else {
      advancePayments.value = []
    }
  },
  { immediate: true }
)

// Expose validation state for parent component
const hasValidationError = computed(() => {
  return advancePayments.value.some((payment) => hasOverAdjustedAmount(payment))
})

defineExpose({
  hasValidationError
})
</script>

