import { defineStore } from "pinia";

export interface PreferredItem {
  id?: number;
  uuid?: string;
  item_type_uuid: string;
  item_name: string;
  item_sequence?: string;
  model_number?: string;
  project_uuid?: string;
  corporation_uuid?: string;
  unit_price: number | string;
  unit: string;
  description?: string;
  status: string;
  initial_quantity?: number | string;
  as_of_date?: string;
  reorder_point?: number | string;
  maximum_limit?: number | string;
}

export interface CostCodeConfiguration {
  id?: number;
  uuid?: string;
  corporation_uuid: string;
  division_uuid?: string;
  cost_code_number: string;
  cost_code_name: string;
  parent_cost_code_uuid?: string;
  order?: number;
  gl_account_uuid: string;
  preferred_vendor_uuid?: string;
  effective_from?: string;
  description?: string;
  update_previous_transactions?: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  preferred_items?: PreferredItem[];
}

export const useCostCodeConfigurationsStore = defineStore("costCodeConfigurations", () => {
  // State
  const configurations = ref<CostCodeConfiguration[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Cache management
  const lastFetchedCorporation = ref<string | null>(null);
  const hasDataForCorporation = ref<Set<string>>(new Set());

  // Getters
  const getConfigurationsByCorporation = computed(() => {
    return (corporationUuid: string) => {
      return configurations.value.filter(
        (configuration) => configuration.corporation_uuid === corporationUuid
      );
    };
  });

  const getActiveConfigurations = computed(() => {
    return (corporationUuid: string) => {
      return configurations.value.filter(
        (configuration) =>
          configuration.corporation_uuid === corporationUuid &&
          configuration.is_active
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
   * Fetch cost code configurations from IndexedDB for a specific corporation
   */
  const fetchConfigurationsFromDB = async (corporationUUID: string) => {
    loading.value = true;
    error.value = null;

    try {
      const { dbHelpers } = await import("@/utils/indexedDb");
      const dbConfigurations = await dbHelpers.getCostCodeConfigurations(
        corporationUUID
      );
      configurations.value = (dbConfigurations as any[]) || [];

      // Update cache info
      lastFetchedCorporation.value = corporationUUID;
      hasDataForCorporation.value.add(corporationUUID);
    } catch (err: any) {
      error.value =
        err.message ||
        "Failed to fetch cost code configurations from IndexedDB";
      configurations.value = [];
    } finally {
      loading.value = false;
    }
  };

  // Actions
  const fetchConfigurations = async (
    corporationUuid: string,
    forceRefresh = false,
    useIndexedDB = true
  ) => {
    // By default, fetch from IndexedDB (faster, cached data)
    // Set useIndexedDB=false to force API fetch
    if (useIndexedDB && !forceRefresh) {
      return await fetchConfigurationsFromDB(corporationUuid);
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
      const { apiFetch } = useApiClient();
      const { data } = await apiFetch<{ data: CostCodeConfiguration[] }>(
        `/api/cost-code-configurations`,
        {
          query: { corporation_uuid: corporationUuid },
        }
      );

      configurations.value = data || [];

      // Sync to IndexedDB to keep it in sync with the API
      if (process.client && data && data.length > 0) {
        try {
          const { dbHelpers } = await import("@/utils/indexedDb");
          await dbHelpers.saveCostCodeConfigurations(corporationUuid, data);
        } catch (dbError) {
          console.warn(
            "Failed to sync cost code configurations to IndexedDB:",
            dbError
          );
        }
      }

      // Update cache info
      lastFetchedCorporation.value = corporationUuid;
      hasDataForCorporation.value.add(corporationUuid);
    } catch (err: any) {
      error.value = err.message || "Failed to fetch cost code configurations";
      console.error("Error fetching cost code configurations:", err);
      configurations.value = [];
      // Clear cache on error to ensure fresh fetch next time
      hasDataForCorporation.value.delete(corporationUuid);
    } finally {
      loading.value = false;
    }
  };

  const createConfiguration = async (
    configurationData: Omit<
      CostCodeConfiguration,
      "id" | "created_at" | "updated_at"
    >
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const { apiFetch } = useApiClient();
      const { data } = await apiFetch<{ data: CostCodeConfiguration }>(
        "/api/cost-code-configurations",
        {
          method: "POST",
          body: configurationData,
        }
      );

      if (data) {
        configurations.value.unshift(data);

        // Sync to IndexedDB to keep it in sync
        try {
          const { dbHelpers } = await import("@/utils/indexedDb");
          await dbHelpers.addCostCodeConfiguration(
            configurationData.corporation_uuid,
            data
          );
        } catch (dbError) {
          console.warn(
            "Failed to sync cost code configuration to IndexedDB:",
            dbError
          );
        }

        // Clear cache to ensure fresh data on next fetch
        hasDataForCorporation.value.delete(configurationData.corporation_uuid);
      }

      return data;
    } catch (err: any) {
      error.value = err.message || "Failed to create cost code configuration";
      console.error("Error creating cost code configuration:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateConfiguration = async (
    uuid: string,
    configurationData: Partial<CostCodeConfiguration>
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const { apiFetch } = useApiClient();
      const { data } = await apiFetch<{ data: CostCodeConfiguration }>(
        `/api/cost-code-configurations/${uuid}`,
        {
          method: "PUT",
          body: configurationData,
        }
      );

      if (data) {
        const index = configurations.value.findIndex(
          (configuration) => configuration.uuid === uuid
        );
        if (index !== -1) {
          configurations.value[index] = data;

          // Sync to IndexedDB to keep it in sync
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            await dbHelpers.updateCostCodeConfiguration(
              data.corporation_uuid,
              data
            );
          } catch (dbError) {
            console.warn(
              "Failed to sync updated cost code configuration to IndexedDB:",
              dbError
            );
          }

          // Clear cache to ensure fresh data on next fetch
          hasDataForCorporation.value.delete(data.corporation_uuid);
        }
      }

      return data;
    } catch (err: any) {
      error.value = err.message || "Failed to update cost code configuration";
      console.error("Error updating cost code configuration:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteConfiguration = async (uuid: string) => {
    loading.value = true;
    error.value = null;

    try {
      // Find the configuration to get corporation_uuid before deletion
      const configurationToDelete = configurations.value.find(
        (configuration) => configuration.uuid === uuid
      );

      const { apiFetch } = useApiClient();
      await apiFetch(`/api/cost-code-configurations/${uuid}`, {
        method: "DELETE",
      });

      // Find and remove the configuration by uuid
      const index = configurations.value.findIndex(
        (configuration) => configuration.uuid === uuid
      );
      if (index !== -1) {
        configurations.value.splice(index, 1);

        // Sync deletion to IndexedDB
        if (configurationToDelete?.corporation_uuid) {
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            await dbHelpers.deleteCostCodeConfiguration(
              configurationToDelete.corporation_uuid,
              uuid
            );
          } catch (dbError) {
            console.warn(
              "Failed to sync cost code configuration deletion to IndexedDB:",
              dbError
            );
          }

          // Clear cache to ensure fresh data on next fetch
          hasDataForCorporation.value.delete(
            configurationToDelete.corporation_uuid
          );
        }
      }
    } catch (err: any) {
      error.value = err.message || "Failed to delete cost code configuration";
      console.error("Error deleting cost code configuration:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const bulkImportConfigurations = async (
    corporationUuid: string,
    configurationsData: Omit<
      CostCodeConfiguration,
      "id" | "created_at" | "updated_at"
    >[]
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const { apiFetch } = useApiClient();
      const result = await apiFetch<{ data: any; message: string }>(
        "/api/cost-code-configurations/bulk",
        {
          method: "POST",
          body: {
            corporation_uuid: corporationUuid,
            configurations: configurationsData,
          },
        }
      );

      // Clear cache to ensure fresh data on next fetch
      hasDataForCorporation.value.delete(corporationUuid);

      // Force refresh the configurations list
      await fetchConfigurations(corporationUuid, true);

      return result;
    } catch (err: any) {
      error.value =
        err.message || "Failed to bulk import cost code configurations";
      console.error("Error bulk importing cost code configurations:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteAllConfigurations = async (corporationUuid: string) => {
    loading.value = true;
    error.value = null;

    try {
      const { apiFetch } = useApiClient();
      await apiFetch(`/api/cost-code-configurations/delete-all`, {
        method: "DELETE",
        query: { corporation_uuid: corporationUuid },
      });

      // Clear the configurations for this corporation
      configurations.value = configurations.value.filter(
        (configuration) => configuration.corporation_uuid !== corporationUuid
      );

      // Clear cache to ensure fresh data on next fetch
      hasDataForCorporation.value.delete(corporationUuid);
    } catch (err: any) {
      error.value =
        err.message || "Failed to delete all cost code configurations";
      console.error("Error deleting all cost code configurations:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  const clearConfigurations = () => {
    configurations.value = [];
    lastFetchedCorporation.value = null;
    hasDataForCorporation.value.clear();
  };

  // Helper method to force refresh from API (bypassing IndexedDB)
  const refreshConfigurationsFromAPI = async (corporationUUID: string) => {
    return await fetchConfigurations(corporationUUID, true, false);
  };

  // Additional getters for tests
  const getConfigurationById = computed(() => {
    return (uuid: string) => {
      return configurations.value.find(
        (configuration) => configuration.uuid === uuid
      );
    };
  });

  const getConfigurationCountByCorporation = computed(() => {
    return (corporationUuid: string) => {
      return configurations.value.filter(
        (configuration) => configuration.corporation_uuid === corporationUuid
      ).length;
    };
  });

  const getActiveConfigurationCountByCorporation = computed(() => {
    return (corporationUuid: string) => {
      return configurations.value.filter(
        (configuration) =>
          configuration.corporation_uuid === corporationUuid &&
          configuration.is_active
      ).length;
    };
  });

  const configurationExists = computed(() => {
    return (uuid: string) => {
      return configurations.value.some(
        (configuration) => configuration.uuid === uuid
      );
    };
  });

  // Item-specific getters
  const getAllItems = computed(() => {
    return (corporationUuid: string) => {
      const configs = configurations.value.filter(
        (config) => config.corporation_uuid === corporationUuid
      );

      const allItems: (PreferredItem & {
        cost_code_configuration_uuid?: string;
        cost_code_number?: string;
        cost_code_name?: string;
      })[] = [];

      configs.forEach((config) => {
        if (config.preferred_items && config.preferred_items.length > 0) {
          config.preferred_items.forEach((item) => {
            allItems.push({
              ...item,
              cost_code_configuration_uuid: config.uuid,
              cost_code_number: config.cost_code_number,
              cost_code_name: config.cost_code_name,
            });
          });
        }
      });

      return allItems;
    };
  });

  const getItemById = computed(() => {
    return (itemUuid: string) => {
      for (const config of configurations.value) {
        if (config.preferred_items) {
          const item = config.preferred_items.find((i) => i.uuid === itemUuid);
          if (item) {
            return {
              ...item,
              cost_code_configuration_uuid: config.uuid,
              cost_code_number: config.cost_code_number,
              cost_code_name: config.cost_code_name,
            };
          }
        }
      }
      return null;
    };
  });

  const getItemsByCostCode = computed(() => {
    return (costCodeUuid: string) => {
      const config = configurations.value.find((c) => c.uuid === costCodeUuid);
      return config?.preferred_items || [];
    };
  });

  return {
    // State
    configurations: readonly(configurations),
    loading: readonly(loading),
    error: readonly(error),

    // Getters
    getConfigurationsByCorporation,
    getActiveConfigurations,
    getConfigurationById,
    getConfigurationCountByCorporation,
    getActiveConfigurationCountByCorporation,
    configurationExists,
    getAllItems,
    getItemById,
    getItemsByCostCode,

    // Actions
    fetchConfigurations,
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    bulkImportConfigurations,
    deleteAllConfigurations,
    clearError,
    clearConfigurations,
    refreshConfigurationsFromAPI,
  };
});
