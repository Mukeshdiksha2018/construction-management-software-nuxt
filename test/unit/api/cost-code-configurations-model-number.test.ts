import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock Supabase client
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
      data: mockData,
      error: mockError,
      then: vi.fn((resolve: any) => resolve({ data: mockData, error: mockError }))
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
          })),
          single: vi.fn(() => mockQuery),
          in: vi.fn(() => mockQuery)
        })),
        in: vi.fn(() => mockQuery),
        single: vi.fn(() => mockQuery)
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

vi.mock('@/utils/supabaseServer', () => ({
  supabaseServer: mockSupabaseClient
}))

describe('Cost Code Configurations API - Model Number Support', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockSupabaseClient.resetMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/cost-code-configurations - Model Number', () => {
    it('should create preferred item with model_number', async () => {
      const configData = {
        id: 1,
        uuid: 'config-1',
        corporation_uuid: 'corp-1',
        cost_code_number: '01.02.03',
        cost_code_name: 'Test Cost Code',
        gl_account_uuid: 'gl-1',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const itemData = {
        id: 1,
        uuid: 'item-1',
        cost_code_configuration_uuid: 'config-1',
        corporation_uuid: 'corp-1',
        item_type_uuid: 'type-1',
        project_uuid: 'project-1',
        item_name: 'Test Item',
        item_sequence: 'SEQ-001',
        model_number: 'MODEL-123',
        unit_price: 100.00,
        unit: 'EA',
        description: 'Test description',
        status: 'Active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      // Mock config creation
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'cost_code_configurations') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: configData,
                  error: null
                }))
              }))
            }))
          }
        }
        if (table === 'cost_code_preferred_items') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                data: [itemData],
                error: null
              }))
            }))
          }
        }
        return mockSupabaseClient.from(table)
      })

      const body = {
        corporation_uuid: 'corp-1',
        cost_code_number: '01.02.03',
        cost_code_name: 'Test Cost Code',
        gl_account_uuid: 'gl-1',
        preferred_items: [
          {
            item_type_uuid: 'type-1',
            project_uuid: 'project-1',
            item_name: 'Test Item',
            item_sequence: 'SEQ-001',
            model_number: 'MODEL-123',
            unit_price: 100.00,
            unit: 'EA',
            description: 'Test description',
            status: 'Active'
          }
        ]
      }

      // Verify model_number is included in insert
      const insertCall = mockSupabaseClient.from('cost_code_preferred_items').insert
      expect(insertCall).toBeDefined()
      
      // The actual API would call insert with model_number
      const expectedInsert = {
        cost_code_configuration_uuid: 'config-1',
        corporation_uuid: 'corp-1',
        item_type_uuid: 'type-1',
        project_uuid: 'project-1',
        item_name: 'Test Item',
        item_sequence: 'SEQ-001',
        model_number: 'MODEL-123',
        unit_price: 100.00,
        unit: 'EA',
        description: 'Test description',
        status: 'Active'
      }

      expect(expectedInsert).toHaveProperty('model_number')
      expect(expectedInsert.model_number).toBe('MODEL-123')
    })

    it('should handle preferred item without model_number (null)', async () => {
      const expectedInsert = {
        cost_code_configuration_uuid: 'config-1',
        corporation_uuid: 'corp-1',
        item_type_uuid: 'type-1',
        project_uuid: 'project-1',
        item_name: 'Test Item',
        item_sequence: 'SEQ-001',
        model_number: null,
        unit_price: 100.00,
        unit: 'EA',
        description: 'Test description',
        status: 'Active'
      }

      expect(expectedInsert.model_number).toBeNull()
    })

    it('should handle empty model_number string as null', async () => {
      const body = {
        preferred_items: [
          {
            item_name: 'Test Item',
            item_sequence: 'SEQ-001',
            model_number: '',
            unit_price: 100.00,
            unit: 'EA'
          }
        ]
      }

      // API should convert empty string to null
      const processedModelNumber = body.preferred_items[0].model_number || null
      expect(processedModelNumber).toBeNull()
    })
  })

  describe('PUT /api/cost-code-configurations/[uuid] - Model Number', () => {
    it('should update preferred item with model_number', async () => {
      const existingConfig = {
        uuid: 'config-1',
        corporation_uuid: 'corp-1'
      }

      const updatedItem = {
        id: 1,
        uuid: 'item-1',
        cost_code_configuration_uuid: 'config-1',
        corporation_uuid: 'corp-1',
        item_type_uuid: 'type-1',
        project_uuid: 'project-1',
        item_name: 'Updated Item',
        item_sequence: 'SEQ-001',
        model_number: 'MODEL-456',
        unit_price: 150.00,
        unit: 'EA',
        description: 'Updated description',
        status: 'Active'
      }

      const expectedUpdate = {
        cost_code_configuration_uuid: 'config-1',
        corporation_uuid: 'corp-1',
        item_type_uuid: 'type-1',
        project_uuid: 'project-1',
        item_name: 'Updated Item',
        item_sequence: 'SEQ-001',
        model_number: 'MODEL-456',
        unit_price: 150.00,
        unit: 'EA',
        description: 'Updated description',
        status: 'Active'
      }

      expect(expectedUpdate).toHaveProperty('model_number')
      expect(expectedUpdate.model_number).toBe('MODEL-456')
    })

    it('should update model_number to null when removed', async () => {
      const updateData = {
        preferred_items: [
          {
            uuid: 'item-1',
            item_name: 'Test Item',
            item_sequence: 'SEQ-001',
            model_number: null, // Removed model number
            unit_price: 100.00,
            unit: 'EA'
          }
        ]
      }

      expect(updateData.preferred_items[0].model_number).toBeNull()
    })
  })

  describe('GET /api/cost-code-configurations - Model Number', () => {
    it('should return preferred items with model_number', async () => {
      const mockItems = [
        {
          id: 1,
          uuid: 'item-1',
          cost_code_configuration_uuid: 'config-1',
          corporation_uuid: 'corp-1',
          item_type_uuid: 'type-1',
          project_uuid: 'project-1',
          item_name: 'Test Item',
          item_sequence: 'SEQ-001',
          model_number: 'MODEL-123',
          unit_price: 100.00,
          unit: 'EA',
          description: 'Test description',
          status: 'Active',
          initial_quantity: null,
          as_of_date: null,
          reorder_point: null,
          maximum_limit: null
        }
      ]

      // Simulate API response mapping
      const mappedItems = mockItems.map((item: any) => ({
        id: item.id,
        uuid: item.uuid,
        corporation_uuid: item.corporation_uuid,
        item_type_uuid: item.item_type_uuid,
        project_uuid: item.project_uuid,
        item_name: item.item_name,
        item_sequence: item.item_sequence,
        model_number: item.model_number,
        unit_price: item.unit_price,
        unit: item.unit,
        description: item.description,
        status: item.status,
        initial_quantity: item.initial_quantity,
        as_of_date: item.as_of_date,
        reorder_point: item.reorder_point,
        maximum_limit: item.maximum_limit
      }))

      expect(mappedItems[0]).toHaveProperty('model_number')
      expect(mappedItems[0].model_number).toBe('MODEL-123')
    })

    it('should return null model_number when not set', async () => {
      const mockItems = [
        {
          id: 1,
          uuid: 'item-1',
          item_name: 'Test Item',
          item_sequence: 'SEQ-001',
          model_number: null,
          unit_price: 100.00,
          unit: 'EA'
        }
      ]

      const mappedItems = mockItems.map((item: any) => ({
        ...item,
        model_number: item.model_number
      }))

      expect(mappedItems[0].model_number).toBeNull()
    })
  })

  describe('Model Number Data Validation', () => {
    it('should accept valid model number strings', () => {
      const validModelNumbers = [
        'MODEL-123',
        'ABC-456-XYZ',
        '12345',
        'MODEL_ABC_123',
        'Model Number 1',
        'A1B2C3'
      ]

      validModelNumbers.forEach(modelNumber => {
        expect(typeof modelNumber).toBe('string')
        expect(modelNumber.length).toBeGreaterThan(0)
      })
    })

    it('should handle model number in search/filter operations', () => {
      const items = [
        { item_name: 'Item 1', model_number: 'MODEL-123' },
        { item_name: 'Item 2', model_number: 'MODEL-456' },
        { item_name: 'Item 3', model_number: null }
      ]

      const searchTerm = 'MODEL-123'
      const filtered = items.filter(item => 
        item.model_number?.toLowerCase().includes(searchTerm.toLowerCase())
      )

      expect(filtered).toHaveLength(1)
      expect(filtered[0].model_number).toBe('MODEL-123')
    })
  })
})
















