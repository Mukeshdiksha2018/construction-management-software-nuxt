export interface Project {
  id: number;
  uuid: string;
  created_at: string;
  updated_at: string;
  corporation_uuid: string;

  // Basic project information
  project_name: string;
  project_id: string;
  project_type_uuid: string;
  service_type_uuid: string;
  project_description?: string;

  // Project details
  estimated_amount: number;
  area_sq_ft?: number;
  no_of_rooms?: number;
  contingency_percentage: number;
  customer_name?: string;
  customer_uuid?: string | null;
  project_status: "Pending" | "In Progress" | "Completed" | "On Hold";

  // Project dates
  project_start_date?: string;
  project_estimated_completion_date?: string;

  // Project options
  only_total: boolean;
  enable_labor: boolean;
  enable_material: boolean;

  // Address reference
  project_address_uuid?: string | null;

  // Attachments
  attachments: any[];

  // Status
  is_active: boolean;
}

export interface CreateProjectPayload {
  corporation_uuid: string;
  project_name: string;
  project_id: string;
  project_type_uuid: string;
  service_type_uuid: string;
  project_description?: string;
  estimated_amount?: number;
  area_sq_ft?: number;
  no_of_rooms?: number;
  contingency_percentage?: number;
  customer_name?: string;
  customer_uuid?: string | null;
  project_status?: "Pending" | "In Progress" | "Completed" | "On Hold";
  project_start_date?: string;
  project_estimated_completion_date?: string;
  only_total?: boolean;
  enable_labor?: boolean;
  enable_material?: boolean;
  project_address_uuid?: string | null;
  attachments?: any[];
}

export interface UpdateProjectPayload extends Partial<CreateProjectPayload> {
  uuid: string;
  project_address_uuid?: string | null;
}

export interface ProjectResponse {
  data: Project;
  error?: string;
}

export interface ProjectsResponse {
  data: Project[];
  error?: string;
}

// Lightweight metadata for project lists
export interface ProjectMetadata {
  uuid: string;
  project_id: string;
  project_name: string;
  project_status: "Pending" | "In Progress" | "Completed" | "On Hold";
  project_start_date?: string;
  project_estimated_completion_date?: string;
  estimated_amount: number;
  project_type_uuid: string;
  service_type_uuid: string;
  corporation_uuid: string;
  is_active: boolean;
}

