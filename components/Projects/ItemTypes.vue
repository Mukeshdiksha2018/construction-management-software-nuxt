<template>
  <div class="space-y-4">
    <!-- Item Types Table -->
    <div v-if="itemTypesStore.loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Loading skeleton -->
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-6 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
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
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center justify-center">
              <USkeleton class="h-4 w-16" />
            </div>
          </div>
        </div>
        
        <!-- Table Body -->
        <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="i in 5" :key="i" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
            <div class="grid grid-cols-6 gap-4 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 border-gray-100 dark:border-gray-700">
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-12" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-16" />
              </div>
              <div class="flex items-center justify-end gap-1">
                <USkeleton class="h-6 w-6 rounded" />
                <USkeleton class="h-6 w-6 rounded" />
                <USkeleton class="h-6 w-6 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="itemTypesStore.error">
      <UAlert
        icon="i-heroicons-exclamation-triangle"
        color="error"
        variant="soft"
        :title="itemTypesStore.error"
        :description="'Please try refreshing the page or contact support if the issue persists.'"
      />
    </div>

    <div v-else-if="filteredItemTypes.length && isReady">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        v-model:column-pinning="columnPinning"
        :pagination-options="paginationOptions"
        :data="filteredItemTypes as any[]" 
        :columns="columns"
        v-model:selected="selectedItemTypes"
        v-model:global-filter="globalFilter"
        :selectable="true"
        class="max-h-[70vh] overflow-auto"
      />
      
      <!-- Pagination -->
      <div v-if="shouldShowPagination(filteredItemTypes.length).value" class="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
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
        
        <UPagination v-bind="getPaginationProps(table)" />
        
        <div class="text-sm text-gray-600">
          {{ getPageInfo(table, 'item types').value }}
        </div>
      </div>
    </div>

    <div v-else-if="isReady" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-tag" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg">No item types found</p>
      <p class="text-gray-400 text-sm mb-6">
        {{ props.globalFilter ? 'No item types match your search criteria' : 'Create your first item type to get started' }}
      </p>
      <UButton 
        v-if="!props.globalFilter"
        icon="i-heroicons-plus" 
        @click="openAddModal"
      >
        Add Item Type
      </UButton>
    </div>

    <!-- Add Item Type Modal -->
    <UModal v-model:open="showAddModal" :ui="{ wrapper: 'max-w-4xl', body: 'p-6' }">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-base font-semibold">Add New Item Type</h3>
          <UButton icon="i-heroicons-x-mark" size="xs" variant="solid" color="neutral" @click="closeAddModal" />
        </div>
      </template>
      
      <template #body>
        <form class="space-y-4">
          <!-- Responsive 2-column layout -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Corporation Selection -->
            <div>
              <label class="block text-sm font-medium text-default mb-1">
                Corporation <span class="text-red-500">*</span>
              </label>
              <CorporationSelect
                :model-value="itemTypeForm.corporation_uuid"
                placeholder="Select corporation"
                size="sm"
                class="w-full"
                @update:model-value="(value) => handleCorporationChange(value)"
                @change="(corporation) => handleCorporationChange(corporation?.value || corporation)"
              />
            </div>

            <!-- Project Selection -->
            <div>
              <label class="block text-sm font-medium text-default mb-1">
                Project <span class="text-red-500">*</span>
              </label>
              <USelectMenu
                :model-value="selectedProjectOption"
                :items="projectOptions"
                :loading="projectsStore.loading"
                :disabled="projectsStore.loading || !itemTypeForm.corporation_uuid"
                :placeholder="!itemTypeForm.corporation_uuid ? 'Select corporation first' : 'Search and select project'"
                size="sm"
                class="w-full"
                value-attribute="value"
                option-attribute="label"
                searchable
                searchable-placeholder="Search projects..."
                @update:model-value="onProjectSelected"
              >
                <template #item-label="{ item }">
                  <div class="flex items-center justify-between w-full">
                    <div class="flex items-center gap-2 min-w-0 flex-1">
                      <span class="truncate font-medium">{{ item.label }}</span>
                      <UBadge
                        :color="item.status_color"
                        variant="solid"
                        size="xs"
                      >
                        {{ item.status }}
                      </UBadge>
                    </div>
                  </div>
                </template>
              </USelectMenu>
            </div>

            <!-- Item Type -->
            <div>
              <label class="block text-sm font-medium text-default mb-1">
                Item Type <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="itemTypeForm.item_type"
                placeholder="Enter item type name"
                size="sm"
                class="w-full"
              />
            </div>

            <!-- Short Name -->
            <div>
              <label class="block text-sm font-medium text-default mb-1">
                Short Name <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="itemTypeForm.short_name"
                placeholder="Enter short name"
                size="sm"
                class="w-full"
              />
            </div>
          </div>

          <!-- Active Toggle (full width) -->
          <div>
            <label class="block text-sm font-medium text-default mb-1">
              Active
            </label>
            <UCheckbox
              v-model="itemTypeForm.is_active"
              label="Active"
              class="text-sm"
            />
          </div>

        </form>
      </template>
      
      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton variant="solid" color="neutral" @click="closeAddModal">Cancel</UButton>
          <UButton 
            variant="solid" 
            color="primary" 
            :disabled="!isFormValid || isCreating"
            :loading="isCreating"
            @click="saveItemType"
          >
            Create Item Type
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Edit Item Type Modal -->
    <UModal v-model:open="showEditModal" :ui="{ wrapper: 'max-w-4xl', body: 'p-6' }">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-base font-semibold">Edit Item Type</h3>
          <UButton icon="i-heroicons-x-mark" size="xs" variant="solid" color="neutral" @click="closeEditModal" />
        </div>
      </template>
      
      <template #body>
        <!-- Warning banner when user tries to change corporation with items -->
        <UBanner
          v-if="showCorporationChangeWarning && hasItemsForEditingItemType"
          icon="i-heroicons-exclamation-triangle"
          color="error"
          :title="`Cannot Change Corporation: This item type has ${getItemsForItemType(originalItemType?.uuid, originalItemType?.corporation_uuid).length} item(s) associated with it. Changing the corporation would affect existing items in the project. Please remove or reassign all items before changing the corporation.`"
          close
          class="mb-4"
          @close="showCorporationChangeWarning = false"
        />
        
        <form class="space-y-4">
          <!-- Responsive 2-column layout -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Corporation Selection -->
            <div>
              <label class="block text-sm font-medium text-default mb-1">
                Corporation <span class="text-red-500">*</span>
              </label>
              <CorporationSelect
                :model-value="editForm.corporation_uuid"
                placeholder="Select corporation"
                size="sm"
                class="w-full"
                @update:model-value="(value) => handleEditCorporationChange(value)"
                @change="(corporation) => handleEditCorporationChange(corporation?.value || corporation)"
              />
            </div>

            <!-- Project Selection -->
            <div>
              <label class="block text-sm font-medium text-default mb-1">
                Project <span class="text-red-500">*</span>
              </label>
              <USelectMenu
                :model-value="editSelectedProjectOption"
                :items="editProjectOptions"
                :loading="projectsStore.loading"
                :disabled="projectsStore.loading || !editForm.corporation_uuid"
                :placeholder="!editForm.corporation_uuid ? 'Select corporation first' : 'Search and select project'"
                size="sm"
                class="w-full"
                value-attribute="value"
                option-attribute="label"
                searchable
                searchable-placeholder="Search projects..."
                @update:model-value="onEditProjectSelected"
              >
                <template #item-label="{ item }">
                  <div class="flex items-center justify-between w-full">
                    <div class="flex items-center gap-2 min-w-0 flex-1">
                      <span class="truncate font-medium">{{ item.label }}</span>
                      <UBadge
                        :color="item.status_color"
                        variant="solid"
                        size="xs"
                      >
                        {{ item.status }}
                      </UBadge>
                    </div>
                  </div>
                </template>
              </USelectMenu>
            </div>

            <!-- Item Type -->
            <div>
              <label class="block text-sm font-medium text-default mb-1">
                Item Type <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="editForm.item_type"
                placeholder="Enter item type name"
                size="sm"
                class="w-full"
              />
            </div>

            <!-- Short Name -->
            <div>
              <label class="block text-sm font-medium text-default mb-1">
                Short Name <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="editForm.short_name"
                placeholder="Enter short name"
                size="sm"
                class="w-full"
              />
            </div>
          </div>

          <!-- Active Toggle (full width) -->
          <div>
            <label class="block text-sm font-medium text-default mb-1">
              Active
            </label>
            <UCheckbox
              v-model="editForm.is_active"
              label="Active"
              class="text-sm"
            />
          </div>

        </form>
      </template>
      
      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton variant="solid" color="neutral" @click="closeEditModal">Cancel</UButton>
          <UButton 
            variant="solid" 
            color="primary" 
            :disabled="!isEditFormValid || isUpdating"
            :loading="isUpdating"
            @click="updateItemType"
          >
            Update Item Type
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-base font-semibold text-red-600">Delete Item Type</h3>
          <UButton icon="i-heroicons-x-mark" size="xs" variant="solid" color="neutral" @click="closeDeleteModal" />
        </div>
      </template>
      
      <template #body>
        <div class="space-y-4">
          <div class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p class="font-medium text-red-800 dark:text-red-200">Are you sure you want to delete this item type?</p>
              <p class="text-sm text-red-600 dark:text-red-300 mt-1">
                This action cannot be undone. The item type{{ itemTypeToDelete && getItemsForItemType(itemTypeToDelete.uuid, itemTypeToDelete.corporation_uuid).length > 0 ? ' and all its associated items' : '' }} will be permanently removed.
              </p>
            </div>
          </div>
          
          <div v-if="itemTypeToDelete" class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 class="font-medium text-gray-900 dark:text-white mb-2">Item Type Details:</h4>
            <div class="space-y-1 text-sm">
              <div><span class="text-gray-600 dark:text-gray-400">Name:</span> <span class="font-medium">{{ itemTypeToDelete.item_type }}</span></div>
              <div><span class="text-gray-600 dark:text-gray-400">Short Name:</span> <span class="font-medium">{{ itemTypeToDelete.short_name }}</span></div>
              <div><span class="text-gray-600 dark:text-gray-400">Project:</span> <span class="font-medium">{{ itemTypeToDelete.project?.project_name }}</span></div>
              <div><span class="text-gray-600 dark:text-gray-400">Associated Items:</span> <span class="font-medium">{{ getItemsForItemType(itemTypeToDelete.uuid, itemTypeToDelete.corporation_uuid).length }} item(s)</span></div>
            </div>
          </div>
          
          <div v-if="itemTypeToDelete && getItemsForItemType(itemTypeToDelete.uuid, itemTypeToDelete.corporation_uuid).length > 0" class="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
            <div class="flex items-start">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h4 class="text-sm font-medium text-red-800 mb-1">Warning: Items Attached</h4>
                <p class="text-sm text-red-700">
                  This item type has {{ getItemsForItemType(itemTypeToDelete.uuid, itemTypeToDelete.corporation_uuid).length }} item(s) associated with it. 
                  Deleting this item type will also permanently remove all associated items.
                </p>
              </div>
            </div>
          </div>
        </div>
      </template>
      
      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton variant="solid" color="neutral" @click="closeDeleteModal">Cancel</UButton>
          <UButton 
            variant="solid" 
            color="error" 
            :loading="isDeleting"
            @click="deleteItemType"
          >
            Delete Item Type
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, h, onMounted, nextTick, useTemplateRef, resolveComponent } from 'vue';
import { useCorporationStore } from '@/stores/corporations';
import { useProjectsStore } from '@/stores/projects';
import { useItemTypesStore } from '@/stores/itemTypes';
import { useCostCodeConfigurationsStore } from '@/stores/costCodeConfigurations';
import CostCodeSelect from '@/components/Shared/CostCodeSelect.vue';
import CorporationSelect from '@/components/Shared/CorporationSelect.vue';
import { useTableStandard } from '@/composables/useTableStandard';
import { useDateFormat } from '@/composables/useDateFormat';
import { usePermissions } from '@/composables/usePermissions';
import type { TableColumn } from '@nuxt/ui';

