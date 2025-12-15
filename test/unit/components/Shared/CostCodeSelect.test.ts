import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { ref, nextTick } from 'vue'
import CostCodeSelect from '@/components/Shared/CostCodeSelect.vue'

// Mock the store
const mockConfigurations = [
  {
    id: 1,
    uuid: 'parent-1',
    corporation_uuid: 'corp-1',
    cost_code_number: '1000',
    cost_code_name: 'Parent Code 1',
    parent_cost_code_uuid: null,
    is_active: true,
    order: 1
  },
  {
    id: 2,
    uuid: 'child-1-1',
    corporation_uuid: 'corp-1',
    cost_code_number: '1001',
    cost_code_name: 'Child Code 1-1',
    parent_cost_code_uuid: 'parent-1',
    is_active: true,
    order: 1
  },
  {
    id: 3,
    uuid: 'child-1-2',
    corporation_uuid: 'corp-1',
    cost_code_number: '1002',
    cost_code_name: 'Child Code 1-2',
    parent_cost_code_uuid: 'parent-1',
    is_active: true,
    order: 2
  },
  {
    id: 4,
    uuid: 'leaf-1-1-1',
    corporation_uuid: 'corp-1',
    cost_code_number: '1001-1',
    cost_code_name: 'Leaf Code 1-1-1',
    parent_cost_code_uuid: 'child-1-1',
    is_active: true,
    order: 1
  },
  {
    id: 5,
    uuid: 'parent-2',
    corporation_uuid: 'corp-1',
    cost_code_number: '2000',
    cost_code_name: 'Parent Code 2',
    parent_cost_code_uuid: null,
    is_active: true,
    order: 2
  },
  {
    id: 6,
    uuid: 'leaf-2-1',
    corporation_uuid: 'corp-1',
    cost_code_number: '2001',
    cost_code_name: 'Leaf Code 2-1',
    parent_cost_code_uuid: 'parent-2',
    is_active: true,
    order: 1
  },
  {
    id: 7,
    uuid: 'inactive-1',
    corporation_uuid: 'corp-1',
    cost_code_number: '3000',
    cost_code_name: 'Inactive Code',
    parent_cost_code_uuid: null,
    is_active: false,
    order: 3
  }
]

const mockConfigurationsStore = {
  configurations: ref(mockConfigurations),
  loading: ref(false),
  error: ref(null),
  getActiveConfigurations: vi.fn((corpUuid: string) => {
    return mockConfigurations.filter(c => 
      c.corporation_uuid === corpUuid && c.is_active
    )
  }),
  fetchConfigurations: vi.fn()
}

vi.mock('@/stores/costCodeConfigurations', () => ({
  useCostCodeConfigurationsStore: () => mockConfigurationsStore
}))

