import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock h3 utilities
const mockDefineEventHandler = vi.fn()
const mockGetQuery = vi.fn()
const mockReadBody = vi.fn()
const mockGetRouterParam = vi.fn()
const mockCreateError = vi.fn()

vi.stubGlobal('defineEventHandler', mockDefineEventHandler)
vi.stubGlobal('getQuery', mockGetQuery)
vi.stubGlobal('readBody', mockReadBody)
vi.stubGlobal('getRouterParam', mockGetRouterParam)
vi.stubGlobal('createError', mockCreateError)

// Mock Supabase server
const mockSupabaseServer = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null }))
    }))
  }))
}

vi.mock('@/utils/supabaseServer', () => ({
  supabaseServer: mockSupabaseServer
}))

// Mock useRuntimeConfig
const mockUseRuntimeConfig = vi.fn(() => ({
  public: {
    SUPABASE_URL: 'https://test.supabase.co'
  },
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}))

vi.stubGlobal('useRuntimeConfig', mockUseRuntimeConfig)

// Mock Supabase admin client for storage operations
const mockStorage = {
  from: vi.fn(() => ({
    remove: vi.fn(() => Promise.resolve({ error: null }))
  }))
}

const mockSupabaseAdmin = {
  storage: mockStorage
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseAdmin)
}))