// Resolve components for table columns
const UButton = resolveComponent('UButton');
const UTooltip = resolveComponent('UTooltip');
const USelectMenu = resolveComponent('USelectMenu');
const UInput = resolveComponent('UInput');

interface Props {
  globalFilter?: string;
  projectFilter?: string;
}

const props = withDefaults(defineProps<Props>(), {
  globalFilter: '',
  projectFilter: undefined
});

// Stores
const corpStore = useCorporationStore();
const projectsStore = useProjectsStore();
const itemTypesStore = useItemTypesStore();
const configurationsStore = useCostCodeConfigurationsStore();

// Use permissions composable
const { hasPermission, isReady } = usePermissions();

// Use date format composable
const { formatDate } = useDateFormat();

const corporationNameByUuid = computed<Record<string, string>>(() => {
  const list = corpStore.corporations || []
  const map: Record<string, string> = {}
  list.forEach((corp: any) => { 
    if (corp?.uuid) {
      map[corp.uuid] = corp.corporation_name || corp.uuid
    }
  })
  return map
})

// Table functionality
const {
  pagination,
  paginationOptions,
  pageSizeOptions,
  updatePageSize,
  getPaginationProps,
  getPageInfo,
  shouldShowPagination
} = useTableStandard();

// Data state
const selectedItemTypes = ref<any[]>([]);
const globalFilter = ref('');

