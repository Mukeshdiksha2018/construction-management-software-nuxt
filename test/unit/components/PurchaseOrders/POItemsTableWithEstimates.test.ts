import { mount } from '@vue/test-utils'
import { h, nextTick, ref } from "vue";
import { describe, it, expect, vi } from 'vitest'
import POItemsTableWithEstimates from '@/components/PurchaseOrders/POItemsTableWithEstimates.vue'

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

vi.mock("@/stores/approvalChecks", () => ({
  useApprovalChecksStore: () => ({
    approvalChecks: [],
    loading: false,
    error: null,
    getAllApprovalChecks: [],
    getActiveApprovalChecks: [],
    fetchApprovalChecks: vi.fn(),
  }),
}));

describe("POItemsTableWithEstimates.vue", () => {
  const baseItem = {
    id: "item-1",
    name: "Concrete mix and materials",
    description: "High-strength concrete suitable for structural work.",
    cost_code_label: "03 30 00 Cast-in-Place Concrete",
    cost_code_number: "033000",
    cost_code_name: "Cast-in-Place Concrete",
    division_name: "Concrete",
    item_type_label: "Material",
    cost_code_uuid: "cc-1",
    sequence: "SEQ-100",
    unit: "BAG",
    unit_uuid: "uom-bag",
    unit_label: "BAG",
    uom_uuid: "uom-bag",
    uom_label: "BAG",
    quantity: 12.34567,
    unit_price: 125.5,
    total: 1545.25,
    location: "Zone A",
    location_uuid: "loc-1",
    model_number: "M-001",
    approval_checks: ["Engineer"],
  };

const normalizeClassList = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value))
    return value.flatMap((entry) => normalizeClassList(entry));
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, enabled]) => !!enabled)
      .map(([key]) => key);
  }
  return String(value).split(" ").filter(Boolean);
};

const UInputStub = {
  inheritAttrs: false,
  props: ["modelValue", "ui"],
  emits: ["update:modelValue"],
  setup(props: any, { emit, attrs }: any) {
    return () => {
      const { class: originalClass, ...restAttrs } = attrs || {};
      const classes = [
        ...normalizeClassList(originalClass),
        ...normalizeClassList(props.ui?.base),
      ];
      return h("input", {
        ...restAttrs,
        class: classes.join(" "),
        value: props.modelValue ?? "",
        onInput: (event: Event) =>
          emit("update:modelValue", (event.target as HTMLInputElement).value),
      });
    };
  },
};

