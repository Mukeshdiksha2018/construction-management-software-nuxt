<template>
  <div>
    <div class="flex justify-end items-center mb-2">
      <UButton
        icon="lucide:plus"
        color="primary"
        size="xs"
        @click="handleAddRoleClick"
      >
        Add Role
      </UButton>
    </div>

    <!-- Role Table -->
    <div v-if="roleStore.loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Table Header -->
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-5 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-12" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-12" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center justify-center">
              <USkeleton class="h-4 w-16" />
            </div>
          </div>
        </div>
        
        <!-- Table Body -->
        <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="i in 8" :key="i" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
            <div class="grid grid-cols-5 gap-4 px-2 py-1 text-xs text-gray-900 dark:text-gray-100">
              <div class="flex items-center gap-3">
                <USkeleton class="h-8 w-8 rounded-full" />
                <div class="space-y-1">
                  <USkeleton class="h-4 w-24" />
                  <USkeleton class="h-3 w-32" />
                </div>
              </div>
              <div class="flex items-center">
                <USkeleton class="h-5 w-12 rounded-full" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-5 w-16 rounded-full" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center justify-end gap-1">
                <USkeleton class="h-6 w-6 rounded" />
                <USkeleton class="h-6 w-6 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="roleStore.error">
      <p class="text-red-500">Error: {{ roleStore.error }}</p>
    </div>

    <div v-else-if="rolesWithUserCount.length">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        :pagination-options="paginationOptions"
        :data="rolesWithUserCount" 
        :columns="columns" 
        class="max-h-[70vh] overflow-auto"
      />
      
      <!-- Pagination - only show if more than 10 records -->
      <div v-if="shouldShowPagination(rolesWithUserCount.length).value" class="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <!-- Page Size Selector -->
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Show:</span>
          <USelect
            v-model="pagination.pageSize"
            :items="pageSizeOptions"
            icon="i-heroicons-list-bullet"
            size="sm"
            variant="outline"
            class="w-32"
            @change="updatePageSize(table)"
          />
        </div>
        
        <!-- Pagination Component -->
        <UPagination v-bind="getPaginationProps(table)" />
        
        <!-- Page Info -->
        <div class="text-sm text-gray-600">
          {{ getPageInfo(table, 'roles').value }}
        </div>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <p class="text-gray-500 text-lg font-medium">No roles found</p>
      <p class="text-gray-400 text-sm">Get started by adding your first role</p>
    </div>

    <!-- Add/Edit/View Role Modal -->
    <UModal 
      v-model:open="showModal" 
      :title="isViewMode ? 'View Role Details' : (editingRole ? 'Edit Role' : 'Add New Role')"
      class="!max-w-6xl"
    >
      <template #body>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left Column: Basic Info -->
          <div class="space-y-4">
            <h3 class="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">
              Basic Information
            </h3>
            
            <div>
              <label for="role-name" class="block text-xs font-medium text-gray-700 mb-1">
                Role Name
              </label>
              <UInput
                id="role-name"
                v-model="form.role_name"
                variant="subtle"
                placeholder="Enter role name"
                size="sm"
                class="w-full"
                :readonly="isViewMode"
              />
            </div>

            <div>
              <label for="role-description" class="block text-xs font-medium text-gray-700 mb-1">
                Description
              </label>
              <UTextarea
                id="role-description"
                v-model="form.description"
                variant="subtle"
                placeholder="Enter role description"
                :rows="3"
                size="sm"
                class="w-full"
                :readonly="isViewMode"
              />
            </div>

            <div>
              <label for="role-status" class="block text-xs font-medium text-gray-700 mb-1">
                Status
              </label>
              <USelect
                id="role-status"
                v-model="form.status"
                :items="statusOptions"
                placeholder="Select status"
                icon="i-heroicons-check-circle"
                size="sm"
                variant="soft"
                class="w-full"
                :disabled="isViewMode"
              />
            </div>
          </div>

          <!-- Right Column: Permissions (Spans 2 columns) -->
          <div class="lg:col-span-2">
            <PermissionsSection
              :permissions="form.permissions"
              :readonly="isViewMode"
              @update:permissions="form.permissions = $event"
            />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="error" variant="soft" @click="closeModal">
            {{ isViewMode ? 'Close' : 'Cancel' }}
          </UButton>
          <UButton v-if="!isViewMode" color="primary" @click="submitRole">
            {{ editingRole ? "Update" : "Add" }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal 
      v-model:open="showDeleteModal"
      title="Delete Role"
      description="This action cannot be undone. The role will be permanently removed."
    >
      <template #body>
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-medium text-gray-900">Are you sure?</h3>
              <p class="text-sm text-gray-500">This action cannot be undone.</p>
            </div>
          </div>
          
          <div v-if="roleToDelete" class="bg-gray-50 rounded-lg p-4">
            <p class="text-sm text-gray-600">
              You are about to delete the role <strong>"{{ roleToDelete.role_name }}"</strong>.
            </p>
            <p class="text-sm text-gray-500 mt-1">
              {{ roleToDelete.description }}
            </p>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="gray" variant="soft" @click="closeDeleteModal">
            Cancel
          </UButton>
          <UButton color="error" @click="confirmDelete">
            Delete Role
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, h, resolveComponent, onMounted, useTemplateRef } from "vue";
import { useRoleStore } from "~/stores/roles";
import { useUserProfilesStore } from "~/stores/userProfiles";
import { useAuthStore } from "~/stores/auth";
import { useTableStandard } from '@/composables/useTableStandard'
import type { TableColumn } from '@nuxt/ui'
import PermissionsSection from './PermissionsSection.vue'
import { usePermissions } from '@/composables/usePermissions'
import { useDateFormat } from '@/composables/useDateFormat'
// Local declaration to satisfy TS for auto-imported useToast
declare function useToast(): { add: (opts: any) => void }

