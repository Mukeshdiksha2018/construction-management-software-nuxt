import { defineStore } from "pinia";
import { reactive, computed } from "vue";

type Nullable<T> = T | null | undefined;

interface CorporationProjectsState {
  corporationUuid: string;
  projects: any[];
  loading: boolean;
  loaded: boolean;
  fetchedAt: number | null;
}

/**
 * Purchase Order List Resources Store
 *
 * IMPORTANT: This store is completely isolated from global stores.
 * - Does NOT use or import: projectsStore
 * - Does NOT update IndexedDB (which global stores depend on)
 * - Does NOT trigger any side effects in global stores
 * - All data is fetched directly from API and stored only in this store's reactive state
 * - This store is scoped to the corporation selected in PurchaseOrdersList filters
 * - Global stores remain scoped to the corporation selected in TopBar.vue
 */
export const usePurchaseOrderListResourcesStore = defineStore(
  "purchaseOrderListResources",
  () => {
    const corporationProjects = reactive<Record<string, CorporationProjectsState>>({});

    const getOrCreateCorporationState = (corporationUuid: string) => {
      if (!corporationProjects[corporationUuid]) {
        corporationProjects[corporationUuid] = {
          corporationUuid,
          projects: [],
          loading: false,
          loaded: false,
          fetchedAt: null,
        };
      }
      return corporationProjects[corporationUuid];
    };

    const ensureProjects = async ({
      corporationUuid,
      force = false,
    }: {
      corporationUuid: string;
      force?: boolean;
    }) => {
      if (!corporationUuid) {
        return [];
      }

      const state = getOrCreateCorporationState(corporationUuid);

      if (state.loaded && !force) {
        return state.projects;
      }

      if (state.loading && !force) {
        return state.projects;
      }

      state.loading = true;
      try {
        // Fetch projects directly from API - scoped to this store only
        // NOTE: This does NOT affect the global projectsStore or update IndexedDB
        const response: any = await $fetch("/api/projects", {
          method: "GET",
          query: {
            corporation_uuid: corporationUuid,
          },
        });

        const allProjects = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : [];

        // Filter to active projects only
        const activeProjects = allProjects.filter((project: any) => {
          return project.is_active !== false;
        });

        state.projects = activeProjects.map((project: any) => ({ ...project }));
        state.loaded = true;
        state.fetchedAt = Date.now();
      } catch (error) {
        console.error("[PO List Resources] Failed to load projects", error);
        if (force) {
          state.projects = [];
          state.loaded = false;
        }
      } finally {
        state.loading = false;
      }

      return state.projects;
    };

    const getCorporationState = computed(() => {
      return (corporationUuid?: Nullable<string>) => {
        if (!corporationUuid) return null;
        return corporationProjects[corporationUuid] || null;
      };
    });

    const getProjects = computed(() => {
      return (corporationUuid?: Nullable<string>) => {
        const state = getCorporationState.value(corporationUuid);
        return state?.projects ?? [];
      };
    });

    const getProjectsLoading = computed(() => {
      return (corporationUuid?: Nullable<string>) => {
        const state = getCorporationState.value(corporationUuid);
        return state?.loading ?? false;
      };
    });

    const clearCorporation = (corporationUuid?: Nullable<string>) => {
      if (corporationUuid && corporationProjects[corporationUuid]) {
        delete corporationProjects[corporationUuid];
      }
    };

    const clear = () => {
      Object.keys(corporationProjects).forEach(
        (key) => delete corporationProjects[key]
      );
    };

    return {
      ensureProjects,
      getCorporationState,
      getProjects,
      getProjectsLoading,
      clearCorporation,
      clear,
    };
  }
);

