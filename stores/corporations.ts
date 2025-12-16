// defineStore is auto-imported by Nuxt

export const useCorporationStore = defineStore(
  "corporation",
  () => {
    const corporations = ref<any[]>([]);
    const loading = ref(false);
    const errorMessage = ref("");

    const selectedCorporationId = ref<string | null>(null);

    const selectedCorporation = computed(() =>
      corporations.value.find(
        (corp) => corp.uuid === selectedCorporationId.value
      )
    );

    const setSelectedCorporation = (id: string | null) => {
      selectedCorporationId.value = id;
    };

    // Method to set corporation and trigger data fetching
    const setSelectedCorporationAndFetchData = async (
      id: string | null,
      dateRange?: { start_date: string; end_date: string }
    ) => {
      setSelectedCorporation(id);

      if (id) {
        try {
          // Import stores dynamically to avoid circular dependencies
          const { useChartOfAccountsStore } = await import(
            "@/stores/chartOfAccounts"
          );
          const { useVendorStore } = await import("@/stores/vendors");
          const { useBillEntriesStore } = await import("@/stores/billEntries");
          const { useProjectTypesStore } = await import(
            "@/stores/projectTypes"
          );
          const { useServiceTypesStore } = await import(
            "@/stores/serviceTypes"
          );
          const { usePOInstructionsStore } = await import(
            "@/stores/poInstructions"
          );
          const { useUOMStore } = await import("@/stores/uom");
          const { useProjectsStore } = await import("@/stores/projects");
          const { useEstimatesStore } = await import("@/stores/estimates");
          const { useStorageLocationsStore } = await import(
            "@/stores/storageLocations"
          );
          const { useItemTypesStore } = await import("@/stores/itemTypes");
          const { useCostCodeDivisionsStore } = await import(
            "@/stores/costCodeDivisions"
          );
          const { useCostCodeConfigurationsStore } = await import(
            "@/stores/costCodeConfigurations"
          );
          const { useDateRangeStore } = await import("@/stores/dateRange");
          const { useIndexedDB } = await import("@/composables/useIndexedDB");

          const chartOfAccountsStore = useChartOfAccountsStore();
          const vendorStore = useVendorStore();
          const billEntriesStore = useBillEntriesStore();
          const projectTypesStore = useProjectTypesStore();
          const serviceTypesStore = useServiceTypesStore();
          const poInstructionsStore = usePOInstructionsStore();
          const uomStore = useUOMStore();
          const projectsStore = useProjectsStore();
          const estimatesStore = useEstimatesStore();
          const storageLocationsStore = useStorageLocationsStore();
          const itemTypesStore = useItemTypesStore();
          const costCodeDivisionsStore = useCostCodeDivisionsStore();
          const costCodeConfigurationsStore = useCostCodeConfigurationsStore();
          const dateRangeStore = useDateRangeStore();
          const { syncCorporationData } = useIndexedDB();

          // Use provided date range or get from store
          const dateParams = dateRange || dateRangeStore.dateRangeParams;

          // First, sync data to IndexedDB to ensure fresh data is available
          await syncCorporationData(id, dateParams);

          // Fetch data:
          // - Chart of Accounts and Account Mappings from API (as before)
          // - Project Types and Service Types are global (not corporation-specific)
          // - Bill Entries, Vendors, PO Instructions, UOM, Projects, Storage Locations, and Cost Codes from IndexedDB (default behavior)
          await Promise.all([
            // Phase 1: Base data (no dependencies)
            projectTypesStore.fetchProjectTypes(),
            serviceTypesStore.fetchServiceTypes(),
            costCodeDivisionsStore.fetchDivisions(id),
            chartOfAccountsStore.fetchAccounts(id),
            vendorStore.fetchVendors(id),
            storageLocationsStore.fetchStorageLocations(id),
            poInstructionsStore.fetchPOInstructions(id),
            uomStore.fetchUOM(id),
            billEntriesStore.fetchBillEntries(id, dateParams),
          ]);

          // Phase 2: Projects (depends on project_types, service_types)
          await projectsStore.fetchProjects(id);

          // Phase 2.5: Estimates (do not depend on date range; load from IndexedDB)
          await estimatesStore.fetchEstimates(id);

            // Phase 3: Item Types (depends on projects)
            await itemTypesStore.fetchItemTypes(id);

            // Phase 4: Cost Code Configurations (depends on cost_code_divisions, chart_of_accounts, vendors)
            await costCodeConfigurationsStore.fetchConfigurations(id);
        } catch (error) {
          // Error fetching corporation data
        }
      }
    };

    // Initialize the store with a selected corporation (useful for restoring from user preferences)
    const initializeWithCorporation = async (corporationId: string | null) => {
      if (corporationId && corporations.value.length === 0) {
        // If we don't have corporations yet, fetch them first
        await fetchCorporations();
      }
      setSelectedCorporation(corporationId);
    };

    // Check if the store is ready (has corporations and optionally a selected one)
    const isReady = computed(() => corporations.value.length > 0);

    // Check if we have a valid selected corporation
    const hasSelectedCorporation = computed(
      () => selectedCorporationId.value && selectedCorporation.value
    );

    // Method to ensure the store is ready and has the latest data
    const ensureReady = async () => {
      if (corporations.value.length === 0) {
        await fetchCorporations();
      }
      return isReady.value;
    };

    const fetchCorporations = async () => {
      loading.value = true;
      errorMessage.value = "";
      try {
        const { apiFetch } = useApiClient();
        const data = await apiFetch("/api/corporations");
        if (data && typeof data === "object" && "error" in data && data.error) {
          throw new Error(data.error as string);
        }
        if (data && typeof data === "object" && "data" in data) {
          corporations.value = (data.data as any[]) || [];
        } else {
          corporations.value = [];
        }
      } catch (err: any) {
        errorMessage.value = err.message || "Failed to fetch";
      } finally {
        loading.value = false;
      }
    };

    const addCorporation = async (corp: any) => {
      loading.value = true;
      errorMessage.value = "";
      try {
        const { data } = await useFetch("/api/corporations", {
          method: "POST",
          body: corp,
          server: false, // Force client-side only
        });
        if (
          data.value &&
          typeof data.value === "object" &&
          "error" in data.value &&
          data.value.error
        ) {
          throw new Error(data.value.error as string);
        }

        // Add the new corporation to the store instead of refetching all
        if (data.value?.data) {
          corporations.value.unshift(data.value.data);

          // Sync to IndexedDB to keep it in sync
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            await dbHelpers.addCorporation(data.value.data);
          } catch (dbError) {
            console.warn("Failed to sync corporation to IndexedDB:", dbError);
          }
        }

        return data.value;
      } catch (err: any) {
        errorMessage.value = err.message || "Failed to add";
        console.error("Error adding corporation:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    const getCorporationByUuid = async (uuid: string) => {
      try {
        const { data } = await useFetch(`/api/corporations?uuid=${uuid}`, {
          server: false, // Force client-side only
        });
        if (data.value?.error) throw new Error(data.value.error);
        return data.value?.data;
      } catch (err: any) {
        errorMessage.value = err.message || "Failed to fetch";
        throw err;
      }
    };

    const updateCorporation = async (uuid: string, corp: any) => {
      loading.value = true;
      errorMessage.value = "";
      try {
        const { data } = await useFetch("/api/corporations", {
          method: "PUT",
          body: { uuid, ...corp },
          server: false, // Force client-side only
        });
        if (data.value?.error) throw new Error(data.value.error);

        // Update the specific corporation in the store instead of refetching all
        const corpIndex = corporations.value.findIndex((c) => c.uuid === uuid);
        if (corpIndex !== -1 && data.value?.data) {
          // Use splice to ensure reactivity - replace with the fresh data from API
          corporations.value.splice(corpIndex, 1, data.value.data);

          // Sync to IndexedDB to keep it in sync
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            await dbHelpers.updateCorporation(data.value.data);
          } catch (dbError) {
            console.warn(
              "Failed to sync updated corporation to IndexedDB:",
              dbError
            );
          }
        }

        return data.value;
      } catch (err: any) {
        errorMessage.value = err.message || "Failed to update";
        console.error("Error updating corporation:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    const deleteCorporation = async (uuid: string) => {
      loading.value = true;
      errorMessage.value = "";
      try {
        const { data } = await useFetch(`/api/corporations?uuid=${uuid}`, {
          method: "DELETE",
          server: false, // Force client-side only
        });
        if (data.value?.error) throw new Error(data.value.error);

        // Remove the specific corporation from the store instead of refetching all
        const corpIndex = corporations.value.findIndex((c) => c.uuid === uuid);
        if (corpIndex !== -1) {
          corporations.value.splice(corpIndex, 1);

          // Sync deletion to IndexedDB
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            await dbHelpers.deleteCorporation(uuid);
          } catch (dbError) {
            console.warn(
              "Failed to sync corporation deletion to IndexedDB:",
              dbError
            );
          }
        }

        return data.value;
      } catch (err: any) {
        errorMessage.value = err.message || "Failed to delete";
        console.error("Error deleting corporation:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // Bulk import corporations
    const bulkImportCorporations = async (corporationsData: any[]) => {
      loading.value = true;
      errorMessage.value = "";

      try {
        const result = await $fetch<{ data: any; message: string }>(
          "/api/corporations/bulk",
          {
            method: "POST",
            body: {
              corporations: corporationsData,
            },
          }
        );

        // Force refresh the corporations list with IndexedDB synchronization
        await fetchCorporations();

        return result;
      } catch (err: any) {
        errorMessage.value =
          err.message || "Failed to bulk import corporations";
        console.error("Error bulk importing corporations:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // Delete all corporations
    const deleteAllCorporations = async () => {
      loading.value = true;
      errorMessage.value = "";

      try {
        const { apiFetch } = useApiClient();
        const result = await apiFetch(`/api/corporations/delete-all`, {
          method: "DELETE",
        });

        // Clear all corporations from store
        corporations.value = [];

        // Sync deletion to IndexedDB
        try {
          const { dbHelpers } = await import("@/utils/indexedDb");
          await dbHelpers.deleteAllCorporations();
        } catch (dbError) {
          console.warn(
            "Failed to sync corporations bulk deletion to IndexedDB:",
            dbError
          );
        }

        return result;
      } catch (err: any) {
        errorMessage.value = err.message || "Failed to delete all corporations";
        console.error("Error deleting all corporations:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // Fetch corporations from IndexedDB
    const fetchCorporationsFromDB = async () => {
      loading.value = true;
      errorMessage.value = "";

      try {
        const { dbHelpers } = await import("@/utils/indexedDb");
        const dbCorporations = await dbHelpers.getCorporations();
        corporations.value = (dbCorporations as any[]) || [];
      } catch (err: any) {
        errorMessage.value =
          err.message || "Failed to fetch corporations from IndexedDB";
        corporations.value = [];
      } finally {
        loading.value = false;
      }
    };

    // Helper method to force refresh from API (bypassing IndexedDB)
    const refreshCorporationsFromAPI = async () => {
      return await fetchCorporations();
    };

    return {
      corporations,
      loading,
      errorMessage,
      selectedCorporationId,
      selectedCorporation,
      setSelectedCorporation,
      setSelectedCorporationAndFetchData,
      initializeWithCorporation,
      isReady,
      hasSelectedCorporation,
      ensureReady,
      fetchCorporations,
      fetchCorporationsFromDB,
      refreshCorporationsFromAPI,
      addCorporation,
      getCorporationByUuid,
      updateCorporation,
      deleteCorporation,
      bulkImportCorporations,
      deleteAllCorporations,
    };
  },
  {
    persist: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      paths: ["corporations", "selectedCorporationId"],
    },
  }
);
