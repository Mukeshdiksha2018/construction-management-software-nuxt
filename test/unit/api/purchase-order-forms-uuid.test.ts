import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("server/api/purchase-order-forms/[uuid]", () => {
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

  describe("GET - Fetch Purchase Order with Metadata", () => {
    it("should fetch purchase order with project and vendor metadata", async () => {
      const uuid = "po-uuid-123";
      stubGlobals(uuid);

      const mockPOData = {
        uuid: uuid,
        corporation_uuid: "corp-uuid-1",
        project_uuid: "project-uuid-1",
        vendor_uuid: "vendor-uuid-1",
        po_number: "PO-001",
        po_type: "MATERIAL",
        status: "Approved",
        entry_date: "2024-01-01",
        project: {
          uuid: "project-uuid-1",
          project_name: "Test Project",
          project_id: "PROJ-001",
        },
        vendor: {
          uuid: "vendor-uuid-1",
          vendor_name: "Test Vendor",
        },
      };

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: mockPOData,
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

      const handler = await import("@/server/api/purchase-order-forms/[uuid]");
      const event = {
        node: { req: { method: "GET" } },
      };

      const result = await handler.default(event as any);

      expect(result.data).toBeDefined();
      expect(result.data.uuid).toBe(uuid);
      expect(result.data.project_name).toBe("Test Project");
      expect(result.data.project_id).toBe("PROJ-001");
      expect(result.data.vendor_name).toBe("Test Vendor");

      // Verify the select query includes JOINs
      expect(selectMock).toHaveBeenCalledWith(
        expect.stringContaining("project:projects!project_uuid")
      );
      expect(selectMock).toHaveBeenCalledWith(
        expect.stringContaining("vendor:vendors!vendor_uuid")
      );
    });

    it("should handle missing project metadata gracefully", async () => {
      const uuid = "po-uuid-123";
      stubGlobals(uuid);

      const mockPOData = {
        uuid: uuid,
        corporation_uuid: "corp-uuid-1",
        project_uuid: null,
        vendor_uuid: "vendor-uuid-1",
        po_number: "PO-001",
        po_type: "MATERIAL",
        status: "Approved",
        entry_date: "2024-01-01",
        project: null,
        vendor: {
          uuid: "vendor-uuid-1",
          vendor_name: "Test Vendor",
        },
      };

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: mockPOData,
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

      const handler = await import("@/server/api/purchase-order-forms/[uuid]");
      const event = {
        node: { req: { method: "GET" } },
      };

      const result = await handler.default(event as any);

      expect(result.data).toBeDefined();
      expect(result.data.uuid).toBe(uuid);
      expect(result.data.project_name).toBeNull();
      expect(result.data.project_id).toBeNull();
      expect(result.data.vendor_name).toBe("Test Vendor");
      
      // Verify metadata fields are explicitly set to null when missing
      expect(result.data).toHaveProperty("project_name");
      expect(result.data).toHaveProperty("project_id");
    });

    it("should handle missing vendor metadata gracefully", async () => {
      const uuid = "po-uuid-123";
      stubGlobals(uuid);

      const mockPOData = {
        uuid: uuid,
        corporation_uuid: "corp-uuid-1",
        project_uuid: "project-uuid-1",
        vendor_uuid: null,
        po_number: "PO-001",
        po_type: "MATERIAL",
        status: "Approved",
        entry_date: "2024-01-01",
        project: {
          uuid: "project-uuid-1",
          project_name: "Test Project",
          project_id: "PROJ-001",
        },
        vendor: null,
      };

      const selectMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: mockPOData,
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

      const handler = await import("@/server/api/purchase-order-forms/[uuid]");
      const event = {
        node: { req: { method: "GET" } },
      };

      const result = await handler.default(event as any);

      expect(result.data).toBeDefined();
      expect(result.data.uuid).toBe(uuid);
      expect(result.data.project_name).toBe("Test Project");
      expect(result.data.project_id).toBe("PROJ-001");
      expect(result.data.vendor_name).toBeNull();
      
      // Verify vendor_name is explicitly set to null when missing
      expect(result.data).toHaveProperty("vendor_name");
    });

    it("should return 404 when purchase order not found", async () => {
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

      const handler = await import("@/server/api/purchase-order-forms/[uuid]");
      const event = {
        node: { req: { method: "GET" } },
      };

      await expect(handler.default(event as any)).rejects.toThrow(
        "Form not found"
      );
    });

    it("should handle database errors", async () => {
      const uuid = "po-uuid-123";
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

      const handler = await import("@/server/api/purchase-order-forms/[uuid]");
      const event = {
        node: { req: { method: "GET" } },
      };

      await expect(handler.default(event as any)).rejects.toThrow(
        "Database error"
      );
    });

    it("should handle LABOR PO type and fetch labor items", async () => {
      const uuid = "po-uuid-labor-123";
      stubGlobals(uuid);

      const mockPOData = {
        uuid: uuid,
        corporation_uuid: "corp-uuid-1",
        project_uuid: "project-uuid-1",
        vendor_uuid: "vendor-uuid-1",
        po_number: "PO-LABOR-001",
        po_type: "LABOR",
        status: "Approved",
        entry_date: "2024-01-01",
        project: {
          uuid: "project-uuid-1",
          project_name: "Test Project",
          project_id: "PROJ-001",
        },
        vendor: {
          uuid: "vendor-uuid-1",
          vendor_name: "Test Vendor",
        },
      };

      const mockLaborItems = [
        {
          id: 1,
          uuid: "labor-item-1",
          purchase_order_uuid: uuid,
          cost_code_uuid: "cost-code-1",
          cost_code_number: "CC001",
          cost_code_name: "Labor Cost Code",
          labor_budgeted_amount: 1000,
          po_amount: 1200,
          order_index: 0,
          is_active: true,
        },
      ];

      const selectPOMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: mockPOData,
              error: null,
            })
          ),
        })),
      }));

      const selectLaborItemsMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: mockLaborItems,
                error: null,
              })
            ),
          })),
        })),
      }));

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === "purchase_order_forms") {
          return {
            select: selectPOMock,
          };
        }
        if (table === "labor_purchase_order_items_list") {
          return {
            select: selectLaborItemsMock,
          };
        }
        return {
          select: vi.fn(),
        };
      });

      vi.doMock("@/utils/supabaseServer", () => ({
        supabaseServer: supabaseMock,
      }));

      const handler = await import("@/server/api/purchase-order-forms/[uuid]");
      const event = {
        node: { req: { method: "GET" } },
      };

      const result = await handler.default(event as any);

      expect(result.data).toBeDefined();
      expect(result.data.uuid).toBe(uuid);
      expect(result.data.po_type).toBe("LABOR");
      expect(result.data.project_name).toBe("Test Project");
      expect(result.data.vendor_name).toBe("Test Vendor");
      expect((result.data as any).labor_po_items).toBeDefined();
      expect(Array.isArray((result.data as any).labor_po_items)).toBe(true);
      expect((result.data as any).labor_po_items.length).toBe(1);
    });
  });
});

