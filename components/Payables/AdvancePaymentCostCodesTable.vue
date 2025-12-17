<template>
  <div v-if="showTable" class="mt-6">
    <UCard variant="soft">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-semibold text-default">
          Advance Payment Distribution
        </h3>
        <div class="flex items-center gap-2">
          <!-- Show Removed Cost Codes Button -->
          <UButton
            v-if="hasRemovedCostCodes"
            icon="i-heroicons-arrow-path"
            size="sm"
            color="neutral"
            variant="outline"
            @click="openRemovedCostCodesModal"
          >
            Show Removed Cost Codes ({{ removedCostCodesList.length }})
          </UButton>
          <UButton
            v-if="!readonly"
            icon="i-heroicons-plus"
            size="sm"
            color="primary"
            variant="outline"
            @click="() => handleAddRow()"
          >
            Add Row
          </UButton>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p class="mt-2 text-sm text-gray-500">Loading cost codes...</p>
      </div>

      <!-- Table -->
      <div v-else-if="costCodeRows.length > 0" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-default/60">
          <thead class="bg-muted/20 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th class="px-3 py-2 text-left">Cost Code</th>
              <th class="px-3 py-2 text-left">GL Account</th>
              <th class="px-3 py-2 text-right">Total Amount</th>
              <th class="px-3 py-2 text-right">Advance Amount</th>
              <th class="px-3 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default/60 text-sm text-default bg-white dark:bg-gray-900/40">
            <tr
              v-for="(row, index) in costCodeRows"
              :key="row.id || index"
              class="align-middle transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <!-- Cost Code -->
              <td class="px-3 py-2 align-middle">
                <CostCodeSelect
                  :model-value="row.cost_code_uuid || undefined"
                  :corporation-uuid="corporationUuid"
                  size="xs"
                  class="w-full"
                  :disabled="isCostCodeDisabled"
                  placeholder="Select Cost Code"
                  @update:model-value="(value) => handleCostCodeChange(index, value ?? null)"
                  @change="(option) => handleCostCodeChange(index, (option?.costCode?.uuid || option?.value) ?? null, option)"
                />
              </td>

              <!-- GL Account -->
              <td class="px-3 py-2 align-middle">
                <ChartOfAccountsSelect
                  :key="`gl-account-${row.id}-${localChartOfAccounts.length}`"
                  :model-value="row.gl_account_uuid || undefined"
                  :local-accounts="localChartOfAccounts"
                  size="xs"
                  class="w-full"
                  :disabled="readonly || !row.cost_code_uuid"
                  placeholder="Select GL Account"
                  @update:model-value="(value) => {
                    console.log('[AdvancePaymentCostCodesTable] GL account changed via update:model-value:', { index, rowId: row.id, value })
                    handleGLAccountChange(index, value)
                  }"
                  @change="(account) => {
                    console.log('[AdvancePaymentCostCodesTable] GL account changed via change event:', { index, rowId: row.id, account })
                    handleGLAccountChange(index, account?.value, account)
                  }"
                />
                <!-- Debug info -->
                <div v-if="row.gl_account_uuid" class="text-xs text-gray-500 mt-1">
                  UUID: {{ row.gl_account_uuid.substring(0, 8) }}...
                </div>
              </td>

              <!-- Total Amount -->
              <td class="px-3 py-2 align-middle text-right">
                <span class="text-sm font-medium text-default">
                  {{ formatCurrency(row.totalAmount || 0) }}
                </span>
              </td>

              <!-- Advance Amount -->
              <td class="px-3 py-2 align-middle">
                <div class="relative">
                  <UInput
                    :model-value="row.advanceAmount !== null && row.advanceAmount !== undefined ? String(row.advanceAmount) : ''"
                    type="number"
                    step="0.01"
                    size="xs"
                    class="w-full"
                    :disabled="readonly || !row.cost_code_uuid"
                    placeholder="0.00"
                    @update:model-value="(value) => handleAdvanceAmountChange(index, value)"
                  />
                </div>
              </td>

              <!-- Action -->
              <td class="px-3 py-2 align-middle text-center">
                <div class="flex items-center justify-center gap-1">
                  <UButton
                    v-if="!readonly"
                    icon="i-heroicons-plus"
                    size="xs"
                    color="primary"
                    variant="soft"
                    class="p-1"
                    @click="handleAddRow(index)"
                  />
                  <UButton
                    v-if="!readonly"
                    icon="i-heroicons-x-mark"
                    size="xs"
                    color="error"
                    variant="soft"
                    class="p-1"
                    @click="handleRemoveRow(index)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-8">
        <p class="text-sm text-muted">No cost codes found in the selected PO/CO</p>
      </div>

    </UCard>

    <!-- Removed Cost Codes Modal -->
    <UModal v-model:open="removedCostCodesModalOpen">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-base font-semibold">Removed Cost Codes</h3>
          <UButton icon="i-heroicons-x-mark" size="xs" variant="solid" color="neutral" @click="closeRemovedCostCodesModal" />
        </div>
      </template>
      <template #body>
        <div v-if="removedCostCodesList.length" class="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div
            v-for="(costCode, index) in removedCostCodesList"
            :key="costCode.cost_code_uuid || `removed-${index}`"
            class="p-3 border border-default rounded-lg bg-elevated/40 dark:bg-elevated/20 flex flex-col gap-2"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 flex-1">
                <div class="text-sm font-semibold text-default truncate">
                  {{ costCode.cost_code_label || (costCode.cost_code_number && costCode.cost_code_name ? `${costCode.cost_code_number} ${costCode.cost_code_name}`.trim() : `Cost Code ${index + 1}`) }}
                </div>
                <div class="text-xs text-muted mt-1 space-x-2">
                  <span v-if="costCode.cost_code_number">
                    Number: {{ costCode.cost_code_number }}
                  </span>
                  <span v-if="costCode.totalAmount !== null && costCode.totalAmount !== undefined">
                    Total: {{ formatCurrency(costCode.totalAmount) }}
                  </span>
                </div>
                <div v-if="costCode.removed_at" class="text-[11px] text-muted mt-1">
                  Removed: {{ formatRemovedDate(costCode.removed_at) }}
                </div>
              </div>
              <div class="flex flex-col items-end gap-2 shrink-0">
                <UButton size="xs" color="primary" variant="solid" @click="restoreRemovedCostCode(index)">
                  Restore
                </UButton>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="py-6 text-sm text-muted text-center">
          No removed cost codes available.
        </div>
      </template>
      <template #footer>
        <div class="flex justify-between w-full">
          <UButton color="neutral" variant="soft" @click="closeRemovedCostCodesModal">
            Close
          </UButton>
          <UButton
            v-if="removedCostCodesList.length"
            color="primary"
            variant="solid"
            @click="restoreAllRemovedCostCodes"
          >
            Restore All ({{ removedCostCodesList.length }})
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, triggerRef } from 'vue'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import { useCostCodeConfigurationsStore } from '@/stores/costCodeConfigurations'
import CostCodeSelect from '@/components/Shared/CostCodeSelect.vue'
import ChartOfAccountsSelect from '@/components/Shared/ChartOfAccountsSelect.vue'

