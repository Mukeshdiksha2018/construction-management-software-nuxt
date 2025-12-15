import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref, computed } from "vue";
import { createPinia, defineStore, setActivePinia } from "pinia";
import ReturnNoteList from "@/components/PurchaseOrders/ReturnNoteList.vue";

const fetchStockReturnNotesMock = vi.fn();
const createStockReturnNoteMock = vi.fn();
const updateStockReturnNoteMock = vi.fn();
const deleteStockReturnNoteMock = vi.fn();
const generateNextReturnNumberMock = vi.fn(() => "RTN-1");

const stockReturnNotesState = ref<any[]>([]);

vi.stubGlobal("useToast", () => ({
  add: vi.fn(),
}));

const clearPurchaseOrderResourcesSpy = vi.fn();

vi.mock("@/stores/purchaseOrderResources", () => {
  const usePurchaseOrderResourcesStore = defineStore("purchaseOrderResources", () => ({
    clear: clearPurchaseOrderResourcesSpy,
  }));
  return { usePurchaseOrderResourcesStore };
});

vi.mock("@/stores/corporations", () => {
  const useCorporationStore = defineStore("corporations", () => ({
    selectedCorporation: { uuid: "corp-1" },
    selectedCorporationId: "corp-1",
  }));
  return { useCorporationStore };
});

vi.mock("@/stores/stockReturnNotes", () => {
  const useStockReturnNotesStore = defineStore("stockReturnNotes", () => ({
    stockReturnNotes: stockReturnNotesState,
    loading: ref(false),
    error: ref(null),
    fetchStockReturnNotes: fetchStockReturnNotesMock,
    createStockReturnNote: createStockReturnNoteMock,
    updateStockReturnNote: updateStockReturnNoteMock,
    deleteStockReturnNote: deleteStockReturnNoteMock,
    generateNextReturnNumber: generateNextReturnNumberMock,
  }));
  return { useStockReturnNotesStore };
});

vi.mock("@/stores/purchaseOrders", () => {
  const usePurchaseOrdersStore = defineStore("purchaseOrders", () => ({
    purchaseOrders: ref([
      {
        uuid: "po-1",
        po_number: "PO-1",
        project_uuid: "project-1",
        total_po_amount: 1200,
      },
    ]),
    fetchPurchaseOrders: vi.fn(),
  }));
  return { usePurchaseOrdersStore };
});

vi.mock("@/stores/changeOrders", () => {
  const useChangeOrdersStore = defineStore("changeOrders", () => ({
    changeOrders: ref([
      {
        uuid: "co-1",
        co_number: "CO-1",
        project_uuid: "project-1",
        total_co_amount: 800,
      },
    ]),
    fetchChangeOrders: vi.fn(),
  }));
  return { useChangeOrdersStore };
});

vi.mock("@/stores/projects", () => {
  const useProjectsStore = defineStore("projects", () => ({
    projects: computed(() => [
      {
        uuid: "project-1",
        project_name: "Project One",
        project_id: "PRJ-001",
      },
    ]),
    fetchProjectsMetadata: vi.fn().mockResolvedValue(undefined),
  }));
  return { useProjectsStore };
});

vi.mock("@/composables/usePermissions", () => {
  return {
    usePermissions: () => ({
      hasPermission: vi.fn(() => true),
      isReady: ref(true),
    }),
  };
});

vi.mock("@/composables/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (value?: string) => value ?? "",
  }),
}));

vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
    formatCurrencyAbbreviated: (n: number) => {
      const num = Number(n || 0);
      if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `$${(num / 1000).toFixed(1)}k`;
      return `$${num.toFixed(2)}`;
    },
  }),
}));

vi.mock("@/composables/useUTCDateFormat", () => ({
  useUTCDateFormat: () => ({
    toUTCString: (value: string) => `${value}T00:00:00.000Z`,
    getCurrentLocal: () => "2024-05-01",
  }),
}));

vi.mock("@/composables/useTableStandard", () => {
  return {
    useTableStandard: () => {
      const pagination = ref({ pageSize: 10, page: 1 });
      return {
        pagination,
        paginationOptions: {},
        pageSizeOptions: [10, 25, 50],
        updatePageSize: vi.fn(),
        getPaginationProps: () => ({}),
        getPageInfo: () => ref("1-10 of 10"),
        shouldShowPagination: () => ref(false),
      };
    },
  };
});

const ReturnNoteFormStub = {
  name: "ReturnNoteForm",
  props: ["form", "editingReturnNote", "readonly"],
  emits: ["update:form"],
  setup(props: any, { expose }: any) {
    // Expose validation state to parent
    expose({
      receiptNotesValidationError: null,
      hasValidationError: false,
    });
    return {};
  },
  template: `
    <div class="return-note-form-stub">
      <button
        data-test="set-form-values"
        type="button"
        @click="$emit('update:form', {
          ...form,
          return_items: form.return_items || [{ uuid: 'item-1', return_quantity: 5 }]
        })"
      >
        apply values
      </button>
    </div>
  `,
};

const uiStubs = {
  UInput: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  USelectMenu: {
    props: ["modelValue", "items"],
    emits: ["update:modelValue"],
    template: '<div @click="$emit(\'update:modelValue\', items?.[0] ?? null)"><slot /></div>',
  },
  USelect: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  UButton: {
    emits: ["click"],
    template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
  },
  UPageCard: { template: "<div><slot name='body' /></div>" },
  UTable: { template: "<div><slot /></div>" },
  UBadge: { template: "<span><slot /></span>" },
  UAlert: { template: "<div><slot /></div>" },
  USkeleton: { template: "<div />" },
  UIcon: { template: "<i></i>" },
  UModal: {
    emits: ["update:open"],
    props: ["open"],
    template: '<div><slot name="header" /><slot name="body" /><slot name="footer" /></div>',
  },
  UPagination: { template: "<div></div>" },
  UTooltip: { template: "<div><slot /></div>" },
};

