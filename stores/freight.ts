import { defineStore } from 'pinia'

export interface ShipVia {
  id: number;
  uuid: string;
  ship_via: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface CreateShipViaData {
  ship_via: string;
  description?: string | null;
  active?: boolean;
}

export interface UpdateShipViaData {
  ship_via: string;
  description?: string | null;
  active: boolean;
}

export const useShipViaStore = defineStore("shipVia", {
  state: () => ({
    shipVia: [] as ShipVia[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    getAllShipVia: (state) => {
      return state.shipVia;
    },

    getActiveShipVia: (state) => {
      return state.shipVia.filter((f) => f.active === true);
    },

    getShipViaByUuid: (state) => (uuid: string) => {
      return state.shipVia.find((f) => f.uuid === uuid);
    },
  },

  actions: {
    async fetchShipVia(forceFromAPI: boolean = false) {
      this.loading = true;
      this.error = null;
      try {
        let data: ShipVia[] = [];

        if (!forceFromAPI) {
          // Try IndexedDB first (global cache)
          const { dbHelpers } = await import("@/utils/indexedDb");
          data = await dbHelpers.getShipVia();
          // If empty, fallback to API
          if (!data || data.length === 0) {
            const response = await $fetch("/api/ship-via", { method: "GET" });
            data = response?.data || response;
            if (data && Array.isArray(data)) {
              await dbHelpers.saveShipVia(data);
            }
          }
        } else {
          const response = await $fetch("/api/ship-via", { method: "GET" });
          data = response?.data || response;
          const { dbHelpers } = await import("@/utils/indexedDb");
          if (data && Array.isArray(data)) {
            await dbHelpers.saveShipVia(data);
          }
        }

        // Replace all shipVia data
        this.shipVia = data && Array.isArray(data) ? data : [];
      } catch (error: any) {
        console.error("Error fetching shipVia:", error);
        this.error = error.message || "Failed to fetch shipVia";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createShipVia(shipViaData: CreateShipViaData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await $fetch("/api/ship-via", {
          method: "POST",
          body: shipViaData,
        });

        const data = response?.data || response;
        if (data) {
          this.shipVia.push(data);
          const { dbHelpers } = await import("@/utils/indexedDb");
          await dbHelpers.addShipVia(data);
        }
        return data;
      } catch (error: any) {
        console.error("Error creating shipVia:", error);
        this.error = error.message || "Failed to create shipVia";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateShipVia(uuid: string, shipViaData: UpdateShipViaData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await $fetch(`/api/ship-via/${uuid}`, {
          method: "PUT",
          body: shipViaData,
        });

        const data = response?.data || response;
        if (data) {
          const index = this.shipVia.findIndex((f) => f.uuid === uuid);
          if (index !== -1) {
            this.shipVia[index] = data;
          }
          const { dbHelpers } = await import("@/utils/indexedDb");
          await dbHelpers.updateShipVia(data);
        }
        return data;
      } catch (error: any) {
        console.error("Error updating shipVia:", error);
        this.error = error.message || "Failed to update shipVia";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteShipVia(uuid: string) {
      this.loading = true;
      this.error = null;
      try {
        const response = await $fetch(`/api/ship-via/${uuid}`, {
          method: "DELETE",
        });

        // Remove from local state
        this.shipVia = this.shipVia.filter((f) => f.uuid !== uuid);
        const { dbHelpers } = await import("@/utils/indexedDb");
        await dbHelpers.deleteShipVia(uuid);
        return response;
      } catch (error: any) {
        console.error("Error deleting shipVia:", error);
        this.error = error.message || "Failed to delete shipVia";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearShipVia() {
      this.shipVia = [];
    },
  },
});

