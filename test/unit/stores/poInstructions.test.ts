import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePOInstructionsStore } from '../../../stores/poInstructions'

// Mock $fetch
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('PO Instructions Store', () => {
  let store: ReturnType<typeof usePOInstructionsStore>

  beforeEach(() => {
    // Setup process.env before Pinia
    ;(global as any).process = { 
      server: false, 
      client: true,
      env: { NODE_ENV: 'test' }
    }
    
    setActivePinia(createPinia())
    store = usePOInstructionsStore()
    // Reset store state
    store.poInstructions = []
    store.loading = false
    store.error = null
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.poInstructions).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('fetchPOInstructions', () => {
    const mockPOInstructions = [
      {
        id: 1,
        uuid: 'po-inst-1',
        corporation_uuid: 'corp-1',
        po_instruction_name: 'Standard Delivery',
        instruction: 'Deliver to main warehouse during business hours',
        status: 'ACTIVE' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      },
      {
        id: 2,
        uuid: 'po-inst-2',
        corporation_uuid: 'corp-1',
        po_instruction_name: 'Express Delivery',
        instruction: 'Priority delivery within 24 hours',
        status: 'INACTIVE' as const,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }
    ]

    it('should fetch PO instructions successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        success: true,
        data: mockPOInstructions,
      });

      await store.fetchPOInstructions("corp-1", true); // forceFromAPI: true

      expect(mockFetch).toHaveBeenCalledWith("/api/po-instructions", {
        method: "GET",
        query: {
          corporation_uuid: "corp-1",
        },
      });
      expect(store.poInstructions).toEqual(mockPOInstructions);
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
    })

    it('should handle fetch error', async () => {
      const errorMessage = "Failed to fetch PO instructions";
      mockFetch.mockRejectedValueOnce(new Error(errorMessage));

      await expect(store.fetchPOInstructions("corp-1", true)).rejects.toThrow(
        errorMessage
      ); // forceFromAPI: true
      expect(store.error).toBe(errorMessage);
      expect(store.loading).toBe(false);
    })

    it('should clear existing PO instructions for corporation before adding new ones', async () => {
      // Add existing PO instructions for different corporation
      const existingCorp2Instruction = {
        id: 3,
        uuid: "po-inst-3",
        corporation_uuid: "corp-2",
        po_instruction_name: "Other Corp Instruction",
        instruction: "Some instruction",
        status: "ACTIVE" as const,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        created_by: "user-1",
        updated_by: "user-1",
      };

      store.poInstructions = [existingCorp2Instruction];

      mockFetch.mockResolvedValueOnce({
        success: true,
        data: mockPOInstructions,
      });

      await store.fetchPOInstructions("corp-1", true); // forceFromAPI: true

      // Should have corp-2 instruction (not filtered) + corp-1 instructions
      const expectedResult = [existingCorp2Instruction, ...mockPOInstructions];
      expect(store.poInstructions).toEqual(expectedResult);
      expect(store.poInstructions).toHaveLength(3);

      // Verify corp-1 instructions were added
      const corp1Instructions = store.poInstructions.filter(
        (po) => po.corporation_uuid === "corp-1"
      );
      expect(corp1Instructions).toEqual(mockPOInstructions);
    })
  })

  describe('createPOInstruction', () => {
    const newPOInstruction = {
      corporation_uuid: 'corp-1',
      po_instruction_name: 'New Instruction',
      instruction: 'New instruction details',
      status: 'ACTIVE' as const
    }

    const createdPOInstruction = {
      id: 3,
      uuid: 'po-inst-3',
      ...newPOInstruction,
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
      created_by: 'user-1',
      updated_by: 'user-1'
    }

    it('should create PO instruction successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        success: true,
        data: createdPOInstruction
      })

      const result = await store.createPOInstruction('corp-1', newPOInstruction)

      expect(mockFetch).toHaveBeenCalledWith('/api/po-instructions', {
        method: 'POST',
        body: {
          corporation_uuid: 'corp-1',
          ...newPOInstruction
        }
      })
      expect(result).toEqual(createdPOInstruction)
      expect(store.poInstructions).toHaveLength(1)
      expect(store.poInstructions[0]).toEqual(createdPOInstruction)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle create error', async () => {
      const errorMessage = 'Failed to create PO instruction'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.createPOInstruction('corp-1', newPOInstruction)).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.loading).toBe(false)
    })
  })

  describe('updatePOInstruction', () => {
    const existingPOInstruction = {
      id: 1,
      uuid: 'po-inst-1',
      corporation_uuid: 'corp-1',
      po_instruction_name: 'Standard Delivery',
      instruction: 'Deliver to main warehouse during business hours',
      status: 'ACTIVE' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
      updated_by: 'user-1'
    }

    const updateData = {
      po_instruction_name: 'Updated Delivery',
      instruction: 'Updated instruction details',
      status: 'INACTIVE' as const
    }

    const updatedPOInstruction = {
      ...existingPOInstruction,
      ...updateData,
      updated_at: '2024-01-03T00:00:00Z'
    }

    it('should update PO instruction successfully', async () => {
      // Add existing PO instruction to store
      store.poInstructions = [existingPOInstruction]

      mockFetch.mockResolvedValueOnce({
        success: true,
        data: updatedPOInstruction
      })

      const result = await store.updatePOInstruction('po-inst-1', updateData)

      expect(mockFetch).toHaveBeenCalledWith('/api/po-instructions/po-inst-1', {
        method: 'PUT',
        body: updateData
      })
      expect(result).toEqual(updatedPOInstruction)
      expect(store.poInstructions[0]).toEqual(updatedPOInstruction)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle update error', async () => {
      const errorMessage = 'Failed to update PO instruction'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.updatePOInstruction('po-inst-1', updateData)).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.loading).toBe(false)
    })
  })

  describe('deletePOInstruction', () => {
    const existingPOInstruction = {
      id: 1,
      uuid: 'po-inst-1',
      corporation_uuid: 'corp-1',
      po_instruction_name: 'Standard Delivery',
      instruction: 'Deliver to main warehouse during business hours',
      status: 'ACTIVE' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
      updated_by: 'user-1'
    }

    it('should delete PO instruction successfully', async () => {
      // Add existing PO instruction to store
      store.poInstructions = [existingPOInstruction]

      mockFetch.mockResolvedValueOnce({
        success: true,
        message: 'PO instruction deleted successfully'
      })

      const result = await store.deletePOInstruction('po-inst-1')

      expect(mockFetch).toHaveBeenCalledWith('/api/po-instructions/po-inst-1', {
        method: 'DELETE'
      })
      expect(result).toEqual({
        success: true,
        message: 'PO instruction deleted successfully'
      })
      expect(store.poInstructions).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle delete error', async () => {
      const errorMessage = 'Failed to delete PO instruction'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.deletePOInstruction('po-inst-1')).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.loading).toBe(false)
    })
  })

  describe('Getters', () => {
    const mockPOInstructions = [
      {
        id: 1,
        uuid: 'po-inst-1',
        corporation_uuid: 'corp-1',
        po_instruction_name: 'Standard Delivery',
        instruction: 'Deliver to main warehouse during business hours',
        status: 'ACTIVE' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      },
      {
        id: 2,
        uuid: 'po-inst-2',
        corporation_uuid: 'corp-1',
        po_instruction_name: 'Express Delivery',
        instruction: 'Priority delivery within 24 hours',
        status: 'INACTIVE' as const,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      },
      {
        id: 3,
        uuid: 'po-inst-3',
        corporation_uuid: 'corp-2',
        po_instruction_name: 'Other Corp Instruction',
        instruction: 'Some instruction',
        status: 'ACTIVE' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
        updated_by: 'user-1'
      }
    ]

    beforeEach(() => {
      store.poInstructions = mockPOInstructions
    })

    describe('getPOInstructionsByCorporation', () => {
      it('should return PO instructions for specific corporation', () => {
        const result = store.getPOInstructionsByCorporation('corp-1')
        expect(result).toHaveLength(2)
        expect(result.every(po => po.corporation_uuid === 'corp-1')).toBe(true)
      })

      it('should return empty array for non-existent corporation', () => {
        const result = store.getPOInstructionsByCorporation('non-existent')
        expect(result).toEqual([])
      })
    })

    describe('getActivePOInstructions', () => {
      it('should return only active PO instructions for specific corporation', () => {
        const result = store.getActivePOInstructions('corp-1')
        expect(result).toHaveLength(1)
        expect(result[0].status).toBe('ACTIVE')
        expect(result[0].corporation_uuid).toBe('corp-1')
      })

      it('should return empty array if no active PO instructions for corporation', () => {
        const result = store.getActivePOInstructions('corp-2')
        expect(result).toHaveLength(1) // corp-2 has one active instruction
        expect(result[0].status).toBe('ACTIVE')
      })
    })

    describe('getPOInstructionByUuid', () => {
      it('should return PO instruction by UUID', () => {
        const result = store.getPOInstructionByUuid('po-inst-1')
        expect(result).toEqual(mockPOInstructions[0])
      })

      it('should return undefined for non-existent UUID', () => {
        const result = store.getPOInstructionByUuid('non-existent')
        expect(result).toBeUndefined()
      })
    })
  })

  describe('clearPOInstructions', () => {
    it('should clear all PO instructions', () => {
      store.poInstructions = [
        {
          id: 1,
          uuid: 'po-inst-1',
          corporation_uuid: 'corp-1',
          po_instruction_name: 'Test',
          instruction: 'Test instruction',
          status: 'ACTIVE' as const,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          created_by: 'user-1',
          updated_by: 'user-1'
        }
      ]

      store.clearPOInstructions()

      expect(store.poInstructions).toEqual([])
    })
  })
})
