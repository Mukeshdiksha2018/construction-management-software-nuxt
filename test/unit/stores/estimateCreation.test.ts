import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEstimateCreationStore } from '@/stores/estimateCreation'

// Mock $fetch
const mockFetch = vi.fn()
;(global as any).$fetch = mockFetch

// Mock IndexedDB
const mockDbHelpers = {
  getProjects: vi.fn(),
  getCostCodeDivisions: vi.fn(),
  getCostCodeConfigurations: vi.fn(),
  getUOMGlobal: vi.fn(),
}

vi.mock('@/utils/indexedDb', () => ({
  dbHelpers: mockDbHelpers
}))

describe('estimateCreation Store', () => {
  let store: ReturnType<typeof useEstimateCreationStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useEstimateCreationStore()
    // Reset store state
    store.clearStore()
    vi.clearAllMocks()
    // Reset IndexedDB mocks
    mockDbHelpers.getProjects.mockResolvedValue([])
    mockDbHelpers.getCostCodeDivisions.mockResolvedValue([])
    mockDbHelpers.getCostCodeConfigurations.mockResolvedValue([])
    mockDbHelpers.getUOMGlobal.mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.selectedCorporationUuid).toBe(null)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
      expect(store.projects).toEqual([])
      expect(store.costCodeDivisions).toEqual([])
      expect(store.costCodeConfigurations).toEqual([])
      expect(store.itemTypes).toEqual([])
      expect(store.uom).toEqual([])
      expect(store.hasData).toBe(false)
    })
  })

  describe('clearStore', () => {
    it('should clear all store data', async () => {
      // Arrange: set some state
      await store.setCorporationAndFetchData('corp-1')
      
      // Act
      store.clearStore()

      // Assert
      expect(store.selectedCorporationUuid).toBe(null)
      expect(store.projects).toEqual([])
      expect(store.costCodeDivisions).toEqual([])
      expect(store.costCodeConfigurations).toEqual([])
      expect(store.itemTypes).toEqual([])
      expect(store.uom).toEqual([])
      expect(store.error).toBe(null)
      expect(store.loading).toBe(false)
    })
  })

  // Note: Individual fetch methods are internal and not exported from the store
  // They are tested indirectly through setCorporationAndFetchData

  describe('setCorporationAndFetchData', () => {
    const mockProjects = [{ uuid: 'project-1', corporation_uuid: 'corp-1' }]
    const mockDivisions = [{ uuid: 'div-1', is_active: true }]
    const mockConfigurations = [{ uuid: 'config-1', is_active: true }]
    const mockItemTypes = [{ uuid: 'item-type-1' }]
    const mockUOM = [{ uuid: 'uom-1', status: 'ACTIVE' }]

    beforeEach(() => {
      vi.clearAllMocks()
      mockDbHelpers.getProjects.mockResolvedValue(mockProjects)
      mockDbHelpers.getCostCodeDivisions.mockResolvedValue(mockDivisions)
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue(mockConfigurations)
      mockDbHelpers.getUOMGlobal.mockResolvedValue(mockUOM)
      // Mock fetch to return different data for different endpoints
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/item-types') {
          return Promise.resolve({ data: mockItemTypes })
        }
        return Promise.resolve({ data: [] })
      })
    })

    it('should set corporation and fetch all data', async () => {
      // Ensure all mocks are properly set up
      mockDbHelpers.getUOMGlobal.mockResolvedValue(mockUOM)
      mockDbHelpers.getProjects.mockResolvedValue(mockProjects)
      mockDbHelpers.getCostCodeDivisions.mockResolvedValue(mockDivisions)
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue(mockConfigurations)
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/item-types') {
          return Promise.resolve({ data: mockItemTypes })
        }
        if (url === '/api/uom' && options?.method === 'GET') {
          return Promise.resolve({ data: mockUOM })
        }
        return Promise.resolve({ data: [] })
      })
      
      // Act
      await store.setCorporationAndFetchData('corp-1')
      // Wait for all async operations to complete
      await new Promise(resolve => setTimeout(resolve, 300))

      // Assert
      expect(store.selectedCorporationUuid).toBe('corp-1')
      expect(store.projects).toEqual(mockProjects)
      expect(store.costCodeDivisions).toEqual(mockDivisions)
      expect(store.costCodeConfigurations).toEqual(mockConfigurations)
      expect(store.itemTypes).toEqual(mockItemTypes)
      expect(store.uom).toEqual(mockUOM)
      expect(store.loading).toBe(false)
    })

    it('should clear store when corporation is null', async () => {
      // Arrange
      await store.setCorporationAndFetchData('corp-1')

      // Act
      await store.setCorporationAndFetchData(null)

      // Assert
      expect(store.selectedCorporationUuid).toBe(null)
      expect(store.projects).toEqual([])
      expect(store.costCodeDivisions).toEqual([])
      expect(store.costCodeConfigurations).toEqual([])
    })

    it('should clear existing data when switching corporations', async () => {
      // Arrange
      await store.setCorporationAndFetchData('corp-1')
      expect(store.projects).toEqual(mockProjects)
      mockDbHelpers.getProjects.mockClear()
      mockDbHelpers.getProjects.mockResolvedValue(mockProjects)

      // Act
      await store.setCorporationAndFetchData('corp-2')

      // Assert
      expect(store.selectedCorporationUuid).toBe('corp-2')
      // Projects should be cleared and refetched - check that fetchProjects was called
      // Since we're switching, it should force fetch from API
      expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
        query: { corporation_uuid: 'corp-2' }
      })
    })

    it('should force fetch projects from API when switching corporations', async () => {
      // Arrange
      await store.setCorporationAndFetchData('corp-1')
      mockFetch.mockResolvedValue({ data: mockProjects })

      // Act
      await store.setCorporationAndFetchData('corp-2')

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
        query: { corporation_uuid: 'corp-2' }
      })
    })

    it('should handle partial failures gracefully', async () => {
      // Arrange
      mockDbHelpers.getCostCodeDivisions.mockRejectedValue(new Error('Division fetch failed'))
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue(mockConfigurations)
      mockDbHelpers.getUOMGlobal.mockResolvedValue(mockUOM)
      mockFetch.mockResolvedValue({ data: mockItemTypes })

      // Act
      await store.setCorporationAndFetchData('corp-1')

      // Assert
      expect(store.selectedCorporationUuid).toBe('corp-1')
      expect(store.costCodeDivisions).toEqual([]) // Failed fetch
      expect(store.costCodeConfigurations).toEqual(mockConfigurations) // Successful fetch
      expect(store.loading).toBe(false)
    })
  })

  describe('getActiveDivisions', () => {
    it('should return only active divisions', async () => {
      // Arrange
      const divisions = [
        { uuid: 'div-1', is_active: true },
        { uuid: 'div-2', is_active: false },
        { uuid: 'div-3', is_active: true }
      ]
      mockDbHelpers.getCostCodeDivisions.mockResolvedValue(divisions)
      await store.setCorporationAndFetchData('corp-1')

      // Act
      const activeDivisions = store.getActiveDivisions

      // Assert
      expect(activeDivisions).toHaveLength(2)
      expect(activeDivisions.every((d: any) => d.is_active === true)).toBe(true)
    })

    it('should return empty array when no corporation is selected', () => {
      // Act
      const activeDivisions = store.getActiveDivisions

      // Assert
      expect(activeDivisions).toEqual([])
    })
  })

  describe('getActiveConfigurations', () => {
    it('should return only active configurations', async () => {
      // Arrange
      const configurations = [
        { uuid: 'config-1', is_active: true },
        { uuid: 'config-2', is_active: false },
        { uuid: 'config-3', is_active: true }
      ]
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue(configurations)
      await store.setCorporationAndFetchData('corp-1')

      // Act
      const activeConfigurations = store.getActiveConfigurations

      // Assert
      expect(activeConfigurations).toHaveLength(2)
      expect(activeConfigurations.every((c: any) => c.is_active === true)).toBe(true)
    })

    it('should return empty array when no corporation is selected', () => {
      // Act
      const activeConfigurations = store.getActiveConfigurations

      // Assert
      expect(activeConfigurations).toEqual([])
    })
  })

  describe('getActiveUOM', () => {
    it('should return only active UOM', async () => {
      // Arrange
      const uom = [
        { uuid: 'uom-1', status: 'ACTIVE' },
        { uuid: 'uom-2', status: 'INACTIVE' },
        { uuid: 'uom-3', status: 'ACTIVE' }
      ]
      const mockDivisions = [{ uuid: 'div-1', is_active: true }]
      const mockConfigurations = [{ uuid: 'config-1', is_active: true }]
      const mockItemTypes = [{ uuid: 'item-type-1' }]
      const mockProjects = [{ uuid: 'project-1', corporation_uuid: 'corp-1' }]
      
      // Reset and set up mocks
      // Reset and set up mocks properly
      mockDbHelpers.getUOMGlobal.mockReset()
      mockDbHelpers.getUOMGlobal.mockResolvedValue(uom)
      mockDbHelpers.getCostCodeDivisions.mockReset()
      mockDbHelpers.getCostCodeDivisions.mockResolvedValue(mockDivisions)
      mockDbHelpers.getCostCodeConfigurations.mockReset()
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue(mockConfigurations)
      mockDbHelpers.getProjects.mockReset()
      mockDbHelpers.getProjects.mockResolvedValue(mockProjects)
      mockFetch.mockReset()
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (url === '/api/item-types') {
          return Promise.resolve({ data: mockItemTypes })
        }
        if (url === '/api/uom' && options?.method === 'GET') {
          return Promise.resolve({ data: uom })
        }
        return Promise.resolve({ data: [] })
      })
      
      await store.setCorporationAndFetchData('corp-1')
      await new Promise(resolve => setTimeout(resolve, 300))

      // Act
      const activeUOM = store.getActiveUOM

      // Assert
      expect(store.uom).toEqual(uom) // First check that UOM was fetched
      expect(activeUOM).toHaveLength(2)
      expect(activeUOM.every((u: any) => u.status === 'ACTIVE')).toBe(true)
    })
  })
})

