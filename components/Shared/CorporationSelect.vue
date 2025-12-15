<template>
  <USelectMenu
    v-model="selectedCorporationObject"
    :items="corporationOptions"
    :filter-fields="['label', 'searchText']"
    :placeholder="placeholder"
    :searchable="searchable"
    :searchable-placeholder="searchablePlaceholder"
    :size="size"
    :class="className"
    :disabled="disabled || !hasAccessibleCorporations"
    value-key="value"
    :ui="menuUi"
    @update:model-value="handleSelection"
  >
    <template #default>
      <div v-if="selectedCorporationObject" class="flex items-center gap-2 truncate">
        <UIcon v-if="showIcon" name="ri:building-fill" class="w-4 h-4 flex-shrink-0" />
        <span class="truncate">
          {{ selectedCorporationObject.corporation_name }}
          <template v-if="showLegalName && selectedCorporationObject.legal_name && selectedCorporationObject.legal_name.trim()">
            - ({{ selectedCorporationObject.legal_name }})
          </template>
        </span>
      </div>
      <span v-else class="text-muted">
        {{ hasAccessibleCorporations ? placeholder : 'No corporations accessible' }}
      </span>
    </template>
    
    <template #item-label="{ item }">
      <div class="flex items-center gap-2 w-full">
        <UIcon v-if="showIcon" name="ri:building-fill" class="w-4 h-4 text-primary flex-shrink-0" />
        <div class="flex flex-col min-w-0 flex-1">
          <span class="font-medium text-sm truncate">{{ item.corporation_name }}</span>
          <span v-if="showLegalName && item.legal_name && item.legal_name.trim()" class="text-xs text-muted truncate">{{ item.legal_name }}</span>
        </div>
      </div>
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCorporationStore } from '@/stores/corporations'
import { useUserProfilesStore } from '@/stores/userProfiles'
import { useRoleStore } from '@/stores/roles'
import { useAuthStore } from '@/stores/auth'

// Props
interface Props {
  modelValue?: string
  placeholder?: string
  searchable?: boolean
  searchablePlaceholder?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  disabled?: boolean
  showIcon?: boolean
  showLegalName?: boolean
  filterBySuperAdmin?: boolean
  // When true, always restrict options strictly to the user's corporationAccess list,
  // regardless of role (no Super Admin bypass).
  restrictToCorporationAccess?: boolean
  ui?: any
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search corporation...',
  searchable: true,
  searchablePlaceholder: 'Type to search corporations...',
  size: 'sm',
  className: 'w-full',
  disabled: false,
  showIcon: true,
  showLegalName: true,
  filterBySuperAdmin: true,
  restrictToCorporationAccess: false
})

const defaultUi = {
  content: 'max-h-80 min-w-full w-max max-w-xl'
}

const menuUi = computed(() => {
  return {
    ...defaultUi,
    ...(props.ui || {})
  }
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'change': [corporation: any]
}>()

// Stores
const corporationStore = useCorporationStore()
const authStore = useAuthStore()
const userProfilesStore = useUserProfilesStore()
const roleStore = useRoleStore()

// Local state
const selectedCorporation = ref<string | undefined>(props.modelValue)
const selectedCorporationObject = ref<any>(undefined)

// Get current user from userProfiles store
const currentUser = computed(() => {
  if (!authStore.user?.email) return null
  return userProfilesStore.users.find(user => user.email === authStore.user.email)
})

// Check if current user is a Super Admin
const isSuperAdmin = computed(() => {
  if (!props.filterBySuperAdmin) return false
  if (!currentUser.value?.roleId) return false
  const role = roleStore.roles.find(r => r.id === currentUser.value?.roleId)
  return role?.role_name === 'Super Admin'
})

// Filter corporations based on user's access
const accessibleCorporations = computed(() => {
  // If no current user, return empty array
  if (!currentUser.value) {
    return []
  }

  const allCorporations = corporationStore.corporations
  const accessList = currentUser.value.corporationAccess || []

  // When restrictToCorporationAccess is true, ALWAYS respect the access list
  // (no Super Admin bypass, and no fallback to "all corporations").
  if (props.restrictToCorporationAccess) {
    if (!accessList.length) {
      return []
    }
    return allCorporations.filter(corp => accessList.includes(corp.uuid))
  }

  // Legacy behaviour (for other call sites):
  // - If not filtering by super admin at all, return all.
  if (!props.filterBySuperAdmin) {
    return allCorporations
  }

  // - Super Admins can see everything.
  if (isSuperAdmin.value) {
    return allCorporations
  }

  // - Non‑super users with no access list see nothing.
  if (!accessList.length) {
    return []
  }

  return allCorporations.filter(corp => accessList.includes(corp.uuid))
})

// Check if user has any accessible corporations
const hasAccessibleCorporations = computed(() => {
  return accessibleCorporations.value.length > 0
})

// Computed properties for corporation options
const corporationOptions = computed(() => {
  return accessibleCorporations.value.map((corp) => {
    const hasLegalName = corp.legal_name && corp.legal_name.trim()
    return {
      label: hasLegalName 
        ? `${corp.corporation_name} - (${corp.legal_name})`
        : corp.corporation_name,
      value: corp.uuid,
      corporation_name: corp.corporation_name,
      legal_name: corp.legal_name,
      searchText: `${corp.corporation_name} ${corp.legal_name || ''} ${corp.uuid}`.toLowerCase()
    }
  })
})

// Create a Map for fast O(1) lookup of corporation options by UUID
const corporationOptionsMap = computed(() => {
  return new Map(corporationOptions.value.map(corp => [corp.value, corp]))
})

// Update the selected corporation object for display
const updateSelectedCorporationObject = () => {
  if (!selectedCorporation.value) {
    selectedCorporationObject.value = undefined
  } else {
    selectedCorporationObject.value = corporationOptionsMap.value.get(selectedCorporation.value) || undefined
  }
}

// Methods
const handleSelection = (corporation: any) => {
  if (!corporation) {
    selectedCorporation.value = undefined
    selectedCorporationObject.value = undefined
    emit('update:modelValue', undefined)
    emit('change', undefined)
    return
  }

  const resolvedValue = typeof corporation === 'string' 
    ? corporation 
    : corporation.value ?? corporation.uuid ?? undefined

  if (!resolvedValue) {
    return
  }

  selectedCorporation.value = resolvedValue
  
  // Always get the option from the map to ensure we have the correct object reference
  // This fixes the issue when re-selecting the same option
  const option = corporationOptionsMap.value.get(resolvedValue)
  
  if (option) {
    // Update selectedCorporationObject directly to ensure proper display
    selectedCorporationObject.value = option
    emit('update:modelValue', resolvedValue)
    emit('change', option)
  } else {
    // Fallback if option not found in map
    selectedCorporationObject.value = typeof corporation === 'object' && corporation
      ? corporation
      : { value: resolvedValue }
    emit('update:modelValue', resolvedValue)
    emit('change', selectedCorporationObject.value)
  }
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  selectedCorporation.value = newValue
  updateSelectedCorporationObject()
})

watch(corporationOptions, () => {
  updateSelectedCorporationObject()
}, { immediate: true })

watch(selectedCorporation, () => {
  updateSelectedCorporationObject()
})
</script>


