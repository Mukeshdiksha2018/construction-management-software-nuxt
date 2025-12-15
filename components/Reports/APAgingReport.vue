<template>
  <div>
    <div v-if="corpStore.selectedCorporation" class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Accounts Payable Aging Report</h2>
        <p class="text-gray-600 mt-1">
          Track outstanding vendor payments and aging analysis
        </p>
      </div>
      <div class="flex gap-2">
        <UButton
          icon="i-heroicons-arrow-down-tray"
          size="sm"
          color="secondary"
          variant="soft"
          @click="exportReport"
          :disabled="!agingStore.report"
        >
          Export
        </UButton>
        <UButton
          icon="i-heroicons-arrow-path"
          size="sm"
          color="primary"
          @click="refreshReport"
          :loading="agingStore.loading"
        >
          Refresh
        </UButton>
      </div>
    </div>

    <div v-else class="text-gray-500">No corporation selected.</div>

    <!-- Loading State -->
    <div v-if="agingStore.loading && !agingStore.report" class="space-y-4">
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <div class="animate-pulse">
          <div class="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div class="grid grid-cols-4 gap-4">
            <div v-for="i in 4" :key="i" class="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="agingStore.error" class="bg-red-50 border border-red-200 rounded-lg p-4">
      <div class="flex items-center">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400 mr-2" />
        <span class="text-red-800">{{ agingStore.error }}</span>
      </div>
    </div>

    <!-- Report Content -->
    <div v-else-if="agingStore.report" class="space-y-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">Total Outstanding</p>
              <p class="text-2xl font-bold text-gray-900">
                {{ agingStore.formatCurrency(agingStore.getTotalByAge('total_amount')) }}
              </p>
            </div>
            <div class="p-3 bg-blue-100 rounded-full">
              <UIcon name="i-heroicons-currency-dollar" class="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">Current (0-30 days)</p>
              <p class="text-2xl font-bold text-green-600">
                {{ agingStore.formatCurrency(agingStore.getTotalByAge('current')) }}
              </p>
              <p class="text-xs text-gray-500">
                {{ agingStore.formatPercentage(agingStore.getPercentageByAge('current')) }} of total
              </p>
            </div>
            <div class="p-3 bg-green-100 rounded-full">
              <UIcon name="i-heroicons-check-circle" class="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">31-60 Days</p>
              <p class="text-2xl font-bold text-yellow-600">
                {{ agingStore.formatCurrency(agingStore.getTotalByAge('days31_60')) }}
              </p>
              <p class="text-xs text-gray-500">
                {{ agingStore.formatPercentage(agingStore.getPercentageByAge('days31_60')) }} of total
              </p>
            </div>
            <div class="p-3 bg-yellow-100 rounded-full">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">Over 90 Days</p>
              <p class="text-2xl font-bold text-red-600">
                {{ agingStore.formatCurrency(agingStore.getTotalByAge('over90')) }}
              </p>
              <p class="text-xs text-gray-500">
                {{ agingStore.formatPercentage(agingStore.getPercentageByAge('over90')) }} of total
              </p>
            </div>
            <div class="p-3 bg-red-100 rounded-full">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <!-- Aging Chart -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Aging Distribution</h3>
        <div class="h-64 flex items-end space-x-2">
          <div class="flex-1 flex flex-col items-center">
            <div 
              class="w-full bg-green-500 rounded-t"
              :style="{ height: `${(agingStore.getPercentageByAge('current') / 100) * 200}px` }"
            ></div>
            <p class="text-xs text-gray-500 mt-2">Current</p>
            <p class="text-xs font-medium text-gray-900">
              {{ agingStore.formatCurrency(agingStore.getTotalByAge('current')) }}
            </p>
          </div>
          <div class="flex-1 flex flex-col items-center">
            <div 
              class="w-full bg-yellow-500 rounded-t"
              :style="{ height: `${(agingStore.getPercentageByAge('days31_60') / 100) * 200}px` }"
            ></div>
            <p class="text-xs text-gray-500 mt-2">31-60</p>
            <p class="text-xs font-medium text-gray-900">
              {{ agingStore.formatCurrency(agingStore.getTotalByAge('days31_60')) }}
            </p>
          </div>
          <div class="flex-1 flex flex-col items-center">
            <div 
              class="w-full bg-orange-500 rounded-t"
              :style="{ height: `${(agingStore.getPercentageByAge('days61_90') / 100) * 200}px` }"
            ></div>
            <p class="text-xs text-gray-500 mt-2">61-90</p>
            <p class="text-xs font-medium text-gray-900">
              {{ agingStore.formatCurrency(agingStore.getTotalByAge('days61_90')) }}
            </p>
          </div>
          <div class="flex-1 flex flex-col items-center">
            <div 
              class="w-full bg-red-500 rounded-t"
              :style="{ height: `${(agingStore.getPercentageByAge('over90') / 100) * 200}px` }"
            ></div>
            <p class="text-xs text-gray-500 mt-2">90+</p>
            <p class="text-xs font-medium text-gray-900">
              {{ agingStore.formatCurrency(agingStore.getTotalByAge('over90')) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Critical Vendors Alert -->
      <div v-if="criticalVendors.length > 0" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex items-center mb-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400 mr-2" />
          <h3 class="text-lg font-medium text-red-800">Critical Vendors (90+ Days Overdue)</h3>
        </div>
        <div class="space-y-2">
          <div v-for="vendor in criticalVendors" :key="vendor.vendor_name" class="flex justify-between items-center">
            <span class="text-sm text-red-700">{{ vendor.vendor_name }}</span>
            <span class="text-sm font-medium text-red-900">
              {{ agingStore.formatCurrency(vendor.over90) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Vendors Table -->
      <div class="bg-white rounded-lg border border-gray-200">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Vendor Details</h3>
          <p class="text-sm text-gray-500">Outstanding amounts by vendor and aging period</p>
        </div>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  31-60 Days
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  61-90 Days
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  90+ Days
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="vendor in agingStore.getVendorsByTotal()" :key="vendor.vendor_name" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div class="text-sm font-medium text-gray-900">{{ vendor.vendor_name }}</div>
                    <div v-if="vendor.contact_name" class="text-sm text-gray-500">{{ vendor.contact_name }}</div>
                    <div v-if="vendor.email" class="text-xs text-gray-400">{{ vendor.email }}</div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {{ agingStore.formatCurrency(vendor.current) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {{ agingStore.formatCurrency(vendor.days31_60) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {{ agingStore.formatCurrency(vendor.days61_90) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  <span :class="vendor.over90 > 0 ? 'text-red-600 font-medium' : ''">
                    {{ agingStore.formatCurrency(vendor.over90) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                  {{ agingStore.formatCurrency(vendor.total_amount) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center text-sm">
                  <UButton
                    icon="i-heroicons-eye"
                    size="xs"
                    color="primary"
                    variant="soft"
                    @click="viewVendorDetails(vendor)"
                  >
                    View
                  </UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Report Footer -->
      <div class="text-center text-sm text-gray-500">
        <p>Report generated on {{ formatDate(agingStore.getReportDate()) }}</p>
        <p v-if="agingStore.isReportRecent()" class="text-green-600">✓ Data is current</p>
        <p v-else class="text-yellow-600">⚠ Data may be outdated - consider refreshing</p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-document-text" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg font-medium">No AP aging data found</p>
      <p class="text-gray-400 text-sm">Create some bill entries to generate aging reports</p>
    </div>

    <!-- Vendor Details Modal -->
    <UModal v-model:open="showVendorModal" :title="`${selectedVendor?.vendor_name} - Bill Details`">
      <template #body>
        <div v-if="selectedVendor" class="space-y-4">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium text-gray-500">Contact:</span>
              <span class="ml-2">{{ selectedVendor.contact_name || 'N/A' }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-500">Email:</span>
              <span class="ml-2">{{ selectedVendor.email || 'N/A' }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-500">Phone:</span>
              <span class="ml-2">{{ selectedVendor.phone || 'N/A' }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-500">Total Outstanding:</span>
              <span class="ml-2 font-semibold">{{ agingStore.formatCurrency(selectedVendor.total_amount) }}</span>
            </div>
          </div>

          <div class="border-t pt-4">
            <h4 class="font-medium text-gray-900 mb-3">Outstanding Bills</h4>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <div v-for="bill in selectedVendor.bills" :key="bill.bill_id" class="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <div class="text-sm font-medium">Bill #{{ bill.bill_id }}</div>
                  <div class="text-xs text-gray-500">{{ bill.description }}</div>
                  <div class="text-xs text-gray-400">
                    Due: {{ formatDate(bill.due_date) }} | Status: {{ bill.status }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-medium">{{ agingStore.formatCurrency(bill.amount) }}</div>
                  <div class="text-xs text-gray-500">{{ formatDate(bill.bill_date) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end">
          <UButton color="neutral" variant="soft" @click="showVendorModal = false">
            Close
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAPAgingStore } from '@/stores/apAging'
import { useCorporationStore } from '@/stores/corporations'
import { useDateFormat } from '@/composables/useDateFormat'
import type { VendorSummary } from '@/stores/apAging'

const agingStore = useAPAgingStore()
const corpStore = useCorporationStore()
const { formatDate } = useDateFormat()

const showVendorModal = ref(false)
const selectedVendor = ref<VendorSummary | null>(null)

// Computed properties
const criticalVendors = computed(() => agingStore.getCriticalVendors())

// Methods
const refreshReport = async () => {
  if (corpStore.selectedCorporation?.uuid) {
    await agingStore.fetchAPAgingReport(corpStore.selectedCorporation.uuid)
  }
}

const viewVendorDetails = (vendor: VendorSummary) => {
  selectedVendor.value = vendor
  showVendorModal.value = true
}

const exportReport = () => {
  if (!agingStore.report) return

  // Create CSV content
  const headers = ['Vendor', 'Contact', 'Email', 'Phone', 'Current', '31-60 Days', '61-90 Days', '90+ Days', 'Total']
  const rows = agingStore.report.vendors.map(vendor => [
    vendor.vendor_name,
    vendor.contact_name || '',
    vendor.email || '',
    vendor.phone || '',
    vendor.current.toFixed(2),
    vendor.days31_60.toFixed(2),
    vendor.days61_90.toFixed(2),
    vendor.over90.toFixed(2),
    vendor.total_amount.toFixed(2)
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')

  // Download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `ap-aging-report-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}


// Initialize on mount
onMounted(async () => {
  if (corpStore.selectedCorporation?.uuid) {
    await refreshReport()
  }
})
</script>
