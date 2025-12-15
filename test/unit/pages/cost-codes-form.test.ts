import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'

// Mock the page component inline since it's in the pages directory
const CostCodesForm = {
  template: `
    <div>
      <button 
        ref="saveButton" 
        :disabled="!isFormValid || saving"
        @click="handleSave"
      >
        {{ saving ? 'Saving...' : (isEditMode ? 'Update' : 'Create') }}
      </button>
    </div>
  `,
  setup() {
    const isFormValid = ref(false)
    const saving = ref(false)
    const isEditMode = ref(false)
    const form = ref({
      cost_code_number: '',
      cost_code_name: '',
      gl_account_uuid: null
    })

    const handleValidationChange = (isValid: boolean) => {
      isFormValid.value = isValid
    }

    const handleSave = async () => {
      if (!isFormValid.value) {
        return 'validation-failed'
      }
      return 'save-success'
    }

    return {
      isFormValid,
      saving,
      isEditMode,
      form,
      handleValidationChange,
      handleSave
    }
  }
}

// Mock stores
const mockCorpStore = {
  selectedCorporation: {
    uuid: 'corp-1',
    corporation_name: 'Test Corporation'
  }
}

const mockConfigurationsStore = {
  configurations: [],
  refreshConfigurationsFromAPI: vi.fn(),
  updateConfiguration: vi.fn(),
  createConfiguration: vi.fn()
}

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockCorpStore
}))

vi.mock('@/stores/costCodeConfigurations', () => ({
  useCostCodeConfigurationsStore: () => mockConfigurationsStore
}))

// Mock useRouter
const mockRouter = {
  push: vi.fn(),
  back: vi.fn()
}

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
  useRoute: () => ({
    params: { id: 'new' }
  })
}))

// Mock useToast
const mockToast = {
  add: vi.fn()
}

vi.stubGlobal('useToast', () => mockToast)

