import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import POLaborItemsTable from "@/components/PurchaseOrders/POLaborItemsTable.vue";

vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (n: number) => `$${Number(n || 0).toFixed(2)}`,
    currencySymbol: { value: "$" },
  }),
}));

describe("POLaborItemsTable - Edit Selection Button", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  const mockItems = [
    {
      id: "labor-item-1",
      cost_code_uuid: "cc-1",
      cost_code_label: "Cost Code 1",
      po_amount: 1000.50,
    },
    {
      id: "labor-item-2",
      cost_code_uuid: "cc-2",
      cost_code_label: "Cost Code 2",
      po_amount: 2000.75,
    },
  ];

  const createWrapper = (props: any = {}) => {
    return mount(POLaborItemsTable, {
      props: {
        items: mockItems,
        title: "Labor PO Items",
        showEditSelection: false,
        ...props,
      },
      global: {
        plugins: [pinia],
        stubs: {
          UButton: {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
            props: ["icon", "color", "variant", "size", "disabled"],
          },
          CostCodeSelect: { template: "<select />" },
          CurrencyInput: { template: "<input />" },
        },
      },
    });
  };

  describe("Edit Selection Button Visibility", () => {
    it("should show Edit Selection button when showEditSelection is true and items exist", () => {
      const wrapper = createWrapper({ showEditSelection: true });
      
      const buttons = wrapper.findAll("button");
      const editButton = buttons.find(btn => btn.text().includes("Edit Selection"));
      expect(editButton).toBeDefined();
    });

    it("should show Edit Selection button when showEditSelection is true even if no items exist", () => {
      const wrapper = createWrapper({ 
        showEditSelection: true,
        items: []
      });
      
      const buttons = wrapper.findAll("button");
      const editButton = buttons.find(btn => btn.text().includes("Edit Selection"));
      expect(editButton).toBeDefined();
    });

    it("should not show Edit Selection button when showEditSelection is false", () => {
      const wrapper = createWrapper({ showEditSelection: false });
      
      const buttons = wrapper.findAll("button");
      const editButton = buttons.find(btn => btn.text().includes("Edit Selection"));
      expect(editButton).toBeUndefined();
    });

    it("should emit edit-selection event when button is clicked", async () => {
      const wrapper = createWrapper({ showEditSelection: true });
      
      const buttons = wrapper.findAll("button");
      const editButton = buttons.find(btn => btn.text().includes("Edit Selection"));
      
      expect(editButton).toBeDefined();
      
      if (editButton) {
        await editButton.trigger("click");
        await wrapper.vm.$nextTick();
        
        const emitted = wrapper.emitted("edit-selection");
        expect(emitted).toBeTruthy();
        if (emitted) {
          expect(emitted.length).toBeGreaterThanOrEqual(1);
        }
      }
    });
  });

  describe("Button Position and Layout", () => {
    it("should display items count correctly when items exist", () => {
      const wrapper = createWrapper({ showEditSelection: true });
      
      expect(wrapper.text()).toContain(`${mockItems.length} items`);
    });

    it("should not display items count when no items exist", () => {
      const wrapper = createWrapper({ 
        showEditSelection: true,
        items: []
      });
      
      // Check that the items count pattern (e.g., "2 items") is not present
      // The empty message "No items found." contains "items" but not the count pattern
      const text = wrapper.text();
      const itemsCountPattern = /\d+\s+items/;
      expect(text).not.toMatch(itemsCountPattern);
    });

    it("should have correct props structure", () => {
      const wrapper = createWrapper({ showEditSelection: true });
      
      expect(wrapper.props("showEditSelection")).toBe(true);
      expect(wrapper.props("items")).toEqual(mockItems);
    });
  });
});
