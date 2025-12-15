import { defineStore } from "pinia";
import { useAuditLogsStore } from "./auditLogs";
import { useAuthStore } from "./auth";
import { useUserProfilesStore } from "./userProfiles";
import { dbHelpers } from "@/utils/indexedDb";

export interface BillLineItem {
  description: string;
  account_uuid: string;
  amount: number;
  profit_center_uuid?: string;
}

export interface BillAttachment {
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
}

export interface BillEntry {
  id?: string;
  type: string;
  books_date: string;
  bill_date: string;
  corporation_uuid: string;
  number?: string;
  payee_name: string;
  account_number?: string;
  pay_method: string;
  memo?: string;
  due_date?: string;
  amount: number;
  approval_status: string;
  approved_by?: string;
  address?: string;
  credit_days?: string;
  check_memo?: string;
  ref_number?: string;
  void?: boolean;
  hold_payment?: boolean;
  line_items: BillLineItem[];
  attachments: BillAttachment[];
  created_at?: string;
  updated_at?: string;
}

export const useBillEntriesStore = defineStore("billEntries", {
  state: () => ({
    billEntries: [] as BillEntry[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    // Get bill entries by approval status
    pendingBills: (state) =>
      state.billEntries.filter((bill) => bill.approval_status === "Pending"),

    approvedBills: (state) =>
      state.billEntries.filter((bill) => bill.approval_status === "Approved"),

    rejectedBills: (state) =>
      state.billEntries.filter((bill) => bill.approval_status === "Rejected"),

    // Get bill entries by pay method
    checkBills: (state) =>
      state.billEntries.filter((bill) => bill.pay_method === "CHECK"),

    achBills: (state) =>
      state.billEntries.filter((bill) => bill.pay_method === "ACH"),

    // Get total amount of all bills
    totalAmount: (state) =>
      state.billEntries.reduce((sum, bill) => sum + bill.amount, 0),

    // Get bill entries by type
    bills: (state) => state.billEntries.filter((bill) => bill.type === "Bill"),

    // Get total amount by status
    pendingAmount: (state) =>
      state.billEntries
        .filter((bill) => bill.approval_status === "Pending")
        .reduce((sum, bill) => sum + bill.amount, 0),

    approvedAmount: (state) =>
      state.billEntries
        .filter((bill) => bill.approval_status === "Approved")
        .reduce((sum, bill) => sum + bill.amount, 0),

    // Get total amount of bills (type = 'Bill')
    billsTotalAmount: (state) =>
      state.billEntries
        .filter((bill) => bill.type === "Bill")
        .reduce((sum, bill) => sum + bill.amount, 0),
  },

  actions: {
    // Note: Audit logging is now handled automatically by database triggers
    // No need for manual audit log creation in the frontend

    /**
     * Fetch bill entries from IndexedDB for a specific corporation
     */
    async fetchBillEntriesFromDB(corporationUuid: string) {
      this.loading = true;
      this.error = null;

      try {
        const entries = await dbHelpers.getBillEntries(corporationUuid);
        this.billEntries = (entries as any[]) || [];
      } catch (err: any) {
        this.error =
          err.message || "Failed to fetch bill entries from IndexedDB";
        this.billEntries = [];
      } finally {
        this.loading = false;
      }
    },

    /**
     * Fetch bill entries - defaults to IndexedDB, can fallback to API
     */
    async fetchBillEntries(
      corporationUuid: string,
      dateRange?: { start_date: string; end_date: string },
      useIndexedDB: boolean = true
    ) {
      // By default, fetch from IndexedDB (faster, cached data)
      // Set useIndexedDB=false to force API fetch
      if (useIndexedDB) {
        return await this.fetchBillEntriesFromDB(corporationUuid);
      }

      this.loading = true;
      this.error = null;

      try {
        let url = `/api/bill-entries?corporation_uuid=${corporationUuid}`;

        // Add date range parameters if provided
        if (dateRange) {
          url += `&start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`;
        }

        const { data, error } = await $fetch<{ data: any[]; error?: string }>(url);

        if (error) {
          throw new Error(error);
        }

        this.billEntries = data || [];
      } catch (err: any) {
        this.error = err.message || "Failed to fetch bill entries";
        this.billEntries = [];
      } finally {
        this.loading = false;
      }
    },

    async createBillEntry(
      billEntry: Omit<BillEntry, "id" | "created_at" | "updated_at">
    ) {
      this.loading = true;
      this.error = null;

      try {
        // Get current user info for audit logging
        const authStore = useAuthStore();
        const userProfilesStore = useUserProfilesStore();

        const currentUser = authStore.user;
        const userProfile = userProfilesStore.users.find(
          (user) => user.id === currentUser?.id
        );

        const userInfo = {
          user_id: currentUser?.id || null,
          user_name: userProfile
            ? `${userProfile.firstName} ${userProfile.lastName}`.trim()
            : currentUser?.email || "Unknown User",
          user_email: currentUser?.email || "",
          user_image_url: userProfile?.imageUrl || null,
        };

        const response = await $fetch<{ data: any; error?: string }>("/api/bill-entries", {
          method: "POST",
          body: {
            ...billEntry,
            ...userInfo,
          },
        });

        if (response.error) {
          throw new Error(response.error);
        }

        // Add the new bill entry to the store
        if (response.data) {
          this.billEntries.unshift(response.data);

          // Also add to IndexedDB to keep it in sync
          try {
            await dbHelpers.addBillEntry(billEntry.corporation_uuid, response.data);
          } catch (dbError) {
            console.warn("Failed to sync bill entry to IndexedDB:", dbError);
          }

          // Audit logging is handled automatically by database triggers

          // Show success toast
          const toast = useToast();
          toast.add({
            title: "Bill Created Successfully",
            description: `Bill #${response.data.number || "N/A"} for ${
              response.data.payee_name
            } has been created.`,
            color: "success",
            icon: "i-heroicons-check-circle",
          });
        }

        return response.data;
      } catch (err: any) {
        this.error = err.message || "Failed to create bill entry";

        // Show error toast
        const toast = useToast();
        toast.add({
          title: "Failed to Create Bill",
          description:
            err.message || "An error occurred while creating the bill entry.",
          color: "error",
          icon: "i-heroicons-x-circle",
        });

        throw err;
      } finally {
        this.loading = false;
      }
    },

    async updateBillEntry(id: string, billEntry: Partial<BillEntry>) {
      this.loading = true;
      this.error = null;

      try {
        // Get current user info for audit logging
        const authStore = useAuthStore();
        const userProfilesStore = useUserProfilesStore();

        const currentUser = authStore.user;
        const userProfile = userProfilesStore.users.find(
          (user) => user.id === currentUser?.id
        );

        const userInfo = {
          user_id: currentUser?.id || null,
          user_name: userProfile
            ? `${userProfile.firstName} ${userProfile.lastName}`.trim()
            : currentUser?.email || "Unknown User",
          user_email: currentUser?.email || "",
          user_image_url: userProfile?.imageUrl || null,
        };

        // Get the old values for audit logging
        const oldBillEntry = this.getBillEntryById(id);

        const { data, error } = await $fetch<{ data: any; error?: string }>(`/api/bill-entries/${id}`, {
          method: "PUT",
          body: {
            ...billEntry,
            ...userInfo,
          },
        });

        if (error) {
          throw new Error(error);
        }

        // Update the bill entry in the store
        if (data) {
          const index = this.billEntries.findIndex((bill) => bill.id === id);
          if (index !== -1) {
            this.billEntries[index] = data;
          }

          // Also update in IndexedDB to keep it in sync
          try {
            const corporationUuid = billEntry.corporation_uuid || oldBillEntry?.corporation_uuid;
            if (corporationUuid) {
              await dbHelpers.updateBillEntry(corporationUuid, id, data);
            }
          } catch (dbError) {
            console.warn("Failed to sync bill entry update to IndexedDB:", dbError);
          }

          // Audit logging is handled automatically by database triggers

          // Show success toast
          const toast = useToast();
          toast.add({
            title: "Bill Updated Successfully",
            description: `Bill #${data.number || "N/A"} for ${
              data.payee_name
            } has been updated.`,
            color: "success",
            icon: "i-heroicons-check-circle",
          });
        }

        return data;
      } catch (err: any) {
        this.error = err.message || "Failed to update bill entry";

        // Show error toast
        const toast = useToast();
        toast.add({
          title: "Failed to Update Bill",
          description:
            err.message || "An error occurred while updating the bill entry.",
          color: "error",
          icon: "i-heroicons-x-circle",
        });

        throw err;
      } finally {
        this.loading = false;
      }
    },

    async deleteBillEntry(id: string) {
      this.loading = true;
      this.error = null;

      try {
        // Get the old values for audit logging
        const oldBillEntry = this.getBillEntryById(id);

        const { error } = await $fetch<{ error?: string }>(`/api/bill-entries/${id}`, {
          method: "DELETE",
        });

        if (error) {
          throw new Error(error);
        }

        // Remove the bill entry from the store
        this.billEntries = this.billEntries.filter((bill) => bill.id !== id);

        // Also remove from IndexedDB to keep it in sync
        try {
          if (oldBillEntry?.corporation_uuid) {
            await dbHelpers.deleteBillEntry(oldBillEntry.corporation_uuid, id);
          }
        } catch (dbError) {
          console.warn("Failed to sync bill entry deletion to IndexedDB:", dbError);
        }

        // Audit logging is handled automatically by database triggers

        // Show success toast
        const toast = useToast();
        toast.add({
          title: "Bill Deleted Successfully",
          description: `Bill #${oldBillEntry?.number || "N/A"} for ${
            oldBillEntry?.payee_name || "Unknown"
          } has been deleted.`,
          color: "success",
          icon: "i-heroicons-check-circle",
        });
      } catch (err: any) {
        this.error = err.message || "Failed to delete bill entry";

        // Show error toast
        const toast = useToast();
        toast.add({
          title: "Failed to Delete Bill",
          description:
            err.message || "An error occurred while deleting the bill entry.",
          color: "error",
          icon: "i-heroicons-x-circle",
        });

        throw err;
      } finally {
        this.loading = false;
      }
    },

    async bulkApprove(billEntryIds: string[], corporationUuid: string) {
      this.loading = true;
      this.error = null;

      try {
        const { data, error } = await $fetch<{ data: any[]; success: boolean; message: string; error?: string }>("/api/bill-entries/bulk", {
          method: "POST",
          body: {
            action: "approve",
            bill_entry_ids: billEntryIds,
            corporation_uuid: corporationUuid,
          },
        });

        if (error) {
          throw new Error(error);
        }

        // Update the bill entries in the store
        for (const id of billEntryIds) {
          const index = this.billEntries.findIndex((bill) => bill.id === id);
          if (index !== -1 && this.billEntries[index]) {
            this.billEntries[index].approval_status = "Approved";
            this.billEntries[index].updated_at = new Date().toISOString();

            // Audit logging is handled automatically by database triggers
          }
        }

        // Show success toast
        const toast = useToast();
        toast.add({
          title: "Bills Approved Successfully",
          description: `${billEntryIds.length} bill(s) have been approved.`,
          color: "success",
          icon: "i-heroicons-check-circle",
        });

        return data;
      } catch (err: any) {
        this.error = err.message || "Failed to approve bill entries";

        // Show error toast
        const toast = useToast();
        toast.add({
          title: "Failed to Approve Bills",
          description:
            err.message || "An error occurred while approving the bills.",
          color: "error",
          icon: "i-heroicons-x-circle",
        });

        throw err;
      } finally {
        this.loading = false;
      }
    },

    async bulkReject(billEntryIds: string[], corporationUuid: string) {
      this.loading = true;
      this.error = null;

      try {
        const { data, error } = await $fetch<{ data: any[]; success: boolean; message: string; error?: string }>("/api/bill-entries/bulk", {
          method: "POST",
          body: {
            action: "reject",
            bill_entry_ids: billEntryIds,
            corporation_uuid: corporationUuid,
          },
        });

        if (error) {
          throw new Error(error);
        }

        // Update the bill entries in the store
        for (const id of billEntryIds) {
          const index = this.billEntries.findIndex((bill) => bill.id === id);
          if (index !== -1 && this.billEntries[index]) {
            this.billEntries[index].approval_status = "Rejected";
            this.billEntries[index].updated_at = new Date().toISOString();

            // Audit logging is handled automatically by database triggers
          }
        }

        // Show success toast
        const toast = useToast();
        toast.add({
          title: "Bills Rejected Successfully",
          description: `${billEntryIds.length} bill(s) have been rejected.`,
          color: "warning",
          icon: "i-heroicons-x-circle",
        });

        return data;
      } catch (err: any) {
        this.error = err.message || "Failed to reject bill entries";

        // Show error toast
        const toast = useToast();
        toast.add({
          title: "Failed to Reject Bills",
          description:
            err.message || "An error occurred while rejecting the bills.",
          color: "error",
          icon: "i-heroicons-x-circle",
        });

        throw err;
      } finally {
        this.loading = false;
      }
    },

    async bulkDelete(billEntryIds: string[], corporationUuid: string) {
      this.loading = true;
      this.error = null;

      try {
        const { data, error } = await $fetch<{ data: any[]; success: boolean; message: string; error?: string }>("/api/bill-entries/bulk", {
          method: "POST",
          body: {
            action: "delete",
            bill_entry_ids: billEntryIds,
            corporation_uuid: corporationUuid,
          },
        });

        if (error) {
          throw new Error(error);
        }

        // Audit logging is handled automatically by database triggers
        // Remove the bill entries from the store

        this.billEntries = this.billEntries.filter(
          (bill) => !billEntryIds.includes(bill.id!)
        );

        // Show success toast
        const toast = useToast();
        toast.add({
          title: "Bills Deleted Successfully",
          description: `${billEntryIds.length} bill(s) have been deleted.`,
          color: "success",
          icon: "i-heroicons-check-circle",
        });

        return data;
      } catch (err: any) {
        this.error = err.message || "Failed to delete bill entries";

        // Show error toast
        const toast = useToast();
        toast.add({
          title: "Failed to Delete Bills",
          description:
            err.message || "An error occurred while deleting the bills.",
          color: "error",
          icon: "i-heroicons-x-circle",
        });

        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Helper method to get bill entry by ID
    getBillEntryById(id: string): BillEntry | undefined {
      return this.billEntries.find((bill) => bill.id === id);
    },

    // Helper method to clear the store
    clearBillEntries() {
      this.billEntries = [];
      this.error = null;
    },

    // Helper method to force refresh from API (bypassing IndexedDB)
    async refreshBillEntriesFromAPI(
      corporationUuid: string,
      dateRange?: { start_date: string; end_date: string }
    ) {
      return await this.fetchBillEntries(corporationUuid, dateRange, false);
    },
  },
});
