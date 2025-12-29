import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia, defineStore } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, readonly, nextTick } from 'vue'
import PurchaseOrdersList from '@/components/PurchaseOrders/PurchaseOrdersList.vue'
import { usePurchaseOrderResourcesStore } from "@/stores/purchaseOrderResources";

// Stubs for Nuxt UI components
const uiStubs = {
  UInput: { template: "<input />" },
  UButton: { 
    template: "<button v-bind='$attrs' @click=\"$emit('click')\"><slot /></button>",
    props: ['color', 'variant', 'icon', 'disabled', 'loading']
  },
  UTooltip: { template: "<div><slot /></div>" },
  UModal: {
    template:
      '<div><slot name="body" /><slot name="footer" /><slot name="header" /></div>',
  },
  UTable: { template: "<table />" },
  UPageCard: { template: '<div><slot name="body" /></div>' },
  UAlert: { template: "<div />" },
  USelect: { template: "<select />" },
  UPagination: { template: "<div />" },
  UIcon: { template: "<span />" },
  USelectMenu: { template: "<select />" },
};

// Stub child form component
vi.mock("@/components/PurchaseOrders/PurchaseOrderForm.vue", () => ({
  default: {
    name: "PurchaseOrderForm",
    template: "<div />",
    props: ["form", "editingPurchaseOrder", "loading", "readonly"],
    emits: ["estimate-import-blocked-change"],
  },
}));

// Mock composables
vi.mock("@/composables/useTableStandard", () => ({
  useTableStandard: () => ({
    pagination: { value: { pageIndex: 0, pageSize: 50 } },
    paginationOptions: {},
    pageSizeOptions: [10, 20, 50],
    updatePageSize: vi.fn(),
    getPaginationProps: vi.fn(() => ({})),
    getPageInfo: vi.fn(() => ({ value: "1-50 of 50 purchase orders" })),
    shouldShowPagination: vi.fn(() => ({ value: true })),
  }),
}));

vi.mock("@/composables/useDateFormat", () => ({
  useDateFormat: () => ({ formatDate: (d: string) => d }),
}));

vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (n: number) => `$${Number(n || 0).toFixed(2)}`,
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
    toUTCString: (s: string) => s,
    getCurrentLocal: () => "2025-01-01",
  }),
}));

const mockHasPermission = vi.fn(() => true);

vi.mock("@/composables/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: mockHasPermission,
    isReady: { value: true },
  }),
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const mockToast = { add: vi.fn() };
vi.stubGlobal("useToast", () => mockToast);

const clearResourcesSpy = { current: vi.fn() };

vi.mock("@/stores/purchaseOrderResources", () => {
  return {
    usePurchaseOrderResourcesStore: defineStore(
      "purchaseOrderResources",
      () => ({
        clear: (...args: any[]) => clearResourcesSpy.current?.(...args),
      })
    ),
  };
});

