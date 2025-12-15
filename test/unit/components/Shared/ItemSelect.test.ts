import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import ItemSelect from '@/components/Shared/ItemSelect.vue'

const fetchConfigurationsMock = vi.fn()
const getAllItemsMock = vi.fn()

vi.mock('@/stores/costCodeConfigurations', () => {
  const configurations = ref<any[]>([])

  return {
    useCostCodeConfigurationsStore: () => ({
      configurations,
      loading: false,
      fetchConfigurations: fetchConfigurationsMock,
      getConfigurationCountByCorporation: () => 0,
      getConfigurationById: () => null,
      getAllItems: getAllItemsMock,
      getItemsByCostCode: () => [],
    }),
  }
})

vi.mock('@/stores/estimateCreation', () => {
  return {
    useEstimateCreationStore: () => ({
      getActiveConfigurations: [],
      selectedCorporationUuid: null,
    }),
  }
})

const selectStub = {
  name: 'USelectMenu',
  props: ['modelValue', 'items'],
  emits: ['update:modelValue'],
  template: `
    <div class="item-select-stub">
      <button
        v-for="item in items"
        :key="item.value"
        class="option"
        @click="$emit('update:modelValue', item)"
      >
        {{ item.label }}
      </button>
    </div>
  `,
}

const badgeStub = {
  name: 'UBadge',
  template: '<span class="badge-stub"><slot /></span>',
}

describe('ItemSelect.vue', () => {
  beforeEach(() => {
    fetchConfigurationsMock.mockClear()
    getAllItemsMock.mockReset()
    getAllItemsMock.mockReturnValue([])
  })

  it('renders provided items', () => {
    const items = [
      { value: 'item-1', label: 'Item One' },
      { value: 'item-2', label: 'Item Two' },
    ]

    const wrapper = mount(ItemSelect, {
      props: { items },
      global: {
        stubs: {
          USelectMenu: selectStub,
          UBadge: badgeStub,
        },
      },
    })

    const text = wrapper.find('.item-select-stub').text()
    expect(text).toContain('Item One')
    expect(text).toContain('Item Two')
  })

  it('emits update and change events when selection changes', async () => {
    const items = [{ value: 'item-1', label: 'Item One', unit_price: 10 }]

    const wrapper = mount(ItemSelect, {
      props: { items },
      global: {
        stubs: {
          USelectMenu: selectStub,
          UBadge: badgeStub,
        },
      },
    })

    await wrapper.find('.option').trigger('click')

    const updateEvents = wrapper.emitted('update:modelValue') || []
    expect(updateEvents[0][0]).toBe('item-1')

    const changeEvents = wrapper.emitted('change') || []
    expect(changeEvents[0][0]).toMatchObject({
      value: 'item-1',
    })
  })

  it('requests configurations when corporation uuid is provided', async () => {
    mount(ItemSelect, {
      props: {
        corporationUuid: 'corp-123',
      },
      global: {
        stubs: {
          USelectMenu: selectStub,
          UBadge: badgeStub,
        },
      },
    })

    await nextTick()
    await flushPromises()

    expect(fetchConfigurationsMock).toHaveBeenCalledWith('corp-123')
  })

  describe('Race condition fix: value preservation during loading', () => {
    it('preserves value when options are empty (still loading)', async () => {
      const wrapper = mount(ItemSelect, {
        props: {
          modelValue: 'item-1',
          items: [], // Empty options - simulating loading state
        },
        global: {
          stubs: {
            USelectMenu: selectStub,
            UBadge: badgeStub,
          },
        },
      })

      await nextTick()
      await flushPromises()

      // Value should not be cleared when options are empty
      const clearEvents = wrapper.emitted('update:modelValue')?.filter(
        (event) => event[0] === undefined
      ) || []
      expect(clearEvents.length).toBe(0)
    })

    it('preserves value when provided items contain the value', async () => {
      const items = [
        { value: 'item-1', label: 'Item One' },
        { value: 'item-2', label: 'Item Two' },
      ]

      const wrapper = mount(ItemSelect, {
        props: {
          modelValue: 'item-1',
          items,
        },
        global: {
          stubs: {
            USelectMenu: selectStub,
            UBadge: badgeStub,
          },
        },
      })

      await nextTick()
      await flushPromises()

      // Value should not be cleared when it exists in provided items
      const clearEvents = wrapper.emitted('update:modelValue')?.filter(
        (event) => event[0] === undefined
      ) || []
      expect(clearEvents.length).toBe(0)
    })

    it('clears value only when options are loaded but value does not exist', async () => {
      const items = [
        { value: 'item-2', label: 'Item Two' },
        { value: 'item-3', label: 'Item Three' },
      ]

      const wrapper = mount(ItemSelect, {
        props: {
          modelValue: 'item-1', // Value that doesn't exist in items
          items,
        },
        global: {
          stubs: {
            USelectMenu: selectStub,
            UBadge: badgeStub,
          },
        },
      })

      await nextTick()
      await flushPromises()

      // Value should be cleared when options are loaded but value doesn't exist
      const clearEvents = wrapper.emitted('update:modelValue')?.filter(
        (event) => event[0] === undefined
      ) || []
      expect(clearEvents.length).toBeGreaterThan(0)
    })

    it('preserves value when items are provided asynchronously', async () => {
      const wrapper = mount(ItemSelect, {
        props: {
          modelValue: 'item-1',
          items: [], // Start with empty items
        },
        global: {
          stubs: {
            USelectMenu: selectStub,
            UBadge: badgeStub,
          },
        },
      })

      await nextTick()

      // Value should be preserved when items are empty
      let clearEvents = wrapper.emitted('update:modelValue')?.filter(
        (event) => event[0] === undefined
      ) || []
      expect(clearEvents.length).toBe(0)

      // Now provide items that contain the value
      await wrapper.setProps({
        items: [{ value: 'item-1', label: 'Item One' }],
      })

      await nextTick()
      await flushPromises()

      // Value should still be preserved after items are provided
      clearEvents = wrapper.emitted('update:modelValue')?.filter(
        (event) => event[0] === undefined
      ) || []
      expect(clearEvents.length).toBe(0)
    })

    it('handles store items correctly when provided items are empty', async () => {
      const storeItems = [
        {
          uuid: 'item-1',
          item_name: 'Item One',
          label: 'Item One',
        },
      ]

      getAllItemsMock.mockReturnValue(storeItems)

      const wrapper = mount(ItemSelect, {
        props: {
          modelValue: 'item-1',
          corporationUuid: 'corp-123',
          items: [], // Empty provided items, should use store items
        },
        global: {
          stubs: {
            USelectMenu: selectStub,
            UBadge: badgeStub,
          },
        },
      })

      await nextTick()
      await flushPromises()

      // Value should be preserved when it exists in store items
      const clearEvents = wrapper.emitted('update:modelValue')?.filter(
        (event) => event[0] === undefined
      ) || []
      expect(clearEvents.length).toBe(0)
    })
  })
})


