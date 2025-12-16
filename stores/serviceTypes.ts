import { defineStore } from "pinia";
import { ref, computed, readonly } from "vue";

export interface ServiceType {
  id?: number;
  uuid?: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useServiceTypesStore = defineStore("serviceTypes", () => {
  // State
  const serviceTypes = ref<ServiceType[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Cache management
  const hasFetchedData = ref(false);

  // Getters
  const getAllServiceTypes = computed(() => {
    return serviceTypes.value;
  });

  const getActiveServiceTypes = computed(() => {
    return serviceTypes.value.filter((st) => st.isActive);
  });

  // Actions
  const fetchServiceTypes = async (forceRefresh = false) => {
    // Skip fetch if we have valid cached data and not forcing refresh
    if (!forceRefresh && hasFetchedData.value) {
      console.log("ServiceTypes: Using cached data");
      return;
    }

    console.log("ServiceTypes: Fetching all service types, forceRefresh:", forceRefresh);

    // Only fetch on client side to avoid SSR issues
    if (process.server) {
      return;
    }
    loading.value = true;
    error.value = null;

    try {
      const { data } = await $fetch<{ data: ServiceType[] }>(`/api/service-types`);

      serviceTypes.value = data || [];
      hasFetchedData.value = true;
    } catch (err: any) {
      error.value = err.message || "Failed to fetch service types";
      console.error("Error fetching service types:", err);
      serviceTypes.value = [];
      hasFetchedData.value = false;
    } finally {
      loading.value = false;
    }
  };

  const createServiceType = async (
    serviceTypeData: Omit<ServiceType, "id" | "uuid" | "created_at" | "updated_at">
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await $fetch<{ data: ServiceType }>(
        "/api/service-types",
        {
          method: "POST",
          body: serviceTypeData,
        }
      );

      if (data) {
        serviceTypes.value.unshift(data);
      }

      return data;
    } catch (err: any) {
      error.value = err.message || "Failed to create service type";
      console.error("Error creating service type:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateServiceType = async (
    id: string,
    serviceTypeData: Partial<ServiceType>
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await $fetch<{ data: ServiceType }>(
        `/api/service-types/${id}`,
        {
          method: "PUT",
          body: serviceTypeData,
        }
      );

      if (data) {
        const index = serviceTypes.value.findIndex(
          (st) => st.id?.toString() === id
        );
        if (index !== -1) {
          serviceTypes.value[index] = data;
        }
      }

      return data;
    } catch (err: any) {
      error.value = err.message || "Failed to update service type";
      console.error("Error updating service type:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteServiceType = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      const { apiFetch } = useApiClient();
      await apiFetch(`/api/service-types/${id}`, {
        method: "DELETE",
      });

      // Find and remove the service type by id
      const index = serviceTypes.value.findIndex(
        (st) => st.id?.toString() === id
      );
      if (index !== -1) {
        serviceTypes.value.splice(index, 1);
      }
    } catch (err: any) {
      error.value = err.message || "Failed to delete service type";
      console.error("Error deleting service type:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  const clearServiceTypes = () => {
    serviceTypes.value = [];
    hasFetchedData.value = false;
  };

  // Helper method to force refresh from API
  const refreshServiceTypesFromAPI = async () => {
    return await fetchServiceTypes(true);
  };

  // Additional getters for tests
  const getServiceTypeById = computed(() => {
    return (uuid: string) => {
      return serviceTypes.value.find((st) => st.uuid === uuid);
    };
  });

  const getServiceTypeCount = computed(() => {
    return serviceTypes.value.length;
  });

  const getActiveServiceTypeCount = computed(() => {
    return serviceTypes.value.filter((st) => st.isActive).length;
  });

  const serviceTypeExists = computed(() => {
    return (uuid: string) => {
      return serviceTypes.value.some((st) => st.uuid === uuid);
    };
  });

  return {
    // State
    serviceTypes: readonly(serviceTypes),
    loading: readonly(loading),
    error: readonly(error),

    // Getters
    getAllServiceTypes,
    getActiveServiceTypes,
    getServiceTypeById,
    getServiceTypeCount,
    getActiveServiceTypeCount,
    serviceTypeExists,

    // Actions
    fetchServiceTypes,
    createServiceType,
    updateServiceType,
    deleteServiceType,
    clearError,
    clearServiceTypes,
    refreshServiceTypesFromAPI,
  };
});
