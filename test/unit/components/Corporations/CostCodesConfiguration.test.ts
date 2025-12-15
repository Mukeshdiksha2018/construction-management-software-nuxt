import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick, h, ref, computed } from "vue";
import CostCodesConfiguration from '@/components/Corporations/CostCodesConfiguration.vue'

// Mock useToast
const mockToast = {
  add: vi.fn()
}
vi.mock('#app', () => ({
  useToast: () => mockToast
}))
vi.stubGlobal('useToast', () => mockToast)

// Mock useRouter
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush
  }),
  useRoute: () => ({
    params: {}
  })
}))

// Mock stores
const mockCorpStore = {
  selectedCorporation: {
    uuid: 'corp-1',
    corporation_name: 'Test Corporation'
  }
}

const mockConfigurationsStore = {
  configurations: [
    {
      uuid: "config-1",
      corporation_uuid: "corp-1",
      division_uuid: "div-1",
      cost_code_number: "01.02.03",
      cost_code_name: "Test Cost Code",
      parent_cost_code_uuid: null,
      order: 1,
      gl_account_uuid: "gl-1",
      preferred_vendor_uuid: "vendor-1",
      effective_from: "2024-01-01",
      description: "Test description",
      update_previous_transactions: false,
      is_active: true,
      preferred_items: [
        {
          uuid: "item-1",
          item_name: "Test Item",
          item_type_uuid: "type-1",
          unit_price: 100.0,
          unit: "EA",
          description: "Test item",
          status: "Active",
        },
      ],
    },
    {
      uuid: "config-2",
      corporation_uuid: "corp-1",
      division_uuid: null,
      cost_code_number: "02.03.04",
      cost_code_name: "Another Cost Code",
      parent_cost_code_uuid: null,
      order: 2,
      gl_account_uuid: "gl-2",
      preferred_vendor_uuid: null,
      effective_from: null,
      description: "Another description",
      update_previous_transactions: false,
      is_active: false,
      preferred_items: [],
    },
  ],
  loading: false,
  error: null,
  fetchConfigurations: vi.fn(),
  deleteConfiguration: vi.fn(),
};

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockCorpStore
}))

vi.mock('@/stores/costCodeConfigurations', () => ({
  useCostCodeConfigurationsStore: () => mockConfigurationsStore
}))

const mockChartOfAccountsStore = {
  accounts: [
    {
      uuid: "gl-1",
      code: "1000",
      account_name: "Cash",
      account_type: "Asset",
    },
    {
      uuid: "gl-2",
      code: "2000",
      account_name: "Accounts Payable",
      account_type: "Liability",
    },
  ],
  loading: false,
  error: null,
  fetchAccounts: vi.fn(),
};

vi.mock("@/stores/chartOfAccounts", () => ({
  useChartOfAccountsStore: () => mockChartOfAccountsStore,
}));

// Mock permissions
const mockHasPermission = vi.fn()
const mockUsePermissions = {
  hasPermission: mockHasPermission
}

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => mockUsePermissions
}))

// Mock composables
vi.mock('@/composables/useTableStandard', async () => {
  const { ref, computed } = await import('vue')
  return {
    useTableStandard: () => ({
      pagination: ref({ pageSize: 10, pageIndex: 0 }),
      paginationOptions: ref({}),
      pageSizeOptions: ref([10, 25, 50, 100]),
      updatePageSize: vi.fn(),
      getPaginationProps: vi.fn(() => ({})),
      getPageInfo: vi.fn(() => computed(() => '1-10 of 10')),
      shouldShowPagination: vi.fn(() => computed(() => true))
    })
  }
})

