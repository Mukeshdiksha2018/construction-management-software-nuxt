<template>
  <div class="flex items-center gap-2">
    <UAvatar
      v-if="selectedCustomerOption?.avatar"
      v-bind="selectedCustomerOption.avatar"
      size="xs"
      class="flex-shrink-0"
    />
    <USelectMenu
      v-model="selectedCustomerObject"
      :items="customerOptions"
      :filter-fields="['label', 'searchText']"
      :placeholder="getPlaceholder"
      :searchable="searchable"
      :searchable-placeholder="searchablePlaceholder"
      :size="size"
      :class="className"
      :disabled="disabled || loading || !isEnabled"
      :loading="loading"
      :ui="menuUi"
      value-key="value"
      label-key="label"
      clearable
      @update:model-value="handleSelection"
    >
      <template #item-label="{ item }">
        <div class="flex items-center gap-2 w-full">
          <UAvatar
            v-if="item.avatar"
            v-bind="item.avatar"
            size="xs"
            class="flex-shrink-0"
          />
          <div class="flex flex-col flex-1 min-w-0">
            <span class="font-medium whitespace-normal break-words text-left">
              {{ item.label }}
            </span>
            <span v-if="item.description" class="text-xs text-muted truncate">
              {{ item.description }}
            </span>
          </div>
        </div>
      </template>
    </USelectMenu>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCustomerStore } from '@/stores/customers'

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
  projectUuid?: string
  localCustomers?: any[] // Optional local customers array (takes precedence over store)
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select customer...',
  searchable: true,
  searchablePlaceholder: 'Type to search...',
  size: 'sm',
  className: 'flex-1 min-w-0',
  disabled: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'change': [customer: any]
}>()

// Store
const customerStore = useCustomerStore()

// Local state
const selectedCustomer = ref<string | undefined>(props.modelValue)
const selectedCustomerObject = ref<any>(undefined)

// UI configuration for dropdown
const menuUi = {
  content: 'max-h-60 min-w-full w-max',
  item: {
    base: 'whitespace-normal break-words',
    label: 'whitespace-normal break-words text-left'
  }
}

// Local state for customers fetched from API
const customers = ref<any[]>([])
const loading = ref(false)

// Computed property to check if component is enabled
// Allow selection when corporation is selected (project is optional for new projects)
const isEnabled = computed(() => {
  return !!props.corporationUuid
})

// Computed property for placeholder
const getPlaceholder = computed(() => {
  if (!props.corporationUuid) return 'Select corporation first'
  return props.placeholder
})

// Helper function to compute initials from customer name
const computeInitials = (customer: any) => {
  const segments = [
    customer.first_name,
    customer.last_name
  ]
    .filter((value: any) => typeof value === 'string' && value.trim().length > 0)
    .map((value: string) => value.trim()[0]?.toUpperCase())
    .join('')
  
  if (segments.length) return segments
  
  // Fallback to company name or email
  if (customer.company_name) {
    return customer.company_name.trim()[0]?.toUpperCase() || 'C'
  }
  
  if (customer.customer_email) {
    return customer.customer_email.trim()[0]?.toUpperCase() || 'C'
  }
  
  return 'C'
}

// Fetch customers from API
const fetchCustomersFromAPI = async (corporationUuid: string, projectUuid?: string) => {
  if (!corporationUuid) {
    customers.value = []
    return
  }
  
  // If local customers are provided, use them instead of fetching from store
  if (props.localCustomers !== undefined && Array.isArray(props.localCustomers)) {
    let filteredCustomers = props.localCustomers.filter(customer => 
      customer.corporation_uuid === corporationUuid
    )
    
    // If project is specified, show customers for this project OR customers with no project (global)
    if (projectUuid) {
      filteredCustomers = filteredCustomers.filter(customer =>
        !customer.project_uuid || customer.project_uuid === projectUuid
      )
    }
    
    customers.value = filteredCustomers
    return
  }
  
  loading.value = true
  try {
    await customerStore.fetchCustomers(corporationUuid, projectUuid || null, false)
    // Filter customers by corporation and optionally by project
    // Show customers that match the corporation and either:
    // 1. Have no project_uuid (global customers for the corporation)
    // 2. Have project_uuid matching the selected project (if project is specified)
    let filteredCustomers = customerStore.customers.filter(customer => 
      customer.corporation_uuid === corporationUuid
    )
    
    // If project is specified, show customers for this project OR customers with no project (global)
    if (projectUuid) {
      filteredCustomers = filteredCustomers.filter(customer =>
        !customer.project_uuid || customer.project_uuid === projectUuid
      )
    }
    // If no project specified, show all customers for the corporation (both with and without project)
    
    customers.value = filteredCustomers
  } catch (error: any) {
    console.error('Failed to fetch customers:', error)
    customers.value = []
  } finally {
    loading.value = false
  }
}

