import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import FreightSelect from '../../../../components/Shared/FreightSelect.vue'
import { createPinia, setActivePinia } from 'pinia'
import { useFreightStore } from '../../../../stores/freightGlobal'

vi.mock('../../../../stores/freightGlobal')

describe('FreightSelect', () => {
  let pinia: any

  const active = [
    { id: 1, uuid: 'f-1', ship_via: 'Carrier A', active: true },
    { id: 2, uuid: 'f-2', ship_via: 'Carrier B', active: true },
  ] as any

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    vi.mocked(useFreightStore).mockReturnValue({
      loading: false,
      getActiveFreight: active,
      fetchFreight: vi.fn().mockResolvedValue(undefined)
    } as any)
  })

  const createWrapper = () => mount(FreightSelect, {
    props: { modelValue: undefined },
    global: {
      plugins: [pinia],
      stubs: {
        USelectMenu: {
          template: '<select @change="$emit(\'update:modelValue\', { value: items[0]?.value, label: items[0]?.label })"></select>',
          props: ['modelValue','items','loading','disabled','placeholder','size','class','valueAttribute','optionAttribute','searchable','searchablePlaceholder'],
          emits: ['update:modelValue']
        }
      }
    }
  })

  it('builds options from active freight', () => {
    const wrapper = createWrapper()
    const opts = (wrapper.vm as any).options
    expect(opts.length).toBe(2)
    expect(opts[0].label).toBe('Carrier A')
  })

  it('emits update on selection', async () => {
    const wrapper = createWrapper()
    await wrapper.find('select').trigger('change')
    const emitted = wrapper.emitted('update:modelValue')?.[0]?.[0]
    expect(emitted).toBeDefined()
  })
})
