<template>
  <div>
    <div class="flex justify-end items-center mb-2">
      <div class="mr-2">
        <UInput
          v-model="globalFilter"
          placeholder="Search users..."
          icon="i-heroicons-magnifying-glass"
          variant="subtle"
          size="xs"
        />
      </div>
      <div>
        <UButton
          icon="lucide:plus"
          color="primary"
          size="xs"
          @click="handleInviteClick"
        >
          Invite User
        </UButton>
      </div>
    </div>



    <!-- User Table -->
    <div v-if="userProfilesStore.loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Table Header -->
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-6 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
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
              <USkeleton class="h-4 w-12" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center justify-center">
              <USkeleton class="h-4 w-16" />
            </div>
          </div>
        </div>
        
        <!-- Table Body -->
        <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="i in 8" :key="i" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
            <div class="grid grid-cols-6 gap-4 px-2 py-1 text-xs text-gray-900 dark:text-gray-100">
              <div class="flex items-center gap-3">
                <USkeleton class="h-8 w-8 rounded-full" />
                <div class="space-y-1">
                  <USkeleton class="h-4 w-32" />
                  <USkeleton class="h-3 w-24" />
                </div>
              </div>
              <div class="flex items-center">
                <USkeleton class="h-5 w-16 rounded-full" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
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

    <div v-else-if="userProfilesStore.error">
              <UAlert
          title="Error"
          :description="userProfilesStore.error"
          color="error"
          variant="soft"
          icon="lucide:alert-circle"
        />
    </div>

    <div v-else-if="userProfilesStore.users.length">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        :pagination-options="paginationOptions"
        :data="filteredUsers" 
        :columns="columns" 
      />
      
      <!-- Pagination - only show if more than 10 records -->
      <div v-if="shouldShowPagination(filteredUsers.length).value" class="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
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
          {{ getPageInfo(table, 'users').value }}
        </div>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      </div>
      <p class="text-gray-500 text-lg font-medium">No users found</p>
      <p class="text-gray-400 text-sm">Get started by inviting your first user</p>
    </div>

    <!-- Invite User Modal -->
    <UModal 
      v-model:open="showModal"
      title="Invite New User"
      description="Send an invitation to a new user to join your organization."
    >
      <template #body>
        <div class="space-y-6">
          <div>
            <label
              for="email"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address <span class="text-red-500">*</span>
            </label>
            <UInput
              id="email"
              v-model="form.email"
              type="email"
              variant="subtle"
              placeholder="Enter email address"
              class="w-full"
              required
            />
            <p class="text-sm text-gray-500 mt-1">
              An invitation email will be sent to this address
            </p>
          </div>


        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="soft" @click="closeModal">
              Cancel
            </UButton>
          <UButton 
            color="neutral"
            variant="solid"
            @click="submitInvite"
            :loading="userProfilesStore.loading"
            :disabled="!form.email.trim()"
          >
            Send Invitation
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Edit/View User Modal -->
    <UModal 
      fullscreen
      v-model:open="showEditModal"
      :title="isViewMode ? 'View User Details' : 'Edit User'"
      :ui="{ width: 'w-full max-w-7xl' }"
    >
      <template #body>
        <div class="flex flex-col lg:flex-row gap-6 min-h-[400px]">
          <!-- Left Column: Basic details + Profile image (approx 30%) -->
          <div class="w-full lg:w-1/3 space-y-6">
            <!-- Basic User Details -->
            <div class="space-y-4">
            <h3 class="text-base font-medium text-gray-900 border-b border-gray-200 pb-2">
              Basic Information
            </h3>
            
            <!-- Email and Name in a row -->
            <div class="grid grid-cols-1 gap-3">
              <div>
                <label for="edit-email" class="block text-xs font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <UInput
                  id="edit-email"
                  v-model="editForm.email"
                  type="email"
                  variant="subtle"
                  placeholder="Enter email address"
                  size="sm"
                  class="w-full"
                  :readonly="isViewMode"
                />
              </div>
              
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="edit-firstName" class="block text-xs font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <UInput
                    id="edit-firstName"
                    v-model="editForm.firstName"
                    type="text"
                    variant="subtle"
                    placeholder="First name"
                    size="sm"
                    class="w-full"
                    :readonly="isViewMode"
                  />
                </div>
                <div>
                  <label for="edit-lastName" class="block text-xs font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <UInput
                    id="edit-lastName"
                    v-model="editForm.lastName"
                    type="text"
                    variant="subtle"
                    placeholder="Last name"
                    size="sm"
                    class="w-full"
                    :readonly="isViewMode"
                  />
                </div>
              </div>
            </div>

            <!-- Phone and Address -->
            <div class="space-y-3">
              <div>
                <label for="edit-phone" class="block text-xs font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <UInput
                  id="edit-phone"
                  v-model="editForm.phone"
                  type="tel"
                  variant="subtle"
                  placeholder="Enter phone number"
                  size="sm"
                  class="w-full"
                  :readonly="isViewMode"
                />
              </div>

              <div>
                <label for="edit-address" class="block text-xs font-medium text-gray-700 mb-1">
                  Address
                </label>
                <UTextarea
                  id="edit-address"
                  v-model="editForm.address"
                  variant="subtle"
                  placeholder="Enter address"
                  :rows="2"
                  size="sm"
                  class="w-full"
                  :readonly="isViewMode"
                />
              </div>
            </div>

            <!-- Role and Status -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="edit-role" class="block text-xs font-medium text-gray-700 mb-1">
                  Role
                </label>
                <USelect
                  id="edit-role"
                  v-model="editForm.roleId"
                  :items="roleOptions"
                  placeholder="Select role"
                  icon="i-heroicons-user-group"
                  size="sm"
                  variant="soft"
                  class="w-full"
                  :disabled="isViewMode"
                />
              </div>
              <div>
                <label for="edit-status" class="block text-xs font-medium text-gray-700 mb-1">
                  Status
                </label>
                <USelect
                  id="edit-status"
                  v-model="editForm.status"
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
            </div>

            <!-- Profile Image -->
            <div class="space-y-4">
            <h3 class="text-base font-medium text-gray-900 border-b border-gray-200 pb-2">
              Profile Image
            </h3>
            
            <!-- Compact image upload -->
            <div class="w-full">
              <label for="edit-image" class="block text-xs font-medium text-gray-700 mb-2">
                Upload Profile Image
              </label>
              
              <div class="w-full min-h-24 border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                <input
                  type="file"
                  id="edit-image"
                  accept="image/*"
                  @change="handleImageChange"
                  class="hidden"
                  ref="fileInput"
                  :disabled="isViewMode"
                />
                
                <div 
                  v-if="!editForm.imageFile || editForm.imageFile.length === 0"
                  @click="!isViewMode && fileInput?.click()"
                  :class="isViewMode ? 'cursor-default' : 'cursor-pointer'"
                >
                  <svg class="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <p class="mt-1 text-xs text-gray-600">
                    <span v-if="!isViewMode" class="font-medium text-primary-600 hover:text-primary-500">
                      Click to upload
                    </span>
                    <span v-else class="font-medium text-gray-500">
                      No image uploaded
                    </span>
                  </p>
                  <p v-if="!isViewMode" class="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                </div>
                
                <div v-else class="text-center">
                  <p class="text-xs text-gray-600">File: {{ editForm.imageFile[0]?.name }}</p>
                  <button 
                    v-if="!isViewMode"
                    @click="editForm.imageFile = []; editForm.imageUrl = ''"
                    class="mt-1 text-xs text-red-600 hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
              </div>
              
              <!-- Current image preview -->
              <div v-if="editForm.imageUrl" class="mt-2 text-center">
                <img 
                  :src="editForm.imageUrl" 
                  alt="Current profile image" 
                  class="w-24 h-24 rounded-full object-cover border-2 border-gray-200 mx-auto"
                />
              </div>
            </div>
            </div>
          </div>

          <!-- Right Column: Corporation Access (approx 70%) -->
          <div class="flex-1 lg:pl-4 lg:border-l lg:border-gray-200 flex flex-col min-h-0">
            <!-- Header row: title, count, search and bulk actions -->
            <div class="flex flex-col gap-2 border-b border-gray-200 pb-2">
              <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div class="flex items-center gap-2">
                  <h3 class="text-base font-medium text-gray-900">
                    Corporation Access
                  </h3>
                  <span class="text-[11px] text-gray-500">
                    {{ editForm.corporationAccess.length }} of {{ filteredCorporationsForEdit.length }} selected
                  </span>
                </div>
                <div class="flex items-center gap-2 w-full md:w-auto">
                  <div class="flex-1 md:w-48">
                    <UInput
                      v-model="corporationFilter"
                      size="xs"
                      icon="i-heroicons-magnifying-glass"
                      placeholder="Search corporations..."
                    />
                  </div>
                  <div class="flex items-center gap-2 text-[11px] text-gray-600">
                    <UButton
                      size="2xs"
                      variant="soft"
                      color="primary"
                      class="h-6 px-2"
                      @click="selectAllCorporations"
                      :disabled="filteredCorporationsForEdit.length === 0"
                    >
                      Select All
                    </UButton>
                    <UButton
                      size="2xs"
                      variant="ghost"
                      color="neutral"
                      class="h-6 px-2"
                      @click="clearAllCorporations"
                      :disabled="editForm.corporationAccess.length === 0"
                    >
                      Clear
                    </UButton>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-2 flex-1 min-h-0">
              <div v-if="corporationStore.loading" class="text-xs text-gray-500 text-center py-4">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-2"></div>
                Loading corporations...
              </div>
              <div v-else-if="filteredCorporationsForEdit.length === 0" class="text-xs text-gray-500 text-center py-4">
                <svg class="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                No corporations found
                <div class="text-xs text-gray-400 mt-1">
                  {{ corporationStore.errorMessage || 'No error message' }}
                </div>
              </div>
              <div v-else class="h-full overflow-y-auto rounded-md">
                <table class="w-full text-[11px] border-collapse">
                  <thead class="bg-gray-50 sticky top-0 z-10">
                    <tr class="border-b border-gray-200">
                      <th class="w-10 px-2 py-1 text-center align-middle">
                        <UCheckbox
                          :model-value="allVisibleCorporationsSelected"
                          @update:model-value="(checked: boolean) => checked ? selectAllCorporations() : clearVisibleCorporations()"
                          :disabled="isViewMode || filteredCorporationsForEdit.length === 0"
                          class="flex items-center justify-center"
                        />
                      </th>
                      <th class="px-2 py-1 text-left font-medium text-gray-700">
                        Corporation
                      </th>
                      <th class="px-2 py-1 text-left font-medium text-gray-700 hidden sm:table-cell">
                        Legal Name
                      </th>
                      <th class="px-2 py-1 text-left font-medium text-gray-700 hidden md:table-cell">
                        Location
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    <tr
                      v-for="corporation in filteredCorporationsForEdit"
                      :key="corporation.uuid"
                      class="hover:bg-gray-50 transition-colors"
                    >
                      <td class="px-2 py-1 text-center align-middle">
                        <UCheckbox
                          :id="`corp-${corporation.uuid}`"
                          :model-value="editForm.corporationAccess.includes(corporation.uuid)"
                          @update:model-value="(checked: boolean) => toggleCorporationAccess(corporation.uuid, checked)"
                          :disabled="isViewMode"
                          class="flex items-center justify-center"
                        />
                      </td>
                      <td class="px-2 py-1 align-top">
                        <label
                          :for="`corp-${corporation.uuid}`"
                          class="text-xs text-gray-800 cursor-pointer font-medium block truncate"
                        >
                          {{ corporation.corporation_name || 'Unnamed Corporation' }}
                        </label>
                      </td>
                      <td class="px-2 py-1 text-xs text-gray-600 hidden sm:table-cell align-top truncate">
                        <span v-if="corporation.legal_name">
                          {{ corporation.legal_name }}
                        </span>
                        <span v-else class="text-gray-400 italic">
                          No legal name
                        </span>
                      </td>
                      <td class="px-2 py-1 text-xs text-gray-500 hidden md:table-cell align-top truncate">
                        <span v-if="corporation.corporation_location">
                          {{ corporation.corporation_location }}
                        </span>
                        <span v-else class="text-gray-400 italic">
                          —
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div class="text-xs text-gray-500">
              <p>Select which corporations this user should have access to</p>
              <p class="text-xs text-gray-400 mt-1">
                {{ editForm.corporationAccess.length }} of {{ corporationStore.corporations.length }} corporations selected
              </p>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="error" variant="soft" @click="closeEditModal">
            {{ isViewMode ? 'Close' : 'Cancel' }}
          </UButton>
          <UButton 
            v-if="!isViewMode"
            color="primary" 
            @click="submitEdit"
            :loading="userProfilesStore.loading"
          >
            Update User
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal 
      v-model:open="showDeleteModal"
      title="Remove User"
      description="This action cannot be undone. The user will be permanently removed from your organization."
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-gray-700">
            Are you sure you want to remove <strong>{{ userToDelete?.email }}</strong>? 
            This action cannot be undone.
          </p>
          <p class="text-sm text-gray-500">
            The user will be permanently removed from the system and all associated data will be lost.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="gray" variant="outline" @click="closeDeleteModal">
            Cancel
          </UButton>
          <UButton 
            color="error" 
            @click="confirmDelete"
            :loading="userProfilesStore.loading"
          >
            Remove User
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h, resolveComponent, watch } from "vue";
import { useUserProfilesStore } from "~/stores/userProfiles";
import { useRoleStore } from "~/stores/roles";
import { useCorporationStore } from "~/stores/corporations";
import { useTableStandard, createSortableColumn, createActionColumn } from '@/composables/useTableStandard'
import { usePermissions } from '@/composables/usePermissions'
import { useDateFormat } from '@/composables/useDateFormat'

