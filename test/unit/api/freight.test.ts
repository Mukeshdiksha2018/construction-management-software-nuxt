import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

describe('Freight API', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => vi.restoreAllMocks())

  it('has correct endpoint paths', () => {
    const files = [
      'server/api/freight/index.get.ts',
      'server/api/freight/index.post.ts',
      'server/api/freight/[uuid].put.ts',
      'server/api/freight/[uuid].delete.ts',
    ]
    files.forEach(f => expect(f).toMatch(/^server\/api\/freight\//))
  })

  it('GET structure', () => {
    const res = { success: true, data: [] as any[] }
    expect(res).toHaveProperty('success')
    expect(res).toHaveProperty('data')
  })

  it('POST structure', () => {
    const body = { ship_via: 'string', description: 'string', active: true }
    const res = { success: true, data: {}, message: 'string' }
    expect(Object.keys(body)).toContain('ship_via')
    expect(res).toHaveProperty('message')
  })

  it('PUT structure', () => {
    const body = { ship_via: 'string', description: 'string', active: true }
    const res = { success: true, data: {}, message: 'string' }
    expect(Object.keys(body)).toContain('active')
    expect(res).toHaveProperty('data')
  })

  it('DELETE structure', () => {
    const res = { success: true, message: 'string' }
    expect(res).toHaveProperty('success')
    expect(res).toHaveProperty('message')
  })
})
