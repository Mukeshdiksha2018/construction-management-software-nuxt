<template>
  <div class="space-y-4">
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p class="text-gray-600 dark:text-gray-400">Loading estimate...</p>
      </div>
    </div>

    <div v-else-if="error" class="py-4">
      <UAlert
        icon="i-heroicons-exclamation-triangle"
        color="error"
        variant="soft"
        :title="error"
        :description="'Please try again.'"
      />
    </div>

    <div v-else-if="estimateDetail">
      <!-- Compact summary header -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="rounded-lg p-3 bg-elevated border border-default">
          <div class="text-[11px] text-muted">Estimate #</div>
          <div class="text-sm font-semibold text-default truncate">{{ estimateDetail.estimate_number }}</div>
        </div>
        <div class="rounded-lg p-3 bg-elevated border border-default col-span-1 md:col-span-1">
          <div class="text-[11px] text-muted">Project</div>
          <div class="text-sm font-semibold text-default truncate">{{ estimateDetail.project?.project_name || 'N/A' }}</div>
        </div>
        <div class="rounded-lg p-3 bg-elevated border border-default">
          <div class="text-[11px] text-muted">Estimate Date</div>
          <div class="text-sm text-default">{{ formatDate(estimateDetail.estimate_date) }}</div>
        </div>
        <div class="rounded-lg p-3 bg-elevated border border-default flex items-center justify-between gap-2">
          <div>
            <div class="text-[11px] text-muted">Valid Until</div>
            <div class="text-sm text-default">{{ estimateDetail.valid_until ? formatDate(estimateDetail.valid_until) : 'N/A' }}</div>
          </div>
          <UBadge :color="statusColor(estimateDetail.status)" variant="soft" size="sm">
            {{ estimateDetail.status || 'Draft' }}
          </UBadge>
        </div>
      </div>

      <!-- Compact amount stats as chips -->
      <div class="mt-2 flex flex-wrap gap-2">
        <div class="px-2.5 py-1.5 rounded-md bg-elevated border border-default text-xs flex items-center gap-2">
          <span class="text-muted">Total</span>
          <span class="font-mono font-medium text-default">{{ formatCurrency(estimateDetail.total_amount || 0) }}</span>
        </div>
        <div class="px-2.5 py-1.5 rounded-md bg-elevated border border-default text-xs flex items-center gap-2">
          <span class="text-muted">Tax</span>
          <span class="font-mono text-default">{{ formatCurrency(estimateDetail.tax_amount || 0) }}</span>
        </div>
        <div class="px-2.5 py-1.5 rounded-md bg-elevated border border-default text-xs flex items-center gap-2">
          <span class="text-muted">Discount</span>
          <span class="font-mono text-default">{{ formatCurrency(estimateDetail.discount_amount || 0) }}</span>
        </div>
        <div class="px-2.5 py-1.5 rounded-md bg-elevated border border-default text-xs flex items-center gap-2">
          <span class="text-muted">Final</span>
          <span class="font-mono font-semibold text-default">{{ formatCurrency(estimateDetail.final_amount || 0) }}</span>
        </div>
      </div>

      <!-- Line Items -->
      <div class="mt-2">
        <h4 class="text-sm font-semibold text-default mb-2">Line Items</h4>
        <div v-if="visibleLineItems.length === 0" class="text-xs text-muted">No line items.</div>
        <div v-else class="space-y-2">
          <div v-for="item in visibleLineItems" :key="item.cost_code_uuid" class="p-3 rounded border border-default bg-elevated">
            <div class="flex justify-between items-start">
              <div>
                <div class="text-xs font-medium text-default">
                  {{ item.cost_code_number }} {{ item.cost_code_name }}
                </div>
                <div class="text-xs text-muted">{{ item.division_name }}</div>
                <div class="text-xs text-muted" v-if="item.description">{{ item.description }}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-muted">Total</div>
                <div class="text-sm font-mono font-semibold">{{ formatCurrency(item.total_amount || 0) }}</div>
              </div>
            </div>

            <!-- Labor details -->
            <div class="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <div class="text-[11px] text-muted">Labor Amount</div>
                <div class="text-sm font-mono">{{ formatCurrency(item.labor_amount || 0) }}</div>
              </div>
              <div>
                <div class="text-[11px] text-muted">Estimation Type</div>
                <div class="text-xs">{{ item.estimation_type || 'manual' }}</div>
              </div>
              <div v-if="item.estimation_type === 'per-room'" class="text-xs">
                <span class="text-muted">Rooms:</span> {{ item.labor_rooms_count || 0 }} •
                <span class="text-muted">Per Room:</span> {{ formatCurrency(item.labor_amount_per_room || 0) }}
              </div>
              <div v-else-if="item.estimation_type === 'per-sqft'" class="text-xs">
                <span class="text-muted">Area:</span> {{ item.labor_sq_ft_count || 0 }} •
                <span class="text-muted">Per Sqft:</span> {{ formatCurrency(item.labor_amount_per_sqft || 0) }}
              </div>
            </div>

            <!-- Material details (item wise) -->
            <div v-if="Array.isArray(item.material_items) && item.material_items.length" class="mt-2">
              <div class="text-[11px] text-muted mb-1">Material Items</div>
              <div class="overflow-x-auto">
                <table class="min-w-full text-xs">
                  <thead>
                    <tr class="text-muted text-[11px]">
                      <th class="text-left pr-2 py-1">Name</th>
                      <th class="text-left pr-2 py-1">UOM</th>
                      <th class="text-right pr-2 py-1">Qty</th>
                      <th class="text-right pr-2 py-1">Unit Price</th>
                      <th class="text-right py-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(mi, idx) in item.material_items" :key="idx" class="border-t border-default">
                      <td class="pr-2 py-1">{{ mi.name || '-' }}</td>
                      <td class="pr-2 py-1">{{ mi.unit || '-' }}</td>
                      <td class="text-right pr-2 py-1">{{ mi.quantity ?? '-' }}</td>
                      <td class="text-right pr-2 py-1">{{ formatCurrency(mi.unit_price || 0) }}</td>
                      <td class="text-right py-1 font-mono">{{ formatCurrency(mi.total || 0) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div v-if="estimateDetail.notes" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
        <p class="text-sm text-default">{{ estimateDetail.notes }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useDateFormat } from '@/composables/useDateFormat'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'

interface Props {
  estimate?: any
  estimateUuid?: string
}

const props = defineProps<Props>()

const { formatDate } = useDateFormat()
const { formatCurrency } = useCurrencyFormat()

const loading = ref(false)
const error = ref<string | null>(null)
const estimateDetail = ref<any | null>(null)

const load = async () => {
  error.value = null
  if (props.estimate) {
    estimateDetail.value = props.estimate
    // If line_items not present but uuid is, fetch detail
    if (!Array.isArray(props.estimate.line_items) && props.estimate.uuid) {
      await fetchDetail(props.estimate.uuid)
    }
    return
  }
  if (props.estimateUuid) {
    await fetchDetail(props.estimateUuid)
  }
}

const fetchDetail = async (uuid: string) => {
  loading.value = true
  try {
    const response: any = await $fetch(`/api/estimates/${uuid}`, { method: 'GET' })
    if (response?.data) {
      estimateDetail.value = response.data
    } else {
      throw new Error('Estimate not found')
    }
  } catch (e: any) {
    error.value = e?.message || 'Failed to load estimate'
  } finally {
    loading.value = false
  }
}

const visibleLineItems = computed(() => {
  const est = estimateDetail.value
  if (!est) return [] as any[]
  const removed: string[] = Array.isArray(est.removed_cost_code_uuids) ? est.removed_cost_code_uuids : []
  const items: any[] = Array.isArray(est.line_items) ? est.line_items : []
  return items.filter((li) => !removed.includes(li.cost_code_uuid))
})

const statusColor = (status?: string) => {
  if (status === 'Approved') return 'success'
  if (status === 'Rejected') return 'error'
  if (status === 'Pending') return 'warning'
  return 'neutral'
}

watch(() => [props.estimate, props.estimateUuid], () => {
  load()
}, { immediate: true })

onMounted(() => {
  if (!estimateDetail.value) load()
})
</script>


