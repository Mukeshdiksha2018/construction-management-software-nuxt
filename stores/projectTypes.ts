import { defineStore } from 'pinia'

export interface ProjectType {
  id?: number;
  uuid?: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useProjectTypesStore = defineStore("projectTypes", () => {
  // State
  const projectTypes = ref<ProjectType[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Cache management
  const hasFetchedData = ref(false);

  // Getters
  const getAllProjectTypes = computed(() => {
    return projectTypes.value;
  });

  const getActiveProjectTypes = computed(() => {
    return projectTypes.value.filter((pt) => pt.isActive);
  });

  // Actions
  const fetchProjectTypes = async (forceRefresh = false) => {
    // Skip fetch if we have valid cached data and not forcing refresh
    if (!forceRefresh && hasFetchedData.value) {
      console.log("ProjectTypes: Using cached data");
      return;
    }

    console.log("ProjectTypes: Fetching all project types, forceRefresh:", forceRefresh);

    // Only fetch on client side to avoid SSR issues
    if (process.server) {
      return;
    }
    loading.value = true;
    error.value = null;

    try {
      const { data } = await $fetch<{ data: ProjectType[] }>(`/api/project-types`);

      projectTypes.value = data || [];
      hasFetchedData.value = true;
    } catch (err: any) {
      error.value = err.message || "Failed to fetch project types";
      console.error("Error fetching project types:", err);
      projectTypes.value = [];
      hasFetchedData.value = false;
    } finally {
      loading.value = false;
    }
  };

  const createProjectType = async (
    projectTypeData: Omit<ProjectType, "id" | "uuid" | "created_at" | "updated_at">
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await $fetch<{ data: ProjectType }>(
        "/api/project-types",
        {
          method: "POST",
          body: projectTypeData,
        }
      );

      if (data) {
        projectTypes.value.unshift(data);
      }

      return data;
    } catch (err: any) {
      error.value = err.message || "Failed to create project type";
      console.error("Error creating project type:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateProjectType = async (
    id: string,
    projectTypeData: Partial<ProjectType>
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await $fetch<{ data: ProjectType }>(
        `/api/project-types/${id}`,
        {
          method: "PUT",
          body: projectTypeData,
        }
      );

      if (data) {
        const index = projectTypes.value.findIndex(
          (pt) => pt.id?.toString() === id
        );
        if (index !== -1) {
          projectTypes.value[index] = data;
        }
      }

      return data;
    } catch (err: any) {
      error.value = err.message || "Failed to update project type";
      console.error("Error updating project type:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteProjectType = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      await $fetch(`/api/project-types/${id}`, {
        method: "DELETE",
      });

      // Find and remove the project type by id
      const index = projectTypes.value.findIndex(
        (pt) => pt.id?.toString() === id
      );
      if (index !== -1) {
        projectTypes.value.splice(index, 1);
      }
    } catch (err: any) {
      error.value = err.message || "Failed to delete project type";
      console.error("Error deleting project type:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  const clearProjectTypes = () => {
    projectTypes.value = [];
    hasFetchedData.value = false;
  };

  // Helper method to force refresh from API
  const refreshProjectTypesFromAPI = async () => {
    return await fetchProjectTypes(true);
  };

  // Additional getters for tests
  const getProjectTypeById = computed(() => {
    return (uuid: string) => {
      return projectTypes.value.find((pt) => pt.uuid === uuid);
    };
  });

  const getProjectTypeCount = computed(() => {
    return projectTypes.value.length;
  });

  const getActiveProjectTypeCount = computed(() => {
    return projectTypes.value.filter((pt) => pt.isActive).length;
  });

  const projectTypeExists = computed(() => {
    return (uuid: string) => {
      return projectTypes.value.some((pt) => pt.uuid === uuid);
    };
  });

  return {
    // State
    projectTypes: readonly(projectTypes),
    loading: readonly(loading),
    error: readonly(error),

    // Getters
    getAllProjectTypes,
    getActiveProjectTypes,
    getProjectTypeById,
    getProjectTypeCount,
    getActiveProjectTypeCount,
    projectTypeExists,

    // Actions
    fetchProjectTypes,
    createProjectType,
    updateProjectType,
    deleteProjectType,
    clearError,
    clearProjectTypes,
    refreshProjectTypesFromAPI,
  };
});