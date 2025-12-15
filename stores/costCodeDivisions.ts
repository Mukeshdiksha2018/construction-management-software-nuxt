import { defineStore } from "pinia";

export interface CostCodeDivision {
  id?: number;
  uuid?: string;
  division_number: string;
  division_name: string;
  division_order: number;
  description?: string;
  is_active: boolean;
  exclude_in_estimates_and_reports?: boolean;
  corporation_uuid: string;
  created_at?: string;
  updated_at?: string;
}

export const useCostCodeDivisionsStore = defineStore("costCodeDivisions", () => {
  // State
  const divisions = ref<CostCodeDivision[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Cache management
  const lastFetchedCorporation = ref<string | null>(null);
  const hasDataForCorporation = ref<Set<string>>(new Set());

  // Getters
  const getDivisionsByCorporation = computed(() => {
    return (corporationUuid: string) => {
      return divisions.value.filter(
        (division) => division.corporation_uuid === corporationUuid
      );
    };
  });

  const getActiveDivisions = computed(() => {
    return (corporationUuid: string) => {
      return divisions.value.filter(
        (division) =>
          division.corporation_uuid === corporationUuid && division.is_active
      );
    };
  });

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
   * Fetch cost code divisions from IndexedDB for a specific corporation
   */
  const fetchDivisionsFromDB = async (corporationUUID: string) => {
    loading.value = true;
    error.value = null;

    try {
      const { dbHelpers } = await import("@/utils/indexedDb");
      const dbDivisions = await dbHelpers.getCostCodeDivisions(corporationUUID);
      divisions.value = (dbDivisions as any[]) || [];

      // Update cache info
      lastFetchedCorporation.value = corporationUUID;
      hasDataForCorporation.value.add(corporationUUID);
    } catch (err: any) {
      error.value =
        err.message || "Failed to fetch cost code divisions from IndexedDB";
      divisions.value = [];
    } finally {
      loading.value = false;
    }
  };

  // Actions
  const fetchDivisions = async (
    corporationUuid: string,
    forceRefresh = false,
    useIndexedDB = true
  ) => {
    // By default, fetch from IndexedDB (faster, cached data)
    // Set useIndexedDB=false to force API fetch
    if (useIndexedDB && !forceRefresh) {
      return await fetchDivisionsFromDB(corporationUuid);
    }

    // Skip fetch if we have valid cached data and not forcing refresh
    if (!forceRefresh && !shouldFetchData(corporationUuid)) {
      return;
    }

    // Only fetch on client side to avoid SSR issues
    if (process.server) {
      return;
    }
    loading.value = true;
    error.value = null;

    try {
      const { data } = await $fetch<{ data: CostCodeDivision[] }>(
        `/api/cost-code-divisions`,
        {
          query: { corporation_uuid: corporationUuid },
        }
      );

      divisions.value = data || [];

      // Sync to IndexedDB to keep it in sync with the API
      if (process.client && data && data.length > 0) {
        try {
          const { dbHelpers } = await import("@/utils/indexedDb");
          await dbHelpers.saveCostCodeDivisions(corporationUuid, data);
        } catch (dbError) {
          console.warn(
            "Failed to sync cost code divisions to IndexedDB:",
            dbError
          );
        }
      }

      // Update cache info
      lastFetchedCorporation.value = corporationUuid;
      hasDataForCorporation.value.add(corporationUuid);
    } catch (err: any) {
      error.value = err.message || "Failed to fetch cost code divisions";
      console.error("Error fetching cost code divisions:", err);
      divisions.value = [];
      // Clear cache on error to ensure fresh fetch next time
      hasDataForCorporation.value.delete(corporationUuid);
    } finally {
      loading.value = false;
    }
  };

  const createDivision = async (
    divisionData: Omit<CostCodeDivision, "id" | "created_at" | "updated_at">
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await $fetch<{ data: CostCodeDivision }>(
        "/api/cost-code-divisions",
        {
          method: "POST",
          body: divisionData,
        }
      );

      if (data) {
        divisions.value.unshift(data);

        // Sync to IndexedDB to keep it in sync
        try {
          const { dbHelpers } = await import("@/utils/indexedDb");
          await dbHelpers.addCostCodeDivision(
            divisionData.corporation_uuid,
            data
          );
        } catch (dbError) {
          console.warn(
            "Failed to sync cost code division to IndexedDB:",
            dbError
          );
        }

        // Clear cache to ensure fresh data on next fetch
        hasDataForCorporation.value.delete(divisionData.corporation_uuid);
      }

      return data;
    } catch (err: any) {
      error.value = err.message || "Failed to create cost code division";
      console.error("Error creating cost code division:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateDivision = async (
    uuid: string,
    divisionData: Partial<CostCodeDivision>
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await $fetch<{ data: CostCodeDivision }>(
        `/api/cost-code-divisions/${uuid}`,
        {
          method: "PUT",
          body: divisionData,
        }
      );

      if (data) {
        const index = divisions.value.findIndex(
          (division) => division.uuid === uuid
        );
        if (index !== -1) {
          divisions.value[index] = data;

          // Sync to IndexedDB to keep it in sync
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            await dbHelpers.updateCostCodeDivision(data.corporation_uuid, data);
          } catch (dbError) {
            console.warn(
              "Failed to sync updated cost code division to IndexedDB:",
              dbError
            );
          }

          // Clear cache to ensure fresh data on next fetch
          hasDataForCorporation.value.delete(data.corporation_uuid);
        }
      }

      return data;
    } catch (err: any) {
      error.value = err.message || "Failed to update cost code division";
      console.error("Error updating cost code division:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteDivision = async (uuid: string) => {
    loading.value = true;
    error.value = null;

    try {
      // Find the division to get corporation_uuid before deletion
      const divisionToDelete = divisions.value.find(
        (division) => division.uuid === uuid
      );

      await $fetch(`/api/cost-code-divisions/${uuid}`, {
        method: "DELETE",
      });

      // Find and remove the division by uuid
      const index = divisions.value.findIndex(
        (division) => division.uuid === uuid
      );
      if (index !== -1) {
        divisions.value.splice(index, 1);

        // Sync deletion to IndexedDB
        if (divisionToDelete?.corporation_uuid) {
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            await dbHelpers.deleteCostCodeDivision(
              divisionToDelete.corporation_uuid,
              uuid
            );
          } catch (dbError) {
            console.warn(
              "Failed to sync cost code division deletion to IndexedDB:",
              dbError
            );
          }

          // Clear cache to ensure fresh data on next fetch
          hasDataForCorporation.value.delete(divisionToDelete.corporation_uuid);
        }
      }
    } catch (err: any) {
      error.value = err.message || "Failed to delete cost code division";
      console.error("Error deleting cost code division:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const bulkImportDivisions = async (
    corporationUuid: string,
    divisionsData: Omit<CostCodeDivision, "id" | "created_at" | "updated_at">[]
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const result = await $fetch<{ data: any; message: string }>(
        "/api/cost-code-divisions/bulk",
        {
          method: "POST",
          body: {
            corporation_uuid: corporationUuid,
            divisions: divisionsData,
          },
        }
      );

      // Clear cache to ensure fresh data on next fetch
      hasDataForCorporation.value.delete(corporationUuid);

      // Force refresh the divisions list with IndexedDB synchronization
      await fetchDivisions(corporationUuid, true, true);

      return result;
    } catch (err: any) {
      error.value = err.message || "Failed to bulk import cost code divisions";
      console.error("Error bulk importing cost code divisions:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteAllDivisions = async (corporationUuid: string) => {
    loading.value = true;
    error.value = null;

    try {
      await $fetch(`/api/cost-code-divisions/delete-all`, {
        method: "DELETE",
        query: { corporation_uuid: corporationUuid },
      });

      // Clear the divisions for this corporation
      divisions.value = divisions.value.filter(
        (division) => division.corporation_uuid !== corporationUuid
      );

      // Sync deletion to IndexedDB
      try {
        const { dbHelpers } = await import("@/utils/indexedDb");
        await dbHelpers.deleteAllCostCodeDivisions(corporationUuid);
      } catch (dbError) {
        console.warn(
          "Failed to sync cost code divisions bulk deletion to IndexedDB:",
          dbError
        );
      }

      // Clear cache to ensure fresh data on next fetch
      hasDataForCorporation.value.delete(corporationUuid);
    } catch (err: any) {
      error.value = err.message || "Failed to delete all cost code divisions";
      console.error("Error deleting all cost code divisions:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  const clearDivisions = () => {
    divisions.value = [];
    lastFetchedCorporation.value = null;
    hasDataForCorporation.value.clear();
  };

  // Helper method to force refresh from API (bypassing IndexedDB)
  const refreshDivisionsFromAPI = async (corporationUUID: string) => {
    return await fetchDivisions(corporationUUID, true, false);
  };

  // Additional getters for tests
  const getDivisionById = computed(() => {
    return (uuid: string) => {
      return divisions.value.find((division) => division.uuid === uuid);
    };
  });

  const getDivisionCountByCorporation = computed(() => {
    return (corporationUuid: string) => {
      return divisions.value.filter(
        (division) => division.corporation_uuid === corporationUuid
      ).length;
    };
  });

  const getActiveDivisionCountByCorporation = computed(() => {
    return (corporationUuid: string) => {
      return divisions.value.filter(
        (division) =>
          division.corporation_uuid === corporationUuid && division.is_active
      ).length;
    };
  });

  const divisionExists = computed(() => {
    return (uuid: string) => {
      return divisions.value.some((division) => division.uuid === uuid);
    };
  });

  return {
    // State
    divisions: readonly(divisions),
    loading: readonly(loading),
    error: readonly(error),

    // Getters
    getDivisionsByCorporation,
    getActiveDivisions,
    getDivisionById,
    getDivisionCountByCorporation,
    getActiveDivisionCountByCorporation,
    divisionExists,

    // Actions
    fetchDivisions,
    createDivision,
    updateDivision,
    deleteDivision,
    bulkImportDivisions,
    deleteAllDivisions,
    clearError,
    clearDivisions,
    refreshDivisionsFromAPI,
  };
});