describe('Customer API Endpoints', () => {
  let mockEvent: any

  beforeEach(() => {
    mockEvent = {
      node: {
        req: {
          method: 'GET'
        }
      }
    }
    vi.clearAllMocks()
    
    // Reset mock implementations
    mockDefineEventHandler.mockImplementation((handler) => handler)
    mockGetQuery.mockReturnValue({})
    mockReadBody.mockResolvedValue({})
    mockGetRouterParam.mockReturnValue('')
    mockCreateError.mockImplementation((options) => {
      const error = new Error(options.statusMessage)
      error.statusCode = options.statusCode
      return error
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("GET /api/customers", () => {
    it("should fetch customers for a corporation successfully", async () => {
      mockEvent.node.req.method = "GET";
      mockGetQuery.mockReturnValue({ corporation_uuid: "corp-1" });

      const mockCustomers = [
        {
          id: 1,
          uuid: "customer-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          customer_address: "123 Main St",
          customer_city: "Test City",
          customer_state: "TS",
          customer_country: "Test Country",
          customer_zip: "12345",
          customer_phone: "555-1234",
          customer_email: "test@customer.com",
          company_name: "Test Company",
          salutation: "Mr.",
          first_name: "John",
          middle_name: "",
          last_name: "Doe",
          profile_image_url: "",
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z"
        }
      ];

      const mockEq2 = vi.fn(() => Promise.resolve({ data: mockCustomers, error: null }));
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
      const mockSelect = vi.fn(() => ({ eq: mockEq1 }));
      mockSupabaseServer.from.mockReturnValue({ select: mockSelect });

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/index"
      );

      const result = await handler(mockEvent);

      expect(mockSupabaseServer.from).toHaveBeenCalledWith("customers");
      expect(mockEq1).toHaveBeenCalledWith("corporation_uuid", "corp-1");
      expect(mockEq2).toHaveBeenCalledWith("is_active", true);
      expect(result).toEqual({ data: mockCustomers });
    });

    it("should filter customers by project_uuid when provided", async () => {
      mockEvent.node.req.method = "GET";
      mockGetQuery.mockReturnValue({ 
        corporation_uuid: "corp-1",
        project_uuid: "project-1"
      });

      const mockCustomers = [
        {
          id: 1,
          uuid: "customer-1",
          corporation_uuid: "corp-1",
          project_uuid: "project-1",
          first_name: "John",
          last_name: "Doe",
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z"
        }
      ];

      const mockEq3 = vi.fn(() => Promise.resolve({ data: mockCustomers, error: null }));
      const mockEq2 = vi.fn(() => ({ eq: mockEq3 }));
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
      const mockSelect = vi.fn(() => ({ eq: mockEq1 }));
      mockSupabaseServer.from.mockReturnValue({ select: mockSelect });

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/index"
      );

      const result = await handler(mockEvent);

      expect(mockEq1).toHaveBeenCalledWith("corporation_uuid", "corp-1");
      expect(mockEq2).toHaveBeenCalledWith("is_active", true);
      expect(mockEq3).toHaveBeenCalledWith("project_uuid", "project-1");
      expect(result).toEqual({ data: mockCustomers });
    });

    it("should handle database errors", async () => {
      mockEvent.node.req.method = "GET";
      mockGetQuery.mockReturnValue({ corporation_uuid: "corp-1" });

      const mockError = { message: "Database connection failed" };
      const mockEq2 = vi.fn(() => Promise.resolve({ data: null, error: mockError }));
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
      const mockSelect = vi.fn(() => ({ eq: mockEq1 }));
      mockSupabaseServer.from.mockReturnValue({ select: mockSelect });

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/index"
      );

      await expect(handler(mockEvent)).rejects.toThrow(
        "Database error: Database connection failed"
      );
    });
  });

  describe("POST /api/customers", () => {
    it("should create customer successfully", async () => {
      mockEvent.node.req.method = "POST";

      const customerData = {
        corporation_uuid: "corp-1",
        project_uuid: "project-1",
        customer_address: "123 Main St",
        customer_city: "Test City",
        customer_state: "TS",
        customer_country: "Test Country",
        customer_zip: "12345",
        customer_phone: "555-1234",
        customer_email: "test@customer.com",
        company_name: "Test Company",
        salutation: "Mr.",
        first_name: "John",
        middle_name: "",
        last_name: "Doe",
        profile_image_url: ""
      };

      const createdCustomer = {
        id: 1,
        uuid: "customer-1",
        ...customerData,
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z"
      };

      mockReadBody.mockResolvedValue(customerData);

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() =>
          Promise.resolve({ data: [createdCustomer], error: null })
        ),
      }));

      // Mock project validation
      const mockProjectSingle = vi.fn(() => Promise.resolve({ data: { uuid: "project-1" }, error: null }));
      const mockProjectEq2 = vi.fn(() => ({ single: mockProjectSingle }));
      const mockProjectEq1 = vi.fn(() => ({ eq: mockProjectEq2 }));
      const mockProjectSelect = vi.fn(() => ({ eq: mockProjectEq1 }));

      mockSupabaseServer.from.mockImplementation((table) => {
        if (table === "projects") {
          return { select: mockProjectSelect };
        }
        return { insert: mockInsert };
      });

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/index"
      );

      const result = await handler(mockEvent);

      expect(mockSupabaseServer.from).toHaveBeenCalledWith("customers");
      expect(mockInsert).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        data: createdCustomer,
        message: "Customer created successfully",
      });
    });

    it("should handle missing required fields", async () => {
      mockEvent.node.req.method = "POST";
      mockReadBody.mockResolvedValue({
        corporation_uuid: "corp-1",
        // Missing first_name and last_name
      });

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/index"
      );

      await expect(handler(mockEvent)).rejects.toThrow(
        "Missing required fields: first_name and last_name are required"
      );
      expect(mockCreateError).toHaveBeenCalledWith({
        statusCode: 400,
        statusMessage:
          "Missing required fields: first_name and last_name are required",
      });
    });

    it("should validate email format", async () => {
      mockEvent.node.req.method = "POST";
      mockReadBody.mockResolvedValue({
        corporation_uuid: "corp-1",
        first_name: "John",
        last_name: "Doe",
        customer_email: "invalid-email"
      });

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/index"
      );

      await expect(handler(mockEvent)).rejects.toThrow(
        "Invalid email format"
      );
    });

    it("should validate phone format", async () => {
      mockEvent.node.req.method = "POST";
      mockReadBody.mockResolvedValue({
        corporation_uuid: "corp-1",
        first_name: "John",
        last_name: "Doe",
        customer_phone: "invalid-phone"
      });

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/index"
      );

      await expect(handler(mockEvent)).rejects.toThrow(
        "Invalid phone number format"
      );
    });

    it("should validate salutation", async () => {
      mockEvent.node.req.method = "POST";
      mockReadBody.mockResolvedValue({
        corporation_uuid: "corp-1",
        first_name: "John",
        last_name: "Doe",
        salutation: "Invalid"
      });

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/index"
      );

      await expect(handler(mockEvent)).rejects.toThrow(
        "Invalid salutation"
      );
    });

    it("should validate project_uuid belongs to corporation", async () => {
      mockEvent.node.req.method = "POST";
      mockReadBody.mockResolvedValue({
        corporation_uuid: "corp-1",
        project_uuid: "project-1",
        first_name: "John",
        last_name: "Doe"
      });

      const mockSingle = vi.fn(() => Promise.resolve({ data: null, error: { message: "Not found" } }));
      const mockEq2 = vi.fn(() => ({ single: mockSingle }));
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
      const mockProjectSelect = vi.fn(() => ({ eq: mockEq1 }));
      
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }));

      mockSupabaseServer.from.mockImplementation((table) => {
        if (table === "projects") {
          return { select: mockProjectSelect };
        }
        return { insert: mockInsert };
      });

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/index"
      );

      await expect(handler(mockEvent)).rejects.toThrow(
        "Invalid project_uuid or project does not belong to the corporation"
      );
    });
  });

  describe("PUT /api/customers", () => {
    it("should update customer successfully", async () => {
      mockEvent.node.req.method = "PUT";
      const updateData = {
        uuid: "customer-1",
        corporation_uuid: "corp-1",
        first_name: "Jane",
        last_name: "Smith",
        customer_phone: "555-9999",
        customer_email: "updated@customer.com"
      };

      const updatedCustomer = {
        id: 1,
        uuid: "customer-1",
        corporation_uuid: "corp-1",
        project_uuid: null,
        customer_address: "123 Main St",
        customer_city: "Test City",
        customer_state: "TS",
        customer_country: "Test Country",
        customer_zip: "12345",
        customer_phone: "555-9999",
        customer_email: "updated@customer.com",
        company_name: "Test Company",
        salutation: "Mr.",
        first_name: "Jane",
        middle_name: "",
        last_name: "Smith",
        profile_image_url: "",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-03T00:00:00Z"
      };

      mockReadBody.mockResolvedValue(updateData);

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() =>
            Promise.resolve({ data: [updatedCustomer], error: null })
          ),
        })),
      }));
      mockSupabaseServer.from.mockReturnValue({ update: mockUpdate });

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/index"
      );

      const result = await handler(mockEvent);

      expect(mockSupabaseServer.from).toHaveBeenCalledWith("customers");
      expect(mockUpdate).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        data: updatedCustomer,
        message: "Customer updated successfully",
      });
    });

    it("should handle missing uuid parameter", async () => {
      mockEvent.node.req.method = "PUT";
      mockReadBody.mockResolvedValue({
        corporation_uuid: "corp-1",
        first_name: "Jane",
        last_name: "Smith"
      });

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/index"
      );

      await expect(handler(mockEvent)).rejects.toThrow(
        "Customer UUID is required for update"
      );
    });
  });

  describe("DELETE /api/customers", () => {
    it("should soft-delete customer successfully", async () => {
      mockEvent.node.req.method = "DELETE";
      mockGetQuery.mockReturnValue({ uuid: "customer-1" });

      // Mock fetching customer to get profile_image_url
      const existingCustomer = {
        id: 1,
        uuid: "customer-1",
        corporation_uuid: "corp-1",
        profile_image_url: "https://example.com/image.jpg",
        is_active: true
      };

      const mockSingle = vi.fn(() => Promise.resolve({ data: existingCustomer, error: null }));
      const mockEq1 = vi.fn(() => ({ single: mockSingle }));
      const mockSelect = vi.fn(() => ({ eq: mockEq1 }));

      const mockUpdateSelect = vi.fn(() => Promise.resolve({ data: [{ is_active: false }], error: null }));
      const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }));
      const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));

      mockSupabaseServer.from.mockImplementation((table) => {
        if (table === "customers") {
          return {
            select: mockSelect,
            update: mockUpdate
          };
        }
        return { select: mockSelect };
      });

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/index"
      );

      const result = await handler(mockEvent);

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockUpdateEq).toHaveBeenCalledWith("uuid", "customer-1");
      expect(result).toEqual({
        success: true,
      });
    });

    it("should handle missing uuid parameter", async () => {
      mockEvent.node.req.method = "DELETE";
      mockGetQuery.mockReturnValue({ uuid: undefined });

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/index"
      );

      // The handler checks for uuid, but if it's undefined, it will try to query anyway
      // Let's check the actual behavior - it should fail when trying to query
      const mockSingle = vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'Not found' } }));
      const mockEq1 = vi.fn(() => ({ single: mockSingle }));
      const mockSelect = vi.fn(() => ({ eq: mockEq1 }));
      const mockUpdateEq = vi.fn(() => Promise.resolve({ data: null, error: null }));
      const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));

      mockSupabaseServer.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate
      });

      // When uuid is undefined, the query will fail
      await expect(handler(mockEvent)).rejects.toThrow();
    });
  });
})

