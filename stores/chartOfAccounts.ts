// stores/chartOfAccounts.ts
import { ref, computed } from "vue";
import { defineStore } from "pinia";

type ChartOfAccount = {
  id: number;
  uuid: string;
  created_at: string;
  corporation_uuid: string;
  code: string;
  account_name: string;
  account_type: string;
  parent_account?: string;
  sub_category?: string;
  notes?: string;
  opening_balance: number;
  is_header?: boolean;
  bank_account_number?: string;
  box_1099?: string;
  updated_at: string;
};

type CreateChartOfAccountPayload = {
  corporation_uuid: string;
  code: string;
  account_name: string;
  account_type: string;
  parent_account?: string;
  sub_category?: string;
  notes?: string;
  opening_balance?: number;
  is_header?: boolean;
  bank_account_number?: string;
  box_1099?: string;
};

export type AccountOption = {
  label: string;
  value: string;
  account_type: string;
  account_type_color:
    | "error"
    | "info"
    | "primary"
    | "success"
    | "secondary"
    | "warning"
    | "neutral"
    | undefined;
  isMapped: boolean;
  defaultAccountCode?: string;
  defaultAccountName?: string;
  searchText: string;
};

// Helper function for account type colors
const getAccountTypeColor = (
  accountType: string
):
  | "error"
  | "info"
  | "primary"
  | "success"
  | "secondary"
  | "warning"
  | "neutral"
  | undefined => {
  const colorMap: Record<
    string,
    | "error"
    | "info"
    | "primary"
    | "success"
    | "secondary"
    | "warning"
    | "neutral"
    | undefined
  > = {
    Asset: "success",
    Liability: "error",
    Equity: "primary",
    Revenue: "success",
    Expense: "warning",
  };
  return colorMap[accountType] || "neutral";
};