interface Props {
  poCoUuid?: string | null
  poCoType?: 'PO' | 'CO' | null
  corporationUuid?: string
  readonly?: boolean
  modelValue?: any[]
  removedCostCodes?: any[] // Array of removed cost codes from saved data
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  modelValue: () => [],
  removedCostCodes: () => []
})

const emit = defineEmits<{
  'update:modelValue': [value: any[]]
  'update:removedCostCodes': [value: any[]] // Emit removed cost codes to parent for saving
}>()

const { formatCurrency } = useCurrencyFormat()
const costCodeConfigurationsStore = useCostCodeConfigurationsStore()

// Local state
const loading = ref(false)
const costCodeRows = ref<any[]>([])
const costCodeConfigMap = ref<Map<string, any>>(new Map())
// Local chart of accounts for the form's corporation (not TopBar's)
// This ensures we don't pollute the global store
const localChartOfAccounts = ref<any[]>([])
// Track cost codes that have been explicitly removed by the user
// Store full cost code data for restoration
// Use a reactive array instead of Map for better Vue reactivity
const removedCostCodes = ref<any[]>([])

// Helper to get a Map view of removed cost codes (for efficient lookups)
const removedCostCodesMap = computed(() => {
  const map = new Map<string, any>()
  removedCostCodes.value.forEach((costCode: any) => {
    if (costCode.cost_code_uuid) {
      map.set(costCode.cost_code_uuid, costCode)
    }
  })
  return map
})

// Initialize removed cost codes from props (when loading existing invoice)
const initializeRemovedCostCodes = () => {
  if (Array.isArray(props.removedCostCodes) && props.removedCostCodes.length > 0) {
    // Create a new array to ensure reactivity
    removedCostCodes.value = [...props.removedCostCodes]
  }
}

// Computed
const showTable = computed(() => {
  return props.poCoUuid && props.poCoType
})

// Cost code should be disabled when readonly OR when PO/CO is selected (cost codes come from PO/CO)
const isCostCodeDisabled = computed(() => {
  return props.readonly || !!(props.poCoUuid && props.poCoType)
})

// Computed properties for removed cost codes UI
const removedCostCodesList = computed(() => {
  return removedCostCodes.value
})

const hasRemovedCostCodes = computed(() => {
  return removedCostCodes.value.length > 0
})

const removedCostCodesModalOpen = ref(false)

const openRemovedCostCodesModal = () => {
  removedCostCodesModalOpen.value = true
}

const closeRemovedCostCodesModal = () => {
  removedCostCodesModalOpen.value = false
}

const formatRemovedDate = (dateString: string) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return date.toLocaleString()
  } catch {
    return dateString
  }
}

// Fetch PO items
const fetchPOItems = async (poUuid: string) => {
  try {
    const response = await $fetch<{ data: any[] }>(`/api/purchase-order-items?purchase_order_uuid=${poUuid}`)
    return Array.isArray(response?.data) ? response.data : []
  } catch (error) {
    console.error('[AdvancePaymentCostCodesTable] Error fetching PO items:', error)
    return []
  }
}

// Fetch CO items
const fetchCOItems = async (coUuid: string) => {
  try {
    const response = await $fetch<{ data: any[] }>(`/api/change-order-items?change_order_uuid=${coUuid}`)
    return Array.isArray(response?.data) ? response.data : []
  } catch (error) {
    console.error('[AdvancePaymentCostCodesTable] Error fetching CO items:', error)
    return []
  }
}

