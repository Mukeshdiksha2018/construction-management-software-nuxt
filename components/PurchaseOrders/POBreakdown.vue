<template>
  <div class="px-2 py-2 bg-gray-50 dark:bg-gray-900/50">
    <div v-if="loading" class="flex items-center justify-center py-4">
      <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin text-primary" />
      <span class="ml-2 text-[10px] text-gray-600 dark:text-gray-400">Loading items...</span>
    </div>
    
    <div v-else-if="error" class="text-center py-2">
      <p class="text-[10px] text-red-600 dark:text-red-400">{{ error }}</p>
    </div>
    
    <div v-else-if="!items || items.length === 0" class="text-center py-2">
      <p class="text-[10px] text-gray-500 dark:text-gray-400">No items found</p>
    </div>
    
    <div v-else class="w-full">
      <table class="w-full border-collapse text-xs table-fixed" style="table-layout: fixed;">
        <colgroup>
          <col style="width: 7%;">
          <col style="width: 6%;">
          <col style="width: 10%;">
          <col style="width: 7%;">
          <col style="width: 7%;">
          <col style="width: 7%;">
          <col style="width: 8%;">
          <col style="width: 8%;">
          <col style="width: 8%;">
          <col style="width: 8%;">
          <col style="width: 8%;">
          <col style="width: 7%;">
          <col style="width: 8%;">
        </colgroup>
        <thead>
          <tr class="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
            <th class="px-1.5 py-1 text-left font-bold text-xs text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-700">Sequence</th>
            <th class="px-1.5 py-1 text-left font-bold text-xs text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-700">Type</th>
            <th class="px-1.5 py-1 text-left font-bold text-xs text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-700">Item</th>
            <th class="px-1.5 py-1 text-left font-bold text-xs text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-700">Location</th>
            <th class="px-1.5 py-1 text-right font-bold text-xs text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-700">Quantity</th>
            <th class="px-1.5 py-1 text-right font-bold text-xs text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-700">Unit Cost</th>
            <th class="px-1.5 py-1 text-right font-bold text-xs text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-700">Goods Amount</th>
            <th class="px-1.5 py-1 text-right font-bold text-xs text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-700">Freight</th>
            <th class="px-1.5 py-1 text-right font-bold text-xs text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-700">Packaging</th>
            <th class="px-1.5 py-1 text-right font-bold text-xs text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-700">Customs & Duties</th>
            <th class="px-1.5 py-1 text-right font-bold text-xs text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-700">Other Amount</th>
            <th class="px-1.5 py-1 text-right font-bold text-xs text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-gray-700">Taxes</th>
            <th class="px-1.5 py-1 text-right font-bold text-xs text-gray-900 dark:text-gray-100">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in items"
            :key="item.uuid || item.id || index"
            class="border-b border-gray-200 dark:border-gray-700"
          >
            <td class="px-1.5 py-1 text-left text-gray-700 dark:text-gray-300 truncate border-r border-gray-200 dark:border-gray-700">
              {{ getSequence(item) }}
            </td>
            <td class="px-1.5 py-1 text-left text-gray-700 dark:text-gray-300 truncate border-r border-gray-200 dark:border-gray-700">
              {{ getItemType(item) }}
            </td>
            <td class="px-1.5 py-1 text-left text-gray-700 dark:text-gray-300 truncate border-r border-gray-200 dark:border-gray-700">
              {{ getItemName(item) }}
            </td>
            <td class="px-1.5 py-1 text-left text-gray-700 dark:text-gray-300 truncate border-r border-gray-200 dark:border-gray-700">
              {{ item.location || item.location_label || item.location_uuid || '' }}
            </td>
            <td class="px-1.5 py-1 text-right text-gray-700 dark:text-gray-300 truncate border-r border-gray-200 dark:border-gray-700">
              {{ formatQuantity(item.po_quantity || item.quantity || 0) }}
            </td>
            <td class="px-1.5 py-1 text-right text-gray-700 dark:text-gray-300 font-mono truncate border-r border-gray-200 dark:border-gray-700">
              {{ formatCurrencyCompact(item.po_unit_price || item.unit_price || 0) }}
            </td>
            <td class="px-1.5 py-1 text-right text-gray-700 dark:text-gray-300 font-mono truncate border-r border-gray-200 dark:border-gray-700">
              {{ formatCurrencyCompact(item.po_total || item.total || getGoodsAmount(item)) }}
            </td>
            <td 
              v-if="index === 0"
              :rowspan="items.length"
              class="px-1.5 py-1 text-center text-gray-700 dark:text-gray-300 font-mono align-middle border-r border-gray-200 dark:border-gray-700"
              style="vertical-align: middle;"
            >
              {{ formatCurrencyCompact(totalFreightAmount, true) }}
            </td>
            <td 
              v-if="index === 0"
              :rowspan="items.length"
              class="px-1.5 py-1 text-center text-gray-700 dark:text-gray-300 font-mono align-middle border-r border-gray-200 dark:border-gray-700"
              style="vertical-align: middle;"
            >
              {{ formatCurrencyCompact(totalPackingAmount, true) }}
            </td>
            <td 
              v-if="index === 0"
              :rowspan="items.length"
              class="px-1.5 py-1 text-center text-gray-700 dark:text-gray-300 font-mono align-middle border-r border-gray-200 dark:border-gray-700"
              style="vertical-align: middle;"
            >
              {{ formatCurrencyCompact(totalCustomsAmount, true) }}
            </td>
            <td 
              v-if="index === 0"
              :rowspan="items.length"
              class="px-1.5 py-1 text-center text-gray-700 dark:text-gray-300 font-mono align-middle border-r border-gray-200 dark:border-gray-700"
              style="vertical-align: middle;"
            >
              {{ formatCurrencyCompact(totalOtherAmount, true) }}
            </td>
            <td 
              v-if="index === 0"
              :rowspan="items.length"
              class="px-1.5 py-1 text-center text-gray-700 dark:text-gray-300 font-mono align-middle border-r border-gray-200 dark:border-gray-700"
              style="vertical-align: middle;"
            >
              {{ formatCurrencyCompact(totalTaxesAmount, true) }}
            </td>
            <td 
              v-if="index === 0"
              :rowspan="items.length"
              class="px-1.5 py-1 text-right text-gray-700 dark:text-gray-300 font-mono font-semibold align-middle"
              style="vertical-align: middle;"
            >
              {{ formatCurrencyCompact(totalAmount, true) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { usePurchaseOrderResourcesStore } from '@/stores/purchaseOrderResources'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'

interface Props {
  poUuid: string
  poData?: any
}

const props = defineProps<Props>()

const purchaseOrderResourcesStore = usePurchaseOrderResourcesStore()
const { formatCurrency } = useCurrencyFormat()

const items = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const formatQuantity = (qty: number) => {
  if (typeof qty !== 'number' || isNaN(qty)) return '0'
  return qty.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const formatCurrencyCompact = (amount: number, showEmpty: boolean = false) => {
  if (amount === 0 && !showEmpty) return ''
  const formatted = formatCurrency(amount)
  // Ensure format matches "$ X.XX" with space after dollar sign
  // Intl.NumberFormat typically returns "$16.54", we need "$ 16.54"
  if (formatted.startsWith('$') && !formatted.startsWith('$ ')) {
    return formatted.replace('$', '$ ')
  }
  return formatted
}

const getItemType = (item: any) => {
  // Check metadata first (preserves original data), then item fields
  // Skip empty/corrupted values
  const metadata = item?.metadata || item?.display_metadata || {}

  const candidates = [
    metadata?.item_type_label,
    item?.display_metadata?.item_type_label,
    item?.item_type_label,
    item?.item_type,
    item?.type
  ].filter(candidate => candidate && candidate.trim() !== '' && candidate !== '—')

  return candidates[0] || '—'
}

const getSequence = (item: any) => {
  // The API returns raw database data with metadata as JSONB
  // Check metadata first (from JSONB field), then item fields
  const metadata = item?.metadata || item?.display_metadata || {}
  
  // Priority: metadata.sequence > item.sequence > item.item_sequence > item.sequence_uuid
  const sequence = metadata?.sequence || 
                   item?.sequence || 
                   item?.item_sequence || 
                   item?.sequence_uuid || 
                   ''
  
  return sequence || '—'
}

const getItemName = (item: any) => {
  // The API returns raw database data - item_name is a direct column in purchase_order_items_list table
  // Priority: item.item_name (direct database field) > metadata.item_name (from JSONB - preserves original data) > item.name (if sequence exists)
  // But skip corrupted values (when the value equals the description - this indicates corruption from completed POs)
  const metadata = item?.metadata || item?.display_metadata || {}

  // First check the direct database field (item_name) - this is the primary source
  let itemName = ''
  if (item?.item_name && item.item_name !== item?.description) {
    itemName = item.item_name
  }

  // If direct field is corrupted or missing, check metadata (JSONB field) - this preserves original data
  if (!itemName && metadata?.item_name && metadata.item_name !== item?.description) {
    itemName = metadata.item_name
  }

  // If we have sequence but still no item_name, try item.name (preferred items may use 'name' field)
  if (!itemName) {
    const hasSequence = getSequence(item) && getSequence(item) !== '—'
    if (hasSequence) {
      itemName = item?.name || ''
    }
  }

  // Return the item name
  return itemName || '—'
}

const getGoodsAmount = (item: any) => {
  const qty = item.po_quantity || item.quantity || 0
  const price = item.po_unit_price || item.unit_price || 0
  return qty * price
}

const getFreightAmount = (item: any) => {
  // If item has freight amount stored, use it
  if (item.freight_amount != null) {
    return parseFloat(item.freight_amount) || 0
  }
  
  // Calculate freight amount based on PO's freight charges
  if (!props.poData) return 0
  
  const freightPercentage = parseFloat(props.poData.freight_charges_percentage || 0)
  const freightAmount = parseFloat(props.poData.freight_charges_amount || 0)
  const goodsAmount = getGoodsAmount(item)
  const totalGoods = items.value.length > 0 
    ? items.value.reduce((sum, i) => sum + getGoodsAmount(i), 0)
    : goodsAmount
  
  if (totalGoods === 0) return 0
  
  if (freightPercentage > 0) {
    return (goodsAmount * freightPercentage) / 100
  }
  
  if (freightAmount > 0 && totalGoods > 0) {
    return (goodsAmount / totalGoods) * freightAmount
  }
  
  return 0
}

const getPackingAmount = (item: any) => {
  // If item has packing amount stored, use it
  if (item.packing_amount != null) {
    return parseFloat(item.packing_amount) || 0
  }
  
  // Calculate packing amount based on PO's packing charges
  if (!props.poData) return 0
  
  const packingPercentage = parseFloat(props.poData.packing_charges_percentage || 0)
  const packingAmount = parseFloat(props.poData.packing_charges_amount || 0)
  const goodsAmount = getGoodsAmount(item)
  const totalGoods = items.value.length > 0 
    ? items.value.reduce((sum, i) => sum + getGoodsAmount(i), 0)
    : goodsAmount
  
  if (totalGoods === 0) return 0
  
  if (packingPercentage > 0) {
    return (goodsAmount * packingPercentage) / 100
  }
  
  if (packingAmount > 0 && totalGoods > 0) {
    return (goodsAmount / totalGoods) * packingAmount
  }
  
  return 0
}

const getCustomsAmount = (item: any) => {
  // If item has customs amount stored, use it
  if (item.customs_amount != null || item.custom_duties_amount != null) {
    return parseFloat(item.customs_amount || item.custom_duties_amount) || 0
  }
  
  // Calculate customs & duties based on PO's custom duties charges
  if (!props.poData) return 0
  
  const customsPercentage = parseFloat(props.poData.custom_duties_percentage || 0)
  const customsAmount = parseFloat(props.poData.custom_duties_amount || 0)
  const goodsAmount = getGoodsAmount(item)
  const totalGoods = items.value.length > 0
    ? items.value.reduce((sum, i) => sum + getGoodsAmount(i), 0)
    : goodsAmount
  
  if (totalGoods === 0) return 0
  
  if (customsPercentage > 0) {
    return (goodsAmount * customsPercentage) / 100
  }
  
  if (customsAmount > 0 && totalGoods > 0) {
    return (goodsAmount / totalGoods) * customsAmount
  }
  
  return 0
}

const getOtherAmount = (item: any) => {
  // If item has other amount stored, use it
  if (item.other_amount != null) {
    return parseFloat(item.other_amount) || 0
  }
  
  // Calculate other charges based on PO's other charges
  if (!props.poData) return 0
  
  const otherPercentage = parseFloat(props.poData.other_charges_percentage || 0)
  const otherAmount = parseFloat(props.poData.other_charges_amount || 0)
  const goodsAmount = getGoodsAmount(item)
  const totalGoods = items.value.length > 0
    ? items.value.reduce((sum, i) => sum + getGoodsAmount(i), 0)
    : goodsAmount
  
  if (totalGoods === 0) return 0
  
  if (otherPercentage > 0) {
    return (goodsAmount * otherPercentage) / 100
  }
  
  if (otherAmount > 0 && totalGoods > 0) {
    return (goodsAmount / totalGoods) * otherAmount
  }
  
  return 0
}

const getTaxesAmount = (item: any) => {
  // If item has taxes amount stored, use it
  if (item.taxes_amount != null || item.tax_amount != null) {
    return parseFloat(item.taxes_amount || item.tax_amount) || 0
  }
  
  // Calculate taxes based on PO's tax charges
  if (!props.poData) return 0
  
  const tax1Percentage = parseFloat(props.poData.sales_tax_1_percentage || 0)
  const tax2Percentage = parseFloat(props.poData.sales_tax_2_percentage || 0)
  const goodsAmount = getGoodsAmount(item)
  
  // Only include charges that are taxable
  const freightAmount = props.poData.freight_charges_taxable ? getFreightAmount(item) : 0
  const packingAmount = props.poData.packing_charges_taxable ? getPackingAmount(item) : 0
  const customsAmount = props.poData.custom_duties_taxable ? getCustomsAmount(item) : 0
  const otherAmount = props.poData.other_charges_taxable ? getOtherAmount(item) : 0
  
  const taxableAmount = goodsAmount + freightAmount + packingAmount + customsAmount + otherAmount
  const tax1 = (taxableAmount * tax1Percentage) / 100
  const tax2 = (taxableAmount * tax2Percentage) / 100
  
  return tax1 + tax2
}

const getItemTotal = (item: any) => {
  const goodsAmount = getGoodsAmount(item)
  const freightAmount = getFreightAmount(item)
  const packingAmount = getPackingAmount(item)
  const customsAmount = getCustomsAmount(item)
  const otherAmount = getOtherAmount(item)
  const taxesAmount = getTaxesAmount(item)
  
  return goodsAmount + freightAmount + packingAmount + customsAmount + otherAmount + taxesAmount
}

const totalFreightAmount = computed(() => {
  return items.value.reduce((sum, item) => sum + getFreightAmount(item), 0)
})

const totalPackingAmount = computed(() => {
  return items.value.reduce((sum, item) => sum + getPackingAmount(item), 0)
})

const totalCustomsAmount = computed(() => {
  return items.value.reduce((sum, item) => sum + getCustomsAmount(item), 0)
})

const totalOtherAmount = computed(() => {
  return items.value.reduce((sum, item) => sum + getOtherAmount(item), 0)
})

const totalTaxesAmount = computed(() => {
  return items.value.reduce((sum, item) => sum + getTaxesAmount(item), 0)
})

const totalAmount = computed(() => {
  return items.value.reduce((sum, item) => sum + getItemTotal(item), 0)
})

const fetchItems = async () => {
  loading.value = true
  error.value = null

  try {
    // Always fetch from API as the source of truth (like PurchaseOrderForm and POItemsTableWithEstimates)
    if (!props.poUuid) {
      error.value = 'PO UUID is required'
      return
    }

    console.log('[POBreakdown] [fetchItems] Fetching items for PO:', props.poUuid)
    const fetchedItems = await purchaseOrderResourcesStore.fetchPurchaseOrderItems(props.poUuid)
    console.log('[POBreakdown] [fetchItems] Fetched items:', {
      count: fetchedItems?.length || 0,
      items: fetchedItems?.slice(0, 2).map(item => ({
        id: item.id,
        uuid: item.uuid,
        item_name: item.item_name,
        description: item.description,
        metadata: item.metadata,
        item_type_label: item.item_type_label
      }))
    })
    items.value = Array.isArray(fetchedItems) ? fetchedItems : []
  } catch (err: any) {
    console.error('[POBreakdown] Failed to fetch PO items:', err)
    error.value = err?.message || 'Failed to load PO items'
    items.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.poUuid, () => {
  if (props.poUuid) {
    fetchItems()
  }
}, { immediate: true })

onMounted(() => {
  if (props.poUuid) {
    fetchItems()
  }
})
</script>