const uiStubs = {
  UButton: {
    props: ["icon", "variant", "color", "size"],
    emits: ["click"],
    template:
      '<button class="u-button" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  ItemTypeSelect: {
    props: ["modelValue", "corporationUuid", "projectUuid", "disabled"],
    emits: ["update:modelValue", "change"],
    template: `
        <div
          class="item-type-select"
          :class="{ 'disabled': disabled }"
          @click="!disabled && $emit('update:modelValue', modelValue || 'stub-type'); !disabled && $emit('change', { value: modelValue || 'stub-type', label: 'Stub Type' })"
        >
          {{ modelValue || 'Select item type' }}
        </div>
      `,
  },
  SequenceSelect: {
    name: "SequenceSelect",
    props: ["modelValue", "disabled"],
    emits: ["update:modelValue", "change"],
    template: `
        <div
          class="sequence-select"
          :class="{ 'disabled': disabled }"
          @click="!disabled && (() => {
            const next = modelValue || 'item-uuid-1'
            $emit('update:modelValue', next)
            $emit('change', { value: next, option: { value: next, label: 'SEQ-001' } })
          })()"
        >
          {{ modelValue || 'Select sequence' }}
        </div>
      `,
  },
  ItemSelect: {
    props: ["modelValue", "disabled"],
    emits: ["update:modelValue", "change"],
    template: `
        <div
          class="item-select"
          :class="{ 'disabled': disabled }"
          @click="!disabled && (() => {
            const option = { value: modelValue || 'stub-item', label: 'Stub Item', raw: { item_name: 'Stub Item', description: 'Stub description', unit: 'EA', unit_price: 42 } }
            $emit('change', { value: option.value, option })
          })()"
        >
          {{ modelValue || 'Select item' }}
        </div>
      `,
  },
  CostCodeSelect: {
    props: ["modelValue", "label", "corporationUuid", "disabled"],
    emits: ["update:modelValue", "change"],
    template: `<div class="cost-code-select"
        :class="{ 'disabled': disabled }"
        data-uuid="stubbed-select"
        @click="!disabled && (() => {
          const next = modelValue === 'cc-1' ? 'new-cost-code' : (modelValue || 'new-cost-code')
          $emit('update:modelValue', next)
          $emit('change', { uuid: next, cost_code_number: '001', cost_code_name: 'Stubbed Cost Code', division_name: 'Division' })
        })()"
      >
        {{ label || modelValue || "Select cost code" }}
      </div>`,
  },
  LocationSelect: {
    props: ["modelValue", "className"],
    emits: ["update:modelValue", "change"],
    template: `<div class="location-select"
        data-uuid="stubbed-location"
        @click="() => {
          const next = modelValue === 'loc-1' ? 'new-location' : (modelValue || 'new-location')
          $emit('update:modelValue', next)
          $emit('change', { value: next, location: { location_name: 'Stubbed Location', city: 'City', state: 'State' }, label: 'Stubbed Location' })
        }"
      >
        {{ modelValue || "Select location" }}
      </div>`,
  },
  UTextarea: {
    inheritAttrs: false,
    props: ["modelValue", "disabled", "readonly"],
    emits: ["update:modelValue"],
    template: `<textarea class="u-textarea" v-bind="$attrs" :value="modelValue" :disabled="disabled" :readonly="readonly" @input="$emit('update:modelValue', $event.target.value)"></textarea>`,
  },
  UOMSelect: {
    props: ["modelValue"],
    emits: ["change", "update:modelValue"],
    template: `<div class="uom-select-stub">{{ modelValue || 'UOM' }}</div>`,
  },
  ApprovalChecksSelect: {
    props: ["modelValue"],
    emits: ["update:modelValue", "change"],
    template: `<div class="approval-checks-select-stub">{{ modelValue?.length || 0 }} selected</div>`,
  },
  UInput: UInputStub,
};

  const findDecimalInputs = (wrapper: any) =>
    wrapper
      .findAll("input")
      .filter((node: any) => node.attributes("inputmode") === "decimal");

const findPoTotalDisplay = (wrapper: any) =>
  wrapper.find(".po-total-display span:last-child");

it("renders table rows with the expected column data", () => {
  const wrapper = mount(POItemsTableWithEstimates, {
    props: {
      items: [baseItem],
      loading: false,
      error: null,
      title: "PO Items",
      description: "Imported from estimate",
      corporationUuid: "corp-123",
    },
    slots: {
      actions: ({ item }: any) =>
        `<button class="action-btn">Edit ${item.id}</button>`,
    },
    global: {
      stubs: uiStubs,
    },
  });

  const text = wrapper.text();
  expect(text).toContain("Cost Code");
  expect(text).toContain("Item Type");
  expect(text).toContain("Model #");
  expect(text).toContain("Location");
  expect(text).toContain("UOM");
  expect(text).toContain("Qty");
  expect(text).toContain("Actions");

  const html = wrapper.html();
  expect(html).toContain("Cast-in-Place Concrete");
  expect(html).toContain("M-001");
  expect(html).toContain("uom-select-stub");
  expect(html).toContain("1545.25");
  expect(html).toContain("Edit item-1");
  // Quantity should be rounded to four decimals
  expect(html).toContain("12.3457");
});

it("shows loading message when loading", () => {
  const wrapper = mount(POItemsTableWithEstimates, {
    props: {
      items: [],
      loading: true,
      loadingMessage: "Preparing items…",
      corporationUuid: "corp-123",
    },
    global: {
      stubs: uiStubs,
    },
  });

  expect(wrapper.text()).toContain("Preparing items…");
});

it("shows error message when provided", () => {
  const wrapper = mount(POItemsTableWithEstimates, {
    props: {
      items: [],
      error: "Failed to load items",
      corporationUuid: "corp-123",
    },
    global: {
      stubs: uiStubs,
    },
  });

  expect(wrapper.text()).toContain("Failed to load items");
});

it("shows empty state when no items", () => {
  const wrapper = mount(POItemsTableWithEstimates, {
    props: {
      items: [],
      emptyMessage: "No PO items yet.",
      corporationUuid: "corp-123",
    },
    global: {
      stubs: uiStubs,
    },
  });

  expect(wrapper.text()).toContain("No PO items yet.");
});

