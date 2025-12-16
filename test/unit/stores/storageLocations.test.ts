import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStorageLocationsStore } from '../../../stores/storageLocations'

describe('storageLocations Store', () => {
  let store: ReturnType<typeof useStorageLocationsStore>

  beforeEach(() => {
    // Setup process.env before Pinia
    ;(global as any).process = { 
      server: false, 
      client: true,
      env: { NODE_ENV: 'test' }
    }
    
    setActivePinia(createPinia())
    store = useStorageLocationsStore()
    // Reset store state
    store.storageLocations = []
    store.loading = false
    store.error = null
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.storageLocations).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('fetchStorageLocations', () => {
    const mockLocations = [
      {
        id: 1,
        uuid: 'loc-1',
        corporation_uuid: 'corp-1',
        location_name: 'Main Warehouse',
        address: '123 Main St, New York, NY',
        is_default: true,
        status: 'active' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 2,
        uuid: 'loc-2',
        corporation_uuid: 'corp-1',
        location_name: 'Secondary Storage',
        address: '456 Second St, New York, NY',
        is_default: false,
        status: 'active' as const,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }
    ]

    it('should fetch storage locations successfully', async () => {
      global.$fetch = vi.fn().mockResolvedValue({ data: mockLocations }) as any;

      await store.fetchStorageLocations("corp-1", false, false); // Force API fetch

      expect(global.$fetch).toHaveBeenCalledWith(
        "/api/storage-locations?corporation_uuid=corp-1",
        undefined
      );
      expect(store.storageLocations).toEqual(mockLocations);
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
    })

    it('should handle fetch error', async () => {
      const errorMessage = "Network error";
      global.$fetch = vi.fn().mockRejectedValue(new Error(errorMessage)) as any;

      await store.fetchStorageLocations("corp-1", false, false); // Force API fetch

      expect(store.storageLocations).toEqual([]);
      expect(store.loading).toBe(false);
      expect(store.error).toBe(errorMessage);
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise!: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      global.$fetch = vi.fn().mockReturnValue(fetchPromise) as any;

      const fetchCall = store.fetchStorageLocations("corp-1", false, false); // Force API fetch

      expect(store.loading).toBe(true);

      resolvePromise({ data: mockLocations });
      await fetchCall;

      expect(store.loading).toBe(false);
    })

    it('should handle API error response', async () => {
      global.$fetch = vi.fn().mockResolvedValue({ error: "API Error" }) as any;

      await store.fetchStorageLocations("corp-1", false, false); // Force API fetch

      expect(store.storageLocations).toEqual([]);
      expect(store.error).toBe("API Error");
    })

    it('should handle empty data', async () => {
      global.$fetch = vi.fn().mockResolvedValue({ data: [] }) as any;

      await store.fetchStorageLocations("corp-1", false, false); // Force API fetch

      expect(store.storageLocations).toEqual([]);
      expect(store.error).toBe(null);
    })

    it('should skip fetch on server side', async () => {
      ;(global as any).process = { 
        server: true, 
        client: false,
        env: { NODE_ENV: 'test' }
      }
      global.$fetch = vi.fn() as any

      await store.fetchStorageLocations('corp-1')

      expect(global.$fetch).not.toHaveBeenCalled()
    })
  })

  describe('addStorageLocation', () => {
    const newLocation = {
      location_name: 'New Storage',
      address: '789 Third St, Boston, MA',
      is_default: false,
      status: 'active' as const
    }

    const createdLocation = {
      id: 3,
      uuid: 'loc-3',
      corporation_uuid: 'corp-1',
      ...newLocation,
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z'
    }

    it('should add storage location successfully', async () => {
      global.$fetch = vi.fn().mockResolvedValue({ data: createdLocation }) as any

      await store.addStorageLocation('corp-1', newLocation)

      expect(global.$fetch).toHaveBeenCalledWith('/api/storage-locations', {
        method: 'POST',
        body: { ...newLocation, corporation_uuid: 'corp-1' }
      })
      expect(store.storageLocations).toHaveLength(1)
      expect(store.storageLocations[0]).toEqual(createdLocation)
      expect(store.error).toBe(null)
    })

    it('should handle add error', async () => {
      const errorMessage = 'Validation failed'
      global.$fetch = vi.fn().mockRejectedValue(new Error(errorMessage)) as any

      await expect(
        store.addStorageLocation('corp-1', newLocation)
      ).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
    })

    it('should handle API error response', async () => {
      global.$fetch = vi.fn().mockResolvedValue({ error: 'Location already exists' }) as any

      await expect(
        store.addStorageLocation('corp-1', newLocation)
      ).rejects.toThrow('Location already exists')
      expect(store.error).toBe('Location already exists')
    })

    it('should add location to beginning of array', async () => {
      store.storageLocations = [
        {
          id: 1,
          uuid: 'loc-1',
          corporation_uuid: 'corp-1',
          location_name: 'Existing Location',
          address: '123 Main St',
          is_default: true,
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      global.$fetch = vi.fn().mockResolvedValue({ data: createdLocation }) as any

      await store.addStorageLocation('corp-1', newLocation)

      expect(store.storageLocations).toHaveLength(2)
      expect(store.storageLocations[0]).toEqual(createdLocation)
    })

    it('should set loading state during add', async () => {
      let resolvePromise!: (value: any) => void
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      global.$fetch = vi.fn().mockReturnValue(fetchPromise) as any

      const addCall = store.addStorageLocation('corp-1', newLocation)

      expect(store.loading).toBe(true)

      resolvePromise({ data: createdLocation })
      await addCall

      expect(store.loading).toBe(false)
    })
  })

  describe('updateStorageLocation', () => {
    const existingLocation = {
      id: 1,
      uuid: 'loc-1',
      corporation_uuid: 'corp-1',
      location_name: 'Test Location',
      address: '123 Main St',
      is_default: true,
      status: 'active' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    const updateData = {
      location_name: 'Updated Location',
      address: '456 Updated St',
      is_default: false,
      status: 'inactive' as const
    }

    const updatedLocation = {
      ...existingLocation,
      ...updateData,
      updated_at: '2024-01-02T00:00:00Z'
    }

    beforeEach(() => {
      store.storageLocations = [existingLocation]
    })

    it('should update storage location successfully', async () => {
      global.$fetch = vi.fn().mockResolvedValue({ data: updatedLocation }) as any

      await store.updateStorageLocation('corp-1', existingLocation, updateData)

      expect(global.$fetch).toHaveBeenCalledWith('/api/storage-locations', {
        method: 'PUT',
        body: {
          ...updateData,
          uuid: existingLocation.uuid,
          corporation_uuid: 'corp-1'
        }
      })
      expect(store.storageLocations[0]).toMatchObject(updatedLocation)
      expect(store.error).toBe(null)
    })

    it('should handle update error', async () => {
      const errorMessage = 'Update failed'
      global.$fetch = vi.fn().mockResolvedValue({ error: errorMessage }) as any

      await expect(
        store.updateStorageLocation('corp-1', existingLocation, updateData)
      ).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.storageLocations[0]).toEqual(existingLocation)
    })

    it('should update correct location when multiple exist', async () => {
      const anotherLocation = {
        id: 2,
        uuid: 'loc-2',
        corporation_uuid: 'corp-1',
        location_name: 'Another Location',
        address: '789 Other St',
        is_default: false,
        status: 'active' as const,
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z'
      }

      store.storageLocations = [existingLocation, anotherLocation]

      global.$fetch = vi.fn().mockResolvedValue({ data: updatedLocation }) as any

      await store.updateStorageLocation('corp-1', existingLocation, updateData)

      expect(store.storageLocations).toHaveLength(2)
      expect(store.storageLocations[0]).toMatchObject(updatedLocation)
      expect(store.storageLocations[1]).toEqual(anotherLocation)
    })

    it('should set loading state during update', async () => {
      let resolvePromise!: (value: any) => void
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      global.$fetch = vi.fn().mockReturnValue(fetchPromise) as any

      const updateCall = store.updateStorageLocation('corp-1', existingLocation, updateData)

      expect(store.loading).toBe(true)

      resolvePromise({ data: updatedLocation })
      await updateCall

      expect(store.loading).toBe(false)
    })
  })

  describe('deleteStorageLocation', () => {
    const locationToDelete = {
      id: 1,
      uuid: 'loc-1',
      corporation_uuid: 'corp-1',
      location_name: 'Test Location',
      address: '123 Main St',
      is_default: false,
      status: 'active' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    beforeEach(() => {
      store.storageLocations = [locationToDelete]
    })

    it('should delete storage location successfully', async () => {
      global.$fetch = vi.fn().mockResolvedValue({ success: true }) as any

      await store.deleteStorageLocation('corp-1', locationToDelete)

      expect(global.$fetch).toHaveBeenCalledWith(`/api/storage-locations?uuid=${locationToDelete.uuid}`, {
        method: 'DELETE'
      })
      expect(store.storageLocations).toHaveLength(0)
      expect(store.error).toBe(null)
    })

    it('should handle delete error', async () => {
      const errorMessage = 'Delete failed'
      global.$fetch = vi.fn().mockResolvedValue({ error: errorMessage }) as any

      await expect(
        store.deleteStorageLocation('corp-1', locationToDelete)
      ).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.storageLocations).toHaveLength(1)
    })

    it('should delete correct location when multiple exist', async () => {
      const anotherLocation = {
        id: 2,
        uuid: 'loc-2',
        corporation_uuid: 'corp-1',
        location_name: 'Another Location',
        address: '456 Second St',
        is_default: false,
        status: 'active' as const,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }

      store.storageLocations = [locationToDelete, anotherLocation]

      global.$fetch = vi.fn().mockResolvedValue({ success: true }) as any

      await store.deleteStorageLocation('corp-1', locationToDelete)

      expect(store.storageLocations).toHaveLength(1)
      expect(store.storageLocations[0]).toEqual(anotherLocation)
    })

    it('should set loading state during delete', async () => {
      let resolvePromise!: (value: any) => void
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      global.$fetch = vi.fn().mockReturnValue(fetchPromise) as any

      const deleteCall = store.deleteStorageLocation('corp-1', locationToDelete)

      expect(store.loading).toBe(true)

      resolvePromise({ success: true })
      await deleteCall

      expect(store.loading).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should clear error when operation succeeds', async () => {
      store.error = "Previous error";
      global.$fetch = vi.fn().mockResolvedValue({ data: [] }) as any;

      await store.fetchStorageLocations("corp-1", false, false); // Force API fetch

      expect(store.error).toBe(null);
    })

    it('should handle API response errors', async () => {
      global.$fetch = vi.fn().mockResolvedValue({ error: "API Error" }) as any;

      await store.fetchStorageLocations("corp-1", false, false); // Force API fetch

      expect(store.error).toBe("API Error");
    })

    it('should preserve error message on failure', async () => {
      const errorMessage = "Failed to fetch";
      global.$fetch = vi.fn().mockRejectedValue(new Error(errorMessage)) as any;

      await store.fetchStorageLocations("corp-1", false, false); // Force API fetch

      expect(store.error).toBe(errorMessage);
    })
  })

  describe('Loading State', () => {
    it('should reset loading state after successful fetch', async () => {
      global.$fetch = vi.fn().mockResolvedValue({ data: [] }) as any

      await store.fetchStorageLocations('corp-1')

      expect(store.loading).toBe(false)
    })

    it('should reset loading state after failed fetch', async () => {
      global.$fetch = vi.fn().mockRejectedValue(new Error('Error')) as any

      await store.fetchStorageLocations('corp-1')

      expect(store.loading).toBe(false)
    })
  })

  describe('Project UUID Functionality', () => {
    describe('addStorageLocation with project_uuid', () => {
      const newLocationWithProject = {
        location_name: 'Project Storage',
        address: '100 Project Ave, San Francisco, CA',
        project_uuid: 'project-123',
        is_default: false,
        status: 'active' as const
      }

      const createdLocationWithProject = {
        id: 10,
        uuid: 'loc-10',
        corporation_uuid: 'corp-1',
        ...newLocationWithProject,
        created_at: '2024-01-10T00:00:00Z',
        updated_at: '2024-01-10T00:00:00Z'
      }

      it('should add storage location with project_uuid successfully', async () => {
        global.$fetch = vi.fn().mockResolvedValue({ data: createdLocationWithProject }) as any

        await store.addStorageLocation('corp-1', newLocationWithProject)

        expect(global.$fetch).toHaveBeenCalledWith('/api/storage-locations', {
          method: 'POST',
          body: { ...newLocationWithProject, corporation_uuid: 'corp-1' }
        })
        expect(store.storageLocations).toHaveLength(1)
        expect(store.storageLocations[0]).toEqual(createdLocationWithProject)
        expect(store.storageLocations[0].project_uuid).toBe('project-123')
        expect(store.error).toBe(null)
      })

      it('should add storage location without project_uuid (optional field)', async () => {
        const newLocationWithoutProject = {
          location_name: 'General Storage',
          address: '200 General Blvd, Seattle, WA',
          is_default: false,
          status: 'active' as const
        }

        const createdLocationWithoutProject = {
          id: 11,
          uuid: 'loc-11',
          corporation_uuid: 'corp-1',
          ...newLocationWithoutProject,
          created_at: '2024-01-11T00:00:00Z',
          updated_at: '2024-01-11T00:00:00Z'
        }

        global.$fetch = vi.fn().mockResolvedValue({ data: createdLocationWithoutProject }) as any

        await store.addStorageLocation('corp-1', newLocationWithoutProject)

        expect(global.$fetch).toHaveBeenCalledWith('/api/storage-locations', {
          method: 'POST',
          body: { ...newLocationWithoutProject, corporation_uuid: 'corp-1' }
        })
        expect(store.storageLocations).toHaveLength(1)
        expect(store.storageLocations[0]).toEqual(createdLocationWithoutProject)
        expect(store.storageLocations[0].project_uuid).toBeUndefined()
        expect(store.error).toBe(null)
      })
    })

    describe('updateStorageLocation with project_uuid', () => {
      const existingLocation = {
        id: 1,
        uuid: 'loc-1',
        corporation_uuid: 'corp-1',
        location_name: 'Test Location',
        address: '123 Main St',
        is_default: true,
        status: 'active' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      beforeEach(() => {
        store.storageLocations = [existingLocation]
      })

      it('should add project_uuid to existing location without one', async () => {
        const updateDataWithProject = {
          project_uuid: 'project-456'
        }

        const updatedLocation = {
          ...existingLocation,
          ...updateDataWithProject,
          updated_at: '2024-01-05T00:00:00Z'
        }

        global.$fetch = vi.fn().mockResolvedValue({ data: updatedLocation }) as any

        await store.updateStorageLocation('corp-1', existingLocation, updateDataWithProject)

        expect(global.$fetch).toHaveBeenCalledWith('/api/storage-locations', {
          method: 'PUT',
          body: {
            ...updateDataWithProject,
            uuid: existingLocation.uuid,
            corporation_uuid: 'corp-1'
          }
        })
        expect(store.storageLocations[0].project_uuid).toBe('project-456')
        expect(store.error).toBe(null)
      })

      it('should change project_uuid on existing location', async () => {
        const locationWithProject = {
          ...existingLocation,
          project_uuid: 'project-old'
        }

        store.storageLocations = [locationWithProject]

        const updateDataNewProject = {
          project_uuid: 'project-new'
        }

        const updatedLocation = {
          ...locationWithProject,
          ...updateDataNewProject,
          updated_at: '2024-01-06T00:00:00Z'
        }

        global.$fetch = vi.fn().mockResolvedValue({ data: updatedLocation }) as any

        await store.updateStorageLocation('corp-1', locationWithProject, updateDataNewProject)

        expect(store.storageLocations[0].project_uuid).toBe('project-new')
        expect(store.error).toBe(null)
      })

      it('should remove project_uuid from location (set to null)', async () => {
        const locationWithProject = {
          ...existingLocation,
          project_uuid: 'project-to-remove'
        }

        store.storageLocations = [locationWithProject]

        const updateDataRemoveProject = {
          project_uuid: undefined
        }

        const updatedLocation = {
          ...locationWithProject,
          project_uuid: undefined,
          updated_at: '2024-01-07T00:00:00Z'
        }

        global.$fetch = vi.fn().mockResolvedValue({ data: updatedLocation }) as any

        await store.updateStorageLocation('corp-1', locationWithProject, updateDataRemoveProject)

        expect(global.$fetch).toHaveBeenCalledWith('/api/storage-locations', {
          method: 'PUT',
          body: {
            project_uuid: undefined,
            uuid: locationWithProject.uuid,
            corporation_uuid: 'corp-1'
          }
        })
        expect(store.storageLocations[0].project_uuid).toBeUndefined()
        expect(store.error).toBe(null)
      })

      it('should update other fields while preserving project_uuid', async () => {
        const locationWithProject = {
          ...existingLocation,
          project_uuid: 'project-preserve'
        }

        store.storageLocations = [locationWithProject]

        const updateDataOtherFields = {
          location_name: 'Updated Name',
          address: '456 Updated St'
        }

        const updatedLocation = {
          ...locationWithProject,
          ...updateDataOtherFields,
          updated_at: '2024-01-08T00:00:00Z'
        }

        global.$fetch = vi.fn().mockResolvedValue({ data: updatedLocation }) as any

        await store.updateStorageLocation('corp-1', locationWithProject, updateDataOtherFields)

        expect(store.storageLocations[0].location_name).toBe('Updated Name')
        expect(store.storageLocations[0].address).toBe('456 Updated St')
        expect(store.storageLocations[0].project_uuid).toBe('project-preserve')
        expect(store.error).toBe(null)
      })
    })

    describe('fetchStorageLocations with project_uuid', () => {
      const mockLocationsWithProjects = [
        {
          id: 1,
          uuid: 'loc-1',
          corporation_uuid: 'corp-1',
          location_name: 'Project A Warehouse',
          address: '123 Project A St',
          project_uuid: 'project-a',
          is_default: false,
          status: 'active' as const,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          uuid: 'loc-2',
          corporation_uuid: 'corp-1',
          location_name: 'General Warehouse',
          address: '456 General St',
          project_uuid: undefined,
          is_default: true,
          status: 'active' as const,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        },
        {
          id: 3,
          uuid: 'loc-3',
          corporation_uuid: 'corp-1',
          location_name: 'Project B Storage',
          address: '789 Project B Ave',
          project_uuid: 'project-b',
          is_default: false,
          status: 'active' as const,
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z'
        }
      ]

      it('should fetch storage locations with mixed project_uuid values', async () => {
        global.$fetch = vi.fn().mockResolvedValue({ data: mockLocationsWithProjects }) as any

        await store.fetchStorageLocations('corp-1', false, false) // Force API fetch

        expect(store.storageLocations).toEqual(mockLocationsWithProjects)
        expect(store.storageLocations).toHaveLength(3)
        expect(store.storageLocations[0].project_uuid).toBe('project-a')
        expect(store.storageLocations[1].project_uuid).toBeUndefined()
        expect(store.storageLocations[2].project_uuid).toBe('project-b')
        expect(store.error).toBe(null)
      })

      it('should handle locations with null project_uuid', async () => {
        const locationsWithNullProject = [
          {
            ...mockLocationsWithProjects[0],
            project_uuid: null as any
          }
        ]

        global.$fetch = vi.fn().mockResolvedValue({ data: locationsWithNullProject }) as any

        await store.fetchStorageLocations('corp-1', false, false)

        expect(store.storageLocations[0].project_uuid).toBeNull()
        expect(store.error).toBe(null)
      })
    })
  })
})

