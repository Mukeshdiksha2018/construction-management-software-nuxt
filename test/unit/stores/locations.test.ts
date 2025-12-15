import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLocationsStore } from '@/stores/locations'

vi.mock('@/utils/indexedDb', () => {
  return {
    dbHelpers: {
      saveLocations: vi.fn(async () => {}),
      getLocations: vi.fn(async () => []),
      addLocation: vi.fn(async () => {}),
      updateLocation: vi.fn(async () => {}),
      deleteLocation: vi.fn(async () => {}),
    }
  }
})

const { dbHelpers } = await import('@/utils/indexedDb')

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('locations store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFetch.mockReset()
  })

  it('initial state', () => {
    const store = useLocationsStore()
    expect(store.locations).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchLocations from API on force', async () => {
    const store = useLocationsStore()
    const data = [{ uuid: 'u1', location_name: 'Main', address_line1: 'a', city: 'c', state: 's', zip: 'z', country: 'US', active: true }]
    mockFetch.mockResolvedValueOnce({ success: true, data })
    await store.fetchLocations(true)
    expect(mockFetch).toHaveBeenCalledWith('/api/location', { method: 'GET' })
    expect(store.locations).toEqual(data)
  })

  it('hydrates from IndexedDB cache when available', async () => {
    const store = useLocationsStore()
    const cached = [{ uuid: 'cached', location_name: 'Cached', address_line1: 'a', city: 'c', state: 's', zip: 'z', country: 'US', active: true }]
    ;(dbHelpers.getLocations as any).mockResolvedValueOnce(cached)
    await store.fetchLocations(false)
    expect(mockFetch).not.toHaveBeenCalled()
    expect(store.locations).toEqual(cached)
  })

  it('createLocation updates state and calls API', async () => {
    const store = useLocationsStore()
    const payload = { location_name: 'A', address_line1: 'a', city: 'c', state: 's', zip: 'z', country: 'US', active: true }
    const created = { uuid: 'u2', ...payload }
    mockFetch.mockResolvedValueOnce({ success: true, data: created })
    await store.createLocation(payload as any)
    expect(mockFetch).toHaveBeenCalledWith('/api/location', { method: 'POST', body: payload })
    expect(store.locations[0]).toEqual(created)
    expect(dbHelpers.addLocation).toHaveBeenCalledWith(created)
  })

  it('updateLocation updates state and calls API', async () => {
    const store = useLocationsStore()
    store.locations = [{ uuid: 'u3', location_name: 'Old', address_line1: 'a', city: 'c', state: 's', zip: 'z', country: 'US', active: true } as any]
    const updated = { location_name: 'New' }
    const apiResp = { uuid: 'u3', location_name: 'New', address_line1: 'a', city: 'c', state: 's', zip: 'z', country: 'US', active: true }
    mockFetch.mockResolvedValueOnce({ success: true, data: apiResp })
    await store.updateLocation('u3', updated as any)
    expect(mockFetch).toHaveBeenCalledWith('/api/location/u3', { method: 'PUT', body: updated })
    expect(store.locations[0].location_name).toBe('New')
    expect(dbHelpers.updateLocation).toHaveBeenCalledWith(apiResp)
  })

  it('deleteLocation updates state and calls API', async () => {
    const store = useLocationsStore()
    store.locations = [
      { uuid: 'd1', location_name: 'X', address_line1: 'a', city: 'c', state: 's', zip: 'z', country: 'US', active: true } as any,
      { uuid: 'd2', location_name: 'Y', address_line1: 'a', city: 'c', state: 's', zip: 'z', country: 'US', active: true } as any,
    ]
    mockFetch.mockResolvedValueOnce({ success: true })
    await store.deleteLocation('d1')
    expect(mockFetch).toHaveBeenCalledWith('/api/location/d1', { method: 'DELETE' })
    expect(store.locations.map(l => l.uuid)).toEqual(['d2'])
    expect(dbHelpers.deleteLocation).toHaveBeenCalledWith('d1')
  })
})


