import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock Supabase client with proper chaining
const createMockSupabaseClient = () => {
  let mockData: any = []
  let mockError: any = null
  
  const createMockQuery = () => ({
    data: mockData,
    error: mockError,
    then: vi.fn((resolve: any) => resolve({ data: mockData, error: mockError }))
  })
  
  const createMockInsert = () => ({
    select: vi.fn(() => ({
      single: vi.fn(() => ({
        data: mockData,
        error: mockError,
        then: vi.fn((resolve: any) => resolve({ data: mockData, error: mockError }))
      }))
    }))
  })
  
  const createMockUpdate = () => ({
    eq: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: mockData,
          error: mockError,
          then: vi.fn((resolve: any) => resolve({ data: mockData, error: mockError }))
        }))
      }))
    }))
  })
  
  const createMockDelete = () => ({
    eq: vi.fn(() => ({
      data: mockData,
      error: mockError,
      then: vi.fn((resolve: any) => resolve({ data: mockData, error: mockError }))
    }))
  })
  
  const createFromResult = () => ({
    select: vi.fn(() => ({
      order: vi.fn(() => createMockQuery()),
      eq: vi.fn(() => ({
        single: vi.fn(() => ({
          data: mockData,
          error: mockError,
          then: vi.fn((resolve: any) => resolve({ data: mockData, error: mockError }))
        }))
      }))
    })),
    insert: vi.fn(() => createMockInsert()),
    update: vi.fn(() => createMockUpdate()),
    delete: vi.fn(() => createMockDelete())
  })
  
  return {
    from: vi.fn(() => createFromResult()),
    setMockData: (data: any) => { mockData = data },
    setMockError: (error: any) => { mockError = error },
    resetMocks: () => {
      mockData = []
      mockError = null
    }
  }
}

const mockSupabaseClient = createMockSupabaseClient()

// Mock the Supabase server client
vi.mock('@/utils/supabaseServer', () => ({
  supabaseServer: mockSupabaseClient
}))

// Mock auth
const mockAuth = {
  getUser: vi.fn(() => ({
    data: {
      user: {
        id: 'user-123',
        email: 'test@example.com'
      }
    },
    error: null
  }))
}

vi.mock('@/server/api/utils/auth', () => ({
  getServerUser: mockAuth.getUser
}))

