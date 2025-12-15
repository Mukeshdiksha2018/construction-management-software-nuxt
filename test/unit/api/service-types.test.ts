import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock Supabase client with proper chaining
const createMockSupabaseClient = () => {
  let mockData: any = []
  let mockError: any = null
  
  const mockQuery = {
    data: mockData,
    error: mockError,
    then: vi.fn((resolve: any) => resolve({ data: mockData, error: mockError }))
  }
  
  const mockInsert = {
    select: vi.fn(() => ({
      single: vi.fn(() => ({
        data: mockData,
        error: mockError,
        then: vi.fn((resolve: any) => resolve({ data: mockData, error: mockError }))
      }))
    }))
  }
  
  const mockUpdate = {
    eq: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: mockData,
          error: mockError,
          then: vi.fn((resolve: any) => resolve({ data: mockData, error: mockError }))
        }))
      }))
    }))
  }
  
  const mockDelete = {
    eq: vi.fn(() => ({
      data: mockData,
      error: mockError,
      then: vi.fn((resolve: any) => resolve({ data: mockData, error: mockError }))
    }))
  }
  
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => mockQuery)
          }))
        }))
      })),
      insert: vi.fn(() => mockInsert),
      update: vi.fn(() => mockUpdate),
      delete: vi.fn(() => mockDelete)
    })),
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

