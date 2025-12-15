<template>
  <div class="h-[88vh] print:h-auto">
    <!-- Header section - hidden in print -->
    <div class="mb-2 print:hidden">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <!-- Left side: Back button and heading -->
        <div class="flex items-center gap-3">
          <UButton
            color="neutral"
            variant="solid"
            icon="i-heroicons-arrow-left"
            @click="goBack"
          >
            Back
          </UButton>
          <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Purchase Order Breakout</h1>
        </div>

        <!-- Right side: Corporation and Project Selection, Print button -->
        <div class="flex items-center gap-3 flex-wrap">
          <!-- Corporation Select -->
          <div class="flex items-center gap-2">
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
          <div class="flex items-center gap-2">
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

          <!-- Print button -->
          <UButton
            v-if="selectedCorporationId && selectedProjectId && reportData && reportData.length > 0"
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
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Purchase Order Breakout Report</h1>
        <div v-if="selectedCorporationId && selectedProjectId" class="text-sm text-gray-700">
          <p class="font-semibold">Project: {{ getProjectName() }}</p>
          <p class="text-xs text-gray-600 mt-1">Generated on: {{ new Date().toLocaleDateString() }}</p>
        </div>
      </div>
    </div>

    <!-- Report Content Area -->
    <div class="p-4 print:p-2">
      <div v-if="!selectedCorporationId" class="text-center py-12">
        <UIcon name="i-heroicons-building-office" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">Please select a corporation to view the purchase order breakout report</p>
      </div>
      <div v-else-if="!selectedProjectId" class="text-center py-12">
        <UIcon name="i-heroicons-folder" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">Please select a project to view the purchase order breakout report</p>
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
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-28 ml-auto" />
                </th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-32 ml-auto" />
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
                  <USkeleton class="h-3 w-20 ml-auto" />
                </th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-28 ml-auto" />
                </th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-24 ml-auto" />
                </th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-20 ml-auto" />
                </th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">
                  <USkeleton class="h-3 w-28 ml-auto" />
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-for="i in 2" :key="i">
                <!-- PO Header Skeleton -->
                <tr class="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-400 dark:border-gray-600">
                  <td class="py-2 px-2" colspan="12">
                    <USkeleton class="h-4 w-96" />
                  </td>
                </tr>
                
                <!-- Item Rows Skeleton -->
                <template v-for="j in 3" :key="j">
                  <tr class="border-b border-gray-200 dark:border-gray-700">
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
                    <td class="py-1 px-2 text-right text-default text-xs">
                      <USkeleton class="h-3 w-20 ml-auto" />
                    </td>
                  </tr>
                </template>
                
                <!-- PO Total Row Skeleton -->
                <tr class="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-400 dark:border-gray-600 font-semibold">
                  <td class="py-2 px-2 text-xs text-default" colspan="4">
                    <USkeleton class="h-3 w-16" />
                  </td>
                  <td class="py-2 px-2 text-right text-xs text-default">
                    <USkeleton class="h-3 w-20 ml-auto" />
                  </td>
                  <td class="py-2 px-2 text-right text-xs text-default">
                    <USkeleton class="h-3 w-20 ml-auto" />
                  </td>
                  <td class="py-2 px-2 text-right text-xs text-default">
                    <USkeleton class="h-3 w-20 ml-auto" />
                  </td>
                  <td class="py-2 px-2 text-right text-xs text-default">
                    <USkeleton class="h-3 w-20 ml-auto" />
                  </td>
                  <td class="py-2 px-2 text-right text-xs text-default">
                    <USkeleton class="h-3 w-20 ml-auto" />
                  </td>
                  <td class="py-2 px-2 text-right text-xs text-default">
                    <USkeleton class="h-3 w-20 ml-auto" />
                  </td>
                  <td class="py-2 px-2 text-right text-xs text-default">
                    <USkeleton class="h-3 w-20 ml-auto" />
                  </td>
                  <td class="py-2 px-2 text-right text-xs text-default">
                    <USkeleton class="h-3 w-20 ml-auto" />
                  </td>
                </tr>
                
                <!-- Spacer row between POs -->
                <tr>
                  <td class="py-2" colspan="12"></td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else-if="error && error !== null && error !== ''" class="text-center py-12">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-16 h-16 mx-auto text-red-400 mb-4" />
        <p class="text-red-500 text-lg">{{ error }}</p>
      </div>
      <div v-else-if="reportData && reportData.length > 0" class="space-y-6">
        <!-- Report Table -->
        <div class="overflow-x-auto print:overflow-visible">
          <table class="w-full border-collapse text-xs print:text-xs">
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">Item Number</th>
                <th class="text-left py-2 px-2 font-semibold text-xs text-default">Item Description</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Item Quantity</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Item Unit Cost</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Goods Amount</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Freight Amount</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Packing Amount</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Customs & Duties</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Other Amount</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Other/Overage</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">HST</th>
                <th class="text-right py-2 px-2 font-semibold text-xs text-default">Expected Costs</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="po in reportData" :key="po.uuid">
                <!-- PO Header -->
                <tr class="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-400 dark:border-gray-600">
                  <td class="py-2 px-2 font-bold text-xs text-default" colspan="12">
                    <div class="flex items-center justify-between">
                      <div>
                        <span class="font-semibold">PO Number:</span> <span class="font-semibold text-primary-600 dark:text-primary-400">{{ po.po_number }}</span>
                        <span class="ml-4 font-semibold">Vendor:</span> <span class="font-semibold text-primary-600 dark:text-primary-400">{{ po.vendor_name || 'N/A' }}</span>
                        <span class="ml-4 font-semibold">Source:</span> <span class="font-semibold text-primary-600 dark:text-primary-400">{{ po.vendor_name || 'N/A' }}</span>
                      </div>
                    </div>
                  </td>
                </tr>
                
                <!-- PO Items -->
                <template v-if="po.items && po.items.length > 0">
                  <tr
                    v-for="item in po.items"
                    :key="item.uuid || item.id"
                    class="border-b border-gray-200 dark:border-gray-700"
                  >
                    <td class="py-1 px-2 text-default text-xs">{{ item.item_name || item.model_number || '-' }}</td>
                    <td class="py-1 px-2 text-default text-xs">{{ item.description || '-' }}</td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      {{ formatNumber(item.po_quantity || item.quantity) }} {{ item.uom || '' }}
                    </td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      {{ formatCurrency(item.po_unit_price || item.unit_price) }}
                    </td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      {{ formatCurrency(item.po_total || item.total || (item.po_quantity || item.quantity) * (item.po_unit_price || item.unit_price || 0)) }}
                    </td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      {{ formatCurrency(getItemFreightAmount(item, po)) }}
                    </td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      {{ formatCurrency(getItemPackingAmount(item, po)) }}
                    </td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      {{ formatCurrency(getItemCustomsAmount(item, po)) }}
                    </td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      {{ formatCurrency(getItemOtherAmount(item, po)) }}
                    </td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      {{ formatCurrency(0) }}
                    </td>
                    <td class="py-1 px-2 text-right text-default text-xs">
                      {{ formatCurrency(getItemHSTAmount(item, po)) }}
                    </td>
                    <td class="py-1 px-2 text-right text-default text-xs font-semibold">
                      {{ formatCurrency(getItemExpectedCost(item, po)) }}
                    </td>
                  </tr>
                </template>
                <tr v-else class="border-b border-gray-200 dark:border-gray-700">
                  <td class="py-2 px-2 text-muted text-xs italic" colspan="12">No items found for this purchase order</td>
                </tr>
                
                <!-- PO Total Row -->
                <tr class="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-400 dark:border-gray-600 font-semibold">
                  <td class="py-2 px-2 text-xs text-default" colspan="4">
                    Total
                  </td>
                  <td class="py-2 px-2 text-right text-xs text-default">
                    {{ formatCurrency(po.item_total || 0) }}
                  </td>
                  <td class="py-2 px-2 text-right text-xs text-default">
                    {{ formatCurrency(po.freight_charges_amount || 0) }}
                  </td>
                  <td class="py-2 px-2 text-right text-xs text-default">
                    {{ formatCurrency(po.packing_charges_amount || 0) }}
                  </td>
                  <td class="py-2 px-2 text-right text-xs text-default">
                    {{ formatCurrency(po.custom_duties_amount || 0) }}
                  </td>
                  <td class="py-2 px-2 text-right text-xs text-default">
                    {{ formatCurrency(po.other_charges_amount || 0) }}
                  </td>
                  <td class="py-2 px-2 text-right text-xs text-default">
                    {{ formatCurrency(0) }}
                  </td>
                  <td class="py-2 px-2 text-right text-xs text-default">
                    {{ formatCurrency((po.sales_tax_1_amount || 0) + (po.sales_tax_2_amount || 0)) }}
                  </td>
                  <td class="py-2 px-2 text-right text-xs text-default font-bold">
                    {{ formatCurrency(getTotalExpectedCosts(po)) }}
                  </td>
                </tr>
                
                <!-- Spacer row between POs -->
                <tr>
                  <td class="py-2" colspan="12"></td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else-if="!loading && (!reportData || reportData.length === 0)" class="text-center py-12">
        <UIcon name="i-heroicons-document-text" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p class="text-gray-500 text-lg">No purchase orders found</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useCorporationStore } from '@/stores/corporations'
