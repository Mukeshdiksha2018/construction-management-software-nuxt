import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTermsAndConditionsStore } from '@/stores/termsAndConditions'

// Mock $fetch
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('TermsAndConditions Store', () => {
  let store: ReturnType<typeof useTermsAndConditionsStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useTermsAndConditionsStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.termsAndConditions).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('fetchTermsAndConditions', () => {
    it('should fetch terms and conditions successfully', async () => {
      const mockTermsAndConditions = [
        {
          id: 1,
          uuid: "tc-1",
          name: "Standard Terms",
          content: "<p>Standard terms and conditions</p>",
          isActive: true,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
        },
        {
          id: 2,
          uuid: "tc-2",
          name: "Payment Terms",
          content: "<p>Payment terms and conditions</p>",
          isActive: true,
          created_at: "2023-01-02T00:00:00Z",
          updated_at: "2023-01-02T00:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({ success: true, data: mockTermsAndConditions })

      await store.fetchTermsAndConditions()

      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
      expect(store.termsAndConditions).toEqual(mockTermsAndConditions)
      expect(mockFetch).toHaveBeenCalledWith('/api/terms-and-conditions')
    })

    it('should handle fetch error', async () => {
      const errorMessage = 'Failed to fetch terms and conditions'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await store.fetchTermsAndConditions()

      expect(store.loading).toBe(false)
      expect(store.error).toBe(errorMessage)
      expect(store.termsAndConditions).toEqual([])
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(promise)

      const fetchPromise = store.fetchTermsAndConditions()

      expect(store.loading).toBe(true)

      resolvePromise!({ success: true, data: [] })
      await fetchPromise

      expect(store.loading).toBe(false)
    })

    it('should use cached data when forceRefresh is false and data exists', async () => {
      const mockTermsAndConditions = [
        {
          id: 1,
          uuid: "tc-1",
          name: "Standard Terms",
          content: "<p>Standard terms</p>",
          isActive: true,
        },
      ];

      // First fetch to populate cache
      mockFetch.mockResolvedValueOnce({ success: true, data: mockTermsAndConditions })
      await store.fetchTermsAndConditions()

      // Second fetch should use cache
      await store.fetchTermsAndConditions(false)

      // Should only be called once
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should force refresh when forceRefresh is true', async () => {
      const mockTermsAndConditions = [
        {
          id: 1,
          uuid: "tc-1",
          name: "Standard Terms",
          content: "<p>Standard terms</p>",
          isActive: true,
        },
      ];

      // First fetch
      mockFetch.mockResolvedValueOnce({ success: true, data: mockTermsAndConditions })
      await store.fetchTermsAndConditions()

      // Force refresh
      mockFetch.mockResolvedValueOnce({ success: true, data: mockTermsAndConditions })
      await store.fetchTermsAndConditions(true)

      // Should be called twice
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('createTermsAndCondition', () => {
    it('should create terms and condition successfully', async () => {
      const newTermsAndCondition = {
        name: "New Terms",
        content: "<p>New terms and conditions</p>",
        isActive: true,
      };

      const createdTermsAndCondition = {
        id: 3,
        uuid: 'tc-3',
        ...newTermsAndCondition,
        created_at: '2023-01-03T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z'
      }

      mockFetch.mockResolvedValueOnce({ success: true, data: createdTermsAndCondition })

      const result = await store.createTermsAndCondition(newTermsAndCondition)

      expect(result).toEqual(createdTermsAndCondition)
      expect(mockFetch).toHaveBeenCalledWith('/api/terms-and-conditions', {
        method: 'POST',
        body: newTermsAndCondition
      })
      expect(store.termsAndConditions).toContainEqual(createdTermsAndCondition)
    })

    it('should handle create terms and condition error', async () => {
      const newTermsAndCondition = {
        name: 'New Terms',
        content: '<p>Content</p>',
        isActive: true
      }

      const errorMessage = 'Failed to create terms and condition'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.createTermsAndCondition(newTermsAndCondition)).rejects.toThrow(errorMessage)
    })
  })

  describe('updateTermsAndCondition', () => {
    it('should update terms and condition successfully', async () => {
      const termsAndConditionId = '1'
      const updateData = {
        name: 'Updated Standard Terms',
        content: '<p>Updated content</p>'
      }

      const updatedTermsAndCondition = {
        id: 1,
        uuid: 'tc-1',
        ...updateData,
        isActive: true,
        updated_at: '2023-01-03T00:00:00Z'
      }

      // First, populate store with initial data
      mockFetch.mockResolvedValueOnce({ 
        success: true,
        data: [{
          id: 1,
          uuid: 'tc-1',
          name: 'Standard Terms',
          content: '<p>Original content</p>',
          isActive: true
        }]
      })
      await store.fetchTermsAndConditions()

      // Then update
      mockFetch.mockResolvedValueOnce({ success: true, data: updatedTermsAndCondition })

      const result = await store.updateTermsAndCondition(termsAndConditionId, updateData)

      expect(result).toEqual(updatedTermsAndCondition)
      expect(mockFetch).toHaveBeenCalledWith(`/api/terms-and-conditions/${termsAndConditionId}`, {
        method: 'PUT',
        body: updateData
      })
    })

    it('should handle update terms and condition error', async () => {
      const termsAndConditionId = '1'
      const updateData = {
        name: 'Updated Terms'
      }

      const errorMessage = 'Failed to update terms and condition'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.updateTermsAndCondition(termsAndConditionId, updateData)).rejects.toThrow(errorMessage)
    })
  })

  describe('deleteTermsAndCondition', () => {
    it('should delete terms and condition successfully', async () => {
      const termsAndConditionId = '1'

      // First, populate store with data
      const mockTermsAndConditions = [
        {
          id: 1,
          uuid: 'tc-1',
          name: 'Standard Terms',
          content: '<p>Content</p>',
          isActive: true
        },
        {
          id: 2,
          uuid: 'tc-2',
          name: 'Payment Terms',
          content: '<p>Payment content</p>',
          isActive: true
        }
      ]

      mockFetch.mockResolvedValueOnce({ success: true, data: mockTermsAndConditions })
      await store.fetchTermsAndConditions()

      expect(store.termsAndConditions.length).toBe(2)

      // Delete
      mockFetch.mockResolvedValueOnce({})
      await store.deleteTermsAndCondition(termsAndConditionId)

      expect(mockFetch).toHaveBeenCalledWith(`/api/terms-and-conditions/${termsAndConditionId}`, {
        method: 'DELETE'
      })
      expect(store.termsAndConditions.length).toBe(1)
      expect(store.termsAndConditions[0].id).toBe(2)
    })

    it('should handle delete terms and condition error', async () => {
      const termsAndConditionId = '1'
      const errorMessage = 'Failed to delete terms and condition'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.deleteTermsAndCondition(termsAndConditionId)).rejects.toThrow(errorMessage)
    })
  })

  describe('Getters', () => {
    const mockTermsAndConditions = [
      {
        id: 1,
        uuid: "tc-1",
        name: "Standard Terms",
        content: "<p>Standard terms</p>",
        isActive: true,
      },
      {
        id: 2,
        uuid: "tc-2",
        name: "Payment Terms",
        content: "<p>Payment terms</p>",
        isActive: true,
      },
      {
        id: 3,
        uuid: "tc-3",
        name: "Inactive Terms",
        content: "<p>Inactive terms</p>",
        isActive: false,
      },
    ];

    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({ success: true, data: mockTermsAndConditions })
      await store.fetchTermsAndConditions()
    })

    it('should get all terms and conditions', () => {
      const all = store.getAllTermsAndConditions
      expect(all).toEqual(mockTermsAndConditions)
      expect(all.length).toBe(3)
    })

    it('should get active terms and conditions only', () => {
      const active = store.getActiveTermsAndConditions
      expect(active.length).toBe(2)
      expect(active.every(tc => tc.isActive)).toBe(true)
    })

    it('should get terms and condition by UUID', () => {
      const found = store.getTermsAndConditionById('tc-1')
      expect(found).toEqual(mockTermsAndConditions[0])
    })

    it('should return undefined for non-existent UUID', () => {
      const found = store.getTermsAndConditionById('non-existent')
      expect(found).toBeUndefined()
    })

    it('should get total terms and condition count', () => {
      const count = store.getTermsAndConditionCount
      expect(count).toBe(3)
    })

    it('should get active terms and condition count', () => {
      const count = store.getActiveTermsAndConditionCount
      expect(count).toBe(2)
    })

    it('should check if terms and condition exists', () => {
      expect(store.termsAndConditionExists('tc-1')).toBe(true)
      expect(store.termsAndConditionExists('non-existent')).toBe(false)
    })
  })

  describe('Helper Methods', () => {
    it('should clear error', () => {
      store.clearError()
      expect(store.error).toBe(null)
    })

    it('should clear terms and conditions', async () => {
      const mockTermsAndConditions = [
        {
          id: 1,
          uuid: "tc-1",
          name: "Standard Terms",
          content: "<p>Content</p>",
          isActive: true,
        },
      ];

      mockFetch.mockResolvedValueOnce({ success: true, data: mockTermsAndConditions })
      await store.fetchTermsAndConditions()
      store.clearTermsAndConditions()
      expect(store.termsAndConditions).toEqual([])
    })

    it('should refresh terms and conditions from API', async () => {
      const mockTermsAndConditions = [
        {
          id: 1,
          uuid: "tc-1",
          name: "Standard Terms",
          content: "<p>Content</p>",
          isActive: true,
        },
      ];

      mockFetch.mockResolvedValueOnce({ success: true, data: mockTermsAndConditions })
      await store.refreshTermsAndConditionsFromAPI()

      expect(mockFetch).toHaveBeenCalledWith('/api/terms-and-conditions')
      expect(store.termsAndConditions).toEqual(mockTermsAndConditions)
    })
  })
})