// Use table standard composable
const {
  pagination,
  paginationOptions,
  pageSizeOptions,
  updatePageSize,
  shouldShowPagination,
  getPaginationProps,
  getPageInfo
} = useTableStandard()

const UButton = resolveComponent('UButton')
const UCheckbox = resolveComponent('UCheckbox')
const UTable = resolveComponent('UTable')
const UPagination = resolveComponent('UPagination')
const USelect = resolveComponent('USelect')

const roleStore = useRoleStore();
const userProfilesStore = useUserProfilesStore();
const authStore = useAuthStore();
const toast = useToast();
const { hasPermission } = usePermissions();
const { formatDate } = useDateFormat();

const showModal = ref(false);
const showDeleteModal = ref(false);
const editingRole = ref<null | number>(null);
const roleToDelete = ref<any>(null);
const isViewMode = ref(false);

// Table ref for accessing table API
const table = useTemplateRef<any>('table');

const form = ref({
  role_name: "",
  description: "",
  status: "active",
  permissions: [] as string[],
});

// Loading data for skeleton state
const loadingData = ref([
  {
    id: 1,
    role_name: '',
    description: '',
    status: '',
    permissions: [],
    user_count: 0,
    created_at: ''
  },
  {
    id: 2,
    role_name: '',
    description: '',
    status: '',
    permissions: [],
    user_count: 0,
    created_at: ''
  },
  {
    id: 3,
    role_name: '',
    description: '',
    status: '',
    permissions: [],
    user_count: 0,
    created_at: ''
  }
]);


const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' }
];

// Get current user from userProfiles store
const currentUser = computed(() => {
  if (!authStore.user?.email) return null;
  return userProfilesStore.users.find(user => user.email === authStore.user.email);
});

// Check if current user is super admin
const isCurrentUserSuperAdmin = computed(() => {
  const roleId = currentUser.value?.roleId
  if (!roleId) return false
  const role = roleStore.roles.find(r => r.id === roleId)
  return role?.role_name === 'Super Admin'
});

// Computed property to calculate user count for each role
const rolesWithUserCount = computed(() => {
  if (!roleStore.roles || !userProfilesStore.users) return roleStore.roles || [];
  
  return roleStore.roles.map(role => {
    const userCount = userProfilesStore.users.filter(user => user.roleId === role.id).length;
    return { ...role, user_count: userCount };
  });
});

