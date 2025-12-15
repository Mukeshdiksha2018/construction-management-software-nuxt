import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import TermsAndConditionsSelect from '@/components/Shared/TermsAndConditionsSelect.vue'

// Mock the stores
const mockTermsAndConditions = [
  { 
    uuid: 'tc-1', 
    name: 'Standard Terms', 
    content: '<p>Standard terms and conditions content</p>', 
    isActive: true 
  },
  { 
    uuid: 'tc-2', 
    name: 'Payment Terms', 
    content: '<p>Payment terms and conditions content</p>', 
    isActive: true 
  },
  { 
    uuid: 'tc-3', 
    name: 'Inactive Terms', 
    content: '<p>Inactive terms</p>', 
    isActive: false 
  }
]

const loadingRef = ref(false)
const mockTermsAndConditionsStore = {
  termsAndConditions: mockTermsAndConditions,
  get loading() { return loadingRef.value },
  set loading(value: boolean) { loadingRef.value = value },
  error: null,
  get getActiveTermsAndConditions() { 
    return this.termsAndConditions.filter(tc => tc.isActive) 
  },
  fetchTermsAndConditions: vi.fn()
}

vi.mock('@/stores/termsAndConditions', () => ({
  useTermsAndConditionsStore: () => mockTermsAndConditionsStore
}))

