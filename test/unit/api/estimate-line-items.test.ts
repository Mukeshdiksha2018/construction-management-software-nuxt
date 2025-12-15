import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

const mockDefineEventHandler = vi.fn()
const mockGetQuery = vi.fn()
const mockCreateError = vi.fn()

vi.stubGlobal('defineEventHandler', mockDefineEventHandler)
vi.stubGlobal('getQuery', mockGetQuery)
vi.stubGlobal('createError', mockCreateError)

const createSupabaseQueryBuilder = (result: { data: any; error: any }) => {
  const builder: any = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.order = vi.fn(() => Promise.resolve(result))
  return builder
}

const mockSupabaseServer = {
  from: vi.fn()
}

vi.mock('../../../utils/supabaseServer', () => ({
  supabaseServer: mockSupabaseServer
}))

describe('GET /api/estimate-line-items', () => {
  const mockEvent = {
    node: {
      req: {
        method: 'GET'
      }
    }
  } as any

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    mockDefineEventHandler.mockImplementation((handler) => handler)
    mockCreateError.mockImplementation((options) => {
      const error = new Error(options.statusMessage)
      ;(error as any).statusCode = options.statusCode
      return error
    })
    mockGetQuery.mockReturnValue({
      project_uuid: 'proj-1',
      estimate_uuid: 'est-1',
      corporation_uuid: 'corp-1'
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns normalized estimate line items', async () => {
    const queryBuilder = createSupabaseQueryBuilder({
      data: [
        {
          id: 1,
          cost_code_uuid: 'cc-1',
          cost_code_number: '033000',
          cost_code_name: 'Cast-in-Place Concrete',
          division_name: 'Concrete',
          description: 'Concrete work description',
          labor_amount: 5000.50,
          material_amount: 10000.00,
          total_amount: 15000.50,
          material_items: { invalid: 'structure' }
        }
      ],
      error: null
    })
    mockSupabaseServer.from.mockReturnValue(queryBuilder)

    const { default: handler } = await import('../../../server/api/estimate-line-items/index')

    const response = await handler(mockEvent)

    expect(mockSupabaseServer.from).toHaveBeenCalledWith('estimate_line_items')
    expect(queryBuilder.select).toHaveBeenCalledWith(
      'id, cost_code_uuid, cost_code_number, cost_code_name, division_name, material_items, labor_amount, material_amount, total_amount, description'
    )
    expect(queryBuilder.eq).toHaveBeenCalledTimes(3)
    expect(queryBuilder.order).toHaveBeenCalledWith('id', { ascending: true })
    expect(response).toEqual({
      data: [
        {
          id: 1,
          cost_code_uuid: 'cc-1',
          cost_code_number: '033000',
          cost_code_name: 'Cast-in-Place Concrete',
          division_name: 'Concrete',
          description: 'Concrete work description',
          labor_amount: 5000.50,
          material_amount: 10000.00,
          total_amount: 15000.50,
          material_items: []
        }
      ]
    })
  })

  it('throws 400 when required query params are missing', async () => {
    mockGetQuery.mockReturnValue({})

    const { default: handler } = await import('../../../server/api/estimate-line-items/index')

    await expect(handler(mockEvent)).rejects.toThrow(
      'project_uuid, estimate_uuid, and corporation_uuid are required'
    )
    expect(mockCreateError).toHaveBeenCalledWith({
      statusCode: 400,
      statusMessage: 'project_uuid, estimate_uuid, and corporation_uuid are required'
    })
  })

  it('throws 405 for unsupported methods', async () => {
    const { default: handler } = await import('../../../server/api/estimate-line-items/index')
    mockEvent.node.req.method = 'POST'

    await expect(handler(mockEvent)).rejects.toThrow('Method not allowed')
    expect(mockCreateError).toHaveBeenCalledWith({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })

    mockEvent.node.req.method = 'GET' // reset for other tests
  })

  it('propagates Supabase errors as 500', async () => {
    const queryBuilder = createSupabaseQueryBuilder({
      data: null,
      error: { message: 'database exploded' }
    })
    mockSupabaseServer.from.mockReturnValue(queryBuilder)

    const { default: handler } = await import('../../../server/api/estimate-line-items/index')

    await expect(handler(mockEvent)).rejects.toThrow('database exploded')
    expect(mockCreateError).toHaveBeenCalledWith({
      statusCode: 500,
      statusMessage: 'database exploded'
    })
  })
})


