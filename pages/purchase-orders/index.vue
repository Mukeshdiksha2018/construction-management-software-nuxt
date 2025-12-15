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
          <section v-if="item.value === 'purchase-orders'">
            <PurchaseOrdersList />
          </section>
          <section v-else-if="item.value === 'change-orders'">
            <ChangeOrdersList />
          </section>
          <section v-else-if="item.value === 'stock-receipt-note'">
            <ReceiptNoteList />
          </section>
          <section v-else-if="item.value === 'stock-returns'">
            <StockReturnsList />
          </section>
          <p v-else>This is the {{ item.label }} tab.</p>
        </template>
      </UTabs>
      <template #fallback>
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p class="text-gray-600">Loading purchase orders...</p>
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import PurchaseOrdersList from '@/components/PurchaseOrders/PurchaseOrdersList.vue'
import ReceiptNoteList from '@/components/PurchaseOrders/ReceiptNoteList.vue'
import ChangeOrdersList from '@/components/ChangeOrders/ChangeOrdersList.vue'
import StockReturnsList from '@/components/PurchaseOrders/StockReturnsList.vue'
import { useTabRouting, PURCHASE_ORDERS_TABS, type PurchaseOrdersTabName } from "~/composables/useTabRouting";

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
} = useTabRouting(PURCHASE_ORDERS_TABS, 'purchase-orders');

const route = useRoute();

// Local extension to include Change Orders and Stock Returns
const extendedTabs = computed(() => {
  const base = [...tabs]
  const changeTab = { name: 'change-orders', label: 'Change Orders', icon: 'i-heroicons-arrow-path-rounded-square', value: 'change-orders' }
  const stockReturnsTab = { name: 'stock-returns', label: 'Stock Returns', icon: 'i-heroicons-arrow-uturn-left', value: 'stock-returns' }
  
  // Prevent duplication if ever added globally later
  let result = [...base]
  
  // Add Change Orders tab (before Stock Receipt Note)
  if (!result.some(t => t.value === 'change-orders')) {
    const stockIdx = result.findIndex(t => t.value === 'stock-receipt-note')
    if (stockIdx !== -1) {
      const before = result.slice(0, stockIdx)
      const after = result.slice(stockIdx)
      result = [...before, changeTab, ...after]
    } else {
      // Fallback: insert after purchase-orders if found, else append
      const poIdx = result.findIndex(t => t.value === 'purchase-orders')
      if (poIdx !== -1) {
        const before = result.slice(0, poIdx + 1)
        const after = result.slice(poIdx + 1)
        result = [...before, changeTab, ...after]
      } else {
        result = [...result, changeTab]
      }
    }
  }
  
  // Add Stock Returns tab (after Stock Receipt Note)
  if (!result.some(t => t.value === 'stock-returns')) {
    const stockReceiptIdx = result.findIndex(t => t.value === 'stock-receipt-note')
    if (stockReceiptIdx !== -1) {
      const before = result.slice(0, stockReceiptIdx + 1)
      const after = result.slice(stockReceiptIdx + 1)
      result = [...before, stockReturnsTab, ...after]
    } else {
      // Fallback: append if stock-receipt-note not found
      result = [...result, stockReturnsTab]
    }
  }
  
  return result
})

// Convert tab config to NuxtUI TabsItem format
const tabItems: TabsItem[] = extendedTabs.value.map(tab => ({
  label: tab.label,
  icon: tab.icon,
  value: tab.value
}));

// Local active tab that mirrors routing tabs and supports the extra local tab
const activeTab = ref<string>(currentTab.value);

// Handle tab change
const handleTabChange = (tab: string | number) => {
  // Validate tab and navigate
  const tabString = String(tab);
  const validTab = tabs.find(t => t.value === tabString);
  if (validTab) {
    activeTab.value = validTab.value
    navigateToTab(validTab.name);
  } else if (tabString === 'change-orders') {
    // Navigate to change-orders tab and update URL
    activeTab.value = 'change-orders'
    const router = useRouter();
    router.push({
      query: { ...route.query, tab: 'change-orders' }
    });
  } else if (tabString === 'stock-returns') {
    // Navigate to stock-returns tab and update URL
    activeTab.value = 'stock-returns'
    const router = useRouter();
    router.push({
      query: { ...route.query, tab: 'stock-returns' }
    });
  }
};

// Initialize URL on component mount
onMounted(() => {
  // Check if change-orders or stock-returns is in URL
  if (route.query.tab === 'change-orders') {
    activeTab.value = 'change-orders'
  } else if (route.query.tab === 'stock-returns') {
    activeTab.value = 'stock-returns'
  } else {
    initializeUrl();
    // Refresh tab state for HMR compatibility
    refreshTabState();
    activeTab.value = currentTab.value
  }
});

// Watch for route changes to handle direct URL navigation
watch(() => route.query.tab, (newTab) => {
  if (newTab && typeof newTab === 'string') {
    if (newTab === 'change-orders') {
      // Handle change-orders tab from URL
      activeTab.value = 'change-orders'
    } else if (newTab === 'stock-returns') {
      // Handle stock-returns tab from URL
      activeTab.value = 'stock-returns'
    } else {
      const validTab = tabs.find(t => t.name === newTab);
      if (validTab) {
        // Tab is already set by the composable, no action needed
        activeTab.value = validTab.value
      } else {
        // Invalid tab, redirect to default
        navigateToTab('purchase-orders');
        activeTab.value = 'purchase-orders'
      }
    }
  } else if (!newTab) {
    // No tab in URL, set to default
    activeTab.value = currentTab.value || 'purchase-orders'
  }
});

// Watch for tab configuration changes (for HMR)
watch(() => tabs, () => {
  refreshTabState();
  activeTab.value = currentTab.value
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

// Set page title
useHead({
  title: 'Purchase Orders - Nimble Property Management'
})
</script>