// Column pinning for sticky actions column
const columnPinning = ref({
  left: [],
  right: ['actions']
});

// Table ref for accessing table API
const table = useTemplateRef<any>('table');

// Modal states
const showAddModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);

// Form data
const itemTypeForm = ref({
  corporation_uuid: '',
  project_uuid: '',
  item_type: '',
  short_name: '',
  is_active: true
});

const editForm = ref({
  uuid: '',
  corporation_uuid: '',
  project_uuid: '',
  item_type: '',
  short_name: '',
  is_active: true
});

// Loading state for create/update actions
const isCreating = ref(false);
const isUpdating = ref(false);

// Selected projects for summary display
const selectedProject = ref<any>(null);
const editSelectedProject = ref<any>(null);

// Delete state
const itemTypeToDelete = ref<any>(null);
const isDeleting = ref(false);

// Store original item type when editing (to restore on cancel and check for items)
const originalItemType = ref<any>(null);
// Track if user attempted to change corporation
const showCorporationChangeWarning = ref(false);

// Computed properties
const getCorporationName = computed(() => {
  return corpStore.selectedCorporation?.corporation_name || "Unnamed Corporation";
});

const projectOptions = computed(() => {
  const corporationUuid = itemTypeForm.value.corporation_uuid || corpStore.selectedCorporation?.uuid;
  
  if (!corporationUuid) {
    return [];
  }
  
  const activeProjects = projectsStore.projects.filter(
    project => project.is_active && project.corporation_uuid === corporationUuid
  );
  
  return activeProjects.map(project => ({
    label: `${project.project_name} (${project.project_id})`,
    value: project.uuid,
    project: project,
    status: project.project_status,
    status_color: getStatusColor(project.project_status)
  }));
});