// Fetch cost code configurations
const fetchCostCodeConfigurations = async (corporationUuid: string) => {
  if (!corporationUuid) return
  
  try {
    // Fetch configurations for the specific corporation
    await costCodeConfigurationsStore.fetchConfigurations(corporationUuid, false, false)
    
    // Get configurations filtered by corporation (using the store's getter method)
    // This ensures we only get configurations for the specified corporation
    const configs = costCodeConfigurationsStore.getActiveConfigurations(corporationUuid)
    
    // Clear the map and rebuild it with configurations for this corporation only
    costCodeConfigMap.value.clear()
    configs.forEach((config: any) => {
      if (config.uuid) {
        costCodeConfigMap.value.set(config.uuid, config)
      }
    })
  } catch (error) {
    console.error('[AdvancePaymentCostCodesTable] Error fetching cost code configurations:', error)
  }
}

// Fetch chart of accounts directly from API for the form's corporation
// This ensures we don't pollute the global store which is scoped to TopBar's corporation
const fetchChartOfAccounts = async (corporationUuid: string) => {
  if (!corporationUuid) return
  
  try {
    // Fetch accounts directly from API for the form's corporation
    const response = await $fetch<{ data: any[] }>(`/api/corporations/chart-of-accounts?corporation_uuid=${corporationUuid}`)
    
    // Handle different response types
    let accounts: any[] = []
    if (response?.data) {
      accounts = Array.isArray(response.data) ? response.data : []
    } else if (Array.isArray(response)) {
      accounts = response
    }
    
    localChartOfAccounts.value = accounts
    
    console.log('[AdvancePaymentCostCodesTable] Fetched chart of accounts:', {
      corporationUuid,
      count: accounts.length,
      sample: accounts.slice(0, 2).map((a: any) => ({
        uuid: a?.uuid,
        code: a?.code,
        account_name: a?.account_name
      }))
    })
  } catch (error) {
    console.error('[AdvancePaymentCostCodesTable] Error fetching chart of accounts:', error)
    localChartOfAccounts.value = []
  }
}

// Handler for GL account changes
const handleGLAccountChange = (index: number, value: string | null | undefined, account?: any) => {
  if (index < 0 || index >= costCodeRows.value.length) return

  const row = { ...costCodeRows.value[index] }
  row.gl_account_uuid = value || null

  costCodeRows.value[index] = row
  emit('update:modelValue', costCodeRows.value)
}