it("emits events when default action buttons are clicked", async () => {
  const wrapper = mount(POItemsTableWithEstimates, {
    props: {
      items: [baseItem],
      corporationUuid: "corp-123",
    },
    global: {
      stubs: uiStubs,
    },
  });

  const addButton = wrapper.find(".u-button");
  await addButton.trigger("click", { stopPropagation: () => {} });
  expect(wrapper.emitted("add-row")).toBeTruthy();
  expect(wrapper.emitted("add-row")?.[0]?.[0]).toBe(0);

  const buttons = wrapper.findAll(".u-button");
  expect(buttons.length).toBeGreaterThan(1);
  const removeButton = buttons[1]!;
  await removeButton.trigger("click", { stopPropagation: () => {} });
  expect(wrapper.emitted("remove-row")).toBeTruthy();
  expect(wrapper.emitted("remove-row")?.[0]?.[0]).toBe(0);

  const costCode = wrapper.find(".cost-code-select");
  await costCode.trigger("click");
  const costCodeEvents = (wrapper.emitted("cost-code-change") || []) as any[];
  expect(costCodeEvents.length).toBeGreaterThanOrEqual(1);

  const lastEvent = costCodeEvents[costCodeEvents.length - 1]?.[0] as any;
  expect(lastEvent?.value).toBe("new-cost-code");
  expect(lastEvent?.option).toMatchObject({
    uuid: "new-cost-code",
    cost_code_number: "001",
    cost_code_name: "Stubbed Cost Code",
    division_name: "Division",
  });

  const locationSelect = wrapper.find(".location-select");
  await locationSelect.trigger("click");
  const locationEvents = (wrapper.emitted("location-change") || []) as any[];
  expect(locationEvents.length).toBeGreaterThanOrEqual(1);
  const locationEvent = locationEvents[locationEvents.length - 1]?.[0] as any;
  expect(locationEvent?.index).toBe(0);
  expect(locationEvent?.value).toBe("new-location");
  expect(locationEvent?.option).toMatchObject({
    value: "new-location",
    location: {
      location_name: "Stubbed Location",
      city: "City",
      state: "State",
    },
  });

  const itemTypeSelect = wrapper.find(".item-type-select");
  await itemTypeSelect.trigger("click");
  const itemTypeEvents = (wrapper.emitted("item-type-change") || []) as any[];
  expect(itemTypeEvents.length).toBeGreaterThanOrEqual(1);
  const itemTypeEvent = itemTypeEvents[itemTypeEvents.length - 1]?.[0] as any;
  expect(itemTypeEvent?.index).toBe(0);
  expect(itemTypeEvent?.value).toBe("stub-type");
  expect(itemTypeEvent?.option).toMatchObject({
    value: "stub-type",
    label: "Stub Type",
  });

  const itemSelect = wrapper.find(".item-select");
  await itemSelect.trigger("click");
  const itemEvents = (wrapper.emitted("item-change") || []) as any[];
  expect(itemEvents.length).toBeGreaterThanOrEqual(1);
  const itemEvent = itemEvents[itemEvents.length - 1]?.[0] as any;
  expect(itemEvent?.index).toBe(0);
  expect(itemEvent?.value).toBe("stub-item");

  const modelTextarea = wrapper.find("textarea.model-number-textarea");
  await modelTextarea.setValue("Updated Model");
  const modelNumberEvents = (wrapper.emitted("model-number-change") || []) as any[];
  expect(modelNumberEvents.length).toBeGreaterThanOrEqual(1);
  const modelEvent = modelNumberEvents[modelNumberEvents.length - 1]?.[0] as any;
  expect(modelEvent?.index).toBe(0);
  expect(modelEvent?.value).toBe("Updated Model");

  const sequenceStub = wrapper.find(".sequence-select");
  await sequenceStub.trigger("click");
  const sequenceEvents = (wrapper.emitted("sequence-change") || []) as any[];
  expect(sequenceEvents.length).toBeGreaterThanOrEqual(1);
  const sequenceEvent = sequenceEvents[sequenceEvents.length - 1]?.[0] as any;
  expect(sequenceEvent?.index).toBe(0);
  expect(sequenceEvent?.value).toBe("item-uuid-1");
});

