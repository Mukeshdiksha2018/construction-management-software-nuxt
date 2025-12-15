<template>
  <UModal v-model:open="isOpen" :title="title" description="Select labor cost codes to import into the purchase order" fullscreen>
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
        <p class="text-sm">No labor cost codes available to import.</p>
        <p class="text-xs mt-2" v-if="isFromEstimate">
          Please make sure an estimate exists for this project with labor amounts.
        </p>
        <p class="text-xs mt-2" v-else>
          Please make sure cost codes are configured for the selected corporation.
        </p>
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

interface LaborItem {
  id?: string
  uuid?: string
  cost_code_uuid?: string
  cost_code_label?: string
  cost_code_number?: string
  cost_code_name?: string
  cost_code_description?: string
  cost_code?: string
  labor_budgeted_amount?: number
  po_amount?: number
  [key: string]: any
}

interface Props {
  open?: boolean
  items?: LaborItem[]
  title?: string
  preselectedItems?: LaborItem[]
  showLaborBudgeted?: boolean
  isFromEstimate?: boolean
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'confirm', selectedItems: LaborItem[]): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  items: () => [],
  title: 'Select Labor Cost Codes to Import',
  preselectedItems: () => [],
  showLaborBudgeted: false,
  isFromEstimate: false,
})

const emit = defineEmits<Emits>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const selectedItems = ref<Set<string>>(new Set())

// Helper to get a unique ID for each item
const getItemId = (item: LaborItem, index: number): string => {
  // Use cost_code_uuid as primary identifier for labor items
  return item.cost_code_uuid || item.uuid || item.id || `labor-item-${index}`
}

// Select items when modal opens
watch(() => props.open, (newValue) => {
  console.log('[LaborItemsModal] Modal open changed:', newValue, 'Items count:', props.items.length);
  if (newValue && props.items.length > 0) {
    // If preselectedItems are provided, use those; otherwise select all
    if (props.preselectedItems && props.preselectedItems.length > 0) {
      // Create a set of IDs from preselected items
      const preselectedIds = new Set(
        props.preselectedItems.map((item) => {
          return item.cost_code_uuid || item.uuid || item.id || ''
        })
      );
      
      // Select items that match the preselected items
      const itemIds = props.items
        .map((item, index) => {
          const itemId = getItemId(item, index);
          // Check if this item matches any preselected item
          const matches = props.preselectedItems.some((preselected) => {
            const preselectedId = preselected.cost_code_uuid || preselected.id || preselected.uuid;
            const currentId = item.cost_code_uuid || item.id || item.uuid;
            return preselectedId && currentId && preselectedId === currentId;
          });
          return matches ? itemId : null;
        })
        .filter((id): id is string => id !== null);
      
      console.log('[LaborItemsModal] Preselecting items:', itemIds.length, 'of', props.items.length);
      selectedItems.value = new Set(itemIds);
    } else {
      // Select all items by default
      const itemIds = props.items.map((item, index) => getItemId(item, index));
      console.log('[LaborItemsModal] Selecting all items:', itemIds);
      selectedItems.value = new Set(itemIds);
    }
  }
}, { immediate: true })

// Watch items prop changes
watch(() => props.items, (newItems) => {
  console.log('[LaborItemsModal] Items changed:', newItems.length, 'items');
  if (newItems.length > 0 && newItems[0]) {
    console.log('[LaborItemsModal] First item:', newItems[0]);
    console.log('[LaborItemsModal] First item keys:', Object.keys(newItems[0]));
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
  console.log('[LaborItemsModal] Confirming selection:', selected.length, 'items');
  emit('confirm', selected)
  isOpen.value = false
}

const handleCancel = () => {
  emit('cancel')
  isOpen.value = false
}

// Table columns configuration
const tableColumns = computed<TableColumn<LaborItem>[]>(() => {
  const columns: TableColumn<LaborItem>[] = [
    {
      accessorKey: 'checkbox',
      header: () => h(UCheckbox, {
        modelValue: allSelected.value,
        'onUpdate:modelValue': handleToggleAll,
      }),
      enableSorting: false,
      meta: { class: { th: 'w-16 px-4 py-2 text-left', td: 'px-4 py-3 align-middle' } },
      cell: ({ row }: { row: { original: LaborItem; index: number } }) => {
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
      meta: { class: { th: 'w-48 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted', td: 'px-4 py-3 align-middle' } },
      cell: ({ row }: { row: { original: LaborItem } }) => {
        const item = row.original
        return h('div', [
          h('div', { class: 'text-xs font-medium truncate' }, 
            item.cost_code_label || item.cost_code_description || item.cost_code_number || item.cost_code || '-'
          ),
          item.cost_code_number && item.cost_code_name ? h('div', { class: 'text-[11px] text-muted uppercase tracking-wide mt-1' },
            `${item.cost_code_number} · ${item.cost_code_name}`
          ) : null
        ])
      }
    }
  ]

  if (props.showLaborBudgeted) {
    columns.push({
      accessorKey: 'labor_budgeted_amount',
      header: 'Labor Budgeted Amount',
      enableSorting: false,
      meta: { class: { th: 'w-32 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted', td: 'px-4 py-3 align-middle text-right' } },
      cell: ({ row }: { row: { original: LaborItem } }) => {
        return h('div', { class: 'text-xs font-mono' }, formatCurrency(row.original.labor_budgeted_amount || 0))
      }
    })
  }

  columns.push({
    accessorKey: 'po_amount',
    header: 'PO Amount',
    enableSorting: false,
    meta: { class: { th: 'w-32 px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted', td: 'px-4 py-3 align-middle text-right' } },
    cell: ({ row }: { row: { original: LaborItem } }) => {
      return h('div', { class: 'text-xs font-mono' }, formatCurrency(row.original.po_amount || 0))
    }
  })

  return columns
})
</script>
