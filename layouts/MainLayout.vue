<template>
  <div class="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
    <!-- Loading overlay - Covers everything -->
    <div v-if="isLoading" class="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-[9999]">
      <div class="text-center">
        <!-- User Avatar -->
        <div class="mb-4 flex justify-center">
          <UAvatar
            v-if="currentUser?.imageUrl && currentUser.imageUrl.trim() !== ''"
            :src="currentUser.imageUrl"
            :alt="userDisplayName"
            size="3xl"
            class="ring-4 ring-primary-200 dark:ring-primary-800"
          />
          <UAvatar
            v-else
            :alt="userDisplayName"
            size="3xl"
            class="ring-4 ring-primary-200 dark:ring-primary-800"
          />
        </div>
        
        <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Welcome{{ userDisplayName ? `, ${userDisplayName}` : '' }}!
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-4">Loading your workspace...</p>
        
        <div class="w-64 mx-auto">
          <UProgress animation="elastic" size="lg" />
        </div>
      </div>
    </div>

    <!-- Desktop Sidebar -->
    <SideMenu />

    <!-- Main Content Area -->
    <div class="flex-grow flex flex-col min-w-0 overflow-hidden">
      <!-- Top Bar -->
      <TopBar class="w-full flex-shrink-0" />

      <!-- Nuxt Page -->
      <main class="flex-grow p-2 bg-white dark:bg-gray-900 rounded-xl lg:rounded-xl mb-16 lg:mb-2 min-w-0 overflow-x-auto">
        <div class="w-full max-w-full">
          <NuxtPage />
        </div>
      </main>
    </div>

    <!-- Mobile/Tablet Bottom Navigation -->
    <MobileBottomNav />
  </div>
</template>

<script setup>
import SideBar from "@/components/SideMenu.vue";
import TopBar from "@/components/TopBar.vue";
import MobileBottomNav from "@/components/MobileBottomNav.vue";
import { useAuthStore } from "@/stores/auth";
import { useUserProfilesStore } from "@/stores/userProfiles";

const authStore = useAuthStore();
const userProfilesStore = useUserProfilesStore();
const { isAppReady, isLoading, initializeApp } = useAppInitialization();

// Get current user from userProfiles store (same logic as TopBar)
const currentUser = computed(() => {
  if (!authStore.user?.email) return null;
  return userProfilesStore.users.find(user => user.email === authStore.user.email);
});

// Get user's display name for welcome message (same logic as TopBar)
const userDisplayName = computed(() => {
  if (!currentUser.value) return '';
  
  if (currentUser.value.firstName && currentUser.value.lastName) {
    return `${currentUser.value.firstName} ${currentUser.value.lastName}`;
  } else if (currentUser.value.firstName) {
    return currentUser.value.firstName;
  } else if (currentUser.value.email) {
    return currentUser.value.email.split('@')[0];
  }
  
  return '';
});

// Initialize app when component mounts
onMounted(async () => {
  if (process.client) {
    await initializeApp();
  }
});

// Watch for auth changes and reinitialize if needed
watch(() => authStore.isAuthenticated, async (newValue, oldValue) => {
  if (process.client && newValue !== oldValue) {
    await initializeApp();
  }
});
</script>

<style scoped>
/* Optional styling for layout */
body {
  margin: 0;
  font-family: "Arial", sans-serif;
}

main {
  overflow-y: auto;
  overflow-x: hidden;
}

/* Ensure no horizontal scroll on the entire layout */
html, body {
  overflow-x: hidden;
  max-width: 100vw;
}

/* Prevent content from causing horizontal overflow */
* {
  box-sizing: border-box;
}
</style>
