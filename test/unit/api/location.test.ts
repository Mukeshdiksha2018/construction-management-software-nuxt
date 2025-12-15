import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/supabaseServer', () => {
  return {
    supabaseServer: {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null })
    }
  }
})

describe('api/location endpoints', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('GET: structure compiles', async () => {
    const mod = await import('@/server/api/location/index.get')
    expect(typeof mod.default).toBe('function')
  })

  it('POST: structure compiles', async () => {
    const mod = await import('@/server/api/location/index.post')
    expect(typeof mod.default).toBe('function')
  })

  it('PUT: structure compiles', async () => {
    const mod = await import('@/server/api/location/[uuid].put')
    expect(typeof mod.default).toBe('function')
  })

  it('DELETE: structure compiles', async () => {
    const mod = await import('@/server/api/location/[uuid].delete')
    expect(typeof mod.default).toBe('function')
  })
})