const editProjectOptions = computed(() => {
  const corporationUuid = editForm.value.corporation_uuid || corpStore.selectedCorporation?.uuid;
  
  if (!corporationUuid) {
    return [];
  }
  
  const activeProjects = projectsStore.projects.filter(
    project => project.is_active && project.corporation_uuid === corporationUuid
  );
  
  return activeProjects.map(project => ({
    label: `${project.project_name} (${project.project_id})`,
    value: project.uuid,
    project: project,
    status: project.project_status,
    status_color: getStatusColor(project.project_status)
  }));
});

const isFormValid = computed(() => {
  return !!(
    itemTypeForm.value.corporation_uuid &&
    itemTypeForm.value.project_uuid &&
    itemTypeForm.value.item_type?.trim() &&
    itemTypeForm.value.short_name?.trim()
  );
});

const isEditFormValid = computed(() => {
  return !!(
    editForm.value.corporation_uuid &&
    editForm.value.project_uuid &&
    editForm.value.item_type?.trim() &&
    editForm.value.short_name?.trim()
  );
});

// Computed properties for USelectMenu model values
const selectedProjectOption = computed(() => {
  if (!itemTypeForm.value.project_uuid) return undefined;
  return projectOptions.value.find(opt => opt.value === itemTypeForm.value.project_uuid) || undefined;
});

