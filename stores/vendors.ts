// stores/vendor.ts
// defineStore is auto-imported by Nuxt
import { ref } from "vue";
import { dbHelpers } from "@/utils/indexedDb";

type Vendor = {
  id: number;
  uuid: string;
  created_at: string;
  corporation_uuid: string;
  vendor_name: string;
  vendor_type: string;
  vendor_address: string;
  vendor_city?: string;
  vendor_state?: string;
  vendor_country?: string;
  vendor_zip?: string;
  vendor_phone: string;
  vendor_email: string;
  is_1099?: boolean;
  vendor_federal_id?: string;
  vendor_ssn?: string;
  company_name?: string;
  check_printed_as?: string;
  doing_business_as?: string;
  salutation?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  opening_balance?: number;
  opening_balance_date?: string;
  is_active: boolean;
  updated_at: string;
};

type CreateVendorPayload = {
  vendor_name: string;
  vendor_type: string;
  vendor_address: string;
  vendor_city?: string;
  vendor_state?: string;
  vendor_country?: string;
  vendor_zip?: string;
  vendor_phone: string;
  vendor_email: string;
  is_1099?: boolean;
  vendor_federal_id?: string;
  vendor_ssn?: string;
  company_name?: string;
  check_printed_as?: string;
  doing_business_as?: string;
  salutation?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  opening_balance?: number;
  opening_balance_date?: string;
  is_active?: boolean;
};

