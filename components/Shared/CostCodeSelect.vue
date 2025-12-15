<template>
  <div :class="className">
    <UPopover v-if="!disabled && corporationUuid" v-model:open="isPopoverOpen">
      <UButton
        :disabled="disabled || configurationsStore.loading || !corporationUuid"
        :size="size"
        :class="className"
        variant="outline"
        :loading="configurationsStore.loading"
        class="flex items-center justify-between gap-2"
      >
        <span class="flex-1 text-left whitespace-normal">
          {{ selectedCostCodeLabel || (!corporationUuid ? 'Select corporation first' : placeholder) }}
        </span>
        <UIcon
          name="i-heroicons-chevron-down-20-solid"
          class="transition-transform duration-200"
          :class="{ 'rotate-180': isPopoverOpen }"
        />
      </UButton>
      <template #content>
        <div class="w-96 max-h-96 flex flex-col">
          <!-- Search Input -->
          <div class="p-2 border-b border-default">
            <UInput
              v-model="searchQuery"
              :placeholder="searchablePlaceholder"
              icon="i-heroicons-magnifying-glass"
              size="sm"
              class="w-full"
              autofocus
            />
          </div>
          
          <!-- Tree View -->
          <div class="flex-1 overflow-auto p-2">
            <UTree
              :items="filteredTreeItems"
              :size="size"
              :get-key="(item: any) => item.id || item.label"
              :model-value="selectedCostCode"
              @select="handleTreeSelect"
            >
              <template #item-label="{ item }">
                <div 
                  class="flex items-center justify-between w-full cursor-pointer"
                  :class="{ 'cursor-default': (item as any).disabled || ((item as any).children && (item as any).children.length > 0) }"
                  @click.stop="handleItemClick(item)"
                >
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <span class="truncate font-medium">{{ item.label }}</span>
                    <UBadge
                      v-if="(item as any).status"
                      :color="(item as any).status_color"
                      variant="soft"
                      size="xs"
                    >
                      {{ (item as any).status }}
                    </UBadge>
                  </div>
                </div>
              </template>
            </UTree>
            
            <!-- No results message -->
            <div v-if="searchQuery && filteredTreeItems.length === 0" class="text-center py-4 text-sm text-muted">
              No cost codes found matching "{{ searchQuery }}"
            </div>
          </div>
        </div>
      </template>
    </UPopover>
    <UInput
      v-else
      :model-value="selectedCostCodeLabel"
      :disabled="disabled || configurationsStore.loading || !corporationUuid"
      :placeholder="!corporationUuid ? 'Select corporation first' : placeholder"
      :size="size"
      :class="className"
      readonly
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useCostCodeConfigurationsStore } from '@/stores/costCodeConfigurations'
import type { TreeItem } from '@nuxt/ui'
import type { TreeItemSelectEvent } from 'reka-ui'

// Props
interface Props {
  modelValue?: string
  placeholder?: string
  searchablePlaceholder?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  disabled?: boolean
  corporationUuid?: string
  externalConfigurations?: any[]
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search and select cost code',
  searchablePlaceholder: 'Search cost codes...',
  size: 'sm',
  className: 'w-full',
  disabled: false
})

