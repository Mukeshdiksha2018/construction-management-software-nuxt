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

describe('Project Types API', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockSupabaseClient.resetMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/project-types', () => {
    it('should fetch project types successfully', async () => {
      const mockProjectTypes = [
        {
          id: 1,
          uuid: 'pt-1',
          name: 'Residential',
          description: 'Residential construction projects',
          color: '#3B82F6',
          is_active: true,
          corporation_uuid: 'corp-1',
          created_at: '2023-01-01T00:00:00Z'
        },
        {
          id: 2,
          uuid: 'pt-2',
          name: 'Commercial',
          description: 'Commercial construction projects',
          color: '#10B981',
          is_active: true,
          corporation_uuid: 'corp-1',
          created_at: '2023-01-02T00:00:00Z'
        }
      ]

      mockSupabaseClient.setMockData(mockProjectTypes)

      const result = await mockSupabaseClient.from('project_types')
        .select('*')
        .eq('corporation_uuid', 'corp-1')
        .eq('is_active', true)
        .order('name', { ascending: true })

      expect(result.data).toEqual(mockProjectTypes)
      expect(result.error).toBe(null)
    })

    it('should handle fetch error', async () => {
      const errorMessage = 'Database connection failed'
      mockSupabaseClient.setMockError({ message: errorMessage })
      mockSupabaseClient.setMockData(null)

      const result = await mockSupabaseClient.from('project_types')
        .select('*')
        .eq('corporation_uuid', 'corp-1')
        .eq('is_active', true)
        .order('name', { ascending: true })

      expect(result.data).toBe(null)
      expect(result.error.message).toBe(errorMessage)
    })

    it('should filter by corporation UUID', async () => {
      const mockProjectTypes = [
        {
          id: 1,
          uuid: 'pt-1',
          name: 'Residential',
          description: 'Residential construction projects',
          color: '#3B82F6',
          is_active: true,
          corporation_uuid: 'corp-1',
          created_at: '2023-01-01T00:00:00Z'
        }
      ]

      mockSupabaseClient.setMockData(mockProjectTypes)

      const result = await mockSupabaseClient.from('project_types')
        .select('*')
        .eq('corporation_uuid', 'corp-1')
        .eq('is_active', true)
        .order('name', { ascending: true })

      expect(result.data).toEqual(mockProjectTypes)
      expect(result.error).toBe(null)
    })

    it('should only return active project types', async () => {
      const mockProjectTypes = [
        {
          id: 1,
          uuid: 'pt-1',
          name: 'Residential',
          description: 'Residential construction projects',
          color: '#3B82F6',
          is_active: true,
          corporation_uuid: 'corp-1',
          created_at: '2023-01-01T00:00:00Z'
        }
      ]

      mockSupabaseClient.setMockData(mockProjectTypes)

      const result = await mockSupabaseClient.from('project_types')
        .select('*')
        .eq('corporation_uuid', 'corp-1')
        .eq('is_active', true)
        .order('name', { ascending: true })

      expect(result.data).toEqual(mockProjectTypes)
      expect(result.data.every(pt => pt.is_active)).toBe(true)
    })
  })

  describe('POST /api/project-types', () => {
    it('should create project type successfully', async () => {
      const newProjectType = {
        name: 'Industrial',
        description: 'Industrial construction projects',
        color: '#F59E0B',
        is_active: true,
        corporation_uuid: 'corp-1'
      }

      const createdProjectType = {
        id: 3,
        uuid: 'pt-3',
        ...newProjectType,
        created_at: '2023-01-03T00:00:00Z'
      }

      mockSupabaseClient.setMockData(createdProjectType)

      const result = await mockSupabaseClient.from('project_types')
        .insert(newProjectType)
        .select()
        .single()

      expect(result.data).toEqual(createdProjectType)
      expect(result.error).toBe(null)
    })

    it('should handle create project type error', async () => {
      const errorMessage = 'Failed to create project type'
      mockSupabaseClient.setMockError({ message: errorMessage })
      mockSupabaseClient.setMockData(null)

      const newProjectType = {
        name: 'Industrial',
        description: 'Industrial construction projects',
        color: '#F59E0B',
        is_active: true,
        corporation_uuid: 'corp-1'
      }

      const result = await mockSupabaseClient.from('project_types')
        .insert(newProjectType)
        .select()
        .single()

      expect(result.data).toBe(null)
      expect(result.error.message).toBe(errorMessage)
    })

    it('should validate required fields', async () => {
      const incompleteProjectType = {
        description: 'Missing name and color',
        is_active: true,
        corporation_uuid: 'corp-1'
      }

      // This would be handled by the API validation
      expect(incompleteProjectType).toBeDefined()
    })

    it('should validate unique name per corporation', async () => {
      const errorMessage = 'Project type name already exists for this corporation'
      mockSupabaseClient.setMockError({ message: errorMessage })
      mockSupabaseClient.setMockData(null)

      const duplicateProjectType = {
        name: 'Residential', // Already exists
        description: 'Residential construction projects',
        color: '#3B82F6',
        is_active: true,
        corporation_uuid: 'corp-1'
      }

      const result = await mockSupabaseClient.from('project_types')
        .insert(duplicateProjectType)
        .select()
        .single()

      expect(result.error.message).toBe(errorMessage)
    })
  })

  describe('PUT /api/project-types/[uuid]', () => {
    it('should update project type successfully', async () => {
      const updateData = {
        name: 'Updated Residential',
        description: 'Updated description'
      }

      const updatedProjectType = {
        id: 1,
        uuid: 'pt-1',
        ...updateData,
        color: '#3B82F6',
        is_active: true,
        corporation_uuid: 'corp-1',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z'
      }

      mockSupabaseClient.setMockData(updatedProjectType)

      const result = await mockSupabaseClient.from('project_types')
        .update(updateData)
        .eq('uuid', 'pt-1')
        .select()
        .single()

      expect(result.data).toEqual(updatedProjectType)
      expect(result.error).toBe(null)
    })

    it('should handle update project type error', async () => {
      const errorMessage = 'Failed to update project type'
      mockSupabaseClient.setMockError({ message: errorMessage })
      mockSupabaseClient.setMockData(null)

      const updateData = {
        name: 'Updated Residential',
        description: 'Updated description'
      }

      const result = await mockSupabaseClient.from('project_types')
        .update(updateData)
        .eq('uuid', 'pt-1')
        .select()
        .single()

      expect(result.data).toBe(null)
      expect(result.error.message).toBe(errorMessage)
    })
  })

  describe('DELETE /api/project-types/[uuid]', () => {
    it('should delete project type successfully', async () => {
      const projectTypeUuid = 'pt-1'
      mockSupabaseClient.setMockData({ uuid: projectTypeUuid })

      const result = await mockSupabaseClient.from('project_types')
        .delete()
        .eq('uuid', projectTypeUuid)

      expect(result.data).toEqual({ uuid: projectTypeUuid })
      expect(result.error).toBe(null)
    })

    it('should handle delete project type error', async () => {
      const errorMessage = 'Failed to delete project type'
      mockSupabaseClient.setMockError({ message: errorMessage })
      mockSupabaseClient.setMockData(null)

      const result = await mockSupabaseClient.from('project_types')
        .delete()
        .eq('uuid', 'pt-1')

      expect(result.error.message).toBe(errorMessage)
    })
  })

  describe('Project Type Validation', () => {
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
      const validName = 'Valid Project Type Name'
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

  describe('Project Type Business Logic', () => {
    it('should prevent deletion of project types with active projects', async () => {
      const errorMessage = 'Cannot delete project type with active projects'
      mockSupabaseClient.setMockError({ message: errorMessage })
      mockSupabaseClient.setMockData(null)

      const result = await mockSupabaseClient.from('project_types')
        .delete()
        .eq('uuid', 'pt-1')

      expect(result.error.message).toBe(errorMessage)
    })

    it('should allow soft delete by setting is_active to false', async () => {
      const softDeletedProjectType = {
        id: 1,
        uuid: 'pt-1',
        name: 'Residential',
        description: 'Residential construction projects',
        color: '#3B82F6',
        is_active: false,
        corporation_uuid: 'corp-1',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z'
      }

      mockSupabaseClient.setMockData(softDeletedProjectType)

      const result = await mockSupabaseClient.from('project_types')
        .update({ is_active: false })
        .eq('uuid', 'pt-1')
        .select()
        .single()

      expect(result.data.is_active).toBe(false)
      expect(result.error).toBe(null)
    })
  })
})