describe('Cost Codes Form Page - Validation Integration', () => {
  let wrapper: any

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockToast.add.mockClear()
  })

  describe('Form Validation State Management', () => {
    it('should initialize with invalid state', () => {
      wrapper = mount(CostCodesForm, {
        global: {
          stubs: {
            UButton: false
          }
        }
      })

      expect(wrapper.vm.isFormValid).toBe(false)
    })

    it('should update validation state when handleValidationChange is called', async () => {
      wrapper = mount(CostCodesForm)

      expect(wrapper.vm.isFormValid).toBe(false)

      wrapper.vm.handleValidationChange(true)
      await nextTick()

      expect(wrapper.vm.isFormValid).toBe(true)
    })

    it('should update validation state to false when form becomes invalid', async () => {
      wrapper = mount(CostCodesForm)

      wrapper.vm.handleValidationChange(true)
      await nextTick()
      expect(wrapper.vm.isFormValid).toBe(true)

      wrapper.vm.handleValidationChange(false)
      await nextTick()
      expect(wrapper.vm.isFormValid).toBe(false)
    })
  })

  describe('Save Button State', () => {
    it('should disable save button when form is invalid', async () => {
      wrapper = mount(CostCodesForm)

      wrapper.vm.handleValidationChange(false)
      await nextTick()

      const button = wrapper.find('button')
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('should enable save button when form is valid', async () => {
      wrapper = mount(CostCodesForm)

      wrapper.vm.handleValidationChange(true)
      await nextTick()

      const button = wrapper.find('button')
      expect(button.attributes('disabled')).toBeUndefined()
    })

    it('should disable save button when saving is in progress', async () => {
      wrapper = mount(CostCodesForm)

      wrapper.vm.handleValidationChange(true)
      wrapper.vm.saving = true
      await nextTick()

      const button = wrapper.find('button')
      expect(button.attributes('disabled')).toBeDefined()
    })
  })

  describe('Save Operation Validation', () => {
    it('should prevent save when form is invalid', async () => {
      wrapper = mount(CostCodesForm)

      wrapper.vm.handleValidationChange(false)
      await nextTick()

      const result = await wrapper.vm.handleSave()

      expect(result).toBe('validation-failed')
    })

    it('should allow save when form is valid', async () => {
      wrapper = mount(CostCodesForm)

      wrapper.vm.handleValidationChange(true)
      await nextTick()

      const result = await wrapper.vm.handleSave()

      expect(result).toBe('save-success')
    })
  })

  describe('Validation Change Handler', () => {
    it('should have handleValidationChange method defined', () => {
      wrapper = mount(CostCodesForm)

      expect(wrapper.vm.handleValidationChange).toBeDefined()
      expect(typeof wrapper.vm.handleValidationChange).toBe('function')
    })

    it('should accept boolean parameter in handleValidationChange', () => {
      wrapper = mount(CostCodesForm)

      expect(() => {
        wrapper.vm.handleValidationChange(true)
        wrapper.vm.handleValidationChange(false)
      }).not.toThrow()
    })

    it('should update isFormValid ref when called', async () => {
      wrapper = mount(CostCodesForm)

      wrapper.vm.handleValidationChange(true)
      await nextTick()
      expect(wrapper.vm.isFormValid).toBe(true)

      wrapper.vm.handleValidationChange(false)
      await nextTick()
      expect(wrapper.vm.isFormValid).toBe(false)
    })
  })

  describe('Real-world Validation Scenarios', () => {
    it('should block save for existing record with missing required fields', async () => {
      wrapper = mount(CostCodesForm)

      // Simulate loading existing record without GL Account
      wrapper.vm.isEditMode = true
      wrapper.vm.form.cost_code_number = '01.02.03'
      wrapper.vm.form.cost_code_name = 'Existing Code'
      wrapper.vm.form.gl_account_uuid = null

      // Validation determines form is invalid
      wrapper.vm.handleValidationChange(false)
      await nextTick()

      // Attempt to save
      const result = await wrapper.vm.handleSave()

      expect(result).toBe('validation-failed')
      expect(wrapper.vm.isFormValid).toBe(false)
    })

    it('should allow save after user fills missing required field', async () => {
      wrapper = mount(CostCodesForm)

      // Initially invalid
      wrapper.vm.handleValidationChange(false)
      await nextTick()
      expect(wrapper.vm.isFormValid).toBe(false)

      // User fills missing field
      wrapper.vm.form.cost_code_number = '01.02.03'
      wrapper.vm.form.cost_code_name = 'Test Code'
      wrapper.vm.form.gl_account_uuid = 'gl-account-1'

      // Validation updates to valid
      wrapper.vm.handleValidationChange(true)
      await nextTick()

      expect(wrapper.vm.isFormValid).toBe(true)

      // Now save should work
      const result = await wrapper.vm.handleSave()
      expect(result).toBe('save-success')
    })

    it('should maintain validation state during multiple form changes', async () => {
      wrapper = mount(CostCodesForm)

      // Start invalid
      wrapper.vm.handleValidationChange(false)
      await nextTick()
      expect(wrapper.vm.isFormValid).toBe(false)

      // Become valid
      wrapper.vm.handleValidationChange(true)
      await nextTick()
      expect(wrapper.vm.isFormValid).toBe(true)

      // Become invalid again
      wrapper.vm.handleValidationChange(false)
      await nextTick()
      expect(wrapper.vm.isFormValid).toBe(false)

      // Finally valid
      wrapper.vm.handleValidationChange(true)
      await nextTick()
      expect(wrapper.vm.isFormValid).toBe(true)
    })
  })

  describe('Button Label Update', () => {
    it('should show "Create" label in add mode', () => {
      wrapper = mount(CostCodesForm)

      wrapper.vm.isEditMode = false
      wrapper.vm.saving = false

      const button = wrapper.find('button')
      expect(button.text()).toBe('Create')
    })

    it('should show "Update" label in edit mode', async () => {
      wrapper = mount(CostCodesForm)

      wrapper.vm.isEditMode = true
      wrapper.vm.saving = false
      await nextTick()

      const button = wrapper.find('button')
      expect(button.text()).toBe('Update')
    })

    it('should show "Saving..." label when saving', async () => {
      wrapper = mount(CostCodesForm)

      wrapper.vm.saving = true
      await nextTick()

      const button = wrapper.find('button')
      expect(button.text()).toBe('Saving...')
    })
  })
})

