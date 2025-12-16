<template>
  <UModal v-model:open="isOpen" :title="title" description="Select items to import from item master" fullscreen>
    <template #header>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-heroicons-check-circle"
          color="primary"
          variant="soft"
          size="sm"
          @click="handleSelectAll"
        >
          Select All
        </UButton>
        <UButton
          icon="i-heroicons-x-circle"
          color="error"
          variant="soft"
          size="sm"
          @click="handleDeselectAll"
        >
          Deselect All
        </UButton>
      </div>
    </template>

    <template #body>
      <div v-if="items.length === 0" class="px-4 py-8 text-center text-muted">
        <p class="text-sm">No preferred items available to import.</p>
        <p class="text-xs mt-2">Please make sure preferred items are configured for the selected project or corporation.</p>
      </div>

      <div v-else class="flex gap-4" style="height: calc(100vh - 200px); min-height: 500px;">
        <!-- Left Sidebar: Cost Codes -->
        <div class="w-80 border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex-shrink-0">
          <div class="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Cost Codes</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ groupedByCostCode.size }} cost code{{ groupedByCostCode.size !== 1 ? 's' : '' }}</p>
          </div>
          
          <CustomAccordion
            :items="costCodeAccordionItems"
            type="multiple"
            :collapsible="true"
            class="w-full"
          >
            <template #trigger="{ item, isOpen }">
              <div class="flex items-center justify-between w-full px-4 py-2 group cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 border-l-4 border-transparent hover:border-primary-400 dark:hover:border-primary-500"
                   :class="{ 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 dark:border-primary-500': selectedCostCodeUuid === item.costCodeUuid }"
                   :title="`Click to ${isOpen ? 'collapse' : 'expand'} items`"
                   @click.stop="selectCostCode(item.costCodeUuid)">
                <div class="flex-1 flex items-center gap-2">
                  <span class="text-xs text-gray-700 dark:text-gray-300 font-medium group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors duration-200">
                    {{ item.label }}
                  </span>
                  <UBadge
                    :label="String(item.itemCount)"
                    color="neutral"
                    variant="soft"
                    size="xs"
                  />
                </div>
                <UIcon 
                  name="i-heroicons-chevron-right" 
                  class="w-4 h-4 text-primary-600 dark:text-primary-400 transition-transform duration-200 flex-shrink-0"
                  :class="{ 'rotate-90': isOpen }"
                />
              </div>
            </template>
            <template #content="{ item }">
              <div class="px-4 pb-2 bg-gradient-to-r from-primary-50/50 to-primary-100/50 dark:from-primary-900/10 dark:to-primary-800/10">
                <div class="text-xs text-gray-600 dark:text-gray-400 py-2">
                  {{ item.itemCount }} item{{ item.itemCount !== 1 ? 's' : '' }} in this cost code
                </div>
              </div>
            </template>
          </CustomAccordion>
        </div>

        <!-- Right Panel: Items Table -->
        <div class="flex-1 overflow-auto">
          <div v-if="!selectedCostCodeUuid" class="px-4 py-8 text-center text-muted">
            <UIcon name="i-heroicons-cursor-arrow-rays" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Select a cost code to view items</p>
            <p class="text-xs text-gray-500 dark:text-gray-500 mt-2">Click on a cost code from the left panel to see its items</p>
          </div>
          
          <div v-else>
            <div class="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {{ selectedCostCodeLabel }}
                  </h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {{ filteredItems.length }} item{{ filteredItems.length !== 1 ? 's' : '' }}
                  </p>
                </div>
                <UButton
                  icon="i-heroicons-x-mark"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="selectedCostCodeUuid = null"
                >
                  Clear Selection
                </UButton>
              </div>
            </div>
            
            <UTable
              :data="filteredItems"
              :columns="tableColumns"
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <div class="text-sm text-muted">
          {{ selectedItems.size }} of {{ items.length }} items selected
        </div>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="outline"
            @click="handleCancel"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            :disabled="selectedItems.size === 0"
            @click="handleConfirm"
          >
            Import {{ selectedItems.size }} Item{{ selectedItems.size !== 1 ? 's' : '' }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import CustomAccordion from '@/components/Shared/CustomAccordion.vue'

const UCheckbox = resolveComponent('UCheckbox')

interface MasterItem {
  id?: string
  uuid?: string
  item_uuid?: string // New field for preferred items
  cost_code_uuid?: string
  cost_code_label?: string
  cost_code_number?: string // New field for preferred items
  cost_code_name?: string
  cost_code_description?: string
  cost_code?: string
  item_type_label?: string
  item_type_name?: string // New field for preferred items
  item_type?: string
  item_label?: string
  item_name?: string
  item_description?: string
  description?: string
  po_description?: string
  po_unit_price?: number
  unit_price?: number
  uom?: string
  unit_label?: string // New field for preferred items
  unit?: string // New field for preferred items
  po_quantity?: number
  quantity?: number
  sequence?: string // New field for preferred items
  item_sequence?: string // New field for preferred items
  seq?: string
  display_metadata?: {
    cost_code_uuid?: string
    cost_code_label?: string
    cost_code_number?: string
    cost_code_name?: string
    item_label?: string
    item_name?: string
    item_description?: string
    po_description?: string
    [key: string]: any
  }
  metadata?: {
    cost_code_uuid?: string
    [key: string]: any
  }
  [key: string]: any
}

interface Props {
  open?: boolean
  items?: MasterItem[]
  title?: string
  preselectedItems?: MasterItem[]
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'confirm', selectedItems: MasterItem[]): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  items: () => [],
  title: 'Select Items to Import from Master',
  preselectedItems: () => []
})