interface InvitedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  roleId: number | undefined;
  status: 'pending' | 'active' | 'inactive';
  imageUrl?: string;
  createdAt: string;
  lastSignIn: string | null;
  invitedAt: string | null;
  corporationAccess?: string[];
}

const userProfilesStore = useUserProfilesStore();
const roleStore = useRoleStore();
const corporationStore = useCorporationStore();
const toast = useToast();
const { hasPermission } = usePermissions();
const { formatDate } = useDateFormat();

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

// Resolve NuxtUI components for use in h() function
const UButton = resolveComponent('UButton');
const UAvatar = resolveComponent('UAvatar');
const UModal = resolveComponent('UModal');
const UInput = resolveComponent('UInput');
const UTextarea = resolveComponent('UTextarea');
const UAlert = resolveComponent('UAlert');
const UCheckbox = resolveComponent('UCheckbox');
const UTable = resolveComponent('UTable');
const UPagination = resolveComponent('UPagination');
const USelect = resolveComponent('USelect');

const showModal = ref(false);
const showEditModal = ref(false);
const showViewModal = ref(false);
const showDeleteModal = ref(false);
const globalFilter = ref('');
const userToDelete = ref<InvitedUser | null>(null);
const isViewMode = ref(false);

// Table ref for accessing table API
const table = useTemplateRef<any>('table');

