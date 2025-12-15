// stores/storageLocations.ts
// defineStore is auto-imported by Nuxt
import { ref } from "vue";

export type StorageLocation = {
  id: number;
  uuid: string;
  created_at: string;
  corporation_uuid: string;
  location_name: string;
  address: string;
  project_uuid?: string;
  is_default: boolean;
  status: "active" | "inactive";
  updated_at: string;
};

export type CreateStorageLocationPayload = {
  location_name: string;
  address: string;
  project_uuid?: string;
  is_default?: boolean;
  status?: "active" | "inactive";
};

export const useStorageLocationsStore = defineStore(
  "storageLocations",
  () => {
    const storageLocations = ref<StorageLocation[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    // Cache management
    const lastFetchedCorporation = ref<string | null>(null);
    const hasDataForCorporation = ref<Set<string>>(new Set());

    // Check if we need to fetch data
    const shouldFetchData = (corporationUUID: string) => {
      // If it's a different corporation, always fetch
      if (lastFetchedCorporation.value !== corporationUUID) {
        return true;
      }

      // If we already have data for this corporation, don't fetch again
      if (hasDataForCorporation.value.has(corporationUUID)) {
        return false;
      }

      return true;
    };

    /**
     * Fetch storage locations from IndexedDB for a specific corporation
     */
    const fetchStorageLocationsFromDB = async (corporationUUID: string) => {
      loading.value = true;
      error.value = null;

      try {
        const { dbHelpers } = await import("@/utils/indexedDb");
        const dbStorageLocations = await dbHelpers.getStorageLocations(
          corporationUUID
        );
        storageLocations.value = (dbStorageLocations as any[]) || [];

        // Update cache info
        lastFetchedCorporation.value = corporationUUID;
        hasDataForCorporation.value.add(corporationUUID);
      } catch (err: any) {
        error.value =
          err.message || "Failed to fetch storage locations from IndexedDB";
        storageLocations.value = [];
      } finally {
        loading.value = false;
      }
    };

    /**
     * Fetch all storage locations for a specific corporation - defaults to IndexedDB
     */
    const fetchStorageLocations = async (
      corporationUUID: string,
      forceRefresh = false,
      useIndexedDB = true
    ) => {
      // By default, fetch from IndexedDB (faster, cached data)
      // Set useIndexedDB=false to force API fetch
      if (useIndexedDB && !forceRefresh) {
        return await fetchStorageLocationsFromDB(corporationUUID);
      }

      // Skip fetch if we have valid cached data and not forcing refresh
      if (!forceRefresh && !shouldFetchData(corporationUUID)) {
        return;
      }

      // Only fetch on client side to avoid SSR issues
      if (process.server) {
        return;
      }

      loading.value = true;
      error.value = null;
      try {
        const response = await $fetch(
          `/api/storage-locations?corporation_uuid=${corporationUUID}`
        );
        if (response?.error) throw new Error(response.error);

        storageLocations.value = response?.data || [];

        // Update cache info
        lastFetchedCorporation.value = corporationUUID;
        hasDataForCorporation.value.add(corporationUUID);
      } catch (err: any) {
        error.value = err.message || "Failed to fetch storage locations";
        storageLocations.value = [];
        // Clear cache on error to ensure fresh fetch next time
        hasDataForCorporation.value.delete(corporationUUID);
      }
      loading.value = false;
    };

    // Add a new storage location
    const addStorageLocation = async (
      corporationUUID: string,
      locationData: CreateStorageLocationPayload
    ) => {
      loading.value = true;
      error.value = null;
      try {
        const response = await $fetch("/api/storage-locations", {
          method: "POST",
          body: {
            ...locationData,
            corporation_uuid: corporationUUID,
          },
        });
        if (response?.error) throw new Error(response.error);

        // Add the new storage location to local state immediately
        if (response?.data) {
          storageLocations.value.unshift(response.data);

          // Sync to IndexedDB to keep it in sync
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            await dbHelpers.addStorageLocation(corporationUUID, response.data);
          } catch (dbError) {
            console.warn(
              "Failed to sync storage location to IndexedDB:",
              dbError
            );
          }

          // Clear cache to ensure fresh data on next fetch
          hasDataForCorporation.value.delete(corporationUUID);
        }

        return response;
      } catch (err: any) {
        error.value = err.message || "Failed to add storage location";
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // Update an existing storage location
    const updateStorageLocation = async (
      corporationUUID: string,
      location: StorageLocation,
      updatedData: Partial<CreateStorageLocationPayload>
    ) => {
      loading.value = true;
      error.value = null;
      try {
        const response = await $fetch("/api/storage-locations", {
          method: "PUT",
          body: {
            ...updatedData,
            uuid: location.uuid,
            corporation_uuid: corporationUUID,
          },
        });
        if (response?.error) throw new Error(response.error);

        // Update the storage location in local state immediately
        const index = storageLocations.value.findIndex(
          (l) => l.id === location.id
        );
        if (index > -1 && response?.data) {
          const updatedLocation = {
            ...storageLocations.value[index],
            ...response.data,
          };
          storageLocations.value[index] = updatedLocation;

          // Sync to IndexedDB to keep it in sync
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            await dbHelpers.updateStorageLocation(
              corporationUUID,
              updatedLocation
            );
          } catch (dbError) {
            console.warn(
              "Failed to sync updated storage location to IndexedDB:",
              dbError
            );
          }

          // Clear cache to ensure fresh data on next fetch
          hasDataForCorporation.value.delete(corporationUUID);
        }

        return response;
      } catch (err: any) {
        error.value = err.message || "Failed to update storage location";
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // Delete a storage location
    const deleteStorageLocation = async (
      corporationUUID: string,
      location: StorageLocation
    ) => {
      loading.value = true;
      error.value = null;
      try {
        const response = await $fetch(
          `/api/storage-locations?uuid=${location.uuid}`,
          {
            method: "DELETE",
          }
        );
        if (response?.error) throw new Error(response.error);

        // Remove the storage location from local state immediately
        const index = storageLocations.value.findIndex(
          (l) => l.id === location.id
        );
        if (index > -1) {
          storageLocations.value.splice(index, 1);

          // Sync deletion to IndexedDB
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            await dbHelpers.deleteStorageLocation(
              corporationUUID,
              location.uuid
            );
          } catch (dbError) {
            console.warn(
              "Failed to sync storage location deletion to IndexedDB:",
              dbError
            );
          }

          // Clear cache to ensure fresh data on next fetch
          hasDataForCorporation.value.delete(corporationUUID);
        }

        return response;
      } catch (err: any) {
        error.value = err.message || "Failed to delete storage location";
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // Clear cache for a specific corporation
    const clearCache = (corporationUUID?: string) => {
      if (
        !corporationUUID ||
        lastFetchedCorporation.value === corporationUUID
      ) {
        storageLocations.value = [];
        lastFetchedCorporation.value = null;
        hasDataForCorporation.value.clear();
      }
    };

    // Helper method to force refresh from API (bypassing IndexedDB)
    const refreshStorageLocationsFromAPI = async (corporationUUID: string) => {
      return await fetchStorageLocations(corporationUUID, true, false);
    };

    return {
      storageLocations,
      loading,
      error,
      fetchStorageLocations,
      addStorageLocation,
      updateStorageLocation,
      deleteStorageLocation,
      clearCache,
      refreshStorageLocationsFromAPI,
    };
  },
  {
    persist: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      paths: ["lastFetchedCorporation", "hasDataForCorporation"],
    },
  }
);

