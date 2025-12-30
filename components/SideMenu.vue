<template>
  <!-- Desktop Sidebar - Hidden on mobile and tablets -->
  <div class="hidden lg:flex h-screen bg-gradient-to-br from-purple-300/40 via-purple-200/30 to-indigo-300/40">
    <!-- Sidebar -->
    <aside
      class="text-indigo-900 dark:text-indigo-100 flex flex-col transition-all duration-300 border-r border-indigo-200 dark:border-indigo-800"
      :class="isExpanded ? 'w-56' : 'w-16'"
      aria-label="Sidebar"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <div class="p-4 text-lg font-bold border-b border-indigo-200 dark:border-indigo-800 truncate text-indigo-900 dark:text-indigo-100">
        <span v-if="isExpanded">Nimble Property Management</span>
        <span v-else>NPM</span>
      </div>

      <nav class="flex-1 px-2 py-4">
        <div class="space-y-1">
          <!-- Show loading skeleton while permissions are being loaded -->
          <div v-if="!isReady" class="space-y-1">
            <div v-for="i in 8" :key="i" class="flex items-center px-3 py-3">
              <div class="w-5 h-5 bg-indigo-300 dark:bg-indigo-600 rounded animate-pulse"></div>
              <div v-if="isExpanded" class="ml-3 h-4 bg-indigo-300 dark:bg-indigo-600 rounded animate-pulse flex-1"></div>
            </div>
          </div>
          
          <!-- Show actual menu items when ready -->
          <template v-else>
            <NuxtLink
              v-for="item in menuItems"
              :key="item.label"
              :to="item.to"
              class="group flex items-center px-3 py-2 rounded-lg transition-all duration-200"
              :class="[
                item.class,
                isActiveRoute(item.to)
                  ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100 font-semibold shadow-sm'
                  : 'text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:text-indigo-900 dark:hover:text-indigo-100'
              ]"
            >
              <UIcon 
                :name="item.icon" 
                class="w-5 h-5 flex-shrink-0 transition-colors duration-200"
                :class="isActiveRoute(item.to)
                  ? 'text-indigo-900 dark:text-indigo-100'
                  : 'text-indigo-700 dark:text-indigo-300 group-hover:text-indigo-900 dark:group-hover:text-indigo-100'"
              />
              <span v-if="isExpanded" class="ml-3 truncate text-md">{{ item.label }}</span>
            </NuxtLink>
          </template>
        </div>
      </nav>
    </aside>
  </div>
</template>

<script setup>
import { usePermissions } from "~/composables/usePermissions";
import { useDarkMode } from "~/composables/useDarkMode";

const route = useRoute();
const isExpanded = ref(false);

// Use permissions composable
const { canAccessUserSetup, isReady } = usePermissions();

// Use dark mode composable
const { isDark } = useDarkMode();

const handleMouseEnter = () => {
  isExpanded.value = true;
};

const handleMouseLeave = () => {
  isExpanded.value = false;
};

// Create a computed property that returns a function for checking active routes
const isActiveRoute = computed(() => {
  return (path) => {
    if (path === '/Dashboard' && route.path === '/') {
      return true; // Dashboard is active on root path
    }
    return route.path === path || route.path.startsWith(path + '/');
  };
});

// Base menu items that are always visible (solid icons)
const baseMenuItems = [
  {
    label: "Dashboard",
    to: "/Dashboard",
    icon: "i-heroicons-chart-bar-solid",
    class: "",
  },
  {
    label: "Corporation",
    to: "/corporation",
    icon: "i-heroicons-building-office-2-solid",
    class: "",
  },
  {
    label: "Projects",
    to: "/projects",
    icon: "i-heroicons-folder-solid",
    class: "",
  },
  {
    label: "Vendors",
    to: "/vendors",
    icon: "i-heroicons-user-group-solid",
    class: "",
  },
  {
    label: "Customers",
    to: "/customers",
    icon: "i-heroicons-user-circle-solid",
    class: "",
  },
  {
    label: "Purchase Orders",
    to: "/purchase-orders",
    icon: "i-heroicons-shopping-cart-solid",
    class: "",
  },
  {
    label: "Payables",
    to: "/payables",
    icon: "i-heroicons-credit-card-solid",
    class: "",
  },
  {
    label: "Masters",
    to: "/masters",
    icon: "i-heroicons-circle-stack-solid",
    class: "",
  },
  {
    label: "Configurations",
    to: "/configurations",
    icon: "i-heroicons-cog-6-tooth-solid",
    class: "",
  },
  {
    label: "Reports",
    to: "/reports",
    icon: "i-heroicons-document-text-solid",
    class: "",
  },
];

// Computed menu items that conditionally include User Setup
const menuItems = computed(() => {
  const items = [...baseMenuItems];
  
  // Insert User Setup after Dashboard (at index 1) if user has permission
  if (isReady.value && canAccessUserSetup.value) {
    items.splice(1, 0, {
      label: "User Setup",
      to: "/Users",
      icon: "i-heroicons-users-solid",
      class: "",
    });
  }
  
  return items;
});
</script>

<style>
/* Sidebar styles are now handled by Tailwind classes */
</style>
