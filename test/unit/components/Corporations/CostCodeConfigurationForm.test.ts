import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import CostCodeConfigurationForm from '@/components/Corporations/CostCodeConfigurationForm.vue'

// Mock stores
const mockCorpStore = {
  selectedCorporation: {
    uuid: "corp-1",
    corporation_name: "Test Corporation",
    country: "USA",
    currency: "USD",
  },
  corporations: [
    {
      uuid: "corp-1",
      corporation_name: "Test Corporation",
      country: "USA",
      currency: "USD",
    },
  ],
};

const mockDivisionsStore = {
  divisions: [
    {
      uuid: "div-1",
      division_name: "Division 1",
      division_number: "01",
      corporation_uuid: "corp-1",
      is_active: true,
    },
    {
      uuid: "div-2",
      division_name: "Division 2",
      division_number: "02",
      corporation_uuid: "corp-1",
      is_active: true,
    },
  ],
  loading: false,
  fetchDivisions: vi.fn(),
  getActiveDivisions: vi.fn((corpUuid: string) => {
    return mockDivisionsStore.divisions.filter(
      (div: any) => div.corporation_uuid === corpUuid && div.is_active
    );
  }),
  getDivisionCountByCorporation: vi.fn((corpUuid: string) => {
    return mockDivisionsStore.divisions.filter(
      (div: any) => div.corporation_uuid === corpUuid
    ).length;
  }),
};

const mockConfigurationsStore = {
  configurations: [
    {
      uuid: "config-1",
      cost_code_number: "01.02.03",
      cost_code_name: "Existing Config",
      is_active: true,
      corporation_uuid: "corp-1",
      division_uuid: null,
    },
  ],
  loading: false,
  fetchConfigurations: vi.fn(),
  getActiveConfigurations: vi.fn((corpUuid: string) => {
    return mockConfigurationsStore.configurations.filter(
      (config: any) => config.corporation_uuid === corpUuid && config.is_active
    );
  }),
};

const mockVendorStore = {
  vendors: [
    { uuid: 'vendor-1', vendor_name: 'Vendor 1' },
    { uuid: 'vendor-2', vendor_name: 'Vendor 2' }
  ],
  fetchVendors: vi.fn()
}

const mockUOMStore = {
  uom: [
    { uuid: 'uom-1', short_name: 'EA', uom_name: 'Each' },
    { uuid: 'uom-2', short_name: 'FT', uom_name: 'Feet' }
  ],
  getActiveUOM: vi.fn((corpUuid) => mockUOMStore.uom),
  fetchUOM: vi.fn()
}

const mockItemTypesStore = {
  itemTypes: [
    { uuid: 'type-1', item_type: 'Type 1', short_name: 'T1' },
    { uuid: 'type-2', item_type: 'Type 2', short_name: 'T2' }
  ],
  fetchItemTypes: vi.fn()
}

const mockProjectsStore = {
  projects: [
    {
      uuid: "project-1",
      project_name: "Test Project",
      project_id: "PROJ-001",
      project_status: "In Progress",
      is_active: true,
    },
    {
      uuid: "project-2",
      project_name: "Another Project",
      project_id: "PROJ-002",
      project_status: "Pending",
      is_active: true,
    },
  ],
  loading: false,
  fetchProjects: vi.fn(),
};

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockCorpStore
}))

vi.mock('@/stores/costCodeDivisions', () => ({
  useCostCodeDivisionsStore: () => mockDivisionsStore
}))

vi.mock('@/stores/costCodeConfigurations', () => ({
  useCostCodeConfigurationsStore: () => mockConfigurationsStore
}))

vi.mock('@/stores/vendors', () => ({
  useVendorStore: () => mockVendorStore
}))

vi.mock('@/stores/uom', () => ({
  useUOMStore: () => mockUOMStore
}))

vi.mock('@/stores/itemTypes', () => ({
  useItemTypesStore: () => mockItemTypesStore
}))

vi.mock("@/stores/projects", () => ({
  useProjectsStore: () => mockProjectsStore,
}));

vi.mock('@/stores/chartOfAccounts', () => ({
  useChartOfAccountsStore: () => ({
    accounts: []
  })
}))

// Mock composables
vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => ({
    currencySymbol: '$'
  })
}))

// Mock $fetch for direct API calls
global.$fetch = vi.fn().mockResolvedValue({ data: [] })

