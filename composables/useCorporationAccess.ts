import { useAuthStore } from "@/stores/auth";
import { useUserProfilesStore } from "@/stores/userProfiles";
import { useCorporationStore } from "@/stores/corporations";
import { useRoleStore } from "@/stores/roles";

export const useCorporationAccess = () => {
  const authStore = useAuthStore();
  const userProfilesStore = useUserProfilesStore();
  const corporationStore = useCorporationStore();
  const roleStore = useRoleStore();

  // Get current user from userProfiles store
  const currentUser = computed(() => {
    if (!authStore.user?.email) return null;
    return userProfilesStore.users.find(
      (user) => user.email === authStore.user.email
    );
  });

  // Check if current user is a Super Admin
  const isSuperAdmin = computed(() => {
    if (!currentUser.value?.roleId) return false;
    const role = roleStore.roles.find((r) => r.id === currentUser.value.roleId);
    return role?.role_name === "Super Admin";
  });

  // Check if user has access to any corporation
  const hasCorporationAccess = computed(() => {
    // If no current user, return false
    if (!currentUser.value) {
      return false;
    }

    // Super Admins have access to all corporations
    if (isSuperAdmin.value) {
      return corporationStore.corporations.length > 0;
    }

    // If user has no specific corporation access defined, return false
    if (
      !currentUser.value.corporationAccess ||
      currentUser.value.corporationAccess.length === 0
    ) {
      return false;
    }

    // Check if any of the user's accessible corporations exist in the corporations list
    return corporationStore.corporations.some((corp) =>
      currentUser.value.corporationAccess.includes(corp.uuid)
    );
  });

  // Get accessible corporations for the current user
  const accessibleCorporations = computed(() => {
    // If no current user, return empty array
    if (!currentUser.value) {
      return [];
    }

    // Super Admins have access to all corporations
    if (isSuperAdmin.value) {
      return corporationStore.corporations;
    }

    // If user has no specific corporation access defined, return empty array
    if (
      !currentUser.value.corporationAccess ||
      currentUser.value.corporationAccess.length === 0
    ) {
      return [];
    }

    // Filter corporations to only show those the user has access to
    return corporationStore.corporations.filter((corp) =>
      currentUser.value.corporationAccess.includes(corp.uuid)
    );
  });

  // Check if user should be redirected to no-access page
  const shouldRedirectToNoAccess = computed(() => {
    return authStore.isAuthenticated && !hasCorporationAccess.value;
  });

  // Ensure all required data is loaded before checking access
  const ensureDataLoaded = async () => {
    // Ensure user profiles are loaded
    if (userProfilesStore.users.length === 0 && authStore.isAuthenticated) {
      await userProfilesStore.fetchUsers();
    }

    // Ensure roles are loaded
    if (roleStore.roles.length === 0 && authStore.isAuthenticated) {
      await roleStore.fetchRoles();
    }

    // Ensure corporations are loaded
    if (
      corporationStore.corporations.length === 0 &&
      authStore.isAuthenticated
    ) {
      await corporationStore.fetchCorporations();
    }
  };

  return {
    currentUser: readonly(currentUser),
    isSuperAdmin: readonly(isSuperAdmin),
    hasCorporationAccess: readonly(hasCorporationAccess),
    accessibleCorporations: readonly(accessibleCorporations),
    shouldRedirectToNoAccess: readonly(shouldRedirectToNoAccess),
    ensureDataLoaded,
  };
};
