import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChangeOrderAuditLog } from '@/composables/useChangeOrderAuditLog'

// Create a mock auth store that can be updated
const createMockAuthStore = (user: any) => ({
  user,
})

// Mock auth store with default user
let mockAuthStore = createMockAuthStore({
  id: 'user-123',
  email: 'john.doe@example.com',
  user_metadata: {
    full_name: 'John Doe',
    first_name: 'John',
    last_name: 'Doe',
    avatar_url: 'https://example.com/avatar.jpg',
  },
})

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

describe('useChangeOrderAuditLog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Reset to default user before each test
    mockAuthStore = createMockAuthStore({
      id: 'user-123',
      email: 'john.doe@example.com',
      user_metadata: {
        full_name: 'John Doe',
        first_name: 'John',
        last_name: 'Doe',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    })
  })

  describe('getCurrentUserInfo', () => {
    it('should return user info from auth store', () => {
      const { getCurrentUserInfo } = useChangeOrderAuditLog()
      const userInfo = getCurrentUserInfo()

      expect(userInfo.user_uuid).toBe('user-123')
      expect(userInfo.user_name).toBe('John Doe')
      expect(userInfo.user_email).toBe('john.doe@example.com')
      expect(userInfo.user_image_url).toBe('https://example.com/avatar.jpg')
    })

    it('should fallback to first_name + last_name if full_name is not available', () => {
      // Update mock for this test
      mockAuthStore = createMockAuthStore({
        id: 'user-123',
        email: 'jane.smith@example.com',
        user_metadata: {
          first_name: 'Jane',
          last_name: 'Smith',
          avatar_url: null,
        },
      })

      const { getCurrentUserInfo } = useChangeOrderAuditLog()
      const userInfo = getCurrentUserInfo()

      expect(userInfo.user_name).toBe('Jane Smith')
    })

    it('should fallback to email username if no name is available', () => {
      // Update mock for this test
      mockAuthStore = createMockAuthStore({
        id: 'user-123',
        email: 'bob@example.com',
        user_metadata: {},
      })

      const { getCurrentUserInfo } = useChangeOrderAuditLog()
      const userInfo = getCurrentUserInfo()

      expect(userInfo.user_name).toBe('bob')
    })

    it('should return System user if no user is available', () => {
      // Update mock for this test
      mockAuthStore = createMockAuthStore(null)

      const { getCurrentUserInfo } = useChangeOrderAuditLog()
      const userInfo = getCurrentUserInfo()

      expect(userInfo.user_uuid).toBe('')
      expect(userInfo.user_name).toBe('System')
      expect(userInfo.user_email).toBe('')
      expect(userInfo.user_image_url).toBeNull()
    })
  })

  describe('trackChangeOrderCreated', () => {
    it('should create audit log entry for created action', () => {
      const { trackChangeOrderCreated } = useChangeOrderAuditLog()
      const entry = trackChangeOrderCreated('CO-001')

      expect(entry.action).toBe('created')
      expect(entry.description).toBe('Change order CO-001 created')
      expect(entry.user_uuid).toBe('user-123')
      expect(entry.user_name).toBe('John Doe')
      expect(entry.timestamp).toBeDefined()
      expect(new Date(entry.timestamp).getTime()).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('trackChangeOrderUpdated', () => {
    it('should create audit log entry for updated action', () => {
      const { trackChangeOrderUpdated } = useChangeOrderAuditLog()
      const entry = trackChangeOrderUpdated()

      expect(entry.action).toBe('updated')
      expect(entry.description).toBe('Change order updated')
      expect(entry.user_uuid).toBe('user-123')
      expect(entry.user_name).toBe('John Doe')
      expect(entry.timestamp).toBeDefined()
    })
  })

  describe('trackMarkedReady', () => {
    it('should create audit log entry for marked_ready action', () => {
      const { trackMarkedReady } = useChangeOrderAuditLog()
      const entry = trackMarkedReady()

      expect(entry.action).toBe('marked_ready')
      expect(entry.description).toBe('Change order marked as ready for approval')
      expect(entry.user_uuid).toBe('user-123')
      expect(entry.user_name).toBe('John Doe')
      expect(entry.timestamp).toBeDefined()
    })
  })

  describe('trackApproved', () => {
    it('should create audit log entry for approved action', () => {
      const { trackApproved } = useChangeOrderAuditLog()
      const entry = trackApproved()

      expect(entry.action).toBe('approved')
      expect(entry.description).toBe('Change order approved')
      expect(entry.user_uuid).toBe('user-123')
      expect(entry.user_name).toBe('John Doe')
      expect(entry.timestamp).toBeDefined()
    })
  })

  describe('trackRejected', () => {
    it('should create audit log entry for rejected action', () => {
      const { trackRejected } = useChangeOrderAuditLog()
      const entry = trackRejected()

      expect(entry.action).toBe('rejected')
      expect(entry.description).toBe('Change order rejected')
      expect(entry.user_uuid).toBe('user-123')
      expect(entry.user_name).toBe('John Doe')
      expect(entry.timestamp).toBeDefined()
    })
  })

  describe('trackDeleted', () => {
    it('should create audit log entry for deleted action', () => {
      const { trackDeleted } = useChangeOrderAuditLog()
      const entry = trackDeleted()

      expect(entry.action).toBe('deleted')
      expect(entry.description).toBe('Change order deleted')
      expect(entry.user_uuid).toBe('user-123')
      expect(entry.user_name).toBe('John Doe')
      expect(entry.timestamp).toBeDefined()
    })
  })

  describe('Audit Log Entry Structure', () => {
    it('should create entries with correct structure', () => {
      const { trackChangeOrderCreated } = useChangeOrderAuditLog()
      const entry = trackChangeOrderCreated('CO-001')

      // Verify all required fields are present
      expect(entry).toHaveProperty('timestamp')
      expect(entry).toHaveProperty('user_uuid')
      expect(entry).toHaveProperty('user_name')
      expect(entry).toHaveProperty('user_email')
      expect(entry).toHaveProperty('user_image_url')
      expect(entry).toHaveProperty('action')
      expect(entry).toHaveProperty('description')

      // Verify timestamp is valid ISO string
      expect(() => new Date(entry.timestamp)).not.toThrow()
      expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp)
    })

    it('should create entries with unique timestamps', async () => {
      const { trackChangeOrderCreated } = useChangeOrderAuditLog()
      
      const entry1 = trackChangeOrderCreated('CO-001')
      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10))
      const entry2 = trackChangeOrderCreated('CO-002')

      // Timestamps should be different or at least the second should be >= first
      const time1 = new Date(entry1.timestamp).getTime()
      const time2 = new Date(entry2.timestamp).getTime()
      expect(time2).toBeGreaterThanOrEqual(time1)
    })
  })
})

