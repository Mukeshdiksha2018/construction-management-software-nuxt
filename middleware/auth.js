import { useAuthStore } from "@/stores/auth";
import { useCorporationStore } from "@/stores/corporations";
import { useSupabaseClient } from "@/utils/supabaseClient";

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Only run on client side
  if (process.server) {
    return;
  }

  // IMPORTANT: Check for invitation tokens FIRST, before any other logic
  // This ensures users clicking invitation links get to the signup page
  if (typeof window !== "undefined" && to.path !== "/auth/signup") {
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const hashAccessToken = urlParams.get("access_token");
    const hashRefreshToken = urlParams.get("refresh_token");
    const queryAccessToken = to.query.access_token;
    const queryRefreshToken = to.query.refresh_token;

    // If we detect invitation tokens anywhere other than signup page, redirect there
    if (
      (hashAccessToken && hashRefreshToken) ||
      (queryAccessToken && queryRefreshToken)
    ) {
      console.log(
        "Invitation tokens detected, redirecting to signup page from:",
        to.path
      );
      // Preserve the hash fragment when redirecting
      if (window.location.hash) {
        return navigateTo({
          path: "/auth/signup",
          hash: window.location.hash,
        });
      } else if (queryAccessToken && queryRefreshToken) {
        return navigateTo({
          path: "/auth/signup",
          query: {
            access_token: queryAccessToken,
            refresh_token: queryRefreshToken,
          },
        });
      }
    }
  }

  const auth = useAuthStore();
  const corporationStore = useCorporationStore();

  // Special handling for signup page - let it handle its own auth flow
  if (to.path === "/auth/signup") {
    // Check if this is an invitation with tokens in URL
    const hasInviteTokens = to.query.access_token && to.query.refresh_token;
    const hasHashTokens =
      typeof window !== "undefined" &&
      (window.location.hash.includes("access_token") &&
        window.location.hash.includes("refresh_token"));

    if (hasInviteTokens || hasHashTokens) {
      // Let the signup page handle the invitation flow
      return;
    }

    // If no tokens, check if user is already authenticated
    if (!auth.isInitialized) {
      await auth.fetchUser();
    }

    // If user is authenticated, check if their profile is complete
    if (auth.isAuthenticated) {
      const supabase = useSupabaseClient();
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("status, first_name, last_name")
        .eq("user_id", auth.user.id)
        .single();

      // If profile is complete, redirect to dashboard
      if (
        profile &&
        profile.first_name &&
        profile.last_name &&
        profile.status === "active"
      ) {
        return navigateTo("/Dashboard");
      }

      // Otherwise, let them complete their profile
      return;
    }

    // If no tokens and not authenticated, show error (handled by signup page)
    return;
  }

  // Wait for auth to be initialized for other pages
  if (!auth.isInitialized) {
    await auth.fetchUser();
  }

  // If user is not authenticated and trying to access protected routes
  if (
    !auth.isAuthenticated &&
    to.path !== "/" &&
    to.path !== "/forgot-password" &&
    to.path !== "/reset-password" &&
    to.path !== "/welcome"
  ) {
    console.log("User not authenticated, redirecting to login");
    return navigateTo("/");
  }

  // If user is authenticated and on login page, check if profile is complete
  if (auth.isAuthenticated && to.path === "/") {
    // Check if this is a new user who needs to complete profile setup
    const supabase = useSupabaseClient();
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("status, first_name, last_name")
      .eq("user_id", auth.user.id)
      .single();

    // If profile doesn't exist or is incomplete (no name), send to signup
    if (
      !profile ||
      !profile.first_name ||
      !profile.last_name ||
      profile.status === "pending"
    ) {
      console.log("User profile incomplete, redirecting to signup");
      return navigateTo("/auth/signup");
    }

    console.log(
      "User already authenticated with complete profile, redirecting to dashboard"
    );
    return navigateTo("/Dashboard");
  }

  // If user is authenticated, ensure corporations are loaded
  if (auth.isAuthenticated && corporationStore.corporations.length === 0) {
    await corporationStore.fetchCorporations();
  }

  // Check corporation access for authenticated users (except for specific pages)
  if (
    auth.isAuthenticated &&
    to.path !== "/no-corporation-access" &&
    to.path !== "/auth/signup" &&
    to.path !== "/forgot-password" &&
    to.path !== "/reset-password" &&
    to.path !== "/welcome"
  ) {
    // Import the corporation access composable
    const { useCorporationAccess } = await import(
      "@/composables/useCorporationAccess"
    );
    const { hasCorporationAccess, ensureDataLoaded } = useCorporationAccess();

    // Ensure all required data is loaded
    await ensureDataLoaded();

    // If user has no corporation access, redirect to no-access page
    if (!hasCorporationAccess.value) {
      return navigateTo("/no-corporation-access");
    }
  }
});
