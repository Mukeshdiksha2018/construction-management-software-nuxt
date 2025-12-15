<template>
  <POItemsTableWithEstimates
    v-bind="forwardedProps"
    @add-row="emit('add-row', $event)"
    @remove-row="emit('remove-row', $event)"
    @cost-code-change="emit('cost-code-change', $event)"
    @location-change="emit('location-change', $event)"
    @item-type-change="emit('item-type-change', $event)"
    @sequence-change="emit('sequence-change', $event)"
    @item-change="emit('item-change', $event)"
    @approval-checks-change="emit('approval-checks-change', $event)"
    @model-number-change="emit('model-number-change', $event)"
    @uom-change="emit('uom-change', $event)"
    @po-unit-price-change="emit('po-unit-price-change', $event)"
    @po-quantity-change="emit('po-quantity-change', $event)"
    @po-total-change="emit('po-total-change', $event)"
    @edit-selection="emit('edit-selection', $event)"
  >
    <template v-if="$slots.actions" #actions="slotProps">
      <slot name="actions" v-bind="slotProps" />
    </template>
  </POItemsTableWithEstimates>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import POItemsTableWithEstimates from '@/components/PurchaseOrders/POItemsTableWithEstimates.vue'

interface PurchaseOrderItemDisplay {
  id?: string | number
  name?: string
  description?: string
  item_uuid?: string | null
  cost_code_uuid?: string | null
  cost_code_label?: string
  cost_code_number?: string
  cost_code_name?: string
  division_name?: string
  item_type_uuid?: string | null
  item_type_label?: string
  sequence?: string
  model_number?: string
  location_uuid?: string | null
  unit?: string
  unit_uuid?: string | null
  unit_label?: string
  quantity?: number | string | null
  unit_price?: number | string | null
  total?: number | string | null
  location?: string
  approval_checks?: string[]
  po_unit_price?: string | number | null
  po_quantity?: string | number | null
  po_total?: string | number | null
  options?: Array<{
    label?: string
    value?: string
    short_name?: string
    description?: string
    unit?: string
    unit_price?: number | string | null
    [key: string]: any
  }>
}

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  items: PurchaseOrderItemDisplay[]
  loading?: boolean
  error?: string | null
  loadingMessage?: string
  emptyMessage?: string
  corporationUuid?: string
  projectUuid?: string
  scopedItemTypes?: any[]
  scopedCostCodeConfigurations?: any[]
  readonly?: boolean
  showEditSelection?: boolean
}>(), {
  title: 'PO Items',
  description: '',
  items: () => [],
  loading: false,
  error: null,
  loadingMessage: 'Loading items…',
  emptyMessage: 'No items found.',
  corporationUuid: undefined,
  projectUuid: undefined,
  scopedItemTypes: undefined,
  scopedCostCodeConfigurations: undefined,
  readonly: false,
  showEditSelection: false,
})

const emit = defineEmits<{
  (e: 'add-row', index: number): void
  (e: 'remove-row', index: number): void
  (e: 'cost-code-change', payload: { index: number; value: string | null; option?: any }): void
  (e: 'location-change', payload: { index: number; value: string | null; option?: any }): void
  (e: 'item-type-change', payload: { index: number; value: string | null; option?: any }): void
  (e: 'sequence-change', payload: { index: number; value: string | null; option?: any }): void
  (e: 'item-change', payload: { index: number; value: string | null; option?: any }): void
  (e: 'approval-checks-change', payload: { index: number; value: string[] }): void
  (e: 'model-number-change', payload: { index: number; value: string }): void
  (e: 'uom-change', payload: { index: number; value: string | null; option?: any }): void
  (e: 'po-unit-price-change', payload: { index: number; value: string | number | null | undefined; numericValue: number; computedTotal: number }): void
  (e: 'po-quantity-change', payload: { index: number; value: string | number | null | undefined; numericValue: number; computedTotal: number }): void
  (e: 'po-total-change', payload: { index: number; value: number }): void
  (e: 'edit-selection'): void
}>()

// Debug log - fires immediately when component is created
console.log('[POItemsFromItemMaster] Component created with props:', {
  hasScopedCostCodeConfigurations: !!props.scopedCostCodeConfigurations,
  scopedCostCodeConfigurationsCount: props.scopedCostCodeConfigurations?.length || 0,
  sampleConfigs: props.scopedCostCodeConfigurations?.slice(0, 2),
});

const forwardedProps = computed(() => {
  console.log('[POItemsFromItemMaster] forwardedProps computed:', {
    hasScopedCostCodeConfigurations: !!props.scopedCostCodeConfigurations,
    scopedCostCodeConfigurationsCount: props.scopedCostCodeConfigurations?.length || 0,
    sample: props.scopedCostCodeConfigurations?.slice(0, 2),
  });
  return {
    ...props,
    itemColumnWidthClass: 'w-2/12',
    showEstimateValues: false,
  };
})
</script>
