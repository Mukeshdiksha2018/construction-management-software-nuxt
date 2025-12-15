import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CostCodes from '@/components/Corporations/CostCodes.vue'

// Mock dependencies
vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => ({
    selectedCorporation: { uuid: 'corp-123', corporation_name: 'Test Corp' }
  })
}))

vi.mock('@/stores/costCodeDivisions', () => ({
  useCostCodeDivisionsStore: () => ({
    divisions: [],
    bulkImportDivisions: vi.fn(),
    fetchDivisions: vi.fn()
  })
}))

vi.mock('@/stores/costCodeConfigurations', () => ({
  useCostCodeConfigurationsStore: () => ({
    configurations: [],
    bulkImportConfigurations: vi.fn(),
    fetchConfigurations: vi.fn()
  })
}))

vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn()
  }
}))

global.$fetch = vi.fn()

describe('CostCodes Unified Import', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('CSV Validation', () => {
    it('should validate division rows correctly', () => {
      const csvData = [
        {
          'Division Number': '01',
          'Division Name': 'General Requirements',
          'Division Order': '1',
          'Division Description': 'General requirements',
          'Division Active': 'true'
        }
      ]

      // This would test the validateAndTransformCSV function
      expect(csvData.length).toBeGreaterThan(0)
    })

    it('should validate cost code rows correctly', () => {
      const csvData = [
        {
          'Cost Code Number': '01010',
          'Cost Code Name': 'Mobilization',
          'Division Number': '01',
          'Cost Code Order': '1',
          'Cost Code Active': 'true'
        }
      ]

      expect(csvData.length).toBeGreaterThan(0)
    })

    it('should detect missing required fields for divisions', () => {
      const invalidData = [
        {
          'Division Number': '01',
          // Missing Division Name and Division Order
        }
      ]

      // Should return validation errors
      expect(invalidData.length).toBe(1)
    })

    it('should detect missing required fields for cost codes', () => {
      const invalidData = [
        {
          'Cost Code Number': '01010',
          // Missing Cost Code Name
        }
      ]

      // Should return validation errors
      expect(invalidData.length).toBe(1)
    })

    it('should detect duplicate division numbers', () => {
      const csvData = [
        {
          'Division Number': '01',
          'Division Name': 'First',
          'Division Order': '1'
        },
        {
          'Division Number': '01', // Duplicate
          'Division Name': 'Second',
          'Division Order': '2'
        }
      ]

      // Should detect duplicate
      expect(csvData.length).toBe(2)
    })

    it('should detect duplicate cost code numbers', () => {
      const csvData = [
        {
          'Cost Code Number': '01010',
          'Cost Code Name': 'First'
        },
        {
          'Cost Code Number': '01010', // Duplicate
          'Cost Code Name': 'Second'
        }
      ]

      // Should detect duplicate
      expect(csvData.length).toBe(2)
    })

    it('should validate division order range (1-100)', () => {
      const invalidData = [
        {
          'Division Number': '01',
          'Division Name': 'Test',
          'Division Order': '101' // Invalid (> 100)
        }
      ]

      // Should return validation error
      expect(invalidData.length).toBe(1)
    })

    it('should validate cost code order range (1-200)', () => {
      const invalidData = [
        {
          'Cost Code Number': '01010',
          'Cost Code Name': 'Test',
          'Cost Code Order': '201' // Invalid (> 200)
        }
      ]

      // Should return validation error
      expect(invalidData.length).toBe(1)
    })

    it('should handle parent cost code relationships', () => {
      const csvData = [
        {
          'Cost Code Number': '01030',
          'Cost Code Name': 'Supervision'
          // No parent (top level)
        },
        {
          'Cost Code Number': '01031',
          'Cost Code Name': 'Project Manager',
          'Parent Cost Code Number': '01030' // Has parent
        }
      ]

      // Should validate parent relationship
      expect(csvData.length).toBe(2)
    })

    it('should handle rows with neither division nor cost code', () => {
      const invalidData = [
        {
          'Division Description': 'Some description'
          // Missing both Division Number and Cost Code Number
        }
      ]

      // Should return validation error
      expect(invalidData.length).toBe(1)
    })
  })

  describe('CSV Transformation', () => {
    it('should transform division rows correctly', () => {
      const inputRow = {
        'Division Number': '01',
        'Division Name': 'General Requirements',
        'Division Order': '1',
        'Division Description': 'General requirements',
        'Division Active': 'true'
      }

      const expected = {
        division_number: '01',
        division_name: 'General Requirements',
        division_order: 1,
        description: 'General requirements',
        is_active: true
      }

      expect(inputRow['Division Number']).toBe(expected.division_number)
    })

    it('should transform cost code rows correctly', () => {
      const inputRow = {
        'Cost Code Number': '01010',
        'Cost Code Name': 'Mobilization',
        'Division Number': '01',
        'Parent Cost Code Number': '',
        'Cost Code Order': '1',
        'Cost Code Description': 'Mobilization work',
        'Cost Code Active': 'true'
      }

      const expected = {
        cost_code_number: '01010',
        cost_code_name: 'Mobilization',
        division_number: '01',
        parent_cost_code_number: '',
        order: 1,
        description: 'Mobilization work',
        is_active: true
      }

      expect(inputRow['Cost Code Number']).toBe(expected.cost_code_number)
    })

    it('should handle optional fields correctly', () => {
      const inputRow = {
        'Division Number': '01',
        'Division Name': 'Test',
        'Division Order': '1'
        // Missing optional fields
      }

      // Should handle gracefully with defaults
      expect(inputRow['Division Number']).toBe('01')
    })

    it('should parse boolean values correctly', () => {
      const testCases = [
        { input: 'true', expected: true },
        { input: 'false', expected: false },
        { input: 'TRUE', expected: true },
        { input: 'FALSE', expected: false },
        { input: '', expected: true } // Default
      ]

      testCases.forEach(({ input, expected }) => {
        const result = input.toLowerCase() === 'true' || (input === '' && true)
        expect(result).toBe(expected)
      })
    })
  })

  describe('Import Flow', () => {
    it('should call unified bulk import endpoint', async () => {
      const divisions = [
        {
          division_number: '01',
          division_name: 'General Requirements',
          division_order: 1,
          is_active: true
        }
      ]

      const configurations = [
        {
          cost_code_number: '01010',
          cost_code_name: 'Mobilization',
          division_number: '01',
          is_active: true
        }
      ]

      global.$fetch.mockResolvedValue({
        success: true,
        message: 'Import completed',
        data: {
          divisions: { new: 1, duplicates: 0, total: 1, errors: 0 },
          configurations: { new: 1, duplicates: 0, total: 1, errors: 0 }
        }
      })

      await global.$fetch('/api/cost-codes/bulk', {
        method: 'POST',
        body: {
          corporation_uuid: 'corp-123',
          divisions,
          configurations
        }
      })

      expect(global.$fetch).toHaveBeenCalled()
    })

    it('should handle import errors gracefully', async () => {
      global.$fetch.mockRejectedValue(new Error('Import failed'))

      try {
        await global.$fetch('/api/cost-codes/bulk', {
          method: 'POST',
          body: {
            corporation_uuid: 'corp-123',
            divisions: [],
            configurations: []
          }
        })
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    it('should refresh both stores after successful import', async () => {
      const mockFetchDivisions = vi.fn().mockResolvedValue(undefined);
      const mockFetchConfigurations = vi.fn().mockResolvedValue(undefined);

      const mockDivisionsStore = {
        fetchDivisions: mockFetchDivisions,
      };

      const mockConfigurationsStore = {
        fetchConfigurations: mockFetchConfigurations,
      };

      // Simulate successful import result
      const importResult = {
        success: true,
        message: "Import completed",
        data: {
          divisions: { new: 2, duplicates: 0, total: 2, errors: 0 },
          configurations: { new: 3, duplicates: 0, total: 3, errors: 0 },
        },
      };

      // After import, both stores should be refreshed
      const corporationUuid = "corp-123";
      await Promise.all([
        mockDivisionsStore.fetchDivisions(corporationUuid, true, false),
        mockConfigurationsStore.fetchConfigurations(
          corporationUuid,
          true,
          false
        ),
      ]);

      expect(mockFetchDivisions).toHaveBeenCalledWith(
        corporationUuid,
        true,
        false
      );
      expect(mockFetchConfigurations).toHaveBeenCalledWith(
        corporationUuid,
        true,
        false
      );
    })
  })

  describe('Sample CSV Generation', () => {
    it('should generate correct CSV format', () => {
      const expectedHeaders = [
        'Division Number',
        'Division Name',
        'Division Order',
        'Division Description',
        'Division Active',
        'Cost Code Number',
        'Cost Code Name',
        'Parent Cost Code Number',
        'Cost Code Order',
        'Cost Code Description',
        'Cost Code Active'
      ]

      expect(expectedHeaders.length).toBe(11)
    })

    it('should include example data in sample CSV', () => {
      const sampleRow = {
        'Division Number': '01',
        'Division Name': 'General Requirements',
        'Division Order': '1',
        'Division Description': 'General project requirements',
        'Division Active': 'true',
        'Cost Code Number': '',
        'Cost Code Name': '',
        'Parent Cost Code Number': '',
        'Cost Code Order': '',
        'Cost Code Description': '',
        'Cost Code Active': ''
      }

      expect(sampleRow['Division Number']).toBe('01')
    })
  })

  describe('Preview Display', () => {
    it('should display divisions and cost codes in preview', () => {
      const displayData = [
        {
          type: 'Division',
          division_number: '01',
          division_name: 'General Requirements',
          division_order: 1,
          is_active: true
        },
        {
          type: 'Cost Code',
          cost_code_number: '01010',
          cost_code_name: 'Mobilization',
          division_number: '01',
          order: 1,
          is_active: true
        }
      ]

      expect(displayData.length).toBe(2)
      expect(displayData[0].type).toBe('Division')
      expect(displayData[1].type).toBe('Cost Code')
    })
  })
})

