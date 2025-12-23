// stores/customers.ts
// defineStore is auto-imported by Nuxt
import { ref } from "vue";

type Customer = {
  id: number;
  uuid: string;
  created_at: string;
  corporation_uuid: string;
  project_uuid?: string | null;
  customer_address: string;
  customer_city?: string;
  customer_state?: string;
  customer_country?: string;
  customer_zip?: string;
  customer_phone: string;
  customer_email: string;
  company_name?: string;
  salutation?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  profile_image_url?: string;
  is_active: boolean;
  updated_at: string;
};

type CreateCustomerPayload = {
  corporation_uuid: string;
  project_uuid?: string | null;
  customer_address?: string;
  customer_city?: string;
  customer_state?: string;
  customer_country?: string;
  customer_zip?: string;
  customer_phone?: string;
  customer_email?: string;
  company_name?: string;
  salutation?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  profile_image_url?: string;
  is_active?: boolean;
};

export const useCustomerStore = defineStore(
  "customer",
  () => {
    const customers = ref<Customer[]>([]);
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
     * Fetch all customers for a specific corporation
     */
    const fetchCustomers = async (
      corporationUUID: string,
      projectUUID?: string | null,
      forceRefresh = false
    ) => {
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
        const { apiFetch } = useApiClient();
        let url = `/api/customers?corporation_uuid=${corporationUUID}`;
        if (projectUUID) {
          url += `&project_uuid=${projectUUID}`;
        }
        const response = await apiFetch(url);
        if (response?.error) throw new Error(response.error);

        customers.value = response?.data || [];

        // Update cache info
        lastFetchedCorporation.value = corporationUUID;
        hasDataForCorporation.value.add(corporationUUID);
      } catch (err: any) {
        error.value = err.message || "Failed to fetch customers";
        customers.value = [];
        // Clear cache on error to ensure fresh fetch next time
        hasDataForCorporation.value.delete(corporationUUID);
      }
      loading.value = false;
    };

    // Add a new customer
    const addCustomer = async (
      corporationUUID: string,
      customerData: CreateCustomerPayload
    ) => {
      loading.value = true;
      error.value = null;
      try {
        const { apiFetch } = useApiClient();
        const response = await apiFetch("/api/customers", {
          method: "POST",
          body: {
            ...customerData,
            corporation_uuid: corporationUUID,
          },
        });
        if (response?.error) throw new Error(response.error);

        const newCustomer = response?.data || response;
        if (newCustomer) {
          customers.value.unshift(newCustomer);

          // Clear cache to ensure fresh data on next fetch
          hasDataForCorporation.value.delete(corporationUUID);
        }

        return response;
      } catch (err: any) {
        error.value = err.message || "Failed to add customer";
        console.error("Error adding customer:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // Update an existing customer
    const updateCustomer = async (
      corporationUUID: string,
      customer: Customer,
      updatedData: Partial<CreateCustomerPayload>
    ) => {
      loading.value = true;
      error.value = null;
      try {
        const { apiFetch } = useApiClient();
        const response = await apiFetch("/api/customers", {
          method: "PUT",
          body: {
            ...updatedData,
            uuid: customer.uuid,
            corporation_uuid: corporationUUID,
          },
        });
        if (response?.error) throw new Error(response.error);

        const updatedCustomer = response?.data || response;
        const index = customers.value.findIndex((c) => c.uuid === customer.uuid);
        if (index > -1 && updatedCustomer) {
          customers.value[index] = updatedCustomer;

          // Clear cache to ensure fresh data on next fetch
          hasDataForCorporation.value.delete(corporationUUID);
        }

        return response;
      } catch (err: any) {
        error.value = err.message || "Failed to update customer";
        console.error("Error updating customer:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // Delete a customer
    const deleteCustomer = async (corporationUUID: string, customer: Customer) => {
      loading.value = true;
      error.value = null;
      try {
        const { apiFetch } = useApiClient();
        const response = await apiFetch(
          `/api/customers?uuid=${customer.uuid}`,
          {
            method: "DELETE",
          }
        );
        if (response?.error) throw new Error(response.error);

        // Remove the customer from local state immediately
        const index = customers.value.findIndex((c) => c.uuid === customer.uuid);
        if (index > -1) {
          customers.value.splice(index, 1);

          // Clear cache to ensure fresh data on next fetch
          hasDataForCorporation.value.delete(corporationUUID);
        }

        return response;
      } catch (err: any) {
        error.value = err.message || "Failed to delete customer";
        console.error("Error deleting customer:", err);
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
        customers.value = [];
        lastFetchedCorporation.value = null;
        hasDataForCorporation.value.clear();
      }
    };

    // Helper method to force refresh from API
    const refreshCustomersFromAPI = async (
      corporationUUID: string,
      projectUUID?: string | null
    ) => {
      return await fetchCustomers(corporationUUID, projectUUID, true);
    };

    return {
      customers,
      loading,
      error,
      fetchCustomers,
      refreshCustomersFromAPI,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      clearCache,
    };
  },
  {
    persist: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      paths: ["lastFetchedCorporation", "hasDataForCorporation"],
    },
  }
);

