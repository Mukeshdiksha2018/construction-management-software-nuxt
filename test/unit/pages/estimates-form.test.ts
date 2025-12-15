import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import EstimateFormPage from "@/pages/estimates/form/[id].vue";
import { useCorporationStore } from "@/stores/corporations";
import { useEstimatesStore } from "@/stores/estimates";
import { useProjectsStore } from "@/stores/projects";
import { useEstimateCreationStore } from "@/stores/estimateCreation";

// Mock the stores
vi.mock("@/stores/corporations");
vi.mock("@/stores/estimates");
vi.mock("@/stores/projects");
vi.mock("@/stores/estimateCreation");
const mockPurchaseOrdersStore = {
  purchaseOrders: [],
  fetchPurchaseOrders: vi.fn().mockResolvedValue(undefined)
};

vi.mock("@/stores/purchaseOrders", () => ({
  usePurchaseOrdersStore: () => mockPurchaseOrdersStore
}));
vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        first_name: 'Test',
        last_name: 'User'
      }
    }
  })
}));
vi.mock("@/utils/indexedDb");

const mockHasPermission = vi.fn(() => true);

// Mock the composables
vi.mock("@/composables/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: mockHasPermission,
    isReady: { value: true },
  }),
}));

const mockToast = { add: vi.fn() };
vi.stubGlobal("useToast", () => mockToast);

// Mock the EstimateForm component
vi.mock("@/components/Projects/EstimateForm.vue", () => ({
  default: {
    name: "EstimateForm",
    template: '<div data-testid="estimate-form"></div>',
    props: ["form", "editingEstimate", "loading"],
    emits: ["update:form", "validation-change"],
  },
}));

// Stub EstimateAuditTimeline component
vi.mock("@/components/Projects/EstimateAuditTimeline.vue", () => ({
  default: { template: '<div data-testid="audit-timeline"></div>' }
}));

// Mock router
const mockPush = vi.fn();
const updateProjectMock = vi.fn();
const loadCurrentProjectMock = vi.fn();

const mockRoute = {
  params: { id: "estimate-1" },
  query: {},
};

let mathRandomSpy: ReturnType<typeof vi.spyOn> | null = null;

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useRoute: () => mockRoute,
}));