const form = ref({
  email: "",
});
const editForm = ref({
  userId: "",
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
  roleId: undefined as number | undefined,
  status: 'active' as 'active' | 'inactive',
  imageFile: [] as File[],
  imageUrl: "",
  corporationAccess: [] as string[]
});

// Local filter for corporations in the edit modal
const corporationFilter = ref('');

// File input ref
const fileInput = ref<HTMLInputElement>();

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' }
];

const roleOptions = ref<Array<{ label: string; value: number }>>([]);


// Computed property for filtered users based on global filter
const filteredUsers = computed(() => {
  if (!globalFilter.value.trim()) {
    return userProfilesStore.users;
  }

  const searchTerm = globalFilter.value.toLowerCase().trim();
  
  return userProfilesStore.users.filter(user => {
    // Search across all relevant fields
    const searchableFields = [
      user.email || '',
      user.firstName || '',
      user.lastName || '',
      user.phone || '',
      user.address || '',
      user.status || '',
      user.createdAt || '',
      user.lastSignIn || ''
    ];

    // Also search in role name
    const role = roleStore.roles.find(r => r.id === user.roleId);
    if (role) {
      searchableFields.push(role.role_name);
    }

    // Check if any field contains the search term
    return searchableFields.some(field => 
      field.toLowerCase().includes(searchTerm)
    );
  });
});

