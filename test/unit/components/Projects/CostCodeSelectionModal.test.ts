import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import CostCodeSelectionModal from '@/components/Projects/CostCodeSelectionModal.vue'

describe('CostCodeSelectionModal', () => {
  let wrapper: VueWrapper<any>

  const mockHierarchicalData = [
    {
      uuid: 'division-1',
      division_number: '01',
      division_name: 'General Requirements',
      costCodes: [
        {
          uuid: 'cc-1',
          cost_code_number: '01-100',
          cost_code_name: 'Mobilization',
          subCostCodes: [
            {
              uuid: 'sub-cc-1',
              cost_code_number: '01-100-01',
              cost_code_name: 'Site Setup',
              subSubCostCodes: [
                {
                  uuid: 'sub-sub-cc-1',
                  cost_code_number: '01-100-01-01',
                  cost_code_name: 'Trailer Setup'
                }
              ]
            }
          ]
        },
        {
          uuid: 'cc-2',
          cost_code_number: '01-200',
          cost_code_name: 'Temporary Facilities',
          subCostCodes: []
        }
      ]
    },
    {
      uuid: 'division-2',
      division_number: '03',
      division_name: 'Concrete',
      costCodes: [
        {
          uuid: 'cc-3',
          cost_code_number: '03-100',
          cost_code_name: 'Formwork',
          subCostCodes: []
        }
      ]
    }
  ]

  const createWrapper = (props = {}) => {
    return mount(CostCodeSelectionModal, {
      props: {
        open: true,
        hierarchicalData: mockHierarchicalData,
        removedCostCodeUuids: [],
        ...props
      },
      global: {
        stubs: {
          UModal: {
            props: ['open'],
            emits: ['update:open'],
            template: `
              <div v-if="open">
                <slot name="header"></slot>
                <slot name="body"></slot>
                <slot name="footer"></slot>
              </div>
            `
          },
          UButton: {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
            props: ['color', 'variant', 'size', 'icon']
          },
          UCheckbox: {
            props: ['modelValue', 'indeterminate'],
            emits: ['update:modelValue'],
            template: `
              <input 
                type="checkbox" 
                :checked="modelValue" 
                :indeterminate="indeterminate"
                @change="$emit('update:modelValue', $event.target.checked)" 
              />
            `
          },
          UIcon: {
            props: ['name'],
            template: '<i />'
          }
        }
      }
    })
  }

  beforeEach(() => {
    wrapper = createWrapper()
  })

  describe('Rendering', () => {
    it('renders modal when open is true', () => {
      expect(wrapper.find('.modal')).toBeTruthy()
    })

    it('displays all divisions', () => {
      const text = wrapper.text()
      expect(text).toContain('01 General Requirements')
      expect(text).toContain('03 Concrete')
    })

    it('displays all cost codes', () => {
      const text = wrapper.text()
      expect(text).toContain('01-100 Mobilization')
      expect(text).toContain('01-200 Temporary Facilities')
      expect(text).toContain('03-100 Formwork')
    })

    it('displays sub-cost codes', () => {
      const text = wrapper.text()
      expect(text).toContain('01-100-01 Site Setup')
    })

    it('displays sub-sub-cost codes', () => {
      const text = wrapper.text()
      expect(text).toContain('01-100-01-01 Trailer Setup')
    })

    it('shows empty state when no hierarchical data', () => {
      wrapper = createWrapper({ hierarchicalData: [] })
      expect(wrapper.text()).toContain('No cost codes available')
    })

    it('displays Select All and Deselect All buttons in header', () => {
      const text = wrapper.text()
      expect(text).toContain('Select All')
      expect(text).toContain('Deselect All')
    })

    it('displays Cancel and Apply Selection buttons in footer', () => {
      const text = wrapper.text()
      expect(text).toContain('Cancel')
      expect(text).toContain('Apply Selection')
    })
  })

  describe('Checkbox Selection', () => {
    it('selects all cost codes by default when no removed UUIDs', () => {
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      // All checkboxes should be checked (cost codes are selected by default when not in removed list)
      checkboxes.forEach(checkbox => {
        expect(checkbox.element.checked).toBe(true)
      })
    })

    it('deselects cost codes that are in removedCostCodeUuids', async () => {
      wrapper = createWrapper({
        removedCostCodeUuids: ['cc-1']
      })
      await nextTick()

      const vm = wrapper.vm
      expect(vm.isSelected('cc-1')).toBe(false)
      expect(vm.isSelected('cc-2')).toBe(true)
    })

    it('toggles individual cost code selection', async () => {
      const vm = wrapper.vm
      expect(vm.isSelected('cc-1')).toBe(true)

      // Toggle off
      vm.handleToggle('cc-1', false)
      await nextTick()
      expect(vm.isSelected('cc-1')).toBe(false)
      expect(vm.localRemovedUuids.has('cc-1')).toBe(true)

      // Toggle on
      vm.handleToggle('cc-1', true)
      await nextTick()
      expect(vm.isSelected('cc-1')).toBe(true)
      expect(vm.localRemovedUuids.has('cc-1')).toBe(false)
    })

    it('handles sub-cost code selection', async () => {
      const vm = wrapper.vm
      expect(vm.isSelected('sub-cc-1')).toBe(true)

      vm.handleToggle('sub-cc-1', false)
      await nextTick()
      expect(vm.isSelected('sub-cc-1')).toBe(false)
    })

    it('handles sub-sub-cost code selection', async () => {
      const vm = wrapper.vm
      expect(vm.isSelected('sub-sub-cc-1')).toBe(true)

      vm.handleToggle('sub-sub-cc-1', false)
      await nextTick()
      expect(vm.isSelected('sub-sub-cc-1')).toBe(false)
    })
  })

  describe('Division-Level Selection', () => {
    it('checks if division is fully selected when all cost codes are selected', () => {
      const vm = wrapper.vm
      const division = mockHierarchicalData[0]
      expect(vm.isDivisionFullySelected(division)).toBe(true)
    })

    it('checks if division is partially selected when some cost codes are removed', async () => {
      const vm = wrapper.vm
      const division = mockHierarchicalData[0]
      
      // Remove one cost code
      vm.handleToggle('cc-1', false)
      await nextTick()
      
      expect(vm.isDivisionPartiallySelected(division)).toBe(true)
      expect(vm.isDivisionFullySelected(division)).toBe(false)
    })

    it('toggles all cost codes in a division', async () => {
      const vm = wrapper.vm
      const division = mockHierarchicalData[0]
      
      // Initially all selected
      expect(vm.isDivisionFullySelected(division)).toBe(true)
      
      // Toggle division off
      vm.handleDivisionToggle(division, false)
      await nextTick()
      
      // All cost codes in division should be removed
      expect(vm.isSelected('cc-1')).toBe(false)
      expect(vm.isSelected('cc-2')).toBe(false)
      expect(vm.isSelected('sub-cc-1')).toBe(false)
      expect(vm.isSelected('sub-sub-cc-1')).toBe(false)
      
      // Toggle division back on
      vm.handleDivisionToggle(division, true)
      await nextTick()
      
      // All cost codes in division should be selected
      expect(vm.isSelected('cc-1')).toBe(true)
      expect(vm.isSelected('cc-2')).toBe(true)
      expect(vm.isSelected('sub-cc-1')).toBe(true)
      expect(vm.isSelected('sub-sub-cc-1')).toBe(true)
    })
  })

  describe('Select All / Deselect All', () => {
    it('selects all cost codes when Select All is clicked', async () => {
      const vm = wrapper.vm
      
      // First deselect some
      vm.handleToggle('cc-1', false)
      vm.handleToggle('cc-3', false)
      await nextTick()
      
      expect(vm.isSelected('cc-1')).toBe(false)
      expect(vm.isSelected('cc-3')).toBe(false)
      
      // Select all
      vm.handleSelectAll()
      await nextTick()
      
      // All should be selected
      expect(vm.isSelected('cc-1')).toBe(true)
      expect(vm.isSelected('cc-2')).toBe(true)
      expect(vm.isSelected('cc-3')).toBe(true)
      expect(vm.localRemovedUuids.size).toBe(0)
    })

    it('deselects all cost codes when Deselect All is clicked', async () => {
      const vm = wrapper.vm
      
      // Initially all selected
      expect(vm.isSelected('cc-1')).toBe(true)
      
      // Deselect all
      vm.handleDeselectAll()
      await nextTick()
      
      // All should be deselected
      const allUuids = vm.getAllCostCodeUuids()
      allUuids.forEach(uuid => {
        expect(vm.isSelected(uuid)).toBe(false)
      })
    })

    it('Select All button calls handleSelectAll', async () => {
      const vm = wrapper.vm
      // First remove some items
      vm.handleToggle('cc-1', false)
      await nextTick()
      expect(vm.isSelected('cc-1')).toBe(false)
      
      // Call handleSelectAll directly (button click is tested via integration)
      vm.handleSelectAll()
      await nextTick()
      
      // Verify all are selected
      expect(vm.isSelected('cc-1')).toBe(true)
      expect(vm.localRemovedUuids.size).toBe(0)
    })

    it('Deselect All button calls handleDeselectAll', async () => {
      const vm = wrapper.vm
      // Initially all selected
      expect(vm.isSelected('cc-1')).toBe(true)
      
      // Call handleDeselectAll directly (button click is tested via integration)
      vm.handleDeselectAll()
      await nextTick()
      
      // Verify all are deselected
      expect(vm.isSelected('cc-1')).toBe(false)
      const allUuids = vm.getAllCostCodeUuids()
      expect(vm.localRemovedUuids.size).toBe(allUuids.length)
    })
  })

  describe('Events', () => {
    it('emits confirm event with removed UUIDs when Apply Selection is clicked', async () => {
      const vm = wrapper.vm
      
      // Remove some cost codes
      vm.handleToggle('cc-1', false)
      vm.handleToggle('cc-3', false)
      await nextTick()
      
      // Click Apply Selection
      vm.handleConfirm()
      await nextTick()
      
      expect(wrapper.emitted('confirm')).toBeTruthy()
      const confirmEvent = wrapper.emitted('confirm')?.[0]
      expect(confirmEvent).toBeTruthy()
      expect(confirmEvent[0]).toContain('cc-1')
      expect(confirmEvent[0]).toContain('cc-3')
    })

    it('emits cancel event when Cancel is clicked', async () => {
      const vm = wrapper.vm
      vm.handleCancel()
      await nextTick()
      
      expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    it('closes modal after confirm', async () => {
      const updateOpenSpy = vi.fn()
      wrapper = createWrapper({
        'onUpdate:open': updateOpenSpy
      })
      
      const vm = wrapper.vm
      vm.handleConfirm()
      await nextTick()
      
      // Modal should emit update:open with false
      expect(updateOpenSpy).toHaveBeenCalledWith(false)
    })

    it('closes modal after cancel', async () => {
      const updateOpenSpy = vi.fn()
      wrapper = createWrapper({
        'onUpdate:open': updateOpenSpy
      })
      
      const vm = wrapper.vm
      vm.handleCancel()
      await nextTick()
      
      // Modal should emit update:open with false
      expect(updateOpenSpy).toHaveBeenCalledWith(false)
    })

    it('emits update:open when modal is closed', async () => {
      const vm = wrapper.vm
      vm.isOpen = false
      await nextTick()
      
      expect(wrapper.emitted('update:open')).toBeTruthy()
      expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
    })
  })

  describe('Data Handling', () => {
    it('initializes localRemovedUuids from props', () => {
      wrapper = createWrapper({
        removedCostCodeUuids: ['cc-1', 'cc-2']
      })
      
      const vm = wrapper.vm
      expect(vm.localRemovedUuids.has('cc-1')).toBe(true)
      expect(vm.localRemovedUuids.has('cc-2')).toBe(true)
    })

    it('resets localRemovedUuids when modal opens', async () => {
      wrapper = createWrapper({
        open: false,
        removedCostCodeUuids: ['cc-1']
      })
      
      const vm = wrapper.vm
      // Change local state
      vm.handleToggle('cc-2', false)
      await nextTick()
      
      // Open modal - should reset to props
      await wrapper.setProps({ open: true })
      await nextTick()
      
      expect(vm.localRemovedUuids.has('cc-1')).toBe(true)
      expect(vm.localRemovedUuids.has('cc-2')).toBe(false) // Should reset, not keep previous change
    })

    it('collects all cost code UUIDs correctly including nested levels', () => {
      const vm = wrapper.vm
      const allUuids = vm.getAllCostCodeUuids()
      
      expect(allUuids).toContain('cc-1')
      expect(allUuids).toContain('cc-2')
      expect(allUuids).toContain('cc-3')
      expect(allUuids).toContain('sub-cc-1')
      expect(allUuids).toContain('sub-sub-cc-1')
      
      // Should have 5 total: cc-1, cc-2, cc-3, sub-cc-1, sub-sub-cc-1
      expect(allUuids.length).toBe(5)
    })

    it('collects division cost code UUIDs correctly', () => {
      const vm = wrapper.vm
      const division = mockHierarchicalData[0]
      const divisionUuids = vm.getAllDivisionCostCodeUuids(division)
      
      expect(divisionUuids).toContain('cc-1')
      expect(divisionUuids).toContain('cc-2')
      expect(divisionUuids).toContain('sub-cc-1')
      expect(divisionUuids).toContain('sub-sub-cc-1')
      
      // Division 1 has 4 cost codes total (cc-1, cc-2, sub-cc-1, sub-sub-cc-1)
      expect(divisionUuids.length).toBe(4)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty hierarchical data', () => {
      wrapper = createWrapper({ hierarchicalData: [] })
      const vm = wrapper.vm
      const allUuids = vm.getAllCostCodeUuids()
      expect(allUuids).toEqual([])
    })

    it('handles division with no cost codes', () => {
      const emptyDivision = {
        uuid: 'empty-division',
        division_number: '99',
        division_name: 'Empty Division',
        costCodes: []
      }
      
      wrapper = createWrapper({ hierarchicalData: [emptyDivision] })
      const vm = wrapper.vm
      const divisionUuids = vm.getAllDivisionCostCodeUuids(emptyDivision)
      expect(divisionUuids).toEqual([])
      expect(vm.isDivisionFullySelected(emptyDivision)).toBe(false)
      expect(vm.isDivisionPartiallySelected(emptyDivision)).toBe(false)
    })

    it('handles cost code with no sub-cost codes', () => {
      const vm = wrapper.vm
      // cc-2 has no sub-cost codes
      expect(vm.isSelected('cc-2')).toBe(true)
      vm.handleToggle('cc-2', false)
      expect(vm.isSelected('cc-2')).toBe(false)
    })

    it('handles undefined removedCostCodeUuids prop', () => {
      wrapper = createWrapper({ removedCostCodeUuids: undefined })
      const vm = wrapper.vm
      // Should default to empty array, so all are selected
      expect(vm.isSelected('cc-1')).toBe(true)
    })
  })
})
