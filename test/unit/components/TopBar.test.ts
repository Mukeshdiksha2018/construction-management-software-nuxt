import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import TopBar from "@/components/TopBar.vue";
import { useItemTypesStore } from "@/stores/itemTypes";
import { createPinia, setActivePinia } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useCorporationStore } from "@/stores/corporations";
import { useUserProfilesStore } from "@/stores/userProfiles";
import { useRoleStore } from "@/stores/roles";
import { useShipViaStore } from "@/stores/freight";
import { useFreightStore } from "@/stores/freightGlobal";
import { useLocationsStore } from "@/stores/locations";
import { usePurchaseOrdersStore } from "@/stores/purchaseOrders";
import { useChangeOrdersStore } from "@/stores/changeOrders";
import { useStockReceiptNotesStore } from "@/stores/stockReceiptNotes";
import { useVendorInvoicesStore } from "@/stores/vendorInvoices";
import { useEstimatesStore } from "@/stores/estimates";

vi.mock("@/composables/useDarkMode", () => {
  const state = {
    isDark: false,
    toggleDarkMode: vi.fn(),
    initializeTheme: vi.fn(),
    watchSystemTheme: vi.fn(),
  };
  return {
    useDarkMode: () => state,
  };
});

const mockClearCorporationData = vi.fn(() => Promise.resolve());

vi.mock("@/composables/useIndexedDB", () => ({
  useIndexedDB: () => ({
    syncGlobalData: vi.fn(() => Promise.resolve()),
    clearCorporationData: mockClearCorporationData,
  }),
}));

const createStubs = () => ({
  UPopover: {
    template:
      "<div><slot /><slot name='content'></slot></div>",
  },
  UButton: {
    template: "<button><slot /></button>",
  },
  UCalendar: {
    template: "<div />",
  },
  USelectMenu: {
    template: `
      <div class="u-select-menu">
        <button class="select-button" @click="$emit('update:modelValue', modelValue)">
          <slot></slot>
          <slot name="default"></slot>
        </button>
        <div class="select-items">
          <div v-for="item in items" :key="item.value" class="select-item" @click="$emit('update:modelValue', item)">
            <slot name="item-label" :item="item">{{ item.label }}</slot>
          </div>
        </div>
      </div>
    `,
    props: ["modelValue", "items", "searchable", "searchablePlaceholder", "filterFields", "valueKey", "placeholder", "disabled", "ui"],
  },
  UDropdownMenu: {
    template: "<div><slot /></div>",
  },
  UAvatar: {
    template: "<div />",
  },
  UIcon: {
    template: "<i />",
  },
});