// Filtered corporations list used in the edit modal
const filteredCorporationsForEdit = computed(() => {
  const term = corporationFilter.value.trim().toLowerCase();
  if (!term) {
    return corporationStore.corporations;
  }
  return corporationStore.corporations.filter((corp) => {
    const fields = [
      corp.corporation_name || '',
      corp.legal_name || '',
      corp.corporation_location || '',
      corp.uuid || ''
    ];
    return fields.some((f) => String(f).toLowerCase().includes(term));
  });
});

const allVisibleCorporationsSelected = computed(() => {
  if (!filteredCorporationsForEdit.value.length) return false;
  return filteredCorporationsForEdit.value.every((corp: any) =>
    editForm.value.corporationAccess.includes(corp.uuid)
  );
});

// Loading data for skeleton state
const loadingData = ref([
  { id: '1', email: '', status: '', createdAt: '', lastSignIn: '' },
  { id: '2', email: '', status: '', createdAt: '', lastSignIn: '' },
  { id: '3', email: '', status: '', createdAt: '', lastSignIn: '' }
]);

// Table columns configuration using composable
const columns = [
  {
    accessorKey: 'email',
    header: 'Email',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: any }) => {
      return h('div', { class: 'flex items-center gap-3' }, [
        h('div', { class: 'w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden' }, 
          row.original.imageUrl && row.original.imageUrl.trim() !== ""
            ? h(UAvatar, { 
                src: row.original.imageUrl, 
                alt: 'Profile',
                size: 'sm'
              })
            : h('svg', { class: 'w-4 h-4 text-primary-600', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
                h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' })
              ])
        ),
        h('div', {}, [
          h('div', { class: 'font-medium text-default' }, row.original.email),
          h('div', { class: 'text-sm text-muted' }, `${row.original.firstName || ''} ${row.original.lastName || ''}`.trim() || 'No name provided')
        ])
      ]);
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: any }) => {
      const statusConfig = {
        pending: { class: 'bg-warning/10 text-warning', label: 'Pending' },
        active: { class: 'bg-success/10 text-success', label: 'Active' },
        inactive: { class: 'bg-elevated text-default', label: 'Inactive' }
      };
      
      const status = row.original.status as keyof typeof statusConfig;
      const config = statusConfig[status];
      
      return h('span', { 
        class: `inline-flex items-center px-2 py-1 gap-1 rounded-md text-xs font-medium ${config.class}` 
      }, config.label);
    }
  },
  {
    accessorKey: 'roleId',
    header: 'Role',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: any }) => {
      const role = roleStore.roles.find(r => r.id === row.original.roleId);
      return h('span', { class: 'text-sm text-default' }, role ? role.role_name : 'No role assigned');
    }
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: any }) => {
      return h('span', { class: 'text-sm text-muted' }, formatDate(row.original.createdAt));
    }
  },
  {
    accessorKey: 'lastSignIn',
    header: 'Last Sign In',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: any }) => {
      if (!row.original.lastSignIn) {
        return h('span', { class: 'text-sm text-muted' }, 'Never');
      }
      return h('span', { class: 'text-sm text-muted' }, formatDate(row.original.lastSignIn));
    }
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    enableSorting: false,
    meta: { class: { th: 'text-right sticky right-0 z-10 w-32', td: 'text-right sticky right-0 w-32' } },
    cell: ({ row }: { row: any }) => {
      const buttons = [];
      
      // Edit/View button
      buttons.push(
        h(UButton, {
          icon: hasPermission('users_edit') ? 'tdesign:edit-filled' : 'i-heroicons-eye',
          size: 'xs',
          variant: 'soft',
          color: hasPermission('users_edit') ? 'secondary' : 'primary',
          class: 'hover:scale-105 transition-transform',
          onClick: () => hasPermission('users_edit') ? editUser(row.original) : viewUser(row.original)
        }, () => '')
      );
      
      // Delete button (if permission)
      if (hasPermission('users_delete')) {
        buttons.push(
          h(UButton, {
            icon: 'mingcute:delete-fill',
            size: 'xs',
            variant: 'soft',
            color: 'error',
            class: 'hover:scale-105 transition-transform',
            onClick: () => deleteUser(row.original.id)
          }, () => '')
        );
      }
      
      return h('div', { class: 'flex justify-end space-x-2' }, buttons);
    }
  }
];

