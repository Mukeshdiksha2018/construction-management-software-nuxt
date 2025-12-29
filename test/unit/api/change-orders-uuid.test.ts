import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("server/api/change-orders/[uuid]", () => {
  const stubGlobals = (uuid: string) => {
    const mockDefineEventHandler = vi.fn((handler) => handler);
    const mockGetRouterParam = vi.fn(() => uuid);
    const mockCreateError = vi.fn((options: any) => {
      const error = new Error(options.statusMessage);
      (error as any).statusCode = options.statusCode;
      return error;
    });

    vi.stubGlobal("defineEventHandler", mockDefineEventHandler);
    vi.stubGlobal("getRouterParam", mockGetRouterParam);
    vi.stubGlobal("createError", mockCreateError);

    return {
      mockDefineEventHandler,
      mockGetRouterParam,
      mockCreateError,
    };
  };

  let supabaseMock: any;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    supabaseMock = {
      from: vi.fn(),
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("GET - Fetch Change Order with Metadata", () => {
    it("should fetch change order with project, vendor, and PO metadata", async () => {
      const uuid = "co-uuid-123";
      stubGlobals(uuid);

      const mockCOData = {
        uuid: uuid,
        corporation_uuid: "corp-uuid-1",
        project_uuid: "project-uuid-1",
        vendor_uuid: "vendor-uuid-1",
        original_purchase_order_uuid: "po-uuid-1",
        co_number: "CO-001",
        co_type: "MATERIAL",
        status: "Approved",
        created_date: "2024-01-01",
        project: {
          uuid: "project-uuid-1",
          project_name: "Test Project",
          project_id: "PROJ-001",
        },
        vendor: {
          uuid: "vendor-uuid-1",
          vendor_name: "Test Vendor",
        },
        purchase_order: {
          uuid: "po-uuid-1",
          po_number: "PO-001",
        },
      };

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: mockCOData,
              error: null,
            })
          ),
        })),
      }));

      supabaseMock.from.mockReturnValue({
        select: selectMock,
      });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/[uuid]");
      const event = {
        node: { req: { method: "GET" } },
      };

      const result = await handler.default(event as any);

      expect(result.data).toBeDefined();
      expect(result.data.uuid).toBe(uuid);
      expect(result.data.project_name).toBe("Test Project");
      expect(result.data.project_id).toBe("PROJ-001");
      expect(result.data.vendor_name).toBe("Test Vendor");
      expect(result.data.po_number).toBe("PO-001");

      // Verify the select query includes JOINs
      expect(selectMock).toHaveBeenCalledWith(
        expect.stringContaining("project:projects!project_uuid")
      );
      expect(selectMock).toHaveBeenCalledWith(
        expect.stringContaining("vendor:vendors!vendor_uuid")
      );
      expect(selectMock).toHaveBeenCalledWith(
        expect.stringContaining("purchase_order:purchase_order_forms!original_purchase_order_uuid")
      );
    });

    it("should handle missing project metadata gracefully", async () => {
      const uuid = "co-uuid-123";
      stubGlobals(uuid);

      const mockCOData = {
        uuid: uuid,
        corporation_uuid: "corp-uuid-1",
        project_uuid: null,
        vendor_uuid: "vendor-uuid-1",
        original_purchase_order_uuid: "po-uuid-1",
        co_number: "CO-001",
        co_type: "MATERIAL",
        status: "Approved",
        created_date: "2024-01-01",
        project: null,
        vendor: {
          uuid: "vendor-uuid-1",
          vendor_name: "Test Vendor",
        },
        purchase_order: {
          uuid: "po-uuid-1",
          po_number: "PO-001",
        },
      };

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: mockCOData,
              error: null,
            })
          ),
        })),
      }));

      supabaseMock.from.mockReturnValue({
        select: selectMock,
      });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/[uuid]");
      const event = {
        node: { req: { method: "GET" } },
      };

      const result = await handler.default(event as any);

      expect(result.data).toBeDefined();
      expect(result.data.uuid).toBe(uuid);
      expect(result.data.project_name).toBeNull();
      expect(result.data.project_id).toBeNull();
      expect(result.data.vendor_name).toBe("Test Vendor");
      expect(result.data.po_number).toBe("PO-001");
      
      // Verify metadata fields are explicitly set to null when missing
      expect(result.data).toHaveProperty("project_name");
      expect(result.data).toHaveProperty("project_id");
    });

    it("should handle missing vendor metadata gracefully", async () => {
      const uuid = "co-uuid-123";
      stubGlobals(uuid);

      const mockCOData = {
        uuid: uuid,
        corporation_uuid: "corp-uuid-1",
        project_uuid: "project-uuid-1",
        vendor_uuid: null,
        original_purchase_order_uuid: "po-uuid-1",
        co_number: "CO-001",
        co_type: "MATERIAL",
        status: "Approved",
        created_date: "2024-01-01",
        project: {
          uuid: "project-uuid-1",
          project_name: "Test Project",
          project_id: "PROJ-001",
        },
        vendor: null,
        purchase_order: {
          uuid: "po-uuid-1",
          po_number: "PO-001",
        },
      };

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: mockCOData,
              error: null,
            })
          ),
        })),
      }));

      supabaseMock.from.mockReturnValue({
        select: selectMock,
      });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/[uuid]");
      const event = {
        node: { req: { method: "GET" } },
      };

      const result = await handler.default(event as any);

      expect(result.data).toBeDefined();
      expect(result.data.uuid).toBe(uuid);
      expect(result.data.project_name).toBe("Test Project");
      expect(result.data.project_id).toBe("PROJ-001");
      expect(result.data.vendor_name).toBeNull();
      expect(result.data.po_number).toBe("PO-001");
      
      // Verify vendor_name is explicitly set to null when missing
      expect(result.data).toHaveProperty("vendor_name");
    });

    it("should handle missing purchase order metadata gracefully", async () => {
      const uuid = "co-uuid-123";
      stubGlobals(uuid);

      const mockCOData = {
        uuid: uuid,
        corporation_uuid: "corp-uuid-1",
        project_uuid: "project-uuid-1",
        vendor_uuid: "vendor-uuid-1",
        original_purchase_order_uuid: null,
        co_number: "CO-001",
        co_type: "MATERIAL",
        status: "Approved",
        created_date: "2024-01-01",
        project: {
          uuid: "project-uuid-1",
          project_name: "Test Project",
          project_id: "PROJ-001",
        },
        vendor: {
          uuid: "vendor-uuid-1",
          vendor_name: "Test Vendor",
        },
        purchase_order: null,
      };

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: mockCOData,
              error: null,
            })
          ),
        })),
      }));

      supabaseMock.from.mockReturnValue({
        select: selectMock,
      });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/[uuid]");
      const event = {
        node: { req: { method: "GET" } },
      };

      const result = await handler.default(event as any);

      expect(result.data).toBeDefined();
      expect(result.data.uuid).toBe(uuid);
      expect(result.data.project_name).toBe("Test Project");
      expect(result.data.project_id).toBe("PROJ-001");
      expect(result.data.vendor_name).toBe("Test Vendor");
      expect(result.data.po_number).toBeNull();
      
      // Verify po_number is explicitly set to null when missing
      expect(result.data).toHaveProperty("po_number");
    });

    it("should return 404 when change order not found", async () => {
      const uuid = "non-existent-uuid";
      stubGlobals(uuid);

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: null,
              error: null,
            })
          ),
        })),
      }));

      supabaseMock.from.mockReturnValue({
        select: selectMock,
      });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/[uuid]");
      const event = {
        node: { req: { method: "GET" } },
      };

      await expect(handler.default(event as any)).rejects.toThrow(
        "Change order not found"
      );
    });

    it("should handle database errors", async () => {
      const uuid = "co-uuid-123";
      stubGlobals(uuid);

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: null,
              error: { message: "Database error" },
            })
          ),
        })),
      }));

      supabaseMock.from.mockReturnValue({
        select: selectMock,
      });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/[uuid]");
      const event = {
        node: { req: { method: "GET" } },
      };

      await expect(handler.default(event as any)).rejects.toThrow(
        "Database error"
      );
    });

    it("should handle all metadata fields present", async () => {
      const uuid = "co-uuid-complete-123";
      stubGlobals(uuid);

      const mockCOData = {
        uuid: uuid,
        corporation_uuid: "corp-uuid-1",
        project_uuid: "project-uuid-1",
        vendor_uuid: "vendor-uuid-1",
        original_purchase_order_uuid: "po-uuid-1",
        co_number: "CO-001",
        co_type: "MATERIAL",
        status: "Approved",
        created_date: "2024-01-01",
        project: {
          uuid: "project-uuid-1",
          project_name: "Complete Project",
          project_id: "PROJ-COMPLETE",
        },
        vendor: {
          uuid: "vendor-uuid-1",
          vendor_name: "Complete Vendor",
        },
        purchase_order: {
          uuid: "po-uuid-1",
          po_number: "PO-COMPLETE",
        },
      };

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: mockCOData,
              error: null,
            })
          ),
        })),
      }));

      supabaseMock.from.mockReturnValue({
        select: selectMock,
      });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/change-orders/[uuid]");
      const event = {
        node: { req: { method: "GET" } },
      };

      const result = await handler.default(event as any);

      expect(result.data).toBeDefined();
      expect(result.data.uuid).toBe(uuid);
      expect(result.data.project_name).toBe("Complete Project");
      expect(result.data.project_id).toBe("PROJ-COMPLETE");
      expect(result.data.vendor_name).toBe("Complete Vendor");
      expect(result.data.po_number).toBe("PO-COMPLETE");
    });
  });
});

