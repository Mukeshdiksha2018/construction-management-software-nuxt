<template>
  <UModal v-model:open="isOpen" :title="title" description="Select items to import into the purchase order" fullscreen>
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
        <p class="text-sm">No items available to import.</p>
        <p class="text-xs mt-2">Please make sure an estimate exists for this project.</p>
      </div>

      <UTable
        v-else
        :data="items"
        :columns="tableColumns"
      />
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

const UCheckbox = resolveComponent('UCheckbox')

interface EstimateItem {
  id?: string
  uuid?: string
  cost_code_label?: string
  cost_code?: string
  cost_code_number?: string
  cost_code_name?: string
  cost_code_description?: string
  item_type_label?: string
  item_type?: string
  item_type_description?: string
  item_label?: string
  item_name?: string
  description?: string
  po_description?: string
  po_unit_price?: number
  unit_price?: number
  uom?: string
  po_quantity?: number
  quantity?: number
  [key: string]: any
}

interface Props {
  open?: boolean
  items?: EstimateItem[]
  title?: string
  preselectedItems?: EstimateItem[]
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'confirm', selectedItems: EstimateItem[]): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  items: () => [],
  title: 'Select Items to Import',
  preselectedItems: () => []
})

const emit = defineEmits<Emits>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const selectedItems = ref<Set<string>>(new Set())

// Helper to get a unique ID for each item
const getItemId = (item: EstimateItem, index: number): string => {
  // Try multiple ID fields, fallback to index
  return item.id || item.uuid || item.item_uuid || `item-${index}`
}

// Select items when modal opens
watch(() => props.open, (newValue) => {
  console.log('[EstimateItemsModal] Modal open changed:', newValue, 'Items count:', props.items.length);
  if (newValue && props.items.length > 0) {
    // If preselectedItems are provided, use those; otherwise select all
    if (props.preselectedItems && props.preselectedItems.length > 0) {
      // Create a set of IDs from preselected items
      const preselectedIds = new Set(
        props.preselectedItems.map((item, index) => {
          // Try to match by item_uuid first, then other IDs
          return item.item_uuid || item.id || item.uuid || `item-${index}`
        })
      );
      
      // Select items that match the preselected items
      const itemIds = props.items
        .map((item, index) => {
          const itemId = getItemId(item, index);
          // Check if this item matches any preselected item
          const matches = props.preselectedItems.some((preselected) => {
            const preselectedId = preselected.item_uuid || preselected.id || preselected.uuid;
            const currentId = item.item_uuid || item.id || item.uuid;
            return preselectedId && currentId && preselectedId === currentId;
          });
          return matches ? itemId : null;
        })
        .filter((id): id is string => id !== null);
      
      console.log('[EstimateItemsModal] Preselecting items:', itemIds.length, 'of', props.items.length);
      selectedItems.value = new Set(itemIds);
    } else {
      // Select all items by default
      const itemIds = props.items.map((item, index) => getItemId(item, index));
      console.log('[EstimateItemsModal] Selecting all items:', itemIds);
      selectedItems.value = new Set(itemIds);
    }
  }
}, { immediate: true })

// Watch items prop changes
watch(() => props.items, (newItems) => {
  console.log('[EstimateItemsModal] Items changed:', newItems.length, 'items');
  if (newItems.length > 0 && newItems[0]) {
    const firstItem = newItems[0];
    console.log('[EstimateItemsModal] First item:', firstItem);
    console.log('[EstimateItemsModal] First item keys:', Object.keys(firstItem));
    
    // Debug cost code fields (including display_metadata)
    const display = firstItem.display_metadata || {};
    console.log('[EstimateItemsModal] display_metadata object:', display);
    console.log('[EstimateItemsModal] display_metadata keys:', display ? Object.keys(display) : 'no display_metadata');
    console.log('[EstimateItemsModal] Cost Code fields:', {
      cost_code_label: firstItem.cost_code_label || display.cost_code_label,
      cost_code_number: firstItem.cost_code_number || display.cost_code_number,
      cost_code_name: firstItem.cost_code_name || display.cost_code_name,
      cost_code_description: firstItem.cost_code_description || display.cost_code_description,
      cost_code: firstItem.cost_code,
      cost_code_uuid: firstItem.cost_code_uuid,
      display_metadata_exists: !!firstItem.display_metadata,
      display_metadata_content: display,
    });
    
    // Show first 3 items cost code info
    newItems.slice(0, 3).forEach((item, index) => {
      const costCodeLabel = item.cost_code_label || 
        (item.cost_code_number || item.cost_code_name 
          ? [item.cost_code_number, item.cost_code_name].filter(Boolean).join(' ').trim()
          : null);
      console.log(`[EstimateItemsModal] Item ${index}:`, {
        cost_code: costCodeLabel || item.cost_code || '-',
      });
    });
  }
}, { immediate: true, deep: true })

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