// Skeleton columns for loading state
const skeletonColumns = [
  {
    accessorKey: 'email',
    header: 'Email',
    cell: () => h('div', { class: 'flex items-center gap-3' }, [
      h('div', { class: 'h-8 w-8 rounded-full bg-gray-200' }),
      h('div', { class: 'space-y-2' }, [
        h('div', { class: 'h-4 w-48 bg-gray-200 rounded' }),
        h('div', { class: 'h-3 w-32 bg-gray-200 rounded' })
      ])
    ])
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: () => h('div', { class: 'h-6 w-16 bg-gray-200 rounded-full' })
  },
  {
    accessorKey: 'roleId',
    header: 'Role',
    cell: () => h('div', { class: 'h-6 w-20 bg-gray-200 rounded-full' })
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: () => h('div', { class: 'space-y-1' }, [
      h('div', { class: 'h-4 w-20 bg-gray-200 rounded' }),
      h('div', { class: 'h-3 w-16 bg-gray-200 rounded' })
    ])
  },
  {
    accessorKey: 'lastSignIn',
    header: 'Last Sign In',
    cell: () => h('div', { class: 'space-y-1' }, [
      h('div', { class: 'h-4 w-20 bg-gray-200 rounded' }),
      h('div', { class: 'h-3 w-16 bg-gray-200 rounded' })
    ])
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    enableSorting: false,
    cell: () => h('div', { class: 'flex justify-end space-x-2' }, [
      h('div', { class: 'h-8 w-16 bg-gray-200 rounded' }),
      h('div', { class: 'h-8 w-16 bg-gray-200 rounded' })
    ])
  }
];

