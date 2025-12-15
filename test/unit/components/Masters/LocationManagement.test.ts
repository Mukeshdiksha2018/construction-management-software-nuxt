import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/stores/locations', () => {
  const state = {
    loading: false,
    error: null,
    getAll: [] as any[],
    fetchLocations: vi.fn(async () => {}),
    createLocation: vi.fn(async () => {}),
    updateLocation: vi.fn(async () => {}),
    deleteLocation: vi.fn(async () => {})
  }
  return { useLocationsStore: () => state }
})

const UInput = { template: '<input />', props: ['modelValue'] }
const UButton = { template: '<button />' }
const UTable = { template: '<table />', props: ['data', 'columns'] }
const UModal = { template: '<div><slot name="body"/><slot name="footer"/></div>', props: ['open'] }
const UBadge = { template: '<span />' }
const UTooltip = { template: '<div><slot /></div>' }
const UTextarea = { template: '<textarea />' }
const UToggle = { template: '<input type="checkbox" />' }
const USkeleton = { template: '<div />' }

describe('LocationManagement.vue', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('mounts and triggers initial fetch', async () => {
    const { useLocationsStore } = await import('@/stores/locations')
    const store: any = useLocationsStore()
    const cmp = await import('@/components/Masters/LocationManagement.vue')
    mount(cmp.default, { global: { stubs: { UInput, UButton, UTable, UModal, UBadge, UTooltip, UTextarea, UToggle, USkeleton } } })
    expect(store.fetchLocations).toHaveBeenCalled()
  })
})


