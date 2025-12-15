import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import UOMSelect from '@/components/Shared/UOMSelect.vue'
import { useUOMStore } from '@/stores/uom'

vi.mock('@/stores/uom')

describe('UOMSelect', () => {
  let pinia: any

  const mockActiveUOM = [
    { uuid: 'u1', corporation_uuid: 'corp-1', uom_name: 'Number', short_name: 'nos', status: 'ACTIVE' },
    { uuid: 'u2', corporation_uuid: 'corp-1', uom_name: 'Kilogram', short_name: 'kg', status: 'ACTIVE' }
  ] as any

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    vi.mocked(useUOMStore).mockReturnValue({
      loading: false,
      getActiveUOM: vi.fn().mockReturnValue(mockActiveUOM),
      fetchUOM: vi.fn().mockResolvedValue(undefined),
    } as any);
  })

  const createWrapper = (props = {}) => {
    return mount(UOMSelect, {
      props: {
        modelValue: undefined,
        ...props,
      },
      global: {
        plugins: [pinia],
        stubs: {
          USelectMenu: {
            template:
              '<select :disabled="disabled" @change="$emit(\'update:modelValue\', { value: $event.target.value, label: $event.target.value })"><option v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
            props: [
              "modelValue",
              "items",
              "loading",
              "disabled",
              "placeholder",
              "size",
              "class",
              "valueAttribute",
              "optionAttribute",
              "searchable",
              "searchablePlaceholder",
            ],
            emits: ["update:modelValue"],
          },
        },
      },
    });
  }

  it('lists active UOMs from the store', () => {
    const wrapper = createWrapper()
    const opts = (wrapper.vm as any).uomOptions
    expect(opts.length).toBe(2)
    expect(opts[0].label).toBe('nos')
    expect(opts[1].label).toBe('kg')
  })

  it('emits update:modelValue on selection', async () => {
    const wrapper = createWrapper()
    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)
    await select.setValue("u2");

    const emitted = wrapper.emitted('update:modelValue')?.[0]?.[0]
    expect(emitted).toBe("u2");
  })

  it("is enabled globally (no corporation required)", () => {
    const wrapper = createWrapper();
    const select = wrapper.find("select");
    expect(select.attributes("disabled")).toBeUndefined();
  });
})
