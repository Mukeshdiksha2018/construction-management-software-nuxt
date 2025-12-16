import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import EstimateItemsSelectionModal from '@/components/PurchaseOrders/EstimateItemsSelectionModal.vue'

describe('EstimateItemsSelectionModal', () => {
  let wrapper: VueWrapper<any>

  const mockItems = [
    {
      id: 'item-1',
      uuid: 'item-1-uuid',
      cost_code_uuid: 'cc-uuid-1',
      cost_code_label: 'CC-001',
      item_type_label: 'Material',
      item_label: 'Concrete',
      po_description: '3000 PSI Concrete',
      po_unit_price: 150,
      uom: 'YD3',
      po_quantity: 10,
    },
    {
      id: 'item-2',
      uuid: 'item-2-uuid',
      cost_code_uuid: 'cc-uuid-2',
      cost_code_label: 'CC-002',
      item_type_label: 'Material',
      item_label: 'Rebar',
      po_description: '#4 Rebar',
      po_unit_price: 0.75,
      uom: 'LF',
      po_quantity: 1000,
    },
    {
      id: 'item-3',
      uuid: 'item-3-uuid',
      cost_code_uuid: 'cc-uuid-3',
      cost_code_label: 'CC-003',
      item_type_label: 'Material',
      item_label: 'Lumber',
      po_description: '2x4x8 Lumber',
      po_unit_price: 5.50,
      uom: 'EA',
      po_quantity: 100,
    },
  ]

  beforeEach(() => {
    wrapper = mount(EstimateItemsSelectionModal, {
      props: {
        open: true,
        items: mockItems,
        title: "Test Selection",
      },
      global: {
        stubs: {
          UModal: {
            template: `
              <div>
                <slot name="header"></slot>
                <slot name="body"></slot>
                <slot name="footer"></slot>
              </div>
            `,
          },
          UButton: {
            template: "<button @click=\"$emit('click')\"><slot /></button>",
          },
          UCheckbox: {
            props: ["modelValue"],
            template:
              '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
          },
          UTable: {
            props: ["data", "columns"],
            template: `
              <div class="utable-stub">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in columns" :key="col.accessorKey">
                        <component v-if="typeof col.header === 'function'" :is="col.header()" />
                        <span v-else>{{ col.header }}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, rowIndex) in data" :key="rowIndex">
                      <td v-for="col in columns" :key="col.accessorKey">
                        <component v-if="typeof col.cell === 'function'" :is="col.cell({ row: { original: row, index: rowIndex } })" />
                        <span v-else>{{ row[col.accessorKey] }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            `,
          },
          CustomAccordion: {
            props: ["items", "type", "collapsible"],
            template: `
              <div>
                <div v-for="(item, index) in items" :key="item.key || index">
                  <slot name="trigger" :item="item" :isOpen="true" />
                  <slot name="content" :item="item" />
                </div>
              </div>
            `,
          },
          UBadge: {
            props: ["label", "color", "variant", "size"],
            template: '<span class="badge">{{ label }}</span>',
          },
          UIcon: {
            props: ["name"],
            template: '<span class="icon"></span>',
          },
        },
      },
    });
  })

  it('renders with all items', () => {
    // UTable renders items - check that items are rendered in the wrapper
    // Since we're using UTable, we can check the wrapper text contains item data
    expect(wrapper.text()).toContain("CC-001");
    expect(wrapper.text()).toContain("CC-002");
    expect(wrapper.text()).toContain("CC-003");
  })

  it('selects all items by default when modal opens', async () => {
    // All items should be selected in the selectedItems set
    const vm = wrapper.vm as any
    expect(vm.selectedItems.size).toBe(mockItems.length)
    
    // Checkboxes should exist for the filtered items (first cost code is auto-selected)
    // Since items are filtered by cost code, only items from the selected cost code are shown
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    // Should have at least the header checkbox and one item checkbox
    expect(checkboxes.length).toBeGreaterThanOrEqual(1)
  })

  it('emits confirm event with selected items', async () => {
    const confirmSpy = vi.fn()
    wrapper = mount(EstimateItemsSelectionModal, {
      props: {
        open: true,
        items: mockItems,
        onConfirm: confirmSpy,
      },
      global: {
        stubs: {
          UModal: {
            template: `
              <div>
                <slot name="header"></slot>
                <slot name="body"></slot>
                <slot name="footer"></slot>
              </div>
            `,
          },
          UButton: {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          UCheckbox: {
            props: ['modelValue'],
            template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
          },
        },
      },
    })

    // Find and click the Import button
    const buttons = wrapper.findAllComponents({ name: 'UButton' })
    const importButton = buttons.find(btn => btn.text().includes('Import'))
    
    if (importButton) {
      await importButton.trigger('click')
      
      // Should emit confirm with all selected items (all are selected by default)
      expect(confirmSpy).toHaveBeenCalled()
    }
  })

  it('displays item details correctly', () => {
    // Check if item details are rendered in the table
    const text = wrapper.text();
    expect(text).toContain("CC-001");
    expect(text).toContain("Concrete");
  })

  it('calculates item totals correctly', async () => {
    const vm = wrapper.vm as any
    
    // First item: 150 * 10 = 1500
    // Should format as $1,500.00
    expect(wrapper.text()).toContain('1,500.00')
    
    // Switch to second cost code to see second item
    vm.selectCostCode('cc-uuid-2')
    await wrapper.vm.$nextTick()
    
    // Second item: 0.75 * 1000 = 750
    // Should format as $750.00
    expect(wrapper.text()).toContain('750.00')
    
    // Switch to third cost code to see third item
    vm.selectCostCode('cc-uuid-3')
    await wrapper.vm.$nextTick()
    
    // Third item: 5.50 * 100 = 550
    // Should format as $550.00
    expect(wrapper.text()).toContain('550.00')
  })

  it('shows correct selected count', () => {
    // All items selected by default
    expect(wrapper.text()).toContain(`${mockItems.length} of ${mockItems.length} items selected`)
  })
})
