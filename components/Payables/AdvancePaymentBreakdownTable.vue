<template>
  <div class="mt-6">
    <div class="mb-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Advance Payment Breakdown</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{ purchaseOrderUuid ? 'Advance payments made for this purchase order' : changeOrderUuid ? 'Advance payments made for this change order' : 'Select a purchase order or change order to view advance payments' }}
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
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
              Total Amount
            </th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          <tr
            v-for="(payment, index) in advancePayments"
            :key="payment.uuid || index"
            class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
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

            <!-- Total Amount -->
            <td class="px-4 py-3 text-right">
              <div class="text-sm font-semibold text-red-600 dark:text-red-400">
                {{ formatCurrency(-getAmountWithoutTaxes(payment)) }}
              </div>
              <div v-if="taxChargesSummaries.get(payment.uuid)" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ taxChargesSummaries.get(payment.uuid) }}
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="advancePayments.length > 0" class="bg-gray-50 dark:bg-gray-800">
          <tr>
            <td colspan="3" class="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
              Total Advance Paid:
            </td>
            <td colspan="2" class="px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 text-right">
              {{ formatCurrency(-totalAdvancePaidWithoutTaxes) }}
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

interface Props {
  purchaseOrderUuid?: string | null
  changeOrderUuid?: string | null
  currentInvoiceUuid?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  purchaseOrderUuid: null,
  changeOrderUuid: null,
  currentInvoiceUuid: null
})

const { formatDate } = useDateFormat()
const { formatCurrency } = useCurrencyFormat()

const advancePayments = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Cache for tax/charges summaries to avoid recalculating
const taxChargesSummaries = ref<Map<string, string | null>>(new Map())

// Fetch advance payment invoices for the purchase order or change order
const fetchAdvancePayments = async () => {
  if (!props.purchaseOrderUuid && !props.changeOrderUuid) {
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
    
    // Calculate and cache summaries for each payment
    taxChargesSummaries.value.clear()
    payments.forEach((payment: any) => {
      const summary = getTaxChargesSummary(payment)
      if (payment.uuid) {
        taxChargesSummaries.value.set(payment.uuid, summary)
      }
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

// Get short summary of tax and charges breakdown
const getTaxChargesSummary = (payment: any): string | null => {
  if (!payment.financial_breakdown) {
    return null
  }

  try {
    let breakdown = payment.financial_breakdown
    
    // Parse if it's a string
    if (typeof breakdown === 'string') {
      try {
        breakdown = JSON.parse(breakdown)
      } catch (parseError) {
        console.error('Error parsing financial_breakdown string:', parseError)
        return null
      }
    }

    // Handle both nested structure and flattened structure
    const totals = breakdown?.totals || breakdown || {}
    
    // Calculate total tax from sales taxes if available
    let calculatedTaxTotal = 0
    if (breakdown?.sales_taxes) {
      const salesTaxes = breakdown.sales_taxes
      const tax1 = parseFloat(salesTaxes.sales_tax_1?.amount || salesTaxes.salesTax1?.amount || '0') || 0
      const tax2 = parseFloat(salesTaxes.sales_tax_2?.amount || salesTaxes.salesTax2?.amount || '0') || 0
      calculatedTaxTotal = tax1 + tax2
    } else {
      // Fallback to totals.tax_total
      calculatedTaxTotal = parseFloat(totals.tax_total || totals.taxTotal || '0') || 0
    }
    
    // Calculate total charges if available
    let calculatedChargesTotal = 0
    if (breakdown?.charges) {
      const charges = breakdown.charges
      const freight = parseFloat(charges.freight?.amount || '0') || 0
      const packing = parseFloat(charges.packing?.amount || '0') || 0
      const custom = parseFloat(charges.custom_duties?.amount || charges.custom?.amount || '0') || 0
      const other = parseFloat(charges.other?.amount || '0') || 0
      calculatedChargesTotal = freight + packing + custom + other
    } else {
      // Fallback to totals.charges_total
      calculatedChargesTotal = parseFloat(totals.charges_total || totals.chargesTotal || '0') || 0
    }

    const parts: string[] = []
    
    if (calculatedTaxTotal > 0) {
      parts.push(`Includes tax of ${formatCurrency(calculatedTaxTotal)}`)
    }
    
    if (calculatedChargesTotal > 0) {
      parts.push(`Charges: ${formatCurrency(calculatedChargesTotal)}`)
    }

    return parts.length > 0 ? parts.join(', ') : null
  } catch (error) {
    console.error('Error parsing financial breakdown:', error)
    return null
  }
}

// Watch for purchase order changes
// Watch for changes to purchaseOrderUuid or changeOrderUuid
watch(
  () => [props.purchaseOrderUuid, props.changeOrderUuid],
  ([newPoUuid, newCoUuid]) => {
    if (newPoUuid || newCoUuid) {
      fetchAdvancePayments()
    } else {
      advancePayments.value = []
    }
  },
  { immediate: true }
)
</script>

