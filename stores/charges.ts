import { defineStore } from 'pinia'

export interface Charge {
  id: number;
  uuid: string;
  corporation_uuid: string | null;
  charge_name: string;
  charge_type: "FREIGHT" | "PACKING" | "CUSTOM_DUTIES" | "OTHER";
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface CreateChargeData {
  corporation_uuid?: string | null;
  charge_name: string;
  charge_type: "FREIGHT" | "PACKING" | "CUSTOM_DUTIES" | "OTHER";
  status?: "ACTIVE" | "INACTIVE";
}

export interface UpdateChargeData {
  charge_name: string;
  charge_type: "FREIGHT" | "PACKING" | "CUSTOM_DUTIES" | "OTHER";
  status: 'ACTIVE' | 'INACTIVE'
}

export const useChargesStore = defineStore("charges", {
  state: () => ({
    charges: [] as Charge[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    getChargesByCorporation: (state) => (corporationUuid: string) => {
      // Global charges: ignore corporation filter
      return state.charges
    },

    getActiveCharges: (state) => (corporationUuid: string) => {
      // Global charges: return active set
      return state.charges.filter((charge) => charge.status === "ACTIVE")
    },

    getChargesByType: (state) => (chargeType: string) => {
      return state.charges.filter((charge) => charge.charge_type === chargeType)
    },

    getChargeByUuid: (state) => (uuid: string) => {
      return state.charges.find((charge) => charge.uuid === uuid);
    },
  },

  actions: {
    async fetchCharges(_corporationUuid?: string, forceFromAPI: boolean = false) {
      this.loading = true;
      this.error = null;
      try {
        let data: Charge[] = [];

        if (!forceFromAPI) {
          // Try IndexedDB first (global cache)
          const { dbHelpers } = await import("@/utils/indexedDb");
          data = await dbHelpers.getChargesGlobal();
          // If empty, fallback to API
          if (!data || data.length === 0) {
            const { apiFetch } = useApiClient();
            const response = await apiFetch("/api/charges", { method: "GET" });
            data = response?.data || response;
            if (data && Array.isArray(data)) {
              await dbHelpers.saveChargesGlobal(data);
            }
          }
        } else {
          const { apiFetch } = useApiClient();
          const response = await apiFetch("/api/charges", { method: "GET" });
          data = response?.data || response;
          const { dbHelpers } = await import("@/utils/indexedDb");
          if (data && Array.isArray(data)) {
            await dbHelpers.saveChargesGlobal(data);
          }
        }

        // Replace all charges data
        this.charges = data && Array.isArray(data) ? data : [];
      } catch (error: any) {
        console.error("Error fetching charges:", error);
        this.error = error.message || "Failed to fetch charges";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createCharge(_corporationUuid: string | null, chargeData: CreateChargeData) {
      this.loading = true;
      this.error = null;
      try {
        const { apiFetch } = useApiClient();
        const response = await apiFetch("/api/charges", {
          method: "POST",
          body: {
            corporation_uuid: null,
            ...chargeData,
          },
        });

        const data = response?.data || response;
        if (data) {
          this.charges.push(data);
          const { dbHelpers } = await import("@/utils/indexedDb");
          await dbHelpers.addChargeGlobal(data);
        }
        return data;
      } catch (error: any) {
        console.error("Error creating charge:", error);
        this.error = error.message || "Failed to create charge";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateCharge(uuid: string, chargeData: UpdateChargeData) {
      this.loading = true;
      this.error = null;
      try {
        const { apiFetch } = useApiClient();
        const response = await apiFetch(`/api/charges/${uuid}`, {
          method: "PUT",
          body: chargeData,
        });

        const data = response?.data || response;
        if (data) {
          const index = this.charges.findIndex((charge) => charge.uuid === uuid);
          if (index !== -1) {
            this.charges[index] = data;
          }
          const { dbHelpers } = await import("@/utils/indexedDb");
          await dbHelpers.updateChargeGlobal(data);
        }
        return data;
      } catch (error: any) {
        console.error("Error updating charge:", error);
        this.error = error.message || "Failed to update charge";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteCharge(uuid: string) {
      this.loading = true;
      this.error = null;
      try {
        const { apiFetch } = useApiClient();
        const response = await apiFetch(`/api/charges/${uuid}`, {
          method: "DELETE",
        });

        // Remove from local state
        this.charges = this.charges.filter((charge) => charge.uuid !== uuid);
        const { dbHelpers } = await import("@/utils/indexedDb");
        await dbHelpers.deleteChargeGlobal(uuid);
        return response;
      } catch (error: any) {
        console.error("Error deleting charge:", error);
        this.error = error.message || "Failed to delete charge";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearCharges() {
      this.charges = [];
    },
  },
});
