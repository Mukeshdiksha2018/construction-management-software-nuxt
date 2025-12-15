import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ShipViaSelect from '@/components/Shared/ShipViaSelect.vue'
import { useShipViaStore } from '@/stores/freight'

vi.mock('@/stores/freight')

describe('ShipViaSelect', () => {
  let pinia: any

  const mockActive = [
    { id: 1, uuid: 'sv-1', ship_via: 'FedEx', active: true },
    { id: 2, uuid: 'sv-2', ship_via: 'UPS', active: true }
  ] as any

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    vi.mocked(useShipViaStore).mockReturnValue({
      loading: false,
      getActiveShipVia: mockActive,
      fetchShipVia: vi.fn().mockResolvedValue(undefined)
    } as any)
  })

  const createWrapper = () => mount(ShipViaSelect, {
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

  it('builds options from active ship via', () => {
    const wrapper = createWrapper()
    const opts = (wrapper.vm as any).options
    expect(Array.isArray(opts)).toBe(true)
    expect(opts.length).toBe(2)
    expect(opts[0].label).toBe('FedEx')
  })

  it('emits update on selection', async () => {
    const wrapper = createWrapper()
    await wrapper.find('select').trigger('change')
    const emitted = wrapper.emitted('update:modelValue')?.[0]?.[0]
    expect(emitted).toBeDefined()
  })
})
