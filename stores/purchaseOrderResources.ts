import { defineStore } from "pinia";
import { reactive, computed } from "vue";

type Nullable<T> = T | null | undefined;

interface EstimateItemsState {
  key: string;
  estimateUuid: string;
  poItems: any[];
  rawItems: any[];
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
}

interface ProjectResourceState {
  corporationUuid: string;
  projectUuid: string;
  itemTypes: any[];
  itemTypesLoading: boolean;
  itemTypesLoaded: boolean;
  preferredItems: any[];
  preferredItemsLoading: boolean;
  preferredItemsLoaded: boolean;
  preferredItemsPromise: Promise<any[]> | null;
  estimates: any[];
  estimatesLoading: boolean;
  estimatesLoaded: boolean;
  costCodeConfigurations: any[];
  costCodeConfigurationsLoading: boolean;
  costCodeConfigurationsLoaded: boolean;
  costCodeConfigurationsPromise: Promise<any[]> | null;
  estimateItemsMap: Record<string, EstimateItemsState>;
}

interface EnsureArgs {
  corporationUuid: string;
  projectUuid?: string | null;
  estimateUuid?: string | null;
  force?: boolean;
}

const projectKey = (
  corporationUuid?: Nullable<string>,
  projectUuid?: Nullable<string>
) => {
  const corp = corporationUuid ? String(corporationUuid) : "";
  const project = projectUuid ? String(projectUuid) : "";
  return `${corp}::${project}`;
};

const estimateKey = (
  corporationUuid?: Nullable<string>,
  projectUuid?: Nullable<string>,
  estimateUuid?: Nullable<string>
) => {
  const base = projectKey(corporationUuid, projectUuid);
  const estimate = estimateUuid ? String(estimateUuid) : "";
  return `${base}::${estimate}`;
};

const normalizeNumber = (value: any, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toArray = (value: any) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (typeof value === "object") {
    return Object.values(value).filter(Boolean);
  }
  return [];
};

const transformEstimateMaterialItemsToPoItems = (flattened: any[]) => {
  return flattened.map((entry: any) => {
    const unitPrice = normalizeNumber(entry.unit_price, 0);
    const quantity = normalizeNumber(entry.quantity, 0);
    const total =
      entry.total != null
        ? normalizeNumber(entry.total, 0)
        : unitPrice * quantity;

    // Initialize PO values from estimate values
    const poUnitPrice = unitPrice > 0 ? unitPrice : null;
    const poQuantity = quantity > 0 ? quantity : null;
    const poTotal =
      poUnitPrice && poQuantity
        ? Math.round((poUnitPrice * poQuantity + Number.EPSILON) * 100) / 100
        : null;

    // Extract sequence for SequenceSelect matching
    const sequence = entry.sequence || entry.item_sequence || "";

    return {
      cost_code_uuid: entry.cost_code_uuid || null,
      item_type_uuid:
        typeof entry.item_type_uuid === "string" ? entry.item_type_uuid : null,
      sequence_uuid: typeof entry.sequence === "string" ? entry.sequence : null,
      sequence: sequence, // Include sequence for SequenceSelect
      item_sequence: sequence, // Also include as item_sequence for compatibility
      item_uuid: typeof entry.item_uuid === "string" ? entry.item_uuid : null,
      description: entry.description || entry.name || "",
      model_number: entry.model_number || null,
      location_uuid:
        entry.location && typeof entry.location === "string"
          ? entry.location
          : null,
      // Estimate values (for display in greyed out section)
      unit_price: unitPrice,
      quantity: quantity,
      total: total,
      // PO values (editable, initialized from estimate values)
      po_unit_price: poUnitPrice,
      po_quantity: poQuantity,
      po_total: poTotal,
      uom_uuid: entry.unit_uuid || null,
      uom_label: entry.unit_label || entry.unit || null,
      unit_label: entry.unit_label || entry.unit || null,
      uom: entry.unit_label || entry.unit || null,
      approval_checks: Array.isArray(entry.approval_checks)
        ? entry.approval_checks.join(", ")
        : entry.approval_checks || null,
      display_metadata: {
        cost_code_label: entry.cost_code_label,
        cost_code_number: entry.cost_code_number,
        cost_code_name: entry.cost_code_name,
        division_name: entry.division_name,
        item_type_label: entry.item_type_label,
        sequence: sequence, // Preserve sequence in display_metadata
        location_display: entry.location,
        unit_label: entry.unit_label || entry.unit || "",
      },
    };
  });
};