const calculateItemTotal = (item: EstimateItem): number => {
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
    handleSelectAll()
  } else {
    handleDeselectAll()
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
  console.log('[EstimateItemsModal] Confirming selection:', selected.length, 'items');
  emit('confirm', selected)
  isOpen.value = false
}

const handleCancel = () => {
  emit('cancel')
  isOpen.value = false
}

// Table columns configuration
const tableColumns = computed<TableColumn<EstimateItem>[]>(() => [
  {
    accessorKey: 'checkbox',
    header: () => h(UCheckbox, {
      modelValue: allSelected.value,
      'onUpdate:modelValue': handleToggleAll,
    }),
    enableSorting: false,
    meta: { class: { th: 'w-16 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted', td: 'px-4 py-3 align-middle' } },
    cell: ({ row }: { row: { original: EstimateItem; index: number } }) => {
      const item = row.original
      const index = props.items.indexOf(item)
      const itemId = getItemId(item, index >= 0 ? index : row.index)
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
    cell: ({ row }: { row: { original: EstimateItem; index: number } }) => {
      const item = row.original
      const display = item.display_metadata || {}
      
      // Get cost code fields from display_metadata first, then fallback to item itself
      const costCodeLabel = display.cost_code_label || item.cost_code_label
      const costCodeNumber = display.cost_code_number || item.cost_code_number
      const costCodeName = display.cost_code_name || item.cost_code_name
      
      // Construct cost code label from number and name if label is not available
      let finalCostCodeLabel = costCodeLabel
      if (!finalCostCodeLabel && (costCodeNumber || costCodeName)) {
        finalCostCodeLabel = [costCodeNumber, costCodeName]
          .filter((segment: string | undefined) => String(segment || '').trim().length > 0)
          .join(' ')
          .trim()
      }
      const displayText = finalCostCodeLabel || display.cost_code_description || item.cost_code_description || item.cost_code || '-'
      
      // Debug log for cost code rendering (only for first row)
      if (row.index === 0) {
        console.log('[EstimateItemsModal] Rendering cost code cell for first row:', {
          fromItem: {
            cost_code_label: item.cost_code_label,
            cost_code_number: item.cost_code_number,
            cost_code_name: item.cost_code_name,
          },
          fromDisplayMetadata: {
            cost_code_label: display.cost_code_label,
            cost_code_number: display.cost_code_number,
            cost_code_name: display.cost_code_name,
          },
          finalCostCodeLabel,
          displayText,
        });
      }
      
      return h('div', { class: 'text-xs font-medium truncate' }, displayText)
    }
  },
  {
    accessorKey: 'sequence',
    header: 'Sequence',
    enableSorting: false,
    meta: { class: { th: 'w-24 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted', td: 'px-4 py-3 align-middle' } },
    cell: ({ row }: { row: { original: EstimateItem } }) => {
      const item = row.original
      return h('div', { class: 'text-xs truncate' },
        item.sequence || item.seq || '-'
      )
    }
  },
  {
    accessorKey: 'item',
    header: 'Item',
    enableSorting: false,
    meta: { class: { th: 'w-48 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted', td: 'px-4 py-3 align-middle' } },
    cell: ({ row }: { row: { original: EstimateItem } }) => {
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
    cell: ({ row }: { row: { original: EstimateItem } }) => {
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
    cell: ({ row }: { row: { original: EstimateItem } }) => {
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
    cell: ({ row }: { row: { original: EstimateItem } }) => {
      const item = row.original
      return h('div', { class: 'text-xs' },
        item.uom || '-'
      )
    }
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
    enableSorting: false,
    meta: { class: { th: 'w-24 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted', td: 'px-4 py-3 align-middle text-right' } },
    cell: ({ row }: { row: { original: EstimateItem } }) => {
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
    cell: ({ row }: { row: { original: EstimateItem } }) => {
      const item = row.original
      return h('div', { class: 'text-xs font-mono font-medium' },
        formatCurrency(calculateItemTotal(item))
      )
    }
  }
])
</script>