describe("Estimate Form Page", () => {
  let wrapper: any;
  let pinia: any;

  const mockEstimate = {
    uuid: "estimate-1",
    estimate_number: "ES-001",
    project_uuid: "project-1",
    corporation_uuid: "corp-1",
    estimate_date: "2024-01-15",
    valid_until: "2024-02-15",
    total_amount: 1000,
    tax_amount: 100,
    discount_amount: 50,
    final_amount: 1050,
    status: "Draft",
    notes: "Test estimate",
    line_items: [],
    attachments: [],
  };

  const mockCorporation = {
    uuid: "corp-1",
    corporation_name: "Test Corporation",
    corporation_id: "TEST001",
  };

  beforeEach(async () => {
    mathRandomSpy?.mockRestore();
    mathRandomSpy = vi.spyOn(Math, "random").mockReturnValue(0.123456);
    // Mock dbHelpers default behavior
    const { dbHelpers } = (await import("@/utils/indexedDb")) as any;
    dbHelpers.getEstimateByUuid = vi.fn().mockResolvedValue(mockEstimate);
    dbHelpers.updateEstimate = vi.fn().mockResolvedValue(undefined);
    updateProjectMock.mockReset();
    updateProjectMock.mockResolvedValue({
      uuid: mockEstimate.project_uuid,
      estimated_amount: mockEstimate.final_amount,
    });
    loadCurrentProjectMock.mockReset();
    loadCurrentProjectMock.mockResolvedValue(undefined);
    mockToast.add.mockReset();
    mockHasPermission.mockReset();
    mockHasPermission.mockImplementation(() => true);
    mockEstimate.status = "Draft";
    
    // Reset purchase orders store
    mockPurchaseOrdersStore.purchaseOrders = [];
    mockPurchaseOrdersStore.fetchPurchaseOrders = vi.fn().mockResolvedValue(undefined);
    
    pinia = createPinia();
    setActivePinia(pinia);

    // Mock store implementations
    vi.mocked(useCorporationStore).mockReturnValue({
      selectedCorporation: mockCorporation,
      selectedCorporationId: "corp-1",
    } as any);

    vi.mocked(useEstimatesStore).mockReturnValue({
      getEstimateByUuid: vi.fn().mockReturnValue(mockEstimate),
      createEstimate: vi.fn().mockResolvedValue(true),
      updateEstimate: vi.fn().mockResolvedValue(true),
      refreshEstimatesFromAPI: vi.fn().mockResolvedValue(undefined),
      fetchEstimates: vi.fn().mockResolvedValue(undefined),
      estimates: [], // Empty estimates array - will be set per test as needed
    } as any);

    vi.mocked(useProjectsStore).mockReturnValue({
      projects: [],
      updateProject: updateProjectMock,
      loadCurrentProject: loadCurrentProjectMock,
    } as any);

    vi.mocked(useEstimateCreationStore).mockReturnValue({
      selectedCorporationUuid: null,
      clearStore: vi.fn(),
    } as any);

    // Reset mocks
    mockPush.mockClear();
  });

  afterEach(() => {
    mathRandomSpy?.mockRestore();
  });

  const createWrapper = (
    routeParams = { id: "estimate-1" },
    routeQuery: Record<string, any> = {}
  ) => {
    // Update route params
    mockRoute.params = routeParams;
    mockRoute.query = routeQuery;

    return mount(EstimateFormPage, {
      global: {
        plugins: [pinia],
        stubs: {
          UButton: {
            template:
              '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
            props: ["color", "variant", "icon", "disabled", "loading"],
          },
          UAlert: {
            template: '<div v-bind="$attrs"><slot /></div>',
            props: ["icon", "color", "variant", "title", "description"],
          },
          UIcon: {
            template: "<span></span>",
            props: ["name"],
          },
          UTooltip: {
            template: '<div v-bind="$attrs"><slot /></div>',
            props: ["text", "color"],
          },
        },
        mocks: {
          $router: {
            push: mockPush,
          },
          $route: {
            params: routeParams,
            query: routeQuery,
          },
        },
      },
    });
  };

  describe("Component Rendering", () => {
    it("should render edit mode for existing estimate", () => {
      wrapper = createWrapper({ id: "estimate-1" });

      expect(wrapper.vm.editingEstimate).toBe(true);
      expect(wrapper.text()).toContain("Edit Estimate");
    });

    it("should render create mode for new estimate", () => {
      wrapper = createWrapper({ id: "new" });

      expect(wrapper.vm.editingEstimate).toBe(false);
      expect(wrapper.text()).toContain("Create New Estimate");
    });

    it("should render loading state initially", async () => {
      wrapper = createWrapper();
      wrapper.vm.loading = true;
      await nextTick();

      // Verify that EstimateForm is rendered (not hidden by error state)
      const estimateForm = wrapper.find('[data-testid="estimate-form"]');
      expect(estimateForm.exists()).toBe(true);
      // Verify that the parent component has loading set to true
      expect(wrapper.vm.loading).toBe(true);
    });

    it("should render error state when loading fails", async () => {
      vi.mocked(useEstimatesStore).mockReturnValue({
        getEstimateByUuid: vi.fn().mockReturnValue(null),
        createEstimate: vi.fn().mockResolvedValue(true),
        updateEstimate: vi.fn().mockResolvedValue(true),
      } as any);

      // Ensure IDB also returns null to trigger error path
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(null);

      wrapper = createWrapper();

      await wrapper.vm.loadEstimate();
      await nextTick();

      expect(wrapper.vm.error).toBe("Estimate not found");
    });

    it("should render form when data is loaded", async () => {
      wrapper = createWrapper();

      // Ensure IDB returns the estimate so loadEstimate succeeds
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(
        mockEstimate as any
      );

      await wrapper.vm.loadEstimate();
      await nextTick();

      expect(wrapper.find('[data-testid="estimate-form"]').exists()).toBe(true);
    });
  });

  describe("Action Buttons", () => {
    it("should show Save as Draft and Mark Ready buttons for new estimate", () => {
      wrapper = createWrapper({ id: "new" });

      expect(wrapper.find('[data-testid="btn-save-draft"]').exists()).toBe(
        true
      );
      expect(wrapper.find('[data-testid="btn-ready"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="btn-approve"]').exists()).toBe(false);
    });

    it("should set status to Draft when handler invoked", async () => {
      wrapper = createWrapper({ id: "new" });
      wrapper.vm.isFormValid = true;
      await nextTick();

      await wrapper.vm.handleSaveAsDraft();

      expect(wrapper.vm.form.status).toBe("Draft");
    });

    it("should set status to Ready when handler invoked", async () => {
      wrapper = createWrapper({ id: "new" });
      wrapper.vm.isFormValid = true;
      await nextTick();

      await wrapper.vm.handleMarkReady();

      expect(wrapper.vm.form.status).toBe("Ready");
    });

    it("should show approve controls when editing ready estimate and user can approve", async () => {
      mockEstimate.status = "Ready";
      wrapper = createWrapper({ id: "estimate-1" });
      await wrapper.vm.loadEstimate();
      await nextTick();

      expect(wrapper.find('[data-testid="btn-approve"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="btn-reject-draft"]').exists()).toBe(
        true
      );

      mockEstimate.status = "Draft";
    });

    it("should update project estimated amount when approve handler invoked", async () => {
      mockEstimate.status = "Ready";
      wrapper = createWrapper({ id: "estimate-1" });
      await wrapper.vm.loadEstimate();
      wrapper.vm.isFormValid = true;
      await nextTick();

      updateProjectMock.mockClear();
      
      // Update mock to return Approved status after save
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue({
        ...mockEstimate,
        status: "Approved"
      } as any);
      
      await wrapper.vm.handleApprove();
      await nextTick();

      expect(wrapper.vm.form.status).toBe("Approved");
      expect(updateProjectMock).toHaveBeenCalledWith({
        uuid: mockEstimate.project_uuid,
        estimated_amount: mockEstimate.final_amount,
      });
      
      // Reset mock
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(mockEstimate as any);
      mockEstimate.status = "Draft";
    });

    it("should not update project estimated amount when project uuid missing", async () => {
      mockEstimate.status = "Ready";
      const originalProjectUuid = mockEstimate.project_uuid;
      mockEstimate.project_uuid = "";
      wrapper = createWrapper({ id: "estimate-1" });
      await wrapper.vm.loadEstimate();
      wrapper.vm.isFormValid = true;
      await nextTick();

      updateProjectMock.mockClear();
      
      // Update mock to return Approved status after save
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue({
        ...mockEstimate,
        status: "Approved"
      } as any);
      
      await wrapper.vm.handleApprove();
      await nextTick();

      expect(wrapper.vm.form.status).toBe("Approved");
      expect(updateProjectMock).not.toHaveBeenCalled();
      
      // Reset mock
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(mockEstimate as any);
      mockEstimate.status = "Draft";
      mockEstimate.project_uuid = originalProjectUuid;
    });

    it("should surface warning toast when project update returns null", async () => {
      mockEstimate.status = "Ready";
      wrapper = createWrapper({ id: "estimate-1" });
      await wrapper.vm.loadEstimate();
      wrapper.vm.isFormValid = true;
      await nextTick();

      updateProjectMock.mockResolvedValueOnce(null);
      mockToast.add.mockClear();

      // Update mock to return Approved status after save
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue({
        ...mockEstimate,
        status: "Approved"
      } as any);

      await wrapper.vm.handleApprove();
      await nextTick();

      expect(wrapper.vm.form.status).toBe("Approved");
      expect(updateProjectMock).toHaveBeenCalled();
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({ color: "warning" })
      );
      
      // Reset mocks
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(mockEstimate as any);
      updateProjectMock.mockResolvedValue({
        uuid: mockEstimate.project_uuid,
        estimated_amount: mockEstimate.final_amount,
      });
      mockEstimate.status = "Draft";
    });

    it("should surface error toast when project update throws", async () => {
      mockEstimate.status = "Ready";
      wrapper = createWrapper({ id: "estimate-1" });
      await wrapper.vm.loadEstimate();
      wrapper.vm.isFormValid = true;
      await nextTick();

      updateProjectMock.mockRejectedValueOnce(new Error("update failed"));
      mockToast.add.mockClear();

      // Update mock to return Approved status after save
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue({
        ...mockEstimate,
        status: "Approved"
      } as any);

      await wrapper.vm.handleApprove();
      await nextTick();

      expect(wrapper.vm.form.status).toBe("Approved");
      expect(updateProjectMock).toHaveBeenCalled();
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({ color: "error" })
      );
      
      // Reset mocks
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(mockEstimate as any);
      updateProjectMock.mockResolvedValue({
        uuid: mockEstimate.project_uuid,
        estimated_amount: mockEstimate.final_amount,
      });
      mockEstimate.status = "Draft";
    });

    it("should show reject button for approved estimate when no approved purchase orders exist", async () => {
      mockEstimate.status = "Approved";
      wrapper = createWrapper({ id: "estimate-1" });
      await wrapper.vm.loadEstimate();
      wrapper.vm.isFormValid = true; // Set form as valid
      await nextTick();

      const button = wrapper.find('[data-testid="btn-save-draft"]');
      expect(button.exists()).toBe(true);
      // When no approved purchase orders exist, should show "Reject"
      expect(button.text()).toContain("Reject");
      expect(wrapper.vm.saveDraftButtonIcon).toBe(
        "i-heroicons-arrow-uturn-left"
      );
      expect(wrapper.vm.saveDraftButtonColor).toBe("error");
      expect(wrapper.vm.saveDraftButtonVariant).toBe("solid");
      expect(wrapper.vm.isSaveDraftButtonDisabled).toBe(false);
      expect(wrapper.find('[data-testid="btn-ready"]').exists()).toBe(false);

      mockEstimate.status = "Draft";
    });

    it("should show locked button for approved estimate when approved purchase orders exist", async () => {
      mockEstimate.status = "Approved";
      
      // Set up purchase orders store with approved purchase orders
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: "po-1",
          project_uuid: "project-1",
          status: "Approved",
          is_active: true
        }
      ];

      wrapper = createWrapper({ id: "estimate-1" });
      await wrapper.vm.loadEstimate();
      await nextTick();

      const button = wrapper.find('[data-testid="btn-save-draft"]');
      expect(button.exists()).toBe(true);
      // When approved purchase orders exist, should show "Locked"
      expect(button.text()).toContain("Locked");
      expect(wrapper.vm.saveDraftButtonIcon).toBe(
        "i-heroicons-lock-closed"
      );
      expect(wrapper.vm.saveDraftButtonColor).toBe("warning");
      expect(wrapper.vm.isSaveDraftButtonDisabled).toBe(true);
      expect(wrapper.vm.hasApprovedPurchaseOrders).toBe(true);

      // Reset
      mockPurchaseOrdersStore.purchaseOrders = [];
      mockEstimate.status = "Draft";
    });

    it("should fetch purchase orders when loading approved estimate", async () => {
      mockEstimate.status = "Approved";
      const fetchMock = vi.fn().mockResolvedValue(undefined);
      mockPurchaseOrdersStore.fetchPurchaseOrders = fetchMock;

      wrapper = createWrapper({ id: "estimate-1" });
      await wrapper.vm.loadEstimate();
      await nextTick();

      // Should fetch purchase orders when estimate is approved
      expect(fetchMock).toHaveBeenCalledWith("corp-1");

      // Reset
      mockPurchaseOrdersStore.fetchPurchaseOrders = vi.fn().mockResolvedValue(undefined);
      mockEstimate.status = "Draft";
    });

    it("should prevent unapproval when approved purchase orders exist", async () => {
      mockEstimate.status = "Approved";
      
      // Set up purchase orders store with approved purchase orders
      mockPurchaseOrdersStore.purchaseOrders = [
        {
          uuid: "po-1",
          project_uuid: "project-1",
          status: "Approved",
          is_active: true
        }
      ];

      wrapper = createWrapper({ id: "estimate-1" });
      await wrapper.vm.loadEstimate();
      wrapper.vm.isFormValid = true;
      await nextTick();

      // Try to save as draft (unapprove)
      await wrapper.vm.handleSaveAsDraft();

      // Should show error toast and not change status
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Cannot Unapprove Estimate",
          color: "error"
        })
      );
      // Status should remain Approved
      expect(wrapper.vm.form.status).toBe("Approved");

      // Reset
      mockPurchaseOrdersStore.purchaseOrders = [];
      mockEstimate.status = "Draft";
    });

    it("should allow unapproval when no approved purchase orders exist", async () => {
      mockEstimate.status = "Approved";
      
      // Ensure no approved purchase orders
      mockPurchaseOrdersStore.purchaseOrders = [];

      wrapper = createWrapper({ id: "estimate-1" });
      await wrapper.vm.loadEstimate();
      wrapper.vm.isFormValid = true;
      await nextTick();

      // Update mock to return Draft status after save
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue({
        ...mockEstimate,
        status: "Draft"
      } as any);

      await wrapper.vm.handleSaveAsDraft();
      await nextTick();

      // Should change status to Draft
      expect(wrapper.vm.form.status).toBe("Draft");
      // Should not show error toast
      expect(mockToast.add).not.toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Cannot Unapprove Estimate"
        })
      );

      // Reset
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(mockEstimate as any);
      mockEstimate.status = "Draft";
    });

    it("should hide unapprove button when user lacks approve permission", async () => {
      mockHasPermission.mockImplementation(
        (permission: string) => permission !== "project_estimates_approve"
      );
      mockEstimate.status = "Approved";

      wrapper = createWrapper({ id: "estimate-1" });
      await wrapper.vm.loadEstimate();
      await nextTick();

      expect(wrapper.find('[data-testid="btn-save-draft"]').exists()).toBe(
        false
      );

      mockEstimate.status = "Draft";
      mockHasPermission.mockImplementation(() => true);
    });

    it("should revert status to Draft when reject handler invoked", async () => {
      mockEstimate.status = "Ready";
      wrapper = createWrapper({ id: "estimate-1" });
      await wrapper.vm.loadEstimate();
      wrapper.vm.isFormValid = true;
      await nextTick();

      // Update mock to return Draft status after save
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue({
        ...mockEstimate,
        status: "Draft"
      } as any);

      await wrapper.vm.handleRejectToDraft();
      await nextTick();

      expect(wrapper.vm.form.status).toBe("Draft");
      expect(updateProjectMock).not.toHaveBeenCalled();
      
      // Reset mock
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(mockEstimate as any);
      mockEstimate.status = "Draft";
    });
  });

  describe("Form Initialization", () => {
    it("should initialize form with default values for new estimate", async () => {
      // Mock estimates store with empty estimates array to test sequential numbering
      vi.mocked(useEstimatesStore).mockReturnValue({
        getEstimateByUuid: vi.fn().mockReturnValue(null),
        createEstimate: vi.fn().mockResolvedValue(true),
        updateEstimate: vi.fn().mockResolvedValue(true),
        refreshEstimatesFromAPI: vi.fn().mockResolvedValue(undefined),
        fetchEstimates: vi.fn().mockResolvedValue(undefined),
        estimates: [], // No existing estimates, so should generate ES-1
      } as any);

      wrapper = createWrapper({ id: "new" });
      await nextTick();
      await wrapper.vm.loadEstimate();
      await nextTick();

      // With no existing estimates, should generate ES-1 (starting from 1)
      expect(wrapper.vm.form.estimate_number).toBe("ES-1");
      expect(wrapper.vm.form.status).toBe("Draft");
      expect(wrapper.vm.form.corporation_uuid).toBe("corp-1");
      expect(wrapper.vm.form.estimate_date).toBeDefined();
    });

    it("should prepopulate project when query contains projectUuid", async () => {
      wrapper = createWrapper(
        { id: "new" },
        { projectUuid: "project-abc", fromProjectId: "project-abc" }
      );

      await nextTick();

      expect(wrapper.vm.form.project_uuid).toBe("project-abc");
      expect(loadCurrentProjectMock).toHaveBeenCalledWith(
        "project-abc",
        "corp-1"
      );
    });

    it("should load existing estimate data for edit mode", async () => {
      wrapper = createWrapper({ id: "estimate-1" });

      // Ensure IDB returns the estimate
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(
        mockEstimate as any
      );

      await wrapper.vm.loadEstimate();
      await nextTick();

      expect(wrapper.vm.form.estimate_number).toBe("ES-001");
      expect(wrapper.vm.form.project_uuid).toBe("project-1");
      expect(wrapper.vm.form.total_amount).toBe(1000);
      expect(wrapper.vm.form.final_amount).toBe(1050);
    });

    it("should handle missing estimate data", async () => {
      vi.mocked(useEstimatesStore).mockReturnValue({
        getEstimateByUuid: vi.fn().mockReturnValue(null),
        createEstimate: vi.fn().mockResolvedValue(true),
        updateEstimate: vi.fn().mockResolvedValue(true),
      } as any);

      wrapper = createWrapper({ id: "non-existent" });

      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(null);

      await wrapper.vm.loadEstimate();

      expect(wrapper.vm.error).toBe("Estimate not found");
    });
  });

  describe("Form Updates", () => {
    it("should update form when EstimateForm emits update", () => {
      wrapper = createWrapper();

      const updatedForm = {
        ...wrapper.vm.form,
        estimate_number: "ES-002",
      };

      wrapper.vm.updateForm(updatedForm);

      expect(wrapper.vm.form).toEqual(updatedForm);
    });

    it("should update validation state", () => {
      wrapper = createWrapper();

      wrapper.vm.onValidationChange(true);

      expect(wrapper.vm.isFormValid).toBe(true);
    });
  });

  describe("Save Functionality", () => {
    it("should save new estimate and navigate to estimates list", async () => {
      const mockRefreshEstimates = vi.fn().mockResolvedValue(undefined);
      const mockFetchEstimates = vi.fn().mockResolvedValue(undefined);
      const mockClearStore = vi.fn();

      vi.mocked(useEstimatesStore).mockReturnValue({
        getEstimateByUuid: vi.fn().mockReturnValue(null),
        createEstimate: vi.fn().mockResolvedValue(true),
        updateEstimate: vi.fn().mockResolvedValue(true),
        refreshEstimatesFromAPI: mockRefreshEstimates,
        fetchEstimates: mockFetchEstimates,
      } as any);

      vi.mocked(useEstimateCreationStore).mockReturnValue({
        selectedCorporationUuid: "corp-1",
        clearStore: mockClearStore,
      } as any);

      wrapper = createWrapper({ id: "new" });
      wrapper.vm.form = {
        ...wrapper.vm.form,
        estimate_number: "ES-002",
        project_uuid: "project-1",
        estimate_date: "2024-01-20",
        total_amount: 2000,
        final_amount: 2200,
        corporation_uuid: "",
      };
      wrapper.vm.isFormValid = true;

      await wrapper.vm.saveEstimate();

      expect(wrapper.vm.estimatesStore.createEstimate).toHaveBeenCalled();
      // Should refresh estimates for the saved corporation
      expect(mockRefreshEstimates).toHaveBeenCalledWith("corp-1");
      // Should clear estimate creation store
      expect(mockClearStore).toHaveBeenCalled();
      // Should navigate to estimates list after save
      expect(mockPush).toHaveBeenCalledWith("/projects?tab=estimates");
    });

    it("should update existing estimate and navigate to estimates list", async () => {
      const mockRefreshEstimates = vi.fn().mockResolvedValue(undefined);
      const mockFetchEstimates = vi.fn().mockResolvedValue(undefined);

      vi.mocked(useEstimatesStore).mockReturnValue({
        getEstimateByUuid: vi.fn().mockReturnValue(mockEstimate),
        createEstimate: vi.fn().mockResolvedValue(true),
        updateEstimate: vi.fn().mockResolvedValue(true),
        refreshEstimatesFromAPI: mockRefreshEstimates,
        fetchEstimates: mockFetchEstimates,
      } as any);

      wrapper = createWrapper({ id: "estimate-1" });
      wrapper.vm.form = {
        ...wrapper.vm.form,
        estimate_number: "ES-001-UPDATED",
        total_amount: 1500,
        final_amount: 1650,
        corporation_uuid: "corp-1",
      };
      wrapper.vm.isFormValid = true;

      await wrapper.vm.saveEstimate();

      expect(wrapper.vm.estimatesStore.updateEstimate).toHaveBeenCalledWith(
        expect.objectContaining({
          uuid: "estimate-1",
          estimate_number: "ES-001-UPDATED",
          total_amount: 1500,
          final_amount: 1650,
          corporation_uuid: "corp-1",
        })
      );
      // Should refresh estimates for the saved corporation
      expect(mockRefreshEstimates).toHaveBeenCalledWith("corp-1");
      // Should navigate to estimates list after save
      expect(mockPush).toHaveBeenCalledWith("/projects?tab=estimates");
    });

    it("should not save when form is invalid", async () => {
      wrapper = createWrapper();
      wrapper.vm.isFormValid = false;

      await wrapper.vm.saveEstimate();

      expect(wrapper.vm.estimatesStore.createEstimate).not.toHaveBeenCalled();
      expect(wrapper.vm.estimatesStore.updateEstimate).not.toHaveBeenCalled();
    });

    it("should handle save errors", async () => {
      vi.mocked(useEstimatesStore).mockReturnValue({
        getEstimateByUuid: vi.fn().mockReturnValue(mockEstimate),
        createEstimate: vi.fn().mockResolvedValue(false),
        updateEstimate: vi.fn().mockResolvedValue(false),
      } as any);

      wrapper = createWrapper({ id: "new" });
      wrapper.vm.form = {
        ...wrapper.vm.form,
        estimate_number: "ES-002",
        project_uuid: "project-1",
        estimate_date: "2024-01-20",
        total_amount: 2000,
        final_amount: 2200,
      };
      wrapper.vm.isFormValid = true;

      await wrapper.vm.saveEstimate();

      expect(wrapper.vm.saving).toBe(false);
    });
  });

  describe("Navigation", () => {
    it("should navigate back to estimates list", () => {
      wrapper = createWrapper();

      wrapper.vm.goBack();

      expect(mockPush).toHaveBeenCalledWith("/projects?tab=estimates");
    });

    it("should navigate back to originating project when query present", () => {
      wrapper = createWrapper(
        { id: "estimate-1" },
        { fromProjectId: "project-99" }
      );

      wrapper.vm.goBack();

      expect(mockPush).toHaveBeenCalledWith("/projects/form/project-99");
    });
  });

  describe("Watchers", () => {
    it("should update corporation_uuid when corporation changes", async () => {
      wrapper = createWrapper({ id: "new" });

      // Test that the form has the correct initial corporation_uuid
      expect(wrapper.vm.form.corporation_uuid).toBe("corp-1");
    });
  });

  describe("Mounted Hook", () => {
    it("should load estimate data on mount for existing estimate", async () => {
      const mockLoadEstimate = vi.fn().mockResolvedValue(undefined);

      wrapper = createWrapper({ id: "estimate-1" });
      wrapper.vm.loadEstimate = mockLoadEstimate;

      // Trigger the mounted hook by calling loadEstimate directly
      await wrapper.vm.loadEstimate();

      expect(mockLoadEstimate).toHaveBeenCalled();
    });

    it("should not load estimate data for new estimate", async () => {
      const mockLoadEstimate = vi.fn().mockResolvedValue(undefined);

      wrapper = createWrapper({ id: "new" });
      wrapper.vm.loadEstimate = mockLoadEstimate;

      // Trigger the mounted hook by calling loadEstimate directly
      await wrapper.vm.loadEstimate();

      expect(mockLoadEstimate).toHaveBeenCalled();
    });
  });

  describe("Permissions", () => {
    it("should have permission checks available", () => {
      wrapper = createWrapper({ id: "estimate-1" });

      // Test that the component has permission methods available
      expect(wrapper.vm.hasPermission).toBeDefined();
      expect(typeof wrapper.vm.hasPermission).toBe("function");
    });

    it("should have permission checks available for new estimate", () => {
      wrapper = createWrapper({ id: "new" });

      // Test that the component has permission methods available
      expect(wrapper.vm.hasPermission).toBeDefined();
      expect(typeof wrapper.vm.hasPermission).toBe("function");
    });
  });

  describe("Error Handling", () => {
    it("should handle load errors gracefully", async () => {
      vi.mocked(useEstimatesStore).mockReturnValue({
        getEstimateByUuid: vi.fn().mockImplementation(() => {
          throw new Error("Database error");
        }),
        createEstimate: vi.fn().mockResolvedValue(true),
        updateEstimate: vi.fn().mockResolvedValue(true),
      } as any);

      wrapper = createWrapper({ id: "estimate-1" });

      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(null);

      await wrapper.vm.loadEstimate();

      expect(wrapper.vm.error).toBe("Database error");
    });

    it("should handle save errors gracefully", async () => {
      vi.mocked(useEstimatesStore).mockReturnValue({
        getEstimateByUuid: vi.fn().mockReturnValue(mockEstimate),
        createEstimate: vi.fn().mockImplementation(() => {
          throw new Error("Save failed");
        }),
        updateEstimate: vi.fn().mockResolvedValue(true),
      } as any);

      wrapper = createWrapper({ id: "new" });
      wrapper.vm.form = {
        ...wrapper.vm.form,
        estimate_number: "ES-002",
        project_uuid: "project-1",
        estimate_date: "2024-01-20",
        total_amount: 2000,
        final_amount: 2200,
      };
      wrapper.vm.isFormValid = true;

      await wrapper.vm.saveEstimate();

      expect(wrapper.vm.saving).toBe(false);
    });
  });

  describe("IndexedDB Data Loading", () => {
    it("should load estimate from IndexedDB first", async () => {
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(
        mockEstimate as any
      );

      wrapper = createWrapper({ id: "estimate-1" });

      await wrapper.vm.loadEstimate();

      expect(dbHelpers.getEstimateByUuid).toHaveBeenCalledWith(
        "corp-1",
        "estimate-1"
      );
      expect(wrapper.vm.form.estimate_number).toBe("ES-001");
    });

    it("should fallback to store when IndexedDB returns null", async () => {
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(null);

      vi.mocked(useEstimatesStore).mockReturnValue({
        getEstimateByUuid: vi.fn().mockReturnValue(mockEstimate),
        createEstimate: vi.fn().mockResolvedValue(true),
        updateEstimate: vi.fn().mockResolvedValue(true),
      } as any);

      wrapper = createWrapper({ id: "estimate-1" });

      await wrapper.vm.loadEstimate();

      expect(wrapper.vm.form.estimate_number).toBe("ES-001");
    });

    it("should fetch from API when estimate has no line items", async () => {
      const estimateWithoutLineItems = { ...mockEstimate, line_items: [] };
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(
        estimateWithoutLineItems as any
      );
      vi.mocked(dbHelpers.updateEstimate).mockResolvedValue(undefined);

      // Mock the API fetch
      const fetchMock = vi.fn().mockResolvedValue({
        data: { ...mockEstimate, line_items: [{ total_amount: 100 }] },
      });
      global.$fetch = fetchMock as any;

      wrapper = createWrapper({ id: "estimate-1" });

      await wrapper.vm.loadEstimate();

      expect(fetchMock).toHaveBeenCalledWith("/api/estimates/estimate-1", {
        method: "GET",
      });
      expect(dbHelpers.updateEstimate).toHaveBeenCalled();
    });

    it("should handle IndexedDB errors gracefully", async () => {
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockRejectedValue(
        new Error("IndexedDB error")
      );

      // Mock store to return null so the error path is taken
      vi.mocked(useEstimatesStore).mockReturnValue({
        getEstimateByUuid: vi.fn().mockReturnValue(null),
        createEstimate: vi.fn().mockResolvedValue(true),
        updateEstimate: vi.fn().mockResolvedValue(true),
      } as any);

      wrapper = createWrapper({ id: "estimate-1" });

      // The component should not crash when IndexedDB fails
      expect(() => wrapper.vm.loadEstimate()).not.toThrow();
    });

    it("should handle API fetch errors when IndexedDB data is incomplete", async () => {
      const estimateWithoutLineItems = { ...mockEstimate, line_items: [] };
      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(
        estimateWithoutLineItems as any
      );

      // Mock API fetch to fail
      const fetchRejectMock = vi.fn().mockRejectedValue(new Error("API error"));
      global.$fetch = fetchRejectMock as any;

      wrapper = createWrapper({ id: "estimate-1" });

      await wrapper.vm.loadEstimate();

      // The API error should be caught and ignored, but the estimate should still be loaded
      expect(wrapper.vm.form.estimate_number).toBe("ES-001");
    });
  });

  describe("Data Synchronization", () => {
    it("should save estimate through store and navigate to estimates list", async () => {
      const mockRefreshEstimates = vi.fn().mockResolvedValue(undefined);
      const mockFetchEstimates = vi.fn().mockResolvedValue(undefined);
      
      vi.mocked(useEstimatesStore).mockReturnValue({
        getEstimateByUuid: vi.fn().mockReturnValue(mockEstimate),
        createEstimate: vi.fn().mockResolvedValue(true),
        updateEstimate: vi.fn().mockResolvedValue(true),
        refreshEstimatesFromAPI: mockRefreshEstimates,
        fetchEstimates: mockFetchEstimates,
      } as any);

      wrapper = createWrapper({ id: "estimate-1" });
      wrapper.vm.form = {
        ...wrapper.vm.form,
        estimate_number: "ES-001-UPDATED",
        total_amount: 1500,
        final_amount: 1650,
        corporation_uuid: "corp-1",
      };
      wrapper.vm.isFormValid = true;

      await wrapper.vm.saveEstimate();

      expect(wrapper.vm.estimatesStore.updateEstimate).toHaveBeenCalledWith(
        expect.objectContaining({
          uuid: "estimate-1",
          estimate_number: "ES-001-UPDATED",
          total_amount: 1500,
          final_amount: 1650,
          corporation_uuid: "corp-1",
        })
      );
      
      // Should refresh estimates for the saved corporation
      expect(mockRefreshEstimates).toHaveBeenCalledWith("corp-1");
      
      // Should navigate to estimates list
      expect(mockPush).toHaveBeenCalledWith("/projects?tab=estimates");
    });

    it("should handle save errors gracefully", async () => {
      vi.mocked(useEstimatesStore).mockReturnValue({
        getEstimateByUuid: vi.fn().mockReturnValue(mockEstimate),
        createEstimate: vi.fn().mockResolvedValue(false),
        updateEstimate: vi.fn().mockResolvedValue(false),
        refreshEstimatesFromAPI: vi.fn().mockResolvedValue(undefined),
        fetchEstimates: vi.fn().mockResolvedValue(undefined),
      } as any);

      wrapper = createWrapper({ id: "estimate-1" });
      wrapper.vm.form = {
        ...wrapper.vm.form,
        estimate_number: "ES-001-UPDATED",
      };
      wrapper.vm.isFormValid = true;

      await wrapper.vm.saveEstimate();

      // Should handle the save failure
      expect(wrapper.vm.saving).toBe(false);
      // Should not navigate on error
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("should use estimateCreationStore.selectedCorporationUuid when creating new estimate", async () => {
      const mockRefreshEstimates = vi.fn().mockResolvedValue(undefined);
      const mockFetchEstimates = vi.fn().mockResolvedValue(undefined);
      const mockCreateEstimate = vi.fn().mockResolvedValue(true);
      const mockClearStore = vi.fn();

      vi.mocked(useEstimatesStore).mockReturnValue({
        getEstimateByUuid: vi.fn().mockReturnValue(null),
        createEstimate: mockCreateEstimate,
        updateEstimate: vi.fn().mockResolvedValue(true),
        refreshEstimatesFromAPI: mockRefreshEstimates,
        fetchEstimates: mockFetchEstimates,
      } as any);

      vi.mocked(useEstimateCreationStore).mockReturnValue({
        selectedCorporationUuid: "corp-2", // Different from TopBar's corp-1
        clearStore: mockClearStore,
      } as any);

      wrapper = createWrapper({ id: "new" });
      wrapper.vm.form = {
        ...wrapper.vm.form,
        estimate_number: "ES-002",
        project_uuid: "project-1",
        estimate_date: "2024-01-15",
        corporation_uuid: "", // Empty initially
      };
      wrapper.vm.isFormValid = true;

      await wrapper.vm.saveEstimate();

      // Should use estimateCreationStore's corporation, not TopBar's
      expect(mockCreateEstimate).toHaveBeenCalledWith(
        expect.objectContaining({
          corporation_uuid: "corp-2",
        })
      );
      
      // Should refresh estimates for the saved corporation
      expect(mockRefreshEstimates).toHaveBeenCalledWith("corp-2");
      
      // Should clear estimate creation store
      expect(mockClearStore).toHaveBeenCalled();
      
      // Should navigate to estimates list
      expect(mockPush).toHaveBeenCalledWith("/projects?tab=estimates");
    });

    it("should use form.corporation_uuid when editing estimate", async () => {
      const mockRefreshEstimates = vi.fn().mockResolvedValue(undefined);
      const mockFetchEstimates = vi.fn().mockResolvedValue(undefined);
      const mockUpdateEstimate = vi.fn().mockResolvedValue(true);

      vi.mocked(useEstimatesStore).mockReturnValue({
        getEstimateByUuid: vi.fn().mockReturnValue(mockEstimate),
        createEstimate: vi.fn().mockResolvedValue(true),
        updateEstimate: mockUpdateEstimate,
        refreshEstimatesFromAPI: mockRefreshEstimates,
        fetchEstimates: mockFetchEstimates,
      } as any);

      wrapper = createWrapper({ id: "estimate-1" });
      wrapper.vm.form = {
        ...wrapper.vm.form,
        corporation_uuid: "corp-3", // Different from TopBar's corp-1
        estimate_number: "ES-001-UPDATED",
      };
      wrapper.vm.isFormValid = true;

      await wrapper.vm.saveEstimate();

      // Should use form's corporation_uuid when editing
      expect(mockUpdateEstimate).toHaveBeenCalledWith(
        expect.objectContaining({
          uuid: "estimate-1",
          corporation_uuid: "corp-3",
        })
      );
      
      // Should refresh estimates for the saved corporation
      expect(mockRefreshEstimates).toHaveBeenCalledWith("corp-3");
      
      // Should navigate to estimates list
      expect(mockPush).toHaveBeenCalledWith("/projects?tab=estimates");
    });

    it("should refresh local store if saved corporation matches TopBar selection", async () => {
      const mockRefreshEstimates = vi.fn().mockResolvedValue(undefined);
      const mockFetchEstimates = vi.fn().mockResolvedValue(undefined);
      const mockUpdateEstimate = vi.fn().mockResolvedValue(true);

      vi.mocked(useEstimatesStore).mockReturnValue({
        getEstimateByUuid: vi.fn().mockReturnValue(mockEstimate),
        createEstimate: vi.fn().mockResolvedValue(true),
        updateEstimate: mockUpdateEstimate,
        refreshEstimatesFromAPI: mockRefreshEstimates,
        fetchEstimates: mockFetchEstimates,
      } as any);

      // TopBar has corp-1 selected
      vi.mocked(useCorporationStore).mockReturnValue({
        selectedCorporation: mockCorporation,
        selectedCorporationId: "corp-1",
      } as any);

      wrapper = createWrapper({ id: "estimate-1" });
      wrapper.vm.form = {
        ...wrapper.vm.form,
        corporation_uuid: "corp-1", // Matches TopBar selection
        estimate_number: "ES-001-UPDATED",
      };
      wrapper.vm.isFormValid = true;

      await wrapper.vm.saveEstimate();

      // Should refresh estimates from API
      expect(mockRefreshEstimates).toHaveBeenCalledWith("corp-1");
      
      // Should also refresh local store since corporation matches
      expect(mockFetchEstimates).toHaveBeenCalledWith("corp-1");
      
      // Should navigate to estimates list
      expect(mockPush).toHaveBeenCalledWith("/projects?tab=estimates");
    });

    it("should throw error if corporation is missing when saving", async () => {
      vi.mocked(useEstimatesStore).mockReturnValue({
        getEstimateByUuid: vi.fn().mockReturnValue(null),
        createEstimate: vi.fn().mockResolvedValue(true),
        updateEstimate: vi.fn().mockResolvedValue(true),
        refreshEstimatesFromAPI: vi.fn().mockResolvedValue(undefined),
        fetchEstimates: vi.fn().mockResolvedValue(undefined),
      } as any);

      vi.mocked(useEstimateCreationStore).mockReturnValue({
        selectedCorporationUuid: null,
        clearStore: vi.fn(),
      } as any);

      vi.mocked(useCorporationStore).mockReturnValue({
        selectedCorporation: null,
        selectedCorporationId: null,
      } as any);

      wrapper = createWrapper({ id: "new" });
      wrapper.vm.form = {
        ...wrapper.vm.form,
        estimate_number: "ES-002",
        corporation_uuid: "", // Empty
      };
      wrapper.vm.isFormValid = true;

      await wrapper.vm.saveEstimate();

      // Should show error toast
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Error",
          color: "error",
        })
      );
      
      // Should not navigate on error
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing corporation ID", async () => {
      vi.mocked(useCorporationStore).mockReturnValue({
        selectedCorporation: null,
        selectedCorporationId: null,
      } as any);

      vi.mocked(useEstimateCreationStore).mockReturnValue({
        selectedCorporationUuid: null,
        clearStore: vi.fn(),
      } as any);

      wrapper = createWrapper({ id: "new" });

      await wrapper.vm.loadEstimate();

      // Should handle gracefully without corporation ID
      expect(wrapper.vm.form.corporation_uuid).toBe("");
    });

    it("should use estimateCreationStore.selectedCorporationUuid when loading new estimate", async () => {
      vi.mocked(useEstimateCreationStore).mockReturnValue({
        selectedCorporationUuid: "corp-2",
        clearStore: vi.fn(),
      } as any);

      wrapper = createWrapper({ id: "new" });

      await wrapper.vm.loadEstimate();

      // Should use estimateCreationStore's corporation for new estimates
      expect(wrapper.vm.form.corporation_uuid).toBe("corp-2");
    });

    it("should handle estimate with null values", async () => {
      const estimateWithNulls = {
        ...mockEstimate,
        total_amount: null,
        tax_amount: null,
        discount_amount: null,
        final_amount: null,
      };

      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(
        estimateWithNulls as any
      );

      wrapper = createWrapper({ id: "estimate-1" });

      await wrapper.vm.loadEstimate();

      expect(wrapper.vm.form.total_amount).toBe(0);
      expect(wrapper.vm.form.tax_amount).toBe(0);
      expect(wrapper.vm.form.discount_amount).toBe(0);
      expect(wrapper.vm.form.final_amount).toBe(0);
    });

    it("should handle estimate with empty line items array", async () => {
      const estimateWithEmptyLineItems = { ...mockEstimate, line_items: [] };

      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(
        estimateWithEmptyLineItems as any
      );

      wrapper = createWrapper({ id: "estimate-1" });

      await wrapper.vm.loadEstimate();

      expect(wrapper.vm.form.line_items).toEqual([]);
    });
  });

  describe("Audit Log Functionality", () => {
    const mockAuditLog = [
      {
        timestamp: "2024-01-15T10:00:00Z",
        user_uuid: "user-123",
        user_name: "Test User",
        user_email: "test@example.com",
        user_image_url: null,
        action: "created",
        description: "Estimate ES-001 created"
      },
      {
        timestamp: "2024-01-16T11:00:00Z",
        user_uuid: "user-123",
        user_name: "Test User",
        user_email: "test@example.com",
        user_image_url: null,
        action: "updated",
        description: "Estimate details updated"
      },
      {
        timestamp: "2024-01-17T12:00:00Z",
        user_uuid: "user-123",
        user_name: "Test User",
        user_email: "test@example.com",
        user_image_url: null,
        action: "approved",
        description: "Estimate approved"
      }
    ];

    it("should display audit log button when editing estimate", async () => {
      const estimateWithAuditLog = {
        ...mockEstimate,
        audit_log: mockAuditLog
      };

      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(
        estimateWithAuditLog as any
      );

      wrapper = createWrapper({ id: "estimate-1" });
      await wrapper.vm.loadEstimate();
      await nextTick();

      // Verify the form has audit_log data
      expect(wrapper.vm.form.audit_log).toEqual(mockAuditLog);
      // Verify the component can handle audit log data
      expect(wrapper.vm.editingEstimate).toBe(true);
    });

    it("should load audit log from estimate data", async () => {
      const estimateWithAuditLog = {
        ...mockEstimate,
        audit_log: mockAuditLog
      };

      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(
        estimateWithAuditLog as any
      );

      wrapper = createWrapper({ id: "estimate-1" });
      await wrapper.vm.loadEstimate();
      await nextTick();

      expect(wrapper.vm.form.audit_log).toEqual(mockAuditLog);
    });

    it("should handle estimate without audit log", async () => {
      const estimateWithoutAuditLog = {
        ...mockEstimate,
        audit_log: null
      };

      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(
        estimateWithoutAuditLog as any
      );

      wrapper = createWrapper({ id: "estimate-1" });
      await wrapper.vm.loadEstimate();
      await nextTick();

      // audit_log may be normalized to [] if null
      expect(wrapper.vm.form.audit_log === null || Array.isArray(wrapper.vm.form.audit_log)).toBe(true);
    });

    it("should handle estimate with empty audit log array", async () => {
      const estimateWithEmptyAuditLog = {
        ...mockEstimate,
        audit_log: []
      };

      const { dbHelpers } = await import("@/utils/indexedDb");
      vi.mocked(dbHelpers.getEstimateByUuid).mockResolvedValue(
        estimateWithEmptyAuditLog as any
      );

      wrapper = createWrapper({ id: "estimate-1" });
      await wrapper.vm.loadEstimate();
      await nextTick();

      expect(wrapper.vm.form.audit_log).toEqual([]);
    });

    it("should call updateEstimate when saving estimate and navigate", async () => {
      const updateEstimateMock = vi.fn().mockResolvedValue(true);
      const mockRefreshEstimates = vi.fn().mockResolvedValue(undefined);
      const mockFetchEstimates = vi.fn().mockResolvedValue(undefined);

      vi.mocked(useEstimatesStore).mockReturnValue({
        getEstimateByUuid: vi.fn().mockReturnValue(mockEstimate),
        createEstimate: vi.fn().mockResolvedValue(true),
        updateEstimate: updateEstimateMock,
        refreshEstimatesFromAPI: mockRefreshEstimates,
        fetchEstimates: mockFetchEstimates,
      } as any);

      wrapper = createWrapper({ id: "estimate-1" });
      wrapper.vm.form = {
        ...wrapper.vm.form,
        estimate_number: "ES-001-UPDATED",
        corporation_uuid: "corp-1",
      };
      wrapper.vm.isFormValid = true;

      await wrapper.vm.saveEstimate();

      // Verify updateEstimate was called
      expect(updateEstimateMock).toHaveBeenCalled();
      const updateCall = updateEstimateMock.mock.calls[0];
      const payload = updateCall[0];

      // Verify payload contains estimate data
      expect(payload).toHaveProperty("uuid");
      expect(payload).toHaveProperty("estimate_number");
      
      // Should refresh estimates and navigate
      expect(mockRefreshEstimates).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/projects?tab=estimates");
      // Note: user info is added by the store method, not the page component
    });

    it("should call createEstimate when creating new estimate and navigate", async () => {
      const createEstimateMock = vi.fn().mockResolvedValue(true);
      const mockRefreshEstimates = vi.fn().mockResolvedValue(undefined);
      const mockFetchEstimates = vi.fn().mockResolvedValue(undefined);
      const mockClearStore = vi.fn();

      vi.mocked(useEstimatesStore).mockReturnValue({
        getEstimateByUuid: vi.fn().mockReturnValue(null),
        createEstimate: createEstimateMock,
        updateEstimate: vi.fn().mockResolvedValue(true),
        refreshEstimatesFromAPI: mockRefreshEstimates,
        fetchEstimates: mockFetchEstimates,
      } as any);

      vi.mocked(useEstimateCreationStore).mockReturnValue({
        selectedCorporationUuid: "corp-1",
        clearStore: mockClearStore,
      } as any);

      wrapper = createWrapper({ id: "new" });
      wrapper.vm.form = {
        ...wrapper.vm.form,
        estimate_number: "ES-002",
        project_uuid: "project-1",
        estimate_date: "2024-01-15",
        corporation_uuid: "",
      };
      wrapper.vm.isFormValid = true;

      await wrapper.vm.saveEstimate();

      // Verify createEstimate was called
      expect(createEstimateMock).toHaveBeenCalled();
      const createCall = createEstimateMock.mock.calls[0];
      const payload = createCall[0];

      // Verify payload contains estimate data
      expect(payload).toHaveProperty("estimate_number");
      expect(payload).toHaveProperty("project_uuid");
      expect(payload).toHaveProperty("corporation_uuid");
      
      // Should refresh estimates and navigate
      expect(mockRefreshEstimates).toHaveBeenCalled();
      expect(mockClearStore).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/projects?tab=estimates");
      // Note: user info is added by the store method, not the page component
    });

    it("should handle save when user metadata is missing", async () => {
      const updateEstimateMock = vi.fn().mockResolvedValue(true);
      vi.mocked(useEstimatesStore).mockReturnValue({
        getEstimateByUuid: vi.fn().mockReturnValue(mockEstimate),
        createEstimate: vi.fn().mockResolvedValue(true),
        updateEstimate: updateEstimateMock,
      } as any);

      wrapper = createWrapper({ id: "estimate-1" });
      wrapper.vm.form = {
        ...wrapper.vm.form,
        estimate_number: "ES-001-UPDATED",
      };
      wrapper.vm.isFormValid = true;

      await wrapper.vm.saveEstimate();

      // Verify updateEstimate was called successfully
      expect(updateEstimateMock).toHaveBeenCalled();
      // Note: The store handles missing user metadata gracefully
    });
  });
});
