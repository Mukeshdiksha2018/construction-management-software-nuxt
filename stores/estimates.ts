import { defineStore } from "pinia";
import { useAuditLogsStore } from "./auditLogs";
import { useUTCDateFormat } from "@/composables/useUTCDateFormat";
import { useCorporationStore } from "./corporations";
import { useAuthStore } from "./auth";
import { useUserProfilesStore } from "./userProfiles";
import { dbHelpers } from "@/utils/indexedDb";

export interface EstimateLineItem {
  cost_code_uuid: string;
  cost_code_number: string;
  cost_code_name: string;
  division_name: string;
  description: string;
  labor_amount: number;
  material_amount: number;
  total_amount: number;
  estimation_type: string;
  // Optional metadata to preserve how labor was calculated when using per-room method
  labor_amount_per_room?: number;
  labor_rooms_count?: number;
  is_sub_cost_code?: boolean;
  is_sub_sub_cost_code?: boolean;
  parent_cost_code_uuid?: string;
}

export interface EstimateAttachment {
  file_name: string;
  file_size: number;
  file_url: string;
}

export interface Estimate {
  id?: string;
  uuid?: string;
  estimate_number: string;
  project_uuid: string;
  corporation_uuid: string;
  estimate_date: string;
  valid_until?: string;
  status: "Draft" | "Pending" | "Approved" | "Rejected" | "Expired";
  total_amount: number;
  tax_amount?: number;
  discount_amount?: number;
  final_amount: number;
  notes?: string;
  line_items: EstimateLineItem[];
  attachments: EstimateAttachment[];
  removed_cost_code_uuids?: string[];
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  // Related data
  project?: {
    uuid: string;
    project_name: string;
    project_id: string;
  };
}

export interface CreateEstimatePayload {
  estimate_number: string;
  project_uuid: string;
  corporation_uuid: string;
  estimate_date: string;
  valid_until?: string;
  status?: "Draft" | "Pending" | "Approved" | "Rejected" | "Expired";
  total_amount: number;
  tax_amount?: number;
  discount_amount?: number;
  final_amount: number;
  notes?: string;
  line_items: EstimateLineItem[];
  attachments?: EstimateAttachment[];
  removed_cost_code_uuids?: string[];
}

export interface UpdateEstimatePayload {
  uuid: string;
  estimate_number?: string;
  estimate_date?: string;
  valid_until?: string;
  status?: "Draft" | "Pending" | "Approved" | "Rejected" | "Expired";
  total_amount?: number;
  tax_amount?: number;
  discount_amount?: number;
  final_amount?: number;
  notes?: string;
  line_items?: EstimateLineItem[];
  attachments?: EstimateAttachment[];
  removed_cost_code_uuids?: string[];
}

