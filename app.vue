<template>
  <UApp class="bg-gray-50 dark:bg-gray-900 min-h-screen">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup>
// Initialize app using the app initialization composable
const { initializeApp, isAppReady, isLoading } = useAppInitialization();

onMounted(async () => {
  // Only run on client side
  if (process.client) {
    // Initialize the app with all required data
    await initializeApp();
    
    // Make stores globally accessible for debugging (development only)
    if (process.dev) {
      window.__stores = {
        auth: useAuthStore(),
        corporations: useCorporationStore(),
        vendors: useVendorStore(),
        chartOfAccounts: useChartOfAccountsStore(),
        userProfiles: useUserProfilesStore(),
        roles: useRoleStore(),
      };
    }
  }
});
</script>