const emit = defineEmits<Emits>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const selectedItems = ref<Set<string>>(new Set())
const selectedCostCodeUuid = ref<string | null>(null)

// Helper to get a unique ID for each item
const getItemId = (item: MasterItem, index: number): string => {
  // Use item_uuid first, then other ID fields, fallback to index
  return item.item_uuid || item.uuid || item.id || `master-item-${index}`
}

// Helper to get cost code UUID from item
const getCostCodeUuid = (item: MasterItem): string | null => {
  return item.cost_code_uuid || 
         item.display_metadata?.cost_code_uuid || 
         item.metadata?.cost_code_uuid ||
         null
}

// Helper to get cost code label from item
const getCostCodeLabel = (item: MasterItem): string => {
  const display = item.display_metadata || {}
  const costCodeLabel = display.cost_code_label || item.cost_code_label
  const costCodeNumber = display.cost_code_number || item.cost_code_number
  const costCodeName = display.cost_code_name || item.cost_code_name
  
  if (costCodeLabel) return costCodeLabel
  if (costCodeNumber || costCodeName) {
    return [costCodeNumber, costCodeName]
      .filter((segment: string | undefined) => String(segment || '').trim().length > 0)
      .join(' ')
      .trim()
  }
  return item.cost_code_description || item.cost_code || 'Unknown Cost Code'
}

// Group items by cost code
const groupedByCostCode = computed(() => {
  const groups = new Map<string, { label: string; items: MasterItem[] }>()
  
  props.items.forEach((item, index) => {
    const costCodeUuid = getCostCodeUuid(item) || `no-cost-code-${index}`
    const label = getCostCodeLabel(item)
    
    if (!groups.has(costCodeUuid)) {
      groups.set(costCodeUuid, { label, items: [] })
    }
    groups.get(costCodeUuid)!.items.push(item)
  })
  
  return groups
})

// Cost code accordion items
const costCodeAccordionItems = computed(() => {
  return Array.from(groupedByCostCode.value.entries()).map(([uuid, data]) => ({
    key: uuid,
    label: data.label,
    costCodeUuid: uuid,
    itemCount: data.items.length,
    items: data.items
  })).sort((a, b) => {
    // Sort by label alphabetically
    return a.label.localeCompare(b.label)
  })
})

// Filtered items based on selected cost code
const filteredItems = computed(() => {
  if (!selectedCostCodeUuid.value) {
    return []
  }
  
  const group = groupedByCostCode.value.get(selectedCostCodeUuid.value)
  return group ? group.items : []
})

// Selected cost code label
const selectedCostCodeLabel = computed(() => {
  if (!selectedCostCodeUuid.value) return ''
  const group = groupedByCostCode.value.get(selectedCostCodeUuid.value)
  return group ? group.label : ''
})

// Select cost code
const selectCostCode = (costCodeUuid: string) => {
  selectedCostCodeUuid.value = costCodeUuid
}

