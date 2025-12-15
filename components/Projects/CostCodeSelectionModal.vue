<template>
  <UModal v-model:open="isOpen" title="Select Cost Codes" description="Select cost codes to include in the estimate" :ui="{ content: 'w-full max-w-4xl', body: 'flex-1 py-0 overflow-y-auto' }">
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-list-bullet" class="w-5 h-5 text-primary" />
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Select Cost Codes</h3>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            icon="i-heroicons-check-circle"
            color="primary"
            variant="soft"
            size="xs"
            @click="handleSelectAll"
          >
            Select All
          </UButton>
          <UButton
            icon="i-heroicons-x-circle"
            color="error"
            variant="soft"
            size="xs"
            @click="handleDeselectAll"
          >
            Deselect All
          </UButton>
        </div>
      </div>
    </template>

    <template #body>
      <div v-if="hierarchicalData.length === 0" class="text-center text-muted">
        <p class="text-sm">No cost codes available</p>
      </div>

      <div v-else class="divide-y divide-default">
        <!-- Division -->
        <div
          v-for="division in hierarchicalData"
          :key="division.uuid"
          class="divide-y divide-default/50"
        >
              <!-- Division Header -->
              <div class="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 font-semibold text-sm text-gray-900 dark:text-gray-100 sticky top-0 z-10">
                <div class="flex items-center gap-2">
                  <UCheckbox
                    :model-value="isDivisionFullySelected(division)"
                    :indeterminate="isDivisionPartiallySelected(division)"
                    @update:model-value="(value) => handleDivisionToggle(division, !!value)"
                  />
                  <span>{{ division.division_number }} {{ division.division_name }}</span>
                </div>
              </div>

              <!-- Cost Codes -->
              <div v-for="costCode in division.costCodes" :key="costCode.uuid" class="pl-4">
                <!-- Cost Code Row -->
                <div class="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <UCheckbox
                    :model-value="isSelected(costCode.uuid)"
                    @update:model-value="(value) => handleToggle(costCode.uuid, !!value)"
                  />
                  <div class="flex-1 flex items-center gap-2 min-w-0">
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {{ costCode.cost_code_number }} {{ costCode.cost_code_name }}
                    </span>
                  </div>
                </div>

                <!-- Sub Cost Codes -->
                <div v-if="costCode.subCostCodes && costCode.subCostCodes.length > 0" class="pl-6">
                  <div v-for="subCostCode in costCode.subCostCodes" :key="subCostCode.uuid" class="pl-2">
                    <!-- Sub Cost Code Row -->
                    <div class="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <UCheckbox
                        :model-value="isSelected(subCostCode.uuid)"
                        @update:model-value="(value) => handleToggle(subCostCode.uuid, !!value)"
                      />
                      <div class="flex-1 flex items-center gap-2 min-w-0">
                        <span class="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {{ subCostCode.cost_code_number }} {{ subCostCode.cost_code_name }}
                        </span>
                      </div>
                    </div>

                    <!-- Sub-Sub Cost Codes -->
                    <div v-if="subCostCode.subSubCostCodes && subCostCode.subSubCostCodes.length > 0" class="pl-6">
                      <div
                        v-for="subSubCostCode in subCostCode.subSubCostCodes"
                        :key="subSubCostCode.uuid"
                        class="pl-2"
                      >
                        <!-- Sub-Sub Cost Code Row -->
                        <div class="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <UCheckbox
                            :model-value="isSelected(subSubCostCode.uuid)"
                            @update:model-value="(value) => handleToggle(subSubCostCode.uuid, !!value)"
                          />
                          <div class="flex-1 flex items-center gap-2 min-w-0">
                            <span class="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {{ subSubCostCode.cost_code_number }} {{ subSubCostCode.cost_code_name }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="handleCancel">Cancel</UButton>
        <UButton color="primary" @click="handleConfirm">Apply Selection</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface CostCode {
  uuid: string
  cost_code_number: string
  cost_code_name: string
  subCostCodes?: SubCostCode[]
}

interface SubCostCode {
  uuid: string
  cost_code_number: string
  cost_code_name: string
  subSubCostCodes?: SubSubCostCode[]
}

interface SubSubCostCode {
  uuid: string
  cost_code_number: string
  cost_code_name: string
}

interface Division {
  uuid: string
  division_number: string
  division_name: string
  costCodes: CostCode[]
}

