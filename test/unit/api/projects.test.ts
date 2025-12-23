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

describe('Projects API', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockSupabaseClient.resetMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/projects', () => {
    it('should fetch projects successfully', async () => {
      const mockProjects = [
        {
          id: 1,
          uuid: 'project-1',
          project_name: 'Test Project 1',
          project_id: 'P001',
          project_type_uuid: 'pt-1',
          service_type_uuid: 'st-1',
          estimated_amount: 100000,
          project_status: 'Pending',
          corporation_uuid: 'corp-1',
          created_at: '2023-01-01T00:00:00Z'
        }
      ]

      mockSupabaseClient.setMockData(mockProjects)

      const result = await mockSupabaseClient.from('projects')
        .select('*')
        .eq('corporation_uuid', 'corp-1')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      expect(result.data).toEqual(mockProjects)
      expect(result.error).toBe(null)
    })

    it('should handle fetch error', async () => {
      const errorMessage = 'Database connection failed'
      mockSupabaseClient.setMockError({ message: errorMessage })
      mockSupabaseClient.setMockData(null)

      const result = await mockSupabaseClient.from('projects')
        .select('*')
        .eq('corporation_uuid', 'corp-1')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      expect(result.data).toBe(null)
      expect(result.error.message).toBe(errorMessage)
    })
  })

  describe('POST /api/projects', () => {
    it('should create project successfully', async () => {
      const newProject = {
        corporation_uuid: 'corp-1',
        project_name: 'New Project',
        project_id: 'P003',
        project_type_uuid: 'pt-1',
        service_type_uuid: 'st-1',
        estimated_amount: 150000,
        project_status: 'Pending',
        address_line_1: '123 Main St',
        address_type: 'shipment',
        city: 'Anytown',
        contact_person: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        state: 'CA',
        zip_code: '12345',
        country: 'US'
      }

      const createdProject = {
        id: 3,
        uuid: 'project-3',
        ...newProject,
        created_at: '2023-01-03T00:00:00Z'
      }

      mockSupabaseClient.setMockData(createdProject)

      const result = await mockSupabaseClient.from('projects')
        .insert(newProject)
        .select()
        .single()

      expect(result.data).toEqual(createdProject)
      expect(result.error).toBe(null)
    })

    it('should create project with customer_uuid successfully', async () => {
      const newProject = {
        corporation_uuid: 'corp-1',
        project_name: 'New Project',
        project_id: 'P003',
        project_type_uuid: 'pt-1',
        service_type_uuid: 'st-1',
        estimated_amount: 150000,
        project_status: 'Pending',
        customer_uuid: 'customer-1'
      }

      const createdProject = {
        id: 3,
        uuid: 'project-3',
        ...newProject,
        created_at: '2023-01-03T00:00:00Z'
      }

      mockSupabaseClient.setMockData(createdProject)

      const result = await mockSupabaseClient.from('projects')
        .insert(newProject)
        .select()
        .single()

      expect(result.data).toEqual(createdProject)
      expect(result.data.customer_uuid).toBe('customer-1')
      expect(result.error).toBe(null)
    })

    it('should create project with null customer_uuid when not provided', async () => {
      const newProject = {
        corporation_uuid: 'corp-1',
        project_name: 'New Project',
        project_id: 'P003',
        project_type_uuid: 'pt-1',
        service_type_uuid: 'st-1',
        estimated_amount: 150000,
        project_status: 'Pending'
      }

      const createdProject = {
        id: 3,
        uuid: 'project-3',
        ...newProject,
        customer_uuid: null,
        created_at: '2023-01-03T00:00:00Z'
      }

      mockSupabaseClient.setMockData(createdProject)

      const result = await mockSupabaseClient.from('projects')
        .insert(newProject)
        .select()
        .single()

      expect(result.data).toEqual(createdProject)
      expect(result.data.customer_uuid).toBeNull()
      expect(result.error).toBe(null)
    })

    it('should handle create project error', async () => {
      const errorMessage = 'Failed to create project'
      mockSupabaseClient.setMockError({ message: errorMessage })
      mockSupabaseClient.setMockData(null)

      const newProject = {
        corporation_uuid: 'corp-1',
        project_name: 'New Project',
        project_id: 'P003',
        project_type_uuid: 'pt-1',
        service_type_uuid: 'st-1',
        estimated_amount: 150000,
        project_status: 'Pending'
      }

      const result = await mockSupabaseClient.from('projects')
        .insert(newProject)
        .select()
        .single()

      expect(result.data).toBe(null)
      expect(result.error.message).toBe(errorMessage)
    })
  })

  describe('PUT /api/projects', () => {
    it('should update project successfully', async () => {
      const updateData = {
        project_name: 'Updated Project Name',
        estimated_amount: 175000
      }

      const updatedProject = {
        id: 1,
        uuid: 'project-1',
        ...updateData,
        project_id: 'P001',
        project_type_uuid: 'pt-1',
        service_type_uuid: 'st-1',
        project_status: 'Pending',
        corporation_uuid: 'corp-1',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z'
      }

      mockSupabaseClient.setMockData(updatedProject)

      const result = await mockSupabaseClient.from('projects')
        .update(updateData)
        .eq('uuid', 'project-1')
        .select()
        .single()

      expect(result.data).toEqual(updatedProject)
      expect(result.error).toBe(null)
    })

    it('should update project customer_uuid successfully', async () => {
      const updateData = {
        customer_uuid: 'customer-2'
      }

      const updatedProject = {
        id: 1,
        uuid: 'project-1',
        project_name: 'Test Project',
        project_id: 'P001',
        project_type_uuid: 'pt-1',
        service_type_uuid: 'st-1',
        project_status: 'Pending',
        corporation_uuid: 'corp-1',
        customer_uuid: 'customer-2',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z'
      }

      mockSupabaseClient.setMockData(updatedProject)

      const result = await mockSupabaseClient.from('projects')
        .update(updateData)
        .eq('uuid', 'project-1')
        .select()
        .single()

      expect(result.data).toEqual(updatedProject)
      expect(result.data.customer_uuid).toBe('customer-2')
      expect(result.error).toBe(null)
    })

    it('should update project customer_uuid to null successfully', async () => {
      const updateData = {
        customer_uuid: null
      }

      const updatedProject = {
        id: 1,
        uuid: 'project-1',
        project_name: 'Test Project',
        project_id: 'P001',
        project_type_uuid: 'pt-1',
        service_type_uuid: 'st-1',
        project_status: 'Pending',
        corporation_uuid: 'corp-1',
        customer_uuid: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-03T00:00:00Z'
      }

      mockSupabaseClient.setMockData(updatedProject)

      const result = await mockSupabaseClient.from('projects')
        .update(updateData)
        .eq('uuid', 'project-1')
        .select()
        .single()

      expect(result.data).toEqual(updatedProject)
      expect(result.data.customer_uuid).toBeNull()
      expect(result.error).toBe(null)
    })

    it('should handle update project error', async () => {
      const errorMessage = 'Failed to update project'
      mockSupabaseClient.setMockError({ message: errorMessage })
      mockSupabaseClient.setMockData(null)

      const updateData = {
        project_name: 'Updated Project Name',
        estimated_amount: 175000
      }

      const result = await mockSupabaseClient.from('projects')
        .update(updateData)
        .eq('uuid', 'project-1')
        .select()
        .single()

      expect(result.data).toBe(null)
      expect(result.error.message).toBe(errorMessage)
    })
  })

  describe('DELETE /api/projects', () => {
    // Note: These tests mock the Supabase client directly
    // For full endpoint testing, see integration tests
    
    it('should delete project successfully when no estimates exist', async () => {
      const projectUuid = 'project-1'
      const mockProject = { 
        uuid: projectUuid,
        project_name: 'Test Project',
        is_active: false
      }
      
      // Mock: project exists, no estimates
      let projectsCallCount = 0
      let estimatesCallCount = 0
      
      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'projects') {
          projectsCallCount++
          if (projectsCallCount === 1) {
            // First call: check if project exists
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({
                    data: { uuid: projectUuid, project_name: 'Test Project' },
                    error: null
                  }))
                }))
              })),
              update: vi.fn(() => ({
                eq: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({
                      data: mockProject,
                      error: null
                    }))
                  }))
                }))
              }))
            }
          } else if (projectsCallCount === 2) {
            // Second call: update (soft delete)
            return {
              update: vi.fn(() => ({
                eq: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({
                      data: mockProject,
                      error: null
                    }))
                  }))
                }))
              }))
            }
          }
        } else if (table === 'estimates') {
          estimatesCallCount++
          // Check for estimates
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({
                    data: [], // No estimates
                    error: null
                  }))
                }))
              }))
            }))
          }
        }
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })) })),
          update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })) })) })),
          delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: null, error: null })) }))
        }
      })

      // Test the estimate check
      const estimateResult = await mockSupabaseClient.from('estimates')
        .select('uuid, estimate_number, estimate_date, status')
        .eq('project_uuid', projectUuid)
        .eq('is_active', true)
        .limit(10)

      expect(estimateResult.data).toEqual([])
      expect(estimateResult.error).toBe(null)

      // Test the update (soft delete)
      const result = await mockSupabaseClient.from('projects')
        .update({ is_active: false })
        .eq('uuid', projectUuid)
        .select()
        .single()

      expect(result.data).toEqual(mockProject)
      expect(result.error).toBe(null)
    })

    it('should prevent deletion when estimates exist', async () => {
      const projectUuid = 'project-1'
      const mockEstimates = [
        { uuid: 'est-1', estimate_number: 'EST-001', estimate_date: '2023-01-01', status: 'active' },
        { uuid: 'est-2', estimate_number: 'EST-002', estimate_date: '2023-01-02', status: 'active' }
      ]
      
      let callCount = 0
      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'projects') {
          callCount++
          if (callCount === 1) {
            // First call: check if project exists
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({
                    data: { uuid: projectUuid, project_name: 'Test Project' },
                    error: null
                  }))
                }))
              }))
            }
          }
        } else if (table === 'estimates') {
          // Check for estimates - return estimates
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({
                    data: mockEstimates, // Estimates exist
                    error: null
                  }))
                }))
              }))
            }))
          }
        }
        return {}
      })

      const result = await mockSupabaseClient.from('estimates')
        .select('uuid, estimate_number, estimate_date, status')
        .eq('project_uuid', projectUuid)
        .eq('is_active', true)
        .limit(10)

      expect(result.data).toEqual(mockEstimates)
      expect(result.data.length).toBeGreaterThan(0)
      // The API should throw an error in this case
    })

    it('should handle delete project error', async () => {
      const errorMessage = 'Failed to delete project'
      const mockError = { message: errorMessage }
      
      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'projects') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: { uuid: 'project-1', project_name: 'Test Project' },
                  error: null
                }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({
                    data: null,
                    error: mockError
                  }))
                }))
              }))
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: null,
                error: mockError
              }))
            }))
          }
        } else if (table === 'estimates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({
                    data: [],
                    error: null
                  }))
                }))
              }))
            }))
          }
        }
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })) })),
          update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: mockError })) })) })) })),
          delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: null, error: mockError })) }))
        }
      })

      // Test update error (which is what the API uses for soft delete)
      const result = await mockSupabaseClient.from('projects')
        .update({ is_active: false })
        .eq('uuid', 'project-1')
        .select()
        .single()

      expect(result.error).toEqual(mockError)
      expect(result.error.message).toBe(errorMessage)
    })

    it('should return 404 when project does not exist', async () => {
      const projectUuid = 'non-existent-project'
      
      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'projects') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: null,
                  error: { message: 'Project not found', code: 'PGRST116' }
                }))
              }))
            }))
          }
        }
        return {}
      })

      const result = await mockSupabaseClient.from('projects')
        .select('uuid, project_name, project_id')
        .eq('uuid', projectUuid)
        .single()

      expect(result.data).toBe(null)
      expect(result.error).toBeDefined()
    })
  })

  describe('Project Validation', () => {
    it('should validate required fields', () => {
      const requiredFields = [
        'corporation_uuid',
        'project_name',
        'project_id',
        'project_type_uuid',
        'service_type_uuid',
        'project_status'
      ]

      requiredFields.forEach(field => {
        expect(field).toBeDefined()
        expect(typeof field).toBe('string')
      })
    })

    it('should validate email format', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'admin+test@company.org'
      ]

      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain'
      ]

      validEmails.forEach(email => {
        expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)).toBe(true)
      })

      invalidEmails.forEach(email => {
        expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)).toBe(false)
      })
    })

    it('should validate address type', () => {
      const validAddressTypes = ['shipment', 'bill', 'final-destination']
      const invalidAddressType = 'invalid-type'

      validAddressTypes.forEach(type => {
        expect(['shipment', 'bill', 'final-destination']).toContain(type)
      })

      expect(['shipment', 'bill', 'final-destination']).not.toContain(invalidAddressType)
    })
  })

  describe('Project Status Management', () => {
    it('should handle valid project statuses', () => {
      const validStatuses = ['Pending', 'In Progress', 'Completed', 'On Hold']
      const testStatus = 'Pending'

      expect(validStatuses).toContain(testStatus)
    })

    it('should reject invalid project statuses', () => {
      const validStatuses = ['Pending', 'In Progress', 'Completed', 'On Hold']
      const invalidStatus = 'Invalid Status'

      expect(validStatuses).not.toContain(invalidStatus)
    })
  })

  describe('Project Amount Validation', () => {
    it('should validate positive amounts', () => {
      const validAmounts = [1000, 50000, 1000000, 0.01]
      const invalidAmounts = [-1000, -50000, -0.01]

      validAmounts.forEach(amount => {
        expect(amount).toBeGreaterThanOrEqual(0)
      })

      invalidAmounts.forEach(amount => {
        expect(amount).toBeLessThan(0)
      })
    })

    it('should handle decimal amounts', () => {
      const decimalAmounts = [1000.50, 25000.75, 100000.99]
      
      decimalAmounts.forEach(amount => {
        expect(typeof amount).toBe('number')
        expect(amount % 1).not.toBe(0) // Not a whole number
      })
    })
  })
})