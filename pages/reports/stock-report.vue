<template>
  <div class="h-[88vh] print:h-auto">
    <!-- Header section - hidden in print -->
    <div class="mb-2 print:hidden">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <!-- Left side: Back button -->
        <div class="flex items-center gap-3">
          <UButton
            color="neutral"
            variant="solid"
            icon="i-heroicons-arrow-left"
            @click="goBack"
          >
            Back
          </UButton>
        </div>

        <!-- Right side: Corporation, Project Selection, Date Range, Show and Print buttons -->
        <div class="flex items-end gap-3 flex-wrap">
          <!-- Corporation Select -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-default whitespace-nowrap">
              Corporation <span class="text-red-500">*</span>
            </label>
            <CorporationSelect
              v-model="selectedCorporationId"
              size="sm"
              class="w-64"
              @change="handleCorporationChangeFromSelect"
            />
          </div>

          <!-- Project Select -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-default whitespace-nowrap">
              Project <span class="text-red-500">*</span>
            </label>
            <ProjectSelect
              :model-value="selectedProjectId"
              :corporation-uuid="selectedCorporationId || undefined"
              placeholder="Select project"
              size="sm"
              class="w-64"
              @update:model-value="handleProjectChange"
            />
          </div>

          <!-- Start Date -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-default whitespace-nowrap">
              Start Date <span class="text-red-500">*</span>
            </label>
            <UPopover :popper="{ placement: 'bottom-start' }">
              <UButton
                icon="i-heroicons-calendar"
                size="sm"
                variant="outline"
                class="w-48"
              >
                {{ startDateDisplayText }}
              </UButton>
              <template #content>
                <UCalendar
                  v-model="startDateValue"
                  :min-value="undefined"
                  :max-value="endDateValue || undefined"
                  class="p-2"
                />
              </template>
            </UPopover>
          </div>

          <!-- End Date -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-default whitespace-nowrap">
              End Date <span class="text-red-500">*</span>
            </label>
            <UPopover :popper="{ placement: 'bottom-start' }">
              <UButton
                icon="i-heroicons-calendar"
                size="sm"
                variant="outline"
                class="w-48"
              >
                {{ endDateDisplayText }}
              </UButton>
              <template #content>
                <UCalendar
                  v-model="endDateValue"
                  :min-value="startDateValue || undefined"
                  :max-value="undefined"
                  class="p-2"
                />
              </template>
            </UPopover>
          </div>

          <!-- Show button -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-default whitespace-nowrap opacity-0">
              Show
            </label>
            <UButton
              :disabled="!canGenerateReport"
              color="primary"
              variant="solid"
              size="sm"
              @click="handleShowReport"
            >
              Show
            </UButton>
          </div>

          <!-- Print button -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-default whitespace-nowrap opacity-0">
              Print
            </label>
            <UButton
              v-if="selectedCorporationId && selectedProjectId && reportData && reportData.items && reportData.items.length > 0"
              icon="i-heroicons-printer"
              variant="soft"
              size="sm"
              @click="printReport"
            >
              Print
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Report Content Area -->
    <div class="p-4">
      <div v-if="!selectedCorporationId" class="text-center py-12">
        <UIcon name="i-heroicons-building-office" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">Please select a corporation to view the stock report</p>
      </div>
      <div v-else-if="!selectedProjectId" class="text-center py-12">
        <UIcon name="i-heroicons-folder" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">Please select a project to view the stock report</p>
      </div>
      <div v-else-if="selectedCorporationId && selectedProjectId && (!startDateValue || !endDateValue)" class="text-center py-12">
        <UIcon name="i-heroicons-calendar" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">Please select start date and end date to generate the report</p>
      </div>
      <div v-else-if="loading" class="space-y-3">
        <!-- Loading skeleton -->
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-xs">
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                <th v-for="i in 13" :key="i" class="text-left py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-20" />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in 5" :key="i" class="border-b border-gray-200 dark:border-gray-700">
                <td v-for="j in 13" :key="j" class="py-1 px-2 text-default text-xs">
                  <USkeleton class="h-3 w-20" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else-if="error && error !== null && error !== ''" class="text-center py-12">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-16 h-16 mx-auto text-red-400 mb-4" />
        <p class="text-red-500 text-lg">{{ error }}</p>
      </div>
      <div v-else-if="reportData && reportData.items && reportData.items.length > 0" class="space-y-6">
        <!-- Report Title -->
        <h1 class="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 print:text-2xl print:text-gray-900">
          Stock Report
        </h1>

        <!-- Report Table -->
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-xs print:text-sm">
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">Item Code</th>
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">Item Name</th>
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">Description</th>
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">Vendor / Source</th>
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">Cost Code</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Current Stock</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Unit Cost</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">UOM</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Total Value</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Reorder Level</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">In Shipment</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Returned QTY</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Last Purchase Date</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Last Stock Update Date</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in reportData.items"
                :key="item.itemCode"
                class="border-b border-gray-200 dark:border-gray-700"
              >
                <td class="py-1 px-2 text-default text-xs">{{ item.itemCode }}</td>
                <td class="py-1 px-2 text-default text-xs">{{ item.itemName }}</td>
                <td class="py-1 px-2 text-default text-xs">{{ item.description || '-' }}</td>
                <td class="py-1 px-2 text-default text-xs">{{ item.vendorSource || '-' }}</td>
                <td class="py-1 px-2 text-default text-xs">{{ item.costCode || '-' }}</td>
                <td class="py-1 px-2 text-right text-default text-xs">
                  {{ formatNumber(item.currentStock) }}
                </td>
                <td class="py-1 px-2 text-right text-default text-xs">
                  {{ formatCurrency(item.unitCost) }}
                </td>
                <td class="py-1 px-2 text-right text-default text-xs">{{ item.uom || '-' }}</td>
                <td class="py-1 px-2 text-right text-default text-xs">
                  {{ formatCurrency(item.totalValue) }}
                </td>
                <td class="py-1 px-2 text-right text-default text-xs">
                  {{ formatNumber(item.reorderLevel) }}
                </td>
                <td class="py-1 px-2 text-right text-default text-xs">
                  {{ formatNumber(item.inShipment) }}
                </td>
                <td class="py-1 px-2 text-right text-default text-xs">
                  {{ formatNumber(item.returnedQty) }}
                </td>
                <td class="py-1 px-2 text-right text-default text-xs">
                  {{ formatDate(item.lastPurchaseDate) }}
                </td>
                <td class="py-1 px-2 text-right text-default text-xs">
                  {{ formatDate(item.lastStockUpdateDate) }}
                </td>
              </tr>
              
              <!-- Total Row -->
              <tr class="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-400 dark:border-gray-600 font-semibold">
                <td class="py-2 px-2 text-xs text-default font-bold" colspan="5">
                  Total
                </td>
                <td class="py-2 px-2 text-right text-xs text-default font-bold">
                  {{ formatNumber(totals.currentStock) }}
                </td>
                <td class="py-2 px-2 text-right text-xs text-default"></td>
                <td class="py-2 px-2 text-right text-xs text-default"></td>
                <td class="py-2 px-2 text-right text-xs text-default font-bold">
                  {{ formatCurrency(totals.totalValue) }}
                </td>
                <td class="py-2 px-2 text-right text-xs text-default font-bold">
                  {{ formatNumber(totals.reorderLevel) }}
                </td>
                <td class="py-2 px-2 text-right text-xs text-default font-bold">
                  {{ formatNumber(totals.inShipment) }}
                </td>
                <td class="py-2 px-2 text-right text-xs text-default font-bold">
                  {{ formatNumber(totals.returnedQty) }}
                </td>
                <td class="py-2 px-2 text-right text-xs text-default"></td>
                <td class="py-2 px-2 text-right text-xs text-default"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else-if="!loading && (!reportData || !reportData.items || reportData.items.length === 0)" class="text-center py-12">
        <UIcon name="i-heroicons-cube" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">No stock items found for this project</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date'
