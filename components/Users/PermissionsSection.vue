<template>
  <div class="space-y-2">
    <!-- Compact Header -->
    <div class="flex items-center justify-between">
      <label class="text-xs font-medium text-gray-700">Permissions</label>
      <div v-if="!readonly" class="flex space-x-1">
        <UButton
          size="xs"
          variant="soft"
          color="primary"
          icon="i-heroicons-check-circle"
          @click="selectAll"
        >
          Select All
        </UButton>
        <UButton
          size="xs"
          variant="soft"
          color="error"
          icon="i-heroicons-x-circle"
          @click="clearAll"
        >
          Clear All
        </UButton>
      </div>
    </div>
    
    <!-- Ultra-Compact Permission Grid with Section Headers -->
    <div class="space-y-4">
      <div 
        v-for="section in permissionSections" 
        :key="section.title"
        class="space-y-2"
      >
        <!-- Section Header -->
        <div class="flex items-center space-x-2">
          <div class="h-px bg-gray-300 dark:bg-gray-600 flex-1"></div>
          <h4 class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide px-2">
            {{ section.title }}
          </h4>
          <div class="h-px bg-gray-300 dark:bg-gray-600 flex-1"></div>
        </div>
        
        <!-- Section Permissions Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          <div 
            v-for="group in section.groups" 
            :key="group.key"
            class="border border-gray-200 dark:border-gray-700 rounded p-2 bg-white dark:bg-gray-800"
          >
            <!-- Compact Header -->
            <div class="flex items-center space-x-1 mb-1">
              <UCheckbox
                :model-value="hasAllSubPermissions(group.key)"
                @update:model-value="(value: boolean | 'indeterminate') => toggleMainPermission(group.key, value === true)"
                size="xs"
                :disabled="readonly"
              />
              <label 
                :class="readonly ? 'text-xs font-medium text-gray-700' : 'text-xs font-medium text-gray-700 cursor-pointer'" 
                @click="!readonly && toggleMainPermission(group.key, !hasAllSubPermissions(group.key))"
                :title="group.title"
              >
                {{ group.title }}
              </label>
            </div>
            
            <!-- Ultra-compact Sub-permissions -->
            <div v-if="hasAnySubPermissions(group.key)" class="ml-3 grid grid-cols-2 gap-0.5">
              <div 
                v-for="action in group.actions" 
                :key="action.key"
                class="flex items-center space-x-0.5"
              >
                <UCheckbox
                  :model-value="permissions.includes(`${group.key}_${action.key}`)"
                  @update:model-value="(value: boolean | 'indeterminate') => toggleSubPermission(group.key, action.key, value === true)"
                  size="xs"
                  :disabled="readonly"
                />
                <label 
                  :class="readonly ? 'text-xs text-gray-500' : 'text-xs text-gray-500 cursor-pointer'" 
                  @click="!readonly && toggleSubPermission(group.key, action.key, !permissions.includes(`${group.key}_${action.key}`))"
                  :title="action.label"
                >
                  {{ action.label }}
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  permissions: string[];
  readonly?: boolean;
}

interface Action {
  key: string;
  label: string;
}

interface PermissionGroup {
  key: string;
  title: string;
  actions: Action[];
}

interface PermissionSection {
  title: string;
  groups: PermissionGroup[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:permissions': [permissions: string[]];
}>();

// Define permission structure organized by side menu routes
const permissionGroups: PermissionGroup[] = [
  // Admin Dashboard Section
  {
    key: 'admin_dashboard',
    title: 'Admin Dashboard',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'manage', label: 'Manage' }
    ]
  },
  
  // User Setup Section (Users & Roles)
  {
    key: 'users',
    title: 'Users Management',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ]
  },
  {
    key: 'roles',
    title: 'Roles Management',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ]
  },
  
  // Corporation Section
  {
    key: 'corporations',
    title: 'Corporations',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ]
  },
  {
    key: 'storage_locations',
    title: 'Storage Locations',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ]
  },
  {
    key: 'chart_of_accounts',
    title: 'Chart of Accounts',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ]
  },
  {
    key: 'cost_codes',
    title: 'Cost Codes',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ]
  },
  
  // Projects Section
  {
    key: 'project',
    title: 'Project Details',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
      { key: 'approve', label: 'Approve' }
    ]
  },
  {
    key: 'project_items',
    title: 'Project Items',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ]
  },
  {
    key: 'project_estimates',
    title: 'Project Estimates',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
      { key: 'approve', label: 'Approve' }
    ]
  },
  
  // Purchase Orders Section
  {
    key: 'vendors',
    title: 'Vendors',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ]
  },
  {
    key: 'po',
    title: 'Purchase Orders',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
      { key: 'approve', label: 'Approve' }
    ]
  },
  {
    key: 'co',
    title: 'Change Orders',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
      { key: 'approve', label: 'Approve' }
    ]
  },
  {
    key: 'receipt_notes',
    title: 'Receipt Notes',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
      { key: 'approve', label: 'Approve' }
    ]
  },
  
  // Payables Section
  {
    key: 'vendor_invoices',
    title: 'Vendor Invoices',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
      { key: 'approve', label: 'Approve' },
      { key: 'payment', label: 'Payment' }
    ]
  },
  {
    key: 'bill_entry',
    title: 'Bill Entry',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
      { key: 'approve', label: 'Approve' }
    ]
  },
  {
    key: 'bill_payment',
    title: 'Bill Payment',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ]
  },
  {
    key: 'print_checks',
    title: 'Print Checks',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'print', label: 'Print' }
    ]
  },
  
  // Masters Section
  {
    key: 'freight',
    title: 'Freight',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ]
  },
  {
    key: 'ship_via',
    title: 'Ship VIA',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ]
  },
  {
    key: 'po_instruction',
    title: 'PO Instruction',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ]
  },
  {
    key: 'location',
    title: 'Location',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ]
  },
  {
    key: 'uom',
    title: 'UOM',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ]
  },
  {
    key: 'charges',
    title: 'Charges',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ]
  },
  {
    key: 'sales_tax',
    title: 'Sales Tax',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ]
  },
  
  // Reports Section
  {
    key: 'reports',
    title: 'Reports',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'generate', label: 'Generate' },
      { key: 'export', label: 'Export' }
    ]
  },
  
  // Configurations Section
  {
    key: 'configurations',
    title: 'Configurations',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'edit', label: 'Edit' }
    ]
  },
  
  // Settings Section
  {
    key: 'settings',
    title: 'Settings',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'edit', label: 'Edit' }
    ]
  }
];