interface Props {
  open?: boolean
  hierarchicalData?: Division[]
  removedCostCodeUuids?: string[]
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'confirm', removedUuids: string[]): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  hierarchicalData: () => [],
  removedCostCodeUuids: () => []
})

const emit = defineEmits<Emits>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const localRemovedUuids = ref<Set<string>>(new Set())

// Initialize local removed UUIDs from props
watch(() => props.removedCostCodeUuids, (newUuids) => {
  localRemovedUuids.value = new Set(newUuids || [])
}, { immediate: true })

watch(() => props.open, (isOpenValue) => {
  if (isOpenValue) {
    // Reset to props when modal opens
    localRemovedUuids.value = new Set(props.removedCostCodeUuids || [])
  }
})

// Get all cost code UUIDs from hierarchical data
const getAllCostCodeUuids = (): string[] => {
  const uuids: string[] = []
  
  props.hierarchicalData.forEach(division => {
    division.costCodes.forEach(costCode => {
      uuids.push(costCode.uuid)
      if (costCode.subCostCodes) {
        costCode.subCostCodes.forEach(subCostCode => {
          uuids.push(subCostCode.uuid)
          if (subCostCode.subSubCostCodes) {
            subCostCode.subSubCostCodes.forEach(subSubCostCode => {
              uuids.push(subSubCostCode.uuid)
            })
          }
        })
      }
    })
  })
  
  return uuids
}

// Use hierarchical data directly (no filtering)
const hierarchicalData = computed(() => props.hierarchicalData)

// Check if a cost code is selected (not in removed list)
const isSelected = (uuid: string): boolean => {
  return !localRemovedUuids.value.has(uuid)
}

// Check if all cost codes in a division are selected
const isDivisionFullySelected = (division: Division): boolean => {
  const allUuids = getAllDivisionCostCodeUuids(division)
  return allUuids.length > 0 && allUuids.every(uuid => !localRemovedUuids.value.has(uuid))
}

// Check if some but not all cost codes in a division are selected
const isDivisionPartiallySelected = (division: Division): boolean => {
  const allUuids = getAllDivisionCostCodeUuids(division)
  if (allUuids.length === 0) return false
  const selectedCount = allUuids.filter(uuid => !localRemovedUuids.value.has(uuid)).length
  return selectedCount > 0 && selectedCount < allUuids.length
}

// Get all cost code UUIDs for a division
const getAllDivisionCostCodeUuids = (division: Division): string[] => {
  const uuids: string[] = []
  
  division.costCodes.forEach(costCode => {
    uuids.push(costCode.uuid)
    if (costCode.subCostCodes) {
      costCode.subCostCodes.forEach(subCostCode => {
        uuids.push(subCostCode.uuid)
        if (subCostCode.subSubCostCodes) {
          subCostCode.subSubCostCodes.forEach(subSubCostCode => {
            uuids.push(subSubCostCode.uuid)
          })
        }
      })
    }
  })
  
  return uuids
}

// Toggle a single cost code
const handleToggle = (uuid: string, selected: boolean | string | undefined) => {
  const isSelected = typeof selected === 'boolean' ? selected : Boolean(selected)
  if (isSelected) {
    localRemovedUuids.value.delete(uuid)
  } else {
    localRemovedUuids.value.add(uuid)
  }
}

// Toggle all cost codes in a division
const handleDivisionToggle = (division: Division, selected: boolean | string | undefined) => {
  const isSelected = typeof selected === 'boolean' ? selected : Boolean(selected)
  const allUuids = getAllDivisionCostCodeUuids(division)
  if (isSelected) {
    // Remove all from removed list
    allUuids.forEach(uuid => localRemovedUuids.value.delete(uuid))
  } else {
    // Add all to removed list
    allUuids.forEach(uuid => localRemovedUuids.value.add(uuid))
  }
}

// Select all cost codes
const handleSelectAll = () => {
  localRemovedUuids.value.clear()
}

// Deselect all cost codes
const handleDeselectAll = () => {
  const allUuids = getAllCostCodeUuids()
  allUuids.forEach(uuid => localRemovedUuids.value.add(uuid))
}


// Handle confirm
const handleConfirm = () => {
  emit('confirm', Array.from(localRemovedUuids.value))
  isOpen.value = false
}

// Handle cancel
const handleCancel = () => {
  emit('cancel')
  isOpen.value = false
}
</script>