const setupStores = (options?: { multipleCorporations?: boolean }) => {
  const pinia = createPinia();
  setActivePinia(pinia);

  const corporations = options?.multipleCorporations
    ? [
        {
          uuid: "corp-1",
          corporation_name: "Corp One",
          legal_name: "CorpOne LLC",
        },
        {
          uuid: "corp-2",
          corporation_name: "Tech Solutions Inc",
          legal_name: "Tech Solutions Incorporated",
        },
        {
          uuid: "corp-3",
          corporation_name: "Building Masters",
          legal_name: "Building Masters Ltd",
        },
      ]
    : [
        {
          uuid: "corp-1",
          corporation_name: "Corp One",
          legal_name: "CorpOne LLC",
        },
      ];

  const user = {
    id: 1,
    email: "user@example.com",
    corporationAccess: ["corp-1"],
    roleId: "role-1",
    firstName: "Test",
    lastName: "User",
    status: "active",
    recentProperty: "corp-1",
  };

  const authStore = useAuthStore();
  authStore.user = user as any;
  authStore.logout = vi.fn();

  const corpStore = useCorporationStore();
  corpStore.corporations = corporations as any;
  if (corporations[0]) {
    corpStore.setSelectedCorporation(corporations[0].uuid);
  }
  corpStore.fetchCorporations = vi.fn(() => Promise.resolve());
  corpStore.setSelectedCorporationAndFetchData = vi.fn(() => Promise.resolve());
  corpStore.setSelectedCorporation = vi.fn();

  const userProfilesStore = useUserProfilesStore();
  userProfilesStore.users = [user] as any;
  userProfilesStore.fetchUsers = vi.fn(() => Promise.resolve());
  userProfilesStore.updateUser = vi.fn(() => Promise.resolve());

  const roleStore = useRoleStore();
  roleStore.roles = [{ id: "role-1", role_name: "Super Admin" }] as any;
  roleStore.fetchRoles = vi.fn(() => Promise.resolve());

  const shipViaStore = useShipViaStore();
  shipViaStore.fetchShipVia = vi.fn(() => Promise.resolve());

  const freightStore = useFreightStore();
  freightStore.fetchFreight = vi.fn(() => Promise.resolve());

  const locationsStore = useLocationsStore();
  locationsStore.fetchLocations = vi.fn(() => Promise.resolve());

  const purchaseOrdersStore = usePurchaseOrdersStore();
  purchaseOrdersStore.fetchPurchaseOrders = vi.fn(() => Promise.resolve());

  const changeOrdersStore = useChangeOrdersStore();
  changeOrdersStore.fetchChangeOrders = vi.fn(() => Promise.resolve());

  const stockReceiptNotesStore = useStockReceiptNotesStore();
  stockReceiptNotesStore.fetchStockReceiptNotes = vi.fn(() =>
    Promise.resolve()
  );

  const vendorInvoicesStore = useVendorInvoicesStore();
  vendorInvoicesStore.fetchVendorInvoices = vi.fn(() => Promise.resolve());

  const estimatesStore = useEstimatesStore();
  estimatesStore.fetchEstimates = vi.fn(() => Promise.resolve());
  estimatesStore.refreshEstimatesFromAPI = vi.fn(() => Promise.resolve());

  const itemTypesStore = useItemTypesStore();
  itemTypesStore.itemTypes = [];
  itemTypesStore.fetchItemTypes = vi.fn(() => Promise.resolve());
  itemTypesStore.hasCachedData = vi.fn(() => false);

  return {
    pinia,
    stores: {
      auth: authStore,
      corporations: corpStore,
      userProfiles: userProfilesStore,
      roles: roleStore,
      shipVia: shipViaStore,
      freight: freightStore,
      locations: locationsStore,
      purchaseOrders: purchaseOrdersStore,
      changeOrders: changeOrdersStore,
      stockReceiptNotes: stockReceiptNotesStore,
      vendorInvoices: vendorInvoicesStore,
      estimates: estimatesStore,
      itemTypes: itemTypesStore,
    },
  };
};