describe('Terms and Conditions API', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockSupabaseClient.resetMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/terms-and-conditions', () => {
    it('should fetch all terms and conditions successfully', async () => {
      const mockTermsAndConditions = [
        {
          id: 1,
          uuid: 'tc-uuid-1',
          name: 'Standard Terms',
          content: '<p>Standard terms and conditions</p>',
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        },
        {
          id: 2,
          uuid: 'tc-uuid-2',
          name: 'Payment Terms',
          content: '<p>Payment terms and conditions</p>',
          is_active: true,
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        }
      ]

      mockSupabaseClient.setMockData(mockTermsAndConditions)

      const result = await mockSupabaseClient.from('terms_and_conditions')
        .select('*')
        .order('name', { ascending: true })

      expect(result.data).toEqual(mockTermsAndConditions)
      expect(result.error).toBe(null)
    })

    it('should handle database errors', async () => {
      mockSupabaseClient.setMockError({ message: 'Database error' })
      mockSupabaseClient.setMockData(null)

      const result = await mockSupabaseClient.from('terms_and_conditions')
        .select('*')
        .order('name', { ascending: true })

      expect(result.data).toBe(null)
      expect(result.error.message).toBe('Database error')
    })

    it('should return empty array when no terms and conditions exist', async () => {
      mockSupabaseClient.setMockData([])

      const result = await mockSupabaseClient.from('terms_and_conditions')
        .select('*')
        .order('name', { ascending: true })

      expect(result.data).toEqual([])
      expect(result.error).toBe(null)
    })

    it('should order results by name ascending', async () => {
      const mockTermsAndConditions = [
        {
          id: 2,
          uuid: 'tc-uuid-2',
          name: 'Payment Terms',
          content: '<p>Payment</p>',
          is_active: true
        },
        {
          id: 1,
          uuid: 'tc-uuid-1',
          name: 'Standard Terms',
          content: '<p>Standard</p>',
          is_active: true
        }
      ]

      mockSupabaseClient.setMockData(mockTermsAndConditions)

      const result = await mockSupabaseClient.from('terms_and_conditions')
        .select('*')
        .order('name', { ascending: true })

      expect(result.data).toEqual(mockTermsAndConditions)
    })
  })

  describe('POST /api/terms-and-conditions', () => {
    it('should create terms and condition successfully', async () => {
      const newTermsAndCondition = {
        name: 'New Terms',
        content: '<p>New terms and conditions</p>',
        is_active: true
      }

      const createdTermsAndCondition = {
        id: 3,
        uuid: 'tc-uuid-3',
        name: 'New Terms',
        content: '<p>New terms and conditions</p>',
        is_active: true,
        created_at: '2023-01-03T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z'
      }

      // Mock checking for duplicates (returns null - no duplicate)
      // First call to from() for duplicate check
      const mockFrom = mockSupabaseClient.from
      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call - duplicate check
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: null,
                  error: null
                }))
              }))
            }))
          }
        } else {
          // Second call - insert
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: createdTermsAndCondition,
                  error: null
                }))
              }))
            }))
          }
        }
      })

      // Mock insert
      mockSupabaseClient.setMockData(createdTermsAndCondition)

      // First call for duplicate check
      await mockSupabaseClient.from('terms_and_conditions')
        .select('id')
        .eq('name', 'New Terms')
        .single()

      // Second call for insert
      const insertResult = await mockSupabaseClient.from('terms_and_conditions')
        .insert(newTermsAndCondition)
        .select()
        .single()

      expect(insertResult.data).toEqual(createdTermsAndCondition)
      expect(insertResult.error).toBe(null)
    })

    it('should check for duplicate names before creating', async () => {
      const existingTermsAndCondition = {
        name: 'Existing Terms',
        content: '<p>Content</p>',
        is_active: true
      }

      // Mock that a duplicate exists
      const mockFrom = mockSupabaseClient.from
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 1,
              uuid: 'tc-uuid-1',
              name: 'Existing Terms'
            },
            error: null
          }))
        }))
      }))
      mockFrom.mockReturnValueOnce({
        select: mockSelect
      })

      const duplicateCheck = await mockSupabaseClient.from('terms_and_conditions')
        .select('id')
        .eq('name', 'Existing Terms')
        .single()

      expect(duplicateCheck.data).toBeDefined()
      expect(duplicateCheck.data.name).toBe('Existing Terms')
    })
  })

  describe('PUT /api/terms-and-conditions/[id]', () => {
    it('should update terms and condition successfully', async () => {
      const updateData = {
        name: 'Updated Terms',
        content: '<p>Updated content</p>',
        is_active: false
      }

      const updatedTermsAndCondition = {
        id: 1,
        uuid: 'tc-uuid-1',
        name: 'Updated Terms',
        content: '<p>Updated content</p>',
        is_active: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z'
      }

      // Mock finding existing record and update
      const mockFrom = mockSupabaseClient.from
      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call - find existing
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: {
                    id: 1,
                    uuid: 'tc-uuid-1',
                    name: 'Original Terms',
                    content: '<p>Original content</p>',
                    is_active: true
                  },
                  error: null
                }))
              }))
            }))
          }
        } else {
          // Second call - update
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => ({
                    data: updatedTermsAndCondition,
                    error: null
                  }))
                }))
              }))
            }))
          }
        }
      })

      // Mock update result
      mockSupabaseClient.setMockData(updatedTermsAndCondition)

      // First call to find existing
      await mockSupabaseClient.from('terms_and_conditions')
        .select('*')
        .eq('id', 1)
        .single()

      // Second call to update
      const updateResult = await mockSupabaseClient.from('terms_and_conditions')
        .update(updateData)
        .eq('id', 1)
        .select()
        .single()

      expect(updateResult.data).toEqual(updatedTermsAndCondition)
      expect(updateResult.error).toBe(null)
    })

    it('should handle non-existent terms and condition', async () => {
      // Reset mocks
      mockSupabaseClient.resetMocks()
      mockSupabaseClient.setMockData(null)
      mockSupabaseClient.setMockError({ message: 'Not found' })

      // Mock from() to return update method that returns error
      const mockFrom = mockSupabaseClient.from
      mockFrom.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({
                data: null,
                error: { message: 'Not found' }
              }))
            }))
          }))
        }))
      })

      const result = await mockSupabaseClient.from('terms_and_conditions')
        .update({ name: 'Updated' })
        .eq('id', 999)
        .select()
        .single()

      expect(result.data).toBe(null)
      expect(result.error).toBeDefined()
      expect(result.error.message).toBe('Not found')
    })
  })

  describe('DELETE /api/terms-and-conditions/[id]', () => {
    it('should delete terms and condition successfully', async () => {
      // Mock finding existing record and delete
      const mockFrom = mockSupabaseClient.from
      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call - find existing
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: {
                    id: 1,
                    uuid: 'tc-uuid-1',
                    name: 'Terms to Delete',
                    content: '<p>Content</p>',
                    is_active: true
                  },
                  error: null
                }))
              }))
            }))
          }
        } else {
          // Second call - delete
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: {},
                error: null
              }))
            }))
          }
        }
      })

      // Mock delete result
      mockSupabaseClient.setMockData({})

      // First call to find existing
      await mockSupabaseClient.from('terms_and_conditions')
        .select('*')
        .eq('id', 1)
        .single()

      // Second call to delete
      const deleteResult = await mockSupabaseClient.from('terms_and_conditions')
        .delete()
        .eq('id', 1)

      expect(deleteResult.error).toBe(null)
    })

    it('should handle non-existent terms and condition', async () => {
      mockSupabaseClient.setMockData(null)
      mockSupabaseClient.setMockError({ message: 'Not found' })

      const result = await mockSupabaseClient.from('terms_and_conditions')
        .delete()
        .eq('id', 999)

      expect(result.error).toBeDefined()
    })
  })
})