describe('PurchaseOrdersList.vue - Approval Functionality', () => {
  let pinia: any
  let corpStore: any
  let poStore: any

  beforeEach(() => {
    clearResourcesSpy.current = vi.fn();
    pinia = createPinia();
    setActivePinia(pinia);
    mockHasPermission.mockReset();
    mockHasPermission.mockReturnValue(true);
    mockToast.add.mockReset();

    const useCorporationStore = defineStore("corporations", () => {
      const selectedCorporationId = "corp-1";
      const selectedCorporation = { uuid: "corp-1", corporation_name: "Test Corp" };
      return {
        selectedCorporationId,
        selectedCorporation,
      };
    });

    const usePurchaseOrdersStore = defineStore("purchaseOrders", () => {
      const purchaseOrdersArray = [
        {
          uuid: "po-1",
          corporation_uuid: "corp-1",
          entry_date: "2025-11-05T00:00:00Z",
          po_number: "PO-1",
          po_type: "LABOR",
          credit_days: "NET_30",
          status: "Draft",
          total_po_amount: 100,
        },
      ];
      const fetchPurchaseOrders = vi.fn();
      const fetchPurchaseOrder = vi.fn(async (uuid: string) => {
        return {
          uuid,
          corporation_uuid: "corp-1",
          entry_date: "2025-11-05T00:00:00Z",
          po_number: "PO-1",
          po_type: "LABOR",
          credit_days: "NET_30",
          status: "Draft",
          total_po_amount: 100,
          po_items: [],
          attachments: [],
          removed_po_items: [],
        };
      });
      const createPurchaseOrder = vi.fn(async (payload) => true);
      const updatePurchaseOrder = vi.fn(async (payload) => true);
      const deletePurchaseOrder = vi.fn(async () => true);
      const getPaginationInfo = vi.fn((corporationUuid: string) => ({
        page: 1,
        pageSize: 100,
        totalRecords: purchaseOrdersArray.filter((po: any) => po.corporation_uuid === corporationUuid).length,
        totalPages: 1,
        hasMore: false,
      }));
      return {
        purchaseOrders: purchaseOrdersArray,
        loading: false,
        error: null,
        fetchPurchaseOrders,
        fetchPurchaseOrder,
        createPurchaseOrder,
        updatePurchaseOrder,
        deletePurchaseOrder,
        getPaginationInfo,
      };
    });

    // Initialize stores and save references
    corpStore = useCorporationStore();
    poStore = usePurchaseOrdersStore();
    usePurchaseOrderResourcesStore();
  })

  const mountList = () => {
    return mount(PurchaseOrdersList, {
      global: {
        plugins: [pinia],
        stubs: uiStubs
      }
    })
  }

  describe('Status-based Button Visibility', () => {
    it('should show Save as Draft and Mark Ready buttons for Draft status', async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;

      poStore.fetchPurchaseOrder = vi.fn().mockResolvedValue({
        uuid: "po-1",
        corporation_uuid: "corp-1",
        status: "Draft",
        po_items: [],
        attachments: [],
        removed_po_items: [],
      } as any);

      await vm.editPurchaseOrder({ uuid: "po-1", status: "Draft" });
      await nextTick();

      expect(vm.showFormModal).toBe(true);
      expect(vm.showSaveDraftButton).toBe(true);
      expect(vm.showMarkReadyButton).toBe(true);
      expect(vm.showApprovalButtons).toBe(false);
    });

    it('should show approval buttons for Ready status when user has po_approve permission', async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        if (perm === 'po_approve') return true;
        if (perm === 'po_edit') return true;
        return true;
      });

      const wrapper = mountList();
      const vm: any = wrapper.vm;

      poStore.fetchPurchaseOrder = vi.fn().mockResolvedValue({
        uuid: "po-1",
        corporation_uuid: "corp-1",
        status: "Ready",
        po_items: [],
        attachments: [],
        removed_po_items: [],
      } as any);

      await vm.editPurchaseOrder({ uuid: "po-1", status: "Ready" });
      await nextTick();

      expect(vm.showFormModal).toBe(true);
      expect(vm.showApprovalButtons).toBe(true);
      // showAnySaveButtons should be false when approval buttons are shown
      expect(vm.showAnySaveButtons).toBe(false);
    });

    it('should NOT show approval buttons for Ready status when user lacks po_approve permission', async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        if (perm === 'po_approve') return false;
        if (perm === 'po_edit') return true;
        return true;
      });

      const wrapper = mountList();
      const vm: any = wrapper.vm;

      poStore.fetchPurchaseOrder = vi.fn().mockResolvedValue({
        uuid: "po-1",
        corporation_uuid: "corp-1",
        status: "Ready",
        po_items: [],
        attachments: [],
        removed_po_items: [],
      } as any);

      await vm.editPurchaseOrder({ uuid: "po-1", status: "Ready" });
      await nextTick();

      expect(vm.showFormModal).toBe(true);
      expect(vm.showApprovalButtons).toBe(false);
    });

    it('should show reject button for Approved status when user has po_approve permission', async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        if (perm === 'po_approve') return true;
        if (perm === 'po_edit') return true;
        return true;
      });

      const wrapper = mountList();
      const vm: any = wrapper.vm;

      poStore.fetchPurchaseOrder = vi.fn().mockResolvedValue({
        uuid: "po-1",
        corporation_uuid: "corp-1",
        status: "Approved",
        po_items: [],
        attachments: [],
        removed_po_items: [],
      } as any);

      await vm.editPurchaseOrder({ uuid: "po-1", status: "Approved" });
      await nextTick();

      expect(vm.showFormModal).toBe(true);
      expect(vm.showSaveDraftButton).toBe(true);
      expect(vm.saveDraftButtonLabel).toBe('Reject');
      expect(vm.saveDraftButtonIcon).toBe('i-heroicons-arrow-uturn-left');
      expect(vm.saveDraftButtonColor).toBe('error');
    });

    it('should NOT show reject button for Approved status when user lacks po_approve permission', async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        if (perm === 'po_approve') return false;
        if (perm === 'po_edit') return true;
        return true;
      });

      const wrapper = mountList();
      const vm: any = wrapper.vm;

      poStore.fetchPurchaseOrder = vi.fn().mockResolvedValue({
        uuid: "po-1",
        corporation_uuid: "corp-1",
        status: "Approved",
        po_items: [],
        attachments: [],
        removed_po_items: [],
      } as any);

      await vm.editPurchaseOrder({ uuid: "po-1", status: "Approved" });
      await nextTick();

      expect(vm.showFormModal).toBe(true);
      expect(vm.showSaveDraftButton).toBe(false);
      expect(vm.showMarkReadyButton).toBe(false);
    });
  });

  describe('Status Transition Handlers', () => {
    it('should have handleSaveAsDraft method defined', () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      expect(typeof vm.handleSaveAsDraft).toBe('function');
    });

    it('should have handleMarkReady method defined', () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      expect(typeof vm.handleMarkReady).toBe('function');
    });

    it('should have handleApprove method defined', () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      expect(typeof vm.handleApprove).toBe('function');
    });

    it('should have handleApproveAndRaise method defined', () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      expect(typeof vm.handleApproveAndRaise).toBe('function');
    });

    it('should have handleRejectToDraft method defined', () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      expect(typeof vm.handleRejectToDraft).toBe('function');
    });
  });

  describe('Save and Update Operations', () => {
    it('should have savePurchaseOrder method defined', () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      expect(typeof vm.savePurchaseOrder).toBe('function');
    });

    it('should have loadPurchaseOrderForModal method defined', () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;
      
      expect(typeof vm.loadPurchaseOrderForModal).toBe('function');
    });
  });

  describe('Permission Checks', () => {
    it('should respect po_edit permission for save buttons', async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        if (perm === 'po_edit') return false;
        if (perm === 'po_create') return false;
        return true;
      });

      const wrapper = mountList();
      const vm: any = wrapper.vm;

      poStore.fetchPurchaseOrder = vi.fn().mockResolvedValue({
        uuid: "po-1",
        corporation_uuid: "corp-1",
        status: "Draft",
        po_items: [],
        attachments: [],
        removed_po_items: [],
      } as any);

      await vm.editPurchaseOrder({ uuid: "po-1", status: "Draft" });
      await nextTick();

      expect(vm.canEdit).toBe(false);
      expect(vm.showSaveDraftButton).toBe(false);
      expect(vm.showMarkReadyButton).toBe(false);
    });

    it('should respect po_approve permission for approval buttons', async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        if (perm === 'po_approve') return false;
        if (perm === 'po_edit') return true;
        return true;
      });

      const wrapper = mountList();
      const vm: any = wrapper.vm;

      poStore.fetchPurchaseOrder = vi.fn().mockResolvedValue({
        uuid: "po-1",
        corporation_uuid: "corp-1",
        status: "Ready",
        po_items: [],
        attachments: [],
        removed_po_items: [],
      } as any);

      await vm.editPurchaseOrder({ uuid: "po-1", status: "Ready" });
      await nextTick();

      expect(vm.canApprove).toBe(false);
      expect(vm.showApprovalButtons).toBe(false);
    });
  });

  describe('Create Mode', () => {
    it('should initialize new PO with Draft status', async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;

      await vm.openCreateModal();
      await nextTick();

      expect(vm.poForm.status).toBe('Draft');
    });

    it('should have openCreateModal method that initializes form', async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;

      await vm.openCreateModal();
      await nextTick();

      expect(vm.showFormModal).toBe(true);
      expect(vm.poForm.status).toBe('Draft');
      expect(vm.poForm).toBeDefined();
    });
  });

  describe('View Mode', () => {
    it('should not show any action buttons in view mode', async () => {
      const wrapper = mountList();
      const vm: any = wrapper.vm;

      poStore.fetchPurchaseOrder = vi.fn().mockResolvedValue({
        uuid: "po-1",
        corporation_uuid: "corp-1",
        status: "Draft",
        po_items: [],
        attachments: [],
        removed_po_items: [],
      } as any);

      await vm.previewPurchaseOrder({ uuid: "po-1", status: "Draft" });
      await nextTick();

      expect(vm.showFormModal).toBe(true);
      expect(vm.isViewMode).toBe(true);
      expect(vm.showSaveDraftButton).toBe(false);
      expect(vm.showMarkReadyButton).toBe(false);
      expect(vm.showApprovalButtons).toBe(false);
    });

    it('should switch to edit mode when Edit button is clicked', async () => {
      mockHasPermission.mockImplementation((perm: string) => {
        if (perm === 'po_edit') return true;
        return true;
      });

      const wrapper = mountList();
      const vm: any = wrapper.vm;

      poStore.fetchPurchaseOrder = vi.fn().mockResolvedValue({
        uuid: "po-1",
        corporation_uuid: "corp-1",
        status: "Draft",
        po_items: [],
        attachments: [],
        removed_po_items: [],
      } as any);

      await vm.previewPurchaseOrder({ uuid: "po-1", status: "Draft" });
      await nextTick();

      expect(vm.isViewMode).toBe(true);

      vm.switchToEditMode();
      await nextTick();

      expect(vm.isViewMode).toBe(false);
    });
  });
});