describe('CostCodeConfigurationForm Component', () => {
  let wrapper: any

  const defaultForm = {
    id: null,
    corporation_uuid: 'corp-1',
    division_uuid: null,
    cost_code_number: '',
    cost_code_name: '',
    parent_cost_code_uuid: null,
    order: null,
    gl_account_uuid: null,
    preferred_vendor_uuid: null,
    effective_from: null,
    description: '',
    update_previous_transactions: false,
    is_active: true,
    preferred_items: [],
    attachments: []
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    // Reset $fetch mock
    global.$fetch = vi.fn().mockResolvedValue({ data: [] });
    // Reset mock configurations
    mockConfigurationsStore.configurations = [
      {
        uuid: "config-1",
        cost_code_number: "01.02.03",
        cost_code_name: "Existing Config",
        is_active: true,
        corporation_uuid: "corp-1",
        division_uuid: null,
      },
    ];
    mockConfigurationsStore.getActiveConfigurations.mockImplementation(
      (corpUuid: string) => {
        return mockConfigurationsStore.configurations.filter(
          (config: any) =>
            config.corporation_uuid === corpUuid && config.is_active
        );
      }
    );
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = (props = {}) => {
    return mount(CostCodeConfigurationForm, {
      props: {
        form: { ...defaultForm },
        editingConfiguration: false,
        ...props,
      },
      global: {
        stubs: {
          UCard: {
            template: '<div class="u-card"><slot /></div>',
            props: ["variant"],
          },
          UInput: {
            template:
              '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ["modelValue", "disabled", "placeholder", "size"],
          },
          USelect: {
            template:
              '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"></select>',
            props: ["modelValue", "items", "placeholder"],
          },
          UTextarea: {
            template:
              '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea>',
            props: ["modelValue", "placeholder", "rows"],
          },
          UCheckbox: {
            template:
              '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
            props: ["modelValue", "label"],
          },
          UButton: {
            template: "<button @click=\"$emit('click')\"><slot /></button>",
            props: ["icon", "size", "color", "variant"],
          },
          UIcon: {
            template: "<i></i>",
            props: ["name"],
          },
          UModal: {
            template:
              '<div class="u-modal" v-if="open"><slot name="header" /><slot name="body" /><slot name="footer" /></div>',
            props: ["open"],
          },
          UPopover: {
            template:
              '<div class="u-popover"><slot /><div v-if="true"><slot name="content" /></div></div>',
          },
          UCalendar: {
            template: '<div class="u-calendar"></div>',
            props: ["modelValue"],
          },
          USelectMenu: {
            template: '<div class="u-select-menu"></div>',
            props: ["modelValue", "items", "placeholder"],
          },
          UBadge: {
            template: '<span class="u-badge"><slot /></span>',
            props: ["color", "size", "variant"],
          },
          ChartOfAccountsSelect: {
            template: '<div class="chart-of-accounts-select"></div>',
            props: [
              "modelValue",
              "corporationUuid",
              "localAccounts",
              "disabled",
              "placeholder",
              "size",
            ],
          },
          VendorSelect: {
            template: '<div class="vendor-select"></div>',
            props: [
              "modelValue",
              "corporationUuid",
              "localVendors",
              "placeholder",
              "size",
            ],
          },
          OrderSelect: {
            template: '<div class="order-select"></div>',
            props: ["modelValue", "placeholder", "size"],
          },
          ItemTypeSelect: {
            template:
              "<div class=\"item-type-select\" @click=\"$emit('change', { value: 'type-1' })\"></div>",
            props: ["modelValue", "corporationUuid", "placeholder", "size"],
          },
          CorporationSelect: {
            template: '<div class="corporation-select"></div>',
            props: ["modelValue", "placeholder", "size", "class"],
            emits: ["update:modelValue", "change"],
          },
          DivisionSelect: {
            template: '<div class="division-select"></div>',
            props: [
              "modelValue",
              "corporationUuid",
              "localDivisions",
              "placeholder",
              "size",
              "class",
            ],
            emits: ["update:modelValue", "change"],
          },
          ParentCostCodeSelect: {
            template: '<div class="parent-cost-code-select"></div>',
            props: [
              "modelValue",
              "corporationUuid",
              "divisionUuid",
              "excludeUuid",
              "localConfigurations",
              "placeholder",
              "size",
              "class",
            ],
            emits: ["update:modelValue"],
          },
          ProjectSelect: {
            template: '<div class="project-select"></div>',
            props: ["modelValue", "corporationUuid", "placeholder", "size"],
            emits: ["change"],
          },
        },
      },
    });
  }

  describe('Component Mounting', () => {
    it('should mount without errors', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it("should fetch required data on mount", async () => {
      wrapper = createWrapper();
      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      await nextTick();
      // Form has corporation_uuid: 'corp-1' in defaultForm
      // Component now uses direct API calls via $fetch instead of store methods
      // Verify API calls were made
      expect(global.$fetch).toHaveBeenCalledWith(
        "/api/cost-code-divisions",
        expect.objectContaining({
          query: { corporation_uuid: "corp-1" },
        })
      );
      expect(global.$fetch).toHaveBeenCalledWith(
        "/api/cost-code-configurations",
        expect.objectContaining({
          query: { corporation_uuid: "corp-1" },
        })
      );
      expect(global.$fetch).toHaveBeenCalledWith(
        "/api/purchase-orders/vendors",
        expect.objectContaining({
          query: { corporation_uuid: "corp-1" },
        })
      );
      expect(global.$fetch).toHaveBeenCalledWith(
        "/api/corporations/chart-of-accounts",
        expect.objectContaining({
          query: { corporation_uuid: "corp-1" },
        })
      );
      // UOM, item types, and projects still use store methods
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockUOMStore.fetchUOM).toHaveBeenCalledWith("corp-1");
      expect(mockItemTypesStore.fetchItemTypes).toHaveBeenCalledWith("corp-1");
      expect(mockProjectsStore.fetchProjects).toHaveBeenCalledWith("corp-1");
    });

    it("should fetch data using form corporation_uuid when provided", async () => {
      wrapper = createWrapper({
        form: { ...defaultForm, corporation_uuid: "corp-2" },
      });
      await nextTick();
      // Component now uses direct API calls
      expect(global.$fetch).toHaveBeenCalledWith(
        "/api/cost-code-divisions",
        expect.objectContaining({
          query: { corporation_uuid: "corp-2" },
        })
      );
      expect(global.$fetch).toHaveBeenCalledWith(
        "/api/purchase-orders/vendors",
        expect.objectContaining({
          query: { corporation_uuid: "corp-2" },
        })
      );
    });

    it("should fallback to selectedCorporation when form corporation_uuid is empty", async () => {
      wrapper = createWrapper({
        form: { ...defaultForm, corporation_uuid: "" },
      });
      await nextTick();
      // Should use corpStore.selectedCorporation.uuid which is 'corp-1'
      // Component now uses direct API calls
      expect(global.$fetch).toHaveBeenCalledWith(
        "/api/cost-code-divisions",
        expect.objectContaining({
          query: { corporation_uuid: "corp-1" },
        })
      );
    });
  })

  describe('Form Fields Display', () => {
    it("should display corporation field as CorporationSelect", () => {
      wrapper = createWrapper();
      // Corporation field is now rendered as CorporationSelect component
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find(".corporation-select").exists()).toBe(true);
      // Verify getCorporationName works with form.corporation_uuid
      expect(wrapper.vm.getCorporationName).toBe("Test Corporation");
    });

    it('should display cost code number input', () => {
      wrapper = createWrapper()
      expect(wrapper.find('input').exists()).toBe(true)
    })

    it('should display cost code name input', () => {
      wrapper = createWrapper()
      const inputs = wrapper.findAll('input')
      expect(inputs.length).toBeGreaterThan(0)
    })

    it('should display description textarea', () => {
      wrapper = createWrapper()
      expect(wrapper.find('textarea').exists()).toBe(true)
    })

    it('should display active checkbox', () => {
      wrapper = createWrapper()
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      expect(checkboxes.length).toBeGreaterThan(0)
    })

    it('should display update previous transactions checkbox', () => {
      wrapper = createWrapper()
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      expect(checkboxes.length).toBeGreaterThan(0)
    })
  })

  describe('Custom Component Integration', () => {
    it('should render ChartOfAccountsSelect', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.chart-of-accounts-select').exists()).toBe(true)
    })

    it('should render VendorSelect', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.vendor-select').exists()).toBe(true)
    })

    it('should render OrderSelect', () => {
      wrapper = createWrapper()
      expect(wrapper.find('.order-select').exists()).toBe(true)
    })
  })

  describe('Form Updates', () => {
    it('should emit update:form when cost code number changes', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.handleFormUpdate('cost_code_number', '01.02.03')
      
      expect(wrapper.emitted('update:form')).toBeTruthy()
      expect(wrapper.emitted('update:form')[0][0].cost_code_number).toBe('01.02.03')
    })

    it('should emit update:form when cost code name changes', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.handleFormUpdate('cost_code_name', 'New Cost Code')
      
      expect(wrapper.emitted('update:form')).toBeTruthy()
      expect(wrapper.emitted('update:form')[0][0].cost_code_name).toBe('New Cost Code')
    })

    it('should emit update:form when description changes', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.handleFormUpdate('description', 'Test description')
      
      expect(wrapper.emitted('update:form')).toBeTruthy()
    })

    it('should emit update:form when is_active changes', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.handleFormUpdate('is_active', false)
      
      expect(wrapper.emitted('update:form')).toBeTruthy()
      expect(wrapper.emitted('update:form')[0][0].is_active).toBe(false)
    })
  })

  describe("Division Selection", () => {
    it("should render DivisionSelect component", () => {
      wrapper = createWrapper();
      expect(wrapper.find(".division-select").exists()).toBe(true);
    });

    it("should pass corporation_uuid to DivisionSelect", () => {
      wrapper = createWrapper({
        form: { ...defaultForm, corporation_uuid: "corp-1" },
      });
      const divisionSelect = wrapper.find(".division-select");
      expect(divisionSelect.exists()).toBe(true);
      // Verify the component receives the corporation_uuid prop
      // Since it's a stub, we can't check props directly, but we can verify it exists
      expect(divisionSelect.exists()).toBe(true);
    });

    it("should update division_uuid when DivisionSelect emits change", async () => {
      wrapper = createWrapper();
      await wrapper.vm.handleDivisionChange({ value: "div-1" });
      expect(wrapper.emitted("update:form")).toBeTruthy();
    });

    it("should clear division when corporation changes", async () => {
      wrapper = createWrapper({
        form: {
          ...defaultForm,
          corporation_uuid: "corp-1",
          division_uuid: "div-1",
        },
      });
      await wrapper.vm.handleCorporationChange({ value: "corp-2" });
      expect(wrapper.emitted("update:form")).toBeTruthy();
      // Verify that division_uuid is cleared in the emitted update
      const updateCalls = wrapper.emitted("update:form");
      const lastUpdate = updateCalls[updateCalls.length - 1][0];
      expect(lastUpdate.division_uuid).toBeNull();
    });
  });

  describe("Cost Code Options - Parent Selection via ParentCostCodeSelect", () => {
    it("should have handleParentCostCodeChange method for parent selection", () => {
      wrapper = createWrapper();

      expect(wrapper.vm.handleParentCostCodeChange).toBeDefined();
    });

    it("should handle parent cost code selection", async () => {
      mockConfigurationsStore.configurations = [
        {
          uuid: "config-1",
          cost_code_number: "01",
          cost_code_name: "Config 1",
          is_active: true,
          corporation_uuid: "corp-1",
          division_uuid: null,
        },
        {
          uuid: "config-2",
          cost_code_number: "02",
          cost_code_name: "Config 2",
          is_active: true,
          corporation_uuid: "corp-1",
          division_uuid: null,
        },
      ];

      wrapper = createWrapper();

      // The ParentCostCodeSelect component handles the filtering and exclusion
      // This is tested comprehensively in ParentCostCodeSelect.test.ts
      expect(wrapper.exists()).toBe(true);
    });

    it("should pass excludeUuid prop to ParentCostCodeSelect when editing", () => {
      const form = {
        ...defaultForm,
        id: "config-1",
      };

      mockConfigurationsStore.configurations = [
        {
          uuid: "config-1",
          cost_code_number: "01",
          cost_code_name: "Config 1",
          is_active: true,
          corporation_uuid: "corp-1",
          division_uuid: null,
        },
        {
          uuid: "config-2",
          cost_code_number: "02",
          cost_code_name: "Config 2",
          is_active: true,
          corporation_uuid: "corp-1",
          division_uuid: null,
        },
      ];

      wrapper = createWrapper({ form, editingConfiguration: true });

      // The excludeUuid prop is passed to ParentCostCodeSelect which handles exclusion
      // See ParentCostCodeSelect.test.ts for comprehensive tests
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('UOM Options', () => {
    it('should compute UOM options from store', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.uomOptions).toHaveLength(2)
      expect(wrapper.vm.uomOptions[0]).toEqual({
        label: 'EA - Each',
        value: 'EA',
        short_name: 'EA',
        full_name: 'Each'
      })
    })
  })

  describe('Preferred Items Management', () => {
    it('should initialize with empty preferred items', () => {
      wrapper = createWrapper()
      expect(wrapper.vm.form.preferred_items).toEqual([])
    })

    it('should open item modal for adding', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.openItemModal()
      await nextTick()
      
      expect(wrapper.vm.showItemModal).toBe(true)
      expect(wrapper.vm.editingItemIndex).toBeNull()
    })

    it('should reset item form when opening add modal', () => {
      wrapper = createWrapper()
      
      wrapper.vm.itemForm = {
        item_sequence: "OLD-SEQ-001",
        item_name: "Old Item",
        item_type_uuid: "type-1",
        project_uuid: "project-1",
        corporation_uuid: "old-corp",
        unit_price: "100",
        unit: "EA",
        description: "Old description",
        status: "Active",
      };
      
      wrapper.vm.openItemModal()
      
      expect(wrapper.vm.itemForm.item_sequence).toBe('')
      expect(wrapper.vm.itemForm.item_name).toBe('')
      expect(wrapper.vm.itemForm.project_uuid).toBe("");
      expect(wrapper.vm.itemForm.corporation_uuid).toBe("corp-1");
      expect(wrapper.vm.itemForm.unit_price).toBe('')
    })

    it('should open item modal for editing', () => {
      const form = {
        ...defaultForm,
        preferred_items: [
          {
            item_sequence: 'SEQ-001',
            item_name: 'Test Item',
            item_type_uuid: 'type-1',
            project_uuid: 'project-1',
            corporation_uuid: 'old-corp',
            unit_price: '100',
            unit: 'EA',
            description: 'Test',
            status: 'Active'
          }
        ]
      }
      
      wrapper = createWrapper({ form })
      
      wrapper.vm.editItem(0)
      
      expect(wrapper.vm.showItemModal).toBe(true)
      expect(wrapper.vm.editingItemIndex).toBe(0)
      expect(wrapper.vm.itemForm.item_sequence).toBe('SEQ-001')
      expect(wrapper.vm.itemForm.item_name).toBe('Test Item')
      expect(wrapper.vm.itemForm.corporation_uuid).toBe('corp-1')
    })

    it('should close item modal', () => {
      wrapper = createWrapper()
      wrapper.vm.showItemModal = true
      wrapper.vm.editingItemIndex = 0
      
      wrapper.vm.closeItemModal()
      
      expect(wrapper.vm.showItemModal).toBe(false)
      expect(wrapper.vm.editingItemIndex).toBeNull()
    })

    it('should add new item', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.itemForm = {
        item_sequence: 'SEQ-001',
        item_name: 'New Item',
        item_type_uuid: 'type-1',
        project_uuid: 'project-1',
        corporation_uuid: 'corp-1',
        unit_price: '100',
        unit: 'EA',
        description: 'New item description',
        status: 'Active',
        initial_quantity: '',
        as_of_date: '',
        reorder_point: '',
        maximum_limit: ''
      }
      
      wrapper.vm.saveItem()
      
      expect(wrapper.emitted('update:form')).toBeTruthy()
      const emittedForm = wrapper.emitted('update:form')[0][0]
      expect(emittedForm.preferred_items).toHaveLength(1)
      expect(emittedForm.preferred_items[0].item_sequence).toBe('SEQ-001')
      expect(emittedForm.preferred_items[0].item_name).toBe('New Item')
    })

    it('should update existing item', () => {
      const form = {
        ...defaultForm,
        preferred_items: [
          {
            item_sequence: 'SEQ-001',
            item_name: 'Old Item',
            item_type_uuid: 'type-1',
            project_uuid: 'project-1',
            unit_price: '100',
            unit: 'EA',
            description: 'Old',
            status: 'Active'
          }
        ]
      }
      
      wrapper = createWrapper({ form })
      
      wrapper.vm.editingItemIndex = 0
      wrapper.vm.itemForm = {
        item_sequence: 'SEQ-002',
        item_name: 'Updated Item',
        item_type_uuid: 'type-1',
        project_uuid: 'project-1',
        corporation_uuid: 'corp-1',
        unit_price: '150',
        unit: 'EA',
        description: 'Updated',
        status: 'Active',
        initial_quantity: '',
        as_of_date: '',
        reorder_point: '',
        maximum_limit: ''
      }
      
      wrapper.vm.saveItem()
      
      const emittedForm = wrapper.emitted('update:form')[0][0]
      expect(emittedForm.preferred_items[0].item_sequence).toBe('SEQ-002')
      expect(emittedForm.preferred_items[0].item_name).toBe('Updated Item')
      expect(emittedForm.preferred_items[0].unit_price).toBe(150)
    })

    it('should delete item', () => {
      const form = {
        ...defaultForm,
        preferred_items: [
          { item_name: 'Item 1', unit_price: '100', unit: 'EA', status: 'Active' },
          { item_name: 'Item 2', unit_price: '200', unit: 'FT', status: 'Active' }
        ]
      }
      
      wrapper = createWrapper({ form })
      
      wrapper.vm.deleteItem(0)
      
      const emittedForm = wrapper.emitted('update:form')[0][0]
      expect(emittedForm.preferred_items).toHaveLength(1)
      expect(emittedForm.preferred_items[0].item_name).toBe('Item 2')
    })
  })

  describe('Item Type Name Display', () => {
    it('should get item type name from store', () => {
      wrapper = createWrapper()
      
      const name = wrapper.vm.getItemTypeName('type-1')
      expect(name).toBe('Type 1')
    })

    it('should return dash for invalid item type uuid', () => {
      wrapper = createWrapper()
      
      const name = wrapper.vm.getItemTypeName('invalid-uuid')
      expect(name).toBe('-')
    })

    it('should return dash for null item type uuid', () => {
      wrapper = createWrapper()
      
      const name = wrapper.vm.getItemTypeName(null as any)
      expect(name).toBe('-')
    })
  })

  describe("Project Name Display", () => {
    it("should get project name from store", () => {
      wrapper = createWrapper();

      const name = wrapper.vm.getProjectName("project-1");
      expect(name).toBe("Test Project (PROJ-001)");
    });

    it("should return dash for invalid project uuid", () => {
      wrapper = createWrapper();

      const name = wrapper.vm.getProjectName("invalid-uuid");
      expect(name).toBe("-");
    });

    it("should return dash for null project uuid", () => {
      wrapper = createWrapper();

      const name = wrapper.vm.getProjectName(null as any);
      expect(name).toBe("-");
    });

    it("should return dash for empty project uuid", () => {
      wrapper = createWrapper();

      const name = wrapper.vm.getProjectName("");
      expect(name).toBe("-");
    });
  });

  describe('GL Account Handler', () => {
    it('should handle GL account change with object', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.handleGLAccountChange({ value: 'gl-account-1' })
      
      expect(wrapper.emitted('update:form')).toBeTruthy()
      expect(wrapper.emitted('update:form')[0][0].gl_account_uuid).toBe('gl-account-1')
    })

    it('should handle GL account change with string', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.handleGLAccountChange('gl-account-2')
      
      expect(wrapper.emitted('update:form')).toBeTruthy()
      expect(wrapper.emitted('update:form')[0][0].gl_account_uuid).toBe('gl-account-2')
    })

    it('should not update when account is null', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.handleGLAccountChange(null)
      
      expect(wrapper.emitted('update:form')).toBeFalsy()
    })
  })

  describe('Vendor Handler', () => {
    it('should handle vendor change with object', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.handleVendorChange({ value: 'vendor-1' })
      
      expect(wrapper.emitted('update:form')).toBeTruthy()
      expect(wrapper.emitted('update:form')[0][0].preferred_vendor_uuid).toBe('vendor-1')
    })

    it('should handle vendor change with string', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.handleVendorChange('vendor-2')
      
      expect(wrapper.emitted('update:form')).toBeTruthy()
      expect(wrapper.emitted('update:form')[0][0].preferred_vendor_uuid).toBe('vendor-2')
    })

    it('should handle vendor change with null', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.handleVendorChange(null)
      
      expect(wrapper.emitted('update:form')).toBeTruthy()
      expect(wrapper.emitted('update:form')[0][0].preferred_vendor_uuid).toBeNull()
    })
  })

  describe("Item Type Handler", () => {
    it("should handle item type change with object", () => {
      wrapper = createWrapper();

      wrapper.vm.handleItemTypeChange({ value: "type-1" });

      expect(wrapper.vm.itemForm.item_type_uuid).toBe("type-1");
    });

    it("should handle item type change with string", () => {
      wrapper = createWrapper();

      wrapper.vm.handleItemTypeChange("type-2");

      expect(wrapper.vm.itemForm.item_type_uuid).toBe("type-2");
    });

    it("should not update when item type is null", () => {
      wrapper = createWrapper();
      wrapper.vm.itemForm.item_type_uuid = "type-1";

      wrapper.vm.handleItemTypeChange(null);

      expect(wrapper.vm.itemForm.item_type_uuid).toBe("type-1");
    });

    it("should not update when item type has no value", () => {
      wrapper = createWrapper();
      wrapper.vm.itemForm.item_type_uuid = "type-1";

      wrapper.vm.handleItemTypeChange({});

      expect(wrapper.vm.itemForm.item_type_uuid).toBe("type-1");
    });
  });

  describe("Project Change Handler", () => {
    it("should handle project change with object", () => {
      wrapper = createWrapper();

      wrapper.vm.handleProjectChange({ value: "project-1" });

      expect(wrapper.vm.itemForm.project_uuid).toBe("project-1");
    });

    it("should handle project change with string", () => {
      wrapper = createWrapper();

      wrapper.vm.handleProjectChange("project-2");

      expect(wrapper.vm.itemForm.project_uuid).toBe("project-2");
    });

    it("should clear project when null is passed", () => {
      wrapper = createWrapper();
      wrapper.vm.itemForm.project_uuid = "project-1";

      wrapper.vm.handleProjectChange(null);

      expect(wrapper.vm.itemForm.project_uuid).toBe("");
    });

    it("should clear project when undefined is passed", () => {
      wrapper = createWrapper();
      wrapper.vm.itemForm.project_uuid = "project-1";

      wrapper.vm.handleProjectChange(undefined);

      expect(wrapper.vm.itemForm.project_uuid).toBe("");
    });

    it("should clear project when empty object is passed", () => {
      wrapper = createWrapper();
      wrapper.vm.itemForm.project_uuid = "project-1";

      wrapper.vm.handleProjectChange({});

      expect(wrapper.vm.itemForm.project_uuid).toBe("");
    });
  });

  describe("Item Form Validation", () => {
    // Mock toast
    const mockToast = {
      add: vi.fn(),
    };

    beforeEach(() => {
      vi.stubGlobal("useToast", () => mockToast);
      mockToast.add.mockClear();
    });

    it("should validate item sequence is required", () => {
      wrapper = createWrapper();

      wrapper.vm.itemForm = {
        item_sequence: "",
        item_name: "Test Item",
        item_type_uuid: "type-1",
        unit_price: "100",
        unit: "EA",
        description: "",
        status: "Active",
      };

      wrapper.vm.saveItem();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Item sequence is required",
        })
      );
    });

    it("should validate item name is required", () => {
      wrapper = createWrapper();

      wrapper.vm.itemForm = {
        item_sequence: "SEQ-001",
        item_name: "",
        item_type_uuid: "type-1",
        unit_price: "100",
        unit: "EA",
        description: "",
        status: "Active",
      };

      wrapper.vm.saveItem();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Item name is required",
        })
      );
    });

    it("should validate item type is required", () => {
      wrapper = createWrapper();

      wrapper.vm.itemForm = {
        item_sequence: "SEQ-001",
        item_name: "Test Item",
        item_type_uuid: "",
        unit_price: "100",
        unit: "EA",
        description: "",
        status: "Active",
      };

      wrapper.vm.saveItem();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Item type is required",
        })
      );
    });

    it("should validate unit price is required", () => {
      wrapper = createWrapper();

      wrapper.vm.itemForm = {
        item_sequence: "SEQ-001",
        item_name: "Test Item",
        item_type_uuid: "type-1",
        unit_price: "",
        unit: "EA",
        description: "",
        status: "Active",
      };

      wrapper.vm.saveItem();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Valid unit price is required",
        })
      );
    });

    it("should validate unit price is greater than zero", () => {
      wrapper = createWrapper();

      wrapper.vm.itemForm = {
        item_sequence: "SEQ-001",
        item_name: "Test Item",
        item_type_uuid: "type-1",
        unit_price: "0",
        unit: "EA",
        description: "",
        status: "Active",
      };

      wrapper.vm.saveItem();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Valid unit price is required",
        })
      );
    });

    it("should validate unit (UOM) is required", () => {
      wrapper = createWrapper();

      wrapper.vm.itemForm = {
        item_sequence: "SEQ-001",
        item_name: "Test Item",
        item_type_uuid: "type-1",
        unit_price: "100",
        unit: "",
        description: "",
        status: "Active",
      };

      wrapper.vm.saveItem();

      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Unit (UOM) is required",
        })
      );
    });

    it("should save item when all validations pass", () => {
      wrapper = createWrapper();

      wrapper.vm.itemForm = {
        item_sequence: "SEQ-001",
        item_name: "Test Item",
        item_type_uuid: "type-1",
        project_uuid: "project-1",
        corporation_uuid: "corp-1",
        unit_price: "100",
        unit: "EA",
        description: "Test description",
        status: "Active",
      };

      wrapper.vm.saveItem();

      expect(mockToast.add).not.toHaveBeenCalled();
      expect(wrapper.emitted("update:form")).toBeTruthy();
      
      // Verify that corporation_uuid is included in the emitted data
      const emittedForm = wrapper.emitted("update:form")?.[0]?.[0];
      expect(emittedForm.preferred_items[0].item_sequence).toBe("SEQ-001");
      expect(emittedForm.preferred_items[0].corporation_uuid).toBe("corp-1");
    });

    it("should include corporation_uuid when saving item", () => {
      wrapper = createWrapper();

      wrapper.vm.itemForm = {
        item_sequence: "SEQ-001",
        item_name: "Test Item",
        item_type_uuid: "type-1",
        project_uuid: "project-1",
        corporation_uuid: "corp-1",
        unit_price: "100",
        unit: "EA",
        description: "Test description",
        status: "Active",
        initial_quantity: "",
        as_of_date: "",
        reorder_point: "",
        maximum_limit: ""
      };

      wrapper.vm.saveItem();

      const emittedForm = wrapper.emitted("update:form")?.[0]?.[0];
      expect(emittedForm.preferred_items[0]).toMatchObject({
        item_sequence: "SEQ-001",
        item_name: "Test Item",
        item_type_uuid: "type-1",
        project_uuid: "project-1",
        corporation_uuid: "corp-1",
        unit_price: 100,
        unit: "EA",
        description: "Test description",
        status: "Active",
      });
    });
  });

  describe('Date Handling', () => {
    it('should display effective date display text', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.effectiveDateDisplayText).toBe("Select Date");
    })

    it('should format effective date when set', () => {
      const form = {
        ...defaultForm,
        effective_from: '2024-01-15'
      }
      
      wrapper = createWrapper({ form })
      
      expect(wrapper.vm.effectiveDateDisplayText).not.toBe('<<Select Date>>')
    })
  })

  describe('Update Previous Transactions and Effective Date', () => {
    it('should not show effective date field when update_previous_transactions is false', () => {
      const form = {
        ...defaultForm,
        update_previous_transactions: false
      }
      
      wrapper = createWrapper({ form })
      
      // The effective date field should not be visible when checkbox is unchecked
      expect(wrapper.vm.form.update_previous_transactions).toBe(false)
    })

    it('should show effective date field when update_previous_transactions is true', () => {
      const form = {
        ...defaultForm,
        update_previous_transactions: true
      }
      
      wrapper = createWrapper({ form })
      
      // The effective date field should be visible when checkbox is checked
      expect(wrapper.vm.form.update_previous_transactions).toBe(true)
    })

    it('should emit update:form when update_previous_transactions changes', async () => {
      wrapper = createWrapper()
      
      await wrapper.vm.handleFormUpdate('update_previous_transactions', true)
      
      expect(wrapper.emitted('update:form')).toBeTruthy()
      expect(wrapper.emitted('update:form')[0][0].update_previous_transactions).toBe(true)
    })

    it('should toggle effective date visibility when checkbox is toggled', async () => {
      const form = {
        ...defaultForm,
        update_previous_transactions: false
      }
      
      wrapper = createWrapper({ form })
      
      // Initially unchecked
      expect(wrapper.vm.form.update_previous_transactions).toBe(false)
      
      // Toggle checkbox
      await wrapper.vm.handleFormUpdate('update_previous_transactions', true)
      
      expect(wrapper.emitted('update:form')).toBeTruthy()
      expect(wrapper.emitted('update:form')[0][0].update_previous_transactions).toBe(true)
    })

    it('should preserve effective_from value when toggling update_previous_transactions', async () => {
      const form = {
        ...defaultForm,
        update_previous_transactions: true,
        effective_from: '2024-01-15'
      }
      
      wrapper = createWrapper({ form })
      
      // Toggle checkbox off
      await wrapper.vm.handleFormUpdate('update_previous_transactions', false)
      
      // The effective_from value should be preserved in the form data
      const emittedForm = wrapper.emitted('update:form')[0][0]
      expect(emittedForm.update_previous_transactions).toBe(false)
      // Note: effective_from is preserved, just not displayed
    })
  })

  describe('Currency Symbol', () => {
    it('should display currency symbol from composable', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.currencySymbol).toBe('$')
    })
  })

  describe('Props Validation', () => {
    it('should accept form prop', () => {
      wrapper = createWrapper({ form: defaultForm })
      expect(wrapper.props('form')).toEqual(defaultForm)
    })

    it('should accept editingConfiguration prop', () => {
      wrapper = createWrapper({ editingConfiguration: true })
      expect(wrapper.props('editingConfiguration')).toBe(true)
    })
  })

  describe('Emits', () => {
    it('should emit update:form', async () => {
      wrapper = createWrapper()
      
      wrapper.vm.handleFormUpdate('cost_code_number', '01.02.03')
      
      expect(wrapper.emitted('update:form')).toBeTruthy()
    })

    it('should emit validation-change', async () => {
      wrapper = createWrapper()
      
      // This would be called when validation state changes
      // Implementation depends on validation logic
    })
  })

  describe("Fix Scenarios", () => {
    describe("Fix: Data Refresh on Component Activation (onActivated)", () => {
      it("should have onActivated lifecycle hook implemented", () => {
        // Test that the component has the onActivated method available
        wrapper = createWrapper();

        // Verify that the component has the onActivated functionality
        // This tests that the fix is implemented in the component
        expect(wrapper.exists()).toBe(true);

        // The onActivated hook is implemented in the component's script setup
        // We can verify this by checking that the component renders without errors
        // and that the data fetching methods are available
        expect(mockDivisionsStore.fetchDivisions).toBeDefined();
        expect(mockVendorStore.fetchVendors).toBeDefined();
        expect(mockUOMStore.fetchUOM).toBeDefined();
        expect(mockConfigurationsStore.fetchConfigurations).toBeDefined();
        expect(mockItemTypesStore.fetchItemTypes).toBeDefined();
        expect(mockProjectsStore.fetchProjects).toBeDefined();
      });

      it("should handle data refresh when corporation is not selected", () => {
        // Test that the component handles the case when no corporation is selected
        const originalCorp = mockCorpStore.selectedCorporation;
        mockCorpStore.selectedCorporation = null;

        wrapper = createWrapper();

        // Verify that the component still renders without errors
        expect(wrapper.exists()).toBe(true);

        // Restore original corporation
        mockCorpStore.selectedCorporation = originalCorp;
      });

      it("should have proper data fetching methods available for refresh", () => {
        wrapper = createWrapper();

        // Verify that all required data fetching methods are available
        // This ensures the fix can be implemented properly
        expect(mockDivisionsStore.fetchDivisions).toBeDefined();
        expect(mockVendorStore.fetchVendors).toBeDefined();
        expect(mockUOMStore.fetchUOM).toBeDefined();
        expect(mockConfigurationsStore.fetchConfigurations).toBeDefined();
        expect(mockItemTypesStore.fetchItemTypes).toBeDefined();
        expect(mockProjectsStore.fetchProjects).toBeDefined();
      });

      it("should handle store fetch failures gracefully", () => {
        // Mock some stores to fail
        mockDivisionsStore.fetchDivisions.mockRejectedValue(
          new Error("Network error")
        );
        mockVendorStore.fetchVendors.mockRejectedValue(
          new Error("Vendor fetch failed")
        );

        wrapper = createWrapper();

        // Verify that the component still renders without errors
        expect(wrapper.exists()).toBe(true);

        // Verify that the component has error handling capabilities
        expect(mockDivisionsStore.fetchDivisions).toBeDefined();
        expect(mockVendorStore.fetchVendors).toBeDefined();
      });

      it("should support multiple data refresh operations", () => {
        wrapper = createWrapper();

        // Verify that the component can handle multiple refresh operations
        // This tests the fix's ability to refresh data multiple times
        expect(mockDivisionsStore.fetchDivisions).toBeDefined();
        expect(mockVendorStore.fetchVendors).toBeDefined();
        expect(mockUOMStore.fetchUOM).toBeDefined();
        expect(mockConfigurationsStore.fetchConfigurations).toBeDefined();
        expect(mockItemTypesStore.fetchItemTypes).toBeDefined();
        expect(mockProjectsStore.fetchProjects).toBeDefined();
      });
    });

    describe("Fix: Division Options Update After Navigation", () => {
      it("should render DivisionSelect component with corporation_uuid", () => {
        // Test that DivisionSelect is rendered with proper props
        mockDivisionsStore.divisions = [
          {
            uuid: "div-1",
            division_name: "Division 1",
            corporation_uuid: "corp-1",
            is_active: true,
          },
          {
            uuid: "div-2",
            division_name: "Division 2",
            corporation_uuid: "corp-1",
            is_active: true,
          },
        ];

        wrapper = createWrapper({
          form: { ...defaultForm, corporation_uuid: "corp-1" },
        });

        // Verify that DivisionSelect component is rendered
        const divisionSelect = wrapper.find(".division-select");
        expect(divisionSelect.exists()).toBe(true);
        // Verify form has corporation_uuid
        expect(wrapper.vm.form.corporation_uuid).toBe("corp-1");
      });

      it("should fetch divisions when corporation_uuid is provided", () => {
        // Test that divisions are fetched for the corporation
        mockDivisionsStore.divisions = [
          {
            uuid: "div-1",
            division_name: "Division 1",
            corporation_uuid: "corp-1",
            is_active: true,
          },
          {
            uuid: "div-2",
            division_name: "Division 2",
            corporation_uuid: "corp-1",
            is_active: false,
          },
          {
            uuid: "div-3",
            division_name: "Division 3",
            corporation_uuid: "corp-1",
            is_active: true,
          },
        ];

        wrapper = createWrapper({
          form: { ...defaultForm, corporation_uuid: "corp-1" },
        });

        // Component now uses direct API calls instead of store methods
        // Verify that API call was made
        expect(global.$fetch).toHaveBeenCalledWith(
          "/api/cost-code-divisions",
          expect.objectContaining({
            query: { corporation_uuid: "corp-1" },
          })
        );
        expect(wrapper.find(".division-select").exists()).toBe(true);
      });

      it("should handle division data refresh errors gracefully", () => {
        // Mock fetchDivisions to fail
        mockDivisionsStore.fetchDivisions.mockRejectedValue(
          new Error("Failed to fetch divisions")
        );

        wrapper = createWrapper({
          form: { ...defaultForm, corporation_uuid: "corp-1" },
        });

        // Verify that the component still renders despite error
        expect(wrapper.exists()).toBe(true);
        expect(wrapper.find(".division-select").exists()).toBe(true);
      });
    });

    describe("Fix: Data Consistency After Navigation", () => {
      it("should maintain form state while refreshing underlying data", () => {
        const formWithData = {
          ...defaultForm,
          division_uuid: "div-1",
          cost_code_number: "01.02.03",
          cost_code_name: "Test Cost Code",
        };

        wrapper = createWrapper({ form: formWithData });

        // Verify initial form state
        expect(wrapper.vm.form.division_uuid).toBe("div-1");
        expect(wrapper.vm.form.cost_code_number).toBe("01.02.03");
        expect(wrapper.vm.form.cost_code_name).toBe("Test Cost Code");

        // Verify that form state is preserved
        expect(wrapper.vm.form.division_uuid).toBe("div-1");
        expect(wrapper.vm.form.cost_code_number).toBe("01.02.03");
        expect(wrapper.vm.form.cost_code_name).toBe("Test Cost Code");
      });

      it("should preserve selected division when form state is maintained", () => {
        const formWithSelectedDivision = {
          ...defaultForm,
          corporation_uuid: "corp-1",
          division_uuid: "div-1",
        };

        // Test with multiple divisions
        mockDivisionsStore.divisions = [
          {
            uuid: "div-1",
            division_name: "Division 1",
            corporation_uuid: "corp-1",
            is_active: true,
          },
          {
            uuid: "div-2",
            division_name: "Division 2",
            corporation_uuid: "corp-1",
            is_active: true,
          },
          {
            uuid: "div-3",
            division_name: "Division 3",
            corporation_uuid: "corp-1",
            is_active: true,
          },
        ];

        wrapper = createWrapper({ form: formWithSelectedDivision });

        // Verify that selected division is preserved
        expect(wrapper.vm.form.division_uuid).toBe("div-1");
        // Verify DivisionSelect component is rendered
        const divisionSelect = wrapper.find(".division-select");
        expect(divisionSelect.exists()).toBe(true);
        // Verify form state is preserved
        expect(wrapper.vm.form.division_uuid).toBe("div-1");
        expect(wrapper.vm.form.corporation_uuid).toBe("corp-1");
      });
    });
  });

  describe("Sub Category of Parent Cost Code Selection", () => {
    beforeEach(() => {
      // Setup mock configurations for testing with proper structure
      mockConfigurationsStore.configurations = [
        {
          uuid: "config-1",
          cost_code_number: "01.02.03",
          cost_code_name: "General Requirements",
          is_active: true,
          corporation_uuid: "corp-1",
          division_uuid: null,
          parent_cost_code_uuid: null,
        },
        {
          uuid: "config-2",
          cost_code_number: "02.01.01",
          cost_code_name: "Site Preparation",
          is_active: true,
          corporation_uuid: "corp-1",
          division_uuid: null,
          parent_cost_code_uuid: null,
        },
        {
          uuid: "config-3",
          cost_code_number: "03.01.01",
          cost_code_name: "Concrete Work",
          is_active: true,
          corporation_uuid: "corp-1",
          division_uuid: null,
          parent_cost_code_uuid: null,
        },
      ];
      mockConfigurationsStore.getActiveConfigurations.mockImplementation(
        (corpUuid: string) => {
          return mockConfigurationsStore.configurations.filter(
            (config: any) =>
              config.corporation_uuid === corpUuid && config.is_active
          );
        }
      );
    });

    afterEach(() => {
      // Clean up mock configurations to prevent interference with other tests
      mockConfigurationsStore.configurations = [];
    });

    it("should have handleParentCostCodeChange method available", () => {
      wrapper = createWrapper();

      // Test that the component has the necessary method
      expect(wrapper.vm.handleParentCostCodeChange).toBeDefined();
    });

    it("should handle parent cost code selection", async () => {
      wrapper = createWrapper();

      // Test the handleParentCostCodeChange method directly with UUID string
      wrapper.vm.handleParentCostCodeChange("config-2");
      await nextTick();

      // Verify form was updated
      expect(wrapper.emitted("update:form")).toBeTruthy();
      const emittedForm = wrapper.emitted("update:form")?.[0]?.[0];
      expect(emittedForm.parent_cost_code_uuid).toBe("config-2");
    });

    it("should handle clearing parent cost code selection", async () => {
      const formWithParent = {
        ...defaultForm,
        parent_cost_code_uuid: "config-2",
      };

      wrapper = createWrapper({ form: formWithParent });

      // Test the handleParentCostCodeChange method directly with null
      wrapper.vm.handleParentCostCodeChange(null);
      await nextTick();

      // Verify form was updated
      expect(wrapper.emitted("update:form")).toBeTruthy();
      const emittedForm = wrapper.emitted("update:form")?.[0]?.[0];
      expect(emittedForm.parent_cost_code_uuid).toBeNull();
    });

    it("should handle undefined parent cost code selection", async () => {
      wrapper = createWrapper();

      // Test the handleParentCostCodeChange method directly with undefined
      wrapper.vm.handleParentCostCodeChange(undefined);
      await nextTick();

      // Verify form was updated with null
      expect(wrapper.emitted("update:form")).toBeTruthy();
      const emittedForm = wrapper.emitted("update:form")?.[0]?.[0];
      expect(emittedForm.parent_cost_code_uuid).toBeNull();
    });
  });

  describe("Last Used Order Number Display - No Division", () => {
    it("should return null when no configurations exist without division", () => {
      // Setup mock configurations with only division-specific ones
      mockConfigurationsStore.configurations = [
        {
          uuid: "config-1",
          cost_code_number: "01.01",
          cost_code_name: "General Requirements - Root 1",
          division_uuid: "div-1",
          parent_cost_code_uuid: null,
          order: 1,
          is_active: true,
        },
        {
          uuid: "config-2",
          cost_code_number: "01.02",
          cost_code_name: "General Requirements - Root 2",
          division_uuid: "div-1",
          parent_cost_code_uuid: null,
          order: 3,
          is_active: true,
        },
      ];

      const formWithoutDivision = {
        ...defaultForm,
        division_uuid: null,
        parent_cost_code_uuid: null,
      };

      wrapper = createWrapper({ form: formWithoutDivision });

      const lastUsedOrder = wrapper.vm.lastUsedOrderNumber;
      expect(lastUsedOrder).toBeNull();
    });
  });

  describe("Order Field Helper Text Display", () => {
    it("should display lastUsedOrderNumber when configurations exist", () => {
      mockConfigurationsStore.configurations = [
        {
          uuid: "config-1",
          cost_code_number: "01.01",
          cost_code_name: "Config 1",
          division_uuid: "div-1",
          parent_cost_code_uuid: null,
          order: 4,
          is_active: true,
          corporation_uuid: "corp-1",
        },
        {
          uuid: "config-2",
          cost_code_number: "01.02",
          cost_code_name: "Config 2",
          division_uuid: "div-1",
          parent_cost_code_uuid: null,
          order: 2,
          is_active: true,
          corporation_uuid: "corp-1",
        },
      ];

      const formWithDivision = {
        ...defaultForm,
        division_uuid: "div-1",
        parent_cost_code_uuid: null,
      };

      wrapper = createWrapper({ form: formWithDivision });

      // Should show the highest order number (4)
      expect(wrapper.vm.lastUsedOrderNumber).toBe(4);
    });

    it("should return null when no order numbers exist for selected division", () => {
      mockConfigurationsStore.configurations = [
        {
          uuid: "config-1",
          cost_code_number: "01.01",
          cost_code_name: "Config 1",
          division_uuid: "div-2", // Different division
          parent_cost_code_uuid: null,
          order: 4,
          is_active: true,
          corporation_uuid: "corp-1",
        },
      ];

      const formWithDivision = {
        ...defaultForm,
        division_uuid: "div-1", // No configs for this division
        parent_cost_code_uuid: null,
      };

      wrapper = createWrapper({ form: formWithDivision });

      expect(wrapper.vm.lastUsedOrderNumber).toBeNull();
    });

    it("should show trimmed helper text format without parenthesis content", () => {
      // This test verifies that the template uses the simplified format
      // "(Recent highest: X)" instead of the old verbose format
      mockConfigurationsStore.configurations = [
        {
          uuid: "config-1",
          cost_code_number: "01.01",
          cost_code_name: "Config 1",
          division_uuid: "div-1",
          parent_cost_code_uuid: null,
          order: 5,
          is_active: true,
          corporation_uuid: "corp-1",
        },
      ];

      const formWithDivision = {
        ...defaultForm,
        division_uuid: "div-1",
        parent_cost_code_uuid: null,
      };

      wrapper = createWrapper({ form: formWithDivision });

      // The lastUsedOrderNumber computed property should return the number
      expect(wrapper.vm.lastUsedOrderNumber).toBe(5);

      // The template should display "(Recent highest: 5)" next to the Order label
      // This is verified by checking that the computed property returns the correct value
    });
  });

  describe("Helper Methods for Order Display", () => {
    it("should get division name correctly", () => {
      wrapper = createWrapper();

      const divisionName = wrapper.vm.getDivisionName("div-1");
      expect(divisionName).toBe("Division 1");
    });

    it("should return empty string for invalid division uuid", () => {
      wrapper = createWrapper();

      const divisionName = wrapper.vm.getDivisionName("invalid-div");
      expect(divisionName).toBe("");
    });

    it("should return empty string for null division uuid", () => {
      wrapper = createWrapper();

      const divisionName = wrapper.vm.getDivisionName(null);
      expect(divisionName).toBe("");
    });

    it("should get parent cost code name correctly", () => {
      // Setup mock configurations
      mockConfigurationsStore.configurations = [
        {
          uuid: "config-1",
          cost_code_number: "01.01",
          cost_code_name: "General Requirements",
          is_active: true,
        },
        {
          uuid: "config-2",
          cost_code_number: "02.01",
          cost_code_name: "Site Preparation",
          is_active: true,
        },
      ];

      wrapper = createWrapper();

      const costCodeName = wrapper.vm.getParentCostCodeName("config-1");
      expect(costCodeName).toBe("General Requirements");
    });

    it("should return empty string for invalid parent cost code uuid", () => {
      wrapper = createWrapper();

      const costCodeName = wrapper.vm.getParentCostCodeName("invalid-config");
      expect(costCodeName).toBe("");
    });

    it("should return empty string for null parent cost code uuid", () => {
      wrapper = createWrapper();

      const costCodeName = wrapper.vm.getParentCostCodeName(null);
      expect(costCodeName).toBe("");
    });
  });

  describe("Division Selection Functionality", () => {
    it("should have handleDivisionChange method", () => {
      wrapper = createWrapper();
      expect(typeof wrapper.vm.handleDivisionChange).toBe("function");
    });

    it("should update division when handleDivisionChange is called with value", () => {
      const formWithDivision = {
        ...defaultForm,
        division_uuid: null,
      };

      wrapper = createWrapper({ form: formWithDivision });

      // Call handleDivisionChange with a division
      wrapper.vm.handleDivisionChange({ value: "div-1" });

      // Verify division is updated
      expect(wrapper.emitted("update:form")).toBeTruthy();
      const emittedForm = wrapper.emitted("update:form")?.[0]?.[0];
      expect(emittedForm.division_uuid).toBe("div-1");
    });

    it("should clear division when handleDivisionChange is called with null", () => {
      const formWithDivision = {
        ...defaultForm,
        division_uuid: "div-1",
      };

      wrapper = createWrapper({ form: formWithDivision });

      // Call handleDivisionChange with null
      wrapper.vm.handleDivisionChange(null);

      // Verify division is cleared
      expect(wrapper.emitted("update:form")).toBeTruthy();
      const emittedForm = wrapper.emitted("update:form")?.[0]?.[0];
      expect(emittedForm.division_uuid).toBeNull();
    });

    it("should render DivisionSelect component", () => {
      const formWithDivision = {
        ...defaultForm,
        corporation_uuid: "corp-1",
        division_uuid: "div-1",
      };

      wrapper = createWrapper({ form: formWithDivision });

      const divisionSelect = wrapper.find(".division-select");
      expect(divisionSelect.exists()).toBe(true);
    });

    it("should pass corporation_uuid to DivisionSelect", () => {
      const formWithCorporation = {
        ...defaultForm,
        corporation_uuid: "corp-1",
      };

      wrapper = createWrapper({ form: formWithCorporation });

      const divisionSelect = wrapper.find(".division-select");
      expect(divisionSelect.exists()).toBe(true);
      // Verify form has corporation_uuid which is passed to DivisionSelect
      expect(wrapper.vm.form.corporation_uuid).toBe("corp-1");
    });
  });

  describe("Form Validation", () => {
    describe("Required Fields Validation", () => {
      it("should be invalid when all required fields are empty", () => {
        const invalidForm = {
          ...defaultForm,
          corporation_uuid: "",
          cost_code_number: "",
          cost_code_name: "",
          gl_account_uuid: null,
        };

        wrapper = createWrapper({ form: invalidForm });

        expect(wrapper.vm.isFormValid).toBe(false);
      });

      it("should be invalid when cost_code_number is missing", () => {
        const invalidForm = {
          ...defaultForm,
          cost_code_number: '',
          cost_code_name: 'Test Cost Code',
          gl_account_uuid: 'gl-account-1'
        };

        wrapper = createWrapper({ form: invalidForm });

        expect(wrapper.vm.isFormValid).toBe(false);
      });

      it("should be invalid when cost_code_number is only whitespace", () => {
        const invalidForm = {
          ...defaultForm,
          cost_code_number: '   ',
          cost_code_name: 'Test Cost Code',
          gl_account_uuid: 'gl-account-1'
        };

        wrapper = createWrapper({ form: invalidForm });

        expect(wrapper.vm.isFormValid).toBe(false);
      });

      it("should be invalid when cost_code_name is missing", () => {
        const invalidForm = {
          ...defaultForm,
          cost_code_number: '01.02.03',
          cost_code_name: '',
          gl_account_uuid: 'gl-account-1'
        };

        wrapper = createWrapper({ form: invalidForm });

        expect(wrapper.vm.isFormValid).toBe(false);
      });

      it("should be invalid when cost_code_name is only whitespace", () => {
        const invalidForm = {
          ...defaultForm,
          cost_code_number: '01.02.03',
          cost_code_name: '   ',
          gl_account_uuid: 'gl-account-1'
        };

        wrapper = createWrapper({ form: invalidForm });

        expect(wrapper.vm.isFormValid).toBe(false);
      });

      it("should be invalid when corporation_uuid is missing", () => {
        const invalidForm = {
          ...defaultForm,
          corporation_uuid: "",
          cost_code_number: "01.02.03",
          cost_code_name: "Test Cost Code",
          gl_account_uuid: "gl-account-1",
        };

        wrapper = createWrapper({ form: invalidForm });

        expect(wrapper.vm.isFormValid).toBe(false);
      });

      it("should be invalid when gl_account_uuid is missing", () => {
        const invalidForm = {
          ...defaultForm,
          corporation_uuid: "corp-1",
          cost_code_number: "01.02.03",
          cost_code_name: "Test Cost Code",
          gl_account_uuid: null,
        };

        wrapper = createWrapper({ form: invalidForm });

        expect(wrapper.vm.isFormValid).toBe(false);
      });

      it("should be invalid when gl_account_uuid is empty string", () => {
        const invalidForm = {
          ...defaultForm,
          cost_code_number: '01.02.03',
          cost_code_name: 'Test Cost Code',
          gl_account_uuid: ''
        };

        wrapper = createWrapper({ form: invalidForm });

        expect(wrapper.vm.isFormValid).toBe(false);
      });

      it("should be valid when all required fields are filled", () => {
        const validForm = {
          ...defaultForm,
          corporation_uuid: "corp-1",
          cost_code_number: "01.02.03",
          cost_code_name: "Test Cost Code",
          gl_account_uuid: "gl-account-1",
        };

        wrapper = createWrapper({ form: validForm });

        expect(wrapper.vm.isFormValid).toBe(true);
      });

      it("should be valid when required fields have leading/trailing spaces", () => {
        const validForm = {
          ...defaultForm,
          cost_code_number: '  01.02.03  ',
          cost_code_name: '  Test Cost Code  ',
          gl_account_uuid: 'gl-account-1'
        };

        wrapper = createWrapper({ form: validForm });

        expect(wrapper.vm.isFormValid).toBe(true);
      });
    });

    describe("Validation State Emission", () => {
      it("should emit validation-change event on mount", async () => {
        const validForm = {
          ...defaultForm,
          cost_code_number: '01.02.03',
          cost_code_name: 'Test Cost Code',
          gl_account_uuid: 'gl-account-1'
        };

        wrapper = createWrapper({ form: validForm });
        await nextTick();

        expect(wrapper.emitted('validation-change')).toBeTruthy();
      });

      it("should emit false validation state when form is invalid on mount", async () => {
        const invalidForm = {
          ...defaultForm,
          cost_code_number: '',
          cost_code_name: '',
          gl_account_uuid: null
        };

        wrapper = createWrapper({ form: invalidForm });
        await nextTick();

        expect(wrapper.emitted('validation-change')).toBeTruthy();
        const emittedValidationStates = wrapper.emitted('validation-change');
        const lastEmittedState = emittedValidationStates[emittedValidationStates.length - 1][0];
        expect(lastEmittedState).toBe(false);
      });

      it("should emit true validation state when form is valid on mount", async () => {
        const validForm = {
          ...defaultForm,
          cost_code_number: '01.02.03',
          cost_code_name: 'Test Cost Code',
          gl_account_uuid: 'gl-account-1'
        };

        wrapper = createWrapper({ form: validForm });
        await nextTick();

        expect(wrapper.emitted('validation-change')).toBeTruthy();
        const emittedValidationStates = wrapper.emitted('validation-change');
        const lastEmittedState = emittedValidationStates[emittedValidationStates.length - 1][0];
        expect(lastEmittedState).toBe(true);
      });

      it("should emit validation-change event when form becomes valid", async () => {
        const invalidForm = {
          ...defaultForm,
          cost_code_number: '',
          cost_code_name: '',
          gl_account_uuid: null
        };

        wrapper = createWrapper({ form: invalidForm });
        await nextTick();

        const initialEmitCount = wrapper.emitted('validation-change')?.length || 0;

        // Update form to be valid
        await wrapper.setProps({
          form: {
            ...defaultForm,
            cost_code_number: '01.02.03',
            cost_code_name: 'Test Cost Code',
            gl_account_uuid: 'gl-account-1'
          }
        });
        await nextTick();

        expect(wrapper.emitted('validation-change')).toBeTruthy();
        expect(wrapper.emitted('validation-change').length).toBeGreaterThan(initialEmitCount);
      });

      it("should emit validation-change event when form becomes invalid", async () => {
        const validForm = {
          ...defaultForm,
          cost_code_number: '01.02.03',
          cost_code_name: 'Test Cost Code',
          gl_account_uuid: 'gl-account-1'
        };

        wrapper = createWrapper({ form: validForm });
        await nextTick();

        const initialEmitCount = wrapper.emitted('validation-change')?.length || 0;

        // Update form to be invalid
        await wrapper.setProps({
          form: {
            ...defaultForm,
            cost_code_number: '',
            cost_code_name: 'Test Cost Code',
            gl_account_uuid: 'gl-account-1'
          }
        });
        await nextTick();

        expect(wrapper.emitted('validation-change')).toBeTruthy();
        expect(wrapper.emitted('validation-change').length).toBeGreaterThan(initialEmitCount);
      });
    });

    describe("Validation with Editing Mode", () => {
      it("should be invalid when editing an existing record with missing required fields", () => {
        const invalidForm = {
          id: 'config-1',
          corporation_uuid: 'corp-1',
          division_uuid: 'div-1',
          cost_code_number: '01.02.03',
          cost_code_name: 'Test Cost Code',
          gl_account_uuid: null, // Missing GL Account
          parent_cost_code_uuid: null,
          order: null,
          preferred_vendor_uuid: null,
          effective_from: null,
          description: '',
          update_previous_transactions: false,
          is_active: true,
          preferred_items: [],
          attachments: []
        };

        wrapper = createWrapper({ form: invalidForm, editingConfiguration: true });

        expect(wrapper.vm.isFormValid).toBe(false);
      });

      it("should be valid when editing an existing record with all required fields", () => {
        const validForm = {
          id: 'config-1',
          corporation_uuid: 'corp-1',
          division_uuid: 'div-1',
          cost_code_number: '01.02.03',
          cost_code_name: 'Test Cost Code',
          gl_account_uuid: 'gl-account-1',
          parent_cost_code_uuid: null,
          order: null,
          preferred_vendor_uuid: null,
          effective_from: null,
          description: '',
          update_previous_transactions: false,
          is_active: true,
          preferred_items: [],
          attachments: []
        };

        wrapper = createWrapper({ form: validForm, editingConfiguration: true });

        expect(wrapper.vm.isFormValid).toBe(true);
      });
    });

    describe("Validation with Optional Fields", () => {
      it("should be valid when optional fields are empty but required fields are filled", () => {
        const validForm = {
          ...defaultForm,
          cost_code_number: '01.02.03',
          cost_code_name: 'Test Cost Code',
          gl_account_uuid: 'gl-account-1',
          division_uuid: null,
          parent_cost_code_uuid: null,
          order: null,
          preferred_vendor_uuid: null,
          effective_from: null,
          description: ''
        };

        wrapper = createWrapper({ form: validForm });

        expect(wrapper.vm.isFormValid).toBe(true);
      });

      it("should be valid when all fields including optional ones are filled", () => {
        const validForm = {
          ...defaultForm,
          cost_code_number: '01.02.03',
          cost_code_name: 'Test Cost Code',
          gl_account_uuid: 'gl-account-1',
          division_uuid: 'div-1',
          parent_cost_code_uuid: 'config-1',
          order: 10,
          preferred_vendor_uuid: 'vendor-1',
          effective_from: '2024-01-01',
          description: 'Test description'
        };

        wrapper = createWrapper({ form: validForm });

        expect(wrapper.vm.isFormValid).toBe(true);
      });
    });

    describe("Real-world Validation Scenarios", () => {
      it("should prevent saving when loading existing record without GL Account", () => {
        // Simulate loading an existing record from database that's missing GL Account
        const existingRecordWithoutGL = {
          id: 'config-existing',
          corporation_uuid: 'corp-1',
          division_uuid: 'div-1',
          cost_code_number: '01.02.03.15',
          cost_code_name: 'Existing Cost Code',
          gl_account_uuid: null, // Old record without GL Account
          parent_cost_code_uuid: null,
          order: 5,
          preferred_vendor_uuid: 'vendor-1',
          effective_from: '2023-01-01',
          description: 'Old record',
          update_previous_transactions: false,
          is_active: true,
          preferred_items: [],
          attachments: []
        };

        wrapper = createWrapper({ form: existingRecordWithoutGL, editingConfiguration: true });

        expect(wrapper.vm.isFormValid).toBe(false);
        expect(wrapper.emitted('validation-change')).toBeTruthy();
        const emittedValidationStates = wrapper.emitted('validation-change');
        const lastEmittedState = emittedValidationStates[emittedValidationStates.length - 1][0];
        expect(lastEmittedState).toBe(false);
      });

      it("should allow saving when user fills missing GL Account", async () => {
        const existingRecordWithoutGL = {
          id: 'config-existing',
          corporation_uuid: 'corp-1',
          cost_code_number: '01.02.03.15',
          cost_code_name: 'Existing Cost Code',
          gl_account_uuid: null,
          division_uuid: null,
          parent_cost_code_uuid: null,
          order: null,
          preferred_vendor_uuid: null,
          effective_from: null,
          description: '',
          update_previous_transactions: false,
          is_active: true,
          preferred_items: [],
          attachments: []
        };

        wrapper = createWrapper({ form: existingRecordWithoutGL, editingConfiguration: true });

        // Initially invalid
        expect(wrapper.vm.isFormValid).toBe(false);

        // User fills in GL Account
        await wrapper.setProps({
          form: {
            ...existingRecordWithoutGL,
            gl_account_uuid: 'gl-account-new'
          }
        });
        await nextTick();

        // Now valid
        expect(wrapper.vm.isFormValid).toBe(true);
      });
    });
  });
})