export const useVendorStore = defineStore(
  "vendor",
  () => {
    const vendors = ref<Vendor[]>([]);
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
     * Fetch vendors from IndexedDB for a specific corporation
     */
    const fetchVendorsFromDB = async (corporationUUID: string) => {
      loading.value = true;
      error.value = null;

      try {
        const dbVendors = await dbHelpers.getVendors(corporationUUID);
        vendors.value = (dbVendors as any[]) || [];

        // Update cache info
        lastFetchedCorporation.value = corporationUUID;
        hasDataForCorporation.value.add(corporationUUID);
      } catch (err: any) {
        error.value = err.message || "Failed to fetch vendors from IndexedDB";
        vendors.value = [];
      } finally {
        loading.value = false;
      }
    };

    /**
     * Fetch all vendors for a specific corporation - defaults to IndexedDB
     */
    const fetchVendors = async (
      corporationUUID: string,
      forceRefresh = false,
      useIndexedDB = true
    ) => {
      // By default, fetch from IndexedDB (faster, cached data)
      // Set useIndexedDB=false to force API fetch
      if (useIndexedDB && !forceRefresh) {
        return await fetchVendorsFromDB(corporationUUID);
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
          `/api/purchase-orders/vendors?corporation_uuid=${corporationUUID}`
        );
        if (response?.error) throw new Error(response.error);

        vendors.value = response?.data || [];

        // Update cache info
        lastFetchedCorporation.value = corporationUUID;
        hasDataForCorporation.value.add(corporationUUID);
      } catch (err: any) {
        error.value = err.message || "Failed to fetch vendors";
        vendors.value = [];
        // Clear cache on error to ensure fresh fetch next time
        hasDataForCorporation.value.delete(corporationUUID);
      }
      loading.value = false;
    };

    // Add a new vendor
    const addVendor = async (
      corporationUUID: string,
      vendorData: CreateVendorPayload
    ) => {
      loading.value = true;
      error.value = null;
      try {
        const response = await $fetch("/api/purchase-orders/vendors", {
          method: "POST",
          body: {
            ...vendorData,
            corporation_uuid: corporationUUID,
          },
        });
        if (response?.error) throw new Error(response.error);

        const newVendor = response?.data || response;
        if (newVendor) {
          vendors.value.unshift(newVendor);

          // Sync to IndexedDB to keep it in sync
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            await dbHelpers.addVendor(corporationUUID, newVendor);
          } catch (dbError) {
            console.warn("Failed to sync vendor to IndexedDB:", dbError);
          }

          // Clear cache to ensure fresh data on next fetch
          hasDataForCorporation.value.delete(corporationUUID);
        }

        return response;
      } catch (err: any) {
        error.value = err.message || "Failed to add vendor";
        console.error("Error adding vendor:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // Update an existing vendor
    const updateVendor = async (
      corporationUUID: string,
      vendor: Vendor,
      updatedData: Partial<CreateVendorPayload>
    ) => {
      loading.value = true;
      error.value = null;
      try {
        const response = await $fetch("/api/purchase-orders/vendors", {
          method: "PUT",
          body: {
            ...updatedData,
            uuid: vendor.uuid,
            corporation_uuid: corporationUUID,
          },
        });
        if (response?.error) throw new Error(response.error);

        const updatedVendor = response?.data || response;
        const index = vendors.value.findIndex((v) => v.uuid === vendor.uuid);
        if (index > -1 && updatedVendor) {
          vendors.value[index] = updatedVendor;

          // Sync to IndexedDB to keep it in sync
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            await dbHelpers.updateVendor(corporationUUID, updatedVendor);
          } catch (dbError) {
            console.warn(
              "Failed to sync updated vendor to IndexedDB:",
              dbError
            );
          }

          // Clear cache to ensure fresh data on next fetch
          hasDataForCorporation.value.delete(corporationUUID);
        }

        return response;
      } catch (err: any) {
        error.value = err.message || "Failed to update vendor";
        console.error("Error updating vendor:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // Delete a vendor
    const deleteVendor = async (corporationUUID: string, vendor: Vendor) => {
      loading.value = true;
      error.value = null;
      try {
        const response = await $fetch(
          `/api/purchase-orders/vendors?uuid=${vendor.uuid}`,
          {
            method: "DELETE",
          }
        );
        if (response?.error) throw new Error(response.error);

        // Remove the vendor from local state immediately
        const index = vendors.value.findIndex((v) => v.uuid === vendor.uuid);
        if (index > -1) {
          vendors.value.splice(index, 1);

          // Sync deletion to IndexedDB
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            await dbHelpers.deleteVendor(corporationUUID, vendor.uuid);
          } catch (dbError) {
            console.warn(
              "Failed to sync vendor deletion to IndexedDB:",
              dbError
            );
          }

          // Clear cache to ensure fresh data on next fetch
          hasDataForCorporation.value.delete(corporationUUID);
        }

        return response;
      } catch (err: any) {
        error.value = err.message || "Failed to delete vendor";
        console.error("Error deleting vendor:", err);
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
        vendors.value = [];
        lastFetchedCorporation.value = null;
        hasDataForCorporation.value.clear();
      }
    };

    // Bulk import vendors
    const bulkImportVendors = async (
      corporationUUID: string,
      vendorsData: CreateVendorPayload[]
    ) => {
      loading.value = true;
      error.value = null;

      try {
        const result = await $fetch<{ data: any; message: string }>(
          "/api/purchase-orders/vendors/bulk",
          {
            method: "POST",
            body: {
              corporation_uuid: corporationUUID,
              vendors: vendorsData,
            },
          }
        );

        // Clear cache to ensure fresh data on next fetch
        hasDataForCorporation.value.delete(corporationUUID);

        // Force refresh the vendors list with IndexedDB synchronization
        await fetchVendors(corporationUUID, true, true);

        return result;
      } catch (err: any) {
        error.value = err.message || "Failed to bulk import vendors";
        console.error("Error bulk importing vendors:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // Delete all vendors for a corporation
    const deleteAllVendors = async (corporationUUID: string) => {
      loading.value = true;
      error.value = null;

      try {
        const result = await $fetch(`/api/purchase-orders/vendors/delete-all`, {
          method: "DELETE",
          query: { corporation_uuid: corporationUUID },
        });

        // Clear the vendors for this corporation
        vendors.value = vendors.value.filter(
          (vendor) => vendor.corporation_uuid !== corporationUUID
        );

        // Sync deletion to IndexedDB
        try {
          const { dbHelpers } = await import("@/utils/indexedDb");
          await dbHelpers.deleteAllVendors(corporationUUID);
        } catch (dbError) {
          console.warn(
            "Failed to sync vendors bulk deletion to IndexedDB:",
            dbError
          );
        }

        // Clear cache to ensure fresh data on next fetch
        hasDataForCorporation.value.delete(corporationUUID);

        return result;
      } catch (err: any) {
        error.value = err.message || "Failed to delete all vendors";
        console.error("Error deleting all vendors:", err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // Helper method to force refresh from API (bypassing IndexedDB)
    const refreshVendorsFromAPI = async (corporationUUID: string) => {
      return await fetchVendors(corporationUUID, true, false);
    };

    return {
      vendors,
      loading,
      error,
      fetchVendors,
      fetchVendorsFromDB,
      refreshVendorsFromAPI,
      addVendor,
      updateVendor,
      deleteVendor,
      bulkImportVendors,
      deleteAllVendors,
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