// Group permissions by sections for better organization
const permissionSections: PermissionSection[] = [
  {
    title: 'Admin & User Management',
    groups: [
      permissionGroups.find(g => g.key === 'admin_dashboard')!,
      permissionGroups.find(g => g.key === 'users')!,
      permissionGroups.find(g => g.key === 'roles')!,
    ]
  },
  {
    title: 'Corporation Management',
    groups: [
      permissionGroups.find(g => g.key === 'corporations')!,
      permissionGroups.find(g => g.key === 'storage_locations')!,
      permissionGroups.find(g => g.key === 'chart_of_accounts')!,
    ]
  },
  {
    title: 'Project Management',
    groups: [
      permissionGroups.find(g => g.key === 'project')!,
      permissionGroups.find(g => g.key === 'cost_codes')!,
      permissionGroups.find(g => g.key === 'project_items')!,
      permissionGroups.find(g => g.key === 'project_estimates')!,
    ]
  },
  {
    title: 'Purchase Orders Management',
    groups: [
      permissionGroups.find(g => g.key === 'vendors')!,
      permissionGroups.find(g => g.key === 'po')!,
      permissionGroups.find(g => g.key === 'co')!,
      permissionGroups.find(g => g.key === 'receipt_notes')!,
    ]
  },
  {
    title: 'Payables Management',
    groups: [
      permissionGroups.find(g => g.key === 'vendor_invoices')!,
      permissionGroups.find(g => g.key === 'bill_entry')!,
      permissionGroups.find(g => g.key === 'bill_payment')!,
      permissionGroups.find(g => g.key === 'print_checks')!,
    ]
  },
  {
    title: 'Masters & Configuration',
    groups: [
      permissionGroups.find(g => g.key === 'freight')!,
      permissionGroups.find(g => g.key === 'ship_via')!,
      permissionGroups.find(g => g.key === 'po_instruction')!,
      permissionGroups.find(g => g.key === 'location')!,
      permissionGroups.find(g => g.key === 'uom')!,
      permissionGroups.find(g => g.key === 'charges')!,
      permissionGroups.find(g => g.key === 'sales_tax')!,
    ]
  },
  {
    title: 'Reports & Settings',
    groups: [
      permissionGroups.find(g => g.key === 'reports')!,
      permissionGroups.find(g => g.key === 'configurations')!,
      permissionGroups.find(g => g.key === 'settings')!,
    ]
  }
];

// Get all possible actions for validation
const allActions = computed(() => {
  const actions = new Set<string>();
  permissionGroups.forEach(group => {
    group.actions.forEach(action => {
      actions.add(action.key);
    });
  });
  return Array.from(actions);
});

// Toggle main permission (route-level) - Selects all sub-permissions
const toggleMainPermission = (mainPermission: string, checked: boolean) => {
  let newPermissions = [...props.permissions];
  
  if (checked) {
    // Add all sub-permissions for this group
    const group = permissionGroups.find(g => g.key === mainPermission);
    if (group) {
      group.actions.forEach(action => {
        const fullPermission = `${mainPermission}_${action.key}`;
        if (!newPermissions.includes(fullPermission)) {
          newPermissions.push(fullPermission);
        }
      });
    }
  } else {
    // Remove all sub-permissions for this group
    newPermissions = newPermissions.filter(permission => 
      !permission.startsWith(`${mainPermission}_`)
    );
  }
  
  emit('update:permissions', newPermissions);
};

// Toggle sub-permission (action-level)
const toggleSubPermission = (mainPermission: string, subPermission: string, checked: boolean) => {
  let newPermissions = [...props.permissions];
  const fullPermission = `${mainPermission}_${subPermission}`;
  
  if (checked) {
    // Add sub-permission if not present
    if (!newPermissions.includes(fullPermission)) {
      newPermissions.push(fullPermission);
    }
  } else {
    // Remove sub-permission
    newPermissions = newPermissions.filter(permission => permission !== fullPermission);
  }
  
  emit('update:permissions', newPermissions);
};

// Helper functions for permission checking
const hasAllSubPermissions = (groupKey: string) => {
  const group = permissionGroups.find(g => g.key === groupKey);
  if (!group) return false;
  
  return group.actions.every(action => 
    props.permissions.includes(`${groupKey}_${action.key}`)
  );
};

const hasAnySubPermissions = (groupKey: string) => {
  const group = permissionGroups.find(g => g.key === groupKey);
  if (!group) return false;
  
  return group.actions.some(action => 
    props.permissions.includes(`${groupKey}_${action.key}`)
  );
};

const selectAll = () => {
  const allPermissions: string[] = [];
  
  permissionGroups.forEach(group => {
    group.actions.forEach(action => {
      allPermissions.push(`${group.key}_${action.key}`);
    });
  });
  
  emit('update:permissions', allPermissions);
};

const clearAll = () => {
  emit('update:permissions', []);
};
</script>
