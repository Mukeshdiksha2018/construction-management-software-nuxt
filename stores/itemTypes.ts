export interface ItemType {
  id: number;
  uuid: string;
  created_at: string;
  updated_at: string;
  corporation_uuid: string;
  project_uuid: string;
  item_type: string;
  short_name: string;
  is_active: boolean;
  project?: {
    uuid: string;
    project_name: string;
    project_id: string;
    corporation_uuid: string;
  };
}

export interface CreateItemTypePayload {
  corporation_uuid: string;
  project_uuid: string;
  item_type: string;
  short_name: string;
  is_active?: boolean;
}

export interface UpdateItemTypePayload extends Partial<CreateItemTypePayload> {
  uuid: string;
}

export interface ItemTypeResponse {
  data: ItemType;
  error?: string;
}

export interface ItemTypesResponse {
  data: ItemType[];
  error?: string;
}

export const useItemTypesStore = defineStore(
  "itemTypes",
  () => {
    const itemTypes = ref<ItemType[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    // Cache management
    const lastFetchedCorporation = ref<string | null>(null);
    const lastFetchedProject = ref<string | null>(null);
    const hasDataForCorporation = ref<Set<string>>(new Set());
    const hasDataForProject = ref<Set<string>>(new Set());

    // Check if we need to fetch data
    const shouldFetchData = (corporationUUID: string, projectUUID?: string) => {
      // If it's a different corporation, always fetch
      if (lastFetchedCorporation.value !== corporationUUID) {
        return true;
      }

      // If project is specified and it's different, fetch
      if (projectUUID && lastFetchedProject.value !== projectUUID) {
        return true;
      }

      // If we already have data for this corporation (and project if specified), don't fetch again
      const cacheKey = projectUUID ? `${corporationUUID}-${projectUUID}` : corporationUUID;
      if (projectUUID) {
        return !hasDataForProject.value.has(cacheKey);
      } else {
        return !hasDataForCorporation.value.has(corporationUUID);
      }
    };

    /**
     * Fetch all item types for a specific corporation
     */
    const fetchItemTypes = async (
      corporationUUID: string,
      projectUUID?: string,
      forceRefresh = false
    ) => {
      // Skip fetch if we have valid cached data and not forcing refresh
      if (!forceRefresh && !shouldFetchData(corporationUUID, projectUUID)) {
        return;
      }

      // Only fetch on client side to avoid SSR issues
      if (process.server) {
        return;
      }

      loading.value = true;
      error.value = null;
      try {
        let url = `/api/item-types?corporation_uuid=${corporationUUID}`;
        if (projectUUID) {
          url += `&project_uuid=${projectUUID}`;
        }

        const response = await $fetch<ItemTypesResponse>(url);
        if (response?.error) throw new Error(response.error);
        
        const newItemTypes = response?.data || [];
        
        // If switching to a different corporation, clear all item types for the old corporation first
        if (lastFetchedCorporation.value && lastFetchedCorporation.value !== corporationUUID) {
          // Remove all item types for the old corporation
          itemTypes.value = itemTypes.value.filter(
            (it) => it.corporation_uuid !== lastFetchedCorporation.value
          );
        }
        
        // Merge new item types with existing ones
        if (!projectUUID) {
          // Corporation-wide fetch: replace all item types for this corporation
          // Keep item types from other corporations
          itemTypes.value = [
            ...itemTypes.value.filter((it) => it.corporation_uuid !== corporationUUID),
            ...newItemTypes
          ];
        } else {
          // Project-specific fetch: replace item types for this corporation+project combination
          // Keep item types from other corporations and other projects
          itemTypes.value = [
            ...itemTypes.value.filter(
              (it) => !(it.corporation_uuid === corporationUUID && it.project_uuid === projectUUID)
            ),
            ...newItemTypes
          ];
        }

        // Update cache info
        lastFetchedCorporation.value = corporationUUID;
        if (projectUUID) {
          lastFetchedProject.value = projectUUID;
          hasDataForProject.value.add(`${corporationUUID}-${projectUUID}`);
        } else {
          hasDataForCorporation.value.add(corporationUUID);
        }
      } catch (err: any) {
        error.value = err.message || "Failed to fetch item types";
        // Only clear item types for this corporation on error, not all
        if (lastFetchedCorporation.value === corporationUUID) {
          itemTypes.value = itemTypes.value.filter(
            (it) => it.corporation_uuid !== corporationUUID
          );
        }
        // Clear cache on error to ensure fresh fetch next time
        if (projectUUID) {
          hasDataForProject.value.delete(`${corporationUUID}-${projectUUID}`);
        } else {
          hasDataForCorporation.value.delete(corporationUUID);
        }
      }
      loading.value = false;
    };

    const hasCachedData = (corporationUUID: string, projectUUID?: string) => {
      if (projectUUID) {
        return hasDataForProject.value.has(`${corporationUUID}-${projectUUID}`);
      }
      return hasDataForCorporation.value.has(corporationUUID);
    };

    /**
     * Fetch a single item type by UUID
     */
    const fetchItemType = async (uuid: string): Promise<ItemType | null> => {
      loading.value = true;
      error.value = null;
      try {
        const response = await $fetch<ItemTypeResponse>(`/api/item-types/${uuid}`);
        if (response?.error) throw new Error(response.error);
        return response?.data || null;
      } catch (err: any) {
        error.value = err.message || "Failed to fetch item type";
        return null;
      } finally {
        loading.value = false;
      }
    };

    /**
     * Create a new item type
     */
    const createItemType = async (
      itemTypeData: CreateItemTypePayload
    ): Promise<ItemType | null> => {
      loading.value = true;
      error.value = null;
      try {
        const response = await $fetch<ItemTypeResponse>("/api/item-types", {
          method: "POST",
          body: itemTypeData,
        });
        if (response?.error) throw new Error(response.error);

        const newItemType = response?.data;
        if (newItemType) {
          // Add to the beginning of the array (most recent first)
          itemTypes.value.unshift(newItemType);
        }
        return newItemType || null;
      } catch (err: any) {
        error.value = err.message || "Failed to create item type";
        return null;
      } finally {
        loading.value = false;
      }
    };

    /**
     * Update an existing item type
     */
    const updateItemType = async (
      itemTypeData: UpdateItemTypePayload
    ): Promise<ItemType | null> => {
      loading.value = true;
      error.value = null;
      try {
        const response = await $fetch<ItemTypeResponse>(`/api/item-types/${itemTypeData.uuid}`, {
          method: "PUT",
          body: itemTypeData,
        });
        if (response?.error) throw new Error(response.error);

        const updatedItemType = response?.data;
        if (updatedItemType) {
          // Update the item type in the array
          const index = itemTypes.value.findIndex(
            (it) => it.uuid === updatedItemType.uuid
          );
          if (index !== -1) {
            itemTypes.value[index] = updatedItemType;
          }
        }
        return updatedItemType || null;
      } catch (err: any) {
        error.value = err.message || "Failed to update item type";
        return null;
      } finally {
        loading.value = false;
      }
    };

    /**
     * Delete an item type
     */
    const deleteItemType = async (uuid: string): Promise<boolean> => {
      loading.value = true;
      error.value = null;
      try {
        const response = await $fetch(`/api/item-types/${uuid}`, {
          method: "DELETE",
        });
        if (response?.error) throw new Error(response.error);

        // Remove from the array
        const index = itemTypes.value.findIndex((it) => it.uuid === uuid);
        if (index !== -1) {
          itemTypes.value.splice(index, 1);
        }
        return true;
      } catch (err: any) {
        error.value = err.message || "Failed to delete item type";
        return false;
      } finally {
        loading.value = false;
      }
    };

    /**
     * Get item types by project
     */
    const getItemTypesByProject = (projectUuid: string): ItemType[] => {
      return itemTypes.value.filter(
        (itemType) => itemType.project_uuid === projectUuid
      );
    };

    /**
     * Get active item types
     */
    const getActiveItemTypes = (corporationUuid: string, projectUuid?: string): ItemType[] => {
      let filtered = itemTypes.value.filter(
        (itemType) => itemType.corporation_uuid === corporationUuid && itemType.is_active
      );
      
      if (projectUuid) {
        filtered = filtered.filter(itemType => itemType.project_uuid === projectUuid);
      }
      
      return filtered;
    };

    /**
     * Search item types by name or short name
     */
    const searchItemTypes = (query: string, corporationUuid: string, projectUuid?: string): ItemType[] => {
      if (!query.trim()) return getActiveItemTypes(corporationUuid, projectUuid);

      const lowercaseQuery = query.toLowerCase();
      let filtered = itemTypes.value.filter(
        (itemType) =>
          itemType.corporation_uuid === corporationUuid &&
          itemType.is_active &&
          (itemType.item_type.toLowerCase().includes(lowercaseQuery) ||
           itemType.short_name.toLowerCase().includes(lowercaseQuery))
      );
      
      if (projectUuid) {
        filtered = filtered.filter(itemType => itemType.project_uuid === projectUuid);
      }
      
      return filtered;
    };

    /**
     * Clear all data (useful for logout)
     */
    const clearData = () => {
      itemTypes.value = [];
      error.value = null;
      lastFetchedCorporation.value = null;
      lastFetchedProject.value = null;
      hasDataForCorporation.value.clear();
      hasDataForProject.value.clear();
    };

    /**
     * Clear cache for a specific corporation
     */
    const clearCache = (corporationUUID: string) => {
      hasDataForCorporation.value.delete(corporationUUID);
      if (lastFetchedCorporation.value === corporationUUID) {
        lastFetchedCorporation.value = null;
      }
      // Clear project-specific cache for this corporation
      const keysToDelete = Array.from(hasDataForProject.value).filter(key => 
        key.startsWith(`${corporationUUID}-`)
      );
      keysToDelete.forEach(key => hasDataForProject.value.delete(key));
    };

    // Additional methods for tests
    const getItemTypeById = (uuid: string): ItemType | undefined => {
      return itemTypes.value.find((it) => it.uuid === uuid);
    };

    const clearError = () => {
      error.value = null;
    };

    const clearItemTypes = () => {
      itemTypes.value = [];
    };

    // Test helper method to set item types directly
    const setItemTypes = (newItemTypes: ItemType[]) => {
      itemTypes.value = newItemTypes;
    };

    return {
      // State
      itemTypes: readonly(itemTypes),
      loading: readonly(loading),
      error: readonly(error),

      // Actions
      fetchItemTypes,
      fetchItemType,
      createItemType,
      updateItemType,
      deleteItemType,
      hasCachedData,
      clearData,
      clearCache,
      clearError,
      clearItemTypes,
      setItemTypes,

      // Getters
      getItemTypesByProject,
      getActiveItemTypes,
      searchItemTypes,
      getItemTypeById,
    };
  },
  {
    persist: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      paths: ["lastFetchedCorporation", "lastFetchedProject", "hasDataForCorporation", "hasDataForProject"],
    },
  }
);
