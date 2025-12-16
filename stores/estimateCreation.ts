// defineStore is auto-imported by Nuxt

/**
 * Store specifically for estimate creation context
 * This store is isolated from the global corporation context to avoid
 * interfering with the TopBar's selected corporation
 */
export const useEstimateCreationStore = defineStore(
  "estimateCreation",
  () => {
    // State
    const selectedCorporationUuid = ref<string | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    // Data stores
    const projects = ref<any[]>([]);
    const costCodeDivisions = ref<any[]>([]);
    const costCodeConfigurations = ref<any[]>([]);
    const itemTypes = ref<any[]>([]);
    const uom = ref<any[]>([]);

    // Computed
    const hasData = computed(() => selectedCorporationUuid.value !== null);
    const selectedCorporation = computed(() => selectedCorporationUuid.value);

    /**
     * Fetch projects for the selected corporation
     */
    const fetchProjects = async (
      corporationUuid: string,
      forceFromAPI: boolean = false
    ) => {
      try {
        // Clear projects first to ensure we don't show stale data
        projects.value = [];

        if (!forceFromAPI) {
          // Try IndexedDB first
          const { dbHelpers } = await import("@/utils/indexedDb");
          const dbProjects = await dbHelpers.getProjects(corporationUuid);

          // Verify that the projects are actually for this corporation
          const validProjects = (dbProjects || []).filter(
            (p: any) => p.corporation_uuid === corporationUuid
          );

          if (validProjects && validProjects.length > 0) {
            projects.value = validProjects;
            return;
          }
        }

        // Fallback to API (or force from API)
        const { apiFetch } = useApiClient();
        const response: any = await apiFetch("/api/projects", {
          query: { corporation_uuid: corporationUuid },
        });

        const data = response?.data || response || [];
        const validProjects = (Array.isArray(data) ? data : []).filter(
          (p: any) => p.corporation_uuid === corporationUuid
        );
        projects.value = validProjects;
        
        // Note: We don't sync to IndexedDB here because this is a temporary store
        // that's cleared after estimate creation. IndexedDB sync is handled by TopBar.vue
        // for the global corporation context.
      } catch (err: any) {
        console.warn("Error fetching projects for estimate creation (continuing with empty array):", err);
        projects.value = [];
        // Don't throw - allow the flow to continue
      }
    };

    /**
     * Fetch cost code divisions for the selected corporation
     */
    const fetchCostCodeDivisions = async (corporationUuid: string) => {
      try {
        // Try IndexedDB first
        const { dbHelpers } = await import("@/utils/indexedDb");
        const dbDivisions = await dbHelpers.getCostCodeDivisions(
          corporationUuid
        );

        if (dbDivisions && dbDivisions.length > 0) {
          costCodeDivisions.value = dbDivisions;
          return;
        }

        // Fallback to API
        const { data } = await $fetch<{ data: any[] }>(
          "/api/cost-code-divisions",
          {
            query: { corporation_uuid: corporationUuid },
          }
        );

        costCodeDivisions.value = data || [];
        
        // Note: We don't sync to IndexedDB here because this is a temporary store
        // that's cleared after estimate creation. IndexedDB sync is handled by TopBar.vue
        // for the global corporation context.
      } catch (err: any) {
        console.warn(
          "Error fetching cost code divisions for estimate creation (continuing with empty array):",
          err
        );
        costCodeDivisions.value = [];
        // Don't throw - allow the flow to continue
      }
    };

    /**
     * Fetch cost code configurations for the selected corporation
     */
    const fetchCostCodeConfigurations = async (corporationUuid: string) => {
      try {
        // Try IndexedDB first
        const { dbHelpers } = await import("@/utils/indexedDb");
        const dbConfigurations = await dbHelpers.getCostCodeConfigurations(
          corporationUuid
        );

        if (dbConfigurations && dbConfigurations.length > 0) {
          costCodeConfigurations.value = dbConfigurations;
          return;
        }

        // Fallback to API
        const { data } = await $fetch<{ data: any[] }>(
          "/api/cost-code-configurations",
          {
            query: { corporation_uuid: corporationUuid },
          }
        );

        costCodeConfigurations.value = data || [];
        
        // Note: We don't sync to IndexedDB here because this is a temporary store
        // that's cleared after estimate creation. IndexedDB sync is handled by TopBar.vue
        // for the global corporation context.
      } catch (err: any) {
        console.warn(
          "Error fetching cost code configurations for estimate creation (continuing with empty array):",
          err
        );
        costCodeConfigurations.value = [];
        // Don't throw - allow the flow to continue
      }
    };

    /**
     * Fetch item types for the selected corporation
     */
    const fetchItemTypes = async (corporationUuid: string) => {
      try {
        // Item types are not stored in IndexedDB, fetch directly from API
        const { apiFetch } = useApiClient();
        const response: any = await apiFetch("/api/item-types", {
          query: { corporation_uuid: corporationUuid },
        });

        const data = response?.data || response || [];
        itemTypes.value = Array.isArray(data) ? data : [];
      } catch (err: any) {
        console.warn("Error fetching item types for estimate creation (continuing with empty array):", err);
        itemTypes.value = [];
        // Don't throw - allow the flow to continue
      }
    };

    /**
     * Fetch UOM (Units of Measure) - these are global but we'll fetch them
     */
    const fetchUOM = async () => {
      try {
        // Try IndexedDB first
        const { dbHelpers } = await import("@/utils/indexedDb");
        const dbUOM = await dbHelpers.getUOMGlobal();

        if (dbUOM && dbUOM.length > 0) {
          uom.value = dbUOM;
          return;
        }

        // Fallback to API
        const { apiFetch } = useApiClient();
        const response: any = await apiFetch("/api/uom", { method: "GET" });
        const data = response?.data || response || [];
        uom.value = Array.isArray(data) ? data : [];
        
        // Note: We don't sync to IndexedDB here because this is a temporary store
        // that's cleared after estimate creation. IndexedDB sync is handled by TopBar.vue
        // for the global corporation context.
      } catch (err: any) {
        console.warn("Error fetching UOM for estimate creation (continuing with empty array):", err);
        uom.value = [];
        // Don't throw - allow the flow to continue
      }
    };

    /**
     * Set corporation and fetch all required data
     */
    const setCorporationAndFetchData = async (
      corporationUuid: string | null
    ) => {
      if (!corporationUuid) {
        clearStore();
        return;
      }

      // Check if we're switching corporations before updating selectedCorporationUuid
      const isSwitchingCorporation = Boolean(
        selectedCorporationUuid.value &&
          selectedCorporationUuid.value !== corporationUuid
      );

      // If switching to a different corporation, clear existing data first
      if (isSwitchingCorporation) {
        projects.value = [];
        costCodeDivisions.value = [];
        costCodeConfigurations.value = [];
        itemTypes.value = [];
      }

      loading.value = true;
      error.value = null;
      selectedCorporationUuid.value = corporationUuid;

      try {
        // Fetch all required data in parallel where possible
        // Phase 1: Base data (no dependencies)
        await Promise.all([
          fetchCostCodeDivisions(corporationUuid).catch((err) => {
            console.warn("Failed to fetch cost code divisions (continuing):", err);
          }),
          fetchUOM().catch((err) => {
            console.warn("Failed to fetch UOM (continuing):", err);
          }), // UOM is global, but we fetch it once
        ]);

        // Phase 2: Projects (depends on nothing, but needed before item types)
        // Force fetch from API when switching corporations to ensure fresh data
        await fetchProjects(corporationUuid, isSwitchingCorporation).catch((err) => {
          console.warn("Failed to fetch projects (continuing):", err);
        });

        // Phase 3: Item Types (depends on projects)
        await fetchItemTypes(corporationUuid).catch((err) => {
          console.warn("Failed to fetch item types (continuing):", err);
        });

        // Phase 4: Cost Code Configurations (depends on cost_code_divisions)
        await fetchCostCodeConfigurations(corporationUuid).catch((err) => {
          console.warn("Failed to fetch cost code configurations (continuing):", err);
        });
      } catch (err: any) {
        // This catch should rarely be hit now since individual fetches handle their own errors
        error.value = err.message || "Failed to fetch estimate creation data";
        console.error("Error setting corporation and fetching data:", err);
        // Don't throw - allow the UI to continue with whatever data we have
      } finally {
        loading.value = false;
      }
    };

    /**
     * Get active divisions for the selected corporation
     */
    const getActiveDivisions = computed(() => {
      if (!selectedCorporationUuid.value) return [];
      return costCodeDivisions.value.filter(
        (division) => division.is_active === true
      );
    });

    /**
     * Get active configurations for the selected corporation
     */
    const getActiveConfigurations = computed(() => {
      if (!selectedCorporationUuid.value) return [];
      return costCodeConfigurations.value.filter(
        (config) => config.is_active === true
      );
    });

    /**
     * Get active UOM
     */
    const getActiveUOM = computed(() => {
      return uom.value.filter((u) => u.status === "ACTIVE");
    });

    /**
     * Clear all data from the store
     */
    const clearStore = () => {
      selectedCorporationUuid.value = null;
      projects.value = [];
      costCodeDivisions.value = [];
      costCodeConfigurations.value = [];
      itemTypes.value = [];
      uom.value = [];
      error.value = null;
      loading.value = false;
    };

    return {
      // State
      selectedCorporationUuid: readonly(selectedCorporationUuid),
      selectedCorporation: readonly(selectedCorporation),
      loading: readonly(loading),
      error: readonly(error),
      hasData: readonly(hasData),

      // Data
      projects: readonly(projects),
      costCodeDivisions: readonly(costCodeDivisions),
      costCodeConfigurations: readonly(costCodeConfigurations),
      itemTypes: readonly(itemTypes),
      uom: readonly(uom),

      // Computed getters
      getActiveDivisions,
      getActiveConfigurations,
      getActiveUOM,

      // Actions
      setCorporationAndFetchData,
      clearStore,
    };
  }
);