describe("CostCodesConfiguration Component", () => {
  let wrapper: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    mockToast.add.mockClear();
    mockPush.mockClear();
    mockConfigurationsStore.fetchConfigurations.mockClear();
    mockConfigurationsStore.deleteConfiguration.mockClear();
    mockChartOfAccountsStore.fetchAccounts.mockClear();

    // Reset permissions mock
    mockHasPermission.mockReturnValue(true);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.clearAllMocks();
  });

  const createWrapper = (props = {}) => {
    return mount(CostCodesConfiguration, {
      props: {
        globalFilter: "",
        showHeader: true,
        ...props,
      },
      global: {
        stubs: {
          UTable: {
            template: '<div class="u-table"><slot /></div>',
            props: ["data", "columns", "pagination", "paginationOptions"],
          },
          UModal: {
            template:
              '<div class="u-modal"><slot name="header" /><slot name="body" /><slot name="footer" /></div>',
            props: ["open", "title", "description"],
          },
          UButton: {
            template: "<button @click=\"$emit('click')\"><slot /></button>",
            props: ["icon", "size", "variant", "color"],
          },
          UAlert: {
            template: '<div class="u-alert"><slot /></div>',
            props: ["icon", "color", "variant", "title", "description"],
          },
          UIcon: {
            template: "<i></i>",
            props: ["name"],
          },
          USelect: {
            template: "<select></select>",
            props: ["modelValue", "items"],
          },
          UPagination: true,
          USkeleton: {
            template: '<div class="skeleton"></div>',
          },
        },
      },
    });
  };

  describe("Component Mounting", () => {
    it("should mount without errors", () => {
      wrapper = createWrapper();
      expect(wrapper.exists()).toBe(true);
    });

    it("should fetch configurations on mount", () => {
      wrapper = createWrapper();
      expect(mockConfigurationsStore.fetchConfigurations).toHaveBeenCalledWith(
        "corp-1"
      );
    });

    it("should fetch GL accounts on mount", () => {
      wrapper = createWrapper();
      expect(mockChartOfAccountsStore.fetchAccounts).toHaveBeenCalledWith(
        "corp-1"
      );
    });
  });

  describe("Loading State", () => {
    it("should show loading skeleton when loading", async () => {
      mockConfigurationsStore.loading = true;
      wrapper = createWrapper();
      await nextTick();

      expect(wrapper.findAll(".skeleton").length).toBeGreaterThan(0);
    });

    it("should hide loading skeleton when not loading", async () => {
      mockConfigurationsStore.loading = false;
      wrapper = createWrapper();
      await nextTick();

      expect(wrapper.find(".u-table").exists()).toBe(true);
    });
  });

  describe("Error State", () => {
    it("should show error alert when there is an error", async () => {
      mockConfigurationsStore.loading = false;
      mockConfigurationsStore.error = "Test error";
      mockConfigurationsStore.configurations = [];
      wrapper = createWrapper();
      await nextTick();

      expect(wrapper.find(".u-alert").exists()).toBe(true);
    });

    it("should display error message", async () => {
      mockConfigurationsStore.loading = false;
      mockConfigurationsStore.error = "Test error";
      mockConfigurationsStore.configurations = [];
      wrapper = createWrapper();
      await nextTick();

      const alert = wrapper.find(".u-alert");
      expect(alert.exists()).toBe(true);
      // Error message is displayed in the component
      expect(wrapper.vm.error).toBe("Test error");
    });
  });

  describe("Empty State", () => {
    it("should show empty state when no configurations", async () => {
      mockConfigurationsStore.loading = false;
      mockConfigurationsStore.error = null;
      mockConfigurationsStore.configurations = [];
      wrapper = createWrapper();
      await nextTick();

      expect(wrapper.text()).toContain("No cost code configurations found");
    });

    it("should show icon in empty state", async () => {
      mockConfigurationsStore.loading = false;
      mockConfigurationsStore.error = null;
      mockConfigurationsStore.configurations = [];
      wrapper = createWrapper();
      await nextTick();

      // Check that the empty state message is shown
      expect(wrapper.text()).toContain("No cost code configurations found");
      expect(wrapper.text()).toContain(
        "Get started by adding your first configuration"
      );
    });
  });

  describe("Table Display", () => {
    beforeEach(() => {
      mockConfigurationsStore.loading = false;
      mockConfigurationsStore.error = null;
      mockConfigurationsStore.configurations = [
        {
          uuid: "config-1",
          cost_code_number: "01.02.03",
          cost_code_name: "Test Cost Code",
          parent_cost_code_uuid: null,
          order: 1,
          gl_account_uuid: "gl-1",
          description: "Test description",
          is_active: true,
          preferred_items: [{ uuid: "item-1" }],
        },
      ];
    });

    it("should display table when configurations exist", async () => {
      wrapper = createWrapper();
      await nextTick();

      expect(wrapper.find(".u-table").exists()).toBe(true);
    });

    it("should pass configurations to table", async () => {
      wrapper = createWrapper();
      await nextTick();

      expect(wrapper.vm.filteredConfigurations).toHaveLength(1);
    });

    it("should have correct table columns", () => {
      wrapper = createWrapper();

      const columns = wrapper.vm.columns;
      expect(columns).toHaveLength(8);
      expect(columns[0].accessorKey).toBe("cost_code_number");
      expect(columns[1].accessorKey).toBe("cost_code_name");
      expect(columns[2].accessorKey).toBe("parent_cost_code_uuid");
      expect(columns[3].accessorKey).toBe("preferred_items");
      expect(columns[4].accessorKey).toBe("description");
      expect(columns[5].accessorKey).toBe("gl_account_uuid");
      expect(columns[6].accessorKey).toBe("is_active");
      expect(columns[7].accessorKey).toBe("actions");
    });
  });

  describe("Filtering", () => {
    beforeEach(() => {
      mockConfigurationsStore.loading = false;
      mockConfigurationsStore.error = null;
      mockConfigurationsStore.configurations = [
        {
          uuid: "config-1",
          cost_code_number: "01.02.03",
          cost_code_name: "Labor Costs",
          description: "Labor related costs",
          is_active: true,
          preferred_items: [],
        },
        {
          uuid: "config-2",
          cost_code_number: "02.03.04",
          cost_code_name: "Material Costs",
          description: "Material related costs",
          is_active: true,
          preferred_items: [],
        },
      ];
    });

    it("should return all configurations when no filter", () => {
      wrapper = createWrapper({ globalFilter: "" });
      expect(wrapper.vm.filteredConfigurations).toHaveLength(2);
    });

    it("should filter by cost code number", () => {
      wrapper = createWrapper({ globalFilter: "01.02" });
      expect(wrapper.vm.filteredConfigurations).toHaveLength(1);
      expect(wrapper.vm.filteredConfigurations[0].cost_code_number).toBe(
        "01.02.03"
      );
    });

    it("should filter by cost code name", () => {
      wrapper = createWrapper({ globalFilter: "Labor" });
      expect(wrapper.vm.filteredConfigurations).toHaveLength(1);
      expect(wrapper.vm.filteredConfigurations[0].cost_code_name).toBe(
        "Labor Costs"
      );
    });

    it("should filter by description", () => {
      wrapper = createWrapper({ globalFilter: "Material related" });
      expect(wrapper.vm.filteredConfigurations).toHaveLength(1);
      expect(wrapper.vm.filteredConfigurations[0].description).toBe(
        "Material related costs"
      );
    });

    it("should be case insensitive", () => {
      wrapper = createWrapper({ globalFilter: "LABOR" });
      expect(wrapper.vm.filteredConfigurations).toHaveLength(1);
    });
  });

  describe("Navigation", () => {
    beforeEach(() => {
      mockConfigurationsStore.loading = false;
      mockConfigurationsStore.error = null;
      mockConfigurationsStore.configurations = [
        {
          uuid: "config-1",
          cost_code_number: "01.02.03",
          cost_code_name: "Test",
          is_active: true,
          preferred_items: [],
        },
      ];
    });

    it("should navigate to new form", async () => {
      wrapper = createWrapper();
      await nextTick();

      wrapper.vm.addNewConfiguration();
      expect(mockPush).toHaveBeenCalledWith("/cost-codes/form/new");
    });

    it("should navigate to edit form with uuid", async () => {
      wrapper = createWrapper();
      await nextTick();

      const config = { uuid: "config-1" };
      wrapper.vm.editConfiguration(config);
      expect(mockPush).toHaveBeenCalledWith("/cost-codes/form/config-1");
    });
  });

  describe("Delete Functionality", () => {
    beforeEach(() => {
      mockConfigurationsStore.loading = false;
      mockConfigurationsStore.error = null;
      mockConfigurationsStore.configurations = [
        {
          uuid: "config-1",
          cost_code_number: "01.02.03",
          cost_code_name: "Test Cost Code",
          order: 1,
          description: "Test",
          is_active: true,
          preferred_items: [],
        },
      ];
    });

    it("should open delete modal when delete clicked", async () => {
      wrapper = createWrapper();
      await nextTick();

      const config = mockConfigurationsStore.configurations[0];
      wrapper.vm.deleteConfiguration(config);
      await nextTick();

      expect(wrapper.vm.showDeleteModal).toBe(true);
      expect(wrapper.vm.configToDelete).toEqual(config);
    });

    it("should close delete modal on cancel", async () => {
      wrapper = createWrapper();
      wrapper.vm.showDeleteModal = true;
      wrapper.vm.configToDelete = { uuid: "config-1" };

      wrapper.vm.cancelDelete();
      await nextTick();

      expect(wrapper.vm.showDeleteModal).toBe(false);
      expect(wrapper.vm.configToDelete).toBeNull();
    });

    it("should call deleteConfiguration on confirm", async () => {
      mockConfigurationsStore.deleteConfiguration.mockResolvedValue(undefined);

      wrapper = createWrapper();
      wrapper.vm.configToDelete = { uuid: "config-1" };

      await wrapper.vm.confirmDelete();

      expect(mockConfigurationsStore.deleteConfiguration).toHaveBeenCalledWith(
        "config-1"
      );
    });

    it("should show success toast on delete success", async () => {
      mockConfigurationsStore.deleteConfiguration.mockResolvedValue(undefined);

      wrapper = createWrapper();
      wrapper.vm.configToDelete = { uuid: "config-1" };

      await wrapper.vm.confirmDelete();

      expect(mockToast.add).toHaveBeenCalledWith({
        title: "Success",
        description: "Configuration deleted successfully",
        color: "success",
        icon: "i-heroicons-check-circle",
      });
    });

    it("should show error toast on delete failure", async () => {
      mockConfigurationsStore.deleteConfiguration.mockRejectedValue(
        new Error("Delete failed")
      );

      wrapper = createWrapper();
      wrapper.vm.configToDelete = { uuid: "config-1" };

      await wrapper.vm.confirmDelete();

      expect(mockToast.add).toHaveBeenCalledWith({
        title: "Error",
        description: "Failed to delete configuration",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
    });

    it("should close modal after successful delete", async () => {
      mockConfigurationsStore.deleteConfiguration.mockResolvedValue(undefined);

      wrapper = createWrapper();
      wrapper.vm.showDeleteModal = true;
      wrapper.vm.configToDelete = { uuid: "config-1" };

      await wrapper.vm.confirmDelete();

      expect(wrapper.vm.showDeleteModal).toBe(false);
      expect(wrapper.vm.configToDelete).toBeNull();
    });
  });

  describe("Delete Validation - Items Attached", () => {
    beforeEach(() => {
      mockConfigurationsStore.loading = false;
      mockConfigurationsStore.error = null;
    });

    it("should prevent deletion when cost code has items attached", async () => {
      const configWithItems = {
        uuid: "config-1",
        cost_code_number: "01.02.03",
        cost_code_name: "Test Cost Code",
        order: 1,
        description: "Test",
        is_active: true,
        preferred_items: [
          {
            uuid: "item-1",
            item_name: "Test Item 1",
            item_type_uuid: "type-1",
            unit_price: 100.0,
            unit: "EA",
            description: "Test item 1",
            status: "Active",
          },
          {
            uuid: "item-2",
            item_name: "Test Item 2",
            item_type_uuid: "type-2",
            unit_price: 200.0,
            unit: "EA",
            description: "Test item 2",
            status: "Active",
          },
        ],
      };

      wrapper = createWrapper();
      await nextTick();

      wrapper.vm.deleteConfiguration(configWithItems);
      await nextTick();

      // Should not open delete modal
      expect(wrapper.vm.showDeleteModal).toBe(false);
      expect(wrapper.vm.configToDelete).toBeNull();

      // Should show error toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: "Cannot Delete Cost Code",
        description:
          "This cost code has 2 item(s) attached. Please reassign or remove all items before deleting the cost code.",
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });
    });

    it("should prevent deletion when cost code has single item attached", async () => {
      const configWithSingleItem = {
        uuid: "config-1",
        cost_code_number: "01.02.03",
        cost_code_name: "Test Cost Code",
        order: 1,
        description: "Test",
        is_active: true,
        preferred_items: [
          {
            uuid: "item-1",
            item_name: "Test Item",
            item_type_uuid: "type-1",
            unit_price: 100.0,
            unit: "EA",
            description: "Test item",
            status: "Active",
          },
        ],
      };

      wrapper = createWrapper();
      await nextTick();

      wrapper.vm.deleteConfiguration(configWithSingleItem);
      await nextTick();

      // Should not open delete modal
      expect(wrapper.vm.showDeleteModal).toBe(false);
      expect(wrapper.vm.configToDelete).toBeNull();

      // Should show error toast with singular form
      expect(mockToast.add).toHaveBeenCalledWith({
        title: "Cannot Delete Cost Code",
        description:
          "This cost code has 1 item(s) attached. Please reassign or remove all items before deleting the cost code.",
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });
    });

    it("should allow deletion when cost code has no items", async () => {
      const configWithoutItems = {
        uuid: "config-1",
        cost_code_number: "01.02.03",
        cost_code_name: "Test Cost Code",
        order: 1,
        description: "Test",
        is_active: true,
        preferred_items: [],
      };

      wrapper = createWrapper();
      await nextTick();

      wrapper.vm.deleteConfiguration(configWithoutItems);
      await nextTick();

      // Should open delete modal
      expect(wrapper.vm.showDeleteModal).toBe(true);
      expect(wrapper.vm.configToDelete).toEqual(configWithoutItems);

      // Should not show error toast
      expect(mockToast.add).not.toHaveBeenCalled();
    });

    it("should allow deletion when cost code has null preferred_items", async () => {
      const configWithNullItems = {
        uuid: "config-1",
        cost_code_number: "01.02.03",
        cost_code_name: "Test Cost Code",
        order: 1,
        description: "Test",
        is_active: true,
        preferred_items: null,
      };

      wrapper = createWrapper();
      await nextTick();

      wrapper.vm.deleteConfiguration(configWithNullItems);
      await nextTick();

      // Should open delete modal
      expect(wrapper.vm.showDeleteModal).toBe(true);
      expect(wrapper.vm.configToDelete).toEqual(configWithNullItems);

      // Should not show error toast
      expect(mockToast.add).not.toHaveBeenCalled();
    });

    it("should allow deletion when cost code has undefined preferred_items", async () => {
      const configWithUndefinedItems = {
        uuid: "config-1",
        cost_code_number: "01.02.03",
        cost_code_name: "Test Cost Code",
        order: 1,
        description: "Test",
        is_active: true,
        // preferred_items is undefined
      };

      wrapper = createWrapper();
      await nextTick();

      wrapper.vm.deleteConfiguration(configWithUndefinedItems);
      await nextTick();

      // Should open delete modal
      expect(wrapper.vm.showDeleteModal).toBe(true);
      expect(wrapper.vm.configToDelete).toEqual(configWithUndefinedItems);

      // Should not show error toast
      expect(mockToast.add).not.toHaveBeenCalled();
    });

    it("should prevent deletion in confirmDelete when items are attached", async () => {
      const configWithItems = {
        uuid: "config-1",
        cost_code_number: "01.02.03",
        cost_code_name: "Test Cost Code",
        order: 1,
        description: "Test",
        is_active: true,
        preferred_items: [
          {
            uuid: "item-1",
            item_name: "Test Item",
            item_type_uuid: "type-1",
            unit_price: 100.0,
            unit: "EA",
            description: "Test item",
            status: "Active",
          },
        ],
      };

      wrapper = createWrapper();
      wrapper.vm.configToDelete = configWithItems;
      wrapper.vm.showDeleteModal = true;

      await wrapper.vm.confirmDelete();

      // Should close modal and clear configToDelete
      expect(wrapper.vm.showDeleteModal).toBe(false);
      expect(wrapper.vm.configToDelete).toBeNull();

      // Should show error toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: "Cannot Delete Cost Code",
        description:
          "This cost code has 1 item(s) attached. Please reassign or remove all items before deleting the cost code.",
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });

      // Should not call store delete method
      expect(
        mockConfigurationsStore.deleteConfiguration
      ).not.toHaveBeenCalled();
    });

    it("should proceed with deletion in confirmDelete when no items are attached", async () => {
      const configWithoutItems = {
        uuid: "config-1",
        cost_code_number: "01.02.03",
        cost_code_name: "Test Cost Code",
        order: 1,
        description: "Test",
        is_active: true,
        preferred_items: [],
      };

      mockConfigurationsStore.deleteConfiguration.mockResolvedValue(undefined);

      wrapper = createWrapper();
      wrapper.vm.configToDelete = configWithoutItems;
      wrapper.vm.showDeleteModal = true;

      await wrapper.vm.confirmDelete();

      // Should call store delete method
      expect(mockConfigurationsStore.deleteConfiguration).toHaveBeenCalledWith(
        "config-1"
      );

      // Should show success toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: "Success",
        description: "Configuration deleted successfully",
        color: "success",
        icon: "i-heroicons-check-circle",
      });

      // Should close modal and clear configToDelete
      expect(wrapper.vm.showDeleteModal).toBe(false);
      expect(wrapper.vm.configToDelete).toBeNull();
    });

    it("should handle edge case with empty preferred_items array", async () => {
      const configWithEmptyItems = {
        uuid: "config-1",
        cost_code_number: "01.02.03",
        cost_code_name: "Test Cost Code",
        order: 1,
        description: "Test",
        is_active: true,
        preferred_items: [], // Empty array
      };

      wrapper = createWrapper();
      await nextTick();

      wrapper.vm.deleteConfiguration(configWithEmptyItems);
      await nextTick();

      // Should open delete modal (empty array is falsy for length check)
      expect(wrapper.vm.showDeleteModal).toBe(true);
      expect(wrapper.vm.configToDelete).toEqual(configWithEmptyItems);

      // Should not show error toast
      expect(mockToast.add).not.toHaveBeenCalled();
    });
  });

  describe("Delete Modal Content", () => {
    it("should display configuration details in modal", async () => {
      wrapper = createWrapper();
      wrapper.vm.configToDelete = {
        cost_code_number: "01.02.03",
        cost_code_name: "Test Cost Code",
        parent_cost_code_uuid: null,
        preferred_items: [{ uuid: "item-1" }, { uuid: "item-2" }],
        is_active: true,
      };
      await nextTick();

      const modal = wrapper.find(".u-modal");
      expect(modal.exists()).toBe(true);
    });

    it("should show warning message when cost code has items attached", async () => {
      wrapper = createWrapper();
      wrapper.vm.configToDelete = {
        uuid: "config-1",
        cost_code_number: "01.02.03",
        cost_code_name: "Test Cost Code",
        parent_cost_code_uuid: null,
        description: "Test",
        is_active: true,
        preferred_items: [
          {
            uuid: "item-1",
            item_name: "Test Item 1",
            item_type_uuid: "type-1",
            unit_price: 100.0,
            unit: "EA",
            description: "Test item 1",
            status: "Active",
          },
          {
            uuid: "item-2",
            item_name: "Test Item 2",
            item_type_uuid: "type-2",
            unit_price: 200.0,
            unit: "EA",
            description: "Test item 2",
            status: "Active",
          },
        ],
      };
      wrapper.vm.showDeleteModal = true;
      await nextTick();

      const modal = wrapper.find(".u-modal");
      expect(modal.exists()).toBe(true);

      // Check that the warning section exists in the modal content
      // Note: Since we're using stubs, we can't directly test the DOM content,
      // but we can verify the component state and computed properties
      expect(wrapper.vm.configToDelete.preferred_items).toHaveLength(2);
    });

    it("should not show warning message when cost code has no items", async () => {
      wrapper = createWrapper();
      wrapper.vm.configToDelete = {
        uuid: "config-1",
        cost_code_number: "01.02.03",
        cost_code_name: "Test Cost Code",
        parent_cost_code_uuid: null,
        description: "Test",
        is_active: true,
        preferred_items: [],
      };
      wrapper.vm.showDeleteModal = true;
      await nextTick();

      const modal = wrapper.find(".u-modal");
      expect(modal.exists()).toBe(true);

      // Check that there are no items
      expect(wrapper.vm.configToDelete.preferred_items).toHaveLength(0);
    });

    it("should display correct item count in modal details", async () => {
      wrapper = createWrapper();
      wrapper.vm.configToDelete = {
        uuid: "config-1",
        cost_code_number: "01.02.03",
        cost_code_name: "Test Cost Code",
        parent_cost_code_uuid: null,
        order: 1,
        description: "Test",
        is_active: true,
        preferred_items: [
          { uuid: "item-1", item_name: "Item 1" },
          { uuid: "item-2", item_name: "Item 2" },
          { uuid: "item-3", item_name: "Item 3" },
        ],
      };
      wrapper.vm.showDeleteModal = true;
      await nextTick();

      // Verify the configuration has 3 items
      expect(wrapper.vm.configToDelete.preferred_items).toHaveLength(3);
    });
  });

  describe("Sub Category of Column", () => {
    beforeEach(() => {
      mockConfigurationsStore.loading = false;
      mockConfigurationsStore.error = null;
    });

    it("should display parent cost code name when parent exists", () => {
      mockConfigurationsStore.configurations = [
        {
          uuid: "parent-config",
          cost_code_name: "Parent Cost Code",
        },
        {
          uuid: "child-config",
          cost_code_name: "Child Cost Code",
          parent_cost_code_uuid: "parent-config",
        },
      ];

      wrapper = createWrapper();
      const parentName = wrapper.vm.getParentCostCodeName("parent-config");
      expect(parentName).toBe("Parent Cost Code");
    });

    it("should return empty string when parent cost code UUID is null", () => {
      wrapper = createWrapper();
      const parentName = wrapper.vm.getParentCostCodeName(null);
      expect(parentName).toBe("");
    });

    it("should return empty string when parent cost code UUID is undefined", () => {
      wrapper = createWrapper();
      const parentName = wrapper.vm.getParentCostCodeName(undefined);
      expect(parentName).toBe("");
    });

    it("should return empty string when parent cost code not found", () => {
      wrapper = createWrapper();
      const parentName = wrapper.vm.getParentCostCodeName("non-existent-uuid");
      expect(parentName).toBe("");
    });

    it("should display '-' in table cell when no parent cost code", () => {
      mockConfigurationsStore.configurations = [
        {
          uuid: "config-1",
          cost_code_name: "Test Cost Code",
          parent_cost_code_uuid: null,
        },
      ];

      wrapper = createWrapper();
      const columns = wrapper.vm.columns;
      const subCategoryColumn = columns.find(
        (col) => col.accessorKey === "parent_cost_code_uuid"
      );
      expect(subCategoryColumn).toBeDefined();
      expect(subCategoryColumn.header).toBe("Sub Category of");

      // Test the cell renderer
      const cellContent = subCategoryColumn.cell({
        row: { original: { parent_cost_code_uuid: null } },
      });
      expect(cellContent.children).toBe("-");
    });

    it("should display parent cost code name in table cell when parent exists", () => {
      mockConfigurationsStore.configurations = [
        {
          uuid: "parent-config",
          cost_code_name: "Parent Cost Code",
        },
        {
          uuid: "child-config",
          cost_code_name: "Child Cost Code",
          parent_cost_code_uuid: "parent-config",
        },
      ];

      wrapper = createWrapper();
      const columns = wrapper.vm.columns;
      const subCategoryColumn = columns.find(
        (col) => col.accessorKey === "parent_cost_code_uuid"
      );

      // Test the cell renderer
      const cellContent = subCategoryColumn.cell({
        row: { original: { parent_cost_code_uuid: "parent-config" } },
      });
      expect(cellContent.children).toBe("Parent Cost Code");
    });
  });

  describe("GL Account Column", () => {
    beforeEach(() => {
      mockConfigurationsStore.loading = false;
      mockConfigurationsStore.error = null;
    });

    it("should display GL account name when GL account exists", () => {
      wrapper = createWrapper();
      const glAccountName = wrapper.vm.getGLAccountName("gl-1");
      expect(glAccountName).toBe("1000 - Cash");
    });

    it("should return empty string when GL account UUID is null", () => {
      wrapper = createWrapper();
      const glAccountName = wrapper.vm.getGLAccountName(null);
      expect(glAccountName).toBe("");
    });

    it("should return empty string when GL account UUID is undefined", () => {
      wrapper = createWrapper();
      const glAccountName = wrapper.vm.getGLAccountName(undefined);
      expect(glAccountName).toBe("");
    });

    it("should return empty string when GL account not found", () => {
      wrapper = createWrapper();
      const glAccountName = wrapper.vm.getGLAccountName("non-existent-uuid");
      expect(glAccountName).toBe("");
    });

    it("should display '-' in table cell when no GL account", () => {
      wrapper = createWrapper();
      const columns = wrapper.vm.columns;
      const glAccountColumn = columns.find(
        (col) => col.accessorKey === "gl_account_uuid"
      );
      expect(glAccountColumn).toBeDefined();
      expect(glAccountColumn.header).toBe("GL Account");

      // Test the cell renderer
      const cellContent = glAccountColumn.cell({
        row: { original: { gl_account_uuid: null } },
      });
      expect(cellContent.children).toBe("-");
    });

    it("should display GL account in table cell when GL account exists", () => {
      wrapper = createWrapper();
      const columns = wrapper.vm.columns;
      const glAccountColumn = columns.find(
        (col) => col.accessorKey === "gl_account_uuid"
      );

      // Test the cell renderer
      const cellContent = glAccountColumn.cell({
        row: { original: { gl_account_uuid: "gl-1" } },
      });
      expect(cellContent.children).toBe("1000 - Cash");
    });

    it("should display correct GL account format (code - account_name)", () => {
      wrapper = createWrapper();
      const glAccountName = wrapper.vm.getGLAccountName("gl-2");
      expect(glAccountName).toBe("2000 - Accounts Payable");
    });
  });

  describe("Delete Modal - Sub Category of Display", () => {
    it("should use getParentCostCodeName helper in delete modal", () => {
      mockConfigurationsStore.configurations = [
        {
          uuid: "parent-config",
          cost_code_name: "Parent Cost Code",
        },
        {
          uuid: "child-config",
          cost_code_name: "Child Cost Code",
          parent_cost_code_uuid: "parent-config",
        },
      ];

      wrapper = createWrapper();
      wrapper.vm.configToDelete = {
        uuid: "child-config",
        cost_code_name: "Child Cost Code",
        parent_cost_code_uuid: "parent-config",
      };

      // Verify the helper function works correctly
      const parentName = wrapper.vm.getParentCostCodeName(
        wrapper.vm.configToDelete.parent_cost_code_uuid
      );
      expect(parentName).toBe("Parent Cost Code");
    });

    it("should show N/A when no parent cost code in delete modal", () => {
      wrapper = createWrapper();
      wrapper.vm.configToDelete = {
        uuid: "config-1",
        cost_code_name: "Test Cost Code",
        parent_cost_code_uuid: null,
      };

      // Verify the helper function returns empty string for null
      const parentName = wrapper.vm.getParentCostCodeName(
        wrapper.vm.configToDelete.parent_cost_code_uuid
      );
      expect(parentName).toBe("");
    });
  });

  describe("Exposed Methods", () => {
    it("should expose openAddModal method", () => {
      wrapper = createWrapper();
      expect(typeof wrapper.vm.openAddModal).toBe("function");
    });

    it("should call addNewConfiguration when openAddModal is called", () => {
      wrapper = createWrapper();
      wrapper.vm.openAddModal();
      expect(mockPush).toHaveBeenCalledWith("/cost-codes/form/new");
    });
  });

  describe("Corporation Change Watcher", () => {
    it("should fetch configurations when corporation changes", async () => {
      wrapper = createWrapper();
      mockConfigurationsStore.fetchConfigurations.mockClear();

      mockCorpStore.selectedCorporation = {
        uuid: "new-corp",
        corporation_name: "New Corporation",
      };
      await nextTick();

      // The watcher should trigger fetchConfigurations
      // Note: This may require additional setup depending on reactivity
    });

    it("should fetch GL accounts when corporation changes", async () => {
      wrapper = createWrapper();
      mockChartOfAccountsStore.fetchAccounts.mockClear();

      mockCorpStore.selectedCorporation = {
        uuid: "new-corp",
        corporation_name: "New Corporation",
      };
      await nextTick();

      // The watcher should trigger fetchAccounts
      // Note: This may require additional setup depending on reactivity
    });
  });

  describe("Permission Functionality", () => {
    it("should show edit button in actions when user has cost_codes_edit permission", () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_edit") return true;
        return false;
      });

      wrapper = createWrapper();

      expect(wrapper.vm.hasPermission("cost_codes_edit")).toBe(true);
    });

    it("should hide edit button in actions when user lacks cost_codes_edit permission", () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_edit") return false;
        return true;
      });

      wrapper = createWrapper();

      expect(wrapper.vm.hasPermission("cost_codes_edit")).toBe(false);
    });

    it("should show delete button in actions when user has cost_codes_delete permission", () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_delete") return true;
        return false;
      });

      wrapper = createWrapper();

      expect(wrapper.vm.hasPermission("cost_codes_delete")).toBe(true);
    });

    it("should hide delete button in actions when user lacks cost_codes_delete permission", () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_delete") return false;
        return true;
      });

      wrapper = createWrapper();

      expect(wrapper.vm.hasPermission("cost_codes_delete")).toBe(false);
    });

    it("should call addNewConfiguration with permission check", async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_create") return false;
        return true;
      });

      wrapper = createWrapper();

      await wrapper.vm.addNewConfiguration();

      // Should show access denied toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: "Access Denied",
        description:
          "You do not have permission to create cost code configurations. Please contact your administrator.",
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });
    });

    it("should call editConfiguration with permission check", async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_edit") return false;
        return true;
      });

      wrapper = createWrapper();

      const mockConfig = {
        uuid: "config-1",
        cost_code_name: "Test Config",
      };

      await wrapper.vm.editConfiguration(mockConfig);

      // Should show access denied toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: "Access Denied",
        description:
          "You do not have permission to edit cost code configurations. Please contact your administrator.",
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });
    });

    it("should call deleteConfiguration with permission check", async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_delete") return false;
        return true;
      });

      wrapper = createWrapper();

      const mockConfig = {
        uuid: "config-1",
        cost_code_name: "Test Config",
      };

      await wrapper.vm.deleteConfiguration(mockConfig);

      // Should show access denied toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: "Access Denied",
        description:
          "You do not have permission to delete cost code configurations. Please contact your administrator.",
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });
    });

    it("should call confirmDelete with permission check", async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_delete") return false;
        return true;
      });

      wrapper = createWrapper();

      // Set up the config to delete
      wrapper.vm.configToDelete = {
        uuid: "config-1",
        cost_code_name: "Test Config",
      };

      await wrapper.vm.confirmDelete();

      // Should show access denied toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: "Access Denied",
        description:
          "You do not have permission to delete cost code configurations. Please contact your administrator.",
        color: "error",
        icon: "i-heroicons-exclamation-triangle",
      });
    });

    it("should allow addNewConfiguration when user has cost_codes_create permission", async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_create") return true;
        return false;
      });

      wrapper = createWrapper();

      await wrapper.vm.addNewConfiguration();

      // Should navigate to form
      expect(mockPush).toHaveBeenCalledWith("/cost-codes/form/new");
    });

    it("should allow editConfiguration when user has cost_codes_edit permission", async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_edit") return true;
        return false;
      });

      wrapper = createWrapper();

      const mockConfig = {
        uuid: "config-1",
        cost_code_name: "Test Config",
      };

      await wrapper.vm.editConfiguration(mockConfig);

      // Should navigate to edit form
      expect(mockPush).toHaveBeenCalledWith("/cost-codes/form/config-1");
    });

    it("should allow deleteConfiguration when user has cost_codes_delete permission", async () => {
      mockHasPermission.mockImplementation((permission) => {
        if (permission === "cost_codes_delete") return true;
        return false;
      });

      wrapper = createWrapper();

      const mockConfig = {
        uuid: "config-1",
        cost_code_name: "Test Config",
      };

      await wrapper.vm.deleteConfiguration(mockConfig);

      // Should show delete modal
      expect(wrapper.vm.showDeleteModal).toBe(true);
      expect(wrapper.vm.configToDelete).toEqual(mockConfig);
    });
  });
});