// Process items and group by cost code
const processItems = async () => {
  if (!props.poCoUuid || !props.poCoType) {
    costCodeRows.value = []
    return
  }

  loading.value = true

  try {
    // Extract UUID from "PO:uuid" or "CO:uuid" format
    const uuid = props.poCoUuid.replace(/^(PO|CO):/, '').trim()
    
    // Fetch items based on type
    const items = props.poCoType === 'PO' 
      ? await fetchPOItems(uuid)
      : await fetchCOItems(uuid)

    // Fetch cost code configurations and chart of accounts if needed
    // This ensures both cost codes and GL accounts are available
    if (props.corporationUuid) {
      await Promise.all([
        fetchCostCodeConfigurations(props.corporationUuid),
        fetchChartOfAccounts(props.corporationUuid)
      ])
    }

    // Group items by cost_code_uuid and calculate totals
    const costCodeMap = new Map<string, {
      cost_code_uuid: string
      cost_code_label: string
      cost_code_number: string
      cost_code_name: string
      totalAmount: number
      items: any[]
    }>()

    items.forEach((item: any, index: number) => {
      // Extract cost_code_uuid - check both direct property and metadata (for CO items)
      const metadata = item?.metadata || item?.display_metadata || item?.displayMetadata || {}
      const costCodeUuid = item.cost_code_uuid || metadata.cost_code_uuid
      
      if (!costCodeUuid) {
        return
      }

      // Skip cost codes that have been explicitly removed by the user
      if (removedCostCodesMap.value.has(costCodeUuid)) {
        return
      }

      // Extract cost code label - check both direct property and metadata
      // If not found, look up from cost code configurations store
      let costCodeLabel = item.cost_code_label || 
        metadata.cost_code_label ||
        metadata.cost_code ||
        (item.cost_code_number && item.cost_code_name 
          ? `${item.cost_code_number} ${item.cost_code_name}`.trim()
          : null) ||
        (metadata.cost_code_number && metadata.cost_code_name
          ? `${metadata.cost_code_number} ${metadata.cost_code_name}`.trim()
          : null)
      
      // If still no label, try to get it from cost code configurations store
      if (!costCodeLabel && costCodeUuid) {
        const costCodeConfig = costCodeConfigMap.value.get(costCodeUuid)
        if (costCodeConfig) {
          const number = costCodeConfig.cost_code_number || ''
          const name = costCodeConfig.cost_code_name || ''
          costCodeLabel = [number, name].filter(Boolean).join(' ').trim() || null
        }
      }
      
      if (!costCodeLabel) {
        return
      }

      // Calculate total for this item
      const itemTotal = props.poCoType === 'PO'
        ? (item.po_total || item.total || 0)
        : (item.co_total || item.total || 0)

      if (costCodeMap.has(costCodeUuid)) {
        const existing = costCodeMap.get(costCodeUuid)!
        existing.totalAmount += Number(itemTotal) || 0
        existing.items.push(item)
      } else {
        // Extract cost code number and name from item or metadata
        // If not found, look up from cost code configurations store
        let costCodeNumber = item.cost_code_number || metadata.cost_code_number || ''
        let costCodeName = item.cost_code_name || metadata.cost_code_name || ''
        
        // If still missing, get from cost code configurations store
        if ((!costCodeNumber || !costCodeName) && costCodeUuid) {
          const costCodeConfig = costCodeConfigMap.value.get(costCodeUuid)
          if (costCodeConfig) {
            costCodeNumber = costCodeNumber || costCodeConfig.cost_code_number || ''
            costCodeName = costCodeName || costCodeConfig.cost_code_name || ''
          }
        }
        
        costCodeMap.set(costCodeUuid, {
          cost_code_uuid: costCodeUuid,
          cost_code_label: costCodeLabel,
          cost_code_number: costCodeNumber,
          cost_code_name: costCodeName,
          totalAmount: Number(itemTotal) || 0,
          items: [item]
        })
      }
    })

    // Build a map of existing rows by cost_code_uuid
    const existingRowsMap = new Map(
      costCodeRows.value
        .filter(row => row.cost_code_uuid)
        .map(row => [row.cost_code_uuid, row])
    )

    // Create new rows only for cost codes that:
    // 1. Are not in the removed set
    // 2. Don't already exist in costCodeRows (to preserve loaded data)
    const newRows = Array.from(costCodeMap.values())
      .filter(costCode => {
        // Skip removed cost codes
        if (removedCostCodesMap.value.has(costCode.cost_code_uuid)) {
          return false
        }
        // Skip cost codes that already exist in costCodeRows (preserve loaded data)
        if (existingRowsMap.has(costCode.cost_code_uuid)) {
          return false
        }
        return true
      })
      .map((costCode, index) => {
        const config = costCodeConfigMap.value.get(costCode.cost_code_uuid)
        const glAccountUuid = config?.gl_account_uuid ?? null
        
        // Debug logging
        console.log('[AdvancePaymentCostCodesTable] Creating row for cost code:', {
          index,
          cost_code_uuid: costCode.cost_code_uuid,
          cost_code_number: costCode.cost_code_number,
          cost_code_name: costCode.cost_code_name,
          configExists: !!config,
          gl_account_uuid: glAccountUuid,
          configGlAccount: config?.gl_account_uuid,
          accountsLoaded: localChartOfAccounts.value.length > 0,
          accountsCount: localChartOfAccounts.value.length
        })
        
        return {
          id: `cost-code-${costCode.cost_code_uuid}-${index}`,
          cost_code_uuid: costCode.cost_code_uuid,
          cost_code_label: costCode.cost_code_label,
          cost_code_number: costCode.cost_code_number,
          cost_code_name: costCode.cost_code_name,
          totalAmount: costCode.totalAmount,
          advanceAmount: null,
          gl_account_uuid: glAccountUuid
        }
      })

    // Update existing rows with new totalAmount from PO/CO (in case it changed)
    // Also populate GL account from cost code configuration if not already set
    const updatedExistingRows = costCodeRows.value.map(row => {
      if (row.cost_code_uuid && costCodeMap.has(row.cost_code_uuid)) {
        const costCode = costCodeMap.get(row.cost_code_uuid)!
        const config = costCodeConfigMap.value.get(row.cost_code_uuid)
        
        // Populate GL account from cost code configuration if not already set
        let glAccountUuid = row.gl_account_uuid
        if (!glAccountUuid && config?.gl_account_uuid) {
          console.log('[AdvancePaymentCostCodesTable] Populating GL account for existing row:', {
            rowId: row.id,
            cost_code_uuid: row.cost_code_uuid,
            cost_code_number: row.cost_code_number,
            existingGlAccount: row.gl_account_uuid,
            newGlAccount: config.gl_account_uuid,
            configExists: !!config
          })
          glAccountUuid = config.gl_account_uuid
        }
        
        return {
          ...row,
          totalAmount: costCode.totalAmount,
          gl_account_uuid: glAccountUuid
        }
      }
      return row
    })

    // Filter out rows that are in the removed set
    const rowsToKeep = updatedExistingRows.filter(
      row => {
        // Keep user-added rows (rows without cost_code_uuid)
        if (!row.cost_code_uuid) {
          return true
        }
        // Remove rows that are in the removed set
        return !removedCostCodesMap.value.has(row.cost_code_uuid)
      }
    )

    // Combine: existing rows (filtered) + new rows
    const finalRows = [...rowsToKeep, ...newRows]
    
    console.log('[AdvancePaymentCostCodesTable] Final rows after processing:', {
      totalRows: finalRows.length,
      rowsWithGlAccount: finalRows.filter(r => r.gl_account_uuid).length,
      accountsLoaded: localChartOfAccounts.value.length > 0,
      accountsCount: localChartOfAccounts.value.length,
      rows: finalRows.map(r => ({
        id: r.id,
        cost_code_uuid: r.cost_code_uuid,
        cost_code_number: r.cost_code_number,
        gl_account_uuid: r.gl_account_uuid
      }))
    })
    
    costCodeRows.value = finalRows
    
    // Wait for next tick to ensure ChartOfAccountsSelect components have received the accounts
    // This ensures the GL account value can be properly displayed
    await nextTick()
    
    // Emit the updated rows
    emit('update:modelValue', costCodeRows.value)
  } catch (error) {
    console.error('[AdvancePaymentCostCodesTable] Error processing items:', error)
    costCodeRows.value = []
  } finally {
    loading.value = false
  }
}

