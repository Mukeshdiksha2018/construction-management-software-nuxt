import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useItemTypesStore } from '@/stores/itemTypes'
import type { ItemType, CreateItemTypePayload, UpdateItemTypePayload } from '@/stores/itemTypes'

// Mock $fetch
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Mock process.server to be false for tests
vi.stubGlobal('process', { 
  server: false,
  env: { NODE_ENV: 'test' }
})

// Mock useToast
const mockToast = {
  add: vi.fn()
}
vi.mock('#app', () => ({
  useToast: () => mockToast
}))

describe('ItemTypes Store', () => {
  let store: ReturnType<typeof useItemTypesStore>

  const mockItemType: ItemType = {
    id: 1,
    uuid: 'item-type-uuid-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    corporation_uuid: 'corp-uuid-1',
    project_uuid: 'project-uuid-1',
    item_type: 'Electrical Components',
    short_name: 'ELEC',
    is_active: true,
    project: {
      uuid: 'project-uuid-1',
      project_name: 'Test Project',
      project_id: 'PROJ-001',
      corporation_uuid: 'corp-uuid-1'
    }
  }

  const mockItemTypes: ItemType[] = [
    mockItemType,
    {
      id: 2,
      uuid: 'item-type-uuid-2',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      corporation_uuid: 'corp-uuid-1',
      project_uuid: 'project-uuid-2',
      item_type: 'Plumbing Fixtures',
      short_name: 'PLUMB',
      is_active: true,
      project: {
        uuid: 'project-uuid-2',
        project_name: 'Test Project 2',
        project_id: 'PROJ-002',
        corporation_uuid: 'corp-uuid-1'
      }
    }
  ]

  beforeEach(() => {
    // Ensure process.server is false for all tests
    vi.stubGlobal('process', { 
      server: false,
      env: { NODE_ENV: 'test' }
    })
    
    setActivePinia(createPinia())
    store = useItemTypesStore()
    mockFetch.mockReset()
    // Clear store state completely
    store.clearData() // This clears everything including cache flags
  })

  afterEach(() => {
    mockFetch.mockReset()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.itemTypes).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('fetchItemTypes', () => {
    it('should fetch item types successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        data: mockItemTypes,
        error: null
      })

      await store.fetchItemTypes('corp-uuid-1')

      expect(mockFetch).toHaveBeenCalledWith('/api/item-types?corporation_uuid=corp-uuid-1')
      expect(store.itemTypes).toEqual(mockItemTypes)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should fetch item types for specific project', async () => {
      mockFetch.mockResolvedValueOnce({
        data: [mockItemType],
        error: null
      })

      await store.fetchItemTypes('corp-uuid-1', 'project-uuid-1')

      expect(mockFetch).toHaveBeenCalledWith('/api/item-types?corporation_uuid=corp-uuid-1&project_uuid=project-uuid-1')
      expect(store.itemTypes).toEqual([mockItemType])
    })

    it('should handle fetch error', async () => {
      const errorMessage = 'Failed to fetch item types'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await store.fetchItemTypes('corp-uuid-1')

      expect(store.itemTypes).toEqual([])
      expect(store.error).toBe(errorMessage)
      expect(store.loading).toBe(false)
    })

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        data: null,
        error: 'Database connection failed'
      })

      await store.fetchItemTypes('corp-uuid-1')

      expect(store.itemTypes).toEqual([])
      expect(store.error).toBe('Database connection failed')
    })

    it('should skip fetch on server side', async () => {
      // Temporarily set process.server to true for this test
      vi.stubGlobal('process', { 
        server: true,
        env: { NODE_ENV: 'test' }
      })

      await store.fetchItemTypes('corp-uuid-1')

      expect(mockFetch).not.toHaveBeenCalled()
      expect(store.itemTypes).toEqual([])
      
      // Reset process.server to false after test
      vi.stubGlobal('process', { 
        server: false,
        env: { NODE_ENV: 'test' }
      })
    })

    describe('Merge Behavior - Corporation-wide fetches', () => {
      it('should replace all item types for corporation when fetching corporation-wide', async () => {
        // Clear cache first
        store.clearCache('corp-uuid-1')
        store.clearCache('corp-uuid-2')
        
        // Setup: First fetch for corp-1 to set lastFetchedCorporation
        const corp1ItemTypes: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-1',
            project_uuid: 'project-uuid-1'
          },
          {
            ...mockItemType,
            uuid: 'item-2',
            project_uuid: 'project-uuid-2'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: corp1ItemTypes,
          error: null
        })
        await store.fetchItemTypes('corp-uuid-1', undefined, true) // Force refresh

        // Manually add item types for a different corporation (simulating data from another source)
        const corp2ItemType: ItemType = {
          ...mockItemType,
          uuid: 'item-3',
          corporation_uuid: 'corp-uuid-2',
          project_uuid: 'project-uuid-3'
        }
        store.setItemTypes([...corp1ItemTypes, corp2ItemType])

        // Fetch corporation-wide for corp-1 again (should replace only corp-1's items)
        const newCorp1ItemTypes: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-4',
            corporation_uuid: 'corp-uuid-1',
            project_uuid: 'project-uuid-1'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: newCorp1ItemTypes,
          error: null
        })

        await store.fetchItemTypes('corp-uuid-1', undefined, true) // Force refresh

        // Should have new corp-1 items + existing corp-2 items
        expect(store.itemTypes).toHaveLength(2)
        expect(store.itemTypes).toContainEqual(newCorp1ItemTypes[0])
        expect(store.itemTypes).toContainEqual(corp2ItemType)
        // Should not contain old corp-1 items
        expect(store.itemTypes).not.toContainEqual(corp1ItemTypes[0])
        expect(store.itemTypes).not.toContainEqual(corp1ItemTypes[1])
      })

      it('should keep other corporations\' item types when fetching corporation-wide', async () => {
        // Clear cache first
        store.clearCache('corp-uuid-1')
        store.clearCache('corp-uuid-2')
        store.clearCache('corp-uuid-3')
        
        // Setup: First fetch for corp-1 to set lastFetchedCorporation
        const corp1ItemType: ItemType = {
          ...mockItemType,
          uuid: 'item-1',
          corporation_uuid: 'corp-uuid-1'
        }
        mockFetch.mockResolvedValueOnce({
          data: [corp1ItemType],
          error: null
        })
        await store.fetchItemTypes('corp-uuid-1', undefined, true) // Force refresh

        // Manually add item types for other corporations (simulating data from another source)
        const corp2ItemType: ItemType = {
          ...mockItemType,
          uuid: 'item-2',
          corporation_uuid: 'corp-uuid-2'
        }
        const corp3ItemType: ItemType = {
          ...mockItemType,
          uuid: 'item-3',
          corporation_uuid: 'corp-uuid-3'
        }
        store.setItemTypes([corp1ItemType, corp2ItemType, corp3ItemType])

        // Fetch corporation-wide for corp-1 again
        const newCorp1ItemTypes: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-4',
            corporation_uuid: 'corp-uuid-1'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: newCorp1ItemTypes,
          error: null
        })

        await store.fetchItemTypes('corp-uuid-1', undefined, true) // Force refresh

        // Should have new corp-1 items + corp-2 and corp-3 items
        expect(store.itemTypes).toHaveLength(3)
        expect(store.itemTypes).toContainEqual(newCorp1ItemTypes[0])
        expect(store.itemTypes).toContainEqual(corp2ItemType)
        expect(store.itemTypes).toContainEqual(corp3ItemType)
        // Should not contain old corp-1 item
        expect(store.itemTypes).not.toContainEqual(corp1ItemType)
      })
    })

    describe('Merge Behavior - Project-specific fetches', () => {
      it('should replace item types for specific project but keep other projects', async () => {
        // Clear cache first
        store.clearCache('corp-uuid-1')
        
        // Setup: First fetch for project-1 to set lastFetchedCorporation and lastFetchedProject
        const project1ItemType: ItemType = {
          ...mockItemType,
          uuid: 'item-1',
          corporation_uuid: 'corp-uuid-1',
          project_uuid: 'project-uuid-1'
        }
        mockFetch.mockResolvedValueOnce({
          data: [project1ItemType],
          error: null
        })
        await store.fetchItemTypes('corp-uuid-1', 'project-uuid-1', true) // Force refresh

        // Manually add item types for project-2 (simulating data from another source)
        const project2ItemType: ItemType = {
          ...mockItemType,
          uuid: 'item-2',
          corporation_uuid: 'corp-uuid-1',
          project_uuid: 'project-uuid-2'
        }
        store.setItemTypes([project1ItemType, project2ItemType])

        // Fetch project-specific for project-1 again
        const newProject1ItemTypes: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-3',
            corporation_uuid: 'corp-uuid-1',
            project_uuid: 'project-uuid-1'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: newProject1ItemTypes,
          error: null
        })

        await store.fetchItemTypes('corp-uuid-1', 'project-uuid-1', true) // Force refresh

        // Should have new project-1 items + existing project-2 items
        expect(store.itemTypes).toHaveLength(2)
        expect(store.itemTypes).toContainEqual(newProject1ItemTypes[0])
        expect(store.itemTypes).toContainEqual(project2ItemType)
        // Should not contain old project-1 item
        expect(store.itemTypes).not.toContainEqual(project1ItemType)
      })

      it('should keep item types from other corporations when fetching project-specific', async () => {
        // Clear cache first
        store.clearCache('corp-uuid-1')
        store.clearCache('corp-uuid-2')
        
        // Setup: First fetch for corp-1, project-1 to set lastFetchedCorporation and lastFetchedProject
        const corp1Project1ItemType: ItemType = {
          ...mockItemType,
          uuid: 'item-1',
          corporation_uuid: 'corp-uuid-1',
          project_uuid: 'project-uuid-1'
        }
        mockFetch.mockResolvedValueOnce({
          data: [corp1Project1ItemType],
          error: null
        })
        await store.fetchItemTypes('corp-uuid-1', 'project-uuid-1', true) // Force refresh

        // Manually add item types for corp-2 (simulating data from another source)
        const corp2ItemType: ItemType = {
          ...mockItemType,
          uuid: 'item-2',
          corporation_uuid: 'corp-uuid-2',
          project_uuid: 'project-uuid-2'
        }
        store.setItemTypes([corp1Project1ItemType, corp2ItemType])

        // Fetch project-specific for corp-1, project-1 again
        const newCorp1Project1ItemTypes: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-3',
            corporation_uuid: 'corp-uuid-1',
            project_uuid: 'project-uuid-1'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: newCorp1Project1ItemTypes,
          error: null
        })

        await store.fetchItemTypes('corp-uuid-1', 'project-uuid-1', true) // Force refresh

        // Should have new corp-1 project-1 items + corp-2 items
        expect(store.itemTypes).toHaveLength(2)
        expect(store.itemTypes).toContainEqual(newCorp1Project1ItemTypes[0])
        expect(store.itemTypes).toContainEqual(corp2ItemType)
        // Should not contain old corp-1 project-1 item
        expect(store.itemTypes).not.toContainEqual(corp1Project1ItemType)
      })

      it('should handle multiple project-specific fetches correctly', async () => {
        // Clear cache first
        store.clearCache('corp-uuid-1')
        
        // First fetch: project-1
        const project1ItemTypes: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-1',
            corporation_uuid: 'corp-uuid-1',
            project_uuid: 'project-uuid-1'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: project1ItemTypes,
          error: null
        })

        await store.fetchItemTypes('corp-uuid-1', 'project-uuid-1', true) // Force refresh
        expect(store.itemTypes).toHaveLength(1)
        expect(store.itemTypes).toContainEqual(project1ItemTypes[0])

        // Second fetch: project-2 (should keep project-1 items)
        // Note: lastFetchedProject will change, but lastFetchedCorporation stays the same
        const project2ItemTypes: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-2',
            corporation_uuid: 'corp-uuid-1',
            project_uuid: 'project-uuid-2'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: project2ItemTypes,
          error: null
        })

        await store.fetchItemTypes('corp-uuid-1', 'project-uuid-2', true) // Force refresh

        // Should have both project-1 and project-2 items
        expect(store.itemTypes).toHaveLength(2)
        expect(store.itemTypes).toContainEqual(project1ItemTypes[0])
        expect(store.itemTypes).toContainEqual(project2ItemTypes[0])
      })
    })

    describe('Merge Behavior - Corporation switching', () => {
      it('should clear old corporation data when switching to different corporation', async () => {
        // Clear cache first
        store.clearCache('corp-uuid-1')
        store.clearCache('corp-uuid-2')
        
        // Setup: Add item types for corp-1
        const corp1ItemTypes: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-1',
            corporation_uuid: 'corp-uuid-1',
            project_uuid: 'project-uuid-1'
          },
          {
            ...mockItemType,
            uuid: 'item-2',
            corporation_uuid: 'corp-uuid-1',
            project_uuid: 'project-uuid-2'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: corp1ItemTypes,
          error: null
        })

        await store.fetchItemTypes('corp-uuid-1', undefined, true) // Force refresh
        expect(store.itemTypes).toHaveLength(2)

        // Add item types for corp-2 (different corporation)
        const corp2ItemType: ItemType = {
          ...mockItemType,
          uuid: 'item-3',
          corporation_uuid: 'corp-uuid-2',
          project_uuid: 'project-uuid-3'
        }
        store.setItemTypes([...corp1ItemTypes, corp2ItemType])

        // Fetch for corp-2 (should clear corp-1 items)
        const newCorp2ItemTypes: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-4',
            corporation_uuid: 'corp-uuid-2',
            project_uuid: 'project-uuid-3'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: newCorp2ItemTypes,
          error: null
        })

        await store.fetchItemTypes('corp-uuid-2', undefined, true) // Force refresh

        // Should have new corp-2 items, but not old corp-1 items
        expect(store.itemTypes).toHaveLength(1)
        expect(store.itemTypes).toContainEqual(newCorp2ItemTypes[0])
        expect(store.itemTypes).not.toContainEqual(corp1ItemTypes[0])
        expect(store.itemTypes).not.toContainEqual(corp1ItemTypes[1])
        // Should not contain the old corp-2 item (replaced by new one)
        expect(store.itemTypes).not.toContainEqual(corp2ItemType)
      })

      it('should preserve other corporations when switching', async () => {
        // Clear cache first
        store.clearCache('corp-uuid-1')
        store.clearCache('corp-uuid-2')
        store.clearCache('corp-uuid-3')
        
        // Setup: Add item types for multiple corporations
        const corp1ItemType: ItemType = {
          ...mockItemType,
          uuid: 'item-1',
          corporation_uuid: 'corp-uuid-1'
        }
        const corp2ItemType: ItemType = {
          ...mockItemType,
          uuid: 'item-2',
          corporation_uuid: 'corp-uuid-2'
        }
        const corp3ItemType: ItemType = {
          ...mockItemType,
          uuid: 'item-3',
          corporation_uuid: 'corp-uuid-3'
        }
        store.setItemTypes([corp1ItemType, corp2ItemType, corp3ItemType])

        // First fetch for corp-1 to set lastFetchedCorporation
        mockFetch.mockResolvedValueOnce({
          data: [corp1ItemType],
          error: null
        })
        await store.fetchItemTypes('corp-uuid-1', undefined, true)

        // Fetch for corp-2 (should clear corp-1, but keep corp-3)
        const newCorp2ItemTypes: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-4',
            corporation_uuid: 'corp-uuid-2'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: newCorp2ItemTypes,
          error: null
        })

        await store.fetchItemTypes('corp-uuid-2', undefined, true) // Force refresh

        // Should have new corp-2 items + corp-3 items (corp-1 cleared because it was lastFetchedCorporation)
        expect(store.itemTypes).toHaveLength(2)
        expect(store.itemTypes).toContainEqual(newCorp2ItemTypes[0])
        expect(store.itemTypes).toContainEqual(corp3ItemType)
        // Should not contain old corp-1 or corp-2 items
        expect(store.itemTypes).not.toContainEqual(corp1ItemType)
        expect(store.itemTypes).not.toContainEqual(corp2ItemType)
      })
    })

    describe('Merge Behavior - Error handling', () => {
      it('should only clear item types for current corporation on error', async () => {
        // Clear cache first
        store.clearCache('corp-uuid-1')
        store.clearCache('corp-uuid-2')
        
        // Setup: Add item types for multiple corporations
        const corp1ItemType: ItemType = {
          ...mockItemType,
          uuid: 'item-1',
          corporation_uuid: 'corp-uuid-1'
        }
        const corp2ItemType: ItemType = {
          ...mockItemType,
          uuid: 'item-2',
          corporation_uuid: 'corp-uuid-2'
        }
        store.setItemTypes([corp1ItemType, corp2ItemType])

        // First fetch for corp-1 (sets lastFetchedCorporation)
        mockFetch.mockResolvedValueOnce({
          data: [corp1ItemType],
          error: null
        })
        await store.fetchItemTypes('corp-uuid-1', undefined, true) // Force refresh

        // Error on fetch for corp-1
        const errorMessage = 'Failed to fetch'
        mockFetch.mockRejectedValueOnce(new Error(errorMessage))

        await store.fetchItemTypes('corp-uuid-1', undefined, true) // Force refresh

        // Should clear only corp-1 items, keep corp-2 items
        expect(store.itemTypes).toHaveLength(1)
        expect(store.itemTypes).toContainEqual(corp2ItemType)
        expect(store.itemTypes).not.toContainEqual(corp1ItemType)
        expect(store.error).toBe(errorMessage)
      })

      it('should not clear data for other corporations on error', async () => {
        // Clear cache first
        store.clearCache('corp-uuid-1')
        store.clearCache('corp-uuid-2')
        store.clearCache('corp-uuid-3')
        
        // Setup: Add item types for multiple corporations
        const corp1ItemType: ItemType = {
          ...mockItemType,
          uuid: 'item-1',
          corporation_uuid: 'corp-uuid-1'
        }
        const corp2ItemType: ItemType = {
          ...mockItemType,
          uuid: 'item-2',
          corporation_uuid: 'corp-uuid-2'
        }
        const corp3ItemType: ItemType = {
          ...mockItemType,
          uuid: 'item-3',
          corporation_uuid: 'corp-uuid-3'
        }
        store.setItemTypes([corp1ItemType, corp2ItemType, corp3ItemType])

        // First fetch for corp-1
        mockFetch.mockResolvedValueOnce({
          data: [corp1ItemType],
          error: null
        })
        await store.fetchItemTypes('corp-uuid-1', undefined, true) // Force refresh

        // Error on fetch for corp-1
        mockFetch.mockRejectedValueOnce(new Error('Failed'))

        await store.fetchItemTypes('corp-uuid-1', undefined, true) // Force refresh

        // Should keep corp-2 and corp-3 items
        expect(store.itemTypes).toHaveLength(2)
        expect(store.itemTypes).toContainEqual(corp2ItemType)
        expect(store.itemTypes).toContainEqual(corp3ItemType)
        expect(store.itemTypes).not.toContainEqual(corp1ItemType)
      })
    })

    describe('Merge Behavior - Cache and force refresh', () => {
      it('should respect cache and skip fetch when data already cached', async () => {
        // Clear cache first
        store.clearCache('corp-uuid-1')
        
        // First fetch
        mockFetch.mockResolvedValueOnce({
          data: mockItemTypes,
          error: null
        })

        await store.fetchItemTypes('corp-uuid-1', undefined, true) // Force refresh
        expect(mockFetch).toHaveBeenCalledTimes(1)

        // Second fetch (should be skipped due to cache)
        await store.fetchItemTypes('corp-uuid-1')
        expect(mockFetch).toHaveBeenCalledTimes(1) // Still 1, not 2
      })

      it('should force refresh when forceRefresh is true', async () => {
        // Clear cache first
        store.clearCache('corp-uuid-1')
        
        // First fetch
        mockFetch.mockResolvedValueOnce({
          data: mockItemTypes,
          error: null
        })

        await store.fetchItemTypes('corp-uuid-1', undefined, true) // Force refresh
        expect(mockFetch).toHaveBeenCalledTimes(1)

        // Force refresh
        const newItemTypes: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-new'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: newItemTypes,
          error: null
        })

        await store.fetchItemTypes('corp-uuid-1', undefined, true)
        expect(mockFetch).toHaveBeenCalledTimes(2) // Should fetch again
        expect(store.itemTypes).toEqual(newItemTypes)
      })

      it('should merge correctly even with force refresh', async () => {
        // Clear cache first
        store.clearCache('corp-uuid-1')
        store.clearCache('corp-uuid-2')
        
        // Setup: First fetch for corp-1 to set lastFetchedCorporation
        const corp1ItemType: ItemType = {
          ...mockItemType,
          uuid: 'item-1',
          corporation_uuid: 'corp-uuid-1'
        }
        mockFetch.mockResolvedValueOnce({
          data: [corp1ItemType],
          error: null
        })
        await store.fetchItemTypes('corp-uuid-1', undefined, true) // Force refresh

        // Manually add item types for corp-2 (simulating data from another source)
        const corp2ItemType: ItemType = {
          ...mockItemType,
          uuid: 'item-2',
          corporation_uuid: 'corp-uuid-2'
        }
        store.setItemTypes([corp1ItemType, corp2ItemType])

        // Force refresh for corp-1
        const newCorp1ItemTypes: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-3',
            corporation_uuid: 'corp-uuid-1'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: newCorp1ItemTypes,
          error: null
        })

        await store.fetchItemTypes('corp-uuid-1', undefined, true)

        // Should have new corp-1 items + existing corp-2 items
        expect(store.itemTypes).toHaveLength(2)
        expect(store.itemTypes).toContainEqual(newCorp1ItemTypes[0])
        expect(store.itemTypes).toContainEqual(corp2ItemType)
      })
    })

    describe('Merge Behavior - Real-world scenarios', () => {
      it('should handle TopBar fetching corporation-wide then PurchaseOrderForm fetching project-specific', async () => {
        // Clear cache first
        store.clearCache('corp-uuid-1')
        
        // Scenario: TopBar fetches corporation-wide
        const corpWideItemTypes: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-1',
            corporation_uuid: 'corp-uuid-1',
            project_uuid: 'project-uuid-1'
          },
          {
            ...mockItemType,
            uuid: 'item-2',
            corporation_uuid: 'corp-uuid-1',
            project_uuid: 'project-uuid-2'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: corpWideItemTypes,
          error: null
        })

        await store.fetchItemTypes('corp-uuid-1', undefined, true) // Force refresh
        expect(store.itemTypes).toHaveLength(2)

        // Scenario: PurchaseOrderForm fetches project-specific
        const project1ItemTypes: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-3',
            corporation_uuid: 'corp-uuid-1',
            project_uuid: 'project-uuid-1'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: project1ItemTypes,
          error: null
        })

        await store.fetchItemTypes('corp-uuid-1', 'project-uuid-1', true) // Force refresh

        // Should have project-1 items + project-2 items from corporation-wide fetch
        expect(store.itemTypes).toHaveLength(2)
        expect(store.itemTypes).toContainEqual(project1ItemTypes[0])
        expect(store.itemTypes).toContainEqual(corpWideItemTypes[1]) // project-2 item
        // Should not contain old project-1 item from corporation-wide fetch
        expect(store.itemTypes).not.toContainEqual(corpWideItemTypes[0])
      })

      it('should handle multiple project fetches without data loss', async () => {
        // Clear cache first
        store.clearCache('corp-uuid-1')
        
        // Fetch project-1
        const project1ItemTypes: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-1',
            corporation_uuid: 'corp-uuid-1',
            project_uuid: 'project-uuid-1'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: project1ItemTypes,
          error: null
        })
        await store.fetchItemTypes('corp-uuid-1', 'project-uuid-1', true) // Force refresh

        // Fetch project-2
        const project2ItemTypes: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-2',
            corporation_uuid: 'corp-uuid-1',
            project_uuid: 'project-uuid-2'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: project2ItemTypes,
          error: null
        })
        await store.fetchItemTypes('corp-uuid-1', 'project-uuid-2', true) // Force refresh

        // Fetch project-3
        const project3ItemTypes: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-3',
            corporation_uuid: 'corp-uuid-1',
            project_uuid: 'project-uuid-3'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: project3ItemTypes,
          error: null
        })
        await store.fetchItemTypes('corp-uuid-1', 'project-uuid-3', true) // Force refresh

        // Should have all three projects' items
        expect(store.itemTypes).toHaveLength(3)
        expect(store.itemTypes).toContainEqual(project1ItemTypes[0])
        expect(store.itemTypes).toContainEqual(project2ItemTypes[0])
        expect(store.itemTypes).toContainEqual(project3ItemTypes[0])
      })

      it('should handle re-fetching same project with updated data', async () => {
        // Clear cache first
        store.clearCache('corp-uuid-1')
        
        // First fetch for project-1
        const project1ItemTypesV1: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-1',
            corporation_uuid: 'corp-uuid-1',
            project_uuid: 'project-uuid-1',
            item_type: 'Old Name'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: project1ItemTypesV1,
          error: null
        })
        await store.fetchItemTypes('corp-uuid-1', 'project-uuid-1', true) // Force refresh

        // Add project-2 items
        const project2ItemTypes: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-2',
            corporation_uuid: 'corp-uuid-1',
            project_uuid: 'project-uuid-2'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: project2ItemTypes,
          error: null
        })
        await store.fetchItemTypes('corp-uuid-1', 'project-uuid-2', true) // Force refresh

        // Re-fetch project-1 with updated data
        const project1ItemTypesV2: ItemType[] = [
          {
            ...mockItemType,
            uuid: 'item-1',
            corporation_uuid: 'corp-uuid-1',
            project_uuid: 'project-uuid-1',
            item_type: 'Updated Name'
          }
        ]
        mockFetch.mockResolvedValueOnce({
          data: project1ItemTypesV2,
          error: null
        })
        await store.fetchItemTypes('corp-uuid-1', 'project-uuid-1', true) // Force refresh

        // Should have updated project-1 items + project-2 items
        expect(store.itemTypes).toHaveLength(2)
        expect(store.itemTypes).toContainEqual(project1ItemTypesV2[0])
        expect(store.itemTypes).toContainEqual(project2ItemTypes[0])
        // Should not contain old project-1 item
        expect(store.itemTypes).not.toContainEqual(project1ItemTypesV1[0])
      })
    })

  })

  describe('fetchItemType', () => {
    it('should fetch single item type successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        data: mockItemType,
        error: null
      })

      const result = await store.fetchItemType('item-type-uuid-1')

      expect(mockFetch).toHaveBeenCalledWith('/api/item-types/item-type-uuid-1')
      expect(result).toEqual(mockItemType)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle fetch single item type error', async () => {
      const errorMessage = 'Item type not found'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      const result = await store.fetchItemType('invalid-uuid')

      expect(result).toBe(null)
      expect(store.error).toBe(errorMessage)
    })
  })

  describe('createItemType', () => {
    const createPayload: CreateItemTypePayload = {
      corporation_uuid: 'corp-uuid-1',
      project_uuid: 'project-uuid-1',
      item_type: 'New Item Type',
      short_name: 'NEW',
      is_active: true
    }

    it('should create item type successfully', async () => {
      const newItemType = { ...mockItemType, ...createPayload }
      mockFetch.mockResolvedValueOnce({
        data: newItemType,
        error: null
      })

      const result = await store.createItemType(createPayload)

      expect(mockFetch).toHaveBeenCalledWith('/api/item-types', {
        method: 'POST',
        body: createPayload
      })
      expect(result).toEqual(newItemType)
      expect(store.itemTypes).toHaveLength(1)
      expect(store.itemTypes[0]).toEqual(newItemType)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle create error', async () => {
      const errorMessage = 'Validation failed'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      const result = await store.createItemType(createPayload)

      expect(result).toBe(null)
      expect(store.error).toBe(errorMessage)
      expect(store.itemTypes).toEqual([])
    })

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        data: null,
        error: 'Duplicate item type name'
      })

      const result = await store.createItemType(createPayload)

      expect(result).toBe(null)
      expect(store.error).toBe('Duplicate item type name')
    })
  })

  describe('updateItemType', () => {
    const updatePayload: UpdateItemTypePayload = {
      uuid: 'item-type-uuid-1',
      item_type: 'Updated Item Type',
      short_name: 'UPD',
      is_active: false
    }

    beforeEach(() => {
      store.setItemTypes([mockItemType])
    })

    it('should update item type successfully', async () => {
      const updatedItemType = { ...mockItemType, ...updatePayload }
      mockFetch.mockResolvedValueOnce({
        data: updatedItemType,
        error: null
      })

      const result = await store.updateItemType(updatePayload)

      expect(mockFetch).toHaveBeenCalledWith('/api/item-types/item-type-uuid-1', {
        method: 'PUT',
        body: updatePayload
      })
      expect(result).toEqual(updatedItemType)
      expect(store.itemTypes[0]).toEqual(updatedItemType)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle update error', async () => {
      const errorMessage = 'Item type not found'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      const result = await store.updateItemType(updatePayload)

      expect(result).toBe(null)
      expect(store.error).toBe(errorMessage)
      expect(store.itemTypes[0]).toEqual(mockItemType) // Should remain unchanged
    })

    it('should handle update when item type not in store', async () => {
      const updatedItemType = { ...mockItemType, ...updatePayload }
      mockFetch.mockResolvedValueOnce({
        data: updatedItemType,
        error: null
      })

      // Clear the store first
      store.clearItemTypes()

      const result = await store.updateItemType(updatePayload)

      expect(result).toEqual(updatedItemType)
      expect(store.itemTypes).toEqual([]) // Should not add to store if not found
    })
  })

  describe('deleteItemType', () => {
    beforeEach(() => {
      store.setItemTypes([mockItemType])
    })

    it('should delete item type successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await store.deleteItemType('item-type-uuid-1')

      expect(mockFetch).toHaveBeenCalledWith('/api/item-types/item-type-uuid-1', {
        method: 'DELETE'
      })
      expect(result).toBe(true)
      expect(store.itemTypes).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle delete error', async () => {
      const errorMessage = 'Cannot delete item type in use'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      const result = await store.deleteItemType('item-type-uuid-1')

      expect(result).toBe(false)
      expect(store.error).toBe(errorMessage)
      expect(store.itemTypes).toEqual([mockItemType]) // Should remain unchanged
    })

    it('should handle delete when item type not in store', async () => {
      mockFetch.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await store.deleteItemType('non-existent-uuid')

      expect(result).toBe(true)
      expect(store.itemTypes).toEqual([mockItemType]) // Should remain unchanged
    })
  })

  describe('Getters', () => {
    beforeEach(() => {
      store.setItemTypes(mockItemTypes)
    })

    describe('getItemTypesByProject', () => {
      it('should return item types for specific project', () => {
        const result = store.getItemTypesByProject('project-uuid-1')
        expect(result).toEqual([mockItemType])
      })

      it('should return empty array for non-existent project', () => {
        const result = store.getItemTypesByProject('non-existent-project')
        expect(result).toEqual([])
      })
    })

    describe('getActiveItemTypes', () => {
      it('should return active item types for corporation', () => {
        const result = store.getActiveItemTypes('corp-uuid-1')
        expect(result).toEqual(mockItemTypes)
      })

      it('should return active item types for specific project', () => {
        const result = store.getActiveItemTypes('corp-uuid-1', 'project-uuid-1')
        expect(result).toEqual([mockItemType])
      })

      it('should filter out inactive item types', () => {
        const inactiveItemType = { ...mockItemType, is_active: false }
        store.setItemTypes([...mockItemTypes, inactiveItemType])

        const result = store.getActiveItemTypes('corp-uuid-1')
        expect(result).toEqual(mockItemTypes)
        expect(result).not.toContain(inactiveItemType)
      })
    })

    describe('searchItemTypes', () => {
      it('should search by item type name', () => {
        const result = store.searchItemTypes('Electrical', 'corp-uuid-1')
        expect(result).toEqual([mockItemType])
      })

      it('should search by short name', () => {
        const result = store.searchItemTypes('ELEC', 'corp-uuid-1')
        expect(result).toEqual([mockItemType])
      })

      it('should be case insensitive', () => {
        const result = store.searchItemTypes('electrical', 'corp-uuid-1')
        expect(result).toEqual([mockItemType])
      })

      it('should return all active item types for empty query', () => {
        const result = store.searchItemTypes('', 'corp-uuid-1')
        expect(result).toEqual(mockItemTypes)
      })

      it('should search within specific project', () => {
        const result = store.searchItemTypes('Electrical', 'corp-uuid-1', 'project-uuid-1')
        expect(result).toEqual([mockItemType])
      })

      it('should return empty array for no matches', () => {
        const result = store.searchItemTypes('NonExistent', 'corp-uuid-1')
        expect(result).toEqual([])
      })
    })

    describe('getItemTypeById', () => {
      it('should return item type by UUID', () => {
        const result = store.getItemTypeById('item-type-uuid-1')
        expect(result).toEqual(mockItemType)
      })

      it('should return undefined for non-existent UUID', () => {
        const result = store.getItemTypeById('non-existent-uuid')
        expect(result).toBeUndefined()
      })
    })
  })

  describe('Cache Management', () => {
    it('should clear cache for corporation', () => {
      // Set up some cache state
      store.setItemTypes(mockItemTypes)
      
      store.clearCache('corp-uuid-1')
      
      // Should be able to fetch again after clearing cache
      expect(store.itemTypes).toEqual(mockItemTypes) // Data should remain
    })

    it('should clear all data', () => {
      store.setItemTypes(mockItemTypes)
      store.clearData()
      
      expect(store.itemTypes).toEqual([])
      expect(store.error).toBe(null)
    })

    it('should clear error', () => {
      store.clearError()
      expect(store.error).toBe(null)
    })
  })

  describe('Loading States', () => {
    it('should set loading to true during fetch', async () => {
      // Clear cache to ensure fetch is called
      store.clearCache('corp-uuid-1')
      
      mockFetch.mockResolvedValueOnce({
        data: mockItemTypes,
        error: null
      })

      await store.fetchItemTypes('corp-uuid-1')
      
      // Loading should be false after completion
      expect(store.loading).toBe(false)
    })

    it('should set loading to true during create', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(promise)

      const createPayload: CreateItemTypePayload = {
        corporation_uuid: 'corp-uuid-1',
        project_uuid: 'project-uuid-1',
        item_type: 'Test',
        short_name: 'TEST'
      }

      const createPromise = store.createItemType(createPayload)
      
      expect(store.loading).toBe(true)
      
      resolvePromise!({ data: mockItemType, error: null })
      await createPromise
      
      expect(store.loading).toBe(false)
    })
  })
})
