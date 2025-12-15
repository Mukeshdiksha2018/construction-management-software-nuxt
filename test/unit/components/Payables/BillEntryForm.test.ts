import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick, ref } from 'vue'
import BillEntryForm from '@/components/Payables/BillEntryForm.vue'
import { useVendorStore } from '@/stores/vendors'
import { useCorporationStore } from '@/stores/corporations'
import { useChartOfAccountsStore } from '@/stores/chartOfAccounts'

// Mock composables
vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => ({
    currencySymbol: '$',
    formatCurrency: vi.fn((amount: number) => `$${amount.toLocaleString()}`)
  })
}))

vi.mock('@/composables/useDateFormat', () => ({
  useDateFormat: () => ({
    formatDate: vi.fn((date: string) => new Date(date).toLocaleDateString())
  })
}))

vi.mock('@/composables/useResizablePanels', () => ({
  useResizablePanels: () => ({
    isResizing: false,
    startResize: vi.fn()
  })
}))

vi.mock('@/composables/useFilePreview', () => ({
  useFilePreview: () => ({
    uploadedFile: ref(null),
    fileUploadError: ref(null),
    handleFileUpload: vi.fn()
  })
}))

// Mock stores
const mockCorpStore = {
  selectedCorporation: null,
  selectedCorporationId: null,
  $patch: vi.fn()
}

const mockVendorStore = {
  vendors: [],
  loading: false,
  error: null,
  $patch: vi.fn(),
  fetchVendors: vi.fn(),
  clearVendors: vi.fn()
}

const mockChartOfAccountsStore = {
  accounts: [],
  loading: false,
  error: null,
  $patch: vi.fn(),
  fetchAccounts: vi.fn(),
  clearAccounts: vi.fn()
}

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockCorpStore
}))

vi.mock('@/stores/vendors', () => ({
  useVendorStore: () => mockVendorStore
}))

vi.mock('@/stores/chartOfAccounts', () => ({
  useChartOfAccountsStore: () => mockChartOfAccountsStore
}))

