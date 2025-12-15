import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CorporationSelect from '@/components/Shared/CorporationSelect.vue'
import { useAuthStore } from '@/stores/auth'
import { useCorporationStore } from '@/stores/corporations'
import { useUserProfilesStore } from '@/stores/userProfiles'
import { useRoleStore } from '@/stores/roles'

const setupStores = (options?: { isSuperAdmin?: boolean; multipleCorporations?: boolean }) => {
  const pinia = createPinia()
  setActivePinia(pinia)

  const corporations = options?.multipleCorporations
    ? [
        { uuid: 'corp-1', corporation_name: 'Corp One', legal_name: 'CorpOne LLC' },
        { uuid: 'corp-2', corporation_name: 'Tech Solutions Inc', legal_name: 'Tech Solutions Incorporated' },
        { uuid: 'corp-3', corporation_name: 'Building Masters', legal_name: 'Building Masters Ltd' },
      ]
    : [
        { uuid: 'corp-1', corporation_name: 'Corp One', legal_name: 'CorpOne LLC' },
      ]

  const roleId = options?.isSuperAdmin ? 'role-super' : 'role-1'
  const roleName = options?.isSuperAdmin ? 'Super Admin' : 'Regular User'

  const user = {
    id: 1,
    email: 'user@example.com',
    // By default the user has access to corp-1; tests can override this as needed.
    corporationAccess: ['corp-1'],
    roleId,
    firstName: 'Test',
    lastName: 'User',
    status: 'active',
  }

  const authStore = useAuthStore()
  authStore.user = user as any
  authStore.isAuthenticated = true

  const corpStore = useCorporationStore()
  corpStore.corporations = corporations as any

  const userProfilesStore = useUserProfilesStore()
  userProfilesStore.users = [user] as any

  const roleStore = useRoleStore()
  roleStore.roles = [{ id: roleId, role_name: roleName }] as any

  return {
    pinia,
    stores: {
      auth: authStore,
      corporations: corpStore,
      userProfiles: userProfilesStore,
      roles: roleStore,
    },
  }
}

const createStubs = () => ({
  USelectMenu: {
    name: 'USelectMenu',
    template: `
      <div class="u-select-menu">
        <button class="select-button" @click="$emit('update:modelValue', modelValue)">
          <slot></slot>
          <slot name="default"></slot>
        </button>
        <div class="select-items">
          <div v-for="item in items" :key="item.value" class="select-item" @click="$emit('update:modelValue', item)">
            <slot name="item-label" :item="item">{{ item.label }}</slot>
          </div>
        </div>
      </div>
    `,
    props: ['modelValue', 'items', 'searchable', 'searchablePlaceholder', 'filterFields', 'valueKey', 'placeholder', 'disabled', 'ui', 'size', 'class'],
  },
  UIcon: {
    name: 'UIcon',
    template: '<i />',
    props: ['name'],
  },
})

