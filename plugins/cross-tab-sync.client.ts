import { useAuthStore } from "@/stores/auth";
import { useCorporationStore } from "@/stores/corporations";

export default defineNuxtPlugin(() => {
  // Only run on client side
  if (process.server) {
    return;
  }

  const authStore = useAuthStore();
  const corporationStore = useCorporationStore();

  // Listen for storage events (cross-tab communication)
  const handleStorageChange = (event: StorageEvent) => {
    // Only process events from other tabs
    if (event.storageArea !== localStorage) return;

    try {
      if (event.key === "auth" && event.newValue) {
        const newAuthData = JSON.parse(event.newValue);
        if (newAuthData.user !== authStore.user?.id) {
          authStore.syncAuthState(newAuthData.user);

          if (!newAuthData.user) {
            corporationStore.corporations = [];
            corporationStore.selectedCorporationId = null;
          }
        }
      }
    } catch (error) {
      console.error("❌ Error processing storage event:", error);
    }
  };

  // Add event listener for storage changes
  window.addEventListener('storage', handleStorageChange);

  // Also listen for focus events to sync when tab becomes active
  const handleFocus = async () => {
    // Only re-fetch if user was authenticated to avoid clearing session on focus
    if (authStore.isInitialized && authStore.isAuthenticated) {
      try {
        await authStore.fetchUser();
      } catch (error) {
        console.error("Error syncing auth on focus:", error);
        // Don't clear session on error
      }
    }
  };

  window.addEventListener('focus', handleFocus);

  // Cleanup on unmount
  const cleanup = () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('focus', handleFocus);
  };

  // Register cleanup
  if (process.client) {
    window.addEventListener("beforeunload", cleanup);
  }
});