export const useChartOfAccountsStore = defineStore(
  "chartOfAccounts",
  () => {
    const accounts = ref<ChartOfAccount[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    // Cache management
    const lastFetchedCorporation = ref<string | null>(null);
    const hasDataForCorporation = ref<Set<string>>(new Set());

    // Pre-computed account options for select components
    // This is computed once and cached, avoiding expensive re-calculations
    const accountOptions = computed<AccountOption[]>(() => {
      return accounts.value.map((account) => {
        return {
          label: `${account.code} - ${account.account_name}`,
          value: account.uuid,
          account_type: account.account_type,
          account_type_color: getAccountTypeColor(account.account_type),
          isMapped: false,
          defaultAccountCode: undefined,
          defaultAccountName: undefined,
          searchText: `${account.code} ${account.account_name} ${account.account_type}`,
        };
      });
    });

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
     * Fetch chart of accounts from IndexedDB for a specific corporation
     */
    const fetchAccountsFromDB = async (corporationUUID: string) => {
      loading.value = true;
      error.value = null;

      try {
        const { dbHelpers } = await import("@/utils/indexedDb");
        const dbAccounts = await dbHelpers.getChartOfAccounts(corporationUUID);
        accounts.value = (dbAccounts as any[]) || [];

        // Update cache info
        lastFetchedCorporation.value = corporationUUID;
        hasDataForCorporation.value.add(corporationUUID);
      } catch (err: any) {
        error.value =
          err.message || "Failed to fetch chart of accounts from IndexedDB";
        accounts.value = [];
      } finally {
        loading.value = false;
      }
    };

    // Fetch all accounts for a specific corporation - defaults to IndexedDB
    const fetchAccounts = async (
      corporationUUID: string,
      forceRefresh = false,
      useIndexedDB = true
    ) => {
      // By default, fetch from IndexedDB (faster, cached data)
      // Set useIndexedDB=false to force API fetch
      if (useIndexedDB && !forceRefresh) {
        return await fetchAccountsFromDB(corporationUUID);
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
        const { apiFetch } = useApiClient();
        const response = (await apiFetch(
          `/api/corporations/chart-of-accounts?corporation_uuid=${corporationUUID}`
        )) as any;
        if (response?.error) throw new Error(response.error);

        // Handle different response types
        if (response?.data) {
          accounts.value = response.data || [];
        } else {
          accounts.value = response || [];
        }

        // Update cache info
        lastFetchedCorporation.value = corporationUUID;
        hasDataForCorporation.value.add(corporationUUID);
      } catch (err: any) {
        console.error("Error fetching chart of accounts:", err);
        error.value = err.message || "Failed to fetch chart of accounts";
        accounts.value = [];
        // Clear cache on error to ensure fresh fetch next time
        hasDataForCorporation.value.delete(corporationUUID);
      }
      loading.value = false;
    };

    // Add a new account
    const addAccount = async (
      corporationUUID: string,
      accountData: CreateChartOfAccountPayload
    ) => {
      loading.value = true;
      error.value = null;
      try {
        const { apiFetch } = useApiClient();
        const response = (await apiFetch("/api/corporations/chart-of-accounts", {
          method: "POST",
          body: {
            ...accountData,
            corporation_uuid: corporationUUID,
          },
        })) as any;
        if (response?.error) throw new Error(response.error);

        // Add the new account to local state immediately
        if (response?.data && response.data.length > 0) {
          const newAccount = response.data[0];
          accounts.value.push(newAccount);

          // Sync to IndexedDB to keep it in sync
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            await dbHelpers.addChartOfAccount(corporationUUID, newAccount);
          } catch (dbError) {
            console.warn(
              "Failed to sync chart of account to IndexedDB:",
              dbError
            );
          }

          // Clear cache to ensure fresh data on next fetch
          hasDataForCorporation.value.delete(corporationUUID);
        }

        return response;
      } catch (err: any) {
        console.error("Error adding account:", err);
        error.value = err.message || "Failed to add account";
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // Bulk import accounts
    const bulkImportAccounts = async (
      corporationUUID: string,
      accountsData: CreateChartOfAccountPayload[]
    ) => {
      loading.value = true;
      error.value = null;
      try {
        const { apiFetch } = useApiClient();
        const response = (await apiFetch(
          "/api/corporations/chart-of-accounts/bulk",
          {
            method: "POST",
            body: {
              accounts: accountsData,
              corporation_uuid: corporationUUID,
            },
          }
        )) as any;
        if (response?.error) throw new Error(response.error);

        // Refresh the accounts list after bulk import
        await fetchAccounts(corporationUUID, true);
        return response;
      } catch (err: any) {
        console.error("Error bulk importing accounts:", err);
        error.value = err.message || "Failed to bulk import accounts";
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // Update an existing account
    const updateAccount = async (
      corporationUUID: string,
      id: number,
      accountData: Partial<CreateChartOfAccountPayload>
    ) => {
      loading.value = true;
      error.value = null;
      try {
        const { apiFetch } = useApiClient();
        const response = (await apiFetch("/api/corporations/chart-of-accounts", {
          method: "PUT",
          body: {
            ...accountData,
            id,
            corporation_uuid: corporationUUID,
          },
        })) as any;
        if (response?.error) throw new Error(response.error);

        // Update the account in local state immediately
        const index = accounts.value.findIndex((acc) => acc.id === id);
        if (index > -1 && response?.data && response.data.length > 0) {
          const updatedAccount = {
            ...accounts.value[index],
            ...response.data[0],
          };
          accounts.value[index] = updatedAccount;

          // Sync to IndexedDB to keep it in sync
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            await dbHelpers.updateChartOfAccount(
              corporationUUID,
              updatedAccount
            );
          } catch (dbError) {
            console.warn(
              "Failed to sync updated chart of account to IndexedDB:",
              dbError
            );
          }

          // Clear cache to ensure fresh data on next fetch
          hasDataForCorporation.value.delete(corporationUUID);
        }

        return response;
      } catch (err: any) {
        console.error("Error updating account:", err);
        error.value = err.message || "Failed to update account";
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // Delete an account
    const deleteAccount = async (corporationUUID: string, id: number) => {
      loading.value = true;
      error.value = null;
      try {
        const { apiFetch } = useApiClient();
        const response = (await apiFetch(
          `/api/corporations/chart-of-accounts?id=${id}`,
          {
            method: "DELETE",
          }
        )) as any;
        if (response?.error) throw new Error(response.error);

        // Remove the account from local state immediately
        const index = accounts.value.findIndex((acc) => acc.id === id);
        if (index > -1) {
          accounts.value.splice(index, 1);

          // Sync deletion to IndexedDB
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            await dbHelpers.deleteChartOfAccount(corporationUUID, id);
          } catch (dbError) {
            console.warn(
              "Failed to sync chart of account deletion to IndexedDB:",
              dbError
            );
          }

          // Clear cache to ensure fresh data on next fetch
          hasDataForCorporation.value.delete(corporationUUID);
        }

        return response;
      } catch (err: any) {
        console.error("Error deleting account:", err);
        error.value = err.message || "Failed to delete account";
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // Delete all accounts for a corporation
    const deleteAllAccounts = async (corporationUUID: string) => {
      loading.value = true;
      error.value = null;
      try {
        const { apiFetch } = useApiClient();
        const response = (await apiFetch(
          `/api/corporations/chart-of-accounts/delete-all?corporation_uuid=${corporationUUID}`,
          {
            method: "DELETE",
          }
        )) as any;
        if (response?.error) throw new Error(response.error);

        // Clear all accounts from local state immediately
        accounts.value = [];

        return response;
      } catch (err: any) {
        console.error("Error deleting all accounts:", err);
        error.value = err.message || "Failed to delete all accounts";
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // Import default chart of accounts
    const importDefaultAccounts = async (corporationUUID: string) => {
      loading.value = true;
      error.value = null;
      try {
        // First, fetch the default accounts
        const { apiFetch } = useApiClient();
        const defaultResponse = (await apiFetch(
          "/api/default-chart-of-accounts"
        )) as any;

        if (defaultResponse?.error) {
          throw new Error(defaultResponse.error);
        }

        const defaultAccounts = defaultResponse?.data || [];

        if (defaultAccounts.length === 0) {
          throw new Error("No default accounts found");
        }

        // Transform default accounts to the format needed for bulk import
        const accountsToImport = defaultAccounts.map((account: any) => ({
          corporation_uuid: corporationUUID,
          code: account.code,
          account_name: account.account_name,
          account_type: account.account_type,
          sub_category: account.sub_category || "",
          notes: account.description || "",
          opening_balance: 0, // Default opening balance for imported accounts
        }));

        // Use the existing bulk import functionality
        const result = await bulkImportAccounts(
          corporationUUID,
          accountsToImport
        );

        return {
          success: true,
          imported: accountsToImport.length,
          message: `Successfully imported ${accountsToImport.length} default accounts`,
        };
      } catch (err: any) {
        console.error("Error importing default accounts:", err);
        error.value = err.message || "Failed to import default accounts";
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
        accounts.value = [];
        lastFetchedCorporation.value = null;
        hasDataForCorporation.value.clear();
      }
    };

    // Helper method to force refresh from API (bypassing IndexedDB)
    const refreshAccountsFromAPI = async (corporationUUID: string) => {
      return await fetchAccounts(corporationUUID, true, false);
    };

    return {
      accounts,
      accountOptions,
      loading,
      error,
      fetchAccounts,
      addAccount,
      bulkImportAccounts,
      importDefaultAccounts,
      updateAccount,
      deleteAccount,
      deleteAllAccounts,
      clearCache,
      refreshAccountsFromAPI,
    };
  },
  {
    persist: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      paths: ["lastFetchedCorporation", "hasDataForCorporation"],
    },
  }
);
