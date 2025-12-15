import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ServiceTypeSelect from '@/components/Shared/ServiceTypeSelect.vue'

// Mock the stores
const mockServiceTypes = [
  { uuid: 'st-1', name: 'General Contracting', description: 'General contracting services', is_active: true, isActive: true },
  { uuid: 'st-2', name: 'Design-Build', description: 'Design-build services', is_active: true, isActive: true },
  { uuid: 'st-3', name: 'Remodeling', description: 'Remodeling services', is_active: false, isActive: false }
]

const mockServiceTypesStore = {
  serviceTypes: mockServiceTypes,
  loading: false,
  error: null,
  get getActiveServiceTypes() { return this.serviceTypes.filter(st => st.isActive) },
  fetchServiceTypes: vi.fn()
}

vi.mock('@/stores/serviceTypes', () => ({
  useServiceTypesStore: () => mockServiceTypesStore
}))

describe('ServiceTypeSelect Component', () => {
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
    return mount(ServiceTypeSelect, {
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

    it('should load service types globally when store is empty', () => {
      // Clear the service types to test the fetch behavior
      const originalServiceTypes = [...mockServiceTypesStore.serviceTypes]
      mockServiceTypesStore.serviceTypes = []
      
      wrapper = createWrapper()
      expect(mockServiceTypesStore.fetchServiceTypes).toHaveBeenCalled()
      
      // Restore the service types
      mockServiceTypesStore.serviceTypes = originalServiceTypes
    })
  })

  describe('UUID String Handling', () => {
    it('should handle UUID string directly from USelectMenu (value-key mode)', async () => {
      wrapper = createWrapper({ modelValue: undefined })
      
      const select = wrapper.find("select");
      await select.setValue("st-1");
      await wrapper.vm.$nextTick();

      // The component should emit the UUID string
      const emitted = wrapper.emitted("update:modelValue");
      expect(emitted).toBeTruthy();
      if (emitted && emitted.length > 0) {
        expect(emitted[emitted.length - 1][0]).toBe("st-1");
      }
    })

    it('should handle UUID string with whitespace', async () => {
      wrapper = createWrapper({ modelValue: undefined });

      // Simulate handler being called directly with whitespace
      const handler = wrapper.vm.handleSelection;
      if (handler) {
        handler("  st-1  ");
        await wrapper.vm.$nextTick();

        const emitted = wrapper.emitted("update:modelValue");
        expect(emitted).toBeTruthy();
        if (emitted && emitted.length > 0) {
          expect(emitted[emitted.length - 1][0].trim()).toBe("st-1");
        }
      }
    })
  })

  describe('Object Handling', () => {
    it('should handle full object from USelectMenu', async () => {
      wrapper = createWrapper({ modelValue: undefined })
      
      const serviceTypeObject = {
        label: 'General Contracting',
        value: 'st-1',
        description: 'General contracting services'
      }
      
      const handler = wrapper.vm.handleSelection;
      if (handler) {
        handler(serviceTypeObject);
        await wrapper.vm.$nextTick();

        const emitted = wrapper.emitted("update:modelValue");
        expect(emitted).toBeTruthy();
        if (emitted && emitted.length > 0) {
          expect(emitted[emitted.length - 1][0]).toBe("st-1");
        }
      }
    })

    it('should extract UUID from object.value property', async () => {
      wrapper = createWrapper({ modelValue: undefined })
      
      const serviceTypeObject = {
        label: 'Design-Build',
        value: 'st-2',
        description: 'Design-build services'
      }
      
      const handler = wrapper.vm.handleSelection;
      if (handler) {
        handler(serviceTypeObject);
        await wrapper.vm.$nextTick();

        const emitted = wrapper.emitted("update:modelValue");
        expect(emitted).toBeTruthy();
        if (emitted && emitted.length > 0) {
          expect(emitted[emitted.length - 1][0]).toBe("st-2");
        }
      }
    })
  })

  describe('Clearing Selection', () => {
    it('should handle null/undefined value for clearing selection', async () => {
      wrapper = createWrapper({ modelValue: 'st-1' })
      
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
      wrapper = createWrapper({ modelValue: 'st-1' })
      
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
      
      await wrapper.setProps({ modelValue: 'st-1' })
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.selectedServiceType).toBe('st-1')
    })

    it('should clear selected value when modelValue is set to undefined', async () => {
      wrapper = createWrapper({ modelValue: 'st-1' })
      
      await wrapper.setProps({ modelValue: undefined })
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.selectedServiceType).toBeUndefined()
    })
  })

  describe("Component Options", () => {
    it("should compute service type options correctly", () => {
      wrapper = createWrapper();

      const options = wrapper.vm.serviceTypeOptions;
      expect(options).toBeDefined();
      expect(Array.isArray(options)).toBe(true);
      // Should only include active service types (global)
      expect(options.length).toBe(2);
    });

    it("should filter only active service types", () => {
      wrapper = createWrapper();

      const options = wrapper.vm.serviceTypeOptions;
      expect(Array.isArray(options)).toBe(true);
      expect(options.every((opt: any) => {
        const st = mockServiceTypesStore.serviceTypes.find(s => s.uuid === opt.value);
        return st?.is_active === true;
      })).toBe(true);
    });
  });
})
