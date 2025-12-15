import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import PendingProjectsCard from '@/components/Dashboards/PendingProjectsCard.vue'

const useProjectsStore = vi.fn()
const useCorporationStore = vi.fn()

vi.mock('@/stores/projects', () => ({
  useProjectsStore: () => useProjectsStore()
}))

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => useCorporationStore()
}))

describe('PendingProjectsCard', () => {
  const mountComponent = () => {
    return mount(PendingProjectsCard, {
      global: {
        stubs: {
          UCard: {
            template: '<div class="ucard"><slot /></div>'
          },
          UIcon: {
            template: '<i class="uicon" />'
          },
          USkeleton: {
            template: '<div class="skeleton" />'
          }
        }
      }
    })
  }

  let projectsRef: ReturnType<typeof ref>
  let loadingRef: ReturnType<typeof ref>
  let selectedCorporationIdRef: ReturnType<typeof ref>
  let fetchProjectsMetadata: ReturnType<typeof vi.fn>

  beforeEach(() => {
    projectsRef = ref<any[]>([])
    loadingRef = ref(false)
    selectedCorporationIdRef = ref<string | null>(null)
    fetchProjectsMetadata = vi.fn().mockResolvedValue(undefined)

    useProjectsStore.mockReturnValue(
      reactive({
        get projects() {
          return projectsRef.value
        },
        set projects(value) {
          projectsRef.value = value
        },
        get loading() {
          return loadingRef.value
        },
        set loading(value) {
          loadingRef.value = value
        },
        fetchProjectsMetadata
      })
    )

    useCorporationStore.mockReturnValue(
      reactive({
        get selectedCorporationId() {
          return selectedCorporationIdRef.value
        },
        set selectedCorporationId(value) {
          selectedCorporationIdRef.value = value
        }
      })
    )
  })

  it('shows placeholder when no corporation is selected', async () => {
    selectedCorporationIdRef.value = null

    const wrapper = mountComponent()
    await flushPromises()

    expect(fetchProjectsMetadata).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('--')
    expect(wrapper.text()).toContain('Pending Projects')
  })

  it('fetches projects and shows pending count when corporation is selected', async () => {
    selectedCorporationIdRef.value = 'corp-1'
    projectsRef.value = [
      { project_status: 'Pending' },
      { project_status: 'Pending' },
      { project_status: 'Completed' }
    ]

    const wrapper = mountComponent()
    await flushPromises()

    expect(fetchProjectsMetadata).toHaveBeenCalledWith('corp-1')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('Pending Projects')
  })

  it('shows loading skeletons when projects are loading', async () => {
    selectedCorporationIdRef.value = 'corp-1'
    loadingRef.value = true

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.findAll('.skeleton')).not.toHaveLength(0)
    expect(wrapper.text()).toContain('Pending Projects')
  })

  it('refetches projects when the selected corporation changes', async () => {
    selectedCorporationIdRef.value = 'corp-1'

    const wrapper = mountComponent()
    await flushPromises()

    fetchProjectsMetadata.mockClear()
    selectedCorporationIdRef.value = 'corp-2'

    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(fetchProjectsMetadata).toHaveBeenCalledWith('corp-2')
  })

  describe('Pending Projects Card Advanced Scenarios', () => {
    it('handles projects with different status values correctly', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      projectsRef.value = [
        { project_status: 'Pending' },
        { project_status: 'Active' },
        { project_status: 'Completed' },
        { project_status: 'On Hold' },
        { project_status: 'Cancelled' }
      ]

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('1')
      expect(wrapper.text()).toContain('Pending Projects')
    })

    it('displays zero when no projects are pending', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      projectsRef.value = [
        { project_status: 'Active' },
        { project_status: 'Completed' },
        { project_status: 'On Hold' }
      ]

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('0')
    })

    it('handles large project counts with proper formatting', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      projectsRef.value = Array.from({ length: 1500 }, (_, i) => ({
        project_status: i < 1200 ? 'Pending' : 'Active'
      }))

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('1,200')
    })

    it('displays correct count when projects array is empty', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      projectsRef.value = []

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('0')
    })

    it('handles undefined projects gracefully', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      projectsRef.value = undefined as any

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('--')
    })

    it('handles projects without project_status property', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      projectsRef.value = [
        { id: 1, name: 'Project 1' }, // missing project_status
        { id: 2, name: 'Project 2', project_status: 'Pending' }
      ]

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('1')
    })

    it('shows loading state when switching corporations', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      projectsRef.value = [{ project_status: 'Pending' }]

      const wrapper = mountComponent()
      await flushPromises()

      // Switch corporation and set loading
      loadingRef.value = true
      selectedCorporationIdRef.value = 'corp-2'

      await wrapper.vm.$nextTick()

      expect(wrapper.findAll('.skeleton')).not.toHaveLength(0)
    })
  })

  describe('Pending Projects Card UI Structure', () => {
    it('has the correct card structure and classes', async () => {
      selectedCorporationIdRef.value = 'corp-1'

      const wrapper = mountComponent()
      await flushPromises()

      const card = wrapper.find('.ucard')
      expect(card.exists()).toBe(true)
    })

    it('contains the correct icon element', async () => {
      selectedCorporationIdRef.value = 'corp-1'

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.uicon').exists()).toBe(true)
    })

    it('displays content in correct order: title, count', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      projectsRef.value = [{ project_status: 'Pending' }]

      const wrapper = mountComponent()
      await flushPromises()

      const text = wrapper.text()
      const titleIndex = text.indexOf('Pending Projects')
      const countIndex = text.indexOf('1')

      expect(titleIndex).toBeLessThan(countIndex)
    })
  })

  describe('Pending Projects Card Error Handling', () => {
    it('handles fetch errors gracefully', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      fetchProjectsMetadata.mockRejectedValue(new Error('Network error'))

      const wrapper = mountComponent()
      await flushPromises()

      // Should still show the component without crashing
      expect(wrapper.text()).toContain('Pending Projects')
    })

    it('handles malformed project data', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      projectsRef.value = [
        null,
        undefined,
        { project_status: 'Pending' },
        { project_status: null }
      ]

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('1')
    })
  })

  describe('Pending Projects Card Accessibility', () => {
    it('contains semantic text content for screen readers', async () => {
      selectedCorporationIdRef.value = 'corp-1'
      projectsRef.value = [{ project_status: 'Pending' }]

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('Pending Projects')
      expect(wrapper.text()).toContain('1')
    })

    it('provides meaningful content when no data is available', async () => {
      selectedCorporationIdRef.value = null

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.text()).toContain('Pending Projects')
      expect(wrapper.text()).toContain('--')
    })
  })
})

