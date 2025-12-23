import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import CustomerForm from '@/components/Customers/CustomerForm.vue'
import { flushPromises } from '@vue/test-utils'

// Mock composables
const mockToast = {
  add: vi.fn()
}

vi.stubGlobal('useToast', () => mockToast)

// Mock stores
const mockCustomerStore = {
  addCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  loading: ref(false)
}

const mockCorpStore = {
  selectedCorporation: {
    uuid: 'corp-uuid-1',
    property_name: 'Test Corporation'
  },
  corporations: [
    {
      uuid: 'corp-uuid-1',
      property_name: 'Test Corporation'
    }
  ],
  ensureReady: vi.fn(() => Promise.resolve())
}

vi.mock('@/stores/customers', () => ({
  useCustomerStore: () => mockCustomerStore
}))

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockCorpStore
}))

// Mock $fetch for image upload
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('CustomerForm Component', () => {
  let wrapper: any

  const mockCustomer = {
    uuid: 'customer-uuid-1',
    corporation_uuid: 'corp-uuid-1',
    project_uuid: 'project-uuid-1',
    customer_address: '123 Test St',
    customer_city: 'Test City',
    customer_state: 'TS',
    customer_country: 'US',
    customer_zip: '12345',
    customer_phone: '555-1234',
    customer_email: 'test@customer.com',
    company_name: 'Test Company',
    salutation: 'Mr.',
    first_name: 'John',
    middle_name: 'A',
    last_name: 'Doe',
    profile_image_url: 'https://example.com/image.jpg',
    is_active: true
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    mockToast.add.mockClear()
    mockCustomerStore.addCustomer.mockClear()
    mockCustomerStore.updateCustomer.mockClear()
    mockFetch.mockClear()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(CustomerForm, {
      props: {
        modelValue: true,
        customer: null,
        ...props
      },
      global: {
        stubs: {
          UModal: {
            template: '<div><slot name="body" /><slot name="footer" /></div>',
            props: ['open', 'title', 'description']
          },
          UInput: {
            template: '<input v-bind="$attrs" />',
            props: ['modelValue']
          },
          USelect: {
            template: '<select v-bind="$attrs" />',
            props: ['modelValue']
          },
          UTextarea: {
            template: '<textarea v-bind="$attrs" />',
            props: ['modelValue']
          },
          UButton: {
            template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
            props: ['color', 'variant', 'icon', 'disabled', 'loading']
          },
          UIcon: { template: '<span />' },
          CorporationSelect: {
            template: '<select v-bind="$attrs" @change="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ['modelValue'],
            emits: ['update:modelValue']
          },
          ProjectSelect: {
            template: '<select v-bind="$attrs" @change="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ['modelValue', 'corporationUuid', 'disabled'],
            emits: ['update:modelValue']
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

    it('should have correct initial state', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.showModal).toBe(true)
      expect(wrapper.vm.editingCustomer).toBe(false)
      expect(wrapper.vm.submitting).toBe(false)
    })
  })

  describe('Form Operations', () => {
    it('should reset form correctly', async () => {
      wrapper = createWrapper({ modelValue: true })
      await nextTick()
      
      // Fill some form data
      wrapper.vm.form.first_name = 'Test'
      wrapper.vm.form.last_name = 'Customer'
      wrapper.vm.form.customer_email = 'test@example.com'
      
      // Reset form
      wrapper.vm.resetForm()
      
      expect(wrapper.vm.form.first_name).toBe('')
      expect(wrapper.vm.form.last_name).toBe('')
      expect(wrapper.vm.form.customer_email).toBe('')
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
      expect(wrapper.vm.form.first_name).toBe('')
    })

    it('should populate form when editing customer', async () => {
      wrapper = createWrapper({ modelValue: false, customer: null })
      await nextTick()
      
      // Trigger the watch by changing the props
      await wrapper.setProps({ modelValue: true, customer: mockCustomer })
      await nextTick()
      
      expect(wrapper.vm.form.first_name).toBe('John')
      expect(wrapper.vm.form.last_name).toBe('Doe')
      expect(wrapper.vm.form.customer_email).toBe('test@customer.com')
      expect(wrapper.vm.form.corporation_uuid).toBe('corp-uuid-1')
    })
  })

  describe('Form Validation', () => {
    it('should validate corporation_uuid is required', async () => {
      wrapper = createWrapper()
      await nextTick()

      wrapper.vm.form.corporation_uuid = ''
      wrapper.vm.form.first_name = 'John'
      wrapper.vm.form.last_name = 'Doe'

      await wrapper.vm.submitCustomer()

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Validation Error',
          description: 'Please select a corporation',
        })
      )
    })

    it('should validate first_name is required', async () => {
      wrapper = createWrapper()
      await nextTick()

      wrapper.vm.form.corporation_uuid = 'corp-uuid-1'
      wrapper.vm.form.first_name = ''
      wrapper.vm.form.last_name = 'Doe'

      await wrapper.vm.submitCustomer()

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Validation Error',
          description: 'Please enter a first name',
        })
      )
    })

    it('should validate last_name is required', async () => {
      wrapper = createWrapper()
      await nextTick()

      wrapper.vm.form.corporation_uuid = 'corp-uuid-1'
      wrapper.vm.form.first_name = 'John'
      wrapper.vm.form.last_name = ''

      await wrapper.vm.submitCustomer()

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Validation Error',
          description: 'Please enter a last name',
        })
      )
    })

    it('should validate email format', async () => {
      wrapper = createWrapper()
      await nextTick()

      wrapper.vm.form.corporation_uuid = 'corp-uuid-1'
      wrapper.vm.form.first_name = 'John'
      wrapper.vm.form.last_name = 'Doe'
      wrapper.vm.form.customer_email = 'invalid-email'

      await wrapper.vm.submitCustomer()

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Validation Error',
          description: 'Please enter a valid email address',
        })
      )
    })
  })

  describe('Image Upload', () => {
    it('should handle image selection', async () => {
      wrapper = createWrapper()
      await nextTick()

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(function() {
          this.onload({ target: { result: 'data:image/jpeg;base64,test' } })
        }),
        onload: null as any,
        onerror: null as any
      }
      global.FileReader = vi.fn(() => mockFileReader) as any

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const event = {
        target: {
          files: [file]
        }
      } as any

      await wrapper.vm.handleImageSelect(event)
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10)) // Wait for FileReader

      expect(wrapper.vm.profileImageFile).toBeTruthy()
      expect(wrapper.vm.profileImagePreview).toBeTruthy()
    })

    it('should validate image file size', async () => {
      wrapper = createWrapper()
      await nextTick()

      // Create a file larger than 5MB
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
      const event = {
        target: {
          files: [largeFile]
        }
      } as any

      await wrapper.vm.handleImageSelect(event)
      await nextTick()

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'File Too Large',
          description: 'Image size must be less than 5MB',
        })
      )
    })

    it('should validate image file type', async () => {
      wrapper = createWrapper()
      await nextTick()

      const invalidFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const event = {
        target: {
          files: [invalidFile]
        }
      } as any

      await wrapper.vm.handleImageSelect(event)
      await nextTick()

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Invalid File',
          description: 'Please select an image file',
        })
      )
    })

    it('should remove profile image', async () => {
      wrapper = createWrapper()
      await nextTick()

      wrapper.vm.profileImagePreview = 'data:image/jpeg;base64,test'
      wrapper.vm.profileImageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      await wrapper.vm.removeProfileImage()
      await nextTick()

      expect(wrapper.vm.profileImagePreview).toBe(null)
      expect(wrapper.vm.profileImageFile).toBe(null)
    })
  })

  describe('Form Submission', () => {
    it('should create customer successfully', async () => {
      wrapper = createWrapper()
      await nextTick()

      wrapper.vm.form.corporation_uuid = 'corp-uuid-1'
      wrapper.vm.form.first_name = 'John'
      wrapper.vm.form.last_name = 'Doe'
      wrapper.vm.form.customer_email = 'test@customer.com'

      mockCustomerStore.addCustomer.mockResolvedValue({
        success: true,
        data: { uuid: 'customer-1', ...wrapper.vm.form }
      })

      await wrapper.vm.submitCustomer()
      await flushPromises()

      expect(mockCustomerStore.addCustomer).toHaveBeenCalledWith(
        'corp-uuid-1',
        expect.objectContaining({
          first_name: 'John',
          last_name: 'Doe',
          customer_email: 'test@customer.com'
        })
      )
    })

    it('should update customer successfully', async () => {
      wrapper = createWrapper({ customer: mockCustomer })
      await nextTick()
      await flushPromises() // Wait for watcher to populate form

      wrapper.vm.form.corporation_uuid = 'corp-uuid-1'
      wrapper.vm.form.first_name = 'Jane'
      wrapper.vm.form.last_name = 'Smith'

      mockCustomerStore.updateCustomer.mockResolvedValue({
        success: true,
        data: { ...mockCustomer, first_name: 'Jane', last_name: 'Smith' }
      })

      await wrapper.vm.submitCustomer()
      await flushPromises()

      expect(mockCustomerStore.updateCustomer).toHaveBeenCalledWith(
        'corp-uuid-1',
        mockCustomer,
        expect.objectContaining({
          first_name: 'Jane',
          last_name: 'Smith'
        })
      )
    })

    it('should upload image before submitting', async () => {
      wrapper = createWrapper()
      await nextTick()

      wrapper.vm.form.corporation_uuid = 'corp-uuid-1'
      wrapper.vm.form.first_name = 'John'
      wrapper.vm.form.last_name = 'Doe'

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      wrapper.vm.profileImageFile = file

      mockFetch.mockResolvedValue({
        success: true,
        data: {
          imageUrl: 'https://example.com/image.jpg',
          fileName: 'test.jpg'
        }
      })

      mockCustomerStore.addCustomer.mockResolvedValue({
        success: true,
        data: { uuid: 'customer-1' }
      })

      await wrapper.vm.submitCustomer()
      await flushPromises()

      expect(mockFetch).toHaveBeenCalled()
      expect(mockCustomerStore.addCustomer).toHaveBeenCalled()
    })

    it('should handle submission errors', async () => {
      wrapper = createWrapper()
      await nextTick()

      wrapper.vm.form.corporation_uuid = 'corp-uuid-1'
      wrapper.vm.form.first_name = 'John'
      wrapper.vm.form.last_name = 'Doe'

      mockCustomerStore.addCustomer.mockRejectedValue(new Error('Failed to create customer'))

      await wrapper.vm.submitCustomer()
      await flushPromises()

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Failed'),
        })
      )
    })
  })

  describe('Corporation and Project Selection', () => {
    it('should handle corporation change', async () => {
      wrapper = createWrapper()
      await nextTick()

      wrapper.vm.form.project_uuid = 'project-1'
      await wrapper.vm.handleCorporationChange('corp-uuid-2')
      await nextTick()

      expect(wrapper.vm.form.corporation_uuid).toBe('corp-uuid-2')
      expect(wrapper.vm.form.project_uuid).toBe(null)
    })

    it('should handle project change', async () => {
      wrapper = createWrapper()
      await nextTick()

      await wrapper.vm.handleProjectChange('project-1')
      await nextTick()

      expect(wrapper.vm.form.project_uuid).toBe('project-1')
    })
  })
})