describe('CorporationSelect.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('renders correctly with default props', () => {
      const { pinia } = setupStores({ multipleCorporations: true })

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      expect(wrapper.exists()).toBe(true)
      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      expect(selectMenu.exists()).toBe(true)

      wrapper.unmount()
    })

    it('displays corporation options correctly', () => {
      const { pinia } = setupStores({ multipleCorporations: true })

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      const items = selectMenu.props('items')

      // Regular user should only see corp-1
      expect(items).toHaveLength(1)
      expect(items[0]).toMatchObject({
        value: 'corp-1',
        corporation_name: 'Corp One',
        legal_name: 'CorpOne LLC',
      })

      wrapper.unmount()
    })

    it('super admin sees all corporations by default', () => {
      const { pinia } = setupStores({ multipleCorporations: true, isSuperAdmin: true })

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      const items = selectMenu.props('items')

      // Super admin should see all 3 corporations
      expect(items).toHaveLength(3)

      wrapper.unmount()
    })
  })

  describe('Props', () => {
    it('respects custom placeholder', () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        props: {
          placeholder: 'Custom placeholder',
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      expect(selectMenu.props('placeholder')).toBe('Custom placeholder')

      wrapper.unmount()
    })

    it('respects searchable prop', () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        props: {
          searchable: false,
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      expect(selectMenu.props('searchable')).toBe(false)

      wrapper.unmount()
    })

    it('respects size prop', () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        props: {
          size: 'lg',
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      expect(selectMenu.props('size')).toBe('lg')

      wrapper.unmount()
    })

    it('respects disabled prop', () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        props: {
          disabled: true,
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      expect(selectMenu.props('disabled')).toBe(true)

      wrapper.unmount()
    })

    it('respects showIcon prop', () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        props: {
          showIcon: false,
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const icons = wrapper.findAllComponents({ name: 'UIcon' })
      expect(icons.length).toBe(0)

      wrapper.unmount()
    })

    it('respects showLegalName prop', () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        props: {
          modelValue: 'corp-1',
          showLegalName: false,
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const html = wrapper.html()
      expect(html).not.toContain('CorpOne LLC')

      wrapper.unmount()
    })

    it('respects filterBySuperAdmin prop', () => {
      const { pinia } = setupStores({ multipleCorporations: true })

      const wrapper = mount(CorporationSelect, {
        props: {
          filterBySuperAdmin: false,
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      const items = selectMenu.props('items')

      // Should show all corporations when not filtering by super admin
      expect(items).toHaveLength(3)

      wrapper.unmount()
    })
  })

  describe('restrictToCorporationAccess behaviour', () => {
    it('limits corporations to user access list even for super admin', () => {
      const { pinia } = setupStores({ multipleCorporations: true, isSuperAdmin: true })

      const wrapper = mount(CorporationSelect, {
        props: {
          restrictToCorporationAccess: true,
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      const items = selectMenu.props('items')

      // Access list only includes corp-1, so even super admin only sees that one
      expect(items).toHaveLength(1)
      expect(items[0]).toMatchObject({
        value: 'corp-1',
      })

      wrapper.unmount()
    })

    it('shows no corporations when restrictToCorporationAccess is true and user has no access', () => {
      const { pinia, stores } = setupStores({ multipleCorporations: true })
      // Clear access list
      stores.auth.user.corporationAccess = []
      stores.userProfiles.users[0].corporationAccess = []

      const wrapper = mount(CorporationSelect, {
        props: {
          restrictToCorporationAccess: true,
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      const items = selectMenu.props('items')

      expect(items).toHaveLength(0)

      wrapper.unmount()
    })
  })

  describe('Selection', () => {
    it('emits update:modelValue on selection', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const vm = wrapper.vm as any
      await vm.handleSelection({ value: 'corp-1', corporation_name: 'Corp One' })

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['corp-1'])

      wrapper.unmount()
    })

    it('emits change event on selection', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const vm = wrapper.vm as any
      const corporation = { value: 'corp-1', corporation_name: 'Corp One', legal_name: 'CorpOne LLC' }
      await vm.handleSelection(corporation)

      expect(wrapper.emitted('change')).toBeTruthy()
      expect(wrapper.emitted('change')![0][0]).toMatchObject(corporation)

      wrapper.unmount()
    })

    it('handles null selection', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        props: {
          modelValue: 'corp-1',
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const vm = wrapper.vm as any
      await vm.handleSelection(null)

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([undefined])
      expect(wrapper.emitted('change')![0]).toEqual([undefined])

      wrapper.unmount()
    })

    it('handles string value selection', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const vm = wrapper.vm as any
      await vm.handleSelection('corp-1')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['corp-1'])

      wrapper.unmount()
    })
  })

  describe('Data Structure', () => {
    it('includes all required fields in corporation options', () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      const items = selectMenu.props('items')

      expect(items[0]).toHaveProperty('label')
      expect(items[0]).toHaveProperty('value')
      expect(items[0]).toHaveProperty('corporation_name')
      expect(items[0]).toHaveProperty('legal_name')
      expect(items[0]).toHaveProperty('searchText')

      wrapper.unmount()
    })

    it('creates lowercase searchText for filtering', () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      const items = selectMenu.props('items')

      expect(items[0].searchText).toBe(items[0].searchText.toLowerCase())
      expect(items[0].searchText).toContain('corp one')
      expect(items[0].searchText).toContain('corpone llc')

      wrapper.unmount()
    })

    it('configures filter fields correctly', () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      expect(selectMenu.props('filterFields')).toEqual(['label', 'searchText'])

      wrapper.unmount()
    })
  })

  describe('Access Control', () => {
    it('shows only accessible corporations for regular users', () => {
      const { pinia, stores } = setupStores({ multipleCorporations: true })
      
      // Update user to have access to only corp-1 and corp-2
      stores.auth.user.corporationAccess = ['corp-1', 'corp-2']
      stores.userProfiles.users[0].corporationAccess = ['corp-1', 'corp-2']

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      const items = selectMenu.props('items')

      expect(items).toHaveLength(2)
      expect(items.map((i: any) => i.value)).toEqual(['corp-1', 'corp-2'])

      wrapper.unmount()
    })

    it('disables when user has no accessible corporations', () => {
      const { pinia, stores } = setupStores()
      
      stores.auth.user.corporationAccess = []
      stores.userProfiles.users[0].corporationAccess = []

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      expect(selectMenu.props('disabled')).toBe(true)

      wrapper.unmount()
    })

    it('shows "No corporations accessible" placeholder when disabled', () => {
      const { pinia, stores } = setupStores()
      
      stores.auth.user.corporationAccess = []
      stores.userProfiles.users[0].corporationAccess = []

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      expect(wrapper.html()).toContain('No corporations accessible')

      wrapper.unmount()
    })
  })

  describe('Performance', () => {
    it('creates Map for O(1) lookups', () => {
      const { pinia } = setupStores({ multipleCorporations: true })

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const vm = wrapper.vm as any
      const optionsMap = vm.corporationOptionsMap

      expect(optionsMap).toBeInstanceOf(Map)
      expect(optionsMap.size).toBeGreaterThan(0)

      wrapper.unmount()
    })
  })

  describe('Reactivity', () => {
    it('updates selected corporation when modelValue changes', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        props: {
          modelValue: 'corp-1',
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const vm = wrapper.vm as any
      expect(vm.selectedCorporation).toBe('corp-1')

      await wrapper.setProps({ modelValue: undefined })
      expect(vm.selectedCorporation).toBe(undefined)

      wrapper.unmount()
    })

    it('updates selectedCorporationObject when selection changes', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const vm = wrapper.vm as any
      
      await wrapper.setProps({ modelValue: 'corp-1' })
      await wrapper.vm.$nextTick()

      expect(vm.selectedCorporationObject).toBeDefined()
      expect(vm.selectedCorporationObject.value).toBe('corp-1')

      wrapper.unmount()
    })
  })

  describe('UI Configuration', () => {
    it('uses default UI configuration', () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      const ui = selectMenu.props('ui')

      expect(ui.content).toContain('max-h-80')
      expect(ui.content).toContain('max-w-xl')

      wrapper.unmount()
    })

    it('allows custom UI configuration override', () => {
      const { pinia } = setupStores()

      const customUi = {
        content: 'custom-class',
      }

      const wrapper = mount(CorporationSelect, {
        props: {
          ui: customUi,
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      const ui = selectMenu.props('ui')

      expect(ui.content).toContain('custom-class')

      wrapper.unmount()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty corporations list', () => {
      const { pinia, stores } = setupStores()
      stores.corporations.corporations = []

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      expect(selectMenu.props('items')).toHaveLength(0)
      expect(selectMenu.props('disabled')).toBe(true)

      wrapper.unmount()
    })

    it('handles undefined corporationAccess gracefully', () => {
      const { pinia, stores } = setupStores()
      stores.auth.user.corporationAccess = undefined
      stores.userProfiles.users[0].corporationAccess = undefined

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      expect(selectMenu.props('disabled')).toBe(true)

      wrapper.unmount()
    })

    it('handles null user gracefully', () => {
      const { pinia, stores } = setupStores()
      stores.auth.user = null
      stores.userProfiles.users = []

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      expect(selectMenu.props('disabled')).toBe(true)

      wrapper.unmount()
    })

    it('handles selection with object containing uuid instead of value', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const vm = wrapper.vm as any
      await vm.handleSelection({ uuid: 'corp-1', corporation_name: 'Corp One' })

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['corp-1'])

      wrapper.unmount()
    })

    it('handles selection with invalid corporation object', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const vm = wrapper.vm as any
      // Object with neither value nor uuid
      await vm.handleSelection({ name: 'Invalid' })

      expect(wrapper.emitted('update:modelValue')).toBeFalsy()

      wrapper.unmount()
    })

    it('handles corporations with special characters in names', () => {
      const { pinia, stores } = setupStores()
      stores.corporations.corporations = [
        {
          uuid: 'corp-special',
          corporation_name: 'Corp & Partners, LLC.',
          legal_name: "O'Brien & Associates"
        }
      ] as any
      stores.auth.user.corporationAccess = ['corp-special']
      stores.userProfiles.users[0].corporationAccess = ['corp-special']

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      const items = selectMenu.props('items')

      expect(items[0].corporation_name).toBe('Corp & Partners, LLC.')
      expect(items[0].legal_name).toBe("O'Brien & Associates")

      wrapper.unmount()
    })

    it('handles very long corporation names', () => {
      const { pinia, stores } = setupStores()
      const longName = 'A'.repeat(200)
      stores.corporations.corporations = [
        {
          uuid: 'corp-long',
          corporation_name: longName,
          legal_name: longName
        }
      ] as any
      stores.auth.user.corporationAccess = ['corp-long']
      stores.userProfiles.users[0].corporationAccess = ['corp-long']

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      const items = selectMenu.props('items')

      expect(items[0].corporation_name).toBe(longName)
      expect(items[0].searchText).toContain(longName.toLowerCase())

      wrapper.unmount()
    })

    it('handles modelValue change to non-existent corporation', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        props: {
          modelValue: 'corp-1',
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      await wrapper.setProps({ modelValue: 'non-existent-corp' })
      
      const vm = wrapper.vm as any
      expect(vm.selectedCorporationObject).toBeUndefined()

      wrapper.unmount()
    })

    it('handles rapid model value changes', async () => {
      const { pinia } = setupStores({ multipleCorporations: true, isSuperAdmin: true })

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      // Rapidly change values
      await wrapper.setProps({ modelValue: 'corp-1' })
      await wrapper.setProps({ modelValue: 'corp-2' })
      await wrapper.setProps({ modelValue: 'corp-3' })
      await wrapper.setProps({ modelValue: undefined })
      
      const vm = wrapper.vm as any
      expect(vm.selectedCorporation).toBeUndefined()

      wrapper.unmount()
    })
  })

  describe('Search Functionality', () => {
    it('configures searchable placeholder correctly', () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        props: {
          searchablePlaceholder: 'Custom search placeholder...',
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      expect(selectMenu.props('searchablePlaceholder')).toBe('Custom search placeholder...')

      wrapper.unmount()
    })

    it('includes UUID in searchText for advanced searching', () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      const items = selectMenu.props('items')

      expect(items[0].searchText).toContain('corp-1')

      wrapper.unmount()
    })

    it('searchText includes both corporation name and legal name', () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      const items = selectMenu.props('items')

      expect(items[0].searchText).toContain('corp one')
      expect(items[0].searchText).toContain('corpone llc')

      wrapper.unmount()
    })
  })

  describe('Display Customization', () => {
    it('shows both corporation name and legal name by default', () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        props: {
          modelValue: 'corp-1',
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const html = wrapper.html()
      expect(html).toContain('Corp One')
      expect(html).toContain('CorpOne LLC')

      wrapper.unmount()
    })

    it('hides legal name when showLegalName is false in default slot', () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        props: {
          modelValue: 'corp-1',
          showLegalName: false,
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const html = wrapper.html()
      expect(html).toContain('Corp One')
      expect(html).not.toContain('CorpOne LLC')

      wrapper.unmount()
    })

    it('shows icon by default', () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        props: {
          modelValue: 'corp-1',
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const icons = wrapper.findAllComponents({ name: 'UIcon' })
      expect(icons.length).toBeGreaterThan(0)

      wrapper.unmount()
    })

    it('shows correct placeholder when no selection', () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const html = wrapper.html()
      expect(html).toContain('Search corporation...')

      wrapper.unmount()
    })
  })

  describe('Integration with Stores', () => {
    it('updates when corporations are added to store', async () => {
      const { pinia, stores } = setupStores({ isSuperAdmin: true })

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      let selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      expect(selectMenu.props('items')).toHaveLength(1)

      // Add a new corporation
      stores.corporations.corporations.push({
        uuid: 'corp-new',
        corporation_name: 'New Corp',
        legal_name: 'New Corp LLC'
      } as any)

      await wrapper.vm.$nextTick()

      selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      expect(selectMenu.props('items')).toHaveLength(2)

      wrapper.unmount()
    })

    it('updates when user access changes', async () => {
      const { pinia, stores } = setupStores({ multipleCorporations: true })

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      let selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      expect(selectMenu.props('items')).toHaveLength(1)

      // Grant access to more corporations
      stores.auth.user.corporationAccess = ['corp-1', 'corp-2', 'corp-3']
      stores.userProfiles.users[0].corporationAccess = ['corp-1', 'corp-2', 'corp-3']

      await wrapper.vm.$nextTick()

      selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      expect(selectMenu.props('items')).toHaveLength(3)

      wrapper.unmount()
    })
  })

  describe('v-model Binding', () => {
    it('supports two-way binding', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        props: {
          modelValue: 'corp-1',
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const vm = wrapper.vm as any
      expect(vm.selectedCorporation).toBe('corp-1')

      // Simulate user clearing selection (passing null)
      await vm.handleSelection(null)

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([undefined])

      wrapper.unmount()
    })

    it('syncs with external modelValue changes', async () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        props: {
          modelValue: undefined,
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const vm = wrapper.vm as any
      expect(vm.selectedCorporation).toBeUndefined()

      await wrapper.setProps({ modelValue: 'corp-1' })
      expect(vm.selectedCorporation).toBe('corp-1')

      wrapper.unmount()
    })
  })

  describe('Custom Class Names', () => {
    it('applies custom className prop', () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        props: {
          className: 'w-48 md:w-64',
        },
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      expect(selectMenu.props('class')).toBe('w-48 md:w-64')

      wrapper.unmount()
    })

    it('uses default className when not provided', () => {
      const { pinia } = setupStores()

      const wrapper = mount(CorporationSelect, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      })

      const selectMenu = wrapper.findComponent({ name: 'USelectMenu' })
      expect(selectMenu.props('class')).toBe('w-full')

      wrapper.unmount()
    })
  })
})