// Load data on component mount
onMounted(async () => {
  try {
    const promises = [];
    
    // Always force refresh user profiles on component mount to ensure fresh data
    // This prevents stale data from localStorage cache
    promises.push(userProfilesStore.fetchUsers(true));
    
    // Always fetch roles fresh (no caching for permissions)
    if (roleStore.roles.length === 0) {
      promises.push(roleStore.fetchRoles());
    }
    
    if (!corporationStore.isReady) {
      promises.push(corporationStore.fetchCorporations());
    }
    
    // Only await if we actually need to fetch data
    if (promises.length > 0) {
      await Promise.all(promises);
    }
    
    // Ensure roles are loaded and role options are set
    if (roleStore.roles.length > 0) {
      roleOptions.value = roleStore.roles.map(role => ({
        label: role.role_name,
        value: role.id
      }));
    }
  } catch (error) {
    console.error('Error in onMounted:', error);
  }
});

// Watch for changes in roles and update role options
watch(() => roleStore.roles, (newRoles) => {
  if (newRoles && newRoles.length > 0) {
    roleOptions.value = newRoles.map(role => ({
      label: role.role_name,
      value: role.id
    }));
  } else {
    roleOptions.value = [];
  }
}, { immediate: true });

function resetForm() {
  form.value = {
    email: "",
  };
}

