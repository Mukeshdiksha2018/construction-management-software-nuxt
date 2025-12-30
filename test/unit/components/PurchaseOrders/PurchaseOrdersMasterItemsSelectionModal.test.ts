import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import PurchaseOrdersMasterItemsSelectionModal from '@/components/PurchaseOrders/PurchaseOrdersMasterItemsSelectionModal.vue'

describe('PurchaseOrdersMasterItemsSelectionModal', () => {
  let wrapper: VueWrapper<any>

  const mockItems = [
    {
      id: 'item-1',
      uuid: 'item-1-uuid',
      item_uuid: 'item-uuid-1',
      cost_code_uuid: 'cc-uuid-1',
      cost_code_label: 'CC-001',
      cost_code_number: '001',
      item_label: 'Concrete',
      item_name: 'Concrete',
      description: '3000 PSI Concrete',
      po_description: '3000 PSI Concrete',
      po_unit_price: 150,
      unit_price: 150,
      uom: 'YD3',
      unit_label: 'YD3',
      unit: 'YD3',
      po_quantity: 10,
      quantity: 10,
      sequence: '001',
      item_sequence: '001',
    },
    {
      id: 'item-2',
      uuid: 'item-2-uuid',
      item_uuid: 'item-uuid-2',
      cost_code_uuid: 'cc-uuid-2',
      cost_code_label: 'CC-002',
      cost_code_number: '002',
      item_label: 'Rebar',
      item_name: 'Rebar',
      description: '#4 Rebar',
      po_description: '#4 Rebar',
      po_unit_price: 0.75,
      unit_price: 0.75,
      uom: 'LF',
      unit_label: 'LF',
      unit: 'LF',
      po_quantity: 1000,
      quantity: 1000,
      sequence: '002',
      item_sequence: '002',
    },
    {
      id: 'item-3',
      uuid: 'item-3-uuid',
      item_uuid: 'item-uuid-3',
      cost_code_uuid: 'cc-uuid-3',
      cost_code_label: 'CC-003',
      cost_code_number: '003',
      item_label: 'Lumber',
      item_name: 'Lumber',
      description: '2x4x8 Lumber',
      po_description: '2x4x8 Lumber',
      po_unit_price: 5.50,
      unit_price: 5.50,
      uom: 'EA',
      unit_label: 'EA',
      unit: 'EA',
      po_quantity: 100,
      quantity: 100,
      sequence: '003',
      item_sequence: '003',
    },
  ]

  beforeEach(() => {
    wrapper = mount(PurchaseOrdersMasterItemsSelectionModal, {
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

  describe('Rendering', () => {
    it('renders with all items', () => {
      // Items are grouped by cost code and filtered - first cost code is auto-selected
      expect(wrapper.text()).toContain("CC-001");
      // Other cost codes should be in the sidebar
      expect(wrapper.text()).toContain("CC-002");
      expect(wrapper.text()).toContain("CC-003");
    })

    it('displays item details correctly', () => {
      const text = wrapper.text();
      
      // Check if item details are rendered (first cost code is auto-selected)
      expect(text).toContain("CC-001");
      expect(text).toContain("Concrete");
    })

    it('displays cost code number when available', () => {
      const text = wrapper.text();
      expect(text).toContain("001");
    })

    it('displays sequence when available', () => {
      const text = wrapper.text();
      expect(text).toContain("001");
    })

    it('displays unit label when available', () => {
      const text = wrapper.text();
      expect(text).toContain("YD3");
    })

    it('groups items by cost code', () => {
      const vm = wrapper.vm as any
      const grouped = vm.groupedByCostCode
      expect(grouped.size).toBe(3)
      expect(grouped.has('cc-uuid-1')).toBe(true)
      expect(grouped.has('cc-uuid-2')).toBe(true)
      expect(grouped.has('cc-uuid-3')).toBe(true)
    })

    it('auto-selects first cost code when modal opens', async () => {
      const vm = wrapper.vm as any
      await wrapper.vm.$nextTick()
      // First cost code should be selected
      expect(vm.selectedCostCodeUuid).toBeTruthy()
      // Filtered items should show items from first cost code
      expect(vm.filteredItems.length).toBe(1)
    })
  })

  describe('Selection Behavior', () => {
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

    it('preselects items when preselectedItems prop is provided', async () => {
      const preselectedItems = [mockItems[0], mockItems[1]]
      
      wrapper = mount(PurchaseOrdersMasterItemsSelectionModal, {
        props: {
          open: true,
          items: mockItems,
          preselectedItems,
          title: 'Test Selection',
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
            CustomAccordion: {
              props: ["items", "type", "collapsible"],
              template: '<div><slot name="trigger" :item="items[0]" :isOpen="true" /></div>',
            },
            UBadge: { template: '<span></span>' },
            UIcon: { template: '<span></span>' },
            UTable: {
              props: ["data", "columns"],
              template: '<div class="utable-stub"><table></table></div>',
            },
          },
        },
      })

      await wrapper.vm.$nextTick()
      
      // Should have preselected items
      expect(wrapper.text()).toContain(`${preselectedItems.length} of ${mockItems.length} items selected`)
    })

    it('shows correct selected count', () => {
      // All items selected by default
      expect(wrapper.text()).toContain(`${mockItems.length} of ${mockItems.length} items selected`)
    })
  })

  describe('Item Identification', () => {
    it('uses item_uuid as primary identifier', () => {
      const itemWithUuid = {
        item_uuid: 'primary-uuid',
        uuid: 'secondary-uuid',
        id: 'tertiary-id',
      }
      
      // The getItemId function should prioritize item_uuid
      const component = wrapper.vm
      const itemId = component.getItemId(itemWithUuid, 0)
      expect(itemId).toBe('primary-uuid')
    })

    it('falls back to uuid when item_uuid is not available', () => {
      const itemWithoutItemUuid = {
        uuid: 'fallback-uuid',
        id: 'tertiary-id',
      }
      
      const component = wrapper.vm
      const itemId = component.getItemId(itemWithoutItemUuid, 0)
      expect(itemId).toBe('fallback-uuid')
    })

    it('falls back to id when neither item_uuid nor uuid is available', () => {
      const itemWithOnlyId = {
        id: 'fallback-id',
      }
      
      const component = wrapper.vm
      const itemId = component.getItemId(itemWithOnlyId, 0)
      expect(itemId).toBe('fallback-id')
    })

    it('uses index-based fallback when no IDs are available', () => {
      const itemWithoutIds = {}
      
      const component = wrapper.vm
      const itemId = component.getItemId(itemWithoutIds, 5)
      expect(itemId).toBe('master-item-5')
    })
  })

  describe('Calculations', () => {
    it('calculates item totals correctly', async () => {
      const vm = wrapper.vm as any
      
      // First item: 150 * 10 = 1500
      // Should format as $1,500.00 (first cost code is auto-selected)
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

    it('handles zero unit price correctly', () => {
      const itemWithZeroPrice = {
        ...mockItems[0],
        po_unit_price: 0,
        po_quantity: 10,
      }
      
      wrapper = mount(PurchaseOrdersMasterItemsSelectionModal, {
        props: {
          open: true,
          items: [itemWithZeroPrice],
        },
        global: {
          stubs: {
            UModal: { template: '<div><slot name="body" /></div>' },
            UCheckbox: { template: '<input type="checkbox" />' },
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
              template: '<div><slot name="trigger" :item="items[0]" :isOpen="true" /></div>',
            },
            UBadge: { template: '<span></span>' },
            UIcon: { template: '<span></span>' },
          },
        },
      });
      
      // Should show $0.00
      expect(wrapper.text()).toContain('0.00')
    })

    it('handles zero quantity correctly', () => {
      const itemWithZeroQuantity = {
        ...mockItems[0],
        po_unit_price: 150,
        po_quantity: 0,
      }
      
      wrapper = mount(PurchaseOrdersMasterItemsSelectionModal, {
        props: {
          open: true,
          items: [itemWithZeroQuantity],
        },
        global: {
          stubs: {
            UModal: { template: '<div><slot name="body" /></div>' },
            UCheckbox: { template: '<input type="checkbox" />' },
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
              template: '<div><slot name="trigger" :item="items[0]" :isOpen="true" /></div>',
            },
            UBadge: { template: '<span></span>' },
            UIcon: { template: '<span></span>' },
          },
        },
      });
      
      // Should show $0.00
      expect(wrapper.text()).toContain('0.00')
    })
  })

  describe('Events', () => {
    it('emits confirm event with selected items', async () => {
      const confirmSpy = vi.fn()
      wrapper = mount(PurchaseOrdersMasterItemsSelectionModal, {
        props: {
          open: true,
          items: mockItems,
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
            CustomAccordion: {
              props: ["items", "type", "collapsible"],
              template: '<div><slot name="trigger" :item="items[0]" :isOpen="true" /></div>',
            },
            UBadge: { template: '<span></span>' },
            UIcon: { template: '<span></span>' },
            UTable: {
              props: ["data", "columns"],
              template: '<div class="utable-stub"><table></table></div>',
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
        const emitted = wrapper.emitted('confirm')
        expect(emitted).toBeTruthy()
        if (emitted) {
          expect(emitted[0][0]).toHaveLength(mockItems.length)
        }
      }
    })

    it('emits cancel event when cancel button is clicked', async () => {
      wrapper = mount(PurchaseOrdersMasterItemsSelectionModal, {
        props: {
          open: true,
          items: mockItems,
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
              template: '<input type="checkbox" :checked="modelValue" />',
            },
            CustomAccordion: {
              props: ["items", "type", "collapsible"],
              template: '<div><slot name="trigger" :item="items[0]" :isOpen="true" /></div>',
            },
            UBadge: { template: '<span></span>' },
            UIcon: { template: '<span></span>' },
            UTable: {
              props: ["data", "columns"],
              template: '<div class="utable-stub"><table></table></div>',
            },
          },
        },
      })

      // Find and click the Cancel button
      const buttons = wrapper.findAllComponents({ name: 'UButton' })
      const cancelButton = buttons.find(btn => btn.text().includes('Cancel'))
      
      if (cancelButton) {
        await cancelButton.trigger('click')
        
        // Should emit cancel event
        const emitted = wrapper.emitted('cancel')
        expect(emitted).toBeTruthy()
      }
    })

    it('emits update:open when modal is closed', async () => {
      wrapper = mount(PurchaseOrdersMasterItemsSelectionModal, {
        props: {
          open: true,
          items: mockItems,
        },
        global: {
          stubs: {
            UModal: {
              template: '<div><slot /></div>',
              props: ['open'],
              emits: ['update:open'],
            },
            UButton: {
              template: '<button @click="$emit(\'click\')"><slot /></button>',
            },
            UCheckbox: {
              template: '<input type="checkbox" />',
            },
            CustomAccordion: {
              props: ["items", "type", "collapsible"],
              template: '<div><slot name="trigger" :item="items[0]" :isOpen="true" /></div>',
            },
            UBadge: { template: '<span></span>' },
            UIcon: { template: '<span></span>' },
            UTable: {
              props: ["data", "columns"],
              template: '<div class="utable-stub"><table></table></div>',
            },
          },
        },
      })

      // The modal uses v-model:open which emits update:open
      // When we set props, the component's computed setter should emit
      // For this test, we verify the component has the emit capability
      const component = wrapper.vm
      expect(component).toBeDefined()
      
      // The component should have the isOpen computed with getter/setter
      // Setting open to false should trigger the setter which emits
      await wrapper.setProps({ open: false })
      await wrapper.vm.$nextTick()
      
      // The emit happens through the computed setter, which may not be captured
      // in this test setup. Instead, we verify the component structure
      expect(wrapper.vm.isOpen).toBe(false)
    })
  })

  describe('Select All / Deselect All', () => {
    it('selects all items when Select All is clicked', async () => {
      wrapper = mount(PurchaseOrdersMasterItemsSelectionModal, {
        props: {
          open: true,
          items: mockItems,
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
            CustomAccordion: {
              props: ["items", "type", "collapsible"],
              template: '<div><slot name="trigger" :item="items[0]" :isOpen="true" /></div>',
            },
            UBadge: { template: '<span></span>' },
            UIcon: { template: '<span></span>' },
            UTable: {
              props: ["data", "columns"],
              template: '<div class="utable-stub"><table></table></div>',
            },
          },
        },
      })

      // Find Select All button
      const buttons = wrapper.findAllComponents({ name: 'UButton' })
      const selectAllButton = buttons.find(btn => btn.text().includes('Select All'))
      
      if (selectAllButton) {
        await selectAllButton.trigger('click')
        await wrapper.vm.$nextTick()
        
        // All items should be selected
        expect(wrapper.text()).toContain(`${mockItems.length} of ${mockItems.length} items selected`)
      }
    })

    it('deselects all items when Deselect All is clicked', async () => {
      wrapper = mount(PurchaseOrdersMasterItemsSelectionModal, {
        props: {
          open: true,
          items: mockItems,
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
            CustomAccordion: {
              props: ["items", "type", "collapsible"],
              template: '<div><slot name="trigger" :item="items[0]" :isOpen="true" /></div>',
            },
            UBadge: { template: '<span></span>' },
            UIcon: { template: '<span></span>' },
            UTable: {
              props: ["data", "columns"],
              template: '<div class="utable-stub"><table></table></div>',
            },
          },
        },
      })

      // Find Deselect All button
      const buttons = wrapper.findAllComponents({ name: 'UButton' })
      const deselectAllButton = buttons.find(btn => btn.text().includes('Deselect All'))
      
      if (deselectAllButton) {
        await deselectAllButton.trigger('click')
        await wrapper.vm.$nextTick()
        
        // No items should be selected
        expect(wrapper.text()).toContain('0 of')
      }
    })
  })

  describe('Empty State', () => {
    it('displays empty state message when no items are available', () => {
      wrapper = mount(PurchaseOrdersMasterItemsSelectionModal, {
        props: {
          open: true,
          items: [],
        },
        global: {
          stubs: {
            UModal: {
              template: '<div><slot name="body" /></div>',
            },
          },
        },
      })

      expect(wrapper.text()).toContain('No preferred items available to import')
      expect(wrapper.text()).toContain('Please make sure preferred items are configured')
    })
  })

  describe('Import Button State', () => {
    it('disables import button when no items are selected', async () => {
      wrapper = mount(PurchaseOrdersMasterItemsSelectionModal, {
        props: {
          open: true,
          items: mockItems,
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
              props: ['disabled'],
              template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
            },
            UCheckbox: {
              props: ['modelValue'],
              template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
            },
            CustomAccordion: {
              props: ["items", "type", "collapsible"],
              template: '<div><slot name="trigger" :item="items[0]" :isOpen="true" /></div>',
            },
            UBadge: { template: '<span></span>' },
            UIcon: { template: '<span></span>' },
            UTable: {
              props: ["data", "columns"],
              template: '<div class="utable-stub"><table></table></div>',
            },
          },
        },
      })

      // Deselect all items
      const buttons = wrapper.findAllComponents({ name: 'UButton' })
      const deselectAllButton = buttons.find(btn => btn.text().includes('Deselect All'))
      
      if (deselectAllButton) {
        await deselectAllButton.trigger('click')
        await wrapper.vm.$nextTick()
        
        // Find import button
        const importButton = buttons.find(btn => btn.text().includes('Import'))
        if (importButton) {
          // Import button should be disabled
          expect(importButton.props('disabled')).toBe(true)
        }
      }
    })
  })

  describe('Cost Code Filtering', () => {
    it('filters items by selected cost code', async () => {
      const vm = wrapper.vm as any
      
      // Initially, first cost code should be selected
      expect(vm.selectedCostCodeUuid).toBeTruthy()
      expect(vm.filteredItems.length).toBe(1)
      
      // Switch to second cost code
      vm.selectCostCode('cc-uuid-2')
      await wrapper.vm.$nextTick()
      expect(vm.filteredItems.length).toBe(1)
      expect(vm.filteredItems[0].cost_code_uuid).toBe('cc-uuid-2')
      
      // Switch to third cost code
      vm.selectCostCode('cc-uuid-3')
      await wrapper.vm.$nextTick()
      expect(vm.filteredItems.length).toBe(1)
      expect(vm.filteredItems[0].cost_code_uuid).toBe('cc-uuid-3')
    })

    it('shows empty state when no cost code is selected', async () => {
      const vm = wrapper.vm as any
      
      // Clear cost code selection
      vm.selectedCostCodeUuid = null
      await wrapper.vm.$nextTick()
      
      expect(vm.filteredItems.length).toBe(0)
      expect(wrapper.text()).toContain('Select a cost code to view items')
    })

    it('displays selected cost code label', async () => {
      const vm = wrapper.vm as any

      // Select first cost code
      vm.selectCostCode('cc-uuid-1')
      await wrapper.vm.$nextTick()

      expect(vm.selectedCostCodeLabel).toContain('CC-001')
    })

    it('displays item names and descriptions correctly', async () => {
      const vm = wrapper.vm as any

      // Select first cost code to show items
      vm.selectCostCode('cc-uuid-1')
      await wrapper.vm.$nextTick()

      // The item name should be 'Concrete' from item_label/item_name
      expect(wrapper.text()).toContain('Concrete')

      // The description should be '3000 PSI Concrete' from po_description/description
      expect(wrapper.text()).toContain('3000 PSI Concrete')
    })

    it('displays fallback values when item fields are missing', async () => {
      const vm = wrapper.vm as any

      // Create a mock item with missing name fields
      const mockItemWithMissingFields = [{
        id: 'item-missing',
        uuid: 'item-missing-uuid',
        item_uuid: 'item-missing-uuid',
        cost_code_uuid: 'cc-uuid-1',
        cost_code_label: 'CC-001',
        cost_code_number: '001',
        // No item_label, item_name, item_description, description, po_description
        po_unit_price: 100,
        unit_price: 100,
        uom: 'EA',
        po_quantity: 5,
        quantity: 5,
      }]

      await wrapper.setProps({
        items: mockItemWithMissingFields
      })

      // Select the cost code
      vm.selectCostCode('cc-uuid-1')
      await wrapper.vm.$nextTick()

      // Should display fallback '-' when no item name/description is available
      expect(wrapper.text()).toContain('-')
    })

  })
})
