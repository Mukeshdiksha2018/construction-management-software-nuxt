import { describe, it, expect } from 'vitest'

// Import only the constants (not the composable function that uses router)
const {
  USERS_TABS,
  CORPORATION_TABS,
  PAYABLES_TABS,
  PURCHASE_ORDERS_TABS,
  PROJECTS_TABS,
  MASTERS_TABS,
} = await import("../../../composables/useTabRouting");

describe("Tab Configuration Constants", () => {
  describe("USERS_TABS", () => {
    it("should export correct USERS_TABS configuration", () => {
      expect(USERS_TABS).toHaveLength(2);
      expect(USERS_TABS[0]).toEqual({
        name: "role-management",
        label: "Role Management",
        icon: "lucide:shield",
        value: "role-management",
      });
      expect(USERS_TABS[1]).toEqual({
        name: "user-management",
        label: "User Management",
        icon: "lucide:users",
        value: "user-management",
      });
    });

    it("should have consistent name and value fields", () => {
      USERS_TABS.forEach((tab) => {
        expect(tab.name).toBe(tab.value);
        expect(typeof tab.name).toBe("string");
        expect(typeof tab.label).toBe("string");
        expect(typeof tab.icon).toBe("string");
      });
    });
  });

  describe("CORPORATION_TABS", () => {
    it("should export correct CORPORATION_TABS configuration", () => {
      expect(CORPORATION_TABS).toHaveLength(3);

      expect(CORPORATION_TABS[0]).toEqual({
        name: "manage-corporations",
        label: "Manage Corporations",
        icon: "lucide:building-2",
        value: "manage-corporations",
      });

      expect(CORPORATION_TABS[1]).toEqual({
        name: "storage-locations",
        label: "Storage Locations",
        icon: "lucide:warehouse",
        value: "storage-locations",
      });

      expect(CORPORATION_TABS[2]).toEqual({
        name: "chart-of-accounts",
        label: "Chart Of Accounts",
        icon: "basil:document-solid",
        value: "chart-of-accounts",
      });
    });

    it("should have all required fields", () => {
      CORPORATION_TABS.forEach((tab) => {
        expect(tab).toHaveProperty("name");
        expect(tab).toHaveProperty("label");
        expect(tab).toHaveProperty("icon");
        expect(tab).toHaveProperty("value");
        expect(tab.name).toBe(tab.value);
      });
    });
  });

  describe("PAYABLES_TABS", () => {
    it("should export correct PAYABLES_TABS configuration", () => {
      expect(PAYABLES_TABS).toHaveLength(3);

      expect(PAYABLES_TABS[0]).toEqual({
        name: "vendor-invoices",
        label: "Vendor Invoices",
        icon: "i-heroicons-document-text",
        value: "vendor-invoices",
      });

      expect(PAYABLES_TABS[1]).toEqual({
        name: "bill-entry-payment",
        label: "Bill Entry & Payment",
        icon: "i-heroicons-document-plus",
        value: "bill-entry-payment",
      });

      expect(PAYABLES_TABS[2]).toEqual({
        name: "print-checks",
        label: "Print Checks",
        icon: "i-heroicons-printer",
        value: "print-checks",
      });
    });

    it("should have unique names across all tabs", () => {
      const names = PAYABLES_TABS.map((tab) => tab.name);
      const uniqueNames = [...new Set(names)];
      expect(names).toHaveLength(uniqueNames.length);
    });
  });

  describe("PURCHASE_ORDERS_TABS", () => {
    it("should export correct PURCHASE_ORDERS_TABS configuration", () => {
      expect(PURCHASE_ORDERS_TABS).toHaveLength(2);

      expect(PURCHASE_ORDERS_TABS[0]).toEqual({
        name: "purchase-orders",
        label: "Purchase Orders",
        icon: "i-heroicons-shopping-cart-solid",
        value: "purchase-orders",
      });

      expect(PURCHASE_ORDERS_TABS[1]).toEqual({
        name: "stock-receipt-note",
        label: "Stock Receipt Note",
        icon: "i-heroicons-document-text-solid",
        value: "stock-receipt-note",
      });
    });

    it("should have unique names across all tabs", () => {
      const names = PURCHASE_ORDERS_TABS.map((tab) => tab.name);
      const uniqueNames = [...new Set(names)];
      expect(names).toHaveLength(uniqueNames.length);
    });
  });

  describe("PROJECTS_TABS", () => {
    it("should export correct PROJECTS_TABS configuration", () => {
      expect(PROJECTS_TABS).toHaveLength(4);

      expect(PROJECTS_TABS[0]).toEqual({
        name: "project-details",
        label: "Project Details",
        icon: "i-heroicons-clipboard-document-list",
        value: "project-details",
      });

      expect(PROJECTS_TABS[1]).toEqual({
        name: "cost-codes",
        label: "Cost Codes",
        icon: "i-heroicons-currency-dollar",
        value: "cost-codes",
      });

      expect(PROJECTS_TABS[2]).toEqual({
        name: "items",
        label: "Items",
        icon: "i-heroicons-cube",
        value: "items",
      });

      expect(PROJECTS_TABS[3]).toEqual({
        name: "estimates",
        label: "Estimates",
        icon: "i-heroicons-calculator",
        value: "estimates",
      });
    });

    it("should have all required fields", () => {
      PROJECTS_TABS.forEach((tab) => {
        expect(tab).toHaveProperty("name");
        expect(tab).toHaveProperty("label");
        expect(tab).toHaveProperty("icon");
        expect(tab).toHaveProperty("value");
        expect(tab.name).toBe(tab.value);
      });
    });

    it("should have unique names across all tabs", () => {
      const names = PROJECTS_TABS.map((tab) => tab.name);
      const uniqueNames = [...new Set(names)];
      expect(names).toHaveLength(uniqueNames.length);
    });
  });

  describe("MASTERS_TABS", () => {
    it("should export correct MASTERS_TABS configuration", () => {
      expect(MASTERS_TABS).toHaveLength(8);

      expect(MASTERS_TABS[0]).toEqual({
        name: "freight",
        label: "Freight",
        icon: "i-heroicons-truck",
        value: "freight",
      });

      expect(MASTERS_TABS[1]).toEqual({
        name: "ship-via",
        label: "Ship VIA",
        icon: "i-heroicons-paper-airplane",
        value: "ship-via",
      });

      expect(MASTERS_TABS[2]).toEqual({
        name: "approval-checks",
        label: "Approval Checks",
        icon: "i-heroicons-check-circle",
        value: "approval-checks",
      });

      expect(MASTERS_TABS[3]).toEqual({
        name: "po-instruction",
        label: "PO Instruction",
        icon: "i-heroicons-document-text",
        value: "po-instruction",
      });

      expect(MASTERS_TABS[4]).toEqual({
        name: "location",
        label: "Location",
        icon: "i-heroicons-map-pin",
        value: "location",
      });

      expect(MASTERS_TABS[5]).toEqual({
        name: "uom",
        label: "UOM",
        icon: "i-heroicons-scale",
        value: "uom",
      });

      expect(MASTERS_TABS[6]).toEqual({
        name: "charges",
        label: "Charges",
        icon: "i-heroicons-currency-dollar",
        value: "charges",
      });

      expect(MASTERS_TABS[7]).toEqual({
        name: "sales-tax",
        label: "Sales Tax",
        icon: "i-heroicons-receipt-percent",
        value: "sales-tax",
      });
    });

    it("should have all required fields", () => {
      MASTERS_TABS.forEach((tab) => {
        expect(tab).toHaveProperty("name");
        expect(tab).toHaveProperty("label");
        expect(tab).toHaveProperty("icon");
        expect(tab).toHaveProperty("value");
        expect(tab.name).toBe(tab.value);
      });
    });

    it("should have unique names across all tabs", () => {
      const names = MASTERS_TABS.map((tab) => tab.name);
      const uniqueNames = [...new Set(names)];
      expect(names).toHaveLength(uniqueNames.length);
    });
  });

  describe("Cross-tab validation", () => {
    it("should have unique tab names across all tab configurations", () => {
      const allTabNames = [
        ...USERS_TABS.map((tab) => tab.name),
        ...CORPORATION_TABS.map((tab) => tab.name),
        ...PAYABLES_TABS.map((tab) => tab.name),
        ...PROJECTS_TABS.map((tab) => tab.name),
        ...MASTERS_TABS.map((tab) => tab.name),
      ];

      const uniqueNames = [...new Set(allTabNames)];
      expect(allTabNames).toHaveLength(uniqueNames.length);
    });

    it("should follow consistent naming conventions", () => {
      const allTabs = [
        ...USERS_TABS,
        ...CORPORATION_TABS,
        ...PAYABLES_TABS,
        ...PROJECTS_TABS,
        ...MASTERS_TABS,
      ];

      allTabs.forEach((tab) => {
        // Names should be kebab-case
        expect(tab.name).toMatch(/^[a-z]+(-[a-z]+)*$/);

        // Labels should be Title Case with spaces and ampersands
        expect(tab.label).toMatch(/^[A-Z][a-zA-Z\s&]+$/);

        // Icons should be valid icon strings (including numbers for lucide:building-2)
        expect(tab.icon).toMatch(/^[a-z-:0-9]+$/);
      });
    });
  });

  describe("Tab type validation", () => {
    it("should define correct TypeScript types", () => {
      // Test that the tabs match the expected interface structure
      const validateTabConfig = (tab: any) => {
        expect(typeof tab.name).toBe("string");
        expect(typeof tab.label).toBe("string");
        expect(typeof tab.icon).toBe("string");
        expect(typeof tab.value).toBe("string");
      };

      USERS_TABS.forEach(validateTabConfig);
      CORPORATION_TABS.forEach(validateTabConfig);
      PAYABLES_TABS.forEach(validateTabConfig);
      PROJECTS_TABS.forEach(validateTabConfig);
      MASTERS_TABS.forEach(validateTabConfig);
    });
  });
});
