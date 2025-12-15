import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from "pinia";

// Mock $fetch
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Mock IndexedDB helpers using vi.hoisted
const mockDbHelpers = vi.hoisted(() => ({
  addVendor: vi.fn(),
  updateVendor: vi.fn(),
  deleteVendor: vi.fn(),
  deleteAllVendors: vi.fn(),
}))

vi.mock('@/utils/indexedDb', () => ({
  dbHelpers: mockDbHelpers
}))

import { useVendorStore } from '../../../stores/vendors'

describe('Vendor Store', () => {
  let store: ReturnType<typeof useVendorStore>

  beforeEach(() => {
    // Setup process.env before Pinia
    ;(global as any).process = { 
      server: false, 
      client: true,
      env: { NODE_ENV: 'test' }
    }
    
    setActivePinia(createPinia())
    store = useVendorStore()
    // Reset store state
    store.vendors = []
    store.loading = false
    store.error = null
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.vendors).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('addVendor', () => {
    const newVendorData = {
      vendor_name: 'New Vendor',
      vendor_type: 'Supplier',
      vendor_address: '789 Pine St',
      vendor_city: 'New City',
      vendor_state: 'NC',
      vendor_country: 'New Country',
      vendor_zip: '67890',
      vendor_phone: '555-9999',
      vendor_email: 'new@vendor.com',
      is_1099: true,
      vendor_federal_id: '98-7654321',
      vendor_ssn: '',
      company_name: 'New Company',
      check_printed_as: 'New Company',
      doing_business_as: 'New DBA',
      salutation: 'Dr.',
      first_name: 'New',
      middle_name: 'N',
      last_name: 'Vendor',
      opening_balance: 500.00,
      opening_balance_date: '2024-01-03',
      is_active: true
    }

    const createdVendor = {
      id: 3,
      uuid: 'vendor-3',
      corporation_uuid: 'corp-1',
      ...newVendorData,
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z'
    }

    it('should create vendor successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        success: true,
        data: createdVendor,
        message: 'Vendor created successfully'
      })

      const result = await store.addVendor('corp-1', newVendorData)

      expect(mockFetch).toHaveBeenCalledWith("/api/purchase-orders/vendors", {
        method: "POST",
        body: {
          ...newVendorData,
          corporation_uuid: "corp-1",
        },
      });
      expect(result).toEqual({
        success: true,
        data: createdVendor,
        message: 'Vendor created successfully'
      })
      expect(store.vendors).toHaveLength(1)
      expect(store.vendors[0]).toEqual(createdVendor)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle create error', async () => {
      const errorMessage = 'Failed to create vendor'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.addVendor('corp-1', newVendorData)).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.loading).toBe(false)
    })
  })

  describe('updateVendor', () => {
    const existingVendor = {
      id: 1,
      uuid: 'vendor-1',
      corporation_uuid: 'corp-1',
      vendor_name: 'Test Vendor',
      vendor_type: 'Supplier',
      vendor_address: '123 Main St',
      vendor_city: 'Test City',
      vendor_state: 'TS',
      vendor_country: 'Test Country',
      vendor_zip: '12345',
      vendor_phone: '555-1234',
      vendor_email: 'test@vendor.com',
      is_1099: true,
      vendor_federal_id: '12-3456789',
      vendor_ssn: '',
      company_name: 'Test Company',
      check_printed_as: 'Test Company',
      doing_business_as: 'Test DBA',
      salutation: 'Mr.',
      first_name: 'John',
      middle_name: '',
      last_name: 'Doe',
      opening_balance: 1000.00,
      opening_balance_date: '2024-01-01',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    const updateData = {
      vendor_name: 'Updated Vendor',
      vendor_phone: '555-9999',
      vendor_email: 'updated@vendor.com'
    }

    const updatedVendor = {
      ...existingVendor,
      ...updateData,
      updated_at: '2024-01-03T00:00:00Z'
    }

    it('should update vendor successfully', async () => {
      // Add existing vendor to store
      store.vendors = [existingVendor]

      mockFetch.mockResolvedValueOnce({
        success: true,
        data: updatedVendor,
        message: 'Vendor updated successfully'
      })

      const result = await store.updateVendor('corp-1', existingVendor, updateData)

      expect(mockFetch).toHaveBeenCalledWith("/api/purchase-orders/vendors", {
        method: "PUT",
        body: {
          ...updateData,
          uuid: "vendor-1",
          corporation_uuid: "corp-1",
        },
      });
      expect(result).toEqual({
        success: true,
        data: updatedVendor,
        message: 'Vendor updated successfully'
      })
      expect(store.vendors[0]).toEqual(updatedVendor)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle update error', async () => {
      const errorMessage = 'Failed to update vendor'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.updateVendor('corp-1', existingVendor, updateData)).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.loading).toBe(false)
    })
  })

  describe('deleteVendor', () => {
    const existingVendor = {
      id: 1,
      uuid: 'vendor-1',
      corporation_uuid: 'corp-1',
      vendor_name: 'Test Vendor',
      vendor_type: 'Supplier',
      vendor_address: '123 Main St',
      vendor_city: 'Test City',
      vendor_state: 'TS',
      vendor_country: 'Test Country',
      vendor_zip: '12345',
      vendor_phone: '555-1234',
      vendor_email: 'test@vendor.com',
      is_1099: true,
      vendor_federal_id: '12-3456789',
      vendor_ssn: '',
      company_name: 'Test Company',
      check_printed_as: 'Test Company',
      doing_business_as: 'Test DBA',
      salutation: 'Mr.',
      first_name: 'John',
      middle_name: '',
      last_name: 'Doe',
      opening_balance: 1000.00,
      opening_balance_date: '2024-01-01',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    it('should delete vendor successfully', async () => {
      // Add existing vendor to store
      store.vendors = [existingVendor]

      mockFetch.mockResolvedValueOnce({
        success: true
      })

      const result = await store.deleteVendor('corp-1', existingVendor)

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/purchase-orders/vendors?uuid=vendor-1",
        {
          method: "DELETE",
        }
      );
      expect(result).toEqual({
        success: true
      })
      expect(store.vendors).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle delete error', async () => {
      const errorMessage = 'Failed to delete vendor'
      mockFetch.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.deleteVendor('corp-1', existingVendor)).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.loading).toBe(false)
    })
  })

  describe('Cache Management', () => {
    it('should clear all cache when no corporation specified', () => {
      // Add some vendors to the store
      store.vendors = [
        {
          id: 1,
          uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          vendor_name: 'Vendor 1',
          vendor_type: 'Supplier',
          vendor_address: '123 Main St',
          vendor_city: 'Test City',
          vendor_state: 'TS',
          vendor_country: 'Test Country',
          vendor_zip: '12345',
          vendor_phone: '555-1234',
          vendor_email: 'test1@vendor.com',
          is_1099: true,
          vendor_federal_id: '12-3456789',
          vendor_ssn: '',
          company_name: 'Test Company 1',
          check_printed_as: 'Test Company 1',
          doing_business_as: 'Test DBA 1',
          salutation: 'Mr.',
          first_name: 'John',
          middle_name: '',
          last_name: 'Doe',
          opening_balance: 1000.00,
          opening_balance_date: '2024-01-01',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      store.clearCache()

      expect(store.vendors).toEqual([])
    })
  })

  describe('Force Refresh from API', () => {
    it('should force refresh from API bypassing IndexedDB', async () => {
      const mockVendors = [
        {
          id: 1,
          uuid: 'vendor-1',
          corporation_uuid: 'corp-1',
          vendor_name: 'API Vendor',
          vendor_type: 'Supplier',
          vendor_address: '123 Main St',
          vendor_city: 'Test City',
          vendor_state: 'TS',
          vendor_country: 'Test Country',
          vendor_zip: '12345',
          vendor_phone: '555-1234',
          vendor_email: 'api@vendor.com',
          is_1099: true,
          vendor_federal_id: '12-3456789',
          vendor_ssn: '',
          company_name: 'API Company',
          check_printed_as: 'API Company',
          doing_business_as: 'API DBA',
          salutation: 'Mr.',
          first_name: 'API',
          middle_name: '',
          last_name: 'Vendor',
          opening_balance: 1000.00,
          opening_balance_date: '2024-01-01',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockFetch.mockResolvedValueOnce({
        data: mockVendors
      })

      await store.refreshVendorsFromAPI('corp-1')

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/purchase-orders/vendors?corporation_uuid=corp-1"
      );
      expect(store.vendors).toEqual(mockVendors)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe("IndexedDB Synchronization", () => {
    beforeEach(() => {
      // Clear all mocks before each test
      vi.clearAllMocks();
    });

    describe("addVendor with IndexedDB sync", () => {
      it("should sync new vendor to IndexedDB", async () => {
        const newVendorData = {
          vendor_name: "New Vendor",
          vendor_type: "Supplier",
          vendor_address: "123 Main St",
          vendor_phone: "555-1234",
          vendor_email: "new@vendor.com",
          is_active: true,
        };

        const createdVendor = {
          id: 3,
          uuid: "vendor-3",
          corporation_uuid: "corp-1",
          ...newVendorData,
          created_at: "2024-01-03T00:00:00Z",
          updated_at: "2024-01-03T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          success: true,
          data: createdVendor,
        });

        mockDbHelpers.addVendor.mockResolvedValue(undefined);

        const result = await store.addVendor("corp-1", newVendorData);

        expect(mockDbHelpers.addVendor).toHaveBeenCalledWith(
          "corp-1",
          createdVendor
        );
        expect(store.vendors).toHaveLength(1);
        expect(store.vendors[0]).toEqual(createdVendor);
        expect(result.success).toBe(true);
      });

      it("should handle IndexedDB sync failure gracefully", async () => {
        const newVendorData = {
          vendor_name: "New Vendor",
          vendor_type: "Supplier",
          vendor_address: "123 Main St",
          vendor_phone: "555-1234",
          vendor_email: "new@vendor.com",
          is_active: true,
        };

        const createdVendor = {
          id: 3,
          uuid: "vendor-3",
          corporation_uuid: "corp-1",
          ...newVendorData,
          created_at: "2024-01-03T00:00:00Z",
          updated_at: "2024-01-03T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          success: true,
          data: createdVendor,
        });

        mockDbHelpers.addVendor.mockRejectedValue(new Error("IndexedDB error"));

        const consoleSpy = vi
          .spyOn(console, "warn")
          .mockImplementation(() => {});

        const result = await store.addVendor("corp-1", newVendorData);

        expect(mockDbHelpers.addVendor).toHaveBeenCalledWith(
          "corp-1",
          createdVendor
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to sync vendor to IndexedDB:",
          expect.any(Error)
        );
        expect(store.vendors).toHaveLength(1);
        expect(store.vendors[0]).toEqual(createdVendor);
        expect(result.success).toBe(true);

        consoleSpy.mockRestore();
      });
    });

    describe("updateVendor with IndexedDB sync", () => {
      it("should sync updated vendor to IndexedDB", async () => {
        const existingVendor = {
          id: 1,
          uuid: "vendor-1",
          corporation_uuid: "corp-1",
          vendor_name: "Test Vendor",
          vendor_type: "Supplier",
          vendor_address: "123 Main St",
          vendor_phone: "555-1234",
          vendor_email: "test@vendor.com",
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        };

        const updateData = {
          vendor_name: "Updated Vendor",
          vendor_phone: "555-9999",
        };

        const updatedVendor = {
          ...existingVendor,
          ...updateData,
          updated_at: "2024-01-03T00:00:00Z",
        };

        store.vendors = [existingVendor];

        mockFetch.mockResolvedValue({
          success: true,
          data: updatedVendor,
        });

        mockDbHelpers.updateVendor.mockResolvedValue(undefined);

        const result = await store.updateVendor(
          "corp-1",
          existingVendor,
          updateData
        );

        expect(mockDbHelpers.updateVendor).toHaveBeenCalledWith(
          "corp-1",
          updatedVendor
        );
        expect(store.vendors[0]).toEqual(updatedVendor);
        expect(result.success).toBe(true);
      });
    });

    describe("deleteVendor with IndexedDB sync", () => {
      it("should sync vendor deletion to IndexedDB", async () => {
        const existingVendor = {
          id: 1,
          uuid: "vendor-1",
          corporation_uuid: "corp-1",
          vendor_name: "Test Vendor",
          vendor_type: "Supplier",
          vendor_address: "123 Main St",
          vendor_phone: "555-1234",
          vendor_email: "test@vendor.com",
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        };

        store.vendors = [existingVendor];

        mockFetch.mockResolvedValue({
          success: true,
          message: "Vendor deleted successfully",
        });

        mockDbHelpers.deleteVendor.mockResolvedValue(undefined);

        const result = await store.deleteVendor("corp-1", existingVendor);

        expect(mockDbHelpers.deleteVendor).toHaveBeenCalledWith(
          "corp-1",
          "vendor-1"
        );
        expect(store.vendors).toHaveLength(0);
        expect(result.success).toBe(true);
      });
    });

    describe("bulkImportVendors", () => {
      it("should bulk import vendors and refresh from IndexedDB", async () => {
        const vendorsData = [
          {
            vendor_name: "Vendor 1",
            vendor_type: "Supplier",
            vendor_address: "123 Main St",
            vendor_phone: "555-1234",
            vendor_email: "vendor1@test.com",
            is_active: true,
          },
          {
            vendor_name: "Vendor 2",
            vendor_type: "Contractor",
            vendor_address: "456 Oak St",
            vendor_phone: "555-5678",
            vendor_email: "vendor2@test.com",
            is_active: true,
          },
        ];

        const bulkResult = {
          success: true,
          message:
            "Import completed: 2 new vendors added, 0 duplicates skipped",
          data: {
            new: 2,
            duplicates: 0,
            total: 2,
            errors: 0,
          },
        };

        const refreshedVendors = [
          {
            id: 1,
            uuid: "vendor-1",
            corporation_uuid: "corp-1",
            ...vendorsData[0],
            created_at: "2024-01-03T00:00:00Z",
            updated_at: "2024-01-03T00:00:00Z",
          },
          {
            id: 2,
            uuid: "vendor-2",
            corporation_uuid: "corp-1",
            ...vendorsData[1],
            created_at: "2024-01-03T00:00:00Z",
            updated_at: "2024-01-03T00:00:00Z",
          },
        ];

        mockFetch
          .mockResolvedValueOnce(bulkResult) // Bulk import call
          .mockResolvedValueOnce({ data: refreshedVendors }); // Refresh call

        const result = await store.bulkImportVendors("corp-1", vendorsData);

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/purchase-orders/vendors/bulk",
          {
            method: "POST",
            body: {
              corporation_uuid: "corp-1",
              vendors: vendorsData,
            },
          }
        );

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/purchase-orders/vendors?corporation_uuid=corp-1"
        );

        expect(result).toEqual(bulkResult);
        expect(store.vendors).toEqual(refreshedVendors);
      });
    });

    describe("deleteAllVendors", () => {
      it("should delete all vendors and sync to IndexedDB", async () => {
        const existingVendors = [
          {
            id: 1,
            uuid: "vendor-1",
            corporation_uuid: "corp-1",
            vendor_name: "Vendor 1",
            vendor_type: "Supplier",
            vendor_address: "123 Main St",
            vendor_phone: "555-1234",
            vendor_email: "vendor1@test.com",
            is_active: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
          {
            id: 2,
            uuid: "vendor-2",
            corporation_uuid: "corp-1",
            vendor_name: "Vendor 2",
            vendor_type: "Contractor",
            vendor_address: "456 Oak St",
            vendor_phone: "555-5678",
            vendor_email: "vendor2@test.com",
            is_active: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ];

        store.vendors = existingVendors;

        const deleteResult = {
          success: true,
          message: "Successfully deleted 2 vendors",
          data: {
            deleted_count: 2,
          },
        };

        mockFetch.mockResolvedValue(deleteResult);
        mockDbHelpers.deleteAllVendors.mockResolvedValue(undefined);

        const result = await store.deleteAllVendors("corp-1");

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/purchase-orders/vendors/delete-all",
          {
            method: "DELETE",
            query: { corporation_uuid: "corp-1" },
          }
        );

        expect(mockDbHelpers.deleteAllVendors).toHaveBeenCalledWith("corp-1");
        expect(store.vendors).toHaveLength(0);
        expect(result).toEqual(deleteResult);
      });

      it("should handle IndexedDB sync failure gracefully", async () => {
        const existingVendors = [
          {
            id: 1,
            uuid: "vendor-1",
            corporation_uuid: "corp-1",
            vendor_name: "Vendor 1",
            vendor_type: "Supplier",
            vendor_address: "123 Main St",
            vendor_phone: "555-1234",
            vendor_email: "vendor1@test.com",
            is_active: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ];

        store.vendors = existingVendors;

        const deleteResult = {
          success: true,
          message: "Successfully deleted 1 vendor",
          data: {
            deleted_count: 1,
          },
        };

        mockFetch.mockResolvedValue(deleteResult);
        mockDbHelpers.deleteAllVendors.mockRejectedValue(
          new Error("IndexedDB error")
        );

        const consoleSpy = vi
          .spyOn(console, "warn")
          .mockImplementation(() => {});

        const result = await store.deleteAllVendors("corp-1");

        expect(mockDbHelpers.deleteAllVendors).toHaveBeenCalledWith("corp-1");
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to sync vendors bulk deletion to IndexedDB:",
          expect.any(Error)
        );
        expect(store.vendors).toHaveLength(0);
        expect(result).toEqual(deleteResult);

        consoleSpy.mockRestore();
      });
    });
  });
})