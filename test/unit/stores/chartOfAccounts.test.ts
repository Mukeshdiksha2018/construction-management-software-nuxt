import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from "pinia";
import { useChartOfAccountsStore } from '../../../stores/chartOfAccounts'

describe('chartOfAccounts Store', () => {
  let store: ReturnType<typeof useChartOfAccountsStore>

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useChartOfAccountsStore()
    // Reset store state
    store.accounts = []
    store.loading = false
    store.error = null
    store.clearCache()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.accounts).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('fetchAccounts', () => {
    const mockAccounts = [
      {
        id: 1,
        uuid: "account-1",
        created_at: "2024-01-01",
        corporation_uuid: "corp-1",
        code: "10010",
        account_name: "Auction Funds",
        account_type: "Asset",
        parent_account: "",
        sub_category: "Current Asset",
        notes: "Auction funds account",
        opening_balance: 20000.0,
        is_header: false,
        updated_at: "2024-01-01",
      },
      {
        id: 2,
        uuid: "account-2",
        created_at: "2024-01-01",
        corporation_uuid: "corp-1",
        code: "10020",
        account_name: "WEBSTER BANK",
        account_type: "Asset",
        parent_account: "",
        sub_category: "Current Asset",
        notes: "",
        opening_balance: 0,
        is_header: true,
        updated_at: "2024-01-01",
      },
    ];

    it('should fetch accounts successfully', async () => {
      global.$fetch = vi.fn().mockResolvedValue({ data: mockAccounts }) as any;

      await store.fetchAccounts("corp-1", false, false); // Force API fetch

      expect(global.$fetch).toHaveBeenCalledWith(
        "/api/corporations/chart-of-accounts?corporation_uuid=corp-1"
      );
      expect(store.accounts).toEqual(mockAccounts);
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
    })

    it('should handle fetch error', async () => {
      const errorMessage = "Network error";
      global.$fetch = vi.fn().mockRejectedValue(new Error(errorMessage)) as any;

      await store.fetchAccounts("corp-1", false, false); // Force API fetch

      expect(store.accounts).toEqual([]);
      expect(store.loading).toBe(false);
      expect(store.error).toBe(errorMessage);
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise!: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      global.$fetch = vi.fn().mockReturnValue(fetchPromise) as any;

      const fetchCall = store.fetchAccounts("corp-1", false, false); // Force API fetch

      expect(store.loading).toBe(true);

      resolvePromise({ data: mockAccounts });
      await fetchCall;

      expect(store.loading).toBe(false);
    })

    it('should handle response without data property', async () => {
      global.$fetch = vi.fn().mockResolvedValue(mockAccounts) as any;

      await store.fetchAccounts("corp-1", false, false); // Force API fetch

      expect(store.accounts).toEqual(mockAccounts);
    })

    it('should skip fetch on server side', async () => {
      const originalProcess = process.server
      // @ts-ignore
      process.server = true

      await store.fetchAccounts('corp-1')

      expect(global.$fetch).not.toHaveBeenCalled()

      // @ts-ignore
      process.server = originalProcess
    })
  })

  describe('addAccount', () => {
    const newAccount = {
      corporation_uuid: "corp-1",
      code: "10030",
      account_name: "ROCKLAND BANK",
      account_type: "Asset",
      parent_account: "",
      sub_category: "Current Asset",
      notes: "Rockland Bank main account",
      opening_balance: 0,
      is_header: true,
    };

    const createdAccount = {
      id: 3,
      uuid: 'account-3',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      ...newAccount
    }

    it('should add account successfully', async () => {
      global.$fetch = vi.fn().mockResolvedValue({ data: [createdAccount] }) as any

      const result = await store.addAccount('corp-1', newAccount)

      expect(global.$fetch).toHaveBeenCalledWith('/api/corporations/chart-of-accounts', {
        method: 'POST',
        body: {
          ...newAccount,
          corporation_uuid: 'corp-1'
        }
      })
      expect(result).toBeDefined()
      expect(store.accounts).toHaveLength(1)
      expect(store.accounts[0]).toEqual(createdAccount)
      expect(store.error).toBe(null)
    })

    it('should handle add error', async () => {
      const errorMessage = 'Validation failed'
      global.$fetch = vi.fn().mockRejectedValue(new Error(errorMessage)) as any

      await expect(store.addAccount('corp-1', newAccount)).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
    })
  })

  describe('bulkImportAccounts', () => {
    const accountsToImport = [
      {
        corporation_uuid: "corp-1",
        code: "10010",
        account_name: "Auction Funds",
        account_type: "Asset",
        parent_account: "",
        sub_category: "Current Asset",
        notes: "",
        opening_balance: 20000,
        is_header: false,
      },
      {
        corporation_uuid: "corp-1",
        code: "10020",
        account_name: "WEBSTER BANK",
        account_type: "Asset",
        parent_account: "",
        sub_category: "Current Asset",
        notes: "",
        opening_balance: 0,
        is_header: true,
      },
    ];

    it('should bulk import accounts successfully', async () => {
      const mockResult = {
        data: [],
        duplicates: 0,
        new: 2,
        total: 2
      }

      global.$fetch = vi.fn()
        .mockResolvedValueOnce(mockResult) // For bulk import
        .mockResolvedValueOnce({ data: [] }) as any // For fetchAccounts

      const result = await store.bulkImportAccounts('corp-1', accountsToImport)

      expect(global.$fetch).toHaveBeenCalledWith('/api/corporations/chart-of-accounts/bulk', {
        method: 'POST',
        body: {
          accounts: accountsToImport,
          corporation_uuid: 'corp-1'
        }
      })
      expect(result).toEqual(mockResult)
    })

    it('should handle bulk import with duplicates', async () => {
      const mockResult = {
        data: [],
        duplicates: 1,
        new: 1,
        total: 2
      }

      global.$fetch = vi.fn()
        .mockResolvedValueOnce(mockResult)
        .mockResolvedValueOnce({ data: [] }) as any

      const result = await store.bulkImportAccounts('corp-1', accountsToImport)

      expect(result.duplicates).toBe(1)
      expect(result.new).toBe(1)
    })

    it('should handle bulk import error', async () => {
      const errorMessage = 'Bulk import failed'
      global.$fetch = vi.fn().mockRejectedValue(new Error(errorMessage)) as any

      await expect(store.bulkImportAccounts('corp-1', accountsToImport)).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
    })
  })

  describe('updateAccount', () => {
    const existingAccount = {
      id: 1,
      uuid: "account-1",
      created_at: "2024-01-01",
      corporation_uuid: "corp-1",
      code: "10010",
      account_name: "Auction Funds",
      account_type: "Asset",
      parent_account: "",
      sub_category: "Current Asset",
      notes: "",
      opening_balance: 20000,
      is_header: false,
      updated_at: "2024-01-01",
    };

    const updateData = {
      account_name: 'Auction Funds - Updated',
      notes: 'Updated notes'
    }

    const updatedAccount = { ...existingAccount, ...updateData }

    beforeEach(() => {
      store.accounts = [existingAccount]
    })

    it('should update account successfully', async () => {
      global.$fetch = vi.fn().mockResolvedValue({ data: [updatedAccount] }) as any

      const result = await store.updateAccount('corp-1', 1, updateData)

      expect(global.$fetch).toHaveBeenCalledWith('/api/corporations/chart-of-accounts', {
        method: 'PUT',
        body: {
          ...updateData,
          id: 1,
          corporation_uuid: 'corp-1'
        }
      })
      expect(result).toBeDefined()
      expect(store.accounts[0]).toEqual(updatedAccount)
      expect(store.error).toBe(null)
    })

    it('should handle update error', async () => {
      const errorMessage = 'Update failed'
      global.$fetch = vi.fn().mockRejectedValue(new Error(errorMessage)) as any

      await expect(store.updateAccount('corp-1', 1, updateData)).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
    })
  })

  describe('deleteAccount', () => {
    const accountToDelete = {
      id: 1,
      uuid: "account-1",
      created_at: "2024-01-01",
      corporation_uuid: "corp-1",
      code: "10010",
      account_name: "Auction Funds",
      account_type: "Asset",
      parent_account: "",
      sub_category: "Current Asset",
      notes: "",
      opening_balance: 20000,
      is_header: false,
      updated_at: "2024-01-01",
    };

    beforeEach(() => {
      store.accounts = [accountToDelete]
    })

    it('should delete account successfully', async () => {
      global.$fetch = vi.fn().mockResolvedValue({ success: true }) as any

      await store.deleteAccount('corp-1', 1)

      expect(global.$fetch).toHaveBeenCalledWith('/api/corporations/chart-of-accounts?id=1', {
        method: 'DELETE'
      })
      expect(store.accounts).toHaveLength(0)
      expect(store.error).toBe(null)
    })

    it('should handle delete error', async () => {
      const errorMessage = 'Delete failed'
      global.$fetch = vi.fn().mockRejectedValue(new Error(errorMessage)) as any

      await expect(store.deleteAccount('corp-1', 1)).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.accounts).toHaveLength(1) // Should not remove on error
    })
  })

  describe('deleteAllAccounts', () => {
    beforeEach(() => {
      store.accounts = [
        {
          id: 1,
          uuid: "account-1",
          created_at: "2024-01-01",
          corporation_uuid: "corp-1",
          code: "10010",
          account_name: "Auction Funds",
          account_type: "Asset",
          parent_account: "",
          sub_category: "Current Asset",
          notes: "",
          opening_balance: 20000,
          is_header: false,
          updated_at: "2024-01-01",
        },
      ];
    })

    it('should delete all accounts successfully', async () => {
      global.$fetch = vi.fn().mockResolvedValue({ success: true }) as any

      await store.deleteAllAccounts('corp-1')

      expect(global.$fetch).toHaveBeenCalledWith('/api/corporations/chart-of-accounts/delete-all?corporation_uuid=corp-1', {
        method: 'DELETE'
      })
      expect(store.accounts).toHaveLength(0)
      expect(store.error).toBe(null)
    })

    it('should handle delete all error', async () => {
      const errorMessage = 'Delete all failed'
      global.$fetch = vi.fn().mockRejectedValue(new Error(errorMessage)) as any

      await expect(store.deleteAllAccounts('corp-1')).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
    })
  })

  describe('Error Handling', () => {
    it('should clear error when operation succeeds', async () => {
      store.error = "Previous error";
      global.$fetch = vi.fn().mockResolvedValue({ data: [] }) as any;

      await store.fetchAccounts("corp-1", false, false); // Force API fetch

      expect(store.error).toBe(null);
    })

    it('should handle API response errors', async () => {
      global.$fetch = vi.fn().mockResolvedValue({ error: "API Error" }) as any;

      await store.fetchAccounts("corp-1", false, false); // Force API fetch

      expect(store.error).toBe("API Error");
    })
  })
})

