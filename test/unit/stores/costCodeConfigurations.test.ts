import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCostCodeConfigurationsStore } from '@/stores/costCodeConfigurations'

// Mock $fetch
const mockFetch = vi.fn()
global.$fetch = mockFetch as any

// Mock IndexedDB
const mockDbHelpers = {
  getCostCodeConfigurations: vi.fn(),
  addCostCodeConfiguration: vi.fn(),
  updateCostCodeConfiguration: vi.fn(),
  deleteCostCodeConfiguration: vi.fn(),
  clearCostCodeConfigurations: vi.fn(),
  saveCostCodeConfigurations: vi.fn(),
};

vi.mock('@/utils/indexedDb', () => ({
  dbHelpers: mockDbHelpers
}))

describe('Cost Code Configurations Store', () => {
  let store: ReturnType<typeof useCostCodeConfigurationsStore>

  const mockConfiguration = {
    uuid: 'config-1',
    corporation_uuid: 'corp-1',
    division_uuid: 'div-1',
    cost_code_number: '01.02.03',
    cost_code_name: 'Test Cost Code',
    parent_cost_code_uuid: null,
    order: 1,
    gl_account_uuid: 'gl-1',
    preferred_vendor_uuid: 'vendor-1',
    effective_from: '2024-01-01',
    description: 'Test description',
    update_previous_transactions: false,
    is_active: true,
    preferred_items: [
      {
        uuid: 'item-1',
        cost_code_configuration_uuid: 'config-1',
        item_type_uuid: 'type-1',
        item_name: 'Test Item',
        unit_price: 100.00,
        unit: 'EA',
        description: 'Test item',
        status: 'Active'
      }
    ],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useCostCodeConfigurationsStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have empty configurations array', () => {
      expect(store.configurations).toEqual([])
    })

    it('should not be loading', () => {
      expect(store.loading).toBe(false)
    })

    it('should have no error', () => {
      expect(store.error).toBeNull()
    })
  })

  describe('fetchConfigurations', () => {
    it('should fetch configurations successfully', async () => {
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue([mockConfiguration])

      // By default it fetches from IndexedDB
      await store.fetchConfigurations('corp-1')

      expect(mockDbHelpers.getCostCodeConfigurations).toHaveBeenCalledWith('corp-1')
      expect(store.configurations).toHaveLength(1)
      expect(store.configurations[0]).toEqual(mockConfiguration)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should set loading state during fetch', async () => {
      let loadingDuringFetch = false
      mockDbHelpers.getCostCodeConfigurations.mockImplementation(async () => {
        loadingDuringFetch = store.loading
        return []
      })

      await store.fetchConfigurations('corp-1')
      expect(loadingDuringFetch).toBe(true)
      expect(store.loading).toBe(false)
    })

    it('should handle fetch errors', async () => {
      const error = new Error('Fetch failed')
      mockDbHelpers.getCostCodeConfigurations.mockRejectedValue(error)

      await store.fetchConfigurations('corp-1')

      expect(store.error).toBe('Fetch failed')
      expect(store.loading).toBe(false)
      expect(store.configurations).toEqual([])
    })

    it('should fetch from API when useIndexedDB is false', async () => {
      mockFetch.mockResolvedValue({ data: [mockConfiguration] })

      await store.fetchConfigurations('corp-1', false, false)

      expect(mockFetch).toHaveBeenCalled()
      expect(store.configurations).toHaveLength(1)
    })

    it("should sync to IndexedDB after fetching configurations from API", async () => {
      // Mock process.client for IndexedDB sync
      const originalProcess = global.process;
      global.process = { ...originalProcess, client: true } as any;

      const configurationsData = [
        {
          uuid: "config-1",
          corporation_uuid: "corp-1",
          division_uuid: "div-1",
          cost_code_number: "01010",
          cost_code_name: "Mobilization",
          is_active: true,
          gl_account_uuid: "gl-1",
        },
        {
          uuid: "config-2",
          corporation_uuid: "corp-1",
          division_uuid: "div-1",
          cost_code_number: "01020",
          cost_code_name: "Project Management",
          is_active: true,
          gl_account_uuid: "gl-1",
        },
      ];

      // Mock API response
      mockFetch.mockResolvedValue({
        data: configurationsData,
      });

      // Mock IndexedDB save
      const mockSaveCostCodeConfigurations = vi
        .fn()
        .mockResolvedValue(undefined);
      mockDbHelpers.saveCostCodeConfigurations = mockSaveCostCodeConfigurations;

      // Fetch configurations with forceRefresh=true, useIndexedDB=false
      // This should fetch from API and sync to IndexedDB
      await store.fetchConfigurations("corp-1", true, false);

      // Verify API was called
      expect(mockFetch).toHaveBeenCalledWith("/api/cost-code-configurations", {
        query: { corporation_uuid: "corp-1" },
      });

      // Verify IndexedDB sync was called
      expect(mockSaveCostCodeConfigurations).toHaveBeenCalledWith(
        "corp-1",
        configurationsData
      );

      // Verify store has the data
      expect(store.configurations).toEqual(configurationsData);

      // Restore process
      global.process = originalProcess;
    });

    it("should handle IndexedDB sync errors gracefully during fetch", async () => {
      // Mock process.client for IndexedDB sync
      const originalProcess = global.process;
      global.process = { ...originalProcess, client: true } as any;

      const configurationsData = [
        {
          uuid: "config-1",
          corporation_uuid: "corp-1",
          division_uuid: "div-1",
          cost_code_number: "01010",
          cost_code_name: "Mobilization",
          is_active: true,
          gl_account_uuid: "gl-1",
        },
      ];

      // Mock API response
      mockFetch.mockResolvedValue({
        data: configurationsData,
      });

      // Mock IndexedDB save error
      mockDbHelpers.saveCostCodeConfigurations = vi
        .fn()
        .mockRejectedValue(new Error("IndexedDB error"));

      // Should not throw - should handle error gracefully
      await expect(
        store.fetchConfigurations("corp-1", true, false)
      ).resolves.not.toThrow();

      // Verify store still has the data despite IndexedDB error
      expect(store.configurations).toEqual(configurationsData);

      // Restore process
      global.process = originalProcess;
    });

    it('should load from IndexedDB by default', async () => {
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue([mockConfiguration])

      await store.fetchConfigurations('corp-1')

      expect(mockDbHelpers.getCostCodeConfigurations).toHaveBeenCalledWith('corp-1')
      expect(store.configurations).toHaveLength(1)
    })
  })

  describe('createConfiguration', () => {
    const newConfiguration = {
      corporation_uuid: 'corp-1',
      division_uuid: 'div-1',
      cost_code_number: '02.03.04',
      cost_code_name: 'New Cost Code',
      parent_cost_code_uuid: null,
      order: 2,
      gl_account_uuid: 'gl-1',
      preferred_vendor_uuid: null,
      effective_from: null,
      description: 'New description',
      update_previous_transactions: false,
      is_active: true,
      preferred_items: []
    }

    it('should create configuration successfully', async () => {
      const createdConfig = { ...newConfiguration, uuid: 'config-2' }
      mockFetch.mockResolvedValue({ data: createdConfig })
      mockDbHelpers.addCostCodeConfiguration.mockResolvedValue(undefined)

      const result = await store.createConfiguration(newConfiguration)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cost-code-configurations',
        expect.objectContaining({
          method: 'POST',
          body: newConfiguration
        })
      )
      expect(result).toEqual(createdConfig)
      expect(store.configurations).toContainEqual(createdConfig)
    })

    it('should add created configuration to store', async () => {
      const createdConfig = { ...newConfiguration, uuid: 'config-2' }
      mockFetch.mockResolvedValue({ data: createdConfig })
      mockDbHelpers.addCostCodeConfiguration.mockResolvedValue(undefined)

      await store.createConfiguration(newConfiguration)

      expect(store.configurations).toHaveLength(1)
      expect(store.configurations[0].uuid).toBe('config-2')
    })

    it('should sync to IndexedDB after creation', async () => {
      const createdConfig = { ...newConfiguration, uuid: 'config-2' }
      mockFetch.mockResolvedValue({ data: createdConfig })
      mockDbHelpers.addCostCodeConfiguration.mockResolvedValue(undefined)

      await store.createConfiguration(newConfiguration)

      expect(mockDbHelpers.addCostCodeConfiguration).toHaveBeenCalledWith('corp-1', createdConfig)
    })

    it('should throw error on creation failure', async () => {
      mockFetch.mockRejectedValue(new Error('Creation failed'))

      await expect(store.createConfiguration(newConfiguration)).rejects.toThrow('Creation failed')
    })

    it('should not add to store on creation failure', async () => {
      mockFetch.mockRejectedValue(new Error('Creation failed'))
      const initialLength = store.configurations.length

      try {
        await store.createConfiguration(newConfiguration)
      } catch (e) {
        // Expected error
      }

      expect(store.configurations).toHaveLength(initialLength)
    })
  })

  describe('updateConfiguration', () => {
    const updateData = {
      cost_code_name: 'Updated Cost Code',
      description: 'Updated description',
      preferred_items: [
        {
          item_name: 'Updated Item',
          item_type_uuid: 'type-1',
          unit_price: 150.00,
          unit: 'EA',
          description: 'Updated item',
          status: 'Active'
        }
      ]
    }

    beforeEach(async () => {
      // Load configuration into store first
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue([mockConfiguration])
      await store.fetchConfigurations('corp-1')
    })

    it('should update configuration successfully', async () => {
      const updatedConfig = { ...mockConfiguration, ...updateData }
      mockFetch.mockResolvedValue({ data: updatedConfig })
      mockDbHelpers.updateCostCodeConfiguration.mockResolvedValue(undefined)

      const result = await store.updateConfiguration('config-1', updateData)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cost-code-configurations/config-1',
        expect.objectContaining({
          method: 'PUT',
          body: updateData
        })
      )
      expect(result).toEqual(updatedConfig)
    })

    it('should update configuration in store', async () => {
      const updatedConfig = { ...mockConfiguration, ...updateData }
      mockFetch.mockResolvedValue({ data: updatedConfig })
      mockDbHelpers.updateCostCodeConfiguration.mockResolvedValue(undefined)

      await store.updateConfiguration('config-1', updateData)

      const config = store.configurations.find(c => c.uuid === 'config-1')
      expect(config?.cost_code_name).toBe('Updated Cost Code')
      expect(config?.description).toBe('Updated description')
    })

    it('should sync to IndexedDB after update', async () => {
      const updatedConfig = { ...mockConfiguration, ...updateData }
      mockFetch.mockResolvedValue({ data: updatedConfig })
      mockDbHelpers.updateCostCodeConfiguration.mockResolvedValue(undefined)

      await store.updateConfiguration('config-1', updateData)

      expect(mockDbHelpers.updateCostCodeConfiguration).toHaveBeenCalledWith('corp-1', updatedConfig)
    })

    it('should throw error on update failure', async () => {
      mockFetch.mockRejectedValue(new Error('Update failed'))

      await expect(store.updateConfiguration('config-1', updateData)).rejects.toThrow('Update failed')
    })

    it('should not modify store on update failure', async () => {
      mockFetch.mockRejectedValue(new Error('Update failed'))
      const originalName = store.configurations[0].cost_code_name

      try {
        await store.updateConfiguration('config-1', updateData)
      } catch (e) {
        // Expected error
      }

      // Configuration should remain unchanged
      expect(store.configurations[0].cost_code_name).toBe(originalName)
    })
  })

  describe('deleteConfiguration', () => {
    beforeEach(async () => {
      // Load configurations into store first
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue([
        mockConfiguration, 
        { ...mockConfiguration, uuid: 'config-2' }
      ])
      await store.fetchConfigurations('corp-1')
    })

    it('should delete configuration successfully', async () => {
      mockFetch.mockResolvedValue(undefined)
      mockDbHelpers.deleteCostCodeConfiguration.mockResolvedValue(undefined)

      await store.deleteConfiguration('config-1')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cost-code-configurations/config-1',
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })

    it('should remove configuration from store', async () => {
      mockFetch.mockResolvedValue(undefined)
      mockDbHelpers.deleteCostCodeConfiguration.mockResolvedValue(undefined)

      await store.deleteConfiguration('config-1')

      expect(store.configurations).toHaveLength(1)
      expect(store.configurations.find(c => c.uuid === 'config-1')).toBeUndefined()
    })

    it('should remove from IndexedDB after deletion', async () => {
      mockFetch.mockResolvedValue(undefined)
      mockDbHelpers.deleteCostCodeConfiguration.mockResolvedValue(undefined)

      await store.deleteConfiguration('config-1')

      expect(mockDbHelpers.deleteCostCodeConfiguration).toHaveBeenCalledWith('corp-1', 'config-1')
    })

    it('should throw error on deletion failure', async () => {
      mockFetch.mockRejectedValue(new Error('Deletion failed'))

      await expect(store.deleteConfiguration('config-1')).rejects.toThrow('Deletion failed')
    })

    it('should not remove from store on deletion failure', async () => {
      mockFetch.mockRejectedValue(new Error('Deletion failed'))
      const initialLength = store.configurations.length

      try {
        await store.deleteConfiguration('config-1')
      } catch (e) {
        // Expected error
      }

      expect(store.configurations).toHaveLength(initialLength)
    })
  })

  describe('getConfigurationById', () => {
    beforeEach(async () => {
      // Load configurations via fetchConfigurations
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue([mockConfiguration])
      await store.fetchConfigurations('corp-1')
    })

    it('should return configuration by uuid', () => {
      const config = store.getConfigurationById('config-1')
      expect(config).toEqual(mockConfiguration)
    })

    it('should return undefined for non-existent uuid', () => {
      const config = store.getConfigurationById('non-existent')
      expect(config).toBeUndefined()
    })
  })

  describe('getActiveConfigurations', () => {
    beforeEach(async () => {
      // Load configurations via fetchConfigurations
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue([
        mockConfiguration,
        { ...mockConfiguration, uuid: 'config-2', is_active: false }
      ])
      await store.fetchConfigurations('corp-1')
    })

    it('should return only active configurations', () => {
      const activeConfigs = store.getActiveConfigurations('corp-1')
      expect(activeConfigs).toHaveLength(1)
      expect(activeConfigs[0].uuid).toBe('config-1')
    })

    it('should filter by corporation uuid', async () => {
      // Clear and reload with fresh data including another corporation
      mockDbHelpers.getCostCodeConfigurations.mockClear()
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue([
        mockConfiguration,
        { ...mockConfiguration, uuid: 'config-3', corporation_uuid: 'corp-2', is_active: true }
      ])
      
      // Clear existing configurations and force fresh fetch
      store.clearConfigurations()
      await store.fetchConfigurations('corp-1')

      const activeConfigs = store.getActiveConfigurations('corp-1')
      expect(activeConfigs).toHaveLength(1)
      expect(activeConfigs[0].corporation_uuid).toBe('corp-1')
    })

    it('should return empty array if no active configurations', async () => {
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue([
        { ...mockConfiguration, is_active: false }
      ])
      await store.fetchConfigurations('corp-1', true)

      const activeConfigs = store.getActiveConfigurations('corp-1')
      expect(activeConfigs).toEqual([])
    })
  })

  describe('Preferred Items', () => {
    it('should include preferred items in configuration', async () => {
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue([mockConfiguration])

      await store.fetchConfigurations('corp-1')

      const config = store.configurations[0]
      expect(config.preferred_items).toHaveLength(1)
      expect(config.preferred_items[0].item_name).toBe('Test Item')
    })

    it('should handle empty preferred items', async () => {
      const configWithoutItems = { ...mockConfiguration, preferred_items: [] }
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue([configWithoutItems])

      await store.fetchConfigurations('corp-1')

      const config = store.configurations[0]
      expect(config.preferred_items).toEqual([])
    })

    it('should include model_number in preferred items', async () => {
      const configWithModelNumber = {
        ...mockConfiguration,
        preferred_items: [
          {
            ...mockConfiguration.preferred_items[0],
            model_number: 'MODEL-123'
          }
        ]
      }
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue([configWithModelNumber])

      await store.fetchConfigurations('corp-1')

      const config = store.configurations[0]
      expect(config.preferred_items[0].model_number).toBe('MODEL-123')
    })

    it('should handle preferred items without model_number', async () => {
      const configWithoutModelNumber = {
        ...mockConfiguration,
        preferred_items: [
          {
            ...mockConfiguration.preferred_items[0],
            model_number: null
          }
        ]
      }
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue([configWithoutModelNumber])

      await store.fetchConfigurations('corp-1')

      const config = store.configurations[0]
      expect(config.preferred_items[0].model_number).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should set error state on DB failure', async () => {
      mockDbHelpers.getCostCodeConfigurations.mockRejectedValue(new Error('DB Error'))

      await store.fetchConfigurations('corp-1')

      expect(store.error).toContain('DB Error')
    })

    it('should clear error on successful fetch', async () => {
      // Set error first
      mockDbHelpers.getCostCodeConfigurations.mockRejectedValue(new Error('Previous error'))
      await store.fetchConfigurations('corp-1')
      expect(store.error).not.toBeNull()

      // Now clear it with successful fetch - clear and try again
      store.clearConfigurations()
      mockDbHelpers.getCostCodeConfigurations.mockClear()
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue([])
      await store.fetchConfigurations('corp-1')

      expect(store.error).toBeNull()
    })
  })

  describe('Loading State', () => {
    it('should set loading to true at start of fetch', async () => {
      let loadingDuringFetch = false

      mockDbHelpers.getCostCodeConfigurations.mockImplementation(async () => {
        loadingDuringFetch = store.loading
        return []
      })

      await store.fetchConfigurations('corp-1')

      expect(loadingDuringFetch).toBe(true)
    })

    it('should set loading to false after fetch completes', async () => {
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue([])

      await store.fetchConfigurations('corp-1')

      expect(store.loading).toBe(false)
    })

    it('should set loading to false after fetch fails', async () => {
      mockDbHelpers.getCostCodeConfigurations.mockRejectedValue(new Error('Fetch failed'))

      await store.fetchConfigurations('corp-1')

      expect(store.loading).toBe(false)
    })
  })

  describe("Item Management Getters", () => {
    beforeEach(() => {
      // Reset store and set up test data
      store.clearConfigurations();
      mockDbHelpers.getCostCodeConfigurations.mockResolvedValue([
        {
          ...mockConfiguration,
          uuid: "config-1",
          cost_code_number: "01.02.03",
          cost_code_name: "Cost Code 1",
          preferred_items: [
            {
              uuid: "item-1",
              item_type_uuid: "type-1",
              item_name: "Item 1",
              unit_price: 100.0,
              unit: "EA",
              description: "Test item 1",
              status: "Active",
            },
            {
              uuid: "item-2",
              item_type_uuid: "type-2",
              item_name: "Item 2",
              unit_price: 200.0,
              unit: "FT",
              description: "Test item 2",
              status: "Inactive",
            },
          ],
        },
        {
          ...mockConfiguration,
          uuid: "config-2",
          cost_code_number: "02.03.04",
          cost_code_name: "Cost Code 2",
          preferred_items: [
            {
              uuid: "item-3",
              item_type_uuid: "type-1",
              item_name: "Item 3",
              unit_price: 150.0,
              unit: "EA",
              description: "Test item 3",
              status: "Active",
            },
          ],
        },
        {
          ...mockConfiguration,
          uuid: "config-3",
          cost_code_number: "03.04.05",
          cost_code_name: "Cost Code 3",
          preferred_items: [],
        },
      ]);
    });

    describe("getAllItems", () => {
      it("should return all items across all cost codes for a corporation", async () => {
        await store.fetchConfigurations("corp-1");

        const items = store.getAllItems("corp-1");

        expect(items).toHaveLength(3);
        expect(items[0].item_name).toBe("Item 1");
        expect(items[1].item_name).toBe("Item 2");
        expect(items[2].item_name).toBe("Item 3");
      });

      it("should include cost code information with each item", async () => {
        await store.fetchConfigurations("corp-1");

        const items = store.getAllItems("corp-1");

        expect(items[0].cost_code_configuration_uuid).toBe("config-1");
        expect(items[0].cost_code_number).toBe("01.02.03");
        expect(items[0].cost_code_name).toBe("Cost Code 1");
      });

      it("should return empty array when no configurations exist", () => {
        const items = store.getAllItems("corp-1");

        expect(items).toEqual([]);
      });

      it("should return empty array when no items exist in any configuration", async () => {
        mockDbHelpers.getCostCodeConfigurations.mockResolvedValue([
          {
            ...mockConfiguration,
            uuid: "config-1",
            preferred_items: [],
          },
        ]);

        await store.fetchConfigurations("corp-1");
        const items = store.getAllItems("corp-1");

        expect(items).toEqual([]);
      });

      it("should filter by corporation uuid", async () => {
        mockDbHelpers.getCostCodeConfigurations.mockResolvedValue([
          {
            ...mockConfiguration,
            corporation_uuid: "corp-1",
            preferred_items: [
              {
                uuid: "item-1",
                item_name: "Item 1",
                unit_price: 100,
                unit: "EA",
                status: "Active",
                item_type_uuid: "type-1",
              },
            ],
          },
          {
            ...mockConfiguration,
            corporation_uuid: "corp-2",
            preferred_items: [
              {
                uuid: "item-2",
                item_name: "Item 2",
                unit_price: 200,
                unit: "EA",
                status: "Active",
                item_type_uuid: "type-1",
              },
            ],
          },
        ]);

        await store.fetchConfigurations("corp-1");
        const items = store.getAllItems("corp-1");

        expect(items).toHaveLength(1);
        expect(items[0].item_name).toBe("Item 1");
      });
    });

    describe("getItemById", () => {
      it("should return item by uuid with cost code information", async () => {
        await store.fetchConfigurations("corp-1");

        const item = store.getItemById("item-2");

        expect(item).not.toBeNull();
        expect(item?.item_name).toBe("Item 2");
        expect(item?.cost_code_configuration_uuid).toBe("config-1");
        expect(item?.cost_code_number).toBe("01.02.03");
        expect(item?.cost_code_name).toBe("Cost Code 1");
      });

      it("should return null when item not found", async () => {
        await store.fetchConfigurations("corp-1");

        const item = store.getItemById("non-existent-item");

        expect(item).toBeNull();
      });

      it("should return null when no configurations exist", () => {
        const item = store.getItemById("item-1");

        expect(item).toBeNull();
      });

      it("should find item in any configuration", async () => {
        await store.fetchConfigurations("corp-1");

        const item1 = store.getItemById("item-1");
        const item3 = store.getItemById("item-3");

        expect(item1?.cost_code_configuration_uuid).toBe("config-1");
        expect(item3?.cost_code_configuration_uuid).toBe("config-2");
      });
    });

    describe("getItemsByCostCode", () => {
      it("should return items for a specific cost code", async () => {
        await store.fetchConfigurations("corp-1");

        const items = store.getItemsByCostCode("config-1");

        expect(items).toHaveLength(2);
        expect(items[0].item_name).toBe("Item 1");
        expect(items[1].item_name).toBe("Item 2");
      });

      it("should return empty array when cost code not found", async () => {
        await store.fetchConfigurations("corp-1");

        const items = store.getItemsByCostCode("non-existent-config");

        expect(items).toEqual([]);
      });

      it("should return empty array when cost code has no items", async () => {
        await store.fetchConfigurations("corp-1");

        const items = store.getItemsByCostCode("config-3");

        expect(items).toEqual([]);
      });

      it("should return different items for different cost codes", async () => {
        await store.fetchConfigurations("corp-1");

        const items1 = store.getItemsByCostCode("config-1");
        const items2 = store.getItemsByCostCode("config-2");

        expect(items1).toHaveLength(2);
        expect(items2).toHaveLength(1);
        expect(items1[0].item_name).toBe("Item 1");
        expect(items2[0].item_name).toBe("Item 3");
      });
    });
  });
})

