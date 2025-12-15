import { useAuthStore } from "~/stores/auth";
import { useUserProfilesStore } from "~/stores/userProfiles";
import { useRoleStore } from "~/stores/roles";

export const usePermissions = () => {
  const authStore = useAuthStore();
  const userProfilesStore = useUserProfilesStore();
  const roleStore = useRoleStore();

  // Get current user from userProfiles store
  const currentUser = computed(() => {
    if (!authStore.user?.email) return null;
    return userProfilesStore.users.find(user => user.email === authStore.user.email);
  });

  // Get current user's role
  const currentUserRole = computed(() => {
    if (!currentUser.value?.roleId) return null;
    return roleStore.roles.find(role => role.id === currentUser.value?.roleId);
  });

  // Get current user's permissions
  const currentUserPermissions = computed(() => {
    if (!currentUserRole.value?.permissions) return [];
    return Array.isArray(currentUserRole.value.permissions) 
      ? currentUserRole.value.permissions 
      : [];
  });

  // Check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    return currentUserPermissions.value.includes(permission);
  };

  // Check if user has any of the specified permissions
  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  // Check if user has all of the specified permissions
  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  // Check if user has any user management permissions
  const canAccessUserSetup = computed(() => {
    // If no roles exist in the database, allow access to create the first role
    if (roleStore.roles.length === 0) {
      return true;
    }

    return hasAnyPermission([
      "users_view",
      "users_add",
      "users_edit",
      "users_delete",
      "roles_view",
      "roles_create",
      "roles_edit",
      "roles_delete",
    ]);
  });

  // Check if user is authenticated and has permissions loaded
  const isReady = computed(() => {
    return (
      authStore.isAuthenticated &&
      userProfilesStore.users.length > 0 &&
      roleStore.roles.length > 0 // Roles are always fetched fresh, no caching
    );
  });

  return {
    currentUser,
    currentUserRole,
    currentUserPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessUserSetup,
    isReady
  };
};
