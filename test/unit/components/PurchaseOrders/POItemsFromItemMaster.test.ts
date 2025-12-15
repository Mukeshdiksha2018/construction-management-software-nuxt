import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import POItemsFromItemMaster from "@/components/PurchaseOrders/POItemsFromItemMaster.vue";

const TableStub = {
  name: "POItemsTableWithEstimatesStub",
  props: ["items", "showEstimateValues"],
  emits: [
    "add-row",
    "remove-row",
    "cost-code-change",
    "location-change",
    "item-type-change",
    "item-change",
    "model-number-change",
    "uom-change",
    "po-unit-price-change",
    "po-quantity-change",
    "po-total-change",
  ],
  setup() {
    return () => null;
  },
};

describe("POItemsFromItemMaster.vue", () => {
  it("forwards props to PO items table with estimate values hidden", () => {
    const items = [
      {
        id: "line-1",
        name: "Preferred Item",
        po_unit_price: 25,
        po_quantity: 4,
      },
    ];

    const wrapper = mount(POItemsFromItemMaster, {
      props: {
        items,
        corporationUuid: "corp-1",
        projectUuid: "proj-1",
      },
      global: {
        stubs: {
          POItemsTableWithEstimates: TableStub,
        },
      },
    });

    const stub = wrapper.findComponent(TableStub as any);
    expect(stub.exists()).toBe(true);
    expect(stub.props("items")).toEqual(items);
    expect(stub.props("showEstimateValues")).toBe(false);
  });

  it("re-emits child table events", () => {
    const wrapper = mount(POItemsFromItemMaster, {
      props: {
        items: [],
      },
      global: {
        stubs: {
          POItemsTableWithEstimates: TableStub,
        },
      },
    });

    const payload = {
      index: 0,
      value: "42",
      numericValue: 42,
      computedTotal: 84,
    };

    const stub = wrapper.findComponent(TableStub as any);
    stub.vm.$emit("po-unit-price-change", payload);
    stub.vm.$emit("po-quantity-change", payload);
    stub.vm.$emit("sequence-change", { index: 0, value: "item-uuid-1" });

    expect(wrapper.emitted("po-unit-price-change")?.[0]?.[0]).toEqual(payload);
    expect(wrapper.emitted("po-quantity-change")?.[0]?.[0]).toEqual(payload);
    expect(wrapper.emitted("sequence-change")?.[0]?.[0]).toEqual({
      index: 0,
      value: "item-uuid-1",
    });
  });
});