// Select items when modal opens
watch(() => props.open, (newValue) => {
  console.log('[MasterItemsModal] Modal open changed:', newValue, 'Items count:', props.items.length);
  if (newValue && props.items.length > 0) {
    // Reset cost code selection
    selectedCostCodeUuid.value = null
    
    if (props.preselectedItems && props.preselectedItems.length > 0) {
      const itemIds = props.items
        .map((item, index) => {
          const itemId = getItemId(item, index);
          const matches = props.preselectedItems.some((preselected) => {
            const preselectedId = preselected.item_uuid || preselected.id || preselected.uuid;
            const currentId = item.item_uuid || item.id || item.uuid;
            return preselectedId && currentId && preselectedId === currentId;
          });
          return matches ? itemId : null;
        })
        .filter((id): id is string => id !== null);
      
      console.log('[MasterItemsModal] Preselecting items:', itemIds.length, 'of', props.items.length);
      selectedItems.value = new Set(itemIds);
    } else {
      // Select all items by default for initial import
      const itemIds = props.items.map((item, index) => getItemId(item, index));
      console.log('[MasterItemsModal] Selecting all items:', itemIds);
      selectedItems.value = new Set(itemIds);
    }
    
    // Auto-select first cost code if available
    if (costCodeAccordionItems.value.length > 0 && costCodeAccordionItems.value[0]) {
      selectedCostCodeUuid.value = costCodeAccordionItems.value[0].costCodeUuid
    }
  } else if (!newValue) {
    // Reset when modal closes
    selectedCostCodeUuid.value = null
  }
}, { immediate: true })

// Watch items prop changes
watch(() => props.items, (newItems) => {
  console.log('[MasterItemsModal] Items changed:', newItems.length, 'items');
  if (newItems.length > 0) {
    const firstItem = newItems[0];
    console.log('[MasterItemsModal] First item:', firstItem);
    console.log('[MasterItemsModal] First item keys:', Object.keys(firstItem));
    
    // Debug item fields
    const display = firstItem.display_metadata || {};
    console.log('[MasterItemsModal] Item fields:', {
      item_label: firstItem.item_label || display.item_label,
      item_name: firstItem.item_name || display.item_name,
      item_description: firstItem.item_description || display.item_description,
      name: firstItem.name,
      description: firstItem.description,
      po_description: firstItem.po_description || display.po_description,
      display_metadata: display,
    });
  }
}, { immediate: true, deep: true })

// Check if all items in the current filtered view are selected
const allSelectedInView = computed(() => {
  if (!selectedCostCodeUuid.value || filteredItems.value.length === 0) {
    return props.items.length > 0 && selectedItems.value.size === props.items.length
  }
  // Check if all filtered items are selected
  const filteredItemIds = filteredItems.value.map((item, index) => {
    const fullIndex = props.items.indexOf(item)
    return getItemId(item, fullIndex >= 0 ? fullIndex : index)
  })
  return filteredItemIds.length > 0 && filteredItemIds.every(id => selectedItems.value.has(id))
})

// Check if all items overall are selected (for header checkbox when no filter)
const allSelected = computed(() => {
  return props.items.length > 0 && selectedItems.value.size === props.items.length
})