// Handlers
const handleCostCodeChange = async (index: number, value: string | null, option?: any) => {
  if (index < 0 || index >= costCodeRows.value.length) return

  const row = { ...costCodeRows.value[index] }
  row.cost_code_uuid = value || null

  // Update GL account and cost code info
  if (value) {
    // Ensure we have cost code configurations and chart of accounts loaded
    if (props.corporationUuid) {
      if (costCodeConfigMap.value.size === 0) {
        await fetchCostCodeConfigurations(props.corporationUuid)
      }
      // Ensure chart of accounts are loaded so ChartOfAccountsSelect can display the selected value
      if (localChartOfAccounts.value.length === 0) {
        await fetchChartOfAccounts(props.corporationUuid)
      }
    }
    
    const config = costCodeConfigMap.value.get(value)
    
    // Set GL account from cost code configuration if not already set
    if (!row.gl_account_uuid && config?.gl_account_uuid) {
      row.gl_account_uuid = config.gl_account_uuid
    }
    
    // Update cost code label from option if available
    if (option?.costCode) {
      row.cost_code_label = option.costCode.cost_code_label || 
        (option.costCode.cost_code_number && option.costCode.cost_code_name
          ? `${option.costCode.cost_code_number} ${option.costCode.cost_code_name}`.trim()
          : null)
      row.cost_code_number = option.costCode.cost_code_number || ''
      row.cost_code_name = option.costCode.cost_code_name || ''
    } else if (config) {
      // Fallback to config if option not available
      row.cost_code_label = config.cost_code_label || 
        (config.cost_code_number && config.cost_code_name
          ? `${config.cost_code_number} ${config.cost_code_name}`.trim()
          : null)
      row.cost_code_number = config.cost_code_number || ''
      row.cost_code_name = config.cost_code_name || ''
    }
  } else {
    row.gl_account_uuid = null
    row.cost_code_label = null
    row.cost_code_number = ''
    row.cost_code_name = ''
  }

  costCodeRows.value[index] = row
  
  // If GL account was set, ensure accounts are loaded and wait for next tick
  // This ensures ChartOfAccountsSelect can display the selected value
  if (row.gl_account_uuid && localChartOfAccounts.value.length === 0 && props.corporationUuid) {
    await fetchChartOfAccounts(props.corporationUuid)
  }
  
  // Wait for next tick to ensure ChartOfAccountsSelect has received the accounts
  await nextTick()
  
  emit('update:modelValue', costCodeRows.value)
}

const handleAdvanceAmountChange = (index: number, value: string | null) => {
  if (index < 0 || index >= costCodeRows.value.length) return

  const row = { ...costCodeRows.value[index] }
  const numericValue = value === null || value === undefined || value === '' 
    ? null 
    : parseFloat(value)
  
  row.advanceAmount = isNaN(numericValue!) ? null : numericValue

  costCodeRows.value[index] = row
  emit('update:modelValue', costCodeRows.value)
}

const handleAddRow = (afterIndex?: number) => {
  const newRow = {
    id: `new-row-${Date.now()}-${Math.random().toString(36).substring(2)}`,
    cost_code_uuid: null,
    cost_code_label: null,
    cost_code_number: '',
    cost_code_name: '',
    totalAmount: 0,
    advanceAmount: null,
    gl_account_uuid: null
  }

  if (afterIndex !== undefined && afterIndex >= 0) {
    costCodeRows.value.splice(afterIndex + 1, 0, newRow)
  } else {
    costCodeRows.value.push(newRow)
  }

  emit('update:modelValue', costCodeRows.value)
}

const handleRemoveRow = (index: number) => {
  if (index < 0 || index >= costCodeRows.value.length) return

  const rowToRemove = costCodeRows.value[index]
  
  // If the row has a cost_code_uuid that came from PO/CO (not a user-added row),
  // store it in the removed array with full data for restoration
  if (rowToRemove.cost_code_uuid) {
    const removedCostCode = {
      ...rowToRemove,
      removed_at: new Date().toISOString()
    }
    // Create a new array to ensure Vue reactivity tracks the change
    // Check if already removed to avoid duplicates
    const alreadyRemoved = removedCostCodes.value.some(
      (cc: any) => cc.cost_code_uuid === rowToRemove.cost_code_uuid
    )
    
    if (!alreadyRemoved) {
      // Create a new array reference to ensure Vue reactivity
      const newArray = [...removedCostCodes.value, removedCostCode]
      removedCostCodes.value = newArray
      
      // Force reactivity update
      triggerRef(removedCostCodes)
    }
    
    // Emit removed cost codes to parent for saving (only if not initializing)
    // Use nextTick to ensure the array update is complete before emitting
    if (!isInitializingRemovedCostCodes.value) {
      nextTick(() => {
        emitRemovedCostCodes()
      })
    }
  }
  
  costCodeRows.value.splice(index, 1)
  emit('update:modelValue', costCodeRows.value)
}

// Track the last emitted value to prevent watcher from clearing when parent updates
const lastEmittedRemovedCostCodes = ref<any[]>([])

// Emit removed cost codes array to parent
const emitRemovedCostCodes = () => {
  // Skip emitting if we're initializing from props to prevent recursive updates
  if (isInitializingRemovedCostCodes.value) {
    return
  }
  // Create a new array to ensure reactivity
  const arrayToEmit = [...removedCostCodes.value]
  lastEmittedRemovedCostCodes.value = arrayToEmit
  emit('update:removedCostCodes', arrayToEmit)
}

