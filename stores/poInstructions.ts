import { defineStore } from 'pinia'

export interface POInstruction {
  id: number;
  uuid: string;
  corporation_uuid: string;
  po_instruction_name: string;
  instruction: string;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreatePOInstructionData {
  corporation_uuid: string;
  po_instruction_name: string;
  instruction: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface UpdatePOInstructionData {
  po_instruction_name: string;
  instruction: string;
  status: "ACTIVE" | "INACTIVE";
}

export const usePOInstructionsStore = defineStore("poInstructions", {
  state: () => ({
    poInstructions: [] as POInstruction[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    getPOInstructionsByCorporation: (state) => (corporationUuid: string) => {
      return state.poInstructions.filter(
        (po) => po.corporation_uuid === corporationUuid
      );
    },

    getActivePOInstructions: (state) => (corporationUuid: string) => {
      return state.poInstructions.filter(
        (po) =>
          po.corporation_uuid === corporationUuid && po.status === "ACTIVE"
      );
    },

    getPOInstructionByUuid: (state) => (uuid: string) => {
      return state.poInstructions.find((po) => po.uuid === uuid);
    },
  },

  actions: {
    async fetchPOInstructions(
      corporationUuid: string,
      forceFromAPI: boolean = false
    ) {
      this.loading = true;
      this.error = null;

      try {
        let data: POInstruction[] = [];

        if (forceFromAPI) {
          // Fetch from API directly
          const { apiFetch } = useApiClient();
          const response = await apiFetch("/api/po-instructions", {
            method: "GET",
            query: {
              corporation_uuid: corporationUuid,
            },
          });

          if (response?.error) {
            throw new Error(response.error);
          }

          data = response?.data || response;
        } else {
          // Fetch from IndexedDB by default
          const { dbHelpers } = await import("@/utils/indexedDb");
          data = await dbHelpers.getPOInstructions(corporationUuid);
        }

        // Remove existing PO instructions for this corporation
        this.poInstructions = this.poInstructions.filter(
          (po) => po.corporation_uuid !== corporationUuid
        );

        // Add new PO instructions
        if (data && Array.isArray(data)) {
          this.poInstructions.push(...data);
        }
      } catch (error: any) {
        console.error("Error fetching PO instructions:", error);
        this.error = error.message || "Failed to fetch PO instructions";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createPOInstruction(
      corporationUuid: string,
      poInstructionData: CreatePOInstructionData
    ) {
      this.loading = true;
      this.error = null;

      try {
        const { apiFetch } = useApiClient();
        const response = await apiFetch("/api/po-instructions", {
          method: "POST",
          body: {
            corporation_uuid: corporationUuid,
            ...poInstructionData,
          },
        });

        if (response?.error) {
          throw new Error(response.error);
        }

        const data = response?.data || response;
        if (data) {
          this.poInstructions.push(data);
        }

        return data;
      } catch (error: any) {
        console.error("Error creating PO instruction:", error);
        this.error = error.message || "Failed to create PO instruction";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updatePOInstruction(
      uuid: string,
      poInstructionData: UpdatePOInstructionData
    ) {
      this.loading = true;
      this.error = null;

      try {
        const { apiFetch } = useApiClient();
        const response = await apiFetch(`/api/po-instructions/${uuid}`, {
          method: "PUT",
          body: {
            ...poInstructionData,
          },
        });

        if (response?.error) {
          throw new Error(response.error);
        }

        const data = response?.data || response;
        if (data) {
          const index = this.poInstructions.findIndex((po) => po.uuid === uuid);
          if (index !== -1) {
            this.poInstructions[index] = data;
          }
        }

        return data;
      } catch (error: any) {
        console.error("Error updating PO instruction:", error);
        this.error = error.message || "Failed to update PO instruction";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deletePOInstruction(uuid: string) {
      this.loading = true;
      this.error = null;

      try {
        const { apiFetch } = useApiClient();
        const response = await apiFetch(`/api/po-instructions/${uuid}`, {
          method: "DELETE",
        });

        if (response?.error) {
          throw new Error(response.error);
        }

        // Remove from local state
        this.poInstructions = this.poInstructions.filter(
          (po) => po.uuid !== uuid
        );

        return response?.data || response;
      } catch (error: any) {
        console.error("Error deleting PO instruction:", error);
        this.error = error.message || "Failed to delete PO instruction";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearPOInstructions() {
      this.poInstructions = [];
      this.error = null;
    },

    clearError() {
      this.error = null;
    },
  },
});
