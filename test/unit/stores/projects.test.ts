import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectsStore } from '@/stores/projects'

// Mock $fetch
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Mock process.server to be false for tests
vi.stubGlobal('process', { 
  server: false,
  env: { NODE_ENV: 'test' }
})

// Mock useToast
const mockToast = {
  add: vi.fn()
}
vi.mock('#app', () => ({
  useToast: () => mockToast
}))

// Mock IndexedDB helpers
const mockDbHelpers = {
  getProjects: vi.fn(),
  addProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  saveProjects: vi.fn(),
}

vi.mock('@/utils/indexedDb', () => ({
  dbHelpers: mockDbHelpers,
  db: {}
}))

describe('Projects Store', () => {
  let store: ReturnType<typeof useProjectsStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useProjectsStore()
    mockFetch.mockReset();
    mockDbHelpers.getProjects.mockReset();
    mockDbHelpers.addProject.mockReset();
    mockDbHelpers.updateProject.mockReset();
    mockDbHelpers.deleteProject.mockReset();
    mockDbHelpers.saveProjects.mockReset();
    // Clear store state
    store.clearProjects();
    store.clearError();
  })

  afterEach(() => {
    mockFetch.mockReset();
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.projects).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })
  })

  describe("fetchProjectsMetadata", () => {
    it("should fetch projects metadata successfully from IndexedDB", async () => {
      const mockProjects = [
        {
          id: 1,
          uuid: "project-1",
          project_name: "Test Project 1",
          project_id: "P001",
          corporation_uuid: "corp-1",
          project_type_uuid: "pt-1",
          service_type_uuid: "st-1",
          estimated_amount: 100000,
          project_status: "Pending",
          project_start_date: "2023-01-01",
          created_at: "2023-01-01T00:00:00Z",
          corporationId: "corp-1", // IndexedDB adds this field
          is_active: true,
        },
        {
          id: 2,
          uuid: "project-2",
          project_name: "Test Project 2",
          project_id: "P002",
          corporation_uuid: "corp-1",
          project_type_uuid: "pt-2",
          service_type_uuid: "st-2",
          estimated_amount: 200000,
          project_status: "In Progress",
          project_start_date: "2023-01-02",
          created_at: "2023-01-02T00:00:00Z",
          corporationId: "corp-1",
          is_active: true,
        },
      ];

      // Mock IndexedDB response
      mockDbHelpers.getProjects.mockResolvedValueOnce(mockProjects);

      await store.fetchProjectsMetadata("corp-1");

      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
      // Projects computed returns metadata (only 9 fields)
      expect(store.projects).toHaveLength(2);
      expect(store.projects[0]).toEqual({
        uuid: "project-1",
        project_id: "P001",
        project_name: "Test Project 1",
        project_status: "Pending",
        project_start_date: "2023-01-01",
        estimated_amount: 100000,
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        corporation_uuid: "corp-1",
        is_active: true,
      });
      expect(mockDbHelpers.getProjects).toHaveBeenCalledWith("corp-1");
    });

    it("should handle fetch error from IndexedDB and fallback to API", async () => {
      const errorMessage = "Failed to fetch projects metadata";
      mockDbHelpers.getProjects.mockRejectedValueOnce(new Error(errorMessage));

      // Mock API to return empty array when IndexedDB fails
      mockFetch.mockResolvedValueOnce({ data: [] });

      await store.fetchProjectsMetadata("corp-1");

      expect(store.loading).toBe(false);
      // Error from IndexedDB is cleared when API fetch succeeds
      expect(store.error).toBe(null);
      expect(store.projects).toEqual([]);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects?corporation_uuid=corp-1",
        undefined
      );
    });

    it("should handle fetch error when both IndexedDB and API fail", async () => {
      const dbErrorMessage = "Failed to fetch projects metadata";
      const apiErrorMessage = "API fetch failed";
      mockDbHelpers.getProjects.mockRejectedValueOnce(
        new Error(dbErrorMessage)
      );
      mockFetch.mockRejectedValueOnce(new Error(apiErrorMessage));

      await store.fetchProjectsMetadata("corp-1");

      expect(store.loading).toBe(false);
      // API error takes precedence
      expect(store.error).toBe(apiErrorMessage);
      expect(store.projects).toEqual([]);
    });

    it("should fetch from API when IndexedDB is empty", async () => {
      const mockProjects = [
        {
          id: 1,
          uuid: "project-1",
          project_name: "Test Project 1",
          project_id: "P001",
          corporation_uuid: "corp-1",
          project_type_uuid: "pt-1",
          service_type_uuid: "st-1",
          estimated_amount: 100000,
          project_status: "Pending",
          project_start_date: "2023-01-01",
          created_at: "2023-01-01T00:00:00Z",
          is_active: true,
        },
      ];

      // Mock IndexedDB to return empty array
      mockDbHelpers.getProjects.mockResolvedValueOnce([]);
      // Mock API to return projects
      mockFetch.mockResolvedValueOnce({ data: mockProjects });
      // Mock saving to IndexedDB
      mockDbHelpers.saveProjects.mockResolvedValueOnce(undefined);

      await store.fetchProjectsMetadata("corp-1");

      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
      expect(store.projects).toHaveLength(1);
      expect(store.projects[0]).toEqual({
        uuid: "project-1",
        project_id: "P001",
        project_name: "Test Project 1",
        project_status: "Pending",
        project_start_date: "2023-01-01",
        estimated_amount: 100000,
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        corporation_uuid: "corp-1",
        is_active: true,
      });
      // Should fetch from API
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects?corporation_uuid=corp-1",
        undefined
      );
      // Should sync to IndexedDB
      expect(mockDbHelpers.saveProjects).toHaveBeenCalledWith(
        "corp-1",
        mockProjects
      );
    });

    it("should force refresh from API when forceRefresh is true", async () => {
      const mockProjects = [
        {
          id: 1,
          uuid: "project-1",
          project_name: "Test Project 1",
          project_id: "P001",
          corporation_uuid: "corp-1",
          project_type_uuid: "pt-1",
          service_type_uuid: "st-1",
          estimated_amount: 100000,
          project_status: "Pending",
          project_start_date: "2023-01-01",
          created_at: "2023-01-01T00:00:00Z",
          is_active: true,
        },
      ];

      // Mock API to return projects
      mockFetch.mockResolvedValueOnce({ data: mockProjects });
      // Mock saving to IndexedDB
      mockDbHelpers.saveProjects.mockResolvedValueOnce(undefined);

      await store.fetchProjectsMetadata("corp-1", true, false); // forceRefresh=true, useIndexedDB=false

      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
      expect(store.projects).toHaveLength(1);
      // Should fetch from API (not IndexedDB)
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects?corporation_uuid=corp-1",
        undefined
      );
      expect(mockDbHelpers.getProjects).not.toHaveBeenCalled();
      // Should sync to IndexedDB
      expect(mockDbHelpers.saveProjects).toHaveBeenCalledWith(
        "corp-1",
        mockProjects
      );
    });

    it("should set loading state during fetch", async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockDbHelpers.getProjects.mockReturnValueOnce(promise);

      const fetchPromise = store.fetchProjectsMetadata("corp-1");

      expect(store.loading).toBe(true);

      resolvePromise!([]);
      await fetchPromise;

      expect(store.loading).toBe(false);
    });
  });

  describe("loadCurrentProject", () => {
    it("should load full project from IndexedDB into currentProject", async () => {
      const mockProjects = [
        {
          id: 1,
          uuid: "project-1",
          project_name: "Test Project 1",
          project_id: "P001",
          corporation_uuid: "corp-1",
          project_type_uuid: "pt-1",
          service_type_uuid: "st-1",
          estimated_amount: 100000,
          project_status: "Pending",
          project_start_date: "2023-01-01",
          created_at: "2023-01-01T00:00:00Z",
          corporationId: "corp-1",
          // Full project fields
          project_description: "Test description",
          area_sq_ft: 1000,
          contingency_percentage: 10,
          only_total: false,
          enable_labor: true,
          enable_material: true,
          attachments: [],
          is_active: true,
        },
      ];

      mockDbHelpers.getProjects.mockResolvedValueOnce(mockProjects);

      const result = await store.loadCurrentProject("project-1", "corp-1");

      expect(result).toBe(true);
      expect(store.currentProject).toBeDefined();
      expect(store.currentProject?.uuid).toBe("project-1");
      expect(store.currentProject?.project_name).toBe("Test Project 1");
      // Should have full project data, not just metadata
      expect(store.currentProject?.project_description).toBe(
        "Test description"
      );
    });

    it("should return false if project not found", async () => {
      mockDbHelpers.getProjects.mockResolvedValueOnce([]);

      const result = await store.loadCurrentProject("non-existent", "corp-1");

      expect(result).toBe(false);
      expect(store.currentProject).toBeNull();
      expect(store.error).toBe("Project not found in IndexedDB");
    });
  });

  describe("clearCurrentProject", () => {
    it("should clear currentProject from memory", async () => {
      // First load a project
      const mockProjects = [
        {
          uuid: "project-1",
          project_name: "Test Project",
          corporationId: "corp-1",
          corporation_uuid: "corp-1",
          project_id: "P001",
          project_status: "Pending",
          project_type_uuid: "pt-1",
          service_type_uuid: "st-1",
          estimated_amount: 100000,
        },
      ];
      mockDbHelpers.getProjects.mockResolvedValueOnce(mockProjects);
      await store.loadCurrentProject("project-1", "corp-1");

      expect(store.currentProject).not.toBeNull();

      // Clear it
      store.clearCurrentProject();

      expect(store.currentProject).toBeNull();
    });
  });

  describe("createProject", () => {
    it("should create project successfully", async () => {
      const newProject = {
        corporation_uuid: "corp-1",
        project_name: "New Project",
        project_id: "P003",
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        estimated_amount: 150000,
        project_status: "Pending",
        contact_person: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        address_type: "shipment",
        address_line_1: "123 Main St",
        city: "Anytown",
        state: "CA",
        zip_code: "12345",
        country: "US",
        project_start_date: "2023-01-01",
      };

      const createdProject = {
        id: 3,
        uuid: "project-3",
        ...newProject,
        created_at: "2023-01-03T00:00:00Z",
        updated_at: "2023-01-03T00:00:00Z",
        is_active: true,
        attachments: [],
        only_total: false,
        enable_labor: false,
        enable_material: false,
      };

      mockFetch.mockResolvedValueOnce({ data: createdProject });
      mockDbHelpers.addProject.mockResolvedValueOnce(undefined);

      const result = await store.createProject(newProject);

      expect(result).toEqual(createdProject);
      // Should add metadata to store
      expect(store.projects).toHaveLength(1);
      expect(store.projects[0]).toEqual({
        uuid: "project-3",
        project_id: "P003",
        project_name: "New Project",
        project_status: "Pending",
        project_start_date: "2023-01-01",
        estimated_amount: 150000,
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        corporation_uuid: "corp-1",
        is_active: true,
      });
      // Should set as currentProject
      expect(store.currentProject).toEqual(createdProject);
      expect(mockFetch).toHaveBeenCalledWith("/api/projects", {
        method: "POST",
        body: newProject,
      });
      expect(mockDbHelpers.addProject).toHaveBeenCalledWith(
        "corp-1",
        createdProject
      );
    });

    it("should create project with customer_uuid successfully", async () => {
      const newProject = {
        corporation_uuid: "corp-1",
        project_name: "New Project",
        project_id: "P003",
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        estimated_amount: 150000,
        project_status: "Pending",
        customer_uuid: "customer-1",
        project_start_date: "2023-01-01",
      };

      const createdProject = {
        id: 3,
        uuid: "project-3",
        ...newProject,
        created_at: "2023-01-03T00:00:00Z",
        updated_at: "2023-01-03T00:00:00Z",
        is_active: true,
        attachments: [],
        only_total: false,
        enable_labor: false,
        enable_material: false,
      };

      mockFetch.mockResolvedValueOnce({ data: createdProject });
      mockDbHelpers.addProject.mockResolvedValueOnce(undefined);

      const result = await store.createProject(newProject);

      expect(result).toEqual(createdProject);
      expect(result?.customer_uuid).toBe("customer-1");
      expect(mockFetch).toHaveBeenCalledWith("/api/projects", {
        method: "POST",
        body: newProject,
      });
      expect(mockDbHelpers.addProject).toHaveBeenCalledWith(
        "corp-1",
        createdProject
      );
    });

    it("should handle create project error", async () => {
      const newProject = {
        corporation_uuid: "corp-1",
        project_name: "New Project",
        project_id: "P003",
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
      };

      const errorMessage = "Failed to create project";
      mockFetch.mockRejectedValueOnce(new Error(errorMessage));

      const result = await store.createProject(newProject);
      expect(result).toBeNull();
      expect(store.error).toBe(errorMessage);
      expect(store.projects).toEqual([]);
    });
  });

  describe("updateProject", () => {
    beforeEach(() => {
      store.clearProjects();
      store.clearCache("corp-1");
    });

    it("should update project successfully", async () => {
      // First, add a project to the store
      const existingProject = {
        id: 1,
        uuid: "project-1",
        project_name: "Original Project Name",
        project_id: "P001",
        estimated_amount: 100000,
        corporation_uuid: "corp-1",
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        project_status: "Pending",
        project_start_date: "2023-01-01",
        created_at: "2023-01-01T00:00:00Z",
        is_active: true,
      };
      store.setProjects([existingProject]);

      const projectUuid = "project-1";
      const updateData = {
        project_name: "Updated Project Name",
        estimated_amount: 175000,
      };

      const updatedProject = {
        id: 1,
        uuid: projectUuid,
        ...existingProject,
        ...updateData,
        updated_at: "2023-01-03T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({ data: updatedProject });
      mockDbHelpers.updateProject.mockResolvedValueOnce(undefined);

      const result = await store.updateProject({
        uuid: projectUuid,
        ...updateData,
      });

      expect(result).toEqual(updatedProject);
      // Should update metadata
      const projectMetadata = store.projects.find(
        (p) => p.uuid === projectUuid
      );
      expect(projectMetadata).toEqual({
        uuid: "project-1",
        project_id: "P001",
        project_name: "Updated Project Name",
        project_status: "Pending",
        project_start_date: "2023-01-01",
        estimated_amount: 175000,
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        corporation_uuid: "corp-1",
        is_active: true,
      });
      expect(mockFetch).toHaveBeenCalledWith("/api/projects", {
        method: "PUT",
        body: {
          uuid: projectUuid,
          ...updateData,
        },
      });
      expect(mockDbHelpers.updateProject).toHaveBeenCalledWith(
        "corp-1",
        projectUuid,
        updatedProject
      );
    });

    it("should update project customer_uuid successfully", async () => {
      // First, add a project to the store
      const existingProject = {
        id: 1,
        uuid: "project-1",
        project_name: "Test Project",
        project_id: "P001",
        estimated_amount: 100000,
        corporation_uuid: "corp-1",
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        project_status: "Pending",
        project_start_date: "2023-01-01",
        customer_uuid: "customer-1",
        created_at: "2023-01-01T00:00:00Z",
        is_active: true,
      };
      store.setProjects([existingProject]);

      const projectUuid = "project-1";
      const updateData = {
        customer_uuid: "customer-2",
      };

      const updatedProject = {
        id: 1,
        uuid: projectUuid,
        ...existingProject,
        ...updateData,
        updated_at: "2023-01-03T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({ data: updatedProject });
      mockDbHelpers.updateProject.mockResolvedValueOnce(undefined);

      const result = await store.updateProject({
        uuid: projectUuid,
        ...updateData,
      });

      expect(result).toEqual(updatedProject);
      expect(result?.customer_uuid).toBe("customer-2");
      expect(mockFetch).toHaveBeenCalledWith("/api/projects", {
        method: "PUT",
        body: {
          uuid: projectUuid,
          ...updateData,
        },
      });
    });

    it("should update project customer_uuid to null successfully", async () => {
      // First, add a project to the store
      const existingProject = {
        id: 1,
        uuid: "project-1",
        project_name: "Test Project",
        project_id: "P001",
        estimated_amount: 100000,
        corporation_uuid: "corp-1",
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        project_status: "Pending",
        project_start_date: "2023-01-01",
        customer_uuid: "customer-1",
        created_at: "2023-01-01T00:00:00Z",
        is_active: true,
      };
      store.setProjects([existingProject]);

      const projectUuid = "project-1";
      const updateData = {
        customer_uuid: null,
      };

      const updatedProject = {
        id: 1,
        uuid: projectUuid,
        ...existingProject,
        ...updateData,
        updated_at: "2023-01-03T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({ data: updatedProject });
      mockDbHelpers.updateProject.mockResolvedValueOnce(undefined);

      const result = await store.updateProject({
        uuid: projectUuid,
        ...updateData,
      });

      expect(result).toEqual(updatedProject);
      expect(result?.customer_uuid).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith("/api/projects", {
        method: "PUT",
        body: {
          uuid: projectUuid,
          ...updateData,
        },
      });
    });

    it("should handle update project error", async () => {
      // First, add a project to the store
      const existingProject = {
        id: 1,
        uuid: "project-1",
        project_name: "Original Project Name",
        project_id: "P001",
        estimated_amount: 100000,
        corporation_uuid: "corp-1",
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        project_status: "Pending",
        project_start_date: "2023-01-01",
        created_at: "2023-01-01T00:00:00Z",
        is_active: true,
      };
      store.setProjects([existingProject]);

      const projectUuid = "project-1";
      const updateData = { project_name: "Updated Name" };

      const errorMessage = "Failed to update project";
      mockFetch.mockRejectedValueOnce(new Error(errorMessage));

      const result = await store.updateProject({
        uuid: projectUuid,
        ...updateData,
      });
      expect(result).toBeNull();
      expect(store.error).toBe(errorMessage);
      // Metadata should remain unchanged in store
      const projectMetadata = store.projects.find(
        (p) => p.uuid === projectUuid
      );
      expect(projectMetadata).toEqual({
        uuid: "project-1",
        project_id: "P001",
        project_name: "Original Project Name",
        project_status: "Pending",
        project_start_date: "2023-01-01",
        estimated_amount: 100000,
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        corporation_uuid: "corp-1",
        is_active: true,
      });
    });
  });

  describe("deleteProject", () => {
    beforeEach(() => {
      store.clearProjects();
      store.clearCache("corp-1");
    });

    it("should delete project successfully", async () => {
      // First, add a project to the store
      const existingProject = {
        id: 1,
        uuid: "project-1",
        project_name: "Test Project",
        project_id: "P001",
        estimated_amount: 100000,
        corporation_uuid: "corp-1",
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        project_status: "Pending",
        project_start_date: "2023-01-01",
        created_at: "2023-01-01T00:00:00Z",
        is_active: true,
      };
      store.setProjects([existingProject]);

      const projectUuid = "project-1";
      const deletedProject = {
        id: 1,
        uuid: projectUuid,
        is_active: false,
        updated_at: "2023-01-03T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({ data: deletedProject });
      mockDbHelpers.deleteProject.mockResolvedValueOnce(undefined);

      const result = await store.deleteProject(projectUuid);

      expect(result).toBe(true);
      expect(
        store.projects.find((p) => p.uuid === projectUuid)
      ).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith("/api/projects", {
        method: "DELETE",
        query: { uuid: projectUuid },
      });
      expect(mockDbHelpers.deleteProject).toHaveBeenCalledWith(
        "corp-1",
        projectUuid
      );
    });

    it("should handle delete project error", async () => {
      // First, add a project to the store
      const existingProject = {
        id: 1,
        uuid: "project-1",
        project_name: "Test Project",
        project_id: "P001",
        estimated_amount: 100000,
        corporation_uuid: "corp-1",
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        project_status: "Pending",
        project_start_date: "2023-01-01",
        created_at: "2023-01-01T00:00:00Z",
        is_active: true,
      };
      store.setProjects([existingProject]);

      const projectUuid = "project-1";
      const errorMessage = "Failed to delete project";
      const mockError = new Error(errorMessage);
      (mockError as any).statusCode = 500;
      (mockError as any).statusMessage = errorMessage;
      mockFetch.mockRejectedValueOnce(mockError);

      // Store now throws errors instead of returning false
      await expect(store.deleteProject(projectUuid)).rejects.toThrow(errorMessage);
      expect(store.error).toBe(errorMessage);
      // Metadata should remain in store on error
      const projectMetadata = store.projects.find(
        (p) => p.uuid === projectUuid
      );
      expect(projectMetadata).toEqual({
        uuid: "project-1",
        project_id: "P001",
        project_name: "Test Project",
        project_status: "Pending",
        project_start_date: "2023-01-01",
        estimated_amount: 100000,
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        corporation_uuid: "corp-1",
        is_active: true,
      });
    });

    it("should handle delete project error with estimates constraint", async () => {
      // First, add a project to the store
      const existingProject = {
        id: 1,
        uuid: "project-1",
        project_name: "Test Project",
        project_id: "P001",
        estimated_amount: 100000,
        corporation_uuid: "corp-1",
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        project_status: "Pending",
        project_start_date: "2023-01-01",
        created_at: "2023-01-01T00:00:00Z",
        is_active: true,
      };
      store.setProjects([existingProject]);

      const projectUuid = "project-1";
      const errorMessage = "Cannot delete project. It is currently being used by 2 active estimate(s).";
      const mockError = new Error(errorMessage);
      (mockError as any).statusCode = 400;
      (mockError as any).statusMessage = errorMessage;
      (mockError as any).data = {
        estimateList: ["EST-001", "EST-002"],
        count: 2,
        hasMore: false
      };
      mockFetch.mockRejectedValueOnce(mockError);

      // Store now throws errors instead of returning false
      await expect(store.deleteProject(projectUuid)).rejects.toThrow();
      expect(store.error).toBe(errorMessage);
      // Metadata should remain in store on error
      const projectMetadata = store.projects.find(
        (p) => p.uuid === projectUuid
      );
      expect(projectMetadata).toBeDefined();
    });
  });

  describe("getProjectById", () => {
    beforeEach(() => {
      store.clearProjects();
      store.clearCache("corp-1");
    });

    const mockProjects = [
      {
        id: 1,
        uuid: "project-1",
        project_name: "Test Project 1",
        project_id: "P001",
        project_status: "Pending",
        project_start_date: "2023-01-01",
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        corporation_uuid: "corp-1",
        estimated_amount: 100000,
        corporationId: "corp-1",
        is_active: true,
      },
      {
        id: 2,
        uuid: "project-2",
        project_name: "Test Project 2",
        project_id: "P002",
        project_status: "In Progress",
        project_start_date: "2023-01-02",
        project_type_uuid: "pt-2",
        service_type_uuid: "st-2",
        corporation_uuid: "corp-1",
        estimated_amount: 200000,
        corporationId: "corp-1",
        is_active: true,
      },
      {
        id: 3,
        uuid: "project-3",
        project_name: "Test Project 3",
        project_id: "P003",
        project_status: "Pending",
        project_start_date: "2023-01-03",
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        corporation_uuid: "corp-1",
        estimated_amount: 150000,
        corporationId: "corp-1",
        is_active: true,
      },
    ];

    beforeEach(async () => {
      mockDbHelpers.getProjects.mockResolvedValueOnce(mockProjects);
      await store.fetchProjectsMetadata("corp-1");
    });

    it("should return project metadata by UUID", () => {
      const project = store.getProjectById("project-1");
      expect(project).toEqual({
        uuid: "project-1",
        project_name: "Test Project 1",
        project_id: "P001",
        project_status: "Pending",
        project_start_date: "2023-01-01",
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        corporation_uuid: "corp-1",
        estimated_amount: 100000,
        is_active: true,
      });
    });

    it("should return undefined for non-existent project", () => {
      const project = store.getProjectById("non-existent");
      expect(project).toBeUndefined();
    });
  });

  describe("getProjectsByStatus", () => {
    beforeEach(() => {
      store.clearProjects();
      store.clearCache("corp-1");
    });

    const mockProjects = [
      {
        id: 1,
        uuid: "project-1",
        project_name: "Test Project 1",
        project_id: "P001",
        project_status: "Pending",
        project_start_date: "2023-01-01",
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        corporation_uuid: "corp-1",
        estimated_amount: 100000,
        corporationId: "corp-1",
        is_active: true,
      },
      {
        id: 2,
        uuid: "project-2",
        project_name: "Test Project 2",
        project_id: "P002",
        project_status: "Pending",
        project_start_date: "2023-01-02",
        project_type_uuid: "pt-2",
        service_type_uuid: "st-2",
        corporation_uuid: "corp-1",
        estimated_amount: 200000,
        corporationId: "corp-1",
        is_active: true,
      },
      {
        id: 3,
        uuid: "project-3",
        project_name: "Test Project 3",
        project_id: "P003",
        project_status: "In Progress",
        project_start_date: "2023-01-03",
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        corporation_uuid: "corp-1",
        estimated_amount: 150000,
        corporationId: "corp-1",
        is_active: true,
      },
    ];

    beforeEach(async () => {
      mockDbHelpers.getProjects.mockResolvedValueOnce(mockProjects);
      await store.fetchProjectsMetadata("corp-1");
    });

    it("should return projects by status", () => {
      const pendingProjects = store.getProjectsByStatus("Pending");
      expect(pendingProjects).toHaveLength(2);
      expect(pendingProjects.every((p) => p.project_status === "Pending")).toBe(
        true
      );

      const inProgressProjects = store.getProjectsByStatus("In Progress");
      expect(inProgressProjects).toHaveLength(1);
      expect(inProgressProjects[0].project_status).toBe("In Progress");
    });

    it("should return empty array for non-existent status", () => {
      const completedProjects = store.getProjectsByStatus("Completed");
      expect(completedProjects).toEqual([]);
    });
  });

  describe("getProjectsByType", () => {
    beforeEach(() => {
      store.clearProjects();
      store.clearCache("corp-1");
    });

    const mockProjects = [
      {
        id: 1,
        uuid: "project-1",
        project_name: "Test Project 1",
        project_id: "P001",
        project_type_uuid: "pt-1",
        project_status: "Pending",
        project_start_date: "2023-01-01",
        service_type_uuid: "st-1",
        corporation_uuid: "corp-1",
        estimated_amount: 100000,
        corporationId: "corp-1",
        is_active: true,
      },
      {
        id: 2,
        uuid: "project-2",
        project_name: "Test Project 2",
        project_id: "P002",
        project_type_uuid: "pt-2",
        project_status: "In Progress",
        project_start_date: "2023-01-02",
        service_type_uuid: "st-1",
        corporation_uuid: "corp-1",
        estimated_amount: 150000,
        corporationId: "corp-1",
        is_active: true,
      },
      {
        id: 3,
        uuid: "project-3",
        project_name: "Test Project 3",
        project_id: "P003",
        project_type_uuid: "pt-1",
        project_status: "Pending",
        project_start_date: "2023-01-03",
        service_type_uuid: "st-1",
        corporation_uuid: "corp-1",
        estimated_amount: 200000,
        corporationId: "corp-1",
        is_active: true,
      },
    ];

    beforeEach(async () => {
      mockDbHelpers.getProjects.mockResolvedValueOnce(mockProjects);
      await store.fetchProjectsMetadata("corp-1");
    });

    it("should return projects by type", () => {
      const residentialProjects = store.getProjectsByType("pt-1");
      expect(residentialProjects).toHaveLength(2);
      expect(
        residentialProjects.every((p) => p.project_type_uuid === "pt-1")
      ).toBe(true);

      const commercialProjects = store.getProjectsByType("pt-2");
      expect(commercialProjects).toHaveLength(1);
      expect(commercialProjects[0].project_type_uuid).toBe("pt-2");
    });
  });

  describe("clearError", () => {
    it("should clear error state", async () => {
      // Set an error by triggering a failed fetch from both IndexedDB and API
      mockDbHelpers.getProjects.mockRejectedValueOnce(
        new Error("IndexedDB error")
      );
      mockFetch.mockRejectedValueOnce(new Error("Test error"));
      await store.fetchProjectsMetadata("corp-1");
      expect(store.error).toBe("Test error");

      store.clearError();
      expect(store.error).toBe(null);
    });
  });

  describe("clearProjects", () => {
    it("should clear projects metadata and currentProject", async () => {
      // First, add some projects to the store
      const mockProjects = [
        {
          id: 1,
          uuid: "project-1",
          project_name: "Test Project 1",
          project_id: "P001",
          corporation_uuid: "corp-1",
          project_type_uuid: "pt-1",
          service_type_uuid: "st-1",
          estimated_amount: 100000,
          project_status: "Pending",
          project_start_date: "2023-01-01",
          created_at: "2023-01-01T00:00:00Z",
          is_active: true,
        },
        {
          id: 2,
          uuid: "project-2",
          project_name: "Test Project 2",
          project_id: "P002",
          corporation_uuid: "corp-1",
          project_type_uuid: "pt-1",
          service_type_uuid: "st-1",
          estimated_amount: 200000,
          project_status: "In Progress",
          project_start_date: "2023-01-02",
          created_at: "2023-01-02T00:00:00Z",
          is_active: true,
        },
      ];
      store.setProjects(mockProjects);
      expect(store.projects).toHaveLength(2);

      store.clearProjects();
      expect(store.projects).toEqual([]);
      expect(store.currentProject).toBeNull();
    });
  });

  describe("Project Statistics", () => {
    beforeEach(() => {
      store.clearProjects();
      store.clearCache("corp-1");
    });

    const mockProjects = [
      {
        id: 1,
        uuid: "project-1",
        project_name: "Test Project 1",
        project_id: "P001",
        project_status: "Pending",
        project_start_date: "2023-01-01",
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        corporation_uuid: "corp-1",
        estimated_amount: 100000,
        corporationId: "corp-1",
        is_active: true,
      },
      {
        id: 2,
        uuid: "project-2",
        project_name: "Test Project 2",
        project_id: "P002",
        project_status: "In Progress",
        project_start_date: "2023-01-02",
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        corporation_uuid: "corp-1",
        estimated_amount: 200000,
        corporationId: "corp-1",
        is_active: true,
      },
      {
        id: 3,
        uuid: "project-3",
        project_name: "Test Project 3",
        project_id: "P003",
        project_status: "Completed",
        project_start_date: "2023-01-03",
        project_type_uuid: "pt-1",
        service_type_uuid: "st-1",
        corporation_uuid: "corp-1",
        estimated_amount: 150000,
        corporationId: "corp-1",
        is_active: true,
      },
    ];

    beforeEach(async () => {
      mockDbHelpers.getProjects.mockResolvedValueOnce(mockProjects);
      await store.fetchProjectsMetadata("corp-1");
    });

    it("should calculate total estimated amount", () => {
      const total = store.getTotalEstimatedAmount();
      expect(total).toBe(450000);
    });

    it("should get project count by status", () => {
      const statusCounts = store.getProjectCountByStatus();
      expect(statusCounts).toEqual({
        Pending: 1,
        "In Progress": 1,
        Completed: 1,
      });
    });

    it("should get average project amount", () => {
      const average = store.getAverageProjectAmount();
      expect(average).toBe(150000);
    });
  });

})
