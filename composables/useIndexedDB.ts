import { db, dbHelpers } from '@/utils/indexedDb';

export const useIndexedDB = () => {
  /**
   * Fetch and cache all data for accessible corporations
   * This should be called on login/initialization
   */
  const syncAllCorporationsData = async (
    corporationIds: string[],
    dateRange?: { start_date: string; end_date: string }
  ) => {
    try {
      // First, sync corporations data (global, not per-corporation)
      try {
        const { apiFetch } = useApiClient();
        const corporationsResponse: any = await apiFetch("/api/corporations", {
          method: "GET",
        });

        if (corporationsResponse?.data) {
          await dbHelpers.saveCorporations(corporationsResponse.data);
        }
      } catch (error) {
        console.warn("Failed to sync corporations:", error);
      }

      // Fetch data for all corporations in parallel
      const syncPromises = corporationIds.map(async (corpId) => {
        try {
          // Fetch bill entries
          const { apiFetch } = useApiClient();
          const billEntriesResponse: any = await apiFetch("/api/bill-entries", {
            method: "GET",
            params: {
              corporation_uuid: corpId,
              ...dateRange,
            },
          });

          if (billEntriesResponse?.data) {
            await dbHelpers.saveBillEntries(corpId, billEntriesResponse.data);
          }

          // Fetch vendors
          const { apiFetch } = useApiClient();
          const vendorsResponse: any = await apiFetch(
            "/api/purchase-orders/vendors",
            {
              method: "GET",
              params: {
                corporation_uuid: corpId,
              },
            }
          );

          if (vendorsResponse?.data) {
            await dbHelpers.saveVendors(corpId, vendorsResponse.data);
          }

          // Fetch project types
          const { apiFetch } = useApiClient();
          const projectTypesResponse: any = await apiFetch("/api/project-types", {
            method: "GET",
            params: {
              corporation_uuid: corpId,
            },
          });

          if (projectTypesResponse?.data) {
            await dbHelpers.saveProjectTypes(corpId, projectTypesResponse.data);
          }

          // Fetch service types
          const { apiFetch } = useApiClient();
          const serviceTypesResponse: any = await apiFetch("/api/service-types", {
            method: "GET",
            params: {
              corporation_uuid: corpId,
            },
          });

          if (serviceTypesResponse?.data) {
            await dbHelpers.saveServiceTypes(corpId, serviceTypesResponse.data);
          }

          // Fetch terms and conditions
          const { apiFetch } = useApiClient();
          const termsAndConditionsResponse: any = await apiFetch("/api/terms-and-conditions", {
            method: "GET",
            params: {
              corporation_uuid: corpId,
            },
          });

          if (termsAndConditionsResponse?.data) {
            await dbHelpers.saveTermsAndConditions(corpId, termsAndConditionsResponse.data);
          }

          // Fetch PO instructions
          const { apiFetch } = useApiClient();
          const poInstructionsResponse: any = await apiFetch(
            "/api/po-instructions",
            {
              method: "GET",
              params: {
                corporation_uuid: corpId,
              },
            }
          );

          if (poInstructionsResponse?.data) {
            await dbHelpers.savePOInstructions(
              corpId,
              poInstructionsResponse.data
            );
          }

          // Fetch UOM
          const { apiFetch } = useApiClient();
          const uomResponse: any = await apiFetch("/api/uom", {
            method: "GET",
            params: {
              corporation_uuid: corpId,
            },
          });

          if (uomResponse?.data) {
            await dbHelpers.saveUOM(corpId, uomResponse.data);
          }

          // Fetch Projects
          const { apiFetch } = useApiClient();
          const projectsResponse: any = await apiFetch("/api/projects", {
            method: "GET",
            params: {
              corporation_uuid: corpId,
            },
          });

          if (projectsResponse?.data) {
            await dbHelpers.saveProjects(corpId, projectsResponse.data);
          }

          // Fetch cost code divisions
          const { apiFetch } = useApiClient();
          const costCodeDivisionsResponse: any = await apiFetch(
            "/api/cost-code-divisions",
            {
              method: "GET",
              params: {
                corporation_uuid: corpId,
              },
            }
          );

          if (costCodeDivisionsResponse?.data) {
            await dbHelpers.saveCostCodeDivisions(
              corpId,
              costCodeDivisionsResponse.data
            );
          }

          // Fetch cost code configurations
          const { apiFetch } = useApiClient();
          const costCodeConfigurationsResponse: any = await apiFetch(
            "/api/cost-code-configurations",
            {
              method: "GET",
              params: {
                corporation_uuid: corpId,
              },
            }
          );

          if (costCodeConfigurationsResponse?.data) {
            await dbHelpers.saveCostCodeConfigurations(
              corpId,
              costCodeConfigurationsResponse.data
            );
          }

          // Fetch item types
          const { apiFetch } = useApiClient();
          const itemTypesResponse: any = await apiFetch("/api/item-types", {
            method: "GET",
            params: {
              corporation_uuid: corpId,
            },
          });

          if (itemTypesResponse?.data) {
            await dbHelpers.saveItemTypes(corpId, itemTypesResponse.data);
          }

          // Fetch estimates
          const { apiFetch } = useApiClient();
          const estimatesResponse: any = await apiFetch("/api/estimates", {
            method: "GET",
            params: {
              corporation_uuid: corpId,
            },
          });

          if (estimatesResponse?.data) {
            await dbHelpers.storeEstimates(estimatesResponse.data);
          }
        } catch (error) {
          // Silently handle errors for individual corporations
        }
      });

      await Promise.all(syncPromises);
    } catch (error) {
      throw error;
    }
  };

  /**
   * Sync global reference data (ship via, freight, locations, approval checks, uom)
   * Uses IndexedDB to cache data and avoid redundant API calls
   */
  const syncGlobalData = async (options?: {
    force?: boolean;
    maxAgeMinutes?: number;
  }) => {
    const force = Boolean(options?.force);
    const maxAgeMinutes = options?.maxAgeMinutes ?? 60;

    try {
      const [shipViaNeedsSync, freightNeedsSync, locationsNeedsSync, approvalChecksNeedsSync, uomNeedsSync] =
        force
          ? [true, true, true, true, true]
          : await Promise.all([
              dbHelpers.needsSync("global", "shipVia", maxAgeMinutes),
              dbHelpers.needsSync("global", "freight", maxAgeMinutes),
              dbHelpers.needsSync("global", "locations", maxAgeMinutes),
              dbHelpers.needsSync("global", "approvalChecks", maxAgeMinutes),
              dbHelpers.needsSync("global", "uom", maxAgeMinutes),
            ]);

      const syncPromises: Promise<void>[] = [];

      if (force || shipViaNeedsSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/ship-via", {
              method: "GET",
            });
          })()
            .then(async (response: any) => {
              const data = response?.data || response;
              if (Array.isArray(data)) {
                await dbHelpers.saveShipVia(data);
              }
            })
            .catch(() => {
              // Swallow individual sync failures to avoid blocking other resources
            })
        );
      }

      if (force || freightNeedsSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/freight", {
              method: "GET",
            });
          })()
            .then(async (response: any) => {
              const data = response?.data || response;
              if (Array.isArray(data)) {
                await dbHelpers.saveFreight(data);
              }
            })
            .catch(() => {})
        );
      }

      if (force || locationsNeedsSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/location", {
              method: "GET",
            });
          })()
            .then(async (response: any) => {
              const data = response?.data || response;
              if (
                Array.isArray(data) &&
                typeof dbHelpers.saveLocations === "function"
              ) {
                await dbHelpers.saveLocations(data);
              }
            })
            .catch(() => {})
        );
      }

      if (force || approvalChecksNeedsSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/approval-checks", {
              method: "GET",
            });
          })()
            .then(async (response: any) => {
              const data = response?.data || response;
              if (Array.isArray(data)) {
                await dbHelpers.saveApprovalChecks(data);
              }
            })
            .catch(() => {})
        );
      }

      if (force || uomNeedsSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/uom", {
              method: "GET",
            });
          })()
            .then(async (response: any) => {
              const data = response?.data || response;
              if (Array.isArray(data) && typeof dbHelpers.saveUOMGlobal === "function") {
                await dbHelpers.saveUOMGlobal(data);
              }
            })
            .catch(() => {})
        );
      }

      if (syncPromises.length > 0) {
        await Promise.all(syncPromises);
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Sync data for a specific corporation (only if data is stale)
   */
  const syncCorporationData = async (
    corporationId: string,
    dateRange?: { start_date: string; end_date: string },
    forceSync: boolean = false
  ) => {
    try {
      // Check if data needs syncing (unless forced)
      const [
        billEntriesNeedsSync,
        vendorsNeedsSync,
        projectTypesNeedsSync,
        serviceTypesNeedsSync,
        termsAndConditionsNeedsSync,
        poInstructionsNeedsSync,
        uomNeedsSync,
        chartOfAccountsNeedsSync,
        storageLocationsNeedsSync,
        costCodeDivisionsNeedsSync,
        projectsNeedsSync,
        itemTypesNeedsSync,
        costCodeConfigurationsNeedsSync,
        estimatesNeedsSync,
        purchaseOrdersNeedsSync,
        changeOrdersNeedsSync,
        stockReceiptNotesNeedsSync,
        stockReturnNotesNeedsSync,
      ] = await Promise.all([
        dbHelpers.needsSync(corporationId, "billEntries"),
        dbHelpers.needsSync(corporationId, "vendors"),
        dbHelpers.needsSync(corporationId, "projectTypes"),
        dbHelpers.needsSync(corporationId, "serviceTypes"),
        dbHelpers.needsSync(corporationId, "termsAndConditions"),
        dbHelpers.needsSync(corporationId, "poInstructions"),
        dbHelpers.needsSync(corporationId, "uom"),
        dbHelpers.needsSync(corporationId, "chartOfAccounts"),
        dbHelpers.needsSync(corporationId, "storageLocations"),
        dbHelpers.needsSync(corporationId, "costCodeDivisions"),
        dbHelpers.needsSync(corporationId, "projects"),
        dbHelpers.needsSync(corporationId, "itemTypes"),
        dbHelpers.needsSync(corporationId, "costCodeConfigurations"),
        dbHelpers.needsSync(corporationId, "estimates"),
        dbHelpers.needsSync(corporationId, "purchaseOrders"),
        dbHelpers.needsSync(corporationId, "changeOrders"),
        dbHelpers.needsSync(corporationId, "stockReceiptNotes"),
        dbHelpers.needsSync(corporationId, "stockReturnNotes"),
      ]);

      const syncPromises = [];

      // Only sync bill entries if needed
      if (billEntriesNeedsSync || forceSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/bill-entries", {
              method: "GET",
              params: {
                corporation_uuid: corporationId,
                ...dateRange,
              },
            });
          })().then(async (billEntriesResponse: any) => {
            if (billEntriesResponse?.data) {
              await dbHelpers.saveBillEntries(
                corporationId,
                billEntriesResponse.data
              );
            }
          })
        );
      }

      // Only sync vendors if needed (vendors don't depend on date range)
      if (vendorsNeedsSync || forceSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/purchase-orders/vendors", {
              method: "GET",
              params: {
                corporation_uuid: corporationId,
              },
            });
          })().then(async (vendorsResponse: any) => {
            if (vendorsResponse?.data) {
              await dbHelpers.saveVendors(corporationId, vendorsResponse.data);
            }
          })
        );
      }

      // Only sync project types if needed (project types don't depend on date range)
      if (projectTypesNeedsSync || forceSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/project-types", {
              method: "GET",
              params: {
                corporation_uuid: corporationId,
              },
            });
          })().then(async (projectTypesResponse: any) => {
            if (projectTypesResponse?.data) {
              await dbHelpers.saveProjectTypes(
                corporationId,
                projectTypesResponse.data
              );
            }
          })
        );
      }

      // Only sync service types if needed (service types don't depend on date range)
      if (serviceTypesNeedsSync || forceSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/service-types", {
              method: "GET",
              params: {
                corporation_uuid: corporationId,
              },
            });
          })().then(async (serviceTypesResponse: any) => {
            if (serviceTypesResponse?.data) {
              await dbHelpers.saveServiceTypes(
                corporationId,
                serviceTypesResponse.data
              );
            }
          })
        );
      }

      // Only sync terms and conditions if needed (terms and conditions don't depend on date range)
      if (termsAndConditionsNeedsSync || forceSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/terms-and-conditions", {
              method: "GET",
              params: {
                corporation_uuid: corporationId,
              },
            });
          })().then(async (termsAndConditionsResponse: any) => {
            if (termsAndConditionsResponse?.data) {
              await dbHelpers.saveTermsAndConditions(
                corporationId,
                termsAndConditionsResponse.data
              );
            }
          })
        );
      }

      // Only sync PO instructions if needed (PO instructions don't depend on date range)
      if (poInstructionsNeedsSync || forceSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/po-instructions", {
              method: "GET",
              params: {
                corporation_uuid: corporationId,
              },
            });
          })().then(async (poInstructionsResponse: any) => {
            if (poInstructionsResponse?.data) {
              await dbHelpers.savePOInstructions(
                corporationId,
                poInstructionsResponse.data
              );
            }
          })
        );
      }

      // Only sync UOM if needed (UOM don't depend on date range)
      if (uomNeedsSync || forceSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/uom", {
              method: "GET",
              params: {
                corporation_uuid: corporationId,
              },
            });
          })().then(async (uomResponse: any) => {
            if (uomResponse?.data) {
              await dbHelpers.saveUOM(corporationId, uomResponse.data);
            }
          })
        );
      }

      // Only sync projects if needed (projects don't depend on date range)
      if (projectsNeedsSync || forceSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/projects", {
              method: "GET",
              params: {
                corporation_uuid: corporationId,
              },
            });
          })().then(async (projectsResponse: any) => {
            if (projectsResponse?.data) {
              await dbHelpers.saveProjects(
                corporationId,
                projectsResponse.data
              );
            }
          })
        );
      }

      // Only sync item types if needed (item types depend on projects)
      if (itemTypesNeedsSync || forceSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/item-types", {
              method: "GET",
              params: {
                corporation_uuid: corporationId,
              },
            });
          })().then(async (itemTypesResponse: any) => {
            if (itemTypesResponse?.data) {
              await dbHelpers.saveItemTypes(
                corporationId,
                itemTypesResponse.data
              );
            }
          })
        );
      }

      // Only sync chart of accounts if needed (chart of accounts don't depend on date range)
      if (chartOfAccountsNeedsSync || forceSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/corporations/chart-of-accounts", {
              method: "GET",
              params: {
                corporation_uuid: corporationId,
              },
            });
          })().then(async (chartOfAccountsResponse: any) => {
            if (chartOfAccountsResponse?.data) {
              await dbHelpers.saveChartOfAccounts(
                corporationId,
                chartOfAccountsResponse.data
              );
            }
          })
        );
      }

      // Only sync storage locations if needed (storage locations don't depend on date range)
      if (storageLocationsNeedsSync || forceSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/storage-locations", {
              method: "GET",
              params: {
                corporation_uuid: corporationId,
              },
            });
          })().then(async (storageLocationsResponse: any) => {
            if (storageLocationsResponse?.data) {
              await dbHelpers.saveStorageLocations(
                corporationId,
                storageLocationsResponse.data
              );
            }
          })
        );
      }

      // Only sync cost code divisions if needed (cost code divisions don't depend on date range)
      if (costCodeDivisionsNeedsSync || forceSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/cost-code-divisions", {
              method: "GET",
              params: {
                corporation_uuid: corporationId,
              },
            });
          })().then(async (costCodeDivisionsResponse: any) => {
            if (costCodeDivisionsResponse?.data) {
              await dbHelpers.saveCostCodeDivisions(
                corporationId,
                costCodeDivisionsResponse.data
              );
            }
          })
        );
      }

      // Only sync cost code configurations if needed (cost code configurations don't depend on date range)
      if (costCodeConfigurationsNeedsSync || forceSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/cost-code-configurations", {
              method: "GET",
              params: {
                corporation_uuid: corporationId,
              },
            });
          })().then(async (costCodeConfigurationsResponse: any) => {
            if (costCodeConfigurationsResponse?.data) {
              await dbHelpers.saveCostCodeConfigurations(
                corporationId,
                costCodeConfigurationsResponse.data
              );
            }
          })
        );
      }

      // Only sync estimates if needed (estimates don't depend on date range)
      if (estimatesNeedsSync || forceSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/estimates", {
              method: "GET",
              params: {
                corporation_uuid: corporationId,
              },
            });
          })().then(async (estimatesResponse: any) => {
            if (estimatesResponse?.data) {
              await dbHelpers.storeEstimates(estimatesResponse.data);
            }
          })
        );
      }

      // Only sync purchase orders if needed (purchase orders don't depend on date range)
      if (purchaseOrdersNeedsSync || forceSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/purchase-order-forms", {
              method: "GET",
              params: {
                corporation_uuid: corporationId,
              },
            });
          })().then(async (purchaseOrdersResponse: any) => {
            const orders = purchaseOrdersResponse?.data;
            if (Array.isArray(orders)) {
              await dbHelpers.savePurchaseOrders(corporationId, orders);
            }
          })
        );
      }

      // Only sync change orders if needed (change orders don't depend on date range)
      if (changeOrdersNeedsSync || forceSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/change-orders", {
              method: "GET",
              params: {
                corporation_uuid: corporationId,
              },
            });
          })().then(async (changeOrdersResponse: any) => {
            const orders = changeOrdersResponse?.data;
            if (Array.isArray(orders)) {
              await dbHelpers.saveChangeOrders(corporationId, orders);
            }
          })
        );
      }

      // Only sync stock receipt notes if needed (receipt notes don't depend on date range)
      if (stockReceiptNotesNeedsSync || forceSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/stock-receipt-notes", {
              method: "GET",
              params: {
                corporation_uuid: corporationId,
              },
            });
          })().then(async (receiptNotesResponse: any) => {
            const notes = receiptNotesResponse?.data;
            if (Array.isArray(notes)) {
              await dbHelpers.saveStockReceiptNotes(corporationId, notes);
            }
          })
        );
      }

      // Only sync stock return notes if needed (return notes don't depend on date range)
      if (stockReturnNotesNeedsSync || forceSync) {
        syncPromises.push(
          (async () => {
            const { apiFetch } = useApiClient();
            return apiFetch("/api/stock-return-notes", {
              method: "GET",
              params: {
                corporation_uuid: corporationId,
              },
            });
          })().then(async (returnNotesResponse: any) => {
            const notes = returnNotesResponse?.data;
            if (Array.isArray(notes)) {
              await dbHelpers.saveStockReturnNotes(corporationId, notes);
            }
          })
        );
      }

      // Wait for all sync operations to complete
      await Promise.all(syncPromises);
    } catch (error) {
      throw error;
    }
  };

  /**
   * Get data from IndexedDB for a specific corporation
   */
  const getCorporationDataFromDB = async (corporationId: string) => {
    const [
      billEntries,
      vendors,
      projectTypes,
      serviceTypes,
      poInstructions,
      uom,
      chartOfAccounts,
      storageLocations,
      costCodeDivisions,
      projects,
      itemTypes,
      costCodeConfigurations,
      estimates,
    ] = await Promise.all([
      dbHelpers.getBillEntries(corporationId),
      dbHelpers.getVendors(corporationId),
      dbHelpers.getProjectTypes(corporationId),
      dbHelpers.getServiceTypes(corporationId),
      dbHelpers.getPOInstructions(corporationId),
      dbHelpers.getUOM(corporationId),
      dbHelpers.getChartOfAccounts(corporationId),
      dbHelpers.getStorageLocations(corporationId),
      dbHelpers.getCostCodeDivisions(corporationId),
      dbHelpers.getProjects(corporationId),
      dbHelpers.getItemTypes(corporationId),
      dbHelpers.getCostCodeConfigurations(corporationId),
      dbHelpers.getEstimates(corporationId),
    ]);

    return {
      billEntries,
      vendors,
      projectTypes,
      serviceTypes,
      poInstructions,
      uom,
      chartOfAccounts,
      storageLocations,
      costCodeDivisions,
      projects,
      itemTypes,
      costCodeConfigurations,
      estimates,
    };
  };

  /**
   * Clear all IndexedDB data (useful on logout)
   */
  const clearAllData = async () => {
    await dbHelpers.clearAllData();
  };

  /**
   * Clear data for a specific corporation
   */
  const clearCorporationData = async (corporationId: string) => {
    await dbHelpers.clearCorporationData(corporationId);
  };

  /**
   * Re-sync bill entries for all corporations with new date range
   * This is called when the user changes the date range in the topbar
   * Vendors are not re-synced as they don't depend on date range
   * Date range changes force sync since the data scope has changed
   */
  const resyncDateRangeDependentData = async (
    corporationIds: string[],
    dateRange: { start_date: string; end_date: string }
  ) => {
    try {
      // Fetch data for all corporations in parallel
      const syncPromises = corporationIds.map(async (corpId) => {
        try {
          // Force sync for date range changes since data scope has changed
          await syncCorporationData(corpId, dateRange, true);
        } catch (error) {
          // Silently handle errors for individual corporations
        }
      });

      await Promise.all(syncPromises);
    } catch (error) {
      throw error;
    }
  };

  return {
    db,
    dbHelpers,
    syncAllCorporationsData,
    syncGlobalData,
    syncCorporationData,
    resyncDateRangeDependentData,
    getCorporationDataFromDB,
    clearAllData,
    clearCorporationData,
  };
};

