import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defu } from 'defu'
import { createEvent } from 'h3'

const supabaseMock = vi.hoisted(() => {
  const select = vi.fn()
  const insert = vi.fn()
  const queryBuilder = {
    select,
    insert,
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  }

  return {
    select,
    insert,
    from: vi.fn().mockReturnValue(queryBuilder),
    qb: queryBuilder,
  }
})

vi.mock('@/utils/supabaseServer', () => ({
  supabaseServer: {
    from: supabaseMock.from,
  },
}))

const readBodyStub = vi.hoisted(() => vi.fn(async (event: any) => {
  const raw = event.__body
  return raw ? JSON.parse(raw) : undefined
}))

vi.stubGlobal('defineEventHandler', (handler: any) => handler)
vi.stubGlobal('getQuery', (event: any) => event.__query ?? {})
vi.stubGlobal('readBody', readBodyStub)
vi.stubGlobal('createError', (payload: any = {}) => {
  const error = new Error(payload.statusMessage ?? 'Unknown Error')
  ;(error as any).statusCode = payload.statusCode ?? 500
  return error
})

const buildEvent = (url: string, options?: { method?: string; body?: any }) => {
  const request = new Request(url, {
    method: options?.method ?? 'GET',
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  const urlObj = new URL(url)
  const query: Record<string, string> = {}
  urlObj.searchParams.forEach((value, key) => {
    query[key] = value
  })

  return defu(createEvent('node', request as any), {
    node: {
      req: {
        method: options?.method ?? 'GET',
      },
    },
    __query: query,
    __body: options?.body ? JSON.stringify(options.body) : undefined,
  })
}

describe('server/api/bill-entries/index.ts', () => {
  const corporationUuid = 'corp-1'
  const dateRange = {
    start: '2025-01-01T00:00:00.000Z',
    end: '2025-12-31T23:59:59.999Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    readBodyStub.mockClear()
  })

  afterEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    vi.stubGlobal('defineEventHandler', (handler: any) => handler)
    vi.stubGlobal('getQuery', (event: any) => event.__query ?? {})
    vi.stubGlobal('readBody', readBodyStub)
    vi.stubGlobal('createError', (payload: any = {}) => {
      const error = new Error(payload.statusMessage ?? 'Unknown Error')
      ;(error as any).statusCode = payload.statusCode ?? 500
      return error
    })
  })

  it('returns bill entries and joined lines with account_type', async () => {
    supabaseMock.select.mockResolvedValueOnce({
      data: [
        {
          id: 'bill-1',
          amount: 100,
          bill_entry_lines: [
            {
              id: 1,
              account_uuid: 'acct-1',
              chart_of_accounts: {
                uuid: 'acct-1',
                account_type: 'Expense',
                sub_category: 'Utilities',
              },
            },
          ],
        },
      ],
      error: null,
    })

    const { default: handler } = await import('../../../server/api/bill-entries/index')
    const event = buildEvent(
      `http://localhost/api/bill-entries?corporation_uuid=${corporationUuid}&start_date=${dateRange.start}&end_date=${dateRange.end}`,
      { method: 'GET' },
    )

    try {
      await handler(event)
    } catch (error) {
      // ignore
    }

    expect(supabaseMock.from).toHaveBeenCalledWith('bill_entries')
    const joinArgs = supabaseMock.select.mock.calls[0][0] as string
    expect(joinArgs).toContain('chart_of_accounts(')
    expect(joinArgs).toContain('account_type')
    expect(joinArgs).not.toMatch(/\bcategory\b/)
  })

  it('creates bill entry and returns joined record without selecting category', async () => {
    supabaseMock.insert
      .mockReturnValueOnce({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: { id: 'bill-2', amount: 200 },
              error: null,
            }),
        }),
      })
      .mockReturnValueOnce({
        select: () => Promise.resolve({ data: [], error: null }),
      })

    supabaseMock.select
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: {
          id: 'bill-2',
          amount: 200,
          bill_entry_lines: [
            {
              id: 2,
              account_uuid: 'acct-2',
              chart_of_accounts: {
                uuid: 'acct-2',
                account_type: 'Expense',
                sub_category: 'Supplies',
              },
            },
          ],
        },
        error: null,
      })

    const payload = {
      type: 'Bill',
      books_date: new Date().toISOString(),
      bill_date: new Date().toISOString(),
      corporation_uuid: corporationUuid,
      pay_method: 'CHECK',
      amount: 200,
      payee_name: 'Vendor',
      line_items: [
        {
          account_uuid: 'acct-2',
          amount: 200,
          description: 'Supplies',
        },
      ],
      attachments: [],
    }

    const { default: handler } = await import('../../../server/api/bill-entries/index')
    const event = buildEvent('http://localhost/api/bill-entries', {
      method: 'POST',
      body: payload,
    })

    try {
      await handler(event)
    } catch (error) {
      // ignore
    }

    expect(supabaseMock.insert).toHaveBeenCalled()
    const joinArgs = supabaseMock.select.mock.calls[supabaseMock.select.mock.calls.length - 1][0]
    expect(joinArgs).toContain('account_type')
    expect(joinArgs).not.toMatch(/\bcategory\b/)
  })
})