// Table columns configuration
const columns = [
  {
    accessorKey: 'role_name',
    header: 'Role Name',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const isSuperAdminRole = row.original.role_name === 'Super Admin';
      const isDisabled = isSuperAdminRole && !isCurrentUserSuperAdmin.value;
      
      return h('div', { class: 'flex items-center gap-3' }, [
        h('div', { 
          class: `w-8 h-8 rounded-full flex items-center justify-center ${isDisabled ? 'bg-gray-100' : 'bg-primary-100'}` 
        }, [
          h('svg', { 
            class: `w-4 h-4 ${isDisabled ? 'text-gray-400' : 'text-primary-600'}`, 
            fill: 'none', 
            viewBox: '0 0 24 24', 
            stroke: 'currentColor' 
          }, [
            h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' })
          ])
        ]),
        h('div', {}, [
          h('div', { 
            class: `font-medium ${isDisabled ? 'text-muted' : 'text-default'}` 
          }, row.original.role_name),
          h('div', { 
            class: `text-sm ${isDisabled ? 'text-muted' : 'text-muted'}` 
          }, row.original.description)
        ])
      ]);
    }
  },
  {
    accessorKey: 'user_count',
    header: 'Users',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const isSuperAdminRole = row.original.role_name === 'Super Admin';
      const isDisabled = isSuperAdminRole && !isCurrentUserSuperAdmin.value;
      
      return h('div', { class: 'text-center' }, [
        h('span', { 
          class: `inline-flex items-center px-2 py-1 gap-1 rounded-md text-xs font-medium ${isDisabled ? 'bg-elevated text-default' : 'bg-info/10 text-info'}` 
        }, row.original.user_count || 0)
      ]);
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const isSuperAdminRole = row.original.role_name === 'Super Admin';
      const isDisabled = isSuperAdminRole && !isCurrentUserSuperAdmin.value;
      
      const status = row.original.status;
      let badgeClass = '';
      
      if (isDisabled) {
        badgeClass = 'bg-elevated text-default';
      } else if (status === 'active') {
        badgeClass = 'bg-success/10 text-success';
      } else {
        badgeClass = 'bg-error/10 text-error';
      }
      
      return h('span', { 
        class: `inline-flex items-center px-2 py-1 gap-1 rounded-md text-xs font-medium ${badgeClass}` 
      }, status);
    }
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const isSuperAdminRole = row.original.role_name === 'Super Admin';
      const isDisabled = isSuperAdminRole && !isCurrentUserSuperAdmin.value;
      
      return h('div', { 
        class: isDisabled ? 'text-muted' : 'text-muted' 
      }, formatDate(row.original.created_at));
    }
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    enableSorting: false,
    cell: ({ row }: { row: { original: any } }) => {
      const isSuperAdminRole = row.original.role_name === 'Super Admin';
      const isDisabled = isSuperAdminRole && !isCurrentUserSuperAdmin.value;
      
      const buttons = [];
      
      // Edit/View button
      buttons.push(
        h(UButton, {
          icon: hasPermission('roles_edit') ? 'tdesign:edit-filled' : 'i-heroicons-eye',
          size: 'xs',
          variant: 'soft',
          color: hasPermission('roles_edit') ? 'secondary' : 'primary',
          class: 'hover:scale-105 transition-transform',
          disabled: isDisabled,
          onClick: () => {
            if (isDisabled) {
              toast.add({
                title: 'Access Restricted',
                description: 'Super Admin role can only be accessed by Super Admin users',
                color: 'warning',
                icon: 'i-heroicons-exclamation-triangle'
              });
              return;
            }
            hasPermission('roles_edit') ? editRole(row.original) : viewRole(row.original);
          }
        }, () => '')
      );
      
      // Delete button (if permission)
      if (hasPermission('roles_delete')) {
        buttons.push(
          h(UButton, {
            icon: 'mingcute:delete-fill',
            size: 'xs',
            variant: 'soft',
            color: 'error',
            class: 'hover:scale-105 transition-transform',
            disabled: isDisabled,
            onClick: () => {
              if (isDisabled) {
                toast.add({
                  title: 'Access Restricted',
                  description: 'Super Admin role can only be deleted by Super Admin users',
                  color: 'warning',
                  icon: 'i-heroicons-exclamation-triangle'
                });
                return;
              }
              deleteRole(row.original.id);
            }
          }, () => '')
        );
      }
      
      return h('div', { class: 'flex justify-end space-x-2' }, buttons);
    }
  }
];


// Skeleton columns for loading state
const skeletonColumns: TableColumn<any>[] = [
  {
    accessorKey: 'role_name',
    header: 'Role Name',
    cell: () => h('div', { class: 'flex items-center gap-3' }, [
      h('div', { class: 'h-8 w-8 rounded-full bg-gray-200' }),
      h('div', { class: 'space-y-2' }, [
        h('div', { class: 'h-4 w-32 bg-gray-200 rounded' }),
        h('div', { class: 'h-3 w-48 bg-gray-200 rounded' })
      ])
    ])
  },
  {
    accessorKey: 'user_count',
    header: 'Users',
    cell: () => h('div', { class: 'h-6 w-8 bg-gray-200 rounded-full mx-auto' })
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: () => h('div', { class: 'h-6 w-16 bg-gray-200 rounded-full' })
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: () => h('div', { class: 'h-4 w-20 bg-gray-200 rounded' })
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    cell: () => h('div', { class: 'flex justify-end space-x-2' }, [
      h('div', { class: 'h-8 w-16 bg-gray-200 rounded' }),
      h('div', { class: 'h-8 w-16 bg-gray-200 rounded' })
    ])
  }
];