/**
 * Purchase Order Resources Store
 *
 * IMPORTANT: This store is completely isolated from global stores.
 * - Does NOT use or import: itemTypesStore, costCodeConfigurationsStore, estimatesStore, projectsStore
 * - Does NOT update IndexedDB (which global stores depend on)
 * - Does NOT trigger any side effects in global stores
 * - All data is fetched directly from API and stored only in this store's reactive state
 * - This store is scoped to the corporation selected in PurchaseOrderForm.vue
 * - Global stores remain scoped to the corporation selected in TopBar.vue
 */
export const usePurchaseOrderResourcesStore = defineStore(
  "purchaseOrderResources",
  () => {
    const projectResources = reactive<Record<string, ProjectResourceState>>({});

    const getOrCreateProjectState = (
      corporationUuid: string,
      projectUuid?: string | null
    ) => {
      const key = projectKey(corporationUuid, projectUuid);
      if (!projectResources[key]) {
        projectResources[key] = {
          corporationUuid,
          projectUuid: projectUuid || "",
          itemTypes: [],
          itemTypesLoading: false,
          itemTypesLoaded: false,
          preferredItems: [],
          preferredItemsLoading: false,
          preferredItemsLoaded: false,
          preferredItemsPromise: null,
          estimates: [],
          estimatesLoading: false,
          estimatesLoaded: false,
          costCodeConfigurations: [],
          costCodeConfigurationsLoading: false,
          costCodeConfigurationsLoaded: false,
          costCodeConfigurationsPromise: null,
          estimateItemsMap: {},
        };
      }
      return projectResources[key];
    };

    const ensureItemTypes = async ({
      corporationUuid,
      projectUuid,
      force = false,
    }: EnsureArgs) => {
      const state = getOrCreateProjectState(corporationUuid, projectUuid);
      if (state.itemTypesLoaded && !force) {
        return state.itemTypes;
      }

      if (state.itemTypesLoading && !force) {
        return state.itemTypes;
      }

      state.itemTypesLoading = true;
      try {
        // Fetch item types directly from API - scoped to this store only
        // NOTE: This does NOT affect the global itemTypesStore or update IndexedDB
        const { apiFetch } = useApiClient();
        const response: any = await apiFetch("/api/item-types", {
          method: "GET",
          query: {
            corporation_uuid: corporationUuid,
            project_uuid: projectUuid || undefined,
          },
        });

        const allItems = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : [];

        // Filter to active item types and project-specific or corporation-level items
        const activeItems = allItems.filter((item: any) => {
          if (item.is_active === false) return false;
          // If project is specified, include project-specific items or corporation-level items
          if (projectUuid) {
            return !item.project_uuid || item.project_uuid === projectUuid;
          }
          // If no project, include only corporation-level items
          return !item.project_uuid;
        });

        state.itemTypes = activeItems.map((item: any) => ({ ...item }));
        state.itemTypesLoaded = true;
      } catch (error) {
        console.error("[PO Resources] Failed to load item types", error);
        if (force) {
          state.itemTypes = [];
          state.itemTypesLoaded = false;
        }
      } finally {
        state.itemTypesLoading = false;
      }

      return state.itemTypes;
    };

    const ensureCostCodeConfigurations = async ({
      corporationUuid,
      projectUuid,
      force = false,
    }: EnsureArgs) => {

      const state = getOrCreateProjectState(corporationUuid, projectUuid);

      if (state.costCodeConfigurationsLoaded && !force) {
        return state.costCodeConfigurations;
      }

      if (state.costCodeConfigurationsLoading && !force) {
        // Wait for the existing promise to complete
        if (state.costCodeConfigurationsPromise) {
          await state.costCodeConfigurationsPromise;
        }
        return state.costCodeConfigurations;
      }

      state.costCodeConfigurationsLoading = true;

      // Create and store the promise
      const fetchPromise = (async () => {
        try {
          // Fetch cost code configurations directly from API - scoped to this store only
          // NOTE: This does NOT affect the global costCodeConfigurationsStore or update IndexedDB
          // IMPORTANT: Include with_preferred_items to get the preferred items for each configuration
          const { apiFetch } = useApiClient();
          const response: any = await apiFetch("/api/cost-code-configurations", {
            method: "GET",
            query: {
              corporation_uuid: corporationUuid,
              with_preferred_items: true,
            },
          });

          const configs = Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
            ? response
            : [];

          // Store cost code configurations
          state.costCodeConfigurations = configs.map((config: any) => ({
            ...config,
          }));
          state.costCodeConfigurationsLoaded = true;
        } catch (error) {
          console.error(
            "[PO Resources] Failed to load cost code configurations",
            error
          );
          if (force) {
            state.costCodeConfigurations = [];
            state.costCodeConfigurationsLoaded = false;
          }
        } finally {
          state.costCodeConfigurationsLoading = false;
          state.costCodeConfigurationsPromise = null;
        }

        return state.costCodeConfigurations;
      })();

      // Store the promise
      state.costCodeConfigurationsPromise = fetchPromise;

      // Wait for it to complete
      return await fetchPromise;
    };

    const ensurePreferredItems = async ({
      corporationUuid,
      projectUuid,
      force = false,
    }: EnsureArgs) => {
      const state = getOrCreateProjectState(corporationUuid, projectUuid);
      if (state.preferredItemsLoaded && !force) {
        return state.preferredItems;
      }

      if (state.preferredItemsLoading && !force) {
        // Wait for the existing promise to complete
        if (state.preferredItemsPromise) {
          await state.preferredItemsPromise;
        }
        return state.preferredItems;
      }

      state.preferredItemsLoading = true;

      // Create and store the promise
      const fetchPromise = (async () => {
        try {
          // Ensure cost code configurations are loaded first
          await ensureCostCodeConfigurations({
            corporationUuid,
            projectUuid,
            force,
          });

          const configs = state.costCodeConfigurations;
          const flattened: any[] = [];

          // Configurations are already filtered at API level, but keep as safety net
          const activeConfigs = configs;

          activeConfigs.forEach((config) => {
            const preferredItems = Array.isArray(config?.preferred_items)
              ? config.preferred_items
              : [];

            preferredItems.forEach((item: any) => {
              // Skip inactive preferred items - check status field (Active/Inactive)
              if (item.status === 'Inactive' || item.status === 'inactive' || item.status === 'disabled' || item.status === 'Disabled') {
                return;
              }

              // Also check for other inactive indicators
              if (item.is_active === false || item.is_active === 0) {
                return;
              }

              // Check for active field
              if (item.active === false || item.active === 0) {
                return;
              }


              if (
                !projectUuid ||
                !item?.project_uuid ||
                String(item.project_uuid) === String(projectUuid)
              ) {
                // Log first item to debug model_number
                if (flattened.length === 0) {
                  console.log('[purchaseOrderResources] First preferred item structure:', {
                    item_uuid: item?.item_uuid || item?.uuid,
                    item_name: item?.item_name || item?.name,
                    model_number: item?.model_number,
                    hasModelNumber: item?.model_number !== undefined,
                    keys: Object.keys(item || {})
                  });
                }
                
                flattened.push({
                  ...item,
                  cost_code_configuration_uuid: config?.uuid,
                  cost_code_number: config?.cost_code_number,
                  cost_code_name: config?.cost_code_name,
                });
              }
            });
          });

          state.preferredItems = flattened;
          state.preferredItemsLoaded = true;
        } catch (error) {
          console.error("[PO Resources] Failed to load preferred items", error);
          if (force) {
            state.preferredItems = [];
            state.preferredItemsLoaded = false;
          }
        } finally {
          state.preferredItemsLoading = false;
          state.preferredItemsPromise = null;
        }

        return state.preferredItems;
      })();

      // Store the promise
      state.preferredItemsPromise = fetchPromise;

      // Wait for it to complete
      return await fetchPromise;
    };

    const ensureEstimateItems = async ({
      corporationUuid,
      projectUuid,
      estimateUuid,
      force = false,
    }: EnsureArgs) => {
      if (!estimateUuid) {
        return [];
      }

      if (typeof window === "undefined") {
        const state = getOrCreateProjectState(corporationUuid, projectUuid);
        const key = estimateKey(corporationUuid, projectUuid, estimateUuid);
        const existing = state.estimateItemsMap[key];
        return existing?.poItems ?? [];
      }

      const state = getOrCreateProjectState(corporationUuid, projectUuid);
      const key = estimateKey(corporationUuid, projectUuid, estimateUuid);
      const existing = state.estimateItemsMap[key];

      if (existing && existing.poItems.length > 0 && !force) {
        return existing.poItems;
      }

      if (existing?.loading && !force) {
        return existing.poItems;
      }

      const estimateState: EstimateItemsState = existing || {
        key,
        estimateUuid,
        poItems: [],
        rawItems: [],
        loading: false,
        error: null,
        fetchedAt: null,
      };

      estimateState.loading = true;
      estimateState.error = null;
      state.estimateItemsMap[key] = estimateState;

      try {
        // Fetch estimate line items directly from API - scoped to this store only
        // NOTE: This does NOT affect any global stores or update IndexedDB
        const { apiFetch } = useApiClient();
        const response: any = await apiFetch("/api/estimate-line-items", {
          method: "GET",
          query: {
            project_uuid: projectUuid,
            estimate_uuid: estimateUuid,
            corporation_uuid: corporationUuid,
          },
        });

        const rows = Array.isArray(response?.data) ? response.data : [];

        const flattened = rows.flatMap((row: any, rowIndex: number) => {
          const materialItems = toArray(row?.material_items);

          const costCodeLabel = [row?.cost_code_number, row?.cost_code_name]
            .filter(Boolean)
            .join(" ")
            .trim();

          return materialItems.map((item: any, index: number) => {
            // Log first item to debug model_number
            if (rowIndex === 0 && index === 0) {
              console.log('[purchaseOrderResources] First estimate material item structure:', {
                item_uuid: item?.item_uuid || item?.uuid,
                item_name: item?.name || item?.item_name,
                model_number: item?.model_number || item?.modelNumber,
                hasModelNumber: (item?.model_number || item?.modelNumber) !== undefined,
                keys: Object.keys(item || {}),
                fullItem: item
              });
            }
            
            const unitPrice = normalizeNumber(
              item?.unit_price ?? item?.unitPrice ?? item?.price,
              0
            );
            const quantity = normalizeNumber(
              item?.quantity ?? item?.qty ?? item?.quantity_value,
              0
            );
            const total =
              item?.total != null
                ? normalizeNumber(item.total, 0)
                : unitPrice * quantity;

            const unitLabel =
              item?.unit_label ||
              item?.unit_short_name ||
              item?.unit ||
              item?.uom ||
              item?.unit_name ||
              "";

            const unitUuid =
              item?.unit_uuid ||
              item?.uom_uuid ||
              (typeof item?.unit === "string" && item.unit.length === 36
                ? item.unit
                : null);

            const modelNumber = item?.model_number || item?.modelNumber || "";
            if (rowIndex === 0 && index === 0) {
              console.log('[purchaseOrderResources] Extracted model_number:', modelNumber);
            }

            return {
              id: `${row?.cost_code_uuid || "cost"}-${rowIndex}-${index}-${
                item?.item_uuid || item?.uuid || index
              }`,
              cost_code_uuid: row?.cost_code_uuid || null,
              cost_code_number: row?.cost_code_number || "",
              cost_code_name: row?.cost_code_name || "",
              cost_code_label: costCodeLabel,
              division_name: row?.division_name || "",
              item_type_uuid: item?.item_type_uuid || item?.item_type || null,
              item_type_label:
                item?.item_type_label || item?.item_type_name || "",
              sequence: item?.sequence || item?.sequence_uuid || "",
              item_uuid: item?.item_uuid || item?.uuid || null,
              name: item?.name || item?.item_name || item?.title || "",
              description: item?.description || "",
              approval_checks:
                item?.approval_checks ||
                item?.approvalChecks ||
                item?.approvals ||
                null,
              model_number: modelNumber,
              location:
                item?.location ||
                item?.location_uuid ||
                item?.locationName ||
                "",
              unit_price: unitPrice,
              unit_uuid: unitUuid,
              unit_label: unitLabel,
              unit: unitLabel,
              quantity,
              total,
              raw: item,
            };
          });
        });

        const poItems = transformEstimateMaterialItemsToPoItems(flattened);

        estimateState.rawItems = flattened;
        estimateState.poItems = poItems;
        estimateState.fetchedAt = Date.now();
      } catch (error: any) {
        console.error(
          "[PO Resources] Failed to load estimate material items",
          error
        );
        estimateState.error =
          error?.data?.statusMessage ||
          error?.message ||
          "Failed to load estimate items";
        estimateState.rawItems = [];
        estimateState.poItems = [];
      } finally {
        estimateState.loading = false;
        state.estimateItemsMap[key] = { ...estimateState };
      }

      return state.estimateItemsMap[key].poItems;
    };

    const ensureEstimates = async ({
      corporationUuid,
      force = false,
    }: {
      corporationUuid: string;
      force?: boolean;
    }) => {
      // Get or create state for the corporation (projectUuid can be undefined for estimates)
      const state = getOrCreateProjectState(corporationUuid, undefined);
      if (state.estimatesLoaded && !force) {
        return state.estimates;
      }

      if (state.estimatesLoading && !force) {
        return state.estimates;
      }

      state.estimatesLoading = true;
      try {
        // Fetch estimates directly from API - scoped to this store only
        // NOTE: This does NOT affect the global estimatesStore or update IndexedDB
        const { apiFetch } = useApiClient();
        const response: any = await apiFetch("/api/estimates", {
          method: "GET",
          query: { corporation_uuid: corporationUuid },
        });

        const estimates = Array.isArray(response?.data) ? response.data : [];
        state.estimates = estimates.map((est: any) => ({ ...est }));
        state.estimatesLoaded = true;
      } catch (error) {
        console.error("[PO Resources] Failed to load estimates", error);
        if (force) {
          state.estimates = [];
          state.estimatesLoaded = false;
        }
      } finally {
        state.estimatesLoading = false;
      }

      return state.estimates;
    };

    const getEstimatesByProject = computed(() => {
      return (
        corporationUuid?: Nullable<string>,
        projectUuid?: Nullable<string>
      ) => {
        if (!corporationUuid || !projectUuid) return [];
        const state = getProjectState.value(corporationUuid, undefined);
        if (!state) return [];
        return state.estimates.filter(
          (e: any) => e.project_uuid === projectUuid
        );
      };
    });

    const ensureProjectResources = async (args: EnsureArgs) => {
      const {
        corporationUuid,
        projectUuid,
        estimateUuid,
        force = false,
      } = args;
      if (!corporationUuid || !projectUuid) return;

      await Promise.allSettled([
        ensureItemTypes({ corporationUuid, projectUuid, force }),
        ensureCostCodeConfigurations({ corporationUuid, projectUuid, force }),
        ensurePreferredItems({ corporationUuid, projectUuid, force }),
        ensureEstimates({ corporationUuid, force }),
        estimateUuid
          ? ensureEstimateItems({
              corporationUuid,
              projectUuid,
              estimateUuid,
              force,
            })
          : Promise.resolve(),
      ]);
    };

    const getProjectState = computed(() => {
      return (
        corporationUuid?: Nullable<string>,
        projectUuid?: Nullable<string>
      ) => {
        const key = projectKey(corporationUuid, projectUuid);
        return projectResources[key] || null;
      };
    });

    const getEstimateItemsState = computed(() => {
      return (
        corporationUuid?: Nullable<string>,
        projectUuid?: Nullable<string>,
        estimateUuid?: Nullable<string>
      ) => {
        if (!corporationUuid || !projectUuid || !estimateUuid) return null;
        const projectState = getProjectState.value(
          corporationUuid,
          projectUuid
        );
        if (!projectState) return null;
        const key = estimateKey(corporationUuid, projectUuid, estimateUuid);
        return projectState.estimateItemsMap[key] || null;
      };
    });

    const clearProject = (
      corporationUuid?: Nullable<string>,
      projectUuid?: Nullable<string>
    ) => {
      const key = projectKey(corporationUuid, projectUuid);
      if (projectResources[key]) {
        delete projectResources[key];
      }
    };

    const clear = () => {
      Object.keys(projectResources).forEach(
        (key) => delete projectResources[key]
      );
    };

    const getItemTypes = computed(() => {
      return (
        corporationUuid?: Nullable<string>,
        projectUuid?: Nullable<string>
      ) => {
        const state = getProjectState.value(corporationUuid, projectUuid);
        return state?.itemTypes ?? [];
      };
    });

    const getPreferredItems = computed(() => {
      return (
        corporationUuid?: Nullable<string>,
        projectUuid?: Nullable<string>
      ) => {
        const state = getProjectState.value(corporationUuid, projectUuid);
        return state?.preferredItems ?? [];
      };
    });

    const getCostCodeConfigurations = computed(() => {
      return (
        corporationUuid?: Nullable<string>,
        projectUuid?: Nullable<string>
      ) => {
        const state = getProjectState.value(corporationUuid, projectUuid);
        return state?.costCodeConfigurations ?? [];
      };
    });

    const getPreferredItemsLoading = computed(() => {
      return (
        corporationUuid?: Nullable<string>,
        projectUuid?: Nullable<string>
      ) => {
        const state = getProjectState.value(corporationUuid, projectUuid);
        return state?.preferredItemsLoading ?? false;
      };
    });

    const getCostCodeConfigurationsLoading = computed(() => {
      return (
        corporationUuid?: Nullable<string>,
        projectUuid?: Nullable<string>
      ) => {
        const state = getProjectState.value(corporationUuid, projectUuid);
        return state?.costCodeConfigurationsLoading ?? false;
      };
    });

    const getEstimateItems = computed(() => {
      return (
        corporationUuid?: Nullable<string>,
        projectUuid?: Nullable<string>,
        estimateUuid?: Nullable<string>
      ) => {
        const state = getEstimateItemsState.value(
          corporationUuid,
          projectUuid,
          estimateUuid
        );
        return state?.poItems ?? [];
      };
    });

    const getEstimateItemsError = computed(() => {
      return (
        corporationUuid?: Nullable<string>,
        projectUuid?: Nullable<string>,
        estimateUuid?: Nullable<string>
      ) => {
        const state = getEstimateItemsState.value(
          corporationUuid,
          projectUuid,
          estimateUuid
        );
        return state?.error ?? null;
      };
    });

    const getEstimateItemsLoading = computed(() => {
      return (
        corporationUuid?: Nullable<string>,
        projectUuid?: Nullable<string>,
        estimateUuid?: Nullable<string>
      ) => {
        const state = getEstimateItemsState.value(
          corporationUuid,
          projectUuid,
          estimateUuid
        );
        return state?.loading ?? false;
      };
    });

    const fetchPurchaseOrderItems = async (purchaseOrderUuid: string) => {
      if (!purchaseOrderUuid || typeof window === "undefined") {
        return [];
      }

      try {
        const { apiFetch } = useApiClient();
        const response: any = await apiFetch("/api/purchase-order-items", {
          method: "GET",
          query: {
            purchase_order_uuid: purchaseOrderUuid,
          },
        });

        return Array.isArray(response?.data) ? response.data : [];
      } catch (error: any) {
        console.error(
          "[PO Resources] Failed to fetch purchase order items",
          error
        );
        return [];
      }
    };

    return {
      ensureProjectResources,
      ensureItemTypes,
      ensureCostCodeConfigurations,
      ensurePreferredItems,
      ensureEstimates,
      ensureEstimateItems,
      getProjectState,
      getItemTypes,
      getPreferredItems,
      getCostCodeConfigurations,
      getPreferredItemsLoading,
      getCostCodeConfigurationsLoading,
      getEstimatesByProject,
      getEstimateItemsState,
      getEstimateItems,
      getEstimateItemsError,
      getEstimateItemsLoading,
      fetchPurchaseOrderItems,
      clearProject,
      clear,
      projectKey,
      estimateKey,
    };
  }
);

