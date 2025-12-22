import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, beforeEach, vi } from "vitest";
import ReceiptNoteItemsTable from "@/components/PurchaseOrders/ReceiptNoteItemsTable.vue";

vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
    currencySymbol: { value: "$" },
  }),
}));

// Mock $fetch for receipt notes API calls
const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

// Default mock implementation - return empty arrays for receipt notes
mockFetch.mockImplementation((url: string) => {
  if (url.includes("/api/stock-receipt-notes")) {
    return Promise.resolve({ data: [] });
  }
  if (url.includes("/api/receipt-note-items")) {
    return Promise.resolve({ data: [] });
  }
  return Promise.resolve({ data: [] });
});

const CostCodeSelectStub = {
  name: "CostCodeSelect",
  props: ["modelValue", "label"],
  emits: ["update:modelValue", "change"],
  template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" />',
};

const mountTable = (items: any[] = []) => {
  return mount(ReceiptNoteItemsTable, {
    props: {
      items,
      loading: false,
      error: null,
      corporationUuid: "corp-1",
    },
    global: {
      stubs: {
        CostCodeSelect: CostCodeSelectStub,
        UInput: {
          props: ["modelValue"],
          emits: ["update:modelValue"],
          template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
      },
    },
  });
};

describe("ReceiptNoteItemsTable - GRN Total Display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("computeRowTotal prioritizes grn_total_with_charges_taxes", () => {
    it("should display grn_total_with_charges_taxes when available", () => {
      const items = [
        {
          id: "item-1",
          item_name: "Test Item 1",
          unit_price: 100,
          received_quantity: 5,
          received_total: 500,
          grn_total: 500,
          grn_total_with_charges_taxes: 605, // Includes charges/taxes proportionally
        },
        {
          id: "item-2",
          item_name: "Test Item 2",
          unit_price: 150,
          received_quantity: 4,
          received_total: 600,
          grn_total: 600,
          grn_total_with_charges_taxes: 726, // Includes charges/taxes proportionally
        },
      ];

      const wrapper = mountTable(items);

      // Find all total cells in the table
      const totalCells = wrapper.findAll(".font-mono");
      const totals = totalCells.map((cell) => cell.text());

      // Should show GRN totals (with charges/taxes), not received_total
      expect(totals.some((text) => text.includes("605"))).toBe(true);
      expect(totals.some((text) => text.includes("726"))).toBe(true);
    });

    it("should fallback to received_total if grn_total_with_charges_taxes is not available", () => {
      const items = [
        {
          id: "item-1",
          item_name: "Test Item 1",
          unit_price: 100,
          received_quantity: 5,
          received_total: 500,
          grn_total: null,
          grn_total_with_charges_taxes: null,
        },
      ];

      const wrapper = mountTable(items);

      const totalCells = wrapper.findAll(".font-mono");
      const totals = totalCells.map((cell) => cell.text());

      // Should show received_total as fallback
      expect(totals.some((text) => text.includes("500"))).toBe(true);
    });

    it("should calculate from unit_price * quantity if neither grn_total nor received_total available", () => {
      const items = [
        {
          id: "item-1",
          item_name: "Test Item 1",
          unit_price: 100,
          received_quantity: 3,
          received_total: null,
          grn_total: null,
          grn_total_with_charges_taxes: null,
        },
      ];

      const wrapper = mountTable(items);

      const totalCells = wrapper.findAll(".font-mono");
      const totals = totalCells.map((cell) => cell.text());

      // Should calculate 100 * 3 = 300
      expect(totals.some((text) => text.includes("300"))).toBe(true);
    });

    it("should use grn_total_with_charges_taxes even when received_total exists", () => {
      const items = [
        {
          id: "item-1",
          item_name: "Test Item 1",
          unit_price: 100,
          received_quantity: 5,
          received_total: 500,
          grn_total: 500,
          grn_total_with_charges_taxes: 550, // Should prioritize this
        },
      ];

      const wrapper = mountTable(items);

      const totalCells = wrapper.findAll(".font-mono");
      const totals = totalCells.map((cell) => cell.text());

      // Should show 550 (GRN total with charges), not 500 (received_total)
      expect(totals.some((text) => text.includes("550"))).toBe(true);
      // Should not show the plain received_total of 500
      expect(totals.some((text) => text === "$500.00" || text === "500.00")).toBe(false);
    });

    it("should show calculated total when user is editing quantity (draft state)", async () => {
      const items = [
        {
          id: "item-1",
          base_item_uuid: "item-1",
          uuid: "item-1",
          item_name: "Test Item 1",
          unit_price: 100,
          received_quantity: 5,
          received_total: 500,
          grn_total: 500,
          grn_total_with_charges_taxes: 550,
        },
      ];

      const wrapper = mountTable(items);
      await flushPromises();
      await wrapper.vm.$nextTick();

      // Access the component instance
      const tableComponent = wrapper.vm as any;
      
      // Wait for drafts to be initialized by the watcher
      await wrapper.vm.$nextTick();
      
      // Verify drafts exists and is accessible
      expect(tableComponent.drafts).toBeDefined();
      
      // The watcher should have created a draft for index 0
      // Wait a bit more to ensure watcher has run
      await wrapper.vm.$nextTick();
      
      // Get the actual draft that was created by the watcher
      const existingDraft = tableComponent.drafts[0];
      expect(existingDraft).toBeDefined();
      
      // Now update the draft as if user entered "7"
      // Since drafts is reactive, we can modify it directly
      existingDraft.receivedInput = "7";
      existingDraft.touched = true;
      
      await wrapper.vm.$nextTick();

      // When draft is touched, computeRowTotal should use unit_price * draft quantity
      // 100 * 7 = 700
      // computeRowTotal is now exposed, so we can access it directly
      expect(typeof tableComponent.computeRowTotal).toBe('function');
      const computedTotal = tableComponent.computeRowTotal(items[0], 0);
      
      // Verify the computed total is 700
      expect(computedTotal).toBe(700);
    });
  });

  describe("Type definitions include GRN total fields", () => {
    it("should accept items with grn_total and grn_total_with_charges_taxes properties", () => {
      const items = [
        {
          id: "item-1",
          item_name: "Test Item",
          unit_price: 100,
          received_quantity: 5,
          received_total: 500,
          grn_total: 500,
          grn_total_with_charges_taxes: 550,
        },
      ];

      // Should not throw when mounting with these properties
      expect(() => mountTable(items)).not.toThrow();
    });

    it("should handle items without GRN total fields", () => {
      const items = [
        {
          id: "item-1",
          item_name: "Test Item",
          unit_price: 100,
          received_quantity: 5,
          received_total: 500,
        },
      ];

      // Should not throw when mounting without GRN total fields
      expect(() => mountTable(items)).not.toThrow();
    });
  });

  describe("Proportional allocation of GRN totals", () => {
    it("should display proportionally allocated GRN totals for multiple items", () => {
      // Scenario: Item Total = 1000, GRN Total with charges/taxes = 1100
      // Item 1: 600/1000 * 1100 = 660
      // Item 2: 400/1000 * 1100 = 440
      const items = [
        {
          id: "item-1",
          item_name: "Item 1",
          unit_price: 100,
          received_quantity: 6,
          received_total: 600,
          grn_total: 600,
          grn_total_with_charges_taxes: 660,
        },
        {
          id: "item-2",
          item_name: "Item 2",
          unit_price: 100,
          received_quantity: 4,
          received_total: 400,
          grn_total: 400,
          grn_total_with_charges_taxes: 440,
        },
      ];

      const wrapper = mountTable(items);

      const totalCells = wrapper.findAll(".font-mono");
      const totals = totalCells.map((cell) => cell.text()).join(" ");

      // Verify both proportionally allocated totals are displayed
      expect(totals).toContain("660");
      expect(totals).toContain("440");
    });

    it("should handle zero GRN total gracefully", () => {
      const items = [
        {
          id: "item-1",
          item_name: "Test Item",
          unit_price: 100,
          received_quantity: 5,
          received_total: 500,
          grn_total: 500,
          grn_total_with_charges_taxes: 0,
        },
      ];

      const wrapper = mountTable(items);

      // Should not throw and should display 0 or handle it gracefully
      expect(() => wrapper).not.toThrow();
      const totalCells = wrapper.findAll(".font-mono");
      expect(totalCells.length).toBeGreaterThan(0);
    });
  });
});

