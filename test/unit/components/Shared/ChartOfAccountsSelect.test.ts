import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import ChartOfAccountsSelect from '@/components/Shared/ChartOfAccountsSelect.vue'
import type { AccountOption } from "@/stores/chartOfAccounts";

// Mock chart of accounts store
const mockChartOfAccountsStore = {
  accounts: [] as any[],
  accountOptions: [] as AccountOption[],
  loading: false,
  error: null,
  fetchAccounts: vi.fn(),
};

vi.mock('@/stores/chartOfAccounts', () => ({
  useChartOfAccountsStore: () => mockChartOfAccountsStore
}))

describe('ChartOfAccountsSelect Component', () => {
  let wrapper: any

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // Reset mock data
    mockChartOfAccountsStore.accounts = []
    mockChartOfAccountsStore.accountOptions = []
    mockChartOfAccountsStore.loading = false
    mockChartOfAccountsStore.error = null
    mockChartOfAccountsStore.fetchAccounts.mockResolvedValue(undefined)
  })

  const createWrapper = (props = {}) => {
    return mount(ChartOfAccountsSelect, {
      props: {
        corporationUuid: 'corp-1',
        ...props
      },
      global: {
        stubs: {
          USelectMenu: {
            template: '<div class="u-select-menu"><slot /></div>',
            props: ['modelValue', 'items', 'placeholder', 'disabled', 'searchable']
          },
          UBadge: {
            template: '<span class="u-badge"><slot /></span>',
            props: ['color', 'variant', 'size']
          }
        }
      }
    })
  }

  describe('Component Mounting', () => {
    it('should mount without errors', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it("should fetch accounts on mount when corporationUuid is provided", () => {
      wrapper = createWrapper({ corporationUuid: "corp-1" });

      // Due to the watch with immediate: true, fetchAccounts should be called
      // But only if localAccounts prop is not provided
      expect(mockChartOfAccountsStore.fetchAccounts).toHaveBeenCalled();
    });
    
    it("should not fetch accounts when localAccounts prop is provided", () => {
      const localAccounts = [
        {
          uuid: "acc-1",
          code: "1000",
          account_name: "Account 1",
          account_type: "Asset",
        },
      ];
      wrapper = createWrapper({ corporationUuid: "corp-1", localAccounts });

      // Should not fetch from store when local accounts are provided
      expect(mockChartOfAccountsStore.fetchAccounts).not.toHaveBeenCalled();
    });

    it('should not fetch accounts when corporationUuid is not provided', () => {
      wrapper = createWrapper({ corporationUuid: undefined })
      
      expect(mockChartOfAccountsStore.fetchAccounts).not.toHaveBeenCalled()
    })
  })

  describe('Corporation Switching', () => {
    it('should refetch accounts when corporation changes', async () => {
      wrapper = createWrapper({ corporationUuid: "corp-1" });

      // Clear previous calls
      mockChartOfAccountsStore.fetchAccounts.mockClear();

      // Change corporation
      await wrapper.setProps({ corporationUuid: "corp-2" });
      await nextTick();

      // Should fetch accounts for new corporation with force refresh
      // But only if localAccounts prop is not provided
      expect(mockChartOfAccountsStore.fetchAccounts).toHaveBeenCalledWith(
        "corp-2",
        true,
        true
      );
    })
    
    it("should not refetch accounts when corporation changes if localAccounts is provided", async () => {
      const localAccounts = [
        {
          uuid: "acc-1",
          code: "1000",
          account_name: "Account 1",
          account_type: "Asset",
        },
      ];
      wrapper = createWrapper({ corporationUuid: "corp-1", localAccounts });

      // Clear previous calls
      mockChartOfAccountsStore.fetchAccounts.mockClear();

      // Change corporation
      await wrapper.setProps({ corporationUuid: "corp-2", localAccounts });
      await nextTick();

      // Should not fetch from store when local accounts are provided
      expect(mockChartOfAccountsStore.fetchAccounts).not.toHaveBeenCalled();
    });

    it('should not refetch accounts when corporation remains the same', async () => {
      wrapper = createWrapper({ corporationUuid: 'corp-1' })
      
      // Clear previous calls from mount
      mockChartOfAccountsStore.fetchAccounts.mockClear()
      
      // Set same corporation
      await wrapper.setProps({ corporationUuid: 'corp-1' })
      await nextTick()
      
      // Should not fetch again
      expect(mockChartOfAccountsStore.fetchAccounts).not.toHaveBeenCalled()
    })

    it('should fetch accounts for new corporation when switching', async () => {
      wrapper = createWrapper({ corporationUuid: 'corp-1' })
      
      mockChartOfAccountsStore.fetchAccounts.mockClear()
      
      // Change corporation
      await wrapper.setProps({ corporationUuid: 'corp-2' })
      await nextTick()
      
      // Should have fetched accounts for new corporation with force refresh
      expect(mockChartOfAccountsStore.fetchAccounts).toHaveBeenCalledWith('corp-2', true, true)
    })

    it('should keep selected value when switching corporations if selection is valid', async () => {
      // Set up initial state with accounts for corp-1
      mockChartOfAccountsStore.accountOptions = [
        {
          label: "Account 1",
          value: "acc-1",
          account_type: "Asset",
          account_type_color: "success",
          isMapped: false,
          searchText: "Account 1 Asset",
        },
        {
          label: "Account 2",
          value: "acc-2",
          account_type: "Liability",
          account_type_color: "error",
          isMapped: false,
          searchText: "Account 2 Liability",
        },
      ];
      
      wrapper = createWrapper({ 
        corporationUuid: 'corp-1',
        modelValue: 'acc-1' 
      })
      
      expect(wrapper.vm.selectedAccount).toBe('acc-1')
      
      // Change corporation but keep same account (simulating account exists in both corporations)
      // This would be unusual but the component should handle it
      mockChartOfAccountsStore.accountOptions = [
        {
          label: "Account 1",
          value: "acc-1",
          account_type: "Asset",
          account_type_color: "success",
          isMapped: false,
          searchText: "Account 1 Asset",
        },
        {
          label: "Account 5",
          value: "acc-5",
          account_type: "Expense",
          account_type_color: "warning",
          isMapped: false,
          searchText: "Account 5 Expense",
        },
      ];
      
      await wrapper.setProps({ corporationUuid: 'corp-2' })
      await nextTick()
      
      // Selected value should remain since acc-1 exists in new corporation
      expect(wrapper.vm.selectedAccount).toBe('acc-1')
    })

    it('should handle rapid corporation switches gracefully', async () => {
      wrapper = createWrapper({ corporationUuid: 'corp-1' })
      
      mockChartOfAccountsStore.fetchAccounts.mockClear()
      
      // Rapid switches
      await wrapper.setProps({ corporationUuid: 'corp-2' })
      await wrapper.setProps({ corporationUuid: 'corp-3' })
      await wrapper.setProps({ corporationUuid: 'corp-4' })
      await nextTick()
      
      // Should have called fetchAccounts for each new corporation
      expect(mockChartOfAccountsStore.fetchAccounts).toHaveBeenCalledWith('corp-2', true, true)
      expect(mockChartOfAccountsStore.fetchAccounts).toHaveBeenCalledWith('corp-3', true, true)
      expect(mockChartOfAccountsStore.fetchAccounts).toHaveBeenCalledWith('corp-4', true, true)
    })
  })

  describe('Selection Handling', () => {
    it('should emit update:modelValue when selection changes', async () => {
      mockChartOfAccountsStore.accountOptions = [
        {
          label: "Account 1",
          value: "acc-1",
          account_type: "Asset",
          account_type_color: "success",
          isMapped: false,
          searchText: "Account 1 Asset",
        },
      ];
      
      wrapper = createWrapper()
      
      wrapper.vm.handleSelection({ value: 'acc-1', label: 'Account 1' })
      await nextTick()
      
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0][0]).toBe('acc-1')
    })

    it('should emit change event when selection changes', async () => {
      mockChartOfAccountsStore.accountOptions = [
        {
          label: "Account 1",
          value: "acc-1",
          account_type: "Asset",
          account_type_color: "success",
          isMapped: false,
          searchText: "Account 1 Asset",
        },
      ];
      
      wrapper = createWrapper()
      
      const account = { value: 'acc-1', label: 'Account 1' }
      wrapper.vm.handleSelection(account)
      await nextTick()
      
      expect(wrapper.emitted('change')).toBeTruthy()
      expect(wrapper.emitted('change')[0][0]).toEqual(account)
    })

    it('should handle clearing selection', async () => {
      wrapper = createWrapper({ modelValue: 'acc-1' })
      
      wrapper.vm.handleSelection(undefined)
      await nextTick()
      
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted[emitted.length - 1][0]).toBeUndefined()
    })
  })

  describe('Props Reactivity', () => {
    it('should update selected account when modelValue prop changes', async () => {
      mockChartOfAccountsStore.accountOptions = [
        {
          label: "Account 1",
          value: "acc-1",
          account_type: "Asset",
          account_type_color: "success",
          isMapped: false,
          searchText: "Account 1 Asset",
        },
        {
          label: "Account 2",
          value: "acc-2",
          account_type: "Liability",
          account_type_color: "error",
          isMapped: false,
          searchText: "Account 2 Liability",
        },
      ];
      
      wrapper = createWrapper({ modelValue: 'acc-1' })
      await nextTick()
      
      expect(wrapper.vm.selectedAccount).toBe('acc-1')
      
      await wrapper.setProps({ modelValue: 'acc-2' })
      await nextTick()
      
      expect(wrapper.vm.selectedAccount).toBe('acc-2')
    })

    it('should update selected object when account options change', async () => {
      mockChartOfAccountsStore.accountOptions = [
        {
          label: "Account 1",
          value: "acc-1",
          account_type: "Asset",
          account_type_color: "success",
          isMapped: false,
          searchText: "Account 1 Asset",
        },
      ];
      
      wrapper = createWrapper({ modelValue: 'acc-1' })
      
      await nextTick()
      
      expect(wrapper.vm.selectedAccountObject).toBeDefined()
      expect(wrapper.vm.selectedAccountObject.value).toBe('acc-1')
    })

    it('should handle disabled state', () => {
      wrapper = createWrapper({ disabled: true })
      
      const selectMenu = wrapper.find('.u-select-menu')
      expect(selectMenu.exists()).toBe(true)
    })
  })

  describe('Account Options Map', () => {
    it('should create efficient lookup map from account options', () => {
      mockChartOfAccountsStore.accountOptions = [
        {
          label: "Account 1",
          value: "acc-1",
          account_type: "Asset",
          account_type_color: "success",
          isMapped: false,
          searchText: "Account 1 Asset",
        },
        {
          label: "Account 2",
          value: "acc-2",
          account_type: "Liability",
          account_type_color: "error",
          isMapped: false,
          searchText: "Account 2 Liability",
        },
        {
          label: "Account 3",
          value: "acc-3",
          account_type: "Expense",
          account_type_color: "warning",
          isMapped: false,
          searchText: "Account 3 Expense",
        },
      ];
      
      wrapper = createWrapper()
      
      const map = wrapper.vm.accountOptionsMap
      expect(map).toBeInstanceOf(Map)
      expect(map.size).toBe(3)
      expect(map.get("acc-1")).toEqual({
        label: "Account 1",
        value: "acc-1",
        account_type: "Asset",
        account_type_color: "success",
        isMapped: false,
        searchText: "Account 1 Asset",
      });
    })
  })

  describe('Real-world Scenario: Corporation Switch with Missing Accounts', () => {
    it('should fetch accounts when switching from corporation with accounts to corporation without accounts', async () => {
      // Start with Corp A that has accounts
      mockChartOfAccountsStore.accountOptions = [
        {
          label: "Corp A Account 1",
          value: "corp-a-acc-1",
          account_type: "Asset",
          account_type_color: "success",
          isMapped: false,
          searchText: "Corp A Account 1 Asset",
        },
        {
          label: "Corp A Account 2",
          value: "corp-a-acc-2",
          account_type: "Liability",
          account_type_color: "error",
          isMapped: false,
          searchText: "Corp A Account 2 Liability",
        },
      ];
      
      wrapper = createWrapper({ 
        corporationUuid: 'corp-a',
        modelValue: 'corp-a-acc-1'
      })
      await nextTick()
      
      mockChartOfAccountsStore.fetchAccounts.mockClear()
      
      // Switch to Corp B
      await wrapper.setProps({ corporationUuid: 'corp-b' })
      await nextTick()
      
      // Should have fetched accounts for new corporation
      expect(mockChartOfAccountsStore.fetchAccounts).toHaveBeenCalledWith('corp-b', true, true)
    })

    it('should show empty options when corporation has no chart of accounts', async () => {
      mockChartOfAccountsStore.accountOptions = []
      
      wrapper = createWrapper({ corporationUuid: 'corp-no-accounts' })
      
      expect(wrapper.vm.accountOptions).toEqual([])
      expect(wrapper.vm.selectedAccountObject).toBeUndefined()
    })
  })
})

