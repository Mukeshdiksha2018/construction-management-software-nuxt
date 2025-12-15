import { useSupabaseClient } from "@/utils/supabaseClient";
import { useAuthStore } from "@/stores/auth";
import { useCorporationStore } from "@/stores/corporations";

export default defineNuxtPlugin(async () => {
  // Only run on client side
  if (process.server) {
    return;
  }

  const auth = useAuthStore();
  const corporationStore = useCorporationStore();

  // Initialize auth state only if not already initialized
  if (!auth.isInitialized) {
    await auth.fetchUser();
  }

  // Set up auth state change listener
  const supabase = useSupabaseClient();
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("Auth state changed:", event, session?.user?.email);

    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      auth.user = session?.user || null;
      auth.isInitialized = true;
      // Fetch corporations when user is authenticated
      if (session?.user && corporationStore.corporations.length === 0) {
        await corporationStore.fetchCorporations();
      }
    } else if (event === "SIGNED_OUT") {
      auth.user = null;
      auth.isInitialized = false;
      // Clear corporation data on logout
      corporationStore.corporations = [];
      corporationStore.selectedCorporationId = null;
    }
  });

  // If user is authenticated and we have no corporations, fetch them
  if (auth.isAuthenticated && corporationStore.corporations.length === 0) {
    await corporationStore.fetchCorporations();
  }
});