function resetEditForm() {
  editForm.value = {
    userId: "",
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    roleId: undefined,
    status: 'active',
    imageFile: [],
    imageUrl: "",
    corporationAccess: []
  };
}

function handleInviteClick() {
  if (hasPermission('users_add')) {
    showModal.value = true;
  } else {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to invite users. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
  }
}

function closeModal() {
  showModal.value = false;
  resetForm();
}

function closeEditModal() {
  showEditModal.value = false;
  isViewMode.value = false;
  resetEditForm();
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  userToDelete.value = null;
}

async function submitInvite() {
  // Basic validation
  if (!form.value.email.trim()) {
    toast.add({
      title: 'Validation Error',
      description: 'Please enter an email address',

      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(form.value.email.trim())) {
    toast.add({
      title: 'Validation Error',
      description: 'Please enter a valid email address',

      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  try {
    await userProfilesStore.inviteUser(form.value.email.trim());
    
    // Show success toast
    toast.add({
      title: 'Success',
      description: 'Invitation sent successfully!',

      icon: 'i-heroicons-check-circle'
    });
    
    // Close modal immediately
    closeModal();
  } catch (error) {
    console.error('Error sending invitation:', error);
    
    // Show error toast
    toast.add({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to send invitation. Please try again.',

      icon: 'i-heroicons-exclamation-triangle'
    });
  }
}

function viewUser(user: InvitedUser) {
  isViewMode.value = true;
  editForm.value = {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    address: user.address,
    roleId: user.roleId,
    status: user.status === 'pending' ? 'active' : user.status,
    imageFile: [],
    imageUrl: user.imageUrl || "",
    corporationAccess: user.corporationAccess || []
  };
  
  // Only fetch corporations if not already available
  if (!corporationStore.isReady) {
    corporationStore.fetchCorporations();
  }
  
  showEditModal.value = true;
}

async function editUser(user: InvitedUser) {
  isViewMode.value = false;
  editForm.value = {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    address: user.address,
    roleId: user.roleId,
    status: user.status === 'pending' ? 'active' : user.status,
    imageFile: [],
    imageUrl: user.imageUrl || "",
    corporationAccess: user.corporationAccess || []
  };
  
  // Only fetch corporations if not already available
  if (!corporationStore.isReady) {
    await corporationStore.fetchCorporations();
  }
  
  showEditModal.value = true;
}

function handleImageChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    editForm.value.imageFile = Array.from(target.files);
    // Create a preview URL for the selected image
    const reader = new FileReader();
    reader.onload = (e) => {
      editForm.value.imageUrl = e.target?.result as string;
    };
    const firstFile = target.files[0];
    if (firstFile) {
      reader.readAsDataURL(firstFile);
    }
  }
}

function handleCorporationChange(event: Event) {
  const target = event.target as HTMLInputElement;
  // Debug: Uncomment if needed
  // console.log('Corporation checkbox changed:', target.value, target.checked);
  // console.log('Current corporationAccess array:', editForm.value.corporationAccess);
}

async function submitEdit() {
  try {
    // Handle image upload if a new image was selected
    let imageUrl = editForm.value.imageUrl;
    if (editForm.value.imageFile && editForm.value.imageFile.length > 0) {
      try {
        // Validate userId exists
        if (!editForm.value.userId) {
          // Show error toast
          toast.add({
            title: 'Error',
            description: 'User ID is missing. Please try again.',
      
            icon: 'i-heroicons-exclamation-triangle'
          });
          return;
        }
        
        // Get the first file and validate it exists
        const firstFile = editForm.value.imageFile[0];
        if (!firstFile) {
          throw new Error('No image file selected');
        }
        
        // Convert file to base64 for upload
        const base64Data = await fileToBase64(firstFile);
        
        const uploadPayload = {
          userId: editForm.value.userId,
          imageData: base64Data,
          fileName: firstFile.name
        };
        
        // Upload image
        const { data: uploadResponse } = await useFetch('/api/users/upload-image', {
          method: 'POST',
          body: uploadPayload
        });
        
        if (uploadResponse.value && 'success' in uploadResponse.value && uploadResponse.value.success) {
          imageUrl = uploadResponse.value.data.imageUrl;
        } else {
          const errorMessage = uploadResponse.value && 'error' in uploadResponse.value ? uploadResponse.value.error : 'Failed to upload image';
          throw new Error(errorMessage);
        }
      } catch (uploadError) {
        // Show error toast
        toast.add({
          title: 'Error',
          description: 'Failed to upload image. Please try again.',
    
          icon: 'i-heroicons-exclamation-triangle'
        });
        return;
      }
    }
    
    // Update user data with the new image URL
    const updateData = {
      ...editForm.value,
      imageUrl: imageUrl
    };
    
    const result = await userProfilesStore.updateUser(updateData);
    
    // Update the specific user in the store instead of refetching all
    if (result && result.data) {
      const userIndex = userProfilesStore.users.findIndex(user => user.id === editForm.value.userId);
      if (userIndex !== -1) {
        userProfilesStore.users[userIndex] = { ...userProfilesStore.users[userIndex], ...result.data };
      }
    }
    
    // Show success toast
    toast.add({
      title: 'Success',
      description: 'User updated successfully!',

      icon: 'i-heroicons-check-circle'
    });
    
    // Close modal immediately
    closeEditModal();
  } catch (error) {
    console.error('Error updating user:', error);
    
    // Show error toast
    toast.add({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to update user. Please try again.',

      icon: 'i-heroicons-exclamation-triangle'
    });
  }
}

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

async function deleteUser(id: string) {
  // Check if user has permission to delete
  if (!hasPermission('users_delete')) {
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to delete users. Please contact your administrator.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  userToDelete.value = userProfilesStore.users.find(u => u.id === id) || null;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!userToDelete.value) {
    return;
  }

  try {
    // Show loading state
    userProfilesStore.loading = true;

    await userProfilesStore.deleteUser(userToDelete.value.id);
    
    // Remove the user from the store instead of refetching all
    const userIndex = userProfilesStore.users.findIndex(user => user.id === userToDelete.value?.id);
    if (userIndex !== -1) {
      userProfilesStore.users.splice(userIndex, 1);
    }
    
    // Show success toast
    toast.add({
      title: 'Success',
      description: 'User removed successfully!',

      icon: 'i-heroicons-check-circle'
    });
    
    // Close delete modal
    closeDeleteModal();

  } catch (error) {
    // Show error toast
    toast.add({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to remove user',

      icon: 'i-heroicons-exclamation-triangle'
    });
  } finally {
    userProfilesStore.loading = false;
  }
}

// Helpers for corporation access selection UI
function selectAllCorporations() {
  const allUuids = filteredCorporationsForEdit.value.map(
    (corp: any) => corp.uuid
  );
  editForm.value.corporationAccess = [...new Set(allUuids)];
}

function clearAllCorporations() {
  editForm.value.corporationAccess = [];
}

function clearVisibleCorporations() {
  const visible = new Set(
    filteredCorporationsForEdit.value.map((corp: any) => corp.uuid)
  );
  editForm.value.corporationAccess = editForm.value.corporationAccess.filter(
    (uuid) => !visible.has(uuid)
  );
}

function toggleCorporationAccess(uuid: string, checked: boolean) {
  const current = new Set(editForm.value.corporationAccess);
  if (checked) {
    current.add(uuid);
  } else {
    current.delete(uuid);
  }
  editForm.value.corporationAccess = Array.from(current);
}
</script>
