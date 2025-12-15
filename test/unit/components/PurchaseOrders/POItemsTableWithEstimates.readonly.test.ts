import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia, defineStore } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import POItemsTableWithEstimates from '@/components/PurchaseOrders/POItemsTableWithEstimates.vue'

// Mock composables
vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (n: number) => `$${Number(n || 0).toFixed(2)}`,
    currencySymbol: ref("$"),
  }),
}));

// Mock child components
vi.mock("@/components/Shared/CostCodeSelect.vue", () => ({
  default: {
    name: "CostCodeSelect",
    template: "<select />",
    props: ["modelValue", "disabled"],
  },
}));

vi.mock("@/components/Shared/ItemTypeSelect.vue", () => ({
  default: {
    name: "ItemTypeSelect",
    template: "<select />",
    props: ["modelValue", "disabled"],
  },
}));

vi.mock("@/components/Shared/ItemSelect.vue", () => ({
  default: {
    name: "ItemSelect",
    template: "<select />",
    props: ["modelValue", "disabled"],
  },
}));

vi.mock("@/components/Shared/SequenceSelect.vue", () => ({
  default: {
    name: "SequenceSelect",
    template: "<select />",
    props: ["modelValue", "disabled"],
  },
}));

vi.mock("@/components/Shared/LocationSelect.vue", () => ({
  default: {
    name: "LocationSelect",
    template: "<select />",
    props: ["modelValue", "disabled"],
  },
}));

vi.mock("@/components/Shared/UOMSelect.vue", () => ({
  default: {
    name: "UOMSelect",
    template: "<select />",
    props: ["modelValue", "disabled"],
  },
}));

// Stubs for Nuxt UI components
const uiStubs = {
  UInput: { template: "<input />", props: ["modelValue", "disabled"] },
  UTextarea: { template: "<textarea />", props: ["modelValue", "disabled", "readonly"] },
  UButton: { template: "<button><slot /></button>" },
};

