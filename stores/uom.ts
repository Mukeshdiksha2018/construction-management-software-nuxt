import { defineStore } from 'pinia'

export interface UOM {
  id: number;
  uuid: string;
  corporation_uuid: string | null;
  uom_name: string;
  short_name: string;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface CreateUOMData {
  corporation_uuid?: string | null;
  uom_name: string;
  short_name: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface UpdateUOMData {
  uom_name: string
  short_name: string
  status: 'ACTIVE' | 'INACTIVE'
}

export const useUOMStore = defineStore("uom", {
  state: () => ({
    uom: [] as UOM[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    getUOMByCorporation: (state) => (corporationUuid: string) => {
      // Global UOM: ignore corporation filter
      return state.uom
    },

    getActiveUOM: (state) => (corporationUuid: string) => {
      // Global UOM: return active set
      return state.uom.filter((uom) => uom.status === "ACTIVE")
    },

    getUOMByUuid: (state) => (uuid: string) => {
      return state.uom.find((uom) => uom.uuid === uuid);
    },
  },

  actions: {
    async fetchUOM(_corporationUuid?: string, forceFromAPI: boolean = false) {
      this.loading = true;
      this.error = null;
      try {
        let data: UOM[] = [];

        if (!forceFromAPI) {
          // Try IndexedDB first (global cache)
          const { dbHelpers } = await import("@/utils/indexedDb");
          data = await dbHelpers.getUOMGlobal();
          // If empty, fallback to API
          if (!data || data.length === 0) {
            const response = await $fetch("/api/uom", { method: "GET" });
            data = response?.data || response;
            if (data && Array.isArray(data)) {
              await dbHelpers.saveUOMGlobal(data);
            }
          }
        } else {
          const response = await $fetch("/api/uom", { method: "GET" });
          data = response?.data || response;
          const { dbHelpers } = await import("@/utils/indexedDb");
          if (data && Array.isArray(data)) {
            await dbHelpers.saveUOMGlobal(data);
          }
        }

        // Replace all UOM data
        this.uom = data && Array.isArray(data) ? data : [];
      } catch (error: any) {
        console.error("Error fetching UOM:", error);
        this.error = error.message || "Failed to fetch UOM";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createUOM(_corporationUuid: string | null, uomData: CreateUOMData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await $fetch("/api/uom", {
          method: "POST",
          body: {
            corporation_uuid: null,
            ...uomData,
          },
        });

        const data = response?.data || response;
        if (data) {
          this.uom.push(data);
          const { dbHelpers } = await import("@/utils/indexedDb");
          await dbHelpers.addUOMGlobal(data);
        }
        return data;
      } catch (error: any) {
        console.error("Error creating UOM:", error);
        this.error = error.message || "Failed to create UOM";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateUOM(uuid: string, uomData: UpdateUOMData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await $fetch(`/api/uom/${uuid}`, {
          method: "PUT",
          body: uomData,
        });

        const data = response?.data || response;
        if (data) {
          const index = this.uom.findIndex((uom) => uom.uuid === uuid);
          if (index !== -1) {
            this.uom[index] = data;
          }
          const { dbHelpers } = await import("@/utils/indexedDb");
          await dbHelpers.updateUOMGlobal(data);
        }
        return data;
      } catch (error: any) {
        console.error("Error updating UOM:", error);
        this.error = error.message || "Failed to update UOM";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteUOM(uuid: string) {
      this.loading = true;
      this.error = null;
      try {
        const response = await $fetch(`/api/uom/${uuid}`, {
          method: "DELETE",
        });

        // Remove from local state
        this.uom = this.uom.filter((uom) => uom.uuid !== uuid);
        const { dbHelpers } = await import("@/utils/indexedDb");
        await dbHelpers.deleteUOMGlobal(uuid);
        return response;
      } catch (error: any) {
        console.error("Error deleting UOM:", error);
        this.error = error.message || "Failed to delete UOM";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearUOM() {
      this.uom = [];
    },
  },
});