const formatCurrency = (value: number | string | null | undefined): string => {
  const num = typeof value === 'string' ? parseFloat(value) : (value || 0)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

const formatNumber = (value: number | string | null | undefined): string => {
  const num = typeof value === 'string' ? parseFloat(value) : (value || 0)
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

const calculateItemTotal = (item: MasterItem): number => {
  const unitPrice = item.po_unit_price || item.unit_price || 0
  const quantity = item.po_quantity || item.quantity || 0
  return unitPrice * quantity
}

const handleToggleItem = (itemId: string, selected: boolean) => {
  if (selected) {
    selectedItems.value.add(itemId)
  } else {
    selectedItems.value.delete(itemId)
  }
}

const handleToggleAll = (selected: boolean) => {
  if (selected) {
    // Select all items in current view if filtered, otherwise all items
    if (selectedCostCodeUuid.value && filteredItems.value.length > 0) {
      filteredItems.value.forEach((item, index) => {
        const fullIndex = props.items.indexOf(item)
        const itemId = getItemId(item, fullIndex >= 0 ? fullIndex : index)
        selectedItems.value.add(itemId)
      })
    } else {
      handleSelectAll()
    }
  } else {
    // Deselect all items in current view if filtered, otherwise all items
    if (selectedCostCodeUuid.value && filteredItems.value.length > 0) {
      filteredItems.value.forEach((item, index) => {
        const fullIndex = props.items.indexOf(item)
        const itemId = getItemId(item, fullIndex >= 0 ? fullIndex : index)
        selectedItems.value.delete(itemId)
      })
    } else {
      handleDeselectAll()
    }
  }
}

const handleSelectAll = () => {
  selectedItems.value = new Set(props.items.map((item, index) => getItemId(item, index)))
}

const handleDeselectAll = () => {
  selectedItems.value = new Set()
}

const handleConfirm = () => {
  const selected = props.items.filter((item, index) => 
    selectedItems.value.has(getItemId(item, index))
  )
  console.log('[MasterItemsModal] Confirming selection:', selected.length, 'items');
  emit('confirm', selected)
  isOpen.value = false
}

const handleCancel = () => {
  emit('cancel')
  isOpen.value = false
}

// Table columns configuration
const tableColumns = computed<TableColumn<MasterItem>[]>(() => [
  {
    accessorKey: 'checkbox',
    header: () => h(UCheckbox, {
      modelValue: selectedCostCodeUuid.value ? allSelectedInView.value : allSelected.value,
      'onUpdate:modelValue': handleToggleAll,
    }),
    enableSorting: false,
    meta: { class: { th: 'w-16 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted', td: 'px-4 py-3 align-middle' } },
    cell: ({ row }: { row: { original: MasterItem; index: number } }) => {
      const item = row.original
      // Find the item in the full items array to get the correct index
      const fullIndex = props.items.findIndex(i => {
        const itemId = getItemId(item, row.index)
        const fullItemId = getItemId(i, props.items.indexOf(i))
        return itemId === fullItemId
      })
      const itemId = getItemId(item, fullIndex >= 0 ? fullIndex : row.index)
      return h(UCheckbox, {
        modelValue: selectedItems.value.has(itemId),
        'onUpdate:modelValue': (value: boolean) => handleToggleItem(itemId, value),
      })
    }
  },
  {
    accessorKey: 'cost_code',
    header: 'Cost Code',
    enableSorting: false,
    meta: { class: { th: 'w-32 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted', td: 'px-4 py-3 align-middle' } },
    cell: ({ row }: { row: { original: MasterItem; index: number } }) => {
      const item = row.original
      const displayText = getCostCodeLabel(item)
      return h('div', { class: 'text-xs font-medium truncate' }, displayText)
    }
  },
  {
    accessorKey: 'sequence',
    header: 'Sequence',
    enableSorting: false,
    meta: { class: { th: 'w-24 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted', td: 'px-4 py-3 align-middle' } },
    cell: ({ row }: { row: { original: MasterItem } }) => {
      const item = row.original
      return h('div', { class: 'text-xs truncate' },
        item.sequence || item.seq || item.item_sequence || '-'
      )
    }
  },
  {
    accessorKey: 'item',
    header: 'Item',
    enableSorting: false,
    meta: { class: { th: 'w-48 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted', td: 'px-4 py-3 align-middle' } },
    cell: ({ row }: { row: { original: MasterItem } }) => {
      const item = row.original
      return h('div', { class: 'text-xs font-medium truncate' },
        item.item_label || item.item_description || item.item_name || item.description || '-'
      )
    }
  },
  {
    accessorKey: 'description',
    header: 'Description',
    enableSorting: false,
    meta: { class: { th: 'w-48 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted', td: 'px-4 py-3 align-middle' } },
    cell: ({ row }: { row: { original: MasterItem } }) => {
      const item = row.original
      return h('div', { class: 'text-xs text-muted truncate' },
        item.po_description || item.description || '-'
      )
    }
  },
  {
    accessorKey: 'unit_price',
    header: 'Unit Price',
    enableSorting: false,
    meta: { class: { th: 'w-32 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted', td: 'px-4 py-3 align-middle text-right' } },
    cell: ({ row }: { row: { original: MasterItem } }) => {
      const item = row.original
      return h('div', { class: 'text-xs font-mono' },
        formatCurrency(item.po_unit_price || item.unit_price || 0)
      )
    }
  },
  {
    accessorKey: 'uom',
    header: 'UOM',
    enableSorting: false,
    meta: { class: { th: 'w-24 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted', td: 'px-4 py-3 align-middle text-right' } },
    cell: ({ row }: { row: { original: MasterItem } }) => {
      const item = row.original
      return h('div', { class: 'text-xs' },
        item.uom || item.unit_label || item.unit || '-'
      )
    }
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
    enableSorting: false,
    meta: { class: { th: 'w-24 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted', td: 'px-4 py-3 align-middle text-right' } },
    cell: ({ row }: { row: { original: MasterItem } }) => {
      const item = row.original
      return h('div', { class: 'text-xs font-mono' },
        formatNumber(item.po_quantity || item.quantity || 0)
      )
    }
  },
  {
    accessorKey: 'total',
    header: 'Total',
    enableSorting: false,
    meta: { class: { th: 'w-32 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted', td: 'px-4 py-3 align-middle text-right' } },
    cell: ({ row }: { row: { original: MasterItem } }) => {
      const item = row.original
      return h('div', { class: 'text-xs font-mono font-medium' },
        formatCurrency(calculateItemTotal(item))
      )
    }
  }
])
</script>