describe('POItemsTableWithEstimates.vue - Readonly Mode', () => {
  let pinia: any

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  const mountComponent = (props = {}) => {
    const defaultProps = {
      items: [
        {
          id: "item-1",
          cost_code_uuid: "cc-1",
          item_type_uuid: "it-1",
          item_uuid: "i-1",
          description: "Test item",
          model_number: "MOD-123",
          location_uuid: "loc-1",
          unit_uuid: "uom-1",
          po_unit_price: 10.50,
          po_quantity: 5,
          po_total: 52.50,
        },
      ],
      loading: false,
      error: null,
      readonly: false,
      ...props,
    };

    return mount(POItemsTableWithEstimates, {
      props: defaultProps,
      global: {
        plugins: [pinia],
        stubs: uiStubs,
      },
    });
  };

  describe('Readonly prop handling', () => {
    it('accepts readonly prop', () => {
      const wrapper = mountComponent({ readonly: true });
      expect(wrapper.props("readonly")).toBe(true);
    });

    it('defaults readonly to false', () => {
      const wrapper = mountComponent();
      expect(wrapper.props("readonly")).toBe(false);
    });
  });

  describe('Select components disabled state', () => {
    it('prevents interaction with CostCodeSelect when readonly is true while preserving appearance', () => {
      const wrapper = mountComponent({ readonly: true });

      // The CostCodeSelect should be disabled when readonly is true
      const costCodeSelect = wrapper.findComponent({ name: "CostCodeSelect" });
      if (costCodeSelect.exists()) {
        expect(costCodeSelect.props("disabled")).toBe(true);
      }

      // It should also be wrapped in a div with pointer-events-none
      const wrapperDiv = wrapper.find('div.pointer-events-none');
      expect(wrapperDiv.exists()).toBe(true);
      expect(wrapperDiv.classes()).toContain('pointer-events-none');
    });

    it('disables ItemTypeSelect when readonly is true', () => {
      const wrapper = mountComponent({ readonly: true });
      
      const itemTypeSelect = wrapper.findComponent({ name: "ItemTypeSelect" });
      if (itemTypeSelect.exists()) {
        expect(itemTypeSelect.props("disabled")).toBe(true);
      }
    });

    it('disables ItemSelect when readonly is true', () => {
      const wrapper = mountComponent({ readonly: true });
      
      const itemSelect = wrapper.findComponent({ name: "ItemSelect" });
      if (itemSelect.exists()) {
        expect(itemSelect.props("disabled")).toBe(true);
      }
    });

    it('disables SequenceSelect when readonly is true', () => {
      const wrapper = mountComponent({ readonly: true });
      
      const sequenceSelect = wrapper.findComponent({ name: "SequenceSelect" });
      if (sequenceSelect.exists()) {
        expect(sequenceSelect.props("disabled")).toBe(true);
      }
    });

    it('disables LocationSelect when readonly is true', () => {
      const wrapper = mountComponent({ readonly: true });
      
      const locationSelect = wrapper.findComponent({ name: "LocationSelect" });
      if (locationSelect.exists()) {
        expect(locationSelect.props("disabled")).toBe(true);
      }
    });

    it('disables UOMSelect when readonly is true', () => {
      const wrapper = mountComponent({ readonly: true });
      
      const uomSelect = wrapper.findComponent({ name: "UOMSelect" });
      if (uomSelect.exists()) {
        expect(uomSelect.props("disabled")).toBe(true);
      }
    });
  });

  describe('Input fields disabled state', () => {
    it('disables model number textarea when readonly is true', () => {
      const wrapper = mountComponent({ readonly: true });
      
      const textareas = wrapper.findAllComponents({ name: "UTextarea" });
      const modelNumberTextarea = textareas.find((t: any) => 
        t.classes().includes("model-number-textarea")
      );
      
      if (modelNumberTextarea && !modelNumberTextarea.props("readonly")) {
        expect(modelNumberTextarea.props("disabled")).toBe(true);
      }
    });

    it('disables quantity input when readonly is true', () => {
      const wrapper = mountComponent({ readonly: true });
      
      const quantityInput = wrapper.find('input[inputmode="decimal"]');
      if (quantityInput.exists()) {
        expect(quantityInput.attributes("disabled")).toBeDefined();
      }
    });

    it('disables unit price input when readonly is true', () => {
      const wrapper = mountComponent({ readonly: true });
      
      // Find all inputs and check if any are unit price inputs
      const inputs = wrapper.findAll('input');
      const unitPriceInput = inputs.find((input: any) => {
        const value = input.attributes("value");
        return value && parseFloat(value) === 10.50;
      });
      
      if (unitPriceInput) {
        expect(unitPriceInput.attributes("disabled")).toBeDefined();
      }
    });
  });

  describe('Action buttons visibility', () => {
    it('hides add and remove buttons when readonly is true', () => {
      const wrapper = mountComponent({ readonly: true });
      
      const buttons = wrapper.findAllComponents({ name: "UButton" });
      const actionButtons = buttons.filter((btn: any) => {
        const icon = btn.props("icon");
        return icon === "i-heroicons-plus" || icon === "i-heroicons-minus";
      });
      
      // Action buttons should not be visible in readonly mode
      expect(actionButtons.length).toBe(0);
    });

    it('shows add and remove buttons when readonly is false', () => {
      const wrapper = mountComponent({ readonly: false });
      
      const buttons = wrapper.findAllComponents({ name: "UButton" });
      const actionButtons = buttons.filter((btn: any) => {
        const icon = btn.props("icon");
        return icon === "i-heroicons-plus" || icon === "i-heroicons-minus";
      });
      
      // Action buttons should be visible in edit mode
      // Note: They might be in a slot, so we check if the slot exists
      const html = wrapper.html();
      expect(html).toContain("i-heroicons-plus") || expect(html).toContain("i-heroicons-minus");
    });
  });

  describe('Mobile view readonly state', () => {
    it('prevents interaction with all mobile view CostCodeSelect components when readonly is true while preserving appearance', () => {
      const wrapper = mountComponent({ readonly: true });

      // CostCodeSelect components should be disabled when readonly is true
      const costCodeSelect = wrapper.findAllComponents({ name: "CostCodeSelect" });
      costCodeSelect.forEach((select) => {
        expect(select.props("disabled")).toBe(true);
      });

      // They should also be wrapped in divs with pointer-events-none
      const wrapperDivs = wrapper.findAll('div.pointer-events-none');
      expect(wrapperDivs.length).toBeGreaterThan(0);
      wrapperDivs.forEach((div) => {
        expect(div.classes()).toContain('pointer-events-none');
      });
    });

    it('hides mobile view action buttons when readonly is true', () => {
      const wrapper = mountComponent({ readonly: true });
      
      // Check that action buttons section is not rendered
      const html = wrapper.html();
      // The action buttons container should not be visible
      const hasActionButtons = html.includes("i-heroicons-plus") || html.includes("i-heroicons-minus");
      expect(hasActionButtons).toBe(false);
    });
  });

  describe('showInvoiceValues disabled state', () => {
    it('disables CostCodeSelect when showInvoiceValues is true', () => {
      const wrapper = mountComponent({ showInvoiceValues: true });
      
      const costCodeSelect = wrapper.findComponent({ name: "CostCodeSelect" });
      if (costCodeSelect.exists()) {
        expect(costCodeSelect.props("disabled")).toBe(true);
      }
      
      // Should also have pointer-events-none
      const wrapperDiv = wrapper.find('div.pointer-events-none');
      expect(wrapperDiv.exists()).toBe(true);
    });

    it('disables ItemTypeSelect when showInvoiceValues is true', () => {
      const wrapper = mountComponent({ showInvoiceValues: true });
      
      const itemTypeSelect = wrapper.findComponent({ name: "ItemTypeSelect" });
      if (itemTypeSelect.exists()) {
        expect(itemTypeSelect.props("disabled")).toBe(true);
      }
    });

    it('disables SequenceSelect when showInvoiceValues is true', () => {
      const wrapper = mountComponent({ showInvoiceValues: true });
      
      const sequenceSelect = wrapper.findComponent({ name: "SequenceSelect" });
      if (sequenceSelect.exists()) {
        expect(sequenceSelect.props("disabled")).toBe(true);
      }
    });

    it('disables ItemSelect when showInvoiceValues is true', () => {
      const wrapper = mountComponent({ showInvoiceValues: true });
      
      const itemSelect = wrapper.findComponent({ name: "ItemSelect" });
      if (itemSelect.exists()) {
        expect(itemSelect.props("disabled")).toBe(true);
      }
    });

    it('disables description textarea when showInvoiceValues is true', () => {
      const wrapper = mountComponent({ showInvoiceValues: true });
      
      const textareas = wrapper.findAllComponents({ name: "UTextarea" });
      const descriptionTextarea = textareas.find((t: any) => 
        t.classes().includes("description-textarea")
      );
      
      if (descriptionTextarea) {
        expect(descriptionTextarea.props("readonly")).toBe(true);
        expect(descriptionTextarea.props("disabled")).toBe(true);
      }
    });

    it('disables PO fields when both readonly and showInvoiceValues are true', () => {
      const wrapper = mountComponent({ readonly: true, showInvoiceValues: true });
      
      const costCodeSelect = wrapper.findComponent({ name: "CostCodeSelect" });
      if (costCodeSelect.exists()) {
        expect(costCodeSelect.props("disabled")).toBe(true);
      }
      
      const itemTypeSelect = wrapper.findComponent({ name: "ItemTypeSelect" });
      if (itemTypeSelect.exists()) {
        expect(itemTypeSelect.props("disabled")).toBe(true);
      }
      
      const sequenceSelect = wrapper.findComponent({ name: "SequenceSelect" });
      if (sequenceSelect.exists()) {
        expect(sequenceSelect.props("disabled")).toBe(true);
      }
      
      const itemSelect = wrapper.findComponent({ name: "ItemSelect" });
      if (itemSelect.exists()) {
        expect(itemSelect.props("disabled")).toBe(true);
      }
    });

    it('keeps PO fields enabled when showInvoiceValues is false and readonly is false', () => {
      const wrapper = mountComponent({ readonly: false, showInvoiceValues: false });
      
      const costCodeSelect = wrapper.findComponent({ name: "CostCodeSelect" });
      if (costCodeSelect.exists()) {
        expect(costCodeSelect.props("disabled")).toBeFalsy();
      }
      
      const itemTypeSelect = wrapper.findComponent({ name: "ItemTypeSelect" });
      if (itemTypeSelect.exists()) {
        expect(itemTypeSelect.props("disabled")).toBeFalsy();
      }
      
      const sequenceSelect = wrapper.findComponent({ name: "SequenceSelect" });
      if (sequenceSelect.exists()) {
        expect(sequenceSelect.props("disabled")).toBeFalsy();
      }
      
      const itemSelect = wrapper.findComponent({ name: "ItemSelect" });
      if (itemSelect.exists()) {
        expect(itemSelect.props("disabled")).toBeFalsy();
      }
    });
  });
});

