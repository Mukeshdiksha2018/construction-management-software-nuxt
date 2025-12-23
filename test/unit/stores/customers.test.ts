import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from "pinia";

// Mock $fetch
const mockApiFetch = vi.fn()
const mockUseApiClient = vi.fn(() => ({
  apiFetch: mockApiFetch
}))

vi.stubGlobal('useApiClient', mockUseApiClient)

import { useCustomerStore } from '../../../stores/customers'

describe('Customer Store', () => {
  let store: ReturnType<typeof useCustomerStore>

  beforeEach(() => {
    // Setup process.env before Pinia
    ;(global as any).process = { 
      server: false, 
      client: true,
      env: { NODE_ENV: 'test' }
    }
    
    setActivePinia(createPinia())
    store = useCustomerStore()
    // Reset store state
    store.customers = []
    store.loading = false
    store.error = null
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.customers).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe('fetchCustomers', () => {
    const mockCustomers = [
      {
        id: 1,
        uuid: 'customer-1',
        corporation_uuid: 'corp-1',
        project_uuid: 'project-1',
        customer_address: '123 Main St',
        customer_city: 'Test City',
        customer_state: 'TS',
        customer_country: 'Test Country',
        customer_zip: '12345',
        customer_phone: '555-1234',
        customer_email: 'test@customer.com',
        company_name: 'Test Company',
        salutation: 'Mr.',
        first_name: 'John',
        middle_name: '',
        last_name: 'Doe',
        profile_image_url: '',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ]

    it('should fetch customers successfully', async () => {
      mockApiFetch.mockResolvedValueOnce({
        data: mockCustomers
      })

      await store.fetchCustomers('corp-1')

      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/customers?corporation_uuid=corp-1"
      );
      expect(store.customers).toEqual(mockCustomers)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should fetch customers with project filter', async () => {
      mockApiFetch.mockResolvedValueOnce({
        data: mockCustomers
      })

      await store.fetchCustomers('corp-1', 'project-1')

      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/customers?corporation_uuid=corp-1&project_uuid=project-1"
      );
      expect(store.customers).toEqual(mockCustomers)
    })

    it('should handle fetch errors', async () => {
      const errorMessage = 'Failed to fetch customers'
      mockApiFetch.mockResolvedValueOnce({
        error: errorMessage
      })

      await store.fetchCustomers('corp-1')

      expect(store.error).toBe(errorMessage)
      expect(store.customers).toEqual([])
      expect(store.loading).toBe(false)
    })

    it('should not fetch on server side', async () => {
      ;(global as any).process.server = true
      
      await store.fetchCustomers('corp-1')

      expect(mockApiFetch).not.toHaveBeenCalled()
      
      ;(global as any).process.server = false
    })

    it('should skip fetch if data is cached', async () => {
      // First fetch
      mockApiFetch.mockResolvedValueOnce({
        data: mockCustomers
      })

      await store.fetchCustomers('corp-1')
      expect(mockApiFetch).toHaveBeenCalledTimes(1)

      // Second fetch should be skipped
      await store.fetchCustomers('corp-1')
      expect(mockApiFetch).toHaveBeenCalledTimes(1)
    })

    it('should force refresh when forceRefresh is true', async () => {
      mockApiFetch.mockResolvedValue({
        data: mockCustomers
      })

      await store.fetchCustomers('corp-1')
      expect(mockApiFetch).toHaveBeenCalledTimes(1)

      await store.fetchCustomers('corp-1', null, true)
      expect(mockApiFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('addCustomer', () => {
    const newCustomerData = {
      customer_address: '789 Pine St',
      customer_city: 'New City',
      customer_state: 'NC',
      customer_country: 'New Country',
      customer_zip: '67890',
      customer_phone: '555-9999',
      customer_email: 'new@customer.com',
      company_name: 'New Company',
      salutation: 'Dr.',
      first_name: 'New',
      middle_name: 'N',
      last_name: 'Customer',
      profile_image_url: ''
    }

    const createdCustomer = {
      id: 3,
      uuid: 'customer-3',
      corporation_uuid: 'corp-1',
      ...newCustomerData,
      is_active: true,
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z'
    }

    it('should create customer successfully', async () => {
      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: createdCustomer,
        message: 'Customer created successfully'
      })

      const result = await store.addCustomer('corp-1', newCustomerData)

      expect(mockApiFetch).toHaveBeenCalledWith("/api/customers", {
        method: "POST",
        body: {
          ...newCustomerData,
          corporation_uuid: "corp-1",
        },
      });
      expect(result).toEqual({
        success: true,
        data: createdCustomer,
        message: 'Customer created successfully'
      })
      expect(store.customers).toHaveLength(1)
      expect(store.customers[0]).toEqual(createdCustomer)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle create error', async () => {
      const errorMessage = 'Failed to create customer'
      mockApiFetch.mockResolvedValueOnce({
        error: errorMessage
      })

      await expect(store.addCustomer('corp-1', newCustomerData)).rejects.toThrow()
      expect(store.error).toBe(errorMessage)
      expect(store.loading).toBe(false)
    })
  })

  describe('updateCustomer', () => {
    const existingCustomer = {
      id: 1,
      uuid: 'customer-1',
      corporation_uuid: 'corp-1',
      project_uuid: null,
      customer_address: '123 Main St',
      customer_city: 'Test City',
      customer_state: 'TS',
      customer_country: 'Test Country',
      customer_zip: '12345',
      customer_phone: '555-1234',
      customer_email: 'test@customer.com',
      company_name: 'Test Company',
      salutation: 'Mr.',
      first_name: 'John',
      middle_name: '',
      last_name: 'Doe',
      profile_image_url: '',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    const updateData = {
      first_name: 'Jane',
      last_name: 'Smith',
      customer_phone: '555-9999',
      customer_email: 'updated@customer.com'
    }

    const updatedCustomer = {
      ...existingCustomer,
      ...updateData,
      updated_at: '2024-01-03T00:00:00Z'
    }

    it('should update customer successfully', async () => {
      // Add existing customer to store
      store.customers = [existingCustomer]

      mockApiFetch.mockResolvedValueOnce({
        success: true,
        data: updatedCustomer,
        message: 'Customer updated successfully'
      })

      const result = await store.updateCustomer('corp-1', existingCustomer, updateData)

      expect(mockApiFetch).toHaveBeenCalledWith("/api/customers", {
        method: "PUT",
        body: {
          ...updateData,
          uuid: "customer-1",
          corporation_uuid: "corp-1",
        },
      });
      expect(result).toEqual({
        success: true,
        data: updatedCustomer,
        message: 'Customer updated successfully'
      })
      expect(store.customers[0]).toEqual(updatedCustomer)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle update error', async () => {
      mockApiFetch.mockResolvedValueOnce({
        error: 'Failed to update customer'
      })

      await expect(store.updateCustomer('corp-1', existingCustomer, updateData)).rejects.toThrow()
      expect(store.error).toBe('Failed to update customer')
      expect(store.loading).toBe(false)
    })
  })

  describe('deleteCustomer', () => {
    const existingCustomer = {
      id: 1,
      uuid: 'customer-1',
      corporation_uuid: 'corp-1',
      project_uuid: null,
      customer_address: '123 Main St',
      customer_city: 'Test City',
      customer_state: 'TS',
      customer_country: 'Test Country',
      customer_zip: '12345',
      customer_phone: '555-1234',
      customer_email: 'test@customer.com',
      company_name: 'Test Company',
      salutation: 'Mr.',
      first_name: 'John',
      middle_name: '',
      last_name: 'Doe',
      profile_image_url: '',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    it('should delete customer successfully', async () => {
      // Add existing customer to store
      store.customers = [existingCustomer]

      mockApiFetch.mockResolvedValueOnce({
        success: true
      })

      const result = await store.deleteCustomer('corp-1', existingCustomer)

      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/customers?uuid=customer-1",
        {
          method: "DELETE",
        }
      );
      expect(result).toEqual({
        success: true
      })
      expect(store.customers).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('should handle delete error', async () => {
      const errorMessage = 'Failed to delete customer'
      mockApiFetch.mockResolvedValueOnce({
        error: errorMessage
      })

      await expect(store.deleteCustomer('corp-1', existingCustomer)).rejects.toThrow()
      expect(store.error).toBe(errorMessage)
      expect(store.loading).toBe(false)
    })
  })

  describe('Cache Management', () => {
    it('should clear all cache when no corporation specified', () => {
      // Add some customers to the store
      store.customers = [
        {
          id: 1,
          uuid: 'customer-1',
          corporation_uuid: 'corp-1',
          first_name: 'John',
          last_name: 'Doe',
          customer_address: '123 Main St',
          customer_phone: '555-1234',
          customer_email: 'test1@customer.com',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      store.clearCache()

      expect(store.customers).toEqual([])
    })

    it('should clear cache for specific corporation when it matches lastFetchedCorporation', async () => {
      const testCustomers = [
        {
          id: 1,
          uuid: 'customer-1',
          corporation_uuid: 'corp-1',
          first_name: 'John',
          last_name: 'Doe',
          customer_address: '123 Main St',
          customer_phone: '555-1234',
          customer_email: 'test1@customer.com',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
      // Set the lastFetchedCorporation to match (this is a ref in the store)
      // We need to access it through the store's internal state
      // Since we can't directly access internal refs, we'll test the behavior
      // by first fetching (which sets lastFetchedCorporation), then clearing
      mockApiFetch.mockResolvedValueOnce({ data: testCustomers })
      await store.fetchCustomers('corp-1')
      
      // Now clearCache should work
      store.clearCache('corp-1')

      // clearCache only clears if corporation matches lastFetchedCorporation or is undefined
      expect(store.customers).toEqual([])
    })
  })

  describe('Force Refresh from API', () => {
    it('should force refresh from API bypassing cache', async () => {
      const mockCustomers = [
        {
          id: 1,
          uuid: 'customer-1',
          corporation_uuid: 'corp-1',
          first_name: 'API',
          last_name: 'Customer',
          customer_address: '123 Main St',
          customer_phone: '555-1234',
          customer_email: 'api@customer.com',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockApiFetch.mockResolvedValueOnce({
        data: mockCustomers
      })

      await store.refreshCustomersFromAPI('corp-1')

      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/customers?corporation_uuid=corp-1"
      );
      expect(store.customers).toEqual(mockCustomers)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })
})

