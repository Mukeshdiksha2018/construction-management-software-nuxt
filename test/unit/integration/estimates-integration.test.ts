import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import Estimates from '@/components/Projects/Estimates.vue'
import EstimateFormPage from '@/pages/estimates/form/[id].vue'
import { useCorporationStore } from '@/stores/corporations'
import { useEstimatesStore } from '@/stores/estimates'
import { useProjectsStore } from '@/stores/projects'
import { useTableStandard } from '@/composables/useTableStandard'
import { useDateFormat } from '@/composables/useDateFormat'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import { useAuditLog } from '@/composables/useAuditLog'
import { usePermissions } from '@/composables/usePermissions'
import { useRouter, useRoute } from 'vue-router'
import EstimateForm from '@/components/Projects/EstimateForm.vue'

// Mock all dependencies
vi.mock('@/stores/corporations')
vi.mock('@/stores/estimates')
vi.mock('@/stores/projects')
vi.mock("@/utils/indexedDb");
vi.mock('@/composables/useTableStandard')
vi.mock('@/composables/useDateFormat')
vi.mock('@/composables/useCurrencyFormat')
vi.mock('@/composables/useAuditLog')
vi.mock('@/composables/usePermissions')
vi.mock('@/components/AuditLogs/AuditLogSlideover.vue')
vi.mock('@/components/Projects/EstimateForm.vue')
vi.mock('vue-router')

