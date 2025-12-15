import { defineStore } from 'pinia'

export interface SalesTax {
  id: number;
  uuid: string;
  corporation_uuid: string | null;
  tax_name: string;
  tax_percentage: number;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface CreateSalesTaxData {
  corporation_uuid?: string | null;
  tax_name: string;
  tax_percentage: number;
  status?: "ACTIVE" | "INACTIVE";
}

export interface UpdateSalesTaxData {
  tax_name: string;
  tax_percentage: number;
  status: 'ACTIVE' | 'INACTIVE'
}

export const useSalesTaxStore = defineStore("salesTax", {
  state: () => ({
    salesTax: [] as SalesTax[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    getSalesTaxByCorporation: (state) => (corporationUuid: string) => {
      // Global sales tax: ignore corporation filter
      return state.salesTax
    },

    getActiveSalesTax: (state) => (corporationUuid: string) => {
      // Global sales tax: return active set
      return state.salesTax.filter((tax) => tax.status === "ACTIVE")
    },

    getSalesTaxByUuid: (state) => (uuid: string) => {
      return state.salesTax.find((tax) => tax.uuid === uuid);
    },
  },

  actions: {
    async fetchSalesTax(_corporationUuid?: string, forceFromAPI: boolean = false) {
      this.loading = true;
      this.error = null;
      try {
        let data: SalesTax[] = [];

        if (!forceFromAPI) {
          // Try IndexedDB first (global cache)
          const { dbHelpers } = await import("@/utils/indexedDb");
          data = await dbHelpers.getSalesTaxGlobal();
          // If empty, fallback to API
          if (!data || data.length === 0) {
            const response = await $fetch("/api/sales-tax", { method: "GET" });
            data = response?.data || response;
            if (data && Array.isArray(data)) {
              await dbHelpers.saveSalesTaxGlobal(data);
            }
          }
        } else {
          const response = await $fetch("/api/sales-tax", { method: "GET" });
          data = response?.data || response;
          const { dbHelpers } = await import("@/utils/indexedDb");
          if (data && Array.isArray(data)) {
            await dbHelpers.saveSalesTaxGlobal(data);
          }
        }

        // Replace all sales tax data
        this.salesTax = data && Array.isArray(data) ? data : [];
      } catch (error: any) {
        console.error("Error fetching sales tax:", error);
        this.error = error.message || "Failed to fetch sales tax";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createSalesTax(_corporationUuid: string | null, salesTaxData: CreateSalesTaxData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await $fetch("/api/sales-tax", {
          method: "POST",
          body: {
            corporation_uuid: null,
            ...salesTaxData,
          },
        });

        const data = response?.data || response;
        if (data) {
          this.salesTax.push(data);
          const { dbHelpers } = await import("@/utils/indexedDb");
          await dbHelpers.addSalesTaxGlobal(data);
        }
        return data;
      } catch (error: any) {
        console.error("Error creating sales tax:", error);
        this.error = error.message || "Failed to create sales tax";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateSalesTax(uuid: string, salesTaxData: UpdateSalesTaxData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await $fetch(`/api/sales-tax/${uuid}`, {
          method: "PUT",
          body: salesTaxData,
        });

        const data = response?.data || response;
        if (data) {
          const index = this.salesTax.findIndex((tax) => tax.uuid === uuid);
          if (index !== -1) {
            this.salesTax[index] = data;
          }
          const { dbHelpers } = await import("@/utils/indexedDb");
          await dbHelpers.updateSalesTaxGlobal(data);
        }
        return data;
      } catch (error: any) {
        console.error("Error updating sales tax:", error);
        this.error = error.message || "Failed to update sales tax";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteSalesTax(uuid: string) {
      this.loading = true;
      this.error = null;
      try {
        const response = await $fetch(`/api/sales-tax/${uuid}`, {
          method: "DELETE",
        });

        // Remove from local state
        this.salesTax = this.salesTax.filter((tax) => tax.uuid !== uuid);
        const { dbHelpers } = await import("@/utils/indexedDb");
        await dbHelpers.deleteSalesTaxGlobal(uuid);
        return response;
      } catch (error: any) {
        console.error("Error deleting sales tax:", error);
        this.error = error.message || "Failed to delete sales tax";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearSalesTax() {
      this.salesTax = [];
    },
  },
});