export const useEstimatesStore = defineStore("estimates", () => {
  const estimates = ref<Estimate[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const authStore = useAuthStore();
  const userProfilesStore = useUserProfilesStore();
  const auditLogsStore = useAuditLogsStore();
  const { toUTCString } = useUTCDateFormat();

  const normalizeDatesToUTC = <
    T extends { estimate_date?: string; valid_until?: string }
  >(
    obj: T
  ): T => {
    const clone: any = { ...obj };
    if (clone.estimate_date)
      clone.estimate_date = toUTCString(clone.estimate_date) as any;
    else if (clone.estimate_date === "") clone.estimate_date = null as any;
    if (clone.valid_until)
      clone.valid_until = toUTCString(clone.valid_until) as any;
    else if (clone.valid_until === "") clone.valid_until = null as any;
    return clone;
  };

  // Fetch estimates for a corporation (IndexedDB only; TopBar/init handles sync)
  const fetchEstimates = async (corporationUuid: string) => {
    if (!corporationUuid) {
      console.log("No corporation UUID provided for fetching estimates");
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const cachedEstimates = await dbHelpers.getEstimates(corporationUuid);
      estimates.value = cachedEstimates || [];
    } catch (err: any) {
      console.error("Error fetching estimates:", err);
      error.value = err.message || "Failed to fetch estimates";
    } finally {
      loading.value = false;
    }
  };

  // Optional: Explicit network refresh if a caller wants to force an update
  const refreshEstimatesFromAPI = async (corporationUuid: string, page = 1, pageSize = 100) => {
    if (!corporationUuid) return;
    loading.value = true;
    error.value = null;
    try {
      const response: any = await $fetch("/api/estimates", {
        method: "GET",
        query: { corporation_uuid: corporationUuid, page, page_size: pageSize },
      });
      if (response?.data) {
        // For first page, replace; for subsequent pages, merge
        if (page === 1) {
          estimates.value = response.data;
        } else {
          const existingUuids = new Set(estimates.value.map(e => e.uuid));
          const newEstimates = response.data.filter((e: Estimate) => e.uuid && !existingUuids.has(e.uuid));
          estimates.value = [...estimates.value, ...newEstimates];
        }
        await dbHelpers.storeEstimates(estimates.value);
      }
    } catch (e) {
      console.error("Error refreshing estimates from API:", e);
      error.value = "Failed to refresh estimates";
    } finally {
      loading.value = false;
    }
  };

  // Create a new estimate
  const createEstimate = async (
    payload: CreateEstimatePayload
  ): Promise<boolean> => {
    loading.value = true;
    error.value = null;

    try {
      console.log("Creating estimate:", payload);

      // Get user info for audit log
      const user = authStore.user;
      const userInfo = user ? {
        user_id: user.id || '',
        user_name: user.user_metadata?.full_name || 
                   `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
                   user.email?.split('@')[0] || 
                   'Unknown User',
        user_email: user.email || '',
        user_image_url: user.user_metadata?.avatar_url || user.user_metadata?.image_url || null
      } : null;

      const response: any = await $fetch("/api/estimates", {
        method: "POST",
        body: {
          ...normalizeDatesToUTC(payload),
          ...(userInfo || {})
        },
      });

      if (response?.data) {
        console.log("Successfully created estimate:", response.data);

        // Store in IndexedDB with the correct corporation_uuid
        if (response?.data?.corporation_uuid) {
          await dbHelpers.updateEstimate(
            response.data.corporation_uuid,
            response.data
          );
        } else {
          await dbHelpers.storeEstimates(estimates.value);
        }

        // Only add to local store if it matches the currently selected corporation
        // This prevents showing estimates from other corporations in the list
        const corpStore = useCorporationStore();
        if (response.data.corporation_uuid === corpStore.selectedCorporationId) {
          estimates.value.unshift(response.data);
        }

        return true;
      } else {
        throw new Error("Failed to create estimate - no data returned");
      }
    } catch (err: any) {
      console.error("Error creating estimate:", err);
      error.value = err.message || "Failed to create estimate";
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Update an existing estimate
  const updateEstimate = async (
    payload: UpdateEstimatePayload
  ): Promise<boolean> => {
    loading.value = true;
    error.value = null;

    try {
      console.log("Updating estimate:", payload);

      // Get user info for audit log
      const user = authStore.user;
      const userInfo = user ? {
        user_id: user.id || '',
        user_name: user.user_metadata?.full_name || 
                   `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
                   user.email?.split('@')[0] || 
                   'Unknown User',
        user_email: user.email || '',
        user_image_url: user.user_metadata?.avatar_url || user.user_metadata?.image_url || null
      } : null;

      const response: any = await $fetch(`/api/estimates/${payload.uuid}`, {
        method: "PUT",
        body: {
          ...normalizeDatesToUTC(payload),
          ...(userInfo || {})
        },
      });

      if (response?.data) {
        console.log("Successfully updated estimate:", response.data);

        // Store in IndexedDB with the correct corporation_uuid
        if (response?.data?.corporation_uuid) {
          await dbHelpers.updateEstimate(
            response.data.corporation_uuid,
            response.data
          );
        } else {
          await dbHelpers.storeEstimates(estimates.value);
        }

        // Only update in local store if it matches the currently selected corporation
        // This prevents showing estimates from other corporations in the list
        const corpStore = useCorporationStore();
        if (response.data.corporation_uuid === corpStore.selectedCorporationId) {
          const index = estimates.value.findIndex((e) => e.uuid === payload.uuid);
          if (index !== -1) {
            estimates.value[index] = response.data;
          }
        }

        return true;
      } else {
        throw new Error("Failed to update estimate - no data returned");
      }
    } catch (err: any) {
      console.error("Error updating estimate:", err);
      error.value = err.message || "Failed to update estimate";
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Delete an estimate
  const deleteEstimate = async (estimateUuid: string): Promise<boolean> => {
    loading.value = true;
    error.value = null;

    try {
      console.log("Deleting estimate:", estimateUuid);

      const response: any = await $fetch(`/api/estimates/${estimateUuid}`, {
        method: "DELETE",
      });

      if (response?.message || response) {
        // Find corporation UUID from the existing estimate before removal
        const existing = estimates.value.find((e) => e.uuid === estimateUuid);
        const existingCorpId = existing?.corporation_uuid || "";

        // Remove the estimate from the store
        estimates.value = estimates.value.filter(
          (e) => e.uuid !== estimateUuid
        );
        console.log("Successfully deleted estimate");

        // Store in IndexedDB
        const corpId =
          existingCorpId ||
          useCorporationStore().selectedCorporation?.uuid ||
          "";
        if (corpId) {
          await dbHelpers.deleteEstimate(corpId, estimateUuid);
        } else {
          await dbHelpers.storeEstimates(estimates.value);
        }

        return true;
      } else {
        throw new Error("Failed to delete estimate");
      }
    } catch (err: any) {
      console.error("Error deleting estimate:", err);
      // Re-throw the full error object so the component can access statusCode, statusMessage, and data
      error.value = err.message || err.statusMessage || "Failed to delete estimate";
      // Re-throw the error so the component can handle it with full details
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Get estimate by UUID
  const getEstimateByUuid = (uuid: string): Estimate | undefined => {
    return estimates.value.find((e) => e.uuid === uuid);
  };

  // Get estimate by UUID from IndexedDB (full detail)
  const getEstimateByUuidFromDB = async (
    corporationUuid: string,
    uuid: string
  ): Promise<Estimate | null> => {
    try {
      const record = await dbHelpers.getEstimateByUuid(corporationUuid, uuid);
      return (record as Estimate) || null;
    } catch (e) {
      return null;
    }
  };

  // Get estimates by project UUID
  const getEstimatesByProject = (projectUuid: string): Estimate[] => {
    return estimates.value.filter((e) => e.project_uuid === projectUuid);
  };

  // Get estimates by status
  const getEstimatesByStatus = (status: string): Estimate[] => {
    return estimates.value.filter((e) => e.status === status);
  };

  // Clear estimates
  const clearEstimates = () => {
    estimates.value = [];
    error.value = null;
  };

  return {
    // State
    estimates: readonly(estimates),
    loading: readonly(loading),
    error: readonly(error),

    // Actions
    fetchEstimates,
    refreshEstimatesFromAPI,
    createEstimate,
    updateEstimate,
    deleteEstimate,
    getEstimateByUuid,
    getEstimateByUuidFromDB,
    getEstimatesByProject,
    getEstimatesByStatus,
    clearEstimates,
  };
});
