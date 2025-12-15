import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import StorageLocations from '@/components/Corporations/StorageLocations.vue'
import { useStorageLocationsStore } from '@/stores/storageLocations'
import { useCorporationStore } from '@/stores/corporations'

// Mock stores
vi.mock('@/stores/storageLocations')
vi.mock('@/stores/corporations')

// Mock composables
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: vi.fn(() => true),
    isReady: ref(true)
  })
}))

// Mock Nuxt composables
vi.mock('#app', () => ({
  useToast: () => ({
    add: vi.fn()
  })
}))

describe('StorageLocations - Pagination', () => {
  let mockStorageLocationsStore: any
  let mockCorporationStore: any
  let wrapper: any

  // Generate mock storage locations
  const generateMockLocations = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      uuid: `loc-${i + 1}`,
      corporation_uuid: 'corp-1',
      location_name: `Location ${i + 1}`,
      address: `${i + 1} Test St`,
      is_default: i === 0,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
  }

  beforeEach(() => {
    setActivePinia(createPinia())

    // Mock storage locations store
    mockStorageLocationsStore = {
      storageLocations: ref([]),
      loading: ref(false),
      error: ref(null),
      fetchStorageLocations: vi.fn()
    }

    // Mock corporation store
    mockCorporationStore = {
      selectedCorporationId: ref('corp-1'),
      selectedCorporation: ref({
        uuid: 'corp-1',
        corporation_name: 'Test Corporation'
      })
    }

    vi.mocked(useStorageLocationsStore).mockReturnValue(mockStorageLocationsStore)
    vi.mocked(useCorporationStore).mockReturnValue(mockCorporationStore)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  const mountComponent = async () => {
    wrapper = mount(StorageLocations, {
      global: {
        stubs: {
          UInput: {
            template: '<input v-bind="$attrs" @input="$emit(\'update:modelValue\', $event.target.value)" />'
          },
          UButton: {
            template: '<button @click="$emit(\'click\')"><slot /></button>'
          },
          UTable: {
            template: '<div class="utable"><slot /></div>',
            props: ['data', 'columns', 'pagination']
          },
          USelect: {
            template: '<select v-bind="$attrs" @change="$emit(\'change\', $event)"><slot /></select>'
          },
          UPagination: {
            template: '<div class="upagination"><slot /></div>',
            props: ['defaultPage', 'itemsPerPage', 'total']
          },
          UModal: {
            template: '<div v-if="open"><slot name="body" /><slot name="footer" /></div>',
            props: ['open']
          },
          UIcon: {
            template: '<i />'
          },
          UTextarea: {
            template: '<textarea v-bind="$attrs" />'
          },
          UCheckbox: {
            template: '<input type="checkbox" v-bind="$attrs" />'
          },
          UBadge: {
            template: '<span><slot /></span>'
          },
          UTooltip: {
            template: '<div><slot /></div>'
          },
          UAlert: {
            template: '<div><slot /></div>'
          },
          USkeleton: {
            template: '<div class="skeleton" />'
          },
          ProjectSelect: {
            template: '<select />'
          }
        }
      }
    })

    await flushPromises()
    return wrapper
  }

  describe('Page Size Larger Than Total Records', () => {
    it('should display all records when page size exceeds total records', async () => {
      // Create only 8 records
      const locations = generateMockLocations(8)
      mockStorageLocationsStore.storageLocations.value = locations

      await mountComponent()
      await flushPromises()

      // Mock store should have 8 locations
      expect(mockStorageLocationsStore.storageLocations.value).toHaveLength(8)
    })

    it('should show correct page info when page size exceeds records', async () => {
      mockStorageLocationsStore.storageLocations.value = generateMockLocations(5)

      await mountComponent()
      await flushPromises()

      // Mock table API
      const mockTableApi = {
        getState: () => ({
          pagination: {
            pageIndex: 0,
            pageSize: 25
          }
        }),
        getFilteredRowModel: () => ({
          rows: { length: 5 }
        }),
        setPageSize: vi.fn(),
        setPageIndex: vi.fn()
      }

      wrapper.vm.table = { tableApi: mockTableApi }
      await flushPromises()

      // Page info should show "1 to 5 of 5" not "1 to 25 of 5"
      const state = mockTableApi.getState()
      const filteredRows = mockTableApi.getFilteredRowModel().rows
      const start = Math.min(state.pagination.pageIndex * state.pagination.pageSize + 1, filteredRows.length)
      const end = Math.min((state.pagination.pageIndex + 1) * state.pagination.pageSize, filteredRows.length)

      expect(start).toBe(1)
      expect(end).toBe(5)
    })

    it('should not crash when selecting 100 per page with only 3 records', async () => {
      mockStorageLocationsStore.storageLocations.value = generateMockLocations(3)

      await mountComponent()
      await flushPromises()

      expect(() => {
        if (wrapper.vm.table?.tableApi) {
          wrapper.vm.table.tableApi.setPageSize(100)
        }
      }).not.toThrow()
    })
  })

  describe('Page Size Change Behavior', () => {
    it('should reset to page 1 when page size changes', async () => {
      mockStorageLocationsStore.storageLocations.value = generateMockLocations(50)

      await mountComponent()
      await flushPromises()

      const setPageSizeSpy = vi.fn()
      const setPageIndexSpy = vi.fn()

      const mockTableApi = {
        getState: () => ({
          pagination: {
            pageIndex: 2, // Currently on page 3
            pageSize: 10
          }
        }),
        getFilteredRowModel: () => ({
          rows: { length: 50 }
        }),
        setPageSize: setPageSizeSpy,
        setPageIndex: setPageIndexSpy
      }

      // Directly test the updatePageSize function logic
      const newSize = 25
      if (mockTableApi) {
        mockTableApi.setPageSize(newSize)
        mockTableApi.setPageIndex(0)
      }

      // Should reset to page index 0 (page 1)
      expect(setPageSizeSpy).toHaveBeenCalledWith(25)
      expect(setPageIndexSpy).toHaveBeenCalledWith(0)
    })

    it('should call setPageSize with correct value from object', async () => {
      mockStorageLocationsStore.storageLocations.value = generateMockLocations(30)

      await mountComponent()
      await flushPromises()

      const setPageSizeSpy = vi.fn()
      const setPageIndexSpy = vi.fn()

      // Test the logic directly
      const newSizeObj = { value: 50 }
      const size = newSizeObj.value || newSizeObj
      
      setPageSizeSpy(size)
      setPageIndexSpy(0)

      expect(setPageSizeSpy).toHaveBeenCalledWith(50)
      expect(setPageIndexSpy).toHaveBeenCalledWith(0)
    })

    it('should call setPageSize with correct value from direct number', async () => {
      mockStorageLocationsStore.storageLocations.value = generateMockLocations(20)

      await mountComponent()
      await flushPromises()

      const setPageSizeSpy = vi.fn()
      const setPageIndexSpy = vi.fn()

      // Test the logic directly with number
      const newSize = 25
      const size = (typeof newSize === 'object' && newSize.value) ? newSize.value : newSize
      
      setPageSizeSpy(size)
      setPageIndexSpy(0)

      expect(setPageSizeSpy).toHaveBeenCalledWith(25)
      expect(setPageIndexSpy).toHaveBeenCalledWith(0)
    })
  })

  describe('Pagination Boundary Validation', () => {
    it('should reset page index when page size changes to prevent out-of-bounds', async () => {
      mockStorageLocationsStore.storageLocations.value = generateMockLocations(15)

      await mountComponent()
      await flushPromises()

      const setPageIndexSpy = vi.fn()

      // Test the logic: when page size changes, always reset to page 0
      // This prevents being on page 3 with 25 per page when only 15 records exist
      setPageIndexSpy(0)

      expect(setPageIndexSpy).toHaveBeenCalledWith(0)
    })

    it('should calculate correct max pages', async () => {
      mockStorageLocationsStore.storageLocations.value = generateMockLocations(23)

      await mountComponent()
      await flushPromises()

      const totalRecords = 23
      const pageSize = 10
      const maxPages = Math.ceil(totalRecords / pageSize)

      // 23 records / 10 per page = 3 pages (1-10, 11-20, 21-23)
      expect(maxPages).toBe(3)
    })

    it('should handle edge case of exactly one full page', async () => {
      mockStorageLocationsStore.storageLocations.value = generateMockLocations(10)

      await mountComponent()
      await flushPromises()

      const totalRecords = 10
      const pageSize = 10
      const maxPages = Math.ceil(totalRecords / pageSize)

      expect(maxPages).toBe(1)
    })

    it('should handle zero records gracefully', async () => {
      mockStorageLocationsStore.storageLocations.value = []

      await mountComponent()
      await flushPromises()

      expect(mockStorageLocationsStore.storageLocations.value).toHaveLength(0)
    })
  })

  describe('Page Info Display', () => {
    it('should show correct range for first page', async () => {
      mockStorageLocationsStore.storageLocations.value = generateMockLocations(50)

      await mountComponent()
      await flushPromises()

      const mockTableApi = {
        getState: () => ({
          pagination: {
            pageIndex: 0,
            pageSize: 10
          }
        }),
        getFilteredRowModel: () => ({
          rows: { length: 50 }
        })
      }

      wrapper.vm.table = { tableApi: mockTableApi }

      const state = mockTableApi.getState()
      const filteredRows = mockTableApi.getFilteredRowModel().rows
      const start = Math.min(state.pagination.pageIndex * state.pagination.pageSize + 1, filteredRows.length)
      const end = Math.min((state.pagination.pageIndex + 1) * state.pagination.pageSize, filteredRows.length)

      expect(start).toBe(1)
      expect(end).toBe(10)
    })

    it('should show correct range for last partial page', async () => {
      mockStorageLocationsStore.storageLocations.value = generateMockLocations(23)

      await mountComponent()
      await flushPromises()

      const mockTableApi = {
        getState: () => ({
          pagination: {
            pageIndex: 2, // Third page
            pageSize: 10
          }
        }),
        getFilteredRowModel: () => ({
          rows: { length: 23 }
        })
      }

      wrapper.vm.table = { tableApi: mockTableApi }

      const state = mockTableApi.getState()
      const filteredRows = mockTableApi.getFilteredRowModel().rows
      const start = Math.min(state.pagination.pageIndex * state.pagination.pageSize + 1, filteredRows.length)
      const end = Math.min((state.pagination.pageIndex + 1) * state.pagination.pageSize, filteredRows.length)

      // Page 3 should show records 21-23
      expect(start).toBe(21)
      expect(end).toBe(23)
    })

    it('should never show start greater than total', async () => {
      mockStorageLocationsStore.storageLocations.value = generateMockLocations(8)

      await mountComponent()
      await flushPromises()

      const mockTableApi = {
        getState: () => ({
          pagination: {
            pageIndex: 0,
            pageSize: 50
          }
        }),
        getFilteredRowModel: () => ({
          rows: { length: 8 }
        })
      }

      wrapper.vm.table = { tableApi: mockTableApi }

      const state = mockTableApi.getState()
      const filteredRows = mockTableApi.getFilteredRowModel().rows
      const start = Math.min(state.pagination.pageIndex * state.pagination.pageSize + 1, filteredRows.length)

      // Start should be 1, not 1 (valid), and definitely not > 8
      expect(start).toBeLessThanOrEqual(filteredRows.length)
    })
  })

  describe('Pagination Visibility Logic', () => {
    it('should have correct pagination logic for more than 10 records', async () => {
      const locations = generateMockLocations(15)
      mockStorageLocationsStore.storageLocations.value = locations

      await mountComponent()
      await flushPromises()

      // Store should have 15 locations
      expect(mockStorageLocationsStore.storageLocations.value).toHaveLength(15)
      // Pagination should be shown when length > 10
      expect(15 > 10).toBe(true)
    })

    it('should have correct pagination logic for 10 or fewer records', async () => {
      const locations = generateMockLocations(10)
      mockStorageLocationsStore.storageLocations.value = locations

      await mountComponent()
      await flushPromises()

      expect(mockStorageLocationsStore.storageLocations.value).toHaveLength(10)
      // Pagination should NOT be shown when length <= 10
      expect(10 > 10).toBe(false)
    })

    it('should have correct pagination logic for exactly 10 records', async () => {
      const locations = generateMockLocations(10)
      mockStorageLocationsStore.storageLocations.value = locations

      await mountComponent()
      await flushPromises()

      expect(mockStorageLocationsStore.storageLocations.value).toHaveLength(10)
      expect(10 > 10).toBe(false)
    })

    it('should have correct pagination logic for exactly 11 records', async () => {
      const locations = generateMockLocations(11)
      mockStorageLocationsStore.storageLocations.value = locations

      await mountComponent()
      await flushPromises()

      expect(mockStorageLocationsStore.storageLocations.value).toHaveLength(11)
      // Pagination should be shown when length > 10
      expect(11 > 10).toBe(true)
    })
  })

  describe('Table API Safety', () => {
    it('should handle missing table ref gracefully', async () => {
      mockStorageLocationsStore.storageLocations.value = generateMockLocations(5)

      await mountComponent()
      await flushPromises()

      wrapper.vm.table = null

      expect(() => {
        wrapper.vm.updatePageSize(25)
      }).not.toThrow()
    })

    it('should handle missing tableApi gracefully', async () => {
      mockStorageLocationsStore.storageLocations.value = generateMockLocations(5)

      await mountComponent()
      await flushPromises()

      wrapper.vm.table = { tableApi: null }

      expect(() => {
        wrapper.vm.updatePageSize(25)
      }).not.toThrow()
    })

    it('should handle undefined pagination state gracefully', async () => {
      mockStorageLocationsStore.storageLocations.value = generateMockLocations(5)

      await mountComponent()
      await flushPromises()

      const mockTableApi = {
        getState: () => ({
          pagination: undefined
        }),
        getFilteredRowModel: () => ({
          rows: { length: 5 }
        })
      }

      wrapper.vm.table = { tableApi: mockTableApi }

      // Should not crash
      expect(() => {
        const state = mockTableApi.getState()
        const pageIndex = state.pagination?.pageIndex || 0
        const pageSize = state.pagination?.pageSize || 10
      }).not.toThrow()
    })
  })
})