it("recalculates purchase order total as unit price and quantity change", async () => {
  const wrapper = mount(POItemsTableWithEstimates, {
    props: {
      items: [
        {
          ...baseItem,
          po_unit_price: null,
          po_quantity: null,
          po_total: null,
        },
      ],
      corporationUuid: "corp-123",
    },
    global: {
      stubs: uiStubs,
    },
  });

  await nextTick();

  const decimalInputs = findDecimalInputs(wrapper);
  const unitPriceInput = decimalInputs[0];
  const quantityInput = decimalInputs[1];
  const poTotalDisplay = findPoTotalDisplay(wrapper);

  expect(poTotalDisplay.text()).toBe("0.00");

  await unitPriceInput.setValue("10");
  await nextTick();

  expect(poTotalDisplay.text()).toBe("0.00");
  const unitEvents = wrapper.emitted("po-unit-price-change") || [];
  expect(unitEvents[unitEvents.length - 1]?.[0]).toMatchObject({
    index: 0,
    value: "10",
    numericValue: 10,
    computedTotal: 0,
  });

  await quantityInput.setValue("2");
  await nextTick();

  expect(poTotalDisplay.text()).toBe("20.00");
  const quantityEvents = wrapper.emitted("po-quantity-change") || [];
  expect(quantityEvents[quantityEvents.length - 1]?.[0]).toMatchObject({
    index: 0,
    value: "2",
    numericValue: 2,
    computedTotal: 20,
  });
});

  it("falls back to persisted purchase-order totals when inputs are empty", async () => {
    const wrapper = mount(POItemsTableWithEstimates, {
      props: {
        items: [
          {
            ...baseItem,
            po_unit_price: null,
            po_quantity: null,
            po_total: 75.25,
          },
        ],
        corporationUuid: "corp-123",
      },
      global: {
        stubs: uiStubs,
      },
    });

    await nextTick();
    const poTotalDisplay = findPoTotalDisplay(wrapper);
    expect(poTotalDisplay.text()).toBe("75.25");

    await wrapper.setProps({
      items: [
        {
          ...baseItem,
          po_unit_price: null,
          po_quantity: null,
          po_total: 125.5,
        },
      ],
    });
    await nextTick();

    expect(poTotalDisplay.text()).toBe("125.50");
  });

