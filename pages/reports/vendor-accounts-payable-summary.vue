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
              Period From <span class="text-red-500">*</span>
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
                  :min-value="minDate"
                  :max-value="endDateValue || maxDate"
                  class="p-2"
                />
              </template>
            </UPopover>
          </div>

          <!-- End Date -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-default whitespace-nowrap">
              Period To <span class="text-red-500">*</span>
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
                  :min-value="startDateValue || minDate"
                  :max-value="maxDate"
                  class="p-2"
                />
              </template>
            </UPopover>
          </div>

          <!-- Show button -->
          <UButton
            :disabled="!canGenerateReport"
            icon="i-heroicons-magnifying-glass"
            variant="solid"
            size="sm"
            @click="handleShowReport"
          >
            Show
          </UButton>

          <!-- Print button -->
          <UButton
            v-if="reportData && selectedProjectId"
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

    <!-- Print Header - only visible in print -->
    <div class="hidden print:block print:mb-4 print:pb-4 print:border-b print:border-gray-300">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Vendor Accounts Payable Summary</h1>
        <div v-if="reportData" class="text-sm text-gray-700">
          <p class="font-semibold">Project: {{ reportData.project.projectName }} ({{ reportData.project.projectId }})</p>
          <p v-if="startDateValue && endDateValue" class="text-xs text-gray-600 mt-1">
            Period From: {{ startDateDisplayText }} To {{ endDateDisplayText }}
          </p>
          <p class="text-xs text-gray-600 mt-1">Generated on: {{ new Date().toLocaleDateString() }}</p>
        </div>
      </div>
    </div>

    <!-- Report Content Area -->
    <div class="p-4 print:p-2">
      <div v-if="!selectedCorporationId" class="text-center py-12">
        <UIcon name="i-heroicons-building-office" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">Please select a corporation to view the report</p>
      </div>
      <div v-else-if="!selectedProjectId" class="text-center py-12">
        <UIcon name="i-heroicons-folder" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">Please select a project to view the vendor accounts payable summary</p>
      </div>
      <div v-else-if="!startDateValue || !endDateValue" class="text-center py-12">
        <UIcon name="i-heroicons-calendar" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">Please select start date and end date to generate the report</p>
      </div>
      <div v-else-if="loading" class="space-y-3">
        <!-- Loading skeleton -->
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-xs">
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                <th v-for="i in 10" :key="i" class="text-left py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-24" />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in 5" :key="i" class="border-b border-gray-200 dark:border-gray-700">
                <td v-for="j in 10" :key="j" class="py-2 px-2">
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
      <div v-else-if="reportData && reportData.vendors && reportData.vendors.length > 0" class="space-y-3" :key="`report-${selectedProjectId}`">
        <!-- Project Summary -->
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <!-- Left Section: Project Name and Number -->
          <div class="bg-primary-50 dark:bg-primary-900 border-l-4 border-primary-500 rounded p-2">
            <div class="text-left">
              <h3 class="text-sm font-semibold text-primary-900 dark:text-primary-100">
                Project Name: {{ reportData.project.projectName }}
              </h3>
              <p class="text-xs text-primary-700 dark:text-primary-300">Project Number: {{ reportData.project.projectId }}</p>
            </div>
          </div>
          
          <!-- Center Section: Title -->
          <div class="flex-1 flex justify-center">
            <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Vendor Accounts Payable Summary</h1>
          </div>
          
          <!-- Right Section: Period -->
          <div class="bg-primary-50 dark:bg-primary-900 border-l-4 border-primary-500 rounded p-2 min-w-fit">
            <div class="text-right">
              <p class="text-xs text-primary-600 dark:text-primary-400">Period</p>
              <p class="text-sm font-semibold text-primary-900 dark:text-primary-100">
                {{ startDateDisplayText }} To {{ endDateDisplayText }}
              </p>
            </div>
          </div>
        </div>

        <!-- Report Table -->
        <div class="overflow-x-auto print:overflow-visible">
          <table class="w-full border-collapse text-xs print:text-xs">
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                <th class="text-left py-2 px-2 font-bold text-sm text-default">Vendor</th>
                <th class="text-right py-2 px-2 font-bold text-sm text-default">PO Amount</th>
                <th class="text-right py-2 px-2 font-bold text-sm text-default">Change Orders</th>
                <th class="text-right py-2 px-2 font-bold text-sm text-default">Total Invoice Value</th>
                <th class="text-right py-2 px-2 font-bold text-sm text-default">Billed by Vendor</th>
                <th class="text-right py-2 px-2 font-bold text-sm text-default">Holdback</th>
                <th class="text-right py-2 px-2 font-bold text-sm text-default">Tax</th>
                <th class="text-right py-2 px-2 font-bold text-sm text-default">Balance</th>
                <th class="text-right py-2 px-2 font-bold text-sm text-default">Paid to Date</th>
                <th class="text-right py-2 px-2 font-bold text-sm text-default">AP Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="vendor in reportData.vendors"
                :key="vendor.vendorUuid"
                class="border-b border-gray-200 dark:border-gray-700"
              >
                <td class="py-2 px-2 text-default text-xs">{{ vendor.vendorName }}</td>
                <td class="py-2 px-2 text-right text-default text-xs">{{ formatCurrency(vendor.poAmount) }}</td>
                <td class="py-2 px-2 text-right text-default text-xs">{{ formatCurrency(vendor.changeOrderAmount) }}</td>
                <td class="py-2 px-2 text-right text-default text-xs">{{ formatCurrency(vendor.totalInvoiceValue) }}</td>
                <td class="py-2 px-2 text-right text-default text-xs">{{ formatCurrency(vendor.billedByVendor) }}</td>
                <td class="py-2 px-2 text-right text-default text-xs">{{ formatCurrency(vendor.holdback) }}</td>
                <td class="py-2 px-2 text-right text-default text-xs">{{ formatCurrency(vendor.tax) }}</td>
                <td class="py-2 px-2 text-right text-default text-xs">{{ formatCurrency(vendor.balance) }}</td>
                <td class="py-2 px-2 text-right text-default text-xs">{{ formatCurrency(vendor.paidToDate) }}</td>
                <td class="py-2 px-2 text-right text-default text-xs">{{ formatCurrency(vendor.apBalance) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="bg-gray-200 dark:bg-gray-900/70 border-t-2 border-gray-300 dark:border-gray-700">
                <td class="py-2.5 px-2 text-sm md:text-base font-bold text-left text-gray-900 dark:text-gray-50">
                  Total
                </td>
                <td class="py-2.5 px-2 text-sm md:text-base font-bold text-right text-gray-900 dark:text-gray-50">
                  {{ formatCurrency(reportData.totals.poAmount) }}
                </td>
                <td class="py-2.5 px-2 text-sm md:text-base font-bold text-right text-gray-900 dark:text-gray-50">
                  {{ formatCurrency(reportData.totals.changeOrderAmount) }}
                </td>
                <td class="py-2.5 px-2 text-sm md:text-base font-bold text-right text-gray-900 dark:text-gray-50">
                  {{ formatCurrency(reportData.totals.totalInvoiceValue) }}
                </td>
                <td class="py-2.5 px-2 text-sm md:text-base font-bold text-right text-gray-900 dark:text-gray-50">
                  {{ formatCurrency(reportData.totals.billedByVendor) }}
                </td>
                <td class="py-2.5 px-2 text-sm md:text-base font-bold text-right text-gray-900 dark:text-gray-50">
                  {{ formatCurrency(reportData.totals.holdback) }}
                </td>
                <td class="py-2.5 px-2 text-sm md:text-base font-bold text-right text-gray-900 dark:text-gray-50">
                  {{ formatCurrency(reportData.totals.tax) }}
                </td>
                <td class="py-2.5 px-2 text-sm md:text-base font-bold text-right text-gray-900 dark:text-gray-50">
                  {{ formatCurrency(reportData.totals.balance) }}
                </td>
                <td class="py-2.5 px-2 text-sm md:text-base font-bold text-right text-gray-900 dark:text-gray-50">
                  {{ formatCurrency(reportData.totals.paidToDate) }}
                </td>
                <td class="py-2.5 px-2 text-sm md:text-base font-bold text-right text-gray-900 dark:text-gray-50">
                  {{ formatCurrency(reportData.totals.apBalance) }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div v-else-if="!loading && (!reportData || !reportData.vendors || reportData.vendors.length === 0)" class="text-center py-12">
        <UIcon name="i-heroicons-document-chart-bar" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">No report data available</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { useCorporationStore } from '@/stores/corporations'
import { useProjectsStore } from '@/stores/projects'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import { useUTCDateFormat } from '@/composables/useUTCDateFormat'
import ProjectSelect from '@/components/Shared/ProjectSelect.vue'
import CorporationSelect from '@/components/Shared/CorporationSelect.vue'

interface VendorReportData {
  vendorUuid: string
  vendorName: string
  poAmount: number
  changeOrderAmount: number
  totalInvoiceValue: number
  billedByVendor: number
  holdback: number
  tax: number
  balance: number
  paidToDate: number
  apBalance: number
}

interface ReportData {
  project: {
    projectName: string
    projectId: string
  }
  vendors: VendorReportData[]
  totals: {
    poAmount: number
    changeOrderAmount: number
    totalInvoiceValue: number
    billedByVendor: number
    holdback: number
    tax: number
    balance: number
    paidToDate: number
    apBalance: number
  }
}

const router = useRouter()

// Navigation
const goBack = () => {
  router.back()
}

// Set page title
useHead({
  title: 'Vendor Accounts Payable Summary - Property Management'
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
const reportData = ref<ReportData | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Date range state
const { createDateRangeParams } = useUTCDateFormat()
const currentYear = new Date().getFullYear()
const todayDate = today(getLocalTimeZone())
const startDateValue = ref<CalendarDate | null>(new CalendarDate(currentYear, 1, 1))
const endDateValue = ref<CalendarDate | null>(todayDate)

// Date formatting
const df = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium'
})

const startDateDisplayText = computed(() => {
  if (!startDateValue.value) return 'Select start date'
  return df.format(startDateValue.value.toDate(getLocalTimeZone()))
})

const endDateDisplayText = computed(() => {
  if (!endDateValue.value) return 'Select end date'
  return df.format(endDateValue.value.toDate(getLocalTimeZone()))
})

const minDate = new CalendarDate(1900, 1, 1)
const maxDate = todayDate

// Check if report can be generated
const canGenerateReport = computed(() => {
  return !!(
    selectedCorporationId.value &&
    selectedProjectId.value &&
    startDateValue.value &&
    endDateValue.value &&
    startDateValue.value.compare(endDateValue.value) <= 0
  )
})

// Currency formatting
const { formatCurrency } = useCurrencyFormat()

// Handlers
const handleCorporationChangeFromSelect = async (corporation: any) => {
  // Clear project selection when corporation changes
  selectedProjectId.value = undefined
  
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
  // Clear report data when project changes - user needs to click Show button
  if (!projectId) {
    reportData.value = null
  }
}

const handleShowReport = async () => {
  if (!canGenerateReport.value) {
    return
  }
  await loadReport()
}

const loadReport = async () => {
  if (!selectedCorporationId.value || !selectedProjectId.value || !startDateValue.value || !endDateValue.value) {
    reportData.value = null
    return
  }
  
  loading.value = true
  error.value = null
  
  // Convert dates to UTC strings
  const dateRange = createDateRangeParams(
    `${startDateValue.value.year}-${String(startDateValue.value.month).padStart(2, '0')}-${String(startDateValue.value.day).padStart(2, '0')}`,
    `${endDateValue.value.year}-${String(endDateValue.value.month).padStart(2, '0')}-${String(endDateValue.value.day).padStart(2, '0')}`
  )
  
  if (!dateRange) {
    reportData.value = null
    loading.value = false
    return
  }
  
  try {
    const response = await $fetch<ReportData>('/api/reports/vendor-accounts-payable-summary', {
      method: 'GET',
      params: {
        corporation_uuid: selectedCorporationId.value,
        project_uuid: selectedProjectId.value,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date
      }
    })
    
    reportData.value = response
  } catch (err: any) {
    error.value = err.message || 'Failed to load report'
    reportData.value = null
  } finally {
    loading.value = false
  }
}

const printReport = () => {
  window.print()
}

// Watch for corporation changes - clear report data
watch(selectedCorporationId, () => {
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

<style>
/* Print optimizations - Hide layout and UI elements, show only report */
@media print {
  /* Reset page margins and background */
  @page {
    margin: 1cm;
    size: A4 landscape;
  }

  html, body {
    background: #ffffff !important;
    color: #000000 !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* Hide layout components (SideMenu, TopBar, MobileBottomNav) */
  nav,
  aside,
  header:not(.print-header),
  [class*="SideMenu"],
  [class*="TopBar"],
  [class*="MobileBottomNav"],
  [class*="side-menu"],
  [class*="top-bar"],
  [class*="mobile-bottom-nav"],
  /* Target layout structure */
  .flex.h-screen > aside,
  .flex.h-screen > div:first-child,
  .flex.h-screen > div:last-child {
    display: none !important;
  }

  /* Hide main layout wrapper elements but keep content */
  main {
    padding: 0 !important;
    margin: 0 !important;
    background: #ffffff !important;
    border-radius: 0 !important;
  }

  /* Hide the outer layout flex container's background */
  .flex.h-screen {
    background: #ffffff !important;
  }

  /* Hide non-essential UI elements in the report page */
  button,
  [class*="print:hidden"],
  .mb-2.print\\:hidden {
    display: none !important;
  }

  /* Show print-only elements */
  [class*="print:block"],
  .hidden.print\\:block {
    display: block !important;
  }

  /* Hide empty state messages */
  .text-center:has(UIcon),
  [class*="text-center"]:has(svg) {
    display: none !important;
  }

  /* Ensure all text is black for printing */
  * {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  /* Keep borders and backgrounds for tables */
  table {
    border-collapse: collapse !important;
    width: 100% !important;
    font-size: 9px !important;
    page-break-inside: auto;
  }

  th, td {
    border: 1px solid #000000 !important;
    padding: 4px 6px !important;
    background: #ffffff !important;
    color: #000000 !important;
  }

  /* Table header styling */
  thead th {
    background: #f0f0f0 !important;
    font-weight: bold !important;
    border: 1px solid #000000 !important;
    color: #000000 !important;
  }

  /* Footer total row */
  tfoot tr th,
  tfoot tr td {
    background: #d0d0d0 !important;
    font-weight: bold !important;
    color: #000000 !important;
  }

  /* Project summary boxes */
  [class*="bg-primary-50"] {
    background: #e5e5e5 !important;
    border: 1px solid #000000 !important;
    color: #000000 !important;
  }

  /* Prevent page breaks inside table rows */
  tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Optimize spacing for print */
  [class*="print:p-2"] {
    padding: 0.5rem !important;
  }

  [class*="print:mb-4"] {
    margin-bottom: 1rem !important;
  }

  [class*="print:pb-4"] {
    padding-bottom: 1rem !important;
  }

  [class*="print:border-b"] {
    border-bottom: 1px solid #000000 !important;
  }

  /* Ensure text is readable and black */
  .text-xs,
  .text-sm,
  .text-lg,
  .text-xl,
  .text-2xl,
  p,
  span,
  div,
  h1,
  h2,
  h3 {
    color: #000000 !important;
  }

  /* Hide scrollbars and overflow */
  [class*="overflow"] {
    overflow: visible !important;
  }

  /* Ensure full width */
  [class*="w-full"] {
    width: 100% !important;
  }

  /* Print header styling */
  [class*="print:text-2xl"] {
    font-size: 18px !important;
    color: #000000 !important;
  }

  [class*="print:text-sm"] {
    font-size: 11px !important;
    color: #000000 !important;
  }

  [class*="print:text-xs"] {
    font-size: 9px !important;
    color: #000000 !important;
  }

  /* Ensure all dark mode styles are overridden */
  [class*="dark:"] {
    color: #000000 !important;
    background: transparent !important;
  }

  /* Hide icons and SVG elements */
  svg,
  [class*="icon"],
  UIcon,
  [class*="UIcon"] {
    display: none !important;
  }

  /* Hide skeleton loaders */
  [class*="Skeleton"],
  [class*="skeleton"] {
    display: none !important;
  }

  /* Ensure proper spacing */
  .space-y-3 > * + * {
    margin-top: 0.75rem !important;
  }

  /* Hide loading states */
  [class*="loading"],
  [v-if*="loading"] {
    display: none !important;
  }
}
</style>

