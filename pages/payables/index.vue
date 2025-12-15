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
          <section v-if="item.label === 'Vendor Invoices'">
            <VendorInvoicesList />
          </section>
          <section v-else-if="item.label === 'Bill Entry & Payment'">
            <PayablesBillEntry />
          </section>
          <section v-else-if="item.label === 'Print Checks'">
            <PayablesPrintChecks />
          </section>
          <p v-else>This is the {{ item.label }} tab.</p>
        </template>
      </UTabs>
      <template #fallback>
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p class="text-gray-600">Loading Payables...</p>
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import PayablesBillEntry from '~/components/Payables/BillEntry.vue'
import PayablesPrintChecks from '~/components/Payables/PrintChecks.vue'
import VendorInvoicesList from '~/components/Payables/VendorInvoicesList.vue'
import { useTabRouting, PAYABLES_TABS, type PayablesTabName } from "~/composables/useTabRouting";

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
} = useTabRouting(PAYABLES_TABS, 'vendor-invoices');

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
const handleTabChange = (tab: string) => {
  // Validate tab and navigate
  const validTab = tabs.find(t => t.value === tab);
  if (validTab) {
    navigateToTab(validTab.name);
  }
};

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
      navigateToTab('vendor-invoices');
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
