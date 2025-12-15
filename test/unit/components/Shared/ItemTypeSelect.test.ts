import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import { ref } from 'vue'
import ItemTypeSelect from '@/components/Shared/ItemTypeSelect.vue'

const selectStub = {
  name: 'USelectMenu',
  props: [
    'modelValue',
    'items',
    'placeholder',
    'searchable',
    'searchablePlaceholder',
    'size',
    'class',
    'disabled',
    'ui',
    'valueKey',
  ],
  template: '<div class="select-stub">{{ items.map(item => item.label).join("|") }}</div>',
}

const badgeStub = {
  name: 'UBadge',
  template: '<span class="badge-stub"><slot /></span>',
}

describe('ItemTypeSelect.vue', () => {
  let pinia: ReturnType<typeof createPinia>
  let fetchItemTypesSpy: ReturnType<typeof vi.fn>
  let useItemTypesStore: ReturnType<typeof defineStore>
  let itemTypesStore: any
  const corpUuid = 'corp-1'
  const projectUuid = 'proj-1'
  const corpType = {
    id: 1,
    uuid: 'type-corp',
    corporation_uuid: corpUuid,
    project_uuid: null,
    item_type: 'General Material',
    short_name: 'MAT',
    is_active: true,
  }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    fetchItemTypesSpy = vi.fn(async () => {})

    useItemTypesStore = defineStore('itemTypes', () => {
      const itemTypes = ref<any[]>([])
      const loading = ref(false)
      const hasDataForCorporation = ref<Set<string>>(new Set())
      const hasDataForProject = ref<Set<string>>(new Set())
      
      const fetchItemTypes = async (incomingCorpUuid: string, incomingProjectUuid?: string | null, forceRefresh = false) => {
        fetchItemTypesSpy(incomingCorpUuid, incomingProjectUuid ?? null, forceRefresh)
        if (!incomingProjectUuid) {
          itemTypes.value = [corpType]
          hasDataForCorporation.value.add(incomingCorpUuid)
        } else {
          hasDataForProject.value.add(`${incomingCorpUuid}-${incomingProjectUuid}`)
        }
      }
      const getActiveItemTypes = (incomingCorpUuid: string, incomingProjectUuid?: string | null) => {
        return itemTypes.value.filter(
          (type) =>
            type.corporation_uuid === incomingCorpUuid &&
            type.is_active &&
            (!incomingProjectUuid || type.project_uuid === incomingProjectUuid)
        )
      }
      const hasCachedData = (incomingCorpUuid: string, incomingProjectUuid?: string | null) => {
        if (incomingProjectUuid) {
          return hasDataForProject.value.has(`${incomingCorpUuid}-${incomingProjectUuid}`)
        }
        return hasDataForCorporation.value.has(incomingCorpUuid)
      }
      return {
        itemTypes,
        loading,
        fetchItemTypes,
        getActiveItemTypes,
        hasCachedData,
      }
    })

    itemTypesStore = useItemTypesStore()
    itemTypesStore.itemTypes = []
    itemTypesStore.loading = false
    fetchItemTypesSpy.mockClear()
  })

  it('shows only project-specific item types when projectUuid is provided', async () => {
    const projectType = {
      id: 2,
      uuid: 'type-proj',
      corporation_uuid: corpUuid,
      project_uuid: projectUuid,
      item_type: 'Project Material',
      short_name: 'PMAT',
      is_active: true,
    }
    // Add both corporation-wide and project-specific item types
    itemTypesStore.itemTypes = [corpType, projectType]

    const wrapper = mount(ItemTypeSelect, {
      props: {
        modelValue: projectType.uuid,
        corporationUuid: corpUuid,
        projectUuid,
      },
      global: {
        plugins: [pinia],
        stubs: {
          USelectMenu: selectStub,
          UBadge: badgeStub,
        },
      },
    })

    await flushPromises()

    const display = wrapper.find('.select-stub').text()
    // Should only show project-specific item type, not corporation-wide
    expect(display).toContain('Project Material')
    expect(display).not.toContain('General Material')
    const vm = wrapper.vm as any
    expect(vm.selectedItemTypeObject?.value).toBe(projectType.uuid)
    expect(vm.selectedItemTypeObject?.label).toBe('Project Material')
  })

  it('shows empty list when projectUuid is provided but no project-specific item types exist', async () => {
    // Only corporation-wide item type exists
    itemTypesStore.itemTypes = [corpType]

    const wrapper = mount(ItemTypeSelect, {
      props: {
        modelValue: undefined,
        corporationUuid: corpUuid,
        projectUuid,
      },
      global: {
        plugins: [pinia],
        stubs: {
          USelectMenu: selectStub,
          UBadge: badgeStub,
        },
      },
    })

    await flushPromises()

    const display = wrapper.find('.select-stub').text()
    // Should not show corporation-wide item type when projectUuid is provided
    expect(display).not.toContain('General Material')
    expect(display).toBe('')
  })

  it('requests item types when none are available', async () => {
    itemTypesStore.itemTypes = []

    mount(ItemTypeSelect, {
      props: {
        modelValue: undefined,
        corporationUuid: corpUuid,
        projectUuid,
      },
      global: {
        plugins: [pinia],
        stubs: {
          USelectMenu: selectStub,
          UBadge: badgeStub,
        },
      },
    })

    await flushPromises()

    const calls = fetchItemTypesSpy.mock.calls
    const hasProjectFetch = calls.some(
      ([incomingCorpUuid, incomingProjectUuid]) =>
        incomingCorpUuid === corpUuid && incomingProjectUuid === projectUuid
    )
    expect(hasProjectFetch).toBe(true)
  })
})