import { useCorporationStore } from '@/stores/corporations'
import { useProjectsStore } from '@/stores/projects'
import { useStockReport } from '@/composables/useStockReport'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import { useDateFormat } from '@/composables/useDateFormat'
import { useUTCDateFormat } from '@/composables/useUTCDateFormat'
import ProjectSelect from '@/components/Shared/ProjectSelect.vue'
import CorporationSelect from '@/components/Shared/CorporationSelect.vue'
import type { StockReportData } from '@/composables/useStockReport'

const router = useRouter()

// Navigation
const goBack = () => {
  router.back()
}

// Set page title
useHead({
  title: 'Stock Report - Property Management'
})

definePageMeta({
  layout: 'main-layout',
  middleware: 'auth',
})

// Stores
const corporationStore = useCorporationStore()
const projectsStore = useProjectsStore()

// State
const selectedCorporationId = ref<string | undefined>(undefined)
const selectedProjectId = ref<string | undefined>(undefined)

// Date range state - default to Jan 1 of current year to today
const currentYear = new Date().getFullYear()
const startDateValue = ref<CalendarDate | null>(
  new CalendarDate(currentYear, 1, 1)
)
const endDateValue = ref<CalendarDate | null>(today(getLocalTimeZone()))

// UTC date formatting
const { createDateRangeParams } = useUTCDateFormat()

