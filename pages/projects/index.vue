<template>
  <div class="space-y-6">
    <ClientOnly>
      <UTabs
        :items="tabItems"
        :model-value="activeTab"
        @update:model-value="handleTabChange"
        class="w-full"
        color="primary"
        size="sm"
        :ui="{
          leadingIcon: 'xl',
        }"
      >
        <template #content="{ item }">
          <section v-if="item.label === 'Project Details'">
            <ProjectDetails />
          </section>
          <section v-else-if="item.label === 'Items'">
            <Items />
          </section>
          <section v-else-if="item.label === 'Estimates'">
            <Estimates />
          </section>
          <section v-else-if="item.label === 'Cost Codes'">
            <CostCodes />
          </section>
          <p v-else>This is the {{ item.label }} tab.</p>
        </template>
      </UTabs>
      <template #fallback>
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p class="text-gray-600">Loading projects...</p>
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import ProjectDetails from '~/components/Projects/ProjectDetails.vue'
import Items from '~/components/Projects/Items.vue'
import Estimates from '~/components/Projects/Estimates.vue'
import CostCodes from '~/components/Corporations/CostCodes.vue'
import { useTabRouting, PROJECTS_TABS, type ProjectsTabName } from "~/composables/useTabRouting";

definePageMeta({
  layout: "main-layout",
  middleware: "auth",
});

// Use the tab routing composable
const {
  currentTab,
  navigateToTab,
  isTabActive,
  initializeUrl,
  getAvailableTabs,
  refreshTabState,
  tabs
} = useTabRouting(PROJECTS_TABS, 'project-details');

const route = useRoute();

// Convert tab config to NuxtUI TabsItem format
const tabItems: TabsItem[] = tabs.map(tab => ({
  label: tab.label,
  icon: tab.icon,
  value: tab.value
}));

// Computed property for active tab that handles URL synchronization
const activeTab = computed(() => {
  return currentTab.value;
});

// Handle tab change
const handleTabChange = (tab: string | number) => {
  // Validate tab and navigate
  const tabString = String(tab);
  const validTab = tabs.find(t => t.value === tabString);
  if (validTab) {
    navigateToTab(validTab.name);
  }
};

// Initialize URL on component mount
onMounted(() => {
  initializeUrl();
  // Refresh tab state for HMR compatibility
  refreshTabState();
});

// Watch for route changes to handle direct URL navigation
watch(() => route.query.tab, (newTab) => {
  if (newTab && typeof newTab === 'string') {
    const validTab = tabs.find(t => t.name === newTab);
    if (validTab) {
      // Tab is already set by the composable, no action needed
    } else {
      // Invalid tab, redirect to default
      navigateToTab('project-details');
    }
  }
});

// Watch for tab configuration changes (for HMR)
watch(() => tabs, () => {
  refreshTabState();
}, { deep: true });

// Expose utility functions for external use
defineExpose({
  navigateToTab: (tab: string) => {
    navigateToTab(tab);
  },
  getCurrentTab: () => {
    return currentTab.value;
  },
  isTabActive: (tab: string) => {
    return isTabActive(tab);
  }
});
</script>
