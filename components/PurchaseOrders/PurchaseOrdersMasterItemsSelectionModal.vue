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

interface MasterItem {
  id?: string
  uuid?: string
  item_uuid?: string // New field for preferred items
  cost_code_label?: string
  cost_code_number?: string // New field for preferred items
  cost_code?: string
  item_type_label?: string
  item_type_name?: string // New field for preferred items
  item_type?: string
  item_label?: string
  item_name?: string
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

// Helper to get a unique ID for each item
const getItemId = (item: MasterItem, index: number): string => {
  // Use item_uuid first, then other ID fields, fallback to index
  return item.item_uuid || item.uuid || item.id || `master-item-${index}`
}

// Select items when modal opens
watch(() => props.open, (newValue) => {
  console.log('[MasterItemsModal] Modal open changed:', newValue, 'Items count:', props.items.length);
  if (newValue && props.items.length > 0) {
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
      modelValue: allSelected.value,
      'onUpdate:modelValue': handleToggleAll,
    }),
    enableSorting: false,
    meta: { class: { th: 'w-16 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted', td: 'px-4 py-3 align-middle' } },
    cell: ({ row }: { row: { original: MasterItem; index: number } }) => {
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
    cell: ({ row }: { row: { original: MasterItem } }) => {
      const item = row.original
      return h('div', { class: 'text-xs font-medium truncate' },
        item.cost_code_label || item.cost_code_description || item.cost_code_number || item.cost_code || '-'
      )
    }
  },
  {
    accessorKey: 'item_type',
    header: 'Item Type',
    enableSorting: false,
    meta: { class: { th: 'w-32 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted', td: 'px-4 py-3 align-middle' } },
    cell: ({ row }: { row: { original: MasterItem } }) => {
      const item = row.original
      return h('div', { class: 'text-xs truncate' },
        item.item_type_label || item.item_type_description || item.item_type_name || item.item_type || '-'
      )
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
    cell: ({ row }: { row: { original: MasterItem; index: number } }) => {
      const item = row.original
      const display = item.display_metadata || {}
      
      // Get item fields from display_metadata first, then fallback to item itself
      const itemLabel = display.item_label || item.item_label
      const itemName = display.item_name || item.item_name || item.name
      const itemDescription = display.item_description || item.item_description
      
      const displayText = itemLabel || itemDescription || itemName || item.description || '-'
      
      // Debug log for item rendering (only for first row)
      if (row.index === 0) {
        console.log('[MasterItemsModal] Rendering item cell for first row:', {
          fromItem: {
            item_label: item.item_label,
            item_name: item.item_name,
            name: item.name,
            item_description: item.item_description,
            description: item.description,
          },
          fromDisplayMetadata: {
            item_label: display.item_label,
            item_name: display.item_name,
            item_description: display.item_description,
          },
          displayText,
        });
      }
      
      return h('div', { class: 'text-xs font-medium truncate' }, displayText)
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
