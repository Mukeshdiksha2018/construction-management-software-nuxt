<template>
  <div class="space-y-6">
    <UTabs
      :items="tabItems"
      v-model="activeTab"
      class="w-full"
      color="primary"
      size="sm"
    >
      <template #content="{ item }">
        <section v-if="item.label === 'Role Management'">
          <RoleManagement />
        </section>
        <section v-else-if="item.label === 'User Management'">
          <UserManagement />
        </section>
      </template>
    </UTabs>
  </div>
</template>

<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import UserManagement from "~/components/Users/UserManagement.vue";
import RoleManagement from "~/components/Users/RoleManagement.vue";
import { useTabRouting, USERS_TABS, type UsersTabName } from "~/composables/useTabRouting";

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
} = useTabRouting(USERS_TABS, 'role-management');

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
      navigateToTab('role-management');
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
