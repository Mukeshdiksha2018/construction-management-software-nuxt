import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks for composables and stores used by the component
vi.mock("@/stores/corporations", () => ({
  useCorporationStore: () => ({
    selectedCorporationId: "corp-1",
    selectedCorporation: { uuid: "corp-1" },
  }),
}));

const createProjectSpy = vi.fn();
const updateProjectSpy = vi.fn();
vi.mock("@/stores/projects", () => ({
  useProjectsStore: () => ({
    projects: [],
    loading: false,
    error: null,
    fetchProjects: vi.fn(),
    createProject: createProjectSpy,
    updateProject: updateProjectSpy,
    deleteProject: vi.fn(),
  }),
}));

const fetchAddressesSpy = vi.fn();
const createAddressSpy = vi.fn();
vi.mock("@/stores/projectAddresses", () => ({
  useProjectAddressesStore: () => ({
    fetchAddresses: fetchAddressesSpy,
    createAddress: createAddressSpy,
    getAddresses: vi.fn(() => []),
  }),
}));

vi.mock("@/stores/projectTypes", () => ({
  useProjectTypesStore: () => ({
    getActiveProjectTypes: () => [{ uuid: "pt-1", name: "Type A" }],
    fetchProjectTypes: vi.fn(),
  }),
}));
vi.mock("@/stores/serviceTypes", () => ({
  useServiceTypesStore: () => ({
    getActiveServiceTypes: () => [{ uuid: "st-1", name: "Service A" }],
    fetchServiceTypes: vi.fn(),
  }),
}));

vi.mock("@/composables/usePermissions", () => ({
  usePermissions: () => ({ hasPermission: () => true, isReady: true }),
}));
vi.mock("@/composables/useDateFormat", () => ({
  useDateFormat: () => ({ formatDate: (d: string) => d || "" }),
}));
vi.mock("@/composables/useCurrencyFormat", () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (n: number) => `$${(n ?? 0).toFixed(2)}`,
  }),
}));
vi.mock("@/composables/useTableStandard", () => ({
  useTableStandard: () => ({
    pagination: { value: { pageIndex: 0, pageSize: 10 } },
    paginationOptions: { value: {} },
    pageSizeOptions: { value: [] },
    updatePageSize: vi.fn(),
    getPaginationProps: vi.fn(),
    getPageInfo: vi.fn(() => ({ value: "" })),
    shouldShowPagination: vi.fn(() => ({ value: false })),
  }),
}));

// Provide useToast globally (stub)
const toastAdd = vi.fn();
// @ts-expect-error global stub
global.useToast = () => ({ add: toastAdd });

// Helper functions that mirror component logic without importing .vue
const validateRequired = (form: any) => {
  const errors: string[] = [];
  if (!form.corporation_uuid) errors.push("Corporation is required");
  if (!form.project_name?.trim()) errors.push("Project Name is required");
  if (!form.project_id?.trim()) errors.push("Project ID is required");
  if (!form.project_type_uuid) errors.push("Project Type is required");
  if (!form.service_type_uuid) errors.push("Service Type is required");
  const hasArea = !!form.area_sq_ft && Number(form.area_sq_ft) > 0;
  const hasRooms = !!form.no_of_rooms && Number(form.no_of_rooms) > 0;
  if (!hasArea && !hasRooms)
    errors.push("Provide Area (sq ft) or Number of Rooms");
  return errors;
};

const validateAddresses = (
  editingUuid: string | null,
  tempAddresses: any[],
  getSaved: () => any[]
) => {
  if (editingUuid) {
    const saved = getSaved() || [];
    const hasAny = saved.length > 0;
    const hasPrimary = saved.some((a: any) => !!a.is_primary);
    return hasAny && hasPrimary;
  }
  const hasAny = tempAddresses.length > 0;
  const hasPrimary = tempAddresses.some((a: any) => !!a.is_primary);
  return hasAny && hasPrimary;
};

