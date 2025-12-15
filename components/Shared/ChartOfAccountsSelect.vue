<template>
  <USelectMenu
    v-model="selectedAccountObject"
    :items="accountOptions"
    :filter-fields="['label', 'account_type', 'searchText']"
    :placeholder="placeholder"
    :searchable="searchable"
    :searchable-placeholder="searchablePlaceholder"
    :size="size"
    :class="className"
    :disabled="disabled"
    value-key="value"
    @update:model-value="handleSelection"
  >

    <template #item-label="{ item }">
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="truncate font-medium">{{ item.label }}</span>
            <UBadge
              :color="item.account_type_color"
              variant="solid"
              size="xs"
            >
              {{ item.account_type }}
            </UBadge>
          </div>
        </div>
        <div v-if="item.isMapped" class="flex-shrink-0 ml-2">
          <UBadge
            color="info"
            variant="solid"
            size="xs"
          >
            → {{ item.defaultAccountCode }}
          </UBadge>
        </div>
      </div>
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useChartOfAccountsStore } from '@/stores/chartOfAccounts'

// Props
interface Props {
  modelValue?: string
  placeholder?: string
  searchable?: boolean
  searchablePlaceholder?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  disabled?: boolean
  corporationUuid?: string
  localAccounts?: any[] // Optional local accounts array (takes precedence over store)
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search account...',
  searchable: true,
  searchablePlaceholder: 'Type to search...',
  size: 'sm',
  className: 'w-full',
  disabled: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'change': [account: any]
}>()

// Stores
const chartOfAccountsStore = useChartOfAccountsStore()

// Local state
const selectedAccount = ref<string | undefined>(props.modelValue)
const selectedAccountObject = ref<any>(undefined)

// Helper function to get account type color
const getAccountTypeColor = (accountType: string): "error" | "warning" | "info" | "success" | "primary" | "secondary" | "neutral" => {
  const typeColors: Record<string, "error" | "warning" | "info" | "success" | "primary" | "secondary" | "neutral"> = {
    'Asset': 'success',
    'Liability': 'error',
    'Equity': 'primary',
    'Revenue': 'info',
    'Expense': 'warning',
    'Income': 'info',
    'Cost of Goods Sold': 'warning',
  };
  return typeColors[accountType] || 'neutral';
};

// Use local accounts if provided, otherwise use store account options
const accountOptions = computed(() => {
  // If local accounts are provided, format them similar to store
  if (props.localAccounts !== undefined) {
    return props.localAccounts.map((account: any) => ({
      label: `${account.code} - ${account.account_name}`,
      value: account.uuid,
      account_type: account.account_type,
      account_type_color: getAccountTypeColor(account.account_type),
      isMapped: false,
      defaultAccountCode: undefined,
      defaultAccountName: undefined,
      searchText: `${account.code} ${account.account_name} ${account.account_type}`,
    }));
  }
  
  // Otherwise use pre-computed account options from the store
  return chartOfAccountsStore.accountOptions;
})

// Create a Map for fast O(1) lookup of account options by UUID
const accountOptionsMap = computed(() => {
  return new Map(accountOptions.value.map(acc => [acc.value, acc]))
})

// Find the selected account object for display (optimized with Map for O(1) lookup)
const updateSelectedObject = () => {
  if (!selectedAccount.value) {
    selectedAccountObject.value = undefined
  } else {
    selectedAccountObject.value = accountOptionsMap.value.get(selectedAccount.value) || undefined
  }
}

// Methods
const handleSelection = (account: any) => {
  if (account) {
    selectedAccount.value = account.value
    emit('update:modelValue', account.value)
    emit('change', account)
  } else {
    selectedAccount.value = undefined
    emit('update:modelValue', undefined)
  }
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  selectedAccount.value = newValue
  updateSelectedObject()
})

watch(accountOptions, () => {
  // Only validate if accounts are actually loaded and we have a corporation
  // This prevents clearing valid selections when accounts are still being fetched
  if (selectedAccount.value && props.corporationUuid) {
    // Check if accounts have been fetched for this corporation
    const hasAccountsForCorp = accountOptions.value.length > 0
    
    // Only validate if accounts are loaded and not currently loading
    if (hasAccountsForCorp && !chartOfAccountsStore.loading) {
      const isValid = accountOptions.value.some(acc => acc.value === selectedAccount.value)
      if (!isValid) {
        console.log('[ChartOfAccountsSelect] Selection no longer valid in new account options, clearing')
        selectedAccount.value = undefined
        emit('update:modelValue', undefined)
        emit('change', undefined)
      } else {
        // Selection is valid, just update the display object
        updateSelectedObject()
      }
    } else {
      // Accounts not loaded yet or still loading, just update display if we have a selection
      // Don't clear the selection - wait for accounts to load first
      updateSelectedObject()
    }
  } else {
    // No selection or no corporation, just update display
    updateSelectedObject()
  }
}, { immediate: true })

watch(selectedAccount, () => {
  updateSelectedObject()
})

// Watch for corporation changes and refetch accounts (only if local accounts are not provided)
watch(() => props.corporationUuid, async (newCorporationUuid, oldCorporationUuid) => {
  // If local accounts are provided, don't fetch from store
  if (props.localAccounts !== undefined) {
    return;
  }
  
  if (newCorporationUuid && newCorporationUuid !== oldCorporationUuid) {
    console.log('[ChartOfAccountsSelect] Corporation changed, fetching accounts for:', newCorporationUuid)
    
    // Store the current selection before fetching
    const currentSelection = selectedAccount.value
    
    // Fetch accounts for the new corporation (with force refresh to ensure fresh data)
    await chartOfAccountsStore.fetchAccounts(newCorporationUuid, true, true)
    
    // After fetching, check if the current selection is still valid
    // Only clear if it's truly invalid (not just because accounts weren't loaded yet)
    if (currentSelection && accountOptions.value.length > 0) {
      const isValid = accountOptions.value.some(acc => acc.value === currentSelection)
      if (!isValid) {
        console.log('[ChartOfAccountsSelect] Selection invalid after corporation change, clearing')
        selectedAccount.value = undefined
        emit('update:modelValue', undefined)
        emit('change', undefined)
      } else {
        // Selection is still valid, update display
        updateSelectedObject()
      }
    } else if (currentSelection) {
      // Accounts loaded but selection not found - might be invalid, but wait for next update
      updateSelectedObject()
    }
  }
}, { immediate: true })

// Load data if needed on mount (only if local accounts are not provided)
if (props.localAccounts === undefined && props.corporationUuid) {
  // If we have a modelValue but no accounts, fetch accounts first
  // This ensures the selection is preserved when loading existing data
  if (props.modelValue && chartOfAccountsStore.accounts.length === 0) {
    chartOfAccountsStore.fetchAccounts(props.corporationUuid).then(() => {
      // After accounts are loaded, update the selected object
      updateSelectedObject()
    })
  } else if (chartOfAccountsStore.accounts.length === 0) {
    chartOfAccountsStore.fetchAccounts(props.corporationUuid)
  } else {
    // Accounts already loaded, just update the selected object
    updateSelectedObject()
  }
} else if (props.localAccounts !== undefined) {
  // Local accounts provided, just update the selected object
  updateSelectedObject()
}

</script>