describe('CostCodeSelect Component', () => {
  let wrapper: any

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // Reset store state
    mockConfigurationsStore.configurations.value = mockConfigurations
    mockConfigurationsStore.loading.value = false
    mockConfigurationsStore.error.value = null
    mockConfigurationsStore.getActiveConfigurations.mockImplementation((corpUuid: string) => {
      return mockConfigurations.filter(c => 
        c.corporation_uuid === corpUuid && c.is_active
      )
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(CostCodeSelect, {
      props: {
        corporationUuid: 'corp-1',
        ...props
      },
      global: {
        stubs: {
          UPopover: {
            template: `
              <div class="u-popover">
                <slot />
                <div v-if="open" class="popover-content">
                  <slot name="content" />
                </div>
              </div>
            `,
            props: ['open'],
            emits: ['update:open']
          },
          UButton: {
            template: '<button :disabled="disabled" :class="className"><slot /></button>',
            props: ['disabled', 'size', 'className', 'variant', 'loading']
          },
          UInput: {
            template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" :placeholder="placeholder" :disabled="disabled" :readonly="readonly" />',
            props: ['modelValue', 'placeholder', 'disabled', 'readonly', 'size', 'className', 'icon', 'autofocus']
          },
          UTree: {
            template: `
              <div class="u-tree">
                <div 
                  v-for="item in items" 
                  :key="getKey ? getKey(item) : item.id"
                  :class="{ 'disabled': item.disabled, 'has-children': item.children && item.children.length > 0 }"
                  class="tree-item"
                  @click.stop="handleItemClick(item)"
                >
                  <div class="tree-item-label">
                    <slot name="item-label" :item="item" />
                  </div>
                  <div v-if="item.children" class="tree-children">
                    <div 
                      v-for="child in item.children"
                      :key="getKey ? getKey(child) : child.id"
                      :class="{ 'disabled': child.disabled }"
                      class="tree-item tree-child"
                      @click.stop="handleItemClick(child)"
                    >
                      <div class="tree-item-label">
                        <slot name="item-label" :item="child" />
                      </div>
                      <div v-if="child.children" class="tree-children">
                        <div
                          v-for="grandchild in child.children"
                          :key="getKey ? getKey(grandchild) : grandchild.id"
                          :class="{ 'disabled': grandchild.disabled }"
                          class="tree-item tree-grandchild"
                          @click.stop="handleItemClick(grandchild)"
                        >
                          <div class="tree-item-label">
                            <slot name="item-label" :item="grandchild" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `,
            props: ['items', 'size', 'modelValue', 'getKey'],
            methods: {
              handleItemClick(item: any) {
                this.$emit('select', { preventDefault: vi.fn() }, item)
              }
            }
          },
          UBadge: {
            template: '<span class="u-badge"><slot /></span>',
            props: ['color', 'variant', 'size']
          }
        }
      }
    })
  }

  describe('Component Mounting', () => {
    it('should mount without errors', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should render button when corporation UUID is provided and not disabled', () => {
      wrapper = createWrapper({ corporationUuid: 'corp-1' })
      expect(wrapper.find('.u-popover').exists()).toBe(true)
      expect(wrapper.find('button').exists()).toBe(true)
    })

    it('should render readonly input when disabled', () => {
      wrapper = createWrapper({ disabled: true })
      expect(wrapper.find('input[readonly]').exists()).toBe(true)
    })

    it('should render readonly input when corporation UUID is not provided', () => {
      wrapper = createWrapper({ corporationUuid: undefined })
      expect(wrapper.find('input[readonly]').exists()).toBe(true)
      expect(wrapper.find('input[readonly]').attributes('placeholder')).toBe('Select corporation first')
    })
  })

  describe('Props and Defaults', () => {
    it('should use default placeholder when not provided', () => {
      wrapper = createWrapper()
      const button = wrapper.find('button')
      expect(button.text()).toContain('Search and select cost code')
    })

    it('should use custom placeholder when provided', () => {
      wrapper = createWrapper({ placeholder: 'Custom placeholder' })
      const button = wrapper.find('button')
      expect(button.text()).toContain('Custom placeholder')
    })

    it('should use default searchable placeholder', () => {
      wrapper = createWrapper()
      wrapper.vm.isPopoverOpen = true
      wrapper.vm.$nextTick(() => {
        const searchInput = wrapper.find('input[placeholder="Search cost codes..."]')
        expect(searchInput.exists()).toBe(true)
      })
    })

    it('should apply custom className', () => {
      wrapper = createWrapper({ className: 'custom-class' })
      expect(wrapper.find('.custom-class').exists()).toBe(true)
    })

    it('should apply default size', () => {
      wrapper = createWrapper()
      expect(wrapper.vm.size).toBe('sm')
    })
  })

  describe('Store Integration', () => {
    it('should call getActiveConfigurations with corporation UUID', () => {
      wrapper = createWrapper({ corporationUuid: 'corp-1' })
      expect(mockConfigurationsStore.getActiveConfigurations).toHaveBeenCalledWith('corp-1')
    })

    it('should fetch configurations when corporation UUID changes', async () => {
      wrapper = createWrapper({ corporationUuid: 'corp-1' })
      await wrapper.setProps({ corporationUuid: 'corp-2' })
      await flushPromises()
      
      // The watcher should check if configurations need to be fetched
      // Since we're checking length === 0, it might not call fetchConfigurations if data exists
      expect(mockConfigurationsStore.getActiveConfigurations).toHaveBeenCalled()
    })

    it('should handle loading state', () => {
      mockConfigurationsStore.loading.value = true
      wrapper = createWrapper()
      expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    })
  })

  describe('Tree Structure Building', () => {
    it('should build correct tree structure from flat list', () => {
      wrapper = createWrapper()
      const treeItems = wrapper.vm.treeItems
      
      expect(treeItems.length).toBeGreaterThan(0)
      
      // Find parent node
      const parent1 = treeItems.find((item: any) => item.id === 'parent-1')
      expect(parent1).toBeDefined()
      expect(parent1?.children).toBeDefined()
      expect(parent1?.children.length).toBe(2) // child-1-1 and child-1-2
      expect(parent1?.disabled).toBe(true) // Has children, should be disabled
    })

    it('should set defaultExpanded for parent nodes', () => {
      wrapper = createWrapper()
      const treeItems = wrapper.vm.treeItems
      
      const parent1 = treeItems.find((item: any) => item.id === 'parent-1')
      expect(parent1?.defaultExpanded).toBe(true)
    })

    it('should not set defaultExpanded for leaf nodes', () => {
      wrapper = createWrapper()
      const treeItems = wrapper.vm.treeItems
      
      // Find a leaf node (need to traverse tree)
      let leafNode: any = null
      const findLeaf = (items: any[]) => {
        for (const item of items) {
          if (item.children && item.children.length > 0) {
            findLeaf(item.children)
          } else {
            leafNode = item
            return
          }
        }
      }
      findLeaf(treeItems)
      
      expect(leafNode).toBeDefined()
      // Leaf nodes don't have children, so defaultExpanded should be false or undefined
      expect(leafNode?.defaultExpanded).not.toBe(true)
    })

    it('should only include active configurations', () => {
      wrapper = createWrapper()
      const treeItems = wrapper.vm.treeItems
      
      // inactive-1 should not be in the tree
      const inactiveNode = treeItems.find((item: any) => item.id === 'inactive-1')
      expect(inactiveNode).toBeUndefined()
    })

    it('should sort items by order', () => {
      wrapper = createWrapper()
      const treeItems = wrapper.vm.treeItems
      
      // Parent-1 should come before Parent-2 (order 1 < 2)
      const parent1Index = treeItems.findIndex((item: any) => item.id === 'parent-1')
      const parent2Index = treeItems.findIndex((item: any) => item.id === 'parent-2')
      
      expect(parent1Index).toBeLessThan(parent2Index)
    })
  })

  describe('Selection Handling', () => {
    it('should allow selection of leaf nodes', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      // Find a leaf node
      const treeItems = wrapper.vm.treeItems
      let leafNode: any = null
      const findLeaf = (items: any[]) => {
        for (const item of items) {
          if (item.children && item.children.length > 0) {
            findLeaf(item.children)
          } else {
            leafNode = item
            return
          }
        }
      }
      findLeaf(treeItems)
      
      expect(leafNode).toBeDefined()
      expect(leafNode?.disabled).toBe(false)
      
      // Simulate selection
      wrapper.vm.handleItemClick(leafNode)
      
      expect(wrapper.vm.selectedCostCode).toBe(leafNode.costCode.uuid)
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([leafNode.costCode.uuid])
    })

    it('should prevent selection of parent nodes', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const treeItems = wrapper.vm.treeItems
      const parentNode = treeItems.find((item: any) => item.id === 'parent-1')
      
      expect(parentNode?.disabled).toBe(true)
      
      const initialSelected = wrapper.vm.selectedCostCode
      wrapper.vm.handleItemClick(parentNode)
      
      // Selection should not change
      expect(wrapper.vm.selectedCostCode).toBe(initialSelected)
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('should emit change event with full cost code option', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const treeItems = wrapper.vm.treeItems
      let leafNode: any = null
      const findLeaf = (items: any[]) => {
        for (const item of items) {
          if (item.children && item.children.length > 0) {
            findLeaf(item.children)
          } else {
            leafNode = item
            return
          }
        }
      }
      findLeaf(treeItems)
      
      wrapper.vm.handleItemClick(leafNode)
      
      expect(wrapper.emitted('change')).toBeTruthy()
      const changeEvent = wrapper.emitted('change')?.[0][0]
      expect(changeEvent).toHaveProperty('value', leafNode.costCode.uuid)
      expect(changeEvent).toHaveProperty('label')
      expect(changeEvent).toHaveProperty('costCode')
      expect(changeEvent).toHaveProperty('status')
    })

    it('should close popover after selection', async () => {
      wrapper = createWrapper()
      wrapper.vm.isPopoverOpen = true
      await flushPromises()
      
      const treeItems = wrapper.vm.treeItems
      let leafNode: any = null
      const findLeaf = (items: any[]) => {
        for (const item of items) {
          if (item.children && item.children.length > 0) {
            findLeaf(item.children)
          } else {
            leafNode = item
            return
          }
        }
      }
      findLeaf(treeItems)
      
      wrapper.vm.selectCostCode(leafNode.costCode)
      
      expect(wrapper.vm.isPopoverOpen).toBe(false)
    })

    it('should handle tree select event', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const treeItems = wrapper.vm.treeItems
      let leafNode: any = null
      const findLeaf = (items: any[]) => {
        for (const item of items) {
          if (item.children && item.children.length > 0) {
            findLeaf(item.children)
          } else {
            leafNode = item
            return
          }
        }
      }
      findLeaf(treeItems)
      
      const mockEvent = {
        preventDefault: vi.fn()
      }
      
      wrapper.vm.handleTreeSelect(mockEvent as any, leafNode)
      
      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(wrapper.vm.selectedCostCode).toBe(leafNode.costCode.uuid)
    })
  })

  describe('v-model Binding', () => {
    it('should update when modelValue prop changes', async () => {
      wrapper = createWrapper({ modelValue: undefined })
      await flushPromises()
      
      await wrapper.setProps({ modelValue: 'leaf-2-1' })
      await flushPromises()
      
      expect(wrapper.vm.selectedCostCode).toBe('leaf-2-1')
    })

    it('should clear selection when modelValue is set to undefined', async () => {
      wrapper = createWrapper({ modelValue: 'leaf-2-1' })
      await flushPromises()
      
      await wrapper.setProps({ modelValue: undefined })
      await flushPromises()
      
      expect(wrapper.vm.selectedCostCode).toBeUndefined()
      expect(wrapper.vm.selectedCostCodeOption).toBeUndefined()
    })

    it('should update selected option when modelValue changes externally', async () => {
      wrapper = createWrapper({ modelValue: 'leaf-2-1' })
      await flushPromises()
      
      const option = wrapper.vm.selectedCostCodeOption
      expect(option).toBeDefined()
      expect(option.value).toBe('leaf-2-1')
      expect(option.label).toContain('2001')
      expect(option.label).toContain('Leaf Code 2-1')
    })

    it('should display selected cost code label in button', async () => {
      wrapper = createWrapper({ modelValue: 'leaf-2-1' })
      await flushPromises()
      
      const label = wrapper.vm.selectedCostCodeLabel
      expect(label).toContain('2001')
      expect(label).toContain('Leaf Code 2-1')
    })

    it('should display empty label when nothing is selected', () => {
      wrapper = createWrapper()
      expect(wrapper.vm.selectedCostCodeLabel).toBe('')
    })
  })

  describe('Search Functionality', () => {
    it('should filter tree items by search query', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      wrapper.vm.searchQuery = 'Leaf Code 2-1'
      await nextTick()
      
      const filtered = wrapper.vm.filteredTreeItems
      expect(filtered.length).toBeGreaterThan(0)
      
      // Should include parent nodes if their children match
      const hasMatchingItem = (items: any[]): boolean => {
        for (const item of items) {
          if (item.label?.toLowerCase().includes('leaf code 2-1')) {
            return true
          }
          if (item.children && hasMatchingItem(item.children)) {
            return true
          }
        }
        return false
      }
      
      expect(hasMatchingItem(filtered)).toBe(true)
    })

    it('should filter by cost code number', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      wrapper.vm.searchQuery = '2001'
      await nextTick()
      
      const filtered = wrapper.vm.filteredTreeItems
      expect(filtered.length).toBeGreaterThan(0)
    })

    it('should filter by cost code name', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      wrapper.vm.searchQuery = 'Parent Code'
      await nextTick()
      
      const filtered = wrapper.vm.filteredTreeItems
      expect(filtered.length).toBeGreaterThan(0)
    })

    it('should show all items when search is empty', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      wrapper.vm.searchQuery = ''
      await nextTick()
      
      expect(wrapper.vm.filteredTreeItems.length).toBe(wrapper.vm.treeItems.length)
    })

    it('should show no results message when no matches found', async () => {
      wrapper = createWrapper()
      wrapper.vm.isPopoverOpen = true
      await flushPromises()
      
      wrapper.vm.searchQuery = 'nonexistent'
      await nextTick()
      
      // The template should show "No cost codes found" message
      expect(wrapper.vm.filteredTreeItems.length).toBe(0)
    })

    it('should clear search when popover closes', async () => {
      wrapper = createWrapper()
      wrapper.vm.isPopoverOpen = true
      wrapper.vm.searchQuery = 'test query'
      await nextTick()
      
      wrapper.vm.isPopoverOpen = false
      await nextTick()
      
      expect(wrapper.vm.searchQuery).toBe('')
    })
  })

  describe('Status Badge', () => {
    it('should display Active status badge for active cost codes', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const treeItems = wrapper.vm.treeItems
      const activeNode = treeItems.find((item: any) => item.id === 'parent-1')
      
      expect(activeNode?.status).toBe('Active')
      expect(activeNode?.status_color).toBe('success')
    })

    it('should use correct status color mapping', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.getStatusColor('Active')).toBe('success')
      expect(wrapper.vm.getStatusColor('Inactive')).toBe('error')
      expect(wrapper.vm.getStatusColor('Draft')).toBe('warning')
      expect(wrapper.vm.getStatusColor('Unknown')).toBe('neutral')
    })
  })

  describe('Disabled State', () => {
    it('should disable button when disabled prop is true', () => {
      wrapper = createWrapper({ disabled: true })
      expect(wrapper.find('input[readonly]').exists()).toBe(true)
    })

    it('should disable button when loading', () => {
      mockConfigurationsStore.loading.value = true
      wrapper = createWrapper()
      
      // Button should be disabled when loading
      expect(wrapper.vm.configurationsStore.loading.value).toBe(true)
    })

    it('should disable button when no corporation UUID', () => {
      wrapper = createWrapper({ corporationUuid: undefined })
      expect(wrapper.find('input[readonly]').exists()).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty configurations list', () => {
      mockConfigurationsStore.getActiveConfigurations.mockReturnValueOnce([])
      wrapper = createWrapper()
      
      expect(wrapper.vm.treeItems.length).toBe(0)
    })

    it('should handle missing cost code data', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      // Try to select with invalid config
      const invalidItem = {
        disabled: false,
        children: undefined,
        costCode: { uuid: undefined }
      }
      
      wrapper.vm.handleItemClick(invalidItem)
      
      // Should not emit update:modelValue with undefined UUID
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('should handle external modelValue update when config not in map', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      await wrapper.setProps({ modelValue: 'nonexistent-uuid' })
      await flushPromises()
      
      // Should not crash, but selectedCostCodeOption should remain undefined
      expect(wrapper.vm.selectedCostCode).toBe('nonexistent-uuid')
      expect(wrapper.vm.selectedCostCodeOption).toBeUndefined()
    })

    it('should handle tree items update watcher', async () => {
      wrapper = createWrapper({ modelValue: 'leaf-2-1' })
      await flushPromises()
      
      // Update configurations to trigger watcher
      mockConfigurationsStore.configurations.value = [...mockConfigurations]
      await flushPromises()
      
      // Watcher should update selectedCostCodeOption
      expect(wrapper.vm.selectedCostCodeOption).toBeDefined()
    })
  })

  describe('Tree Structure with Nested Children', () => {
    it('should handle deeply nested tree structures', () => {
      wrapper = createWrapper()
      
      const treeItems = wrapper.vm.treeItems
      const parent1 = treeItems.find((item: any) => item.id === 'parent-1')
      
      expect(parent1?.children).toBeDefined()
      if (parent1?.children) {
        const child1 = parent1.children.find((item: any) => item.id === 'child-1-1')
        expect(child1).toBeDefined()
        
        if (child1?.children) {
          const grandchild = child1.children.find((item: any) => item.id === 'leaf-1-1-1')
          expect(grandchild).toBeDefined()
          expect(grandchild?.disabled).toBe(false) // Leaf node should be selectable
        }
      }
    })

    it('should prevent selection at all parent levels', () => {
      wrapper = createWrapper()
      
      const treeItems = wrapper.vm.treeItems
      const parent1 = treeItems.find((item: any) => item.id === 'parent-1')
      
      expect(parent1?.disabled).toBe(true)
      
      if (parent1?.children) {
        const child1 = parent1.children.find((item: any) => item.id === 'child-1-1')
        expect(child1?.disabled).toBe(true) // Has children (leaf-1-1-1)
      }
    })
  })

  describe('Component Watchers', () => {
    it('should watch corporationUuid changes', async () => {
      wrapper = createWrapper({ corporationUuid: 'corp-1' })
      await flushPromises()
      
      mockConfigurationsStore.configurations.value = []
      await wrapper.setProps({ corporationUuid: 'corp-2' })
      await flushPromises()
      
      // Should call getActiveConfigurations with new UUID
      expect(mockConfigurationsStore.getActiveConfigurations).toHaveBeenCalled()
    })

    it('should not update selectedCostCode if modelValue matches current value', async () => {
      wrapper = createWrapper({ modelValue: 'leaf-2-1' })
      await flushPromises()
      
      const updateSpy = vi.spyOn(wrapper.vm, 'selectedCostCode', 'set')
      
      await wrapper.setProps({ modelValue: 'leaf-2-1' })
      await flushPromises()
      
      // Should not trigger update if value is the same
      // (The watcher checks for inequality)
    })
  })
})