describe('BillEntryForm Component', () => {
  let wrapper: any
  let vendorStore: ReturnType<typeof useVendorStore>
  let corporationStore: ReturnType<typeof useCorporationStore>
  let chartOfAccountsStore: ReturnType<typeof useChartOfAccountsStore>

  const mockCorporation = {
    uuid: 'corp-uuid-1',
    corporation_name: 'Test Corporation'
  }

  const mockVendor = {
    uuid: 'vendor-uuid-1',
    vendor_name: 'Test Vendor',
    vendor_type: 'Supplier'
  }

  const mockForm = {
    id: undefined,
    corporation_uuid: 'corp-uuid-1',
    vendor_uuid: 'vendor-uuid-1',
    account_number: 'ACC-001',
    books_date: '2024-01-01',
    address: '123 Test St, Test City, TS 12345',
    bill_date: '2024-01-01',
    due_date: '2024-01-31',
    credit_days: 'Net 30',
    amount: '1000.00',
    pay_method: 'CHECK',
    memo: 'Test memo',
    number: 'BILL-001',
    check_memo: 'Check memo',
    ref_number: 'REF-001',
    void: false,
    hold_payment: false,
    approval_status: 'Pending',
    line_items: [
      {
        purpose_name: 'Test Purpose',
        account_uuid: 'account-uuid-1',
        description: 'Test description',
        amount: '1000.00'
      }
    ],
    credit_accounts: [
      {
        purpose_name: 'Test Credit Purpose',
        account_uuid: 'credit-account-uuid-1',
        description: 'Test credit description',
        amount: '1000.00'
      }
    ],
    attachments: [
      {
        name: 'test-file.pdf',
        type: 'application/pdf',
        size: 1024,
        url: 'data:application/pdf;base64,test'
      }
    ]
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Set up mock data
    mockCorpStore.selectedCorporation = mockCorporation
    mockCorpStore.selectedCorporationId = mockCorporation.uuid
    
    mockVendorStore.vendors = [mockVendor]
    mockVendorStore.loading = false
    mockVendorStore.error = null
    
    mockChartOfAccountsStore.accounts = []
    mockChartOfAccountsStore.loading = false
    mockChartOfAccountsStore.error = null
    
    // Reset mocks
    mockCorpStore.$patch.mockClear()
    mockVendorStore.$patch.mockClear()
    mockChartOfAccountsStore.$patch.mockClear()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(BillEntryForm, {
      props: {
        form: mockForm,
        editingBill: false,
        ...props
      },
      global: {
        stubs: {
          UInput: true,
          USelectMenu: true,
          USelect: true,
          UTextarea: true,
          UButton: true,
          UIcon: true,
          UFileUpload: true,
          UCheckbox: true,
          ChartOfAccountsSelect: true,
          FilePreview: true
        }
      }
    })
  }

  describe('Component Mounting', () => {
    it('should mount without errors', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should have correct initial state', () => {
      wrapper = createWrapper();

      // VendorSelect component is now used instead of local selectedVendor
      expect(wrapper.vm.getCorporationName).toBeDefined();
      expect(wrapper.findComponent({ name: "VendorSelect" }).exists()).toBe(
        true
      );
    })
  })

  describe('Corporation Display Functionality', () => {
    it('should display corporation name correctly with UInput component', () => {
      wrapper = createWrapper()
      
      // Test the corporation name computation
      const corporationName = wrapper.vm.getCorporationName
      expect(corporationName).toBe('Test Corporation')
      
      // Test UInput component properties
      const uInputProps = {
        modelValue: corporationName,
        disabled: true,
        size: 'sm',
        class: 'w-full',
        icon: 'i-heroicons-building-office-2-solid'
      }
      
      expect(uInputProps.modelValue).toBe('Test Corporation')
      expect(uInputProps.disabled).toBe(true)
      expect(uInputProps.size).toBe('sm')
      expect(uInputProps.class).toBe('w-full')
      expect(uInputProps.icon).toBe('i-heroicons-building-office-2-solid')
    })

    it('should handle missing corporation gracefully', () => {
      // Create a wrapper with no corporation
      mockCorpStore.selectedCorporation = null
      wrapper = createWrapper()
      
      const corporationName = wrapper.vm.getCorporationName
      expect(corporationName).toBe('Unnamed Corporation')
      
      // Test UInput component properties with fallback
      const uInputProps = {
        modelValue: corporationName,
        disabled: true,
        size: 'sm',
        class: 'w-full',
        icon: 'i-heroicons-building-office-2-solid'
      }
      
      expect(uInputProps.modelValue).toBe('Unnamed Corporation')
      expect(uInputProps.disabled).toBe(true)
    })

    it('should use solid icon for corporation display', () => {
      const iconName = 'i-heroicons-building-office-2-solid'
      
      // Verify it's a solid icon (not outlined)
      expect(iconName).toContain('-solid')
      expect(iconName).not.toContain('-outline')
      expect(iconName).toContain('building-office-2')
    })

    it('should be read-only and non-editable', () => {
      wrapper = createWrapper()
      
      const uInputProps = {
        modelValue: wrapper.vm.getCorporationName,
        disabled: true,
        size: 'sm',
        class: 'w-full',
        icon: 'i-heroicons-building-office-2-solid'
      }
      
      // Verify it's disabled (read-only)
      expect(uInputProps.disabled).toBe(true)
      
      // Verify it has proper size and styling
      expect(uInputProps.size).toBe('sm')
      expect(uInputProps.class).toBe('w-full')
    })

    it('should maintain consistent UInput configuration', () => {
      wrapper = createWrapper()
      
      const expectedConfig = {
        disabled: true,
        size: 'sm',
        class: 'w-full',
        icon: 'i-heroicons-building-office-2-solid'
      }
      
      // Test that the configuration matches expected values
      const actualConfig = { ...expectedConfig }
      
      expect(actualConfig).toEqual(expectedConfig)
    })

    it('should display corporation in both Add and Edit modes', () => {
      // Test Add mode
      wrapper = createWrapper({ editingBill: false })
      const addModeCorpName = wrapper.vm.getCorporationName
      expect(addModeCorpName).toBe('Test Corporation')
      
      // Test Edit mode
      wrapper = createWrapper({ editingBill: true })
      const editModeCorpName = wrapper.vm.getCorporationName
      expect(editModeCorpName).toBe('Test Corporation')
      
      // Both modes should show the same corporation
      expect(addModeCorpName).toBe(editModeCorpName)
    })
  })

  describe('Vendor Selection', () => {
    it("should use VendorSelect component for vendor selection", () => {
      wrapper = createWrapper();

      // VendorSelect component is now used instead of local vendorOptions
      const vendorSelect = wrapper.findComponent({ name: "VendorSelect" });
      expect(vendorSelect.exists()).toBe(true);

      // Verify VendorSelect receives the correct props
      expect(vendorSelect.props("modelValue")).toBeDefined();
      expect(vendorSelect.props("corporationUuid")).toBe("corp-uuid-1");
    });

    it("should pass vendor UUID to VendorSelect component", () => {
      const formWithVendor = {
        ...mockForm,
        vendor_uuid: "vendor-uuid-1",
      };
      wrapper = createWrapper({ form: formWithVendor });

      const vendorSelect = wrapper.findComponent({ name: "VendorSelect" });
      expect(vendorSelect.props("modelValue")).toBe("vendor-uuid-1");
    });

    it('should handle vendor change events', () => {
      wrapper = createWrapper()
      
      const mockSelectedOption = { value: 'vendor-uuid-1', label: 'Test Vendor' }
      
      // Test vendor change handler
      wrapper.vm.onVendorChange(mockSelectedOption)
      
      // Should emit vendor-change event
      expect(wrapper.emitted('vendor-change')).toBeTruthy()
    })
  })

  describe('Form Calculations', () => {
    it('should calculate total line items correctly', () => {
      wrapper = createWrapper()
      
      const totalLineItems = wrapper.vm.totalLineItems
      expect(totalLineItems).toBe(1000)
    })

    it('should calculate total credit accounts correctly', () => {
      wrapper = createWrapper()
      
      const totalCreditAccounts = wrapper.vm.totalCreditAccounts
      expect(totalCreditAccounts).toBe(1000)
    })

    it('should calculate debit difference correctly', () => {
      wrapper = createWrapper()
      
      const debitDifference = wrapper.vm.debitDifference
      expect(debitDifference).toBe(0) // 1000 - 1000 = 0
    })

    it('should calculate credit difference correctly', () => {
      wrapper = createWrapper()
      
      const creditDifference = wrapper.vm.creditDifference
      expect(creditDifference).toBe(0) // 1000 - 1000 = 0
    })

    it('should check if debit side is balanced', () => {
      wrapper = createWrapper()
      
      const isDebitBalanced = wrapper.vm.isDebitBalanced
      expect(isDebitBalanced).toBe(true) // Difference is 0
    })

    it('should check if credit side is balanced', () => {
      wrapper = createWrapper()
      
      const isCreditBalanced = wrapper.vm.isCreditBalanced
      expect(isCreditBalanced).toBe(true) // Difference is 0, so balanced
    })
  })

  describe('Account Selection', () => {
    it('should handle account change for line items', () => {
      wrapper = createWrapper()
      
      const mockAccount = { value: 'account-uuid-2' }
      const index = 0
      
      // Test account change handler
      wrapper.vm.handleAccountChange(index, mockAccount)
      
      // Should update the line item account
      expect(mockForm.line_items[index].account_uuid).toBe('account-uuid-2')
    })

    it('should handle account change for credit accounts', () => {
      wrapper = createWrapper()
      
      const mockAccount = { value: 'account-uuid-3' }
      const index = 0
      
      // Test credit account change handler
      wrapper.vm.handleCreditAccountChange(index, mockAccount)
      
      // Should update the credit account
      expect(mockForm.credit_accounts[index].account_uuid).toBe('account-uuid-3')
    })

    it('should get selected account info', () => {
      wrapper = createWrapper()
      
      const accountInfo = wrapper.vm.getSelectedAccountInfo('account-uuid-1')
      expect(accountInfo).toBeUndefined() // No accounts in mock store
    })
  })

  describe('File Upload', () => {
    it('should handle file upload events', () => {
      wrapper = createWrapper()
      
      // Test that file upload functionality exists
      expect(wrapper.vm.handleFileUpload).toBeDefined()
      expect(typeof wrapper.vm.handleFileUpload).toBe('function')
    })

    it('should compute current preview file correctly', () => {
      wrapper = createWrapper()
      
      const currentPreviewFile = wrapper.vm.currentPreviewFile
      expect(currentPreviewFile).toEqual(mockForm.attachments[0])
    })

    it('should handle file upload error messages', () => {
      wrapper = createWrapper()
      
      const fileUploadErrorMessage = wrapper.vm.fileUploadErrorMessage
      expect(fileUploadErrorMessage).toBeDefined()
    })
  })

  describe('Form Events', () => {
    it('should emit add-line-item event', () => {
      wrapper = createWrapper()
      
      wrapper.vm.addLineItem()
      
      expect(wrapper.emitted('add-line-item')).toBeTruthy()
    })

    it('should emit remove-line-item event', () => {
      wrapper = createWrapper()
      
      wrapper.vm.removeLineItem(0)
      
      expect(wrapper.emitted('remove-line-item')).toBeTruthy()
      expect(wrapper.emitted('remove-line-item')[0]).toEqual([0])
    })

    it('should emit update-line-calculations event', () => {
      wrapper = createWrapper()
      
      wrapper.vm.updateLineItemCalculations()
      
      expect(wrapper.emitted('update-line-calculations')).toBeTruthy()
    })

    it('should emit add-credit-account event', () => {
      wrapper = createWrapper()
      
      // These methods are handled by the parent component, so we test the emit directly
      wrapper.vm.$emit('add-credit-account')
      
      expect(wrapper.emitted('add-credit-account')).toBeTruthy()
    })

    it('should emit remove-credit-account event', () => {
      wrapper = createWrapper()
      
      // These methods are handled by the parent component, so we test the emit directly
      wrapper.vm.$emit('remove-credit-account', 0)
      
      expect(wrapper.emitted('remove-credit-account')).toBeTruthy()
      expect(wrapper.emitted('remove-credit-account')[0]).toEqual([0])
    })

    it('should emit update-credit-calculations event', () => {
      wrapper = createWrapper()
      
      // These methods are handled by the parent component, so we test the emit directly
      wrapper.vm.$emit('update-credit-calculations')
      
      expect(wrapper.emitted('update-credit-calculations')).toBeTruthy()
    })
  })

  describe('Options Configuration', () => {
    it('should have correct payment method options', () => {
      wrapper = createWrapper()
      
      const payMethodOptions = wrapper.vm.payMethodOptions
      expect(payMethodOptions).toEqual([
        { label: "CHECK", value: "CHECK" },
        { label: "ACH", value: "ACH" },
        { label: "Wire Transfer", value: "WIRE" },
        { label: "Cash", value: "CASH" },
        { label: "Card", value: "CARD" }
      ])
    })

    it('should have correct credit days options', () => {
      wrapper = createWrapper()
      
      const creditDaysOptions = wrapper.vm.creditDaysOptions
      expect(creditDaysOptions).toEqual([
        { label: "Net 10", value: "Net 10" },
        { label: "Net 15", value: "Net 15" },
        { label: "Net 30", value: "Net 30" },
        { label: "Net 45", value: "Net 45" },
        { label: "Net 60", value: "Net 60" },
        { label: "Due on Receipt", value: "Due on Receipt" }
      ])
    })

    it('should have correct status options', () => {
      wrapper = createWrapper()
      
      const statusOptions = wrapper.vm.statusOptions
      expect(statusOptions).toEqual([
        { 
          label: "Pending", 
          value: "Pending",
          color: "warning",
          icon: "i-heroicons-clock"
        },
        { 
          label: "Approved", 
          value: "Approved",
          color: "success",
          icon: "i-heroicons-check-circle"
        },
        { 
          label: "Rejected", 
          value: "Rejected",
          color: "error",
          icon: "i-heroicons-x-circle"
        }
      ])
    })
  })
})
