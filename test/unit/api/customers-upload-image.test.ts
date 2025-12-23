import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock h3 utilities
const mockDefineEventHandler = vi.fn()
const mockReadBody = vi.fn()

vi.stubGlobal('defineEventHandler', mockDefineEventHandler)
vi.stubGlobal('readBody', mockReadBody)

// Mock useRuntimeConfig
const mockUseRuntimeConfig = vi.fn(() => ({
  public: {
    SUPABASE_URL: 'https://test.supabase.co'
  },
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}))

vi.stubGlobal('useRuntimeConfig', mockUseRuntimeConfig)

// Mock Supabase admin client
const mockStorage = {
  from: vi.fn(() => ({
    remove: vi.fn(() => Promise.resolve({ error: null })),
    upload: vi.fn(() => Promise.resolve({ data: { path: 'test-image.jpg' }, error: null })),
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/customer_images/test-image.jpg' } }))
  }))
}

const mockSupabaseAdmin = {
  storage: mockStorage
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseAdmin)
}))

describe('Customer Image Upload API', () => {
  let mockEvent: any

  beforeEach(() => {
    mockEvent = {
      node: {
        req: {
          method: 'POST'
        }
      }
    }
    vi.clearAllMocks()
    
    mockDefineEventHandler.mockImplementation((handler) => handler)
    mockReadBody.mockResolvedValue({})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("POST /api/customers/upload-image", () => {
    it("should upload image successfully", async () => {
      const imageData = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
      const fileName = "test-image.jpg";

      mockReadBody.mockResolvedValue({
        imageData,
        fileName
      });

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/upload-image"
      );

      const result = await handler(mockEvent);

      expect(mockStorage.from).toHaveBeenCalledWith("customer_images");
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("imageUrl");
      expect(result.data).toHaveProperty("fileName");
    });

    it("should delete old image when updating", async () => {
      const imageData = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
      const fileName = "new-image.jpg";
      const customerUuid = "customer-1";
      const oldImageUrl = "https://test.supabase.co/storage/v1/object/public/customer_images/old-image.jpg";

      mockReadBody.mockResolvedValue({
        imageData,
        fileName,
        customerUuid,
        oldImageUrl
      });

      const mockRemove = vi.fn(() => Promise.resolve({ error: null }));
      mockStorage.from.mockReturnValue({
        remove: mockRemove,
        upload: vi.fn(() => Promise.resolve({ data: { path: 'new-image.jpg' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/customer_images/new-image.jpg' } }))
      });

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/upload-image"
      );

      const result = await handler(mockEvent);

      expect(mockRemove).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it("should handle missing image data", async () => {
      mockReadBody.mockResolvedValue({
        fileName: "test-image.jpg"
        // Missing imageData
      });

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/upload-image"
      );

      const result = await handler(mockEvent);

      expect(result.error).toBe("Image data and file name are required");
    });

    it("should handle missing file name", async () => {
      mockReadBody.mockResolvedValue({
        imageData: "data:image/jpeg;base64,/9j/4AAQSkZJRg=="
        // Missing fileName
      });

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/upload-image"
      );

      const result = await handler(mockEvent);

      expect(result.error).toBe("Image data and file name are required");
    });

    it("should handle upload errors gracefully", async () => {
      const imageData = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
      const fileName = "test-image.jpg";

      mockReadBody.mockResolvedValue({
        imageData,
        fileName
      });

      const uploadError = { message: "Upload failed" };
      mockStorage.from.mockReturnValue({
        upload: vi.fn(() => Promise.resolve({ data: null, error: uploadError })),
        getPublicUrl: vi.fn()
      });

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/upload-image"
      );

      const result = await handler(mockEvent);

      expect(result.error).toBe("Upload failed");
    });

    it("should handle old image deletion errors gracefully", async () => {
      const imageData = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
      const fileName = "new-image.jpg";
      const customerUuid = "customer-1";
      const oldImageUrl = "https://test.supabase.co/storage/v1/object/public/customer_images/old-image.jpg";

      mockReadBody.mockResolvedValue({
        imageData,
        fileName,
        customerUuid,
        oldImageUrl
      });

      const mockRemove = vi.fn(() => Promise.resolve({ error: { message: "Delete failed" } }));
      mockStorage.from.mockReturnValue({
        remove: mockRemove,
        upload: vi.fn(() => Promise.resolve({ data: { path: 'new-image.jpg' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/customer_images/new-image.jpg' } }))
      });

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/upload-image"
      );

      const result = await handler(mockEvent);

      // Should still succeed even if old image deletion fails
      expect(result.success).toBe(true);
    });

    it("should reject non-POST methods", async () => {
      mockEvent.node.req.method = "GET";

      // Import the handler
      const { default: handler } = await import(
        "../../../server/api/customers/upload-image"
      );

      const result = await handler(mockEvent);

      expect(result.error).toBe("Method not allowed");
    });
  });
})

