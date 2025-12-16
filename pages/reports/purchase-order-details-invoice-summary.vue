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
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Purchase Order Details with Invoice Summary</h1>
        <div v-if="selectedProjectId && getProjectDetails" class="text-sm text-gray-700">
          <p class="font-semibold">Project: {{ getProjectDetails.projectName }} ({{ getProjectDetails.projectId }})</p>
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
          <p class="text-gray-500 text-lg">Please select a corporation to view the report</p>
        </div>
      <div v-else-if="!selectedProjectId" class="text-center py-12">
        <UIcon name="i-heroicons-folder" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">Please select a project to view the purchase order details with invoice summary</p>
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
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-20" />
                </th>
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-24" />
                </th>
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-32" />
                </th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-28 ml-auto" />
                </th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-28 ml-auto" />
                </th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-32 ml-auto" />
                </th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-24 ml-auto" />
                </th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-24 ml-auto" />
                </th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-28 ml-auto" />
                </th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-24 ml-auto" />
                </th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-32 ml-auto" />
                </th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-32 ml-auto" />
                </th>
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-20" />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in 5" :key="i" class="border-b border-gray-200 dark:border-gray-700">
                <td class="py-1 px-2 text-default text-xs">
                  <USkeleton class="h-3 w-20" />
                </td>
                <td class="py-1 px-2 text-default text-xs">
                  <USkeleton class="h-3 w-20" />
                </td>
                <td class="py-1 px-2 text-default text-xs">
                  <USkeleton class="h-3 w-40" />
                </td>
                <td class="py-1 px-2 text-right text-default text-xs">
                  <USkeleton class="h-3 w-20 ml-auto" />
                </td>
                <td class="py-1 px-2 text-right text-default text-xs">
                  <USkeleton class="h-3 w-20 ml-auto" />
                </td>
                <td class="py-1 px-2 text-right text-default text-xs">
                  <USkeleton class="h-3 w-20 ml-auto" />
                </td>
                <td class="py-1 px-2 text-right text-default text-xs">
                  <USkeleton class="h-3 w-20 ml-auto" />
                </td>
                <td class="py-1 px-2 text-right text-default text-xs">
                  <USkeleton class="h-3 w-20 ml-auto" />
                </td>
                <td class="py-1 px-2 text-right text-default text-xs">
                  <USkeleton class="h-3 w-20 ml-auto" />
                </td>
                <td class="py-1 px-2 text-right text-default text-xs">
                  <USkeleton class="h-3 w-20 ml-auto" />
                </td>
                <td class="py-1 px-2 text-right text-default text-xs">
                  <USkeleton class="h-3 w-20 ml-auto" />
                </td>
                <td class="py-1 px-2 text-right text-default text-xs">
                  <USkeleton class="h-3 w-20 ml-auto" />
                </td>
                <td class="py-1 px-2 text-default text-xs">
                  <USkeleton class="h-3 w-16" />
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
      <div v-else-if="reportData && reportData.length > 0" class="space-y-3" :key="`report-${selectedProjectId}`">
        <!-- Report Table -->
        <div class="overflow-x-auto print:overflow-visible">
          <table class="w-full border-collapse text-xs print:text-xs">
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">Submit Date</th>
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">PO/CO Number</th>
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">Vendor / Source</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Goods Amount</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Freight Amount</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Additional Charges</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">HST</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">PO Total</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Total Invoiced</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Holdback</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Total Paid on Invoices</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Balance to be Invoiced*</th>
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">PO Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in reportData"
                :key="row.uuid"
                class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <td class="py-1 px-2 text-default text-xs">{{ formatDate(row.submit_date) }}</td>
                <td class="py-1 px-2 text-default text-xs">{{ row.po_number || row.co_number || '-' }}</td>
                <td class="py-1 px-2 text-default text-xs">{{ row.vendor_name || '-' }}</td>
                <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(row.goods_amount) }}</td>
                <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(row.freight_amount) }}</td>
                <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(row.additional_charges) }}</td>
                <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(row.hst) }}</td>
                <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(row.po_total) }}</td>
                <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(row.total_invoiced) }}</td>
                <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(row.holdback) }}</td>
                <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(row.total_paid) }}</td>
                <td class="py-1 px-2 text-right text-default text-xs">{{ formatCurrency(row.balance_to_invoice) }}</td>
                <td class="py-1 px-2 text-default text-xs">{{ formatStatus(row.status) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else-if="!loading && (!reportData || reportData.length === 0)" class="text-center py-12">
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

const router = useRouter()

// Navigation
const goBack = () => {
  router.back()
}

// Set page title
useHead({
  title: 'Purchase Order Details with Invoice Summary - Property Management'
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
const reportData = ref<any[]>([])
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

// Date formatting
const formatDate = (date: string | null | undefined): string => {
  if (!date) return '-'
  try {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    })
  } catch {
    return '-'
  }
}

// Status formatting
const formatStatus = (status: string | null | undefined): string => {
  if (!status) return '-'
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Get project details for print header
const getProjectDetails = computed(() => {
  if (!selectedProjectId.value) return null
  const project = projectsStore.projects.find(p => p.uuid === selectedProjectId.value)
  return project ? { 
    projectName: project.project_name, 
    projectId: project.project_id || 'N/A' 
  } : null
})

// Handlers
const handleCorporationChangeFromSelect = async (corporation: any) => {
  // Clear project selection when corporation changes
  selectedProjectId.value = undefined
  
  // Fetch projects for the selected corporation
  // ProjectSelect component will also fetch if needed, but we fetch here to ensure data is available
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
    reportData.value = []
  }
}

const handleShowReport = async () => {
  if (!canGenerateReport.value) {
    return
  }
  await loadReport()
}

// Load report data
const loadReport = async () => {
  if (!selectedCorporationId.value || !selectedProjectId.value || !startDateValue.value || !endDateValue.value) {
    reportData.value = []
    return
  }
  
  // Convert dates to UTC strings
  const dateRange = createDateRangeParams(
    `${startDateValue.value.year}-${String(startDateValue.value.month).padStart(2, '0')}-${String(startDateValue.value.day).padStart(2, '0')}`,
    `${endDateValue.value.year}-${String(endDateValue.value.month).padStart(2, '0')}-${String(endDateValue.value.day).padStart(2, '0')}`
  )
  
  if (!dateRange) {
    reportData.value = []
    return
  }
  
  const startUTC = new Date(dateRange.start_date).getTime()
  const endUTC = new Date(dateRange.end_date).getTime()
  
  loading.value = true
  error.value = null
  
  try {
    // Fetch purchase orders
    const poParams: any = {
      corporation_uuid: selectedCorporationId.value
    }
    
    const poResponse: any = await $fetch('/api/purchase-order-forms', {
      method: 'GET',
      params: poParams
    })
    
    const purchaseOrders = poResponse?.data || []
    
    // Filter by project and date range (using entry_date in UTC)
    let filteredPOs = purchaseOrders.filter((po: any) => {
      return po.project_uuid === selectedProjectId.value
    })
    
    // Filter by date range if provided (using entry_date in UTC)
    filteredPOs = filteredPOs.filter((po: any) => {
      if (!po.entry_date) return false
      const poDateUTC = new Date(po.entry_date).getTime()
      return poDateUTC >= startUTC && poDateUTC <= endUTC
    })
    
    // Fetch change orders
    const coParams: any = {
      corporation_uuid: selectedCorporationId.value
    }
    
    let changeOrders: any[] = []
    try {
      const coResponse: any = await $fetch('/api/change-orders', {
        method: 'GET',
        params: coParams
      })
      changeOrders = coResponse?.data || []
    } catch (coError) {
      console.error('Error fetching change orders:', coError)
    }
    
    // Filter change orders by project and date range (using created_date in UTC)
    let filteredCOs = changeOrders.filter((co: any) => {
      return co.project_uuid === selectedProjectId.value
    })
    
    // Filter by date range if provided (using created_date in UTC)
    filteredCOs = filteredCOs.filter((co: any) => {
      if (!co.created_date) return false
      const coDateUTC = new Date(co.created_date).getTime()
      return coDateUTC >= startUTC && coDateUTC <= endUTC
    })
    
    // Fetch vendors once for all purchase orders and change orders
    let vendors: any[] = []
    try {
      const vendorResponse: any = await $fetch('/api/purchase-orders/vendors', {
        method: 'GET',
        params: {
          corporation_uuid: selectedCorporationId.value
        }
      })
      vendors = vendorResponse?.data || []
    } catch (vendorError) {
      console.error('Error fetching vendors:', vendorError)
    }
    
    // Create vendor map for quick lookup
    const vendorMap = new Map(vendors.map((v: any) => [v.uuid, v.vendor_name]))
    
    // Process purchase orders
    const poReportData = await Promise.all(
      filteredPOs.map(async (po: any) => {
        try {
          // Get vendor name
          const vendorName = po.vendor_uuid ? (vendorMap.get(po.vendor_uuid) || 'N/A') : 'N/A'
          
          // Fetch invoices for this PO
          let invoices: any[] = []
          try {
            const invoiceResponse: any = await $fetch('/api/vendor-invoices', {
              method: 'GET',
              params: {
                corporation_uuid: selectedCorporationId.value,
                purchase_order_uuid: po.uuid
              }
            })
            invoices = invoiceResponse?.data || []
          } catch (invoiceError) {
            console.error('Error fetching invoices for PO:', po.uuid, invoiceError)
          }
          
          // Calculate invoice summary
          const totalInvoiced = invoices.reduce((sum, inv) => {
            // Use amount or total_invoice_amount
            const invAmount = inv.total_invoice_amount ?? inv.amount ?? 0
            return sum + (typeof invAmount === 'number' ? invAmount : parseFloat(invAmount) || 0)
          }, 0)
          
          const holdback = invoices.reduce((sum, inv) => {
            const holdbackAmount = inv.holdback_amount ?? 0
            return sum + (typeof holdbackAmount === 'number' ? holdbackAmount : parseFloat(holdbackAmount) || 0)
          }, 0)
          
          const totalPaid = invoices.reduce((sum, inv) => {
            // Only count paid/approved invoices
            const status = String(inv.status || '').toLowerCase()
            if (status === 'paid' || status === 'approved') {
              const paidAmount = inv.payment_amount ?? inv.amount ?? 0
              return sum + (typeof paidAmount === 'number' ? paidAmount : parseFloat(paidAmount) || 0)
            }
            return sum
          }, 0)
          
          // Calculate item_total from items if not available
          let itemTotal = po.item_total
          if (!itemTotal || itemTotal === 0) {
            // Fetch items to calculate item_total
            try {
              const poType = (po.po_type || '').toUpperCase()
              const isLaborPO = poType === 'LABOR'
              
              let items: any[] = []
              if (isLaborPO) {
                const laborItemsResponse: any = await $fetch('/api/labor-purchase-order-items', {
                  method: 'GET',
                  params: {
                    purchase_order_uuid: po.uuid
                  }
                })
                items = laborItemsResponse?.data || []
              } else {
                const itemsResponse: any = await $fetch('/api/purchase-order-items', {
                  method: 'GET',
                  params: {
                    purchase_order_uuid: po.uuid
                  }
                })
                items = itemsResponse?.data || []
              }
              
              // Calculate item_total from items
              if (items.length > 0) {
                itemTotal = items.reduce((sum: number, item: any) => {
                  const itemAmount = item.po_total || item.total || ((item.po_quantity || item.quantity || 0) * (item.po_unit_price || item.unit_price || 0))
                  return sum + (itemAmount || 0)
                }, 0)
              }
            } catch (itemError) {
              console.error('Error fetching items for PO:', po.uuid, itemError)
            }
          }
          
          // Use item_total as goods_amount (this is the total of all items without charges/taxes)
          const goodsAmount = itemTotal || 0
          const freightAmount = po.freight_charges_amount ?? 0
          const additionalCharges = (po.packing_charges_amount ?? 0) + 
                                   (po.custom_duties_charges_amount ?? 0) + 
                                   (po.other_charges_amount ?? 0)
          const hst = (po.sales_tax_1_amount ?? 0) + (po.sales_tax_2_amount || 0)
          const poTotal = goodsAmount + freightAmount + additionalCharges + hst
          
          // Calculate balance to be invoiced
          const balanceToInvoice = poTotal - totalInvoiced
          
          return {
            uuid: po.uuid,
            type: 'PO',
            submit_date: po.submit_date || po.created_at,
            po_number: po.po_number,
            co_number: null,
            vendor_name: vendorName,
            goods_amount: goodsAmount,
            freight_amount: freightAmount,
            additional_charges: additionalCharges,
            hst: hst,
            po_total: poTotal,
            total_invoiced: totalInvoiced,
            holdback: holdback,
            total_paid: totalPaid,
            balance_to_invoice: balanceToInvoice,
            status: po.status
          }
        } catch (error) {
          console.error('Error processing PO:', po.uuid, error)
          return {
            uuid: po.uuid,
            type: 'PO',
            submit_date: po.submit_date || po.created_at,
            po_number: po.po_number,
            co_number: null,
            vendor_name: 'N/A',
            goods_amount: 0,
            freight_amount: 0,
            additional_charges: 0,
            hst: 0,
            po_total: 0,
            total_invoiced: 0,
            holdback: 0,
            total_paid: 0,
            balance_to_invoice: 0,
            status: po.status
          }
        }
      })
    )
    
    // Process change orders
    const coReportData = await Promise.all(
      filteredCOs.map(async (co: any) => {
        try {
          // Get vendor name
          const vendorName = co.vendor_uuid ? (vendorMap.get(co.vendor_uuid) || 'N/A') : 'N/A'
          
          // Fetch invoices for this CO
          let invoices: any[] = []
          try {
            const invoiceResponse: any = await $fetch('/api/vendor-invoices', {
              method: 'GET',
              params: {
                corporation_uuid: selectedCorporationId.value
              }
            })
            // Filter invoices by change_order_uuid client-side
            invoices = (invoiceResponse?.data || []).filter((inv: any) => inv.change_order_uuid === co.uuid)
          } catch (invoiceError) {
            console.error('Error fetching invoices for CO:', co.uuid, invoiceError)
          }
          
          // Calculate invoice summary
          const totalInvoiced = invoices.reduce((sum, inv) => {
            // Use amount or total_invoice_amount
            const invAmount = inv.total_invoice_amount ?? inv.amount ?? 0
            return sum + (typeof invAmount === 'number' ? invAmount : parseFloat(invAmount) || 0)
          }, 0)
          
          const holdback = invoices.reduce((sum, inv) => {
            const holdbackAmount = inv.holdback_amount ?? 0
            return sum + (typeof holdbackAmount === 'number' ? holdbackAmount : parseFloat(holdbackAmount) || 0)
          }, 0)
          
          const totalPaid = invoices.reduce((sum, inv) => {
            // Only count paid/approved invoices
            const status = String(inv.status || '').toLowerCase()
            if (status === 'paid' || status === 'approved') {
              const paidAmount = inv.payment_amount ?? inv.amount ?? 0
              return sum + (typeof paidAmount === 'number' ? paidAmount : parseFloat(paidAmount) || 0)
            }
            return sum
          }, 0)
          
          // Calculate item_total from items if not available
          let itemTotal = co.item_total
          if (!itemTotal || itemTotal === 0) {
            // Fetch items to calculate item_total
            try {
              const coType = (co.co_type || '').toUpperCase()
              const isLaborCO = coType === 'LABOR'
              
              let items: any[] = []
              if (isLaborCO) {
                const laborItemsResponse: any = await $fetch('/api/labor-change-order-items', {
                  method: 'GET',
                  params: {
                    change_order_uuid: co.uuid
                  }
                })
                items = laborItemsResponse?.data || []
              } else {
                const itemsResponse: any = await $fetch('/api/change-order-items', {
                  method: 'GET',
                  params: {
                    change_order_uuid: co.uuid
                  }
                })
                items = itemsResponse?.data || []
              }
              
              // Calculate item_total from items
              if (items.length > 0) {
                itemTotal = items.reduce((sum: number, item: any) => {
                  const itemAmount = item.co_total || item.total || ((item.co_quantity || item.quantity || 0) * (item.co_unit_price || item.unit_price || 0))
                  return sum + (itemAmount || 0)
                }, 0)
              }
            } catch (itemError) {
              console.error('Error fetching items for CO:', co.uuid, itemError)
            }
          }
          
          // Use item_total as goods_amount (this is the total of all items without charges/taxes)
          const goodsAmount = itemTotal || 0
          const freightAmount = co.freight_charges_amount ?? 0
          const additionalCharges = (co.packing_charges_amount ?? 0) + 
                                   (co.custom_duties_charges_amount ?? 0) + 
                                   (co.other_charges_amount ?? 0)
          const hst = (co.sales_tax_1_amount ?? 0) + (co.sales_tax_2_amount || 0)
          const coTotal = goodsAmount + freightAmount + additionalCharges + hst
          
          // Calculate balance to be invoiced
          const balanceToInvoice = coTotal - totalInvoiced
          
          return {
            uuid: co.uuid,
            type: 'CO',
            submit_date: co.created_date || co.created_at,
            po_number: null,
            co_number: co.co_number,
            vendor_name: vendorName,
            goods_amount: goodsAmount,
            freight_amount: freightAmount,
            additional_charges: additionalCharges,
            hst: hst,
            po_total: coTotal,
            total_invoiced: totalInvoiced,
            holdback: holdback,
            total_paid: totalPaid,
            balance_to_invoice: balanceToInvoice,
            status: co.status
          }
        } catch (error) {
          console.error('Error processing CO:', co.uuid, error)
          return {
            uuid: co.uuid,
            type: 'CO',
            submit_date: co.created_date || co.created_at,
            po_number: null,
            co_number: co.co_number,
            vendor_name: 'N/A',
            goods_amount: 0,
            freight_amount: 0,
            additional_charges: 0,
            hst: 0,
            po_total: 0,
            total_invoiced: 0,
            holdback: 0,
            total_paid: 0,
            balance_to_invoice: 0,
            status: co.status
          }
        }
      })
    )
    
    // Combine PO and CO data
    const allReportData = [...poReportData, ...coReportData]
    
    // Sort by submit date (newest first)
    reportData.value = allReportData.sort((a, b) => {
      const dateA = new Date(a.submit_date || 0).getTime()
      const dateB = new Date(b.submit_date || 0).getTime()
      return dateB - dateA
    })
  } catch (err: any) {
    console.error('Error loading report:', err)
    error.value = err.message || 'Failed to load purchase order details with invoice summary'
    reportData.value = []
  } finally {
    loading.value = false
  }
}

const printReport = () => {
  window.print()
}

// Watch for corporation changes - clear report data
watch(selectedCorporationId, () => {
  reportData.value = []
})

// Watch for project changes - clear report data
watch(selectedProjectId, () => {
  reportData.value = []
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
    size: A4 portrait;
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
    padding: 3px 4px !important;
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