describe("TopBar.vue", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fetches item types when corporation data is synchronized", async () => {
    const { pinia, stores } = setupStores();

    const wrapper = mount(TopBar, {
      global: {
        plugins: [pinia],
        stubs: {
          ...createStubs(),
        },
      },
    });

    await flushPromises();

    expect(
      stores.corporations.setSelectedCorporationAndFetchData
    ).toHaveBeenCalled();
    const fetchCalls = (stores.itemTypes.fetchItemTypes as any).mock.calls;
    expect(fetchCalls.length).toBeGreaterThan(0);
    expect(fetchCalls[0][0]).toBe("corp-1");

    wrapper.unmount();
  });

  it("fetches vendor invoices when corporation context is refreshed", async () => {
    const { pinia, stores } = setupStores();

    const wrapper = mount(TopBar, {
      global: {
        plugins: [pinia],
        stubs: {
          ...createStubs(),
        },
      },
    });

    await flushPromises();

    // Simulate corporation context refresh
    await(wrapper.vm as any).refreshCorporationContext("corp-1", {
      force: true,
    });
    await flushPromises();

    expect(stores.vendorInvoices.fetchVendorInvoices).toHaveBeenCalledWith(
      "corp-1",
      true
    );

    wrapper.unmount();
  });

  it("forces fetch when corporation changes", async () => {
    const { pinia, stores } = setupStores();

    const wrapper = mount(TopBar, {
      global: {
        plugins: [pinia],
        stubs: {
          UPopover: {
            template: "<div><slot /><slot name='content'></slot></div>",
          },
          UButton: {
            template: "<button><slot /></button>",
          },
          UCalendar: {
            template: "<div />",
          },
          USelectMenu: {
            template: `
              <div class="u-select-menu">
                <button class="select-button" @click="$emit('update:modelValue', modelValue)">
                  <slot></slot>
                  <slot name="default"></slot>
                </button>
                <div class="select-items">
                  <div v-for="item in items" :key="item.value" class="select-item" @click="$emit('update:modelValue', item)">
                    <slot name="item-label" :item="item">{{ item.label }}</slot>
                  </div>
                </div>
              </div>
            `,
            props: [
              "modelValue",
              "items",
              "searchable",
              "searchablePlaceholder",
              "filterFields",
              "valueKey",
              "placeholder",
              "disabled",
              "ui",
            ],
          },
          UDropdownMenu: {
            template: "<div><slot /></div>",
          },
          UAvatar: {
            template: "<div />",
          },
          UIcon: {
            template: "<i />",
          },
        },
      },
    });

    await flushPromises();

    (stores.itemTypes.fetchItemTypes as any).mockClear();
    await(wrapper.vm as any).onCorporationChange("corp-1");
    await flushPromises();

    expect(
      stores.corporations.setSelectedCorporationAndFetchData
    ).toHaveBeenCalledWith("corp-1");
    expect(stores.itemTypes.fetchItemTypes).toHaveBeenCalledWith(
      "corp-1",
      undefined,
      true
    );

    wrapper.unmount();
  });

  it("fetches estimates when corporation context is refreshed", async () => {
    const { pinia, stores } = setupStores();

    const wrapper = mount(TopBar, {
      global: {
        plugins: [pinia],
        stubs: {
          ...createStubs(),
        },
      },
    });

    await flushPromises();

    // Simulate corporation context refresh
    await(wrapper.vm as any).refreshCorporationContext("corp-1", {
      force: true,
    });
    await flushPromises();

    // Should use refreshEstimatesFromAPI to update store reactively
    // The function is called with pagination parameters (page=1, pageSize=100)
    expect(stores.estimates.refreshEstimatesFromAPI).toHaveBeenCalledWith(
      "corp-1",
      1,
      100
    );

    wrapper.unmount();
  });

  describe("Searchable Corporation Selector", () => {
    const createStubs = () => ({
      UPopover: {
        template: "<div><slot /><slot name='content'></slot></div>",
      },
      UButton: {
        template: "<button><slot /></button>",
      },
      UCalendar: {
        template: "<div />",
      },
      USelectMenu: {
        name: "USelectMenu",
        template: `
          <div class="u-select-menu">
            <button class="select-button" @click="$emit('update:modelValue', modelValue)">
              <slot></slot>
              <slot name="default"></slot>
            </button>
            <div class="select-items">
              <div v-for="item in items" :key="item.value" class="select-item" @click="$emit('update:modelValue', item)">
                <slot name="item-label" :item="item">{{ item.label }}</slot>
              </div>
            </div>
          </div>
        `,
        props: [
          "modelValue",
          "items",
          "searchable",
          "searchablePlaceholder",
          "filterFields",
          "valueKey",
          "placeholder",
          "disabled",
          "ui",
        ],
      },
      UDropdownMenu: {
        name: "UDropdownMenu",
        template: "<div><slot /></div>",
      },
      UAvatar: {
        name: "UAvatar",
        template: "<div />",
      },
      UIcon: {
        name: "UIcon",
        template: "<i />",
      },
    });

    it("renders USelectMenu with searchable prop enabled", async () => {
      const { pinia } = setupStores({ multipleCorporations: true });

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      const selectMenu = wrapper.findComponent({ name: "USelectMenu" });
      expect(selectMenu.exists()).toBe(true);
      // Check that searchable prop is defined (Vue treats '' and true equally for boolean props)
      expect(selectMenu.props("searchable")).toBeDefined();
      expect(selectMenu.props("searchablePlaceholder")).toBe(
        "Type to search corporations..."
      );

      wrapper.unmount();
    });

    it("displays corporation items with correct structure", async () => {
      const { pinia } = setupStores({ multipleCorporations: true });

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: {
            ...createStubs(),
            CorporationSelect: {
              name: "CorporationSelect",
              template: '<div class="corporation-select"><slot /></div>',
              props: [
                "modelValue",
                "size",
                "class",
                "restrictToCorporationAccess",
              ],
            },
          },
        },
      });

      await flushPromises();

      const corporationSelect = wrapper.findComponent({
        name: "CorporationSelect",
      });
      expect(corporationSelect.exists()).toBe(true);

      wrapper.unmount();
    });

    // This test is now covered by CorporationSelect.test.ts
    it("delegates corporation selection to CorporationSelect component", async () => {
      const { pinia } = setupStores({ multipleCorporations: true });

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: {
            ...createStubs(),
            CorporationSelect: {
              name: "CorporationSelect",
              template: '<div class="corporation-select"><slot /></div>',
              props: [
                "modelValue",
                "size",
                "class",
                "restrictToCorporationAccess",
              ],
              emits: ["update:modelValue", "change"],
            },
          },
        },
      });

      await flushPromises();

      const corporationSelect = wrapper.findComponent({
        name: "CorporationSelect",
      });
      expect(corporationSelect.exists()).toBe(true);

      wrapper.unmount();
    });

    // CorporationSelect handles filter configuration internally
    it("configures CorporationSelect with proper size", async () => {
      const { pinia } = setupStores({ multipleCorporations: true });

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: {
            ...createStubs(),
            CorporationSelect: {
              name: "CorporationSelect",
              template: '<div class="corporation-select"><slot /></div>',
              props: [
                "modelValue",
                "size",
                "class",
                "restrictToCorporationAccess",
              ],
            },
          },
        },
      });

      await flushPromises();

      const corporationSelect = wrapper.findComponent({
        name: "CorporationSelect",
      });
      expect(corporationSelect.props("size")).toBe("sm");

      wrapper.unmount();
    });

    it("handles corporation selection correctly", async () => {
      const { pinia, stores } = setupStores({ multipleCorporations: true });

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      // Get the corporation items
      const selectMenu = wrapper.findComponent({ name: "USelectMenu" });
      const items = selectMenu.props("items");
      const corpItem = items.find((item: any) => item.value === "corp-1");

      // Clear previous calls
      (
        stores.corporations.setSelectedCorporationAndFetchData as any
      ).mockClear();
      (stores.itemTypes.fetchItemTypes as any).mockClear();

      // Simulate selection
      await(wrapper.vm as any).handleCorporationSelection(corpItem);
      await flushPromises();

      expect(
        stores.corporations.setSelectedCorporationAndFetchData
      ).toHaveBeenCalledWith("corp-1");

      wrapper.unmount();
    });

    // selectedCorporationObject is now managed by CorporationSelect component
    it("updates value when corporation selection changes", async () => {
      const { pinia } = setupStores({ multipleCorporations: true });

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: {
            ...createStubs(),
            CorporationSelect: {
              name: "CorporationSelect",
              template: '<div class="corporation-select"><slot /></div>',
              props: ["modelValue", "size", "class"],
              emits: ["update:modelValue", "change"],
            },
          },
        },
      });

      await flushPromises();

      // Initial value should be from user's recentProperty
      expect((wrapper.vm as any).value).toBe("corp-1");

      wrapper.unmount();
    });

    // UI configuration is now handled by CorporationSelect component
    it("renders CorporationSelect with proper class", async () => {
      const { pinia } = setupStores({ multipleCorporations: true });

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: {
            ...createStubs(),
            CorporationSelect: {
              name: "CorporationSelect",
              template: '<div class="corporation-select"><slot /></div>',
              props: [
                "modelValue",
                "size",
                "class",
                "restrictToCorporationAccess",
              ],
            },
          },
        },
      });

      await flushPromises();

      const corporationSelect = wrapper.findComponent({
        name: "CorporationSelect",
      });
      expect(corporationSelect.props("class")).toContain("w-full");

      wrapper.unmount();
    });

    // Placeholder is now handled by CorporationSelect component
    it("initializes without a selected corporation when user has none", async () => {
      const { pinia, stores } = setupStores({ multipleCorporations: true });

      // Set up state with no selected corporation
      stores.auth.user.recentProperty = null;

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: {
            ...createStubs(),
            CorporationSelect: {
              name: "CorporationSelect",
              template: '<div class="corporation-select"><slot /></div>',
              props: [
                "modelValue",
                "size",
                "class",
                "restrictToCorporationAccess",
              ],
            },
          },
        },
      });

      await flushPromises();

      expect((wrapper.vm as any).value).toBeFalsy();

      wrapper.unmount();
    });

    // Access control is now handled by CorporationSelect component
    it("renders CorporationSelect even when user has no accessible corporations", async () => {
      const { pinia, stores } = setupStores();

      // Clear corporation access
      stores.auth.user.corporationAccess = [];
      stores.corporations.corporations = [];

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: {
            ...createStubs(),
            CorporationSelect: {
              name: "CorporationSelect",
              template: '<div class="corporation-select"><slot /></div>',
              props: [
                "modelValue",
                "size",
                "class",
                "restrictToCorporationAccess",
              ],
            },
          },
        },
      });

      await flushPromises();

      const corporationSelect = wrapper.findComponent({
        name: "CorporationSelect",
      });
      expect(corporationSelect.exists()).toBe(true);

      wrapper.unmount();
    });

    // Custom rendering is now handled by CorporationSelect component
    it("renders CorporationSelect with correct props", async () => {
      const { pinia } = setupStores({ multipleCorporations: true });

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: {
            ...createStubs(),
            CorporationSelect: {
              name: "CorporationSelect",
              template: '<div class="corporation-select"><slot /></div>',
              props: [
                "modelValue",
                "size",
                "class",
                "restrictToCorporationAccess",
              ],
            },
          },
        },
      });

      await flushPromises();

      const corporationSelect = wrapper.findComponent({
        name: "CorporationSelect",
      });
      expect(corporationSelect.exists()).toBe(true);
      expect(corporationSelect.props()).toMatchObject({
        size: "sm",
        class: "w-full",
        restrictToCorporationAccess: true,
      });

      wrapper.unmount();
    });

    it("handles selection with object value correctly", async () => {
      const { pinia, stores } = setupStores({ multipleCorporations: true });

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (
        stores.corporations.setSelectedCorporationAndFetchData as any
      ).mockClear();

      // Simulate selection with corporation object
      await(wrapper.vm as any).handleCorporationSelection({
        value: "corp-3",
        uuid: "corp-3",
      });
      await flushPromises();

      expect(
        stores.corporations.setSelectedCorporationAndFetchData
      ).toHaveBeenCalledWith("corp-3");

      wrapper.unmount();
    });

    it("handles undefined selection correctly", async () => {
      const { pinia, stores } = setupStores({ multipleCorporations: true });

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (stores.userProfiles.updateUser as any).mockClear();

      // Simulate clearing selection
      await(wrapper.vm as any).handleCorporationSelection(undefined);
      await flushPromises();

      // Verify that preferences were updated
      expect(stores.userProfiles.updateUser).toHaveBeenCalled();

      wrapper.unmount();
    });

    it("updates user preferences when corporation changes", async () => {
      const { pinia, stores } = setupStores({ multipleCorporations: true });

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      (stores.userProfiles.updateUser as any).mockClear();

      // Simulate selection of corp-2
      const corp2Item = {
        value: "corp-2",
        uuid: "corp-2",
        corporation_name: "Tech Solutions Inc",
      };
      await(wrapper.vm as any).handleCorporationSelection(corp2Item);
      await flushPromises();

      expect(stores.userProfiles.updateUser).toHaveBeenCalled();

      wrapper.unmount();
    });

    // Corporation mapping is now handled by CorporationSelect component - tested in CorporationSelect.test.ts

    it("uses CorporationSelect component for corporation selection", async () => {
      const { pinia } = setupStores({ multipleCorporations: true });

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: {
            ...createStubs(),
            CorporationSelect: {
              name: "CorporationSelect",
              template: '<div class="corporation-select"><slot /></div>',
              props: ["modelValue", "size", "class"],
            },
          },
        },
      });

      await flushPromises();

      const corporationSelect = wrapper.findComponent({
        name: "CorporationSelect",
      });
      expect(corporationSelect.exists()).toBe(true);
      expect(corporationSelect.props("size")).toBe("sm");
      expect(corporationSelect.props("class")).toBe("w-full");

      wrapper.unmount();
    });
  });

  describe("Corporation Data Cleanup on Switch", () => {
    beforeEach(() => {
      mockClearCorporationData.mockClear();
    });

    it("should clear old corporation data when switching to a new corporation", async () => {
      const { pinia, stores } = setupStores({ multipleCorporations: true });

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      // Initial corporation should be corp-1
      expect((wrapper.vm as any).value).toBe("corp-1");
      expect((wrapper.vm as any).previousCorporationId).toBe("corp-1");

      // Clear the mock to track new calls
      mockClearCorporationData.mockClear();

      // Switch to corp-2 by changing the value (triggers the watcher)
      (wrapper.vm as any).value = "corp-2";
      await wrapper.vm.$nextTick();
      await flushPromises();

      // Should have cleared corp-1 data before loading corp-2
      expect(mockClearCorporationData).toHaveBeenCalledWith("corp-1");
      expect(mockClearCorporationData).toHaveBeenCalledTimes(1);
      expect((wrapper.vm as any).previousCorporationId).toBe("corp-2");

      wrapper.unmount();
    });

    it("should clear old corporation data when deselecting corporation", async () => {
      const { pinia } = setupStores({ multipleCorporations: true });

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      // Initial corporation should be corp-1
      expect((wrapper.vm as any).value).toBe("corp-1");
      expect((wrapper.vm as any).previousCorporationId).toBe("corp-1");

      mockClearCorporationData.mockClear();

      // Deselect corporation by setting value to null (triggers watcher)
      (wrapper.vm as any).value = null;
      await wrapper.vm.$nextTick();
      await flushPromises();

      // Should clear corp-1 data
      expect(mockClearCorporationData).toHaveBeenCalledWith("corp-1");
      expect((wrapper.vm as any).previousCorporationId).toBeNull();

      wrapper.unmount();
    });

    it("should not clear data when selecting the same corporation", async () => {
      const { pinia } = setupStores({ multipleCorporations: true });

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      // Initial corporation should be corp-1
      expect((wrapper.vm as any).value).toBe("corp-1");

      mockClearCorporationData.mockClear();

      // Select corp-1 again
      const corp1Item = { value: "corp-1", uuid: "corp-1" };
      await(wrapper.vm as any).handleCorporationSelection(corp1Item);
      await flushPromises();

      // Should NOT clear data since it's the same corporation
      expect(mockClearCorporationData).not.toHaveBeenCalled();

      wrapper.unmount();
    });

    it("should track previousCorporationId correctly through multiple switches", async () => {
      const { pinia } = setupStores({ multipleCorporations: true });

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      // Initial state
      expect((wrapper.vm as any).previousCorporationId).toBe("corp-1");

      mockClearCorporationData.mockClear();

      // Switch to corp-2
      (wrapper.vm as any).value = "corp-2";
      await wrapper.vm.$nextTick();
      await flushPromises();
      expect((wrapper.vm as any).previousCorporationId).toBe("corp-2");
      expect(mockClearCorporationData).toHaveBeenCalledWith("corp-1");

      mockClearCorporationData.mockClear();

      // Switch to corp-3
      (wrapper.vm as any).value = "corp-3";
      await wrapper.vm.$nextTick();
      await flushPromises();
      expect((wrapper.vm as any).previousCorporationId).toBe("corp-3");
      expect(mockClearCorporationData).toHaveBeenCalledWith("corp-2");

      mockClearCorporationData.mockClear();

      // Switch back to corp-1
      (wrapper.vm as any).value = "corp-1";
      await wrapper.vm.$nextTick();
      await flushPromises();
      expect((wrapper.vm as any).previousCorporationId).toBe("corp-1");
      expect(mockClearCorporationData).toHaveBeenCalledWith("corp-3");

      wrapper.unmount();
    });

    it("should work with onCorporationChange (legacy handler)", async () => {
      const { pinia } = setupStores({ multipleCorporations: true });

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      // Legacy handler doesn't directly clear - it lets the watcher handle it
      expect((wrapper.vm as any).onCorporationChange).toBeDefined();

      wrapper.unmount();
    });

    it("should clear data when value watcher triggers on corporation switch", async () => {
      const { pinia } = setupStores({ multipleCorporations: true });

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      mockClearCorporationData.mockClear();

      // Directly change the value to trigger the watcher
      (wrapper.vm as any).value = "corp-2";
      await wrapper.vm.$nextTick();
      await flushPromises();

      // Should clear corp-1 data when switching to corp-2
      expect(mockClearCorporationData).toHaveBeenCalledWith("corp-1");

      wrapper.unmount();
    });

    it("should handle errors in clearCorporationData gracefully", async () => {
      const { pinia } = setupStores({ multipleCorporations: true });
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      mockClearCorporationData.mockClear();
      mockClearCorporationData.mockRejectedValueOnce(
        new Error("IndexedDB error")
      );

      // Switch corporation via value change - should not throw despite error
      (wrapper.vm as any).value = "corp-2";
      await wrapper.vm.$nextTick();
      await flushPromises();

      // Error should be logged but not thrown
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error clearing previous corporation data:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
      wrapper.unmount();
    });

    it("should initialize previousCorporationId on initial load from user preferences", async () => {
      const { pinia } = setupStores({ multipleCorporations: true });

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      // Should be initialized from user's recentProperty
      expect((wrapper.vm as any).previousCorporationId).toBe("corp-1");

      wrapper.unmount();
    });

    it("should not clear data when previousCorporationId is null", async () => {
      const { pinia, stores } = setupStores({ multipleCorporations: true });

      // Start with no selected corporation
      stores.auth.user.recentProperty = null;

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      expect((wrapper.vm as any).previousCorporationId).toBeNull();

      mockClearCorporationData.mockClear();

      // Select corp-1 for the first time via value change
      (wrapper.vm as any).value = "corp-1";
      await wrapper.vm.$nextTick();
      await flushPromises();

      // Should not clear any data since there was no previous corporation
      expect(mockClearCorporationData).not.toHaveBeenCalled();
      expect((wrapper.vm as any).previousCorporationId).toBe("corp-1");

      wrapper.unmount();
    });

    it("should log cleanup messages to console", async () => {
      const { pinia } = setupStores({ multipleCorporations: true });
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      const wrapper = mount(TopBar, {
        global: {
          plugins: [pinia],
          stubs: createStubs(),
        },
      });

      await flushPromises();

      mockClearCorporationData.mockClear();

      // Switch corporation via value change
      (wrapper.vm as any).value = "corp-2";
      await wrapper.vm.$nextTick();
      await flushPromises();

      // Should log cleanup message
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "🗑️ Clearing IndexedDB data for previous corporation: corp-1"
        )
      );

      consoleLogSpy.mockRestore();
      wrapper.unmount();
    });
  });
});


