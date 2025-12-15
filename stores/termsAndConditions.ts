import { defineStore } from "pinia";
import { watch } from "vue";

export interface TermsAndCondition {
  id?: number;
  uuid?: string;
  name: string;
  content: string; // Rich text content (HTML/Markdown)
  isActive: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useTermsAndConditionsStore = defineStore("termsAndConditions", () => {
  // State
  const termsAndConditions = ref<TermsAndCondition[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  // Debug: Watch for changes
  watch(termsAndConditions, (newVal) => {
    console.log('TermsAndConditions store - termsAndConditions changed:', newVal?.length, 'items')
  }, { deep: true })

  // Cache management
  const hasFetchedData = ref(false);

  // Getters
  const getAllTermsAndConditions = computed(() => {
    return termsAndConditions.value;
  });

  const getActiveTermsAndConditions = computed(() => {
    return termsAndConditions.value.filter((tc) => tc.isActive);
  });

  // Actions
  const fetchTermsAndConditions = async (forceRefresh = false) => {
    // Skip fetch if we have valid cached data and not forcing refresh
    if (!forceRefresh && hasFetchedData.value) {
      console.log("TermsAndConditions: Using cached data");
      return;
    }

    console.log("TermsAndConditions: Fetching all terms and conditions, forceRefresh:", forceRefresh);

    // Only fetch on client side to avoid SSR issues
    if (process.server) {
      return;
    }
    loading.value = true;
    error.value = null;

    try {
      // Destructure data directly from response, matching service types pattern
      const { data } = await $fetch<{ success: boolean; data: TermsAndCondition[] }>(`/api/terms-and-conditions`);
      
      console.log("TermsAndConditions: API response data:", data, "length:", data?.length);
      
      termsAndConditions.value = Array.isArray(data) ? data : [];
      hasFetchedData.value = true;
      console.log("TermsAndConditions: Store updated with", termsAndConditions.value.length, "items");
      if (termsAndConditions.value.length > 0) {
        console.log("TermsAndConditions: First item:", termsAndConditions.value[0]);
      }

      // Sync to IndexedDB to keep it in sync with the API
      if (process.client && data && data.length > 0) {
        try {
          const { dbHelpers } = await import("@/utils/indexedDb");
          const { useCorporationStore } = await import("@/stores/corporations");
          const corporationStore = useCorporationStore();
          const corporationId = corporationStore.selectedCorporation?.uuid || '';
          
          if (corporationId) {
            await dbHelpers.saveTermsAndConditions(corporationId, data);
          }
        } catch (dbError) {
          console.warn(
            "Failed to sync terms and conditions to IndexedDB:",
            dbError
          );
        }
      }
    } catch (err: any) {
      error.value = err.message || "Failed to fetch terms and conditions";
      console.error("Error fetching terms and conditions:", err);
      termsAndConditions.value = [];
      hasFetchedData.value = false;
    } finally {
      loading.value = false;
    }
  };

  const createTermsAndCondition = async (
    termsAndConditionData: Omit<TermsAndCondition, "id" | "uuid" | "created_at" | "updated_at">
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await $fetch<{ success: boolean; data: TermsAndCondition }>(
        "/api/terms-and-conditions",
        {
          method: "POST",
          body: termsAndConditionData,
        }
      );

      if (data) {
        termsAndConditions.value.unshift(data);

        // Sync to IndexedDB to keep it in sync
        if (process.client) {
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            const { useCorporationStore } = await import("@/stores/corporations");
            const corporationStore = useCorporationStore();
            const corporationId = corporationStore.selectedCorporation?.uuid || '';
            
            if (corporationId) {
              await dbHelpers.addTermsAndCondition(corporationId, data);
            }
          } catch (dbError) {
            console.warn(
              "Failed to sync created terms and condition to IndexedDB:",
              dbError
            );
          }
        }
      }

      return data;
    } catch (err: any) {
      error.value = err.message || "Failed to create terms and condition";
      console.error("Error creating terms and condition:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateTermsAndCondition = async (
    id: string,
    termsAndConditionData: Partial<TermsAndCondition>
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await $fetch<{ success: boolean; data: TermsAndCondition }>(
        `/api/terms-and-conditions/${id}`,
        {
          method: "PUT",
          body: termsAndConditionData,
        }
      );

      if (data) {
        const index = termsAndConditions.value.findIndex(
          (tc) => tc.id?.toString() === id
        );
        if (index !== -1) {
          termsAndConditions.value[index] = data;
        }

        // Sync to IndexedDB to keep it in sync
        if (process.client) {
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            const { useCorporationStore } = await import("@/stores/corporations");
            const corporationStore = useCorporationStore();
            const corporationId = corporationStore.selectedCorporation?.uuid || '';
            
            if (corporationId) {
              await dbHelpers.updateTermsAndCondition(corporationId, data);
            }
          } catch (dbError) {
            console.warn(
              "Failed to sync updated terms and condition to IndexedDB:",
              dbError
            );
          }
        }
      }

      return data;
    } catch (err: any) {
      error.value = err.message || "Failed to update terms and condition";
      console.error("Error updating terms and condition:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteTermsAndCondition = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      await $fetch(`/api/terms-and-conditions/${id}`, {
        method: "DELETE",
      });

      // Find and remove the terms and condition by id
      const index = termsAndConditions.value.findIndex(
        (tc) => tc.id?.toString() === id
      );
      if (index !== -1) {
        const deletedItem = termsAndConditions.value[index];
        termsAndConditions.value.splice(index, 1);

        // Sync deletion to IndexedDB
        if (process.client && deletedItem?.id) {
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            const { useCorporationStore } = await import("@/stores/corporations");
            const corporationStore = useCorporationStore();
            const corporationId = corporationStore.selectedCorporation?.uuid || '';
            
            if (corporationId) {
              await dbHelpers.deleteTermsAndCondition(corporationId, deletedItem.id);
            }
          } catch (dbError) {
            console.warn(
              "Failed to sync terms and condition deletion to IndexedDB:",
              dbError
            );
          }
        }
      }
    } catch (err: any) {
      error.value = err.message || "Failed to delete terms and condition";
      console.error("Error deleting terms and condition:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  const clearTermsAndConditions = () => {
    termsAndConditions.value = [];
    hasFetchedData.value = false;
  };

  // Helper method to force refresh from API
  const refreshTermsAndConditionsFromAPI = async () => {
    return await fetchTermsAndConditions(true);
  };

  // Additional getters for tests
  const getTermsAndConditionById = computed(() => {
    return (uuid: string) => {
      return termsAndConditions.value.find((tc) => tc.uuid === uuid);
    };
  });

  const getTermsAndConditionCount = computed(() => {
    return termsAndConditions.value.length;
  });

  const getActiveTermsAndConditionCount = computed(() => {
    return termsAndConditions.value.filter((tc) => tc.isActive).length;
  });

  const termsAndConditionExists = computed(() => {
    return (uuid: string) => {
      return termsAndConditions.value.some((tc) => tc.uuid === uuid);
    };
  });

  return {
    // State
    termsAndConditions: readonly(termsAndConditions),
    loading: readonly(loading),
    error: readonly(error),

    // Getters
    getAllTermsAndConditions,
    getActiveTermsAndConditions,
    getTermsAndConditionById,
    getTermsAndConditionCount,
    getActiveTermsAndConditionCount,
    termsAndConditionExists,

    // Actions
    fetchTermsAndConditions,
    createTermsAndCondition,
    updateTermsAndCondition,
    deleteTermsAndCondition,
    clearError,
    clearTermsAndConditions,
    refreshTermsAndConditionsFromAPI,
  };
});

