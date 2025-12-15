import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn()
}))

// Mock H3 utilities
const mockSendRedirect = vi.fn()
const mockSetCookie = vi.fn()
const mockGetRequestURL = vi.fn()

vi.mock('h3', () => ({
  sendRedirect: (...args: any[]) => mockSendRedirect(...args),
  setCookie: (...args: any[]) => mockSetCookie(...args),
  getRequestURL: (...args: any[]) => mockGetRequestURL(...args),
  readBody: vi.fn(),
}))

// Mock Nuxt runtime config
const mockRuntimeConfig = {
  public: {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key'
  },
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}

// Mock defineEventHandler globally
global.defineEventHandler = ((handler: any) => handler) as any
global.useRuntimeConfig = (() => mockRuntimeConfig) as any
global.getRequestURL = ((...args: any[]) => mockGetRequestURL(...args)) as any
global.sendRedirect = ((...args: any[]) => mockSendRedirect(...args)) as any
global.setCookie = ((...args: any[]) => mockSetCookie(...args)) as any

vi.mock('#imports', () => ({
  defineEventHandler: (handler: any) => handler,
  useRuntimeConfig: () => mockRuntimeConfig,
  getRequestURL: (...args: any[]) => mockGetRequestURL(...args),
  sendRedirect: (...args: any[]) => mockSendRedirect(...args),
  setCookie: (...args: any[]) => mockSetCookie(...args),
}))