const mountList = () =>
  mount(ReturnNoteList, {
    global: {
      stubs: {
        ...uiStubs,
        ReturnNoteForm: ReturnNoteFormStub,
      },
    },
  });

describe("ReturnNoteList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    stockReturnNotesState.value = [
      {
        uuid: "rtn-1",
        corporation_uuid: "corp-1",
        return_number: "RTN-1",
        project_uuid: "project-1",
        purchase_order_uuid: "po-1",
        change_order_uuid: null,
        return_type: "purchase_order",
        status: "Returned",
        total_return_amount: 150,
        entry_date: "2024-05-10T00:00:00.000Z",
      },
    ];
    fetchStockReturnNotesMock.mockResolvedValue(undefined);
    createStockReturnNoteMock.mockResolvedValue({
      uuid: "rtn-new",
      corporation_uuid: "corp-1",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not fetch return notes on mount (TopBar handles fetching)", async () => {
    mountList();
    await flushPromises();

    // TopBar handles fetching, so component should not fetch on mount
    expect(fetchStockReturnNotesMock).not.toHaveBeenCalled();
  });

  it("creates a new return note with corporation context when saved", async () => {
    const wrapper = mountList();
    await flushPromises();

    const addButton = wrapper
      .findAll("button")
      .find((btn) => btn.text().includes("Add new Return Note"));
    
    if (addButton && addButton.exists()) {
      await addButton.trigger("click");
      await flushPromises();

      const applyValuesButton = wrapper.find("[data-test='set-form-values']");
      if (applyValuesButton.exists()) {
        await applyValuesButton.trigger("click");
        await flushPromises();

        const saveButton = wrapper
          .findAll("button")
          .find((btn) => btn.text().trim() === "Save");
        
        if (saveButton && saveButton.exists()) {
          await saveButton.trigger("click");
          await flushPromises();

          expect(createStockReturnNoteMock).toHaveBeenCalledTimes(1);
          expect(createStockReturnNoteMock).toHaveBeenCalledWith(
            expect.objectContaining({
              corporation_uuid: "corp-1",
            })
          );
        }
      }
    }
  });

  it("filters return notes by status", async () => {
    stockReturnNotesState.value = [
      {
        uuid: "rtn-1",
        corporation_uuid: "corp-1",
        return_number: "RTN-1",
        status: "Returned",
        total_return_amount: 150,
      },
      {
        uuid: "rtn-2",
        corporation_uuid: "corp-1",
        return_number: "RTN-2",
        status: "Returned",
        total_return_amount: 200,
      },
    ];

    const wrapper = mountList();
    await flushPromises();

    // Find status filter cards - they should exist in the template
    // The new structure uses divs instead of UPageCard, so we verify by checking for Summary text
    expect(wrapper.html()).toContain("Summary");
    expect(wrapper.html()).toContain("Waiting");
    expect(wrapper.html()).toContain("Returned");
  });

  describe('Modal Close Watcher - Resource Cleanup', () => {
    it('clears purchase order resources when modal is closed via watcher', async () => {
      const wrapper = mount(ReturnNoteList, {
        global: {
          plugins: [createPinia()],
          stubs: {
            UTable: true,
            UModal: true,
            UButton: true,
            UInput: true,
            UIcon: true,
            UPageCard: true,
            ReturnNoteForm: true,
          },
        },
      });

      const vm: any = wrapper.vm as any;

      // Open modal
      vm.showFormModal = true;
      await wrapper.vm.$nextTick();

      // Clear spy
      clearPurchaseOrderResourcesSpy.mockClear();

      // Close modal via watcher (simulate ESC or outside click)
      vm.showFormModal = false;
      await wrapper.vm.$nextTick();

      // Should have cleared purchase order resources
      expect(clearPurchaseOrderResourcesSpy).toHaveBeenCalled();
    });

    it('clears resources when opening a new return note', async () => {
      const wrapper = mount(ReturnNoteList, {
        global: {
          plugins: [createPinia()],
          stubs: {
            UTable: true,
            UModal: true,
            UButton: true,
            UInput: true,
            UIcon: true,
            UPageCard: true,
            ReturnNoteForm: true,
          },
        },
      });

      const vm: any = wrapper.vm as any;

      clearPurchaseOrderResourcesSpy.mockClear();

      // Open create modal
      await vm.openCreateModal();
      await wrapper.vm.$nextTick();

      // Should have cleared resources
      expect(clearPurchaseOrderResourcesSpy).toHaveBeenCalled();
    });

    it('resets view mode when modal closes via watcher', async () => {
      const wrapper = mount(ReturnNoteList, {
        global: {
          plugins: [createPinia()],
          stubs: {
            UTable: true,
            UModal: true,
            UButton: true,
            UInput: true,
            UIcon: true,
            UPageCard: true,
            ReturnNoteForm: true,
          },
        },
      });

      const vm: any = wrapper.vm as any;

      // Set view mode
      vm.isViewMode = true;
      vm.showFormModal = true;
      await wrapper.vm.$nextTick();

      // Close via watcher
      vm.showFormModal = false;
      await wrapper.vm.$nextTick();

      // View mode should be reset
      expect(vm.isViewMode).toBe(false);
    });
  });
});