const editSelectedProjectOption = computed(() => {
  if (!editForm.value.project_uuid) return undefined;
  return projectOptions.value.find(opt => opt.value === editForm.value.project_uuid) || undefined;
});

// Filtered item types based on global search and project filter
const filteredItemTypes = computed(() => {
  let filtered = itemTypesStore.itemTypes;
  
  // Apply project filter first
  if (props.projectFilter) {
    filtered = filtered.filter(itemType => itemType.project_uuid === props.projectFilter);
  }
  
  // Apply global search filter
  if (props.globalFilter?.trim()) {
    const query = props.globalFilter.toLowerCase();
    filtered = filtered.filter(itemType => 
      itemType.item_type.toLowerCase().includes(query) ||
      itemType.short_name.toLowerCase().includes(query) ||
      itemType.project?.project_name.toLowerCase().includes(query) ||
      itemType.project?.project_id.toLowerCase().includes(query)
    );
  }
  
  return filtered;
});

// Helper function to check if an item type has associated items
// Checks items in the item type's corporation
const getItemsForItemType = (itemTypeUuid: string, corporationUuid?: string) => {
  // Use provided corporation UUID or fallback to selected corporation
  const corpUuid = corporationUuid || corpStore.selectedCorporation?.uuid;
  if (!corpUuid) return [];
  const allItems = configurationsStore.getAllItems(corpUuid);
  return allItems.filter(item => item.item_type_uuid === itemTypeUuid);
};

// Check if the item type being edited has associated items
const hasItemsForEditingItemType = computed(() => {
  if (!originalItemType.value?.uuid || !originalItemType.value?.corporation_uuid) {
    return false;
  }
  const items = getItemsForItemType(originalItemType.value.uuid, originalItemType.value.corporation_uuid);
  return items.length > 0;
});

// Table columns configuration
const columns: TableColumn<any>[] = [
  {
    accessorKey: 'project',
    header: 'Project',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const itemType = row.original;
      // Try to get project from the itemType.project first, then fallback to fetching from projectsStore
      let project = itemType.project;
      
      // If project is not available in itemType.project, try to find it in projectsStore
      if (!project && itemType.project_uuid) {
        project = projectsStore.projects.find(p => p.uuid === itemType.project_uuid);
      }
      
      return h('div', { class: 'flex items-center gap-2' }, [
        h('div', { class: 'flex items-center gap-2' }, [
          h('div', { class: 'text-sm font-medium text-default' }, project?.project_name || 'Loading...'),
          h('div', { class: 'text-xs text-gray-500' }, project?.project_id || 'N/A')
        ])
      ]);
    }
  },
  {
    accessorKey: 'item_type',
    header: 'Item Type',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      return h('div', { class: 'flex items-center gap-2' }, [
        h('div', { class: 'text-sm font-medium text-default' }, row.original.item_type),
        h('div', { class: 'text-xs text-gray-500' }, row.original.short_name)
      ]);
    }
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const isActive = row.original.is_active;
      const colorClass = isActive ? 'bg-success/10 text-success' : 'bg-error/10 text-error';
      const text = isActive ? 'Active' : 'Inactive';
      
      return h('span', { 
        class: `inline-flex items-center px-2 py-1 gap-1 rounded-md text-xs font-medium ${colorClass}` 
      }, text);
    }
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'text-sm text-gray-600 dark:text-gray-400' }, formatDate(row.original.created_at))
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    enableSorting: false,
    meta: { class: { th: 'text-right sticky right-0 z-10 w-32', td: 'text-right sticky right-0 w-32' } },
    cell: ({ row }: { row: { original: any } }) => {
      const buttons = [];
      
      // View button - show if user has view permission
      if (hasPermission('project_items_view')) {
        buttons.push(
          h(UTooltip, { text: 'View Item Type Details' }, () => [
            h(UButton, {
              icon: 'i-heroicons-eye-solid',
              size: 'xs',
              variant: 'soft',
              color: 'neutral',
              class: 'hover:scale-105 transition-transform',
              onClick: () => viewItemType(row.original)
            }, () => '')
          ])
        );
      }
      
      // Edit button - show if user has edit permission
      if (hasPermission('project_items_edit')) {
        buttons.push(
          h(UTooltip, { text: 'Edit Item Type' }, () => [
            h(UButton, {
              icon: 'tdesign:edit-filled',
              size: 'xs',
              variant: 'soft',
              color: 'secondary',
              class: 'hover:scale-105 transition-transform',
              onClick: () => editItemType(row.original)
            }, () => '')
          ])
        );
      }
      
      // Delete button - show if user has delete permission
      if (hasPermission('project_items_delete')) {
        buttons.push(
          h(UTooltip, { text: 'Delete Item Type' }, () => [
            h(UButton, {
              icon: 'mingcute:delete-fill',
              size: 'xs',
              variant: 'soft',
              color: 'error',
              class: 'hover:scale-105 transition-transform',
              onClick: () => confirmDeleteItemType(row.original)
            }, () => '')
          ])
        );
      }
      
      return h('div', { class: 'flex justify-end space-x-2' }, buttons);
    }
  }
];