import { useProjectsStore } from '@/stores/projects'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import ProjectSelect from '@/components/Shared/ProjectSelect.vue'
import CorporationSelect from '@/components/Shared/CorporationSelect.vue'

const router = useRouter()

// Navigation
const goBack = () => {
  router.back()
}

// Set page title
useHead({
  title: 'Purchase Order Breakout - Property Management'
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

// Currency formatting
const { formatCurrency } = useCurrencyFormat()

// Number formatting
const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '0'
  return Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

// Get project name for print header
const getProjectName = (): string => {
  if (!selectedProjectId.value) return 'N/A'
  const project = projectsStore.projects.find(p => p.uuid === selectedProjectId.value)
  if (project) {
    return `${project.project_name} (${project.project_id || 'N/A'})`
  }
  return 'N/A'
}

// Calculate item-level amounts (distributed proportionally)
const getItemGoodsAmount = (item: any): number => {
  return item.po_total || item.total || ((item.po_quantity || item.quantity || 0) * (item.po_unit_price || item.unit_price || 0))
}

const getItemFreightAmount = (item: any, po: any): number => {
  if (!po.freight_charges_amount || po.freight_charges_amount === 0) return 0
  if (!po.item_total || po.item_total === 0) return 0
  const itemAmount = getItemGoodsAmount(item)
  return (itemAmount / po.item_total) * po.freight_charges_amount
}

const getItemPackingAmount = (item: any, po: any): number => {
  if (!po.packing_charges_amount || po.packing_charges_amount === 0) return 0
  if (!po.item_total || po.item_total === 0) return 0
  const itemAmount = getItemGoodsAmount(item)
  return (itemAmount / po.item_total) * po.packing_charges_amount
}

const getItemCustomsAmount = (item: any, po: any): number => {
  if (!po.custom_duties_amount || po.custom_duties_amount === 0) return 0
  if (!po.item_total || po.item_total === 0) return 0
  const itemAmount = getItemGoodsAmount(item)
  return (itemAmount / po.item_total) * po.custom_duties_amount
}

const getItemOtherAmount = (item: any, po: any): number => {
  if (!po.other_charges_amount || po.other_charges_amount === 0) return 0
  if (!po.item_total || po.item_total === 0) return 0
  const itemAmount = getItemGoodsAmount(item)
  return (itemAmount / po.item_total) * po.other_charges_amount
}

const getItemHSTAmount = (item: any, po: any): number => {
  // Calculate total taxes as sum of all sales taxes
  const totalTaxes = (po.sales_tax_1_amount || 0) + (po.sales_tax_2_amount || 0)
  if (!totalTaxes || totalTaxes === 0) return 0
  if (!po.item_total || po.item_total === 0) return 0
  const itemAmount = getItemGoodsAmount(item)
  return (itemAmount / po.item_total) * totalTaxes
}

const getItemExpectedCost = (item: any, po: any): number => {
  const goodsAmount = getItemGoodsAmount(item)
  const freightAmount = getItemFreightAmount(item, po)
  const packingAmount = getItemPackingAmount(item, po)
  const customsAmount = getItemCustomsAmount(item, po)
  const otherAmount = getItemOtherAmount(item, po)
  const hstAmount = getItemHSTAmount(item, po)
  return goodsAmount + freightAmount + packingAmount + customsAmount + otherAmount + hstAmount
}

const getTotalExpectedCosts = (po: any): number => {
  if (!po.items || po.items.length === 0) return 0
  return po.items.reduce((sum: number, item: any) => {
    return sum + getItemExpectedCost(item, po)
  }, 0)
}

// Handlers
const handleCorporationChangeFromSelect = async (corporation: any) => {
  // Clear project selection and report data when corporation changes
  selectedProjectId.value = undefined
  reportData.value = []
  
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
  if (selectedCorporationId.value) {
    await loadReport()
  } else {
    reportData.value = []
  }
}

// Load report data
const loadReport = async () => {
  if (!selectedCorporationId.value || !selectedProjectId.value) {
    reportData.value = []
    return
  }
  
  loading.value = true
  error.value = null
  
  try {
    // Fetch purchase orders
    const params: any = {
      corporation_uuid: selectedCorporationId.value
    }
    
    if (selectedProjectId.value) {
      // Note: The API might need project_uuid filter, but let's fetch all and filter client-side for now
    }
    
    const response: any = await $fetch('/api/purchase-order-forms', {
      method: 'GET',
      params
    })
    
    const purchaseOrders = response?.data || []
    
    // Filter by status (Approved, Partially_Received, or Completed) and project (required)
    const filteredPOs = purchaseOrders
      .filter((po: any) => {
        const status = String(po.status || '').toLowerCase()
        return status === 'approved' || status === 'partially_received' || status === 'completed'
      })
      .filter((po: any) => po.project_uuid === selectedProjectId.value)
    
    // Fetch vendors once for all purchase orders
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
    
    // Fetch items for each purchase order
    const reportDataWithItems = await Promise.all(
      filteredPOs.map(async (po: any) => {
        try {
          // Determine PO type
          const poType = (po.po_type || '').toUpperCase()
          const isLaborPO = poType === 'LABOR'
          
          // Fetch items based on PO type
          let items: any[] = []
          if (isLaborPO) {
            try {
              const laborItemsResponse: any = await $fetch('/api/labor-purchase-order-items', {
                method: 'GET',
                params: {
                  purchase_order_uuid: po.uuid
                }
              })
              items = laborItemsResponse?.data || []
            } catch (laborError) {
              console.error('Error fetching labor items for PO:', po.uuid, laborError)
            }
          } else {
            try {
              const itemsResponse: any = await $fetch('/api/purchase-order-items', {
                method: 'GET',
                params: {
                  purchase_order_uuid: po.uuid
                }
              })
              items = itemsResponse?.data || []
            } catch (itemError) {
              console.error('Error fetching items for PO:', po.uuid, itemError)
            }
          }
          
          // Get vendor name from map
          const vendorName = po.vendor_uuid ? (vendorMap.get(po.vendor_uuid) || 'N/A') : 'N/A'
          
          // Calculate item_total from items if not present
          let itemTotal = po.item_total
          if (!itemTotal && items.length > 0) {
            itemTotal = items.reduce((sum: number, item: any) => {
              const itemAmount = item.po_total || item.total || ((item.po_quantity || item.quantity || 0) * (item.po_unit_price || item.unit_price || 0))
              return sum + (itemAmount || 0)
            }, 0)
          }
          
          return {
            ...po,
            items,
            vendor_name: vendorName,
            item_total: itemTotal || 0
          }
        } catch (error) {
          console.error('Error processing PO:', po.uuid, error)
          return {
            ...po,
            items: [],
            vendor_name: 'N/A'
          }
        }
      })
    )
    
    reportData.value = reportDataWithItems
    await nextTick()
  } catch (err: any) {
    console.error('Error loading report:', err)
    error.value = err.message || 'Failed to load purchase order breakout report'
    reportData.value = []
  } finally {
    loading.value = false
  }
}

const printReport = () => {
  window.print()
}

// Watch for corporation changes
watch(selectedCorporationId, async () => {
  // Clear project selection when corporation changes
  selectedProjectId.value = undefined
  reportData.value = []
})

// Watch for project changes
watch(selectedProjectId, async () => {
  if (selectedCorporationId.value && selectedProjectId.value) {
    await loadReport()
  } else {
    reportData.value = []
  }
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

  /* PO header rows */
  tbody tr[class*="bg-gray-50"] th,
  tbody tr[class*="bg-gray-50"] td {
    background: #e5e5e5 !important;
    font-weight: bold !important;
    color: #000000 !important;
  }

  /* PO total rows */
  tbody tr[class*="bg-gray-100"] th,
  tbody tr[class*="bg-gray-100"] td {
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

  /* Allow page breaks between POs */
  tbody tr[class*="bg-gray-50"] {
    page-break-after: auto;
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
  .space-y-3 > * + *,
  .space-y-6 > * + * {
    margin-top: 0.75rem !important;
  }

  /* Hide loading states */
  [class*="loading"],
  [v-if*="loading"] {
    display: none !important;
  }
}
</style>

