import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectTypesStore } from '@/stores/projectTypes'

// Mock $fetch
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('ProjectTypes Store', () => {
  let store: ReturnType<typeof useProjectTypesStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useProjectTypesStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.projectTypes).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('fetchProjectTypes', () => {
    it('should fetch project types successfully', async () => {
      const mockProjectTypes = [
        {
          id: 1,
          uuid: "pt-1",
          name: "Residential",
          description: "Residential construction projects",
          color: "#3B82F6",
          isActive: true,
          created_at: "2023-01-01T00:00:00Z",
        },
        {
          id: 2,
          uuid: "pt-2",
          name: "Commercial",
          description: "Commercial construction projects",
          color: "#10B981",
          isActive: true,
          created_at: "2023-01-02T00:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({ data: mockProjectTypes })

      await store.fetchProjectTypes()

      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
      expect(store.projectTypes).toEqual(mockProjectTypes)
      expect(mockFetch).toHaveBeenCalledWith('/api/project-types')
    })

    it('should handle fetch error', async () => {
      const errorMessage = 'Failed to fetch project types'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await store.fetchProjectTypes()

      expect(store.loading).toBe(false)
      expect(store.error).toBe(errorMessage)
      expect(store.projectTypes).toEqual([])
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(promise)

      const fetchPromise = store.fetchProjectTypes()

      expect(store.loading).toBe(true)

      resolvePromise!({ data: [] })
      await fetchPromise

      expect(store.loading).toBe(false)
    })
  })

  describe('createProjectType', () => {
    it('should create project type successfully', async () => {
      const newProjectType = {
        name: 'Industrial',
        description: 'Industrial construction projects',
        color: '#F59E0B',
        isActive: true
      }

      const createdProjectType = {
        id: 3,
        uuid: 'pt-3',
        ...newProjectType,
        created_at: '2023-01-03T00:00:00Z'
      }

      mockFetch.mockResolvedValueOnce({ data: createdProjectType })

      const result = await store.createProjectType(newProjectType)

      expect(result).toEqual(createdProjectType)
      expect(mockFetch).toHaveBeenCalledWith('/api/project-types', {
        method: 'POST',
        body: newProjectType
      })
    })

    it('should handle create project type error', async () => {
      const newProjectType = {
        name: 'Industrial'
      }

      const errorMessage = 'Failed to create project type'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.createProjectType(newProjectType)).rejects.toThrow(errorMessage)
    })
  })

  describe('updateProjectType', () => {
    it('should update project type successfully', async () => {
      const projectTypeUuid = 'pt-1'
      const updateData = {
        name: 'Updated Residential',
        description: 'Updated description'
      }

      const updatedProjectType = {
        id: 1,
        uuid: projectTypeUuid,
        ...updateData,
        updated_at: '2023-01-03T00:00:00Z'
      }

      mockFetch.mockResolvedValueOnce({ data: updatedProjectType })

      const result = await store.updateProjectType(projectTypeUuid, updateData)

      expect(result).toEqual(updatedProjectType)
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/project-types/${projectTypeUuid}`,
        {
          method: "PUT",
          body: updateData,
        }
      );
    })

    it('should handle update project type error', async () => {
      const projectTypeUuid = 'pt-1'
      const updateData = { name: 'Updated Name' }

      const errorMessage = 'Failed to update project type'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.updateProjectType(projectTypeUuid, updateData)).rejects.toThrow(errorMessage)
    })
  })

  describe('deleteProjectType', () => {
    it('should delete project type successfully', async () => {
      const projectTypeUuid = 'pt-1'
      const deletedProjectType = {
        id: 1,
        uuid: projectTypeUuid,
        is_active: false,
        updated_at: '2023-01-03T00:00:00Z'
      }

      mockFetch.mockResolvedValueOnce({ data: deletedProjectType })

      await store.deleteProjectType(projectTypeUuid)

      expect(store.error).toBe(null)
      expect(mockFetch).toHaveBeenCalledWith(`/api/project-types/${projectTypeUuid}`, {
        method: 'DELETE'
      })
    })

    it('should handle delete project type error', async () => {
      const projectTypeUuid = 'pt-1'
      const errorMessage = 'Failed to delete project type'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.deleteProjectType(projectTypeUuid)).rejects.toThrow(errorMessage)
    })
  })

  describe('getActiveProjectTypes', () => {
    beforeEach(async () => {
      const mockProjectTypes = [
        {
          id: 1,
          uuid: "pt-1",
          name: "Residential",
          isActive: true,
        },
        {
          id: 2,
          uuid: "pt-2",
          name: "Commercial",
          isActive: true,
        },
        {
          id: 3,
          uuid: "pt-3",
          name: "Industrial",
          isActive: false,
        },
        {
          id: 4,
          uuid: "pt-4",
          name: "Infrastructure",
          isActive: true,
        },
      ];
      
      mockFetch.mockResolvedValueOnce({ data: mockProjectTypes })
      await store.fetchProjectTypes()
    })

    it('should return all active project types', () => {
      const activeTypes = store.getActiveProjectTypes
      expect(activeTypes).toHaveLength(3)
      expect(
        activeTypes.every((type) => type.isActive)
      ).toBe(true);
    })

    it('should exclude inactive project types', () => {
      const activeTypes = store.getActiveProjectTypes
      const hasInactive = activeTypes.some((type) => !type.isActive)
      expect(hasInactive).toBe(false)
    })
  })

  describe('getProjectTypeById', () => {
    beforeEach(async () => {
      const mockProjectTypes = [
        {
          id: 1,
          uuid: "pt-1",
          name: "Residential",
          isActive: true,
        },
        {
          id: 2,
          uuid: "pt-2",
          name: "Commercial",
          isActive: true,
        },
      ];
      
      mockFetch.mockResolvedValueOnce({ data: mockProjectTypes })
      await store.fetchProjectTypes()
    })

    it('should return project type by UUID', () => {
      const projectType = store.getProjectTypeById('pt-1')
      expect(projectType).toEqual({
        id: 1,
        uuid: "pt-1",
        name: "Residential",
        isActive: true,
      });
    })

    it('should return undefined for non-existent project type', () => {
      const projectType = store.getProjectTypeById('non-existent')
      expect(projectType).toBeUndefined()
    })
  })

  describe('clearError', () => {
    it('should clear error state', () => {
      // Set error through store method
      store.clearError()
      expect(store.error).toBe(null)
    })
  })

  describe('clearProjectTypes', () => {
    it('should clear project types array', async () => {
      const mockProjectTypes = [
        { id: 1, uuid: 'pt-1', name: 'Residential', isActive: true }
      ]
      mockFetch.mockResolvedValueOnce({ data: mockProjectTypes })
      await store.fetchProjectTypes()
      
      store.clearProjectTypes()
      expect(store.projectTypes).toEqual([])
    })
  })

  describe('Project Type Statistics', () => {
    beforeEach(async () => {
      const mockProjectTypes = [
        {
          id: 1,
          uuid: "pt-1",
          name: "Residential",
          isActive: true,
        },
        {
          id: 2,
          uuid: "pt-2",
          name: "Commercial",
          isActive: true,
        },
        {
          id: 3,
          uuid: "pt-3",
          name: "Industrial",
          isActive: false,
        },
      ];
      
      mockFetch.mockResolvedValueOnce({ data: mockProjectTypes })
      await store.fetchProjectTypes()
    })

    it('should get total project type count', () => {
      const count = store.getProjectTypeCount
      expect(count).toBe(3)
    })

    it('should get active project type count', () => {
      const count = store.getActiveProjectTypeCount
      expect(count).toBe(2)
    })

    it('should check if project type exists', () => {
      expect(store.projectTypeExists('pt-1')).toBe(true)
      expect(store.projectTypeExists('non-existent')).toBe(false)
    })
  })

  describe("Project Type Lookup for UI Display", () => {
    beforeEach(async () => {
      const mockProjectTypes = [
        {
          id: 1,
          uuid: "pt-1",
          name: "Renovation",
          isActive: true,
        },
        {
          id: 2,
          uuid: "pt-2",
          name: "New Construction",
          isActive: true,
        },
        {
          id: 3,
          uuid: "pt-3",
          name: "Maintenance",
          isActive: false, // inactive
        },
        {
          id: 4,
          uuid: "pt-4",
          name: "Repair",
          isActive: true,
        },
      ];

      mockFetch.mockResolvedValueOnce({ data: mockProjectTypes });
      await store.fetchProjectTypes();
    });

    it("should return active project types for UI lookup mapping", () => {
      const activeTypes = store.getActiveProjectTypes;

      // Verify we get only active types
      expect(activeTypes).toHaveLength(3);
      expect(activeTypes.every((type) => type.isActive)).toBe(true);

      // Verify the structure is correct for UI lookup
      const lookupMap = activeTypes.reduce((map, type) => {
        map[type.uuid] = type.name;
        return map;
      }, {} as Record<string, string>);

      expect(lookupMap).toEqual({
        "pt-1": "Renovation",
        "pt-2": "New Construction",
        "pt-4": "Repair",
      });

      // Verify inactive type is not included
      expect(lookupMap["pt-3"]).toBeUndefined();
    });

    it("should handle project types with missing names gracefully", async () => {
      // Clear the store first to avoid interference from previous test
      store.clearProjectTypes();

      const mockProjectTypesWithMissingNames = [
        {
          id: 1,
          uuid: "pt-1",
          name: "Valid Type",
          isActive: true,
        },
        {
          id: 2,
          uuid: "pt-2",
          name: null, // missing name
          isActive: true,
        },
        {
          id: 3,
          uuid: "pt-3",
          name: "", // empty name
          isActive: true,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        data: mockProjectTypesWithMissingNames,
      });
      await store.fetchProjectTypes();

      const activeTypes = store.getActiveProjectTypes;
      const lookupMap = activeTypes.reduce((map, type) => {
        map[type.uuid] = type.name || type.uuid; // fallback to UUID if name is missing
        return map;
      }, {} as Record<string, string>);

      expect(lookupMap).toEqual({
        "pt-1": "Valid Type",
        "pt-2": "pt-2", // fallback to UUID
        "pt-3": "pt-3", // fallback to UUID
      });
    });
  });
})
