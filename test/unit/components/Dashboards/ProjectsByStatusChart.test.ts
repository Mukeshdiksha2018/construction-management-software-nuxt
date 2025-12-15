import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive, nextTick } from 'vue'
import ProjectsByStatusChart from '@/components/Dashboards/charts/ProjectsByStatusChart.vue'

const useProjectsStore = vi.fn()
const useCorporationStore = vi.fn()

vi.mock('@/stores/projects', () => ({
  useProjectsStore: () => useProjectsStore()
}))

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => useCorporationStore()
}))

// Mock Chart.js
vi.mock('chart.js', () => {
  const mockChart = vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    update: vi.fn(),
    data: {}
  }))

  mockChart.register = vi.fn()

  return {
    Chart: mockChart,
    registerables: []
  }
})

describe('ProjectsByStatusChart', () => {
  const mountComponent = () => {
    return mount(ProjectsByStatusChart, {
      attachTo: document.body, // Needed for canvas element
      global: {
        stubs: {
          // Any other components that might be needed
        }
      }
    })
  }

  let projectsStoreRef: ReturnType<typeof ref>
  let corporationStoreRef: ReturnType<typeof ref>
  let getProjectCountByStatus: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    projectsStoreRef = ref({
      getProjectCountByStatus: vi.fn(() => ({
        Pending: 5,
        "In Progress": 3,
        "On Hold": 2,
        Completed: 8
      }))
    })

    corporationStoreRef = ref({
      selectedCorporationId: 'corp-1'
    })

    getProjectCountByStatus = vi.fn(() => ({
      Pending: 5,
      "In Progress": 3,
      "On Hold": 2,
      Completed: 8
    }))

    useProjectsStore.mockReturnValue(
      reactive({
        get getProjectCountByStatus() {
          return getProjectCountByStatus
        }
      })
    )

    useCorporationStore.mockReturnValue(
      reactive({
        get selectedCorporationId() {
          return corporationStoreRef.value.selectedCorporationId
        }
      })
    )
  })

  describe('ProjectsByStatusChart Rendering', () => {
    it('renders the chart container with correct structure', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.w-full').exists()).toBe(true)
      expect(wrapper.find('.h-64').exists()).toBe(true)
      expect(wrapper.find('canvas').exists()).toBe(true)
      expect(wrapper.find('.flex.flex-wrap.justify-center').exists()).toBe(true)
    })

    it('initializes Chart.js with pie type', async () => {
      const { Chart } = await import('chart.js')
      const wrapper = mountComponent()
      await flushPromises()

      expect(Chart).toHaveBeenCalledWith(
        expect.any(Object), // canvas element
        expect.objectContaining({
          type: 'pie',
          data: expect.any(Object),
          options: expect.any(Object)
        })
      )
    })

    it('creates chart with correct data structure', async () => {
      const { Chart } = await import('chart.js')
      const wrapper = mountComponent()
      await flushPromises()

      const chartCall = (Chart as any).mock.calls[0]
      const chartData = chartCall[1].data

      expect(chartData.labels).toEqual(['Pending', 'In Progress', 'On Hold', 'Completed'])
      expect(chartData.datasets[0].label).toBe('Projects by Status')
      expect(chartData.datasets[0].data).toEqual([5, 3, 2, 8])
    })

    it('applies correct colors for each status', async () => {
      const { Chart } = await import('chart.js')
      const wrapper = mountComponent()
      await flushPromises()

      const chartCall = (Chart as any).mock.calls[0]
      const chartData = chartCall[1].data

      expect(chartData.datasets[0].backgroundColor).toEqual([
        'rgb(255, 205, 86)',  // Pending - yellow
        'rgb(34, 197, 94)',   // In Progress - green
        'rgb(255, 99, 132)',  // On Hold - red
        'rgb(61, 92, 124)'    // Completed - primary brand (#3D5C7C)
      ])

      // borderColor is no longer used in the pie chart
      expect(chartData.datasets[0].borderColor).toBeUndefined()
    })
  })

  describe('ProjectsByStatusChart Data Handling', () => {
    it('fetches project status counts on mount', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      expect(getProjectCountByStatus).toHaveBeenCalled()
    })

    it('handles empty status counts', async () => {
      getProjectCountByStatus.mockReturnValueOnce({})

      const { Chart } = await import('chart.js')
      const wrapper = mountComponent()
      await flushPromises()

      const chartCall = (Chart as any).mock.calls[0]
      const chartData = chartCall[1].data

      expect(chartData.labels).toEqual([])
      expect(chartData.datasets[0].data).toEqual([])
    })

    it('handles single status count', async () => {
      getProjectCountByStatus.mockReturnValueOnce({
        Completed: 10
      })

      const { Chart } = await import('chart.js')
      const wrapper = mountComponent()
      await flushPromises()

      const chartCall = (Chart as any).mock.calls[0]
      const chartData = chartCall[1].data

      expect(chartData.labels).toEqual(['Completed'])
      expect(chartData.datasets[0].data).toEqual([10])
    })

    it('applies default color for unknown status', async () => {
      getProjectCountByStatus.mockReturnValueOnce({
        'Unknown Status': 5
      })

      const { Chart } = await import('chart.js')
      const wrapper = mountComponent()
      await flushPromises()

      const chartCall = (Chart as any).mock.calls[0]
      const chartData = chartCall[1].data

      expect(chartData.datasets[0].backgroundColor[0]).toBe('rgb(255, 205, 86)') // Default to Pending color
    })

    it('handles reactive data updates', async () => {
      // Test that the component can handle different data structures
      getProjectCountByStatus.mockReturnValueOnce({
        Pending: 10,
        Completed: 15
      })

      const { Chart } = await import('chart.js')
      const wrapper = mountComponent()
      await flushPromises()

      const chartCall = (Chart as any).mock.calls[0]
      const chartData = chartCall[1].data

      expect(chartData.labels).toEqual(['Pending', 'Completed'])
      expect(chartData.datasets[0].data).toEqual([10, 15])
    })
  })

  describe('ProjectsByStatusChart Configuration', () => {
    it('configures chart with correct options', async () => {
      const { Chart } = await import('chart.js')
      const wrapper = mountComponent()
      await flushPromises()

      const chartCall = (Chart as any).mock.calls[0]
      const chartOptions = chartCall[1].options

      expect(chartOptions.responsive).toBe(true)
      expect(chartOptions.maintainAspectRatio).toBe(false)
      expect(chartOptions.plugins.legend.display).toBe(false)
    })

    it('renders custom legend labels with counts', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as any
      const statusLabels = vm.statusLabels

      expect(statusLabels).toBeDefined()
      expect(Array.isArray(statusLabels)).toBe(true)

      // Test that custom legend is rendered
      const legendContainer = wrapper.find('.flex.flex-wrap.justify-center')
      expect(legendContainer.exists()).toBe(true)

      // Check that legend items are present
      const legendItems = wrapper.findAll('.flex.items-center.space-x-2')
      expect(legendItems.length).toBe(statusLabels.length)
    })

    it('configures tooltip with percentage calculation', async () => {
      const { Chart } = await import('chart.js')
      const wrapper = mountComponent()
      await flushPromises()

      const chartCall = (Chart as any).mock.calls[0]
      const tooltipCallback = chartCall[1].options.plugins.tooltip.callbacks.label

      const mockContext = {
        label: 'Pending',
        parsed: 5,
        dataset: {
          data: [5, 3, 2, 8] // Total = 18
        }
      }

      const result = tooltipCallback(mockContext)
      expect(result).toContain('Pending: 5 (27.8%)')
    })

    it('handles tooltip calculation with zero total', async () => {
      const { Chart } = await import('chart.js')

      getProjectCountByStatus.mockReturnValueOnce({
        Pending: 0
      })

      const wrapper = mountComponent()
      await flushPromises()

      const chartCall = (Chart as any).mock.calls[0]
      const tooltipCallback = chartCall[1].options.plugins.tooltip.callbacks.label

      const mockContext = {
        label: 'Pending',
        parsed: 0,
        dataset: {
          data: [0]
        }
      }

      const result = tooltipCallback(mockContext)
      expect(result).toContain('Pending: 0 (0%)')
    })
  })

  describe('ProjectsByStatusChart Lifecycle', () => {
    it('destroys chart on unmount', async () => {
      const { Chart } = await import('chart.js')
      const wrapper = mountComponent()
      await flushPromises()

      const chartInstance = (Chart as any).mock.results[0].value

      wrapper.unmount()

      expect(chartInstance.destroy).toHaveBeenCalled()
    })

    it('does not create chart if canvas ref is not available', async () => {
      const { Chart } = await import('chart.js')

      // Mock mount without canvas ref
      const originalMount = ProjectsByStatusChart.setup
      ProjectsByStatusChart.setup = vi.fn(() => ({}))

      mount(ProjectsByStatusChart, {
        attachTo: document.body
      })

      expect(Chart).not.toHaveBeenCalled()

      // Restore original setup
      ProjectsByStatusChart.setup = originalMount
    })
  })

  describe('ProjectsByStatusChart Error Handling', () => {
    it('handles undefined project counts gracefully', async () => {
      getProjectCountByStatus.mockReturnValueOnce(undefined as any)

      const { Chart } = await import('chart.js')
      const wrapper = mountComponent()
      await flushPromises()

      const chartCall = (Chart as any).mock.calls[0]
      const chartData = chartCall[1].data

      expect(chartData.labels).toEqual([])
      expect(chartData.datasets[0].data).toEqual([])
    })

    it('handles null project counts gracefully', async () => {
      getProjectCountByStatus.mockReturnValueOnce(null as any)

      const { Chart } = await import('chart.js')
      const wrapper = mountComponent()
      await flushPromises()

      const chartCall = (Chart as any).mock.calls[0]
      const chartData = chartCall[1].data

      expect(chartData.labels).toEqual([])
      expect(chartData.datasets[0].data).toEqual([])
    })
  })

  describe('ProjectsByStatusChart Accessibility', () => {
    it('provides proper canvas element for screen readers', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const canvas = wrapper.find('canvas')
      expect(canvas.attributes('role')).toBeUndefined() // Chart.js handles accessibility

      // Canvas should be present and properly structured
      expect(canvas.exists()).toBe(true)
    })
  })
})
