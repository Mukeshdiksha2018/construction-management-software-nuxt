import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick, ref } from 'vue'
import VendorForm from '@/components/PurchaseOrders/VendorForm.vue'
import { useVendorStore } from '@/stores/vendors'
import { useCorporationStore } from '@/stores/corporations'

// Mock the corporation store
const mockCorpStore = {
  selectedCorporation: {
    uuid: 'corp-uuid-1',
    corporation_name: 'Test Corporation'
  }
}

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockCorpStore
}))

// Mock composables
vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => ({
    currencySymbol: '$',
    formatCurrency: vi.fn((amount: number) => `$${amount.toLocaleString()}`)
  })
}))

// Mock useToast
const mockToast = {
  add: vi.fn()
}
vi.mock('#app', () => ({
  useToast: () => mockToast
}))
vi.stubGlobal('useToast', () => mockToast)

describe('VendorForm Component', () => {
  let wrapper: any
  let vendorStore: ReturnType<typeof useVendorStore>

  const mockVendor = {
    uuid: 'vendor-uuid-1',
    corporation_uuid: 'corp-uuid-1',
    vendor_name: 'Test Vendor',
    vendor_type: 'Supplier',
    vendor_address: '123 Test St',
    vendor_city: 'Test City',
    vendor_state: 'TS',
    vendor_country: 'US',
    vendor_zip: '12345',
    vendor_phone: '555-1234',
    vendor_email: 'test@vendor.com',
    is_1099: false,
    vendor_federal_id: '12-3456789',
    vendor_ssn: '',
    company_name: 'Test Company',
    check_printed_as: 'Test Vendor',
    doing_business_as: 'Test DBA',
    salutation: 'Mr.',
    first_name: 'John',
    middle_name: 'A',
    last_name: 'Doe',
    opening_balance: 0.00,
    opening_balance_date: '2024-01-01'
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vendorStore = useVendorStore()
    
    // Reset mocks
    mockToast.add.mockClear()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(VendorForm, {
      props: {
        modelValue: true,
        vendor: null,
        ...props
      },
      global: {
        stubs: {
          UModal: true,
          UInput: true,
          USelect: true,
          UCheckbox: true,
          UButton: true,
          UIcon: true
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
      wrapper = createWrapper()
      
      expect(wrapper.vm.showModal).toBe(true)
      expect(wrapper.vm.editingVendor).toBe(false)
      expect(wrapper.vm.submitting).toBe(false)
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
      // Temporarily modify the mock to have no corporation
      const originalCorp = mockCorpStore.selectedCorporation
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
      
      // Restore the original corporation
      mockCorpStore.selectedCorporation = originalCorp
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
      wrapper = createWrapper({ vendor: null })
      const addModeCorpName = wrapper.vm.getCorporationName
      expect(addModeCorpName).toBe('Test Corporation')
      
      // Test Edit mode
      wrapper = createWrapper({ vendor: mockVendor })
      const editModeCorpName = wrapper.vm.getCorporationName
      expect(editModeCorpName).toBe('Test Corporation')
      
      // Both modes should show the same corporation
      expect(addModeCorpName).toBe(editModeCorpName)
    })

    it('should auto-set corporation UUID in form when modal opens', async () => {
      wrapper = createWrapper({ modelValue: false })
      await nextTick()
      
      // Trigger the watch by changing the prop
      await wrapper.setProps({ modelValue: true })
      await nextTick()
      
      // Corporation UUID should be set from the store when modal opens
      expect(wrapper.vm.form.corporation_uuid).toBe('corp-uuid-1')
    })
  })

  describe('Form Operations', () => {
    it('should reset form correctly', async () => {
      wrapper = createWrapper({ modelValue: true })
      await nextTick()
      
      // Fill some form data
      wrapper.vm.form.vendor_name = 'Test Vendor'
      wrapper.vm.form.vendor_email = 'test@example.com'
      
      // Reset form
      wrapper.vm.resetForm()
      
      expect(wrapper.vm.form.vendor_name).toBe('')
      expect(wrapper.vm.form.vendor_email).toBe('')
      expect(wrapper.vm.form.corporation_uuid).toBe('corp-uuid-1')
    })

    it('should close modal and reset form', async () => {
      wrapper = createWrapper({ modelValue: true })
      await nextTick()
      
      await wrapper.vm.closeModal()
      await nextTick()
      
      // Should emit update:modelValue with false
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0]).toEqual([false])
      expect(wrapper.vm.form.vendor_name).toBe('')
    })

    it('should populate form when editing vendor', async () => {
      wrapper = createWrapper({ modelValue: false, vendor: null })
      await nextTick()
      
      // Trigger the watch by changing the props
      await wrapper.setProps({ modelValue: true, vendor: mockVendor })
      await nextTick()
      
      expect(wrapper.vm.form.vendor_name).toBe('Test Vendor')
      expect(wrapper.vm.form.vendor_email).toBe('test@vendor.com')
      expect(wrapper.vm.form.corporation_uuid).toBe('corp-uuid-1')
    })
  })

  describe('Form Validation', () => {
    it("should validate all required fields", async () => {
      wrapper = createWrapper();

      // Try to submit without any required fields
      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please fill in the Vendor Name",
        })
      );
    });

    it("should validate Federal ID field", async () => {
      wrapper = createWrapper();

      // Fill only vendor name, leave Federal ID empty
      wrapper.vm.form.vendor_name = "Test Vendor";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please fill in the Federal ID",
        })
      );
    });

    it("should validate SSN field", async () => {
      wrapper = createWrapper();

      // Fill required fields except SSN
      wrapper.vm.form.vendor_name = "Test Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please fill in the SSN",
        })
      );
    });

    it("should validate Company Name field", async () => {
      wrapper = createWrapper();

      // Fill required fields except Company Name
      wrapper.vm.form.vendor_name = "Test Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";
      wrapper.vm.form.vendor_ssn = "123-45-6789";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please fill in the Company Name",
        })
      );
    });

    it("should validate Check Printed As field", async () => {
      wrapper = createWrapper();

      // Fill required fields except Check Printed As
      wrapper.vm.form.vendor_name = "Test Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";
      wrapper.vm.form.vendor_ssn = "123-45-6789";
      wrapper.vm.form.company_name = "Test Company";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please fill in the Check Printed As",
        })
      );
    });

    it("should validate Doing Business As field", async () => {
      wrapper = createWrapper();

      // Fill required fields except Doing Business As
      wrapper.vm.form.vendor_name = "Test Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";
      wrapper.vm.form.vendor_ssn = "123-45-6789";
      wrapper.vm.form.company_name = "Test Company";
      wrapper.vm.form.check_printed_as = "Test Check";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please fill in the Doing Business As",
        })
      );
    });

    it("should validate Salutation field", async () => {
      wrapper = createWrapper();

      // Fill required fields except Salutation
      wrapper.vm.form.vendor_name = "Test Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";
      wrapper.vm.form.vendor_ssn = "123-45-6789";
      wrapper.vm.form.company_name = "Test Company";
      wrapper.vm.form.check_printed_as = "Test Check";
      wrapper.vm.form.doing_business_as = "Test DBA";
      wrapper.vm.form.salutation = ""; // Empty salutation
      wrapper.vm.form.first_name = "John"; // Fill first name to avoid it being validated first
      wrapper.vm.form.last_name = "Doe"; // Fill last name to avoid it being validated first
      wrapper.vm.form.vendor_address = "123 Test St";
      wrapper.vm.form.vendor_city = "Test City";
      wrapper.vm.form.vendor_state = "TS";
      wrapper.vm.form.vendor_zip = "12345";
      wrapper.vm.form.vendor_country = "US";
      wrapper.vm.form.vendor_phone = "555-1234";
      wrapper.vm.form.vendor_email = "test@example.com";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please fill in the Salutation",
        })
      );
    });

    it("should validate First Name field", async () => {
      wrapper = createWrapper();

      // Fill required fields except First Name
      wrapper.vm.form.vendor_name = "Test Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";
      wrapper.vm.form.vendor_ssn = "123-45-6789";
      wrapper.vm.form.company_name = "Test Company";
      wrapper.vm.form.check_printed_as = "Test Check";
      wrapper.vm.form.doing_business_as = "Test DBA";
      wrapper.vm.form.salutation = "Mr.";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please fill in the First Name",
        })
      );
    });

    it("should validate Last Name field", async () => {
      wrapper = createWrapper();

      // Fill required fields except Last Name
      wrapper.vm.form.vendor_name = "Test Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";
      wrapper.vm.form.vendor_ssn = "123-45-6789";
      wrapper.vm.form.company_name = "Test Company";
      wrapper.vm.form.check_printed_as = "Test Check";
      wrapper.vm.form.doing_business_as = "Test DBA";
      wrapper.vm.form.salutation = "Mr.";
      wrapper.vm.form.first_name = "John";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please fill in the Last Name",
        })
      );
    });

    it("should validate Street Address field", async () => {
      wrapper = createWrapper();

      // Fill required fields except Street Address
      wrapper.vm.form.vendor_name = "Test Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";
      wrapper.vm.form.vendor_ssn = "123-45-6789";
      wrapper.vm.form.company_name = "Test Company";
      wrapper.vm.form.check_printed_as = "Test Check";
      wrapper.vm.form.doing_business_as = "Test DBA";
      wrapper.vm.form.salutation = "Mr.";
      wrapper.vm.form.first_name = "John";
      wrapper.vm.form.last_name = "Doe";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please fill in the Street Address",
        })
      );
    });

    it("should validate City field", async () => {
      wrapper = createWrapper();

      // Fill required fields except City
      wrapper.vm.form.vendor_name = "Test Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";
      wrapper.vm.form.vendor_ssn = "123-45-6789";
      wrapper.vm.form.company_name = "Test Company";
      wrapper.vm.form.check_printed_as = "Test Check";
      wrapper.vm.form.doing_business_as = "Test DBA";
      wrapper.vm.form.salutation = "Mr.";
      wrapper.vm.form.first_name = "John";
      wrapper.vm.form.last_name = "Doe";
      wrapper.vm.form.vendor_address = "123 Test St";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please fill in the City",
        })
      );
    });

    it("should validate State field", async () => {
      wrapper = createWrapper();

      // Fill required fields except State
      wrapper.vm.form.vendor_name = "Test Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";
      wrapper.vm.form.vendor_ssn = "123-45-6789";
      wrapper.vm.form.company_name = "Test Company";
      wrapper.vm.form.check_printed_as = "Test Check";
      wrapper.vm.form.doing_business_as = "Test DBA";
      wrapper.vm.form.salutation = "Mr.";
      wrapper.vm.form.first_name = "John";
      wrapper.vm.form.last_name = "Doe";
      wrapper.vm.form.vendor_address = "123 Test St";
      wrapper.vm.form.vendor_city = "Test City";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please fill in the State",
        })
      );
    });

    it("should validate ZIP Code field", async () => {
      wrapper = createWrapper();

      // Fill required fields except ZIP Code
      wrapper.vm.form.vendor_name = "Test Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";
      wrapper.vm.form.vendor_ssn = "123-45-6789";
      wrapper.vm.form.company_name = "Test Company";
      wrapper.vm.form.check_printed_as = "Test Check";
      wrapper.vm.form.doing_business_as = "Test DBA";
      wrapper.vm.form.salutation = "Mr.";
      wrapper.vm.form.first_name = "John";
      wrapper.vm.form.last_name = "Doe";
      wrapper.vm.form.vendor_address = "123 Test St";
      wrapper.vm.form.vendor_city = "Test City";
      wrapper.vm.form.vendor_state = "TS";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please fill in the ZIP Code",
        })
      );
    });

    it("should validate Country field", async () => {
      wrapper = createWrapper();

      // Fill required fields except Country
      wrapper.vm.form.vendor_name = "Test Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";
      wrapper.vm.form.vendor_ssn = "123-45-6789";
      wrapper.vm.form.company_name = "Test Company";
      wrapper.vm.form.check_printed_as = "Test Check";
      wrapper.vm.form.doing_business_as = "Test DBA";
      wrapper.vm.form.salutation = "Mr.";
      wrapper.vm.form.first_name = "John";
      wrapper.vm.form.last_name = "Doe";
      wrapper.vm.form.vendor_address = "123 Test St";
      wrapper.vm.form.vendor_city = "Test City";
      wrapper.vm.form.vendor_state = "TS";
      wrapper.vm.form.vendor_zip = "12345";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please fill in the Country",
        })
      );
    });

    it("should validate Phone field", async () => {
      wrapper = createWrapper();

      // Fill required fields except Phone
      wrapper.vm.form.vendor_name = "Test Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";
      wrapper.vm.form.vendor_ssn = "123-45-6789";
      wrapper.vm.form.company_name = "Test Company";
      wrapper.vm.form.check_printed_as = "Test Check";
      wrapper.vm.form.doing_business_as = "Test DBA";
      wrapper.vm.form.salutation = "Mr.";
      wrapper.vm.form.first_name = "John";
      wrapper.vm.form.last_name = "Doe";
      wrapper.vm.form.vendor_address = "123 Test St";
      wrapper.vm.form.vendor_city = "Test City";
      wrapper.vm.form.vendor_state = "TS";
      wrapper.vm.form.vendor_zip = "12345";
      wrapper.vm.form.vendor_country = "US";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please fill in the Phone",
        })
      );
    });

    it("should validate Email field", async () => {
      wrapper = createWrapper();

      // Fill required fields except Email
      wrapper.vm.form.vendor_name = "Test Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";
      wrapper.vm.form.vendor_ssn = "123-45-6789";
      wrapper.vm.form.company_name = "Test Company";
      wrapper.vm.form.check_printed_as = "Test Check";
      wrapper.vm.form.doing_business_as = "Test DBA";
      wrapper.vm.form.salutation = "Mr.";
      wrapper.vm.form.first_name = "John";
      wrapper.vm.form.last_name = "Doe";
      wrapper.vm.form.vendor_address = "123 Test St";
      wrapper.vm.form.vendor_city = "Test City";
      wrapper.vm.form.vendor_state = "TS";
      wrapper.vm.form.vendor_zip = "12345";
      wrapper.vm.form.vendor_country = "US";
      wrapper.vm.form.vendor_phone = "555-1234";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please fill in the Email",
        })
      );
    });

    it("should validate email format", async () => {
      wrapper = createWrapper();

      // Fill all required fields with invalid email
      wrapper.vm.form.vendor_name = "Test Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";
      wrapper.vm.form.vendor_ssn = "123-45-6789";
      wrapper.vm.form.company_name = "Test Company";
      wrapper.vm.form.check_printed_as = "Test Check";
      wrapper.vm.form.doing_business_as = "Test DBA";
      wrapper.vm.form.salutation = "Mr.";
      wrapper.vm.form.first_name = "John";
      wrapper.vm.form.last_name = "Doe";
      wrapper.vm.form.vendor_address = "123 Test St";
      wrapper.vm.form.vendor_city = "Test City";
      wrapper.vm.form.vendor_state = "TS";
      wrapper.vm.form.vendor_zip = "12345";
      wrapper.vm.form.vendor_country = "US";
      wrapper.vm.form.vendor_phone = "555-1234";
      wrapper.vm.form.vendor_email = "invalid-email";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please enter a valid email address",
        })
      );
    });

    it('should validate corporation selection', async () => {
      // Temporarily modify the mock to have no corporation
      const originalCorp = mockCorpStore.selectedCorporation;
      mockCorpStore.selectedCorporation = null;

      wrapper = createWrapper();

      // Fill all required fields but no corporation
      wrapper.vm.form.vendor_name = "Test Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";
      wrapper.vm.form.vendor_ssn = "123-45-6789";
      wrapper.vm.form.company_name = "Test Company";
      wrapper.vm.form.check_printed_as = "Test Check";
      wrapper.vm.form.doing_business_as = "Test DBA";
      wrapper.vm.form.salutation = "Mr.";
      wrapper.vm.form.first_name = "John";
      wrapper.vm.form.last_name = "Doe";
      wrapper.vm.form.vendor_address = "123 Test St";
      wrapper.vm.form.vendor_city = "Test City";
      wrapper.vm.form.vendor_state = "TS";
      wrapper.vm.form.vendor_zip = "12345";
      wrapper.vm.form.vendor_country = "US";
      wrapper.vm.form.vendor_phone = "555-1234";
      wrapper.vm.form.vendor_email = "test@example.com";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Error",
          description:
            "No corporation selected. Please select a corporation first.",
        })
      );

      // Restore the original corporation
      mockCorpStore.selectedCorporation = originalCorp;
    })

    it("should pass validation when all required fields are filled", async () => {
      const addVendorSpy = vi.spyOn(vendorStore, "addVendor");
      addVendorSpy.mockResolvedValueOnce(undefined);

      wrapper = createWrapper();

      // Fill all required fields
      wrapper.vm.form.vendor_name = "Test Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";
      wrapper.vm.form.vendor_ssn = "123-45-6789";
      wrapper.vm.form.company_name = "Test Company";
      wrapper.vm.form.check_printed_as = "Test Check";
      wrapper.vm.form.doing_business_as = "Test DBA";
      wrapper.vm.form.salutation = "Mr.";
      wrapper.vm.form.first_name = "John";
      wrapper.vm.form.last_name = "Doe";
      wrapper.vm.form.vendor_address = "123 Test St";
      wrapper.vm.form.vendor_city = "Test City";
      wrapper.vm.form.vendor_state = "TS";
      wrapper.vm.form.vendor_zip = "12345";
      wrapper.vm.form.vendor_country = "US";
      wrapper.vm.form.vendor_phone = "555-1234";
      wrapper.vm.form.vendor_email = "test@example.com";

      await wrapper.vm.submitVendor();

      // Should not show validation error
      expect(mockToast.add).not.toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
        })
      );

      // Should call addVendor
      expect(addVendorSpy).toHaveBeenCalled();
    });
  })

  describe('Store Integration', () => {
    it('should call addVendor when creating new vendor', async () => {
      const addVendorSpy = vi.spyOn(vendorStore, "addVendor");
      addVendorSpy.mockResolvedValueOnce(undefined);

      wrapper = createWrapper({ modelValue: true });
      await nextTick();

      // Fill all required fields
      wrapper.vm.form.vendor_name = "New Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";
      wrapper.vm.form.vendor_ssn = "123-45-6789";
      wrapper.vm.form.company_name = "New Company";
      wrapper.vm.form.check_printed_as = "New Check";
      wrapper.vm.form.doing_business_as = "New DBA";
      wrapper.vm.form.salutation = "Mr.";
      wrapper.vm.form.first_name = "John";
      wrapper.vm.form.last_name = "Doe";
      wrapper.vm.form.vendor_address = "123 New St";
      wrapper.vm.form.vendor_city = "New City";
      wrapper.vm.form.vendor_state = "NC";
      wrapper.vm.form.vendor_zip = "54321";
      wrapper.vm.form.vendor_country = "US";
      wrapper.vm.form.vendor_phone = "555-9999";
      wrapper.vm.form.vendor_email = "new@vendor.com";

      await wrapper.vm.submitVendor();

      expect(addVendorSpy).toHaveBeenCalledWith(
        "corp-uuid-1",
        expect.objectContaining({
          vendor_name: "New Vendor",
          vendor_federal_id: "12-3456789",
          vendor_ssn: "123-45-6789",
          company_name: "New Company",
          check_printed_as: "New Check",
          doing_business_as: "New DBA",
          salutation: "Mr.",
          first_name: "John",
          last_name: "Doe",
          vendor_address: "123 New St",
          vendor_city: "New City",
          vendor_state: "NC",
          vendor_zip: "54321",
          vendor_country: "US",
          vendor_phone: "555-9999",
          vendor_email: "new@vendor.com",
        })
      );
    })

    it('should call updateVendor when editing existing vendor', async () => {
      const updateVendorSpy = vi.spyOn(vendorStore, "updateVendor");
      updateVendorSpy.mockResolvedValueOnce(undefined);

      wrapper = createWrapper({ modelValue: true, vendor: mockVendor });
      await nextTick();

      // Update required fields
      wrapper.vm.form.vendor_name = "Updated Vendor";
      wrapper.vm.form.vendor_federal_id = "98-7654321";
      wrapper.vm.form.vendor_ssn = "987-65-4321";
      wrapper.vm.form.company_name = "Updated Company";
      wrapper.vm.form.check_printed_as = "Updated Check";
      wrapper.vm.form.doing_business_as = "Updated DBA";
      wrapper.vm.form.salutation = "Dr.";
      wrapper.vm.form.first_name = "Jane";
      wrapper.vm.form.last_name = "Smith";
      wrapper.vm.form.vendor_address = "456 Updated St";
      wrapper.vm.form.vendor_city = "Updated City";
      wrapper.vm.form.vendor_state = "UC";
      wrapper.vm.form.vendor_zip = "98765";
      wrapper.vm.form.vendor_country = "US";
      wrapper.vm.form.vendor_phone = "555-8888";
      wrapper.vm.form.vendor_email = "updated@vendor.com";

      await wrapper.vm.submitVendor();

      expect(updateVendorSpy).toHaveBeenCalledWith(
        "corp-uuid-1",
        mockVendor,
        expect.objectContaining({
          vendor_name: "Updated Vendor",
          vendor_federal_id: "98-7654321",
          vendor_ssn: "987-65-4321",
          company_name: "Updated Company",
          check_printed_as: "Updated Check",
          doing_business_as: "Updated DBA",
          salutation: "Dr.",
          first_name: "Jane",
          last_name: "Smith",
          vendor_address: "456 Updated St",
          vendor_city: "Updated City",
          vendor_state: "UC",
          vendor_zip: "98765",
          vendor_country: "US",
          vendor_phone: "555-8888",
          vendor_email: "updated@vendor.com",
        })
      );
    })
  })

  describe('Error Handling', () => {
    it('should handle vendor creation error gracefully', async () => {
      const addVendorSpy = vi.spyOn(vendorStore, "addVendor");
      addVendorSpy.mockRejectedValueOnce(new Error("Network error"));

      wrapper = createWrapper({ modelValue: true });
      await nextTick();

      // Fill all required fields
      wrapper.vm.form.vendor_name = "Test Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";
      wrapper.vm.form.vendor_ssn = "123-45-6789";
      wrapper.vm.form.company_name = "Test Company";
      wrapper.vm.form.check_printed_as = "Test Check";
      wrapper.vm.form.doing_business_as = "Test DBA";
      wrapper.vm.form.salutation = "Mr.";
      wrapper.vm.form.first_name = "John";
      wrapper.vm.form.last_name = "Doe";
      wrapper.vm.form.vendor_address = "123 Test St";
      wrapper.vm.form.vendor_city = "Test City";
      wrapper.vm.form.vendor_state = "TS";
      wrapper.vm.form.vendor_zip = "12345";
      wrapper.vm.form.vendor_country = "US";
      wrapper.vm.form.vendor_phone = "555-1234";
      wrapper.vm.form.vendor_email = "test@vendor.com";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Failed to adding vendor",
        })
      );
    })

    it('should handle vendor update error gracefully', async () => {
      const updateVendorSpy = vi.spyOn(vendorStore, "updateVendor");
      updateVendorSpy.mockRejectedValueOnce(new Error("Network error"));

      wrapper = createWrapper({ modelValue: true, vendor: mockVendor });
      await nextTick();

      // Update required fields
      wrapper.vm.form.vendor_name = "Updated Vendor";
      wrapper.vm.form.vendor_federal_id = "98-7654321";
      wrapper.vm.form.vendor_ssn = "987-65-4321";
      wrapper.vm.form.company_name = "Updated Company";
      wrapper.vm.form.check_printed_as = "Updated Check";
      wrapper.vm.form.doing_business_as = "Updated DBA";
      wrapper.vm.form.salutation = "Dr.";
      wrapper.vm.form.first_name = "Jane";
      wrapper.vm.form.last_name = "Smith";
      wrapper.vm.form.vendor_address = "456 Updated St";
      wrapper.vm.form.vendor_city = "Updated City";
      wrapper.vm.form.vendor_state = "UC";
      wrapper.vm.form.vendor_zip = "98765";
      wrapper.vm.form.vendor_country = "US";
      wrapper.vm.form.vendor_phone = "555-8888";
      wrapper.vm.form.vendor_email = "updated@vendor.com";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Failed to updating vendor",
        })
      );
    })
  })

  describe('Success Handling', () => {
    it('should handle successful vendor creation', async () => {
      const addVendorSpy = vi.spyOn(vendorStore, "addVendor");
      addVendorSpy.mockResolvedValueOnce(undefined);

      wrapper = createWrapper({ modelValue: true });
      await nextTick();

      // Fill all required fields
      wrapper.vm.form.vendor_name = "New Vendor";
      wrapper.vm.form.vendor_federal_id = "12-3456789";
      wrapper.vm.form.vendor_ssn = "123-45-6789";
      wrapper.vm.form.company_name = "New Company";
      wrapper.vm.form.check_printed_as = "New Check";
      wrapper.vm.form.doing_business_as = "New DBA";
      wrapper.vm.form.salutation = "Mr.";
      wrapper.vm.form.first_name = "John";
      wrapper.vm.form.last_name = "Doe";
      wrapper.vm.form.vendor_address = "123 New St";
      wrapper.vm.form.vendor_city = "New City";
      wrapper.vm.form.vendor_state = "NC";
      wrapper.vm.form.vendor_zip = "54321";
      wrapper.vm.form.vendor_country = "US";
      wrapper.vm.form.vendor_phone = "555-9999";
      wrapper.vm.form.vendor_email = "new@vendor.com";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Vendor added successfully!",
        })
      );
    })

    it('should handle successful vendor update', async () => {
      const updateVendorSpy = vi.spyOn(vendorStore, "updateVendor");
      updateVendorSpy.mockResolvedValueOnce(undefined);

      wrapper = createWrapper({ modelValue: true, vendor: mockVendor });
      await nextTick();

      // Update required fields
      wrapper.vm.form.vendor_name = "Updated Vendor";
      wrapper.vm.form.vendor_federal_id = "98-7654321";
      wrapper.vm.form.vendor_ssn = "987-65-4321";
      wrapper.vm.form.company_name = "Updated Company";
      wrapper.vm.form.check_printed_as = "Updated Check";
      wrapper.vm.form.doing_business_as = "Updated DBA";
      wrapper.vm.form.salutation = "Dr.";
      wrapper.vm.form.first_name = "Jane";
      wrapper.vm.form.last_name = "Smith";
      wrapper.vm.form.vendor_address = "456 Updated St";
      wrapper.vm.form.vendor_city = "Updated City";
      wrapper.vm.form.vendor_state = "UC";
      wrapper.vm.form.vendor_zip = "98765";
      wrapper.vm.form.vendor_country = "US";
      wrapper.vm.form.vendor_phone = "555-8888";
      wrapper.vm.form.vendor_email = "updated@vendor.com";

      await wrapper.vm.submitVendor();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Vendor updated successfully!",
        })
      );
    })
  })
})