const restoreRemovedCostCode = (index: number) => {
  if (index < 0 || index >= removedCostCodes.value.length) return
  
  const costCodeToRestore = removedCostCodes.value[index]
  if (!costCodeToRestore.cost_code_uuid) return
  
  // Remove from removed array - create new array to ensure reactivity
  removedCostCodes.value = removedCostCodes.value.filter(
    (cc: any) => cc.cost_code_uuid !== costCodeToRestore.cost_code_uuid
  )
  
  // Emit updated removed cost codes (only if not initializing)
  if (!isInitializingRemovedCostCodes.value) {
    emitRemovedCostCodes()
  }
  
  // Create a new row from the removed cost code data
  const restoredRow = {
    id: costCodeToRestore.id || `cost-code-${costCodeToRestore.cost_code_uuid}-${Date.now()}`,
    cost_code_uuid: costCodeToRestore.cost_code_uuid,
    cost_code_label: costCodeToRestore.cost_code_label,
    cost_code_number: costCodeToRestore.cost_code_number,
    cost_code_name: costCodeToRestore.cost_code_name,
    totalAmount: costCodeToRestore.totalAmount || 0,
    advanceAmount: costCodeToRestore.advanceAmount ?? null,
    gl_account_uuid: costCodeToRestore.gl_account_uuid ?? null
  }
  
  // Add the restored row to costCodeRows
  costCodeRows.value.push(restoredRow)
  
  // Emit the updated rows
  emit('update:modelValue', costCodeRows.value)
  
  // Close modal if no more removed items
  if (removedCostCodes.value.length === 0) {
    closeRemovedCostCodesModal()
  }
}

const restoreAllRemovedCostCodes = () => {
  if (removedCostCodes.value.length === 0) return
  
  const restoredRows: any[] = []
  
  removedCostCodes.value.forEach((costCode: any) => {
    if (costCode.cost_code_uuid) {
      const restoredRow = {
        id: costCode.id || `cost-code-${costCode.cost_code_uuid}-${Date.now()}`,
        cost_code_uuid: costCode.cost_code_uuid,
        cost_code_label: costCode.cost_code_label,
        cost_code_number: costCode.cost_code_number,
        cost_code_name: costCode.cost_code_name,
        totalAmount: costCode.totalAmount || 0,
        advanceAmount: costCode.advanceAmount ?? null,
        gl_account_uuid: costCode.gl_account_uuid ?? null
      }
      restoredRows.push(restoredRow)
    }
  })
  
  // Add all restored rows to costCodeRows
  costCodeRows.value.push(...restoredRows)
  
  // Clear the removed array - create new empty array to ensure reactivity
  removedCostCodes.value = []
  
  // Emit updated removed cost codes (empty array) - only if not initializing
  if (!isInitializingRemovedCostCodes.value) {
    emitRemovedCostCodes()
  }
  
  // Emit the updated rows
  emit('update:modelValue', costCodeRows.value)
  
  // Close modal
  closeRemovedCostCodesModal()
}

// Guard flag to prevent recursive updates when initializing from props
const isInitializingRemovedCostCodes = ref(false)

// Watch for removedCostCodes prop changes (when loading existing invoice)
watch(
  () => props.removedCostCodes,
  (newRemovedCostCodes, oldRemovedCostCodes) => {
    // Skip if we're currently emitting to prevent recursive updates
    if (isInitializingRemovedCostCodes.value) {
      return
    }
    
    const newArray = Array.isArray(newRemovedCostCodes) ? newRemovedCostCodes : []
    const oldArray = Array.isArray(oldRemovedCostCodes) ? oldRemovedCostCodes : []
    const lastEmitted = lastEmittedRemovedCostCodes.value
    
    // Check if this update matches what we just emitted (to prevent clearing our own updates)
    const matchesLastEmitted = JSON.stringify(newArray) === JSON.stringify(lastEmitted)
    
    // Skip if the value matches what we just emitted (prevent clearing our own updates)
    if (matchesLastEmitted && newArray.length > 0) {
      return
    }
    
    // Skip if the value hasn't actually changed (deep comparison)
    if (newArray.length === oldArray.length && 
        newArray.length === 0 && 
        removedCostCodes.value.length === 0) {
      // Both are empty and array is empty, no change needed
      return
    }
    
    if (Array.isArray(newRemovedCostCodes) && newRemovedCostCodes.length > 0) {
      // Only initialize if the array is empty (to avoid overwriting during editing)
      if (removedCostCodes.value.length === 0) {
        isInitializingRemovedCostCodes.value = true
        try {
          initializeRemovedCostCodes()
        } finally {
          nextTick(() => {
            isInitializingRemovedCostCodes.value = false
          })
        }
      }
    } else if (Array.isArray(newRemovedCostCodes) && newRemovedCostCodes.length === 0) {
      // Only clear if:
      // 1. We actually have items to clear
      // 2. The old prop value had items (meaning parent intentionally cleared it, not a race condition)
      // 3. This doesn't match what we just emitted
      if (removedCostCodes.value.length > 0 && oldArray.length > 0 && !matchesLastEmitted) {
        // Parent intentionally cleared it (old had items, new is empty, and we didn't just emit this)
        isInitializingRemovedCostCodes.value = true
        try {
          // Create new empty array to ensure reactivity
          removedCostCodes.value = []
        } finally {
          nextTick(() => {
            isInitializingRemovedCostCodes.value = false
          })
        }
      }
    }
  },
  { immediate: true, deep: true }
)

