import { defineStore } from 'pinia'

export interface ApprovalCheck {
  id: number;
  uuid: string;
  approval_check: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface CreateApprovalCheckData {
  approval_check: string;
  description?: string | null;
  active?: boolean;
}

export interface UpdateApprovalCheckData {
  approval_check: string;
  description?: string | null;
  active: boolean;
}

export const useApprovalChecksStore = defineStore("approvalChecks", {
  state: () => ({
    approvalChecks: [] as ApprovalCheck[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    getAllApprovalChecks: (state) => {
      return state.approvalChecks;
    },

    getActiveApprovalChecks: (state) => {
      return state.approvalChecks.filter((f) => f.active === true);
    },

    getApprovalCheckByUuid: (state) => (uuid: string) => {
      return state.approvalChecks.find((f) => f.uuid === uuid);
    },
  },

  actions: {
    async fetchApprovalChecks(forceFromAPI: boolean = false) {
      this.loading = true;
      this.error = null;
      try {
        let data: ApprovalCheck[] = [];

        if (!forceFromAPI) {
          // Try IndexedDB first (global cache)
          const { dbHelpers } = await import("@/utils/indexedDb");
          data = await dbHelpers.getApprovalChecks();
          // If empty, fallback to API
          if (!data || data.length === 0) {
            const { apiFetch } = useApiClient();
            const response = await apiFetch("/api/approval-checks", { method: "GET" });
            data = response?.data || response;
            if (data && Array.isArray(data)) {
              await dbHelpers.saveApprovalChecks(data);
            }
          }
        } else {
          const { apiFetch } = useApiClient();
          const response = await apiFetch("/api/approval-checks", { method: "GET" });
          data = response?.data || response;
          const { dbHelpers } = await import("@/utils/indexedDb");
          if (data && Array.isArray(data)) {
            await dbHelpers.saveApprovalChecks(data);
          }
        }

        // Replace all approvalChecks data
        this.approvalChecks = data && Array.isArray(data) ? data : [];
      } catch (error: any) {
        console.error("Error fetching approvalChecks:", error);
        this.error = error.message || "Failed to fetch approvalChecks";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createApprovalCheck(approvalCheckData: CreateApprovalCheckData) {
      this.loading = true;
      this.error = null;
      try {
        const { apiFetch } = useApiClient();
        const response = await apiFetch("/api/approval-checks", {
          method: "POST",
          body: approvalCheckData,
        });

        const data = response?.data || response;
        if (data) {
          this.approvalChecks.push(data);
          const { dbHelpers } = await import("@/utils/indexedDb");
          await dbHelpers.addApprovalCheck(data);
        }
        return data;
      } catch (error: any) {
        console.error("Error creating approvalCheck:", error);
        this.error = error.message || "Failed to create approvalCheck";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateApprovalCheck(uuid: string, approvalCheckData: UpdateApprovalCheckData) {
      this.loading = true;
      this.error = null;
      try {
        const { apiFetch } = useApiClient();
        const response = await apiFetch(`/api/approval-checks/${uuid}`, {
          method: "PUT",
          body: approvalCheckData,
        });

        const data = response?.data || response;
        if (data) {
          const index = this.approvalChecks.findIndex((f) => f.uuid === uuid);
          if (index !== -1) {
            this.approvalChecks[index] = data;
          }
          const { dbHelpers } = await import("@/utils/indexedDb");
          await dbHelpers.updateApprovalCheck(data);
        }
        return data;
      } catch (error: any) {
        console.error("Error updating approvalCheck:", error);
        this.error = error.message || "Failed to update approvalCheck";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteApprovalCheck(uuid: string) {
      this.loading = true;
      this.error = null;
      try {
        const { apiFetch } = useApiClient();
        const response = await apiFetch(`/api/approval-checks/${uuid}`, {
          method: "DELETE",
        });

        // Remove from local state
        this.approvalChecks = this.approvalChecks.filter((f) => f.uuid !== uuid);
        const { dbHelpers } = await import("@/utils/indexedDb");
        await dbHelpers.deleteApprovalCheck(uuid);
        return response;
      } catch (error: any) {
        console.error("Error deleting approvalCheck:", error);
        this.error = error.message || "Failed to delete approvalCheck";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearApprovalChecks() {
      this.approvalChecks = [];
    },
  },
});

