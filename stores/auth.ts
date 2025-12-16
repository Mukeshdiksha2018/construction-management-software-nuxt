import { useSupabaseClient } from "@/utils/supabaseClient";
import { dbHelpers } from "@/utils/indexedDb";
import { useUserProfilesStore } from "@/stores/userProfiles";

export const useAuthStore = defineStore(
  "auth",
  () => {
    const user = ref<any>(null);
    const isLoading = ref(false);
    const isInitialized = ref(false);

    async function fetchUser() {
      if (isLoading.value) return;

      isLoading.value = true;
      try {
        // First try to get session from Supabase directly
        const supabase = useSupabaseClient();
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          // Don't clear user on error, just continue to fallback
        } else if (session?.user) {
          user.value = session.user;
          isInitialized.value = true;
          isLoading.value = false;
          return;
        }

        // Fallback to API if no session found
        const { apiFetch } = useApiClient();
        const response = await apiFetch("/api/auth");
        if (response && "user" in response && response.user) {
          user.value = response.user;
          isInitialized.value = true;
        } else if (!user.value) {
          // Only clear user if we had no session AND no API response AND no existing user
          user.value = null;
          isInitialized.value = true;
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        // Don't clear existing user on error
        if (!user.value) {
          user.value = null;
        }
      } finally {
        isLoading.value = false;
        isInitialized.value = true;
      }
    }

    async function logout() {
      try {
        // Use Supabase client directly for logout
        const supabase = useSupabaseClient();
        const { error } = await supabase.auth.signOut();

        // Clear user data
        user.value = null;
        isInitialized.value = false;

        // Clear userProfiles store (clears localStorage cache)
        try {
          const userProfilesStore = useUserProfilesStore();
          userProfilesStore.clearStore();
        } catch (storeError) {
          // Error clearing userProfiles store
        }

        // Clear IndexedDB data
        try {
          await dbHelpers.clearAllData();
        } catch (dbError) {
          // Error clearing IndexedDB
        }

        // Navigate to home page
        navigateTo("/");
      } catch (error) {
        // Still clear user and navigate even if logout fails
        user.value = null;
        isInitialized.value = false;

        // Try to clear userProfiles store even if logout fails
        try {
          const userProfilesStore = useUserProfilesStore();
          userProfilesStore.clearStore();
        } catch (storeError) {
          // Error clearing userProfiles store
        }

        // Try to clear IndexedDB even if logout fails
        try {
          await dbHelpers.clearAllData();
        } catch (dbError) {
          // Error clearing IndexedDB
        }

        navigateTo("/");
      }
    }

    // Method to sync auth state from another tab
    function syncAuthState(newUser: any) {
      user.value = newUser;
      isInitialized.value = true;
    }

    const isAuthenticated = computed(() => !!user.value);
    const userEmail = computed(() => user.value?.email || "");

    return {
      user,
      isLoading,
      isInitialized,
      fetchUser,
      logout,
      syncAuthState,
      isAuthenticated,
      userEmail,
    };
  },
  {
    persist: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      paths: ["user", "isInitialized"],
    },
  }
);
