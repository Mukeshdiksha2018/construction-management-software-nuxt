<template>
  <!-- Mobile/Tablet Bottom Navigation -->
  <div class="lg:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-brand-50 via-brand-50 to-brand-50 dark:from-gray-900 dark:via-brand-950 dark:to-gray-900 border-t border-brand-200 dark:border-brand-800 z-50 backdrop-blur-lg">
    <div class="px-2 py-1">
      <!-- Show loading skeleton while permissions are being loaded -->
      <div v-if="!isReady" class="flex space-x-2 overflow-x-auto">
        <div v-for="i in 6" :key="i" class="flex-shrink-0">
          <div class="w-16 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
        </div>
      </div>
      
      <!-- Show actual navigation items when ready -->
      <div v-else class="flex space-x-2 overflow-x-auto scrollbar-hide">
        <NuxtLink
          v-for="item in menuItems"
          :key="item.label"
          :to="item.to"
          class="flex-shrink-0 flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-[60px]"
          :class="[
            isActiveRoute(item.to) 
              ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg ring-2 ring-brand-300 dark:ring-brand-700' 
              : 'text-gray-600 dark:text-gray-400 hover:bg-brand-100 dark:hover:bg-brand-900/50 hover:text-brand-600 dark:hover:text-brand-400'
          ]"
        >
          <UIcon :name="item.icon" class="w-5 h-5 mb-1" />
          <span class="text-xs font-medium text-center leading-tight">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePermissions } from "~/composables/usePermissions";

const route = useRoute();

// Use permissions composable
const { canAccessUserSetup, isReady } = usePermissions();

const isActiveRoute = (path) => {
  if (path === '/Dashboard' && route.path === '/') {
    return true; // Dashboard is active on root path
  }
  return route.path === path || route.path.startsWith(path + '/');
};

// Base menu items that are always visible
const baseMenuItems = [
  {
    label: "Admin",
    to: "/admin-dashboard",
    icon: "i-lucide-layout-dashboard",
  },
  {
    label: "Dashboard",
    to: "/Dashboard",
    icon: "i-material-symbols-dashboard-rounded",
  },
  {
    label: "Corporation",
    to: "/corporation",
    icon: "i-lucide-building-2",
  },
  {
    label: "Projects",
    to: "/projects",
    icon: "i-heroicons-clipboard-document-list",
  },
  {
    label: "Payables",
    to: "/payables",
    icon: "i-mingcute-card-pay-fill",
  },
  {
    label: "Receivables",
    to: "/receivables",
    icon: "i-game-icons-receive-money",
  },
  {
    label: "Payroll",
    to: "/payroll",
    icon: "i-mingcute-bill-fill",
  },
  {
    label: "Budgeting",
    to: "/budgeting",
    icon: "i-bi-file-bar-graph-fill",
  },
  {
    label: "Reports",
    to: "/reports",
    icon: "i-heroicons-chart-bar",
  },
  {
    label: "Settings",
    to: "/settings",
    icon: "i-material-symbols-settings-rounded",
  },
];

// Computed menu items that conditionally include User Setup
const menuItems = computed(() => {
  const items = [...baseMenuItems];
  
  // Insert User Setup after Dashboard (now at index 2) if user has permission
  if (isReady.value && canAccessUserSetup.value) {
    items.splice(2, 0, {
      label: "Users",
      to: "/users",
      icon: "i-tabler-user-filled",
    });
  }
  
  return items;
});
</script>

<style scoped>
/* Hide scrollbar for webkit browsers */
.scrollbar-hide {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;  /* Chrome, Safari and Opera */
}
</style>