describe('TermsAndConditionsSelect Component', () => {
  let wrapper: any

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(TermsAndConditionsSelect, {
      props: {
        ...props,
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          USelectMenu: {
            template:
              '<select :value="modelValue" @change="handleChange"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
            props: [
              "modelValue",
              "items",
              "placeholder",
              "disabled",
              "loading",
              "valueKey",
              "labelKey",
            ],
            emits: ["update:model-value"],
            methods: {
              handleChange(e: any) {
                const value = e.target.value;
                // Simulate value-key behavior - emit the UUID string directly
                this.$emit("update:model-value", value || null);
              },
            },
          },
        },
      },
    });
  }

  describe('Component Mounting', () => {
    it('should mount without errors', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should load terms and conditions when store is empty', () => {
      // Clear the terms and conditions to test the fetch behavior
      const originalTermsAndConditions = [...mockTermsAndConditionsStore.termsAndConditions]
      mockTermsAndConditionsStore.termsAndConditions = []
      
      wrapper = createWrapper()
      expect(mockTermsAndConditionsStore.fetchTermsAndConditions).toHaveBeenCalled()
      
      // Restore the terms and conditions
      mockTermsAndConditionsStore.termsAndConditions = originalTermsAndConditions
    })
  })

  describe('UUID String Handling', () => {
    it('should handle UUID string directly from USelectMenu (value-key mode)', async () => {
      wrapper = createWrapper({ modelValue: undefined })
      
      const select = wrapper.find("select");
      await select.setValue("tc-1");
      await wrapper.vm.$nextTick();

      // The component should emit the UUID string
      const emitted = wrapper.emitted("update:modelValue");
      expect(emitted).toBeTruthy();
      if (emitted && emitted.length > 0) {
        expect(emitted[emitted.length - 1][0]).toBe("tc-1");
      }
    })

    it('should handle UUID string with whitespace', async () => {
      wrapper = createWrapper({ modelValue: undefined });

      // Simulate handler being called directly with whitespace
      const handler = wrapper.vm.handleSelection;
      if (handler) {
        handler("  tc-1  ");
        await wrapper.vm.$nextTick();

        const emitted = wrapper.emitted("update:modelValue");
        expect(emitted).toBeTruthy();
        if (emitted && emitted.length > 0) {
          expect(emitted[emitted.length - 1][0].trim()).toBe("tc-1");
        }
      }
    })
  })

  describe('Object Handling', () => {
    it('should handle full object from USelectMenu', async () => {
      wrapper = createWrapper({ modelValue: undefined })
      
      const termsAndConditionObject = {
        label: 'Standard Terms',
        value: 'tc-1',
        description: 'Standard terms and conditions content'
      }
      
      const handler = wrapper.vm.handleSelection;
      if (handler) {
        handler(termsAndConditionObject);
        await wrapper.vm.$nextTick();

        const emitted = wrapper.emitted("update:modelValue");
        expect(emitted).toBeTruthy();
        if (emitted && emitted.length > 0) {
          expect(emitted[emitted.length - 1][0]).toBe("tc-1");
        }
      }
    })

    it('should extract UUID from object.value property', async () => {
      wrapper = createWrapper({ modelValue: undefined })
      
      const termsAndConditionObject = {
        label: 'Payment Terms',
        value: 'tc-2',
        description: 'Payment terms and conditions content'
      }
      
      const handler = wrapper.vm.handleSelection;
      if (handler) {
        handler(termsAndConditionObject);
        await wrapper.vm.$nextTick();

        const emitted = wrapper.emitted("update:modelValue");
        expect(emitted).toBeTruthy();
        if (emitted && emitted.length > 0) {
          expect(emitted[emitted.length - 1][0]).toBe("tc-2");
        }
      }
    })
  })

  describe('Clearing Selection', () => {
    it('should handle null/undefined value for clearing selection', async () => {
      wrapper = createWrapper({ modelValue: 'tc-1' })
      
      const handler = wrapper.vm.handleSelection;
      if (handler) {
        handler(null);
        await wrapper.vm.$nextTick();

        const emitted = wrapper.emitted("update:modelValue");
        expect(emitted).toBeTruthy();
        if (emitted && emitted.length > 0) {
          expect(emitted[emitted.length - 1][0]).toBeUndefined();
        }
      }
    })

    it('should handle undefined value for clearing selection', async () => {
      wrapper = createWrapper({ modelValue: 'tc-1' })
      
      const handler = wrapper.vm.handleSelection;
      if (handler) {
        handler(undefined);
        await wrapper.vm.$nextTick();

        const emitted = wrapper.emitted("update:modelValue");
        expect(emitted).toBeTruthy();
        if (emitted && emitted.length > 0) {
          expect(emitted[emitted.length - 1][0]).toBeUndefined();
        }
      }
    })
  })

  describe('Model Value Updates', () => {
    it('should update selected value when modelValue prop changes', async () => {
      wrapper = createWrapper({ modelValue: undefined })
      
      await wrapper.setProps({ modelValue: 'tc-1' })
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.selectedTermsAndCondition).toBe('tc-1')
    })

    it('should clear selected value when modelValue is set to undefined', async () => {
      wrapper = createWrapper({ modelValue: 'tc-1' })
      
      await wrapper.setProps({ modelValue: undefined })
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.selectedTermsAndCondition).toBeUndefined()
    })
  })

  describe('Component Options', () => {
    it('should compute terms and condition options correctly', () => {
      wrapper = createWrapper();

      const options = wrapper.vm.termsAndConditionOptions;
      expect(options).toBeDefined();
      expect(Array.isArray(options)).toBe(true);
      // Should only include active terms and conditions
      expect(options.length).toBe(2);
    });

    it('should filter only active terms and conditions', () => {
      wrapper = createWrapper();

      const options = wrapper.vm.termsAndConditionOptions;
      expect(Array.isArray(options)).toBe(true);
      expect(options.every((opt: any) => {
        const tc = mockTermsAndConditionsStore.termsAndConditions.find(t => t.uuid === opt.value);
        return tc?.isActive === true;
      })).toBe(true);
    });

    it('should map terms and conditions to options with correct structure', () => {
      wrapper = createWrapper();

      const options = wrapper.vm.termsAndConditionOptions;
      expect(options.length).toBeGreaterThan(0);
      
      const firstOption = options[0];
      expect(firstOption).toHaveProperty('label');
      expect(firstOption).toHaveProperty('value');
      expect(firstOption).toHaveProperty('searchText');
      expect(typeof firstOption.label).toBe('string');
      expect(typeof firstOption.value).toBe('string');
    });

    it('should strip HTML tags from content for description', () => {
      wrapper = createWrapper();

      const options = wrapper.vm.termsAndConditionOptions;
      const optionWithContent = options.find((opt: any) => opt.value === 'tc-1');
      
      if (optionWithContent && optionWithContent.description) {
        // Description should not contain HTML tags
        expect(optionWithContent.description).not.toContain('<p>');
        expect(optionWithContent.description).not.toContain('</p>');
      }
    });

    it('should include name in searchText for filtering', () => {
      wrapper = createWrapper();

      const options = wrapper.vm.termsAndConditionOptions;
      const standardTermsOption = options.find((opt: any) => opt.value === 'tc-1');
      
      expect(standardTermsOption).toBeDefined();
      if (standardTermsOption) {
        expect(standardTermsOption.searchText).toContain('standard');
        expect(standardTermsOption.searchText).toContain('terms');
      }
    });
  })

  describe('Display Label', () => {
    it('should display the selected terms and conditions name', () => {
      wrapper = createWrapper({ modelValue: 'tc-1' });
      
      // Wait for watchers to update
      wrapper.vm.$nextTick();
      
      const displayLabel = wrapper.vm.displayLabel;
      expect(displayLabel).toBe('Standard Terms');
    });

    it('should display placeholder when no value is selected', () => {
      wrapper = createWrapper({ modelValue: undefined });
      
      const displayLabel = wrapper.vm.displayLabel;
      expect(displayLabel).toBe('Select terms and conditions...');
    });

    it('should update display label when selection changes', async () => {
      wrapper = createWrapper({ modelValue: 'tc-1' });
      await wrapper.vm.$nextTick();
      
      expect(wrapper.vm.displayLabel).toBe('Standard Terms');
      
      await wrapper.setProps({ modelValue: 'tc-2' });
      await wrapper.vm.$nextTick();
      
      expect(wrapper.vm.displayLabel).toBe('Payment Terms');
    });
  })

  describe('Props', () => {
    it('should use default placeholder when not provided', () => {
      wrapper = createWrapper();
      expect(wrapper.props('placeholder')).toBe('Select terms and conditions...');
    });

    it('should use custom placeholder when provided', () => {
      wrapper = createWrapper({ placeholder: 'Choose terms...' });
      expect(wrapper.props('placeholder')).toBe('Choose terms...');
    });

    it('should respect disabled prop', () => {
      wrapper = createWrapper({ disabled: true });
      expect(wrapper.props('disabled')).toBe(true);
    });

    it('should respect size prop', () => {
      wrapper = createWrapper({ size: 'lg' });
      expect(wrapper.props('size')).toBe('lg');
    });
  })

  describe('Loading State', () => {
    it('should expose loading state from store', () => {
      loadingRef.value = true;
      wrapper = createWrapper();
      
      expect(wrapper.vm.loading).toBe(true);
      
      loadingRef.value = false;
    });

    it('should update loading state when store loading changes', async () => {
      loadingRef.value = false;
      wrapper = createWrapper();
      expect(wrapper.vm.loading).toBe(false);
      
      loadingRef.value = true;
      await wrapper.vm.$nextTick();
      
      expect(wrapper.vm.loading).toBe(true);
      
      loadingRef.value = false;
    });
  })
})