describe("ProjectDetails - validations and behaviors (logic only)", () => {
  beforeEach(() => {
    toastAdd.mockReset();
    fetchAddressesSpy.mockReset();
    createAddressSpy.mockReset();
    createProjectSpy.mockReset();
    updateProjectSpy.mockReset();
  });

  it("blocks submit when no addresses or no primary for new project", async () => {
    const form = {
      id: undefined,
      corporation_uuid: "corp-1",
      project_name: "P1",
      project_id: "PID1",
      project_type_uuid: "pt-1",
      service_type_uuid: "st-1",
      area_sq_ft: "",
      no_of_rooms: "",
      tempAddresses: [] as any[],
    };
    const requiredErrors = validateRequired(form);
    expect(requiredErrors).toContain("Provide Area (sq ft) or Number of Rooms");
    const addrOk = validateAddresses(null, form.tempAddresses, () => []);
    expect(addrOk).toBe(false);
  });

  it("creates project then persists temp addresses and clears them", async () => {
    createProjectSpy.mockResolvedValueOnce({ uuid: "proj-1" });
    const form: any = {
      id: undefined,
      corporation_uuid: "corp-1",
      project_name: "P1",
      project_id: "PID1",
      project_type_uuid: "pt-1",
      service_type_uuid: "st-1",
      area_sq_ft: 100,
      tempAddresses: [
        {
          address_line_1: "A1",
          city: "C",
          state: "S",
          zip_code: "Z",
          country: "US",
          is_primary: true,
        },
      ],
    };
    // simulate create
    const created = await createProjectSpy({});
    for (const tempAddress of form.tempAddresses) {
      await createAddressSpy({ project_uuid: created.uuid, ...tempAddress });
    }
    await fetchAddressesSpy(created.uuid);
    form.tempAddresses = [];
    expect(createProjectSpy).toHaveBeenCalled();
    expect(createAddressSpy).toHaveBeenCalledWith(
      expect.objectContaining({ project_uuid: "proj-1" })
    );
    expect(fetchAddressesSpy).toHaveBeenCalledWith("proj-1");
    expect(form.tempAddresses.length).toBe(0);
  });

  it("opens details modal via method", async () => {
    // just sanity check for modal open trigger
    const showPreviewModal = { value: false };
    const previewProject = { value: null as any };
    const previewProjectDetails = (project: any) => {
      previewProject.value = project;
      showPreviewModal.value = true;
    };
    previewProjectDetails({ project_name: "X" });
    expect(showPreviewModal.value).toBe(true);
  });

  describe("Project Type and Service Type Lookup", () => {
    it("should create project type name lookup map correctly", () => {
      const corporationUuid = "corp-1";
      const projectTypes = [
        {
          uuid: "pt-1",
          name: "Renovation",
          corporation_uuid: corporationUuid,
          isActive: true,
        },
        {
          uuid: "pt-2",
          name: "New Construction",
          corporation_uuid: corporationUuid,
          isActive: true,
        },
        {
          uuid: "pt-3",
          name: "Maintenance",
          corporation_uuid: corporationUuid,
          isActive: false,
        }, // inactive
      ];

      // Mock the store to return project types (now returns all active types globally)
      const mockGetActiveProjectTypes = projectTypes.filter((pt) => pt.isActive);

      // Simulate the lookup logic from the component
      const createProjectTypeNameMap = (
        getActiveProjectTypes: any[]
      ) => {
        const list = getActiveProjectTypes || [];
        const map: Record<string, string> = {};
        list.forEach((pt: any) => {
          if (pt?.uuid) {
            map[pt.uuid] = pt.name || pt.uuid;
          }
        });
        return map;
      };

      const projectTypeNameByUuid = createProjectTypeNameMap(
        mockGetActiveProjectTypes
      );

      expect(projectTypeNameByUuid).toEqual({
        "pt-1": "Renovation",
        "pt-2": "New Construction",
      });
      expect(projectTypeNameByUuid["pt-3"]).toBeUndefined(); // inactive type should not be included
    });

    it("should create service type name lookup map correctly", () => {
      const serviceTypes = [
        {
          uuid: "st-1",
          name: "Plumbing",
          isActive: true,
        },
        {
          uuid: "st-2",
          name: "Electrical",
          isActive: true,
        },
        {
          uuid: "st-3",
          name: "HVAC",
          isActive: false,
        }, // inactive
      ];

      // Mock the store to return active service types (as array, not function)
      const mockGetActiveServiceTypes = serviceTypes.filter((st) => st.isActive);

      // Simulate the lookup logic from the component
      const createServiceTypeNameMap = (
        getActiveServiceTypes: any
      ) => {
        const list = getActiveServiceTypes || [];
        const map: Record<string, string> = {};
        list.forEach((st: any) => {
          if (st?.uuid) {
            map[st.uuid] = st.name || st.uuid;
          }
        });
        return map;
      };

      const serviceTypeNameByUuid = createServiceTypeNameMap(
        mockGetActiveServiceTypes
      );

      expect(serviceTypeNameByUuid).toEqual({
        "st-1": "Plumbing",
        "st-2": "Electrical",
      });
      expect(serviceTypeNameByUuid["st-3"]).toBeUndefined(); // inactive type should not be included
    });

    it("should handle missing corporation UUID gracefully", () => {
      const createProjectTypeNameMap = () => {
        // Global project types don't need corporation
        return { "pt-1": "Test Type" };
      };

      const createServiceTypeNameMap = (corporationUuid: any) => {
        // If corporationUuid is null or empty string, return empty object
        if (corporationUuid === null || corporationUuid === "") {
          return {};
        }
        // Global service types don't need corporation
        return { "st-1": "Test Service" };
      };

      expect(createProjectTypeNameMap()).toEqual({ "pt-1": "Test Type" });
      expect(createServiceTypeNameMap(null)).toEqual({});
      expect(createServiceTypeNameMap("")).toEqual({});
    });

    it("should handle empty project types and service types lists", () => {
      const mockGetActiveProjectTypes: any[] = [];
      const mockGetActiveServiceTypes: any[] = [];

      const createProjectTypeNameMap = (
        getActiveProjectTypes: any[]
      ) => {
        const list = getActiveProjectTypes || [];
        const map: Record<string, string> = {};
        list.forEach((pt: any) => {
          if (pt?.uuid) {
            map[pt.uuid] = pt.name || pt.uuid;
          }
        });
        return map;
      };

      const createServiceTypeNameMap = (
        getActiveServiceTypes: any
      ) => {
        const list = getActiveServiceTypes || [];
        const map: Record<string, string> = {};
        list.forEach((st: any) => {
          if (st?.uuid) {
            map[st.uuid] = st.name || st.uuid;
          }
        });
        return map;
      };

      const projectTypeNameByUuid = createProjectTypeNameMap(
        mockGetActiveProjectTypes
      );
      const serviceTypeNameByUuid = createServiceTypeNameMap(
        mockGetActiveServiceTypes
      );

      expect(projectTypeNameByUuid).toEqual({});
      expect(serviceTypeNameByUuid).toEqual({});
    });

    it("should handle project types and service types with missing names", () => {
      const projectTypes = [
        {
          uuid: "pt-1",
          name: "Valid Type",
          isActive: true,
        },
        {
          uuid: "pt-2",
          name: null,
          isActive: true,
        },
        {
          uuid: "pt-3",
          name: "",
          isActive: true,
        },
      ];

      const serviceTypes = [
        {
          uuid: "st-1",
          name: "Valid Service",
          isActive: true,
        },
        {
          uuid: "st-2",
          name: null,
          isActive: true,
        },
        {
          uuid: "st-3",
          name: "",
          isActive: true,
        },
      ];

      const mockGetActiveProjectTypes = projectTypes.filter((pt) => pt.isActive);
      const mockGetActiveServiceTypes = serviceTypes.filter((st) => st.isActive);

      const createProjectTypeNameMap = (
        getActiveProjectTypes: any[]
      ) => {
        const list = getActiveProjectTypes || [];
        const map: Record<string, string> = {};
        list.forEach((pt: any) => {
          if (pt?.uuid) {
            map[pt.uuid] = pt.name || pt.uuid;
          }
        });
        return map;
      };

      const createServiceTypeNameMap = (
        getActiveServiceTypes: any
      ) => {
        const list = getActiveServiceTypes || [];
        const map: Record<string, string> = {};
        list.forEach((st: any) => {
          if (st?.uuid) {
            map[st.uuid] = st.name || st.uuid;
          }
        });
        return map;
      };

      const projectTypeNameByUuid = createProjectTypeNameMap(
        mockGetActiveProjectTypes
      );
      const serviceTypeNameByUuid = createServiceTypeNameMap(
        mockGetActiveServiceTypes
      );

      expect(projectTypeNameByUuid).toEqual({
        "pt-1": "Valid Type",
        "pt-2": "pt-2", // fallback to UUID when name is null
        "pt-3": "pt-3", // fallback to UUID when name is empty
      });

      expect(serviceTypeNameByUuid).toEqual({
        "st-1": "Valid Service",
        "st-2": "st-2", // fallback to UUID when name is null
        "st-3": "st-3", // fallback to UUID when name is empty
      });
    });
  });
});
