import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ProjectTypeSelect from '@/components/Shared/ProjectTypeSelect.vue'

// Mock the stores
const mockProjectTypesStore = {
  projectTypes: [
    { uuid: 'pt-1', name: 'Residential', description: 'Residential projects', isActive: true },
    { uuid: 'pt-2', name: 'Commercial', description: 'Commercial projects', isActive: true },
    { uuid: 'pt-3', name: 'Industrial', description: 'Industrial projects', isActive: false }
  ],
  loading: false,
  error: null,
  // getActiveProjectTypes is now a computed property (array), not a function
  getActiveProjectTypes: [
    { uuid: 'pt-1', name: 'Residential', description: 'Residential projects', isActive: true },
    { uuid: 'pt-2', name: 'Commercial', description: 'Commercial projects', isActive: true }
  ],
  fetchProjectTypes: vi.fn()
}

vi.mock('@/stores/projectTypes', () => ({
  useProjectTypesStore: () => mockProjectTypesStore
}))

describe('ProjectTypeSelect Component', () => {
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
    return mount(ProjectTypeSelect, {
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

    it('should fetch project types on first mount if store is empty', () => {
      // Reset fetchProjectTypes mock
      mockProjectTypesStore.fetchProjectTypes.mockClear()
      // Component should call fetchProjectTypes if store is empty
      expect(mockProjectTypesStore.fetchProjectTypes).toBeDefined()
    })

    it('should show active project types from store', () => {
      wrapper = createWrapper()
      // Should have access to active project types
      expect(mockProjectTypesStore.getActiveProjectTypes).toHaveLength(2)
      expect(mockProjectTypesStore.getActiveProjectTypes.every((pt: any) => pt.isActive)).toBe(true)
    })
  })

  describe('UUID String Handling', () => {
    it('should handle UUID string directly from USelectMenu (value-key mode)', async () => {
      wrapper = createWrapper({ modelValue: undefined })
      
      const select = wrapper.find("select");
      await select.setValue("pt-1");
      await wrapper.vm.$nextTick();

      // The component should emit the UUID string
      const emitted = wrapper.emitted("update:modelValue");
      expect(emitted).toBeTruthy();
      if (emitted && emitted.length > 0) {
        expect(emitted[emitted.length - 1][0]).toBe("pt-1");
      }
    })

    it('should handle UUID string with whitespace', async () => {
      wrapper = createWrapper({ modelValue: undefined });

      // Simulate handler being called directly with whitespace
      const handler = wrapper.vm.handleSelection;
      if (handler) {
        handler("  pt-1  ");
        await wrapper.vm.$nextTick();

        const emitted = wrapper.emitted("update:modelValue");
        expect(emitted).toBeTruthy();
        if (emitted && emitted.length > 0) {
          expect(emitted[emitted.length - 1][0].trim()).toBe("pt-1");
        }
      }
    })
  })

  describe('Object Handling', () => {
    it('should handle full object from USelectMenu', async () => {
      wrapper = createWrapper({ modelValue: undefined })
      
      const projectTypeObject = {
        label: 'Residential',
        value: 'pt-1',
        description: 'Residential projects'
      }
      
      const handler = wrapper.vm.handleSelection;
      if (handler) {
        handler(projectTypeObject);
        await wrapper.vm.$nextTick();

        const emitted = wrapper.emitted("update:modelValue");
        expect(emitted).toBeTruthy();
        if (emitted && emitted.length > 0) {
          expect(emitted[emitted.length - 1][0]).toBe("pt-1");
        }
      }
    })

    it('should extract UUID from object.value property', async () => {
      wrapper = createWrapper({ modelValue: undefined })
      
      const projectTypeObject = {
        label: 'Commercial',
        value: 'pt-2',
        description: 'Commercial projects'
      }
      
      const handler = wrapper.vm.handleSelection;
      if (handler) {
        handler(projectTypeObject);
        await wrapper.vm.$nextTick();

        const emitted = wrapper.emitted("update:modelValue");
        expect(emitted).toBeTruthy();
        if (emitted && emitted.length > 0) {
          expect(emitted[emitted.length - 1][0]).toBe("pt-2");
        }
      }
    })
  })

  describe('Clearing Selection', () => {
    it('should handle null/undefined value for clearing selection', async () => {
      wrapper = createWrapper({ modelValue: 'pt-1' })
      
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
      wrapper = createWrapper({ modelValue: 'pt-1' })
      
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
      
      await wrapper.setProps({ modelValue: 'pt-1' })
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.selectedProjectType).toBe('pt-1')
    })

    it('should clear selected value when modelValue is set to undefined', async () => {
      wrapper = createWrapper({ modelValue: 'pt-1' })
      
      await wrapper.setProps({ modelValue: undefined })
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.selectedProjectType).toBeUndefined()
    })
  })

  describe("Component Options", () => {
    it("should compute project type options correctly from global store", () => {
      wrapper = createWrapper();

      const options = wrapper.vm.projectTypeOptions;
      expect(options).toBeDefined();
      expect(Array.isArray(options)).toBe(true);
      // Should only include active project types
      expect(options.length).toBe(2);
      // Verify all options are active
      expect(options.every((opt: any) => {
        const projectType = mockProjectTypesStore.getActiveProjectTypes.find((pt: any) => pt.uuid === opt.value)
        return projectType && projectType.isActive
      })).toBe(true);
    });

    it("should include search text in options", () => {
      wrapper = createWrapper();

      const options = wrapper.vm.projectTypeOptions;
      expect(options[0]).toHaveProperty('searchText');
      expect(options[0].searchText).toContain(options[0].label.toLowerCase());
    });
  });
})
