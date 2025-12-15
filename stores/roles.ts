// defineStore is auto-imported by Nuxt

interface Role {
  id: number;
  role_name: string;
  description: string;
  status: string;
  permissions: string[];
  user_count: number;
  created_at: string;
  updated_at: string;
}

interface RoleForm {
  role_name: string;
  description: string;
  status: string;
  permissions: string[];
}

export const useRoleStore = defineStore(
  "roles",
  () => {
    const roles = ref<Role[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    const activeRoles = computed(() =>
      roles.value.filter((role) => role.status === "active")
    );

    const inactiveRoles = computed(() =>
      roles.value.filter((role) => role.status === "inactive")
    );

    /**
     * Fetch roles from API - NO CACHING
     * Always fetches fresh data to ensure permissions are up-to-date
     */
    const fetchRoles = async () => {
      // Only fetch on client side to avoid SSR issues
      if (process.server) {
        return;
      }

      loading.value = true;
      error.value = null;

      try {
        const response = await $fetch("/api/roles");

        if (response?.success) {
          roles.value = (response as any).data;
        } else {
          throw new Error((response as any)?.error || "Failed to fetch roles");
        }
      } catch (err) {
        error.value =
          err instanceof Error ? err.message : "Failed to fetch roles";
        console.error("Error fetching roles:", err);
        roles.value = [];
      } finally {
        loading.value = false;
      }
    };

    const addRole = async (roleData: RoleForm) => {
      loading.value = true;
      error.value = null;

      try {
        const response = await $fetch("/api/roles", {
          method: "POST",
          body: roleData,
        });
        if (response?.success) {
          // Add the new role to local state immediately
          roles.value.push((response as any).data);
          return (response as any).data;
        } else {
          throw new Error((response as any)?.error || "Failed to add role");
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : "Failed to add role";
        console.error("Error adding role:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    const updateRole = async (id: number, roleData: RoleForm) => {
      loading.value = true;
      error.value = null;

      try {
        const response = await $fetch(`/api/roles/${id}`, {
          method: "PUT",
          body: roleData,
        });

        if (response?.success) {
          // Update the role in local state immediately
          const index = roles.value.findIndex((role) => role.id === id);
          if (index > -1) {
            roles.value[index] = {
              ...roles.value[index],
              ...(response as any).data,
            };
          }
          return (response as any).data;
        } else {
          throw new Error((response as any)?.error || "Failed to update role");
        }
      } catch (err) {
        error.value =
          err instanceof Error ? err.message : "Failed to update role";
        console.error("Error updating role:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    const deleteRole = async (id: number) => {
      loading.value = true;
      error.value = null;

      try {
        const response = await $fetch(`/api/roles/${id}`, {
          method: "DELETE",
        });

        if (response?.success) {
          // Remove the role from local state immediately
          const index = roles.value.findIndex((role) => role.id === id);
          if (index > -1) {
            roles.value.splice(index, 1);
          }

          return (response as any).data;
        } else {
          throw new Error((response as any)?.error || "Failed to delete role");
        }
      } catch (err) {
        error.value =
          err instanceof Error ? err.message : "Failed to delete role";
        console.error("Error deleting role:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    const toggleRoleStatus = async (id: number) => {
      const role = roles.value.find((r) => r.id === id);
      if (role) {
        const newStatus = role.status === "active" ? "inactive" : "active";

        try {
          await updateRole(id, {
            role_name: role.role_name,
            description: role.description,
            status: newStatus,
            permissions: role.permissions,
          });
        } catch (err) {
          // Revert on error
          role.status = role.status === "active" ? "inactive" : "active";
          throw err;
        }
      }
    };

    const getRoleById = (id: number): Role | undefined => {
      return roles.value.find((role) => role.id === id);
    };

    const getRolesByPermission = (permission: string): Role[] => {
      return roles.value.filter(
        (role) =>
          role.permissions.includes(permission) && role.status === "active"
      );
    };

    // Clear roles data
    const clearRoles = () => {
      roles.value = [];
      error.value = null;
    };

    // Refresh data - always fetches fresh from API
    const refreshData = async () => {
      await fetchRoles();
    };

    // Initialize store - always fetches fresh data
    const initializeStore = async () => {
      // Only initialize on client side
      if (process.client) {
        await fetchRoles();
      }
    };

    return {
      roles,
      loading,
      error,
      activeRoles,
      inactiveRoles,
      fetchRoles,
      addRole,
      updateRole,
      deleteRole,
      toggleRoleStatus,
      getRoleById,
      getRolesByPermission,
      clearRoles,
      refreshData,
      initializeStore,
    };
  }
  // NO PERSISTENCE - roles are always fetched fresh from API
);