export const useProjectsStore = defineStore(
  "projects",
  () => {
    // HYBRID APPROACH: Store only metadata for lists, not full projects
    const projectsMetadata = ref<ProjectMetadata[]>([]);

    // Current project being viewed/edited (full data, reactive)
    const currentProject = ref<Project | null>(null);

    const loading = ref(false);
    const error = ref<string | null>(null);

    // Cache management
    const lastFetchedCorporation = ref<string | null>(null);
    const hasDataForCorporation = ref<Set<string>>(new Set());

    // For backward compatibility - returns metadata as projects
    const projects = computed(() => projectsMetadata.value as any[]);

    // Check if we need to fetch data
    const shouldFetchData = (corporationUUID: string) => {
      // If it's a different corporation, always fetch
      if (lastFetchedCorporation.value !== corporationUUID) {
        return true;
      }

      // If we already have data for this corporation, don't fetch again
      if (hasDataForCorporation.value.has(corporationUUID)) {
        return false;
      }

      return true;
    };

    /**
     * Fetch project metadata from IndexedDB for a specific corporation
     * Returns true if data was found, false if IndexedDB is empty
     */
    const fetchProjectsMetadataFromDB = async (
      corporationUUID: string
    ): Promise<boolean> => {
      loading.value = true;
      error.value = null;

      try {
        const { dbHelpers } = await import("@/utils/indexedDb");
        const dbProjects = await dbHelpers.getProjects(corporationUUID);

        // If IndexedDB is empty, return false to indicate we need to fetch from API
        if (!dbProjects || dbProjects.length === 0) {
          projectsMetadata.value = [];
          loading.value = false;
          return false;
        }

        // Extract only metadata fields to minimize RAM usage
        projectsMetadata.value = dbProjects.map((project: any) => ({
          uuid: project.uuid,
          project_id: project.project_id,
          project_name: project.project_name,
          project_status: project.project_status,
          project_start_date: project.project_start_date,
          project_estimated_completion_date:
            project.project_estimated_completion_date,
          estimated_amount: project.estimated_amount,
          project_type_uuid: project.project_type_uuid,
          service_type_uuid: project.service_type_uuid,
          corporation_uuid: project.corporation_uuid,
          is_active: project.is_active,
        })) as ProjectMetadata[];

        // Update cache info
        lastFetchedCorporation.value = corporationUUID;
        hasDataForCorporation.value.add(corporationUUID);
        loading.value = false;
        return true;
      } catch (err: any) {
        error.value =
          err.message || "Failed to fetch projects metadata from IndexedDB";
        projectsMetadata.value = [];
        loading.value = false;
        return false;
      }
    };

    /**
     * Fetch project metadata only (lightweight) for a specific corporation
     * Used for lists - doesn't load full project data
     * Works like ChartOfAccounts: tries IndexedDB first, then falls back to API
     */
    const fetchProjectsMetadata = async (
      corporationUUID: string,
      forceRefresh = false,
      useIndexedDB = true
    ) => {
      // By default, fetch from IndexedDB (faster, cached data)
      // Set useIndexedDB=false to force API fetch
      if (useIndexedDB && !forceRefresh) {
        const hasData = await fetchProjectsMetadataFromDB(corporationUUID);
        // If IndexedDB has data, we're done. Otherwise, fall through to API fetch
        if (hasData) {
          return;
        }
        // IndexedDB is empty, continue to fetch from API
      }

      // Skip fetch if we have valid cached data and not forcing refresh
      if (!forceRefresh && !shouldFetchData(corporationUUID)) {
        return;
      }

      // Only fetch on client side to avoid SSR issues
      if (process.server) {
        return;
      }

      loading.value = true;
      error.value = null;
      try {
        const { apiFetch } = useApiClient();
        const response = (await apiFetch(
          `/api/projects?corporation_uuid=${corporationUUID}`
        )) as any;
        if (response?.error) throw new Error(response.error);

        // Handle different response types
        let projectsData: Project[] = [];
        if (response?.data) {
          projectsData = response.data || [];
        } else {
          projectsData = response || [];
        }

        // Extract only metadata fields to minimize RAM usage
        projectsMetadata.value = projectsData.map((project: any) => ({
          uuid: project.uuid,
          project_id: project.project_id,
          project_name: project.project_name,
          project_status: project.project_status,
          project_start_date: project.project_start_date,
          project_estimated_completion_date:
            project.project_estimated_completion_date,
          estimated_amount: project.estimated_amount,
          project_type_uuid: project.project_type_uuid,
          service_type_uuid: project.service_type_uuid,
          corporation_uuid: project.corporation_uuid,
          is_active: project.is_active,
        })) as ProjectMetadata[];

        // Sync full projects data to IndexedDB to keep it in sync
        try {
          const { dbHelpers } = await import("@/utils/indexedDb");
          await dbHelpers.saveProjects(corporationUUID, projectsData);
        } catch (dbError) {
          console.warn("Failed to sync projects to IndexedDB:", dbError);
        }

        // Update cache info
        lastFetchedCorporation.value = corporationUUID;
        hasDataForCorporation.value.add(corporationUUID);
      } catch (err: any) {
        console.error("Error fetching projects metadata:", err);
        error.value = err.message || "Failed to fetch projects metadata";
        projectsMetadata.value = [];
        // Clear cache on error to ensure fresh fetch next time
        hasDataForCorporation.value.delete(corporationUUID);
      } finally {
        loading.value = false;
      }
    };

    /**
     * Load a single full project from IndexedDB into currentProject
     * Used when viewing/editing a specific project
     */
    const loadCurrentProject = async (
      projectUuid: string,
      corporationUUID: string
    ): Promise<boolean> => {
      loading.value = true;
      error.value = null;
      try {
        const { dbHelpers } = await import("@/utils/indexedDb");
        const dbProjects = await dbHelpers.getProjects(corporationUUID);

        const project = dbProjects.find((p: any) => p.uuid === projectUuid);

        if (!project) {
          throw new Error("Project not found in IndexedDB");
        }

        // Remove the corporationId field and set as currentProject
        const { corporationId, ...projectData } = project;
        currentProject.value = projectData as Project;

        return true;
      } catch (err: any) {
        error.value = err.message || "Failed to load project";
        currentProject.value = null;
        return false;
      } finally {
        loading.value = false;
      }
    };

    /**
     * Clear currentProject when done editing/viewing
     */
    const clearCurrentProject = () => {
      currentProject.value = null;
    };

    /**
     * Fetch all projects for a specific corporation (LEGACY - use fetchProjectsMetadata instead)
     * @deprecated Use fetchProjectsMetadata for lists and loadCurrentProject for viewing/editing
     */
    const fetchProjects = async (
      corporationUUID: string,
      forceRefresh = false,
      useIndexedDB = true
    ) => {
      // Use the new metadata approach, respecting useIndexedDB flag
      return fetchProjectsMetadata(corporationUUID, forceRefresh, useIndexedDB);
    };

    /**
     * Fetch a single project by UUID
     */
    const fetchProject = async (uuid: string): Promise<Project | null> => {
      loading.value = true;
      error.value = null;
      try {
        const { apiFetch } = useApiClient();
        const response = await apiFetch<ProjectResponse>(`/api/projects/${uuid}`);
        if (response?.error) throw new Error(response.error);
        return response?.data || null;
      } catch (err: any) {
        error.value = err.message || "Failed to fetch project";
        return null;
      } finally {
        loading.value = false;
      }
    };

    /**
     * Create a new project
     */
    const createProject = async (
      projectData: CreateProjectPayload
    ): Promise<Project | null> => {
      loading.value = true;
      error.value = null;
      try {
        const { apiFetch } = useApiClient();
        const response = await apiFetch<ProjectResponse>("/api/projects", {
          method: "POST",
          body: projectData,
        });
        if (response?.error) throw new Error(response.error);

        const newProject = response?.data;
        if (newProject) {
          // Add metadata to the beginning of the array (most recent first)
          const metadata: ProjectMetadata = {
            uuid: newProject.uuid,
            project_id: newProject.project_id,
            project_name: newProject.project_name,
            project_status: newProject.project_status,
            project_start_date: newProject.project_start_date,
            project_estimated_completion_date:
              newProject.project_estimated_completion_date,
            estimated_amount: newProject.estimated_amount,
            project_type_uuid: newProject.project_type_uuid,
            service_type_uuid: newProject.service_type_uuid,
            corporation_uuid: newProject.corporation_uuid,
            is_active: newProject.is_active,
          };
          projectsMetadata.value.unshift(metadata);

          // Set as current project
          currentProject.value = newProject;

          // Sync to IndexedDB to keep it in sync
          try {
            const { dbHelpers } = await import("@/utils/indexedDb");
            await dbHelpers.addProject(
              projectData.corporation_uuid,
              newProject
            );
          } catch (dbError) {
            console.warn("Failed to sync project to IndexedDB:", dbError);
          }

          // Clear cache to ensure fresh data on next fetch
          hasDataForCorporation.value.delete(projectData.corporation_uuid);
        }
        return newProject || null;
      } catch (err: any) {
        error.value = err.message || "Failed to create project";
        return null;
      } finally {
        loading.value = false;
      }
    };

    /**
     * Update an existing project
     */
    const updateProject = async (
      projectData: UpdateProjectPayload
    ): Promise<Project | null> => {
      loading.value = true;
      error.value = null;
      try {
        const response = await $fetch<ProjectResponse>("/api/projects", {
          method: "PUT",
          body: projectData,
        });
        if (response?.error) throw new Error(response.error);

        const updatedProject = response?.data;
        if (updatedProject) {
          // Update the metadata in the array
          const index = projectsMetadata.value.findIndex(
            (p) => p.uuid === updatedProject.uuid
          );
          if (index !== -1) {
            const metadata: ProjectMetadata = {
              uuid: updatedProject.uuid,
              project_id: updatedProject.project_id,
              project_name: updatedProject.project_name,
              project_status: updatedProject.project_status,
              project_start_date: updatedProject.project_start_date,
              project_estimated_completion_date:
                updatedProject.project_estimated_completion_date,
              estimated_amount: updatedProject.estimated_amount,
              project_type_uuid: updatedProject.project_type_uuid,
              service_type_uuid: updatedProject.service_type_uuid,
              corporation_uuid: updatedProject.corporation_uuid,
              is_active: updatedProject.is_active,
            };
            projectsMetadata.value[index] = metadata;

            // Update currentProject if it's the one being edited
            if (currentProject.value?.uuid === updatedProject.uuid) {
              currentProject.value = updatedProject;
            }

            // Sync to IndexedDB to keep it in sync
            try {
              const { dbHelpers } = await import("@/utils/indexedDb");
              await dbHelpers.updateProject(
                updatedProject.corporation_uuid,
                updatedProject.uuid,
                updatedProject
              );
            } catch (dbError) {
              console.warn(
                "Failed to sync updated project to IndexedDB:",
                dbError
              );
            }

            // Clear cache to ensure fresh data on next fetch
            hasDataForCorporation.value.delete(updatedProject.corporation_uuid);
          }
        }
        return updatedProject || null;
      } catch (err: any) {
        error.value = err.message || "Failed to update project";
        return null;
      } finally {
        loading.value = false;
      }
    };

    /**
     * Delete a project (soft delete)
     */
    const deleteProject = async (uuid: string): Promise<boolean> => {
      loading.value = true;
      error.value = null;
      try {
        const response = await $fetch<ProjectResponse>("/api/projects", {
          method: "DELETE",
          query: { uuid },
        });
        if (response?.error) throw new Error(response.error);

        // Find the project metadata to get corporation_uuid before deletion
        const projectToDelete = projectsMetadata.value.find(
          (p) => p.uuid === uuid
        );

        // Remove from the metadata array
        const index = projectsMetadata.value.findIndex((p) => p.uuid === uuid);
        if (index !== -1) {
          projectsMetadata.value.splice(index, 1);

          // Clear currentProject if it's the one being deleted
          if (currentProject.value?.uuid === uuid) {
            currentProject.value = null;
          }

          // Sync deletion to IndexedDB
          if (projectToDelete?.corporation_uuid) {
            try {
              const { dbHelpers } = await import("@/utils/indexedDb");
              await dbHelpers.deleteProject(
                projectToDelete.corporation_uuid,
                uuid
              );
            } catch (dbError) {
              console.warn(
                "Failed to sync project deletion to IndexedDB:",
                dbError
              );
            }

            // Clear cache to ensure fresh data on next fetch
            hasDataForCorporation.value.delete(
              projectToDelete.corporation_uuid
            );
          }
        }
        return true;
      } catch (err: any) {
        // Preserve error message, but also log full error details for debugging
        error.value = err.message || err.statusMessage || "Failed to delete project";
        console.error("Error deleting project:", {
          message: err.message,
          statusCode: err.statusCode,
          statusMessage: err.statusMessage,
          data: err.data
        });
        // Re-throw the error so component can access statusCode and data
        throw err;
      } finally {
        loading.value = false;
      }
    };

    /**
     * Hard delete a project (permanent deletion)
     */
    const hardDeleteProject = async (uuid: string): Promise<boolean> => {
      loading.value = true;
      error.value = null;
      try {
        const response = await $fetch<ProjectResponse>(
          `/api/projects/${uuid}`,
          {
            method: "DELETE",
          }
        );
        if (response?.error) throw new Error(response.error);

        // Remove from the array
        const index = projects.value.findIndex((p) => p.uuid === uuid);
        if (index !== -1) {
          projects.value.splice(index, 1);
        }
        return true;
      } catch (err: any) {
        error.value = err.message || "Failed to delete project";
        return false;
      } finally {
        loading.value = false;
      }
    };

    /**
     * Get projects by status (returns metadata only)
     */
    const getProjectsByStatus = (
      status: Project["project_status"]
    ): ProjectMetadata[] => {
      return projectsMetadata.value.filter(
        (project) => project.project_status === status
      );
    };

    /**
     * Get projects by type (returns metadata only)
     */
    const getProjectsByType = (typeUuid: string): ProjectMetadata[] => {
      return projectsMetadata.value.filter(
        (project) => project.project_type_uuid === typeUuid
      );
    };

    /**
     * Get projects by service type (returns metadata only)
     */
    const getProjectsByServiceType = (
      serviceTypeUuid: string
    ): ProjectMetadata[] => {
      return projectsMetadata.value.filter(
        (project) => project.service_type_uuid === serviceTypeUuid
      );
    };

    /**
     * Search projects by name or ID (returns metadata only)
     */
    const searchProjects = (query: string): ProjectMetadata[] => {
      if (!query.trim()) return projectsMetadata.value;

      const lowercaseQuery = query.toLowerCase();
      return projectsMetadata.value.filter(
        (project) =>
          project.project_name.toLowerCase().includes(lowercaseQuery) ||
          project.project_id.toLowerCase().includes(lowercaseQuery)
      );
    };

    /**
     * Get project statistics (uses metadata)
     */
    const getProjectStats = () => {
      const total = projectsMetadata.value.length;
      const byStatus = {
        pending: projectsMetadata.value.filter(
          (p) => p.project_status === "Pending"
        ).length,
        inProgress: projectsMetadata.value.filter(
          (p) => p.project_status === "In Progress"
        ).length,
        completed: projectsMetadata.value.filter(
          (p) => p.project_status === "Completed"
        ).length,
        onHold: projectsMetadata.value.filter(
          (p) => p.project_status === "On Hold"
        ).length,
      };

      const totalEstimatedAmount = projectsMetadata.value.reduce(
        (sum, project) => sum + (project.estimated_amount || 0),
        0
      );

      return {
        total,
        byStatus,
        totalEstimatedAmount,
      };
    };

    /**
     * Clear all data (useful for logout)
     */
    const clearData = () => {
      projectsMetadata.value = [];
      currentProject.value = null;
      error.value = null;
      lastFetchedCorporation.value = null;
      hasDataForCorporation.value.clear();
    };

    // Additional methods for tests
    const getProjectById = (uuid: string): ProjectMetadata | undefined => {
      return projectsMetadata.value.find((p) => p.uuid === uuid);
    };

    const clearError = () => {
      error.value = null;
    };

    const clearProjects = () => {
      projectsMetadata.value = [];
      currentProject.value = null;
    };

    // Test helper method to set projects directly
    const setProjects = (newProjects: Project[]) => {
      // Convert to metadata
      projectsMetadata.value = newProjects.map((project) => ({
        uuid: project.uuid,
        project_id: project.project_id,
        project_name: project.project_name,
        project_status: project.project_status,
        project_start_date: project.project_start_date,
        project_estimated_completion_date:
          project.project_estimated_completion_date,
        estimated_amount: project.estimated_amount,
        project_type_uuid: project.project_type_uuid,
        service_type_uuid: project.service_type_uuid,
        corporation_uuid: project.corporation_uuid,
        is_active: project.is_active,
      }));
    };

    const getTotalEstimatedAmount = (): number => {
      return projectsMetadata.value.reduce(
        (sum, project) => sum + (project.estimated_amount || 0),
        0
      );
    };

    const getProjectCountByStatus = () => {
      const counts: Record<string, number> = {};
      projectsMetadata.value.forEach((project) => {
        counts[project.project_status] =
          (counts[project.project_status] || 0) + 1;
      });
      return counts;
    };

    const getAverageProjectAmount = (): number => {
      if (projectsMetadata.value.length === 0) return 0;
      return getTotalEstimatedAmount() / projectsMetadata.value.length;
    };

    // Helper method to force refresh from API (bypassing IndexedDB)
    const refreshProjectsFromAPI = async (corporationUUID: string) => {
      return await fetchProjectsMetadata(corporationUUID, true, false);
    };

    // Clear cache for a specific corporation
    const clearCache = (corporationUUID?: string) => {
      if (
        !corporationUUID ||
        lastFetchedCorporation.value === corporationUUID
      ) {
        projectsMetadata.value = [];
        lastFetchedCorporation.value = null;
        hasDataForCorporation.value.clear();
      } else {
        hasDataForCorporation.value.delete(corporationUUID);
      }
    };

    return {
      // State - HYBRID APPROACH
      projects: readonly(projects), // For backward compatibility (returns metadata)
      projectsMetadata: readonly(projectsMetadata), // Lightweight metadata for lists
      currentProject, // Reactive full project being viewed/edited
      loading: readonly(loading),
      error: readonly(error),

      // Actions - New hybrid methods
      fetchProjectsMetadata,
      loadCurrentProject,
      clearCurrentProject,

      // Actions - Legacy (for compatibility)
      fetchProjects, // Uses fetchProjectsMetadata under the hood
      fetchProject,
      createProject,
      updateProject,
      deleteProject,
      hardDeleteProject,
      clearData,
      refreshProjectsFromAPI,
      clearCache,
      clearError,
      clearProjects,
      setProjects,

      // Getters
      getProjectsByStatus,
      getProjectsByType,
      getProjectsByServiceType,
      searchProjects,
      getProjectStats,
      getProjectById,
      getTotalEstimatedAmount,
      getProjectCountByStatus,
      getAverageProjectAmount,
    };
  },
  {
    persist: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      paths: ["lastFetchedCorporation", "hasDataForCorporation"],
    },
  }
);
