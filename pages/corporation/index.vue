<template>
  <div class="space-y-6">
    <UTabs
      :items="tabItems"
      v-model="activeTab"
      class="w-full"
      color="primary"
      size="sm"
      :ui="{
        leadingIcon: 'xl', // Change this to your desired size, e.g., text-xl, text-3xl
      }"
    >
      <template #content="{ item }">
        <section v-if="item.label === 'Manage Corporations'">
          <ManageCorporations />
        </section>
        <section v-else-if="item.label === 'Storage Locations'">
          <StorageLocations />
        </section>
        <section v-else-if="item.label === 'Chart Of Accounts'">
          <ChartOfAccounts />
        </section>
        <p v-else>This is the {{ item.label }} tab.</p>
      </template>
    </UTabs>
  </div>
</template>

<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import ManageCorporations from "~/components/Corporations/ManageCorporations.vue";
import StorageLocations from "~/components/Corporations/StorageLocations.vue";
import ChartOfAccounts from "~/components/Corporations/ChartOfAccounts.vue";
import { useTabRouting, CORPORATION_TABS, type CorporationTabName } from "~/composables/useTabRouting";

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
  tabs
} = useTabRouting(CORPORATION_TABS, 'manage-corporations');

const route = useRoute();

// Convert tab config to NuxtUI TabsItem format
const tabItems: TabsItem[] = tabs.map(tab => ({
  label: tab.label,
  icon: tab.icon,
  value: tab.value
}));

// Computed property for active tab that handles URL synchronization
const activeTab = computed({
  get() {
    return currentTab.value;
  },
  set(tab: string) {
    // Validate tab and navigate
    const validTab = tabs.find(t => t.value === tab);
    if (validTab) {
      navigateToTab(validTab.name);
    }
  }
});

// Initialize URL on component mount
onMounted(() => {
  initializeUrl();
});

// Watch for route changes to handle direct URL navigation
watch(() => route.query.tab, (newTab) => {
  if (newTab && typeof newTab === 'string') {
    const validTab = tabs.find(t => t.name === newTab);
    if (validTab) {
      // Tab is already set by the composable, no action needed
    } else {
      // Invalid tab, redirect to default
      navigateToTab('manage-corporations');
    }
  }
});

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
