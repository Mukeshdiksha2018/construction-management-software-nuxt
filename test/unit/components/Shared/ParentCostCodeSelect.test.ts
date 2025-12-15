import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { ref, nextTick } from 'vue'
import ParentCostCodeSelect from '@/components/Shared/ParentCostCodeSelect.vue'

// Mock the store
const mockConfigurations = [
  {
    id: 1,
    uuid: 'root-1',
    corporation_uuid: 'corp-1',
    division_uuid: null,
    cost_code_number: '1000',
    cost_code_name: 'Root Code 1',
    parent_cost_code_uuid: null,
    is_active: true,
    order: 1
  },
  {
    id: 2,
    uuid: 'level1-1',
    corporation_uuid: 'corp-1',
    division_uuid: null,
    cost_code_number: '1001',
    cost_code_name: 'First Level Code 1',
    parent_cost_code_uuid: 'root-1',
    is_active: true,
    order: 1
  },
  {
    id: 3,
    uuid: 'level1-2',
    corporation_uuid: 'corp-1',
    division_uuid: null,
    cost_code_number: '1002',
    cost_code_name: 'First Level Code 2',
    parent_cost_code_uuid: 'root-1',
    is_active: true,
    order: 2
  },
  {
    id: 4,
    uuid: 'level2-1',
    corporation_uuid: 'corp-1',
    division_uuid: null,
    cost_code_number: '1001-1',
    cost_code_name: 'Second Level Code 1 (Should be disabled)',
    parent_cost_code_uuid: 'level1-1',
    is_active: true,
    order: 1
  },
  {
    id: 5,
    uuid: 'root-2',
    corporation_uuid: 'corp-1',
    division_uuid: 'div-1',
    cost_code_number: '2000',
    cost_code_name: 'Root Code 2 (Division 1)',
    parent_cost_code_uuid: null,
    is_active: true,
    order: 2
  },
  {
    id: 6,
    uuid: 'root-3',
    corporation_uuid: 'corp-1',
    division_uuid: null,
    cost_code_number: '3000',
    cost_code_name: 'Root Code 3 (No Division)',
    parent_cost_code_uuid: null,
    is_active: true,
    order: 3
  },
  {
    id: 7,
    uuid: 'inactive-1',
    corporation_uuid: 'corp-1',
    division_uuid: null,
    cost_code_number: '4000',
    cost_code_name: 'Inactive Code',
    parent_cost_code_uuid: null,
    is_active: false,
    order: 4
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

describe('ParentCostCodeSelect Component', () => {
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
    return mount(ParentCostCodeSelect, {
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

    it('should apply custom className', () => {
      wrapper = createWrapper({ className: 'custom-class' })
      expect(wrapper.find('.custom-class').exists()).toBe(true)
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
      
      expect(mockConfigurationsStore.getActiveConfigurations).toHaveBeenCalled()
    })
    
    it("should use local configurations when provided", () => {
      const localConfigs = [
        {
          id: 1,
          uuid: "local-1",
          corporation_uuid: "corp-1",
          division_uuid: null,
          cost_code_number: "LOCAL-001",
          cost_code_name: "Local Config",
          parent_cost_code_uuid: null,
          is_active: true,
          order: 1,
        },
      ];
      wrapper = createWrapper({
        corporationUuid: "corp-1",
        localConfigurations: localConfigs,
      });

      // Should use local configurations instead of store
      const activeConfigs = wrapper.vm.activeConfigurations;
      expect(activeConfigs.length).toBeGreaterThan(0);
      expect(activeConfigs.some((c: any) => c.uuid === "local-1")).toBe(true);
    });

    it("should not fetch from store when local configurations are provided", () => {
      const localConfigs = [
        {
          id: 1,
          uuid: "local-1",
          corporation_uuid: "corp-1",
          division_uuid: null,
          cost_code_number: "LOCAL-001",
          cost_code_name: "Local Config",
          parent_cost_code_uuid: null,
          is_active: true,
          order: 1,
        },
      ];
      wrapper = createWrapper({
        corporationUuid: "corp-1",
        localConfigurations: localConfigs,
      });

      // Should not fetch from store
      expect(
        mockConfigurationsStore.fetchConfigurations
      ).not.toHaveBeenCalled();
    });
  })

  describe('Tree Structure Building', () => {
    it('should build correct tree structure from flat list', () => {
      wrapper = createWrapper()
      const treeItems = wrapper.vm.treeItems
      
      expect(treeItems.length).toBeGreaterThan(0)
      
      // Find root node
      const root1 = treeItems.find((item: any) => item.id === 'root-1')
      expect(root1).toBeDefined()
      expect(root1?.children).toBeDefined()
      expect(root1?.children.length).toBe(2) // level1-1 and level1-2
      expect(root1?.disabled).toBe(false) // Root nodes are selectable
    })

    it('should set defaultExpanded for parent nodes', () => {
      wrapper = createWrapper()
      const treeItems = wrapper.vm.treeItems
      
      const root1 = treeItems.find((item: any) => item.id === 'root-1')
      expect(root1?.defaultExpanded).toBe(true)
    })

    it('should disable second-level sub-accounts (level 2+)', () => {
      wrapper = createWrapper()
      const treeItems = wrapper.vm.treeItems
      
      // Find root node
      const root1 = treeItems.find((item: any) => item.id === 'root-1')
      expect(root1).toBeDefined()
      
      // Find first-level child
      const level1 = root1?.children.find((item: any) => item.id === 'level1-1')
      expect(level1).toBeDefined()
      expect(level1?.disabled).toBe(false) // First level is selectable
      
      // Find second-level child
      const level2 = level1?.children?.find((item: any) => item.id === 'level2-1')
      expect(level2).toBeDefined()
      expect(level2?.disabled).toBe(true) // Second level should be disabled
    })

    it('should allow selection of root and first-level nodes', () => {
      wrapper = createWrapper()
      const treeItems = wrapper.vm.treeItems
      
      const root1 = treeItems.find((item: any) => item.id === 'root-1')
      expect(root1?.disabled).toBe(false) // Root is selectable
      
      const level1 = root1?.children.find((item: any) => item.id === 'level1-1')
      expect(level1?.disabled).toBe(false) // First level is selectable
    })

    it('should only include active configurations', () => {
      wrapper = createWrapper()
      const treeItems = wrapper.vm.treeItems
      
      // inactive-1 should not be in the tree
      const inactiveNode = treeItems.find((item: any) => item.id === 'inactive-1')
      expect(inactiveNode).toBeUndefined()
    })
  })

  describe('Division Filtering', () => {
    it('should show only cost codes without division when divisionUuid is null', () => {
      wrapper = createWrapper({ divisionUuid: null })
      const activeConfigs = wrapper.vm.activeConfigurations
      
      // Should only include configs with division_uuid === null
      activeConfigs.forEach((config: any) => {
        expect(config.division_uuid).toBeNull()
      })
      
      // Should include root-1, root-3 but not root-2 (which has div-1)
      const hasRoot1 = activeConfigs.some((c: any) => c.uuid === 'root-1')
      const hasRoot3 = activeConfigs.some((c: any) => c.uuid === 'root-3')
      const hasRoot2 = activeConfigs.some((c: any) => c.uuid === 'root-2')
      
      expect(hasRoot1).toBe(true)
      expect(hasRoot3).toBe(true)
      expect(hasRoot2).toBe(false)
    })

    it('should show only cost codes for specific division when divisionUuid is provided', () => {
      wrapper = createWrapper({ divisionUuid: 'div-1' })
      const activeConfigs = wrapper.vm.activeConfigurations
      
      // Should only include configs with division_uuid === 'div-1'
      activeConfigs.forEach((config: any) => {
        expect(config.division_uuid).toBe('div-1')
      })
      
      // Should include root-2 but not root-1 or root-3
      const hasRoot2 = activeConfigs.some((c: any) => c.uuid === 'root-2')
      const hasRoot1 = activeConfigs.some((c: any) => c.uuid === 'root-1')
      const hasRoot3 = activeConfigs.some((c: any) => c.uuid === 'root-3')
      
      expect(hasRoot2).toBe(true)
      expect(hasRoot1).toBe(false)
      expect(hasRoot3).toBe(false)
    })

    it('should show cost codes without division when divisionUuid is undefined', () => {
      wrapper = createWrapper({ divisionUuid: undefined })
      const activeConfigs = wrapper.vm.activeConfigurations
      
      // Should filter to only null division_uuid
      activeConfigs.forEach((config: any) => {
        expect(config.division_uuid).toBeNull()
      })
    })
  })

  describe('Exclusion of Current Configuration', () => {
    it('should exclude specified UUID from tree', () => {
      wrapper = createWrapper({ excludeUuid: 'root-1' })
      const treeItems = wrapper.vm.treeItems
      
      const root1 = treeItems.find((item: any) => item.id === 'root-1')
      expect(root1).toBeUndefined()
    })

    it('should exclude all descendants of excluded UUID', () => {
      wrapper = createWrapper({ excludeUuid: 'root-1' })
      const treeItems = wrapper.vm.treeItems
      
      // Should not include level1-1, level1-2, or level2-1 (all descendants of root-1)
      const hasLevel1 = treeItems.some((item: any) => {
        if (item.id === 'level1-1' || item.id === 'level1-2') return true
        if (item.children) {
          return item.children.some((child: any) => 
            child.id === 'level1-1' || child.id === 'level1-2' || child.id === 'level2-1'
          )
        }
        return false
      })
      
      expect(hasLevel1).toBe(false)
    })

    it('should not exclude when excludeUuid is not provided', () => {
      wrapper = createWrapper()
      const treeItems = wrapper.vm.treeItems
      
      const root1 = treeItems.find((item: any) => item.id === 'root-1')
      expect(root1).toBeDefined()
    })
  })

  describe('Selection Handling', () => {
    it('should allow selection of root nodes', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const treeItems = wrapper.vm.treeItems
      const rootNode = treeItems.find((item: any) => item.id === 'root-1')
      
      expect(rootNode?.disabled).toBe(false)
      
      wrapper.vm.handleItemClick(rootNode)
      
      expect(wrapper.vm.selectedCostCode).toBe(rootNode.costCode.uuid)
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    })

    it('should allow selection of first-level nodes', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const treeItems = wrapper.vm.treeItems
      const root1 = treeItems.find((item: any) => item.id === 'root-1')
      const level1 = root1?.children.find((item: any) => item.id === 'level1-1')
      
      expect(level1?.disabled).toBe(false)
      
      wrapper.vm.handleItemClick(level1)
      
      expect(wrapper.vm.selectedCostCode).toBe(level1.costCode.uuid)
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    })

    it('should prevent selection of second-level sub-accounts', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const treeItems = wrapper.vm.treeItems
      const root1 = treeItems.find((item: any) => item.id === 'root-1')
      const level1 = root1?.children.find((item: any) => item.id === 'level1-1')
      const level2 = level1?.children?.find((item: any) => item.id === 'level2-1')
      
      expect(level2?.disabled).toBe(true)
      
      const initialSelected = wrapper.vm.selectedCostCode
      wrapper.vm.handleItemClick(level2)
      
      // Selection should not change
      expect(wrapper.vm.selectedCostCode).toBe(initialSelected)
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('should emit change event with full cost code option', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const treeItems = wrapper.vm.treeItems
      const rootNode = treeItems.find((item: any) => item.id === 'root-1')
      
      wrapper.vm.handleItemClick(rootNode)
      
      expect(wrapper.emitted('change')).toBeTruthy()
      const changeEvent = wrapper.emitted('change')?.[0][0]
      expect(changeEvent).toHaveProperty('value', rootNode.costCode.uuid)
      expect(changeEvent).toHaveProperty('label')
      expect(changeEvent).toHaveProperty('costCode')
      expect(changeEvent).toHaveProperty('status')
    })

    it('should close popover after selection', async () => {
      wrapper = createWrapper()
      wrapper.vm.isPopoverOpen = true
      await flushPromises()
      
      const treeItems = wrapper.vm.treeItems
      const rootNode = treeItems.find((item: any) => item.id === 'root-1')
      
      wrapper.vm.selectCostCode(rootNode.costCode)
      
      expect(wrapper.vm.isPopoverOpen).toBe(false)
    })

    it('should handle tree select event', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const treeItems = wrapper.vm.treeItems
      const rootNode = treeItems.find((item: any) => item.id === 'root-1')
      
      const mockEvent = {
        preventDefault: vi.fn()
      }
      
      wrapper.vm.handleTreeSelect(mockEvent as any, rootNode)
      
      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(wrapper.vm.selectedCostCode).toBe(rootNode.costCode.uuid)
    })

    it('should prevent selection when item is disabled in tree select', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      const treeItems = wrapper.vm.treeItems
      const root1 = treeItems.find((item: any) => item.id === 'root-1')
      const level1 = root1?.children.find((item: any) => item.id === 'level1-1')
      const level2 = level1?.children?.find((item: any) => item.id === 'level2-1')
      
      const mockEvent = {
        preventDefault: vi.fn()
      }
      
      wrapper.vm.handleTreeSelect(mockEvent as any, level2)
      
      expect(mockEvent.preventDefault).toHaveBeenCalled()
      // Selection should not occur
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })
  })

  describe('v-model Binding', () => {
    it('should update when modelValue prop changes', async () => {
      wrapper = createWrapper({ modelValue: undefined })
      await flushPromises()
      
      await wrapper.setProps({ modelValue: 'root-1' })
      await flushPromises()
      
      expect(wrapper.vm.selectedCostCode).toBe('root-1')
    })

    it('should clear selection when modelValue is set to undefined', async () => {
      wrapper = createWrapper({ modelValue: 'root-1' })
      await flushPromises()
      
      await wrapper.setProps({ modelValue: undefined })
      await flushPromises()
      
      expect(wrapper.vm.selectedCostCode).toBeUndefined()
      expect(wrapper.vm.selectedCostCodeOption).toBeUndefined()
    })

    it('should display selected cost code label in button', async () => {
      wrapper = createWrapper({ modelValue: 'root-1' })
      await flushPromises()
      
      const label = wrapper.vm.selectedCostCodeLabel
      expect(label).toContain('1000')
      expect(label).toContain('Root Code 1')
    })
  })

  describe('Search Functionality', () => {
    it('should filter tree items by search query', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      wrapper.vm.searchQuery = 'Root Code 1'
      await nextTick()
      
      const filtered = wrapper.vm.filteredTreeItems
      expect(filtered.length).toBeGreaterThan(0)
      
      const hasMatchingItem = (items: any[]): boolean => {
        for (const item of items) {
          if (item.label?.toLowerCase().includes('root code 1')) {
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
      
      wrapper.vm.searchQuery = '1000'
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
      const rootNode = treeItems.find((item: any) => item.id === 'root-1')
      
      expect(rootNode?.status).toBe('Active')
      expect(rootNode?.status_color).toBe('success')
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
      
      const invalidItem = {
        disabled: false,
        children: undefined,
        costCode: { uuid: undefined }
      }
      
      wrapper.vm.handleItemClick(invalidItem)
      
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('should handle external modelValue update when config not in map', async () => {
      wrapper = createWrapper()
      await flushPromises()
      
      await wrapper.setProps({ modelValue: 'nonexistent-uuid' })
      await flushPromises()
      
      expect(wrapper.vm.selectedCostCode).toBe('nonexistent-uuid')
      expect(wrapper.vm.selectedCostCodeOption).toBeUndefined()
    })
  })

  describe('Division Filtering Integration', () => {
    it('should update tree when division changes', async () => {
      wrapper = createWrapper({ divisionUuid: null })
      await flushPromises()
      
      const initialCount = wrapper.vm.treeItems.length
      
      await wrapper.setProps({ divisionUuid: 'div-1' })
      await flushPromises()
      
      // Tree should update with filtered items
      expect(wrapper.vm.activeConfigurations.length).toBeGreaterThan(0)
      // All should be from div-1
      wrapper.vm.activeConfigurations.forEach((config: any) => {
        expect(config.division_uuid).toBe('div-1')
      })
    })

    it('should handle switching from division to no division', async () => {
      wrapper = createWrapper({ divisionUuid: 'div-1' })
      await flushPromises()
      
      await wrapper.setProps({ divisionUuid: null })
      await flushPromises()
      
      // All should have no division
      wrapper.vm.activeConfigurations.forEach((config: any) => {
        expect(config.division_uuid).toBeNull()
      })
    })
  })

  describe('Visual Feedback for Disabled Items', () => {
    it('should apply disabled styling to second-level items', () => {
      wrapper = createWrapper()
      const treeItems = wrapper.vm.treeItems
      
      // Find second-level item
      const root1 = treeItems.find((item: any) => item.id === 'root-1')
      const level1 = root1?.children.find((item: any) => item.id === 'level1-1')
      const level2 = level1?.children?.find((item: any) => item.id === 'level2-1')
      
      expect(level2?.disabled).toBe(true)
    })
  })
})