// Debug: Log props immediately on component creation
console.log('[CostCodeSelect] Props received on creation:', {
  hasExternalConfigurations: !!props.externalConfigurations,
  externalConfigurationsType: typeof props.externalConfigurations,
  externalConfigurationsValue: props.externalConfigurations,
  isArray: Array.isArray(props.externalConfigurations),
  count: props.externalConfigurations?.length || 0,
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'change': [costCode: any]
}>()

// Stores
const configurationsStore = useCostCodeConfigurationsStore()

// Local state
const selectedCostCode = ref<string | undefined>(props.modelValue)
const selectedCostCodeOption = ref<any>(undefined)
const isPopoverOpen = ref(false)
const searchQuery = ref('')

// Debug: Watch for changes to externalConfigurations prop
watch(
  () => props.externalConfigurations,
  (newValue) => {
    console.log('[CostCodeSelect] externalConfigurations prop changed:', {
      hasValue: !!newValue,
      isArray: Array.isArray(newValue),
      count: newValue?.length || 0,
      sample: newValue?.slice(0, 2).map((c: any) => ({
        uuid: c?.uuid,
        cost_code_number: c?.cost_code_number,
      })),
    });
  },
  { immediate: true }
)

// Helper function to get status color
const getStatusColor = (status: string): "error" | "warning" | "info" | "success" | "primary" | "secondary" | "neutral" => {
  const statusColors: Record<string, "error" | "warning" | "info" | "success" | "primary" | "secondary" | "neutral"> = {
    'Active': 'success',
    'Inactive': 'error',
    'Draft': 'warning',
    'Pending': 'warning',
    'Approved': 'success',
    'Rejected': 'error'
  };
  return statusColors[status] || 'neutral';
};

// Get active configurations - use external if provided, otherwise use global store
const activeConfigurations = computed(() => {
  console.log('[CostCodeSelect] activeConfigurations computed:', {
    hasExternalConfigurations: !!props.externalConfigurations,
    externalConfigurationsCount: props.externalConfigurations?.length || 0,
    corporationUuid: props.corporationUuid,
  });
  
  // If external configurations are provided, use them (scoped to form's corporation)
  if (props.externalConfigurations && Array.isArray(props.externalConfigurations)) {
    const filtered = props.externalConfigurations.filter((config: any) => config.is_active);
    console.log('[CostCodeSelect] Using external configurations:', {
      totalCount: props.externalConfigurations.length,
      activeCount: filtered.length,
      sample: filtered.slice(0, 2).map((c: any) => ({
        uuid: c?.uuid,
        cost_code_number: c?.cost_code_number,
      })),
    });
    return filtered;
  }
  
  // Otherwise fall back to global store (scoped to TopBar's corporation)
  if (!props.corporationUuid) {
    console.log('[CostCodeSelect] No corporationUuid, returning []');
    return [];
  }
  const globalConfigs = configurationsStore.getActiveConfigurations(props.corporationUuid);
  console.log('[CostCodeSelect] Using global store configurations:', {
    count: globalConfigs?.length || 0,
  });
  return globalConfigs;
});

// Build a map of cost codes by UUID for quick lookup
const costCodeMap = computed(() => {
  const map = new Map<string, any>();
  activeConfigurations.value.forEach(config => {
    map.set(config.uuid!, config);
  });
  return map;
});


// Build tree structure from flat list
const buildTree = (): TreeItem[] => {
  const configs = activeConfigurations.value;
  
  // Create a map of children by parent UUID
  const childrenMap = new Map<string, any[]>();
  const rootItems: any[] = [];
  
  // First pass: organize by parent
  configs.forEach(config => {
    if (!config.parent_cost_code_uuid) {
      rootItems.push(config);
    } else {
      if (!childrenMap.has(config.parent_cost_code_uuid)) {
        childrenMap.set(config.parent_cost_code_uuid, []);
      }
      childrenMap.get(config.parent_cost_code_uuid)!.push(config);
    }
  });
  
  // Recursive function to build tree items
  const buildTreeItem = (config: any): TreeItem => {
    const children = childrenMap.get(config.uuid!) || [];
    const hasChildNodes = children.length > 0;
    const status = config.is_active ? 'Active' : 'Inactive';
    
    const treeItem: TreeItem = {
      label: `${config.cost_code_number} - ${config.cost_code_name}`,
      // Only allow selection of leaf nodes (no children)
      disabled: hasChildNodes,
      // Prevent collapsing - always keep expanded (only for parent nodes)
      onToggle: hasChildNodes ? (e: Event) => {
        e.preventDefault();
      } : undefined,
      // Always expanded for parent nodes by default
      defaultExpanded: hasChildNodes,
      // Store original config data for reference
      costCode: config,
      status: status,
      status_color: getStatusColor(status),
      // Use UUID as unique identifier
      id: config.uuid
    };
    
    // Recursively build children
    if (children.length > 0) {
      treeItem.children = children
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(child => buildTreeItem(child));
    }
    
    return treeItem;
  };
  
  // Build tree from root items
  return rootItems
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(root => buildTreeItem(root));
};

// Tree items computed property (unfiltered)
const treeItems = computed<TreeItem[]>(() => {
  if (!props.corporationUuid || activeConfigurations.value.length === 0) {
    return [];
  }
  return buildTree();
});

// Filter tree items based on search query
const filteredTreeItems = computed<TreeItem[]>(() => {
  if (!searchQuery.value.trim()) {
    return treeItems.value;
  }
  
  const query = searchQuery.value.toLowerCase().trim();
  
  // Recursive function to filter tree items
  const filterTree = (items: TreeItem[]): TreeItem[] => {
    return items
      .map(item => {
        const itemLabel = item.label?.toLowerCase() || '';
        const itemNumber = (item as any).costCode?.cost_code_number?.toLowerCase() || '';
        const itemName = (item as any).costCode?.cost_code_name?.toLowerCase() || '';
        const matches = itemLabel.includes(query) || itemNumber.includes(query) || itemName.includes(query);
        
        // If this item matches, include it and all its children
        if (matches) {
          return item;
        }
        
        // If this item doesn't match, check its children
        if (item.children && item.children.length > 0) {
          const filteredChildren = filterTree(item.children);
          // If any children match, include this parent with filtered children
          if (filteredChildren.length > 0) {
            return {
              ...item,
              children: filteredChildren
            };
          }
        }
        
        // No match found
        return null;
      })
      .filter((item): item is TreeItem => item !== null);
  };
  
  return filterTree(treeItems.value);
});


// Get selected cost code label
const selectedCostCodeLabel = computed(() => {
  if (!selectedCostCode.value) {
    return '';
  }
  
  const config = costCodeMap.value.get(selectedCostCode.value);
  if (config) {
    return `${config.cost_code_number} - ${config.cost_code_name}`;
  }
  return '';
});

// Create a flattened map for quick lookup of tree items by UUID
const treeItemsMap = computed(() => {
  const map = new Map<string, TreeItem>();
  
  const flatten = (items: TreeItem[]) => {
    items.forEach(item => {
      if (item.id) {
        map.set(item.id, item);
      }
      if (item.children) {
        flatten(item.children);
      }
    });
  };
  
  flatten(treeItems.value);
  return map;
});

// Handle item click directly (backup method)
const handleItemClick = (item: TreeItem) => {
  // Prevent selection of non-leaf nodes (parent nodes)
  if (item.disabled || (item.children && item.children.length > 0)) {
    return;
  }
  
  // Only allow selection of leaf nodes (nodes without children)
  if (!item.children || item.children.length === 0) {
    const config = (item as any).costCode;
    if (config && config.uuid) {
      selectCostCode(config);
    }
  }
};

// Handle tree selection event
const handleTreeSelect = (e: TreeItemSelectEvent<TreeItem>, item: TreeItem) => {
  // Prevent selection of non-leaf nodes (parent nodes)
  if (item.disabled || (item.children && item.children.length > 0)) {
    e.preventDefault();
    return;
  }
  
  // Only allow selection of leaf nodes (nodes without children)
  if (!item.children || item.children.length === 0) {
    const config = (item as any).costCode;
    if (config && config.uuid) {
      e.preventDefault(); // Prevent default tree behavior
      selectCostCode(config);
    }
  } else {
    e.preventDefault();
  }
};

// Centralized selection handler
const selectCostCode = (config: any) => {
  const uuid = config.uuid;
  
  // Update local state immediately
  selectedCostCode.value = uuid;
  selectedCostCodeOption.value = {
    label: `${config.cost_code_number} - ${config.cost_code_name}`,
    value: uuid,
    costCode: config,
    status: config.is_active ? 'Active' : 'Inactive',
    status_color: getStatusColor(config.is_active ? 'Active' : 'Inactive')
  };
  
  // Emit events to parent (form binding)
  emit('update:modelValue', uuid);
  emit('change', selectedCostCodeOption.value);
  
  // Close popover immediately
  isPopoverOpen.value = false;
};

// Watchers
watch(() => props.modelValue, (newValue) => {
  if (selectedCostCode.value !== newValue) {
    selectedCostCode.value = newValue;
    if (!newValue) {
      // Clear selection when modelValue is undefined
      selectedCostCodeOption.value = undefined;
    } else {
      // Update selected option when modelValue changes externally
      const config = costCodeMap.value.get(newValue);
      if (config) {
        selectedCostCodeOption.value = {
          label: `${config.cost_code_number} - ${config.cost_code_name}`,
          value: config.uuid,
          costCode: config,
          status: config.is_active ? 'Active' : 'Inactive',
          status_color: getStatusColor(config.is_active ? 'Active' : 'Inactive')
        };
      }
    }
  }
}, { immediate: true });

// Load data if needed (only if not using external configurations)
watch(() => props.corporationUuid, async (newUuid) => {
  // Skip fetching if external configurations are provided
  if (props.externalConfigurations) return;
  
  if (!newUuid) return;
  
  // Check if we have data for THIS specific corporation
  const hasDataForThisCorp = activeConfigurations.value.length > 0;
  
  // If we don't have data for this corporation, fetch it
  if (!hasDataForThisCorp) {
    try {
      await configurationsStore.fetchConfigurations(newUuid);
    } catch (error) {
      console.error('[CostCodeSelect] Failed to fetch configurations', error);
    }
  }
}, { immediate: true });

// Update selected item when tree items change
watch(treeItems, () => {
  if (selectedCostCode.value) {
    const item = treeItemsMap.value.get(selectedCostCode.value);
    if (item) {
      selectedCostCodeOption.value = {
        label: item.label,
        value: (item as any).costCode?.uuid,
        costCode: (item as any).costCode,
        status: item.status,
        status_color: item.status_color
      };
    }
  }
}, { immediate: true });

// Clear search when popover closes
watch(isPopoverOpen, (isOpen) => {
  if (!isOpen) {
    searchQuery.value = '';
  }
});
</script>