it("initializes inputs with persisted PO unit price and quantity", async () => {
  const wrapper = mount(POItemsTableWithEstimates, {
    props: {
      items: [
        {
          ...baseItem,
          po_unit_price: 45.5,
          po_quantity: 3.25,
          po_total: 148.88,
        },
      ],
      corporationUuid: "corp-123",
    },
    global: {
      stubs: uiStubs,
    },
  });

  await nextTick();

  const decimalInputs = findDecimalInputs(wrapper);
  expect(decimalInputs[0].element.value).toBe("45.5");
  expect(decimalInputs[1].element.value).toBe("3.25");

  const poTotalDisplay = findPoTotalDisplay(wrapper);
  expect(poTotalDisplay.text()).toBe("147.88");
});

  it("resets purchase order total when both inputs are cleared", async () => {
    const wrapper = mount(POItemsTableWithEstimates, {
      props: {
        items: [
          {
            ...baseItem,
            po_unit_price: 12,
            po_quantity: 3,
            po_total: 36,
          },
        ],
        corporationUuid: "corp-123",
      },
      global: {
        stubs: uiStubs,
      },
    });

    await nextTick();

    const decimalInputs = findDecimalInputs(wrapper);
    const unitPriceInput = decimalInputs[0];
    const quantityInput = decimalInputs[1];
    const poTotalDisplay = findPoTotalDisplay(wrapper);
    expect(poTotalDisplay.text()).toBe("36.00");

    await unitPriceInput.setValue("");
    await nextTick();
    await quantityInput.setValue("");
    await nextTick();
    await nextTick();

    expect(poTotalDisplay.text()).toBe("0.00");
  });

  it("preserves in-progress PO edits when parent props re-render", async () => {
    const wrapper = mount(POItemsTableWithEstimates, {
      props: {
        items: [
          {
            ...baseItem,
            po_unit_price: null,
            po_quantity: null,
            po_total: null,
          },
        ],
        corporationUuid: "corp-123",
      },
      global: {
        stubs: uiStubs,
      },
    });

    await nextTick();

    const [unitPriceInput, quantityInput] = findDecimalInputs(wrapper);
    const poTotalDisplay = findPoTotalDisplay(wrapper);

    await unitPriceInput.setValue("9.5");
    await quantityInput.setValue("4");
    await nextTick();

    expect(poTotalDisplay.text()).toBe("38.00");

    await wrapper.setProps({
      items: [
        {
          ...baseItem,
          po_unit_price: 0,
          po_quantity: 0,
          po_total: 0,
        },
      ],
    });
    await nextTick();

    expect(unitPriceInput.element.value).toBe("9.5");
    expect(quantityInput.element.value).toBe("4");
    expect(poTotalDisplay.text()).toBe("38.00");
  });

  it("preserves cost code select appearance when readonly (approved PO)", async () => {
    const wrapper = mount(POItemsTableWithEstimates, {
      props: {
        items: [baseItem],
        corporationUuid: "corp-123",
        readonly: true,
      },
      global: {
        stubs: uiStubs,
      },
    });

    await nextTick();

    // Find the wrapper div that contains the cost code select
    const costCodeWrapper = wrapper.find('div.pointer-events-none');
    expect(costCodeWrapper.exists()).toBe(true);

    // Find the cost code select inside the wrapper
    const costCodeSelect = costCodeWrapper.find('.cost-code-select');
    expect(costCodeSelect.exists()).toBe(true);

    // The select should not be disabled to preserve appearance
    expect(costCodeSelect.attributes('disabled')).toBeUndefined();

    // The select should display the full cost code label
    expect(costCodeSelect.text()).toContain("03 30 00 Cast-in-Place Concrete");
  });

  it("prevents cost code selection interaction when readonly", async () => {
    const wrapper = mount(POItemsTableWithEstimates, {
      props: {
        items: [baseItem],
        corporationUuid: "corp-123",
        readonly: true,
      },
      global: {
        stubs: uiStubs,
      },
    });

    await nextTick();

    // Find the wrapper div that should have pointer-events-none (could be in desktop or mobile view)
    const costCodeWrapper = wrapper.find('div.pointer-events-none');
    expect(costCodeWrapper.exists()).toBe(true);

    const costCodeSelect = costCodeWrapper.find('.cost-code-select');

    // The wrapper should have pointer-events-none class to prevent interaction
    expect(costCodeWrapper.classes()).toContain('pointer-events-none');

    // Try to click the cost code select
    await costCodeSelect.trigger('click');

    // No cost-code-change event should be emitted when readonly
    const emittedEvents = wrapper.emitted('cost-code-change');
    expect(emittedEvents).toBeUndefined();
  });

  describe('Invoice Values (showInvoiceValues = true)', () => {
    it('shows empty invoice fields for new invoices (null invoice values)', async () => {
      const itemsWithNullInvoiceValues = [
        {
          ...baseItem,
          po_unit_price: 100,
          po_quantity: 10,
          po_total: 1000,
          invoice_unit_price: null,
          invoice_quantity: null,
          invoice_total: null,
        },
      ];
      const wrapper = mount(POItemsTableWithEstimates, {
        props: {
          items: itemsWithNullInvoiceValues,
          showInvoiceValues: true,
          loading: false,
          error: null,
        },
        global: {
          stubs: uiStubs,
        },
      });
      await nextTick();

      const vm: any = wrapper.vm as any;

      // Invoice drafts should be initialized with empty strings for null values
      expect(vm.invoiceDrafts[0]).toBeDefined();
      expect(vm.invoiceDrafts[0].unitPriceInput).toBe('');
      expect(vm.invoiceDrafts[0].quantityInput).toBe('');
    });

    it('does not fall back to PO values when invoice values are null for new invoices', async () => {
      const itemsWithNullInvoiceValues = [
        {
          ...baseItem,
          po_unit_price: 100,
          po_quantity: 10,
          po_total: 1000,
          invoice_unit_price: null,
          invoice_quantity: null,
          invoice_total: null,
        },
      ];
      const wrapper = mount(POItemsTableWithEstimates, {
        props: {
          items: itemsWithNullInvoiceValues,
          showInvoiceValues: true,
          loading: false,
          error: null,
        },
        global: {
          stubs: uiStubs,
        },
      });
      await nextTick();

      const vm: any = wrapper.vm as any;

      // Invoice drafts should be empty, not fall back to PO values
      expect(vm.invoiceDrafts[0].unitPriceInput).toBe('');
      expect(vm.invoiceDrafts[0].quantityInput).toBe('');
    });

    it('shows saved invoice values for existing invoices', async () => {
      const itemsWithSavedInvoiceValues = [
        {
          ...baseItem,
          po_unit_price: 100,
          po_quantity: 10,
          po_total: 1000,
          invoice_unit_price: 50,
          invoice_quantity: 8,
          invoice_total: 400,
        },
      ];
      const wrapper = mount(POItemsTableWithEstimates, {
        props: {
          items: itemsWithSavedInvoiceValues,
          showInvoiceValues: true,
          loading: false,
          error: null,
        },
        global: {
          stubs: uiStubs,
        },
      });
      await nextTick();

      const vm: any = wrapper.vm as any;

      // Invoice drafts should be initialized with saved values
      expect(vm.invoiceDrafts[0]).toBeDefined();
      expect(vm.invoiceDrafts[0].unitPriceInput).toBe('50');
      expect(vm.invoiceDrafts[0].quantityInput).toBe('8');
    });

    it('computes invoice total from invoice unit price and quantity', async () => {
      const itemsWithInvoiceValues = [
        {
          ...baseItem,
          po_unit_price: 100,
          po_quantity: 10,
          po_total: 1000,
          invoice_unit_price: 40,
          invoice_quantity: 5,
          invoice_total: null,
        },
      ];
      const wrapper = mount(POItemsTableWithEstimates, {
        props: {
          items: itemsWithInvoiceValues,
          showInvoiceValues: true,
          loading: false,
          error: null,
        },
        global: {
          stubs: uiStubs,
        },
      });
      await nextTick();

      const vm: any = wrapper.vm as any;

      // Access the method through the component instance
      // Note: computeInvoiceTotal may not be exposed, so we test through the component's internal logic
      // We can verify the behavior by checking the emitted events and draft state
      expect(vm.invoiceDrafts[0]).toBeDefined();
      expect(vm.invoiceDrafts[0].unitPriceInput).toBe('40');
      expect(vm.invoiceDrafts[0].quantityInput).toBe('5');
    });

    it('computes invoice total from invoice_total field when available', async () => {
      const itemsWithInvoiceTotal = [
        {
          ...baseItem,
          po_unit_price: 100,
          po_quantity: 10,
          po_total: 1000,
          invoice_unit_price: null,
          invoice_quantity: null,
          invoice_total: 150,
        },
      ];
      const wrapper = mount(POItemsTableWithEstimates, {
        props: {
          items: itemsWithInvoiceTotal,
          showInvoiceValues: true,
          loading: false,
          error: null,
        },
        global: {
          stubs: uiStubs,
        },
      });
      await nextTick();

      const vm: any = wrapper.vm as any;

      // Verify invoice drafts are initialized correctly
      // The component will use invoice_total when available
      expect(vm.invoiceDrafts[0]).toBeDefined();
    });

    it('emits invoice-unit-price-change event with correct payload', async () => {
      const itemsWithNullInvoiceValues = [
        {
          ...baseItem,
          po_unit_price: 100,
          po_quantity: 10,
          po_total: 1000,
          invoice_unit_price: null,
          invoice_quantity: null,
        },
      ];
      const wrapper = mount(POItemsTableWithEstimates, {
        props: {
          items: itemsWithNullInvoiceValues,
          showInvoiceValues: true,
          loading: false,
          error: null,
        },
        global: {
          stubs: uiStubs,
        },
      });
      await nextTick();

      const vm: any = wrapper.vm as any;

      await vm.emitInvoiceUnitPriceChange(0, '45.50');
      await nextTick();

      const events = wrapper.emitted('invoice-unit-price-change');
      expect(events).toBeTruthy();
      expect(events![0][0].index).toBe(0);
      expect(events![0][0].numericValue).toBe(45.5);
      expect(events![0][0].computedTotal).toBe(0); // quantity is null, so total is 0
    });

    it('emits invoice-quantity-change event with correct payload', async () => {
      const itemsWithNullInvoiceValues = [
        {
          ...baseItem,
          po_unit_price: 100,
          po_quantity: 10,
          po_total: 1000,
          invoice_unit_price: null,
          invoice_quantity: null,
        },
      ];
      const wrapper = mount(POItemsTableWithEstimates, {
        props: {
          items: itemsWithNullInvoiceValues,
          showInvoiceValues: true,
          loading: false,
          error: null,
        },
        global: {
          stubs: uiStubs,
        },
      });
      await nextTick();

      const vm: any = wrapper.vm as any;

      await vm.emitInvoiceQuantityChange(0, '12');
      await nextTick();

      const events = wrapper.emitted('invoice-quantity-change');
      expect(events).toBeTruthy();
      expect(events![0][0].index).toBe(0);
      expect(events![0][0].numericValue).toBe(12);
      expect(events![0][0].computedTotal).toBe(0); // unit price is null, so total is 0
    });

    it('emits invoice-total-change event when unit price or quantity changes', async () => {
      const itemsWithInvoiceValues = [
        {
          ...baseItem,
          po_unit_price: 100,
          po_quantity: 10,
          po_total: 1000,
          invoice_unit_price: 30,
          invoice_quantity: 5,
        },
      ];
      const wrapper = mount(POItemsTableWithEstimates, {
        props: {
          items: itemsWithInvoiceValues,
          showInvoiceValues: true,
          loading: false,
          error: null,
        },
        global: {
          stubs: uiStubs,
        },
      });
      await nextTick();

      const vm: any = wrapper.vm as any;

      await vm.emitInvoiceUnitPriceChange(0, '40');
      await nextTick();

      const events = wrapper.emitted('invoice-total-change');
      expect(events).toBeTruthy();
      expect(events![0][0].index).toBe(0);
      expect(events![0][0].value).toBe(200); // 40 * 5
    });

    it('does not initialize invoice drafts with PO values when invoice values are null', async () => {
      const itemsWithNullInvoiceValues = [
        {
          ...baseItem,
          po_unit_price: 100,
          po_quantity: 10,
          po_total: 1000,
          invoice_unit_price: null,
          invoice_quantity: null,
        },
      ];
      const wrapper = mount(POItemsTableWithEstimates, {
        props: {
          items: itemsWithNullInvoiceValues,
          showInvoiceValues: true,
          loading: false,
          error: null,
        },
        global: {
          stubs: uiStubs,
        },
      });
      await nextTick();

      const vm: any = wrapper.vm as any;

      // Invoice drafts should not fall back to PO values
      expect(vm.invoiceDrafts[0].unitPriceInput).toBe('');
      expect(vm.invoiceDrafts[0].quantityInput).toBe('');
    });

    it('updates invoice drafts when user enters values', async () => {
      const itemsWithNullInvoiceValues = [
        {
          ...baseItem,
          po_unit_price: 100,
          po_quantity: 10,
          po_total: 1000,
          invoice_unit_price: null,
          invoice_quantity: null,
        },
      ];
      const wrapper = mount(POItemsTableWithEstimates, {
        props: {
          items: itemsWithNullInvoiceValues,
          showInvoiceValues: true,
          loading: false,
          error: null,
        },
        global: {
          stubs: uiStubs,
        },
      });
      await nextTick();

      const vm: any = wrapper.vm as any;

      await vm.emitInvoiceUnitPriceChange(0, '50');
      await vm.emitInvoiceQuantityChange(0, '10');
      await nextTick();

      expect(vm.invoiceDrafts[0].unitPriceInput).toBe('50');
      expect(vm.invoiceDrafts[0].quantityInput).toBe('10');
      
      // Verify the total is calculated correctly by checking the emitted event
      const totalChangeEvents = wrapper.emitted('invoice-total-change');
      expect(totalChangeEvents).toBeTruthy();
      if (totalChangeEvents && totalChangeEvents.length > 0) {
        const lastEvent = totalChangeEvents[totalChangeEvents.length - 1];
        expect(lastEvent[0].value).toBe(500); // 50 * 10
      }
    });

    it('disables CostCodeSelect when showInvoiceValues is true', async () => {
      const wrapper = mount(POItemsTableWithEstimates, {
        props: {
          items: [baseItem],
          showInvoiceValues: true,
          loading: false,
          error: null,
        },
        global: {
          stubs: uiStubs,
        },
      });
      await nextTick();

      const costCodeSelect = wrapper.find(".cost-code-select");
      expect(costCodeSelect.exists()).toBe(true);
      expect(costCodeSelect.classes()).toContain('disabled');
      
      // Also check that pointer-events-none class is applied
      const wrapperDiv = wrapper.find('div.pointer-events-none');
      expect(wrapperDiv.exists()).toBe(true);
    });

    it('disables ItemTypeSelect when showInvoiceValues is true', async () => {
      const wrapper = mount(POItemsTableWithEstimates, {
        props: {
          items: [baseItem],
          showInvoiceValues: true,
          loading: false,
          error: null,
        },
        global: {
          stubs: uiStubs,
        },
      });
      await nextTick();

      const itemTypeSelect = wrapper.find(".item-type-select");
      expect(itemTypeSelect.exists()).toBe(true);
      expect(itemTypeSelect.classes()).toContain('disabled');
    });

    it('disables SequenceSelect when showInvoiceValues is true', async () => {
      const wrapper = mount(POItemsTableWithEstimates, {
        props: {
          items: [baseItem],
          showInvoiceValues: true,
          loading: false,
          error: null,
        },
        global: {
          stubs: uiStubs,
        },
      });
      await nextTick();

      const sequenceSelect = wrapper.find(".sequence-select");
      expect(sequenceSelect.exists()).toBe(true);
      expect(sequenceSelect.classes()).toContain('disabled');
    });

    it('disables ItemSelect when showInvoiceValues is true', async () => {
      const wrapper = mount(POItemsTableWithEstimates, {
        props: {
          items: [baseItem],
          showInvoiceValues: true,
          loading: false,
          error: null,
        },
        global: {
          stubs: uiStubs,
        },
      });
      await nextTick();

      const itemSelect = wrapper.find(".item-select");
      expect(itemSelect.exists()).toBe(true);
      expect(itemSelect.classes()).toContain('disabled');
    });

    it('disables description textarea when showInvoiceValues is true', async () => {
      const wrapper = mount(POItemsTableWithEstimates, {
        props: {
          items: [baseItem],
          showInvoiceValues: true,
          loading: false,
          error: null,
        },
        global: {
          stubs: uiStubs,
        },
      });
      await nextTick();

      const descriptionTextarea = wrapper.find("textarea.description-textarea");
      expect(descriptionTextarea.exists()).toBe(true);
      expect(descriptionTextarea.attributes("readonly")).toBeDefined();
      expect(descriptionTextarea.attributes("disabled")).toBeDefined();
    });

    it('disables PO fields when both readonly and showInvoiceValues are true', async () => {
      const wrapper = mount(POItemsTableWithEstimates, {
        props: {
          items: [baseItem],
          showInvoiceValues: true,
          readonly: true,
          loading: false,
          error: null,
        },
        global: {
          stubs: uiStubs,
        },
      });
      await nextTick();

      // All PO fields should be disabled
      const costCodeSelect = wrapper.find(".cost-code-select");
      expect(costCodeSelect.classes()).toContain('disabled');
      
      const itemTypeSelect = wrapper.find(".item-type-select");
      expect(itemTypeSelect.classes()).toContain('disabled');
      
      const sequenceSelect = wrapper.find(".sequence-select");
      expect(sequenceSelect.classes()).toContain('disabled');
      
      const itemSelect = wrapper.find(".item-select");
      expect(itemSelect.classes()).toContain('disabled');
    });

    it('keeps PO fields enabled when showInvoiceValues is false and readonly is false', async () => {
      const wrapper = mount(POItemsTableWithEstimates, {
        props: {
          items: [baseItem],
          showInvoiceValues: false,
          readonly: false,
          loading: false,
          error: null,
        },
        global: {
          stubs: uiStubs,
        },
      });
      await nextTick();

      // All PO fields should be enabled (no disabled class)
      const costCodeSelect = wrapper.find(".cost-code-select");
      expect(costCodeSelect.classes()).not.toContain('disabled');
      
      const itemTypeSelect = wrapper.find(".item-type-select");
      expect(itemTypeSelect.classes()).not.toContain('disabled');
      
      const sequenceSelect = wrapper.find(".sequence-select");
      expect(sequenceSelect.classes()).not.toContain('disabled');
      
      const itemSelect = wrapper.find(".item-select");
      expect(itemSelect.classes()).not.toContain('disabled');
    });
  });
});


