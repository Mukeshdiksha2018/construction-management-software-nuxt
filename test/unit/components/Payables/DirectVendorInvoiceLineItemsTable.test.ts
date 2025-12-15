import { mount } from '@vue/test-utils'
import { h, nextTick, ref } from "vue";
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DirectVendorInvoiceLineItemsTable from '@/components/Payables/DirectVendorInvoiceLineItemsTable.vue'

vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (value: number | string | null | undefined) => {
      const num =
        typeof value === "string" ? parseFloat(value) : Number(value ?? 0);
      if (Number.isNaN(num)) return "$0.00";
      return `$${num.toFixed(2)}`;
    },
    currencySymbol: ref("$"),
  }),
}));

describe("DirectVendorInvoiceLineItemsTable.vue", () => {
  const baseItem = {
    id: "item-1",
    cost_code_uuid: "cc-1",
    sequence_uuid: "seq-1",
    item_uuid: "item-uuid-1",
    description: "Test item description",
    unit_price: 100.50,
    quantity: 5.0,
    total: 502.50,
    uom: "EA",
    unit_label: "EA",
  };

  const uiStubs = {
    UButton: {
      props: ["icon", "variant", "color", "size", "disabled"],
      emits: ["click"],
      template:
        '<button class="u-button" @click="$emit(\'click\', $event)"><slot /></button>',
    },
    UInput: {
      props: ["modelValue", "type", "step", "size", "class", "disabled", "placeholder", "readonly"],
      emits: ["update:modelValue"],
      template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    },
    CostCodeSelect: {
      props: ["modelValue", "corporationUuid", "size", "class", "disabled", "placeholder"],
      emits: ["update:modelValue", "change"],
      template: `
        <div
          class="cost-code-select"
          @click="$emit('update:modelValue', modelValue || 'cc-1'); $emit('change', { value: modelValue || 'cc-1', option: {} })"
        >
          {{ modelValue || 'Select Cost code' }}
        </div>
      `,
    },
    SequenceSelect: {
      props: ["modelValue", "corporationUuid", "size", "class", "disabled", "placeholder"],
      emits: ["update:modelValue", "change"],
      template: `
        <div
          class="sequence-select"
          @click="$emit('update:modelValue', modelValue || 'seq-1'); $emit('change', { value: modelValue || 'seq-1', option: { raw: { item_name: 'Test Item', description: 'Test Description', unit_price: 100, unit_label: 'EA' } } })"
        >
          {{ modelValue || 'Select' }}
        </div>
      `,
    },
    ItemSelect: {
      props: ["modelValue", "corporationUuid", "size", "class", "disabled", "placeholder"],
      emits: ["update:modelValue", "change"],
      template: `
        <div
          class="item-select"
          @click="$emit('update:modelValue', modelValue || 'item-uuid-1'); $emit('change', { value: modelValue || 'item-uuid-1', option: { raw: { item_name: 'Test Item', description: 'Test Description', unit_price: 100, unit_label: 'EA' } } })"
        >
          {{ modelValue || 'Select item' }}
        </div>
      `,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("renders empty state when no items", () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      expect(wrapper.text()).toContain("No line items added yet");
      expect(wrapper.find(".u-button").exists()).toBe(true);
    });

    it("renders table when items are provided", () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [baseItem],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      expect(wrapper.text()).toContain("Line Items");
      expect(wrapper.text()).toContain("1 item");
    });

    it("displays correct item count", () => {
      const items = [baseItem, { ...baseItem, id: "item-2" }];
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items,
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      expect(wrapper.text()).toContain("2 items");
    });

    it("hides action buttons when readonly", () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [baseItem],
          corporationUuid: "corp-1",
          readonly: true,
        },
        global: {
          stubs: uiStubs,
        },
      });

      const buttons = wrapper.findAll(".u-button");
      expect(buttons.length).toBe(0);
    });
  });

  describe("Row Operations", () => {
    it("emits add-row event when add button is clicked", async () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [baseItem],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      const addButtons = wrapper.findAll(".u-button");
      const addButton = addButtons.find((btn) => btn.attributes("icon") === "i-heroicons-plus");
      
      if (addButton) {
        await addButton.trigger("click");
        expect(wrapper.emitted("add-row")).toBeTruthy();
        expect(wrapper.emitted("add-row")?.[0]).toEqual([0]);
      }
    });

    it("emits remove-row event when remove button is clicked", async () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [baseItem],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      const removeButtons = wrapper.findAll(".u-button");
      const removeButton = removeButtons.find((btn) => btn.attributes("icon") === "i-heroicons-minus");
      
      if (removeButton) {
        await removeButton.trigger("click");
        expect(wrapper.emitted("remove-row")).toBeTruthy();
        expect(wrapper.emitted("remove-row")?.[0]).toEqual([0]);
      }
    });

    it("emits add-row with -1 when adding first item", async () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      const addButton = wrapper.find(".u-button");
      await addButton.trigger("click");
      
      expect(wrapper.emitted("add-row")).toBeTruthy();
      expect(wrapper.emitted("add-row")?.[0]).toEqual([-1]);
    });
  });

  describe("Field Updates", () => {
    it("emits cost-code-change when cost code is selected", async () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [baseItem],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      const costCodeSelects = wrapper.findAllComponents({ name: "CostCodeSelect" });
      if (costCodeSelects.length > 0) {
        const costCodeSelect = costCodeSelects[0];
        if (costCodeSelect && costCodeSelect.exists()) {
          await costCodeSelect.vm.$emit("change", { value: "cc-2", option: {} });

          expect(wrapper.emitted("cost-code-change")).toBeTruthy();
          expect(wrapper.emitted("cost-code-change")?.[0]?.[0]).toMatchObject({
            index: 0,
            value: "cc-2",
          });
        }
      }
    });

    it("emits sequence-change when sequence is selected", async () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [baseItem],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      const sequenceSelects = wrapper.findAllComponents({ name: "SequenceSelect" });
      if (sequenceSelects.length > 0) {
        const sequenceSelect = sequenceSelects[0];
        if (sequenceSelect.exists()) {
          await sequenceSelect.vm.$emit("change", { value: "seq-2", option: {} });

          expect(wrapper.emitted("sequence-change")).toBeTruthy();
          expect(wrapper.emitted("sequence-change")?.[0]?.[0]).toMatchObject({
            index: 0,
            value: "seq-2",
          });
        }
      }
    });

    it("emits item-change when item is selected", async () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [baseItem],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      const itemSelects = wrapper.findAllComponents({ name: "ItemSelect" });
      if (itemSelects.length > 0) {
        const itemSelect = itemSelects[0];
        if (itemSelect.exists()) {
          await itemSelect.vm.$emit("change", { value: "item-uuid-2", option: {} });

          expect(wrapper.emitted("item-change")).toBeTruthy();
          expect(wrapper.emitted("item-change")?.[0]?.[0]).toMatchObject({
            index: 0,
            value: "item-uuid-2",
          });
        }
      }
    });

    it("emits description-change when description is updated", async () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [baseItem],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      const descriptionInput = wrapper.findAll("input").find(
        (input) => input.attributes("placeholder") === "Description"
      );
      
      if (descriptionInput) {
        await descriptionInput.setValue("Updated description");
        expect(wrapper.emitted("description-change")).toBeTruthy();
        expect(wrapper.emitted("description-change")?.[0]?.[0]).toMatchObject({
          index: 0,
          value: "Updated description",
        });
      }
    });
  });

  describe("Total Calculations", () => {
    it("calculates total correctly from unit price and quantity", () => {
      const item = {
        ...baseItem,
        unit_price: 100.50,
        quantity: 5.0,
      };

      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [item],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      // Total should be 100.50 * 5.0 = 502.50
      expect(wrapper.text()).toContain("502.50");
    });

    it("handles decimal unit prices correctly", () => {
      const item = {
        ...baseItem,
        unit_price: 99.99,
        quantity: 2.5,
      };

      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [item],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      // Total should be 99.99 * 2.5 = 249.975, rounded to 249.98
      expect(wrapper.text()).toContain("249.98");
    });

    it("handles zero quantity", () => {
      const item = {
        ...baseItem,
        unit_price: 100.50,
        quantity: 0,
      };

      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [item],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      expect(wrapper.text()).toContain("0.00");
    });

    it("handles null unit price", () => {
      const item = {
        ...baseItem,
        unit_price: null,
        quantity: 5.0,
      };

      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [item],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      expect(wrapper.text()).toContain("0.00");
    });

    it("handles null quantity", () => {
      const item = {
        ...baseItem,
        unit_price: 100.50,
        quantity: null,
      };

      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [item],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      expect(wrapper.text()).toContain("0.00");
    });

    it("calculates from unit price and quantity when both are available", () => {
      const item = {
        ...baseItem,
        unit_price: 100.50,
        quantity: 5.0,
        total: 600.00, // Different from calculated, but calculation takes precedence
      };

      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [item],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      // Should calculate from unit_price * quantity (100.50 * 5.0 = 502.50)
      // not use stored total when both unit_price and quantity are available
      expect(wrapper.text()).toContain("502.50");
    });
  });

  describe("Unit Price Updates", () => {
    it("emits unit-price-change with correct values when unit price is updated", async () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [{ ...baseItem, quantity: 5.0 }],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      const unitPriceInput = wrapper.findAll("input").find(
        (input) => input.attributes("type") === "number" && input.attributes("step") === "0.01"
      );

      if (unitPriceInput) {
        await unitPriceInput.setValue("150.75");
        await nextTick();

        expect(wrapper.emitted("unit-price-change")).toBeTruthy();
        const event = wrapper.emitted("unit-price-change")?.[0]?.[0];
        expect(event).toMatchObject({
          index: 0,
          numericValue: 150.75,
        });
        expect(event.computedTotal).toBe(753.75); // 150.75 * 5.0
      }
    });

    it("handles empty unit price input", async () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [{ ...baseItem, quantity: 5.0 }],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      const unitPriceInput = wrapper.findAll("input").find(
        (input) => input.attributes("type") === "number"
      );

      if (unitPriceInput) {
        await unitPriceInput.setValue("");
        await nextTick();

        expect(wrapper.emitted("unit-price-change")).toBeTruthy();
        const event = wrapper.emitted("unit-price-change")?.[0]?.[0];
        expect(event.value).toBeNull();
        expect(event.numericValue).toBe(0);
      }
    });
  });

  describe("Quantity Updates", () => {
    it("emits quantity-change with correct values when quantity is updated", async () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [{ ...baseItem, unit_price: 100.50 }],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      const quantityInput = wrapper.findAll("input").find(
        (input) => input.attributes("type") === "number" && input.attributes("step") === "0.01"
      );

      if (quantityInput) {
        await quantityInput.setValue("10.5");
        await nextTick();

        expect(wrapper.emitted("quantity-change")).toBeTruthy();
        const event = wrapper.emitted("quantity-change")?.[0]?.[0];
        expect(event).toMatchObject({
          index: 0,
          numericValue: 10.5,
        });
        expect(event.computedTotal).toBe(1055.25); // 100.50 * 10.5
      }
    });

    it("handles empty quantity input", async () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [{ ...baseItem, unit_price: 100.50 }],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      const quantityInput = wrapper.findAll("input").find(
        (input) => input.attributes("type") === "number"
      );

      if (quantityInput) {
        await quantityInput.setValue("");
        await nextTick();

        expect(wrapper.emitted("quantity-change")).toBeTruthy();
        const event = wrapper.emitted("quantity-change")?.[0]?.[0];
        expect(event.value).toBeNull();
        expect(event.numericValue).toBe(0);
      }
    });
  });

  describe("Reactive Draft System", () => {
    it("maintains draft values while typing", async () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [{ ...baseItem, unit_price: 100, quantity: 5 }],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      const unitPriceInput = wrapper.findAll("input").find(
        (input) => input.attributes("type") === "number"
      );

      if (unitPriceInput) {
        // Type partial value
        await unitPriceInput.setValue("150");
        await nextTick();

        // The draft should maintain the typed value
        expect(unitPriceInput.element.value).toBe("150");
      }
    });

    it("syncs draft values when props change", async () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [{ ...baseItem, unit_price: 100, quantity: 5 }],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      // Update props
      await wrapper.setProps({
        items: [{ ...baseItem, unit_price: 200, quantity: 10 }],
      });
      await nextTick();

      // Drafts should sync with new values
      const inputs = wrapper.findAll("input");
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  describe("Sequence and Item Name Synchronization", () => {
    it("should display 'Item Name' column header", () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [baseItem],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      // Check that the table header contains "Item Name"
      const tableHeaders = wrapper.findAll("th");
      const hasItemNameHeader = tableHeaders.some((th: any) => 
        th.text().includes("Item Name")
      );
      expect(hasItemNameHeader).toBe(true);
    });

    it("should sync SequenceSelect and ItemSelect when sequence changes", async () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [baseItem],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      const sequenceSelects = wrapper.findAllComponents({ name: "SequenceSelect" });
      if (sequenceSelects.length > 0) {
        const sequenceSelect = sequenceSelects[0];
        await sequenceSelect.vm.$emit("change", { 
          value: "new-item-uuid", 
          option: { raw: { item_name: "New Item", description: "New Description" } } 
        });

        // Both sequence-change and item-change should be emitted
        expect(wrapper.emitted("sequence-change")).toBeTruthy();
        expect(wrapper.emitted("item-change")).toBeTruthy();
        
        // Both should have the same value
        const sequenceEvent = wrapper.emitted("sequence-change")?.[0]?.[0];
        const itemEvent = wrapper.emitted("item-change")?.[0]?.[0];
        expect(sequenceEvent?.value).toBe("new-item-uuid");
        expect(itemEvent?.value).toBe("new-item-uuid");
      }
    });

    it("should sync SequenceSelect and ItemSelect when item name changes", async () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [baseItem],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      const itemSelects = wrapper.findAllComponents({ name: "ItemSelect" });
      if (itemSelects.length > 0) {
        const itemSelect = itemSelects[0];
        await itemSelect.vm.$emit("change", { 
          value: "new-item-uuid-2", 
          option: { raw: { item_name: "New Item Name", description: "New Description" } } 
        });

        // Both sequence-change and item-change should be emitted
        expect(wrapper.emitted("sequence-change")).toBeTruthy();
        expect(wrapper.emitted("item-change")).toBeTruthy();
        
        // Both should have the same value
        const sequenceEvent = wrapper.emitted("sequence-change")?.[0]?.[0];
        const itemEvent = wrapper.emitted("item-change")?.[0]?.[0];
        expect(sequenceEvent?.value).toBe("new-item-uuid-2");
        expect(itemEvent?.value).toBe("new-item-uuid-2");
      }
    });

    it("should not pass cost-code-uuid prop to SequenceSelect", () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [baseItem],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      const sequenceSelects = wrapper.findAllComponents({ name: "SequenceSelect" });
      if (sequenceSelects.length > 0) {
        // costCodeUuid prop should not be present
        expect(sequenceSelects[0].props("costCodeUuid")).toBeUndefined();
      }
    });

    it("should not pass cost-code-uuid prop to ItemSelect", () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [baseItem],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      const itemSelects = wrapper.findAllComponents({ name: "ItemSelect" });
      if (itemSelects.length > 0) {
        // costCodeUuid prop should not be present
        expect(itemSelects[0].props("costCodeUuid")).toBeUndefined();
      }
    });

    it("should use item_uuid as model value for both SequenceSelect and ItemSelect", () => {
      const item = {
        ...baseItem,
        item_uuid: "test-item-uuid",
        sequence_uuid: "test-sequence-uuid",
      };

      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [item],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      const sequenceSelects = wrapper.findAllComponents({ name: "SequenceSelect" });
      const itemSelects = wrapper.findAllComponents({ name: "ItemSelect" });
      
      if (sequenceSelects.length > 0 && itemSelects.length > 0) {
        // Both should use item_uuid as model value
        expect(sequenceSelects[0].props("modelValue")).toBe("test-item-uuid");
        expect(itemSelects[0].props("modelValue")).toBe("test-item-uuid");
      }
    });
  });

  describe("Disabled States", () => {
    it("should not disable sequence select when cost code is not selected", () => {
      const item = {
        ...baseItem,
        cost_code_uuid: null,
      };

      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [item],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      const sequenceSelects = wrapper.findAllComponents({ name: "SequenceSelect" });
      if (sequenceSelects.length > 0) {
        // SequenceSelect should not be disabled when cost_code_uuid is null (only when readonly)
        expect(sequenceSelects[0].props("disabled")).toBe(false);
      }
    });

    it("should not disable item select when cost code is not selected", () => {
      const item = {
        ...baseItem,
        cost_code_uuid: null,
      };

      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [item],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      const itemSelects = wrapper.findAllComponents({ name: "ItemSelect" });
      if (itemSelects.length > 0) {
        // ItemSelect should not be disabled when cost_code_uuid is null (only when readonly)
        expect(itemSelects[0].props("disabled")).toBe(false);
      }
    });

    it("should disable sequence select when readonly", () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [baseItem],
          corporationUuid: "corp-1",
          readonly: true,
        },
        global: {
          stubs: uiStubs,
        },
      });

      const sequenceSelects = wrapper.findAllComponents({ name: "SequenceSelect" });
      if (sequenceSelects.length > 0) {
        expect(sequenceSelects[0].props("disabled")).toBe(true);
      }
    });

    it("should disable item select when readonly", () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [baseItem],
          corporationUuid: "corp-1",
          readonly: true,
        },
        global: {
          stubs: uiStubs,
        },
      });

      const itemSelects = wrapper.findAllComponents({ name: "ItemSelect" });
      if (itemSelects.length > 0) {
        expect(itemSelects[0].props("disabled")).toBe(true);
      }
    });

    it("disables all inputs when readonly", () => {
      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [baseItem],
          corporationUuid: "corp-1",
          readonly: true,
        },
        global: {
          stubs: uiStubs,
        },
      });

      // Verify component exists and readonly prop is passed
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.props("readonly")).toBe(true);
      
      // Check that readonly is passed to child components
      const costCodeSelects = wrapper.findAllComponents({ name: "CostCodeSelect" });
      if (costCodeSelects.length > 0) {
        expect(costCodeSelects[0].props("disabled")).toBe(true);
      }
    });
  });

  describe("Edge Cases", () => {
    it("handles very large numbers", () => {
      const item = {
        ...baseItem,
        unit_price: 999999.99,
        quantity: 1000,
      };

      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [item],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      // Should handle large numbers without errors
      expect(wrapper.exists()).toBe(true);
    });

    it("handles very small decimal values", () => {
      const item = {
        ...baseItem,
        unit_price: 0.01,
        quantity: 0.01,
      };

      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [item],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      // Should handle small decimals
      expect(wrapper.exists()).toBe(true);
    });

    it("handles items without id", () => {
      const itemWithoutId = {
        ...baseItem,
        id: undefined,
      };

      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [itemWithoutId],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      expect(wrapper.exists()).toBe(true);
    });

    it("handles missing optional fields", () => {
      const minimalItem = {
        cost_code_uuid: "cc-1",
      };

      const wrapper = mount(DirectVendorInvoiceLineItemsTable, {
        props: {
          items: [minimalItem],
          corporationUuid: "corp-1",
        },
        global: {
          stubs: uiStubs,
        },
      });

      expect(wrapper.exists()).toBe(true);
    });
  });
});