describe('Auth Callback API', () => {
  let mockSupabaseClient: any
  let callbackHandler: any
  
  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Setup mock Supabase client
    mockSupabaseClient = {
      auth: {
        exchangeCodeForSession: vi.fn()
      }
    }
    
    vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any)
    
    // Reset mocks
    mockSendRedirect.mockResolvedValue(undefined)
    mockSetCookie.mockReturnValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful Invitation Flow', () => {
    it('should exchange code for session and redirect to signup with tokens in hash', async () => {
      // Mock successful session exchange
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        user: {
          id: 'test-user-id',
          email: 'test@example.com'
        }
      }

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      // Mock request URL with code
      mockGetRequestURL.mockReturnValue({
        searchParams: {
          get: (param: string) => {
            if (param === 'code') return 'test-invite-code'
            if (param === 'next') return '/auth/signup'
            return null
          }
        }
      })

      // Import and call the handler
      const callbackModule = await import('../../../server/api/auth/callback')
      const mockEvent = {
        node: { req: { method: 'GET' } }
      }

      await callbackModule.default(mockEvent as any)

      // Verify session was exchanged
      expect(mockSupabaseClient.auth.exchangeCodeForSession).toHaveBeenCalledWith('test-invite-code')

      // Verify cookies were set
      expect(mockSetCookie).toHaveBeenCalledWith(
        mockEvent,
        'sb-access-token',
        mockSession.access_token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax'
        })
      )

      expect(mockSetCookie).toHaveBeenCalledWith(
        mockEvent,
        'sb-refresh-token',
        mockSession.refresh_token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax'
        })
      )

      // Verify redirect includes tokens in hash
      expect(mockSendRedirect).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining('/auth/signup#access_token=test-access-token')
      )
      expect(mockSendRedirect).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining('refresh_token=test-refresh-token')
      )
      expect(mockSendRedirect).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining('type=invite')
      )
      expect(mockSendRedirect).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining('user_id=test-user-id')
      )
    })

    it('should use default redirect path when next param is not provided', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        user: { id: 'test-user-id', email: 'test@example.com' }
      }

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      mockGetRequestURL.mockReturnValue({
        searchParams: {
          get: (param: string) => param === 'code' ? 'test-code' : null
        }
      })

      const callbackModule = await import('../../../server/api/auth/callback')
      const mockEvent = { node: { req: { method: 'GET' } } }

      await callbackModule.default(mockEvent as any)

      expect(mockSendRedirect).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining('/auth/signup#')
      )
    })
  })

  describe('Error Handling', () => {
    it('should redirect to signup with error when no code is provided', async () => {
      mockGetRequestURL.mockReturnValue({
        searchParams: {
          get: (param: string) => param === 'next' ? '/auth/signup' : null
        }
      })

      const callbackModule = await import('../../../server/api/auth/callback')
      const mockEvent = { node: { req: { method: 'GET' } } }

      await callbackModule.default(mockEvent as any)

      expect(mockSendRedirect).toHaveBeenCalledWith(
        mockEvent,
        '/auth/signup?error=Invalid invitation link'
      )
      expect(mockSupabaseClient.auth.exchangeCodeForSession).not.toHaveBeenCalled()
    })

    it('should redirect with error when session exchange fails', async () => {
      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid code' }
      })

      mockGetRequestURL.mockReturnValue({
        searchParams: {
          get: (param: string) => {
            if (param === 'code') return 'invalid-code'
            if (param === 'next') return '/auth/signup'
            return null
          }
        }
      })

      const callbackModule = await import('../../../server/api/auth/callback')
      const mockEvent = { node: { req: { method: 'GET' } } }

      await callbackModule.default(mockEvent as any)

      expect(mockSendRedirect).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining('/auth/signup?error=')
      )
      expect(mockSendRedirect).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining('Invalid%20code')
      )
    })

    it('should handle method not allowed', async () => {
      const callbackModule = await import('../../../server/api/auth/callback')
      const mockEvent = { node: { req: { method: 'POST' } } }

      const result = await callbackModule.default(mockEvent as any)

      expect(result).toEqual({ error: 'Method not allowed' })
      expect(mockSupabaseClient.auth.exchangeCodeForSession).not.toHaveBeenCalled()
    })

    it('should handle exceptions gracefully', async () => {
      mockSupabaseClient.auth.exchangeCodeForSession.mockRejectedValue(
        new Error('Network error')
      )

      mockGetRequestURL.mockReturnValue({
        searchParams: {
          get: (param: string) => param === 'code' ? 'test-code' : null
        }
      })

      const callbackModule = await import('../../../server/api/auth/callback')
      const mockEvent = { node: { req: { method: 'GET' } } }

      await callbackModule.default(mockEvent as any)

      expect(mockSendRedirect).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining('/auth/signup?error=')
      )
      expect(mockSendRedirect).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining('An%20error%20occurred')
      )
    })
  })

  describe('Cookie Settings', () => {
    it('should set secure cookies in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        user: { id: 'test-user-id', email: 'test@example.com' }
      }

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      mockGetRequestURL.mockReturnValue({
        searchParams: {
          get: (param: string) => param === 'code' ? 'test-code' : null
        }
      })

      const callbackModule = await import('../../../server/api/auth/callback')
      const mockEvent = { node: { req: { method: 'GET' } } }

      await callbackModule.default(mockEvent as any)

      expect(mockSetCookie).toHaveBeenCalledWith(
        mockEvent,
        'sb-access-token',
        mockSession.access_token,
        expect.objectContaining({
          secure: true
        })
      )

      process.env.NODE_ENV = originalEnv
    })

    it('should set non-secure cookies in development', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        user: { id: 'test-user-id', email: 'test@example.com' }
      }

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      mockGetRequestURL.mockReturnValue({
        searchParams: {
          get: (param: string) => param === 'code' ? 'test-code' : null
        }
      })

      const callbackModule = await import('../../../server/api/auth/callback')
      const mockEvent = { node: { req: { method: 'GET' } } }

      await callbackModule.default(mockEvent as any)

      expect(mockSetCookie).toHaveBeenCalledWith(
        mockEvent,
        'sb-access-token',
        mockSession.access_token,
        expect.objectContaining({
          secure: false
        })
      )

      process.env.NODE_ENV = originalEnv
    })
  })
})

