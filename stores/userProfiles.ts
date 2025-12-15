// defineStore is auto-imported by Nuxt

interface InvitedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  roleId: number | undefined;
  status: "pending" | "active" | "inactive";
  imageUrl?: string;
  createdAt: string;
  lastSignIn: string | null;
  invitedAt: string | null;
  recentProperty?: string | null;
  corporationAccess?: string[];
}

interface InviteResponse {
  success: boolean;
  message?: string;
  data?: InvitedUser;
  error?: string;
}

interface ListResponse {
  success: boolean;
  data?: InvitedUser[];
  error?: string;
}

interface UpdateUserData {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  status?: "pending" | "active" | "inactive";
  roleId?: number | undefined;
  imageUrl?: string;
  recentProperty?: string | null;
  corporationAccess?: string[];
}

interface UpdateResponse {
  success: boolean;
  message?: string;
  data?: InvitedUser;
  error?: string;
}

interface DeleteResponse {
  success: boolean;
  error?: string;
}

export const useUserProfilesStore = defineStore(
  "userProfiles",
  () => {
    const users = ref<InvitedUser[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const hasData = ref(false);
    const lastFetched = ref(0);

    const pendingUsers = computed(() =>
      users.value.filter((user) => user.status === "pending")
    );

    const activeUsers = computed(() =>
      users.value.filter((user) => user.status === "active")
    );

    const inactiveUsers = computed(() =>
      users.value.filter((user) => user.status === "inactive")
    );

    const fetchUsers = async (forceRefresh = false) => {
      // Don't fetch if we have recent data and not forcing refresh
      if (
        !forceRefresh &&
        hasData.value &&
        Date.now() - lastFetched.value < 300000
      ) {
        return;
      }

      loading.value = true;
      error.value = null;

      try {
        const data = await $fetch<ListResponse>("/api/users/list");

        if (data?.success && data.data) {
          users.value = data.data;
          hasData.value = true;
          lastFetched.value = Date.now();
        } else {
          throw new Error(data?.error || "Failed to fetch users");
        }
      } catch (err) {
        error.value =
          err instanceof Error ? err.message : "Failed to fetch users";
        console.error("Error fetching users:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    const inviteUser = async (email: string) => {
      loading.value = true;
      error.value = null;

      try {
        const data = await $fetch<InviteResponse>("/api/users/invite", {
          method: "POST",
          body: { email },
        });

        if (data?.success) {
          // Refresh the user list to show the new invited user
          await fetchUsers(true);
          return (data as any).data;
        } else {
          throw new Error((data as any)?.error || "Failed to invite user");
        }
      } catch (err) {
        error.value =
          err instanceof Error ? err.message : "Failed to invite user";
        console.error("Error inviting user:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    const updateUser = async (userData: UpdateUserData) => {
      loading.value = true;
      error.value = null;

      try {
        const data = await $fetch<UpdateResponse>("/api/users/update", {
          method: "PUT",
          body: userData,
        });

        if (data?.success) {
          // Refresh the user list to show the updated user
          await fetchUsers(true);
          return (data as any).data;
        } else {
          throw new Error((data as any)?.error || "Failed to update user");
        }
      } catch (err) {
        error.value =
          err instanceof Error ? err.message : "Failed to update user";
        console.error("Error updating user:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    const deleteUser = async (id: string) => {
      loading.value = true;
      error.value = null;

      try {
        const data = await $fetch<DeleteResponse>(`/api/users/${id}`, {
          method: "DELETE",
        });

        if (data?.success) {
          // Refresh the user list to show the updated user
          await fetchUsers(true);
          return (data as any).data;
        } else {
          throw new Error((data as any)?.error || "Failed to delete user");
        }
      } catch (err) {
        error.value =
          err instanceof Error ? err.message : "Failed to delete user";
        console.error("Error deleting user:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    const clearError = () => {
      error.value = null;
    };

    const clearStore = () => {
      users.value = [];
      hasData.value = false;
      lastFetched.value = 0;
      error.value = null;
    };

    return {
      users,
      loading,
      error,
      hasData,
      lastFetched,
      pendingUsers,
      activeUsers,
      inactiveUsers,
      fetchUsers,
      inviteUser,
      updateUser,
      deleteUser,
      clearError,
      clearStore,
    };
  },
  {
    persist: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      paths: ["users", "lastFetched", "hasData"],
    },
  }
);
