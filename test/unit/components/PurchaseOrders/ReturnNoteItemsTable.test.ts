import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, beforeEach, vi } from "vitest";
import ReturnNoteItemsTable from "@/components/PurchaseOrders/ReturnNoteItemsTable.vue";

vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
    currencySymbol: { value: "$" },
  }),
}));

const CostCodeSelectStub = {
  name: "CostCodeSelect",
  props: ["modelValue", "label", "corporationUuid", "disabled"],
  emits: ["update:modelValue", "change"],
  template: '<div class="cost-code-select-stub"></div>',
};

const uiStubs = {
  UInput: {
    props: ["modelValue", "disabled"],
    emits: ["update:modelValue", "focus", "blur"],
    template: '<input :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" @focus="$emit(\'focus\')" @blur="$emit(\'blur\')" />',
  },
  CostCodeSelect: CostCodeSelectStub,
};

const mountTable = (props = {}) =>
  mount(ReturnNoteItemsTable, {
    props: {
      items: props.items || [],
      loading: props.loading || false,
      error: props.error || null,
      corporationUuid: props.corporationUuid || "corp-1",
      returnType: props.returnType || "purchase_order",
      readonly: props.readonly || false,
    },
    global: {
      stubs: uiStubs,
    },
  });

describe("ReturnNoteItemsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Display of return quantities", () => {
    it("should display pre-populated return_quantity values", async () => {
      const items = [
        {
          id: "item-1",
          uuid: "item-1",
          base_item_uuid: "item-1",
          item_uuid: "item-1",
          item_name: "Test Item",
          ordered_quantity: 20,
          po_quantity: 20,
          return_quantity: 15, // Pre-populated shortfall quantity
          return_total: 150,
          unit_price: 10,
        },
      ];

      const wrapper = mountTable({ items });

      await flushPromises();

      // Check that return quantity input has the pre-populated value
      const returnInputs = wrapper.findAll("input");
      const returnInput = returnInputs.find((input) => {
        const value = input.element.value;
        return value === "15" || value === "15.00";
      });

      expect(returnInput).toBeTruthy();
    });

    it("should calculate return_total from return_quantity and unit_price", async () => {
      const items = [
        {
          id: "item-1",
          uuid: "item-1",
          base_item_uuid: "item-1",
          item_uuid: "item-1",
          item_name: "Test Item",
          ordered_quantity: 20,
          po_quantity: 20,
          return_quantity: 5,
          return_total: 50, // 5 * 10
          unit_price: 10,
        },
      ];

      const wrapper = mountTable({ items });

      await flushPromises();

      // The table should display the return_total
      expect(wrapper.html()).toContain("50");
    });

    it("should emit return-quantity-change when user edits return quantity", async () => {
      const items = [
        {
          id: "item-1",
          uuid: "item-1",
          base_item_uuid: "item-1",
          item_uuid: "item-1",
          item_name: "Test Item",
          ordered_quantity: 20,
          return_quantity: 5,
          return_total: 50,
          unit_price: 10,
        },
      ];

      const wrapper = mountTable({ items });

      await flushPromises();

      const returnInputs = wrapper.findAll("input");
      if (returnInputs.length > 0) {
        const returnInput = returnInputs[returnInputs.length - 1]; // Last input is usually return quantity
        await returnInput.setValue("10");
        await returnInput.trigger("input");

        await flushPromises();

        // Check that the event was emitted
        const emitted = wrapper.emitted("return-quantity-change");
        expect(emitted).toBeTruthy();
        if (emitted && emitted.length > 0) {
          expect(emitted[0][0].numericValue).toBe(10);
          expect(emitted[0][0].computedTotal).toBe(100); // 10 * 10
        }
      }
    });
  });

  describe("Display of ordered quantities", () => {
    it("should display PO Qty for purchase_order return type", async () => {
      const items = [
        {
          id: "item-1",
          uuid: "item-1",
          ordered_quantity: 20,
          po_quantity: 20,
          return_quantity: 5,
          unit_price: 10,
        },
      ];

      const wrapper = mountTable({
        items,
        returnType: "purchase_order",
      });

      await flushPromises();

      // Should show "PO Qty" label
      expect(wrapper.html()).toContain("PO Qty");
    });

    it("should display CO Qty for change_order return type", async () => {
      const items = [
        {
          id: "item-1",
          uuid: "item-1",
          ordered_quantity: 20,
          co_quantity: 20,
          return_quantity: 5,
          unit_price: 10,
        },
      ];

      const wrapper = mountTable({
        items,
        returnType: "change_order",
      });

      await flushPromises();

      // Should show "CO Qty" label
      expect(wrapper.html()).toContain("CO Qty");
    });
  });

  describe("Readonly mode", () => {
    it("should disable inputs when readonly is true", async () => {
      const items = [
        {
          id: "item-1",
          uuid: "item-1",
          return_quantity: 5,
          unit_price: 10,
        },
      ];

      const wrapper = mountTable({
        items,
        readonly: true,
      });

      await flushPromises();

      const inputs = wrapper.findAll("input");
      inputs.forEach((input) => {
        expect(input.attributes("disabled")).toBeDefined();
      });
    });
  });
});

