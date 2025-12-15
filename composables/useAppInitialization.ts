export const useAppInitialization = () => {
  // Only run on client side
  if (process.server) {
    return {
      isAppReady: ref(false),
      isLoading: ref(false),
      initializeApp: async () => {},
      resetApp: () => {}
    };
  }

  const auth = useAuthStore();
  const corporationStore = useCorporationStore();
  const userProfilesStore = useUserProfilesStore();
  const roleStore = useRoleStore();

  const isAppReady = ref(false);
  const isLoading = ref(false);

  const initializeApp = async () => {
    if (isLoading.value) return;

    isLoading.value = true;

    try {
      // Initialize auth state
      if (!auth.isInitialized) {
        await auth.fetchUser();
      }

      // If user is authenticated, load necessary data
      if (auth.isAuthenticated) {
        // Load user profiles FIRST - this is critical for corporation access filtering
        // Force refresh on login to ensure fresh data (bypasses localStorage cache)
        try {
          await userProfilesStore.fetchUsers(true);
        } catch (error) {
          // Error loading users
        }

        // Load corporations if not already loaded
        if (corporationStore.corporations.length === 0) {
          await corporationStore.fetchCorporations();
        }

        // Load roles data for permissions - always fetch fresh (no caching)
        try {
          await roleStore.fetchRoles();
        } catch (error) {
          // Error loading roles
        }

        // Sync ONLY the recently selected corporation data to IndexedDB
        // This optimizes login performance by avoiding mass syncing of all accessible corporations
        try {
          // Get the current user's recently selected corporation
          const currentUser = userProfilesStore.users.find(
            (user) => user.email === auth.user?.email
          );

          // Only sync if the user has a recent property (selected corporation)
          if (currentUser?.recentProperty) {
            const { useDateRangeStore } = await import("@/stores/dateRange");
            const { syncCorporationData } = useIndexedDB();
            const dateRangeStore = useDateRangeStore();
            const dateParams = dateRangeStore.dateRangeParams;

            // Sync data ONLY for the recently selected corporation
            await syncCorporationData(
              currentUser.recentProperty,
              dateParams,
              false // Don't force sync, let it use cache if available
            );
          }
        } catch (error) {
          // Don't fail app initialization if IndexedDB sync fails
        }
      }

      isAppReady.value = true;
    } catch (error) {
      // App initialization error
    } finally {
      isLoading.value = false;
    }
  };

  const resetApp = () => {
    isAppReady.value = false;
    isLoading.value = false;
  };

  return {
    isAppReady: readonly(isAppReady),
    isLoading: readonly(isLoading),
    initializeApp,
    resetApp
  };
};