// Watch for PO/CO changes
watch(
  [() => props.poCoUuid, () => props.poCoType, () => props.corporationUuid],
  (newValues, oldValues) => {
    // Clear removed cost codes when PO/CO changes (switching to a different PO/CO)
    const [newPoCoUuid, newPoCoType] = newValues || []
    const [oldPoCoUuid, oldPoCoType] = oldValues || []
    
    if (newPoCoUuid !== oldPoCoUuid || newPoCoType !== oldPoCoType) {
      // Create new empty array to ensure reactivity
      removedCostCodes.value = []
      // Only emit if not initializing to prevent recursive updates
      if (!isInitializingRemovedCostCodes.value) {
        emitRemovedCostCodes()
      }
    }
    
    processItems()
  },
  { immediate: true }
)

// Watch for external modelValue changes (e.g., when loading existing data)
watch(
  () => props.modelValue,
  async (newValue) => {
    if (Array.isArray(newValue) && newValue.length > 0) {
      // Fetch cost code configurations and chart of accounts first to populate GL accounts
      if (props.corporationUuid) {
        await Promise.all([
          fetchCostCodeConfigurations(props.corporationUuid),
          fetchChartOfAccounts(props.corporationUuid)
        ])
      }
      
      // Map database field names to component field names
      const mappedRows = newValue.map((row: any) => {
        // Get cost code configuration to populate GL account if not already set
        let glAccountUuid = row.gl_account_uuid || null
        if (!glAccountUuid && row.cost_code_uuid) {
          const config = costCodeConfigMap.value.get(row.cost_code_uuid)
          if (config?.gl_account_uuid) {
            glAccountUuid = config.gl_account_uuid
          }
        }
        
        return {
          id: row.id || row.uuid || `row-${Date.now()}-${Math.random().toString(36).substring(2)}`,
          cost_code_uuid: row.cost_code_uuid || null,
          cost_code_label: row.cost_code_label || null,
          cost_code_number: row.cost_code_number || null,
          cost_code_name: row.cost_code_name || null,
          totalAmount: row.totalAmount || row.total_amount || 0,
          advanceAmount: row.advanceAmount !== undefined ? row.advanceAmount : (row.advance_amount !== undefined ? row.advance_amount : null),
          gl_account_uuid: glAccountUuid
        }
      })
      
      // Build a set of cost codes that are present in the loaded data
      const presentCostCodeUuids = new Set(
        mappedRows
          .filter(row => row.cost_code_uuid)
          .map(row => row.cost_code_uuid)
      )
      
      // If we have saved removed cost codes from props, use those first
      // Otherwise, if we have a PO/CO selected and we're loading existing data (not processing),
      // identify which cost codes from PO/CO are missing - these are the removed ones
      // This handles backward compatibility for invoices saved before removed cost codes tracking
      if (props.poCoUuid && props.poCoType && !loading.value && costCodeRows.value.length === 0) {
        // If we already have removed cost codes from props, don't try to identify them
        // (they were already loaded from saved data)
        if (removedCostCodes.value.length === 0) {
          try {
            // Extract UUID from "PO:uuid" or "CO:uuid" format
            const uuid = props.poCoUuid.replace(/^(PO|CO):/, '').trim()
            
            // Fetch items to see what cost codes exist in PO/CO
            const items = props.poCoType === 'PO' 
              ? await fetchPOItems(uuid)
              : await fetchCOItems(uuid)
            
            // Get all unique cost code UUIDs from PO/CO items
            const allCostCodeUuids = new Set(
              items
                .map((item: any) => item.cost_code_uuid)
                .filter(Boolean)
            )
            
            // Cost codes that exist in PO/CO but not in the loaded data are removed
            // Group items by cost code to get accurate totals (same as processItems)
            const costCodeMap = new Map<string, {
              cost_code_uuid: string
              cost_code_label: string
              cost_code_number: string
              cost_code_name: string
              totalAmount: number
            }>()
            
            items.forEach((item: any) => {
              const costCodeUuid = item.cost_code_uuid
              if (!costCodeUuid) return
              
              const costCodeLabel = item.cost_code_label || 
                (item.cost_code_number && item.cost_code_name 
                  ? `${item.cost_code_number} ${item.cost_code_name}`.trim()
                  : null)
              
              if (!costCodeLabel) return
              
              const itemTotal = props.poCoType === 'PO'
                ? (item.po_total || item.total || 0)
                : (item.co_total || item.total || 0)
              
              if (costCodeMap.has(costCodeUuid)) {
                const existing = costCodeMap.get(costCodeUuid)!
                existing.totalAmount += Number(itemTotal) || 0
              } else {
                costCodeMap.set(costCodeUuid, {
                  cost_code_uuid: costCodeUuid,
                  cost_code_label: costCodeLabel,
                  cost_code_number: item.cost_code_number || '',
                  cost_code_name: item.cost_code_name || '',
                  totalAmount: Number(itemTotal) || 0
                })
              }
            })
            
            // Store removed cost codes with full data - create new array to ensure reactivity
            const newRemovedArray: any[] = [...removedCostCodes.value]
            costCodeMap.forEach((costCode) => {
              if (!presentCostCodeUuids.has(costCode.cost_code_uuid)) {
                // Check if already in array to avoid duplicates
                const alreadyExists = newRemovedArray.some(
                  (cc: any) => cc.cost_code_uuid === costCode.cost_code_uuid
                )
                if (!alreadyExists) {
                  newRemovedArray.push({
                    ...costCode,
                    advanceAmount: null,
                    gl_account_uuid: null,
                    removed_at: new Date().toISOString()
                  })
                }
              }
            })
            removedCostCodes.value = newRemovedArray
            
            // Emit removed cost codes so they can be saved
            if (removedCostCodes.value.length > 0) {
              emitRemovedCostCodes()
            }
          } catch (error) {
            console.error('[AdvancePaymentCostCodesTable] Error identifying removed cost codes:', error)
          }
        }
      }
      
      // Only update if the rows are actually different to avoid infinite loops
      const currentIds = new Set(costCodeRows.value.map(r => r.id))
      const newIds = new Set(mappedRows.map((r: any) => r.id))
      
      // Check if GL accounts were populated (even if IDs are the same)
      const glAccountsPopulated = mappedRows.some((row: any, index: number) => {
        const currentRow = costCodeRows.value[index]
        return row.gl_account_uuid && (!currentRow || currentRow.gl_account_uuid !== row.gl_account_uuid)
      })
      
      if (currentIds.size !== newIds.size || 
          !Array.from(currentIds).every(id => newIds.has(id)) ||
          glAccountsPopulated) {
        costCodeRows.value = mappedRows
        
        // Wait for next tick to ensure ChartOfAccountsSelect components have received the accounts
        // This ensures the GL account value can be properly displayed
        await nextTick()
        
        // Emit update to ensure parent component knows about GL account changes
        if (glAccountsPopulated) {
          emit('update:modelValue', costCodeRows.value)
        }
      }
    } else if (Array.isArray(newValue) && newValue.length === 0 && costCodeRows.value.length > 0) {
      // Only clear if we're not in the middle of processing
      if (!loading.value) {
        costCodeRows.value = []
        // Clear removed cost codes when modelValue is cleared
        // Create new empty array to ensure reactivity
        removedCostCodes.value = []
      }
    }
  },
  { deep: true }
)