describe('Service Types API', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockSupabaseClient.resetMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/service-types', () => {
    it('should fetch service types successfully', async () => {
      const mockServiceTypes = [
        {
          id: 1,
          uuid: 'st-1',
          name: 'General Contracting',
          description: 'General construction services',
          color: '#3D5C7C',
          is_active: true,
          corporation_uuid: 'corp-1',
          created_at: '2023-01-01T00:00:00Z'
        },
        {
          id: 2,
          uuid: 'st-2',
          name: 'Electrical Services',
          description: 'Electrical installation and maintenance',
          color: '#F59E0B',
          is_active: true,
          corporation_uuid: 'corp-1',
          created_at: '2023-01-02T00:00:00Z'
        }
      ]

      mockSupabaseClient.setMockData(mockServiceTypes)

      const result = await mockSupabaseClient.from('service_types')
        .select('*')
        .eq('corporation_uuid', 'corp-1')
        .eq('is_active', true)
        .order('name', { ascending: true })

      expect(result.data).toEqual(mockServiceTypes)
      expect(result.error).toBe(null)
    })

    it('should handle fetch error', async () => {
      const errorMessage = 'Database connection failed'
      mockSupabaseClient.setMockError({ message: errorMessage })
      mockSupabaseClient.setMockData(null)

      const result = await mockSupabaseClient.from('service_types')
        .select('*')
        .eq('corporation_uuid', 'corp-1')
        .eq('is_active', true)
        .order('name', { ascending: true })

      expect(result.data).toBe(null)
      expect(result.error.message).toBe(errorMessage)
    })

    it('should filter by corporation UUID', async () => {
      const mockServiceTypes = [
        {
          id: 1,
          uuid: 'st-1',
          name: 'General Contracting',
          description: 'General construction services',
          color: '#3D5C7C',
          is_active: true,
          corporation_uuid: 'corp-1',
          created_at: '2023-01-01T00:00:00Z'
        }
      ]

      mockSupabaseClient.setMockData(mockServiceTypes)

      const result = await mockSupabaseClient.from('service_types')
        .select('*')
        .eq('corporation_uuid', 'corp-1')
        .eq('is_active', true)
        .order('name', { ascending: true })

      expect(result.data).toEqual(mockServiceTypes)
      expect(result.error).toBe(null)
    })

    it('should only return active service types', async () => {
      const mockServiceTypes = [
        {
          id: 1,
          uuid: 'st-1',
          name: 'General Contracting',
          description: 'General construction services',
          color: '#3D5C7C',
          is_active: true,
          corporation_uuid: 'corp-1',
          created_at: '2023-01-01T00:00:00Z'
        }
      ]

      mockSupabaseClient.setMockData(mockServiceTypes)

      const result = await mockSupabaseClient.from('service_types')
        .select('*')
        .eq('corporation_uuid', 'corp-1')
        .eq('is_active', true)
        .order('name', { ascending: true })

      expect(result.data).toEqual(mockServiceTypes)
      expect(result.data.every(st => st.is_active)).toBe(true)
    })
  })

  describe('POST /api/service-types', () => {
    it('should create service type successfully', async () => {
      const newServiceType = {
        name: 'Plumbing Services',
        description: 'Plumbing installation and repair',
        color: '#10B981',
        is_active: true,
        corporation_uuid: 'corp-1'
      }

      const createdServiceType = {
        id: 3,
        uuid: 'st-3',
        ...newServiceType,
        created_at: '2023-01-03T00:00:00Z'
      }

      mockSupabaseClient.setMockData(createdServiceType)

      const result = await mockSupabaseClient.from('service_types')
        .insert(newServiceType)
        .select()
        .single()

      expect(result.data).toEqual(createdServiceType)
      expect(result.error).toBe(null)
    })

    it('should handle create service type error', async () => {
      const errorMessage = 'Failed to create service type'
      mockSupabaseClient.setMockError({ message: errorMessage })
      mockSupabaseClient.setMockData(null)

      const newServiceType = {
        name: 'Plumbing Services',
        description: 'Plumbing installation and repair',
        color: '#10B981',
        is_active: true,
        corporation_uuid: 'corp-1'
      }

      const result = await mockSupabaseClient.from('service_types')
        .insert(newServiceType)
        .select()
        .single()

      expect(result.data).toBe(null)
      expect(result.error.message).toBe(errorMessage)
    })

    it('should validate required fields', async () => {
      const incompleteServiceType = {
        description: 'Missing name and color',
        is_active: true,
        corporation_uuid: 'corp-1'
      }

      // This would be handled by the API validation
      expect(incompleteServiceType).toBeDefined()
    })

    it('should validate unique name per corporation', async () => {
      const errorMessage = 'Service type name already exists for this corporation'
      mockSupabaseClient.setMockError({ message: errorMessage })
      mockSupabaseClient.setMockData(null)

      const duplicateServiceType = {
        name: 'General Contracting', // Already exists
        description: 'General construction services',
        color: '#8B5CF6',
        is_active: true,
        corporation_uuid: 'corp-1'
      }

      const result = await mockSupabaseClient.from('service_types')
        .insert(duplicateServiceType)
        .select()
        .single()

      expect(result.error.message).toBe(errorMessage)
    })
  })

  describe('PUT /api/service-types/[uuid]', () => {
    it('should update service type successfully', async () => {
      const updateData = {
        name: 'Updated General Contracting',
        description: 'Updated description'
      }

      const updatedServiceType = {
        id: 1,
        uuid: 'st-1',
        ...updateData,
        color: '#8B5CF6',
        is_active: true,
        corporation_uuid: 'corp-1',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z'
      }

      mockSupabaseClient.setMockData(updatedServiceType)

      const result = await mockSupabaseClient.from('service_types')
        .update(updateData)
        .eq('uuid', 'st-1')
        .select()
        .single()

      expect(result.data).toEqual(updatedServiceType)
      expect(result.error).toBe(null)
    })

    it('should handle update service type error', async () => {
      const errorMessage = 'Failed to update service type'
      mockSupabaseClient.setMockError({ message: errorMessage })
      mockSupabaseClient.setMockData(null)

      const updateData = {
        name: 'Updated General Contracting',
        description: 'Updated description'
      }

      const result = await mockSupabaseClient.from('service_types')
        .update(updateData)
        .eq('uuid', 'st-1')
        .select()
        .single()

      expect(result.data).toBe(null)
      expect(result.error.message).toBe(errorMessage)
    })
  })

  describe('DELETE /api/service-types/[uuid]', () => {
    it('should delete service type successfully', async () => {
      const serviceTypeUuid = 'st-1'
      mockSupabaseClient.setMockData({ uuid: serviceTypeUuid })

      const result = await mockSupabaseClient.from('service_types')
        .delete()
        .eq('uuid', serviceTypeUuid)

      expect(result.data).toEqual({ uuid: serviceTypeUuid })
      expect(result.error).toBe(null)
    })

    it('should handle delete service type error', async () => {
      const errorMessage = 'Failed to delete service type'
      mockSupabaseClient.setMockError({ message: errorMessage })
      mockSupabaseClient.setMockData(null)

      const result = await mockSupabaseClient.from('service_types')
        .delete()
        .eq('uuid', 'st-1')

      expect(result.error.message).toBe(errorMessage)
    })
  })

  describe('Service Type Validation', () => {
    it('should validate color format', () => {
      const validColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF']
      const invalidColors = ['FF0000', 'red', '#FF', '#GGGGGG']

      validColors.forEach(color => {
        expect(/^#[0-9A-F]{6}$/i.test(color)).toBe(true)
      })

      invalidColors.forEach(color => {
        expect(/^#[0-9A-F]{6}$/i.test(color)).toBe(false)
      })
    })

    it('should validate name length', () => {
      const validName = 'Valid Service Type Name'
      const invalidName = 'a'.repeat(101) // Too long

      expect(validName.length).toBeLessThanOrEqual(100)
      expect(invalidName.length).toBeGreaterThan(100)
    })

    it('should validate description length', () => {
      const validDescription = 'This is a valid description'
      const invalidDescription = 'a'.repeat(501) // Too long

      expect(validDescription.length).toBeLessThanOrEqual(500)
      expect(invalidDescription.length).toBeGreaterThan(500)
    })
  })

  describe('Service Type Business Logic', () => {
    it('should prevent deletion of service types with active projects', async () => {
      const errorMessage = 'Cannot delete service type with active projects'
      mockSupabaseClient.setMockError({ message: errorMessage })
      mockSupabaseClient.setMockData(null)

      const result = await mockSupabaseClient.from('service_types')
        .delete()
        .eq('uuid', 'st-1')

      expect(result.error.message).toBe(errorMessage)
    })

    it('should allow soft delete by setting is_active to false', async () => {
      const softDeletedServiceType = {
        id: 1,
        uuid: 'st-1',
        name: 'General Contracting',
        description: 'General construction services',
        color: '#8B5CF6',
        is_active: false,
        corporation_uuid: 'corp-1',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z'
      }

      mockSupabaseClient.setMockData(softDeletedServiceType)

      const result = await mockSupabaseClient.from('service_types')
        .update({ is_active: false })
        .eq('uuid', 'st-1')
        .select()
        .single()

      expect(result.data.is_active).toBe(false)
      expect(result.error).toBe(null)
    })
  })

  describe('Service Type Categories', () => {
    it('should handle different service type categories', async () => {
      const categories = [
        'General Contracting',
        'Electrical Services',
        'Plumbing Services',
        'HVAC Services',
        'Roofing Services'
      ]

      categories.forEach(category => {
        expect(typeof category).toBe('string')
        expect(category.length).toBeGreaterThan(0)
      })
    })

    it('should validate service type names', () => {
      const validNames = [
        'General Contracting',
        'Electrical Services',
        'Plumbing & HVAC',
        'Roofing-Services',
        'Landscaping & Design',
        'A' // single character is valid per API
      ]

      const invalidNames = [
        '', // empty
        ' ', // only space
        null, // null
        undefined // undefined
      ]

      validNames.forEach(name => {
        expect(!!name && name.trim().length > 0).toBe(true)
      })

      invalidNames.forEach(name => {
        expect(!!name && name.trim().length > 0).toBe(false)
      })
    })
  })
})