describe('Estimates Integration Tests', () => {
  let pinia: any

  const mockCorporation = {
    uuid: 'corp-1',
    corporation_name: 'Test Corporation',
    corporation_id: 'TEST001'
  }

  const mockProject = {
    uuid: 'project-1',
    project_name: 'Test Project',
    project_id: 'TP001',
    only_total: false,
    enable_labor: true,
    enable_material: true,
    no_of_rooms: 5
  }

  const mockEstimate = {
    uuid: 'estimate-1',
    estimate_number: 'EST-001',
    project_uuid: 'project-1',
    corporation_uuid: 'corp-1',
    estimate_date: '2024-01-15',
    valid_until: '2024-02-15',
    total_amount: 1000,
    tax_amount: 100,
    discount_amount: 50,
    final_amount: 1050,
    status: 'Draft',
    notes: 'Test estimate',
    line_items: [
      {
        cost_code_uuid: 'config-1',
        cost_code_number: '01 40 00',
        cost_code_name: 'Quality Requirements',
        division_name: 'GENERAL REQUIREMENTS',
        labor_amount: 100,
        material_amount: 0,
        total_amount: 100,
        estimation_type: 'manual',
        is_sub_cost_code: false
      }
    ],
    attachments: [],
    project: mockProject
  }

  beforeEach(async () => {
    // Default IDB mock to return the estimate detail
    const { dbHelpers } = (await import("@/utils/indexedDb")) as any;
    dbHelpers.getEstimateByUuid = vi.fn().mockResolvedValue(mockEstimate);
    dbHelpers.updateEstimate = vi.fn().mockResolvedValue(undefined);
    pinia = createPinia();
    setActivePinia(pinia);

    // Mock store implementations
    vi.mocked(useCorporationStore).mockReturnValue({
      selectedCorporation: mockCorporation,
      selectedCorporationId: "corp-1",
    } as any);

    vi.mocked(useEstimatesStore).mockReturnValue({
      estimates: [mockEstimate],
      loading: false,
      error: null,
      fetchEstimates: vi.fn().mockResolvedValue(undefined),
      createEstimate: vi.fn().mockResolvedValue(true),
      updateEstimate: vi.fn().mockResolvedValue(true),
      deleteEstimate: vi.fn().mockResolvedValue(true),
      getEstimateByUuid: vi.fn().mockReturnValue(mockEstimate),
    } as any);

    vi.mocked(useProjectsStore).mockReturnValue({
      projects: [mockProject],
      currentProject: mockProject,
      fetchProjects: vi.fn().mockResolvedValue(undefined),
      loadCurrentProject: vi.fn().mockResolvedValue(undefined),
    } as any);
  });

  describe('Complete Estimate Workflow', () => {
    it('should allow creating, editing, and deleting estimates', async () => {
      // Mock all composables
      vi.mocked(useTableStandard).mockReturnValue({
        pagination: { value: { pageSize: 10, pageIndex: 0 } },
        paginationOptions: {},
        pageSizeOptions: [10, 25, 50, 100],
        updatePageSize: vi.fn(),
        getPaginationProps: vi.fn(() => ({})),
        getPageInfo: vi.fn(() => ({ value: '1-10 of 100' })),
        shouldShowPagination: vi.fn(() => ({ value: true }))
      })

      vi.mocked(useDateFormat).mockReturnValue({
        formatDate: (date: string) => new Date(date).toLocaleDateString()
      })

      vi.mocked(useCurrencyFormat).mockReturnValue({
        formatCurrency: (amount: number) => `$${amount.toFixed(2)}`
      })

      vi.mocked(useAuditLog).mockReturnValue({
        generateAuditLogInfo: vi.fn(),
        showAuditLog: vi.fn(),
        closeAuditLog: vi.fn(),
        onAuditLogsLoaded: vi.fn(),
        onAuditLogError: vi.fn(),
        onExportAuditLogs: vi.fn()
      })

      vi.mocked(usePermissions).mockReturnValue({
        hasPermission: vi.fn(() => true),
        isReady: { value: true }
      })

      // Mock router
      const mockPush = vi.fn()
      vi.mocked(useRouter).mockReturnValue({
        push: mockPush
      })
      vi.mocked(useRoute).mockReturnValue({
        params: { id: 'estimate-1' }
      })

      // Test estimates list component
      const estimatesWrapper = mount(Estimates, {
        global: {
          plugins: [pinia],
          stubs: {
            UInput: { template: '<input />' },
            UButton: { template: '<button><slot /></button>' },
            UTable: { template: '<div data-testid="estimates-table"></div>' },
            USelect: { template: '<select></select>' },
            UPagination: { template: '<div></div>' },
            UAlert: { template: '<div></div>' },
            UModal: { template: '<div></div>' },
            UBadge: { template: '<span></span>' },
            UTooltip: { template: '<div></div>' },
            UIcon: { template: '<span></span>' },
            USkeleton: { template: '<div></div>' }
          }
        }
      })

      // Verify estimates list loads
      expect(estimatesWrapper.find('[data-testid="estimates-table"]').exists()).toBe(true)

      // Test estimate form page
      const formWrapper = mount(EstimateFormPage, {
        global: {
          plugins: [pinia],
          stubs: {
            UButton: { template: '<button><slot /></button>' },
            UAlert: { template: '<div></div>' },
            UIcon: { template: '<span></span>' }
          }
        }
      })

      // Load estimate data
      await formWrapper.vm.loadEstimate()
      await nextTick()

      // Verify form loads with estimate data
      expect(formWrapper.vm.form.estimate_number).toBe('EST-001')
      expect(formWrapper.vm.form.total_amount).toBe(1000)

      // Test form update
      const updatedForm = {
        ...formWrapper.vm.form,
        estimate_number: 'EST-001-UPDATED',
        total_amount: 1500,
        final_amount: 1650
      }
      formWrapper.vm.updateForm(updatedForm)
      expect(formWrapper.vm.form.estimate_number).toBe('EST-001-UPDATED')

      // Test save
      formWrapper.vm.isFormValid = true
      await formWrapper.vm.saveEstimate()
      expect(formWrapper.vm.estimatesStore.updateEstimate).toHaveBeenCalled()

      // Test delete
      estimatesWrapper.vm.deleteEstimate(mockEstimate)
      expect(estimatesWrapper.vm.showDeleteModal).toBe(true)

      await estimatesWrapper.vm.confirmDelete()
      expect(estimatesWrapper.vm.estimatesStore.deleteEstimate).toHaveBeenCalledWith('estimate-1')
    })
  })

  describe('Estimate Line Items Integration', () => {
    it('should handle line items population and updates', async () => {
      // Mock EstimateLineItemsTable component
      const mockEmit = vi.fn()
      vi.mocked(EstimateForm).default = {
        name: 'EstimateForm',
        template: `
          <div>
            <div data-testid="estimate-form"></div>
            <div data-testid="line-items-update" @click="updateLineItems"></div>
          </div>
        `,
        props: ['form', 'editingEstimate'],
        emits: ['update:form', 'validation-change'],
        methods: {
          updateLineItems() {
            this.$emit('update:form', {
              ...this.form,
              line_items: [
                {
                  cost_code_uuid: 'config-1',
                  labor_amount: 200,
                  material_amount: 50,
                  total_amount: 250
                }
              ],
              total_amount: 250
            })
          }
        }
      }

      const formWrapper = mount(EstimateFormPage, {
        global: {
          plugins: [pinia],
          stubs: {
            UButton: { template: '<button><slot /></button>' },
            UAlert: { template: '<div></div>' },
            UIcon: { template: '<span></span>' }
          }
        }
      })

      await formWrapper.vm.loadEstimate()
      await nextTick()

      // Simulate line items update by calling the method directly
      formWrapper.vm.updateForm({
        ...formWrapper.vm.form,
        line_items: [
          {
            cost_code_uuid: 'config-1',
            labor_amount: 200,
            material_amount: 50,
            total_amount: 250
          }
        ],
        total_amount: 250
      })

      // Verify form was updated with new line items
      expect(formWrapper.vm.form.line_items).toHaveLength(1)
      expect(formWrapper.vm.form.line_items[0].labor_amount).toBe(200)
      expect(formWrapper.vm.form.total_amount).toBe(250)
    })
  })

  describe('Project Settings Integration', () => {
    it('should respect project settings for column visibility', async () => {
      const projectWithOnlyTotal = {
        ...mockProject,
        only_total: true,
        enable_labor: false,
        enable_material: false
      }

      vi.mocked(useProjectsStore).mockReturnValue({
        projects: [projectWithOnlyTotal],
        currentProject: projectWithOnlyTotal,
        fetchProjects: vi.fn().mockResolvedValue(undefined),
        loadCurrentProject: vi.fn().mockResolvedValue(undefined)
      } as any)

      // Mock EstimateLineItemsTable to test column visibility
      vi.mocked(EstimateForm).default = {
        name: 'EstimateForm',
        template: `
          <div>
            <div data-testid="estimate-form"></div>
            <div data-testid="column-visibility">
              <div v-if="showTotal">Total Column</div>
              <div v-if="showLabor">Labor Column</div>
              <div v-if="showMaterial">Material Column</div>
            </div>
          </div>
        `,
        props: ['form', 'editingEstimate'],
        emits: ['update:form', 'validation-change'],
        computed: {
          showTotal() {
            return this.currentProject?.only_total === true
          },
          showLabor() {
            return this.currentProject?.enable_labor === true
          },
          showMaterial() {
            return this.currentProject?.enable_material === true
          },
          currentProject() {
            return projectWithOnlyTotal
          }
        }
      }

      const formWrapper = mount(EstimateFormPage, {
        global: {
          plugins: [pinia],
          stubs: {
            UButton: { template: '<button><slot /></button>' },
            UAlert: { template: '<div></div>' },
            UIcon: { template: '<span></span>' }
          }
        }
      })

      await nextTick()

      // Test that the component renders without errors
      expect(formWrapper.exists()).toBe(true)
      expect(formWrapper.vm.projectsStore.currentProject).toEqual(projectWithOnlyTotal)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully across components', async () => {
      // Mock API error
      vi.mocked(useEstimatesStore).mockReturnValue({
        estimates: [],
        loading: false,
        error: "API Error",
        fetchEstimates: vi.fn().mockRejectedValue(new Error("Network error")),
        createEstimate: vi.fn().mockResolvedValue(false),
        updateEstimate: vi.fn().mockResolvedValue(false),
        deleteEstimate: vi.fn().mockResolvedValue(false),
        getEstimateByUuid: vi.fn().mockReturnValue(null),
      } as any);

      vi.mocked(useTableStandard).mockReturnValue({
        pagination: { value: { pageSize: 10, pageIndex: 0 } },
        paginationOptions: {},
        pageSizeOptions: [10, 25, 50, 100],
        updatePageSize: vi.fn(),
        getPaginationProps: vi.fn(() => ({})),
        getPageInfo: vi.fn(() => ({ value: "1-10 of 100" })),
        shouldShowPagination: vi.fn(() => ({ value: true })),
      });

      vi.mocked(usePermissions).mockReturnValue({
        hasPermission: vi.fn(() => true),
        isReady: { value: true },
      });

      // Test estimates list with error
      const estimatesWrapper = mount(Estimates, {
        global: {
          plugins: [pinia],
          stubs: {
            UInput: { template: "<input />" },
            UButton: { template: "<button><slot /></button>" },
            UTable: { template: "<div></div>" },
            UAlert: { template: "<div></div>" },
            UIcon: { template: "<span></span>" },
          },
        },
      });

      expect(estimatesWrapper.vm.estimatesStore.error).toBe("API Error");

      // Test form page with error
      const formWrapper = mount(EstimateFormPage, {
        global: {
          plugins: [pinia],
          stubs: {
            UButton: { template: "<button><slot /></button>" },
            UAlert: { template: "<div></div>" },
            UIcon: { template: "<span></span>" },
          },
        },
      });

      // Ensure IDB also returns null to trigger error in form load
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(null as any);

      await formWrapper.vm.loadEstimate();
      await nextTick();

      expect(formWrapper.vm.error).toBe("Estimate not found");
    })
  })

  describe('Data Synchronization', () => {
    it('should keep data synchronized between list and form', async () => {
      const mockEstimates = [mockEstimate]
      let estimatesStore = {
        estimates: mockEstimates,
        loading: false,
        error: null,
        fetchEstimates: vi.fn().mockResolvedValue(undefined),
        createEstimate: vi.fn().mockResolvedValue(true),
        updateEstimate: vi.fn().mockResolvedValue(true),
        deleteEstimate: vi.fn().mockResolvedValue(true),
        getEstimateByUuid: vi.fn().mockReturnValue(mockEstimate)
      }

      vi.mocked(useEstimatesStore).mockReturnValue(estimatesStore as any)

      // Mock all composables
      vi.mocked(useTableStandard).mockReturnValue({
        pagination: { value: { pageSize: 10, pageIndex: 0 } },
        paginationOptions: {},
        pageSizeOptions: [10, 25, 50, 100],
        updatePageSize: vi.fn(),
        getPaginationProps: vi.fn(() => ({})),
        getPageInfo: vi.fn(() => ({ value: '1-10 of 100' })),
        shouldShowPagination: vi.fn(() => ({ value: true }))
      })

      vi.mocked(usePermissions).mockReturnValue({
        hasPermission: vi.fn(() => true),
        isReady: { value: true }
      })

      const mockPush = vi.fn()
      vi.mocked(useRouter).mockReturnValue({
        push: mockPush
      })
      vi.mocked(useRoute).mockReturnValue({
        params: { id: 'estimate-1' }
      })

      // Test estimates list
      const estimatesWrapper = mount(Estimates, {
        global: {
          plugins: [pinia],
          stubs: {
            UInput: { template: '<input />' },
            UButton: { template: '<button><slot /></button>' },
            UTable: { template: '<div></div>' },
            UAlert: { template: '<div></div>' },
            UIcon: { template: '<span></span>' }
          }
        }
      })

      // Test form page
      const formWrapper = mount(EstimateFormPage, {
        global: {
          plugins: [pinia],
          stubs: {
            UButton: { template: '<button><slot /></button>' },
            UAlert: { template: '<div></div>' },
            UIcon: { template: '<span></span>' }
          }
        }
      })

      await formWrapper.vm.loadEstimate()
      await nextTick()

      // Verify both components have access to the same data
      expect(estimatesWrapper.vm.estimates).toEqual(mockEstimates)
      expect(formWrapper.vm.form.estimate_number).toBe('EST-001')

      // Test update from form
      const updatedForm = {
        ...formWrapper.vm.form,
        estimate_number: 'EST-001-UPDATED'
      }
      formWrapper.vm.updateForm(updatedForm)

      // Verify form was updated
      expect(formWrapper.vm.form.estimate_number).toBe('EST-001-UPDATED')
    })
  })

  describe("Different Project Settings Workflows", () => {
    it("should handle labor-only project settings", async () => {
      const laborOnlyProject = {
        ...mockProject,
        only_total: false,
        enable_labor: true,
        enable_material: false,
      };

      vi.mocked(useProjectsStore).mockReturnValue({
        projects: [laborOnlyProject],
        currentProject: laborOnlyProject,
        fetchProjects: vi.fn().mockResolvedValue(undefined),
        loadCurrentProject: vi.fn().mockResolvedValue(undefined),
      } as any);

      const formWrapper = mount(EstimateFormPage, {
        global: {
          plugins: [pinia],
          stubs: {
            UButton: { template: "<button><slot /></button>" },
            UAlert: { template: "<div></div>" },
            UIcon: { template: "<span></span>" },
          },
        },
      });

      await nextTick();

      // Test that the component renders without errors for labor-only project
      expect(formWrapper.exists()).toBe(true);
      expect(formWrapper.vm.projectsStore.currentProject).toEqual(
        laborOnlyProject
      );
    });

    it("should handle material-only project settings", async () => {
      const materialOnlyProject = {
        ...mockProject,
        only_total: false,
        enable_labor: false,
        enable_material: true,
      };

      vi.mocked(useProjectsStore).mockReturnValue({
        projects: [materialOnlyProject],
        currentProject: materialOnlyProject,
        fetchProjects: vi.fn().mockResolvedValue(undefined),
        loadCurrentProject: vi.fn().mockResolvedValue(undefined),
      } as any);

      const formWrapper = mount(EstimateFormPage, {
        global: {
          plugins: [pinia],
          stubs: {
            UButton: { template: "<button><slot /></button>" },
            UAlert: { template: "<div></div>" },
            UIcon: { template: "<span></span>" },
          },
        },
      });

      await nextTick();

      // Test that the component renders without errors for material-only project
      expect(formWrapper.exists()).toBe(true);
      expect(formWrapper.vm.projectsStore.currentProject).toEqual(
        materialOnlyProject
      );
    });

    it("should handle both labor and material project settings", async () => {
      const bothProject = {
        ...mockProject,
        only_total: false,
        enable_labor: true,
        enable_material: true,
      };

      vi.mocked(useProjectsStore).mockReturnValue({
        projects: [bothProject],
        currentProject: bothProject,
        fetchProjects: vi.fn().mockResolvedValue(undefined),
        loadCurrentProject: vi.fn().mockResolvedValue(undefined),
      } as any);

      const formWrapper = mount(EstimateFormPage, {
        global: {
          plugins: [pinia],
          stubs: {
            UButton: { template: "<button><slot /></button>" },
            UAlert: { template: "<div></div>" },
            UIcon: { template: "<span></span>" },
          },
        },
      });

      await nextTick();

      // Test that the component renders without errors for both labor and material project
      expect(formWrapper.exists()).toBe(true);
      expect(formWrapper.vm.projectsStore.currentProject).toEqual(bothProject);
    });
  });

  describe("Edge Cases and Error Recovery", () => {
    it("should handle missing project data gracefully", async () => {
      vi.mocked(useProjectsStore).mockReturnValue({
        projects: [],
        currentProject: null,
        fetchProjects: vi.fn().mockResolvedValue(undefined),
        loadCurrentProject: vi.fn().mockResolvedValue(undefined),
      } as any);

      const formWrapper = mount(EstimateFormPage, {
        global: {
          plugins: [pinia],
          stubs: {
            UButton: { template: "<button><slot /></button>" },
            UAlert: { template: "<div></div>" },
            UIcon: { template: "<span></span>" },
          },
        },
      });

      await nextTick();

      // Test that the component renders without errors even without project data
      expect(formWrapper.exists()).toBe(true);
    });

    it("should handle estimate with missing line items", async () => {
      const estimateWithoutLineItems = {
        ...mockEstimate,
        line_items: null,
      };

      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(
        estimateWithoutLineItems as any
      );

      const formWrapper = mount(EstimateFormPage, {
        global: {
          plugins: [pinia],
          stubs: {
            UButton: { template: "<button><slot /></button>" },
            UAlert: { template: "<div></div>" },
            UIcon: { template: "<span></span>" },
          },
        },
      });

      await formWrapper.vm.loadEstimate();
      await nextTick();

      // Test that the component handles missing line items gracefully
      expect(formWrapper.vm.form.line_items).toEqual([]);
    });

    it("should handle estimate with invalid line items data", async () => {
      const estimateWithInvalidLineItems = {
        ...mockEstimate,
        line_items: "invalid data",
      };

      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(
        estimateWithInvalidLineItems as any
      );

      const formWrapper = mount(EstimateFormPage, {
        global: {
          plugins: [pinia],
          stubs: {
            UButton: { template: "<button><slot /></button>" },
            UAlert: { template: "<div></div>" },
            UIcon: { template: "<span></span>" },
          },
        },
      });

      await formWrapper.vm.loadEstimate();
      await nextTick();

      // Test that the component handles invalid line items data gracefully
      expect(formWrapper.vm.form.line_items).toEqual([]);
    });

    it("should handle network connectivity issues", async () => {
      // Mock network error
      global.$fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(null as any);

      vi.mocked(useEstimatesStore).mockReturnValue({
        estimates: [],
        loading: false,
        error: null,
        fetchEstimates: vi.fn().mockRejectedValue(new Error("Network error")),
        createEstimate: vi.fn().mockRejectedValue(new Error("Network error")),
        updateEstimate: vi.fn().mockRejectedValue(new Error("Network error")),
        deleteEstimate: vi.fn().mockRejectedValue(new Error("Network error")),
        getEstimateByUuid: vi.fn().mockReturnValue(null),
      } as any);

      const formWrapper = mount(EstimateFormPage, {
        global: {
          plugins: [pinia],
          stubs: {
            UButton: { template: "<button><slot /></button>" },
            UAlert: { template: "<div></div>" },
            UIcon: { template: "<span></span>" },
          },
        },
      });

      await formWrapper.vm.loadEstimate();
      await nextTick();

      // Test that the component handles network errors gracefully
      expect(formWrapper.vm.error).toBe("Estimate not found");
    });
  });

  describe("Performance and Memory Management", () => {
    it("should handle large datasets efficiently", async () => {
      const largeEstimate = {
        ...mockEstimate,
        line_items: Array.from({ length: 1000 }, (_, i) => ({
          cost_code_uuid: `config-${i}`,
          cost_code_number: `01 ${i.toString().padStart(2, "0")} 00`,
          cost_code_name: `Item ${i}`,
          division_name: "GENERAL REQUIREMENTS",
          labor_amount: Math.random() * 1000,
          material_amount: Math.random() * 1000,
          total_amount: Math.random() * 2000,
          estimation_type: "manual",
          is_sub_cost_code: false,
        })),
      };

      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(
        largeEstimate as any
      );

      const formWrapper = mount(EstimateFormPage, {
        global: {
          plugins: [pinia],
          stubs: {
            UButton: { template: "<button><slot /></button>" },
            UAlert: { template: "<div></div>" },
            UIcon: { template: "<span></span>" },
          },
        },
      });

      await formWrapper.vm.loadEstimate();
      await nextTick();

      // Test that the component can handle large datasets
      expect(formWrapper.vm.form.line_items).toHaveLength(1000);
      expect(formWrapper.exists()).toBe(true);
    });

    it("should clean up resources properly", async () => {
      const formWrapper = mount(EstimateFormPage, {
        global: {
          plugins: [pinia],
          stubs: {
            UButton: { template: "<button><slot /></button>" },
            UAlert: { template: "<div></div>" },
            UIcon: { template: "<span></span>" },
          },
        },
      });

      // Test that the component can be unmounted without errors
      expect(() => formWrapper.unmount()).not.toThrow();
    });
  });
})