// Watch for corporation changes to fetch cost code configurations and chart of accounts
watch(
  () => props.corporationUuid,
  async (newCorpUuid, oldCorpUuid) => {
    if (newCorpUuid && newCorpUuid !== oldCorpUuid) {
      // Clear local chart of accounts when corporation changes
      localChartOfAccounts.value = []
      
      // Fetch cost code configurations and chart of accounts when corporation changes
      await Promise.all([
        fetchCostCodeConfigurations(newCorpUuid),
        fetchChartOfAccounts(newCorpUuid)
      ])
      
      // Update GL accounts in existing rows if they're not set
      if (costCodeRows.value.length > 0) {
        const updatedRows = costCodeRows.value.map((row: any) => {
          if (!row.gl_account_uuid && row.cost_code_uuid) {
            const config = costCodeConfigMap.value.get(row.cost_code_uuid)
            if (config?.gl_account_uuid) {
              return {
                ...row,
                gl_account_uuid: config.gl_account_uuid
              }
            }
          }
          return row
        })
        
        // Only update if any GL accounts were populated
        const hasChanges = updatedRows.some((row: any, index: number) => 
          row.gl_account_uuid !== costCodeRows.value[index]?.gl_account_uuid
        )
        
      if (hasChanges) {
        costCodeRows.value = updatedRows
        
        // Wait for next tick to ensure ChartOfAccountsSelect components have received the accounts
        await nextTick()
        
        emit('update:modelValue', costCodeRows.value)
      }
    }
  } else if (!newCorpUuid) {
    // Clear local chart of accounts when corporation is cleared
    localChartOfAccounts.value = []
  }
  },
  { immediate: false }
)

// Initialize
onMounted(async () => {
  // Fetch cost code configurations and chart of accounts on mount to ensure GL accounts are available
  if (props.corporationUuid) {
    await Promise.all([
      fetchCostCodeConfigurations(props.corporationUuid),
      fetchChartOfAccounts(props.corporationUuid)
    ])
    
    // If we have existing data in modelValue, populate GL accounts after fetching configs
    if (Array.isArray(props.modelValue) && props.modelValue.length > 0) {
      const updatedRows = costCodeRows.value.map((row: any) => {
        if (!row.gl_account_uuid && row.cost_code_uuid) {
          const config = costCodeConfigMap.value.get(row.cost_code_uuid)
          if (config?.gl_account_uuid) {
            return {
              ...row,
              gl_account_uuid: config.gl_account_uuid
            }
          }
        }
        return row
      })
      
      // Check if any GL accounts were populated
      const hasChanges = updatedRows.some((row: any, index: number) => 
        row.gl_account_uuid !== costCodeRows.value[index]?.gl_account_uuid
      )
      
      if (hasChanges) {
        costCodeRows.value = updatedRows
        
        // Wait for next tick to ensure ChartOfAccountsSelect components have received the accounts
        await nextTick()
        
        emit('update:modelValue', costCodeRows.value)
      }
    }
  }
  
  // Initialize removed cost codes from props if available
  initializeRemovedCostCodes()
})
</script>

