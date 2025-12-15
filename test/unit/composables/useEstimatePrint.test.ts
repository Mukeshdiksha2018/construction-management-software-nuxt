import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useEstimatePrint } from '@/composables/useEstimatePrint'

// Mock vue-router to control resolve()
const mockResolve = vi.fn((to: any) => ({ href: typeof to === 'string' ? to : '/resolved' }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ resolve: mockResolve })
}))

describe('useEstimatePrint', () => {
  const originalOpen = window.open
  let openSpy: any

  beforeEach(() => {
    openSpy = vi.fn()
    // @ts-expect-error override for test
    window.open = openSpy
    mockResolve.mockClear()
  })

  afterEach(() => {
    // @ts-expect-error restore
    window.open = originalOpen
  })

  it('opens print route in new tab using router.resolve with id string', () => {
    const { openEstimatePrint } = useEstimatePrint()
    openEstimatePrint('abc-123')
    expect(mockResolve).toHaveBeenCalledWith('/estimates/print/abc-123')
    expect(openSpy).toHaveBeenCalledWith('/estimates/print/abc-123', '_blank')
  })

  it('opens print route in new tab when given estimate object', () => {
    const { openEstimatePrint } = useEstimatePrint()
    openEstimatePrint({ uuid: 'est-9' })
    expect(mockResolve).toHaveBeenCalledWith('/estimates/print/est-9')
    expect(openSpy).toHaveBeenCalledWith('/estimates/print/est-9', '_blank')
  })

  it('does nothing if no id is provided', () => {
    const { openEstimatePrint } = useEstimatePrint()
    // @ts-expect-error intentionally missing id
    openEstimatePrint({})
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('falls back to raw URL if router.resolve throws', () => {
    mockResolve.mockImplementationOnce(() => { throw new Error('resolve failed') })
    const { openEstimatePrint } = useEstimatePrint()
    openEstimatePrint('x1')
    expect(openSpy).toHaveBeenCalledWith('/estimates/print/x1', '_blank')
  })
})