// Methods
const openAddModal = () => {
  if (!hasPermission('project_items_create')) {
    const toast = useToast();
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to create item types.',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  // Auto-set corporation to currently selected corporation (can be changed by user)
  itemTypeForm.value.corporation_uuid = corpStore.selectedCorporation?.uuid || '';
  
  // Reset form
  itemTypeForm.value.project_uuid = '';
  itemTypeForm.value.item_type = '';
  itemTypeForm.value.short_name = '';
  itemTypeForm.value.is_active = true;
  selectedProject.value = null;
  
  showAddModal.value = true;
};

const closeAddModal = () => {
  showAddModal.value = false;
  selectedProject.value = null;
};

const handleCorporationChange = (value: string | undefined) => {
  if (typeof value === 'string') {
    itemTypeForm.value.corporation_uuid = value;
    // Clear project selection when corporation changes
    itemTypeForm.value.project_uuid = '';
    selectedProject.value = null;
    // Fetch projects for the selected corporation
    if (value) {
      projectsStore.fetchProjects(value);
    }
  } else if (value === undefined || value === null) {
    itemTypeForm.value.corporation_uuid = '';
    itemTypeForm.value.project_uuid = '';
    selectedProject.value = null;
  }
};

const onProjectSelected = (selected: any) => {
  if (selected && selected.value) {
    itemTypeForm.value.project_uuid = selected.value;
    const project = projectsStore.projects.find(p => p.uuid === selected.value);
    selectedProject.value = project || null;
  } else {
    itemTypeForm.value.project_uuid = '';
    selectedProject.value = null;
  }
};

const handleEditCorporationChange = (value: string | undefined) => {
  // Check if user is trying to change from the original corporation
  const isChangingCorporation = originalItemType.value && 
    value !== originalItemType.value.corporation_uuid &&
    value !== undefined &&
    value !== null;

  // If user tries to change corporation and items exist, show warning and prevent change
  if (isChangingCorporation && hasItemsForEditingItemType.value) {
    // Show warning banner
    showCorporationChangeWarning.value = true;
    // Reset to original corporation
    editForm.value.corporation_uuid = originalItemType.value?.corporation_uuid || '';
    return;
  }

  // Hide warning if corporation change is allowed or reverted
  if (!isChangingCorporation) {
    showCorporationChangeWarning.value = false;
  }

  if (typeof value === 'string') {
    editForm.value.corporation_uuid = value;
    // Clear project selection when corporation changes
    editForm.value.project_uuid = '';
    editSelectedProject.value = null;
    // Fetch projects for the selected corporation
    if (value) {
      projectsStore.fetchProjects(value);
    }
  } else if (value === undefined || value === null) {
    editForm.value.corporation_uuid = '';
    editForm.value.project_uuid = '';
    editSelectedProject.value = null;
  }
};

const onEditProjectSelected = (selected: any) => {
  if (selected && selected.value) {
    editForm.value.project_uuid = selected.value;
    const project = projectsStore.projects.find(p => p.uuid === selected.value);
    editSelectedProject.value = project || null;
  } else {
    editForm.value.project_uuid = '';
    editSelectedProject.value = null;
  }
};

const saveItemType = async () => {
  if (!isFormValid.value) {
    const toast = useToast();
    toast.add({
      title: 'Validation Error',
      description: 'Please fill in all required fields',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  try {
    isCreating.value = true;
    const result = await itemTypesStore.createItemType({
      corporation_uuid: itemTypeForm.value.corporation_uuid,
      project_uuid: itemTypeForm.value.project_uuid,
      item_type: itemTypeForm.value.item_type,
      short_name: itemTypeForm.value.short_name,
      is_active: itemTypeForm.value.is_active
    });

    if (result) {
      const toast = useToast();
      toast.add({
        title: 'Success',
        description: 'Item type created successfully',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      });
      
      closeAddModal();
      isCreating.value = false;
    } else {
      isCreating.value = false;
      throw new Error(itemTypesStore.error || 'Failed to create item type');
    }
  } catch (error) {
    console.error('Error creating item type:', error);
    const toast = useToast();
    toast.add({
      title: 'Error',
      description: itemTypesStore.error || 'Failed to create item type',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    isCreating.value = false;
  }
};

// Helper functions
const getStatusColor = (status: string): "error" | "warning" | "info" | "success" | "primary" | "secondary" | "neutral" => {
  const statusColors: Record<string, "error" | "warning" | "info" | "success" | "primary" | "secondary" | "neutral"> = {
    'Pending': 'warning',
    'In Progress': 'info',
    'Completed': 'success',
    'On Hold': 'error'
  };
  return statusColors[status] || 'neutral';
};



// View method (placeholder for future implementation)
const viewItemType = (itemType: any) => {
  if (!hasPermission('project_items_view')) {
    const toast = useToast();
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to view item types.',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  // TODO: Implement view functionality
  console.log('View item type:', itemType);
  const toast = useToast();
  toast.add({
    title: 'Info',
    description: 'View functionality will be implemented soon',
    color: 'info',
    icon: 'i-heroicons-information-circle'
  });
};

// Edit modal methods
const editItemType = (itemType: any) => {
  if (!hasPermission('project_items_edit')) {
    const toast = useToast();
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to edit item types.',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  // Store original item type for comparison and item checking
  originalItemType.value = { ...itemType };

  editForm.value = {
    uuid: itemType.uuid,
    corporation_uuid: itemType.corporation_uuid,
    project_uuid: itemType.project_uuid,
    item_type: itemType.item_type,
    short_name: itemType.short_name,
    is_active: itemType.is_active
  };
  
  // Fetch projects and configurations for the corporation if not already loaded
  // This is needed to check for associated items
  if (itemType.corporation_uuid) {
    projectsStore.fetchProjects(itemType.corporation_uuid);
    configurationsStore.fetchConfigurations(itemType.corporation_uuid);
  }
  
  // Set the selected project for edit modal
  if (itemType.project_uuid) {
    const project = projectsStore.projects.find(p => p.uuid === itemType.project_uuid);
    editSelectedProject.value = project || null;
  }

  showEditModal.value = true;
};

const closeEditModal = () => {
  showEditModal.value = false;
  editSelectedProject.value = null;
  originalItemType.value = null;
  showCorporationChangeWarning.value = false;
  editForm.value = {
    uuid: '',
    corporation_uuid: '',
    project_uuid: '',
    item_type: '',
    short_name: '',
    is_active: true
  };
};

const updateItemType = async () => {
  if (!isEditFormValid.value) {
    const toast = useToast();
    toast.add({
      title: 'Validation Error',
      description: 'Please fill in all required fields',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  try {
    isUpdating.value = true;
    const result = await itemTypesStore.updateItemType({
      uuid: editForm.value.uuid,
      corporation_uuid: editForm.value.corporation_uuid,
      project_uuid: editForm.value.project_uuid,
      item_type: editForm.value.item_type,
      short_name: editForm.value.short_name,
      is_active: editForm.value.is_active
    });

    if (result) {
      const toast = useToast();
      toast.add({
        title: 'Success',
        description: 'Item type updated successfully',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      });
      
      closeEditModal();
      isUpdating.value = false;
    } else {
      isUpdating.value = false;
      throw new Error(itemTypesStore.error || 'Failed to update item type');
    }
  } catch (error) {
    console.error('Error updating item type:', error);
    const toast = useToast();
    toast.add({
      title: 'Error',
      description: itemTypesStore.error || 'Failed to update item type',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
  } finally {
    isUpdating.value = false;
  }
};

// Delete modal methods
const confirmDeleteItemType = (itemType: any) => {
  if (!hasPermission('project_items_delete')) {
    const toast = useToast();
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to delete item types.',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  // Check if item type has associated items (check in the item type's corporation)
  const associatedItems = getItemsForItemType(itemType.uuid, itemType.corporation_uuid);
  
  if (associatedItems.length > 0) {
    const toast = useToast();
    toast.add({
      title: 'Cannot Delete Item Type',
      description: `This item type has ${associatedItems.length} item(s) associated with it. Please reassign or remove all items before deleting the item type.`,
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    return;
  }

  itemTypeToDelete.value = itemType;
  showDeleteModal.value = true;
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  itemTypeToDelete.value = null;
  isDeleting.value = false;
};

const deleteItemType = async () => {
  if (!hasPermission('project_items_delete')) {
    const toast = useToast();
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to delete item types.',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  if (!itemTypeToDelete.value) return;

  // Double-check: Ensure no items are associated before deletion (check in the item type's corporation)
  const associatedItems = getItemsForItemType(itemTypeToDelete.value.uuid, itemTypeToDelete.value.corporation_uuid);
  
  if (associatedItems.length > 0) {
    const toast = useToast();
    toast.add({
      title: 'Cannot Delete Item Type',
      description: `This item type has ${associatedItems.length} item(s) associated with it. Please reassign or remove all items before deleting the item type.`,
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    });
    closeDeleteModal();
    return;
  }

  isDeleting.value = true;
  try {
    const success = await itemTypesStore.deleteItemType(itemTypeToDelete.value.uuid);

    if (success) {
      const toast = useToast();
      toast.add({
        title: 'Success',
        description: 'Item type deleted successfully',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      });
      
      closeDeleteModal();
    } else {
      throw new Error(itemTypesStore.error || 'Failed to delete item type');
    }
  } catch (error) {
    console.error('Error deleting item type:', error);
    const toast = useToast();
    toast.add({
      title: 'Error',
      description: itemTypesStore.error || 'Failed to delete item type',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
  } finally {
    isDeleting.value = false;
  }
};

// Watch for corporation changes to fetch projects (for table display)
watch(() => corpStore.selectedCorporation?.uuid, (newCorpUuid) => {
  if (newCorpUuid) {
    projectsStore.fetchProjects(newCorpUuid);
    itemTypesStore.fetchItemTypes(newCorpUuid);
    configurationsStore.fetchConfigurations(newCorpUuid);
  }
}, { immediate: true });

// Watch for corporation changes in add form to fetch projects
watch(() => itemTypeForm.value.corporation_uuid, (newCorpUuid) => {
  if (newCorpUuid && showAddModal.value) {
    projectsStore.fetchProjects(newCorpUuid);
  }
});

// Watch for corporation changes in edit form to fetch projects
watch(() => editForm.value.corporation_uuid, (newCorpUuid) => {
  if (newCorpUuid && showEditModal.value) {
    projectsStore.fetchProjects(newCorpUuid);
  }
});

// Expose method for parent component
defineExpose({
  openAddModal
});
</script>
