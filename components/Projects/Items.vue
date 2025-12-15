<template>
  <div>
    <!-- Tabs and Add Button Row -->
    <div class="flex items-center justify-between mb-4">
      <!-- Tabs on the left -->
      <UTabs 
        :items="tabs" 
        :model-value="activeTab"
        @update:model-value="handleTabChange"
        size="sm" 
        color="neutral" 
        :content="false" 
      />

      <!-- Search and Add New Button on the right -->
      <div class="flex items-center gap-3">
        <!-- Project Filter Popover -->
        <UPopover>
          <UButton
            icon="i-heroicons-funnel"
            size="sm"
            color="neutral"
            variant="solid"
            :label="selectedProjectFilter ? getProjectDisplayName(selectedProjectFilter) : 'Filter by Project'"
          />
          
          <template #content>
            <div class="p-4 w-80">
              <div class="mb-3">
                <h3 class="text-sm font-medium text-default mb-2">Filter by Project</h3>
                <ProjectSelect
                  :model-value="selectedProjectFilter"
                  placeholder="Select project to filter"
                  size="sm"
                  :corporation-uuid="corpStore.selectedCorporation?.uuid"
                  @change="handleProjectFilterChange"
                />
              </div>
              <div class="flex justify-end gap-2">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  @click="clearProjectFilter"
                >
                  Clear Filter
                </UButton>
              </div>
            </div>
          </template>
        </UPopover>
        
        <!-- Search Input -->
        <div class="w-64">
          <UInput
            v-model="globalFilter"
            placeholder="Search..."
            icon="i-heroicons-magnifying-glass"
            variant="subtle"
            size="xs"
            class="w-full"
          />
        </div>
        
        <!-- Add New Button -->
        <UButton
          v-if="hasPermission('project_items_create')"
          icon="i-heroicons-plus"
          size="sm"
          color="primary"
          @click="handleAddNew"
        >
          {{ activeTab === 'item-types' ? 'Add New Item Type' : 'Add Item' }}
        </UButton>
      </div>
    </div>

    <!-- Tab Content (Full Width) -->
    <div class="w-full">
      <ItemTypes 
        v-if="activeTab === 'item-types'" 
        ref="itemTypesTabRef"
        :global-filter="globalFilter"
        :project-filter="selectedProjectFilter"
      />
      <ItemsList 
        v-if="activeTab === 'items'" 
        ref="itemsTabRef"
        :global-filter="globalFilter"
        :project-filter="selectedProjectFilter"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ItemTypes from './ItemTypes.vue';
import ItemsList from './ItemsList.vue';
import ProjectSelect from '@/components/Shared/ProjectSelect.vue';
import { useCorporationStore } from '@/stores/corporations';
import { useProjectsStore } from '@/stores/projects';
import { usePermissions } from '@/composables/usePermissions';

const route = useRoute();
const router = useRouter();

// Stores
const corpStore = useCorporationStore();
const projectsStore = useProjectsStore();

// Use permissions composable
const { hasPermission } = usePermissions();

// Global filter for search
const globalFilter = ref('');

// Project filter
const selectedProjectFilter = ref<string | undefined>(undefined);

// Refs to child components
const itemTypesTabRef = ref(null);
const itemsTabRef = ref(null);

// Tab configuration
const tabs = [
  {
    key: 'item-types',
    label: 'Item Types',
    icon: 'i-heroicons-tag',
    value: 'item-types',
    slot: 'item-types'
  },
  {
    key: 'items',
    label: 'Items',
    icon: 'i-heroicons-cube',
    value: 'items',
    slot: 'items'
  }
];

// Active tab based on URL
const activeTab = computed(() => {
  const subTab = route.query.subTab;
  if (subTab && typeof subTab === 'string') {
    const validTab = tabs.find(t => t.value === subTab);
    return validTab ? subTab : 'item-types';
  }
  return 'item-types';
});

// Handle tab change
const handleTabChange = (tab: string | number) => {
  const tabValue = String(tab);
  const validTab = tabs.find(t => t.value === tabValue);
  
  if (validTab) {
    // Update URL with subTab parameter while preserving the main tab
    const currentQuery = { ...route.query };
    currentQuery.subTab = tabValue;
    router.push({ query: currentQuery });
  }
};

// Handle Add New button click - opens modal in the active tab
const handleAddNew = () => {
  if (!hasPermission('project_items_create')) {
    const toast = useToast();
    toast.add({
      title: 'Access Denied',
      description: 'You do not have permission to create items.',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    });
    return;
  }

  if (activeTab.value === 'item-types' && itemTypesTabRef.value) {
    // Call the openAddModal method from ItemTypes
    (itemTypesTabRef.value as any).openAddModal();
  } else if (activeTab.value === 'items' && itemsTabRef.value) {
    // Call the openAddModal method from ItemsList
    (itemsTabRef.value as any).openAddModal();
  }
};

// Handle project filter change
const handleProjectFilterChange = (project: any) => {
  let projectUuid = null;
  if (typeof project === 'string') {
    projectUuid = project;
  } else if (project?.value) {
    projectUuid = project.value;
  }
  
  selectedProjectFilter.value = projectUuid || undefined;
};

// Clear project filter
const clearProjectFilter = () => {
  selectedProjectFilter.value = undefined;
};

// Get project display name for the filter button
const getProjectDisplayName = (projectUuid: string) => {
  const project = projectsStore.projects.find((p: any) => p.uuid === projectUuid);
  return project ? `${project.project_name} (${project.project_id})` : 'Unknown Project';
};

// Initialize URL on mount
onMounted(() => {
  if (!route.query.subTab) {
    const currentQuery = { ...route.query };
    currentQuery.subTab = 'item-types';
    router.push({ query: currentQuery });
  }
  
  // Fetch projects if corporation is selected
  if (corpStore.selectedCorporation?.uuid) {
    projectsStore.fetchProjects(corpStore.selectedCorporation.uuid);
  }
});

// Watch for corporation changes to fetch projects
watch(
  () => corpStore.selectedCorporation?.uuid,
  (uuid) => {
    if (uuid) {
      projectsStore.fetchProjects(uuid);
    }
  },
  { immediate: true }
);
</script>
