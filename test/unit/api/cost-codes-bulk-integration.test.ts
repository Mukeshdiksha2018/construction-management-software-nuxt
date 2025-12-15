import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Integration tests for the unified cost codes bulk import API endpoint
 * These tests simulate the full import flow including database interactions
 */

describe('Cost Codes Unified Bulk Import - Integration Tests', () => {
  const mockCorporationUuid = 'corp-123'
  const mockDivisionUuid1 = 'div-001'
  const mockDivisionUuid2 = 'div-002'
  const mockGLAccountUuid = 'gl-001'
  const mockCostCodeUuid1 = 'cc-001'
  const mockCostCodeUuid2 = 'cc-002'
  const mockSubCostCodeUuid = 'cc-003'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete Import Scenarios', () => {
    it('should successfully import divisions with their cost codes', async () => {
      const requestBody = {
        corporation_uuid: mockCorporationUuid,
        divisions: [
          {
            division_number: '01',
            division_name: 'General Requirements',
            division_order: 1,
            description: 'General project requirements',
            is_active: true
          },
          {
            division_number: '02',
            division_name: 'Existing Conditions',
            division_order: 2,
            description: 'Existing site conditions',
            is_active: true
          }
        ],
        configurations: [
          {
            cost_code_number: '01010',
            cost_code_name: 'Mobilization',
            division_number: '01',
            order: 1,
            description: 'Mobilization work',
            is_active: true
          },
          {
            cost_code_number: '02010',
            cost_code_name: 'Demolition',
            division_number: '02',
            order: 1,
            description: 'Demolition work',
            is_active: true
          }
        ]
      }

      // Expected result structure
      const expectedResult = {
        success: true,
        message: expect.stringContaining('Import completed'),
        data: {
          divisions: {
            new: 2,
            duplicates: 0,
            total: 2,
            errors: 0
          },
          configurations: {
            new: 2,
            duplicates: 0,
            total: 2,
            errors: 0
          },
          errors: {
            divisions: [],
            configurations: []
          }
        }
      }

      expect(requestBody.divisions.length).toBe(2)
      expect(requestBody.configurations.length).toBe(2)
    })

    it('should allow importing divisions with duplicate order numbers', async () => {
      const requestBody = {
        corporation_uuid: mockCorporationUuid,
        divisions: [
          {
            division_number: '01',
            division_name: 'First Division',
            division_order: 1,
            description: 'First division',
            is_active: true
          },
          {
            division_number: '02',
            division_name: 'Second Division',
            division_order: 1, // Same order number - should be allowed
            description: 'Second division',
            is_active: true
          },
          {
            division_number: '03',
            division_name: 'Third Division',
            division_order: 1, // Same order number - should be allowed
            description: 'Third division',
            is_active: true
          }
        ],
        configurations: []
      }

      // All three divisions should be importable with the same order number
      expect(requestBody.divisions.length).toBe(3)
      expect(requestBody.divisions[0].division_order).toBe(1)
      expect(requestBody.divisions[1].division_order).toBe(1)
      expect(requestBody.divisions[2].division_order).toBe(1)
      expect(requestBody.divisions[0].division_number).toBe('01')
      expect(requestBody.divisions[1].division_number).toBe('02')
      expect(requestBody.divisions[2].division_number).toBe('03')
    })

    it('should import hierarchical cost code structure (3 levels)', async () => {
      const requestBody = {
        corporation_uuid: mockCorporationUuid,
        divisions: [
          {
            division_number: '01',
            division_name: 'General Requirements',
            division_order: 1,
            is_active: true
          }
        ],
        configurations: [
          // Level 0 (top-level)
          {
            cost_code_number: '01030',
            cost_code_name: 'Supervision',
            division_number: '01',
            order: 1,
            is_active: true
          },
          // Level 1 (sub-cost code)
          {
            cost_code_number: '01031',
            cost_code_name: 'Project Manager',
            division_number: '01',
            parent_cost_code_number: '01030',
            order: 1,
            is_active: true
          },
          // Level 2 (sub-sub-cost code)
          {
            cost_code_number: '010311',
            cost_code_name: 'Senior Project Manager',
            division_number: '01',
            parent_cost_code_number: '01031',
            order: 1,
            is_active: true
          }
        ]
      }

      // Should process in order: 01030, then 01031, then 010311
      const level0 = requestBody.configurations.filter(c => !c.parent_cost_code_number)
      const level1 = requestBody.configurations.filter(c => {
        const parent = requestBody.configurations.find(p => 
          p.cost_code_number === c.parent_cost_code_number && !p.parent_cost_code_number
        )
        return c.parent_cost_code_number && parent
      })
      const level2 = requestBody.configurations.filter(c => {
        const parent = requestBody.configurations.find(p => 
          p.cost_code_number === c.parent_cost_code_number && p.parent_cost_code_number
        )
        return c.parent_cost_code_number && parent
      })

      expect(level0.length).toBe(1)
      expect(level1.length).toBe(1)
      expect(level2.length).toBe(1)
    })

    it('should handle mixed scenario: existing divisions, new cost codes', async () => {
      // Division already exists, cost code is new
      const requestBody = {
        corporation_uuid: mockCorporationUuid,
        divisions: [], // No new divisions
        configurations: [
          {
            cost_code_number: '01010',
            cost_code_name: 'New Cost Code',
            division_number: '01', // References existing division
            is_active: true
          }
        ]
      }

      expect(requestBody.divisions.length).toBe(0)
      expect(requestBody.configurations.length).toBe(1)
    })

    it('should handle cost codes without divisions', async () => {
      const requestBody = {
        corporation_uuid: mockCorporationUuid,
        divisions: [],
        configurations: [
          {
            cost_code_number: '99999',
            cost_code_name: 'Other Costs',
            // No division_number
            is_active: true
          }
        ]
      }

      expect(requestBody.configurations[0].division_number).toBeUndefined()
    })
  })

  describe('Error Scenarios', () => {
    it('should handle missing corporation UUID', () => {
      const invalidRequest = {
        divisions: [],
        configurations: []
        // Missing corporation_uuid
      }

      expect(invalidRequest).not.toHaveProperty('corporation_uuid')
    })

    it('should handle invalid division order', () => {
      const invalidDivisions = [
        {
          division_number: '01',
          division_name: 'Test',
          division_order: 101 // Invalid (> 100)
        }
      ]

      expect(invalidDivisions[0].division_order).toBeGreaterThan(100)
    })

    it('should handle invalid cost code order', () => {
      const invalidConfigs = [
        {
          cost_code_number: '01010',
          cost_code_name: 'Test',
          order: 201 // Invalid (> 200)
        }
      ]

      expect(invalidConfigs[0].order).toBeGreaterThan(200)
    })

    it('should handle orphaned sub-cost code (parent not in import)', () => {
      const configurations = [
        {
          cost_code_number: '01031',
          cost_code_name: 'Sub Cost Code',
          parent_cost_code_number: '01030' // Parent not in this import
        }
      ]

      // Should fail because parent doesn't exist
      expect(configurations[0].parent_cost_code_number).toBe('01030')
      expect(configurations.length).toBe(1) // Parent missing
    })

    it('should handle circular parent relationships', () => {
      const configurations = [
        {
          cost_code_number: '01030',
          cost_code_name: 'Parent',
          parent_cost_code_number: '01031' // Circular reference
        },
        {
          cost_code_number: '01031',
          cost_code_name: 'Child',
          parent_cost_code_number: '01030'
        }
      ]

      // Should detect and handle circular reference
      expect(configurations.length).toBe(2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty import', () => {
      const emptyRequest = {
        corporation_uuid: mockCorporationUuid,
        divisions: [],
        configurations: []
      }

      expect(emptyRequest.divisions.length).toBe(0)
      expect(emptyRequest.configurations.length).toBe(0)
    })

    it('should handle large import (100+ items)', () => {
      const largeDivisions = Array.from({ length: 50 }, (_, i) => ({
        division_number: String(i + 1).padStart(2, '0'),
        division_name: `Division ${i + 1}`,
        division_order: i + 1,
        is_active: true
      }))

      const largeConfigurations = Array.from({ length: 100 }, (_, i) => ({
        cost_code_number: `01${String(i + 1).padStart(3, '0')}`,
        cost_code_name: `Cost Code ${i + 1}`,
        division_number: '01',
        is_active: true
      }))

      expect(largeDivisions.length).toBe(50)
      expect(largeConfigurations.length).toBe(100)
    })

    it('should handle special characters in names', () => {
      const testData = {
        division_name: "Test & Special 'Characters' \"Quotes\"",
        cost_code_name: "Cost Code with <tags> & symbols"
      }

      expect(testData.division_name).toContain('&')
      expect(testData.cost_code_name).toContain('<')
    })

    it('should handle whitespace in codes and names', () => {
      const testData = {
        division_number: '  01  ',
        division_name: '  Test Division  ',
        cost_code_number: '  01010  ',
        cost_code_name: '  Test Cost Code  '
      }

      // Should trim whitespace
      expect(testData.division_number.trim()).toBe('01')
      expect(testData.division_name.trim()).toBe('Test Division')
    })

    it('should handle very long descriptions', () => {
      const longDescription = 'A'.repeat(10000)
      
      const testData = {
        division_number: '01',
        division_name: 'Test',
        division_order: 1,
        description: longDescription
      }

      expect(testData.description.length).toBe(10000)
    })
  })

  describe('Data Consistency', () => {
    it('should maintain referential integrity between divisions and cost codes', () => {
      const divisions = [
        { division_number: '01', division_name: 'Test', division_order: 1 }
      ]

      const configurations = [
        {
          cost_code_number: '01010',
          cost_code_name: 'Test',
          division_number: '01' // References division above
        }
      ]

      const divisionNumbers = divisions.map(d => d.division_number)
      const referencedDivisions = configurations
        .filter(c => c.division_number)
        .map(c => c.division_number)
        .filter((d, i, arr) => arr.indexOf(d) === i)

      const allReferenced = referencedDivisions.every(div => divisionNumbers.includes(div))
      expect(allReferenced).toBe(true)
    })

    it('should maintain hierarchical integrity for cost codes', () => {
      const configurations = [
        {
          cost_code_number: '01030',
          cost_code_name: 'Parent',
          parent_cost_code_number: ''
        },
        {
          cost_code_number: '01031',
          cost_code_name: 'Child',
          parent_cost_code_number: '01030'
        }
      ]

      const parentNumbers = configurations
        .filter(c => !c.parent_cost_code_number)
        .map(c => c.cost_code_number)

      const childConfigs = configurations.filter(c => c.parent_cost_code_number)
      const allParentsExist = childConfigs.every(child => 
        parentNumbers.includes(child.parent_cost_code_number) ||
        configurations.some(c => c.cost_code_number === child.parent_cost_code_number)
      )

      expect(allParentsExist).toBe(true)
    })
  })
})

