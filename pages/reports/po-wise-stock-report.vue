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
          />
        </div>

        <!-- Right side: Corporation, Project, Vendor Selection, Date Range, Show and Print buttons -->
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

          <!-- Vendor Select -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-default whitespace-nowrap">
              Vendor
            </label>
            <VendorSelect
              v-model="selectedVendorId"
              :corporation-uuid="selectedCorporationId || undefined"
              placeholder="All vendors"
              size="sm"
              class="w-64"
              @update:model-value="handleVendorChange"
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
              v-if="selectedCorporationId && selectedProjectId && reportData && reportData.data && reportData.data.length > 0"
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

    <!-- Print Header - only visible in print -->
    <div class="hidden print:block print:mb-4 print:pb-4 print:border-b print:border-gray-300">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">PO Wise Stock Report</h1>
        <div v-if="selectedCorporationId && selectedProjectId" class="text-sm text-gray-700">
          <p class="font-semibold">Project: {{ getProjectName() }}</p>
          <p v-if="selectedVendorId" class="text-xs text-gray-600 mt-1">
            Vendor: {{ getVendorName() }}
          </p>
          <p v-if="startDateValue && endDateValue" class="text-xs text-gray-600 mt-1">
            Date Range: {{ startDateDisplayText }} to {{ endDateDisplayText }}
          </p>
          <p class="text-xs text-gray-600 mt-1">Generated on: {{ new Date().toLocaleDateString() }}</p>
        </div>
      </div>
    </div>

    <!-- Report Content Area -->
    <div class="p-4 print:p-2">
      <div v-if="!selectedCorporationId" class="text-center py-12">
        <UIcon name="i-heroicons-building-office" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">Please select a corporation to view the PO-wise stock report</p>
      </div>
      <div v-else-if="!selectedProjectId" class="text-center py-12">
        <UIcon name="i-heroicons-folder" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">Please select a project to view the PO-wise stock report</p>
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
                <th v-for="i in 16" :key="i" class="text-left py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-20" />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in 5" :key="i" class="border-b border-gray-200 dark:border-gray-700">
                <td v-for="j in 16" :key="j" class="py-1 px-2 text-default text-xs">
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
      <div v-else-if="reportData && reportData.data && reportData.data.length > 0" class="space-y-6">
        <!-- Report Title -->
        <h1 class="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 print:text-2xl print:text-gray-900">
          PO Wise Stock Report
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
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">PO Number</th>
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">PO Date</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Ordered Quantity</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Received Quantity</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Returned Quantity</th>
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">Invoice Number</th>
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">Invoice Date</th>
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">Status</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Unit Cost</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">UOM</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Total Value</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="po in reportData.data" :key="po.uuid">
                <!-- PO Header -->
                <tr class="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-400 dark:border-gray-600">
                  <td class="py-2 px-2 font-bold text-xs text-default" colspan="16">
                    <div class="flex items-center justify-between">
                      <div>
                        <span class="font-semibold">PO Number:</span> <span class="font-semibold text-primary-600 dark:text-primary-400">{{ po.po_number }}</span>
                        <span class="ml-4 font-semibold">Vendor:</span> <span class="font-semibold text-primary-600 dark:text-primary-400">{{ po.vendor_name || 'N/A' }}</span>
                        <span class="ml-4 font-semibold">Source:</span> <span class="font-semibold text-primary-600 dark:text-primary-400">{{ po.vendor_name || 'N/A' }}</span>
                        <span class="ml-4 font-semibold">PO Date:</span> <span class="font-semibold text-primary-600 dark:text-primary-400">{{ formatDate(po.po_date) }}</span>
                      </div>
                    </div>
                  </td>
                </tr>
                
                <!-- PO Items -->
                <template v-if="po.items && po.items.length > 0">
                  <tr
                    v-for="(item, index) in po.items"
                    :key="index"
                    class="border-b border-gray-200 dark:border-gray-700"
                  >
                    <td class="py-1 px-2 text-default text-xs">{{ item.itemCode }}</td>
                    <td class="py-1 px-2 text-default text-xs">{{ item.itemName }}</td>
                    <td class="py-1 px-2 text-default text-xs">{{ item.description || '-' }}</td>
                    <td class="py-1 px-2 text-default text-xs">{{ item.vendorSource || '-' }}</td>
                    <td class="py-1 px-2 text-default text-xs">{{ item.costCode || '-' }}</td>
                    <td class="py-1 px-2 text-default text-xs">{{ item.poNumber || '-' }}</td>
                    <td class="py-1 px-2 text-default text-xs">{{ formatDate(item.poDate) }}</td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      {{ formatNumber(item.orderedQuantity) }}
                    </td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      {{ formatNumber(item.receivedQuantity) }}
                    </td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      {{ formatNumber(item.returnedQuantity) }}
                    </td>
                    <td class="py-1 px-2 text-default text-xs">{{ item.invoiceNumber || '-' }}</td>
                    <td class="py-1 px-2 text-default text-xs">{{ formatDate(item.invoiceDate) }}</td>
                    <td class="py-1 px-2 text-default text-xs">{{ item.status || '-' }}</td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      {{ formatCurrency(item.unitCost) }}
                    </td>
                    <td class="py-1 px-2 text-right text-default text-xs">{{ item.uom || '-' }}</td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      {{ formatCurrency(item.totalValue) }}
                    </td>
                  </tr>
                </template>
                <tr v-else class="border-b border-gray-200 dark:border-gray-700">
                  <td class="py-2 px-2 text-muted text-xs italic" colspan="16">No items found for this purchase order</td>
                </tr>
                
                <!-- PO Total Row -->
                <tr class="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-400 dark:border-gray-600 font-semibold">
                  <td class="py-2 px-2 text-xs text-default font-bold" colspan="6">
                    Total
                  </td>
                  <td class="py-2 px-2 text-xs text-default"></td>
                  <td class="py-2 px-2 text-right text-xs text-default font-bold">
                    {{ formatNumber(po.totals.orderedQuantity) }}
                  </td>
                  <td class="py-2 px-2 text-right text-xs text-default font-bold">
                    {{ formatNumber(po.totals.receivedQuantity) }}
                  </td>
                  <td class="py-2 px-2 text-right text-xs text-default font-bold">
                    {{ formatNumber(po.totals.returnedQuantity) }}
                  </td>
                  <td class="py-2 px-2 text-xs text-default" colspan="3"></td>
                  <td class="py-2 px-2 text-right text-xs text-default"></td>
                  <td class="py-2 px-2 text-right text-xs text-default"></td>
                  <td class="py-2 px-2 text-right text-xs text-default font-bold">
                    {{ formatCurrency(po.totals.totalValue) }}
                  </td>
                </tr>
                
                <!-- Spacer row between POs -->
                <tr>
                  <td class="py-2" colspan="16"></td>
                </tr>
              </template>
              
              <!-- Grand Total Row -->
              <tr class="bg-gray-200 dark:bg-gray-700 border-b-2 border-gray-500 dark:border-gray-500 font-bold">
                <td class="py-2 px-2 text-xs text-default font-bold" colspan="6">
                  Grand Total
                </td>
                <td class="py-2 px-2 text-xs text-default"></td>
                <td class="py-2 px-2 text-right text-xs text-default font-bold">
                  {{ formatNumber(totals.orderedQuantity) }}
                </td>
                <td class="py-2 px-2 text-right text-xs text-default font-bold">
                  {{ formatNumber(totals.receivedQuantity) }}
                </td>
                <td class="py-2 px-2 text-right text-xs text-default font-bold">
                  {{ formatNumber(totals.returnedQuantity) }}
                </td>
                <td class="py-2 px-2 text-xs text-default" colspan="3"></td>
                <td class="py-2 px-2 text-right text-xs text-default"></td>
                <td class="py-2 px-2 text-right text-xs text-default"></td>
                <td class="py-2 px-2 text-right text-xs text-default font-bold">
                  {{ formatCurrency(totals.totalValue) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else-if="!loading && (!reportData || !reportData.data || reportData.data.length === 0)" class="text-center py-12">
        <UIcon name="i-heroicons-archive-box" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">No purchase order items found for this project</p>
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
import { usePOWiseStockReport } from '@/composables/usePOWiseStockReport'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import { useDateFormat } from '@/composables/useDateFormat'
import { useUTCDateFormat } from '@/composables/useUTCDateFormat'
import ProjectSelect from '@/components/Shared/ProjectSelect.vue'
import CorporationSelect from '@/components/Shared/CorporationSelect.vue'
import VendorSelect from '@/components/Shared/VendorSelect.vue'
import type { POWiseStockReportData } from '@/composables/usePOWiseStockReport'

const router = useRouter()

// Navigation
const goBack = () => {
  router.back()
}

// Set page title
useHead({
  title: 'PO Wise Stock Report - Property Management'
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
const selectedVendorId = ref<string | undefined>(undefined)

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

// PO Wise Stock Report
const poWiseStockReport = usePOWiseStockReport()
const { formatCurrency } = useCurrencyFormat()
const { formatDate: formatDateUtil } = useDateFormat()
const reportData = ref<POWiseStockReportData | null>(null)

// Expose loading and error from composable - unwrap readonly refs
const loading = computed(() => poWiseStockReport.loading.value)
const error = computed(() => poWiseStockReport.error.value)

// Number formatting
const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '0'
  return Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

// Date formatting
const formatDate = (date: string | null | undefined): string => {
  if (!date || date === 'NA') return '-'
  try {
    // Handle both ISO date strings and date-only strings
    const dateObj = date.includes('T') ? new Date(date) : new Date(date + 'T00:00:00')
    return formatDateUtil(dateObj, 'MM-DD-YYYY')
  } catch {
    return '-'
  }
}

// Computed totals
const totals = computed(() => {
  return reportData.value?.totals || {
    orderedQuantity: 0,
    receivedQuantity: 0,
    returnedQuantity: 0,
    totalValue: 0
  }
})

// Get project name for print header
const getProjectName = (): string => {
  if (!selectedProjectId.value) return 'N/A'
  const project = projectsStore.projects.find(p => p.uuid === selectedProjectId.value)
  if (project) {
    return `${project.project_name} (${project.project_id || 'N/A'})`
  }
  return 'N/A'
}

// Get vendor name for print header
const getVendorName = (): string => {
  if (!selectedVendorId.value) return 'N/A'
  // Try to get vendor name from report data first
  if (reportData.value?.data) {
    const po = reportData.value.data.find((p: any) => p.vendor_uuid === selectedVendorId.value)
    if (po?.vendor_name) {
      return po.vendor_name
    }
  }
  // Fallback to 'N/A' if not found
  return 'N/A'
}

// Handlers
const handleCorporationChangeFromSelect = async (corporation: any) => {
  // Clear project and vendor selection when corporation changes
  selectedProjectId.value = undefined
  selectedVendorId.value = undefined
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

const handleVendorChange = (vendorId: string | undefined) => {
  selectedVendorId.value = vendorId
  reportData.value = null
}

const handleShowReport = async () => {
  if (canGenerateReport.value) {
    await loadPOWiseStockReport()
  }
}

// Load report data
const loadPOWiseStockReport = async () => {
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
    
    const data = await poWiseStockReport.generatePOWiseStockReport(selectedCorporationId.value, selectedProjectId.value)
    
    // Set reportData - use reactive assignment
    if (data && data.data && Array.isArray(data.data)) {
      // Filter by date range (po_date) and vendor
      let filteredPOs = data.data.filter((po: any) => {
        // Filter by date range using po_date
        if (po.po_date) {
          const poDateUTC = new Date(po.po_date).getTime()
          if (poDateUTC < startUTC || poDateUTC > endUTC) {
            return false
          }
        } else {
          return false // Exclude POs without po_date
        }
        
        // Filter by vendor if selected
        if (selectedVendorId.value && po.vendor_uuid !== selectedVendorId.value) {
          return false
        }
        
        return true
      })
      
      // Recalculate totals for filtered POs
      const filteredTotals = filteredPOs.reduce((acc: any, po: any) => {
        acc.orderedQuantity += po.totals?.orderedQuantity || 0
        acc.receivedQuantity += po.totals?.receivedQuantity || 0
        acc.returnedQuantity += po.totals?.returnedQuantity || 0
        acc.totalValue += po.totals?.totalValue || 0
        return acc
      }, {
        orderedQuantity: 0,
        receivedQuantity: 0,
        returnedQuantity: 0,
        totalValue: 0
      })
      
      reportData.value = {
        data: filteredPOs.map(po => ({
          ...po,
          items: po.items.map(item => ({ ...item })),
          totals: { ...po.totals }
        })),
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
  selectedVendorId.value = undefined
  reportData.value = null
})

// Watch for project changes - clear report data
watch(selectedProjectId, () => {
  reportData.value = null
})

// Watch for vendor changes - clear report data
watch(selectedVendorId, () => {
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

