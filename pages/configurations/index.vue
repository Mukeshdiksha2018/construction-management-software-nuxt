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
          <div v-if="item.value === 'project-types'">
            <ConfigurationsProjectTypes />
          </div>
          <div v-else-if="item.value === 'service-types'">
            <ConfigurationsServiceTypes />
          </div>
          <div v-else-if="item.value === 'terms-and-conditions'">
            <ConfigurationsTermsAndConditions />
          </div>
        </template>
      </UTabs>
      <template #fallback>
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p class="text-gray-600">Loading configurations...</p>
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import ConfigurationsProjectTypes from "~/components/Configurations/ProjectTypes.vue";
import ConfigurationsServiceTypes from "~/components/Configurations/ServiceTypes.vue";
import ConfigurationsTermsAndConditions from "~/components/Configurations/TermsAndConditions.vue";

definePageMeta({
  layout: "main-layout",
  middleware: "auth",
});

const route = useRoute();
const router = useRouter();

// Tab configuration
const tabItems: TabsItem[] = [
  {
    label: 'Project Types',
    icon: 'i-heroicons-chart-bar-square',
    value: 'project-types'
  },
  {
    label: 'Service Types',
    icon: 'i-heroicons-scale',
    value: 'service-types'
  },
  {
    label: 'Terms and Conditions Master',
    icon: 'i-heroicons-document-text',
    value: 'terms-and-conditions'
  }
];

// Active tab based on URL
const activeTab = computed(() => {
  const tab = route.query.tab;
  if (tab && typeof tab === 'string') {
    const validTab = tabItems.find(t => t.value === tab);
    return validTab ? validTab.value : 'project-types';
  }
  return 'project-types';
});

// Handle tab change
const handleTabChange = (tab: string | number) => {
  const tabValue = String(tab);
  const validTab = tabItems.find(t => t.value === tabValue);
  
  if (validTab) {
    router.push({ query: { tab: tabValue } });
  }
};

// Initialize URL on mount
onMounted(() => {
  if (!route.query.tab) {
    router.push({ query: { tab: 'project-types' } });
  }
});
</script>