// Load roles on component mount
onMounted(async () => {
  try {
    // Only initialize on client side to avoid SSR issues
    if (process.client) {
      // Only fetch if data is not already available
      const promises = [];
      
      // Always fetch roles fresh (no caching for permissions)
      if (roleStore.roles.length === 0) {
        promises.push(roleStore.fetchRoles());
      }
      
      if (!userProfilesStore.hasData || userProfilesStore.users.length === 0) {
        promises.push(userProfilesStore.fetchUsers());
      }
      
      // Only await if we actually need to fetch data
      if (promises.length > 0) {
        await Promise.all(promises);
      }
    }
  } catch (error) {
    console.error('Error loading role management data:', error);
    
    // Show error toast
    toast.add({
      title: 'Error',
      description: 'Failed to load role management data. Please refresh the page.',
      icon: 'i-heroicons-exclamation-triangle'
    });
  }
});

function resetForm() {
  form.value = {
    role_name: "",
    description: "",
    status: "active",
    permissions: [],
  };
  editingRole.value = null;
}

// Get all possible permissions for auto-selection
const getAllPermissions = () => {
  const allPermissions: string[] = [];
  const permissionGroups: Array<{ key: string; actions: string[] }> = [
    { key: 'users', actions: ['view', 'add', 'edit', 'delete'] },
    { key: 'roles', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'corporations', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'storage_locations', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'chart_of_accounts', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'vendor_invoices', actions: ['view', 'create', 'edit', 'delete', 'approve', 'payment'] },
    { key: 'bill_entry', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
    { key: 'project', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
    { key: 'project_estimates', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
    { key: 'bill_payment', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'vendors', actions: ['view', 'create', 'edit', 'delete'] }
  ];
  
  permissionGroups.forEach(group => {
    group.actions.forEach(action => {
      allPermissions.push(`${group.key}_${action}`);
    });
  });
  
  return allPermissions;
};

function handleAddRoleClick() {
  if (hasPermission('roles_create')) {
    openAddRoleModal();
  } else {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to create roles. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
  }
}

function openAddRoleModal() {
  // Reset form and auto-select all permissions for new role
  isViewMode.value = false;
  form.value = {
    role_name: "",
    description: "",
    status: "active",
    permissions: getAllPermissions(), // Auto-select all permissions
  };
  editingRole.value = null;
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  isViewMode.value = false;
  resetForm();
}

async function submitRole() {
  // Basic validation
  if (!form.value.role_name.trim()) {
    toast.add({
      title: 'Validation Error',
      description: 'Please enter a role name',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  if (!form.value.description.trim()) {
    toast.add({
      title: 'Validation Error',
      description: 'Please enter a role description',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }


  const payload = {
    role_name: form.value.role_name.trim(),
    description: form.value.description.trim(),
    status: form.value.status,
    permissions: form.value.permissions,
  };

  try {
    if (editingRole.value !== null) {
      await roleStore.updateRole(editingRole.value, payload);
      
      // Show success toast
      toast.add({
        title: 'Success',
        description: 'Role updated successfully!',
        icon: 'i-heroicons-check-circle'
      });
    } else {
      await roleStore.addRole(payload);
      
      // Show success toast
      toast.add({
        title: 'Success',
        description: 'Role created successfully!',
        icon: 'i-heroicons-check-circle'
      });
    }

    closeModal();
  } catch (error) {
    console.error('Error saving role:', error);
    
    // Show error toast
    toast.add({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to save role. Please try again.',
      icon: 'i-heroicons-exclamation-triangle'
    });
  }
}

function viewRole(role: any) {
  isViewMode.value = true;
  editingRole.value = role.id;
  form.value = {
    role_name: role.role_name,
    description: role.description,
    status: role.status,
    permissions: Array.isArray(role.permissions) ? role.permissions : [],
  };
  showModal.value = true;
}

function editRole(role: any) {
  isViewMode.value = false;
  editingRole.value = role.id;
  form.value = {
    role_name: role.role_name,
    description: role.description,
    status: role.status,
    permissions: Array.isArray(role.permissions) ? role.permissions : [],
  };
  showModal.value = true;
}

function deleteRole(role: any) {
  // Check if user has permission to delete
  if (!hasPermission('roles_delete')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to delete roles. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  roleToDelete.value = role;
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  roleToDelete.value = null;
}


async function confirmDelete() {
  if (!roleToDelete.value) {
    return;
  }

  try {
    await roleStore.deleteRole(roleToDelete.value.id);
    
          // Show success toast
      toast.add({
        title: 'Success',
        description: 'Role deleted successfully!',
        icon: 'i-heroicons-check-circle'
      });
    
    // Close delete modal
    closeDeleteModal();
  } catch (error) {
    console.error('Error deleting role:', error);
    
    // Show error toast
    toast.add({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to delete role. Please try again.',
      icon: 'i-heroicons-exclamation-triangle'
    });
  }
}

// Note: Permission management is now handled by the PermissionsPanel component



</script>