// Computed properties for customer options
const customerOptions = computed(() => {
  return customers.value.map((customer) => {
    // Build full name
    const nameParts = [
      customer.salutation,
      customer.first_name,
      customer.middle_name,
      customer.last_name
    ].filter(Boolean)
    const fullName = nameParts.join(' ').trim()
    
    // Use full name or company name as label
    const label = fullName || customer.company_name || 'Unnamed Customer'
    
    // Build description (company name or email)
    const description = customer.company_name || customer.customer_email || null
    
    // Build avatar
    const alt = label
    const avatar = customer.profile_image_url
      ? {
          src: customer.profile_image_url,
          alt,
          size: 'xs' as const,
        }
      : {
          alt,
          text: computeInitials(customer),
          size: 'xs' as const,
        }
    
    return {
      label,
      value: customer.uuid,
      id: customer.id,
      customer: customer,
      description,
      avatar,
      searchText: `${fullName} ${customer.company_name || ''} ${customer.customer_email || ''} ${customer.uuid}`.toLowerCase()
    }
  })
})

// Create a Map for fast O(1) lookup of customer options by UUID
const customerOptionsMap = computed(() => {
  return new Map(customerOptions.value.map(customer => [customer.value, customer]))
})

// Computed property for selected customer option (for avatar display)
const selectedCustomerOption = computed(() => {
  if (!selectedCustomer.value) return undefined
  return customerOptionsMap.value.get(selectedCustomer.value) || undefined
})

// Find the selected customer object for display
const updateSelectedObject = () => {
  if (!selectedCustomer.value) {
    selectedCustomerObject.value = undefined
  } else {
    selectedCustomerObject.value = customerOptionsMap.value.get(selectedCustomer.value) || undefined
  }
}

// Methods
const handleSelection = (customer: any) => {
  if (!customer) {
    selectedCustomer.value = undefined
    emit('update:modelValue', undefined)
    return
  }
  
  // Handle both string (UUID) and object formats
  let customerValue: string | undefined
  let customerObject: any
  
  if (typeof customer === 'string') {
    // USelectMenu passed the UUID string directly
    customerValue = customer
    customerObject = customerOptionsMap.value.get(customer)
  } else if (customer && typeof customer === 'object') {
    // USelectMenu passed an object (should have value property)
    customerValue = customer.value || customer.uuid || customer.id
    customerObject = customer
  } else {
    selectedCustomer.value = undefined
    emit('update:modelValue', undefined)
    return
  }
  
  if (!customerValue) {
    selectedCustomer.value = undefined
    emit('update:modelValue', undefined)
    return
  }
  
  selectedCustomer.value = customerValue
  emit('update:modelValue', customerValue)
  emit('change', customerObject || customer)
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  selectedCustomer.value = newValue
  updateSelectedObject()
})

watch(customerOptions, () => {
  updateSelectedObject()
}, { immediate: true })

watch(selectedCustomer, () => {
  updateSelectedObject()
})

// Watch for corporation and project changes and fetch customers from API
watch(
  [() => props.corporationUuid, () => props.projectUuid],
  async ([newCorpUuid, newProjectUuid], [oldCorpUuid, oldProjectUuid]) => {
    // Clear selected customer when corporation changes (but not when only project changes)
    if (newCorpUuid !== oldCorpUuid && oldCorpUuid) {
      selectedCustomer.value = undefined
      selectedCustomerObject.value = undefined
      emit('update:modelValue', undefined)
    }
    
    // Fetch customers from API when corporation is available
    // Project is optional - if provided, filter by it; otherwise show all customers for corporation
    if (newCorpUuid) {
      await fetchCustomersFromAPI(newCorpUuid, newProjectUuid)
    } else {
      customers.value = []
    }
  },
  { immediate: true }
)

// Watch customerStore for changes and update local customers list (only if not using localCustomers)
// This ensures the dropdown refreshes when a new customer is added without another API call
watch(
  () => customerStore.customers,
  () => {
    // Only watch store if localCustomers prop is not provided
    if (props.localCustomers === undefined && props.corporationUuid) {
      // Filter customers from store when it updates (no need to fetch again)
      let filteredCustomers = customerStore.customers.filter(customer => 
        customer.corporation_uuid === props.corporationUuid
      )
      
      // If project is specified, show customers for this project OR customers with no project (global)
      if (props.projectUuid) {
        filteredCustomers = filteredCustomers.filter(customer =>
          !customer.project_uuid || customer.project_uuid === props.projectUuid
        )
      }
      
      customers.value = filteredCustomers
    }
  },
  { deep: true }
)

// Watch localCustomers prop for changes (when using local customers instead of store)
watch(
  () => props.localCustomers,
  () => {
    if (props.localCustomers !== undefined && Array.isArray(props.localCustomers) && props.corporationUuid) {
      let filteredCustomers = props.localCustomers.filter(customer => 
        customer.corporation_uuid === props.corporationUuid
      )
      
      // If project is specified, show customers for this project OR customers with no project (global)
      if (props.projectUuid) {
        filteredCustomers = filteredCustomers.filter(customer =>
          !customer.project_uuid || customer.project_uuid === props.projectUuid
        )
      }
      
      customers.value = filteredCustomers
    }
  },
  { deep: true, immediate: true }
)

// Load data if needed on mount
if (props.corporationUuid) {
  fetchCustomersFromAPI(props.corporationUuid, props.projectUuid)
}
</script>

