<template>
  <div :class="className">
    <UPopover v-if="!disabled && corporationUuid" v-model:open="isPopoverOpen">
      <UButton
        :disabled="disabled || configurationsStore.loading || !corporationUuid"
        :size="size"
        :class="className"
        variant="outline"
        :loading="configurationsStore.loading"
      >
        {{ selectedCostCodeLabel || (!corporationUuid ? 'Select corporation first' : placeholder) }}
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
                  class="flex items-center justify-between w-full"
                  :class="(item as any).disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'"
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
import { ref, computed, watch } from 'vue'
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
  excludeUuid?: string // UUID of cost code to exclude from selection (to prevent circular reference)
  divisionUuid?: string | null // UUID of division to filter cost codes by. If null, shows only cost codes without division
  localConfigurations?: any[] // Optional local configurations array (takes precedence over store)
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search and select cost code',
  searchablePlaceholder: 'Search cost codes...',
  size: 'sm',
  className: 'w-full',
  disabled: false
})

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

// Get all active configurations for the corporation, filtered by division
const activeConfigurations = computed(() => {
  // If local configurations are provided, use them instead of store
  let configs: any[] = [];
  
  if (props.localConfigurations && props.localConfigurations.length >= 0) {
    // Use local configurations and filter active ones
    configs = props.localConfigurations.filter((config: any) => config.is_active !== false);
  } else if (props.corporationUuid) {
    // Get all active configurations for this corporation using the store method
    configs = configurationsStore.getActiveConfigurations(props.corporationUuid);
  }
  
  // Filter by division:
  // - If divisionUuid is a string (provided), show only cost codes for that division
  // - If divisionUuid is null/undefined, show only cost codes without division (division_uuid is null)
  if (props.divisionUuid) {
    // Division is selected - show only cost codes for this division
    configs = configs.filter((config: any) => config.division_uuid === props.divisionUuid);
  } else {
    // No division selected (null or undefined) - show only cost codes without division
    configs = configs.filter((config: any) => !config.division_uuid);
  }
  
  // Exclude the current configuration and all its descendants to prevent circular reference
  if (props.excludeUuid) {
    configs = excludeCostCodeAndDescendants(configs, props.excludeUuid);
  }
  
  return configs;
});

// Build a map of cost codes by UUID for quick lookup
const costCodeMap = computed(() => {
  const map = new Map<string, any>();
  activeConfigurations.value.forEach(config => {
    map.set(config.uuid!, config);
  });
  return map;
});

// Recursive function to exclude a cost code and all its descendants from the tree
const excludeCostCodeAndDescendants = (configs: any[], excludeUuid: string): any[] => {
  if (!excludeUuid) return configs;
  
  const excludedSet = new Set<string>();
  
  // Recursive function to collect all descendant UUIDs
  const collectDescendants = (uuid: string) => {
    excludedSet.add(uuid);
    configs.forEach(config => {
      if (config.parent_cost_code_uuid === uuid) {
        collectDescendants(config.uuid);
      }
    });
  };
  
  collectDescendants(excludeUuid);
  
  // Filter out excluded cost codes
  return configs.filter(config => !excludedSet.has(config.uuid));
};

// Build tree structure from flat list
const buildTree = (): TreeItem[] => {
  let configs = activeConfigurations.value;
  
  // Exclude the specified UUID and all its descendants
  if (props.excludeUuid) {
    configs = excludeCostCodeAndDescendants(configs, props.excludeUuid);
  }
  
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
  // level 0 = root, level 1 = first-level children, level 2+ = second-level sub-accounts (disabled)
  const buildTreeItem = (config: any, level: number = 0): TreeItem => {
    const children = childrenMap.get(config.uuid!) || [];
    const hasChildNodes = children.length > 0;
    const status = config.is_active ? 'Active' : 'Inactive';
    // Disable second-level sub-accounts (level 2 and deeper)
    const isDisabled = level >= 2;
    
    const treeItem: TreeItem = {
      label: `${config.cost_code_number} - ${config.cost_code_name}`,
      // Disable second-level sub-accounts (level 2+) - they are visible but not selectable
      disabled: isDisabled,
      // Always expanded by default for parent nodes to show the tree structure
      defaultExpanded: hasChildNodes,
      // Store original config data for reference
      costCode: config,
      status: status,
      status_color: getStatusColor(status),
      // Use UUID as unique identifier
      id: config.uuid
    };
    
    // Recursively build children (increment level for nested items)
    if (children.length > 0) {
      treeItem.children = children
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(child => buildTreeItem(child, level + 1));
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

// Handle item click directly
const handleItemClick = (item: TreeItem) => {
  // Prevent selection of disabled nodes (second-level sub-accounts)
  if (item.disabled) {
    return;
  }
  
  // Allow selection of root and first-level nodes only
  const config = (item as any).costCode;
  if (config && config.uuid) {
    selectCostCode(config);
  }
};

// Handle tree selection event
const handleTreeSelect = (e: TreeItemSelectEvent<TreeItem>, item: TreeItem) => {
  // Prevent selection of disabled nodes (second-level sub-accounts)
  if (item.disabled) {
    e.preventDefault();
    return;
  }
  
  // Allow selection of root and first-level nodes only
  const config = (item as any).costCode;
  if (config && config.uuid) {
    e.preventDefault(); // Prevent default tree behavior
    selectCostCode(config);
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

// Load data if needed (only if local configurations are not provided)
watch(() => props.corporationUuid, (newUuid) => {
  // If local configurations are provided, don't fetch from store
  if (props.localConfigurations !== undefined) {
    return;
  }
  
  if (newUuid && configurationsStore.configurations.length === 0) {
    configurationsStore.fetchConfigurations(newUuid);
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