// Date display text
const startDateDisplayText = computed(() => {
  if (!startDateValue.value) return 'Select start date'
  return startDateValue.value.toDate(getLocalTimeZone()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
})

const endDateDisplayText = computed(() => {
  if (!endDateValue.value) return 'Select end date'
  return endDateValue.value.toDate(getLocalTimeZone()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
})

// Can generate report
const canGenerateReport = computed(() => {
  return !!(
    selectedCorporationId.value &&
    selectedProjectId.value &&
    startDateValue.value &&
    endDateValue.value &&
    startDateValue.value.compare(endDateValue.value) <= 0
  )
})

// Stock Report
const stockReport = useStockReport()
const { formatCurrency } = useCurrencyFormat()
const { formatDate: formatDateUtil } = useDateFormat()
const reportData = ref<StockReportData | null>(null)

// Expose loading and error from composable - unwrap readonly refs
const loading = computed(() => stockReport.loading.value)
const error = computed(() => stockReport.error.value)

// Number formatting
const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '0'
  return Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

// Date formatting
const formatDate = (date: string | null | undefined): string => {
  if (!date) return '-'
  try {
    return formatDateUtil(new Date(date), 'MM-DD-YYYY')
  } catch {
    return '-'
  }
}

// Computed totals
const totals = computed(() => {
  return reportData.value?.totals || {
    currentStock: 0,
    totalValue: 0,
    reorderLevel: 0,
    inShipment: 0,
    returnedQty: 0
  }
})

// Handlers
const handleCorporationChangeFromSelect = async (corporation: any) => {
  // Clear project selection when corporation changes
  selectedProjectId.value = undefined
  reportData.value = null
  
  // Fetch projects for the selected corporation
  const corporationId = corporation?.value ?? corporation?.uuid
  if (corporationId) {
    try {
      await projectsStore.fetchProjects(corporationId)
    } catch (error) {
      // Silently handle error
    }
  }
}

const handleProjectChange = async (projectId: string | undefined) => {
  selectedProjectId.value = projectId
  reportData.value = null
}

const handleShowReport = async () => {
  if (canGenerateReport.value) {
    await loadStockReport()
  }
}

// Load report data
const loadStockReport = async () => {
  if (!selectedCorporationId.value || !selectedProjectId.value || !startDateValue.value || !endDateValue.value) {
    reportData.value = null
    return
  }
  
  try {
    // Convert dates to UTC format for filtering
    const startDateStr = `${startDateValue.value.year}-${String(startDateValue.value.month).padStart(2, '0')}-${String(startDateValue.value.day).padStart(2, '0')}`
    const endDateStr = `${endDateValue.value.year}-${String(endDateValue.value.month).padStart(2, '0')}-${String(endDateValue.value.day).padStart(2, '0')}`
    
    const dateRangeParams = createDateRangeParams(startDateStr, endDateStr)
    if (!dateRangeParams) {
      reportData.value = null
      return
    }
    
    const startUTC = new Date(dateRangeParams.start_date).getTime()
    const endUTC = new Date(dateRangeParams.end_date).getTime()
    
    const data = await stockReport.generateStockReport(selectedCorporationId.value, selectedProjectId.value)
    
    // Set reportData - use reactive assignment
    if (data && data.items && Array.isArray(data.items)) {
      // Filter items by lastPurchaseDate or lastStockUpdateDate within date range
      const filteredItems = data.items.filter((item: any) => {
        // Use lastPurchaseDate if available, otherwise use lastStockUpdateDate
        const itemDate = item.lastPurchaseDate || item.lastStockUpdateDate
        if (!itemDate) return false
        
        const itemDateUTC = new Date(itemDate).getTime()
        return itemDateUTC >= startUTC && itemDateUTC <= endUTC
      })
      
      // Recalculate totals for filtered items
      const filteredTotals = filteredItems.reduce((acc: any, item: any) => {
        acc.currentStock += item.currentStock || 0
        acc.totalValue += item.totalValue || 0
        acc.reorderLevel += item.reorderLevel || 0
        acc.inShipment += item.inShipment || 0
        acc.returnedQty += item.returnedQty || 0
        return acc
      }, {
        currentStock: 0,
        totalValue: 0,
        reorderLevel: 0,
        inShipment: 0,
        returnedQty: 0
      })
      
      reportData.value = {
        items: filteredItems.map(item => ({ ...item })),
        totals: filteredTotals
      }
    } else {
      reportData.value = null
    }
    
    // Force reactivity update
    await nextTick()
  } catch (error) {
    reportData.value = null
  }
}

const printReport = () => {
  window.print()
}

// Watch for corporation changes - clear report data
watch(selectedCorporationId, () => {
  selectedProjectId.value = undefined
  reportData.value = null
})

// Watch for project changes - clear report data
watch(selectedProjectId, () => {
  reportData.value = null
})

// Initialize with selected corporation from store if available
onMounted(async () => {
  try {
    // If there's a selected corporation in the store, use it
    if (corporationStore.selectedCorporationId) {
      selectedCorporationId.value = corporationStore.selectedCorporationId
      await handleCorporationChangeFromSelect({ value: corporationStore.selectedCorporationId })
    }
  } catch (error) {
    // Silently handle error
  }
})
</script>

<style scoped>
@media print {
  .no-print {
    display: none !important;
  }
}
</style>

