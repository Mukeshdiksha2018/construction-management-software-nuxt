import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const makeEvent = (method: string, opts: { query?: any; body?: any } = {}) =>
  ({
    node: {
      req: {
        method,
      },
    },
    req: {},
    ...opts,
  } as any);

describe("server/api/direct-vendor-invoice-line-items/utils", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("sanitizeDirectVendorInvoiceLineItem", () => {
    it("sanitizes line item with all fields", async () => {
      const { sanitizeDirectVendorInvoiceLineItem } = await import(
        "@/server/api/direct-vendor-invoice-line-items/utils"
      );

      const item = {
        cost_code_uuid: "cc-1",
        cost_code_label: "01 Concrete",
        cost_code_number: "010000",
        cost_code_name: "Concrete",
        division_name: "Division 1",
        sequence_uuid: "seq-1",
        item_uuid: "item-1",
        item_name: "Concrete Mix",
        description: "High strength concrete",
        unit_price: 100.50,
        quantity: 5.0,
        total: 502.50,
        unit_uuid: "uom-1",
        unit_label: "CY",
        uom: "CY",
        metadata: { custom_field: "value" },
      };

      const sanitized = sanitizeDirectVendorInvoiceLineItem(item, 0);

      expect(sanitized.cost_code_uuid).toBe("cc-1");
      expect(sanitized.cost_code_label).toBe("01 Concrete");
      expect(sanitized.cost_code_number).toBe("010000");
      expect(sanitized.cost_code_name).toBe("Concrete");
      expect(sanitized.division_name).toBe("Division 1");
      expect(sanitized.sequence_uuid).toBe("seq-1");
      expect(sanitized.item_uuid).toBe("item-1");
      expect(sanitized.item_name).toBe("Concrete Mix");
      expect(sanitized.description).toBe("High strength concrete");
      expect(sanitized.unit_price).toBe(100.50);
      expect(sanitized.quantity).toBe(5.0);
      expect(sanitized.total).toBe(502.50);
      expect(sanitized.unit_uuid).toBe("uom-1");
      expect(sanitized.unit_label).toBe("CY");
      expect(sanitized.uom).toBe("CY");
      expect(sanitized.order_index).toBe(0);
      expect(sanitized.is_active).toBe(true);
      expect(sanitized.metadata).toEqual({ custom_field: "value" });
    });

    it("handles null values correctly", async () => {
      const { sanitizeDirectVendorInvoiceLineItem } = await import(
        "@/server/api/direct-vendor-invoice-line-items/utils"
      );

      const item = {
        cost_code_uuid: null,
        unit_price: null,
        quantity: null,
        total: null,
      };

      const sanitized = sanitizeDirectVendorInvoiceLineItem(item, 0);

      expect(sanitized.cost_code_uuid).toBeNull();
      expect(sanitized.unit_price).toBeNull();
      expect(sanitized.quantity).toBeNull();
      expect(sanitized.total).toBeNull();
    });

    it("handles empty strings", async () => {
      const { sanitizeDirectVendorInvoiceLineItem } = await import(
        "@/server/api/direct-vendor-invoice-line-items/utils"
      );

      const item = {
        cost_code_uuid: "",
        unit_price: "",
        quantity: "",
        total: "",
      };

      const sanitized = sanitizeDirectVendorInvoiceLineItem(item, 0);

      expect(sanitized.cost_code_uuid).toBeNull();
      expect(sanitized.unit_price).toBeNull();
      expect(sanitized.quantity).toBeNull();
      expect(sanitized.total).toBeNull();
    });

    it("handles numeric strings", async () => {
      const { sanitizeDirectVendorInvoiceLineItem } = await import(
        "@/server/api/direct-vendor-invoice-line-items/utils"
      );

      const item = {
        unit_price: "100.50",
        quantity: "5.0",
        total: "502.50",
      };

      const sanitized = sanitizeDirectVendorInvoiceLineItem(item, 0);

      expect(sanitized.unit_price).toBe(100.50);
      expect(sanitized.quantity).toBe(5.0);
      expect(sanitized.total).toBe(502.50);
    });

    it("handles invalid numeric values", async () => {
      const { sanitizeDirectVendorInvoiceLineItem } = await import(
        "@/server/api/direct-vendor-invoice-line-items/utils"
      );

      const item = {
        unit_price: "invalid",
        quantity: "not-a-number",
        total: "NaN",
      };

      const sanitized = sanitizeDirectVendorInvoiceLineItem(item, 0);

      expect(sanitized.unit_price).toBeNull();
      expect(sanitized.quantity).toBeNull();
      expect(sanitized.total).toBeNull();
    });

    it("uses order_index from item or defaults to index", async () => {
      const { sanitizeDirectVendorInvoiceLineItem } = await import(
        "@/server/api/direct-vendor-invoice-line-items/utils"
      );

      const itemWithOrderIndex = {
        order_index: 5,
      };

      const sanitized1 = sanitizeDirectVendorInvoiceLineItem(itemWithOrderIndex, 0);
      expect(sanitized1.order_index).toBe(5);

      const itemWithoutOrderIndex = {};
      const sanitized2 = sanitizeDirectVendorInvoiceLineItem(itemWithoutOrderIndex, 3);
      expect(sanitized2.order_index).toBe(3);
    });

    it("handles metadata from different sources", async () => {
      const { sanitizeDirectVendorInvoiceLineItem } = await import(
        "@/server/api/direct-vendor-invoice-line-items/utils"
      );

      const itemWithMetadata = {
        metadata: { source: "import", custom: "value" },
      };

      const sanitized = sanitizeDirectVendorInvoiceLineItem(itemWithMetadata, 0);
      expect(sanitized.metadata).toEqual({ source: "import", custom: "value" });
    });

    it("handles missing metadata", async () => {
      const { sanitizeDirectVendorInvoiceLineItem } = await import(
        "@/server/api/direct-vendor-invoice-line-items/utils"
      );

      const itemWithoutMetadata = {};

      const sanitized = sanitizeDirectVendorInvoiceLineItem(itemWithoutMetadata, 0);
      expect(sanitized.metadata).toEqual({});
    });

    it("handles unit fields from different sources", async () => {
      const { sanitizeDirectVendorInvoiceLineItem } = await import(
        "@/server/api/direct-vendor-invoice-line-items/utils"
      );

      // Test unit_uuid from different sources
      const item1 = {
        unit_uuid: "uom-1",
      };
      const sanitized1 = sanitizeDirectVendorInvoiceLineItem(item1, 0);
      expect(sanitized1.unit_uuid).toBe("uom-1");

      const item2 = {
        uom_uuid: "uom-2",
      };
      const sanitized2 = sanitizeDirectVendorInvoiceLineItem(item2, 0);
      expect(sanitized2.unit_uuid).toBe("uom-2");

      // Test unit_label from different sources
      const item3 = {
        unit_label: "CY",
      };
      const sanitized3 = sanitizeDirectVendorInvoiceLineItem(item3, 0);
      expect(sanitized3.unit_label).toBe("CY");

      const item4 = {
        uom: "EA",
      };
      const sanitized4 = sanitizeDirectVendorInvoiceLineItem(item4, 0);
      expect(sanitized4.unit_label).toBe("EA");
      expect(sanitized4.uom).toBe("EA");
    });

    it("handles item_name from different sources", async () => {
      const { sanitizeDirectVendorInvoiceLineItem } = await import(
        "@/server/api/direct-vendor-invoice-line-items/utils"
      );

      const item1 = {
        item_name: "Item Name",
      };
      const sanitized1 = sanitizeDirectVendorInvoiceLineItem(item1, 0);
      expect(sanitized1.item_name).toBe("Item Name");

      const item2 = {
        description: "Item Description",
      };
      const sanitized2 = sanitizeDirectVendorInvoiceLineItem(item2, 0);
      expect(sanitized2.item_name).toBe("Item Description");
    });
  });
});

